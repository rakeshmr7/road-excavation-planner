import json
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, delete, text
from app.core.database import get_db
from app.core.security import require_planner, require_any_user, get_current_user
from app.models.user import User
from app.models.proposal import Proposal, ProposalDocument
from app.models.ai import AIAnalysis
from app.schemas.proposal import ProposalCreate, ProposalResponse, ProposalUpdateStatus
from app.schemas.ai import AIAnalysisResponse
from app.services.ai_pipeline import trigger_ai_pipeline
from app.utils.audit_log import log_action
from typing import List, Optional
from uuid import UUID

router = APIRouter(tags=["Proposals"])

@router.post("", response_model=ProposalResponse, status_code=status.HTTP_201_CREATED)
async def create_proposal(
    proposal_in: ProposalCreate,
    background_tasks: BackgroundTasks,
    request: Request,
    current_user: User = Depends(require_planner),
    db: AsyncSession = Depends(get_db)
):
    # Verify the road name exists in our reference roads list
    road_check = await db.execute(
        text("SELECT COUNT(*) FROM chennai_roads WHERE LOWER(name) = :road_name"),
        {"road_name": proposal_in.road_name.lower()}
    )
    if road_check.scalar() == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Road Name: '{proposal_in.road_name}'. Must select a valid Chennai road."
        )

    # Prepare PostGIS Geometry using raw SQL functions for safety and reliability
    geojson_str = json.dumps(proposal_in.geom)
    geom_expression = func.ST_SetSRID(func.ST_GeomFromGeoJSON(geojson_str), 4326)

    # Instantiate proposal database model
    proposal = Proposal(
        road_name=proposal_in.road_name,
        purpose=proposal_in.purpose,
        description=proposal_in.description,
        start_date=proposal_in.start_date,
        end_date=proposal_in.end_date,
        priority=proposal_in.priority,
        status="pending",
        department=current_user.department,
        contact_name=proposal_in.contact_name,
        contact_mobile=proposal_in.contact_mobile,
        contact_email=proposal_in.contact_email,
        estimated_budget=proposal_in.estimated_budget,
        contractor=proposal_in.contractor,
        excavation_method=proposal_in.excavation_method,
        utility_type=proposal_in.utility_type,
        expected_traffic_diversion=proposal_in.expected_traffic_diversion,
        risk_level=proposal_in.risk_level,
        geom=geom_expression,
        length_m=proposal_in.length_m,
        width_m=proposal_in.width_m,
        area_sqm=proposal_in.area_sqm
    )
    
    db.add(proposal)
    await db.commit()
    await db.refresh(proposal)

    # Fetch geometry back as geojson dict for serializer response
    geom_json_query = await db.execute(
        select(func.ST_AsGeoJSON(Proposal.geom)).where(Proposal.id == proposal.id)
    )
    geom_json_str = geom_json_query.scalar()
    geom_dict = json.loads(geom_json_str) if geom_json_str else proposal_in.geom

    # Log action in audit trails
    new_value_log = json.loads(proposal_in.model_dump_json())
    new_value_log['id'] = str(proposal.id)
    await log_action(
        db=db,
        user_id=current_user.id,
        action="CREATE_PROPOSAL",
        ip_address=request.client.host if request.client else "127.0.0.1",
        new_value=new_value_log
    )

    # Setup async background task to run the 10-Agent AI pipeline
    background_tasks.add_task(trigger_ai_pipeline, proposal.id)

    # Construct the response
    response_data = ProposalResponse(
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
    return response_data

@router.get("", response_model=List[ProposalResponse])
async def list_proposals(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    department: Optional[str] = None,
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Proposal)
    conditions = []
    if status:
        conditions.append(Proposal.status == status)
    if priority:
        conditions.append(Proposal.priority == priority)
    if department:
        conditions.append(Proposal.department == department)
        
    if conditions:
        query = query.where(and_(*conditions))
        
    query = query.order_by(Proposal.created_at.desc())
    result = await db.execute(query)
    proposals = result.scalars().all()
    
    response_list = []
    for prop in proposals:
        geom_json_query = await db.execute(
            select(func.ST_AsGeoJSON(Proposal.geom)).where(Proposal.id == prop.id)
        )
        geom_json_str = geom_json_query.scalar()
        geom_dict = json.loads(geom_json_str) if geom_json_str else {}
        
        response_list.append(
            ProposalResponse(
                id=prop.id,
                road_name=prop.road_name,
                purpose=prop.purpose,
                description=prop.description,
                start_date=prop.start_date,
                end_date=prop.end_date,
                priority=prop.priority,
                status=prop.status,
                department=prop.department,
                contact_name=prop.contact_name,
                contact_mobile=prop.contact_mobile,
                contact_email=prop.contact_email,
                estimated_budget=float(prop.estimated_budget),
                contractor=prop.contractor,
                excavation_method=prop.excavation_method,
                utility_type=prop.utility_type,
                expected_traffic_diversion=prop.expected_traffic_diversion,
                risk_level=prop.risk_level,
                geom=geom_dict,
                length_m=float(prop.length_m),
                width_m=float(prop.width_m),
                area_sqm=float(prop.area_sqm),
                created_at=prop.created_at,
                updated_at=prop.updated_at,
                documents=[]
            )
        )
    return response_list

@router.get("/{id}", response_model=ProposalResponse)
async def get_proposal(
    id: UUID,
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Proposal).where(Proposal.id == id)
    result = await db.execute(query)
    prop = result.scalars().first()
    if not prop:
        raise HTTPException(status_code=404, detail="Proposal not found")
        
    geom_json_query = await db.execute(
        select(func.ST_AsGeoJSON(Proposal.geom)).where(Proposal.id == prop.id)
    )
    geom_json_str = geom_json_query.scalar()
    geom_dict = json.loads(geom_json_str) if geom_json_str else {}
    
    return ProposalResponse(
        id=prop.id,
        road_name=prop.road_name,
        purpose=prop.purpose,
        description=prop.description,
        start_date=prop.start_date,
        end_date=prop.end_date,
        priority=prop.priority,
        status=prop.status,
        department=prop.department,
        contact_name=prop.contact_name,
        contact_mobile=prop.contact_mobile,
        contact_email=prop.contact_email,
        estimated_budget=float(prop.estimated_budget),
        contractor=prop.contractor,
        excavation_method=prop.excavation_method,
        utility_type=prop.utility_type,
        expected_traffic_diversion=prop.expected_traffic_diversion,
        risk_level=prop.risk_level,
        geom=geom_dict,
        length_m=float(prop.length_m),
        width_m=float(prop.width_m),
        area_sqm=float(prop.area_sqm),
        created_at=prop.created_at,
        updated_at=prop.updated_at,
        documents=[]
    )

@router.get("/{id}/ai-analysis", response_model=AIAnalysisResponse)
async def get_proposal_ai_analysis(
    id: UUID,
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(AIAnalysis).where(AIAnalysis.proposal_id == id)
    result = await db.execute(query)
    analysis = result.scalars().first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis

@router.post("/{id}/ai-analysis", response_model=AIAnalysisResponse)
async def trigger_proposal_ai_analysis(
    id: UUID,
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Manually trigger the 10-Agent AI analysis pipeline for the proposal.
    """
    query = select(Proposal).where(Proposal.id == id)
    result = await db.execute(query)
    proposal = result.scalars().first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")
        
    try:
        await trigger_ai_pipeline(proposal_id=id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI Pipeline execution failed: {str(e)}"
        )
    
    # Fetch the newly generated analysis
    ai_query = select(AIAnalysis).where(AIAnalysis.proposal_id == id)
    ai_result = await db.execute(ai_query)
    analysis = ai_result.scalars().first()
    if not analysis:
        raise HTTPException(status_code=500, detail="AI analysis completed but not found in database.")
    return analysis

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_proposal(
    id: UUID,
    request: Request,
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Proposal).where(Proposal.id == id)
    result = await db.execute(query)
    prop = result.scalars().first()
    
    if not prop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found"
        )
        
    # Enforce RBAC + Ownership
    # Planners can only delete their own department's proposals, Admins can delete any
    if current_user.role != "admin":
        if prop.department != current_user.department:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Planners can only delete proposals matching their department."
            )
        if prop.status != "rejected":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Planners can only delete proposals that are rejected."
            )

    # Only allow deletion if the project is approved, cancelled, or pending (can delete approved project as per requirements)
    old_value_log = {
        "id": str(prop.id),
        "road_name": prop.road_name,
        "department": prop.department,
        "status": prop.status
    }
    
    await db.delete(prop)
    await db.commit()
    
    await log_action(
        db=db,
        user_id=current_user.id,
        action="DELETE_PROPOSAL",
        ip_address=request.client.host if request.client else "127.0.0.1",
        old_value=old_value_log
    )

@router.put("/{id}", response_model=ProposalResponse)
async def update_proposal(
    id: UUID,
    proposal_in: ProposalCreate,
    background_tasks: BackgroundTasks,
    request: Request,
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Proposal).where(Proposal.id == id)
    result = await db.execute(query)
    proposal = result.scalars().first()
    
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found"
        )
        
    # Enforce RBAC + Ownership
    if current_user.role != "admin":
        if proposal.department != current_user.department:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Planners can only update proposals matching their department."
            )
        if proposal.status != "revision":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Planners can only update proposals marked for revision."
            )

    road_check = await db.execute(
        text("SELECT COUNT(*) FROM chennai_roads WHERE LOWER(name) = :road_name"),
        {"road_name": proposal_in.road_name.lower()}
    )
    if road_check.scalar() == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Road Name: '{proposal_in.road_name}'. Must select a valid Chennai road."
        )

    old_val = {
        "id": str(proposal.id),
        "road_name": proposal.road_name,
        "purpose": proposal.purpose,
        "status": proposal.status
    }

    # Update fields
    proposal.road_name = proposal_in.road_name
    proposal.purpose = proposal_in.purpose
    proposal.description = proposal_in.description
    proposal.start_date = proposal_in.start_date
    proposal.end_date = proposal_in.end_date
    proposal.priority = proposal_in.priority
    proposal.status = "pending"  # Reset status back to pending upon revision resubmission
    proposal.contact_name = proposal_in.contact_name
    proposal.contact_mobile = proposal_in.contact_mobile
    proposal.contact_email = proposal_in.contact_email
    proposal.estimated_budget = proposal_in.estimated_budget
    proposal.contractor = proposal_in.contractor
    proposal.excavation_method = proposal_in.excavation_method
    proposal.utility_type = proposal_in.utility_type
    proposal.expected_traffic_diversion = proposal_in.expected_traffic_diversion
    proposal.risk_level = proposal_in.risk_level
    proposal.length_m = proposal_in.length_m
    proposal.width_m = proposal_in.width_m
    proposal.area_sqm = proposal_in.area_sqm

    geojson_str = json.dumps(proposal_in.geom)
    proposal.geom = func.ST_SetSRID(func.ST_GeomFromGeoJSON(geojson_str), 4326)

    await db.commit()
    await db.refresh(proposal)

    await log_action(
        db=db,
        user_id=current_user.id,
        action="UPDATE_PROPOSAL",
        ip_address=request.client.host if request.client else "127.0.0.1",
        old_value=old_val,
        new_value=json.loads(proposal_in.model_dump_json())
    )

    # Re-trigger pipeline
    background_tasks.add_task(trigger_ai_pipeline, proposal.id)

    geom_json_query = await db.execute(
        select(func.ST_AsGeoJSON(Proposal.geom)).where(Proposal.id == proposal.id)
    )
    geom_json_str = geom_json_query.scalar()
    geom_dict = json.loads(geom_json_str) if geom_json_str else proposal_in.geom

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

@router.get("/{id}/similar-projects")
async def get_similar_historical_projects(
    id: UUID,
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves previous Chennai road excavation projects using vector similarity searches
    against description data in ChromaDB, showcasing outcomes and lessons learned.
    """
    query = select(Proposal).where(Proposal.id == id)
    result = await db.execute(query)
    proposal = result.scalars().first()
    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Proposal with ID {id} not found."
        )
    
    from app.services.rag_service import retrieve_similar_projects
    similar_list = await retrieve_similar_projects(description=proposal.description)
    return similar_list

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

security_scheme_optional = HTTPBearer(auto_error=False)

@router.get("/{id}/download-report")
async def download_proposal_report(
    id: UUID,
    token: Optional[str] = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate and stream the official GCC Road Excavation Permit report as a PDF.
    """
    # 1. Resolve token from header or query param
    active_token = None
    if credentials:
        active_token = credentials.credentials
    elif token:
        active_token = token
        
    if not active_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
        
    # 2. Authenticate the active token manually
    from app.core.security import get_current_user
    try:
        auth_creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=active_token)
        current_user = await get_current_user(credentials=auth_creds, db=db)
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}"
        )

    # 3. Retrieve proposal
    query = select(Proposal).where(Proposal.id == id)
    result = await db.execute(query)
    proposal = result.scalars().first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    ai_query = select(AIAnalysis).where(AIAnalysis.proposal_id == id)
    ai_result = await db.execute(ai_query)
    ai_analysis = ai_result.scalars().first()
    if not ai_analysis:
        raise HTTPException(
            status_code=400, 
            detail="AI analysis report is not yet completed for this proposal."
        )

    from app.utils.pdf_generator import generate_permit_pdf
    from fastapi.responses import StreamingResponse
    pdf_buffer = generate_permit_pdf(proposal, ai_analysis)
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=GCC_Permit_Report_{id}.pdf"}
    )
