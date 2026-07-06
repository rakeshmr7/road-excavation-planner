from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime

class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    full_name: str
    role: str
    department: str
    created_at: datetime

    class Config:
        from_attributes = True

class PlannerCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    department: str = Field(..., description="water | electricity | gas | telecom")

    class Config:
        from_attributes = True
