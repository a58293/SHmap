use chrono::{DateTime, SecondsFormat, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    env,
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::Mutex,
    time::Duration,
};
use tauri::{ipc::Channel, AppHandle, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};
use tokio::time::sleep;
use url::Url;

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
}

fn now_text() -> String { Utc::now().to_rfc3339_opts(SecondsFormat::Secs, true) }
fn hash_payload(payload: &str) -> String { hex::encode(Sha256::digest(payload.as_bytes())) }
fn parse_payload(payload: &str) -> Result<Value, String> { serde_json::from_str(payload).map_err(|e| format!("工作区JSON无效：{e}")) }
fn object_count(payload: &Value) -> usize { payload.get("objects").and_then(Value::as_array).map_or(0, Vec::len) }
fn open_connection(path: &Path) -> Result<Connection, String> { Connection::open(path).map_err(|e| format!("无法打开SQLite数据库：{e}")) }

fn repo_root_from(path: &Path) -> Option<PathBuf> {
    let mut cursor = if path.is_file() { path.parent()?.to_path_buf() } else { path.to_path_buf() };
    loop {
        if cursor.join(".git").exists() { return Some(cursor); }
        if !cursor.pop() { break; }
    }
    None
}

fn find_repo_root(repo_path: Option<String>) -> Result<PathBuf, String> {
    let mut candidates = Vec::<PathBuf>::new();
    if let Some(value) = repo_path.filter(|value| !value.trim().is_empty()) {
        candidates.push(PathBuf::from(value.trim()));
    }
    if let Ok(value) = env::var("SHMAP_REPO_DIR") {
        if !value.trim().is_empty() { candidates.push(PathBuf::from(value)); }
    }
    if let Ok(value) = env::current_dir() { candidates.push(value); }
    if let Ok(value) = env::current_exe() {
        if let Some(parent) = value.parent() { candidates.push(parent.to_path_buf()); }
    }
    #[cfg(target_os = "windows")]
    for drive in b'C'..=b'Z' {
        candidates.push(PathBuf::from(format!("{}:\\SHmap\\SHmap", drive as char)));
    }
    for candidate in candidates {
        if let Some(root) = repo_root_from(&candidate) {
            return Ok(root.canonicalize().unwrap_or(root));
        }
    }
    Err("PUBLISH_REPO_REQUIRED::未找到本地 SHmap Git 仓库。请在弹出的输入框中填写仓库根目录，例如 F:\\SHmap\\SHmap。".to_string())
}

fn git_works(executable: &Path) -> bool {
    Command::new(executable)
        .arg("--version")
        .output()
        .map(|output| output.status.success())
        .unwrap_or(false)
}

fn find_git_executable() -> Result<PathBuf, String> {
    let command = PathBuf::from("git");
    if git_works(&command) { return Ok(command); }

    let mut candidates = Vec::<PathBuf>::new();
    #[cfg(target_os = "windows")]
    {
        if let Ok(local) = env::var("LOCALAPPDATA") {
            let desktop_root = PathBuf::from(local).join("GitHubDesktop");
            if let Ok(entries) = fs::read_dir(desktop_root) {
                let mut app_dirs = entries.flatten()
                    .filter(|entry| entry.file_type().map(|kind| kind.is_dir()).unwrap_or(false))
                    .filter(|entry| entry.file_name().to_string_lossy().starts_with("app-"))
                    .map(|entry| entry.path())
                    .collect::<Vec<_>>();
                app_dirs.sort_by(|a, b| fs::metadata(b).and_then(|meta| meta.modified()).ok().cmp(&fs::metadata(a).and_then(|meta| meta.modified()).ok()));
                for app_dir in app_dirs {
                    candidates.push(app_dir.join("resources").join("app").join("git").join("cmd").join("git.exe"));
                    candidates.push(app_dir.join("resources").join("app").join("git").join("mingw64").join("bin").join("git.exe"));
                }
            }
        }
        for key in ["ProgramFiles", "ProgramFiles(x86)"] {
            if let Ok(root) = env::var(key) {
                candidates.push(PathBuf::from(root).join("Git").join("cmd").join("git.exe"));
            }
        }
    }
    for candidate in candidates {
        if candidate.exists() && git_works(&candidate) { return Ok(candidate); }
    }
    Err("未找到 Git。请安装 Git，或先安装并登录 GitHub Desktop。".to_string())
}

fn run_git(git: &Path, repo: &Path, args: &[String]) -> Result<String, String> {
    let output = Command::new(git)
        .args(args)
        .current_dir(repo)
        .env("GIT_TERMINAL_PROMPT", "0")
        .env("GCM_INTERACTIVE", "always")
        .output()
        .map_err(|error| format!("无法启动 Git：{error}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    if output.status.success() { return Ok(stdout); }
    let command = args.join(" ");
    let detail = if stderr.is_empty() { stdout } else { stderr };
    Err(format!("Git 命令失败（git {command}）：{detail}"))
}

fn git_args(values: &[&str]) -> Vec<String> { values.iter().map(|value| (*value).to_string()).collect() }

fn run_git_network(git: &Path, repo: &Path, operation: &[&str]) -> Result<String, String> {
    let mut args = git_args(&["-c", "http.version=HTTP/1.1", "-c", "http.lowSpeedLimit=0", "-c", "http.lowSpeedTime=999999"]);
    args.extend(operation.iter().map(|value| (*value).to_string()));
    let mut failures = Vec::new();
    for attempt in 1..=3 {
        match run_git(git, repo, &args) {
            Ok(value) => return Ok(value),
            Err(error) => {
                failures.push(format!("第{attempt}次：{error}"));
                if attempt < 3 { std::thread::sleep(Duration::from_millis(900 * attempt as u64)); }
            }
        }
    }
    Err(format!("GitHub 网络操作已重试3次仍失败：{}", failures.join("；")))
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

fn parse_ahead_behind(value: &str) -> Result<(usize, usize), String> {
    let parts = value.split_whitespace().collect::<Vec<_>>();
    if parts.len() != 2 { return Err(format!("无法解析 Git 同步状态：{value}")); }
    let behind = parts[0].parse::<usize>().map_err(|_| format!("无法解析落后提交数：{value}"))?;
    let ahead = parts[1].parse::<usize>().map_err(|_| format!("无法解析领先提交数：{value}"))?;
    Ok((behind, ahead))
}

fn publish_patch_blocking(
    repo_path: Option<String>,
    file_name: String,
    content: String,
    commit_message: String,
) -> Result<PublishPatchResponse, String> {
    let _payload = validate_patch_file(&file_name, &content)?;
    let repo = find_repo_root(repo_path)?;
    let git = find_git_executable()?;

    let remote = run_git(&git, &repo, &git_args(&["remote", "get-url", "origin"]))?;
    let normalized_remote = remote.to_ascii_lowercase().replace('\\', "/");
    if !normalized_remote.contains("github.com") || !normalized_remote.contains("a58293/shmap") {
        return Err(format!("当前仓库 origin 不是 a58293/SHmap：{remote}"));
    }
    let branch = run_git(&git, &repo, &git_args(&["branch", "--show-current"]))?;
    if branch.trim() != "main" {
        return Err(format!("当前 Git 分支是 {branch}。请先在 GitHub Desktop 切换到 main。"));
    }

    let relative_path = format!("submissions/pending/{file_name}");
    run_git_network(&git, &repo, &["fetch", "origin", "main"])?;
    let counts = run_git(&git, &repo, &git_args(&["rev-list", "--left-right", "--count", "origin/main...HEAD"]))?;
    let (mut behind, ahead) = parse_ahead_behind(&counts)?;
    if behind > 0 && ahead == 0 {
        run_git_network(&git, &repo, &["pull", "--ff-only", "origin", "main"])?;
        behind = 0;
    }
    if behind > 0 && ahead > 0 {
        return Err("本地 main 与 GitHub main 已产生分叉。请先在 GitHub Desktop 中处理同步冲突，再重试上传。".to_string());
    }
    if ahead > 0 {
        let ahead_files = run_git(&git, &repo, &git_args(&["-c", "core.quotepath=false", "diff", "--name-only", "origin/main..HEAD"]))?;
        let only_this_patch = ahead_files.lines().filter(|line| !line.trim().is_empty()).all(|line| line.trim().replace('\\', "/") == relative_path);
        if !only_this_patch {
            return Err("本地存在尚未推送的其他代码提交。请先在 GitHub Desktop 点击 Push origin，再重新完成本轮编辑。".to_string());
        }
    }

    let destination = repo.join("submissions").join("pending").join(&file_name);
    let parent = destination.parent().ok_or_else(|| "无法建立更改包目录".to_string())?;
    fs::create_dir_all(parent).map_err(|error| format!("无法创建 submissions/pending：{error}"))?;
    let temporary = destination.with_extension("shjpatch.tmp");
    fs::write(&temporary, content.as_bytes()).map_err(|error| format!("无法写入临时更改包：{error}"))?;
    if destination.exists() { fs::remove_file(&destination).map_err(|error| format!("无法替换旧更改包：{error}"))?; }
    fs::rename(&temporary, &destination).map_err(|error| format!("无法保存更改包：{error}"))?;

    let status = run_git(&git, &repo, &vec!["status".into(), "--porcelain".into(), "--".into(), relative_path.clone()])?;
    if !status.trim().is_empty() {
        run_git(&git, &repo, &vec!["add".into(), "--".into(), relative_path.clone()])?;
        let message = commit_message.replace('\r', " ").replace('\n', " ").trim().chars().take(180).collect::<String>();
        let message = if message.is_empty() { format!("data: 发布 {file_name}") } else { message };
        run_git(&git, &repo, &vec![
            "-c".into(), "user.name=SHmap Desktop".into(),
            "-c".into(), "user.email=shmap-desktop@users.noreply.github.com".into(),
            "commit".into(), "--only".into(), "--no-verify".into(), "-m".into(), message,
            "--".into(), relative_path.clone(),
        ])?;
    }

    let commit = run_git(&git, &repo, &git_args(&["rev-parse", "--short=12", "HEAD"]))?;
    run_git_network(&git, &repo, &["push", "origin", "HEAD:main"])
        .map_err(|error| format!("{error}。更改包已保留在本地提交中；恢复网络或 GitHub 登录后可直接点击“重试上传”。"))?;

    Ok(PublishPatchResponse {
        repo_path: repo.to_string_lossy().into_owned(),
        remote_path: relative_path,
        commit,
        pushed_at: now_text(),
    })
}

#[tauri::command]
async fn publish_patch_to_github(
    repo_path: Option<String>,
    file_name: String,
    content: String,
    commit_message: String,
) -> Result<PublishPatchResponse, String> {
    tauri::async_runtime::spawn_blocking(move || publish_patch_blocking(repo_path, file_name, content, commit_message))
        .await
        .map_err(|error| format!("自动上传任务异常：{error}"))?
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
fn save_object_image(
    app: AppHandle,
    object_id: String,
    bytes: Vec<u8>,
    extension: Option<String>,
) -> Result<String, String> {
    if bytes.is_empty() {
        return Err("图片内容为空".into());
    }
    if bytes.len() > 12 * 1024 * 1024 {
        return Err("图片超过12MB限制".into());
    }
    let safe_id: String = object_id
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    if safe_id.is_empty() {
        return Err("对象ID无效".into());
    }
    let ext = extension
        .unwrap_or_else(|| "webp".into())
        .to_ascii_lowercase();
    let ext = match ext.as_str() {
        "png" => "png",
        "jpg" | "jpeg" => "jpg",
        _ => "webp",
    };
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法定位程序数据目录：{e}"))?
        .join("images")
        .join("objects");
    fs::create_dir_all(&dir).map_err(|e| format!("无法创建图片目录：{e}"))?;
    for old_ext in ["webp", "png", "jpg"] {
        let old = dir.join(format!("{safe_id}.{old_ext}"));
        if old.exists() {
            let _ = fs::remove_file(old);
        }
    }
    let target = dir.join(format!("{safe_id}.{ext}"));
    fs::write(&target, bytes).map_err(|e| format!("无法写入图片：{e}"))?;
    Ok(target.to_string_lossy().into_owned())
}

#[tauri::command]
fn remove_object_image(app: AppHandle, object_id: String) -> Result<(), String> {
    let safe_id: String = object_id
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    if safe_id.is_empty() {
        return Ok(());
    }
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("无法定位程序数据目录：{e}"))?
        .join("images")
        .join("objects");
    for ext in ["webp", "png", "jpg"] {
        let file = dir.join(format!("{safe_id}.{ext}"));
        if file.exists() {
            fs::remove_file(file).map_err(|e| format!("无法删除图片：{e}"))?;
        }
    }
    Ok(())
}

#[tauri::command]
fn app_version() -> AppVersionInfo {
    AppVersionInfo {
        edition: "v006",
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
            app.manage(PendingUpdate(Mutex::new(None)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![bootstrap_workspace,save_workspace,create_backup,list_backups,restore_backup,storage_status,check_database,open_data_directory,save_object_image,remove_object_image,app_version,publish_patch_to_github,check_for_update,install_update])
        .run(tauri::generate_context!())
        .expect("山海经原典地图研究台启动失败");
}
