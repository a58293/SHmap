import fs from "node:fs";
import assert from "node:assert/strict";
const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
for(const path of ["public/app/app.js","dist/app/app.js"]){
  const app=read(path);
  for(const marker of ["function v101ReadablePath","function v101PreviewValue","function v101ConflictResolutionKey","本机地块现有内容","更改包拟写入内容","逐字段处理冲突","conflict-value-grid"])assert.ok(app.includes(marker),`${path} 缺少冲突预览标记：${marker}`);
}
for(const path of ["public/app/styles.css","dist/app/styles.css"]){const css=read(path);for(const marker of [".conflict-value-grid",".conflict-value.local",".conflict-value.remote",".batch-conflict-item-head"])assert.ok(css.includes(marker),`${path} 缺少样式：${marker}`)}
console.log("v1.0.1 冲突内容左右对照与逐字段选择校验通过。");
