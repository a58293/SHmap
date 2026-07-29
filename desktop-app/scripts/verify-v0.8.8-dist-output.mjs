import fs from "node:fs";
import assert from "node:assert/strict";

for (const path of ["dist/index.html", "dist/app/app.js", "dist/app/object-roles.js", "dist/app/styles.css"]) {
  assert.ok(fs.existsSync(new URL(`../${path}`, import.meta.url)), `前端构建产物缺失：${path}`);
}
console.log("v0.8.8 前端构建产物检查通过。");
