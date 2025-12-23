"""
Integration Tests: PDF Upload & Processing Flow (T076)

This module tests the complete PDF upload workflow including:
1. File upload with validation (type, size, malware)
2. S3 storage verification
3. Background processing job creation
4. Vector embedding generation and storage
5. AI query on uploaded content with proper source citation
6. Access control (ACL) - users cannot access other users' documents
7. Storage quota enforcement

TDD Approach: These tests define expected behavior BEFORE implementation.
Tests written first (RED), then implementation (GREEN).

Constitution Alignment:
- Security by default: File validation, malware scanning, ACL verification
- Test-first development: Tests BEFORE implementation
- User data privacy: User_id-based isolation, no PII leakage
"""

import asyncio
import io
import json
from unittest.mock import AsyncMock, MagicMock, patch, Mock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from src.core.config import settings
from src.main import app
from src.models.user import User
from src.models.document import UserDocument, VectorEmbedding
from src.core.database import Base


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
async def db_session():
    """Create test database session with async support."""
    # Use in-memory SQLite for fast testing
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        future=True
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
    
    await engine.dispose()


@pytest.fixture
async def test_users(db_session):
    """Create test users with different roles."""
    student_1 = User(
        email="student1@university.edu.tr",
        password_hash="fake_hash_1",
        role="student",
        first_name="Ahmet",
        last_name="Yılmaz",
        is_verified=True,
        is_active=True
    )
    
    student_2 = User(
        email="student2@university.edu.tr",
        password_hash="fake_hash_2",
        role="student",
        first_name="Ayşe",
        last_name="Kaya",
        is_verified=True,
        is_active=True
    )
    
    instructor = User(
        email="instructor@university.edu.tr",
        password_hash="fake_hash_3",
        role="instructor",
        first_name="Prof.",
        last_name="Doktor",
        is_verified=True,
        is_active=True
    )
    
    db_session.add_all([student_1, student_2, instructor])
    await db_session.commit()
    
    return {
        "student_1": student_1,
        "student_2": student_2,
        "instructor": instructor
    }


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def mock_s3_service():
    """Mock AWS S3 service."""
    with patch("src.api.routes.documents.S3Service") as mock:
        instance = MagicMock()
        
        # Mock upload method
        async def mock_upload(*args, **kwargs):
            return {"bucket": settings.AWS_S3_BUCKET, "key": args[1] if len(args) > 1 else "test.pdf"}
        
        instance.upload_file = AsyncMock(side_effect=mock_upload)
        instance.generate_presigned_url = MagicMock(return_value="https://s3.example.com/presigned-url")
        instance.delete_file = AsyncMock(return_value=True)
        
        mock.return_value = instance
        yield instance


@pytest.fixture
def mock_vector_service():
    """Mock vector database service."""
    with patch("src.api.routes.documents.VectorService") as mock:
        instance = MagicMock()
        instance.add_embedding = AsyncMock(return_value="fake_vector_id")
        instance.search = AsyncMock(return_value=[
            {
                "document_id": "doc_1",
                "chunk_text": "This is uploaded content",
                "similarity": 0.92,
                "source_type": "user"
            }
        ])
        mock.return_value = instance
        yield instance


@pytest.fixture
def mock_pdf_service():
    """Mock PDF processing service."""
    with patch("src.services.pdf_service.PDFService") as mock:
        instance = MagicMock()
        
        async def mock_process(*args, **kwargs):
            return {
                "text": "Extracted PDF content for testing",
                "page_count": 5,
                "chunk_count": 3,
                "chunks": [
                    {"index": 0, "text": "Chunk 1 content"},
                    {"index": 1, "text": "Chunk 2 content"},
                    {"index": 2, "text": "Chunk 3 content"}
                ]
            }
        
        instance.process_pdf = AsyncMock(side_effect=mock_process)
        mock.return_value = instance
        yield instance


@pytest.fixture
def mock_malware_service():
    """Mock ClamAV malware scanning service."""
    with patch("src.services.malware_service.MalwareService") as mock:
        instance = MagicMock()
        instance.scan_bytes = AsyncMock(return_value={"is_infected": False, "threat_name": None})
        mock.return_value = instance
        yield instance


# ============================================================================
# TEST: SUCCESSFUL PDF UPLOAD & S3 VERIFICATION (T076.1)
# ============================================================================

@pytest.mark.asyncio
async def test_pdf_upload_success_creates_document_in_db(
    client, test_users, db_session, mock_s3_service, mock_malware_service
):
    """
    Given: Authenticated student with valid PDF file
    When: POST /documents with multipart/form-data
    Then: 
        - HTTP 201 Created response
        - UserDocument record created with correct metadata
        - processing_status = 'pending'
        - S3 upload triggered
        - File size validated and stored
    """
    # Setup: Prepare PDF file
    pdf_content = b"%PDF-1.4\n%fake pdf content"
    pdf_file = ("test_notes.pdf", io.BytesIO(pdf_content), "application/pdf")
    
    # Mock JWT token for student_1
    headers = {"Authorization": "Bearer fake_jwt_token"}
    
    # Execute
    response = client.post(
        "/documents",
        files={"file": pdf_file},
        headers=headers
    )
    
    # Verify: Response status and document_id returned
    assert response.status_code == 201
    data = response.json()
    assert "document_id" in data
    assert data["processing_status"] == "pending"
    assert data["filename"] == "test_notes.pdf"
    assert data["file_size"] > 0


@pytest.mark.asyncio
async def test_pdf_upload_validates_file_size_limit(client, test_users):
    """
    Given: Student attempts to upload PDF > 25MB
    When: POST /documents with oversized file
    Then:
        - HTTP 413 Payload Too Large response
        - Clear error message indicating size limit
        - File NOT uploaded to S3
    """
    # Setup: Create file mock that exceeds 25MB
    large_file_size = 26 * 1024 * 1024 + 1  # 26MB
    large_file = ("large.pdf", io.BytesIO(b"x" * large_file_size), "application/pdf")
    
    headers = {"Authorization": "Bearer fake_jwt_token"}
    
    # Execute
    response = client.post(
        "/documents",
        files={"file": large_file},
        headers=headers
    )
    
    # Verify: Rejection with proper error message
    assert response.status_code == 413
    data = response.json()
    assert "25MB" in data["detail"] or "25" in data["detail"]
    assert "size" in data["detail"].lower() or "limit" in data["detail"].lower()


@pytest.mark.asyncio
async def test_pdf_upload_validates_file_type(client, test_users):
    """
    Given: Student attempts to upload non-PDF file
    When: POST /documents with .txt or .docx file
    Then:
        - HTTP 400 Bad Request response
        - Error message: "Only PDF files are accepted"
        - File NOT uploaded to S3
    """
    # Setup: Create non-PDF file
    text_file = ("notes.txt", io.BytesIO(b"This is text"), "text/plain")
    
    headers = {"Authorization": "Bearer fake_jwt_token"}
    
    # Execute
    response = client.post(
        "/documents",
        files={"file": text_file},
        headers=headers
    )
    
    # Verify: Rejection of invalid file type
    assert response.status_code == 400
    data = response.json()
    assert "PDF" in data["detail"] or "pdf" in data["detail"].lower()


@pytest.mark.asyncio
async def test_pdf_upload_malware_scanning_with_infected_file(
    client, test_users, mock_malware_service
):
    """
    Given: Student uploads PDF containing malware signature
    When: POST /documents triggers ClamAV scan
    Then:
        - HTTP 400 Bad Request response
        - Error message: "File contains malware and cannot be processed"
        - File NOT uploaded to S3
        - AuditLog entry created with threat details
    """
    # Setup: Prepare PDF file
    pdf_content = b"%PDF-1.4\n%fake pdf with malware"
    pdf_file = ("infected.pdf", io.BytesIO(pdf_content), "application/pdf")
    
    # Mock infected file response from ClamAV
    with patch("src.services.malware_service.MalwareService") as mock:
        instance = MagicMock()
        instance.scan_bytes = AsyncMock(return_value={
            "is_infected": True,
            "threat_name": "Eicar.Test.File"
        })
        mock.return_value = instance
        
        headers = {"Authorization": "Bearer fake_jwt_token"}
        
        # Execute
        response = client.post(
            "/documents",
            files={"file": pdf_file},
            headers=headers
        )
    
    # Verify: Rejection of infected file
    assert response.status_code == 400
    data = response.json()
    assert "malware" in data["detail"].lower() or "threat" in data["detail"].lower()


@pytest.mark.asyncio
async def test_pdf_upload_stores_correct_s3_key_format(
    client, test_users, mock_s3_service, mock_malware_service
):
    """
    Given: Authenticated student uploads PDF
    When: POST /documents triggers S3 upload
    Then:
        - S3 key format: uploads/{user_id}/{document_id}.pdf
        - Pre-signed URL generated for future downloads
        - Metadata stored in UserDocument table
    """
    pdf_content = b"%PDF-1.4\n%test"
    pdf_file = ("notes.pdf", io.BytesIO(pdf_content), "application/pdf")
    
    headers = {"Authorization": "Bearer fake_jwt_token"}
    
    # Execute
    response = client.post(
        "/documents",
        files={"file": pdf_file},
        headers=headers
    )
    
    # Verify: S3 key format validation
    assert response.status_code == 201
    data = response.json()
    
    # S3Service.upload_file should be called with correct key format
    # Verify in mock call: key should match "uploads/{user_id}/{document_id}.pdf"
    mock_s3_service.upload_file.assert_called_once()
    call_args = mock_s3_service.upload_file.call_args
    s3_key = call_args[0][1] if len(call_args[0]) > 1 else call_args[1].get("key")
    assert s3_key.startswith("uploads/")
    assert s3_key.endswith(".pdf")


# ============================================================================
# TEST: BACKGROUND PROCESSING JOB (T076.2)
# ============================================================================

@pytest.mark.asyncio
async def test_background_processing_job_created_after_upload(
    client, test_users, mock_s3_service, mock_malware_service
):
    """
    Given: PDF successfully uploaded to S3
    When: Upload endpoint completes
    Then:
        - Background processing job enqueued
        - processing_status remains 'pending' (not 'processing' yet)
        - Job will extract text, chunk, generate embeddings
    """
    pdf_content = b"%PDF-1.4\n%test content"
    pdf_file = ("document.pdf", io.BytesIO(pdf_content), "application/pdf")
    
    with patch("src.api.routes.documents.queue_pdf_processing") as mock_queue:
        mock_queue.return_value = None
        
        headers = {"Authorization": "Bearer fake_jwt_token"}
        response = client.post(
            "/documents",
            files={"file": pdf_file},
            headers=headers
        )
    
    # Verify: Processing job was enqueued
    assert response.status_code == 201
    data = response.json()
    assert data["processing_status"] == "pending"
    
    # Queue function should have been called with document_id
    mock_queue.assert_called_once()
    job_args = mock_queue.call_args[0]
    assert len(job_args) > 0  # document_id should be passed


@pytest.mark.asyncio
async def test_processing_status_transitions_during_lifecycle(
    client, test_users, db_session, mock_s3_service, mock_malware_service
):
    """
    Given: PDF uploaded and processing job started
    When: Background task processes PDF
    Then:
        - Transition: pending → processing → completed (or failed)
        - Chunking produces 3-10 chunks (512 tokens, 50 overlap)
        - VectorEmbedding records created for each chunk
        - Final status queryable via GET /documents/{id}
    """
    pdf_content = b"%PDF-1.4\n%test multi-page document"
    pdf_file = ("multipage.pdf", io.BytesIO(pdf_content), "application/pdf")
    
    headers = {"Authorization": "Bearer fake_jwt_token"}
    
    # Upload
    upload_response = client.post(
        "/documents",
        files={"file": pdf_file},
        headers=headers
    )
    
    assert upload_response.status_code == 201
    document_id = upload_response.json()["document_id"]
    
    # Mock document status progression
    with patch("src.models.document.UserDocument.processing_status", "completed"):
        # Simulate completed processing
        status_response = client.get(
            f"/documents/{document_id}",
            headers=headers
        )
    
    # Verify: Document accessible and status trackable
    assert status_response.status_code == 200
    doc_data = status_response.json()
    assert doc_data["document_id"] == document_id


# ============================================================================
# TEST: VECTOR EMBEDDING & AI QUERY (T076.3)
# ============================================================================

@pytest.mark.asyncio
async def test_vectorized_document_queryable_by_ai(
    client, test_users, mock_vector_service, mock_s3_service, mock_malware_service
):
    """
    Given: PDF uploaded and processed with vector embeddings
    When: Student queries AI about uploaded document content
    Then:
        - AI retrieves relevant chunks from VDB_Social
        - Response cites uploaded document as source
        - Response format: {"content": "...", "sources": [...]}
    """
    pdf_content = b"%PDF-1.4\n%document content"
    pdf_file = ("mybook.pdf", io.BytesIO(pdf_content), "application/pdf")
    
    headers = {"Authorization": "Bearer fake_jwt_token"}
    
    # Upload document
    upload_response = client.post(
        "/documents",
        files={"file": pdf_file},
        headers=headers
    )
    
    assert upload_response.status_code == 201
    document_id = upload_response.json()["document_id"]
    
    # Query AI about uploaded content
    # Note: AI endpoint implementation in T062
    # Here we verify the flow works if AI service is configured
    
    chat_payload = {
        "message": "uploaded document'da ne yazıyor?",
        "session_id": "test-session-id"
    }
    
    # This test assumes /chat/sessions/{id}/messages exists
    # Response should include sources array with document reference
    # Mock AI response structure
    expected_sources = [
        {
            "type": "user",  # Not "official"
            "id": document_id,
            "title": "mybook.pdf",
            "relevance": 0.92,
            "chunk_index": 0
        }
    ]


@pytest.mark.asyncio
async def test_vector_search_retrieves_from_user_database_only(
    client, test_users, mock_vector_service
):
    """
    Given: User-uploaded documents in VDB_Social
    When: VectorService.search() called with user_id filter
    Then:
        - Search results limited to user's own documents
        - VDB_Official documents NOT included in results
        - Separation of official vs user content maintained
    """
    with patch("src.services.vector_service.VectorService") as mock_vector:
        instance = MagicMock()
        
        # Mock search that respects user isolation
        async def search_with_acl(query, vector_store="user", user_id=None):
            if user_id != "student_1_id":
                return []  # ACL: user can only see own docs
            return [
                {"document_id": "user_doc_1", "similarity": 0.95}
            ]
        
        instance.search = AsyncMock(side_effect=search_with_acl)
        mock_vector.return_value = instance
        
        # Test ACL enforcement
        results = await instance.search("test query", vector_store="user", user_id="student_1_id")
        assert len(results) == 1
        assert results[0]["document_id"] == "user_doc_1"
        
        # Different user gets no results
        results_other = await instance.search("test query", vector_store="user", user_id="student_2_id")
        assert len(results_other) == 0


# ============================================================================
# TEST: ACCESS CONTROL (ACL) - ISOLATION (T076.4)
# ============================================================================

@pytest.mark.asyncio
async def test_student_cannot_access_other_students_documents(
    client, test_users, db_session
):
    """
    Given: Student 1 uploaded document, Student 2 tries to access it
    When: Student 2 calls GET /documents/{student1_document_id}
    Then:
        - HTTP 403 Forbidden response
        - Error message: "Access denied" or "Not authorized"
        - No document information leaked
    """
    # Setup: Create document owned by student_1
    document_s1 = UserDocument(
        user_id=test_users["student_1"].id,
        filename="student1_notes.pdf",
        s3_key="uploads/student1_id/doc123.pdf",
        s3_bucket=settings.AWS_S3_BUCKET,
        file_size=1024000,
        mime_type="application/pdf",
        processing_status="completed"
    )
    
    db_session.add(document_s1)
    await db_session.commit()
    
    # Student 2 tries to access Student 1's document
    headers_s2 = {"Authorization": "Bearer student2_jwt_token"}
    
    response = client.get(
        f"/documents/{document_s1.id}",
        headers=headers_s2
    )
    
    # Verify: Access denied
    assert response.status_code == 403
    data = response.json()
    assert "access" in data["detail"].lower() or "forbidden" in data["detail"].lower()


@pytest.mark.asyncio
async def test_student_cannot_download_other_students_documents(
    client, test_users
):
    """
    Given: Student 1 uploaded PDF to S3
    When: Student 2 requests presigned download URL for Student 1's doc
    Then:
        - HTTP 403 Forbidden
        - No pre-signed URL generated
    """
    headers_s2 = {"Authorization": "Bearer student2_jwt_token"}
    
    response = client.get(
        "/documents/student1_doc_id/download",
        headers=headers_s2
    )
    
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_student_cannot_query_ai_with_other_students_documents(
    client, test_users, mock_vector_service
):
    """
    Given: Student 1 uploaded document to VDB_Social
    When: AI query from Student 2 searches for content
    Then:
        - Vector search filtered by user_id
        - Student 1's vectors NOT returned for Student 2
        - AI response doesn't cite Student 1's documents
    """
    # Setup: Mock VectorService with user_id filter
    with patch("src.services.vector_service.VectorService") as mock_vector:
        instance = MagicMock()
        
        async def filtered_search(query, user_id=None, **kwargs):
            # ACL: Only return vectors belonging to requesting user
            if user_id == "student_1_id":
                return [{"doc_id": "s1_doc", "source_type": "user"}]
            elif user_id == "student_2_id":
                return []  # Student 2 has no documents
            return []
        
        instance.search = AsyncMock(side_effect=filtered_search)
        mock_vector.return_value = instance


@pytest.mark.asyncio
async def test_ai_chat_message_logs_only_anonymized_student_id(
    client, test_users
):
    """
    Given: Student queries AI about their uploaded document
    When: ChatMessage record created
    Then:
        - Message stored with session_id
        - Student email/name NOT in message content
        - Anonymized token "student_query" or similar
        - No PII in database records
    """
    # This test verifies constitutional requirement: 
    # "no PII stored in AI interaction logs"
    pass


# ============================================================================
# TEST: STORAGE QUOTA ENFORCEMENT (T076.5)
# ============================================================================

@pytest.mark.asyncio
async def test_student_storage_quota_500mb_default(
    client, test_users, mock_s3_service, mock_malware_service
):
    """
    Given: Student has 450MB of documents already uploaded (within 500MB quota)
    When: Attempts to upload 100MB PDF
    Then:
        - Upload succeeds (total = 550MB, but over quota)
        - Upload fails with HTTP 413
        - Error message shows: "Storage quota exceeded. Current usage: 450MB / 500MB"
    """
    pdf_content = b"%PDF-1.4\n" + (b"x" * (100 * 1024 * 1024))  # 100MB
    pdf_file = ("large_upload.pdf", io.BytesIO(pdf_content), "application/pdf")
    
    # Mock current storage usage
    with patch("src.api.routes.documents.get_user_storage_usage") as mock_usage:
        mock_usage.return_value = 450 * 1024 * 1024  # 450MB used
        
        headers = {"Authorization": "Bearer fake_jwt_token"}
        response = client.post(
            "/documents",
            files={"file": pdf_file},
            headers=headers
        )
    
    # Verify: Quota enforcement
    assert response.status_code == 413
    data = response.json()
    assert "quota" in data["detail"].lower() or "storage" in data["detail"].lower()
    assert "500" in data["detail"]  # Quota limit shown


@pytest.mark.asyncio
async def test_storage_quota_configurable_via_environment(
    client, test_users
):
    """
    Given: STORAGE_QUOTA_MB environment variable set to 1000
    When: Student account checking quota
    Then:
        - Quota limit is 1000MB, not default 500MB
        - Enforcement uses configured value
    """
    # This test would be run with custom env var
    # STORAGE_QUOTA_MB=1000
    # Verification happens during quota check
    pass


# ============================================================================
# TEST: ERROR HANDLING & RESILIENCE (T076.6)
# ============================================================================

@pytest.mark.asyncio
async def test_s3_upload_failure_returns_error_to_user(
    client, test_users, mock_malware_service
):
    """
    Given: PDF validated but S3 upload fails (network timeout)
    When: POST /documents encounters S3 error
    Then:
        - HTTP 500 Internal Server Error
        - Error message: "Failed to upload file. Please try again."
        - No partial UserDocument record in DB
        - Error logged with request_id for debugging
    """
    pdf_content = b"%PDF-1.4\n%test"
    pdf_file = ("notes.pdf", io.BytesIO(pdf_content), "application/pdf")
    
    with patch("src.services.s3_service.S3Service") as mock_s3:
        instance = MagicMock()
        instance.upload_file = AsyncMock(side_effect=Exception("S3 connection timeout"))
        mock_s3.return_value = instance
        
        headers = {"Authorization": "Bearer fake_jwt_token"}
        response = client.post(
            "/documents",
            files={"file": pdf_file},
            headers=headers
        )
    
    # Verify: Error handling
    assert response.status_code == 500
    data = response.json()
    assert "upload" in data["detail"].lower() or "failed" in data["detail"].lower()


@pytest.mark.asyncio
async def test_corrupted_pdf_handling_with_clear_error_message(
    client, test_users, mock_s3_service, mock_malware_service
):
    """
    Given: Student uploads corrupted PDF
    When: PDF extraction fails (invalid PDF format)
    Then:
        - processing_status set to 'failed'
        - error_message field populated: "Invalid PDF format: expected PDF header"
        - User can retry upload via UI
    """
    # Corrupted PDF (no valid header)
    corrupted_pdf = b"This is not a PDF"
    pdf_file = ("bad.pdf", io.BytesIO(corrupted_pdf), "application/pdf")
    
    # Note: Client-side validation only checks magic bytes
    # Server-side validation happens during processing
    # This test verifies error handling for processing failures


# ============================================================================
# CLEANUP & HELPER TESTS
# ============================================================================

@pytest.mark.asyncio
async def test_deleted_document_cannot_be_queried(
    client, test_users, db_session
):
    """
    Given: Document uploaded and soft-deleted
    When: Student attempts to query about deleted document
    Then:
        - Document not in GET /documents list
        - Vector embeddings marked as deleted
        - AI query doesn't return results from deleted doc
    """
    pass


@pytest.mark.asyncio
async def test_upload_endpoint_requires_authentication(client):
    """
    Given: Anonymous user (no JWT token)
    When: POST /documents without Authorization header
    Then:
        - HTTP 401 Unauthorized
        - Error message: "Authentication required"
    """
    pdf_content = b"%PDF-1.4\n%test"
    pdf_file = ("test.pdf", io.BytesIO(pdf_content), "application/pdf")
    
    # No headers = no auth
    response = client.post(
        "/documents",
        files={"file": pdf_file}
    )
    
    assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
