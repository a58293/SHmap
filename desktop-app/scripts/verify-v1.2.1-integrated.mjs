import fs from "node:fs";
import assert from "node:assert/strict";

const read = path => fs.readFileSync(path, "utf8");
const pkg = JSON.parse(read("package.json"));
const version = JSON.parse(read("VERSION.json"));
const app = read("public/app/app.js");
const index = read("index.html");
const boot = read("src/desktop-bootstrap.js");
const rust = read("src-tauri/src/github_auth.rs");
const lib = read("src-tauri/src/lib.rs");

assert.equal(pkg.version,version.semver);assert.ok(pkg.version.localeCompare("1.2.6",undefined,{numeric:true})>=0,"发布版本不得低于1.2.6稳定基线");
assert.equal(version.data_version, "v284-r0001");
assert.ok(index.includes('id="mapSpacingModeBtn"'), "缺少紧凑/原典比例切换按钮");
assert.ok(app.includes('mapSpacingMode:saved?.mapSpacingMode'), "紧凑地图模式没有保存");
assert.ok(app.includes("compactAxisForward"), "缺少紧凑地图正向投影");
assert.ok(app.includes("compactAxisInverse"), "缺少紧凑地图反向投影");
assert.ok(app.includes("startDisplayX=compactAxisForward"), "紧凑地图拖动仍按原始坐标计算");
assert.ok(app.includes("v110CreateMinimapProjector"), "地图总览投影缺失");
assert.ok(app.includes("SYNC_IMAGE_FAILED"), "私有图片失败请求没有去重");
assert.ok(boot.includes("resolvePrivateAsset"), "桌面桥接没有暴露私有图片解析器");
assert.ok(rust.includes("pub async fn resolve_private_asset"), "Rust 缺少私有图片缓存命令");
assert.ok(rust.includes("private-image-cache"), "私有图片没有使用应用专用缓存目录");
assert.ok(rust.includes("active_authorized_token"), "私有图片下载没有经过授权会话");
assert.ok(lib.includes("github_auth::resolve_private_asset"), "私有图片命令没有注册");
assert.ok(!/function syncedImageUrl[\s\S]{0,800}raw\.githubusercontent\.com/.test(app), "私有图片仍可能匿名访问 raw URL");
console.log("PASS v1.2.1 safeguards retained by v1.2.6");
