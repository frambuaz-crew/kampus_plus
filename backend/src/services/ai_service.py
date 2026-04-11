"""AI Service - KAMPÜS+ Platform Tool Calling Agent tabanlı konuşma AI'sı.

Spec: specs/009-ai-assistant/spec.md
AI sadece kampüs bilgileri ve platform navigasyonu konusunda yardımcı olur.
Akademik ders içerikleri hakkında yardım VERMEZ.

Mimari: LangChain AgentExecutor + Gemini 2.5 Flash Tool Calling
  - search_official_documents : FAISS vektör araması (kampüs belgeleri)
  - get_active_marketplace_listings : SQLAlchemy ile aktif pazar ilanları
  - get_system_stats              : Kayıtlı kullanıcı sayısı
"""

import asyncio
import logging
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Tuple
from uuid import UUID

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.documents import Document
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_core.tools import StructuredTool
from langchain.agents import create_tool_calling_agent, AgentExecutor
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.services.vector_service import VectorStoreService


logger = logging.getLogger(__name__)


class AIService:
    """LangChain Tool Calling Agent tabanlı konuşma AI servisi."""

    CONTEXT_WINDOW_SIZE = 5

    ACADEMIC_GUARDRAIL_RESPONSE = (
        "Üzgünüm, ben bir kampüs asistanıyım. Sadece üniversite hayatı, kampüs imkanları ve etkinlikler "
        "hakkında bilgi verebilirim. Ders veya ödev konularında yardımcı olamıyorum."
    )

    AGENT_SYSTEM_PROMPT = """Sen KAMPÜS+ AI Asistanısın. Üniversite öğrencilerine kampüs bilgileri ve platform navigasyonu konusunda yardımcı oluyorsun.

ÖNEMLİ KURALLAR:
- Akademik ders içerikleri hakkında yardım VERME. Sadece kampüs bilgileri (akademik takvim, şenlikler, kampüs kuralları, forum, pazar yeri, kariyer) konularında destek ver.
- Pazar yeri ilanları veya platform istatistikleri sorulduğunda mutlaka ilgili veritabanı araçlarını kullan.
- Akademik takvim, şenlik, kampüs kuralı gibi resmi bilgiler için doküman arama aracını kullan.
- "Merhaba", "Selam", "Naber" gibi selamlama mesajlarına araç kullanmadan kısa ve samimi karşılık ver.
- Cevapları doğal ve samimi bir dille yaz; robotik liste yerine akıcı paragraflar tercih et.
- Kaynak dokümanlardan bahsederken isimlerini doğal olarak cümleye yedir (örn. "… akademik takvim dokümanına göre …")."""

    # ------------------------------------------------------------------ #
    #  Zaman aşımı sabitleri
    # ------------------------------------------------------------------ #
    LLM_REQUEST_TIMEOUT = 40   # saniye – tek Gemini isteği için hard limit
    QUERY_TOTAL_TIMEOUT = 60   # saniye – tüm agent döngüsü için hard limit

    def __init__(self, vector_service: Optional[VectorStoreService] = None):
        """AI servisini başlat."""
        self.vector_service = vector_service or VectorStoreService()
        self._active_model = self._normalize_model_name(settings.gemini_model)
        self.llm = self._create_llm(self._active_model)
        self.current_language = "tr"
        logger.info("AIService initialized with Gemini (%s) – Agent mode", self._active_model)

    # ------------------------------------------------------------------ #
    #  Yardımcı: model adı & LLM oluşturma
    # ------------------------------------------------------------------ #

    @staticmethod
    def _normalize_model_name(model_name: str) -> str:
        """Gemini model adını provider'ın beklediği formata normalize et."""
        normalized = (model_name or "").strip()
        if normalized.startswith("models/"):
            normalized = normalized.split("/", 1)[1]
        return normalized or "gemini-2.5-flash"

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

    # ------------------------------------------------------------------ #
    #  Yardımcı: hata sınıflandırma
    # ------------------------------------------------------------------ #

    def _is_model_not_found_error(self, error: Exception) -> bool:
        error_text = str(error).lower()
        return "model" in error_text and any(
            kw in error_text for kw in ("not found", "unsupported", "isn't supported", "404")
        )

    def _is_api_key_error(self, error: Exception) -> bool:
        error_text = str(error).lower()
        return any(
            kw in error_text
            for kw in ("api_key_invalid", "api key not valid", "permission denied", "unauthenticated")
        )

    # ------------------------------------------------------------------ #
    #  Yardımcı: konuşma geçmişi biçimlendirme
    # ------------------------------------------------------------------ #

    def _format_chat_history(self, history: List[Dict[str, str]]) -> List[BaseMessage]:
        """Konuşma geçmişini LangChain mesaj objelerine dönüştür.

        Son CONTEXT_WINDOW_SIZE (5) değişim çiftini tutar.
        """
        messages: List[BaseMessage] = []
        recent = history[-self.CONTEXT_WINDOW_SIZE :] if history else []
        for exchange in recent:
            if "question" in exchange:
                messages.append(HumanMessage(content=exchange["question"]))
            if "answer" in exchange:
                messages.append(AIMessage(content=exchange["answer"]))
        return messages

    # ------------------------------------------------------------------ #
    #  Araç Çantası (Tools) – closure tabanlı, db'ye erişimli
    # ------------------------------------------------------------------ #

    def _build_tools(
        self, db: Optional[AsyncSession]
    ) -> Tuple[List[StructuredTool], List[Document]]:
        """Agent araçlarını ve belge takip listesini oluştur.

        Araçlar `query()` içinde closure olarak tanımlanır; bu sayede
        aktif `db` oturumuna ve `self.vector_service`'e erişebilirler.

        Returns:
            (tools, retrieved_docs): Araç listesi + bu çağrıda doldurulan belge listesi.
        """
        retrieved_docs: List[Document] = []  # agent çalıştıkça doldurulur

        # ---- Pydantic giriş şemaları ---------------------------------- #

        class SearchDocsInput(BaseModel):
            query: str = Field(description="Aranacak konu veya anahtar kelime")

        class MarketplaceInput(BaseModel):
            category_keyword: str = Field(
                default="",
                description=(
                    "Kategori veya başlıkta aranacak anahtar kelime. "
                    "Tüm aktif ilanları görmek için boş bırak."
                ),
            )

        class SystemStatsInput(BaseModel):
            pass  # parametresiz araç

        # ---- Tool 1: Resmi doküman arama (FAISS) ---------------------- #

        async def _search_official_documents(query: str) -> str:
            """FAISS vektör araması ile kampüs resmi belgelerini sorgular."""
            results = await self.vector_service.search_official(
                query, k=settings.vector_search_k
            )
            docs: List[Document] = []
            for idx, distance in results:
                meta = self.vector_service.official_metadata.get(idx, {})
                content = meta.get("text", "")
                if content:
                    docs.append(
                        Document(
                            page_content=content,
                            metadata={
                                "source_type": "official",
                                "title": meta.get("title", "Resmi Doküman"),
                                "distance": distance,
                                "index_id": idx,
                                **{k: v for k, v in meta.items() if k != "text"},
                            },
                        )
                    )

            docs.sort(key=lambda d: d.metadata.get("distance", float("inf")))
            top_docs = docs[: settings.vector_search_k]
            retrieved_docs.extend(top_docs)

            if not top_docs:
                return "İlgili resmi doküman bulunamadı."

            parts = []
            for i, doc in enumerate(top_docs, 1):
                title = doc.metadata.get("title", "Başlıksız")
                parts.append(f"[Kaynak {i}] {title}:\n{doc.page_content}\n")
            return "\n".join(parts)

        # ---- Tool 2: Aktif pazar yeri ilanları (SQLAlchemy) ----------- #

        async def _get_active_marketplace_listings(category_keyword: str = "") -> str:
            """Aktif pazar yeri ilanlarını veritabanından getirir."""
            if db is None:
                return "Veritabanı bağlantısı mevcut değil."

            from src.models.marketplace import MarketplaceListing  # yerel import – döngüsel bağımlılığı önler

            stmt = select(MarketplaceListing).where(MarketplaceListing.status == "active")
            kw = (category_keyword or "").strip()
            if kw:
                pattern = f"%{kw}%"
                stmt = stmt.where(
                    or_(
                        MarketplaceListing.category.ilike(pattern),
                        MarketplaceListing.title.ilike(pattern),
                    )
                )
            stmt = stmt.order_by(MarketplaceListing.created_at.desc()).limit(10)

            result = await db.execute(stmt)
            listings = result.scalars().all()

            if not listings:
                suffix = f" '{category_keyword}' kategorisinde" if kw else ""
                return f"Şu anda{suffix} aktif ilan bulunmuyor."

            rows = [
                f"- **{lst.title}** | Kategori: {lst.category} | Fiyat: {lst.price} TL | Durum: {lst.condition}"
                for lst in listings
            ]
            return f"Aktif ilanlar ({len(listings)} sonuç):\n" + "\n".join(rows)

        # ---- Tool 3: Sistem istatistikleri (SQLAlchemy) --------------- #

        async def _get_system_stats() -> str:
            """Platformdaki toplam kayıtlı kullanıcı sayısını döndürür."""
            if db is None:
                return "Veritabanı bağlantısı mevcut değil."

            from src.models.user import User  # yerel import

            result = await db.execute(
                select(func.count(User.id)).where(User.is_deleted == False)  # noqa: E712
            )
            total = result.scalar_one()
            return f"KAMPÜS+ platformunda toplam {total} kayıtlı kullanıcı bulunmaktadır."

        # ---- StructuredTool sarmalayıcıları --------------------------- #

        tools: List[StructuredTool] = [
            StructuredTool.from_function(
                coroutine=_search_official_documents,
                name="search_official_documents",
                description=(
                    "Kampüs kuralları, şenlikler, akademik takvim ve diğer resmi kampüs belgelerini arar. "
                    "Resmi veya kurumsal kampüs bilgisi sorulduğunda bu aracı kullan."
                ),
                args_schema=SearchDocsInput,
            ),
            StructuredTool.from_function(
                coroutine=_get_active_marketplace_listings,
                name="get_active_marketplace_listings",
                description=(
                    "Pazar yeri aktif ilanlarını kategori veya anahtar kelimeye göre listeler. "
                    "Satılık eşya, ilan veya pazar yeri konusu sorulduğunda kullan."
                ),
                args_schema=MarketplaceInput,
            ),
            StructuredTool.from_function(
                coroutine=_get_system_stats,
                name="get_system_stats",
                description=(
                    "Platformdaki toplam kayıtlı öğrenci/kullanıcı sayısını verir. "
                    "Platform istatistikleri veya kaç kişi var sorusu geldiğinde kullan."
                ),
                args_schema=SystemStatsInput,
            ),
        ]
        return tools, retrieved_docs

    # ------------------------------------------------------------------ #
    #  Agent prompt şablonu
    # ------------------------------------------------------------------ #

    def _build_agent_prompt(self) -> ChatPromptTemplate:
        """Tool Calling Agent için prompt şablonu oluştur."""
        return ChatPromptTemplate.from_messages(
            [
                ("system", self.AGENT_SYSTEM_PROMPT),
                MessagesPlaceholder("chat_history"),
                ("human", "{input}"),
                MessagesPlaceholder("agent_scratchpad"),
            ]
        )

    # ------------------------------------------------------------------ #
    #  Academic guardrail (pre-flight)
    # ------------------------------------------------------------------ #

    @staticmethod
    def _should_block_academic_request(question: str) -> bool:
        """Bariz ders/ödev komutlarını agent'a göndermeden önce tespit et."""
        normalized = re.sub(r"\s+", " ", (question or "").strip().lower())
        if not normalized:
            return False

        informational_markers = (
            "ne zaman", "nerede", "hangi gün", "saat kaç",
            "kaçta", "hangi salonda", "hangi binada",
        )
        command_markers = (
            r"\bçöz\b", r"\bhesapla\b", r"\byap\b",
            r"\byazar mısın\b", r"\byaz\b", r"\bbul\b", r"\bkodunu yaz\b",
        )
        has_informational = any(m in normalized for m in informational_markers)
        has_command = any(re.search(p, normalized) for p in command_markers)

        # Bilgi/navigasyon soruları (örn. "saat kaçta") false-positive vermesin.
        if has_informational and not has_command:
            return False

        direct_block = (
            r"\bbunu çöz\b", r"\bşunu çöz\b", r"\bhesapla\b",
            r"\bödevimi yap\b", r"\bödev(imi|i)?\s+yap\b",
            r"\bkodunu yaz\b", r"\bbenim için kod yaz\b",
        )
        if any(re.search(p, normalized) for p in direct_block):
            return True

        # Konu + komut fiili kombinasyonu
        has_topic = bool(re.search(r"\b(integral|türev)\b", normalized))
        if has_topic and has_command:
            return True

        return False

    # ------------------------------------------------------------------ #
    #  Ana query metodu
    # ------------------------------------------------------------------ #

    async def query(
        self,
        question: str,
        user_id: UUID,
        session_id: Optional[str] = None,
        session_history: Optional[List[Dict[str, str]]] = None,
        db: Optional[AsyncSession] = None,
    ) -> Dict[str, Any]:
        """Kullanıcı sorgusunu Agent ile işle ve yanıt döndür.

        Args:
            question: Kullanıcının sorusu.
            user_id: Kullanıcı ID'si (loglama için).
            session_id: Oturum ID'si (opsiyonel).
            session_history: Önceki konuşma çiftleri [{"question":…,"answer":…}].
            db: Aktif SQLAlchemy async oturumu (DB araçları için gerekli).

        Returns:
            {"answer": str, "sources": list, "session_id": str}
        """
        try:
            # ---- 1. Pre-flight: akademik engel ----------------------- #
            if self._should_block_academic_request(question):
                logger.info(
                    "Academic guardrail triggered. user_id=%s session_id=%s question_len=%s",
                    user_id, session_id, len(question or ""),
                )
                return {
                    "answer": self.ACADEMIC_GUARDRAIL_RESPONSE,
                    "sources": [],
                    "session_id": session_id,
                }

            # ---- 2. Agent kurulumu ----------------------------------- #
            chat_history = self._format_chat_history(session_history or [])
            tools, retrieved_docs = self._build_tools(db)
            prompt = self._build_agent_prompt()

            agent = create_tool_calling_agent(self.llm, tools, prompt)
            executor = AgentExecutor(
                agent=agent,
                tools=tools,
                verbose=False,
                max_iterations=5,
                handle_parsing_errors=True,
            )

            # ---- 3. Agent çalıştırma (timeout korumalı) -------------- #
            try:
                result = await asyncio.wait_for(
                    executor.ainvoke({"input": question, "chat_history": chat_history}),
                    timeout=self.QUERY_TOTAL_TIMEOUT,
                )
                answer: str = result.get("output", "")

            except asyncio.TimeoutError:
                logger.error(
                    "AI agent timed out after %ss. user_id=%s model=%s question_len=%s",
                    self.QUERY_TOTAL_TIMEOUT, user_id, self._active_model, len(question or ""),
                )
                raise

            except Exception as model_error:
                fallback = "gemini-2.5-flash"
                if self._is_model_not_found_error(model_error) and self._active_model != fallback:
                    logger.warning(
                        "Model error, falling back. current=%s fallback=%s error=%s",
                        self._active_model, fallback, repr(model_error),
                    )
                    self._active_model = fallback
                    self.llm = self._create_llm(self._active_model)
                    # Yeni LLM ile aynı araçlar ve prompt
                    fb_agent = create_tool_calling_agent(self.llm, tools, prompt)
                    fb_executor = AgentExecutor(
                        agent=fb_agent,
                        tools=tools,
                        verbose=False,
                        max_iterations=5,
                        handle_parsing_errors=True,
                    )
                    result = await asyncio.wait_for(
                        fb_executor.ainvoke({"input": question, "chat_history": chat_history}),
                        timeout=self.QUERY_TOTAL_TIMEOUT,
                    )
                    answer = result.get("output", "")
                else:
                    raise

            logger.info(
                "AI agent query succeeded. user_id=%s model=%s question_len=%s answer_len=%s",
                user_id, self._active_model, len(question or ""), len(answer or ""),
            )

            # ---- 4. Kaynak filtreleme & biçimlendirme ---------------- #
            unique_docs = self._deduplicate_docs(retrieved_docs)
            relevant_docs = self._filter_sources_by_answer(unique_docs, answer)
            formatted_sources = self._format_sources(relevant_docs)

            return {
                "answer": answer,
                "sources": formatted_sources,
                "session_id": session_id,
            }

        except Exception as e:
            logger.exception(
                "AI agent query failed. user_id=%s session_id=%s model=%s error_type=%s error=%s",
                user_id, session_id, self._active_model, type(e).__name__, repr(e),
            )
            if self._is_api_key_error(e):
                msg = (
                    "AI servisi şu anda yapılandırma hatası nedeniyle kullanılamıyor. "
                    "Lütfen yöneticiye GOOGLE_API_KEY ayarını kontrol ettirin."
                )
            elif self._is_model_not_found_error(e):
                msg = (
                    f"AI modeli ({self._active_model}) bu API sürümünde bulunamadı. "
                    "Lütfen yöneticiye GEMINI_MODEL ayarını güncellemesini söyleyin (öneri: gemini-2.5-flash)."
                )
            elif isinstance(e, asyncio.TimeoutError):
                msg = "AI asistanı şu anda yanıt vermiyor (zaman aşımı). Lütfen birkaç saniye bekleyip tekrar deneyin."
            elif "quota" in str(e).lower() or "resource_exhausted" in str(e).lower() or "429" in str(e):
                msg = "AI servisi şu anda yoğun. Lütfen birkaç saniye bekleyip tekrar deneyin."
            else:
                msg = "Üzgünüm, sorunu işlerken bir hata oluştu. Lütfen daha sonra tekrar deneyin."

            return {"answer": msg, "sources": [], "session_id": session_id, "error": str(e)}

    # ------------------------------------------------------------------ #
    #  Kaynak yardımcıları – orijinal mantık korundu
    # ------------------------------------------------------------------ #

    @staticmethod
    def _filter_sources_by_answer(documents: List[Document], answer: str) -> List[Document]:
        """LLM cevabında adı geçmeyen kaynak dosyaları filtrele.

        Selamlama veya bağlam dışı kısa yanıtlarda hiçbir kaynak adı
        geçmeyeceğinden sources listesi boş döner; böylece frontend'de
        gereksiz 'Dosyayı Görüntüle' butonu çıkmaz.
        """
        if not answer:
            return []
        answer_lower = answer.lower()
        relevant = []
        for doc in documents:
            meta = doc.metadata or {}
            source_file = (
                meta.get("source_file")
                or meta.get("file_name")
                or Path(str(meta.get("source", ""))).name
            )
            title = meta.get("title", "")
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
        """Aynı kaynaktan gelen tekrar dokümanları kaldır; ilk karşılaşılanı sakla."""
        seen: set = set()
        unique: List[Document] = []
        for doc in documents:
            key = (
                doc.metadata.get("source")
                or doc.metadata.get("source_file")
                or doc.metadata.get("title")
            )
            if key not in seen:
                seen.add(key)
                unique.append(doc)
        return unique

    def _format_sources(self, documents: List[Document]) -> List[Dict[str, Any]]:
        """Kaynak dokümanları API yanıtı için formatla."""
        formatted = []
        for doc in documents:
            meta = doc.metadata or {}
            source_type = meta.get("source_type", "official")
            source_file = (
                meta.get("source_file")
                or meta.get("file_name")
                or Path(str(meta.get("source", ""))).name
            )
            content = doc.page_content or ""
            preview = content[:200] + "..." if len(content) > 200 else content
            formatted.append(
                {
                    "title": meta.get("title", "Başlıksız Doküman"),
                    "source_type": source_type,
                    "source_file": source_file,
                    "content_preview": preview,
                    "metadata": {
                        "document_id": meta.get("document_id"),
                        "upload_date": meta.get("upload_date"),
                        "source_file": source_file,
                    },
                }
            )
        return formatted

    # ------------------------------------------------------------------ #
    #  Yardımcı public metotlar
    # ------------------------------------------------------------------ #

    def get_supported_languages(self) -> List[str]:
        """Desteklenen dilleri döndür."""
        return ["tr", "en"]

    def reset_conversation(
        self, user_id: Optional[str] = None, session_id: Optional[str] = None
    ) -> None:
        """Konuşma sıfırlama isteğini logla.

        Servis kalıcı in-memory state tutmadığından bu metod bilinçli
        olarak no-op'tur; gelecekte eklenecek cache yapıları için tek
        genişleme noktası sağlar.
        """
        logger.info(
            "AI conversation reset requested. user_id=%s session_id=%s",
            user_id,
            session_id,
        )

    def switch_language(self, language: str) -> bool:
        """Prompt dilini değiştir (şu anda agent tek dil promptu kullanıyor)."""
        if language in ("tr", "en"):
            self.current_language = language
            logger.info("Language switched to %s", language)
            return True
        logger.warning("Unsupported language: %s", language)
        return False
