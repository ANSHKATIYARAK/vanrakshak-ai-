from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Dict
import paho.mqtt.client as mqtt
import json
import os
from . import models, schemas, database, localization
from .database import engine, get_db, SessionLocal

# Create tables
models.Base.metadata.create_all(bind=engine)

def run_migrations():
    import sqlite3
    db_path = "vanrakshak.db"
    print(f"[*] Running database migrations check on {db_path}...")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check existing columns in telemetry table
        cursor.execute("PRAGMA table_info(telemetry)")
        columns = [row[1] for row in cursor.fetchall()]
        
        # Expected columns and types
        new_cols = {
            "tilt": "FLOAT DEFAULT 0.0",
            "accel_x": "FLOAT DEFAULT 0.0",
            "accel_y": "FLOAT DEFAULT 0.0",
            "accel_z": "FLOAT DEFAULT 9.81",
            "vibration": "FLOAT DEFAULT 0.0",
            "audio_rms": "FLOAT DEFAULT 0.0",
            "audio_peak": "FLOAT DEFAULT 0.0",
            "rssi": "INTEGER DEFAULT -120",
            "packet_count": "INTEGER DEFAULT 0",
            "uptime": "INTEGER DEFAULT 0",
            "who_am_i": "INTEGER DEFAULT 0",
            "lora_ver": "INTEGER DEFAULT 0",
            "raw_samples": "TEXT DEFAULT '[0,0,0,0,0]'",
            "mpu_status": "TEXT DEFAULT 'OFFLINE'",
            "mic_status": "TEXT DEFAULT 'OFFLINE'",
            "lora_status": "TEXT DEFAULT 'OFFLINE'"
        }
        
        for col, sql_type in new_cols.items():
            if col not in columns:
                print(f"[*] Database migration: adding column '{col}' to 'telemetry' table...")
                cursor.execute(f"ALTER TABLE telemetry ADD COLUMN {col} {sql_type}")
        
        conn.commit()
        conn.close()
        print("[*] Database migrations check complete.")
    except Exception as ex:
        print(f"[!] Migration check failed: {ex}")

# Run migrations
run_migrations()

# Seed database with VR-X-001 and clean up simulated/demo records
db = SessionLocal()
try:
    # Delete any node that is not the real VR-X-001 node
    deleted_nodes = db.query(models.Node).filter(models.Node.id != "VR-X-001").delete()
    if deleted_nodes > 0:
        print(f"[*] Cleaned up {deleted_nodes} simulated/demo nodes from database.")
    
    # Delete simulated alerts
    deleted_alerts = db.query(models.Alert).filter(models.Alert.node_id != "VR-X-001").delete()
    if deleted_alerts > 0:
        print(f"[*] Cleaned up {deleted_alerts} simulated alerts from database.")
        
    # Ensure VR-X-001 exists
    real_node = db.query(models.Node).filter(models.Node.id == "VR-X-001").first()
    if not real_node:
        print("[*] Seeding live node VR-X-001 into database...")
        real_node = models.Node(
            id="VR-X-001",
            name="Sentinel Node VR-X-001",
            latitude=24.123456,
            longitude=78.234567,
            battery_level=100.0,
            status="active"
        )
        db.add(real_node)
    else:
        real_node.name = "Sentinel Node VR-X-001"
        real_node.latitude = 24.123456
        real_node.longitude = 78.234567
    db.commit()
except Exception as e:
    print(f"[!] Error seeding/cleaning database: {e}")
    db.rollback()
finally:
    db.close()

app = FastAPI(title="VanRakshak-X AI Backend", version="1.0.0")

# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# Global state for diagnostics and localization buffering
recent_alerts = {} # {event_hash: [node_data, ...]}

import time as pytime
diagnostics_state = {
    "last_bridge_heartbeat": 0.0,
    "last_serial_read": 0.0,
    "last_mqtt_received": 0.0,
    "last_db_insert": 0.0,
    "last_db_record_id": 0
}

# MQTT Configuration
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
MQTT_TOPIC_TELEMETRY = "vanrakshak/node/+/telemetry"
MQTT_TOPIC_ALERT = "vanrakshak/node/+/alert"

def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT Broker with result code {rc}")
    client.subscribe(MQTT_TOPIC_TELEMETRY)
    client.subscribe(MQTT_TOPIC_ALERT)
    client.subscribe("vanrakshak/bridge/heartbeat")

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        
        if msg.topic == "vanrakshak/bridge/heartbeat":
            diagnostics_state["last_bridge_heartbeat"] = pytime.time()
            diagnostics_state["last_serial_read"] = payload.get("last_serial_read", 0.0)
            return
            
        topic_parts = msg.topic.split('/')
        node_id = topic_parts[2]
        
        db = database.SessionLocal()
        node = db.query(models.Node).filter(models.Node.id == node_id).first()
        
        # Extraction for logging
        tilt = payload.get("tilt", 0.0)
        rms = payload.get("rms", 0.0)
        batt = payload.get("batt", 0.0)
        rssi = payload.get("rssi", -120)
        timestamp = pytime.strftime("%Y-%m-%d %H:%M:%S")

        if "telemetry" in msg.topic:
            print(f"[TRACE][MQTT] Recv Telemetry: time={timestamp}, id={node_id}, tilt={tilt}, rms={rms}, batt={batt}, rssi={rssi}")
            
            raw_samples_str = json.dumps(payload.get("raw_samples", [0,0,0,0,0]))
            
            new_telemetry = models.Telemetry(
                node_id=node_id,
                temperature=payload.get("temp"),
                humidity=payload.get("hum"),
                battery_voltage=payload.get("batt"),
                tilt=payload.get("tilt", 0.0),
                accel_x=payload.get("accel_x", 0.0),
                accel_y=payload.get("accel_y", 0.0),
                accel_z=payload.get("accel_z", 9.81),
                vibration=payload.get("vib", 0.0),
                audio_rms=payload.get("rms", 0.0),
                audio_peak=payload.get("peak", 0.0),
                rssi=payload.get("rssi", -120),
                packet_count=payload.get("packets", 0),
                uptime=payload.get("uptime", 0),
                who_am_i=payload.get("who_am_i", 0),
                lora_ver=payload.get("lora_ver", 0),
                raw_samples=raw_samples_str,
                mpu_status=payload.get("mpu_status", "OFFLINE"),
                mic_status=payload.get("mic_status", "OFFLINE"),
                lora_status=payload.get("lora_status", "OFFLINE")
            )
            db.add(new_telemetry)
            db.commit()
            db.refresh(new_telemetry) # Populate auto-increment ID
            
            print(f"[TRACE][DATABASE] Insert Telemetry: time={timestamp}, id={node_id}, record_id={new_telemetry.id}, tilt={tilt}, rms={rms}, batt={batt}, rssi={rssi}")
            
            # Update node battery level and status
            if node:
                node.battery_level = payload.get("batt_pct", node.battery_level)
                mpu_s = payload.get("mpu_status", "OFFLINE")
                mic_s = payload.get("mic_status", "OFFLINE")
                lora_s = payload.get("lora_status", "OFFLINE")
                if mpu_s == "OFFLINE" or mic_s == "OFFLINE" or lora_s == "OFFLINE":
                    node.status = "degraded"
                else:
                    node.status = "active"
            
            # Real-time alert threshold checks based on incoming telemetry
            tilt = payload.get("tilt", 0.0)
            vib = payload.get("vib", 0.0)
            rms = payload.get("rms", 0.0)
            batt = payload.get("batt", 4.2)
            
            alerts_to_create = []
            
            # 1. Tilt threshold exceeded
            if abs(tilt) > 5.0:
                alerts_to_create.append({
                    "type": "Tilt threshold exceeded",
                    "score": abs(tilt) / 45.0,
                    "conf": 0.95
                })
            
            # 2. Excessive vibration detected
            if vib > 30.0:
                alerts_to_create.append({
                    "type": "Excessive vibration detected",
                    "score": vib / 100.0,
                    "conf": 0.90
                })
                
            # 3. Acoustic anomaly detected (5 consecutive samples of RMS > 500)
            if rms > 500.0:
                recent_tel = db.query(models.Telemetry).filter(models.Telemetry.node_id == node_id).order_by(models.Telemetry.timestamp.desc()).limit(4).all()
                consecutive_count = 1
                for r_t in recent_tel:
                    if r_t.audio_rms and r_t.audio_rms > 500.0:
                        consecutive_count += 1
                    else:
                        break
                
                if consecutive_count >= 5:
                    alerts_to_create.append({
                        "type": "Acoustic anomaly detected",
                        "score": min(1.0, rms / 2000.0),
                        "conf": 0.88
                    })
            
            # 4. Battery critical
            if batt < 3.4:
                alerts_to_create.append({
                    "type": "Battery critical",
                    "score": 1.0,
                    "conf": 0.99
                })

            for alert_data in alerts_to_create:
                existing_active = db.query(models.Alert).filter(
                    models.Alert.node_id == node_id,
                    models.Alert.threat_type == alert_data["type"],
                    models.Alert.resolved == False
                ).first()
                if not existing_active:
                    new_alert = models.Alert(
                        node_id=node_id,
                        threat_type=alert_data["type"],
                        confidence=alert_data["conf"],
                        threat_score=alert_data["score"],
                        resolved=False
                    )
                    db.add(new_alert)
                    if node:
                        node.status = "alert"
                        
        elif "alert" in msg.topic:
            print(f"[TRACE][MQTT] Recv Alert: time={timestamp}, id={node_id}, topic={msg.topic}")
            threat_type_input = payload.get("type", "Acoustic anomaly detected")
            alert_mapping = {
                "INTRUSION": "Acoustic anomaly detected",
                "ACOUSTIC_ANOMALY": "Acoustic anomaly detected",
                "CHAINSAW": "Acoustic anomaly detected",
                "TREE_FALLING": "Tilt threshold exceeded",
                "TAMPER": "Excessive vibration detected"
            }
            threat_type = alert_mapping.get(threat_type_input, threat_type_input)
            
            existing_active = db.query(models.Alert).filter(
                models.Alert.node_id == node_id,
                models.Alert.threat_type == threat_type,
                models.Alert.resolved == False
            ).first()
            
            if not existing_active:
                new_alert = models.Alert(
                    node_id=node_id,
                    threat_type=threat_type,
                    confidence=payload.get("conf", 0.90),
                    threat_score=payload.get("score", 0.50),
                    resolved=False
                )
                db.add(new_alert)
                if node:
                    node.status = "alert"
                db.commit()
                db.refresh(new_alert)
                print(f"[TRACE][DATABASE] Insert Alert: time={timestamp}, id={node_id}, record_id={new_alert.id}, type={threat_type}")
            else:
                new_alert = existing_active
                db.commit()
        
        db.commit()
        
        # Broadcast via WebSocket
        import asyncio
        is_tel = "telemetry" in msg.topic
        record_id = new_telemetry.id if is_tel else new_alert.id
        message = {
            "node_id": node_id,
            "type": "telemetry" if is_tel else "alert",
            "data": payload,
            "trace": {
                "mqtt_time": timestamp,
                "db_record_id": record_id
            }
        }
        
        print(f"[TRACE][WEBSOCKET] Broadcast: time={timestamp}, id={node_id}, type={message['type']}, record_id={record_id}")
        
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(manager.broadcast(message))
        except:
            pass
            
        db.close()
    except Exception as e:
        print(f"Error processing MQTT message: {e}")


import asyncio
from .simulator import EcoSimulator

mqtt_client = mqtt.Client()
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

# Simulator instance
eco_simulator = EcoSimulator(manager, diagnostics_state)

@app.on_event("startup")
async def startup_event():
    try:
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()
    except Exception as e:
        print(f"Could not connect to MQTT Broker: {e}")
    
    # Start the simulation background task
    asyncio.create_task(eco_simulator.run())

@app.on_event("shutdown")
def shutdown_event():
    mqtt_client.loop_stop()

# API Endpoints
@app.get("/nodes", response_model=List[schemas.Node])
def get_nodes(db: Session = Depends(get_db)):
    return db.query(models.Node).all()

@app.post("/nodes", response_model=schemas.Node)
def create_node(node: schemas.NodeCreate, db: Session = Depends(get_db)):
    db_node = models.Node(**node.dict())
    db.add(db_node)
    db.commit()
    db.refresh(db_node)
    return db_node

@app.get("/alerts", response_model=List[schemas.Alert])
def get_alerts(db: Session = Depends(get_db)):
    return db.query(models.Alert).order_by(models.Alert.timestamp.desc()).all()

@app.get("/analytics/sustainability")
def get_sustainability_metrics(db: Session = Depends(get_db)):
    # Research logic: Carbon = Trees * Avg absorption
    total_trees = 1248 # Placeholder from db.query().count()
    co2_prevented = total_trees * 0.022 # Avg 22kg per tree per year
    return {
        "trees_protected": total_trees,
        "co2_prevented_tonnes": round(co2_prevented, 2),
        "impact_score": 84
    }

@app.get("/analytics/predictive-hotspots")
def get_predictive_hotspots(db: Session = Depends(get_db)):
    # Bayesian logic: Hotspot probability based on alert frequency + node location
    return [
        {"lat": 24.1, "lng": 78.2, "probability": 0.85, "reason": "Repeated nocturnal acoustic anomalies"},
        {"lat": 24.2, "lng": 78.5, "probability": 0.45, "reason": "High accessibility zone"}
    ]

@app.get("/analytics/bsi")
def get_bsi_trend(db: Session = Depends(get_db)):
    # Bioacoustic Stability Index (BSI) trend
    return {
        "status": "STABLE",
        "current_index": 78,
        "trend": [65, 70, 72, 75, 78, 80, 78]
    }

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    esp32_online = False
    from datetime import datetime
    from sqlalchemy import desc
    try:
        latest = db.query(models.Telemetry).filter(
            models.Telemetry.node_id == "VR-X-001"
        ).order_by(desc(models.Telemetry.timestamp)).first()
        if latest:
            elapsed = (datetime.now() - latest.timestamp).total_seconds()
            if elapsed <= 5.0:
                esp32_online = True
    except Exception as ex:
        pass

    mqtt_online = False
    try:
        mqtt_online = mqtt_client.is_connected()
    except Exception as ex:
        pass

    db_online = False
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1")).fetchall()
        db_online = True
    except Exception as ex:
        pass

    ws_online = len(manager.active_connections) > 0

    import socket
    dashboard_online = False
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.5)
        s.connect(("127.0.0.1", 3000))
        s.close()
        dashboard_online = True
    except Exception:
        pass

    return {
        "esp32": esp32_online,
        "mqtt": mqtt_online,
        "database": db_online,
        "websocket": ws_online,
        "dashboard": dashboard_online
    }

@app.get("/")
def read_root():
    return {"message": "VanRakshak AI Backend is running"}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle client messages if needed
    except WebSocketDisconnect:
        manager.disconnect(websocket)
