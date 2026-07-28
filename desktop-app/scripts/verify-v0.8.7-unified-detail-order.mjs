import fs from "node:fs";
import assert from "node:assert/strict";

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const functionBlock = (source, name, next) => {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${next}(`, start + 1);
  return source.slice(start, end > start ? end : source.length);
};

for (const file of ["public/app/app.js", "dist/app/app.js"]) {
  const app = read(file);
  const order = functionBlock(app, "identityDrawerOrderedSectionsHTML", "openIdentityObjectDrawer");
  const objectDrawer = functionBlock(app, "openIdentityObjectDrawer", "openIdentityDossierEntryDrawer");
  const entryDrawer = functionBlock(app, "openIdentityDossierEntryDrawer", "renderIdentityBoard");

  assert.ok(order.includes('identityDrawerSectionHTML("所属地块档案"'));
  assert.ok(order.includes('identityDrawerSectionHTML("资料身份"'));
  assert.ok(order.includes('identityDrawerSectionHTML("条目特征"'));
  assert.ok(
    order.indexOf('"所属地块档案"') <
      order.indexOf('"资料身份"') &&
      order.indexOf('"资料身份"') <
      order.indexOf('"条目特征"')
  );

  assert.ok(objectDrawer.includes("identityDrawerOrderedSectionsHTML({"));
  assert.ok(entryDrawer.includes("identityDrawerOrderedSectionsHTML({"));
  assert.ok(objectDrawer.includes('identityDrawerFieldHTML("09. 详细描述",profile.detailedSummary'));
  assert.ok(entryDrawer.includes('identityDrawerFieldHTML("09. 详细描述",profile.detailedSummary'));
  assert.ok(!objectDrawer.includes('identityDrawerSectionHTML("地块身份与位置"'));
  assert.ok(!objectDrawer.includes('identityDrawerSectionHTML("对象特征"'));

  assert.ok(objectDrawer.includes('${topicStrip}${sections||`<div class="dossier-empty">该对象尚未录入更多资料。</div>`}'));
  assert.ok(entryDrawer.includes('${topicStrip}${sections||`<div class="dossier-empty">该条目尚未录入更多资料。</div>`}'));
}

console.log("v0.8.7 统一详情顺序校验通过：所有对象类型共用所属地块档案、资料身份、条目特征排序器。");
