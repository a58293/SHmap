import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const write = (p, s) => fs.writeFileSync(path.join(root, p), s, "utf8");
const exists = p => fs.existsSync(path.join(root, p));

const EXPECTED = Object.freeze({
  dataVersion: "v272-r0001",
  objectCount: 624,
  waterPathSegments: 82,
  waterArrowCells: 121,
});

const versionPath = "VERSION.json";
const packagePath = "package.json";
const guardPath = "scripts/verify-private-architecture-consistency.mjs";

if (!exists(versionPath) || !exists(packagePath)) {
  throw new Error("请在 desktop-app 目录运行：缺少 VERSION.json 或 package.json");
}

const version = JSON.parse(read(versionPath));
const mismatches = [];
if (version.data_version !== EXPECTED.dataVersion) mismatches.push(`data_version=${version.data_version}`);
if (version.object_count !== EXPECTED.objectCount) mismatches.push(`object_count=${version.object_count}`);
if (version.water_path_segments !== EXPECTED.waterPathSegments) mismatches.push(`water_path_segments=${version.water_path_segments}`);
if (version.water_arrow_cells !== EXPECTED.waterArrowCells) mismatches.push(`water_arrow_cells=${version.water_arrow_cells}`);
if (mismatches.length) {
  throw new Error(
    `当前 VERSION.json 还不是 V272 正式基线，停止修改验证器：${mismatches.join("，")}。\n` +
    `应为 data_version=${EXPECTED.dataVersion}, object_count=${EXPECTED.objectCount}, ` +
    `water_path_segments=${EXPECTED.waterPathSegments}, water_arrow_cells=${EXPECTED.waterArrowCells}`
  );
}

const pkg = JSON.parse(read(packagePath));
const verifyChecks = String(pkg.scripts?.["verify:checks"] || "");
const activeScripts = [
  ...new Set(
    [...verifyChecks.matchAll(/node\s+(scripts\/[\w.\-]+\.mjs)/g)].map(m => m[1])
  ),
];

if (!activeScripts.length) {
  throw new Error("package.json 中没有找到 verify:checks 的脚本列表");
}

const replacements = [
  // object_count
  [/(version\.object_count\s*===\s*)617\b/g, `$1${EXPECTED.objectCount}`],
  [/(version\.object_count\s*!==\s*)617\b/g, `$1${EXPECTED.objectCount}`],
  [/(assert\.equal\(\s*version\.object_count\s*,\s*)617\b/g, `$1${EXPECTED.objectCount}`],
  [/(assert\.strictEqual\(\s*version\.object_count\s*,\s*)617\b/g, `$1${EXPECTED.objectCount}`],

  // water_path_segments
  [/(version\.water_path_segments\s*===\s*)79\b/g, `$1${EXPECTED.waterPathSegments}`],
  [/(version\.water_path_segments\s*!==\s*)79\b/g, `$1${EXPECTED.waterPathSegments}`],
  [/(assert\.equal\(\s*version\.water_path_segments\s*,\s*)79\b/g, `$1${EXPECTED.waterPathSegments}`],
  [/(assert\.strictEqual\(\s*version\.water_path_segments\s*,\s*)79\b/g, `$1${EXPECTED.waterPathSegments}`],

  // water_arrow_cells
  [/(version\.water_arrow_cells\s*===\s*)118\b/g, `$1${EXPECTED.waterArrowCells}`],
  [/(version\.water_arrow_cells\s*!==\s*)118\b/g, `$1${EXPECTED.waterArrowCells}`],
  [/(assert\.equal\(\s*version\.water_arrow_cells\s*,\s*)118\b/g, `$1${EXPECTED.waterArrowCells}`],
  [/(assert\.strictEqual\(\s*version\.water_arrow_cells\s*,\s*)118\b/g, `$1${EXPECTED.waterArrowCells}`],

  // data_version
  [/(version\.data_version\s*===\s*)["']v125-r0001["']/g, `$1"${EXPECTED.dataVersion}"`],
  [/(version\.data_version\s*!==\s*)["']v125-r0001["']/g, `$1"${EXPECTED.dataVersion}"`],
  [/(assert\.equal\(\s*version\.data_version\s*,\s*)["']v125-r0001["']/g, `$1"${EXPECTED.dataVersion}"`],
  [/(assert\.strictEqual\(\s*version\.data_version\s*,\s*)["']v125-r0001["']/g, `$1"${EXPECTED.dataVersion}"`],
];

let changedFiles = [];
for (const script of activeScripts) {
  if (!exists(script)) throw new Error(`verify:checks 引用不存在脚本：${script}`);
  let source = read(script);
  const before = source;

  for (const [pattern, replacement] of replacements) {
    source = source.replace(pattern, replacement);
  }

  // 给最典型的旧标签换成不误导的 V272 标签。
  source = source.replace(
    /\["基础数据保持"\s*,\s*version\.object_count\s*===\s*624\s*&&\s*version\.water_path_segments\s*===\s*82\s*&&\s*version\.water_arrow_cells\s*===\s*121\s*\]/g,
    '["V272正式数据元信息", version.data_version === "v272-r0001" && version.object_count === 624 && version.water_path_segments === 82 && version.water_arrow_cells === 121]'
  );

  if (source !== before) {
    write(script, source);
    changedFiles.push(script);
  }
}

// 在架构守卫里加入“旧数据基线断言”扫描，防止以后再次发生同类回退。
if (!exists(guardPath)) {
  throw new Error(`缺少 ${guardPath}`);
}
let guard = read(guardPath);
if (!guard.includes("V272_STALE_VERIFY_BASELINE_GUARD_START")) {
  const marker = "\nif (failed) process.exit(1);";
  const at = guard.lastIndexOf(marker);
  if (at < 0) throw new Error("无法定位架构守卫结尾，停止修改");

  const block = `
// V272_STALE_VERIFY_BASELINE_GUARD_START
const staleVerifyPatterns = [
  [/version\\\\.object_count\\\\s*(?:===|!==)\\\\s*617\\\\b|assert\\\\.(?:equal|strictEqual)\\\\(\\\\s*version\\\\.object_count\\\\s*,\\\\s*617\\\\b/, "旧对象数617"],
  [/version\\\\.water_path_segments\\\\s*(?:===|!==)\\\\s*79\\\\b|assert\\\\.(?:equal|strictEqual)\\\\(\\\\s*version\\\\.water_path_segments\\\\s*,\\\\s*79\\\\b/, "旧水系记录79"],
  [/version\\\\.water_arrow_cells\\\\s*(?:===|!==)\\\\s*118\\\\b|assert\\\\.(?:equal|strictEqual)\\\\(\\\\s*version\\\\.water_arrow_cells\\\\s*,\\\\s*118\\\\b/, "旧箭头格118"],
  [/version\\\\.data_version\\\\s*(?:===|!==)\\\\s*["']v125-r0001["']|assert\\\\.(?:equal|strictEqual)\\\\(\\\\s*version\\\\.data_version\\\\s*,\\\\s*["']v125-r0001["']/, "旧数据版本v125-r0001"],
];
for (const script of scriptNames) {
  if (!exists(script)) continue;
  const source = read(script);
  for (const [pattern, label] of staleVerifyPatterns) {
    if (pattern.test(source)) fail(\`\${script} 仍硬编码 \${label}，与V272正式母表冲突\`);
  }
}
const v272Version = JSON.parse(read("VERSION.json"));
v272Version.data_version === "v272-r0001" ? ok("VERSION 数据版本为 v272-r0001") : fail(\`VERSION 数据版本异常：\${v272Version.data_version}\`);
v272Version.object_count === 624 ? ok("VERSION 正式对象为624") : fail(\`VERSION 对象数异常：\${v272Version.object_count}\`);
v272Version.water_path_segments === 82 ? ok("VERSION 水系编译记录为82") : fail(\`VERSION 水系记录异常：\${v272Version.water_path_segments}\`);
v272Version.water_arrow_cells === 121 ? ok("VERSION 水系箭头格为121") : fail(\`VERSION 箭头格异常：\${v272Version.water_arrow_cells}\`);
// V272_STALE_VERIFY_BASELINE_GUARD_END
`;
  guard = guard.slice(0, at) + block + guard.slice(at);
  write(guardPath, guard);
  changedFiles.push(guardPath);
}

// 最终重新扫描，任何旧基线都不允许残留在当前实际运行的验证链。
const stale = [];
const staleChecks = [
  [/version\.object_count\s*(?:===|!==)\s*617\b|assert\.(?:equal|strictEqual)\(\s*version\.object_count\s*,\s*617\b/, "object_count=617"],
  [/version\.water_path_segments\s*(?:===|!==)\s*79\b|assert\.(?:equal|strictEqual)\(\s*version\.water_path_segments\s*,\s*79\b/, "water_path_segments=79"],
  [/version\.water_arrow_cells\s*(?:===|!==)\s*118\b|assert\.(?:equal|strictEqual)\(\s*version\.water_arrow_cells\s*,\s*118\b/, "water_arrow_cells=118"],
  [/version\.data_version\s*(?:===|!==)\s*["']v125-r0001["']|assert\.(?:equal|strictEqual)\(\s*version\.data_version\s*,\s*["']v125-r0001["']/, "data_version=v125-r0001"],
];
for (const script of activeScripts) {
  const source = read(script);
  for (const [pattern, label] of staleChecks) {
    if (pattern.test(source)) stale.push(`${script}: ${label}`);
  }
}

if (stale.length) {
  throw new Error(`V272验证链仍有旧基线：\n${stale.join("\n")}`);
}

console.log("V272 CI 基线系统修复完成。");
console.log(`扫描 verify:checks：${activeScripts.length} 个脚本`);
console.log(`实际修改：${[...new Set(changedFiles)].length} 个文件`);
for (const file of [...new Set(changedFiles)]) console.log(`  - ${file}`);
console.log("当前验证链已禁止重新使用 v125 / 617 / 79 / 118 旧数据基线。");
