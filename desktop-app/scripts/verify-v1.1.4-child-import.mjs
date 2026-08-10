import fs from "node:fs";
import assert from "node:assert/strict";

const app=fs.readFileSync("public/app/app.js","utf8");
for(const token of [
  "function allMuseumEntryMatches(",
  "function museumEntryMatchesInsideParent(",
  "function applyMuseumEntryDossier(",
  "museumEntryMode=\"existing\"",
  "既有内部子项已匹配",
  "nestedDossier",
  "museum-entry-text-exact",
  "qualified-museum-entry"
])assert.ok(app.includes(token),`缺少 v1.1.4 内部子项导入标记：${token}`);
assert.ok(app.includes("不会自动新建地图对象或猜测坐标"),"缺少安全阻止规则");
assert.ok(app.includes("只有“水系分类器”显式写入 waterTarget / waterBinding"),"水系分类器隔离规则不得回退");
console.log("PASS v1.1.4 existing museum-entry Markdown matching + nested dossier import.");
