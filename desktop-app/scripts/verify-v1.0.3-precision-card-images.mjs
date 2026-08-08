import fs from "node:fs";
import assert from "node:assert/strict";
const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
for(const path of ["public/app/app.js","dist/app/app.js"]){
  const app=read(path);
  for(const marker of ["precision-hover-cards ${ordered.some(o=>!!objectImageSource(o))?'has-images':''}","data-precision-image-preview","data-precision-image-name","openMuseumImageViewer(frame.dataset.precisionImagePreview","mapDetailImages:\"object-primary-image-in-precision-preview-cards\""]){
    assert.ok(app.includes(marker),`${path} 缺少精细地图图片标记：${marker}`);
  }
}
for(const path of ["public/app/styles.css","dist/app/styles.css"]){
  const css=read(path);
  for(const marker of [".precision-hover-cards.has-images",".precision-hover-card.has-image",".precision-hover-thumb img"]){
    assert.ok(css.includes(marker),`${path} 缺少精细地图图片样式：${marker}`);
  }
}
console.log("v1.0.3 精细地图对象卡图片校验通过。");
