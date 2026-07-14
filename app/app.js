(() => {
  "use strict";
  const INITIAL = window.SHJ_INITIAL_DATA || {metadata:{}, objects:[]};
  const STORAGE_KEY = "shj_infinite_tile_demo_v018_v031";
  const LEGACY_STORAGE_KEYS = ["shj_infinite_tile_demo_v017_v031","shj_infinite_tile_demo_v016_v031","shj_infinite_tile_demo_v015_v031","shj_infinite_tile_demo_v014_v031","shj_infinite_tile_demo_v013_v031","shj_infinite_tile_demo_v012_v031","shj_infinite_tile_demo_v011_v031","shj_infinite_tile_demo_v010_v031","shj_infinite_tile_demo_v009_v031","shj_infinite_tile_demo_v008_v031","shj_infinite_tile_demo_v007_v031","shj_infinite_tile_demo_v006_v031","shj_infinite_tile_demo_v005_v031"];

  const GITHUB_CONFIG = {
    owner: "a58293",
    repo: "SHmap",
    branch: "main",
    currentPath: "data/current.json",
    pendingPath: "submissions/pending",
    repoUrl: "https://github.com/a58293/SHmap",
    apiBase: "https://api.github.com"
  };
  const CELL_LI = 100;
  const BASE_CELL_PX = 190;
  const MIN_ZOOM = 0.18;
  const MAX_ZOOM = 30;
  const PRECISION_ENTER_ZOOM = 4.2;
  const PRECISION_EXIT_ZOOM = 3.8;
  const TERRAIN_PALETTE = {
    mountain:{color:"#756b5b",cell:"rgba(117,107,91,.48)",line:"#5e5548"},
    hill:{color:"#9a9272",cell:"rgba(154,146,114,.42)",line:"#777054"},
    forest:{color:"#718b66",cell:"rgba(113,139,102,.44)",line:"#526e4a"},
    plain:{color:"#c1ae7d",cell:"rgba(193,174,125,.42)",line:"#9c8857"},
    water:{color:"#5b94a8",cell:"rgba(91,148,168,.48)",line:"#2b7f99"},
    wetland:{color:"#75a099",cell:"rgba(117,160,153,.43)",line:"#527b75"},
    desert:{color:"#b48858",cell:"rgba(180,136,88,.45)",line:"#8b663e"},
    ice:{color:"#b9ced2",cell:"rgba(185,206,210,.54)",line:"#789ca4"},
    settlement:{color:"#a66f5d",cell:"rgba(166,111,93,.38)",line:"#7f4f41"},
    myth:{color:"#8873a3",cell:"rgba(136,115,163,.25)",line:"#685482"},
    event:{color:"#cf8240",cell:"rgba(207,130,64,.25)",line:"#9e5c29"},
    unknown:{color:"#858b87",cell:"rgba(133,139,135,.16)",line:"#676d69"}
  };
  const COLORS = {grid:"rgba(79,84,84,.28)",minor:"rgba(79,84,84,.10)",axis:"rgba(55,61,61,.52)",hard:"rgba(145,111,42,.19)",candidate:"rgba(145,111,42,.08)",field:"rgba(173,77,61,.08)",river:"#2b7f99"};
  const CHAPTER_GROUPS = [
    {name:"五藏山经",chapters:["南山经","西山经","北山经","东山经","中山经"]},
    {name:"海外四经",chapters:["海外南经","海外西经","海外北经","海外东经"]},
    {name:"海内四经",chapters:["海内南经","海内西经","海内北经","海内东经"]},
    {name:"大荒四经",chapters:["大荒东经","大荒南经","大荒西经","大荒北经"]},
    {name:"海内经",chapters:["海内经"]}
  ];
  const CHAPTERS_18 = CHAPTER_GROUPS.flatMap(g=>g.chapters);


  const CORRECT_MD_SAMPLE = `# 纯地图调研资料导入

### 地块档案：X+001_Y+014

* 一句话摘要：丘陵间溪流穿行，玄色生灵集中出现。
* 地块类型：山地水系复合地块
* 本地标签：丘陵 / 溪流 / 玄色生灵
* 地理环境：连续缓丘。
* 水文特征：溪流由西北向东南穿过。
* 来源可信度：中
* 待核对问题：下游汇入位置尚未确定。

### 对象：玄鸟

* 对象ID：BEAST-001
* 地名：玄鸟
* 类型：鸟兽
* 所属经篇：海内北经
* 几何类型：点
* X坐标（里）：160
* Y坐标（里）：1440
* 坐标性质：原文明载
* 与本地关系：栖息于溪流北岸。
* 核心特征：玄色羽毛。
* 原文：……

### 对象：黑水

* 对象ID：RIVER-001
* 地名：黑水
* 类型：河流
* 所属经篇：海内北经
* 几何类型：线
* 路径节点：
  - 115,1480
  - 160,1440
  - 215,1405
* 路径状态：部分明确
* 原文流向：由西北向东南
* 水系与地貌关系：穿过此处
* 原文：……`;

  const WRONG_MD_SAMPLE = `# 错误格式演示

## 对象：无名山

* 地名 无名山
* 类型：山地
* 几何类型：圆形
* X坐标（里）：向东三百

---

### 地块档案：第十二格

* 简要：缺少可识别的 X、Y 主格坐标。
* 不存在的地块字段：不会被映射

---

### 对象：弱水核心段

* 地名：弱水核心段
* 类型：河流
* 几何类型：线
* 路径节点：
  - -1450,1050

---

### 对象：无名区域

* 几何类型：面积
* 中心X（里）：-900
* 中心Y（里）：500
* 面积形状：方形
* 东西宽（里）：八百
* 南北长（里）：800`;

  const BLANK_MD_TEMPLATE = `# 纯地图调研资料导入

### 地块档案：X+000_Y+000

* 一句话摘要：
* 地块类型：
* 本地标签：
* 地理环境：
* 水文特征：
* 父级区域：
* 相邻地块：
* 关联水域：
* 关联生灵：
* 来源可信度：
* 关联完整度：
* 地块原文摘录：
* 资料证据链：
* 当前定位结论：
* 待核对问题：

---

### 对象：对象名称

* 对象ID：
* 地名：对象名称
* 类型：
* 所属经篇：
* 所属区域／山系：
* 几何类型：点
* X坐标（里）：0
* Y坐标（里）：0
* 坐标性质：
* 证据等级：
* 与本地关系：
* 核心特征：
* 原文：
* 古注：
* 现代考证：
* 定位与地图推导：
* 来源URL：
* 待核对问题：`;

  const IMPORT_RULES_TEXT = `支持“地块档案”和“对象”两种区块，可在同一个 Markdown 文件中混合使用。

地块档案：以“### 地块档案：X+000_Y+000”开始。
地图对象：以“### 对象：对象名称”开始。
字段格式：统一使用“* 字段名：字段值”。
多行文本：下一行缩进至少两个空格，将继续写入当前字段。
坐标单位：对象数字坐标使用“里”；地块档案使用100里主格编号。
点对象：填写X、Y精确坐标；若只确定主格，可填写“主格坐标”。
线对象：路径节点至少2个，每行写“  - X,Y”。
面积对象：填写中心、形状和尺寸；多边形至少3个顶点。
作用域：仅用于文献或研究中有依据的神话影响范围。
更新规则：省略字段保留原值；明确写出的空字段清空原值。
重叠对象：多个对象使用相同精确坐标，程序自动用“/”显示全部名称。`;

  const TILE_PROFILE_FIELD_DEFS = [
    {key:"briefSummary",label:"简要",aliases:["简要","简要文案"]},
    {key:"basicSummary",label:"基础",aliases:["基础","基础文案"]},
    {key:"detailedSummary",label:"详细",aliases:["详细","详细文案"]},
    {key:"oneLineSummary",label:"一句话摘要",aliases:["一句话摘要"]},
    {key:"tileType",label:"地块类型",aliases:["地块类型"]},
    {key:"localTags",label:"本地标签",aliases:["本地标签","核心标签"]},
    {key:"orientation",label:"方位范围",aliases:["方位范围"]},
    {key:"parentRegion",label:"父级区域",aliases:["父级区域"]},
    {key:"adjacentTiles",label:"相邻地块",aliases:["相邻地块"]},
    {key:"relatedWaters",label:"关联水域",aliases:["关联水域"]},
    {key:"relatedLife",label:"关联生灵",aliases:["关联生灵"]},
    {key:"sourceReliability",label:"来源可信度",aliases:["来源可信度","资料可信度"]},
    {key:"relationCompleteness",label:"关联完整度",aliases:["关联完整度"]},
    {key:"geoEnvironment",label:"地理环境",aliases:["地理环境"]},
    {key:"hydrology",label:"水文特征",aliases:["水文特征"]},
    {key:"architecture",label:"建筑与遗迹",aliases:["建筑与遗迹","建筑群"]},
    {key:"livingSpecies",label:"生活物种",aliases:["生活物种"]},
    {key:"country",label:"所属国度／部族",aliases:["所属国度/部族","所属国度／部族","所属国度"]},
    {key:"faith",label:"信仰对象",aliases:["信仰对象"]},
    {key:"ruler",label:"统治者",aliases:["统治者"]},
    {key:"guardian",label:"守护神",aliases:["守护神","有无守护神"]},
    {key:"beasts",label:"奇珍异兽",aliases:["奇珍异兽/栖息生物","奇珍异兽／栖息生物","奇珍异兽","栖息生物"]},
    {key:"divinePlants",label:"神木／神话植被",aliases:["神木/神话植被","神木／神话植被","神木","神话植被"]},
    {key:"herbs",label:"仙草药草",aliases:["仙草药草","仙草/药草","仙草／药草"]},
    {key:"minerals",label:"金玉矿物",aliases:["金玉矿物","丰富矿产","矿产"]},
    {key:"specialLife",label:"特殊生命",aliases:["特殊生命"]},
    {key:"customs",label:"当地风俗",aliases:["当地风俗"]},
    {key:"mythicEncounters",label:"神话事件与现象",aliases:["神话事件与现象","文明与神话奇遇","神话奇遇"]},
    {key:"occurredEvents",label:"已发生事件",aliases:["已发生事件","已发生事件综合简述"]},
    {key:"tileOriginalExcerpt",label:"地块原文摘录",aliases:["地块原文摘录","原文摘录"]},
    {key:"evidenceChain",label:"资料证据链",aliases:["资料证据链","证据链"]},
    {key:"locationConclusion",label:"当前定位结论",aliases:["当前定位结论","定位结论"]},
    {key:"pendingQuestions",label:"待核对问题",aliases:["待核对问题"]}
  ];


  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const els = {
    versionLine:$("#versionLine"), saveState:$("#saveState"), topChangeCount:$("#topChangeCount"), topTrashCount:$("#topTrashCount"), openTrashTab:$("#openTrashTab"), finishRoundBtn:$("#finishRoundBtn"),
    searchInput:$("#searchInput"), chapterFilter:$("#chapterFilter"), typeFilterMenu:$("#typeFilterMenu"), typeFilterSummary:$("#typeFilterSummary"), typeFilterTree:$("#typeFilterTree"), resetFilterBtn:$("#resetFilterBtn"),
    objectList:$("#objectList"), resultCount:$("#resultCount"), mapStats:$("#mapStats"),
    viewport:$("#mapViewport"), canvas:$("#worldCanvas"), tileLayer:$("#tileLayer"), coordStatus:$("#coordStatus"), cameraStatus:$("#cameraStatus"), zoomReadout:$("#zoomReadout"), precisionModeBadge:$("#precisionModeBadge"), precisionTerrainLegend:$("#precisionTerrainLegend"), mapGuide:$("#mapGuide"),
    zoomInBtn:$("#zoomInBtn"), zoomOutBtn:$("#zoomOutBtn"), originBtn:$("#originBtn"), jumpCoordBtn:$("#jumpCoordBtn"), fitAllBtn:$("#fitAllBtn"), closeFlipBtn:$("#closeFlipBtn"), clearSpatialFocusBtn:$("#clearSpatialFocusBtn"),
    layerAreas:$("#layerAreas"), layerTerrain:$("#layerTerrain"), layerRivers:$("#layerRivers"), layerEmpty:$("#layerEmpty"), layerChanges:$("#layerChanges"),
    emptyDetail:$("#emptyDetail"), detailContent:$("#detailContent"), detailRef:$("#detailRef"), detailName:$("#detailName"), detailMeta:$("#detailMeta"), detailLocation:$("#detailLocation"), detailBody:$("#detailBody"), editTileBtn:$("#editTileBtn"), openDossierBtn:$("#openDossierBtn"), openRangeEditorBtn:$("#openRangeEditorBtn"), deleteTileBtn:$("#deleteTileBtn"),
    dossierWorkspace:$("#dossierWorkspace"), closeDossierBtn:$("#closeDossierBtn"), dossierPageTitle:$("#dossierPageTitle"), dossierPageMeta:$("#dossierPageMeta"), dossierCoordBadge:$("#dossierCoordBadge"), dossierCardTitle:$("#dossierCardTitle"), dossierBrief:$("#dossierBrief"), dossierStandard:$("#dossierStandard"), dossierBadges:$("#dossierBadges"), dossierCompletenessText:$("#dossierCompletenessText"), dossierCompletenessBar:$("#dossierCompletenessBar"), dossierCompletenessMeta:$("#dossierCompletenessMeta"), dossierObjectCount:$("#dossierObjectCount"), dossierObjectIndex:$("#dossierObjectIndex"), dossierLocateBtn:$("#dossierLocateBtn"), dossierChapterBadge:$("#dossierChapterBadge"), dossierHeroTitle:$("#dossierHeroTitle"), dossierContent:$("#dossierContent"), copyPromptBtn:$("#copyPromptBtn"), copyBriefBtn:$("#copyBriefBtn"), editDossierBtn:$("#editDossierBtn"), dossierModeBrief:$("#dossierModeBrief"), dossierModeFull:$("#dossierModeFull"),
    drillModal:$("#drillModal"), drillTitle:$("#drillTitle"), drillSubtitle:$("#drillSubtitle"), innerGrid:$("#innerGrid"), innerCoord:$("#innerCoord"), drillCount:$("#drillCount"), drillObjectList:$("#drillObjectList"), drillAddBtn:$("#drillAddBtn"),
    objectModal:$("#objectModal"), objectModalTitle:$("#objectModalTitle"), objectForm:$("#objectForm"), deleteObjectBtn:$("#deleteObjectBtn"), formObjectId:$("#formObjectId"), formName:$("#formName"), formType:$("#formType"), formX:$("#formX"), formY:$("#formY"), formChapter:$("#formChapter"), formGeometry:$("#formGeometry"), formLock:$("#formLock"), formOriginal:$("#formOriginal"), formDerivation:$("#formDerivation"), geometryRangeHint:$("#geometryRangeHint"),
    tileProfileModal:$("#tileProfileModal"), tileProfileForm:$("#tileProfileForm"), tileProfileTitle:$("#tileProfileTitle"), tileProfileKey:$("#tileProfileKey"), tileBriefSummary:$("#tileBriefSummary"), tileBasicSummary:$("#tileBasicSummary"), tileDetailedSummary:$("#tileDetailedSummary"), tileGeoEnvironment:$("#tileGeoEnvironment"), tileArchitecture:$("#tileArchitecture"), tileLivingSpecies:$("#tileLivingSpecies"), tileCountry:$("#tileCountry"), tileFaith:$("#tileFaith"), tileRuler:$("#tileRuler"), tileGuardian:$("#tileGuardian"), tileBeasts:$("#tileBeasts"), tileDivinePlants:$("#tileDivinePlants"), tileHerbs:$("#tileHerbs"), tileMinerals:$("#tileMinerals"), tileSpecialLife:$("#tileSpecialLife"), tileCustoms:$("#tileCustoms"), tileMythicEncounters:$("#tileMythicEncounters"), tileOccurredEvents:$("#tileOccurredEvents"), tileTimeNormal:$("#tileTimeNormal"), tilePlayerReachable:$("#tilePlayerReachable"), tileStoryOther:$("#tileStoryOther"), playerFields:$("#playerFields"), tilePlayerEnemies:$("#tilePlayerEnemies"), tilePlayerPlots:$("#tilePlayerPlots"), tilePlayerLoot:$("#tilePlayerLoot"), scriptureEventFields:$("#scriptureEventFields"),
    jumpModal:$("#jumpModal"), jumpForm:$("#jumpForm"), jumpX:$("#jumpX"), jumpY:$("#jumpY"),
    infoModal:$("#infoModal"), infoEyebrow:$("#infoEyebrow"), infoTitle:$("#infoTitle"), infoBody:$("#infoBody"),
    exportPatchBtn:$("#exportPatchBtn"), checkUpdateBtn:$("#checkUpdateBtn"), openChangesTab:$("#openChangesTab"), openSpecTab:$("#openSpecTab"), toastHost:$("#toastHost"), tooltip:$("#mapTooltip"),
    leftPanel:$(".left-panel"), searchSubviewHead:$("#searchSubviewHead"), exitSearchBtn:$("#exitSearchBtn"), searchSubviewTitle:$("#searchSubviewTitle"), searchSubviewMeta:$("#searchSubviewMeta"), searchHighlightSummary:$("#searchHighlightSummary"),
    openImportBtn:$("#openImportBtn"), importWorkspace:$("#importWorkspace"), closeImportBtn:$("#closeImportBtn"), importChooseFileBtn:$("#importChooseFileBtn"), importFileInput:$("#importFileInput"), importDropZone:$("#importDropZone"), importText:$("#importText"), importFileName:$("#importFileName"), importCharCount:$("#importCharCount"), reanalyzeImportBtn:$("#reanalyzeImportBtn"), clearImportBtn:$("#clearImportBtn"), importFormatBadge:$("#importFormatBadge"), importValidationState:$("#importValidationState"), importSummary:$("#importSummary"), importObjectList:$("#importObjectList"), importInspector:$("#importInspector"), importInspectorMeta:$("#importInspectorMeta"), importApplyBtn:$("#importApplyBtn"), exampleCode:$("#exampleCode"), exampleNotice:$("#exampleNotice"), exampleNotes:$("#exampleNotes"), loadExampleBtn:$("#loadExampleBtn"),
    deleteModal:$("#deleteModal"), deleteModalMeta:$("#deleteModalMeta"), deleteChoices:$("#deleteChoices"), trashModal:$("#trashModal"), trashList:$("#trashList"), clearTrashBtn:$("#clearTrashBtn"), trashRetentionSelect:$("#trashRetentionSelect"), roundModal:$("#roundModal"), roundSummary:$("#roundSummary"), roundKeepBtn:$("#roundKeepBtn"), roundArchiveBtn:$("#roundArchiveBtn"),
    rangeWorkspace:$("#rangeWorkspace"), closeRangeEditorBtn:$("#closeRangeEditorBtn"), rangePageMeta:$("#rangePageMeta"), rangeObjectBadge:$("#rangeObjectBadge"), rangeUndoBtn:$("#rangeUndoBtn"), rangeResetBtn:$("#rangeResetBtn"), rangeSaveBtn:$("#rangeSaveBtn"), rangeObjectCount:$("#rangeObjectCount"), rangeObjectList:$("#rangeObjectList"), createAreaObjectBtn:$("#createAreaObjectBtn"), createFieldObjectBtn:$("#createFieldObjectBtn"), rangeViewport:$("#rangeViewport"), rangeCanvas:$("#rangeCanvas"), rangeEmptyState:$("#rangeEmptyState"), rangeToolHint:$("#rangeToolHint"), rangeCursorStatus:$("#rangeCursorStatus"), rangeSnapSelect:$("#rangeSnapSelect"), rangeFitBtn:$("#rangeFitBtn"), rangeInspectorEmpty:$("#rangeInspectorEmpty"), rangeInspector:$("#rangeInspector"), rangeName:$("#rangeName"), rangeKind:$("#rangeKind"), rangeShape:$("#rangeShape"), rangeEvidence:$("#rangeEvidence"), rangeCenterX:$("#rangeCenterX"), rangeCenterY:$("#rangeCenterY"), rangeWidth:$("#rangeWidth"), rangeHeight:$("#rangeHeight"), rangeRadius:$("#rangeRadius"), rangePoints:$("#rangePoints"), rangeRectFields:$("#rangeRectFields"), rangeCircleFields:$("#rangeCircleFields"), rangePolygonFields:$("#rangePolygonFields"), rangeAnalysis:$("#rangeAnalysis")
  };

  const saved = loadSaved();
  const state = {
    objects: saved?.objects || structuredClone(INITIAL.objects || []),
    changes: saved?.changes || [],
    changeArchives: saved?.changeArchives || [],
    appliedRemotePatches: saved?.appliedRemotePatches || [],
    remotePatchHistory: saved?.remotePatchHistory || [],
    viewedRemotePatches: saved?.viewedRemotePatches || [],
    githubPendingFiles: [],
    githubPendingView: "new",
    githubPendingCache: {},
    githubCurrent: null,
    dataVersion: saved?.dataVersion || INITIAL.metadata?.dataVersion || "v031-r0001",
    camera: saved?.camera || {x:0,y:0,zoom:.92},
    selectedId: saved?.selectedId || (INITIAL.objects?.[0]?.id || null),
    selectedCell: saved?.selectedCell || null,
    tileProfiles: saved?.tileProfiles || {},
    trash: saved?.trash || [],
    trashRetentionDays: Number(saved?.trashRetentionDays)||0,
    nextIdCounter: Number(saved?.nextIdCounter)||0,
    pendingRoundExport:null,
    deleteContext:null,
    flippedCell: null,
    drillCell: null,
    detailTab:"summary",
    dossierTab:"overview",
    dossierMode:saved?.dossierMode||"brief",
    filters:{q:"",chapter:"",type:""},
    layers:{areas:true,terrain:true,rivers:true,empty:true,changes:true},
    precisionMode:false,
    precisionClusterOpen:null,
    renderQueued:false,
    suppressClickUntil:0,
    pan:{active:false,moved:false,pointerId:null,startX:0,startY:0,startCameraX:0,startCameraY:0,downTile:null},
    lastTileTap:{key:null,time:0},
    pendingAddCoord:null,
    previewCell:null,
    searchPulseCell:null,
    searchPulseObject:null,
    searchPulseTimer:null,
    importAnalysis:null,
    importSelectedIndex:0,
    exampleTab:"correct",
    cameraAnimation:null,
    spatialFocusArmed:false,
    pendingRangeKind:null,
    rangeEditor:{objectId:null,draft:null,original:null,tool:"select",snap:10,zoom:1,camera:{x:0,y:0},history:[],pointer:null,polygonDrawing:false}
  };
  if(!state.selectedCell && state.selectedId){const initialSelected=state.objects.find(o=>o.id===state.selectedId);if(initialSelected){const c=objectCell(initialSelected);state.selectedCell=cellKey(c.gx,c.gy)}}
  state.nextIdCounter=Math.max(state.nextIdCounter,maxKnownObjectNumber());
  cleanupExpiredTrash(false);

  function loadSaved(){try{const current=localStorage.getItem(STORAGE_KEY);if(current)return JSON.parse(current);for(const key of LEGACY_STORAGE_KEYS){const legacy=localStorage.getItem(key);if(legacy)return JSON.parse(legacy)}return null}catch{return null}}
  function persist(){
    try{localStorage.setItem(STORAGE_KEY, JSON.stringify({objects:state.objects,changes:state.changes,changeArchives:state.changeArchives,appliedRemotePatches:state.appliedRemotePatches,remotePatchHistory:state.remotePatchHistory,viewedRemotePatches:state.viewedRemotePatches,dataVersion:state.dataVersion,camera:state.camera,selectedId:state.selectedId,selectedCell:state.selectedCell,tileProfiles:state.tileProfiles,trash:state.trash,trashRetentionDays:state.trashRetentionDays,nextIdCounter:state.nextIdCounter,dossierMode:state.dossierMode})); els.saveState.textContent="已保存到本地"; setTimeout(()=>els.saveState.textContent="本地工作区",900)}catch(e){console.warn(e)}
  }
  function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
  function fmt(v,d=1){const n=Number(v)||0; return Math.abs(n-Math.round(n))<1e-8?String(Math.round(n)):n.toFixed(d).replace(/\.0+$/,"")}
  function signed(v){const n=Number(v)||0;return n>0?`+${fmt(n)}`:fmt(n)}
  function coordText(x,y){return `X ${signed(x)}里 · Y ${signed(y)}里`}
  function cellIndex(v){return Math.floor(v/CELL_LI + .5)} // 主格中心位于整百里，边界统一归入东/北侧
  function cellKey(gx,gy){return `${gx},${gy}`}
  function objectCell(o){return {gx:cellIndex(Number(o.x)||0),gy:cellIndex(Number(o.y)||0)}}
  function cellCenter(g){return g*CELL_LI}
  function cellBounds(gx,gy){const cx=cellCenter(gx),cy=cellCenter(gy);return {west:cx-50,east:cx+50,south:cy-50,north:cy+50,cx,cy}}
  function scale(){return BASE_CELL_PX*state.camera.zoom/CELL_LI}
  function worldToScreen(x,y){const r=els.viewport.getBoundingClientRect(),s=scale();return {x:r.width/2+(x-state.camera.x)*s,y:r.height/2-(y-state.camera.y)*s}}
  function screenToWorld(clientX,clientY){const r=els.viewport.getBoundingClientRect(),s=scale();return {x:state.camera.x+(clientX-r.left-r.width/2)/s,y:state.camera.y-(clientY-r.top-r.height/2)/s}}
  function geometryIcon(o){ if(o.geometryType==="line")return "≈"; if(o.geometryType==="area")return "▣"; if(o.geometryType==="field")return "◎"; if(/山|丘|峰/.test(o.type||""))return "山"; if(/水|海|泽|渊|池|河/.test(o.type||""))return "水"; if(/木|树|草|植物/.test(o.type||""))return "木"; if(/神|人物|帝|尸/.test(o.type||""))return "神"; if(/兽|动物|鸟|鱼/.test(o.type||""))return "兽"; return "·" }
  function normalizeText(v){return String(v||"").toLowerCase().replace(/[《》【】\s·／/，,。；;：:（）()\-—_]/g,"")}
  function objectSearchEntries(o){return [
    ["地名",o.name],["对象类型",o.type],["所属经篇",o.chapter],["所属区域",o.region],["人物／领袖",o.people],["神明／信仰",o.gods],
    ["怪物／异兽",o.beasts],["栖息生物",o.wildlife],["动物",o.animals],["族群居民",o.residents],["外形特征",o.appearance],["能力／功效",o.abilities],
    ["事件",o.events],["原文",o.original],["古注",o.annotations],["其他古籍",o.otherTexts],["异文",o.variants],["现代考证",o.modernResearch],
    ["设定与推导",o.derivation],["直接参照",o.reference],["总表行号",o.rowRef],["对象ID",o.id],["坐标",`${o.x},${o.y} ${coordText(o.x,o.y)}`]
  ]}
  function tileProfileSearchEntries(p){return [
    ["所属国度",p.country],["区域首领",p.ruler],["信仰对象",p.faith],["守护神",p.guardian],["奇珍异兽",p.beasts],
    ["神木／神话植被",p.divinePlants],["仙草药草",p.herbs],["特殊生命",p.specialLife],["当地风俗",p.customs],
    ["简要",p.briefSummary],["基础",p.basicSummary],["详细",p.detailedSummary],["地理环境",p.geoEnvironment],["建筑群",p.architecture],["生活物种",p.livingSpecies],["文明与神话奇遇",p.mythicEncounters],["已发生事件",p.occurredEvents]
  ]}
  function matchEntries(entries,q){const nq=normalizeText(q);if(!nq)return [];return entries.filter(([,v])=>v&&normalizeText(v).includes(nq)).map(([label,value])=>({label,value:String(value)}))}
  function nameMatchKind(o,q){const n=normalizeText(o?.name),nq=normalizeText(q);if(!n||!nq)return "";if(n===nq)return "exact";if(n.startsWith(nq))return "prefix";if(n.includes(nq))return "contains";return ""}
  function searchRank(o,q){const kind=nameMatchKind(o,q);if(kind==="exact")return 0;if(kind==="prefix")return 1;if(kind==="contains")return 2;return 5}
  function markSearchText(value,q){const text=String(value||""),needle=String(q||"").trim();if(!needle)return esc(text);const i=text.toLowerCase().indexOf(needle.toLowerCase());if(i<0)return esc(text);return `${esc(text.slice(0,i))}<mark>${esc(text.slice(i,i+needle.length))}</mark>${esc(text.slice(i+needle.length))}`}
  function pulseSearchTarget(cell,id=null){state.searchPulseCell=cell;state.searchPulseObject=id;clearTimeout(state.searchPulseTimer);state.searchPulseTimer=setTimeout(()=>{state.searchPulseCell=null;state.searchPulseObject=null;scheduleRender()},2300);scheduleRender()}
  function objectPassesSelectFilters(o){if(state.filters.chapter&&!String(o.chapter||"").includes(state.filters.chapter))return false;if(state.filters.type&&o.type!==state.filters.type)return false;return true}
  function pointInPolygon(x,y,points){let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const xi=Number(points[i][0]),yi=Number(points[i][1]),xj=Number(points[j][0]),yj=Number(points[j][1]);const hit=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||1e-9)+xi);if(hit)inside=!inside}return inside}
  function pointInSpatial(o,x,y){if(!o?.area)return false;const a=o.area;if(a.shape==="circle"){const cx=Number(a.cx??o.x)||0,cy=Number(a.cy??o.y)||0,r=Number(a.radius)||0;return Math.hypot(x-cx,y-cy)<=r}if(a.shape==="polygon"&&a.points?.length>=3)return pointInPolygon(x,y,a.points);const b=rangeBounds(a);return x>=b.west&&x<=b.east&&y>=b.south&&y<=b.north}
  function regionTokens(v){return String(v||"").split(/[／/、，,；;\s]+/).map(normalizeText).filter(x=>x.length>=2&&!/^(核心区|区域|山系|主体|候选|项目模型)$/.test(x))}
  function associatedSpatialAreas(o){const tokens=regionTokens(o.region);return state.objects.filter(a=>isSpatialObject(a)&&a.area).filter(a=>{
    if(a.id===o.id)return true;if(pointInSpatial(a,Number(o.x)||0,Number(o.y)||0))return true;const an=normalizeText(a.name),ar=normalizeText(a.region);return tokens.some(t=>(an&&an.includes(t))||(ar&&ar.includes(t))||(t&&normalizeText(o.region).includes(an)&&an.length>=2))
  })}
  function spatialCellKeys(o,cap=2600){const out=new Set();if(!o?.area)return out;const b=rangeBounds(o.area),eps=1e-7,gx0=cellIndex(b.west+eps),gx1=cellIndex(b.east-eps),gy0=cellIndex(b.south+eps),gy1=cellIndex(b.north-eps);let n=0;for(let gx=Math.min(gx0,gx1);gx<=Math.max(gx0,gx1);gx++){for(let gy=Math.min(gy0,gy1);gy<=Math.max(gy0,gy1);gy++){if(n++>cap)return out;const c=cellBounds(gx,gy);let include=true;if(o.area.shape==="circle"){const cx=Number(o.area.cx??o.x)||0,cy=Number(o.area.cy??o.y)||0,r=Number(o.area.radius)||0,px=Math.max(c.west,Math.min(cx,c.east)),py=Math.max(c.south,Math.min(cy,c.north));include=Math.hypot(px-cx,py-cy)<=r}else if(o.area.shape==="polygon"&&o.area.points?.length>=3){include=pointInPolygon(c.cx,c.cy,o.area.points)||o.area.points.some(p=>p[0]>=c.west&&p[0]<=c.east&&p[1]>=c.south&&p[1]<=c.north)}if(include)out.add(cellKey(gx,gy))}}return out}
  function getSpatialFocusContext(){
    if(state.filters.q.trim()||!state.spatialFocusArmed)return {active:false,areaIds:new Set(),memberCells:new Set(),areas:[]};
    const key=state.selectedCell;if(!key)return {active:false,areaIds:new Set(),memberCells:new Set(),areas:[]};
    const [gx,gy]=key.split(",").map(Number),cx=cellCenter(gx),cy=cellCenter(gy);
    const selected=state.objects.find(o=>o.id===state.selectedId),selectedInCell=selected&&cellKey(objectCell(selected).gx,objectCell(selected).gy)===key?selected:null;
    let areas=[];
    if(selectedInCell&&isSpatialObject(selectedInCell)&&selectedInCell.area)areas=[selectedInCell];
    else areas=state.objects.filter(o=>isSpatialObject(o)&&o.area).filter(o=>pointInSpatial(o,cx,cy)||(selectedInCell&&pointInSpatial(o,Number(selectedInCell.x)||0,Number(selectedInCell.y)||0)));
    if(!areas.length)return {active:false,areaIds:new Set(),memberCells:new Set(),areas:[]};
    const areaIds=new Set(areas.map(o=>o.id)),memberCells=new Set();areas.forEach(o=>spatialCellKeys(o).forEach(k=>memberCells.add(k)));
    return {active:true,areaIds,memberCells,areas,key};
  }
  function clearSpatialFocus({keepSelection=false,silent=false,message="地图恢复完整显示"}={}){
    state.spatialFocusArmed=false;
    if(!keepSelection){state.selectedCell=null;state.selectedId=null;state.flippedCell=null}
    renderDetails();renderSidebar();scheduleRender();persist();
    if(!silent)toast("已退出区域聚焦",message);
  }
  function clickOutsideSpatialFocus(cellKeyValue=null){
    const focus=getSpatialFocusContext();
    if(!focus.active)return false;
    if(cellKeyValue&&focus.memberCells.has(cellKeyValue))return false;
    state.spatialFocusArmed=false;
    if(cellKeyValue){
      state.selectedCell=cellKeyValue;
      const items=objectsInCellKey(cellKeyValue);
      state.selectedId=items[0]?.id||null;
      state.flippedCell=state.flippedCell===cellKeyValue?null:cellKeyValue;
      renderDetails();renderSidebar();scheduleRender();persist();
      toast("已退出区域聚焦","已切换到聚焦范围外的地块");
    }else clearSpatialFocus({message:"已点击地图空白区域"});
    return true;
  }
  function getSearchContext(){
    const q=state.filters.q.trim(),nq=normalizeText(q),cellMap=buildCellMap(state.objects),objectMatches=[],tileMatches=[],directCells=new Set(),exactNameCells=new Set(),nameCells=new Set(),areaIds=new Set(),relatedCells=new Set();
    if(!nq)return {q:"",objectMatches,tileMatches,directCells,exactNameCells,nameCells,areaIds,relatedCells,nameMatches:[],contentMatches:[],filteredObjects:state.objects.filter(objectPassesSelectFilters)};
    state.objects.filter(objectPassesSelectFilters).forEach(o=>{const reasons=matchEntries(objectSearchEntries(o),q);if(reasons.length){const c=objectCell(o),key=cellKey(c.gx,c.gy),nameKind=nameMatchKind(o,q),hit={object:o,reasons,key,gx:c.gx,gy:c.gy,nameKind,rank:searchRank(o,q)};objectMatches.push(hit);directCells.add(key);if(nameKind==="exact")exactNameCells.add(key);else if(nameKind)nameCells.add(key);associatedSpatialAreas(o).forEach(a=>areaIds.add(a.id))}});
    objectMatches.sort((a,b)=>a.rank-b.rank||String(a.object.name||"").localeCompare(String(b.object.name||""),"zh-CN"));
    const candidateKeys=new Set([...cellMap.keys(),...Object.keys(state.tileProfiles||{})]);candidateKeys.forEach(key=>{const [gx,gy]=key.split(",").map(Number),items=cellMap.get(key)||[],profile=tileProfileFor(key,items),reasons=matchEntries(tileProfileSearchEntries(profile),q);if(reasons.length){tileMatches.push({key,gx,gy,items,profile,reasons});directCells.add(key);items.filter(isSpatialObject).forEach(a=>areaIds.add(a.id));state.objects.filter(a=>isSpatialObject(a)&&a.area&&pointInSpatial(a,cellCenter(gx),cellCenter(gy))).forEach(a=>areaIds.add(a.id))}});
    areaIds.forEach(id=>{const a=state.objects.find(o=>o.id===id);if(a)spatialCellKeys(a).forEach(k=>relatedCells.add(k))});directCells.forEach(k=>relatedCells.delete(k));
    const nameMatches=objectMatches.filter(x=>x.nameKind),contentMatches=objectMatches.filter(x=>!x.nameKind);
    return {q,objectMatches,tileMatches,directCells,exactNameCells,nameCells,areaIds,relatedCells,nameMatches,contentMatches,filteredObjects:objectMatches.map(x=>x.object)}
  }
  function getFiltered(){const q=state.filters.q.trim();if(q)return getSearchContext().filteredObjects;return state.objects.filter(objectPassesSelectFilters)}
  function changedObjectIds(){return new Set(state.changes.map(c=>c.entityId).filter(Boolean))}
  function buildCellMap(objects=state.objects){const m=new Map();objects.forEach(o=>{const {gx,gy}=objectCell(o),k=cellKey(gx,gy);if(!m.has(k))m.set(k,[]);m.get(k).push(o)});return m}
  function sortObjects(items){return items.slice().sort((a,b)=>{const rank={area:0,field:1,line:2,point:3};return (rank[a.geometryType]??4)-(rank[b.geometryType]??4)||(a.rowRef||"").localeCompare(b.rowRef||"",undefined,{numeric:true})})}

  function init(){
    cleanupExpiredTrash(false); populateFilters(); bindEvents(); renderSidebar(); renderDetails(); resizeCanvas(); scheduleRender(); updateHeader(); renderExamplePanel();
    const ro=new ResizeObserver(()=>{resizeCanvas();scheduleRender()}); ro.observe(els.viewport);
    const rangeRO=new ResizeObserver(()=>{resizeRangeCanvas();drawRangeEditor()}); rangeRO.observe(els.rangeViewport);
  }
  function updateHeader(){
    const meta=INITIAL.metadata||{};
    els.versionLine.textContent=`地图数据 ${state.dataVersion} · 规格 ${meta.specProduction||"v004"} · ${state.objects.length}个对象 · 100里主格 / 10里格内精度`;
    els.topChangeCount.textContent=state.changes.length; els.topChangeCount.style.display=state.changes.length?"inline-grid":"none"; if(els.topTrashCount){els.topTrashCount.textContent=state.trash.length;els.topTrashCount.style.display=state.trash.length?"inline-grid":"none";}
  }
  function typeCategoryFor(value){const t=String(value||"");if(/山|丘|峰|岭|崖|岩|岳/.test(t))return "山";if(/水|河|海|泽|渊|池|湖|溪|泉/.test(t))return "水系";if(/国|野|域|区域|城|都|邑|洲|岛|地/.test(t))return "国家／区域";if(/木|树|草|植|林|花|果|药|禾/.test(t))return "神木／植物";if(/神|帝|尸|人物|首领|统治|王|后/.test(t))return "神祇／人物";if(/兽|鸟|鱼|虫|动物|生物|怪/.test(t))return "异兽／生物";if(/墓|葬|冢|陵/.test(t))return "墓葬";if(/事件|地标|祭|台|宫|门|井/.test(t))return "事件地标";return "其他"}
  function renderTypeFilterTree(){
    const types=[...new Set(state.objects.map(o=>o.type).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),"zh-CN"));
    const order=["山","水系","国家／区域","神木／植物","神祇／人物","异兽／生物","墓葬","事件地标","其他"],groups=new Map(order.map(k=>[k,[]]));
    types.forEach(t=>groups.get(typeCategoryFor(t)).push(t));
    els.typeFilterTree.innerHTML=`<button class="type-filter-all ${state.filters.type?'':'active'}" data-type-value="">全部类型</button>`+order.filter(k=>groups.get(k).length).map(k=>`<details class="type-filter-group" ${groups.get(k).includes(state.filters.type)?'open':''}><summary><span>${esc(k)}</span><b>${groups.get(k).length}</b></summary><div>${groups.get(k).map(t=>`<button class="${state.filters.type===t?'active':''}" data-type-value="${esc(t)}">${esc(t)}</button>`).join("")}</div></details>`).join("");
    els.typeFilterSummary.textContent=state.filters.type||"全部";
    els.typeFilterTree.querySelectorAll('[data-type-value]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();state.filters.type=btn.dataset.typeValue||"";els.typeFilterSummary.textContent=state.filters.type||"全部";els.typeFilterMenu.open=false;renderTypeFilterTree();renderSidebar();scheduleRender()}));
  }
  function populateFilters(){
    els.chapterFilter.innerHTML='<option value="">全部</option>'+CHAPTER_GROUPS.map(g=>`<optgroup label="${esc(g.name)}">${g.chapters.map(ch=>`<option value="${esc(ch)}">${esc(ch)}</option>`).join("")}</optgroup>`).join("");
    els.chapterFilter.value=state.filters.chapter||"";
    renderTypeFilterTree();
  }
  function renderSidebar(){
    const q=state.filters.q.trim(),ctx=getSearchContext(),items=q?ctx.filteredObjects:getFiltered();els.resultCount.textContent=q?ctx.objectMatches.length:items.length;
    const cells=buildCellMap(state.objects),co=[...cells.values()].filter(x=>x.length>1).length;
    els.mapStats.innerHTML=`<div class="stat-item"><strong>${state.objects.length}</strong><span>地图对象</span></div><div class="stat-item"><strong>${cells.size}</strong><span>已有内容地块</span></div><div class="stat-item"><strong>${co}</strong><span>多对象地块</span></div><div class="stat-item"><strong>${state.changes.length}</strong><span>本轮更改</span></div>`;
    els.leftPanel.classList.toggle("search-mode",!!q);els.searchSubviewHead.classList.toggle("hidden",!q);els.searchHighlightSummary.classList.toggle("hidden",!q);
    if(q){
      const groups=new Map();ctx.contentMatches.forEach(hit=>{if(!groups.has(hit.key))groups.set(hit.key,{gx:hit.gx,gy:hit.gy,hits:[]});groups.get(hit.key).hits.push(hit)});
      els.searchSubviewTitle.textContent=`搜索“${q}”`;els.searchSubviewMeta.textContent=`地名 ${ctx.nameMatches.length} · 其他内容 ${ctx.contentMatches.length} · 地块档案 ${ctx.tileMatches.length}`;
      els.searchHighlightSummary.innerHTML=`<strong>${ctx.nameMatches.length?"地名结果已置顶并在地图聚焦":"未找到地名匹配，正在显示内容命中"}</strong><span>朱红为地名精确命中，金色为地名包含命中，黄色为其他字段命中，绿色为关联区域；其余地块自动灰度。</span><div class="summary-chips"><span class="name-count">${ctx.nameMatches.length} 个地名</span><span>${ctx.contentMatches.length} 个内容结果</span><span>${ctx.areaIds.size} 个关联范围</span></div>`;
      const exact=ctx.nameMatches.filter(h=>h.nameKind==="exact"),partial=ctx.nameMatches.filter(h=>h.nameKind!=="exact");
      const nameCards=(hits,exactMode)=>hits.map(hit=>{const o=hit.object;return `<button class="search-name-hit ${exactMode?'exact':''} ${o.id===state.selectedId?'selected':''}" data-object-id="${esc(o.id)}" data-cell="${hit.key}"><span class="search-name-icon">${geometryIcon(o)}</span><span class="search-name-copy"><b>${exactMode?'地名精确命中':'地名命中'}</b><strong>${markSearchText(o.name,q)}</strong><small>${esc(o.type||'未分类')} · ${esc(o.chapter||'未标经篇')}</small><em>${coordText(o.x,o.y)} · 主格（${signed(hit.gx)}, ${signed(hit.gy)}）</em></span><span class="search-go">定位 →</span></button>`}).join("");
      const nameHTML=ctx.nameMatches.length?`<section class="search-name-group"><div class="search-priority-head"><strong>地名结果</strong><small>${ctx.nameMatches.length}项 · 优先显示</small></div>${nameCards(exact,true)}${nameCards(partial,false)}</section>`:"";
      const tileHTML=ctx.tileMatches.length?`<section class="search-region-group"><div class="search-cell-head"><strong>地块档案命中</strong><small>${ctx.tileMatches.length}格</small></div>${ctx.tileMatches.map(h=>`<button class="search-tile-hit" data-search-cell="${h.key}"><strong>主格（${signed(h.gx)}, ${signed(h.gy)}）</strong><small>${h.items.length}个对象 · ${esc(h.reasons.map(x=>x.label).join("、"))}</small><p>${esc(shortText(h.reasons[0]?.value,95))}</p></button>`).join("")}</section>`:"";
      const objectHTML=[...groups.values()].map(g=>`<section class="search-cell-group"><div class="search-cell-head"><strong>其他内容命中 · 主格（${signed(g.gx)}, ${signed(g.gy)}）</strong><small>${g.hits.length}项</small></div>${g.hits.map(hit=>{const o=hit.object,r=hit.reasons[0];return `<button class="search-hit ${o.id===state.selectedId?'selected':''}" data-object-id="${esc(o.id)}" data-cell="${hit.key}"><strong>${markSearchText(o.name,q)}</strong><small>${esc(o.type||'未分类')} · ${esc(o.chapter||'未标经篇')} · ${coordText(o.x,o.y)}</small><span class="search-reason">命中：${esc(hit.reasons.map(x=>x.label).slice(0,3).join("／"))}</span><p>${esc(shortText(r?.value||searchSnippet(o,q),100))}</p></button>`}).join("")}</section>`).join("");
      els.objectList.innerHTML=nameHTML+tileHTML+objectHTML||`<div class="import-empty">没有匹配对象。可尝试完整地名、区域首领、神明、怪物、国度、经篇、原文或坐标。</div>`;
      els.objectList.querySelectorAll("[data-object-id]").forEach(b=>{b.addEventListener("click",()=>{pulseSearchTarget(b.dataset.cell,b.dataset.objectId);jumpToObject(b.dataset.objectId,true,true)});b.addEventListener("mouseenter",()=>{state.previewCell=b.dataset.cell;scheduleRender()});b.addEventListener("mouseleave",()=>{state.previewCell=null;scheduleRender()})});
      els.objectList.querySelectorAll("[data-search-cell]").forEach(b=>{b.addEventListener("click",()=>{pulseSearchTarget(b.dataset.searchCell);jumpToCell(b.dataset.searchCell,true)});b.addEventListener("mouseenter",()=>{state.previewCell=b.dataset.searchCell;scheduleRender()});b.addEventListener("mouseleave",()=>{state.previewCell=null;scheduleRender()})});
    }else{
      els.searchHighlightSummary.innerHTML="";
      els.objectList.innerHTML=items.slice(0,260).map(o=>`<button class="object-list-item ${o.id===state.selectedId?'selected':''}" data-object-id="${esc(o.id)}"><strong><em>${esc(o.rowRef||'NEW')}</em>${esc(o.name)}</strong><small>${esc(o.type)} · ${esc(o.chapter||'未标经篇')} · ${coordText(o.x,o.y)}</small></button>`).join("")||`<div style="padding:20px 8px;color:var(--muted);font-size:10px">没有匹配对象。</div>`;
      els.objectList.querySelectorAll("[data-object-id]").forEach(b=>b.addEventListener("click",()=>jumpToObject(b.dataset.objectId,true,true)));
    }
  }
  function searchSnippet(o,q){const hit=matchEntries(objectSearchEntries(o),q)[0];return hit?hit.value:`${o.name} · ${o.type||'未分类'} · ${o.chapter||'未标经篇'}`}


  function terrainCategory(o){
    const strong=`${o?.type||""} ${o?.name||""}`,text=`${strong} ${o?.terrain||""}`;
    if(/冰|雪|寒域|寒原|极地|冰原/.test(text))return "ice";
    if(/湿地|沼泽|泽地|水泽/.test(text))return "wetland";
    if(/河|溪|江|海|湖|池|渊|泉|水系|水域|瀑/.test(strong)||o?.geometryType==="line"&&/水|河|溪|流/.test(text))return "water";
    if(/山|岳|峰|岭|崖|岩|峦/.test(strong))return "mountain";
    if(/丘|陵|坡/.test(strong))return "hill";
    if(/林|森林|树林|木|树|植被|草木/.test(strong))return "forest";
    if(/荒漠|沙地|沙漠|旱地|炎地|赤地/.test(text))return "desert";
    if(/国|城|邑|都|宫|台|坛|聚落|建筑|墓|葬|冢|村/.test(strong))return "settlement";
    if(/野|平原|原野|田|谷地|草原/.test(text))return "plain";
    if(/作用域|神域|光照域|神力|神明|神祇/.test(strong))return "myth";
    if(/事件|战|祭祀|神迹|奇遇|地标/.test(strong)||String(o?.events||"").trim())return "event";
    return "unknown";
  }
  function isWetlandObject(o){
    const text=`${o?.type||""} ${o?.name||""} ${o?.terrain||""}`;
    return /湿地|沼泽|泽地|水泽湿地/.test(text);
  }
  function isHydrologyObject(o){
    if(!o||isWetlandObject(o))return false;
    const strong=`${o?.type||""} ${o?.name||""}`,text=`${strong} ${o?.terrain||""} ${o?.water||""}`;
    return /河|溪|江|海|湖|池|渊|泉|水系|水域|瀑|涧|潭|沟|港|渠|泊|洋|水源|入海|汇流/.test(strong)||
      (o?.geometryType==="line"&&/水|河|溪|流|涧|泉/.test(text));
  }
  function baseTerrainCategory(o){
    const strong=`${o?.type||""} ${o?.name||""}`,text=`${strong} ${o?.terrain||""}`;
    if(/冰|雪|寒域|寒原|极地|冰原/.test(text))return "ice";
    if(/湿地|沼泽|泽地|水泽/.test(text))return "wetland";
    if(/山|岳|峰|岭|崖|岩|峦/.test(strong))return "mountain";
    if(/丘|陵|坡/.test(strong))return "hill";
    if(/林|森林|树林|木|树|植被|草木/.test(strong))return "forest";
    if(/荒漠|沙地|沙漠|旱地|炎地|赤地/.test(text))return "desert";
    if(/国|城|邑|都|宫|台|坛|聚落|建筑|墓|葬|冢|村/.test(strong))return "settlement";
    if(/野|平原|原野|田|谷地|草原/.test(text))return "plain";
    return "unknown";
  }
  function terrainCategoryFromProfile(p){
    const text=`${p?.geoEnvironment||""} ${p?.architecture||""} ${p?.livingSpecies||""}`;
    if(!text.trim())return "unknown";
    return terrainCategory({type:text,name:"",terrain:text,geometryType:"point"});
  }
  function baseTerrainCategoryFromProfile(p){
    const text=`${p?.geoEnvironment||""} ${p?.architecture||""} ${p?.livingSpecies||""}`;
    if(!text.trim())return "unknown";
    return baseTerrainCategory({type:text,name:"",terrain:text,geometryType:"point"});
  }
  function hydrologyKind(o){
    const text=`${o?.type||""} ${o?.name||""} ${o?.water||""}`;
    if(/泉|源|发源|水源/.test(text))return "source";
    if(/瀑/.test(text))return "waterfall";
    if(/海|湖|池|渊|潭|泊/.test(text))return "waterbody";
    if(/溪|涧|沟|渠/.test(text))return "stream";
    return "river";
  }
  function isCandidateGeometry(o){
    const text=`${o?.coordinateNature||""} ${o?.lockStatus||""} ${o?.area?.evidence||""}`;
    return /候选|推定|项目|未锁|待裁决|待确认|历史排版/.test(text)||o?.area?.evidence==="candidate"||o?.area?.evidence==="project";
  }
  function terrainRadiusLi(category){return ({mountain:22,hill:18,forest:25,plain:30,water:14,wetland:22,desert:28,ice:28,settlement:16}[category]||0)}
  function isBaseTerrainCategory(category){return ["mountain","hill","forest","plain","water","wetland","desert","ice","settlement"].includes(category)}
  function objectAnchor(o){
    if(o?.geometryType==="line"&&o.path?.length){const pts=o.path,idx=Math.floor((pts.length-1)/2);if(pts.length%2)return {x:Number(pts[idx][0])||0,y:Number(pts[idx][1])||0};return {x:(Number(pts[idx][0])+Number(pts[idx+1][0]))/2||0,y:(Number(pts[idx][1])+Number(pts[idx+1][1]))/2||0}}
    if(o?.area){const a=o.area;if(a.shape==="circle")return {x:Number(a.cx??o.x)||0,y:Number(a.cy??o.y)||0};if(a.shape==="polygon"&&a.points?.length){const n=a.points.length;return {x:a.points.reduce((s,p)=>s+(Number(p[0])||0),0)/n,y:a.points.reduce((s,p)=>s+(Number(p[1])||0),0)/n}}const b=rangeBounds(a);return {x:(b.west+b.east)/2,y:(b.south+b.north)/2}}
    return {x:Number(o?.x)||0,y:Number(o?.y)||0};
  }
  function terrainCellCategory(x,y,areas,points,profiles){
    let bestArea=null,bestAreaScore=-1;
    for(const o of areas){if(!pointInSpatial(o,x,y))continue;const cat=baseTerrainCategory(o),ev=o.area?.evidence,score=(ev==="hard"||ev==="original"?5:ev==="candidate"?3:2);if(cat!=="unknown"&&score>bestAreaScore){bestArea={cat,o};bestAreaScore=score}}
    if(bestArea)return bestArea.cat;
    let best="unknown",bestScore=Infinity;
    for(const o of points){const cat=baseTerrainCategory(o);if(cat==="unknown")continue;const radius=terrainRadiusLi(cat);if(!radius)continue;const d=Math.hypot(x-(Number(o.x)||0),y-(Number(o.y)||0));if(d<=radius&&d/radius<bestScore){best=cat;bestScore=d/radius}}
    if(best!=="unknown")return best;
    const key=cellKey(cellIndex(x),cellIndex(y)),profile=profiles[key],pc=baseTerrainCategoryFromProfile(profile);return pc!=="unknown"?pc:"unknown";
  }
  function drawPrecisionTerrain(ctx,v,s){
    const step=10,allAreas=state.objects.filter(o=>o.area&&(o.geometryType==="area"||o.geometryType==="field")),pad=40;
    const points=state.objects.filter(o=>{const x=Number(o.x)||0,y=Number(o.y)||0;return x>=v.left-pad&&x<=v.right+pad&&y>=v.bottom-pad&&y<=v.top+pad&&!o.area&&o.geometryType!=="field"});
    const terrainPoints=points.filter(o=>!isHydrologyObject(o));
    const baseAreas=allAreas.filter(o=>!isHydrologyObject(o)&&baseTerrainCategory(o)!=="unknown");
    const waterAreas=allAreas.filter(isHydrologyObject);
    const waterPoints=points.filter(o=>isHydrologyObject(o)&&!(o.geometryType==="line"&&o.path?.length>=2));
    const profiles=state.tileProfiles||{},x0=Math.floor(v.left/step)*step,y0=Math.floor(v.bottom/step)*step;
    if(state.layers.terrain){
      for(let x=x0;x<=v.right;x+=step){for(let y=y0;y<=v.top;y+=step){const cat=terrainCellCategory(x+step/2,y+step/2,baseAreas,terrainPoints,profiles);if(cat==="unknown")continue;const nw=worldToScreen(x,y+step),se=worldToScreen(x+step,y);ctx.fillStyle=TERRAIN_PALETTE[cat].cell;ctx.fillRect(nw.x,nw.y,se.x-nw.x,se.y-nw.y)}}
      drawPrecisionTerrainContours(ctx,terrainPoints,s);
    }
    if(state.layers.areas)drawPrecisionAreas(ctx,v,s,baseAreas);
    if(state.layers.rivers)drawPrecisionHydrologyOverlays(ctx,v,s,waterAreas,waterPoints);
  }
  function drawPrecisionTerrainContours(ctx,points,s){
    ctx.save();
    points.forEach(o=>{const cat=baseTerrainCategory(o);if(!["mountain","hill","forest","wetland","desert","ice","settlement"].includes(cat))return;const p=worldToScreen(Number(o.x)||0,Number(o.y)||0),r=Math.min(230,terrainRadiusLi(cat)*s),pal=TERRAIN_PALETTE[cat];if(r<8)return;ctx.strokeStyle=pal.line;ctx.globalAlpha=(cat==="mountain"||cat==="hill") ? .28 : .16;ctx.lineWidth=1.2;
      if(cat==="mountain"||cat==="hill"){for(let i=1;i<=3;i++){ctx.beginPath();ctx.ellipse(p.x,p.y,r*i/3,r*i/5,(Number(o.x)+Number(o.y))%7/18,0,Math.PI*2);ctx.stroke()}}
      else if(cat==="forest"){for(let i=0;i<5;i++){const a=i*1.256,rr=r*(.25+.09*(i%2));ctx.fillStyle=pal.color;ctx.globalAlpha=.10;ctx.beginPath();ctx.arc(p.x+Math.cos(a)*r*.38,p.y+Math.sin(a)*r*.28,rr,0,Math.PI*2);ctx.fill()}}
      else if(cat==="settlement"){ctx.globalAlpha=.16;ctx.fillStyle=pal.color;ctx.fillRect(p.x-r*.42,p.y-r*.30,r*.84,r*.60)}
    });ctx.restore();
  }
  function drawPrecisionAreas(ctx,v,s,areas){
    areas.forEach(o=>{const b=rangeBounds(o.area);if(b.east<v.left||b.west>v.right||b.north<v.bottom||b.south>v.top)return;const cat=baseTerrainCategory(o)!=="unknown"?baseTerrainCategory(o):terrainCategory(o),pal=TERRAIN_PALETTE[cat]||TERRAIN_PALETTE.unknown,hard=o.area?.evidence==="hard"||o.area?.evidence==="original";ctx.save();
      if(o.geometryType==="field"&&o.area?.shape==="circle"){const c=worldToScreen(o.area.cx??o.x,o.area.cy??o.y),r=Math.abs((o.area.radius||0)*s),g=ctx.createRadialGradient(c.x,c.y,0,c.x,c.y,r);g.addColorStop(0,hexToRgba(pal.color,.30));g.addColorStop(.62,hexToRgba(pal.color,.14));g.addColorStop(1,hexToRgba(pal.color,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(c.x,c.y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle=hexToRgba(pal.line,.7);ctx.lineWidth=2;ctx.setLineDash([8,6]);ctx.stroke();ctx.restore();return}
      if(!traceSpatialPath(ctx,o)){ctx.restore();return}ctx.fillStyle=hexToRgba(pal.color,o.geometryType==="field"?.16:hard?.28:.18);ctx.strokeStyle=hexToRgba(pal.line,.78);ctx.lineWidth=hard?2.5:1.8;ctx.setLineDash(hard?[]:o.geometryType==="field"?[5,5]:[9,6]);ctx.fill();ctx.stroke();ctx.restore();
    })
  }
  function drawPrecisionHydrologyOverlays(ctx,v,s,waterAreas,waterPoints){
    const water=TERRAIN_PALETTE.water;
    waterAreas.forEach(o=>{const b=rangeBounds(o.area);if(b.east<v.left||b.west>v.right||b.north<v.bottom||b.south>v.top)return;const candidate=isCandidateGeometry(o);ctx.save();if(!traceSpatialPath(ctx,o)){ctx.restore();return}ctx.fillStyle=hexToRgba(water.color,candidate?.18:.42);ctx.strokeStyle=hexToRgba(water.line,candidate?.62:.94);ctx.lineWidth=candidate?1.7:2.6;ctx.setLineDash(candidate?[8,7]:[]);ctx.fill();ctx.stroke();ctx.restore()});
    waterPoints.forEach(o=>{const x=Number(o.x)||0,y=Number(o.y)||0;if(x<v.left-20||x>v.right+20||y<v.bottom-20||y>v.top+20)return;const p=worldToScreen(x,y),kind=hydrologyKind(o),candidate=isCandidateGeometry(o),size=Math.max(12,Math.min(34,8+state.camera.zoom*3.2));ctx.save();ctx.globalAlpha=candidate?.58:.92;ctx.strokeStyle=hexToRgba(water.line,candidate?.66:.92);ctx.fillStyle=hexToRgba(water.color,candidate?.18:.46);ctx.lineWidth=candidate?1.4:2;ctx.setLineDash(candidate?[6,5]:[]);
      if(kind==="source"){const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,size);g.addColorStop(0,"rgba(235,250,255,.95)");g.addColorStop(.28,hexToRgba(water.color,.76));g.addColorStop(1,hexToRgba(water.color,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,size,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(p.x,p.y,Math.max(4,size*.22),0,Math.PI*2);ctx.fillStyle=water.line;ctx.fill()}
      else if(kind==="waterbody"){ctx.beginPath();ctx.ellipse(p.x,p.y,size*1.15,size*.65,-.12,0,Math.PI*2);ctx.fill();ctx.stroke()}
      else if(kind==="waterfall"){ctx.beginPath();ctx.moveTo(p.x-size*.7,p.y-size*.65);ctx.bezierCurveTo(p.x-size*.15,p.y-size*.15,p.x+size*.12,p.y+size*.15,p.x+size*.55,p.y+size*.72);ctx.strokeStyle=water.line;ctx.lineWidth=Math.max(4,size*.26);ctx.stroke()}
      else{ctx.beginPath();ctx.moveTo(p.x-size,p.y+size*.12);ctx.bezierCurveTo(p.x-size*.4,p.y-size*.55,p.x+size*.2,p.y+size*.58,p.x+size,p.y-size*.08);ctx.strokeStyle=hexToRgba(water.line,candidate?.58:.9);ctx.lineWidth=Math.max(4,size*.24);ctx.stroke();ctx.strokeStyle="rgba(232,248,251,.74)";ctx.lineWidth=Math.max(1.5,size*.08);ctx.stroke()}
      ctx.restore()});
  }
  function hexToRgba(hex,alpha){const h=String(hex||"#777").replace("#","");const n=parseInt(h.length===3?h.split("").map(x=>x+x).join(""):h,16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${alpha})`}
  function drawPrecisionGrid(ctx,v,s){
    const minor=10,minorPx=minor*s,startX=Math.floor(v.left/minor)*minor,endX=v.right+minor,startY=Math.floor(v.bottom/minor)*minor,endY=v.top+minor;
    ctx.save();ctx.lineWidth=1;for(let x=startX;x<=endX;x+=minor){const p=worldToScreen(x,0),major=Math.abs((((x-50)%100)+100)%100)<.001;ctx.strokeStyle=major?"rgba(52,59,56,.44)":"rgba(60,67,64,.16)";ctx.lineWidth=major?1.5:1;ctx.beginPath();ctx.moveTo(Math.round(p.x)+.5,0);ctx.lineTo(Math.round(p.x)+.5,v.height);ctx.stroke()}
    for(let y=startY;y<=endY;y+=minor){const p=worldToScreen(0,y),major=Math.abs((((y-50)%100)+100)%100)<.001;ctx.strokeStyle=major?"rgba(52,59,56,.44)":"rgba(60,67,64,.16)";ctx.lineWidth=major?1.5:1;ctx.beginPath();ctx.moveTo(0,Math.round(p.y)+.5);ctx.lineTo(v.width,Math.round(p.y)+.5);ctx.stroke()}
    if(minorPx>76){ctx.font="600 7px ui-monospace,monospace";ctx.fillStyle="rgba(48,55,51,.48)";ctx.textBaseline="top";for(let x=startX;x<=endX;x+=minor){for(let y=startY;y<=endY;y+=minor){const p=worldToScreen(x,y+minor);ctx.fillText(`${signed(x+5)},${signed(y+5)}`,p.x+4,p.y+4)}}}
    const zero=worldToScreen(0,0);ctx.strokeStyle="rgba(48,55,52,.62)";ctx.lineWidth=2;if(zero.x>-10&&zero.x<v.width+10){ctx.beginPath();ctx.moveTo(zero.x,0);ctx.lineTo(zero.x,v.height);ctx.stroke()}if(zero.y>-10&&zero.y<v.height+10){ctx.beginPath();ctx.moveTo(0,zero.y);ctx.lineTo(v.width,zero.y);ctx.stroke()}ctx.restore();
  }
  function drawFlowArrow(ctx,x,y,angle,color,size=7){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(size,0);ctx.lineTo(-size*.65,-size*.55);ctx.lineTo(-size*.25,0);ctx.lineTo(-size*.65,size*.55);ctx.closePath();ctx.fill();ctx.restore()}
  function drawPrecisionLines(ctx,v,s){
    state.objects.filter(o=>o.geometryType==="line"&&o.path?.length>=2).forEach(o=>{const hydro=isHydrologyObject(o),cat=hydro?"water":terrainCategory(o),pal=TERRAIN_PALETTE[cat]||TERRAIN_PALETTE.water,pts=o.path.map(pt=>worldToScreen(pt[0],pt[1])),candidate=isCandidateGeometry(o),first=pts[0],last=pts[pts.length-1];ctx.save();ctx.lineCap="round";ctx.lineJoin="round";ctx.globalAlpha=candidate?.62:1;ctx.setLineDash(candidate?[14,10]:[]);ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle="rgba(244,248,246,.78)";ctx.lineWidth=Math.max(7,Math.min(18,4.2*state.camera.zoom));ctx.stroke();const grad=ctx.createLinearGradient(first.x,first.y,last.x,last.y);if(hydro){grad.addColorStop(0,"#79bad0");grad.addColorStop(.5,pal.color);grad.addColorStop(1,pal.line)}else{grad.addColorStop(0,hexToRgba(pal.color,.72));grad.addColorStop(1,pal.line)}ctx.strokeStyle=grad;ctx.lineWidth=Math.max(3.5,Math.min(11,2.2*state.camera.zoom));ctx.stroke();ctx.setLineDash([]);
      if(hydro){ctx.fillStyle="#dff5fa";ctx.strokeStyle=pal.line;ctx.lineWidth=2;ctx.beginPath();ctx.arc(first.x,first.y,Math.max(4,Math.min(8,state.camera.zoom*1.25)),0,Math.PI*2);ctx.fill();ctx.stroke();let carry=0,spacing=candidate?112:82;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(!len)continue;let d=spacing-carry;while(d<len){const t=d/len;drawFlowArrow(ctx,a.x+dx*t,a.y+dy*t,Math.atan2(dy,dx),candidate?"rgba(228,244,247,.68)":"rgba(237,249,252,.94)",candidate?5:6);d+=spacing}carry=Math.max(0,len-(d-spacing))}ctx.beginPath();ctx.arc(last.x,last.y,Math.max(5,Math.min(10,state.camera.zoom*1.45)),0,Math.PI*2);ctx.strokeStyle=hexToRgba(pal.line,candidate?.55:.9);ctx.lineWidth=2;ctx.stroke()}
      if(state.camera.zoom>=7.5){const mid=pts[Math.floor((pts.length-1)/2)];ctx.font="700 9px sans-serif";ctx.textBaseline="bottom";ctx.lineWidth=3;ctx.strokeStyle="rgba(245,247,246,.92)";ctx.strokeText(o.name,mid.x+7,mid.y-6);ctx.fillStyle=pal.line;ctx.fillText(o.name,mid.x+7,mid.y-6)}ctx.restore();
    })
  }
  function updatePrecisionMode(){
    const before=state.precisionMode;if(!state.precisionMode&&state.camera.zoom>=PRECISION_ENTER_ZOOM)state.precisionMode=true;else if(state.precisionMode&&state.camera.zoom<=PRECISION_EXIT_ZOOM)state.precisionMode=false;
    if(before!==state.precisionMode){state.flippedCell=null;state.precisionClusterOpen=null;els.viewport.classList.add("precision-mode-enter");setTimeout(()=>els.viewport.classList.remove("precision-mode-enter"),320)}
    els.viewport.classList.toggle("precision-mode",state.precisionMode);els.viewport.classList.toggle("precision-deep",state.precisionMode&&state.camera.zoom>=7.5);els.precisionModeBadge?.classList.toggle("hidden",!state.precisionMode);els.precisionTerrainLegend?.classList.toggle("hidden",!state.precisionMode||!state.layers.terrain);
    if(els.mapGuide)els.mapGuide.innerHTML=state.precisionMode?"<span>10里彩色地形</span><i></i><span>拖动地图</span><i></i><span>单击彩色对象查看资料</span><i></i><span>双击空白处按精确坐标新增</span>":"<span>拖动地图</span><i></i><span>滚轮缩放</span><i></i><span>单击地块</span><i></i><span>放大至420%进入彩色精细地图</span>";
  }
  function precisionSearchClass(items,anchorKey,search){if(!search.q)return "";if(items.some(o=>nameMatchKind(o,search.q)==="exact"))return "search-exact";if(items.some(o=>nameMatchKind(o,search.q)))return "search-name";if(items.some(o=>search.objectMatches.some(h=>h.object.id===o.id)))return "search-match";if(search.relatedCells.has(anchorKey))return "search-related";return "search-dim"}
  function renderPrecisionLayer(){
    const v=visibleWorld(),pad=35,stateSearch=getSearchContext(),focus=getSpatialFocusContext(),groups=new Map();
    state.objects.forEach(o=>{const a=objectAnchor(o);if(a.x<v.left-pad||a.x>v.right+pad||a.y<v.bottom-pad||a.y>v.top+pad)return;const key=`${a.x.toFixed(1)},${a.y.toFixed(1)}`;if(!groups.has(key))groups.set(key,{key,x:a.x,y:a.y,items:[]});groups.get(key).items.push(o)});
    const html=[];groups.forEach(g=>{const items=sortObjects(g.items),selected=items.some(o=>o.id===state.selectedId),ordered=state.filters.q?[...items].sort((a,b)=>searchRank(a,state.filters.q)-searchRank(b,state.filters.q)):items,main=ordered.find(o=>o.id===state.selectedId)||ordered[0],hasWater=items.some(isHydrologyObject),landCats=items.map(baseTerrainCategory).filter(c=>c!=="unknown"),mainLand=baseTerrainCategory(main),landCat=mainLand!=="unknown"?mainLand:(landCats[0]||"unknown"),cat=landCat!=="unknown"?landCat:terrainCategory(main),pal=TERRAIN_PALETTE[cat]||TERRAIN_PALETTE.unknown,p=worldToScreen(g.x,g.y),anchorCell=cellKey(cellIndex(g.x),cellIndex(g.y)),searchClass=precisionSearchClass(items,anchorCell,stateSearch),spatialClass=!stateSearch.q&&focus.active&&!focus.memberCells.has(anchorCell)?"spatial-dim":"",hasEvents=items.some(o=>String(o.events||"").trim()||terrainCategory(o)==="event"),open=state.precisionClusterOpen===g.key,mixedClass=`${hasWater?'has-water':''} ${landCats.length?'has-land':''}`.trim(),mixedTitle=hasWater&&landCats.length?" · 地貌与水系叠层":"";
      const popup=open&&items.length>1?`<div class="precision-cluster-popover">${ordered.map(o=>{const oc=isHydrologyObject(o)?"water":(baseTerrainCategory(o)!=="unknown"?baseTerrainCategory(o):terrainCategory(o)),op=TERRAIN_PALETTE[oc]||TERRAIN_PALETTE.unknown;return `<button data-precision-object="${esc(o.id)}" class="${o.id===state.selectedId?'selected':''}"><i style="--dot:${op.color}"></i><span><strong>${esc(o.name)}</strong><small>${esc(o.type||'未分类')} · ${coordText(o.x,o.y)}</small></span></button>`}).join("")}</div>`:"";
      html.push(`<div class="precision-object-group ${cat} ${mixedClass} ${main.geometryType==='field'?'field':''} ${selected?'selected':''} ${hasEvents?'has-events':''} ${searchClass} ${spatialClass}" data-precision-group="${esc(g.key)}" style="left:${p.x}px;top:${p.y}px;--marker-color:${pal.color};--marker-soft:${hexToRgba(pal.color,.23)}"><button class="precision-marker" data-precision-main="${esc(main.id)}" title="${esc(main.name)} · ${coordText(g.x,g.y)}${mixedTitle}"><span class="precision-marker-core"></span>${items.length>1?`<span class="precision-marker-count">${items.length}</span>`:""}<span class="precision-marker-name">${state.filters.q?markSearchText(main.name,state.filters.q):esc(main.name)}</span><span class="precision-marker-coord">${coordText(g.x,g.y)}</span></button>${popup}</div>`)
    });els.tileLayer.innerHTML=html.join("");bindPrecisionEvents();applyV029MapDOM();
  }
  function bindPrecisionEvents(){
    els.tileLayer.querySelectorAll(".precision-object-group").forEach(group=>{group.addEventListener("pointerdown",e=>e.stopPropagation());const main=group.querySelector("[data-precision-main]");main?.addEventListener("click",e=>{e.stopPropagation();const key=group.dataset.precisionGroup,items=state.objects.filter(o=>{const a=objectAnchor(o);return `${a.x.toFixed(1)},${a.y.toFixed(1)}`===key});if(items.length>1){state.precisionClusterOpen=state.precisionClusterOpen===key?null:key;scheduleRender()}else if(main.dataset.precisionMain)selectObject(main.dataset.precisionMain)});main?.addEventListener("dblclick",e=>{e.stopPropagation();openObjectForm(state.objects.find(o=>o.id===main.dataset.precisionMain))});main?.addEventListener("mouseenter",e=>{const o=state.objects.find(x=>x.id===main.dataset.precisionMain);if(o)showTooltip(`${o.name} · ${o.type||'未分类'} · ${coordText(o.x,o.y)}`,e.clientX,e.clientY)});main?.addEventListener("mousemove",e=>moveTooltip(e.clientX,e.clientY));main?.addEventListener("mouseleave",hideTooltip);
      group.querySelectorAll("[data-precision-object]").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();state.precisionClusterOpen=null;selectObject(btn.dataset.precisionObject)}));
    })
  }
  function resizeCanvas(){const r=els.viewport.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);els.canvas.width=Math.max(1,Math.round(r.width*dpr));els.canvas.height=Math.max(1,Math.round(r.height*dpr));els.canvas.style.width=r.width+"px";els.canvas.style.height=r.height+"px"}
  function scheduleRender(){if(state.renderQueued)return;state.renderQueued=true;requestAnimationFrame(()=>{state.renderQueued=false;renderMap()})}
  function visibleWorld(){const r=els.viewport.getBoundingClientRect(),s=scale();return {left:state.camera.x-r.width/(2*s),right:state.camera.x+r.width/(2*s),bottom:state.camera.y-r.height/(2*s),top:state.camera.y+r.height/(2*s),width:r.width,height:r.height}}
  function renderMap(){
    if(!els.viewport.clientWidth)return;
    updatePrecisionMode();
    drawCanvas(); renderTiles();
    els.zoomReadout.textContent=Math.round(state.camera.zoom*100)+"%";
    els.cameraStatus.textContent=`${state.precisionMode?"10里彩色精细地图 · ":""}中心 ${coordText(Math.round(state.camera.x),Math.round(state.camera.y))}`;
    els.closeFlipBtn.classList.toggle("hidden",state.precisionMode||!state.flippedCell);
    const spatial=getSpatialFocusContext();
    if(els.clearSpatialFocusBtn){
      els.clearSpatialFocusBtn.classList.toggle("hidden",!spatial.active);
      els.clearSpatialFocusBtn.title=spatial.active?`当前聚焦：${spatial.areas.map(o=>o.name).join("、")}`:"";
    }
    renderV029Minimap();updateV029Breadcrumb();updateV029ToolUI();
  }
  function drawCanvas(){
    const ctx=els.canvas.getContext("2d"),r=els.viewport.getBoundingClientRect(),dpr=els.canvas.width/r.width;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,r.width,r.height);
    const v=visibleWorld(),s=scale(),cellPx=CELL_LI*s;
    ctx.fillStyle=state.precisionMode?"#aeb1af":"#cfd1d0";ctx.fillRect(0,0,r.width,r.height);
    const grad=ctx.createRadialGradient(r.width*.15,r.height*.05,0,r.width*.15,r.height*.05,r.width*.72);grad.addColorStop(0,"rgba(255,255,255,.22)");grad.addColorStop(1,"rgba(255,255,255,0)");ctx.fillStyle=grad;ctx.fillRect(0,0,r.width,r.height);
    if(state.precisionMode){drawPrecisionTerrain(ctx,v,s);drawPrecisionGrid(ctx,v,s);if(state.layers.rivers)drawPrecisionLines(ctx,v,s)}
    else{if(state.layers.areas)drawAreas(ctx,v,s);drawGrid(ctx,v,s,cellPx);if(state.layers.rivers)drawLines(ctx,v,s)}
    drawBrushSelection(ctx,v);drawContextDimming(ctx,v);drawSearchHighlights(ctx,v,s);drawOrigin(ctx,s);drawV029RelationOverlay(ctx,v,s);drawV029MeasureOverlay(ctx,v,s);
  }
  function drawGrid(ctx,v,s,cellPx){
    const startX=Math.floor((v.left-50)/100)*100+50, endX=v.right+100;const startY=Math.floor((v.bottom-50)/100)*100+50,endY=v.top+100;
    if(cellPx>115){ctx.strokeStyle=COLORS.minor;ctx.lineWidth=1;const minor=10;for(let x=Math.floor(v.left/minor)*minor;x<=v.right;x+=minor){if(Math.abs((x-50)%100)<.01)continue;const p=worldToScreen(x,0);ctx.beginPath();ctx.moveTo(Math.round(p.x)+.5,0);ctx.lineTo(Math.round(p.x)+.5,v.height);ctx.stroke()}for(let y=Math.floor(v.bottom/minor)*minor;y<=v.top;y+=minor){if(Math.abs((y-50)%100)<.01)continue;const p=worldToScreen(0,y);ctx.beginPath();ctx.moveTo(0,Math.round(p.y)+.5);ctx.lineTo(v.width,Math.round(p.y)+.5);ctx.stroke()}}
    ctx.strokeStyle=COLORS.grid;ctx.lineWidth=cellPx>55?1.1:.7;
    for(let x=startX;x<=endX;x+=100){const p=worldToScreen(x,0);ctx.beginPath();ctx.moveTo(Math.round(p.x)+.5,0);ctx.lineTo(Math.round(p.x)+.5,v.height);ctx.stroke()}
    for(let y=startY;y<=endY;y+=100){const p=worldToScreen(0,y);ctx.beginPath();ctx.moveTo(0,Math.round(p.y)+.5);ctx.lineTo(v.width,Math.round(p.y)+.5);ctx.stroke()}
    const zero=worldToScreen(0,0);ctx.strokeStyle=COLORS.axis;ctx.lineWidth=1.5;if(zero.x>-10&&zero.x<v.width+10){ctx.beginPath();ctx.moveTo(zero.x,0);ctx.lineTo(zero.x,v.height);ctx.stroke()}if(zero.y>-10&&zero.y<v.height+10){ctx.beginPath();ctx.moveTo(0,zero.y);ctx.lineTo(v.width,zero.y);ctx.stroke()}
  }
  function drawAreas(ctx,v,s){
    const areas=state.objects.filter(o=>o.area && (o.geometryType==="area"||o.geometryType==="field"));
    areas.forEach(o=>{const a=o.area;if(a.east<v.left||a.west>v.right||a.north<v.bottom||a.south>v.top)return;const nw=worldToScreen(a.west,a.north),se=worldToScreen(a.east,a.south),w=se.x-nw.x,h=se.y-nw.y;ctx.save();const hard=a.evidence==="hard"||a.evidence==="original";ctx.fillStyle=o.geometryType==="field"?COLORS.field:(hard?COLORS.hard:COLORS.candidate);ctx.strokeStyle=o.geometryType==="field"?"rgba(173,77,61,.78)":"rgba(145,111,42,.85)";ctx.lineWidth=hard?2.1:1.7;ctx.setLineDash(hard?[]:(o.geometryType==="field"?[6,5]:[9,6]));ctx.beginPath();if(a.shape==="circle"){const c=worldToScreen(a.cx??o.x,a.cy??o.y),rx=Math.abs((a.radius||0)*s);ctx.ellipse(c.x,c.y,rx,rx,0,0,Math.PI*2)}else if(a.shape==="polygon"&&a.points?.length){a.points.forEach((pt,i)=>{const p=worldToScreen(pt[0],pt[1]);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)});ctx.closePath()}else ctx.rect(nw.x,nw.y,w,h);ctx.fill();ctx.stroke();ctx.setLineDash([]);if(w>100&&h>45){ctx.fillStyle=o.geometryType==="field"?"rgba(134,54,45,.78)":"rgba(98,72,25,.75)";ctx.font=`700 ${Math.max(9,Math.min(13,s*9))}px ${getComputedStyle(document.body).fontFamily}`;ctx.fillText(o.name,nw.x+8,nw.y+16)}ctx.restore()})
  }
  function directionVector(t){const s=String(t||"");let dx=0,dy=0;if(/东/.test(s))dx=1;if(/西/.test(s))dx=-1;if(/北/.test(s))dy=1;if(/南/.test(s))dy=-1;if(dx&&dy){dx*=.707;dy*=.707}if(!dx&&!dy)dx=1;return {dx,dy}}
  function drawLines(ctx,v,s){
    state.objects.filter(o=>o.geometryType==="line"&&o.path?.length>=2).forEach(o=>{ctx.save();ctx.strokeStyle=COLORS.river;ctx.fillStyle=COLORS.river;ctx.lineWidth=Math.max(2,Math.min(10,2.5*state.camera.zoom));ctx.lineCap="round";ctx.lineJoin="round";ctx.beginPath();o.path.forEach((pt,i)=>{const p=worldToScreen(pt[0],pt[1]);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)});ctx.stroke();const a=o.path[o.path.length-2],b=o.path[o.path.length-1],pa=worldToScreen(a[0],a[1]),pb=worldToScreen(b[0],b[1]),ang=Math.atan2(pb.y-pa.y,pb.x-pa.x);ctx.beginPath();ctx.moveTo(pb.x,pb.y);ctx.lineTo(pb.x-8*Math.cos(ang-.45),pb.y-8*Math.sin(ang-.45));ctx.lineTo(pb.x-8*Math.cos(ang+.45),pb.y-8*Math.sin(ang+.45));ctx.closePath();ctx.fill();if(state.camera.zoom>.72){const mid=o.path[Math.floor((o.path.length-1)/2)],mp=worldToScreen(mid[0],mid[1]);ctx.font="700 9px sans-serif";ctx.textBaseline="bottom";ctx.lineWidth=3;ctx.strokeStyle="rgba(245,247,246,.92)";ctx.strokeText(o.name,mp.x+6,mp.y-5);ctx.fillStyle=COLORS.river;ctx.fillText(o.name,mp.x+6,mp.y-5)}ctx.restore()})
  }
  function traceSpatialPath(ctx,o){const a=o.area;if(!a)return false;if(a.shape==="circle"){const c=worldToScreen(a.cx??o.x,a.cy??o.y),rx=Math.abs((a.radius||0)*scale());ctx.beginPath();ctx.ellipse(c.x,c.y,rx,rx,0,0,Math.PI*2);return true}if(a.shape==="polygon"&&a.points?.length){ctx.beginPath();a.points.forEach((pt,i)=>{const p=worldToScreen(pt[0],pt[1]);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y)});ctx.closePath();return true}const b=rangeBounds(a),nw=worldToScreen(b.west,b.north),se=worldToScreen(b.east,b.south);ctx.beginPath();ctx.rect(nw.x,nw.y,se.x-nw.x,se.y-nw.y);return true}
  function drawContextDimming(ctx,v){
    const search=getSearchContext(),spatial=getSpatialFocusContext();let active=false,keep=new Set(),alpha=.36;
    if(search.q){active=true;search.directCells.forEach(k=>keep.add(k));search.relatedCells.forEach(k=>keep.add(k));alpha=.38}
    else if(spatial.active){active=true;keep=spatial.memberCells;alpha=.43}
    if(!active)return;
    const gxMin=Math.floor((v.left-50)/100)-1,gxMax=Math.ceil((v.right+50)/100)+1,gyMin=Math.floor((v.bottom-50)/100)-1,gyMax=Math.ceil((v.top+50)/100)+1;
    ctx.save();ctx.fillStyle=`rgba(67,72,72,${alpha})`;
    for(let gx=gxMin;gx<=gxMax;gx++){for(let gy=gyMin;gy<=gyMax;gy++){const k=cellKey(gx,gy);if(keep.has(k))continue;const b=cellBounds(gx,gy),nw=worldToScreen(b.west,b.north),se=worldToScreen(b.east,b.south);ctx.fillRect(nw.x,nw.y,se.x-nw.x,se.y-nw.y)}}
    ctx.restore();
  }
  function drawSearchHighlights(ctx,v,s){const sc=getSearchContext();if(!sc.q)return;ctx.save();sc.relatedCells.forEach(k=>{const [gx,gy]=k.split(",").map(Number),b=cellBounds(gx,gy);if(b.east<v.left||b.west>v.right||b.north<v.bottom||b.south>v.top)return;const nw=worldToScreen(b.west,b.north),se=worldToScreen(b.east,b.south);ctx.fillStyle="rgba(50,137,103,.045)";ctx.strokeStyle="rgba(50,137,103,.42)";ctx.lineWidth=1.1;ctx.setLineDash([5,5]);ctx.fillRect(nw.x,nw.y,se.x-nw.x,se.y-nw.y);ctx.strokeRect(nw.x+.5,nw.y+.5,se.x-nw.x-1,se.y-nw.y-1)});ctx.setLineDash([]);sc.areaIds.forEach(id=>{const o=state.objects.find(x=>x.id===id);if(!o?.area||!traceSpatialPath(ctx,o))return;ctx.fillStyle="rgba(50,137,103,.075)";ctx.strokeStyle="rgba(46,124,95,.9)";ctx.lineWidth=3;ctx.setLineDash([11,6]);ctx.fill();ctx.stroke();ctx.setLineDash([])});const drawCell=(k,fill,stroke,width,glow=0)=>{const [gx,gy]=k.split(",").map(Number),b=cellBounds(gx,gy);if(b.east<v.left||b.west>v.right||b.north<v.bottom||b.south>v.top)return;const nw=worldToScreen(b.west,b.north),se=worldToScreen(b.east,b.south);ctx.save();ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=width;if(glow){ctx.shadowColor=stroke;ctx.shadowBlur=glow}ctx.fillRect(nw.x,nw.y,se.x-nw.x,se.y-nw.y);ctx.strokeRect(nw.x+width/2,nw.y+width/2,se.x-nw.x-width,se.y-nw.y-width);ctx.restore()};sc.directCells.forEach(k=>{if(sc.exactNameCells.has(k)||sc.nameCells.has(k))return;drawCell(k,"rgba(255,207,58,.10)","rgba(226,169,32,.9)",2.3,5)});sc.nameCells.forEach(k=>drawCell(k,"rgba(255,193,53,.14)","rgba(205,137,15,.98)",4,12));sc.exactNameCells.forEach(k=>drawCell(k,"rgba(183,67,48,.13)","rgba(171,54,39,1)",6,22));ctx.restore()}

  function drawOrigin(ctx,s){const p=worldToScreen(0,0),size=Math.max(6,Math.min(32,8*state.camera.zoom));ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.PI/4);ctx.fillStyle="#ad4d3d";ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.fillRect(-size/2,-size/2,size,size);ctx.strokeRect(-size/2,-size/2,size,size);ctx.restore();if(state.camera.zoom>.42){ctx.fillStyle="#7b3329";ctx.font="700 10px sans-serif";ctx.fillText("都广原点",p.x+10,p.y-10)}}

  function renderTiles(){
    if(state.precisionMode){renderPrecisionLayer();return}
    const v=visibleWorld(),cellPx=BASE_CELL_PX*state.camera.zoom;const gxMin=Math.floor((v.left-50)/100)-1,gxMax=Math.ceil((v.right+50)/100)+1,gyMin=Math.floor((v.bottom-50)/100)-1,gyMax=Math.ceil((v.top+50)/100)+1;
    const search=getSearchContext(),spatialFocus=getSpatialFocusContext(),filteredIds=new Set(search.filteredObjects.map(o=>o.id)),allMap=buildCellMap(state.objects),changed=changedObjectIds(),q=!!search.q;const fragments=[];
    for(let gy=gyMax;gy>=gyMin;gy--){for(let gx=gxMin;gx<=gxMax;gx++){
      const k=cellKey(gx,gy),all=sortObjects(allMap.get(k)||[]),visibleItems=all.filter(o=>filteredIds.has(o.id)).sort((a,b)=>searchRank(a,search.q)-searchRank(b,search.q));const occupied=all.length>0;
      if(!occupied&&!state.layers.empty&&!search.directCells.has(k)&&!search.relatedCells.has(k))continue;if(cellPx<39&&!occupied&&!search.directCells.has(k)&&!search.relatedCells.has(k))continue;
      const center=worldToScreen(cellCenter(gx),cellCenter(gy)),left=center.x-cellPx/2,top=center.y-cellPx/2,className=cellPx<44?"micro":cellPx<83?"compact":"",isChanged=all.some(o=>changed.has(o.id));
      const searchClass=!q?"":search.exactNameCells.has(k)?"search-name-exact":search.nameCells.has(k)?"search-name":search.directCells.has(k)?"search-match":search.relatedCells.has(k)?"search-related":"search-dim";
      const spatialClass=q||!spatialFocus.active?"":spatialFocus.memberCells.has(k)?"spatial-focus-member":"spatial-focus-dim";
      const contextClass=[searchClass,spatialClass].filter(Boolean).join(" ");
      fragments.push(tileHTML(gx,gy,k,all,visibleItems,left,top,cellPx,className,isChanged,contextClass,search));
    }}
    els.tileLayer.innerHTML=fragments.join("");bindTileEvents();applyV029MapDOM();
  }
  function tileCoordCode(gx,gy){const f=n=>`${n>=0?"+":"-"}${String(Math.abs(n)).padStart(3,"0")}`;return `X${f(gx)}_Y${f(gy)}`}
  function tileHTML(gx,gy,k,all,visible,left,top,size,semantic,isChanged,searchClass="",search=null){
    const q=state.filters.q.trim(),brushSelected=!!state.brushKeys?.has(k),flipped=state.flippedCell===k&&semantic!=="micro",selected=all.some(o=>o.id===state.selectedId),main=(visible[0]||all.find(o=>o.id===state.selectedId)||all.find(o=>o.geometryType==="area")||all[0]),changeBadge=isChanged&&state.layers.changes?`<span class="tile-change-badge">更改</span>`:"",pulse=state.searchPulseCell===k?"search-pulse":"",uiScale=Math.min(2.6,Math.max(.82,size/BASE_CELL_PX)),style=`left:${left}px;top:${top}px;width:${size}px;height:${size}px;--tile-ui:${uiScale}`;
    const coord=tileCoordCode(gx,gy);
    if(!all.length){return `<div class="tile empty ${brushSelected?'brush-selected':''} ${flipped?'flipped':''} ${semantic} ${searchClass} ${pulse}" data-cell="${k}" data-gx="${gx}" data-gy="${gy}" style="${style}"><div class="tile-card"><div class="tile-face tile-front"><div class="tile-content empty-layout icon-only"><div class="empty-plus">${searchClass==='search-match'?'⌕':'＋'}</div></div></div><div class="tile-face tile-back"><div class="tile-empty-back"><strong>此格尚无对象</strong><p>${coordText(cellCenter(gx),cellCenter(gy))}为主格中心</p><button data-action="add">＋ 新增第一个对象</button></div></div></div></div>`}
    const ordered=state.filters.q?[...all].sort((a,b)=>searchRank(a,q)-searchRank(b,q)):all;
    const list=ordered.map(o=>{const matched=state.filters.q&&searchRank(o,q)<5,focused=o.id===state.searchPulseObject;return `<button class="tile-object-btn ${o.id===state.selectedId?'selected':''} ${matched?'search-object-match':''} ${focused?'search-object-focus':''}" data-object-id="${esc(o.id)}"><i class="${esc(o.geometryType||'point')}"></i><span><strong>${matched?markSearchText(o.name,q):esc(o.name)}</strong><small>${esc(o.rowRef||'NEW')} · ${esc(o.type||'未分类')}</small></span></button>`}).join("");
    const showFrontName=semantic!=="micro"&&semantic!=="compact"&&size>=110;
    const frontMode=showFrontName?"icon-name":"icon-only";
    const frontNames=ordered.map(o=>o.name).filter(Boolean).join(' / ');const frontTitle=showFrontName?`<div class="tile-title-block"><h3>${q?markSearchText(frontNames||main?.name||"",q):esc(frontNames||main?.name||"未命名地块")}</h3></div>`:"";
    return `<div class="tile ${brushSelected?'brush-selected':''} ${flipped?'flipped':''} ${selected?'selected':''} ${isChanged?'changed':''} ${state.previewCell===k?'search-preview':''} ${semantic} ${searchClass} ${pulse}" data-cell="${k}" data-gx="${gx}" data-gy="${gy}" style="${style}"><div class="tile-card"><div class="tile-face tile-front">${changeBadge}<div class="tile-content ${frontMode}"><div class="tile-icon-row"><i class="type-icon featured ${esc(main?.geometryType||'point')}">${geometryIcon(main||all[0])}</i></div>${frontTitle}</div></div><div class="tile-face tile-back"><div class="tile-back-head"><span>${coord}</span><strong>${all.length}项</strong></div><div class="tile-object-stack">${list}</div><div class="tile-actions"><button data-action="drill">10里格内</button><button class="add" data-action="add">＋新增</button><button class="delete" data-action="delete">⌫删除</button></div></div></div></div>`
  }
  function bindTileEvents(){
    els.tileLayer.querySelectorAll(".tile").forEach(tile=>{
      tile.addEventListener("click",e=>{if(Date.now()<state.suppressClickUntil)return;if(e.target.closest("button"))return;const items=objectsInCellKey(tile.dataset.cell);const exited=clickOutsideSpatialFocus(tile.dataset.cell);if(exited){if(state.camera.zoom<2&&items.length)openDossierWorkspace();return}state.selectedCell=tile.dataset.cell;if(items.length&&!items.some(o=>o.id===state.selectedId))state.selectedId=items[0].id;if(state.camera.zoom<2&&items.length){state.flippedCell=null;renderDetails();scheduleRender();persist();openDossierWorkspace()}else{state.flippedCell=state.flippedCell===tile.dataset.cell?null:tile.dataset.cell;renderDetails();scheduleRender();persist()}});
      tile.addEventListener("dblclick",e=>{if(Date.now()<state.suppressClickUntil)return;e.preventDefault();openDrill(Number(tile.dataset.gx),Number(tile.dataset.gy))});
      tile.addEventListener("mouseenter",e=>{const items=sortObjects(buildCellMap(state.objects).get(tile.dataset.cell)||[]),names=items.slice(0,5).map(o=>o.name).join("、"),more=items.length>5?` 等${items.length}项`:"";showTooltip(items.length?`${names}${more} · ${state.camera.zoom<2?"单击打开地块博物志":"单击翻转"} / 双击下钻`:`空白地块 · 单击后可建档`,e.clientX,e.clientY)});
      tile.addEventListener("mousemove",e=>moveTooltip(e.clientX,e.clientY));tile.addEventListener("mouseleave",hideTooltip);
      tile.querySelectorAll("[data-object-id]").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();state.selectedCell=tile.dataset.cell;selectObject(btn.dataset.objectId)}));
      tile.querySelectorAll("[data-action='drill']").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();state.selectedCell=tile.dataset.cell;renderDetails();openDrill(Number(tile.dataset.gx),Number(tile.dataset.gy))}));
      tile.querySelectorAll("[data-action='add']").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();state.selectedCell=tile.dataset.cell;renderDetails();openObjectForm(null,{x:cellCenter(Number(tile.dataset.gx)),y:cellCenter(Number(tile.dataset.gy))})}));
      tile.querySelectorAll("[data-action='delete']").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();state.selectedCell=tile.dataset.cell;renderDetails();openDeleteModal("tile")}));
    });
  }

  function showTooltip(text,x,y){
    const node=document.elementFromPoint(x,y)?.closest?.(".tile,.precision-object-group");
    if(node?.classList.contains("tile"))showV029TileLens(node.dataset.cell,x,y);
    else if(node?.classList.contains("precision-object-group")){const id=node.querySelector("[data-precision-main]")?.dataset.precisionMain;showV029ObjectLens(id,x,y)}
    else{els.tooltip.classList.remove("lens","lens-tile","lens-object");els.tooltip.textContent=text;els.tooltip.classList.remove("hidden");moveTooltip(x,y)}
  }
  function moveTooltip(x,y){const r=els.tooltip.getBoundingClientRect(),pad=12;let left=x+14,top=y+14;if(left+r.width>innerWidth-pad)left=x-r.width-14;if(top+r.height>innerHeight-pad)top=y-r.height-14;els.tooltip.style.left=Math.max(pad,left)+"px";els.tooltip.style.top=Math.max(pad,top)+"px"}
  function hideTooltip(){els.tooltip.classList.add("hidden")}
  function selectObject(id){state.spatialFocusArmed=true;state.selectedId=id;const o=state.objects.find(x=>x.id===id);if(o){const c=objectCell(o);state.selectedCell=cellKey(c.gx,c.gy)}renderDetails();renderSidebar();scheduleRender();persist()}
  function jumpToObject(id,flip=false,smooth=false){const o=state.objects.find(x=>x.id===id);if(!o)return;state.spatialFocusArmed=true;const pulseCell=cellKey(objectCell(o).gx,objectCell(o).gy);pulseSearchTarget(pulseCell,id);state.selectedId=id;const targetCell=objectCell(o);state.selectedCell=cellKey(targetCell.gx,targetCell.gy);renderDetails();renderSidebar();const targetZoom=Math.max(state.camera.zoom,.86);if(smooth)animateCameraTo(Number(o.x)||0,Number(o.y)||0,targetZoom,()=>{if(flip){const c=objectCell(o);state.flippedCell=cellKey(c.gx,c.gy)}scheduleRender();persist()});else{state.camera.x=Number(o.x)||0;state.camera.y=Number(o.y)||0;state.camera.zoom=targetZoom;if(flip){const c=objectCell(o);state.flippedCell=cellKey(c.gx,c.gy)}scheduleRender();persist()}}
  function jumpToCell(key,flip=false){state.spatialFocusArmed=true;pulseSearchTarget(key);const [gx,gy]=String(key).split(",").map(Number);state.selectedCell=key;const items=objectsInCellKey(key);if(items[0])state.selectedId=items[0].id;renderDetails();renderSidebar();animateCameraTo(cellCenter(gx),cellCenter(gy),Math.max(state.camera.zoom,.82),()=>{if(flip)state.flippedCell=key;scheduleRender();persist()})}
  function animateCameraTo(x,y,zoom,duration=680,done=null){if(typeof duration==="function"){done=duration;duration=680}if(state.cameraAnimation)cancelAnimationFrame(state.cameraAnimation);const from={x:state.camera.x,y:state.camera.y,z:state.camera.zoom},start=performance.now();const ease=t=>1-Math.pow(1-t,3);const step=now=>{const t=Math.min(1,(now-start)/duration),e=ease(t);state.camera.x=from.x+(x-from.x)*e;state.camera.y=from.y+(y-from.y)*e;state.camera.zoom=from.z+(zoom-from.z)*e;scheduleRender();if(t<1)state.cameraAnimation=requestAnimationFrame(step);else{state.cameraAnimation=null;done&&done()}};state.cameraAnimation=requestAnimationFrame(step)}
  function jumpName(name){const o=state.objects.find(x=>x.name===name)||state.objects.find(x=>(x.name||"").includes(name));if(o)jumpToObject(o.id,true);else toast("未找到对象",name,"error")}
  function uniqueText(values){const seen=new Set(),out=[];values.flatMap(v=>String(v||"").split(/\n+/)).map(v=>v.trim()).filter(Boolean).forEach(v=>{if(!seen.has(v)){seen.add(v);out.push(v)}});return out.join("\n")}
  function objectsInCellKey(key){return sortObjects(buildCellMap(state.objects).get(key)||[])}
  function baseTileProfile(){return {briefSummary:"",basicSummary:"",detailedSummary:"",geoEnvironment:"",architecture:"",livingSpecies:"",country:"",faith:"",ruler:"",guardian:"",beasts:"",divinePlants:"",herbs:"",minerals:"",specialLife:"",customs:"",mythicEncounters:"",occurredEvents:"",timeNormal:"unknown",storyOther:"",playerReachable:"unknown",playerEnemies:"",playerPlots:"",playerLoot:"",scriptureEvents:Object.fromEntries(CHAPTERS_18.map(ch=>[ch,""]))}}
  function deriveTileProfile(items){const p=baseTileProfile();p.geoEnvironment=uniqueText(items.flatMap(o=>[o.terrain,o.water,o.range]));p.architecture=uniqueText(items.filter(o=>/城|宫|台|庙|坛|墓|冢|井|门|邑|郭|室/.test(`${o.type||""}${o.name||""}`)).map(o=>o.name));p.livingSpecies=uniqueText(items.flatMap(o=>[o.plants,o.animals,o.wildlife,o.beasts]));p.country=uniqueText(items.flatMap(o=>[/国/.test(o.name||"")?o.name:"",/国/.test(o.region||"")?o.region:""]));p.faith=uniqueText(items.map(o=>o.gods));p.beasts=uniqueText(items.flatMap(o=>[o.animals,o.wildlife,o.beasts]));p.divinePlants=uniqueText(items.flatMap(o=>[o.plants,/木|树|草|禾|植被/.test(`${o.type||""}${o.name||""}`)?o.name:""]));p.herbs=uniqueText(items.flatMap(o=>[/草|药|芝|菁|蓏|葵|薤/.test(o.plants||"")?o.plants:""]));p.minerals=uniqueText(items.map(o=>o.minerals));p.specialLife=uniqueText(items.flatMap(o=>[o.residents,o.appearance,o.abilities]));p.occurredEvents=uniqueText(items.map(o=>o.events));CHAPTERS_18.forEach(ch=>{p.scriptureEvents[ch]=uniqueText(items.filter(o=>String(o.chapter||"").includes(ch)).map(o=>o.events))});return p}
  function tileProfileFor(key,items=objectsInCellKey(key)){const derived=deriveTileProfile(items),savedProfile=state.tileProfiles[key]||{};const merged={...derived,...savedProfile};merged.scriptureEvents={...derived.scriptureEvents,...(savedProfile.scriptureEvents||{})};return merged}
  function activeTile(){let key=state.selectedCell;if(!key&&state.selectedId){const o=state.objects.find(x=>x.id===state.selectedId);if(o){const c=objectCell(o);key=cellKey(c.gx,c.gy)}}if(!key&&state.flippedCell)key=state.flippedCell;if(!key)return null;const [gx,gy]=key.split(",").map(Number);return {key,gx,gy,items:objectsInCellKey(key)}}
  function statusText(value,type){const maps=type==="time"?{unknown:"时间流逝未判定",yes:"时间流逝正常",no:"时间流逝异常",stopped:"时间停滞",loop:"时间循环"}:{unknown:"旧版可达性未判定",yes:"可达",no:"不可达",conditional:"满足条件后可抵达"};return maps[value]||maps.unknown}
  function statusClass(value){return value==="yes"?"yes":value==="no"?"no":"unknown"}
  function fieldGlyph(title){const map={"地理环境":"山","建筑群":"邑","生活物种":"生","所属国度":"国","信仰对象":"祀","统治者":"冠","守护神":"守","奇珍异兽／栖息生物":"兽","神木／神话植被":"木","仙草药草":"草","丰富矿产":"矿","特殊生命":"灵","当地风俗":"俗","文明与神话奇遇":"奇","已发生事件（综合简述）":"事","其他事件说明":"叙","旧版对象字段":"敌","旧版事件字段":"戏","旧版所得字段":"获"};return map[title]||"录"}
  function dossierField(title,value){return `<section class="dossier-field ${value?'':'empty'}"><h4><span class="field-glyph">${fieldGlyph(title)}</span>${esc(title)}</h4><div>${value?esc(value):'尚未录入'}</div></section>`}
  function objectRibbon(items){if(!items.length)return `<div class="tile-dossier-intro"><strong>空白地块档案</strong><p>本格尚无地图对象，但可以先建立环境、文明与事件资料。</p></div>`;return `<div class="tile-dossier-intro"><strong>本格对象 · ${items.length}项</strong><p>地块档案用于汇总本格整体情况；各对象仍保留独立坐标、原典与考据记录。</p></div><div class="tile-object-ribbon">${items.map(o=>`<button class="tile-object-chip ${o.id===state.selectedId?'selected':''}" data-tile-object="${esc(o.id)}" title="单击选中；双击编辑对象">${geometryIcon(o)} ${esc(o.name)}</button>`).join("")}</div>`}
  function scriptureGroupsHTML(profile){return `<div class="scripture-groups">${CHAPTER_GROUPS.map(g=>`<div class="scripture-group-title">${esc(g.name)}</div>${g.chapters.map(ch=>{const value=profile.scriptureEvents?.[ch]||"";return `<details class="scripture-event ${value?'has-content':''}" ${value?'open':''}><summary>${esc(ch)}<span>${value?`${value.split(/\n+/).filter(Boolean).length}条`:'未录入'}</span></summary><div class="scripture-body">${value?esc(value):'本经篇尚未归档该地块事件。'}</div></details>`}).join("")}`).join("")}</div>`}
  function renderDetails(){const tile=activeTile();if(!tile){els.emptyDetail.classList.remove("hidden");els.detailContent.classList.add("hidden");return}const {key,gx,gy,items}=tile,profile=tileProfileFor(key,items),b=cellBounds(gx,gy),main=items.find(o=>o.id===state.selectedId)||items.find(o=>o.geometryType==="area")||items[0];els.emptyDetail.classList.add("hidden");els.detailContent.classList.remove("hidden");els.detailRef.textContent=`TILE ${signed(gx)}, ${signed(gy)} · 100里主格`;els.detailName.textContent=main?`${main.name}所在地区`:`空白地块（${signed(gx)}, ${signed(gy)}）`;const populated=Object.values(profile.scriptureEvents||{}).filter(Boolean).length,spatialCount=items.filter(o=>o.geometryType==="area"||o.geometryType==="field").length;els.detailMeta.textContent=`${items.length}个对象 · ${populated}个经篇已有事件归档`;els.detailLocation.innerHTML=`<strong>主格中心 ${coordText(b.cx,b.cy)}</strong><br>范围 X ${signed(b.west)}～${signed(b.east)}里 · Y ${signed(b.south)}～${signed(b.north)}里<br>地块档案与格内对象资料分别保存`;els.openRangeEditorBtn.textContent=spatialCount?`▱ 编辑面积／作用域（${spatialCount}）`:`＋ 新建面积／作用域`;els.openRangeEditorBtn.classList.toggle("has-range",spatialCount>0);$$('.detail-tabs button').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab===state.detailTab));renderDetailBody(profile,items)}
  function renderDetailBody(profile,items){let html=objectRibbon(items);if(state.detailTab==="summary")html+=`<div class="dossier-section"><div class="dossier-section-head"><h3>地块简述</h3><span>环境 · 建筑 · 物种</span></div>${dossierField("地理环境",profile.geoEnvironment)}${dossierField("建筑群",profile.architecture)}${dossierField("生活物种",profile.livingSpecies)}</div>`;if(state.detailTab==="civilization")html+=`<div class="dossier-section"><div class="dossier-section-head"><h3>文明部落</h3><span>文明结构与资源生态</span></div><div class="dossier-grid">${dossierField("所属国度",profile.country)}${dossierField("信仰对象",profile.faith)}${dossierField("统治者",profile.ruler)}${dossierField("守护神",profile.guardian)}</div>${dossierField("奇珍异兽／栖息生物",profile.beasts)}<div class="dossier-grid">${dossierField("神木／神话植被",profile.divinePlants)}${dossierField("仙草药草",profile.herbs)}${dossierField("丰富矿产",profile.minerals)}${dossierField("特殊生命",profile.specialLife)}</div>${dossierField("当地风俗",profile.customs)}</div>`;if(state.detailTab==="encounters")html+=`<div class="dossier-section"><div class="dossier-section-head"><h3>文明与神话奇遇</h3><span>神迹 · 祭祀 · 文明异象 · 特殊空间</span></div>${dossierField("文明与神话奇遇",profile.mythicEncounters)}</div>`;if(state.detailTab==="story"){const reachable=profile.playerReachable==="yes"||profile.playerReachable==="conditional";html+=`<div class="dossier-section"><div class="dossier-section-head"><h3>事件</h3><span>原典事件与研究记录</span></div><div class="status-line"><span class="status-pill ${statusClass(profile.timeNormal)}">${statusText(profile.timeNormal,"time")}</span><span class="status-pill ${statusClass(profile.playerReachable)}">${statusText(profile.playerReachable,"player")}</span></div>${dossierField("已发生事件（综合简述）",profile.occurredEvents)}${dossierField("其他事件说明",profile.storyOther)}${reachable?`<div class="player-story-box"><h3>旧版附加内容</h3>${dossierField("旧版对象字段",profile.playerEnemies)}${dossierField("旧版事件字段",profile.playerPlots)}${dossierField("旧版所得字段",profile.playerLoot)}</div>`:`<div class="player-story-box disabled"><h3>旧版附加内容不展示</h3><div>只有“可以抵达”或“满足条件后可抵达”时，才显示对象、触发事件与所得记录。</div></div>`}<div class="dossier-section-head"><h3>十八经篇事件归档</h3><span>原典事件</span></div>${scriptureGroupsHTML(profile)}</div>`}els.detailBody.innerHTML=html;els.detailBody.querySelectorAll('[data-tile-object]').forEach(btn=>{btn.addEventListener('click',()=>{state.spatialFocusArmed=true;state.selectedId=btn.dataset.tileObject;renderDetails();renderSidebar();scheduleRender();persist()});btn.addEventListener('dblclick',()=>{const o=state.objects.find(x=>x.id===btn.dataset.tileObject);if(o)openObjectForm(o)})})}
  function renderScriptureEditors(profile){els.scriptureEventFields.innerHTML=CHAPTER_GROUPS.map(g=>`<div class="scripture-group-title" style="grid-column:1/-1">${esc(g.name)}</div>${g.chapters.map(ch=>`<details class="scripture-editor-item" ${(profile.scriptureEvents?.[ch]||'')?'open':''}><summary>${esc(ch)}</summary><textarea data-scripture-chapter="${esc(ch)}" placeholder="录入本地块归入《${esc(ch)}》的原典事件">${esc(profile.scriptureEvents?.[ch]||'')}</textarea></details>`).join('')}`).join('')}
  function togglePlayerFields(){const show=els.tilePlayerReachable.value==="yes"||els.tilePlayerReachable.value==="conditional";els.playerFields.classList.toggle("hidden",!show)}
  function openTileProfileForm(){const tile=activeTile();if(!tile)return;const profile=tileProfileFor(tile.key,tile.items);els.tileProfileKey.value=tile.key;els.tileProfileTitle.textContent=`编辑地块（${signed(tile.gx)}, ${signed(tile.gy)}）`;els.tileBriefSummary.value=profile.briefSummary||"";els.tileBasicSummary.value=profile.basicSummary||"";els.tileDetailedSummary.value=profile.detailedSummary||"";els.tileGeoEnvironment.value=profile.geoEnvironment||"";els.tileArchitecture.value=profile.architecture||"";els.tileLivingSpecies.value=profile.livingSpecies||"";els.tileCountry.value=profile.country||"";els.tileFaith.value=profile.faith||"";els.tileRuler.value=profile.ruler||"";els.tileGuardian.value=profile.guardian||"";els.tileBeasts.value=profile.beasts||"";els.tileDivinePlants.value=profile.divinePlants||"";els.tileHerbs.value=profile.herbs||"";els.tileMinerals.value=profile.minerals||"";els.tileSpecialLife.value=profile.specialLife||"";els.tileCustoms.value=profile.customs||"";els.tileMythicEncounters.value=profile.mythicEncounters||"";els.tileOccurredEvents.value=profile.occurredEvents||"";els.tileTimeNormal.value=profile.timeNormal||"unknown";els.tilePlayerReachable.value=profile.playerReachable||"unknown";els.tileStoryOther.value=profile.storyOther||"";els.tilePlayerEnemies.value=profile.playerEnemies||"";els.tilePlayerPlots.value=profile.playerPlots||"";els.tilePlayerLoot.value=profile.playerLoot||"";renderScriptureEditors(profile);togglePlayerFields();openModal("tileProfileModal")}
  function saveTileProfileForm(e){e.preventDefault();const key=els.tileProfileKey.value;if(!key)return;const before=state.tileProfiles[key]?structuredClone(state.tileProfiles[key]):null;const scriptureEvents=Object.fromEntries(CHAPTERS_18.map(ch=>[ch,els.scriptureEventFields.querySelector(`[data-scripture-chapter="${CSS.escape(ch)}"]`)?.value.trim()||""]));const after={briefSummary:els.tileBriefSummary.value.trim(),basicSummary:els.tileBasicSummary.value.trim(),detailedSummary:els.tileDetailedSummary.value.trim(),geoEnvironment:els.tileGeoEnvironment.value.trim(),architecture:els.tileArchitecture.value.trim(),livingSpecies:els.tileLivingSpecies.value.trim(),country:els.tileCountry.value.trim(),faith:els.tileFaith.value.trim(),ruler:els.tileRuler.value.trim(),guardian:els.tileGuardian.value.trim(),beasts:els.tileBeasts.value.trim(),divinePlants:els.tileDivinePlants.value.trim(),herbs:els.tileHerbs.value.trim(),minerals:els.tileMinerals.value.trim(),specialLife:els.tileSpecialLife.value.trim(),customs:els.tileCustoms.value.trim(),mythicEncounters:els.tileMythicEncounters.value.trim(),occurredEvents:els.tileOccurredEvents.value.trim(),timeNormal:els.tileTimeNormal.value,storyOther:els.tileStoryOther.value.trim(),playerReachable:els.tilePlayerReachable.value,playerEnemies:els.tilePlayerEnemies.value.trim(),playerPlots:els.tilePlayerPlots.value.trim(),playerLoot:els.tilePlayerLoot.value.trim(),scriptureEvents};state.tileProfiles[key]=after;recordChange({entityId:`CELL-${key}`,entityType:"tile_profile",operation:before?"update":"create",operationLabel:before?"修改地块档案":"新增地块档案",before,after:{name:`地块 ${key}`,...after},summary:`更新地块 ${key} 的环境、文明、事件与证据归档`});closeModal("tileProfileModal");renderDetails();if(!els.dossierWorkspace.classList.contains("hidden"))renderDossierWorkspace();persist();updateHeader();toast("地块档案已保存",`主格 ${key}`)}


  function shortText(value,max=92){const text=String(value||"").replace(/\s+/g," ").trim();return text?text.slice(0,max)+(text.length>max?"……":""):"尚未录入。"}
  function dossierIcon(label){const map={"地形地貌":"山","地域特征":"域","所属气候":"风","主要山脉":"岳","水系河流":"水","建筑群":"邑","生活物种":"生","所属国度":"国","信仰对象":"祀","统治者":"冠","守护神":"守","奇珍异兽":"兽","神木植被":"木","仙草药草":"草","丰富矿产":"矿","特殊生命":"灵","当地风俗":"俗","文明与神话奇遇":"奇","事件":"事","时间":"时","可达性":"行","对象":"敌","触发事件":"戏","所得记录":"获"};return map[label]||"录"}
  function iconCard(label,value){return `<article class="icon-card ${value?'':'empty'}"><div class="icon-card-head"><i>${dossierIcon(label)}</i><span>${esc(label)}</span></div><strong>${value?esc(value):'尚未录入'}</strong></article>`}
  function wideCard(label,value){return `<article class="wide-card"><h3><span class="field-glyph">${dossierIcon(label)}</span>${esc(label)}</h3><p>${value?esc(value):'尚未录入'}</p></article>`}
  function profileCompleteness(profile){const keys=["briefSummary","basicSummary","detailedSummary","geoEnvironment","architecture","livingSpecies","country","faith","ruler","guardian","beasts","divinePlants","herbs","minerals","specialLife","customs","mythicEncounters","occurredEvents","timeNormal","playerReachable"];const filled=keys.filter(k=>{const v=profile[k];return v&&v!=="unknown"}).length;const scripture=Object.values(profile.scriptureEvents||{}).filter(Boolean).length;return {filled,total:keys.length+4,scripture,percent:Math.round((filled+Math.min(4,scripture))/ (keys.length+4)*100)}}
  function selectedTileMain(items){return items.find(o=>o.id===state.selectedId)||items.find(o=>o.geometryType==="area")||items[0]||null}
  function openDossierWorkspace(){const tile=activeTile();if(!tile){toast("尚未选择地块","请先在地图中选择一个地块。","error");return}state.dossierMode="brief";state.dossierTab="overview";els.dossierWorkspace.classList.remove("hidden");renderDossierWorkspace()}
  function closeDossierWorkspace(){els.dossierWorkspace.classList.add("hidden")}
  function dossierStandardText(profile,items){const parts=[profile.geoEnvironment,profile.architecture,profile.livingSpecies,profile.country?`此地与${profile.country}相关。`:"",profile.occurredEvents].filter(Boolean);if(parts.length)return uniqueText(parts).slice(0,820);const main=selectedTileMain(items);return main?uniqueText([main.terrain,main.water,main.range,main.derivation,main.events]).slice(0,820):"本格尚无对象资料，可先建立地块档案。"}
  function makePrompt(profile,tile,main){return [`Chinese mythological environment concept art based on Shanhaijing`,main?.name||`tile ${tile.key}`,profile.geoEnvironment,profile.architecture,profile.livingSpecies,profile.country&&`civilization: ${profile.country}`,profile.faith&&`worship: ${profile.faith}`,profile.mythicEncounters&&`mythic encounters: ${profile.mythicEncounters}`,`ancient Chinese sacred landscape, restrained color, archaeological detail, no modern objects, wide establishing shot`].filter(Boolean).join(", ")}
  function makeArtBrief(profile,tile,main){return `【地块】${main?.name||tile.key}\n【坐标】主格（${signed(tile.gx)}, ${signed(tile.gy)}），中心${coordText(cellCenter(tile.gx),cellCenter(tile.gy))}\n【地理环境】${profile.geoEnvironment||"待补充"}\n【建筑群】${profile.architecture||"待补充"}\n【生活物种】${profile.livingSpecies||"待补充"}\n【文明与信仰】${uniqueText([profile.country,profile.faith,profile.ruler,profile.guardian])||"待补充"}\n【视觉重点】${uniqueText([profile.divinePlants,profile.beasts,profile.minerals,profile.specialLife])||"待补充"}\n【文明与神话奇遇】${profile.mythicEncounters||"待补充"}\n【事件氛围】${profile.occurredEvents||"待补充"}`}
  async function copyText(text,title){try{await navigator.clipboard.writeText(text);toast(title,"已复制到剪贴板") }catch{const ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();toast(title,"已复制到剪贴板")}}
  function hasText(v){return String(v||"").trim().length>0}
  function briefSummaryLayer(title,value,placeholder){return `<section class="brief-summary-layer ${hasText(value)?'has-content':'empty'}"><h3>${esc(title)}</h3><div>${hasText(value)?esc(value):esc(placeholder)}</div></section>`}
  function briefRow(label,value){if(!hasText(value))return "";return `<div class="brief-row"><h4>${esc(label)}</h4><div>${esc(value)}</div></div>`}
  function briefSection(title,rows){const body=rows.filter(Boolean).join("");return body?`<section class="brief-flow-section"><h3>${esc(title)}</h3>${body}</section>`:""}
  function renderBriefDossier(profile,items,tile,main,b){
    const summaries=`<section class="brief-summary-stack">${briefSummaryLayer("简要",profile.briefSummary,"等待录入简要文案")}${briefSummaryLayer("基础",profile.basicSummary,"等待录入基础文案")}${briefSummaryLayer("详细",profile.detailedSummary,"等待录入详细文案")}</section>`;
    const environment=briefSection("地块简述",[briefRow("地理环境",profile.geoEnvironment),briefRow("建筑群",profile.architecture),briefRow("生活物种",profile.livingSpecies)]);
    const civilization=briefSection("文明部落",[briefRow("所属国度",profile.country),briefRow("信仰对象",profile.faith),briefRow("统治者",profile.ruler),briefRow("守护神",profile.guardian),briefRow("奇珍异兽／栖息生物",profile.beasts),briefRow("神木／神话植被",profile.divinePlants),briefRow("仙草药草",profile.herbs),briefRow("丰富矿产",profile.minerals),briefRow("特殊生命",profile.specialLife),briefRow("当地风俗",profile.customs)]);
    const encounters=briefSection("文明与神话奇遇",[briefRow("文明与神话奇遇",profile.mythicEncounters)]);
    const reachable=profile.playerReachable==="yes"||profile.playerReachable==="conditional";
    const storyRows=[briefRow("已发生事件",profile.occurredEvents),profile.timeNormal&&profile.timeNormal!=="unknown"?briefRow("时间流逝",statusText(profile.timeNormal,"time")):"",briefRow("其他事件说明",profile.storyOther),profile.playerReachable&&profile.playerReachable!=="unknown"?briefRow("旧版可达性",statusText(profile.playerReachable,"player")):"",reachable?briefRow("旧版对象字段",profile.playerEnemies):"",reachable?briefRow("旧版事件字段",profile.playerPlots):"",reachable?briefRow("旧版所得字段",profile.playerLoot):""];
    const story=briefSection("事件",storyRows);
    const scriptureRows=CHAPTERS_18.map(ch=>briefRow(ch,profile.scriptureEvents?.[ch]||""));
    const scriptures=briefSection("十八经篇事件",scriptureRows);
    const objectSections=items.map(o=>{const rows=[["原文",o.original],["古注",o.annotations],["其他古籍",o.otherTexts],["异文",o.variants],["现代考证",o.modernResearch],["误传辨析",o.misconceptions],["设定与推导",o.derivation],["来源 URL",o.sourceUrl]].map(([k,v])=>briefRow(k,v));const body=rows.filter(Boolean).join("");return body?`<section class="brief-object-source"><h3>${esc(o.name)} <small>${esc(o.rowRef||"")}</small></h3>${body}</section>`:""}).filter(Boolean).join("");
    return `<div class="brief-dossier-page">${summaries}${environment}${civilization}${encounters}${story}${scriptures}${objectSections||""}</div>`;
  }
  function renderDossierWorkspace(){const tile=activeTile();if(!tile){closeDossierWorkspace();return}const {key,gx,gy,items}=tile,profile=tileProfileFor(key,items),main=selectedTileMain(items),b=cellBounds(gx,gy),complete=profileCompleteness(profile);const chapters=[...new Set(items.flatMap(o=>String(o.chapter||"").match(/《[^》]+》/g)||[]))];els.dossierWorkspace.classList.toggle("brief-mode",state.dossierMode==="brief");els.dossierWorkspace.classList.toggle("full-mode",state.dossierMode==="full");els.dossierModeBrief.classList.toggle("active",state.dossierMode==="brief");els.dossierModeFull.classList.toggle("active",state.dossierMode==="full");els.dossierPageTitle.textContent=main?`${main.name} · 地块博物志`:`空白地块 · 地块博物志`;els.dossierPageMeta.textContent=`地图数据 ${state.dataVersion} · 主格（${signed(gx)}, ${signed(gy)}） · ${items.length}个对象`;els.dossierCoordBadge.textContent=`X${signed(gx).padStart(4,"0")}_Y${signed(gy).padStart(4,"0")}`;els.dossierCardTitle.textContent=main?`${main.name}三层博物志`:`空白地块博物志`;els.dossierBrief.textContent=profile.briefSummary||shortText(profile.geoEnvironment||main?.derivation||main?.terrain,120);els.dossierStandard.textContent=profile.basicSummary||dossierStandardText(profile,items);els.dossierBadges.innerHTML=[...(chapters.length?chapters:["未标经篇"]),main?.lockStatus||"锁定状态未录入",main?.coordinateNature||"坐标性质未录入"].slice(0,5).map((x,i)=>`<span class="mono-badge ${i>0?'lock':''}">${esc(shortText(x,26))}</span>`).join("");els.dossierCompletenessText.textContent=`${complete.percent}%`;els.dossierCompletenessBar.style.width=`${complete.percent}%`;els.dossierCompletenessMeta.textContent=`核心字段 ${complete.filled}/${complete.total-4} · 已归档经篇 ${complete.scripture}/18`;els.dossierObjectCount.textContent=items.length;els.dossierObjectIndex.innerHTML=items.map(o=>`<button class="dossier-object-item ${o.id===state.selectedId?'selected':''}" data-dossier-object="${esc(o.id)}"><i>${geometryIcon(o)}</i><span><strong>${esc(o.name)}</strong><small>${esc(o.type||'未分类')} · ${coordText(o.x,o.y)}</small></span><em>${esc(o.rowRef||'NEW')}</em></button>`).join("")||`<div class="dossier-empty">本格尚无对象。</div>`;els.dossierChapterBadge.textContent=chapters.join(" · ")||"未标经篇";els.dossierHeroTitle.textContent=main?`《${main.name}》考证大卷`:`空白地块考证大卷`;$$('[data-dossier-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.dossierTab===state.dossierTab));if(state.dossierMode==="brief")els.dossierContent.innerHTML=renderBriefDossier(profile,items,tile,main,b);else renderDossierContent(profile,items,tile,main,b);els.dossierObjectIndex.querySelectorAll('[data-dossier-object]').forEach(btn=>btn.addEventListener('click',()=>{state.selectedId=btn.dataset.dossierObject;renderDetails();renderSidebar();renderDossierWorkspace();persist()}))}
  function renderDossierContent(profile,items,tile,main,b){let html="";if(state.dossierTab==="overview")html=`<section class="book-section"><div class="book-section-title"><b>I. 意象与符号构图</b><span>环境概念与场景识别</span></div><div class="icon-card-grid two">${wideCard("构图说明",shortText(uniqueText([profile.geoEnvironment,profile.architecture]),300))}${wideCard("绘图提示",shortText(makePrompt(profile,tile,main),300))}</div></section><section class="book-section"><div class="book-section-title"><b>II. 地理与生态环境</b><span>地貌、水系、气候与生物</span></div><div class="icon-card-grid">${iconCard("地形地貌",uniqueText(items.map(o=>o.terrain)))}${iconCard("地域特征",profile.geoEnvironment)}${iconCard("所属气候",uniqueText(items.map(o=>o.appearance)))}${iconCard("主要山脉",uniqueText(items.filter(o=>/山|丘|峰/.test(o.type||o.name)).map(o=>o.name)))}${iconCard("水系河流",uniqueText(items.flatMap(o=>[o.water,o.geometryType==="line"?o.name:""])))}${iconCard("生活物种",profile.livingSpecies)}</div></section><section class="book-section"><div class="book-section-title"><b>III. 地块空间信息</b><span>100里主格与对象叠层</span></div><div class="icon-card-grid">${iconCard("主格中心",coordText(b.cx,b.cy))}${iconCard("X范围",`${signed(b.west)}～${signed(b.east)}里`)}${iconCard("Y范围",`${signed(b.south)}～${signed(b.north)}里`)}</div></section>`;if(state.dossierTab==="civilization")html=`<section class="book-section"><div class="book-section-title"><b>I. 文明社会</b><span>国度、权力与祭祀体系</span></div><div class="icon-card-grid">${iconCard("所属国度",profile.country)}${iconCard("信仰对象",profile.faith)}${iconCard("统治者",profile.ruler)}${iconCard("守护神",profile.guardian)}${iconCard("建筑群",profile.architecture)}${iconCard("当地风俗",profile.customs)}</div></section><section class="book-section"><div class="book-section-title"><b>II. 神兽、植被与资源</b><span>栖息生态与特殊产出</span></div><div class="icon-card-grid">${iconCard("奇珍异兽",profile.beasts)}${iconCard("神木植被",profile.divinePlants)}${iconCard("仙草药草",profile.herbs)}${iconCard("丰富矿产",profile.minerals)}${iconCard("特殊生命",profile.specialLife)}${iconCard("生活物种",profile.livingSpecies)}</div></section>${profile.mythicEncounters?`<section class="book-section"><div class="book-section-title"><b>III. 文明与神话奇遇</b><span>神迹、祭祀与特殊遭遇</span></div>${wideCard("文明与神话奇遇",profile.mythicEncounters)}</section>`:""}`;if(state.dossierTab==="story"){const reachable=profile.playerReachable==="yes"||profile.playerReachable==="conditional";html=`<section class="book-section"><div class="book-section-title"><b>I. 事件状态</b><span>原典事件与研究记录</span></div><div class="icon-card-grid">${iconCard("时间",statusText(profile.timeNormal,"time"))}${iconCard("可达性",statusText(profile.playerReachable,"player"))}${iconCard("事件",profile.occurredEvents)}</div>${wideCard("其他事件说明",profile.storyOther)}</section>${reachable?`<section class="book-section"><div class="book-section-title"><b>II. 旧版附加内容</b><span>仅在可达或条件可达时展开</span></div><div class="icon-card-grid">${iconCard("对象",profile.playerEnemies)}${iconCard("触发事件",profile.playerPlots)}${iconCard("所得记录",profile.playerLoot)}</div></section>`:""}<section class="book-section"><div class="book-section-title"><b>III. 十八经篇事件归档</b><span>原典事件</span></div>${scriptureGroupsHTML(profile)}</section>`}if(state.dossierTab==="sources")html=items.length?items.map(o=>`<section class="source-object-block"><h3>${esc(o.name)} <small>${esc(o.rowRef||'')}</small></h3>${[["原文",o.original],["古注",o.annotations],["其他古籍",o.otherTexts],["异文",o.variants],["现代考证",o.modernResearch],["误传辨析",o.misconceptions],["设定与推导",o.derivation],["来源 URL",o.sourceUrl]].map(([k,v])=>`<details ${v?'':'class="empty"'}><summary>${k}</summary><div>${v?esc(v):'尚未录入'}</div></details>`).join("")}</section>`).join(""):`<div class="dossier-empty">本格暂无对象来源资料。</div>`;if(state.dossierTab==="history"){const ids=new Set(items.map(o=>o.id));const history=state.changes.filter(c=>ids.has(c.entityId)||c.entityId===`CELL-${tile.key}`).slice().reverse();html=history.length?`<div class="history-timeline">${history.map(c=>`<article class="history-node"><strong>${esc(c.operationLabel||c.operation||'更改')}</strong><small>${esc(c.time||'')} · 基于 ${esc(c.baseVersion||state.dataVersion)}</small><p>${esc(c.summary||'')}</p></article>`).join("")}</div>`:`<div class="dossier-empty">当前地块在本轮尚无本地修改记录。正式数据来自 ${esc(INITIAL.metadata?.sourceWorkbook||'最新版母表')}。</div>`}els.dossierContent.innerHTML=html}

  function openDrill(gx,gy){
    state.drillCell={gx,gy};const b=cellBounds(gx,gy),items=sortObjects(buildCellMap(state.objects).get(cellKey(gx,gy))||[]);els.drillTitle.textContent=`主格（${signed(gx)}, ${signed(gy)}）`;els.drillSubtitle.textContent=`范围 X ${signed(b.west)}～${signed(b.east)}里 · Y ${signed(b.south)}～${signed(b.north)}里；每小格10里`;els.drillCount.textContent=items.length;els.innerGrid.innerHTML="";
    const exactGroups=new Map();items.forEach(o=>{const k=`${Number(o.x)},${Number(o.y)}`;if(!exactGroups.has(k))exactGroups.set(k,[]);exactGroups.get(k).push(o)});
    exactGroups.forEach(group=>{const o=group[0],left=((Number(o.x)-b.west)/100)*100,top=((b.north-Number(o.y))/100)*100;const p=document.createElement("button");p.className=`inner-point ${o.geometryType||'point'}`;p.style.left=`${Math.max(0,Math.min(100,left))}%`;p.style.top=`${Math.max(0,Math.min(100,top))}%`;p.textContent=group.length>1?group.map(x=>x.name).join(" / "):geometryIcon(o);p.classList.toggle("named-overlap",group.length>1);p.title=group.map(x=>x.name).join(" / ");p.addEventListener("click",e=>{e.stopPropagation();if(group.length===1){selectObject(o.id);closeModal("drillModal")}else{els.drillObjectList.querySelector(`[data-object-id="${CSS.escape(o.id)}"]`)?.scrollIntoView({behavior:"smooth",block:"center"})}});els.innerGrid.appendChild(p);if(group.length===1){const l=document.createElement("span");l.className="inner-point-label";l.style.left=`${Math.max(0,Math.min(100,left))}%`;l.style.top=`${Math.max(0,Math.min(100,top))}%`;l.textContent=o.name;els.innerGrid.appendChild(l)}});
    els.drillObjectList.innerHTML=items.map(o=>`<button class="drill-object" data-object-id="${esc(o.id)}"><span class="type-icon ${esc(o.geometryType||'point')}">${geometryIcon(o)}</span><span><strong>${esc(o.name)}</strong><small>${coordText(o.x,o.y)} · 格内Δ(${signed((Number(o.x)||0)-b.cx)}, ${signed((Number(o.y)||0)-b.cy)})里</small></span></button>`).join("")||`<div style="font-size:10px;color:var(--muted);padding:15px 4px">本格尚无对象。可点击左侧格内位置直接新增。</div>`;
    els.drillObjectList.querySelectorAll("[data-object-id]").forEach(btn=>btn.addEventListener("click",()=>{selectObject(btn.dataset.objectId);closeModal("drillModal")}));openModal("drillModal")
  }
  function updateGeometryRangeHint(){const spatial=els.formGeometry.value==="area"||els.formGeometry.value==="field";els.geometryRangeHint.classList.toggle("hidden",!spatial)}
  function openObjectForm(o=null,coord=null){
    const isEdit=!!o;els.objectModalTitle.textContent=isEdit?`编辑：${o.name}`:"新增地图对象";els.formObjectId.value=o?.id||"";els.formName.value=o?.name||"";els.formType.value=o?.type||"";els.formX.value=coord?.x??o?.x??0;els.formY.value=coord?.y??o?.y??0;els.formChapter.value=o?.chapter||"";els.formGeometry.value=coord?.geometryType||o?.geometryType||"point";els.formLock.value=o?.lockStatus||"";els.formOriginal.value=o?.original||"";els.formDerivation.value=o?.derivation||"";updateGeometryRangeHint();els.deleteObjectBtn.classList.toggle("hidden",!isEdit);openModal("objectModal");setTimeout(()=>els.formName.focus(),80)
  }
  function defaultAreaFor(kind,x,y){return kind==="field"?{shape:"circle",cx:x,cy:y,radius:100,west:x-100,east:x+100,south:y-100,north:y+100,evidence:"project"}:{shape:"rect",west:x-50,east:x+50,south:y-50,north:y+50,evidence:"candidate"}}
  function saveObjectForm(e){
    e.preventDefault();const id=els.formObjectId.value;const values={name:els.formName.value.trim(),type:els.formType.value.trim(),x:Number(els.formX.value),y:Number(els.formY.value),chapter:els.formChapter.value.trim(),geometryType:els.formGeometry.value,lockStatus:els.formLock.value.trim(),original:els.formOriginal.value.trim(),derivation:els.formDerivation.value.trim()};if(!values.name||!Number.isFinite(values.x)||!Number.isFinite(values.y)){toast("无法保存","请填写地名与有效坐标。","error");return}let savedId=id;
    if(id){const idx=state.objects.findIndex(o=>o.id===id),before=structuredClone(state.objects[idx]);let nextArea=state.objects[idx].area;if((values.geometryType==="area"||values.geometryType==="field")&&!nextArea)nextArea=defaultAreaFor(values.geometryType,values.x,values.y);if(values.geometryType!=="area"&&values.geometryType!=="field")nextArea=null;state.objects[idx]={...state.objects[idx],...values,area:nextArea,coordinateText:coordText(values.x,values.y)};recordChange({entityId:id,operation:"update",operationLabel:"修改对象",before,after:state.objects[idx],summary:summarizeDiff(before,state.objects[idx])});state.selectedId=id;toast("已保存修改",values.name)}
    else{const next=nextObjectId(),spatial=values.geometryType==="area"||values.geometryType==="field",obj={id:next,rowRef:"NEW",...values,coordinateText:coordText(values.x,values.y),region:"",direction:"",distance:Math.hypot(values.x,values.y),reference:"",originalDistance:"",coordinateNature:"本地新增，待补充证据性质",range:"",terrain:"",water:"",plants:"",animals:"",minerals:"",wildlife:"",beasts:"",people:"",gods:"",residents:"",appearance:"",abilities:"",events:"",sameName:"",annotations:"",otherTexts:"",variants:"",modernResearch:"",commonLocation:"",popularSources:"",misconceptions:"",sourceUrl:"",area:spatial?defaultAreaFor(values.geometryType,values.x,values.y):null};state.objects.push(obj);recordChange({entityId:next,operation:"create",operationLabel:"新增对象",before:null,after:obj,summary:`新增“${values.name}”，坐标${coordText(values.x,values.y)}`});state.selectedId=next;savedId=next;const c=objectCell(obj);state.selectedCell=cellKey(c.gx,c.gy);state.flippedCell=cellKey(c.gx,c.gy);toast("已新增对象",values.name)}
    closeModal("objectModal");populateFilters();renderSidebar();renderDetails();scheduleRender();persist();updateHeader();if(values.geometryType==="area"||values.geometryType==="field")setTimeout(()=>openRangeEditor(savedId),120)
  }
  function objectNumberFromId(value){const m=String(value||"").match(/^SHJ-OBJ-(\d+)$/);return m?Number(m[1]):0}
  function maxKnownObjectNumber(){let max=0;const scan=v=>{if(!v)return;if(Array.isArray(v)){v.forEach(scan);return}if(typeof v==="string"){max=Math.max(max,objectNumberFromId(v));return}if(typeof v!=="object")return;max=Math.max(max,objectNumberFromId(v.id),objectNumberFromId(v.entityId));if(v.data)scan(v.data);if(v.objects)scan(v.objects);if(v.before)scan(v.before);if(v.after)scan(v.after);if(v.changes)scan(v.changes)};scan(state?.objects||[]);scan(state?.trash||[]);scan(state?.changes||[]);scan(state?.changeArchives||[]);return max}
  function nextObjectId(){state.nextIdCounter=Math.max(Number(state.nextIdCounter)||0,maxKnownObjectNumber())+1;return `SHJ-OBJ-${String(state.nextIdCounter).padStart(6,"0")}`}
  function summarizeDiff(a,b){const labels={name:"地名",type:"类型",x:"X坐标",y:"Y坐标",chapter:"经篇",geometryType:"几何类型",lockStatus:"锁定状态",original:"原文",derivation:"推导"};const diffs=Object.keys(labels).filter(k=>String(a?.[k]??"")!==String(b?.[k]??""));return diffs.length?`修改${diffs.map(k=>labels[k]).join("、")}`:"保存对象资料"}
  function recordChange(c){state.changes.push({...c,changeId:`CHG-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,time:new Date().toLocaleString("zh-CN"),baseVersion:state.dataVersion});updateHeader()}


  // v014 安全删除、回收站永久清理与保留策略
  function trashLabel(item){if(item.kind==="object")return item.data?.name||"地图对象";if(item.kind==="profile")return `地块档案 ${item.cellKey}`;return `地块 ${item.cellKey} 的全部内容`}
  function pushTrash(item){const now=new Date();state.trash.unshift({trashId:`TRASH-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,deletedAt:now.toLocaleString("zh-CN"),deletedAtISO:now.toISOString(),...item})}
  function cleanupExpiredTrash(showToast=false){const days=Number(state?.trashRetentionDays)||0;if(!days||!Array.isArray(state?.trash))return 0;const cutoff=Date.now()-days*86400000,before=state.trash.length;state.trash=state.trash.filter(item=>{const t=Date.parse(item.deletedAtISO||"");return !Number.isFinite(t)||t>=cutoff});const removed=before-state.trash.length;if(removed&&showToast)toast("已按保留规则清理",`${removed}项超过${days}天的回收站内容已永久删除`);return removed}
  function openDeleteModal(mode="tile",objectId=null){let tile=activeTile();const requested=objectId?state.objects.find(o=>o.id===objectId):null;if(requested){const c=objectCell(requested),key=cellKey(c.gx,c.gy);tile={key,gx:c.gx,gy:c.gy,items:objectsInCellKey(key)}}const selected=requested||(tile?.items.find(o=>o.id===state.selectedId)||tile?.items[0]||null),hasProfile=tile&&Object.prototype.hasOwnProperty.call(state.tileProfiles,tile.key),count=tile?.items.length||0;state.deleteContext={mode,objectId:selected?.id||null,cellKey:tile?.key||null};els.deleteModalMeta.textContent=tile?`当前主格（${signed(tile.gx)}, ${signed(tile.gy)}）· ${count}个对象${hasProfile?' · 已有地块档案':''}`:"请选择一个有内容的地块";els.deleteChoices.innerHTML=`
    <button class="delete-choice ${selected?'':'disabled'}" data-delete-scope="object"><i>物</i><span><strong>删除当前对象${selected?`：${esc(selected.name)}`:''}</strong><small>只移除当前选中的一个山、水、神祇、异兽或其他对象。</small></span><em>移入回收站</em></button>
    <button class="delete-choice ${hasProfile?'':'disabled'}" data-delete-scope="profile"><i>档</i><span><strong>删除地块档案</strong><small>清除地理环境、文明、事件与证据归档，不删除格内对象。</small></span><em>移入回收站</em></button>
    <button class="delete-choice ${count||hasProfile?'':'disabled'}" data-delete-scope="tile"><i>格</i><span><strong>清空本格全部内容</strong><small>删除本格${count}个对象及地块档案。地块坐标仍保留为空白格。</small></span><em>危险操作</em></button>`;els.deleteChoices.querySelectorAll('[data-delete-scope]').forEach(b=>b.addEventListener('click',()=>performDelete(b.dataset.deleteScope)));openModal("deleteModal")}
  function performDelete(scope){const tile=activeTile(),ctx=state.deleteContext||{},key=ctx.cellKey||tile?.key;if(!key)return;const items=objectsInCellKey(key),profile=state.tileProfiles[key];if(scope==="object"){const o=state.objects.find(x=>x.id===ctx.objectId);if(!o)return;pushTrash({kind:"object",cellKey:key,data:cloneJSON(o)});state.objects=state.objects.filter(x=>x.id!==o.id);recordChange({entityId:o.id,operation:"delete",operationLabel:"删除对象",before:o,after:null,summary:`将“${o.name}”移入回收站`})}else if(scope==="profile"){if(!profile)return;pushTrash({kind:"profile",cellKey:key,data:cloneJSON(profile)});delete state.tileProfiles[key];recordChange({entityId:`CELL-${key}`,operation:"delete",operationLabel:"删除地块档案",before:profile,after:null,summary:`将地块 ${key} 档案移入回收站`})}else{if(!items.length&&!profile)return;pushTrash({kind:"tile",cellKey:key,objects:cloneJSON(items),profile:cloneJSON(profile)});const ids=new Set(items.map(o=>o.id));state.objects=state.objects.filter(o=>!ids.has(o.id));delete state.tileProfiles[key];recordChange({entityId:`CELL-${key}`,operation:"delete",operationLabel:"清空地块",before:{objects:items,profile},after:null,summary:`清空地块 ${key} 的 ${items.length} 个对象与档案`})}closeModal("deleteModal");const remain=objectsInCellKey(key);state.selectedId=remain[0]?.id||null;state.selectedCell=key;state.flippedCell=remain.length?key:null;populateFilters();renderSidebar();renderDetails();scheduleRender();persist();updateHeader();toast("已移入回收站",scope==="tile"?`地块 ${key}`:scope==="profile"?`地块档案 ${key}`:"地图对象")}
  function renderTrash(){cleanupExpiredTrash(false);if(els.trashRetentionSelect)els.trashRetentionSelect.value=String(state.trashRetentionDays||0);if(els.clearTrashBtn)els.clearTrashBtn.disabled=!state.trash.length;els.trashList.innerHTML=state.trash.length?state.trash.map((item,i)=>`<article class="trash-item"><i>${item.kind==='object'?'物':item.kind==='profile'?'档':'格'}</i><span><strong>${esc(trashLabel(item))}</strong><small>${esc(item.deletedAt||'')} · ${item.kind==='tile'?`${item.objects?.length||0}个对象`:item.kind==='object'?esc(item.data?.type||'未分类'):'地块归档'}</small></span><div class="trash-item-actions"><button data-restore-index="${i}">恢复</button><button class="permanent" data-permanent-index="${i}">永久删除</button></div></article>`).join(""):`<div class="trash-empty">回收站为空。删除操作会先进入这里，不会立即永久丢失。</div>`;els.trashList.querySelectorAll('[data-restore-index]').forEach(b=>b.addEventListener('click',()=>restoreTrash(Number(b.dataset.restoreIndex))));els.trashList.querySelectorAll('[data-permanent-index]').forEach(b=>b.addEventListener('click',()=>permanentDeleteTrash(Number(b.dataset.permanentIndex))))}
  function openTrash(){cleanupExpiredTrash(false);renderTrash();updateHeader();persist();openModal("trashModal")}
  function permanentDeleteTrash(index){const item=state.trash[index];if(!item)return;if(!confirm(`永久删除“${trashLabel(item)}”？\n\n此操作无法从回收站恢复，但此前的删除更改记录仍会保留。`))return;state.trash.splice(index,1);renderTrash();persist();updateHeader();toast("已永久删除",trashLabel(item))}
  function clearTrash(){if(!state.trash.length)return;if(!confirm(`确定清空回收站中的 ${state.trash.length} 项内容？\n\n此操作无法恢复，但删除更改记录仍会保留。`))return;const count=state.trash.length;state.trash=[];renderTrash();persist();updateHeader();toast("回收站已清空",`${count}项恢复副本已永久删除`)}
  function restoreTrash(index){const item=state.trash[index];if(!item)return;if(item.kind==="object"){let o=cloneJSON(item.data);if(state.objects.some(x=>x.id===o.id))o.id=nextObjectId();state.objects.push(o);recordChange({entityId:o.id,operation:"restore",operationLabel:"恢复对象",before:null,after:o,summary:`从回收站恢复“${o.name}”`});state.selectedId=o.id;const c=objectCell(o);state.selectedCell=cellKey(c.gx,c.gy)}else if(item.kind==="profile"){state.tileProfiles[item.cellKey]=cloneJSON(item.data);recordChange({entityId:`CELL-${item.cellKey}`,operation:"restore",operationLabel:"恢复地块档案",before:null,after:item.data,summary:`恢复地块 ${item.cellKey} 档案`});state.selectedCell=item.cellKey}else{const restored=[];(item.objects||[]).forEach(raw=>{const o=cloneJSON(raw);if(state.objects.some(x=>x.id===o.id))o.id=nextObjectId();state.objects.push(o);restored.push(o)});if(item.profile)state.tileProfiles[item.cellKey]=cloneJSON(item.profile);recordChange({entityId:`CELL-${item.cellKey}`,operation:"restore",operationLabel:"恢复地块",before:null,after:{objects:restored,profile:item.profile},summary:`恢复地块 ${item.cellKey} 的 ${restored.length} 个对象与档案`});state.selectedCell=item.cellKey;state.selectedId=restored[0]?.id||null}state.trash.splice(index,1);populateFilters();renderTrash();renderSidebar();renderDetails();scheduleRender();persist();updateHeader();toast("已恢复",trashLabel(item))}


  // v007 面积与作用域编辑器
  function cloneJSON(v){return v==null?v:JSON.parse(JSON.stringify(v))}
  function isSpatialObject(o){return !!o&&(o.geometryType==="area"||o.geometryType==="field")}
  function rangeBounds(d){
    if(!d)return {west:0,east:0,south:0,north:0};
    if(d.shape==="circle"){const cx=Number(d.cx)||0,cy=Number(d.cy)||0,r=Math.max(.1,Number(d.radius)||0);return {west:cx-r,east:cx+r,south:cy-r,north:cy+r}}
    if(d.shape==="polygon"&&d.points?.length){const xs=d.points.map(p=>Number(p[0])||0),ys=d.points.map(p=>Number(p[1])||0);return {west:Math.min(...xs),east:Math.max(...xs),south:Math.min(...ys),north:Math.max(...ys)}}
    return {west:Number(d.west)||0,east:Number(d.east)||0,south:Number(d.south)||0,north:Number(d.north)||0}
  }
  function rangeCenter(d){const b=rangeBounds(d);return {x:(b.west+b.east)/2,y:(b.south+b.north)/2}}
  function normalizeRangeDraft(o){
    const src=cloneJSON(o?.area)||defaultAreaFor(o?.geometryType||"area",Number(o?.x)||0,Number(o?.y)||0);src.evidence=src.evidence||((o?.geometryType==="field")?"project":"candidate");
    if(src.shape==="circle"){src.cx=Number(src.cx??o?.x??0);src.cy=Number(src.cy??o?.y??0);src.radius=Math.max(.1,Number(src.radius)||100)}
    else if(src.shape==="polygon"){src.points=(src.points||[]).map(p=>[Number(p[0])||0,Number(p[1])||0]);if(src.points.length<3){const x=Number(o?.x)||0,y=Number(o?.y)||0;src.points=[[x-50,y-50],[x+50,y-50],[x+50,y+50],[x-50,y+50]]}}
    else{src.shape=src.shape==="square"?"square":"rect";const x=Number(o?.x)||0,y=Number(o?.y)||0;if(!Number.isFinite(Number(src.west))){src.west=x-50;src.east=x+50;src.south=y-50;src.north=y+50}}
    return src
  }
  function currentRangeObject(){return state.objects.find(o=>o.id===state.rangeEditor.objectId)||null}
  function rangeObjectsForList(){
    const tile=activeTile(),inTile=(tile?.items||[]).filter(isSpatialObject),selected=currentRangeObject();
    const ids=new Set(inTile.map(o=>o.id));if(selected&&!ids.has(selected.id))inTile.unshift(selected);
    return inTile.length?inTile:state.objects.filter(isSpatialObject).slice(0,80)
  }
  function openRangeEditor(targetId=null){
    const tile=activeTile();let target=state.objects.find(o=>o.id===targetId&&isSpatialObject(o));
    if(!target){const selected=state.objects.find(o=>o.id===state.selectedId);if(isSpatialObject(selected))target=selected}
    if(!target)target=(tile?.items||[]).find(isSpatialObject)||null;
    els.rangeWorkspace.classList.remove("hidden");renderRangeObjectList();
    if(target)selectRangeObject(target.id,true);else{state.rangeEditor.objectId=null;state.rangeEditor.draft=null;state.rangeEditor.original=null;syncRangeInspector();drawRangeEditor()}
    setTimeout(()=>{resizeRangeCanvas();drawRangeEditor()},40)
  }
  function closeRangeEditor(){els.rangeWorkspace.classList.add("hidden");state.rangeEditor.pointer=null;state.rangeEditor.polygonDrawing=false}
  function renderRangeObjectList(){
    const items=rangeObjectsForList();els.rangeObjectCount.textContent=items.length;
    els.rangeObjectList.innerHTML=items.map(o=>`<button class="range-object-item ${o.geometryType==='field'?'field':''} ${o.id===state.rangeEditor.objectId?'selected':''}" data-range-object="${esc(o.id)}"><i>${o.geometryType==='field'?'◎':'▣'}</i><span><strong>${esc(o.name)}</strong><small>${o.geometryType==='field'?'作用域':'面积'} · ${o.area?rangeShapeLabel(o.area.shape):'尚未绘制范围'}</small></span><em>${esc(o.rowRef||'NEW')}</em></button>`).join("")||`<div class="range-inspector-empty">本格尚无面积或作用域对象。</div>`;
    els.rangeObjectList.querySelectorAll("[data-range-object]").forEach(btn=>btn.addEventListener("click",()=>selectRangeObject(btn.dataset.rangeObject,true)))
  }
  function rangeShapeLabel(shape){return ({rect:"矩形",square:"正方形",circle:"圆形",polygon:"多边形"})[shape]||"未定义"}
  function selectRangeObject(id,fit=false){
    const o=state.objects.find(x=>x.id===id);if(!isSpatialObject(o))return;
    state.rangeEditor.objectId=id;state.rangeEditor.original=cloneJSON(o);state.rangeEditor.draft=normalizeRangeDraft(o);state.rangeEditor.history=[];state.rangeEditor.polygonDrawing=false;state.rangeEditor.tool="select";setRangeTool("select");
    const c=rangeCenter(state.rangeEditor.draft);state.rangeEditor.camera={x:c.x,y:c.y};state.selectedId=o.id;const cell=objectCell(o);state.selectedCell=cellKey(cell.gx,cell.gy);renderRangeObjectList();syncRangeInspector();if(fit)fitRangeEditor();else drawRangeEditor();persist()
  }
  function syncRangeInspector(){
    const o=currentRangeObject(),d=state.rangeEditor.draft,has=!!(o&&d);els.rangeInspectorEmpty.classList.toggle("hidden",has);els.rangeInspector.classList.toggle("hidden",!has);els.rangeEmptyState.classList.toggle("hidden",has);els.rangeSaveBtn.disabled=!has;els.rangeUndoBtn.disabled=!has||!state.rangeEditor.history.length;els.rangeResetBtn.disabled=!has;
    if(!has){els.rangeObjectBadge.textContent="未选择对象";els.rangePageMeta.textContent="选择面积或作用域对象后，在地图上直接绘制和拖拽。";return}
    const b=rangeBounds(d),c=rangeCenter(d),w=Math.max(.1,b.east-b.west),h=Math.max(.1,b.north-b.south);
    els.rangeObjectBadge.textContent=`${o.geometryType==='field'?'作用域':'面积'} · ${o.name}`;els.rangePageMeta.textContent=`${o.name} · ${coordText(c.x,c.y)} · ${rangeShapeLabel(d.shape)}`;els.rangeName.value=o.name;els.rangeKind.value=o.geometryType;els.rangeShape.value=d.shape;els.rangeEvidence.value=d.evidence==="hard"?"hard":d.evidence==="project"?"project":"candidate";els.rangeCenterX.value=fmt(c.x,2);els.rangeCenterY.value=fmt(c.y,2);els.rangeWidth.value=fmt(w,2);els.rangeHeight.value=fmt(h,2);els.rangeRadius.value=fmt(d.radius||Math.max(w,h)/2,2);els.rangePoints.value=d.shape==="polygon"?(d.points||[]).map(p=>`${fmt(p[0],2)}, ${fmt(p[1],2)}`).join("\n"):"";
    els.rangeRectFields.classList.toggle("hidden",d.shape==="circle"||d.shape==="polygon");els.rangeCircleFields.classList.toggle("hidden",d.shape!=="circle");els.rangePolygonFields.classList.toggle("hidden",d.shape!=="polygon");renderRangeAnalysis();renderRangeObjectList();drawRangeEditor()
  }
  function renderRangeAnalysis(){
    const d=state.rangeEditor.draft;if(!d){els.rangeAnalysis.textContent="等待选择对象。";return}const b=rangeBounds(d),c=rangeCenter(d),w=b.east-b.west,h=b.north-b.south;
    let cells=0;const gx0=cellIndex(b.west),gx1=cellIndex(b.east),gy0=cellIndex(b.south),gy1=cellIndex(b.north);for(let gx=gx0-1;gx<=gx1+1;gx++)for(let gy=gy0-1;gy<=gy1+1;gy++){const cb=cellBounds(gx,gy);if(rangeIntersectsCell(d,cb))cells++}
    const inside=state.objects.filter(o=>o.id!==state.rangeEditor.objectId&&pointInRange(Number(o.x)||0,Number(o.y)||0,d));
    els.rangeAnalysis.innerHTML=`<div class="range-analysis-grid"><span>中心：<b>${coordText(c.x,c.y)}</b></span><span>形状：<b>${rangeShapeLabel(d.shape)}</b></span><span>东西尺度：<b>${fmt(w)}里</b></span><span>南北尺度：<b>${fmt(h)}里</b></span><span>覆盖主格：<b>${cells}格</b></span><span>锚点叠层：<b>${inside.length}项</b></span><span>西／东界：${fmt(b.west)} / ${fmt(b.east)}</span><span>南／北界：${fmt(b.south)} / ${fmt(b.north)}</span></div><div class="range-analysis-note">几何落入不自动代表文本归属。保存后仍需在叠层关系中判定“明确包含、候选叠层或冲突”。</div>`
  }
  function pointInRange(x,y,d){
    if(d.shape==="circle")return Math.hypot(x-(Number(d.cx)||0),y-(Number(d.cy)||0))<=Number(d.radius||0);
    if(d.shape==="polygon")return pointInPolygon(x,y,d.points||[]);
    const b=rangeBounds(d);return x>=b.west&&x<=b.east&&y>=b.south&&y<=b.north
  }
  function pointInPolygon(x,y,pts){let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const xi=pts[i][0],yi=pts[i][1],xj=pts[j][0],yj=pts[j][1];const intersect=((yi>y)!=(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi||1e-9)+xi);if(intersect)inside=!inside}return inside}
  function rangeIntersectsCell(d,cb){
    const b=rangeBounds(d);if(b.east<=cb.west||b.west>=cb.east||b.north<=cb.south||b.south>=cb.north)return false;
    if(d.shape==="circle"){const cx=Math.max(cb.west,Math.min(d.cx,cb.east)),cy=Math.max(cb.south,Math.min(d.cy,cb.north));return Math.hypot(cx-d.cx,cy-d.cy)<=d.radius}
    if(d.shape==="polygon"){const pts=[[cb.west,cb.south],[cb.east,cb.south],[cb.east,cb.north],[cb.west,cb.north]];return pts.some(p=>pointInPolygon(p[0],p[1],d.points||[]))||(d.points||[]).some(p=>p[0]>=cb.west&&p[0]<=cb.east&&p[1]>=cb.south&&p[1]<=cb.north)}return true
  }
  function resizeRangeCanvas(){if(!els.rangeViewport?.clientWidth)return;const r=els.rangeViewport.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);els.rangeCanvas.width=Math.max(1,Math.round(r.width*dpr));els.rangeCanvas.height=Math.max(1,Math.round(r.height*dpr));els.rangeCanvas.style.width=r.width+"px";els.rangeCanvas.style.height=r.height+"px"}
  function rangeScale(){return .62*state.rangeEditor.zoom}
  function rangeWorldToScreen(x,y){const r=els.rangeViewport.getBoundingClientRect(),s=rangeScale(),c=state.rangeEditor.camera;return {x:r.width/2+(x-c.x)*s,y:r.height/2-(y-c.y)*s}}
  function rangeScreenToWorld(clientX,clientY){const r=els.rangeViewport.getBoundingClientRect(),s=rangeScale(),c=state.rangeEditor.camera;return {x:c.x+(clientX-r.left-r.width/2)/s,y:c.y-(clientY-r.top-r.height/2)/s}}
  function snapRange(v){const step=Number(state.rangeEditor.snap)||1;return Math.round(v/step)*step}
  function drawRangeEditor(){
    if(!els.rangeCanvas?.width)return;const ctx=els.rangeCanvas.getContext("2d"),r=els.rangeViewport.getBoundingClientRect(),dpr=els.rangeCanvas.width/r.width;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,r.width,r.height);ctx.fillStyle="#d8ceb5";ctx.fillRect(0,0,r.width,r.height);drawRangeGrid(ctx,r);
    state.objects.filter(isSpatialObject).forEach(o=>{if(o.id===state.rangeEditor.objectId||!o.area)return;drawOneRange(ctx,o.area,o.geometryType,"ghost",o.name)});
    state.objects.filter(o=>!isSpatialObject(o)).forEach(o=>{const p=rangeWorldToScreen(Number(o.x)||0,Number(o.y)||0);if(p.x<-80||p.x>r.width+80||p.y<-30||p.y>r.height+30)return;ctx.beginPath();ctx.fillStyle="rgba(31,109,90,.38)";ctx.arc(p.x,p.y,3.2,0,Math.PI*2);ctx.fill();if(state.rangeEditor.zoom>.7)drawRangeTextLabel(ctx,o.name,p.x+7,p.y-7,"point")});
    if(state.rangeEditor.draft){drawOneRange(ctx,state.rangeEditor.draft,currentRangeObject()?.geometryType||"area","active",currentRangeObject()?.name||"当前范围");drawRangeHandles(ctx)}
  }
  function drawRangeGrid(ctx,r){const s=rangeScale(),c=state.rangeEditor.camera,left=c.x-r.width/(2*s),right=c.x+r.width/(2*s),bottom=c.y-r.height/(2*s),top=c.y+r.height/(2*s);let minor=state.rangeEditor.zoom>1.15?10:100;ctx.lineWidth=1;for(let x=Math.floor(left/minor)*minor;x<=right;x+=minor){const p=rangeWorldToScreen(x,0),major=Math.abs(x%100)<.001;ctx.strokeStyle=major?"rgba(99,83,53,.35)":"rgba(99,83,53,.11)";ctx.beginPath();ctx.moveTo(Math.round(p.x)+.5,0);ctx.lineTo(Math.round(p.x)+.5,r.height);ctx.stroke()}for(let y=Math.floor(bottom/minor)*minor;y<=top;y+=minor){const p=rangeWorldToScreen(0,y),major=Math.abs(y%100)<.001;ctx.strokeStyle=major?"rgba(99,83,53,.35)":"rgba(99,83,53,.11)";ctx.beginPath();ctx.moveTo(0,Math.round(p.y)+.5);ctx.lineTo(r.width,Math.round(p.y)+.5);ctx.stroke()}const z=rangeWorldToScreen(0,0);ctx.strokeStyle="rgba(89,52,41,.48)";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(z.x,0);ctx.lineTo(z.x,r.height);ctx.moveTo(0,z.y);ctx.lineTo(r.width,z.y);ctx.stroke()}
  function drawOneRange(ctx,d,kind,mode,label=""){
    const active=mode==="active",field=kind==="field";ctx.save();ctx.fillStyle=active?(field?"rgba(173,77,61,.18)":"rgba(155,120,47,.24)"):(field?"rgba(173,77,61,.055)":"rgba(97,86,62,.06)");ctx.strokeStyle=active?(field?"#ad4d3d":"#806321"):(field?"rgba(173,77,61,.34)":"rgba(83,76,61,.30)");ctx.lineWidth=active?2.5:1.2;ctx.setLineDash(field?[8,6]:mode==="ghost"?[5,5]:[]);ctx.beginPath();
    let anchor={x:0,y:0};if(d.shape==="circle"){const c=rangeWorldToScreen(d.cx,d.cy),rr=Math.abs(d.radius*rangeScale());ctx.arc(c.x,c.y,rr,0,Math.PI*2);anchor={x:c.x-rr+8,y:c.y-rr+8}}else if(d.shape==="polygon"){let xs=[],ys=[];(d.points||[]).forEach((pt,i)=>{const p=rangeWorldToScreen(pt[0],pt[1]);xs.push(p.x);ys.push(p.y);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});if((d.points||[]).length>2)ctx.closePath();anchor={x:Math.min(...xs,0)+8,y:Math.min(...ys,0)+8}}else{const b=rangeBounds(d),nw=rangeWorldToScreen(b.west,b.north),se=rangeWorldToScreen(b.east,b.south);ctx.rect(nw.x,nw.y,se.x-nw.x,se.y-nw.y);anchor={x:nw.x+8,y:nw.y+8}}ctx.fill();ctx.stroke();ctx.restore();if(label)drawRangeTextLabel(ctx,active?`正在编辑 · ${label}`:label,anchor.x,anchor.y,field?"field":active?"active":"area")
  }
  function drawRangeTextLabel(ctx,text,x,y,kind="area"){
    const label=String(text||"").trim();if(!label)return;ctx.save();ctx.font=`700 ${kind==="active"?11:9}px sans-serif`;ctx.textBaseline="top";const maxW=190,padX=6,padY=4,raw=ctx.measureText(label).width,shown=raw>maxW?label.slice(0,Math.max(5,Math.floor(label.length*maxW/raw)-1))+"…":label,w=Math.min(maxW,ctx.measureText(shown).width)+padX*2,h=(kind==="active"?11:9)+padY*2;x=Math.max(4,Math.min(x,els.rangeViewport.clientWidth-w-4));y=Math.max(4,Math.min(y,els.rangeViewport.clientHeight-h-4));ctx.fillStyle=kind==="field"?"rgba(255,245,241,.94)":kind==="active"?"rgba(255,251,235,.96)":"rgba(251,249,242,.90)";ctx.strokeStyle=kind==="field"?"rgba(173,77,61,.72)":kind==="active"?"rgba(128,99,33,.9)":"rgba(83,76,61,.48)";ctx.lineWidth=1;ctx.beginPath();ctx.roundRect(x,y,w,h,4);ctx.fill();ctx.stroke();ctx.fillStyle=kind==="field"?"#8d392e":kind==="point"?"#1f6d5a":"#574a30";ctx.fillText(shown,x+padX,y+padY);ctx.restore()
  }
  function rangeHandlePositions(){const d=state.rangeEditor.draft;if(!d)return [];if(d.shape==="circle"){return [{name:"c",...rangeWorldToScreen(d.cx,d.cy)},{name:"r",...rangeWorldToScreen(d.cx+d.radius,d.cy)}]}if(d.shape==="polygon")return (d.points||[]).map((p,i)=>({name:`v${i}`,...rangeWorldToScreen(p[0],p[1])}));const b=rangeBounds(d),mx=(b.west+b.east)/2,my=(b.south+b.north)/2;return [["nw",b.west,b.north],["n",mx,b.north],["ne",b.east,b.north],["e",b.east,my],["se",b.east,b.south],["s",mx,b.south],["sw",b.west,b.south],["w",b.west,my],["c",mx,my]].map(([name,x,y])=>({name,...rangeWorldToScreen(x,y)}))}
  function drawRangeHandles(ctx){rangeHandlePositions().forEach(h=>{ctx.beginPath();ctx.fillStyle=h.name==="c"?"#ad4d3d":"#fffdf7";ctx.strokeStyle="#735a22";ctx.lineWidth=2;ctx.rect(h.x-5,h.y-5,10,10);ctx.fill();ctx.stroke()})}
  function hitRange(clientX,clientY){const r=els.rangeViewport.getBoundingClientRect(),x=clientX-r.left,y=clientY-r.top;for(const h of rangeHandlePositions())if(Math.hypot(x-h.x,y-h.y)<=10)return {type:"handle",name:h.name};const w=rangeScreenToWorld(clientX,clientY);if(pointInRange(w.x,w.y,state.rangeEditor.draft))return {type:"inside"};return null}
  function pushRangeHistory(){if(!state.rangeEditor.draft)return;state.rangeEditor.history.push(cloneJSON(state.rangeEditor.draft));if(state.rangeEditor.history.length>30)state.rangeEditor.history.shift();els.rangeUndoBtn.disabled=false}
  function undoRange(){const prev=state.rangeEditor.history.pop();if(!prev)return;state.rangeEditor.draft=prev;syncRangeInspector()}
  function resetRange(){if(!state.rangeEditor.original)return;pushRangeHistory();state.rangeEditor.draft=normalizeRangeDraft(state.rangeEditor.original);syncRangeInspector();fitRangeEditor()}
  function setRangeTool(tool){state.rangeEditor.tool=tool;els.rangeViewport.dataset.tool=tool;$$('[data-range-tool]').forEach(b=>b.classList.toggle('active',b.dataset.rangeTool===tool));const hints={select:"选择工具：拖动中心、边界或顶点修改范围",rect:"矩形框选：按住鼠标拖出面积边界",circle:"圆形作用域：从中心向外拖动确定半径",polygon:"多边形：单击添加顶点，双击结束",pan:"平移视图：拖动查看其他区域"};els.rangeToolHint.textContent=hints[tool]||""}
  function fitRangeEditor(){const d=state.rangeEditor.draft;if(!d)return;const b=rangeBounds(d),r=els.rangeViewport.getBoundingClientRect(),w=Math.max(100,b.east-b.west),h=Math.max(100,b.north-b.south);state.rangeEditor.camera=rangeCenter(d);state.rangeEditor.zoom=Math.max(.22,Math.min(5,Math.min((r.width-150)/(w*.62),(r.height-150)/(h*.62))));drawRangeEditor()}
  function convertRangeShape(shape){const d=state.rangeEditor.draft;if(!d)return;pushRangeHistory();const b=rangeBounds(d),c=rangeCenter(d),w=Math.max(10,b.east-b.west),h=Math.max(10,b.north-b.south);if(shape==="circle")state.rangeEditor.draft={shape:"circle",cx:c.x,cy:c.y,radius:Math.max(w,h)/2,evidence:d.evidence};else if(shape==="polygon")state.rangeEditor.draft={shape:"polygon",points:[[b.west,b.south],[b.east,b.south],[b.east,b.north],[b.west,b.north]],evidence:d.evidence};else{const size=shape==="square"?Math.max(w,h):null;state.rangeEditor.draft={shape,evidence:d.evidence,west:c.x-(size||w)/2,east:c.x+(size||w)/2,south:c.y-(size||h)/2,north:c.y+(size||h)/2}}syncRangeInspector()}
  function updateRangeFromInputs(){const d=state.rangeEditor.draft;if(!d)return;const cx=Number(els.rangeCenterX.value),cy=Number(els.rangeCenterY.value),w=Math.max(.1,Number(els.rangeWidth.value)||1),h=Math.max(.1,Number(els.rangeHeight.value)||1),r=Math.max(.1,Number(els.rangeRadius.value)||1);d.evidence=els.rangeEvidence.value;if(d.shape==="circle"){d.cx=cx;d.cy=cy;d.radius=r}else if(d.shape==="polygon"){const old=rangeCenter(d),dx=cx-old.x,dy=cy-old.y;d.points=(d.points||[]).map(p=>[p[0]+dx,p[1]+dy])}else{const hh=d.shape==="square"?w:h;d.west=cx-w/2;d.east=cx+w/2;d.south=cy-hh/2;d.north=cy+hh/2}renderRangeAnalysis();drawRangeEditor()}
  function updateRangePoints(){const lines=els.rangePoints.value.split(/\n+/).map(x=>x.trim()).filter(Boolean),pts=[];for(const line of lines){const m=line.match(/^([+-]?\d+(?:\.\d+)?)\s*[,，]\s*([+-]?\d+(?:\.\d+)?)$/);if(m)pts.push([Number(m[1]),Number(m[2])])}if(pts.length>=3){state.rangeEditor.draft.points=pts;renderRangeAnalysis();drawRangeEditor()}}
  function rangePointerDown(e){if(e.button!==0||!state.rangeEditor.draft)return;const tool=state.rangeEditor.tool,w=rangeScreenToWorld(e.clientX,e.clientY),sn={x:snapRange(w.x),y:snapRange(w.y)};if(tool==="polygon")return;pushRangeHistory();let mode=tool,handle=null;if(tool==="select"){const hit=hitRange(e.clientX,e.clientY);if(!hit){state.rangeEditor.history.pop();return}mode=hit.type==="inside"?"move":"handle";handle=hit.name}state.rangeEditor.pointer={mode,handle,start:sn,startRaw:w,startDraft:cloneJSON(state.rangeEditor.draft),startCamera:cloneJSON(state.rangeEditor.camera),client:{x:e.clientX,y:e.clientY}};els.rangeViewport.setPointerCapture(e.pointerId);els.rangeViewport.classList.add("dragging")}
  function rangePointerMove(e){const w=rangeScreenToWorld(e.clientX,e.clientY),sn={x:snapRange(w.x),y:snapRange(w.y)};els.rangeCursorStatus.textContent=coordText(sn.x,sn.y);const p=state.rangeEditor.pointer;if(!p)return;const dx=sn.x-p.start.x,dy=sn.y-p.start.y,d=p.startDraft;
    if(p.mode==="pan"){const s=rangeScale();state.rangeEditor.camera.x=p.startCamera.x-(e.clientX-p.client.x)/s;state.rangeEditor.camera.y=p.startCamera.y+(e.clientY-p.client.y)/s;drawRangeEditor();return}
    if(p.mode==="rect"){state.rangeEditor.draft={shape:"rect",west:Math.min(p.start.x,sn.x),east:Math.max(p.start.x,sn.x),south:Math.min(p.start.y,sn.y),north:Math.max(p.start.y,sn.y),evidence:d.evidence};syncRangeInspector();return}
    if(p.mode==="circle"){state.rangeEditor.draft={shape:"circle",cx:p.start.x,cy:p.start.y,radius:Math.max(.1,Math.hypot(sn.x-p.start.x,sn.y-p.start.y)),evidence:d.evidence};syncRangeInspector();return}
    if(p.mode==="move"){if(d.shape==="circle"){state.rangeEditor.draft={...d,cx:d.cx+dx,cy:d.cy+dy}}else if(d.shape==="polygon"){state.rangeEditor.draft={...d,points:d.points.map(pt=>[pt[0]+dx,pt[1]+dy])}}else state.rangeEditor.draft={...d,west:d.west+dx,east:d.east+dx,south:d.south+dy,north:d.north+dy};syncRangeInspector();return}
    if(p.mode==="handle"){if(d.shape==="circle"){if(p.handle==="c")state.rangeEditor.draft={...d,cx:d.cx+dx,cy:d.cy+dy};else state.rangeEditor.draft={...d,radius:Math.max(.1,Math.hypot(sn.x-d.cx,sn.y-d.cy))}}else if(d.shape==="polygon"){const idx=Number(p.handle.slice(1)),pts=d.points.map(pt=>pt.slice());pts[idx]=[sn.x,sn.y];state.rangeEditor.draft={...d,points:pts}}else{let b={west:d.west,east:d.east,south:d.south,north:d.north};if(p.handle==="c")b={west:d.west+dx,east:d.east+dx,south:d.south+dy,north:d.north+dy};else{if(p.handle.includes("w"))b.west=sn.x;if(p.handle.includes("e"))b.east=sn.x;if(p.handle.includes("n"))b.north=sn.y;if(p.handle.includes("s"))b.south=sn.y;if(p.handle==="n")b.north=sn.y;if(p.handle==="s")b.south=sn.y;if(p.handle==="e")b.east=sn.x;if(p.handle==="w")b.west=sn.x;if(b.west>b.east)[b.west,b.east]=[b.east,b.west];if(b.south>b.north)[b.south,b.north]=[b.north,b.south];if(d.shape==="square"){const c={x:(b.west+b.east)/2,y:(b.south+b.north)/2},size=Math.max(b.east-b.west,b.north-b.south);b={west:c.x-size/2,east:c.x+size/2,south:c.y-size/2,north:c.y+size/2}}}state.rangeEditor.draft={...d,...b}}syncRangeInspector()}
  }
  function rangePointerUp(e){if(!state.rangeEditor.pointer)return;state.rangeEditor.pointer=null;els.rangeViewport.classList.remove("dragging");try{els.rangeViewport.releasePointerCapture(e.pointerId)}catch{}syncRangeInspector()}
  function rangeCanvasClick(e){if(state.rangeEditor.tool!=="polygon"||!state.rangeEditor.draft)return;const w=rangeScreenToWorld(e.clientX,e.clientY),p=[snapRange(w.x),snapRange(w.y)];if(!state.rangeEditor.polygonDrawing){pushRangeHistory();state.rangeEditor.draft={shape:"polygon",points:[],evidence:state.rangeEditor.draft.evidence};state.rangeEditor.polygonDrawing=true}state.rangeEditor.draft.points.push(p);drawRangeEditor();renderRangeAnalysis()}
  function rangeCanvasDblClick(e){if(state.rangeEditor.tool!=="polygon")return;e.preventDefault();const pts=state.rangeEditor.draft?.points||[];if(pts.length>=2){const a=pts[pts.length-1],b=pts[pts.length-2];if(Math.hypot(a[0]-b[0],a[1]-b[1])<Math.max(1,state.rangeEditor.snap*.2))pts.pop()}if(pts.length<3){toast("多边形尚未完成","至少需要3个顶点。","error");return}state.rangeEditor.polygonDrawing=false;setRangeTool("select");syncRangeInspector()}
  function rangeWheel(e){e.preventDefault();const before=rangeScreenToWorld(e.clientX,e.clientY),factor=e.deltaY>0?.86:1.16;state.rangeEditor.zoom=Math.max(.15,Math.min(8,state.rangeEditor.zoom*factor));const after=rangeScreenToWorld(e.clientX,e.clientY);state.rangeEditor.camera.x+=before.x-after.x;state.rangeEditor.camera.y+=before.y-after.y;drawRangeEditor()}
  function saveRangeEditor(){const o=currentRangeObject(),d=state.rangeEditor.draft;if(!o||!d)return;const idx=state.objects.findIndex(x=>x.id===o.id),before=cloneJSON(state.objects[idx]),kind=els.rangeKind.value,c=rangeCenter(d),normalized=cloneJSON(d);normalized.evidence=els.rangeEvidence.value;const b=rangeBounds(normalized);normalized.west=b.west;normalized.east=b.east;normalized.south=b.south;normalized.north=b.north;state.objects[idx]={...state.objects[idx],geometryType:kind,x:c.x,y:c.y,coordinateText:coordText(c.x,c.y),area:normalized};state.selectedId=o.id;const cell=objectCell(state.objects[idx]);state.selectedCell=cellKey(cell.gx,cell.gy);recordChange({entityType:"geometry",entityId:o.id,operation:"update",operationLabel:kind==="field"?"修改作用域":"修改面积范围",before,after:state.objects[idx],summary:`${rangeShapeLabel(normalized.shape)} · ${fmt(b.east-b.west)}×${fmt(b.north-b.south)}里 · 中心${coordText(c.x,c.y)}`});persist();renderSidebar();renderDetails();scheduleRender();updateHeader();closeRangeEditor();animateCameraTo(c.x,c.y,Math.max(state.camera.zoom,.65),()=>{state.flippedCell=state.selectedCell;scheduleRender()});toast("空间范围已保存",`${o.name} · ${rangeShapeLabel(normalized.shape)}`)}
  function createSpatialObject(kind){const tile=activeTile(),x=tile?cellCenter(tile.gx):state.camera.x,y=tile?cellCenter(tile.gy):state.camera.y;closeRangeEditor();openObjectForm(null,{x,y,geometryType:kind});els.formType.value=kind==="field"?"作用域":"区域／面积";els.formName.placeholder=kind==="field"?"例如：冰夷光照作用域":"例如：昆仑主体范围"}

  function setZoom(newZoom,anchorClient=null){const z=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,newZoom));if(anchorClient){const before=screenToWorld(anchorClient.x,anchorClient.y),old=state.camera.zoom;state.camera.zoom=z;const after=screenToWorld(anchorClient.x,anchorClient.y);state.camera.x+=before.x-after.x;state.camera.y+=before.y-after.y}else state.camera.zoom=z;scheduleRender();persist()}
  function fitAll(){if(!state.objects.length)return;const xs=[],ys=[];state.objects.forEach(o=>{xs.push(Number(o.x)||0);ys.push(Number(o.y)||0);if(o.area){xs.push(o.area.west,o.area.east);ys.push(o.area.south,o.area.north)}});const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),r=els.viewport.getBoundingClientRect();state.camera.x=(minX+maxX)/2;state.camera.y=(minY+maxY)/2;const zx=(r.width-90)/((maxX-minX||100)*BASE_CELL_PX/100),zy=(r.height-90)/((maxY-minY||100)*BASE_CELL_PX/100);state.camera.zoom=Math.max(MIN_ZOOM,Math.min(.8,Math.min(zx,zy)));state.flippedCell=null;scheduleRender();persist()}
  function openModal(id){$("#"+id).classList.remove("hidden")}function closeModal(id){$("#"+id).classList.add("hidden")}
  function toast(title,body,type=""){const d=document.createElement("div");d.className=`toast ${type}`;d.innerHTML=`<strong>${esc(title)}</strong><span>${esc(body)}</span>`;els.toastHost.appendChild(d);setTimeout(()=>d.remove(),3300)}
  function download(name,text,type="application/json"){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  function patchFileMeta(){const now=new Date(),stamp=now.toISOString().replace(/[-:]/g,"").replace(/\..+/,"");return {now,filename:`山海经地图更改包_${stamp}.shjpatch`}}
  function exportPatch(openFinishDialog=false){if(!state.changes.length){toast("没有可导出的更改","先新增、修改或删除内容后再导出。","error");return null}const {now,filename}=patchFileMeta(),snapshot=cloneJSON(state.changes),pkg={package_type:"shjpatch",package_version:"1.1",base_data_version:state.dataVersion,created_at:now.toISOString(),change_count:snapshot.length,summary:buildChangeSummary(snapshot),changes:snapshot};download(filename,JSON.stringify(pkg,null,2));const meta={filename,createdAt:now.toISOString(),createdLabel:now.toLocaleString("zh-CN"),baseVersion:state.dataVersion,summary:pkg.summary,changeCount:snapshot.length,changes:snapshot};state.pendingRoundExport=meta;toast("更改包已导出",`${snapshot.length}项更改 · ${filename}`);if(openFinishDialog){renderRoundSummary(meta);openModal("roundModal")}return meta}
  function buildChangeSummary(changes=state.changes){const tile=changes.filter(c=>c.entityType==="tile_profile").length,objectChanges=changes.filter(c=>c.entityType!=="tile_profile"),add=objectChanges.filter(c=>c.operation==="create").length,upd=objectChanges.filter(c=>c.operation==="update").length,del=objectChanges.filter(c=>c.operation==="delete").length,restore=objectChanges.filter(c=>c.operation==="restore").length;return `新增对象${add}项，修改对象${upd}项，删除${del}项，恢复${restore}项，地块档案${tile}项。`}
  function renderRoundSummary(meta){if(!meta)return;els.roundSummary.innerHTML=`<strong>${esc(meta.changeCount)}项更改已导出</strong><br>${esc(meta.summary)}<br><span>文件：${esc(meta.filename)}</span><br><span>基础数据：${esc(meta.baseVersion)} · ${esc(meta.createdLabel)}</span>`}
  function archiveCurrentRound(){const meta=state.pendingRoundExport;if(!meta||!state.changes.length){closeModal("roundModal");toast("没有可归档的本轮更改","本轮记录可能已经归档。","error");return}const archive={archiveId:`ROUND-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,createdAt:meta.createdAt,createdLabel:meta.createdLabel,filename:meta.filename,baseVersion:meta.baseVersion,summary:meta.summary,changeCount:meta.changeCount,status:"exported",statusLabel:"已导出",changes:cloneJSON(meta.changes)};state.changeArchives.unshift(archive);state.changes=[];state.pendingRoundExport=null;closeModal("roundModal");persist();updateHeader();renderSidebar();renderDetails();scheduleRender();toast("已开始新一轮编辑",`上一轮${archive.changeCount}项更改已归档`)}
  function archiveStatusLabel(a){return a.status==="uploaded"?"已上传 GitHub":"已导出"}
  function markArchiveUploaded(id){const a=state.changeArchives.find(x=>x.archiveId===id);if(!a)return;a.status="uploaded";a.statusLabel="已上传 GitHub";a.uploadedAt=new Date().toISOString();persist();showChanges();toast("已标记为已上传",a.filename||a.archiveId)}
  function archiveRows(a){return (a.changes||[]).slice().reverse().map(c=>`<tr><td>${esc(c.operationLabel||c.operation||'更改')}</td><td>${esc(c.after?.name||c.before?.name||c.entityId||'')}</td><td>${esc(c.summary||'')}</td><td>${esc(c.time||'')}</td></tr>`).join("")||`<tr><td colspan="4">归档中没有具体更改条目。</td></tr>`}
  function showChanges(){
    const rows=state.changes.length?state.changes.slice().reverse().map(c=>`<tr><td>${esc(c.operationLabel)}</td><td>${esc(c.after?.name||c.before?.name||c.entityId)}</td><td>${esc(c.summary)}</td><td>${esc(c.time)}</td></tr>`).join(""):`<tr><td colspan="4">本轮尚无更改。</td></tr>`;
    const archives=state.changeArchives.length?`<div class="archive-list">${state.changeArchives.map(a=>`<details class="archive-item"><summary><span><strong>${esc(a.filename||a.archiveId)}</strong><small>${esc(a.createdLabel||a.createdAt||"")} · ${esc(a.summary||"")}</small></span><em class="archive-status ${a.status==="uploaded"?"uploaded":""}">${archiveStatusLabel(a)}</em></summary><div class="archive-body"><div class="archive-meta"><span>基础数据 ${esc(a.baseVersion||"")}</span><span>${a.changeCount||a.changes?.length||0}项更改</span></div><table class="change-table"><thead><tr><th>操作</th><th>对象</th><th>内容</th><th>时间</th></tr></thead><tbody>${archiveRows(a)}</tbody></table>${a.status!=="uploaded"?`<div class="archive-actions"><button class="btn secondary compact" data-archive-uploaded="${esc(a.archiveId)}">标记为已上传 GitHub</button></div>`:""}</div></details>`).join("")}</div>`:`<div class="info-section"><p>还没有历史提交。完成一轮编辑并选择“归档并开始新一轮”后，记录会出现在这里。</p></div>`;
    const remote=state.remotePatchHistory.length?`<div class="archive-list remote-archive-list">${state.remotePatchHistory.map(a=>`<details class="archive-item"><summary><span><strong>${esc(a.name||a.path||a.historyId)}</strong><small>${esc(new Date(a.appliedAt).toLocaleString("zh-CN"))} · ${esc(a.summary||"")}</small></span><em class="archive-status uploaded">${a.netNoop?"已确认同步":"已应用"}</em></summary><div class="archive-body"><div class="archive-meta"><span>基础数据 ${esc(a.baseVersion||"")}</span><span>应用${a.applyCount||0}项 · 跳过${a.skipCount||0}项</span></div><p class="remote-archive-note">该记录来自 GitHub <code>submissions/pending</code>，不会重复写入本轮导出的 .shjpatch。</p></div></details>`).join("")}</div>`:`<div class="info-section"><p>尚未从 GitHub 应用待处理更改包。</p></div>`;
    els.infoEyebrow.textContent="LOCAL CHANGE LOG";els.infoTitle.textContent=`更改记录 · 本轮 ${state.changes.length} 项`;els.infoBody.innerHTML=`<div class="change-actions"><button class="btn secondary compact" id="changesExportNow" ${state.changes.length?"":"disabled"}>仅导出本轮</button><button class="btn primary compact" id="changesFinishRound" ${state.changes.length?"":"disabled"}>完成本轮编辑</button></div><div class="info-section"><h3>本轮自动简述</h3><p>${esc(buildChangeSummary())}</p></div><table class="change-table"><thead><tr><th>操作</th><th>对象</th><th>内容</th><th>时间</th></tr></thead><tbody>${rows}</tbody></table><div class="change-section-title"><h3>历史提交</h3><span>${state.changeArchives.length}轮</span></div>${archives}<div class="change-section-title"><h3>GitHub已应用包</h3><span>${state.remotePatchHistory.length}个</span></div>${remote}`;
    openModal("infoModal");const exportBtn=$("#changesExportNow"),finishBtn=$("#changesFinishRound");if(exportBtn)exportBtn.addEventListener("click",()=>exportPatch(false));if(finishBtn)finishBtn.addEventListener("click",()=>{closeModal("infoModal");exportPatch(true)});els.infoBody.querySelectorAll("[data-archive-uploaded]").forEach(b=>b.addEventListener("click",()=>markArchiveUploaded(b.dataset.archiveUploaded)))
  }
  function showSpecs(){els.infoEyebrow.textContent="ACTIVE SPECIFICATION";els.infoTitle.textContent="当前地图规格";els.infoBody.innerHTML=`<div class="info-section"><h3>当前执行优先级</h3><p>研究方法 v002作为基础研究规范；制图执行规则 v004具有更高优先级。冲突条款以v004为准。</p></div><div class="info-section"><h3>当前制图规则</h3><ul><li>都广之野（0，0）固定为全局原点。</li><li>底层坐标单位为里；100里主格用于无限索引。</li><li>420%以上进入10里彩色精细地图；380%以下恢复100里地块。</li><li>同一地块允许多个对象；同坐标对象用“/”展示并保留独立档案。</li><li>河流和溪流使用线型叠加；湖、泽、海等明确水域使用面积。</li><li>缺少路径或边界证据时不自动补造几何形状。</li></ul></div><div class="info-section"><h3>研究操作</h3><p>地图浏览 → 宽幅地块简述 → 完整博物志 → Markdown资料更新；画笔可快速采集多个地块形成简述集合。</p></div>`;openModal("infoModal")}
  function versionParts(value){const m=String(value||"").match(/v?(\d+)(?:\D+r?(\d+))?/i);return m?[Number(m[1]||0),Number(m[2]||0)]:[0,0]}
  function compareDataVersion(a,b){const av=versionParts(a),bv=versionParts(b);return av[0]===bv[0]?Math.sign(av[1]-bv[1]):Math.sign(av[0]-bv[0])}
  function githubContentsApi(path){return `${GITHUB_CONFIG.apiBase}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${String(path||"").split("/").map(encodeURIComponent).join("/")}?ref=${encodeURIComponent(GITHUB_CONFIG.branch)}&t=${Date.now()}`}
  function decodeGithubContent(content){const raw=atob(String(content||"").replace(/\s/g,"")),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));return new TextDecoder("utf-8").decode(bytes)}
  async function githubFetch(url){const res=await fetch(url,{headers:{Accept:"application/vnd.github+json"},cache:"no-store"});if(res.status===403){let detail="";try{const body=await res.json();detail=body?.message||""}catch{}throw new Error(detail||"GitHub访问次数达到临时上限，请稍后再试")};return res}
  async function fetchGithubCurrent(){
    const res=await githubFetch(githubContentsApi(GITHUB_CONFIG.currentPath));
    if(res.status===404)throw new Error("仓库已连接，但尚未找到 data/current.json");
    if(!res.ok)throw new Error(`GitHub返回 ${res.status}`);
    const payload=await res.json();
    if(!payload?.content)throw new Error("data/current.json 内容为空");
    return JSON.parse(decodeGithubContent(payload.content));
  }
  async function fetchGithubPendingFiles(){
    const res=await githubFetch(githubContentsApi(GITHUB_CONFIG.pendingPath));
    if(res.status===404)return [];
    if(!res.ok)throw new Error(`读取 pending 目录失败：GitHub返回 ${res.status}`);
    const payload=await res.json();
    if(!Array.isArray(payload))return [];
    return payload.filter(x=>x?.type==="file"&&/\.shjpatch$/i.test(x.name||"")).sort((a,b)=>String(b.name||"").localeCompare(String(a.name||""),"zh-CN"));
  }
  async function fetchGithubPatch(entry){
    const cacheKey=entry?.sha||entry?.path||entry?.name;if(cacheKey&&state.githubPendingCache[cacheKey])return state.githubPendingCache[cacheKey];
    let payload=null,text="";
    const detailUrl=entry?.url||githubContentsApi(entry?.path||"");
    const res=await githubFetch(detailUrl);
    if(!res.ok)throw new Error(`下载更改包失败：GitHub返回 ${res.status}`);
    payload=await res.json();
    if(payload?.content)text=decodeGithubContent(payload.content);
    else if(payload?.download_url){const rawRes=await fetch(payload.download_url,{cache:"no-store"});if(!rawRes.ok)throw new Error(`下载更改包失败：${rawRes.status}`);text=await rawRes.text()}
    if(!text)throw new Error("更改包内容为空");
    let pkg;try{pkg=JSON.parse(text)}catch{throw new Error("更改包不是有效的 JSON 文件")}
    if(cacheKey)state.githubPendingCache[cacheKey]=pkg;
    return pkg;
  }
  function remotePatchKey(entry){return String(entry?.sha||entry?.path||entry?.name||"")}
  function appliedRemoteRecord(entry){
    if(entry?.sha)return state.appliedRemotePatches.find(x=>x.sha===entry.sha||x.key===entry.sha);
    const key=remotePatchKey(entry);return state.appliedRemotePatches.find(x=>x.key===key||x.path&&x.path===entry?.path)
  }
  function isRemotePatchApplied(entry){return !!appliedRemoteRecord(entry)}
  function viewedRemoteRecord(entry){
    if(entry?.sha)return state.viewedRemotePatches.find(x=>x.sha===entry.sha||x.key===entry.sha);
    const key=remotePatchKey(entry);return state.viewedRemotePatches.find(x=>x.key===key||x.path&&x.path===entry?.path)
  }
  function isRemotePatchViewed(entry){return !!viewedRemoteRecord(entry)}
  function markRemotePatchViewed(entry){
    if(!entry||isRemotePatchViewed(entry)||isRemotePatchApplied(entry))return;
    state.viewedRemotePatches.unshift({key:remotePatchKey(entry),sha:entry.sha||"",path:entry.path||"",name:entry.name||"",viewedAt:new Date().toISOString()});
    state.viewedRemotePatches=state.viewedRemotePatches.slice(0,200);persist()
  }
  function normalizedComparable(value){
    if(Array.isArray(value))return value.map(normalizedComparable);
    if(value&&typeof value==="object"){const out={};Object.keys(value).sort().forEach(k=>{if(k==="coordinateText"||k==="distance"||k==="originalLink")return;out[k]=normalizedComparable(value[k])});return out}
    return value===undefined?null:value
  }
  function sameValue(a,b){return JSON.stringify(normalizedComparable(a))===JSON.stringify(normalizedComparable(b))}
  function changedTopKeys(before,after){const keys=new Set([...Object.keys(before||{}),...Object.keys(after||{})]);return [...keys].filter(k=>!["coordinateText","distance","originalLink"].includes(k)&&!sameValue(before?.[k],after?.[k]))}
  function cleanTileProfile(value){if(!value||typeof value!=="object")return value;const out=cloneJSON(value);delete out.name;return out}
  function patchTargetLabel(change){return change?.after?.name||change?.before?.name||change?.after?.objects?.[0]?.name||change?.before?.objects?.[0]?.name||String(change?.entityId||"未命名对象")}
  function normalizeObjectAfterApply(obj){if(!obj)return obj;obj.x=Number(obj.x)||0;obj.y=Number(obj.y)||0;obj.coordinateText=coordText(obj.x,obj.y);if(obj.distance!==undefined)obj.distance=Math.hypot(obj.x,obj.y);return obj}
  function patchResult(change,status,reason){return {change,status,reason,target:patchTargetLabel(change),operationLabel:change?.operationLabel||change?.operation||"更改"}}
  function simulatePatchChange(change,draft){
    if(!change||typeof change!=="object")return patchResult(change,"conflict","更改记录格式无效");
    const op=String(change.operation||"").toLowerCase(),label=String(change.operationLabel||""),entityId=String(change.entityId||change.after?.id||change.before?.id||""),entityType=String(change.entityType||"");
    const isCell=entityId.startsWith("CELL-"),cellKeyValue=isCell?entityId.slice(5):"";
    const tileBundle=isCell&&(Array.isArray(change.before?.objects)||Array.isArray(change.after?.objects)||/清空地块|恢复地块/.test(label));
    const tileProfile=isCell&&!tileBundle&&(entityType==="tile_profile"||/地块档案/.test(label));
    if(tileBundle){
      if(op==="delete"){
        const objects=change.before?.objects||[],profile=cleanTileProfile(change.before?.profile),issues=[];
        objects.forEach(expected=>{const current=draft.objects.find(o=>o.id===expected.id);if(current&&!sameValue(current,expected))issues.push(`对象“${expected.name||expected.id}”已被修改`)});
        const currentProfile=draft.tileProfiles[cellKeyValue];if(profile&&currentProfile&&!sameValue(currentProfile,profile))issues.push("地块档案已被修改");
        if(issues.length)return patchResult(change,"conflict",issues.join("；"));
        const ids=new Set(objects.map(o=>o.id)),hadObjects=draft.objects.some(o=>ids.has(o.id)),hadProfile=!!draft.tileProfiles[cellKeyValue];
        if(!hadObjects&&!hadProfile)return patchResult(change,"skip","本地已经是清空后的状态");
        draft.objects=draft.objects.filter(o=>!ids.has(o.id));delete draft.tileProfiles[cellKeyValue];return patchResult(change,"apply",`清空地块 ${cellKeyValue}`)
      }
      if(op==="restore"||op==="create"){
        const objects=change.after?.objects||[],profile=cleanTileProfile(change.after?.profile),issues=[];
        objects.forEach(incoming=>{const current=draft.objects.find(o=>o.id===incoming.id);if(current&&!sameValue(current,incoming))issues.push(`对象ID ${incoming.id} 已被其他对象占用`)});
        if(profile&&draft.tileProfiles[cellKeyValue]&&!sameValue(draft.tileProfiles[cellKeyValue],profile))issues.push("地块档案已存在不同内容");
        if(issues.length)return patchResult(change,"conflict",issues.join("；"));
        let applied=false;objects.forEach(incoming=>{if(!draft.objects.some(o=>o.id===incoming.id)){draft.objects.push(normalizeObjectAfterApply(cloneJSON(incoming)));applied=true}});if(profile&&!draft.tileProfiles[cellKeyValue]){draft.tileProfiles[cellKeyValue]=cloneJSON(profile);applied=true}
        return patchResult(change,applied?"apply":"skip",applied?`恢复地块 ${cellKeyValue}`:"本地已经包含该地块内容")
      }
      return patchResult(change,"conflict",`暂不支持地块操作：${op||"未标注"}`)
    }
    if(tileProfile){
      const before=cleanTileProfile(change.before),after=cleanTileProfile(change.after),current=draft.tileProfiles[cellKeyValue];
      if(op==="delete"){
        if(!current)return patchResult(change,"skip","地块档案已不存在");
        if(before&&!sameValue(current,before))return patchResult(change,"conflict","本地地块档案已被修改");
        delete draft.tileProfiles[cellKeyValue];return patchResult(change,"apply",`删除地块 ${cellKeyValue} 档案`)
      }
      if(op==="create"||op==="restore"){
        if(!after)return patchResult(change,"conflict","缺少要写入的地块档案");
        if(current)return sameValue(current,after)?patchResult(change,"skip","本地已包含相同地块档案"):patchResult(change,"conflict","本地已有不同地块档案");
        draft.tileProfiles[cellKeyValue]=cloneJSON(after);return patchResult(change,"apply",`写入地块 ${cellKeyValue} 档案`)
      }
      if(op==="update"){
        if(!current)return patchResult(change,"conflict","本地不存在要更新的地块档案");
        const keys=changedTopKeys(before,after);if(keys.every(k=>sameValue(current[k],after?.[k])))return patchResult(change,"skip","本地已经包含该档案修改");
        const conflicts=keys.filter(k=>!sameValue(current[k],before?.[k])&&!sameValue(current[k],after?.[k]));if(conflicts.length)return patchResult(change,"conflict",`字段已被本地修改：${conflicts.join("、")}`);
        keys.forEach(k=>{if(after&&Object.prototype.hasOwnProperty.call(after,k))current[k]=cloneJSON(after[k]);else delete current[k]});return patchResult(change,"apply",`更新地块 ${cellKeyValue} 档案`)
      }
      return patchResult(change,"conflict",`暂不支持地块档案操作：${op||"未标注"}`)
    }
    if(!entityId)return patchResult(change,"conflict","缺少对象ID");
    const index=draft.objects.findIndex(o=>o.id===entityId),current=index>=0?draft.objects[index]:null,before=change.before,after=change.after;
    if(op==="create"||op==="restore"){
      if(!after||typeof after!=="object")return patchResult(change,"conflict","缺少要写入的对象内容");
      if(current)return sameValue(current,after)?patchResult(change,"skip","本地已经包含相同对象"):patchResult(change,"conflict",`对象ID ${entityId} 已存在不同内容`);
      draft.objects.push(normalizeObjectAfterApply(cloneJSON(after)));return patchResult(change,"apply",`写入对象“${after.name||entityId}”`)
    }
    if(op==="update"){
      if(!current)return patchResult(change,"conflict","本地不存在要更新的对象");
      if(!after||typeof after!=="object")return patchResult(change,"conflict","缺少更新后的对象内容");
      const keys=changedTopKeys(before,after);if(!keys.length)return patchResult(change,"skip","更改包没有实际字段变化");
      if(keys.every(k=>sameValue(current[k],after[k])))return patchResult(change,"skip","本地已经包含该对象修改");
      const conflicts=keys.filter(k=>!sameValue(current[k],before?.[k])&&!sameValue(current[k],after?.[k]));
      if(conflicts.length)return patchResult(change,"conflict",`字段已被本地修改：${conflicts.join("、")}`);
      keys.forEach(k=>{if(Object.prototype.hasOwnProperty.call(after,k))current[k]=cloneJSON(after[k]);else delete current[k]});normalizeObjectAfterApply(current);return patchResult(change,"apply",`更新对象“${current.name||entityId}”`)
    }
    if(op==="delete"){
      if(!current)return patchResult(change,"skip","对象已不存在");
      if(before&&!sameValue(current,before))return patchResult(change,"conflict","本地对象已被修改，不能直接删除");
      draft.objects.splice(index,1);return patchResult(change,"apply",`删除对象“${current.name||entityId}”`)
    }
    return patchResult(change,"conflict",`暂不支持对象操作：${op||"未标注"}`)
  }
  function simulatePatchPackage(pkg){
    const packageErrors=[];if(!pkg||typeof pkg!=="object")packageErrors.push("文件内容不是对象");if(pkg?.package_type!=="shjpatch")packageErrors.push("package_type 必须为 shjpatch");if(!Array.isArray(pkg?.changes))packageErrors.push("changes 必须是数组");
    const initial={objects:cloneJSON(state.objects),tileProfiles:cloneJSON(state.tileProfiles)},draft={objects:cloneJSON(state.objects),tileProfiles:cloneJSON(state.tileProfiles)},results=[];
    if(!packageErrors.length)(pkg.changes||[]).forEach(change=>results.push(simulatePatchChange(change,draft)));
    const applyCount=results.filter(x=>x.status==="apply").length,skipCount=results.filter(x=>x.status==="skip").length,conflictCount=results.filter(x=>x.status==="conflict").length;
    const netNoop=sameValue(initial,draft);return {pkg,draft,results,packageErrors,applyCount,skipCount,conflictCount,netNoop,baseMismatch:!!pkg?.base_data_version&&pkg.base_data_version!==state.dataVersion}
  }
  function rememberRemotePatch(entry,pkg,simulation){
    const key=remotePatchKey(entry);if(!state.appliedRemotePatches.some(x=>x.key===key))state.appliedRemotePatches.unshift({key,sha:entry?.sha||"",path:entry?.path||"",name:entry?.name||"",appliedAt:new Date().toISOString(),packageCreatedAt:pkg?.created_at||"",changeCount:Number(pkg?.change_count)||pkg?.changes?.length||0,summary:pkg?.summary||"",baseVersion:pkg?.base_data_version||"",netNoop:!!simulation?.netNoop});
    state.remotePatchHistory.unshift({historyId:`REMOTE-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,name:entry?.name||"GitHub更改包",path:entry?.path||"",sha:entry?.sha||"",appliedAt:new Date().toISOString(),summary:pkg?.summary||"",changeCount:Number(pkg?.change_count)||pkg?.changes?.length||0,applyCount:simulation?.applyCount||0,skipCount:simulation?.skipCount||0,baseVersion:pkg?.base_data_version||"",netNoop:!!simulation?.netNoop});
    state.remotePatchHistory=state.remotePatchHistory.slice(0,100)
  }
  function patchStatusText(status){return status==="apply"?"将应用":status==="skip"?"已包含":"有冲突"}
  function patchPreviewHtml(entry,pkg,simulation){
    const applied=isRemotePatchApplied(entry),invalid=simulation.packageErrors.length>0,rows=simulation.results.map((r,i)=>`<tr><td><span class="patch-status ${r.status}">${patchStatusText(r.status)}</span></td><td>${esc(r.operationLabel)}</td><td>${esc(r.target)}</td><td>${esc(r.reason)}</td></tr>`).join("")||`<tr><td colspan="4">没有可识别的更改记录。</td></tr>`;
    const warnings=[simulation.baseMismatch?`更改包基于 ${pkg.base_data_version}，当前本地为 ${state.dataVersion}`:"",state.changes.length?`本地另有 ${state.changes.length} 项尚未归档的编辑；程序已逐字段检查冲突。`:""].filter(Boolean);
    const actionLabel=simulation.netNoop?"标记为本机已同步":"下载并应用到本地地图";
    return `<div class="github-update-actions"><button class="btn secondary compact" id="pendingBackBtn">← 返回更新列表</button>${entry?.download_url?`<a class="btn secondary compact" href="${esc(entry.download_url)}" download>另存原始包</a>`:""}</div><div class="pending-preview-head"><div><span class="pending-file-icon">PATCH</span><div><h3>${esc(entry?.name||"更改包")}</h3><p>${esc(pkg?.summary||"未提供更改简述")}</p></div></div><span class="pending-package-state ${applied?'applied':''}">${applied?'本机已应用':'等待处理'}</span></div><div class="patch-meta-grid"><span>基础版本<b>${esc(pkg?.base_data_version||"未标注")}</b></span><span>生成时间<b>${esc(pkg?.created_at||"未标注")}</b></span><span>记录数量<b>${Number(pkg?.change_count)||pkg?.changes?.length||0}</b></span><span>本地未归档<b>${state.changes.length}</b></span></div>${warnings.length?`<div class="patch-warning">${warnings.map(x=>`<p>${esc(x)}</p>`).join("")}</div>`:""}${invalid?`<div class="patch-error-box"><strong>文件不能应用</strong>${simulation.packageErrors.map(x=>`<p>${esc(x)}</p>`).join("")}</div>`:`<div class="patch-counts"><span class="apply">将应用 ${simulation.applyCount}</span><span class="skip">已包含 ${simulation.skipCount}</span><span class="conflict">冲突 ${simulation.conflictCount}</span></div><table class="change-table patch-table"><thead><tr><th>状态</th><th>操作</th><th>对象／地块</th><th>说明</th></tr></thead><tbody>${rows}</tbody></table>`}<div class="pending-preview-footer"><p>${simulation.conflictCount?"存在冲突，程序不会写入任何内容。请先处理冲突或换一台没有本地修改的设备。":simulation.netNoop?"本机当前地图已经包含该包的最终结果，可以直接标记为已同步。":"确认后会先在内存中完整应用，再一次性保存；远程更改不会重复进入本轮 .shjpatch。"}</p><button class="btn primary" id="pendingApplyBtn" ${applied||invalid||simulation.conflictCount?'disabled':''}>${applied?'本机已应用':actionLabel}</button></div>`
  }
  function pendingPackageListHtml(files,view="new"){
    const rows=(files||[]).map((entry,index)=>({entry,index,applied:appliedRemoteRecord(entry),viewed:viewedRemoteRecord(entry)}));
    const shown=rows.filter(x=>view==="history"?!!x.applied:!x.applied);
    if(!shown.length){
      if(view==="history")return `<div class="pending-empty"><strong>没有本机已处理记录</strong><span>应用过的更改包会出现在这里。</span></div>`;
      return `<div class="pending-empty"><strong>没有新的待应用更改包</strong><span>已处理的包已经隐藏，可切换到“已处理”查看历史。</span></div>`
    }
    return `<div class="pending-package-list">${shown.map(({entry,index,applied,viewed})=>{const sha=entry.sha?entry.sha.slice(0,8):"无SHA",stateLabel=applied?"已应用":viewed?"已查看，未应用":"新包",stateClass=applied?"applied":viewed?"viewed":"new";return `<article class="pending-package-card ${stateClass}"><div class="pending-file-icon">PATCH</div><div class="pending-package-copy"><strong>${esc(entry.name)}</strong><small>${Math.max(1,Math.round((Number(entry.size)||0)/1024))} KB · SHA ${esc(sha)}</small><em class="pending-card-status ${stateClass}">${stateLabel}${applied?.appliedAt?` · ${esc(new Date(applied.appliedAt).toLocaleString("zh-CN"))}`:viewed?.viewedAt?` · ${esc(new Date(viewed.viewedAt).toLocaleString("zh-CN"))}`:""}</em></div><button class="btn ${applied?'secondary':'primary'} compact" data-pending-index="${index}">${applied?'查看记录':viewed?'继续处理':'查看并应用'}</button></article>`}).join("")}</div>`
  }
  function githubStatusHtml(current,pendingFiles,currentError="",pendingError=""){
    const remote=current?.data_version||current?.dataVersion||"未读取",cmp=current?compareDataVersion(remote,state.dataVersion):0,update=current&&cmp>0,changes=Array.isArray(current?.highlights)?current.highlights:[],releaseUrl=current?.release_url||current?.releaseUrl||GITHUB_CONFIG.repoUrl,downloadUrl=current?.download_url||current?.downloadUrl||"",newCount=(pendingFiles||[]).filter(x=>!isRemotePatchApplied(x)).length,appliedCount=(pendingFiles||[]).filter(x=>isRemotePatchApplied(x)).length,view=state.githubPendingView||"new";
    return `<div class="github-connection-strip"><span><b>● GitHub公开读取已接入</b>${esc(GITHUB_CONFIG.owner+'/'+GITHUB_CONFIG.repo)} · ${esc(GITHUB_CONFIG.branch)}</span><a href="${esc(GITHUB_CONFIG.repoUrl)}" target="_blank" rel="noopener">打开仓库 ↗</a></div><div class="github-update-grid"><section class="info-section"><h3>正式地图数据</h3>${currentError?`<div class="patch-error-box"><p>${esc(currentError)}</p></div>`:`<p>本地：<strong>${esc(state.dataVersion)}</strong><br>仓库：<strong>${esc(remote)}</strong></p><p>${update?'发现新的正式地图数据版本。':cmp===0?'当前正式数据已经是最新版本。':'本地版本高于仓库标记，请检查 current.json。'}</p>${changes.length?`<ul>${changes.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}<p><a class="btn secondary compact" href="${esc(releaseUrl)}" target="_blank" rel="noopener">发布页</a>${downloadUrl?` <a class="btn primary compact" href="${esc(downloadUrl)}" target="_blank" rel="noopener">下载正式数据包</a>`:""}</p>`}</section><section class="info-section"><h3>更改包状态</h3><p>仓库共 <strong>${pendingFiles?.length||0}</strong> 个包；本机待应用 <strong>${newCount}</strong> 个，已处理 <strong>${appliedCount}</strong> 个。</p><p>程序按 GitHub 文件 SHA 识别包体。同名文件内容改变后会重新显示为新包。</p>${pendingError?`<div class="patch-error-box"><p>${esc(pendingError)}</p></div>`:""}</section></div><div class="pending-toolbar"><div class="pending-view-tabs"><button class="${view==='new'?'active':''}" data-pending-view="new">待应用 <b>${newCount}</b></button><button class="${view==='history'?'active':''}" data-pending-view="history">已处理 <b>${appliedCount}</b></button></div><span>“已查看”表示打开过预览，但尚未应用。</span></div>${pendingPackageListHtml(pendingFiles||[],view)}`
  }
  function bindPendingListActions(){
    els.infoBody.querySelectorAll("[data-pending-index]").forEach(btn=>btn.addEventListener("click",()=>openPendingPatchPreview(Number(btn.dataset.pendingIndex))));
    els.infoBody.querySelectorAll("[data-pending-view]").forEach(btn=>btn.addEventListener("click",()=>{state.githubPendingView=btn.dataset.pendingView||"new";renderGithubUpdateModal()}))
  }
  function renderGithubUpdateModal(){els.infoEyebrow.textContent="GITHUB DATA & PATCHES";els.infoTitle.textContent="GitHub数据与更改包";els.infoBody.innerHTML=githubStatusHtml(state.githubCurrent,state.githubPendingFiles,state.githubCurrentError||"",state.githubPendingError||"");bindPendingListActions()}
  async function openPendingPatchPreview(index){
    const entry=state.githubPendingFiles[index];if(!entry)return;els.infoEyebrow.textContent="GITHUB PENDING PATCH";els.infoTitle.textContent="正在下载更改包";els.infoBody.innerHTML=`<div class="info-section"><h3>${esc(entry.name)}</h3><p>正在从GitHub读取并校验内容……</p></div>`;
    try{const pkg=await fetchGithubPatch(entry),simulation=simulatePatchPackage(pkg);markRemotePatchViewed(entry);els.infoTitle.textContent="待处理更改包预览";els.infoBody.innerHTML=patchPreviewHtml(entry,pkg,simulation);$("#pendingBackBtn")?.addEventListener("click",renderGithubUpdateModal);$("#pendingApplyBtn")?.addEventListener("click",()=>applyGithubPatch(index,pkg,simulation))}
    catch(error){els.infoTitle.textContent="更改包读取失败";els.infoBody.innerHTML=`<div class="github-update-actions"><button class="btn secondary compact" id="pendingBackBtn">← 返回更新列表</button></div><div class="patch-error-box"><strong>无法读取 ${esc(entry.name)}</strong><p>${esc(error?.message||"未知错误")}</p></div>`;$("#pendingBackBtn")?.addEventListener("click",renderGithubUpdateModal)}
  }
  function applyGithubPatch(index,pkg,simulation){
    const entry=state.githubPendingFiles[index];if(!entry||isRemotePatchApplied(entry))return;if(simulation.packageErrors.length||simulation.conflictCount){toast("更改包未应用","请先处理格式错误或冲突。","error");return}
    if(!simulation.netNoop){state.objects=simulation.draft.objects;state.tileProfiles=simulation.draft.tileProfiles;state.nextIdCounter=Math.max(state.nextIdCounter,maxKnownObjectNumber())}
    rememberRemotePatch(entry,pkg,simulation);state.githubPendingView="new";populateFilters();renderSidebar();renderDetails();scheduleRender();persist();updateHeader();toast(simulation.netNoop?"已标记为本机同步":"GitHub更改包已应用",simulation.netNoop?"本地地图原本已经包含这些变化。":`写入${simulation.applyCount}项，跳过${simulation.skipCount}项`);renderGithubUpdateModal()
  }
  async function checkUpdate(silent=false){
    if(!silent){els.infoEyebrow.textContent="GITHUB DATA UPDATE";els.infoTitle.textContent="正在连接GitHub";els.infoBody.innerHTML=`<div class="info-section"><h3>连接中</h3><p>正在同时检查正式数据与 ${esc(GITHUB_CONFIG.pendingPath)}……</p></div>`;openModal("infoModal")}
    const [currentResult,pendingResult]=await Promise.allSettled([fetchGithubCurrent(),fetchGithubPendingFiles()]);
    state.githubCurrent=currentResult.status==="fulfilled"?currentResult.value:null;state.githubCurrentError=currentResult.status==="rejected"?(currentResult.reason?.message||"无法读取正式数据版本"):"";state.githubPendingFiles=pendingResult.status==="fulfilled"?pendingResult.value:[];state.githubPendingError=pendingResult.status==="rejected"?(pendingResult.reason?.message||"无法读取待处理目录"):"";
    if(!silent)renderGithubUpdateModal();
    const newPending=state.githubPendingFiles.filter(x=>!isRemotePatchApplied(x)).length,remote=state.githubCurrent?.data_version||state.githubCurrent?.dataVersion||"",cmp=remote?compareDataVersion(remote,state.dataVersion):0;
    if(silent){if(newPending>0)toast("发现GitHub待处理包",`${newPending}个更改包等待查看`);else if(cmp>0)toast("发现地图数据更新",`${state.dataVersion} → ${remote}`);else if(state.githubCurrent&&!state.githubPendingError)toast("GitHub已连接",`正式数据最新，pending无新包`);else console.warn("GitHub update check:",state.githubCurrentError,state.githubPendingError)}
    return {current:state.githubCurrent,pending:state.githubPendingFiles}
  }

  function openImportWorkspace(){els.importWorkspace.classList.remove("hidden");renderExamplePanel();if(!els.importText.value.trim()){els.importText.value="";updateImportCharCount();renderImportAnalysis(null)}}
  function closeImportWorkspace(){els.importWorkspace.classList.add("hidden")}
  function updateImportCharCount(){els.importCharCount.textContent=`${els.importText.value.length} 字`}
  function debounce(fn,delay=280){let t;return(...args)=>{clearTimeout(t);t=setTimeout(()=>fn(...args),delay)}}
  const debouncedImportAnalyze=debounce(()=>analyzeImportText(),260);
  function normalizeKey(k){return String(k||"").replace(/\s+/g,"").replace(/[（）()]/g,"").replace(/／/g,"/")}
  function parseNumber(value,label,issues,line){const s=String(value??"").trim();if(!s){issues.push({level:"error",message:`缺少${label}`,line});return null}const n=Number(s.replace(/[里公里]/g,""));if(!Number.isFinite(n)){issues.push({level:"error",message:`${label}必须是数字，当前为“${s}”`,line});return null}return n}
  function parsePointList(values,label,issues,line,min){const out=[];(values||[]).forEach((v,i)=>{const m=String(v).trim().match(/^([+-]?\d+(?:\.\d+)?)\s*[,，]\s*([+-]?\d+(?:\.\d+)?)$/);if(!m)issues.push({level:"error",message:`${label}第${i+1}项应为“X,Y”，当前为“${v}”`,line});else out.push([Number(m[1]),Number(m[2])])});if(out.length<min)issues.push({level:"error",message:`${label}至少需要${min}个有效坐标点`,line});return out}
  function parseMarkdownFields(block,startLine){
    const blockLines=block.split("\n"),fields={},fieldLines={},duplicateFields=[];let currentKey=null,listMode=false;
    blockLines.slice(1).forEach((raw,i)=>{const ln=startLine+i+1,field=raw.match(/^\s*\*\s*([^：:]+)\s*[：:]\s*(.*)$/);if(field){const key=normalizeKey(field[1]),value=field[2].trim();if(Object.prototype.hasOwnProperty.call(fields,key))duplicateFields.push({key,line:ln});currentKey=key;listMode=value===""&&/路径节点|边界顶点/.test(key);fields[key]=listMode?[]:value;fieldLines[key]=ln;return}
      if(!currentKey)return;const list=raw.match(/^\s{2,}[-*]\s*(.+)$/);if(list&&listMode){fields[currentKey].push(list[1].trim());return}
      if(/^\s{2,}/.test(raw)||(/^\s*$/.test(raw)&&!Array.isArray(fields[currentKey]))){if(Array.isArray(fields[currentKey]))return;const add=raw.trim();const old=String(fields[currentKey]||"");fields[currentKey]=add?(old?`${old}\n${add}`:add):old;return}
      if(raw.trim()&&!/^---\s*$/.test(raw)){currentKey=null;listMode=false}
    });return {fields,fieldLines,duplicateFields}
  }
  function markdownFieldAccess(fields,fieldLines,startLine){
    const find=(...keys)=>{for(const k of keys){const nk=normalizeKey(k);if(Object.prototype.hasOwnProperty.call(fields,nk))return {present:true,value:fields[nk],line:fieldLines[nk]||startLine,key:nk}}return {present:false,value:"",line:startLine,key:""}};
    return {find,get:(...keys)=>find(...keys).value,lineOf:(...keys)=>find(...keys).line}
  }
  function parseTileCell(value,fields,access,issues,line){
    const sources=[value,access.get("地块坐标","主格坐标")].map(v=>String(v||"").trim()).filter(Boolean);let gx=null,gy=null;
    for(const source of sources){let m=source.match(/X\s*([+-]\d+)\s*_?\s*Y\s*([+-]\d+)/i);if(m){gx=Number(m[1]);gy=Number(m[2]);break}m=source.match(/^[（(]?\s*([+-]?\d+)\s*[,，]\s*([+-]?\d+)\s*[）)]?$/);if(m){gx=Number(m[1]);gy=Number(m[2]);break}}
    if(gx===null){const fx=access.find("主格X","地块X"),fy=access.find("主格Y","地块Y");if(fx.present&&fy.present){gx=Number(fx.value);gy=Number(fy.value)}}
    if(!Number.isInteger(gx)||!Number.isInteger(gy)){issues.push({level:"error",message:"地块档案必须提供整数主格坐标，例如“### 地块档案：X+002_Y+014”。",line});return {gx:null,gy:null,key:""}}
    return {gx,gy,key:cellKey(gx,gy)}
  }
  function parseTimeState(value,issues,line){const s=String(value||"").trim();if(!s)return "unknown";if(/未判定|未知/.test(s))return "unknown";if(/循环/.test(s))return "loop";if(/停滞|停止/.test(s))return "stopped";if(/异常|不正常/.test(s))return "no";if(/正常/.test(s))return "yes";issues.push({level:"warn",message:`无法标准化时间流逝“${s}”，将保留为未判定。`,line});return "unknown"}
  function parseReachableState(value,issues,line){const s=String(value||"").trim();if(!s)return "unknown";if(/未判定|未知/.test(s))return "unknown";if(/条件/.test(s))return "conditional";if(/不可|不能|否/.test(s))return "no";if(/可以|可达|自由抵达|是/.test(s))return "yes";issues.push({level:"warn",message:`无法标准化旧版可达性“${s}”，将保留为未判定。`,line});return "unknown"}
  function parseObjectEntry(headerName,block,startLine){
    const {fields,fieldLines,duplicateFields}=parseMarkdownFields(block,startLine),access=markdownFieldAccess(fields,fieldLines,startLine),get=access.get,lineOf=access.lineOf,unknown=[],issues=[];duplicateFields.forEach(d=>issues.push({level:"warn",message:`字段“${d.key}”在同一区块重复出现，程序采用最后一次内容。`,line:d.line}));
    let name=String(get("地名")||"").trim();if(!name){name=headerName;issues.push({level:"warn",message:"未填写“地名”字段，已暂用对象标题作为地名。",line:startLine})}
    const rawGeom=String(get("几何类型")||"").trim(),geomMap={"点":"point","点对象":"point","point":"point","线":"line","线型对象":"line","line":"line","面积":"area","面积对象":"area","area":"area","作用域":"field","field":"field"},geometryType=geomMap[rawGeom.toLowerCase()]||geomMap[rawGeom];
    if(!rawGeom)issues.push({level:"error",message:"缺少必填字段“几何类型”。",line:startLine});else if(!geometryType)issues.push({level:"error",message:`无法识别几何类型“${rawGeom}”；可用：点、线、面积、作用域。`,line:lineOf("几何类型")});
    let x=null,y=null,path=[],area=null;
    if(geometryType==="point"){
      x=parseNumber(get("X坐标里","X坐标","中心X里","中心X"),"X坐标（里）",issues,lineOf("X坐标里","X坐标"));y=parseNumber(get("Y坐标里","Y坐标","中心Y里","中心Y"),"Y坐标（里）",issues,lineOf("Y坐标里","Y坐标"));
    }else if(geometryType==="line"){
      path=parsePointList(Array.isArray(get("路径节点"))?get("路径节点"):[],"路径节点",issues,lineOf("路径节点"),2);if(path.length){x=path[0][0];y=path[0][1]}
    }else if(geometryType==="area"||geometryType==="field"){
      x=parseNumber(get("中心X里","中心X","X坐标里","X坐标"),"中心X（里）",issues,lineOf("中心X里","中心X"));y=parseNumber(get("中心Y里","中心Y","Y坐标里","Y坐标"),"中心Y（里）",issues,lineOf("中心Y里","中心Y"));
      const shapeRaw=String(get("面积形状","作用域形状")||"").trim(),shapeMap={"方形":"square","矩形":"rect","圆形":"circle","多边形":"polygon"},shape=shapeMap[shapeRaw]||shapeRaw.toLowerCase();if(!shapeRaw)issues.push({level:"error",message:`缺少“${geometryType==='field'?'作用域形状':'面积形状'}”。`,line:startLine});else if(!["square","rect","circle","polygon"].includes(shape))issues.push({level:"error",message:`无法识别形状“${shapeRaw}”。`,line:lineOf("面积形状","作用域形状")});
      const evidenceText=String(get("面积证据等级","证据等级")||"");const evidence=/原文|硬面积/.test(evidenceText)?"hard":/项目/.test(evidenceText)?"project":"candidate";
      if(shape==="circle"){
        const radius=parseNumber(get("作用半径里","作用半径","半径里","半径"),"半径（里）",issues,lineOf("作用半径里","作用半径","半径里","半径"));if(x!==null&&y!==null&&radius!==null)area={shape:"circle",cx:x,cy:y,radius,west:x-radius,east:x+radius,south:y-radius,north:y+radius,evidence};
      }else if(shape==="polygon"){
        const pts=parsePointList(Array.isArray(get("边界顶点"))?get("边界顶点"):[],"边界顶点",issues,lineOf("边界顶点"),3);if(pts.length>=3){const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);area={shape:"polygon",points:pts,west:Math.min(...xs),east:Math.max(...xs),south:Math.min(...ys),north:Math.max(...ys),evidence};if(x===null||y===null){x=xs.reduce((a,b)=>a+b,0)/xs.length;y=ys.reduce((a,b)=>a+b,0)/ys.length}}
      }else if(shape==="square"||shape==="rect"){
        const w=parseNumber(get("东西宽里","东西宽","边长里","边长"),shape==="square"?"边长／东西宽（里）":"东西宽（里）",issues,lineOf("东西宽里","东西宽","边长里","边长"));const h=shape==="square"?w:parseNumber(get("南北长里","南北长"),"南北长（里）",issues,lineOf("南北长里","南北长"));if(x!==null&&y!==null&&w!==null&&h!==null)area={shape,west:x-w/2,east:x+w/2,south:y-h/2,north:y+h/2,evidence};
      }
    }
    const id=String(get("对象ID")||"").trim();if(id&&state.objects.some(o=>o.id===id))issues.push({level:"error",message:`对象ID“${id}”已存在，不能重复导入。`,line:lineOf("对象ID")});
    const chapter=String(get("所属经篇")||"").trim();if(state.objects.some(o=>o.name===name&&(!chapter||o.chapter===chapter)))issues.push({level:"warn",message:`地图中已有可能同名对象“${name}”，导入时不会自动覆盖。`,line:startLine});
    const known=new Set(["对象ID","地名","类型","所属经篇","所属区域/山系","所属区域／山系","几何类型","X坐标里","X坐标","Y坐标里","Y坐标","中心X里","中心X","中心Y里","中心Y","坐标性质","锁定状态","对象范围/占地","对象范围／占地","直接参照地和原文方向","原文距离","原文","古注","其他古籍","异文","现代考证","常见定位说","百度/维基补充","百度／维基补充","误传辨析","设定与推导","来源URL","面积形状","作用域形状","作用半径里","作用半径","半径里","半径","东西宽里","东西宽","南北长里","南北长","边长里","边长","面积证据等级","证据等级","边界顶点","路径节点","原文流向","汇入对象"].map(normalizeKey));Object.keys(fields).forEach(k=>{if(!known.has(k))unknown.push(k)});if(unknown.length)issues.push({level:"warn",message:`发现未映射字段：${unknown.join("、")}。这些字段不会进入对象标准栏位。`,line:startLine});
    const status=issues.some(i=>i.level==="error")?"error":issues.some(i=>i.level==="warn")?"warn":"ok";
    return {kind:"object",headerName,name,id,geometryType,x,y,path,area,fields,fieldLines,issues,status,startLine,raw:block,chapter,type:String(get("类型")||"").trim(),region:String(get("所属区域/山系","所属区域／山系")||"").trim(),lockStatus:String(get("锁定状态")||"").trim(),coordinateNature:String(get("坐标性质")||"").trim(),reference:String(get("直接参照地和原文方向")||"").trim(),originalDistance:String(get("原文距离")||"").trim(),range:String(get("对象范围/占地","对象范围／占地")||"").trim(),original:String(get("原文")||"").trim(),annotations:String(get("古注")||"").trim(),otherTexts:String(get("其他古籍")||"").trim(),variants:String(get("异文")||"").trim(),modernResearch:String(get("现代考证")||"").trim(),commonLocation:String(get("常见定位说")||"").trim(),popularSources:String(get("百度/维基补充","百度／维基补充")||"").trim(),misconceptions:String(get("误传辨析")||"").trim(),derivation:String(get("设定与推导")||"").trim(),sourceUrl:String(get("来源URL")||"").trim()}
  }
  function parseTileProfileEntry(headerName,block,startLine){
    const {fields,fieldLines,duplicateFields}=parseMarkdownFields(block,startLine),access=markdownFieldAccess(fields,fieldLines,startLine),issues=[],unknown=[];duplicateFields.forEach(d=>issues.push({level:"warn",message:`字段“${d.key}”在同一区块重复出现，程序采用最后一次内容。`,line:d.line}));
    const cell=parseTileCell(headerName,fields,access,issues,startLine),patch={},specifiedKeys=[],scriptureEvents={},scriptureSpecified=[];
    TILE_PROFILE_FIELD_DEFS.forEach(def=>{const hit=access.find(...def.aliases);if(hit.present){patch[def.key]=String(hit.value??"").trim();specifiedKeys.push(def.key)}});
    const timeHit=access.find("时间流逝","是否时间流逝正常");if(timeHit.present){patch.timeNormal=parseTimeState(timeHit.value,issues,timeHit.line);specifiedKeys.push("timeNormal")}
    const reachHit=access.find("旧版可达性字段","旧版可达性");if(reachHit.present){patch.playerReachable=parseReachableState(reachHit.value,issues,reachHit.line);specifiedKeys.push("playerReachable")}
    CHAPTERS_18.forEach(ch=>{const hit=access.find(`${ch}事件`,`《${ch}》事件`);if(hit.present){scriptureEvents[ch]=String(hit.value??"").trim();scriptureSpecified.push(ch)}});
    const known=new Set(["地块坐标","主格坐标","主格X","主格Y","地块X","地块Y","时间流逝","是否时间流逝正常","旧版可达性字段","旧版可达性",...TILE_PROFILE_FIELD_DEFS.flatMap(d=>d.aliases),...CHAPTERS_18.flatMap(ch=>[`${ch}事件`,`《${ch}》事件`])].map(normalizeKey));Object.keys(fields).forEach(k=>{if(!known.has(k))unknown.push(k)});if(unknown.length)issues.push({level:"warn",message:`发现未映射的地块档案字段：${unknown.join("、")}。`,line:startLine});
    if(!specifiedKeys.length&&!scriptureSpecified.length)issues.push({level:"warn",message:"地块档案没有可更新的标准字段。",line:startLine});
    if(cell.key&&!objectsInCellKey(cell.key).length&&!state.tileProfiles[cell.key])issues.push({level:"warn",message:"该主格目前没有对象；仍可建立独立地块档案。",line:startLine});
    const status=issues.some(i=>i.level==="error")?"error":issues.some(i=>i.level==="warn")?"warn":"ok";
    return {kind:"tile_profile",headerName,name:`地块档案 ${cell.key||headerName}`,cellKey:cell.key,gx:cell.gx,gy:cell.gy,profilePatch:patch,specifiedKeys,scriptureEvents,scriptureSpecified,fields,fieldLines,issues,status,startLine,raw:block}
  }
  function parseMarkdown(text){
    const src=String(text||"").replace(/\r\n?/g,"\n"),lines=src.split("\n"),headerRe=/^###\s*(对象|地块档案)\s*[：:]\s*(.+?)\s*$/gm,matches=[...src.matchAll(headerRe)],legacy=[...src.matchAll(/^###\s*坐标\s*[：:]\s*(.+?)\s*$/gm)],malformedHeaders=[];
    lines.forEach((line,i)=>{if(/^#{1,2}\s*(对象|地块档案)\s*[：:]/.test(line)||/^#{4,}\s*(对象|地块档案)\s*[：:]/.test(line))malformedHeaders.push({level:"error",message:"标题层级错误，应使用三个#：### 对象：… 或 ### 地块档案：…。",line:i+1})});
    if(!matches.length)return {format:legacy.length?"legacy":"unknown",entries:[],objects:[],profiles:[],globalIssues:legacy.length?[{level:"error",message:"识别到旧版“### 坐标：”格式。请转换为对象或地块档案格式后导入。",line:1}]:malformedHeaders.length?malformedHeaders:[{level:"error",message:"未识别到“### 对象：”或“### 地块档案：”标题。",line:1}]};
    const entries=[];matches.forEach((m,index)=>{const start=m.index,end=index+1<matches.length?matches[index+1].index:src.length,block=src.slice(start,end),startLine=src.slice(0,start).split("\n").length,kind=m[1],headerName=m[2].trim();entries.push(kind==="对象"?parseObjectEntry(headerName,block,startLine):parseTileProfileEntry(headerName,block,startLine))});
    const objectIds=new Map(),profileCells=new Map();entries.forEach(e=>{if(e.kind==="object"&&e.id){if(objectIds.has(e.id)){e.issues.push({level:"error",message:`同一文件中对象ID“${e.id}”重复。`,line:e.startLine});objectIds.get(e.id).issues.push({level:"error",message:`同一文件中对象ID“${e.id}”重复。`,line:objectIds.get(e.id).startLine})}else objectIds.set(e.id,e)}if(e.kind==="tile_profile"&&e.cellKey){if(profileCells.has(e.cellKey))e.issues.push({level:"warn",message:`同一文件中地块 ${e.cellKey} 出现多次，将按文件顺序依次更新。`,line:e.startLine});else profileCells.set(e.cellKey,e)}e.status=e.issues.some(i=>i.level==="error")?"error":e.issues.some(i=>i.level==="warn")?"warn":"ok"});
    const kinds=new Set(entries.map(e=>e.kind)),format=kinds.size>1?"mixed-v1":kinds.has("tile_profile")?"tile-profile-v1":"object-v1";
    return {format,entries,objects:entries.filter(e=>e.kind==="object"),profiles:entries.filter(e=>e.kind==="tile_profile"),globalIssues:malformedHeaders}
  }
  function analyzeImportText(){updateImportCharCount();const text=els.importText.value;if(!text.trim()){state.importAnalysis=null;renderImportAnalysis(null);return}state.importAnalysis=parseMarkdown(text);const entries=state.importAnalysis.entries||[];state.importSelectedIndex=Math.min(state.importSelectedIndex,Math.max(0,entries.length-1));renderImportAnalysis(state.importAnalysis)}
  function importFormatLabel(format){return {"object-v1":"地图对象格式 v1.1","tile-profile-v1":"地块档案格式 v1.1","mixed-v1":"对象＋地块档案 v1.1","legacy":"旧版坐标索引","unknown":"格式未识别"}[format]||"格式未识别"}
  function renderImportAnalysis(a){
    if(!a){els.importFormatBadge.className="format-badge neutral";els.importFormatBadge.textContent="等待输入";els.importValidationState.className="validation-state";els.importValidationState.textContent="尚未分析";els.importSummary.innerHTML='<div><strong>0</strong><span>识别条目</span></div><div class="ok"><strong>0</strong><span>可导入</span></div><div class="warn"><strong>0</strong><span>警告</span></div><div class="error"><strong>0</strong><span>错误</span></div>';els.importObjectList.innerHTML='<div class="import-empty">载入文件后，这里会列出对象和地块档案。</div>';els.importInspector.innerHTML='<div class="import-empty">正确字段、格式错误、缺失项和更新目标会在这里逐条标示。</div>';els.importApplyBtn.disabled=true;return}
    const entries=a.entries||[],ok=entries.filter(o=>o.status==="ok").length,warn=entries.filter(o=>o.status==="warn").length,error=entries.filter(o=>o.status==="error").length+(a.globalIssues||[]).filter(i=>i.level==="error").length,importable=entries.filter(o=>o.status!=="error").length,validFormat=["object-v1","tile-profile-v1","mixed-v1"].includes(a.format),cls=validFormat?(error?"error":warn?"warn":"ok"):"error";
    els.importFormatBadge.className=`format-badge ${cls}`;els.importFormatBadge.textContent=importFormatLabel(a.format);els.importValidationState.className=`validation-state ${cls}`;els.importValidationState.textContent=error?"存在阻断错误":warn?"可导入，但有警告":"全部通过";els.importSummary.innerHTML=`<div><strong>${entries.length}</strong><span>识别条目</span></div><div class="ok"><strong>${importable}</strong><span>可导入</span></div><div class="warn"><strong>${warn}</strong><span>警告条目</span></div><div class="error"><strong>${error}</strong><span>错误</span></div>`;
    const globalHtml=(a.globalIssues||[]).map(i=>`<div class="issue ${i.level}">第${i.line||1}行：${esc(i.message)}</div>`).join("");
    els.importObjectList.innerHTML=globalHtml+entries.map((o,i)=>{const meta=o.kind==="tile_profile"?`地块档案 · ${o.cellKey||"坐标未完成"}`:`${o.geometryType||"几何类型未识别"} · ${o.x===null?"坐标未完成":coordText(o.x,o.y)}`;return `<button class="import-result-item ${o.status} ${i===state.importSelectedIndex?'selected':''}" data-import-index="${i}"><em>${o.status==='ok'?'通过':o.status==='warn'?'警告':'错误'}</em><strong>${esc(o.name||o.headerName||'未命名条目')}</strong><small>第${o.startLine}行 · ${esc(meta)}</small></button>`}).join("");
    els.importObjectList.querySelectorAll("[data-import-index]").forEach(b=>b.addEventListener("click",()=>{state.importSelectedIndex=Number(b.dataset.importIndex);renderImportAnalysis(a)}));if(entries.length)renderImportInspector(entries[state.importSelectedIndex]);else els.importInspector.innerHTML='<div class="import-empty">请先修正左侧文件格式。</div>';els.importApplyBtn.disabled=!importable
  }
  function renderImportInspector(o){if(!o){els.importInspector.innerHTML='<div class="import-empty">未选择条目。</div>';return}els.importInspectorMeta.textContent=`第${o.startLine}行开始`;
    const issueHtml=o.issues.length?`<div class="issue-list">${o.issues.map(i=>`<div class="issue ${i.level}"><strong>${i.level==='error'?'格式错误':'提示'}</strong> · 第${i.line||o.startLine}行<br>${esc(i.message)}</div>`).join("")}</div>`:`<div class="issue-list"><div class="issue ok"><strong>格式正确</strong><br>${o.kind==='tile_profile'?'可更新指定地块档案。':'必填字段与几何参数均可识别。'}</div></div>`;
    let rows;if(o.kind==="tile_profile"){const profileRows=TILE_PROFILE_FIELD_DEFS.filter(d=>o.specifiedKeys.includes(d.key)).map(d=>[d.label,o.profilePatch[d.key]??""]);rows=[["条目类型","地块档案更新"],["目标主格",o.cellKey||""],["更新方式",state.tileProfiles[o.cellKey]?"更新已有档案":"新建地块档案"],...profileRows,["时间流逝",o.specifiedKeys.includes("timeNormal")?statusText(o.profilePatch.timeNormal,"time"):""],["旧版可达性",o.specifiedKeys.includes("playerReachable")?statusText(o.profilePatch.playerReachable,"player"):""],["经篇事件",o.scriptureSpecified.map(ch=>`${ch}：${o.scriptureEvents[ch]}`).join("\n")]]}else rows=[["条目类型","地图对象"],["对象标题",o.headerName],["地名",o.name],["类型",o.type||""],["所属经篇",o.chapter||""],["几何类型",o.geometryType||""],["坐标",o.x===null?"":coordText(o.x,o.y)],["面积／作用域",o.area?JSON.stringify(o.area,null,2):""],["路径节点",o.path?.length?o.path.map(p=>p.join(", ")).join("\n"):""],["锁定状态",o.lockStatus||""],["原文",o.original||""]];
    els.importInspector.innerHTML=issueHtml+`<div class="field-audit">${rows.map(([k,v])=>`<div class="field-audit-row"><b>${esc(k)}</b><code>${v!==""?esc(v):'—'}</code></div>`).join("")}</div>`
  }
  function importedObjectFromParsed(p){const id=p.id||nextObjectId(),obj={id,rowRef:"NEW",name:p.name,type:p.type||"未分类",x:Number(p.x)||0,y:Number(p.y)||0,coordinateText:coordText(p.x,p.y),chapter:p.chapter,region:p.region,direction:"",distance:Math.hypot(Number(p.x)||0,Number(p.y)||0),reference:p.reference,originalDistance:p.originalDistance,coordinateNature:p.coordinateNature||"Markdown导入，待复核",lockStatus:p.lockStatus,range:p.range,terrain:"",water:"",plants:"",animals:"",minerals:"",wildlife:"",beasts:"",people:"",gods:"",residents:"",appearance:"",abilities:"",events:"",original:p.original,sameName:"",annotations:p.annotations,otherTexts:p.otherTexts,variants:p.variants,modernResearch:p.modernResearch,commonLocation:p.commonLocation,popularSources:p.popularSources,misconceptions:p.misconceptions,derivation:p.derivation,sourceUrl:p.sourceUrl,geometryType:p.geometryType||"point",area:p.area||null};if(p.path?.length)obj.path=p.path;return obj}
  function applyMarkdownImport(){const a=state.importAnalysis;if(!a)return;const valid=(a.entries||[]).filter(o=>o.status!=="error");if(!valid.length){toast("没有可导入条目","请先修正格式错误。","error");return}const added=[],profiles=[],unchanged=[];
    valid.forEach(p=>{if(p.kind==="object"){const obj=importedObjectFromParsed(p);if(state.objects.some(o=>o.id===obj.id))return;state.objects.push(obj);recordChange({entityId:obj.id,operation:"create",operationLabel:"Markdown导入",before:null,after:obj,summary:`从Markdown导入“${obj.name}”，${coordText(obj.x,obj.y)}`});added.push(obj);return}
      const before=state.tileProfiles[p.cellKey]?structuredClone(state.tileProfiles[p.cellKey]):null,after=structuredClone(before||{});p.specifiedKeys.forEach(k=>{after[k]=p.profilePatch[k]});const scripture={...(after.scriptureEvents||{})};p.scriptureSpecified.forEach(ch=>{scripture[ch]=p.scriptureEvents[ch]});if(p.scriptureSpecified.length)after.scriptureEvents=scripture;if(sameValue(before||{},after)){unchanged.push(p.cellKey);return}state.tileProfiles[p.cellKey]=after;recordChange({entityId:`CELL-${p.cellKey}`,entityType:"tile_profile",operation:before?"update":"create",operationLabel:before?"Markdown更新地块档案":"Markdown新增地块档案",before,after:{name:`地块 ${p.cellKey}`,...after},summary:`从Markdown${before?'更新':'建立'}地块 ${p.cellKey} 档案`});profiles.push(p.cellKey)
    });
    populateFilters();renderSidebar();renderDetails();scheduleRender();persist();updateHeader();closeImportWorkspace();if(added[0])jumpToObject(added[0].id,true,true);else if(profiles[0])jumpToCell(profiles[0],false);toast("Markdown导入完成",`新增对象${added.length}个，更新地块档案${profiles.length}个${unchanged.length?`，${unchanged.length}个无变化`:""}。`)
  }
  function readImportFile(file){if(!file)return;const reader=new FileReader();reader.onload=()=>{els.importFileName.textContent=file.name;els.importText.value=String(reader.result||"");analyzeImportText()};reader.onerror=()=>toast("无法读取文件",file.name,"error");reader.readAsText(file,"utf-8")}
  function renderExamplePanel(){const tab=state.exampleTab;$$('.example-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.exampleTab===tab));if(tab==='correct'){els.exampleNotice.className='example-notice ok';els.exampleNotice.innerHTML='<strong>正确案例</strong><span>一个文件可同时新增对象并更新地块档案。</span>';els.exampleCode.textContent=CORRECT_MD_SAMPLE;els.exampleNotes.innerHTML='<ul><li>对象使用“### 对象：”。</li><li>地块档案使用“### 地块档案：X+000_Y+000”。</li><li>简要、基础、详细和文明／事件字段都可更新。</li><li>缩进两格可书写多行内容。</li></ul>';els.loadExampleBtn.textContent='载入正确案例到左侧'}else if(tab==='wrong'){els.exampleNotice.className='example-notice error';els.exampleNotice.innerHTML='<strong>错误案例</strong><span>包含标题、坐标、枚举值与几何参数错误。</span>';els.exampleCode.textContent=WRONG_MD_SAMPLE;els.exampleNotes.innerHTML='<ul><li>“## 对象”标题层级错误。</li><li>地块档案必须提供 X、Y 整数主格坐标。</li><li>时间流逝和旧版可达性应使用示例中的标准值。</li><li>线对象至少需要两个路径节点。</li></ul>';els.loadExampleBtn.textContent='载入错误案例并查看识别'}else{els.exampleNotice.className='example-notice neutral';els.exampleNotice.innerHTML='<strong>识别规则</strong><span>对象和地块档案可混合导入。</span>';els.exampleCode.textContent=IMPORT_RULES_TEXT;els.exampleNotes.innerHTML='<ul><li>地块档案只改写 Markdown 中明确出现的字段。</li><li>明确写出空字段会清空该字段；省略字段则保留原值。</li><li>警告不会阻止导入，但会进入本轮更改记录。</li><li>错误条目不会写入本地地图。</li></ul>';els.loadExampleBtn.textContent='载入空白正确模板'} }


  function bindEvents(){
    els.searchInput.addEventListener("input",()=>{state.filters.q=els.searchInput.value;renderSidebar();scheduleRender()});els.exitSearchBtn.addEventListener("click",()=>{state.filters.q="";els.searchInput.value="";state.previewCell=null;renderSidebar();scheduleRender();els.searchInput.focus()});els.chapterFilter.addEventListener("change",()=>{state.filters.chapter=els.chapterFilter.value;renderSidebar();scheduleRender()});els.resetFilterBtn.addEventListener("click",()=>{state.filters={q:"",chapter:"",type:""};els.searchInput.value="";els.chapterFilter.value="";renderTypeFilterTree();renderSidebar();scheduleRender()});
    $$("[data-jump-name]").forEach(b=>b.addEventListener("click",()=>jumpName(b.dataset.jumpName)));els.fitAllBtn.addEventListener("click",fitAll);els.originBtn.addEventListener("click",()=>{state.camera={...state.camera,x:0,y:0,zoom:.92};state.flippedCell=null;scheduleRender();persist()});els.zoomInBtn.addEventListener("click",()=>setZoom(state.camera.zoom*1.18));els.zoomOutBtn.addEventListener("click",()=>setZoom(state.camera.zoom/1.18));els.zoomReadout.addEventListener("click",()=>setZoom(1));
    els.jumpCoordBtn.addEventListener("click",()=>{els.jumpX.value=Math.round(state.camera.x);els.jumpY.value=Math.round(state.camera.y);openModal("jumpModal")});els.jumpForm.addEventListener("submit",e=>{e.preventDefault();state.camera.x=Number(els.jumpX.value)||0;state.camera.y=Number(els.jumpY.value)||0;state.camera.zoom=Math.max(.72,state.camera.zoom);state.flippedCell=null;closeModal("jumpModal");scheduleRender();persist()});
    [[els.layerAreas,"areas"],[els.layerTerrain,"terrain"],[els.layerRivers,"rivers"],[els.layerEmpty,"empty"],[els.layerChanges,"changes"]].forEach(([el,k])=>el.addEventListener("change",()=>{state.layers[k]=el.checked;scheduleRender()}));
    els.openImportBtn.addEventListener("click",openImportWorkspace);els.closeImportBtn.addEventListener("click",closeImportWorkspace);els.importChooseFileBtn.addEventListener("click",()=>els.importFileInput.click());els.importDropZone.addEventListener("click",()=>els.importFileInput.click());els.importFileInput.addEventListener("change",()=>readImportFile(els.importFileInput.files?.[0]));["dragenter","dragover"].forEach(ev=>els.importDropZone.addEventListener(ev,e=>{e.preventDefault();els.importDropZone.classList.add("dragover")}));["dragleave","drop"].forEach(ev=>els.importDropZone.addEventListener(ev,e=>{e.preventDefault();els.importDropZone.classList.remove("dragover")}));els.importDropZone.addEventListener("drop",e=>readImportFile(e.dataTransfer.files?.[0]));els.importText.addEventListener("input",()=>{updateImportCharCount();debouncedImportAnalyze()});els.reanalyzeImportBtn.addEventListener("click",analyzeImportText);els.clearImportBtn.addEventListener("click",()=>{els.importText.value="";els.importFileName.textContent="尚未选择文件";state.importAnalysis=null;updateImportCharCount();renderImportAnalysis(null)});els.importApplyBtn.addEventListener("click",applyMarkdownImport);$$('.example-tabs button').forEach(b=>b.addEventListener('click',()=>{state.exampleTab=b.dataset.exampleTab;renderExamplePanel()}));els.loadExampleBtn.addEventListener("click",()=>{els.importText.value=state.exampleTab==='wrong'?WRONG_MD_SAMPLE:state.exampleTab==='rules'?BLANK_MD_TEMPLATE:CORRECT_MD_SAMPLE;els.importFileName.textContent=state.exampleTab==='wrong'?'错误案例.md':state.exampleTab==='rules'?'空白导入模板.md':'正确案例.md';analyzeImportText()});
    $$(".detail-tabs button").forEach(b=>b.addEventListener("click",()=>{state.detailTab=b.dataset.tab;renderDetails()}));els.editTileBtn.addEventListener("click",openTileProfileForm);els.deleteTileBtn.addEventListener("click",()=>openDeleteModal("tile"));els.openDossierBtn.addEventListener("click",openDossierWorkspace);els.openRangeEditorBtn.addEventListener("click",()=>openRangeEditor());els.closeDossierBtn.addEventListener("click",closeDossierWorkspace);els.dossierWorkspace.addEventListener("click",e=>{if(e.target===els.dossierWorkspace)closeDossierWorkspace()});els.editDossierBtn.addEventListener("click",()=>{if(!state.dossierCollectionMode)openTileProfileForm()});els.dossierModeBrief.addEventListener("click",()=>{if(state.dossierCollectionMode)return;state.dossierMode="brief";renderDossierWorkspace();persist()});els.dossierModeFull.addEventListener("click",()=>{if(state.dossierCollectionMode)return;state.dossierMode="full";renderDossierWorkspace();persist()});els.dossierLocateBtn.addEventListener("click",()=>{const tile=activeTile();if(!tile)return;closeDossierWorkspace();animateCameraTo(cellCenter(tile.gx),cellCenter(tile.gy),Math.max(state.camera.zoom,.88),()=>{state.flippedCell=tile.key;scheduleRender()})});els.copyPromptBtn.addEventListener("click",()=>{if(state.dossierCollectionMode){const keys=[...state.brushKeys].filter(key=>objectsInCellKey(key).length||state.tileProfiles[key]);if(keys.length)copyText(collectionSummaryText(aggregateBrushCollection(keys)),"区域摘要已复制");return}const tile=activeTile();if(!tile)return;const profile=tileProfileFor(tile.key,tile.items),main=selectedTileMain(tile.items);copyText(makePrompt(profile,tile,main),"地块摘要已复制")});els.copyBriefBtn.addEventListener("click",()=>{if(state.dossierCollectionMode)return;const tile=activeTile();if(!tile)return;const profile=tileProfileFor(tile.key,tile.items),main=selectedTileMain(tile.items);copyText(makeArtBrief(profile,tile,main),"证据摘要已复制")});$$('[data-dossier-tab]').forEach(b=>b.addEventListener('click',()=>{state.dossierTab=b.dataset.dossierTab;renderDossierWorkspace()}));els.tileProfileForm.addEventListener("submit",saveTileProfileForm);els.objectForm.addEventListener("submit",saveObjectForm);els.deleteObjectBtn.addEventListener("click",()=>{const id=els.formObjectId.value;if(id){closeModal("objectModal");openDeleteModal("object",id)}});els.formGeometry.addEventListener("change",updateGeometryRangeHint);els.exportPatchBtn.addEventListener("click",()=>exportPatch(false));els.finishRoundBtn.addEventListener("click",()=>exportPatch(true));els.roundKeepBtn.addEventListener("click",()=>{state.pendingRoundExport=null;closeModal("roundModal");toast("已保留本轮更改","可继续编辑或稍后完成本轮")});els.roundArchiveBtn.addEventListener("click",archiveCurrentRound);els.openChangesTab.addEventListener("click",showChanges);els.openTrashTab.addEventListener("click",openTrash);els.clearTrashBtn.addEventListener("click",clearTrash);els.trashRetentionSelect.addEventListener("change",()=>{state.trashRetentionDays=Number(els.trashRetentionSelect.value)||0;const removed=cleanupExpiredTrash(true);renderTrash();persist();updateHeader();if(!removed)toast("回收站保留规则已更新",state.trashRetentionDays?`自动清理超过${state.trashRetentionDays}天的内容`:"永久保留")});els.openSpecTab.addEventListener("click",showSpecs);els.checkUpdateBtn.addEventListener("click",()=>checkUpdate(false));els.closeFlipBtn.addEventListener("click",()=>{state.flippedCell=null;scheduleRender()});if(els.clearSpatialFocusBtn)els.clearSpatialFocusBtn.addEventListener("click",()=>clearSpatialFocus());
    els.closeRangeEditorBtn.addEventListener("click",closeRangeEditor);els.rangeSaveBtn.addEventListener("click",saveRangeEditor);els.rangeUndoBtn.addEventListener("click",undoRange);els.rangeResetBtn.addEventListener("click",resetRange);els.rangeFitBtn.addEventListener("click",fitRangeEditor);els.createAreaObjectBtn.addEventListener("click",()=>createSpatialObject("area"));els.createFieldObjectBtn.addEventListener("click",()=>createSpatialObject("field"));$$('[data-range-tool]').forEach(b=>b.addEventListener('click',()=>setRangeTool(b.dataset.rangeTool)));els.rangeSnapSelect.addEventListener("change",()=>{state.rangeEditor.snap=Number(els.rangeSnapSelect.value)||10});els.rangeShape.addEventListener("change",()=>convertRangeShape(els.rangeShape.value));els.rangeKind.addEventListener("change",()=>{const o=currentRangeObject();if(o)els.rangeObjectBadge.textContent=`${els.rangeKind.value==='field'?'作用域':'面积'} · ${o.name}`;drawRangeEditor()});els.rangeEvidence.addEventListener("change",()=>{if(state.rangeEditor.draft){state.rangeEditor.draft.evidence=els.rangeEvidence.value;renderRangeAnalysis();drawRangeEditor()}});[els.rangeCenterX,els.rangeCenterY,els.rangeWidth,els.rangeHeight,els.rangeRadius].forEach(x=>x.addEventListener("input",updateRangeFromInputs));els.rangePoints.addEventListener("change",updateRangePoints);els.rangeViewport.addEventListener("pointerdown",rangePointerDown);els.rangeViewport.addEventListener("pointermove",rangePointerMove);els.rangeViewport.addEventListener("pointerup",rangePointerUp);els.rangeViewport.addEventListener("pointercancel",rangePointerUp);els.rangeViewport.addEventListener("click",rangeCanvasClick);els.rangeViewport.addEventListener("dblclick",rangeCanvasDblClick);els.rangeViewport.addEventListener("wheel",rangeWheel,{passive:false});
    $$('[data-close-modal]').forEach(x=>x.addEventListener("click",()=>closeModal(x.dataset.closeModal)));
    els.drillAddBtn.addEventListener("click",()=>{if(!state.drillCell)return;const b=cellBounds(state.drillCell.gx,state.drillCell.gy);closeModal("drillModal");openObjectForm(null,{x:b.cx,y:b.cy})});
    els.innerGrid.addEventListener("mousemove",e=>{if(!state.drillCell)return;const r=els.innerGrid.getBoundingClientRect(),b=cellBounds(state.drillCell.gx,state.drillCell.gy),x=b.west+(e.clientX-r.left)/r.width*100,y=b.north-(e.clientY-r.top)/r.height*100;els.innerCoord.textContent=coordText(Math.round(x),Math.round(y))});
    els.innerGrid.addEventListener("dblclick",e=>{if(!state.drillCell||e.target.closest(".inner-point"))return;const r=els.innerGrid.getBoundingClientRect(),b=cellBounds(state.drillCell.gx,state.drillCell.gy),x=Math.round((b.west+(e.clientX-r.left)/r.width*100)*10)/10,y=Math.round((b.north-(e.clientY-r.top)/r.height*100)*10)/10;closeModal("drillModal");openObjectForm(null,{x,y})});
    els.viewport.addEventListener("wheel",e=>{e.preventDefault();setZoom(state.camera.zoom*(e.deltaY>0?.86:1.16),{x:e.clientX,y:e.clientY})},{passive:false});
    els.viewport.addEventListener("pointerdown",e=>{if(e.button!==0||e.target.closest("button,input,select,textarea"))return;const tile=e.target.closest(".tile");state.pan={active:true,moved:false,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,startCameraX:state.camera.x,startCameraY:state.camera.y,downTile:tile?{key:tile.dataset.cell,gx:Number(tile.dataset.gx),gy:Number(tile.dataset.gy)}:null};els.viewport.setPointerCapture(e.pointerId);els.viewport.classList.add("dragging")});
    els.viewport.addEventListener("pointermove",e=>{const w=screenToWorld(e.clientX,e.clientY);els.coordStatus.textContent=`鼠标 ${coordText(Math.round(w.x),Math.round(w.y))}`;if(!state.pan.active)return;const dx=e.clientX-state.pan.startX,dy=e.clientY-state.pan.startY;if(Math.hypot(dx,dy)>4)state.pan.moved=true;const s=scale();state.camera.x=state.pan.startCameraX-dx/s;state.camera.y=state.pan.startCameraY+dy/s;scheduleRender()});
    const endPan=e=>{if(!state.pan.active)return;const wasMoved=state.pan.moved,downTile=state.pan.downTile;if(wasMoved){state.suppressClickUntil=Date.now()+160}else if(downTile){const now=Date.now(),isDouble=state.lastTileTap.key===downTile.key&&now-state.lastTileTap.time<330,items=objectsInCellKey(downTile.key);state.suppressClickUntil=now+180;const exitedFocus=clickOutsideSpatialFocus(downTile.key);if(state.camera.zoom<2&&items.length){state.lastTileTap={key:null,time:0};state.spatialFocusArmed=true;state.selectedCell=downTile.key;if(!items.some(o=>o.id===state.selectedId))state.selectedId=items[0].id;state.flippedCell=null;renderDetails();renderSidebar();scheduleRender();persist();openDossierWorkspace()}else if(exitedFocus){state.lastTileTap={key:null,time:0}}else if(isDouble){state.lastTileTap={key:null,time:0};openDrill(downTile.gx,downTile.gy)}else{state.lastTileTap={key:downTile.key,time:now};state.spatialFocusArmed=true;state.selectedCell=downTile.key;if(items.length&&!items.some(o=>o.id===state.selectedId))state.selectedId=items[0].id;state.flippedCell=state.flippedCell===downTile.key?null:downTile.key;renderDetails();scheduleRender()}}else if(clickOutsideSpatialFocus(null)){state.suppressClickUntil=Date.now()+160}state.pan.active=false;els.viewport.classList.remove("dragging");try{els.viewport.releasePointerCapture(e.pointerId)}catch{}persist()};els.viewport.addEventListener("pointerup",endPan);els.viewport.addEventListener("pointercancel",endPan);
    els.viewport.addEventListener("dblclick",e=>{if(!state.precisionMode||e.target.closest(".precision-object-group,button,input,select,textarea"))return;e.preventDefault();const w=screenToWorld(e.clientX,e.clientY),x=Math.round(w.x*10)/10,y=Math.round(w.y*10)/10;openObjectForm(null,{x,y})});
    document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!els.dossierWorkspace.classList.contains("hidden")){closeDossierWorkspace();return}if(!els.rangeWorkspace.classList.contains("hidden")){closeRangeEditor();return}if(!els.importWorkspace.classList.contains("hidden")){closeImportWorkspace();return}$$(".modal:not(.hidden)").forEach(m=>m.classList.add("hidden"));state.flippedCell=null;scheduleRender()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();if(!els.rangeWorkspace.classList.contains("hidden"))saveRangeEditor();else exportPatch(false)}})
  }


  // v029 · 综合研究工具与可视化审计
  function setupV027State(){
    state.brushMode=false;
    state.brushErase=false;
    state.brushDrawing=false;
    state.brushSpacePan=false;
    state.brushKeys=new Set(Array.isArray(saved?.brushKeys)?saved.brushKeys:[]);
    state.dossierCollectionMode=false;
    state.overlapViews={};
    state.tutorialTab="start";
    state.viewPreset=saved?.viewPreset||"all";
    state.relationMode=false;
    state.compareMode=false;
    state.compareKeys=new Set(Array.isArray(saved?.compareKeys)?saved.compareKeys:[]);
    state.measureMode=false;
    state.measure={active:false,start:null,current:null,final:null};
  }

  function persist(){
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify({
        objects:state.objects,changes:state.changes,changeArchives:state.changeArchives,
        appliedRemotePatches:state.appliedRemotePatches,remotePatchHistory:state.remotePatchHistory,
        viewedRemotePatches:state.viewedRemotePatches,dataVersion:state.dataVersion,camera:state.camera,
        selectedId:state.selectedId,selectedCell:state.selectedCell,tileProfiles:state.tileProfiles,
        trash:state.trash,trashRetentionDays:state.trashRetentionDays,nextIdCounter:state.nextIdCounter,
        dossierMode:state.dossierMode,brushKeys:[...(state.brushKeys||[])],viewPreset:state.viewPreset,compareKeys:[...(state.compareKeys||[])]
      }));
      els.saveState.textContent="已保存到本地";
      setTimeout(()=>els.saveState.textContent="本地工作区",900);
    }catch(e){console.warn(e)}
  }

  function baseTileProfile(){return {
    briefSummary:"",basicSummary:"",detailedSummary:"",oneLineSummary:"",tileType:"",localTags:"",
    orientation:"",parentRegion:"",adjacentTiles:"",relatedWaters:"",relatedLife:"",sourceReliability:"",
    relationCompleteness:"",geoEnvironment:"",hydrology:"",architecture:"",livingSpecies:"",country:"",
    faith:"",ruler:"",guardian:"",beasts:"",divinePlants:"",herbs:"",minerals:"",specialLife:"",customs:"",
    mythicEncounters:"",occurredEvents:"",tileOriginalExcerpt:"",evidenceChain:"",locationConclusion:"",
    pendingQuestions:"",scriptureEvents:Object.fromEntries(CHAPTERS_18.map(ch=>[ch,""])),
    timeNormal:"unknown",storyOther:"",playerReachable:"unknown",playerEnemies:"",playerPlots:"",playerLoot:""
  }}

  function isCountryOrGroupObject(o){return /^(?:国家|国|族群|部族|人群|异民|国民|丘民|水族聚落)$/.test(objectPrimaryType(o))}
  function isArchitectureOrEventObject(o){return /^(?:事件|事件区|事件地点|遗迹|祭坛|祭祀|墓葬|葬地|台|台群|宫|城|井群|门群|建筑|祠|尸体地标|神话事件)$/.test(objectPrimaryType(o))}
  function sanitizeCategoryText(value,key,items){
    const raw=String(value||"").trim();if(!raw)return "";
    const parts=raw.split(/[\n／/、;；]+/).map(x=>x.trim()).filter(Boolean),objectNames=new Map(items.map(o=>[normalizeText(o.name),o]));
    if(!parts.some(x=>objectNames.has(normalizeText(x))))return raw;
    const kept=parts.filter(x=>{const o=objectNames.get(normalizeText(x));return !o||objectCategory(o)===key});
    return kept.join(" / ")
  }
  function sanitizeTileProfileCategories(profile,items){
    const p={...profile};
    p.architecture=sanitizeCategoryText(p.architecture,"events",items);
    p.divinePlants=sanitizeCategoryText(p.divinePlants,"plants",items);
    p.herbs=sanitizeCategoryText(p.herbs,"plants",items);
    p.beasts=sanitizeCategoryText(p.beasts,"animals",items);
    p.minerals=sanitizeCategoryText(p.minerals,"minerals",items);
    p.country=sanitizeCategoryText(p.country,"people",items);
    p.faith=sanitizeCategoryText(p.faith,"people",items);
    p.ruler=sanitizeCategoryText(p.ruler,"people",items);
    p.guardian=sanitizeCategoryText(p.guardian,"people",items);
    p.specialLife=sanitizeCategoryText(p.specialLife,"people",items);
    p.mythicEncounters=sanitizeCategoryText(p.mythicEncounters,"events",items);
    p.occurredEvents=sanitizeCategoryText(p.occurredEvents,"events",items);
    return p
  }
  function deriveTileProfile(items){
    const p=baseTileProfile();
    p.geoEnvironment=uniqueText(items.flatMap(o=>[o.terrain,o.range]));
    p.hydrology=uniqueText(items.flatMap(o=>[o.water,isHydrologyObject(o)?o.name:"",o.riverTerrainRelation]));
    p.architecture=uniqueText(items.filter(isArchitectureOrEventObject).map(o=>o.name));
    p.livingSpecies=uniqueText(items.flatMap(o=>[o.plants,o.animals,o.wildlife,o.beasts,o.residents]));
    p.country=uniqueText(items.flatMap(o=>[isCountryOrGroupObject(o)?o.name:"",o.people]));
    p.faith=uniqueText(items.flatMap(o=>[o.gods,objectCategory(o)==="people"&&/神祇|神女|神人/.test(objectPrimaryType(o))?o.name:""]));
    p.beasts=uniqueText(items.flatMap(o=>[o.animals,o.wildlife,o.beasts,objectCategory(o)==="animals"?o.name:""]));
    p.divinePlants=uniqueText(items.flatMap(o=>[o.plants,objectCategory(o)==="plants"?o.name:""]));
    p.herbs=uniqueText(items.flatMap(o=>[/草|药|芝|菁|蓏|葵|薤/.test(`${objectPrimaryType(o)} ${o.plants||""}`)?o.plants:""]));
    p.minerals=uniqueText(items.flatMap(o=>[o.minerals,objectCategory(o)==="minerals"?o.name:""]));
    p.specialLife=uniqueText(items.flatMap(o=>[o.people,o.gods,o.residents,["animals","people"].includes(objectCategory(o))?o.appearance:"",["animals","people"].includes(objectCategory(o))?o.abilities:""]));
    p.occurredEvents=uniqueText(items.flatMap(o=>[o.events,objectCategory(o)==="events"?o.name:""]));
    p.relatedWaters=uniqueText(items.filter(isHydrologyObject).map(o=>o.name));
    p.relatedLife=uniqueText(items.filter(o=>["plants","animals","people"].includes(objectCategory(o))).map(o=>o.name));
    p.parentRegion=uniqueText(items.map(o=>o.region));
    CHAPTERS_18.forEach(ch=>{p.scriptureEvents[ch]=uniqueText(items.filter(o=>String(o.chapter||"").includes(ch)).map(o=>o.events))});
    return p
  }

  function tileProfileFor(key,items=objectsInCellKey(key)){
    const derived=deriveTileProfile(items),savedProfile=state.tileProfiles[key]||{},merged={...derived,...savedProfile};
    merged.scriptureEvents={...derived.scriptureEvents,...(savedProfile.scriptureEvents||{})};return sanitizeTileProfileCategories(merged,items)
  }

  function profileCompleteness(profile){
    const keys=["briefSummary","basicSummary","detailedSummary","oneLineSummary","tileType","localTags","orientation","parentRegion","adjacentTiles","relatedWaters","relatedLife","sourceReliability","relationCompleteness","geoEnvironment","hydrology","architecture","livingSpecies","country","faith","ruler","guardian","beasts","divinePlants","herbs","minerals","specialLife","customs","mythicEncounters","occurredEvents","tileOriginalExcerpt","evidenceChain","locationConclusion","pendingQuestions"];
    const filled=keys.filter(k=>hasText(profile[k])).length,scripture=Object.values(profile.scriptureEvents||{}).filter(hasText).length;
    return {filled,total:keys.length+4,scripture,percent:Math.round((filled+Math.min(4,scripture))/(keys.length+4)*100)}
  }

  function renderScriptureEditors(profile){
    els.scriptureEventFields.innerHTML=CHAPTER_GROUPS.map(g=>`<div class="scripture-group-title" style="grid-column:1/-1">${esc(g.name)}</div>${g.chapters.map(ch=>`<details class="scripture-editor-item" ${(profile.scriptureEvents?.[ch]||'')?'open':''}><summary>${esc(ch)}</summary><textarea data-scripture-chapter="${esc(ch)}" placeholder="录入本地块归入《${esc(ch)}》的事件">${esc(profile.scriptureEvents?.[ch]||'')}</textarea></details>`).join('')}`).join('')
  }

  function setFieldValue(id,value){const el=document.getElementById(id);if(el)el.value=value??""}
  function fieldValue(id){return String(document.getElementById(id)?.value||"").trim()}

  function openTileProfileForm(){
    const tile=activeTile();if(!tile)return;const profile=tileProfileFor(tile.key,tile.items);
    els.tileProfileKey.value=tile.key;els.tileProfileTitle.textContent=`编辑地块（${signed(tile.gx)}, ${signed(tile.gy)}）`;
    const map={tileBriefSummary:"briefSummary",tileBasicSummary:"basicSummary",tileDetailedSummary:"detailedSummary",tileOneLineSummary:"oneLineSummary",tileType:"tileType",tileLocalTags:"localTags",tileOrientation:"orientation",tileParentRegion:"parentRegion",tileAdjacentTiles:"adjacentTiles",tileRelatedWaters:"relatedWaters",tileRelatedLife:"relatedLife",tileSourceReliability:"sourceReliability",tileRelationCompleteness:"relationCompleteness",tileGeoEnvironment:"geoEnvironment",tileHydrology:"hydrology",tileArchitecture:"architecture",tileLivingSpecies:"livingSpecies",tileCountry:"country",tileFaith:"faith",tileRuler:"ruler",tileGuardian:"guardian",tileBeasts:"beasts",tileDivinePlants:"divinePlants",tileHerbs:"herbs",tileMinerals:"minerals",tileSpecialLife:"specialLife",tileCustoms:"customs",tileMythicEncounters:"mythicEncounters",tileOccurredEvents:"occurredEvents",tileOriginalExcerpt:"tileOriginalExcerpt",tileEvidenceChain:"evidenceChain",tileLocationConclusion:"locationConclusion",tilePendingQuestions:"pendingQuestions"};
    Object.entries(map).forEach(([id,key])=>setFieldValue(id,profile[key]));renderScriptureEditors(profile);openModal("tileProfileModal")
  }

  function saveTileProfileForm(e){
    e.preventDefault();const key=els.tileProfileKey.value;if(!key)return;const before=state.tileProfiles[key]?structuredClone(state.tileProfiles[key]):null;
    const map={briefSummary:"tileBriefSummary",basicSummary:"tileBasicSummary",detailedSummary:"tileDetailedSummary",oneLineSummary:"tileOneLineSummary",tileType:"tileType",localTags:"tileLocalTags",orientation:"tileOrientation",parentRegion:"tileParentRegion",adjacentTiles:"tileAdjacentTiles",relatedWaters:"tileRelatedWaters",relatedLife:"tileRelatedLife",sourceReliability:"tileSourceReliability",relationCompleteness:"tileRelationCompleteness",geoEnvironment:"tileGeoEnvironment",hydrology:"tileHydrology",architecture:"tileArchitecture",livingSpecies:"tileLivingSpecies",country:"tileCountry",faith:"tileFaith",ruler:"tileRuler",guardian:"tileGuardian",beasts:"tileBeasts",divinePlants:"tileDivinePlants",herbs:"tileHerbs",minerals:"tileMinerals",specialLife:"tileSpecialLife",customs:"tileCustoms",mythicEncounters:"tileMythicEncounters",occurredEvents:"tileOccurredEvents",tileOriginalExcerpt:"tileOriginalExcerpt",evidenceChain:"tileEvidenceChain",locationConclusion:"tileLocationConclusion",pendingQuestions:"tilePendingQuestions"};
    const after={...(before||{})};Object.entries(map).forEach(([key,id])=>after[key]=fieldValue(id));
    after.scriptureEvents=Object.fromEntries(CHAPTERS_18.map(ch=>[ch,els.scriptureEventFields.querySelector(`[data-scripture-chapter="${CSS.escape(ch)}"]`)?.value.trim()||""]));
    state.tileProfiles[key]=after;recordChange({entityId:`CELL-${key}`,entityType:"tile_profile",operation:before?"update":"create",operationLabel:before?"修改地块档案":"新增地块档案",before,after:{name:`地块 ${key}`,...after},summary:`更新地块 ${key} 的地理、对象、事件与证据资料`});
    closeModal("tileProfileModal");renderDetails();if(!els.dossierWorkspace.classList.contains("hidden"))renderDossierWorkspace();if(!document.getElementById("brushCollectionWorkspace")?.classList.contains("hidden"))renderBrushCollection();persist();updateHeader();toast("地块档案已保存",`主格 ${key}`)
  }

  function openObjectForm(o=null,coord=null){
    const isEdit=!!o;els.objectModalTitle.textContent=isEdit?`编辑：${o.name}`:"新增地图对象";els.formObjectId.value=o?.id||"";els.formName.value=o?.name||"";els.formType.value=o?.type||"";els.formX.value=coord?.x??o?.x??0;els.formY.value=coord?.y??o?.y??0;els.formChapter.value=o?.chapter||"";els.formGeometry.value=coord?.geometryType||o?.geometryType||"point";els.formLock.value=o?.lockStatus||"";els.formOriginal.value=o?.original||"";els.formDerivation.value=o?.derivation||"";
    setFieldValue("formAliases",o?.aliases);setFieldValue("formEvidenceLevel",o?.evidenceLevel);setFieldValue("formLocalRelation",o?.localRelation);setFieldValue("formCoreFeatures",o?.coreFeatures);setFieldValue("formEfficacy",o?.efficacy);setFieldValue("formRelationNotes",o?.relationNotes);setFieldValue("formPathStatus",o?.pathStatus);setFieldValue("formRiverTerrainRelation",o?.riverTerrainRelation);setFieldValue("formSourceNotes",o?.sourceNotes);setFieldValue("formPendingQuestions",o?.pendingQuestions);
    updateGeometryRangeHint();els.deleteObjectBtn.classList.toggle("hidden",!isEdit);openModal("objectModal");setTimeout(()=>els.formName.focus(),80)
  }

  function saveObjectForm(e){
    e.preventDefault();const id=els.formObjectId.value;const values={name:els.formName.value.trim(),type:els.formType.value.trim(),x:Number(els.formX.value),y:Number(els.formY.value),chapter:els.formChapter.value.trim(),geometryType:els.formGeometry.value,lockStatus:els.formLock.value.trim(),original:els.formOriginal.value.trim(),derivation:els.formDerivation.value.trim(),aliases:fieldValue("formAliases"),evidenceLevel:fieldValue("formEvidenceLevel"),localRelation:fieldValue("formLocalRelation"),coreFeatures:fieldValue("formCoreFeatures"),efficacy:fieldValue("formEfficacy"),relationNotes:fieldValue("formRelationNotes"),pathStatus:fieldValue("formPathStatus"),riverTerrainRelation:fieldValue("formRiverTerrainRelation"),sourceNotes:fieldValue("formSourceNotes"),pendingQuestions:fieldValue("formPendingQuestions")};
    if(!values.name||!Number.isFinite(values.x)||!Number.isFinite(values.y)){toast("无法保存","请填写地名与有效坐标。","error");return}let savedId=id;
    if(id){const idx=state.objects.findIndex(o=>o.id===id),before=structuredClone(state.objects[idx]);let nextArea=state.objects[idx].area;if((values.geometryType==="area"||values.geometryType==="field")&&!nextArea)nextArea=defaultAreaFor(values.geometryType,values.x,values.y);if(values.geometryType!=="area"&&values.geometryType!=="field")nextArea=null;state.objects[idx]={...state.objects[idx],...values,area:nextArea,coordinateText:coordText(values.x,values.y)};recordChange({entityId:id,operation:"update",operationLabel:"修改对象",before,after:state.objects[idx],summary:summarizeDiff(before,state.objects[idx])});state.selectedId=id;toast("已保存修改",values.name)}
    else{const next=nextObjectId(),spatial=values.geometryType==="area"||values.geometryType==="field",obj={id:next,rowRef:"NEW",...values,coordinateText:coordText(values.x,values.y),region:"",direction:"",distance:Math.hypot(values.x,values.y),reference:"",originalDistance:"",coordinateNature:"本地新增，待补充证据性质",range:"",terrain:"",water:"",plants:"",animals:"",minerals:"",wildlife:"",beasts:"",people:"",gods:"",residents:"",appearance:"",abilities:"",events:"",sameName:"",annotations:"",otherTexts:"",variants:"",modernResearch:"",commonLocation:"",popularSources:"",misconceptions:"",sourceUrl:"",area:spatial?defaultAreaFor(values.geometryType,values.x,values.y):null};state.objects.push(obj);recordChange({entityId:next,operation:"create",operationLabel:"新增对象",before:null,after:obj,summary:`新增“${values.name}”，坐标${coordText(values.x,values.y)}`});state.selectedId=next;savedId=next;const c=objectCell(obj);state.selectedCell=cellKey(c.gx,c.gy);state.flippedCell=cellKey(c.gx,c.gy);toast("已新增对象",values.name)}
    closeModal("objectModal");populateFilters();renderSidebar();renderDetails();scheduleRender();persist();updateHeader();if(values.geometryType==="area"||values.geometryType==="field")setTimeout(()=>openRangeEditor(savedId),120)
  }

  function makePrompt(profile,tile,main){return [`【地块】${main?.name||tile.key}`,`【坐标】主格（${signed(tile.gx)}, ${signed(tile.gy)}）`,`【一句话摘要】${profile.oneLineSummary||profile.briefSummary||"未录入"}`,`【地理环境】${profile.geoEnvironment||"未录入"}`,`【水文特征】${profile.hydrology||"未录入"}`,`【主要对象】${tile.items.map(o=>o.name).join(" / ")||"无"}`,`【当前定位结论】${profile.locationConclusion||"未录入"}`].join("\n")}
  function makeArtBrief(profile,tile,main){return [`【地块】${main?.name||tile.key}`,`【原文摘录】${profile.tileOriginalExcerpt||uniqueText(tile.items.map(o=>o.original))||"未录入"}`,`【资料证据链】${profile.evidenceChain||"未录入"}`,`【来源可信度】${profile.sourceReliability||"未录入"}`,`【待核对问题】${profile.pendingQuestions||"无"}`].join("\n")}

  function fieldGlyph(title){const map={"地理环境":"山","水文特征":"水","建筑与遗迹":"邑","生活物种":"生","所属国度／部族":"国","信仰对象":"祀","统治者":"冠","守护神":"守","奇珍异兽":"兽","神木／神话植被":"木","仙草药草":"草","金玉矿物":"矿","特殊生命":"灵","当地风俗":"俗","神话事件与现象":"奇","已发生事件":"事","地块原文摘录":"文","资料证据链":"证","当前定位结论":"位","待核对问题":"疑"};return map[title]||"录"}
  function researchField(title,value){if(!hasText(value))return "";return `<section class="dossier-field"><h4><span class="field-glyph">${fieldGlyph(title)}</span>${esc(title)}</h4><div>${esc(value)}</div></section>`}
  function objectRibbon(items){if(!items.length)return `<div class="tile-dossier-intro"><strong>空白地块档案</strong><p>本格尚无地图对象，可以先建立地理和证据档案。</p></div>`;return `<div class="tile-dossier-intro"><strong>本格对象 · ${items.length}项</strong><p>${esc(items.map(o=>o.name).join(" / "))}</p></div><div class="tile-object-ribbon">${items.map(o=>`<button class="tile-object-chip ${o.id===state.selectedId?'selected':''}" data-tile-object="${esc(o.id)}">${geometryIcon(o)} ${esc(o.name)}</button>`).join("")}</div>`}

  function renderDetails(){
    const tile=activeTile();if(!tile){els.emptyDetail.classList.remove("hidden");els.detailContent.classList.add("hidden");return}const {key,gx,gy,items}=tile,profile=tileProfileFor(key,items),b=cellBounds(gx,gy),main=selectedTileMain(items);
    els.emptyDetail.classList.add("hidden");els.detailContent.classList.remove("hidden");els.detailRef.textContent=`TILE ${signed(gx)}, ${signed(gy)} · 100里主格`;els.detailName.textContent=main?`${main.name}所在地区`:`空白地块（${signed(gx)}, ${signed(gy)}）`;const populated=Object.values(profile.scriptureEvents||{}).filter(Boolean).length,spatialCount=items.filter(o=>o.geometryType==="area"||o.geometryType==="field").length;els.detailMeta.textContent=`${items.length}个对象 · ${populated}个经篇已有事件归档`;els.detailLocation.innerHTML=`<strong>主格中心 ${coordText(b.cx,b.cy)}</strong><br>范围 X ${signed(b.west)}～${signed(b.east)}里 · Y ${signed(b.south)}～${signed(b.north)}里<br>${esc(profile.oneLineSummary||profile.briefSummary||"地块档案与对象资料分别保存")}`;els.openRangeEditorBtn.textContent=spatialCount?`▱ 编辑面积／作用域（${spatialCount}）`:`＋ 新建面积／作用域`;els.openRangeEditorBtn.classList.toggle("has-range",spatialCount>0);$$('.detail-tabs button').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab===state.detailTab));renderDetailBody(profile,items)
  }

  function renderDetailBody(profile,items){
    let html=objectRibbon(items);
    if(state.detailTab==="summary")html+=`<div class="dossier-section"><div class="dossier-section-head"><h3>地块简述</h3><span>地理 · 水文 · 建筑 · 生物</span></div>${researchField("地理环境",profile.geoEnvironment)}${researchField("水文特征",profile.hydrology)}${researchField("建筑与遗迹",profile.architecture)}${researchField("生活物种",profile.livingSpecies)}</div>`;
    if(state.detailTab==="civilization")html+=`<div class="dossier-section"><div class="dossier-section-head"><h3>文明、神祇与资源</h3><span>原典与研究资料</span></div><div class="dossier-grid">${researchField("所属国度／部族",profile.country)}${researchField("信仰对象",profile.faith)}${researchField("统治者",profile.ruler)}${researchField("守护神",profile.guardian)}</div>${researchField("奇珍异兽",profile.beasts)}<div class="dossier-grid">${researchField("神木／神话植被",profile.divinePlants)}${researchField("仙草药草",profile.herbs)}${researchField("金玉矿物",profile.minerals)}${researchField("特殊生命",profile.specialLife)}</div>${researchField("当地风俗",profile.customs)}</div>`;
    if(state.detailTab==="story")html+=`<div class="dossier-section"><div class="dossier-section-head"><h3>事件、现象与证据</h3><span>神话事件 · 经篇归档 · 定位依据</span></div>${researchField("神话事件与现象",profile.mythicEncounters)}${researchField("已发生事件",profile.occurredEvents)}${researchField("地块原文摘录",profile.tileOriginalExcerpt)}${researchField("资料证据链",profile.evidenceChain)}${researchField("当前定位结论",profile.locationConclusion)}${researchField("待核对问题",profile.pendingQuestions)}${scriptureGroupsHTML(profile)}</div>`;
    els.detailBody.innerHTML=html||`<div class="dossier-empty">本栏尚未录入。</div>`;els.detailBody.querySelectorAll('[data-tile-object]').forEach(btn=>{btn.addEventListener('click',()=>{state.spatialFocusArmed=true;state.selectedId=btn.dataset.tileObject;renderDetails();renderSidebar();scheduleRender();persist()});btn.addEventListener('dblclick',()=>{const o=state.objects.find(x=>x.id===btn.dataset.tileObject);if(o)openObjectForm(o)})})
  }

  function normalizeDisplayCategory(value){
    const map={"地貌":"terrain","山水地貌":"terrain","草木":"plants","鸟兽":"animals","矿物":"minerals","金玉矿物":"minerals","人群神祇":"people","事迹":"events","事件遗迹":"events"};
    return map[String(value||"").trim()]||""
  }
  function objectPrimaryType(o){return String(o?.type||"").split(/[／/]/)[0].trim()}
  function objectCategory(o){
    const override=normalizeDisplayCategory(o?.displayCategory);if(override)return override;
    const primary=objectPrimaryType(o),name=String(o?.name||"").trim(),vague=!primary||/未分类|其他/.test(primary);
    // 分类以正式“类型”的第一层为准，名称只在类型缺失时辅助判断。
    // 这样“帝丹朱葬”“玉山”“蛇山”“神民之丘”等不会因单字被错误归类。
    if(/^(?:金玉矿物|矿物|矿产|矿石|玉矿|金矿|铜矿|铁矿|银矿|锡矿|铅矿|宝石|玉石|美石|丹砂|朱砂|石英|珠玉)$/.test(primary))return "minerals";
    if(/^(?:神木|灵木|木|树|草木|草|药草|仙草|植物|植被|花|果|禾)$/.test(primary))return "plants";
    if(/^(?:动物|异兽|野兽|神兽|鸟兽|异鸟|神鸟|鸟|蛇|异蛇|鱼|虫|龙|虎|豹|狐|龟|鹿|马|牛|羊|猿|猴|巨豕|五彩巨鸟)$/.test(primary))return "animals";
    if(/^(?:事件|事件区|事件地点|遗迹|祭坛|祭祀|墓葬|葬地|台|台群|宫|城|井群|门群|建筑|祠|尸体地标|能力作用域|神话事件)$/.test(primary))return "events";
    if(/^(?:国家|国|族群|部族|人群|异民|国民|丘民|人物|神祇|神女|神人|帝|王|君|巫|巨人|水族聚落|尸体)$/.test(primary))return "people";
    if(vague){
      if(/丹砂|朱砂|金矿|玉矿|铜矿|铁矿|银矿|矿石|宝石|玉石|美石$/.test(name))return "minerals";
      if(/(?:神木|灵木|树|草|花|药|芝)$/.test(name))return "plants";
      if(/(?:鸟|兽|蛇|鱼|虫|龙|虎|豹|狐|龟|鹿|马|牛|羊|猿|猴)$/.test(name))return "animals";
      if(/(?:国|族|民|氏)$/.test(name))return "people";
      if(/(?:葬|墓|遗迹|祭坛|祠|宫|城|台)$/.test(name))return "events"
    }
    return "terrain"
  }
  const V027_CATEGORIES=[
    {key:"terrain",label:"山水地貌",glyph:"山"},{key:"plants",label:"草木",glyph:"木"},{key:"animals",label:"鸟兽",glyph:"兽"},{key:"minerals",label:"金玉矿物",glyph:"玉"},{key:"people",label:"人群神祇",glyph:"神"},{key:"events",label:"事件遗迹",glyph:"事"}
  ];
  function splitTags(v){return String(v||"").split(/[／/、,，;；\n]+/).map(x=>x.trim()).filter(Boolean)}
  function evidenceTextForObject(o){return uniqueText([o.evidenceLevel,o.coordinateNature,o.lockStatus,o.chapter]).replace(/\n/g," / ")}
  function objectCoreText(o){return uniqueText([o.coreFeatures,o.appearance,o.terrain,o.water,o.plants,o.animals,o.minerals,o.abilities]).split("\n")[0]||"资料待补充"}
  function groupObjectsForCategory(items,cat,prefix){
    const groups=new Map();items.filter(o=>objectCategory(o)===cat).forEach(o=>{const a=objectAnchor(o),k=`${a.x.toFixed(1)},${a.y.toFixed(1)}`;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(o)});
    return [...groups.entries()].map(([coord,objects])=>({coord,objects,id:`${prefix}|${cat}|${coord}|${objects.map(o=>o.id).join("-")}`}))
  }
  function categoryProfileSummary(profile,key){const map={terrain:uniqueText([profile.geoEnvironment,profile.hydrology]),plants:uniqueText([profile.divinePlants,profile.herbs]),animals:profile.beasts,minerals:profile.minerals,people:uniqueText([profile.country,profile.faith,profile.ruler,profile.guardian,profile.specialLife]),events:uniqueText([profile.architecture,profile.mythicEncounters,profile.occurredEvents])};return map[key]||""}
  function sourceTileLabelForObject(o){
    const c=objectCell(o),key=cellKey(c.gx,c.gy),items=objectsInCellKey(key),profile=tileProfileFor(key,items),main=selectedTileMain(items);
    return main?.name||profile.tileType||tileCoordCode(c.gx,c.gy)
  }
  function identityTagGroupHTML(label,value,limit=6){
    const tags=splitTags(value);if(!tags.length)return "";const shown=tags.slice(0,limit),left=tags.length-shown.length;
    return `<section class="identity-relation-group"><b>${esc(label)}</b><div>${shown.map(t=>`<span>${esc(t)}</span>`).join("")}${left?`<em>其余 ${left} 项</em>`:""}</div></section>`
  }
  function categoryAnchorId(prefix,key){return `category-${prefix}-${key}`.replace(/[^a-zA-Z0-9_-]/g,"-")}
  function categoryOverviewHTML(items,prefix){
    return `<section class="category-overview"><div class="category-overview-head"><div><span class="eyebrow">CONTENT OVERVIEW</span><h3>区域内容概览</h3></div><p>先看类别与代表对象，再向下阅读详细资料。</p></div><div class="category-overview-grid">${V027_CATEGORIES.map(cat=>{const list=items.filter(o=>objectCategory(o)===cat.key),names=list.map(o=>o.name),preview=names.slice(0,3).join(" / "),left=Math.max(0,names.length-3),anchor=categoryAnchorId(prefix,cat.key);return `<button class="category-overview-card ${list.length?'':'empty'}" data-category-jump="${anchor}"><span class="category-accent accent-${cat.key}"></span><span class="category-overview-icon">${cat.glyph}</span><span class="category-overview-copy"><strong>${cat.label}</strong><small>${esc(preview||"暂无明确记载")}${left?` · 另 ${left} 项`:""}</small></span><b>${list.length}</b></button>`}).join("")}</div></section>`
  }
  function objectPreviewRows(objects){
    const relation=uniqueText(objects.map(o=>o.localRelation)),core=uniqueText(objects.map(objectCoreText)),rows=[];
    if(hasText(relation))rows.push(["与本地关系",shortText(relation,115)]);
    if(hasText(core))rows.push(["核心特征",shortText(core,140)]);
    return rows.slice(0,2)
  }
  function overlapCardHTML(group){
    const view=state.overlapViews[group.id]||{flipped:false,index:0},objects=group.objects,idx=Math.max(0,Math.min(objects.length-1,view.index||0)),o=objects[idx],names=objects.map(x=>x.name).join(" / "),isOverlap=objects.length>1,tags=[...new Set(objects.flatMap(x=>[x.type,x.chapter,x.evidenceLevel]).filter(Boolean))].slice(0,4),source=[...new Set(objects.map(sourceTileLabelForObject))].join(" / ");
    const flip=isOverlap?`<button class="overlap-flip-btn" data-overlap-flip="${esc(group.id)}" title="翻转查看重叠对象">翻转查看</button>`:"";
    const previews=objectPreviewRows(objects).map(([k,v])=>`<div class="object-summary-row"><b>${esc(k)}</b><p>${esc(v)}</p></div>`).join("");
    const detailRows=[["类型",o.type],["所属经篇",o.chapter],["精确坐标",coordText(o.x,o.y)],["与本地关系",o.localRelation],["核心特征",o.coreFeatures||objectCoreText(o)],["功效／性质",o.efficacy],["关系说明",o.relationNotes],["证据等级",evidenceTextForObject(o)]].filter(([,v])=>hasText(v));
    return `<article class="overlap-card ${view.flipped?'flipped':''}"><section class="overlap-card-face overlap-card-front"><div class="object-card-head"><div class="overlap-card-title"><i>${geometryIcon(o)}</i><div><strong>${esc(names)}</strong><small>${esc(tags.slice(0,2).join(" · ")||"地图对象")}</small></div></div>${flip}</div>${previews||`<div class="object-summary-row"><b>资料摘要</b><p>当前对象尚未形成简述，点击查看详细资料。</p></div>`}<div class="object-card-foot"><span>来自：${esc(source)}</span><button data-object-detail="${esc(o.id)}">查看详情 →</button></div></section><section class="overlap-card-face overlap-card-back">${flip}<div class="overlap-object-switch">${objects.map((x,i)=>`<button class="${i===idx?'active':''}" data-overlap-object="${esc(group.id)}" data-overlap-index="${i}">${esc(x.name)}</button>`).join("")}</div><h4 class="overlap-back-title">${esc(o.name)}</h4>${detailRows.map(([k,v])=>`<div class="overlap-back-row"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join("")}<div class="object-card-foot"><span>来自：${esc(sourceTileLabelForObject(o))}</span><button data-object-detail="${esc(o.id)}">查看完整资料 →</button></div></section></article>`
  }
  function categoryReadingHTML(profile,items,prefix){
    return `<section class="category-reading"><div class="category-reading-head"><div><span class="eyebrow">CATEGORY READING</span><h3>分类阅读</h3></div><p>对象卡片默认只显示摘要；需要时再展开完整资料。</p></div><div class="category-reading-grid">${V027_CATEGORIES.map(cat=>{const groups=groupObjectsForCategory(items,cat.key,prefix),summary=categoryProfileSummary(profile,cat.key),count=items.filter(o=>objectCategory(o)===cat.key).length,anchor=categoryAnchorId(prefix,cat.key);return `<article class="reading-category accent-border-${cat.key}" id="${anchor}"><header class="reading-category-head"><div><i>${cat.glyph}</i><span><strong>${cat.label}</strong><small>${count?`${count} 个对象`:'暂无明确对象'}</small></span></div>${count?`<b>${count}</b>`:""}</header>${summary?`<div class="reading-category-summary">${esc(shortText(summary,240))}</div>`:""}<div class="reading-object-list">${groups.length?groups.map(overlapCardHTML).join(""):`<div class="reading-category-empty"><i>${cat.glyph}</i><span>${summary?"已有地块汇总资料，尚无独立对象。":"本类尚无明确记载。"}</span></div>`}</div></article>`}).join("")}</div></section>`
  }
  function openIdentityObjectDrawer(id){
    const o=state.objects.find(x=>x.id===id);if(!o)return;let overlay=document.getElementById("identityObjectDrawer");if(!overlay){overlay=document.createElement("section");overlay.id="identityObjectDrawer";overlay.className="identity-object-drawer hidden";overlay.innerHTML=`<div class="identity-drawer-backdrop" data-close-identity-drawer></div><aside><header><div><span class="eyebrow">OBJECT MONOGRAPH</span><h2 id="identityDrawerTitle"></h2><p id="identityDrawerMeta"></p></div><button class="icon-btn" data-close-identity-drawer>×</button></header><div id="identityDrawerBody"></div></aside>`;document.body.appendChild(overlay);overlay.querySelectorAll('[data-close-identity-drawer]').forEach(x=>x.addEventListener('click',()=>overlay.classList.add('hidden')))}
    overlay.querySelector('#identityDrawerTitle').textContent=o.name;overlay.querySelector('#identityDrawerMeta').textContent=`${o.type||"未分类"} · ${coordText(o.x,o.y)} · ${o.chapter||"未标经篇"}`;
    const rows=[["与本地关系",o.localRelation],["核心特征",o.coreFeatures||objectCoreText(o)],["功效／性质",o.efficacy],["关系说明",o.relationNotes],["原文",o.original],["古注",o.annotations],["其他古籍",o.otherTexts],["异文",o.variants],["现代考证",o.modernResearch],["定位与地图推导",o.derivation],["证据等级",evidenceTextForObject(o)],["资料来源",o.sourceNotes],["来源URL",o.sourceUrl],["待核对问题",o.pendingQuestions]].filter(([,v])=>hasText(v));
    overlay.querySelector('#identityDrawerBody').innerHTML=rows.length?rows.map(([k,v])=>`<section><h3>${esc(k)}</h3><p>${esc(v)}</p></section>`).join(""):`<div class="dossier-empty">该对象尚未录入更多资料。</div>`;overlay.classList.remove('hidden')
  }

  function renderIdentityBoard(profile,items,tile,main,{prefix="dossier"}={}){
    const complete=profileCompleteness(profile),name=main?.name||profile.tileType||`地块 ${tile.key}`,type=profile.tileType||main?.type||"未分类地块",oneLine=profile.oneLineSummary||profile.briefSummary||shortText(profile.geoEnvironment||main?.derivation||"尚未形成一句话摘要",150),chapters=CHAPTERS_18.filter(ch=>items.some(o=>String(o.chapter||"").includes(ch))),tags=splitTags(profile.localTags).slice(0,10),sourcePercent=Math.max(0,Math.min(100,Number(String(profile.relationCompleteness||"").replace("%",""))||complete.percent));
    const identityRows=[["地块类型",type],["方位范围",profile.orientation],["所属经篇",chapters.join(" / ")],["主格坐标",tileCoordCode(tile.gx,tile.gy)]].filter(([,v])=>hasText(v));
    const autoSummary=buildV029AutoRegionSummary({entries:[{key:tile.key}],items,chapters});
    const original=profile.tileOriginalExcerpt||uniqueText(items.map(o=>o.original)),evidence=profile.evidenceChain||uniqueText(items.flatMap(o=>[o.chapter,o.annotations,o.modernResearch,o.sourceNotes,o.sourceUrl]));
    return `<article class="tile-identity-board reading-layout" data-board-tile="${esc(tile.key)}"><aside class="tile-identity-sidebar"><div class="tile-identity-mark"><i>${geometryIcon(main||{type})}</i><div><h2>${esc(name)}</h2><small>${esc(type)} · ${esc(state.dataVersion)}</small></div></div><div><div class="identity-label">一句话摘要</div><div class="identity-summary-box">${esc(oneLine)}</div></div>${tags.length?`<div><div class="identity-label">本地标签</div><div class="identity-tags">${tags.map(t=>`<span>${esc(t)}</span>`).join("")}</div></div>`:""}<div class="identity-table">${identityRows.map(([k,v])=>`<div class="identity-row"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join("")}</div><div class="identity-relation-groups">${identityTagGroupHTML("父级区域",profile.parentRegion)}${identityTagGroupHTML("相邻地块",profile.adjacentTiles)}${identityTagGroupHTML("关联水域",profile.relatedWaters)}${identityTagGroupHTML("关联生灵",profile.relatedLife)}</div><div class="identity-progress"><div class="identity-progress-row"><span>来源可信度</span><i style="--p:${profile.sourceReliability==='高'?'100%':profile.sourceReliability==='中'?'65%':profile.sourceReliability==='低'?'35%':'15%'}"></i><strong>${esc(profile.sourceReliability||"待核对")}</strong></div><div class="identity-progress-row"><span>关联完整度</span><i style="--p:${sourcePercent}%"></i><strong>${sourcePercent}%</strong></div></div><button class="btn secondary full" data-board-locate="${esc(tile.key)}">⌖ 查看地图位置</button></aside><section class="tile-identity-main"><div class="identity-hero"><div class="identity-hero-copy"><h2>${esc(name)}</h2><p>${esc(profile.basicSummary||oneLine)}</p><div class="identity-tags">${tags.slice(0,6).map(t=>`<span>${esc(t)}</span>`).join("")}</div></div><div class="identity-hero-actions"><button data-board-copy="${esc(tile.key)}">复制本页摘要</button><button data-board-full="${esc(tile.key)}">打开完整博物志</button></div></div><section class="auto-region-summary compact-summary"><div><h3>自动摘要</h3><p>${esc(autoSummary.text)}</p></div><div class="auto-region-stats">${autoSummary.stats.map(x=>`<span>${esc(x)}</span>`).join("")}</div></section>${categoryOverviewHTML(items,`${prefix}-${tile.key}`)}${categoryReadingHTML(profile,items,`${prefix}-${tile.key}`)}<div class="identity-bottom-grid"><section class="identity-research-block ${original?'':'empty'}"><h3>原文摘录</h3><p>${esc(original)}</p></section><section class="identity-research-block ${evidence?'':'empty'}"><h3>资料证据链</h3><p>${esc(evidence)}</p></section></div>${profile.locationConclusion?`<section class="identity-research-block"><h3>当前定位结论</h3><p>${esc(profile.locationConclusion)}</p></section>`:""}${profile.pendingQuestions?`<section class="identity-research-block"><h3>待核对问题</h3><p>${esc(profile.pendingQuestions)}</p></section>`:""}</section></article>`
  }

  function bindIdentityBoardEvents(root=document){
    root.querySelectorAll('[data-category-jump]').forEach(btn=>btn.addEventListener('click',()=>{const target=root.querySelector(`#${CSS.escape(btn.dataset.categoryJump)}`);target?.scrollIntoView({behavior:'smooth',block:'start'})}));
    root.querySelectorAll('[data-object-detail]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();openIdentityObjectDrawer(btn.dataset.objectDetail)}));
    root.querySelectorAll('[data-overlap-flip]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();const id=btn.dataset.overlapFlip,current=state.overlapViews[id]||{flipped:false,index:0};state.overlapViews[id]={...current,flipped:!current.flipped};rerenderActiveBoard()}));
    root.querySelectorAll('[data-overlap-object]').forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();const id=btn.dataset.overlapObject,current=state.overlapViews[id]||{flipped:true,index:0};state.overlapViews[id]={...current,flipped:true,index:Number(btn.dataset.overlapIndex)||0};rerenderActiveBoard()}));
    root.querySelectorAll('[data-board-locate]').forEach(btn=>btn.addEventListener('click',()=>locateBoardTile(btn.dataset.boardLocate)));
    root.querySelectorAll('[data-board-full]').forEach(btn=>btn.addEventListener('click',()=>openFullDossierForTile(btn.dataset.boardFull)));
    root.querySelectorAll('[data-board-copy]').forEach(btn=>btn.addEventListener('click',()=>{const key=btn.dataset.boardCopy,[gx,gy]=key.split(',').map(Number),items=objectsInCellKey(key),profile=tileProfileFor(key,items),main=selectedTileMain(items);copyText(makePrompt(profile,{key,gx,gy,items},main),"地块摘要已复制")}))
  }
  function rerenderActiveBoard(){const pane=els.dossierContent?.closest(".dossier-right"),top=pane?.scrollTop||0;renderDossierWorkspace();requestAnimationFrame(()=>{if(pane)pane.scrollTop=top})}
  function locateBoardTile(key){const [gx,gy]=key.split(',').map(Number);document.getElementById("brushCollectionWorkspace")?.classList.add("hidden");closeDossierWorkspace();state.selectedCell=key;const items=objectsInCellKey(key);if(items[0])state.selectedId=items[0].id;animateCameraTo(cellCenter(gx),cellCenter(gy),Math.max(state.camera.zoom,.88),()=>{state.flippedCell=null;scheduleRender();renderDetails()})}
  function openFullDossierForTile(key){document.getElementById("brushCollectionWorkspace")?.classList.add("hidden");state.dossierCollectionMode=false;state.selectedCell=key;const items=objectsInCellKey(key);if(items[0])state.selectedId=items[0].id;state.dossierMode="full";els.dossierWorkspace.classList.remove("hidden");renderDossierWorkspace()}

  function openDossierWorkspace(){const tile=activeTile();if(!tile){toast("尚未选择地块","请先在地图中选择一个地块。","error");return}state.dossierCollectionMode=false;state.dossierMode="brief";state.dossierTab="overview";els.dossierWorkspace.classList.remove("hidden");renderDossierWorkspace()}
  function closeDossierWorkspace(){state.dossierCollectionMode=false;els.dossierWorkspace.classList.remove("collection-mode");els.dossierWorkspace.classList.add("hidden")}
  function renderBriefDossier(profile,items,tile,main,b){return renderIdentityBoard(profile,items,tile,main,{prefix:"dossier"})}
  function resetDossierTopbarForTile(){
    els.dossierWorkspace.classList.remove("collection-mode");
    els.dossierModeBrief.closest(".dossier-mode-toggle")?.classList.remove("hidden");
    els.copyBriefBtn.classList.remove("hidden");
    els.editDossierBtn.classList.remove("hidden");
    els.copyPromptBtn.textContent="▣ 复制地块摘要";
    els.copyBriefBtn.textContent="▤ 复制证据摘要";
  }
  function renderBrushCollectionInDossier(){
    const keys=[...state.brushKeys].filter(key=>objectsInCellKey(key).length||state.tileProfiles[key]);
    if(!keys.length){closeDossierWorkspace();toast("地块集合为空","请重新使用画笔采集地块。","error");return}
    const data=aggregateBrushCollection(keys);
    state.dossierMode="brief";
    els.dossierWorkspace.classList.add("brief-mode","collection-mode");
    els.dossierWorkspace.classList.remove("full-mode");
    els.dossierModeBrief.classList.add("active");els.dossierModeFull.classList.remove("active");
    els.dossierModeBrief.closest(".dossier-mode-toggle")?.classList.add("hidden");
    els.copyBriefBtn.classList.add("hidden");els.editDossierBtn.classList.add("hidden");
    els.copyPromptBtn.textContent="▣ 复制区域摘要";
    els.dossierPageTitle.textContent="画笔采集 · 区域博物志";
    els.dossierPageMeta.textContent=`已合并 ${keys.length} 个100里地块 · ${data.items.length}个对象 · 右键地图中的已选地块可取消`;
    els.dossierContent.innerHTML=renderCollectionMuseum(data);
    bindIdentityBoardEvents(els.dossierContent);
    els.dossierContent.querySelector('[data-collection-locate-all]')?.addEventListener('click',()=>locateCollectionArea(keys));
    els.dossierContent.querySelector('[data-collection-copy]')?.addEventListener('click',()=>copyText(collectionSummaryText(data),"区域摘要已复制"));
    els.dossierContent.querySelector('[data-collection-continue]')?.addEventListener('click',()=>{closeDossierWorkspace();setBrushMode(true,false)});
    els.dossierContent.querySelector('[data-collection-clear]')?.addEventListener('click',()=>{state.brushKeys.clear();updateBrushUI();persist();closeDossierWorkspace();toast("已清空地块集合","可以重新使用画笔采集。")});
    els.dossierContent.querySelectorAll('[data-collection-locate]').forEach(b=>b.addEventListener('click',()=>locateBoardTile(b.dataset.collectionLocate)));
    els.dossierContent.querySelectorAll('[data-collection-full]').forEach(b=>b.addEventListener('click',()=>openFullDossierForTile(b.dataset.collectionFull)));
    els.dossierContent.querySelectorAll('[data-collection-remove]').forEach(b=>b.addEventListener('click',()=>{state.brushKeys.delete(b.dataset.collectionRemove);updateBrushUI();persist();if(state.brushKeys.size)renderBrushCollectionInDossier();else closeDossierWorkspace()}));
  }
  function renderDossierWorkspace(){
    if(state.dossierCollectionMode){renderBrushCollectionInDossier();return}
    resetDossierTopbarForTile();
    const tile=activeTile();if(!tile){closeDossierWorkspace();return}const {key,gx,gy,items}=tile,profile=tileProfileFor(key,items),main=selectedTileMain(items),b=cellBounds(gx,gy),complete=profileCompleteness(profile),chapters=CHAPTERS_18.filter(ch=>items.some(o=>String(o.chapter||"").includes(ch)));
    els.dossierWorkspace.classList.toggle("brief-mode",state.dossierMode==="brief");els.dossierWorkspace.classList.toggle("full-mode",state.dossierMode==="full");els.dossierModeBrief.classList.toggle("active",state.dossierMode==="brief");els.dossierModeFull.classList.toggle("active",state.dossierMode==="full");els.dossierPageTitle.textContent=main?`${main.name} · 地块博物志`:`空白地块 · 地块博物志`;els.dossierPageMeta.textContent=`地图数据 ${state.dataVersion} · 主格（${signed(gx)}, ${signed(gy)}） · ${items.length}个对象`;els.dossierCoordBadge.textContent=tileCoordCode(gx,gy);els.dossierCardTitle.textContent=main?`${main.name}地块档案`:`空白地块档案`;els.dossierBrief.textContent=profile.briefSummary||shortText(profile.geoEnvironment||main?.derivation||main?.terrain,120);els.dossierStandard.textContent=profile.basicSummary||dossierStandardText(profile,items);els.dossierBadges.innerHTML=[...(chapters.length?chapters:["未标经篇"]),profile.sourceReliability||"可信度待核对",main?.coordinateNature||"坐标性质未录入"].slice(0,5).map((x,i)=>`<span class="mono-badge ${i>0?'lock':''}">${esc(shortText(x,26))}</span>`).join("");els.dossierCompletenessText.textContent=`${complete.percent}%`;els.dossierCompletenessBar.style.width=`${complete.percent}%`;els.dossierCompletenessMeta.textContent=`核心字段 ${complete.filled}/${complete.total-4} · 已归档经篇 ${complete.scripture}/18`;els.dossierObjectCount.textContent=items.length;els.dossierObjectIndex.innerHTML=items.map(o=>`<button class="dossier-object-item ${o.id===state.selectedId?'selected':''}" data-dossier-object="${esc(o.id)}"><i>${geometryIcon(o)}</i><span><strong>${esc(o.name)}</strong><small>${esc(o.type||'未分类')} · ${coordText(o.x,o.y)}</small></span><em>${esc(o.rowRef||'NEW')}</em></button>`).join("")||`<div class="dossier-empty">本格尚无对象。</div>`;els.dossierChapterBadge.textContent=chapters.join(" · ")||"未标经篇";els.dossierHeroTitle.textContent=main?`《${main.name}》考证大卷`:`空白地块考证大卷`;$$('[data-dossier-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.dossierTab===state.dossierTab));if(state.dossierMode==="brief")els.dossierContent.innerHTML=renderBriefDossier(profile,items,tile,main,b);else renderDossierContent(profile,items,tile,main,b);els.dossierObjectIndex.querySelectorAll('[data-dossier-object]').forEach(btn=>btn.addEventListener('click',()=>{state.selectedId=btn.dataset.dossierObject;renderDetails();renderSidebar();renderDossierWorkspace();persist()}));bindIdentityBoardEvents(els.dossierContent)
  }

  function renderDossierContent(profile,items,tile,main,b){
    let html="";
    if(state.dossierTab==="overview")html=`<section class="book-section"><div class="book-section-title"><b>I. 地块身份与位置</b><span>主格、范围和空间关系</span></div><div class="icon-card-grid">${iconCard("主格中心",coordText(b.cx,b.cy))}${iconCard("X范围",`${signed(b.west)}～${signed(b.east)}里`)}${iconCard("Y范围",`${signed(b.south)}～${signed(b.north)}里`)}${iconCard("父级区域",profile.parentRegion)}${iconCard("相邻地块",profile.adjacentTiles)}${iconCard("来源可信度",profile.sourceReliability)}</div></section><section class="book-section"><div class="book-section-title"><b>II. 地理与生态环境</b><span>地貌、水文、建筑和生物</span></div><div class="icon-card-grid">${iconCard("地理环境",profile.geoEnvironment)}${iconCard("水文特征",profile.hydrology)}${iconCard("建筑与遗迹",profile.architecture)}${iconCard("生活物种",profile.livingSpecies)}${iconCard("关联水域",profile.relatedWaters)}${iconCard("关联生灵",profile.relatedLife)}</div></section>${profile.locationConclusion?`<section class="book-section">${wideCard("当前定位结论",profile.locationConclusion)}</section>`:""}`;
    if(state.dossierTab==="civilization")html=`<section class="book-section"><div class="book-section-title"><b>I. 文明与神祇</b><span>国度、部族、信仰和风俗</span></div><div class="icon-card-grid">${iconCard("所属国度／部族",profile.country)}${iconCard("信仰对象",profile.faith)}${iconCard("统治者",profile.ruler)}${iconCard("守护神",profile.guardian)}${iconCard("当地风俗",profile.customs)}${iconCard("特殊生命",profile.specialLife)}</div></section><section class="book-section"><div class="book-section-title"><b>II. 生灵、植被与矿物</b><span>原典中的自然对象</span></div><div class="icon-card-grid">${iconCard("奇珍异兽",profile.beasts)}${iconCard("神木植被",profile.divinePlants)}${iconCard("仙草药草",profile.herbs)}${iconCard("金玉矿物",profile.minerals)}${iconCard("生活物种",profile.livingSpecies)}</div></section>`;
    if(state.dossierTab==="story")html=`<section class="book-section"><div class="book-section-title"><b>I. 神话事件与现象</b><span>神迹、祭祀、自然异常和历史事件</span></div>${profile.mythicEncounters?wideCard("神话事件与现象",profile.mythicEncounters):""}${profile.occurredEvents?wideCard("已发生事件",profile.occurredEvents):""}</section><section class="book-section"><div class="book-section-title"><b>II. 十八经篇事件归档</b><span>按原典经篇分别记录</span></div>${scriptureGroupsHTML(profile)}</section>`;
    if(state.dossierTab==="sources")html=`${profile.tileOriginalExcerpt||profile.evidenceChain||profile.pendingQuestions?`<section class="book-section"><div class="book-section-title"><b>I. 地块证据总览</b><span>原文、证据链和待核对问题</span></div>${profile.tileOriginalExcerpt?wideCard("地块原文摘录",profile.tileOriginalExcerpt):""}${profile.evidenceChain?wideCard("资料证据链",profile.evidenceChain):""}${profile.pendingQuestions?wideCard("待核对问题",profile.pendingQuestions):""}</section>`:""}${items.length?items.map(o=>`<section class="source-object-block"><h3>${esc(o.name)} <small>${esc(o.rowRef||'')}</small></h3>${[["原文",o.original],["古注",o.annotations],["其他古籍",o.otherTexts],["异文",o.variants],["现代考证",o.modernResearch],["常见定位说",o.commonLocation],["误传辨析",o.misconceptions],["定位与地图推导",o.derivation],["资料来源说明",o.sourceNotes],["待核对问题",o.pendingQuestions],["来源 URL",o.sourceUrl]].map(([k,v])=>`<details ${v?'':'class="empty"'}><summary>${k}</summary><div>${v?esc(v):'尚未录入'}</div></details>`).join("")}</section>`).join(""):`<div class="dossier-empty">本格暂无对象来源资料。</div>`}`;
    if(state.dossierTab==="history"){const ids=new Set(items.map(o=>o.id)),history=state.changes.filter(c=>ids.has(c.entityId)||c.entityId===`CELL-${tile.key}`).slice().reverse();html=history.length?`<div class="history-timeline">${history.map(c=>`<article class="history-node"><strong>${esc(c.operationLabel||c.operation||'更改')}</strong><small>${esc(c.time||'')} · 基于 ${esc(c.baseVersion||state.dataVersion)}</small><p>${esc(c.summary||'')}</p></article>`).join("")}</div>`:`<div class="dossier-empty">当前地块在本轮尚无本地修改记录。正式数据来自 ${esc(INITIAL.metadata?.sourceWorkbook||'最新版母表')}。</div>`}
    els.dossierContent.innerHTML=html||`<div class="dossier-empty">本栏尚未录入。</div>`
  }

  function drawBrushSelection(ctx,v){if(!state.brushKeys?.size)return;ctx.save();state.brushKeys.forEach(key=>{const [gx,gy]=key.split(',').map(Number),b=cellBounds(gx,gy);if(b.east<v.left||b.west>v.right||b.north<v.bottom||b.south>v.top)return;const nw=worldToScreen(b.west,b.north),se=worldToScreen(b.east,b.south);ctx.fillStyle="rgba(214,141,49,.12)";ctx.strokeStyle="rgba(200,113,23,.95)";ctx.lineWidth=3;ctx.setLineDash([8,5]);ctx.fillRect(nw.x,nw.y,se.x-nw.x,se.y-nw.y);ctx.strokeRect(nw.x+1.5,nw.y+1.5,se.x-nw.x-3,se.y-nw.y-3)});ctx.restore()}

  function updateBrushUI(){const btn=document.getElementById("brushModeBtn"),collection=document.getElementById("brushCollectionBtn"),count=document.getElementById("brushCollectionCount");btn?.classList.toggle("active",state.brushMode&&!state.brushErase);btn?.classList.toggle("erase",state.brushMode&&state.brushErase);if(btn)btn.textContent=state.brushMode?(state.brushErase?"⌁ 擦除地块":"⌁ 画笔采集中"):"⌁ 画笔采集";if(count)count.textContent=state.brushKeys.size;if(collection)collection.classList.toggle("hidden",!state.brushKeys.size);els.viewport.classList.toggle("brush-mode",state.brushMode);scheduleRender()}
  function setBrushMode(on,erase=false){state.brushMode=!!on;state.brushErase=!!erase;state.brushDrawing=false;updateBrushUI();if(on)toast(erase?"擦除画笔已开启":"采集画笔已开启",erase?"划过已收录地块即可移除":"拖动划过有对象或已有档案的地块；按住空格可临时拖动地图")}
  function brushVisitAt(clientX,clientY){const w=screenToWorld(clientX,clientY),gx=cellIndex(w.x),gy=cellIndex(w.y),key=cellKey(gx,gy),has=objectsInCellKey(key).length||state.tileProfiles[key];if(!has)return;const had=state.brushKeys.has(key);if(state.brushErase){if(!had)return;state.brushKeys.delete(key)}else{if(had)return;state.brushKeys.add(key)}updateBrushUI()}
  function openBrushCollection(){if(!state.brushKeys.size){toast("尚未采集地块","开启画笔后拖动划过有内容的地块。","error");return}setBrushMode(false);document.getElementById("brushCollectionWorkspace")?.classList.add("hidden");state.dossierCollectionMode=true;state.dossierMode="brief";state.dossierTab="overview";els.dossierWorkspace.classList.remove("hidden");renderDossierWorkspace()}
  function closeBrushCollection(){document.getElementById("brushCollectionWorkspace")?.classList.add("hidden");if(state.dossierCollectionMode)closeDossierWorkspace()}
  function collectionTileEntry(key){
    const [gx,gy]=key.split(',').map(Number),items=objectsInCellKey(key),profile=tileProfileFor(key,items),main=selectedTileMain(items);
    return {key,gx,gy,items,profile,main,name:main?.name||profile.tileType||`地块 ${tileCoordCode(gx,gy)}`}
  }
  function aggregateBrushCollection(keys){
    const entries=keys.map(collectionTileEntry),objectMap=new Map();
    entries.forEach(entry=>entry.items.forEach(o=>{if(!objectMap.has(o.id))objectMap.set(o.id,o)}));
    const items=[...objectMap.values()],profiles=entries.map(e=>e.profile),joinField=field=>uniqueText(profiles.map(p=>p?.[field]).filter(hasText));
    const reliabilityValues=profiles.map(p=>p.sourceReliability).filter(hasText),reliabilityRank={"高":3,"中":2,"低":1,"待核对":0};
    const reliabilityScore=reliabilityValues.length?reliabilityValues.reduce((sum,v)=>sum+(reliabilityRank[v]??0),0)/reliabilityValues.length:0;
    const sourceReliability=reliabilityScore>=2.5?"高":reliabilityScore>=1.5?"中":reliabilityScore>=.5?"低":"待核对";
    const completenessValues=profiles.map(p=>Number(String(p.relationCompleteness||"").replace("%",""))).filter(Number.isFinite),relationCompleteness=completenessValues.length?Math.round(completenessValues.reduce((a,b)=>a+b,0)/completenessValues.length):Math.round(profiles.reduce((sum,p)=>sum+profileCompleteness(p).percent,0)/Math.max(1,profiles.length));
    const bounds=entries.reduce((acc,e)=>{const b=cellBounds(e.gx,e.gy);acc.west=Math.min(acc.west,b.west);acc.east=Math.max(acc.east,b.east);acc.south=Math.min(acc.south,b.south);acc.north=Math.max(acc.north,b.north);return acc},{west:Infinity,east:-Infinity,south:Infinity,north:-Infinity});
    const chapters=CHAPTERS_18.filter(ch=>items.some(o=>String(o.chapter||"").includes(ch))),tags=[...new Set(profiles.flatMap(p=>splitTags(p.localTags)))].slice(0,16);
    const profile={
      oneLineSummary:`共采集 ${entries.length} 个100里地块，汇总 ${items.length} 个地图对象。`,
      briefSummary:joinField("briefSummary"),basicSummary:joinField("basicSummary"),detailedSummary:joinField("detailedSummary"),
      tileType:"画笔采集区域",localTags:tags.join(" / "),orientation:`X ${signed(bounds.west)}～${signed(bounds.east)}里 · Y ${signed(bounds.south)}～${signed(bounds.north)}里`,
      parentRegion:joinField("parentRegion"),adjacentTiles:joinField("adjacentTiles"),relatedWaters:joinField("relatedWaters"),relatedLife:joinField("relatedLife"),
      sourceReliability,relationCompleteness:`${relationCompleteness}%`,geoEnvironment:joinField("geoEnvironment"),hydrology:joinField("hydrology"),architecture:joinField("architecture"),livingSpecies:joinField("livingSpecies"),
      country:joinField("country"),faith:joinField("faith"),ruler:joinField("ruler"),guardian:joinField("guardian"),beasts:joinField("beasts"),divinePlants:joinField("divinePlants"),herbs:joinField("herbs"),minerals:joinField("minerals"),specialLife:joinField("specialLife"),customs:joinField("customs"),mythicEncounters:joinField("mythicEncounters"),occurredEvents:joinField("occurredEvents"),
      tileOriginalExcerpt:uniqueText([joinField("tileOriginalExcerpt"),...items.map(o=>o.original)]),
      evidenceChain:uniqueText([joinField("evidenceChain"),...items.flatMap(o=>[o.chapter,o.annotations,o.modernResearch,o.sourceNotes,o.sourceUrl])]),
      locationConclusion:joinField("locationConclusion"),pendingQuestions:uniqueText([joinField("pendingQuestions"),...items.map(o=>o.pendingQuestions)]),scriptureEvents:{}
    };
    return {entries,items,profile,bounds,chapters,tags,relationCompleteness}
  }
  function collectionSummaryText(data){
    const categoryLines=V027_CATEGORIES.map(cat=>`${cat.label}：${data.items.filter(o=>objectCategory(o)===cat.key).map(o=>o.name).join(" / ")||"无"}`);
    return [`【画笔采集区域】${data.entries.length}个100里地块`,`【对象总数】${data.items.length}`,`【覆盖范围】${data.profile.orientation}`,`【所属经篇】${data.chapters.join(" / ")||"未标经篇"}`,...categoryLines].join("\n")
  }
  function collectionTileDirectoryHTML(entries){
    return `<section class="collection-tile-directory"><h3>采集地块目录</h3><p>以下地块已合并进本页博物志；点击名称可回到地图定位。</p><div class="collection-tile-grid">${entries.map(e=>`<article class="collection-tile-item"><button class="collection-tile-main" data-collection-locate="${esc(e.key)}"><i>${geometryIcon(e.main||{type:e.profile.tileType})}</i><span><strong>${esc(e.name)}</strong><small>${esc(tileCoordCode(e.gx,e.gy))} · ${e.items.length}项</small></span></button><div><button data-collection-full="${esc(e.key)}">完整</button><button data-collection-remove="${esc(e.key)}">移除</button></div></article>`).join("")}</div></section>`
  }
  function renderCollectionMuseum(data){
    const {entries,items,profile,chapters,tags,relationCompleteness}=data,autoSummary=buildV029AutoRegionSummary(data),prefix="collection-combined";
    const identityRows=[["采集地块",`${entries.length}个100里主格`],["对象总数",`${items.length}项`],["覆盖范围",profile.orientation],["所属经篇",chapters.join(" / ")],["数据版本",state.dataVersion]].filter(([,v])=>hasText(v));
    return `<article class="tile-identity-board collection-museum-board reading-layout"><aside class="tile-identity-sidebar"><div class="tile-identity-mark"><i>集</i><div><h2>采集区域</h2><small>画笔合并博物志</small></div></div><div><div class="identity-label">区域摘要</div><div class="identity-summary-box">${esc(autoSummary.text)}</div></div>${tags.length?`<div><div class="identity-label">汇总标签</div><div class="identity-tags">${tags.slice(0,10).map(t=>`<span>${esc(t)}</span>`).join("")}</div></div>`:""}<div class="identity-table">${identityRows.map(([k,v])=>`<div class="identity-row"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join("")}</div><div class="identity-relation-groups">${identityTagGroupHTML("父级区域",profile.parentRegion)}${identityTagGroupHTML("关联水域",profile.relatedWaters)}${identityTagGroupHTML("关联生灵",profile.relatedLife)}</div><div class="identity-progress"><div class="identity-progress-row"><span>来源可信度</span><i style="--p:${profile.sourceReliability==='高'?'100%':profile.sourceReliability==='中'?'65%':profile.sourceReliability==='低'?'35%':'15%'}"></i><strong>${esc(profile.sourceReliability)}</strong></div><div class="identity-progress-row"><span>关联完整度</span><i style="--p:${relationCompleteness}%"></i><strong>${relationCompleteness}%</strong></div></div><button class="btn secondary full" data-collection-locate-all>⌖ 查看全部选区</button></aside><section class="tile-identity-main"><div class="identity-hero"><div class="identity-hero-copy"><h2>画笔采集区域博物志</h2><p>已将 ${entries.length} 个地块的资料合并为同一份分层阅读页面。</p><div class="identity-tags">${tags.slice(0,8).map(t=>`<span>${esc(t)}</span>`).join("")}</div></div><div class="identity-hero-actions"><button data-collection-copy>复制区域摘要</button><button data-collection-continue>继续追加</button><button data-collection-clear>清空集合</button></div></div><section class="auto-region-summary compact-summary"><div><h3>自动区域摘要</h3><p>${esc(autoSummary.text)}</p></div><div class="auto-region-stats">${autoSummary.stats.map(x=>`<span>${esc(x)}</span>`).join("")}</div></section>${categoryOverviewHTML(items,prefix)}${categoryReadingHTML(profile,items,prefix)}<details class="collection-directory-collapse"><summary>采集地块目录 · ${entries.length} 个地块</summary>${collectionTileDirectoryHTML(entries)}</details><div class="identity-bottom-grid"><section class="identity-research-block ${profile.tileOriginalExcerpt?'':'empty'}"><h3>原文摘录汇总</h3><p>${esc(profile.tileOriginalExcerpt)}</p></section><section class="identity-research-block ${profile.evidenceChain?'':'empty'}"><h3>资料证据链汇总</h3><p>${esc(profile.evidenceChain)}</p></section></div>${profile.locationConclusion?`<section class="identity-research-block"><h3>定位结论汇总</h3><p>${esc(profile.locationConclusion)}</p></section>`:""}${profile.pendingQuestions?`<section class="identity-research-block"><h3>待核对问题汇总</h3><p>${esc(profile.pendingQuestions)}</p></section>`:""}</section></article>`
  }
  function locateCollectionArea(keys){
    if(!keys.length)return;const bounds=keys.reduce((acc,key)=>{const [gx,gy]=key.split(',').map(Number),b=cellBounds(gx,gy);acc.west=Math.min(acc.west,b.west);acc.east=Math.max(acc.east,b.east);acc.south=Math.min(acc.south,b.south);acc.north=Math.max(acc.north,b.north);return acc},{west:Infinity,east:-Infinity,south:Infinity,north:-Infinity}),r=els.viewport.getBoundingClientRect(),w=Math.max(100,bounds.east-bounds.west),h=Math.max(100,bounds.north-bounds.south),zoom=Math.max(MIN_ZOOM,Math.min(3.8,Math.min((r.width-120)/(w*BASE_CELL_PX/100),(r.height-120)/(h*BASE_CELL_PX/100))));
    closeBrushCollection();animateCameraTo((bounds.west+bounds.east)/2,(bounds.south+bounds.north)/2,zoom,()=>{state.flippedCell=null;scheduleRender()})
  }
  function renderBrushCollection(){
    const list=document.getElementById("brushCollectionList"),meta=document.getElementById("brushCollectionMeta");if(!list)return;const keys=[...state.brushKeys].filter(key=>objectsInCellKey(key).length||state.tileProfiles[key]);
    if(meta)meta.textContent=keys.length?`已合并 ${keys.length} 个100里地块 · 所有内容集中在同一页博物志`:`尚未采集地块`;
    if(!keys.length){list.innerHTML=`<div class="collection-empty"><h2>集合为空</h2><p>返回地图开启画笔，划过有对象或已建立档案的地块。</p></div>`;return}
    const data=aggregateBrushCollection(keys);list.innerHTML=`<section class="collection-museum-shell">${renderCollectionMuseum(data)}</section>`;bindIdentityBoardEvents(list);
    list.querySelector('[data-collection-locate-all]')?.addEventListener('click',()=>locateCollectionArea(keys));
    list.querySelector('[data-collection-copy]')?.addEventListener('click',()=>copyText(collectionSummaryText(data),"区域摘要已复制"));
    list.querySelectorAll('[data-collection-locate]').forEach(b=>b.addEventListener('click',()=>locateBoardTile(b.dataset.collectionLocate)));
    list.querySelectorAll('[data-collection-full]').forEach(b=>b.addEventListener('click',()=>openFullDossierForTile(b.dataset.collectionFull)));
    list.querySelectorAll('[data-collection-remove]').forEach(b=>b.addEventListener('click',()=>{state.brushKeys.delete(b.dataset.collectionRemove);updateBrushUI();renderBrushCollection();persist()}))
  }

  function tutorialHTML(tab){
    const data={
      start:[["1","浏览地图","拖动地图，滚轮缩放；400%以上进入10里彩色精细地图。"],["2","查看地块","低于200%单击地块直接打开宽幅简述卡牌。"],["3","查看对象","卡牌按山水、草木、鸟兽、矿物、人群神祇、事件遗迹分栏。"],["4","进入完整档案","点击“完整”查看原文、古注、考证和版本记录。"]],
      dossier:[["简","简述卡牌","左侧是地块身份和关系，右侧是一眼可见的六类对象。"],["叠","重叠对象","相同精确坐标的对象使用“名称 / 名称”展示；点击↻翻转查看各对象资料。"],["数","分类统计","分类标题右侧数字只表示本类对象总数，不用于代替重叠名称。"],["证","证据优先","底部显示原文摘录、证据链、定位结论和待核对问题。"]],
      brush:[["开","开启画笔","点击地图工具栏“画笔采集”，按住左键拖动。"],["收","自动收集","经过有对象或已有地块档案的100里主格会被加入集合，所有地块合并为同一页区域博物志。"],["移","右键取消","在地图上右键点击橙色已选地块，可立即从集合中移除。"],["移图","临时拖图","画笔开启时按住空格再拖动，可以临时移动地图。"]],
      markdown:[["块","地块档案","标题使用“### 地块档案：X+001_Y+014”。"],["物","地图对象","标题使用“### 对象：名称”，字段写成“* 字段名：内容”。"],["线","河流线条","几何类型写“线”，路径节点每行写“- X,Y”，节点顺序即流向顺序。"],["空","更新规则","省略字段表示保留；明确写出空字段表示清空。"]],
      precision:[["入","进入精细地图","放大到420%以上自动显示10里网格、地貌底色和精确对象位置。"],["水","水系显示","河流和溪流使用蓝色线条叠加，湖泽等明确水域使用面积。"],["证","不编造路径","缺少路径节点时只显示已知位置，不会自动把相邻水点连成河。"],["退","退出精细地图","缩小到380%以下自动恢复100里地块卡片。"]],
      research:[["镜","悬停透镜","鼠标停在地块或对象上，直接预览摘要、经篇、证据和关联。"],["联","关系高亮","选择对象后开启关系高亮，直接关系和同区域关系会连线显示。"],["尺","测量尺","在地图上拖动，查看直线距离、方向和跨越的100里地块。"],["比","对比与审计","选择2—4个地块对比；孤立对象检查用于发现缺失区域或参照关系的条目。"],["图","小地图与视图预设","小地图用于快速跳转；地理、水系、神话、文明和证据视图可一键切换。"]]
    };
    return `<div class="tutorial-grid">${(data[tab]||data.start).map(([i,h,p])=>`<article class="tutorial-step"><i>${i}</i><h3>${h}</h3><p>${p}</p></article>`).join("")}</div>`
  }
  function renderTutorial(){document.getElementById("tutorialBody").innerHTML=tutorialHTML(state.tutorialTab);document.querySelectorAll('[data-tutorial-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tutorialTab===state.tutorialTab))}
  function openTutorial(){openModal("tutorialModal");renderTutorial()}

  function parseMainGridPoint(value){const s=String(value||"").trim();let m=s.match(/X\s*([+-]\d+)\s*_?\s*Y\s*([+-]\d+)/i);if(!m)m=s.match(/^[（(]?\s*([+-]?\d+)\s*[,，]\s*([+-]?\d+)\s*[）)]?$/);if(!m)return null;return {gx:Number(m[1]),gy:Number(m[2])}}
  function parseObjectEntry(headerName,block,startLine){
    const {fields,fieldLines,duplicateFields}=parseMarkdownFields(block,startLine),access=markdownFieldAccess(fields,fieldLines,startLine),get=access.get,lineOf=access.lineOf,unknown=[],issues=[];duplicateFields.forEach(d=>issues.push({level:"warn",message:`字段“${d.key}”在同一区块重复出现，程序采用最后一次内容。`,line:d.line}));
    let name=String(get("地名")||"").trim();if(!name){name=headerName;issues.push({level:"warn",message:"未填写“地名”字段，已暂用对象标题作为地名。",line:startLine})}
    const rawGeom=String(get("几何类型")||"").trim(),geomMap={"点":"point","点对象":"point","point":"point","线":"line","线型对象":"line","line":"line","面积":"area","面积对象":"area","area":"area","作用域":"field","field":"field"},geometryType=geomMap[rawGeom.toLowerCase()]||geomMap[rawGeom];if(!rawGeom)issues.push({level:"error",message:"缺少必填字段“几何类型”。",line:startLine});else if(!geometryType)issues.push({level:"error",message:`无法识别几何类型“${rawGeom}”；可用：点、线、面积、作用域。`,line:lineOf("几何类型")});
    let x=null,y=null,path=[],area=null;
    if(geometryType==="point"){
      const xhit=access.find("X坐标里","X坐标","中心X里","中心X"),yhit=access.find("Y坐标里","Y坐标","中心Y里","中心Y");
      if(xhit.present&&yhit.present){x=parseNumber(xhit.value,"X坐标（里）",issues,xhit.line);y=parseNumber(yhit.value,"Y坐标（里）",issues,yhit.line)}else{const grid=parseMainGridPoint(get("主格坐标","地块坐标"));if(grid){x=cellCenter(grid.gx);y=cellCenter(grid.gy);issues.push({level:"warn",message:"只提供了100里主格坐标，程序暂以主格中心显示；请保留“同格待定”坐标性质。",line:lineOf("主格坐标","地块坐标")})}else{issues.push({level:"error",message:"点对象需要X、Y精确里坐标，或提供主格坐标。",line:startLine})}}
    }else if(geometryType==="line"){path=parsePointList(Array.isArray(get("路径节点"))?get("路径节点"):[],"路径节点",issues,lineOf("路径节点"),2);if(path.length){x=path[0][0];y=path[0][1]}}
    else if(geometryType==="area"||geometryType==="field"){
      x=parseNumber(get("中心X里","中心X","X坐标里","X坐标"),"中心X（里）",issues,lineOf("中心X里","中心X"));y=parseNumber(get("中心Y里","中心Y","Y坐标里","Y坐标"),"中心Y（里）",issues,lineOf("中心Y里","中心Y"));const shapeRaw=String(get("面积形状","作用域形状")||"").trim(),shapeMap={"方形":"square","矩形":"rect","圆形":"circle","多边形":"polygon"},shape=shapeMap[shapeRaw]||shapeRaw.toLowerCase();if(!shapeRaw)issues.push({level:"error",message:`缺少“${geometryType==='field'?'作用域形状':'面积形状'}”。`,line:startLine});else if(!["square","rect","circle","polygon"].includes(shape))issues.push({level:"error",message:`无法识别形状“${shapeRaw}”。`,line:lineOf("面积形状","作用域形状")});const evidenceText=String(get("面积证据等级","证据等级")||"");const evidence=/原文|硬面积/.test(evidenceText)?"hard":/项目/.test(evidenceText)?"project":"candidate";if(shape==="circle"){const radius=parseNumber(get("作用半径里","作用半径","半径里","半径"),"半径（里）",issues,lineOf("作用半径里","作用半径","半径里","半径"));if(x!==null&&y!==null&&radius!==null)area={shape:"circle",cx:x,cy:y,radius,west:x-radius,east:x+radius,south:y-radius,north:y+radius,evidence}}else if(shape==="polygon"){const pts=parsePointList(Array.isArray(get("边界顶点"))?get("边界顶点"):[],"边界顶点",issues,lineOf("边界顶点"),3);if(pts.length>=3){const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);area={shape:"polygon",points:pts,west:Math.min(...xs),east:Math.max(...xs),south:Math.min(...ys),north:Math.max(...ys),evidence};if(x===null||y===null){x=xs.reduce((a,b)=>a+b,0)/xs.length;y=ys.reduce((a,b)=>a+b,0)/ys.length}}}else if(shape==="square"||shape==="rect"){const w=parseNumber(get("东西宽里","东西宽","边长里","边长"),shape==="square"?"边长／东西宽（里）":"东西宽（里）",issues,lineOf("东西宽里","东西宽","边长里","边长"));const h=shape==="square"?w:parseNumber(get("南北长里","南北长"),"南北长（里）",issues,lineOf("南北长里","南北长"));if(x!==null&&y!==null&&w!==null&&h!==null)area={shape,west:x-w/2,east:x+w/2,south:y-h/2,north:y+h/2,evidence}}
    }
    const id=String(get("对象ID")||"").trim();if(id&&state.objects.some(o=>o.id===id))issues.push({level:"error",message:`对象ID“${id}”已存在，不能重复导入。`,line:lineOf("对象ID")});const chapter=String(get("所属经篇")||"").trim();if(state.objects.some(o=>o.name===name&&(!chapter||o.chapter===chapter)))issues.push({level:"warn",message:`地图中已有可能同名对象“${name}”，导入时不会自动覆盖。`,line:startLine});
    const known=new Set(["对象ID","地名","别名","别名/异文名","类型","所属经篇","所属区域/山系","所属区域／山系","几何类型","主格坐标","地块坐标","X坐标里","X坐标","Y坐标里","Y坐标","中心X里","中心X","中心Y里","中心Y","坐标性质","证据等级","锁定状态","对象范围/占地","对象范围／占地","直接参照地和原文方向","原文距离","与本地关系","核心特征","功效","功效/作用","关系说明","路径状态","原文流向","发源对象","流经对象","汇入对象","支流","汇流点","水系与地貌关系","原文","古注","其他古籍","异文","现代考证","常见定位说","百度/维基补充","百度／维基补充","误传辨析","定位与地图推导","设定与推导","资料来源","资料来源说明","来源URL","待核对问题","面积形状","作用域形状","作用半径里","作用半径","半径里","半径","东西宽里","东西宽","南北长里","南北长","边长里","边长","面积证据等级","边界顶点","路径节点"].map(normalizeKey));Object.keys(fields).forEach(k=>{if(!known.has(k))unknown.push(k)});if(unknown.length)issues.push({level:"warn",message:`发现未映射字段：${unknown.join("、")}。这些字段不会进入对象标准栏位。`,line:startLine});const status=issues.some(i=>i.level==="error")?"error":issues.some(i=>i.level==="warn")?"warn":"ok";
    return {kind:"object",headerName,name,id,geometryType,x,y,path,area,fields,fieldLines,issues,status,startLine,raw:block,chapter,type:String(get("类型")||"").trim(),region:String(get("所属区域/山系","所属区域／山系")||"").trim(),aliases:String(get("别名","别名/异文名")||"").trim(),evidenceLevel:String(get("证据等级")||"").trim(),lockStatus:String(get("锁定状态")||"").trim(),coordinateNature:String(get("坐标性质")||"").trim(),reference:String(get("直接参照地和原文方向")||"").trim(),originalDistance:String(get("原文距离")||"").trim(),range:String(get("对象范围/占地","对象范围／占地")||"").trim(),localRelation:String(get("与本地关系")||"").trim(),coreFeatures:String(get("核心特征")||"").trim(),efficacy:String(get("功效","功效/作用")||"").trim(),relationNotes:String(get("关系说明")||"").trim(),pathStatus:String(get("路径状态")||"").trim(),flowDirection:String(get("原文流向")||"").trim(),sourceObject:String(get("发源对象")||"").trim(),throughObjects:String(get("流经对象")||"").trim(),mergeTarget:String(get("汇入对象")||"").trim(),tributaries:String(get("支流")||"").trim(),confluencePoints:String(get("汇流点")||"").trim(),riverTerrainRelation:String(get("水系与地貌关系")||"").trim(),original:String(get("原文")||"").trim(),annotations:String(get("古注")||"").trim(),otherTexts:String(get("其他古籍")||"").trim(),variants:String(get("异文")||"").trim(),modernResearch:String(get("现代考证")||"").trim(),commonLocation:String(get("常见定位说")||"").trim(),popularSources:String(get("百度/维基补充","百度／维基补充")||"").trim(),misconceptions:String(get("误传辨析")||"").trim(),derivation:String(get("定位与地图推导","设定与推导")||"").trim(),sourceNotes:String(get("资料来源","资料来源说明")||"").trim(),sourceUrl:String(get("来源URL")||"").trim(),pendingQuestions:String(get("待核对问题")||"").trim()}
  }

  function parseTileProfileEntry(headerName,block,startLine){
    const {fields,fieldLines,duplicateFields}=parseMarkdownFields(block,startLine),access=markdownFieldAccess(fields,fieldLines,startLine),issues=[],unknown=[];duplicateFields.forEach(d=>issues.push({level:"warn",message:`字段“${d.key}”在同一区块重复出现，程序采用最后一次内容。`,line:d.line}));const cell=parseTileCell(headerName,fields,access,issues,startLine),patch={},specifiedKeys=[],scriptureEvents={},scriptureSpecified=[];TILE_PROFILE_FIELD_DEFS.forEach(def=>{const hit=access.find(...def.aliases);if(hit.present){patch[def.key]=String(hit.value??"").trim();specifiedKeys.push(def.key)}});CHAPTERS_18.forEach(ch=>{const hit=access.find(`${ch}事件`,`《${ch}》事件`);if(hit.present){scriptureEvents[ch]=String(hit.value??"").trim();scriptureSpecified.push(ch)}});const known=new Set(["地块坐标","主格坐标","主格X","主格Y","地块X","地块Y",...TILE_PROFILE_FIELD_DEFS.flatMap(d=>d.aliases),...CHAPTERS_18.flatMap(ch=>[`${ch}事件`,`《${ch}》事件`])].map(normalizeKey));Object.keys(fields).forEach(k=>{if(!known.has(k))unknown.push(k)});if(unknown.length)issues.push({level:"warn",message:`发现未映射的地块档案字段：${unknown.join("、")}。`,line:startLine});if(!specifiedKeys.length&&!scriptureSpecified.length)issues.push({level:"warn",message:"地块档案没有可更新的标准字段。",line:startLine});if(cell.key&&!objectsInCellKey(cell.key).length&&!state.tileProfiles[cell.key])issues.push({level:"warn",message:"该主格目前没有对象；仍可建立独立地块档案。",line:startLine});const status=issues.some(i=>i.level==="error")?"error":issues.some(i=>i.level==="warn")?"warn":"ok";return {kind:"tile_profile",headerName,name:`地块档案 ${cell.key||headerName}`,cellKey:cell.key,gx:cell.gx,gy:cell.gy,profilePatch:patch,specifiedKeys,scriptureEvents,scriptureSpecified,fields,fieldLines,issues,status,startLine,raw:block}
  }

  function importedObjectFromParsed(p){const id=p.id||nextObjectId(),obj={id,rowRef:"NEW",name:p.name,type:p.type||"未分类",x:Number(p.x)||0,y:Number(p.y)||0,coordinateText:coordText(p.x,p.y),chapter:p.chapter,region:p.region,direction:"",distance:Math.hypot(Number(p.x)||0,Number(p.y)||0),reference:p.reference,originalDistance:p.originalDistance,coordinateNature:p.coordinateNature||"Markdown导入，待复核",evidenceLevel:p.evidenceLevel,lockStatus:p.lockStatus,range:p.range,aliases:p.aliases,localRelation:p.localRelation,coreFeatures:p.coreFeatures,efficacy:p.efficacy,relationNotes:p.relationNotes,pathStatus:p.pathStatus,flowDirection:p.flowDirection,sourceObject:p.sourceObject,throughObjects:p.throughObjects,mergeTarget:p.mergeTarget,tributaries:p.tributaries,confluencePoints:p.confluencePoints,riverTerrainRelation:p.riverTerrainRelation,terrain:"",water:"",plants:"",animals:"",minerals:"",wildlife:"",beasts:"",people:"",gods:"",residents:"",appearance:"",abilities:"",events:"",original:p.original,sameName:"",annotations:p.annotations,otherTexts:p.otherTexts,variants:p.variants,modernResearch:p.modernResearch,commonLocation:p.commonLocation,popularSources:p.popularSources,misconceptions:p.misconceptions,derivation:p.derivation,sourceNotes:p.sourceNotes,sourceUrl:p.sourceUrl,pendingQuestions:p.pendingQuestions,geometryType:p.geometryType||"point",area:p.area||null};if(p.path?.length)obj.path=p.path;return obj}

  function renderImportInspector(o){if(!o){els.importInspector.innerHTML='<div class="import-empty">未选择条目。</div>';return}els.importInspectorMeta.textContent=o.kind==="tile_profile"?`地块 ${o.cellKey||"坐标错误"}`:`${o.headerName} · 第${o.startLine}行`;const issueHtml=o.issues.length?`<div class="issue-list">${o.issues.map(i=>`<div class="issue ${i.level}"><strong>${i.level==='error'?'格式错误':'提示'}</strong> · 第${i.line||o.startLine}行<br>${esc(i.message)}</div>`).join("")}</div>`:`<div class="issue-list"><div class="issue ok"><strong>格式正确</strong><br>${o.kind==='tile_profile'?'可更新指定地块档案。':'必填字段与几何参数均可识别。'}</div></div>`;let rows;if(o.kind==="tile_profile"){const profileRows=TILE_PROFILE_FIELD_DEFS.filter(d=>o.specifiedKeys.includes(d.key)).map(d=>[d.label,o.profilePatch[d.key]??""]);rows=[["条目类型","地块档案更新"],["目标主格",o.cellKey||""],["更新方式",state.tileProfiles[o.cellKey]?"更新已有档案":"新建地块档案"],...profileRows,["经篇事件",o.scriptureSpecified.map(ch=>`${ch}：${o.scriptureEvents[ch]}`).join("\n")]]}else rows=[["条目类型","地图对象"],["对象标题",o.headerName],["地名",o.name],["类型",o.type||""],["所属经篇",o.chapter||""],["几何类型",o.geometryType||""],["坐标",o.x===null?"":coordText(o.x,o.y)],["面积／作用域",o.area?JSON.stringify(o.area,null,2):""],["路径节点",o.path?.length?o.path.map(p=>p.join(", ")).join("\n"):""],["证据等级",o.evidenceLevel||""],["与本地关系",o.localRelation||""],["核心特征",o.coreFeatures||""],["水系与地貌关系",o.riverTerrainRelation||""],["原文",o.original||""]];els.importInspector.innerHTML=issueHtml+`<div class="field-audit">${rows.map(([k,v])=>`<div class="field-audit-row"><b>${esc(k)}</b><code>${v!==""?esc(v):'—'}</code></div>`).join("")}</div>`}

  function renderExamplePanel(){
    const correct=`# 纯地图调研资料导入\n\n### 地块档案：X+001_Y+014\n\n* 一句话摘要：丘陵间溪流穿行，玄色生灵集中出现。\n* 地块类型：山地水系复合地块\n* 本地标签：丘陵 / 溪流 / 玄色生灵\n* 地理环境：连续缓丘。\n* 水文特征：溪流由西北向东南穿过。\n* 来源可信度：中\n* 待核对问题：下游汇入位置尚未确定。\n\n### 对象：玄鸟\n\n* 对象ID：BEAST-001\n* 地名：玄鸟\n* 类型：鸟兽\n* 所属经篇：海内北经\n* 几何类型：点\n* X坐标（里）：160\n* Y坐标（里）：1440\n* 坐标性质：原文明载\n* 与本地关系：栖息于溪流北岸。\n* 核心特征：玄色羽毛。\n* 原文：……\n\n### 对象：黑水\n\n* 对象ID：RIVER-001\n* 地名：黑水\n* 类型：河流\n* 所属经篇：海内北经\n* 几何类型：线\n* 路径节点：\n  - 115,1480\n  - 160,1440\n  - 215,1405\n* 路径状态：部分明确\n* 原文流向：由西北向东南\n* 水系与地貌关系：穿过此处\n* 原文：……`;
    const rules=`对象区块：### 对象：名称\n地块区块：### 地块档案：X+001_Y+014\n字段：* 字段名：内容\n多行：后续行缩进至少两个空格\n河流：几何类型写“线”，路径节点至少两个\n省略字段：保留原值\n明确空字段：清空原值\n同坐标对象：程序自动用“/”合并展示`;
    const tab=state.exampleTab;$$('.example-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.exampleTab===tab));if(tab==='correct'){els.exampleNotice.className='example-notice ok';els.exampleNotice.innerHTML='<strong>正确案例</strong><span>只包含地图调研资料。</span>';els.exampleCode.textContent=correct;els.exampleNotes.innerHTML='<ul><li>一个文件可同时包含地块、点对象和河流。</li><li>重叠对象只需使用相同精确坐标。</li><li>河流路径按节点顺序绘制。</li></ul>';els.loadExampleBtn.textContent='载入正确案例到左侧'}else if(tab==='wrong'){els.exampleNotice.className='example-notice error';els.exampleNotice.innerHTML='<strong>错误案例</strong><span>查看标题、坐标与路径错误。</span>';els.exampleCode.textContent=WRONG_MD_SAMPLE;els.exampleNotes.innerHTML='<ul><li>标题必须使用三个#。</li><li>点对象需要精确坐标或100里主格坐标。</li><li>线对象至少需要两个路径节点。</li></ul>';els.loadExampleBtn.textContent='载入错误案例并查看识别'}else{els.exampleNotice.className='example-notice neutral';els.exampleNotice.innerHTML='<strong>识别规则</strong><span>对象与地块档案可混合导入。</span>';els.exampleCode.textContent=rules;els.exampleNotes.innerHTML='<ul><li>地块档案只改写明确出现的字段。</li><li>警告不会阻止导入，错误条目不会写入地图。</li></ul>';els.loadExampleBtn.textContent='载入空白正确模板'}}

  function setupV027Features(){
    const brushBtn=document.getElementById("brushModeBtn"),collectionBtn=document.getElementById("brushCollectionBtn"),collection=document.getElementById("brushCollectionWorkspace");
    brushBtn?.addEventListener("click",()=>setBrushMode(!state.brushMode,false));collectionBtn?.addEventListener("click",openBrushCollection);document.getElementById("closeBrushCollectionBtn")?.addEventListener("click",closeBrushCollection);document.getElementById("continueBrushBtn")?.addEventListener("click",()=>{closeBrushCollection();setBrushMode(true,false)});document.getElementById("eraseBrushBtn")?.addEventListener("click",()=>{closeBrushCollection();setBrushMode(true,true)});document.getElementById("clearBrushBtn")?.addEventListener("click",()=>{state.brushKeys.clear();updateBrushUI();renderBrushCollection();persist()});
    const down=e=>{if(!state.brushMode||state.brushSpacePan||e.button!==0||e.target.closest("button,input,select,textarea"))return;e.preventDefault();e.stopImmediatePropagation();state.brushDrawing=true;try{els.viewport.setPointerCapture(e.pointerId)}catch{}brushVisitAt(e.clientX,e.clientY)};
    const move=e=>{if(!state.brushMode||!state.brushDrawing||state.brushSpacePan)return;e.preventDefault();e.stopImmediatePropagation();brushVisitAt(e.clientX,e.clientY)};
    const up=e=>{if(!state.brushMode||!state.brushDrawing)return;e.preventDefault();e.stopImmediatePropagation();state.brushDrawing=false;try{els.viewport.releasePointerCapture(e.pointerId)}catch{}persist();if(!state.brushErase&&state.brushKeys.size)openBrushCollection()};
    els.viewport.addEventListener("pointerdown",down,true);els.viewport.addEventListener("pointermove",move,true);els.viewport.addEventListener("pointerup",up,true);els.viewport.addEventListener("pointercancel",up,true);
    els.viewport.addEventListener("contextmenu",e=>{if(e.target.closest("button,input,select,textarea"))return;const w=screenToWorld(e.clientX,e.clientY),key=cellKey(cellIndex(w.x),cellIndex(w.y));if(!state.brushKeys.has(key))return;e.preventDefault();e.stopImmediatePropagation();state.brushKeys.delete(key);updateBrushUI();persist();toast("已取消选择",`地块 ${key} 已从画笔集合移除`);if(state.dossierCollectionMode){if(state.brushKeys.size)renderBrushCollectionInDossier();else closeDossierWorkspace()}},true);
    document.getElementById("openTutorialTab")?.addEventListener("click",openTutorial);document.querySelectorAll('[data-tutorial-tab]').forEach(b=>b.addEventListener('click',()=>{state.tutorialTab=b.dataset.tutorialTab;renderTutorial()}));document.getElementById("tutorialAutoCheck")?.addEventListener("change",e=>{try{if(e.target.checked)localStorage.setItem("shj_v029_tutorial_seen","1");else localStorage.removeItem("shj_v029_tutorial_seen")}catch{}});
    document.addEventListener("keydown",e=>{if(e.code==="Space"&&!e.repeat){state.brushSpacePan=true;if(state.brushMode)els.viewport.classList.remove("brush-mode")}if(e.key==="Escape"&&!collection?.classList.contains("hidden")){closeBrushCollection()}},true);document.addEventListener("keyup",e=>{if(e.code==="Space"){state.brushSpacePan=false;if(state.brushMode)els.viewport.classList.add("brush-mode")}},true);
    updateBrushUI();renderTutorial();let tutorialSeen=false;try{tutorialSeen=!!localStorage.getItem("shj_v029_tutorial_seen")}catch{}if(!tutorialSeen)setTimeout(openTutorial,700)
  }


  // v029 · 研究可视化工具
  const V029_PRESETS={all:"全部",geography:"地理",hydrology:"水系",myth:"神话",civilization:"文明",evidence:"证据"};
  function v029ObjectText(o){return [o.name,o.type,o.chapter,o.region,o.reference,o.localRelation,o.relationNotes,o.sourceObject,o.throughObjects,o.mergeTarget,o.tributaries,o.confluencePoints,o.original,o.annotations,o.modernResearch].filter(Boolean).join(" ")}
  function v029Evidence(o){const t=`${o?.evidenceLevel||""} ${o?.coordinateNature||""} ${o?.lockStatus||""} ${o?.area?.evidence||""}`;if(/原文明载|原文明确|硬面积|original|hard|已锁定|高/.test(t))return {level:"high",label:"原典",rank:3,color:"#2d775f"};if(/古注|现代考证|考证|支持|中/.test(t))return {level:"medium",label:"考证",rank:2,color:"#b8842d"};if(/候选|推定|待核对|未锁定|低|project|candidate/.test(t))return {level:"low",label:"推定",rank:1,color:"#a24f40"};return {level:"unknown",label:"待核",rank:0,color:"#7f8582"}}
  function v029TileEvidence(items){return items.map(v029Evidence).sort((a,b)=>b.rank-a.rank)[0]||{level:"unknown",label:"待核",rank:0,color:"#7f8582"}}
  function v029PresetMatch(o){const p=state.viewPreset||"all",cat=objectCategory(o),txt=`${o.type||""}${o.name||""}`,primary=objectPrimaryType(o);if(p==="all"||p==="evidence")return true;if(p==="geography")return cat==="terrain";if(p==="hydrology")return isHydrologyObject(o);if(p==="myth")return cat==="plants"||cat==="animals"||(cat==="people"&&/神祇|神女|神人|巫/.test(primary))||/神话|异怪|灵物/.test(txt);if(p==="civilization")return cat==="people"||cat==="events"||/国|民|人|帝|王|宫|城|邑|部|族|祭|祀/.test(txt);return true}
  function v029RelationScore(a,b){if(!a||!b||a.id===b.id)return 0;let score=0;const at=v029ObjectText(a),bt=v029ObjectText(b),an=String(a.name||""),bn=String(b.name||"");if(an&&normalizeText(bt).includes(normalizeText(an)))score+=8;if(bn&&normalizeText(at).includes(normalizeText(bn)))score+=8;const ac=objectCell(a),bc=objectCell(b);if(ac.gx===bc.gx&&ac.gy===bc.gy)score+=5;if(a.region&&b.region&&normalizeText(a.region)===normalizeText(b.region))score+=3;if(a.chapter&&b.chapter&&CHAPTERS_18.some(ch=>String(a.chapter).includes(ch)&&String(b.chapter).includes(ch)))score+=1;if(a.geometryType==="line"&&[a.sourceObject,a.throughObjects,a.mergeTarget,a.tributaries,a.confluencePoints].some(v=>bn&&normalizeText(v).includes(normalizeText(bn))))score+=9;if(b.geometryType==="line"&&[b.sourceObject,b.throughObjects,b.mergeTarget,b.tributaries,b.confluencePoints].some(v=>an&&normalizeText(v).includes(normalizeText(an))))score+=9;return score}
  function v029RelationContext(){const selected=state.objects.find(o=>o.id===state.selectedId);if(!state.relationMode||!selected)return {selected:null,ids:new Set(),strong:new Set()};const scored=state.objects.map(o=>({o,score:v029RelationScore(selected,o),dist:Math.hypot((o.x||0)-(selected.x||0),(o.y||0)-(selected.y||0))})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.dist-b.dist).slice(0,28);return {selected,ids:new Set(scored.map(x=>x.o.id)),strong:new Set(scored.filter(x=>x.score>=7).map(x=>x.o.id)),scored}}
  function drawV029RelationOverlay(ctx,v,s){const rel=v029RelationContext();if(!rel.selected)return;const a=objectAnchor(rel.selected),pa=worldToScreen(a.x,a.y);ctx.save();rel.scored.forEach(({o,score})=>{const b=objectAnchor(o);if((b.x<v.left-50||b.x>v.right+50||b.y<v.bottom-50||b.y>v.top+50)&&score<7)return;const pb=worldToScreen(b.x,b.y);ctx.beginPath();ctx.moveTo(pa.x,pa.y);const mx=(pa.x+pb.x)/2,my=(pa.y+pb.y)/2-18;ctx.quadraticCurveTo(mx,my,pb.x,pb.y);ctx.strokeStyle=score>=7?"rgba(173,77,61,.78)":"rgba(31,109,90,.46)";ctx.lineWidth=score>=7?2.3:1.4;ctx.setLineDash(score>=7?[]:[7,5]);ctx.stroke()});ctx.setLineDash([]);ctx.fillStyle="#ad4d3d";ctx.beginPath();ctx.arc(pa.x,pa.y,5,0,Math.PI*2);ctx.fill();ctx.restore()}
  function v029Direction(dx,dy){const a=(Math.atan2(dx,dy)*180/Math.PI+360)%360,names=["北","东北偏北","东北","东北偏东","东","东南偏东","东南","东南偏南","南","西南偏南","西南","西南偏西","西","西北偏西","西北","西北偏北"];return names[Math.round(a/22.5)%16]}
  function v029MeasureInfo(){const m=state.measure;if(!m?.start||!(m.current||m.final))return null;const end=m.current||m.final,dx=end.x-m.start.x,dy=end.y-m.start.y,dist=Math.hypot(dx,dy),cross=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/100));return {start:m.start,end,dx,dy,dist,direction:v029Direction(dx,dy),cross}}
  function drawV029MeasureOverlay(ctx,v,s){const info=v029MeasureInfo();if(!info)return;const a=worldToScreen(info.start.x,info.start.y),b=worldToScreen(info.end.x,info.end.y);ctx.save();ctx.strokeStyle="#ad4d3d";ctx.fillStyle="#ad4d3d";ctx.lineWidth=2;ctx.setLineDash([8,5]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);[a,b].forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,5,0,Math.PI*2);ctx.fill()});const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;const label=`${fmt(info.dist,1)}里 · ${info.direction}`;ctx.font="800 10px sans-serif";const w=ctx.measureText(label).width+16;ctx.fillStyle="rgba(255,253,247,.94)";ctx.strokeStyle="rgba(173,77,61,.75)";ctx.fillRect(mx-w/2,my-14,w,24);ctx.strokeRect(mx-w/2,my-14,w,24);ctx.fillStyle="#7d3429";ctx.fillText(label,mx-w/2+8,my+2);ctx.restore()}
  const V031_LENS_CATEGORIES=[
    {key:"terrain",label:"地貌",glyph:"山"},{key:"plants",label:"草木",glyph:"木"},{key:"animals",label:"鸟兽",glyph:"兽"},{key:"minerals",label:"矿物",glyph:"玉"},{key:"people",label:"人群神祇",glyph:"神"},{key:"events",label:"事迹",glyph:"事"}
  ];
  function v031ProfileHasContent(profile){
    if(!profile)return false;
    const ignored=new Set(["unknown","未判定"]),walk=value=>{if(Array.isArray(value))return value.some(walk);if(value&&typeof value==="object")return Object.values(value).some(walk);const s=String(value||"").trim();return !!s&&!ignored.has(s)};
    return walk(profile)
  }
  function v031LensCategoryRows(items,profile){
    return V031_LENS_CATEGORIES.map(cat=>{
      const list=items.filter(o=>objectCategory(o)===cat.key),names=[...new Set(list.map(o=>o.name).filter(Boolean))],summary=categoryProfileSummary(profile,cat.key),text=names.length?names.join(" / "):hasText(summary)?shortText(summary,150):"";
      return text?{...cat,text,count:list.length}:null
    }).filter(Boolean)
  }
  function showV029TileLens(key,x,y){
    const items=objectsInCellKey(key),rawProfile=state.tileProfiles?.[key];
    if(!items.length&&!v031ProfileHasContent(rawProfile)){hideTooltip();return}
    const [gx,gy]=String(key).split(",").map(Number),p=tileProfileFor(key,items),rows=v031LensCategoryRows(items,p);
    if(!rows.length){hideTooltip();return}
    const main=selectedTileMain(items),title=main?.name||p.oneLineSummary||p.tileType||`地块 ${tileCoordCode(gx,gy)}`,chapters=CHAPTERS_18.filter(ch=>items.some(o=>String(o.chapter||"").includes(ch))),ev=v029TileEvidence(items),chapterText=chapters.slice(0,3).join(" / ");
    els.tooltip.classList.remove("lens-object");els.tooltip.classList.add("lens","lens-tile");
    els.tooltip.innerHTML=`<div class="lens-head"><strong>${esc(title)}</strong><small>${esc(tileCoordCode(gx,gy))}${items.length?` · ${items.length}项`:""}${chapterText?` · ${esc(chapterText)}`:""}</small></div><div class="lens-body lens-category-body"><div class="lens-category-list">${rows.map(row=>`<div class="lens-category-row lens-category-${row.key}"><i>${row.glyph}</i><b>${row.label}</b><p>${esc(row.text)}</p>${row.count?`<em>${row.count}</em>`:""}</div>`).join("")}</div><div class="lens-footer"><span class="lens-evidence"><i style="background:${ev.color}"></i>${ev.label}</span><span>${esc(coordText(cellCenter(gx),cellCenter(gy)))}</span></div></div>`;
    els.tooltip.classList.remove("hidden");moveTooltip(x,y)
  }
  function showV029ObjectLens(id,x,y){
    const o=state.objects.find(v=>v.id===id);if(!o){hideTooltip();return}
    const ev=v029Evidence(o),cat=V031_LENS_CATEGORIES.find(c=>c.key===objectCategory(o)),rel=state.objects.map(b=>({b,s:v029RelationScore(o,b)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,3).map(x=>x.b.name),summary=o.coreFeatures||o.localRelation||shortText(o.original||o.derivation,150),chapters=[...String(o.chapter||"").matchAll(/《?([^《》]+经)》?/g)].slice(0,3).map(m=>m[1]);
    els.tooltip.classList.remove("lens-tile");els.tooltip.classList.add("lens","lens-object");
    els.tooltip.innerHTML=`<div class="lens-head"><strong>${esc(o.name)}</strong><small>${esc(cat?.label||o.type||"未分类")} · ${esc(o.type||"未分类")} · ${coordText(o.x,o.y)}</small></div><div class="lens-body">${hasText(summary)?`<p class="lens-summary">${esc(summary)}</p>`:""}${chapters.length?`<div class="lens-tags">${chapters.map(ch=>`<span>${esc(ch)}</span>`).join("")}</div>`:""}<div class="lens-footer"><span class="lens-evidence"><i style="background:${ev.color}"></i>${ev.label}</span>${rel.length?`<span>${esc(rel.join(" / "))}</span>`:""}</div></div>`;
    els.tooltip.classList.remove("hidden");moveTooltip(x,y)
  }
  function applyV029MapDOM(){const rel=v029RelationContext();document.querySelectorAll(".tile").forEach(el=>{const items=objectsInCellKey(el.dataset.cell),ids=new Set(items.map(o=>o.id)),ev=v029TileEvidence(items);el.classList.remove("relation-selected","relation-related","relation-dim","preset-dim","compare-selected","evidence-high","evidence-medium","evidence-low","evidence-unknown");el.classList.add(`evidence-${ev.level}`);if(items.length&&!el.querySelector(".evidence-badge")){const b=document.createElement("span");b.className=`evidence-badge evidence-${ev.level}`;b.textContent=ev.label;el.appendChild(b)}if(state.relationMode&&rel.selected){if(ids.has(rel.selected.id))el.classList.add("relation-selected");else if([...ids].some(id=>rel.ids.has(id)))el.classList.add("relation-related");else el.classList.add("relation-dim")}if(items.length&&!items.some(v029PresetMatch))el.classList.add("preset-dim");if(state.compareKeys?.has(el.dataset.cell))el.classList.add("compare-selected")});document.querySelectorAll(".precision-object-group").forEach(el=>{const ids=[...el.querySelectorAll("[data-precision-main],[data-precision-object]")].map(n=>n.dataset.precisionMain||n.dataset.precisionObject).filter(Boolean),items=ids.map(id=>state.objects.find(o=>o.id===id)).filter(Boolean),ev=v029TileEvidence(items);el.classList.remove("relation-selected","relation-related","relation-dim","preset-dim","evidence-high","evidence-medium","evidence-low","evidence-unknown","label-collapsed");el.classList.add(`evidence-${ev.level}`);if(!el.querySelector(".precision-evidence-badge")){const b=document.createElement("span");b.className=`precision-evidence-badge evidence-${ev.level}`;b.textContent=ev.label;el.appendChild(b)}if(state.relationMode&&rel.selected){if(ids.includes(rel.selected.id))el.classList.add("relation-selected");else if(ids.some(id=>rel.ids.has(id)))el.classList.add("relation-related");else el.classList.add("relation-dim")}if(items.length&&!items.some(v029PresetMatch))el.classList.add("preset-dim")});requestAnimationFrame(layoutV029PrecisionLabels)}
  function layoutV029PrecisionLabels(){if(!state.precisionMode)return;const groups=[...document.querySelectorAll(".precision-object-group")];groups.forEach(g=>g.classList.remove("label-collapsed"));const ordered=groups.sort((a,b)=>{const ap=a.classList.contains("selected")||a.classList.contains("relation-selected")?10:a.classList.contains("relation-related")?7:0,bp=b.classList.contains("selected")||b.classList.contains("relation-selected")?10:b.classList.contains("relation-related")?7:0;return bp-ap});const accepted=[];ordered.forEach(g=>{const label=g.querySelector(".precision-marker-name");if(!label)return;const r=label.getBoundingClientRect(),expanded={left:r.left-5,top:r.top-4,right:r.right+5,bottom:r.bottom+4};const collides=accepted.some(a=>!(expanded.right<a.left||expanded.left>a.right||expanded.bottom<a.top||expanded.top>a.bottom));if(collides&&!g.classList.contains("selected")&&!g.classList.contains("relation-selected")&&!g.classList.contains("relation-related"))g.classList.add("label-collapsed");else accepted.push(expanded)})}
  function updateV029Breadcrumb(){const nav=document.getElementById("mapBreadcrumb");if(!nav)return;const o=state.objects.find(x=>x.id===state.selectedId),tile=activeTile(),p=tile?tileProfileFor(tile.key,tile.items):null;const parts=[{label:"都广之野",kind:"origin"}];const region=p?.parentRegion||o?.region;if(region)parts.push({label:shortText(region,32),kind:"region"});if(tile)parts.push({label:tileCoordCode(tile.gx,tile.gy),kind:"tile"});if(o)parts.push({label:o.name,kind:"object"});nav.innerHTML=parts.map(x=>`<button data-breadcrumb="${x.kind}">${esc(x.label)}</button>`).join("")}
  function renderV029Minimap(){const wrap=document.getElementById("researchMinimap"),canvas=document.getElementById("researchMinimapCanvas"),box=document.getElementById("researchMinimapViewport");if(!wrap||!canvas||!state.objects.length)return;const dpr=Math.min(devicePixelRatio||1,2),w=wrap.clientWidth,h=wrap.clientHeight;if(!w||!h)return;canvas.width=w*dpr;canvas.height=h*dpr;const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const xs=[],ys=[];state.objects.forEach(o=>{const a=objectAnchor(o);xs.push(a.x);ys.push(a.y);if(o.area){xs.push(o.area.west,o.area.east);ys.push(o.area.south,o.area.north)}});xs.push(0);ys.push(0);const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),pad=12,sx=(w-pad*2)/(maxX-minX||1),sy=(h-pad*2)/(maxY-minY||1),sc=Math.min(sx,sy),ox=(w-(maxX-minX)*sc)/2,oy=(h-(maxY-minY)*sc)/2,pt=(x,y)=>({x:ox+(x-minX)*sc,y:h-(oy+(y-minY)*sc)});ctx.fillStyle="#ece8dc";ctx.fillRect(0,0,w,h);state.objects.filter(o=>o.geometryType==="line"&&o.path?.length>=2).forEach(o=>{ctx.beginPath();o.path.forEach((p,i)=>{const q=pt(p[0],p[1]);i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y)});ctx.strokeStyle=isHydrologyObject(o)?"rgba(43,127,153,.58)":"rgba(92,85,72,.38)";ctx.lineWidth=1;ctx.stroke()});state.objects.forEach(o=>{const a=objectAnchor(o),q=pt(a.x,a.y),pal=TERRAIN_PALETTE[isHydrologyObject(o)?"water":terrainCategory(o)]||TERRAIN_PALETTE.unknown;ctx.fillStyle=pal.color;ctx.globalAlpha=.7;ctx.fillRect(q.x-1,q.y-1,2,2)});ctx.globalAlpha=1;const z=pt(0,0);ctx.fillStyle="#ad4d3d";ctx.fillRect(z.x-2,z.y-2,4,4);const v=visibleWorld(),nw=pt(v.left,v.top),se=pt(v.right,v.bottom);box.style.left=`${Math.max(0,nw.x)}px`;box.style.top=`${Math.max(0,nw.y)}px`;box.style.width=`${Math.max(4,Math.min(w,nw.x<0?se.x:se.x-nw.x))}px`;box.style.height=`${Math.max(4,Math.min(h,nw.y<0?se.y:se.y-nw.y))}px`;wrap.dataset.bounds=JSON.stringify({minX,maxX,minY,maxY,sc,ox,oy,w,h})}
  function updateV029ToolUI(){const preset=document.getElementById("viewPresetBtn"),rel=document.getElementById("relationModeBtn"),cmp=document.getElementById("compareModeBtn"),measure=document.getElementById("measureModeBtn"),bar=document.getElementById("compareStatusBar"),count=document.getElementById("compareSelectionCount"),mread=document.getElementById("measureReadout"),mtext=document.getElementById("measureReadoutText");if(preset)preset.textContent=`视图：${V029_PRESETS[state.viewPreset]||"全部"}`;rel?.classList.toggle("active",state.relationMode);cmp?.classList.toggle("active",state.compareMode);measure?.classList.toggle("active",state.measureMode);bar?.classList.toggle("hidden",!state.compareMode);if(count)count.textContent=state.compareKeys?.size||0;if(cmp)cmp.textContent=state.compareMode?`对比 ${state.compareKeys.size}/4`:"对比";els.viewport.classList.toggle("measure-mode",state.measureMode);mread?.classList.toggle("hidden",!state.measureMode);const info=v029MeasureInfo();if(mtext)mtext.textContent=info?`${fmt(info.dist,1)}里 · ${info.direction} · 横向${signed(info.dx)}里 · 纵向${signed(info.dy)}里 · 约跨${info.cross}个100里地块`:"在地图上按住左键拖出测量线";const isolated=findV029IsolatedObjects();const ib=document.getElementById("isolatedObjectsCount");if(ib)ib.textContent=isolated.length}
  function openV029Compare(){const keys=[...state.compareKeys].slice(0,4);if(keys.length<2){toast("至少选择两个地块","开启对比后，在地图上点击2—4个有内容的地块。","error");return}const entries=keys.map(collectionTileEntry),fields=[["一句话摘要","oneLineSummary"],["地块类型","tileType"],["地理环境","geoEnvironment"],["水文特征","hydrology"],["关联水域","relatedWaters"],["关联生灵","relatedLife"],["所属国度／部族","country"],["神话事件与现象","mythicEncounters"],["已发生事件","occurredEvents"],["来源可信度","sourceReliability"],["关联完整度","relationCompleteness"],["待核对问题","pendingQuestions"]],diff=new Set();fields.forEach(([l,k])=>{const vals=new Set(entries.map(e=>normalizeText(e.profile[k]||"")));if(vals.size>1)diff.add(k)});const body=document.getElementById("compareWorkspaceBody");body.innerHTML=`<div class="compare-grid" style="grid-template-columns:repeat(${entries.length},minmax(0,1fr))">${entries.map(e=>`<article class="compare-column"><header><h3>${esc(e.name)}</h3><small>${esc(tileCoordCode(e.gx,e.gy))} · ${e.items.length}个对象</small></header>${fields.map(([l,k])=>{const v=e.profile[k]||"";return `<section class="compare-field ${diff.has(k)?"different":""} ${hasText(v)?"":"empty"}"><b>${esc(l)}</b><p>${esc(v||"未录入")}</p></section>`}).join("")}<div class="compare-column-actions"><button data-compare-locate="${esc(e.key)}">地图定位</button><button data-compare-remove="${esc(e.key)}">移除</button></div></article>`).join("")}</div>`;body.querySelectorAll("[data-compare-locate]").forEach(b=>b.onclick=()=>{document.getElementById("compareWorkspace").classList.add("hidden");jumpToCell(b.dataset.compareLocate)});body.querySelectorAll("[data-compare-remove]").forEach(b=>b.onclick=()=>{state.compareKeys.delete(b.dataset.compareRemove);updateV029ToolUI();persist();if(state.compareKeys.size>=2)openV029Compare();else document.getElementById("compareWorkspace").classList.add("hidden")});document.getElementById("compareWorkspace").classList.remove("hidden")}
  function findV029IsolatedObjects(){return state.objects.map(o=>{const reasons=[];if(!hasText(o.region))reasons.push("未录所属区域");if(!hasText(o.reference)&&!o.area&&!o.path?.length)reasons.push("缺少定位参照");if(!hasText(o.localRelation)&&!hasText(o.relationNotes)&&![o.sourceObject,o.throughObjects,o.mergeTarget,o.tributaries,o.confluencePoints].some(hasText))reasons.push("缺少对象关系说明");if(!hasText(o.chapter))reasons.push("未录所属经篇");const mentioned=state.objects.some(b=>b.id!==o.id&&normalizeText(v029ObjectText(b)).includes(normalizeText(o.name))),c=objectCell(o),same=objectsInCellKey(cellKey(c.gx,c.gy)).length>1;if(!mentioned&&!same&&!o.path?.length&&!o.area)reasons.push("未被其他对象关联");return {o,reasons}}).filter(x=>x.reasons.length>=2)}
  function openV029Isolated(){const list=findV029IsolatedObjects(),body=document.getElementById("isolatedWorkspaceBody"),critical=list.filter(x=>x.reasons.length>=3).length;body.innerHTML=`<div class="isolated-summary"><article><span>孤立对象</span><strong>${list.length}</strong><small>至少缺少两类关系信息</small></article><article><span>优先核对</span><strong>${critical}</strong><small>缺少三类以上关系信息</small></article><article><span>地图对象总数</span><strong>${state.objects.length}</strong><small>当前本地数据</small></article></div><div class="isolated-list">${list.map(({o,reasons})=>`<button class="isolated-item" data-isolated-id="${esc(o.id)}"><i>${geometryIcon(o)}</i><span><strong>${esc(o.name)}</strong><small>${esc(o.type||"未分类")} · ${esc(reasons.join(" / "))}</small></span><em>${reasons.length}项</em></button>`).join("")||`<div class="import-empty">没有发现满足当前规则的孤立对象。</div>`}</div>`;body.querySelectorAll("[data-isolated-id]").forEach(b=>b.onclick=()=>{document.getElementById("isolatedWorkspace").classList.add("hidden");jumpToObject(b.dataset.isolatedId,true,true)});document.getElementById("isolatedWorkspace").classList.remove("hidden")}
  function buildV029AutoRegionSummary(data){const counts=Object.fromEntries(V027_CATEGORIES.map(c=>[c.label,data.items.filter(o=>objectCategory(o)===c.key).length])),dominant=Object.entries(counts).sort((a,b)=>b[1]-a[1]).filter(x=>x[1]).slice(0,3),waters=data.items.filter(isHydrologyObject).length,chapters=data.chapters.slice(0,5),isolatedIds=new Set(findV029IsolatedObjects().map(x=>x.o.id)),isolated=data.items.filter(o=>isolatedIds.has(o.id)).length,evidence={high:0,medium:0,low:0,unknown:0};data.items.forEach(o=>evidence[v029Evidence(o).level]++);const focus=dominant.length?dominant.map(([k,v])=>`${k}${v}项`).join("、"):"资料类型尚未形成明显集中";const text=`选区覆盖${data.entries.length}个100里地块，共收录${data.items.length}个对象，以${focus}为主。${waters?`其中水系相关对象${waters}项。`:""}${chapters.length?`资料涉及${chapters.join("、")}${data.chapters.length>5?"等经篇":""}。`:""}${isolated?`另有${isolated}个对象缺少足够空间关系，建议优先核对。`:""}`;return {text,stats:[`地块 ${data.entries.length}`,`对象 ${data.items.length}`,`高证据 ${evidence.high}`,`考证支持 ${evidence.medium}`,`候选待核 ${evidence.low+evidence.unknown}`,`孤立 ${isolated}`]}}
  function setupV029Features(){const presetBtn=document.getElementById("viewPresetBtn"),presetMenu=document.getElementById("viewPresetMenu"),relationBtn=document.getElementById("relationModeBtn"),compareBtn=document.getElementById("compareModeBtn"),measureBtn=document.getElementById("measureModeBtn");presetBtn?.addEventListener("click",e=>{e.stopPropagation();presetMenu.classList.toggle("hidden")});presetMenu?.querySelectorAll("[data-view-preset]").forEach(b=>b.addEventListener("click",()=>{state.viewPreset=b.dataset.viewPreset;presetMenu.classList.add("hidden");if(state.viewPreset==="geography"){state.layers.terrain=true;state.layers.rivers=true;state.layers.areas=true}else if(state.viewPreset==="hydrology"){state.layers.rivers=true;state.layers.terrain=true;state.layers.areas=true}else if(state.viewPreset==="all"){state.layers.terrain=true;state.layers.rivers=true;state.layers.areas=true}els.layerTerrain.checked=state.layers.terrain;els.layerRivers.checked=state.layers.rivers;els.layerAreas.checked=state.layers.areas;scheduleRender();persist()}));document.addEventListener("click",e=>{if(!e.target.closest(".research-tool-wrap"))presetMenu?.classList.add("hidden")});relationBtn?.addEventListener("click",()=>{state.relationMode=!state.relationMode;if(state.relationMode&&!state.selectedId)toast("请先选择对象","关系高亮以当前选中对象为中心。","error");scheduleRender()});compareBtn?.addEventListener("click",()=>{if(state.compareMode&&state.compareKeys.size>=2)openV029Compare();else{state.compareMode=!state.compareMode;state.measureMode=false;setBrushMode(false);updateV029ToolUI();scheduleRender();toast(state.compareMode?"对比选择已开启":"对比选择已退出",state.compareMode?"点击2—4个地块；右键可移除。":"")}});measureBtn?.addEventListener("click",()=>{state.measureMode=!state.measureMode;state.compareMode=false;setBrushMode(false);state.measure={active:false,start:null,current:null,final:null};updateV029ToolUI();scheduleRender()});document.getElementById("isolatedObjectsBtn")?.addEventListener("click",openV029Isolated);document.getElementById("closeIsolatedWorkspace")?.addEventListener("click",()=>document.getElementById("isolatedWorkspace").classList.add("hidden"));document.getElementById("closeCompareWorkspace")?.addEventListener("click",()=>document.getElementById("compareWorkspace").classList.add("hidden"));document.getElementById("openCompareBtn")?.addEventListener("click",openV029Compare);document.getElementById("clearCompareBtn")?.addEventListener("click",()=>{state.compareKeys.clear();updateV029ToolUI();scheduleRender();persist()});document.getElementById("exitCompareBtn")?.addEventListener("click",()=>{state.compareMode=false;updateV029ToolUI();scheduleRender()});document.getElementById("clearMeasureBtn")?.addEventListener("click",()=>{state.measure={active:false,start:null,current:null,final:null};scheduleRender();updateV029ToolUI()});document.getElementById("compareWorkspace")?.addEventListener("click",e=>{if(e.target.id==="compareWorkspace")e.currentTarget.classList.add("hidden")});document.getElementById("isolatedWorkspace")?.addEventListener("click",e=>{if(e.target.id==="isolatedWorkspace")e.currentTarget.classList.add("hidden")});document.getElementById("mapBreadcrumb")?.addEventListener("click",e=>{const b=e.target.closest("[data-breadcrumb]");if(!b)return;if(b.dataset.breadcrumb==="origin"){state.camera.x=0;state.camera.y=0;scheduleRender()}else if(b.dataset.breadcrumb==="tile"&&state.selectedCell)jumpToCell(state.selectedCell);else if(b.dataset.breadcrumb==="object"&&state.selectedId)jumpToObject(state.selectedId,true,true);else if(b.dataset.breadcrumb==="region"){const o=state.objects.find(x=>x.id===state.selectedId),region=o?.region;if(region){const items=state.objects.filter(x=>normalizeText(x.region)===normalizeText(region));if(items.length){const x=items.reduce((a,b)=>a+(Number(b.x)||0),0)/items.length,y=items.reduce((a,b)=>a+(Number(b.y)||0),0)/items.length;animateCameraTo(x,y,Math.max(.65,Math.min(1.3,state.camera.zoom)))}}}});const minimap=document.getElementById("researchMinimap");minimap?.addEventListener("click",e=>{const b=JSON.parse(minimap.dataset.bounds||"null");if(!b)return;const r=minimap.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top,x=b.minX+(px-b.ox)/b.sc,y=b.minY+((b.h-py)-b.oy)/b.sc;animateCameraTo(x,y,state.camera.zoom)});
    els.viewport.addEventListener("pointerdown",e=>{if(state.measureMode&&e.button===0&&!e.target.closest("button,input,select,textarea,.precision-object-group")){e.preventDefault();e.stopImmediatePropagation();const w=screenToWorld(e.clientX,e.clientY);state.measure={active:true,start:w,current:w,final:null};try{els.viewport.setPointerCapture(e.pointerId)}catch{}scheduleRender();return}if(state.compareMode&&e.button===0&&e.target.closest(".tile,.precision-object-group")){e.preventDefault();e.stopImmediatePropagation()}},true);els.viewport.addEventListener("pointermove",e=>{if(!state.measureMode||!state.measure.active)return;e.preventDefault();e.stopImmediatePropagation();state.measure.current=screenToWorld(e.clientX,e.clientY);scheduleRender();updateV029ToolUI()},true);els.viewport.addEventListener("pointerup",e=>{if(!state.measureMode||!state.measure.active)return;e.preventDefault();e.stopImmediatePropagation();state.measure.final=screenToWorld(e.clientX,e.clientY);state.measure.current=null;state.measure.active=false;try{els.viewport.releasePointerCapture(e.pointerId)}catch{}scheduleRender();updateV029ToolUI()},true);els.viewport.addEventListener("click",e=>{if(!state.compareMode)return;const tile=e.target.closest(".tile"),group=e.target.closest(".precision-object-group");let key=tile?.dataset.cell;if(!key&&group){const id=group.querySelector("[data-precision-main]")?.dataset.precisionMain,o=state.objects.find(x=>x.id===id);if(o){const c=objectCell(o);key=cellKey(c.gx,c.gy)}}if(!key)return;e.preventDefault();e.stopImmediatePropagation();if(state.compareKeys.has(key))state.compareKeys.delete(key);else if(state.compareKeys.size<4)state.compareKeys.add(key);else toast("最多对比四个地块","请先移除一个已选地块。","error");updateV029ToolUI();scheduleRender();persist()},true);els.viewport.addEventListener("contextmenu",e=>{if(state.compareMode){const w=screenToWorld(e.clientX,e.clientY),key=cellKey(cellIndex(w.x),cellIndex(w.y));if(state.compareKeys.has(key)){e.preventDefault();e.stopImmediatePropagation();state.compareKeys.delete(key);updateV029ToolUI();scheduleRender();persist();return}}if(state.measureMode){e.preventDefault();state.measure={active:false,start:null,current:null,final:null};scheduleRender();updateV029ToolUI()}},true);document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(state.measureMode){state.measureMode=false;state.measure={active:false,start:null,current:null,final:null};updateV029ToolUI();scheduleRender()}else if(state.compareMode){state.compareMode=false;updateV029ToolUI();scheduleRender()}}},true);updateV029ToolUI();renderV029Minimap();updateV029Breadcrumb();setTimeout(()=>scheduleRender(),50)}


  setupV027State();
  init();
  setupV027Features();
  setupV029Features();
  setTimeout(()=>checkUpdate(true),1400);
})();
