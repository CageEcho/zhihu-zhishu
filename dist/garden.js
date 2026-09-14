(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dialog = $('#garden-dialog');
  const world = $('#garden-world');
  const bridge = () => window.ZhishuGardenBridge;
  let storage;try{storage=window.localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('storage unavailable');}};}
  const store = window.ZhishuTreeStore.createStore(storage,bridge().getLegacyData());
  let garden=store.current(),dialogType='',activeRound=0,available=[],fileSources=[],returnFocus=null,growTimer=0,canopyTimer=0,selectedFruitId=null;
  const safeUrl=value=>{try{const url=new URL(String(value));return /^https?:$/.test(url.protocol)?url.href:'';}catch{return '';}};
  const cleanSource=source=>({...source,id:String(source.id||`source-${crypto.randomUUID()}`),title:String(source.title||'未命名收藏').slice(0,160),content:String(source.content??source.summary??'').slice(0,18000),url:safeUrl(source.url),personal:source.personal!==false});
  function persist(){const result=store.save(garden);garden=result.tree;if(!result.ok){const status=$('#garden-save-status');if(status)status.textContent='当前仅临时保存，请保留此页面';}return result.ok;}
  function rememberFruit(){
    if(!garden.article?.confirmed||!garden.article.id)return;
    const item={...garden.article,confirmed:true,published:garden.published,topicId:garden.topicId,answers:[...garden.answers],presetUsed:[...garden.presetUsed],viewpoint:garden.viewpoint,sources:garden.sources.map(s=>({...s})),updatedAt:new Date().toISOString()};
    const index=garden.fruits.findIndex(f=>f.id===item.id);if(index<0)garden.fruits.push(item);else garden.fruits[index]=item;
  }
  function syncFruits(){for(const fruit of garden.fruits){const work=bridge().getWork(fruit.id);if(work)fruit.published=bridge().isPublished(fruit.id);}garden.published=!!(garden.article?.confirmed&&garden.fruits.find(f=>f.id===garden.article.id)?.published);}
  function fit(){
    const scale=Math.min(innerWidth/1440,innerHeight/900);
    const width=innerWidth/scale,height=innerHeight/scale;
    world.style.setProperty('--garden-scale',scale);
    world.style.setProperty('--garden-width',`${width}px`);
    world.style.setProperty('--garden-height',`${height}px`);
    world.style.setProperty('--garden-stage-x',`${Math.max(0,(width-1440)/2)}px`);
  }
  function render(animate=false){
    syncFruits();window.renderZhishuGarden(garden,world);fit();
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
  function sourceRows(sources,checked=false){return sources.map((s,i)=>`<label><input type="checkbox" name="source" value="${i}" ${(checked&&i<3)||garden.suggestedSources.some(item=>item.id===s.id)?'checked':''}><span><b>${esc(s.title)}</b><small>${s.personal?'我的收藏内容':'演示收藏 · 知乎公开资料'}</small><p>${esc(s.content)}</p></span></label>`).join('');}
  function openImport(tab='saved'){
    const sources=bridge().getSources(garden.topicId);available=[...new Map([...garden.suggestedSources,...sources.personal,...sources.demo].map(source=>[source.id,cleanSource(source)])).values()];
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
    garden.sources=cleaned;garden.selectedRoot=0;garden.suggestedSources=[];if(!garden.title)garden.title=cleaned[0].title;
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
    if(index<0||index>2)return;if(!garden.viewpoint){openRoot(garden.selectedRoot);return;}
    activeRound=index;
    open('让你的观点，再长深一点。',`<p class="garden-question-help">主要观点：${esc(garden.viewpoint)}</p><div class="garden-round-tabs">${rounds.map((r,i)=>`<button type="button" class="${i===index?'active':''} ${garden.answers[i].trim()?'done':''}" data-garden-action="branch" data-index="${i}">${garden.answers[i].trim()?'✓':String(i+1).padStart(2,'0')} ${r[0]}</button>`).join('')}</div><div class="garden-chat"><small>知树 · 第 ${index+1} 轮</small><p>${rounds[index][1]}</p></div><p class="garden-question-help">${rounds[index][2]}</p><form id="garden-dialogue-form" data-round="${index}"><label for="garden-answer">写下你的想法</label><textarea id="garden-answer" rows="5" maxlength="3000" placeholder="用自己的话说，也可以保留犹豫。">${esc(garden.answerDrafts[index])}</textarea><div class="garden-answer-meta"><button type="button" data-garden-action="fill-answer">填入 AI 学习话题的演示回答</button><span id="garden-answer-count">${(garden.answerDrafts[index]).length} / 3000</span></div><small class="garden-dialog-note">保存这一轮，对应枝干就会长出一片叶。演示回答仅供体验，可自行修改。</small>${actions('保存回答，长出树叶')}</form>`,'round');
  }
  function sourceLines(){return garden.sources.map((s,i)=>`[${i+1}] ${s.title}${s.url?'\n'+s.url:''}`).join('\n\n');}
  function compose(){return `我的主要观点\n\n${garden.viewpoint}\n\n${rounds.map((r,i)=>`${r[0]}${garden.presetUsed[i]?'（演示回答）':''}\n\n${garden.answers[i]}`).join('\n\n')}\n\n收藏来源\n\n${sourceLines()}`;}
  function openLeaf(index){
    if(!garden.answers[index]?.trim())return;
    if(!garden.answers.every(x=>x.trim())){openRound(index);return;}
    open(garden.fruits.length?'这片树叶，还能继续生长。':'把这一树想法，写成文章。',`<p class="garden-dialog-lead">回看你的表达，补充想法，或把它写成文章。</p><div class="garden-source-quote"><b>${rounds[index][0]}</b><p>${esc(garden.answers[index])}</p></div><div class="garden-article-summary"><span><b>${garden.sources.length}</b>收藏来源</span><span><b>3</b>对话内容</span><span><b>${garden.fruits.length}</b>已有果实</span></div><div class="garden-dialog-actions"><button class="quiet-button" data-garden-action="branch" data-index="${index}">补充这片树叶</button><button class="primary-button" data-garden-action="${garden.article&&!garden.article.confirmed?'article':'new-article'}">${garden.article&&!garden.article.confirmed?'继续当前草稿':garden.fruits.length?'写下一篇文章':'开始生成文章'} →</button></div><small class="garden-dialog-note">已有果实及发布版本会保留。新文章从这棵树的当前观点和对话出发。</small>`,'generate');
  }
  function startArticle(){if(garden.article?.confirmed){rememberFruit();garden.article=null;garden.published=false;}openArticle();render();}
  function openArticle(){
    if(garden.article?.confirmed&&garden.published){openFruit(garden.article.id);return;}
    if(!garden.article)garden.article={id:null,title:`关于「${garden.sources[garden.selectedRoot]?.title||'这次思考'}」的想法`,body:compose(),confirmed:false};
    persist();
    open(garden.article.confirmed?'回看这颗果实里的文章':'读一遍，让它成为你的文章。',`<p class="garden-question-help">${garden.article.contextChanged?'树叶内容已更新；当前草稿保留了你的编辑，可对照最新想法继续修改。':'核对观点和表达，修改满意后完成文章。'}</p><form id="garden-article-form"><label for="garden-article-title">文章标题</label><input id="garden-article-title" maxlength="160" value="${esc(garden.article.title)}" required><label for="garden-article-body">文章正文</label><textarea id="garden-article-body" rows="12" maxlength="30000" required>${esc(garden.article.body)}</textarea><div class="garden-origin-row"><span>${garden.sources.length} 条来源</span><span>3 轮对话${garden.presetUsed.some(Boolean)?' · 含演示回答':''}</span></div>${actions('完成文章，让它结果')}</form>`,'article');
  }
  function openFruit(id){
    selectedFruitId=id||garden.article?.id||garden.fruits[garden.fruits.length-1]?.id;
    const item=garden.fruits.find(f=>f.id===selectedFruitId);if(!item)return;
    const published=bridge().isPublished(item.id);item.published=published;
    open(published?'已采摘的果实，仍留着你的思考。':'这颗果实，已经成熟。',`<div class="garden-fruit-summary"><span class="garden-golden-fruit ${published?'harvested':''}"></span><div><b>${esc(item.title)}</b><p>${published?'已采摘 · 已发布到同题树林':'已完成 · 私人保存'}</p></div></div><article class="garden-read-article">${item.body.split(/\n\n+/).map(paragraph=>`<p>${esc(paragraph)}</p>`).join('')}</article><div class="garden-fruit-tools"><button data-garden-action="download-fruit">下载文章</button><span>${item.sources?.length||garden.sources.length} 条收藏来源 · 三轮表达已保留</span></div>${published?`<div class="garden-dialog-actions"><button class="quiet-button" data-garden-action="close-dialog">回到树上</button><button class="primary-button" data-garden-action="forest" data-topic="${esc(item.topicId||garden.topicId)}">查看同题树林 →</button></div><button class="garden-text-link" data-garden-action="unpublish-fruit">撤回为私人果实</button>`:`<form id="garden-publish-form"><label for="garden-forest-topic">选择一片同题树林</label><select id="garden-forest-topic">${window.ZHISHU_DATA.topics.map(topic=>`<option value="${esc(topic.id)}" ${topic.id===(item.topicId||garden.topicId)?'selected':''}>${esc(topic.short)}</option>`).join('')}</select>${actions('摘下并发布','先留在树上')}</form>`}<small class="garden-dialog-note">本地演示：发布只保存在当前浏览器，不会发送到知乎。</small>`,'fruit');
  }
  function fruitList(){open('这棵树结出的果实',`<div class="garden-fruit-list">${garden.fruits.map(f=>`<button data-garden-action="fruit" data-id="${esc(f.id)}"><span>${f.published?'已采摘':'已结果'}</span><b>${esc(f.title)}</b><small>点击回看文章 →</small></button>`).join('')}</div>`,'fruit-list');}
  function showSavedSource(id){const source=window.ZhishuHistory.sources().find(s=>s.id===id);if(!source)return;open('这条收藏的来处',`<div class="garden-source-detail"><b>${esc(source.title)}</b><span>${esc(source.origin||'历史收藏')}</span><p>${esc(source.content)}</p>${source.url?`<a href="${esc(safeUrl(source.url))}" target="_blank" rel="noopener noreferrer">查看原始来源 ↗</a>`:''}${source.upstreamRoots?.length?`<p>上游来源：${source.upstreamRoots.map(esc).join('；')}</p>`:''}</div><div class="garden-dialog-actions"><button class="quiet-button" data-garden-action="close-dialog">返回记录</button><button class="primary-button" data-garden-action="use-source" data-id="${esc(source.id)}">用它种一棵树 →</button></div>`,'saved-source');}
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
        rememberFruit();garden.article={...garden.article,title,body,confirmed:false};garden.published=false;
      }
    }
    persist();
  }
  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-garden-action]');if(!button)return;
    capture();const action=button.dataset.gardenAction,index=Number(button.dataset.index||0);
    if(action==='seed')openImport();
    if(action==='import-tab')openImport(button.dataset.tab);
    if(action==='demo-import')plant(bridge().getSources(garden.topicId).demo.slice(0,3));
    if(action==='root')openRoot(index);
    if(action==='all-roots')open('全部收藏根系',`<div class="garden-fruit-list">${garden.sources.map((source,i)=>`<button data-garden-action="root" data-index="${i}"><span>根系 ${i+1}</span><b>${esc(source.title)}</b></button>`).join('')}</div>`,'sources');
    if(action==='branch')openRound(index);
    if(action==='leaf')openLeaf(index);
    if(action==='article')openArticle();
    if(action==='generate'||action==='new-article')startArticle();
    if(action==='fruit'||action==='harvest')openFruit(button.dataset.id);
    if(action==='fruit-list')fruitList();
    if(action==='download-fruit')bridge().download(selectedFruitId);
    if(action==='use-source'){const source=window.ZhishuHistory.sources().find(s=>s.id===button.dataset.id);if(source)window.ZhishuGarden.newTree({title:source.title,suggestedSources:[source],topicId:source.topicId||'ai-learning'});}
    if(action==='unpublish-fruit'){bridge().unpublish(selectedFruitId);syncFruits();persist();openFruit(selectedFruitId);render();}
    if(action==='forest'){close();bridge().openForest(button.dataset.topic||garden.topicId);}
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
      const wasIncomplete=!garden.answers.every(answer=>answer.trim());
      if(garden.answers[index]!==value){if(garden.article?.confirmed){rememberFruit();garden.article=null;garden.published=false;}else if(garden.article)garden.article.contextChanged=true;}
      garden.answers[index]=value;garden.answerDrafts[index]=value;garden.presetUsed[index]=value===presets[index];close();clearTimeout(canopyTimer);
      if(wasIncomplete&&garden.answers.every(answer=>answer.trim())){
        world.dataset.canopyTransition='branches';render(true);
        canopyTimer=setTimeout(()=>{delete world.dataset.canopyTransition;if(location.hash==='#garden')render(true);},2300);
      }else{delete world.dataset.canopyTransition;render(true);}
    }
    if(form.id==='garden-article-form'){
      const title=$('#garden-article-title').value.trim(),body=$('#garden-article-body').value.trim();if(!title||!body){error('请保留文章标题和正文。');return;}
      const id=bridge().saveArticle({id:garden.article?.id,treeId:garden.id,title,body,viewpoint:garden.viewpoint,answers:[...garden.answers],presetUsed:[...garden.presetUsed],sourceIds:garden.sources.map(s=>s.id),sources:garden.sources,topicId:garden.topicId});
      garden.article={id,title,body,confirmed:true};garden.published=false;rememberFruit();close();render(true);
    }
    if(form.id==='garden-publish-form'){
      const topicId=$('#garden-forest-topic').value,item=garden.fruits.find(f=>f.id===selectedFruitId);
      if(!item?.confirmed){error('请先完成文章。');return;}
      if(!bridge().publish(item.id,topicId)){error('文章未能发布，请保留此页面后重试。');return;}
      item.published=true;item.topicId=topicId;
      if(garden.article?.id===item.id){garden.topicId=topicId;garden.published=true;}
      close();render(true);world.classList.add('harvesting');bridge().toast('果实已进入同题树林。枝头保留了已采摘标记，可以随时回看。');
    }
  });
  dialog.addEventListener('cancel',()=>{capture();setTimeout(()=>{dialogType='';render();},0);});
  dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){capture();close();render();}});
  window.addEventListener('hashchange',()=>{if(location.hash!=='#garden'){capture();if(dialog.open)close();}});
  window.addEventListener('resize',fit);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!dialog.open&&location.hash==='#garden')location.hash='home';});
  window.ZhishuGarden={
    enter(){syncFruits();render();},
    leave(){capture();if(dialog.open)close();},
    getTrees(){return store.list();},
    renderHistory(){window.ZhishuHistory?.render();},
    openTree(id){capture();const next=store.select(id);if(!next)return;if(dialog.open)close();garden=next;location.hash='garden';render();},
    openWork(id){const tree=store.findByWork(id);if(tree){this.openTree(tree.id);openFruit(id);}},
    newTree(seed={}){capture();if(dialog.open)close();garden=store.newTree(seed);location.hash='garden';render();},
    showSavedSource
  };
  if(location.hash==='#garden')window.ZhishuGarden.enter();
  if(location.hash==='#history')window.ZhishuGarden.renderHistory();
})();
