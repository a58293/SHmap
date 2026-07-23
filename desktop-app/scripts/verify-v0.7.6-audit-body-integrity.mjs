import fs from "node:fs";
import assert from "node:assert/strict";

function fnv64(value){
  let hash=0xcbf29ce484222325n;
  for(const byte of new TextEncoder().encode(String(value||""))){
    hash^=BigInt(byte);
    hash=BigInt.asUintN(64,hash*0x100000001b3n);
  }
  return hash.toString(16).padStart(16,"0");
}
function bodyFingerprint(value){
  return fnv64(String(value||"").replace(/^\uFEFF/,"").replace(/\r\n?/g,"\n").trim());
}
function auditBody(text){
  const match=String(text||"").replace(/^\uFEFF/,"").match(/^\s*<!--\s*SHMAP_AUDIT_V1\s*:\s*([A-Za-z0-9+/=]+)\s*-->/);
  assert.ok(match,"缺少审核头");
  const meta=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(match[1]),c=>c.charCodeAt(0))));
  const body=text.slice(match[0].length).replace(/\r\n?/g,"\n").trim();
  return {meta,body};
}

for(const path of ["public/app/app.js","dist/app/app.js"]){
  const app=fs.readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
  assert.ok(app.includes("applyImportPolicyToAnalysis(parseMarkdown(text))"),`${path} 没有按原文解析`);
  assert.ok(!app.includes("applyImportPolicyToAnalysis(parseMarkdown(normalizeNineSectionMarkdown(text)))"),`${path} 仍在审核前改写正文`);
}
console.log("v0.7.6 审核正文完整性修正校验通过。");
