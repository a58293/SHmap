import fs from "node:fs";
import assert from "node:assert/strict";
const read=path=>fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const functionBlock=(source,name,next)=>{
  const start=source.indexOf(`function ${name}(`);
  const end=source.indexOf(`function ${next}(`,start+1);
  return source.slice(start,end>start?end:source.length);
};
for(const path of ["public/app/app.js","dist/app/app.js"]){
  const app=read(path);
  const objectDrawer=functionBlock(app,"openIdentityObjectDrawer","openIdentityDossierEntryDrawer");
  const entryDrawer=functionBlock(app,"openIdentityDossierEntryDrawer","renderIdentityBoard");
  assert.ok(app.includes('class="identity-drawer-organized internal-entry"'));
  assert.ok(app.includes('identityDrawerSectionHTML("资料身份"'));
  assert.ok(app.includes('identityDrawerSectionHTML("条目特征"'));
  assert.ok(app.includes('identityDrawerSectionHTML("原文与来源"'));
  assert.ok(app.includes('identityDrawerSectionHTML("所属地块档案"'));
  assert.ok(app.includes("data-entry-owner-full"));
  assert.ok(app.includes("data-entry-owner-locate"));
  assert.ok(app.includes("data-entry-owner-topic"));
  assert.ok(objectDrawer.includes('${topicStrip}${sections||`<div class="dossier-empty">该对象尚未录入更多资料。</div>`}'));
  assert.ok(entryDrawer.includes('${topicStrip}${sections||`<div class="dossier-empty">该条目尚未录入更多资料。</div>`}'));
}
console.log("v0.8.5 详情顺序校验通过：本格资料主题位于顶部摘要之后、资料身份之前。");
