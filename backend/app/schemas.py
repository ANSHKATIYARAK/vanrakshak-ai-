from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class TelemetryBase(BaseModel):
    temperature: float
    humidity: float
    battery_voltage: float

class TelemetryCreate(TelemetryBase):
    node_id: str

class Telemetry(TelemetryBase):
    id: int
    node_id: str
    timestamp: datetime

    class Config:
        from_attributes = True

class AlertBase(BaseModel):
    threat_type: str
    confidence: float
    threat_score: float

class AlertCreate(AlertBase):
    node_id: str

class Alert(AlertBase):
    id: int
    node_id: str
    timestamp: datetime
    resolved: bool

    class Config:
        from_attributes = True

class NodeBase(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float

class NodeCreate(NodeBase):
    pass

class Node(NodeBase):
    battery_level: float
    status: str
    last_seen: Optional[datetime]
    alerts: List[Alert] = []

    class Config:
        from_attributes = True
