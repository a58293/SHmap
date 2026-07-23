import fs from "node:fs";
import assert from "node:assert/strict";
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),"utf8");
const pkg=JSON.parse(read("package.json"));
const tauri=JSON.parse(read("src-tauri/tauri.conf.json"));
const version=JSON.parse(read("VERSION.json"));
assert.equal(pkg.version,"0.7.6");
assert.equal(tauri.version,"0.7.6");
assert.equal(version.semver,"0.7.6");
assert.ok(read("index.html").includes("DESKTOP v007 · 0.7.6"));
assert.ok(read("dist/index.html").includes("DESKTOP v007 · 0.7.6"));
for(const p of ["public/app/app.js","dist/app/app.js"]){
  const s=read(p);
  assert.ok(s.includes('window.__SHJ_APP_RUNTIME_INFO__={version:"0.7.6"'));
  assert.ok(s.includes('linkReason:"tile-content"'));
  assert.ok(s.includes("九段式"));
}
for(const p of ["public/app/styles.css","dist/app/styles.css"]){
  const s=read(p);
  assert.ok(s.includes("详细页分类每行最多3列最终修正"));
  assert.ok(s.includes("grid-template-columns:repeat(3,minmax(0,1fr))!important"));
}
console.log("v0.7.6 正式版本校验通过。");
