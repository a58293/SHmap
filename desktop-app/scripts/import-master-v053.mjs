import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { migrateDataJs } from "./v053-core.mjs";

const root = process.cwd();
const originalImporter = path.join(root, "scripts", "import-master.mjs");
const dataFile = path.join(root, "public", "app", "data.js");

if (!fs.existsSync(originalImporter)) {
  console.error("v0.5.3：找不到原有 scripts/import-master.mjs");
  process.exit(1);
}

const run = spawnSync(process.execPath, [originalImporter, ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
  windowsHide: false
});
if (run.error) {
  console.error(`v0.5.3：母表导入启动失败：${run.error.message}`);
  process.exit(1);
}
if (run.status !== 0) process.exit(run.status ?? 1);

try {
  const original = fs.readFileSync(dataFile, "utf8");
  const migrated = migrateDataJs(original);
  fs.writeFileSync(dataFile, migrated.source, "utf8");
  console.log(`v0.5.3 数据归一化完成：${migrated.stats.objects}个对象、${migrated.stats.paths}段水系、${migrated.stats.macros}个世界大区、${migrated.stats.regions}个地图区域。`);
} catch (error) {
  console.error(`v0.5.3：导入后数据归一化失败：${error.message}`);
  process.exit(1);
}
