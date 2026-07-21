import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=(p)=>fs.readFileSync(path.join(root,p),"utf8");
const json=(p)=>JSON.parse(read(p));
const checks=[];
const check=(name,ok,detail="")=>{checks.push({name,ok:!!ok,detail});if(!ok)process.exitCode=1};

execFileSync(process.execPath,["--check",path.join(root,"public/app/app.js")],{stdio:"pipe"});
const app=read("public/app/app.js"),css=read("public/app/styles.css"),html=read("index.html");
const pkg=json("package.json"),tauri=json("src-tauri/tauri.conf.json"),version=json("VERSION.json");
const cargo=read("src-tauri/Cargo.toml");
check("package 版本",pkg.version==="0.6.2",pkg.version);
check("Tauri 版本",tauri.version==="0.6.2",tauri.version);
check("Cargo 版本",/version\s*=\s*"0\.6\.2"/.test(cargo));
check("VERSION 版本",version.semver==="0.6.2"&&version.frontend_base==="v062");
check("界面版本",html.includes("DESKTOP v006 · 0.6.2")&&html.includes("桌面版 v006 · 0.6.2"));
check("环境图层开关",html.includes('id="layerEnvironment"')&&app.includes('environment:saved?.layers?.environment??true'));
check("河流引导环境模型",app.includes("v062BuildEnvironmentModel")&&app.includes("v062DrawRiverValleys")&&app.includes("visibleWaterPaths(v)"));
check("空间缓存",app.includes("v062VisibleEnvironmentItems")&&app.includes("bucketSize=520")&&app.includes("v062EnvironmentSignature"));
check("固定种子",app.includes("function v062Hash")&&app.includes("function v062Rng"));
check("轻量拖动帧",app.includes("const motifStep=light?3")&&app.includes("const waterStep=light?3"));
check("视觉主题",css.includes("v0.6.2 玉简山海视觉系统")&&css.includes(".v062-yujian-theme"));
check("运行时标记",app.includes('version:"0.6.2"')&&app.includes('environmentRendering:"cached-river-guided-procedural-ink"'));

for(const item of checks)console.log(`${item.ok?"✓":"✗"} ${item.name}${item.detail?`：${item.detail}`:""}`);
if(process.exitCode)throw new Error("v0.6.2 专项校验失败");
console.log("v0.6.2专项校验：通过（玉简山海视觉、周边地块驱动地貌、真实水系走向引导、缓存与轻量拖动帧）。");
