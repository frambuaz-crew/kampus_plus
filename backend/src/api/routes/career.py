"""Kariyer ilanları API route'ları.

Spec: 008-career-page/spec.md
"""

from datetime import datetime, timedelta
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, field_validator, Field
from sqlalchemy import desc, asc, or_, and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import get_current_user, require_admin
from src.models.career import CareerListing, CareerApplication, CareerReport, CareerMessage
from src.models.messages import Conversation
from src.models.user import User, UserRole

router = APIRouter(prefix="/career", tags=["Career"])

# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class CreatorInfo(BaseModel):
    id: str
    username: str
    full_name: Optional[str] = None
    university: Optional[str] = None
    department: Optional[str] = None
    profile_picture_url: Optional[str] = None

    model_config = {"from_attributes": True}


class CareerListingResponse(BaseModel):
    id: str
    listing_type: str
    title: str
    description: str
    sector: Optional[str] = None
    location: Optional[str] = None
    company_name: Optional[str] = None
    external_link: Optional[str] = None
    salary_range: Optional[str] = None
    required_position: Optional[str] = None
    duration: Optional[str] = None
    payment_type: Optional[str] = None
    status: str
    view_count: int
    application_count: int = 0
    created_at: datetime
    updated_at: datetime
    creator: Optional[CreatorInfo] = None
    posted_by: Optional[str] = None  # creator user_id always included as fallback

    model_config = {"from_attributes": True}


class CreateCareerListingRequest(BaseModel):
    listing_type: str
    title: str
    description: str
    sector: Optional[str] = None
    location: Optional[str] = None
    company_name: Optional[str] = None
    external_link: Optional[str] = None
    salary_range: Optional[str] = None
    required_position: Optional[str] = None
    duration: Optional[str] = None
    payment_type: Optional[str] = None
    visibility: str = Field("public")

    @field_validator("listing_type")
    @classmethod
    def validate_listing_type(cls, v: str) -> str:
        allowed = {"job", "internship", "startup", "project"}
        if v not in allowed:
            raise ValueError(f"listing_type must be one of: {allowed}")
        return v

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        s = (v or "").strip()
        if len(s) < 5 or len(s) > 100:
            raise ValueError("Başlık 5–100 karakter arasında olmalıdır (baş/son boşluk sayılmaz).")
        return s

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        s = (v or "").strip()
        if len(s) < 10 or len(s) > 2000:
            raise ValueError("Açıklama 10–2000 karakter arasında olmalıdır (baş/son boşluk sayılmaz).")
        return s


class ReportRequest(BaseModel):
    reason: str


class ApplyRequest(BaseModel):
    message_text: str


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _listing_to_response(listing: CareerListing, user: Optional[User] = None) -> CareerListingResponse:
    """CareerListing ORM objesini frontend-uyumlu response'a dönüştürür."""
    creator = None
    if user:
        creator = CreatorInfo(
            id=user.id,
            username=user.username,
            full_name=f"{user.first_name} {user.last_name}".strip() or None,
            university=user.university,
            department=getattr(user, "department", None),
            profile_picture_url=user.profile_picture_url,
        )
    elif listing.posted_by_user:
        u = listing.posted_by_user
        creator = CreatorInfo(
            id=u.id,
            username=u.username,
            full_name=f"{u.first_name} {u.last_name}".strip() or None,
            university=u.university,
            department=getattr(u, "department", None),
            profile_picture_url=u.profile_picture_url,
        )

    return CareerListingResponse(
        id=listing.id,
        listing_type=listing.type,
        title=listing.title,
        description=listing.description,
        sector=listing.sector,
        location=listing.location,
        company_name=listing.company_name,
        external_link=listing.external_url,
        salary_range=listing.salary_range,
        required_position=listing.required_position,
        duration=listing.duration,
        payment_type=listing.payment_type,
        status=listing.status,
        view_count=listing.view_count,
        application_count=listing.application_count or 0,
        created_at=listing.created_at,
        updated_at=listing.updated_at,
        creator=creator,
        posted_by=listing.posted_by,
    )


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/admin/listings", response_model=List[CareerListingResponse])
async def admin_get_all_listings(
    listing_type: Optional[str] = Query(None),
    current_user: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db),
):
    """Admin: tüm ilanları durum filtresi olmadan döndürür."""
    stmt = (
        select(CareerListing, User)
        .outerjoin(User, CareerListing.posted_by == User.id)
    )
    if listing_type:
        stmt = stmt.where(CareerListing.type == listing_type)
    stmt = stmt.order_by(desc(CareerListing.created_at))

    result = await session.execute(stmt)
    return [_listing_to_response(listing, user) for listing, user in result.all()]


@router.get("/listings", response_model=List[CareerListingResponse])
async def get_listings(
    listing_type: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: str = Query("newest"),
    scope: Optional[str] = Query(None, description="public veya university"),
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
    university_id: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    # Admins see all universities; others see only their own university's listings.
    is_admin = UserRole(current_user.role) in {UserRole.ADMIN, UserRole.UNIVERSITY_ADMIN}

    stmt = (
        select(CareerListing, User)
        .outerjoin(User, CareerListing.posted_by == User.id)
        .where(CareerListing.status == "active")
    )

    if not is_admin:
        if scope == "university":
            stmt = stmt.where(
                or_(
                    CareerListing.university_id == current_user.university_id,
                    and_(
                        CareerListing.university_id.is_(None),
                        User.university_id == current_user.university_id
                    )
                )
            )
        elif scope == "public":
            stmt = stmt.where(CareerListing.university_id.is_(None))
        else:
            stmt = stmt.where(
                or_(
                    CareerListing.university_id == current_user.university_id,
                    CareerListing.university_id.is_(None)
                )
            )

    if listing_type:
        stmt = stmt.where(CareerListing.type == listing_type)
    if sector:
        stmt = stmt.where(CareerListing.sector == sector)
    if location:
        stmt = stmt.where(CareerListing.location == location)
    if search:
        term = f"%{search}%"
        stmt = stmt.where(
            or_(
                CareerListing.title.ilike(term),
                CareerListing.description.ilike(term),
                CareerListing.company_name.ilike(term),
            )
        )

    if sort == "oldest":
        stmt = stmt.order_by(asc(CareerListing.created_at))
    else:
        stmt = stmt.order_by(desc(CareerListing.created_at))

    offset = (page - 1) * limit
    stmt = stmt.offset(offset).limit(limit)

    result = await session.execute(stmt)
    rows = result.all()

    return [_listing_to_response(listing, user) for listing, user in rows]


@router.get("/listings/{listing_id}", response_model=CareerListingResponse)
async def get_listing(
    listing_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Tekil ilan detayını döndürür ve view_count'u artırır."""
    stmt = (
        select(CareerListing, User)
        .outerjoin(User, CareerListing.posted_by == User.id)
        .where(CareerListing.id == listing_id)
        .where(CareerListing.status == "active")
    )
    result = await session.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="İlan bulunamadı.")

    listing, user = row

    # Kendi ilanını görüntüleyen kişi sayılmasın
    if listing.posted_by != current_user.id:
        listing.view_count = (listing.view_count or 0) + 1
        try:
            await session.commit()
            await session.refresh(listing)
        except Exception:
            await session.rollback()

    return _listing_to_response(listing, user)


@router.post("/listings", response_model=CareerListingResponse, status_code=status.HTTP_201_CREATED)
async def create_listing(
    body: CreateCareerListingRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    is_job_or_internship = body.listing_type in ("job", "internship")
    application_type = "external" if is_job_or_internship else "dm"

    new_listing = CareerListing(
        id=str(uuid4()),
        type=body.listing_type,
        posted_by=current_user.id,
        university_id=None if body.visibility == "public" else current_user.university_id,
        title=body.title,
        description=body.description,
        sector=body.sector,
        location=body.location,
        company_name=body.company_name,
        external_url=body.external_link,
        salary_range=body.salary_range,
        required_position=body.required_position,
        duration=body.duration,
        payment_type=body.payment_type,
        application_type=application_type,
        status="active",
        view_count=0,
        application_count=0,
        expires_at=datetime.now() + timedelta(days=90),
    )

    session.add(new_listing)
    try:
        await session.commit()
        await session.refresh(new_listing)
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"İlan oluşturulamadı: {str(e)}")

    return _listing_to_response(new_listing, current_user)


@router.delete("/listings/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_listing(
    listing_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    stmt = select(CareerListing).where(CareerListing.id == listing_id)
    result = await session.execute(stmt)
    listing = result.scalar_one_or_none()

    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı.")

    is_admin = UserRole(current_user.role) in {UserRole.ADMIN, UserRole.UNIVERSITY_ADMIN}
    if listing.posted_by != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail="Bu ilanı silme yetkiniz yok.")

    listing.status = "deleted"
    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise HTTPException(status_code=500, detail="İlan silinemedi.")

    return None


@router.post("/listings/{listing_id}/report", status_code=status.HTTP_201_CREATED)
async def report_listing(
    listing_id: str,
    body: ReportRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    stmt = select(CareerListing).where(CareerListing.id == listing_id)
    result = await session.execute(stmt)
    listing = result.scalar_one_or_none()

    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı.")

    existing = await session.execute(
        select(CareerReport)
        .where(CareerReport.listing_id == listing_id)
        .where(CareerReport.reporter_user_id == current_user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Bu ilanı zaten raporladınız.")

    report = CareerReport(
        id=str(uuid4()),
        listing_id=listing_id,
        reporter_user_id=current_user.id,
        reason=body.reason,
        status="pending",
    )
    session.add(report)
    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise HTTPException(status_code=500, detail="Rapor gönderilemedi.")

    return {"success": True, "message": "Raporunuz alındı."}


@router.post("/listings/{listing_id}/apply", status_code=status.HTTP_201_CREATED)
async def apply_to_listing(
    listing_id: str,
    body: ApplyRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Startup/Proje ilanına DM başvurusu gönderir; Conversation + CareerMessage oluşturur."""
    if not body.message_text or len(body.message_text.strip()) < 5:
        raise HTTPException(status_code=422, detail="Mesaj en az 5 karakter olmalıdır.")

    stmt = select(CareerListing, User).outerjoin(User, CareerListing.posted_by == User.id).where(
        CareerListing.id == listing_id,
        CareerListing.status == "active",
    )
    result = await session.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="İlan bulunamadı.")

    listing, owner = row
    if not owner:
        raise HTTPException(status_code=404, detail="İlan sahibi bulunamadı.")
    if listing.posted_by == current_user.id:
        raise HTTPException(status_code=400, detail="Kendi ilanınıza başvuramazsınız.")

    owner_id = listing.posted_by

    # Mevcut conversation var mı?
    conv_stmt = select(Conversation).where(
        Conversation.type == "career",
        Conversation.reference_id == listing_id,
        or_(
            (Conversation.user1_id == current_user.id) & (Conversation.user2_id == owner_id),
            (Conversation.user1_id == owner_id) & (Conversation.user2_id == current_user.id),
        ),
    )
    conv_result = await session.execute(conv_stmt)
    conversation = conv_result.scalar_one_or_none()

    now = datetime.now()

    if not conversation:
        conversation = Conversation(
            id=str(uuid4()),
            type="career",
            reference_id=listing_id,
            user1_id=current_user.id,
            user2_id=owner_id,
            user1_unread_count=0,
            user2_unread_count=1,
            last_message_at=now,
        )
        session.add(conversation)
        await session.flush()
    else:
        if conversation.user1_id == current_user.id:
            conversation.user2_unread_count = (conversation.user2_unread_count or 0) + 1
        else:
            conversation.user1_unread_count = (conversation.user1_unread_count or 0) + 1
        conversation.last_message_at = now

    message = CareerMessage(
        id=str(uuid4()),
        conversation_id=conversation.id,
        sender_id=current_user.id,
        receiver_id=owner_id,
        listing_id=listing_id,
        content=body.message_text.strip(),
        is_read=False,
    )
    session.add(message)

    # CareerApplication kaydet (idempotent)
    app_stmt = select(CareerApplication).where(
        CareerApplication.listing_id == listing_id,
        CareerApplication.applicant_id == current_user.id,
    )
    app_result = await session.execute(app_stmt)
    application = app_result.scalar_one_or_none()

    if not application:
        application = CareerApplication(
            id=str(uuid4()),
            listing_id=listing_id,
            applicant_id=current_user.id,
            application_type="dm",
            dm_conversation_id=conversation.id,
        )
        session.add(application)
        listing.application_count = (listing.application_count or 0) + 1

    try:
        await session.commit()
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Başvuru gönderilemedi: {str(e)}")

    return {"conversation_id": conversation.id, "success": True}
 
 
@router.delete("/listings/{listing_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_listing(
    listing_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> None:
    """İlan sahibi veya admin silebilir."""
    stmt = select(CareerListing).where(CareerListing.id == listing_id)
    result = await session.execute(stmt)
    listing = result.scalar_one_or_none()
 
    if not listing:
        raise HTTPException(status_code=404, detail="İlan bulunamadı.")
 
    # Sadece sahibi veya admin silebilir
    is_admin = UserRole(current_user.role) in {UserRole.ADMIN, UserRole.UNIVERSITY_ADMIN}
    if listing.posted_by != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail="Bu ilanı silme yetkiniz bulunmamaktadır.")
 
    await session.delete(listing)
    try:
        await session.commit()
    except Exception:
        await session.rollback()
        raise HTTPException(status_code=500, detail="İlan silinirken bir hata oluştu.")
