import asyncio
import time
import json
from datetime import datetime, timezone
from sqlalchemy import desc
from .database import SessionLocal
from . import models

class EcoSimulator:
    def __init__(self, manager, diagnostics=None):
        self.manager = manager
        self.diagnostics = diagnostics or {
            "last_bridge_heartbeat": 0.0,
            "last_serial_read": 0.0,
            "last_mqtt_received": 0.0,
            "last_db_insert": 0.0,
            "last_db_record_id": 0
        }
        self.node_id = "VR-X-001"

    async def run(self):
        print("[*] Telemetry Aggregator Core started.")
        while True:
            db = SessionLocal()
            try:
                # 1. Fetch recent telemetry records for VR-X-001
                recent_tels = db.query(models.Telemetry).filter(
                    models.Telemetry.node_id == self.node_id
                ).order_by(desc(models.Telemetry.timestamp)).limit(2).all()
                
                latest_tel = recent_tels[0] if len(recent_tels) > 0 else None
                
                node = db.query(models.Node).filter(models.Node.id == self.node_id).first()
                
                # Check status and last seen
                is_online = False
                node_status = "offline"
                last_seen_str = "Never"
                
                # Default metrics
                tilt = 0.0
                accel_x = 0.0
                accel_y = 0.0
                accel_z = 9.81
                vib = 0.0
                rms = 0.0
                peak = 0.0
                rssi = -120
                packets = 0
                uptime = 0
                who_am_i = 0
                lora_ver = 0
                raw_samples = [0, 0, 0, 0, 0]
                mpu_s = "OFFLINE"
                mic_s = "OFFLINE"
                lora_s = "OFFLINE"
                batt = 4.2
                batt_pct = 100.0
                
                if latest_tel:
                    # Calculate time delta in seconds
                    now = datetime.now(timezone.utc)
                    tel_time = latest_tel.timestamp.replace(tzinfo=timezone.utc)
                    elapsed = (now - tel_time).total_seconds()
                    
                    # ESP32 ONLINE: Telemetry received within 5 seconds
                    if elapsed <= 5.0:
                        is_online = True
                        last_seen_str = f"{int(elapsed)} seconds ago" if elapsed >= 1.0 else f"{round(elapsed, 1)} sec ago"
                        # Set actual metrics
                        tilt = latest_tel.tilt or 0.0
                        accel_x = latest_tel.accel_x or 0.0
                        accel_y = latest_tel.accel_y or 0.0
                        accel_z = latest_tel.accel_z or 9.81
                        vib = latest_tel.vibration or 0.0
                        rms = latest_tel.audio_rms or 0.0
                        peak = latest_tel.audio_peak or 0.0
                        rssi = latest_tel.rssi if latest_tel.rssi is not None else -120
                        packets = latest_tel.packet_count or 0
                        uptime = latest_tel.uptime or 0
                        who_am_i = latest_tel.who_am_i or 0
                        lora_ver = latest_tel.lora_ver or 0
                        batt = latest_tel.battery_voltage or 0.0
                        
                        try:
                            raw_samples = json.loads(latest_tel.raw_samples)
                        except:
                            raw_samples = [0, 0, 0, 0, 0]
                            
                        # Evaluate changes between consecutive samples
                        mpu_changing = False
                        mic_changing = False
                        if len(recent_tels) >= 2:
                            t1 = recent_tels[0]
                            t2 = recent_tels[1]
                            mpu_changing = (t1.tilt != t2.tilt) or (t1.accel_x != t2.accel_x) or (t1.accel_y != t2.accel_y)
                            mic_changing = (t1.audio_rms != t2.audio_rms)
                        else:
                            # Default to True on single sample
                            mpu_changing = True
                            mic_changing = True

                        # Apply sensor status rules:
                        # MPU6050 ONLINE: WHO_AM_I valid AND telemetry changing
                        who_am_i_valid = who_am_i in [0x68, 104, 0x69, 105, 0x70, 112]
                        if who_am_i_valid and mpu_changing:
                            mpu_s = "ONLINE"
                        else:
                            mpu_s = "OFFLINE"
                        
                        # INMP441 ONLINE: RMS values changing
                        if mic_changing:
                            mic_s = "ONLINE"
                        else:
                            mic_s = "OFFLINE"

                        # LoRa ONLINE: Version register valid (SX127x is 0x12 = 18)
                        if lora_ver == 18:
                            lora_s = "ONLINE"
                        else:
                            lora_s = "OFFLINE"

                        if mpu_s == "OFFLINE" or mic_s == "OFFLINE" or lora_s == "OFFLINE":
                            node_status = "degraded"
                        else:
                            node_status = "active"
                    else:
                        is_online = False
                        node_status = "offline"
                        last_seen_str = f"{int(elapsed)} seconds ago" if elapsed >= 1.0 else f"{round(elapsed, 1)} sec ago"
                
                # Update node status in DB
                if node:
                    node.status = node_status
                    if is_online:
                        node.battery_level = float(map_val(batt * 100, 330, 420, 0, 100))
                    db.commit()
                
                # Check for "Node offline" alert
                if not is_online and latest_tel:
                    existing_offline = db.query(models.Alert).filter(
                        models.Alert.node_id == self.node_id,
                        models.Alert.threat_type == "Node offline",
                        models.Alert.resolved == False
                    ).first()
                    if not existing_offline:
                        offline_alert = models.Alert(
                            node_id=self.node_id,
                            threat_type="Node offline",
                            confidence=0.99,
                            threat_score=1.0,
                            resolved=False
                        )
                        db.add(offline_alert)
                        if node:
                            node.status = "offline"
                        db.commit()
                elif is_online:
                    active_offline = db.query(models.Alert).filter(
                        models.Alert.node_id == self.node_id,
                        models.Alert.threat_type == "Node offline",
                        models.Alert.resolved == False
                    ).first()
                    if active_offline:
                        active_offline.resolved = True
                        db.commit()

                # 2. Forest Integrity Score Calculation
                # Integrity Score = 100 - vibration_penalty - tilt_penalty - connectivity_penalty - battery_penalty
                vib_penalty = min(30.0, vib * 0.4)
                tilt_penalty = 30.0 if abs(tilt) > 5.0 else 0.0
                conn_penalty = 50.0 if not is_online else 0.0
                batt_penalty = min(30.0, max(0.0, (3.6 - batt) * 100.0))
                
                integrity_score = max(0.0, min(100.0, 100.0 - vib_penalty - tilt_penalty - conn_penalty - batt_penalty))
                integrity_score = round(integrity_score, 1)
                
                # 3. Threat Level Determination
                # Get active alerts
                active_alerts = db.query(models.Alert).filter(
                    models.Alert.node_id == self.node_id,
                    models.Alert.resolved == False
                ).all()
                
                alert_types = [a.threat_type for a in active_alerts]
                
                threat_level = "LOW"
                if "Node offline" in alert_types:
                    threat_level = "CRITICAL"
                elif "Acoustic anomaly detected" in alert_types:
                    if "Excessive vibration detected" in alert_types or "Tilt threshold exceeded" in alert_types:
                        threat_level = "CRITICAL"
                    else:
                        threat_level = "HIGH"
                elif "Excessive vibration detected" in alert_types or "Tilt threshold exceeded" in alert_types:
                    threat_level = "MEDIUM"
                elif "Battery critical" in alert_types:
                    threat_level = "MEDIUM"
                
                threat_score_val = 0.1
                if threat_level == "MEDIUM":
                    threat_score_val = 0.45
                elif threat_level == "HIGH":
                    threat_score_val = 0.75
                elif threat_level == "CRITICAL":
                    threat_score_val = 1.0

                # Assemble telemetry logs for verified alerts
                telemetry_logs = []
                recent_alerts_all = db.query(models.Alert).filter(
                    models.Alert.node_id == self.node_id
                ).order_by(desc(models.Alert.timestamp)).limit(10).all()
                
                for a in recent_alerts_all:
                    time_str = a.timestamp.strftime("[%H:%M:%S]")
                    status_text = "RESOLVED" if a.resolved else "ACTIVE"
                    telemetry_logs.append(f"{time_str} {status_text}: {a.threat_type} (Conf: {int(a.confidence*100)}%)")
                
                if not telemetry_logs:
                    telemetry_logs = ["[00:00:00] SYSTEM: VR-X-001 Online. Listening..."]

                # 4. Construct aggregate state payload
                payload = {
                    "type": "simulation_state",
                    "data": {
                        "timestamp": time.time(),
                        "state": threat_level,
                        "threat_score": threat_score_val,
                        "integrity_score": integrity_score,
                        "diagnostics": self.diagnostics,
                        "metrics": {
                            "biodiversity": 96.4 if is_online else 0.0,
                            "node_vitality": 100.0 if is_online else 0.0,
                            "eco_stability": integrity_score,
                            "security_state": 100.0 - (threat_score_val * 100.0)
                        },
                        "telemetry": telemetry_logs,
                        "bsi_index": rms / 1000.0 if is_online else 0.0,
                        "mesh": {
                            "active": 1 if is_online else 0,
                            "latency": 24 if is_online else 0,
                            "routing_efficiency": 0.98 if is_online else 0.0,
                            "nodes": [
                                {
                                    "id": self.node_id,
                                    "lat": 24.123456,
                                    "lng": 78.234567,
                                    "battery": int(map_val(batt * 100, 330, 420, 0, 100)) if is_online else 0,
                                    "battery_voltage": round(batt, 2),
                                    "status": node_status,
                                    "last_seen": last_seen_str,
                                    "mpu_status": mpu_s,
                                    "mic_status": mic_s,
                                    "lora_status": lora_s,
                                    "esp_status": "ONLINE" if is_online else "OFFLINE"
                                }
                            ]
                        },
                        "latest_telemetry": {
                            "db_id": latest_tel.id,
                            "nodeId": self.node_id,
                            "tilt": round(tilt, 2),
                            "accel_x": round(accel_x, 3),
                            "accel_y": round(accel_y, 3),
                            "accel_z": round(accel_z, 3),
                            "vibration": round(vib, 1),
                            "audioRms": round(rms, 1),
                            "audioPeak": round(peak, 1),
                            "battery": round(batt, 2),
                            "rssi": rssi,
                            "packets": packets,
                            "uptime": uptime,
                            "who_am_i": hex(who_am_i) if who_am_i else "0x00",
                            "lora_ver": hex(lora_ver) if lora_ver else "0x00",
                            "raw_samples": raw_samples,
                            "timestamp": datetime.now().isoformat() + "Z"
                        } if latest_tel else None,
                        "alerts": [
                            {
                                "id": a.id,
                                "type": a.threat_type,
                                "conf": a.confidence,
                                "score": a.threat_score,
                                "timestamp": a.timestamp.isoformat()
                            } for a in active_alerts
                        ]
                    }
                }
                
                # Broadcast payload
                await self.manager.broadcast(payload)
                
            except Exception as e:
                print(f"[!] Error in aggregator core loop: {e}")
            finally:
                db.close()
                
            await asyncio.sleep(1.0)

def map_val(val, in_min, in_max, out_min, out_max):
    result = (val - in_min) * (out_max - out_min) / (in_max - in_min) + out_min
    return max(out_min, min(out_max, result))
