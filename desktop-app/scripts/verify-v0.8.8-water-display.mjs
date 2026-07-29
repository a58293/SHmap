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
    "function setupWaterConversionPhaseOne()",
    "waterConversionAudit:saved?.waterConversionAudit!==false",
    "Array.isArray(path.objectIds)&&path.objectIds.includes(object.id)",
    'displayMode:"water-area"',
    'displayMode:"water-point"',
    'candidateCircle:true',
  ]) assert.ok(app.includes(marker), `${path} 缺少水体转换标记：${marker}`);
  assert.ok(app.includes('window.__SHJ_APP_RUNTIME_INFO__={version:"0.8.8"'), `${path} 运行版本未同步`);
}
for (const path of ["public/app/styles.css", "dist/app/styles.css"]) {
  assert.ok(read(path).includes("#waterConversionAuditToggle"), `${path} 缺少核验模式样式`);
}
const data = read("public/app/data.js");
assert.ok(data.includes("window.SHJ_WATER_PATHS="), "data.js 水系数据缺失");
assert.ok(!data.includes("waterConversionAudit"), "不得将水体转换状态写入 data.js");
console.log("v0.8.8 特殊水体第一阶段专项检查通过。");
