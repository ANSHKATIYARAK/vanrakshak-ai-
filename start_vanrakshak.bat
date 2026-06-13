@echo off
title VanRakshak-X Launcher
echo ==================================================
echo          VanRakshak-X Startup Initiated
echo ==================================================
echo.

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
