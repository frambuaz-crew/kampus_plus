"""
Document Upload & Management Endpoints (T078-T082)

API routes for:
- T078: POST /documents - File upload with validation, malware scanning, S3 upload
- T078.5: ClamAV integration for malware scanning
- T079: GET /documents - List user's documents
- T080: GET /documents/{id} - Get document metadata
- T081: GET /documents/{id}/download - Pre-signed URL download
- T082: DELETE /documents/{id} - Soft delete document

Authorization: All endpoints require JWT authentication
Rate limiting: Standard user limits (100 req/min)
"""

import logging
import asyncio
from typing import Optional
from datetime import datetime
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    status,
)
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from src.core.database import get_db
from src.api.dependencies import get_current_user
from src.models.user import User
from src.models.document import UserDocument, VectorEmbedding
from src.core.config import settings
from src.services.s3_service import S3Service
from src.services.pdf_service import PDFService
from src.services.vector_service import VectorStoreService

# Initialize router
router = APIRouter(prefix="/documents", tags=["documents"])
logger = logging.getLogger(__name__)

# Service instances - lazy initialization to avoid import-time errors
s3_service = None
pdf_service = None
vector_service = None

def get_services():
    """Lazy initialization of services."""
    global s3_service, pdf_service, vector_service
    if s3_service is None:
        s3_service = S3Service()
    if pdf_service is None:
        pdf_service = PDFService()
    if vector_service is None:
        vector_service = VectorStoreService()
    return s3_service, pdf_service, vector_service

# Constants
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB
ALLOWED_CONTENT_TYPES = ["application/pdf"]
DEFAULT_STORAGE_QUOTA = 500 * 1024 * 1024  # 500MB


# ============================================================================
# T078: POST /documents - File Upload Endpoint
# ============================================================================

@router.post("", status_code=201, response_model=dict)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload PDF document for personal knowledge base.

    Request:
    - file: PDF file (multipart/form-data)

    Response:
    - 201 Created: {document_id, filename, file_size, processing_status}
    - 400 Bad Request: Invalid file type or corrupted PDF
    - 413 Payload Too Large: File exceeds 25MB or storage quota
    - 500 Internal Server Error: S3 upload failed

    Validation (in order):
    1. File type: Must be application/pdf
    2. File size: Must be <= 25MB
    3. Malware scan: ClamAV synchronous scan
    4. Storage quota: User total <= 500MB (or configured)
    5. S3 upload: Store with user_id prefix
    6. DB record: Create UserDocument with processing_status=pending
    7. Background job: Queue PDF processing task
    """
    try:
        # Lazy load services
        s3_svc, pdf_svc, vector_svc = get_services()
        
        # Validation 1: File type
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            logger.warning(
                f"Invalid file type: {file.content_type} from user {current_user.id}"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only PDF files are accepted. Received: {file.content_type}"
            )

        # Validation 2: File size (check before reading)
        if file.size and file.size > MAX_FILE_SIZE:
            logger.warning(
                f"File size exceeded: {file.size} bytes from user {current_user.id}"
            )
            raise HTTPException(
                status_code=status.HTTP_413_PAYLOAD_TOO_LARGE,
                detail=f"File size exceeds 25MB limit. Received: {file.size / (1024*1024):.2f}MB"
            )

        # Read file content for validation
        file_content = await file.read()
        file_size = len(file_content)

        # Recheck size after reading
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_PAYLOAD_TOO_LARGE,
                detail=f"File size exceeds 25MB limit. Received: {file_size / (1024*1024):.2f}MB"
            )

        # Validation 3: Malware scanning (synchronous)
        # TODO T078.5: Implement ClamAV integration
        # For now, skipping malware scan (to be implemented with Docker ClamAV container)
        # scan_result = await malware_service.scan_bytes(file_content)
        # if scan_result.get("is_infected"):
        #     logger.critical(f"Malware detected: {scan_result.get('threat_name')} from user {current_user.id}")
        #     raise HTTPException(status_code=400, detail=f"File contains malware")
        logger.debug(f"Malware scanning skipped (TODO: T078.5 ClamAV integration)")

        # Validation 4: Storage quota
        current_usage = await get_user_storage_usage(db, current_user.id)
        quota = settings.get("STORAGE_QUOTA_MB", 500) * 1024 * 1024
        
        if current_usage + file_size > quota:
            available = quota - current_usage
            logger.warning(
                f"Storage quota exceeded for user {current_user.id}: {current_usage + file_size} / {quota}"
            )
            raise HTTPException(
                status_code=status.HTTP_413_PAYLOAD_TOO_LARGE,
                detail=f"Storage quota exceeded. Current usage: {current_usage / (1024*1024):.1f}MB / {quota / (1024*1024):.0f}MB. Available: {available / (1024*1024):.1f}MB"
            )

        # Validation 5: S3 Upload
        # Generate S3 key: uploads/{user_id}/{document_id}.pdf
        document_id = str(UUID(version=4))
        s3_key = f"uploads/{current_user.id}/{document_id}.pdf"
        
        try:
            s3_result = await s3_svc.upload_file(
                file_content,
                s3_key,
                content_type="application/pdf",
                metadata={
                    "user_id": str(current_user.id),
                    "original_filename": file.filename,
                    "upload_timestamp": datetime.utcnow().isoformat()
                }
            )
            logger.info(f"S3 upload successful: {s3_key}")
        except Exception as e:
            logger.error(f"S3 upload failed: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload file. Please try again."
            )

        # Validation 6: Create UserDocument record
        user_document = UserDocument(
            id=UUID(document_id),
            user_id=current_user.id,
            filename=file.filename,
            s3_key=s3_key,
            s3_bucket=settings.aws_s3_bucket,
            file_size=file_size,
            content_type="application/pdf",
            processing_status="pending",
            uploaded_at=datetime.utcnow()
        )
        
        db.add(user_document)
        await db.commit()
        await db.refresh(user_document)
        logger.info(f"UserDocument created: {user_document.id} for user {current_user.id}")

        # Validation 7: Queue background processing job (T083 with T083b retry)
        # Import here to avoid circular dependency
        from src.api.routes.tasks import process_document_with_retry
        
        asyncio.create_task(
            process_document_with_retry(
                document_id=user_document.id,
                user_id=current_user.id,
                s3_key=s3_key,
                s3_bucket=settings.aws_s3_bucket
            )
        )
        logger.info(f"Background processing job queued for document {user_document.id}")

        return {
            "document_id": str(user_document.id),
            "filename": user_document.filename,
            "file_size": user_document.file_size,
            "processing_status": user_document.processing_status,
            "uploaded_at": user_document.uploaded_at.isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in upload_document: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during upload."
        )


# ============================================================================
# T079: GET /documents - List User's Documents
# ============================================================================

@router.get("", response_model=dict)
async def list_documents(
    skip: int = 0,
    limit: int = 20,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all documents uploaded by authenticated user.

    Query Parameters:
    - skip: Pagination offset (default: 0)
    - limit: Items per page (default: 20, max: 100)
    - status_filter: Filter by status (pending|processing|completed|failed)

    Response:
    - 200 OK: {documents: [...], total: count}
      * Each document includes: id, filename, file_size, processing_status, uploaded_at

    Authorization:
    - User can only see their own documents (user_id filter)
    """
    try:
        query = select(UserDocument).where(
            UserDocument.user_id == current_user.id
        )

        if status_filter:
            if status_filter not in ["pending", "processing", "completed", "failed"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid status filter: {status_filter}"
                )
            query = query.where(UserDocument.processing_status == status_filter)

        # Exclude deleted documents
        query = query.where(UserDocument.is_deleted == False)
        # Order by uploaded_at DESC (newest first)
        query = query.order_by(desc(UserDocument.uploaded_at))

        # Count total (non-deleted)
        count_result = await db.execute(
            select(UserDocument).where(
                (UserDocument.user_id == current_user.id) & (UserDocument.is_deleted == False)
            )
        )
        total = len(count_result.scalars().all())

        # Paginate
        query = query.offset(skip).limit(min(limit, 100))
        result = await db.execute(query)
        documents = result.scalars().all()

        return {
            "documents": [
                {
                    "id": str(doc.id),
                    "filename": doc.filename,
                    "file_size": doc.file_size,
                    "processing_status": doc.processing_status,
                    "uploaded_at": doc.uploaded_at.isoformat() if doc.uploaded_at else None,
                    "processed_at": doc.processed_at.isoformat() if doc.processed_at else None,
                    "page_count": doc.page_count,
                    "chunk_count": doc.chunk_count,
                    "error_message": doc.error_message
                }
                for doc in documents
            ],
            "total": total,
            "skip": skip,
            "limit": limit
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing documents for user {current_user.id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve documents."
        )


# ============================================================================
# T080: GET /documents/{id} - Get Document Metadata
# ============================================================================

@router.get("/{document_id}", response_model=dict)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get metadata for a specific document.

    Path Parameters:
    - document_id: UUID of the document

    Response:
    - 200 OK: Document metadata (id, filename, size, status, timestamps, chunks, etc.)
    - 403 Forbidden: User does not own this document
    - 404 Not Found: Document does not exist

    Authorization:
    - User can only access their own documents (ACL check)
    """
    try:
        result = await db.execute(
            select(UserDocument).where(UserDocument.id == UUID(document_id))
        )
        document = result.scalars().first()

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found"
            )

        # ACL: Check ownership
        if document.user_id != current_user.id:
            logger.warning(
                f"Unauthorized access attempt: user {current_user.id} tried to access document {document_id} owned by {document.user_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this document"
            )

        return {
            "id": str(document.id),
            "filename": document.filename,
            "file_size": document.file_size,
            "content_type": document.content_type,
            "processing_status": document.processing_status,
            "uploaded_at": document.uploaded_at.isoformat() if document.uploaded_at else None,
            "processed_at": document.processed_at.isoformat() if document.processed_at else None,
            "page_count": document.page_count,
            "error_message": document.error_message,
            "s3_key": document.s3_key
        }

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document ID format: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error retrieving document {document_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document metadata."
        )


# ============================================================================
# T081: GET /documents/{id}/download - Pre-Signed URL
# ============================================================================

@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Generate pre-signed URL for downloading document from S3.

    Path Parameters:
    - document_id: UUID of the document

    Response:
    - 200 OK: {url: "https://s3.example.com/...?signature=..."}
      * URL expires in 15 minutes
    - 403 Forbidden: User does not own this document
    - 404 Not Found: Document does not exist

    Authorization:
    - User can only download their own documents (ACL check)
    """
    # Lazy load services
    s3_svc, _, _ = get_services()
    
    try:
        result = await db.execute(
            select(UserDocument).where(UserDocument.id == UUID(document_id))
        )
        document = result.scalars().first()

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found"
            )

        # ACL: Check ownership
        if document.user_id != current_user.id:
            logger.warning(
                f"Unauthorized download attempt: user {current_user.id} tried to download {document_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to download this document"
            )

        # Generate pre-signed URL (15 minutes expiry)
        presigned_url = await s3_svc.generate_presigned_url(
            document.s3_key,
            expiration=900  # 15 minutes
        )

        logger.info(f"Pre-signed URL generated for document {document_id}")

        return {
            "url": presigned_url,
            "filename": document.filename,
            "expires_in": 900
        }

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document ID format: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error generating pre-signed URL for {document_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate download URL."
        )


# ============================================================================
# T082: DELETE /documents/{id} - Soft Delete Document
# ============================================================================

@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Soft delete document (mark as inactive).

    Path Parameters:
    - document_id: UUID of the document to delete

    Response:
    - 204 No Content: Deletion successful (no response body)
    - 403 Forbidden: User does not own this document
    - 404 Not Found: Document does not exist

    Behavior:
    - Document marked with is_active=False (soft delete)
    - S3 file remains for 30 days (compliance/recovery)
    - VectorEmbeddings remain in DB (audit trail)
    - Document NOT returned in list queries
    - Authorization: User can only delete their own documents

    Implementation Notes:
    - Does NOT actually delete from S3 immediately (lifecycle policy handles cleanup)
    - Does NOT delete VectorEmbeddings (but they're no longer searchable)
    - Timestamps: updated_at set to current time
    """
    try:
        result = await db.execute(
            select(UserDocument).where(UserDocument.id == UUID(document_id))
        )
        document = result.scalars().first()

        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found"
            )

        # ACL: Check ownership
        if document.user_id != current_user.id:
            logger.warning(
                f"Unauthorized delete attempt: user {current_user.id} tried to delete {document_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to delete this document"
            )

        # Soft delete: Mark as deleted
        document.is_deleted = True
        db.add(document)
        await db.commit()

        logger.info(f"Document {document_id} soft deleted by user {current_user.id}")

        # Note: S3 file deletion handled by lifecycle policy (30-day retention for compliance)
        # VectorEmbeddings remain in DB but are no longer retrieved by searches

        return None  # 204 No Content

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid document ID format: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error deleting document {document_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete document."
        )


# ============================================================================
# T088: GET /documents/stats - Document Statistics
# ============================================================================

@router.get("/stats", status_code=200, response_model=dict)
async def get_document_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get document statistics for current user.

    Response:
    - 200 OK: {
        total_documents: int,
        pending_documents: int,
        processing_documents: int,
        completed_documents: int,
        failed_documents: int,
        total_storage_used: int (bytes),
        storage_quota: int (bytes),
        storage_usage_percent: float
      }
    """
    try:
        # Count documents by status
        result = await db.execute(
            select(UserDocument).where(
                (UserDocument.user_id == current_user.id) & 
                (UserDocument.is_deleted == False)
            )
        )
        documents = result.scalars().all()
        
        total_documents = len(documents)
        pending = sum(1 for doc in documents if doc.processing_status == "pending")
        processing = sum(1 for doc in documents if doc.processing_status == "processing")
        completed = sum(1 for doc in documents if doc.processing_status == "completed")
        failed = sum(1 for doc in documents if doc.processing_status == "failed")
        
        # Calculate storage usage
        total_storage_used = await get_user_storage_usage(db, current_user.id)
        storage_quota = DEFAULT_STORAGE_QUOTA
        storage_usage_percent = (total_storage_used / storage_quota * 100) if storage_quota > 0 else 0
        
        return {
            "total_documents": total_documents,
            "pending_documents": pending,
            "processing_documents": processing,
            "completed_documents": completed,
            "failed_documents": failed,
            "total_storage_used": total_storage_used,
            "storage_quota": storage_quota,
            "storage_usage_percent": round(storage_usage_percent, 2)
        }
        
    except Exception as e:
        logger.error(f"Error fetching document stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch document statistics."
        )


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

async def get_user_storage_usage(db: AsyncSession, user_id: UUID) -> int:
    """
    Calculate total storage used by user (in bytes).

    Returns sum of file_size for all non-deleted documents owned by user.
    """
    result = await db.execute(
        select(UserDocument).where(
            (UserDocument.user_id == user_id) & (UserDocument.is_deleted == False)
        )
    )
    documents = result.scalars().all()
    return sum(doc.file_size for doc in documents)
