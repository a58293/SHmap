# 山海经原典地图研究台 · 桌面版 v002

桌面版v002在v001的SQLite本地存储基础上，增加了经过签名验证的客户端更新系统。

## 本版功能

- 右上角“检查更新”：读取GitHub正式发布页中的最新稳定版本。
- 可查看当前版本、最新版本、版本说明与实时下载进度。
- 安装前自动保存SQLite工作区并创建“更新前备份”。
- 每24小时自动检查一次；可在更新窗口关闭自动检查。
- 更新包必须通过Tauri公钥签名验证，验证失败不会安装。
- 内置v075母表：395个对象、2432条原文记录。

## 首次安装说明

v001本身没有更新器，因此v002仍需手动安装一次。从v002开始，后续v003及更高版本可以直接在客户端内完成更新。

## 两个GitHub工作流

- `Build Windows Desktop`：普通测试构建，不创建正式更新发布。
- `Publish Windows Desktop Update`：手动运行，签名并发布正式版本，同时生成客户端读取的`latest.json`。

正式发布前必须在GitHub仓库的Actions Secrets中配置：

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

私钥不可提交到仓库，也不能丢失；所有后续版本必须继续使用同一把私钥。

## 本地构建

```powershell
npm ci
npm run verify
npm run desktop:build
```

普通本地构建不会创建更新签名文件。正式更新发布统一交由GitHub的发布工作流完成。
