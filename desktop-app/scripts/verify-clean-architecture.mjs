import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const exists=p=>fs.existsSync(path.join(root,p));

for(const p of ["public/app/data.js","dist/app/data.js"]){
  assert.equal(exists(p),false,`${p} 不得存在`);
}
const html=read("index.html");
assert.ok(!/app\/data\.js/i.test(html),"index.html 不得引用 data.js");

const boot=read("src/desktop-bootstrap.js");
assert.ok(boot.includes('invoke("load_private_map_bundle")'),"启动必须从 Private SHmap-Data 读取正式地图");
assert.ok(boot.includes('"SHJ_BOARD_LAYOUT"'),"启动必须注入正式坐标棋盘布局");
assert.ok(boot.includes("preferredStartupFallback")||boot.includes("snapshotDataVersion"),"启动降级必须感知数据版本");

const rust=read("src-tauri/src/lib.rs");
const auth=read("src-tauri/src/github_auth.rs");
assert.ok(rust.includes("github_auth::require_authorized_session"),"Rust 数据命令必须有授权硬门");
assert.ok(rust.includes("github_auth::publish_private_submission"),"更改包必须发布到私有仓库层");
assert.ok(rust.includes("Duration::from_secs(180)"),"私有更改包上传必须有整轮超时");
assert.ok(auth.includes("SHmap-Data")||auth.includes('REPO: &str = "SHmap-Data"'),"GitHub Auth 目标必须为 SHmap-Data");
assert.ok(auth.includes("submissions/pending/")&&auth.includes("submissions/assets/"),"更改包与图片必须写入私有 submissions");

for(const marker of ["run_git_network","GitHubDesktop","GCM_INTERACTIVE","http.lowSpeedTime=30"]){
  assert.ok(!rust.includes(marker),`不得恢复旧本地 Git 发布逻辑：${marker}`);
}

const pkg=JSON.parse(read("package.json"));
const verifyChain=String(pkg.scripts.verify||"").split("&&").map(item=>item.trim()).filter(Boolean);
const requiredVerifyChain=[
  "npm run build",
  "npm run verify:architecture",
  "npm run verify:v283-data",
  "npm run verify:critical",
  "npm run verify:overview-policy",
  "npm run verify:import-audit",
  "npm run verify:release"
];
for(const command of requiredVerifyChain){
  assert.ok(verifyChain.includes(command),`verify 链缺少：${command}`);
}
for(let i=1;i<requiredVerifyChain.length;i++){
  assert.ok(verifyChain.indexOf(requiredVerifyChain[i-1])<verifyChain.indexOf(requiredVerifyChain[i]),`verify 链顺序错误：${requiredVerifyChain[i-1]} -> ${requiredVerifyChain[i]}`);
}
assert.ok(!("verify:checks" in pkg.scripts),"旧历史 verify:checks 链必须移除");

console.log("PASS clean architecture: Private data / GitHub auth / compact CI / no data.js.");
