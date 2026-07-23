import fs from "node:fs";

const app=fs.readFileSync(new URL("../public/app/app.js",import.meta.url),"utf8");
const fixture=fs.readFileSync(new URL("./fixture-苍梧之丘-九段式.md",import.meta.url),"utf8");

function isDirectOriginalRelation(value){
  return String(value||"").split(/\n+/).some(part=>/^原文直载(?:\s*[（(][^）)]*[）)])?$/u.test(part.replace(/^[\-•·*]+\s*/,"").trim()))
}
function directOriginalRelationHint(value){
  const hit=String(value||"").match(/原文直载\s*[（(]([^）)]{1,12})[）)]/u);
  return String(hit?.[1]||"").trim()
}
function originalExcerptCandidates(value){
  const text=String(value||"").replace(/\r\n?/g,"\n").trim();if(!text)return [];
  const quoted=[...text.matchAll(/[“"]([^”"]{2,800})[”"]/g)].map(m=>m[1].trim()).filter(Boolean);
  if(quoted.length)return [...new Set(quoted)];
  const cleaned=text.replace(/(?:出自|见于|载于)\s*《[^》]+》[。；;]?/g,"").trim();
  const lines=cleaned.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  if(lines.length>1)return [...new Set(lines)];
  return [...new Set(cleaned.split(/(?<=[。！？!?])\s*/).map(x=>x.trim()).filter(Boolean))]
}
function entryNameTokens(value){
  const raw=String(value||"").trim(),tokens=[raw];
  const stripped=raw.replace(/[（(][^）)]*[）)]/g,"").replace(/(?:遗迹|区域|分段|源段|中游段|下游段)$/g,"").trim();
  if(stripped&&stripped!==raw)tokens.push(stripped);
  if(/^帝./.test(stripped))tokens.push(stripped.slice(1));
  return [...new Set(tokens.filter(x=>x.length>=1))]
}
function originalExcerptForEntry(excerpt,name,relation){
  if(!isDirectOriginalRelation(relation))return "";
  const candidates=originalExcerptCandidates(excerpt);if(!candidates.length)return "";
  const tokens=entryNameTokens(name),hint=directOriginalRelationHint(relation),genericHints=new Set(["有","在","中","见","载","居","经"]);
  let best=candidates[0],bestScore=-1;
  candidates.forEach(candidate=>{
    let score=0;
    tokens.forEach((token,index)=>{if(candidate.includes(token))score+=index===0?20:10});
    if(hint&&!genericHints.has(hint)&&candidate.includes(hint))score+=7;
    if(/葬/.test(hint)&&/葬/.test(candidate))score+=5;
    if(score>bestScore){bestScore=score;best=candidate}
  });
  return best
}

const excerpt=(fixture.match(/##\s*07[^\n]*\n([\s\S]*?)(?=\n##\s*08)/)||[])[1]?.trim()||"";
const expected="有苍梧之丘，苍梧之渊，其中有九疑山，舜之所葬，在长沙零陵界中。";
const tests=[
  ["识别原文直载（葬）",isDirectOriginalRelation("原文直载（葬）")],
  ["非原文直载不触发",!isDirectOriginalRelation("地图推定附近")],
  ["帝舜匹配葬原文",originalExcerptForEntry(excerpt,"帝舜","原文直载（葬）")===expected],
  ["苍梧之丘匹配原文",originalExcerptForEntry(excerpt,"苍梧之丘","原文直载（有）")===expected],
  ["非直载关系不替换",originalExcerptForEntry(excerpt,"帝舜","安葬于此")===""],
  ["主程序包含同一原文匹配器",/function originalExcerptForEntry\(excerpt,name,relation\)/.test(app)],
  ["卡片接入原文摘录",/relationRow=directOriginal\?\["原文",o\.originalExcerpt\]/.test(app)],
  ["导入对象携带第07节原文",/profileOriginal=main\?\.dossier\?\.profile\?\.tileOriginalExcerpt/.test(app)&&/originalExcerptForEntry\(profileOriginal,e\.name,e\.localRelation\)/.test(app)],
  ["对象详情接入原文摘录",/showImportedOriginal=isDirectOriginalRelation\(imported\.localRelation\)&&hasText\(imported\.originalExcerpt\)/.test(app)]
];
for(const [name,ok] of tests)console.log(`${ok?"✓":"✗"} ${name}`);
if(tests.some(([,ok])=>!ok))process.exit(1);
