"""Kurumsal hiyerarşi API — University → Faculty → Department.

Endpoints:
  GET /institutions/universities
  GET /institutions/universities/{university_id}/faculties
  GET /institutions/faculties/{faculty_id}/departments
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.database import get_db
from src.models.university import University
from src.models.faculty import Faculty
from src.models.department import Department

router = APIRouter(prefix="/institutions", tags=["Institutions"])


# ── Response Schemas ──────────────────────────────────────────────────────────

class UniversityOut(BaseModel):
    id: str
    name: str
    university_type: str
    city: Optional[str] = None

    model_config = {"from_attributes": True}


class FacultyOut(BaseModel):
    id: str
    name: str
    university_id: str

    model_config = {"from_attributes": True}


class DepartmentOut(BaseModel):
    id: str
    name: str
    faculty_id: str

    model_config = {"from_attributes": True}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/universities", response_model=list[UniversityOut])
async def list_universities(
    city: Optional[str] = Query(None, description="Şehre göre filtrele"),
    session: AsyncSession = Depends(get_db),
):
    """Aktif üniversiteleri listeler. İsteğe bağlı şehre göre filtre uygulanabilir."""
    conditions = [University.is_active.is_(True)]
    if city:
        conditions.append(University.city.ilike(f"%{city}%"))

    stmt = (
        select(University)
        .where(and_(*conditions))
        .order_by(University.name)
    )
    result = await session.execute(stmt)
    return result.scalars().all()


@router.get(
    "/universities/{university_id}/faculties",
    response_model=list[FacultyOut],
)
async def list_faculties(
    university_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Verilen üniversiteye ait aktif fakülteleri listeler."""
    # Üniversite var mı kontrolü
    uni_result = await session.execute(
        select(University).where(University.id == university_id)
    )
    if uni_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Üniversite bulunamadı."}},
        )

    stmt = (
        select(Faculty)
        .where(
            and_(
                Faculty.university_id == university_id,
                Faculty.is_active.is_(True),
            )
        )
        .order_by(Faculty.name)
    )
    result = await session.execute(stmt)
    return result.scalars().all()


@router.get(
    "/faculties/{faculty_id}/departments",
    response_model=list[DepartmentOut],
)
async def list_departments(
    faculty_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Verilen fakülteye ait aktif bölümleri listeler."""
    # Fakülte var mı kontrolü
    fac_result = await session.execute(
        select(Faculty).where(Faculty.id == faculty_id)
    )
    if fac_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Fakülte bulunamadı."}},
        )

    stmt = (
        select(Department)
        .where(
            and_(
                Department.faculty_id == faculty_id,
                Department.is_active.is_(True),
            )
        )
        .order_by(Department.name)
    )
    result = await session.execute(stmt)
    return result.scalars().all()
