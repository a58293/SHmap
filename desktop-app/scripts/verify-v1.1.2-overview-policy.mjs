import fs from "node:fs";
import assert from "node:assert/strict";

const app=fs.readFileSync("public/app/app.js","utf8");
assert.ok(app.includes("showDetails=overviewZoom>=.14"));
assert.ok(app.includes("showMacroLabels=overviewZoom<.14"));
assert.ok(app.includes("detailDomain=state.overviewMode===\"domain\"&&!group.macroRegion"));
assert.ok(app.includes("const title=`${objects.length}"));
assert.ok(app.includes("v122DrawMinimapObjects"));
assert.ok(app.includes("zoomBand=zoom<.14?\"macro\":zoom<.52?\"detail\":\"evidence\""));
console.log("PASS v1.1.2 overview policy retained with v1.2.2 useful minimap.");
