import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const readJson=p=>JSON.parse(read(p));

const pkg=readJson("package.json");
const version=readJson("VERSION.json");
const tauri=readJson("src-tauri/tauri.conf.json");
const release=readJson("src-tauri/tauri.release.conf.json");
const cargo=read("src-tauri/Cargo.toml");
const cargoVersion=cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1];

assert.equal(version.semver,pkg.version,"VERSION.semver 与 package.version 不一致");
assert.equal(tauri.version,pkg.version,"tauri.conf version 与 package.version 不一致");
assert.equal(cargoVersion,pkg.version,"Cargo version 与 package.version 不一致");
assert.equal(release.bundle?.createUpdaterArtifacts,true,"正式发布必须生成 updater artifacts");

const endpoints=tauri.plugins?.updater?.endpoints||[];
assert.ok(endpoints.length>=2,"更新器应保留多线路");
assert.ok(tauri.plugins?.updater?.pubkey,"更新签名公钥缺失");
assert.ok(cargo.includes('tauri-plugin-updater = "2"'),"Rust updater 插件缺失");

console.log(`PASS release baseline: desktop ${pkg.version}, updater sources=${endpoints.length}.`);
