"""Ders programı seed scripti — geliştirme / test ortamı için.

Kullanım:
    cd backend
    python scripts/seed_my_schedule.py

Yapılanlar:
    1. Veritabanında student1@selcuk.edu.tr kullanıcısının ID'sini bulur.
    2. course_schedules tablosuna Selçuk Üniversitesi / Bilgisayar Mühendisliği /
       4. Sınıf Bahar dönemi ders programı ekler.
    3. Aynı kayıt zaten varsa günceller (upsert benzeri).

schedule_data formatı (JSON):
    {
        "GünAdı": [
            {
                "ders":      "Ders Adı",
                "saat":      "09:00-10:50",
                "ogretmen":  "Prof. Dr. Adı Soyadı",
                "derslik":   "B-101"
            },
            ...
        ],
        ...
    }
"""

import asyncio
import json
import sys
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone

# Proje kök dizinini sys.path'e ekle (src paketiyle çakışmasın)
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_engine, get_session_factory
from src.models.user import User
from src.models.academic import CourseSchedule


# ------------------------------------------------------------------ #
#  Sabitler
# ------------------------------------------------------------------ #

TARGET_EMAIL    = "student1@selcuk.edu.tr"
UNIVERSITY      = "Selçuk Üniversitesi"
DEPARTMENT      = "Bilgisayar Mühendisliği"
CLASS_YEAR      = "4. Sınıf"
SEMESTER        = "Bahar"
ACADEMIC_YEAR   = "2024-2025"


# ------------------------------------------------------------------ #
#  Ders Programı Verisi
# ------------------------------------------------------------------ #

SCHEDULE_DATA: dict = {
    "Pazartesi": [
        {
            "ders":     "Bitirme Projesi I",
            "saat":     "09:00-10:50",
            "ogretmen": "Prof. Dr. Mehmet Yılmaz",
            "derslik":  "Proje Laboratuvarı B-204"
        },
        {
            "ders":     "Yapay Zeka Uygulamaları",
            "saat":     "13:00-14:50",
            "ogretmen": "Doç. Dr. Ayşe Kara",
            "derslik":  "Amfi A-101"
        },
    ],
    "Salı": [
        {
            "ders":     "Blokzincir Teknolojileri",
            "saat":     "09:00-10:50",
            "ogretmen": "Dr. Öğr. Üyesi Emre Demir",
            "derslik":  "Bilgisayar Lab-3 C-302"
        },
        {
            "ders":     "İş Sağlığı ve Güvenliği",
            "saat":     "11:00-11:50",
            "ogretmen": "Öğr. Gör. Fatma Şahin",
            "derslik":  "B-105"
        },
        {
            "ders":     "Gömülü Sistemler",
            "saat":     "13:00-14:50",
            "ogretmen": "Doç. Dr. Hasan Çelik",
            "derslik":  "Donanım Lab D-110"
        },
    ],
    "Çarşamba": [
        {
            "ders":     "Bitirme Projesi I",
            "saat":     "10:00-11:50",
            "ogretmen": "Prof. Dr. Mehmet Yılmaz",
            "derslik":  "Proje Laboratuvarı B-204"
        },
        {
            "ders":     "Bulut Bilişim ve DevOps",
            "saat":     "14:00-15:50",
            "ogretmen": "Dr. Öğr. Üyesi Okan Arslan",
            "derslik":  "Bilgisayar Lab-1 C-301"
        },
    ],
    "Perşembe": [
        {
            "ders":     "Yapay Zeka Uygulamaları",
            "saat":     "09:00-09:50",
            "ogretmen": "Doç. Dr. Ayşe Kara",
            "derslik":  "Amfi A-101"
        },
        {
            "ders":     "Blokzincir Teknolojileri",
            "saat":     "11:00-11:50",
            "ogretmen": "Dr. Öğr. Üyesi Emre Demir",
            "derslik":  "Bilgisayar Lab-3 C-302"
        },
        {
            "ders":     "Teknik İngilizce",
            "saat":     "13:00-14:50",
            "ogretmen": "Öğr. Gör. Dr. Selin Tok",
            "derslik":  "A-203"
        },
    ],
    "Cuma": [
        {
            "ders":     "Gömülü Sistemler",
            "saat":     "09:00-09:50",
            "ogretmen": "Doç. Dr. Hasan Çelik",
            "derslik":  "Donanım Lab D-110"
        },
        {
            "ders":     "Bulut Bilişim ve DevOps",
            "saat":     "11:00-11:50",
            "ogretmen": "Dr. Öğr. Üyesi Okan Arslan",
            "derslik":  "Bilgisayar Lab-1 C-301"
        },
        {
            "ders":     "Mesleki Etik ve Hukuk",
            "saat":     "14:00-14:50",
            "ogretmen": "Dr. Öğr. Üyesi Zeynep Aydın",
            "derslik":  "B-106"
        },
    ],
}


# ------------------------------------------------------------------ #
#  Yardımcılar
# ------------------------------------------------------------------ #

def _utc_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _print_schedule_summary() -> None:
    """Eklenecek ders programını terminale güzel yazdırır."""
    total_lessons = sum(len(v) for v in SCHEDULE_DATA.values())
    print(f"\n{'='*60}")
    print(f"  Ders Programı Özeti")
    print(f"{'='*60}")
    print(f"  Üniversite  : {UNIVERSITY}")
    print(f"  Bölüm       : {DEPARTMENT}")
    print(f"  Sınıf       : {CLASS_YEAR}")
    print(f"  Dönem       : {SEMESTER} / {ACADEMIC_YEAR}")
    print(f"  Toplam Ders : {total_lessons} ders — {len(SCHEDULE_DATA)} gün")
    print(f"{'='*60}")
    for day, lessons in SCHEDULE_DATA.items():
        print(f"\n  📅 {day}")
        for lesson in lessons:
            print(
                f"     • {lesson['ders']:40s} "
                f"{lesson['saat']:15s} "
                f"{lesson['ogretmen']}"
            )


# ------------------------------------------------------------------ #
#  Ana seed fonksiyonu
# ------------------------------------------------------------------ #

async def seed(session: AsyncSession) -> None:
    # 1. Kullanıcıyı bul ----------------------------------------------- #
    user_stmt = select(User).where(User.email == TARGET_EMAIL)
    user_result = await session.execute(user_stmt)
    user = user_result.scalar_one_or_none()

    if user is None:
        print(f"\n  [HATA] '{TARGET_EMAIL}' e-postasıyla kayıtlı kullanıcı bulunamadı.")
        print("  Önce seed_data.py çalıştırarak kullanıcıları oluştur:")
        print("      python scripts/seed_data.py")
        return

    print(f"\n  [OK] Kullanıcı bulundu → {user.first_name} {user.last_name} (id: {user.id})")

    # 2. Mevcut kaydı kontrol et --------------------------------------- #
    existing_stmt = select(CourseSchedule).where(
        and_(
            CourseSchedule.university == UNIVERSITY,
            CourseSchedule.department == DEPARTMENT,
            CourseSchedule.class_year == CLASS_YEAR,
            CourseSchedule.semester   == SEMESTER,
            CourseSchedule.academic_year == ACADEMIC_YEAR,
        )
    )
    existing_result = await session.execute(existing_stmt)
    existing = existing_result.scalar_one_or_none()

    schedule_json = json.dumps(SCHEDULE_DATA, ensure_ascii=False)

    if existing:
        # Güncelle (upsert)
        existing.schedule_data = schedule_json
        existing.created_by    = user.id
        existing.updated_at    = _utc_naive()
        print("  [GÜNCELLEME] Mevcut ders programı kaydı bulundu, güncellendi.")
    else:
        # Yeni kayıt
        new_schedule = CourseSchedule(
            id=str(uuid4()),
            university=UNIVERSITY,
            department=DEPARTMENT,
            class_year=CLASS_YEAR,
            semester=SEMESTER,
            academic_year=ACADEMIC_YEAR,
            schedule_data=schedule_json,
            created_by=user.id,
            created_at=_utc_naive(),
            updated_at=_utc_naive(),
        )
        session.add(new_schedule)
        print("  [EKLEME] Yeni ders programı kaydı oluşturuldu.")

    await session.commit()
    print("\n  ✅ Ders programı başarıyla veritabanına kaydedildi!")
    print(f"\n  AI asistanına şunları sorabilirsin:")
    print('      "Salı günü ne dersim var?"')
    print('      "Haftalık ders programımı göster."')
    print('      "Perşembe derslerim neler?"')


# ------------------------------------------------------------------ #
#  Giriş noktası
# ------------------------------------------------------------------ #

async def main() -> None:
    _print_schedule_summary()

    print("\n  Veritabanına bağlanılıyor...")
    session_factory = get_session_factory()

    async with session_factory() as session:
        await seed(session)

    # Engine'i kapat
    engine = get_engine()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
