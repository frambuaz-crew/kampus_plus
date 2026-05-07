"""Idempotent initial data seeding.

Guarantees per run:
- 1 super admin  (admin@abc.com)
- 2 university admins per university
- 2 students per university
- 1 forum topic + 1 marketplace listing + 1 career listing per non-super-admin user
- 1 course schedule per student  (based on their department + class year)
- 4 academic calendar events per university

Department selection is deterministic: preferred dept names are looked up by name
within the university, falling back to alphabetical order only if not found.
"""

import asyncio
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


# ─────────────────────────────────────────────────────────────
# Constants
# ─────────────────────────────────────────────────────────────

ACADEMIC_YEAR = "2025-2026"
SEMESTER = "bahar"

# Universities to seed — must already exist (created by seed_konya_normalized.py)
UNIVERSITIES = [
    {"name": "Konya Gıda ve Tarım Üniversitesi", "short": "kgtu"},
    {"name": "Selçuk Üniversitesi", "short": "selcuk"},
]

# Preferred department names for each university.
# admin1/student1 → index 0, admin2/student2 → index 1.
# These are looked up by exact name; falls back to first alphabetical dept if not found.
PREFERRED_DEPTS: dict[str, list[str]] = {
    "kgtu": [
        "Bilgisayar Mühendisliği",
        "Yazılım Mühendisliği",
    ],
    "selcuk": [
        "Bilgisayar Mühendisliği",      # in Teknoloji Fakültesi
        "Elektrik-Elektronik Mühendisliği",  # in Teknoloji Fakültesi
    ],
}

MARKETPLACE_CATEGORIES = [
    {"name": "Elektronik", "icon": "laptop", "order_index": 1},
    {"name": "Kitap & Ders Materyali", "icon": "book-open", "order_index": 2},
    {"name": "Kırtasiye & Eğitim", "icon": "pencil", "order_index": 3},
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
        select(User).where(User.email == email)
    )).scalar_one_or_none()

    if user:
        changed = False
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


async def _ensure_forum_category(session, university_id: str) -> str:
    name = "Kampüs Yaşamı"
    cat = (await session.execute(
        select(ForumCategory).where(
            and_(ForumCategory.name == name, ForumCategory.university_id == university_id)
        )
    )).scalar_one_or_none()
    if not cat:
        cat = ForumCategory(
            id=_uid(), name=name,
            description="Kampüs yaşamına dair güncel tartışmalar",
            icon="campus", order_index=1, is_active=True,
            university_id=university_id, created_at=_now(),
        )
        session.add(cat)
        await session.flush()
        print(f"[OK] ForumCategory oluşturuldu: {name}")
    return cat.id


# ─────────────────────────────────────────────────────────────
# Content templates  (indexed by university short name + role + 0/1)
# ─────────────────────────────────────────────────────────────

_FORUM: dict[str, dict[str, list[tuple[str, str]]]] = {
    "kgtu": {
        "admin": [
            (
                "Kampüs Wi-Fi Altyapısı Yenileme Çalışmaları",
                "Bilgi işlem birimiz kampüs genelindeki kablosuz ağ altyapısını yenilemektedir. "
                "Yeni erişim noktaları tüm akademik binalara kurulacak, bant genişliği artırılacaktır. "
                "Çalışmalar 3 hafta sürecek olup etkilenen binalar ayrıca duyurulacaktır.",
            ),
            (
                "Bahar Dönemi Öğrenci Kulüpleri Faaliyetleri Başvuruları",
                "Bahar döneminde faaliyet gösterecek öğrenci kulüpleri yıllık faaliyet planlarını "
                "Öğrenci İşleri Dairesi'ne iletmelidir. Son başvuru tarihi 20 Şubat 2026. "
                "Başvuru formları öğrenci portalından temin edilebilir.",
            ),
        ],
        "student": [
            (
                "Yemekhane Fiyatları ve Menü Kalitesi Hakkında",
                "Bu dönem yemekhane fiyatlarında ciddi artış yaşandı; öğle yemeği 45 TL'ye çıktı. "
                "Menü çeşitliliği de azaldı, et yemeği haftada yalnızca 2 gün sunuluyor. "
                "Üniversite yönetimine resmi dilekçe vermek isteyenler var mı?",
            ),
            (
                "Vize Haftası Kütüphane Çalışma Saatleri Uzatılsın",
                "Vize döneminde kütüphanenin 22:00'de kapanması yetersiz. "
                "Diğer üniversitelerde vize haftasında 24 saat uygulama mevcut. "
                "Ortak dilekçe hazırlamak istiyorum, destek verir misiniz?",
            ),
        ],
    },
    "selcuk": {
        "admin": [
            (
                "Selçuk Üniversitesi Yeni Kampüs İçi Servis Güzergahları",
                "Bahar döneminden itibaren kampüs içi servis güzergahları yeniden düzenlenmiştir. "
                "Merkezi Kütüphane ile Mühendislik Fakültesi arasına yeni hat eklenmiş, "
                "yoğun saatlerde seferler 10 dakikaya indirilmiştir.",
            ),
            (
                "Mentor-Öğrenci Programı Bahar Dönemi Kayıtları Açıldı",
                "Kariyer koordinatörlüğünün yürüttüğü Mentor-Öğrenci programı kayıtları açılmıştır. "
                "Sektör deneyimli mezunlarımız genç öğrencilere rehberlik yapacaktır. "
                "Başvurular öğrenci portalı üzerinden alınmaktadır.",
            ),
        ],
        "student": [
            (
                "Selçuk Üniversitesi Kampüs İçi Ulaşım Sorunları",
                "Sabah 08:00–09:00 arası belediye otobüsleri çok kalabalık; bazen binemeden ders kaçıyoruz. "
                "Kampüs içi servis hattının Mühendislik Fakültesi'ne uzatılması gerekiyor. "
                "Benzer sorunu yaşayanlar var mı?",
            ),
            (
                "Bölüm Değişikliği Süreci Deneyimleriniz",
                "Bölüm değişikliği başvurusu yapmayı düşünüyorum. Süreci deneyimleyenlerin belge, "
                "süre ve sonuç hakkında bilgi vermesini istiyorum. Tecrübelerinizi paylaşır mısınız?",
            ),
        ],
    },
}

_MARKETPLACE: dict[str, dict[str, list[dict]]] = {
    "kgtu": {
        "admin": [
            {
                "title": "Ofis Kökenli Epson Projeksiyon Cihazı",
                "description": "Epson EMP-X5, teknik servis yapıldı, temiz kullanım. Kutusuyla verilir. Kampüste teslim.",
                "price": Decimal("800.00"),
                "category": "Elektronik",
                "condition": "good",
            },
            {
                "title": "Ciltli Mühendislik Dergileri 2020-2023 (15 Adet)",
                "description": "Araştırma için uygun ciltli mühendislik dergileri. Ücretsiz, kampüste teslim.",
                "price": Decimal("0.00"),
                "category": "Kitap & Ders Materyali",
                "condition": "good",
            },
        ],
        "student": [
            {
                "title": "İkinci El Temiz CASIO fx-82MS Hesap Makinesi",
                "description": "1 yıllık kullanım, hiç arızalanmadı. Orijinal kutu ve kılıfıyla. Kampüste teslim.",
                "price": Decimal("150.00"),
                "category": "Elektronik",
                "condition": "like_new",
            },
            {
                "title": "Mühendislik Çizim Seti - T-cetvel, Gönye, Pergel",
                "description": "Mimarlık 1. sınıf için gerekli tüm araçlar dahil, orijinal çantasıyla. Bir dönem kullanıldı.",
                "price": Decimal("220.00"),
                "category": "Kırtasiye & Eğitim",
                "condition": "good",
            },
        ],
    },
    "selcuk": {
        "admin": [
            {
                "title": "Bölüm Kütüphanesi İçin Bağış Kitaplar",
                "description": "Çeşitli mühendislik ve fen bilimleri kitapları, bağış amaçlı. Ücretsiz, kampüste teslim.",
                "price": Decimal("0.00"),
                "category": "Kitap & Ders Materyali",
                "condition": "good",
            },
            {
                "title": "Laptop Standı ve Ergonomik Mouse Seti",
                "description": "Ofis malzemesi fazlası. Laptop standı + Logitech M185 mouse. Selçuk kampüsünde teslim.",
                "price": Decimal("250.00"),
                "category": "Elektronik",
                "condition": "like_new",
            },
        ],
        "student": [
            {
                "title": "Organik Kimya - Clayden 2. Baskı (İngilizce)",
                "description": "Selçuk Kimya Mühendisliği müfredatında kullanılan kitap. Birkaç sayfada kalem notu var.",
                "price": Decimal("180.00"),
                "category": "Kitap & Ders Materyali",
                "condition": "good",
            },
            {
                "title": "Redragon K552 Mekanik Klavye (RGB, Kırmızı Switch)",
                "description": "1 yıllık temiz kullanım. Selçuk kampüsünde teslim.",
                "price": Decimal("350.00"),
                "category": "Elektronik",
                "condition": "good",
            },
        ],
    },
}

_CAREER: dict[str, dict[str, list[dict]]] = {
    "kgtu": {
        "admin": [
            {
                "title": "KGTU Bilgi İşlem - Kısmi Zamanlı Öğrenci Asistanı",
                "description": "IT destek ve ağ altyapı bakımı yapacak öğrenci asistanı aranmaktadır. Haftada 20 saat, aylık 3.500 TL burs.",
                "type": "job",
                "company_name": "KGTU Bilgi İşlem Dairesi",
                "location": "Konya",
                "sector": "Bilgi Teknolojileri",
                "application_type": "dm",
                "external_url": None,
            },
            {
                "title": "KGTU AR-GE Merkezi - Proje Asistanı",
                "description": "TÜBİTAK destekli projede görev alacak mühendislik öğrencisi aranıyor. Aylık 4.000 TL, esnek çalışma.",
                "type": "job",
                "company_name": "KGTU AR-GE Merkezi",
                "location": "Konya",
                "sector": "Akademik & AR-GE",
                "application_type": "dm",
                "external_url": None,
            },
        ],
        "student": [
            {
                "title": "Nurol Teknoloji - Yazılım Geliştirici Stajyeri",
                "description": "Python veya Java deneyimi tercih edilir. 2 ay ücretli staj, Ankara ofisinde yüz yüze.",
                "type": "internship",
                "company_name": "Nurol Teknoloji A.Ş.",
                "location": "Ankara",
                "sector": "Savunma Sanayi & Yazılım",
                "application_type": "external",
                "external_url": None,
            },
            {
                "title": "Konya Şeker Fabrikası - Gıda Mühendisliği Stajyeri",
                "description": "Gıda işleme süreçlerinde 45 iş günü zorunlu staj. Ulaşım karşılanır.",
                "type": "internship",
                "company_name": "Konya Şeker A.Ş.",
                "location": "Konya",
                "sector": "Gıda & Tarım",
                "application_type": "dm",
                "external_url": None,
            },
        ],
    },
    "selcuk": {
        "admin": [
            {
                "title": "Selçuk Üniversitesi TTO - Veri Analisti Stajyeri",
                "description": "AR-GE merkezinde veri analizi stajı. Python (Pandas, NumPy) zorunlu. 45 iş günü tam zamanlı.",
                "type": "internship",
                "company_name": "Selçuk Üniversitesi TTO",
                "location": "Konya",
                "sector": "Akademik & AR-GE",
                "application_type": "dm",
                "external_url": None,
            },
            {
                "title": "Selçuk Üniversitesi - Laboratuvar Öğrenci Asistanı",
                "description": "Fakülte laboratuvarlarında öğrencilere yardım edecek kısmi zamanlı asistan. Haftada 15 saat, aylık 2.800 TL.",
                "type": "job",
                "company_name": "Selçuk Üniversitesi",
                "location": "Konya",
                "sector": "Akademik",
                "application_type": "dm",
                "external_url": None,
            },
        ],
        "student": [
            {
                "title": "Arçelik - Elektronik Mühendisliği Stajyeri",
                "description": "Konya fabrikasında elektronik tasarım ve test departmanında 40 iş günü ücretli staj. Öğle yemeği karşılanır.",
                "type": "internship",
                "company_name": "Arçelik A.Ş.",
                "location": "Konya",
                "sector": "Elektronik & Üretim",
                "application_type": "dm",
                "external_url": None,
            },
            {
                "title": "Konya Büyükşehir Belediyesi - BT Stajyeri",
                "description": "Bilgi işlem biriminde web/mobil uygulama geliştirme stajı. React veya Flutter bilgisi tercih. 45 iş günü.",
                "type": "internship",
                "company_name": "Konya Büyükşehir Belediyesi",
                "location": "Konya",
                "sector": "Kamu & BT",
                "application_type": "dm",
                "external_url": None,
            },
        ],
    },
}


def _schedule_data(dept_name: str, grade: str) -> dict:
    """Return a weekly schedule appropriate for the given department name and class year."""
    is_cs = any(kw in dept_name for kw in ("Bilgisayar", "Yazılım", "Bilişim"))
    is_ee = any(kw in dept_name for kw in ("Elektrik", "Elektronik"))

    if is_cs and grade == "3":
        return {
            "Pazartesi": [
                {"saat": "09:00-10:50", "ders": "Veri Yapıları ve Algoritmalar",
                 "ogretim_uyesi": "Dr. Öğr. Üyesi Mehmet Kaya", "derslik": "B201", "tur": "Teorik"},
                {"saat": "13:00-14:50", "ders": "Lineer Cebir",
                 "ogretim_uyesi": "Doç. Dr. Ayşe Demir", "derslik": "A105", "tur": "Teorik"},
            ],
            "Salı": [
                {"saat": "10:00-11:50", "ders": "Nesneye Yönelik Programlama",
                 "ogretim_uyesi": "Dr. Öğr. Üyesi Ali Çelik", "derslik": "Lab-1", "tur": "Uygulama"},
            ],
            "Çarşamba": [
                {"saat": "09:00-10:50", "ders": "Veri Yapıları ve Algoritmalar",
                 "ogretim_uyesi": "Dr. Öğr. Üyesi Mehmet Kaya", "derslik": "Lab-2", "tur": "Uygulama"},
                {"saat": "11:00-12:50", "ders": "Olasılık ve İstatistik",
                 "ogretim_uyesi": "Prof. Dr. Fatma Yıldız", "derslik": "A201", "tur": "Teorik"},
            ],
            "Perşembe": [
                {"saat": "13:00-14:50", "ders": "Nesneye Yönelik Programlama",
                 "ogretim_uyesi": "Dr. Öğr. Üyesi Ali Çelik", "derslik": "B105", "tur": "Teorik"},
            ],
            "Cuma": [
                {"saat": "10:00-11:50", "ders": "Lineer Cebir",
                 "ogretim_uyesi": "Doç. Dr. Ayşe Demir", "derslik": "A105", "tur": "Uygulama"},
            ],
        }

    if is_cs and grade == "2":
        return {
            "Pazartesi": [
                {"saat": "09:00-10:50", "ders": "İşletim Sistemleri",
                 "ogretim_uyesi": "Doç. Dr. Kemal Aydın", "derslik": "D401", "tur": "Teorik"},
            ],
            "Çarşamba": [
                {"saat": "11:00-12:50", "ders": "Veritabanı Yönetim Sistemleri",
                 "ogretim_uyesi": "Dr. Öğr. Üyesi Seda Kurt", "derslik": "Lab-3", "tur": "Uygulama"},
                {"saat": "13:00-14:50", "ders": "Yazılım Mühendisliğine Giriş",
                 "ogretim_uyesi": "Prof. Dr. İbrahim Yılmaz", "derslik": "D405", "tur": "Teorik"},
            ],
            "Perşembe": [
                {"saat": "09:00-10:50", "ders": "İşletim Sistemleri",
                 "ogretim_uyesi": "Doç. Dr. Kemal Aydın", "derslik": "Lab-1", "tur": "Uygulama"},
            ],
        }

    if is_ee and grade == "3":
        return {
            "Pazartesi": [
                {"saat": "09:00-10:50", "ders": "Sinyal ve Sistemler",
                 "ogretim_uyesi": "Prof. Dr. Hakan Özkan", "derslik": "E301", "tur": "Teorik"},
            ],
            "Salı": [
                {"saat": "10:00-11:50", "ders": "Elektronik Devreler",
                 "ogretim_uyesi": "Doç. Dr. Canan Şen", "derslik": "Lab-EE-1", "tur": "Uygulama"},
                {"saat": "13:00-14:50", "ders": "Elektromanyetik Alan Teorisi",
                 "ogretim_uyesi": "Dr. Öğr. Üyesi Burak Koç", "derslik": "E205", "tur": "Teorik"},
            ],
            "Perşembe": [
                {"saat": "09:00-10:50", "ders": "Sinyal ve Sistemler",
                 "ogretim_uyesi": "Prof. Dr. Hakan Özkan", "derslik": "Lab-EE-2", "tur": "Uygulama"},
            ],
            "Cuma": [
                {"saat": "11:00-12:50", "ders": "Mikrodenetleyiciler",
                 "ogretim_uyesi": "Doç. Dr. Canan Şen", "derslik": "E301", "tur": "Teorik"},
            ],
        }

    if is_ee and grade == "2":
        return {
            "Salı": [
                {"saat": "08:00-09:50", "ders": "Devre Analizi",
                 "ogretim_uyesi": "Dr. Öğr. Üyesi Fatma Yıldız", "derslik": "E102", "tur": "Teorik"},
                {"saat": "10:00-11:50", "ders": "Mühendislik Matematiği II",
                 "ogretim_uyesi": "Prof. Dr. Ahmet Koç", "derslik": "A201", "tur": "Teorik"},
            ],
            "Çarşamba": [
                {"saat": "13:00-14:50", "ders": "Elektrik Makineleri I",
                 "ogretim_uyesi": "Doç. Dr. Murat Yılmaz", "derslik": "E205", "tur": "Teorik"},
            ],
            "Perşembe": [
                {"saat": "13:00-14:50", "ders": "Devre Analizi",
                 "ogretim_uyesi": "Dr. Öğr. Üyesi Fatma Yıldız", "derslik": "Lab-EE-1", "tur": "Uygulama"},
            ],
        }

    # Generic fallback for other departments
    if grade == "3":
        return {
            "Pazartesi": [
                {"saat": "09:00-10:50", "ders": "Mesleki Uygulama I",
                 "ogretim_uyesi": "Prof. Dr. Hasan Özdemir", "derslik": "C301", "tur": "Teorik"},
            ],
            "Salı": [
                {"saat": "10:00-11:50", "ders": "Sayısal Analiz",
                 "ogretim_uyesi": "Doç. Dr. Zeynep Arslan", "derslik": "Lab-1", "tur": "Uygulama"},
                {"saat": "13:00-14:50", "ders": "İleri Mesleki Konular",
                 "ogretim_uyesi": "Dr. Öğr. Üyesi Emre Şahin", "derslik": "C205", "tur": "Teorik"},
            ],
            "Cuma": [
                {"saat": "09:00-10:50", "ders": "Kalite Yönetimi",
                 "ogretim_uyesi": "Prof. Dr. Hasan Özdemir", "derslik": "C301", "tur": "Teorik"},
            ],
        }

    # grade == "2" fallback
    return {
        "Salı": [
            {"saat": "08:00-09:50", "ders": "Temel Mühendislik Bilimleri",
             "ogretim_uyesi": "Dr. Öğr. Üyesi Fatma Yıldız", "derslik": "A102", "tur": "Teorik"},
            {"saat": "10:00-11:50", "ders": "Matematik II",
             "ogretim_uyesi": "Prof. Dr. Ahmet Koç", "derslik": "A201", "tur": "Teorik"},
        ],
        "Perşembe": [
            {"saat": "13:00-14:50", "ders": "Mesleki Laboratuvar I",
             "ogretim_uyesi": "Dr. Öğr. Üyesi Fatma Yıldız", "derslik": "Lab-2", "tur": "Uygulama"},
        ],
    }


def _calendar_events(uni_name: str, university_id: str, created_by_id: str | None) -> list[dict]:
    return [
        {
            "title": f"{uni_name} - Bahar Dönemi Ders Kayıt Haftası",
            "event_type": "registration",
            "start_date": date(2026, 2, 9),
            "end_date": date(2026, 2, 13),
            "description": "Bahar dönemi ders ekleme-bırakma ve kayıt yenileme işlemleri OBS üzerinden yapılacaktır.",
            "university_id": university_id,
            "created_by": created_by_id,
        },
        {
            "title": f"{uni_name} - Bahar Dönemi Derslerin Başlangıcı",
            "event_type": "other",
            "start_date": date(2026, 2, 16),
            "end_date": None,
            "description": "2025-2026 akademik yılı bahar dönemi dersleri bu tarihte başlamaktadır.",
            "university_id": university_id,
            "created_by": created_by_id,
        },
        {
            "title": f"{uni_name} - Bahar Dönemi Vize Sınavları",
            "event_type": "exam",
            "start_date": date(2026, 3, 30),
            "end_date": date(2026, 4, 3),
            "description": "2025-2026 bahar dönemi ara sınav (vize) haftası. Tarihler bölüm sekreterlikleri tarafından duyurulacaktır.",
            "university_id": university_id,
            "created_by": created_by_id,
        },
        {
            "title": f"{uni_name} - Bahar Dönemi Final Sınavları",
            "event_type": "exam",
            "start_date": date(2026, 5, 25),
            "end_date": date(2026, 6, 5),
            "description": "2025-2026 bahar dönemi dönem sonu (final) sınavları. Mazeret tarihleri ayrıca ilan edilecektir.",
            "university_id": university_id,
            "created_by": created_by_id,
        },
    ]


# ─────────────────────────────────────────────────────────────
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
                _, created = await _upsert_user(session, "admin@abc.com", {
                    "password_hash": hash_password("admin123"),
                    "_raw_password": "admin123",
                    "first_name": "Super",
                    "last_name": "Admin",
                    "username": "super_admin",
                    "university": uni.name,
                    "university_id": uni.id,
                    "department_id": dept1.id,
                    "role": UserRole.ADMIN,
                    "is_verified": True,
                    "is_active": True,
                    "terms_accepted_at": now,
                })
                print(f"[{'OK' if created else '..'}] Super Admin: admin@abc.com")

            # 2 university admins
            admin_defs = [
                ("Ahmet", "Yılmaz", f"{short}_admin1", dept1),
                ("Fatma", "Kaya", f"{short}_admin2", dept2),
            ]
            for fname, lname, uname, dept in admin_defs:
                email = f"{uname}@{short}.edu.tr"
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
                    "is_verified": True,
                    "is_active": True,
                    "terms_accepted_at": now,
                })
                print(f"[{'OK' if created else '..'}] Üniversite Admin: {email}  ({dept.name})")

            # 2 students  (grade 3 and grade 2)
            student_defs = [
                ("Mehmet", "Demir", f"{short}_student1", "3", dept1),
                ("Zeynep", "Arslan", f"{short}_student2", "2", dept2),
            ]
            for fname, lname, uname, grade, dept in student_defs:
                email = f"{uname}@{short}.edu.tr"
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
                print(f"[{'OK' if created else '..'}] Öğrenci: {email}  ({dept.name}, {grade}. sınıf)")

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
            forum_cat_id = await _ensure_forum_category(session, uni.id)

            print(f"\n── İçerik: {uni.name} ──")

            # Build (user, role_key, content_idx, dept, grade_or_None) slots
            user_slots: list[tuple[User, str, int, Department, str | None]] = []

            for i, uname in enumerate([f"{short}_admin1", f"{short}_admin2"]):
                user = (await session.execute(
                    select(User).where(User.email == f"{uname}@{short}.edu.tr")
                )).scalar_one_or_none()
                dept = dept1 if i == 0 else dept2
                if user:
                    user_slots.append((user, "admin", i, dept, None))
                else:
                    print(f"[WARN] Kullanıcı bulunamadı, atlanıyor: {uname}@{short}.edu.tr")

            for i, (uname, grade, dept) in enumerate([
                (f"{short}_student1", "3", dept1),
                (f"{short}_student2", "2", dept2),
            ]):
                user = (await session.execute(
                    select(User).where(User.email == f"{uname}@{short}.edu.tr")
                )).scalar_one_or_none()
                if user:
                    user_slots.append((user, "student", i, dept, grade))
                else:
                    print(f"[WARN] Kullanıcı bulunamadı, atlanıyor: {uname}@{short}.edu.tr")

            for user, role_key, idx, dept, grade in user_slots:
                # ── Forum topic ────────────────────────────────────────
                title, content = _FORUM[short][role_key][idx]
                exists = (await session.execute(
                    select(ForumTopic).where(
                        and_(ForumTopic.title == title, ForumTopic.university_id == uni.id)
                    )
                )).scalars().first()
                if not exists:
                    session.add(ForumTopic(
                        id=_uid(),
                        title=title,
                        content=content,
                        author_id=user.id,
                        university_id=uni.id,
                        category_id=forum_cat_id,
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
                mp = _MARKETPLACE[short][role_key][idx]
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
                ca = _CAREER[short][role_key][idx]
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

                # ── Course schedule (students only) ────────────────────
                if grade is not None:
                    exists = (await session.execute(
                        select(CourseSchedule).where(
                            and_(
                                CourseSchedule.university_id == uni.id,
                                CourseSchedule.department == dept.name,
                                CourseSchedule.class_year == grade,
                                CourseSchedule.semester == SEMESTER,
                                CourseSchedule.academic_year == ACADEMIC_YEAR,
                            )
                        )
                    )).scalars().first()
                    label = f"{dept.name}  {grade}. Sınıf  ({SEMESTER} {ACADEMIC_YEAR})"
                    if not exists:
                        session.add(CourseSchedule(
                            id=_uid(),
                            university_id=uni.id,
                            department=dept.name,
                            class_year=grade,
                            semester=SEMESTER,
                            academic_year=ACADEMIC_YEAR,
                            schedule_data=_schedule_data(dept.name, grade),
                            is_approved=True,
                            created_by=user.id,
                            created_at=now,
                            updated_at=now,
                        ))
                        print(f"[OK] CourseSchedule: {label}")
                    else:
                        print(f"[SKIP] CourseSchedule: {label}")

            # ── Academic calendar (per university) ─────────────────────
            first_admin = (await session.execute(
                select(User).where(User.email == f"{short}_admin1@{short}.edu.tr")
            )).scalar_one_or_none()
            creator_id = first_admin.id if first_admin else None

            for ev in _calendar_events(uni.name, uni.id, creator_id):
                exists = (await session.execute(
                    select(AcademicCalendarEvent).where(
                        and_(
                            AcademicCalendarEvent.title == ev["title"],
                            AcademicCalendarEvent.academic_year == ACADEMIC_YEAR,
                            AcademicCalendarEvent.university_id == uni.id,
                        )
                    )
                )).scalars().first()
                if not exists:
                    session.add(AcademicCalendarEvent(
                        id=_uid(),
                        university_id=ev["university_id"],
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
                    print(f"[OK] AcademicCalendarEvent: {ev['title'][:60]}")
                else:
                    print(f"[SKIP] AcademicCalendarEvent: {ev['title'][:60]}")

        await session.commit()
    print("\n[DONE] İçerik seed edildi.\n")


# ─────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────

async def main() -> None:
    engine = get_engine()
    try:
        await seed_users()
        await seed_content()
    except Exception:
        print("[ERROR] Seed işlemi başarısız.")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
