import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const required=["index.html","src/desktop-bootstrap.js","public/app/app.js","public/app/data.js","src-tauri/src/lib.rs","src-tauri/tauri.conf.json","src-tauri/tauri.release.conf.json","scripts/set-version.mjs","scripts/verify-release-tag.mjs","scripts/release.ps1",".npmrc"];
let failed=false;
for(const file of required){if(!fs.existsSync(path.join(root,file))){console.error(`缺少：${file}`);failed=true}}
const data=fs.readFileSync(path.join(root,"public/app/data.js"),"utf8");const marker="window.SHJ_INITIAL_DATA=";const start=data.indexOf(marker)+marker.length;let depth=0,inString=false,escape=false,end=-1;for(let i=start;i<data.length;i++){const c=data[i];if(inString){if(escape)escape=false;else if(c==="\\")escape=true;else if(c==='"')inString=false;continue}if(c==='"'){inString=true;continue}if(c==='{')depth++;if(c==='}'){depth--;if(depth===0){end=i+1;break}}}const initial=JSON.parse(data.slice(start,end));if(initial.objects.length!==395){console.error(`对象数量异常：${initial.objects.length}`);failed=true}const ids=new Set(initial.objects.map(x=>x.id));if(ids.size!==initial.objects.length){console.error("对象ID重复");failed=true}
const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8"));const conf=JSON.parse(fs.readFileSync(path.join(root,"src-tauri/tauri.conf.json"),"utf8"));const releaseConf=JSON.parse(fs.readFileSync(path.join(root,"src-tauri/tauri.release.conf.json"),"utf8"));const cargo=fs.readFileSync(path.join(root,"src-tauri/Cargo.toml"),"utf8");const cargoVersion=cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
if(new Set([pkg.version,conf.version,cargoVersion]).size!==1){console.error(`版本号未同步：package=${pkg.version} tauri=${conf.version} cargo=${cargoVersion}`);failed=true}
const [,minor="0"]=pkg.version.split(".");const edition=`v${String(Number(minor)).padStart(3,"0")}`;const rust=fs.readFileSync(path.join(root,"src-tauri/src/lib.rs"),"utf8");if(!rust.includes(`edition: "${edition}"`)){console.error(`桌面版本名称未同步：应为${edition}`);failed=true}
const updateEndpoints=conf.plugins?.updater?.endpoints||[];
if(!conf.plugins?.updater?.pubkey||!updateEndpoints.some(x=>x.includes("raw.githubusercontent.com/a58293/SHmap/main/updates/latest.json"))||!updateEndpoints.some(x=>x.includes("cdn.jsdelivr.net/gh/a58293/SHmap@main/updates/latest.json"))||!updateEndpoints.some(x=>x.includes("a58293/SHmap/releases/latest/download/latest.json"))){console.error("多线路更新器配置缺失");failed=true}if(releaseConf.bundle?.createUpdaterArtifacts!==true){console.error("正式发布配置未启用更新签名产物");failed=true}if(!cargo.includes('tauri-plugin-updater = "2"')){console.error("Rust更新插件缺失");failed=true}
const app=fs.readFileSync(path.join(root,"public/app/app.js"),"utf8");if(!app.includes("applyLivePanTransform")||!app.includes("resetLivePanTransform")){console.error("实时拖图逻辑缺失");failed=true}if(!app.includes("window.SHJ_APP_GO_BACK=appGoBack")){console.error("鼠标右键返回逻辑缺失");failed=true}
if(!app.includes("briefMuseumHTML")||!app.includes("brief-image-placeholder")){console.error("v004简述博物志图鉴逻辑缺失");failed=true}
if(!app.includes("importChooseBatchBtn")||!app.includes("importBatchFileInput")){console.error("v004批量Markdown选择逻辑缺失");failed=true}
if(!app.includes("imageUrl")||!fs.readFileSync(path.join(root,"index.html"),"utf8").includes("formImageUrl")){console.error("v004对象图片区字段缺失");failed=true}
if(!rust.includes("UPDATE_ENDPOINTS")||!rust.includes("UPDATE_CHECK_ATTEMPTS_PER_SOURCE")||!rust.includes("UPDATE_DOWNLOAD_ATTEMPTS")){console.error("v0.4.1更新重试与备用线路逻辑缺失");failed=true}
const css=fs.readFileSync(path.join(root,"public/app/styles.css"),"utf8");
if(!css.includes(".brief-museum-list")||!css.includes("overflow-y:auto")){console.error("v0.4.2简述博物志分类滚动逻辑缺失");failed=true}
if(!app.includes("openPrecisionDossier")||!app.includes("activeDossierTile")||!app.includes("precision-focus-mode")){console.error("v0.4.2精确点博物志逻辑缺失");failed=true}
if(!app.includes("finishRoundAndPublish")||!app.includes("publishPendingRound")||!app.includes("PUBLISH_REPO_KEY")){console.error("v0.4.2完成本轮自动发布逻辑缺失");failed=true}
const bootstrap=fs.readFileSync(path.join(root,"src/desktop-bootstrap.js"),"utf8");
if(!bootstrap.includes('publishPatch:args=>invoke("publish_patch_to_github",args)')||!bootstrap.includes("flushWorkspace")){console.error("v0.4.2桌面发布桥接缺失");failed=true}
if(!rust.includes("publish_patch_to_github")||!rust.includes("submissions/pending")||!rust.includes("run_git_network")||!rust.includes("GitHubDesktop")){console.error("v0.4.2 GitHub数据发布后端缺失");failed=true}
if(!app.includes("precision-hover-cards")||!app.includes("data-precision-preview-object")||!app.includes("precisionPreviewText")){console.error("v0.4.2整合版精确对象悬停窗逻辑缺失");failed=true}
if(!app.includes("Math.exp(-delta*.00155)")||!app.includes("scheduleCameraFrame()")){console.error("v0.4.2整合版无回弹连续缩放逻辑缺失");failed=true}
if(!css.includes(".precision-hover-cards")||!css.includes(".preview-pinned")||!css.includes(".hover-left")||!css.includes(".hover-up")){console.error("v0.4.2整合版精确对象悬停窗样式缺失");failed=true}
const publishWorkflow=fs.readFileSync(path.join(root,"..",".github","workflows","publish-desktop-windows-update.yml"),"utf8");if(!publishWorkflow.includes("Sync stable update feed")||!publishWorkflow.includes("updates/latest.json")){console.error("稳定更新源同步工作流缺失");failed=true}
for(const name of fs.readdirSync(root)){if(/\.key$|PRIVATE_KEY|password/i.test(name)){console.error(`仓库根目录疑似包含密钥：${name}`);failed=true}}
const lock=fs.readFileSync(path.join(root,"package-lock.json"),"utf8");if(lock.includes("applied-caas-gateway")||lock.includes("artifactory/api/npm")){console.error("package-lock仍包含内部依赖地址");failed=true}
console.log(`校验：${initial.objects.length}个对象，程序${edition} / ${pkg.version}，数据版本${initial.metadata.dataVersion}`);if(failed)process.exit(1);
