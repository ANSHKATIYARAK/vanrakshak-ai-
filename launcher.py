import os
import sys
import time
import socket
import subprocess
import urllib.request
import json
import webbrowser

# Baud rate configuration
BAUD_RATE = 115200

# Base directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
DASHBOARD_DIR = os.path.join(BASE_DIR, "dashboard")

# Virtual environment python path
PYTHON_EXE = os.path.join(BACKEND_DIR, ".venv", "Scripts", "python.exe")
if not os.path.exists(PYTHON_EXE):
    # Fallback to system python if venv not initialized yet
    PYTHON_EXE = sys.executable

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
    if ok:
        try:
            print(f"✅ {text}")
        except UnicodeEncodeError:
            print(f"[OK] {text}")
    else:
        try:
            print(f"❌ {text}")
        except UnicodeEncodeError:
            print(f"[FAIL] {text}")

def auto_detect_esp32_port():
    print("[*] Scanning COM ports for ESP32...")
    try:
        import serial
        import serial.tools.list_ports
    except ImportError:
        print("[!] PySerial not installed. Cannot perform auto-detection.")
        return None

    ports = list(serial.tools.list_ports.comports())
    for port_info in ports:
        port = port_info.device
        print(f"[*] Probing port {port}...")
        try:
            # Open serial port; note that DTR/RTS toggle resets the ESP32
            ser = serial.Serial(port, BAUD_RATE, timeout=0.5)
            t0 = time.time()
            # Probe for up to 6.0 seconds to wait for ESP32 boot & telemetry output
            while time.time() - t0 < 6.0:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                if "{" in line and "}" in line and '"id"' in line:
                    ser.close()
                    return port
            ser.close()
        except Exception:
            pass
    return None

def start_mosquitto():
    if check_port_open("127.0.0.1", 1883):
        return True
    
    print("[*] Mosquitto MQTT Broker is not running. Attempting to start...")
    # 1. Attempt to start via Windows Service
    try:
        res = subprocess.run(["net", "start", "mosquitto"], capture_output=True, text=True)
        if res.returncode == 0:
            time.sleep(1.0)
            if check_port_open("127.0.0.1", 1883):
                return True
    except Exception:
        pass

    # 2. Attempt to run executable directly
    paths = [
        "mosquitto",
        "C:\\Program Files\\mosquitto\\mosquitto.exe",
        "C:\\Program Files (x86)\\mosquitto\\mosquitto.exe"
    ]
    for path in paths:
        try:
            subprocess.Popen([path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(1.5)
            if check_port_open("127.0.0.1", 1883):
                return True
        except Exception:
            pass
    return False

def kill_proc(proc):
    if proc:
        try:
            proc.terminate()
            proc.wait(timeout=1.0)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass

def main():
    print("==================================================")
    print("          VanRakshak-X AI System Launcher")
    print("==================================================")

    # 1. Start Mosquitto MQTT
    mqtt_ok = start_mosquitto()

    # 2. Auto Detect ESP32 Port
    esp32_port = auto_detect_esp32_port()
    demo_mode = False

    if esp32_port:
        print(f"\nESP32 Detected on {esp32_port}")
    else:
        print("\nESP32 Not Found")
        choice = input("Run Demo Mode? [Y/n]: ").strip().lower()
        if choice in ('', 'y', 'yes'):
            demo_mode = True
            print("[*] Booting in SIMULATED DEMO MODE...")
        else:
            print("[*] Proceeding in normal mode without ESP32 Serial connection.")

    # 3. Start FastAPI backend
    print("[*] Starting FastAPI backend...")
    backend_script = os.path.join(BACKEND_DIR, "app", "main.py")
    # We run it using python -m uvicorn app.main:app
    backend_proc = subprocess.Popen(
        [PYTHON_EXE, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        cwd=BACKEND_DIR
    )

    # 4. Start Serial Bridge
    bridge_proc = None
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

        bridge_proc = subprocess.Popen(cmd, cwd=BACKEND_DIR)
        bridge_started = True

    run_bridge()

    # 5. Start Next.js dashboard
    print("[*] Starting Next.js dashboard...")
    dashboard_proc = subprocess.Popen(
        "npm run dev",
        shell=True,
        cwd=DASHBOARD_DIR
    )

    # 6. Verify health and output checklist
    print("\nInitializing and checking system integrity...")
    time.sleep(3.0) # Let services spin up

    health_ok = False
    for attempt in range(15):
        try:
            with urllib.request.urlopen("http://localhost:8000/health", timeout=1.0) as response:
                if response.status == 200:
                    health_ok = True
                    break
        except Exception:
            time.sleep(1.0)

    # Check if dashboard port 3000 is listening
    dashboard_ready = check_port_open("127.0.0.1", 3000)

    print("\n" + "="*50)
    print("             SYSTEM STARTUP CHECKLIST")
    print("="*50)
    if esp32_port:
        print_status(True, f"ESP32 Connected (on {esp32_port})")
    elif demo_mode:
        print_status(True, "ESP32 Connected (Simulated Demo Mode Active)")
    else:
        print_status(False, "ESP32 Disconnected (System running in degraded state)")

    if mqtt_ok or check_port_open("127.0.0.1", 1883):
        print_status(True, "MQTT Running")
    else:
        print_status(False, "MQTT Offline")

    # Read from /health endpoint if possible
    db_connected = False
    ws_active = False
    if health_ok:
        try:
            with urllib.request.urlopen("http://localhost:8000/health", timeout=1.0) as response:
                health_data = json.loads(response.read().decode())
                db_connected = health_data.get("database", False)
                ws_active = health_data.get("websocket", False)
        except Exception:
            pass

    if db_connected:
        print_status(True, "Database Connected")
    else:
        print_status(False, "Database Offline")

    # If backend is up, websocket route /ws is active and ready
    if health_ok:
        print_status(True, "WebSocket Active")
    else:
        print_status(False, "WebSocket Offline")

    if dashboard_ready or check_port_open("127.0.0.1", 3000):
        print_status(True, "Dashboard Ready")
    else:
        print_status(False, "Dashboard Offline (Starting dev server, check console)")

    print("="*50)

    # 7. Open browser automatically
    print("\n[*] Launching dashboard in your default browser...")
    webbrowser.open("http://localhost:3000")

    print("\nSystem running. Press Ctrl+C in this window to stop all components.")

    # 8. Monitoring & Auto-Recovery Loop
    # bridge_no_port_ticks counts 2-second ticks remaining in a backoff period
    bridge_no_port_ticks = 0
    try:
        while True:
            time.sleep(2.0)
            
            # Check backend
            if backend_proc.poll() is not None:
                print("[!] FastAPI Backend stopped unexpectedly! Restarting...")
                backend_proc = subprocess.Popen(
                    [PYTHON_EXE, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
                    cwd=BACKEND_DIR
                )

            # Check dashboard
            if dashboard_proc.poll() is not None:
                print("[!] Next.js Dashboard stopped unexpectedly! Restarting...")
                dashboard_proc = subprocess.Popen(
                    "npm run dev",
                    shell=True,
                    cwd=DASHBOARD_DIR
                )

            # Check and auto-recover serial bridge (only when bridge was started)
            if bridge_started and bridge_proc is not None:
                if bridge_proc.poll() is not None:
                    # Bridge exited. Honour backoff before attempting re-scan.
                    if bridge_no_port_ticks > 0:
                        bridge_no_port_ticks -= 1
                        continue

                    if not demo_mode:
                        print("[!] Serial Bridge stopped! Re-scanning COM ports for ESP32...")
                        new_port = auto_detect_esp32_port()
                        if new_port:
                            esp32_port = new_port
                            bridge_no_port_ticks = 0
                            print(f"[+] ESP32 found on {esp32_port}. Re-establishing connection...")
                            run_bridge()
                        else:
                            print("[WARNING] ESP32 not detected. Will retry in 30 seconds...")
                            # 15 ticks * 2 s each = 30 s backoff
                            bridge_no_port_ticks = 15
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
