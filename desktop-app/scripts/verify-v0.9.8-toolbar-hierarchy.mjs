import fs from "node:fs";
import path from "node:path";

const root=path.resolve(import.meta.dirname,"..");
const app=fs.readFileSync(path.join(root,"public/app/app.js"),"utf8");
const css=fs.readFileSync(path.join(root,"public/app/styles.css"),"utf8");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");

const checks=[
  [app.includes('className="v098-top-data-menu"'),"顶部存在‘数据与同步’分组"],
  [app.includes('className="v098-map-tools-menu"'),"地图存在‘地图工具’分组"],
  [app.includes('["checkUpdateBtn","batchPatchBtn","exportPatchBtn"]'),"更新、批量应用与导出集中到数据菜单"],
  [app.includes('["openSpecTab","openTutorialTab","desktopUpdateBtn","desktopBackupBtn"]'),"规格、教学和桌面功能集中到系统菜单"],
  [app.includes('v098ToolGroup("关系研究"')&&app.includes('v098ToolGroup("核对工具"')&&app.includes('v098ToolGroup("采集工具"'),"地图工具按关系、核对、采集分区"],
  [html.includes('id="isolatedObjectsBtn"')&&html.includes("孤立检查"),"孤立工具使用直观名称"],
  [css.includes(".v098-map-tools-panel")&&css.includes(".v098-top-data-menu>div"),"下拉面板具有独立清晰布局"],
];

let failed=false;
for(const [ok,label] of checks){console.log(`${ok?"✓":"✗"} ${label}`);if(!ok)failed=true}
if(failed)process.exit(1);
console.log("v0.9.8 toolbar hierarchy verification passed");
