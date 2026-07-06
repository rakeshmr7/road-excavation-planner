import asyncio
import uuid
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.models.proposal import Proposal
from app.models.user import User
from app.models.ai import AIAnalysis
from app.utils.audit_log import log_action
from app.services.notification import broadcast_status_change

async def test_direct():
    print("--- DIRECT DECISION EXCEPTION TRACEBACK DIAGNOSTIC ---")
    async with AsyncSessionLocal() as db:
        # Get one proposal
        result = await db.execute(select(Proposal).limit(1))
        proposal = result.scalars().first()
        if not proposal:
            print("No proposals found in DB to run test.")
            return
            
        print(f"Testing Proposal ID: {proposal.id}")
        
        # Super admin user
        email = "admin@chennai.gov.in"
        result_user = await db.execute(select(User).where(User.email == email))
        admin = result_user.scalars().first()
        if not admin:
            admin_id = uuid.UUID("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11")
            # Create admin user if not exists
            admin = User(
                id=admin_id,
                email=email,
                full_name="Super Admin",
                role="admin",
                department="admin"
            )
            db.add(admin)
            await db.commit()
            print("Created Admin user in DB.")
        admin_id = admin.id

        old_status = proposal.status
        proposal.status = "revision"
        await db.commit()
        
        print("1. DB Commit successful.")
        
        # Try audit logging
        print("2. Trying log_action...")
        await log_action(
            db=db,
            user_id=admin_id,
            action="DECIDE_PROPOSAL",
            ip_address="127.0.0.1",
            old_value={"id": str(proposal.id), "status": old_status},
            new_value={"id": str(proposal.id), "status": proposal.status, "remarks": "Needs revisions"}
        )
        print("  -> log_action successful.")
        
        # Try broadcast status change
        print("3. Trying broadcast_status_change...")
        await broadcast_status_change(
            db=db,
            proposal_id=proposal.id,
            planner_email=proposal.contact_email,
            old_status=old_status,
            new_status=proposal.status,
            remarks="Needs revisions"
        )
        print("  -> broadcast_status_change successful.")
        print("--- ALL DIRECT DB TRANSACTIONS COMPLETED ---")

if __name__ == "__main__":
    asyncio.run(test_direct())
