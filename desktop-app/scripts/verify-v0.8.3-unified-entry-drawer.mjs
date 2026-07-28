import fs from "node:fs";
import assert from "node:assert/strict";
const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
for(const path of ["public/app/app.js","dist/app/app.js"]){
  const app=read(path);
  assert.ok(app.includes('class="identity-drawer-organized internal-entry"'));
  assert.ok(app.includes('identityDrawerSectionHTML("资料身份"'));
  assert.ok(app.includes('identityDrawerSectionHTML("条目特征"'));
  assert.ok(app.includes('identityDrawerSectionHTML("原文与来源"'));
  assert.ok(app.includes('identityDrawerSectionHTML("所属地块档案"'));
  assert.ok(app.includes("data-entry-owner-full"));
  assert.ok(app.includes("data-entry-owner-locate"));
  assert.ok(app.includes("data-entry-owner-topic"));
}
console.log("v0.8.3 内部条目详情统一校验通过：独立对象与地块内部资料使用相同的分区卡片和操作入口。");
