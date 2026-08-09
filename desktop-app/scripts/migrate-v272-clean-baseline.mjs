import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s,"utf8");
const exists=p=>fs.existsSync(path.join(root,p));

const baseline=JSON.parse(read("config/v272-baseline.json"));
if(baseline.dataVersion!=="v272-r0002"||baseline.formalObjectCount!==624||baseline.boardOccupiedCellCount!==497){
  throw new Error("V272 clean baseline 配置异常，停止修改");
}
const version=JSON.parse(read("VERSION.json"));
if(version.data_version!==baseline.dataVersion){
  throw new Error(`请先覆盖本包 VERSION.json；当前 ${version.data_version||"未知"}，需要 ${baseline.dataVersion}`);
}

function replaceJsFunction(source,signature,replacement){
  const start=source.indexOf(signature);
  if(start<0)throw new Error(`未找到函数：${signature}`);
  const brace=source.indexOf("{",start);
  if(brace<0)throw new Error(`函数缺少函数体：${signature}`);
  let depth=0,end=-1,inSingle=false,inDouble=false,inTemplate=false,escape=false,lineComment=false,blockComment=false;
  for(let i=brace;i<source.length;i++){
    const c=source[i],n=source[i+1];
    if(lineComment){if(c==="\n")lineComment=false;continue}
    if(blockComment){if(c==="*"&&n==="/"){blockComment=false;i++}continue}
    if(escape){escape=false;continue}
    if((inSingle||inDouble||inTemplate)&&c==="\\"){escape=true;continue}
    if(!inSingle&&!inDouble&&!inTemplate){
      if(c==="/"&&n==="/"){lineComment=true;i++;continue}
      if(c==="/"&&n==="*"){blockComment=true;i++;continue}
    }
    if(!inDouble&&!inTemplate&&c==="'" ){inSingle=!inSingle;continue}
    if(!inSingle&&!inTemplate&&c==='"'){inDouble=!inDouble;continue}
    if(!inSingle&&!inDouble&&c==="`"){inTemplate=!inTemplate;continue}
    if(inSingle||inDouble||inTemplate)continue;
    if(c==="{")depth++;
    else if(c==="}"){depth--;if(depth===0){end=i+1;break}}
  }
  if(end<0)throw new Error(`无法确定函数结尾：${signature}`);
  return source.slice(0,start)+replacement+source.slice(end);
}

const appPath="public/app/app.js";
let app=read(appPath);

if(!app.includes("const BOARD_LAYOUT = window.SHJ_BOARD_LAYOUT")){
  const marker='  const STORAGE_KEY = "shj_infinite_tile_demo_v018_v031";';
  const at=app.indexOf(marker);
  if(at<0)throw new Error("无法定位 STORAGE_KEY");
  app=app.slice(0,at)+'  const BOARD_LAYOUT = window.SHJ_BOARD_LAYOUT || {schemaVersion:"",occupiedCells:[]};\n'+app.slice(at);
}

const migrateReplacement=`function migrateWorkspaceObjects(savedState){
    const master=structuredClone(INITIAL.objects||[]);
    if(!savedState?.objects?.length)return master;
    const savedById=new Map(savedState.objects.map(object=>[object.id,object]));
    const localKeys=["dossier","childHierarchy","waterHierarchy","images","imageUrl","imageSource","imageCopyright","updatedAt","createdAt","notesLocal"];
    const merged=master.map(object=>{
      const local=savedById.get(object.id),next={...object};
      if(local)for(const key of localKeys)if(Object.prototype.hasOwnProperty.call(local,key))next[key]=structuredClone(local[key]);
      return next
    });
    const masterIds=new Set(master.map(object=>object.id));
    savedState.objects.filter(object=>object?.rowRef==="NEW"||!masterIds.has(object.id)).forEach(object=>merged.push(object));
    return merged
  }`;
app=replaceJsFunction(app,"function migrateWorkspaceObjects(savedState)",migrateReplacement);

const exactReplacements=[
  [
    '  function isTileVisibleObject(object){return !!object&&objectMapRole(object)==="entity"&&object.tileVisible!==false}',
    '  function hasOfficialBoardPlacement(object){return !!object?.boardPlacement?.officialFormalObject&&Number.isFinite(Number(object?.boardPlacement?.gx))&&Number.isFinite(Number(object?.boardPlacement?.gy))}\n  function isTileVisibleObject(object){if(!object)return false;if(hasOfficialBoardPlacement(object))return true;return objectMapRole(object)==="entity"&&object.tileVisible!==false}'
  ],
  [
    '  function hideConvertedWaterTile(object){return !state.waterConversionAudit&&["water-line","water-area"].includes(objectDisplayMode(object))&&waterDisplayDecision(object).confirmed}',
    '  function hideConvertedWaterTile(object){if(hasOfficialBoardPlacement(object))return false;return !state.waterConversionAudit&&["water-line","water-area"].includes(objectDisplayMode(object))&&waterDisplayDecision(object).confirmed}'
  ],
  [
    '  function isDefaultIndexObject(object){return ["entity","collection"].includes(objectMapRole(object))}',
    '  function isDefaultIndexObject(object){return hasOfficialBoardPlacement(object)||["entity","collection"].includes(objectMapRole(object))}'
  ],
  [
    '  function isGlobalAreaVisibleObject(object){return ["entity","collection"].includes(objectMapRole(object))}',
    '  function isGlobalAreaVisibleObject(object){if(hasOfficialBoardPlacement(object)&&object.boardPlacement.metric===false)return false;return ["entity","collection"].includes(objectMapRole(object))}'
  ],
  [
    '  function isGlobalLineVisibleObject(object){return ["entity","collection","path"].includes(objectMapRole(object))}',
    '  function isGlobalLineVisibleObject(object){if(hasOfficialBoardPlacement(object)&&object.boardPlacement.metric===false)return false;return ["entity","collection","path"].includes(objectMapRole(object))}'
  ],
  [
    '  function objectRoleBadgeHTML(object){return isTileVisibleObject(object)?"":`<span class="object-role-badge ${esc(objectMapRole(object))}">${esc(objectRoleLabel(object))}</span>`}',
    '  function objectRoleBadgeHTML(object){return objectMapRole(object)==="entity"?"":`<span class="object-role-badge ${esc(objectMapRole(object))}">${esc(objectRoleLabel(object))}</span>`}'
  ],
  [
    '  function objectCell(o){return {gx:cellIndex(Number(o.x)||0),gy:cellIndex(Number(o.y)||0)}}',
    '  function objectBoardPlacement(o){const b=o?.boardPlacement;if(!b||!Number.isFinite(Number(b.gx))||!Number.isFinite(Number(b.gy)))return null;return b}\n  function objectCanvasPoint(o){const b=objectBoardPlacement(o);if(b)return {x:Number(b.canvasX??Number(b.gx)*CELL_LI)||0,y:Number(b.canvasY??Number(b.gy)*CELL_LI)||0};return {x:Number(o?.x)||0,y:Number(o?.y)||0}}\n  function objectCell(o){const b=objectBoardPlacement(o);if(b)return {gx:Number(b.gx),gy:Number(b.gy)};return {gx:cellIndex(Number(o?.x)||0),gy:cellIndex(Number(o?.y)||0)}}'
  ]
];
for(const [oldText,newText] of exactReplacements){
  if(app.includes(oldText))app=app.replace(oldText,newText);
  else if(!app.includes(newText))throw new Error(`未找到预期代码片段：${oldText.slice(0,80)}...`);
}

const anchorReplacement=`function objectAnchor(o){
    const board=objectBoardPlacement(o);if(board)return objectCanvasPoint(o);
    if(o?.geometryType==="line"&&o.path?.length){const pts=o.path,idx=Math.floor((pts.length-1)/2);if(pts.length%2)return {x:Number(pts[idx][0])||0,y:Number(pts[idx][1])||0};return {x:(Number(pts[idx][0])+Number(pts[idx+1][0]))/2||0,y:(Number(pts[idx][1])+Number(pts[idx+1][1]))/2||0}}
    if(o?.area){const a=o.area;if(a.shape==="circle")return {x:Number(a.cx??o.x)||0,y:Number(a.cy??o.y)||0};if(a.shape==="polygon"&&a.points?.length){const n=a.points.length;return {x:a.points.reduce((s,p)=>s+(Number(p[0])||0),0)/n,y:a.points.reduce((s,p)=>s+(Number(p[1])||0),0)/n}}const b=rangeBounds(a);return {x:(b.west+b.east)/2,y:(b.south+b.north)/2}}
    return {x:Number(o?.x)||0,y:Number(o?.y)||0};
  }`;
app=replaceJsFunction(app,"function objectAnchor(o)",anchorReplacement);

const hierarchyReplacement=`function v052Hierarchy(){
    const p=state.perf;if(p.hierarchyRevision===state.objectRevision&&p.hierarchy)return p.hierarchy;
    const hierarchyObjects=tileVisibleObjects(),objectById=new Map(hierarchyObjects.map(o=>[o.id,o]));
    const seedRegions=Array.isArray(HIERARCHY_SEED.regions)?HIERARCHY_SEED.regions:[];
    const regions=seedRegions.map(seed=>{
      const memberObjectIds=(seed.memberObjectIds||[]).filter(id=>objectById.has(id)),members=memberObjectIds.map(id=>objectById.get(id));
      const points=members.map(objectCanvasPoint),bounds=points.length?{minX:Math.min(...points.map(x=>x.x)),maxX:Math.max(...points.map(x=>x.x)),minY:Math.min(...points.map(x=>x.y)),maxY:Math.max(...points.map(x=>x.y))}:structuredClone(seed.bounds||{minX:0,maxX:0,minY:0,maxY:0});
      const center=points.length?{x:points.reduce((s,x)=>s+x.x,0)/points.length,y:points.reduce((s,x)=>s+x.y,0)/points.length}:structuredClone(seed.center||{x:0,y:0});
      return {...structuredClone(seed),memberObjectIds,objectCount:memberObjectIds.length,bounds,center,centerX:center.x,centerY:center.y}
    });
    const regionById=new Map(regions.map(r=>[r.id,r])),worldBounds=ensureObjectIndexes().bounds||{minX:0,maxX:0,minY:0,maxY:0};
    const world={...(structuredClone(HIERARCHY_SEED.world||{})),id:HIERARCHY_SEED.world?.id||"world-shanhaijing",name:HIERARCHY_SEED.world?.name||"山海经世界",type:"world",origin:HIERARCHY_SEED.world?.origin||{name:"都广之野",x:0,y:0},unit:"里",mainGridLi:CELL_LI,innerGridLi:10,childRegionIds:(HIERARCHY_SEED.world?.childRegionIds||[]).filter(id=>regionById.has(id)),bounds:worldBounds,objectCount:hierarchyObjects.length,status:"frozen-v272"};
    const macroRegions=regions.filter(r=>r.level===1),detailRegions=regions.filter(r=>r.level===2),unassignedId=HIERARCHY_SEED.unassignedRegionId||"region-unassigned";
    const assigned=new Set(regions.filter(r=>r.level===2&&r.id!==unassignedId).flatMap(r=>r.memberObjectIds||[]));
    const hierarchy={schemaVersion:HIERARCHY_SEED.schemaVersion||"world-region-place-1.0",world,regions,unassignedRegionId:unassignedId,stats:{macroRegionCount:macroRegions.length,regionCount:detailRegions.length,assignedObjectCount:assigned.size,unassignedObjectCount:hierarchyObjects.length-assigned.size,historicalRecordCount:state.objects.length},V272_SEEDED_HIERARCHY:true};
    p.hierarchyRevision=state.objectRevision;p.hierarchy=hierarchy;p.regionById=regionById;p.regionFocusKey="";p.regionFocus=null;return hierarchy;
  }`;
app=replaceJsFunction(app,"function v052Hierarchy()",hierarchyReplacement);

app=app.replace('    dataVersion: INITIAL.metadata?.dataVersion || saved?.dataVersion || "v125-r0001",','    dataVersion: INITIAL.metadata?.dataVersion || saved?.dataVersion || "v272-r0002",');

write(appPath,app);

// Desktop bootstrap: hydrate the compiled board layout too.
const bootPath="src/desktop-bootstrap.js";
let boot=read(bootPath);
const oldRequired='const required=["SHJ_INITIAL_DATA","SHJ_WATER_PATHS","SHJ_WORLD_HIERARCHY","SHJ_ORIGINAL_LIBRARY","SHJ_SPEC_SUMMARY"];';
const newRequired='const required=["SHJ_INITIAL_DATA","SHJ_WATER_PATHS","SHJ_WORLD_HIERARCHY","SHJ_ORIGINAL_LIBRARY","SHJ_SPEC_SUMMARY","SHJ_BOARD_LAYOUT"];';
if(boot.includes(oldRequired))boot=boot.replace(oldRequired,newRequired);
else if(!boot.includes('"SHJ_BOARD_LAYOUT"'))throw new Error("desktop-bootstrap.js 无法加入 SHJ_BOARD_LAYOUT");

// Ensure the Stage4 version-aware fallback remains present.
if(!boot.includes("function snapshotDataVersion(")){
  const marker="function hydratePrivateMapBundle(payload){";
  const at=boot.indexOf(marker);
  if(at<0)throw new Error("无法定位 hydratePrivateMapBundle");
  const helper='function snapshotDataVersion(value){try{const parsed=typeof value==="string"?JSON.parse(value):value;return String(parsed?.dataVersion||"")}catch{return ""}}\nfunction preferredStartupFallback(legacy,seed){const seedVersion=snapshotDataVersion(seed);if(usableWorkspaceSnapshot(legacy)&&snapshotDataVersion(legacy)===seedVersion)return{payload:legacy,source:"local-cache-fallback"};return{payload:seed,source:"private-repo-seed-fallback"}}\n';
  boot=boot.slice(0,at)+helper+boot.slice(at);
}
const oldFallback='      const fallback=usableWorkspaceSnapshot(legacy)?legacy:seed;\n      localStorage.setItem(STORAGE_KEY,fallback);\n      bootInfo={source:usableWorkspaceSnapshot(legacy)?"local-cache-fallback":"private-repo-seed-fallback",snapshot:fallback,objectCount:JSON.parse(fallback).objects.length,databasePath:""};';
const newFallback='      const selectedFallback=preferredStartupFallback(legacy,seed),fallback=selectedFallback.payload;\n      localStorage.setItem(STORAGE_KEY,fallback);\n      bootInfo={source:selectedFallback.source,snapshot:fallback,objectCount:JSON.parse(fallback).objects.length,databasePath:""};';
if(boot.includes(oldFallback))boot=boot.replace(oldFallback,newFallback);
write(bootPath,boot);

// Compact verification chain.
const pkg=JSON.parse(read("package.json"));
pkg.scripts={
  dev:"vite",
  build:"vite build",
  preview:"vite preview",
  tauri:"tauri",
  "desktop:dev":"tauri dev",
  "desktop:build":"tauri build",
  "import:master":"node scripts/import-master-v053.mjs",
  "data:private":"node scripts/build-private-map-bundle.mjs",
  verify:"npm run build && npm run verify:architecture && npm run verify:v272-data && npm run verify:critical && npm run verify:release",
  "verify:architecture":"node scripts/verify-clean-architecture.mjs",
  "verify:v272-data":"node scripts/verify-v272-board.mjs",
  "verify:critical":"node scripts/verify-critical-features.mjs",
  "verify:release":"node scripts/verify-release-baseline.mjs"
};
write("package.json",JSON.stringify(pkg,null,2)+"\n");

// Delete obsolete CI scaffolding. Git history remains the archive.
const obsoleteNames=new Set([
  "verify-project.mjs",
  "verify-private-architecture-consistency.mjs",
  "verify-github-auth-stage1.mjs",
  "verify-github-private-data-stage2.mjs",
  "verify-github-private-submissions-stage3.mjs",
  "verify-v272-private-map.mjs",
  "apply-v272-upgrade.mjs",
  "apply-v272-ci-baseline-fix.mjs"
]);
const scriptsDir=path.join(root,"scripts");
let removed=[];
for(const name of fs.readdirSync(scriptsDir)){
  const historical=/^verify-v(?:0|1)\./.test(name);
  const obsolete=obsoleteNames.has(name)||historical;
  if(!obsolete)continue;
  const full=path.join(scriptsDir,name);
  if(fs.statSync(full).isFile()){fs.unlinkSync(full);removed.push(name)}
}

console.log("V272 Clean Baseline 已应用。");
console.log("核心变化：624个正式R号按《坐标棋盘图》位置显示；水系不再吞掉正式位置锚点；区域层级改用V272种子；历史verify链已移除。");
console.log(`删除历史验证/迁移脚本：${removed.length} 个`);
console.log("现在运行：npm run verify");
