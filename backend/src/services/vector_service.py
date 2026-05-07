"""Vector store servisi - Doküman embedding'leri ve benzerlik araması.

Spec: specs/009-ai-assistant/spec.md
Sadece resmi dokümanlar için FAISS vector store.
"""

import logging
import importlib.util
import pickle
from pathlib import Path
from typing import List, Optional, Tuple, Dict

import faiss
import numpy as np
from google import genai as google_genai

from src.core.config import get_settings


logger = logging.getLogger(__name__)


class VectorStoreService:
    """FAISS vector store ve Google Gemini embedding yönetimi servisi."""
    
    EMBEDDING_DIMENSION = 768
    
    def __init__(self):
        """Vector store servisini başlat."""
        self.settings = get_settings()
        # Embedding boyutunu tek bir kaynaktan (settings) kullan.
        self.EMBEDDING_DIMENSION = self.settings.vector_dimension
        
        self._genai_client = google_genai.Client(api_key=self.settings.google_api_key)

        self.data_dir = Path(self.settings.vector_store_path)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.official_index_path = self.data_dir / "vdb_official.index"
        self.metadata_path = self.data_dir / "metadata_official.pkl"
        
        self.vdb_official = self._load_or_create_index(
            self.official_index_path,
            "VDB_Official"
        )
        
        self.official_metadata: Dict[int, Dict] = {}
        
        self._load_metadata_from_file()
        
        logger.info(
            "VectorStoreService başlatıldı (resmi: %s vektör, %s metadata).",
            self.vdb_official.ntotal,
            len(self.official_metadata),
        )
    
    def _load_or_create_index(self, path: Path, name: str) -> faiss.IndexFlatIP:
        """Mevcut FAISS index'i yükle veya yeni oluştur."""
        if path.exists():
            try:
                index = faiss.read_index(str(path))
                if index.d != self.EMBEDDING_DIMENSION:
                    logger.warning(
                        "%s boyutu uyumsuz: indeks=%s, beklenen=%s. "
                        "Index sıfırdan oluşturuluyor.",
                        name, index.d, self.EMBEDDING_DIMENSION,
                    )
                    return faiss.IndexFlatIP(self.EMBEDDING_DIMENSION)
                logger.info("%s yüklendi: %s vektör.", name, index.ntotal)
                return index
            except Exception as e:
                logger.warning("%s yüklenemedi: %s. Yeni index oluşturuluyor.", name, e)

        index = faiss.IndexFlatIP(self.EMBEDDING_DIMENSION)
        logger.info("Yeni %s indeşi oluşturuldu.", name)
        return index
    
    def _load_metadata_from_file(self) -> None:
        """Metadata'yı pickle dosyasından yükle."""
        if not self.metadata_path.exists():
            self.official_metadata = {}
            logger.info("Metadata dosyası bulunamadı, boş başlanıyor.")
            return

        try:
            with self.metadata_path.open("rb") as metadata_file:
                loaded = pickle.load(metadata_file)
                if isinstance(loaded, dict):
                    self.official_metadata = loaded
                else:
                    logger.warning("Metadata dosyası geçersiz format, boş kullanılıyor.")
                    self.official_metadata = {}

            logger.info("Metadata yüklendi: %s kayıt.", len(self.official_metadata))
        except Exception as e:
            logger.warning("Metadata yüklenemedi: %s. Boş başlanıyor.", e)
            self.official_metadata = {}
    
    def save_indexes(self) -> None:
        """Tüm index'leri diske kaydet."""
        try:
            faiss.write_index(self.vdb_official, str(self.official_index_path))
            with self.metadata_path.open("wb") as metadata_file:
                pickle.dump(self.official_metadata, metadata_file)
            logger.info("Vektör indeksleri diske kaydedildi.")
        except Exception as e:
            logger.error("Index kaydetme hatası: %s", e)
            raise
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Google Gemini API ile embedding vektörü oluştur."""
        try:
            result = self._genai_client.models.embed_content(
                model="gemini-embedding-001",
                contents=text,
            )
            return result.embeddings[0].values
        except Exception as e:
            logger.error("Embedding oluşturma hatası: %s", e)
            raise
    
    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Birden fazla metin için embedding oluştur."""
        if not texts:
            return []
        
        try:
            embeddings = []
            for text in texts:
                result = self._genai_client.models.embed_content(
                    model="gemini-embedding-001",
                    contents=text,
                )
                embeddings.append(result.embeddings[0].values)
            return embeddings
        except Exception as e:
            logger.error("Toplu embedding oluşturma hatası: %s", e)
            raise
    
    async def add_to_official(
        self,
        texts: List[str],
        metadata: Optional[List[Dict]] = None
    ) -> List[int]:
        """Resmi dokümanları vector store'a ekle.
        
        Args:
            texts: Eklenecek metin parçaları listesi
            metadata: Her metin için opsiyonel metadata
        
        Returns:
            Her metne atanan FAISS index ID'leri listesi
        """
        if not texts:
            return []
        
        vectors = await self.generate_embeddings_batch(texts)
        vectors_np = np.array(vectors, dtype=np.float32)

        if vectors_np.ndim == 1:
            vectors_np = vectors_np.reshape(1, -1)
        
        current_size = self.vdb_official.ntotal

        faiss.normalize_L2(vectors_np)
        self.vdb_official.add(vectors_np)
        
        assigned_ids = list(range(current_size, current_size + len(texts)))
        
        if metadata:
            for idx, meta, text in zip(assigned_ids, metadata, texts):
                meta_with_text = {**meta, "text": text}
                self.official_metadata[idx] = meta_with_text
        else:
            for idx, text in zip(assigned_ids, texts):
                self.official_metadata[idx] = {"text": text}
        
        self.save_indexes()
        
        logger.info("%s vektör resmi depoya eklendi (ID aralığı: %s-%s).", len(texts), assigned_ids[0], assigned_ids[-1])
        
        return assigned_ids
    
    async def search_official(
        self,
        query_text: str,
        k: int = 5,
        university_id: Optional[str] = None,
        fetch_k: int = 20,
    ) -> List[Tuple[int, float]]:
        """Resmi dokümanlarda kosinüs benzerliği araması yap.

        Args:
            query_text: Arama sorgusu
            k: Döndürülecek nihai sonuç sayısı (varsayılan 5)
            university_id: Çok kiracılı filtreleme için üniversite ID'si.
                           Verilirse yalnızca eşleşen veya university_id'si None olan
                           chunk'lar döndürülür.
            fetch_k: FAISS'ten çekilecek aday havuzu büyüklüğü (varsayılan 20).
                     Filtreleme sonrası en iyi k tanesi seçilir.

        Returns:
            (index_id, score) tuple'ları listesi; score büyüdükçe benzerlik artar
            (IndexFlatIP ile inner product = normalize edilmiş vektörlerde kosinüs skoru).
        """
        if self.vdb_official.ntotal == 0:
            return []

        try:
            query_embedding = await self.generate_embedding(query_text)
            query_vector = np.array([query_embedding], dtype=np.float32)
            faiss.normalize_L2(query_vector)

            actual_fetch = min(fetch_k, self.vdb_official.ntotal)
            distances, indices = self.vdb_official.search(query_vector, actual_fetch)
        except Exception as e:
            logger.warning("Embedding hatası, mock mod kullanılıyor: %s", e)
            return [(i, 1.0 - float(i) * 0.1) for i in range(min(k, self.vdb_official.ntotal))]

        results: List[Tuple[int, float]] = []
        for idx, score in zip(indices[0], distances[0]):
            if idx == -1:
                continue
            if university_id is not None:
                chunk_uni = self.official_metadata.get(int(idx), {}).get("university_id")
                if chunk_uni is not None and chunk_uni != university_id:
                    continue
            results.append((int(idx), float(score)))
            if len(results) >= k:
                break

        return results
    
    def get_official_stats(self) -> Dict[str, int]:
        """Resmi vector store istatistiklerini al."""
        return {
            "total_vectors": self.vdb_official.ntotal,
            "dimension": self.EMBEDDING_DIMENSION,
            "metadata_count": len(self.official_metadata)
        }


_vector_service_instance: Optional[VectorStoreService] = None


def get_vector_service() -> VectorStoreService:
    """VectorStoreService singleton instance'ı al veya oluştur."""
    global _vector_service_instance
    
    if _vector_service_instance is None:
        _vector_service_instance = VectorStoreService()
    
    return _vector_service_instance
