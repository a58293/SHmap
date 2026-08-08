import fs from "node:fs";
import assert from "node:assert/strict";
const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8"),release=read("RELEASE_NOTES.md"),notes=read("更新说明.txt");
assert.ok(release.startsWith("# 山海经原典地图研究台 v1.0.4"));
assert.ok(release.includes("冲突只显示地块内容")&&release.includes("冲突字段多选"));
assert.ok(notes.startsWith("SHmap v1.0.4"));assert.ok(notes.includes("版本：v1.0.4"));
console.log("v1.0.4 更新说明校验通过。");
