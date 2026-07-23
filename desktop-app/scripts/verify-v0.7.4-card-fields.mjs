import fs from "node:fs";
const app=fs.readFileSync(new URL("../public/app/app.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../public/app/styles.css",import.meta.url),"utf8");
const cardBlock=(app.match(/function briefMuseumObjectHTML\(o,cat\)\{[\s\S]*?\n  \}/)||[""])[0];
const drawerBlock=(app.match(/function openIdentityObjectDrawer\(id\)\{[\s\S]*?overlay\.classList\.remove\('hidden'\)\n  \}/)||[""])[0];
const checks=[
  ["Markdown字段不回退母表",/localRelation:e\.localRelation\|\|"",coreFeatures:e\.coreFeatures\|\|""/.test(app)&&/evidence:e\.evidence\|\|""/.test(app)],
  ["空分类过滤",/filter\(cat=>cat\.objects\.length\)/.test(app)&&/if\(!total\)return ""/.test(app)],
  ["字段编号显示",/index\+1/.test(cardBlock)&&/与本地关系/.test(cardBlock)&&/核心特征/.test(cardBlock)&&/出自/.test(cardBlock)],
  ["卡片证据仅取经篇",/cardScriptureSource/.test(cardBlock)&&!/evidenceTextForObject\(o\)/.test(cardBlock)&&!/\["证据"/.test(cardBlock)],
  ["审计信息下沉详细",/资料审核／证据等级/.test(drawerBlock)&&/evidenceTextForObject\(o\)/.test(drawerBlock)],
  ["对象详情读取Markdown条目",/function dossierObjectEntryFields/.test(app)&&/resolved\?\.id===o\.id/.test(app)&&/normalizeDossierImportName\(entry\?\.name\)===objectName/.test(app)],
  ["对象详情核心特征优先Markdown",/imported\.coreFeatures/.test(drawerBlock)&&/imported\.hasImported\?"":\(o\.coreFeatures\|\|objectCoreText\(o\)\)/.test(drawerBlock)],
  ["对象详情显示Markdown出处",/dossierEvidenceSourceText/.test(app)&&/\["出自",importedSource\]/.test(drawerBlock)],
  ["经篇链接生成",/data-scripture-directory/.test(app)&&/chapterReferenceHTML/.test(app)],
  ["经篇目录跳转",/function openScriptureDirectory/.test(app)&&/state\.filters\.chapter=target/.test(app)],
  ["经篇链接样式",/\.scripture-directory-link/.test(css)],
  ["卡片长文限制",/-webkit-line-clamp:4/.test(css)&&/overflow:hidden/.test(css)],
  ["原文直载识别",/function isDirectOriginalRelation/.test(app)&&/function originalExcerptForEntry/.test(app)],
  ["卡片显示第07节原文",/directOriginal/.test(cardBlock)&&/\["原文",o\.originalExcerpt\]/.test(cardBlock)],
  ["对象详情显示第07节原文",/showImportedOriginal/.test(drawerBlock)&&/imported\.originalExcerpt/.test(drawerBlock)]
];
const failed=checks.filter(([,ok])=>!ok);
for(const [name,ok] of checks)console.log(`${ok?"✓":"✗"} ${name}`);
if(failed.length)process.exit(1);
