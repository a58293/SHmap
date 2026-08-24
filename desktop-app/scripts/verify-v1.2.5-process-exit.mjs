import fs from "node:fs";
import assert from "node:assert/strict";

const read=path=>fs.readFileSync(path,"utf8");
const pkg=JSON.parse(read("package.json"));
const version=JSON.parse(read("VERSION.json"));
const boot=read("src/desktop-bootstrap.js");
const rust=read("src-tauri/src/lib.rs");

assert.equal(pkg.version,version.semver);assert.ok(pkg.version.localeCompare("1.2.6",undefined,{numeric:true})>=0,"发布版本不得低于1.2.6稳定基线");
assert.ok(boot.includes('invoke("exit_application")'),"close handler still only destroys the webview window");
assert.ok(!boot.includes("appWindow.destroy()"),"window-only destroy call remains in close handler");
assert.ok(rust.includes("fn exit_application(app: tauri::AppHandle)"),"native full-process exit command is missing");
assert.ok(rust.includes("app.exit(0)"),"native full-process exit is not executed");
assert.ok(rust.includes("exit_application,"),"native exit command is not registered");
assert.ok(boot.includes("只有被凯淞大王允许才可以进入"),"custom GitHub access copy was lost");
console.log("PASS v1.2.5 closes the full Tauri process and preserves custom login copy");
