# GitHub生成Windows安装包

本方法不需要在电脑里输入编译命令。

1. 新建一个GitHub仓库，或把源码上传到现有仓库。
2. 确认仓库中能看到 `.github/workflows/build-windows.yml`。
3. 打开仓库上方的 **Actions**。
4. 左侧选择 **Build Windows Desktop**。
5. 点击右侧 **Run workflow**。
6. 等待任务显示绿色对勾。
7. 打开该次任务，在页面底部 **Artifacts** 下载：

   `山海经原典地图研究台-Windows-v001`

压缩包内包含安装程序和便携EXE。Windows第一次运行未签名程序时可能显示安全提示，这是因为v001没有配置商业代码签名证书，并不代表数据文件异常。
