import fs from "node:fs";import assert from "node:assert/strict";
const app=fs.readFileSync("public/app/app.js","utf8");
const checks=[
  ['V272地域层',app.includes('domainRegionId:region.id')],
  ['低倍率地域大区',app.includes('const macros=h.regions.filter(region=>region.level===1')],
  ['族群提取',app.includes('function v112PopulationNames(object)')],
  ['文明节点',app.includes('function v112IsCivilizationNode(object)')],
  ['国家不作族群分类',!app.includes('civilizationKind==="country"')],
  ['文明无势力范围',app.includes('state.overviewMode==="civilization"||group.domainRegionId')]
];
for(const [name,ok] of checks)assert.ok(ok,name);console.log('PASS overview policy:',checks.map(x=>x[0]).join(' / '));
