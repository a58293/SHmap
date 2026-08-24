import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root=path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(?:[A-Za-z]:)/,m=>m.slice(1))),"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const app=read("public/app/app.js");
const html=read("index.html");
const css=read("public/app/styles.css");
const pkg=JSON.parse(read("package.json"));
const version=JSON.parse(read("VERSION.json"));
const cargo=read("src-tauri/Cargo.toml");
const tauri=JSON.parse(read("src-tauri/tauri.conf.json"));
const auth=read("src-tauri/src/github_auth.rs");
const nativeLib=read("src-tauri/src/lib.rs");
const bootstrap=read("src/desktop-bootstrap.js");
const bundleTool=read("../SHmap-Data-bundle-setup/tools/build-shjpatch-bundle.mjs");
const bundleWorkflow=read("../SHmap-Data-bundle-setup/.github/workflows/build-change-bundle.yml");

assert.equal(pkg.version,"1.3.0","package.json version");
assert.equal(version.semver,"1.3.0","VERSION.json semver");
assert.equal(tauri.version,"1.3.0","tauri version");
assert.match(cargo,/version\s*=\s*"1\.3\.0"/);
assert.match(pkg.scripts["verify:v130"],/verify-v1\.3\.0-water-workspace-and-bundle/);

for(const id of ["openWaterWorkspaceBtn","waterWorkspace","waterEditorCanvas","waterPathList","waterSaveBtn","waterUndoBtn","waterRedoBtn","waterPointsText","waterValidation"])assert.ok(html.includes(`id="${id}"`),`missing #${id}`);
assert.match(css,/\.water-workspace\s*\{/);
assert.match(css,/\.water-workspace-layout\s*\{/);
assert.match(app,/function setupWaterFlowWorkspace\(/);
assert.match(app,/function saveWaterEditorPath\(/);
assert.match(app,/function migrateWorkspaceWaterPaths\(/);
assert.match(app,/waterPaths:state\.waterPaths/);
assert.match(app,/entityType:"water_path"/);
assert.match(app,/action\.entityType==="water_path"/);
assert.match(app,/state\.waterPaths=simulation\.draft\.waterPaths/);
assert.match(app,/editedIn="SHmap v1\.3\.0 water workspace"/);

assert.match(app,/fetchGithubConsolidatedBundle/);
assert.match(app,/submissions\/bundles\/latest\.shjbundle/);
assert.match(app,/loadGithubBatchItems/);
assert.match(app,/若汇总包尚未生成，才兼容读取缺失的旧包/);
assert.match(auth,/submissions\/bundles\/latest\.shjbundle/);
assert.match(auth,/consolidated_bundle/);
assert.match(bundleTool,/shjpatch-bundle-v1/);
assert.match(bundleTool,/latest\.shjbundle/);
assert.match(bundleWorkflow,/build-shjpatch-bundle\.mjs/);
assert.match(bundleWorkflow,/submissions\/pending\/\*\.shjpatch/);
assert.match(bootstrap,/PRIVATE_DATA_TIMEOUT_MS = 120000/);
assert.match(bootstrap,/DESKTOP_VERSION = "1\.3\.0"/);
assert.match(auth,/join\("private-map-cache"\)/);
assert.match(auth,/manifest\.sha256\.eq_ignore_ascii_case\(&cached_sha\)/);
assert.match(auth,/fs::rename\(&temporary_path, &cache_path\)/);
assert.match(auth,/fs::remove_file\(&cache_path\)/);
assert.match(nativeLib,/load_private_map_bundle\(&github_state, &app\)/);

console.log("PASS v1.3.0 water-flow workspace, restart persistence, water-path patch merge and consolidated bundle fallback");