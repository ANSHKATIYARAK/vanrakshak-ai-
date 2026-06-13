# VanRakshak-X — Quick Start Guide

> Deploy your forest sentinel network in under 60 seconds on **macOS** or **Windows**.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [macOS — Install & Launch](#macos--install--launch)
- [Windows — Install & Launch](#windows--install--launch)
- [Demo Mode (No Hardware)](#demo-mode-no-hardware)
- [Startup Checklist Explained](#startup-checklist-explained)
- [Health API](#health-api)
- [Stopping the System](#stopping-the-system)
- [Troubleshooting](#troubleshooting)
- [System Architecture](#system-architecture)

---

## Prerequisites

Install these once, before running the installer:

| Software | macOS | Windows |
|----------|-------|---------|
| **Python 3.8+** | `brew install python` or [python.org](https://www.python.org/downloads/) | [python.org](https://www.python.org/downloads/) — check **Add Python to PATH** |
| **Node.js v18+** | `brew install node` or [nodejs.org](https://nodejs.org/) | [nodejs.org](https://nodejs.org/) |
| **Mosquitto MQTT** | `brew install mosquitto` | [mosquitto.org/download](https://mosquitto.org/download/) — install as Windows Service |

---

## macOS — Install & Launch

### Step 1 — Install dependencies (one-time only)

Open **Terminal** and run:

```bash
bash install.sh
```

The script will:
- Verify Python 3.8+ and Node.js are installed
- Create a Python virtual environment in `backend/.venv`
- Install all Python packages
- Install all npm packages
- Check for Mosquitto
- Generate `backend/.env`
- Mark `start_vanrakshak.sh` as executable

### Step 2 — Plug in your ESP32

Connect the ESP32 board via USB. macOS will assign it a port such as:
- `/dev/cu.usbserial-XXXX`
- `/dev/cu.SLAB_USBtoUART`
- `/dev/cu.wchusbserial-XXXX`

The launcher detects it automatically — no configuration needed.

### Step 3 — Launch the system

```bash
bash start_vanrakshak.sh
```

Or double-click `start_vanrakshak.sh` in Finder (requires Terminal to be set as the default app for `.sh` files).

The dashboard opens automatically at **http://localhost:3000**.

---

## Windows — Install & Launch

### Step 1 — Install dependencies (one-time only)

Double-click **`install.bat`**.

The script will:
- Verify Python 3.8+ is installed and in PATH
- Create a Python virtual environment in `backend\.venv`
- Install all Python packages
- Install all npm packages
- Check for Mosquitto
- Generate `backend\.env`

### Step 2 — Plug in your ESP32

Connect the ESP32 board via USB. Windows will assign it a COM port such as `COM3`, `COM5`, etc.
The launcher detects it automatically.

### Step 3 — Launch the system

Double-click **`start_vanrakshak.bat`**.

The dashboard opens automatically at **http://localhost:3000**.

---

## Demo Mode (No Hardware)

If no ESP32 is connected, the launcher asks:

```
ESP32 Not Found
Run Demo Mode? [Y/n]:
```

Press **Enter** (or type `Y`) to start in simulated Demo Mode.
The dashboard will show realistic simulated telemetry — all charts and panels fully functional.

---

## Startup Checklist Explained

After services spin up, the launcher prints:

```
==================================================
             SYSTEM STARTUP CHECKLIST
==================================================
✅ ESP32 Connected (on /dev/cu.usbserial-0001)   ← or [OK] on Windows CMD
✅ MQTT Running
✅ Database Connected
✅ WebSocket Active
✅ Dashboard Ready
==================================================
```

| Item | ONLINE means… |
|------|--------------|
| **ESP32 Connected** | A valid JSON telemetry packet received from the node within 6 s of probing |
| **MQTT Running** | Mosquitto broker is listening on port 1883 |
| **Database Connected** | SQLite database is readable and writable |
| **WebSocket Active** | FastAPI `/ws` endpoint responded to the health check |
| **Dashboard Ready** | Next.js dev server is listening on port 3000 |

---

## Health API

Query the system health at any time:

```
GET http://localhost:8000/health
```

```json
{
  "esp32": true,
  "mqtt": true,
  "database": true,
  "websocket": false,
  "dashboard": true
}
```

> `websocket` is `true` only when a browser tab has the dashboard open.

---

## Stopping the System

Press **Ctrl+C** in the launcher terminal window.

The launcher gracefully stops all components:
1. Serial Bridge
2. FastAPI Backend
3. Next.js Dashboard

---

## Troubleshooting

### macOS

| Problem | Solution |
|---------|----------|
| `ESP32 Not Found` | Run `ls /dev/cu.*` — if the port is present but not detected, ensure the CP2102/CH340 USB driver is installed |
| `MQTT Offline` | Run `brew services start mosquitto` manually, then retry |
| `Permission denied` on `/dev/cu.*` | Run `sudo chmod 666 /dev/cu.usbserial-XXXX` |
| `bash: start_vanrakshak.sh: Permission denied` | Run `chmod +x start_vanrakshak.sh` |
| Dashboard shows "Establishing Hardware Neural Link..." forever | Backend is not running — check the terminal for errors |
| `command not found: brew` | Install Homebrew from [brew.sh](https://brew.sh) |

### Windows

| Problem | Solution |
|---------|----------|
| `ESP32 Not Found` | Check Device Manager → Ports (COM & LPT) for the COM port number |
| `MQTT Offline` | Run `net start mosquitto` in an Administrator terminal |
| `[ERROR] Python not found` | Reinstall Python and check **Add Python to PATH** |
| `Dashboard Offline` | Wait 20 s for Next.js to compile, then refresh the browser |
| `Database Offline` | Delete `backend\vanrakshak.db` and restart — it will be recreated |
| `Access is denied` on COM port | Another application (e.g. Arduino IDE) is using the port — close it first |

---

## System Architecture

```
ESP32 Sensor Node
    │  USB Serial (115200 baud)
    │  macOS: /dev/cu.usbserial-*
    │  Windows: COM3, COM5, …
    ▼
serial_bridge.py  ──▶  Mosquitto MQTT Broker (:1883)
                                │
                                ▼
                    FastAPI Backend (:8000)
                    ├── GET  /health
                    ├── GET  /nodes
                    ├── GET  /alerts
                    └── WS   /ws
                                │
                                ▼
                    Next.js Dashboard (:3000)
```

### One-click entry points

| OS | Installer | Launcher |
|----|-----------|----------|
| macOS | `bash install.sh` | `bash start_vanrakshak.sh` |
| Windows | `install.bat` (double-click) | `start_vanrakshak.bat` (double-click) |

Both call the same `launcher.py` which auto-detects the platform at runtime.

---

*VanRakshak-X v2 — Forest Defense Infrastructure*
