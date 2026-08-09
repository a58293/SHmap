import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const version=JSON.parse(read("VERSION.json"));
const rust=read("src-tauri/src/lib.rs");
const bootstrap=read("src/desktop-bootstrap.js");
const html=read("index.html");

assert.equal(version.data_version,"v272-r0001","正式数据版本必须是V272");
assert.equal(version.object_count,624,"V272正式对象应为624");
assert.equal(version.independent_map_objects,598,"26条非独立资料层保持不变后，独立对象应为598");
assert.equal(version.non_tile_records,26);
assert.equal(version.water_path_segments,82,"编译水系记录=79既有路径+3条源点首向记录");
assert.equal(version.water_arrow_cells,121,"V272冻结箭头格应为121");
assert.equal(version.mountain_chain_baseline_li,97091,"五卷逐段基线不得变化");
assert.equal(version.continuous_coastline_segments,0,"四海连续真实岸段必须保持0");
assert.equal(version.outer_land_bridges,0,"外围大陆桥必须保持0");
assert.equal(version.east_strong_core,"STRONG-0","东方不得补造强核心");
assert.ok(!fs.existsSync(path.join(root,"public/app/data.js")),"正式地图不得重新打包到public/app/data.js");
assert.ok(!/app\/data\.js/i.test(html),"index.html不得重新引用data.js");
assert.ok(rust.includes("V272_DATA_MIGRATION_START")&&rust.includes("pre_data_upgrade"),"Rust必须包含V272版本感知数据库迁移");
assert.ok(rust.includes("merge_official_seed_with_current"),"V272升级必须用正式母表替换官方字段并保留本地补充资料");
assert.ok(bootstrap.includes("preferredStartupFallback")&&bootstrap.includes("snapshotDataVersion"),"启动降级不得回退到旧dataVersion缓存");
console.log("V272正式母表升级校验通过：624对象、121箭头格、三层世界结构元数据与版本感知迁移已接入。");
