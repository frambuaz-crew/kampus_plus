"""Ders Notları API routes - Ders kodu bazlı ortak not paylaşım havuzu."""

import logging
import uuid
from pathlib import Path
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
from src.models.user import User, UserRole
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
# HELPERS
# ============================================================================

def _is_global_admin(user: User) -> bool:
    """admin rolü: tüm üniversiteleri görebilir / silebilir."""
    return UserRole(user.role) == UserRole.ADMIN


def _is_admin(user: User) -> bool:
    """admin veya university_admin."""
    return UserRole(user.role) in {UserRole.ADMIN, UserRole.UNIVERSITY_ADMIN}


def _delete_attachment_file(file_url: str, upload_dir: Path) -> None:
    """Fiziksel dosyayı siler; dosya yoksa sessizce geçer."""
    relative = file_url.removeprefix("/uploads/")
    full_path = upload_dir / relative
    full_path.unlink(missing_ok=True)


def _assert_university_scope(actor: User, target_university_id: Optional[str]) -> None:
    """university_admin kendi üniversitesi dışındaki kayıtlara erişemez."""
    if _is_global_admin(actor):
        return
    if actor.university_id != target_university_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu kaydı görme veya değiştirme yetkiniz yok.",
        )


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
    current_user: User = Depends(get_current_user),
) -> List[TopicOut]:
    """Ders kodu veya üniversiteye göre ders notu başlıklarını listeler.
    Global admin tüm kayıtları görür; diğer kullanıcılar sadece kendi üniversitesini görür."""
    stmt = (
        select(CourseNoteTopic)
        .options(selectinload(CourseNoteTopic.creator))
    )

    # Üniversite izolasyonu: global admin değilse kendi üniversitesini filtrele
    if not _is_global_admin(current_user):
        stmt = stmt.where(CourseNoteTopic.university_id == current_user.university_id)
    elif university_id:
        # Global admin ise query param ile filtrelemeye izin ver
        stmt = stmt.where(CourseNoteTopic.university_id == university_id)

    if course_code:
        stmt = stmt.where(
            CourseNoteTopic.course_code.ilike(f"%{course_code.strip().upper()}%")
        )

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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TopicOut:
    """Yeni ders notu başlığı oluşturur.
    university_id, isteği gönderen kullanıcının üniversitesinden otomatik alınır."""
    if not _is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Yeni not havuzu oluşturma yetkiniz yok. Sadece adminler havuz oluşturabilir.",
        )

    normalized_code = course_code.strip().upper()

    topic = CourseNoteTopic(
        course_code=normalized_code,
        title=title.strip(),
        university_id=current_user.university_id,
        created_by=current_user.id,
    )
    db.add(topic)
    await db.flush()
    await db.refresh(topic)
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
    current_user: User = Depends(get_current_user),
) -> TopicDetailOut:
    """Belirtilen başlığın tüm notlarını ve eklerini getirir.
    Global admin herkese ait havuzları görebilir; diğerleri sadece kendi üniversitesini görebilir."""
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

    # Üniversite izolasyonu
    _assert_university_scope(current_user, topic.university_id)

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
    topic_result = await db.execute(
        select(CourseNoteTopic).where(CourseNoteTopic.id == topic_id)
    )
    topic = topic_result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Başlık bulunamadı.")

    # Üniversite izolasyonu
    _assert_university_scope(current_user, topic.university_id)

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
    await db.flush()

    db_attachments: List[CourseNoteAttachment] = []

    if has_files:
        settings = get_settings()
        upload_dir = settings.get_upload_dir_absolute() / "course_notes"
        upload_dir.mkdir(parents=True, exist_ok=True)

        for upload in files:
            if not upload.filename:
                continue

            file_type = ALLOWED_MIME_TYPES.get(upload.content_type or "")
            if not file_type:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Desteklenmeyen dosya türü: {upload.content_type}. Sadece PDF ve resim (JPEG/PNG/GIF/WebP) kabul edilir.",
                )

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

            attachment = CourseNoteAttachment(
                entry_id=entry.id,
                file_url=f"/uploads/course_notes/{unique_filename}",
                file_type=file_type,
                file_name=upload.filename,
            )
            db.add(attachment)
            db_attachments.append(attachment)

    await db.commit()
    await db.refresh(entry)
    for attachment in db_attachments:
        await db.refresh(attachment)

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
        attachments=[
            AttachmentOut(id=a.id, file_url=a.file_url, file_type=a.file_type, file_name=a.file_name)
            for a in db_attachments
        ],
        created_at=entry.created_at,
    )


# ============================================================================
# DELETE ENDPOINTS
# ============================================================================

@router.delete("/topics/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(
    topic_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Havuzu ve içindeki tüm entry/attachment'ları + fiziksel dosyaları siler.
    Sadece admin ve university_admin rollerine açıktır.
    university_admin sadece kendi üniversitesinin havuzlarını silebilir."""
    if not _is_global_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu işlemi sadece süper admin yapabilir.",
        )

    stmt = (
        select(CourseNoteTopic)
        .where(CourseNoteTopic.id == topic_id)
        .options(
            selectinload(CourseNoteTopic.entries).selectinload(CourseNoteEntry.attachments)
        )
    )
    result = await db.execute(stmt)
    topic = result.scalar_one_or_none()
    if not topic:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Başlık bulunamadı.")

    # Üniversite kapsam kontrolü
    _assert_university_scope(current_user, topic.university_id)

    upload_dir = get_settings().get_upload_dir_absolute()
    for entry in topic.entries:
        for att in entry.attachments:
            _delete_attachment_file(att.file_url, upload_dir)

    await db.delete(topic)
    await db.commit()


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Ders notu gönderisini ve eklerini siler.
    Kullanıcı kendi gönderisini silebilir; adminler her gönderiyi silebilir.
    university_admin sadece kendi üniversitesine ait havuzlardaki gönderileri silebilir."""
    stmt = (
        select(CourseNoteEntry)
        .where(CourseNoteEntry.id == entry_id)
        .options(
            selectinload(CourseNoteEntry.attachments),
            selectinload(CourseNoteEntry.topic),
        )
    )
    result = await db.execute(stmt)
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Gönderi bulunamadı.")

    is_own = entry.user_id == current_user.id

    if not is_own and not _is_admin(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bu gönderiyi silme yetkiniz yok.",
        )

    # Admin ise üniversite kapsam kontrolü yap
    if not is_own:
        _assert_university_scope(current_user, entry.topic.university_id)

    upload_dir = get_settings().get_upload_dir_absolute()
    for att in entry.attachments:
        _delete_attachment_file(att.file_url, upload_dir)

    await db.delete(entry)
    await db.commit()
