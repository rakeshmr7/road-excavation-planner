from sqlalchemy import Column, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # 'admin' or 'planner'
    department = Column(String(100), nullable=False)  # 'water', 'electricity', 'gas', 'telecom', 'admin'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
