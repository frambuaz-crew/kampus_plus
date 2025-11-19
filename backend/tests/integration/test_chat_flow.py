"""
Integration tests for AI Chat Flow - KAMPÜS+ Phase 4.

Tests complete chat flow:
- Session creation and management
- Message sending and response retrieval
- Context maintenance across multiple exchanges
- Source citation formatting
- Error handling
- Database persistence

TDD Approach: Write tests FIRST (RED), then implement endpoints (GREEN).
"""

import pytest
import pytest_asyncio
from uuid import UUID, uuid4
from datetime import datetime
from typing import List, Dict, Any
from unittest.mock import AsyncMock, patch

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models.conversation import ConversationSession, ChatMessage, MessageRole
from src.models.user import User
from src.services.ai_service import AIService


# ============================================================================
# Fixtures
# ============================================================================

@pytest_asyncio.fixture
async def test_student_chat(db_session: AsyncSession) -> User:
    """Create a test student for chat flow testing."""
    student = User(
        email="chat.student@university.edu.tr",
        first_name="Chat",
        last_name="Student",
        password_hash="$2b$12$test_hash_for_chat_student",
        role="student",
        is_verified=True,
        is_active=True
    )
    db_session.add(student)
    await db_session.commit()
    await db_session.refresh(student)
    return student


@pytest_asyncio.fixture
async def chat_session(db_session: AsyncSession, test_student_chat: User) -> ConversationSession:
    """Create a test conversation session."""
    session = ConversationSession(
        user_id=test_student_chat.id,
        title="Test Chat Session",
        is_active=True
    )
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)
    return session


@pytest.fixture
def ai_service() -> AIService:
    """Create AIService instance for testing."""
    # Will use mocked vector service in tests
    return AIService()


# ============================================================================
# Test: Session Creation and Retrieval
# ============================================================================

@pytest.mark.asyncio
async def test_create_conversation_session(db_session: AsyncSession, test_student_chat: User):
    """Test creating a new conversation session."""
    session = ConversationSession(
        user_id=test_student_chat.id,
        title="My First Chat",
        is_active=True
    )
    
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)
    
    assert session.id is not None
    assert isinstance(session.id, UUID)
    assert session.user_id == test_student_chat.id
    assert session.title == "My First Chat"
    assert session.is_active is True
    assert session.created_at is not None
    assert session.updated_at is not None


@pytest.mark.asyncio
async def test_list_user_sessions(db_session: AsyncSession, test_student_chat: User):
    """Test listing all sessions for a user."""
    # Create multiple sessions
    session1 = ConversationSession(
        user_id=test_student_chat.id,
        title="Session 1",
        is_active=True
    )
    session2 = ConversationSession(
        user_id=test_student_chat.id,
        title="Session 2",
        is_active=True
    )
    session3 = ConversationSession(
        user_id=test_student_chat.id,
        title="Archived Session",
        is_active=False
    )
    
    db_session.add_all([session1, session2, session3])
    await db_session.commit()
    
    # Query active sessions
    result = await db_session.execute(
        select(ConversationSession)
        .where(ConversationSession.user_id == test_student_chat.id)
        .where(ConversationSession.is_active == True)
        .order_by(ConversationSession.created_at.desc())
    )
    active_sessions = result.scalars().all()
    
    assert len(active_sessions) == 2
    assert active_sessions[0].title in ["Session 1", "Session 2"]
    assert active_sessions[1].title in ["Session 1", "Session 2"]


@pytest.mark.asyncio
async def test_session_belongs_to_user(db_session: AsyncSession, test_student_chat: User):
    """Test session ownership verification."""
    session = ConversationSession(
        user_id=test_student_chat.id,
        title="User Session",
        is_active=True
    )
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)
    
    # Verify session belongs to user
    result = await db_session.execute(
        select(ConversationSession)
        .where(ConversationSession.id == session.id)
        .where(ConversationSession.user_id == test_student_chat.id)
    )
    found_session = result.scalar_one_or_none()
    
    assert found_session is not None
    assert found_session.id == session.id
    
    # Try accessing with wrong user_id
    wrong_user_id = uuid4()
    result = await db_session.execute(
        select(ConversationSession)
        .where(ConversationSession.id == session.id)
        .where(ConversationSession.user_id == wrong_user_id)
    )
    wrong_session = result.scalar_one_or_none()
    
    assert wrong_session is None


# ============================================================================
# Test: Message Creation and Storage
# ============================================================================

@pytest.mark.asyncio
async def test_create_user_message(db_session: AsyncSession, chat_session: ConversationSession):
    """Test creating a user message in a session."""
    message = ChatMessage(
        session_id=chat_session.id,
        role=MessageRole.USER,
        content="KAMPÜS+ nedir?",
        sources=None
    )
    
    db_session.add(message)
    await db_session.commit()
    await db_session.refresh(message)
    
    assert message.id is not None
    assert message.session_id == chat_session.id
    assert message.role == MessageRole.USER
    assert message.content == "KAMPÜS+ nedir?"
    assert message.sources is None
    assert message.created_at is not None


@pytest.mark.asyncio
async def test_create_assistant_message_with_sources(db_session: AsyncSession, chat_session: ConversationSession):
    """Test creating an assistant message with source citations."""
    sources = [
        {
            "title": "KAMPÜS+ Kullanım Kılavuzu",
            "source_type": "official_document",
            "content_preview": "KAMPÜS+ yapay zeka destekli eğitim platformudur...",
            "metadata": {
                "document_id": "doc-001",
                "course_id": None
            }
        }
    ]
    
    message = ChatMessage(
        session_id=chat_session.id,
        role=MessageRole.ASSISTANT,
        content="KAMPÜS+ yapay zeka destekli bir eğitim platformudur. Öğrencilere akademik sorularında yardımcı olur.",
        sources=sources
    )
    
    db_session.add(message)
    await db_session.commit()
    await db_session.refresh(message)
    
    assert message.id is not None
    assert message.role == MessageRole.ASSISTANT
    assert message.sources is not None
    assert len(message.sources) == 1
    assert message.sources[0]["title"] == "KAMPÜS+ Kullanım Kılavuzu"
    assert message.sources[0]["source_type"] == "official_document"


@pytest.mark.asyncio
async def test_retrieve_conversation_history(db_session: AsyncSession, chat_session: ConversationSession):
    """Test retrieving full conversation history in order."""
    # Create conversation with multiple exchanges
    messages_data = [
        (MessageRole.USER, "Merhaba, KAMPÜS+ nedir?"),
        (MessageRole.ASSISTANT, "KAMPÜS+ yapay zeka destekli eğitim platformudur."),
        (MessageRole.USER, "Hangi özellikleri var?"),
        (MessageRole.ASSISTANT, "AI chatbot, döküman yükleme, anonim forum özellikleri vardır."),
    ]
    
    for role, content in messages_data:
        message = ChatMessage(
            session_id=chat_session.id,
            role=role,
            content=content,
            sources=None if role == MessageRole.USER else []
        )
        db_session.add(message)
    
    await db_session.commit()
    
    # Retrieve messages in order
    result = await db_session.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == chat_session.id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()
    
    assert len(messages) == 4
    assert messages[0].role == MessageRole.USER
    assert messages[0].content == "Merhaba, KAMPÜS+ nedir?"
    assert messages[1].role == MessageRole.ASSISTANT
    assert messages[2].role == MessageRole.USER
    assert messages[3].role == MessageRole.ASSISTANT


# ============================================================================
# Test: Context Window Management
# ============================================================================

@pytest.mark.asyncio
async def test_context_window_last_n_messages(db_session: AsyncSession, chat_session: ConversationSession):
    """Test retrieving last N messages for context window."""
    # Create 10 messages (exceeds context window of 5)
    for i in range(10):
        user_msg = ChatMessage(
            session_id=chat_session.id,
            role=MessageRole.USER,
            content=f"Question {i}",
            sources=None
        )
        db_session.add(user_msg)
        
        assistant_msg = ChatMessage(
            session_id=chat_session.id,
            role=MessageRole.ASSISTANT,
            content=f"Answer {i}",
            sources=[]
        )
        db_session.add(assistant_msg)
    
    await db_session.commit()
    
    # Retrieve last 5 exchanges (10 messages)
    context_window_size = 5
    result = await db_session.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == chat_session.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(context_window_size * 2)  # 5 exchanges = 10 messages
    )
    recent_messages = result.scalars().all()
    
    assert len(recent_messages) == 10
    # Verify we got the correct session's messages
    for msg in recent_messages:
        assert msg.session_id == chat_session.id
    # Verify mix of user and assistant messages
    roles = [msg.role for msg in recent_messages]
    assert MessageRole.USER in roles
    assert MessageRole.ASSISTANT in roles


@pytest.mark.asyncio
async def test_format_history_for_ai_service(db_session: AsyncSession, chat_session: ConversationSession, ai_service: AIService):
    """Test formatting conversation history for AI service."""
    # Create conversation
    messages_data = [
        (MessageRole.USER, "KAMPÜS+ nedir?"),
        (MessageRole.ASSISTANT, "Yapay zeka destekli eğitim platformudur."),
        (MessageRole.USER, "Nasıl kullanabilirim?"),
    ]
    
    for role, content in messages_data:
        message = ChatMessage(
            session_id=chat_session.id,
            role=role,
            content=content
        )
        db_session.add(message)
    
    await db_session.commit()
    
    # Retrieve and format for AI service
    result = await db_session.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == chat_session.id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()
    
    # Format as AI service expects (list of dicts)
    history = []
    for i in range(0, len(messages) - 1, 2):  # Process in pairs
        if i + 1 < len(messages):
            history.append({
                "question": messages[i].content,
                "answer": messages[i + 1].content
            })
    
    assert len(history) == 1
    assert history[0]["question"] == "KAMPÜS+ nedir?"
    assert history[0]["answer"] == "Yapay zeka destekli eğitim platformudur."
    
    # Test AI service can use this history
    formatted_messages = ai_service._format_chat_history(history)
    assert len(formatted_messages) == 2  # 1 exchange = 2 messages


# ============================================================================
# Test: Complete Chat Flow
# ============================================================================

@pytest.mark.asyncio
async def test_complete_chat_flow(db_session: AsyncSession, test_student_chat: User, ai_service: AIService):
    """Test complete chat flow from session creation to response with context."""
    from unittest.mock import patch, AsyncMock
    
    # Step 1: Create session
    session = ConversationSession(
        user_id=test_student_chat.id,
        title="Complete Flow Test",
        is_active=True
    )
    db_session.add(session)
    await db_session.commit()
    await db_session.refresh(session)
    
    # Step 2: User sends first message
    user_msg_1 = ChatMessage(
        session_id=session.id,
        role=MessageRole.USER,
        content="KAMPÜS+ nedir?",
        sources=None
    )
    db_session.add(user_msg_1)
    await db_session.commit()
    
    # Step 3: AI responds (mocked)
    mock_response = {
        "answer": "KAMPÜS+ yapay zeka destekli eğitim platformudur.",
        "sources": [
            {
                "title": "Platform Kılavuzu",
                "source_type": "official_document",
                "content_preview": "KAMPÜS+ açıklaması...",
                "metadata": {"document_id": "doc-001"}
            }
        ],
        "session_id": str(session.id),
        "anonymized": True
    }
    
    assistant_msg_1 = ChatMessage(
        session_id=session.id,
        role=MessageRole.ASSISTANT,
        content=mock_response["answer"],
        sources=mock_response["sources"]
    )
    db_session.add(assistant_msg_1)
    await db_session.commit()
    
    # Step 4: User sends follow-up (with context)
    user_msg_2 = ChatMessage(
        session_id=session.id,
        role=MessageRole.USER,
        content="Hangi özellikleri var?",
        sources=None
    )
    db_session.add(user_msg_2)
    await db_session.commit()
    
    # Step 5: Get conversation history for context
    result = await db_session.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
    )
    all_messages = result.scalars().all()
    
    # Format history (exclude last user message)
    history = []
    for i in range(0, len(all_messages) - 1, 2):
        if i + 1 < len(all_messages) and all_messages[i].role == MessageRole.USER:
            history.append({
                "question": all_messages[i].content,
                "answer": all_messages[i + 1].content
            })
    
    # Step 6: AI responds with context (mocked)
    mock_chain = AsyncMock()
    mock_chain.ainvoke = AsyncMock(return_value="AI chatbot, döküman yükleme ve anonim forum özellikleri vardır.")
    
    mock_retriever = AsyncMock()
    mock_retriever.aget_relevant_documents = AsyncMock(return_value=[])
    
    with patch.object(ai_service, '_create_rag_chain', return_value=mock_chain), \
         patch.object(ai_service, '_create_hybrid_retriever', return_value=mock_retriever):
        
        response = await ai_service.query(
            question=user_msg_2.content,
            user_id=test_student_chat.id,
            session_id=str(session.id),
            session_history=history
        )
    
    assistant_msg_2 = ChatMessage(
        session_id=session.id,
        role=MessageRole.ASSISTANT,
        content=response["answer"],
        sources=response["sources"]
    )
    db_session.add(assistant_msg_2)
    await db_session.commit()
    
    # Verify complete conversation
    result = await db_session.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at.asc())
    )
    final_messages = result.scalars().all()
    
    assert len(final_messages) == 4  # 2 exchanges
    assert final_messages[0].content == "KAMPÜS+ nedir?"
    assert final_messages[2].content == "Hangi özellikleri var?"
    assert "özellik" in final_messages[3].content.lower()


# ============================================================================
# Test: Session Deletion
# ============================================================================

@pytest.mark.asyncio
async def test_soft_delete_session(db_session: AsyncSession, chat_session: ConversationSession):
    """Test soft-deleting a session (mark as inactive)."""
    # Verify session is active
    assert chat_session.is_active is True
    
    # Soft delete
    chat_session.is_active = False
    await db_session.commit()
    await db_session.refresh(chat_session)
    
    assert chat_session.is_active is False
    
    # Session and messages still exist in DB
    result = await db_session.execute(
        select(ConversationSession).where(ConversationSession.id == chat_session.id)
    )
    session = result.scalar_one_or_none()
    assert session is not None
    assert session.is_active is False


@pytest.mark.asyncio
async def test_cascade_delete_messages_on_session_delete(db_session: AsyncSession, chat_session: ConversationSession):
    """Test messages are deleted when session is hard-deleted (CASCADE)."""
    # Create messages
    msg1 = ChatMessage(session_id=chat_session.id, role=MessageRole.USER, content="Test 1")
    msg2 = ChatMessage(session_id=chat_session.id, role=MessageRole.ASSISTANT, content="Response 1")
    db_session.add_all([msg1, msg2])
    await db_session.commit()
    
    # Verify messages exist
    result = await db_session.execute(
        select(ChatMessage).where(ChatMessage.session_id == chat_session.id)
    )
    messages_before = result.scalars().all()
    assert len(messages_before) == 2
    
    # Hard delete session
    await db_session.delete(chat_session)
    await db_session.commit()
    
    # Messages should be cascade deleted
    result = await db_session.execute(
        select(ChatMessage).where(ChatMessage.session_id == chat_session.id)
    )
    messages_after = result.scalars().all()
    assert len(messages_after) == 0


# ============================================================================
# Test: Error Handling
# ============================================================================

@pytest.mark.asyncio
async def test_ai_query_error_persists_message(db_session: AsyncSession, chat_session: ConversationSession, test_student_chat: User, ai_service: AIService):
    """Test error messages are handled gracefully and user message is still saved."""
    from unittest.mock import patch
    
    # User message
    user_msg = ChatMessage(
        session_id=chat_session.id,
        role=MessageRole.USER,
        content="Test error handling",
        sources=None
    )
    db_session.add(user_msg)
    await db_session.commit()
    
    # Mock AI service to raise error
    mock_chain = AsyncMock()
    mock_chain.ainvoke = AsyncMock(side_effect=Exception("LLM API error"))
    
    with patch.object(ai_service, '_create_rag_chain', return_value=mock_chain):
        response = await ai_service.query(
            question=user_msg.content,
            user_id=test_student_chat.id,
            session_id=str(chat_session.id)
        )
    
    # Should return error response
    assert "error" in response
    assert "Üzgünüm" in response["answer"]
    
    # Save error response
    error_msg = ChatMessage(
        session_id=chat_session.id,
        role=MessageRole.ASSISTANT,
        content=response["answer"],
        sources=[]
    )
    db_session.add(error_msg)
    await db_session.commit()
    
    # Verify both messages saved
    result = await db_session.execute(
        select(ChatMessage).where(ChatMessage.session_id == chat_session.id)
    )
    messages = result.scalars().all()
    assert len(messages) == 2


# ============================================================================
# Test: Multi-User Isolation
# ============================================================================

@pytest.mark.asyncio
async def test_user_cannot_access_other_user_sessions(db_session: AsyncSession, test_student_chat: User):
    """Test users can only access their own sessions."""
    # Create second user
    user2 = User(
        email="user2@university.edu.tr",
        first_name="User",
        last_name="Two",
        password_hash="$2b$12$hash2",
        role="student",
        is_verified=True,
        is_active=True
    )
    db_session.add(user2)
    await db_session.commit()
    await db_session.refresh(user2)
    
    # Create sessions for both users
    session1 = ConversationSession(user_id=test_student_chat.id, title="User 1 Session")
    session2 = ConversationSession(user_id=user2.id, title="User 2 Session")
    db_session.add_all([session1, session2])
    await db_session.commit()
    
    # User 1 tries to access their sessions
    result = await db_session.execute(
        select(ConversationSession).where(ConversationSession.user_id == test_student_chat.id)
    )
    user1_sessions = result.scalars().all()
    assert len(user1_sessions) == 1
    assert user1_sessions[0].title == "User 1 Session"
    
    # User 1 should NOT see User 2's session
    result = await db_session.execute(
        select(ConversationSession)
        .where(ConversationSession.id == session2.id)
        .where(ConversationSession.user_id == test_student_chat.id)
    )
    unauthorized_session = result.scalar_one_or_none()
    assert unauthorized_session is None
