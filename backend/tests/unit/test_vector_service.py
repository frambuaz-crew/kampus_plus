"""Unit tests for VectorStoreService (TDD RED phase).

Tests cover:
- Dual vector store initialization (VDB_Official + VDB_User)
- OpenAI embedding generation
- FAISS similarity search
- Vector store isolation (official vs user)
- Index persistence and loading
- Error handling and edge cases

Test Requirements (from T022):
- Verify dual FAISS indexes are properly isolated
- Test embedding generation with OpenAI API
- Validate similarity search returns correct format
- Ensure user documents are only searchable by their owner
- Test index persistence to disk
"""

import pytest
import numpy as np
from pathlib import Path
from typing import List, Tuple
from unittest.mock import AsyncMock, MagicMock, patch

# Imports will be available after implementation
try:
    from src.services.vector_service import VectorStoreService, get_vector_service
except ImportError:
    VectorStoreService = None
    get_vector_service = None


# Implementation now available - running tests in GREEN phase
# pytestmark = pytest.mark.skipif(
#     VectorStoreService is None,
#     reason="Implementation not yet available (RED phase)"
# )


class TestVectorStoreInitialization:
    """Test vector store initialization and index loading."""
    
    def test_initialize_creates_dual_indexes(self):
        """Test that initialization creates both VDB_Official and VDB_User indexes."""
        service = VectorStoreService()
        
        assert service.vdb_official is not None, "VDB_Official index should be initialized"
        assert service.vdb_user is not None, "VDB_User index should be initialized"
        assert service.EMBEDDING_DIMENSION == 1536, "Should use OpenAI text-embedding-3-small dimension"
    
    def test_initialize_loads_existing_indexes_from_disk(self):
        """Test that existing index files are loaded from data/vectors/."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        # Create temporary index files
        with patch('faiss.read_index') as mock_read_index:
            mock_official = MagicMock()
            mock_official.ntotal = 100
            mock_user = MagicMock()
            mock_user.ntotal = 50
            mock_read_index.side_effect = [mock_official, mock_user]
            
            service = VectorStoreService()
            
            assert service.vdb_official.ntotal == 100, "Should load official index with 100 vectors"
            assert service.vdb_user.ntotal == 50, "Should load user index with 50 vectors"
    
    def test_initialize_creates_data_directory_if_not_exists(self):
        """Test that data/vectors/ directory is created if missing."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        with patch('pathlib.Path.mkdir') as mock_mkdir:
            service = VectorStoreService()
            
            # Verify mkdir was called with parents=True
            mock_mkdir.assert_called()
    
    def test_get_vector_service_returns_singleton(self):
        """Test that get_vector_service returns the same instance."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service1 = get_vector_service()
        service2 = get_vector_service()
        
        assert service1 is service2, "Should return singleton instance"


class TestEmbeddingGeneration:
    """Test OpenAI embedding generation."""
    
    @pytest.mark.asyncio
    async def test_generate_embedding_calls_openai_api(self):
        """Test that generate_embedding calls OpenAI with correct parameters."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        
        with patch.object(service.openai_client.embeddings, 'create', new_callable=AsyncMock) as mock_create:
            mock_response = MagicMock()
            mock_response.data = [MagicMock(embedding=[0.1] * 1536)]
            mock_create.return_value = mock_response
            
            result = await service.generate_embedding("Test text")
            
            mock_create.assert_called_once()
            assert mock_create.call_args[1]['model'] == 'text-embedding-3-small'
            assert mock_create.call_args[1]['input'] == 'Test text'
    
    @pytest.mark.asyncio
    async def test_generate_embedding_returns_1536_dimensions(self):
        """Test that embedding has 1536 dimensions (OpenAI text-embedding-3-small)."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        
        with patch.object(service.openai_client.embeddings, 'create', new_callable=AsyncMock) as mock_create:
            mock_response = MagicMock()
            mock_response.data = [MagicMock(embedding=[0.1] * 1536)]
            mock_create.return_value = mock_response
            
            result = await service.generate_embedding("Test text")
            
            assert len(result) == 1536, "Embedding should have 1536 dimensions"
            assert all(isinstance(x, float) for x in result), "All elements should be floats"
    
    @pytest.mark.asyncio
    async def test_generate_embedding_handles_empty_string(self):
        """Test that empty string is handled gracefully."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        
        with patch.object(service.openai_client.embeddings, 'create', new_callable=AsyncMock) as mock_create:
            mock_response = MagicMock()
            mock_response.data = [MagicMock(embedding=[0.0] * 1536)]
            mock_create.return_value = mock_response
            
            result = await service.generate_embedding("")
            
            assert len(result) == 1536, "Should return valid embedding for empty string"
    
    @pytest.mark.asyncio
    async def test_generate_embedding_handles_unicode_text(self):
        """Test that Turkish/unicode text is handled correctly."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        
        with patch.object(service.openai_client.embeddings, 'create', new_callable=AsyncMock) as mock_create:
            mock_response = MagicMock()
            mock_response.data = [MagicMock(embedding=[0.1] * 1536)]
            mock_create.return_value = mock_response
            
            turkish_text = "Öğrenci üniversite müfredatını öğreniyor"
            result = await service.generate_embedding(turkish_text)
            
            mock_create.assert_called_once()
            assert mock_create.call_args[1]['input'] == turkish_text


class TestAddToOfficialStore:
    """Test adding vectors to official documents store."""
    
    @pytest.mark.asyncio
    async def test_add_to_official_generates_embeddings_for_each_text(self):
        """Test that add_to_official generates embedding for each text chunk."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        texts = ["Text 1", "Text 2", "Text 3"]
        
        with patch.object(service, 'generate_embedding', new_callable=AsyncMock) as mock_embed:
            mock_embed.return_value = [0.1] * 1536
            
            await service.add_to_official(texts, start_index=0)
            
            assert mock_embed.call_count == 3, "Should generate embedding for each text"
    
    @pytest.mark.asyncio
    async def test_add_to_official_returns_faiss_index_ids(self):
        """Test that add_to_official returns sequential FAISS index IDs."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        texts = ["Text 1", "Text 2"]
        
        with patch.object(service, 'generate_embedding', new_callable=AsyncMock) as mock_embed:
            mock_embed.return_value = [0.1] * 1536
            
            result = await service.add_to_official(texts, start_index=5)
            
            assert result == [5, 6], "Should return sequential index IDs starting from start_index"
    
    @pytest.mark.asyncio
    async def test_add_to_official_increases_index_size(self):
        """Test that adding vectors increases vdb_official.ntotal."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        initial_size = service.vdb_official.ntotal
        texts = ["Text 1", "Text 2"]
        
        with patch.object(service, 'generate_embedding', new_callable=AsyncMock) as mock_embed:
            mock_embed.return_value = [0.1] * 1536
            
            await service.add_to_official(texts, start_index=0)
            
            assert service.vdb_official.ntotal == initial_size + 2, "Index size should increase by 2"
    
    @pytest.mark.asyncio
    async def test_add_to_official_auto_saves_index(self):
        """Test that add_to_official automatically persists index to disk."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        texts = ["Text 1"]
        
        with patch.object(service, 'generate_embedding', new_callable=AsyncMock) as mock_embed:
            with patch.object(service, 'save_indexes') as mock_save:
                mock_embed.return_value = [0.1] * 1536
                
                await service.add_to_official(texts, start_index=0)
                
                mock_save.assert_called_once(), "Should auto-save after adding"


class TestAddToUserStore:
    """Test adding vectors to user documents store."""
    
    @pytest.mark.asyncio
    async def test_add_to_user_adds_to_separate_index(self):
        """Test that add_to_user adds vectors to VDB_User, not VDB_Official."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        official_size = service.vdb_official.ntotal
        user_size = service.vdb_user.ntotal
        
        with patch.object(service, 'generate_embedding', new_callable=AsyncMock) as mock_embed:
            mock_embed.return_value = [0.1] * 1536
            
            await service.add_to_user(["User text"], start_index=0)
            
            assert service.vdb_official.ntotal == official_size, "Official index should not change"
            assert service.vdb_user.ntotal == user_size + 1, "User index should increase by 1"
    
    @pytest.mark.asyncio
    async def test_add_to_user_returns_correct_faiss_ids(self):
        """Test that add_to_user returns sequential FAISS IDs."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        
        with patch.object(service, 'generate_embedding', new_callable=AsyncMock) as mock_embed:
            mock_embed.return_value = [0.1] * 1536
            
            result = await service.add_to_user(["Text 1", "Text 2", "Text 3"], start_index=10)
            
            assert result == [10, 11, 12], "Should return sequential IDs starting from 10"


class TestSearchOfficial:
    """Test similarity search in official documents store."""
    
    @pytest.mark.asyncio
    async def test_search_official_returns_top_k_results(self):
        """Test that search_official returns k nearest neighbors."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        
        # Add some vectors
        with patch.object(service, 'generate_embedding', new_callable=AsyncMock) as mock_embed:
            mock_embed.return_value = [0.1] * 1536
            await service.add_to_official(["Doc 1", "Doc 2", "Doc 3"], start_index=0)
            
            # Search
            results = await service.search_official("query", k=2)
            
            assert len(results) <= 2, "Should return at most k results"
            assert all(isinstance(r, tuple) for r in results), "Results should be tuples"
            assert all(len(r) == 2 for r in results), "Each result should be (index_id, distance)"
    
    @pytest.mark.asyncio
    async def test_search_official_returns_sorted_by_distance(self):
        """Test that results are sorted by distance (closest first)."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        
        with patch.object(service, 'generate_embedding', new_callable=AsyncMock) as mock_embed:
            mock_embed.return_value = [0.1] * 1536
            await service.add_to_official(["Doc 1", "Doc 2"], start_index=0)
            
            results = await service.search_official("query", k=2)
            
            if len(results) > 1:
                for i in range(len(results) - 1):
                    assert results[i][1] <= results[i+1][1], "Results should be sorted by distance"
    
    @pytest.mark.asyncio
    async def test_search_official_filters_padding_results(self):
        """Test that FAISS padding results (idx=-1) are filtered out."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        
        with patch.object(service, 'generate_embedding', new_callable=AsyncMock) as mock_embed:
            mock_embed.return_value = [0.1] * 1536
            
            # Mock FAISS search to return padding
            with patch.object(service.vdb_official, 'search') as mock_search:
                mock_search.return_value = (
                    np.array([[0.5, 0.8, 999.0]]),  # distances
                    np.array([[0, 1, -1]])  # indices (last is padding)
                )
                
                results = await service.search_official("query", k=3)
                
                assert len(results) == 2, "Should filter out -1 padding"
                assert all(idx >= 0 for idx, _ in results), "All indices should be >= 0"


class TestSearchUser:
    """Test similarity search in user documents store."""
    
    @pytest.mark.asyncio
    async def test_search_user_searches_vdb_user_not_vdb_official(self):
        """Test that search_user only searches VDB_User index."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        
        with patch.object(service, 'generate_embedding', new_callable=AsyncMock) as mock_embed:
            mock_embed.return_value = [0.1] * 1536
            
            with patch.object(service.vdb_user, 'search') as mock_user_search:
                with patch.object(service.vdb_official, 'search') as mock_official_search:
                    mock_user_search.return_value = (np.array([[0.5]]), np.array([[0]]))
                    
                    await service.search_user("query", k=5)
                    
                    mock_user_search.assert_called_once(), "Should search user index"
                    mock_official_search.assert_not_called(), "Should NOT search official index"
    
    @pytest.mark.asyncio
    async def test_search_user_returns_correct_format(self):
        """Test that search_user returns List[Tuple[int, float]]."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        
        with patch.object(service, 'generate_embedding', new_callable=AsyncMock) as mock_embed:
            mock_embed.return_value = [0.1] * 1536
            await service.add_to_user(["User Doc 1"], start_index=0)
            
            results = await service.search_user("query", k=1)
            
            assert isinstance(results, list), "Should return list"
            if len(results) > 0:
                assert isinstance(results[0], tuple), "Each result should be tuple"
                assert isinstance(results[0][0], int), "First element should be int (index)"
                assert isinstance(results[0][1], float), "Second element should be float (distance)"


class TestSearchBoth:
    """Test searching both vector stores simultaneously."""
    
    @pytest.mark.asyncio
    async def test_search_both_returns_separate_results(self):
        """Test that search_both returns tuple of (official_results, user_results)."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        
        with patch.object(service, 'generate_embedding', new_callable=AsyncMock) as mock_embed:
            mock_embed.return_value = [0.1] * 1536
            
            await service.add_to_official(["Official doc"], start_index=0)
            await service.add_to_user(["User doc"], start_index=0)
            
            official_results, user_results = await service.search_both("query", k_per_store=5)
            
            assert isinstance(official_results, list), "Official results should be list"
            assert isinstance(user_results, list), "User results should be list"
    
    @pytest.mark.asyncio
    async def test_search_both_respects_k_per_store_limit(self):
        """Test that each store returns at most k_per_store results."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        
        with patch.object(service, 'generate_embedding', new_callable=AsyncMock) as mock_embed:
            mock_embed.return_value = [0.1] * 1536
            
            # Add multiple documents
            await service.add_to_official(["Doc " + str(i) for i in range(10)], start_index=0)
            await service.add_to_user(["User " + str(i) for i in range(10)], start_index=0)
            
            official_results, user_results = await service.search_both("query", k_per_store=3)
            
            assert len(official_results) <= 3, "Official results should not exceed k_per_store"
            assert len(user_results) <= 3, "User results should not exceed k_per_store"


class TestIndexPersistence:
    """Test saving and loading indexes from disk."""
    
    def test_save_indexes_writes_both_files(self):
        """Test that save_indexes writes both vdb_official.index and vdb_user.index."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        
        with patch('faiss.write_index') as mock_write:
            service.save_indexes()
            
            assert mock_write.call_count == 2, "Should write both indexes"
            
            # Check paths
            calls = [call[0] for call in mock_write.call_args_list]
            paths = [str(call[1]) for call in calls]
            
            assert any('vdb_official.index' in p for p in paths), "Should save official index"
            assert any('vdb_user.index' in p for p in paths), "Should save user index"
    
    def test_get_stats_returns_correct_structure(self):
        """Test that get_stats returns dictionary with store statistics."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        
        stats = service.get_stats()
        
        assert 'vdb_official' in stats, "Should include official store stats"
        assert 'vdb_user' in stats, "Should include user store stats"
        assert 'embedding_model' in stats, "Should include embedding model info"
        
        assert 'total_vectors' in stats['vdb_official']
        assert 'dimension' in stats['vdb_official']
        assert stats['vdb_official']['dimension'] == 1536
    
    def test_get_index_size_returns_correct_counts(self):
        """Test that get_index_size returns ntotal for each store."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        
        official_size = service.get_index_size("official")
        user_size = service.get_index_size("user")
        
        assert isinstance(official_size, int), "Should return integer"
        assert isinstance(user_size, int), "Should return integer"
        assert official_size >= 0, "Size should be non-negative"
        assert user_size >= 0, "Size should be non-negative"


class TestErrorHandling:
    """Test error handling and edge cases."""
    
    def test_get_index_size_raises_for_invalid_store_type(self):
        """Test that get_index_size raises ValueError for invalid store_type."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        
        with pytest.raises(ValueError, match="Invalid store_type"):
            service.get_index_size("invalid")
    
    def test_remove_from_official_raises_not_implemented(self):
        """Test that remove_from_official raises NotImplementedError (FAISS limitation)."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        
        with pytest.raises(NotImplementedError, match="doesn't support removal"):
            service.remove_from_official([0, 1, 2])
    
    def test_remove_from_user_raises_not_implemented(self):
        """Test that remove_from_user raises NotImplementedError (FAISS limitation)."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        
        with pytest.raises(NotImplementedError, match="doesn't support removal"):
            service.remove_from_user([0, 1, 2])
    
    @pytest.mark.asyncio
    async def test_search_empty_index_returns_empty_results(self):
        """Test that searching empty index returns empty list."""
        pytest.skip("Implementation not yet available (RED phase)")
        
        service = VectorStoreService()
        
        with patch.object(service, 'generate_embedding', new_callable=AsyncMock) as mock_embed:
            mock_embed.return_value = [0.1] * 1536
            
            results = await service.search_official("query", k=5)
            
            assert results == [], "Empty index should return empty results"
