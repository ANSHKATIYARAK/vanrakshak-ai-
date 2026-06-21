@echo off
title VanRakshak-X Launcher
echo ==================================================
echo          VanRakshak-X Startup Initiated
echo ==================================================
echo.

:: Add local Winget Node.js to PATH
set "WINGET_NODE_DIR=%USERPROFILE%\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.17.0-win-x64"
if exist "%WINGET_NODE_DIR%" (
    set "PATH=%WINGET_NODE_DIR%;%PATH%"
)

:: Check if the virtual environment exists
if not exist "%~dp0backend\.venv\Scripts\python.exe" (
    echo [ERROR] Python virtual environment was not found.
    echo Please run install.bat first to install all dependencies.
    echo.
    pause
    exit /b 1
)

:: Run the launcher python script
"%~dp0backend\.venv\Scripts\python.exe" -u "%~dp0launcher.py"

pause
