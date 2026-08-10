import fs from "node:fs";import assert from "node:assert/strict";
const app=fs.readFileSync("public/app/app.js","utf8");
for(const token of [
  "function applyImportPolicyToAnalysis(",
  "function supplementObjectTarget(",
  "function v112BuildStoredZip(",
  "function v112DownloadRecordZip(",
  "function copyBlockedImportFiles(",
  "function copiedFileImportFromPicker(",
  "批量复制被阻止文件",
  "SHmap_被阻止_MD",
  "SHmap_导入原件副本"
]) assert.ok(app.includes(token),`缺少：${token}`);
assert.ok(!app.includes("window.showDirectoryPicker({mode:\"readwrite\"})"),"仍残留会触发 WebView2 手势错误的 showDirectoryPicker");
assert.ok(app.includes("state.importAnalysis=applyImportPolicyToAnalysis(parseMarkdown(text))"),"导入分析未接入 policy 函数");
console.log("PASS v1.1.2-r2 Markdown import + bulk copy fix.");
