import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root=process.cwd();
const readJson=p=>JSON.parse(fs.readFileSync(path.join(root,p),"utf8"));
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

const base=readJson("config/v272-baseline.json");
const version=readJson("VERSION.json");
const app=read("public/app/app.js");
const boot=read("src/desktop-bootstrap.js");

assert.equal(base.sourceWorkbookVersion,"V272");
assert.equal(base.dataVersion,"v272-r0003");
assert.equal(base.formalObjectCount,624);
assert.equal(base.boardPlacementCount,624);
assert.equal(base.boardOccupiedCellCount,497);
assert.equal(base.boardOriginCell,"BX44");
assert.equal(base.mainGridLi,100);
assert.equal(base.mountainChainBaselineLi,97091);
assert.equal(base.waterPathCount,82);
assert.equal(base.waterArrowCellCount,121);
assert.equal(base.eastOuterCore,"STRONG-0");
assert.equal(base.boardLayoutSchema,"v272-board-layout-2");
assert.equal(base.boardBackgroundRunCount,368);
assert.equal(base.boardWorldLabelCount,8);
assert.equal(base.boardAnnotationCount,129);

assert.equal(version.data_version,base.dataVersion);
assert.equal(version.object_count,base.formalObjectCount);
assert.equal(version.board_placement_count,base.boardPlacementCount);
assert.equal(version.board_occupied_cells,base.boardOccupiedCellCount);
assert.equal(version.water_path_segments,base.waterPathCount);
assert.equal(version.water_arrow_cells,base.waterArrowCellCount);
assert.equal(version.board_layout_schema,base.boardLayoutSchema);
assert.equal(version.board_background_runs,base.boardBackgroundRunCount);
assert.equal(version.board_world_labels,base.boardWorldLabelCount);
assert.equal(version.board_annotations,base.boardAnnotationCount);

for(const marker of [
  "const BOARD_LAYOUT = window.SHJ_BOARD_LAYOUT",
  "function objectBoardPlacement",
  "function hasOfficialBoardPlacement",
  "function objectCanvasPoint",
  "function objectCell",
  "board.canvasX",
  "board.canvasY",
  "officialFormalObject",
  "V272_SEEDED_HIERARCHY",
  "function drawV272BoardBackdrop",
  "function drawV272BoardAnnotations",
  "function drawV272BoardWorldLabels",
  "backgroundRuns",
  "BOARD_LAYOUT.annotations",
  "v272-board-flow-badge"
]){
  assert.ok(app.includes(marker),`V272棋盘实装缺少：${marker}`);
}
assert.ok(app.includes("if(hasOfficialBoardPlacement(object))return true"),"正式R号不得再被 object role 隐藏");
assert.ok(app.includes("if(hasOfficialBoardPlacement(object))return false"),"线型水系不得删除正式R号位置锚点");
assert.ok(app.includes("touchesNonMetric&&path.boardAuthoritative!==true"),"L2/L3不得继续使用旧metric路径冒充正式河道");
assert.ok(app.includes("V272正式地图：世界底层直接来自《坐标棋盘图》"),"旧固定山水底图必须退出正式地理表达");
assert.ok(boot.includes('"SHJ_BOARD_LAYOUT"'),"私有 bundle 必须注入棋盘布局");

console.log("PASS V272 board-complete baseline: 624 formal objects / 497 occupied cells / 368 backdrop runs / 129 arrow annotations / BX44 origin.");
