(() => {
  'use strict';

  const DATA = window.ZHISHU_DATA;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const STORAGE_KEY = 'zhishu-real-topics-demo-v1';
  const answerLabels = ['我的经历与判断', '我对不同意见的回应', '适用条件与边界'];
  const placeholders = ['还没有写下你的经历', '还没有回应不同意见', '还没有说明适用条件'];
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
      toast('当前浏览器无法长期保存，刷新前请下载观点卡。');
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
    $('#root-source-count').textContent = 12 + state.userSources.length + state.adoptedRoots.length;
    const ownPublished = state.works.filter((work) => state.publishedWorkIds.includes(work.id) && work.topicId === state.forestTopicId).length;
    if ($('#forest-nav-count')) $('#forest-nav-count').textContent = 3 + ownPublished;
  }

  function renderHome() {
    syncNavCounts();
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

  function renderFavorites() {
    $('#personal-source-section').hidden = !state.userSources.length;
    $('#personal-source-list').innerHTML = state.userSources.map((source) => `<article class="adopted-root-card personal-source-card">
      <span class="root-mark">藏</span>
      <div><div class="source-meta">我添加的收藏 · ${new Date(source.createdAt).toLocaleDateString('zh-CN')}</div><h3>${esc(source.title)}</h3><p>${esc(source.content)}</p>${safeUrl(source.url) ? `<a class="personal-source-link" href="${esc(safeUrl(source.url))}" target="_blank" rel="noopener noreferrer">打开来源 ↗</a>` : ''}</div>
      <div><button data-action="remove-user-source" data-id="${esc(source.id)}">移除收藏</button></div>
    </article>`).join('');
    $('#adopted-root-section').hidden = !state.adoptedRoots.length;
    $('#adopted-root-list').innerHTML = state.adoptedRoots.map((root) => `<article class="adopted-root-card">
      <span class="root-mark">根</span>
      <div><div class="source-meta">采集自 ${esc(root.author)} · ${new Date(root.collectedAt).toLocaleDateString('zh-CN')}</div><h3>${esc(root.title)}</h3><p>${esc(root.summary)}</p><div class="root-trace"><span>原作者</span><i>→</i><span>知识果实</span><i>→</i><b>我的根系</b></div></div>
      <div><button data-action="view-fruit" data-id="${esc(root.fruitId)}">查看果实 ↗</button><button data-action="remove-root" data-id="${esc(root.fruitId)}">移除根系</button></div>
    </article>`).join('');
    $('#favorite-groups').innerHTML = DATA.topics.map((topic) => `<section class="favorite-group">
      <div class="group-title"><span>${esc(topic.order)} · ${esc(topic.short)}</span><h2>${esc(topic.title)}</h2><a href="#topic/${esc(topic.id)}">查看话题对照 →</a></div>
      <div class="favorite-list">${topic.sources.map((source) => `<article class="favorite-card">
        <span>${esc(source.author)} · ${esc(source.stance)}</span>
        <h3>${esc(source.title)}</h3>
        <p>${esc(source.summary)}</p>
        <a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">知乎原文 ↗</a>
      </article>`).join('')}</div>
    </section>`).join('');
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

  function openAddFavorite() {
    showDialog('添加我的收藏内容', `<p>粘贴一段你想继续思考的内容，并记录它来自哪里。当前 DEMO 只保存在这台设备的浏览器中。</p><form id="favorite-form" class="favorite-form"><label for="favorite-title">收藏标题</label><input id="favorite-title" maxlength="140" placeholder="这条内容在讲什么？" required><label for="favorite-content">内容或摘要</label><textarea id="favorite-content" rows="5" maxlength="10000" placeholder="粘贴原文片段，或用自己的话记下重点……" required></textarea><label for="favorite-url">来源链接 <span>选填</span></label><input id="favorite-url" type="url" maxlength="2000" placeholder="https://"><div class="favorite-form-help"><button type="button" data-action="fill-favorite-demo">填入一条演示收藏</button><small>链接仅作出处记录，不会自动抓取内容。</small></div><p id="favorite-error" class="error" role="alert"></p><div class="dialog-actions"><button type="button" class="quiet-button" data-action="close-dialog">取消</button><button type="submit" class="primary-button">添加到我的资料 →</button></div></form>`);
  }

  const treeNotes = {
    root: ['根系 · 收藏内容', '收藏、导入资料和从同题森林采集的果实都在这里保留来源。它们是思考材料，还不是你的观点。'],
    trunk: ['树干 · 主要观点', '完成第一轮表达后，你亲自说出的判断和理由长成树干，决定整篇文章站在哪里。'],
    leaf: ['枝叶 · 多轮对话', '回应异见、补充例子并说明适用边界，思考才会从一句判断展开成枝叶。'],
    fruit: ['果实 · 写出的文章', '三轮表达先整理成草稿；只有你检查并确认文章，树上才会出现果实。发布仍是另一个动作。']
  };

  function freshSession(topic) {
    return { topicId: topic.id, round: 0, reached: 0, answers: ['', '', ''], presetUsed: [false, false, false], updatedAt: new Date().toISOString() };
  }

  function startThinking(topic) {
    if (state.session && state.session.topicId === topic.id) {
      location.hash = 'thinking';
      return;
    }
    if (state.session && state.session.answers.some((answer) => answer.trim())) {
      showDialog('换一个问题继续想？', `<p>当前问题的回答会保存在浏览器里，但本次 DEMO 同时只继续一个问题。</p><div class="dialog-note">正在思考：${esc(topicById(state.session.topicId).title)}</div><div class="dialog-actions"><button class="quiet-button" data-action="close-dialog">先不换</button><button class="primary-button" data-action="confirm-new" data-topic="${esc(topic.id)}">换成这个问题</button></div>`);
      return;
    }
    state.session = freshSession(topic);
    state.draftArticle = null;
    save();
    location.hash = 'thinking';
  }

  function renderThinking() {
    const session = state.session;
    $('#thinking-empty').hidden = !!session;
    $('#thinking-workspace').hidden = !session;
    if (!session) return;
    presetFlags(session);
    const topic = topicById(session.topicId);
    currentTopic = topic;
    $('#thinking-back').href = `#topic/${topic.id}`;
    $('#thinking-title').textContent = topic.title;
    $('#thinking-evidence').innerHTML = topic.sides.map((side) => `<div><b>${esc(side.label)}</b>${esc(side.text)}</div>`).join('');
    $$('.steps span').forEach((step, index) => {
      step.classList.toggle('active', index === session.round);
      step.classList.toggle('done', index < session.reached);
    });
    const review = session.round === 3;
    $('#question-card').hidden = review;
    $('#review-card').hidden = !review;
    if (review) {
      $('#answer-review').innerHTML = answerLabels.map((label, index) => `<div class="review-block"><h3><span>${esc(label)}${session.presetUsed[index] ? '<em class="preset-badge">演示预设</em>' : ''}</span><button data-action="edit-round" data-round="${index}">修改</button></h3><p>${esc(session.answers[index].trim() || '（尚未展开，先保留为空缺。）')}</p></div>`).join('');
    } else {
      $('#round-name').textContent = ['第一轮 · 你的真实经历', '第二轮 · 回应另一种可能', '第三轮 · 说清适用边界'][session.round];
      $('#prompt-title').textContent = topic.prompts[session.round];
      $('#prompt-help').textContent = [
        '不用给标准答案，从一件你亲自遇到的小事开始就好。',
        '你可以不同意材料里的担心，也可以承认它在某些情况下成立。',
        '把“我觉得”再向前推一步：对谁、在什么时候、满足什么条件？'
      ][session.round];
      $('#answer').value = session.answers[session.round];
      $('#answer-count').textContent = `${session.answers[session.round].length} / 3000`;
      $('#preset-preview').textContent = `“${topic.presetAnswers[session.round].slice(0, 34)}…”`;
      $('[data-action="fill-demo"] b').textContent = session.answers[session.round].trim() ? '换成预设回答' : '一键填入预设回答';
      $('#answer-origin-note').textContent = session.presetUsed[session.round] ? '当前是演示预设；修改任意内容后，会作为你的表达保留。' : '你的原话会被保留，不会被改写成别人的观点。';
      $('#answer-error').textContent = '';
    }
    renderSummary();
  }

  function renderSummary() {
    if (!state.session) return;
    const answers = state.session.answers;
    const complete = answers.filter((answer) => answer.trim()).length;
    $('#answer-summary').innerHTML = answerLabels.map((label, index) => `<div class="summary-item ${answers[index].trim() ? 'filled' : ''}"><b>${esc(label)}</b><p>${esc(answers[index].trim() || placeholders[index])}</p></div>`).join('');
    $('#growth-tree').src = complete ? 'assets/tree-full.png' : 'assets/tree-bare.png';
    $('#growth-tree').style.opacity = complete ? String(0.55 + complete * 0.15) : '1';
    $('#growth-stage').textContent = ['资料已经成为根系', '你的经历正在长成树干', '另一种可能长出枝叶', '理由与边界都有了位置'][complete];
  }

  function nextRound(skip = false) {
    const session = state.session;
    if (!session || session.round >= 3) return;
    const value = $('#answer').value.trim();
    if (!value && !skip) {
      $('#answer-error').textContent = '写一点自己的想法，或者点击“先保留空缺”。';
      $('#answer').focus();
      return;
    }
    session.answers[session.round] = value;
    session.round += 1;
    session.reached = Math.max(session.reached, session.round);
    session.updatedAt = new Date().toISOString();
    save();
    renderThinking();
  }

  function applyPresetAnswer(expectedRound) {
    const session = state.session;
    if (!session || session.round !== expectedRound || session.round >= 3) return;
    const topic = topicById(session.topicId);
    const preset = topic.presetAnswers[session.round];
    session.answers[session.round] = preset;
    presetFlags(session)[session.round] = true;
    session.updatedAt = new Date().toISOString();
    $('#answer').value = preset;
    $('#answer-count').textContent = `${preset.length} / 3000`;
    $('#answer-origin-note').textContent = '当前是演示预设；修改任意内容后，会作为你的表达保留。';
    $('[data-action="fill-demo"] b').textContent = '换成预设回答';
    $('#answer-error').textContent = '';
    renderSummary();
    save();
    $('#answer').focus();
    toast('已填入演示回答，可以继续修改或直接进入下一轮。');
  }

  function fillDemoAnswer() {
    const session = state.session;
    if (!session || session.round >= 3) return;
    const round = session.round;
    const current = $('#answer').value.trim();
    const preset = topicById(session.topicId).presetAnswers[round];
    if (current && current !== preset) {
      showDialog('换成演示预设回答？', `<p>输入框里已经有你写的内容。继续后，这一轮会被演示文字替换。</p><div class="dialog-note">${esc(preset)}</div><div class="dialog-actions"><button class="quiet-button" data-action="close-dialog">保留我的内容</button><button class="primary-button" data-action="confirm-fill" data-round="${round}">换成演示回答</button></div>`);
      return;
    }
    applyPresetAnswer(round);
  }

  function composeArticle(topic, answers) {
    const sections = [
      ['我为什么这样想', answers[0]],
      ['我怎样看待不同意见', answers[1]],
      ['这套判断适用于什么情况', answers[2]]
    ];
    return [`围绕“${topic.title}”，这是我现在能够说清楚的部分。`, ...sections.map(([heading, answer]) => `${heading}\n\n${answer.trim() || '（这一部分尚未展开，我先保留这个空缺。）'}`), `写在最后\n\n这篇文章记录的是我目前的判断。以后遇到新的经历、来源或异见时，我可以回来继续修改。`].join('\n\n');
  }

  function createWork() {
    const session = state.session;
    if (!session) return;
    const topic = topicById(session.topicId);
    if (!session.answers.some((answer) => answer.trim())) {
      toast('至少写下一点自己的想法，才能整理文章。');
      return;
    }
    const existing = state.works.find((work) => work.topicId === topic.id);
    state.draftArticle = {
      id: existing?.id || `work-${Date.now()}`,
      topicId: topic.id,
      title: existing?.title || topic.title,
      body: composeArticle(topic, session.answers),
      answers: [...session.answers],
      presetUsed: [...presetFlags(session)],
      sourceIds: topic.sources.map((source) => source.id),
      status: 'draft',
      updatedAt: new Date().toISOString()
    };
    state.forestTopicId = topic.id;
    save();
    location.hash = 'article';
  }

  function captureArticle() {
    if (!state.draftArticle) return;
    state.draftArticle.title = $('#article-title').value.trim();
    state.draftArticle.body = $('#article-body').value;
    state.draftArticle.updatedAt = new Date().toISOString();
  }

  function renderArticle() {
    const draft = state.draftArticle;
    if (!draft) return;
    const topic = topicById(draft.topicId);
    const confirmed = draft.status === 'confirmed';
    const published = confirmed && state.publishedWorkIds.includes(draft.id);
    $('#article-title').value = draft.title;
    $('#article-body').value = draft.body;
    $('#article-word-count').textContent = `${draft.body.replace(/\s/g, '').length} 字`;
    $('#article-source-count').textContent = `${topic.sources.length} 条来源`;
    $('#article-save-status').textContent = published ? '文章已确认 · 已进入同题森林' : confirmed ? '文章已确认 · 私人保存' : '草稿保存在当前浏览器';
    $('#article-step-confirm').classList.toggle('active', !confirmed);
    $('#article-step-confirm').classList.toggle('done', confirmed);
    $('#article-step-fruit').classList.toggle('active', confirmed);
    $('#result-tree').src = confirmed ? 'assets/tree-fruit.png' : 'assets/tree-full.png';
    $('#result-tree').alt = confirmed ? '结出七枚金色果实的知识树' : '枝叶完整、等待结果的知识树';
    $('#result-state-badge').textContent = confirmed ? '文章已结果' : '等待确认';
    $('#result-state-badge').classList.toggle('confirmed', confirmed);
    $('#result-title').innerHTML = confirmed ? '你的文章，<br>已经结成果实。' : '枝叶已经完整，<br>但还没有结果。';
    $('#result-copy').textContent = published ? '这颗果实已经在同题森林中。刚才确认的修改也会更新到你的演示果实。' : confirmed ? '果实代表一篇由你检查并确认的文章。它目前仍是私人作品，是否进入同题森林由你决定。' : '先读一遍文章，确认它准确表达了你的意思。只有你亲自确认，树上才会出现果实。';
    $('#confirm-fruit-button').hidden = confirmed;
    $('#fruit-next-actions').hidden = !confirmed;
    $('#article-publish-button').dataset.action = published ? 'go-forest' : 'article-publish';
    $('#article-publish-button').textContent = published ? '查看同题森林 →' : '放入同题森林 →';
    $('#result-footnote').textContent = published ? '这是本机演示发布，不会真的发到知乎。' : confirmed ? '私人结果不等于公开发布。' : '确认文章不会自动公开。';
  }

  function confirmArticle() {
    const draft = state.draftArticle;
    if (!draft) return;
    captureArticle();
    if (!draft.title || !draft.body.trim()) {
      toast('标题和正文都需要保留一些内容。');
      return;
    }
    draft.status = 'confirmed';
    draft.confirmedAt = new Date().toISOString();
    draft.updatedAt = draft.confirmedAt;
    const work = { ...draft, answers: [...draft.answers], presetUsed: [...presetFlags(draft)], sourceIds: [...draft.sourceIds] };
    const index = state.works.findIndex((item) => item.id === work.id);
    if (index >= 0) state.works[index] = work; else state.works.unshift(work);
    save();
    renderArticle();
    $('#result-tree').classList.remove('fruiting');
    requestAnimationFrame(() => $('#result-tree').classList.add('fruiting'));
    toast('文章已确认，知识树结出了果实。');
  }

  function markArticleAsDraft() {
    const draft = state.draftArticle;
    if (!draft) return;
    captureArticle();
    draft.status = 'draft';
    const hasConfirmedVersion = state.works.some((work) => work.id === draft.id && work.status === 'confirmed');
    $('#article-word-count').textContent = `${draft.body.replace(/\s/g, '').length} 字`;
    $('#article-save-status').textContent = hasConfirmedVersion ? '修改已暂存 · 需要重新确认' : '草稿保存在当前浏览器';
    $('#article-step-confirm').classList.add('active');
    $('#article-step-confirm').classList.remove('done');
    $('#article-step-fruit').classList.remove('active');
    $('#result-tree').src = 'assets/tree-full.png';
    $('#result-tree').alt = '枝叶完整、等待重新确认的知识树';
    $('#result-tree').classList.remove('fruiting');
    $('#result-state-badge').textContent = hasConfirmedVersion ? '修改待确认' : '等待确认';
    $('#result-state-badge').classList.remove('confirmed');
    $('#result-title').innerHTML = '文章有了修改，<br>需要再次确认。';
    $('#result-copy').textContent = hasConfirmedVersion ? '森林和作品列表仍保留上一次确认的版本；重新确认后，果实才会更新。' : '先读一遍文章，确认它准确表达了你的意思。只有你亲自确认，树上才会出现果实。';
    $('#confirm-fruit-button').hidden = false;
    $('#fruit-next-actions').hidden = true;
    $('#result-footnote').textContent = '确认文章不会自动公开。';
    save();
  }

  function renderWorks() {
    if (!state.works.length) {
      $('#work-list').innerHTML = `<div class="empty"><img src="assets/tree-bare.png" alt="等待长成观点的知树"><h1>这里还没有你的观点。</h1><p>从真实知乎内容里的一个分歧开始，写下你的经历、回应和边界。</p><a href="#home" class="primary-button">去选一个话题 →</a></div>`;
      return;
    }
    $('#work-list').innerHTML = state.works.map((work) => {
      const topic = topicById(work.topicId);
      const confirmed = work.status === 'confirmed';
      const published = confirmed && state.publishedWorkIds.includes(work.id);
      return `<article class="work-card ${confirmed ? 'confirmed-work' : 'note-work'}">
        <div class="work-card-top"><span class="${presetFlags(work).some(Boolean) ? 'demo-work' : ''}">${confirmed ? '知识果实' : '观点卡'} · ${presetFlags(work).some(Boolean) ? '含演示预设' : esc(topic.short)}</span><div><em class="work-visibility ${published ? 'published' : confirmed ? 'confirmed' : ''}">${published ? '已进入同题森林' : confirmed ? '已结果 · 私人保存' : '待整理成文'}</em><time>${new Date(work.updatedAt).toLocaleDateString('zh-CN')}</time></div></div>
        <div class="work-fruit-preview"><img src="assets/${confirmed ? 'tree-fruit.png' : 'tree-full.png'}" alt="${confirmed ? '结出金色果实的知识树' : '枝叶完整的知识树'}"><span>${confirmed ? '文章已确认结果' : '三轮观点已完成'}</span></div>
        <h2>${esc(work.title)}</h2>
        ${answerLabels.map((label, index) => `<div class="work-answer"><b>${esc(label)}</b><p>${esc(work.answers[index].trim() || '尚未展开')}</p></div>`).join('')}
        <div class="work-sources">保留 ${topic.sources.length} 条知乎来源</div>
        <div class="work-actions">${confirmed ? `<button class="publish-action" data-action="${published ? 'unpublish-work' : 'publish-work'}" data-id="${esc(work.id)}">${published ? '取消发布' : '发布到同题森林 →'}</button><button data-action="open-article" data-id="${esc(work.id)}">查看文章</button>` : `<button class="publish-action" data-action="make-article-from-work" data-id="${esc(work.id)}">整理成文章 →</button>`}<button data-action="continue-work" data-topic="${esc(topic.id)}">修改观点</button><button data-action="download-work" data-id="${esc(work.id)}">下载</button><button data-action="delete-work" data-id="${esc(work.id)}">删除</button></div>
      </article>`;
    }).join('');
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
      rootCount: topic.sources.length,
      views: 0,
      dissentCount: 0,
      collectCount: 0,
      title: work.title,
      summary: work.answers.find((answer) => answer.trim()) || '这篇果实还保留了一些没有展开的部分。',
      body: (work.body || composeArticle(topic, work.answers)).split(/\n{2,}/).filter(Boolean),
      roots: topic.sources.map((source) => source.title),
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
    showDialog(post.title, `<div class="fruit-detail-author"><span class="friend-avatar">${esc(post.initials)}</span><div><b>${esc(post.author)}</b><small>${post.mine ? '我的已发布作品' : `演示知友 · ${esc(post.publishedAt)}`}</small></div><em class="relation ${relationClass(post.relation)}">${esc(post.relation)}</em></div><p class="fruit-detail-summary">${esc(post.summary)}</p><div class="fruit-body">${post.body.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('')}</div><div class="fruit-roots"><b>这颗果实的来源根系</b>${post.roots.map((root, index) => `<span>[${index + 1}] ${esc(root)}</span>`).join('')}<small>来源链随果实一起保留；采集不转移内容所有权。</small></div>${thread}<div class="dialog-actions fruit-dialog-actions">${post.mine ? '<button class="primary-button" data-action="go-works">返回我的作品</button>' : `<button class="quiet-button" data-action="open-dissent" data-id="${esc(post.id)}">${dissent ? '查看 / 修改异见' : '提出一个具体异见'}</button><button class="primary-button" data-action="collect-root" data-id="${esc(post.id)}">${collected ? '已采集为根系 ✓' : '采集为我的根系 →'}</button>`}</div>`);
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
    showDialog('把这颗果实采集为根系？', `<p>采集后会保留文章卡、作者、采集时间和上游来源链，出现在“我的根系”里。</p><div class="dialog-note"><b>${esc(post.author)}：</b>${esc(post.title)}<br>${esc(post.summary)}</div><p><strong>采集不代表认同。</strong>它不会直接变成你的观点，也不会让树结果；以后围绕它创作时，你仍需完成自己的表达。</p><div class="dialog-actions"><button class="quiet-button" data-action="view-fruit" data-id="${esc(id)}">再读一遍</button><button class="primary-button" data-action="confirm-collect" data-id="${esc(id)}">确认采集为根系 →</button></div>`);
  }

  function openPublishConfirmation(work) {
    if (!work || work.status !== 'confirmed') {
      toast('请先确认文章，让知识树结出果实。');
      return;
    }
    showDialog('把这颗果实放入同题森林？', `<p>文章已经确认结果，目前仍是私人保存。再次确认后，它会出现在“${esc(topicById(work.topicId).short)}”的演示树林中。</p><div class="dialog-note">将展示：文章标题、确认后的正文和 ${topicById(work.topicId).sources.length} 条来源根系。不会真的发布到知乎。</div><p>发布和文章确认是两个独立动作，你之后可以取消发布。</p><div class="dialog-actions"><button class="quiet-button" data-action="close-dialog">继续私人保存</button><button class="primary-button" data-action="confirm-publish" data-id="${esc(work.id)}">确认放入森林 →</button></div>`);
  }

  function markdown(work) {
    const topic = topicById(work.topicId);
    const flags = presetFlags(work);
    const article = work.body || composeArticle(topic, work.answers);
    const answers = answerLabels.map((label, index) => `## ${label}${flags[index] ? '（演示预设）' : ''}\n\n${work.answers[index].trim() || '（尚未展开）'}`).join('\n\n');
    const sources = topic.sources.map((source, index) => `### [${index + 1}] ${source.title}\n\n- 作者：${source.author}\n- 类型：${source.type}\n- 知树整理：${source.summary}\n- 原文：${source.url}`).join('\n\n');
    return `# ${work.title}\n\n> 由“知树 · 知乎真实内容话题 DEMO”保存。文章由三轮表达整理而来，并经用户确认后结为果实。未标记“演示预设”的段落为用户输入；演示预设仅用于展示，不代表用户真实经历。材料说明基于 2026-09-13 获取的知乎公开内容摘要，不代表知乎或原作者结论，请回原文核对。\n\n## 文章正文\n\n${article}\n\n---\n\n## 三轮原始表达\n\n${answers}\n\n## 这次参考的知乎内容\n\n${sources}\n`;
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
    const raw = location.hash.slice(1) || 'home';
    let view = raw;
    if (raw.startsWith('topic/')) {
      currentTopic = topicById(raw.split('/')[1]);
      view = 'topic';
    }
    if (!['home', 'topic', 'favorites', 'thinking', 'article', 'forest', 'works'].includes(view)) view = 'home';
    if (view === 'article' && !state.draftArticle) view = state.session ? 'thinking' : 'works';
    $$('.view').forEach((section) => { section.hidden = section.id !== `view-${view}`; });
    document.body.dataset.view = view;
    $$('[data-route]').forEach((link) => {
      const active = link.dataset.route === view || (view === 'article' && link.dataset.route === 'works') || (view === 'forest' && link.dataset.route === 'works');
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    if (view === 'home') renderHome();
    if (view === 'topic') renderTopic(currentTopic);
    if (view === 'favorites') renderFavorites();
    if (view === 'thinking') renderThinking();
    if (view === 'article') renderArticle();
    if (view === 'forest') renderForest();
    if (view === 'works') renderWorks();
    syncNavCounts();
    const titles = { home: '知树 · 从真实收藏里发现值得写的问题', topic: `${currentTopic.short} · 知树`, favorites: '我的根系 · 知树', thinking: '一起想清楚 · 知树', article: '确认文章，让它结果 · 知树', forest: '同题森林 · 知树', works: '我的作品 · 知树' };
    document.title = titles[view];
    if (currentView !== view) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (currentView) $('#main').focus({ preventScroll: true });
    }
    currentView = view;
  }

  const actions = {
    about: () => showDialog('这版 DEMO，真实在哪里？', `<p>4 个话题不是凭空编出来的。我们通过知乎开放平台检索公开回答和文章，再从材料中找出分歧，整理成首页话题卡。</p><ul><li>共使用 12 条知乎公开内容，每条都保留原文链接。</li><li>页面只展示摘要后的观点，不把搜索摘要冒充完整原文。</li><li>“大家在争什么”是知树的整理，不代表知乎或原作者的统一结论。</li><li>三轮表达先整理成可编辑文章；用户确认文章后，树上才会结出果实。</li><li>文章结果后仍是私人保存，只有再次确认才进入同题森林。</li><li>同题森林、知友、异见回复和采集均为当前浏览器里的演示，不会联系或发布给真实用户。</li><li>采集果实会保留作者和来源链，但不代表认同，也不会直接变成用户观点。</li><li>这仍是静态演示：数据获取于 ${DATA.fetchedAt}，页面打开时不会再次请求知乎。</li></ul><div class="dialog-actions"><button class="primary-button" data-action="close-dialog">知道了</button></div>`),
    how: () => showDialog('知树怎么找到一个值得写的问题？', `<p>它先不问“哪篇最正确”，而是做三件事：</p><ul><li>把讨论同一件事的收藏放在一起。</li><li>找出结论、理由或适用条件上的不同。</li><li>检查材料里缺少什么个人经验，再把它变成一个能回答的具体问题。</li></ul><div class="dialog-note">比如实习话题里，分歧不是简单的“去或不去”，而是实习应该多早开始、要不要追求数量，以及专业学习和校园体验值不值得被挤压。</div><div class="dialog-actions"><button class="primary-button" data-action="close-dialog">继续看话题</button></div>`),
    'close-dialog': closeDialog,
    'add-favorite': openAddFavorite,
    'fill-favorite-demo': () => {
      if (!$('#favorite-title')) return;
      $('#favorite-title').value = 'AI 给出答案以后，怎样判断自己真的学会了？';
      $('#favorite-content').value = '一个可操作的检查方法是：看完 AI 的解释后先关掉答案，再独立完成一道相似题，并用自己的话说明关键步骤。能够复述不一定等于能够迁移。';
      $('#favorite-url').value = 'https://www.zhihu.com/question/625883000';
      $('#favorite-error').textContent = '';
      $('#favorite-title').focus();
    },
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
    'go-thinking': () => state.session ? (location.hash = 'thinking') : startThinking(DATA.topics[0]),
    'start-thinking': () => startThinking(currentTopic),
    'confirm-new': (button) => {
      state.session = freshSession(topicById(button.dataset.topic));
      state.draftArticle = null;
      save();
      closeDialog();
      location.hash = 'thinking';
    },
    'save-topic': () => {
      const index = state.savedTopics.indexOf(currentTopic.id);
      if (index >= 0) state.savedTopics.splice(index, 1); else state.savedTopics.push(currentTopic.id);
      save();
      renderTopic(currentTopic);
      toast(index >= 0 ? '已取消收藏这个话题。' : '话题已收藏在当前浏览器。');
    },
    'show-evidence': () => { $('#thinking-evidence').hidden = !$('#thinking-evidence').hidden; },
    'fill-demo': fillDemoAnswer,
    'confirm-fill': (button) => {
      const round = Number(button.dataset.round);
      closeDialog();
      applyPresetAnswer(round);
    },
    next: () => nextRound(false),
    skip: () => nextRound(true),
    'edit-round': (button) => {
      state.session.round = Number(button.dataset.round);
      save();
      renderThinking();
    },
    'restart-rounds': () => {
      state.session.round = 0;
      save();
      renderThinking();
    },
    'create-work': createWork,
    'confirm-fruit': confirmArticle,
    'article-private': () => { location.hash = 'works'; },
    'article-publish': () => {
      const work = state.works.find((item) => item.id === state.draftArticle?.id);
      openPublishConfirmation(work);
    },
    'go-forest': () => { closeDialog(); location.hash = 'forest'; },
    'go-works': () => { closeDialog(); location.hash = 'works'; },
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
    'remove-root': (button) => {
      const root = state.adoptedRoots.find((item) => item.fruitId === button.dataset.id);
      if (!root) return;
      showDialog('移除这条采集根系？', `<p>“${esc(root.title)}”会从你的根系中移除。知友原果实和其他来源不会受到影响。</p><div class="dialog-actions"><button class="quiet-button" data-action="close-dialog">取消</button><button class="primary-button" data-action="confirm-remove-root" data-id="${esc(root.fruitId)}">确认移除</button></div>`);
    },
    'confirm-remove-root': (button) => {
      state.adoptedRoots = state.adoptedRoots.filter((root) => root.fruitId !== button.dataset.id);
      save();
      closeDialog();
      renderFavorites();
      syncNavCounts();
      toast('这条采集根系已移除。');
    },
    'remove-user-source': (button) => {
      const source = state.userSources.find((item) => item.id === button.dataset.id);
      if (!source) return;
      showDialog('移除这条收藏内容？', `<p>“${esc(source.title)}”将从你的资料中移除。已确认的文章不会因此被自动改写。</p><div class="dialog-actions"><button class="quiet-button" data-action="close-dialog">取消</button><button class="primary-button" data-action="confirm-remove-user-source" data-id="${esc(source.id)}">确认移除</button></div>`);
    },
    'confirm-remove-user-source': (button) => {
      state.userSources = state.userSources.filter((source) => source.id !== button.dataset.id);
      save();
      closeDialog();
      renderFavorites();
      syncNavCounts();
      toast('收藏内容已移除。');
    },
    'publish-work': (button) => {
      const work = state.works.find((item) => item.id === button.dataset.id);
      openPublishConfirmation(work);
    },
    'confirm-publish': (button) => {
      const work = state.works.find((item) => item.id === button.dataset.id);
      if (!work || work.status !== 'confirmed') return;
      if (!state.publishedWorkIds.includes(work.id)) state.publishedWorkIds.push(work.id);
      state.forestTopicId = work.topicId;
      save();
      closeDialog();
      location.hash = 'forest';
      toast('你的知识果实已进入同题森林（本机演示）。');
    },
    'unpublish-work': (button) => {
      const work = state.works.find((item) => item.id === button.dataset.id);
      if (!work) return;
      showDialog('取消在同题森林中的发布？', '<p>取消后，作品仍会私人保存在“我的作品”里，只是不再出现在同题森林。</p><div class="dialog-actions"><button class="quiet-button" data-action="close-dialog">保持发布</button><button class="primary-button" data-action="confirm-unpublish" data-id="' + esc(work.id) + '">确认取消发布</button></div>');
    },
    'confirm-unpublish': (button) => {
      state.publishedWorkIds = state.publishedWorkIds.filter((id) => id !== button.dataset.id);
      save();
      closeDialog();
      renderWorks();
      syncNavCounts();
      toast('作品已回到私人保存状态。');
    },
    'download-current': () => {
      const work = state.works.find((item) => item.topicId === state.session?.topicId);
      downloadWork(work);
    },
    'open-article': (button) => {
      const work = state.works.find((item) => item.id === button.dataset.id);
      if (!work) return;
      state.draftArticle = { ...work, body: work.body || composeArticle(topicById(work.topicId), work.answers), answers: [...work.answers], presetUsed: [...presetFlags(work)], sourceIds: [...work.sourceIds] };
      save();
      location.hash = 'article';
    },
    'make-article-from-work': (button) => {
      const work = state.works.find((item) => item.id === button.dataset.id);
      if (!work) return;
      state.session = { topicId: work.topicId, round: 3, reached: 3, answers: [...work.answers], presetUsed: [...presetFlags(work)], updatedAt: new Date().toISOString() };
      createWork();
    },
    'continue-work': (button) => {
      const work = state.works.find((item) => item.topicId === button.dataset.topic);
      state.session = {
        topicId: work.topicId,
        round: 3,
        reached: 3,
        answers: [...work.answers],
        presetUsed: [...presetFlags(work)],
        updatedAt: new Date().toISOString()
      };
      state.draftArticle = null;
      save();
      location.hash = 'thinking';
    },
    'download-work': (button) => downloadWork(state.works.find((work) => work.id === button.dataset.id)),
    'delete-work': (button) => {
      const work = state.works.find((item) => item.id === button.dataset.id);
      if (!work) return;
      showDialog('删除这张观点卡？', `<p>删除后无法在作品列表中找回。需要保留时，请先下载 Markdown。</p><div class="dialog-actions"><button class="quiet-button" data-action="close-dialog">取消</button><button class="primary-button" data-action="confirm-delete" data-id="${esc(work.id)}">确认删除</button></div>`);
    },
    'confirm-delete': (button) => {
      state.works = state.works.filter((work) => work.id !== button.dataset.id);
      state.publishedWorkIds = state.publishedWorkIds.filter((id) => id !== button.dataset.id);
      if (state.draftArticle?.id === button.dataset.id) state.draftArticle = null;
      save();
      closeDialog();
      renderWorks();
      toast('观点卡已删除。');
    }
  };

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (button) actions[button.dataset.action]?.(button);
  });

  document.addEventListener('submit', (event) => {
    if (event.target.id !== 'favorite-form') return;
    event.preventDefault();
    const title = $('#favorite-title').value.trim();
    const content = $('#favorite-content').value.trim();
    const rawUrl = $('#favorite-url').value.trim();
    const url = safeUrl(rawUrl);
    if (!title || !content) {
      $('#favorite-error').textContent = '请填写收藏标题和内容。';
      return;
    }
    if (rawUrl && !url) {
      $('#favorite-error').textContent = '请填写以 http 或 https 开头的来源链接。';
      return;
    }
    state.userSources.unshift({ id: `source-${Date.now()}`, title, content, url, createdAt: new Date().toISOString() });
    save();
    closeDialog();
    syncNavCounts();
    location.hash = 'favorites';
    toast('收藏内容已加入根系。');
  });

  document.addEventListener('input', (event) => {
    if (event.target.id === 'dissent-input' && $('#dissent-count')) {
      $('#dissent-count').textContent = `${event.target.value.length} / 500`;
      if ($('#dissent-error')) $('#dissent-error').textContent = '';
    }
  });

  $('#answer').addEventListener('input', () => {
    if (!state.session || state.session.round >= 3) return;
    state.session.answers[state.session.round] = $('#answer').value;
    const topic = topicById(state.session.topicId);
    presetFlags(state.session)[state.session.round] = $('#answer').value === topic.presetAnswers[state.session.round];
    state.session.updatedAt = new Date().toISOString();
    $('#answer-count').textContent = `${$('#answer').value.length} / 3000`;
    $('#answer-origin-note').textContent = presetFlags(state.session)[state.session.round] ? '当前是演示预设；修改任意内容后，会作为你的表达保留。' : '你的原话会被保留，不会被改写成别人的观点。';
    $('[data-action="fill-demo"] b').textContent = $('#answer').value.trim() ? '换成预设回答' : '一键填入预设回答';
    $('#answer-error').textContent = '';
    renderSummary();
    save();
  });

  $('#article-title').addEventListener('input', markArticleAsDraft);
  $('#article-body').addEventListener('input', markArticleAsDraft);

  $('#dialog').addEventListener('click', (event) => {
    if (event.target !== $('#dialog')) return;
    const rect = $('#dialog').getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
  });

  window.addEventListener('hashchange', route);
  renderHome();
  route();
})();
