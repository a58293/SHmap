import fs from "node:fs";

const app=fs.readFileSync(new URL("../public/app/app.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../public/app/styles.css",import.meta.url),"utf8");
const checks=[
  ["detail page uses static category layout",app.includes('briefMuseumHTML(items,{profile,layout:"static",showEmpty:false})')],
  ["detail page hides empty categories",app.includes('showEmpty:false')],
  ["detail layout markers present",css.includes("详细页三列常展修正")&&css.includes("详细页三等分宽度最终修正")&&css.includes("每列3个卡片，超出后另起一列")],
  ["detail grid limited to three equal columns",css.includes(".reading-layout .brief-museum-static .brief-museum-static-grid.count-6")&&css.includes("grid-template-columns:repeat(3,minmax(0,1fr));")],
  ["detail category list uses 3-row internal columns",css.includes("grid-auto-flow:column")&&css.includes("grid-template-rows:repeat(3,156px)")],
  ["detail category list scrolls horizontally when more than 3 cards",css.includes("overflow-x:auto")&&css.includes("overflow-y:hidden")],
  ["no empty category placeholders required",!app.includes('layout:"static",showEmpty:true')],
  ["scripture page order marker",css.includes("详细页六类常开展示与经篇内容顺序修正")],
];
let failed=false;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed=true}if(failed)process.exit(1);
console.log("v0.7.5 museum detail layout verification passed.");
