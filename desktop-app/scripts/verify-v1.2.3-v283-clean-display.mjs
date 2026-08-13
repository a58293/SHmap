import fs from "node:fs";
import assert from "node:assert/strict";

const read=path=>fs.readFileSync(path,"utf8");
const pkg=JSON.parse(read("package.json"));
const version=JSON.parse(read("VERSION.json"));
const app=read("public/app/app.js");
const lib=read("src-tauri/src/lib.rs");

assert.equal(pkg.version,"1.2.5");
assert.equal(version.semver,"1.2.5");
assert.equal(version.data_version,"v283-r0001");
assert.equal(version.board_world_labels,0);
assert.equal(version.board_annotations,48);
assert.ok(app.includes("authoritativeWorkbook"),"前端没有把V283作为完整权威母表");
assert.ok(app.includes("v283-r0001"),"前端默认数据版本没有升级到V283");
assert.ok(lib.includes('seed_version.starts_with("v28")'),"原生迁移未覆盖V283");
assert.ok(app.includes('"sourceNotes","pendingQuestions"'),"前端迁移没有保护已导入Markdown扩展资料");
assert.ok(lib.includes('"sourceNotes"')&&lib.includes('"pendingQuestions"'),"原生迁移没有保护已导入Markdown扩展资料");
assert.ok(lib.includes("V283正式母表升级完成"),"V283升级完成备份标签缺失");
console.log("PASS v1.2.3 V283 safeguards retained by v1.2.5");
