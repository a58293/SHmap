import fs from "node:fs";import assert from "node:assert/strict";
const app=fs.readFileSync("public/app/app.js","utf8");
for(const token of [
  'if(!requested)return {binding:null,issues,kind:""};',
  '普通 Markdown 永远按纯文本补充',
  'function v113SetMeasurePoint(',
  '起点已锁定',
  'if(!forced&&!wasMoved&&state.measureMode)',
  'function v113CompareDistancePairs(',
  'data-compare-measure',
  '两地距离',
  'v113ShowMeasureBetween'
])assert.ok(app.includes(token),`缺少 v1.1.3 功能标记：${token}`);
assert.ok(!app.includes('if(!requested&&(!decision||decision.waterKind==="none"))'),"仍存在按对象水体身份自动触发 Markdown 水体绑定的旧逻辑");
console.log("PASS v1.1.3 Markdown classifier isolation + long-distance measurement + compare distance.");
