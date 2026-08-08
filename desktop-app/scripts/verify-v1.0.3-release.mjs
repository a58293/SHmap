import fs from "node:fs";
import assert from "node:assert/strict";
const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const pkg=JSON.parse(read("package.json")),tauri=JSON.parse(read("src-tauri/tauri.conf.json")),version=JSON.parse(read("VERSION.json"));
assert.equal(pkg.version,"1.0.3");assert.equal(tauri.version,"1.0.3");assert.equal(version.semver,"1.0.3");assert.equal(version.app_version,"v010");
assert.ok(read("src-tauri/Cargo.toml").includes('version = "1.0.3"'));assert.ok(read("src-tauri/src/lib.rs").includes('edition: "v010"'));
for(const path of ["index.html","dist/index.html"])assert.ok(read(path).includes("DESKTOP v010 · 1.0.3"));
for(const path of ["public/app/app.js","dist/app/app.js"])assert.ok(read(path).includes('window.__SHJ_APP_RUNTIME_INFO__={version:"1.0.3"'));
console.log("v1.0.3 正式版本校验通过。");
