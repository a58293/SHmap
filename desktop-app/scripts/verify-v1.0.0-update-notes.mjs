import fs from "node:fs";
import assert from "node:assert/strict";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const release = read("RELEASE_NOTES.md");
const notes = read("更新说明.txt");
assert.ok(release.startsWith("# 山海经原典地图研究台 v1.0.0"));
for (const marker of ["多端资料自动合并","冲突逐项选择","保留本机","使用更改包","自动建立桌面数据库备份"]) assert.ok(release.includes(marker), `发布说明缺少：${marker}`);
assert.ok(notes.startsWith("SHmap v1.0.0"));
assert.ok(notes.includes("不再因为一个冲突拦截整份更改包"));
assert.ok(notes.includes("版本：v1.0.0"));
console.log("v1.0.0 更新说明校验通过。");
