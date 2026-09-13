const task = await taskSpace(10);
const page = task.page("p1");

await page.cdp("Storage.clearDataForOrigin", {
  origin: "http://127.0.0.1:4201",
  storageTypes: "local_storage",
});
await page.cdp("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
// Leave the current document so its in-memory tree store cannot repopulate the
// just-cleared origin before the clean-flow check begins.
await page.goto("about:blank");
await page.goto("http://127.0.0.1:4201/#home");

const nav = await page.evaluate(() =>
  [...document.querySelectorAll(".header nav a")].map((link) => link.textContent.trim()),
);
if (JSON.stringify(nav) !== JSON.stringify(["我的知树", "历史记录", "同题树林"])) {
  throw new Error(`Navigation mismatch: ${JSON.stringify(nav)}`);
}

await page.click('.header a[href="#garden"]');
await page.waitForSelector('[data-garden-action="seed"]');
await page.click('[data-garden-action="seed"]');
await page.click('[data-garden-action="demo-import"]');
await page.waitForFunction(
  () => document.querySelector("#garden-world").dataset.stage === "roots",
);
await page.click('.g7-hit[data-garden-action="root"][data-index="0"]');
await page.fill(
  "#garden-viewpoint",
  "AI 可以缩短查找资料的时间，但理解、核验和最后的判断必须由自己完成。",
);
await page.click('#garden-viewpoint-form button[type="submit"]');
await page.waitForFunction(
  () => document.querySelector("#garden-world").dataset.stage === "branches",
);

const answers = [
  "我会先自己列出思路，再向 AI 询问具体卡点。合上答案重新完成一次，才能知道自己是不是真的理解。",
  "效率很重要，但拿到答案不等于学会。如果不能复述推理、核对来源并迁移到新问题，理解仍然没有完成。",
  "遇到完全陌生或高风险的问题，我会更早寻求帮助；不过重要结论和依据仍需要自己核验。",
];
for (let index = 0; index < 3; index += 1) {
  await page.click(
    `.g7-hit[data-garden-action="branch"][data-index="${index}"]`,
  );
  await page.fill("#garden-answer", answers[index]);
  await page.click('#garden-dialogue-form button[type="submit"]');
  await page.waitForFunction(
    (count) =>
      document.querySelectorAll('.g7-hit[data-garden-action="leaf"]').length === count,
    index + 1,
  );
}

const fruitBeforeArticle = await page.evaluate(
  () => document.querySelectorAll('[data-garden-action="fruit"]').length,
);
if (fruitBeforeArticle !== 0) throw new Error("Fruit appeared before article confirmation");

await page.click('.g7-hit[data-garden-action="leaf"][data-index="0"]');
await page.click('[data-garden-action="new-article"]');
await page.fill("#garden-article-title", "AI 可以帮我学习，但不能替我理解");
await page.fill(
  "#garden-article-body",
  `我的观点\n\nAI 可以缩短查找资料的时间，但理解、核验和最后的判断必须由自己完成。\n\n一次学习经历\n\n${answers[0]}\n\n回应与边界\n\n${answers[1]}\n\n${answers[2]}`,
);
await page.click('#garden-article-form button[type="submit"]');
await page.waitForSelector('.fruit-hit[data-garden-action="fruit"]');
await page.click('.fruit-hit[data-garden-action="fruit"]');
await page.selectOption("#garden-forest-topic", "collections");
await page.click('#garden-publish-form button[type="submit"]');
await page.waitForSelector('.fruit-hit[data-garden-action="harvest"]');
if ((await page.url()) !== "http://127.0.0.1:4201/#garden") {
  throw new Error("Publishing left the tree");
}
await page.screenshot({
  path: "/Users/SabreZSY/Desktop/AI项目/知树-黑客松/zhishu-topics-demo/qa/v8-tree-published.png",
});

await page.click('.g7-hit[data-garden-action="leaf"][data-index="0"]');
await page.click('[data-garden-action="new-article"]');
await page.fill("#garden-article-title", "第二篇草稿：如何核验 AI 的回答");
await page.fill(
  "#garden-article-body",
  "这是未完成的第二篇草稿；切换到别的树后仍应保留。",
);
await page.click('#garden-dialog button[aria-label="关闭"]');
await page.click('.garden-main-nav a[href="#history"]');

const savedWithinDemo = await page.evaluate(() => window.ZhishuGarden.getTrees());
if (
  savedWithinDemo.length !== 1 ||
  savedWithinDemo[0].fruits.length !== 1 ||
  !savedWithinDemo[0].fruits[0].published ||
  !savedWithinDemo[0].article.body.startsWith("这是未完成")
) {
  throw new Error("Current demo history was not retained");
}

await page.reload();
await page.waitForURL("http://127.0.0.1:4201/#home");
const resetTrees = await page.evaluate(() => window.ZhishuGarden.getTrees());
await page.click('.header a[href="#garden"]');
await page.waitForSelector('[data-garden-action="seed"]');
const resetStage = await page.evaluate(
  () => document.querySelector("#garden-world").dataset.stage,
);
if (resetTrees.length !== 0 || resetStage !== "seed") {
  throw new Error(`Demo reload did not reset data: ${JSON.stringify(resetTrees)}`);
}
await page.click('.garden-main-nav a[href="#history"]');
await page.waitForSelector("#view-history:not([hidden])");
await page.screenshot({
  path: "/Users/SabreZSY/Desktop/AI项目/知树-黑客松/zhishu-topics-demo/qa/v8-history-clean-flow.png",
});

await page.click('.history-heading [data-action="new-tree"]');
await page.click('[data-garden-action="seed"]');
await page.click('[data-garden-action="demo-import"]');
await page.click('.garden-main-nav a[href="#history"]');
const treeCount = await page.evaluate(() => window.ZhishuGarden.getTrees().length);
if (treeCount !== 1) throw new Error(`Clean demo history failed: ${treeCount}`);

await page.click('[data-history-tab="sources"]');
const sourceCount = await page.evaluate(
  () => document.querySelectorAll(".history-source-card").length,
);
if (sourceCount < 3) throw new Error("Source history missing");

await page.goto("http://127.0.0.1:4201/#works");
await page.waitForURL("http://127.0.0.1:4201/#home");
await page.goto("http://127.0.0.1:4201/#thinking");
await page.waitForURL("http://127.0.0.1:4201/#home");
await page.click('.header a[href="#garden"]');
await page.waitForSelector('[data-garden-action="seed"]');
await page.cdp("Emulation.setDeviceMetricsOverride", {
  width: 1545,
  height: 710,
  deviceScaleFactor: 1,
  mobile: false,
});
await page.waitForFunction(
  () => Math.round(document.querySelector("#garden-world").getBoundingClientRect().width) === 1545,
);

const frame = await page.evaluate(() => {
  const rect = document.querySelector("#garden-world").getBoundingClientRect();
  const topbar = document.querySelector(".g7 .topbar").getBoundingClientRect();
  const footer = document.querySelector(".g7 .footer").getBoundingClientRect();
  return {
    viewport: [innerWidth, innerHeight],
    rect: [rect.x, rect.y, rect.right, rect.bottom],
    topbar: [topbar.x, topbar.right],
    footer: [footer.x, footer.right],
    backgrounds: [
      getComputedStyle(document.querySelector("#view-garden")).backgroundColor,
      getComputedStyle(document.querySelector("#garden-world")).backgroundColor,
    ],
    scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
  };
});
if (
  frame.scroll[0] !== 1545 ||
  frame.scroll[1] !== 710 ||
  frame.rect[0] !== 0 ||
  frame.rect[2] !== 1545 ||
  frame.topbar[0] !== 0 ||
  frame.topbar[1] !== 1545 ||
  frame.footer[0] !== 0 ||
  frame.footer[1] !== 1545 ||
  frame.backgrounds.some((color) => color !== "rgb(255, 255, 255)")
) {
  throw new Error(`Garden overflowed the viewport: ${JSON.stringify(frame)}`);
}

const result = {
  passed: true,
  checkedAt: new Date().toISOString(),
  checks: [
    "导航仅保留我的知树、历史记录、同题树林",
    "全流程只通过种子、根系、枝干、树叶、果实推进",
    "文章确认前不结果",
    "发布后留在原树并显示已采摘标记",
    "树叶可继续生成第二篇草稿",
    "本次演示内保留文章草稿和已发布果实",
    "刷新后清空树、收藏、草稿和发布状态",
    "无论刷新前停在哪一页，都从首页重新开始",
    "收藏来源进入历史记录",
    "直接打开任意旧地址也回到全新首页",
    "1545 × 710 宽屏下白色画布、导航和底部状态栏全部通栏",
  ],
  treeCount,
  sourceCount,
  frame,
};
const fs = await import("node:fs/promises");
await fs.writeFile(
  "/Users/SabreZSY/Desktop/AI项目/知树-黑客松/zhishu-topics-demo/qa/v8-verification.json",
  JSON.stringify(result, null, 2),
);
console.log(result);
