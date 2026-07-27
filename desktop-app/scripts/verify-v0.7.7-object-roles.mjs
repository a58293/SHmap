import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(read("public/app/data.js"), context, { filename: "data.js" });
vm.runInContext(read("public/app/object-roles.js"), context, { filename: "object-roles.js" });

const initial = context.window.SHJ_INITIAL_DATA;
const manifest = context.window.SHJ_OBJECT_ROLE_MANIFEST;
assert.ok(initial, "基础数据未加载");
assert.ok(manifest, "对象角色清单未加载");
assert.equal(initial.objects.length, 617, "617条历史资料记录必须保持不变");
assert.equal(manifest.definitions.length, 26, "应明确裁定26条非独立资料记录");
assert.ok(!read("public/app/object-roles.js").includes("SHJ-OBJ-"), "角色清单不得依赖会变化的运行时对象ID");

const objects = manifest.apply(initial.objects);
const byRow = new Map(objects.map((object) => [object.rowRef, object]));
const roleCounts = objects.reduce((counts, object) => {
  counts[object.mapRole] = (counts[object.mapRole] || 0) + 1;
  return counts;
}, {});

assert.deepEqual(
  JSON.parse(JSON.stringify(roleCounts)),
  { entity: 591, collection: 4, path: 8, detail: 4, subregion: 4, context: 6 },
);
assert.equal(objects.filter((object) => object.mapRole === "entity" && object.tileVisible !== false).length, 591);

const nineHills = byRow.get("R11");
assert.equal(nineHills.mapRole, "collection");
assert.equal(nineHills.tileVisible, false);
assert.equal(nineHills.roleMemberSelectors.length, 9);
for (const row of ["R13", "R14", "R15", "R16", "R17", "R18", "R19", "R20", "R21"]) {
  assert.equal(byRow.get(row)?.mapRole, "entity", `${row}必须继续作为九丘成员地块显示`);
}
assert.equal(byRow.get("R12")?.mapRole, "path", "九丘水络必须是路径层");
assert.equal(byRow.get("R60")?.roleMemberSelectors.length, 4, "帝台集合必须关联R61—R64四个具名帝台");
assert.equal(byRow.get("R272")?.roleMemberSelectors.length, 3, "岷三江必须关联大江、北江、南江");

for (const object of objects.filter((item) => item.mapRole === "collection")) {
  assert.ok(
    object.roleMemberSelectors.length >= 2 || object.roleVirtualMembers.length >= 2,
    `${object.rowRef} ${object.name} 集合缺少成员`,
  );
}
for (const object of objects.filter((item) => ["detail", "subregion"].includes(item.mapRole))) {
  assert.ok(object.roleParentSelector, `${object.rowRef} ${object.name} 缺少所属主体`);
}
for (const object of objects.filter((item) => item.mapRole === "path")) {
  assert.equal(object.geometryType, "line", `${object.rowRef} ${object.name} 路径层必须保持线型语义`);
}

const app = read("public/app/app.js");
const html = read("index.html");
const version = JSON.parse(read("VERSION.json"));
assert.ok(html.indexOf("/app/object-roles.js") > html.indexOf("/app/data.js"), "角色清单必须在基础数据之后加载");
assert.ok(html.indexOf("/app/object-roles.js") < html.indexOf("/src/desktop-bootstrap.js"), "角色清单必须在数据库启动前加载");
assert.ok(app.includes("objects.filter(isTileVisibleObject)"), "地块索引必须排除非独立记录");
assert.ok(app.includes("renderRoleRecordDetails"), "集合和资料层必须有独立详情入口");
assert.ok(app.includes("独立对象 / ${state.objects.length}条资料"), "界面必须区分独立对象和历史资料记录");
assert.equal(version.object_count, 617);
assert.equal(version.independent_map_objects, 591);
assert.equal(version.non_tile_records, 26);

console.log("v0.7.7 对象角色分层校验通过：591个独立对象，26条非地块资料记录，617条历史资料完整保留。");
