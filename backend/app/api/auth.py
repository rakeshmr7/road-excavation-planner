from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.core.security import require_any_user
from app.models.user import User
from app.schemas.auth import UserResponse
from typing import List

router = APIRouter(tags=["Authentication"])

@router.get("/config")
async def get_auth_config():
    """
    Exposes public Supabase credentials for frontend client initialization.
    """
    from app.core.config import settings
    return {
        "supabase_url": settings.SUPABASE_URL,
        "supabase_anon_key": settings.SUPABASE_ANON_KEY
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(require_any_user)):
    """
    Fetch the currently logged-in user profile details (synchronized from Supabase).
    """
    return current_user

@router.get("/roads", response_model=List[str])
async def get_chennai_roads(db: AsyncSession = Depends(get_db)):
    """
    Retrieve the official reference list of Greater Chennai Corporation roads.
    """
    from sqlalchemy import text
    result = await db.execute(text("SELECT name FROM chennai_roads ORDER BY name ASC"))
    roads = [row[0] for row in result.fetchall()]
    return roads
