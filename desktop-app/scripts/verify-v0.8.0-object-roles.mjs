import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(read("public/app/object-roles.js"), context, { filename: "object-roles.js" });

const manifest = context.window.SHJ_OBJECT_ROLE_MANIFEST;
assert.ok(manifest, "对象角色清单未加载");
assert.equal(manifest.definitions.length, 26, "应明确裁定26条非独立资料记录");
assert.ok(!read("public/app/object-roles.js").includes("SHJ-OBJ-"), "角色清单不得依赖会变化的运行时对象ID");

const definitionCounts = manifest.definitions.reduce((counts, item) => {
  counts[item.mapRole] = (counts[item.mapRole] || 0) + 1;
  return counts;
}, {});
assert.deepEqual(
  JSON.parse(JSON.stringify(definitionCounts)),
  { collection: 4, path: 8, detail: 4, subregion: 4, context: 6 },
  "26条角色定义分组应保持稳定"
);

const byRow = new Map(manifest.definitions.map(item => [item.rowRefSnapshot, item]));
assert.equal(byRow.get("R11")?.mapRole, "collection");
assert.equal(byRow.get("R11")?.members?.length, 9);
assert.equal(byRow.get("R12")?.mapRole, "path");
assert.equal(byRow.get("R60")?.members?.length, 4);
assert.equal(byRow.get("R272")?.members?.length, 3);

for (const item of manifest.definitions.filter(x => ["detail","subregion"].includes(x.mapRole))) {
  assert.ok(item.parent, `${item.rowRefSnapshot} ${item.name} 缺少所属主体`);
}
for (const item of manifest.definitions.filter(x => x.mapRole === "collection")) {
  assert.ok((item.members?.length || 0) >= 2 || (item.virtualMembers?.length || 0) >= 2, `${item.rowRefSnapshot} ${item.name} 集合缺少成员`);
}

const app = read("public/app/app.js");
const html = read("index.html");
const version = JSON.parse(read("VERSION.json"));

assert.ok(!fs.existsSync(path.join(root,"public","app","data.js")), "正式地图已私有化，data.js 不得恢复");
assert.ok(!/app\/data\.js/i.test(html), "index.html 不得重新引用 data.js");
assert.ok(html.indexOf("/app/object-roles.js") >= 0, "角色清单脚本必须保留");
assert.ok(html.indexOf("/app/object-roles.js") < html.indexOf("/src/desktop-bootstrap.js"), "角色清单必须在私有地图启动桥接前加载");
assert.ok(app.includes("window.SHJ_OBJECT_ROLE_MANIFEST?.apply?.(objects)"), "私有地图注入后必须应用对象角色清单");
assert.ok(app.includes("objects.filter(isTileVisibleObject)"), "地块索引必须排除非独立记录");
assert.ok(app.includes("renderRoleRecordDetails"), "集合和资料层必须有独立详情入口");
assert.equal(version.object_count, 617);
if (version.independent_map_objects != null) assert.equal(version.independent_map_objects, 591);
if (version.non_tile_records != null) assert.equal(version.non_tile_records, 26);

console.log("v0.8.0 对象角色分层校验通过：角色定义改为静态清单校验，正式617条地图正文不再从公开 data.js 读取。");
