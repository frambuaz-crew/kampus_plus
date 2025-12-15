"""
Unit tests for AIService - KAMPÜS+ AI Chatbot.

Tests RAG pipeline components:
- Source retrieval from vector stores
- Response formatting
- Citation handling
- Context window management
- Language support
- Anonymization preprocessing

TDD Approach: Write tests FIRST (RED), then implement (GREEN).
"""

import pytest
from uuid import uuid4, UUID
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from typing import List, Dict, Any

from langchain_core.documents import Document
from langchain_core.runnables import RunnableSerializable

from src.services.ai_service import AIService
from src.services.vector_service import VectorStoreService


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def mock_vector_service():
    """Mock VectorStoreService for testing."""
    mock = Mock(spec=VectorStoreService)
    mock.search_official = AsyncMock(return_value=[])
    mock.search_user = AsyncMock(return_value=[])
    return mock


@pytest.fixture
def ai_service(mock_vector_service):
    """Create AIService instance with mocked dependencies."""
    with patch('src.services.ai_service.ChatGoogleGenerativeAI'), \
         patch('src.services.ai_service.GoogleGenerativeAIEmbeddings'):
        service = AIService(vector_service=mock_vector_service)
        return service


@pytest.fixture
def sample_user_id() -> UUID:
    """Sample user ID for testing."""
    return uuid4()


@pytest.fixture
def sample_documents() -> List[Document]:
    """Sample LangChain documents for testing."""
    return [
        Document(
            page_content="KAMPÜS+ platformu öğrencilere yapay zeka destekli asistan sağlar.",
            metadata={
                "title": "KAMPÜS+ Kullanım Kılavuzu",
                "source_type": "official_document",
                "document_id": "doc-001",
                "course_id": None,
                "upload_date": "2024-01-15"
            }
        ),
        Document(
            page_content="Makine Öğrenmesi dersi her Salı 10:00-12:00 saatleri arasında yapılır.",
            metadata={
                "title": "Ders Programı - Bilgisayar Mühendisliği",
                "source_type": "official_document",
                "document_id": "doc-002",
                "course_id": "course-cs101",
                "upload_date": "2024-01-10"
            }
        ),
        Document(
            page_content="Öğrenci notları: Gradient descent algoritması minimize eder.",
            metadata={
                "title": "ML Ders Notlarım",
                "source_type": "user_document",
                "document_id": "doc-user-123",
                "course_id": "course-cs101",
                "upload_date": "2024-02-20",
                "user_id": str(uuid4())
            }
        )
    ]


@pytest.fixture
def sample_session_history() -> List[Dict[str, str]]:
    """Sample conversation history."""
    return [
        {"question": "KAMPÜS+ nedir?", "answer": "KAMPÜS+ yapay zeka destekli bir eğitim platformudur."},
        {"question": "Hangi derslere kayıtlıyım?", "answer": "Kayıtlı olduğunuz dersleri dashboard'dan görebilirsiniz."}
    ]


# ============================================================================
# Test: AIService Initialization
# ============================================================================

def test_ai_service_initialization(ai_service):
    """Test AIService initializes correctly with LangChain components."""
    assert ai_service is not None
    assert ai_service.vector_service is not None
    assert ai_service.llm is not None
    assert ai_service.embeddings is not None
    
    # Check Turkish is default language
    assert ai_service.current_language == "tr"


def test_ai_service_default_context_window():
    """Test context window size is set to 5 exchanges."""
    with patch('src.services.ai_service.ChatGoogleGenerativeAI'), \
         patch('src.services.ai_service.GoogleGenerativeAIEmbeddings'):
        service = AIService()
        assert service.CONTEXT_WINDOW_SIZE == 5


# ============================================================================
# Test: RAG Chain Creation (LCEL)
# ============================================================================

def test_create_rag_chain(ai_service, sample_user_id):
    """Test creating LCEL RAG chain."""
    chain = ai_service._create_rag_chain(user_id=sample_user_id)
    
    assert chain is not None
    assert isinstance(chain, RunnableSerializable)


def test_create_rag_chain_without_user(ai_service):
    """Test creating RAG chain without user ID (official docs only)."""
    chain = ai_service._create_rag_chain(user_id=None)
    
    assert chain is not None
    assert isinstance(chain, RunnableSerializable)


# ============================================================================
# Test: Query Processing
# ============================================================================

@pytest.mark.asyncio
async def test_query_basic_functionality(ai_service, sample_user_id, sample_documents):
    """Test basic query processing returns answer and sources."""
    # Mock the RAG chain
    mock_chain = AsyncMock()
    mock_chain.ainvoke = AsyncMock(return_value="KAMPÜS+ yapay zeka destekli bir eğitim platformudur.")
    
    # Mock retriever to return sample documents
    mock_retriever = AsyncMock()
    mock_retriever._aget_relevant_documents = AsyncMock(return_value=sample_documents[:2])
    
    with patch.object(ai_service, '_create_rag_chain', return_value=mock_chain), \
         patch.object(ai_service, '_create_hybrid_retriever', return_value=mock_retriever):
        result = await ai_service.query(
            question="KAMPÜS+ nedir?",
            user_id=sample_user_id
        )
    
    assert "answer" in result
    assert "sources" in result
    assert "session_id" in result
    assert result["answer"] == "KAMPÜS+ yapay zeka destekli bir eğitim platformudur."
    assert len(result["sources"]) == 2


@pytest.mark.asyncio
async def test_query_with_anonymization(ai_service, sample_user_id):
    """Test query anonymizes PII before sending to LLM."""
    question_with_pii = "Benim adım Ahmet Yılmaz ve email adresim ahmet@university.edu.tr"
    
    # Mock anonymization
    with patch.object(ai_service, '_anonymize_text') as mock_anonymize:
        mock_anonymize.return_value = "Benim adım [ÖĞRENCİ_ADI] ve email adresim [EMAIL]"
        
        mock_chain = AsyncMock()
        mock_chain.ainvoke = AsyncMock(return_value="Merhaba, size nasıl yardımcı olabilirim?")
        
        mock_retriever = AsyncMock()
        mock_retriever.aget_relevant_documents = AsyncMock(return_value=[])
        
        with patch.object(ai_service, '_create_rag_chain', return_value=mock_chain), \
             patch.object(ai_service, '_create_hybrid_retriever', return_value=mock_retriever):
            result = await ai_service.query(
                question=question_with_pii,
                user_id=sample_user_id,
                anonymize=True
            )
        
        # Anonymization should be called
        mock_anonymize.assert_called_once_with(question_with_pii)
        assert result["anonymized"] is True


@pytest.mark.asyncio
async def test_query_without_anonymization(ai_service, sample_user_id):
    """Test query can skip anonymization when disabled."""
    question = "KAMPÜS+ nedir?"
    
    with patch.object(ai_service, '_anonymize_text') as mock_anonymize:
        mock_chain = AsyncMock()
        mock_chain.ainvoke = AsyncMock(return_value="KAMPÜS+ bir eğitim platformudur.")
        
        mock_retriever = AsyncMock()
        mock_retriever.aget_relevant_documents = AsyncMock(return_value=[])
        
        with patch.object(ai_service, '_create_rag_chain', return_value=mock_chain), \
             patch.object(ai_service, '_create_hybrid_retriever', return_value=mock_retriever):
            result = await ai_service.query(
                question=question,
                user_id=sample_user_id,
                anonymize=False
            )
        
        # Anonymization should NOT be called
        mock_anonymize.assert_not_called()
        assert result["anonymized"] is False


@pytest.mark.asyncio
async def test_query_with_session_history(ai_service, sample_user_id, sample_session_history):
    """Test query uses session history for context."""
    mock_chain = AsyncMock()
    mock_chain.ainvoke = AsyncMock(return_value="Makine Öğrenmesi dersiniz Salı günleri 10:00-12:00 saatleri arasındadır.")
    
    mock_retriever = AsyncMock()
    mock_retriever.aget_relevant_documents = AsyncMock(return_value=[])
    
    with patch.object(ai_service, '_create_rag_chain', return_value=mock_chain), \
         patch.object(ai_service, '_create_hybrid_retriever', return_value=mock_retriever), \
         patch.object(ai_service, '_format_chat_history') as mock_format:
        await ai_service.query(
            question="Makine Öğrenmesi dersi ne zaman?",
            user_id=sample_user_id,
            session_history=sample_session_history
        )
        
        # Check that chat history was formatted
        mock_format.assert_called_once_with(sample_session_history)


@pytest.mark.asyncio
async def test_query_error_handling(ai_service, sample_user_id):
    """Test query handles errors gracefully."""
    # Mock chain that raises exception
    mock_chain = AsyncMock()
    mock_chain.ainvoke = AsyncMock(side_effect=Exception("LLM API error"))
    
    with patch.object(ai_service, '_create_rag_chain', return_value=mock_chain):
        result = await ai_service.query(
            question="Test question",
            user_id=sample_user_id
        )
    
    # Should return error response instead of raising
    assert "error" in result
    assert "Üzgünüm" in result["answer"]
    assert result["sources"] == []


# ============================================================================
# Test: Source Formatting
# ============================================================================

def test_format_sources_with_metadata(ai_service, sample_documents):
    """Test source documents are formatted correctly."""
    formatted = ai_service._format_sources(sample_documents)
    
    assert len(formatted) == 3
    
    # Check first official document
    source1 = formatted[0]
    assert source1["title"] == "KAMPÜS+ Kullanım Kılavuzu"
    assert source1["source_type"] == "official_document"
    assert "content_preview" in source1
    assert len(source1["content_preview"]) <= 203  # 200 chars + "..."
    assert source1["metadata"]["document_id"] == "doc-001"
    
    # Check user document
    source3 = formatted[2]
    assert source3["title"] == "ML Ders Notlarım"
    assert source3["source_type"] == "user_document"
    assert source3["metadata"]["user_id"] is not None


def test_format_sources_truncates_long_content(ai_service):
    """Test source content is truncated to 200 chars."""
    long_doc = Document(
        page_content="A" * 500,  # 500 chars
        metadata={"title": "Long Document", "source_type": "official_document"}
    )
    
    formatted = ai_service._format_sources([long_doc])
    
    assert len(formatted) == 1
    preview = formatted[0]["content_preview"]
    assert len(preview) <= 203  # 200 + "..."
    assert preview.endswith("...")


def test_format_sources_handles_missing_metadata(ai_service):
    """Test source formatting handles documents with missing metadata."""
    doc_no_metadata = Document(
        page_content="Test content",
        metadata={}
    )
    
    formatted = ai_service._format_sources([doc_no_metadata])
    
    assert len(formatted) == 1
    assert formatted[0]["title"] == "Untitled Document"
    assert formatted[0]["source_type"] == "unknown"


def test_format_sources_empty_list(ai_service):
    """Test formatting empty source list."""
    formatted = ai_service._format_sources([])
    assert formatted == []


# ============================================================================
# Test: Language Support
# ============================================================================

def test_get_supported_languages(ai_service):
    """Test service reports supported languages."""
    languages = ai_service.get_supported_languages()
    assert "tr" in languages
    assert "en" in languages


def test_switch_language_to_english(ai_service):
    """Test switching prompt template to English."""
    success = ai_service.switch_language("en")
    
    assert success is True
    assert ai_service.current_language == "en"
    
    # Verify prompt template changes
    prompt = ai_service._get_prompt_template()
    prompt_str = str(prompt.messages[0].prompt.template)
    assert "KAMPÜS+ AI Assistant" in prompt_str


def test_switch_language_to_turkish(ai_service):
    """Test switching prompt template to Turkish."""
    # First switch to English
    ai_service.switch_language("en")
    
    # Then switch back to Turkish
    success = ai_service.switch_language("tr")
    
    assert success is True
    assert ai_service.current_language == "tr"
    
    # Verify prompt template changes
    prompt = ai_service._get_prompt_template()
    prompt_str = str(prompt.messages[0].prompt.template)
    assert "KAMPÜS+ AI Asistanısın" in prompt_str


def test_switch_language_unsupported(ai_service):
    """Test switching to unsupported language fails gracefully."""
    original_lang = ai_service.current_language
    success = ai_service.switch_language("fr")  # French not supported
    
    assert success is False
    # Original language should remain
    assert ai_service.current_language == original_lang


# ============================================================================
# Test: Anonymization (Placeholder)
# ============================================================================

def test_anonymize_text_placeholder(ai_service):
    """Test anonymization placeholder (returns text as-is for now)."""
    text_with_pii = "Merhaba, ben Ayşe Demir, email: ayse@university.edu.tr"
    
    result = ai_service._anonymize_text(text_with_pii)
    
    # Current placeholder implementation returns text unchanged
    # TODO: Update this test when T032 anonymization is implemented
    assert result == text_with_pii


# ============================================================================
# Test: Hybrid Retriever
# ============================================================================

def test_create_hybrid_retriever_for_user(ai_service, sample_user_id):
    """Test hybrid retriever is created with user ID."""
    retriever = ai_service._create_hybrid_retriever(user_id=sample_user_id)
    
    assert retriever is not None
    assert retriever.user_id == sample_user_id


def test_create_hybrid_retriever_without_user(ai_service):
    """Test hybrid retriever works without user ID (official docs only)."""
    retriever = ai_service._create_hybrid_retriever(user_id=None)
    
    assert retriever is not None
    assert retriever.user_id is None


@pytest.mark.asyncio
async def test_hybrid_retriever_placeholder_implementation(ai_service, sample_user_id):
    """Test hybrid retriever placeholder returns empty results."""
    retriever = ai_service._create_hybrid_retriever(user_id=sample_user_id)
    
    # Current placeholder returns empty list
    results = await retriever._aget_relevant_documents("test query")
    assert results == []
    
    # TODO: Update this test when T064 implements proper hybrid retrieval


# ============================================================================
# Test: Context Window Management
# ============================================================================

def test_context_window_respects_limit(ai_service):
    """Test context window only keeps last N exchanges."""
    # Create history with 8 exchanges (more than limit of 5)
    history = [
        {"question": f"Q{i}", "answer": f"A{i}"}
        for i in range(8)
    ]
    
    messages = ai_service._format_chat_history(history)
    
    # Should only contain last 5 exchanges (10 messages total: 5 Q + 5 A)
    assert len(messages) <= 10


def test_context_window_empty_history(ai_service):
    """Test context window with no history."""
    messages = ai_service._format_chat_history([])
    
    assert messages == []


def test_format_chat_history_correct_types(ai_service, sample_session_history):
    """Test chat history is formatted to LangChain message objects."""
    from langchain_core.messages import HumanMessage, AIMessage
    
    messages = ai_service._format_chat_history(sample_session_history)
    
    assert len(messages) == 4  # 2 exchanges = 2 questions + 2 answers
    assert isinstance(messages[0], HumanMessage)
    assert isinstance(messages[1], AIMessage)


# ============================================================================
# Test: Integration with Vector Service
# ============================================================================

def test_ai_service_uses_vector_service(mock_vector_service):
    """Test AIService integrates with VectorStoreService."""
    with patch('src.services.ai_service.ChatGoogleGenerativeAI'), \
         patch('src.services.ai_service.GoogleGenerativeAIEmbeddings'):
        service = AIService(vector_service=mock_vector_service)
        
        assert service.vector_service is mock_vector_service


def test_ai_service_creates_default_vector_service():
    """Test AIService creates VectorStoreService if not provided."""
    with patch('src.services.ai_service.ChatGoogleGenerativeAI'), \
         patch('src.services.ai_service.GoogleGenerativeAIEmbeddings'), \
         patch('src.services.ai_service.VectorStoreService') as mock_vs_class:
        
        service = AIService()
        
        # Should create new VectorStoreService instance
        mock_vs_class.assert_called_once()


# ============================================================================
# Test: Session ID Tracking
# ============================================================================

@pytest.mark.asyncio
async def test_query_returns_session_id(ai_service, sample_user_id):
    """Test query preserves session ID in response."""
    session_id = "session-abc-123"
    
    mock_chain = AsyncMock()
    mock_chain.ainvoke = AsyncMock(return_value="Test answer")
    
    mock_retriever = AsyncMock()
    mock_retriever.aget_relevant_documents = AsyncMock(return_value=[])
    
    with patch.object(ai_service, '_create_rag_chain', return_value=mock_chain), \
         patch.object(ai_service, '_create_hybrid_retriever', return_value=mock_retriever):
        result = await ai_service.query(
            question="Test",
            user_id=sample_user_id,
            session_id=session_id
        )
    
    assert result["session_id"] == session_id


@pytest.mark.asyncio
async def test_query_without_session_id(ai_service, sample_user_id):
    """Test query works without session ID."""
    mock_chain = AsyncMock()
    mock_chain.ainvoke = AsyncMock(return_value="Test answer")
    
    mock_retriever = AsyncMock()
    mock_retriever.aget_relevant_documents = AsyncMock(return_value=[])
    
    with patch.object(ai_service, '_create_rag_chain', return_value=mock_chain), \
         patch.object(ai_service, '_create_hybrid_retriever', return_value=mock_retriever):
        result = await ai_service.query(
            question="Test",
            user_id=sample_user_id
        )
    
    assert result["session_id"] is None
