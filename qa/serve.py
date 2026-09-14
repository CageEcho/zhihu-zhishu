#!/usr/bin/env python3
"""Local demo server: no-store caching (always fresh files) + HTTP Range support (video seeking)."""
import os, sys, re, http.server, socketserver
from functools import partial

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        self.send_header('Accept-Ranges', 'bytes')
        super().end_headers()
    def send_head(self):
        path = self.translate_path(self.path)
        rng = self.headers.get('Range')
        if rng and os.path.isfile(path):
            m = re.match(r'bytes=(\d*)-(\d*)', rng)
            if m:
                size = os.path.getsize(path)
                start = int(m.group(1)) if m.group(1) else 0
                end = int(m.group(2)) if m.group(2) else size - 1
                end = min(end, size - 1)
                if start <= end:
                    f = open(path, 'rb'); f.seek(start)
                    self.send_response(206)
                    self.send_header('Content-Type', self.guess_type(path))
                    self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
                    self.send_header('Content-Length', str(end - start + 1))
                    self.end_headers()
                    self._range_left = end - start + 1
                    return f
        return super().send_head()
    def copyfile(self, source, outputfile):
        left = getattr(self, '_range_left', None)
        if left is None:
            return super().copyfile(source, outputfile)
        while left > 0:
            chunk = source.read(min(65536, left))
            if not chunk: break
            outputfile.write(chunk); left -= len(chunk)
        self._range_left = None
    def log_message(self, *a): pass

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 4201
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist')
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(('', port), partial(Handler, directory=root)) as httpd:
        print(f'serving {root} on http://127.0.0.1:{port}/#home'); httpd.serve_forever()
