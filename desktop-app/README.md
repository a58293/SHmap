# 山海经原典地图研究台 · 桌面版 v001

这是一个真实的 Tauri 2 桌面程序工程，不是把 HTML 改后缀。第一版以现有 v038 地图界面为基础，接入 Rust 本地后端、SQLite 主存储、自动备份和 Windows 构建流程。

## 本版已完成

- 内置 v075 母表：395个地图对象、2432条原文总库记录。
- SQLite 主工作区：`shmap.db`。
- 60分钟差异自动备份；支持手动备份、恢复前备份、数据库完整性检查。
- JSON 镜像备份保存在应用数据目录的 `backups` 文件夹。
- 保留地图、检索、Markdown导入、博物志、画笔、小地图、关系与测量等现有功能。
- 窗口位置与大小自动记忆。
- GitHub Actions 自动生成 Windows NSIS 安装包和便携 EXE。

## 最省事的生成安装包方式

1. 把本工程放到 GitHub 仓库的 `desktop-app` 文件夹。
2. 把 `build-desktop-windows.yml` 放到仓库 `.github/workflows/`，命名为 `build-desktop-windows.yml`。
3. 推送后进入 GitHub 的 **Actions**。
4. 运行 **Build Windows Desktop**。
5. 完成后下载 Artifacts 中的 Windows 文件。

## 在 Windows 本地构建

需要 Node.js 22、Rust stable、Microsoft C++ Build Tools 和 WebView2。安装依赖后运行：

```powershell
npm install
npm run desktop:build
```

或双击 `scripts/生成Windows安装包.bat`。安装包输出到：

```text
src-tauri/target/release/bundle/nsis/
```

## 数据位置

程序内点击右上角“桌面备份”可以直接打开数据目录。SQLite 是主存储；localStorage 只保留兼容缓存，不能替代数据库。

## 当前边界

v001 的地图渲染内核仍沿用 v038 的 Canvas＋DOM 混合实现。桌面化与数据安全已经完成，下一阶段再逐步把主地图完全迁移到 Canvas/WebGL 分层渲染。
