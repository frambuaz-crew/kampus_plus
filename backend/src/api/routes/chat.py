"""Chat API routes for KAMPÜS+ Platform - Phase 4 (T059-T063).

Endpoints:
- POST /chat/sessions - Create new conversation session
- GET /chat/sessions - List user's active conversation sessions
- GET /chat/sessions/{id} - Get conversation session with full message history
- POST /chat/sessions/{id}/messages - Send message and get AI response
- DELETE /chat/sessions/{id} - Soft-delete conversation session

All endpoints require authentication and integrate with AI RAG pipeline.
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, ConfigDict, field_serializer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.user import User
from src.models.conversation import ConversationSession, ChatMessage, MessageRole
from src.services.ai_service import AIService
from src.services.anonymization_service import AnonymizationService


# Initialize router
router = APIRouter(prefix="/chat", tags=["Chat"])

# Initialize services
ai_service = AIService()
anonymization_service = AnonymizationService()


# ============================================================================
# REQUEST/RESPONSE MODELS
# ============================================================================

class CreateSessionRequest(BaseModel):
    """Request model for creating a new conversation session."""
    title: Optional[str] = Field(None, max_length=200, description="Session title (auto-generated if not provided)")


class CreateSessionResponse(BaseModel):
    """Response model for session creation."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    is_active: bool
    
    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: datetime) -> datetime:
        """Convert UTC to Turkey time (UTC+3)."""
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone(timedelta(hours=3)))


class SessionListItem(BaseModel):
    """Response model for session list item."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    is_active: bool
    message_count: int = 0
    
    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: datetime) -> datetime:
        """Convert UTC to Turkey time (UTC+3)."""
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone(timedelta(hours=3)))


class MessageSource(BaseModel):
    """Model for message source citation."""
    title: str
    source_type: str
    content_preview: str
    metadata: dict


class MessageResponse(BaseModel):
    """Response model for chat message."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    session_id: str
    role: str
    content: str
    created_at: datetime
    sources: Optional[List[MessageSource]] = None
    
    @field_serializer('created_at')
    def serialize_datetime(self, dt: datetime) -> datetime:
        """Convert UTC to Turkey time (UTC+3)."""
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone(timedelta(hours=3)))


class SendMessageRequest(BaseModel):
    """Request model for sending a message."""
    content: str = Field(..., min_length=1, max_length=4000, description="Message content")


class SendMessageResponse(BaseModel):
    """Response model for AI message response."""
    user_message: MessageResponse
    assistant_message: MessageResponse


class SessionDetailResponse(BaseModel):
    """Response model for session with full message history."""
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    is_active: bool
    messages: List[MessageResponse]
    
    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: datetime) -> datetime:
        """Convert UTC to Turkey time (UTC+3)."""
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone(timedelta(hours=3)))


# ============================================================================
# ENDPOINTS - T059: POST /chat/sessions
# ============================================================================

@router.post(
    "/sessions",
    response_model=CreateSessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create new conversation session",
    description="Creates a new conversation session for the authenticated user. Auto-generates title if not provided."
)
async def create_session(
    request: CreateSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> CreateSessionResponse:
    """Create a new conversation session (T059).
    
    Args:
        request: Session creation request with optional title
        current_user: Authenticated user from JWT token
        db: Database session
        
    Returns:
        CreateSessionResponse with session details
        
    Raises:
        HTTPException 401: If user is not authenticated
    """
    # Auto-generate title if not provided
    title = request.title or f"Conversation {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}"
    
    # Create new session
    new_session = ConversationSession(
        user_id=current_user.id,
        title=title,
        is_active=True
    )
    
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    
    return CreateSessionResponse(
        id=str(new_session.id),
        title=new_session.title,
        created_at=new_session.created_at,
        updated_at=new_session.updated_at,
        is_active=new_session.is_active
    )


# ============================================================================
# ENDPOINTS - T060: GET /chat/sessions
# ============================================================================

@router.get(
    "/sessions",
    response_model=List[SessionListItem],
    summary="List user's conversation sessions",
    description="Retrieves all active conversation sessions for the authenticated user, ordered by most recent."
)
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    include_inactive: bool = False
) -> List[SessionListItem]:
    """List all conversation sessions for authenticated user (T060).
    
    Args:
        current_user: Authenticated user from JWT token
        db: Database session
        include_inactive: If True, include soft-deleted sessions (default: False)
        
    Returns:
        List of SessionListItem objects ordered by updated_at DESC
        
    Raises:
        HTTPException 401: If user is not authenticated
    """
    # Build query
    query = (
        select(ConversationSession)
        .where(ConversationSession.user_id == current_user.id)
        .order_by(ConversationSession.updated_at.desc())
    )
    
    # Filter by active status if requested
    if not include_inactive:
        query = query.where(ConversationSession.is_active == True)
    
    result = await db.execute(query)
    sessions = result.scalars().all()
    
    # Count messages for each session
    session_items = []
    for session in sessions:
        # Count messages in this session
        message_count_query = select(ChatMessage).where(
            ChatMessage.session_id == session.id
        )
        message_result = await db.execute(message_count_query)
        messages = message_result.scalars().all()
        
        session_items.append(
            SessionListItem(
                id=str(session.id),
                title=session.title,
                created_at=session.created_at,
                updated_at=session.updated_at,
                is_active=session.is_active,
                message_count=len(messages)
            )
        )
    
    return session_items


# ============================================================================
# ENDPOINTS - T061: GET /chat/sessions/{id}
# ============================================================================

@router.get(
    "/sessions/{session_id}",
    response_model=SessionDetailResponse,
    summary="Get conversation session with full message history",
    description="Retrieves a conversation session with all messages for the authenticated user."
)
async def get_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SessionDetailResponse:
    """Get conversation session with full message history (T061).
    
    Args:
        session_id: UUID of the conversation session
        current_user: Authenticated user from JWT token
        db: Database session
        
    Returns:
        SessionDetailResponse with session details and all messages
        
    Raises:
        HTTPException 401: If user is not authenticated
        HTTPException 403: If user does not own the session
        HTTPException 404: If session not found
    """
    # Query session with eager loading of messages
    query = (
        select(ConversationSession)
        .options(selectinload(ConversationSession.messages))
        .where(ConversationSession.id == session_id)
    )
    result = await db.execute(query)
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    # Verify ownership
    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this session"
        )
    
    # Convert messages to response model
    messages = [
        MessageResponse(
            id=str(msg.id),
            session_id=str(msg.session_id),
            role=msg.role.value,
            content=msg.content,
            created_at=msg.created_at,
            sources=msg.sources if msg.sources else None
        )
        for msg in sorted(session.messages, key=lambda m: m.created_at)
    ]
    
    return SessionDetailResponse(
        id=str(session.id),
        title=session.title,
        created_at=session.created_at,
        updated_at=session.updated_at,
        is_active=session.is_active,
        messages=messages
    )


# ============================================================================
# ENDPOINTS - T062: POST /chat/sessions/{id}/messages
# ============================================================================

@router.post(
    "/sessions/{session_id}/messages",
    response_model=SendMessageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Send message and get AI response",
    description="Sends a user message, queries the AI RAG pipeline, and returns the assistant's response with source citations."
)
async def send_message(
    session_id: UUID,
    request: SendMessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> SendMessageResponse:
    """Send message and get AI response (T062).
    
    Args:
        session_id: UUID of the conversation session
        request: Message content from user
        current_user: Authenticated user from JWT token
        db: Database session
        
    Returns:
        SendMessageResponse with both user message and AI assistant response
        
    Raises:
        HTTPException 401: If user is not authenticated
        HTTPException 403: If user does not own the session
        HTTPException 404: If session not found
        HTTPException 500: If AI service fails
    """
    # Verify session exists and user owns it
    query = select(ConversationSession).where(ConversationSession.id == session_id)
    result = await db.execute(query)
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this session"
        )
    
    if not session.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot send message to inactive session"
        )
    
    # Anonymize user message (removes PII)
    # anonymize() returns (anonymized_text, pii_matches)
    anonymized_content, _ = anonymization_service.anonymize(request.content, session_id=str(session_id))
    
    # Save user message
    user_message = ChatMessage(
        session_id=session_id,
        role=MessageRole.USER,
        content=anonymized_content,
        sources=None
    )
    db.add(user_message)
    await db.flush()  # Get message ID without committing
    
    try:
        # Load conversation history for context (T065)
        # Get previous messages from this session (excluding current user message)
        history_query = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .where(ChatMessage.id != user_message.id)  # Exclude current message
            .order_by(ChatMessage.created_at.asc())
        )
        history_result = await db.execute(history_query)
        history_messages = history_result.scalars().all()
        
        # Format history for AI service (last N exchanges)
        # Convert to list of dicts with question/answer pairs
        session_history = []
        i = 0
        while i < len(history_messages):
            msg = history_messages[i]
            if msg.role == MessageRole.USER:
                exchange = {"question": msg.content}
                # Check if there's a corresponding assistant message
                if i + 1 < len(history_messages) and history_messages[i + 1].role == MessageRole.ASSISTANT:
                    exchange["answer"] = history_messages[i + 1].content
                    i += 2
                else:
                    i += 1
                session_history.append(exchange)
            else:
                i += 1
        
        # Query AI service with RAG pipeline
        ai_response = await ai_service.query(
            question=anonymized_content,
            user_id=current_user.id,
            session_id=str(session_id),
            session_history=session_history,
            anonymize=False  # Already anonymized above
        )
        
        # Parse AI response
        assistant_content = ai_response.get("answer", "")
        sources = ai_response.get("sources", [])
        
        # Save assistant message
        assistant_message = ChatMessage(
            session_id=session_id,
            role=MessageRole.ASSISTANT,
            content=assistant_content,
            sources=sources if sources else None
        )
        db.add(assistant_message)
        
        # Update session timestamp
        session.updated_at = datetime.now(timezone.utc)
        
        await db.commit()
        await db.refresh(user_message)
        await db.refresh(assistant_message)
        
        # Convert to response models
        user_msg_response = MessageResponse(
            id=str(user_message.id),
            session_id=str(user_message.session_id),
            role=user_message.role.value,
            content=user_message.content,
            created_at=user_message.created_at,
            sources=None
        )
        
        assistant_msg_response = MessageResponse(
            id=str(assistant_message.id),
            session_id=str(assistant_message.session_id),
            role=assistant_message.role.value,
            content=assistant_message.content,
            created_at=assistant_message.created_at,
            sources=[MessageSource(**src) for src in sources] if sources else None
        )
        
        return SendMessageResponse(
            user_message=user_msg_response,
            assistant_message=assistant_msg_response
        )
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI service error: {str(e)}"
        )


# ============================================================================
# ENDPOINTS - T063: DELETE /chat/sessions/{id}
# ============================================================================

@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete conversation session",
    description="Soft-deletes a conversation session by marking it as inactive. Messages are retained."
)
async def delete_session(
    session_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """Soft-delete conversation session (T063).
    
    Args:
        session_id: UUID of the conversation session
        current_user: Authenticated user from JWT token
        db: Database session
        
    Returns:
        None (204 No Content)
        
    Raises:
        HTTPException 401: If user is not authenticated
        HTTPException 403: If user does not own the session
        HTTPException 404: If session not found
    """
    # Query session
    query = select(ConversationSession).where(ConversationSession.id == session_id)
    result = await db.execute(query)
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found"
        )
    
    # Verify ownership
    if session.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this session"
        )
    
    # Soft delete: mark as inactive
    session.is_active = False
    session.updated_at = datetime.now(timezone.utc)
    
    await db.commit()
    
    # Return 204 No Content (no response body needed)
