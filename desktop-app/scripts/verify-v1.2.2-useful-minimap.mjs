import fs from "node:fs";
import assert from "node:assert/strict";

const read = path => fs.readFileSync(path, "utf8");
const pkg = JSON.parse(read("package.json"));
const version = JSON.parse(read("VERSION.json"));
const app = read("public/app/app.js");
const index = read("index.html");
const css = read("public/app/styles.css");

assert.equal(pkg.version, "1.2.2");
assert.equal(version.semver, "1.2.2");
assert.ok(index.includes('id="researchMinimapInfo"'), "missing minimap hover information panel");
assert.ok(app.includes("v122DrawMinimapObjects"), "minimap does not draw object distribution");
assert.ok(app.includes("v122DrawMinimapWaterways"), "minimap does not draw waterways");
assert.ok(app.includes("V122_MINIMAP_LAYERS"), "minimap does not expose L1-L4 world layers");
assert.ok(app.includes("minimap._minimapPoints"), "minimap object hit-test index is missing");
assert.ok(app.includes("best<=9"), "minimap hover hit test is missing");
assert.ok(css.includes(".research-minimap-info"), "minimap information panel styling is missing");
assert.ok(!app.includes("for(const label of (BOARD_LAYOUT.worldLabels||[]).slice(0,32))"), "old long world-label renderer still obscures the overview");
console.log("PASS v1.2.2 useful minimap overview");
