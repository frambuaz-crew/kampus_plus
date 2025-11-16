"""Vector store service for document embeddings and similarity search.

This module provides:
- Dual FAISS vector stores (official documents + user documents)
- OpenAI embedding generation (text-embedding-3-small, 1536 dimensions)
- Similarity search with k=5 default
- User access control (users can only search their own documents)
- Index persistence to disk (data/vectors/)

Vector Store Structure:
- VDB_Official: Course materials, official documents (read-only for students)
- VDB_User: Student-uploaded documents (user-scoped access control)
"""

import os
import logging
from pathlib import Path
from typing import List, Optional, Tuple, Dict
from uuid import UUID

import faiss
import numpy as np
from openai import AsyncOpenAI

from src.core.config import get_settings


logger = logging.getLogger(__name__)


class VectorStoreService:
    """Service for managing FAISS vector stores and OpenAI embeddings."""
    
    # OpenAI text-embedding-3-small dimension
    EMBEDDING_DIMENSION = 1536
    
    def __init__(self):
        """Initialize vector store service with dual FAISS indexes."""
        self.settings = get_settings()
        self.openai_client = AsyncOpenAI(api_key=self.settings.openai_api_key)
        
        # Initialize storage paths
        self.data_dir = Path(self.settings.vector_store_path)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.official_index_path = self.data_dir / "vdb_official.index"
        self.user_index_path = self.data_dir / "vdb_user.index"
        
        # Initialize or load FAISS indexes
        self.vdb_official = self._load_or_create_index(
            self.official_index_path,
            "VDB_Official"
        )
        self.vdb_user = self._load_or_create_index(
            self.user_index_path,
            "VDB_User"
        )
        
        # In-memory metadata storage (maps FAISS index ID -> metadata)
        # In production, this should be backed by database
        self.official_metadata: Dict[int, Dict] = {}
        self.user_metadata: Dict[int, Dict] = {}
        
        logger.info(
            f"VectorStoreService initialized. "
            f"Official: {self.vdb_official.ntotal} vectors, "
            f"User: {self.vdb_user.ntotal} vectors"
        )
    
    def _load_or_create_index(self, path: Path, name: str) -> faiss.IndexFlatL2:
        """Load existing FAISS index or create new one.
        
        Args:
            path: Path to index file.
            name: Index name for logging.
        
        Returns:
            FAISS IndexFlatL2 instance.
        """
        if path.exists():
            try:
                index = faiss.read_index(str(path))
                logger.info(f"Loaded {name} from {path} ({index.ntotal} vectors)")
                return index
            except Exception as e:
                logger.warning(f"Failed to load {name} from {path}: {e}. Creating new index.")
        
        # Create new index (L2 distance)
        index = faiss.IndexFlatL2(self.EMBEDDING_DIMENSION)
        logger.info(f"Created new {name} index")
        return index
    
    def save_indexes(self) -> None:
        """Persist both indexes to disk."""
        try:
            faiss.write_index(self.vdb_official, str(self.official_index_path))
            faiss.write_index(self.vdb_user, str(self.user_index_path))
            logger.info("Successfully saved vector indexes to disk")
        except Exception as e:
            logger.error(f"Failed to save indexes: {e}")
            raise
    
    # ============================================================================
    # EMBEDDING GENERATION
    # ============================================================================
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding vector using OpenAI API.
        
        Args:
            text: Text to embed.
        
        Returns:
            List of 1536 floats representing the embedding.
        
        Example:
            >>> embedding = await service.generate_embedding("Sample text")
            >>> len(embedding)
            1536
        """
        try:
            response = await self.openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=text
            )
            embedding = response.data[0].embedding
            return embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            raise
    
    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts (batched API call).
        
        Args:
            texts: List of texts to embed.
        
        Returns:
            List of embeddings (each is 1536 floats).
        
        Example:
            >>> embeddings = await service.generate_embeddings_batch(["Text 1", "Text 2"])
            >>> len(embeddings)
            2
        """
        if not texts:
            return []
        
        try:
            response = await self.openai_client.embeddings.create(
                model="text-embedding-3-small",
                input=texts
            )
            embeddings = [item.embedding for item in response.data]
            return embeddings
        except Exception as e:
            logger.error(f"Failed to generate batch embeddings: {e}")
            raise
    
    # ============================================================================
    # OFFICIAL DOCUMENTS STORE
    # ============================================================================
    
    async def add_to_official(
        self,
        texts: List[str],
        start_index: int = 0,
        metadata: Optional[List[Dict]] = None
    ) -> List[int]:
        """Add documents to official vector store.
        
        Args:
            texts: List of text chunks to add.
            start_index: Starting FAISS index ID for sequential assignment.
            metadata: Optional metadata for each text (e.g., source, page_num).
        
        Returns:
            List of FAISS index IDs assigned to each text.
        
        Example:
            >>> texts = ["Chapter 1 content", "Chapter 2 content"]
            >>> ids = await service.add_to_official(texts, start_index=0)
            >>> print(ids)
            [0, 1]
        """
        if not texts:
            return []
        
        # Generate embeddings
        embeddings = await self.generate_embeddings_batch(texts)
        
        # Convert to numpy array
        vectors = np.array(embeddings, dtype=np.float32)
        
        # Get current index size (for ID assignment)
        current_size = self.vdb_official.ntotal
        
        # Add to FAISS index
        self.vdb_official.add(vectors)
        
        # Calculate assigned IDs
        assigned_ids = list(range(start_index, start_index + len(texts)))
        
        # Store metadata
        if metadata:
            for idx, meta in zip(assigned_ids, metadata):
                self.official_metadata[idx] = meta
        
        logger.info(f"Added {len(texts)} vectors to VDB_Official (IDs: {assigned_ids[0]}-{assigned_ids[-1]})")
        
        return assigned_ids
    
    async def search_official(
        self,
        query_text: str,
        k: int = 5
    ) -> List[Tuple[int, float]]:
        """Search official documents by similarity.
        
        Args:
            query_text: Query text to search for.
            k: Number of results to return (default 5).
        
        Returns:
            List of (index_id, distance) tuples, sorted by similarity.
        
        Example:
            >>> results = await service.search_official("machine learning", k=3)
            >>> print(results)
            [(42, 0.15), (103, 0.22), (7, 0.28)]
        """
        if self.vdb_official.ntotal == 0:
            return []
        
        # Generate query embedding
        query_embedding = await self.generate_embedding(query_text)
        query_vector = np.array([query_embedding], dtype=np.float32)
        
        # Search FAISS index
        distances, indices = self.vdb_official.search(query_vector, k)
        
        # Convert to list of tuples
        results = [
            (int(idx), float(dist))
            for idx, dist in zip(indices[0], distances[0])
            if idx != -1  # Filter out invalid indices
        ]
        
        return results
    
    # ============================================================================
    # USER DOCUMENTS STORE
    # ============================================================================
    
    async def add_to_user(
        self,
        texts: List[str],
        user_id: UUID,
        start_index: int = 0,
        metadata: Optional[List[Dict]] = None
    ) -> List[int]:
        """Add documents to user-specific vector store.
        
        Args:
            texts: List of text chunks to add.
            user_id: Owner's user ID (for ACL).
            start_index: Starting FAISS index ID.
            metadata: Optional metadata for each text.
        
        Returns:
            List of FAISS index IDs assigned to each text.
        
        Example:
            >>> from uuid import uuid4
            >>> user_id = uuid4()
            >>> texts = ["My notes on AI", "Summary of lecture"]
            >>> ids = await service.add_to_user(texts, user_id, start_index=0)
        """
        if not texts:
            return []
        
        # Generate embeddings
        embeddings = await self.generate_embeddings_batch(texts)
        
        # Convert to numpy array
        vectors = np.array(embeddings, dtype=np.float32)
        
        # Get current index size
        current_size = self.vdb_user.ntotal
        
        # Add to FAISS index
        self.vdb_user.add(vectors)
        
        # Calculate assigned IDs
        assigned_ids = list(range(start_index, start_index + len(texts)))
        
        # Store metadata with user_id for ACL
        if metadata:
            for idx, meta in zip(assigned_ids, metadata):
                meta_with_acl = {**meta, "user_id": str(user_id)}
                self.user_metadata[idx] = meta_with_acl
        else:
            for idx in assigned_ids:
                self.user_metadata[idx] = {"user_id": str(user_id)}
        
        logger.info(f"Added {len(texts)} vectors to VDB_User for user {user_id} (IDs: {assigned_ids[0]}-{assigned_ids[-1]})")
        
        return assigned_ids
    
    async def search_user(
        self,
        query_text: str,
        user_id: UUID,
        k: int = 5
    ) -> List[Tuple[int, float]]:
        """Search user documents with ACL enforcement.
        
        Only returns documents owned by the specified user.
        
        Args:
            query_text: Query text to search for.
            user_id: User ID for access control.
            k: Number of results to return (default 5).
        
        Returns:
            List of (index_id, distance) tuples for user's documents only.
        
        Example:
            >>> results = await service.search_user("my notes", user_id, k=3)
            >>> print(results)
            [(5, 0.12), (9, 0.18), (14, 0.25)]
        """
        if self.vdb_user.ntotal == 0:
            return []
        
        # Generate query embedding
        query_embedding = await self.generate_embedding(query_text)
        query_vector = np.array([query_embedding], dtype=np.float32)
        
        # Search with larger k to filter by user_id
        search_k = min(k * 10, self.vdb_user.ntotal)  # Over-fetch for ACL filtering
        distances, indices = self.vdb_user.search(query_vector, search_k)
        
        # Filter by user_id and limit to k results
        user_id_str = str(user_id)
        results = []
        for idx, dist in zip(indices[0], distances[0]):
            if idx == -1:
                continue
            
            # Check ACL
            metadata = self.user_metadata.get(int(idx), {})
            if metadata.get("user_id") == user_id_str:
                results.append((int(idx), float(dist)))
                
                if len(results) >= k:
                    break
        
        return results
    
    # ============================================================================
    # HYBRID SEARCH (OFFICIAL + USER)
    # ============================================================================
    
    async def search_hybrid(
        self,
        query_text: str,
        user_id: UUID,
        k: int = 5,
        official_weight: float = 0.7
    ) -> List[Tuple[str, int, float]]:
        """Search both official and user documents, merge results.
        
        Args:
            query_text: Query text to search for.
            user_id: User ID for user document access.
            k: Total number of results to return.
            official_weight: Weight for official documents (0.0-1.0).
        
        Returns:
            List of (source, index_id, distance) tuples.
            source is either "official" or "user".
        
        Example:
            >>> results = await service.search_hybrid("AI algorithms", user_id, k=5)
            >>> for source, idx, dist in results:
            ...     print(f"{source}: {idx} (distance: {dist:.2f})")
            official: 42 (distance: 0.15)
            user: 7 (distance: 0.18)
            official: 103 (distance: 0.22)
        """
        # Search both stores
        official_results = await self.search_official(query_text, k=k)
        user_results = await self.search_user(query_text, user_id, k=k)
        
        # Apply weights and merge
        weighted_official = [
            ("official", idx, dist * official_weight)
            for idx, dist in official_results
        ]
        weighted_user = [
            ("user", idx, dist * (1 - official_weight))
            for idx, dist in user_results
        ]
        
        # Combine and sort by weighted distance
        all_results = weighted_official + weighted_user
        all_results.sort(key=lambda x: x[2])
        
        # Return top k
        return all_results[:k]
    
    # ============================================================================
    # INDEX MANAGEMENT
    # ============================================================================
    
    def get_official_stats(self) -> Dict[str, int]:
        """Get statistics for official vector store.
        
        Returns:
            Dict with index statistics.
        """
        return {
            "total_vectors": self.vdb_official.ntotal,
            "dimension": self.EMBEDDING_DIMENSION,
            "metadata_count": len(self.official_metadata)
        }
    
    def get_user_stats(self) -> Dict[str, int]:
        """Get statistics for user vector store.
        
        Returns:
            Dict with index statistics.
        """
        return {
            "total_vectors": self.vdb_user.ntotal,
            "dimension": self.EMBEDDING_DIMENSION,
            "metadata_count": len(self.user_metadata)
        }


# ============================================================================
# SINGLETON PATTERN
# ============================================================================

_vector_service_instance: Optional[VectorStoreService] = None


def get_vector_service() -> VectorStoreService:
    """Get singleton instance of VectorStoreService.
    
    Returns:
        Singleton VectorStoreService instance.
    
    Example:
        >>> service = get_vector_service()
        >>> service2 = get_vector_service()
        >>> assert service is service2  # Same instance
    """
    global _vector_service_instance
    
    if _vector_service_instance is None:
        _vector_service_instance = VectorStoreService()
    
    return _vector_service_instance
