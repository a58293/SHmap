山海经原典地图研究台 Demo v017 · GitHub待处理包下载与应用

【打开方式】
1. 双击“启动山海经地图Demo.bat”。
2. 或直接打开“index.html”。
3. 也可以打开“山海经原典地图研究台_Demo_v017_GitHub待处理包下载与应用_单文件版.html”。

【GitHub pending 使用】
1. 把程序导出的 .shjpatch 放到仓库 submissions/pending。
2. 用 GitHub Desktop Commit 并 Push。
3. 在地图中点击“检查数据更新”。
4. 点击待处理包的“查看并应用”。
5. 确认无冲突后，点击“下载并应用到本地地图”。

应用前程序会检查：
- 文件是否为有效 shjpatch；
- 基础数据版本；
- 对象ID是否冲突；
- 修改字段是否已被本地改动；
- 删除对象是否仍与更改包中的旧内容一致。

有冲突时不会写入任何内容。GitHub应用记录保存在浏览器本地存储中。

【仍需注意】
程序只负责从公开仓库读取和应用；上传仍由 GitHub Desktop 完成。
