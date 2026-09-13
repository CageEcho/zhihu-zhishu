(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const KEY = 'zhishu-natural-garden-v1';
  const dialog = $('#garden-dialog');
  const world = $('#garden-world');
  const bridge = () => window.ZhishuGardenBridge;
  const blank = () => ({version:1,sources:[],selectedRoot:0,viewpoint:'',viewpointDraft:'',answers:['','',''],answerDrafts:['','',''],presetUsed:[false,false,false],article:null,published:false,topicId:'ai-learning'});
  let garden = blank(), dialogType = '', activeRound = 0, available = [], fileSources = [], returnFocus = null, growTimer = 0, publishTimer = 0;
  const safeUrl = value => {try {const url = new URL(String(value));return /^https?:$/.test(url.protocol)?url.href:'';}catch {return '';}};
  const cleanSource = source => ({id:String(source.id || `source-${crypto.randomUUID()}`), title:String(source.title||'未命名收藏').slice(0,160),content:String(source.content??source.summary??'').slice(0,18000),url:safeUrl(source.url),personal:source.personal!==false});
  try {
    const value = JSON.parse(localStorage.getItem(KEY));
    if (value?.version===1 && Array.isArray(value.sources)) {
      garden = {...blank(),...value,sources:value.sources.slice(0,5).filter(x=>x&&typeof x==='object').map(cleanSource)};
      for (const key of ['answers','answerDrafts']) garden[key]=[0,1,2].map(i=>String(value[key]?.[i]??'').slice(0,3000));
      garden.presetUsed=[0,1,2].map(i=>value.presetUsed?.[i]===true);
      garden.viewpoint=String(value.viewpoint||'').slice(0,1600);
      garden.viewpointDraft=String(value.viewpointDraft||garden.viewpoint).slice(0,1600);
      if(!garden.sources.length) garden=blank();
      if(!garden.viewpoint){garden.answers=['','',''];garden.article=null;garden.published=false;}
      if(!garden.answers.every(x=>x.trim())){garden.article=null;garden.published=false;}
      if(garden.article && typeof garden.article.body!=='string')garden.article=null;
      if(!garden.article?.confirmed)garden.published=false;
    }
  }catch { /* Unavailable or old storage starts a fresh tree. */ }
  function persist(){try{localStorage.setItem(KEY,JSON.stringify(garden));return true;}catch{const status=$('#garden-save-status');if(status)status.textContent='当前仅临时保存，请保留此页面';return false;}}
  function fit(){world.style.setProperty('--garden-scale',Math.min(innerWidth/1440,innerHeight/900));}
  function render(animate=false){
    window.renderZhishuGarden(garden,world);fit();
    if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){world.classList.add('growing');clearTimeout(growTimer);growTimer=setTimeout(()=>world.classList.remove('growing'),1050);}
    persist();
  }
  function open(title,html,type){
    if(!dialog.open) returnFocus=document.activeElement;
    dialogType=type;
    $('#garden-dialog-title').textContent=title;
    $('#garden-dialog-body').innerHTML=html;
    dialog.classList.toggle('article-dialog',type==='article');
    if(!dialog.open)dialog.showModal();
  }
  function close(){dialog.close();dialogType='';if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});}
  const error = text => {$('#garden-form-error').textContent=text;};
  const actions=(primary,secondary='回到树上')=>`<p id="garden-form-error" class="error" role="alert"></p><div class="garden-dialog-actions"><button type="button" class="quiet-button" data-garden-action="close-dialog">${secondary}</button><button type="submit" class="primary-button">${primary} →</button></div>`;
  function sourceRows(sources,checked=false){return sources.map((s,i)=>`<label><input type="checkbox" name="source" value="${i}" ${checked&&i<3?'checked':''}><span><b>${esc(s.title)}</b><small>${s.personal?'我的收藏内容':'演示收藏 · 知乎公开资料'}</small><p>${esc(s.content)}</p></span></label>`).join('');}
  function openImport(tab='saved'){
    const sources=bridge().getSources();available=[...sources.personal,...sources.demo].map(cleanSource);
    const tabs=`<div class="garden-import-tabs" role="tablist" aria-label="收藏导入方式">${[['saved','已有收藏'],['paste','粘贴内容'],['file','导入文件']].map(([id,name])=>`<button type="button" role="tab" aria-selected="${tab===id}" data-garden-action="import-tab" data-tab="${id}">${name}</button>`).join('')}</div>`;
    let body='';
    if(tab==='saved') body=`<p class="garden-question-help">选择 1–5 条内容，每条收藏对应一条主根。</p><form id="garden-import-form"><div class="garden-source-options">${sourceRows(available)}</div>${actions('导入，让它生根')}</form><button class="garden-text-link" data-garden-action="demo-import">用 3 条演示收藏体验</button>`;
    if(tab==='paste')body=`<form id="garden-paste-form"><label for="garden-source-title">收藏标题</label><input id="garden-source-title" maxlength="160" placeholder="这条收藏在讨论什么？" required><label for="garden-source-content">收藏内容</label><textarea id="garden-source-content" rows="5" maxlength="18000" placeholder="粘贴原文、摘要，或你收藏时记下的话。" required></textarea><label for="garden-source-url">来源链接 <small>选填</small></label><input id="garden-source-url" placeholder="https://" maxlength="2000">${actions('种下这条收藏')}</form>`;
    if(tab==='file')body=`<p class="garden-question-help">支持 TXT、Markdown、JSON 收藏列表，以及浏览器导出的 HTML 书签文件（最大 1 MB）。</p><label class="garden-file-label">选择收藏文件<input type="file" id="garden-source-file" accept=".txt,.md,.json,.html,.htm"></label><div id="garden-file-preview"></div><p id="garden-form-error" class="error" role="alert"></p>`;
    open('把你的收藏，种在这里。',`<p class="garden-dialog-lead">收藏的内容与来源，会成为这棵树的根系。</p>${tabs}${body}<small class="garden-dialog-note">本地演示：使用你保存或导入的内容，不会读取账号中的私人收藏夹。</small>`,'import');
  }
  function plant(sources){
    if(!sources.length||sources.length>5){error('请选择 1–5 条收藏内容。');return;}
    const cleaned=sources.map(cleanSource);
    bridge().addSources(cleaned.filter(s=>s.personal));
    garden.sources=cleaned;garden.selectedRoot=0;
    close();render(true);
  }
  function openRoot(index){
    const source=garden.sources[index];if(!source)return;
    garden.selectedRoot=index;
    const detail=`<div class="garden-source-detail"><b>${esc(source.title)}</b><span>${source.personal?'我的收藏':'演示收藏 · 知乎公开资料'}</span><p>${esc(source.content)}</p>${source.url?`<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">查看收藏来源 ↗</a>`:''}</div>`;
    if(garden.viewpoint){open('回到这条观点的来处',`${detail}<div class="garden-source-quote"><b>我的主要观点</b><p>${esc(garden.viewpoint)}</p></div><div class="garden-dialog-actions"><button class="primary-button" data-garden-action="close-dialog">回到树上</button></div>`,'source');return;}
    open('读过别人的想法，轮到你了。',`${detail}<form id="garden-viewpoint-form"><label for="garden-viewpoint">你的主要观点</label><textarea id="garden-viewpoint" rows="4" maxlength="1600" placeholder="你认同什么，又想补充什么？">${esc(garden.viewpointDraft)}</textarea><div class="garden-stance-options">${['我认同这条观点，但它也有适用条件。','我有不同看法，想从自己的经历出发说明。','我想补充一个角度，让这个观点更完整。'].map((s,i)=>`<button type="button" data-garden-action="stance" data-index="${i}">${['认同，但有条件','我有不同看法','补充一个角度'][i]}</button>`).join('')}</div>${actions('确定观点，让它抽枝')}</form>`,'viewpoint');
  }
  const rounds=[['理由与经历','为什么你这样想？','可以结合一次亲身经历，说明你的理由。'],['回应不同看法','如果有人不同意你的观点，你会怎么回应？','试着理解对方的理由，再说说自己的判断。'],['适用边界','什么情况下，你会调整这个观点？','说清条件、例外，或还没有答案的部分。']];
  const presets=['我倾向先自己尝试，再把遇到的具体困难交给 AI。例如做一道题时，我会先列出思路，再用提示核对。这样才能知道自己哪里还没有理解。','我理解有人更看重效率。但拿到答案不等于学会；如果关掉答案后不能重新完成，就需要回到概念和关键步骤，而不是继续复制。','面对完全陌生的内容或时间紧迫的任务，我会更早寻求帮助。不过重要结论和来源仍需自己核对；这个做法并不适用于所有人和所有任务。'];
  function openRound(index){
    if(!garden.viewpoint||index<0||index>2)return;
    activeRound=index;
    open('让你的观点，再长深一点。',`<p class="garden-question-help">主要观点：${esc(garden.viewpoint)}</p><div class="garden-round-tabs">${rounds.map((r,i)=>`<button type="button" class="${i===index?'active':''} ${garden.answers[i].trim()?'done':''}" data-garden-action="branch" data-index="${i}">${garden.answers[i].trim()?'✓':String(i+1).padStart(2,'0')} ${r[0]}</button>`).join('')}</div><div class="garden-chat"><small>知树 · 第 ${index+1} 轮</small><p>${rounds[index][1]}</p></div><p class="garden-question-help">${rounds[index][2]}</p><form id="garden-dialogue-form" data-round="${index}"><label for="garden-answer">写下你的想法</label><textarea id="garden-answer" rows="5" maxlength="3000" placeholder="用自己的话说，也可以保留犹豫。">${esc(garden.answerDrafts[index]||garden.answers[index])}</textarea><div class="garden-answer-meta"><button type="button" data-garden-action="fill-answer">填入 AI 学习话题的演示回答</button><span id="garden-answer-count">${(garden.answerDrafts[index]||garden.answers[index]).length} / 3000</span></div><small class="garden-dialog-note">保存这一轮，对应枝干就会长出一片叶。演示回答仅供体验，可自行修改。</small>${actions('保存回答，长出树叶')}</form>`,'round');
  }
  function sourceLines(){return garden.sources.map((s,i)=>`[${i+1}] ${s.title}${s.url?'\n'+s.url:''}`).join('\n\n');}
  function compose(){return `我的主要观点\n\n${garden.viewpoint}\n\n${rounds.map((r,i)=>`${r[0]}${garden.presetUsed[i]?'（演示回答）':''}\n\n${garden.answers[i]}`).join('\n\n')}\n\n收藏来源\n\n${sourceLines()}`;}
  function openLeaf(index){
    if(!garden.answers[index]?.trim())return;
    if(!garden.answers.every(x=>x.trim())){openRound(index);return;}
    if(garden.article){openArticle();return;}
    open('把这一树想法，写成文章。',`<p class="garden-dialog-lead">将你选择的观点和多轮对话整理成可修改的初稿。</p><div class="garden-article-summary"><span><b>${garden.sources.length}</b>收藏来源</span><span><b>1</b>主要观点</span><span><b>3</b>对话内容</span></div><div class="garden-source-quote"><b>这片叶子里的表达</b><p>${esc(garden.answers[index])}</p></div><p class="garden-question-help">初稿会保留三轮原话与来源。文章完成后，这棵树才会结果。</p><div class="garden-dialog-actions"><button class="quiet-button" data-garden-action="branch" data-index="${index}">补充这片树叶</button><button class="primary-button" data-garden-action="generate">开始生成文章 →</button></div><small class="garden-dialog-note">当前使用本地结构整理，不会自动补写你的经历或调用在线 AI。</small>`,'generate');
  }
  function openArticle(){
    if(!garden.article)garden.article={id:null,title:`关于「${garden.sources[garden.selectedRoot]?.title||'这次思考'}」的想法`,body:compose(),confirmed:false};
    persist();
    open(garden.article.confirmed?'回看这颗果实里的文章':'读一遍，让它成为你的文章。',`<p class="garden-question-help">核对观点和表达，修改满意后完成文章。</p><form id="garden-article-form"><label for="garden-article-title">文章标题</label><input id="garden-article-title" maxlength="160" value="${esc(garden.article.title)}" required><label for="garden-article-body">文章正文</label><textarea id="garden-article-body" rows="12" maxlength="30000" required>${esc(garden.article.body)}</textarea><div class="garden-origin-row"><span>${garden.sources.length} 条来源</span><span>3 轮对话${garden.presetUsed.some(Boolean)?' · 含演示回答':''}</span></div>${actions('完成文章，让它结果')}</form>`,'article');
  }
  function openFruit(){
    if(!garden.article?.confirmed)return;
    open('摘下这颗果实，与同题的人相遇。',`<div class="garden-fruit-summary"><span class="garden-golden-fruit"></span><div><b>${esc(garden.article.title)}</b><p>文章已完成 · 当前${garden.published?'已进入同题森林':'仅自己可见'}</p></div></div><form id="garden-publish-form"><label for="garden-forest-topic">选择一片同题森林</label><select id="garden-forest-topic">${window.ZHISHU_DATA.topics.map(topic=>`<option value="${esc(topic.id)}" ${topic.id===garden.topicId?'selected':''}>${esc(topic.short)}</option>`).join('')}</select><p class="garden-question-help">发布后，文章与收藏来源一起进入对应话题。</p>${actions(garden.published?'查看同题森林':'摘下并发布','先留在树上')}</form><button class="garden-text-link" data-garden-action="article">回看或编辑文章</button><small class="garden-dialog-note">本地 DEMO 发布，结果仅保存在当前浏览器，不会发送到知乎。</small>`,'publish');
  }
  async function readFile(file){
    if(!file)return;
    if(file.size>1024*1024){error('请选择小于 1 MB 的收藏文件。');return;}
    try{
      const text=await file.text();let rows=[];
      if(/\.json$/i.test(file.name)){
        const parsed=JSON.parse(text);const list=Array.isArray(parsed)?parsed:parsed.items||parsed.bookmarks||parsed.collections;
        if(!Array.isArray(list))throw Error('JSON 需为数组，或包含 items、bookmarks 数组。');
        const visit=items=>items.forEach(x=>{if(typeof x==='string')rows.push({title:x.slice(0,80),content:x});else if(x&&typeof x==='object'){if(Array.isArray(x.children))visit(x.children);else rows.push(x);}});visit(list);
      }else if(/\.html?$/i.test(file.name)){
        const doc=new DOMParser().parseFromString(text,'text/html');rows=[...doc.querySelectorAll('a[href]')].filter(a=>safeUrl(a.getAttribute('href'))).map(a=>({title:a.textContent.trim()||'收藏链接',content:a.parentElement?.querySelector('dd')?.textContent.trim()||'已导入书签标题和链接，可从根系回看原文。',url:a.getAttribute('href')}));
      }else if(/\.(txt|md)$/i.test(file.name)){
        rows=text.split(/\n\s*\n/).filter(s=>s.trim()).map(s=>({title:s.trim().split('\n')[0].replace(/^#+\s*/,''),content:s.trim()}));
      }else throw Error('请选择 TXT、Markdown、JSON 或 HTML 文件。');
      if(!rows.length)throw Error('文件里没有找到可导入的收藏内容。');
      if(rows.length>200)throw Error('单次最多读取 200 条，请拆分收藏文件。');
      fileSources=rows.map(s=>cleanSource({...s,personal:true}));
      if(dialogType!=='import'||!$('#garden-file-preview'))return;
      $('#garden-file-preview').innerHTML=`<form id="garden-file-form"><p class="garden-question-help">读取到 ${fileSources.length} 条收藏，选择本次想思考的 1–5 条。</p><div class="garden-source-options">${sourceRows(fileSources,true)}</div><div class="garden-dialog-actions"><button type="submit" class="primary-button">导入选中内容 →</button></div></form>`;
      error('');
    }catch(e){if($('#garden-form-error'))error(e.message||'文件无法读取，请检查内容。');}
  }
  function capture(){
    if(dialogType==='viewpoint'&&$('#garden-viewpoint'))garden.viewpointDraft=$('#garden-viewpoint').value;
    if(dialogType==='round'&&$('#garden-answer'))garden.answerDrafts[activeRound]=$('#garden-answer').value;
    if(dialogType==='article'&&garden.article){
      const title=$('#garden-article-title')?.value,body=$('#garden-article-body')?.value;
      if(title!==undefined&&body!==undefined&&(title!==garden.article.title||body!==garden.article.body)){
        garden.article={...garden.article,title,body,confirmed:false};garden.published=false;
      }
    }
    persist();
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-garden-action]');if(!button)return;
    capture();const action=button.dataset.gardenAction,index=Number(button.dataset.index||0);
    if(action==='seed')openImport();
    if(action==='import-tab')openImport(button.dataset.tab);
    if(action==='demo-import')plant(bridge().getSources().demo.slice(0,3));
    if(action==='root')openRoot(index);
    if(action==='branch')openRound(index);
    if(action==='leaf')openLeaf(index);
    if(action==='generate'||action==='article')openArticle();
    if(action==='fruit')openFruit();
    if(action==='forest')bridge().openForest();
    if(action==='close-dialog'){close();render();}
    if(action==='stance'){
      const input=$('#garden-viewpoint');if(input.value.trim())input.focus();else{input.value=['我认同这条观点，但它也有适用条件。','我有不同看法，想从自己的经历出发说明。','我想补充一个角度，让这个观点更完整。'][index];input.focus();capture();}
    }
    if(action==='fill-answer'){
      const input=$('#garden-answer');if(input.value.trim()&&input.value!==presets[activeRound]){error('先保留你的回答。若想改用演示内容，请清空输入框后再填入。');return;}
      input.value=presets[activeRound];$('#garden-answer-count').textContent=`${input.value.length} / 3000`;capture();input.focus();
    }
  });
  document.addEventListener('input',e=>{if(!dialog.contains(e.target))return;capture();if(e.target.id==='garden-answer')$('#garden-answer-count').textContent=`${e.target.value.length} / 3000`;if($('#garden-form-error'))error('');});
  document.addEventListener('change',e=>{if(e.target.id==='garden-source-file')readFile(e.target.files[0]);});
  document.addEventListener('submit',e=>{
    const form=e.target;if(!form.id.startsWith('garden-'))return;e.preventDefault();
    if(form.id==='garden-import-form')plant([...form.querySelectorAll('input:checked')].map(i=>available[Number(i.value)]));
    if(form.id==='garden-file-form')plant([...form.querySelectorAll('input:checked')].map(i=>fileSources[Number(i.value)]));
    if(form.id==='garden-paste-form'){
      const title=$('#garden-source-title').value.trim(),content=$('#garden-source-content').value.trim(),raw=$('#garden-source-url').value.trim();
      if(!title||!content){error('请填写收藏标题和内容。');return;}if(raw&&!safeUrl(raw)){error('来源链接需以 http 或 https 开头。');return;}
      plant([{title,content,url:raw,personal:true}]);
    }
    if(form.id==='garden-viewpoint-form'){
      const value=$('#garden-viewpoint').value.trim();if(!value){error('先写下一点自己的观点。');return;}garden.viewpoint=value;garden.viewpointDraft=value;close();render(true);
    }
    if(form.id==='garden-dialogue-form'){
      const index=Number(form.dataset.round),value=$('#garden-answer').value.trim();if(!value){error('请写下一点想法，再让树叶生长。');return;}
      if(garden.answers[index]!==value){garden.article=null;garden.published=false;}
      garden.answers[index]=value;garden.answerDrafts[index]=value;garden.presetUsed[index]=value===presets[index];close();render(true);
    }
    if(form.id==='garden-article-form'){
      const title=$('#garden-article-title').value.trim(),body=$('#garden-article-body').value.trim();if(!title||!body){error('请保留文章标题和正文。');return;}
      const id=bridge().saveArticle({id:garden.article?.id,title,body,viewpoint:garden.viewpoint,answers:[...garden.answers],presetUsed:[...garden.presetUsed],sourceIds:garden.sources.map(s=>s.id),sources:garden.sources,topicId:garden.topicId});
      garden.article={id,title,body,confirmed:true};garden.published=false;close();render(true);
    }
    if(form.id==='garden-publish-form'){
      const topicId=$('#garden-forest-topic').value;
      if(!garden.article?.confirmed){error('请先确认文章。');return;}
      if(!bridge().publish(garden.article.id,topicId)){error('这篇文章未能发布，请重新确认文章后再试。');return;}
      garden.topicId=topicId;garden.published=true;close();render(true);world.classList.add('harvesting');
      clearTimeout(publishTimer);publishTimer=setTimeout(()=>{if(location.hash==='#garden')bridge().openForest();},matchMedia('(prefers-reduced-motion: reduce)').matches?100:1200);
    }
  });
  dialog.addEventListener('cancel',()=>{capture();setTimeout(()=>{dialogType='';render();},0);});
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){capture();close();render();}});
  window.addEventListener('hashchange',()=>{if(location.hash!=='#garden'){capture();if(dialog.open)close();clearTimeout(publishTimer);}});
  window.addEventListener('resize',fit);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.open&&location.hash==='#garden')location.hash='home';});
  window.ZhishuGarden={enter(){
    if(garden.article?.confirmed&&!bridge().getWork(garden.article.id)){garden.article.confirmed=false;garden.published=false;}
    render();
  }};
  if(location.hash==='#garden')window.ZhishuGarden.enter();
})();
