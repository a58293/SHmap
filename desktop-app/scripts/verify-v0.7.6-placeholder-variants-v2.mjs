import fs from "node:fs";
import assert from "node:assert/strict";

function normalize(value){
  let key=String(value||"").normalize("NFKC")
    .replace(/[*_`#]/g,"")
    .replace(/[\s，,。；;：:、\-—–_\[\]【】()（）]/g,"");
  key=key.replace(/^(?:(?:山水地貌|地貌|山川|山地|水系|河流|水域|草木|植物|木类|鸟兽|兽类|动物|金玉矿物|矿物|金玉|人群神祇|人群|神祇|人物|事件与遗迹|事件遗迹|事件|遗迹)(?:名称|条目|内容)?|名称|条目|内容)/,"");
  return key;
}
function isPlaceholder(value){
  const key=normalize(value);
  if(!key)return true;
  return !key.replace(/(?:(?:原文)?(?:未载明确|未载|无明确记载|未明确记载|暂无明确记载|暂无相关记载|无相关记载)|资料待补充|待补充|暂无|无)/g,"");
}

for(const value of [
  "矿物名称：原文未载明确 [原文未载]",
  "草木名称：原文未载明确（原文未载）",
  "鸟兽名称：暂无明确记载",
  "植物条目：无相关记载",
  "神祇内容：资料待补充",
  "**事件与遗迹：原文未载明确 [原文未载]**"
]) assert.ok(isPlaceholder(value),`漏掉占位：${value}`);

for(const value of [
  "矿物名称：赤金",
  "草木名称：建木 [原文直载]",
  "鸟兽：九尾狐",
  "无支祁",
  "无名水系"
]) assert.ok(!isPlaceholder(value),`误伤真实内容：${value}`);

for(const path of ["public/app/app.js","dist/app/app.js"]){
  const app=fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
  assert.ok(app.includes("金玉矿物|矿物|金玉"));
  assert.ok(app.includes("const residue=key.replace"));
  assert.ok(app.includes("filter(({entry})=>!isNinePlaceholderEntryName(entry?.name))"));
}
console.log("v0.7.6 占位卡片变体识别补全校验通过。");
