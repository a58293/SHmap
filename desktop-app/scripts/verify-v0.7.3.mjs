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
  ["package 版本", pkg.version === "0.7.3"],
  ["Tauri 版本", tauri.version === "0.7.3"],
  ["VERSION 版本", version.semver === "0.7.3" && version.app_version === "v007"],
  ["界面版本", html.includes("DESKTOP v007 · 0.7.3")],
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
  ["安全补充导入模式", html.includes('id="importPolicySelect"') && html.includes('value="supplement" selected') && app.includes('importPolicy:"supplement"') && app.includes("function applyImportPolicyToAnalysis")],
  ["补充模式保护地图结构", app.includes("不会创建新对象") && app.includes("不生成新地块或地图坐标") && app.includes("坐标与几何保持不变")],
  ["博物志非破坏性合并", app.includes("function mergeSupplementDossier") && app.includes("mergeSupplementText") && app.includes("Markdown补充对象博物志")],
  ["粗体九段式兼容", app.includes("function normalizeNineSectionMarkdown") && app.includes("m=line.match(/^\\s*(?:\\*\\*|__)")],
  ["第06节重复小标题容错", app.includes("if(next>current&&!sections[next])") && app.includes("stripInlineMarkdown") && app.includes("entryField")],
  ["批量导入上限", app.includes("一次最多导入300个 Markdown 文件") && app.includes("50*1024*1024")],
  ["通用父子文件名识别", app.includes("function qualifiedChildLocationName") && app.includes("function allChildLocationMatches") && app.includes("parentObject")],
  ["不限水系父级", app.includes("function childHierarchyKind") && app.includes('kind:"mountain-system"') && app.includes('kind:"place-region"') && !app.includes("&&isHydrologyObject(o)" )],
  ["父子记录三种处理", app.includes("新建为父对象的") && app.includes("绑定到已有下属记录") && app.includes("暂不导入这份资料")],
  ["非空间下属记录写入", app.includes("function applyChildLocationDossier") && app.includes('geometryMode:"non-spatial-child"') && app.includes('locationStatus:"unlocated"')],
  ["不生成地图结构", app.includes("未创建地图坐标、几何、面积或路径") && app.includes("不创建地图对象、地块、坐标、面积、作用域或路径")],
  ["通用层级详情", app.includes("function objectChildHierarchyPanelHTML") && app.includes("object-child-hierarchy") && css.includes(".water-system-hierarchy") && css.includes(".water-segment-card")],
  ["下属地点可检索", app.includes('["下属地点／分段",childHierarchySearchText(o)]') && app.includes("function childHierarchySearchText")],
  ["旧水系层级兼容", app.includes("object?.waterHierarchy?.segments") && app.includes("hierarchyChildren(object)")],
  ["导入模式样式", css.includes(".import-policy-control") && css.includes(".supplement-import-mode") && css.includes(".water-segment-binding")],
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
console.log("v0.7.3 专项校验通过：安全补充导入、通用父子地点层级、非空间下属记录、旧水系层级兼容与非破坏性资料合并。");
