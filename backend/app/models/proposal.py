from sqlalchemy import Column, String, Date, Numeric, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import UserDefinedType
from app.core.database import Base

# Custom spatial type for PostGIS integration
class Geometry(UserDefinedType):
    def get_col_spec(self, **kw):
        return "GEOMETRY(Geometry, 4326)"

class Proposal(Base):
    __tablename__ = "proposals"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    road_name = Column(String(255), nullable=False)
    purpose = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    priority = Column(String(50), nullable=False)  # 'low', 'medium', 'high', 'emergency'
    status = Column(String(50), nullable=False, default="pending")  # 'pending', 'approved', 'rejected', 'completed', 'cancelled', 'revision'
    department = Column(String(100), nullable=False)  # 'water', 'electricity', 'gas', 'telecom'
    contact_name = Column(String(255), nullable=False)
    contact_mobile = Column(String(50), nullable=False)
    contact_email = Column(String(255), nullable=False)
    estimated_budget = Column(Numeric(15, 2), nullable=False)
    contractor = Column(String(255), nullable=False)
    excavation_method = Column(String(100), nullable=False)
    utility_type = Column(String(100), nullable=False)
    expected_traffic_diversion = Column(String(50), nullable=False)  # 'none', 'minor', 'major', 'closed'
    risk_level = Column(String(50), nullable=False)  # 'low', 'medium', 'high', 'critical'
    geom = Column(Geometry, nullable=False)  # PostGIS geometry column
    length_m = Column(Numeric(10, 2), nullable=False)
    width_m = Column(Numeric(10, 2), nullable=False)
    area_sqm = Column(Numeric(10, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    documents = relationship("ProposalDocument", back_populates="proposal", cascade="all, delete-orphan")
    ai_analysis = relationship("AIAnalysis", back_populates="proposal", uselist=False, cascade="all, delete-orphan")

class ProposalDocument(Base):
    __tablename__ = "proposal_documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    proposal_id = Column(UUID(as_uuid=True), ForeignKey("proposals.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_type = Column(String(100), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    proposal = relationship("Proposal", back_populates="documents")
