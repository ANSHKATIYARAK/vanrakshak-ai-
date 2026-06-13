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
