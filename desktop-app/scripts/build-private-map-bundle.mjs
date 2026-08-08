import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const [inputArg = "public/app/data.js", outputArg = "../SHmap-Data"] = process.argv.slice(2);
const inputPath = path.resolve(process.cwd(), inputArg);
const outputRoot = path.resolve(process.cwd(), outputArg);
const productionDir = path.join(outputRoot, "production");

if (!fs.existsSync(inputPath)) {
  throw new Error(`找不到源数据文件：${inputPath}`);
}

const source = fs.readFileSync(inputPath, "utf8");
const names = [
  "SHJ_INITIAL_DATA",
  "SHJ_WATER_PATHS",
  "SHJ_WORLD_HIERARCHY",
  "SHJ_ORIGINAL_LIBRARY",
  "SHJ_SPEC_SUMMARY",
];

function extractJsonAssignment(name) {
  const marker = `window.${name}=`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`源文件缺少 ${marker}`);
  let cursor = start + marker.length;
  while (/\s/.test(source[cursor] ?? "")) cursor += 1;
  const first = source[cursor];
  if (first !== "{" && first !== "[") throw new Error(`${name} 不是 JSON 对象/数组`);
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = cursor; i < source.length; i += 1) {
    const ch = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{" || ch === "[") depth += 1;
    if (ch === "}" || ch === "]") depth -= 1;
    if (depth === 0) return JSON.parse(source.slice(cursor, i + 1));
  }
  throw new Error(`${name} JSON 未闭合`);
}

const globals = Object.fromEntries(names.map((name) => [name, extractJsonAssignment(name)]));
const initial = globals.SHJ_INITIAL_DATA;
const metadata = initial?.metadata ?? {};
const bundle = {
  format: "shmap-private-bootstrap-v1",
  dataVersion: metadata.dataVersion ?? "",
  globals,
};
const payload = JSON.stringify(bundle);
const sha256 = crypto.createHash("sha256").update(payload, "utf8").digest("hex");
const manifest = {
  schemaVersion: "shmap-private-data-manifest-v1",
  dataVersion: metadata.dataVersion ?? "",
  dataPath: "production/map-data.json",
  sha256,
  objectCount: Array.isArray(initial?.objects) ? initial.objects.length : 0,
  paragraphEntryCount: Array.isArray(globals.SHJ_ORIGINAL_LIBRARY) ? globals.SHJ_ORIGINAL_LIBRARY.length : 0,
  waterPathCount: Array.isArray(globals.SHJ_WATER_PATHS) ? globals.SHJ_WATER_PATHS.length : 0,
  generatedAt: new Date().toISOString(),
  sourceFile: inputArg.replaceAll("\\", "/"),
  minimumDesktopVersion: "1.0.5",
};

fs.mkdirSync(productionDir, { recursive: true });
fs.writeFileSync(path.join(productionDir, "map-data.json"), payload);
fs.writeFileSync(path.join(outputRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
if (!fs.existsSync(path.join(outputRoot, ".gitattributes"))) {
  fs.writeFileSync(path.join(outputRoot, ".gitattributes"), "manifest.json text eol=lf\nproduction/*.json -text\n");
}

console.log(`✓ 私有地图数据：${path.join(productionDir, "map-data.json")}`);
console.log(`✓ manifest：${path.join(outputRoot, "manifest.json")}`);
console.log(`✓ 数据版本：${manifest.dataVersion}`);
console.log(`✓ 对象数：${manifest.objectCount}`);
console.log(`✓ SHA-256：${sha256}`);
console.log("注意：确认 SHmap-Data 已提交后，再删除 public/app/data.js。\n");
