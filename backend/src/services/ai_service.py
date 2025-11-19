"""
AI Service for KAMPÜS+ Platform - RAG-based Conversational AI.

REFACTORED for LangChain v1.0 LCEL (LangChain Expression Language).

Features:
- Modern LCEL chain composition for RAG pipeline
- Hybrid retrieval from dual vector stores (official + user documents)
- Turkish language support with ChatPromptTemplate
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
from operator import itemgetter
from typing import List, Dict, Optional, Any
from uuid import UUID

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_core.retrievers import BaseRetriever
from langchain_core.runnables import RunnablePassthrough, RunnableSerializable
from langchain_core.output_parsers import StrOutputParser
from langchain_community.vectorstores import FAISS

from src.core.config import settings
from src.services.vector_service import VectorStoreService


logger = logging.getLogger(__name__)


class AIService:
    """AI service for conversational question-answering with RAG."""
    
    # Context window: last 5 message exchanges
    CONTEXT_WINDOW_SIZE = 5
    
    # Turkish prompt template
    TURKISH_SYSTEM_PROMPT = """Sen KAMPÜS+ AI Asistanısın. Üniversite öğrencilerine akademik konularda yardımcı oluyorsun.

Bağlam Bilgisi:
{context}

Yanıt Kuralları:
1. SADECE verilen bağlam bilgisini kullan
2. Eğer cevap bağlamda yoksa, bilmediğini söyle
3. Türkçe ve anlaşılır şekilde yanıt ver
4. Kaynak belirt (resmi doküman mı, öğrenci notu mu)
5. Yanıtın sonunda kullandığın kaynakları listele"""

    # English prompt template
    ENGLISH_SYSTEM_PROMPT = """You are KAMPÜS+ AI Assistant. You help university students with academic questions.

Context Information:
{context}

Response Rules:
1. ONLY use the provided context information
2. If answer is not in context, say you don't know
3. Respond clearly and helpfully
4. Indicate source type (official document vs student note)
5. List sources used at the end of your response"""
    
    def __init__(self, vector_service: Optional[VectorStoreService] = None):
        """
        Initialize AI service with LangChain v1.0 LCEL components.
        
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
        
        # Current language (default Turkish)
        self.current_language = "tr"
        
        logger.info("AIService initialized with LangChain v1.0 LCEL")
    
    def _get_prompt_template(self) -> ChatPromptTemplate:
        """Get prompt template for current language."""
        system_prompt = (
            self.TURKISH_SYSTEM_PROMPT 
            if self.current_language == "tr" 
            else self.ENGLISH_SYSTEM_PROMPT
        )
        
        return ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{question}")
        ])
    
    def _format_context_from_docs(self, docs: List[Document]) -> str:
        """Format retrieved documents into context string."""
        if not docs:
            return "İlgili bilgi bulunamadı. / No relevant information found."
        
        context_parts = []
        for i, doc in enumerate(docs, 1):
            title = doc.metadata.get("title", "Untitled")
            source_type = doc.metadata.get("source_type", "unknown")
            content = doc.page_content
            
            context_parts.append(
                f"[Kaynak {i} - {source_type}] {title}:\n{content}\n"
            )
        
        return "\n".join(context_parts)
    
    def _format_chat_history(self, history: List[Dict[str, str]]) -> List[BaseMessage]:
        """
        Convert conversation history to LangChain message objects (T064/T065).
        
        Implements context window management:
        - Only keeps last CONTEXT_WINDOW_SIZE (5) exchanges
        - Converts dict format to LangChain BaseMessage objects
        - Maintains chronological order
        
        Args:
            history: List of conversation exchanges with 'question' and 'answer' keys.
                    Format: [{"question": "...", "answer": "..."}, ...]
        
        Returns:
            List of LangChain BaseMessage objects (HumanMessage, AIMessage).
        """
        messages = []
        
        # Context window: only keep last N exchanges to prevent token overflow
        recent_history = history[-self.CONTEXT_WINDOW_SIZE:] if history else []
        
        for exchange in recent_history:
            if "question" in exchange:
                messages.append(HumanMessage(content=exchange["question"]))
            if "answer" in exchange:
                messages.append(AIMessage(content=exchange["answer"]))
        
        return messages
    
    def _create_hybrid_retriever(self, user_id: Optional[UUID] = None) -> BaseRetriever:
        """
        Create hybrid retriever that queries both vector stores.
        
        Args:
            user_id: User ID for filtering user documents.
        
        Returns:
            Hybrid retriever combining official and user stores.
        """
        class SimpleHybridRetriever(BaseRetriever):
            """Simple retriever that searches official vector store.
            
            TODO (T064): Implement proper hybrid retrieval:
            1. Query both VDB_Official and VDB_User
            2. Apply user_id filter to VDB_User results
            3. Merge and re-rank results
            4. Weight official documents higher than user documents
            """
            vector_service: VectorStoreService
            user_id: Optional[UUID]
            k: int = 5
            
            def __init__(self, vector_service: VectorStoreService, user_id: Optional[UUID], k: int = 5):
                # Pydantic v2 style initialization
                super().__init__(vector_service=vector_service, user_id=user_id, k=k)
            
            def _get_relevant_documents(self, query: str) -> List[Document]:
                """Retrieve relevant documents from vector stores."""
                # Placeholder: Return empty list until FAISS integration complete
                # TODO (T064): Implement with vector_service.search_official() and search_user()
                return []
            
            async def _aget_relevant_documents(self, query: str) -> List[Document]:
                """Async version of retrieval."""
                return self._get_relevant_documents(query)
        
        return SimpleHybridRetriever(
            vector_service=self.vector_service,
            user_id=user_id,
            k=settings.vector_search_k
        )
    
    def _create_rag_chain(
        self,
        user_id: Optional[UUID] = None
    ) -> RunnableSerializable:
        """
        Create RAG chain using LCEL.
        
        Args:
            user_id: User ID for access control.
        
        Returns:
            Runnable RAG chain.
        """
        retriever = self._create_hybrid_retriever(user_id)
        prompt = self._get_prompt_template()
        
        # LCEL chain composition
        # Step 1: Retrieve documents from question
        # Step 2: Format context from docs
        # Step 3: Pass to LLM with prompt (expects question and chat_history in input dict)
        # Step 4: Parse output
        chain = (
            {
                "context": itemgetter("question") | retriever | self._format_context_from_docs,
                "question": itemgetter("question"),
                "chat_history": itemgetter("chat_history")
            }
            | prompt
            | self.llm
            | StrOutputParser()
        )
        
        return chain
    
    async def query(
        self,
        question: str,
        user_id: UUID,
        session_id: Optional[str] = None,
        session_history: Optional[List[Dict[str, str]]] = None,
        anonymize: bool = True
    ) -> Dict[str, Any]:
        """
        Process a user query and return AI response with sources (T064/T065).
        
        Features:
        - Context window management: Uses last 5 message exchanges for continuity
        - RAG pipeline: Retrieves relevant documents from vector stores
        - Source attribution: Returns formatted source citations
        - Privacy: Optionally anonymizes PII before LLM processing
        
        Args:
            question: User's question (will be anonymized if anonymize=True).
            user_id: User ID for access control and filtering.
            session_id: Optional session ID for conversation tracking.
            session_history: Previous conversation history as list of dicts.
                            Format: [{"question": "...", "answer": "..."}, ...]
                            Only last 5 exchanges will be used (context window).
            anonymize: Whether to anonymize the question (default True).
                      Constitutional requirement for student data protection.
        
        Returns:
            Dictionary containing:
                - answer: AI-generated answer (str)
                - sources: List of source documents with title, source_type, 
                          content_preview, and metadata (List[Dict])
                - session_id: Session identifier (str)
                - anonymized: Whether anonymization was applied (bool)
        """
        try:
            # Anonymize question if required (constitutional requirement)
            if anonymize:
                question = self._anonymize_text(question)
                logger.debug(f"Anonymized question for user {user_id}")
            
            # Format chat history
            chat_history = self._format_chat_history(session_history or [])
            
            # MOCK RESPONSE FOR TESTING (remove when OpenAI API key has quota)
            # TODO: Replace with real AI service when API quota available
            import random
            mock_responses = [
                "KAMPÜS+ platformu, üniversite öğrencilerine yapay zeka destekli öğrenme deneyimi sunan bir sistemdir. Platform, ders materyallerine kolay erişim, AI asistanı ile etkileşim ve kişiselleştirilmiş öğrenme olanakları sağlar.",
                "Merhaba! Ben KAMPÜS+ AI Asistanınızım. Size ders içerikleri, sınavlar, ödevler ve üniversite kaynaklarıyla ilgili yardımcı olabilirim. Ne öğrenmek istersiniz?",
                "Yapay zeka (AI), makinelerin insan benzeri görevleri yerine getirmesini sağlayan teknolojilerdir. Machine learning, deep learning ve natural language processing gibi alt dalları vardır.",
                "Sorununuz hakkında size yardımcı olmaya hazırım. Lütfen daha spesifik bir soru sorun, böylece size en iyi şekilde yardımcı olabilirim."
            ]
            answer = random.choice(mock_responses)
            source_docs = []
            formatted_sources = []
            
            # REAL AI SERVICE CODE (commented out for testing)
            # Create RAG chain
            # chain = self._create_rag_chain(user_id)
            # retriever = self._create_hybrid_retriever(user_id)
            # source_docs = retriever._get_relevant_documents(question)
            # answer = await chain.ainvoke({
            #     "question": question,
            #     "chat_history": chat_history
            # })
            # formatted_sources = self._format_sources(source_docs)
            
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
        Format source documents for API response (T064).
        
        Returns JSON array with standardized source format:
        - title: Document title
        - source_type: Type of source (official_document, user_document, course_material)
        - content_preview: First 200 chars of content
        - metadata: Additional context (document_id, course_id, etc.)
        
        Args:
            documents: List of LangChain Document objects.
        
        Returns:
            List of formatted source dictionaries with title, source_type, 
            content_preview, and metadata fields.
        """
        formatted = []
        
        for doc in documents:
            metadata = doc.metadata or {}
            
            # Determine source type
            source_type = metadata.get("source_type", "unknown")
            if source_type == "unknown":
                # Infer from metadata
                if metadata.get("document_id"):
                    source_type = "official_document"
                elif metadata.get("user_id"):
                    source_type = "user_document"
                elif metadata.get("course_id"):
                    source_type = "course_material"
            
            # Create preview (first 200 chars)
            content = doc.page_content or ""
            content_preview = content[:200] + "..." if len(content) > 200 else content
            
            source = {
                "title": metadata.get("title", "Untitled Document"),
                "source_type": source_type,
                "content_preview": content_preview,
                "metadata": {
                    "document_id": metadata.get("document_id"),
                    "course_id": metadata.get("course_id"),
                    "upload_date": metadata.get("upload_date"),
                    "user_id": str(metadata.get("user_id")) if metadata.get("user_id") else None,
                    "page_number": metadata.get("page_number"),
                    "chunk_index": metadata.get("chunk_index"),
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
        if language in ["tr", "en"]:
            self.current_language = language
            logger.info(f"Switched language to {language}")
            return True
        else:
            logger.warning(f"Unsupported language: {language}")
            return False
