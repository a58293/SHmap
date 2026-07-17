山海经原典地图研究台 v004 更新说明

覆盖位置：
F:\SHmap\SHmap

操作：
1. 关闭正在运行的测试程序。
2. 解压本压缩包。
3. 将压缩包内全部内容复制到 F:\SHmap\SHmap。
4. 选择“替换目标中的文件”。
5. 在 PowerShell 中运行：

   cd F:\SHmap\SHmap\desktop-app
   npm run verify
   npm run desktop:dev

本轮重点测试：
- 地块博物志“简述”不再显示自动摘要。
- 只显示有对象的分类。
- 每个对象都显示独立图片区；无图时显示“待补图”。
- “完整”模式保持原有结构。
- 导入 Markdown 可选择单个或批量文件。
- 批量结果能显示来源文件、警告与错误。

当前图片边界：
本版完成图片区、占位状态与可选图片字段。尚未包含本地图片文件复制、自动重命名和批量匹配工具；正式图片准备好后再单独增加图片素材导入器。

发布建议：
使用 GitHub Desktop 提交并 Push origin，等待 Build Windows Desktop 通过，再在 GitHub Actions 手动运行 Publish Windows Desktop Update。
