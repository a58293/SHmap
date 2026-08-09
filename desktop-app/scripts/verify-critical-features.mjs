import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const app=read("public/app/app.js");
const html=read("index.html");
const boot=read("src/desktop-bootstrap.js");
const rust=read("src-tauri/src/lib.rs");

const markers=[
  ["地图缩放/平移","worldToScreen","screenToWorld","scheduleRender"],
  ["对象索引/地块","ensureObjectIndexes","buildCellMap","renderTiles"],
  ["博物志","openDossierWorkspace","dossierSubjectImageHTML","briefMuseumHTML"],
  ["十八经页面","openScriptureDirectory","scriptureNavigationHTML"],
  ["Markdown导入","parseNineSectionDocument","splitMarkdownImportDocuments"],
  ["图库","normalizedImageGallery","applyImageGallery","preparePatchImageAssets"],
  ["水系","drawWaterPaths","waterPathDossierObject","openWaterPathDossier"],
  ["范围/作用域","openRangeEditor","drawAreas","rangeEvidence"],
  ["关系网络","drawV029RelationLabel","relationHitAreas"],
  ["画笔","undoLastBrushAction","cancelBrushModeAndClearTraces"],
  ["对象角色资料语义","objectMapRole","roleMemberObjects","roleRelatedObjects"]
];
for(const [label,...tokens] of markers){
  for(const token of tokens)assert.ok(app.includes(token),`${label} 缺少 ${token}`);
}
assert.ok(html.includes('id="scriptureWorkspace"'),"经篇内容页 DOM 缺失");
assert.ok(html.includes('id="rangeWorkspace"'),"范围编辑页 DOM 缺失");
assert.ok(boot.includes("ensureGitHubAccess"),"GitHub 登录入口缺失");
assert.ok(boot.includes("bootstrap_workspace"),"SQLite 工作区启动缺失");
assert.ok(rust.includes("create_backup")&&rust.includes("restore_backup"),"原生备份/恢复命令缺失");
assert.ok(rust.includes("V272_DATA_MIGRATION_START")||rust.includes("merge_official_seed_with_current"),"V272 官方母表升级保护缺失");

console.log("PASS critical features: map / dossier / scripture / import / gallery / hydrology / range / relation / brush / backup.");
