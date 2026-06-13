@echo off
title VanRakshak-X Installer
echo ==================================================
echo          VanRakshak-X Installation Script
echo ==================================================
echo.

:: 1. Verify Python & Create Virtual Environment
echo [1/6] Verifying Python installation...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Global python command was not found in PATH.
    echo Checking for existing virtual environment...
    if not exist "%~dp0backend\.venv\Scripts\python.exe" (
        echo [ERROR] Python is not installed or not in your system PATH.
        echo Please download and install Python 3.8+ and check Add Python to PATH.
        echo.
        pause
        exit /b 1
    ) else (
        echo Found pre-existing virtual environment python.
    )
) else (
    if not exist "%~dp0backend\.venv\Scripts\python.exe" (
        echo Creating Python virtual environment in backend\.venv...
        python -m venv "%~dp0backend\.venv"
    ) else (
        echo Python virtual environment already exists.
    )
)
echo.

:: 2. Install Python requirements
echo [2/6] Installing backend Python packages...
"%~dp0backend\.venv\Scripts\python.exe" -m pip install --upgrade pip
"%~dp0backend\.venv\Scripts\python.exe" -m pip install -r "%~dp0backend\requirements.txt"
echo.

:: 3. Verify Node & Install Dashboard dependencies
echo [3/6] Verifying Node.js and installing dashboard dependencies...
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm was not found in your system PATH.
    echo Please install Node.js v18+ from https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo Installing Next.js dashboard npm dependencies (this may take a minute)...
cd /d "%~dp0dashboard"
call npm install
cd /d "%~dp0"
echo.

:: 4. Verify Mosquitto exists
echo [4/6] Verifying Mosquitto MQTT Broker...
sc query mosquitto >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ Mosquitto is installed and registered as a Windows Service.
    goto mosquitto_done
)
if exist "C:\Program Files\mosquitto\mosquitto.exe" (
    echo ✅ Mosquitto found at C:\Program Files\mosquitto\mosquitto.exe
    goto mosquitto_done
)
if exist "C:\Program Files (x86)\mosquitto\mosquitto.exe" (
    echo ✅ Mosquitto found at C:\Program Files (x86)\mosquitto\mosquitto.exe
    goto mosquitto_done
)
echo [WARNING] Mosquitto MQTT Broker was not found on this system.
echo The launcher will try to start it, but you should install it if MQTT fails to connect.
echo Download: https://mosquitto.org/download/

:mosquitto_done
echo.

:: 5. Verify PlatformIO exists
echo [5/6] Verifying PlatformIO...
where pio >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ PlatformIO CLI is available in PATH.
    goto pio_done
)
if exist "C:\Users\%USERNAME%\.platformio\penv\Scripts\pio.exe" (
    echo ✅ PlatformIO found in C:\Users\%USERNAME%\.platformio\penv\Scripts\pio.exe
    goto pio_done
)
if exist "%~dp0.platformio" (
    echo ✅ Local PlatformIO configuration directory found in workspace.
    goto pio_done
)
echo [WARNING] PlatformIO Core was not found on this machine.
echo This is only required if you want to compile and flash firmware.

:pio_done
echo.

:: 6. Generate backend config files
echo [6/6] Generating default configuration files...
if not exist "%~dp0backend\.env" (
    (
        echo DATABASE_URL=sqlite:///./vanrakshak.db
        echo MQTT_BROKER=localhost
        echo MQTT_PORT=1883
        echo SECRET_KEY=vanrakshak_secret_key_change_me
    ) > "%~dp0backend\.env"
    echo ✅ Generated backend\.env config file.
) else (
    echo ✅ backend\.env already exists.
)
echo.

echo ==================================================
echo   VanRakshak-X Installation Completed Successfully!
echo ==================================================
echo.
echo Instructions:
echo 1. Plug in your ESP32 device via USB.
echo 2. Double-click start_vanrakshak.bat to run the system.
echo.
pause
