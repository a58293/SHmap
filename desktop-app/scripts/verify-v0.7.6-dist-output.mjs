import fs from "node:fs";
import assert from "node:assert/strict";

const required = [
  "dist/index.html",
  "dist/app/app.js",
  "dist/app/styles.css",
];

for (const path of required) {
  const file = new URL(`../${path}`, import.meta.url);
  assert.ok(fs.existsSync(file), `前端构建产物缺失：${path}`);
}
console.log("v0.7.6 前端构建产物检查通过。");
