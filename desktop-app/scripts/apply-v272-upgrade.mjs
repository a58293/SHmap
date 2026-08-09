import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const rustPath=path.join(root,"src-tauri/src/lib.rs");
const bootPath=path.join(root,"src/desktop-bootstrap.js");
const pkgPath=path.join(root,"package.json");
let rust=fs.readFileSync(rustPath,"utf8");
let boot=fs.readFileSync(bootPath,"utf8");

function replaceRustFunction(source,signature,replacement){
  const start=source.indexOf(signature);
  if(start<0)throw new Error(`未找到Rust函数：${signature}`);
  const attr=source.lastIndexOf("#[tauri::command]",start);
  const from=attr>=0&&source.slice(attr,start).trim()==="#[tauri::command]"?attr:start;
  const brace=source.indexOf("{",start);
  if(brace<0)throw new Error(`Rust函数缺少函数体：${signature}`);
  let depth=0,end=-1;
  for(let i=brace;i<source.length;i++){
    if(source[i]==="{")depth++;
    else if(source[i]==="}"){depth--;if(depth===0){end=i+1;break}}
  }
  if(end<0)throw new Error(`无法确定Rust函数结尾：${signature}`);
  return source.slice(0,from)+replacement+source.slice(end);
}

const helper=`// V272_DATA_MIGRATION_START\nconst V272_LOCAL_OBJECT_FIELDS: [&str; 10] = [\n    "dossier", "childHierarchy", "waterHierarchy", "images", "imageUrl",\n    "imageSource", "imageCopyright", "updatedAt", "createdAt", "notesLocal"\n];\nfn workspace_data_version(payload: &Value) -> String {\n    payload.get("dataVersion").and_then(Value::as_str).unwrap_or("").to_string()\n}\nfn preserve_local_object_fields(seed_object: &mut Value, current_object: &Value) {\n    let (Some(seed), Some(current)) = (seed_object.as_object_mut(), current_object.as_object()) else { return; };\n    for key in V272_LOCAL_OBJECT_FIELDS {\n        if let Some(value) = current.get(key) { seed.insert(key.to_string(), value.clone()); }\n    }\n}\nfn merge_official_seed_with_current(seed: &Value, current: &Value) -> Result<Value, String> {\n    let seed_objects = seed.get("objects").and_then(Value::as_array).ok_or_else(|| "V272正式母表缺少objects".to_string())?;\n    let current_objects = current.get("objects").and_then(Value::as_array).cloned().unwrap_or_default();\n    let mut merged = current.clone();\n    let target = merged.as_object_mut().ok_or_else(|| "当前工作区不是JSON对象".to_string())?;\n    let mut official = Vec::with_capacity(seed_objects.len());\n    for source in seed_objects {\n        let mut next = source.clone();\n        if let Some(id) = source.get("id").and_then(Value::as_str) {\n            if let Some(local) = current_objects.iter().find(|item| item.get("id").and_then(Value::as_str)==Some(id)) {\n                preserve_local_object_fields(&mut next, local);\n            }\n        }\n        official.push(next);\n    }\n    target.insert("objects".to_string(), Value::Array(official));\n    target.insert("dataVersion".to_string(), seed.get("dataVersion").cloned().unwrap_or(Value::String("v272-r0001".to_string())));\n    let valid_ids = target.get("objects").and_then(Value::as_array).cloned().unwrap_or_default();\n    let selected_valid = target.get("selectedId").and_then(Value::as_str).map(|id| valid_ids.iter().any(|item| item.get("id").and_then(Value::as_str)==Some(id))).unwrap_or(false);\n    if !selected_valid {\n        let first = valid_ids.first().and_then(|item| item.get("id")).cloned().unwrap_or(Value::Null);\n        target.insert("selectedId".to_string(), first);\n    }\n    Ok(merged)\n}\n// V272_DATA_MIGRATION_END\n`;
if(!rust.includes("V272_DATA_MIGRATION_START")){
  const marker="#[tauri::command]\nfn bootstrap_workspace(";
  const at=rust.indexOf(marker);
  if(at<0)throw new Error("当前lib.rs未找到bootstrap_workspace，停止自动修改");
  rust=rust.slice(0,at)+helper+"\n"+rust.slice(at);
}
const bootstrapReplacement=`#[tauri::command]\nfn bootstrap_workspace(\n    state: tauri::State<'_, AppState>,\n    github_state: tauri::State<'_, github_auth::GitHubAuthState>,\n    legacy_snapshot: Option<String>,\n    seed_snapshot: String,\n) -> Result<BootstrapResponse, String> {\n    github_auth::require_authorized_session(&github_state)?;\n    let _guard = state.operation_lock.lock().map_err(|_| "数据库锁异常".to_string())?;\n    let conn = open_connection(&state.database_path)?;\n    let seed_parsed = parse_payload(&seed_snapshot)?;\n    let seed_version = workspace_data_version(&seed_parsed);\n    if let Some(payload) = current_payload(&conn)? {\n        let parsed = parse_payload(&payload)?;\n        let current_version = workspace_data_version(&parsed);\n        if !seed_version.is_empty() && current_version != seed_version {\n            let merged = merge_official_seed_with_current(&seed_parsed, &parsed)?;\n            let merged_payload = serde_json::to_string(&merged).map_err(|e| format!("V272迁移序列化失败：{e}"))?;\n            let label = format!("正式地图升级前备份 {} → {}", if current_version.is_empty(){"未知版本"}else{&current_version}, seed_version);\n            let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;\n            insert_backup(&tx, &state.backup_dir, &label, "pre_data_upgrade", &payload, &parsed)?;\n            write_current(&tx, &merged_payload, &merged, &now_text())?;\n            insert_backup(&tx, &state.backup_dir, "V272正式母表升级完成", "data_upgrade", &merged_payload, &merged)?;\n            tx.commit().map_err(|e| e.to_string())?;\n            return Ok(BootstrapResponse{snapshot:merged_payload,source:"database-upgraded-v272".into(),database_path:state.database_path.to_string_lossy().into_owned(),object_count:object_count(&merged)});\n        }\n        return Ok(BootstrapResponse{snapshot:payload,source:"database".into(),database_path:state.database_path.to_string_lossy().into_owned(),object_count:object_count(&parsed)});\n    }\n    let legacy = legacy_snapshot.filter(|s| !s.trim().is_empty()).and_then(|value| parse_payload(&value).ok().map(|parsed|(value,parsed)));\n    let (payload, source) = match legacy {\n        Some((value, parsed)) if workspace_data_version(&parsed)==seed_version => (value, "legacy-cache"),\n        _ => (seed_snapshot, "private-repo-seed"),\n    };\n    let parsed = parse_payload(&payload)?;\n    let now = now_text();\n    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;\n    write_current(&tx, &payload, &parsed, &now)?;\n    insert_backup(&tx, &state.backup_dir, "首次初始化", "initial", &payload, &parsed)?;\n    tx.commit().map_err(|e| e.to_string())?;\n    Ok(BootstrapResponse{snapshot:payload,source:source.into(),database_path:state.database_path.to_string_lossy().into_owned(),object_count:object_count(&parsed)})\n}`;
rust=replaceRustFunction(rust,"fn bootstrap_workspace(",bootstrapReplacement);
fs.writeFileSync(rustPath,rust);

if(!boot.includes("function snapshotDataVersion(")){
  const marker="function hydratePrivateMapBundle(payload){";
  const at=boot.indexOf(marker);
  if(at<0)throw new Error("desktop-bootstrap.js未找到hydratePrivateMapBundle");
  const helpers=`function snapshotDataVersion(value){try{const parsed=typeof value==="string"?JSON.parse(value):value;return String(parsed?.dataVersion||"")}catch{return ""}}\nfunction preferredStartupFallback(legacy,seed){const seedVersion=snapshotDataVersion(seed);if(usableWorkspaceSnapshot(legacy)&&snapshotDataVersion(legacy)===seedVersion)return{payload:legacy,source:"local-cache-fallback"};return{payload:seed,source:"private-repo-seed-fallback"}}\n`;
  boot=boot.slice(0,at)+helpers+boot.slice(at);
}
const old=`      const fallback=usableWorkspaceSnapshot(legacy)?legacy:seed;\n      localStorage.setItem(STORAGE_KEY,fallback);\n      bootInfo={source:usableWorkspaceSnapshot(legacy)?"local-cache-fallback":"private-repo-seed-fallback",snapshot:fallback,objectCount:JSON.parse(fallback).objects.length,databasePath:""};`;
const next=`      const selectedFallback=preferredStartupFallback(legacy,seed),fallback=selectedFallback.payload;\n      localStorage.setItem(STORAGE_KEY,fallback);\n      bootInfo={source:selectedFallback.source,snapshot:fallback,objectCount:JSON.parse(fallback).objects.length,databasePath:""};`;
if(boot.includes(old))boot=boot.replace(old,next);
else if(!boot.includes("selectedFallback=preferredStartupFallback"))throw new Error("未找到旧启动降级逻辑，停止自动修改");
fs.writeFileSync(bootPath,boot);

const pkg=JSON.parse(fs.readFileSync(pkgPath,"utf8"));
pkg.scripts=pkg.scripts||{};
pkg.scripts["verify:v272-map"]="node scripts/verify-v272-private-map.mjs";
if(!String(pkg.scripts.verify||"").includes("verify:v272-map")){
  pkg.scripts.verify=String(pkg.scripts.verify||"").replace("npm run verify:private-submissions &&","npm run verify:private-submissions && npm run verify:v272-map &&");
}
fs.writeFileSync(pkgPath,JSON.stringify(pkg,null,2)+"\n");
console.log("V272代码迁移已应用：Rust数据库版本迁移、旧缓存防回退、V272 CI入口。正式对象数据仍只从Private SHmap-Data读取。");
