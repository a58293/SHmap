import fs from "node:fs";
import assert from "node:assert/strict";

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const release=read("RELEASE_NOTES.md"),notes=read("更新说明.txt");

assert.ok(release.startsWith("# 山海经原典地图研究台 v1.0.5"));
assert.ok(release.includes("精细地图对象卡图片回退修正"));
assert.ok(release.includes("对象自己的主题主图")&&release.includes("所在100里地块的主体主图"));
assert.ok(notes.startsWith("SHmap v1.0.5"));
assert.ok(notes.includes("版本：v1.0.5"));

console.log("v1.0.5 更新说明校验通过。");
