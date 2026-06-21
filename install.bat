@echo off
setlocal enabledelayedexpansion
title VanRakshak-X Installer (Windows)

echo.
echo ==================================================
echo         VanRakshak-X Installation  (Windows)
echo ==================================================
echo.

:: ── Step 1: Python ────────────────────────────────────────────────────────
echo [1/6] Verifying Python installation...

where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] "python" not found in PATH.
    where python3 >nul 2>&1
    if %errorlevel% neq 0 (
        echo [FAIL] Python 3.8+ is not installed or not in your PATH.
        echo        Download from https://www.python.org/downloads/
        echo        Make sure to check "Add Python to PATH" during install.
        echo.
        pause
        exit /b 1
    ) else (
        set PYTHON_CMD=python3
    )
) else (
    set PYTHON_CMD=python
)

%PYTHON_CMD% --version
echo.

:: ── Step 2: Create virtual environment ────────────────────────────────────
echo [2/6] Setting up Python virtual environment...

if not exist "%~dp0backend\.venv\Scripts\python.exe" (
    echo        Creating virtual environment in backend\.venv ...
    %PYTHON_CMD% -m venv "%~dp0backend\.venv"
    echo [OK]   Virtual environment created.
) else (
    echo [OK]   Virtual environment already exists.
)

set VENV_PYTHON=%~dp0backend\.venv\Scripts\python.exe
echo.

:: ── Step 3: Python packages ───────────────────────────────────────────────
echo [3/6] Installing backend Python packages...
"%VENV_PYTHON%" -m pip install --upgrade pip
"%VENV_PYTHON%" -m pip install -r "%~dp0backend\requirements.txt"
echo [OK]   Python packages installed.
echo.

:: ── Step 4: Node.js / npm ─────────────────────────────────────────────────
echo [4/6] Verifying Node.js and installing dashboard dependencies...

set "WINGET_NODE_DIR=%USERPROFILE%\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.17.0-win-x64"
if exist "%WINGET_NODE_DIR%" (
    set "PATH=%WINGET_NODE_DIR%;%PATH%"
)

where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [FAIL] npm not found. Please install Node.js v18+ from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo        Running npm install in dashboard\ ...
cd /d "%~dp0dashboard"
call npm install
cd /d "%~dp0"
echo [OK]   npm packages installed.
echo.

:: ── Step 5: Mosquitto ─────────────────────────────────────────────────────
echo [5/6] Verifying Mosquitto MQTT broker...

sc query mosquitto >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK]   Mosquitto is installed as a Windows Service.
    goto mosquitto_done
)
if exist "C:\Program Files\mosquitto\mosquitto.exe" (
    echo [OK]   Mosquitto found at C:\Program Files\mosquitto\mosquitto.exe
    goto mosquitto_done
)
if exist "C:\Program Files (x86)\mosquitto\mosquitto.exe" (
    echo [OK]   Mosquitto found at C:\Program Files (x86)\mosquitto\mosquitto.exe
    goto mosquitto_done
)

echo [WARN] Mosquitto MQTT broker was not found.
echo        Download it from https://mosquitto.org/download/
echo        Install as a Windows Service for best results.

:mosquitto_done
echo.

:: ── Step 6: Configuration files ───────────────────────────────────────────
echo [6/6] Generating default configuration files...

if not exist "%~dp0backend\.env" (
    (
        echo DATABASE_URL=sqlite:///./vanrakshak.db
        echo MQTT_BROKER=localhost
        echo MQTT_PORT=1883
        echo SECRET_KEY=vanrakshak_secret_key_change_me
    ) > "%~dp0backend\.env"
    echo [OK]   Generated backend\.env
) else (
    echo [OK]   backend\.env already exists.
)
echo.

:: ── Done ──────────────────────────────────────────────────────────────────
echo ==================================================
echo   VanRakshak-X Installation Completed Successfully
echo ==================================================
echo.
echo Next steps:
echo   1. Plug in your ESP32 device via USB.
echo   2. Double-click start_vanrakshak.bat to run the system.
echo.
pause
