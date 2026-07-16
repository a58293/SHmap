# CHANGELOG

## Desktop v002

- 增加客户端“检查更新”入口与每天一次的自动检查。
- 支持显示版本说明、下载进度、签名校验、安装和重启。
- 安装更新前自动保存SQLite工作区并建立更新前备份。
- 增加GitHub Releases正式发布工作流与Tauri更新签名配置。
- 修复npm依赖锁文件中的构建地址，统一使用公开npm仓库。

## Desktop v001

- 建立 Tauri 2 Windows 桌面工程。
- 接入 SQLite 主存储、WAL、自动备份、手动备份和恢复。
- 内置 v075 的395个对象与2432条原文记录。
- 集成 v038 地图交互与性能修复。
- 添加 Windows NSIS 安装包自动构建。
