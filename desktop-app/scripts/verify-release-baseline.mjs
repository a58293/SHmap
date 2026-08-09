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
const app=read("public/app/app.js");
const bootstrap=read("src/desktop-bootstrap.js");
const notes=read("RELEASE_NOTES.md");

const cargoVersion=cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1];

assert.equal(pkg.version,"1.0.6","本次正式发布版本必须为1.0.6");
assert.equal(version.semver,pkg.version,"VERSION.semver 与 package.version 不一致");
assert.equal(tauri.version,pkg.version,"tauri.conf version 与 package.version 不一致");
assert.equal(cargoVersion,pkg.version,"Cargo version 与 package.version 不一致");

assert.equal(version.data_version,"v272-r0003","正式地图数据应为v272-r0003");
assert.equal(version.object_count,624,"V272正式对象数应为624");
assert.equal(version.board_placement_count,624,"V272棋盘位置应为624");
assert.equal(version.board_occupied_cells,497,"V272正式占用格应为497");
assert.equal(version.board_background_runs,368,"V272棋盘背景色带应为368段");
assert.equal(version.board_world_labels,8,"V272世界标签应为8个");
assert.equal(version.board_annotations,129,"V272方向注记应为129个");

assert.ok(app.includes('window.__SHJ_APP_RUNTIME_INFO__={version:"1.0.6"'),"app.js运行时版本未升级到1.0.6");
assert.ok(bootstrap.includes('const DESKTOP_VERSION = "1.0.6";'),"desktop-bootstrap桌面版本未升级到1.0.6");
assert.ok(bootstrap.includes('const DESKTOP_EDITION = "v010";'),"desktop edition应保持v010");
assert.ok(bootstrap.includes("syncDesktopVersionChrome()"),"界面版本同步逻辑缺失");
assert.ok(notes.includes("# 山海经原典地图研究台 v1.0.6"),"RELEASE_NOTES未更新到1.0.6");
assert.ok(notes.includes("v272-r0003"),"RELEASE_NOTES缺少V272 r0003说明");

assert.equal(release.bundle?.createUpdaterArtifacts,true,"正式发布必须生成 updater artifacts");
const endpoints=tauri.plugins?.updater?.endpoints||[];
assert.ok(endpoints.length>=2,"更新器应保留多线路");
assert.ok(tauri.plugins?.updater?.pubkey,"更新签名公钥缺失");
assert.ok(cargo.includes('tauri-plugin-updater = "2"'),"Rust updater 插件缺失");

console.log(`PASS release baseline: desktop ${pkg.version}, data ${version.data_version}, updater sources=${endpoints.length}.`);
