(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.ZhishuDemoReset = api;
    api.startFreshDemo(root);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';

  const STORAGE_KEYS = Object.freeze([
    'zhishu-real-topics-demo-v1',
    'zhishu-natural-garden-v1',
    'zhishu-tree-library-v1'
  ]);

  function clear(storage) {
    const cleared = [];
    const failed = [];
    STORAGE_KEYS.forEach((key) => {
      try {
        storage.removeItem(key);
        cleared.push(key);
      } catch (error) {
        failed.push({ key, error });
      }
    });
    return { cleared, failed };
  }

  function clearBrowserStorage(browserRoot) {
    try {
      return clear(browserRoot.localStorage);
    } catch (error) {
      return { cleared: [], failed: STORAGE_KEYS.map((key) => ({ key, error })) };
    }
  }

  function routeToHome(browserRoot) {
    try {
      if (browserRoot.location.hash !== '#home') {
        browserRoot.history.replaceState(null, '', '#home');
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  function startFreshDemo(browserRoot) {
    return {
      storage: clearBrowserStorage(browserRoot),
      routedHome: routeToHome(browserRoot)
    };
  }

  return { STORAGE_KEYS, clear, clearBrowserStorage, routeToHome, startFreshDemo };
});
