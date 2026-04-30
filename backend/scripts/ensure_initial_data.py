"""Idempotent initial data seeding for local onboarding.

This script guarantees:
- Super admin account (admin@abc.com)
- KGTU university admin + student test accounts
- Selcuk student test account

Existing users are only updated for university_id fixes.
"""

import asyncio
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from sqlalchemy import and_, select

# Backend root'u Python path'ine ekle
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.core.database import get_engine, get_session_factory
from src.core.security import hash_password
from src.models.department import Department
from src.models.faculty import Faculty
from src.models.university import University
from src.models.user import User, UserRole


SUPER_ADMIN_EMAIL = "admin@abc.com"
SUPER_ADMIN_PASSWORD = "admin123"
SUPER_ADMIN_FIRST_NAME = "Super"
SUPER_ADMIN_LAST_NAME = "Admin"
SUPER_ADMIN_USERNAME = "admin_abc"
SUPER_ADMIN_UNIVERSITY_NAME = "Konya Gıda ve Tarım Üniversitesi"
SUPER_ADMIN_FACULTY_NAME = "Mühendislik ve Mimarlık Fakültesi"
SUPER_ADMIN_DEPARTMENT_NAME = "Bilgisayar Mühendisliği"

KGTU_UNI_NAME = "Konya Gıda ve Tarım Üniversitesi"
SELCUK_UNI_NAME = "Selçuk Üniversitesi"


@dataclass(frozen=True)
class AccountSeed:
    email: str
    password: str
    role: UserRole
    first_name: str
    last_name: str
    username: str
    university_name: str


ACCOUNT_SEEDS: tuple[AccountSeed, ...] = (
    AccountSeed(
        email=SUPER_ADMIN_EMAIL,
        password=SUPER_ADMIN_PASSWORD,
        role=UserRole.ADMIN,
        first_name=SUPER_ADMIN_FIRST_NAME,
        last_name=SUPER_ADMIN_LAST_NAME,
        username=SUPER_ADMIN_USERNAME,
        university_name=SUPER_ADMIN_UNIVERSITY_NAME,
    ),
    AccountSeed(
        email="kgtu_admin@kgtu.edu.tr",
        password="admin123",
        role=UserRole.UNIVERSITY_ADMIN,
        first_name="KGTU",
        last_name="Admin",
        username="kgtu_admin",
        university_name=KGTU_UNI_NAME,
    ),
    AccountSeed(
        email="kgtu_student@kgtu.edu.tr",
        password="student123",
        role=UserRole.STUDENT,
        first_name="KGTU",
        last_name="Student",
        username="kgtu_student",
        university_name=KGTU_UNI_NAME,
    ),
    AccountSeed(
        email="selcuk_student@selcuk.edu.tr",
        password="student123",
        role=UserRole.STUDENT,
        first_name="Selcuk",
        last_name="Student",
        username="selcuk_student",
        university_name=SELCUK_UNI_NAME,
    ),
)


def _utc_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def _ensure_super_admin_university(session) -> University:
    result = await session.execute(
        select(University).where(University.name == SUPER_ADMIN_UNIVERSITY_NAME)
    )
    university = result.scalar_one_or_none()
    if university:
        return university

    university = University(
        id=str(uuid4()),
        name=SUPER_ADMIN_UNIVERSITY_NAME,
        university_type="devlet",
        city="Konya",
        is_active=True,
    )
    session.add(university)
    await session.flush()
    return university


async def _ensure_super_admin_faculty(session, university_id: str) -> Faculty:
    result = await session.execute(
        select(Faculty).where(
            and_(
                Faculty.name == SUPER_ADMIN_FACULTY_NAME,
                Faculty.university_id == university_id,
            )
        )
    )
    faculty = result.scalar_one_or_none()
    if faculty:
        return faculty

    faculty = Faculty(
        id=str(uuid4()),
        name=SUPER_ADMIN_FACULTY_NAME,
        university_id=university_id,
        is_active=True,
    )
    session.add(faculty)
    await session.flush()
    return faculty


async def _ensure_super_admin_department(session, faculty_id: str) -> Department:
    result = await session.execute(
        select(Department).where(
            and_(
                Department.name == SUPER_ADMIN_DEPARTMENT_NAME,
                Department.faculty_id == faculty_id,
            )
        )
    )
    department = result.scalar_one_or_none()
    if department:
        return department

    department = Department(
        id=str(uuid4()),
        name=SUPER_ADMIN_DEPARTMENT_NAME,
        faculty_id=faculty_id,
        is_active=True,
    )
    session.add(department)
    await session.flush()
    return department


async def _get_university_by_name_required(session, university_name: str) -> University:
    result = await session.execute(
        select(University).where(University.name == university_name)
    )
    university = result.scalar_one_or_none()
    if not university:
        raise RuntimeError(
            f"Universite bulunamadi: {university_name}. "
            "Oncesinde seed_konya_normalized calismis olmali."
        )
    return university


async def _get_university_by_name_ilike_required(session, university_name: str) -> University:
    result = await session.execute(
        select(University).where(University.name.ilike(f"%{university_name}%"))
    )
    university = result.scalar_one_or_none()
    if not university:
        raise RuntimeError(
            f"Universite bulunamadi (ILIKE): {university_name}. "
            "Oncesinde seed_konya_normalized calismis olmali."
        )
    return university


async def _get_any_department_for_university_required(session, university_id: str, university_name: str) -> Department:
    stmt = (
        select(Department)
        .join(Faculty, Department.faculty_id == Faculty.id)
        .where(Faculty.university_id == university_id)
        .order_by(Department.name.asc())
    )
    result = await session.execute(stmt)
    department = result.scalars().first()
    if not department:
        raise RuntimeError(
            f"Universite icin bolum bulunamadi: {university_name}. "
            "Oncesinde seed_konya_normalized calismis olmali."
        )
    return department


async def _build_university_department_map(session) -> dict[str, tuple[str, str]]:
    # 🚀 Artık tüm üniversiteler seed_konya_normalized.py tarafından var
    # Super admin da KGTU'ye atandığı için bu fonksiyonlar kaldırıldı
    
    # Üniversite isimlerinden university_id ve bir department_id bul.
    super_admin_uni = await _get_university_by_name_required(session, SUPER_ADMIN_UNIVERSITY_NAME)
    super_admin_dep = await _get_any_department_for_university_required(session, super_admin_uni.id, SUPER_ADMIN_UNIVERSITY_NAME)

    kgtu_uni = await _get_university_by_name_required(session, KGTU_UNI_NAME)
    kgtu_dep = await _get_any_department_for_university_required(session, kgtu_uni.id, KGTU_UNI_NAME)

    selcuk_uni = await _get_university_by_name_required(session, SELCUK_UNI_NAME)
    selcuk_dep = await _get_any_department_for_university_required(session, selcuk_uni.id, SELCUK_UNI_NAME)

    return {
        SUPER_ADMIN_UNIVERSITY_NAME: (super_admin_uni.id, super_admin_dep.id),
        KGTU_UNI_NAME: (kgtu_uni.id, kgtu_dep.id),
        SELCUK_UNI_NAME: (selcuk_uni.id, selcuk_dep.id),
    }


async def ensure_initial_data() -> None:
    session_factory = get_session_factory()

    async with session_factory() as session:
        uni_dep_map = await _build_university_department_map(session)
        created_count = 0
        skipped_count = 0
        updated_count = 0

        for account in ACCOUNT_SEEDS:
            existing_user_result = await session.execute(
                select(User).where(User.email == account.email)
            )
            existing_user = existing_user_result.scalar_one_or_none()

            if existing_user:
                if account.email == "kgtu_admin@kgtu.edu.tr":
                    kgtu_university = await _get_university_by_name_ilike_required(session, KGTU_UNI_NAME)
                    existing_user.university = kgtu_university.name
                    existing_user.university_id = kgtu_university.id
                    if not existing_user.department_id:
                        _, department_id = uni_dep_map[account.university_name]
                        existing_user.department_id = department_id
                    await session.commit()
                    await session.refresh(existing_user)
                    updated_count += 1
                    print(f"[UPDATE] {account.email} university_id guncellendi.")
                elif account.email == SUPER_ADMIN_EMAIL:
                    university_id, department_id = uni_dep_map[account.university_name]
                    existing_user.university = account.university_name
                    existing_user.university_id = university_id
                    if not existing_user.department_id:
                        existing_user.department_id = department_id
                    updated_count += 1
                    print(f"[UPDATE] {account.email} university_id guncellendi.")
                else:
                    skipped_count += 1
                    print(f"[SKIP] {account.email} zaten mevcut, degisiklik yapilmadi.")
                continue

            if account.email == "kgtu_admin@kgtu.edu.tr":
                kgtu_university = await _get_university_by_name_ilike_required(session, KGTU_UNI_NAME)
                university_id = kgtu_university.id
                university_name = kgtu_university.name
                _, department_id = uni_dep_map[account.university_name]
            else:
                university_id, department_id = uni_dep_map[account.university_name]
                university_name = account.university_name

            user = User(
                id=str(uuid4()),
                email=account.email,
                password_hash=hash_password(account.password),
                first_name=account.first_name,
                last_name=account.last_name,
                username=account.username,
                university=university_name,
                university_id=university_id,
                department_id=department_id,
                role=account.role,
                is_verified=True,
                is_active=True,
                terms_accepted_at=_utc_naive(),
            )
            session.add(user)
            created_count += 1
            print(f"[OK] Olusturuldu: {account.email} ({account.role.value})")

            if account.email == "kgtu_admin@kgtu.edu.tr":
                await session.commit()
                await session.refresh(user)

        await session.commit()
        print(f"[DONE] created={created_count}, updated={updated_count}, skipped={skipped_count}")


async def main() -> None:
    engine = get_engine()
    try:
        await ensure_initial_data()
    except Exception:
        print("[ERROR] Baslangic verileri olusturulamadi.")
        raise
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
