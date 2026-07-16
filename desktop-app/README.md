# 山海经原典地图研究台 · 桌面版 v003

桌面版 v003 在 v002 的签名更新系统基础上，重点修复地图拖动观感，并加入本地一键发布流程。

## 本版功能

- 地图拖动过程中实时跟随鼠标，不再等待松开鼠标后才更新画面。
- 拖动时统一平移地图画布、红色画笔轨迹和地块标签；松开后再执行最终重绘与保存。
- 鼠标右键作为“返回”：依次关闭当前原生弹窗、编辑弹窗、研究工作台、地块翻面或空间聚焦。
- 保留输入框中的系统右键菜单，便于复制、粘贴与文本编辑。
- 根目录新增 `发布新版本.cmd`：自动同步版本、校验、构建、提交、打标签并推送 GitHub。
- `desktop-v*` 标签推送后，GitHub Actions 自动签名并创建正式 Release、安装程序、`.sig` 与 `latest.json`。
- 内置 v075 母表：395 个对象、2432 条原文记录。

## 一键发布

在从 GitHub 克隆的仓库根目录双击：

```text
发布新版本.cmd
```

按提示输入语义化版本号，例如 `0.3.0`，再填写一行更新说明并输入 `RELEASE` 确认。脚本会自动执行：

```text
同步版本号
→ npm ci
→ 项目校验
→ 前端构建
→ Git 提交
→ 创建 desktop-v0.3.0 标签
→ 推送分支与标签
→ GitHub 自动发布
```

本地无需保存 GitHub Token 或更新签名私钥。Git 推送使用电脑已有的 Git/GitHub Desktop 登录凭据；更新私钥继续只保存在 GitHub Actions Secrets 中。

## GitHub 工作流

- `Build Windows Desktop`：`main` 分支代码变化后自动执行普通测试构建。
- `Publish Windows Desktop Update`：收到 `desktop-v*` 标签后自动执行正式签名发布，也保留手动运行入口。

正式发布需要在 GitHub Actions Secrets 中配置：

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

所有后续版本必须继续使用与 v002 相同的签名私钥，否则已安装的旧客户端无法验证更新。

## 本地构建

```powershell
npm ci --registry=https://registry.npmjs.org/
npm run verify
npm run build
npm run desktop:build
```

普通本地构建不会创建正式更新签名文件。正式更新由 GitHub 发布工作流生成。
