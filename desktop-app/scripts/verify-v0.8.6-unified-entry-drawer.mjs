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
  const ownerSection=entryDrawer.indexOf('identityDrawerSectionHTML("所属地块档案"');
  const identitySection=entryDrawer.indexOf('identityDrawerSectionHTML("资料身份"');
  const featureSection=entryDrawer.indexOf('identityDrawerSectionHTML("条目特征"');
  const sourceSection=entryDrawer.indexOf('identityDrawerSectionHTML("原文与来源"');
  assert.ok(ownerSection>=0&&ownerSection<identitySection&&identitySection<featureSection&&featureSection<sourceSection);
}
console.log("v0.8.6 详情顺序校验通过：本格主题之后依次显示所属地块档案、资料身份、条目特征和原文来源。");
