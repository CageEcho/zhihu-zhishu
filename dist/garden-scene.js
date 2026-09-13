(() => {
'use strict';
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.renderZhishuGarden = (garden, world) => {
const stage=window.ZhishuTreeStore.stage(garden);
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
<radialGradient id="fruitGold" cx=".27" cy=".25" r=".85"><stop stop-color="#fff2a7"/><stop offset=".36" stop-color="#f5c859"/><stop offset=".75" stop-color="#e7a72d"/><stop offset="1" stop-color="#c58623"/></radialGradient>
<linearGradient id="leafGreen" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#c5dc6e"/><stop offset=".45" stop-color="#88b549"/><stop offset="1" stop-color="#568333"/></linearGradient>
<filter id="soft"><feGaussianBlur stdDeviation="8"/></filter>
<filter id="smallshadow" x="-.8" y="-.8" width="2.6" height="2.6"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#54612c" flood-opacity=".2"/></filter>
<filter id="glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="7"/></filter>
</defs>`;
function leaf(x,y,rotate=0,scale=1,glow=false){return `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${scale})">${glow?'<ellipse cy="-26" rx="49" ry="66" fill="#deeeae" opacity=".7" filter="url(#glow)"/>':''}<path d="M0 8C-46-16-40-60 0-90C36-70 49-24 0 8Z" fill="url(#leafGreen)" stroke="#aaca66" stroke-width="1.4" filter="url(#smallshadow)"/><path d="M0 8Q-9-29 0-79M-4-18L-22-40M-5-35L18-55" fill="none" stroke="#d3e196" stroke-width="1.2" opacity=".65"/></g>`;}
function fruit(x,y,scale=1){return `<g transform="translate(${x} ${y}) scale(${scale})"><ellipse cy="10" rx="52" ry="67" fill="url(#seedHalo)"/><path d="M1-43q-2-17 6-25" stroke="#937b46" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M4-51q27-26 41-5q-27 9-41 5Z" fill="url(#leafGreen)"/><path d="M0-47C-14-47-9-29-27-7C-47 19-35 55 0 56C37 55 47 17 27-7C13-23 15-45 0-47Z" fill="url(#fruitGold)" stroke="#f3d275" stroke-width="1" filter="url(#smallshadow)"/><ellipse cx="-15" cy="1" rx="7" ry="14" fill="#fff1b9" opacity=".5" transform="rotate(23)"/></g>`;}
function pointer(x,y){return `<g transform="translate(${x} ${y}) rotate(-15)" filter="url(#smallshadow)"><path d="M0 0V29l7-7 6 13 6-3-7-12 11-2Z" fill="white" stroke="#677b74" stroke-width="1.3"/></g>`;}
function node(x,y,color='#b4ce81'){return `<circle cx="${x}" cy="${y}" r="12" fill="#f8ffed" opacity=".25"/><circle cx="${x}" cy="${y}" r="6" fill="${color}" stroke="#fff" stroke-width="2.5"/>`;}
function tag(cls,title,sub='',active=false,action='root',index=0){return `<button type="button" class="node-tag ${cls} ${active?'active':''}" data-garden-action="${action}" data-index="${index}"><span class="dot"></span><span><b>${esc(title)}</b>${sub?`<small>${esc(sub)}</small>`:''}</span>${active?'<span class="arrow">↗</span>':''}</button>`;}
function sceneSVG(){let art=defs;if(stage==='seed'){art+=`<ellipse cx="735" cy="639" rx="94" ry="78" fill="url(#seedHalo)"/><circle cx="735" cy="639" r="45" stroke="#d2b65e" stroke-opacity=".35" fill="none"/><circle cx="735" cy="639" r="59" stroke="#d2b65e" stroke-opacity=".16" fill="none"/><circle cx="700" cy="590" r="2.5" fill="#e9c761"/><circle cx="781" cy="610" r="2" fill="#e5c265"/>`;}
if(rank>0){art+=`<g fill="none" stroke="#a3b48d" stroke-width="1.2"><path d="M574 747Q544 758 512 760H482M694 763L694 780M852 757L894 763H946"/></g>${node(574,747)}${node(694,763)}${node(852,757)}`;}
if(stage==='branches'){art+=`<path d="M577 462L511 462L472 422M781 258L811 241M883 492L946 492L981 486" stroke="#a6b996" stroke-width="1.2" fill="none"/>${node(577,462)}${node(781,258)}${node(883,492)}`;}

(rank>=3?[[431,394,-51,.81],[975,373,48,.71],[987,555,71,.72]]:[[509,409,-51,.81],[781,258,42,.72],[973,545,70,.72]]).forEach((p,i)=>{if(garden.answers[i]?.trim())art+=leaf(...p,stage==='leaves'&&i===0);});
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
 displayFruits.forEach((item,i)=>{
 const [x,y]=fruitPoints[i];
 h+=`<button type="button" class="g7-hit fruit-hit ${item.published?'picked':''}" style="left:${x-43}px;top:${y-53}px;width:86px;height:105px" data-garden-action="${item.published?'harvest':'fruit'}" data-id="${esc(item.id)}" aria-label="${item.published?'已采摘，回看文章':'果实，查看文章'}：${esc(item.title)}"></button>`;
 });
 if(fruits.length)h+=`<div class="callout fruit-call"><strong>${fruits.some(f=>f.published)?'果柄记得这篇文章':'一篇文章，一颗果实'}</strong><small>${fruits.some(f=>f.published)?'点击已采摘标记回看 · 点击树叶继续写':'点击果实查看 · 摘下发布到同题树林'}</small><button class="garden-fruit-archive" data-garden-action="fruit-list">查看这棵树的 ${fruits.length} 颗果实 ↗</button></div>`;
 if(garden.sources.length>5)h+=`<button class="garden-root-overflow" data-garden-action="all-roots">查看全部 ${garden.sources.length} 条根系 →</button>`;
 return h;
}
const center=rank<2;
world.className='g7 '+stage;
world.innerHTML=`<header class="topbar"><a class="brand" href="#home" aria-label="知树首页">知树</a><span class="divider"></span><span class="garden-tree-title" title="${esc(window.ZhishuTreeStore.title(garden))}">${esc(garden.sources.length?window.ZhishuTreeStore.title(garden):'一颗新的种子')}</span><nav class="garden-main-nav" aria-label="主导航"><a href="#garden" aria-current="page">我的知树</a><a href="#history">历史记录</a><a href="#forest">同题树林</a></nav><span class="private">${lock}本次演示保存</span><span class="avatar">我</span></header><div class="garden-stage"><div class="landscape"><div class="horizon"></div><div class="cloud a"></div><div class="cloud b"></div><i class="speck s1"></i><i class="speck s2"></i><i class="speck s3"></i><i class="speck s4"></i></div><div class="intro ${center?'central':''}"><div class="eyebrow"><i></i>${['SEED / 播种','ROOT / 扎根','BRANCH / 抽枝','LEAF / 展叶','FRUIT / 结果'][rank]}</div><h1>${rank>=2?data[0].replace('，','，<br>'):data[0]}</h1><p>${data[1]}</p>${rank>0?`<div class="stage-note">${stage==='roots'?`已导入 ${garden.sources.length} 条收藏`:stage==='branches'?`${garden.answers.filter(x=>x.trim()).length} / 3 轮对话已完成`:data[2]}</div>`:`<p style="font-size:12px;margin-top:5px;color:#a6b2b6">${stage==='roots'?`已导入 ${garden.sources.length} 条收藏`:stage==='branches'?`${garden.answers.filter(x=>x.trim()).length} / 3 轮对话已完成`:data[2]}</p>`}</div><img class="tree-art" src="assets/${stage==='seed'?'soil-seed-v2.png':stage==='roots'?'soil-roots-v2.png':rank>=3?'tree-full.png':'tree-bare.png'}" alt="${stage==='seed'?'土地与发光种子':stage==='roots'?'泥土剖面中的立体自然根系':rank>=3?'枝叶与自然根系完整呈现的知树':'参考图中的树干与自然根系'}">${sceneSVG()}${renderTags()}<div class="hint-bar">${['轻触种子，开启生长','每条根系都是收藏中的一个观点','枝干连接你的理由、回应与边界','每片树叶，都保留着你的一轮思考','文章完成，果实才会成熟'][rank]}</div></div><footer class="footer"><span class="footer-left"><i></i>从收藏开始，让思考自然生长。</span><div class="growth-dots">${[0,1,2,3,4].map(i=>`<i class="${i===rank?'on':i<rank?'done':''}"></i>`).join('')}</div><span id="garden-save-status">${rank===0?'等待种下一颗想法':'已保存至本次演示'}</span></footer>`;

world.dataset.stage=stage;
};
})();
