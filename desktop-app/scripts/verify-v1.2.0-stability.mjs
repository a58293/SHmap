import fs from "node:fs";
import assert from "node:assert/strict";

const read=p=>fs.readFileSync(p,"utf8");
const pkg=JSON.parse(read("package.json"));
const version=JSON.parse(read("VERSION.json"));
const app=read("public/app/app.js");
const boot=read("src/desktop-bootstrap.js");
const rust=read("src-tauri/src/lib.rs");

assert.equal(pkg.version,"1.2.0");
assert.equal(version.semver,"1.2.0");
assert.equal(version.data_version,"v282-r0001");
assert.ok(app.includes("startupSameValue"),"启动迁移仍可能引用尚未初始化的比较器");
assert.ok(!/function savedObjectChangedFields[\s\S]{0,900}!sameValue\(/.test(app),"启动迁移存在TDZ时序回归");
assert.ok(app.includes("window.__SHJ_MAIN_READY__=true"),"主程序没有就绪标记");
assert.ok(boot.includes("waitForMainProgramReady"),"桌面启动器没有主程序就绪看门狗");
assert.ok(boot.includes("unhandledrejection"),"桌面启动器没有捕获异步启动异常");
assert.ok(app.includes("authoritativeV282"),"前端迁移没有执行V282电子表格优先规则");
assert.ok(rust.includes("authoritative_v282"),"原生迁移没有执行V282电子表格优先规则");
assert.ok(rust.includes("is_local_new"),"迁移没有保留用户自建NEW对象");
assert.ok(read("src-tauri/src/github_auth.rs").includes("minimum_desktop_version"),"私有V282数据没有最低客户端版本硬门");
console.log("PASS v1.2.0 startup recovery and V282 authoritative migration safeguards");
