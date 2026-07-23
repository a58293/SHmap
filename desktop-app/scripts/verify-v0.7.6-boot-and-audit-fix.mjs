import fs from "node:fs";
import assert from "node:assert/strict";

for (const path of ["public/app/app.js","dist/app/app.js"]) {
  const app=fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
  assert.ok(app.includes("function analyzeImportText(){\n"),`${path} 分析函数不是安全的多行结构`);
  assert.ok(app.includes("applyImportPolicyToAnalysis(parseMarkdown(text))"),`${path} 没有使用原始正文校验`);
  assert.ok(!app.includes("applyImportPolicyToAnalysis(parseMarkdown(normalizeNineSectionMarkdown(text)))"),`${path} 仍在审核前改写正文`);
  assert.ok(!app.includes("// v0.7.6 审核正文必须先按原文校验"),`${path} 仍包含会吞掉单行代码的注释`);
  assert.ok(app.includes('window.__SHJ_APP_RUNTIME_INFO__={version:"0.7.6"'),`${path} 缺少运行时结束标记`);
}
console.log("v0.7.6 主程序启动与审核正文校验修正通过。");
