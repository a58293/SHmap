import fs from "node:fs";
import assert from "node:assert/strict";
const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
for(const path of ["public/app/app.js","dist/app/app.js"]){
  const app=read(path);
  assert.ok(app.includes("function identityDrawerFieldHTML"));
  assert.ok(app.includes("function identityDrawerSectionHTML"));
  assert.ok(app.includes('"地块身份与位置","图二中的地块档案摘要"'));
  assert.ok(app.includes('"对象特征","本对象在所属地块中的角色"'));
  assert.ok(app.includes('"原文与注疏","对象原典资料"'));
  assert.ok(app.includes('"研究与定位","考证、地图推导与证据等级"'));
  assert.ok(app.includes('"Markdown 完整档案","第07—09节与来源文件"'));
  assert.ok(app.includes('data-drawer-full="${esc(key)}"'));
  assert.ok(app.includes('data-drawer-topic="${esc(topic.id)}"'));
  assert.ok(app.includes("function openFullDossierForTile(key,preferredId=null)"));
}
for(const path of ["public/app/styles.css","dist/app/styles.css"]){
  const css=read(path);
  assert.ok(css.includes("v0.8.2 · 对象详情整合地块档案"));
  assert.ok(css.includes(".identity-drawer-field-grid"));
  assert.ok(css.includes(".identity-drawer-summary"));
}
console.log("v0.8.2 对象详情整合校验通过：图二档案信息已按摘要、地块、对象、原典、研究和Markdown分区加入图一抽屉。");
