from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Dict, Any, List, Optional

class AIAnalysisResponse(BaseModel):
    id: UUID
    proposal_id: UUID
    compliance_report: Dict[str, Any]
    duplicate_conflicts: Dict[str, Any]
    coordination_opportunities: Dict[str, Any]
    weather_analysis: Dict[str, Any]
    traffic_analysis: Dict[str, Any]
    public_impact_score: int
    risk_predicted: str
    explanation: str
    confidence_score: float
    recommendation: str
    executed_at: datetime

    class Config:
        from_attributes = True

class RAGQueryRequest(BaseModel):
    question: str

class SourceCitation(BaseModel):
    document_name: str
    page: Optional[int] = None
    excerpt: str

class RAGQueryResponse(BaseModel):
    answer: str
    sources: List[SourceCitation]

class PolicyResponse(BaseModel):
    id: UUID
    file_name: str
    file_path: str
    version: str
    uploaded_at: datetime
    active: bool

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: UUID
    user_id: UUID
    action: str
    timestamp: datetime
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    ip_address: str

    class Config:
        from_attributes = True
