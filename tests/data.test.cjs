const test = require('node:test');
const assert = require('node:assert/strict');

global.window = {};
require('../dist/data.js');
const data = global.window.ZHISHU_DATA;

test('首页恰好有 4 个话题，01 主推且 04 排在第二位', () => {
  assert.equal(data.topics.length, 4);
  assert.equal(data.topics[0].id, 'ai-learning');
  assert.equal(data.topics[0].recommended, '主推话题');
  assert.equal(data.topics[1].id, 'collections');
});

test('每个话题包含 3 条真实来源和 3 个思考问题', () => {
  for (const topic of data.topics) {
    assert.equal(topic.sources.length, 3, topic.id);
    assert.equal(topic.prompts.length, 3, topic.id);
    assert.equal(topic.sides.length, 2, topic.id);
  }
});

test('12 条来源 ID 与链接唯一，链接都指向知乎 HTTPS 页面', () => {
  const sources = data.topics.flatMap((topic) => topic.sources);
  assert.equal(sources.length, 12);
  assert.equal(new Set(sources.map((source) => source.id)).size, 12);
  assert.equal(new Set(sources.map((source) => source.url)).size, 12);
  for (const source of sources) {
    const url = new URL(source.url);
    assert.equal(url.protocol, 'https:');
    assert.ok(url.hostname === 'www.zhihu.com' || url.hostname === 'zhuanlan.zhihu.com');
    assert.ok(source.summary.length >= 25);
  }
});

test('每个话题都明确写出分歧与用户可补充内容', () => {
  for (const topic of data.topics) {
    assert.ok(topic.debate.length >= 20);
    assert.ok(topic.contribution.length >= 20);
    assert.ok(topic.reason.length >= 30);
  }
});

