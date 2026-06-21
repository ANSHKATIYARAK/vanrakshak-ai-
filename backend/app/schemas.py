from pydantic import BaseModel, field_validator
from datetime import datetime, timezone
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

    @field_validator('timestamp')
    @classmethod
    def make_utc(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v

    class Config:
        from_attributes = True

class AlertBase(BaseModel):
    threat_type: str
    confidence: float
    threat_score: float
    status: Optional[str] = "active"
    action_taken: Optional[str] = "none"

class AlertCreate(AlertBase):
    node_id: str

class Alert(AlertBase):
    id: int
    node_id: str
    timestamp: datetime
    resolved: bool

    @field_validator('timestamp')
    @classmethod
    def make_utc(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v

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

    @field_validator('last_seen')
    @classmethod
    def make_utc(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v is None:
            return None
        if v.tzinfo is None:
            return v.replace(tzinfo=timezone.utc)
        return v

    class Config:
        from_attributes = True

