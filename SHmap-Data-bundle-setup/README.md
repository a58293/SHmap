# SHmap-Data 合并更改包设置

把本目录中的 `tools`、`.github` 复制到私有 `SHmap-Data` 仓库根目录并提交。

之后每次 `submissions/pending/*.shjpatch` 更新，GitHub Actions 会生成：

`submissions/bundles/latest.shjbundle`

SHmap v1.3.0 会优先一次读取这个文件，内部仍逐份按时间模拟、去重和处理冲突；文件缺失或未覆盖最新包时自动退回逐包读取。