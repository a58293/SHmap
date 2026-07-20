# 山海经原典地图研究台 · 桌面版 v0.6.0

本版本在v0.5.2世界／区域／地点层级与v125线型水系基础上，修复区域概览、区域边界、跨区水系范围和线对象方向表达。

## 开发运行

```powershell
npm run verify
npm run desktop:dev
```

## 构建

```powershell
npm run build
npm run desktop:build
```

## 更新母表

```powershell
npm run import:master -- "新版母表.xlsx"
```

导入完成后会自动执行v0.5.3区域与水系方向归一化。

正式发布标签：`desktop-v0.6.0`。
