山海经原典地图研究台 桌面版 v001 GitHub构建修复包

问题原因：
原 package-lock.json 由受限构建环境生成，依赖下载地址误写为内部 npm 镜像。
GitHub Actions 无法访问该内部地址，因此在 Run npm ci 步骤失败。

修复内容：
1. package-lock.json 的59个依赖地址改为 https://registry.npmjs.org/
2. 新增 desktop-app/.npmrc，固定使用公开 npm 官方仓库
3. GitHub workflow 的 npm ci 显式指定公开仓库

使用方法：
1. 解压本修复包。
2. 将其中内容覆盖到本地 SHmap 仓库根目录。
3. GitHub Desktop 提交并 Push origin。
4. GitHub Actions 会自动重新运行；也可手动运行 Build Windows Desktop。

建议提交名：
修复桌面版 npm 依赖构建地址
