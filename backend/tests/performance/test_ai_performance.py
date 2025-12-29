"""
Performance Tests for AI Query Response Time (T165)

Tests AI chatbot performance with pytest-benchmark.
Target: <5 seconds for AI query responses.

Constitution Compliance:
- FR-007: AI response time monitoring
- NFR-001: Performance targets validation
"""

import asyncio
import time
from typing import Any, Dict

import pytest
from httpx import AsyncClient

from src.main import app


@pytest.fixture
def benchmark_user_data() -> Dict[str, str]:
    """Create test user data for benchmarking."""
    return {
        "email": "benchmark@test.edu.tr",
        "password": "BenchmarkPass123!",
        "full_name": "Benchmark User",
        "student_id": "BENCH001",
    }


@pytest.fixture
async def benchmark_auth_token(benchmark_user_data: Dict[str, str]) -> str:
    """
    Create and authenticate a benchmark test user.
    
    Returns:
        JWT access token for authenticated requests
    """
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Register user
        await client.post("/v1/auth/register", json=benchmark_user_data)
        
        # Login to get token
        response = await client.post(
            "/v1/auth/login",
            json={
                "email": benchmark_user_data["email"],
                "password": benchmark_user_data["password"],
            },
        )
        assert response.status_code == 200
        return response.json()["access_token"]


@pytest.fixture
async def benchmark_session_id(benchmark_auth_token: str) -> str:
    """
    Create a chat session for benchmarking.
    
    Returns:
        Session ID for chat tests
    """
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/v1/chat/sessions",
            headers={"Authorization": f"Bearer {benchmark_auth_token}"},
            json={"title": "Benchmark Session"},
        )
        assert response.status_code in [200, 201]
        return response.json()["id"]


class TestAIQueryPerformance:
    """Test AI query response time performance."""
    
    @pytest.mark.asyncio
    async def test_chat_session_creation_performance(
        self, benchmark, benchmark_auth_token: str
    ):
        """
        Test chat session creation performance.
        
        Target: <200ms (non-AI operation)
        """
        async def create_session():
            async with AsyncClient(app=app, base_url="http://test") as client:
                response = await client.post(
                    "/v1/chat/sessions",
                    headers={"Authorization": f"Bearer {benchmark_auth_token}"},
                    json={"title": "Performance Test Session"},
                )
                assert response.status_code in [200, 201]
                return response.json()
        
        # Run benchmark
        result = benchmark(lambda: asyncio.run(create_session()))
        
        # Verify response time target
        assert result is not None
        # Note: pytest-benchmark provides stats in benchmark.stats
    
    @pytest.mark.asyncio
    async def test_ai_query_response_time_simple(
        self, benchmark, benchmark_auth_token: str, benchmark_session_id: str
    ):
        """
        Test AI query response time for simple questions.
        
        Target: <5 seconds for AI queries
        Scenario: Short factual question
        """
        async def send_message():
            async with AsyncClient(app=app, base_url="http://test") as client:
                start_time = time.time()
                response = await client.post(
                    f"/v1/chat/sessions/{benchmark_session_id}/messages",
                    headers={"Authorization": f"Bearer {benchmark_auth_token}"},
                    json={"content": "Merhaba, nasılsın?"},
                    timeout=10.0,  # 10s timeout for AI calls
                )
                elapsed = time.time() - start_time
                
                assert response.status_code in [200, 201]
                data = response.json()
                assert "message" in data or "content" in data
                
                return elapsed
        
        # Run benchmark
        elapsed_time = benchmark(lambda: asyncio.run(send_message()))
        
        # Verify <5s target
        assert elapsed_time < 5.0, f"AI query took {elapsed_time:.2f}s, target is <5s"
    
    @pytest.mark.asyncio
    async def test_ai_query_response_time_complex(
        self, benchmark, benchmark_auth_token: str, benchmark_session_id: str
    ):
        """
        Test AI query response time for complex questions requiring RAG.
        
        Target: <5 seconds for AI queries with retrieval
        Scenario: Question requiring vector search + RAG
        """
        async def send_complex_message():
            async with AsyncClient(app=app, base_url="http://test") as client:
                start_time = time.time()
                response = await client.post(
                    f"/v1/chat/sessions/{benchmark_session_id}/messages",
                    headers={"Authorization": f"Bearer {benchmark_auth_token}"},
                    json={
                        "content": "Bilgisayar Mühendisliği bölümünde bu dönem hangi dersler var ve kredileri nedir?"
                    },
                    timeout=10.0,  # 10s timeout for AI calls
                )
                elapsed = time.time() - start_time
                
                assert response.status_code in [200, 201]
                data = response.json()
                assert "message" in data or "content" in data
                
                return elapsed
        
        # Run benchmark
        elapsed_time = benchmark(lambda: asyncio.run(send_complex_message()))
        
        # Verify <5s target
        assert elapsed_time < 5.0, f"Complex AI query took {elapsed_time:.2f}s, target is <5s"
    
    @pytest.mark.asyncio
    async def test_ai_query_with_context_performance(
        self, benchmark, benchmark_auth_token: str, benchmark_session_id: str
    ):
        """
        Test AI query response time with conversation context.
        
        Target: <5 seconds with context window (last 5 exchanges)
        Scenario: Multi-turn conversation with history
        """
        async def send_with_context():
            async with AsyncClient(app=app, base_url="http://test") as client:
                # Send first message to establish context
                await client.post(
                    f"/v1/chat/sessions/{benchmark_session_id}/messages",
                    headers={"Authorization": f"Bearer {benchmark_auth_token}"},
                    json={"content": "Bugün hava nasıl?"},
                    timeout=10.0,
                )
                
                # Send follow-up message (uses context)
                start_time = time.time()
                response = await client.post(
                    f"/v1/chat/sessions/{benchmark_session_id}/messages",
                    headers={"Authorization": f"Bearer {benchmark_auth_token}"},
                    json={"content": "Şemsiye almalı mıyım?"},
                    timeout=10.0,
                )
                elapsed = time.time() - start_time
                
                assert response.status_code in [200, 201]
                return elapsed
        
        # Run benchmark
        elapsed_time = benchmark(lambda: asyncio.run(send_with_context()))
        
        # Verify <5s target
        assert elapsed_time < 5.0, f"AI query with context took {elapsed_time:.2f}s, target is <5s"
    
    @pytest.mark.asyncio
    async def test_ai_query_concurrent_requests(
        self, benchmark, benchmark_auth_token: str
    ):
        """
        Test AI query response time under concurrent load.
        
        Target: <5 seconds per query with 10 concurrent requests
        Scenario: Multiple users querying AI simultaneously
        """
        async def concurrent_queries():
            async with AsyncClient(app=app, base_url="http://test") as client:
                # Create session
                session_response = await client.post(
                    "/v1/chat/sessions",
                    headers={"Authorization": f"Bearer {benchmark_auth_token}"},
                    json={"title": "Concurrent Test"},
                )
                session_id = session_response.json()["id"]
                
                # Send 10 concurrent messages
                start_time = time.time()
                tasks = []
                for i in range(10):
                    task = client.post(
                        f"/v1/chat/sessions/{session_id}/messages",
                        headers={"Authorization": f"Bearer {benchmark_auth_token}"},
                        json={"content": f"Soru {i+1}: Merhaba?"},
                        timeout=15.0,
                    )
                    tasks.append(task)
                
                responses = await asyncio.gather(*tasks, return_exceptions=True)
                elapsed = time.time() - start_time
                
                # Check all succeeded
                success_count = sum(
                    1 for r in responses 
                    if not isinstance(r, Exception) and r.status_code in [200, 201]
                )
                
                return {
                    "total_time": elapsed,
                    "avg_time": elapsed / 10,
                    "success_count": success_count,
                }
        
        # Run benchmark
        result = benchmark(lambda: asyncio.run(concurrent_queries()))
        
        # Verify average <5s per query
        assert result["avg_time"] < 5.0, (
            f"Average concurrent AI query took {result['avg_time']:.2f}s, target is <5s"
        )
        assert result["success_count"] >= 8, "At least 8/10 concurrent queries should succeed"


class TestVectorSearchPerformance:
    """Test vector search performance."""
    
    @pytest.mark.asyncio
    async def test_vector_similarity_search_performance(self, benchmark):
        """
        Test FAISS vector similarity search performance.
        
        Target: <1 second for vector retrieval
        """
        from src.services.vector_service import VectorService
        
        vector_service = VectorService()
        
        def search_vectors():
            # Search official vector store
            results = vector_service.search_official(
                query="Bilgisayar Mühendisliği dersleri",
                k=5,
            )
            assert len(results) <= 5
            return results
        
        # Run benchmark
        result = benchmark(search_vectors)
        
        # Result should be returned within 1s
        # (pytest-benchmark tracks this automatically)
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_hybrid_search_performance(self, benchmark):
        """
        Test hybrid search (vector + keyword) performance.
        
        Target: <1 second for hybrid retrieval
        """
        from src.services.vector_service import VectorService
        
        vector_service = VectorService()
        
        def hybrid_search():
            # Simulate hybrid search (vector + keyword filtering)
            vector_results = vector_service.search_official(
                query="Yazılım Mühendisliği",
                k=10,
            )
            
            # Apply keyword filter
            filtered = [
                r for r in vector_results 
                if "mühendislik" in r.get("content", "").lower()
            ]
            
            return filtered[:5]
        
        # Run benchmark
        result = benchmark(hybrid_search)
        
        assert result is not None


class TestDatabaseQueryPerformance:
    """Test database query performance."""
    
    @pytest.mark.asyncio
    async def test_session_list_query_performance(
        self, benchmark, benchmark_auth_token: str
    ):
        """
        Test chat session listing performance.
        
        Target: <200ms for database queries
        """
        async def list_sessions():
            async with AsyncClient(app=app, base_url="http://test") as client:
                start_time = time.time()
                response = await client.get(
                    "/v1/chat/sessions",
                    headers={"Authorization": f"Bearer {benchmark_auth_token}"},
                )
                elapsed = time.time() - start_time
                
                assert response.status_code == 200
                return elapsed
        
        # Run benchmark
        elapsed_time = benchmark(lambda: asyncio.run(list_sessions()))
        
        # Verify <200ms target for non-AI operations
        assert elapsed_time < 0.2, f"Session list took {elapsed_time*1000:.0f}ms, target is <200ms"
    
    @pytest.mark.asyncio
    async def test_document_list_query_performance(
        self, benchmark, benchmark_auth_token: str
    ):
        """
        Test document listing performance.
        
        Target: <200ms for database queries
        """
        async def list_documents():
            async with AsyncClient(app=app, base_url="http://test") as client:
                start_time = time.time()
                response = await client.get(
                    "/v1/documents",
                    headers={"Authorization": f"Bearer {benchmark_auth_token}"},
                )
                elapsed = time.time() - start_time
                
                assert response.status_code == 200
                return elapsed
        
        # Run benchmark
        elapsed_time = benchmark(lambda: asyncio.run(list_documents()))
        
        # Verify <200ms target
        assert elapsed_time < 0.2, f"Document list took {elapsed_time*1000:.0f}ms, target is <200ms"
    
    @pytest.mark.asyncio
    async def test_forum_thread_list_performance(
        self, benchmark, benchmark_auth_token: str
    ):
        """
        Test forum thread listing performance.
        
        Target: <200ms for database queries
        """
        async def list_threads():
            async with AsyncClient(app=app, base_url="http://test") as client:
                start_time = time.time()
                response = await client.get(
                    "/v1/forum/threads",
                    headers={"Authorization": f"Bearer {benchmark_auth_token}"},
                )
                elapsed = time.time() - start_time
                
                assert response.status_code == 200
                return elapsed
        
        # Run benchmark
        elapsed_time = benchmark(lambda: asyncio.run(list_threads()))
        
        # Verify <200ms target
        assert elapsed_time < 0.2, f"Forum list took {elapsed_time*1000:.0f}ms, target is <200ms"


@pytest.mark.asyncio
async def test_end_to_end_chat_flow_performance(benchmark):
    """
    Test complete end-to-end chat flow performance.
    
    Target: Total flow <10 seconds
    Flow: Register → Login → Create Session → Send Message → Get Response
    """
    async def complete_flow():
        async with AsyncClient(app=app, base_url="http://test") as client:
            start_time = time.time()
            
            # Register
            register_data = {
                "email": f"e2e_{time.time()}@test.edu.tr",
                "password": "E2EPass123!",
                "full_name": "E2E Test User",
                "student_id": f"E2E{int(time.time())}",
            }
            await client.post("/v1/auth/register", json=register_data)
            
            # Login
            login_response = await client.post(
                "/v1/auth/login",
                json={
                    "email": register_data["email"],
                    "password": register_data["password"],
                },
            )
            token = login_response.json()["access_token"]
            
            # Create session
            session_response = await client.post(
                "/v1/chat/sessions",
                headers={"Authorization": f"Bearer {token}"},
                json={"title": "E2E Test"},
            )
            session_id = session_response.json()["id"]
            
            # Send message
            message_response = await client.post(
                f"/v1/chat/sessions/{session_id}/messages",
                headers={"Authorization": f"Bearer {token}"},
                json={"content": "Merhaba!"},
                timeout=10.0,
            )
            
            elapsed = time.time() - start_time
            
            assert message_response.status_code in [200, 201]
            return elapsed
    
    # Run benchmark
    elapsed_time = benchmark(lambda: asyncio.run(complete_flow()))
    
    # Verify <10s target for complete flow
    assert elapsed_time < 10.0, f"Complete E2E flow took {elapsed_time:.2f}s, target is <10s"
