import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const json=file=>JSON.parse(read(file));
const app=read("public/app/app.js");
const bootstrap=read("src/desktop-bootstrap.js");
const rust=read("src-tauri/src/lib.rs");
const auth=read("src-tauri/src/github_auth.rs");
const pkg=json("package.json");
const version=json("VERSION.json");

assert.equal(pkg.version,"1.1.7");
assert.equal(version.semver,"1.1.7");
assert.ok(app.includes('repo: "SHmap-Data"'),"更新列表没有指向私有 SHmap-Data");
assert.ok(app.includes("listPrivatePatches"),"前端没有使用认证后的私有更改包列表");
assert.ok(app.includes("readPrivatePatch"),"前端没有使用认证后的私有更改包读取");
assert.ok(!app.includes("api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents"),"仍残留匿名 Contents API 读取");
assert.ok(bootstrap.includes("setupNativeCloseSaveGuard"),"缺少原生窗口关闭保存保护");
assert.ok(bootstrap.includes("__SHJ_FLUSH_PERSIST__"),"关闭前没有强制提交待保存状态");
assert.ok(auth.includes("pub async fn list_private_submissions"),"Rust 缺少私有更改包列表命令");
assert.ok(auth.includes("pub async fn read_private_submission"),"Rust 缺少私有更改包读取命令");
assert.ok(rust.includes('payload_sha256=?2'),"备份没有按内容指纹去重");
assert.ok(rust.includes('if kind != "auto"'),"自动备份仍会重复写入外部 JSON");
assert.ok(rust.includes("collect_local_change_fields"),"基础数据升级未保护已记录的本机编辑字段");
assert.ok(app.includes("savedObjectChangedFields"),"前端启动迁移未保护已记录的本机编辑字段");
assert.ok(app.includes("startupSameValue(before[key],after[key])"),"启动迁移仍调用尚未初始化的多端比较规则");
assert.ok(!/function savedObjectChangedFields[\s\S]{0,900}!sameValue\(/.test(app),"启动迁移存在初始化时序回归");
assert.ok(app.includes("window.__SHJ_MAIN_READY__=true"),"地图主程序没有启动完成标记");
assert.ok(bootstrap.includes("waitForMainProgramReady"),"桌面启动器只检查脚本下载，没有检查主程序初始化");
assert.ok(app.includes("protectedObjectFields"),"跨设备应用的字段没有持久保护清单");
assert.ok(app.includes("!masterRows.has(object.rowRef)"),"旧对象 ID 仍可能按相同母表行重复追加");
assert.ok(fs.existsSync(path.join(root,"scripts/generate-v1.1.7-dossier-repair-preview.py")),"缺少只读数据修复预览生成器");

console.log("PASS v1.1.7 private sync, persistence, backup and migration safeguards");
