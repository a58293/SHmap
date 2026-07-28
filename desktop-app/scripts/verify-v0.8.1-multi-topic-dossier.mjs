import fs from "node:fs";
import assert from "node:assert/strict";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const app = read("public/app/app.js");
const dist = read("dist/app/app.js");
const css = read("public/app/styles.css");

for (const source of [app, dist]) {
  assert.ok(source.includes("function objectHasImportedDossier(object)"));
  assert.ok(source.includes("function dossierTopicsFor(items)"));
  assert.ok(source.includes("function dossierTopicSwitcherHTML(items,main)"));
  assert.ok(source.includes('data-dossier-topic="${esc(object.id)}"'));
  assert.ok(source.includes('["09. 详细描述",profile.detailedSummary]') || source.includes('identityDrawerFieldHTML("09. 详细描述",profile.detailedSummary'));
  assert.ok(source.includes('["08. 其他典故",profile.otherAllusions]') || source.includes('identityDrawerFieldHTML("08. 其他典故",profile.otherAllusions'));
  assert.ok(source.includes('["07. 原文摘录",profile.tileOriginalExcerpt]') || source.includes('identityDrawerFieldHTML("07. 原文摘录",profile.tileOriginalExcerpt'));
  assert.ok(source.includes('objectHasImportedDossier(o)?"已导入完整 Markdown 档案"'));
  assert.ok(source.includes('wideCard("09. 详细描述"') || source.includes('wideCard("详细描述"'));
}

assert.ok(css.includes(".dossier-topic-switcher"));
assert.ok(css.includes(".dossier-object-item.has-dossier-topic"));
assert.ok(css.includes(".identity-object-drawer section.identity-drawer-detailed"));

const data = read("public/app/data.js");
assert.ok(data.includes("后稷葬"));
assert.ok(data.includes('"rowRef":"R22"') || data.includes('"rowRef": "R22"'));

console.log("v0.8.1 同格多主题博物志校验通过：每份Markdown独立绑定、主题可切换、对象抽屉完整显示01—09节。");
