[CmdletBinding()]
param(
  [string]$Version,
  [string]$Notes
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appRoot = Split-Path -Parent $scriptDir
$repoRoot = Split-Path -Parent $appRoot
Set-Location $repoRoot

function Stop-Release([string]$Message) {
  Write-Host "`n发布已停止：$Message" -ForegroundColor Red
  Read-Host "按回车关闭"
  exit 1
}

function Invoke-Checked {
  param(
    [string]$Label,
    [string]$File,
    [string[]]$Arguments = @()
  )
  & $File @Arguments
  if ($LASTEXITCODE -ne 0) {
    Stop-Release "$Label 失败（退出码 $LASTEXITCODE）。请查看上方日志。"
  }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Stop-Release "未找到 Git。请先安装 Git 或 GitHub Desktop。"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Stop-Release "未找到 Node.js。"
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Stop-Release "未找到 npm。"
}
if (-not (Test-Path ".git")) {
  Stop-Release "当前文件夹不是 Git 仓库。请在从 GitHub 克隆的 SHmap 文件夹中运行。"
}

$remoteUrl = (& git remote get-url origin 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($remoteUrl)) {
  Stop-Release "没有找到 origin 远程仓库。"
}
if ($remoteUrl -notmatch 'github\.com[:/]+a58293/SHmap(?:\.git)?$') {
  Stop-Release "origin 不是预期的 a58293/SHmap：$remoteUrl"
}

$branch = (& git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($branch)) {
  Stop-Release "无法识别当前 Git 分支。"
}

$current = (Get-Content "$appRoot/package.json" -Raw | ConvertFrom-Json).version
if (-not $Version) {
  $Version = Read-Host "请输入新版本号（当前 $current，例如 0.3.0）"
}
$Version = ($Version.Trim() -replace '^[vV]', '')
if ($Version -notmatch '^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$') {
  Stop-Release "版本号格式错误，应类似 0.3.0。"
}

try {
  $currentBase = [version](($current -split '-')[0])
  $newBase = [version](($Version -split '-')[0])
  if ($newBase -lt $currentBase) {
    Stop-Release "新版本 $Version 不能低于当前版本 $current。"
  }
} catch {
  Stop-Release "无法比较版本号：$($_.Exception.Message)"
}

if (-not $Notes) {
  $Notes = Read-Host "请输入本轮更新说明（一行即可）"
}
if ([string]::IsNullOrWhiteSpace($Notes)) {
  $Notes = "程序功能与稳定性更新。"
}

$tag = "desktop-v$Version"
$localTag = (& git tag --list $tag).Trim()
if ($LASTEXITCODE -ne 0) { Stop-Release "检查本地标签失败。" }
if ($localTag) { Stop-Release "本地标签 $tag 已存在。" }

$remoteTag = (& git ls-remote --tags origin "refs/tags/$tag").Trim()
if ($LASTEXITCODE -ne 0) { Stop-Release "检查 GitHub 标签失败，请确认网络和 Git 登录状态。" }
if ($remoteTag) { Stop-Release "GitHub 标签 $tag 已存在。" }

$dangerous = (& git status --porcelain) | Where-Object {
  $_ -match '(^|[\\/])(\.env(?:\.|$)|.*\.key$|.*private.*key|TAURI_SIGNING_PRIVATE_KEY)'
}
if ($dangerous) {
  Write-Host ($dangerous -join "`n") -ForegroundColor Yellow
  Stop-Release "检测到可能包含密钥或环境变量的待提交文件。请先移出仓库。"
}

Write-Host "`n即将发布 $tag" -ForegroundColor Cyan
Write-Host "分支：$branch"
Write-Host "远程：$remoteUrl"
Write-Host "更新说明：$Notes"
Write-Host "将自动执行：同步版本号 → 安装依赖 → 校验 → 前端构建 → 提交 → 创建标签 → 推送 GitHub → 自动生成 Release。"
$confirm = Read-Host "输入 RELEASE 确认"
if ($confirm -cne "RELEASE") {
  Stop-Release "用户取消。"
}

Invoke-Checked "同步版本号" "node" @("$appRoot/scripts/set-version.mjs", $Version)
Set-Content -Path "$appRoot/RELEASE_NOTES.md" -Value "# 山海经原典地图研究台 v$Version`n`n$Notes`n" -Encoding utf8

Push-Location $appRoot
try {
  Invoke-Checked "安装前端依赖" "npm" @("ci", "--registry=https://registry.npmjs.org/")
  Invoke-Checked "项目校验" "npm" @("run", "verify")
  Invoke-Checked "前端构建" "npm" @("run", "build")
  Invoke-Checked "发布标签校验" "node" @("scripts/verify-release-tag.mjs")
} finally {
  Pop-Location
}

Invoke-Checked "暂存文件" "git" @("add", "-A")
& git diff --cached --quiet
$hasStagedChanges = ($LASTEXITCODE -ne 0)
if ($hasStagedChanges) {
  Invoke-Checked "创建发布提交" "git" @("commit", "-m", "release: v$Version - $Notes")
} else {
  Write-Host "没有新的待提交文件，将直接为当前提交创建版本标签。" -ForegroundColor DarkYellow
}

Invoke-Checked "创建版本标签" "git" @("tag", "-a", $tag, "-m", $Notes)
Invoke-Checked "推送分支" "git" @("push", "origin", $branch)
Invoke-Checked "推送版本标签" "git" @("push", "origin", $tag)

Write-Host "`n已推送 $tag。GitHub Actions 将自动构建、签名并创建 Release。" -ForegroundColor Green
Write-Host "查看：https://github.com/a58293/SHmap/actions"
Start-Process "https://github.com/a58293/SHmap/actions" | Out-Null
Read-Host "按回车关闭"
