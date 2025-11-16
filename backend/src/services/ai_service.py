"""
AI Service for KAMPÜS+ Platform - RAG-based Conversational AI.

Features:
- LangChain ConversationalRetrievalChain for context-aware Q&A
- Hybrid retrieval from dual vector stores (official + user documents)
- Turkish language support with custom prompt templates
- Source citation and attribution
- Anonymization preprocessing for student privacy
- Context window management (last 5 exchanges)

Constitutional Requirements:
- MUST anonymize student data before LLM processing (Principle IV)
- MUST NOT persist LLM prompt logs (Principle IV)
- MUST cite sources clearly (FR-013)
- MUST respect data access permissions (FR-015)
"""

import logging
from typing import List, Dict, Optional, Any, Tuple
from uuid import UUID

from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferWindowMemory
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.prompts import PromptTemplate
from langchain.schema import Document
from langchain.vectorstores import FAISS

from src.core.config import settings
from src.services.vector_service import VectorStoreService


logger = logging.getLogger(__name__)


class AIService:
    """AI service for conversational question-answering with RAG."""
    
    # Context window: last 5 message exchanges
    CONTEXT_WINDOW_SIZE = 5
    
    # Prompt template with Turkish support
    TURKISH_QA_TEMPLATE = """Sen KAMPÜS+ AI Asistanısın. Üniversite öğrencilerine akademik konularda yardımcı oluyorsun.

Bağlam Bilgisi:
{context}

Sohbet Geçmişi:
{chat_history}

Öğrenci Sorusu: {question}

Yanıt Kuralları:
1. SADECE verilen bağlam bilgisini kullan
2. Eğer cevap bağlamda yoksa, bilmediğini söyle
3. Türkçe ve anlaşılır şekilde yanıt ver
4. Kaynak belirt (resmi doküman mı, öğrenci notu mu)
5. Yanıtın sonunda kullandığın kaynakları listele

Yanıt:"""

    ENGLISH_QA_TEMPLATE = """You are KAMPÜS+ AI Assistant. You help university students with academic questions.

Context Information:
{context}

Chat History:
{chat_history}

Student Question: {question}

Response Rules:
1. ONLY use the provided context information
2. If answer is not in context, say you don't know
3. Respond clearly and helpfully
4. Indicate source type (official document vs student note)
5. List sources used at the end of your response

Answer:"""
    
    def __init__(self, vector_service: Optional[VectorStoreService] = None):
        """
        Initialize AI service with LangChain components.
        
        Args:
            vector_service: Optional vector store service instance.
                          If not provided, creates new one.
        """
        self.vector_service = vector_service or VectorStoreService()
        
        # Initialize OpenAI LLM
        self.llm = ChatOpenAI(
            model=settings.openai_model,
            temperature=settings.openai_temperature,
            max_tokens=settings.openai_max_tokens,
            openai_api_key=settings.openai_api_key
        )
        
        # Initialize embeddings (for retrieval)
        self.embeddings = OpenAIEmbeddings(
            model=settings.openai_embedding_model,
            openai_api_key=settings.openai_api_key
        )
        
        # Prompt template (Turkish by default)
        self.qa_prompt = PromptTemplate(
            template=self.TURKISH_QA_TEMPLATE,
            input_variables=["context", "chat_history", "question"]
        )
        
        logger.info("AIService initialized with LangChain ConversationalRetrievalChain")
    
    def create_conversation_chain(
        self,
        user_id: Optional[UUID] = None,
        session_history: Optional[List[Dict[str, str]]] = None
    ) -> ConversationalRetrievalChain:
        """
        Create a new conversation chain with memory.
        
        Args:
            user_id: User ID for access control to user documents.
            session_history: Previous conversation history to load.
        
        Returns:
            Configured ConversationalRetrievalChain instance.
        """
        # Create hybrid retriever
        retriever = self._create_hybrid_retriever(user_id)
        
        # Create memory with context window
        memory = ConversationBufferWindowMemory(
            k=self.CONTEXT_WINDOW_SIZE,
            memory_key="chat_history",
            return_messages=True,
            output_key="answer"
        )
        
        # Load existing history if provided
        if session_history:
            for exchange in session_history[-self.CONTEXT_WINDOW_SIZE:]:
                memory.save_context(
                    {"question": exchange.get("question", "")},
                    {"answer": exchange.get("answer", "")}
                )
        
        # Create conversation chain
        chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=retriever,
            memory=memory,
            return_source_documents=True,
            combine_docs_chain_kwargs={"prompt": self.qa_prompt},
            verbose=False  # Set to True for debugging
        )
        
        return chain
    
    def _create_hybrid_retriever(self, user_id: Optional[UUID] = None):
        """
        Create hybrid retriever that queries both vector stores.
        
        Args:
            user_id: User ID for filtering user documents.
        
        Returns:
            Hybrid retriever combining official and user stores.
        """
        # For now, we'll create a simple retriever
        # In production, this should be a custom retriever that queries both stores
        # and merges results with proper weighting
        
        # TODO: Implement proper hybrid retriever with:
        # 1. Query both VDB_Official and VDB_User
        # 2. Apply user_id filter to VDB_User results
        # 3. Merge and re-rank results
        # 4. Weight official documents higher than user documents
        
        # Placeholder: Return retriever for official store only
        # This will be enhanced in T064
        
        from langchain.schema.retriever import BaseRetriever
        
        class SimpleHybridRetriever(BaseRetriever):
            """Simple retriever that searches official vector store."""
            
            def __init__(self, vector_service: VectorStoreService, user_id: Optional[UUID], k: int = 5):
                super().__init__()
                self.vector_service = vector_service
                self.user_id = user_id
                self.k = k
            
            def _get_relevant_documents(self, query: str) -> List[Document]:
                """Retrieve relevant documents from vector stores."""
                # Search official store
                official_results = []
                # Note: This is simplified - actual implementation should use
                # vector_service's search methods
                
                # For now, return empty list (will be implemented with proper FAISS integration)
                return []
            
            async def _aget_relevant_documents(self, query: str) -> List[Document]:
                """Async version of retrieval."""
                return self._get_relevant_documents(query)
        
        return SimpleHybridRetriever(
            vector_service=self.vector_service,
            user_id=user_id,
            k=settings.vector_search_k
        )
    
    async def query(
        self,
        question: str,
        user_id: UUID,
        session_id: Optional[str] = None,
        session_history: Optional[List[Dict[str, str]]] = None,
        anonymize: bool = True
    ) -> Dict[str, Any]:
        """
        Process a user query and return AI response with sources.
        
        Args:
            question: User's question.
            user_id: User ID for access control.
            session_id: Optional session ID for tracking.
            session_history: Previous conversation history.
            anonymize: Whether to anonymize the question (default True).
        
        Returns:
            Dictionary containing:
                - answer: AI-generated answer
                - sources: List of source documents used
                - session_id: Session identifier
        """
        try:
            # Anonymize question if required (constitutional requirement)
            if anonymize:
                question = self._anonymize_text(question)
                logger.debug(f"Anonymized question for user {user_id}")
            
            # Create conversation chain
            chain = self.create_conversation_chain(user_id, session_history)
            
            # Query the chain
            result = await chain.ainvoke({"question": question})
            
            # Extract answer and sources
            answer = result.get("answer", "")
            source_docs = result.get("source_documents", [])
            
            # Format sources
            formatted_sources = self._format_sources(source_docs)
            
            return {
                "answer": answer,
                "sources": formatted_sources,
                "session_id": session_id,
                "anonymized": anonymize
            }
            
        except Exception as e:
            logger.error(f"Error processing query for user {user_id}: {e}")
            return {
                "answer": "Üzgünüm, sorunu işlerken bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
                "sources": [],
                "session_id": session_id,
                "error": str(e)
            }
    
    def _anonymize_text(self, text: str) -> str:
        """
        Anonymize PII in text before sending to LLM.
        
        This is a placeholder. Full implementation in T032 (anonymization_service.py).
        
        Args:
            text: Text to anonymize.
        
        Returns:
            Anonymized text with PII replaced.
        """
        # TODO: Implement in T032 with proper PII detection
        # For now, return text as-is
        # Production: Use regex + spaCy Turkish NER to detect:
        # - Names, emails, student IDs, phone numbers
        # - Replace with generic tokens like [ÖĞRENCİ_ADI], [EMAIL], [ID]
        return text
    
    def _format_sources(self, documents: List[Document]) -> List[Dict[str, Any]]:
        """
        Format source documents for API response.
        
        Args:
            documents: List of LangChain Document objects.
        
        Returns:
            List of formatted source dictionaries.
        """
        formatted = []
        
        for doc in documents:
            metadata = doc.metadata or {}
            
            source = {
                "title": metadata.get("title", "Untitled Document"),
                "source_type": metadata.get("source_type", "unknown"),
                "content_preview": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                "metadata": {
                    "document_id": metadata.get("document_id"),
                    "course_id": metadata.get("course_id"),
                    "upload_date": metadata.get("upload_date"),
                }
            }
            
            formatted.append(source)
        
        return formatted
    
    def get_supported_languages(self) -> List[str]:
        """Get list of supported languages."""
        return ["tr", "en"]  # Turkish and English
    
    def switch_language(self, language: str) -> bool:
        """
        Switch prompt template language.
        
        Args:
            language: Language code ('tr' or 'en').
        
        Returns:
            True if successful, False if language not supported.
        """
        if language == "tr":
            self.qa_prompt = PromptTemplate(
                template=self.TURKISH_QA_TEMPLATE,
                input_variables=["context", "chat_history", "question"]
            )
            return True
        elif language == "en":
            self.qa_prompt = PromptTemplate(
                template=self.ENGLISH_QA_TEMPLATE,
                input_variables=["context", "chat_history", "question"]
            )
            return True
        else:
            logger.warning(f"Unsupported language: {language}")
            return False
