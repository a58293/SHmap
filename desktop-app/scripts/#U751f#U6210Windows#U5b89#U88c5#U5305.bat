@echo off
chcp 65001 >nul
cd /d "%~dp0.."
call npm install
call npm run verify
call npm run desktop:build
echo.
echo 安装包位于 src-tauri\target\release\bundle\nsis
pause
