import fs from "node:fs";
import assert from "node:assert/strict";
const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
for(const path of ["public/app/app.js","dist/app/app.js"]){
  const app=read(path);
  for(const marker of ["V104_SYNC_METADATA_KEYS","v104IsMetadataPath","本机地块现有内容","更改包拟写入内容","data-conflict-field-key","batchConflictSelectAll","batchConflictUseLocal","batchConflictUseRemote","bulkResolve=choice"]){
    assert.ok(app.includes(marker),`${path} 缺少v1.0.4冲突内容与多选标记：${marker}`);
  }
  assert.ok(app.includes('["updatedAt","createdAt","importedAt"]'),`${path} 未忽略时间类同步元数据`);
}
for(const path of ["public/app/styles.css","dist/app/styles.css"]){
  const css=read(path);
  for(const marker of [".batch-conflict-bulk",".batch-conflict-check input","grid-template-columns:auto minmax(0,1fr) 245px"]){
    assert.ok(css.includes(marker),`${path} 缺少v1.0.4冲突多选样式：${marker}`);
  }
}
console.log("v1.0.4 地块内容冲突预览与多选处理校验通过。");
