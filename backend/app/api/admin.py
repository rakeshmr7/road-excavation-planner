import os
import shutil
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from app.core.config import settings
from app.core.database import get_db
from app.core.security import require_admin
from app.models.user import User
from app.models.proposal import Proposal
from app.models.ai import Policy
from app.models.audit import AuditLog
from app.schemas.auth import PlannerCreate, UserResponse
from app.schemas.proposal import ProposalResponse, ProposalUpdateStatus
from app.schemas.ai import PolicyResponse, AuditLogResponse
from app.utils.audit_log import log_action
from app.services.rag_service import index_policy_document, remove_policy_document
from app.services.notification import broadcast_status_change
from supabase import create_client, Client
from typing import List

router = APIRouter(tags=["Admin Operations"])

# Initialize Supabase Admin client if credentials exist
supabase_admin: Client = None
if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
    try:
        supabase_admin = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
    except Exception as e:
        print(f"Supabase Admin Client initialization warning: {e}")

@router.post("/planners", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_planner(
    planner_in: PlannerCreate,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin registers a new planner account in Supabase Auth and mirrors it in the database.
    """
    if not supabase_admin:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase credentials not configured. Cannot provision planner accounts in Auth server."
        )

    # 1. Check if email already exists in local db to prevent duplicate accounts
    existing_user = await db.execute(select(User).where(User.email == planner_in.email))
    if existing_user.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists."
        )

    # 2. Register user in Supabase Auth via Admin Client bypass
    try:
        auth_response = supabase_admin.auth.admin.create_user({
            "email": planner_in.email,
            "password": planner_in.password,
            "email_confirm": True,
            "user_metadata": {
                "full_name": planner_in.full_name,
                "role": "planner",
                "department": planner_in.department
            }
        })
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create user in Supabase Auth: {str(e)}"
        )

    auth_user = auth_response.user
    if not auth_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Supabase Auth returned an empty user response."
        )

    # 3. Save User to local database
    new_user = User(
        id=uuid.UUID(auth_user.id),
        email=planner_in.email,
        full_name=planner_in.full_name,
        role="planner",
        department=planner_in.department
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # 4. Audit Log action
    await log_action(
        db=db,
        user_id=current_user.id,
        action="REGISTER_PLANNER",
        ip_address=request.client.host if request.client else "127.0.0.1",
        new_value={"id": auth_user.id, "email": planner_in.email, "department": planner_in.department}
    )

    return new_user

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin lists all mirrored planner and admin accounts from the local database.
    """
    result = await db.execute(select(User).order_by(User.full_name.asc()))
    users = result.scalars().all()
    return users

@router.post("/proposals/{id}/decision", response_model=ProposalResponse)
async def update_proposal_status(
    id: uuid.UUID,
    decision_in: ProposalUpdateStatus,
    request: Request,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Admin decides on a pending proposal (Approve / Reject / Return for Revision).
    """
    query = select(Proposal).where(Proposal.id == id)
    result = await db.execute(query)
    proposal = result.scalars().first()

    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found"
        )

    old_status = proposal.status
    old_value_log = {"id": str(proposal.id), "status": old_status}

    proposal.status = decision_in.status
    await db.commit()
    await db.refresh(proposal)

    # Sync admin decision in ChromaDB RAG
    try:
        from app.services.rag_service import index_proposal_in_rag
        await index_proposal_in_rag(proposal_id=proposal.id, remarks=decision_in.remarks, db_session=db)
    except Exception as rag_err:
        print(f"Admin Decision Warning: RAG indexing failed for proposal {proposal.id}: {rag_err}")

    # Log action in audit logs
    new_value_log = {"id": str(proposal.id), "status": proposal.status, "remarks": decision_in.remarks}
    await log_action(
        db=db,
        user_id=current_user.id,
        action="DECIDE_PROPOSAL",
        ip_address=request.client.host if request.client else "127.0.0.1",
        old_value=old_value_log,
        new_value=new_value_log
    )

    # Broadcast notification to the specific Planner
    await broadcast_status_change(
        db=db,
        proposal_id=proposal.id,
        planner_email=proposal.contact_email,
        old_status=old_status,
        new_status=proposal.status,
        remarks=decision_in.remarks
    )

    # Resolve geometry back as GeoJSON
    from sqlalchemy import func
    import json
    geom_json_query = await db.execute(
        select(func.ST_AsGeoJSON(Proposal.geom)).where(Proposal.id == proposal.id)
    )
    geom_json_str = geom_json_query.scalar()
    geom_dict = json.loads(geom_json_str) if geom_json_str else {}

    return ProposalResponse(
        id=proposal.id,
        road_name=proposal.road_name,
        purpose=proposal.purpose,
        description=proposal.description,
        start_date=proposal.start_date,
        end_date=proposal.end_date,
        priority=proposal.priority,
        status=proposal.status,
        department=proposal.department,
        contact_name=proposal.contact_name,
        contact_mobile=proposal.contact_mobile,
        contact_email=proposal.contact_email,
        estimated_budget=float(proposal.estimated_budget),
        contractor=proposal.contractor,
        excavation_method=proposal.excavation_method,
        utility_type=proposal.utility_type,
        expected_traffic_diversion=proposal.expected_traffic_diversion,
        risk_level=proposal.risk_level,
        geom=geom_dict,
        length_m=float(proposal.length_m),
        width_m=float(proposal.width_m),
        area_sqm=float(proposal.area_sqm),
        created_at=proposal.created_at,
        updated_at=proposal.updated_at,
        documents=[]
    )

@router.get("/policies", response_model=List[PolicyResponse])
async def list_policies(
    db: AsyncSession = Depends(get_db)
):
    """
    List all active municipal circulars and policy documents in the database.
    """
    result = await db.execute(select(Policy).order_by(Policy.uploaded_at.desc()))
    policies = result.scalars().all()
    return policies

@router.post("/policies", response_model=PolicyResponse, status_code=status.HTTP_201_CREATED)
async def upload_policy(
    version: str,
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a government policy document (PDF/DOCX), save it, and index it in the ChromaDB RAG Vector Store.
    """
    file_extension = file.filename.split(".")[-1].lower()
    if file_extension not in ["pdf", "docx", "jpg", "jpeg", "png", "tiff"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Only PDF, DOCX, and image formats (JPG, JPEG, PNG, TIFF) allowed."
        )

    # Save policy local directory
    upload_dir = "./storage/policies"
    os.makedirs(upload_dir, exist_ok=True)
    
    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = os.path.join(upload_dir, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Insert metadata in database
    policy = Policy(
        file_name=file.filename,
        file_path=file_path,
        version=version,
        active=True
    )
    db.add(policy)
    await db.commit()
    await db.refresh(policy)

    # Trigger async chunking and indexing in vector database (ChromaDB)
    try:
        await index_policy_document(policy_id=policy.id, file_path=file_path)
    except Exception as e:
        # Rollback db insert if vector index fails
        await db.delete(policy)
        await db.commit()
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to vector index document: {str(e)}"
        )
    return policy

@router.delete("/policies/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_policy(
    id: uuid.UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Remove a policy document metadata from Postgres and purge its vectors from ChromaDB.
    """
    result = await db.execute(select(Policy).where(Policy.id == id))
    policy = result.scalars().first()

    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Policy document not found."
        )

    # Remove vector database chunk associations
    try:
        await remove_policy_document(policy_id=policy.id)
    except Exception as e:
        print(f"Warning: Vector removal failed: {e}")

    # Remove file from local storage
    try:
        if os.path.exists(policy.file_path):
            os.remove(policy.file_path)
    except Exception as e:
        print(f"Warning: Failed to delete local storage file {policy.file_path}: {e}")

    # Delete policy metadata row
    await db.delete(policy)
    await db.commit()

@router.get("/audit-logs", response_model=List[AuditLogResponse])
async def list_audit_logs(
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    List all administrative actions and user activities in the digital audit trail.
    """
    result = await db.execute(select(AuditLog).order_by(AuditLog.timestamp.desc()))
    logs = result.scalars().all()
    return logs
