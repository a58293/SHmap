import fs from "node:fs";
import assert from "node:assert/strict";
const read=p=>fs.readFileSync(new URL(`../${p}`,import.meta.url),"utf8");
const pkg=JSON.parse(read("package.json"));
const tauri=JSON.parse(read("src-tauri/tauri.conf.json"));
const version=JSON.parse(read("VERSION.json"));
assert.equal(pkg.version,"0.8.5");
assert.equal(tauri.version,"0.8.5");
assert.equal(version.semver,"0.8.5");
assert.ok(read("index.html").includes("DESKTOP v008 · 0.8.5"));
assert.ok(read("dist/index.html").includes("DESKTOP v008 · 0.8.5"));
assert.ok(read("index.html").includes('/app/object-roles.js'));
assert.ok(read("dist/index.html").includes('/app/object-roles.js'));
for(const p of ["public/app/object-roles.js","dist/app/object-roles.js"]){
  const s=read(p);
  assert.ok(s.includes('release: "0.8.0"'));
  assert.ok(s.includes('semanticKey: "hai-nei-jing:jiu-qiu:collection"'));
}
for(const p of ["public/app/app.js","dist/app/app.js"]){
  const s=read(p);
  assert.ok(s.includes('window.__SHJ_APP_RUNTIME_INFO__={version:"0.8.5"'));
  assert.ok(s.includes('linkReason:"tile-content"'));
  assert.ok(s.includes("九段式"));
}
for(const p of ["public/app/styles.css","dist/app/styles.css"]){
  const s=read(p);
  assert.ok(s.includes("详细页分类每行最多3列最终修正"));
  assert.ok(s.includes("grid-template-columns:repeat(3,minmax(0,1fr))!important"));
}
assert.ok(read("public/app/app.js").includes("function v050DiscardRoundChanges"));
assert.ok(read("public/app/app.js").includes('id="v050DiscardRound"'));
assert.ok(read("public/app/styles.css").includes(".left-panel .search-hit strong"));
assert.ok(read("public/app/styles.css").includes(".left-panel::after{content:none!important;display:none!important;background:none!important;opacity:0!important}"));
assert.ok(read("src/desktop-bootstrap.js").includes("createBackup:async label"));
console.log("v0.8.5 正式版本校验通过。");
