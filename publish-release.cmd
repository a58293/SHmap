@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
set "SCRIPT=%ROOT%desktop-app\scripts\release.ps1"

if not exist "%SCRIPT%" (
  echo ERROR: release.ps1 was not found.
  echo Expected path: %SCRIPT%
  echo Put this CMD file in the SHmap repository root.
  echo.
  pause
  exit /b 1
)

"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
  echo Release failed. Exit code: %EXIT_CODE%
) else (
  echo Release script finished.
)
echo.
pause
exit /b %EXIT_CODE%
