import asyncio
import sys
import json
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from src.core.database import get_session_factory


async def seed_manual(session):
    # 1. KGTÜ 4. Sınıf Bahar Ders Programı
    schedule_data = {
        "Pazartesi": [
            {"ders": "COMP 4202-Practical Data Science", "saat": "09:30-12:30", "ogretmen": "Dr. Öğr. Üyesi Ayşe Gül Özkan", "derslik": "UZEM"}
        ],
        "Salı": [
            {"ders": "COMP 4002 - Automata Theory", "saat": "09:30-12:30", "ogretmen": "Dr. Öğr. Üyesi Ayşe Gül Özkan", "derslik": "UZEM"},
            {"ders": "COMP4244- Microservice Based Software Design", "saat": "13:30-16:30", "ogretmen": "Dr. Öğr. Üyesi Sinan Keskin", "derslik": "MB-307"}
        ],
        "Çarşamba": [
            {"ders": "COMP 4232- Multimedia", "saat": "09:30-12:30", "ogretmen": "Prof. Dr. Reza Hassanpour", "derslik": "MB-215"},
            {"ders": "COMP 4252 - Next Generation Network Systems", "saat": "13:30-16:30", "ogretmen": "Prof. Dr. Kasım Öztoprak", "derslik": "MB-216"}
        ],
        "Perşembe": [
            {"ders": "COMP 4206-Cloud Computing", "saat": "09:30-12:30", "ogretmen": "Prof. Dr. Kasım Öztoprak", "derslik": "MB-216"},
            {"ders": "COMP 4224-Computer Architecture", "saat": "13:30-16:30", "ogretmen": "Prof. Dr. Kasım Öztoprak", "derslik": "MB-216"}
        ],
        "Cuma": [
            {"ders": "COMP 4902 - Graduation Project II", "saat": "Belirtilmemiş", "ogretmen": "Danışman", "derslik": "-"}
        ],
        "Cumartesi": [
            {"ders": "COMP4208-Computer Systems Security", "saat": "20:00-22:00", "ogretmen": "Dr. Öğr. Üyesi Yusuf Kürşat Tuncel", "derslik": "UZEM"}
        ]
    }

    await session.execute(text("DELETE FROM course_schedules WHERE university = 'Konya Gıda ve Tarım Üniversitesi' AND department = 'Bilgisayar Mühendisliği' AND class_year = '4. Sınıf'"))

    await session.execute(text('''
        INSERT INTO course_schedules (id, university, department, class_year, semester, academic_year, schedule_data)
        VALUES (:id, :uni, :dept, :cls, :sem, :ay, :data)
    '''), {
        "id": str(uuid4()),
        "uni": "Konya Gıda ve Tarım Üniversitesi",
        "dept": "Bilgisayar Mühendisliği",
        "cls": "4. Sınıf",
        "sem": "Bahar",
        "ay": "2025-2026",
        "data": json.dumps(schedule_data)
    })

    # 2. KGTÜ Akademik Takvim (Bahar Dönemi 2025-2026)
    events = [
        ("Kayıt Yenileme ve Ders Kayıtları", "2026-02-02", "2026-02-06", "kayit"),
        ("Bahar Yarıyılı Dersleri", "2026-02-09", "2026-05-22", "ders"),
        ("Ara Sınavlar (Vizeler)", "2026-04-04", "2026-04-12", "sinav"),
        ("Bahar Şenliği", "2026-05-21", "2026-05-21", "tatil"),
        ("Yarıyıl Sonu Sınavları (Finaller)", "2026-06-03", "2026-06-14", "sinav"),
        ("Bütünleme Sınavları", "2026-06-22", "2026-06-27", "sinav"),
        ("Mezuniyet Töreni", "2026-07-03", "2026-07-03", "etkinlik")
    ]

    await session.execute(text("DELETE FROM academic_calendar_events WHERE university = 'Konya Gıda ve Tarım Üniversitesi' AND academic_year = '2025-2026'"))

    for title, start_date, end_date, evt_type in events:
        await session.execute(text('''
            INSERT INTO academic_calendar_events (id, university, academic_year, event_type, title, start_date, end_date)
            VALUES (:id, :uni, :ay, :evt, :title, :sd, :ed)
        '''), {
            "id": str(uuid4()),
            "uni": "Konya Gıda ve Tarım Üniversitesi",
            "ay": "2025-2026",
            "evt": evt_type,
            "title": title,
            "sd": start_date,
            "ed": end_date
        })

    await session.commit()
    print("[OK] KGTÜ 4. Sınıf Ders Programı ve 2025-2026 Akademik Takvimi eklendi!")


async def main():
    session_factory = get_session_factory()
    async with session_factory() as session:
        await seed_manual(session)


if __name__ == "__main__":
    asyncio.run(main())
