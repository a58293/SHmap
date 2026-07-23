import fs from "node:fs";
const app=fs.readFileSync(new URL("../public/app/app.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../public/app/styles.css",import.meta.url),"utf8");
const verticalPatch=css.slice(css.lastIndexOf("博物志分类纵向顺序排列补丁"));
const checks=[
  ["博物志滚轮路由",app.includes("function routeDossierWheel(e)")&&app.includes('document.addEventListener("wheel",routeDossierWheel,{capture:true,passive:false})')],
  ["条目详情优先滚动",app.includes('.brief-object-copy,.brief-museum-list,#identityDrawerBody')&&app.includes("function scrollElementByWheel(scroller,delta)")],
  ["取消分类横向滚动",!app.includes("function scrollDossierCategoriesByWheel(target,root,delta)")&&!app.includes("grid.scrollLeft")],
  ["栏目边界后滚整页",app.includes('root.querySelector(".dossier-right")')&&app.includes("当前条目和分类列表都到边界后")],
  ["右键按层级返回",app.includes("e.preventDefault();e.stopImmediatePropagation();appGoBack();")&&app.includes('const identityDrawer=visibleElement("identityObjectDrawer")')],
  ["经篇页右键返回",app.includes('els.scriptureWorkspace.addEventListener("contextmenu"')&&app.includes("event.stopImmediatePropagation();appGoBack()")],
  ["图片完整显示",css.includes("博物志图片完整显示、单行分类滚动与条目详情滚动补丁")&&css.includes("object-fit:contain")],
  ["分类纵向顺序排列",verticalPatch.includes("display:flex")&&verticalPatch.includes("flex-direction:column")&&verticalPatch.includes("overflow-x:hidden")],
  ["项目与详情独立滚动",css.includes(".reading-layout .brief-museum-list")&&css.includes(".reading-layout .brief-object-copy")&&css.includes("overflow-y:auto")]
];
let failed=false;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed=true}
if(failed)process.exit(1);
