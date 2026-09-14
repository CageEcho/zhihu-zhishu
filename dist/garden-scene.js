(() => {
'use strict';
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.renderZhishuGarden = (garden, world) => {
const storedStage=window.ZhishuTreeStore.stage(garden);
const stage=world.dataset.canopyTransition==='branches'?'branches':storedStage;
const canopyFrom=world.dataset.canopyFrom;delete world.dataset.canopyFrom;
const enterStage=world.dataset.enter;delete world.dataset.enter;
const fruits=garden.fruits||[];
const fruitPoints=[[917,484],[538,442],[724,362],[840,551],[460,530],[820,279]];
const displayFruits=fruits.slice(-6);
const rank={seed:0,roots:1,branches:2,leaves:3,fruit:4,published:4}[stage], modal='';
const data={
seed:['一颗种子，一片可能。','点击发光的种子，种下你的收藏。','让看过的内容，慢慢长成自己的理解。'],
roots:['收藏里的想法，正在扎根。','点击一条根系，看看你想回应的观点。','已导入 3 条收藏'],
branches:['你的观点，长出了枝干。','点击枝干，和自己的想法多聊一轮。','主要观点已确定'],
leaves:['多想一层，就多一片叶。','点击树叶，把想清楚的内容写成文章。','3 轮对话已完成'],
fruit:['你的思考，终于结果。','点击这颗果实，让文章走进同题树林。','文章已完成 · 私人保存'],
published:['果实已入林，思考还在生长。','点击果柄回看文章，或点击树叶开始下一篇。',`${fruits.filter(f=>f.published).length} 篇文章已发布`]
}[stage]||[];
const sourceTitles=['AI 能帮助我们更高效地学习','先独立思考，再向 AI 提问','理解需要自己的复述与验证'];
const lock='<svg viewBox="0 0 20 20"><path d="M6 9V6a4 4 0 0 1 8 0v3"/><rect x="4" y="9" width="12" height="9" rx="2"/><path d="M10 12v3"/></svg>';
const defs=`<defs>
<linearGradient id="earthFront" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#927350"/><stop offset=".38" stop-color="#75573d"/><stop offset="1" stop-color="#513e2d"/></linearGradient>
<radialGradient id="earthTop" cx="45%" cy="40%" r="66%"><stop stop-color="#baa075"/><stop offset=".6" stop-color="#ab8a60"/><stop offset="1" stop-color="#86663f"/></radialGradient>
<radialGradient id="shadow"><stop stop-color="#2d492b" stop-opacity=".16"/><stop offset="1" stop-color="#607845" stop-opacity="0"/></radialGradient>
<linearGradient id="rootColor" x1="0" y1="0" x2=".3" y2="1"><stop stop-color="#cbb17d"/><stop offset=".5" stop-color="#e3c79a"/><stop offset="1" stop-color="#b7986c"/></linearGradient>
<radialGradient id="seedGold" cx=".3" cy=".3"><stop stop-color="#ffe5a0"/><stop offset=".45" stop-color="#d8ad60"/><stop offset="1" stop-color="#a47336"/></radialGradient>
<radialGradient id="seedHalo"><stop stop-color="#fde69c" stop-opacity=".8"/><stop offset=".42" stop-color="#f7d872" stop-opacity=".25"/><stop offset="1" stop-color="#ecca69" stop-opacity="0"/></radialGradient>
<radialGradient id="fruitRed" cx=".27" cy=".22" r=".88"><stop stop-color="#ffab98"/><stop offset=".3" stop-color="#f05b4c"/><stop offset=".68" stop-color="#cf3032"/><stop offset="1" stop-color="#901d27"/></radialGradient>
<radialGradient id="fruitHalo"><stop stop-color="#ff9f8e" stop-opacity=".46"/><stop offset=".48" stop-color="#e84e43" stop-opacity=".15"/><stop offset="1" stop-color="#d23b38" stop-opacity="0"/></radialGradient>
<linearGradient id="leafGreen" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#c5dc6e"/><stop offset=".45" stop-color="#88b549"/><stop offset="1" stop-color="#568333"/></linearGradient>
<filter id="soft"><feGaussianBlur stdDeviation="8"/></filter>
<filter id="smallshadow" x="-.8" y="-.8" width="2.6" height="2.6"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#54612c" flood-opacity=".2"/></filter>
<filter id="glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="7"/></filter>
</defs>`;
const CANOPY_LAYERS=[["left", 391.6, 275.5, 350.2, 294.0], ["top", 572.4, 141.7, 363.4, 290.5], ["right", 792.9, 268.6, 283.6, 312.9]];
function canopyCluster(index){const [name,x,y,w,h]=CANOPY_LAYERS[index];return `<g class="answer-canopy-layer answer-canopy-layer-${index+1}"><image class="answer-canopy" href="assets/canopy-${name}.png" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="none"/></g>`;}
function canopyLayers(answers){return [0,1,2].map(i=>answers[i]?.trim()?canopyCluster(i):'').join('');}
function fruit(x,y,scale=1){return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cy="6" rx="59" ry="58" fill="url(#fruitHalo)"/><path d="M0-34q-2-18 8-29" stroke="#80532e" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M4-52q28-23 41-2q-23 14-41 2Z" fill="url(#leafGreen)"/><path d="M0-35C-12-48-34-48-43-29C-55-7-43 29-19 45C-11 51-4 49 0 46C5 49 12 51 20 45C44 29 55-7 43-29C34-48 12-48 0-35Z" fill="url(#fruitRed)" stroke="#f47b6d" stroke-width="1.2" filter="url(#smallshadow)"/><ellipse cx="-20" cy="-9" rx="8" ry="15" fill="#ffd2c8" opacity=".58" transform="rotate(22)"/><path d="M-37 15Q-28 39-9 44" fill="none" stroke="#ff8c7c" stroke-width="2" opacity=".22"/></g>`;}
function pointer(x,y){return `<g transform="translate(${x} ${y}) rotate(-15)" filter="url(#smallshadow)"><path d="M0 0V29l7-7 6 13 6-3-7-12 11-2Z" fill="white" stroke="#677b74" stroke-width="1.3"/></g>`;}
function node(x,y,color='#b4ce81'){return `<circle cx="${x}" cy="${y}" r="12" fill="${['#7a5a3d','#ad6637'].includes(color)?'#fff4e6':'#f8ffed'}" opacity=".35"/><circle cx="${x}" cy="${y}" r="6" fill="${color}" stroke="#fff" stroke-width="2.5"/>`;}
function tag(cls,title,sub='',active=false,action='root',index=0){return `<button type="button" class="node-tag ${cls} ${active?'active':''}" data-garden-action="${action}" data-index="${index}"><span class="dot"></span><span><b>${esc(title)}</b>${sub?`<small>${esc(sub)}</small>`:''}</span>${active?'<span class="arrow">↗</span>':''}</button>`;}
/* Roots stage: the real root system cut from the final tree art, placed under the seed. */
function rootSystem(){const k=720/1254*1.14,cx=735,top=660;const w=830*k,h=230*k,x=cx-w/2+3,y=top;return `<g class="root-system"><image href="assets/roots-overlay.png" x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" preserveAspectRatio="xMidYMid meet"/></g>`;}
function sceneSVG(){let art=defs;if(stage==='seed'){art+=`<ellipse cx="735" cy="639" rx="94" ry="78" fill="url(#seedHalo)"/><circle cx="735" cy="639" r="45" stroke="#d2b65e" stroke-opacity=".35" fill="none"/><circle cx="735" cy="639" r="59" stroke="#d2b65e" stroke-opacity=".16" fill="none"/><circle cx="700" cy="590" r="2.5" fill="#e9c761"/><circle cx="781" cy="610" r="2" fill="#e5c265"/>`;}
if(stage==='roots')art+=rootSystem();
if(rank>0){art+=`<g fill="none" stroke="#b39a89" stroke-width="1.2"><path d="M574 747Q544 758 512 760H482M694 763L694 780M852 757L894 763H946"/></g>${node(574,747,'#7a5a3d')}${node(694,763,'#7a5a3d')}${node(852,757,'#7a5a3d')}`;}
if(stage==='branches'){art+=`<path d="M577 462L511 462L472 422M781 258L811 241M883 492L946 492L981 486" stroke="#d2a07d" stroke-width="1.2" fill="none"/>${node(577,462,'#ad6637')}${node(781,258,'#ad6637')}${node(883,492,'#ad6637')}`;}

if(stage==='branches')art+=canopyLayers(garden.answers);
displayFruits.forEach((item,i)=>{
 const [x,y]=fruitPoints[i];
 if(item.published)art+=`<g class="harvest-mark"><path d="M${x} ${y-24}q-4-16 4-29" fill="none" stroke="#8b7749" stroke-width="5" stroke-linecap="round"/><path d="M${x+2} ${y-44}q16-17 31-5q-19 11-31 5" fill="#9ab66a"/><circle cx="${x}" cy="${y}" r="18" fill="#fffdf2" stroke="#b8c994" stroke-width="1.5"/><path d="M${x-7} ${y}l5 5 10-11" stroke="#8bab61" stroke-width="2.5" fill="none" stroke-linecap="round"/><rect x="${x-27}" y="${y+23}" width="54" height="20" rx="6" fill="#fffdf2"/><text x="${x}" y="${y+37}" text-anchor="middle" fill="#8aa36d" font-size="11">已采摘</text></g>`;
 else art+=fruit(x,y,fruits.length>1?.78:1);
});
return `<svg class="scene-svg" viewBox="0 0 1440 900" aria-hidden="true">${art}</svg>`;}
function hit(x,y,action,index,label,w=76,h=76){return `<button type="button" class="g7-hit" style="left:${x-w/2}px;top:${y-h/2}px;width:${w}px;height:${h}px" data-garden-action="${action}" data-index="${index}" aria-label="${esc(label)}"></button>`;}
function renderTags(){
 let h='';
 if(stage==='seed')return '<div class="callout seed-label"><strong><span class="mini-line"></span>轻触种子，导入收藏</strong><small>你的第一棵知树，从这里开始</small></div>'+hit(735,639,'seed',0,'点击发光种子，导入收藏',110,110);
 const rootXY=[[574,747],[694,763],[852,757],[626,719],[790,716]];
 const rootClass=['root1','root2','root3','root4','root5'];
 garden.sources.slice(0,5).forEach((source,i)=>{h+=tag(rootClass[i],source.title,`收藏观点 ${String(i+1).padStart(2,'0')}`,stage==='roots'&&i===garden.selectedRoot,'root',i);h+=hit(...rootXY[i],'root',i,`根系 ${i+1}：${source.title}`,68,48);});
 if(rank>=2){
 const names=['理由 · 为什么这样想？','异见 · 换个角度呢？','边界 · 何时不成立？'];
 const p=[[570,479],[781,258],[883,492]],lp=rank>=3?[[405,363],[998,342],[1030,533]]:[[477,383],[807,230],[1009,532]];
 names.forEach((name,i)=>{
 const done=!!garden.answers[i]?.trim();
 if(!done){h+=tag('branch'+(i+1),name,'点击枝干，开始对话',i===garden.answers.findIndex(x=>!x.trim()),'branch',i)+hit(...p[i],'branch',i,name,85,68);}
 else{h+=hit(...lp[i],'leaf',i,`树叶 ${i+1}：${['理由与经历','不同看法','适用边界'][i]}`,82,82);if(stage!=='fruit'&&stage!=='published')h+=tag('leaf'+(i+1),['我的经历与理由','对不同观点的回应','适用条件与边界'][i],stage==='leaves'?'点击树叶，整理文章':'已保存 · 点击回看',stage==='leaves'&&i===0,'leaf',i);}
 });
 }
 if(stage==='leaves')h+=`<button type="button" class="article-guide-orb" data-garden-action="article-guide" aria-label="三轮思考已完成，生成文章"><span class="article-guide-bloom"></span><span class="article-guide-corner tl"></span><span class="article-guide-corner tr"></span><span class="article-guide-corner bl"></span><span class="article-guide-corner br"></span><span class="article-guide-ring"></span><span class="article-guide-core"><span class="article-guide-scan"></span><svg class="article-guide-apple" viewBox="0 0 72 72" aria-hidden="true"><defs><linearGradient id="guideAppleGold" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e9b533"/><stop offset="1" stop-color="#c98d17"/></linearGradient></defs><path d="M36 27c-7-7-19-7-24 3C5 44 14 63 27 67c4 1 7-1 9-3 2 2 5 4 9 3 13-4 22-23 15-37-5-10-17-10-24-3Z" fill="url(#guideAppleGold)"/><path d="M36 26c-1-8 2-13 7-17" fill="none" stroke="#b8801a" stroke-width="4" stroke-linecap="round"/><path d="M40 15c6-8 14-7 18-3-5 6-12 7-18 3Z" fill="#d9a325"/></svg></span><span class="article-guide-hand"><i class="w1"></i><i class="w2"></i><svg viewBox="0 0 34 40" aria-hidden="true"><path d="M13 20V8c0-2 1-3 3-3s3 1 3 3v9-3c0-2 1-3 3-3s3 1 3 3v4-2c0-2 1-3 3-3s3 1 3 3v9c0 7-5 11-11 11h-1c-4 0-7-2-9-5l-5-7c-1-2-1-4 1-5 1-1 3 0 4 1l3 4"/></svg></span></button>`;
 displayFruits.forEach((item,i)=>{
 const [x,y]=fruitPoints[i];
 h+=`<button type="button" class="g7-hit fruit-hit ${item.published?'picked':''}" style="left:${x-43}px;top:${y-53}px;width:86px;height:105px" data-garden-action="${item.published?'harvest':'fruit'}" data-id="${esc(item.id)}" aria-label="${item.published?'已采摘，回看文章':'果实，查看文章'}：${esc(item.title)}"></button>`;
 });
 if(fruits.length)h+=`<div class="callout fruit-call"><strong>${fruits.some(f=>f.published)?'果柄记得这篇文章':'一篇文章，一颗果实'}</strong><small>${fruits.some(f=>f.published)?'点击已采摘标记回看 · 点击树叶继续写':'点击果实查看 · 摘下发布到同题树林'}</small><button class="garden-fruit-archive" data-garden-action="fruit-list">查看这棵树的 ${fruits.length} 颗果实 ↗</button></div>`;
 if(garden.sources.length>5)h+=`<button class="garden-root-overflow" data-garden-action="all-roots">查看全部 ${garden.sources.length} 条根系 →</button>`;
 return h;
}
const center=rank<2;
const gardenImage=stage==='seed'||stage==='roots'?'soil-seed-v4-transparent.png':rank>=3?'tree-full.png':'tree-bare.png';
const gardenImageAlt=stage==='seed'?'透明背景上的土地与发光种子':stage==='roots'?'与播种页相同构图的土壤，叠加收藏根系节点':rank>=3?'枝叶与自然根系完整呈现的知树':'参考图中的树干与自然根系';
world.className='g7 '+stage+(canopyFrom==='clusters'&&stage==='leaves'?' crossfade':'')+(enterStage==='branches'&&stage==='branches'?' sprout':'');
world.innerHTML=`<header class="topbar"><a class="brand" href="#home" aria-label="知树首页">知树</a><span class="divider"></span><span class="garden-tree-title" title="${esc(window.ZhishuTreeStore.title(garden))}">${esc(garden.sources.length?window.ZhishuTreeStore.title(garden):'一颗新的种子')}</span><nav class="garden-main-nav" aria-label="主导航"><a href="#garden" aria-current="page">我的知树</a><a href="#history">历史树轮</a><a href="#forest">同题树林</a></nav><span class="private">${lock}本次演示保存</span><span class="avatar">我</span></header><div class="garden-stage"><div class="landscape"><div class="horizon"></div><div class="cloud a"></div><div class="cloud b"></div><i class="speck s1"></i><i class="speck s2"></i><i class="speck s3"></i><i class="speck s4"></i></div><div class="intro ${center?'central':''}"><div class="eyebrow"><i></i>${['SEED / 播种','ROOT / 扎根','BRANCH / 抽枝','LEAF / 展叶','FRUIT / 结果'][rank]}</div><h1>${rank>=2?data[0].replace('，','，<br>'):data[0]}</h1><p>${data[1]}</p>${rank>0?`<div class="stage-note">${stage==='roots'?`已导入 ${garden.sources.length} 条收藏`:stage==='branches'?`${garden.answers.filter(x=>x.trim()).length} / 3 轮对话已完成`:data[2]}</div>`:`<p style="font-size:12px;margin-top:5px;color:#a6b2b6">${stage==='roots'?`已导入 ${garden.sources.length} 条收藏`:stage==='branches'?`${garden.answers.filter(x=>x.trim()).length} / 3 轮对话已完成`:data[2]}</p>`}</div>${canopyFrom==='clusters'&&stage==='leaves'?`<div class="canopy-ghost" aria-hidden="true"><img class="tree-art" src="assets/tree-bare.png" alt=""><svg class="scene-svg" viewBox="0 0 1440 900">${canopyLayers(garden.answers)}</svg></div>`:''}<img class="tree-art" src="assets/${gardenImage}" alt="${gardenImageAlt}">${sceneSVG()}${renderTags()}<div class="hint-bar">${['轻触种子，开启生长','每条根系都是收藏中的一个观点','枝干连接你的理由、回应与边界','每片树叶，都保留着你的一轮思考','文章完成，果实才会成熟'][rank]}</div></div><footer class="footer"><span class="footer-left"><i></i>从收藏开始，让思考自然生长。</span><div class="growth-dots">${[0,1,2,3,4].map(i=>`<i class="${i===rank?'on':i<rank?'done':''}"></i>`).join('')}</div><span id="garden-save-status">${rank===0?'等待种下一颗想法':'已保存至本次演示'}</span></footer>`;

world.dataset.stage=stage;
};
})();
