import fs from "node:fs";
import assert from "node:assert/strict";

const read = (path) =>
  fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

for (const path of ["index.html", "dist/index.html"]) {
  const html = read(path);
  assert.ok(html.includes("对象列表"), `${path} 缺少“对象列表”入口`);
  assert.ok(html.includes("地名与资料"), `${path} 缺少对象入口说明`);
  assert.ok(html.includes("区域目录"), `${path} 缺少“区域目录”入口`);
  assert.ok(html.includes("世界与分区"), `${path} 缺少区域入口说明`);
}

for (const path of ["public/app/app.js", "dist/app/app.js"]) {
  const app = read(path);
  assert.ok(app.includes("选择对象类型"), `${path} 缺少类型菜单标题`);
  assert.ok(
    app.includes("先选大类，再选具体类型"),
    `${path} 缺少类型菜单操作提示`,
  );
  assert.ok(
    app.includes('const icons={"山":"山","水系":"水"'),
    `${path} 缺少类型分组图标`,
  );
}

for (const path of ["public/app/styles.css", "dist/app/styles.css"]) {
  const css = read(path);
  assert.ok(
    css.includes("v0.9.1 · 直观优先"),
    `${path} 缺少左栏直观界面样式`,
  );
  assert.ok(
    css.includes("v0.9.1 · 经篇页简洁阅读版"),
    `${path} 缺少经篇页简洁样式`,
  );
  assert.ok(
    css.includes(".left-panel .filter-row:has(.type-filter-menu[open])"),
    `${path} 缺少类型菜单层级保护`,
  );
  assert.ok(
    css.includes("background:#fbf7ed!important"),
    `${path} 类型菜单未使用不透明背景`,
  );
  assert.ok(
    css.includes(".scripture-hero::after{display:none}"),
    `${path} 未关闭经篇页装饰性巨字`,
  );
}

console.log("v0.9.1 直观界面专项校验通过。");
