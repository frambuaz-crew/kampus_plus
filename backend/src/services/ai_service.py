"""AI Service - KAMPÜS+ Platform RAG tabanlı konuşma AI'sı.

Spec: specs/009-ai-assistant/spec.md
AI sadece kampüs bilgileri ve platform navigasyonu konusunda yardımcı olur.
Akademik ders içerikleri hakkında yardım VERMEZ.
"""

import logging
from operator import itemgetter
from typing import List, Dict, Optional, Any
from uuid import UUID

from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_core.retrievers import BaseRetriever
from langchain_core.runnables import RunnableSerializable
from langchain_core.output_parsers import StrOutputParser

from src.core.config import settings
from src.services.vector_service import VectorStoreService


logger = logging.getLogger(__name__)


class AIService:
    """RAG tabanlı konuşma AI servisi."""
    
    CONTEXT_WINDOW_SIZE = 5
    
    TURKISH_SYSTEM_PROMPT = """Sen KAMPÜS+ AI Asistanısın. Üniversite öğrencilerine kampüs bilgileri ve platform navigasyonu konusunda yardımcı oluyorsun.

ÖNEMLİ: Akademik ders içerikleri hakkında yardım VERME. Sadece kampüs bilgileri (akademik takvim, ders programı, forum, pazar, kariyer) hakkında bilgi ver.

Bağlam Bilgisi:
{context}

Yanıt Kuralları:
1. SADECE verilen bağlam bilgisini kullan
2. Eğer cevap bağlamda yoksa, bilmediğini söyle
3. Türkçe ve anlaşılır şekilde yanıt ver
4. Kaynak belirt (resmi doküman, forum, pazar, kariyer)
5. Yanıtın sonunda kullandığın kaynakları listele"""

    ENGLISH_SYSTEM_PROMPT = """You are KAMPÜS+ AI Assistant. You help university students with campus information and platform navigation.

IMPORTANT: Do NOT help with academic course content. Only provide information about campus info (academic calendar, course schedule, forum, marketplace, career).

Context Information:
{context}

Response Rules:
1. ONLY use the provided context information
2. If answer is not in context, say you don't know
3. Respond clearly and helpfully
4. Indicate source type (official document, forum, marketplace, career)
5. List sources used at the end of your response"""
    
    def __init__(self, vector_service: Optional[VectorStoreService] = None):
        """AI servisini başlat."""
        self.vector_service = vector_service or VectorStoreService()
        
        self.llm = ChatGoogleGenerativeAI(
            model=settings.gemini_model,
            temperature=settings.gemini_temperature,
            max_output_tokens=settings.gemini_max_tokens,
            google_api_key=settings.google_api_key,
            convert_system_message_to_human=True
        )
        logger.info(f"AIService initialized with Gemini ({settings.gemini_model})")
        
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=settings.google_api_key
        )
        
        self.current_language = "tr"
    
    def _get_prompt_template(self) -> ChatPromptTemplate:
        """Mevcut dil için prompt şablonu al."""
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
        """Alınan dokümanları bağlam string'ine dönüştür."""
        if not docs:
            return "İlgili bilgi bulunamadı."
        
        context_parts = []
        for i, doc in enumerate(docs, 1):
            title = doc.metadata.get("title", "Başlıksız")
            source_type = doc.metadata.get("source_type", "bilinmeyen")
            content = doc.page_content
            
            context_parts.append(
                f"[Kaynak {i} - {source_type}] {title}:\n{content}\n"
            )
        
        return "\n".join(context_parts)
    
    def _format_chat_history(self, history: List[Dict[str, str]]) -> List[BaseMessage]:
        """Konuşma geçmişini LangChain mesaj objelerine dönüştür.
        
        Son CONTEXT_WINDOW_SIZE (5) mesaj değişimini tutar.
        """
        messages = []
        recent_history = history[-self.CONTEXT_WINDOW_SIZE:] if history else []
        
        for exchange in recent_history:
            if "question" in exchange:
                messages.append(HumanMessage(content=exchange["question"]))
            if "answer" in exchange:
                messages.append(AIMessage(content=exchange["answer"]))
        
        return messages
    
    def _create_retriever(self) -> BaseRetriever:
        """Resmi dokümanlar için retriever oluştur."""
        class OfficialRetriever(BaseRetriever):
            """Resmi dokümanlar için retriever."""
            vector_service: VectorStoreService
            k: int = 5
            
            def __init__(self, vector_service: VectorStoreService, k: int = 5):
                super().__init__(vector_service=vector_service, k=k)
            
            def _get_relevant_documents(self, query: str) -> List[Document]:
                raise NotImplementedError("Use _aget_relevant_documents instead")
            
            async def _aget_relevant_documents(self, query: str) -> List[Document]:
                """Resmi dokümanlardan ilgili dokümanları al."""
                official_results = await self.vector_service.search_official(query, k=self.k)
                
                documents = []
                for idx, distance in official_results:
                    metadata = self.vector_service.official_metadata.get(idx, {})
                    content = metadata.get("text", "")
                    if content:
                        doc = Document(
                            page_content=content,
                            metadata={
                                "source_type": "official",
                                "title": metadata.get("title", "Resmi Doküman"),
                                "distance": distance,
                                "index_id": idx,
                                **{k: v for k, v in metadata.items() if k != "text"}
                            }
                        )
                        documents.append(doc)
                
                documents.sort(key=lambda d: d.metadata.get("distance", float("inf")))
                return documents[:self.k]
        
        return OfficialRetriever(
            vector_service=self.vector_service,
            k=settings.vector_search_k
        )
    
    def _create_rag_chain(self) -> RunnableSerializable:
        """LCEL kullanarak RAG chain oluştur."""
        retriever = self._create_retriever()
        prompt = self._get_prompt_template()
        
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
    ) -> Dict[str, Any]:
        """Kullanıcı sorgusunu işle ve AI yanıtı döndür.
        
        Args:
            question: Kullanıcının sorusu
            user_id: Kullanıcı ID'si
            session_id: Oturum ID'si (opsiyonel)
            session_history: Önceki konuşma geçmişi
        
        Returns:
            answer: AI yanıtı
            sources: Kaynak dokümanlar listesi
            session_id: Oturum ID'si
        """
        try:
            chat_history = self._format_chat_history(session_history or [])
            chain = self._create_rag_chain()
            
            retriever = self._create_retriever()
            source_docs = await retriever._aget_relevant_documents(question)
            
            answer = await chain.ainvoke({
                "question": question,
                "chat_history": chat_history
            })
            
            formatted_sources = self._format_sources(source_docs)
            
            return {
                "answer": answer,
                "sources": formatted_sources,
                "session_id": session_id,
            }
            
        except Exception as e:
            logger.error(f"Error processing query for user {user_id}: {e}", exc_info=True)
            return {
                "answer": "Üzgünüm, sorunu işlerken bir hata oluştu. Lütfen daha sonra tekrar deneyin.",
                "sources": [],
                "session_id": session_id,
                "error": str(e)
            }
    
    def _format_sources(self, documents: List[Document]) -> List[Dict[str, Any]]:
        """Kaynak dokümanları API yanıtı için formatla."""
        formatted = []
        
        for doc in documents:
            metadata = doc.metadata or {}
            source_type = metadata.get("source_type", "official")
            
            content = doc.page_content or ""
            content_preview = content[:200] + "..." if len(content) > 200 else content
            
            source = {
                "title": metadata.get("title", "Başlıksız Doküman"),
                "source_type": source_type,
                "content_preview": content_preview,
                "metadata": {
                    "document_id": metadata.get("document_id"),
                    "upload_date": metadata.get("upload_date"),
                }
            }
            
            formatted.append(source)
        
        return formatted
    
    def get_supported_languages(self) -> List[str]:
        """Desteklenen dilleri döndür."""
        return ["tr", "en"]
    
    def switch_language(self, language: str) -> bool:
        """Prompt şablonu dilini değiştir."""
        if language in ["tr", "en"]:
            self.current_language = language
            logger.info(f"Switched language to {language}")
            return True
        else:
            logger.warning(f"Unsupported language: {language}")
            return False
