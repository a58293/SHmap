import fs from "node:fs";
import assert from "node:assert/strict";

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
for(const path of ["public/app/app.js","dist/app/app.js"]){
  const app=read(path);
  assert.ok(app.includes("function prepareSelectablePatchBatch(items,source=\"local\")"),`${path} 缺少可选择批次准备`);
  assert.ok(app.includes("function rebuildPatchBatchSelection(base,selectedKeys)"),`${path} 缺少所选子集重新模拟`);
  assert.ok(app.includes('id="batchPatchSelectAllSafe"'),`${path} 缺少安全包全选框`);
  assert.ok(app.includes('data-batch-patch-key='),`${path} 缺少逐包勾选框`);
  assert.ok(app.includes('id="batchPatchSelectSafe"'),`${path} 缺少恢复安全推荐`);
  assert.ok(app.includes("renderPatchBatch(prepareSelectablePatchBatch(items,\"github\"))"),`${path} GitHub批次未接入选择器`);
  assert.ok(app.includes("renderPatchBatch(prepareSelectablePatchBatch(items,\"local\"))"),`${path} 本地批次未接入选择器`);
  assert.ok(app.includes("session.blocked||!session.actionable.length?'disabled':''"),`${path} 无效文件保护缺失`);
  assert.ok(app.includes('data-conflict-resolution='),`${path} 缺少逐冲突手动选择`);
}
for(const path of ["public/app/styles.css","dist/app/styles.css"]){
  const css=read(path);
  assert.ok(css.includes("v0.9.7 · 批量更改包逐包选择与重新模拟"),`${path} 缺少v0.9.7界面标记`);
  assert.ok(css.includes(".batch-selection-tools"),`${path} 缺少选择工具栏样式`);
  assert.ok(css.includes(".batch-patch-check"),`${path} 缺少逐包选择样式`);
  assert.ok(css.includes(".patch-selection-safe"),`${path} 缺少安全排除提示`);
}
console.log("v0.9.7 批量更改包选择专项校验通过。");
