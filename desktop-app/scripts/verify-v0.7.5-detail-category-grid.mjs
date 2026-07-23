import fs from "node:fs";

for (const path of ["public/app/styles.css", "dist/app/styles.css"]) {
  const css = fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const checks = [
    ["final marker", css.includes("详细页分类每行最多3列最终修正")],
    ["three category columns", css.includes("grid-template-columns:repeat(3,minmax(0,1fr))!important")],
    ["category wrap uses row flow", css.includes("grid-auto-flow:row!important")],
    ["card list restored vertically", css.includes("flex-direction:column!important")],
    ["horizontal card scrolling disabled", css.includes("overflow-x:hidden!important")],
  ];
  for (const [name, ok] of checks) {
    console.log(`${ok ? "PASS" : "FAIL"} ${path}: ${name}`);
    if (!ok) process.exitCode = 1;
  }
}
if (process.exitCode) process.exit(process.exitCode);
console.log("v0.7.5 detail category grid verification passed.");
