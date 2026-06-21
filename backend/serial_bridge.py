import serial
import serial.tools.list_ports
import json
import paho.mqtt.client as mqtt
import time
import sys
import argparse
import random
import urllib.request
import urllib.error

# Configurations
BAUD_RATE = 115200
MQTT_BROKER = '127.0.0.1'
MQTT_PORT = 1883

def auto_detect_esp32_port():
    print("[*] Scanning COM ports for ESP32...")
    ports = list(serial.tools.list_ports.comports())
    for port_info in ports:
        port = port_info.device
        print(f"[*] Probing port {port}...")
        try:
            ser = serial.Serial(port, BAUD_RATE, timeout=0.5)
            t0 = time.time()
            # Probe for up to 6.0 seconds to wait for ESP32 boot & telemetry output
            while time.time() - t0 < 6.0:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                if "{" in line and "}" in line and '"id"' in line:
                    ser.close()
                    print(f"[x] ESP32 Detected on {port}")
                    return port
            ser.close()
        except Exception:
            pass
    return None

def main():
    parser = argparse.ArgumentParser(description="VanRakshak-X Serial Bridge")
    parser.add_argument("--port", type=str, help="Serial port (e.g. COM5). If omitted, scans ports.")
    parser.add_argument("--demo", action="store_true", help="Run in simulated Demo Mode")
    args = parser.parse_args()

    print("==================================================")
    print("         VanRakshak-X Telemetry Serial Bridge")
    print("==================================================")

    # Instantiate client with proper API version compatibility
    try:
        client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION1)
    except AttributeError:
        # Fallback for older paho-mqtt versions
        client = mqtt.Client()
        
    print(f"Connecting to MQTT Broker at {MQTT_BROKER}:{MQTT_PORT}...")
    mqtt_connected = False
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
        print("Connected to MQTT Broker successfully.")
        mqtt_connected = True
    except Exception as e:
        print(f"Failed to connect to MQTT broker: {e}")
        print("Proceeding with HTTP REST fallbacks since local MQTT broker is offline.")

    # Simulated Demo Mode Check
    if args.demo:
        print("\n--- Running in SIMULATED DEMO MODE ---")
        print("Publishing simulated telemetry every 1.5 seconds. Press Ctrl+C to stop.")
        packets_count = 0
        last_heartbeat_time = 0.0
        
        try:
            while True:
                now = time.time()
                # Heartbeat
                if now - last_heartbeat_time >= 2.0:
                    heartbeat_payload = {
                        "status": "online",
                        "last_serial_read": now
                    }
                    if mqtt_connected:
                        client.publish("vanrakshak/bridge/heartbeat", json.dumps(heartbeat_payload))
                    last_heartbeat_time = now

                # Generate simulated telemetry packet representing ESP32
                packets_count += 1
                sim_payload = {
                    "id": "VR-X-001",
                    "tilt": round(-2.0 + random.uniform(-0.15, 0.15), 3),
                    "accel_x": round(0.4 + random.uniform(-0.02, 0.02), 3),
                    "accel_y": round(0.3 + random.uniform(-0.02, 0.02), 3),
                    "accel_z": round(9.8 + random.uniform(-0.02, 0.02), 3),
                    "vib": round(3.0 + random.uniform(-0.3, 0.3), 2),
                    "rms": round(0.000009 + random.uniform(-0.000002, 0.000002), 7),
                    "peak": random.randint(1, 3),
                    "uptime": int(time.time() * 1000) % 1000000,
                    "rssi": -70 + random.randint(-5, 5),
                    "packets": packets_count,
                    "lora_ver": 18,
                    "mpu_status": "ONLINE",
                    "mic_status": "ONLINE",
                    "lora_status": "ONLINE",
                    "esp_status": "ONLINE",
                    "who_am_i": 112,
                    "temp": round(46.0 + random.uniform(-0.1, 0.1), 2),
                    "hum": 65,
                    "batt": round(4.15 + random.uniform(-0.01, 0.01), 2),
                    "batt_pct": 95,
                    "raw_samples": [random.randint(-5, 5) for _ in range(5)]
                }
                
                # Check for occasional random acoustic anomalies to demonstrate chart spikes
                if random.random() < 0.15:
                    sim_payload["rms"] = round(random.uniform(600.0, 950.0), 2)
                    sim_payload["peak"] = 1200
                    print(f"[*] [SIMULATOR] Simulating transient acoustic spike (RMS={sim_payload['rms']})")
                
                # Check for occasional random vibration shocks
                if random.random() < 0.1:
                    sim_payload["vib"] = round(random.uniform(35.0, 55.0), 2)
                    print(f"[*] [SIMULATOR] Simulating transient vibration shock (Vib={sim_payload['vib']})")

                json_str = json.dumps(sim_payload)
                node_id = sim_payload["id"]
                timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

                # Trace log
                print(f"[TRACE][SERIAL BRIDGE] Recv: time={timestamp}, id={node_id}, tilt={sim_payload['tilt']}, rms={sim_payload['rms']}, batt={sim_payload['batt']}, rssi={sim_payload['rssi']}")
                
                if mqtt_connected:
                    topic = f"vanrakshak/node/{node_id}/telemetry"
                    client.publish(topic, json_str)
                    print(f"[TRACE][SERIAL BRIDGE] MQTT Publish Telemetry: topic={topic}")
                else:
                    try:
                        req = urllib.request.Request(
                            "http://127.0.0.1:8000/demo/telemetry",
                            data=json_str.encode('utf-8'),
                            headers={'Content-Type': 'application/json'}
                        )
                        with urllib.request.urlopen(req) as resp:
                            resp.read()
                        print(f"[TRACE][SERIAL BRIDGE] HTTP Post Telemetry fallback success")
                    except Exception as e:
                        print(f"[TRACE][SERIAL BRIDGE] HTTP Post Telemetry fallback failed: {e}")

                time.sleep(1.0)

        except KeyboardInterrupt:
            print("\nStopping simulated bridge...")
        finally:
            if mqtt_connected:
                client.loop_stop()
                client.disconnect()
            print("Simulated bridge stopped.")
            sys.exit(0)

    # Real serial connection
    selected_port = args.port
    if not selected_port:
        selected_port = auto_detect_esp32_port()
        if not selected_port:
            print("[!] ESP32 Not Found")
            sys.exit(2) # Exit code 2 indicates no device found

    print(f"Opening Serial Port {selected_port} at {BAUD_RATE} baud...")
    try:
        ser = serial.Serial(selected_port, BAUD_RATE, timeout=1)
        ser.reset_input_buffer()
        ser.reset_output_buffer()
        print(f"Serial port {selected_port} opened successfully.")
    except Exception as e:
        print(f"Failed to open serial port {selected_port}: {e}")
        sys.exit(1)

    print("\n--- Bridge is Active. Listening for telemetry/alerts... ---")
    print("Press Ctrl+C to stop.")

    last_heartbeat_time = 0.0
    last_serial_read_time = 0.0

    try:
        while True:
            # Publish heartbeat check
            now = time.time()
            if now - last_heartbeat_time >= 2.0:
                heartbeat_payload = {
                    "status": "online",
                    "last_serial_read": last_serial_read_time
                }
                if mqtt_connected:
                    client.publish("vanrakshak/bridge/heartbeat", json.dumps(heartbeat_payload))
                last_heartbeat_time = now

            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if not line:
                time.sleep(0.01)
                continue

            last_serial_read_time = time.time()

            # Look for JSON payload in the serial output
            if "{" in line and "}" in line:
                try:
                    start_idx = line.find("{")
                    end_idx = line.rfind("}") + 1
                    json_str = line[start_idx:end_idx]
                    
                    payload = json.loads(json_str)
                    node_id = payload.get("id", "unknown-node")
                    
                    tilt = payload.get("tilt", 0.0)
                    rms = payload.get("rms", 0.0)
                    batt = payload.get("batt", 0.0)
                    rssi = payload.get("rssi", -120)
                    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

                    print(f"[TRACE][SERIAL BRIDGE] Recv: time={timestamp}, id={node_id}, tilt={tilt}, rms={rms}, batt={batt}, rssi={rssi}")

                    if "score" in payload:
                        if mqtt_connected:
                            topic = f"vanrakshak/node/{node_id}/alert"
                            client.publish(topic, json_str)
                            print(f"[TRACE][SERIAL BRIDGE] MQTT Publish Alert: topic={topic}")
                        else:
                            try:
                                alert_post_data = {
                                    "node_id": node_id,
                                    "threat_type": payload.get("type", "Acoustic anomaly"),
                                    "confidence": payload.get("conf", 0.90),
                                    "threat_score": payload.get("score", 0.50)
                                }
                                req = urllib.request.Request(
                                    "http://127.0.0.1:8000/alerts/mic",
                                    data=json.dumps(alert_post_data).encode('utf-8'),
                                    headers={'Content-Type': 'application/json'}
                                )
                                with urllib.request.urlopen(req) as resp:
                                    resp.read()
                                print(f"[TRACE][SERIAL BRIDGE] HTTP Post Alert fallback success")
                            except Exception as e:
                                print(f"[TRACE][SERIAL BRIDGE] HTTP Post Alert fallback failed: {e}")
                    elif "uptime" in payload or "tilt" in payload or "packets" in payload:
                        if mqtt_connected:
                            topic = f"vanrakshak/node/{node_id}/telemetry"
                            client.publish(topic, json_str)
                            print(f"[TRACE][SERIAL BRIDGE] MQTT Publish Telemetry: topic={topic}")
                        else:
                            try:
                                req = urllib.request.Request(
                                    "http://127.0.0.1:8000/demo/telemetry",
                                    data=json_str.encode('utf-8'),
                                    headers={'Content-Type': 'application/json'}
                                )
                                with urllib.request.urlopen(req) as resp:
                                    resp.read()
                                print(f"[TRACE][SERIAL BRIDGE] HTTP Post Telemetry fallback success")
                            except Exception as e:
                                print(f"[TRACE][SERIAL BRIDGE] HTTP Post Telemetry fallback failed: {e}")

                except json.JSONDecodeError:
                    print(f"[Serial Bridge] JSON Decode Error on line: {line}")
                except Exception as ex:
                    print(f"[Serial Bridge] Error forwarding packet: {ex}")
            else:
                print(f"[Serial] {line}")

            time.sleep(0.01)

    except KeyboardInterrupt:
        print("\nStopping bridge...")
    except Exception as ex:
        print(f"\n[!] Serial Bridge fatal error: {ex}")
    finally:
        try:
            ser.close()
        except Exception:
            pass
        if mqtt_connected:
            client.loop_stop()
            client.disconnect()
        print("Bridge stopped.")

if __name__ == "__main__":
    main()
