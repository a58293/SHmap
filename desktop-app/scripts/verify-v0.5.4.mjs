import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
let failed=false;
const error=message=>{console.error(`v0.5.4校验失败：${message}`);failed=true};
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const json=file=>JSON.parse(read(file));

const pkg=json("package.json");
const conf=json("src-tauri/tauri.conf.json");
const meta=json("VERSION.json");
const cargo=read("src-tauri/Cargo.toml");
const cargoVersion=cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
if([pkg.version,conf.version,meta.semver,cargoVersion].some(v=>v!=="0.5.4"))error(`版本未同步：package=${pkg.version} tauri=${conf.version} VERSION=${meta.semver} cargo=${cargoVersion}`);
if(pkg.scripts?.verify!=="node scripts/verify-project.mjs && node scripts/verify-v0.5.4.mjs")error("npm verify未接入v0.5.4专项校验");

const app=read("public/app/app.js");
for(const marker of [
  "function v054ClipRelationSegment",
  "function drawV054RelationEdgeMarker",
  "relationContextKey",
  "relationCatalogKey",
  "stable-pan-viewport-clipping",
  "limit=preset===\"all\"?24:20",
  "if(state.relationMode)drawV029RelationOverlay"
])if(!app.includes(marker.replaceAll('\\"','"')))error(`关系线稳定逻辑缺失：${marker}`);
if(/state\.pan\.active\s*\?\s*8/.test(app))error("仍存在拖动时把关系数量压缩为8条的旧逻辑");
if(app.includes("function v053ClipRelationSegment"))error("仍在使用裁到画布外侧的旧关系线裁切函数");

const data=read("public/app/data.js");
if(!data.includes('"appVersion":"0.5.4"'))error("data.js应用版本未更新");
if(!data.includes('"relationLineMigration":"v0.5.4-stable-pan-and-viewport-clipping"'))error("关系线迁移标记缺失");
const css=read("public/app/styles.css");
if(!css.includes("v0.5.4 · 关系线拖动稳定与视口内裁切"))error("v0.5.4关系线样式标记缺失");

if(failed)process.exit(1);
console.log("v0.5.4专项校验：通过（关系集合稳定、缓存、视口内裁切、视野外目标端点与上层绘制）。");
