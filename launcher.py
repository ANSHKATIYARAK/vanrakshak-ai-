import os
import sys
import time
import socket
import subprocess
import urllib.request
import json
import webbrowser
import platform

# ─── Platform detection ───────────────────────────────────────────────────────
IS_WINDOWS = platform.system() == "Windows"
IS_MAC     = platform.system() == "Darwin"
IS_LINUX   = platform.system() == "Linux"

# Baud rate configuration
BAUD_RATE = 115200

# Base directories
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR  = os.path.join(BASE_DIR, "backend")
DASHBOARD_DIR = os.path.join(BASE_DIR, "dashboard")

# Virtual environment python path — differs by OS
if IS_WINDOWS:
    PYTHON_EXE = os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
else:
    PYTHON_EXE = os.path.join(BACKEND_DIR, ".venv", "bin", "python3")

if not os.path.exists(PYTHON_EXE):
    # Fallback to the Python that is running this script
    PYTHON_EXE = sys.executable


# ─── Helpers ─────────────────────────────────────────────────────────────────

def check_port_open(ip, port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.5)
    try:
        s.connect((ip, port))
        s.close()
        return True
    except Exception:
        return False


def print_status(ok, text):
    symbol_ok   = "✅" if not IS_WINDOWS else "[OK]"
    symbol_fail = "❌" if not IS_WINDOWS else "[FAIL]"
    try:
        print(f"{'✅' if ok else '❌'} {text}")
    except UnicodeEncodeError:
        print(f"{'[OK]' if ok else '[FAIL]'} {text}")


# ─── ESP32 auto-detection ────────────────────────────────────────────────────

# macOS / Linux serial port prefixes for common USB-Serial adapters
MAC_SERIAL_PREFIXES = [
    "/dev/cu.usbserial",
    "/dev/cu.SLAB_USBtoUART",
    "/dev/cu.wchusbserial",
    "/dev/cu.usbmodem",
    "/dev/ttyUSB",       # Linux
    "/dev/ttyACM",       # Linux
]

def auto_detect_esp32_port():
    print("[*] Scanning serial ports for ESP32...")
    try:
        import serial
        import serial.tools.list_ports
    except ImportError:
        print("[!] PySerial not installed. Cannot perform auto-detection.")
        return None

    ports = list(serial.tools.list_ports.comports())

    # On macOS/Linux filter to likely USB-serial ports first
    if not IS_WINDOWS:
        priority = [p for p in ports if any(p.device.startswith(pfx) for pfx in MAC_SERIAL_PREFIXES)]
        rest     = [p for p in ports if p not in priority]
        ports    = priority + rest

    for port_info in ports:
        port = port_info.device
        print(f"[*] Probing port {port}...")
        try:
            ser = serial.Serial(port, BAUD_RATE, timeout=0.5)
            t0 = time.time()
            # Wait up to 6 s for the ESP32 to boot and emit a JSON telemetry packet
            while time.time() - t0 < 6.0:
                line = ser.readline().decode("utf-8", errors="ignore").strip()
                if "{" in line and "}" in line and '"id"' in line:
                    ser.close()
                    return port
            ser.close()
        except Exception:
            pass
    return None


# ─── Mosquitto MQTT broker ───────────────────────────────────────────────────

def start_mosquitto():
    if check_port_open("127.0.0.1", 1883):
        return True

    print("[*] Mosquitto MQTT Broker is not running. Attempting to start...")

    if IS_WINDOWS:
        # 1. Try Windows Service
        try:
            res = subprocess.run(["net", "start", "mosquitto"],
                                 capture_output=True, text=True)
            if res.returncode == 0:
                time.sleep(1.0)
                if check_port_open("127.0.0.1", 1883):
                    return True
        except Exception:
            pass

        # 2. Try direct executable
        for path in ["mosquitto",
                     r"C:\Program Files\mosquitto\mosquitto.exe",
                     r"C:\Program Files (x86)\mosquitto\mosquitto.exe"]:
            try:
                subprocess.Popen([path],
                                 stdout=subprocess.DEVNULL,
                                 stderr=subprocess.DEVNULL)
                time.sleep(1.5)
                if check_port_open("127.0.0.1", 1883):
                    return True
            except Exception:
                pass

    else:  # macOS / Linux
        # 1. Try Homebrew services (macOS)
        try:
            res = subprocess.run(["brew", "services", "start", "mosquitto"],
                                 capture_output=True, text=True)
            time.sleep(2.0)
            if check_port_open("127.0.0.1", 1883):
                return True
        except Exception:
            pass

        # 2. Try direct executable (in PATH or common Homebrew paths)
        brew_prefix = "/opt/homebrew" if os.path.isdir("/opt/homebrew") else "/usr/local"
        for path in ["mosquitto",
                     f"{brew_prefix}/sbin/mosquitto",
                     "/usr/sbin/mosquitto"]:
            try:
                subprocess.Popen([path],
                                 stdout=subprocess.DEVNULL,
                                 stderr=subprocess.DEVNULL)
                time.sleep(1.5)
                if check_port_open("127.0.0.1", 1883):
                    return True
            except Exception:
                pass

    return False


# ─── Process management ──────────────────────────────────────────────────────

def kill_proc(proc):
    if proc:
        try:
            proc.terminate()
            proc.wait(timeout=2.0)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass


# ─── Main ────────────────────────────────────────────────────────────────────

def main():
    print("==================================================")
    print("          VanRakshak-X AI System Launcher")
    print(f"          Platform: {platform.system()} {platform.machine()}")
    print("==================================================")

    # 1. Start Mosquitto MQTT
    mqtt_ok = start_mosquitto()

    # 2. Auto-detect ESP32 port
    esp32_port = auto_detect_esp32_port()
    demo_mode  = False

    if esp32_port:
        print(f"\nESP32 Detected on {esp32_port}")
    else:
        print("\nESP32 Not Found")
        choice = input("Run Demo Mode? [Y/n]: ").strip().lower()
        if choice in ("", "y", "yes"):
            demo_mode = True
            print("[*] Booting in SIMULATED DEMO MODE...")
        else:
            print("[*] Proceeding in normal mode without ESP32 Serial connection.")

    # 3. Start FastAPI backend
    print("[*] Starting FastAPI backend...")
    backend_proc = subprocess.Popen(
        [PYTHON_EXE, "-m", "uvicorn", "app.main:app",
         "--host", "127.0.0.1", "--port", "8000"],
        cwd=BACKEND_DIR
    )

    # 4. Start Serial Bridge
    bridge_proc    = None
    bridge_started = False

    def run_bridge():
        nonlocal bridge_proc, bridge_started
        bridge_script = os.path.join(BACKEND_DIR, "serial_bridge.py")
        cmd = [PYTHON_EXE, bridge_script]
        if demo_mode:
            cmd.append("--demo")
        elif esp32_port:
            cmd.extend(["--port", esp32_port])
        else:
            return  # No port and no demo; skip

        bridge_proc    = subprocess.Popen(cmd, cwd=BACKEND_DIR)
        bridge_started = True

    run_bridge()

    # 5. Start Next.js dashboard
    print("[*] Starting Next.js dashboard...")
    dashboard_proc = subprocess.Popen(
        "npm run dev",
        shell=True,
        cwd=DASHBOARD_DIR
    )

    # 6. Wait for services and print checklist
    print("\nInitializing and checking system integrity...")
    time.sleep(3.0)

    health_ok = False
    for _ in range(15):
        try:
            with urllib.request.urlopen("http://localhost:8000/health",
                                        timeout=1.0) as resp:
                if resp.status == 200:
                    health_ok = True
                    break
        except Exception:
            time.sleep(1.0)

    dashboard_ready = check_port_open("127.0.0.1", 3000)

    print("\n" + "=" * 50)
    print("             SYSTEM STARTUP CHECKLIST")
    print("=" * 50)

    if esp32_port:
        print_status(True,  f"ESP32 Connected (on {esp32_port})")
    elif demo_mode:
        print_status(True,  "ESP32 Connected (Simulated Demo Mode Active)")
    else:
        print_status(False, "ESP32 Disconnected (System running in degraded state)")

    print_status(mqtt_ok or check_port_open("127.0.0.1", 1883), "MQTT Running")

    db_connected = False
    if health_ok:
        try:
            with urllib.request.urlopen("http://localhost:8000/health",
                                        timeout=1.0) as resp:
                hdata = json.loads(resp.read().decode())
                db_connected = hdata.get("database", False)
        except Exception:
            pass

    print_status(db_connected, "Database Connected")
    print_status(health_ok,    "WebSocket Active")
    print_status(dashboard_ready or check_port_open("127.0.0.1", 3000),
                 "Dashboard Ready")
    print("=" * 50)

    # 7. Open browser
    print("\n[*] Launching dashboard in your default browser...")
    webbrowser.open("http://localhost:3000")
    print("\nSystem running. Press Ctrl+C in this window to stop all components.")

    # 8. Monitoring & Auto-Recovery Loop
    bridge_no_port_ticks = 0
    try:
        while True:
            time.sleep(2.0)

            # Backend watchdog
            if backend_proc.poll() is not None:
                print("[!] FastAPI Backend stopped! Restarting...")
                backend_proc = subprocess.Popen(
                    [PYTHON_EXE, "-m", "uvicorn", "app.main:app",
                     "--host", "127.0.0.1", "--port", "8000"],
                    cwd=BACKEND_DIR
                )

            # Dashboard watchdog
            if dashboard_proc.poll() is not None:
                print("[!] Next.js Dashboard stopped! Restarting...")
                dashboard_proc = subprocess.Popen(
                    "npm run dev", shell=True, cwd=DASHBOARD_DIR
                )

            # Serial Bridge watchdog (with backoff)
            if bridge_started and bridge_proc is not None:
                if bridge_proc.poll() is not None:
                    if bridge_no_port_ticks > 0:
                        bridge_no_port_ticks -= 1
                        continue

                    if not demo_mode:
                        print("[!] Serial Bridge stopped! Re-scanning serial ports...")
                        new_port = auto_detect_esp32_port()
                        if new_port:
                            esp32_port = new_port
                            bridge_no_port_ticks = 0
                            print(f"[+] ESP32 found on {esp32_port}. Reconnecting...")
                            run_bridge()
                        else:
                            print("[WARNING] ESP32 not detected. Will retry in 30 seconds...")
                            bridge_no_port_ticks = 15   # 15 × 2 s = 30 s
                    else:
                        print("[!] Serial Bridge (Demo) stopped! Restarting...")
                        run_bridge()

    except KeyboardInterrupt:
        print("\nShutting down VanRakshak-X system...")
    finally:
        print("Stopping Serial Bridge...")
        kill_proc(bridge_proc)
        print("Stopping FastAPI Backend...")
        kill_proc(backend_proc)
        print("Stopping Next.js Dashboard...")
        kill_proc(dashboard_proc)
        print("All components stopped successfully.")


if __name__ == "__main__":
    main()
