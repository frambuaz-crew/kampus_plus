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

    # 2. KGTÜ Akademik Takvim (Tum Yil 2025-2026)
    events = [
        # Güz Dönemi (Fall)
        ("Çift Anadal - Yan Dal Başvuruları (Güz)", "2025-08-11", "2025-08-13", "registration"),
        ("Çift Anadal - Yan Dal Sonuç İlanı (Güz)", "2025-08-20", "2025-08-20", "other"),
        ("YKS ile Yerleştirilen Öğrencilerin Elektronik Kayıtları", "2025-09-01", "2025-09-03", "registration"),
        ("YKS ile Yerleştirilen Öğrencilerin Kayıtları", "2025-09-01", "2025-09-05", "registration"),
        ("Çift Anadal - Yan Dal Kayıtları (Güz)", "2025-09-08", "2025-09-09", "registration"),
        ("Kayıt Yenileme ve Ders Kayıtları (Güz)", "2025-09-08", "2025-09-12", "registration"),
        ("Danışman Onayları (Güz)", "2025-09-08", "2025-09-14", "registration"),
        ("Yabancı Dil Yeterlik Sınavı I-II", "2025-09-08", "2025-09-10", "exam"),
        ("Güz Yarıyılı Dersleri", "2025-09-15", "2025-12-26", "other"),
        ("Ders Ekleme Bırakma (Güz)", "2025-09-29", "2025-10-03", "registration"),
        ("Mazeretli Geç Kayıtlar İçin Son Başvuru (Güz)", "2025-10-10", "2025-10-10", "registration"),
        ("Cumhuriyet Bayramı Tatili", "2025-10-28", "2025-10-29", "holiday"),
        ("Dersten Çekilme İçin Son Gün (Güz)", "2025-10-31", "2025-10-31", "registration"),
        ("Ara Sınavlar (Vizeler - Güz)", "2025-11-08", "2025-11-16", "exam"),
        ("Yılbaşı Tatili", "2026-01-01", "2026-01-01", "holiday"),
        ("Yarıyıl Sonu Sınavları (Finaller - Güz)", "2026-01-05", "2026-01-16", "exam"),
        ("Bütünleme Sınavları (Güz)", "2026-01-24", "2026-01-30", "exam"),

        # Bahar Dönemi (Spring)
        ("Çift Anadal - Yan Dal Başvuruları (Bahar)", "2026-01-26", "2026-01-28", "registration"),
        ("Çift Anadal - Yan Dal Sonuç İlanı (Bahar)", "2026-02-02", "2026-02-02", "other"),
        ("Kayıt Yenileme ve Ders Kayıtları (Bahar)", "2026-02-02", "2026-02-06", "registration"),
        ("Danışman Onayları (Bahar)", "2026-02-02", "2026-02-08", "registration"),
        ("Çift Anadal - Yan Dal Kayıtları (Bahar)", "2026-02-03", "2026-02-04", "registration"),
        ("Bahar Yarıyılı Dersleri", "2026-02-09", "2026-05-22", "other"),
        ("Ders Ekleme Bırakma (Bahar)", "2026-02-23", "2026-02-27", "registration"),
        ("Mazeretli Geç Kayıtlar İçin Son Başvuru (Bahar)", "2026-03-06", "2026-03-06", "registration"),
        ("Ramazan Bayramı Tatili", "2026-03-19", "2026-03-22", "holiday"),
        ("Dersten Çekilme İçin Son Gün (Bahar)", "2026-03-27", "2026-03-27", "registration"),
        ("Ara Sınavlar (Vizeler - Bahar)", "2026-04-04", "2026-04-12", "exam"),
        ("Ulusal Egemenlik ve Çocuk Bayramı Tatili", "2026-04-23", "2026-04-23", "holiday"),
        ("Emek ve Dayanışma Günü Tatili", "2026-05-01", "2026-05-01", "holiday"),
        ("Atatürk'ü Anma, Gençlik ve Spor Bayramı Tatili", "2026-05-19", "2026-05-19", "holiday"),
        ("Bahar Şenliği", "2026-05-21", "2026-05-21", "holiday"),
        ("Kurban Bayramı Tatili", "2026-05-26", "2026-05-30", "holiday"),
        ("Yarıyıl Sonu Sınavları (Finaller - Bahar)", "2026-06-03", "2026-06-14", "exam"),
        ("Bütünleme Sınavları (Bahar)", "2026-06-22", "2026-06-27", "exam"),
        ("Mezuniyet Töreni", "2026-07-03", "2026-07-03", "other"),
        ("Demokrasi Bayramı Tatili", "2026-07-15", "2026-07-15", "holiday"),
        ("Zafer Bayramı Tatili", "2026-08-30", "2026-08-30", "holiday")
    ]

    await session.execute(text("DELETE FROM academic_calendar_events WHERE university = 'Konya Gıda ve Tarım Üniversitesi' AND academic_year = '2025-2026'"))

    for title, start_date, end_date, evt_type in events:
        await session.execute(text('''
            INSERT INTO academic_calendar_events (id, university, academic_year, event_type, title, start_date, end_date, is_approved)
            VALUES (:id, :uni, :ay, :evt, :title, :sd, :ed, :approved)
        '''), {
            "id": str(uuid4()),
            "uni": "Konya Gıda ve Tarım Üniversitesi",
            "ay": "2025-2026",
            "evt": evt_type,
            "title": title,
            "sd": start_date,
            "ed": end_date,
            "approved": 1
        })

    await session.commit()
    print("[OK] KGTÜ 4. Sınıf Ders Programı ve 2025-2026 Akademik Takvimi eklendi!")


async def main():
    session_factory = get_session_factory()
    async with session_factory() as session:
        await seed_manual(session)


if __name__ == "__main__":
    asyncio.run(main())
