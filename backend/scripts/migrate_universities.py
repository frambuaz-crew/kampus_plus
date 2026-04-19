"""Parallel Migration: university string -> university_id FK

Adımlar:
  1. users, course_schedules, academic_calendar_events tablolarına
     university_id VARCHAR(36) kolonu ekle (IF NOT EXISTS).
  2. Her tablodaki benzersiz university string değerlerini topla.
  3. Her isim için universities tablosunda eşleşme ara (LOWER karşılaştırma).
     Bulunamazsa yeni kayıt oluştur.
  4. university_id kolonlarını güncelle.

Çalıştırma (backend/ dizininden):
    python scripts/migrate_universities.py
"""

import asyncio
import sys
from pathlib import Path
from uuid import uuid4

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text

from src.core.database import get_session_factory

TABLES = [
    ("users", "university"),
    ("course_schedules", "university"),
    ("academic_calendar_events", "university"),
]


async def _column_exists(session, table: str, column: str) -> bool:
    """PRAGMA table_info ile kolonu kontrol eder (SQLite + PostgreSQL uyumlu)."""
    try:
        result = await session.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = :t AND column_name = :c"
        ), {"t": table, "c": column})
        return result.scalar_one_or_none() is not None
    except Exception:
        # SQLite: PRAGMA ile dene
        result = await session.execute(text(f"PRAGMA table_info({table})"))
        return any(row[1] == column for row in result)


async def add_columns(session) -> None:
    """university_id kolonlarını tablolara ekle (idempotent, SQLite + PostgreSQL)."""
    for table, _ in TABLES:
        exists = await _column_exists(session, table, "university_id")
        if not exists:
            await session.execute(text(
                f"ALTER TABLE {table} ADD COLUMN university_id VARCHAR(36) "
                f"REFERENCES universities(id)"
            ))
            print(f"  [ADD]   {table}.university_id kolonu eklendi.")
        else:
            print(f"  [SKIP]  {table}.university_id zaten var.")
    await session.commit()
    print("[STEP 1] Kolonlar kontrol edildi.")


async def collect_unique_names(session) -> set[str]:
    """3 tablodan benzersiz university string değerlerini toplar."""
    names: set[str] = set()
    for table, col in TABLES:
        result = await session.execute(text(
            f"SELECT DISTINCT TRIM({col}) FROM {table} "
            f"WHERE {col} IS NOT NULL AND TRIM({col}) <> ''"
        ))
        for row in result:
            names.add(row[0])
    print(f"[STEP 2] Toplam {len(names)} benzersiz üniversite adı bulundu.")
    return names


async def ensure_universities(session, names: set[str]) -> dict[str, str]:
    """
    Her isim için universities tablosunda kayıt ara, yoksa oluştur.
    Döndürür: {university_name: university_id}
    """
    name_to_id: dict[str, str] = {}

    for name in sorted(names):
        result = await session.execute(
            text("SELECT id FROM universities WHERE LOWER(name) = LOWER(:name) LIMIT 1"),
            {"name": name},
        )
        row = result.one_or_none()
        if row:
            name_to_id[name] = row[0]
            print(f"  [FOUND]   '{name}' -> {row[0]}")
        else:
            new_id = str(uuid4())
            await session.execute(text("""
                INSERT INTO universities (id, name, university_type, is_active, created_at, updated_at)
                VALUES (:id, :name, 'diger', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """), {"id": new_id, "name": name})
            name_to_id[name] = new_id
            print(f"  [CREATED] '{name}' -> {new_id}")

    await session.commit()
    print(f"[STEP 3] {len(name_to_id)} üniversite işlendi.")
    return name_to_id


async def backfill_university_ids(session, name_to_id: dict[str, str]) -> None:
    """university_id kolonlarını mevcut university string değerine göre doldur."""
    total = 0
    for table, col in TABLES:
        for name, uid in name_to_id.items():
            result = await session.execute(text(f"""
                UPDATE {table}
                SET university_id = :uid
                WHERE TRIM({col}) = :name
                  AND university_id IS NULL
            """), {"uid": uid, "name": name})
            rows = result.rowcount or 0
            if rows:
                print(f"  [UPDATE] {table}: '{name}' -> {rows} satır güncellendi")
                total += rows

    await session.commit()
    print(f"[STEP 4] Toplam {total} satır güncellendi.")


async def main() -> None:
    session_factory = get_session_factory()
    async with session_factory() as session:
        await add_columns(session)
        names = await collect_unique_names(session)
        if not names:
            print("Güncellenecek university değeri bulunamadı. Çıkılıyor.")
            return
        name_to_id = await ensure_universities(session, names)
        await backfill_university_ids(session, name_to_id)

    print("\n[DONE] Migration basariyla tamamlandi.")


if __name__ == "__main__":
    asyncio.run(main())
