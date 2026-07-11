# 地图数据目录

当前仓库首包采用本地 Demo 结构：

- `source-workbooks/` 保存研究母表；
- `app/data.js` 是由 v031 母表整理出的当前运行数据；
- 本目录的 `manifest.json` 记录数据版本和全局坐标规则。

当前数据版本：`v031-r0001`。

后续接入 GitHub 自动更新后，正式数据包建议通过 GitHub Releases 发布，不要让多人直接修改同一份二进制数据库文件。

## current.json

程序通过此文件检查 GitHub 上的当前应用版本和地图数据版本。以后发布新数据时，应同步更新 `data_version`、更新摘要和下载地址。
