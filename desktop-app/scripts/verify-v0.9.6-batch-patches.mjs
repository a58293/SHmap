import fs from "node:fs";
import assert from "node:assert/strict";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

for (const path of ["public/app/app.js", "dist/app/app.js"]) {
  const app = read(path);
  assert.ok(app.includes("function simulatePatchPackage(pkg,baseSnapshot=null)"), `${path} 单包模拟器不能接受连续批次快照`);
  assert.ok(app.includes("function simulatePatchBatch(items,source=\"local\")"), `${path} 缺少批量连续模拟器`);
  assert.ok(app.includes("patchBatchTime(a)-patchBatchTime(b)"), `${path} 未按生成时间从旧到新排序`);
  assert.ok(app.includes("function appliedPatchByContentHash(hash)"), `${path} 缺少跨来源内容指纹去重`);
  assert.ok(app.includes("status:\"duplicate\""), `${path} 缺少批内重复包识别`);
  assert.ok(app.includes("const blocked=packages.some(item=>item.status===\"error\")"), `${path} 缺少冲突整批阻止`);
  assert.ok(app.includes("function hydratePortablePatchAssets(pkg)"), `${path} 本地便携更改包图片未恢复`);
  assert.ok(app.includes("async function localPatchBatchFromFiles(fileList)"), `${path} 缺少本地多选入口`);
  assert.ok(app.includes("async function githubPatchBatch()"), `${path} 缺少 GitHub pending 批量入口`);
  assert.ok(app.includes("async function applyPatchBatch()"), `${path} 缺少批量原子应用`);
  assert.ok(app.includes("批量应用${session.actionable.length}份更改包前备份"), `${path} 桌面应用前未自动备份`);
  assert.ok(app.includes("state.objects=before.objects"), `${path} 批量保存失败时没有内存回退`);
  assert.ok(app.includes("一次最多选择100份 .shjpatch"), `${path} 缺少本地批量数量上限`);
  assert.ok(app.includes("一次选择的文件合计不能超过100MB"), `${path} 缺少本地批量体积上限`);
  assert.ok(app.includes('batchPatch:"atomic-local-and-github-oldest-first"'), `${path} 运行信息未声明批量更改包能力`);
}

const html = read("index.html");
assert.ok(html.includes('id="batchPatchBtn"'), "缺少批量更改包主入口");
assert.ok(html.includes('id="batchPatchInput"') && html.includes("multiple"), "缺少本地 .shjpatch 多选输入");

for (const path of ["public/app/styles.css", "dist/app/styles.css"]) {
  const css = read(path);
  assert.ok(css.includes("v0.9.6 · 批量山海经地图更改包"), `${path} 缺少批量更改包界面样式`);
  assert.ok(css.includes(".batch-patch-rules"), `${path} 缺少安全设置说明布局`);
  assert.ok(css.includes(".pending-batch-actions"), `${path} 缺少 GitHub 批量操作布局`);
}

console.log("v0.9.6 批量更改包专项校验通过：本地/GitHub、旧到新、去重、冲突整批阻止、应用前备份与失败回退均已接入。");
