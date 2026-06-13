import serial
import json
import paho.mqtt.client as mqtt
import time
import sys

# Configurations
SERIAL_PORT = 'COM5'
BAUD_RATE = 115200
MQTT_BROKER = '127.0.0.1'
MQTT_PORT = 1883

def main():
    print("==================================================")
    # Instantiate client with proper API version compatibility
    try:
        client = mqtt.Client(callback_api_version=mqtt.CallbackAPIVersion.VERSION1)
    except AttributeError:
        # Fallback for older paho-mqtt versions
        client = mqtt.Client()
        
    print(f"Connecting to MQTT Broker at {MQTT_BROKER}:{MQTT_PORT}...")
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
        print("Connected to MQTT Broker successfully.")
    except Exception as e:
        print(f"Failed to connect to MQTT broker: {e}")
        print("Please ensure your local Mosquitto service is running.")
        sys.exit(1)

    print(f"Opening Serial Port {SERIAL_PORT} at {BAUD_RATE} baud...")
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        # Flush buffers
        ser.reset_input_buffer()
        ser.reset_output_buffer()
        print(f"Serial port {SERIAL_PORT} opened successfully.")
    except Exception as e:
        print(f"Failed to open serial port {SERIAL_PORT}: {e}")
        print("Please verify the COM port number and ensure no other tool (like Arduino Serial Monitor or PlatformIO monitor) is using it.")
        sys.exit(1)

    print("\n--- Bridge is Active. Listening for telemetry/alerts... ---")
    print("Press Ctrl+C to stop.")

    try:
        while True:
            line = ser.readline().decode('utf-8', errors='ignore').strip()
            if not line:
                continue

            # Print raw lines to console for debugging
            print(f"[Serial] {line}")

            # Look for JSON payload in the serial output
            if "{" in line and "}" in line:
                try:
                    # Extract the JSON substring
                    start_idx = line.find("{")
                    end_idx = line.rfind("}") + 1
                    json_str = line[start_idx:end_idx]
                    
                    payload = json.loads(json_str)
                    node_id = payload.get("id", "unknown-node")

                    # Check payload type by fields
                    if "score" in payload:
                        # Alert packet
                        topic = f"vanrakshak/node/{node_id}/alert"
                        client.publish(topic, json_str)
                        print(f"  >>> Published Alert to {topic}: {json_str}")
                    elif "bsi" in payload:
                        # Telemetry packet
                        topic = f"vanrakshak/node/{node_id}/telemetry"
                        client.publish(topic, json_str)
                        print(f"  >>> Published Telemetry to {topic}: {json_str}")

                except json.JSONDecodeError:
                    pass
                except Exception as ex:
                    print(f"Error forwarding packet: {ex}")

            time.sleep(0.01)

    except KeyboardInterrupt:
        print("\nStopping bridge...")
    finally:
        ser.close()
        client.loop_stop()
        client.disconnect()
        print("Bridge stopped.")

if __name__ == "__main__":
    main()
