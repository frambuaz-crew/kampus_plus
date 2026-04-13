"""AI Service - KAMPÜS+ Platform Tool Calling Agent tabanlı konuşma AI'sı.

Spec: specs/009-ai-assistant/spec.md
AI sadece kampüs bilgileri ve platform navigasyonu konusunda yardımcı olur.
Akademik ders içerikleri hakkında yardım VERMEZ.

Mimari: LangChain AgentExecutor + Gemini 2.5 Flash Tool Calling
  - search_official_documents  : FAISS vektör araması (kampüs belgeleri)
  - get_active_marketplace_listings : SQLAlchemy ile aktif pazar ilanları
  - get_system_stats           : Kayıtlı kullanıcı sayısı
  - get_user_schedule          : Kullanıcının ders programı (CourseSchedule tablosu)
"""

import asyncio
import json
import logging
import unicodedata
from dataclasses import dataclass
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
from sqlalchemy.orm import selectinload

from src.core.config import settings
from src.services.vector_service import VectorStoreService


logger = logging.getLogger(__name__)


# ------------------------------------------------------------------ #
#  Kullanıcı bağlamı veri sınıfı
# ------------------------------------------------------------------ #

@dataclass
class UserContext:
    """Aktif kullanıcıya ait profil bilgileri — AI bağlamı için."""
    user_id: str
    first_name: str
    university: str
    department: str
    grade: Optional[str]          # "1. Sınıf", "Hazırlık" vb. — None ise belirtilmemiş

    @property
    def display_name(self) -> str:
        return self.first_name or "Öğrenci"

    @property
    def has_grade(self) -> bool:
        return bool(self.grade)


# ------------------------------------------------------------------ #
#  Gün adı normalizer
# ------------------------------------------------------------------ #

# Türkçe gün adlarını normalize eder: "salı", "SALI", "Salı" → "Salı"
_TR_DAY_ALIASES: Dict[str, str] = {
    "pazartesi": "Pazartesi",
    "sali": "Salı",
    "salı": "Salı",
    "çarşamba": "Çarşamba",
    "carsamba": "Çarşamba",
    "perşembe": "Perşembe",
    "persembe": "Perşembe",
    "cuma": "Cuma",
    "cumartesi": "Cumartesi",
    "pazar": "Pazar",
}


def _normalize_day(day: str) -> str:
    """Gün adını standart Türkçe biçime çevirir; tanınamazsa orijinalini döner."""
    raw = day.strip().lower()
    # ASCII'ye indir (ş→s, ç→c vb.) ve tekrar dene
    ascii_raw = unicodedata.normalize("NFKD", raw).encode("ascii", "ignore").decode()
    return (
        _TR_DAY_ALIASES.get(raw)
        or _TR_DAY_ALIASES.get(ascii_raw)
        or day.strip().capitalize()
    )


class AIService:
    """LangChain Tool Calling Agent tabanlı konuşma AI servisi."""

    CONTEXT_WINDOW_SIZE = 5

    ACADEMIC_GUARDRAIL_RESPONSE = (
        "Üzgünüm, ben bir kampüs asistanıyım. Sadece üniversite hayatı, kampüs imkanları ve etkinlikler "
        "hakkında bilgi verebilirim. Ders veya ödev konularında yardımcı olamıyorum."
    )

    # Temel sistem promptu — {user_context_block} alanı query() tarafından doldurulur
    _AGENT_SYSTEM_PROMPT_TEMPLATE = """{user_context_block}

Sen KAMPÜS+ AI Asistanısın. Üniversite öğrencilerine kampüs bilgileri ve platform navigasyonu konusunda yardımcı oluyorsun.

ÖNEMLİ KURALLAR:
- Akademik ders içerikleri hakkında yardım VERME. Sadece kampüs bilgileri (akademik takvim, şenlikler, kampüs kuralları, forum, pazar yeri, kariyer) konularında destek ver.
- Pazar yeri ilanları veya platform istatistikleri sorulduğunda mutlaka ilgili veritabanı araçlarını kullan.
- Akademik takvim, şenlik, kampüs kuralı gibi resmi bilgiler için doküman arama aracını kullan.
- Kullanıcı ders programını sorduğunda (örn. "bugün ne dersim var", "salı günkü derslerim") mutlaka `get_user_schedule` aracını kullan.
- "Merhaba", "Selam", "Naber" gibi selamlama mesajlarına araç kullanmadan kısa ve samimi karşılık ver.
- Cevapları doğal ve samimi bir dille yaz; robotik liste yerine akıcı paragraflar tercih et.
- Kaynak dokümanlardan bahsederken isimlerini doğal olarak cümleye yedir (örn. "… akademik takvim dokümanına göre …")."""

    # Kullanıcı bağlamı bilinmiyorken kullanılan blok
    _DEFAULT_USER_CONTEXT_BLOCK = "Sen KAMPÜS+ asistanısın."

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
    #  Kullanıcı bağlamı çekme
    # ------------------------------------------------------------------ #

    async def _fetch_user_context(
        self, user_id: UUID, db: AsyncSession
    ) -> Optional[UserContext]:
        """Veritabanından kullanıcının profil bilgilerini çeker.

        Hata durumunda None döner; servis çalışmaya devam eder.
        """
        try:
            from src.models.user import User  # yerel import – döngüsel bağımlılığı önler

            stmt = (
                select(User)
                .where(User.id == str(user_id))
                .options(selectinload(User.department_rel))
            )
            result = await db.execute(stmt)
            user = result.scalar_one_or_none()

            if user is None:
                logger.warning("_fetch_user_context: user not found. user_id=%s", user_id)
                return None

            department_name = (
                user.department_rel.name if user.department_rel else "Belirtilmemiş"
            )
            return UserContext(
                user_id=str(user_id),
                first_name=user.first_name or "",
                university=user.university or "Belirtilmemiş",
                department=department_name,
                grade=user.grade,
            )
        except Exception as exc:
            logger.warning(
                "_fetch_user_context failed (non-critical). user_id=%s error=%s",
                user_id,
                repr(exc),
            )
            return None

    # ------------------------------------------------------------------ #
    #  Dinamik system prompt oluşturma
    # ------------------------------------------------------------------ #

    def _build_system_prompt(self, ctx: Optional[UserContext]) -> str:
        """Kullanıcı bağlamına göre kişiselleştirilmiş system prompt oluşturur."""
        if ctx is None:
            return self._AGENT_SYSTEM_PROMPT_TEMPLATE.format(
                user_context_block=self._DEFAULT_USER_CONTEXT_BLOCK
            )

        grade_str = ctx.grade if ctx.has_grade else "sınıfı belirtilmemiş"
        user_context_block = (
            f"Şu an {ctx.display_name} adlı öğrenciyle konuşuyorsun. "
            f"Öğrencinin bilgileri: Üniversite: {ctx.university} | "
            f"Bölüm: {ctx.department} | Sınıf: {grade_str}. "
            f"Bu bilgileri kullanarak kişiselleştirilmiş yanıtlar ver."
        )
        return self._AGENT_SYSTEM_PROMPT_TEMPLATE.format(
            user_context_block=user_context_block
        )

    # ------------------------------------------------------------------ #
    #  Araç Çantası (Tools) – closure tabanlı, db'ye erişimli
    # ------------------------------------------------------------------ #

    def _build_tools(
        self,
        db: Optional[AsyncSession],
        user_ctx: Optional[UserContext] = None,
    ) -> Tuple[List[StructuredTool], List[Document]]:
        """Agent araçlarını ve belge takip listesini oluştur.

        Araçlar `query()` içinde closure olarak tanımlanır; bu sayede
        aktif `db` oturumuna, `self.vector_service`'e ve `user_ctx`'e erişebilirler.

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

        class UserScheduleInput(BaseModel):
            day: str = Field(
                description=(
                    "Ders programı istenen günün Türkçe adı. "
                    "Örnek: 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'. "
                    "Tüm hafta için 'tümü' veya 'hepsi' gönder."
                )
            )

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

        # ---- Tool 4: Kullanıcının ders programı (CourseSchedule) ------ #

        async def _get_user_schedule(day: str) -> str:
            """Kullanıcının üniversite/bölüm/sınıf bilgisine göre ders programını döndürür."""
            if db is None:
                return "Veritabanı bağlantısı mevcut değil."

            if user_ctx is None:
                return (
                    "Ders programını görebilmek için profilinde üniversite, bölüm ve "
                    "sınıf bilgilerinin dolu olması gerekiyor."
                )

            if not user_ctx.has_grade:
                return (
                    f"{user_ctx.display_name}, profilinde sınıf bilgisi belirtilmemiş. "
                    "Profil ayarlarından sınıfını seçersen ders programını getirebilirim."
                )

            from src.models.academic import CourseSchedule  # yerel import

            # Kullanıcının profil bilgilerine uyan en güncel ders programını getir
            stmt = (
                select(CourseSchedule)
                .where(
                    CourseSchedule.university.ilike(f"%{user_ctx.university}%"),
                    CourseSchedule.department.ilike(f"%{user_ctx.department}%"),
                    CourseSchedule.class_year.ilike(f"%{user_ctx.grade}%"),
                )
                .order_by(CourseSchedule.created_at.desc())
                .limit(1)
            )
            result = await db.execute(stmt)
            schedule = result.scalar_one_or_none()

            if schedule is None:
                return (
                    f"{user_ctx.university} üniversitesi, {user_ctx.department} bölümü, "
                    f"{user_ctx.grade} için sisteme henüz ders programı yüklenmemiş. "
                    "Akademik sayfasından katkıda bulunabilirsin!"
                )

            # schedule_data JSON'u ayrıştır
            try:
                schedule_data: Dict[str, Any] = json.loads(schedule.schedule_data)
            except (json.JSONDecodeError, TypeError):
                return "Ders programı verisi okunamadı (bozuk format). Lütfen yöneticiyle iletişime geç."

            # Tüm hafta mı, yoksa belirli bir gün mü?
            normalized_day = _normalize_day(day)
            show_all = normalized_day.lower() in ("tümü", "tumü", "hepsi", "tüm hafta", "hafta")

            if show_all:
                if not schedule_data:
                    return "Ders programında henüz ders bulunmuyor."
                lines = [
                    f"📅 **{user_ctx.display_name}** için haftalık ders programı "
                    f"({user_ctx.university} / {user_ctx.department} / {user_ctx.grade}):\n"
                ]
                for day_name, lessons in schedule_data.items():
                    lines.append(f"\n**{day_name}**")
                    if not lessons:
                        lines.append("  — Ders yok")
                        continue
                    for lesson in lessons:
                        lines.append(AIService._format_lesson(lesson))
                return "\n".join(lines)

            # Belirli bir gün için — büyük/küçük harf duyarsız eşleşme
            matched_key = next(
                (k for k in schedule_data if _normalize_day(k) == normalized_day),
                None,
            )

            if matched_key is None:
                available = ", ".join(schedule_data.keys()) or "—"
                return (
                    f"'{normalized_day}' gününe ait ders bulunamadı. "
                    f"Programda şu günler var: {available}."
                )

            lessons = schedule_data[matched_key]
            if not lessons:
                return f"{normalized_day} günü ders yok. 🎉"

            lines = [
                f"📅 **{user_ctx.display_name}** — **{normalized_day}** ders programı "
                f"({user_ctx.department} / {user_ctx.grade}):\n"
            ]
            for lesson in lessons:
                lines.append(AIService._format_lesson(lesson))
            return "\n".join(lines)

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
            StructuredTool.from_function(
                coroutine=_get_user_schedule,
                name="get_user_schedule",
                description=(
                    "Kullanıcının ders programını getirir. Gün adı (Pazartesi, Salı vb.) veya "
                    "'tümü' ile tüm hafta gösterilebilir. "
                    "Kullanıcı 'bugün ne dersim var', 'salı günü derslerim', 'ders programım' "
                    "gibi bir şey sorduğunda MUTLAKA bu aracı kullan."
                ),
                args_schema=UserScheduleInput,
            ),
        ]
        return tools, retrieved_docs

    # ------------------------------------------------------------------ #
    #  Agent prompt şablonu
    # ------------------------------------------------------------------ #

    def _build_agent_prompt(self, system_prompt: str) -> ChatPromptTemplate:
        """Tool Calling Agent için prompt şablonu oluştur."""
        return ChatPromptTemplate.from_messages(
            [
                ("system", system_prompt),
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
            "ne dersim", "ders programı", "derslerim",
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
            user_id: Kullanıcı ID'si — profil bilgisi çekmek için kullanılır.
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

            # ---- 2. Kullanıcı bağlamını çek -------------------------- #
            user_ctx: Optional[UserContext] = None
            if db is not None:
                user_ctx = await self._fetch_user_context(user_id, db)
                if user_ctx:
                    logger.debug(
                        "User context loaded. user_id=%s university=%s department=%s grade=%s",
                        user_id, user_ctx.university, user_ctx.department, user_ctx.grade,
                    )

            # ---- 3. Agent kurulumu ----------------------------------- #
            chat_history = self._format_chat_history(session_history or [])
            tools, retrieved_docs = self._build_tools(db, user_ctx)
            system_prompt = self._build_system_prompt(user_ctx)
            prompt = self._build_agent_prompt(system_prompt)

            agent = create_tool_calling_agent(self.llm, tools, prompt)
            executor = AgentExecutor(
                agent=agent,
                tools=tools,
                verbose=False,
                max_iterations=5,
                handle_parsing_errors=True,
            )

            # ---- 4. Agent çalıştırma (timeout korumalı) -------------- #
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

            # ---- 5. Kaynak filtreleme & biçimlendirme ---------------- #
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
    #  Ders formatı yardımcısı
    # ------------------------------------------------------------------ #

    @staticmethod
    def _format_lesson(lesson: Any) -> str:
        """Bir ders kaydını okunabilir satıra dönüştürür.

        schedule_data JSON'unda ders nesnesi çeşitli anahtar adları kullanabilir;
        bu fonksiyon en yaygın varyantları destekler.
        """
        if not isinstance(lesson, dict):
            return f"  • {lesson}"

        # Ders adı — farklı anahtar varyantları
        course = (
            lesson.get("ders")
            or lesson.get("course")
            or lesson.get("dersAdi")
            or lesson.get("course_name")
            or lesson.get("name")
            or "—"
        )
        # Saat
        time_ = (
            lesson.get("saat")
            or lesson.get("time")
            or lesson.get("saat_araligi")
            or lesson.get("hours")
            or ""
        )
        # Öğretim görevlisi
        instructor = (
            lesson.get("ogretmen")
            or lesson.get("öğretmen")
            or lesson.get("instructor")
            or lesson.get("hoca")
            or lesson.get("ogretim_uyesi")
            or ""
        )
        # Derslik / sınıf
        room = (
            lesson.get("derslik")
            or lesson.get("room")
            or lesson.get("sinif")
            or lesson.get("yer")
            or ""
        )

        parts = [f"  • **{course}**"]
        if time_:
            parts.append(f"🕐 {time_}")
        if instructor:
            parts.append(f"👨‍🏫 {instructor}")
        if room:
            parts.append(f"🏛️ {room}")
        return "  ".join(parts)

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
