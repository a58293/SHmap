import fs from "node:fs";

const app=fs.readFileSync(new URL("../public/app/app.js",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../public/app/styles.css",import.meta.url),"utf8");
const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const version=JSON.parse(fs.readFileSync(new URL("../VERSION.json",import.meta.url),"utf8"));
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
  ["分类内容位于地图分布之前",app.includes("return categories+eventSection+overview+quoteSection")],
  ["基础对象元数据仍为624",version.object_count===624],
  ["正式地图不再打包",!fs.existsSync(new URL("../public/app/data.js",import.meta.url))&&!/app\/data\.js/i.test(html)],
  ["十八经列表完整",chapters.length===18&&chapters.every(ch=>app.includes(`"${ch}"`))]
];

let failed=false;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"} ${name}`);if(!ok)failed=true}
if(failed)process.exit(1);
console.log("v0.7.6 经篇页校验通过：对象计数改读公开 VERSION 元数据，正文数据保持私有。");
