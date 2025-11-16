"""Integration tests for core services (TDD RED phase).

Tests cover:
- Database connection pool and session management
- S3 upload/download with pre-signed URLs
- FAISS index persistence and loading
- Configuration loading from environment
- Service initialization and health checks

Test Requirements (from T024):
- Verify database connection works with real PostgreSQL
- Test S3 upload/download operations
- Validate FAISS index persistence to disk
- Ensure config loads from .env properly
- Test integration between services
"""

import pytest
import tempfile
import os
from pathlib import Path
from uuid import uuid4, UUID
from io import BytesIO
from unittest.mock import patch, MagicMock

# Imports should be available after T001-T029 implementations
from src.core.database import get_engine, get_session_factory, get_db
from src.core.config import get_settings, Settings
# S3Service will be implemented later (not critical for Phase 2)
# from src.services.s3_service import S3Service
from src.services.vector_service import VectorStoreService
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class TestDatabaseConnection:
    """Test database connection pool and session management."""
    
    @pytest.mark.asyncio
    async def test_get_engine_creates_async_engine(self):
        """Test that get_engine returns valid AsyncEngine."""

        
        engine = get_engine()
        
        assert engine is not None, "Engine should be created"
        assert hasattr(engine, 'connect'), "Engine should have connect method"
        assert hasattr(engine, 'dispose'), "Engine should have dispose method"
    
    @pytest.mark.asyncio
    async def test_get_session_factory_creates_async_sessionmaker(self):
        """Test that get_session_factory returns valid session factory."""

        
        session_factory = get_session_factory()
        
        assert session_factory is not None, "Session factory should be created"
        assert callable(session_factory), "Session factory should be callable"
    
    @pytest.mark.asyncio
    async def test_database_connection_executes_query(self):
        """Test that database connection can execute simple query."""

        
        session_factory = get_session_factory()
        
        async with session_factory() as session:
            result = await session.execute(text("SELECT 1 as test"))
            row = result.fetchone()
            
            assert row is not None, "Query should return result"
            assert row[0] == 1, "Query should return expected value"
    
    @pytest.mark.asyncio
    async def test_database_session_commits_transaction(self):
        """Test that database session commits changes."""

        
        from src.models.user import User
        
        session_factory = get_session_factory()
        test_user_id = uuid4()
        
        # Insert test user
        async with session_factory() as session:
            test_user = User(
                id=test_user_id,
                email="test@example.edu.tr",
                password_hash="hashed_password",
                role="student",
                first_name="Test",
                last_name="User",
                is_verified=True,
                is_active=True
            )
            session.add(test_user)
            await session.commit()
        
        # Verify user exists in new session
        async with session_factory() as session:
            result = await session.execute(
                text("SELECT id FROM users WHERE id = :user_id"),
                {"user_id": test_user_id}
            )
            row = result.fetchone()
            
            assert row is not None, "User should exist after commit"
            assert str(row[0]) == str(test_user_id), "User ID should match"
        
        # Cleanup
        async with session_factory() as session:
            await session.execute(
                text("DELETE FROM users WHERE id = :user_id"),
                {"user_id": test_user_id}
            )
            await session.commit()
    
    @pytest.mark.asyncio
    async def test_database_session_rolls_back_on_error(self):
        """Test that database session rolls back on exception."""

        
        session_factory = get_session_factory()
        
        with pytest.raises(Exception):
            async with session_factory() as session:
                # Execute valid query
                await session.execute(text("SELECT 1"))
                
                # Raise error (should trigger rollback)
                raise ValueError("Test error")
        
        # Session should have rolled back automatically
        # Verify by checking connection is still valid
        async with session_factory() as session:
            result = await session.execute(text("SELECT 1"))
            assert result is not None, "Connection should still work after rollback"
    
    @pytest.mark.asyncio
    async def test_get_db_dependency_provides_session(self):
        """Test that get_db dependency provides AsyncSession."""

        
        async for session in get_db():
            assert isinstance(session, AsyncSession), "Should provide AsyncSession"
            
            # Test session works
            result = await session.execute(text("SELECT 1"))
            assert result is not None, "Session should execute queries"
            
            break  # Only test first iteration
    
    @pytest.mark.asyncio
    async def test_database_connection_pool_configuration(self):
        """Test that connection pool is configured correctly."""

        
        engine = get_engine()
        
        # Check pool configuration
        pool = engine.pool
        assert pool is not None, "Engine should have connection pool"
        assert pool.size() >= 0, "Pool should have valid size"


class TestS3ServiceIntegration:
    """Test S3 service upload/download operations."""
    
    @pytest.mark.asyncio
    async def test_s3_upload_file_creates_object(self):
        """Test that S3 upload creates object with correct key."""

        
        service = S3Service()
        
        # Mock S3 client
        with patch.object(service.s3_client, 'upload_fileobj') as mock_upload:
            user_id = uuid4()
            document_id = uuid4()
            filename = "test_document.pdf"
            file_content = b"PDF content here"
            file = BytesIO(file_content)
            
            s3_key = await service.upload_file(file, user_id, document_id, filename)
            
            mock_upload.assert_called_once()
            assert f"uploads/{user_id}/{document_id}" in s3_key, "Key should include user and document IDs"
            assert filename in s3_key, "Key should include filename"
    
    @pytest.mark.asyncio
    async def test_s3_generate_presigned_url_returns_valid_url(self):
        """Test that pre-signed URL generation works."""

        
        service = S3Service()
        
        with patch.object(service.s3_client, 'generate_presigned_url') as mock_presigned:
            mock_presigned.return_value = "https://s3.amazonaws.com/bucket/key?signature=abc123"
            
            s3_key = "uploads/user_id/doc_id/file.pdf"
            url = await service.generate_presigned_url(s3_key)
            
            mock_presigned.assert_called_once()
            assert url.startswith("https://"), "URL should be HTTPS"
            assert "signature" in url, "URL should include signature"
    
    @pytest.mark.asyncio
    async def test_s3_download_file_retrieves_content(self):
        """Test that file download retrieves correct content."""

        
        service = S3Service()
        
        expected_content = b"PDF file content"
        
        with patch.object(service.s3_client, 'get_object') as mock_get:
            mock_response = {
                'Body': BytesIO(expected_content),
                'ContentType': 'application/pdf'
            }
            mock_get.return_value = mock_response
            
            s3_key = "uploads/user_id/doc_id/file.pdf"
            content = await service.download_file(s3_key)
            
            assert content == expected_content, "Downloaded content should match"
    
    @pytest.mark.asyncio
    async def test_s3_delete_file_removes_object(self):
        """Test that file deletion works."""

        
        service = S3Service()
        
        with patch.object(service.s3_client, 'delete_object') as mock_delete:
            s3_key = "uploads/user_id/doc_id/file.pdf"
            await service.delete_file(s3_key)
            
            mock_delete.assert_called_once()
            assert mock_delete.call_args[1]['Bucket'] == service.bucket_name
            assert mock_delete.call_args[1]['Key'] == s3_key
    
    @pytest.mark.asyncio
    async def test_s3_upload_includes_metadata(self):
        """Test that uploaded files include metadata."""

        
        service = S3Service()
        
        with patch.object(service.s3_client, 'upload_fileobj') as mock_upload:
            user_id = uuid4()
            document_id = uuid4()
            file = BytesIO(b"content")
            
            await service.upload_file(file, user_id, document_id, "test.pdf")
            
            # Check metadata in ExtraArgs
            call_args = mock_upload.call_args
            extra_args = call_args[1]['ExtraArgs']
            
            assert 'Metadata' in extra_args, "Should include metadata"
            assert 'user_id' in extra_args['Metadata'], "Should include user_id in metadata"
            assert 'document_id' in extra_args['Metadata'], "Should include document_id in metadata"
    
    @pytest.mark.asyncio
    async def test_s3_presigned_url_expiry_configurable(self):
        """Test that pre-signed URL expiry time is configurable."""

        
        service = S3Service()
        
        with patch.object(service.s3_client, 'generate_presigned_url') as mock_presigned:
            mock_presigned.return_value = "https://s3.amazonaws.com/url"
            
            await service.generate_presigned_url("key", expiry_seconds=300)
            
            call_args = mock_presigned.call_args
            assert call_args[1]['ExpiresIn'] == 300, "Should use custom expiry time"


class TestFAISSPersistence:
    """Test FAISS index persistence and loading."""
    
    def test_vector_service_initializes_indexes(self):
        """Test that VectorStoreService initializes FAISS indexes."""

        
        service = VectorStoreService()
        
        assert service.vdb_official is not None, "Official index should be initialized"
        assert service.vdb_user is not None, "User index should be initialized"
    
    def test_vector_service_creates_data_directory(self):
        """Test that data directory is created if missing."""

        
        with tempfile.TemporaryDirectory() as tmpdir:
            with patch('src.services.vector_service.Path') as mock_path:
                mock_data_dir = MagicMock()
                mock_data_dir.mkdir = MagicMock()
                mock_path.return_value = mock_data_dir
                
                service = VectorStoreService()
                
                mock_data_dir.mkdir.assert_called_with(parents=True, exist_ok=True)
    
    @pytest.mark.asyncio
    async def test_vector_service_saves_indexes_to_disk(self):
        """Test that FAISS indexes are saved to disk."""

        
        with tempfile.TemporaryDirectory() as tmpdir:
            service = VectorStoreService()
            service.data_dir = Path(tmpdir)
            service.official_index_path = Path(tmpdir) / "vdb_official.index"
            service.user_index_path = Path(tmpdir) / "vdb_user.index"
            
            # Add some vectors
            await service.add_to_official(["Test text"], start_index=0)
            
            # Save indexes
            service.save_indexes()
            
            # Verify files exist
            assert service.official_index_path.exists(), "Official index file should exist"
            assert service.user_index_path.exists(), "User index file should exist"
    
    def test_vector_service_loads_existing_indexes(self):
        """Test that existing FAISS indexes are loaded from disk."""

        
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create mock index files
            official_path = Path(tmpdir) / "vdb_official.index"
            user_path = Path(tmpdir) / "vdb_user.index"
            
            official_path.touch()
            user_path.touch()
            
            with patch('faiss.read_index') as mock_read:
                mock_official = MagicMock()
                mock_official.ntotal = 100
                mock_user = MagicMock()
                mock_user.ntotal = 50
                mock_read.side_effect = [mock_official, mock_user]
                
                service = VectorStoreService()
                service.official_index_path = official_path
                service.user_index_path = user_path
                service._initialize_indexes()
                
                assert mock_read.call_count == 2, "Should load both indexes"
                assert service.vdb_official.ntotal == 100, "Official index should have 100 vectors"
                assert service.vdb_user.ntotal == 50, "User index should have 50 vectors"
    
    @pytest.mark.asyncio
    async def test_vector_service_persistence_survives_restart(self):
        """Test that vectors persist across service restarts."""

        
        with tempfile.TemporaryDirectory() as tmpdir:
            # First service instance
            service1 = VectorStoreService()
            service1.data_dir = Path(tmpdir)
            service1.official_index_path = Path(tmpdir) / "vdb_official.index"
            service1.user_index_path = Path(tmpdir) / "vdb_user.index"
            
            # Add vectors
            await service1.add_to_official(["Test 1", "Test 2"], start_index=0)
            initial_size = service1.vdb_official.ntotal
            service1.save_indexes()
            
            # Second service instance (simulating restart)
            service2 = VectorStoreService()
            service2.data_dir = Path(tmpdir)
            service2.official_index_path = Path(tmpdir) / "vdb_official.index"
            service2.user_index_path = Path(tmpdir) / "vdb_user.index"
            service2._initialize_indexes()
            
            assert service2.vdb_official.ntotal == initial_size, \
                "Restarted service should load same number of vectors"


class TestConfigurationLoading:
    """Test configuration loading from environment."""
    
    def test_get_settings_loads_from_env(self):
        """Test that settings are loaded from .env file."""

        
        settings = get_settings()
        
        assert settings is not None, "Settings should be loaded"
        assert isinstance(settings, Settings), "Should return Settings instance"
    
    def test_settings_contains_required_fields(self):
        """Test that settings contains all required configuration fields."""

        
        settings = get_settings()
        
        # Database
        assert hasattr(settings, 'postgres_host'), "Should have postgres_host"
        assert hasattr(settings, 'postgres_password'), "Should have postgres_password"
        assert hasattr(settings, 'database_url'), "Should have database_url property"
        
        # JWT
        assert hasattr(settings, 'jwt_secret_key'), "Should have jwt_secret_key"
        assert hasattr(settings, 'jwt_algorithm'), "Should have jwt_algorithm"
        
        # OpenAI
        assert hasattr(settings, 'openai_api_key'), "Should have openai_api_key"
        
        # AWS
        assert hasattr(settings, 'aws_access_key_id'), "Should have aws_access_key_id"
        assert hasattr(settings, 'aws_s3_bucket'), "Should have aws_s3_bucket"
    
    def test_settings_database_url_property(self):
        """Test that database_url property constructs correct URL."""

        
        settings = get_settings()
        
        db_url = settings.database_url
        
        assert "postgresql" in db_url, "URL should be PostgreSQL"
        assert settings.postgres_user in db_url, "URL should include username"
        assert settings.postgres_host in db_url, "URL should include host"
        assert settings.postgres_db in db_url, "URL should include database name"
    
    def test_settings_validates_environment(self):
        """Test that environment value is validated."""

        
        with pytest.raises(ValueError):
            # Invalid environment should raise error
            settings = Settings(
                environment="invalid_env",
                postgres_password="test",
                jwt_secret_key="test",
                openai_api_key="test",
                aws_access_key_id="test",
                aws_secret_access_key="test",
                aws_s3_bucket="test"
            )
    
    def test_settings_cors_origins_list_property(self):
        """Test that CORS origins are parsed from comma-separated string."""

        
        settings = get_settings()
        
        origins = settings.cors_origins_list
        
        assert isinstance(origins, list), "Should return list"
        assert len(origins) > 0, "Should have at least one origin"
        assert all(isinstance(o, str) for o in origins), "All origins should be strings"
    
    def test_settings_max_file_size_bytes_conversion(self):
        """Test that max_file_size_bytes property converts MB to bytes."""

        
        settings = get_settings()
        
        bytes_size = settings.max_file_size_bytes
        mb_size = settings.max_file_size_mb
        
        assert bytes_size == mb_size * 1024 * 1024, "Should convert MB to bytes correctly"


class TestServiceIntegration:
    """Test integration between multiple services."""
    
    @pytest.mark.asyncio
    async def test_database_and_vector_service_integration(self):
        """Test that database and vector service work together."""

        
        from src.models.document import OfficialDocument, VectorEmbedding
        
        session_factory = get_session_factory()
        vector_service = VectorStoreService()
        
        # Create document in database
        doc_id = uuid4()
        async with session_factory() as session:
            doc = OfficialDocument(
                id=doc_id,
                source_system="uzem",
                title="Test Document",
                content="Test content for vectorization",
                is_active=True
            )
            session.add(doc)
            await session.commit()
        
        # Add to vector store
        faiss_ids = await vector_service.add_to_official(["Test content"], start_index=0)
        
        # Create vector embedding record
        async with session_factory() as session:
            embedding = VectorEmbedding(
                document_id=doc_id,
                document_type="official",
                vector_store="vdb_official",
                faiss_index_id=faiss_ids[0],
                chunk_text="Test content",
                chunk_index=0
            )
            session.add(embedding)
            await session.commit()
        
        # Verify integration
        async with session_factory() as session:
            result = await session.execute(
                text("SELECT COUNT(*) FROM vector_embeddings WHERE document_id = :doc_id"),
                {"doc_id": doc_id}
            )
            count = result.scalar()
            
            assert count == 1, "Vector embedding should be linked to document"
        
        # Cleanup
        async with session_factory() as session:
            await session.execute(text("DELETE FROM vector_embeddings WHERE document_id = :doc_id"), {"doc_id": doc_id})
            await session.execute(text("DELETE FROM official_documents WHERE id = :doc_id"), {"doc_id": doc_id})
            await session.commit()
    
    @pytest.mark.asyncio
    async def test_config_and_services_initialization(self):
        """Test that services initialize correctly with config."""

        
        settings = get_settings()
        
        # Database service
        engine = get_engine()
        assert engine is not None, "Database engine should initialize"
        
        # Vector service
        vector_service = VectorStoreService()
        assert vector_service.EMBEDDING_DIMENSION == settings.vector_dimension, \
            "Vector service should use config dimension"
        
        # S3 service
        s3_service = S3Service()
        assert s3_service.bucket_name == settings.aws_s3_bucket, \
            "S3 service should use config bucket name"
    
    @pytest.mark.asyncio
    async def test_health_check_verifies_all_services(self):
        """Test that health check endpoint verifies all services are ready."""

        
        from src.api.routes.health import readiness_probe
        
        # Call readiness probe
        response = await readiness_probe()
        
        assert response['status'] == 'ready', "Should be ready"
        assert 'checks' in response, "Should include checks"
        assert response['checks']['database'] == 'ok', "Database should be ok"
        assert response['checks']['vector_stores'] == 'ok', "Vector stores should be ok"
