"""
Background Processing Tasks for KAMPÜS+ AI Platform.

Handles asynchronous document processing:
- PDF text extraction and chunking (T083)
- Embedding generation and vector storage (T083)
- Retry logic with exponential backoff (T083b)
- Error tracking and status updates (T083, T083b)

Constitutional Requirements:
- Must complete 10MB PDF processing within 2 minutes (SC-005)
- All processing must maintain user anonymization (no prompt logs)
- Failed documents must be retryable
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.core.database import get_session_factory
from src.models.document import UserDocument
from src.services.pdf_service import PDFService
from src.services.vector_service import VectorStoreService
from src.services.s3_service import S3Service

logger = logging.getLogger(__name__)

# Global service instances
pdf_service = PDFService()
vector_service = VectorStoreService()
s3_service = S3Service()


async def process_document_async(
    document_id: UUID,
    user_id: UUID,
    s3_key: str,
    s3_bucket: str
) -> None:
    """
    Background task: Process PDF document for vector embeddings.
    
    Workflow:
    1. Download PDF from S3
    2. Extract text using PDFService (PyPDF2 + pdfplumber fallback)
    3. Chunk into 512-token segments (50-token overlap)
    4. Generate embeddings using Google Gemini text-embedding-004 (768 dims)
    5. Store embeddings in VDB_Social (user namespace)
    6. Update UserDocument status and page_count
    7. Handle errors: Set status="failed", populate error_message, enable retry
    
    Args:
        document_id: UUID of UserDocument to process
        user_id: UUID of document owner (for vector store ACL)
        s3_key: S3 object key (e.g., "uploads/user-id/doc-id.pdf")
        s3_bucket: S3 bucket name
    
    Returns:
        None (status persisted to database)
    
    Raises:
        Exceptions are caught and logged; status updated to "failed"
    """
    session_factory = get_session_factory()
    
    try:
        logger.info(
            f"Starting background processing for document {document_id} "
            f"(user={user_id}, s3_key={s3_key})"
        )
        
        # 1. Download PDF from S3
        logger.debug(f"Downloading PDF from S3: s3://{s3_bucket}/{s3_key}")
        file_content = await s3_service.download_file(s3_key)
        
        if not file_content:
            raise ValueError("Failed to download PDF from S3")
        
        logger.debug(f"Downloaded {len(file_content)} bytes from S3")
        
        # 2. Extract text from PDF
        logger.debug("Extracting text from PDF")
        text = pdf_service.extract_text(file_content)
        
        if not text or not text.strip():
            raise ValueError("No text could be extracted from PDF")
        
        logger.debug(f"Extracted {len(text)} characters of text")
        
        # 3. Chunk text
        logger.debug("Chunking text into segments")
        chunks = pdf_service.chunk_text(text)
        
        if not chunks:
            raise ValueError("Failed to chunk text")
        
        logger.debug(f"Created {len(chunks)} chunks (512-token size, 50-token overlap)")
        
        # 4. Generate embeddings using Google Gemini
        logger.debug(f"Generating embeddings for {len(chunks)} chunks")
        embeddings = await vector_service.generate_embeddings_batch([c for c in chunks])
        
        if not embeddings or len(embeddings) != len(chunks):
            raise ValueError(f"Embedding generation failed: expected {len(chunks)}, got {len(embeddings)}")
        
        logger.debug(f"Generated {len(embeddings)} embeddings (768 dimensions each)")
        
        # 5. Store embeddings in VDB_User (user-namespaced vector store)
        logger.debug(f"Storing {len(chunks)} embeddings in VDB_User")
        
        # Prepare metadata for each chunk
        chunk_metadata = [
            {
                "document_id": str(document_id),
                "user_id": str(user_id),
                "chunk_index": i,
                "source": "user_document"
            }
            for i in range(len(chunks))
        ]
        
        # Add chunks to user vector store with metadata
        vector_ids = await vector_service.add_to_user(
            texts=chunks,
            user_id=user_id,
            metadata=chunk_metadata
        )
        
        logger.debug(f"Stored embeddings with FAISS IDs: {vector_ids[0]}-{vector_ids[-1]}")
        
        # 6. Get page count from PDF
        import PyPDF2
        import io
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        page_count = len(pdf_reader.pages)
        
        logger.debug(f"PDF has {page_count} pages")
        
        # 7. Update UserDocument in database
        logger.debug(f"Updating UserDocument status to 'completed'")
        
        async with session_factory() as session:
            async with session.begin():
                # Query document
                stmt = select(UserDocument).where(
                    UserDocument.id == document_id,
                    UserDocument.user_id == user_id
                )
                result = await session.execute(stmt)
                document = result.scalar_one_or_none()
                
                if not document:
                    raise ValueError(f"Document {document_id} not found for user {user_id}")
                
                # Update status and metadata
                document.processing_status = "completed"
                document.processed_at = datetime.utcnow()
                document.page_count = page_count
                document.chunk_count = len(chunks)
                document.error_message = None
        
        logger.info(
            f"Successfully processed document {document_id}: "
            f"{page_count} pages, {len(chunks)} chunks, "
            f"{len(embeddings)} embeddings stored"
        )
        
    except Exception as e:
        logger.error(
            f"Error processing document {document_id}: {str(e)}",
            exc_info=True
        )
        
        # Update document status to "failed"
        try:
            async with session_factory() as session:
                async with session.begin():
                    stmt = select(UserDocument).where(
                        UserDocument.id == document_id,
                        UserDocument.user_id == user_id
                    )
                    result = await session.execute(stmt)
                    document = result.scalar_one_or_none()
                    
                    if document:
                        document.processing_status = "failed"
                        document.error_message = str(e)[:500]  # Truncate to 500 chars
                        
                        logger.warning(
                            f"Updated document {document_id} status to 'failed': {str(e)[:100]}"
                        )
        except Exception as db_error:
            logger.error(
                f"Failed to update document status to failed: {db_error}",
                exc_info=True
            )


async def process_document_with_retry(
    document_id: UUID,
    user_id: UUID,
    s3_key: str,
    s3_bucket: str,
    max_retries: int = 3,
    retry_delays: Optional[list] = None
) -> None:
    """
    Background task with retry logic (T083b).
    
    Implements exponential backoff for failed document processing:
    - Attempt 1: Immediate (process_document_async)
    - Attempt 2: After 1 minute
    - Attempt 3: After 5 minutes
    - Attempt 4: After 15 minutes
    
    If all retries fail, status="failed" with error_message populated.
    
    Args:
        document_id: UUID of UserDocument to process
        user_id: UUID of document owner
        s3_key: S3 object key
        s3_bucket: S3 bucket name
        max_retries: Maximum number of retry attempts (default 3)
        retry_delays: List of delay seconds between retries (default [60, 300, 900])
    
    Returns:
        None (final status persisted to database)
    """
    if retry_delays is None:
        # Default: 1 min, 5 min, 15 min delays
        retry_delays = [60, 300, 900]
    
    attempt = 1
    
    while attempt <= max_retries + 1:  # +1 for initial attempt
        try:
            logger.info(
                f"Processing document {document_id} (attempt {attempt}/{max_retries + 1})"
            )
            
            # Run the main processing function
            await process_document_async(
                document_id=document_id,
                user_id=user_id,
                s3_key=s3_key,
                s3_bucket=s3_bucket
            )
            
            # Success - exit retry loop
            logger.info(f"Document {document_id} processed successfully")
            return
            
        except Exception as e:
            logger.warning(
                f"Attempt {attempt} failed for document {document_id}: {str(e)}"
            )
            
            # Check if we should retry
            if attempt <= max_retries:
                delay_seconds = retry_delays[attempt - 1]
                logger.info(
                    f"Will retry document {document_id} after {delay_seconds} seconds "
                    f"(attempt {attempt + 1}/{max_retries + 1})"
                )
                
                # Wait before retrying
                await asyncio.sleep(delay_seconds)
                attempt += 1
            else:
                # All retries exhausted
                logger.error(
                    f"All {max_retries + 1} attempts failed for document {document_id}. "
                    f"Marking as permanently failed."
                )
                
                # Update final status to "failed"
                try:
                    session_factory = get_session_factory()
                    async with session_factory() as session:
                        async with session.begin():
                            stmt = select(UserDocument).where(
                                UserDocument.id == document_id,
                                UserDocument.user_id == user_id
                            )
                            result = await session.execute(stmt)
                            document = result.scalar_one_or_none()
                            
                            if document:
                                document.processing_status = "failed"
                                document.error_message = (
                                    f"Processing failed after {max_retries + 1} attempts: {str(e)[:400]}"
                                )
                except Exception as db_error:
                    logger.error(
                        f"Failed to update final status for document {document_id}: {db_error}",
                        exc_info=True
                    )
                
                # Re-raise to allow upstream error handling
                raise


# ============================================================================
# TASK ENQUEUE HELPERS
# ============================================================================

async def enqueue_document_processing(
    session: AsyncSession,
    document_id: UUID,
    user_id: UUID,
    s3_key: str,
    s3_bucket: str,
    with_retry: bool = True
) -> None:
    """
    Enqueue document for background processing.
    
    This is called by the upload endpoint (T078) after document is saved to S3.
    
    Args:
        session: Database session
        document_id: UUID of UserDocument
        user_id: UUID of document owner
        s3_key: S3 object key
        s3_bucket: S3 bucket name
        with_retry: Whether to use retry logic (default True for T083b)
    
    Returns:
        None (task queued asynchronously)
    
    Example:
        # Called from POST /documents endpoint
        await enqueue_document_processing(
            session=db,
            document_id=new_doc.id,
            user_id=current_user.id,
            s3_key=s3_key,
            s3_bucket=settings.s3_bucket_name
        )
    """
    try:
        if with_retry:
            # Use retry-enabled task (T083b)
            logger.info(
                f"Enqueueing document {document_id} for processing with retry logic"
            )
            # Create background task with retry
            asyncio.create_task(
                process_document_with_retry(
                    document_id=document_id,
                    user_id=user_id,
                    s3_key=s3_key,
                    s3_bucket=s3_bucket
                )
            )
        else:
            # Use basic processing without retry (T083)
            logger.info(f"Enqueueing document {document_id} for processing")
            asyncio.create_task(
                process_document_async(
                    document_id=document_id,
                    user_id=user_id,
                    s3_key=s3_key,
                    s3_bucket=s3_bucket
                )
            )
        
        logger.debug(f"Document {document_id} enqueued for background processing")
        
    except Exception as e:
        logger.error(
            f"Failed to enqueue document {document_id} for processing: {e}",
            exc_info=True
        )
        raise
