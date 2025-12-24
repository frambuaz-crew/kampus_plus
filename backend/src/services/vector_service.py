"""Vector store service for document embeddings and similarity search.

This module provides:
- Dual FAISS vector stores (official documents + user documents)
- Google Gemini embedding generation (text-embedding-004, 768 dimensions)
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
import google.generativeai as genai

from src.core.config import get_settings


logger = logging.getLogger(__name__)


class VectorStoreService:
    """Service for managing FAISS vector stores and Google Gemini embeddings."""
    
    # Google Gemini text-embedding-004 dimension
    EMBEDDING_DIMENSION = 768
    
    def __init__(self):
        """Initialize vector store service with dual FAISS indexes."""
        self.settings = get_settings()
        
        # Configure Google Gemini API
        genai.configure(api_key=self.settings.google_api_key)
        
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
        self.social_metadata: Dict[int, Dict] = {}  # Forum posts metadata
        
        # Initialize or load FAISS index for social content (forum)
        self.social_index_path = self.data_dir / "vdb_social.index"
        self.vdb_social = self._load_or_create_index(
            self.social_index_path,
            "VDB_Social"
        )
        
        # Load metadata from file if exists (for testing)
        self._load_metadata_from_file()
        
        logger.info(
            f"VectorStoreService initialized. "
            f"Official: {self.vdb_official.ntotal} vectors ({len(self.official_metadata)} metadata), "
            f"User: {self.vdb_user.ntotal} vectors ({len(self.user_metadata)} metadata), "
            f"Social: {self.vdb_social.ntotal} vectors ({len(self.social_metadata)} metadata)"
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
    
    def _load_metadata_from_file(self) -> None:
        """Load metadata from Python file (temporary solution for testing)."""
        metadata_file = self.data_dir / "metadata_official.py"
        if metadata_file.exists():
            try:
                import importlib.util
                spec = importlib.util.spec_from_file_location("metadata_official", metadata_file)
                if spec and spec.loader:
                    module = importlib.util.module_from_spec(spec)
                    spec.loader.exec_module(module)
                    self.official_metadata = getattr(module, "OFFICIAL_METADATA", {})
                    logger.info(f"Loaded {len(self.official_metadata)} official metadata entries from file")
            except Exception as e:
                logger.warning(f"Failed to load metadata from file: {e}")
    
    def save_indexes(self) -> None:
        """Persist all indexes to disk."""
        try:
            faiss.write_index(self.vdb_official, str(self.official_index_path))
            faiss.write_index(self.vdb_user, str(self.user_index_path))
            faiss.write_index(self.vdb_social, str(self.social_index_path))
            logger.info("Successfully saved vector indexes to disk (official, user, social)")
        except Exception as e:
            logger.error(f"Failed to save indexes: {e}")
            raise
    
    # ============================================================================
    # EMBEDDING GENERATION
    # ============================================================================
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding vector using Google Gemini API.
        
        Args:
            text: Text to embed.
        
        Returns:
            List of 768 floats representing the embedding.
        
        Example:
            >>> embedding = await service.generate_embedding("Sample text")
            >>> len(embedding)
            768
        """
        try:
            result = genai.embed_content(
                model="models/text-embedding-004",
                content=text,
                task_type="retrieval_document"
            )
            embedding = result['embedding']
            return embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            raise
    
    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts (batched API call).
        
        Args:
            texts: List of texts to embed.
        
        Returns:
            List of embeddings (each is 768 floats).
        
        Example:
            >>> embeddings = await service.generate_embeddings_batch(["Text 1", "Text 2"])
            >>> len(embeddings)
            2
        """
        if not texts:
            return []
        
        try:
            # Gemini batch embedding
            embeddings = []
            for text in texts:
                result = genai.embed_content(
                    model="models/text-embedding-004",
                    content=text,
                    task_type="retrieval_document"
                )
                embeddings.append(result['embedding'])
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
        
        # Calculate assigned IDs based on current size
        assigned_ids = list(range(current_size, current_size + len(texts)))
        
        # Store metadata with text
        if metadata:
            for idx, meta, text in zip(assigned_ids, metadata, texts):
                # Ensure text is in metadata
                meta_with_text = {**meta, "text": text}
                self.official_metadata[idx] = meta_with_text
        else:
            # Store just the text
            for idx, text in zip(assigned_ids, texts):
                self.official_metadata[idx] = {"text": text}
        
        # Auto-save indexes after adding vectors
        self.save_indexes()
        
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
        
        # TEMPORARY: Fallback to mock search if embedding generation fails
        # TODO: Use Gemini embeddings or fix OpenAI API key
        try:
            # Generate query embedding
            query_embedding = await self.generate_embedding(query_text)
            query_vector = np.array([query_embedding], dtype=np.float32)
            
            # Search FAISS index
            distances, indices = self.vdb_official.search(query_vector, k)
        except Exception as e:
            logger.warning(f"Embedding generation failed: {e}. Using MOCK MODE (returning all documents)")
            # Return all available documents with mock distance
            results = [(i, float(i) * 0.1) for i in range(min(k, self.vdb_official.ntotal))]
            return results
        
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
        
        # TEMPORARY: Fallback to mock search if embedding generation fails
        try:
            # Generate query embedding
            query_embedding = await self.generate_embedding(query_text)
            query_vector = np.array([query_embedding], dtype=np.float32)
            
            # Search with larger k to filter by user_id
            search_k = min(k * 10, self.vdb_user.ntotal)  # Over-fetch for ACL filtering
            distances, indices = self.vdb_user.search(query_vector, search_k)
        except Exception as e:
            logger.warning(f"Embedding generation failed: {e}. Using MOCK MODE (user documents)")
            # Return user's documents with mock distance
            results = []
            user_id_str = str(user_id)
            for idx, metadata in self.user_metadata.items():
                if metadata.get("user_id") == user_id_str and len(results) < k:
                    results.append((idx, float(len(results)) * 0.1))
            return results
        
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
    # SOCIAL CONTENT STORE (FORUM POSTS)
    # ============================================================================
    
    async def add_forum_posts(
        self,
        posts: List[Dict],
    ) -> List[int]:
        """Add forum posts to social vector store.
        
        Forum posts are indexed with lower authority than official documents
        but can provide peer knowledge and discussions.
        
        Args:
            posts: List of dicts with keys: 'id', 'title', 'content', 'thread_id'
        
        Returns:
            List of FAISS index IDs assigned to each post.
        
        Example:
            >>> posts = [
            ...     {"id": "uuid1", "title": "Calculus help", "content": "Can anyone explain limits?", "thread_id": None},
            ...     {"id": "uuid2", "title": None, "content": "Sure! A limit is...", "thread_id": "uuid1"}
            ... ]
            >>> ids = await service.add_forum_posts(posts)
        """
        if not posts:
            return []
        
        # Combine title and content for embedding
        texts = []
        for post in posts:
            title = post.get("title", "") or ""
            content = post.get("content", "")
            combined = f"{title} {content}".strip() if title else content
            texts.append(combined)
        
        # Generate embeddings
        embeddings = await self.generate_embeddings_batch(texts)
        
        # Convert to numpy array
        vectors = np.array(embeddings, dtype=np.float32)
        
        # Get current index size
        current_size = self.vdb_social.ntotal
        
        # Add to FAISS index
        self.vdb_social.add(vectors)
        
        # Calculate assigned IDs
        assigned_ids = list(range(current_size, current_size + len(texts)))
        
        # Store metadata
        for idx, post, text in zip(assigned_ids, posts, texts):
            self.social_metadata[idx] = {
                "post_id": post["id"],
                "title": post.get("title"),
                "content": post.get("content"),
                "thread_id": post.get("thread_id"),
                "text": text,
                "source_type": "forum"
            }
        
        # Auto-save
        self.save_indexes()
        
        logger.info(f"Added {len(posts)} forum posts to VDB_Social (IDs: {assigned_ids[0]}-{assigned_ids[-1]})")
        
        return assigned_ids
    
    async def search_social(
        self,
        query_text: str,
        k: int = 5
    ) -> List[Tuple[int, float]]:
        """Search social content (forum posts) by similarity.
        
        Args:
            query_text: Query text to search for.
            k: Number of results to return (default 5).
        
        Returns:
            List of (index_id, distance) tuples, sorted by similarity.
        
        Example:
            >>> results = await service.search_social("calculus limits", k=3)
            >>> print(results)
            [(0, 0.12), (5, 0.18), (12, 0.25)]
        """
        if self.vdb_social.ntotal == 0:
            return []
        
        try:
            # Generate query embedding
            query_embedding = await self.generate_embedding(query_text)
            query_vector = np.array([query_embedding], dtype=np.float32)
            
            # Search FAISS index
            distances, indices = self.vdb_social.search(query_vector, k)
        except Exception as e:
            logger.warning(f"Embedding generation failed: {e}. Using MOCK MODE")
            results = [(i, float(i) * 0.1) for i in range(min(k, self.vdb_social.ntotal))]
            return results
        
        # Convert to list of tuples
        results = [
            (int(idx), float(dist))
            for idx, dist in zip(indices[0], distances[0])
            if idx != -1
        ]
        
        return results
    
    def get_social_metadata(self, index_ids: List[int]) -> List[Dict]:
        """Retrieve metadata for social content (forum posts).
        
        Args:
            index_ids: List of FAISS index IDs.
        
        Returns:
            List of metadata dicts for each index_id.
        """
        return [
            self.social_metadata.get(idx, {"text": "Metadata not found", "source_type": "forum"})
            for idx in index_ids
        ]
    
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
    
    def get_stats(self) -> Dict[str, Dict]:
        """Get combined statistics for all vector stores.
        
        Returns:
            Dict with stats for all stores and embedding model info.
        """
        return {
            "vdb_official": self.get_official_stats(),
            "vdb_user": self.get_user_stats(),
            "vdb_social": {
                "total_vectors": self.vdb_social.ntotal,
                "dimension": self.EMBEDDING_DIMENSION,
                "metadata_count": len(self.social_metadata)
            },
            "embedding_model": "text-embedding-3-small"
        }
    
    def get_index_size(self, store_type: str) -> int:
        """Get number of vectors in specified store.
        
        Args:
            store_type: Either "official" or "user".
        
        Returns:
            Number of vectors in the store.
        
        Raises:
            ValueError: If store_type is invalid.
        """
        if store_type == "official":
            return self.vdb_official.ntotal
        elif store_type == "user":
            return self.vdb_user.ntotal
        else:
            raise ValueError(f"Invalid store_type: {store_type}. Must be 'official' or 'user'.")
    
    def remove_from_official(self, index_ids: List[int]) -> None:
        """Remove vectors from official store.
        
        Args:
            index_ids: List of FAISS index IDs to remove.
        
        Raises:
            NotImplementedError: FAISS IndexFlatL2 doesn't support removal.
        """
        raise NotImplementedError("FAISS IndexFlatL2 doesn't support removal operations. "
                                  "Consider using IndexIDMap wrapper for removal support.")
    
    def remove_from_user(self, index_ids: List[int]) -> None:
        """Remove vectors from user store.
        
        Args:
            index_ids: List of FAISS index IDs to remove.
        
        Raises:
            NotImplementedError: FAISS IndexFlatL2 doesn't support removal.
        """
        raise NotImplementedError("FAISS IndexFlatL2 doesn't support removal operations. "
                                  "Consider using IndexIDMap wrapper for removal support.")


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
