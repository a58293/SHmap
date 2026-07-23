import fs from "node:fs";
import assert from "node:assert/strict";

const expectedClick='tile.addEventListener("click",e=>{if(Date.now()<state.suppressClickUntil)return;if(e.target.closest("button"))return;const items=objectsInCellKey(tile.dataset.cell);clickOutsideSpatialFocus(tile.dataset.cell);state.indexMode="objects";state.selectedHierarchyNode="";state.selectedCell=tile.dataset.cell;if(items.length&&!items.some(o=>o.id===state.selectedId))state.selectedId=items[0].id;if(items.length){state.flippedCell=null;renderDetails();renderSidebar();scheduleRender();persist();openDossierWorkspace()}else{state.flippedCell=state.flippedCell===tile.dataset.cell?null:tile.dataset.cell;renderDetails();renderSidebar();scheduleRender();persist()}});';

for (const path of ["public/app/app.js","dist/app/app.js"]) {
  const app=fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
  assert.equal(app.split(expectedClick).length-1,1,`${path} 地块单击处理没有唯一生效`);
  assert.ok(app.includes("selectObject(btn.dataset.objectId);openDossierWorkspace()"));
  assert.ok(app.includes("单击打开地块博物志 / 双击下钻"));
}
for (const path of ["public/app/styles.css","dist/app/styles.css"]) {
  const css=fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
  assert.ok(css.includes("详细页卡片字号与可读性修正"));
  assert.ok(css.includes("font-size:19px!important"));
  assert.ok(css.includes("font-size:12px!important"));
  assert.ok(css.includes("min-height:176px!important"));
}
console.log("v0.7.6 详细页字号与地块单击修正校验通过。");
