"""Veri temizliği: Veritabanındaki kısa/yanlış üniversite isimlerini tam adıyla günceller.

Kullanım:
    cd backend
    python scripts/fix_university_names.py

Yapılanlar:
    1. users.university = 'Selcuk' (veya benzeri) → 'Selçuk Üniversitesi'
    2. course_schedules.university = 'Selcuk' (veya benzeri) → 'Selçuk Üniversitesi'

Güvenli çalışır — yalnızca eşleşen satırları günceller, diğerlerine dokunmaz.
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_engine, get_session_factory
from src.models.user import User
from src.models.academic import CourseSchedule


# ------------------------------------------------------------------ #
#  Eşleştirme kuralları: (arama deseni (ilike), hedef değer)
# ------------------------------------------------------------------ #

UNIVERSITY_FIXES = [
    # (fragment, canonical_name)
    ("Selcuk",               "Selçuk Üniversitesi"),
    ("Selçuk Üniversite",    "Selçuk Üniversitesi"),   # "Selçuk Üniversitesi" zaten doğru, skip olur
]


async def fix_users(session: AsyncSession) -> int:
    """users.university alanındaki yanlış değerleri düzeltir."""
    total = 0
    for fragment, canonical in UNIVERSITY_FIXES:
        stmt = select(User).where(User.university.ilike(f"%{fragment}%"))
        result = await session.execute(stmt)
        users = result.scalars().all()

        for u in users:
            if u.university == canonical:
                continue  # Zaten doğru
            print(f"  users → id={u.id[:8]}… | '{u.university}' → '{canonical}'")
            u.university = canonical
            total += 1

    return total


async def fix_schedules(session: AsyncSession) -> int:
    """course_schedules.university alanındaki yanlış değerleri düzeltir.

    Eğer canonical isimle aynı (department, class_year, semester, academic_year)
    kombinasyonunda kayıt zaten varsa, bozuk kaydı güncellemek yerine siler —
    böylece UNIQUE constraint ihlali önlenir.
    """
    total = 0
    for fragment, canonical in UNIVERSITY_FIXES:
        stmt = select(CourseSchedule).where(
            CourseSchedule.university.ilike(f"%{fragment}%")
        )
        result = await session.execute(stmt)
        schedules = result.scalars().all()

        for s in schedules:
            if s.university == canonical:
                continue  # Zaten doğru

            # Aynı unique key'e sahip canonical kayıt var mı?
            dup_stmt = select(CourseSchedule).where(
                CourseSchedule.university    == canonical,
                CourseSchedule.department   == s.department,
                CourseSchedule.class_year   == s.class_year,
                CourseSchedule.semester     == s.semester,
                CourseSchedule.academic_year == s.academic_year,
            )
            dup_result = await session.execute(dup_stmt)
            duplicate = dup_result.scalar_one_or_none()

            if duplicate:
                # Canonical kayıt zaten var — bozuk kaydı sil
                print(
                    f"  course_schedules → DUPLICATE SİLİNDİ id={s.id[:8]}… | "
                    f"'{s.university}' (canonical zaten mevcut: {duplicate.id[:8]}…)"
                )
                await session.delete(s)
            else:
                # Canonical kayıt yok — güvenle güncelle
                print(
                    f"  course_schedules → id={s.id[:8]}… | "
                    f"'{s.university}' → '{canonical}'"
                )
                s.university = canonical

            total += 1

    return total


async def main() -> None:
    print("\n" + "=" * 60)
    print("  Üniversite İsmi Veri Temizliği")
    print("=" * 60)

    session_factory = get_session_factory()

    async with session_factory() as session:
        print("\n[1/2] users tablosu taranıyor...")
        user_count = await fix_users(session)
        if user_count == 0:
            print("  — Güncellenecek kayıt bulunamadı.")

        print(f"\n[2/2] course_schedules tablosu taranıyor...")
        schedule_count = await fix_schedules(session)
        if schedule_count == 0:
            print("  — Güncellenecek kayıt bulunamadı.")

        if user_count + schedule_count > 0:
            try:
                await session.commit()
                print(
                    f"\n  ✅ Toplam {user_count + schedule_count} kayıt işlendi ve commit edildi."
                )
            except IntegrityError as exc:
                await session.rollback()
                print(f"\n  ❌ Commit sırasında UNIQUE constraint hatası: {exc}")
                print("     Lütfen veritabanını kontrol edin ve tekrar çalıştırın.")
        else:
            print("\n  ✅ Tüm kayıtlar zaten doğru. İşlem yapılmadı.")

    engine = get_engine()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
