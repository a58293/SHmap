import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const exists = p => fs.existsSync(path.join(root, p));

let failed = false;
const ok = msg => console.log(`✓ ${msg}`);
const fail = msg => {
  console.error(`✗ ${msg}`);
  failed = true;
};

/* ─────────────────────────────────────────────
 * A. Private 架构基础检查
 * ───────────────────────────────────────────── */

for (const p of ["public/app/data.js", "dist/app/data.js"]) {
  exists(p) ? fail(`${p} 不应存在`) : ok(`${p} 不存在`);
}

const html = read("index.html");
/app\/data\.js/i.test(html)
  ? fail("index.html 仍引用 data.js")
  : ok("index.html 不引用 data.js");

const bootstrap = read("src/desktop-bootstrap.js");
bootstrap.includes('invoke("load_private_map_bundle")')
  ? ok("启动使用私有地图加载命令")
  : fail("启动未使用私有地图加载命令");

const rust = read("src-tauri/src/lib.rs");
const rustAuth = read("src-tauri/src/github_auth.rs");

rust.includes("github_auth::publish_private_submission")
  ? ok("更改包使用私有仓库发布层")
  : fail("更改包未使用私有仓库发布层");

rust.includes("Duration::from_secs(180)")
  ? ok("私有上传存在整轮超时")
  : fail("私有上传缺少整轮超时");

rustAuth.includes("submissions/pending/") &&
rustAuth.includes("submissions/assets/")
  ? ok("更改包与图片目标为 SHmap-Data")
  : fail("私有提交目标路径缺失");

for (const marker of [
  "run_git_network",
  "GitHubDesktop",
  "GCM_INTERACTIVE",
  "http.lowSpeedTime=30",
]) {
  if (rust.includes(marker)) {
    fail(`Rust 运行时仍残留旧本地 Git 发布标记：${marker}`);
  }
}

/* ─────────────────────────────────────────────
 * B. 扫描当前真正启用的 verify:checks
 * ───────────────────────────────────────────── */

const pkg = JSON.parse(read("package.json"));
const verifyChecks = String(pkg.scripts?.["verify:checks"] || "");

const scriptNames = [
  ...new Set(
    [...verifyChecks.matchAll(/node\s+(scripts\/[\w.\-]+\.mjs)/g)]
      .map(m => m[1])
  ),
];

for (const script of scriptNames) {
  if (!exists(script)) {
    fail(`verify:checks 引用不存在脚本：${script}`);
    continue;
  }

  const source = read(script);

  const readsOldData =
    /readFileSync\([^)]*data\.js/i.test(source) ||
    /read\(["']public\/app\/data\.js["']\)/i.test(source) ||
    /dataPath\s*=.*data\.js/i.test(source);

  if (readsOldData) {
    fail(`${script} 仍直接读取已删除的 public/app/data.js`);
  }
}

/* ─────────────────────────────────────────────
 * C. V272 正式冻结基线
 *
 * 注意：
 * 这里不用复杂正则字面量拼接，避免 Stage4.1
 * 中出现的转义错误。
 * 只扫描当前启用的验证脚本中对 VERSION 字段的
 * 明确旧值断言。
 * ───────────────────────────────────────────── */

const staleChecks = [
  {
    label: "旧对象数617",
    tests: [
      "version.object_count===617",
      "version.object_count === 617",
      "version.object_count!==617",
      "version.object_count !== 617",
      "assert.equal(version.object_count,617",
      "assert.equal(version.object_count, 617",
      "assert.strictEqual(version.object_count,617",
      "assert.strictEqual(version.object_count, 617",
    ],
  },
  {
    label: "旧水系记录79",
    tests: [
      "version.water_path_segments===79",
      "version.water_path_segments === 79",
      "version.water_path_segments!==79",
      "version.water_path_segments !== 79",
      "assert.equal(version.water_path_segments,79",
      "assert.equal(version.water_path_segments, 79",
      "assert.strictEqual(version.water_path_segments,79",
      "assert.strictEqual(version.water_path_segments, 79",
    ],
  },
  {
    label: "旧箭头格118",
    tests: [
      "version.water_arrow_cells===118",
      "version.water_arrow_cells === 118",
      "version.water_arrow_cells!==118",
      "version.water_arrow_cells !== 118",
      "assert.equal(version.water_arrow_cells,118",
      "assert.equal(version.water_arrow_cells, 118",
      "assert.strictEqual(version.water_arrow_cells,118",
      "assert.strictEqual(version.water_arrow_cells, 118",
    ],
  },
  {
    label: "旧数据版本v125-r0001",
    tests: [
      'version.data_version==="v125-r0001"',
      'version.data_version === "v125-r0001"',
      "version.data_version==='v125-r0001'",
      "version.data_version === 'v125-r0001'",
      'assert.equal(version.data_version,"v125-r0001"',
      'assert.equal(version.data_version, "v125-r0001"',
      "assert.equal(version.data_version,'v125-r0001'",
      "assert.equal(version.data_version, 'v125-r0001'",
    ],
  },
];

for (const script of scriptNames) {
  if (!exists(script)) continue;

  const source = read(script);

  for (const check of staleChecks) {
    if (check.tests.some(token => source.includes(token))) {
      fail(`${script} 仍硬编码 ${check.label}，与 V272 正式母表冲突`);
    }
  }
}

/* ─────────────────────────────────────────────
 * D. VERSION.json 必须与 V272 冻结值一致
 * ───────────────────────────────────────────── */

const version = JSON.parse(read("VERSION.json"));

version.data_version === "v272-r0001"
  ? ok("VERSION 数据版本为 v272-r0001")
  : fail(`VERSION 数据版本异常：${version.data_version}`);

version.object_count === 624
  ? ok("VERSION 正式对象为624")
  : fail(`VERSION 对象数异常：${version.object_count}`);

version.water_path_segments === 82
  ? ok("VERSION 水系编译记录为82")
  : fail(`VERSION 水系记录异常：${version.water_path_segments}`);

version.water_arrow_cells === 121
  ? ok("VERSION 水系箭头格为121")
  : fail(`VERSION 箭头格异常：${version.water_arrow_cells}`);

/* ───────────────────────────────────────────── */

if (failed) process.exit(1);

console.log("Private architecture consistency verification passed.");
