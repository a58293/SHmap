import fs from "node:fs";
import assert from "node:assert/strict";
const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8"),release=read("RELEASE_NOTES.md"),notes=read("更新说明.txt");
assert.ok(release.startsWith("# 山海经原典地图研究台 v1.0.3"));
assert.ok(release.includes("冲突内容左右对照")&&release.includes("图片图库自动保存")&&release.includes("精细地图"));
assert.ok(notes.startsWith("SHmap v1.0.3"));assert.ok(notes.includes("版本：v1.0.3"));
console.log("v1.0.3 更新说明校验通过。");
