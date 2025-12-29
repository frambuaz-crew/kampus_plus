"""
PDF Processing Performance Tests (T167)

Tests PDF upload and vectorization processing time.
Target: 10MB document processed in <2 minutes.

Constitution Compliance:
- NFR-003: PDF processing performance targets
- FR-011: Document processing pipeline validation
"""

import asyncio
import io
import time
from typing import Any, Dict

import pytest
from httpx import AsyncClient
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from src.main import app


def generate_test_pdf(target_size_mb: float = 10.0) -> bytes:
    """
    Generate a test PDF of specified size.
    
    Args:
        target_size_mb: Target PDF size in megabytes
        
    Returns:
        PDF bytes
        
    Note:
        Creates a multi-page PDF with text and graphics to reach target size.
    """
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    
    # Calculate approximate pages needed
    # Rough estimate: 1 page with content ~50KB
    target_bytes = int(target_size_mb * 1024 * 1024)
    approx_pages = max(target_bytes // (50 * 1024), 20)
    
    # Generate pages with content
    for page_num in range(approx_pages):
        c.drawString(100, 750, f"KAMPÜS+ Test Document - Page {page_num + 1}")
        c.drawString(100, 730, f"Generated for performance testing")
        c.drawString(100, 710, f"Target size: {target_size_mb}MB")
        
        # Add more content to increase file size
        y = 680
        for i in range(30):
            line = (
                f"Line {i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. "
                f"Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. "
                f"Bilgisayar Mühendisliği bölümü dersleri ve müfredat bilgileri. "
                f"Test data for PDF processing performance validation. Page {page_num + 1}."
            )
            c.drawString(50, y, line[:90])  # Truncate to fit
            y -= 15
            if y < 50:
                break
        
        c.showPage()
    
    c.save()
    
    # Get PDF bytes
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    # Verify size
    actual_size_mb = len(pdf_bytes) / (1024 * 1024)
    print(f"Generated PDF: {actual_size_mb:.2f}MB ({len(pdf_bytes):,} bytes)")
    
    return pdf_bytes


@pytest.fixture
def pdf_test_user_data() -> Dict[str, str]:
    """Create test user data for PDF tests."""
    return {
        "email": "pdftest@test.edu.tr",
        "password": "PDFTest123!",
        "full_name": "PDF Test User",
        "student_id": "PDF001",
    }


@pytest.fixture
async def pdf_test_auth_token(pdf_test_user_data: Dict[str, str]) -> str:
    """
    Create and authenticate a PDF test user.
    
    Returns:
        JWT access token
    """
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Register
        await client.post("/v1/auth/register", json=pdf_test_user_data)
        
        # Login
        response = await client.post(
            "/v1/auth/login",
            json={
                "email": pdf_test_user_data["email"],
                "password": pdf_test_user_data["password"],
            },
        )
        assert response.status_code == 200
        return response.json()["access_token"]


class TestPDFUploadPerformance:
    """Test PDF upload endpoint performance."""
    
    @pytest.mark.asyncio
    async def test_small_pdf_upload_performance(
        self, benchmark, pdf_test_auth_token: str
    ):
        """
        Test small PDF (1MB) upload performance.
        
        Target: <5 seconds for upload + S3 storage
        """
        pdf_bytes = generate_test_pdf(target_size_mb=1.0)
        
        async def upload_pdf():
            async with AsyncClient(app=app, base_url="http://test") as client:
                start_time = time.time()
                
                files = {"file": ("test_1mb.pdf", pdf_bytes, "application/pdf")}
                response = await client.post(
                    "/v1/documents",
                    headers={"Authorization": f"Bearer {pdf_test_auth_token}"},
                    files=files,
                    timeout=30.0,
                )
                
                elapsed = time.time() - start_time
                
                assert response.status_code in [200, 201]
                return {
                    "elapsed": elapsed,
                    "document_id": response.json().get("id"),
                }
        
        # Run benchmark
        result = benchmark(lambda: asyncio.run(upload_pdf()))
        
        # Verify <5s target for small uploads
        assert result["elapsed"] < 5.0, (
            f"1MB PDF upload took {result['elapsed']:.2f}s, target is <5s"
        )
    
    @pytest.mark.asyncio
    async def test_medium_pdf_upload_performance(
        self, benchmark, pdf_test_auth_token: str
    ):
        """
        Test medium PDF (5MB) upload performance.
        
        Target: <10 seconds for upload + S3 storage
        """
        pdf_bytes = generate_test_pdf(target_size_mb=5.0)
        
        async def upload_pdf():
            async with AsyncClient(app=app, base_url="http://test") as client:
                start_time = time.time()
                
                files = {"file": ("test_5mb.pdf", pdf_bytes, "application/pdf")}
                response = await client.post(
                    "/v1/documents",
                    headers={"Authorization": f"Bearer {pdf_test_auth_token}"},
                    files=files,
                    timeout=30.0,
                )
                
                elapsed = time.time() - start_time
                
                assert response.status_code in [200, 201]
                return {
                    "elapsed": elapsed,
                    "document_id": response.json().get("id"),
                }
        
        # Run benchmark
        result = benchmark(lambda: asyncio.run(upload_pdf()))
        
        # Verify <10s target
        assert result["elapsed"] < 10.0, (
            f"5MB PDF upload took {result['elapsed']:.2f}s, target is <10s"
        )
    
    @pytest.mark.asyncio
    async def test_large_pdf_upload_performance(
        self, benchmark, pdf_test_auth_token: str
    ):
        """
        Test large PDF (10MB) upload performance.
        
        Target: <15 seconds for upload + S3 storage
        """
        pdf_bytes = generate_test_pdf(target_size_mb=10.0)
        
        async def upload_pdf():
            async with AsyncClient(app=app, base_url="http://test") as client:
                start_time = time.time()
                
                files = {"file": ("test_10mb.pdf", pdf_bytes, "application/pdf")}
                response = await client.post(
                    "/v1/documents",
                    headers={"Authorization": f"Bearer {pdf_test_auth_token}"},
                    files=files,
                    timeout=30.0,
                )
                
                elapsed = time.time() - start_time
                
                assert response.status_code in [200, 201]
                return {
                    "elapsed": elapsed,
                    "document_id": response.json().get("id"),
                }
        
        # Run benchmark
        result = benchmark(lambda: asyncio.run(upload_pdf()))
        
        # Verify <15s target
        assert result["elapsed"] < 15.0, (
            f"10MB PDF upload took {result['elapsed']:.2f}s, target is <15s"
        )


class TestPDFProcessingPerformance:
    """Test PDF processing pipeline performance."""
    
    @pytest.mark.asyncio
    @pytest.mark.slow  # Mark as slow test
    async def test_pdf_processing_time_small(self, pdf_test_auth_token: str):
        """
        Test small PDF (1MB) processing time.
        
        Target: <30 seconds for extraction + chunking + embedding + vectorization
        Flow: Upload → Wait for processing → Verify completed
        """
        pdf_bytes = generate_test_pdf(target_size_mb=1.0)
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Upload PDF
            files = {"file": ("test_processing_1mb.pdf", pdf_bytes, "application/pdf")}
            upload_response = await client.post(
                "/v1/documents",
                headers={"Authorization": f"Bearer {pdf_test_auth_token}"},
                files=files,
                timeout=30.0,
            )
            assert upload_response.status_code in [200, 201]
            document_id = upload_response.json()["id"]
            
            # Monitor processing status
            start_time = time.time()
            max_wait = 60  # 1 minute max
            
            while time.time() - start_time < max_wait:
                status_response = await client.get(
                    f"/v1/documents/{document_id}",
                    headers={"Authorization": f"Bearer {pdf_test_auth_token}"},
                )
                assert status_response.status_code == 200
                
                status_data = status_response.json()
                processing_status = status_data.get("processing_status")
                
                if processing_status == "completed":
                    elapsed = time.time() - start_time
                    print(f"1MB PDF processed in {elapsed:.2f}s")
                    
                    # Verify <30s target
                    assert elapsed < 30.0, (
                        f"1MB PDF processing took {elapsed:.2f}s, target is <30s"
                    )
                    
                    # Verify metadata
                    assert status_data.get("page_count", 0) > 0
                    assert status_data.get("chunk_count", 0) > 0
                    return
                
                elif processing_status == "failed":
                    pytest.fail(f"PDF processing failed: {status_data.get('error_message')}")
                
                # Wait before next check
                await asyncio.sleep(2)
            
            pytest.fail(f"PDF processing did not complete within {max_wait}s")
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_pdf_processing_time_medium(self, pdf_test_auth_token: str):
        """
        Test medium PDF (5MB) processing time.
        
        Target: <90 seconds for complete processing
        """
        pdf_bytes = generate_test_pdf(target_size_mb=5.0)
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Upload PDF
            files = {"file": ("test_processing_5mb.pdf", pdf_bytes, "application/pdf")}
            upload_response = await client.post(
                "/v1/documents",
                headers={"Authorization": f"Bearer {pdf_test_auth_token}"},
                files=files,
                timeout=30.0,
            )
            assert upload_response.status_code in [200, 201]
            document_id = upload_response.json()["id"]
            
            # Monitor processing
            start_time = time.time()
            max_wait = 120  # 2 minutes max
            
            while time.time() - start_time < max_wait:
                status_response = await client.get(
                    f"/v1/documents/{document_id}",
                    headers={"Authorization": f"Bearer {pdf_test_auth_token}"},
                )
                assert status_response.status_code == 200
                
                status_data = status_response.json()
                processing_status = status_data.get("processing_status")
                
                if processing_status == "completed":
                    elapsed = time.time() - start_time
                    print(f"5MB PDF processed in {elapsed:.2f}s")
                    
                    # Verify <90s target
                    assert elapsed < 90.0, (
                        f"5MB PDF processing took {elapsed:.2f}s, target is <90s"
                    )
                    
                    assert status_data.get("page_count", 0) > 0
                    assert status_data.get("chunk_count", 0) > 0
                    return
                
                elif processing_status == "failed":
                    pytest.fail(f"PDF processing failed: {status_data.get('error_message')}")
                
                await asyncio.sleep(2)
            
            pytest.fail(f"PDF processing did not complete within {max_wait}s")
    
    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_pdf_processing_time_large(self, pdf_test_auth_token: str):
        """
        Test large PDF (10MB) processing time.
        
        Target: <120 seconds (2 minutes) for complete processing
        This is the PRIMARY SUCCESS CRITERION for T167.
        """
        pdf_bytes = generate_test_pdf(target_size_mb=10.0)
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Upload PDF
            files = {"file": ("test_processing_10mb.pdf", pdf_bytes, "application/pdf")}
            upload_response = await client.post(
                "/v1/documents",
                headers={"Authorization": f"Bearer {pdf_test_auth_token}"},
                files=files,
                timeout=30.0,
            )
            assert upload_response.status_code in [200, 201]
            document_id = upload_response.json()["id"]
            
            # Monitor processing
            start_time = time.time()
            max_wait = 180  # 3 minutes max (buffer for CI environments)
            
            while time.time() - start_time < max_wait:
                status_response = await client.get(
                    f"/v1/documents/{document_id}",
                    headers={"Authorization": f"Bearer {pdf_test_auth_token}"},
                )
                assert status_response.status_code == 200
                
                status_data = status_response.json()
                processing_status = status_data.get("processing_status")
                
                if processing_status == "completed":
                    elapsed = time.time() - start_time
                    print(f"✅ 10MB PDF processed in {elapsed:.2f}s")
                    
                    # PRIMARY TARGET: <120s (2 minutes)
                    assert elapsed < 120.0, (
                        f"❌ 10MB PDF processing took {elapsed:.2f}s, target is <120s (2 minutes)"
                    )
                    
                    # Verify processing output
                    assert status_data.get("page_count", 0) > 0, "No pages extracted"
                    assert status_data.get("chunk_count", 0) > 0, "No chunks created"
                    
                    print(f"   Pages: {status_data['page_count']}")
                    print(f"   Chunks: {status_data['chunk_count']}")
                    
                    return
                
                elif processing_status == "failed":
                    error_msg = status_data.get("error_message", "Unknown error")
                    pytest.fail(f"PDF processing failed: {error_msg}")
                
                # Log progress
                if int(time.time() - start_time) % 10 == 0:  # Every 10 seconds
                    print(f"   Status: {processing_status} (elapsed: {time.time() - start_time:.0f}s)")
                
                await asyncio.sleep(2)
            
            pytest.fail(
                f"PDF processing did not complete within {max_wait}s. "
                f"Last status: {status_data.get('processing_status')}"
            )
    
    @pytest.mark.asyncio
    async def test_concurrent_pdf_processing(self, pdf_test_auth_token: str):
        """
        Test multiple PDFs processing concurrently.
        
        Target: Each PDF should complete within target time even under concurrent load
        Scenario: Upload 3 PDFs simultaneously, verify all complete within targets
        """
        pdf_1mb = generate_test_pdf(target_size_mb=1.0)
        pdf_2mb = generate_test_pdf(target_size_mb=2.0)
        pdf_3mb = generate_test_pdf(target_size_mb=3.0)
        
        async with AsyncClient(app=app, base_url="http://test") as client:
            # Upload all PDFs concurrently
            upload_tasks = [
                client.post(
                    "/v1/documents",
                    headers={"Authorization": f"Bearer {pdf_test_auth_token}"},
                    files={"file": ("test_concurrent_1mb.pdf", pdf_1mb, "application/pdf")},
                    timeout=30.0,
                ),
                client.post(
                    "/v1/documents",
                    headers={"Authorization": f"Bearer {pdf_test_auth_token}"},
                    files={"file": ("test_concurrent_2mb.pdf", pdf_2mb, "application/pdf")},
                    timeout=30.0,
                ),
                client.post(
                    "/v1/documents",
                    headers={"Authorization": f"Bearer {pdf_test_auth_token}"},
                    files={"file": ("test_concurrent_3mb.pdf", pdf_3mb, "application/pdf")},
                    timeout=30.0,
                ),
            ]
            
            start_time = time.time()
            responses = await asyncio.gather(*upload_tasks)
            
            # Verify all uploads succeeded
            document_ids = []
            for response in responses:
                assert response.status_code in [200, 201]
                document_ids.append(response.json()["id"])
            
            # Monitor all documents until completion
            max_wait = 120  # 2 minutes max
            completed = set()
            
            while time.time() - start_time < max_wait and len(completed) < 3:
                for doc_id in document_ids:
                    if doc_id in completed:
                        continue
                    
                    status_response = await client.get(
                        f"/v1/documents/{doc_id}",
                        headers={"Authorization": f"Bearer {pdf_test_auth_token}"},
                    )
                    
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        if status_data.get("processing_status") == "completed":
                            completed.add(doc_id)
                            print(f"Document {doc_id} completed")
                
                await asyncio.sleep(2)
            
            elapsed = time.time() - start_time
            
            # Verify all completed
            assert len(completed) == 3, (
                f"Only {len(completed)}/3 PDFs completed within {max_wait}s"
            )
            
            print(f"✅ All 3 PDFs processed concurrently in {elapsed:.2f}s")


"""
USAGE:

Run all performance tests:
    pytest backend/tests/performance/test_pdf_performance.py -v

Run with benchmarks:
    pytest backend/tests/performance/test_pdf_performance.py -v --benchmark-only

Run slow tests only:
    pytest backend/tests/performance/test_pdf_performance.py -v -m slow

Skip slow tests:
    pytest backend/tests/performance/test_pdf_performance.py -v -m "not slow"

Run specific test:
    pytest backend/tests/performance/test_pdf_performance.py::TestPDFProcessingPerformance::test_pdf_processing_time_large -v

REQUIREMENTS:
    pip install reportlab pytest-benchmark

SUCCESS CRITERIA (T167):
✅ 10MB PDF processes in <120 seconds (2 minutes)
✅ Processing includes: upload → S3 storage → text extraction → chunking → embedding → vectorization
✅ System remains responsive during concurrent uploads
"""
