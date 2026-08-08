import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
for (const path of ["public/app/app.js", "dist/app/app.js"]) {
  const app = read(path);
  for (const marker of [
    "V1.0_PATCH_MERGE_START",
    "function v100MergeGalleryOwners",
    "function v100MergeMuseumEntries",
    "function v100MergeChangedKeys",
    "function v100ForceApplyPatchChange",
    'data-conflict-resolution=',
    "本机当前内容",
    "更改包内容",
    "function v101ConflictResolutionKey",
  ]) assert.ok(app.includes(marker), `${path} 缺少冲突合并标记：${marker}`);
  assert.ok(app.includes('k==="updatedAt"'), `${path} 没有排除更新时间虚假冲突`);
}
for (const path of ["public/app/styles.css", "dist/app/styles.css"]) {
  const css = read(path);
  assert.ok(css.includes(".batch-conflict-panel"));
  assert.ok(css.includes(".batch-conflict-item"));
}

const app = read("public/app/app.js");
const snippet = app.split("// V1.0_PATCH_MERGE_START")[1].split("// V1.0_PATCH_MERGE_END")[0];
const context = {
  cloneJSON: value => value === undefined ? undefined : JSON.parse(JSON.stringify(value)),
  sameValue: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  console,
};
vm.createContext(context);
vm.runInContext(`${snippet};globalThis.merge=v100MergeChangedKeys;`, context);

const image = (url, caption="") => ({id:url,url,caption,source:"",copyright:"",createdAt:""});
const base = {images:[image("asset-a")]};
const local = {images:[image("asset-a"),image("asset-b")]};
const remote = {images:[image("asset-a"),image("asset-c")]};
const gallery = context.merge(local, base, remote, ["images"]);
assert.equal(gallery.ok, true);
assert.deepEqual([...gallery.next.images.map(row=>row.url)].sort(), ["asset-a","asset-b","asset-c"]);
const duplicateLocal={images:[{...image("same-asset"),id:"LOCAL-ID",createdAt:"2026-08-07T01:00:00Z"}]},duplicateRemote={images:[{...image("same-asset"),id:"REMOTE-ID",createdAt:"2026-08-07T02:00:00Z"}]};
const duplicate=context.merge({images:[]},{images:[]},duplicateLocal,["images"]);
const duplicateAcrossDevices=context.merge(duplicateLocal,{images:[]},duplicateRemote,["images"]);
assert.equal(duplicate.ok,true);
assert.equal(duplicateAcrossDevices.ok,true);
assert.equal(duplicateAcrossDevices.next.images.length,1);

const dossierBase = {dossier:{museumEntries:[{name:"甲",sourceCategory:"草木",images:[image("asset-a")] }]}};
const dossierLocal = {dossier:{museumEntries:[{name:"甲",sourceCategory:"草木",images:[image("asset-a"),image("asset-b")] }]}};
const dossierRemote = {dossier:{museumEntries:[{name:"甲",sourceCategory:"草木",images:[image("asset-a")]},{name:"乙",sourceCategory:"鸟兽",images:[image("asset-c")] }]}};
const dossier = context.merge(dossierLocal,dossierBase,dossierRemote,["dossier"]);
assert.equal(dossier.ok,true);
assert.equal(dossier.next.dossier.museumEntries.length,2);
assert.equal(dossier.next.dossier.museumEntries.find(row=>row.name==="甲").images.length,2);

const captionBase={images:[image("asset-a","原说明")]},captionLocal={images:[image("asset-a","本机说明")]},captionRemote={images:[image("asset-a","更改包说明")]};
const unresolved=context.merge(captionLocal,captionBase,captionRemote,["images"]);
assert.equal(unresolved.ok,false);
assert.equal(unresolved.details[0].localValue,"本机说明");
assert.equal(unresolved.details[0].remoteValue,"更改包说明");
const chosen=context.merge(captionLocal,captionBase,captionRemote,["images"],"remote");
assert.equal(chosen.ok,true);
assert.equal(chosen.next.images[0].caption,"更改包说明");
const mixed=context.merge({dossier:{profile:{briefSummary:"本机摘要",detailedSummary:"本机详细"}}},{dossier:{profile:{briefSummary:"原摘要",detailedSummary:"原详细"}}},{dossier:{profile:{briefSummary:"包摘要",detailedSummary:"包详细"}}},["dossier"],path=>path.endsWith("briefSummary")?"remote":"local");
assert.equal(mixed.ok,true);
assert.equal(mixed.next.dossier.profile.briefSummary,"包摘要");
assert.equal(mixed.next.dossier.profile.detailedSummary,"本机详细");
console.log("v1.0.1 图片、内部资料三方合并与逐字段冲突选择校验通过。");
