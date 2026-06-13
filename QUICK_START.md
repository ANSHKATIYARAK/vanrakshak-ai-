# VanRakshak-X — Quick Start Guide

> Deploy your forest sentinel network in under 60 seconds.

---

## Prerequisites (One-Time Setup)

Before your first launch, run the installer **once**:

```
Double-click  install.bat
```

The installer will:
- Create the Python virtual environment in `backend/.venv`
- Install all Python packages (`fastapi`, `pyserial`, `paho-mqtt`, etc.)
- Install all Next.js dashboard packages
- Check that Mosquitto MQTT and Node.js are present
- Generate the `backend/.env` configuration file

> **Required software** (install if not present):
> - [Python 3.8+](https://www.python.org/downloads/) — check **Add Python to PATH** during install
> - [Node.js v18+](https://nodejs.org/)
> - [Mosquitto MQTT](https://mosquitto.org/download/) — install as a Windows Service

---

## One-Click Launch

**Step 1** — Plug your ESP32 into USB.

**Step 2** — Double-click:
```
start_vanrakshak.bat
```

**Step 3** — The dashboard opens automatically at:
```
http://localhost:3000
```

That's it. No terminal commands needed.

---

## What the Startup Checklist Means

When the launcher runs, it prints a checklist like this:

```
==================================================
             SYSTEM STARTUP CHECKLIST
==================================================
[OK] ESP32 Connected (on COM5)
[OK] MQTT Running
[OK] Database Connected
[OK] WebSocket Active
[OK] Dashboard Ready
==================================================
```

| Item             | ONLINE means…                                      |
|------------------|----------------------------------------------------|
| ESP32 Connected  | A valid telemetry packet was received from the node |
| MQTT Running     | Mosquitto broker is listening on port 1883          |
| Database Connected | SQLite database is readable and writable           |
| WebSocket Active | FastAPI WebSocket `/ws` endpoint is ready           |
| Dashboard Ready  | Next.js dev server is listening on port 3000        |

---

## Demo Mode (No Hardware)

If no ESP32 is connected, the launcher will ask:

```
ESP32 Not Found
Run Demo Mode? [Y/n]:
```

Press **Enter** (or type `Y`) to run in simulated Demo Mode.  
The dashboard will show realistic simulated telemetry data.

---

## Health API

The backend exposes a health check endpoint you can call at any time:

```
GET http://localhost:8000/health
```

Example response:
```json
{
  "esp32": true,
  "mqtt": true,
  "database": true,
  "websocket": false,
  "dashboard": true
}
```

`websocket` is `true` only when a browser tab has the dashboard open.

---

## Stopping the System

Press **Ctrl+C** in the launcher window.

The launcher will gracefully stop:
1. Serial Bridge
2. FastAPI Backend
3. Next.js Dashboard

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ESP32 Not Found` | Check USB cable and COM port assignment in Device Manager |
| `MQTT Offline` | Start Mosquitto: `net start mosquitto` or install from mosquitto.org |
| `Dashboard Offline` | Wait 15–20 seconds for Next.js to compile, then refresh the browser |
| `Database Offline` | Delete `backend/vanrakshak.db` and restart — it will be recreated |
| `[ERROR] Python not found` | Re-run `install.bat` after installing Python 3.8+ with PATH enabled |
| Dashboard shows "Establishing Hardware Neural Link..." forever | Backend is not running — check the launcher window for errors |

---

## System Architecture

```
ESP32 Sensor Node
    │ USB Serial (115200 baud)
    ▼
serial_bridge.py  ──▶  MQTT Broker (Mosquitto :1883)
                              │
                              ▼
                    FastAPI Backend (:8000)
                    ├── /health  (REST)
                    ├── /nodes   (REST)
                    ├── /alerts  (REST)
                    └── /ws      (WebSocket)
                              │
                              ▼
                    Next.js Dashboard (:3000)
```

---

*VanRakshak-X v1.0 MVP — Forest Defense Infrastructure*
