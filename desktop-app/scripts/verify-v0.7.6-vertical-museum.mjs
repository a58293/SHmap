import fs from "node:fs";

const app = fs.readFileSync(new URL("../public/app/app.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../public/app/styles.css", import.meta.url), "utf8");

const checks = [
  ["horizontal category wheel handler removed", !app.includes("scrollDossierCategoriesByWheel") && !app.includes("横向分类列")],
  ["wheel order is vertical only", app.includes("条目详细介绍 → 当前分类项目列表 → 博物志整页")],
  ["vertical category patch marker", css.includes("博物志分类纵向顺序排列补丁")],
  ["category stack uses column flow", /brief-museum-grid[\s\S]{0,900}display:flex;[\s\S]{0,200}flex-direction:column;/.test(css.slice(css.lastIndexOf("博物志分类纵向顺序排列补丁")))],
  ["horizontal overflow disabled", /overflow-x:hidden;/.test(css.slice(css.lastIndexOf("博物志分类纵向顺序排列补丁")))],
  ["category item list remains vertical-scrollable", /brief-museum-list[\s\S]{0,300}overflow-y:auto;/.test(css.slice(css.lastIndexOf("博物志分类纵向顺序排列补丁")))],
];
let failed = 0;
for (const [name, ok] of checks) {
  if (ok) console.log(`✔ ${name}`);
  else { console.error(`✘ ${name}`); failed++; }
}
if (failed) process.exit(1);
console.log("v0.7.6 vertical museum category verification passed.");
