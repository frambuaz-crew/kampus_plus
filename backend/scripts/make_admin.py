"""Belirli bir kullanıcıyı admin rolüne yükseltir.

Kullanım:
    python scripts/make_admin.py
"""

import asyncio
import sys
from pathlib import Path

from sqlalchemy import text

# Backend root'u Python path'ine ekle
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.core.database import get_session_factory

TARGET_EMAIL = "emre.kayacan@ogr.gidatarim.edu.tr"


async def main() -> None:
    session_factory = get_session_factory()

    async with session_factory() as session:
        result = await session.execute(
            text("UPDATE users SET role = 'admin' WHERE email = :email"),
            {"email": TARGET_EMAIL},
        )
        await session.commit()

        if result.rowcount and result.rowcount > 0:
            print(f"[OK] {TARGET_EMAIL} kullanicisi admin yapildi.")
        else:
            print(f"[WARN] Kullanici bulunamadi: {TARGET_EMAIL}")


if __name__ == "__main__":
    asyncio.run(main())
