(() => {
  'use strict';

  const DATA = window.ZHISHU_DATA;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const STORAGE_KEY = 'zhishu-real-topics-demo-v1';
  const answerLabels = ['我的经历与判断', '我对不同意见的回应', '适用条件与边界'];
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  let state = { savedTopics: [], session: null, works: [], draftArticle: null, userSources: [], adoptedRoots: [], publishedWorkIds: [], socialActions: [], forestTopicId: 'ai-learning' };
  let currentTopic = DATA.topics[0];
  let currentView = '';
  let toastTimer;
  let pendingDissent = null;

  try {
    const restored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (restored && Array.isArray(restored.savedTopics) && Array.isArray(restored.works)) {
      state = restored;
    }
  } catch (_) {
    // The demo still works in memory when browser storage is unavailable.
  }
  state.adoptedRoots = Array.isArray(state.adoptedRoots) ? state.adoptedRoots : [];
  state.userSources = Array.isArray(state.userSources) ? state.userSources : [];
  state.publishedWorkIds = Array.isArray(state.publishedWorkIds) ? state.publishedWorkIds : [];
  state.socialActions = Array.isArray(state.socialActions) ? state.socialActions : [];
  state.forestTopicId = topicById(state.forestTopicId || state.session?.topicId).id;
  state.draftArticle = state.draftArticle && typeof state.draftArticle === 'object' ? state.draftArticle : null;
  state.works.forEach((work) => {
    if (!work.status) work.status = state.publishedWorkIds.includes(work.id) ? 'confirmed' : 'note';
  });

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {
      toast('当前浏览器无法长期保存，请保留此页面，并下载需要保存的文章。');
    }
  }

  function topicById(id) {
    return DATA.topics.find((topic) => topic.id === id) || DATA.topics[0];
  }

  function presetFlags(record) {
    if (!Array.isArray(record.presetUsed) || record.presetUsed.length !== 3) {
      record.presetUsed = [false, false, false];
    }
    return record.presetUsed;
  }

  function showDialog(title, html) {
    $('#dialog-title').textContent = title;
    $('#dialog-body').innerHTML = html;
    if (!$('#dialog').open) $('#dialog').showModal();
  }

  function closeDialog() {
    $('#dialog').close();
  }

  function toast(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').hidden = false;
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 3200);
  }

  function syncNavCounts() {

    const ownPublished = state.works.filter((work) => state.publishedWorkIds.includes(work.id) && work.topicId === state.forestTopicId).length;
    if ($('#forest-nav-count')) $('#forest-nav-count').textContent = 3 + ownPublished;
  }

  function renderHome() {
    syncNavCounts();
    $('#start-tree-button').disabled = false;
    $('#start-tree-button').title = '进入生长空间，点击种子导入收藏';
    $('#start-tree-button').setAttribute('aria-label', '启动知树，进入我的生长空间');
  }

  function renderTopic(topic) {
    currentTopic = topic;
    $('#topic-order').textContent = `${topic.order} / ${String(DATA.topics.length).padStart(2, '0')}`;
    $('#topic-recommended').textContent = topic.recommended;
    $('#topic-title').textContent = topic.title;
    $('#topic-tags').innerHTML = topic.tags.map((tag) => `<span>${esc(tag)}</span>`).join('');
    $('#topic-reason').textContent = topic.reason;
    $('#topic-debate').textContent = topic.debate;
    $('#topic-contribution').textContent = topic.contribution;
    $('#topic-source-count').textContent = `${topic.sources.length} 条知乎公开来源 · ${DATA.fetchedAt} 获取`;
    $('#side-grid').innerHTML = topic.sides.map((side) => `<div class="side-card"><b>${esc(side.label)}</b><p>${esc(side.text)}</p></div>`).join('');
    $('#source-list').innerHTML = topic.sources.map((source, index) => `<article class="source-card">
      <span class="source-index">${String(index + 1).padStart(2, '0')}</span>
      <div><h3>${esc(source.title)} <span class="source-stance">${esc(source.stance)}</span></h3><div class="source-meta">${esc(source.author)} · ${esc(source.type)}</div><p>${esc(source.summary)}</p></div>
      <a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">去知乎看原文 ↗</a>
    </article>`).join('');
    const saved = state.savedTopics.includes(topic.id);
    $('[data-action="save-topic"]').textContent = saved ? '已收藏这个话题 ✓' : '收藏这个话题';
  }

  function safeUrl(value) {
    if (!value) return '';
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  const treeNotes = {
    root: ['根系 · 收藏内容', '收藏、导入资料和从同题树林采集的果实都在这里保留来源。它们是思考材料，还不是你的观点。'],
    trunk: ['树干 · 主要观点', '完成第一轮表达后，你亲自说出的判断和理由长成树干，决定整篇文章站在哪里。'],
    leaf: ['枝叶 · 多轮对话', '回应异见、补充例子并说明适用边界，思考才会从一句判断展开成枝叶。'],
    fruit: ['果实 · 写出的文章', '三轮表达先整理成草稿；只有你检查并确认文章，树上才会出现果实。发布仍是另一个动作。']
  };

  function composeArticle(topic, answers) {
    const sections = [
      ['我为什么这样想', answers[0]],
      ['我怎样看待不同意见', answers[1]],
      ['这套判断适用于什么情况', answers[2]]
    ];
    return [`围绕“${topic.title}”，这是我现在能够说清楚的部分。`, ...sections.map(([heading, answer]) => `${heading}\n\n${answer.trim() || '（这一部分尚未展开，我先保留这个空缺。）'}`), `写在最后\n\n这篇文章记录的是我目前的判断。以后遇到新的经历、来源或异见时，我可以回来继续修改。`].join('\n\n');
  }

  function ownFruit(work) {
    const topic = topicById(work.topicId);
    return {
      id: `own-${work.id}`,
      workId: work.id,
      topicId: work.topicId,
      author: '我',
      initials: '我',
      relation: '我的',
      publishedAt: '刚刚发布',
      rootCount: (work.sources || topic.sources).length,
      views: 0,
      dissentCount: 0,
      collectCount: 0,
      title: work.title,
      summary: work.viewpoint || work.answers.find((answer) => answer.trim()) || '这篇果实还保留了一些没有展开的部分。',
      body: (work.body || composeArticle(topic, work.answers)).split(/\n{2,}/).filter(Boolean),
      roots: (work.sources || topic.sources).map((source) => source.title),
      mine: true
    };
  }

  function fruitById(id) {
    const preset = DATA.forestPosts.find((post) => post.id === id);
    if (preset) return preset;
    if (id.startsWith('own-')) {
      const work = state.works.find((item) => item.id === id.slice(4));
      if (work && state.publishedWorkIds.includes(work.id)) return ownFruit(work);
    }
    return null;
  }

  function relationClass(relation) {
    return relation === '有异见' ? 'dissent' : relation === '补充' ? 'add' : relation === '我的' ? 'mine' : 'near';
  }

  function forestItems(topicId) {
    const mine = state.works.filter((work) => work.topicId === topicId && state.publishedWorkIds.includes(work.id)).map(ownFruit);
    return [...mine, ...DATA.forestPosts.filter((post) => post.topicId === topicId)];
  }

  function renderForest() {
    const topic = topicById(state.forestTopicId);
    currentTopic = topic;
    const items = forestItems(topic.id);
    $('#forest-topic-tabs').innerHTML = DATA.topics.map((item) => `<button role="tab" aria-selected="${item.id === topic.id}" class="${item.id === topic.id ? 'active' : ''}" data-action="set-forest-topic" data-topic="${esc(item.id)}"><span>${esc(item.order)}</span>${esc(item.short)}</button>`).join('');
    $('#forest-list').innerHTML = items.map((post) => {
      const collected = state.adoptedRoots.some((root) => root.fruitId === post.id);
      const dissent = state.socialActions.find((action) => action.type === 'dissent' && action.fruitId === post.id);
      return `<article class="fruit-card ${post.mine ? 'own-fruit' : ''}">
        <div class="fruit-card-head"><span class="friend-avatar">${esc(post.initials)}</span><div><b>${esc(post.author)}</b><small>${post.mine ? '我的已发布作品' : '演示知友'} · ${esc(post.publishedAt)}</small></div><em class="relation ${relationClass(post.relation)}">${esc(post.relation)}</em></div>
        <div class="fruit-tree"><img src="assets/tree-fruit.png" alt="${esc(post.author)}文章结出的知识果实"><span>${post.rootCount} 条根系</span></div>
        <h2>${esc(post.title)}</h2>
        <p>${esc(post.summary)}</p>
        <div class="fruit-stats"><span>${post.views + (post.mine ? 1 : 0)} 阅读</span><span>${post.dissentCount + (dissent ? 1 : 0)} 异见</span><span>${post.collectCount + (collected ? 1 : 0)} 采集</span><b>来源可追溯</b></div>
        <div class="fruit-actions"><button data-action="view-fruit" data-id="${esc(post.id)}">查看果实</button>${post.mine ? '<span>这是你的果实</span>' : `<button class="${dissent ? 'done' : ''}" data-action="open-dissent" data-id="${esc(post.id)}">${dissent ? '已提出异见' : '提出异见'}</button><button class="${collected ? 'done' : ''}" data-action="collect-root" data-id="${esc(post.id)}">${collected ? '已成为根系 ✓' : '采集为根系'}</button>`}</div>
      </article>`;
    }).join('');
    $('#forest-root-total').textContent = items.reduce((total, item) => total + item.rootCount, 0);
    syncNavCounts();
  }

  function showFruit(id) {
    const post = fruitById(id);
    if (!post) return;
    const collected = state.adoptedRoots.some((root) => root.fruitId === post.id);
    const dissent = state.socialActions.find((action) => action.type === 'dissent' && action.fruitId === post.id);
    const thread = dissent ? `<section class="friend-thread"><div class="thread-head">你和 ${esc(post.author)} 的异见对话 <span>演示互动</span></div><div class="thread-message mine"><b>我提出的问题</b><p>${esc(dissent.content)}</p></div><div class="thread-message"><b>${esc(post.author)} 回复</b><p>${esc(post.reply)}</p></div></section>` : '';
    showDialog(post.title, `<div class="fruit-detail-author"><span class="friend-avatar">${esc(post.initials)}</span><div><b>${esc(post.author)}</b><small>${post.mine ? '我的已发布作品' : `演示知友 · ${esc(post.publishedAt)}`}</small></div><em class="relation ${relationClass(post.relation)}">${esc(post.relation)}</em></div><p class="fruit-detail-summary">${esc(post.summary)}</p><div class="fruit-body">${post.body.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('')}</div><div class="fruit-roots"><b>这颗果实的来源根系</b>${post.roots.map((root, index) => `<span>[${index + 1}] ${esc(root)}</span>`).join('')}<small>来源链随果实一起保留；采集不转移内容所有权。</small></div>${thread}<div class="dialog-actions fruit-dialog-actions">${post.mine ? `<button class="primary-button" data-action="return-to-tree" data-id="${esc(post.workId)}">回到这棵树 →</button>` : `<button class="quiet-button" data-action="open-dissent" data-id="${esc(post.id)}">${dissent ? '查看 / 修改异见' : '提出一个具体异见'}</button><button class="primary-button" data-action="collect-root" data-id="${esc(post.id)}">${collected ? '已采集为根系 ✓' : '采集为我的根系 →'}</button>`}</div>`);
  }

  function openDissent(id) {
    const post = fruitById(id);
    if (!post || post.mine) return;
    const existing = state.socialActions.find((action) => action.type === 'dissent' && action.fruitId === id);
    showDialog(`向 ${post.author} 提出异见`, `<p>请针对观点提出具体问题、理由或反例。你的文字在确认前不会“发送”。</p><div class="dialog-note">对方的核心观点：${esc(post.summary)}</div><label class="field-label" for="dissent-input">我想追问</label><textarea id="dissent-input" class="dissent-input" rows="4" maxlength="500" placeholder="例如：我对这个前提有疑问，因为……">${esc(existing?.content || '')}</textarea><div class="dissent-tools"><button data-action="fill-dissent" data-id="${esc(id)}">没有思路？填入一条具体问题</button><span id="dissent-count">${existing?.content.length || 0} / 500</span></div><p id="dissent-error" class="error" role="alert"></p><div class="dialog-actions"><button class="quiet-button" data-action="view-fruit" data-id="${esc(id)}">返回文章</button><button class="primary-button" data-action="send-dissent" data-id="${esc(id)}">检查并发送 →</button></div><small class="interaction-note">这是本机演示互动，不会真的联系知乎用户。</small>`);
  }

  function collectAsRoot(id) {
    const post = fruitById(id);
    if (!post || post.mine) return;
    if (state.adoptedRoots.some((root) => root.fruitId === id)) {
      toast('这颗果实已经在你的根系里。');
      return;
    }
    showDialog('把这颗果实采集为根系？', `<p>采集后会保留文章卡、作者、采集时间和上游来源链，保留在“历史记录”的收藏来源里。</p><div class="dialog-note"><b>${esc(post.author)}：</b>${esc(post.title)}<br>${esc(post.summary)}</div><p><strong>采集不代表认同。</strong>它不会直接变成你的观点，也不会让树结果；以后围绕它创作时，你仍需完成自己的表达。</p><div class="dialog-actions"><button class="quiet-button" data-action="view-fruit" data-id="${esc(id)}">再读一遍</button><button class="primary-button" data-action="confirm-collect" data-id="${esc(id)}">确认采集为根系 →</button></div>`);
  }

  function markdown(work) {
    const topic = topicById(work.topicId);
    const flags = presetFlags(work);
    const article = work.body || composeArticle(topic, work.answers);
    const answers = answerLabels.map((label, index) => `## ${label}${flags[index] ? '（演示预设）' : ''}\n\n${work.answers[index].trim() || '（尚未展开）'}`).join('\n\n');
    const sources = (work.sources || topic.sources).map((source, index) => `### [${index + 1}] ${source.title}\n\n${source.author?`- 作者：${source.author}\n`:''}- 收藏内容：${source.content || source.summary || ''}\n- 原文：${source.url || '未提供来源链接'}`).join('\n\n');
    return `# ${work.title}\n\n> 由知树本地演示保存。文章保留三轮表达；演示预设仅用于体验，不代表用户真实经历。\n\n## 文章正文\n\n${article}\n\n---\n\n## 三轮原始表达\n\n${answers}\n\n## 收藏来源\n\n${sources}\n`;
  }

  function downloadWork(work) {
    if (!work) return;
    const blob = new Blob(['\uFEFF' + markdown(work)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `知树-${work.title.replace(/[\\/:*?"<>|]/g, '').slice(0, 50)}.md`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
    toast('观点卡已开始下载。');
  }

  function route() {
    let raw = location.hash.slice(1) || 'home';
    const aliases = { thinking:'garden', article:'garden', works:'history', favorites:'history' };
    if (aliases[raw]) { raw=aliases[raw]; history.replaceState(null,'',`#${raw}`); }
    let view = raw;
    if(raw.startsWith('topic/')) {currentTopic=topicById(raw.split('/')[1]);view='topic';}
    if(!['home','garden','history','forest','topic'].includes(view))view='home';
    if(currentView==='garden'&&view!=='garden')window.ZhishuGarden?.leave();
    $$('.view').forEach(section=>{section.hidden=section.id!==`view-${view}`;});
    document.body.dataset.view=view;
    $$('[data-route]').forEach(link=>{const active=link.dataset.route===view;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');});
    if(view==='home')renderHome();
    if(view==='garden')window.ZhishuGarden?.enter();
    if(view==='history')window.ZhishuGarden?.renderHistory();
    if(view==='topic')renderTopic(currentTopic);
    if(view==='forest')renderForest();
    syncNavCounts();
    document.title={home:'知树 · 让思考自然生长',garden:'我的知树 · 知树',history:'历史记录 · 知树',forest:'同题树林 · 知树',topic:`${currentTopic.short} · 知树`}[view];
    if(currentView!==view){window.scrollTo({top:0,behavior:'instant'});if(currentView)$('#main').focus({preventScroll:true});}
    currentView=view;
  }
  const actions = {
    about:()=>showDialog('关于这次生长',`<p>在“我的知树”里点击种子、根系、枝干、树叶和果实，完成一篇文章；历史记录保留本次演示中整棵树的进度，同题树林用于阅读和交流。</p><p>这是本地演示：重新打开或刷新页面时，收藏、对话、历史记录和发布状态都会清空，从新的种子开始。文章使用本地结构整理，不会调用在线 AI 或自动读取私人收藏夹。</p><div class="dialog-actions"><button class="primary-button" data-action="close-dialog">知道了</button></div>`),
    'close-dialog':closeDialog,
    'start-user-tree':()=>{location.hash='garden';},
    'new-tree':()=>window.ZhishuGarden?.newTree(),
    'start-topic-tree':()=>window.ZhishuGarden?.newTree({title:currentTopic.title,topicId:currentTopic.id,suggestedSources:currentTopic.sources.map(s=>({...s,content:s.summary,personal:false}))}),
    'save-topic':()=>{if(!state.savedTopics.includes(currentTopic.id))state.savedTopics.push(currentTopic.id);save();renderTopic(currentTopic);},
    'go-forest':()=>{closeDialog();location.hash='forest';},
    'return-to-tree':button=>{closeDialog();window.ZhishuGarden?.openWork(button.dataset.id);},
    'tree-note': (button) => {
      const wasActive = button.getAttribute('aria-pressed') === 'true';
      $$('.tree-hotspot').forEach((item) => item.setAttribute('aria-pressed', 'false'));
      if (wasActive) {
        $('#tree-note').hidden = true;
        return;
      }
      const [title, copy] = treeNotes[button.dataset.note];
      button.setAttribute('aria-pressed', 'true');
      $('#tree-note-title').textContent = title;
      $('#tree-note-copy').textContent = copy;
      $('#tree-note').hidden = false;
    },
    profile: () => showDialog('演示账户', `<p>这是一套本机 DEMO 数据，不代表真实知乎账号状态。</p><div class="profile-stats"><div><b>${12 + state.userSources.length + state.adoptedRoots.length}</b><span>条根系</span></div><div><b>${state.works.length}</b><span>篇作品</span></div><div><b>${state.publishedWorkIds.length}</b><span>颗公开果实</span></div></div><div class="dialog-actions"><button class="primary-button" data-action="close-dialog">知道了</button></div>`),
    'set-forest-topic': (button) => {
      state.forestTopicId = topicById(button.dataset.topic).id;
      save();
      renderForest();
    },
    'view-fruit': (button) => showFruit(button.dataset.id),
    'open-dissent': (button) => openDissent(button.dataset.id),
    'fill-dissent': (button) => {
      const post = fruitById(button.dataset.id);
      if (!post || !$('#dissent-input')) return;
      $('#dissent-input').value = post.suggestedDissent;
      $('#dissent-count').textContent = `${post.suggestedDissent.length} / 500`;
      $('#dissent-error').textContent = '';
      $('#dissent-input').focus();
    },
    'send-dissent': (button) => {
      const post = fruitById(button.dataset.id);
      const input = $('#dissent-input');
      if (!post || !input) return;
      const content = input.value.trim();
      if (content.length < 12 || !/[？?因为例如比如如果但是前提]/.test(content)) {
        $('#dissent-error').textContent = '请补充一个具体问题、理由或反例。可以点上方预设问题快速演示。';
        input.focus();
        return;
      }
      pendingDissent = { fruitId: post.id, content };
      showDialog('确认发送这条异见？', `<p>这条内容会进入你和 ${esc(post.author)} 的演示对话。确认前还没有“发送”。</p><div class="dialog-note">${esc(content)}</div><div class="dialog-actions"><button class="quiet-button" data-action="open-dissent" data-id="${esc(post.id)}">返回修改</button><button class="primary-button" data-action="confirm-dissent">确认发送 →</button></div><small class="interaction-note">本次发送只发生在当前浏览器，不会联系真实用户。</small>`);
    },
    'confirm-dissent': () => {
      if (!pendingDissent) return;
      state.socialActions = state.socialActions.filter((action) => !(action.type === 'dissent' && action.fruitId === pendingDissent.fruitId));
      state.socialActions.push({ id: `dissent-${Date.now()}`, type: 'dissent', fruitId: pendingDissent.fruitId, content: pendingDissent.content, createdAt: new Date().toISOString() });
      const id = pendingDissent.fruitId;
      pendingDissent = null;
      save();
      showFruit(id);
      toast('异见已加入演示对话，对方给出了回应。');
    },
    'collect-root': (button) => collectAsRoot(button.dataset.id),
    'confirm-collect': (button) => {
      const post = fruitById(button.dataset.id);
      if (!post || post.mine || state.adoptedRoots.some((root) => root.fruitId === post.id)) return;
      state.adoptedRoots.unshift({ id: `root-${Date.now()}`, fruitId: post.id, topicId: post.topicId, author: post.author, title: post.title, summary: post.summary, upstreamRoots: [...post.roots], collectedAt: new Date().toISOString() });
      state.forestTopicId = post.topicId;
      save();
      closeDialog();
      renderForest();
      toast('已采集为根系：保留作者和上游来源，不代表认同。');
    },
  };
  document.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(button)actions[button.dataset.action]?.(button);});
  document.addEventListener('input',event=>{if(event.target.id==='dissent-input'&&$('#dissent-count')){$('#dissent-count').textContent=`${event.target.value.length} / 500`;$('#dissent-error').textContent='';}});

  window.ZhishuGardenBridge = {
    getLegacyData(){return {...state,topics:DATA.topics};},
    getSources(topicId){
      const personal=[...state.userSources.map(source=>({...source,personal:true,origin:'我的收藏'})),...state.adoptedRoots.map(source=>({...source,personal:true,content:source.summary,url:'',origin:`同题树林 · ${source.author}`}))];
      const demo=topicById(topicId).sources.map(source=>({...source,content:source.summary,personal:false}));
      return {personal,demo};
    },
    getSavedSources(){const sources=this.getSources().personal;for(const id of state.savedTopics)for(const source of topicById(id).sources)sources.push({...source,content:source.summary,personal:false,origin:'收藏的话题'});return sources;},
    addSources(sources){for(const source of sources)if(!state.userSources.some(item=>item.id===source.id)&&!state.adoptedRoots.some(item=>item.id===source.id))state.userSources.unshift({...source,createdAt:new Date().toISOString()});save();},
    getWork(id){return state.works.find(work=>work.id===id);},
    isPublished(id){return state.publishedWorkIds.includes(id);},
    saveArticle(payload){
      const topic=topicById(payload.topicId);
      const work={id:payload.id||`garden-work-${crypto.randomUUID()}`,treeId:payload.treeId,topicId:topic.id,title:payload.title,body:payload.body,viewpoint:payload.viewpoint,answers:[...payload.answers],presetUsed:[...payload.presetUsed],sourceIds:[...payload.sourceIds],sources:payload.sources.map(source=>({...source})),status:'confirmed',confirmedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      const index=state.works.findIndex(item=>item.id===work.id);if(index>=0)state.works[index]=work;else state.works.unshift(work);
      state.publishedWorkIds=state.publishedWorkIds.filter(id=>id!==work.id);state.draftArticle={...work};save();return work.id;
    },
    publish(workId,topicId){const work=this.getWork(workId);if(!work||work.status!=='confirmed')return false;work.topicId=topicById(topicId||work.topicId).id;if(!state.publishedWorkIds.includes(workId))state.publishedWorkIds.push(workId);state.forestTopicId=work.topicId;save();return true;},
    unpublish(id){state.publishedWorkIds=state.publishedWorkIds.filter(workId=>workId!==id);save();},
    download(id){downloadWork(this.getWork(id));},
    openForest(topicId){if(topicId)state.forestTopicId=topicById(topicId).id;save();location.hash='forest';},
    toast,
    refreshRoute:route
  };
  $('#dialog').addEventListener('click',event=>{if(event.target!==$('#dialog'))return;const rect=$('#dialog').getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeDialog();});
  window.addEventListener('hashchange',route);
  renderHome();route();
})();
