import fs from "node:fs";
import assert from "node:assert/strict";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const publicApp = read("public/app/app.js");
const distApp = read("dist/app/app.js");
const rust = read("src-tauri/src/lib.rs");
const bootstrap = read("src/desktop-bootstrap.js");

for (const [label, app] of [["public", publicApp], ["dist", distApp]]) {
  assert.ok(app.includes('assetsPath: "submissions/assets"'), `${label} 缺少图片资源目录`);
  assert.ok(app.includes('const SYNC_IMAGE_PREFIX="shjasset:"'), `${label} 缺少稳定图片引用`);
  assert.ok(app.includes('crypto.subtle.digest("SHA-256",bytes)'), `${label} 缺少图片SHA-256指纹`);
  assert.ok(app.includes("preparePatchImageAssets"), `${label} 缺少更改包图片收集`);
  assert.ok(app.includes('package_version:"1.3"'), `${label} 更改包版本未升级`);
  assert.ok(app.includes("remotePayload:JSON.stringify(remotePkg,null,2)"), `${label} 缺少远程轻量更改包`);
  assert.ok(app.includes("assetPayloads:prepared.assets.map"), `${label} 缺少原生图片上传载荷`);
  assert.ok(app.includes("maxBytes=900*1024"), `${label} 缺少900KB自适应压缩目标`);
  assert.ok(app.includes('toBlob(resolve,"image/webp",quality)'), `${label} 未自动转换WebP`);
  assert.ok(app.includes("syncedImageUrl(input?.value?.trim())"), `${label} 对象图片未解析跨端资源地址`);
  assert.ok(app.includes('syncedImageUrl(String(profile?.imageUrl||"").trim())'), `${label} 地块图片未解析跨端资源地址`);
  assert.ok(app.includes("assets:meta.assetPayloads||[]"), `${label} 完成本轮时未携带图片资源`);
}

assert.ok(bootstrap.includes('invoke("publish_patch_to_github",args)'), "桌面桥接未转交图片发布参数");
assert.ok(rust.includes("struct PublishAssetInput"), "Rust缺少图片发布输入");
assert.ok(rust.includes("fn validate_publish_assets"), "Rust缺少图片资源安全校验");
assert.ok(rust.includes('format!("submissions/assets/{}", asset.file_name)'), "Rust未写入同步资源目录");
assert.ok(rust.includes("Sha256::digest(&asset.bytes)"), "Rust未复核图片指纹");
assert.ok(rust.includes("asset.bytes.len() > 2 * 1024 * 1024"), "Rust缺少单张图片大小上限");
assert.ok(rust.includes("assets.len() > 64"), "Rust缺少单轮图片数量上限");
assert.ok(rust.includes("asset_count: assets.len()"), "发布结果未返回图片数量");

console.log("v0.9.5 自动WebP与多端图片同步专项校验通过。");
