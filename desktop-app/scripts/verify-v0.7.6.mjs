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
const bootstrap = read("src/desktop-bootstrap.js");
const desktopCss = read("src/desktop-ui.css");
const rust = read("src-tauri/src/lib.rs");

const checks = [
  ["package 版本", pkg.version === "0.7.6"],
  ["Tauri 版本", tauri.version === "0.7.6"],
  ["VERSION 版本", version.semver === "0.7.6" && version.app_version === "v007"],
  ["界面版本", html.includes("DESKTOP v007 · 0.7.6")],
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
  ["九段式混合标题兼容", app.includes("function matchNineSectionHeaderLine") && app.includes("一句话概述") && app.includes("分别整理以下六类")],
  ["第06节分类与详情字段兼容", app.includes("function normalizeNineCategoryName") && app.includes("function matchNineEntryFieldLine") && app.includes("function stripNineListPrefix")],
  ["批量导入上限", app.includes("一次最多导入300个 Markdown 文件") && app.includes("50*1024*1024")],
  ["通用父子文件名识别", app.includes("function qualifiedChildLocationName") && app.includes("function allChildLocationMatches") && app.includes("parentObject")],
  ["不限水系父级", app.includes("function childHierarchyKind") && app.includes('kind:"mountain-system"') && app.includes('kind:"place-region"') && !app.includes("&&isHydrologyObject(o)" )],
  ["父子记录三种处理", app.includes("新建为父对象的") && app.includes("绑定到已有下属记录") && app.includes("暂不导入这份资料")],
  ["非空间下属记录写入", app.includes("function applyChildLocationDossier") && app.includes('geometryMode:"non-spatial-child"') && app.includes('locationStatus:"unlocated"')],
  ["不生成地图结构", app.includes("未创建地图坐标、几何、面积或路径") && app.includes("不创建地图对象、地块、坐标、面积、作用域或路径")],
  ["通用层级详情", app.includes("function objectChildHierarchyPanelHTML") && app.includes("object-child-hierarchy") && css.includes(".water-system-hierarchy") && css.includes(".water-segment-card")],
  ["下属地点可检索", app.includes('["下属地点／分段",childHierarchySearchText(o)]') && app.includes("function childHierarchySearchText")],
  ["旧水系层级兼容", app.includes("object?.waterHierarchy?.segments") && app.includes("hierarchyChildren(object)")],
  ["仅显示有内容分类", app.includes("filter(cat=>cat.objects.length)") && !app.includes("六类同时保留，未载内容明确标示")],
  ["无条目整块隐藏", app.includes('if(!total)return ""')],
  ["导入条目正文不回退母表", app.includes("const linked=resolvedDossierEntryObject(e,main)") && app.includes('coreFeatures:e.coreFeatures||""') && app.includes('evidence:e.evidence||""') && app.includes("e.imageUrl||objectImageSource(linked)")],
  ["地块属性完整展示", app.includes('["区域定位",profile.regionPosition]') && app.includes('["水文特征",profile.hydrology]') && app.includes('["典籍出处",profile.sourceCitation]')],
  ["数据关系完整展示", app.includes('identityTagGroupHTML("父级区域"') && app.includes('identityTagGroupHTML("相关水域"') && app.includes('identityTagGroupHTML("相关生灵"')],
  ["摘要与详细描述", app.includes('<p>${esc(oneLine)}</p>') && app.includes("identity-detailed-summary") && css.includes(".identity-detailed-summary")],
  ["内容区宽度自适应", css.includes("repeat(auto-fit,minmax(340px,1fr))") && css.includes("博物志分类归位与条目详情直显修正")],
  ["导入模式样式", css.includes(".import-policy-control") && css.includes(".supplement-import-mode") && css.includes(".water-segment-binding")],
  ["工作区样式", css.includes(".workspace-mode-switch") && css.includes(".overview-mode-menu")],
  ["原有总览底图", fs.existsSync(path.join(root, "public/assets/map/shanhaijing_overview_v070.webp"))],
  ["关系线与画笔保留", app.includes("drawV029RelationOverlay") && app.includes("drawBrushTraceCanvas")],
  ["数据库启动超时保护", bootstrap.includes("BOOTSTRAP_TIMEOUT_MS = 8000") && bootstrap.includes("promiseWithTimeout") && bootstrap.includes("本地缓存启动")],
  ["启动降级不覆盖数据库", bootstrap.includes("startupFallback=true") && bootstrap.includes("active:isTauri&&nativeStorageReady&&!startupFallback") && bootstrap.includes("当前会话请先核对资料，不要进行编辑")],
  ["主程序加载重试", bootstrap.includes("MAIN_SCRIPT_TIMEOUT_MS = 8000") && bootstrap.includes("地图主程序首次加载失败，正在重试") && bootstrap.includes("retry=${Date.now()}")],
  ["SQLite锁等待上限", rust.includes("busy_timeout(Duration::from_secs(3))")],
  ["启动恢复提示样式", desktopCss.includes(".desktop-startup-recovery")],
];

let bad = false;
for (const [name, ok] of checks) {
  console.log(`${ok ? "✓" : "✗"} ${name}`);
  if (!ok) bad = true;
}
if (bad) process.exit(1);
console.log("v0.7.6 专项校验通过：博物志详情直显、九段式导入兼容、数据库启动超时恢复与原有地图功能均保留。");
