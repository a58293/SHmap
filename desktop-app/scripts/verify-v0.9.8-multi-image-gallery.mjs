import fs from "node:fs";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const sourceApp = read("public/app/app.js");
const sourceHtml = read("index.html");
const sourceCss = read("public/app/styles.css");
const distApp = read("dist/app/app.js");
const distHtml = read("dist/index.html");
const distCss = read("dist/app/styles.css");
const rustSource = read("src-tauri/src/lib.rs");
const cargoToml = read("src-tauri/Cargo.toml");

const checks = [
  [sourceHtml.includes('id="tileSubjectImageManager"'), "地块编辑器包含主题图库入口"],
  [sourceHtml.includes('id="tileSubjectImageTabs"'), "主题归属选择列表存在"],
  [sourceApp.includes("function normalizedImageGallery"), "旧单图与图库兼容归一化存在"],
  [sourceApp.includes("function applyImageGallery"), "图库主图向旧字段同步存在"],
  [sourceApp.includes("function v098TileImageSubjects"), "地块／对象／内部条目主题枚举存在"],
  [sourceApp.includes('kind:"entry"'), "第06节内部条目可独立管理图片"],
  [sourceApp.includes('multiple hidden'), "图库支持一次选择多张图片"],
  [sourceApp.includes("v060ImageFileToDataUrl(file)"), "图库复用自动WebP转换"],
  [sourceApp.includes("preparePatchImageAssets") && sourceApp.includes("if(Array.isArray(value))return Promise.all(value.map(transform))"), "更改包递归打包图库图片"],
  [sourceCss.includes(".v098-gallery-grid") && sourceCss.includes(".subject-image-tabs"), "图库与图片归属界面样式存在"],
  [sourceApp.includes('version:"1.0.5"') && sourceHtml.includes("1.0.5"), "运行时与界面版本均为1.0.5"],
  [distApp.includes("function normalizedImageGallery") && distHtml.includes('id="tileSubjectImageManager"') && distCss.includes(".v098-gallery-grid"), "dist已同步多图图库"],
];

checks.push(
  [sourceApp.includes("assetPayloads:prepared.assets.map(({fileName,dataBase64})"), "GitHub上传使用紧凑Base64图片负载"],
  [rustSource.includes("data_base64: String") && rustSource.includes("decode_publish_assets"), "桌面端支持Base64图片负载"],
  [rustSource.includes('GCM_INTERACTIVE", "never"') && rustSource.includes('http.lowSpeedTime=30'), "Git上传不会无限等待凭据或失速网络"],
  [cargoToml.includes('base64 = "0.22"'), "桌面端Base64依赖已声明"],
  [sourceApp.includes("function dossierSubjectImageHTML") && sourceApp.includes("normalizedImageGallery(subject)"), "博物志顶部读取当前主题图库"],
  [sourceApp.includes("dossierSubjectImageHTML(profile,main,name)") && sourceApp.includes('dossierSubjectImageHTML(profile,main,main?.name||profile.tileType||"地块","full")'), "简述与完整页均随当前主题切换图片"],
  [sourceApp.includes("if(!primary?.url)return tileProfileImageHTML(profile,name,mode)"), "主题无图时安全回退地块主体图"],
);

const failed = checks.filter(([ok]) => !ok);
for (const [ok, label] of checks) console.log(`${ok ? "✓" : "✗"} ${label}`);
if (failed.length) process.exit(1);
console.log("v0.9.8 multi-image gallery verification passed");
