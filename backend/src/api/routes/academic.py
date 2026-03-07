"""Akademik özellikler API routes - Ders Programı ve Akademik Takvim.

Spec: specs/006-academic-features/spec.md

Kişisel akademik bölüm:
- Kullanıcının university ve department bilgisi user profilinden otomatik alınır
- Semester mevcut tarihe göre otomatik belirlenir (güz/bahar)
- class_year ders programı sayfasında dropdown ile seçilir
"""

import json
import logging
from datetime import date, datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import get_current_user, require_admin
from src.models.user import User
from src.models.academic import (
    AcademicCalendarEvent,
    AcademicContribution,
    CourseSchedule,
    ContributionStatus,
    ContributionType,
    EventType,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/academic", tags=["Academic"])


# ============================================================================
# YARDIMCI FONKSİYONLAR — Tarih bazlı dönem tespiti
# ============================================================================

def get_current_semester_info() -> dict:
    """Mevcut tarihe göre dönem ve öğretim yılını belirler.

    Türkiye akademik takvimi:
    - Güz: Eylül (9) – Ocak (1)
    - Bahar: Şubat (2) – Haziran (6)
    - Temmuz–Ağustos: Yaz / geçiş (bir sonraki Güz hazırlığı)
    """
    today = date.today()
    month = today.month
    year = today.year

    if month >= 9:
        semester = "guz"
        academic_year = f"{year}-{year + 1}"
    elif month == 1:
        semester = "guz"
        academic_year = f"{year - 1}-{year}"
    elif 2 <= month <= 6:
        semester = "bahar"
        academic_year = f"{year - 1}-{year}"
    else:
        # Temmuz–Ağustos: bir sonraki Güz
        semester = "guz"
        academic_year = f"{year}-{year + 1}"

    semester_label = "Güz Dönemi" if semester == "guz" else "Bahar Dönemi"
    return {
        "semester": semester,
        "semester_label": semester_label,
        "academic_year": academic_year,
    }


# ============================================================================
# REQUEST / RESPONSE MODELLER
# ============================================================================

class CourseSlot(BaseModel):
    day: str = Field(..., description="Gün: monday/tuesday/wednesday/thursday/friday/saturday")
    start_time: str = Field(..., description="Başlangıç saati: HH:MM formatında")
    end_time: str = Field(..., description="Bitiş saati: HH:MM formatında")


class CourseItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    code: Optional[str] = None
    instructor: Optional[str] = None
    room: Optional[str] = None
    color: Optional[str] = "#6366f1"
    slots: list[CourseSlot] = []


class CourseScheduleResponse(BaseModel):
    id: str
    university: str
    department: str
    class_year: str
    semester: str
    academic_year: str
    courses: list[CourseItem]
    created_at: datetime

    model_config = {"from_attributes": True}


class CalendarEventResponse(BaseModel):
    id: str
    university: str
    academic_year: str
    event_type: str
    title: str
    description: Optional[str]
    start_date: date
    end_date: Optional[date]
    days_until: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ContributionRequest(BaseModel):
    type: str = Field(..., description="course_schedule veya academic_calendar")
    university: str
    department: Optional[str] = None
    class_year: Optional[str] = None
    semester: Optional[str] = None
    academic_year: Optional[str] = None
    manual_data: Optional[dict] = None
    file_url: Optional[str] = None


class ContributionResponse(BaseModel):
    id: str
    type: str
    university: str
    department: Optional[str]
    class_year: Optional[str]
    semester: Optional[str]
    academic_year: Optional[str]
    status: str
    rejection_reason: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class SemesterInfoResponse(BaseModel):
    semester: str
    semester_label: str
    academic_year: str


# Admin için request modeller
class AdminCalendarEventRequest(BaseModel):
    university: str
    academic_year: str
    event_type: str = Field(..., description="exam / registration / holiday / other")
    title: str
    description: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None


class AdminCourseScheduleRequest(BaseModel):
    university: str
    department: str
    class_year: str
    semester: str
    academic_year: str
    courses: list[CourseItem]


class ContributionReviewRequest(BaseModel):
    rejection_reason: Optional[str] = None


# ============================================================================
# YARDIMCI: schedule_data parse
# ============================================================================

def parse_schedule_courses(schedule: CourseSchedule) -> list[CourseItem]:
    """schedule_data JSON string'ini CourseItem listesine çevirir."""
    try:
        data = json.loads(schedule.schedule_data)
        return [CourseItem(**c) for c in data.get("courses", [])]
    except Exception:
        return []


def build_schedule_response(schedule: CourseSchedule) -> CourseScheduleResponse:
    return CourseScheduleResponse(
        id=schedule.id,
        university=schedule.university,
        department=schedule.department,
        class_year=schedule.class_year,
        semester=schedule.semester,
        academic_year=schedule.academic_year,
        courses=parse_schedule_courses(schedule),
        created_at=schedule.created_at,
    )


# ============================================================================
# GENEL ENDPOINT'LER — Semester bilgisi
# ============================================================================

@router.get("/semester-info", response_model=SemesterInfoResponse)
async def get_semester_info():
    """Mevcut tarihe göre aktif dönem bilgisini döndürür."""
    return get_current_semester_info()


# ============================================================================
# AKADEMİK TAKVİM ENDPOINT'LERİ
# ============================================================================

@router.get("/calendar", response_model=list[CalendarEventResponse])
async def get_calendar_events(
    academic_year: Optional[str] = Query(None, description="Öğretim yılı, örn: 2025-2026"),
    event_type: Optional[str] = Query(None, description="exam / registration / holiday / other"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Kullanıcının üniversitesine ait akademik takvim etkinliklerini döndürür.

    Öğretim yılı belirtilmezse aktif dönem otomatik kullanılır.
    """
    semester_info = get_current_semester_info()
    target_year = academic_year or semester_info["academic_year"]

    conditions = [
        AcademicCalendarEvent.university == current_user.university,
        AcademicCalendarEvent.academic_year == target_year,
    ]
    if event_type:
        conditions.append(AcademicCalendarEvent.event_type == event_type)

    stmt = (
        select(AcademicCalendarEvent)
        .where(and_(*conditions))
        .order_by(AcademicCalendarEvent.start_date)
    )
    result = await session.execute(stmt)
    events = result.scalars().all()

    today = date.today()
    response = []
    for ev in events:
        days_until = (ev.start_date - today).days if ev.start_date >= today else None
        response.append(
            CalendarEventResponse(
                id=ev.id,
                university=ev.university,
                academic_year=ev.academic_year,
                event_type=ev.event_type,
                title=ev.title,
                description=ev.description,
                start_date=ev.start_date,
                end_date=ev.end_date,
                days_until=days_until,
                created_at=ev.created_at,
            )
        )
    return response


@router.get("/calendar/upcoming", response_model=list[CalendarEventResponse])
async def get_upcoming_events(
    days: int = Query(30, ge=1, le=90, description="Kaç gün ilerisi gösterilsin"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Yaklaşan akademik takvim etkinliklerini döndürür (varsayılan: 30 gün)."""
    from datetime import timedelta
    today = date.today()
    end_date = today + timedelta(days=days)

    stmt = (
        select(AcademicCalendarEvent)
        .where(
            and_(
                AcademicCalendarEvent.university == current_user.university,
                AcademicCalendarEvent.start_date >= today,
                AcademicCalendarEvent.start_date <= end_date,
            )
        )
        .order_by(AcademicCalendarEvent.start_date)
        .limit(10)
    )
    result = await session.execute(stmt)
    events = result.scalars().all()

    response = []
    for ev in events:
        days_until = (ev.start_date - today).days
        response.append(
            CalendarEventResponse(
                id=ev.id,
                university=ev.university,
                academic_year=ev.academic_year,
                event_type=ev.event_type,
                title=ev.title,
                description=ev.description,
                start_date=ev.start_date,
                end_date=ev.end_date,
                days_until=days_until,
                created_at=ev.created_at,
            )
        )
    return response


# ============================================================================
# DERS PROGRAMI ENDPOINT'LERİ
# ============================================================================

@router.get("/course-schedule", response_model=Optional[CourseScheduleResponse])
async def get_course_schedule(
    class_year: str = Query(..., description="Sınıf: 1, 2, 3, 4, 5"),
    semester: Optional[str] = Query(None, description="Dönem: guz veya bahar"),
    academic_year: Optional[str] = Query(None, description="Öğretim yılı, örn: 2025-2026"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Kullanıcının üniversitesi + bölümü için ders programını döndürür.

    Dönem ve öğretim yılı belirtilmezse aktif dönem otomatik kullanılır.
    Veri yoksa null döner (frontend boş durum gösterir).
    """
    semester_info = get_current_semester_info()
    target_semester = semester or semester_info["semester"]
    target_year = academic_year or semester_info["academic_year"]

    department_name = (
        current_user.department_rel.name if current_user.department_rel else ""
    )

    stmt = select(CourseSchedule).where(
        and_(
            CourseSchedule.university == current_user.university,
            CourseSchedule.department == department_name,
            CourseSchedule.class_year == class_year,
            CourseSchedule.semester == target_semester,
            CourseSchedule.academic_year == target_year,
        )
    )
    result = await session.execute(stmt)
    schedule = result.scalar_one_or_none()

    if not schedule:
        return None

    return build_schedule_response(schedule)


# ============================================================================
# KATKI (CONTRIBUTION) ENDPOINT'LERİ
# ============================================================================

@router.post("/contribute", response_model=ContributionResponse, status_code=status.HTTP_201_CREATED)
async def submit_contribution(
    data: ContributionRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Ders programı veya akademik takvim için katkı gönderir.

    Gönderilen katkı admin onayına düşer (pending durumu).
    """
    if data.type not in (ContributionType.COURSE_SCHEDULE, ContributionType.ACADEMIC_CALENDAR):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "INVALID_TYPE",
                    "message": "Geçersiz katkı tipi. 'course_schedule' veya 'academic_calendar' olmalı.",
                }
            },
        )

    if not data.manual_data and not data.file_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "NO_DATA",
                    "message": "Manuel veri veya dosya URL'si sağlanmalıdır.",
                }
            },
        )

    contribution = AcademicContribution(
        id=str(uuid4()),
        user_id=current_user.id,
        type=data.type,
        university=data.university,
        department=data.department,
        class_year=data.class_year,
        semester=data.semester,
        academic_year=data.academic_year,
        file_url=data.file_url,
        manual_data=json.dumps(data.manual_data) if data.manual_data else None,
        status=ContributionStatus.PENDING,
    )

    session.add(contribution)
    await session.commit()
    await session.refresh(contribution)

    logger.info(f"Yeni katkı gönderildi: {contribution.id} (user: {current_user.id})")
    return contribution


@router.get("/my-contributions", response_model=list[ContributionResponse])
async def get_my_contributions(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Giriş yapan kullanıcının katkılarını listeler."""
    stmt = (
        select(AcademicContribution)
        .where(AcademicContribution.user_id == current_user.id)
        .order_by(AcademicContribution.created_at.desc())
    )
    result = await session.execute(stmt)
    return result.scalars().all()


# ============================================================================
# ADMİN ENDPOINT'LERİ
# ============================================================================

@router.get("/admin/contributions/pending", response_model=list[ContributionResponse])
async def admin_list_pending_contributions(
    contribution_type: Optional[str] = Query(None),
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Onay bekleyen katkıları listeler. (Admin)"""
    conditions = [AcademicContribution.status == ContributionStatus.PENDING]
    if contribution_type:
        conditions.append(AcademicContribution.type == contribution_type)

    stmt = (
        select(AcademicContribution)
        .where(and_(*conditions))
        .order_by(AcademicContribution.created_at)
    )
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post("/admin/contributions/{contribution_id}/approve", response_model=ContributionResponse)
async def admin_approve_contribution(
    contribution_id: str,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Katkıyı onaylar ve ilgili tabloya ekler. (Admin)"""
    stmt = select(AcademicContribution).where(AcademicContribution.id == contribution_id)
    result = await session.execute(stmt)
    contribution = result.scalar_one_or_none()

    if not contribution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Katkı bulunamadı"}},
        )

    if contribution.status != ContributionStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "ALREADY_REVIEWED", "message": "Bu katkı zaten incelendi"}},
        )

    # Onaylandığında gerçek tabloya yaz
    if contribution.type == ContributionType.COURSE_SCHEDULE and contribution.manual_data:
        manual = json.loads(contribution.manual_data)
        semester_info = get_current_semester_info()

        existing = await session.execute(
            select(CourseSchedule).where(
                and_(
                    CourseSchedule.university == contribution.university,
                    CourseSchedule.department == (contribution.department or ""),
                    CourseSchedule.class_year == (contribution.class_year or ""),
                    CourseSchedule.semester == (contribution.semester or semester_info["semester"]),
                    CourseSchedule.academic_year == (contribution.academic_year or semester_info["academic_year"]),
                )
            )
        )
        existing_schedule = existing.scalar_one_or_none()

        if existing_schedule:
            existing_schedule.schedule_data = json.dumps(manual)
            existing_schedule.updated_at = datetime.now()
        else:
            new_schedule = CourseSchedule(
                id=str(uuid4()),
                university=contribution.university,
                department=contribution.department or "",
                class_year=contribution.class_year or "",
                semester=contribution.semester or semester_info["semester"],
                academic_year=contribution.academic_year or semester_info["academic_year"],
                schedule_data=json.dumps(manual),
                created_by=contribution.user_id,
            )
            session.add(new_schedule)

    elif contribution.type == ContributionType.ACADEMIC_CALENDAR and contribution.manual_data:
        manual = json.loads(contribution.manual_data)
        semester_info = get_current_semester_info()
        events_data = manual.get("events", [manual])
        for ev_data in events_data:
            new_event = AcademicCalendarEvent(
                id=str(uuid4()),
                university=contribution.university,
                academic_year=contribution.academic_year or semester_info["academic_year"],
                event_type=ev_data.get("event_type", EventType.OTHER),
                title=ev_data.get("title", "Etkinlik"),
                description=ev_data.get("description"),
                start_date=date.fromisoformat(ev_data["start_date"]) if "start_date" in ev_data else date.today(),
                end_date=date.fromisoformat(ev_data["end_date"]) if ev_data.get("end_date") else None,
                created_by=contribution.user_id,
            )
            session.add(new_event)

    contribution.status = ContributionStatus.APPROVED
    contribution.reviewed_by = admin.id
    contribution.reviewed_at = datetime.now()

    await session.commit()
    await session.refresh(contribution)
    logger.info(f"Katkı onaylandı: {contribution_id} (admin: {admin.id})")
    return contribution


@router.post("/admin/contributions/{contribution_id}/reject", response_model=ContributionResponse)
async def admin_reject_contribution(
    contribution_id: str,
    data: ContributionReviewRequest,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Katkıyı reddeder. (Admin)"""
    stmt = select(AcademicContribution).where(AcademicContribution.id == contribution_id)
    result = await session.execute(stmt)
    contribution = result.scalar_one_or_none()

    if not contribution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Katkı bulunamadı"}},
        )

    if contribution.status != ContributionStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "ALREADY_REVIEWED", "message": "Bu katkı zaten incelendi"}},
        )

    contribution.status = ContributionStatus.REJECTED
    contribution.rejection_reason = data.rejection_reason
    contribution.reviewed_by = admin.id
    contribution.reviewed_at = datetime.now()

    await session.commit()
    await session.refresh(contribution)
    logger.info(f"Katkı reddedildi: {contribution_id} (admin: {admin.id})")
    return contribution


@router.post("/admin/calendar", response_model=CalendarEventResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_calendar_event(
    data: AdminCalendarEventRequest,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Akademik takvim etkinliği oluşturur. (Admin)"""
    if data.event_type not in [e.value for e in EventType]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_EVENT_TYPE", "message": "Geçersiz etkinlik tipi"}},
        )

    event = AcademicCalendarEvent(
        id=str(uuid4()),
        university=data.university,
        academic_year=data.academic_year,
        event_type=data.event_type,
        title=data.title,
        description=data.description,
        start_date=data.start_date,
        end_date=data.end_date,
        created_by=admin.id,
    )
    session.add(event)
    await session.commit()
    await session.refresh(event)

    today = date.today()
    days_until = (event.start_date - today).days if event.start_date >= today else None
    return CalendarEventResponse(
        id=event.id,
        university=event.university,
        academic_year=event.academic_year,
        event_type=event.event_type,
        title=event.title,
        description=event.description,
        start_date=event.start_date,
        end_date=event.end_date,
        days_until=days_until,
        created_at=event.created_at,
    )


@router.delete("/admin/calendar/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_calendar_event(
    event_id: str,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Akademik takvim etkinliğini siler. (Admin)"""
    stmt = select(AcademicCalendarEvent).where(AcademicCalendarEvent.id == event_id)
    result = await session.execute(stmt)
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Etkinlik bulunamadı"}},
        )

    await session.delete(event)
    await session.commit()


@router.post("/admin/course-schedule", response_model=CourseScheduleResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_course_schedule(
    data: AdminCourseScheduleRequest,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Ders programı oluşturur veya günceller. (Admin — unique constraint'e göre upsert)"""
    # Varsa güncelle, yoksa oluştur
    stmt = select(CourseSchedule).where(
        and_(
            CourseSchedule.university == data.university,
            CourseSchedule.department == data.department,
            CourseSchedule.class_year == data.class_year,
            CourseSchedule.semester == data.semester,
            CourseSchedule.academic_year == data.academic_year,
        )
    )
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()

    schedule_data = json.dumps({"courses": [c.model_dump() for c in data.courses]})

    if existing:
        existing.schedule_data = schedule_data
        existing.updated_at = datetime.now()
        await session.commit()
        await session.refresh(existing)
        return build_schedule_response(existing)

    new_schedule = CourseSchedule(
        id=str(uuid4()),
        university=data.university,
        department=data.department,
        class_year=data.class_year,
        semester=data.semester,
        academic_year=data.academic_year,
        schedule_data=schedule_data,
        created_by=admin.id,
    )
    session.add(new_schedule)
    await session.commit()
    await session.refresh(new_schedule)
    return build_schedule_response(new_schedule)


@router.delete("/admin/course-schedule/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_course_schedule(
    schedule_id: str,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Ders programını siler. (Admin)"""
    stmt = select(CourseSchedule).where(CourseSchedule.id == schedule_id)
    result = await session.execute(stmt)
    schedule = result.scalar_one_or_none()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Ders programı bulunamadı"}},
        )

    await session.delete(schedule)
    await session.commit()
