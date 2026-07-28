import fs from "node:fs";
import assert from "node:assert/strict";

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

for (const file of ["public/app/app.js", "dist/app/app.js"]) {
  const app = read(file);
  assert.ok(app.includes("function identityDrawerFieldHTML"));
  assert.ok(app.includes("function identityDrawerSectionHTML"));
  assert.ok(app.includes("function identityDrawerOrderedSectionsHTML"));
  assert.ok(app.includes('"所属地块档案","当前条目所在主格的统一档案"'));
  assert.ok(app.includes('"资料身份","对象或地块内部资料的归属"'));
  assert.ok(app.includes('"条目特征","本条目的有效内容"'));
  assert.ok(app.includes('"原文与注疏","对象原典资料"'));
  assert.ok(app.includes('"研究与定位","考证、地图推导与证据等级"'));
  assert.ok(app.includes('"Markdown 完整档案","第07—08节与来源文件"'));
  assert.ok(app.includes('data-drawer-full="${esc(key)}"'));
  assert.ok(app.includes('data-drawer-topic="${esc(topic.id)}"'));
  assert.ok(app.includes("function openFullDossierForTile(key,preferredId=null)"));
}

for (const file of ["public/app/styles.css", "dist/app/styles.css"]) {
  const css = read(file);
  assert.ok(css.includes("v0.8.2 · 对象详情整合地块档案"));
  assert.ok(css.includes(".identity-drawer-field-grid"));
  assert.ok(css.includes(".identity-drawer-summary"));
}

console.log("v0.8.7 对象详情整合校验通过：所有对象共用摘要、主题、所属地块档案、资料身份、条目特征顺序。");
