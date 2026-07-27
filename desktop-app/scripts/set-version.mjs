import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(appRoot, "..");
const version = String(process.argv[2] || "").trim().replace(/^v/i, "");

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("用法：node scripts/set-version.mjs 0.7.9");
  process.exit(1);
}

const [major, minor] = version.split(".").map(Number);
const edition = major === 0 ? `v${String(minor).padStart(3, "0")}` : `v${major}${String(minor).padStart(2, "0")}`;

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, value) {
  fs.writeFileSync(file, value, "utf8");
}

function readJson(file) {
  return JSON.parse(read(file));
}

function writeJson(file, value) {
  write(file, `${JSON.stringify(value, null, 2)}\n`);
}

function replaceRequired(file, pattern, replacement, label) {
  const before = read(file);
  const probe = new RegExp(pattern.source, pattern.flags.replace("g", ""));
  if (!probe.test(before)) {
    throw new Error(`无法定位${label}：${path.relative(repoRoot, file)}`);
  }
  const after = before.replace(pattern, replacement);
  if (after !== before) write(file, after);
}

for (const file of [path.join(appRoot, "package.json"), path.join(appRoot, "package-lock.json")]) {
  const json = readJson(file);
  json.version = version;
  if (json.packages?.[""]) json.packages[""].version = version;
  writeJson(file, json);
}

const tauriFile = path.join(appRoot, "src-tauri", "tauri.conf.json");
const tauri = readJson(tauriFile);
tauri.version = version;
writeJson(tauriFile, tauri);

replaceRequired(
  path.join(appRoot, "src-tauri", "Cargo.toml"),
  /(^\[package\][\s\S]*?^version\s*=\s*")[^"]+("$)/m,
  `$1${version}$2`,
  "Cargo版本",
);
replaceRequired(
  path.join(appRoot, "src-tauri", "Cargo.lock"),
  /(\[\[package\]\]\s*\nname = "shj-map-desktop"\s*\nversion = ")[^"]+(")/,
  `$1${version}$2`,
  "Cargo锁文件版本",
);
replaceRequired(
  path.join(appRoot, "src-tauri", "src", "lib.rs"),
  /edition:\s*"v\d+"/,
  `edition: "${edition}"`,
  "Rust版本名称",
);

const indexFile = path.join(appRoot, "index.html");
replaceRequired(indexFile, /(桌面版\s+v\d+\s+·\s+)[0-9A-Za-z.-]+/, `$1${version}`, "页面标题版本");
replaceRequired(indexFile, /(DESKTOP\s+v\d+\s+·\s+)[0-9A-Za-z.-]+/, `$1${version}`, "页面标头版本");

const appFile = path.join(appRoot, "public", "app", "app.js");
replaceRequired(appFile, /(window\.__SHJ_APP_RUNTIME_INFO__=\{version:")[^"]+(")/, `$1${version}$2`, "前端运行时版本");

for (const file of [path.join(repoRoot, "VERSION.json"), path.join(appRoot, "VERSION.json")]) {
  if (!fs.existsSync(file)) continue;
  const json = readJson(file);
  json.app_version = edition;
  json.semver = version;
  writeJson(file, json);
}

console.log(`版本已同步：${edition} / ${version}`);
