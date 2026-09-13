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

  let state = { savedTopics: [], session: null, works: [] };
  let currentTopic = DATA.topics[0];
  let currentView = '';
  let toastTimer;

  try {
    const restored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (restored && Array.isArray(restored.savedTopics) && Array.isArray(restored.works)) {
      state = restored;
    }
  } catch (_) {
    // The demo still works in memory when browser storage is unavailable.
  }

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

  function renderHome() {
    $('#topic-grid').innerHTML = DATA.topics.map((topic, index) => {
      const cardClass = topic.id === 'ai-learning' ? 'primary' : topic.id === 'collections' ? 'origin' : '';
      const sizeClass = topic.featured ? 'featured' : 'compact';
      return `<a class="topic-card ${sizeClass} ${cardClass}" href="#topic/${esc(topic.id)}">
        <div class="topic-top"><span class="topic-number">${esc(topic.order)}</span><span class="topic-badge">${esc(topic.recommended)}</span></div>
        <h2>${esc(topic.title)}</h2>
        <p class="topic-reason">${esc(topic.reason)}</p>
        <div class="tags">${topic.tags.map((tag) => `<span>${esc(tag)}</span>`).join('')}</div>
        <div class="topic-bottom"><span>基于 ${topic.sources.length} 条知乎公开内容</span><b>${index < 2 ? '查看观点分歧' : '看看值不值得写'} →</b></div>
      </a>`;
    }).join('');
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

  function createWork() {
    const session = state.session;
    if (!session) return;
    const topic = topicById(session.topicId);
    if (!session.answers.some((answer) => answer.trim())) {
      toast('至少写下一点自己的想法，才会形成观点卡。');
      return;
    }
    const existing = state.works.find((work) => work.topicId === topic.id);
    const work = {
      id: existing?.id || `work-${Date.now()}`,
      topicId: topic.id,
      title: topic.title,
      answers: [...session.answers],
      presetUsed: [...presetFlags(session)],
      sourceIds: topic.sources.map((source) => source.id),
      updatedAt: new Date().toISOString()
    };
    if (existing) Object.assign(existing, work); else state.works.unshift(work);
    save();
    const presetNote = presetFlags(session).some(Boolean) ? '<br>其中标有“演示预设”的段落只用于展示，不代表你的真实经历。' : '';
    showDialog('一张属于你的观点卡，长出来了。', `<img src="assets/tree-full.png" alt="枝叶舒展的知树" style="display:block;width:220px;height:190px;object-fit:contain;margin:0 auto"><p style="text-align:center">它保留了你的三轮表达和当时参考的知乎来源。<br>不会自动发布，也不会替你补写没有说过的内容。${presetNote}</p><div class="dialog-actions"><button class="quiet-button" data-action="download-current">下载 Markdown</button><button class="primary-button" data-action="go-works">看看我的作品 →</button></div>`);
  }

  function renderWorks() {
    if (!state.works.length) {
      $('#work-list').innerHTML = `<div class="empty"><img src="assets/tree-bare.png" alt="等待长成观点的知树"><h1>这里还没有你的观点。</h1><p>从真实知乎内容里的一个分歧开始，写下你的经历、回应和边界。</p><a href="#home" class="primary-button">去选一个话题 →</a></div>`;
      return;
    }
    $('#work-list').innerHTML = state.works.map((work) => {
      const topic = topicById(work.topicId);
      return `<article class="work-card">
        <div class="work-card-top"><span class="${presetFlags(work).some(Boolean) ? 'demo-work' : ''}">观点卡 · ${presetFlags(work).some(Boolean) ? '含演示预设' : esc(topic.short)}</span><time>${new Date(work.updatedAt).toLocaleDateString('zh-CN')}</time></div>
        <h2>${esc(work.title)}</h2>
        ${answerLabels.map((label, index) => `<div class="work-answer"><b>${esc(label)}</b><p>${esc(work.answers[index].trim() || '尚未展开')}</p></div>`).join('')}
        <div class="work-sources">保留 ${topic.sources.length} 条知乎来源</div>
        <div class="work-actions"><button data-action="continue-work" data-topic="${esc(topic.id)}">继续修改 ↗</button><button data-action="download-work" data-id="${esc(work.id)}">下载</button><button data-action="delete-work" data-id="${esc(work.id)}">删除</button></div>
      </article>`;
    }).join('');
  }

  function markdown(work) {
    const topic = topicById(work.topicId);
    const flags = presetFlags(work);
    const answers = answerLabels.map((label, index) => `## ${label}${flags[index] ? '（演示预设）' : ''}\n\n${work.answers[index].trim() || '（尚未展开）'}`).join('\n\n');
    const sources = topic.sources.map((source, index) => `### [${index + 1}] ${source.title}\n\n- 作者：${source.author}\n- 类型：${source.type}\n- 知树整理：${source.summary}\n- 原文：${source.url}`).join('\n\n');
    return `# ${work.title}\n\n> 由“知树 · 知乎真实内容话题 DEMO”保存。未标记“演示预设”的段落为用户输入；演示预设仅用于展示，不代表用户真实经历。材料说明基于 2026-09-13 获取的知乎公开内容摘要，不代表知乎或原作者结论，请回原文核对。\n\n${answers}\n\n## 这次参考的知乎内容\n\n${sources}\n`;
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
    if (!['home', 'topic', 'favorites', 'thinking', 'works'].includes(view)) view = 'home';
    $$('.view').forEach((section) => { section.hidden = section.id !== `view-${view}`; });
    $$('[data-route]').forEach((link) => {
      const active = link.dataset.route === view || (view === 'topic' && link.dataset.route === 'home');
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    if (view === 'topic') renderTopic(currentTopic);
    if (view === 'favorites') renderFavorites();
    if (view === 'thinking') renderThinking();
    if (view === 'works') renderWorks();
    const titles = { home: '知树 · 从真实收藏里发现值得写的问题', topic: `${currentTopic.short} · 知树`, favorites: '示例收藏 · 知树', thinking: '一起想清楚 · 知树', works: '我的作品 · 知树' };
    document.title = titles[view];
    if (currentView !== view) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (currentView) $('#main').focus({ preventScroll: true });
    }
    currentView = view;
  }

  const actions = {
    about: () => showDialog('这版 DEMO，真实在哪里？', `<p>4 个话题不是凭空编出来的。我们通过知乎开放平台检索公开回答和文章，再从材料中找出分歧，整理成首页话题卡。</p><ul><li>共使用 12 条知乎公开内容，每条都保留原文链接。</li><li>页面只展示摘要后的观点，不把搜索摘要冒充完整原文。</li><li>“大家在争什么”是知树的整理，不代表知乎或原作者的统一结论。</li><li>你的回答只保存在当前浏览器，不上传、不自动发布。</li><li>这仍是静态演示：数据获取于 ${DATA.fetchedAt}，页面打开时不会再次请求知乎。</li></ul><div class="dialog-actions"><button class="primary-button" data-action="close-dialog">知道了</button></div>`),
    how: () => showDialog('知树怎么找到一个值得写的问题？', `<p>它先不问“哪篇最正确”，而是做三件事：</p><ul><li>把讨论同一件事的收藏放在一起。</li><li>找出结论、理由或适用条件上的不同。</li><li>检查材料里缺少什么个人经验，再把它变成一个能回答的具体问题。</li></ul><div class="dialog-note">比如实习话题里，分歧不是简单的“去或不去”，而是实习应该多早开始、要不要追求数量，以及专业学习和校园体验值不值得被挤压。</div><div class="dialog-actions"><button class="primary-button" data-action="close-dialog">继续看话题</button></div>`),
    'close-dialog': closeDialog,
    'start-thinking': () => startThinking(currentTopic),
    'confirm-new': (button) => {
      state.session = freshSession(topicById(button.dataset.topic));
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
    'go-works': () => { closeDialog(); location.hash = 'works'; },
    'download-current': () => {
      const work = state.works.find((item) => item.topicId === state.session?.topicId);
      downloadWork(work);
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

  $('#dialog').addEventListener('click', (event) => {
    if (event.target !== $('#dialog')) return;
    const rect = $('#dialog').getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
  });

  window.addEventListener('hashchange', route);
  renderHome();
  route();
})();
