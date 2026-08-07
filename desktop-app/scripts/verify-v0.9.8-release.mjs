import fs from "node:fs";
import assert from "node:assert/strict";

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const pkg=JSON.parse(read("package.json"));
const tauri=JSON.parse(read("src-tauri/tauri.conf.json"));
const version=JSON.parse(read("VERSION.json"));
assert.equal(pkg.version,"0.9.8");
assert.equal(tauri.version,"0.9.8");
assert.equal(version.semver,"0.9.8");
assert.equal(version.app_version,"v009");
assert.ok(read("src-tauri/Cargo.toml").includes('version = "0.9.8"'));
assert.ok(read("src-tauri/src/lib.rs").includes('edition: "v009"'));
assert.ok(read("index.html").includes("DESKTOP v009 · 0.9.8"));
assert.ok(read("dist/index.html").includes("DESKTOP v009 · 0.9.8"));
assert.ok(read("public/app/app.js").includes('window.__SHJ_APP_RUNTIME_INFO__={version:"0.9.8"'));
assert.ok(read("dist/app/app.js").includes('window.__SHJ_APP_RUNTIME_INFO__={version:"0.9.8"'));
console.log("v0.9.8 正式版本校验通过。");
