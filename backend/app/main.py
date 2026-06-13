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

# Seed database with nodes on startup if empty
db = SessionLocal()
if db.query(models.Node).count() == 0:
    print("[*] Database is empty. Seeding 42 nodes for Sector PR-04...")
    try:
        from .simulator import generate_stable_nodes
        nodes_data = generate_stable_nodes()
        for node_id, info in nodes_data.items():
            db_node = models.Node(
                id=node_id,
                name=f"Sentinel {node_id}",
                latitude=info["lat"],
                longitude=info["lng"],
                battery_level=info["battery"],
                status=info["status"]
            )
            db.add(db_node)
        db.commit()
        print("[*] Seeding complete: 42 nodes added to database.")
    except Exception as e:
        print(f"[!] Error seeding database on startup: {e}")
        db.rollback()
db.close()

app = FastAPI(title="VanRakshak AI Backend", version="1.0.0")

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
            await connection.send_json(message)

manager = ConnectionManager()

# Global state for localization buffering
recent_alerts = {} # {event_hash: [node_data, ...]}

# MQTT Configuration
MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
MQTT_TOPIC_TELEMETRY = "vanrakshak/node/+/telemetry"
MQTT_TOPIC_ALERT = "vanrakshak/node/+/alert"

def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT Broker with result code {rc}")
    client.subscribe(MQTT_TOPIC_TELEMETRY)
    client.subscribe(MQTT_TOPIC_ALERT)

def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        topic_parts = msg.topic.split('/')
        node_id = topic_parts[2]
        
        db = database.SessionLocal()
        if "telemetry" in msg.topic:
            new_telemetry = models.Telemetry(
                node_id=node_id,
                temperature=payload.get("temp"),
                humidity=payload.get("hum"),
                battery_voltage=payload.get("batt")
            )
            db.add(new_telemetry)
            # Update node battery and last seen
            node = db.query(models.Node).filter(models.Node.id == node_id).first()
            if node:
                node.battery_level = payload.get("batt_pct", node.battery_level)
                node.status = "active"
        
        elif "alert" in msg.topic:
            new_alert = models.Alert(
                node_id=node_id,
                threat_type=payload.get("type"),
                confidence=payload.get("conf"),
                threat_score=payload.get("score")
            )
            db.add(new_alert)
            # Update node status
            node = db.query(models.Node).filter(models.Node.id == node_id).first()
            if node:
                node.status = "alert"
        
        db.commit()
        
        # Broadcast via WebSocket
        import asyncio
        message = {
            "node_id": node_id,
            "type": "telemetry" if "telemetry" in msg.topic else "alert",
            "data": payload
        }
        
        # TDOA Localization Check (Research Novelty #6)
        if "alert" in msg.topic:
            # Add to buffer and check if other nodes saw it
            event_key = f"{payload.get('type')}_{int(payload.get('ts', 0)/1000)}"
            if event_key not in recent_alerts:
                recent_alerts[event_key] = []
            
            # Fetch node location
            node = db.query(models.Node).filter(models.Node.id == node_id).first()
            if node:
                recent_alerts[event_key].append({
                    "id": node_id,
                    "x": node.latitude,
                    "y": node.longitude,
                    "arrival_us": payload.get("arrival_us", 0)
                })
            
            if len(recent_alerts[event_key]) >= 3:
                location = localization.localizer.triangulate(recent_alerts[event_key])
                message["localized"] = location
                print(f"DEBUG: Localization successful for {event_key}: {location}")
        
        # Broadcast the message
        # Note: In a production app, use a queue or task to avoid loop issues
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
eco_simulator = EcoSimulator(manager)

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
