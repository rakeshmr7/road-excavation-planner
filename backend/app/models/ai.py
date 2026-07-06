from sqlalchemy import Column, String, Integer, Numeric, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base

class AIAnalysis(Base):
    __tablename__ = "ai_analyses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), unique=True, nullable=False)
    compliance_report = Column(JSONB, nullable=False)
    duplicate_conflicts = Column(JSONB, nullable=False)
    coordination_opportunities = Column(JSONB, nullable=False)
    weather_analysis = Column(JSONB, nullable=False)
    traffic_analysis = Column(JSONB, nullable=False)
    public_impact_score = Column(Integer, nullable=False)
    risk_predicted = Column(String(50), nullable=False)  # 'low', 'medium', 'high', 'critical'
    explanation = Column(Text, nullable=False)
    confidence_score = Column(Numeric(5, 2), nullable=False)
    recommendation = Column(String(50), nullable=False)  # 'approve', 'approve_conditions', 'reject', 'manual_review'
    executed_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    proposal = relationship("Proposal", back_populates="ai_analysis")

class Policy(Base):
    __tablename__ = "policies"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    version = Column(String(50), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    active = Column(Boolean, default=True)
