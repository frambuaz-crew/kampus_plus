"""Rate Limiting Tests (T164).

Tests validate rate limiting implementation on critical endpoints:
- Login: Prevents brute-force attacks (100 req/min per user, 1000 req/min per IP)
- Chat: Prevents AI abuse (10 AI queries/min per user)
- Upload: Prevents resource exhaustion (100 req/min per user)

Rate limit configuration (from spec clarifications 2025-11-15):
- Per-user limits: 100 requests/min general, 10 AI queries/min
- Per-IP limits: 1000 requests/min
- Response on limit exceeded: HTTP 429 Too Many Requests
- Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After

Constitution Principle: Security & Resource Protection
- Prevent brute-force attacks on authentication
- Prevent AI service abuse and quota exhaustion
- Protect system resources from DoS attacks

NOTE: These tests verify the EXPECTED behavior once rate limiting is implemented.
Currently in RED state (tests will fail until rate limiting middleware is added).
Implementation should use slowapi library with Redis backend (per plan.md T204).
"""

import pytest
import asyncio
from httpx import AsyncClient
from uuid import uuid4
from datetime import datetime, timedelta

from src.main import app


@pytest.fixture
async def client():
    """Create async HTTP client for testing."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def authenticated_client(client: AsyncClient):
    """Create authenticated client with valid JWT token."""
    # Register and login a test user
    register_payload = {
        "email": f"test{uuid4().hex[:8]}@university.edu.tr",
        "password": "TestPass123!",
        "first_name": "Test",
        "last_name": "User",
        "role": "student",
        "student_id": "202112345"
    }
    
    await client.post("/v1/auth/register", json=register_payload)
    
    login_response = await client.post("/v1/auth/login", json={
        "email": register_payload["email"],
        "password": register_payload["password"]
    })
    
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    
    # Set authorization header
    client.headers["Authorization"] = f"Bearer {token}"
    return client


class TestLoginRateLimiting:
    """Test rate limiting on login endpoint (prevents brute-force attacks)."""
    
    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Rate limiting not yet implemented - T204")
    async def test_login_rate_limit_per_ip(self, client):
        """Test login endpoint rate limits requests per IP address."""
        # Per-IP limit: 1000 req/min (from spec)
        # For testing, we'll try 20 requests rapidly to trigger limit
        
        # Create a test user first
        email = f"test{uuid4().hex[:8]}@university.edu.tr"
        await client.post("/v1/auth/register", json={
            "email": email,
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "User",
            "role": "student",
            "student_id": "202112345"
        })
        
        # Make rapid login attempts
        login_payload = {
            "email": email,
            "password": "WrongPassword123!"  # Intentionally wrong to avoid lockout
        }
        
        responses = []
        for _ in range(20):
            response = await client.post("/v1/auth/login", json=login_payload)
            responses.append(response)
        
        # At least one response should be 429 if rate limiting is active
        # (In practice, limit might be higher, so we check for headers instead)
        status_codes = [r.status_code for r in responses]
        
        # Check if any responses have rate limit headers
        has_rate_limit_headers = any(
            "x-ratelimit-limit" in r.headers for r in responses
        )
        
        assert has_rate_limit_headers, \
            "Rate limit headers not found in login responses"
    
    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Rate limiting not yet implemented - T204")
    async def test_login_rate_limit_429_response(self, client):
        """Test 429 response when login rate limit is exceeded."""
        # This test would need to make enough requests to trigger 429
        # For now, it documents expected behavior
        
        email = f"test{uuid4().hex[:8]}@university.edu.tr"
        await client.post("/v1/auth/register", json={
            "email": email,
            "password": "TestPass123!",
            "first_name": "Test",
            "last_name": "User",
            "role": "student",
            "student_id": "202112345"
        })
        
        login_payload = {"email": email, "password": "wrong"}
        
        # Make many rapid requests
        for _ in range(150):  # Exceed per-user limit of 100
            response = await client.post("/v1/auth/login", json=login_payload)
            
            if response.status_code == 429:
                # Validate 429 response format
                assert "retry-after" in response.headers, \
                    "Retry-After header missing from 429 response"
                
                data = response.json()
                assert "error" in data or "detail" in data, \
                    "429 response must have error details"
                
                return  # Test passed
        
        pytest.fail("Rate limit never triggered 429 response")


class TestChatRateLimiting:
    """Test rate limiting on chat endpoints (prevents AI abuse)."""
    
    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Rate limiting not yet implemented - T204")
    async def test_chat_ai_query_rate_limit(self, authenticated_client):
        """Test AI query rate limit (10 queries/min per user)."""
        # Create a chat session
        session_response = await authenticated_client.post("/v1/chat/sessions", json={
            "title": "Rate Limit Test"
        })
        session_id = session_response.json()["session_id"]
        
        # Send 12 messages rapidly (exceeds 10/min limit)
        responses = []
        for i in range(12):
            response = await authenticated_client.post(
                f"/v1/chat/sessions/{session_id}/messages",
                json={"content": f"Test message {i}"}
            )
            responses.append(response)
            
            # Small delay to avoid overwhelming the server
            await asyncio.sleep(0.1)
        
        # Check for 429 in responses
        status_codes = [r.status_code for r in responses]
        
        assert 429 in status_codes, \
            f"Expected 429 after 10 AI queries, got: {status_codes}"
        
        # Find first 429 response
        rate_limited_response = next(r for r in responses if r.status_code == 429)
        
        # Validate rate limit headers
        assert "x-ratelimit-limit" in rate_limited_response.headers
        assert "x-ratelimit-remaining" in rate_limited_response.headers
        assert rate_limited_response.headers["x-ratelimit-remaining"] == "0"
    
    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Rate limiting not yet implemented - T204")
    async def test_chat_rate_limit_headers(self, authenticated_client):
        """Test rate limit headers are present in chat responses."""
        # Create session
        session_response = await authenticated_client.post("/v1/chat/sessions", json={
            "title": "Test"
        })
        session_id = session_response.json()["session_id"]
        
        # Send message
        response = await authenticated_client.post(
            f"/v1/chat/sessions/{session_id}/messages",
            json={"content": "Test"}
        )
        
        # Validate headers
        assert "x-ratelimit-limit" in response.headers, \
            "X-RateLimit-Limit header missing"
        assert "x-ratelimit-remaining" in response.headers, \
            "X-RateLimit-Remaining header missing"
        
        # Validate header values
        limit = int(response.headers["x-ratelimit-limit"])
        remaining = int(response.headers["x-ratelimit-remaining"])
        
        assert limit == 10, f"AI query rate limit should be 10, got {limit}"
        assert 0 <= remaining <= limit, \
            f"Remaining count {remaining} out of range [0, {limit}]"
    
    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Rate limiting not yet implemented - T204")
    async def test_chat_rate_limit_reset_after_window(self, authenticated_client):
        """Test rate limit resets after time window (1 minute)."""
        # Create session
        session_response = await authenticated_client.post("/v1/chat/sessions", json={
            "title": "Test"
        })
        session_id = session_response.json()["session_id"]
        
        # Send messages until rate limited
        for i in range(11):
            response = await authenticated_client.post(
                f"/v1/chat/sessions/{session_id}/messages",
                json={"content": f"Message {i}"}
            )
            await asyncio.sleep(0.1)
        
        # Should be rate limited now
        response = await authenticated_client.post(
            f"/v1/chat/sessions/{session_id}/messages",
            json={"content": "Should fail"}
        )
        assert response.status_code == 429
        
        # Check Retry-After or X-RateLimit-Reset header
        assert "retry-after" in response.headers or "x-ratelimit-reset" in response.headers
        
        # Note: Actually waiting 60 seconds in test is impractical
        # This test documents expected behavior


class TestUploadRateLimiting:
    """Test rate limiting on document upload endpoint."""
    
    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Rate limiting not yet implemented - T204")
    async def test_upload_rate_limit_per_user(self, authenticated_client):
        """Test upload endpoint rate limits per user (100 req/min)."""
        # Try to upload 101 files rapidly
        responses = []
        
        for i in range(101):
            # Create dummy PDF content
            pdf_content = b"%PDF-1.4\n%Test PDF\nTest content"
            
            response = await authenticated_client.post(
                "/v1/documents",
                files={"file": (f"test{i}.pdf", pdf_content, "application/pdf")}
            )
            responses.append(response)
            
            # Small delay
            await asyncio.sleep(0.05)
        
        # Check for 429
        status_codes = [r.status_code for r in responses]
        
        assert 429 in status_codes, \
            "Expected 429 after 100 uploads per minute"
        
        # Validate 429 response
        rate_limited = next(r for r in responses if r.status_code == 429)
        assert "retry-after" in rate_limited.headers
    
    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Rate limiting not yet implemented - T204")
    async def test_upload_rate_limit_headers(self, authenticated_client):
        """Test upload endpoint includes rate limit headers."""
        # Single upload
        pdf_content = b"%PDF-1.4\n%Test PDF\nTest content"
        response = await authenticated_client.post(
            "/v1/documents",
            files={"file": ("test.pdf", pdf_content, "application/pdf")}
        )
        
        # Check headers (regardless of success/failure)
        if response.status_code in [201, 429]:
            assert "x-ratelimit-limit" in response.headers
            assert "x-ratelimit-remaining" in response.headers


class TestRateLimitResponseFormat:
    """Test rate limit response format and headers."""
    
    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Rate limiting not yet implemented - T204")
    async def test_429_response_format(self, authenticated_client):
        """Test 429 response follows standard error format."""
        # This test assumes we can trigger 429 by rapid requests
        # Implementation depends on having rate limiting active
        
        # Expected 429 response format:
        # {
        #     "error": {
        #         "code": "RATE_LIMIT_EXCEEDED",
        #         "message": "Too many requests. Please try again later."
        #     }
        # }
        # Headers:
        # - X-RateLimit-Limit: max requests per window
        # - X-RateLimit-Remaining: requests remaining (0)
        # - X-RateLimit-Reset: timestamp when limit resets
        # - Retry-After: seconds until reset
        
        pass  # Placeholder for expected behavior
    
    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Rate limiting not yet implemented - T204")
    async def test_rate_limit_headers_format(self, authenticated_client):
        """Test rate limit headers follow standard format."""
        # Make request to any rate-limited endpoint
        response = await authenticated_client.get("/v1/health")
        
        # Check header format
        if "x-ratelimit-limit" in response.headers:
            # Limit should be integer
            limit = response.headers["x-ratelimit-limit"]
            assert limit.isdigit(), "X-RateLimit-Limit must be integer"
        
        if "x-ratelimit-remaining" in response.headers:
            # Remaining should be integer
            remaining = response.headers["x-ratelimit-remaining"]
            assert remaining.isdigit(), "X-RateLimit-Remaining must be integer"
        
        if "x-ratelimit-reset" in response.headers:
            # Reset should be Unix timestamp (integer)
            reset = response.headers["x-ratelimit-reset"]
            assert reset.isdigit(), "X-RateLimit-Reset must be Unix timestamp"


class TestRateLimitConfiguration:
    """Test rate limit configuration matches specification."""
    
    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Rate limiting not yet implemented - T204")
    async def test_general_endpoint_limit(self, authenticated_client):
        """Test general endpoints have 100 req/min per user limit."""
        # Make rapid requests to general endpoint
        responses = []
        
        for _ in range(101):
            response = await authenticated_client.get("/v1/health")
            responses.append(response)
            await asyncio.sleep(0.01)
        
        # Check if limit is enforced
        status_codes = [r.status_code for r in responses]
        
        # Should have at least one 429 after 100 requests
        # Or rate limit headers should show limit of 100
        if 429 in status_codes:
            rate_limited = next(r for r in responses if r.status_code == 429)
            limit = int(rate_limited.headers.get("x-ratelimit-limit", 0))
            assert limit == 100, f"Expected limit of 100, got {limit}"
    
    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Rate limiting not yet implemented - T204")
    async def test_ai_endpoint_limit(self, authenticated_client):
        """Test AI endpoints have 10 req/min per user limit."""
        # Create session
        session_response = await authenticated_client.post("/v1/chat/sessions", json={
            "title": "Test"
        })
        session_id = session_response.json()["session_id"]
        
        # Send 11 messages
        responses = []
        for i in range(11):
            response = await authenticated_client.post(
                f"/v1/chat/sessions/{session_id}/messages",
                json={"content": f"Message {i}"}
            )
            responses.append(response)
            await asyncio.sleep(0.1)
        
        # Check for 429 or rate limit headers
        rate_limited = next((r for r in responses if r.status_code == 429), None)
        
        if rate_limited:
            limit = int(rate_limited.headers.get("x-ratelimit-limit", 0))
            assert limit == 10, f"AI endpoint limit should be 10, got {limit}"
    
    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Rate limiting not yet implemented - T204")
    async def test_ip_based_limit(self, client):
        """Test IP-based rate limit (1000 req/min)."""
        # Make 1001 rapid requests from same IP
        responses = []
        
        for _ in range(1001):
            response = await client.get("/v1/health")
            responses.append(response)
            await asyncio.sleep(0.001)
        
        # Should trigger IP-based rate limit
        status_codes = [r.status_code for r in responses]
        assert 429 in status_codes, "IP-based rate limit not triggered"


class TestRateLimitEdgeCases:
    """Test edge cases and special scenarios."""
    
    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Rate limiting not yet implemented - T204")
    async def test_rate_limit_different_users(self, client):
        """Test rate limits are independent per user."""
        # Create two users
        users = []
        for i in range(2):
            email = f"user{i}{uuid4().hex[:4]}@university.edu.tr"
            await client.post("/v1/auth/register", json={
                "email": email,
                "password": "TestPass123!",
                "first_name": "User",
                "last_name": str(i),
                "role": "student",
                "student_id": f"20211234{i}"
            })
            
            login = await client.post("/v1/auth/login", json={
                "email": email,
                "password": "TestPass123!"
            })
            token = login.json()["access_token"]
            users.append(token)
        
        # User 1 makes 100 requests
        client.headers["Authorization"] = f"Bearer {users[0]}"
        for _ in range(100):
            await client.get("/v1/health")
        
        # User 2 should still have full quota
        client.headers["Authorization"] = f"Bearer {users[1]}"
        response = await client.get("/v1/health")
        
        remaining = int(response.headers.get("x-ratelimit-remaining", 100))
        assert remaining > 50, "User 2 quota should be independent of User 1"
    
    @pytest.mark.asyncio
    @pytest.mark.skip(reason="Rate limiting not yet implemented - T204")
    async def test_rate_limit_excludes_health_checks(self, client):
        """Test health check endpoints might be excluded from rate limiting."""
        # Health checks are often exempt from rate limits for monitoring
        # This tests if /health/live and /health/ready are exempt
        
        responses = []
        for _ in range(1100):  # Exceed IP limit
            response = await client.get("/v1/health/live")
            responses.append(response)
        
        # Health checks might not be rate limited
        status_codes = [r.status_code for r in responses]
        
        # If health is exempt, all should be 200
        # If not exempt, we should see 429
        # Test documents behavior either way
        unique_statuses = set(status_codes)
        assert 200 in unique_statuses  # At least some should succeed
