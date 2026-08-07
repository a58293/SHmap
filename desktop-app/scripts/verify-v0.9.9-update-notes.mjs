import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const notes=fs.readFileSync(path.join(root,"RELEASE_NOTES.md"),"utf8");
const bootstrap=fs.readFileSync(path.join(root,"src","desktop-bootstrap.js"),"utf8");
const workflow=fs.readFileSync(path.join(root,".github","workflows","publish-windows-update.yml"),"utf8");
const syncWorkflow=fs.readFileSync(path.join(root,".github","workflows","sync-updater-manifest.yml"),"utf8");
const manifest=JSON.parse(fs.readFileSync(path.join(root,"updates","latest.json"),"utf8"));
const checks=[
  [notes.startsWith("# 山海经原典地图研究台 v0.9.9"),"更新说明标题不是 v0.9.9"],
  [notes.includes("顶部与地图工具分层")&&notes.includes("数据与同步")&&notes.includes("关系研究、核对工具、采集工具"),"更新说明缺少本版工具栏分层内容"],
  [notes.includes("主题多图图库")&&notes.includes("第06节内部条目"),"更新说明缺少上一版图库功能"],
  [bootstrap.includes("function renderReleaseNotes(value)"),"客户端缺少更新说明 Markdown 格式化"],
  [bootstrap.includes("notes.innerHTML=renderReleaseNotes(info.body)"),"更新窗口未使用格式化说明"],
  [workflow.includes('Get-Content "RELEASE_NOTES.md" -Raw -Encoding utf8'),"发布流程未按 UTF-8 读取更新说明"],
  [syncWorkflow.includes("sync-updater-manifest-notes.mjs")&&syncWorkflow.includes("updates/latest.json"),"发布后未自动同步仓库直连清单"],
  [manifest.version==="0.9.6"&&manifest.notes.includes("批量应用山海经地图更改包"),"当前已发布仓库直连清单异常"],
  [Object.values(manifest.platforms||{}).every(item=>item.signature&&item.url),"仓库直连更新清单缺少签名或下载地址"],
];
const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const [,message] of failed)console.error(`✗ ${message}`);process.exit(1)}
console.log("v0.9.9 update notes verification passed");
