use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use chrono::{DateTime, SecondsFormat, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    collections::{HashMap, HashSet},
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::Mutex,
    time::Duration,
};
use tauri::{ipc::Channel, AppHandle, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};
use tokio::time::{sleep, timeout};
use url::Url;

mod github_auth;

const APP_SCHEMA_VERSION: i64 = 1;
const AUTO_BACKUP_MINUTES: i64 = 60;
const MAX_AUTO_BACKUPS: usize = 48;
const UPDATE_CHECK_ATTEMPTS_PER_SOURCE: usize = 2;
const UPDATE_DOWNLOAD_ATTEMPTS: usize = 3;
const UPDATE_ENDPOINTS: [(&str, &str); 3] = [
    (
        "仓库直连",
        "https://raw.githubusercontent.com/a58293/SHmap/main/updates/latest.json",
    ),
    (
        "CDN备用",
        "https://cdn.jsdelivr.net/gh/a58293/SHmap@main/updates/latest.json",
    ),
    (
        "GitHub Releases备用",
        "https://github.com/a58293/SHmap/releases/latest/download/latest.json",
    ),
];

struct AppState {
    database_path: PathBuf,
    backup_dir: PathBuf,
    operation_lock: Mutex<()>,
}

struct PendingUpdate(Mutex<Option<Update>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct AppVersionInfo {
    edition: &'static str,
    version: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct UpdateMetadata {
    current_version: String,
    version: String,
    date: Option<String>,
    body: Option<String>,
    source: String,
}

#[derive(Clone, Serialize)]
#[serde(tag = "event", content = "data", rename_all = "camelCase")]
enum UpdateDownloadEvent {
    Started { content_length: Option<u64> },
    Progress { chunk_length: usize },
    Retrying {
        attempt: usize,
        max_attempts: usize,
        message: String,
    },
    Finished,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BootstrapResponse {
    snapshot: String,
    source: String,
    database_path: String,
    object_count: usize,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SaveResponse {
    saved_at: String,
    object_count: usize,
    auto_backup_created: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct BackupSummary {
    backup_id: i64,
    created_at: String,
    label: String,
    kind: String,
    object_count: usize,
    payload_sha256: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestoreResponse { payload: String }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct StorageStatus {
    database_path: String,
    backup_directory: String,
    updated_at: Option<String>,
    object_count: usize,
    backup_count: usize,
    schema_version: i64,
}

#[derive(Serialize)]
struct CheckResult { ok: bool, message: String }

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PublishPatchResponse {
    repo_path: String,
    remote_path: String,
    commit: String,
    pushed_at: String,
    asset_count: usize,
}

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PublishAssetInput {
    file_name: String,
    #[serde(default)]
    data_base64: String,
    #[serde(default)]
    bytes: Vec<u8>,
}

fn decode_publish_assets(mut assets: Vec<PublishAssetInput>) -> Result<Vec<PublishAssetInput>, String> {
    for asset in &mut assets {
        if asset.bytes.is_empty() && !asset.data_base64.trim().is_empty() {
            asset.bytes = BASE64_STANDARD.decode(asset.data_base64.trim())
                .map_err(|error| format!("图片资源Base64无效（{}）：{error}", asset.file_name))?;
        }
        asset.data_base64.clear();
    }
    Ok(assets)
}

fn now_text() -> String { Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true) }
fn hash_payload(payload: &str) -> String { hex::encode(Sha256::digest(payload.as_bytes())) }
fn parse_payload(payload: &str) -> Result<Value, String> { serde_json::from_str(payload).map_err(|e| format!("工作区JSON无效：{e}")) }
fn object_count(payload: &Value) -> usize { payload.get("objects").and_then(Value::as_array).map_or(0, Vec::len) }
fn open_connection(path: &Path) -> Result<Connection, String> {
    let conn = Connection::open(path).map_err(|e| format!("无法打开SQLite数据库：{e}"))?;
    conn.busy_timeout(Duration::from_secs(3)).map_err(|e| format!("设置SQLite等待时间失败：{e}"))?;
    Ok(conn)
}

fn validate_patch_file(file_name: &str, content: &str) -> Result<Value, String> {
    let path = Path::new(file_name);
    if file_name.trim().is_empty()
        || path.file_name().and_then(|value| value.to_str()) != Some(file_name)
        || file_name.contains('/') || file_name.contains('\\')
        || !file_name.to_ascii_lowercase().ends_with(".shjpatch")
    {
        return Err("更改包文件名无效，只允许单个 .shjpatch 文件名。".to_string());
    }
    if content.len() > 25 * 1024 * 1024 { return Err("更改包超过 25MB，已停止上传。".to_string()); }
    let payload: Value = serde_json::from_str(content).map_err(|error| format!("更改包 JSON 无效：{error}"))?;
    if payload.get("package_type").and_then(Value::as_str) != Some("shjpatch") {
        return Err("文件不是山海经地图 .shjpatch 更改包。".to_string());
    }
    if !payload.get("changes").and_then(Value::as_array).map(|items| !items.is_empty()).unwrap_or(false) {
        return Err("更改包中没有可发布的 changes。".to_string());
    }
    Ok(payload)
}

fn validate_publish_assets(assets: &[PublishAssetInput]) -> Result<(), String> {
    if assets.len() > 64 { return Err("单个更改包最多同步64张图片。".to_string()); }
    let mut total = 0usize;
    for asset in assets {
        let path = Path::new(&asset.file_name);
        if path.file_name().and_then(|value| value.to_str()) != Some(asset.file_name.as_str())
            || asset.file_name.contains('/') || asset.file_name.contains('\\')
        {
            return Err(format!("图片资源文件名无效：{}", asset.file_name));
        }
        let extension = path.extension().and_then(|value| value.to_str()).unwrap_or("").to_ascii_lowercase();
        if !matches!(extension.as_str(), "webp" | "png" | "jpg" | "jpeg") {
            return Err(format!("图片资源格式不受支持：{}", asset.file_name));
        }
        let stem = path.file_stem().and_then(|value| value.to_str()).unwrap_or("").to_ascii_lowercase();
        if stem.len() != 64 || !stem.bytes().all(|value| value.is_ascii_hexdigit()) {
            return Err(format!("图片资源缺少有效SHA-256指纹：{}", asset.file_name));
        }
        if asset.bytes.is_empty() || asset.bytes.len() > 2 * 1024 * 1024 {
            return Err(format!("图片资源大小无效（单张上限2MB）：{}", asset.file_name));
        }
        let actual = hex::encode(Sha256::digest(&asset.bytes));
        if actual != stem { return Err(format!("图片资源指纹校验失败：{}", asset.file_name)); }
        total = total.saturating_add(asset.bytes.len());
    }
    if total > 25 * 1024 * 1024 { return Err("本轮图片资源合计超过25MB。".to_string()); }
    Ok(())
}

#[tauri::command]
async fn publish_patch_to_github(
    github_state: tauri::State<'_, github_auth::GitHubAuthState>,
    repo_path: Option<String>,
    file_name: String,
    content: String,
    assets: Vec<PublishAssetInput>,
    commit_message: String,
) -> Result<PublishPatchResponse, String> {
    github_auth::require_authorized_session(&github_state)?;
    let _payload = validate_patch_file(&file_name, &content)?;
    let assets = decode_publish_assets(assets)?;
    validate_publish_assets(&assets)?;

    // Stage3: repo_path 仅为兼容旧前端调用保留，不再读取本地 Git 仓库。
    // 更改包与图片全部使用当前登录用户的 GitHub 凭据写入私有 SHmap-Data。
    let _ = repo_path;
    let publish_assets = assets
        .into_iter()
        .map(|asset| github_auth::PrivatePublishAsset {
            file_name: asset.file_name,
            bytes: asset.bytes,
        })
        .collect::<Vec<_>>();

    // Stage3.1: 给整轮 GitHub 私有上传设置总超时。
    // reqwest 客户端本身已有单请求超时；这里再给“多图片 + patch”的完整发布过程加上上限，
    // 避免慢速、半断开或失速网络导致桌面端一直等待。
    let result = timeout(
        Duration::from_secs(180),
        github_auth::publish_private_submission(
            &github_state,
            &file_name,
            content.as_bytes(),
            publish_assets,
            &commit_message,
        ),
    )
    .await
    .map_err(|_| "GitHub 私有更改包上传超过 180 秒，已自动停止。请检查网络后重试；本地更改包不会丢失。".to_string())??;

    Ok(PublishPatchResponse {
        repo_path: result.repository,
        remote_path: result.remote_path,
        commit: result.commit,
        pushed_at: now_text(),
        asset_count: result.asset_count,
    })
}

#[tauri::command]
async fn load_private_map_bundle(
    github_state: tauri::State<'_, github_auth::GitHubAuthState>,
) -> Result<github_auth::PrivateMapBundleResponse, String> {
    github_auth::load_private_map_bundle(&github_state).await
}

fn initialize_database(path: &Path) -> Result<(), String> {
    let conn = open_connection(path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA foreign_keys=ON;
        CREATE TABLE IF NOT EXISTS schema_info (version INTEGER NOT NULL, applied_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS current_workspace (singleton_id INTEGER PRIMARY KEY CHECK(singleton_id=1), updated_at TEXT NOT NULL, object_count INTEGER NOT NULL, payload_sha256 TEXT NOT NULL, payload TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS backups (backup_id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, label TEXT NOT NULL, kind TEXT NOT NULL, object_count INTEGER NOT NULL, payload_sha256 TEXT NOT NULL, payload TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS backups_created_idx ON backups(created_at DESC);")
        .map_err(|e| format!("初始化数据库失败：{e}"))?;
    let current: Option<i64> = conn.query_row("SELECT version FROM schema_info ORDER BY applied_at DESC LIMIT 1", [], |r| r.get(0)).optional().map_err(|e| e.to_string())?;
    if current.unwrap_or(0) < APP_SCHEMA_VERSION {
        conn.execute("INSERT INTO schema_info(version, applied_at) VALUES(?1, ?2)", params![APP_SCHEMA_VERSION, now_text()]).map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn current_payload(conn: &Connection) -> Result<Option<String>, String> {
    conn.query_row("SELECT payload FROM current_workspace WHERE singleton_id=1", [], |r| r.get(0)).optional().map_err(|e| e.to_string())
}

fn write_current(conn: &Connection, payload: &str, parsed: &Value, timestamp: &str) -> Result<(), String> {
    conn.execute("INSERT INTO current_workspace(singleton_id,updated_at,object_count,payload_sha256,payload) VALUES(1,?1,?2,?3,?4)
        ON CONFLICT(singleton_id) DO UPDATE SET updated_at=excluded.updated_at, object_count=excluded.object_count, payload_sha256=excluded.payload_sha256, payload=excluded.payload",
        params![timestamp, object_count(parsed) as i64, hash_payload(payload), payload]).map_err(|e| e.to_string())?;
    Ok(())
}

fn safe_filename(value: &str) -> String {
    let cleaned: String = value.chars().map(|c| if c.is_ascii_alphanumeric() || matches!(c, '-'|'_') { c } else { '_' }).collect();
    cleaned.trim_matches('_').chars().take(48).collect::<String>()
}

fn prune_auto_backups(conn: &Connection, backup_dir: &Path) -> Result<(), String> {
    let mut stmt = conn.prepare("SELECT backup_id FROM backups WHERE kind='auto' ORDER BY backup_id DESC LIMIT -1 OFFSET ?1").map_err(|e| e.to_string())?;
    let ids = stmt.query_map([MAX_AUTO_BACKUPS as i64], |r| r.get::<_, i64>(0)).map_err(|e| e.to_string())?.collect::<Result<Vec<_>, _>>().map_err(|e| e.to_string())?;
    for id in ids {
        conn.execute("DELETE FROM backups WHERE backup_id=?1", [id]).map_err(|e| e.to_string())?;
        let marker = format!("_{id}_");
        if let Ok(entries) = fs::read_dir(backup_dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().into_owned();
                if name.contains(&marker) && name.ends_with(".shjbackup.json") { let _ = fs::remove_file(entry.path()); }
            }
        }
    }
    Ok(())
}

fn insert_backup(conn: &Connection, backup_dir: &Path, label: &str, kind: &str, payload: &str, parsed: &Value) -> Result<i64, String> {
    let created_at = now_text();
    let hash = hash_payload(payload);
    let count = object_count(parsed);
    let existing: Option<i64> = conn.query_row(
        "SELECT backup_id FROM backups WHERE kind=?1 AND payload_sha256=?2 ORDER BY backup_id DESC LIMIT 1",
        params![kind, hash],
        |row| row.get(0),
    ).optional().map_err(|e| e.to_string())?;
    if let Some(id) = existing { return Ok(id); }
    conn.execute("INSERT INTO backups(created_at,label,kind,object_count,payload_sha256,payload) VALUES(?1,?2,?3,?4,?5,?6)", params![created_at, label, kind, count as i64, hash, payload]).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    let file_name = format!("{}_{}_{}.shjbackup.json", created_at.replace(':', "-"), id, safe_filename(label));
    let envelope = json!({"format":"shj-desktop-backup-v1","createdAt":created_at,"label":label,"kind":kind,"objectCount":count,"payloadSha256":hash,"workspace":parsed});
    // Automatic snapshots are already stored in SQLite. Only user/milestone
    // backups are duplicated as external JSON recovery files.
    if kind != "auto" {
        fs::write(backup_dir.join(file_name), serde_json::to_vec_pretty(&envelope).map_err(|e| e.to_string())?).map_err(|e| format!("写入备份文件失败：{e}"))?;
    }
    if kind == "auto" { prune_auto_backups(conn, backup_dir)?; }
    Ok(id)
}

fn should_auto_backup(conn: &Connection, payload_hash: &str) -> Result<bool, String> {
    let last: Option<(String,String)> = conn.query_row("SELECT created_at,payload_sha256 FROM backups WHERE kind='auto' ORDER BY backup_id DESC LIMIT 1", [], |r| Ok((r.get(0)?,r.get(1)?))).optional().map_err(|e| e.to_string())?;
    let Some((created, hash)) = last else { return Ok(true) };
    if hash == payload_hash { return Ok(false) }
    let parsed: DateTime<Utc> = created.parse().unwrap_or_else(|_| Utc::now() - chrono::Duration::minutes(AUTO_BACKUP_MINUTES + 1));
    Ok(Utc::now().signed_duration_since(parsed).num_minutes() >= AUTO_BACKUP_MINUTES)
}

// OFFICIAL_DATA_MIGRATION_START
const LOCAL_OBJECT_FIELDS: [&str; 32] = [
    "dossier", "childHierarchy", "waterHierarchy", "images", "imageUrl",
    "imageSource", "imageCopyright", "updatedAt", "createdAt", "notesLocal",
    "terrain", "water", "plants", "animals", "minerals", "wildlife",
    "beasts", "people", "gods", "residents", "appearance", "abilities",
    "events", "annotations", "otherTexts", "modernResearch", "commonLocation",
    "popularSources", "misconceptions", "derivation", "sourceNotes",
    "pendingQuestions"
];
fn workspace_data_version(payload: &Value) -> String {
    payload.get("dataVersion").and_then(Value::as_str).unwrap_or("").to_string()
}
fn preserve_local_object_fields(seed_object: &mut Value, current_object: &Value) {
    let (Some(seed), Some(current)) = (seed_object.as_object_mut(), current_object.as_object()) else { return; };
    for key in LOCAL_OBJECT_FIELDS {
        if let Some(value) = current.get(key) { seed.insert(key.to_string(), value.clone()); }
    }
}
fn collect_local_change_fields(current: &Value) -> HashMap<String, HashSet<String>> {
    fn collect_change(change: &Value, changed: &mut HashMap<String, HashSet<String>>) {
        let Some(entity_id) = change.get("entityId").and_then(Value::as_str) else { return; };
        if entity_id.starts_with("CELL-") { return; }
        let (Some(before), Some(after)) = (
            change.get("before").and_then(Value::as_object),
            change.get("after").and_then(Value::as_object),
        ) else { return; };
        let fields = changed.entry(entity_id.to_string()).or_default();
        for key in before.keys().chain(after.keys()) {
            if before.get(key) != after.get(key) {
                fields.insert(key.to_string());
            }
        }
    }

    let mut changed = HashMap::new();
    if let Some(changes) = current.get("changes").and_then(Value::as_array) {
        for change in changes { collect_change(change, &mut changed); }
    }
    if let Some(archives) = current.get("changeArchives").and_then(Value::as_array) {
        for archive in archives {
            if let Some(changes) = archive.get("changes").and_then(Value::as_array) {
                for change in changes { collect_change(change, &mut changed); }
            }
        }
    }
    if let Some(protected) = current.get("protectedObjectFields").and_then(Value::as_object) {
        for (entity_id, fields) in protected {
            let target = changed.entry(entity_id.clone()).or_default();
            if let Some(fields) = fields.as_array() {
                for field in fields.iter().filter_map(Value::as_str) {
                    if field != "id" && field != "rowRef" { target.insert(field.to_string()); }
                }
            }
        }
    }
    changed
}
fn preserve_changed_object_fields(seed_object: &mut Value, current_object: &Value, fields: Option<&HashSet<String>>) {
    let (Some(seed), Some(current), Some(fields)) = (seed_object.as_object_mut(), current_object.as_object(), fields) else { return; };
    for key in fields {
        if key == "id" || key == "rowRef" { continue; }
        match current.get(key) {
            Some(value) => { seed.insert(key.clone(), value.clone()); }
            None => { seed.remove(key); }
        }
    }
}
fn merge_official_seed_with_current(seed: &Value, current: &Value) -> Result<Value, String> {
    let seed_objects = seed.get("objects").and_then(Value::as_array).ok_or_else(|| "正式母表缺少objects".to_string())?;
    let current_objects = current.get("objects").and_then(Value::as_array).cloned().unwrap_or_default();
    let mut merged = current.clone();
    let seed_version = workspace_data_version(seed);
    let authoritative_workbook = seed_version.starts_with("v28");
    let locally_changed_fields = collect_local_change_fields(current);
    let target = merged.as_object_mut().ok_or_else(|| "当前工作区不是JSON对象".to_string())?;
    let mut official = Vec::with_capacity(seed_objects.len());
    for source in seed_objects {
        let mut next = source.clone();
        if let Some(id) = source.get("id").and_then(Value::as_str) {
            if let Some(local) = current_objects.iter().find(|item| item.get("id").and_then(Value::as_str)==Some(id)) {
                preserve_local_object_fields(&mut next, local);
                // V282/V283 are complete re-audits of official names, coordinates,
                // layers and source fields. Only user dossiers and image assets
                // survive that migration; official spreadsheet fields win.
                if !authoritative_workbook {
                    preserve_changed_object_fields(&mut next, local, locally_changed_fields.get(id));
                }
            }
        }
        official.push(next);
    }
    let official_ids: HashSet<String> = official.iter().filter_map(|item| item.get("id").and_then(Value::as_str).map(str::to_string)).collect();
    let official_rows: HashSet<String> = official.iter().filter_map(|item| item.get("rowRef").and_then(Value::as_str).map(str::to_string)).collect();
    for local in &current_objects {
        let id = local.get("id").and_then(Value::as_str).unwrap_or("");
        let row_ref = local.get("rowRef").and_then(Value::as_str).unwrap_or("");
        let is_local_new = row_ref == "NEW" || (!official_ids.contains(id) && (row_ref.is_empty() || !official_rows.contains(row_ref)));
        if is_local_new { official.push(local.clone()); }
    }
    target.insert("objects".to_string(), Value::Array(official));
    target.insert("dataVersion".to_string(), seed.get("dataVersion").cloned().unwrap_or(Value::String("v283-r0001".to_string())));
    let valid_ids = target.get("objects").and_then(Value::as_array).cloned().unwrap_or_default();
    let selected_valid = target.get("selectedId").and_then(Value::as_str).map(|id| valid_ids.iter().any(|item| item.get("id").and_then(Value::as_str)==Some(id))).unwrap_or(false);
    if !selected_valid {
        let first = valid_ids.first().and_then(|item| item.get("id")).cloned().unwrap_or(Value::Null);
        target.insert("selectedId".to_string(), first);
    }
    Ok(merged)
}
// OFFICIAL_DATA_MIGRATION_END

#[tauri::command]
fn bootstrap_workspace(
    state: tauri::State<'_, AppState>,
    github_state: tauri::State<'_, github_auth::GitHubAuthState>,
    legacy_snapshot: Option<String>,
    seed_snapshot: String,
) -> Result<BootstrapResponse, String> {
    github_auth::require_authorized_session(&github_state)?;
    let _guard = state.operation_lock.lock().map_err(|_| "数据库锁异常".to_string())?;
    let conn = open_connection(&state.database_path)?;
    let seed_parsed = parse_payload(&seed_snapshot)?;
    let seed_version = workspace_data_version(&seed_parsed);
    if let Some(payload) = current_payload(&conn)? {
        let parsed = parse_payload(&payload)?;
        let current_version = workspace_data_version(&parsed);
        if !seed_version.is_empty() && current_version != seed_version {
            let merged = merge_official_seed_with_current(&seed_parsed, &parsed)?;
            let merged_payload = serde_json::to_string(&merged).map_err(|e| format!("正式母表迁移序列化失败：{e}"))?;
            let label = format!("正式地图升级前备份 {} → {}", if current_version.is_empty(){"未知版本"}else{&current_version}, seed_version);
            let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
            insert_backup(&tx, &state.backup_dir, &label, "pre_data_upgrade", &payload, &parsed)?;
            write_current(&tx, &merged_payload, &merged, &now_text())?;
            insert_backup(&tx, &state.backup_dir, "V283正式母表升级完成", "data_upgrade", &merged_payload, &merged)?;
            tx.commit().map_err(|e| e.to_string())?;
            return Ok(BootstrapResponse{snapshot:merged_payload,source:"database-upgraded-official".into(),database_path:state.database_path.to_string_lossy().into_owned(),object_count:object_count(&merged)});
        }
        return Ok(BootstrapResponse{snapshot:payload,source:"database".into(),database_path:state.database_path.to_string_lossy().into_owned(),object_count:object_count(&parsed)});
    }
    let legacy = legacy_snapshot.filter(|s| !s.trim().is_empty()).and_then(|value| parse_payload(&value).ok().map(|parsed|(value,parsed)));
    let (payload, source) = match legacy {
        Some((value, parsed)) if workspace_data_version(&parsed)==seed_version => (value, "legacy-cache"),
        _ => (seed_snapshot, "private-repo-seed"),
    };
    let parsed = parse_payload(&payload)?;
    let now = now_text();
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    write_current(&tx, &payload, &parsed, &now)?;
    insert_backup(&tx, &state.backup_dir, "首次初始化", "initial", &payload, &parsed)?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(BootstrapResponse{snapshot:payload,source:source.into(),database_path:state.database_path.to_string_lossy().into_owned(),object_count:object_count(&parsed)})
}

#[tauri::command]
fn save_workspace(
    state: tauri::State<'_, AppState>,
    github_state: tauri::State<'_, github_auth::GitHubAuthState>,
    payload: String,
) -> Result<SaveResponse, String> {
    github_auth::require_authorized_session(&github_state)?;
    let parsed = parse_payload(&payload)?;
    let hash = hash_payload(&payload);
    let _guard = state.operation_lock.lock().map_err(|_| "数据库锁异常".to_string())?;
    let conn = open_connection(&state.database_path)?;
    let timestamp = now_text();
    let auto = should_auto_backup(&conn, &hash)?;
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    write_current(&tx, &payload, &parsed, &timestamp)?;
    if auto { insert_backup(&tx, &state.backup_dir, "自动备份", "auto", &payload, &parsed)?; }
    tx.commit().map_err(|e| e.to_string())?;
    Ok(SaveResponse{saved_at:timestamp,object_count:object_count(&parsed),auto_backup_created:auto})
}

#[tauri::command]
fn create_backup(
    state: tauri::State<'_, AppState>,
    github_state: tauri::State<'_, github_auth::GitHubAuthState>,
    label: Option<String>,
) -> Result<BackupSummary, String> {
    github_auth::require_authorized_session(&github_state)?;
    let _guard = state.operation_lock.lock().map_err(|_| "数据库锁异常".to_string())?;
    let conn = open_connection(&state.database_path)?;
    let payload = current_payload(&conn)?.ok_or_else(|| "当前工作区尚未建立".to_string())?;
    let parsed = parse_payload(&payload)?;
    let label = label.filter(|v| !v.trim().is_empty()).unwrap_or_else(|| "手动备份".to_string());
    let id = insert_backup(&conn, &state.backup_dir, &label, "manual", &payload, &parsed)?;
    let created_at: String = conn.query_row("SELECT created_at FROM backups WHERE backup_id=?1", [id], |r| r.get(0)).map_err(|e| e.to_string())?;
    Ok(BackupSummary{backup_id:id,created_at,label,kind:"manual".into(),object_count:object_count(&parsed),payload_sha256:hash_payload(&payload)})
}

#[tauri::command]
fn exit_application(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn list_backups(
    state: tauri::State<'_, AppState>,
    github_state: tauri::State<'_, github_auth::GitHubAuthState>,
    limit: Option<u32>,
) -> Result<Vec<BackupSummary>, String> {
    github_auth::require_authorized_session(&github_state)?;
    let _guard = state.operation_lock.lock().map_err(|_| "数据库锁异常".to_string())?;
    let conn = open_connection(&state.database_path)?;
    let mut stmt = conn.prepare("SELECT backup_id,created_at,label,kind,object_count,payload_sha256 FROM backups ORDER BY backup_id DESC LIMIT ?1").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([limit.unwrap_or(80).clamp(1,500) as i64], |r| Ok(BackupSummary{backup_id:r.get(0)?,created_at:r.get(1)?,label:r.get(2)?,kind:r.get(3)?,object_count:r.get::<_,i64>(4)? as usize,payload_sha256:r.get(5)?})).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn restore_backup(
    state: tauri::State<'_, AppState>,
    github_state: tauri::State<'_, github_auth::GitHubAuthState>,
    backup_id: i64,
) -> Result<RestoreResponse, String> {
    github_auth::require_authorized_session(&github_state)?;
    let _guard = state.operation_lock.lock().map_err(|_| "数据库锁异常".to_string())?;
    let conn = open_connection(&state.database_path)?;
    let target: String = conn.query_row("SELECT payload FROM backups WHERE backup_id=?1", [backup_id], |r| r.get(0)).map_err(|e| format!("未找到该备份：{e}"))?;
    let target_parsed = parse_payload(&target)?;
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    if let Some(current) = current_payload(&tx)? {
        let parsed = parse_payload(&current)?;
        insert_backup(&tx, &state.backup_dir, "恢复前自动备份", "pre_restore", &current, &parsed)?;
    }
    write_current(&tx, &target, &target_parsed, &now_text())?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(RestoreResponse{payload:target})
}

#[tauri::command]
fn storage_status(
    state: tauri::State<'_, AppState>,
    github_state: tauri::State<'_, github_auth::GitHubAuthState>,
) -> Result<StorageStatus, String> {
    github_auth::require_authorized_session(&github_state)?;
    let _guard = state.operation_lock.lock().map_err(|_| "数据库锁异常".to_string())?;
    let conn = open_connection(&state.database_path)?;
    let current: Option<(String,i64)> = conn.query_row("SELECT updated_at,object_count FROM current_workspace WHERE singleton_id=1", [], |r| Ok((r.get(0)?,r.get(1)?))).optional().map_err(|e| e.to_string())?;
    let backups: i64 = conn.query_row("SELECT COUNT(*) FROM backups", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    Ok(StorageStatus{database_path:state.database_path.to_string_lossy().into_owned(),backup_directory:state.backup_dir.to_string_lossy().into_owned(),updated_at:current.as_ref().map(|x|x.0.clone()),object_count:current.map_or(0,|x|x.1 as usize),backup_count:backups as usize,schema_version:APP_SCHEMA_VERSION})
}

#[tauri::command]
fn check_database(
    state: tauri::State<'_, AppState>,
    github_state: tauri::State<'_, github_auth::GitHubAuthState>,
) -> Result<CheckResult, String> {
    github_auth::require_authorized_session(&github_state)?;
    let _guard = state.operation_lock.lock().map_err(|_| "数据库锁异常".to_string())?;
    let conn = open_connection(&state.database_path)?;
    let result: String = conn.query_row("PRAGMA quick_check", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    Ok(CheckResult{ok:result.eq_ignore_ascii_case("ok"),message:result})
}

#[tauri::command]
fn open_data_directory(
    state: tauri::State<'_, AppState>,
    github_state: tauri::State<'_, github_auth::GitHubAuthState>,
) -> Result<(), String> {
    github_auth::require_authorized_session(&github_state)?;
    #[cfg(target_os = "windows")]
    { Command::new("explorer").arg(state.database_path.parent().unwrap_or(&state.backup_dir)).spawn().map_err(|e| format!("打开目录失败：{e}"))?; }
    #[cfg(target_os = "macos")]
    { Command::new("open").arg(state.database_path.parent().unwrap_or(&state.backup_dir)).spawn().map_err(|e| format!("打开目录失败：{e}"))?; }
    #[cfg(all(unix, not(target_os = "macos")))]
    { Command::new("xdg-open").arg(state.database_path.parent().unwrap_or(&state.backup_dir)).spawn().map_err(|e| format!("打开目录失败：{e}"))?; }
    Ok(())
}


#[tauri::command]
fn app_version() -> AppVersionInfo {
    AppVersionInfo {
        edition: "v012",
        version: env!("CARGO_PKG_VERSION").to_string(),
    }
}

async fn check_update_from_source(app: &AppHandle, endpoint: &str) -> Result<Option<Update>, String> {
    let endpoint = Url::parse(endpoint).map_err(|e| format!("更新地址无效：{e}"))?;
    let updater = app
        .updater_builder()
        .endpoints(vec![endpoint])
        .map_err(|e| format!("无法设置更新地址：{e}"))?
        .timeout(Duration::from_secs(45))
        .build()
        .map_err(|e| format!("无法初始化更新器：{e}"))?;
    updater
        .check()
        .await
        .map_err(|e| format!("请求失败：{e}"))
}

#[tauri::command]
async fn check_for_update(
    app: AppHandle,
    pending_update: tauri::State<'_, PendingUpdate>,
) -> Result<Option<UpdateMetadata>, String> {
    *pending_update
        .0
        .lock()
        .map_err(|_| "更新状态锁异常".to_string())? = None;

    let mut failures = Vec::new();
    for (source_name, endpoint) in UPDATE_ENDPOINTS {
        for attempt in 1..=UPDATE_CHECK_ATTEMPTS_PER_SOURCE {
            match check_update_from_source(&app, endpoint).await {
                Ok(update) => {
                    let metadata = update.as_ref().map(|item| UpdateMetadata {
                        current_version: item.current_version.clone(),
                        version: item.version.clone(),
                        date: item.date.as_ref().map(ToString::to_string),
                        body: item.body.clone(),
                        source: source_name.to_string(),
                    });
                    *pending_update
                        .0
                        .lock()
                        .map_err(|_| "更新状态锁异常".to_string())? = update;
                    return Ok(metadata);
                }
                Err(error) => {
                    failures.push(format!("{source_name} 第{attempt}次：{error}"));
                    if attempt < UPDATE_CHECK_ATTEMPTS_PER_SOURCE {
                        sleep(Duration::from_millis(900 * attempt as u64)).await;
                    }
                }
            }
        }
    }

    Err(format!(
        "所有更新线路均不可用，程序已自动重试。请稍后再试。详细信息：{}",
        failures.join("；")
    ))
}

#[tauri::command]
async fn install_update(
    app: AppHandle,
    pending_update: tauri::State<'_, PendingUpdate>,
    on_event: Channel<UpdateDownloadEvent>,
) -> Result<(), String> {
    let update = pending_update
        .0
        .lock()
        .map_err(|_| "更新状态锁异常".to_string())?
        .as_ref()
        .cloned()
        .ok_or_else(|| "没有等待安装的更新，请先检查更新".to_string())?;

    let mut failures = Vec::new();
    for attempt in 1..=UPDATE_DOWNLOAD_ATTEMPTS {
        if attempt > 1 {
            let _ = on_event.send(UpdateDownloadEvent::Retrying {
                attempt,
                max_attempts: UPDATE_DOWNLOAD_ATTEMPTS,
                message: "下载连接中断，正在重新连接".to_string(),
            });
            sleep(Duration::from_millis(1200 * (attempt - 1) as u64)).await;
        }

        let mut started = false;
        match update
            .download(
                |chunk_length, content_length| {
                    if !started {
                        let _ = on_event.send(UpdateDownloadEvent::Started { content_length });
                        started = true;
                    }
                    let _ = on_event.send(UpdateDownloadEvent::Progress { chunk_length });
                },
                || {
                    let _ = on_event.send(UpdateDownloadEvent::Finished);
                },
            )
            .await
        {
            Ok(bytes) => {
                update
                    .install(bytes)
                    .map_err(|e| format!("更新包已下载，但安装失败：{e}"))?;
                *pending_update
                    .0
                    .lock()
                    .map_err(|_| "更新状态锁异常".to_string())? = None;
                app.restart();
                #[allow(unreachable_code)]
                return Ok(());
            }
            Err(error) => failures.push(format!("第{attempt}次下载失败：{error}")),
        }
    }

    Err(format!(
        "更新包下载失败，已自动重试{}次。请检查网络后重新点击下载。详细信息：{}",
        UPDATE_DOWNLOAD_ATTEMPTS,
        failures.join("；")
    ))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| -> Result<(), Box<dyn std::error::Error>> {
            let data_dir = app.path().app_data_dir()?;
            fs::create_dir_all(&data_dir)?;
            let backup_dir = data_dir.join("backups");
            fs::create_dir_all(&backup_dir)?;
            let database_path = data_dir.join("shmap.db");
            initialize_database(&database_path).map_err(std::io::Error::other)?;
            app.manage(AppState{database_path,backup_dir,operation_lock:Mutex::new(())});
            app.manage(github_auth::GitHubAuthState::new().map_err(std::io::Error::other)?);
            app.manage(PendingUpdate(Mutex::new(None)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_private_map_bundle,
            bootstrap_workspace,
            save_workspace,
            exit_application,
            create_backup,
            list_backups,
            restore_backup,
            storage_status,
            check_database,
            open_data_directory,
            app_version,
            publish_patch_to_github,
            check_for_update,
            install_update,
            github_auth::github_auth_status,
            github_auth::github_begin_device_flow,
            github_auth::github_complete_device_flow,
            github_auth::github_logout,
            github_auth::list_private_submissions,
            github_auth::read_private_submission,
            github_auth::resolve_private_asset,
            github_auth::open_github_device_page,
            github_auth::github_auth_configuration
        ])
        .run(tauri::generate_context!())
        .expect("山海经原典地图研究台启动失败");
}
