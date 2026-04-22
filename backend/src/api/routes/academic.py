"""Akademik özellikler API routes - Ders Programı ve Akademik Takvim.

Spec: specs/006-academic-features/spec.md

Kişisel akademik bölüm:
- Kullanıcının university ve department bilgisi user profilinden otomatik alınır
- Semester mevcut tarihe göre otomatik belirlenir (güz/bahar)
- class_year ders programı sayfasında dropdown ile seçilir
"""

import io
import json
import logging
import re
from datetime import date, datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import delete, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.core.dependencies import get_current_user, require_admin, require_role
from src.models.user import User, UserRole
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
    is_approved: bool = False
    courses: list[CourseItem]
    created_at: datetime

    model_config = {"from_attributes": True}


class CalendarEventResponse(BaseModel):
    id: str
    university: str
    academic_year: str
    is_approved: bool = True
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
    university_id: Optional[str] = None
    academic_year: str
    event_type: str = Field(..., description="exam / registration / holiday / other")
    title: str
    description: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None


class AdminCourseScheduleRequest(BaseModel):
    university_id: Optional[str] = None
    department: str
    class_year: str
    semester: str
    academic_year: str
    courses: list[CourseItem]


class AdminCalendarEventUpdateRequest(BaseModel):
    title: Optional[str] = None
    event_type: Optional[str] = Field(default=None, description="exam / registration / holiday / other")
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    description: Optional[str] = None


# ============================================================================
# YARDIMCI: schedule_data parse
# ============================================================================

# Türkçe gün adları → İngilizce (frontend DAY_ORDER ile eşleşmeli)
_DAY_MAP: dict[str, str] = {
    "pazartesi": "monday",
    "salı":      "tuesday",
    "çarşamba":  "wednesday",
    "perşembe":  "thursday",
    "cuma":      "friday",
    "cumartesi": "saturday",
    "pazar":     "sunday",
}


def _parse_time_range(saat: str) -> tuple[str, str]:
    """'09:00-10:50' veya '09:00–10:50' formatını ('09:00', '10:50') olarak ayırır."""
    for sep in ("-", "–", "—"):
        if sep in saat:
            parts = saat.split(sep, 1)
            return parts[0].strip(), parts[1].strip()
    return saat.strip(), saat.strip()


def parse_schedule_courses(schedule: CourseSchedule) -> list[CourseItem]:
    """schedule_data JSON string'ini CourseItem listesine çevirir.

    İki formatı destekler:
    - Yeni format: {"courses": [{id, name, code, instructor, room, slots: [{day, start_time, end_time}]}]}
    - Eski format: {"Pazartesi": [{"ders": "...", "saat": "HH:MM-HH:MM", "ogretmen": "...", "derslik": "..."}]}
    """
    try:
        data = json.loads(schedule.schedule_data)

        # ── Yeni format ─────────────────────────────────────────────────
        if "courses" in data and isinstance(data["courses"], list):
            return [CourseItem(**c) for c in data["courses"]]

        # ── Eski format (Türkçe gün adı keyli dict) ─────────────────────
        courses_by_name: dict[str, CourseItem] = {}
        for day_tr, lessons in data.items():
            if not isinstance(lessons, list):
                continue
            day_en = _DAY_MAP.get(day_tr.strip().lower(), day_tr.strip().lower())
            for lesson in lessons:
                name = lesson.get("ders", "").strip()
                if not name:
                    continue
                saat = lesson.get("saat", "")
                start_time, end_time = _parse_time_range(saat)
                slot = CourseSlot(day=day_en, start_time=start_time, end_time=end_time)

                if name in courses_by_name:
                    # Aynı ders başka bir günde de varsa slot ekle
                    courses_by_name[name].slots.append(slot)
                else:
                    courses_by_name[name] = CourseItem(
                        id=str(uuid4()),
                        name=name,
                        instructor=lesson.get("ogretmen") or None,
                        room=lesson.get("derslik") or None,
                        slots=[slot],
                    )

        return list(courses_by_name.values())
    except Exception:
        logger.exception("parse_schedule_courses hatası. schedule_id=%s", schedule.id)
        return []


def build_schedule_response(schedule: CourseSchedule) -> CourseScheduleResponse:
    return CourseScheduleResponse(
        id=schedule.id,
        university=schedule.university_id or "",
        department=schedule.department,
        class_year=schedule.class_year,
        semester=schedule.semester,
        academic_year=schedule.academic_year,
        is_approved=schedule.is_approved,
        courses=parse_schedule_courses(schedule),
        created_at=schedule.created_at,
    )


# ============================================================================
# ADMİN — ÜNİVERSİTE İZOLASYON YARDIMCILARI
# ============================================================================

def _check_university_access(user: User) -> None:
    """UNIVERSITY_ADMIN rolündeki kullanıcının university_id'sini doğrular."""
    if not user.university_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "NO_UNIVERSITY", "message": "Üniversite bilginiz tanımlı değil, işlem yapamazsınız."}},
        )


def _assert_owns_resource(user: User, resource_university_id: Optional[str]) -> None:
    """UNIVERSITY_ADMIN'in sadece kendi üniversite kaynaklarında işlem yaptığını doğrular."""
    if user.role == UserRole.UNIVERSITY_ADMIN:
        _check_university_access(user)
        if resource_university_id != user.university_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": {"code": "FORBIDDEN", "message": "Sadece kendi üniversitenize ait verilerde işlem yapabilirsiniz."}},
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
    """Onaylı akademik takvim etkinliklerini döndürür.

    Kullanıcının kendi üniversitesi (university_id) üzerinden izole çalışır.
    Öğretim yılı belirtilmezse aktif dönem otomatik kullanılır.
    """
    if not current_user.university_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "NO_UNIVERSITY", "message": "Üniversite bilginiz tanımlı değil."}},
        )

    semester_info = get_current_semester_info()
    target_year = academic_year or semester_info["academic_year"]

    conditions = [
        AcademicCalendarEvent.university_id == current_user.university_id,
        AcademicCalendarEvent.academic_year == target_year,
        AcademicCalendarEvent.is_approved.is_(True),
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
                university=current_user.university,
                academic_year=ev.academic_year,
                is_approved=ev.is_approved,
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

    if not current_user.university_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "NO_UNIVERSITY", "message": "Üniversite bilginiz tanımlı değil."}},
        )

    today = date.today()
    end_date = today + timedelta(days=days)

    stmt = (
        select(AcademicCalendarEvent)
        .where(
            and_(
                AcademicCalendarEvent.university_id == current_user.university_id,
                AcademicCalendarEvent.is_approved.is_(True),
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
                university=current_user.university,
                academic_year=ev.academic_year,
                is_approved=ev.is_approved,
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
    department: Optional[str] = Query(None, description="Bölüm adı; belirtilmezse kullanıcının bölümü kullanılır"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """İstenen üniversite + bölüm + sınıf için onaylı ders programını döndürür.

    Üniversite izolasyonu university_id ile yapılır.
    Bölüm belirtilmezse kullanıcının profil bilgisi kullanılır.
    Dönem ve öğretim yılı belirtilmezse aktif dönem otomatik kullanılır.
    Veri yoksa null döner (frontend boş durum gösterir).
    """
    if not current_user.university_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "NO_UNIVERSITY", "message": "Üniversite bilginiz tanımlı değil."}},
        )

    semester_info = get_current_semester_info()
    target_semester = semester or semester_info["semester"]
    target_year = academic_year or semester_info["academic_year"]
    target_department = department or (
        current_user.department_rel.name if current_user.department_rel else ""
    )

    stmt = select(CourseSchedule).where(
        and_(
            CourseSchedule.university_id == current_user.university_id,
            CourseSchedule.department.ilike(target_department),
            CourseSchedule.class_year.ilike(f"{class_year}%"),
            CourseSchedule.semester.ilike(target_semester),
            CourseSchedule.academic_year == target_year,
            CourseSchedule.is_approved.is_(True),
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

@router.get("/admin/calendar/pending", response_model=list[CalendarEventResponse])
async def admin_list_pending_calendar_events(
    university_id: Optional[str] = Query(None, description="Üniversite ID'sine göre filtre"),
    academic_year: Optional[str] = Query(None, description="Öğretim yılına göre filtre"),
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Onay bekleyen akademik takvim etkinliklerini listeler. (Admin)"""
    conditions = [AcademicCalendarEvent.is_approved.is_(False)]
    if admin.role == UserRole.UNIVERSITY_ADMIN:
        _check_university_access(admin)
        conditions.append(AcademicCalendarEvent.university_id == admin.university_id)
    elif university_id:
        conditions.append(AcademicCalendarEvent.university_id == university_id)
    if academic_year:
        conditions.append(AcademicCalendarEvent.academic_year == academic_year)

    stmt = (
        select(AcademicCalendarEvent)
        .where(and_(*conditions))
        .order_by(AcademicCalendarEvent.created_at.asc())
    )
    result = await session.execute(stmt)
    events = result.scalars().all()

    today = date.today()
    return [
        CalendarEventResponse(
            id=ev.id,
            university=ev.university_id or "",
            academic_year=ev.academic_year,
            is_approved=ev.is_approved,
            event_type=ev.event_type,
            title=ev.title,
            description=ev.description,
            start_date=ev.start_date,
            end_date=ev.end_date,
            days_until=(ev.start_date - today).days if ev.start_date >= today else None,
            created_at=ev.created_at,
        )
        for ev in events
    ]


@router.get("/admin/calendar/approved", response_model=list[CalendarEventResponse])
async def admin_list_approved_calendar_events(
    university_id: Optional[str] = Query(None, description="Üniversite ID'sine göre filtre"),
    academic_year: Optional[str] = Query(None, description="Öğretim yılına göre filtre"),
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Onaylanmış akademik takvim etkinliklerini listeler. (Admin)"""
    conditions = [AcademicCalendarEvent.is_approved.is_(True)]
    if admin.role == UserRole.UNIVERSITY_ADMIN:
        _check_university_access(admin)
        conditions.append(AcademicCalendarEvent.university_id == admin.university_id)
    elif university_id:
        conditions.append(AcademicCalendarEvent.university_id == university_id)
    if academic_year:
        conditions.append(AcademicCalendarEvent.academic_year == academic_year)

    stmt = (
        select(AcademicCalendarEvent)
        .where(and_(*conditions))
        .order_by(AcademicCalendarEvent.start_date.asc())
    )
    result = await session.execute(stmt)
    events = result.scalars().all()

    today = date.today()
    return [
        CalendarEventResponse(
            id=ev.id,
            university=ev.university_id or "",
            academic_year=ev.academic_year,
            is_approved=ev.is_approved,
            event_type=ev.event_type,
            title=ev.title,
            description=ev.description,
            start_date=ev.start_date,
            end_date=ev.end_date,
            days_until=(ev.start_date - today).days if ev.start_date >= today else None,
            created_at=ev.created_at,
        )
        for ev in events
    ]


@router.patch("/calendar/{event_id}/approve", response_model=CalendarEventResponse)
async def approve_calendar_event(
    event_id: str,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Bir akademik takvim etkinliğini onaylar. (Sadece Admin)"""
    stmt = select(AcademicCalendarEvent).where(AcademicCalendarEvent.id == event_id)
    result = await session.execute(stmt)
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Takvim etkinliği bulunamadı"}},
        )

    _assert_owns_resource(admin, event.university_id)
    event.is_approved = True
    event.updated_at = datetime.now()
    await session.commit()
    await session.refresh(event)

    today = date.today()
    return CalendarEventResponse(
        id=event.id,
        university=event.university_id or "",
        academic_year=event.academic_year,
        is_approved=event.is_approved,
        event_type=event.event_type,
        title=event.title,
        description=event.description,
        start_date=event.start_date,
        end_date=event.end_date,
        days_until=(event.start_date - today).days if event.start_date >= today else None,
        created_at=event.created_at,
    )


@router.patch("/calendar/{event_id}", response_model=CalendarEventResponse)
async def admin_update_calendar_event(
    event_id: str,
    data: AdminCalendarEventUpdateRequest,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Akademik takvim etkinliği günceller. (Sadece Admin)"""
    stmt = select(AcademicCalendarEvent).where(AcademicCalendarEvent.id == event_id)
    result = await session.execute(stmt)
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Takvim etkinliği bulunamadı"}},
        )

    _assert_owns_resource(admin, event.university_id)
    if data.event_type is not None and data.event_type not in [e.value for e in EventType]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_EVENT_TYPE", "message": "Geçersiz etkinlik tipi"}},
        )

    next_start_date = data.start_date if data.start_date is not None else event.start_date
    next_end_date = data.end_date if data.end_date is not None else event.end_date

    if next_end_date is not None and next_end_date < next_start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "INVALID_DATE_RANGE", "message": "Bitiş tarihi başlangıç tarihinden önce olamaz"}},
        )

    if data.title is not None:
        event.title = data.title.strip() or event.title
    if data.event_type is not None:
        event.event_type = data.event_type
    if data.start_date is not None:
        event.start_date = data.start_date
    if data.end_date is not None:
        event.end_date = data.end_date
    if data.description is not None:
        event.description = data.description or None

    event.updated_at = datetime.now()
    await session.commit()
    await session.refresh(event)

    today = date.today()
    return CalendarEventResponse(
        id=event.id,
        university=event.university_id or "",
        academic_year=event.academic_year,
        is_approved=event.is_approved,
        event_type=event.event_type,
        title=event.title,
        description=event.description,
        start_date=event.start_date,
        end_date=event.end_date,
        days_until=(event.start_date - today).days if event.start_date >= today else None,
        created_at=event.created_at,
    )


@router.delete("/calendar/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_calendar_event(
    event_id: str,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Akademik takvim etkinliğini siler. (Sadece Admin)"""
    stmt = select(AcademicCalendarEvent).where(AcademicCalendarEvent.id == event_id)
    result = await session.execute(stmt)
    event = result.scalar_one_or_none()

    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Takvim etkinliği bulunamadı"}},
        )

    _assert_owns_resource(admin, event.university_id)
    await session.delete(event)
    await session.commit()


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

    if admin.role == UserRole.UNIVERSITY_ADMIN:
        _check_university_access(admin)
        effective_university_id: Optional[str] = admin.university_id
    else:
        effective_university_id = data.university_id

    if not effective_university_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "UNIVERSITY_ID_REQUIRED", "message": "university_id zorunludur."}},
        )

    event = AcademicCalendarEvent(
        id=str(uuid4()),
        university_id=effective_university_id,
        academic_year=data.academic_year,
        event_type=data.event_type,
        is_approved=True,
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
        university=event.university_id or "",
        academic_year=event.academic_year,
        is_approved=event.is_approved,
        event_type=event.event_type,
        title=event.title,
        description=event.description,
        start_date=event.start_date,
        end_date=event.end_date,
        days_until=days_until,
        created_at=event.created_at,
    )


# ============================================================================
# PDF DERS PROGRAMI YÜKLEME — /academic/schedule/upload
# ============================================================================

_MAX_PDF_PAGES  = 10       # Güvenlik limiti — daha büyük PDF'leri reddet
_MAX_PDF_CHARS  = 30_000   # LLM'e gönderilecek maksimum karakter
_PDF_LLM_MODEL  = settings.gemini_model
_PDF_LLM_TIMEOUT = 180     # saniye


def _extract_pdf_text(file_bytes: bytes) -> str:
    """pypdf ile PDF'den düz metin çıkarır."""
    try:
        from pypdf import PdfReader
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "MISSING_DEP", "message": "pypdf kütüphanesi kurulu değil."}},
        )

    reader = PdfReader(io.BytesIO(file_bytes))

    if len(reader.pages) > _MAX_PDF_PAGES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": "PDF_TOO_LARGE",
                    "message": f"PDF en fazla {_MAX_PDF_PAGES} sayfa olabilir.",
                }
            },
        )

    parts: list[str] = []
    for page in reader.pages:
        text = page.extract_text() or ""
        parts.append(text)

    return "\n".join(parts)


_PDF_PARSE_PROMPT = """\
Sen bir üniversite ders programı ayrıştırma asistanısın.
Aşağıdaki metin bir PDF'den çıkarılmıştır. Bu PDF okulun tüm bölümlerinin \
ders programlarını içeren devasa bir belge olabilir.

Görevin: Metinde YALNIZCA "{department}" bölümü ve "{class_year}" sınıfına \
ait ders programını bul ve aşağıdaki JSON formatına dönüştür. \
Diğer tüm bölümleri, diğer sınıfları ve alakasız satırları kesinlikle yoksay.

YALNIZCA aşağıdaki JSON formatında çıktı üret — başka hiçbir açıklama, yorum veya markdown kodu ekleme:

{{
  "courses": [
    {{
      "id": "uuid-1",
      "name": "Ders Adı",
      "code": "CS401",
      "instructor": "Prof. Dr. Ad Soyad",
      "room": "B-101",
      "color": null,
      "slots": [
        {{"day": "monday", "start_time": "09:00", "end_time": "10:50"}},
        {{"day": "wednesday", "start_time": "10:00", "end_time": "11:50"}}
      ]
    }}
  ]
}}

ÇOK ÖNEMLİ KURAL — TABLO SÜTUN SIRASI:
PDF'ten gelen metin bir tablodan çıkarıldığı için dersler SÜTUNLAR (KOLONLAR) halinde okunmuştur.
Genellikle 1. Sütun = Pazartesi, 2. Sütun = Salı, 3. Sütun = Çarşamba, 4. Sütun = Perşembe, 5. Sütun = Cuma'dır.
Dersleri günlere atarken metin içindeki yatay/dikey SÜTUN HİZALAMALARINA ve GÜN KELİMELERİNE KESİNLİKLE dikkat et.
Bir dersin hangi güne ait olduğunu ASLA TAHMIN ETME — yalnızca okuduğun sütun sırasına ve metindeki gün başlıklarına göre yerleştir.
Hangi satırın hangi güne ait olduğundan emin değilsen o dersi listeye EKLEME.

Kurallar:
- Hedef bölüm: "{department}" — yalnızca bu bölümün derslerini al
- Hedef sınıf: "{class_year}" — yalnızca bu sınıfın derslerini al
- Her ders yalnızca bir kez "courses" listesinde yer alır
- Aynı dersin birden fazla günü varsa hepsini o dersin "slots" dizisine ekle
- "day" alanı İngilizce küçük harfle olmalı: monday, tuesday, wednesday, thursday, friday, saturday
- "start_time" ve "end_time" alanları "HH:MM" formatında olmalı (örn: "09:00", "10:50")
- "id" alanı için rastgele kısa bir string yaz (örn: "c1", "c2", "c3" şeklinde sıralı)
- "code" bilgisi bulunamazsa null yaz
- "instructor" bilgisi bulunamazsa null yaz
- "room" bilgisi bulunamazsa null yaz
- "color" her zaman null olsun
- Sadece JSON döndür — kod bloğu, açıklama veya ```json etiketi kullanma

PDF Metni:
---
{text}
---
"""


async def _parse_schedule_with_llm(pdf_text: str, department: str, class_year: str) -> dict:
    """google-genai SDK ile PDF metnini ders programı JSON'una dönüştürür.

    Döndürür:
        {"courses": [{"id": ..., "name": ..., "code": ..., "instructor": ...,
                      "room": ..., "color": null, "slots": [...]}]}
    """
    import asyncio
    from google import genai

    prompt = _PDF_PARSE_PROMPT.format(
        text=pdf_text[:_MAX_PDF_CHARS],
        department=department,
        class_year=class_year,
    )

    try:
        client = genai.Client(api_key=settings.google_api_key)
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=_PDF_LLM_MODEL,
                contents=prompt,
                config=genai.types.GenerateContentConfig(temperature=0.0),
            ),
            timeout=_PDF_LLM_TIMEOUT,
        )
        raw = response.text or ""
        logger.info("PDF ayrıştırma tamamlandı. model=%s chars=%d", _PDF_LLM_MODEL, len(raw))
    except Exception as exc:
        logger.error("LLM ayrıştırma hatası. model=%s hata=%s", _PDF_LLM_MODEL, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"error": {"code": "LLM_ERROR", "message": "Yapay zeka ayrıştırma hatası. Lütfen tekrar deneyin."}},
        ) from exc

    # Markdown sarmalayıcı varsa temizle
    raw = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("LLM JSON parse hatası. raw_snippet=%s", raw[:300])
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "LLM_PARSE_ERROR", "message": "Yapay zeka ayrıştırma hatası. Lütfen tekrar deneyin."}},
        ) from exc

    if not isinstance(parsed, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "LLM_PARSE_ERROR", "message": "Yapay zeka ayrıştırma hatası. Lütfen tekrar deneyin."}},
        )

    return parsed


class ScheduleUploadResponse(BaseModel):
    success: bool
    message: str
    university: str
    department: str
    class_year: str
    semester: str
    academic_year: str
    days_parsed: list[str]
    total_lessons: int


@router.post(
    "/schedule/upload",
    response_model=ScheduleUploadResponse,
    status_code=status.HTTP_200_OK,
    summary="PDF'den ders programı yükle",
    description=(
        "Bir PDF dosyasından ders programı çıkarır, Gemini ile JSON'a dönüştürür "
        "ve course_schedules tablosuna kaydeder (upsert)."
    ),
)
async def upload_schedule_pdf(
    file: UploadFile = File(..., description="Ders programı PDF dosyası"),
    university_id: Optional[str] = Form(None, description="Üniversite ID"),
    department: str = Form(..., description="Bölüm adı"),
    class_year: str = Form(..., description="Sınıf (örn: '3. Sınıf')"),
    semester: str = Form(..., description="Dönem (örn: 'Bahar' veya 'Güz')"),
    academic_year: Optional[str] = Form(None, description="Öğretim yılı (örn: '2024-2025')"),
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> ScheduleUploadResponse:
    """PDF ders programını Gemini ile ayrıştırıp veritabanına kaydeder."""

    # ---- Dosya doğrulama ------------------------------------------ #
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "INVALID_FILE_TYPE", "message": "Yalnızca PDF dosyası kabul edilir."}},
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "EMPTY_FILE", "message": "Dosya boş."}},
        )

    # ---- Akademik yıl varsayılanı ---------------------------------- #
    target_academic_year = academic_year or get_current_semester_info()["academic_year"]

    # ---- UNIVERSITY_ADMIN: üniversiteyi zorla eziştir ------------- #
    effective_university_id = university_id
    if current_user.role == UserRole.UNIVERSITY_ADMIN:
        _check_university_access(current_user)
        effective_university_id = current_user.university_id

    if not effective_university_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "UNIVERSITY_ID_REQUIRED", "message": "university_id zorunludur."}},
        )

    # ---- PDF'den metin çıkar -------------------------------------- #
    logger.info(
        "PDF schedule upload başladı. user=%s university_id=%s department=%s class_year=%s",
        current_user.id, effective_university_id, department, class_year,
    )
    pdf_text = _extract_pdf_text(file_bytes)

    if len(pdf_text.strip()) < 50:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": "PDF_NO_TEXT",
                    "message": (
                        "PDF'den yeterli metin çıkarılamadı. "
                        "Taranan (görüntü) PDF'ler desteklenmez — metin içeren PDF kullan."
                    ),
                }
            },
        )

    # ---- LLM ile JSON'a dönüştür ---------------------------------- #
    schedule_json = await _parse_schedule_with_llm(pdf_text, department, class_year)

    # ---- Özet istatistik ------------------------------------------ #
    courses_list = schedule_json.get("courses", []) if "courses" in schedule_json else []
    total_lessons = len(courses_list)
    all_days: set[str] = set()
    for c in courses_list:
        for s in c.get("slots", []):
            all_days.add(s.get("day", ""))
    day_order = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
    days_parsed = [d for d in day_order if d in all_days]

    # ---- is_approved: admin veya university_admin → True ---------- #
    is_approved_val = current_user.role in (UserRole.ADMIN, UserRole.UNIVERSITY_ADMIN)

    # ---- Onay bekleyen eski taslakları temizle -------------------- #
    # Aynı PDF tekrar yüklendiğinde is_approved=False kayıtlar katlanmasın
    await session.execute(
        delete(CourseSchedule).where(
            and_(
                CourseSchedule.university_id == effective_university_id,
                CourseSchedule.department == department,
                CourseSchedule.class_year == class_year,
                CourseSchedule.semester == semester,
                CourseSchedule.academic_year == target_academic_year,
                CourseSchedule.is_approved.is_(False),
            )
        )
    )
    await session.commit()

    # ---- Veritabanına upsert -------------------------------------- #
    stmt = select(CourseSchedule).where(
        and_(
            CourseSchedule.university_id == effective_university_id,
            CourseSchedule.department == department,
            CourseSchedule.class_year == class_year,
            CourseSchedule.semester == semester,
            CourseSchedule.academic_year == target_academic_year,
        )
    )
    result = await session.execute(stmt)
    existing = result.scalar_one_or_none()

    schedule_data_str = json.dumps(schedule_json, ensure_ascii=False)

    if existing:
        existing.schedule_data = schedule_data_str
        existing.is_approved = is_approved_val
        existing.university_id = effective_university_id
        existing.updated_at = datetime.now(timezone.utc).replace(tzinfo=None)
        action = "güncellendi"
    else:
        new_schedule = CourseSchedule(
            id=str(uuid4()),
            department=department,
            class_year=class_year,
            semester=semester,
            academic_year=target_academic_year,
            schedule_data=schedule_data_str,
            is_approved=is_approved_val,
            university_id=effective_university_id,
            created_by=current_user.id,
            created_at=datetime.now(timezone.utc).replace(tzinfo=None),
            updated_at=datetime.now(timezone.utc).replace(tzinfo=None),
        )
        session.add(new_schedule)
        action = "oluşturuldu"

    await session.commit()
    logger.info(
        "PDF schedule upload tamamlandı. user=%s action=%s is_approved=%s days=%s lessons=%s",
        current_user.id, action, is_approved_val, days_parsed, total_lessons,
    )

    return ScheduleUploadResponse(
        success=True,
        message=f"Ders programı başarıyla {action}. {total_lessons} ders, {len(days_parsed)} gün ayrıştırıldı.",
        university=effective_university_id,
        department=department,
        class_year=class_year,
        semester=semester,
        academic_year=target_academic_year,
        days_parsed=days_parsed,
        total_lessons=total_lessons,
    )


# ============================================================================
# PDF AKADEMİK TAKVİM YÜKLEME — /academic/calendar/upload
# ============================================================================

_CALENDAR_PARSE_PROMPT = """\
Sen bir üniversite akademik takvim ayrıştırma asistanısın.
Aşağıdaki metin bir PDF'den çıkarılmıştır. Bu PDF üniversitenin resmi akademik takvimini içermektedir.

Görevin: Metinde vize, final, ders kayıt/silme, tatil, yarıyıl başlangıç/bitiş, \
bütünleme ve benzeri tüm önemli akademik tarihleri bul ve aşağıdaki JSON formatına dönüştür.

YALNIZCA aşağıdaki JSON formatında çıktı üret — başka hiçbir açıklama, yorum veya markdown kodu ekleme:

{{
  "events": [
    {{
      "event_name": "Vize Sınavları",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "event_type": "exam"
    }}
  ]
}}

Kurallar:
- "event_name": Etkinliğin Türkçe adı (kısa ve açıklayıcı)
- "start_date": Başlangıç tarihi YYYY-MM-DD formatında (örn: "2025-03-10")
- "end_date": Bitiş tarihi YYYY-MM-DD formatında; tek günlük etkinliklerde start_date ile aynı olsun
- "event_type": Şu dört değerden biri:
    * "exam"         → sınav, vize, final, bütünleme
    * "registration" → kayıt, ders ekleme/silme, harç, başvuru
    * "holiday"      → tatil, yarıyıl arası, resmi tatil
    * "other"        → yukarıdakiler dışında kalan tüm akademik etkinlikler
- Tarihleri metinden olduğu gibi al; tahminde bulunma
- Tarih bulunamayan etkinlikleri listeye EKLEME
- Akademik yıl: "{academic_year}" — yalnızca bu yıla ait etkinlikleri al
- Sadece JSON döndür — kod bloğu, açıklama veya ```json etiketi kullanma

PDF Metni:
---
{text}
---
"""


async def _parse_calendar_with_llm(pdf_text: str, academic_year: str) -> dict:
    """google-genai SDK ile PDF metnini akademik takvim JSON'una dönüştürür.

    Döndürür:
        {"events": [{"event_name": ..., "start_date": ..., "end_date": ..., "event_type": ...}]}
    """
    import asyncio
    from google import genai

    prompt = _CALENDAR_PARSE_PROMPT.format(
        text=pdf_text[:_MAX_PDF_CHARS],
        academic_year=academic_year,
    )

    try:
        client = genai.Client(api_key=settings.google_api_key)
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=settings.gemini_model,
                contents=prompt,
                config=genai.types.GenerateContentConfig(temperature=0.0),
            ),
            timeout=_PDF_LLM_TIMEOUT,
        )
        raw = response.text or ""
        logger.info("Takvim ayrıştırma tamamlandı. model=%s chars=%d", settings.gemini_model, len(raw))
    except Exception as exc:
        logger.error("Takvim LLM hatası. model=%s hata=%s", settings.gemini_model, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={"error": {"code": "LLM_ERROR", "message": "Yapay zeka ayrıştırma hatası. Lütfen tekrar deneyin."}},
        ) from exc

    # Markdown sarmalayıcı varsa temizle
    raw = re.sub(r"```(?:json)?\s*", "", raw).strip().rstrip("`").strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.error("Takvim LLM JSON parse hatası. raw_snippet=%s", raw[:300])
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "LLM_PARSE_ERROR", "message": "Yapay zeka ayrıştırma hatası. Lütfen tekrar deneyin."}},
        ) from exc

    if not isinstance(parsed, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "LLM_PARSE_ERROR", "message": "Yapay zeka ayrıştırma hatası. Lütfen tekrar deneyin."}},
        )

    return parsed


class CalendarUploadResponse(BaseModel):
    success: bool
    message: str
    university: str
    academic_year: str
    events_parsed: int


@router.post(
    "/calendar/upload",
    response_model=CalendarUploadResponse,
    status_code=status.HTTP_200_OK,
    summary="PDF'den akademik takvim yükle",
    description=(
        "Bir PDF dosyasından akademik takvim etkinliklerini çıkarır, Gemini ile JSON'a dönüştürür "
        "ve academic_calendar_events tablosuna kaydeder (upsert değil — her yükleme yeni etkinlikler ekler)."
    ),
)
async def upload_calendar_pdf(
    file: UploadFile = File(..., description="Akademik takvim PDF dosyası"),
    university_id: Optional[str] = Form(None, description="Üniversite ID"),
    academic_year: Optional[str] = Form(None, description="Öğretim yılı (örn: '2024-2025')"),
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
) -> CalendarUploadResponse:
    """PDF akademik takvimini Gemini ile ayrıştırıp veritabanına kaydeder."""

    # ---- Dosya doğrulama ------------------------------------------ #
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "INVALID_FILE_TYPE", "message": "Yalnızca PDF dosyası kabul edilir."}},
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": {"code": "EMPTY_FILE", "message": "Dosya boş."}},
        )

    # ---- Akademik yıl varsayılanı ---------------------------------- #
    target_academic_year = academic_year or get_current_semester_info()["academic_year"]

    # ---- UNIVERSITY_ADMIN: üniversiteyi zorla eziştir ------------- #
    effective_university_id = university_id
    if current_user.role == UserRole.UNIVERSITY_ADMIN:
        _check_university_access(current_user)
        effective_university_id = current_user.university_id

    if not effective_university_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "UNIVERSITY_ID_REQUIRED", "message": "university_id zorunludur."}},
        )

    # ---- PDF'den metin çıkar -------------------------------------- #
    logger.info(
        "PDF calendar upload başladı. user=%s university_id=%s academic_year=%s",
        current_user.id, effective_university_id, target_academic_year,
    )
    pdf_text = _extract_pdf_text(file_bytes)

    if len(pdf_text.strip()) < 50:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "error": {
                    "code": "PDF_NO_TEXT",
                    "message": (
                        "PDF'den yeterli metin çıkarılamadı. "
                        "Taranan (görüntü) PDF'ler desteklenmez — metin içeren PDF kullan."
                    ),
                }
            },
        )

    # ---- LLM ile JSON'a dönüştür ---------------------------------- #
    calendar_json = await _parse_calendar_with_llm(pdf_text, target_academic_year)

    # ---- Etkinlikleri kaydet -------------------------------------- #
    events_data: list[dict] = calendar_json.get("events", [])
    saved_count = 0

    # Onay bekleyen eski taslakları temizle — aynı takvim tekrar yüklenince
    # LLM başlıkları ufak farklarla değiştirebileceğinden string eşleşmesi
    # yetersiz kalır; tüm is_approved=False kayıtları sıfırdan yaz
    await session.execute(
        delete(AcademicCalendarEvent).where(
            and_(
                AcademicCalendarEvent.university_id == effective_university_id,
                AcademicCalendarEvent.academic_year == target_academic_year,
                AcademicCalendarEvent.is_approved.is_(False),
            )
        )
    )
    await session.commit()

    for ev_data in events_data:
        event_name = ev_data.get("event_name", "").strip()
        start_date_str = ev_data.get("start_date", "").strip()
        end_date_str = ev_data.get("end_date", "").strip()
        event_type = ev_data.get("event_type", EventType.OTHER)

        if not event_name or not start_date_str:
            continue

        # Geçerli event_type kontrolü
        valid_types = [e.value for e in EventType]
        if event_type not in valid_types:
            event_type = EventType.OTHER

        try:
            start_date_obj = date.fromisoformat(start_date_str)
        except ValueError:
            logger.warning("Geçersiz start_date atlandı: %s", start_date_str)
            continue

        end_date_obj: Optional[date] = None
        if end_date_str and end_date_str != start_date_str:
            try:
                end_date_obj = date.fromisoformat(end_date_str)
            except ValueError:
                end_date_obj = None

        # Duplicate check: onaylı kayıtlarda aynı tarih aralığı + tür varsa atla
        # title karşılaştırması kasıtla yok — LLM her okuyuşta ufak farklılıklar üretir
        dup_conditions = [
            AcademicCalendarEvent.university_id == effective_university_id,
            AcademicCalendarEvent.academic_year == target_academic_year,
            AcademicCalendarEvent.start_date == start_date_obj,
            AcademicCalendarEvent.is_approved.is_(True),
        ]
        if end_date_obj is not None:
            dup_conditions.append(AcademicCalendarEvent.end_date == end_date_obj)
        else:
            dup_conditions.append(AcademicCalendarEvent.end_date.is_(None))
        dup_check = await session.execute(
            select(AcademicCalendarEvent).where(and_(*dup_conditions))
        )
        if dup_check.scalar_one_or_none():
            logger.info("Duplicate etkinlik atlandı: %s / %s", event_name, start_date_str)
            continue

        new_event = AcademicCalendarEvent(
            id=str(uuid4()),
            university_id=effective_university_id,
            academic_year=target_academic_year,
            event_type=event_type,
            is_approved=(current_user.role in (UserRole.ADMIN, UserRole.UNIVERSITY_ADMIN)),
            title=event_name,
            start_date=start_date_obj,
            end_date=end_date_obj,
            created_by=current_user.id,
        )
        session.add(new_event)
        saved_count += 1

    await session.commit()
    logger.info(
        "PDF calendar upload tamamlandı. user=%s events_saved=%d",
        current_user.id, saved_count,
    )

    return CalendarUploadResponse(
        success=True,
        message=f"Akademik takvim başarıyla yüklendi. {saved_count} etkinlik eklendi.",
        university=effective_university_id,
        academic_year=target_academic_year,
        events_parsed=saved_count,
    )


# ============================================================================
# ADMİN — DERS PROGRAMI ENDPOINT'LERİ
# ============================================================================

class AdminScheduleUpdateRequest(BaseModel):
    courses: list[CourseItem]


@router.get("/admin/schedules/pending", response_model=list[CourseScheduleResponse])
async def admin_list_pending_schedules(
    university_id: Optional[str] = Query(None),
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Onay bekleyen ders programlarını listeler. (Admin)"""
    conditions = [CourseSchedule.is_approved.is_(False)]
    if admin.role == UserRole.UNIVERSITY_ADMIN:
        _check_university_access(admin)
        conditions.append(CourseSchedule.university_id == admin.university_id)
    elif university_id:
        conditions.append(CourseSchedule.university_id == university_id)
    stmt = (
        select(CourseSchedule)
        .where(and_(*conditions))
        .order_by(CourseSchedule.created_at.asc())
    )
    result = await session.execute(stmt)
    return [build_schedule_response(s) for s in result.scalars().all()]


@router.get("/admin/schedules/approved", response_model=list[CourseScheduleResponse])
async def admin_list_approved_schedules(
    university_id: Optional[str] = Query(None),
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Onaylı ders programlarını listeler. (Admin)"""
    conditions = [CourseSchedule.is_approved.is_(True)]
    if admin.role == UserRole.UNIVERSITY_ADMIN:
        _check_university_access(admin)
        conditions.append(CourseSchedule.university_id == admin.university_id)
    elif university_id:
        conditions.append(CourseSchedule.university_id == university_id)
    stmt = (
        select(CourseSchedule)
        .where(and_(*conditions))
        .order_by(CourseSchedule.university_id, CourseSchedule.department, CourseSchedule.class_year)
    )
    result = await session.execute(stmt)
    return [build_schedule_response(s) for s in result.scalars().all()]


@router.patch("/admin/schedules/{schedule_id}/approve", response_model=CourseScheduleResponse)
async def admin_approve_schedule(
    schedule_id: str,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Ders programını onaylar. (Admin)"""
    stmt = select(CourseSchedule).where(CourseSchedule.id == schedule_id)
    result = await session.execute(stmt)
    schedule = result.scalar_one_or_none()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Ders programı bulunamadı"}},
        )

    _assert_owns_resource(admin, schedule.university_id)
    schedule.is_approved = True
    schedule.updated_at = datetime.now()
    await session.commit()
    await session.refresh(schedule)
    return build_schedule_response(schedule)


@router.patch("/admin/schedules/{schedule_id}", response_model=CourseScheduleResponse)
async def admin_update_schedule(
    schedule_id: str,
    data: AdminScheduleUpdateRequest,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Ders programı içeriğini günceller. (Admin)"""
    stmt = select(CourseSchedule).where(CourseSchedule.id == schedule_id)
    result = await session.execute(stmt)
    schedule = result.scalar_one_or_none()

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "NOT_FOUND", "message": "Ders programı bulunamadı"}},
        )

    _assert_owns_resource(admin, schedule.university_id)
    schedule.schedule_data = json.dumps(
        {"courses": [c.model_dump() for c in data.courses]}, ensure_ascii=False
    )
    schedule.updated_at = datetime.now()
    await session.commit()
    await session.refresh(schedule)
    return build_schedule_response(schedule)


@router.delete("/admin/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_schedule(
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

    _assert_owns_resource(admin, schedule.university_id)
    await session.delete(schedule)
    await session.commit()
