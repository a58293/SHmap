import fs from "node:fs";

const app=fs.readFileSync(new URL("../public/app/app.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../public/app/styles.css",import.meta.url),"utf8");
const checks=[
  ["categories render as details",app.includes('<details class="brief-museum-category')],
  ["category header uses summary",app.includes('<summary class="brief-museum-category-toggle">')],
  ["categories are collapsed by default",!/<details class="brief-museum-category[^>]*\sopen(?:\s|>)/.test(app)],
  ["accordion patch marker",css.includes("博物志分类折叠菜单补丁")],
  ["native marker hidden",css.includes("brief-museum-category-toggle::-webkit-details-marker")],
  ["open state styling",css.includes("details.brief-museum-category[open]")],
  ["vertical expanded list",/details\.brief-museum-category>\.brief-museum-list[\s\S]{0,220}overflow-y:auto/.test(css)],
  ["no horizontal category scrolling",css.slice(css.lastIndexOf("博物志分类折叠菜单补丁")).includes("overflow-x:hidden")],
];
let failed=false;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed=true}if(failed)process.exit(1);
console.log("v0.7.4 museum accordion verification passed.");
