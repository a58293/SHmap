import fs from "node:fs";
const app=fs.readFileSync(new URL("../public/app/app.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../public/app/styles.css",import.meta.url),"utf8");
const checks=[
  ["紧凑缩略图尺寸",/grid-template-columns:96px minmax\(0,1fr\)/.test(css)&&/height:168px/.test(css)],
  ["完整图片 contain",/object-fit:contain/.test(css)],
  ["点击大图预览",/function openMuseumImageViewer/.test(app)&&/data-museum-image-preview/.test(app)],
  ["右键优先关闭大图",/if\(closeMuseumImageViewer\(\)\)return true/.test(app)],
  ["预览层样式",/\.museum-image-viewer\{/.test(css)&&/\.museum-image-viewer-stage img\{/.test(css)],
  ["卡片详情仍可滚动",/\.reading-layout \.brief-object-copy\{[\s\S]*?overflow-y:auto/.test(css)],
];
let failed=false;for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed=true}if(failed)process.exit(1);
