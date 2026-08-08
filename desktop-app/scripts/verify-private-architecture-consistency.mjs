import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root,p),"utf8");
const exists = p => fs.existsSync(path.join(root,p));
let failed = false;
const ok = msg => console.log(`✓ ${msg}`);
const fail = msg => { console.error(`✗ ${msg}`); failed = true; };

for (const p of ["public/app/data.js","dist/app/data.js"]) {
  exists(p) ? fail(`${p} 不应存在`) : ok(`${p} 不存在`);
}
const html = read("index.html");
/app\/data\.js/i.test(html) ? fail("index.html 仍引用 data.js") : ok("index.html 不引用 data.js");

const bootstrap = read("src/desktop-bootstrap.js");
bootstrap.includes('invoke("load_private_map_bundle")') ? ok("启动使用私有地图加载命令") : fail("启动未使用私有地图加载命令");

const rust = read("src-tauri/src/lib.rs");
const rustAuth = read("src-tauri/src/github_auth.rs");
rust.includes("github_auth::publish_private_submission") ? ok("更改包使用私有仓库发布层") : fail("更改包未使用私有仓库发布层");
rust.includes("Duration::from_secs(180)") ? ok("私有上传存在整轮超时") : fail("私有上传缺少整轮超时");
rustAuth.includes("submissions/pending/") && rustAuth.includes("submissions/assets/") ? ok("更改包与图片目标为 SHmap-Data") : fail("私有提交目标路径缺失");

for (const marker of ["run_git_network","GitHubDesktop","GCM_INTERACTIVE","http.lowSpeedTime=30"]) {
  if (rust.includes(marker)) fail(`Rust 运行时仍残留旧本地 Git 发布标记：${marker}`);
}

const pkg = JSON.parse(read("package.json"));
const verifyChecks = pkg.scripts?.["verify:checks"] || "";
const scriptNames = [...verifyChecks.matchAll(/node\s+(scripts\/[\w.\-]+\.mjs)/g)].map(m=>m[1]);
for (const script of scriptNames) {
  if (!exists(script)) {
    fail(`verify:checks 引用不存在脚本：${script}`);
    continue;
  }
  const source = read(script);
  const readsOldData =
    /readFileSync\([^)]*data\.js/i.test(source) ||
    /read\(["']public\/app\/data\.js["']\)/i.test(source) ||
    /dataPath\s*=.*data\.js/i.test(source);
  if (readsOldData) fail(`${script} 仍直接读取已删除的 public/app/data.js`);
}

if (failed) process.exit(1);
console.log("Private architecture consistency verification passed.");
