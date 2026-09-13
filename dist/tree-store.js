(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ZhishuTreeStore=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  'use strict';
  const KEY='zhishu-tree-library-v1',OLD_KEY='zhishu-natural-garden-v1';
  const clone=value=>JSON.parse(JSON.stringify(value));
  const strings=value=>[0,1,2].map(i=>String(value?.[i]??''));
  const safeUrl=value=>{try{const url=new URL(String(value));return /^https?:$/.test(url.protocol)?url.href:'';}catch{return '';}};
  function blank(id,now){return {id,version:1,title:'',createdAt:now,updatedAt:now,sources:[],selectedRoot:0,viewpoint:'',viewpointDraft:'',answers:['','',''],answerDrafts:['','',''],presetUsed:[false,false,false],article:null,fruits:[],published:false,topicId:'ai-learning',suggestedSources:[]};}
  function source(value,i){return {...value,id:String(value.id||`source-${i}`),title:String(value.title||'未命名收藏'),content:String(value.content??value.summary??''),url:safeUrl(value.url),personal:value.personal!==false};}
  function normalize(value,id,now){
    const t={...blank(id,now),...value,id:String(value.id||id)};
    t.createdAt=typeof t.createdAt==='string'?t.createdAt:now;t.updatedAt=typeof t.updatedAt==='string'?t.updatedAt:t.createdAt;
    t.sources=(Array.isArray(value.sources)?value.sources:[]).filter(x=>x&&typeof x==='object').map(source);
    t.suggestedSources=(Array.isArray(value.suggestedSources)?value.suggestedSources:[]).filter(x=>x&&typeof x==='object').map(source);
    t.answers=strings(value.answers);t.answerDrafts=value.answerDrafts?strings(value.answerDrafts):[...t.answers];
    t.presetUsed=[0,1,2].map(i=>value.presetUsed?.[i]===true);
    t.viewpoint=String(value.viewpoint||'');t.viewpointDraft=String(value.viewpointDraft??t.viewpoint);
    t.selectedRoot=Number.isInteger(value.selectedRoot)&&value.selectedRoot>=0&&value.selectedRoot<t.sources.length?value.selectedRoot:0;
    t.fruits=(Array.isArray(value.fruits)?value.fruits:[]).filter(x=>x&&x.id&&typeof x.body==='string').map(x=>({...x,published:!!x.published,confirmed:true}));
    t.article=value.article&&typeof value.article.body==='string'?{...value.article,title:String(value.article.title||'未命名文章'),confirmed:!!value.article.confirmed}:null;
    if(t.article?.confirmed&&t.article.id&&!t.fruits.some(f=>f.id===t.article.id))t.fruits.push({...clone(t.article),published:!!value.published,topicId:t.topicId,answers:[...t.answers],presetUsed:[...t.presetUsed],viewpoint:t.viewpoint,sources:clone(t.sources)});
    t.published=!!(t.article?.confirmed&&t.fruits.find(f=>f.id===t.article.id)?.published);
    return t;
  }
  function hasProgress(t){return !!(t.sources.length||t.article||t.fruits.length||t.viewpoint||t.viewpointDraft||t.answers.some(Boolean)||t.answerDrafts.some(Boolean));}
  function stage(t){if(t.article?.confirmed)return t.published?'published':'fruit';if(t.answers.every(a=>a.trim())||t.fruits.length)return 'leaves';if(t.viewpoint||t.answers.some(a=>a.trim()))return 'branches';return t.sources.length?'roots':'seed';}
  function status(t){return ['published','fruit'].includes(stage(t))?t.published?'published':'fruit':'growing';}
  function title(t){return t.title||t.sources[t.selectedRoot]?.title||t.article?.title||t.viewpoint||'未命名的思考';}
  function createStore(storage,legacy={},options={}){
    const now=options.now||(()=>new Date().toISOString()),uid=options.uid||(()=>`tree-${globalThis.crypto.randomUUID()}`);
    function read(key){try{return JSON.parse(storage.getItem(key));}catch{return null;}}
    const saved=read(KEY);let library=saved?.version===1&&Array.isArray(saved.trees)?{...saved,trees:saved.trees.map((t,i)=>normalize(t,`restored-${i}`,now()))}:{version:1,currentTreeId:null,trees:[]};
    let lastError=null;
    function write(){try{storage.setItem(KEY,JSON.stringify(library));lastError=null;return true;}catch(e){lastError=e;return false;}}
    function findWork(id){return library.trees.find(t=>t.article?.id===id||t.fruits.some(f=>f.id===id));}
    const topics=legacy.topics||[],topicById=id=>topics.find(t=>t.id===id)||topics[0];
    const sourceMap=new Map([...(legacy.userSources||[]),...topics.flatMap(t=>(t.sources||[]).map(s=>({...s,personal:false})))].map(s=>[s.id,s]));
    function workSources(work){return Array.isArray(work.sources)?work.sources:(work.sourceIds||[]).map(id=>sourceMap.get(id)||{id,title:'历史收藏来源',content:'',url:''});}
    function addLegacyWork(work,isDraft=false){
      if(!work?.id)return;
      let t=findWork(work.id)||library.trees.find(t=>t.id===work.treeId);
      const topic=topicById(work.topicId),published=(legacy.publishedWorkIds||[]).includes(work.id);
      if(!t){t=normalize({id:work.treeId||`tree-work-${work.id}`,topicId:work.topicId,title:topic?.title||work.title,sources:workSources(work),viewpoint:work.viewpoint||'',answers:work.answers,presetUsed:work.presetUsed,createdAt:work.createdAt||work.updatedAt||now(),updatedAt:work.updatedAt||now()},uid(),now());library.trees.push(t);}
      const article={id:work.id,title:work.title||'历史文章',body:String(work.body||''),confirmed:!isDraft&&work.status==='confirmed',updatedAt:work.updatedAt};
      if(article.confirmed){
        const fruit={...article,published,topicId:work.topicId,answers:strings(work.answers),viewpoint:work.viewpoint||'',sources:workSources(work),presetUsed:work.presetUsed||[false,false,false]};
        if(!t.fruits.some(f=>f.id===fruit.id))t.fruits.push(fruit);
      }
      if(!t.article||t.article.id===article.id){
        // A newer unfinished body must survive importing its older confirmed version.
        if(!(t.article&&!t.article.confirmed&&article.confirmed))t.article=article;
        t.published=!!(t.article.confirmed&&published);
      }
      if(!article.body&&!article.confirmed&&!t.viewpoint&&work.viewpoint)t.viewpoint=work.viewpoint;
    }
    if(!library.migrated){
      const old=read(OLD_KEY);
      if(old&&Array.isArray(old.sources)&&hasProgress(normalize(old,'tree-previous',now()))){const t=normalize({...old,id:old.id||'tree-previous'},'tree-previous',now());library.trees.push(t);library.currentTreeId=t.id;}
      (legacy.works||[]).forEach(w=>addLegacyWork(w));
      const draft=legacy.draftArticle;
      if(draft&&draft.status!=='confirmed'){
        let t=findWork(draft.id);
        if(!t||!t.article||t.article.confirmed||String(draft.updatedAt||'')>String(t.article.updatedAt||''))addLegacyWork(draft,true);
      }
      const session=legacy.session;
      if(session&&strings(session.answers).some(Boolean)&&!library.trees.some(t=>t.topicId===session.topicId&&JSON.stringify(t.answers)===JSON.stringify(strings(session.answers)))){
        const topic=topicById(session.topicId);library.trees.push(normalize({id:'tree-legacy-session',title:topic?.title||'历史思考',topicId:session.topicId,sources:(topic?.sources||[]).map(s=>({...s,personal:false})),answers:session.answers,presetUsed:session.presetUsed,createdAt:session.updatedAt||now(),updatedAt:session.updatedAt||now()},uid(),now()));
      }
      library.migrated=true;
    }
    if(!library.currentTreeId||!library.trees.some(t=>t.id===library.currentTreeId))library.currentTreeId=library.trees.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0]?.id||null;
    if(!library.currentTreeId){const t=blank(uid(),now());library.trees.push(t);library.currentTreeId=t.id;}
    write();
    return {
      key:KEY,
      current(){return clone(library.trees.find(t=>t.id===library.currentTreeId));},
      list(){return library.trees.filter(hasProgress).slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(clone);},
      get(id){const t=library.trees.find(t=>t.id===id);return t?clone(t):null;},
      findByWork(id){const t=findWork(id);return t?clone(t):null;},
      select(id){if(!library.trees.some(t=>t.id===id))return null;library.currentTreeId=id;write();return this.current();},
      newTree(seed={}){const t=normalize({...blank(uid(),now()),...seed},uid(),now());library.trees.push(t);library.currentTreeId=t.id;write();return clone(t);},
      save(tree){const t=normalize(tree,tree.id||uid(),now());const index=library.trees.findIndex(x=>x.id===t.id);const previous=library.trees[index];const content=x=>JSON.stringify({...x,updatedAt:undefined});if(!previous||content(previous)!==content(t))t.updatedAt=now();else t.updatedAt=previous.updatedAt;if(index<0)library.trees.push(t);else library.trees[index]=t;library.currentTreeId=t.id;const ok=write();if(ok){try{storage.setItem(OLD_KEY,JSON.stringify(t));}catch{/* The full library already contains the current tree. */}}return {tree:clone(t),ok};},
      error(){return lastError;}
    };
  }
  return {KEY,OLD_KEY,blank,normalize,hasProgress,stage,status,title,createStore};
});
