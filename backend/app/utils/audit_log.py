from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog
from typing import Any, Dict, Optional
from uuid import UUID

async def log_action(
    db: AsyncSession,
    user_id: UUID,
    action: str,
    ip_address: str,
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None
) -> None:
    """
    Asynchronously write an audit entry tracking administrative or user activity.
    """
    audit = AuditLog(
        user_id=user_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip_address
    )
    db.add(audit)
    await db.commit()
