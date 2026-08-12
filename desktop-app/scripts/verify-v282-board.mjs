import fs from "node:fs";
import assert from "node:assert/strict";

const baseline=JSON.parse(fs.readFileSync("config/v282-baseline.json","utf8"));
const version=JSON.parse(fs.readFileSync("VERSION.json","utf8"));
const app=fs.readFileSync("public/app/app.js","utf8");
const rust=fs.readFileSync("src-tauri/src/lib.rs","utf8");

assert.equal(baseline.sourceWorkbookVersion,"V282");
assert.equal(baseline.dataVersion,"v282-r0001");
assert.equal(baseline.formalObjectCount,1378);
assert.equal(baseline.boardPlacementCount,1378);
assert.equal(baseline.boardOccupiedCellCount,875);
assert.deepEqual(baseline.worldLayers,{L1:1034,L2:35,L3:53,L4:256});
assert.deepEqual(baseline.coordinateStatus,{"关系锁定":115,"红色推定":1263});
assert.equal(version.data_version,"v282-r0001");
assert.equal(version.object_count,1378);
assert.equal(version.board_placement_count,1378);
assert.equal(version.board_occupied_cells,875);
assert.equal(version.board_layout_schema,"v282-board-layout-1");
assert.ok(app.includes('^v(?:272|282)-board-layout'),"前端没有接入V282棋盘布局");
assert.ok(!/startsWith\("v272-board-layout"\)&&Array\.isArray/.test(app),"前端仍只接受V272棋盘");
assert.ok(rust.includes("authoritative_v282"),"SQLite迁移未声明V282权威母表策略");
assert.ok(rust.includes("LOCAL_OBJECT_FIELDS"),"迁移未保护本地博物志和图片");
console.log("PASS V282 baseline: 1378 objects / 875 cells / L1-L4 / authoritative migration");
