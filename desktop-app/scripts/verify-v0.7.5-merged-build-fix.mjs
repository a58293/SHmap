import fs from "node:fs";
import assert from "node:assert/strict";

for (const path of ["public/app/app.js", "dist/app/app.js"]) {
  const app = fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  for (const token of [
    "九段式地块补充语义：文件名匹配唯一已有地块",
    'linkReason:"tile-content"',
    'if(entry?.linkReason==="tile-content")return null',
    "第06节分类条目直接作为该地块内部资料显示，不需要匹配独立地图对象。",
  ]) {
    assert.ok(app.includes(token), `${path} 缺少语义绑定内容：${token}`);
  }
}
for (const path of ["public/app/styles.css", "dist/app/styles.css"]) {
  const css = fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  assert.ok(css.includes("详细页分类每行最多3列最终修正"), `${path} 缺少最终三列布局`);
  assert.ok(css.includes("grid-template-columns:repeat(3,minmax(0,1fr))!important"), `${path} 缺少三列规则`);
  assert.ok(css.includes("grid-auto-flow:row!important"), `${path} 没有按行换列`);
  assert.ok(css.includes("flex-direction:column!important"), `${path} 分类内部卡片没有恢复纵向排列`);
}
console.log("合并修复校验通过：语义绑定完整，详细页每行最多3个分类。");
