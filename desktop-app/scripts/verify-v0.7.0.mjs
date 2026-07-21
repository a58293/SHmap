import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const pkg=JSON.parse(read("package.json"));
const tauri=JSON.parse(read("src-tauri/tauri.conf.json"));
const version=JSON.parse(read("VERSION.json"));
const html=read("index.html");
const app=read("public/app/app.js");
const css=read("public/app/styles.css");
const asset="public/assets/map/shanhaijing_overview_v070.webp";
const meta=JSON.parse(read("public/assets/map/shanhaijing_overview_v070.json"));
// 不再依赖换行符和固定缩进。Windows 本地文件可能是 CRLF，GitHub Actions
// checkout 后也可能因格式化产生缩进差异；专项校验应检查语义结构，而不是逐字匹配。
const overviewBranchStart=app.search(/else\s+if\s*\(\s*state\.regionOverviewMode\s*\)\s*\{/);
const normalMapStart=app.search(/const\s+tilePhase\s*=\s*v070TileCardOpacity\s*\(\s*\)/);
const overviewBranch=overviewBranchStart>=0&&normalMapStart>overviewBranchStart
  ? app.slice(overviewBranchStart,normalMapStart)
  : "";
const overviewHasNoAreaCircles=Boolean(
  overviewBranch
  && overviewBranch.includes("drawWaterPaths")
  && !overviewBranch.includes("drawAreas")
);

const checks=[
 ["package 版本",pkg.version==="0.7.0"],
 ["Tauri 版本",tauri.version==="0.7.0"],
 ["VERSION 版本",version.semver==="0.7.0"&&version.app_version==="v007"],
 ["界面版本",html.includes("DESKTOP v007 · 0.7.0")],
 ["静态总览底图",fs.existsSync(path.join(root,asset))&&meta.objectCount===617&&meta.waterPathCount===79],
 ["世界坐标绑定",app.includes("V070_OVERVIEW_ART")&&app.includes("drawV070OverviewArt")],
 ["地块渐变",app.includes("v070TileCardOpacity")&&css.includes("--v070-tile-card-opacity")],
 ["最大地图取消区域圈",overviewHasNoAreaCircles],
 ["实时小山停用",app.includes("if (!state.precisionMode) drawV070OverviewArt(ctx)")],
 ["关系线保留",app.includes("drawV029RelationOverlay")&&css.includes("#brushTraceCanvas")],
 ["画笔轨迹实时绘制",app.includes("stroke.push({x:w.x,y:w.y});drawBrushTraceCanvas()")&&css.includes("brush-trace-active")],
 ["顶部层级修复",css.includes("z-index:200!important")&&css.includes("z-index:120!important")],
 ["山水自然入雾",app.includes("v070DrawEndlessMist")&&app.includes("v070DrawBoundaryMist")&&app.includes("destination-in")&&app.includes("v070OverviewFogStrength")],
 ["总览河流融图",app.includes("v070DrawIntegratedWater")&&app.includes("v070RiverUiStrength")&&app.includes("globalCompositeOperation=\"multiply\"")],
 ["总览隐藏河流箭头",app.includes("v070WaterArrowStrength")&&app.includes("if(state.regionOverviewMode)return 0")],
];
let bad=false;
for(const [name,ok] of checks){console.log(`${ok?"✓":"✗"} ${name}`);if(!ok)bad=true}
if(bad)process.exit(1);
console.log("v0.7.0 专项校验通过：静态地貌总览、山水自然入雾、总览隐藏河流箭头、河流融图、地块渐变、画笔轨迹与关系线。");
