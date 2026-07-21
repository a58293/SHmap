import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const pkg = JSON.parse(read("package.json"));
const tauri = JSON.parse(read("src-tauri/tauri.conf.json"));
const version = JSON.parse(read("VERSION.json"));
const html = read("index.html");
const app = read("public/app/app.js");
const css = read("public/app/styles.css");

const checks = [
  ["package 版本", pkg.version === "0.7.1"],
  ["Tauri 版本", tauri.version === "0.7.1"],
  ["VERSION 版本", version.semver === "0.7.1" && version.app_version === "v007"],
  ["界面版本", html.includes("DESKTOP v007 · 0.7.1")],
  ["查询／专注按钮", html.includes('id="queryModeBtn"') && html.includes('id="focusModeBtn"') && app.includes("v071SetWorkspaceMode")],
  ["多总览模式", html.includes('data-overview-mode="region"') && html.includes('data-overview-mode="domain"') && html.includes('data-overview-mode="chapter"') && html.includes('data-overview-mode="hydrology"') && html.includes('data-overview-mode="civilization"')],
  ["真实区域总览", app.includes('h.regions.filter(r=>r.level===2)') && app.includes("cleanRegionOverviewName(region.name)")],
  ["地块域与作用域", app.includes('mode==="domain"') && app.includes('object.geometryType==="field"') && app.includes('state.camera.zoom >= .50')],
  ["经书总览", app.includes("v071ChapterNames") && app.includes("CHAPTERS_18")],
  ["水系总览", app.includes('mode==="hydrology"') && app.includes("waterPaths:paths")],
  ["文明族群总览", app.includes("v071CivilizationTokens")],
  ["50%显示地块", app.includes("REGION_OVERVIEW_EXIT_ZOOM = 0.50") && app.includes("tilesFull:.55")],
  ["连通地块联合轮廓", app.includes("v071ConnectedCellClusters") && app.includes("v071CellBoundaryLoops") && app.includes('source:"connected-cells"') && app.includes("drawRegionOverviewBackdrops")],
  ["稀疏范围抑制", app.includes("if(cluster.length<3)continue") && app.includes("if(group.waterPaths)return[]")],
  ["聚焦范围内保持", app.includes("focus.memberCells.has(cellKeyValue)") && app.includes('state.selectedHierarchyNode=""')],
  ["普通选择不自动聚焦", !app.includes('function selectObject(id){state.indexMode="objects";state.selectedRegionId=null;state.selectedHierarchyNode="";state.selectedWaterPathId=null;state.spatialFocusArmed=true') && app.includes("clickOutsideSpatialFocus(key)")],
  ["空白点击不退出聚焦", app.includes("if(!focus.active||!cellKeyValue)return false") && app.includes("state.flippedCell=null;scheduleRender()")],
  ["右键统一退出聚焦与选择", app.includes("右键在地图中统一退出聚焦与地块选择") && app.includes("function hasMapSelectionState()") && app.includes("function clearMapSelection(") && app.includes("已通过右键取消当前地块／对象选择")],
  ["退出聚焦完整清理", app.includes("function hasMapFocusState()") && app.includes("function removeStaleFocusClasses()") && app.includes('state.selectedRegionId=null') && app.includes('removeStaleFocusClasses();')],
  ["Esc与模式退出统一取消选择", app.includes("if(hadMapFocus)clearSpatialFocus({keepSelection:false,silent:true})") && app.includes("已通过 Esc 取消当前地块／对象选择") && app.includes("state.objectFocusMode=false")],
  ["对象聚焦不跨启动残留", app.includes("临时聚焦工具不跨启动恢复") && app.includes('document.documentElement.classList.remove("v060-object-focus")')],
  ["工作区样式", css.includes(".workspace-mode-switch") && css.includes(".overview-mode-menu")],
  ["原有总览底图", fs.existsSync(path.join(root, "public/assets/map/shanhaijing_overview_v070.webp"))],
  ["关系线与画笔保留", app.includes("drawV029RelationOverlay") && app.includes("drawBrushTraceCanvas")],
];

let bad = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (!ok) bad = true;
}
if (bad) process.exit(1);
console.log("v0.7.1 专项校验通过：连通区域轮廓、稀疏范围抑制、右键／Esc取消地块选择与聚焦状态完整清理。");
