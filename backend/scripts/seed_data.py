"""
Veritabanı seed script'i (geliştirme için).

Örnek kullanıcılar oluşturur:
- 2 öğrenci
- 1 admin

Kullanım:
    python scripts/seed_data.py

Gereksinimler:
    - Veritabanı çalışıyor olmalı
    - Alembic migration'ları uygulanmış olmalı
"""

import asyncio
import sys
from pathlib import Path

# Backend path'ini ekle
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime, timezone

def _utc_naive() -> datetime:
    """PostgreSQL TIMESTAMP WITHOUT TIME ZONE ile uyumlu naive UTC."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_engine, get_session_factory
from src.core.security import hash_password
from src.models.user import User, UserRole, RefreshToken
from uuid import uuid4


async def seed_users(session: AsyncSession) -> None:
    """Örnek kullanıcılar oluştur."""
    print("\nKullanicilar olusturuluyor...")
    
    users_data = [
        {
            "email": "student1@selcuk.edu.tr",
            "password": "Student123!",
            "role": UserRole.STUDENT,
            "first_name": "Ahmet",
            "last_name": "Yılmaz",
            "department": "Bilgisayar Mühendisliği",
        },
        {
            "email": "student2@selcuk.edu.tr",
            "password": "Student123!",
            "role": UserRole.STUDENT,
            "first_name": "Ayşe",
            "last_name": "Demir",
            "department": "Elektrik-Elektronik Mühendisliği",
        },
        {
            "email": "admin@kampusplus.edu.tr",  # Admin için platform özel domain
            "password": "Admin123!",
            "role": UserRole.ADMIN,
            "first_name": "Admin",
            "last_name": "User",
            "department": "Sistem Yönetimi",
        },
    ]
    
    created_count = 0
    
    for user_data in users_data:
        # Kullanıcı zaten var mı kontrol et
        result = await session.execute(
            select(User).where(User.email == user_data["email"])
        )
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            print(f"   [SKIP] {user_data['email']} zaten mevcut, atlaniyor")
            continue
        
        password = user_data.pop("password")
        role = user_data.pop("role")
        
        # Username ve university otomatik oluştur
        email = user_data["email"]
        # Admin için özel username (unique constraint için)
        if role == UserRole.ADMIN:
            username = f"admin_{email.split('@')[0]}"
        else:
            username = email.split("@")[0]
        university = email.split("@")[1].replace(".edu.tr", "").replace("ogr.", "").title()
        
        user = User(
            id=str(uuid4()),
            email=email,
            password_hash=hash_password(password),
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
            username=username,
            university=university,
            department=user_data["department"],
            role=role,
            is_verified=True,
            is_active=True,
            terms_accepted_at=_utc_naive(),
            created_at=_utc_naive(),
            updated_at=_utc_naive(),
        )
        session.add(user)
        created_count += 1
        print(f"   [OK] Olusturuldu ({role.value}): {user_data['email']}")
    
    await session.commit()
    print(f"[OK] {created_count} kullanici olusturuldu")


async def main():
    """Ana seed fonksiyonu."""
    print("=" * 60)
    print("KAMPUS+ Veritabani Seed Script'i")
    print("=" * 60)
    
    try:
        engine = get_engine()
        session_factory = get_session_factory()
        
        async with session_factory() as session:
            await seed_users(session)
        
        print("\n" + "=" * 60)
        print("[OK] Veritabani seed islemi tamamlandi!")
        print("=" * 60)
        print("\nOrnek Giris Bilgileri:")
        print("   Ogrenci 1: student1@selcuk.edu.tr / Student123!")
        print("   Ogrenci 2: student2@selcuk.edu.tr / Student123!")
        print("   Admin: admin@kampusplus.edu.tr / Admin123!")
        print("\n")
        
    except Exception as e:
        print(f"\n[ERROR] Seed islemi sirasinda hata: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await engine.dispose()


if __name__ == "__main__":
    # Windows uyumluluğu için SelectorEventLoop kullan
    if sys.platform == 'win32':
        import selectors
        asyncio.run(main(), loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()))
    else:
        asyncio.run(main())
