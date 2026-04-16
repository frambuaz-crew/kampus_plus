"""Konya üniversiteleri seed script'i.

Konya'daki 5 ana üniversite, bunlara ait fakülteler ve bölümleri
veritabanına ekler. Idempotent: mevcut kayıtları atlar.

Kullanım:
    cd backend
    python scripts/seed_konya.py
"""

import asyncio
import sys
from pathlib import Path
from uuid import uuid4

# Backend src'yi Python path'ine ekle
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_engine, get_session_factory
from src.models.university import University
from src.models.faculty import Faculty
from src.models.department import Department

# ── Veri tanımları ────────────────────────────────────────────────────────────

SEED_DATA: list[dict] = [
    {
        "name": "Selçuk Üniversitesi",
        "type": "devlet",
        "email_domains": '["selcuk.edu.tr", "ogr.selcuk.edu.tr"]',
        "faculties": [
            {
                "name": "Mühendislik Fakültesi",
                "departments": [
                    "Bilgisayar Mühendisliği",
                    "Yazılım Mühendisliği",
                    "Elektrik-Elektronik Mühendisliği",
                    "Makine Mühendisliği",
                    "İnşaat Mühendisliği",
                    "Endüstri Mühendisliği",
                    "Kimya Mühendisliği",
                    "Metalurji ve Malzeme Mühendisliği",
                ],
            },
            {
                "name": "Tıp Fakültesi",
                "departments": ["Tıp"],
            },
            {
                "name": "Hukuk Fakültesi",
                "departments": ["Hukuk"],
            },
            {
                "name": "İktisadi ve İdari Bilimler Fakültesi",
                "departments": [
                    "İşletme",
                    "İktisat",
                    "Kamu Yönetimi",
                    "Uluslararası İlişkiler",
                ],
            },
            {
                "name": "Fen Fakültesi",
                "departments": [
                    "Matematik",
                    "Fizik",
                    "Kimya",
                    "Biyoloji",
                    "İstatistik",
                ],
            },
            {
                "name": "Eğitim Fakültesi",
                "departments": [
                    "Bilgisayar ve Öğretim Teknolojileri Öğretmenliği",
                    "Matematik Öğretmenliği",
                    "Fen Bilgisi Öğretmenliği",
                    "Türkçe Öğretmenliği",
                    "İngilizce Öğretmenliği",
                ],
            },
            {
                "name": "Mimarlık Fakültesi",
                "departments": [
                    "Mimarlık",
                    "Şehir ve Bölge Planlama",
                    "İç Mimarlık",
                ],
            },
        ],
    },
    {
        "name": "Necmettin Erbakan Üniversitesi",
        "type": "devlet",
        "email_domains": '["erbakan.edu.tr", "ogr.erbakan.edu.tr"]',
        "faculties": [
            {
                "name": "Mühendislik ve Doğa Bilimleri Fakültesi",
                "departments": [
                    "Bilgisayar Mühendisliği",
                    "Yazılım Mühendisliği",
                    "Elektrik-Elektronik Mühendisliği",
                    "Makine Mühendisliği",
                    "İnşaat Mühendisliği",
                    "Biyomedikal Mühendisliği",
                    "Endüstri Mühendisliği",
                ],
            },
            {
                "name": "İlahiyat Fakültesi",
                "departments": ["İlahiyat"],
            },
            {
                "name": "Hukuk Fakültesi",
                "departments": ["Hukuk"],
            },
            {
                "name": "Sosyal ve Beşeri Bilimler Fakültesi",
                "departments": [
                    "Psikoloji",
                    "Sosyoloji",
                    "Tarih",
                    "Coğrafya",
                    "Türk Dili ve Edebiyatı",
                ],
            },
            {
                "name": "Tıp Fakültesi",
                "departments": ["Tıp"],
            },
            {
                "name": "Eğitim Fakültesi",
                "departments": [
                    "Bilgisayar ve Öğretim Teknolojileri Öğretmenliği",
                    "Matematik Öğretmenliği",
                    "Fen Bilgisi Öğretmenliği",
                    "Türkçe Öğretmenliği",
                ],
            },
        ],
    },
    {
        "name": "Konya Teknik Üniversitesi",
        "type": "devlet",
        "email_domains": '["ktun.edu.tr", "ogr.ktun.edu.tr"]',
        "faculties": [
            {
                "name": "Mühendislik ve Doğa Bilimleri Fakültesi",
                "departments": [
                    "Bilgisayar Mühendisliği",
                    "Yazılım Mühendisliği",
                    "Elektrik-Elektronik Mühendisliği",
                    "Makine Mühendisliği",
                    "İnşaat Mühendisliği",
                    "Endüstri Mühendisliği",
                    "Metalurji ve Malzeme Mühendisliği",
                    "Çevre Mühendisliği",
                ],
            },
            {
                "name": "Mimarlık ve Tasarım Fakültesi",
                "departments": [
                    "Mimarlık",
                    "Şehir ve Bölge Planlama",
                    "İç Mimarlık ve Çevre Tasarımı",
                ],
            },
            {
                "name": "İşletme Fakültesi",
                "departments": [
                    "İşletme",
                    "Uluslararası Ticaret ve Lojistik",
                    "Yönetim Bilişim Sistemleri",
                ],
            },
        ],
    },
    {
        "name": "KTO Karatay Üniversitesi",
        "type": "vakıf",
        "email_domains": '["karatay.edu.tr", "ogr.karatay.edu.tr"]',
        "faculties": [
            {
                "name": "Mühendislik ve Doğa Bilimleri Fakültesi",
                "departments": [
                    "Bilgisayar Mühendisliği",
                    "Yazılım Mühendisliği",
                    "Elektrik-Elektronik Mühendisliği",
                    "Makine Mühendisliği",
                    "Endüstri Mühendisliği",
                ],
            },
            {
                "name": "Mimarlık ve Tasarım Fakültesi",
                "departments": [
                    "Mimarlık",
                    "İç Mimarlık ve Çevre Tasarımı",
                    "Grafik Tasarımı",
                ],
            },
            {
                "name": "İktisadi, İdari ve Sosyal Bilimler Fakültesi",
                "departments": [
                    "İşletme",
                    "İktisat",
                    "Uluslararası İlişkiler",
                    "Hukuk",
                ],
            },
            {
                "name": "Sağlık Bilimleri Fakültesi",
                "departments": [
                    "Hemşirelik",
                    "Fizyoterapi ve Rehabilitasyon",
                    "Beslenme ve Diyetetik",
                ],
            },
        ],
    },
    {
        "name": "Konya Gıda ve Tarım Üniversitesi",
        "type": "vakıf",
        "email_domains": '["gidatarim.edu.tr", "ogr.gidatarim.edu.tr"]',
        "faculties": [
            {
                "name": "Mühendislik ve Doğa Bilimleri Fakültesi",
                "departments": [
                    "Gıda Mühendisliği",
                    "Tarım Makineleri ve Teknolojileri Mühendisliği",
                    "Biyosistem Mühendisliği",
                    "Genetik ve Biyomühendislik",
                    "Bilgisayar Mühendisliği",
                ],
            },
            {
                "name": "İşletme ve Yönetim Bilimleri Fakültesi",
                "departments": [
                    "İşletme",
                    "Uluslararası Ticaret ve Lojistik",
                    "Tarım Ekonomisi",
                ],
            },
        ],
    },
]

# ── Yardımcı fonksiyonlar ─────────────────────────────────────────────────────


async def _get_or_create_university(session: AsyncSession, data: dict) -> University:
    result = await session.execute(
        select(University).where(University.name == data["name"])
    )
    uni = result.scalar_one_or_none()
    if uni:
        return uni

    uni = University(
        id=str(uuid4()),
        name=data["name"],
        university_type=data["type"],
        city="Konya",
        email_domains=data.get("email_domains"),
        is_active=True,
    )
    session.add(uni)
    await session.flush()
    print(f"  [+] Üniversite eklendi: {data['name']}")
    return uni


async def _get_or_create_faculty(
    session: AsyncSession, name: str, university_id: str
) -> Faculty:
    result = await session.execute(
        select(Faculty).where(
            and_(Faculty.name == name, Faculty.university_id == university_id)
        )
    )
    fac = result.scalar_one_or_none()
    if fac:
        return fac

    fac = Faculty(
        id=str(uuid4()),
        name=name,
        university_id=university_id,
        is_active=True,
    )
    session.add(fac)
    await session.flush()
    print(f"    [+] Fakülte eklendi: {name}")
    return fac


async def _get_or_create_department(
    session: AsyncSession, name: str, faculty_id: str
) -> Department:
    result = await session.execute(
        select(Department).where(
            and_(Department.name == name, Department.faculty_id == faculty_id)
        )
    )
    dept = result.scalar_one_or_none()
    if dept:
        return dept

    dept = Department(
        id=str(uuid4()),
        name=name,
        faculty_id=faculty_id,
        is_active=True,
    )
    session.add(dept)
    print(f"      [+] Bölüm eklendi: {name}")
    return dept


# ── Ana fonksiyon ─────────────────────────────────────────────────────────────


async def seed(session: AsyncSession) -> None:
    for uni_data in SEED_DATA:
        print(f"\n{uni_data['name']}")
        uni = await _get_or_create_university(session, uni_data)

        for fac_data in uni_data["faculties"]:
            fac = await _get_or_create_faculty(session, fac_data["name"], uni.id)

            for dept_name in fac_data["departments"]:
                await _get_or_create_department(session, dept_name, fac.id)

    await session.commit()
    print("\n[OK] Konya seed tamamlandı.")


async def main() -> None:
    print("=" * 60)
    print("Konya Üniversiteleri Seed Script")
    print("=" * 60)

    engine = get_engine()
    try:
        session_factory = get_session_factory()
        async with session_factory() as session:
            await seed(session)
    except Exception as exc:
        print(f"\n[HATA] {exc}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    if sys.platform == "win32":
        import selectors
        asyncio.run(
            main(),
            loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
        )
    else:
        asyncio.run(main())
