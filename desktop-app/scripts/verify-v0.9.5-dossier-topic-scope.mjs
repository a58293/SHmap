import fs from "node:fs";
import assert from "node:assert/strict";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

for (const path of ["public/app/app.js", "dist/app/app.js"]) {
  const app = read(path);
  assert.ok(app.includes("function dossierObjectIdentityNames(object)"), `${path} 缺少主体名称与异名归一化`);
  assert.ok(app.includes("function importedMuseumObjects(items,owner=null)"), `${path} 博物志条目未按当前主体接收作用域`);
  assert.ok(app.includes("const main=owner||selectedTileMain(items)"), `${path} 当前主体没有优先于同格默认主体`);
  assert.ok(app.includes("strictOwner=!!owner"), `${path} 缺少严格主体模式`);
  assert.ok(app.includes("return strictOwner?[]:null"), `${path} 无资料主体仍可能回退到同格对象`);
  assert.ok(app.includes("siblingIds=new Set(siblingObjects.map(object=>object.id))"), `${path} 缺少同格兄弟主体 ID 隔离`);
  assert.ok(app.includes("siblingNames=new Set(siblingObjects.flatMap"), `${path} 缺少同格兄弟主体名称与异名隔离`);
  assert.ok(app.includes("if(linked?.id&&siblingIds.has(linked.id))return false"), `${path} 独立兄弟主体仍会进入“这里有什么”`);
  assert.ok(app.includes("!ownerNames.has(entryName)&&!siblingNames.has(entryName)"), `${path} 当前主体或兄弟主体仍会重复为内部条目`);
  assert.ok(app.includes("importedMuseumObjects(items,owner)"), `${path} 展示层未传入当前主体`);
  assert.ok(app.includes("owner?imported:(imported||items)"), `${path} 严格主体无资料时仍会回退聚合整格对象`);
}

console.log("v0.9.5 资料主题全局隔离校验通过：并列主体只作切换，‘这里有什么’只显示当前主体第06节内部资料。");
