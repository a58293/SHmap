import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const root=path.resolve(process.argv[2]||process.cwd());
const pendingDir=path.join(root,"submissions","pending");
const outputDir=path.join(root,"submissions","bundles");
const outputPath=path.join(outputDir,"latest.shjbundle");
const names=(await fs.readdir(pendingDir)).filter(name=>name.toLowerCase().endsWith(".shjpatch")).sort((a,b)=>a.localeCompare(b,"zh-CN"));
const packages=[];
for(const name of names){
  const filePath=path.join(pendingDir,name),text=await fs.readFile(filePath,"utf8"),pkg=JSON.parse(text);
  if(pkg?.package_type!=="shjpatch"||!Array.isArray(pkg?.changes))throw new Error(`${name}: 不是有效的 shjpatch`);
  packages.push({name,path:`submissions/pending/${name}`,sha256:createHash("sha256").update(text).digest("hex"),created_at:pkg.created_at||"",package:pkg});
}
packages.sort((a,b)=>Date.parse(a.created_at||0)-Date.parse(b.created_at||0)||a.name.localeCompare(b.name,"zh-CN"));
const bundle={format:"shjpatch-bundle-v1",generated_at:new Date().toISOString(),package_count:packages.length,packages};
await fs.mkdir(outputDir,{recursive:true});
await fs.writeFile(outputPath,`${JSON.stringify(bundle,null,2)}\n`,"utf8");
console.log(`Built ${path.relative(root,outputPath)} with ${packages.length} packages.`);