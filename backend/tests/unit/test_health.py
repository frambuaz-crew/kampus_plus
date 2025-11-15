"""
Unit tests for health check endpoints.

Tests cover:
- Basic health check (GET /health)
- Liveness probe (GET /health/live)
- Readiness probe with DB and vector store checks (GET /health/ready)
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import status
from fastapi.testclient import TestClient
from fastapi import FastAPI

from src.api.routes.health import router


@pytest.fixture
def app():
    """Create FastAPI app with health routes."""
    app = FastAPI()
    app.include_router(router)
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return TestClient(app)


class TestBasicHealth:
    """Test basic health check endpoint."""
    
    def test_health_check_returns_ok(self, client):
        """Test that /health returns 200 OK with service status."""
        # Act
        response = client.get("/health")
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "kampus_plus_backend"


class TestLivenessProbe:
    """Test Kubernetes liveness probe endpoint."""
    
    def test_liveness_probe_returns_alive(self, client):
        """Test that /health/live returns 200 OK with alive status."""
        # Act
        response = client.get("/health/live")
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "alive"
        assert data["service"] == "kampus_plus_backend"


class TestReadinessProbe:
    """Test Kubernetes readiness probe endpoint."""
    
    @patch("src.api.routes.health.get_session_factory")
    @patch("src.api.routes.health.VectorStoreService")
    def test_readiness_probe_all_checks_pass(self, mock_vector_service, mock_session_factory, client):
        """Test that /health/ready returns 200 when all checks pass."""
        # Arrange
        # Mock database connection
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock()
        mock_factory = MagicMock()
        mock_factory.return_value.__aenter__.return_value = mock_session
        mock_factory.return_value.__aexit__.return_value = AsyncMock()
        mock_session_factory.return_value = mock_factory
        
        # Mock vector service
        mock_service = MagicMock()
        mock_service.get_index_size.side_effect = lambda store_type: 100 if store_type == "official" else 50
        mock_vector_service.return_value = mock_service
        
        # Act
        response = client.get("/health/ready")
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "ready"
        assert data["checks"]["database"] == "ok"
        assert data["checks"]["vector_stores"] == "ok"
    
    @patch("src.api.routes.health.get_session_factory")
    @patch("src.api.routes.health.VectorStoreService")
    def test_readiness_probe_database_failure(self, mock_vector_service, mock_session_factory, client):
        """Test that /health/ready returns 503 when database check fails."""
        # Arrange
        # Mock database connection failure
        mock_factory = MagicMock()
        mock_factory.return_value.__aenter__.side_effect = Exception("Database connection failed")
        mock_session_factory.return_value = mock_factory
        
        # Mock vector service (working)
        mock_service = MagicMock()
        mock_service.get_index_size.side_effect = lambda store_type: 100 if store_type == "official" else 50
        mock_vector_service.return_value = mock_service
        
        # Act
        response = client.get("/health/ready")
        
        # Assert
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        data = response.json()
        assert data["detail"]["status"] == "not_ready"
        assert data["detail"]["checks"]["database"] == "failed"
        assert data["detail"]["checks"]["vector_stores"] == "ok"
        assert any("Database connection failed" in error for error in data["detail"]["errors"])
    
    @patch("src.api.routes.health.get_session_factory")
    @patch("src.api.routes.health.VectorStoreService")
    def test_readiness_probe_vector_store_failure(self, mock_vector_service, mock_session_factory, client):
        """Test that /health/ready returns 503 when vector store check fails."""
        # Arrange
        # Mock database connection (working)
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock()
        mock_factory = MagicMock()
        mock_factory.return_value.__aenter__.return_value = mock_session
        mock_factory.return_value.__aexit__.return_value = AsyncMock()
        mock_session_factory.return_value = mock_factory
        
        # Mock vector service failure
        mock_vector_service.return_value.get_index_size.side_effect = Exception("Vector store not initialized")
        
        # Act
        response = client.get("/health/ready")
        
        # Assert
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        data = response.json()
        assert data["detail"]["status"] == "not_ready"
        assert data["detail"]["checks"]["database"] == "ok"
        assert data["detail"]["checks"]["vector_stores"] == "failed"
        assert any("Vector store check failed" in error for error in data["detail"]["errors"])
    
    @patch("src.api.routes.health.get_session_factory")
    @patch("src.api.routes.health.VectorStoreService")
    def test_readiness_probe_all_checks_fail(self, mock_vector_service, mock_session_factory, client):
        """Test that /health/ready returns 503 when all checks fail."""
        # Arrange
        # Mock database connection failure
        mock_factory = MagicMock()
        mock_factory.return_value.__aenter__.side_effect = Exception("Database down")
        mock_session_factory.return_value = mock_factory
        
        # Mock vector service failure
        mock_vector_service.return_value.get_index_size.side_effect = Exception("Vector store error")
        
        # Act
        response = client.get("/health/ready")
        
        # Assert
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        data = response.json()
        assert data["detail"]["status"] == "not_ready"
        assert data["detail"]["checks"]["database"] == "failed"
        assert data["detail"]["checks"]["vector_stores"] == "failed"
        assert len(data["detail"]["errors"]) == 2
    
    @patch("src.api.routes.health.get_session_factory")
    @patch("src.api.routes.health.VectorStoreService")
    def test_readiness_probe_empty_indexes_are_valid(self, mock_vector_service, mock_session_factory, client):
        """Test that empty vector indexes (size=0) are considered ready."""
        # Arrange
        # Mock database connection (working)
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock()
        mock_factory = MagicMock()
        mock_factory.return_value.__aenter__.return_value = mock_session
        mock_factory.return_value.__aexit__.return_value = AsyncMock()
        mock_session_factory.return_value = mock_factory
        
        # Mock vector service with empty indexes
        mock_service = MagicMock()
        mock_service.get_index_size.return_value = 0  # Empty but valid
        mock_vector_service.return_value = mock_service
        
        # Act
        response = client.get("/health/ready")
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "ready"
        assert data["checks"]["vector_stores"] == "ok"
    
    @patch("src.api.routes.health.get_session_factory")
    @patch("src.api.routes.health.VectorStoreService")
    def test_readiness_probe_uninitialized_indexes_fail(self, mock_vector_service, mock_session_factory, client):
        """Test that uninitialized indexes (size=-1) are considered not ready."""
        # Arrange
        # Mock database connection (working)
        mock_session = AsyncMock()
        mock_session.execute = AsyncMock()
        mock_factory = MagicMock()
        mock_factory.return_value.__aenter__.return_value = mock_session
        mock_factory.return_value.__aexit__.return_value = AsyncMock()
        mock_session_factory.return_value = mock_factory
        
        # Mock vector service with uninitialized indexes
        mock_service = MagicMock()
        mock_service.get_index_size.return_value = -1  # Not initialized
        mock_vector_service.return_value = mock_service
        
        # Act
        response = client.get("/health/ready")
        
        # Assert
        assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
        data = response.json()
        assert data["detail"]["status"] == "not_ready"
        assert data["detail"]["checks"]["vector_stores"] == "failed"
        assert any("not properly initialized" in error for error in data["detail"]["errors"])
