"""Idempotent initial data seeding.

Guarantees per run:
- 1 super admin  (admin@ogr.gidatarim.edu.tr)
- 1 university admin per university
- 1 student per university
- Forum topics + marketplace listings + career listings for these users
- Deterministic department selection based on preferred names
"""

import asyncio
import json
import os
import shutil
import sys
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path
from uuid import uuid4

from sqlalchemy import and_, select

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.core.database import get_engine, get_session_factory
from src.core.security import hash_password, verify_password
from src.models.academic import AcademicCalendarEvent, CourseSchedule
from src.models.career import CareerListing
from src.models.department import Department
from src.models.faculty import Faculty
from src.models.forum import ForumCategory, ForumTopic
from src.models.marketplace import MarketplaceCategory, MarketplaceListing
from src.models.university import University
from src.models.user import User, UserRole
from src.models.course_notes import CourseNoteTopic, CourseNoteEntry


# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────

# Universities to seed — must already exist (created by seed_konya_normalized.py)
UNIVERSITIES = [
    {"name": "Konya Gıda ve Tarım Üniversitesi", "short": "kgtu", "domain": "gidatarim.edu.tr", "ogr_domain": "ogr.gidatarim.edu.tr"},
    {"name": "Konya Teknik Üniversitesi", "short": "ktun", "domain": "ktun.edu.tr", "ogr_domain": "ogr.ktun.edu.tr"},
    {"name": "KTO Karatay Üniversitesi", "short": "karatay", "domain": "karatay.edu.tr", "ogr_domain": "ogr.karatay.edu.tr"},
    {"name": "Necmettin Erbakan Üniversitesi", "short": "erbakan", "domain": "erbakan.edu.tr", "ogr_domain": "ogr.erbakan.edu.tr"},
    {"name": "Selçuk Üniversitesi", "short": "selcuk", "domain": "selcuk.edu.tr", "ogr_domain": "ogr.selcuk.edu.tr"},
]

# Preferred department names for each university.
# admin1/student1 → index 0, admin2/student2 → index 1.
# These are looked up by exact name; falls back to first alphabetical dept if not found.
PREFERRED_DEPTS: dict[str, list[str]] = {
    "kgtu": ["Bilgisayar Mühendisliği"],
    "ktun": ["Bilgisayar Mühendisliği"],
    "karatay": ["Bilgisayar Mühendisliği"],
    "erbakan": ["Bilgisayar Mühendisliği"],
    "selcuk": ["Bilgisayar Mühendisliği"],
}

MARKETPLACE_CATEGORIES = [
    {"name": "Elektronik & Teknoloji", "icon": "Smartphone", "order_index": 1},
    {"name": "Kitap & Kırtasiye", "icon": "Book", "order_index": 2},
    {"name": "Ev & Yurt Eşyası", "icon": "Home", "order_index": 3},
    {"name": "Moda & Giyim", "icon": "Shirt", "order_index": 4},
    {"name": "Hobi & Spor", "icon": "Dumbbell", "order_index": 5},
    {"name": "Özel Ders & Hizmet", "icon": "GraduationCap", "order_index": 6},
    {"name": "Diğer", "icon": "Package", "order_index": 7},
]

FORUM_CATEGORIES = [
    {"name": "Kampüs Yaşamı", "icon": "Home", "description": "Genel kampüs geyiği ve günlük konular.", "order_index": 1},
    {"name": "Akademik & Dersler", "icon": "BookOpen", "description": "Ders notları, sınav tartışmaları ve akademik yardımlaşma.", "order_index": 2},
    {"name": "Soru-Cevap & Yardım", "icon": "HelpCircle", "description": "Her türlü soru ve hızlı çözümler için topluluk desteği.", "order_index": 3},
    {"name": "Kulüpler & Topluluklar", "icon": "Users", "description": "Öğrenci kulüpleri ve topluluk faaliyetleri.", "order_index": 4},
    {"name": "Kariyer & Staj", "icon": "Briefcase", "description": "İş ilanları, staj tecrübeleri ve kariyer planlama.", "order_index": 5},
    {"name": "İtiraf", "icon": "Ghost", "description": "Kampüsteki ilginç olaylar ve anonim paylaşımlar.", "order_index": 6},
    {"name": "Yurt & Barınma", "icon": "Building2", "description": "Ev/oda arkadaşı arayanlar ve barınma tecrübeleri.", "order_index": 7},
    {"name": "Diğer", "icon": "Package", "description": "Diğer tüm konular ve paylaşımlar.", "order_index": 8},
]

_COURSE_NOTES = [
    {"code": "BIL101", "title": "Bilgisayar Mühendisliğine Giriş"},
    {"code": "MAT101", "title": "Matematik I (Calculus)"},
    {"code": "FZK101", "title": "Fizik I (Mekanik)"},
    {"code": "BIL201", "title": "Veri Yapıları ve Algoritmalar"},
    {"code": "BIL301", "title": "İşletim Sistemleri"},
]

ACADEMIC_YEAR = "2025-2026"

def _calendar_events(university_id: str, creator_id: str | None, university_name: str = "") -> list[dict]:
    # Ortak tatiller ve temel olaylar
    base_events = [
        {
            "title": "Bahar Dönemi Derslerin Başlangıcı",
            "event_type": "other",
            "start_date": date(2026, 2, 16),
            "end_date": None,
            "description": "2025-2026 akademik yılı bahar dönemi dersleri bu tarihte başlamaktadır.",
            "university_id": university_id,
            "created_by": creator_id,
        },
    ]

    if "Gıda ve Tarım" in university_name:
        return base_events + [
            {
                "title": "Kayıt Dondurma/İzin Başvurularının Son Günü",
                "event_type": "registration",
                "start_date": date(2026, 4, 17),
                "end_date": None,
                "description": "Bahar yarıyılı için kayıt dondurma veya izin başvurularının son günüdür.",
                "university_id": university_id,
                "created_by": creator_id,
            },
            {
                "title": "Ulusal Egemenlik ve Çocuk Bayramı Tatili",
                "event_type": "holiday",
                "start_date": date(2026, 4, 23),
                "end_date": None,
                "description": "Resmi tatil nedeniyle üniversitemiz kapalı olacaktır.",
                "university_id": university_id,
                "created_by": creator_id,
            },
            {
                "title": "Emek ve Dayanışma Günü Tatili",
                "event_type": "holiday",
                "start_date": date(2026, 5, 1),
                "end_date": None,
                "description": "Resmi tatil nedeniyle üniversitemiz kapalı olacaktır.",
                "university_id": university_id,
                "created_by": creator_id,
            },
            {
                "title": "Atatürk'ü Anma, Gençlik ve Spor Bayramı Tatili",
                "event_type": "holiday",
                "start_date": date(2026, 5, 19),
                "end_date": None,
                "description": "Resmi tatil nedeniyle üniversitemiz kapalı olacaktır.",
                "university_id": university_id,
                "created_by": creator_id,
            },
            {
                "title": "Bahar Şenliği",
                "event_type": "other",
                "start_date": date(2026, 5, 21),
                "end_date": None,
                "description": "Geleneksel KGTÜ Bahar Şenlikleri kapsamında çeşitli etkinlikler düzenlenecektir.",
                "university_id": university_id,
                "created_by": creator_id,
            },
            {
                "title": "Dönem İçi Değerlendirmelerin Sisteme Girilmesi İçin Son Gün",
                "event_type": "other",
                "start_date": date(2026, 5, 22),
                "end_date": None,
                "description": "Ara sınav, ödev ve projelerin OBS sistemine girişi için son tarihtir.",
                "university_id": university_id,
                "created_by": creator_id,
            },
            {
                "title": "Kurban Bayramı Tatili",
                "event_type": "holiday",
                "start_date": date(2026, 5, 26),
                "end_date": date(2026, 5, 30),
                "description": "Dini bayram tatili nedeniyle tüm akademik faaliyetlere ara verilecektir.",
                "university_id": university_id,
                "created_by": creator_id,
            },
            {
                "title": "Yarıyıl Sonu Sınavları (Final)",
                "event_type": "exam",
                "start_date": date(2026, 6, 3),
                "end_date": date(2026, 6, 14),
                "description": "2025-2026 Bahar yarıyılı dönem sonu (final) sınavları gerçekleştirilecektir.",
                "university_id": university_id,
                "created_by": creator_id,
            },
            {
                "title": "Bütünleme Sınavları",
                "event_type": "exam",
                "start_date": date(2026, 6, 22),
                "end_date": date(2026, 6, 27),
                "description": "Yarıyıl sonu sınavlarından başarısız olan veya notunu yükseltmek isteyen öğrenciler için bütünleme sınavları.",
                "university_id": university_id,
                "created_by": creator_id,
            },
            {
                "title": "Mezuniyet Töreni",
                "event_type": "other",
                "start_date": date(2026, 7, 3),
                "end_date": None,
                "description": "2025-2026 mezunlarımızın kep atma töreni ve kutlamaları.",
                "university_id": university_id,
                "created_by": creator_id,
            },
            {
                "title": "Demokrasi Bayramı Tatili",
                "event_type": "holiday",
                "start_date": date(2026, 7, 15),
                "end_date": None,
                "description": "Resmi tatil.",
                "university_id": university_id,
                "created_by": creator_id,
            },
            {
                "title": "Zafer Bayramı Tatili",
                "event_type": "holiday",
                "start_date": date(2026, 8, 30),
                "end_date": None,
                "description": "Resmi tatil.",
                "university_id": university_id,
                "created_by": creator_id,
            },
        ]

    if "Konya Teknik" in university_name:
        return base_events + [
            {
                "title": "KTÜN Mühendislik ve Teknoloji Festivali",
                "event_type": "other",
                "start_date": date(2026, 5, 5),
                "end_date": date(2026, 5, 7),
                "description": "Öğrenci projelerinin sergilendiği ve sektör liderlerinin katıldığı teknoloji festivali.",
                "university_id": university_id,
                "created_by": creator_id,
            },
            {
                "title": "Bahar Dönemi Vize Sınavları",
                "event_type": "exam",
                "start_date": date(2026, 4, 6),
                "end_date": date(2026, 4, 17),
                "description": "Vize sınav tarihleri bölümlere göre değişiklik gösterebilir.",
                "university_id": university_id,
                "created_by": creator_id,
            },
            {
                "title": "Teknik Tasarım Sergisi",
                "event_type": "other",
                "start_date": date(2026, 6, 10),
                "end_date": None,
                "description": "Mühendislik ve Mimarlık fakültesi öğrencilerinin bitirme projeleri sergisi.",
                "university_id": university_id,
                "created_by": creator_id,
            },
        ]

    if "Karatay" in university_name:
        return base_events + [
            {
                "title": "Girişimcilik ve İnovasyon Zirvesi",
                "event_type": "other",
                "start_date": date(2026, 5, 12),
                "end_date": None,
                "description": "KTO iş birliği ile düzenlenen girişimcilik ekosistemi buluşması.",
                "university_id": university_id,
                "created_by": creator_id,
            },
            {
                "title": "Hukuk Fakültesi Kurgusal Duruşma Yarışması",
                "event_type": "other",
                "start_date": date(2026, 5, 20),
                "end_date": None,
                "description": "Öğrencilerin pratik yeteneklerini sergilediği kurgusal duruşma finali.",
                "university_id": university_id,
                "created_by": creator_id,
            },
            {
                "title": "KTO Karatay Mezuniyet Balosu",
                "event_type": "other",
                "start_date": date(2026, 7, 5),
                "end_date": None,
                "description": "Mezun öğrencilerimiz için düzenlenen veda gecesi.",
                "university_id": university_id,
                "created_by": creator_id,
            },
        ]

    if "Necmettin Erbakan" in university_name:
        return base_events + [
            {
                "title": "NEÜ Bilim ve Sanat Şenliği",
                "event_type": "other",
                "start_date": date(2026, 5, 14),
                "end_date": date(2026, 5, 16),
                "description": "Kampüs genelinde düzenlenen konserler ve bilimsel atölyeler.",
                "university_id": university_id,
                "created_by": creator_id,
            },
            {
                "title": "Akademik Yazım ve Yayın Eğitimi",
                "event_type": "other",
                "start_date": date(2026, 4, 28),
                "end_date": None,
                "description": "Lisansüstü ve son sınıf öğrencileri için akademik makale yazım teknikleri.",
                "university_id": university_id,
                "created_by": creator_id,
            },
            {
                "title": "NEÜ Sosyal Sorumluluk Günü",
                "event_type": "other",
                "start_date": date(2026, 5, 8),
                "end_date": None,
                "description": "Üniversite topluluklarının Konya genelinde yürüteceği yardım faaliyetleri.",
                "university_id": university_id,
                "created_by": creator_id,
            },
        ]

    if "Selçuk" in university_name:
        return base_events + [
            {
                "title": "Uluslararası Selçuklu Kültür Sempozyumu",
                "event_type": "other",
                "start_date": date(2026, 5, 20),
                "end_date": date(2026, 5, 22),
                "description": "Farklı ülkelerden akademisyenlerin katılımıyla Selçuklu tarihi oturumları.",
                "university_id": university_id,
                "created_by": creator_id,
            },
            {
                "title": "Selçuk Üniversitesi Spor Olimpiyatları",
                "event_type": "other",
                "start_date": date(2026, 5, 11),
                "end_date": date(2026, 5, 22),
                "description": "Fakülteler arası futbol, basketbol ve voleybol turnuvaları.",
                "university_id": university_id,
                "created_by": creator_id,
            },
            {
                "title": "Geleneksel Bahar Kahvaltısı",
                "event_type": "other",
                "start_date": date(2026, 5, 24),
                "end_date": None,
                "description": "Tüm öğrencilerin ve personelin katılımına açık kampüs kahvaltısı.",
                "university_id": university_id,
                "created_by": creator_id,
            },
        ]

    # Diğer üniversiteler (eğer varsa) için varsayılan boş liste veya çok temel bir şey
    return base_events


_KGTU_CENG_SCHEDULE = [
    {
        "name": "Practical Data Science",
        "code": "COMP 4202",
        "instructor": "Dr. Öğr. Üyesi Ayşe Gül Özkan",
        "room": "UZEM",
        "color": "#6366f1",
        "slots": [{"day": "monday", "start_time": "09:30", "end_time": "12:30"}]
    },
    {
        "name": "Automata Theory and Formal Languages",
        "code": "COMP 4002",
        "instructor": "Dr. Öğr. Üyesi Ayşe Gül Özkan",
        "room": "UZEM",
        "color": "#8b5cf6",
        "slots": [{"day": "tuesday", "start_time": "09:30", "end_time": "12:30"}]
    },
    {
        "name": "Microservice Based Software Design and Development",
        "code": "COMP 4244",
        "instructor": "Dr. Öğr. Üyesi Sinan Keskin",
        "room": "MB-307",
        "color": "#ec4899",
        "slots": [{"day": "tuesday", "start_time": "13:30", "end_time": "16:30"}]
    },
    {
        "name": "Multimedia",
        "code": "COMP 4232",
        "instructor": "Prof. Dr. Reza Hassanpour",
        "room": "MB-215",
        "color": "#f59e0b",
        "slots": [{"day": "wednesday", "start_time": "10:30", "end_time": "13:30"}]
    },
    {
        "name": "Next Generation Network Systems and Architecture",
        "code": "COMP 4252",
        "instructor": "Prof. Dr. Kasım Öztoprak",
        "room": "MB-216",
        "color": "#10b981",
        "slots": [{"day": "wednesday", "start_time": "14:30", "end_time": "17:30"}]
    },
    {
        "name": "Computer Systems Security",
        "code": "COMP 4208",
        "instructor": "Dr. Öğr. Üyesi Yusuf Kürşat Tuncel",
        "room": "UZEM",
        "color": "#3b82f6",
        "slots": [{"day": "wednesday", "start_time": "20:00", "end_time": "22:00"}]
    },
    {
        "name": "Cloud Computing",
        "code": "COMP 4206",
        "instructor": "Prof. Dr. Kasım Öztoprak",
        "room": "MB-216",
        "color": "#ef4444",
        "slots": [{"day": "thursday", "start_time": "10:00", "end_time": "13:00"}]
    },
    {
        "name": "Computer Architecture",
        "code": "COMP 4224",
        "instructor": "Prof. Dr. Kasım Öztoprak",
        "room": "MB-216",
        "color": "#14b8a6",
        "slots": [{"day": "thursday", "start_time": "14:00", "end_time": "17:00"}]
    },
    {
        "name": "Graduation Project II",
        "code": "COMP 4902",
        "instructor": "-",
        "room": "Laboratuvar",
        "color": "#64748b",
        "slots": [{"day": "friday", "start_time": "09:30", "end_time": "12:30"}]
    }
]


_KGTU_CENG_S3_SCHEDULE = [
    {
        "name": "Operating System",
        "code": "COMP 3004",
        "instructor": "Prof. Dr. Reza Hassanpour",
        "room": "MB-306",
        "color": "#6366f1",
        "slots": [{"day": "monday", "start_time": "14:00", "end_time": "17:00"}]
    },
    {
        "name": "Secure Software Development",
        "code": "COMP 3006",
        "instructor": "Dr. Öğr. Üyesi Yusuf Kürşat Tuncel",
        "room": "UZEM",
        "color": "#8b5cf6",
        "slots": [{"day": "tuesday", "start_time": "20:00", "end_time": "22:00"}]
    },
    {
        "name": "Data Mining",
        "code": "COMP 3236",
        "instructor": "Dr. Öğr. Üyesi Metin Burak Altınoklu",
        "room": "MB-202",
        "color": "#ec4899",
        "slots": [{"day": "wednesday", "start_time": "10:00", "end_time": "13:00"}]
    },
    {
        "name": "Social Elective",
        "code": "SOC101",
        "instructor": "-",
        "room": "Amfi",
        "color": "#f59e0b",
        "slots": [{"day": "wednesday", "start_time": "15:00", "end_time": "17:00"}]
    },
    {
        "name": "Software Test Engineering",
        "code": "COMP 3209",
        "instructor": "Doç. Dr. Şenol Zafer Erdoğan",
        "room": "MB-201",
        "color": "#10b981",
        "slots": [{"day": "thursday", "start_time": "10:00", "end_time": "13:00"}]
    },
    {
        "name": "XR Technologies: Metaverse, AR and VR",
        "code": "COMP 3226",
        "instructor": "Prof. Dr. Meltem Huri Baturay",
        "room": "MB-306",
        "color": "#3b82f6",
        "slots": [{"day": "thursday", "start_time": "14:00", "end_time": "17:00"}]
    },
    {
        "name": "Artificial Intelligence",
        "code": "COMP 3204",
        "instructor": "Dr. Öğr. Üyesi Metin Burak Altınoklu",
        "room": "MB-202",
        "color": "#ef4444",
        "slots": [{"day": "friday", "start_time": "10:00", "end_time": "13:00"}]
    },
    {
        "name": "Computer Networks",
        "code": "COMP 3002",
        "instructor": "Doç. Dr. Şenol Zafer Erdoğan",
        "room": "MB101-102",
        "color": "#14b8a6",
        "slots": [{"day": "friday", "start_time": "14:00", "end_time": "17:00"}]
    }
]


# ─────────────────────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _uid() -> str:
    return str(uuid4())


async def _get_uni(session, name: str) -> University | None:
    return (await session.execute(
        select(University).where(University.name == name)
    )).scalar_one_or_none()


async def _get_dept_by_name(session, university_id: str, dept_name: str) -> Department | None:
    """Find a specific department by name within a university (case-sensitive)."""
    result = await session.execute(
        select(Department)
        .join(Faculty, Department.faculty_id == Faculty.id)
        .where(
            and_(
                Faculty.university_id == university_id,
                Department.name == dept_name,
            )
        )
        .limit(1)
    )
    return result.scalars().first()


async def _get_any_dept(session, university_id: str) -> Department | None:
    """Fallback: return the alphabetically-first department for a university.
    Secondary sort on id makes the result fully deterministic even when names collide."""
    result = await session.execute(
        select(Department)
        .join(Faculty, Department.faculty_id == Faculty.id)
        .where(Faculty.university_id == university_id)
        .order_by(Department.name.asc(), Department.id.asc())
        .limit(1)
    )
    return result.scalars().first()


async def _resolve_depts(session, university_id: str, short: str) -> tuple[Department, Department]:
    """Return (dept1, dept2) for a university using preferred names with fallback."""
    preferred = PREFERRED_DEPTS.get(short, [])

    dept1 = None
    if preferred:
        dept1 = await _get_dept_by_name(session, university_id, preferred[0])
    if dept1 is None:
        dept1 = await _get_any_dept(session, university_id)
    if dept1 is None:
        raise RuntimeError(f"Üniversite için hiç bölüm bulunamadı: {short}")

    dept2 = None
    if len(preferred) > 1:
        dept2 = await _get_dept_by_name(session, university_id, preferred[1])
    if dept2 is None:
        dept2 = dept1  # same department is fine; class_year will differ in schedule
    return dept1, dept2


async def _upsert_user(session, email: str, defaults: dict) -> tuple[User, bool]:
    """Return (user, created). Updates critical fields on existing users."""
    user = (await session.execute(
        select(User).where(
            (User.email == email) | (User.username == defaults.get("username"))
        )
    )).scalar_one_or_none()

    if user:
        changed = False
        if user.email != email:
            user.email = email
            changed = True
        # Ensure name is updated if changed in seed script
        if defaults.get("first_name") and user.first_name != defaults["first_name"]:
            user.first_name = defaults["first_name"]
            changed = True
        if defaults.get("last_name") and user.last_name != defaults["last_name"]:
            user.last_name = defaults["last_name"]
            changed = True
        # Ensure university linkage is correct
        if defaults.get("university_id") and user.university_id != defaults["university_id"]:
            user.university_id = defaults["university_id"]
            user.university = defaults.get("university", user.university)
            changed = True
        # Ensure department is set
        if defaults.get("department_id") and not user.department_id:
            user.department_id = defaults["department_id"]
            changed = True
        # Ensure account is active and verified
        if not user.is_verified:
            user.is_verified = True
            changed = True
        if not user.is_active:
            user.is_active = True
            changed = True
        if not user.terms_accepted_at:
            user.terms_accepted_at = defaults.get("terms_accepted_at") or _now()
            changed = True
        # Sync password if it no longer matches
        raw_pw = defaults.get("_raw_password")
        if raw_pw and not verify_password(raw_pw, user.password_hash):
            user.password_hash = hash_password(raw_pw)
            changed = True
        if changed:
            print(f"[UPDATE] {email} güncellendi.")
        else:
            print(f"[SKIP] {email} zaten güncel.")
        return user, False

    # Strip internal-only key before constructing ORM object
    clean = {k: v for k, v in defaults.items() if not k.startswith("_")}
    user = User(id=_uid(), email=email, **clean)
    session.add(user)
    await session.flush()
    return user, True


async def _ensure_marketplace_categories(session) -> dict[str, str]:
    cat_map: dict[str, str] = {}
    for cdef in MARKETPLACE_CATEGORIES:
        cat = (await session.execute(
            select(MarketplaceCategory).where(MarketplaceCategory.name == cdef["name"])
        )).scalars().first()
        if not cat:
            cat = MarketplaceCategory(
                id=_uid(), name=cdef["name"],
                icon=cdef["icon"], order_index=cdef["order_index"], is_active=True,
            )
            session.add(cat)
            await session.flush()
            print(f"[OK] MarketplaceCategory: {cdef['name']}")
        cat_map[cdef["name"]] = cat.id
    return cat_map


async def _ensure_forum_categories(session, university_id: str) -> dict[str, str]:
    cat_map: dict[str, str] = {}
    for cdef in FORUM_CATEGORIES:
        cat = (await session.execute(
            select(ForumCategory).where(
                and_(ForumCategory.name == cdef["name"], ForumCategory.university_id == university_id)
            )
        )).scalar_one_or_none()
        if not cat:
            cat = ForumCategory(
                id=_uid(), name=cdef["name"],
                description=cdef["description"],
                icon=cdef["icon"], order_index=cdef["order_index"], is_active=True,
                university_id=university_id, created_at=_now(),
            )
            session.add(cat)
            await session.flush()
            print(f"[OK] ForumCategory: {cdef['name']} ({university_id})")
        cat_map[cdef["name"]] = cat.id
    return cat_map


# ─────────────────────────────────────────────────────────────
# Content templates  (indexed by university short name + role + 0/1)
# ─────────────────────────────────────────────────────────────

_FORUM: dict[str, dict[str, list[tuple[str, str]]]] = {
    "kgtu": {
        "admin": [
            ("Yeni Lab Ekipmanları Hakkında", "Mühendislik laboratuvarlarına yeni GPU'lu iş istasyonları eklendi. Test etmek isteyenler randevu alabilir."),
        ],
        "student": [
            ("Veri Yapıları Dersi Kaynak Önerisi", "Veri yapıları vizesi için hangi kaynakları önerirsiniz? Tanenbaum yeterli mi?"),
            ("Kampüs Yemekhane Menüsü", "Bugün yemekhanede vejetaryen seçenek azdı. Benzer düşünen var mı?"),
        ],
    },
    "ktun": {
        "admin": [
            ("Teknofest Başvuruları Başladı", "KTUN bünyesinde Teknofest takımları kuruyoruz. İlgilenenler Bilgi İşlem'e gelsin."),
        ],
        "student": [
            ("Python ile Veri Analizi", "Pandas kütüphanesinde sorun yaşıyorum, yardım edebilecek var mı?"),
            ("Kütüphane Çalışma Saatleri", "Vizeler başlıyor, kütüphane 24 saat açık olsun."),
        ],
    },
    "karatay": {
        "admin": [
            ("Yazılım Semineri", "Haftaya sektörden uzmanlar geliyor. Katılım sertifikalıdır."),
        ],
        "student": [
            ("C++ Pointer Sorunu", "Pointer mantığını bir türlü oturtamadım. Basit bir anlatım var mı?"),
            ("Kulüp Etkinlikleri", "Yazılım kulübü bu hafta sonu hackathon düzenliyor mu?"),
        ],
    },
    "erbakan": {
        "admin": [
            ("Staj Defteri Teslimi", "Yaz stajı yapanlar defterlerini en geç Cuma günü teslim etmelidir."),
        ],
        "student": [
            ("Mobil Uygulama Geliştirme", "Flutter mı yoksa React Native mi başlamalıyım?"),
            ("Öğrenci Kartları Hakkında", "Yeni kartlar ne zaman dağıtılacak?"),
        ],
    },
    "selcuk": {
        "admin": [
            ("Mezunlar Paneli", "Mezunlarımızla online bir buluşma gerçekleştireceğiz."),
        ],
        "student": [
            ("Algoritma Analizi Ödevleri", "Complexity analizinde Big O notation kafamı karıştırıyor."),
            ("Kampüs İçi Ulaşım", "Ring seferleri daha sık olmalı."),
        ],
},
}

_MARKETPLACE: dict[str, dict[str, list[dict]]] = {
    "kgtu": {
        "admin": [
            {
                "title": "Epson Projeksiyon Cihazı",
                "description": "Epson EMP-X5, teknik servis yapıldı, temiz kullanım.",
                "price": Decimal("1200.00"),
                "category": "Elektronik & Teknoloji",
                "condition": "good",
            },
        ],
        "student": [
            {
                "title": "İkinci El MacBook Pro M1 16GB",
                "description": "Kusursuz durumda, kutusu ve faturası mevcut. Sadece 1 yıl kullanıldı.",
                "price": Decimal("28000.00"),
                "category": "Elektronik & Teknoloji",
                "condition": "like_new",
                "image": "macbook_m1.jpg",
            },
            {
                "title": "Bilgisayar Ağları - Tanenbaum Kitabı",
                "description": "Ders için aldığım, tertemiz duran ağ altyapısı kitabı. Çizik dahi yok.",
                "price": Decimal("350.00"),
                "category": "Kitap & Kırtasiye",
                "condition": "new",
                "image": "tanenbaum_ag.jpg",
            },
        ],
    },
    "ktun": {
        "admin": [],
        "student": [
            {
                "title": "Raspberry Pi 4 Model B (Kutulu)",
                "description": "4GB RAM versiyonu, kutusuyla birlikte. Hiç kullanılmadı.",
                "price": Decimal("2500.00"),
                "category": "Elektronik & Teknoloji",
                "condition": "new",
                "image": "raspberry_pi.png",
            },
            {
                "title": "Arduino Mega Başlangıç Seti",
                "description": "Tüm sensörler ve kablolar dahil tam set.",
                "price": Decimal("800.00"),
                "category": "Elektronik & Teknoloji",
                "condition": "like_new",
                "image": "arduino_set.jpg",
            },
        ],
    },
    "karatay": {
        "admin": [],
        "student": [
            {
                "title": "Logitech MX Master 3S Mouse",
                "description": "Yazılımcılar için en iyi mouse, kutusunda duruyor.",
                "price": Decimal("2800.00"),
                "category": "Elektronik & Teknoloji",
                "condition": "new",
                "image": "logitech_mouse.jpg",
            },
            {
                "title": "Introduction to Algorithms (Cormen) Kitabı",
                "description": "Algoritma dersinin başucu kitabı, tertemiz.",
                "price": Decimal("600.00"),
                "category": "Kitap & Kırtasiye",
                "condition": "good",
                "image": "cormen_algo.jpg",
            },
        ],
    },
    "erbakan": {
        "admin": [],
        "student": [
            {
                "title": "Dell 27 inç 4K Monitör",
                "description": "UltraSharp serisi, profesyonel renk kalitesi.",
                "price": Decimal("9000.00"),
                "category": "Elektronik & Teknoloji",
                "condition": "like_new",
                "image": "dell_monitor.jpg",
            },
            {
                "title": "Mekanik Klavye - Keychron K2",
                "description": "Bluetooth bağlantılı, RGB aydınlatmalı mekanik klavye.",
                "price": Decimal("3500.00"),
                "category": "Elektronik & Teknoloji",
                "condition": "good",
                "image": "keychron_k2.jpg",
            },
        ],
    },
    "selcuk": {
        "admin": [],
        "student": [
            {
                "title": "Ikea Markus Çalışma Koltuğu",
                "description": "Konforlu çalışma koltuğu, sağlam durumda.",
                "price": Decimal("4500.00"),
                "category": "Ev & Yurt Eşyası",
                "condition": "good",
                "image": "ikea_markus.jpg",
            },
            {
                "title": "Yazılımcılar İçin Özel Ders (Python)",
                "description": "Sıfırdan ileri seviye Python ve Veri Yapıları dersi verilir.",
                "price": Decimal("400.00"),
                "category": "Özel Ders & Hizmet",
                "condition": "new",
                "image": "python_ders.jpg",
            },
        ],
    },
}

_CAREER: dict[str, dict[str, list[dict]]] = {
    "kgtu": {
        "admin": [
            {
                "title": "KGTU Bilgi İşlem - Öğrenci Asistanı",
                "description": "IT destek ve ağ bakımı yapacak öğrenci aranıyor. Haftalık 20 saat.",
                "type": "job",
                "company_name": "KGTU Bilgi İşlem",
                "location": "Konya",
                "sector": "Bilgi Teknolojileri",
                "application_type": "dm",
                "external_url": None,
            },
        ],
        "student": [
            {
                "title": "Python Geliştirici Stajyer",
                "description": "Yazılım ekibimize katılacak, Django/FastAPI bilen stajyer aranıyor.",
                "type": "internship",
                "company_name": "TechKonya",
                "location": "Konya",
                "sector": "Yazılım",
                "application_type": "dm",
                "external_url": None,
            },
        ],
    },
    "ktun": {
        "admin": [
            {
                "title": "KTUN Teknoloji Transfer Ofisi - Uzman Yardımcısı",
                "description": "Üniversite-sanayi iş birliği projelerinde görev alacak ekip arkadaşı.",
                "type": "job",
                "company_name": "KTUN TTO",
                "location": "Konya",
                "sector": "Akademik",
                "application_type": "dm",
                "external_url": None,
            },
        ],
        "student": [
            {
                "title": "Gömülü Sistemler Stajyeri",
                "description": "STM32 ve Arduino tecrübesi olan stajyerler aranmaktadır.",
                "type": "internship",
                "company_name": "Savunma Ar-Ge",
                "location": "Ankara",
                "sector": "Savunma Sanayi",
                "application_type": "dm",
                "external_url": None,
            },
        ],
    },
    "karatay": {
        "admin": [
            {
                "title": "Karatay Üniversitesi - Kısmi Zamanlı Kütüphaneci",
                "description": "Kütüphane düzeninden sorumlu olacak öğrenci aranıyor.",
                "type": "job",
                "company_name": "Karatay Üniversitesi",
                "location": "Konya",
                "sector": "Eğitim",
                "application_type": "dm",
                "external_url": None,
            },
        ],
        "student": [
            {
                "title": "Frontend (React) Geliştirici",
                "description": "Modern web teknolojilerine hakim, Junior seviye geliştirici.",
                "type": "job",
                "company_name": "WebStudio",
                "location": "İstanbul",
                "sector": "Yazılım",
                "application_type": "dm",
                "external_url": None,
            },
        ],
    },
    "erbakan": {
        "admin": [
            {
                "title": "Necmettin Erbakan Üni. - Laboratuvar Görevlisi",
                "description": "Kimya laboratuvarı hazırlık süreçlerinde görev alacak.",
                "type": "job",
                "company_name": "NEÜ Fen Fakültesi",
                "location": "Konya",
                "sector": "Akademik",
                "application_type": "dm",
                "external_url": None,
            },
        ],
        "student": [
            {
                "title": "Mobil Uygulama Stajyeri (React Native)",
                "description": "iOS ve Android platformlarında uygulama geliştirecek.",
                "type": "internship",
                "company_name": "AppKonya",
                "location": "Konya",
                "sector": "Yazılım",
                "application_type": "dm",
                "external_url": None,
            },
        ],
    },
    "selcuk": {
        "admin": [
            {
                "title": "Selçuk TTO - Proje Koordinatörü",
                "description": "AB projeleri ve TÜBİTAK süreçlerini yönetecek.",
                "type": "job",
                "company_name": "Selçuk Üniversitesi TTO",
                "location": "Konya",
                "sector": "Akademik",
                "application_type": "dm",
                "external_url": None,
            },
        ],
        "student": [
            {
                "title": "Veri Bilimi Stajyeri",
                "description": "SQL ve Python bilen, veri analizi yapacak stajyer.",
                "type": "internship",
                "company_name": "DataAnalytica",
                "location": "Ankara",
                "sector": "Veri Analizi",
                "application_type": "dm",
                "external_url": None,
            },
        ],
    },
}




# ─────────────────────────────────────────────────────────────
def _copy_seed_image(image_name: str) -> str | None:
    """
    Copies a seed image from backend/data/seed_images/marketplace/ 
    to backend/uploads/marketplace/ and returns the URL.
    """
    if not image_name:
        return None
        
    src_dir = Path(__file__).parent.parent / "data" / "seed_images" / "marketplace"
    dest_dir = Path(__file__).parent.parent / "uploads" / "marketplace"
    
    src_path = src_dir / image_name
    dest_path = dest_dir / image_name
    
    if not src_path.exists():
        print(f"[WARN] Seed image not found: {src_path}")
        return None
        
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        shutil.copy2(src_path, dest_path)
        return f"/uploads/marketplace/{image_name}"
    except Exception as e:
        print(f"[ERROR] Failed to copy seed image {image_name}: {e}")
        return None


# Phase 1 — Users
# ─────────────────────────────────────────────────────────────

async def seed_users() -> None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        for uni_info in UNIVERSITIES:
            uni = await _get_uni(session, uni_info["name"])
            if not uni:
                print(f"[WARN] Üniversite bulunamadı, atlanıyor: {uni_info['name']}")
                continue

            dept1, dept2 = await _resolve_depts(session, uni.id, uni_info["short"])
            short = uni_info["short"]
            now = _now()

            print(f"\n── {uni.name} ──")
            print(f"   dept1 → {dept1.name}  (id: {dept1.id})")
            print(f"   dept2 → {dept2.name}  (id: {dept2.id})")

            # Super admin — only once, attached to the first university (KGTU)
            if short == "kgtu":
                _, created = await _upsert_user(session, f"admin@{uni_info['ogr_domain']}", {
                    "password_hash": hash_password("admin123"),
                    "_raw_password": "admin123",
                    "first_name": "Admin",
                    "last_name": "Kullanıcısı",
                    "username": "super_admin",
                    "university": uni.name,
                    "university_id": uni.id,
                    "department_id": dept1.id,
                    "role": UserRole.ADMIN,
                    "grade": "4. Sınıf",
                    "is_verified": True,
                    "is_active": True,
                    "terms_accepted_at": now,
                })
                print(f"[{'OK' if created else '..'}] Super Admin: admin@{uni_info['ogr_domain']}")

            # Unique user definitions based on university short name
            name_map = {
                "kgtu": {
                    "admin": ("Buse", "Gürsoy"),
                    "student": ("Kadir", "Aydın")
                },
                "ktun": {
                    "admin": ("Ahmet", "Yılmaz"),
                    "student": ("Mehmet", "Demir")
                },
                "karatay": {
                    "admin": ("Kemal", "Kaya"),
                    "student": ("Gizem", "Çelik")
                },
                "erbakan": {
                    "admin": ("Nihan", "Eren"),
                    "student": ("Emre", "Yıldız")
                },
                "selcuk": {
                    "admin": ("Selin", "Şahin"),
                    "student": ("Salih", "Koç")
                }
            }

            uni_names = name_map.get(short, {
                "admin": ("Ahmet", "Yılmaz"),
                "student": ("Mehmet", "Demir")
            })

            admin_fname, admin_lname = uni_names["admin"]
            student_fname, student_lname = uni_names["student"]

            # 1 university admin
            admin_defs = [
                (admin_fname, admin_lname, f"{short}_admin1", "4. Sınıf", dept1),
            ]
            for fname, lname, uname, grade, dept in admin_defs:
                email = f"{uname}@{uni_info['ogr_domain']}"
                _, created = await _upsert_user(session, email, {
                    "password_hash": hash_password("admin123"),
                    "_raw_password": "admin123",
                    "first_name": fname,
                    "last_name": lname,
                    "username": uname,
                    "university": uni.name,
                    "university_id": uni.id,
                    "department_id": dept.id,
                    "role": UserRole.UNIVERSITY_ADMIN,
                    "grade": grade,
                    "is_verified": True,
                    "is_active": True,
                    "terms_accepted_at": now,
                })
                print(f"[{'OK' if created else '..'}] Üniversite Admin: {email}  ({dept.name})")

            # 1 student
            student_defs = [
                (student_fname, student_lname, f"{short}_student1", "3. Sınıf", dept1),
            ]
            for fname, lname, uname, grade, dept in student_defs:
                email = f"{uname}@{uni_info['ogr_domain']}"
                _, created = await _upsert_user(session, email, {
                    "password_hash": hash_password("student123"),
                    "_raw_password": "student123",
                    "first_name": fname,
                    "last_name": lname,
                    "username": uname,
                    "university": uni.name,
                    "university_id": uni.id,
                    "department_id": dept.id,
                    "role": UserRole.STUDENT,
                    "grade": grade,
                    "is_verified": True,
                    "is_active": True,
                    "terms_accepted_at": now,
                })
                print(f"[{'OK' if created else '..'}] Öğrenci: {email}  ({dept.name}, {grade})")

        await session.commit()
    print("\n[DONE] Kullanıcılar seed edildi.\n")


# ─────────────────────────────────────────────────────────────
# Phase 2 — Content
# ─────────────────────────────────────────────────────────────

async def seed_content() -> None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        now = _now()
        cat_map = await _ensure_marketplace_categories(session)

        for uni_info in UNIVERSITIES:
            uni = await _get_uni(session, uni_info["name"])
            if not uni:
                continue

            short = uni_info["short"]
            # Use the same deterministic dept resolution as seed_users()
            dept1, dept2 = await _resolve_depts(session, uni.id, short)
            forum_cat_map = await _ensure_forum_categories(session, uni.id)

            print(f"\n── İçerik: {uni.name} ──")

            # Build (user, role_key, content_idx, dept, grade_or_None) slots
            user_slots: list[tuple[User, str, int, Department, str | None]] = []

            for i, uname in enumerate([f"{short}_admin1"]):
                user = (await session.execute(
                    select(User).where(User.email == f"{uname}@{uni_info['ogr_domain']}")
                )).scalar_one_or_none()
                dept = dept1
                if user:
                    user_slots.append((user, "admin", i, dept, None))
                else:
                    print(f"[WARN] Kullanıcı bulunamadı, atlanıyor: {uname}@{uni_info['ogr_domain']}")

            for i, (uname, grade, dept) in enumerate([
                (f"{short}_student1", "3. Sınıf", dept1),
            ]):
                user = (await session.execute(
                    select(User).where(User.email == f"{uname}@{uni_info['ogr_domain']}")
                )).scalar_one_or_none()
                if user:
                    user_slots.append((user, "student", i, dept, grade))
                else:
                    print(f"[WARN] Kullanıcı bulunamadı, atlanıyor: {uname}@{uni_info['ogr_domain']}")

            for user, role_key, idx, dept, grade in user_slots:
                # ── Forum topic ────────────────────────────────────────
                forum_list = _FORUM.get(short, {}).get(role_key, [])
                
                # Students post all items (2), others post by index (1)
                forum_items = forum_list if role_key == "student" else (forum_list[idx:idx+1] if idx < len(forum_list) else [])
                
                for title, content in forum_items:
                    # Duplicate kontrolü: title + author_id (university_id artık NULL)
                    exists = (await session.execute(
                        select(ForumTopic).where(
                            and_(ForumTopic.title == title, ForumTopic.author_id == user.id)
                        )
                    )).scalars().first()
                    if not exists:
                        session.add(ForumTopic(
                            id=_uid(),
                            title=title,
                            content=content,
                            author_id=user.id,
                            university_id=None,  # Herkese açık — "Tüm Gönderiler"de tüm üniversitelerden görünür
                            category_id=forum_cat_map.get("Kampüs Yaşamı"),
                            topic_type="text",
                            tags=[short, role_key],
                            is_pinned=False,
                            is_deleted=False,
                            view_count=0,
                            reply_count=0,
                            helpful_count=0,
                            created_at=now,
                            updated_at=now,
                        ))
                        print(f"[OK] ForumTopic: {title[:60]}")
                    else:
                        print(f"[SKIP] ForumTopic: {title[:60]}")

                # ── Marketplace listing ────────────────────────────────
                mp_list = _MARKETPLACE.get(short, {}).get(role_key, [])
                
                # Students post all items in their list, others post by index
                items_to_seed = mp_list if role_key == "student" else (mp_list[idx:idx+1] if idx < len(mp_list) else [])
                
                for mp in items_to_seed:
                    # Handle image
                    image_url = _copy_seed_image(mp.get("image"))
                    image_urls_json = json.dumps([image_url]) if image_url else None
                    
                    exists = (await session.execute(
                        select(MarketplaceListing).where(
                            and_(
                                MarketplaceListing.title == mp["title"],
                                MarketplaceListing.seller_id == user.id,
                            )
                        )
                    )).scalars().first()
                    if not exists:
                        session.add(MarketplaceListing(
                            id=_uid(),
                            seller_id=user.id,
                            title=mp["title"],
                            description=mp["description"],
                            price=mp["price"],
                            category_id=cat_map.get(mp["category"]),
                            condition=mp["condition"],
                            image_urls=image_urls_json,
                            status="active",
                            view_count=0,
                            message_count=0,
                            created_at=now,
                            updated_at=now,
                        ))
                        print(f"[OK] MarketplaceListing: {mp['title'][:60]}")
                    else:
                        print(f"[SKIP] MarketplaceListing: {mp['title'][:60]}")

                # ── Career listing ─────────────────────────────────────
                ca_list = _CAREER.get(short, {}).get(role_key, [])
                if idx < len(ca_list):
                    ca = ca_list[idx]
                    exists = (await session.execute(
                        select(CareerListing).where(
                            and_(
                                CareerListing.title == ca["title"],
                                CareerListing.posted_by == user.id,
                            )
                        )
                    )).scalars().first()
                    if not exists:
                        session.add(CareerListing(
                            id=_uid(),
                            type=ca["type"],
                            posted_by=user.id,
                            university_id=None,  # Herkese açık — tüm üniversitelerden görünür
                            title=ca["title"],
                            description=ca["description"],
                            company_name=ca.get("company_name"),
                            location=ca.get("location"),
                            sector=ca.get("sector"),
                            is_remote=False,
                            application_type=ca["application_type"],
                            external_url=ca.get("external_url"),
                            status="active",
                            view_count=0,
                            application_count=0,
                            created_at=now,
                            updated_at=now,
                        ))
                        print(f"[OK] CareerListing: {ca['title'][:60]}")
                    else:
                        print(f"[SKIP] CareerListing: {ca['title'][:60]}")

            pass

        await session.commit()
    print("\n[DONE] İçerik seed edildi.\n")


async def seed_course_notes() -> None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        now = _now()
        # Find super admin as the creator
        admin = (await session.execute(
            select(User).where(User.username == "super_admin")
        )).scalar_one_or_none()
        
        if not admin:
            print("[WARN] Super admin bulunamadı, ders notları atlanıyor.")
            return

        for note in _COURSE_NOTES:
            exists = (await session.execute(
                select(CourseNoteTopic).where(CourseNoteTopic.course_code == note["code"])
            )).scalars().first()
            
            if not exists:
                session.add(CourseNoteTopic(
                    id=_uid(),
                    course_code=note["code"],
                    title=note["title"],
                    university_id=admin.university_id,
                    created_by=admin.id,
                    created_at=now,
                ))
                print(f"[OK] CourseNoteTopic: {note['code']} - {note['title']}")
            else:
                print(f"[SKIP] CourseNoteTopic: {note['code']}")
        
        await session.commit()
    print("\n[DONE] Ders notu havuzları seed edildi.\n")


async def seed_academic_calendar() -> None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        now = _now()
        # Find super admin as default creator
        admin = (await session.execute(
            select(User).where(User.username == "super_admin")
        )).scalar_one_or_none()
        
        for uni_info in UNIVERSITIES:
            uni = (await session.execute(
                select(University).where(University.name == uni_info["name"])
            )).scalar_one_or_none()
            
            if not uni: continue
            
            print(f"── Akademik Takvim: {uni.name} ──")
            for ev in _calendar_events(uni.id, admin.id if admin else None, uni.name):
                exists = (await session.execute(
                    select(AcademicCalendarEvent).where(
                        and_(
                            AcademicCalendarEvent.university_id == uni.id,
                            AcademicCalendarEvent.title == ev["title"],
                            AcademicCalendarEvent.academic_year == ACADEMIC_YEAR
                        )
                    )
                )).scalars().first()
                
                if not exists:
                    session.add(AcademicCalendarEvent(
                        id=_uid(),
                        university_id=uni.id,
                        academic_year=ACADEMIC_YEAR,
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
                    print(f"[OK] {ev['title']}")
                else:
                    print(f"[SKIP] {ev['title']}")
        
        await session.commit()
    print("\n[DONE] Akademik takvim seed edildi.\n")


async def seed_course_schedules() -> None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        # Find super admin
        admin = (await session.execute(
            select(User).where(User.username == "super_admin")
        )).scalar_one_or_none()
        
        for uni_info in UNIVERSITIES:
            uni = (await session.execute(
                select(University).where(University.name == uni_info["name"])
            )).scalar_one_or_none()
            if not uni: continue
            
            # Find Computer Engineering department
            dept = (await session.execute(
                select(Department).join(Faculty).where(
                    and_(
                        Faculty.university_id == uni.id,
                        Department.name.ilike("%Bilgisayar Mühendisliği%")
                    )
                )
            )).scalars().first()
            
            if not dept: continue
            
            print(f"── Ders Programı: {uni.name} ({dept.name}) ──")
            
            for cy in ["3", "4"]:
                # Veri seçimi
                raw_data = []
                if "Gıda ve Tarım" in uni.name:
                    if cy == "3":
                        raw_data = _KGTU_CENG_S3_SCHEDULE
                    else:
                        raw_data = _KGTU_CENG_SCHEDULE
                else:
                    # Diğerleri için basit örnekler
                    raw_data = [
                        {
                            "name": f"Ders {cy}-A",
                            "code": f"ENG{cy}01",
                            "instructor": "Hoca",
                            "room": "Amfi",
                            "color": "#6366f1",
                            "slots": [{"day": "monday", "start_time": "10:00", "end_time": "11:50"}]
                        }
                    ]

                schedule_data = []
                for item in raw_data:
                    item_copy = item.copy()
                    item_copy["id"] = str(uuid4())
                    schedule_data.append(item_copy)

                exists = (await session.execute(
                    select(CourseSchedule).where(
                        and_(
                            CourseSchedule.university_id == uni.id,
                            CourseSchedule.department == dept.name,
                            CourseSchedule.class_year == cy,
                            CourseSchedule.semester == "bahar",
                            CourseSchedule.academic_year == ACADEMIC_YEAR
                        )
                    )
                )).scalar_one_or_none()
                
                if not exists:
                    session.add(CourseSchedule(
                        id=_uid(),
                        university_id=uni.id,
                        department=dept.name,
                        class_year=cy,
                        semester="bahar",
                        academic_year=ACADEMIC_YEAR,
                        schedule_data={"courses": schedule_data},
                        is_approved=True,
                        created_by=admin.id if admin else None
                    ))
                    print(f"[OK] {cy}. Sınıf Bahar Programı oluşturuldu.")
                else:
                    exists.schedule_data = {"courses": schedule_data}
                    print(f"[UPDATED] {cy}. Sınıf Bahar Programı güncellendi.")
        
        await session.commit()
    print("\n[DONE] Ders programları seed edildi.\n")


# ─────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────

async def main() -> None:
    engine = get_engine()
    try:
        await seed_users()
        await seed_content()
        await seed_course_notes()
        await seed_academic_calendar()
        await seed_course_schedules()
    except Exception:
        print("[ERROR] Seed işlemi başarısız.")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
