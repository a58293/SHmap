import fs from "node:fs";
import assert from "node:assert/strict";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const app = read("public/app/app.js");
const dist = read("dist/app/app.js");
const css = read("public/app/styles.css");
const html = read("index.html");
const version = JSON.parse(read("VERSION.json"));

for (const source of [app, dist]) {
  assert.ok(source.includes("function objectHasImportedDossier(object)"));
  assert.ok(source.includes("function dossierTopicsFor(items)"));
  assert.ok(source.includes("function dossierTopicSwitcherHTML(items,main)"));
  assert.ok(source.includes("const objects=items||[],topicCount=dossierTopicsFor(objects).length"));
  assert.ok(source.includes("没有 Markdown 的对象也可点击查看基础资料"));
  assert.ok(source.includes("base-object-topic"));
  assert.ok(source.includes('data-dossier-topic="${esc(object.id)}"'));
  assert.ok(
    source.includes('["09. 详细描述",profile.detailedSummary]') ||
    source.includes('identityDrawerFieldHTML("09. 详细描述",profile.detailedSummary')
  );
  assert.ok(
    source.includes('["08. 其他典故",profile.otherAllusions]') ||
    source.includes('identityDrawerFieldHTML("08. 其他典故",profile.otherAllusions')
  );
  assert.ok(
    source.includes('["07. 原文摘录",profile.tileOriginalExcerpt]') ||
    source.includes('identityDrawerFieldHTML("07. 原文摘录",profile.tileOriginalExcerpt')
  );
  assert.ok(source.includes('objectHasImportedDossier(o)?"已导入完整 Markdown 档案"'));
  assert.ok(source.includes('wideCard("09. 详细描述"') || source.includes('wideCard("详细描述"'));
}

assert.ok(css.includes(".dossier-topic-switcher"));
assert.ok(css.includes(".dossier-topic-switcher button.base-object-topic"));
assert.ok(css.includes(".dossier-object-item.has-dossier-topic"));
assert.ok(css.includes(".identity-object-drawer section.identity-drawer-detailed"));

/*
 * 正式地图正文已迁移至 Private SHmap-Data。
 * 旧版这里读取 public/app/data.js，只是为了确认“后稷葬 / R22”存在。
 * 该检查属于数据内容验收，不属于“同格多主题博物志”的 UI/交互验收，
 * 且公开程序仓库不应再持有正式地图正文。
 *
 * 因此这里改为：
 * 1. 校验公开版本元数据仍记录既有对象总量；
 * 2. 明确断言 data.js 不得恢复；
 * 3. 明确断言 index.html 不得重新引用 data.js。
 */
assert.equal(version.object_count, 617, "公开 VERSION 元数据中的对象总量应保持617");
assert.ok(
  !fs.existsSync(new URL("../public/app/data.js", import.meta.url)),
  "正式地图已私有化，public/app/data.js 不得恢复"
);
assert.ok(
  !/app\/data\.js/i.test(html),
  "index.html 不得重新引用 /app/data.js"
);

console.log("v0.8.1 同格多主题博物志校验通过：UI/交互继续校验，正式地图内容保持在 Private SHmap-Data。");
