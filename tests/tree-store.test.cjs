const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../dist/tree-store.js');
const demoReset=require('../dist/demo-reset.js');
const memory=initial=>{const data=new Map(Object.entries(initial||{}));return{getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};};
const options=()=>{let i=0,t=0;return{uid:()=>`test-tree-${++i}`,now:()=>new Date(1800000000000+t++*1000).toISOString()};};
const sources=[{id:'s1',title:'我的收藏',content:'原始收藏内容',url:'https://example.com/1',personal:true}];
const answers=['第一轮原话','第二轮原话','第三轮原话'];
const legacyWork={id:'work-old',title:'过去完成的文章',body:'不可丢失的历史正文',status:'confirmed',answers,presetUsed:[false,true,false],sourceIds:['s1'],topicId:'ai-learning',updatedAt:'2026-09-13T12:00:00Z'};

test('每次 DEMO 启动只清空知树的旧状态、树快照和历史库',()=>{
 const data=new Map(demoReset.STORAGE_KEYS.map(key=>[key,'saved']));data.set('another-app','keep');
 const result=demoReset.clear({removeItem:key=>data.delete(key)});
 assert.deepEqual(result.failed,[]);assert.deepEqual(result.cleared,demoReset.STORAGE_KEYS);assert.equal(data.get('another-app'),'keep');
 demoReset.STORAGE_KEYS.forEach(key=>assert.equal(data.has(key),false));
});

test('无论上次停在哪一页，新 DEMO 都从首页开始',()=>{
 const browserRoot={location:{hash:'#history'},history:{replaceState(_state,_title,url){browserRoot.location.hash=url;}}};
 assert.equal(demoReset.routeToHome(browserRoot),true);assert.equal(browserRoot.location.hash,'#home');
});

test('升级时保留原树草稿、已发表版本和三轮原话，重复启动不复制历史',()=>{
 const old={version:1,sources,answers,answerDrafts:['尚未提交的第一轮修改',...answers.slice(1)],viewpoint:'我的主观点',article:{id:'work-old',title:'正在修改的标题',body:'尚未完成的新版正文',confirmed:false},published:false,topicId:'ai-learning'};
 const storage=memory({[model.OLD_KEY]:JSON.stringify(old)});
 const legacy={works:[legacyWork],publishedWorkIds:['work-old'],userSources:sources};
 let store=model.createStore(storage,legacy,options());
 const tree=store.current();assert.equal(store.list().length,1);assert.equal(tree.article.body,'尚未完成的新版正文');assert.equal(tree.fruits[0].body,'不可丢失的历史正文');assert.equal(tree.fruits[0].published,true);assert.deepEqual(tree.answers,answers);assert.equal(tree.answerDrafts[0],'尚未提交的第一轮修改');assert.equal(model.status(tree),'growing');
 store=model.createStore(storage,legacy,options());assert.equal(store.list().length,1);assert.equal(store.current().fruits.length,1);
});

test('空种子不占历史记录；两棵树的草稿互不覆盖，重新加载可逐棵恢复',()=>{
 const storage=memory(),store=model.createStore(storage,{},options());assert.equal(store.list().length,0);
 let first=store.current();first.sources=sources;first.viewpoint='第一棵的观点';first.answerDrafts[0]='第一棵的输入草稿';first=store.save(first).tree;
 let second=store.newTree();assert.equal(store.list().length,1);second.sources=[{...sources[0],id:'s2',title:'另一个主题'}];second.answerDrafts[2]='第二棵的边界草稿';store.save(second);
 const reloaded=model.createStore(storage,{},options());assert.equal(reloaded.list().length,2);assert.equal(reloaded.select(first.id).answerDrafts[0],'第一棵的输入草稿');assert.equal(reloaded.select(second.id).answerDrafts[2],'第二棵的边界草稿');
});

test('同树写下一篇时保留已采摘果实；草稿不产生新果实',()=>{
 const storage=memory(),store=model.createStore(storage,{},options());let tree=store.current();
 tree.sources=sources;tree.viewpoint='观点';tree.answers=answers;tree.article={id:'fruit-one',title:'第一篇',body:'第一篇原文',confirmed:true};tree.published=true;tree=store.save(tree).tree;
 assert.equal(model.stage(tree),'published');assert.equal(tree.fruits.length,1);
 tree.article={id:null,title:'第二篇草稿',body:'第二篇草稿内容',confirmed:false};tree.published=false;tree=store.save(tree).tree;
 assert.equal(model.stage(tree),'leaves');assert.equal(tree.fruits[0].body,'第一篇原文');assert.equal(tree.fruits[0].published,true);assert.equal(tree.fruits.length,1);
 tree.article={id:'fruit-two',title:'第二篇',body:'第二篇完成内容',confirmed:true};tree=store.save(tree).tree;assert.equal(tree.fruits.length,2);assert.equal(tree.fruits[0].id,'fruit-one');assert.equal(tree.fruits[1].id,'fruit-two');
});

test('旧作品、未完成旧思考和来源都迁移；不把未知来源换成演示材料',()=>{
 const topic={id:'ai-learning',title:'旧主题',sources:[{id:'demo-s',title:'演示来源',summary:'演示摘要',url:'https://example.com/demo'}]};
 const legacy={works:[{...legacyWork,sourceIds:['s1','missing-source']}],userSources:sources,publishedWorkIds:[],topics:[topic],session:{topicId:'ai-learning',answers:['另一段未完成的想法','',''],updatedAt:'2026-09-14T01:00:00Z'}};
 const store=model.createStore(memory(),legacy,options());assert.equal(store.list().length,2);const workTree=store.findByWork('work-old');assert.equal(workTree.sources[0].content,'原始收藏内容');assert.equal(workTree.sources[1].id,'missing-source');assert.equal(workTree.sources[1].title,'历史收藏来源');assert.ok(store.list().some(t=>t.answers[0]==='另一段未完成的想法'));
});

test('查看和恢复不改变最近修改顺序；明确清空的输入草稿不会复活旧回答',()=>{
 const store=model.createStore(memory(),{},options());let t=store.current();t.sources=sources;t.answers=answers;t.answerDrafts=['','',''];t=store.save(t).tree;
 const modified=t.updatedAt;assert.equal(store.select(t.id).updatedAt,modified);assert.equal(store.save(t).tree.updatedAt,modified);assert.equal(store.current().answerDrafts[0],'');
});

test('保存失败仍保留内存中的当前树，并返回失败状态',()=>{
 const store=model.createStore({getItem:()=>null,setItem:()=>{throw Error('quota exceeded');}},{},options());const tree=store.current();tree.sources=sources;tree.viewpoint='需要保留的内容';const saved=store.save(tree);assert.equal(saved.ok,false);assert.equal(store.current().viewpoint,'需要保留的内容');assert.equal(store.list().length,1);
});
