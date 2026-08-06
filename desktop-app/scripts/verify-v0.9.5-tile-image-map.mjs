import fs from "node:fs";
import assert from "node:assert/strict";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

for (const path of ["public/app/app.js", "dist/app/app.js"]) {
  const app = read(path);
  assert.ok(app.includes("tileImageMapMode:saved?.tileImageMapMode!==false"), `${path} 未恢复地图图片模式`);
  assert.ok(app.includes("tileImageMapMode:state.tileImageMapMode"), `${path} 未持久化地图图片模式`);
  assert.ok(app.includes('tileImage=state.tileImageMapMode?syncedImageUrl(state.tileProfiles?.[k]?.imageUrl):""'), `${path} 地块渲染未读取主体图片`);
  assert.ok(app.includes('class="tile-map-image"'), `${path} 缺少地图地块图片层`);
  assert.ok(app.includes('imageClass=tileImage?"has-map-image":""'), `${path} 缺少图片地块状态`);
  assert.ok(app.includes("function setupTileImageMapToggle"), `${path} 缺少地块图片切换按钮`);
  assert.ok(app.includes('button.id="tileImageMapToggle"'), `${path} 切换按钮标识缺失`);
  assert.ok(app.includes('button.textContent=enabled?`地块图片：开'), `${path} 切换状态文字不直观`);
  assert.ok(app.includes("没有图片的地块保持原样"), `${path} 缺少无图片地块保护提示`);
  assert.ok(app.includes("setupTileImageMapToggle();"), `${path} 地块图片切换未初始化`);
  assert.ok(app.includes('tileImageMap:"switchable-image-or-terrain-card"'), `${path} 运行信息未声明地块图片切换`);
}

for (const path of ["public/app/styles.css", "dist/app/styles.css"]) {
  const css = read(path);
  assert.ok(css.includes("v0.9.5 · 地图地块图片外观切换"), `${path} 缺少v0.9.5样式标记`);
  assert.ok(css.includes(".tile-map-image{"), `${path} 缺少地块图片铺满样式`);
  assert.ok(css.includes("object-fit:cover"), `${path} 地块图片未使用裁切铺满`);
  assert.ok(css.includes(".tile.has-map-image .tile-front:before"), `${path} 缺少图片文字可读性遮罩`);
  assert.ok(css.includes("#tileImageMapToggle.active"), `${path} 缺少切换按钮开启状态`);
}

console.log("v0.9.5 地图地块主体图片切换专项校验通过。");
