import fs from "node:fs";
import assert from "node:assert/strict";
const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
for(const path of ["public/app/app.js","dist/app/app.js"]){const app=read(path);for(const marker of ["function v102ScheduleGallerySave","function v102CloseGallery","function v102GallerySignature","saveV098Gallery({close:false,quiet:true})","persist(true)","图片已自动保存","所有更改已保存","保存并关闭"])assert.ok(app.includes(marker),`${path} 缺少图库自动保存标记：${marker}`)}
for(const path of ["public/app/styles.css","dist/app/styles.css"]){const css=read(path);assert.ok(css.includes('.v098-gallery-toolbar em[data-tone="saving"]'));assert.ok(css.includes(".v102-auto-save-note"))}
console.log("v1.0.2 图片图库自动保存校验通过。");
