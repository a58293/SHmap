import fs from "node:fs";
import assert from "node:assert/strict";

function placeholder(value){
  let key=String(value||"").normalize("NFKC").replace(/[*_`#]/g,"").replace(/[\s，,。；;：:、\-—–_\[\]【】()（）]/g,"");
  key=key.replace(/^(?:(?:地貌|山水地貌|水系|草木|鸟兽|金玉矿物|人群神祇|事件与遗迹|事件遗迹)(?:名称|条目|内容)?|名称|条目|内容)/,"");
  return /^(?:(?:原文)?(?:未载明确|未载|无明确记载|未明确记载|暂无明确记载|暂无相关记载|无相关记载)|资料待补充|待补充|暂无|无)+$/.test(key);
}
for(const sample of [
  "原文未载明确",
  "草木名称：原文未载明确 [原文未载]",
  "鸟兽名称：原文未载明确（原文未载）",
  "**金玉矿物名称：暂无明确记载**",
  "事件与遗迹：无相关记载"
])assert.ok(placeholder(sample),`未识别占位：${sample}`);
for(const sample of ["建木","草木名称：建木 [原文直载]","鸟兽：九尾狐"])assert.ok(!placeholder(sample),`误判真实条目：${sample}`);

for(const path of ["public/app/app.js","dist/app/app.js"]){
  const app=fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
  assert.ok(app.includes("function openIdentityDossierEntryDrawer(ownerId,index)"));
  assert.ok(app.includes("data-dossier-detail-owner"));
  assert.ok(app.includes("openIdentityDossierEntryDrawer(btn.dataset.dossierDetailOwner,btn.dataset.dossierDetailIndex)"));
  assert.ok(app.includes("filter(({entry})=>!isNinePlaceholderEntryName(entry?.name))"));
  assert.ok(app.includes("old.museumEntries.filter(x=>!isNinePlaceholderEntryName(x?.name))"));
  assert.ok(app.includes("(next.museumEntries||[]).filter(item=>!isNinePlaceholderEntryName(item?.name))"));
}
console.log("v0.7.6 内部条目详情与占位卡片修正校验通过。");
