import asyncio
import random
import time
import math
from datetime import datetime
from .database import SessionLocal
from . import models

def generate_stable_nodes():
    nodes = {}
    rng = random.Random(42)  # Fixed seed for stable demo coordinates
    for i in range(1, 43):
        node_id = f"VX-{str(i).zfill(2)}"
        angle = i * (2 * 3.14159265 / 42)
        # 3 concentric rings of nodes
        ring = (i % 3) + 1
        r = 0.0012 * ring + rng.uniform(-0.0002, 0.0002)
        
        # Centered around PR-04 biotope (24.123, 78.234)
        lat = 24.123 + r * math.cos(angle)
        lng = 78.234 + r * math.sin(angle)
        
        nodes[node_id] = {
            "id": node_id,
            "lat": round(lat, 6),
            "lng": round(lng, 6),
            "battery": rng.randint(88, 100),
            "status": "active"
        }
    return nodes

class EcoSimulator:
    def __init__(self, manager):
        self.manager = manager
        
        # Threat equation weights (Institutional Standard)
        self.alpha = 0.4 # Acoustic
        self.beta = 0.25 # Vibration
        self.gamma = 0.25 # Eco silence
        self.delta = 0.1 # Historical risk
        
        # State variables (normalized 0.0 - 1.0)
        self.acoustic_anomaly = 0.02
        self.vibration_anomaly = 0.01
        self.ecological_silence = 0.05
        self.historical_risk = 0.12
        
        self.threat_score = 0.0
        self.prev_threat_score = 0.0
        self.state = "STABLE"
        
        # Forest Integrity Variables (0-100)
        self.biodiversity = 96.4
        self.node_vitality = 99.8
        self.eco_stability = 94.2
        self.security_state = 100.0
        
        self.integrity_score = 98.0
        
        self.event_active = False
        self.event_timer = 0
        self.event_type = None # "ACOUSTIC_ENTROPY", "BSI_DEVIATION", etc.
        
        self.node_positions = generate_stable_nodes()
        self.nodes = list(self.node_positions.keys())
        self.telemetry_queue = []

    def add_log(self, msg):
        timestamp = datetime.now().strftime("[%H:%M:%S]")
        self.telemetry_queue.append(f"{timestamp} {msg}")
        if len(self.telemetry_queue) > 50:
            self.telemetry_queue.pop(0)

    def calculate_threat(self):
        # Tn+1 = aA + bV + gE + dH
        self.prev_threat_score = self.threat_score
        self.threat_score = (self.alpha * self.acoustic_anomaly + 
                             self.beta * self.vibration_anomaly + 
                             self.gamma * self.ecological_silence + 
                             self.delta * self.historical_risk)
        
        # Clamp and rounding for institutional precision
        self.threat_score = round(max(0.0, min(1.0, self.threat_score)), 4)
        
        # Continuous State Logic
        if self.threat_score < 0.20:
            new_state = "STABLE"
        elif self.threat_score < 0.45:
            new_state = "ANALYSIS"
        elif self.threat_score < 0.70:
            new_state = "ESCALATED"
        else:
            new_state = "CRITICAL"
            
        if new_state != self.state:
            prev_state = self.state
            self.state = new_state
            if new_state == "ANALYSIS":
                self.add_log(f"System transitioning to ANALYSIS mode (T={self.threat_score})")
            elif new_state == "ESCALATED":
                self.add_log(f"ALERT: Significant ecological divergence in Sector D-4")
            elif new_state == "CRITICAL":
                self.add_log(f"CRITICAL: Biotope integrity failure imminent. TDOA localization locked.")
            elif new_state == "STABLE" and prev_state != "STABLE":
                self.add_log("System state restored to STABLE nominal parameters")

    def calculate_integrity(self):
        # F = 0.3B + 0.25N + 0.25E + 0.2S
        self.security_state = round(max(0.0, 100.0 - (self.threat_score * 100)), 2)
        f_score = (0.3 * self.biodiversity + 
                   0.25 * self.node_vitality + 
                   0.25 * self.eco_stability + 
                   0.2 * self.security_state)
        self.integrity_score = round(max(0.0, min(100.0, f_score)), 2)
        return self.integrity_score

    def generate_bsi_waveform(self):
        # Bioacoustic Soundscape Index simulator
        base = 0.8 - (self.ecological_silence * 0.6)
        noise = random.uniform(-0.05, 0.05)
        
        if self.state == "CRITICAL":
            # Flattened waveform with high-frequency spikes (mechanical interference)
            spike = 0.9 if random.random() < 0.1 else 0.0
            return (base * 0.3) + noise + spike
        elif self.state == "ESCALATED":
            # Significant drop in biophony
            return (base * 0.6) + noise
        else:
            # Rich biophony
            return base + noise

    async def run(self):
        self.add_log("VanRakshak-X Operational Intelligence Online")
        self.add_log("Environment: Tropical Semi-Deciduous (Sector PR-04)")
        self.add_log("Mesh: 42 Nodes Synced (LoRa Tier-1 Topology)")
        
        while True:
            # Probabilistic Environmental Escalation
            if not self.event_active and random.random() < 0.03:
                self.event_active = True
                self.event_timer = random.randint(40, 80)
                self.event_type = random.choice(["ACOUSTIC", "VIBRATION", "ECO_SILENCE"])
                self.target_node = random.choice(self.nodes)
                
                # Update status of target and neighbors in simulator memory
                self.node_positions[self.target_node]["status"] = "alert"
                
                # Sort nodes by distance to find neighbors
                t_lat = self.node_positions[self.target_node]["lat"]
                t_lng = self.node_positions[self.target_node]["lng"]
                sorted_nodes = sorted(
                    self.node_positions.values(),
                    key=lambda n: (n["lat"] - t_lat)**2 + (n["lng"] - t_lng)**2
                )
                # Set nearest 2 neighbors to alert as well
                self.alert_neighbors = [n["id"] for n in sorted_nodes[1:3]]
                for n_id in self.alert_neighbors:
                    self.node_positions[n_id]["status"] = "alert"
                
                if self.event_type == "ACOUSTIC":
                    self.add_log(f"{self.target_node} detected anomalous acoustic entropy divergence")
                elif self.event_type == "VIBRATION":
                    self.add_log(f"Sub-canopy vibration threshold breach near {self.target_node}")
                elif self.event_type == "ECO_SILENCE":
                    self.add_log(f"BSI deviation threshold crossed: ecological silence detected in {self.target_node} radius")
                
                # Write alert to database
                db = SessionLocal()
                try:
                    # Mark nodes as alert in DB
                    for n_id in [self.target_node] + self.alert_neighbors:
                        db_node = db.query(models.Node).filter(models.Node.id == n_id).first()
                        if db_node:
                            db_node.status = "alert"
                    
                    # Create Alert
                    new_alert = models.Alert(
                        node_id=self.target_node,
                        threat_type=self.event_type.lower(),
                        confidence=round(random.uniform(0.78, 0.96), 2),
                        threat_score=round(self.threat_score, 4),
                        resolved=False
                    )
                    db.add(new_alert)
                    db.commit()
                except Exception as e:
                    print(f"Error seeding simulator alert to DB: {e}")
                finally:
                    db.close()

            # Physics Update
            if self.event_active:
                self.event_timer -= 1
                
                # Gradual Escalation driven by event type
                inc = random.uniform(0.005, 0.015)
                if self.event_type == "ACOUSTIC":
                    self.acoustic_anomaly = min(1.0, self.acoustic_anomaly + inc * 1.5)
                    self.vibration_anomaly = min(1.0, self.vibration_anomaly + inc * 0.5)
                elif self.event_type == "VIBRATION":
                    self.vibration_anomaly = min(1.0, self.vibration_anomaly + inc * 1.5)
                    self.historical_risk = min(1.0, self.historical_risk + inc * 0.2)
                elif self.event_type == "ECO_SILENCE":
                    self.ecological_silence = min(1.0, self.ecological_silence + inc * 2.0)
                    self.biodiversity = max(40.0, self.biodiversity - inc * 10)
                
                self.eco_stability = max(30.0, self.eco_stability - inc * 5)
                
                # Slowly drain battery of alert nodes
                for n_id in [self.target_node] + getattr(self, 'alert_neighbors', []):
                    self.node_positions[n_id]["battery"] = max(0, self.node_positions[n_id]["battery"] - random.randint(1, 2))
                
                if self.event_timer <= 0:
                    self.event_active = False
                    
                    # Reset simulator node status
                    for n in self.node_positions.values():
                        n["status"] = "active"
                    
                    self.add_log("TDOA triangulation protocol concluded. Dispatching Sentinel Drone.")
                    
                    # Resolve alert in database
                    db = SessionLocal()
                    try:
                        # Reset node statuses in DB
                        for n_id in [self.target_node] + getattr(self, 'alert_neighbors', []):
                            db_node = db.query(models.Node).filter(models.Node.id == n_id).first()
                            if db_node:
                                db_node.status = "active"
                        
                        # Resolve active alerts for the target node
                        active_alerts = db.query(models.Alert).filter(
                            models.Alert.node_id == self.target_node,
                            models.Alert.resolved == False
                        ).all()
                        for alert in active_alerts:
                            alert.resolved = True
                        db.commit()
                    except Exception as e:
                        print(f"Error resolving simulator alerts in DB: {e}")
                    finally:
                        db.close()
            else:
                # Natural De-escalation (Entropic recovery)
                dec = random.uniform(0.002, 0.008)
                self.acoustic_anomaly = max(0.02, self.acoustic_anomaly - dec)
                self.vibration_anomaly = max(0.01, self.vibration_anomaly - dec)
                self.ecological_silence = max(0.05, self.ecological_silence - dec)
                self.historical_risk = max(0.12, self.historical_risk - dec * 0.1)
                
                self.biodiversity = min(96.4, self.biodiversity + dec * 2)
                self.eco_stability = min(94.2, self.eco_stability + dec * 3)

            self.calculate_threat()
            self.calculate_integrity()
            
            # Periodically write random telemetry to database (e.g. 8% chance per second)
            if random.random() < 0.08:
                telemetry_node = random.choice(self.nodes)
                db = SessionLocal()
                try:
                    new_tel = models.Telemetry(
                        node_id=telemetry_node,
                        temperature=round(random.uniform(22.0, 31.0), 1),
                        humidity=round(random.uniform(60.0, 95.0), 1),
                        battery_voltage=round(random.uniform(3.6, 4.2), 2)
                    )
                    db.add(new_tel)
                    
                    # Sync battery level in DB
                    db_node = db.query(models.Node).filter(models.Node.id == telemetry_node).first()
                    if db_node:
                        # Slightly drain battery on transmission
                        self.node_positions[telemetry_node]["battery"] = max(0, self.node_positions[telemetry_node]["battery"] - random.choice([0, 1]))
                        db_node.battery_level = self.node_positions[telemetry_node]["battery"]
                    db.commit()
                except Exception as e:
                    print(f"Error saving simulator telemetry to DB: {e}")
                finally:
                    db.close()

            # Intelligence Payload
            payload = {
                "type": "simulation_state",
                "data": {
                    "timestamp": time.time(),
                    "state": self.state,
                    "threat_score": self.threat_score,
                    "integrity_score": self.integrity_score,
                    "metrics": {
                        "biodiversity": round(self.biodiversity, 2),
                        "node_vitality": round(self.node_vitality, 2),
                        "eco_stability": round(self.eco_stability, 2),
                        "security_state": round(self.security_state, 2)
                    },
                    "telemetry": self.telemetry_queue[-10:],
                    "bsi_index": round(self.generate_bsi_waveform(), 3),
                    "mesh": {
                        "active": len([n for n in self.node_positions.values() if n["battery"] > 0]),
                        "latency": random.randint(18, 30) + int(self.threat_score * 40),
                        "routing_efficiency": round(0.98 - (self.threat_score * 0.1), 3),
                        "nodes": list(self.node_positions.values()) # Dynamic nodes list!
                    },
                    "localization": {
                        "lat": 24.123 + (random.uniform(-0.005, 0.005) * self.threat_score),
                        "lng": 78.234 + (random.uniform(-0.005, 0.005) * self.threat_score),
                        "confidence": round(self.threat_score * 100, 1),
                        "radius": max(5, 120 - int(self.threat_score * 110))
                    } if self.threat_score > 0.2 else None
                }
            }
            
            await self.manager.broadcast(payload)
            await asyncio.sleep(1.0)


