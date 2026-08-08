import fs from "node:fs";
import assert from "node:assert/strict";

const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");

for(const path of ["public/app/app.js","dist/app/app.js"]){
  const app=read(path);
  for(const marker of [
    "function precisionCardImageSource",
    "state.tileProfiles[key]||{}",
    "ownImage||precisionCardImageSource(o)",
    "data-image-kind=",
    "地块主体图片",
    "openMuseumImageViewer(frame.dataset.precisionImagePreview",
    'mapDetailImages:"object-primary-then-tile-primary-in-precision-preview-cards"'
  ]) assert.ok(app.includes(marker),`${path} 缺少v1.0.5精细卡片图片回退标记：${marker}`);
}

for(const path of ["public/app/styles.css","dist/app/styles.css"]){
  assert.ok(read(path).includes(".precision-hover-thumb>small"),`${path} 缺少主题图/地块图标签样式`);
}

console.log("v1.0.5 精细地图对象图优先、地块主体图回退校验通过。");
