import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {spawnSync} from "node:child_process";
import crypto from "node:crypto";

const projectRoot=process.cwd();
const inputArg=process.argv[2];
if(!inputArg){
  console.error('用法：npm run import:master -- "新版母表.xlsx"');
  process.exit(1);
}
const inputPath=path.resolve(inputArg);
if(!fs.existsSync(inputPath)){console.error(`找不到母表：${inputPath}`);process.exit(1)}
const outputPath=path.join(projectRoot,"public","app","data.js");
const reportPath=path.join(projectRoot,"water-path-validation.json");
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"shmap-master-"));

function run(command,args){const r=spawnSync(command,args,{stdio:"inherit"});if(r.status!==0)throw new Error(`${command} 执行失败`)}
function extractXlsx(){
  if(process.platform==="win32"){
    const zipPath=path.join(tmp,"master.zip");fs.copyFileSync(inputPath,zipPath);
    const escaped=s=>s.replace(/'/g,"''");
    run("powershell",["-NoProfile","-ExecutionPolicy","Bypass","-Command",`Expand-Archive -LiteralPath '${escaped(zipPath)}' -DestinationPath '${escaped(tmp)}' -Force`]);
  }else run("unzip",["-q",inputPath,"-d",tmp]);
}
function stripNs(xml){return String(xml).replace(/<(\/?)(?:[A-Za-z_][\w.-]*):/g,"<$1")}
function xmlDecode(v=""){return String(v).replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)))}
function xmlAttr(tag,name){return xmlDecode(tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1]||"")}
function sharedStrings(){
  const file=path.join(tmp,"xl","sharedStrings.xml");if(!fs.existsSync(file))return [];
  const xml=stripNs(fs.readFileSync(file,"utf8")),out=[];
  for(const m of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)){
    const text=[...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(x=>xmlDecode(x[1])).join("");out.push(text)
  }
  return out
}
function colIndex(ref){let n=0;for(const ch of ref.match(/^[A-Z]+/)?.[0]||"")n=n*26+ch.charCodeAt(0)-64;return n-1}
function rowIndex(ref){return Number(ref.match(/\d+$/)?.[0]||0)}
function parseSheet(file,shared){
  const xml=stripNs(fs.readFileSync(file,"utf8")),cells=new Map(),formulas=new Map(),max={row:0,col:0};
  for(const m of xml.matchAll(/<c\b([^>]*\br="[A-Z]+\d+"[^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
    const attrs=m[1]||"",body=m[2]||"",ref=xmlAttr(attrs,"r"),type=xmlAttr(attrs,"t"),r=rowIndex(ref),c=colIndex(ref);max.row=Math.max(max.row,r);max.col=Math.max(max.col,c);
    const f=body.match(/<f\b[^>]*>([\s\S]*?)<\/f>/)?.[1];if(f!==undefined)formulas.set(ref,xmlDecode(f));
    let value="";
    if(type==="inlineStr")value=[...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(x=>xmlDecode(x[1])).join("");
    else {const raw=body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];if(raw!==undefined){if(type==="s")value=shared[Number(raw)]??"";else if(type==="b")value=raw==="1";else if(type==="str"||type==="e")value=xmlDecode(raw);else {const n=Number(raw);value=Number.isFinite(n)?n:xmlDecode(raw)}}}
    cells.set(ref,value)
  }
  return {cells,formulas,max,value(r,c){return cells.get(`${columnName(c)}${r}`)??""},formula(r,c){return formulas.get(`${columnName(c)}${r}`)||""}}
}
function columnName(index){let n=index+1,s="";while(n){const r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=Math.floor((n-1)/26)}return s}
function sheetFiles(){
  const wb=stripNs(fs.readFileSync(path.join(tmp,"xl","workbook.xml"),"utf8")),rels=stripNs(fs.readFileSync(path.join(tmp,"xl","_rels","workbook.xml.rels"),"utf8")),targets=new Map();
  for(const m of rels.matchAll(/<Relationship\b([^>]*)\/?>(?:<\/Relationship>)?/g))targets.set(xmlAttr(m[1],"Id"),xmlAttr(m[1],"Target"));
  const out=new Map();for(const m of wb.matchAll(/<sheet\b([^>]*)\/?>(?:<\/sheet>)?/g)){const name=xmlAttr(m[1],"name"),rid=xmlAttr(m[1],"r:id"),target=targets.get(rid);if(name&&target){const clean=target.replace(/^\//,"");out.set(name,clean.startsWith("xl/")?path.join(tmp,clean):path.join(tmp,"xl",clean))}}return out
}
function extractAssigned(text,marker){const i=text.indexOf(marker);if(i<0)return null;const start=i+marker.length,open=text[start],close=open==="["?"]":"}";let depth=0,str=false,esc=false;for(let p=start;p<text.length;p++){const ch=text[p];if(str){if(esc)esc=false;else if(ch==="\\")esc=true;else if(ch==='"')str=false;continue}if(ch==='"'){str=true;continue}if(ch===open)depth++;else if(ch===close){depth--;if(depth===0)return JSON.parse(text.slice(start,p+1))}}return null}
function normalize(v){return String(v??"").replace(/\r\n?/g,"\n").trim()}
function coord(v){const m=normalize(v).match(/X\s*=\s*([+-]?\d+(?:\.\d+)?)里.*?Y\s*=\s*([+-]?\d+(?:\.\d+)?)里/);return m?[Number(m[1]),Number(m[2])]:[0,0]}
function chineseNumber(raw){if(/^\d+(?:\.\d+)?$/.test(raw))return Number(raw);const digits={零:0,〇:0,一:1,二:2,两:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9},units={十:10,百:100,千:1000,万:10000};let total=0,section=0,num=0;for(const ch of raw){if(ch in digits)num=digits[ch];else if(ch in units){const u=units[ch];if(u===10000){section=(section+num)*u;total+=section;section=0;num=0}else{if(num===0)num=1;section+=num*u;num=0}}}return total+section+num}
function evidenceLevel(text){return normalize(text).match(/【(G[1-4][^】]*)】/)?.[1]||""}
function isWaterType(type,name=""){return /水|河|海|泽|澤|湖|渊|淵|池|溪|泉|江|流沙/.test(`${type} ${name}`)}
function isAreaWater(type,name=""){return /海域|湖|泽|澤|渊|淵|池|水体|水域面积|大泽|洞庭/.test(`${type} ${name}`)&&!/河流|水系|源点|源段|方向节点|代表段|水路/.test(type)}
function parseArea(range,x,y,coordinateNature){const t=normalize(range);if(!t)return null;let m=t.match(/边界X\s*=\s*([+-]?\d+(?:\.\d+)?)\s*(?:至|～|~)\s*([+-]?\d+(?:\.\d+)?).*?Y\s*=\s*([+-]?\d+(?:\.\d+)?)\s*(?:至|～|~)\s*([+-]?\d+(?:\.\d+)?)/s);if(m)return {shape:"rect",west:Number(m[1]),east:Number(m[2]),south:Number(m[3]),north:Number(m[4]),evidence:/G1|原文明载|硬面积/.test(`${coordinateNature} ${t}`)?"hard":"candidate"};m=t.match(/(?:半径|圆半径)\s*([\d.]+)\s*里/);if(m)return {shape:"circle",cx:x,cy:y,radius:Number(m[1]),evidence:/G1|原文明载/.test(`${coordinateNature} ${t}`)?"hard":"candidate"};m=t.match(/([\d.]+)\s*[×xX]\s*([\d.]+)\s*里/);if(m){const w=Number(m[1]),h=Number(m[2]);return {shape:"rect",west:x-w/2,east:x+w/2,south:y-h/2,north:y+h/2,evidence:/G1|原文明载|硬面积/.test(`${coordinateNature} ${t}`)?"hard":"candidate"}}m=t.match(/方\s*([〇零一二两三四五六七八九十百千万\d.]+)\s*里/);if(m){const size=chineseNumber(m[1]);if(size)return {shape:"rect",west:x-size/2,east:x+size/2,south:y-size/2,north:y+size/2,evidence:/G1|原文明载|硬面积/.test(`${coordinateNature} ${t}`)?"hard":"candidate"}}return null}
function inferGeometry(row,old){const type=row.type,name=row.name,range=row.range;let area=old?.area||parseArea(range,row.x,row.y,row.coordinateNature);let geometry=old?.geometryType||"point";if(area)geometry=/作用域|影响范围|光照域/.test(type)?"field":"area";else if(isWaterType(type,name)&&!isAreaWater(type,name))geometry="line";else if(/区域|国|野|林|山系|丘群|范围/.test(type)&&/方|边界|面积|范围|×/.test(range))geometry="area";if((geometry==="area"||geometry==="field")&&!area)geometry="point";return {geometryType:geometry,area,path:null}}
function rowObject(sheet,row,headers,oldByRow,librarySheet){const v=label=>sheet.value(row,headers.get(label));const [x,y]=coord(v("X、Y坐标"));const rowRef=`R${row}`,old=oldByRow.get(rowRef);const formula=sheet.formula(row,headers.get("原文段落／跳转"));const linkRow=Number(formula.match(/原文总库'!A(\d+)/)?.[1]||0);const original=linkRow?normalize(librarySheet.value(linkRow,2)):"";const coordinateNature=normalize(v("坐标性质"));const base={
  id:old?.id||`SHJ-OBJ-${String(row-8).padStart(6,"0")}`,rowRef,x,y,coordinateText:normalize(v("X、Y坐标")),name:normalize(v("地名")),type:normalize(v("类型")),chapter:normalize(v("所属经篇")),region:normalize(v("所属区域／山系")),direction:normalize(v("相对都广方向")),distance:Math.round(Math.hypot(x,y)*10)/10,originalHardDistance:v("距都广距离（原文硬证据；无则空）"),reference:normalize(v("直接参照地和原文方向")),originalDistance:normalize(v("原文距离")),coordinateNature,evidenceLevel:evidenceLevel(coordinateNature),lockStatus:normalize(v("锁定状态")),range:normalize(v("对象范围／占地")),terrain:normalize(v("地貌")),water:normalize(v("水系")),plants:normalize(v("植物")),animals:normalize(v("动物")),minerals:normalize(v("矿物")),wildlife:normalize(v("野兽")),beasts:normalize(v("怪物／异兽")),people:normalize(v("人物")),gods:normalize(v("神祇")),residents:normalize(v("族群居民")),appearance:normalize(v("外形特征")),abilities:normalize(v("能力／功效／征兆")),events:normalize(v("事件")),original,originalLink:formula,sameName:normalize(v("全书同名检索")),annotations:normalize(v("古注")),otherTexts:normalize(v("其他古籍")),variants:normalize(v("异文")),modernResearch:normalize(v("现代考证")),commonLocation:normalize(v("常见定位说")),popularSources:normalize(v("百度／维基补充")),misconceptions:normalize(v("误传辨析")),derivation:normalize(v("设定与推导")),sourceUrl:normalize(v("来源 URL"))
};const geo=inferGeometry(base,old);return {...base,...geo,imageUrl:old?.imageUrl||"",dossier:old?.dossier||undefined}}
function waterName(raw){let s=normalize(raw).replace(/[▲◆◇□▧✦♣⌂•≋≈◎]/g,"").replace(/〔[^〕]*〕/g,"").replace(/\s+/g," ").trim();s=s.replace(/[（(](?:汇入|接口|源点|出图|续流|代表段|源段|方向节点)[^）)]*[）)]/g,"").trim();return s}
function waterish(name){return /水|河|海|泽|澤|湖|渊|淵|池|溪|泉|江|流沙|洞庭/.test(name)&&!/水系纪律|水文|水域与|东西宽|南北长/.test(name)}
const DIR={"↑":[0,1],"↓":[0,-1],"←":[-1,0],"→":[1,0],"↗":[1,1],"↖":[-1,1],"↘":[1,-1],"↙":[-1,-1]};
function nodeKey(p){return `${p[0]},${p[1]}`}
function riverEdges(mapSheet,objectsByRow){const xCols=[],yRows=[];for(let c=1;c<=mapSheet.max.col;c++){const m=normalize(mapSheet.value(4,c)).match(/X=([+-]?\d+)格/);if(m)xCols.push([c,Number(m[1])])}for(let r=5;r<=mapSheet.max.row;r++){const m=normalize(mapSheet.value(r,0)).match(/Y=([+-]?\d+)格/);if(m)yRows.push([r,Number(m[1])])}const edges=[],orphan=[];let arrowCells=0;for(const [r,y] of yRows)for(const [c,x] of xCols){const text=normalize(mapSheet.value(r,c));if(!text||![...text].some(ch=>DIR[ch]))continue;arrowCells++;const cellRefs=[...text.matchAll(/R(\d+)/g)].map(m=>`R${m[1]}`);let current="",currentRefs=[];for(const rawLine of text.split(/\n+/)){const line=normalize(rawLine);if(!line)continue;const refs=[...line.matchAll(/R(\d+)/g)].map(m=>`R${m[1]}`);const candidate=waterName(line.replace(/[↑↓←→↗↖↘↙].*$/,""));if(candidate&&waterish(candidate)){current=candidate;currentRefs=refs.length?refs:currentRefs}else if(refs.length){const waterRefs=refs.filter(ref=>{const o=objectsByRow.get(ref);return o&&isWaterType(o.type,o.name)});if(waterRefs.length){current=objectsByRow.get(waterRefs[0]).name;currentRefs=waterRefs}}
      const arrows=[...line].filter(ch=>DIR[ch]);for(const arrow of arrows){if(!current){orphan.push({x,y,line,text});continue}const [dx,dy]=DIR[arrow],from=[x*100,y*100],to=[(x+dx)*100,(y+dy)*100];edges.push({name:current,from,to,arrow,flowText:normalize(line.replace(arrow,"")),refs:[...new Set([...currentRefs,...cellRefs])],cell:[x,y]})}}
  }return {edges,orphan,arrowCells}}
function chainsForEdges(edges){const byStart=new Map(),indegree=new Map();edges.forEach((e,i)=>{e._i=i;const a=nodeKey(e.from),b=nodeKey(e.to);if(!byStart.has(a))byStart.set(a,[]);byStart.get(a).push(e);indegree.set(b,(indegree.get(b)||0)+1);if(!indegree.has(a))indegree.set(a,indegree.get(a)||0)});const used=new Set(),chains=[];function walk(edge){const points=[edge.from],part=[];let cur=edge;while(cur&&!used.has(cur._i)){used.add(cur._i);part.push(cur);points.push(cur.to);const next=(byStart.get(nodeKey(cur.to))||[]).filter(e=>!used.has(e._i));cur=next.length===1?next[0]:null}chains.push({points,edges:part})}for(const e of edges){const start=nodeKey(e.from),out=(byStart.get(start)||[]).length;if(!used.has(e._i)&&((indegree.get(start)||0)!==1||out!==1))walk(e)}for(const e of edges)if(!used.has(e._i))walk(e);return chains}
function buildWaterPaths(mapSheet,objects){const byRow=new Map(objects.map(o=>[o.rowRef,o])),parsed=riverEdges(mapSheet,byRow),groups=new Map();for(const e of parsed.edges){const key=normalize(e.name);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(e)}const paths=[];for(const [name,edges] of groups){let index=0;for(const chain of chainsForEdges(edges)){if(chain.points.length<2)continue;index++;const refs=[...new Set(chain.edges.flatMap(e=>e.refs))],linked=refs.map(r=>byRow.get(r)).filter(o=>o&&isWaterType(o.type,o.name));const grades=linked.map(o=>Number((o.evidenceLevel.match(/G([1-4])/)||[])[1])).filter(Boolean),grade=grades.length?`G${Math.max(...grades)}`:"G2";const evidenceLabel=({G1:"原文硬关系",G2:"相对拓扑",G3:"项目路径示意",G4:"混合待复核"})[grade];const flow=[...new Set(chain.edges.map(e=>e.flowText).filter(Boolean))].join(" / ");const id=`WATER-${crypto.createHash("sha1").update(`${name}|${index}|${chain.points.map(nodeKey).join(";")}`).digest("hex").slice(0,12)}`;const xs=chain.points.map(p=>p[0]),ys=chain.points.map(p=>p[1]);paths.push({id,name,segmentIndex:index,points:chain.points,source:chain.points[0],mouth:chain.points.at(-1),flowDirection:flow,evidenceLevel:grade,evidenceLabel,pathStatus:grade==="G1"?"原文明载":grade==="G2"?"方向／拓扑锁定":grade==="G3"?"项目路径示意":"混合待复核",objectIds:linked.map(o=>o.id),rowRefs:linked.map(o=>o.rowRef),chapter:linked[0]?.chapter||"",region:linked[0]?.region||"",isMain:chain.edges.length>=3,hasDirection:true,bounds:{minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)}})}}return {paths,validation:{arrowCells:parsed.arrowCells,edgeCount:parsed.edges.length,pathCount:paths.length,orphanArrows:parsed.orphan}}}
function originalLibrary(sheet){const out=[];for(let r=9;r<=sheet.max.row;r++){const row=Array.from({length:11},(_,c)=>normalize(sheet.value(r,c)));if(!row.some(Boolean))continue;out.push({row,paragraphId:row[0],chapter:row[1],text:row[2],geography:row[3],type:row[4],jump:row[5],source:row[6],returnDirectory:row[7],entered:row[8],coordinateStatus:row[9],status:row[10]})}return out}

try{
  extractXlsx();const shared=sharedStrings(),files=sheetFiles();for(const needed of ["都广核心区总表","坐标棋盘图","山海经原文总库"])if(!files.has(needed))throw new Error(`母表缺少工作表：${needed}`);
  const total=parseSheet(files.get("都广核心区总表"),shared),map=parseSheet(files.get("坐标棋盘图"),shared),librarySheet=parseSheet(files.get("山海经原文总库"),shared);
  const oldText=fs.existsSync(outputPath)?fs.readFileSync(outputPath,"utf8"):"",oldInitial=extractAssigned(oldText,"window.SHJ_INITIAL_DATA=")||{objects:[]},oldByRow=new Map((oldInitial.objects||[]).map(o=>[o.rowRef,o]));
  const headers=new Map();for(let c=0;c<36;c++)headers.set(normalize(total.value(8,c)),c);if(!headers.has("X、Y坐标"))headers.set("X、Y坐标",0);
  const required=["X、Y坐标","地名","类型","所属经篇","所属区域／山系","坐标性质","原文段落／跳转"];for(const h of required)if(!headers.has(h))throw new Error(`总表缺少列：${h}`);
  const objects=[];for(let r=9;r<=total.max.row;r++){if(!normalize(total.value(r,1)))continue;objects.push(rowObject(total,r,headers,oldByRow,librarySheet))}
  const usedObjectIds=new Set();for(const object of objects){if(usedObjectIds.has(object.id))object.id=`SHJ-OBJ-V125-${object.rowRef}`;usedObjectIds.add(object.id)}
  const water=buildWaterPaths(map,objects),library=originalLibrary(librarySheet),dataVersion=`v${normalize(total.value(1,0)).match(/v(\d+)/i)?.[1]||"125"}-r0001`;
  const metadata={appName:"山海经原典地图研究台 桌面版",dataVersion,schemaVersion:"desktop-1.1-water-paths",specResearch:"v002",specProduction:"v004",origin:{name:"都广之野",x:0,y:0},mainGridLi:100,innerGridLi:10,objectCount:objects.length,paragraphEntryCount:library.length,waterPathCount:water.paths.length,waterArrowCellCount:water.validation.arrowCells,generatedAt:new Date().toISOString(),sourceWorkbook:path.basename(inputPath),coverage:{workbook:{objectRows:`R9-R${total.max.row}`,objectCount:objects.length,paragraphEntries:library.length},water:{arrowCells:water.validation.arrowCells,edges:water.validation.edgeCount,paths:water.validation.pathCount,orphanArrows:water.validation.orphanArrows.length}}};
  const initial={metadata,objects};const spec={precedence:"v004优先于v002",rules:[["固定原点","都广之野中心 =（0，0）"],["底层坐标","以里为单位连续存储；100里主格仅用于索引"],["格内精度","10里逻辑精度，允许保留到1里或0.1里"],["无里数关系","不再默认100里；只锁定方向与拓扑，可用20/25里非文本排版偏移"],["河流","普通河流使用线型路径；只有海、泽、湖、渊、池使用面积"],["水系证据","线路按G1—G4分级；无原文流向不得虚构箭头"],["同名对象","对象ID、总表行号、经篇和区域共同识别"],["距离字段","地图几何距离与原文硬距离分开保存"],["母表同步",`${dataVersion}：总表${objects.length}对象、原文总库${library.length}条、水系路径${water.paths.length}段`]]};
  const js=`window.SHJ_INITIAL_DATA=${JSON.stringify(initial)};\nwindow.SHJ_WATER_PATHS=${JSON.stringify(water.paths)};\nwindow.SHJ_ORIGINAL_LIBRARY=${JSON.stringify(library)};\nwindow.SHJ_SPEC_SUMMARY=${JSON.stringify(spec)};\n`;
  fs.writeFileSync(outputPath,js,"utf8");fs.writeFileSync(reportPath,JSON.stringify({...water.validation,objects:objects.length,library:library.length,dataVersion,sourceWorkbook:path.basename(inputPath)},null,2),"utf8");
  console.log(`母表导入完成：${objects.length}个对象，${water.paths.length}段线型水系，${library.length}条原文记录，数据版本${dataVersion}`);if(water.validation.orphanArrows.length){console.error(`存在${water.validation.orphanArrows.length}个未归属箭头，请查看 ${reportPath}`);process.exitCode=2}
}catch(error){console.error(error?.stack||String(error));process.exitCode=1}finally{fs.rmSync(tmp,{recursive:true,force:true})}
