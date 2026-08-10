import fs from "node:fs";import path from "node:path";import assert from "node:assert/strict";
const root=process.cwd(),read=p=>fs.readFileSync(path.join(root,p),"utf8"),app=read("public/app/app.js"),pkg=JSON.parse(read("package.json"));
for(const token of ["function v115OpenChangeEditor(changeId)","data-change-edit=",">处理</th>","v115OpenChangeEditor(button.dataset.changeEdit)","change.entityType===\"geometry\"","openDossierWorkspace();state.dossierMode=\"full\""])assert.ok(app.includes(token),`缺少 v1.1.5 更改记录逐项编辑标记：${token}`);
assert.equal(pkg.version,"1.1.5");assert.ok(String(pkg.scripts.verify||"").includes("verify:v115"));
console.log("PASS v1.1.5 per-change edit actions.");
