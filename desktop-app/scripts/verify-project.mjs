import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const required=["index.html","src/desktop-bootstrap.js","public/app/app.js","public/app/data.js","src-tauri/src/lib.rs","src-tauri/tauri.conf.json","src-tauri/tauri.release.conf.json","scripts/set-version.mjs","scripts/verify-release-tag.mjs","scripts/release.ps1","scripts/import-master.mjs",".npmrc"];
let failed=false;
for(const file of required){if(!fs.existsSync(path.join(root,file))){console.error(`缺少：${file}`);failed=true}}
function parseAssignedJson(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`缺少数据标记：${marker}`);

  let start = markerIndex + marker.length;
  while (/\s/.test(source[start] || "")) start += 1;

  const opener = source[start];
  const closer = opener === "{" ? "}" : opener === "[" ? "]" : "";
  if (!closer) throw new Error(`数据标记 ${marker} 后不是JSON对象或数组`);

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      if (escape) escape = false;
      else if (char === "\\") escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === opener) depth += 1;
    else if (char === closer) {
      depth -= 1;
      if (depth === 0) return JSON.parse(source.slice(start, i + 1));
    }
  }
  throw new Error(`数据标记 ${marker} 对应的JSON没有闭合`);
}

const data=fs.readFileSync(path.join(root,"public/app/data.js"),"utf8");
const initial=parseAssignedJson(data,"window.SHJ_INITIAL_DATA=");
if(initial.objects.length!==617){console.error(`对象数量异常：${initial.objects.length}`);failed=true}
const ids=new Set(initial.objects.map(x=>x.id));
if(ids.size!==initial.objects.length){console.error("对象ID重复");failed=true}

const waterPaths=parseAssignedJson(data,"window.SHJ_WATER_PATHS=");
if(waterPaths.length!==79){console.error(`水系路径数量异常：${waterPaths.length}`);failed=true}
if(waterPaths.some(path=>!path.id||!path.name||!Array.isArray(path.points)||path.points.length<2)){console.error("水系路径存在缺失名称、ID或节点不足");failed=true}
if(initial.metadata.waterArrowCellCount!==118||initial.metadata.coverage?.water?.orphanArrows!==0){console.error(`水系箭头校验异常：箭头格${initial.metadata.waterArrowCellCount}，孤立${initial.metadata.coverage?.water?.orphanArrows}`);failed=true}

const hierarchy=parseAssignedJson(data,"window.SHJ_WORLD_HIERARCHY=");
const hierarchyRegions=Array.isArray(hierarchy.regions)?hierarchy.regions:[];
const hierarchyRegionIds=new Set(hierarchyRegions.map(region=>region.id));
const hierarchyObjectIds=new Set(initial.objects.map(object=>object.id));
if(!hierarchy.schemaVersion||hierarchy.world?.id!=="world-shanhaijing"||hierarchy.world?.type!=="world"){console.error("v0.5.2世界根节点或层级Schema缺失");failed=true}
if(hierarchyRegionIds.size!==hierarchyRegions.length){console.error("v0.5.2区域ID重复");failed=true}
if(!hierarchyRegions.some(region=>region.level===1)||!hierarchyRegions.some(region=>region.level===2)){console.error("v0.5.2世界大区或地图区域缺失");failed=true}
for(const object of initial.objects){
  const regionIds=Array.isArray(object.regionIds)?object.regionIds:[];
  if(!object.primaryRegionId||!regionIds.length||!regionIds.includes(object.primaryRegionId)){console.error(`对象${object.id}缺少主要区域或多区域关系`);failed=true;break}
  if(regionIds.some(id=>!hierarchyRegionIds.has(id))){console.error(`对象${object.id}引用不存在的区域`);failed=true;break}
}
for(const region of hierarchyRegions){
  if(!region.id||region.type!=="region"||![1,2].includes(region.level)){console.error("v0.5.2区域结构异常");failed=true;break}
  if((region.memberObjectIds||[]).some(id=>!hierarchyObjectIds.has(id))){console.error(`区域${region.id}引用不存在的对象`);failed=true;break}
  if(region.level===2&&!hierarchyRegionIds.has(region.parentRegionId)){console.error(`区域${region.id}缺少有效上级大区`);failed=true;break}
}
if(hierarchy.world?.objectCount!==initial.objects.length||hierarchy.stats?.assignedObjectCount+hierarchy.stats?.unassignedObjectCount!==initial.objects.length){console.error("v0.5.2层级对象统计与母表不一致");failed=true}
if(initial.metadata.schemaVersion!=="desktop-1.2-world-hierarchy"){console.error(`v0.5.2数据Schema异常：${initial.metadata.schemaVersion}`);failed=true}
const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));const conf=JSON.parse(fs.readFileSync(path.join(root,"src-tauri/tauri.conf.json"),"utf8"));const releaseConf=JSON.parse(fs.readFileSync(path.join(root,"src-tauri/tauri.release.conf.json"),"utf8"));const cargo=fs.readFileSync(path.join(root,"src-tauri/Cargo.toml"),"utf8");const cargoVersion=cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
if(new Set([pkg.version,conf.version,cargoVersion]).size!==1){console.error(`版本号未同步：package=${pkg.version} tauri=${conf.version} cargo=${cargoVersion}`);failed=true}
const [,minor="0"]=pkg.version.split(".");const edition=`v${String(Number(minor)).padStart(3,"0")}`;const rust=fs.readFileSync(path.join(root,"src-tauri/src/lib.rs"),"utf8");if(!rust.includes(`edition: "${edition}"`)){console.error(`桌面版本名称未同步：应为${edition}`);failed=true}
const updateEndpoints=conf.plugins?.updater?.endpoints||[];
if(!conf.plugins?.updater?.pubkey||!updateEndpoints.some(x=>x.includes("raw.githubusercontent.com/a58293/SHmap/main/updates/latest.json"))||!updateEndpoints.some(x=>x.includes("cdn.jsdelivr.net/gh/a58293/SHmap@main/updates/latest.json"))||!updateEndpoints.some(x=>x.includes("a58293/SHmap/releases/latest/download/latest.json"))){console.error("多线路更新器配置缺失");failed=true}if(releaseConf.bundle?.createUpdaterArtifacts!==true){console.error("正式发布配置未启用更新签名产物");failed=true}if(!cargo.includes('tauri-plugin-updater = "2"')){console.error("Rust更新插件缺失");failed=true}
const app=fs.readFileSync(path.join(root,"public/app/app.js"),"utf8");if(!app.includes("applyLivePanTransform")||!app.includes("resetLivePanTransform")){console.error("实时拖图逻辑缺失");failed=true}if(!app.includes("window.SHJ_APP_GO_BACK=appGoBack")){console.error("鼠标右键返回逻辑缺失");failed=true}
if(!app.includes("briefMuseumHTML")||!app.includes("brief-image-placeholder")){console.error("v004简述博物志图鉴逻辑缺失");failed=true}
if(!app.includes("importChooseBatchBtn")||!app.includes("importBatchFileInput")){console.error("v004批量Markdown选择逻辑缺失");failed=true}
if(!app.includes("imageUrl")||!fs.readFileSync(path.join(root,"index.html"),"utf8").includes("formImageUrl")){console.error("v004对象图片区字段缺失");failed=true}
if(!rust.includes("UPDATE_ENDPOINTS")||!rust.includes("UPDATE_CHECK_ATTEMPTS_PER_SOURCE")||!rust.includes("UPDATE_DOWNLOAD_ATTEMPTS")){console.error("v0.4.1更新重试与备用线路逻辑缺失");failed=true}
const css=fs.readFileSync(path.join(root,"public/app/styles.css"),"utf8");
if(!css.includes(".brief-museum-list")||!css.includes("overflow-y:auto")){console.error("v0.4.2简述博物志分类滚动逻辑缺失");failed=true}
if(!app.includes("openPrecisionDossier")||!app.includes("activeDossierTile")||!app.includes("precision-focus-mode")){console.error("v0.4.2精确点博物志逻辑缺失");failed=true}
if(!app.includes("finishRoundAndPublish")||!app.includes("publishPendingRound")||!app.includes("PUBLISH_REPO_KEY")){console.error("v0.4.2完成本轮自动发布逻辑缺失");failed=true}
const bootstrap=fs.readFileSync(path.join(root,"src/desktop-bootstrap.js"),"utf8");
if(!bootstrap.includes('publishPatch:args=>invoke("publish_patch_to_github",args)')||!bootstrap.includes("flushWorkspace")){console.error("v0.4.2桌面发布桥接缺失");failed=true}
if(!rust.includes("publish_patch_to_github")||!rust.includes("submissions/pending")||!rust.includes("run_git_network")||!rust.includes("GitHubDesktop")){console.error("v0.4.2 GitHub数据发布后端缺失");failed=true}
if(!app.includes("precision-hover-cards")||!app.includes("data-precision-preview-object")||!app.includes("precisionPreviewText")){console.error("v0.4.2整合版精确对象悬停窗逻辑缺失");failed=true}
if(!app.includes("Math.exp(-delta*.00155)")||!app.includes("scheduleCameraFrame()")){console.error("v0.4.2整合版无回弹连续缩放逻辑缺失");failed=true}
if(!css.includes(".precision-hover-cards")||!css.includes(".preview-pinned")||!css.includes(".hover-left")||!css.includes(".hover-up")){console.error("v0.4.2整合版精确对象悬停窗样式缺失");failed=true}
if(!app.includes("NINE_SECTION_MD_SAMPLE")||!app.includes("parseNineSectionDocument")||!app.includes('kind:"dossier_document"')||!app.includes("splitMarkdownImportDocuments")){console.error("v0.4.3九段式Markdown博物志导入逻辑缺失");failed=true}
if(!app.includes("routeWheelToPrecisionPreview")||!app.includes("scrollPrecisionPreview")||!css.includes(".wheel-zone-active")){console.error("v0.4.3精确对象预览窗智能滚轮逻辑缺失");failed=true}
if(!app.includes("setupV044RelationNavigation")||!app.includes("v029RelationHit")||!app.includes("relationHitAreas")||!app.includes("drawV029RelationLabel")){console.error("v0.4.4可点击关系线逻辑缺失");failed=true}
if(!css.includes("v0.4.4 · 博物志可读排版与可点击关系线")||!css.includes(".relation-legend")||!css.includes(".relation-line-tooltip")||!fs.readFileSync(path.join(root,"index.html"),"utf8").includes("relationLegend")){console.error("v0.4.4关系图例或博物志排版样式缺失");failed=true}
const indexHtml=fs.readFileSync(path.join(root,"index.html"),"utf8");
if(!app.includes("updateV044HighZoomLocator")||!app.includes("drawV044LocationWatermark")||!indexHtml.includes("highZoomLocator")||!css.includes(".high-zoom-locator")){console.error("v0.4.4高倍缩放定位辅助缺失");failed=true}
if(!indexHtml.includes('id="layerEmpty" />')||!app.includes("uiSchemaVersion:52")||!app.includes('message:"已点击地图空白区域"')||!app.includes('message:"已通过右键退出地块聚焦"')){console.error("v0.4.4空白地块默认关闭或聚焦退出逻辑缺失");failed=true}
if(!app.includes("undoLastBrushAction")||!app.includes("queueBrushRightClick")||!app.includes("cancelBrushModeAndClearTraces")||!indexHtml.includes("cancelBrushModeBtn")||!app.includes('scopeLabel:`画笔采集 ${entries.length} 个地块`')){console.error("v0.4.4画笔撤回、清空、取消或分类博物志逻辑缺失");failed=true}
if(!app.includes("v045RelationThemes")||!app.includes("v045RelationCatalog")||!app.includes("v045RelationCounts")||!app.includes("relationEvidenceFilter")||!indexHtml.includes("data-relation-count")||!indexHtml.includes("data-relation-evidence")){console.error("v0.4.5关系多标签分类或证据筛选逻辑缺失");failed=true}
if(!app.includes("openIdentityTagExplorer")||!app.includes("findIdentityTagMatches")||!app.includes("data-identity-tag-value")||!css.includes(".identity-tag-explorer")||!css.includes(".identity-tag-button")){console.error("v0.4.5可点击标签与同标签检索逻辑缺失");failed=true}
if(!app.includes("sortObjectIndex")||!app.includes("objectUpdatedAt")||!indexHtml.includes("objectSortSelect")||!indexHtml.includes("objectRoundOnly")||!css.includes(".object-sort-bar")||!app.includes("updatedAt=timestamp")){console.error("v0.4.5对象索引排序或更新时间记录逻辑缺失");failed=true}

if(!app.includes("setupV050Features")||!app.includes("v050ActiveMode")||!app.includes("v050ExclusiveBefore")||!css.includes(".v050-mode-bar")){console.error("v0.5.0统一模式状态条或互斥模式逻辑缺失");failed=true}
if(!app.includes("v050HistoryBack")||!app.includes("v050AddBookmark")||!app.includes("v050OpenGlobalSearch")||!css.includes(".v050-global-search")||!css.includes(".v050-side-drawer")){console.error("v0.5.0导航历史、研究书签或全局检索缺失");failed=true}
if(!app.includes("v050Undo")||!app.includes("v050Redo")||!app.includes("v050RecordUndoAction")||!app.includes("relationDepth")||!app.includes("V050_RELATION_DEPTH_LABELS")){console.error("v0.5.0撤销重做或关系分层逻辑缺失");failed=true}
if(!app.includes("v050TogglePanel")||!css.includes(".workspace.focus-map")||!css.includes(".workspace.left-collapsed")||!css.includes(".workspace.right-collapsed")){console.error("v0.5.0侧栏折叠或专注地图模式缺失");failed=true}
if(!app.includes("v050SetupRelationMenuPortal")||!app.includes("v050PositionRelationMenu")||!css.includes(".v050-relation-menu-portal")){console.error("v0.5.0关系详细筛选菜单防裁切逻辑缺失");failed=true}
if(!app.includes("V050_TEXT_SCALE_KEY")||!app.includes("v050ApplyTextScale")||!app.includes("v050InjectTextScaleControl")||!css.includes("全局可读字号与高分辨率屏幕适配")||!css.includes(".v050-text-scale-control")){console.error("v0.5.0全局可读字号或字号切换逻辑缺失");failed=true}

if(!app.includes("v052Hierarchy")||!app.includes("v052RenderRegionSidebar")||!app.includes("v052RenderRegionDetails")||!app.includes("v052RegionFocusContext")||!app.includes("setupV052Features")){console.error("v0.5.2世界／区域／地点层级逻辑缺失");failed=true}
if(!indexHtml.includes("regionIndexModeBtn")||!indexHtml.includes("indexResultTitle")||!css.includes("v0.5.2 · 世界／区域／地点层级")||!css.includes(".region-tree")||!css.includes(".hierarchy-detail-card")){console.error("v0.5.2区域目录、详情或样式缺失");failed=true}
if(!app.includes("selectedRegionId:state.selectedRegionId")||!app.includes("expandedRegionIds:[...(state.expandedRegionIds||[])]")||!app.includes("hierarchy-region-dim")){console.error("v0.5.2区域状态保存或聚焦表现缺失");failed=true}
if(!app.includes("drawWaterPaths")||!app.includes("waterPathAtClient")||!app.includes("waterPathDetailCard")||!app.includes("migrateWorkspaceObjects")){console.error("v0.5.1线型水系渲染、交互、档案或数据迁移逻辑缺失");failed=true}
if(!css.includes("v0.5.1 · 线型水系")||!css.includes(".water-path-card")||!css.includes(".water-path-tooltip")){console.error("v0.5.1线型水系样式缺失");failed=true}
if(!app.includes('type==="error"?4800:2400')||!app.includes('while(els.toastHost.children.length>3)')||!css.includes('pointer-events:none')){console.error("v0.5.0特大字号与非阻挡通知修复发生回退");failed=true}
if(pkg.scripts?.["import:master"]!=="node scripts/import-master.mjs"){console.error("v0.5.1母表导入命令缺失");failed=true}
const versionMeta=JSON.parse(fs.readFileSync(path.join(root,"VERSION.json"),"utf8"));if(versionMeta.semver!==pkg.version||versionMeta.app_version!==edition){console.error(`VERSION.json未同步：${versionMeta.app_version} / ${versionMeta.semver}`);failed=true}
const publishWorkflow=fs.readFileSync(path.join(root,"..",".github","workflows","publish-desktop-windows-update.yml"),"utf8");if(!publishWorkflow.includes("Sync stable update feed")||!publishWorkflow.includes("updates/latest.json")){console.error("稳定更新源同步工作流缺失");failed=true}
for(const name of fs.readdirSync(root)){if(/\.key$|PRIVATE_KEY|password/i.test(name)){console.error(`仓库根目录疑似包含密钥：${name}`);failed=true}}
const lock=fs.readFileSync(path.join(root,"package-lock.json"),"utf8");if(lock.includes("applied-caas-gateway")||lock.includes("artifactory/api/npm")){console.error("package-lock仍包含内部依赖地址");failed=true}
console.log(`校验：${initial.objects.length}个对象，程序${edition} / ${pkg.version}，数据版本${initial.metadata.dataVersion}`);console.log(`水系路径校验：通过（${waterPaths.length}段，${initial.metadata.waterArrowCellCount}个箭头格，孤立箭头${initial.metadata.coverage?.water?.orphanArrows||0}）`);console.log(`世界层级校验：通过（${hierarchy.stats?.macroRegionCount||0}个世界大区，${hierarchy.stats?.regionCount||0}个地图区域，未归区${hierarchy.stats?.unassignedObjectCount||0}）`);if(failed)process.exit(1);
