from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User
from app.models.audit import Notification
from uuid import UUID

async def create_notification(
    db: AsyncSession,
    user_id: UUID,
    message: str,
    notification_type: str
) -> Notification:
    """
    Creates an in-app notification in Postgres.
    """
    notification = Notification(
        user_id=user_id,
        message=message,
        type=notification_type,
        read=False
    )
    db.add(notification)
    await db.commit()
    return notification

async def broadcast_status_change(
    db: AsyncSession,
    proposal_id: UUID,
    planner_email: str,
    old_status: str,
    new_status: str,
    remarks: str = None
) -> None:
    """
    Notify the planner of an admin approval / rejection / revision request.
    Also mocks sending an official notification email.
    """
    # 1. Resolve planner user ID from email
    result = await db.execute(select(User).where(User.email == planner_email))
    planner = result.scalars().first()
    
    if not planner:
        print(f"Error: User with email {planner_email} not found in database. Notification aborted.")
        return

    # 2. Formulate alert messaging
    remarks_text = f" Remarks: '{remarks}'" if remarks else ""
    msg = f"Proposal ID: {proposal_id} status updated from '{old_status.upper()}' to '{new_status.upper()}'.{remarks_text}"

    # 3. Create db notification entry
    await create_notification(
        db=db,
        user_id=planner.id,
        message=msg,
        notification_type="status_change"
    )

    # 4. Mock SMTP / SendGrid Email dispatch
    print(f"--- EMAIL NOTIFICATION DISPATCHED ---")
    print(f"To: {planner_email}")
    print(f"Subject: Road Excavation proposal status update - Greater Chennai Corporation")
    print(f"Message: Dear {planner.full_name},\n\n{msg}\n\nBest regards,\nGreater Chennai Corporation Team")
    print(f"--------------------------------------")
