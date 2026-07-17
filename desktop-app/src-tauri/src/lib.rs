use chrono::{DateTime, SecondsFormat, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{fs, path::{Path, PathBuf}, process::Command, sync::Mutex};
use tauri::{ipc::Channel, AppHandle, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};

const APP_SCHEMA_VERSION: i64 = 1;
const AUTO_BACKUP_MINUTES: i64 = 60;
const MAX_AUTO_BACKUPS: usize = 48;

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
}

#[derive(Clone, Serialize)]
#[serde(tag = "event", content = "data", rename_all = "camelCase")]
enum UpdateDownloadEvent {
    Started { content_length: Option<u64> },
    Progress { chunk_length: usize },
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

fn now_text() -> String { Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true) }
fn hash_payload(payload: &str) -> String { hex::encode(Sha256::digest(payload.as_bytes())) }
fn parse_payload(payload: &str) -> Result<Value, String> { serde_json::from_str(payload).map_err(|e| format!("工作区JSON无效：{e}")) }
fn object_count(payload: &Value) -> usize { payload.get("objects").and_then(Value::as_array).map_or(0, Vec::len) }
fn open_connection(path: &Path) -> Result<Connection, String> { Connection::open(path).map_err(|e| format!("无法打开SQLite数据库：{e}")) }

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
    conn.execute("INSERT INTO backups(created_at,label,kind,object_count,payload_sha256,payload) VALUES(?1,?2,?3,?4,?5,?6)", params![created_at, label, kind, count as i64, hash, payload]).map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    let file_name = format!("{}_{}_{}.shjbackup.json", created_at.replace(':', "-"), id, safe_filename(label));
    let envelope = json!({"format":"shj-desktop-backup-v1","createdAt":created_at,"label":label,"kind":kind,"objectCount":count,"payloadSha256":hash,"workspace":parsed});
    fs::write(backup_dir.join(file_name), serde_json::to_vec_pretty(&envelope).map_err(|e| e.to_string())?).map_err(|e| format!("写入备份文件失败：{e}"))?;
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

#[tauri::command]
fn bootstrap_workspace(state: tauri::State<'_, AppState>, legacy_snapshot: Option<String>, seed_snapshot: String) -> Result<BootstrapResponse, String> {
    let _guard = state.operation_lock.lock().map_err(|_| "数据库锁异常".to_string())?;
    let conn = open_connection(&state.database_path)?;
    if let Some(payload) = current_payload(&conn)? {
        let parsed = parse_payload(&payload)?;
        return Ok(BootstrapResponse{snapshot:payload,source:"database".into(),database_path:state.database_path.to_string_lossy().into_owned(),object_count:object_count(&parsed)})
    }
    let (payload, source) = match legacy_snapshot.filter(|s| !s.trim().is_empty()) {
        Some(v) if parse_payload(&v).is_ok() => (v, "legacy-cache"),
        _ => (seed_snapshot, "v075-seed"),
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
fn save_workspace(state: tauri::State<'_, AppState>, payload: String) -> Result<SaveResponse, String> {
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
fn create_backup(state: tauri::State<'_, AppState>, label: Option<String>) -> Result<BackupSummary, String> {
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
fn list_backups(state: tauri::State<'_, AppState>, limit: Option<u32>) -> Result<Vec<BackupSummary>, String> {
    let _guard = state.operation_lock.lock().map_err(|_| "数据库锁异常".to_string())?;
    let conn = open_connection(&state.database_path)?;
    let mut stmt = conn.prepare("SELECT backup_id,created_at,label,kind,object_count,payload_sha256 FROM backups ORDER BY backup_id DESC LIMIT ?1").map_err(|e| e.to_string())?;
    let rows = stmt.query_map([limit.unwrap_or(80).clamp(1,500) as i64], |r| Ok(BackupSummary{backup_id:r.get(0)?,created_at:r.get(1)?,label:r.get(2)?,kind:r.get(3)?,object_count:r.get::<_,i64>(4)? as usize,payload_sha256:r.get(5)?})).map_err(|e| e.to_string())?;
    rows.collect::<Result<Vec<_>,_>>().map_err(|e| e.to_string())
}

#[tauri::command]
fn restore_backup(state: tauri::State<'_, AppState>, backup_id: i64) -> Result<RestoreResponse, String> {
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
fn storage_status(state: tauri::State<'_, AppState>) -> Result<StorageStatus, String> {
    let _guard = state.operation_lock.lock().map_err(|_| "数据库锁异常".to_string())?;
    let conn = open_connection(&state.database_path)?;
    let current: Option<(String,i64)> = conn.query_row("SELECT updated_at,object_count FROM current_workspace WHERE singleton_id=1", [], |r| Ok((r.get(0)?,r.get(1)?))).optional().map_err(|e| e.to_string())?;
    let backups: i64 = conn.query_row("SELECT COUNT(*) FROM backups", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    Ok(StorageStatus{database_path:state.database_path.to_string_lossy().into_owned(),backup_directory:state.backup_dir.to_string_lossy().into_owned(),updated_at:current.as_ref().map(|x|x.0.clone()),object_count:current.map_or(0,|x|x.1 as usize),backup_count:backups as usize,schema_version:APP_SCHEMA_VERSION})
}

#[tauri::command]
fn check_database(state: tauri::State<'_, AppState>) -> Result<CheckResult, String> {
    let _guard = state.operation_lock.lock().map_err(|_| "数据库锁异常".to_string())?;
    let conn = open_connection(&state.database_path)?;
    let result: String = conn.query_row("PRAGMA quick_check", [], |r| r.get(0)).map_err(|e| e.to_string())?;
    Ok(CheckResult{ok:result.eq_ignore_ascii_case("ok"),message:result})
}

#[tauri::command]
fn open_data_directory(state: tauri::State<'_, AppState>) -> Result<(), String> {
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
        edition: "v004",
        version: env!("CARGO_PKG_VERSION").to_string(),
    }
}

#[tauri::command]
async fn check_for_update(
    app: AppHandle,
    pending_update: tauri::State<'_, PendingUpdate>,
) -> Result<Option<UpdateMetadata>, String> {
    let updater = app
        .updater_builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("无法初始化更新器：{e}"))?;
    let update = updater
        .check()
        .await
        .map_err(|e| format!("检查更新失败：{e}"))?;
    let metadata = update.as_ref().map(|item| UpdateMetadata {
        current_version: item.current_version.clone(),
        version: item.version.clone(),
        date: item.date.as_ref().map(ToString::to_string),
        body: item.body.clone(),
    });
    *pending_update
        .0
        .lock()
        .map_err(|_| "更新状态锁异常".to_string())? = update;
    Ok(metadata)
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
        .take()
        .ok_or_else(|| "没有等待安装的更新，请先检查更新".to_string())?;
    let mut started = false;
    update
        .download_and_install(
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
        .map_err(|e| format!("下载或安装更新失败：{e}"))?;
    app.restart();
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
            app.manage(PendingUpdate(Mutex::new(None)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![bootstrap_workspace,save_workspace,create_backup,list_backups,restore_backup,storage_status,check_database,open_data_directory,app_version,check_for_update,install_update])
        .run(tauri::generate_context!())
        .expect("山海经原典地图研究台启动失败");
}
