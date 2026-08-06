import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const notes=fs.readFileSync(path.join(root,"RELEASE_NOTES.md"),"utf8");
const bootstrap=fs.readFileSync(path.join(root,"src","desktop-bootstrap.js"),"utf8");
const workflow=fs.readFileSync(path.join(root,".github","workflows","publish-windows-update.yml"),"utf8");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"updates","latest.json"),"utf8"));

const checks=[
  [notes.startsWith("# 山海经原典地图研究台 v0.9.6"),"更新说明标题不是 v0.9.6"],
  [notes.includes("批量应用山海经地图更改包"),"更新说明缺少本版核心功能"],
  [!notes.includes("# v0.8.7"),"更新说明仍混入旧版 v0.8.7 正文"],
  [bootstrap.includes("function renderReleaseNotes(value)"),"客户端缺少更新说明 Markdown 格式化"],
  [bootstrap.includes("notes.innerHTML=renderReleaseNotes(info.body)"),"更新窗口未使用格式化说明"],
  [workflow.includes('Get-Content "RELEASE_NOTES.md" -Raw -Encoding utf8'),"发布流程未按 UTF-8 读取更新说明"],
  [manifest.version==="0.9.6","仓库直连更新清单版本不是 v0.9.6"],
  [manifest.notes.includes("批量应用山海经地图更改包"),"仓库直连更新清单缺少本版说明"],
  [!manifest.notes.includes("# v0.8.7")&&!manifest.notes.includes("`"),"仓库直连说明仍含旧版或旧客户端无法显示的 Markdown 符号"],
  [Object.values(manifest.platforms||{}).every(item=>item.signature&&item.url),"仓库直连更新清单缺少签名或下载地址"],
];

const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const [,message] of failed)console.error(`✗ ${message}`);process.exit(1)}
console.log("v0.9.6 update notes verification passed");
