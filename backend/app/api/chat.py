from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import require_any_user
from app.models.user import User
from app.schemas.ai import RAGQueryRequest, RAGQueryResponse
from app.services.rag_service import query_rag_knowledge_base, query_proposal_rag_knowledge_base
import uuid

router = APIRouter(tags=["AI Chat Assistant"])

@router.post("/ask", response_model=RAGQueryResponse)
async def ask_chat_assistant(
    query_in: RAGQueryRequest,
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit a policy question to the GCC RAG knowledge base. 
    Returns natural language answers citing document page numbers.
    """
    try:
        response = await query_rag_knowledge_base(question=query_in.question)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error querying AI knowledge base: {str(e)}"
        )

@router.post("/proposals/{proposal_id}/ask", response_model=RAGQueryResponse)
async def ask_proposal_chat(
    proposal_id: uuid.UUID,
    query_in: RAGQueryRequest,
    current_user: User = Depends(require_any_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Ask questions specifically regarding a proposal plan, its AI compliance scan, and its admin decisions.
    """
    try:
        response = await query_proposal_rag_knowledge_base(proposal_id=proposal_id, question=query_in.question)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error querying proposal AI chat: {str(e)}"
        )
