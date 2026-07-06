from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import date, datetime
from uuid import UUID
from typing import Any, Dict, Optional, List

class ProposalBase(BaseModel):
    road_name: str
    purpose: str
    description: str
    start_date: date
    end_date: date
    priority: str = Field(..., description="low | medium | high | emergency")
    contact_name: str
    contact_mobile: str
    contact_email: EmailStr
    estimated_budget: float
    contractor: str
    excavation_method: str
    utility_type: str
    expected_traffic_diversion: str = Field(..., description="none | minor | major | closed")
    risk_level: str = Field(..., description="low | medium | high | critical")
    geom: Dict[str, Any] = Field(..., description="GeoJSON Geometry object")
    length_m: float
    width_m: float
    area_sqm: float

    @field_validator('priority')
    @classmethod
    def validate_priority(cls, v: str) -> str:
        if v not in ('low', 'medium', 'high', 'emergency'):
            raise ValueError("Priority must be: low, medium, high, emergency")
        return v

    @field_validator('expected_traffic_diversion')
    @classmethod
    def validate_traffic(cls, v: str) -> str:
        if v not in ('none', 'minor', 'major', 'closed'):
            raise ValueError("Traffic diversion must be: none, minor, major, closed")
        return v

    @field_validator('risk_level')
    @classmethod
    def validate_risk(cls, v: str) -> str:
        if v not in ('low', 'medium', 'high', 'critical'):
            raise ValueError("Risk level must be: low, medium, high, critical")
        return v

    @field_validator('geom')
    @classmethod
    def validate_geojson(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        if 'type' not in v or 'coordinates' not in v:
            raise ValueError("Invalid GeoJSON geometry representation. Must include 'type' and 'coordinates'")
        if v['type'] not in ('Point', 'LineString', 'Polygon', 'MultiPolygon'):
            raise ValueError("Unsupported spatial type. Must be Point, LineString, Polygon, or MultiPolygon")
        return v

class ProposalCreate(ProposalBase):
    pass

class ProposalUpdateStatus(BaseModel):
    status: str
    remarks: Optional[str] = None

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in ('pending', 'approved', 'rejected', 'completed', 'cancelled', 'revision'):
            raise ValueError("Invalid status update")
        return v

class ProposalDocumentResponse(BaseModel):
    id: UUID
    file_name: str
    file_path: str
    file_type: str
    created_at: datetime

    class Config:
        from_attributes = True

class ProposalResponse(ProposalBase):
    id: UUID
    status: str
    department: str
    created_at: datetime
    updated_at: datetime
    documents: List[ProposalDocumentResponse] = []

    class Config:
        from_attributes = True
