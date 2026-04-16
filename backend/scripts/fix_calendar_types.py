import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from src.core.database import get_session_factory


TYPE_MAPPING = {
    "exam": "exam",
    "sinav": "exam",
    "sınav": "exam",
    "registration": "registration",
    "kayit": "registration",
    "kayıt": "registration",
    "holiday": "holiday",
    "tatil": "holiday",
    "other": "other",
    "etkinlik": "other",
    "ders": "other",
}


def normalize_event_type(value: str | None) -> str:
    normalized = (value or "").strip().casefold()
    return TYPE_MAPPING.get(normalized, "other")


async def fix_calendar_types(session):
    rows = await session.execute(text("SELECT id, event_type FROM academic_calendar_events"))

    total = 0
    updated = 0

    for row in rows.mappings():
        total += 1
        row_id = row["id"]
        current_type = row["event_type"]
        target_type = normalize_event_type(current_type)

        if current_type != target_type:
            await session.execute(
                text("UPDATE academic_calendar_events SET event_type = :etype WHERE id = :id"),
                {"etype": target_type, "id": row_id},
            )
            updated += 1

    await session.commit()

    stats = await session.execute(
        text(
            """
            SELECT event_type, COUNT(*) AS cnt
            FROM academic_calendar_events
            GROUP BY event_type
            ORDER BY event_type
            """
        )
    )

    print(f"[OK] academic_calendar_events tarandi: {total}")
    print(f"[OK] Guncellenen satir: {updated}")
    print("[OK] Son event_type dagilimi:")
    for item in stats.mappings():
        print(f"  - {item['event_type']}: {item['cnt']}")


async def main():
    session_factory = get_session_factory()
    async with session_factory() as session:
        await fix_calendar_types(session)


if __name__ == "__main__":
    asyncio.run(main())
