from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Node(Base):
    __tablename__ = "nodes"

    id = Column(String, primary_key=True, index=True) # Node ID (e.g., "VR-001")
    name = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    battery_level = Column(Float, default=100.0)
    status = Column(String, default="active") # active, inactive, alert
    last_seen = Column(DateTime(timezone=True), onupdate=func.now())
    
    telemetry = relationship("Telemetry", back_populates="node")
    alerts = relationship("Alert", back_populates="node")

class Telemetry(Base):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String, ForeignKey("nodes.id"))
    temperature = Column(Float)
    humidity = Column(Float)
    battery_voltage = Column(Float)
    tilt = Column(Float, default=0.0)
    accel_x = Column(Float, default=0.0)
    accel_y = Column(Float, default=0.0)
    accel_z = Column(Float, default=9.81)
    vibration = Column(Float, default=0.0)
    audio_rms = Column(Float, default=0.0)
    audio_peak = Column(Float, default=0.0)
    rssi = Column(Integer, default=-120)
    packet_count = Column(Integer, default=0)
    uptime = Column(Integer, default=0)
    who_am_i = Column(Integer, default=0)
    lora_ver = Column(Integer, default=0)
    raw_samples = Column(String, default="[0,0,0,0,0]")
    mpu_status = Column(String, default="OFFLINE")
    mic_status = Column(String, default="OFFLINE")
    lora_status = Column(String, default="OFFLINE")
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    node = relationship("Node", back_populates="telemetry")

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String, ForeignKey("nodes.id"))
    threat_type = Column(String) # chainsaw, axe, intrusion
    confidence = Column(Float)
    threat_score = Column(Float)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    resolved = Column(Boolean, default=False)

    node = relationship("Node", back_populates="alerts")
