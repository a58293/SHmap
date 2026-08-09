import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const required=[
  "index.html",
  "src/desktop-bootstrap.js",
  "public/app/app.js",
  "public/app/object-roles.js",
  "src-tauri/src/lib.rs",
  "src-tauri/src/github_auth.rs",
  "src-tauri/tauri.conf.json",
  "src-tauri/tauri.release.conf.json",
  "scripts/set-version.mjs",
  "scripts/verify-release-tag.mjs",
  "scripts/release.ps1",
  "scripts/import-master.mjs",
  "scripts/verify-github-private-data-stage2.mjs",
  "scripts/verify-github-private-submissions-stage3.mjs",
  ".npmrc"
];

let failed=false;
for(const file of required){
  if(!fs.existsSync(path.join(root,file))){
    console.error(`缺少：${file}`);
    failed=true;
  }
}

const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));
const conf=JSON.parse(fs.readFileSync(path.join(root,"src-tauri/tauri.conf.json"),"utf8"));
const releaseConf=JSON.parse(fs.readFileSync(path.join(root,"src-tauri/tauri.release.conf.json"),"utf8"));
const cargo=fs.readFileSync(path.join(root,"src-tauri/Cargo.toml"),"utf8");
const cargoVersion=cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1];

if(new Set([pkg.version,conf.version,cargoVersion]).size!==1){
  console.error(`版本号未同步：package=${pkg.version} tauri=${conf.version} cargo=${cargoVersion}`);
  failed=true;
}

const [major="0",minor="0"]=pkg.version.split(".");
const edition=`v${String(Number(major)*10+Number(minor)).padStart(3,"0")}`;
const rust=fs.readFileSync(path.join(root,"src-tauri/src/lib.rs"),"utf8");
const githubAuth=fs.readFileSync(path.join(root,"src-tauri/src/github_auth.rs"),"utf8");
if(!rust.includes(`edition: "${edition}"`)){
  console.error(`桌面版本名称未同步：应为${edition}`);
  failed=true;
}

const versionMeta=JSON.parse(fs.readFileSync(path.join(root,"VERSION.json"),"utf8"));
if(versionMeta.data_version!=="v272-r0001"){console.error(`正式数据版本未切换到V272：${versionMeta.data_version}`);failed=true;}
if(versionMeta.semver!==pkg.version||versionMeta.app_version!==edition){
  console.error(`VERSION.json未同步：${versionMeta.app_version} / ${versionMeta.semver}`);
  failed=true;
}
if(versionMeta.object_count!==624||versionMeta.water_path_segments!==82||versionMeta.water_arrow_cells!==121){
  console.error(`公开版本元数据异常：对象${versionMeta.object_count}，水系${versionMeta.water_path_segments}，箭头格${versionMeta.water_arrow_cells}`);
  failed=true;
}

const updateEndpoints=conf.plugins?.updater?.endpoints||[];
if(
  !conf.plugins?.updater?.pubkey||
  !updateEndpoints.some(x=>x.includes("raw.githubusercontent.com/a58293/SHmap/main/updates/latest.json"))||
  !updateEndpoints.some(x=>x.includes("cdn.jsdelivr.net/gh/a58293/SHmap@main/updates/latest.json"))||
  !updateEndpoints.some(x=>x.includes("a58293/SHmap/releases/latest/download/latest.json"))
){
  console.error("多线路更新器配置缺失");
  failed=true;
}
if(releaseConf.bundle?.createUpdaterArtifacts!==true){
  console.error("正式发布配置未启用更新签名产物");
  failed=true;
}
if(!cargo.includes('tauri-plugin-updater = "2"')){
  console.error("Rust更新插件缺失");
  failed=true;
}

const app=fs.readFileSync(path.join(root,"public/app/app.js"),"utf8");
const css=fs.readFileSync(path.join(root,"public/app/styles.css"),"utf8");
const indexHtml=fs.readFileSync(path.join(root,"index.html"),"utf8");
const bootstrap=fs.readFileSync(path.join(root,"src/desktop-bootstrap.js"),"utf8");

if(fs.existsSync(path.join(root,"public/app/data.js"))||fs.existsSync(path.join(root,"dist/app/data.js"))){
  console.error("私有化回退：客户端目录重新出现 data.js");
  failed=true;
}
if(/app\/data\.js/i.test(indexHtml)){
  console.error("私有化回退：index.html 重新引用 /app/data.js");
  failed=true;
}
if(!bootstrap.includes('invoke("load_private_map_bundle")')||!bootstrap.includes("hydratePrivateMapBundle")){
  console.error("私有地图启动桥接缺失");
  failed=true;
}
if(!rust.includes("load_private_map_bundle")||!rust.includes("github_auth::require_authorized_session(&github_state)?")){
  console.error("Rust 私有地图加载或授权硬门缺失");
  failed=true;
}
if(
  !rust.includes("publish_patch_to_github")||
  !rust.includes("github_auth::publish_private_submission")||
  !rust.includes("Duration::from_secs(180)")||
  !githubAuth.includes("submissions/pending/")||
  !githubAuth.includes("submissions/assets/")||
  !githubAuth.includes("require_writable_session")
){
  console.error("GitHub 私有更改包发布后端缺失");
  failed=true;
}

if(!app.includes("applyLivePanTransform")||!app.includes("resetLivePanTransform")){console.error("实时拖图逻辑缺失");failed=true}
if(!app.includes("window.SHJ_APP_GO_BACK=appGoBack")){console.error("鼠标右键返回逻辑缺失");failed=true}
if(!app.includes("briefMuseumHTML")||!app.includes("brief-image-placeholder")){console.error("v004简述博物志图鉴逻辑缺失");failed=true}
if(!app.includes("importChooseBatchBtn")||!app.includes("importBatchFileInput")){console.error("v004批量Markdown选择逻辑缺失");failed=true}
if(!app.includes("imageUrl")||!indexHtml.includes("formImageUrl")){console.error("v004对象图片区字段缺失");failed=true}
if(!rust.includes("UPDATE_ENDPOINTS")||!rust.includes("UPDATE_CHECK_ATTEMPTS_PER_SOURCE")||!rust.includes("UPDATE_DOWNLOAD_ATTEMPTS")){console.error("v0.4.1更新重试与备用线路逻辑缺失");failed=true}
if(!css.includes(".brief-museum-list")||!css.includes("overflow-y:auto")){console.error("v0.4.2简述博物志分类滚动逻辑缺失");failed=true}
if(!app.includes("openPrecisionDossier")||!app.includes("activeDossierTile")||!app.includes("precision-focus-mode")){console.error("v0.4.2精确点博物志逻辑缺失");failed=true}
if(!app.includes("finishRoundAndPublish")||!app.includes("publishPendingRound")||!app.includes("PUBLISH_REPO_KEY")){console.error("v0.4.2完成本轮自动发布逻辑缺失");failed=true}
if(!bootstrap.includes('publishPatch:args=>invoke("publish_patch_to_github",args)')||!bootstrap.includes("flushWorkspace")){console.error("v0.4.2桌面发布桥接缺失");failed=true}
if(!app.includes("precision-hover-cards")||!app.includes("data-precision-preview-object")||!app.includes("precisionPreviewText")){console.error("v0.4.2整合版精确对象悬停窗逻辑缺失");failed=true}
if(!app.includes("Math.exp(-delta*.00155)")||!app.includes("scheduleCameraFrame()")){console.error("v0.4.2整合版无回弹连续缩放逻辑缺失");failed=true}
if(!css.includes(".precision-hover-cards")||!css.includes(".preview-pinned")||!css.includes(".hover-left")||!css.includes(".hover-up")){console.error("v0.4.2整合版精确对象悬停窗样式缺失");failed=true}
if(!app.includes("NINE_SECTION_MD_SAMPLE")||!app.includes("parseNineSectionDocument")||!app.includes('kind:"dossier_document"')||!app.includes("splitMarkdownImportDocuments")){console.error("v0.4.3九段式Markdown博物志导入逻辑缺失");failed=true}
if(!app.includes("routeWheelToPrecisionPreview")||!app.includes("scrollPrecisionPreview")||!css.includes(".wheel-zone-active")){console.error("v0.4.3精确对象预览窗智能滚轮逻辑缺失");failed=true}
if(!app.includes("setupV044RelationNavigation")||!app.includes("v029RelationHit")||!app.includes("relationHitAreas")||!app.includes("drawV029RelationLabel")){console.error("v0.4.4可点击关系线逻辑缺失");failed=true}
if(!css.includes("v0.4.4 · 博物志可读排版与可点击关系线")||!css.includes(".relation-legend")||!css.includes(".relation-line-tooltip")||!indexHtml.includes("relationLegend")){console.error("v0.4.4关系图例或博物志排版样式缺失");failed=true}
if(!app.includes("updateV044HighZoomLocator")||!app.includes("drawV044LocationWatermark")||!indexHtml.includes("highZoomLocator")||!css.includes(".high-zoom-locator")){console.error("v0.4.4高倍缩放定位辅助缺失");failed=true}

const blankClickKeepsFocus=app.includes('if(!focus.active||!cellKeyValue)return false')||app.includes('message:"已点击地图空白区域"');
const explicitFocusExit=app.includes('message:"已通过右键退出区域／范围聚焦"')||app.includes('message:"已通过右键退出地块聚焦"')||app.includes('右键在地图中统一退出聚焦与地块选择')||app.includes('已通过右键退出地块／区域／范围聚焦并取消选择');
if(!indexHtml.includes('id="layerEmpty" />')||!(/uiSchemaVersion:\s*\d+/.test(app))||!blankClickKeepsFocus||!explicitFocusExit){console.error("v0.4.4空白地块默认关闭或聚焦退出逻辑缺失");failed=true}
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
if(!app.includes("HIERARCHY_SEED")||!app.includes("renderRegionOverviewLayer")||!app.includes("setupV052Features")||!indexHtml.includes("objectIndexModeBtn")||!indexHtml.includes("regionIndexModeBtn")||!css.includes("region-overview")){console.error("v0.5.2世界／区域／地点层级逻辑缺失");failed=true}
if(!fs.existsSync(path.join(root,"vite.config.js"))||!fs.existsSync(path.join(root,"scripts","v053-core.mjs"))||!fs.existsSync(path.join(root,"src","v053-entry.js"))){console.error("v0.5.3运行时修复构建文件缺失");failed=true}
if(!app.includes("drawWaterPaths")||!app.includes("waterPathAtClient")||!app.includes("waterPathDetailCard")||!app.includes("migrateWorkspaceObjects")){console.error("v0.5.1线型水系渲染、交互、档案或数据迁移逻辑缺失");failed=true}
if(!css.includes("v0.5.1 · 线型水系")||!css.includes(".water-path-card")||!css.includes(".water-path-tooltip")){console.error("v0.5.1线型水系样式缺失");failed=true}
if(!app.includes('type==="error"?4800:2400')||!app.includes('while(els.toastHost.children.length>3)')||!css.includes('pointer-events:none')){console.error("v0.5.0特大字号与非阻挡通知修复发生回退");failed=true}
if(pkg.scripts?.["import:master"]!=="node scripts/import-master-v053.mjs"){console.error("v0.5.3母表导入归一化命令缺失");failed=true}

const workflowCandidates=[
  path.join(root,"..",".github","workflows","publish-desktop-windows-update.yml"),
  path.join(root,".github","workflows","publish-desktop-windows-update.yml"),
  path.join(root,".github","workflows","publish-windows-update.yml"),
  path.join(root,"..",".github","workflows","publish-windows-update.yml")
];
const workflowPath=workflowCandidates.find(fs.existsSync);
if(!workflowPath){
  console.error("稳定更新源同步工作流缺失");
  failed=true;
}else{
  const publishWorkflow=fs.readFileSync(workflowPath,"utf8");
  if(!(publishWorkflow.includes("updates/latest.json")||(publishWorkflow.includes("tauri-apps/tauri-action")&&publishWorkflow.includes("desktop-v__VERSION__")))){
    console.error("稳定更新源同步工作流内容异常");
    failed=true;
  }
}

for(const name of fs.readdirSync(root)){
  if(/\.key$|PRIVATE_KEY|password/i.test(name)){
    console.error(`仓库根目录疑似包含密钥：${name}`);
    failed=true;
  }
}
const lock=fs.readFileSync(path.join(root,"package-lock.json"),"utf8");
if(lock.includes("applied-caas-gateway")||lock.includes("artifactory/api/npm")){
  console.error("package-lock仍包含内部依赖地址");
  failed=true;
}

console.log(`校验：${versionMeta.object_count}个对象（公开仓库仅校验版本元数据），程序${edition} / ${pkg.version}，数据版本${versionMeta.data_version||"private"}`);
console.log(`水系元数据校验：${versionMeta.water_path_segments}段，${versionMeta.water_arrow_cells}个箭头格`);
console.log("正式地图正文已迁移至 Private SHmap-Data；公开 SHmap CI 不再读取 data.js。");
if(failed)process.exit(1);
