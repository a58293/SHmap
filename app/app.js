(() => {
  "use strict";
  const INITIAL = window.SHJ_INITIAL_DATA || {metadata:{}, objects:[]};
  const STORAGE_KEY = "shj_infinite_tile_demo_v015_v031";
  const LEGACY_STORAGE_KEYS = ["shj_infinite_tile_demo_v014_v031","shj_infinite_tile_demo_v013_v031","shj_infinite_tile_demo_v012_v031","shj_infinite_tile_demo_v011_v031","shj_infinite_tile_demo_v010_v031","shj_infinite_tile_demo_v009_v031","shj_infinite_tile_demo_v008_v031","shj_infinite_tile_demo_v007_v031","shj_infinite_tile_demo_v006_v031","shj_infinite_tile_demo_v005_v031"];

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
  const COLORS = {grid:"rgba(79,84,84,.28)",minor:"rgba(79,84,84,.10)",axis:"rgba(55,61,61,.52)",hard:"rgba(145,111,42,.19)",candidate:"rgba(145,111,42,.08)",field:"rgba(173,77,61,.08)",river:"#2b7f99"};
  const CHAPTER_GROUPS = [
    {name:"五藏山经",chapters:["南山经","西山经","北山经","东山经","中山经"]},
    {name:"海外四经",chapters:["海外南经","海外西经","海外北经","海外东经"]},
    {name:"海内四经",chapters:["海内南经","海内西经","海内北经","海内东经"]},
    {name:"大荒四经",chapters:["大荒东经","大荒南经","大荒西经","大荒北经"]},
    {name:"海内经",chapters:["海内经"]}
  ];
  const CHAPTERS_18 = CHAPTER_GROUPS.flatMap(g=>g.chapters);


  const CORRECT_MD_SAMPLE = `# 山海经地图对象导入

* 文件格式版本：1.0
* 基础数据版本：v031-r0001
* 本批名称：冰夷与从极之渊补充

---

### 对象：冰夷

* 地名：冰夷
* 类型：神祇
* 所属经篇：《海内北经》
* 所属区域／山系：从极之渊
* 几何类型：点
* X坐标（里）：-1200
* Y坐标（里）：900
* 坐标性质：跨篇关系推导
* 锁定状态：方向／拓扑锁定，实际距离未锁
* 原文：冰夷人面，乘两龙。
* 设定与推导：依据从极之渊关系与现有核心坐标暂定。

---

### 对象：从极之渊照明作用域

* 地名：从极之渊照明作用域
* 类型：作用域
* 所属经篇：《大荒北经》
* 几何类型：作用域
* 中心X（里）：-1200
* 中心Y（里）：900
* 作用域形状：圆形
* 作用半径（里）：500
* 面积证据等级：项目推定
* 锁定状态：未锁定
* 设定与推导：表现照明影响，不等同实体占地。`;

  const WRONG_MD_SAMPLE = `# 错误格式演示

## 对象：烛光

* 地名 烛光
* 类型：神祇
* 几何类型：圆形
* X坐标（里）：向东三百
* 锁定状态：未锁定

---

### 对象：弱水核心段

* 地名：弱水核心段
* 类型：河流
* 几何类型：线
* 路径节点：
  - -1450,1050
* 原文流向：东南流

---

### 对象：无名区域

* 几何类型：面积
* 中心X（里）：-900
* 中心Y（里）：500
* 面积形状：方形
* 东西宽（里）：八百
* 南北长（里）：800`;

  const IMPORT_RULES_TEXT = `识别入口：每个对象必须以“### 对象：对象名称”开始。
字段格式：使用“* 字段名：字段值”。
坐标单位：数字坐标统一使用“里”，支持小数。
点对象：需要X坐标与Y坐标。
线对象：路径节点至少2个，每行写“  - X,Y”。
面积对象：需要中心、形状和尺寸；多边形至少3个顶点。
作用域：可以使用圆形半径、矩形尺寸或多边形顶点。
空字段：可以保留为空，但不能省略必填的几何与坐标字段。
同名对象：不会自动覆盖；程序会提示可能重复。`;

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const els = {
    versionLine:$("#versionLine"), saveState:$("#saveState"), topChangeCount:$("#topChangeCount"), topTrashCount:$("#topTrashCount"), openTrashTab:$("#openTrashTab"), finishRoundBtn:$("#finishRoundBtn"),
    searchInput:$("#searchInput"), chapterFilter:$("#chapterFilter"), typeFilter:$("#typeFilter"), resetFilterBtn:$("#resetFilterBtn"),
    objectList:$("#objectList"), resultCount:$("#resultCount"), mapStats:$("#mapStats"),
    viewport:$("#mapViewport"), canvas:$("#worldCanvas"), tileLayer:$("#tileLayer"), coordStatus:$("#coordStatus"), cameraStatus:$("#cameraStatus"), zoomReadout:$("#zoomReadout"),
    zoomInBtn:$("#zoomInBtn"), zoomOutBtn:$("#zoomOutBtn"), originBtn:$("#originBtn"), jumpCoordBtn:$("#jumpCoordBtn"), fitAllBtn:$("#fitAllBtn"), closeFlipBtn:$("#closeFlipBtn"), clearSpatialFocusBtn:$("#clearSpatialFocusBtn"),
    layerAreas:$("#layerAreas"), layerRivers:$("#layerRivers"), layerEmpty:$("#layerEmpty"), layerChanges:$("#layerChanges"),
    emptyDetail:$("#emptyDetail"), detailContent:$("#detailContent"), detailRef:$("#detailRef"), detailName:$("#detailName"), detailMeta:$("#detailMeta"), detailLocation:$("#detailLocation"), detailBody:$("#detailBody"), editTileBtn:$("#editTileBtn"), openDossierBtn:$("#openDossierBtn"), openRangeEditorBtn:$("#openRangeEditorBtn"), deleteTileBtn:$("#deleteTileBtn"),
    dossierWorkspace:$("#dossierWorkspace"), closeDossierBtn:$("#closeDossierBtn"), dossierPageTitle:$("#dossierPageTitle"), dossierPageMeta:$("#dossierPageMeta"), dossierCoordBadge:$("#dossierCoordBadge"), dossierCardTitle:$("#dossierCardTitle"), dossierBrief:$("#dossierBrief"), dossierStandard:$("#dossierStandard"), dossierBadges:$("#dossierBadges"), dossierCompletenessText:$("#dossierCompletenessText"), dossierCompletenessBar:$("#dossierCompletenessBar"), dossierCompletenessMeta:$("#dossierCompletenessMeta"), dossierObjectCount:$("#dossierObjectCount"), dossierObjectIndex:$("#dossierObjectIndex"), dossierLocateBtn:$("#dossierLocateBtn"), dossierChapterBadge:$("#dossierChapterBadge"), dossierHeroTitle:$("#dossierHeroTitle"), dossierContent:$("#dossierContent"), copyPromptBtn:$("#copyPromptBtn"), copyBriefBtn:$("#copyBriefBtn"), editDossierBtn:$("#editDossierBtn"),
    drillModal:$("#drillModal"), drillTitle:$("#drillTitle"), drillSubtitle:$("#drillSubtitle"), innerGrid:$("#innerGrid"), innerCoord:$("#innerCoord"), drillCount:$("#drillCount"), drillObjectList:$("#drillObjectList"), drillAddBtn:$("#drillAddBtn"),
    objectModal:$("#objectModal"), objectModalTitle:$("#objectModalTitle"), objectForm:$("#objectForm"), deleteObjectBtn:$("#deleteObjectBtn"), formObjectId:$("#formObjectId"), formName:$("#formName"), formType:$("#formType"), formX:$("#formX"), formY:$("#formY"), formChapter:$("#formChapter"), formGeometry:$("#formGeometry"), formLock:$("#formLock"), formOriginal:$("#formOriginal"), formDerivation:$("#formDerivation"), geometryRangeHint:$("#geometryRangeHint"),
    tileProfileModal:$("#tileProfileModal"), tileProfileForm:$("#tileProfileForm"), tileProfileTitle:$("#tileProfileTitle"), tileProfileKey:$("#tileProfileKey"), tileGeoEnvironment:$("#tileGeoEnvironment"), tileArchitecture:$("#tileArchitecture"), tileLivingSpecies:$("#tileLivingSpecies"), tileCountry:$("#tileCountry"), tileFaith:$("#tileFaith"), tileRuler:$("#tileRuler"), tileGuardian:$("#tileGuardian"), tileBeasts:$("#tileBeasts"), tileDivinePlants:$("#tileDivinePlants"), tileHerbs:$("#tileHerbs"), tileMinerals:$("#tileMinerals"), tileSpecialLife:$("#tileSpecialLife"), tileCustoms:$("#tileCustoms"), tileOccurredEvents:$("#tileOccurredEvents"), tileTimeNormal:$("#tileTimeNormal"), tilePlayerReachable:$("#tilePlayerReachable"), tileStoryOther:$("#tileStoryOther"), playerFields:$("#playerFields"), tilePlayerEnemies:$("#tilePlayerEnemies"), tilePlayerPlots:$("#tilePlayerPlots"), tilePlayerLoot:$("#tilePlayerLoot"), scriptureEventFields:$("#scriptureEventFields"),
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
    githubPendingFiles: [],
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
    filters:{q:"",chapter:"",type:""},
    layers:{areas:true,rivers:true,empty:true,changes:true},
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
    try{localStorage.setItem(STORAGE_KEY, JSON.stringify({objects:state.objects,changes:state.changes,changeArchives:state.changeArchives,appliedRemotePatches:state.appliedRemotePatches,remotePatchHistory:state.remotePatchHistory,dataVersion:state.dataVersion,camera:state.camera,selectedId:state.selectedId,selectedCell:state.selectedCell,tileProfiles:state.tileProfiles,trash:state.trash,trashRetentionDays:state.trashRetentionDays,nextIdCounter:state.nextIdCounter})); els.saveState.textContent="已保存到本地"; setTimeout(()=>els.saveState.textContent="本地工作区",900)}catch(e){console.warn(e)}
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
    ["地理环境",p.geoEnvironment],["建筑群",p.architecture],["生活物种",p.livingSpecies],["已发生事件",p.occurredEvents]
  ]}
  function matchEntries(entries,q){const nq=normalizeText(q);if(!nq)return [];return entries.filter(([,v])=>v&&normalizeText(v).includes(nq)).map(([label,value])=>({label,value:String(value)}))}
  function nameMatchKind(o,q){const n=normalizeText(o?.name),nq=normalizeText(q);if(!n||!nq)return "";if(n===nq)return "exact";if(n.startsWith(nq))return "prefix";if(n.includes(nq))return "contains";return ""}
  function searchRank(o,q){const kind=nameMatchKind(o,q);if(kind==="exact")return 0;if(kind==="prefix")return 1;if(kind==="contains")return 2;return 5}
  function markSearchText(value,q){const text=String(value||""),needle=String(q||"").trim();if(!needle)return esc(text);const i=text.toLowerCase().indexOf(needle.toLowerCase());if(i<0)return esc(text);return `${esc(text.slice(0,i))}<mark>${esc(text.slice(i,i+needle.length))}</mark>${esc(text.slice(i+needle.length))}`}
  function pulseSearchTarget(cell,id=null){state.searchPulseCell=cell;state.searchPulseObject=id;clearTimeout(state.searchPulseTimer);state.searchPulseTimer=setTimeout(()=>{state.searchPulseCell=null;state.searchPulseObject=null;scheduleRender()},2300);scheduleRender()}
  function objectPassesSelectFilters(o){if(state.filters.chapter&&o.chapter!==state.filters.chapter)return false;if(state.filters.type&&o.type!==state.filters.type)return false;return true}
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
  function populateFilters(){
    const chapters=[...new Set(state.objects.map(o=>o.chapter).filter(Boolean))].sort();
    const types=[...new Set(state.objects.map(o=>o.type).filter(Boolean))].sort();
    els.chapterFilter.innerHTML='<option value="">全部</option>'+chapters.map(x=>`<option>${esc(x)}</option>`).join("");
    els.typeFilter.innerHTML='<option value="">全部</option>'+types.map(x=>`<option>${esc(x)}</option>`).join("");
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

  function resizeCanvas(){const r=els.viewport.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);els.canvas.width=Math.max(1,Math.round(r.width*dpr));els.canvas.height=Math.max(1,Math.round(r.height*dpr));els.canvas.style.width=r.width+"px";els.canvas.style.height=r.height+"px"}
  function scheduleRender(){if(state.renderQueued)return;state.renderQueued=true;requestAnimationFrame(()=>{state.renderQueued=false;renderMap()})}
  function visibleWorld(){const r=els.viewport.getBoundingClientRect(),s=scale();return {left:state.camera.x-r.width/(2*s),right:state.camera.x+r.width/(2*s),bottom:state.camera.y-r.height/(2*s),top:state.camera.y+r.height/(2*s),width:r.width,height:r.height}}
  function renderMap(){
    if(!els.viewport.clientWidth)return;
    drawCanvas(); renderTiles();
    els.zoomReadout.textContent=Math.round(state.camera.zoom*100)+"%";
    els.cameraStatus.textContent=`中心 ${coordText(Math.round(state.camera.x),Math.round(state.camera.y))}`;
    els.closeFlipBtn.classList.toggle("hidden",!state.flippedCell);
    const spatial=getSpatialFocusContext();
    if(els.clearSpatialFocusBtn){
      els.clearSpatialFocusBtn.classList.toggle("hidden",!spatial.active);
      els.clearSpatialFocusBtn.title=spatial.active?`当前聚焦：${spatial.areas.map(o=>o.name).join("、")}`:"";
    }
  }
  function drawCanvas(){
    const ctx=els.canvas.getContext("2d"),r=els.viewport.getBoundingClientRect(),dpr=els.canvas.width/r.width;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,r.width,r.height);
    const v=visibleWorld(),s=scale(),cellPx=CELL_LI*s;
    ctx.fillStyle="#cfd1d0";ctx.fillRect(0,0,r.width,r.height);
    // neutral gray foundation with a restrained light falloff
    const grad=ctx.createRadialGradient(r.width*.15,r.height*.05,0,r.width*.15,r.height*.05,r.width*.72);grad.addColorStop(0,"rgba(255,255,255,.22)");grad.addColorStop(1,"rgba(255,255,255,0)");ctx.fillStyle=grad;ctx.fillRect(0,0,r.width,r.height);
    if(state.layers.areas)drawAreas(ctx,v,s);
    drawGrid(ctx,v,s,cellPx);
    if(state.layers.rivers)drawLines(ctx,v,s);
    drawContextDimming(ctx,v);
    drawSearchHighlights(ctx,v,s);
    drawOrigin(ctx,s);
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
    els.tileLayer.innerHTML=fragments.join("");bindTileEvents();
  }
  function tileCoordCode(gx,gy){const f=n=>`${n>=0?"+":"-"}${String(Math.abs(n)).padStart(3,"0")}`;return `X${f(gx)}_Y${f(gy)}`}
  function tileHTML(gx,gy,k,all,visible,left,top,size,semantic,isChanged,searchClass="",search=null){
    const q=state.filters.q.trim(),flipped=state.flippedCell===k&&semantic!=="micro",selected=all.some(o=>o.id===state.selectedId),main=(visible[0]||all.find(o=>o.id===state.selectedId)||all.find(o=>o.geometryType==="area")||all[0]),changeBadge=isChanged&&state.layers.changes?`<span class="tile-change-badge">更改</span>`:"",pulse=state.searchPulseCell===k?"search-pulse":"",uiScale=Math.min(2.6,Math.max(.82,size/BASE_CELL_PX)),style=`left:${left}px;top:${top}px;width:${size}px;height:${size}px;--tile-ui:${uiScale}`;
    const coord=tileCoordCode(gx,gy);
    if(!all.length){return `<div class="tile empty ${flipped?'flipped':''} ${semantic} ${searchClass} ${pulse}" data-cell="${k}" data-gx="${gx}" data-gy="${gy}" style="${style}"><div class="tile-card"><div class="tile-face tile-front"><div class="tile-content empty-layout icon-only"><div class="empty-plus">${searchClass==='search-match'?'⌕':'＋'}</div></div></div><div class="tile-face tile-back"><div class="tile-empty-back"><strong>此格尚无对象</strong><p>${coordText(cellCenter(gx),cellCenter(gy))}为主格中心</p><button data-action="add">＋ 新增第一个对象</button></div></div></div></div>`}
    const ordered=state.filters.q?[...all].sort((a,b)=>searchRank(a,q)-searchRank(b,q)):all;
    const list=ordered.map(o=>{const matched=state.filters.q&&searchRank(o,q)<5,focused=o.id===state.searchPulseObject;return `<button class="tile-object-btn ${o.id===state.selectedId?'selected':''} ${matched?'search-object-match':''} ${focused?'search-object-focus':''}" data-object-id="${esc(o.id)}"><i class="${esc(o.geometryType||'point')}"></i><span><strong>${matched?markSearchText(o.name,q):esc(o.name)}</strong><small>${esc(o.rowRef||'NEW')} · ${esc(o.type||'未分类')}</small></span></button>`}).join("");
    return `<div class="tile ${flipped?'flipped':''} ${selected?'selected':''} ${isChanged?'changed':''} ${state.previewCell===k?'search-preview':''} ${semantic} ${searchClass} ${pulse}" data-cell="${k}" data-gx="${gx}" data-gy="${gy}" style="${style}"><div class="tile-card"><div class="tile-face tile-front">${changeBadge}<div class="tile-content icon-only"><div class="tile-icon-row"><i class="type-icon featured ${esc(main?.geometryType||'point')}">${geometryIcon(main||all[0])}</i>${all.length>1?`<span class="tile-count">${all.length}</span>`:""}</div></div></div><div class="tile-face tile-back"><div class="tile-back-head"><span>${coord}</span><strong>${all.length}项</strong></div><div class="tile-object-stack">${list}</div><div class="tile-actions"><button data-action="drill">10里格内</button><button class="add" data-action="add">＋新增</button><button class="delete" data-action="delete">⌫删除</button></div></div></div></div>`
  }
  function bindTileEvents(){
    els.tileLayer.querySelectorAll(".tile").forEach(tile=>{
      tile.addEventListener("click",e=>{if(Date.now()<state.suppressClickUntil)return;if(e.target.closest("button"))return;state.selectedCell=tile.dataset.cell;state.flippedCell=state.flippedCell===tile.dataset.cell?null:tile.dataset.cell;renderDetails();scheduleRender();persist()});
      tile.addEventListener("dblclick",e=>{if(Date.now()<state.suppressClickUntil)return;e.preventDefault();openDrill(Number(tile.dataset.gx),Number(tile.dataset.gy))});
      tile.addEventListener("mouseenter",e=>{const items=sortObjects(buildCellMap(state.objects).get(tile.dataset.cell)||[]),names=items.slice(0,5).map(o=>o.name).join("、"),more=items.length>5?` 等${items.length}项`:"";showTooltip(items.length?`${names}${more} · 单击翻转 / 双击下钻`:`空白地块 · 单击后可建档`,e.clientX,e.clientY)});
      tile.addEventListener("mousemove",e=>moveTooltip(e.clientX,e.clientY));tile.addEventListener("mouseleave",hideTooltip);
      tile.querySelectorAll("[data-object-id]").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();state.selectedCell=tile.dataset.cell;selectObject(btn.dataset.objectId)}));
      tile.querySelectorAll("[data-action='drill']").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();state.selectedCell=tile.dataset.cell;renderDetails();openDrill(Number(tile.dataset.gx),Number(tile.dataset.gy))}));
      tile.querySelectorAll("[data-action='add']").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();state.selectedCell=tile.dataset.cell;renderDetails();openObjectForm(null,{x:cellCenter(Number(tile.dataset.gx)),y:cellCenter(Number(tile.dataset.gy))})}));
      tile.querySelectorAll("[data-action='delete']").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();state.selectedCell=tile.dataset.cell;renderDetails();openDeleteModal("tile")}));
    });
  }

  function showTooltip(text,x,y){els.tooltip.textContent=text;els.tooltip.classList.remove("hidden");moveTooltip(x,y)}function moveTooltip(x,y){els.tooltip.style.left=(x+12)+"px";els.tooltip.style.top=(y+12)+"px"}function hideTooltip(){els.tooltip.classList.add("hidden")}
  function selectObject(id){state.spatialFocusArmed=true;state.selectedId=id;const o=state.objects.find(x=>x.id===id);if(o){const c=objectCell(o);state.selectedCell=cellKey(c.gx,c.gy)}renderDetails();renderSidebar();scheduleRender();persist()}
  function jumpToObject(id,flip=false,smooth=false){const o=state.objects.find(x=>x.id===id);if(!o)return;state.spatialFocusArmed=true;const pulseCell=cellKey(objectCell(o).gx,objectCell(o).gy);pulseSearchTarget(pulseCell,id);state.selectedId=id;const targetCell=objectCell(o);state.selectedCell=cellKey(targetCell.gx,targetCell.gy);renderDetails();renderSidebar();const targetZoom=Math.max(state.camera.zoom,.86);if(smooth)animateCameraTo(Number(o.x)||0,Number(o.y)||0,targetZoom,()=>{if(flip){const c=objectCell(o);state.flippedCell=cellKey(c.gx,c.gy)}scheduleRender();persist()});else{state.camera.x=Number(o.x)||0;state.camera.y=Number(o.y)||0;state.camera.zoom=targetZoom;if(flip){const c=objectCell(o);state.flippedCell=cellKey(c.gx,c.gy)}scheduleRender();persist()}}
  function jumpToCell(key,flip=false){state.spatialFocusArmed=true;pulseSearchTarget(key);const [gx,gy]=String(key).split(",").map(Number);state.selectedCell=key;const items=objectsInCellKey(key);if(items[0])state.selectedId=items[0].id;renderDetails();renderSidebar();animateCameraTo(cellCenter(gx),cellCenter(gy),Math.max(state.camera.zoom,.82),()=>{if(flip)state.flippedCell=key;scheduleRender();persist()})}
  function animateCameraTo(x,y,zoom,duration=680,done=null){if(typeof duration==="function"){done=duration;duration=680}if(state.cameraAnimation)cancelAnimationFrame(state.cameraAnimation);const from={x:state.camera.x,y:state.camera.y,z:state.camera.zoom},start=performance.now();const ease=t=>1-Math.pow(1-t,3);const step=now=>{const t=Math.min(1,(now-start)/duration),e=ease(t);state.camera.x=from.x+(x-from.x)*e;state.camera.y=from.y+(y-from.y)*e;state.camera.zoom=from.z+(zoom-from.z)*e;scheduleRender();if(t<1)state.cameraAnimation=requestAnimationFrame(step);else{state.cameraAnimation=null;done&&done()}};state.cameraAnimation=requestAnimationFrame(step)}
  function jumpName(name){const o=state.objects.find(x=>x.name===name)||state.objects.find(x=>(x.name||"").includes(name));if(o)jumpToObject(o.id,true);else toast("未找到对象",name,"error")}
  function uniqueText(values){const seen=new Set(),out=[];values.flatMap(v=>String(v||"").split(/\n+/)).map(v=>v.trim()).filter(Boolean).forEach(v=>{if(!seen.has(v)){seen.add(v);out.push(v)}});return out.join("\n")}
  function objectsInCellKey(key){return sortObjects(buildCellMap(state.objects).get(key)||[])}
  function baseTileProfile(){return {geoEnvironment:"",architecture:"",livingSpecies:"",country:"",faith:"",ruler:"",guardian:"",beasts:"",divinePlants:"",herbs:"",minerals:"",specialLife:"",customs:"",occurredEvents:"",timeNormal:"unknown",storyOther:"",playerReachable:"unknown",playerEnemies:"",playerPlots:"",playerLoot:"",scriptureEvents:Object.fromEntries(CHAPTERS_18.map(ch=>[ch,""]))}}
  function deriveTileProfile(items){const p=baseTileProfile();p.geoEnvironment=uniqueText(items.flatMap(o=>[o.terrain,o.water,o.range]));p.architecture=uniqueText(items.filter(o=>/城|宫|台|庙|坛|墓|冢|井|门|邑|郭|室/.test(`${o.type||""}${o.name||""}`)).map(o=>o.name));p.livingSpecies=uniqueText(items.flatMap(o=>[o.plants,o.animals,o.wildlife,o.beasts]));p.country=uniqueText(items.flatMap(o=>[/国/.test(o.name||"")?o.name:"",/国/.test(o.region||"")?o.region:""]));p.faith=uniqueText(items.map(o=>o.gods));p.beasts=uniqueText(items.flatMap(o=>[o.animals,o.wildlife,o.beasts]));p.divinePlants=uniqueText(items.flatMap(o=>[o.plants,/木|树|草|禾|植被/.test(`${o.type||""}${o.name||""}`)?o.name:""]));p.herbs=uniqueText(items.flatMap(o=>[/草|药|芝|菁|蓏|葵|薤/.test(o.plants||"")?o.plants:""]));p.minerals=uniqueText(items.map(o=>o.minerals));p.specialLife=uniqueText(items.flatMap(o=>[o.residents,o.appearance,o.abilities]));p.occurredEvents=uniqueText(items.map(o=>o.events));CHAPTERS_18.forEach(ch=>{p.scriptureEvents[ch]=uniqueText(items.filter(o=>String(o.chapter||"").includes(ch)).map(o=>o.events))});return p}
  function tileProfileFor(key,items=objectsInCellKey(key)){const derived=deriveTileProfile(items),savedProfile=state.tileProfiles[key]||{};const merged={...derived,...savedProfile};merged.scriptureEvents={...derived.scriptureEvents,...(savedProfile.scriptureEvents||{})};return merged}
  function activeTile(){let key=state.selectedCell;if(!key&&state.selectedId){const o=state.objects.find(x=>x.id===state.selectedId);if(o){const c=objectCell(o);key=cellKey(c.gx,c.gy)}}if(!key&&state.flippedCell)key=state.flippedCell;if(!key)return null;const [gx,gy]=key.split(",").map(Number);return {key,gx,gy,items:objectsInCellKey(key)}}
  function statusText(value,type){const maps=type==="time"?{unknown:"时间流逝未判定",yes:"时间流逝正常",no:"时间流逝异常",stopped:"时间停滞",loop:"时间循环"}:{unknown:"玩家可达性未判定",yes:"玩家可以抵达",no:"玩家不可抵达",conditional:"满足条件后可抵达"};return maps[value]||maps.unknown}
  function statusClass(value){return value==="yes"?"yes":value==="no"?"no":"unknown"}
  function fieldGlyph(title){const map={"地理环境":"山","建筑群":"邑","生活物种":"生","所属国度":"国","信仰对象":"祀","统治者":"冠","守护神":"守","奇珍异兽／栖息生物":"兽","神木／神话植被":"木","仙草药草":"草","丰富矿产":"矿","特殊生命":"灵","当地风俗":"俗","已发生事件（综合简述）":"事","其他剧情说明":"叙","玩家遭遇的敌人":"敌","玩家触发的剧情":"戏","玩家得到的东西":"获"};return map[title]||"录"}
  function dossierField(title,value){return `<section class="dossier-field ${value?'':'empty'}"><h4><span class="field-glyph">${fieldGlyph(title)}</span>${esc(title)}</h4><div>${value?esc(value):'尚未录入'}</div></section>`}
  function objectRibbon(items){if(!items.length)return `<div class="tile-dossier-intro"><strong>空白地块档案</strong><p>本格尚无地图对象，但可以先建立环境、文明与剧情资料。</p></div>`;return `<div class="tile-dossier-intro"><strong>本格对象 · ${items.length}项</strong><p>地块档案用于汇总本格整体情况；各对象仍保留独立坐标、原典与考据记录。</p></div><div class="tile-object-ribbon">${items.map(o=>`<button class="tile-object-chip ${o.id===state.selectedId?'selected':''}" data-tile-object="${esc(o.id)}" title="单击选中；双击编辑对象">${geometryIcon(o)} ${esc(o.name)}</button>`).join("")}</div>`}
  function scriptureGroupsHTML(profile){return `<div class="scripture-groups">${CHAPTER_GROUPS.map(g=>`<div class="scripture-group-title">${esc(g.name)}</div>${g.chapters.map(ch=>{const value=profile.scriptureEvents?.[ch]||"";return `<details class="scripture-event ${value?'has-content':''}" ${value?'open':''}><summary>${esc(ch)}<span>${value?`${value.split(/\n+/).filter(Boolean).length}条`:'未录入'}</span></summary><div class="scripture-body">${value?esc(value):'本经篇尚未归档该地块事件。'}</div></details>`}).join("")}`).join("")}</div>`}
  function renderDetails(){const tile=activeTile();if(!tile){els.emptyDetail.classList.remove("hidden");els.detailContent.classList.add("hidden");return}const {key,gx,gy,items}=tile,profile=tileProfileFor(key,items),b=cellBounds(gx,gy),main=items.find(o=>o.id===state.selectedId)||items.find(o=>o.geometryType==="area")||items[0];els.emptyDetail.classList.add("hidden");els.detailContent.classList.remove("hidden");els.detailRef.textContent=`TILE ${signed(gx)}, ${signed(gy)} · 100里主格`;els.detailName.textContent=main?`${main.name}所在地区`:`空白地块（${signed(gx)}, ${signed(gy)}）`;const populated=Object.values(profile.scriptureEvents||{}).filter(Boolean).length,spatialCount=items.filter(o=>o.geometryType==="area"||o.geometryType==="field").length;els.detailMeta.textContent=`${items.length}个对象 · ${populated}个经篇已有事件归档`;els.detailLocation.innerHTML=`<strong>主格中心 ${coordText(b.cx,b.cy)}</strong><br>范围 X ${signed(b.west)}～${signed(b.east)}里 · Y ${signed(b.south)}～${signed(b.north)}里<br>地块档案与格内对象资料分别保存`;els.openRangeEditorBtn.textContent=spatialCount?`▱ 编辑面积／作用域（${spatialCount}）`:`＋ 新建面积／作用域`;els.openRangeEditorBtn.classList.toggle("has-range",spatialCount>0);$$('.detail-tabs button').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab===state.detailTab));renderDetailBody(profile,items)}
  function renderDetailBody(profile,items){let html=objectRibbon(items);if(state.detailTab==="summary")html+=`<div class="dossier-section"><div class="dossier-section-head"><h3>地块简述</h3><span>环境 · 建筑 · 物种</span></div>${dossierField("地理环境",profile.geoEnvironment)}${dossierField("建筑群",profile.architecture)}${dossierField("生活物种",profile.livingSpecies)}</div>`;if(state.detailTab==="civilization")html+=`<div class="dossier-section"><div class="dossier-section-head"><h3>文明部落</h3><span>文明结构与资源生态</span></div><div class="dossier-grid">${dossierField("所属国度",profile.country)}${dossierField("信仰对象",profile.faith)}${dossierField("统治者",profile.ruler)}${dossierField("守护神",profile.guardian)}</div>${dossierField("奇珍异兽／栖息生物",profile.beasts)}<div class="dossier-grid">${dossierField("神木／神话植被",profile.divinePlants)}${dossierField("仙草药草",profile.herbs)}${dossierField("丰富矿产",profile.minerals)}${dossierField("特殊生命",profile.specialLife)}</div>${dossierField("当地风俗",profile.customs)}</div>`;if(state.detailTab==="story"){const reachable=profile.playerReachable==="yes"||profile.playerReachable==="conditional";html+=`<div class="dossier-section"><div class="dossier-section-head"><h3>剧情</h3><span>玩家层与原典事件分离</span></div><div class="status-line"><span class="status-pill ${statusClass(profile.timeNormal)}">${statusText(profile.timeNormal,"time")}</span><span class="status-pill ${statusClass(profile.playerReachable)}">${statusText(profile.playerReachable,"player")}</span></div>${dossierField("已发生事件（综合简述）",profile.occurredEvents)}${dossierField("其他剧情说明",profile.storyOther)}${reachable?`<div class="player-story-box"><h3>玩家抵达后的内容</h3>${dossierField("玩家遭遇的敌人",profile.playerEnemies)}${dossierField("玩家触发的剧情",profile.playerPlots)}${dossierField("玩家得到的东西",profile.playerLoot)}</div>`:`<div class="player-story-box disabled"><h3>玩家内容暂不展开</h3><div>只有“可以抵达”或“满足条件后可抵达”时，才显示敌人、触发剧情与所得物品。</div></div>`}<div class="dossier-section-head"><h3>十八经篇事件归档</h3><span>非玩家事件</span></div>${scriptureGroupsHTML(profile)}</div>`}els.detailBody.innerHTML=html;els.detailBody.querySelectorAll('[data-tile-object]').forEach(btn=>{btn.addEventListener('click',()=>{state.spatialFocusArmed=true;state.selectedId=btn.dataset.tileObject;renderDetails();renderSidebar();scheduleRender();persist()});btn.addEventListener('dblclick',()=>{const o=state.objects.find(x=>x.id===btn.dataset.tileObject);if(o)openObjectForm(o)})})}
  function renderScriptureEditors(profile){els.scriptureEventFields.innerHTML=CHAPTER_GROUPS.map(g=>`<div class="scripture-group-title" style="grid-column:1/-1">${esc(g.name)}</div>${g.chapters.map(ch=>`<details class="scripture-editor-item" ${(profile.scriptureEvents?.[ch]||'')?'open':''}><summary>${esc(ch)}</summary><textarea data-scripture-chapter="${esc(ch)}" placeholder="录入本地块归入《${esc(ch)}》的非玩家事件">${esc(profile.scriptureEvents?.[ch]||'')}</textarea></details>`).join('')}`).join('')}
  function togglePlayerFields(){const show=els.tilePlayerReachable.value==="yes"||els.tilePlayerReachable.value==="conditional";els.playerFields.classList.toggle("hidden",!show)}
  function openTileProfileForm(){const tile=activeTile();if(!tile)return;const profile=tileProfileFor(tile.key,tile.items);els.tileProfileKey.value=tile.key;els.tileProfileTitle.textContent=`编辑地块（${signed(tile.gx)}, ${signed(tile.gy)}）`;els.tileGeoEnvironment.value=profile.geoEnvironment||"";els.tileArchitecture.value=profile.architecture||"";els.tileLivingSpecies.value=profile.livingSpecies||"";els.tileCountry.value=profile.country||"";els.tileFaith.value=profile.faith||"";els.tileRuler.value=profile.ruler||"";els.tileGuardian.value=profile.guardian||"";els.tileBeasts.value=profile.beasts||"";els.tileDivinePlants.value=profile.divinePlants||"";els.tileHerbs.value=profile.herbs||"";els.tileMinerals.value=profile.minerals||"";els.tileSpecialLife.value=profile.specialLife||"";els.tileCustoms.value=profile.customs||"";els.tileOccurredEvents.value=profile.occurredEvents||"";els.tileTimeNormal.value=profile.timeNormal||"unknown";els.tilePlayerReachable.value=profile.playerReachable||"unknown";els.tileStoryOther.value=profile.storyOther||"";els.tilePlayerEnemies.value=profile.playerEnemies||"";els.tilePlayerPlots.value=profile.playerPlots||"";els.tilePlayerLoot.value=profile.playerLoot||"";renderScriptureEditors(profile);togglePlayerFields();openModal("tileProfileModal")}
  function saveTileProfileForm(e){e.preventDefault();const key=els.tileProfileKey.value;if(!key)return;const before=state.tileProfiles[key]?structuredClone(state.tileProfiles[key]):null;const scriptureEvents=Object.fromEntries(CHAPTERS_18.map(ch=>[ch,els.scriptureEventFields.querySelector(`[data-scripture-chapter="${CSS.escape(ch)}"]`)?.value.trim()||""]));const after={geoEnvironment:els.tileGeoEnvironment.value.trim(),architecture:els.tileArchitecture.value.trim(),livingSpecies:els.tileLivingSpecies.value.trim(),country:els.tileCountry.value.trim(),faith:els.tileFaith.value.trim(),ruler:els.tileRuler.value.trim(),guardian:els.tileGuardian.value.trim(),beasts:els.tileBeasts.value.trim(),divinePlants:els.tileDivinePlants.value.trim(),herbs:els.tileHerbs.value.trim(),minerals:els.tileMinerals.value.trim(),specialLife:els.tileSpecialLife.value.trim(),customs:els.tileCustoms.value.trim(),occurredEvents:els.tileOccurredEvents.value.trim(),timeNormal:els.tileTimeNormal.value,storyOther:els.tileStoryOther.value.trim(),playerReachable:els.tilePlayerReachable.value,playerEnemies:els.tilePlayerEnemies.value.trim(),playerPlots:els.tilePlayerPlots.value.trim(),playerLoot:els.tilePlayerLoot.value.trim(),scriptureEvents};state.tileProfiles[key]=after;recordChange({entityId:`CELL-${key}`,entityType:"tile_profile",operation:before?"update":"create",operationLabel:before?"修改地块档案":"新增地块档案",before,after:{name:`地块 ${key}`,...after},summary:`更新地块 ${key} 的环境、文明与剧情归档`});closeModal("tileProfileModal");renderDetails();if(!els.dossierWorkspace.classList.contains("hidden"))renderDossierWorkspace();persist();updateHeader();toast("地块档案已保存",`主格 ${key}`)}


  function shortText(value,max=92){const text=String(value||"").replace(/\s+/g," ").trim();return text?text.slice(0,max)+(text.length>max?"……":""):"尚未录入。"}
  function dossierIcon(label){const map={"地形地貌":"山","地域特征":"域","所属气候":"风","主要山脉":"岳","水系河流":"水","建筑群":"邑","生活物种":"生","所属国度":"国","信仰对象":"祀","统治者":"冠","守护神":"守","奇珍异兽":"兽","神木植被":"木","仙草药草":"草","丰富矿产":"矿","特殊生命":"灵","当地风俗":"俗","事件":"事","时间":"时","可达性":"行","敌人":"敌","触发剧情":"戏","所得物品":"获"};return map[label]||"录"}
  function iconCard(label,value){return `<article class="icon-card ${value?'':'empty'}"><div class="icon-card-head"><i>${dossierIcon(label)}</i><span>${esc(label)}</span></div><strong>${value?esc(value):'尚未录入'}</strong></article>`}
  function wideCard(label,value){return `<article class="wide-card"><h3><span class="field-glyph">${dossierIcon(label)}</span>${esc(label)}</h3><p>${value?esc(value):'尚未录入'}</p></article>`}
  function profileCompleteness(profile){const keys=["geoEnvironment","architecture","livingSpecies","country","faith","ruler","guardian","beasts","divinePlants","herbs","minerals","specialLife","customs","occurredEvents","timeNormal","playerReachable"];const filled=keys.filter(k=>{const v=profile[k];return v&&v!=="unknown"}).length;const scripture=Object.values(profile.scriptureEvents||{}).filter(Boolean).length;return {filled,total:keys.length+4,scripture,percent:Math.round((filled+Math.min(4,scripture))/ (keys.length+4)*100)}}
  function selectedTileMain(items){return items.find(o=>o.id===state.selectedId)||items.find(o=>o.geometryType==="area")||items[0]||null}
  function openDossierWorkspace(){const tile=activeTile();if(!tile){toast("尚未选择地块","请先在地图中选择一个地块。","error");return}state.dossierTab="overview";els.dossierWorkspace.classList.remove("hidden");renderDossierWorkspace()}
  function closeDossierWorkspace(){els.dossierWorkspace.classList.add("hidden")}
  function dossierStandardText(profile,items){const parts=[profile.geoEnvironment,profile.architecture,profile.livingSpecies,profile.country?`此地与${profile.country}相关。`:"",profile.occurredEvents].filter(Boolean);if(parts.length)return uniqueText(parts).slice(0,820);const main=selectedTileMain(items);return main?uniqueText([main.terrain,main.water,main.range,main.derivation,main.events]).slice(0,820):"本格尚无对象资料，可先建立地块档案。"}
  function makePrompt(profile,tile,main){return [`Chinese mythological environment concept art based on Shanhaijing`,main?.name||`tile ${tile.key}`,profile.geoEnvironment,profile.architecture,profile.livingSpecies,profile.country&&`civilization: ${profile.country}`,profile.faith&&`worship: ${profile.faith}`,`ancient Chinese sacred landscape, restrained color, archaeological detail, no modern objects, wide establishing shot`].filter(Boolean).join(", ")}
  function makeArtBrief(profile,tile,main){return `【地块】${main?.name||tile.key}\n【坐标】主格（${signed(tile.gx)}, ${signed(tile.gy)}），中心${coordText(cellCenter(tile.gx),cellCenter(tile.gy))}\n【地理环境】${profile.geoEnvironment||"待补充"}\n【建筑群】${profile.architecture||"待补充"}\n【生活物种】${profile.livingSpecies||"待补充"}\n【文明与信仰】${uniqueText([profile.country,profile.faith,profile.ruler,profile.guardian])||"待补充"}\n【视觉重点】${uniqueText([profile.divinePlants,profile.beasts,profile.minerals,profile.specialLife])||"待补充"}\n【事件氛围】${profile.occurredEvents||"待补充"}`}
  async function copyText(text,title){try{await navigator.clipboard.writeText(text);toast(title,"已复制到剪贴板") }catch{const ta=document.createElement("textarea");ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand("copy");ta.remove();toast(title,"已复制到剪贴板")}}
  function renderDossierWorkspace(){const tile=activeTile();if(!tile){closeDossierWorkspace();return}const {key,gx,gy,items}=tile,profile=tileProfileFor(key,items),main=selectedTileMain(items),b=cellBounds(gx,gy),complete=profileCompleteness(profile);const chapters=[...new Set(items.flatMap(o=>String(o.chapter||"").match(/《[^》]+》/g)||[]))];els.dossierPageTitle.textContent=main?`${main.name} · 地块博物志`:`空白地块 · 地块博物志`;els.dossierPageMeta.textContent=`地图数据 ${state.dataVersion} · 主格（${signed(gx)}, ${signed(gy)}） · ${items.length}个对象`;els.dossierCoordBadge.textContent=`X${signed(gx).padStart(4,"0")}_Y${signed(gy).padStart(4,"0")}`;els.dossierCardTitle.textContent=main?`${main.name}三层博物志`:`空白地块博物志`;els.dossierBrief.textContent=shortText(profile.geoEnvironment||main?.derivation||main?.terrain,120);els.dossierStandard.textContent=dossierStandardText(profile,items);els.dossierBadges.innerHTML=[...(chapters.length?chapters:["未标经篇"]),main?.lockStatus||"锁定状态未录入",main?.coordinateNature||"坐标性质未录入"].slice(0,5).map((x,i)=>`<span class="mono-badge ${i>0?'lock':''}">${esc(shortText(x,26))}</span>`).join("");els.dossierCompletenessText.textContent=`${complete.percent}%`;els.dossierCompletenessBar.style.width=`${complete.percent}%`;els.dossierCompletenessMeta.textContent=`核心字段 ${complete.filled}/16 · 已归档经篇 ${complete.scripture}/18`;els.dossierObjectCount.textContent=items.length;els.dossierObjectIndex.innerHTML=items.map(o=>`<button class="dossier-object-item ${o.id===state.selectedId?'selected':''}" data-dossier-object="${esc(o.id)}"><i>${geometryIcon(o)}</i><span><strong>${esc(o.name)}</strong><small>${esc(o.type||'未分类')} · ${coordText(o.x,o.y)}</small></span><em>${esc(o.rowRef||'NEW')}</em></button>`).join("")||`<div class="dossier-empty">本格尚无对象。</div>`;els.dossierChapterBadge.textContent=chapters.join(" · ")||"未标经篇";els.dossierHeroTitle.textContent=main?`《${main.name}》考证大卷`:`空白地块考证大卷`;$$('[data-dossier-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.dossierTab===state.dossierTab));renderDossierContent(profile,items,tile,main,b);els.dossierObjectIndex.querySelectorAll('[data-dossier-object]').forEach(btn=>btn.addEventListener('click',()=>{state.selectedId=btn.dataset.dossierObject;renderDetails();renderSidebar();renderDossierWorkspace();persist()}))}
  function renderDossierContent(profile,items,tile,main,b){let html="";if(state.dossierTab==="overview")html=`<section class="book-section"><div class="book-section-title"><b>I. 意象与符号构图</b><span>环境概念与场景识别</span></div><div class="icon-card-grid two">${wideCard("构图说明",shortText(uniqueText([profile.geoEnvironment,profile.architecture]),300))}${wideCard("绘图提示",shortText(makePrompt(profile,tile,main),300))}</div></section><section class="book-section"><div class="book-section-title"><b>II. 地理与生态环境</b><span>地貌、水系、气候与生物</span></div><div class="icon-card-grid">${iconCard("地形地貌",uniqueText(items.map(o=>o.terrain)))}${iconCard("地域特征",profile.geoEnvironment)}${iconCard("所属气候",uniqueText(items.map(o=>o.appearance)))}${iconCard("主要山脉",uniqueText(items.filter(o=>/山|丘|峰/.test(o.type||o.name)).map(o=>o.name)))}${iconCard("水系河流",uniqueText(items.flatMap(o=>[o.water,o.geometryType==="line"?o.name:""])))}${iconCard("生活物种",profile.livingSpecies)}</div></section><section class="book-section"><div class="book-section-title"><b>III. 地块空间信息</b><span>100里主格与对象叠层</span></div><div class="icon-card-grid">${iconCard("主格中心",coordText(b.cx,b.cy))}${iconCard("X范围",`${signed(b.west)}～${signed(b.east)}里`)}${iconCard("Y范围",`${signed(b.south)}～${signed(b.north)}里`)}</div></section>`;if(state.dossierTab==="civilization")html=`<section class="book-section"><div class="book-section-title"><b>I. 文明社会</b><span>国度、权力与祭祀体系</span></div><div class="icon-card-grid">${iconCard("所属国度",profile.country)}${iconCard("信仰对象",profile.faith)}${iconCard("统治者",profile.ruler)}${iconCard("守护神",profile.guardian)}${iconCard("建筑群",profile.architecture)}${iconCard("当地风俗",profile.customs)}</div></section><section class="book-section"><div class="book-section-title"><b>II. 神兽、植被与资源</b><span>栖息生态与特殊产出</span></div><div class="icon-card-grid">${iconCard("奇珍异兽",profile.beasts)}${iconCard("神木植被",profile.divinePlants)}${iconCard("仙草药草",profile.herbs)}${iconCard("丰富矿产",profile.minerals)}${iconCard("特殊生命",profile.specialLife)}${iconCard("生活物种",profile.livingSpecies)}</div></section>`;if(state.dossierTab==="story"){const reachable=profile.playerReachable==="yes"||profile.playerReachable==="conditional";html=`<section class="book-section"><div class="book-section-title"><b>I. 剧情状态</b><span>原典事件与玩家层分离</span></div><div class="icon-card-grid">${iconCard("时间",statusText(profile.timeNormal,"time"))}${iconCard("可达性",statusText(profile.playerReachable,"player"))}${iconCard("事件",profile.occurredEvents)}</div>${wideCard("其他剧情说明",profile.storyOther)}</section>${reachable?`<section class="book-section"><div class="book-section-title"><b>II. 玩家抵达后的内容</b><span>仅在可达或条件可达时展开</span></div><div class="icon-card-grid">${iconCard("敌人",profile.playerEnemies)}${iconCard("触发剧情",profile.playerPlots)}${iconCard("所得物品",profile.playerLoot)}</div></section>`:""}<section class="book-section"><div class="book-section-title"><b>III. 十八经篇事件归档</b><span>非玩家事件</span></div>${scriptureGroupsHTML(profile)}</section>`}if(state.dossierTab==="sources")html=items.length?items.map(o=>`<section class="source-object-block"><h3>${esc(o.name)} <small>${esc(o.rowRef||'')}</small></h3>${[["原文",o.original],["古注",o.annotations],["其他古籍",o.otherTexts],["异文",o.variants],["现代考证",o.modernResearch],["误传辨析",o.misconceptions],["设定与推导",o.derivation],["来源 URL",o.sourceUrl]].map(([k,v])=>`<details ${v?'':'class="empty"'}><summary>${k}</summary><div>${v?esc(v):'尚未录入'}</div></details>`).join("")}</section>`).join(""):`<div class="dossier-empty">本格暂无对象来源资料。</div>`;if(state.dossierTab==="history"){const ids=new Set(items.map(o=>o.id));const history=state.changes.filter(c=>ids.has(c.entityId)||c.entityId===`CELL-${tile.key}`).slice().reverse();html=history.length?`<div class="history-timeline">${history.map(c=>`<article class="history-node"><strong>${esc(c.operationLabel||c.operation||'更改')}</strong><small>${esc(c.time||'')} · 基于 ${esc(c.baseVersion||state.dataVersion)}</small><p>${esc(c.summary||'')}</p></article>`).join("")}</div>`:`<div class="dossier-empty">当前地块在本轮尚无本地修改记录。正式数据来自 ${esc(INITIAL.metadata?.sourceWorkbook||'最新版母表')}。</div>`}els.dossierContent.innerHTML=html}

  function openDrill(gx,gy){
    state.drillCell={gx,gy};const b=cellBounds(gx,gy),items=sortObjects(buildCellMap(state.objects).get(cellKey(gx,gy))||[]);els.drillTitle.textContent=`主格（${signed(gx)}, ${signed(gy)}）`;els.drillSubtitle.textContent=`范围 X ${signed(b.west)}～${signed(b.east)}里 · Y ${signed(b.south)}～${signed(b.north)}里；每小格10里`;els.drillCount.textContent=items.length;els.innerGrid.innerHTML="";
    const exactGroups=new Map();items.forEach(o=>{const k=`${Number(o.x)},${Number(o.y)}`;if(!exactGroups.has(k))exactGroups.set(k,[]);exactGroups.get(k).push(o)});
    exactGroups.forEach(group=>{const o=group[0],left=((Number(o.x)-b.west)/100)*100,top=((b.north-Number(o.y))/100)*100;const p=document.createElement("button");p.className=`inner-point ${o.geometryType||'point'}`;p.style.left=`${Math.max(0,Math.min(100,left))}%`;p.style.top=`${Math.max(0,Math.min(100,top))}%`;p.textContent=group.length>1?group.length:geometryIcon(o);p.title=group.map(x=>x.name).join("、");p.addEventListener("click",e=>{e.stopPropagation();if(group.length===1){selectObject(o.id);closeModal("drillModal")}else{els.drillObjectList.querySelector(`[data-object-id="${CSS.escape(o.id)}"]`)?.scrollIntoView({behavior:"smooth",block:"center"})}});els.innerGrid.appendChild(p);if(group.length===1){const l=document.createElement("span");l.className="inner-point-label";l.style.left=`${Math.max(0,Math.min(100,left))}%`;l.style.top=`${Math.max(0,Math.min(100,top))}%`;l.textContent=o.name;els.innerGrid.appendChild(l)}});
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
    <button class="delete-choice ${hasProfile?'':'disabled'}" data-delete-scope="profile"><i>档</i><span><strong>删除地块档案</strong><small>清除地理环境、文明部落和剧情归档，不删除格内对象。</small></span><em>移入回收站</em></button>
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
  function showSpecs(){els.infoEyebrow.textContent="ACTIVE SPECIFICATION";els.infoTitle.textContent="当前地图规格";els.infoBody.innerHTML=`<div class="info-section"><h3>当前执行优先级</h3><p>研究方法 v002作为基础研究规范；制图执行规则 v004具有更高优先级。冲突条款以v004为准。</p></div><div class="info-section"><h3>本Demo已落实</h3><ul><li>都广之野（0，0）固定为全局原点。</li><li>底层坐标单位为里；100里主格用于无限索引。</li><li>每个主格可下钻为10×10格内视图，每小格10里。</li><li>同一地块允许多个对象，不因重叠自动合并。</li><li>普通河流使用线型叠加；面积与作用域在底层连续显示。</li><li>空白地块不写入数据库，只有新增对象后才形成记录。</li></ul></div><div class="info-section"><h3>交互结构</h3><p>无限拖动棋盘 → 单击翻转100里地块 → 右侧查看地块简述／文明部落／剧情 → 双击或按钮进入10里格内视图。</p></div>`;openModal("infoModal")}
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
  function appliedRemoteRecord(entry){const key=remotePatchKey(entry);return state.appliedRemotePatches.find(x=>x.key===key||x.sha&&x.sha===entry?.sha||x.path&&x.path===entry?.path)}
  function isRemotePatchApplied(entry){return !!appliedRemoteRecord(entry)}
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
  function pendingPackageListHtml(files){
    if(!files.length)return `<div class="pending-empty"><strong>没有待处理更改包</strong><span>仓库 ${esc(GITHUB_CONFIG.pendingPath)} 中暂无 .shjpatch 文件。</span></div>`;
    return `<div class="pending-package-list">${files.map((entry,index)=>{const applied=appliedRemoteRecord(entry);return `<article class="pending-package-card ${applied?'applied':''}"><div class="pending-file-icon">PATCH</div><div class="pending-package-copy"><strong>${esc(entry.name)}</strong><small>${Math.max(1,Math.round((Number(entry.size)||0)/1024))} KB · ${esc(entry.path||"")}</small>${applied?`<em>本机已于 ${esc(new Date(applied.appliedAt).toLocaleString("zh-CN"))} 应用</em>`:`<em>尚未在本机应用</em>`}</div><button class="btn ${applied?'secondary':'primary'} compact" data-pending-index="${index}">${applied?'查看记录':'查看并应用'}</button></article>`}).join("")}</div>`
  }
  function githubStatusHtml(current,pendingFiles,currentError="",pendingError=""){
    const remote=current?.data_version||current?.dataVersion||"未读取",cmp=current?compareDataVersion(remote,state.dataVersion):0,update=current&&cmp>0,changes=Array.isArray(current?.highlights)?current.highlights:[],releaseUrl=current?.release_url||current?.releaseUrl||GITHUB_CONFIG.repoUrl,downloadUrl=current?.download_url||current?.downloadUrl||"",newCount=(pendingFiles||[]).filter(x=>!isRemotePatchApplied(x)).length;
    return `<div class="github-connection-strip"><span><b>● GitHub公开读取已接入</b>${esc(GITHUB_CONFIG.owner+'/'+GITHUB_CONFIG.repo)} · ${esc(GITHUB_CONFIG.branch)}</span><a href="${esc(GITHUB_CONFIG.repoUrl)}" target="_blank" rel="noopener">打开仓库 ↗</a></div><div class="github-update-grid"><section class="info-section"><h3>正式地图数据</h3>${currentError?`<div class="patch-error-box"><p>${esc(currentError)}</p></div>`:`<p>本地：<strong>${esc(state.dataVersion)}</strong><br>仓库：<strong>${esc(remote)}</strong></p><p>${update?'发现新的正式地图数据版本。':cmp===0?'当前正式数据已经是最新版本。':'本地版本高于仓库标记，请检查 current.json。'}</p>${changes.length?`<ul>${changes.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}<p><a class="btn secondary compact" href="${esc(releaseUrl)}" target="_blank" rel="noopener">发布页</a>${downloadUrl?` <a class="btn primary compact" href="${esc(downloadUrl)}" target="_blank" rel="noopener">下载正式数据包</a>`:""}</p>`}</section><section class="info-section"><h3>待处理更改包</h3><p>发现 <strong>${pendingFiles?.length||0}</strong> 个包，其中 <strong>${newCount}</strong> 个尚未在本机应用。</p><p>这些文件来自 <code>${esc(GITHUB_CONFIG.pendingPath)}</code>，与正式数据版本分开处理。</p>${pendingError?`<div class="patch-error-box"><p>${esc(pendingError)}</p></div>`:""}</section></div><div class="change-section-title"><h3>GitHub待处理包</h3><span>${newCount}个未应用</span></div>${pendingPackageListHtml(pendingFiles||[])}`
  }
  function bindPendingListActions(){els.infoBody.querySelectorAll("[data-pending-index]").forEach(btn=>btn.addEventListener("click",()=>openPendingPatchPreview(Number(btn.dataset.pendingIndex))))}
  function renderGithubUpdateModal(){els.infoEyebrow.textContent="GITHUB DATA & PATCHES";els.infoTitle.textContent="GitHub数据与待处理包";els.infoBody.innerHTML=githubStatusHtml(state.githubCurrent,state.githubPendingFiles,state.githubCurrentError||"",state.githubPendingError||"");bindPendingListActions()}
  async function openPendingPatchPreview(index){
    const entry=state.githubPendingFiles[index];if(!entry)return;els.infoEyebrow.textContent="GITHUB PENDING PATCH";els.infoTitle.textContent="正在下载更改包";els.infoBody.innerHTML=`<div class="info-section"><h3>${esc(entry.name)}</h3><p>正在从GitHub读取并校验内容……</p></div>`;
    try{const pkg=await fetchGithubPatch(entry),simulation=simulatePatchPackage(pkg);els.infoTitle.textContent="待处理更改包预览";els.infoBody.innerHTML=patchPreviewHtml(entry,pkg,simulation);$("#pendingBackBtn")?.addEventListener("click",renderGithubUpdateModal);$("#pendingApplyBtn")?.addEventListener("click",()=>applyGithubPatch(index,pkg,simulation))}
    catch(error){els.infoTitle.textContent="更改包读取失败";els.infoBody.innerHTML=`<div class="github-update-actions"><button class="btn secondary compact" id="pendingBackBtn">← 返回更新列表</button></div><div class="patch-error-box"><strong>无法读取 ${esc(entry.name)}</strong><p>${esc(error?.message||"未知错误")}</p></div>`;$("#pendingBackBtn")?.addEventListener("click",renderGithubUpdateModal)}
  }
  function applyGithubPatch(index,pkg,simulation){
    const entry=state.githubPendingFiles[index];if(!entry||isRemotePatchApplied(entry))return;if(simulation.packageErrors.length||simulation.conflictCount){toast("更改包未应用","请先处理格式错误或冲突。","error");return}
    if(!simulation.netNoop){state.objects=simulation.draft.objects;state.tileProfiles=simulation.draft.tileProfiles;state.nextIdCounter=Math.max(state.nextIdCounter,maxKnownObjectNumber())}
    rememberRemotePatch(entry,pkg,simulation);populateFilters();renderSidebar();renderDetails();scheduleRender();persist();updateHeader();toast(simulation.netNoop?"已标记为本机同步":"GitHub更改包已应用",simulation.netNoop?"本地地图原本已经包含这些变化。":`写入${simulation.applyCount}项，跳过${simulation.skipCount}项`);renderGithubUpdateModal()
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
  function parseMarkdown(text){
    const src=String(text||"").replace(/\r\n?/g,"\n"), lines=src.split("\n"), headerRe=/^###\s*对象\s*[：:]\s*(.+?)\s*$/gm, matches=[...src.matchAll(headerRe)];
    const legacy=[...src.matchAll(/^###\s*坐标\s*[：:]\s*(.+?)\s*$/gm)];
    const malformedHeaders=[];lines.forEach((line,i)=>{if(/^#{1,2}\s*对象\s*[：:]/.test(line)||/^#{4,}\s*对象\s*[：:]/.test(line))malformedHeaders.push({level:"error",message:"对象标题层级错误，应使用三个#：### 对象：名称。",line:i+1})});
    if(!matches.length){return {format:legacy.length?"legacy":"unknown",objects:[],globalIssues:legacy.length?[{level:"error",message:"识别到旧版“### 坐标：”格式。本Demo先进行格式提示，建议转换为“### 对象：”格式后导入。",line:1}]:malformedHeaders.length?malformedHeaders:[{level:"error",message:"未识别到对象标题。每个对象必须使用“### 对象：名称”。",line:1}]}}
    const objects=[];matches.forEach((m,index)=>{
      const start=m.index, end=index+1<matches.length?matches[index+1].index:src.length, block=src.slice(start,end), startLine=src.slice(0,start).split("\n").length, blockLines=block.split("\n"), fields={}, fieldLines={}, unknown=[], issues=[], headerName=m[1].trim();let listKey=null;
      blockLines.slice(1).forEach((raw,i)=>{const ln=startLine+i+1,field=raw.match(/^\s*\*\s*([^：:]+)\s*[：:]\s*(.*)$/);if(field){const key=normalizeKey(field[1]),value=field[2].trim();fields[key]=value;fieldLines[key]=ln;listKey=(value===""&&/路径节点|边界顶点/.test(key))?key:null;return}const li=raw.match(/^\s{2,}[-*]\s*(.+)$/);if(li&&listKey){if(!Array.isArray(fields[listKey]))fields[listKey]=[];fields[listKey].push(li[1].trim())}});
      const get=(...keys)=>{for(const k of keys){const nk=normalizeKey(k);if(fields[nk]!==undefined)return fields[nk]}return ""}, lineOf=(...keys)=>{for(const k of keys){const nk=normalizeKey(k);if(fieldLines[nk])return fieldLines[nk]}return startLine};
      let name=String(get("地名")||"").trim();if(!name){name=headerName;issues.push({level:"warn",message:"未填写“地名”字段，已暂用对象标题作为地名。",line:startLine})}
      const rawGeom=String(get("几何类型")||"").trim(), geomMap={"点":"point","点对象":"point","point":"point","线":"line","线型对象":"line","line":"line","面积":"area","面积对象":"area","area":"area","作用域":"field","field":"field"}, geometryType=geomMap[rawGeom.toLowerCase()]||geomMap[rawGeom];
      if(!rawGeom)issues.push({level:"error",message:"缺少必填字段“几何类型”。",line:startLine});else if(!geometryType)issues.push({level:"error",message:`无法识别几何类型“${rawGeom}”；可用：点、线、面积、作用域。`,line:lineOf("几何类型")});
      let x=null,y=null,path=[],area=null;
      if(geometryType==="point"){
        x=parseNumber(get("X坐标里","X坐标","中心X里","中心X"),"X坐标（里）",issues,lineOf("X坐标里","X坐标"));y=parseNumber(get("Y坐标里","Y坐标","中心Y里","中心Y"),"Y坐标（里）",issues,lineOf("Y坐标里","Y坐标"));
      }else if(geometryType==="line"){
        path=parsePointList(Array.isArray(get("路径节点"))?get("路径节点"):[],"路径节点",issues,lineOf("路径节点"),2);if(path.length){x=path[0][0];y=path[0][1]}
      }else if(geometryType==="area"||geometryType==="field"){
        x=parseNumber(get("中心X里","中心X","X坐标里","X坐标"),"中心X（里）",issues,lineOf("中心X里","中心X"));y=parseNumber(get("中心Y里","中心Y","Y坐标里","Y坐标"),"中心Y（里）",issues,lineOf("中心Y里","中心Y"));
        const shapeRaw=String(get("面积形状","作用域形状")||"").trim(), shapeMap={"方形":"square","矩形":"rect","圆形":"circle","多边形":"polygon"},shape=shapeMap[shapeRaw]||shapeRaw.toLowerCase();if(!shapeRaw)issues.push({level:"error",message:`缺少“${geometryType==='field'?'作用域形状':'面积形状'}”。`,line:startLine});else if(!["square","rect","circle","polygon"].includes(shape))issues.push({level:"error",message:`无法识别形状“${shapeRaw}”。`,line:lineOf("面积形状","作用域形状")});
        const evidenceText=String(get("面积证据等级","证据等级")||"");const evidence=/原文|硬面积/.test(evidenceText)?"hard":"candidate";
        if(shape==="circle"){
          const radius=parseNumber(get("作用半径里","作用半径","半径里","半径"),"半径（里）",issues,lineOf("作用半径里","作用半径","半径里","半径"));if(x!==null&&y!==null&&radius!==null)area={shape:"circle",cx:x,cy:y,radius,west:x-radius,east:x+radius,south:y-radius,north:y+radius,evidence};
        }else if(shape==="polygon"){
          const pts=parsePointList(Array.isArray(get("边界顶点"))?get("边界顶点"):[],"边界顶点",issues,lineOf("边界顶点"),3);if(pts.length>=3){const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);area={shape:"polygon",points:pts,west:Math.min(...xs),east:Math.max(...xs),south:Math.min(...ys),north:Math.max(...ys),evidence};if(x===null||y===null){x=xs.reduce((a,b)=>a+b,0)/xs.length;y=ys.reduce((a,b)=>a+b,0)/ys.length}}
        }else if(shape==="square"||shape==="rect"){
          let w=parseNumber(get("东西宽里","东西宽","边长里","边长"),shape==="square"?"边长／东西宽（里）":"东西宽（里）",issues,lineOf("东西宽里","东西宽","边长里","边长"));let h=shape==="square"?w:parseNumber(get("南北长里","南北长"),"南北长（里）",issues,lineOf("南北长里","南北长"));if(x!==null&&y!==null&&w!==null&&h!==null)area={shape,west:x-w/2,east:x+w/2,south:y-h/2,north:y+h/2,evidence};
        }
      }
      const id=String(get("对象ID")||"").trim();if(id&&state.objects.some(o=>o.id===id))issues.push({level:"error",message:`对象ID“${id}”已存在，不能重复导入。`,line:lineOf("对象ID")});
      const chapter=String(get("所属经篇")||"").trim();if(state.objects.some(o=>o.name===name&&(!chapter||o.chapter===chapter)))issues.push({level:"warn",message:`地图中已有可能同名对象“${name}”，导入时不会自动覆盖。`,line:startLine});
      const known=new Set(["对象ID","地名","类型","所属经篇","所属区域/山系","所属区域／山系","几何类型","X坐标里","X坐标","Y坐标里","Y坐标","中心X里","中心X","中心Y里","中心Y","坐标性质","锁定状态","对象范围/占地","对象范围／占地","直接参照地和原文方向","原文距离","原文","古注","其他古籍","异文","现代考证","常见定位说","百度/维基补充","百度／维基补充","误传辨析","设定与推导","来源URL","面积形状","作用域形状","作用半径里","作用半径","半径里","半径","东西宽里","东西宽","南北长里","南北长","边长里","边长","面积证据等级","证据等级","边界顶点","路径节点","原文流向","汇入对象"] .map(normalizeKey));Object.keys(fields).forEach(k=>{if(!known.has(k))unknown.push(k)});if(unknown.length)issues.push({level:"warn",message:`发现未映射字段：${unknown.join("、")}。这些字段会暂存，但不会进入标准栏位。`,line:startLine});
      const status=issues.some(i=>i.level==="error")?"error":issues.some(i=>i.level==="warn")?"warn":"ok";
      objects.push({headerName,name,id,geometryType,x,y,path,area,fields,fieldLines,issues,status,startLine,raw:block,chapter,type:String(get("类型")||"").trim(),region:String(get("所属区域/山系","所属区域／山系")||"").trim(),lockStatus:String(get("锁定状态")||"").trim(),coordinateNature:String(get("坐标性质")||"").trim(),reference:String(get("直接参照地和原文方向")||"").trim(),originalDistance:String(get("原文距离")||"").trim(),range:String(get("对象范围/占地","对象范围／占地")||"").trim(),original:String(get("原文")||"").trim(),annotations:String(get("古注")||"").trim(),otherTexts:String(get("其他古籍")||"").trim(),variants:String(get("异文")||"").trim(),modernResearch:String(get("现代考证")||"").trim(),commonLocation:String(get("常见定位说")||"").trim(),popularSources:String(get("百度/维基补充","百度／维基补充")||"").trim(),misconceptions:String(get("误传辨析")||"").trim(),derivation:String(get("设定与推导")||"").trim(),sourceUrl:String(get("来源URL")||"").trim()});
    });
    return {format:"object-v1",objects,globalIssues:malformedHeaders};
  }
  function analyzeImportText(){updateImportCharCount();const text=els.importText.value;if(!text.trim()){state.importAnalysis=null;renderImportAnalysis(null);return}state.importAnalysis=parseMarkdown(text);state.importSelectedIndex=Math.min(state.importSelectedIndex,Math.max(0,state.importAnalysis.objects.length-1));renderImportAnalysis(state.importAnalysis)}
  function renderImportAnalysis(a){
    if(!a){els.importFormatBadge.className="format-badge neutral";els.importFormatBadge.textContent="等待输入";els.importValidationState.className="validation-state";els.importValidationState.textContent="尚未分析";els.importSummary.innerHTML='<div><strong>0</strong><span>识别对象</span></div><div class="ok"><strong>0</strong><span>可导入</span></div><div class="warn"><strong>0</strong><span>警告</span></div><div class="error"><strong>0</strong><span>错误</span></div>';els.importObjectList.innerHTML='<div class="import-empty">载入文件后，这里会列出识别到的对象。</div>';els.importInspector.innerHTML='<div class="import-empty">正确字段、格式错误、缺失项和重复对象会在这里逐条标示。</div>';els.importApplyBtn.disabled=true;return}
    const ok=a.objects.filter(o=>o.status==="ok").length,warn=a.objects.filter(o=>o.status==="warn").length,error=a.objects.filter(o=>o.status==="error").length+(a.globalIssues||[]).filter(i=>i.level==="error").length,importable=a.objects.filter(o=>o.status!=="error").length;
    const cls=a.format==="object-v1"?(error?"error":warn?"warn":"ok"):"error";els.importFormatBadge.className=`format-badge ${cls}`;els.importFormatBadge.textContent=a.format==="object-v1"?"地图对象格式 v1.0":a.format==="legacy"?"旧版坐标索引":"格式未识别";els.importValidationState.className=`validation-state ${cls}`;els.importValidationState.textContent=error?"存在阻断错误":warn?"可导入，但有警告":"全部通过";els.importSummary.innerHTML=`<div><strong>${a.objects.length}</strong><span>识别对象</span></div><div class="ok"><strong>${importable}</strong><span>可导入</span></div><div class="warn"><strong>${warn}</strong><span>警告对象</span></div><div class="error"><strong>${error}</strong><span>错误</span></div>`;
    const globalHtml=(a.globalIssues||[]).map(i=>`<div class="issue ${i.level}">第${i.line||1}行：${esc(i.message)}</div>`).join("");
    els.importObjectList.innerHTML=globalHtml+a.objects.map((o,i)=>`<button class="import-result-item ${o.status} ${i===state.importSelectedIndex?'selected':''}" data-import-index="${i}"><em>${o.status==='ok'?'通过':o.status==='warn'?'警告':'错误'}</em><strong>${esc(o.name||o.headerName||'未命名对象')}</strong><small>第${o.startLine}行 · ${esc(o.geometryType||'几何类型未识别')} · ${o.x===null?'坐标未完成':coordText(o.x,o.y)}</small></button>`).join("");els.importObjectList.querySelectorAll("[data-import-index]").forEach(b=>b.addEventListener("click",()=>{state.importSelectedIndex=Number(b.dataset.importIndex);renderImportAnalysis(a)}));if(a.objects.length)renderImportInspector(a.objects[state.importSelectedIndex]);else els.importInspector.innerHTML='<div class="import-empty">请先修正左侧文件格式。</div>';els.importApplyBtn.disabled=!importable;
  }
  function renderImportInspector(o){if(!o){els.importInspector.innerHTML='<div class="import-empty">未选择对象。</div>';return}els.importInspectorMeta.textContent=`第${o.startLine}行开始`;
    const issueHtml=o.issues.length?`<div class="issue-list">${o.issues.map(i=>`<div class="issue ${i.level}"><strong>${i.level==='error'?'格式错误':'提示'}</strong> · 第${i.line||o.startLine}行<br>${esc(i.message)}</div>`).join("")}</div>`:`<div class="issue-list"><div class="issue ok"><strong>格式正确</strong><br>必填字段与几何参数均可识别。</div></div>`;
    const rows=[["对象标题",o.headerName],["地名",o.name],["类型",o.type||""],["所属经篇",o.chapter||""],["几何类型",o.geometryType||""],["坐标",o.x===null?"":coordText(o.x,o.y)],["面积／作用域",o.area?JSON.stringify(o.area,null,2):""],["路径节点",o.path?.length?o.path.map(p=>p.join(", ")).join("\n"):""],["锁定状态",o.lockStatus||""],["原文",o.original||""]];els.importInspector.innerHTML=issueHtml+`<div class="field-audit">${rows.map(([k,v])=>`<div class="field-audit-row"><b>${esc(k)}</b><code>${v?esc(v):'—'}</code></div>`).join("")}</div>`;
  }
  function importedObjectFromParsed(p){const id=p.id||nextObjectId(),obj={id,rowRef:"NEW",name:p.name,type:p.type||"未分类",x:Number(p.x)||0,y:Number(p.y)||0,coordinateText:coordText(p.x,p.y),chapter:p.chapter,region:p.region,direction:"",distance:Math.hypot(Number(p.x)||0,Number(p.y)||0),reference:p.reference,originalDistance:p.originalDistance,coordinateNature:p.coordinateNature||"Markdown导入，待复核",lockStatus:p.lockStatus,range:p.range,terrain:"",water:"",plants:"",animals:"",minerals:"",wildlife:"",beasts:"",people:"",gods:"",residents:"",appearance:"",abilities:"",events:"",original:p.original,sameName:"",annotations:p.annotations,otherTexts:p.otherTexts,variants:p.variants,modernResearch:p.modernResearch,commonLocation:p.commonLocation,popularSources:p.popularSources,misconceptions:p.misconceptions,derivation:p.derivation,sourceUrl:p.sourceUrl,geometryType:p.geometryType||"point",area:p.area||null};if(p.path?.length)obj.path=p.path;return obj}
  function applyMarkdownImport(){const a=state.importAnalysis;if(!a)return;const valid=a.objects.filter(o=>o.status!=="error");if(!valid.length){toast("没有可导入对象","请先修正格式错误。","error");return}const added=[];valid.forEach(p=>{const obj=importedObjectFromParsed(p);if(state.objects.some(o=>o.id===obj.id))return;state.objects.push(obj);recordChange({entityId:obj.id,operation:"create",operationLabel:"Markdown导入",before:null,after:obj,summary:`从Markdown导入“${obj.name}”，${coordText(obj.x,obj.y)}`});added.push(obj)});populateFilters();renderSidebar();renderDetails();scheduleRender();persist();updateHeader();closeImportWorkspace();if(added[0])jumpToObject(added[0].id,true,true);toast("Markdown导入完成",`成功添加${added.length}个对象；错误对象未写入地图。`)}
  function readImportFile(file){if(!file)return;const reader=new FileReader();reader.onload=()=>{els.importFileName.textContent=file.name;els.importText.value=String(reader.result||"");analyzeImportText()};reader.onerror=()=>toast("无法读取文件",file.name,"error");reader.readAsText(file,"utf-8")}
  function renderExamplePanel(){const tab=state.exampleTab;$$('.example-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.exampleTab===tab));if(tab==='correct'){els.exampleNotice.className='example-notice ok';els.exampleNotice.innerHTML='<strong>正确案例</strong><span>标题、字段、坐标和几何参数均符合识别规则。</span>';els.exampleCode.textContent=CORRECT_MD_SAMPLE;els.exampleNotes.innerHTML='<ul><li>每个对象以“### 对象：”开始。</li><li>所有字段使用星号与中文冒号。</li><li>数值字段只写数字，单位由字段名说明。</li><li>作用域与实体面积使用不同几何类型。</li></ul>';els.loadExampleBtn.textContent='载入正确案例到左侧'}else if(tab==='wrong'){els.exampleNotice.className='example-notice error';els.exampleNotice.innerHTML='<strong>错误案例</strong><span>包含标题级别、字段分隔、数字和几何参数错误。</span>';els.exampleCode.textContent=WRONG_MD_SAMPLE;els.exampleNotes.innerHTML='<ul><li>“## 对象”少一个#，无法形成对象块。</li><li>“地名 烛光”缺少冒号。</li><li>“圆形”不是几何类型，应写在作用域形状或面积形状。</li><li>“向东三百”“八百”不是可计算数字。</li><li>线对象只有一个路径节点，不能形成线路。</li></ul>';els.loadExampleBtn.textContent='载入错误案例并查看识别'}else{els.exampleNotice.className='example-notice neutral';els.exampleNotice.innerHTML='<strong>识别规则</strong><span>这是程序实际执行的最低格式要求。</span>';els.exampleCode.textContent=IMPORT_RULES_TEXT;els.exampleNotes.innerHTML='<ul><li>格式错误会阻止对应对象导入。</li><li>警告不会阻止导入，但会进入本轮更改记录。</li><li>可能同名只提示，不自动合并。</li><li>空白普通字段允许保留为空。</li></ul>';els.loadExampleBtn.textContent='载入空白正确模板'} }

  function bindEvents(){
    els.searchInput.addEventListener("input",()=>{state.filters.q=els.searchInput.value;renderSidebar();scheduleRender()});els.exitSearchBtn.addEventListener("click",()=>{state.filters.q="";els.searchInput.value="";state.previewCell=null;renderSidebar();scheduleRender();els.searchInput.focus()});els.chapterFilter.addEventListener("change",()=>{state.filters.chapter=els.chapterFilter.value;renderSidebar();scheduleRender()});els.typeFilter.addEventListener("change",()=>{state.filters.type=els.typeFilter.value;renderSidebar();scheduleRender()});els.resetFilterBtn.addEventListener("click",()=>{state.filters={q:"",chapter:"",type:""};els.searchInput.value="";els.chapterFilter.value="";els.typeFilter.value="";renderSidebar();scheduleRender()});
    $$("[data-jump-name]").forEach(b=>b.addEventListener("click",()=>jumpName(b.dataset.jumpName)));els.fitAllBtn.addEventListener("click",fitAll);els.originBtn.addEventListener("click",()=>{state.camera={...state.camera,x:0,y:0,zoom:.92};state.flippedCell=null;scheduleRender();persist()});els.zoomInBtn.addEventListener("click",()=>setZoom(state.camera.zoom*1.18));els.zoomOutBtn.addEventListener("click",()=>setZoom(state.camera.zoom/1.18));els.zoomReadout.addEventListener("click",()=>setZoom(1));
    els.jumpCoordBtn.addEventListener("click",()=>{els.jumpX.value=Math.round(state.camera.x);els.jumpY.value=Math.round(state.camera.y);openModal("jumpModal")});els.jumpForm.addEventListener("submit",e=>{e.preventDefault();state.camera.x=Number(els.jumpX.value)||0;state.camera.y=Number(els.jumpY.value)||0;state.camera.zoom=Math.max(.72,state.camera.zoom);state.flippedCell=null;closeModal("jumpModal");scheduleRender();persist()});
    [[els.layerAreas,"areas"],[els.layerRivers,"rivers"],[els.layerEmpty,"empty"],[els.layerChanges,"changes"]].forEach(([el,k])=>el.addEventListener("change",()=>{state.layers[k]=el.checked;scheduleRender()}));
    els.openImportBtn.addEventListener("click",openImportWorkspace);els.closeImportBtn.addEventListener("click",closeImportWorkspace);els.importChooseFileBtn.addEventListener("click",()=>els.importFileInput.click());els.importDropZone.addEventListener("click",()=>els.importFileInput.click());els.importFileInput.addEventListener("change",()=>readImportFile(els.importFileInput.files?.[0]));["dragenter","dragover"].forEach(ev=>els.importDropZone.addEventListener(ev,e=>{e.preventDefault();els.importDropZone.classList.add("dragover")}));["dragleave","drop"].forEach(ev=>els.importDropZone.addEventListener(ev,e=>{e.preventDefault();els.importDropZone.classList.remove("dragover")}));els.importDropZone.addEventListener("drop",e=>readImportFile(e.dataTransfer.files?.[0]));els.importText.addEventListener("input",()=>{updateImportCharCount();debouncedImportAnalyze()});els.reanalyzeImportBtn.addEventListener("click",analyzeImportText);els.clearImportBtn.addEventListener("click",()=>{els.importText.value="";els.importFileName.textContent="尚未选择文件";state.importAnalysis=null;updateImportCharCount();renderImportAnalysis(null)});els.importApplyBtn.addEventListener("click",applyMarkdownImport);$$('.example-tabs button').forEach(b=>b.addEventListener('click',()=>{state.exampleTab=b.dataset.exampleTab;renderExamplePanel()}));els.loadExampleBtn.addEventListener("click",()=>{els.importText.value=state.exampleTab==='wrong'?WRONG_MD_SAMPLE:state.exampleTab==='rules'?CORRECT_MD_SAMPLE:CORRECT_MD_SAMPLE;els.importFileName.textContent=state.exampleTab==='wrong'?'错误案例.md':'正确案例.md';analyzeImportText()});
    $$(".detail-tabs button").forEach(b=>b.addEventListener("click",()=>{state.detailTab=b.dataset.tab;renderDetails()}));els.editTileBtn.addEventListener("click",openTileProfileForm);els.deleteTileBtn.addEventListener("click",()=>openDeleteModal("tile"));els.openDossierBtn.addEventListener("click",openDossierWorkspace);els.openRangeEditorBtn.addEventListener("click",()=>openRangeEditor());els.closeDossierBtn.addEventListener("click",closeDossierWorkspace);els.editDossierBtn.addEventListener("click",openTileProfileForm);els.dossierLocateBtn.addEventListener("click",()=>{const tile=activeTile();if(!tile)return;closeDossierWorkspace();animateCameraTo(cellCenter(tile.gx),cellCenter(tile.gy),Math.max(state.camera.zoom,.88),()=>{state.flippedCell=tile.key;scheduleRender()})});els.copyPromptBtn.addEventListener("click",()=>{const tile=activeTile();if(!tile)return;const profile=tileProfileFor(tile.key,tile.items),main=selectedTileMain(tile.items);copyText(makePrompt(profile,tile,main),"绘图提示已复制")});els.copyBriefBtn.addEventListener("click",()=>{const tile=activeTile();if(!tile)return;const profile=tileProfileFor(tile.key,tile.items),main=selectedTileMain(tile.items);copyText(makeArtBrief(profile,tile,main),"美术简报已复制")});$$('[data-dossier-tab]').forEach(b=>b.addEventListener('click',()=>{state.dossierTab=b.dataset.dossierTab;renderDossierWorkspace()}));els.tileProfileForm.addEventListener("submit",saveTileProfileForm);els.tilePlayerReachable.addEventListener("change",togglePlayerFields);els.objectForm.addEventListener("submit",saveObjectForm);els.deleteObjectBtn.addEventListener("click",()=>{const id=els.formObjectId.value;if(id){closeModal("objectModal");openDeleteModal("object",id)}});els.formGeometry.addEventListener("change",updateGeometryRangeHint);els.exportPatchBtn.addEventListener("click",()=>exportPatch(false));els.finishRoundBtn.addEventListener("click",()=>exportPatch(true));els.roundKeepBtn.addEventListener("click",()=>{state.pendingRoundExport=null;closeModal("roundModal");toast("已保留本轮更改","可继续编辑或稍后完成本轮")});els.roundArchiveBtn.addEventListener("click",archiveCurrentRound);els.openChangesTab.addEventListener("click",showChanges);els.openTrashTab.addEventListener("click",openTrash);els.clearTrashBtn.addEventListener("click",clearTrash);els.trashRetentionSelect.addEventListener("change",()=>{state.trashRetentionDays=Number(els.trashRetentionSelect.value)||0;const removed=cleanupExpiredTrash(true);renderTrash();persist();updateHeader();if(!removed)toast("回收站保留规则已更新",state.trashRetentionDays?`自动清理超过${state.trashRetentionDays}天的内容`:"永久保留")});els.openSpecTab.addEventListener("click",showSpecs);els.checkUpdateBtn.addEventListener("click",()=>checkUpdate(false));els.closeFlipBtn.addEventListener("click",()=>{state.flippedCell=null;scheduleRender()});if(els.clearSpatialFocusBtn)els.clearSpatialFocusBtn.addEventListener("click",()=>{state.spatialFocusArmed=false;state.selectedCell=null;state.selectedId=null;state.flippedCell=null;renderDetails();renderSidebar();scheduleRender();persist();toast("已退出区域聚焦","地图恢复完整显示")});
    els.closeRangeEditorBtn.addEventListener("click",closeRangeEditor);els.rangeSaveBtn.addEventListener("click",saveRangeEditor);els.rangeUndoBtn.addEventListener("click",undoRange);els.rangeResetBtn.addEventListener("click",resetRange);els.rangeFitBtn.addEventListener("click",fitRangeEditor);els.createAreaObjectBtn.addEventListener("click",()=>createSpatialObject("area"));els.createFieldObjectBtn.addEventListener("click",()=>createSpatialObject("field"));$$('[data-range-tool]').forEach(b=>b.addEventListener('click',()=>setRangeTool(b.dataset.rangeTool)));els.rangeSnapSelect.addEventListener("change",()=>{state.rangeEditor.snap=Number(els.rangeSnapSelect.value)||10});els.rangeShape.addEventListener("change",()=>convertRangeShape(els.rangeShape.value));els.rangeKind.addEventListener("change",()=>{const o=currentRangeObject();if(o)els.rangeObjectBadge.textContent=`${els.rangeKind.value==='field'?'作用域':'面积'} · ${o.name}`;drawRangeEditor()});els.rangeEvidence.addEventListener("change",()=>{if(state.rangeEditor.draft){state.rangeEditor.draft.evidence=els.rangeEvidence.value;renderRangeAnalysis();drawRangeEditor()}});[els.rangeCenterX,els.rangeCenterY,els.rangeWidth,els.rangeHeight,els.rangeRadius].forEach(x=>x.addEventListener("input",updateRangeFromInputs));els.rangePoints.addEventListener("change",updateRangePoints);els.rangeViewport.addEventListener("pointerdown",rangePointerDown);els.rangeViewport.addEventListener("pointermove",rangePointerMove);els.rangeViewport.addEventListener("pointerup",rangePointerUp);els.rangeViewport.addEventListener("pointercancel",rangePointerUp);els.rangeViewport.addEventListener("click",rangeCanvasClick);els.rangeViewport.addEventListener("dblclick",rangeCanvasDblClick);els.rangeViewport.addEventListener("wheel",rangeWheel,{passive:false});
    $$('[data-close-modal]').forEach(x=>x.addEventListener("click",()=>closeModal(x.dataset.closeModal)));
    els.drillAddBtn.addEventListener("click",()=>{if(!state.drillCell)return;const b=cellBounds(state.drillCell.gx,state.drillCell.gy);closeModal("drillModal");openObjectForm(null,{x:b.cx,y:b.cy})});
    els.innerGrid.addEventListener("mousemove",e=>{if(!state.drillCell)return;const r=els.innerGrid.getBoundingClientRect(),b=cellBounds(state.drillCell.gx,state.drillCell.gy),x=b.west+(e.clientX-r.left)/r.width*100,y=b.north-(e.clientY-r.top)/r.height*100;els.innerCoord.textContent=coordText(Math.round(x),Math.round(y))});
    els.innerGrid.addEventListener("dblclick",e=>{if(!state.drillCell||e.target.closest(".inner-point"))return;const r=els.innerGrid.getBoundingClientRect(),b=cellBounds(state.drillCell.gx,state.drillCell.gy),x=Math.round((b.west+(e.clientX-r.left)/r.width*100)*10)/10,y=Math.round((b.north-(e.clientY-r.top)/r.height*100)*10)/10;closeModal("drillModal");openObjectForm(null,{x,y})});
    els.viewport.addEventListener("wheel",e=>{e.preventDefault();setZoom(state.camera.zoom*(e.deltaY>0?.86:1.16),{x:e.clientX,y:e.clientY})},{passive:false});
    els.viewport.addEventListener("pointerdown",e=>{if(e.button!==0||e.target.closest("button,input,select,textarea"))return;const tile=e.target.closest(".tile");state.pan={active:true,moved:false,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,startCameraX:state.camera.x,startCameraY:state.camera.y,downTile:tile?{key:tile.dataset.cell,gx:Number(tile.dataset.gx),gy:Number(tile.dataset.gy)}:null};els.viewport.setPointerCapture(e.pointerId);els.viewport.classList.add("dragging")});
    els.viewport.addEventListener("pointermove",e=>{const w=screenToWorld(e.clientX,e.clientY);els.coordStatus.textContent=`鼠标 ${coordText(Math.round(w.x),Math.round(w.y))}`;if(!state.pan.active)return;const dx=e.clientX-state.pan.startX,dy=e.clientY-state.pan.startY;if(Math.hypot(dx,dy)>4)state.pan.moved=true;const s=scale();state.camera.x=state.pan.startCameraX-dx/s;state.camera.y=state.pan.startCameraY+dy/s;scheduleRender()});
    const endPan=e=>{if(!state.pan.active)return;const wasMoved=state.pan.moved,downTile=state.pan.downTile;if(wasMoved){state.suppressClickUntil=Date.now()+160}else if(downTile){const now=Date.now(),isDouble=state.lastTileTap.key===downTile.key&&now-state.lastTileTap.time<330;state.suppressClickUntil=now+180;if(isDouble){state.lastTileTap={key:null,time:0};openDrill(downTile.gx,downTile.gy)}else{state.lastTileTap={key:downTile.key,time:now};state.spatialFocusArmed=true;state.selectedCell=downTile.key;state.flippedCell=state.flippedCell===downTile.key?null:downTile.key;renderDetails();scheduleRender()}}state.pan.active=false;els.viewport.classList.remove("dragging");try{els.viewport.releasePointerCapture(e.pointerId)}catch{}persist()};els.viewport.addEventListener("pointerup",endPan);els.viewport.addEventListener("pointercancel",endPan);
    document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(!els.rangeWorkspace.classList.contains("hidden")){closeRangeEditor();return}if(!els.importWorkspace.classList.contains("hidden")){closeImportWorkspace();return}$$(".modal:not(.hidden)").forEach(m=>m.classList.add("hidden"));state.flippedCell=null;scheduleRender()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();if(!els.rangeWorkspace.classList.contains("hidden"))saveRangeEditor();else exportPatch(false)}})
  }

  init();
  setTimeout(()=>checkUpdate(true),1400);
})();
