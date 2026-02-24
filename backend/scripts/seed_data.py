"""
Veritabanı seed script'i (geliştirme için).
- Önce üniversiteleri (universities.json'dan) oluşturur.
- Sonra bölümleri (departments) oluşturur.
- Sonra örnek kullanıcıları oluşturur.
"""

import asyncio
import sys
import json
import os
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
from src.models.department import Department
from src.models.university import University  # ⬅️ Üniversite modelini ekledik

def _utc_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

async def seed_universities(session: AsyncSession) -> None:
    """JSON dosyasından üniversite verilerini yükler."""
    print("\nUniversiteler yukleniyor...")
    
    # JSON dosyasının yolu (backend/data/universities.json)
    json_path = Path(__file__).parent.parent / "data" / "universities.json"
    
    if not json_path.exists():
        print(f"   [SKIP] Seed dosyası bulunamadı: {json_path}")
        return

    with open(json_path, 'r', encoding='utf-8') as f:
        universities_data = json.load(f)

    print(f"   📦 {len(universities_data)} üniversite verisi işleniyor...")
    
    created_count = 0
    for uni_data in universities_data:
        # İsme göre kontrol et
        result = await session.execute(select(University).where(University.name == uni_data['name']))
        if not result.scalar_one_or_none():
            new_uni = University(
                id=str(uuid4()),
                name=uni_data['name'],
                university_type=uni_data['university_type'],
                city=uni_data.get('city'),
                email_domains=uni_data.get('email_domains'),
                is_active=True
            )
            session.add(new_uni)
            created_count += 1
            if created_count % 50 == 0: # Her 50 tanede bir log bas
                print(f"   ... {created_count} üniversite eklendi ...")
    
    print(f"   [OK] {created_count} yeni üniversite eklendi.")

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
            await session.flush()
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
            "dept_name": "Bilgisayar Mühendisliği",
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
            department_id=dept_map[data["dept_name"]],
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
    print("KAMPUS+ Profesyonel Seed Script'i (ID-Based + University Support)")
    print("=" * 60)
    
    try:
        engine = get_engine()
        session_factory = get_session_factory()
        
        async with session_factory() as session:
            # 1. Önce üniversiteleri JSON'dan yükle
            await seed_universities(session)
            # 2. Bölümleri hallet ve ID'leri al
            dept_map = await seed_departments(session)
            # 3. Kullanıcıları bağla
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