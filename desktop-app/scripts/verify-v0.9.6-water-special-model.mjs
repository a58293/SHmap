import fs from "node:fs";
import assert from "node:assert/strict";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
for (const path of ["public/app/app.js", "dist/app/app.js"]) {
  const app = read(path);
  for (const marker of [
    "function waterDisplayDecision(object)",
    "function waterAreaIsConfirmed(object)",
    "function candidateWaterCircle(object)",
    "function hideConvertedWaterTile(object)",
    "function convertedWaterAreaAtClient(clientX,clientY)",
    "function waterPathRenderTier(path",
    "function resolveDossierWaterBinding(targetInfo)",
    "function waterPathDossierObject(path)",
    "function openWaterPathDossier(pathId=state.selectedWaterPathId)",
    "function openWaterPathTooltipTarget(pathId=els.tooltip?.dataset?.waterPath)",
    "function setupWaterConversionPhaseOne()",
    "waterConversionAudit:Number(saved?.uiSchemaVersion)>=53?!!saved?.waterConversionAudit:false",
    "Array.isArray(path.objectIds)&&path.objectIds.includes(object.id)",
    'const WATER_BINDING_SCHEMA="shmap-water-binding-v1"',
    "waterBinding:waterResolution.binding",
    "waterBinding:next.waterBinding||old.waterBinding||null",
    'data-water-dossier="${esc(path.id)}"',
    'els.tooltip.dataset.waterPath=path.id',
    '单击直接打开水系博物志',
    "tileRenderObjects(tileVisibleObjects())",
    'displayMode:"water-area"',
    'displayMode:"water-point"',
    'candidateCircle:true',
  ]) assert.ok(app.includes(marker), `${path} 缺少水体转换标记：${marker}`);
  assert.ok(app.includes('window.__SHJ_APP_RUNTIME_INFO__={version:"1.0.0"'), `${path} 运行版本未同步`);
  assert.ok(app.includes('waterDisplay:"special-model-audited-dossier-and-render-tiers"'), `${path} 缺少水系特殊模型运行标记`);
}
for (const path of ["public/app/styles.css", "dist/app/styles.css"]) {
  assert.ok(read(path).includes("#waterConversionAuditToggle"), `${path} 缺少核验模式样式`);
  assert.ok(read(path).includes(".water-path-card footer button.primary"), `${path} 缺少水系博物志入口样式`);
  assert.ok(read(path).includes(".map-tooltip.water-path-tooltip:hover"), `${path} 缺少水系提示窗可点击样式`);
}
const data = read("public/app/data.js");
assert.ok(data.includes("window.SHJ_WATER_PATHS="), "data.js 水系数据缺失");
assert.ok(!data.includes("waterConversionAudit"), "不得将水体转换状态写入 data.js");
assert.ok(!data.includes("shmap-water-binding-v1"), "不得把水系资料绑定写入基础 data.js");
console.log("v0.9.6 水系特殊模型专项检查通过。");
