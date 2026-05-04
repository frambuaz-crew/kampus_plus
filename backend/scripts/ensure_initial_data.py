"""Idempotent initial data seeding for local onboarding.

This script guarantees:
- Super admin account (admin@abc.com)
- KGTU university admin + student test accounts
- Selcuk student test account
- Realistic Turkish dummy content for all core modules

Existing users are only updated for university_id fixes.
"""

import asyncio
import sys
from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from sqlalchemy import and_, select

# Backend root'u Python path'ine ekle
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.core.database import get_engine, get_session_factory
from src.core.security import hash_password, verify_password
from src.models.academic import AcademicCalendarEvent, CourseSchedule
from src.models.career import CareerListing
from src.models.course_notes import CourseNoteEntry, CourseNoteTopic
from src.models.department import Department
from src.models.faculty import Faculty
from src.models.forum import ForumCategory, ForumTopic
from src.models.marketplace import MarketplaceCategory, MarketplaceListing
from src.models.university import University
from src.models.user import User, UserRole


SUPER_ADMIN_EMAIL = "admin@abc.com"
SUPER_ADMIN_PASSWORD = "admin123"
SUPER_ADMIN_FIRST_NAME = "Super"
SUPER_ADMIN_LAST_NAME = "Admin"
SUPER_ADMIN_USERNAME = "admin_abc"
SUPER_ADMIN_UNIVERSITY_NAME = "Konya Gıda ve Tarım Üniversitesi"
SUPER_ADMIN_FACULTY_NAME = "Mühendislik ve Mimarlık Fakültesi"
SUPER_ADMIN_DEPARTMENT_NAME = "Bilgisayar Mühendisliği"

KGTU_UNI_NAME = "Konya Gıda ve Tarım Üniversitesi"
SELCUK_UNI_NAME = "Selçuk Üniversitesi"

LEGACY_EMAILS: dict[str, str] = {
    "kgtu_admin@kgtu.edu.tr": "kgtu_admin@kampusplus.edu.tr",
    "kgtu_student@kgtu.edu.tr": "kgtu_student@kampusplus.edu.tr",
    "selcuk_student@selcuk.edu.tr": "selcuk_student@kampusplus.edu.tr",
}


@dataclass(frozen=True)
class AccountSeed:
    email: str
    password: str
    role: UserRole
    first_name: str
    last_name: str
    username: str
    university_name: str


ACCOUNT_SEEDS: tuple[AccountSeed, ...] = (
    AccountSeed(
        email=SUPER_ADMIN_EMAIL,
        password=SUPER_ADMIN_PASSWORD,
        role=UserRole.ADMIN,
        first_name=SUPER_ADMIN_FIRST_NAME,
        last_name=SUPER_ADMIN_LAST_NAME,
        username=SUPER_ADMIN_USERNAME,
        university_name=SUPER_ADMIN_UNIVERSITY_NAME,
    ),
    AccountSeed(
        email="kgtu_admin@kgtu.edu.tr",
        password="admin123",
        role=UserRole.UNIVERSITY_ADMIN,
        first_name="KGTU",
        last_name="Admin",
        username="kgtu_admin",
        university_name=KGTU_UNI_NAME,
    ),
    AccountSeed(
        email="kgtu_student@kgtu.edu.tr",
        password="student123",
        role=UserRole.STUDENT,
        first_name="KGTU",
        last_name="Student",
        username="kgtu_student",
        university_name=KGTU_UNI_NAME,
    ),
    AccountSeed(
        email="selcuk_student@selcuk.edu.tr",
        password="student123",
        role=UserRole.STUDENT,
        first_name="Selcuk",
        last_name="Student",
        username="selcuk_student",
        university_name=SELCUK_UNI_NAME,
    ),
)


def _utc_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def _ensure_super_admin_university(session) -> University:
    result = await session.execute(
        select(University).where(University.name == SUPER_ADMIN_UNIVERSITY_NAME)
    )
    university = result.scalar_one_or_none()
    if university:
        return university

    university = University(
        id=str(uuid4()),
        name=SUPER_ADMIN_UNIVERSITY_NAME,
        university_type="devlet",
        city="Konya",
        is_active=True,
    )
    session.add(university)
    await session.flush()
    return university


async def _ensure_super_admin_faculty(session, university_id: str) -> Faculty:
    result = await session.execute(
        select(Faculty).where(
            and_(
                Faculty.name == SUPER_ADMIN_FACULTY_NAME,
                Faculty.university_id == university_id,
            )
        )
    )
    faculty = result.scalar_one_or_none()
    if faculty:
        return faculty

    faculty = Faculty(
        id=str(uuid4()),
        name=SUPER_ADMIN_FACULTY_NAME,
        university_id=university_id,
        is_active=True,
    )
    session.add(faculty)
    await session.flush()
    return faculty


async def _ensure_super_admin_department(session, faculty_id: str) -> Department:
    result = await session.execute(
        select(Department).where(
            and_(
                Department.name == SUPER_ADMIN_DEPARTMENT_NAME,
                Department.faculty_id == faculty_id,
            )
        )
    )
    department = result.scalar_one_or_none()
    if department:
        return department

    department = Department(
        id=str(uuid4()),
        name=SUPER_ADMIN_DEPARTMENT_NAME,
        faculty_id=faculty_id,
        is_active=True,
    )
    session.add(department)
    await session.flush()
    return department


async def _get_university_by_name_required(session, university_name: str) -> University:
    result = await session.execute(
        select(University).where(University.name == university_name)
    )
    university = result.scalar_one_or_none()
    if not university:
        raise RuntimeError(
            f"Universite bulunamadi: {university_name}. "
            "Oncesinde seed_konya_normalized calismis olmali."
        )
    return university


async def _get_university_by_name_ilike_required(session, university_name: str) -> University:
    result = await session.execute(
        select(University).where(University.name.ilike(f"%{university_name}%"))
    )
    university = result.scalar_one_or_none()
    if not university:
        raise RuntimeError(
            f"Universite bulunamadi (ILIKE): {university_name}. "
            "Oncesinde seed_konya_normalized calismis olmali."
        )
    return university


async def _get_any_department_for_university_required(session, university_id: str, university_name: str) -> Department:
    stmt = (
        select(Department)
        .join(Faculty, Department.faculty_id == Faculty.id)
        .where(Faculty.university_id == university_id)
        .order_by(Department.name.asc())
    )
    result = await session.execute(stmt)
    department = result.scalars().first()
    if not department:
        raise RuntimeError(
            f"Universite icin bolum bulunamadi: {university_name}. "
            "Oncesinde seed_konya_normalized calismis olmali."
        )
    return department


async def _build_university_department_map(session) -> dict[str, tuple[str, str]]:
    # 🚀 Artık tüm üniversiteler seed_konya_normalized.py tarafından var
    # Super admin da KGTU'ye atandığı için bu fonksiyonlar kaldırıldı

    # Üniversite isimlerinden university_id ve bir department_id bul.
    super_admin_uni = await _get_university_by_name_required(session, SUPER_ADMIN_UNIVERSITY_NAME)
    super_admin_dep = await _get_any_department_for_university_required(session, super_admin_uni.id, SUPER_ADMIN_UNIVERSITY_NAME)

    kgtu_uni = await _get_university_by_name_required(session, KGTU_UNI_NAME)
    kgtu_dep = await _get_any_department_for_university_required(session, kgtu_uni.id, KGTU_UNI_NAME)

    selcuk_uni = await _get_university_by_name_required(session, SELCUK_UNI_NAME)
    selcuk_dep = await _get_any_department_for_university_required(session, selcuk_uni.id, SELCUK_UNI_NAME)

    return {
        SUPER_ADMIN_UNIVERSITY_NAME: (super_admin_uni.id, super_admin_dep.id),
        KGTU_UNI_NAME: (kgtu_uni.id, kgtu_dep.id),
        SELCUK_UNI_NAME: (selcuk_uni.id, selcuk_dep.id),
    }


async def _resolve_account_university(
    session,
    account: AccountSeed,
    uni_dep_map: dict[str, tuple[str, str]],
) -> tuple[str, str, str]:
    if account.email == "kgtu_admin@kgtu.edu.tr":
        kgtu_university = await _get_university_by_name_ilike_required(session, KGTU_UNI_NAME)
        university_id = kgtu_university.id
        university_name = kgtu_university.name
        _, department_id = uni_dep_map[account.university_name]
        return university_id, department_id, university_name

    university_id, department_id = uni_dep_map[account.university_name]
    return university_id, department_id, account.university_name


async def ensure_initial_data() -> None:
    session_factory = get_session_factory()

    async with session_factory() as session:
        uni_dep_map = await _build_university_department_map(session)
        created_count = 0
        skipped_count = 0
        updated_count = 0

        for account in ACCOUNT_SEEDS:
            existing_user_result = await session.execute(
                select(User).where(User.email == account.email)
            )
            existing_user = existing_user_result.scalar_one_or_none()

            legacy_email = LEGACY_EMAILS.get(account.email)
            legacy_email_migrated = False
            if not existing_user and legacy_email:
                legacy_result = await session.execute(
                    select(User).where(User.email == legacy_email)
                )
                existing_user = legacy_result.scalar_one_or_none()
                if existing_user:
                    existing_user.email = account.email
                    legacy_email_migrated = True
                    print(f"[UPDATE] {legacy_email} email guncellendi -> {account.email}")

            university_id, department_id, university_name = await _resolve_account_university(
                session,
                account,
                uni_dep_map,
            )

            if existing_user:
                updated = legacy_email_migrated

                if (
                    existing_user.university_id != university_id
                    or existing_user.university != university_name
                ):
                    existing_user.university = university_name
                    existing_user.university_id = university_id
                    updated = True

                if not existing_user.department_id:
                    existing_user.department_id = department_id
                    updated = True

                if not verify_password(account.password, existing_user.password_hash):
                    existing_user.password_hash = hash_password(account.password)
                    updated = True

                if not existing_user.is_verified:
                    existing_user.is_verified = True
                    updated = True

                if not existing_user.is_active:
                    existing_user.is_active = True
                    updated = True

                if not existing_user.terms_accepted_at:
                    existing_user.terms_accepted_at = _utc_naive()
                    updated = True

                if updated:
                    updated_count += 1
                    print(f"[UPDATE] {account.email} guncellendi.")
                else:
                    skipped_count += 1
                    print(f"[SKIP] {account.email} zaten mevcut, degisiklik yapilmadi.")
                continue

            user = User(
                id=str(uuid4()),
                email=account.email,
                password_hash=hash_password(account.password),
                first_name=account.first_name,
                last_name=account.last_name,
                username=account.username,
                university=university_name,
                university_id=university_id,
                department_id=department_id,
                role=account.role,
                is_verified=True,
                is_active=True,
                terms_accepted_at=_utc_naive(),
            )
            session.add(user)
            created_count += 1
            print(f"[OK] Olusturuldu: {account.email} ({account.role.value})")

            if account.email == "kgtu_admin@kgtu.edu.tr":
                await session.commit()
                await session.refresh(user)

        await session.commit()
        print(f"[DONE] created={created_count}, updated={updated_count}, skipped={skipped_count}")


async def seed_dummy_content() -> None:
    """Modüller için gerçekçi Türkçe dummy içerik oluşturur — idempotent."""
    session_factory = get_session_factory()

    async with session_factory() as session:
        # --- Gerekli varlıkları getir ---
        kgtu_uni = (await session.execute(
            select(University).where(University.name == KGTU_UNI_NAME)
        )).scalar_one_or_none()

        selcuk_uni = (await session.execute(
            select(University).where(University.name == SELCUK_UNI_NAME)
        )).scalar_one_or_none()

        kgtu_student = (await session.execute(
            select(User).where(User.email == "kgtu_student@kgtu.edu.tr")
        )).scalar_one_or_none()

        selcuk_student = (await session.execute(
            select(User).where(User.email == "selcuk_student@selcuk.edu.tr")
        )).scalar_one_or_none()

        if not all([kgtu_uni, selcuk_uni, kgtu_student, selcuk_student]):
            print("[SKIP] Gerekli kullanıcı/üniversite bulunamadı, dummy content atlandı.")
            return

        now = _utc_naive()

        # ─────────────────────────────────────────────
        # FORUM
        # ─────────────────────────────────────────────
        forum_cat_name = "Kampüs Yaşamı"
        forum_cat = (await session.execute(
            select(ForumCategory).where(
                and_(
                    ForumCategory.name == forum_cat_name,
                    ForumCategory.university_id == kgtu_uni.id,
                )
            )
        )).scalar_one_or_none()
        if not forum_cat:
            forum_cat = ForumCategory(
                id=str(uuid4()),
                name=forum_cat_name,
                description="Kampüs yaşamına dair güncel tartışmalar",
                icon="campus",
                order_index=1,
                is_active=True,
                university_id=kgtu_uni.id,
                created_at=now,
            )
            session.add(forum_cat)
            await session.flush()
            print(f"[OK] ForumCategory oluşturuldu: {forum_cat_name}")
        else:
            print(f"[SKIP] ForumCategory zaten mevcut: {forum_cat_name}")

        forum_topics = [
            {
                "title": "Yemekhane fiyatları ve menü kalitesi hakkında",
                "content": (
                    "Bu dönem yemekhane fiyatlarında ciddi bir artış yaşandı. "
                    "Öğle yemeği artık 45 TL'ye çıktı ancak menü kalitesi aynı düzeyde kalmadı. "
                    "Özellikle hafta içi öğle yemeklerinde seçenek azlığı dikkat çekiyor; "
                    "et yemekleri haftada yalnızca 2 kez sunuluyor. "
                    "Üniversite yönetimine bu konuda resmi dilekçe vermek isteyenler var mı?"
                ),
                "author": kgtu_student,
                "university_id": kgtu_uni.id,
                "category_id": forum_cat.id,
                "tags": ["yemekhane", "fiyat", "menü", "Konya Gıda ve Tarım Üniversitesi"],
            },
            {
                "title": "Vize haftası kütüphane çalışma saatleri uzatılsın",
                "content": (
                    "Vize döneminde kütüphanenin saat 22:00'de kapanması öğrenciler için "
                    "yetersiz kalmaktadır. Özellikle mühendislik ve fen bilimleri öğrencileri "
                    "gece geç saatlere kadar çalışmak durumunda kalıyor. "
                    "Diğer devlet üniversitelerinde vize döneminde 24 saat açık kütüphane "
                    "uygulaması bulunmaktadır. Bu konuda kütüphane yönetimine ortak dilekçe "
                    "hazırlamak istiyorum, destek verir misiniz?"
                ),
                "author": kgtu_student,
                "university_id": kgtu_uni.id,
                "category_id": forum_cat.id,
                "tags": ["kütüphane", "vize", "çalışma saatleri", "Konya Gıda ve Tarım Üniversitesi"],
            },
            {
                "title": "Selçuk Üniversitesi Kampüs İçi Ulaşım Sorunları",
                "content": (
                    "Selçuk Üniversitesi ana kampüsüne gelen belediye otobüslerinin sıklığı "
                    "hâlâ yetersiz durumda. Sabah 08:00–09:00 saatleri arasında yoğunluk "
                    "çok fazla; bazen otobüse binemeden ders kaçırmak zorunda kalıyoruz. "
                    "Ayrıca kampüs içi servis hattının Mühendislik Fakültesi'ne kadar uzatılması "
                    "gerekiyor. Üniversite yönetimiyle iletişime geçmek isteyen var mı?"
                ),
                "author": selcuk_student,
                "university_id": selcuk_uni.id,
                "category_id": None,
                "tags": ["ulaşım", "kampüs", "otobüs", "Selçuk"],
            },
        ]

        for td in forum_topics:
            exists = (await session.execute(
                select(ForumTopic).where(ForumTopic.title == td["title"])
            )).scalars().first()
            if not exists:
                session.add(ForumTopic(
                    id=str(uuid4()),
                    title=td["title"],
                    content=td["content"],
                    author_id=td["author"].id,
                    university_id=td["university_id"],
                    category_id=td["category_id"],
                    topic_type="text",
                    tags=td["tags"],
                    is_pinned=False,
                    is_deleted=False,
                    view_count=0,
                    reply_count=0,
                    helpful_count=0,
                    created_at=now,
                    updated_at=now,
                ))
                print(f"[OK] ForumTopic oluşturuldu: {td['title'][:55]}")
            else:
                print(f"[SKIP] ForumTopic zaten mevcut: {td['title'][:55]}")

        # ─────────────────────────────────────────────
        # MARKETPLACE KATEGORİLERİ (idempotent)
        # ─────────────────────────────────────────────
        category_defs = [
            {"name": "Elektronik",            "icon": "laptop",     "order_index": 1},
            {"name": "Kitap & Ders Materyali","icon": "book-open",  "order_index": 2},
            {"name": "Kırtasiye & Eğitim",    "icon": "pencil",     "order_index": 3},
        ]
        category_map: dict[str, str] = {}
        for cdef in category_defs:
            cat = (await session.execute(
                select(MarketplaceCategory).where(MarketplaceCategory.name == cdef["name"])
            )).scalars().first()
            if not cat:
                cat = MarketplaceCategory(
                    id=str(uuid4()),
                    name=cdef["name"],
                    icon=cdef["icon"],
                    order_index=cdef["order_index"],
                    is_active=True,
                )
                session.add(cat)
                await session.flush()
                print(f"[OK] MarketplaceCategory oluşturuldu: {cdef['name']}")
            else:
                print(f"[SKIP] MarketplaceCategory zaten mevcut: {cdef['name']}")
            category_map[cdef["name"]] = cat.id

        # ─────────────────────────────────────────────
        # MARKETPLACE
        # ─────────────────────────────────────────────
        marketplace_listings = [
            {
                "title": "İkinci el temiz CASIO fx-82MS hesap makinesi",
                "description": (
                    "1 yıllık kullanım, hiç arızalanmadı. Mühendislik ve fen bilimleri "
                    "öğrencileri için idealdir. Orijinal kutusu ve kılıfı mevcuttur. "
                    "Kampüste teslim, pazarlık payı vardır."
                ),
                "price": Decimal("150.00"),
                "category": "Elektronik",
                "condition": "like_new",
                "seller": kgtu_student,
            },
            {
                "title": "Mühendislik çizim seti (Konya Gıda ve Tarım Üniversitesi Mimarlık için uygun)",
                "description": (
                    "Mimarlık 1. sınıf için gerekli tüm çizim aletleri dahil: T-cetvel, gönye "
                    "takımı, iletki, pergel seti, şablonlar. Orijinal taşıma çantasıyla birlikte "
                    "satılmaktadır. Tüm aletler tam ve eksiksiz, bir dönem kullanıldı."
                ),
                "price": Decimal("220.00"),
                "category": "Kırtasiye & Eğitim",
                "condition": "good",
                "seller": kgtu_student,
            },
            {
                "title": "Organik Kimya ders kitabı - Clayden 2. Baskı (İngilizce)",
                "description": (
                    "Selçuk Üniversitesi Kimya Mühendisliği müfredatında kullanılan Clayden "
                    "Organik Kimya kitabı, 2. baskı. Birkaç sayfada kalem notları bulunuyor, "
                    "genel olarak çok temiz durumda. Orijinal fiyatın çok altında."
                ),
                "price": Decimal("180.00"),
                "category": "Kitap & Ders Materyali",
                "condition": "good",
                "seller": selcuk_student,
            },
        ]

        for md in marketplace_listings:
            exists = (await session.execute(
                select(MarketplaceListing).where(MarketplaceListing.title == md["title"])
            )).scalars().first()
            if not exists:
                session.add(MarketplaceListing(
                    id=str(uuid4()),
                    seller_id=md["seller"].id,
                    title=md["title"],
                    description=md["description"],
                    price=md["price"],
                    category_id=category_map.get(md["category"]),
                    condition=md["condition"],
                    status="active",
                    view_count=0,
                    message_count=0,
                    created_at=now,
                    updated_at=now,
                ))
                print(f"[OK] MarketplaceListing oluşturuldu: {md['title'][:55]}")
            else:
                print(f"[SKIP] MarketplaceListing zaten mevcut: {md['title'][:55]}")

        # ─────────────────────────────────────────────
        # CAREER
        # ─────────────────────────────────────────────
        career_listings = [
            {
                "title": "Nurol Teknoloji - Yazılım Geliştirici Stajyeri",
                "description": (
                    "Nurol Teknoloji A.Ş. bünyesinde yazılım geliştirme departmanında stajyer "
                    "arıyoruz. Python/FastAPI veya Java/Spring Boot deneyimi tercih sebebidir. "
                    "Staj süresi 2 ay (40 iş günü) olup ücretlidir. Ankara Merkez ofisinde "
                    "yüz yüze çalışma esastır. Başvuru için güncel CV gönderiniz."
                ),
                "type": "internship",
                "company_name": "Nurol Teknoloji A.Ş.",
                "location": "Ankara",
                "sector": "Savunma Sanayi & Yazılım",
                "application_type": "external",
                "external_url": "https://nurolteknoloji.com.tr/kariyer",
                "posted_by": kgtu_student,
            },
            {
                "title": "Konya Gıda ve Tarım Üniversitesi Bilgi İşlem Daire Başkanlığı - Kısmi Zamanlı Öğrenci",
                "description": (
                    "Konya Gıda ve Tarım Üniversitesi Bilgi İşlem Daire Başkanlığı bünyesinde "
                    "çalışacak kısmi zamanlı öğrenci aranmaktadır. Görev kapsamı: IT destek "
                    "masası, ağ altyapısı bakımı, yazıcı/donanım servisi. Haftada 20 saat "
                    "çalışma, aylık 3.500 TL burs. Bilgisayar Mühendisliği veya Bilişim "
                    "Teknolojileri öğrencisi olma şartı aranır."
                ),
                "type": "job",
                "company_name": "Konya Gıda ve Tarım Üniversitesi Bilgi İşlem Daire Başkanlığı",
                "location": "Konya",
                "sector": "Bilgi Teknolojileri",
                "application_type": "dm",
                "external_url": None,
                "posted_by": kgtu_student,
            },
            {
                "title": "Selçuk Üniversitesi TTO - Veri Analisti Stajyeri",
                "description": (
                    "Selçuk Üniversitesi Teknoloji Transfer Ofisi (TTO) bünyesindeki AR-GE "
                    "merkezinde veri analizi ve raporlama alanında stajyer aranmaktadır. "
                    "Python (Pandas, NumPy, Matplotlib) bilgisi zorunludur; istatistik temeli "
                    "tercih sebebidir. Staj süresi 45 iş günü, haftada 5 gün tam zamanlı. "
                    "Başvuru için transkript ve motivasyon mektubunuzu iletiniz."
                ),
                "type": "internship",
                "company_name": "Selçuk Üniversitesi TTO",
                "location": "Konya",
                "sector": "Akademik & AR-GE",
                "application_type": "external",
                "external_url": "https://tto.selcuk.edu.tr/staj-basvuru",
                "posted_by": selcuk_student,
            },
        ]

        for cd in career_listings:
            exists = (await session.execute(
                select(CareerListing).where(CareerListing.title == cd["title"])
            )).scalars().first()
            if not exists:
                session.add(CareerListing(
                    id=str(uuid4()),
                    type=cd["type"],
                    posted_by=cd["posted_by"].id,
                    title=cd["title"],
                    description=cd["description"],
                    company_name=cd.get("company_name"),
                    location=cd.get("location"),
                    sector=cd.get("sector"),
                    is_remote=False,
                    application_type=cd["application_type"],
                    external_url=cd.get("external_url"),
                    status="active",
                    view_count=0,
                    application_count=0,
                    created_at=now,
                    updated_at=now,
                ))
                print(f"[OK] CareerListing oluşturuldu: {cd['title'][:55]}")
            else:
                print(f"[SKIP] CareerListing zaten mevcut: {cd['title'][:55]}")

        # ─────────────────────────────────────────────
        # AKADEMİK TAKVİM
        # ─────────────────────────────────────────────
        academic_year = "2025-2026"
        calendar_events = [
            {
                "title": "2025-2026 Bahar Dönemi Ders Kayıt Haftası",
                "event_type": "registration",
                "start_date": date(2026, 2, 9),
                "end_date": date(2026, 2, 13),
                "description": (
                    "2025-2026 eğitim-öğretim yılı bahar dönemi ders ekleme-bırakma ve "
                    "kayıt yenileme işlemleri bu tarihler arasında OBS üzerinden yapılacaktır."
                ),
                "university_id": kgtu_uni.id,
                "created_by": kgtu_student.id,
            },
            {
                "title": "Konya Gıda ve Tarım Üniversitesi Bahar Dönemi Vize Sınavları",
                "event_type": "exam",
                "start_date": date(2026, 3, 30),
                "end_date": date(2026, 4, 3),
                "description": (
                    "2025-2026 akademik yılı bahar dönemi ara sınav (vize) haftası. "
                    "Sınav tarihleri ve sınıflar bölüm sekreterlikleri tarafından duyurulacaktır."
                ),
                "university_id": kgtu_uni.id,
                "created_by": kgtu_student.id,
            },
            {
                "title": "Selçuk Üniversitesi - Bahar Dönemi Final Sınavları",
                "event_type": "exam",
                "start_date": date(2026, 5, 25),
                "end_date": date(2026, 6, 5),
                "description": (
                    "2025-2026 akademik yılı bahar dönemi dönem sonu (final) sınavları. "
                    "Mazeret sınav tarihleri ayrıca ilan edilecektir."
                ),
                "university_id": selcuk_uni.id,
                "created_by": selcuk_student.id,
            },
        ]

        for ev in calendar_events:
            exists = (await session.execute(
                select(AcademicCalendarEvent).where(
                    and_(
                        AcademicCalendarEvent.title == ev["title"],
                        AcademicCalendarEvent.academic_year == academic_year,
                    )
                )
            )).scalars().first()
            if not exists:
                session.add(AcademicCalendarEvent(
                    id=str(uuid4()),
                    university_id=ev["university_id"],
                    academic_year=academic_year,
                    event_type=ev["event_type"],
                    title=ev["title"],
                    description=ev.get("description"),
                    start_date=ev["start_date"],
                    end_date=ev.get("end_date"),
                    is_approved=True,
                    created_by=ev["created_by"],
                    created_at=now,
                    updated_at=now,
                ))
                print(f"[OK] AcademicCalendarEvent oluşturuldu: {ev['title'][:55]}")
            else:
                print(f"[SKIP] AcademicCalendarEvent zaten mevcut: {ev['title'][:55]}")

        # ─────────────────────────────────────────────
        # DERS PROGRAMI
        # ─────────────────────────────────────────────
        course_schedules = [
            {
                "department": "Bilgisayar Mühendisliği",
                "class_year": "3",
                "semester": "bahar",
                "academic_year": "2025-2026",
                "university_id": kgtu_uni.id,
                "created_by": kgtu_student.id,
                "schedule_data": {
                    "Pazartesi": [
                        {
                            "saat": "09:00-10:50",
                            "ders": "Veri Yapıları ve Algoritmalar",
                            "ogretim_uyesi": "Dr. Öğr. Üyesi Mehmet Kaya",
                            "derslik": "B201",
                            "tur": "Teorik",
                        },
                        {
                            "saat": "13:00-14:50",
                            "ders": "Lineer Cebir",
                            "ogretim_uyesi": "Doç. Dr. Ayşe Demir",
                            "derslik": "A105",
                            "tur": "Teorik",
                        },
                    ],
                    "Salı": [
                        {
                            "saat": "10:00-11:50",
                            "ders": "Nesneye Yönelik Programlama (Java)",
                            "ogretim_uyesi": "Dr. Öğr. Üyesi Ali Çelik",
                            "derslik": "Lab-1",
                            "tur": "Uygulama",
                        },
                    ],
                    "Çarşamba": [
                        {
                            "saat": "09:00-10:50",
                            "ders": "Veri Yapıları ve Algoritmalar",
                            "ogretim_uyesi": "Dr. Öğr. Üyesi Mehmet Kaya",
                            "derslik": "Lab-2",
                            "tur": "Uygulama",
                        },
                        {
                            "saat": "11:00-12:50",
                            "ders": "Olasılık ve İstatistik",
                            "ogretim_uyesi": "Prof. Dr. Fatma Yıldız",
                            "derslik": "A201",
                            "tur": "Teorik",
                        },
                    ],
                    "Perşembe": [
                        {
                            "saat": "13:00-14:50",
                            "ders": "Nesneye Yönelik Programlama (Java)",
                            "ogretim_uyesi": "Dr. Öğr. Üyesi Ali Çelik",
                            "derslik": "B105",
                            "tur": "Teorik",
                        },
                    ],
                    "Cuma": [
                        {
                            "saat": "10:00-11:50",
                            "ders": "Lineer Cebir",
                            "ogretim_uyesi": "Doç. Dr. Ayşe Demir",
                            "derslik": "A105",
                            "tur": "Uygulama",
                        },
                    ],
                },
            },
            {
                "department": "Yazılım Mühendisliği",
                "class_year": "3",
                "semester": "bahar",
                "academic_year": "2025-2026",
                "university_id": kgtu_uni.id,
                "created_by": kgtu_student.id,
                "schedule_data": {
                    "Pazartesi": [
                        {
                            "saat": "08:00-09:50",
                            "ders": "Yazılım Gereksinimleri",
                            "ogretim_uyesi": "Prof. Dr. Hasan Özdemir",
                            "derslik": "C301",
                            "tur": "Teorik",
                        },
                    ],
                    "Salı": [
                        {
                            "saat": "10:00-11:50",
                            "ders": "Algoritma Analizi",
                            "ogretim_uyesi": "Doç. Dr. Zeynep Arslan",
                            "derslik": "Lab-Gıda-1",
                            "tur": "Uygulama",
                        },
                        {
                            "saat": "13:00-14:50",
                            "ders": "Yazılım Mimarisi",
                            "ogretim_uyesi": "Dr. Öğr. Üyesi Emre Şahin",
                            "derslik": "C205",
                            "tur": "Teorik",
                        },
                    ],
                    "Cuma": [
                        {
                            "saat": "09:00-10:50",
                            "ders": "Yazılım Testi ve Kalite",
                            "ogretim_uyesi": "Prof. Dr. Hasan Özdemir",
                            "derslik": "C301",
                            "tur": "Teorik",
                        },
                    ],
                },
            },
            {
                "department": "Bilgisayar Mühendisliği",
                "class_year": "2",
                "semester": "bahar",
                "academic_year": "2025-2026",
                "university_id": selcuk_uni.id,
                "created_by": selcuk_student.id,
                "schedule_data": {
                    "Pazartesi": [
                        {
                            "saat": "09:00-10:50",
                            "ders": "İşletim Sistemleri",
                            "ogretim_uyesi": "Doç. Dr. Kemal Aydın",
                            "derslik": "D401",
                            "tur": "Teorik",
                        },
                    ],
                    "Çarşamba": [
                        {
                            "saat": "11:00-12:50",
                            "ders": "Veritabanı Yönetim Sistemleri",
                            "ogretim_uyesi": "Dr. Öğr. Üyesi Seda Kurt",
                            "derslik": "Lab-Bil-3",
                            "tur": "Uygulama",
                        },
                        {
                            "saat": "13:00-14:50",
                            "ders": "Yazılım Mühendisliği",
                            "ogretim_uyesi": "Prof. Dr. İbrahim Yılmaz",
                            "derslik": "D405",
                            "tur": "Teorik",
                        },
                    ],
                    "Perşembe": [
                        {
                            "saat": "09:00-10:50",
                            "ders": "İşletim Sistemleri",
                            "ogretim_uyesi": "Doç. Dr. Kemal Aydın",
                            "derslik": "Lab-Bil-1",
                            "tur": "Uygulama",
                        },
                    ],
                },
            },
        ]

        for cs in course_schedules:
            exists = (await session.execute(
                select(CourseSchedule).where(
                    and_(
                        CourseSchedule.university_id == cs["university_id"],
                        CourseSchedule.department == cs["department"],
                        CourseSchedule.class_year == cs["class_year"],
                        CourseSchedule.semester == cs["semester"],
                        CourseSchedule.academic_year == cs["academic_year"],
                    )
                )
            )).scalars().first()
            label = f"{cs['department']} {cs['class_year']}. Sınıf ({cs['semester']} {cs['academic_year']})"
            if not exists:
                session.add(CourseSchedule(
                    id=str(uuid4()),
                    university_id=cs["university_id"],
                    department=cs["department"],
                    class_year=cs["class_year"],
                    semester=cs["semester"],
                    academic_year=cs["academic_year"],
                    schedule_data=cs["schedule_data"],
                    is_approved=True,
                    created_by=cs["created_by"],
                    created_at=now,
                    updated_at=now,
                ))
                print(f"[OK] CourseSchedule oluşturuldu: {label}")
            else:
                print(f"[SKIP] CourseSchedule zaten mevcut: {label}")

        # ─────────────────────────────────────────────
        # DERS NOTLARI
        # ─────────────────────────────────────────────
        course_notes = [
            {
                "course_code": "BLM201",
                "title": "İşletim Sistemleri 1-4. Hafta Özet Vize Notları",
                "university_id": kgtu_uni.id,
                "created_by": kgtu_student,
                "entry_content": (
                    "**1. Hafta: İşletim Sistemlerine Giriş**\n"
                    "- İşletim sistemi: donanım ile kullanıcı uygulamaları arasındaki aracı yazılım.\n"
                    "- Çekirdek (kernel), kabuk (shell) ve sistem çağrıları temel kavramlardır.\n\n"
                    "**2. Hafta: Süreç Yönetimi**\n"
                    "- Süreç (process): çalışmakta olan programın bellek içindeki temsili.\n"
                    "- PCB (Process Control Block): süreç durumu, PID, PC, register bilgilerini içerir.\n"
                    "- Süreç durumları: New → Ready → Running → Waiting → Terminated\n\n"
                    "**3-4. Hafta: CPU Zamanlama Algoritmaları**\n"
                    "- FCFS (First Come First Served): sıra tabanlı, konvoy etkisi sorunu.\n"
                    "- SJF (Shortest Job First): ortalama bekleme süresini minimize eder.\n"
                    "- Round Robin: zaman dilimi (quantum) tabanlı, adil dağılım sağlar.\n"
                    "- Priority Scheduling: öncelik tabanlı, açlık (starvation) riski içerir."
                ),
            },
            {
                "course_code": "BLM301",
                "title": "Veritabanı Yönetim Sistemleri - SQL ve Normalizasyon Özeti",
                "university_id": kgtu_uni.id,
                "created_by": kgtu_student,
                "entry_content": (
                    "**Temel SQL Komutları**\n"
                    "- DDL (Data Definition Language): CREATE, ALTER, DROP, TRUNCATE\n"
                    "- DML (Data Manipulation Language): SELECT, INSERT, UPDATE, DELETE\n"
                    "- DCL (Data Control Language): GRANT, REVOKE\n\n"
                    "**JOIN Türleri**\n"
                    "- INNER JOIN: yalnızca her iki tabloda da eşleşen kayıtları döndürür.\n"
                    "- LEFT JOIN: sol tablonun tüm kayıtları + sağdan eşleşenler (yoksa NULL).\n"
                    "- RIGHT JOIN: sağ tablonun tüm kayıtları + soldan eşleşenler (yoksa NULL).\n"
                    "- FULL OUTER JOIN: her iki taraftaki tüm kayıtlar.\n\n"
                    "**Normalizasyon Kuralları**\n"
                    "- 1NF: tekrarlayan gruplar yok, her hücrede atomik değer.\n"
                    "- 2NF: kısmi bağımlılık yok (tüm alanlar birincil anahtara tam bağımlı).\n"
                    "- 3NF: geçişli (transitif) bağımlılık yok, her alan yalnızca PK'ya bağlı."
                ),
            },
            {
                "course_code": "KIM201",
                "title": "Organik Kimya - Fonksiyonel Gruplar ve Reaksiyonlar Özeti",
                "university_id": selcuk_uni.id,
                "created_by": selcuk_student,
                "entry_content": (
                    "**Temel Fonksiyonel Gruplar**\n"
                    "- Alkol (-OH): hidroksil grubu, hidrojen bağı yapabilir, kaynama noktası yüksek.\n"
                    "- Aldehit (-CHO): indirgen özellik gösterir; Tollens testi pozitif sonuç verir.\n"
                    "- Keton (>C=O): indirgen değil; karbonil grubu zincir ortasında yer alır.\n"
                    "- Karboksilik Asit (-COOH): asidik karakter, ester ve amid oluşturabilir.\n"
                    "- Amin (-NH2): bazik karakter, amonyak türevi.\n\n"
                    "**Temel Reaksiyon Türleri**\n"
                    "- Nükleofilik Sübstitüsyon: SN1 (karbokasyon ara ürünü), SN2 (arka taraf saldırısı).\n"
                    "- Eliminasyon: E1 ve E2; alken oluşumu; Zaitsev kuralı.\n"
                    "- Katılma (Addition): alkenler üzerine HX, H2O, Br2 katılması.\n"
                    "- Yükseltgenme-İndirgeme: alkollerin aldehit/keton/aside dönüşümü."
                ),
            },
        ]

        for cn in course_notes:
            exists = (await session.execute(
                select(CourseNoteTopic).where(
                    and_(
                        CourseNoteTopic.title == cn["title"],
                        CourseNoteTopic.course_code == cn["course_code"],
                    )
                )
            )).scalars().first()
            if not exists:
                topic = CourseNoteTopic(
                    id=str(uuid4()),
                    course_code=cn["course_code"],
                    title=cn["title"],
                    university_id=cn["university_id"],
                    created_by=cn["created_by"].id,
                    created_at=now,
                )
                session.add(topic)
                await session.flush()

                session.add(CourseNoteEntry(
                    id=str(uuid4()),
                    topic_id=topic.id,
                    user_id=cn["created_by"].id,
                    content=cn["entry_content"],
                    created_at=now,
                ))
                print(f"[OK] CourseNoteTopic oluşturuldu: {cn['title'][:55]}")
            else:
                print(f"[SKIP] CourseNoteTopic zaten mevcut: {cn['title'][:55]}")

        await session.commit()
        print("[DONE] Dummy content seed tamamlandı.")


async def main() -> None:
    engine = get_engine()
    try:
        await ensure_initial_data()
        await seed_dummy_content()
    except Exception:
        print("[ERROR] Baslangic verileri olusturulamadi.")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
