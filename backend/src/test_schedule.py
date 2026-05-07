"""
Standalone test script — verifies get_user_schedule ilike patterns against the DB.

Run from inside the backend container (or venv with DB access):
    python test_schedule.py

Adjust the three FILTER_* constants at the top to match what you expect in the DB.
"""

import asyncio
import json
import sys
import os

# Make sure src/ is importable when the script lives in backend/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from sqlalchemy import select

from src.core.database import get_session_factory
from src.models.academic import CourseSchedule

# ── Adjust these to match the record you expect ──────────────────────────────
FILTER_DEPT     = "%Elektrik-Elektronik%"
FILTER_GRADE    = "2%"
FILTER_SEMESTER = "%bahar%"
# If you want to restrict to a specific university_id, set it here; else None.
FILTER_UNI_ID: str | None = None
# Day key to inspect from the JSON (Turkish name stored in schedule_data).
DAY_KEY = "Salı"
# ─────────────────────────────────────────────────────────────────────────────


async def main() -> None:
    session_factory = get_session_factory()

    async with session_factory() as db:
        # ── Primary query: same patterns used by the tool ────────────────────
        stmt = select(CourseSchedule).where(
            CourseSchedule.department.ilike(FILTER_DEPT),
            CourseSchedule.class_year.ilike(FILTER_GRADE),
            CourseSchedule.semester.ilike(FILTER_SEMESTER),
            CourseSchedule.is_approved.is_(True),
        )
        if FILTER_UNI_ID:
            stmt = stmt.where(CourseSchedule.university_id == FILTER_UNI_ID)

        result = await db.execute(stmt)
        rows = result.scalars().all()

        print(f"\n{'='*60}")
        print(f"  Patterns used:")
        print(f"    department  ILIKE  '{FILTER_DEPT}'")
        print(f"    class_year  ILIKE  '{FILTER_GRADE}'")
        print(f"    semester    ILIKE  '{FILTER_SEMESTER}'")
        if FILTER_UNI_ID:
            print(f"    university_id = '{FILTER_UNI_ID}'")
        print(f"{'='*60}")
        print(f"  Total matched records: {len(rows)}")
        print(f"{'='*60}\n")

        if not rows:
            print("No records matched. Running a broader diagnostic...\n")
            # Dump all approved schedules so you can see what IS in the DB.
            all_stmt = (
                select(
                    CourseSchedule.id,
                    CourseSchedule.university_id,
                    CourseSchedule.department,
                    CourseSchedule.class_year,
                    CourseSchedule.semester,
                    CourseSchedule.academic_year,
                )
                .where(CourseSchedule.is_approved.is_(True))
                .order_by(CourseSchedule.created_at.desc())
                .limit(10)
            )
            all_result = await db.execute(all_stmt)
            all_rows = all_result.all()
            if all_rows:
                print(f"  All approved schedules in DB (up to 10):")
                for r in all_rows:
                    print(
                        f"  id={r[0]}  uni={r[1]}  "
                        f"dept={r[2]!r}  year={r[3]!r}  "
                        f"sem={r[4]!r}  acad={r[5]!r}"
                    )
            else:
                print("  !! No approved schedules exist in the database at all.")
            return

        for i, row in enumerate(rows, 1):
            print(f"── Record {i} {'─'*48}")
            print(f"  id           : {row.id}")
            print(f"  university_id: {row.university_id}")
            print(f"  department   : {row.department!r}")
            print(f"  class_year   : {row.class_year!r}")
            print(f"  semester     : {row.semester!r}")
            print(f"  academic_year: {row.academic_year!r}")
            print(f"  is_approved  : {row.is_approved}")

            # Parse schedule_data JSON
            try:
                data = json.loads(row.schedule_data) if isinstance(row.schedule_data, str) else row.schedule_data
            except (json.JSONDecodeError, TypeError) as exc:
                print(f"  !! schedule_data parse error: {exc}")
                continue

            top_keys = list(data.keys()) if isinstance(data, dict) else type(data).__name__
            print(f"  schedule_data top-level keys: {top_keys}")

            # Try the requested day key
            day_data = data.get(DAY_KEY) if isinstance(data, dict) else None
            if day_data is not None:
                print(f"\n  [{DAY_KEY}] lessons ({len(day_data)} entries):")
                for lesson in day_data:
                    print(f"    {lesson}")
            else:
                # New format: {"courses": [...]}
                if isinstance(data, dict) and "courses" in data:
                    print(f"\n  New course-slot format detected.")
                    day_map = {
                        "Pazartesi": "monday", "Salı": "tuesday",
                        "Çarşamba": "wednesday", "Perşembe": "thursday", "Cuma": "friday",
                    }
                    target_en = day_map.get(DAY_KEY)
                    matched = [
                        (c.get("name"), s)
                        for c in data["courses"]
                        for s in (c.get("slots") or [])
                        if (s.get("day") or "").lower() == target_en
                    ]
                    if matched:
                        print(f"  [{DAY_KEY} / {target_en}] lessons:")
                        for name, slot in matched:
                            print(f"    {name!r}  {slot.get('start_time')}–{slot.get('end_time')}")
                    else:
                        print(f"  No lessons found for '{DAY_KEY}' in slot data.")
                else:
                    print(f"  Key '{DAY_KEY}' not found in schedule_data.")

        print(f"\n{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(main())
