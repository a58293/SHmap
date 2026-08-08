import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));
const fail = (msg) => { console.error(`✗ ${msg}`); process.exitCode = 1; };
const ok = (msg) => console.log(`✓ ${msg}`);

for (const forbidden of ["public/app/data.js", "dist/app/data.js"]) {
  if (exists(forbidden)) fail(`${forbidden} 仍存在，正式地图仍可能被打包进客户端`);
  else ok(`${forbidden} 已移除`);
}

const bootstrap = read("src/desktop-bootstrap.js");
const rustAuth = read("src-tauri/src/github_auth.rs");
const rustLib = read("src-tauri/src/lib.rs");

const checks = [
  [bootstrap.includes('invoke("load_private_map_bundle")'), "前端启动时从 Rust 请求私有地图"],
  [bootstrap.includes("hydratePrivateMapBundle"), "前端只在授权后注入地图全局数据"],
  [!bootstrap.includes('built-in-seed-fallback'), "已移除内置正式地图降级路径"],
  [rustAuth.includes("PRIVATE_DATA_MANIFEST_PATH"), "Rust 读取 SHmap-Data manifest"],
  [rustAuth.includes("application/vnd.github.raw+json"), "Rust 使用认证后的 GitHub Contents raw 读取"],
  [rustAuth.includes("SHA-256 校验失败"), "Rust 对私有地图做 SHA-256 完整性校验"],
  [rustAuth.includes("require_authorized_session"), "Rust 建立授权会话硬门"],
  [rustLib.includes("github_auth::require_authorized_session(&github_state)?"), "SQLite/备份命令受后端授权保护"],
  [rustLib.includes("load_private_map_bundle"), "Tauri 已注册私有地图加载命令"],
];
for (const [passed, message] of checks) passed ? ok(message) : fail(message);

const htmlFiles = ["index.html", "src/index.html", "public/index.html"].filter(exists);
for (const html of htmlFiles) {
  const content = read(html);
  if (/app\/data\.js/i.test(content)) fail(`${html} 仍引用 /app/data.js，请删除对应 script 标签`);
  else ok(`${html} 未引用 /app/data.js`);
}

if (process.exitCode) {
  console.error("\nStage 2 私有数据检查未通过。请先修复以上项目再构建正式安装包。");
} else {
  console.log("\nStage 2 私有数据检查通过。");
}
