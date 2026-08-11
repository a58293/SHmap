use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use chrono::Utc;
use keyring::Entry;
use reqwest::{header, Client, StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{collections::HashMap, process::Command, sync::Mutex, time::Duration};
use url::Url;
use tokio::time::sleep;

const CLIENT_ID: &str = "Iv23livt94lUqNbtdR3t";
const REPOSITORY_OWNER: &str = "a58293";
const REPOSITORY_NAME: &str = "SHmap-Data";
const DEVICE_CODE_URL: &str = "https://github.com/login/device/code";
const ACCESS_TOKEN_URL: &str = "https://github.com/login/oauth/access_token";
const API_BASE: &str = "https://api.github.com";
const API_VERSION: &str = "2022-11-28";
const USER_AGENT: &str = "SHmap-Desktop/1.1-auth-preview";
const CREDENTIAL_SERVICE: &str = "art.tiphareth.shanhaijing.mapdesk.github";
const CREDENTIAL_ACCOUNT: &str = "github-user-access-token";
const PRIVATE_DATA_MANIFEST_PATH: &str = "manifest.json";
const PRIVATE_DATA_SCHEMA: &str = "shmap-private-data-manifest-v1";
const PRIVATE_BUNDLE_FORMAT: &str = "shmap-private-bootstrap-v1";

pub struct GitHubAuthState {
    client: Client,
    pending: Mutex<Option<PendingDeviceFlow>>,
    authorized_session: Mutex<Option<AuthorizedSession>>,
}

impl GitHubAuthState {
    pub fn new() -> Result<Self, String> {
        let client = Client::builder()
            .connect_timeout(Duration::from_secs(15))
            .timeout(Duration::from_secs(45))
            .build()
            .map_err(|error| format!("无法建立 GitHub 安全连接：{error}"))?;
        Ok(Self {
            client,
            pending: Mutex::new(None),
            authorized_session: Mutex::new(None),
        })
    }
}


#[derive(Clone)]
struct AuthorizedSession {
    login: String,
    can_write: bool,
    verified_at: i64,
}

#[derive(Clone)]
struct PendingDeviceFlow {
    device_code: String,
    interval: u64,
    expires_at: i64,
}

#[derive(Debug, Deserialize)]
struct DeviceCodeResponse {
    device_code: String,
    user_code: String,
    verification_uri: String,
    expires_in: i64,
    interval: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: Option<String>,
    token_type: Option<String>,
    expires_in: Option<i64>,
    refresh_token: Option<String>,
    refresh_token_expires_in: Option<i64>,
    error: Option<String>,
    error_description: Option<String>,
    interval: Option<u64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct StoredToken {
    access_token: String,
    token_type: String,
    expires_at: Option<i64>,
    refresh_token: Option<String>,
    refresh_token_expires_at: Option<i64>,
}

#[derive(Debug, Deserialize)]
struct GitHubUser {
    login: String,
    avatar_url: Option<String>,
}

#[derive(Debug, Deserialize, Default)]
struct RepositoryPermissions {
    pull: Option<bool>,
    push: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct RepositoryResponse {
    full_name: String,
    private: bool,
    permissions: Option<RepositoryPermissions>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PrivateDataManifest {
    schema_version: String,
    data_version: String,
    data_path: String,
    sha256: String,
    object_count: usize,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivateMapBundleResponse {
    payload: String,
    data_version: String,
    object_count: usize,
    sha256: String,
}

#[derive(Debug, Deserialize)]
struct GitHubContentEntry {
    name: String,
    path: String,
    sha: String,
    size: u64,
    #[serde(rename = "type")]
    kind: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivateSubmissionEntry {
    name: String,
    path: String,
    sha: String,
    size: u64,
    kind: String,
}

#[derive(Clone, Debug)]
pub struct PrivatePublishAsset {
    pub file_name: String,
    pub bytes: Vec<u8>,
}

#[derive(Clone, Debug)]
pub struct PrivatePublishResponse {
    pub repository: String,
    pub remote_path: String,
    pub commit: String,
    pub asset_count: usize,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitHubAuthStatus {
    signed_in: bool,
    authorized: bool,
    can_write: bool,
    login: Option<String>,
    avatar_url: Option<String>,
    repository: String,
    message: String,
    rate_limit_remaining: Option<String>,
    rate_limit_reset: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeviceFlowStart {
    user_code: String,
    verification_uri: String,
    expires_in: i64,
    interval: u64,
}

fn repository_full_name() -> String {
    format!("{REPOSITORY_OWNER}/{REPOSITORY_NAME}")
}

fn signed_out(message: impl Into<String>) -> GitHubAuthStatus {
    GitHubAuthStatus {
        signed_in: false,
        authorized: false,
        can_write: false,
        login: None,
        avatar_url: None,
        repository: repository_full_name(),
        message: message.into(),
        rate_limit_remaining: None,
        rate_limit_reset: None,
    }
}

fn clear_authorized_session(state: &GitHubAuthState) {
    if let Ok(mut session) = state.authorized_session.lock() {
        *session = None;
    }
}

fn set_authorized_session(state: &GitHubAuthState, login: String, can_write: bool) -> Result<(), String> {
    *state
        .authorized_session
        .lock()
        .map_err(|_| "GitHub 授权会话锁异常".to_string())? = Some(AuthorizedSession {
        login,
        can_write,
        verified_at: Utc::now().timestamp(),
    });
    Ok(())
}

pub(crate) fn require_authorized_session(state: &GitHubAuthState) -> Result<(), String> {
    let session = state
        .authorized_session
        .lock()
        .map_err(|_| "GitHub 授权会话锁异常".to_string())?;
    let Some(session) = session.as_ref() else {
        return Err("尚未通过 GitHub 私有地图权限验证，请重新登录".to_string());
    };
    if session.login.trim().is_empty() || session.verified_at <= 0 {
        return Err("GitHub 授权会话无效，请重新登录".to_string());
    }
    Ok(())
}

pub(crate) fn require_writable_session(state: &GitHubAuthState) -> Result<(), String> {
    let session = state
        .authorized_session
        .lock()
        .map_err(|_| "GitHub 授权会话锁异常".to_string())?;
    let Some(session) = session.as_ref() else {
        return Err("尚未通过 GitHub 私有地图权限验证，请重新登录".to_string());
    };
    if session.login.trim().is_empty() || session.verified_at <= 0 {
        return Err("GitHub 授权会话无效，请重新登录".to_string());
    }
    if !session.can_write {
        return Err("当前 GitHub 账号或 GitHub App 没有 SHmap-Data 写入权限。请给该账号仓库写权限，并将 GitHub App 的 Contents 权限设为 Read and write 后重新登录。".to_string());
    }
    Ok(())
}

fn credential_entry() -> Result<Entry, String> {
    Entry::new(CREDENTIAL_SERVICE, CREDENTIAL_ACCOUNT)
        .map_err(|error| format!("无法访问 Windows 凭据管理器：{error}"))
}

fn load_token() -> Result<Option<StoredToken>, String> {
    let entry = credential_entry()?;
    match entry.get_password() {
        Ok(value) => serde_json::from_str::<StoredToken>(&value)
            .map(Some)
            .map_err(|error| format!("GitHub 登录凭据格式无效：{error}")),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(format!("无法读取 GitHub 登录凭据：{error}")),
    }
}

fn save_token(token: &StoredToken) -> Result<(), String> {
    let payload = serde_json::to_string(token)
        .map_err(|error| format!("无法保存 GitHub 登录状态：{error}"))?;
    credential_entry()?
        .set_password(&payload)
        .map_err(|error| format!("无法写入 Windows 凭据管理器：{error}"))
}

fn delete_token() -> Result<(), String> {
    let entry = credential_entry()?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(format!("无法删除 GitHub 登录凭据：{error}")),
    }
}

fn token_from_response(value: TokenResponse) -> Result<StoredToken, String> {
    let now = Utc::now().timestamp();
    let access_token = value
        .access_token
        .filter(|item| !item.trim().is_empty())
        .ok_or_else(|| {
            value
                .error_description
                .or(value.error)
                .unwrap_or_else(|| "GitHub 未返回访问令牌".to_string())
        })?;
    Ok(StoredToken {
        access_token,
        token_type: value.token_type.unwrap_or_else(|| "bearer".to_string()),
        expires_at: value.expires_in.map(|seconds| now + seconds),
        refresh_token: value.refresh_token,
        refresh_token_expires_at: value.refresh_token_expires_in.map(|seconds| now + seconds),
    })
}

async fn refresh_token_if_needed(
    state: &GitHubAuthState,
    token: StoredToken,
) -> Result<StoredToken, String> {
    let now = Utc::now().timestamp();
    if token.expires_at.map(|value| value > now + 90).unwrap_or(true) {
        return Ok(token);
    }
    let refresh_token = token
        .refresh_token
        .clone()
        .ok_or_else(|| "GitHub 登录已过期，请重新登录".to_string())?;
    if token
        .refresh_token_expires_at
        .map(|value| value <= now + 90)
        .unwrap_or(false)
    {
        delete_token()?;
        return Err("GitHub 刷新凭据已过期，请重新登录".to_string());
    }
    let response = state
        .client
        .post(ACCESS_TOKEN_URL)
        .header(header::ACCEPT, "application/json")
        .header(header::USER_AGENT, USER_AGENT)
        .form(&[
            ("client_id", CLIENT_ID),
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token.as_str()),
        ])
        .send()
        .await
        .map_err(|error| format!("刷新 GitHub 登录失败：{error}"))?;
    let value = response
        .json::<TokenResponse>()
        .await
        .map_err(|error| format!("无法解析 GitHub 刷新响应：{error}"))?;
    let refreshed = token_from_response(value)?;
    save_token(&refreshed)?;
    Ok(refreshed)
}

async fn authenticated_get_with_accept(
    state: &GitHubAuthState,
    token: &StoredToken,
    path: &str,
    accept: &str,
) -> Result<reqwest::Response, String> {
    state
        .client
        .get(format!("{API_BASE}{path}"))
        .header(header::ACCEPT, accept)
        .header(header::AUTHORIZATION, format!("Bearer {}", token.access_token))
        .header(header::USER_AGENT, USER_AGENT)
        .header("X-GitHub-Api-Version", API_VERSION)
        .send()
        .await
        .map_err(|error| format!("无法连接 GitHub：{error}"))
}

async fn authenticated_get(
    state: &GitHubAuthState,
    token: &StoredToken,
    path: &str,
) -> Result<reqwest::Response, String> {
    authenticated_get_with_accept(state, token, path, "application/vnd.github+json").await
}

async fn verify_token(
    state: &GitHubAuthState,
    token: &StoredToken,
) -> Result<GitHubAuthStatus, String> {
    let user_response = authenticated_get(state, token, "/user").await?;
    if user_response.status() == StatusCode::UNAUTHORIZED {
        clear_authorized_session(state);
        delete_token()?;
        return Ok(signed_out("GitHub 登录已经失效，请重新登录"));
    }
    if !user_response.status().is_success() {
        return Err(format!(
            "GitHub 用户身份检查失败（HTTP {}）",
            user_response.status().as_u16()
        ));
    }
    let user = user_response
        .json::<GitHubUser>()
        .await
        .map_err(|error| format!("无法解析 GitHub 用户信息：{error}"))?;

    let repo_response = authenticated_get(
        state,
        token,
        &format!("/repos/{REPOSITORY_OWNER}/{REPOSITORY_NAME}"),
    )
    .await?;
    let rate_limit_remaining = repo_response
        .headers()
        .get("x-ratelimit-remaining")
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);
    let rate_limit_reset = repo_response
        .headers()
        .get("x-ratelimit-reset")
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);

    if repo_response.status() == StatusCode::FORBIDDEN
        && rate_limit_remaining.as_deref() == Some("0")
    {
        let reset = rate_limit_reset
            .as_deref()
            .unwrap_or("未知时间");
        return Err(format!("GitHub API 请求额度暂时耗尽，恢复时间戳：{reset}"));
    }
    if repo_response.status() == StatusCode::NOT_FOUND
        || repo_response.status() == StatusCode::FORBIDDEN
    {
        clear_authorized_session(state);
        return Ok(GitHubAuthStatus {
            signed_in: true,
            authorized: false,
            can_write: false,
            login: Some(user.login),
            avatar_url: user.avatar_url,
            repository: repository_full_name(),
            message: "该 GitHub 账号没有 SHmap-Data 访问权限，请联系仓库管理员".to_string(),
            rate_limit_remaining,
            rate_limit_reset,
        });
    }
    if !repo_response.status().is_success() {
        return Err(format!(
            "GitHub 仓库权限检查失败（HTTP {}）",
            repo_response.status().as_u16()
        ));
    }
    let repository = repo_response
        .json::<RepositoryResponse>()
        .await
        .map_err(|error| format!("无法解析 GitHub 仓库信息：{error}"))?;
    let permissions = repository.permissions.unwrap_or_default();
    let can_read = permissions.pull.unwrap_or(true);
    let can_write = permissions.push.unwrap_or(false);
    let authorized = repository.private && can_read;
    if authorized {
        set_authorized_session(state, user.login.clone(), can_write)?;
    } else {
        clear_authorized_session(state);
    }
    Ok(GitHubAuthStatus {
        signed_in: true,
        authorized,
        can_write,
        login: Some(user.login),
        avatar_url: user.avatar_url,
        repository: repository.full_name,
        message: if authorized {
            "GitHub 身份和私有地图仓库权限验证通过".to_string()
        } else {
            "目标仓库不是受保护的私有仓库，已拒绝加载正式地图".to_string()
        },
        rate_limit_remaining,
        rate_limit_reset,
    })
}

#[tauri::command]
pub async fn github_auth_status(
    state: tauri::State<'_, GitHubAuthState>,
) -> Result<GitHubAuthStatus, String> {
    let token = match load_token()? {
        Some(value) => value,
        None => {
            clear_authorized_session(&state);
            return Ok(signed_out("尚未使用 GitHub 登录"));
        }
    };
    let token = match refresh_token_if_needed(&state, token).await {
        Ok(value) => value,
        Err(message) => {
            clear_authorized_session(&state);
            let _ = delete_token();
            return Ok(signed_out(message));
        }
    };
    verify_token(&state, &token).await
}

#[tauri::command]
pub async fn github_begin_device_flow(
    state: tauri::State<'_, GitHubAuthState>,
) -> Result<DeviceFlowStart, String> {
    let response = state
        .client
        .post(DEVICE_CODE_URL)
        .header(header::ACCEPT, "application/json")
        .header(header::USER_AGENT, USER_AGENT)
        .form(&[("client_id", CLIENT_ID)])
        .send()
        .await
        .map_err(|error| format!("无法开始 GitHub 登录：{error}"))?;
    if !response.status().is_success() {
        return Err(format!(
            "GitHub 登录请求失败（HTTP {}），请确认 Device Flow 已启用",
            response.status().as_u16()
        ));
    }
    let value = response
        .json::<DeviceCodeResponse>()
        .await
        .map_err(|error| format!("无法解析 GitHub 登录验证码：{error}"))?;
    let interval = value.interval.unwrap_or(5).max(5);
    let expires_at = Utc::now().timestamp() + value.expires_in;
    *state
        .pending
        .lock()
        .map_err(|_| "GitHub 登录状态锁异常".to_string())? = Some(PendingDeviceFlow {
        device_code: value.device_code,
        interval,
        expires_at,
    });
    Ok(DeviceFlowStart {
        user_code: value.user_code,
        verification_uri: value.verification_uri,
        expires_in: value.expires_in,
        interval,
    })
}

#[tauri::command]
pub async fn github_complete_device_flow(
    state: tauri::State<'_, GitHubAuthState>,
) -> Result<GitHubAuthStatus, String> {
    let mut pending = state
        .pending
        .lock()
        .map_err(|_| "GitHub 登录状态锁异常".to_string())?
        .clone()
        .ok_or_else(|| "没有等待确认的 GitHub 登录，请重新点击登录".to_string())?;

    loop {
        if Utc::now().timestamp() >= pending.expires_at {
            *state
                .pending
                .lock()
                .map_err(|_| "GitHub 登录状态锁异常".to_string())? = None;
            return Err("GitHub 登录验证码已过期，请重新开始登录".to_string());
        }
        sleep(Duration::from_secs(pending.interval)).await;
        let response = state
            .client
            .post(ACCESS_TOKEN_URL)
            .header(header::ACCEPT, "application/json")
            .header(header::USER_AGENT, USER_AGENT)
            .form(&[
                ("client_id", CLIENT_ID),
                ("device_code", pending.device_code.as_str()),
                ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
            ])
            .send()
            .await
            .map_err(|error| format!("等待 GitHub 登录确认时网络失败：{error}"))?;
        let value = response
            .json::<TokenResponse>()
            .await
            .map_err(|error| format!("无法解析 GitHub 登录确认结果：{error}"))?;
        match value.error.as_deref() {
            Some("authorization_pending") => continue,
            Some("slow_down") => {
                pending.interval = value.interval.unwrap_or(pending.interval + 5).max(pending.interval + 5);
                continue;
            }
            Some("access_denied") => {
                return Err("你已在 GitHub 取消本次授权".to_string());
            }
            Some("expired_token") => {
                return Err("GitHub 登录验证码已过期，请重新开始登录".to_string());
            }
            Some(error) => {
                return Err(value.error_description.unwrap_or_else(|| error.to_string()));
            }
            None => {
                let token = token_from_response(value)?;
                save_token(&token)?;
                *state
                    .pending
                    .lock()
                    .map_err(|_| "GitHub 登录状态锁异常".to_string())? = None;
                return verify_token(&state, &token).await;
            }
        }
    }
}

#[tauri::command]
pub fn github_logout(state: tauri::State<'_, GitHubAuthState>) -> Result<(), String> {
    *state
        .pending
        .lock()
        .map_err(|_| "GitHub 登录状态锁异常".to_string())? = None;
    clear_authorized_session(&state);
    delete_token()
}

async fn active_authorized_token(state: &GitHubAuthState) -> Result<StoredToken, String> {
    require_authorized_session(state)?;
    let token = load_token()?.ok_or_else(|| "GitHub 登录凭据不存在，请重新登录".to_string())?;
    match refresh_token_if_needed(state, token).await {
        Ok(value) => Ok(value),
        Err(error) => {
            clear_authorized_session(state);
            Err(error)
        }
    }
}

fn validate_private_data_path(path: &str) -> Result<(), String> {
    if path.is_empty()
        || path.starts_with('/')
        || path.contains("..")
        || path.contains('\\')
        || !path.starts_with("production/")
        || !path.chars().all(|c| c.is_ascii_alphanumeric() || matches!(c, '/' | '-' | '_' | '.'))
    {
        return Err("SHmap-Data manifest 中的数据路径不安全".to_string());
    }
    Ok(())
}

async fn fetch_private_repo_raw(
    state: &GitHubAuthState,
    token: &StoredToken,
    path: &str,
) -> Result<String, String> {
    let api_path = format!(
        "/repos/{REPOSITORY_OWNER}/{REPOSITORY_NAME}/contents/{path}?ref=main"
    );
    let response = authenticated_get_with_accept(
        state,
        token,
        &api_path,
        "application/vnd.github.raw+json",
    )
    .await?;
    if response.status() == StatusCode::UNAUTHORIZED {
        clear_authorized_session(state);
        let _ = delete_token();
        return Err("GitHub 登录已经失效，请重新登录".to_string());
    }
    if response.status() == StatusCode::NOT_FOUND || response.status() == StatusCode::FORBIDDEN {
        clear_authorized_session(state);
        return Err(format!("无法读取私有地图文件 {path}，请检查账号仓库权限与 GitHub App 的 Contents 权限"));
    }
    if !response.status().is_success() {
        return Err(format!(
            "读取私有地图文件 {path} 失败（HTTP {}）",
            response.status().as_u16()
        ));
    }
    response
        .text()
        .await
        .map_err(|error| format!("读取私有地图文件 {path} 内容失败：{error}"))
}

fn validate_private_submission_path(path: &str) -> Result<(), String> {
    if !path.starts_with("submissions/pending/")
        || !path.ends_with(".shjpatch")
        || path.starts_with('/')
        || path.contains("..")
        || path.contains('\\')
        || path.split('/').any(|part| part.is_empty())
    {
        return Err("Invalid private submission path".to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn list_private_submissions(
    state: tauri::State<'_, GitHubAuthState>,
) -> Result<Vec<PrivateSubmissionEntry>, String> {
    let token = active_authorized_token(&state).await?;
    let api_path = format!(
        "/repos/{REPOSITORY_OWNER}/{REPOSITORY_NAME}/contents/submissions/pending?ref=main"
    );
    let response = authenticated_get(&state, &token, &api_path).await?;
    if response.status() == StatusCode::NOT_FOUND {
        return Ok(Vec::new());
    }
    if response.status() == StatusCode::UNAUTHORIZED {
        clear_authorized_session(&state);
        let _ = delete_token();
        return Err("GitHub login expired; please sign in again".to_string());
    }
    if !response.status().is_success() {
        return Err(format!(
            "Unable to list private submissions (HTTP {})",
            response.status().as_u16()
        ));
    }
    let mut entries = response
        .json::<Vec<GitHubContentEntry>>()
        .await
        .map_err(|error| format!("Invalid private submission listing: {error}"))?
        .into_iter()
        .filter(|entry| entry.kind == "file" && entry.name.ends_with(".shjpatch"))
        .map(|entry| PrivateSubmissionEntry {
            name: entry.name,
            path: entry.path,
            sha: entry.sha,
            size: entry.size,
            kind: entry.kind,
        })
        .collect::<Vec<_>>();
    entries.sort_by(|left, right| right.name.cmp(&left.name));
    Ok(entries)
}

#[tauri::command]
pub async fn read_private_submission(
    state: tauri::State<'_, GitHubAuthState>,
    path: String,
) -> Result<String, String> {
    validate_private_submission_path(&path)?;
    let token = active_authorized_token(&state).await?;
    fetch_private_repo_raw(&state, &token, &path).await
}

fn private_contents_url(path: &str) -> Result<Url, String> {
    if path.is_empty() || path.starts_with('/') || path.contains('\\') || path.split('/').any(|part| part.is_empty() || matches!(part, "." | "..")) {
        return Err("SHmap-Data 文件路径无效".to_string());
    }
    let mut url = Url::parse(&format!(
        "{API_BASE}/repos/{REPOSITORY_OWNER}/{REPOSITORY_NAME}/contents/"
    ))
    .map_err(|error| format!("无法建立 GitHub API 地址：{error}"))?;
    {
        let mut segments = url
            .path_segments_mut()
            .map_err(|_| "无法建立 GitHub Contents API 路径".to_string())?;
        segments.pop_if_empty();
        for part in path.split('/') {
            segments.push(part);
        }
    }
    Ok(url)
}

async fn fetch_private_repo_bytes_if_exists(
    state: &GitHubAuthState,
    token: &StoredToken,
    path: &str,
) -> Result<Option<Vec<u8>>, String> {
    let url = private_contents_url(path)?;
    let response = state
        .client
        .get(url)
        .header(header::ACCEPT, "application/vnd.github.raw+json")
        .header(header::AUTHORIZATION, format!("Bearer {}", token.access_token))
        .header(header::USER_AGENT, USER_AGENT)
        .header("X-GitHub-Api-Version", API_VERSION)
        .send()
        .await
        .map_err(|error| format!("无法连接 GitHub：{error}"))?;

    if response.status() == StatusCode::UNAUTHORIZED {
        clear_authorized_session(state);
        let _ = delete_token();
        return Err("GitHub 登录已经失效，请重新登录".to_string());
    }
    if response.status() == StatusCode::NOT_FOUND {
        return Ok(None);
    }
    if response.status() == StatusCode::FORBIDDEN {
        let remaining = response
            .headers()
            .get("x-ratelimit-remaining")
            .and_then(|value| value.to_str().ok());
        if remaining == Some("0") {
            let reset = response
                .headers()
                .get("x-ratelimit-reset")
                .and_then(|value| value.to_str().ok())
                .unwrap_or("未知时间");
            return Err(format!("GitHub API 请求额度暂时耗尽，恢复时间戳：{reset}"));
        }
        return Err("当前 GitHub App 没有读取 SHmap-Data Contents 的权限".to_string());
    }
    if !response.status().is_success() {
        return Err(format!(
            "读取 SHmap-Data/{path} 失败（HTTP {}）",
            response.status().as_u16()
        ));
    }
    let bytes = response
        .bytes()
        .await
        .map_err(|error| format!("读取 SHmap-Data/{path} 内容失败：{error}"))?;
    Ok(Some(bytes.to_vec()))
}

fn clean_commit_message(value: &str, fallback: &str) -> String {
    let cleaned = value
        .replace('\r', " ")
        .replace('\n', " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");
    let limited = cleaned.chars().take(180).collect::<String>();
    if limited.is_empty() { fallback.to_string() } else { limited }
}

async fn create_private_repo_file(
    state: &GitHubAuthState,
    token: &StoredToken,
    path: &str,
    bytes: &[u8],
    commit_message: &str,
) -> Result<Option<String>, String> {
    if let Some(existing) = fetch_private_repo_bytes_if_exists(state, token, path).await? {
        if existing == bytes {
            return Ok(None);
        }
        return Err(format!(
            "SHmap-Data/{path} 已存在同名但内容不同的文件。为避免覆盖他人的提交，本次上传已停止。"
        ));
    }

    let url = private_contents_url(path)?;
    let response = state
        .client
        .put(url)
        .header(header::ACCEPT, "application/vnd.github+json")
        .header(header::AUTHORIZATION, format!("Bearer {}", token.access_token))
        .header(header::USER_AGENT, USER_AGENT)
        .header("X-GitHub-Api-Version", API_VERSION)
        .json(&json!({
            "message": commit_message,
            "content": BASE64_STANDARD.encode(bytes),
            "branch": "main"
        }))
        .send()
        .await
        .map_err(|error| format!("写入 SHmap-Data/{path} 失败：{error}"))?;

    if response.status() == StatusCode::UNAUTHORIZED {
        clear_authorized_session(state);
        let _ = delete_token();
        return Err("GitHub 登录已经失效，请重新登录".to_string());
    }
    if response.status() == StatusCode::FORBIDDEN {
        let remaining = response
            .headers()
            .get("x-ratelimit-remaining")
            .and_then(|value| value.to_str().ok());
        if remaining == Some("0") {
            let reset = response
                .headers()
                .get("x-ratelimit-reset")
                .and_then(|value| value.to_str().ok())
                .unwrap_or("未知时间");
            return Err(format!("GitHub API 请求额度暂时耗尽，恢复时间戳：{reset}"));
        }
        return Err("没有 SHmap-Data 写入权限。请确认协作者权限，并将 GitHub App 的 Contents 权限设为 Read and write 后重新登录。".to_string());
    }
    if response.status() == StatusCode::CONFLICT || response.status() == StatusCode::UNPROCESSABLE_ENTITY {
        return Err(format!(
            "SHmap-Data/{path} 在上传期间发生并发冲突。请重新检查更改包列表后再重试。"
        ));
    }
    if !response.status().is_success() {
        let status = response.status().as_u16();
        let detail = response.text().await.unwrap_or_default();
        let detail = detail.chars().take(300).collect::<String>();
        return Err(format!("写入 SHmap-Data/{path} 失败（HTTP {status}）：{detail}"));
    }
    let value = response
        .json::<Value>()
        .await
        .map_err(|error| format!("无法解析 SHmap-Data 写入响应：{error}"))?;
    let commit = value
        .get("commit")
        .and_then(|value| value.get("sha"))
        .and_then(Value::as_str)
        .unwrap_or("")
        .chars()
        .take(12)
        .collect::<String>();
    Ok(if commit.is_empty() { None } else { Some(commit) })
}

async fn current_main_commit_short(
    state: &GitHubAuthState,
    token: &StoredToken,
) -> Result<String, String> {
    let response = authenticated_get(
        state,
        token,
        &format!("/repos/{REPOSITORY_OWNER}/{REPOSITORY_NAME}/commits/main"),
    )
    .await?;
    if !response.status().is_success() {
        return Ok("已存在".to_string());
    }
    let value = response.json::<Value>().await.unwrap_or(Value::Null);
    let commit = value
        .get("sha")
        .and_then(Value::as_str)
        .unwrap_or("已存在")
        .chars()
        .take(12)
        .collect::<String>();
    Ok(commit)
}

pub async fn publish_private_submission(
    state: &GitHubAuthState,
    file_name: &str,
    patch_bytes: &[u8],
    assets: Vec<PrivatePublishAsset>,
    commit_message: &str,
) -> Result<PrivatePublishResponse, String> {
    require_writable_session(state)?;
    let token = active_authorized_token(state).await?;
    let patch_path = format!("submissions/pending/{file_name}");
    let mut last_commit = None::<String>;

    // 图片先上传，pending 更改包最后上传。这样 pending 中出现的包一定已经具备所需资源。
    for asset in &assets {
        let path = format!("submissions/assets/{}", asset.file_name);
        let message = format!("data: add asset {}", asset.file_name.chars().take(24).collect::<String>());
        if let Some(commit) = create_private_repo_file(state, &token, &path, &asset.bytes, &message).await? {
            last_commit = Some(commit);
        }
    }

    let fallback = format!("data: 发布 {file_name}");
    let message = clean_commit_message(commit_message, &fallback);
    if let Some(commit) = create_private_repo_file(state, &token, &patch_path, patch_bytes, &message).await? {
        last_commit = Some(commit);
    }

    let commit = match last_commit {
        Some(value) => value,
        None => current_main_commit_short(state, &token).await?,
    };

    Ok(PrivatePublishResponse {
        repository: format!("github:{REPOSITORY_OWNER}/{REPOSITORY_NAME}"),
        remote_path: patch_path,
        commit,
        asset_count: assets.len(),
    })
}

pub async fn load_private_map_bundle(
    state: &GitHubAuthState,
) -> Result<PrivateMapBundleResponse, String> {
    let token = active_authorized_token(state).await?;
    let manifest_text = fetch_private_repo_raw(state, &token, PRIVATE_DATA_MANIFEST_PATH).await?;
    let manifest = serde_json::from_str::<PrivateDataManifest>(&manifest_text)
        .map_err(|error| format!("SHmap-Data manifest.json 无效：{error}"))?;
    if manifest.schema_version != PRIVATE_DATA_SCHEMA {
        return Err(format!(
            "SHmap-Data manifest 版本不兼容：{}",
            manifest.schema_version
        ));
    }
    validate_private_data_path(&manifest.data_path)?;
    let payload = fetch_private_repo_raw(state, &token, &manifest.data_path).await?;
    let actual_sha = hex::encode(Sha256::digest(payload.as_bytes()));
    if !manifest.sha256.eq_ignore_ascii_case(&actual_sha) {
        return Err("私有地图数据 SHA-256 校验失败，已拒绝加载".to_string());
    }
    let bundle: Value = serde_json::from_str(&payload)
        .map_err(|error| format!("私有地图数据 JSON 无效：{error}"))?;
    if bundle.get("format").and_then(Value::as_str) != Some(PRIVATE_BUNDLE_FORMAT) {
        return Err("私有地图数据格式不受支持".to_string());
    }
    let globals = bundle
        .get("globals")
        .and_then(Value::as_object)
        .ok_or_else(|| "私有地图数据缺少 globals".to_string())?;
    let object_count = globals
        .get("SHJ_INITIAL_DATA")
        .and_then(|value| value.get("objects"))
        .and_then(Value::as_array)
        .map_or(0, Vec::len);
    if object_count == 0 || object_count != manifest.object_count {
        return Err(format!(
            "私有地图对象数校验失败：manifest={}，实际={object_count}",
            manifest.object_count
        ));
    }
    let data_version = globals
        .get("SHJ_INITIAL_DATA")
        .and_then(|value| value.get("metadata"))
        .and_then(|value| value.get("dataVersion"))
        .and_then(Value::as_str)
        .unwrap_or("");
    if data_version != manifest.data_version {
        return Err(format!(
            "私有地图版本校验失败：manifest={}，实际={data_version}",
            manifest.data_version
        ));
    }
    Ok(PrivateMapBundleResponse {
        payload,
        data_version: manifest.data_version,
        object_count,
        sha256: actual_sha,
    })
}

#[tauri::command]
pub fn open_github_device_page(url: String) -> Result<(), String> {
    if url != "https://github.com/login/device" {
        return Err("拒绝打开非 GitHub 登录地址".to_string());
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&url)
            .spawn()
            .map_err(|error| format!("无法打开系统浏览器：{error}"))?;
        return Ok(());
    }
    #[cfg(not(target_os = "windows"))]
    {
        let _ = url;
        Err("当前平台暂不支持自动打开登录页，请手动访问 github.com/login/device".to_string())
    }
}

#[tauri::command]
pub fn github_auth_configuration() -> HashMap<&'static str, &'static str> {
    HashMap::from([
        ("clientId", CLIENT_ID),
        ("repositoryOwner", REPOSITORY_OWNER),
        ("repositoryName", REPOSITORY_NAME),
    ])
}
