import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), "utf8");
let failed = false;
const error = message => { console.error(`v0.5.3校验失败：${message}`); failed = true; };

for (const file of [
  "vite.config.js",
  "scripts/v053-core.mjs",
  "scripts/import-master-v053.mjs",
  "public/app/app.js",
  "public/app/data.js",
  "src/desktop-bootstrap.js",
  "index.html"
]) if (!fs.existsSync(path.join(root, file))) error(`缺少 ${file}`);

function extractAssignedJson(source, marker) {
  const index = source.indexOf(marker);
  if (index < 0) throw new Error(`找不到 ${marker}`);
  let start = index + marker.length;
  while (/\s/.test(source[start] || "")) start += 1;
  const opener = source[start], closer = opener === "{" ? "}" : opener === "[" ? "]" : null;
  if (!closer) throw new Error(`${marker} 后不是JSON`);
  let depth = 0, inString = false, escape = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      if (escape) escape = false;
      else if (char === "\\") escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === opener) depth += 1;
    else if (char === closer && --depth === 0) return JSON.parse(source.slice(start, i + 1));
  }
  throw new Error(`${marker} 数据未闭合`);
}

try {
  const pkg = JSON.parse(read("package.json"));
  const conf = JSON.parse(read("src-tauri/tauri.conf.json"));
  const meta = JSON.parse(read("VERSION.json"));
  const cargoVersion = read("src-tauri/Cargo.toml").match(/^version\s*=\s*"([^"]+)"/m)?.[1];
  if ([pkg.version, conf.version, cargoVersion, meta.semver].some(version => version !== "0.5.3")) {
    error(`版本未统一：package=${pkg.version} tauri=${conf.version} cargo=${cargoVersion} VERSION=${meta.semver}`);
  }

  const vite = read("vite.config.js");
  if (/patchAppJs|migrateDataJs|virtual:shmap-v053-entry/.test(vite)) error("Vite仍在运行时拼接地图脚本，会造成双实例渲染");
  if (!vite.includes('port: 1420') || !vite.includes('strictPort: true')) error("Vite端口未固定为1420");

  const index = read("index.html");
  if (!index.includes('<script src="/app/data.js"></script>')) error("index.html未先载入data.js");
  if (!index.includes('<script type="module" src="/src/desktop-bootstrap.js"></script>')) error("index.html未载入桌面启动桥");
  if (index.includes("v053-entry.js")) error("index.html仍引用旧运行时补丁入口");

  const app = read("public/app/app.js");
  for (const marker of [
    "window.__SHJ_APP_INSTANCE_ACTIVE__",
    'renderArchitecture:"single-static-runtime"',
    "if (state.regionOverviewMode) return",
    "ensureRegionOverviewNode",
    "nonWaterLineStyle",
    "waterDirectionMode",
    "renderCameraFrame();",
    "translate3d(${tx}px,${ty}px,0)",
    "V053_REGION_RANGE_PALETTE",
    "v053RegionRangeGeometry",
    "regionRangeCache",
    "显示大区／区域分布范围与水系"
  ]) if (!app.includes(marker)) error(`静态主程序缺少 ${marker}`);

  const bootstrap = read("src/desktop-bootstrap.js");
  if (!bootstrap.includes("if(!window.__SHJ_APP_INSTANCE_ACTIVE__)")) error("桌面启动桥缺少单实例保护");
  if (!bootstrap.includes('script.dataset.shjMainApp="1"')) error("桌面启动桥缺少主脚本唯一标识");

  const data = read("public/app/data.js");
  const initial = extractAssignedJson(data, "window.SHJ_INITIAL_DATA=");
  const paths = extractAssignedJson(data, "window.SHJ_WATER_PATHS=");
  const hierarchy = extractAssignedJson(data, "window.SHJ_WORLD_HIERARCHY=");
  if (initial.objects?.length !== 617) error(`对象数量异常：${initial.objects?.length}`);
  if (paths.length !== 79) error(`水系路径数量异常：${paths.length}`);
  if (!hierarchy?.regions?.length) error("世界／区域层级为空");
  if (initial.metadata?.hierarchyMigration !== "v0.5.3-strict-region-and-local-water-bounds") error("数据迁移标记缺失");

  const css = read("public/app/styles.css");
  if (!css.includes("v0.5.3 · 单实例渲染与区域概览稳定性")) error("区域概览稳定样式缺失");
} catch (exception) {
  error(exception.stack || exception.message);
}

if (failed) process.exit(1);
console.log("v0.5.3专项校验：通过（单实例启动、区域分布范围缓存、白块隔离与地图切换性能）。");
