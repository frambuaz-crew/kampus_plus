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
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.config import settings
from src.models.course_notes import CourseNoteEntry, CourseNoteTopic
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
    university_id: Optional[str]
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
- Öğrenciler forum gönderileri, diğer öğrencilerin tartışmaları veya platformdaki konular hakkında soru sorduğunda `search_forum_topics` aracını kullan. "En son neler paylaşıldı", "yeni ne var", "forumda neler oluyor" gibi genel sorularda `query` parametresini BOŞ ("") bırak — bu en yeni gönderileri kronolojik sırayla getirir. Yalnızca "yapay zeka hakkında ne yazıyor" gibi spesifik konu sorulduğunda ilgili kelimeyi `query`'e yaz.
- Kullanıcı ders programını sorduğunda (örn. "bugün ne dersim var", "salı günkü derslerim") mutlaka `get_user_schedule` aracını kullan.
- Kullanıcı ders notu havuzları, ders kodu notları veya bir ders konusuyla ilgili not aradığında mutlaka `search_course_notes` aracını kullan.
- Kullanıcı iş ilanı, staj fırsatı, kariyer fırsatı, şirket ilanı veya proje arayışından bahsettiğinde mutlaka `get_career_listings` aracını kullan.
- Kullanıcı sınav, vize, final, yarıyıl/yıl sonu sınavı, tatil, bayram, kayıt, oryantasyon veya akademik takvim tarihlerini sorduğunda MUTLAKA `get_academic_calendar` aracını kullan.
- Artık tüm bölümlerin ve sınıfların ders programına, tüm üniversitelerin takvimine erişebilirsin. Kullanıcı başka bir sınıf, bölüm veya üniversite sorarsa ilgili `university`, `department`, `class_year`, `semester` parametrelerini açıkça araçlara geçir.
- Öğrenci herhangi bir soru sorduğunda önce `search_knowledge_base` aracını dene; eşleşen bir yanıt dönerse o yanıtı doğrudan kullan.
- TOOL FALLBACK RULE: If a user asks about an event, deadline, or campus information, and your first tool search returns no results, DO NOT give up immediately. You MUST try querying another relevant tool (e.g., if the calendar is empty, search the knowledge base or forum) before telling the user you couldn't find it.
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
                university_id=user.university_id,
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

    async def _load_prompt_template(self, db: Optional[AsyncSession]) -> str:
        """DB'den aktif system prompt şablonunu yükler; satır yoksa sabit şablonu döner."""
        if db is None:
            return self._AGENT_SYSTEM_PROMPT_TEMPLATE
        try:
            from src.models.ai import AISystemSettings  # yerel import – döngüsel bağımlılığı önler
            from sqlalchemy import select as _select

            result = await db.execute(_select(AISystemSettings).limit(1))
            row = result.scalar_one_or_none()
            if row is not None and row.system_prompt:
                return row.system_prompt
        except Exception as exc:
            logger.warning("_load_prompt_template: DB okuma başarısız, sabit şablon kullanılıyor. hata=%s", repr(exc))
        return self._AGENT_SYSTEM_PROMPT_TEMPLATE

    def _build_system_prompt(self, ctx: Optional[UserContext], template: Optional[str] = None) -> str:
        """Kullanıcı bağlamına göre kişiselleştirilmiş system prompt oluşturur."""
        base = template if template is not None else self._AGENT_SYSTEM_PROMPT_TEMPLATE
        if ctx is None:
            return base.format(user_context_block=self._DEFAULT_USER_CONTEXT_BLOCK)

        grade_str = ctx.grade if ctx.has_grade else "sınıfı belirtilmemiş"
        user_context_block = (
            f"Şu an {ctx.display_name} adlı öğrenciyle konuşuyorsun. "
            f"Öğrencinin bilgileri: Üniversite: {ctx.university} | "
            f"Bölüm: {ctx.department} | Sınıf: {grade_str}. "
            f"Bu bilgileri kullanarak kişiselleştirilmiş yanıtlar ver."
        )
        return base.format(user_context_block=user_context_block)

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
            min_price: Optional[float] = Field(
                default=None,
                description="Minimum fiyat filtresi (TL). Örn: 50.0",
            )
            max_price: Optional[float] = Field(
                default=None,
                description="Maksimum fiyat filtresi (TL). Örn: 100.0",
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
            university: Optional[str] = Field(
                default=None,
                description="Üniversite adı. Belirtilmezse kullanıcının kendi üniversitesi kullanılır.",
            )
            department: Optional[str] = Field(
                default=None,
                description=(
                    "Bölümün tam ve resmi Türkçe adı. "
                    "Kullanıcı kısaltma kullansa bile (örn: 'pc', 'bm', 'ee') "
                    "her zaman tam resmi karşılığını yaz "
                    "(örn: 'Bilgisayar Mühendisliği', 'Elektrik-Elektronik Mühendisliği'). "
                    "Belirtilmezse kullanıcının kendi bölümü kullanılır."
                ),
            )
            class_year: Optional[str] = Field(
                default=None,
                description=(
                    "Sınıf bilgisi. Her zaman '<rakam>. Sınıf' formatında gönder: "
                    "'1. Sınıf', '2. Sınıf', '3. Sınıf', '4. Sınıf', '5. Sınıf'. "
                    "Asla '3.sınıf', '3sınıf' veya sadece '3' olarak gönderme. "
                    "Belirtilmezse kullanıcının kendi sınıfı kullanılır."
                ),
            )
            semester: Optional[str] = Field(
                default=None,
                description="Dönem: 'guz' veya 'bahar'. Belirtilmezse aktif dönem kullanılır.",
            )
            academic_year: Optional[str] = Field(
                default=None,
                description=(
                    "Öğretim yılı, örn: '2024-2025', '2025-2026'. "
                    "Belirtilmezse '2025-2026' yılı kullanılır."
                ),
            )

        class SearchForumInput(BaseModel):
            query: Optional[str] = Field(
                default="",
                description=(
                    "Forum konularında aranacak anahtar kelime. "
                    "Kullanıcı genel ('en son neler var', 'gündem ne') soruyorsa BOŞ bırak — "
                    "bu en yeni gönderileri kronolojik sırayla getirir. "
                    "Spesifik konu varsa ('yapay zeka', 'vize') o kelimeyi yaz."
                ),
            )

        class AcademicCalendarInput(BaseModel):
            event_type_keyword: str = Field(
                default="",
                description=(
                    "Filtrelemek istenen etkinlik türü veya anahtar kelime. "
                    "Örnekler: 'sınav', 'vize', 'final', 'tatil', 'bayram', 'kayıt', 'oryantasyon'. "
                    "Tüm etkinlikleri görmek için boş bırak."
                ),
            )
            university: Optional[str] = Field(
                default=None,
                description=(
                    "Takvim verisi istenen üniversite adı. "
                    "Belirtilmezse kullanıcının kendi üniversitesi kullanılır."
                ),
            )

        class KnowledgeBaseSearchInput(BaseModel):
            query: str = Field(
                description="Öğrencinin sorusu veya aranacak anahtar kelime ifadesi."
            )

        class CareerInput(BaseModel):
            keyword: Optional[str] = Field(
                default=None,
                description=(
                    "İlan başlığı veya şirket adında aranacak anahtar kelime. "
                    "Örn: 'yazılım', 'Google', 'pazarlama'."
                ),
            )
            job_type: Optional[str] = Field(
                default=None,
                description=(
                    "İlan türü filtresi. Kabul edilen Türkçe değerler: "
                    "'staj' (internship), 'iş' veya 'tam zamanlı' (job), "
                    "'proje' (project), 'startup'. "
                    "Belirtilmezse tüm türler gösterilir."
                ),
            )

        class CourseNotesSearchInput(BaseModel):
            course_code: str = Field(
                default="",
                description=(
                    "Ders kodu filtresi. Örn: 'CENG101', 'MATH'. "
                    "Belirli bir ders notu aranıyorsa doldur, aksi halde boş bırak."
                ),
            )
            query: str = Field(
                default="",
                description=(
                    "Konu bazlı arama ifadesi. Örn: 'veritabanı normalizasyon'. "
                    "Topic başlığında ve topic'e bağlı entry içeriklerinde aranır."
                ),
            )

        # ---- Tool 1: Resmi doküman arama (FAISS) ---------------------- #

        async def _search_official_documents(query: str) -> str:
            """FAISS vektör araması ile kampüs resmi belgelerini sorgular."""
            results = await self.vector_service.search_official(
                query,
                k=settings.vector_search_k,
                university_id=user_ctx.university_id if user_ctx else None,
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

            # IndexFlatIP returns cosine scores — higher = more similar, so sort descending.
            docs.sort(key=lambda d: d.metadata.get("distance", float("-inf")), reverse=True)
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

        async def _get_active_marketplace_listings(
            category_keyword: str = "",
            min_price: Optional[float] = None,
            max_price: Optional[float] = None,
        ) -> str:
            """Aktif pazar yeri ilanlarını veritabanından getirir."""
            if db is None:
                return "Veritabanı bağlantısı mevcut değil."
            if not user_ctx or not user_ctx.university_id:
                return "Hata: Kullanıcı bağlamı bulunamadı veya üniversite bilgisi eksik."

            from src.models.marketplace import MarketplaceCategory, MarketplaceListing  # yerel import – döngüsel bağımlılığı önler

            stmt = (
                select(MarketplaceListing)
                .outerjoin(MarketplaceCategory, MarketplaceListing.category_id == MarketplaceCategory.id)
                .where(MarketplaceListing.status == "active")
                .where(MarketplaceListing.university_id == user_ctx.university_id)
                .options(selectinload(MarketplaceListing.category_rel))
            )

            kw = (category_keyword or "").strip()
            if kw:
                pattern = f"%{kw}%"
                stmt = stmt.where(
                    or_(
                        MarketplaceListing.title.ilike(pattern),
                        func.coalesce(MarketplaceCategory.name, "").ilike(pattern),
                    )
                )
            if min_price is not None:
                stmt = stmt.where(MarketplaceListing.price >= min_price)
            if max_price is not None:
                stmt = stmt.where(MarketplaceListing.price <= max_price)

            stmt = stmt.order_by(MarketplaceListing.created_at.desc()).limit(10)

            result = await db.execute(stmt)
            listings = result.scalars().all()

            if not listings:
                parts: List[str] = []
                if kw:
                    parts.append(f"'{category_keyword}' kategorisinde")
                if max_price is not None:
                    parts.append(f"{max_price} TL altında")
                elif min_price is not None:
                    parts.append(f"{min_price} TL üzerinde")
                suffix = " " + " ve ".join(parts) if parts else ""
                return f"Şu anda{suffix} aktif ilan bulunmuyor."

            rows = []
            for lst in listings:
                category_name = lst.category_rel.name if lst.category_rel else "Kategorisiz"
                price_str = f"{lst.price:.2f}".rstrip("0").rstrip(".")
                rows.append(
                    f"- [{lst.title}](/marketplace/{lst.id}) "
                    f"| Kategori: {category_name} | Fiyat: {price_str} TL | Durum: {lst.condition}"
                )
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

        async def _get_user_schedule(
            day: str,
            university: Optional[str] = None,
            department: Optional[str] = None,
            class_year: Optional[str] = None,
            semester: Optional[str] = None,
            academic_year: Optional[str] = None,
        ) -> str:
            """İstenen üniversite/bölüm/sınıf bilgisine göre ders programını döndürür."""
            if db is None:
                return "Veritabanı bağlantısı mevcut değil."

            import re as _re
            from datetime import date as _date

            eff_university_id = user_ctx.university_id if user_ctx else None
            eff_university_name = user_ctx.university if user_ctx else "Belirtilmemiş"
            eff_grade = class_year or (user_ctx.grade if user_ctx else None)

            # Normalize semester; auto-infer from current month when LLM omits it.
            _raw_semester = (semester or "").strip().lower()
            if not _raw_semester:
                _month = _date.today().month
                _raw_semester = "bahar" if 2 <= _month <= 6 else "güz"
            eff_semester = _raw_semester

            if not academic_year:
                _m, _y = _date.today().month, _date.today().year
                eff_year = f"{_y-1}-{_y}" if _m <= 6 else f"{_y}-{_y+1}"
            else:
                eff_year = academic_year

            if not eff_university_id:
                return (
                    "Ders programını görebilmek için üniversite bilgisi gerekiyor. "
                    "Profilinde bu bilgi eksikse profil ayarlarından tamamlayabilirsin."
                )

            if not eff_grade:
                return (
                    "Ders programını görmek için sınıf bilgisi gerekiyor. "
                    "Hangi sınıfın ders programını görmek istediğini belirt."
                )

            from src.models.academic import CourseSchedule  # yerel import

            # ---- Grade pattern -----------------------------------------------
            # DB stores class_year as bare digit "2", but LLM might send "2. Sınıf"
            # or "2.Sınıf". Extract only the leading digit and match loosely.
            _grade_match = _re.search(r"\d+", eff_grade or "")
            grade_digit = _grade_match.group() if _grade_match else ""
            # Pattern "2%" matches "2", "2. Sınıf", "2.sınıf" — no literal dot.
            grade_pattern = f"{grade_digit}%" if grade_digit else f"%{eff_grade}%"

            # ---- Department name resolution ----------------------------------
            # CourseSchedule.department is a plain name string (no FK).
            # The LLM may pass either a UUID (wrong, but possible) or a name string.
            _UUID_RE = _re.compile(
                r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                _re.IGNORECASE,
            )
            _dept_arg = department or (user_ctx.department if user_ctx else None) or ""
            if _UUID_RE.match(_dept_arg.strip()):
                # Received a UUID — look up the real name from the departments table.
                from src.models.department import Department as _Dept
                _dept_row = await db.execute(
                    select(_Dept.name).where(_Dept.id == _dept_arg.strip())
                )
                _dept_name = _dept_row.scalar_one_or_none() or ""
            else:
                _dept_name = _dept_arg.strip()

            eff_department = _dept_name  # display / error message label

            # Match on the first whitespace token: "Elektrik-Elektronik Mühendisliği" →
            # "%Elektrik-Elektronik%"  (hyphenated first word stays intact)
            _dept_words = [w for w in _re.split(r"\s+", _dept_name) if w]
            dept_pattern = f"%{_dept_words[0]}%" if _dept_words else None

            logger.debug(
                "[DEBUG SCHEDULE] Inferred Parameters -> "
                "Dept Pattern: %s, Grade Digit: %s, Semester: %s",
                dept_pattern, grade_digit, eff_semester,
            )

            # ---- Query helpers -----------------------------------------------
            def _base_conditions(*, include_dept: bool, include_year: bool) -> list:
                conds = [
                    CourseSchedule.university_id == eff_university_id,
                    CourseSchedule.class_year.ilike(grade_pattern),
                    CourseSchedule.semester.ilike(f"%{eff_semester}%"),
                    CourseSchedule.is_approved.is_(True),
                ]
                if include_dept and dept_pattern:
                    conds.append(CourseSchedule.department.ilike(dept_pattern))
                if include_year:
                    conds.append(CourseSchedule.academic_year == eff_year)
                return conds

            async def _run_query(*, include_dept: bool, include_year: bool):
                _stmt = (
                    select(CourseSchedule)
                    .where(*_base_conditions(include_dept=include_dept, include_year=include_year))
                    .order_by(CourseSchedule.academic_year.desc(), CourseSchedule.created_at.desc())
                    .limit(1)
                )
                return (await db.execute(_stmt)).scalar_one_or_none()

            # Pass 1 — exact year + department
            schedule = await _run_query(include_dept=True, include_year=True)
            logger.debug("[DEBUG SCHEDULE] Pass 1 (dept+year): %s", "FOUND id=" + str(schedule.id) if schedule else "NOT FOUND")

            # Pass 2 — any year, still filter by department
            if schedule is None:
                schedule = await _run_query(include_dept=True, include_year=False)
                logger.debug("[DEBUG SCHEDULE] Pass 2 (dept, no year): %s", "FOUND id=" + str(schedule.id) if schedule else "NOT FOUND")

            # Pass 3 — loose: university + semester + grade only (department may be mismatched)
            if schedule is None:
                schedule = await _run_query(include_dept=False, include_year=False)
                logger.debug("[DEBUG SCHEDULE] Pass 3 (loose, no dept/year): %s", "FOUND id=" + str(schedule.id) if schedule else "NOT FOUND")

            if schedule is None:
                # Diagnostic: show what records exist so mismatches are immediately visible.
                _diag_stmt = (
                    select(
                        CourseSchedule.department,
                        CourseSchedule.class_year,
                        CourseSchedule.semester,
                        CourseSchedule.academic_year,
                    )
                    .where(
                        CourseSchedule.university_id == eff_university_id,
                        CourseSchedule.is_approved.is_(True),
                    )
                    .limit(5)
                )
                _diag_rows = (await db.execute(_diag_stmt)).all()
                if _diag_rows:
                    logger.debug("[DEBUG SCHEDULE] University %s has %d approved schedule(s):", eff_university_id, len(_diag_rows))
                    for _r in _diag_rows:
                        logger.debug("  - dept=%r, class_year=%r, semester=%r, acad_year=%r", _r[0], _r[1], _r[2], _r[3])
                else:
                    logger.debug("[DEBUG SCHEDULE] No approved schedules at all for university_id=%r", eff_university_id)

                return (
                    f"{eff_university_name} üniversitesi, {eff_department or 'belirtilen bölüm'}, "
                    f"{eff_grade} için sisteme henüz onaylı ders programı yüklenmemiş. "
                    "Akademik sayfasından katkıda bulunabilirsin!"
                )

            # ---- JSON ayrıştırma ----------------------------------------- #
            try:
                raw_data: Dict[str, Any] = json.loads(schedule.schedule_data)
            except (json.JSONDecodeError, TypeError):
                return "Ders programı verisi okunamadı (bozuk format). Lütfen yöneticiyle iletişime geç."

            _DAY_EN_TO_TR: Dict[str, str] = {
                "monday":    "Pazartesi",
                "tuesday":   "Salı",
                "wednesday": "Çarşamba",
                "thursday":  "Perşembe",
                "friday":    "Cuma",
                "saturday":  "Cumartesi",
                "sunday":    "Pazar",
            }
            _DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

            # ---- Format tespiti ve Türkçe gün → satır eşlemesi oven ------ #
            # Yeni format: {"courses": [{"name":..., "slots":[{"day":"monday",...}]}]}
            # Eski format: {"Pazartesi": [{"ders":..., "saat":...}]}
            schedule_by_day: Dict[str, List[str]] = {}

            if "courses" in raw_data and isinstance(raw_data["courses"], list):
                # Yeni format — İngilizce slot gün adları
                day_buckets: Dict[str, List[str]] = {d: [] for d in _DAY_ORDER}
                for course in raw_data["courses"]:
                    name = (course.get("name") or "—").strip()
                    code = (course.get("code") or "").strip()
                    instructor = (course.get("instructor") or "").strip()
                    room = (course.get("room") or "").strip()
                    for slot in (course.get("slots") or []):
                        day_en = (slot.get("day") or "").lower().strip()
                        start = (slot.get("start_time") or "").strip()
                        end = (slot.get("end_time") or "").strip()
                        time_str = f"{start}–{end}" if start else ""
                        parts: List[str] = [f"• **{name}**"]
                        if code:
                            parts.append(f"[{code}]")
                        if time_str:
                            parts.append(f"🕐 {time_str}")
                        if instructor:
                            parts.append(f"👨‍🏫 {instructor}")
                        if room:
                            parts.append(f"🏛️ {room}")
                        if day_en in day_buckets:
                            day_buckets[day_en].append("  " + "  ".join(parts))
                schedule_by_day = {
                    _DAY_EN_TO_TR[d]: lines
                    for d, lines in day_buckets.items()
                    if lines
                }
            else:
                # Eski format — Türkçe gün adı keyli dict
                for day_raw, lessons in raw_data.items():
                    day_tr = _normalize_day(day_raw)
                    rows = [AIService._format_lesson(lsn) for lsn in (lessons or []) if lsn]
                    if rows:
                        schedule_by_day[day_tr] = rows

            # ---- Çıktı oluşturma ------------------------------------------ #
            normalized_day = _normalize_day(day)
            show_all = normalized_day.lower() in ("tümü", "tumü", "hepsi", "tüm hafta", "hafta")
            display_name = user_ctx.display_name if user_ctx else "Öğrenci"
            header = (
                f"{eff_university_name} — {eff_department} / {eff_grade} "
                f"({schedule.academic_year}, {schedule.semester})"
            )

            if show_all:
                if not schedule_by_day:
                    return f"📭 {header}: Ders programı boş."
                lines = [f"📅 **{display_name}** haftalık ders programı\n**{header}**\n"]
                for day_tr in [_DAY_EN_TO_TR[d] for d in _DAY_ORDER if _DAY_EN_TO_TR[d] in schedule_by_day]:
                    lines.append(f"\n**{day_tr}**")
                    lines.extend(schedule_by_day[day_tr])
                return "\n".join(lines)

            # Belirli bir gün
            matched_day = next(
                (d for d in schedule_by_day if _normalize_day(d) == normalized_day),
                None,
            )
            if matched_day is None:
                available = ", ".join(schedule_by_day.keys()) or "—"
                return (
                    f"📭 **{normalized_day}** günü için ders bulunamadı.\n"
                    f"Programda ders olan günler: {available}."
                )
            lines = [
                f"📅 **{display_name}** — **{matched_day}** ders programı\n**{header}**\n"
            ]
            lines.extend(schedule_by_day[matched_day])
            return "\n".join(lines)

        # ---- Tool 5: Forum konu araması (ForumTopic + User join) --------- #

        # Genel/zaman belirten sorgular için keyword listesi — ilike yerine "en yeni" modu tetiklenir
        _FORUM_GENERIC_KEYWORDS = frozenset({
            "en son", "son", "yeni", "gündem", "neler var", "neler oluyor",
            "ne var", "ne paylaşıldı", "ne yazıyor", "genel", "hepsi", "tümü",
        })

        async def _search_forum_topics(query: Optional[str] = "") -> str:
            """Forum konularında arama yapar; boş query en yeni gönderileri getirir."""
            if db is None:
                return "Veritabanı bağlantısı mevcut değil."

            from src.models.forum import ForumTopic  # yerel import

            kw = (query or "").strip().lower()

            # Jenerik/zaman sorgusunu tespit et: boşsa veya sadece genel kelimeler içeriyorsa
            is_generic = not kw or any(token in kw for token in _FORUM_GENERIC_KEYWORDS)

            base_stmt = (
                select(ForumTopic)
                .where(ForumTopic.is_deleted == False)  # noqa: E712
                .options(selectinload(ForumTopic.author))
                .order_by(ForumTopic.created_at.desc())
            )

            # Multi-tenant: AI sadece kullanıcının üniversitesinin verilerini görsün
            if user_ctx and user_ctx.university_id:
                base_stmt = base_stmt.where(
                    or_(
                        ForumTopic.university_id == user_ctx.university_id,
                        ForumTopic.university_id.is_(None),
                    )
                )

            if is_generic:
                stmt = base_stmt.limit(5)
                header = "Forum'daki en yeni 5 gönderi"
            else:
                pattern = f"%{kw}%"
                stmt = base_stmt.where(
                    or_(
                        ForumTopic.title.ilike(pattern),
                        ForumTopic.content.ilike(pattern),
                    )
                ).limit(6)
                header = f"Forum'da '{query}' için sonuçlar"

            result = await db.execute(stmt)
            topics = result.scalars().all()

            if not topics:
                if is_generic:
                    return "Forum'da henüz hiç gönderi yok."
                return f"Forum'da '{query}' ile ilgili konu bulunamadı."

            rows = []
            for t in topics:
                author_name = "Anonim"
                if t.author:
                    author_name = f"{t.author.first_name} {t.author.last_name}".strip() or t.author.username
                snippet = t.content[:120].replace("\n", " ")
                if len(t.content) > 120:
                    snippet += "..."
                rows.append(
                    f"- [{t.title}](/forum/{t.id}) (Yazar: {author_name} | {t.reply_count} yorum)\n  {snippet}"
                )

            return f"{header} ({len(rows)} sonuç):\n" + "\n".join(rows)

        # ---- Tool 6: Akademik takvim etkinlikleri (AcademicCalendarEvent) #

        async def _get_academic_calendar(
            event_type_keyword: str = "",
            university: Optional[str] = None,
        ) -> str:
            """İstenen üniversiteye ait onaylı akademik takvim etkinliklerini döndürür."""
            if db is None:
                return "Veritabanı bağlantısı mevcut değil."

            from src.models.academic import AcademicCalendarEvent  # yerel import

            university_filter_id = user_ctx.university_id if user_ctx else None
            university_filter_name = user_ctx.university if user_ctx else None

            if not university_filter_id:
                return "Akademik takvim için üniversite bilgin eksik görünüyor."

            stmt = select(AcademicCalendarEvent).where(
                AcademicCalendarEvent.is_approved == True,  # noqa: E712
                AcademicCalendarEvent.university_id == university_filter_id,
            )

            kw = (event_type_keyword or "").strip().lower()
            TYPE_MAP = {
                "sınav": "exam", "vize": "exam", "final": "exam",
                "yarıyıl sonu": "exam", "yıl sonu": "exam",
                "kayıt": "registration", "oryantasyon": "registration",
                "tatil": "holiday", "bayram": "holiday",
            }
            mapped_type = next((v for k, v in TYPE_MAP.items() if k in kw), None)
            if mapped_type:
                stmt = stmt.where(AcademicCalendarEvent.event_type == mapped_type)
            elif kw:
                pattern = f"%{kw}%"
                stmt = stmt.where(
                    or_(
                        AcademicCalendarEvent.title.ilike(pattern),
                        AcademicCalendarEvent.description.ilike(pattern),
                    )
                )

            stmt = stmt.order_by(AcademicCalendarEvent.start_date.asc()).limit(15)
            result = await db.execute(stmt)
            events = result.scalars().all()

            if not events:
                suffix = f" '{event_type_keyword}' ile ilgili" if kw else ""
                uni_info = f" ({university_filter_name})" if university_filter_name else ""
                return f"Akademik takvimde{suffix}{uni_info} onaylı etkinlik bulunamadı."

            type_labels = {
                "exam": "Sınav/Vize/Final",
                "registration": "Kayıt/Oryantasyon",
                "holiday": "Tatil/Bayram",
                "other": "Diğer",
            }

            rows = []
            for ev in events:
                label = type_labels.get(ev.event_type, ev.event_type)
                date_str = str(ev.start_date)
                if ev.end_date and ev.end_date != ev.start_date:
                    date_str += f" – {ev.end_date}"
                desc = f" ({ev.description})" if ev.description else ""
                rows.append(f"- **{ev.title}** [{label}] | 📅 {date_str}{desc}")

            header = f"Akademik Takvim Etkinlikleri"
            if university_filter_name:
                header += f" – {university_filter_name}"
            if kw:
                header += f" (filtre: {event_type_keyword})"
            return f"**{header}** ({len(rows)} etkinlik):\n" + "\n".join(rows)

        # ---- Tool 7: Ders notları araması (CourseNoteTopic + Entry) ---- #

        async def _search_course_notes(course_code: str = "", query: str = "") -> str:
            """Kullanıcının üniversitesindeki ders notu havuzlarında arama yapar."""
            if db is None:
                return "Veritabanı bağlantısı mevcut değil."

            if not user_ctx or not user_ctx.university_id:
                return "Hata: Kullanıcı bağlamı bulunamadı veya üniversite bilgisi eksik."

            try:
                stmt = select(CourseNoteTopic).where(
                    CourseNoteTopic.university_id == user_ctx.university_id
                )

                if course_code:
                    stmt = stmt.where(CourseNoteTopic.course_code.ilike(f"%{course_code}%"))

                if query:
                    stmt = stmt.join(CourseNoteEntry, isouter=True).where(
                        or_(
                            CourseNoteTopic.title.ilike(f"%{query}%"),
                            CourseNoteEntry.content.ilike(f"%{query}%"),
                        )
                    )

                stmt = stmt.distinct().limit(5)
                result = await db.execute(stmt)
                topics = result.scalars().unique().all()

                if not topics:
                    return (
                        "Aradığınız kriterlere uygun ders notu bulunamadı. "
                        "Lütfen farklı kelimelerle tekrar deneyin."
                    )

                output = "Bulunan Ders Notu Havuzları:\n\n"
                for topic in topics:
                    output += f"- Ders: {topic.course_code} | Başlık: {topic.title}\n"

                    entries_stmt = (
                        select(CourseNoteEntry)
                        .where(
                            and_(
                                CourseNoteEntry.topic_id == topic.id,
                                CourseNoteEntry.content.is_not(None),
                            )
                        )
                        .limit(2)
                    )
                    entries_result = await db.execute(entries_stmt)
                    entries = entries_result.scalars().all()

                    for entry in entries:
                        snippet = entry.content[:150] + ("..." if len(entry.content) > 150 else "")
                        output += f"  * İçerik Özeti: {snippet}\n"

                return output
            except Exception as exc:
                return f"Ders notları aranırken bir hata oluştu: {str(exc)}"

        # ---- Tool 8: Kariyer ilanları (CareerListing) ----------------- #

        _JOB_TYPE_MAP: Dict[str, str] = {
            "staj": "internship",
            "iş": "job",
            "tam zamanlı": "job",
            "proje": "project",
            "startup": "startup",
        }

        async def _get_career_listings(
            keyword: Optional[str] = None,
            job_type: Optional[str] = None,
        ) -> str:
            """Aktif kariyer ilanlarını başlık/şirket ve ilan türüne göre getirir."""
            if db is None:
                return "Veritabanı bağlantısı mevcut değil."
            if not user_ctx or not user_ctx.university_id:
                return "Hata: Kullanıcı bağlamı bulunamadı veya üniversite bilgisi eksik."

            from src.models.career import CareerListing  # yerel import – döngüsel bağımlılığı önler

            stmt = select(CareerListing).where(
                CareerListing.status == "active",
                CareerListing.university_id == user_ctx.university_id,
            )

            kw = (keyword or "").strip()
            if kw:
                pattern = f"%{kw}%"
                stmt = stmt.where(
                    or_(
                        CareerListing.title.ilike(pattern),
                        func.coalesce(CareerListing.company_name, "").ilike(pattern),
                    )
                )

            if job_type:
                normalized_type = job_type.strip().lower()
                mapped = next(
                    (v for k, v in _JOB_TYPE_MAP.items() if k in normalized_type),
                    None,
                )
                if mapped:
                    stmt = stmt.where(CareerListing.type == mapped)

            stmt = stmt.order_by(CareerListing.created_at.desc()).limit(10)
            result = await db.execute(stmt)
            listings = result.scalars().all()

            if not listings:
                parts: List[str] = []
                if kw:
                    parts.append(f"'{keyword}'")
                if job_type:
                    parts.append(f"tür: {job_type}")
                suffix = " (" + ", ".join(parts) + ")" if parts else ""
                return f"Şu anda aktif kariyer ilanı bulunamadı{suffix}."

            _TYPE_LABELS: Dict[str, str] = {
                "job": "İş İlanı",
                "internship": "Staj",
                "startup": "Startup",
                "project": "Proje",
            }
            rows = []
            for lst in listings:
                company = lst.company_name or "Belirtilmemiş"
                type_label = _TYPE_LABELS.get(lst.type, lst.type)
                remote_tag = " 🌐 Uzaktan" if lst.is_remote else ""
                location = f" | 📍 {lst.location}" if lst.location else ""
                rows.append(
                    f"- [{lst.title} — {company}](/career/{lst.id}) "
                    f"| Tür: {type_label}{remote_tag}{location}"
                )
            return f"Kariyer ilanları ({len(listings)} sonuç):\n" + "\n".join(rows)

        # ---- Tool 9: Bilgi tabanı araması (AIKnowledgeBase) ----------- #

        async def _search_knowledge_base(query: str) -> str:
            """Admin tarafından oluşturulan özel SSS/bilgi tabanında arama yapar."""
            logger.debug("[DEBUG RAG] KB Search triggered with query argument: %r", query)

            if db is None:
                return "Veritabanı bağlantısı mevcut değil."

            from src.models.ai import AIKnowledgeBase  # yerel import – döngüsel bağımlılığı önler

            normalized_query = query.strip().lower()

            # Stop-words that carry no matching signal — skip them so a sentence like
            # "bahar şenliği ne zaman" doesn't reduce to zero meaningful tokens.
            _STOP_WORDS = frozenset({
                "ne", "nerede", "nedir", "neden", "nasıl", "kim", "kaç", "kaçta",
                "zaman", "var", "mı", "mi", "mu", "mü", "bir", "bu",
                "şu", "da", "de", "ve", "ile", "için", "gibi", "çok", "en",
                "hakkında", "olan",
            })

            # Tokenize: split on whitespace/punctuation, drop stop-words and single-char
            # tokens. Threshold is > 1 (not > 2) so valid 2-char words like "iş", "ev"
            # are kept — dropping them would silently break job/career queries.
            raw_tokens = re.split(r"[\s,;.!?]+", normalized_query)
            tokens = [t for t in raw_tokens if len(t) > 1 and t not in _STOP_WORDS]

            # Fallback: if all tokens were filtered out, use the full phrase as-is.
            if not tokens and normalized_query:
                tokens = [normalized_query]

            logger.debug("[DEBUG RAG] KB Search tokens after stop-word filter: %s", tokens)

            stmt = select(AIKnowledgeBase).where(AIKnowledgeBase.is_active.is_(True))

            if tokens:
                # Each token generates its own ilike pair; rows matching ANY token are
                # returned (OR logic), so "bahar" alone is enough to hit "bahar şenliği".
                token_clauses = [
                    or_(
                        AIKnowledgeBase.keywords.ilike(f"%{token}%"),
                        AIKnowledgeBase.answer.ilike(f"%{token}%"),
                    )
                    for token in tokens
                ]
                stmt = stmt.where(or_(*token_clauses))

            stmt = stmt.order_by(AIKnowledgeBase.priority.desc()).limit(20)

            result = await db.execute(stmt)
            entries = result.scalars().all()

            logger.debug("[DEBUG RAG] KB Search found %d results from DB", len(entries))

            if not entries:
                return "Bilgi tabanında eşleşen kayıt bulunamadı."

            # Cap each answer to 600 chars so a single verbose KB entry can't
            # consume a disproportionate share of the LLM context window.
            def _cap(text: str, limit: int = 600) -> str:
                return text[:limit] + "…" if len(text) > limit else text

            return "\n\n---\n\n".join(_cap(entry.answer) for entry in entries)

        # ---- StructuredTool sarmalayıcıları --------------------------- #

        tools: List[StructuredTool] = [
            StructuredTool.from_function(
                coroutine=_search_forum_topics,
                name="search_forum_topics",
                description=(
                    "Öğrencilerin forum'da paylaştığı konuları ve tartışmaları arar. "
                    "Öğrenciler forum gönderileri, diğer öğrencilerin yazdıkları veya "
                    "platformdaki tartışmalar hakkında soru sorduğunda bu aracı kullan."
                ),
                args_schema=SearchForumInput,
            ),
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
            StructuredTool.from_function(
                coroutine=_get_academic_calendar,
                name="get_academic_calendar",
                description=(
                    "Kullanıcının üniversitesine ait onaylı akademik takvim etkinliklerini getirir. "
                    "Use ONLY for official academic dates (e.g., exams, course registrations, official holidays, graduation). "
                    "DO NOT use this for campus life events, festivals (şenlik), concerts, or student club activities."
                ),
                args_schema=AcademicCalendarInput,
            ),
            StructuredTool.from_function(
                coroutine=_search_course_notes,
                name="search_course_notes",
                description=(
                    "Kullanıcının üniversitesindeki ders notu havuzlarında arama yapar. "
                    "Ders koduna göre veya konu ifadesine göre topic ve entry içeriklerini bulur. "
                    "Kullanıcı ders notu, özet not veya belirli konu notu istediğinde bu aracı kullan."
                ),
                args_schema=CourseNotesSearchInput,
            ),
            StructuredTool.from_function(
                coroutine=_search_knowledge_base,
                name="search_knowledge_base",
                description=(
                    "Search the university's general knowledge base. "
                    "Use this for campus life, transportation, festivals (şenlik), concerts, food services, and FAQs. "
                    "If a user asks about an event and it's not in the academic calendar, you MUST search here."
                ),
                args_schema=KnowledgeBaseSearchInput,
            ),
            StructuredTool.from_function(
                coroutine=_get_career_listings,
                name="get_career_listings",
                description=(
                    "Platformdaki aktif kariyer ilanlarını (iş, staj, proje, startup) listeler. "
                    "Kullanıcı iş ilanı, staj fırsatı, kariyer, şirket ilanı veya proje arayışı "
                    "hakkında soru sorduğunda bu aracı kullan. "
                    "Anahtar kelime (şirket adı, pozisyon) ve ilan türü (staj, iş, proje) ile filtrelenebilir."
                ),
                args_schema=CareerInput,
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
                    "Akademik engel tetiklendi (kullanıcı: %s, soru uzunluğu: %s)",
                    user_id, len(question or ""),
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
                        "Kullanıcı bağlamı yüklendi (üniversite: %s, bölüm: %s, sınıf: %s)",
                        user_ctx.university, user_ctx.department, user_ctx.grade,
                    )

            # ---- 3. Agent kurulumu ----------------------------------- #
            chat_history = self._format_chat_history(session_history or [])
            tools, retrieved_docs = self._build_tools(db, user_ctx)
            prompt_template = await self._load_prompt_template(db)
            system_prompt = self._build_system_prompt(user_ctx, template=prompt_template)
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
                    "AI agent zaman aşımına uğradı (%ss, model: %s, soru: %s karakter)",
                    self.QUERY_TOTAL_TIMEOUT, self._active_model, len(question or ""),
                )
                raise

            except Exception as model_error:
                fallback = "gemini-2.5-flash"
                if self._is_model_not_found_error(model_error) and self._active_model != fallback:
                    logger.warning(
                        "Model hatası, yedek modele geçildi (%s → %s): %s",
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
                "AI sorgusu tamamlandı (model: %s, cevap: %s karakter)",
                self._active_model, len(answer or ""),
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
                "AI sorgusu başarısız (hata: %s — %s)",
                type(e).__name__, repr(e),
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
            "Konuşma sıfırlama isteği alındı (kullanıcı: %s, oturum: %s)",
            user_id,
            session_id,
        )

    def switch_language(self, language: str) -> bool:
        """Prompt dilini değiştir (şu anda agent tek dil promptu kullanıyor)."""
        if language in ("tr", "en"):
            self.current_language = language
            logger.info("Dil değiştirildi: %s", language)
            return True
        logger.warning("Desteklenmeyen dil: %s", language)
        return False
