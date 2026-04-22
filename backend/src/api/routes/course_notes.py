"""Ders Notları API routes - Ders kodu bazlı ortak not paylaşım havuzu."""

import logging
import uuid
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.config import get_settings
from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.user import User
from src.models.course_notes import CourseNoteAttachment, CourseNoteEntry, CourseNoteTopic

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/course-notes", tags=["Course Notes"])

ALLOWED_MIME_TYPES = {
    "application/pdf": "pdf",
    "image/jpeg": "image",
    "image/png": "image",
    "image/gif": "image",
    "image/webp": "image",
}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class TopicAuthorOut(BaseModel):
    id: str
    username: str
    first_name: str
    last_name: str
    profile_picture_url: Optional[str] = None

    model_config = {"from_attributes": True}


class TopicOut(BaseModel):
    id: str
    course_code: str
    title: str
    university_id: Optional[str]
    created_by: str
    creator: Optional[TopicAuthorOut]
    entry_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class AttachmentOut(BaseModel):
    id: str
    file_url: str
    file_type: str
    file_name: str

    model_config = {"from_attributes": True}


class EntryAuthorOut(BaseModel):
    id: str
    username: str
    first_name: str
    last_name: str
    profile_picture_url: Optional[str] = None

    model_config = {"from_attributes": True}


class EntryOut(BaseModel):
    id: str
    topic_id: str
    user_id: str
    author: Optional[EntryAuthorOut]
    content: Optional[str]
    attachments: List[AttachmentOut] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class TopicDetailOut(BaseModel):
    id: str
    course_code: str
    title: str
    university_id: Optional[str]
    created_by: str
    creator: Optional[TopicAuthorOut]
    entries: List[EntryOut] = []
    created_at: datetime

    model_config = {"from_attributes": True}


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get("/topics", response_model=List[TopicOut])
async def list_topics(
    course_code: Optional[str] = Query(None, description="Ders kodu ile filtrele (kısmi eşleşme)"),
    university_id: Optional[str] = Query(None, description="Üniversiteye göre filtrele"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> List[TopicOut]:
    """Ders kodu veya üniversiteye göre ders notu başlıklarını listeler."""
    stmt = (
        select(CourseNoteTopic)
        .options(selectinload(CourseNoteTopic.creator))
    )

    if course_code:
        stmt = stmt.where(
            CourseNoteTopic.course_code.ilike(f"%{course_code.strip().upper()}%")
        )
    if university_id:
        stmt = stmt.where(CourseNoteTopic.university_id == university_id)

    stmt = stmt.order_by(CourseNoteTopic.created_at.desc())
    stmt = stmt.offset((page - 1) * limit).limit(limit)

    result = await db.execute(stmt)
    topics = result.scalars().all()

    # entry count'ları toplu sorgula
    topic_ids = [t.id for t in topics]
    entry_counts: dict[str, int] = {}
    if topic_ids:
        count_stmt = (
            select(CourseNoteEntry.topic_id, func.count(CourseNoteEntry.id).label("cnt"))
            .where(CourseNoteEntry.topic_id.in_(topic_ids))
            .group_by(CourseNoteEntry.topic_id)
        )
        count_result = await db.execute(count_stmt)
        entry_counts = {row.topic_id: row.cnt for row in count_result}

    out = []
    for t in topics:
        out.append(
            TopicOut(
                id=t.id,
                course_code=t.course_code,
                title=t.title,
                university_id=t.university_id,
                created_by=t.created_by,
                creator=TopicAuthorOut(
                    id=t.creator.id,
                    username=t.creator.username,
                    first_name=t.creator.first_name,
                    last_name=t.creator.last_name,
                    profile_picture_url=getattr(t.creator, "profile_picture_url", None),
                ) if t.creator else None,
                entry_count=entry_counts.get(t.id, 0),
                created_at=t.created_at,
            )
        )
    return out


@router.post("/topics", response_model=TopicOut, status_code=status.HTTP_201_CREATED)
async def create_topic(
    course_code: str = Form(..., min_length=2, max_length=20),
    title: str = Form(..., min_length=3, max_length=200),
    university_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TopicOut:
    """Yeni ders notu başlığı oluşturur."""
    normalized_code = course_code.strip().upper()

    topic = CourseNoteTopic(
        course_code=normalized_code,
        title=title.strip(),
        university_id=university_id or getattr(current_user, "university_id", None),
        created_by=current_user.id,
    )
    db.add(topic)
    await db.flush()
    await db.refresh(topic)

    # creator ilişkisini yükle
    await db.refresh(topic, ["creator"])
    await db.commit()
    await db.refresh(topic)

    return TopicOut(
        id=topic.id,
        course_code=topic.course_code,
        title=topic.title,
        university_id=topic.university_id,
        created_by=topic.created_by,
        creator=TopicAuthorOut(
            id=current_user.id,
            username=current_user.username,
            first_name=current_user.first_name,
            last_name=current_user.last_name,
            profile_picture_url=getattr(current_user, "profile_picture_url", None),
        ),
        entry_count=0,
        created_at=topic.created_at,
    )


@router.get("/topics/{topic_id}", response_model=TopicDetailOut)
async def get_topic_detail(
    topic_id: str,
    db: AsyncSession = Depends(get_db),
    _current_user: User = Depends(get_current_user),
) -> TopicDetailOut:
    """Belirtilen başlığın tüm notlarını ve eklerini getirir."""
    stmt = (
        select(CourseNoteTopic)
        .where(CourseNoteTopic.id == topic_id)
        .options(
            selectinload(CourseNoteTopic.creator),
            selectinload(CourseNoteTopic.entries).selectinload(CourseNoteEntry.author),
            selectinload(CourseNoteTopic.entries).selectinload(CourseNoteEntry.attachments),
        )
    )
    result = await db.execute(stmt)
    topic = result.scalar_one_or_none()

    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Başlık bulunamadı.")

    entries_out = []
    for entry in topic.entries:
        entries_out.append(
            EntryOut(
                id=entry.id,
                topic_id=entry.topic_id,
                user_id=entry.user_id,
                author=EntryAuthorOut(
                    id=entry.author.id,
                    username=entry.author.username,
                    first_name=entry.author.first_name,
                    last_name=entry.author.last_name,
                    profile_picture_url=getattr(entry.author, "profile_picture_url", None),
                ) if entry.author else None,
                content=entry.content,
                attachments=[
                    AttachmentOut(
                        id=a.id,
                        file_url=a.file_url,
                        file_type=a.file_type,
                        file_name=a.file_name,
                    )
                    for a in entry.attachments
                ],
                created_at=entry.created_at,
            )
        )

    return TopicDetailOut(
        id=topic.id,
        course_code=topic.course_code,
        title=topic.title,
        university_id=topic.university_id,
        created_by=topic.created_by,
        creator=TopicAuthorOut(
            id=topic.creator.id,
            username=topic.creator.username,
            first_name=topic.creator.first_name,
            last_name=topic.creator.last_name,
            profile_picture_url=getattr(topic.creator, "profile_picture_url", None),
        ) if topic.creator else None,
        entries=entries_out,
        created_at=topic.created_at,
    )


@router.post(
    "/topics/{topic_id}/entries",
    response_model=EntryOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_entry(
    topic_id: str,
    content: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EntryOut:
    """Seçilen başlığa metin ve/veya dosya ekler (multipart/form-data)."""
    # Başlık var mı kontrol et
    topic_result = await db.execute(
        select(CourseNoteTopic).where(CourseNoteTopic.id == topic_id)
    )
    topic = topic_result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Başlık bulunamadı.")

    # En az içerik ya da dosya gerekli
    has_files = files and any(f.filename for f in files)
    if not content and not has_files:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Not metni veya en az bir dosya gereklidir.",
        )

    entry = CourseNoteEntry(
        topic_id=topic_id,
        user_id=current_user.id,
        content=content.strip() if content else None,
    )
    db.add(entry)
    await db.flush()  # entry.id oluşturuluyor

    db_attachments: List[CourseNoteAttachment] = []

    if has_files:
        settings = get_settings()
        upload_dir = settings.get_upload_dir_absolute() / "course_notes"
        upload_dir.mkdir(parents=True, exist_ok=True)

        for upload in files:
            if not upload.filename:
                continue

            # MIME tipi kontrolü
            file_type = ALLOWED_MIME_TYPES.get(upload.content_type or "")
            if not file_type:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Desteklenmeyen dosya türü: {upload.content_type}. Sadece PDF ve resim (JPEG/PNG/GIF/WebP) kabul edilir.",
                )

            # Dosya boyutu kontrolü (stream okuma)
            content_bytes = await upload.read()
            if len(content_bytes) > MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"Dosya boyutu 20 MB sınırını aşıyor: {upload.filename}",
                )

            ext = "pdf" if file_type == "pdf" else upload.filename.rsplit(".", 1)[-1].lower()
            unique_filename = f"{uuid.uuid4().hex}.{ext}"
            file_path = upload_dir / unique_filename

            with open(file_path, "wb") as buf:
                buf.write(content_bytes)

            file_url = f"/uploads/course_notes/{unique_filename}"
            attachment = CourseNoteAttachment(
                entry_id=entry.id,
                file_url=file_url,
                file_type=file_type,
                file_name=upload.filename,
            )
            db.add(attachment)
            db_attachments.append(attachment)

    await db.commit()
    await db.refresh(entry)
    for attachment in db_attachments:
        await db.refresh(attachment)

    attachments_out = [
        AttachmentOut(
            id=a.id,
            file_url=a.file_url,
            file_type=a.file_type,
            file_name=a.file_name,
        )
        for a in db_attachments
    ]

    return EntryOut(
        id=entry.id,
        topic_id=entry.topic_id,
        user_id=entry.user_id,
        author=EntryAuthorOut(
            id=current_user.id,
            username=current_user.username,
            first_name=current_user.first_name,
            last_name=current_user.last_name,
            profile_picture_url=getattr(current_user, "profile_picture_url", None),
        ),
        content=entry.content,
        attachments=attachments_out,
        created_at=entry.created_at,
    )
