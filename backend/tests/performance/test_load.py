"""
Load Testing with Locust (T166)

Tests system performance under 500 concurrent users.
Target: p95 latency <200ms for non-AI endpoints.

Constitution Compliance:
- NFR-001: 500+ concurrent users during peak times
- NFR-002: API response time <200ms p95 for non-AI queries

Run with: locust -f backend/tests/performance/test_load.py --host=http://localhost:8000
"""

import random
import time
from typing import Any, Dict

from locust import HttpUser, between, task


class KampusPlusUser(HttpUser):
    """
    Simulates a typical KAMPÜS+ user interacting with the platform.
    
    User behavior:
    - 40% probability: Browse health/info endpoints
    - 30% probability: Browse forum threads
    - 20% probability: Manage documents
    - 10% probability: Chat with AI (slower, less frequent)
    """
    
    # Wait between 1-5 seconds between tasks
    wait_time = between(1, 5)
    
    def on_start(self):
        """
        Initialize user session - register and login.
        Runs once per simulated user.
        """
        # Generate unique user
        timestamp = int(time.time() * 1000)
        user_id = random.randint(1000, 9999)
        self.email = f"loadtest_{timestamp}_{user_id}@test.edu.tr"
        self.password = "LoadTest123!"
        self.token = None
        self.session_id = None
        
        # Register user
        with self.client.post(
            "/v1/auth/register",
            json={
                "email": self.email,
                "password": self.password,
                "full_name": f"Load Test User {user_id}",
                "student_id": f"LT{timestamp}{user_id}",
            },
            catch_response=True,
        ) as response:
            if response.status_code in [200, 201]:
                response.success()
            else:
                response.failure(f"Registration failed: {response.status_code}")
        
        # Login to get token
        with self.client.post(
            "/v1/auth/login",
            json={
                "email": self.email,
                "password": self.password,
            },
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                self.token = response.json().get("access_token")
                response.success()
            else:
                response.failure(f"Login failed: {response.status_code}")
    
    def _get_headers(self) -> Dict[str, str]:
        """Get authorization headers."""
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}
    
    # ========================================================================
    # Health & Info Endpoints (40% weight)
    # Target: <200ms p95
    # ========================================================================
    
    @task(20)
    def health_check(self):
        """Check API health endpoint."""
        with self.client.get("/health", catch_response=True) as response:
            if response.status_code == 200:
                if response.elapsed.total_seconds() < 0.2:
                    response.success()
                else:
                    response.failure(
                        f"Health check took {response.elapsed.total_seconds():.3f}s (>200ms)"
                    )
            else:
                response.failure(f"Health check failed: {response.status_code}")
    
    @task(10)
    def health_live(self):
        """Check liveness probe."""
        self.client.get("/health/live", name="/health/live")
    
    @task(10)
    def health_ready(self):
        """Check readiness probe."""
        self.client.get("/health/ready", name="/health/ready")
    
    # ========================================================================
    # Forum Endpoints (30% weight)
    # Target: <200ms p95
    # ========================================================================
    
    @task(15)
    def list_forum_threads(self):
        """List forum threads with pagination."""
        with self.client.get(
            "/v1/forum/threads",
            params={"skip": 0, "limit": 20},
            headers=self._get_headers(),
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                if response.elapsed.total_seconds() < 0.2:
                    response.success()
                else:
                    response.failure(
                        f"Forum list took {response.elapsed.total_seconds():.3f}s (>200ms)"
                    )
            else:
                response.failure(f"Forum list failed: {response.status_code}")
    
    @task(10)
    def view_forum_thread(self):
        """View a specific forum thread."""
        # Use random thread ID (1-100)
        thread_id = random.randint(1, 100)
        with self.client.get(
            f"/v1/forum/threads/{thread_id}",
            headers=self._get_headers(),
            catch_response=True,
        ) as response:
            if response.status_code in [200, 404]:  # 404 is acceptable for random ID
                if response.elapsed.total_seconds() < 0.2:
                    response.success()
                else:
                    response.failure(
                        f"Thread view took {response.elapsed.total_seconds():.3f}s (>200ms)"
                    )
            else:
                response.failure(f"Thread view failed: {response.status_code}")
    
    @task(5)
    def search_forum(self):
        """Search forum content."""
        search_terms = ["ders", "sınav", "ödev", "proje", "final"]
        query = random.choice(search_terms)
        with self.client.get(
            "/v1/forum/search",
            params={"q": query},
            headers=self._get_headers(),
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                if response.elapsed.total_seconds() < 0.2:
                    response.success()
                else:
                    response.failure(
                        f"Forum search took {response.elapsed.total_seconds():.3f}s (>200ms)"
                    )
            else:
                response.failure(f"Forum search failed: {response.status_code}")
    
    # ========================================================================
    # Document Endpoints (20% weight)
    # Target: <200ms p95
    # ========================================================================
    
    @task(15)
    def list_documents(self):
        """List user's uploaded documents."""
        with self.client.get(
            "/v1/documents",
            params={"skip": 0, "limit": 20},
            headers=self._get_headers(),
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                if response.elapsed.total_seconds() < 0.2:
                    response.success()
                else:
                    response.failure(
                        f"Document list took {response.elapsed.total_seconds():.3f}s (>200ms)"
                    )
            else:
                response.failure(f"Document list failed: {response.status_code}")
    
    @task(5)
    def get_document_stats(self):
        """Get document statistics."""
        with self.client.get(
            "/v1/documents/stats",
            headers=self._get_headers(),
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                if response.elapsed.total_seconds() < 0.2:
                    response.success()
                else:
                    response.failure(
                        f"Document stats took {response.elapsed.total_seconds():.3f}s (>200ms)"
                    )
            else:
                response.failure(f"Document stats failed: {response.status_code}")
    
    # ========================================================================
    # Chat Endpoints (10% weight)
    # Target: <5 seconds for AI queries, <200ms for non-AI
    # ========================================================================
    
    @task(5)
    def list_chat_sessions(self):
        """List user's chat sessions."""
        with self.client.get(
            "/v1/chat/sessions",
            headers=self._get_headers(),
            catch_response=True,
        ) as response:
            if response.status_code == 200:
                if response.elapsed.total_seconds() < 0.2:
                    response.success()
                else:
                    response.failure(
                        f"Session list took {response.elapsed.total_seconds():.3f}s (>200ms)"
                    )
            else:
                response.failure(f"Session list failed: {response.status_code}")
    
    @task(3)
    def create_chat_session(self):
        """Create a new chat session."""
        with self.client.post(
            "/v1/chat/sessions",
            json={"title": f"Load Test Session {random.randint(1000, 9999)}"},
            headers=self._get_headers(),
            catch_response=True,
        ) as response:
            if response.status_code in [200, 201]:
                self.session_id = response.json().get("id")
                if response.elapsed.total_seconds() < 0.2:
                    response.success()
                else:
                    response.failure(
                        f"Session creation took {response.elapsed.total_seconds():.3f}s (>200ms)"
                    )
            else:
                response.failure(f"Session creation failed: {response.status_code}")
    
    @task(2)
    def send_chat_message(self):
        """Send a message to AI chatbot."""
        # Only run if we have a session
        if not self.session_id:
            return
        
        messages = [
            "Merhaba!",
            "Bugün derslerim neler?",
            "Bilgisayar Mühendisliği dersleri hangileri?",
            "Final sınavı ne zaman?",
        ]
        
        with self.client.post(
            f"/v1/chat/sessions/{self.session_id}/messages",
            json={"content": random.choice(messages)},
            headers=self._get_headers(),
            timeout=10,  # AI queries take longer
            catch_response=True,
        ) as response:
            if response.status_code in [200, 201]:
                # AI queries have different SLA (<5s)
                if response.elapsed.total_seconds() < 5.0:
                    response.success()
                else:
                    response.failure(
                        f"AI message took {response.elapsed.total_seconds():.3f}s (>5s)"
                    )
            else:
                response.failure(f"Message send failed: {response.status_code}")


class AuthOnlyUser(HttpUser):
    """
    Simulates users only performing authentication operations.
    Tests auth endpoint performance under high load.
    """
    
    wait_time = between(2, 10)
    
    @task(50)
    def login_attempt(self):
        """Attempt login with various credentials."""
        timestamp = int(time.time() * 1000)
        user_id = random.randint(1000, 9999)
        
        with self.client.post(
            "/v1/auth/login",
            json={
                "email": f"user_{user_id}@test.edu.tr",
                "password": "TestPass123!",
            },
            catch_response=True,
        ) as response:
            # Accept both success and auth failures
            if response.status_code in [200, 401, 422]:
                if response.elapsed.total_seconds() < 0.2:
                    response.success()
                else:
                    response.failure(
                        f"Login took {response.elapsed.total_seconds():.3f}s (>200ms)"
                    )
            else:
                response.failure(f"Login failed unexpectedly: {response.status_code}")
    
    @task(10)
    def register_attempt(self):
        """Attempt registration."""
        timestamp = int(time.time() * 1000)
        user_id = random.randint(10000, 99999)
        
        with self.client.post(
            "/v1/auth/register",
            json={
                "email": f"newuser_{timestamp}_{user_id}@test.edu.tr",
                "password": "NewPass123!",
                "full_name": f"New User {user_id}",
                "student_id": f"NEW{user_id}",
            },
            catch_response=True,
        ) as response:
            if response.status_code in [200, 201, 409, 422]:  # Accept conflicts
                if response.elapsed.total_seconds() < 0.2:
                    response.success()
                else:
                    response.failure(
                        f"Registration took {response.elapsed.total_seconds():.3f}s (>200ms)"
                    )
            else:
                response.failure(f"Registration failed: {response.status_code}")


# ============================================================================
# Load Test Configurations
# ============================================================================

"""
USAGE EXAMPLES:

1. Basic load test (ramp up to 500 users):
   locust -f test_load.py --host=http://localhost:8000 --users=500 --spawn-rate=10

2. Quick performance check (50 users):
   locust -f test_load.py --host=http://localhost:8000 --users=50 --spawn-rate=5 --run-time=2m

3. Stress test (1000+ users):
   locust -f test_load.py --host=http://localhost:8000 --users=1000 --spawn-rate=20

4. Auth-only load test:
   locust -f test_load.py --host=http://localhost:8000 --users=200 --spawn-rate=10 AuthOnlyUser

5. Web UI mode (interactive):
   locust -f test_load.py --host=http://localhost:8000
   # Then open http://localhost:8089

6. Headless mode with CSV output:
   locust -f test_load.py --host=http://localhost:8000 --users=500 --spawn-rate=10 \\
          --run-time=10m --headless --csv=results

METRICS TO MONITOR:
- Request count and RPS (requests per second)
- Response times (min, max, average, median, p95, p99)
- Failure rate (should be <1%)
- CPU and memory usage on server
- Database connection pool utilization
- Vector search latency

SUCCESS CRITERIA:
✅ p95 latency <200ms for non-AI endpoints (health, auth, forum, documents)
✅ p95 latency <5s for AI endpoints (chat messages)
✅ Failure rate <1% at 500 concurrent users
✅ System remains stable for 10+ minute test runs
"""
