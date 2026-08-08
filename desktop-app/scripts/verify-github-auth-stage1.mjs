import fs from "node:fs";
import assert from "node:assert/strict";

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const auth=read("src-tauri/src/github_auth.rs");
const rust=read("src-tauri/src/lib.rs");
const cargo=read("src-tauri/Cargo.toml");
const boot=read("src/desktop-bootstrap.js");
const css=read("src/desktop-ui.css");

assert.ok(auth.includes('const CLIENT_ID: &str = "Iv23livt94lUqNbtdR3t";'));
assert.ok(auth.includes('const REPOSITORY_NAME: &str = "SHmap-Data";'));
assert.ok(auth.includes("https://github.com/login/device/code"));
assert.ok(auth.includes("urn:ietf:params:oauth:grant-type:device_code"));
assert.ok(auth.includes("Windows 凭据管理器"));
assert.ok(auth.includes("x-ratelimit-remaining"));
assert.ok(auth.includes("X-GitHub-Api-Version"));
assert.ok(!auth.match(/client_secret|BEGIN (RSA )?PRIVATE KEY|ghp_[A-Za-z0-9]+/i));
assert.ok(cargo.includes('keyring = { version = "3"'));
assert.ok(cargo.includes('reqwest = { version = "0.12"'));
for(const command of ["github_auth_status","github_begin_device_flow","github_complete_device_flow","github_logout","open_github_device_page"]){
  assert.ok(rust.includes(`github_auth::${command}`),`Tauri命令未注册：${command}`);
}
const authBeforeBootstrap=boot.indexOf("await ensureGitHubAccess()")<boot.indexOf('invoke("bootstrap_workspace"');
assert.ok(authBeforeBootstrap,"必须先验证权限再读取地图工作区");
assert.ok(boot.includes("登录后查看正式地图"));
assert.ok(boot.includes('invoke("github_logout")'));
assert.ok(css.includes(".desktop-auth-gate")&&css.includes(".desktop-auth-card"));

console.log("GitHub登录第一阶段校验通过：Device Flow、Windows凭据、私有仓库权限锁均已接入。");
