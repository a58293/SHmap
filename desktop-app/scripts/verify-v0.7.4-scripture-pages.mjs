import fs from "node:fs";
import vm from "node:vm";
const app=fs.readFileSync(new URL("../public/app/app.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../public/app/styles.css",import.meta.url),"utf8");
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const dataSource=fs.readFileSync(new URL("../public/app/data.js",import.meta.url),"utf8");
const sandbox={window:{}};vm.createContext(sandbox);vm.runInContext(dataSource,sandbox);
const objects=sandbox.window.SHJ_INITIAL_DATA?.objects||[];
const chapters=["南山经","西山经","北山经","东山经","中山经","海外南经","海外西经","海外北经","海外东经","海内南经","海内西经","海内北经","海内东经","大荒东经","大荒南经","大荒西经","大荒北经","海内经"];
const checks=[
  ["经篇内容页DOM",html.includes('id="scriptureWorkspace"')&&html.includes('id="scriptureChapterNav"')&&html.includes('id="scriptureContent"')],
  ["经名点击打开内容页",app.includes("function openScriptureDirectory(chapter)")&&app.includes('els.scriptureWorkspace.classList.remove("hidden")')],
  ["对象详情经名绑定",app.includes("bindIdentityBoardEvents(drawerBody)")],
  ["十八经导航与分类",app.includes("function scriptureNavigationHTML(active)")&&app.includes("function scriptureCategoryButtonsHTML(stats)")],
  ["经篇对象与地块事件汇总",app.includes("function scriptureObjectsFor(chapter)")&&app.includes("function scriptureEventsFor(chapter)")],
  ["本经地图筛选",app.includes("function showScriptureOnMap()")&&app.includes("state.filters.chapter=target")],
  ["对象资料与地图定位",app.includes("data-scripture-object-detail")&&app.includes("data-scripture-locate-object")],
  ["经篇检索",app.includes('scriptureSearchInput?.addEventListener("input"')&&app.includes("state.scriptureQuery")],
  ["返回与Esc关闭",app.includes('visibleElement("scriptureWorkspace")')&&app.includes("closeScriptureWorkspace()")],
  ["经篇页右键返回",app.includes('els.scriptureWorkspace.addEventListener("contextmenu"')&&app.includes("event.stopImmediatePropagation();appGoBack()")],
  ["内容页样式",css.includes("v0.7.4 · 十八经内容页")&&css.includes(".scripture-workspace")&&css.includes(".scripture-object-grid")],
  ["基础对象仍为617",objects.length===617],
  ["十八经列表完整",chapters.length===18&&chapters.every(ch=>app.includes(`"${ch}"`))]
];
let failed=false;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed=true}
if(failed)process.exit(1);
