[CmdletBinding()]
param(
  [string]$Version,
  [string]$Notes
)

$ErrorActionPreference = "Stop"
$utf8 = New-Object System.Text.UTF8Encoding($false)
[Console]::InputEncoding = $utf8
[Console]::OutputEncoding = $utf8
$OutputEncoding = $utf8
$Host.UI.RawUI.WindowTitle = "SHmap Release"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appRoot = Split-Path -Parent $scriptDir
$repoRoot = Split-Path -Parent $appRoot
Set-Location $repoRoot

function Stop-Release([string]$Message) {
  Write-Host "`n发布已停止：$Message" -ForegroundColor Red
  Read-Host "按回车关闭"
  exit 1
}

function Resolve-Executable {
  param(
    [string[]]$Names,
    [string[]]$Fallbacks = @()
  )

  foreach ($name in $Names) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cmd) {
      if ($cmd.Path) { return [string]$cmd.Path }
      if ($cmd.Source) { return [string]$cmd.Source }
      if ($cmd.Definition) { return [string]$cmd.Definition }
    }
  }

  foreach ($path in $Fallbacks) {
    if ($path -and (Test-Path $path)) { return [string]$path }
  }

  return $null
}

function Invoke-Captured {
  param(
    [string]$File,
    [string[]]$Arguments = @()
  )

  $captured = & $File @Arguments
  $exitCode = $LASTEXITCODE
  $text = ""
  if ($null -ne $captured) {
    $text = (($captured | ForEach-Object { [string]$_ }) -join "`n").Trim()
  }

  return [PSCustomObject]@{
    Text = $text
    ExitCode = $exitCode
  }
}

function Invoke-Checked {
  param(
    [string]$Label,
    [string]$File,
    [string[]]$Arguments = @()
  )

  Write-Host "`n[$Label]" -ForegroundColor Cyan
  & $File @Arguments
  if ($LASTEXITCODE -ne 0) {
    Stop-Release "$Label 失败（退出码 $LASTEXITCODE）。请查看上方日志。"
  }
}

$nodeExe = Resolve-Executable @("node.exe", "node") @("$env:ProgramFiles\nodejs\node.exe")
$npmCmd = Resolve-Executable @("npm.cmd") @("$env:ProgramFiles\nodejs\npm.cmd")
$gitFallbacks = @(
  "$env:ProgramFiles\Git\cmd\git.exe",
  "$env:ProgramFiles\Git\bin\git.exe",
  "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
)

$githubDesktopGit = Get-ChildItem "$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe" -ErrorAction SilentlyContinue |
  Sort-Object FullName -Descending |
  Select-Object -First 1 -ExpandProperty FullName
if ($githubDesktopGit) { $gitFallbacks += $githubDesktopGit }

$gitExe = Resolve-Executable @("git.exe", "git") $gitFallbacks

if (-not $gitExe) { Stop-Release "未找到 Git。请先安装 Git，或确认 GitHub Desktop 已安装。" }
if (-not $nodeExe) { Stop-Release "未找到 Node.js。" }
if (-not $npmCmd) { Stop-Release "未找到 npm.cmd。" }
if (-not (Test-Path (Join-Path $repoRoot ".git"))) {
  Stop-Release "当前文件夹不是 Git 仓库。请把发布工具放在通过 GitHub Desktop 克隆的 SHmap 根目录。"
}

$remoteResult = Invoke-Captured $gitExe @("remote", "get-url", "origin")
$remoteUrl = $remoteResult.Text
if ($remoteResult.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($remoteUrl)) {
  Stop-Release "没有找到 origin 远程仓库。"
}
if ($remoteUrl -notmatch 'github\.com[:/]+a58293/SHmap(?:\.git)?$') {
  Stop-Release "origin 不是预期的 a58293/SHmap：$remoteUrl"
}

$branchResult = Invoke-Captured $gitExe @("branch", "--show-current")
$branch = $branchResult.Text
if ($branchResult.ExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($branch)) {
  Stop-Release "无法识别当前 Git 分支。"
}

$packageJson = Join-Path $appRoot "package.json"
if (-not (Test-Path $packageJson)) { Stop-Release "找不到 desktop-app\package.json。" }
$current = (Get-Content $packageJson -Raw | ConvertFrom-Json).version

if (-not $Version) {
  $Version = Read-Host "请输入新版本号（当前 $current，例如 0.3.0）"
}
if ($null -eq $Version) { Stop-Release "没有输入版本号。" }
$Version = ([string]$Version).Trim() -replace '^[vV]', ''
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
if ([string]::IsNullOrWhiteSpace([string]$Notes)) {
  $Notes = "程序功能与稳定性更新。"
}

$tag = "desktop-v$Version"

$localTagResult = Invoke-Captured $gitExe @("tag", "--list", $tag)
if ($localTagResult.ExitCode -ne 0) { Stop-Release "检查本地标签失败。" }
if (-not [string]::IsNullOrWhiteSpace($localTagResult.Text)) {
  Stop-Release "本地标签 $tag 已存在。"
}

$remoteTagResult = Invoke-Captured $gitExe @("ls-remote", "--tags", "origin", "refs/tags/$tag")
if ($remoteTagResult.ExitCode -ne 0) {
  Stop-Release "检查 GitHub 标签失败，请确认网络和 Git 登录状态。"
}
if (-not [string]::IsNullOrWhiteSpace($remoteTagResult.Text)) {
  Stop-Release "GitHub 标签 $tag 已存在。"
}

$dangerous = (& $gitExe status --porcelain) | Where-Object {
  $_ -match '(^|[\\/])(\.env(?:\.|$)|.*\.key$|.*private.*key|TAURI_SIGNING_PRIVATE_KEY)'
}
if ($dangerous) {
  Write-Host ($dangerous -join "`n") -ForegroundColor Yellow
  Stop-Release "检测到可能包含密钥或环境变量的待提交文件。请先移出仓库。"
}

Write-Host "`n即将发布 $tag" -ForegroundColor Green
Write-Host "分支：$branch"
Write-Host "远程：$remoteUrl"
Write-Host "更新说明：$Notes"
Write-Host "将执行：同步版本号、校验、前端构建、提交、创建标签并推送 GitHub。"
$confirm = Read-Host "输入 RELEASE 确认"
if ($confirm -cne "RELEASE") { Stop-Release "用户取消。" }

Invoke-Checked "同步版本号" $nodeExe @("$appRoot\scripts\set-version.mjs", $Version)
$notesFile = Join-Path $appRoot "RELEASE_NOTES.md"
$notesText = "# 山海经原典地图研究台 v$Version`r`n`r`n$Notes`r`n"
[System.IO.File]::WriteAllText($notesFile, $notesText, $utf8)

Push-Location $appRoot
try {
  Invoke-Checked "安装前端依赖" $npmCmd @("ci", "--registry=https://registry.npmjs.org/")
  Invoke-Checked "项目校验" $npmCmd @("run", "verify")
  Invoke-Checked "前端构建" $npmCmd @("run", "build")
  Invoke-Checked "发布版本校验" $nodeExe @("scripts\verify-release-tag.mjs")
} finally {
  Pop-Location
}

Invoke-Checked "暂存文件" $gitExe @("add", "-A")
& $gitExe diff --cached --quiet
$hasStagedChanges = ($LASTEXITCODE -ne 0)
if ($hasStagedChanges) {
  Invoke-Checked "创建发布提交" $gitExe @("commit", "-m", "release: v$Version - $Notes")
} else {
  Write-Host "没有新的待提交文件，将直接为当前提交创建版本标签。" -ForegroundColor DarkYellow
}

Invoke-Checked "创建版本标签" $gitExe @("tag", "-a", $tag, "-m", $Notes)
Invoke-Checked "推送分支" $gitExe @("push", "origin", $branch)
Invoke-Checked "推送版本标签" $gitExe @("push", "origin", $tag)

Write-Host "`n已推送 $tag。GitHub Actions 将自动构建、签名并创建 Release。" -ForegroundColor Green
Write-Host "https://github.com/a58293/SHmap/actions"
try {
  Start-Process "https://github.com/a58293/SHmap/actions" | Out-Null
} catch {
  Write-Host "未能自动打开浏览器，请手动进入上方地址。" -ForegroundColor DarkYellow
}
Read-Host "按回车关闭"
