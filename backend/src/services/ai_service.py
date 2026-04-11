"""AI Service - KAMPÜS+ Platform RAG tabanlı konuşma AI'sı.

Spec: specs/009-ai-assistant/spec.md
AI sadece kampüs bilgileri ve platform navigasyonu konusunda yardımcı olur.
Akademik ders içerikleri hakkında yardım VERMEZ.
"""

import asyncio
import logging
from pathlib import Path
import re
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
    ACADEMIC_GUARDRAIL_RESPONSE = (
        "Üzgünüm, ben bir kampüs asistanıyım. Sadece üniversite hayatı, kampüs imkanları ve etkinlikler "
        "hakkında bilgi verebilirim. Ders veya ödev konularında yardımcı olamıyorum."
    )
    
    TURKISH_SYSTEM_PROMPT = """Sen KAMPÜS+ AI Asistanısın. Üniversite öğrencilerine kampüs bilgileri ve platform navigasyonu konusunda yardımcı oluyorsun.

ÖNEMLİ: Akademik ders içerikleri hakkında yardım VERME. Sadece kampüs bilgileri (akademik takvim, ders programı, forum, pazar, kariyer) hakkında bilgi ver.

Bağlam Bilgisi:
{context}

Yanıt Kuralları:
1. Yalnızca yukarıdaki bağlam bilgisini kullan. Bağlamda olmayan hiçbir şeyi uydurma veya tahmin etme. Bilgi yoksa "Bu bilgiye ulaşamıyorum." de.
2. Kullanıcı "Merhaba", "Naber", "Selam" gibi günlük bir selamlama yazarsa bağlamı görmezden gel ve sadece samimi, kısa bir selamla karşılık ver.
3. Türkçe ve anlaşılır şekilde yanıt ver.
4. Kaynakları robotik bir liste olarak değil, yanıtın içine doğal bir dille yedirerek belirt (örn. "… akademik takvim dokümanına göre …")."""

    ENGLISH_SYSTEM_PROMPT = """You are KAMPÜS+ AI Assistant. You help university students with campus information and platform navigation.

IMPORTANT: Do NOT help with academic course content. Only provide information about campus info (academic calendar, course schedule, forum, marketplace, career).

Context Information:
{context}

Response Rules:
1. Use ONLY the provided context above. Never fabricate or guess information not present in it. If the information is absent, say "I don't have access to that information."
2. If the user sends a casual greeting like "Hi", "Hello", or "Hey", ignore the context and simply reply with a friendly greeting.
3. Respond clearly and helpfully.
4. Weave source references naturally into your response rather than listing them robotically at the end (e.g. "… according to the academic calendar document …")."""
    
    def __init__(self, vector_service: Optional[VectorStoreService] = None):
        """AI servisini başlat."""
        self.vector_service = vector_service or VectorStoreService()

        self._active_model = self._normalize_model_name(settings.gemini_model)
        self.llm = self._create_llm(self._active_model)
        logger.info(f"AIService initialized with Gemini ({self._active_model})")
        
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=settings.google_api_key
        )
        
        self.current_language = "tr"

    @staticmethod
    def _normalize_model_name(model_name: str) -> str:
        """Gemini model adını provider'ın beklediği formata normalize et."""
        normalized = (model_name or "").strip()
        if normalized.startswith("models/"):
            normalized = normalized.split("/", 1)[1]
        return normalized or "gemini-2.5-flash"

    LLM_REQUEST_TIMEOUT = 40  # saniye – Gemini API başına hard limit
    QUERY_TOTAL_TIMEOUT = 45  # saniye – toplam query() hard limit

    def _create_llm(self, model_name: str) -> ChatGoogleGenerativeAI:
        """LangChain Gemini LLM istemcisini oluştur."""
        return ChatGoogleGenerativeAI(
            model=model_name,
            temperature=settings.gemini_temperature,
            max_output_tokens=settings.gemini_max_tokens,
            google_api_key=settings.google_api_key,
            convert_system_message_to_human=True,
            request_timeout=self.LLM_REQUEST_TIMEOUT,
        )

    def _is_model_not_found_error(self, error: Exception) -> bool:
        """Hatanın model-adı kaynaklı olup olmadığını tespit et."""
        error_text = str(error).lower()
        return (
            "model" in error_text
            and (
                "not found" in error_text
                or "unsupported" in error_text
                or "isn't supported" in error_text
                or "404" in error_text
            )
        )

    def _is_api_key_error(self, error: Exception) -> bool:
        """Hatanın API key/auth kaynaklı olup olmadığını tespit et."""
        error_text = str(error).lower()
        return (
            "api_key_invalid" in error_text
            or "api key not valid" in error_text
            or "permission denied" in error_text
            or "unauthenticated" in error_text
        )
    
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

    @staticmethod
    def _should_block_academic_request(question: str) -> bool:
        """Bariz ders/ödev komutlarını pre-flight aşamasında tespit et."""
        normalized = re.sub(r"\s+", " ", (question or "").strip().lower())
        if not normalized:
            return False

        # Bilgi/navigasyon niyetli zaman-konum soruları false-positive vermesin.
        informational_markers = (
            "ne zaman",
            "nerede",
            "hangi gün",
            "saat kaç",
            "kaçta",
            "hangi salonda",
            "hangi binada",
        )

        command_markers = (
            r"\bçöz\b",
            r"\bhesapla\b",
            r"\byap\b",
            r"\byazar mısın\b",
            r"\byaz\b",
            r"\bbul\b",
            r"\bkodunu yaz\b",
        )

        has_informational_marker = any(marker in normalized for marker in informational_markers)
        has_command_marker = any(re.search(pattern, normalized) for pattern in command_markers)
        if has_informational_marker and not has_command_marker:
            return False

        direct_block_patterns = (
            r"\bbunu çöz\b",
            r"\bşunu çöz\b",
            r"\bhesapla\b",
            r"\bödevimi yap\b",
            r"\bödev(imi|i)?\s+yap\b",
            r"\bkodunu yaz\b",
            r"\bbenim için kod yaz\b",
        )
        if any(re.search(pattern, normalized) for pattern in direct_block_patterns):
            return True

        # Konu kelimesi + komut fiili kombinasyonu bariz akademik yardım talebidir.
        has_topic_marker = bool(re.search(r"\b(integral|türev)\b", normalized))
        if has_topic_marker and has_command_marker:
            return True

        return False
    
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
            if self._should_block_academic_request(question):
                logger.info(
                    "Academic pre-flight guardrail triggered. user_id=%s session_id=%s question_len=%s",
                    user_id,
                    session_id,
                    len(question or ""),
                )
                return {
                    "answer": self.ACADEMIC_GUARDRAIL_RESPONSE,
                    "sources": [],
                    "session_id": session_id,
                }

            chat_history = self._format_chat_history(session_history or [])
            chain = self._create_rag_chain()
            
            retriever = self._create_retriever()
            source_docs = await retriever._aget_relevant_documents(question)

            try:
                answer = await asyncio.wait_for(
                    chain.ainvoke({
                        "question": question,
                        "chat_history": chat_history,
                    }),
                    timeout=self.QUERY_TOTAL_TIMEOUT,
                )
            except asyncio.TimeoutError:
                logger.error(
                    "AI chain timed out after %ss. user_id=%s model=%s question_len=%s",
                    self.QUERY_TOTAL_TIMEOUT,
                    user_id,
                    self._active_model,
                    len(question or ""),
                )
                raise
            except Exception as model_error:
                fallback_model = "gemini-2.5-flash"
                if self._is_model_not_found_error(model_error) and self._active_model != fallback_model:
                    logger.warning(
                        "Gemini model failed, retrying with fallback model. current_model=%s fallback_model=%s error_type=%s error=%s",
                        self._active_model,
                        fallback_model,
                        type(model_error).__name__,
                        repr(model_error),
                    )
                    self._active_model = fallback_model
                    self.llm = self._create_llm(self._active_model)
                    chain = self._create_rag_chain()
                    answer = await asyncio.wait_for(
                        chain.ainvoke({
                            "question": question,
                            "chat_history": chat_history,
                        }),
                        timeout=self.QUERY_TOTAL_TIMEOUT,
                    )
                else:
                    raise

            logger.info(
                "AI query succeeded. user_id=%s model=%s question_len=%s answer_len=%s",
                user_id,
                self._active_model,
                len(question or ""),
                len(answer or ""),
            )
            unique_docs = self._deduplicate_docs(source_docs)
            relevant_docs = self._filter_sources_by_answer(unique_docs, answer)
            formatted_sources = self._format_sources(relevant_docs)
            
            return {
                "answer": answer,
                "sources": formatted_sources,
                "session_id": session_id,
            }
            
        except Exception as e:
            logger.exception(
                "AI query failed. user_id=%s session_id=%s model=%s question_len=%s error_type=%s error=%s",
                user_id,
                session_id,
                self._active_model,
                len(question or ""),
                type(e).__name__,
                repr(e),
            )
            if self._is_api_key_error(e):
                user_message = "AI servisi şu anda yapılandırma hatası nedeniyle kullanılamıyor. Lütfen yöneticiye GOOGLE_API_KEY ayarını kontrol ettirin."
            elif self._is_model_not_found_error(e):
                user_message = (
                    f"AI modeli ({self._active_model}) bu API sürümünde bulunamadı. "
                    "Lütfen yöneticiye GEMINI_MODEL ayarını güncellemesini söyleyin (öneri: gemini-2.5-flash)."
                )
            elif isinstance(e, asyncio.TimeoutError):
                user_message = "AI asistanı şu anda yanıt vermiyor (zaman aşımı). Lütfen birkaç saniye bekleyip tekrar deneyin."
            elif "quota" in str(e).lower() or "resource_exhausted" in str(e).lower() or "429" in str(e):
                user_message = "AI servisi şu anda yoğun. Lütfen birkaç saniye bekleyip tekrar deneyin."
            else:
                user_message = "Üzgünüm, sorunu işlerken bir hata oluştu. Lütfen daha sonra tekrar deneyin."

            return {
                "answer": user_message,
                "sources": [],
                "session_id": session_id,
                "error": str(e)
            }
    
    @staticmethod
    def _filter_sources_by_answer(documents: List[Document], answer: str) -> List[Document]:
        """LLM cevabında adı geçmeyen kaynak dosyaları filtrele.

        Selamlama veya bağlam dışı kısa yanıtlarda hiçbir kaynak
        adı geçmeyeceğinden sources listesi boş döner; böylece
        frontend'de gereksiz 'Dosyayı Görüntüle' butonu çıkmaz.
        """
        if not answer:
            return []
        answer_lower = answer.lower()
        relevant = []
        for doc in documents:
            metadata = doc.metadata or {}
            source_file = (
                metadata.get("source_file")
                or metadata.get("file_name")
                or Path(str(metadata.get("source", ""))).name
            )
            title = metadata.get("title", "")
            # Dosya adı veya başlığın answer içinde geçip geçmediğini kontrol et
            file_stem = Path(source_file).stem if source_file else ""
            if (
                (file_stem and file_stem.lower() in answer_lower)
                or (source_file and source_file.lower() in answer_lower)
                or (title and title.lower() in answer_lower)
            ):
                relevant.append(doc)
        return relevant

    @staticmethod
    def _deduplicate_docs(documents: List[Document]) -> List[Document]:
        """Aynı kaynak dosyadan gelen tekrar dokümanları kaldır; ilk karşılaşılanı sakla."""
        seen_sources: set = set()
        unique: List[Document] = []
        for doc in documents:
            source_key = doc.metadata.get("source") or doc.metadata.get("source_file") or doc.metadata.get("title")
            if source_key not in seen_sources:
                seen_sources.add(source_key)
                unique.append(doc)
        return unique

    def _format_sources(self, documents: List[Document]) -> List[Dict[str, Any]]:
        """Kaynak dokümanları API yanıtı için formatla."""
        formatted = []
        
        for doc in documents:
            metadata = doc.metadata or {}
            source_type = metadata.get("source_type", "official")
            source_file = (
                metadata.get("source_file")
                or metadata.get("file_name")
                or Path(str(metadata.get("source", ""))).name
            )
            
            content = doc.page_content or ""
            content_preview = content[:200] + "..." if len(content) > 200 else content
            
            source = {
                "title": metadata.get("title", "Başlıksız Doküman"),
                "source_type": source_type,
                "source_file": source_file,
                "content_preview": content_preview,
                "metadata": {
                    "document_id": metadata.get("document_id"),
                    "upload_date": metadata.get("upload_date"),
                    "source_file": source_file,
                }
            }
            
            formatted.append(source)
        
        return formatted
    
    def get_supported_languages(self) -> List[str]:
        """Desteklenen dilleri döndür."""
        return ["tr", "en"]

    def reset_conversation(self, user_id: Optional[str] = None, session_id: Optional[str] = None) -> None:
        """Konuşma sıfırlama çağrılarında servis tarafındaki geçici durumu temizler.

        Not: Servis şu anda kalıcı konuşma geçmişi tutmadığı için metod bilinçli olarak no-op'tur.
        Route katmanında veritabanı kayıtları silinir; burada gelecekte eklenecek
        in-memory/session cache yapıları için tek bir genişleme noktası sağlanır.
        """
        logger.info(
            "AI conversation reset requested. user_id=%s session_id=%s",
            user_id,
            session_id,
        )
    
    def switch_language(self, language: str) -> bool:
        """Prompt şablonu dilini değiştir."""
        if language in ["tr", "en"]:
            self.current_language = language
            logger.info(f"Switched language to {language}")
            return True
        else:
            logger.warning(f"Unsupported language: {language}")
            return False
