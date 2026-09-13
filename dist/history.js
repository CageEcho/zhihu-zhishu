(() => {
  'use strict';
  const $=selector=>document.querySelector(selector),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let tab='trees',filter='all',query='';
  const statusNames={growing:'生长中',fruit:'已结果',published:'已发布'};
  function collections(){
    const roots=[...window.ZhishuGardenBridge.getSavedSources()];
    for(const tree of window.ZhishuGarden?.getTrees()||[])for(const source of tree.sources)roots.push({...source,origin:source.origin||'来自树的收藏'});
    return [...new Map(roots.map(s=>[s.id,s])).values()];
  }
  function date(value){const d=new Date(value);return Number.isNaN(+d)?'已保存':d.toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});}
  function treeCard(tree){
    const model=window.ZhishuTreeStore,stage=model.stage(tree),state=model.status(tree),title=model.title(tree),done=tree.answers.filter(x=>x.trim()).length,published=tree.fruits.filter(f=>f.published).length;
    const image=stage==='seed'?'soil-seed-v2.png':stage==='roots'?'soil-roots-v2.png':stage==='branches'?'tree-bare.png':tree.fruits.length?'tree-fruit.png':'tree-full.png';
    const progress=tree.article&&!tree.article.confirmed?'文章草稿待完成':state==='published'?'果实已入林，树上的思考仍在':state==='fruit'?'文章已完成，可以摘果发布':stage==='roots'?'已生根 · 等待你的主要观点':`${done} / 3 轮对话 · 继续让枝叶生长`;
    return `<button class="history-tree-card" data-tree-open="${esc(tree.id)}" aria-label="恢复知树：${esc(title)}"><div class="history-thumb ${stage}"><span class="history-state ${state}">${statusNames[state]}</span><img src="assets/${image}" alt="${statusNames[state]}的知识树" loading="lazy">${tree.fruits.length?`<span class="history-fruit-count">${tree.fruits.length} 颗果实${published?` · ${published} 已发布`:''}</span>`:''}</div><div class="history-card-body"><h2>${esc(title)}</h2><p>${esc(tree.viewpoint||tree.sources[tree.selectedRoot]?.content||'从收藏出发，记录自己的理解。')}</p><div class="history-card-progress">${progress}</div><div class="history-card-meta"><time datetime="${esc(tree.updatedAt)}">${date(tree.updatedAt)}</time><span>${tree.sources.length} 条根系</span><b>回到树上 ↗</b></div></div></button>`;
  }
  function sourceCard(source){return `<article class="history-source-card"><div class="history-source-origin"><i></i>${esc(source.origin||(source.personal?'我的收藏':'历史来源'))}</div><h2>${esc(source.title)}</h2><p>${esc(source.content||source.summary||'已保存标题和来源链接。')}</p>${source.upstreamRoots?.length?`<small>保留 ${source.upstreamRoots.length} 条上游来源</small>`:''}<div class="history-source-actions"><button data-history-source="${esc(source.id)}">查看内容与来源</button><button data-history-use="${esc(source.id)}">用它种树 ↗</button></div></article>`;}
  function render(){
    if(!window.ZhishuGarden)return;
    const trees=window.ZhishuGarden.getTrees(),sources=collections(),q=query.trim().toLocaleLowerCase();
    $('#history-tree-count').textContent=trees.length;$('#history-source-count').textContent=sources.length;
    document.querySelectorAll('[data-history-tab]').forEach(button=>button.setAttribute('aria-selected',button.dataset.historyTab===tab));
    document.querySelectorAll('[data-history-filter]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.historyFilter===filter));
    $('#history-filters').hidden=tab==='sources';
    const filteredTrees=trees.filter(t=>(filter==='all'||(filter==='published'?t.fruits.some(f=>f.published):filter==='fruit'?t.fruits.length>0:window.ZhishuTreeStore.status(t)==='growing'))&&(!q||[window.ZhishuTreeStore.title(t),t.viewpoint,...t.sources.map(s=>s.title),...t.fruits.map(f=>f.title)].join(' ').toLocaleLowerCase().includes(q)));
    const filteredSources=sources.filter(s=>!q||`${s.title} ${s.content||''} ${s.origin||''}`.toLocaleLowerCase().includes(q));
    const rows=tab==='trees'?filteredTrees:filteredSources;
    $('#history-summary').textContent=`${rows.length} 棵树 · 按最近修改排列`;
    $('#history-list').className=`history-list ${tab==='sources'?'source-records':''}`;
    if(!rows.length){const searched=q||filter!=='all';$('#history-list').innerHTML=`<div class="history-empty"><img src="assets/${searched?'tree-bare.png':'soil-seed-v2.png'}" alt=""><h2>${searched?'没有找到对应记录':tab==='trees'?'还没有种下第一棵树':'收藏也会留下来处'}</h2><p>${searched?'换一个关键词或查看全部记录。':tab==='trees'?'导入收藏后，根系、对话和文章都会随这棵树保存。':'在种子里导入内容，或从同题树林采集一颗果实。'}</p>${searched?'<button class="quiet-button" data-history-clear>查看全部记录</button>':'<button class="primary-button" data-action="new-tree">种一棵新树 →</button>'}</div>`;return;}
    $('#history-list').innerHTML=rows.map(tab==='trees'?treeCard:sourceCard).join('');
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.historyTab){tab=button.dataset.historyTab;filter='all';render();}
    if(button.dataset.historyFilter){filter=button.dataset.historyFilter;render();}
    if(button.hasAttribute('data-history-clear')){filter='all';query='';$('#history-search').value='';render();}
    if(button.dataset.treeOpen)window.ZhishuGarden.openTree(button.dataset.treeOpen);
    if(button.dataset.historySource)window.ZhishuGarden.showSavedSource(button.dataset.historySource);
    if(button.dataset.historyUse){const source=collections().find(s=>s.id===button.dataset.historyUse);if(source)window.ZhishuGarden.newTree({title:source.title,topicId:source.topicId||'ai-learning',suggestedSources:[source]});}
  });
  $('#history-search').addEventListener('input',event=>{query=event.target.value;render();});
  window.ZhishuHistory={render,sources:collections};
})();
