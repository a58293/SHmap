import fs from "node:fs";
import path from "node:path";

const [manifestPath,notesPath,outputPath]=process.argv.slice(2);
if(!manifestPath||!notesPath||!outputPath){
  console.error("用法：node scripts/sync-updater-manifest-notes.mjs <latest.json> <RELEASE_NOTES.md> <output.json>");
  process.exit(1);
}
const manifest=JSON.parse(fs.readFileSync(manifestPath,"utf8"));
const markdown=fs.readFileSync(notesPath,"utf8");
const plain=markdown.replace(/\r\n?/g,"\n").split("\n").map(line=>line
  .replace(/^#{1,6}\s+/,"")
  .replace(/^[-*]\s+/,"• ")
  .replace(/`([^`]+)`/g,"$1")
  .replace(/\*\*([^*]+)\*\*/g,"$1")
).join("\n").replace(/\n{3,}/g,"\n\n").trim();
if(!manifest.version||!manifest.platforms||!Object.values(manifest.platforms).every(item=>item?.signature&&item?.url))throw new Error("latest.json 缺少版本、签名或下载地址");
manifest.notes=plain;
fs.mkdirSync(path.dirname(outputPath),{recursive:true});
fs.writeFileSync(outputPath,`${JSON.stringify(manifest,null,2)}\n`,"utf8");
console.log(`已同步仓库直连更新清单：v${manifest.version}`);
