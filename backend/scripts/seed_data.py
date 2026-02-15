"""
Veritabanı seed script'i (geliştirme için).
- Önce bölümleri (departments) oluşturur.
- Sonra örnek kullanıcıları bu bölümlere bağlayarak oluşturur.
"""

import asyncio
import sys
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone

# Backend path'ini ekle
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_engine, get_session_factory
from src.core.security import hash_password
from src.models.user import User, UserRole
from src.models.department import Department  # ⬅️ Yeni modelimizi ekledik

def _utc_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

async def seed_departments(session: AsyncSession) -> dict:
    """Bölümleri oluştur ve isim->id haritası döndür."""
    print("\nBolumler olusturuluyor...")
    
    dept_names = [
        "Bilgisayar Mühendisliği", 
        "Elektrik-Elektronik Mühendisliği", 
        "Sistem Yönetimi",
        "Yazılım Mühendisliği",
        "Hukuk",
        "Diğer"
    ]
    
    dept_map = {}
    for name in dept_names:
        result = await session.execute(select(Department).where(Department.name == name))
        dept = result.scalar_one_or_none()
        
        if not dept:
            dept = Department(name=name)
            session.add(dept)
            await session.flush() # ID'nin hemen oluşması için
            print(f"   [OK] Bolum eklendi: {name}")
        else:
            print(f"   [SKIP] Bolum mevcut: {name}")
            
        dept_map[name] = dept.id
    
    return dept_map

async def seed_users(session: AsyncSession, dept_map: dict) -> None:
    """Örnek kullanıcılar oluştur."""
    print("\nKullanicilar olusturuluyor...")
    
    users_data = [
        {
            "email": "student1@selcuk.edu.tr",
            "password": "Student123!",
            "role": UserRole.STUDENT,
            "first_name": "Ahmet",
            "last_name": "Yılmaz",
            "dept_name": "Bilgisayar Mühendisliği", # Haritadan ID bulmak için geçici isim
        },
        {
            "email": "student2@selcuk.edu.tr",
            "password": "Student123!",
            "role": UserRole.STUDENT,
            "first_name": "Ayşe",
            "last_name": "Demir",
            "dept_name": "Elektrik-Elektronik Mühendisliği",
        },
        {
            "email": "admin@kampusplus.edu.tr",
            "password": "Admin123!",
            "role": UserRole.ADMIN,
            "first_name": "Admin",
            "last_name": "User",
            "dept_name": "Sistem Yönetimi",
        },
    ]
    
    created_count = 0
    for data in users_data:
        result = await session.execute(select(User).where(User.email == data["email"]))
        if result.scalar_one_or_none():
            print(f"   [SKIP] {data['email']} mevcut")
            continue
        
        # Username ve University mantığı
        email = data["email"]
        username = f"admin_{email.split('@')[0]}" if data["role"] == UserRole.ADMIN else email.split("@")[0]
        university = email.split("@")[1].replace(".edu.tr", "").title()

        user = User(
            id=str(uuid4()),
            email=email,
            password_hash=hash_password(data["password"]),
            first_name=data["first_name"],
            last_name=data["last_name"],
            username=username,
            university=university,
            department_id=dept_map[data["dept_name"]], # ⬅️ Artik ID veriyoruz!
            role=data["role"],
            is_verified=True,
            is_active=True,
            terms_accepted_at=_utc_naive()
        )
        session.add(user)
        created_count += 1
        print(f"   [OK] Olusturuldu ({data['role'].value}): {email}")
    
    await session.commit()
    print(f"[OK] {created_count} yeni kullanici eklendi.")

async def main():
    print("=" * 60)
    print("KAMPUS+ Profesyonel Seed Script'i (ID-Based)")
    print("=" * 60)
    
    try:
        engine = get_engine()
        session_factory = get_session_factory()
        
        async with session_factory() as session:
            # 1. Once bolumleri hallet ve ID'leri al
            dept_map = await seed_departments(session)
            # 2. Sonra kullanicilari bu ID'lere bagla
            await seed_users(session, dept_map)
        
        print("\n[OK] Islem basariyla tamamlandi!")
    except Exception as e:
        print(f"\n[ERROR] Hata: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if sys.platform == 'win32':
        import selectors
        asyncio.run(main(), loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()))
    else:
        asyncio.run(main())