"""KAMPUS+ resmi dokuman ingest scripti.

Yapilanlar:
1. backend/data/raw_docs altindaki .txt ve .pdf dosyalarini tarar.
2. Dokumanlari settings.pdf_chunk_size ve settings.pdf_chunk_overlap ile parcalar.
3. Her parcanin sonuna kaynak dosya adini ekler ve metadata olusturur.
4. Parcalari VectorStoreService.add_to_official ile vektorlere yazar.
5. Islem sonunda FAISS index'ini save_indexes() ile diske kaydeder.
"""

import asyncio
import logging
import sys
from pathlib import Path
from typing import Dict, List, Tuple

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document

# scripts/ altindan calistirilinca backend root path'ini import yoluna ekle
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.core.config import settings
from src.services.vector_service import VectorStoreService


logger = logging.getLogger("ingest_docs")


def configure_logging() -> None:
    """Terminal icin okunabilir log formatini ayarla."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%H:%M:%S",
    )


def ensure_raw_docs_dir() -> Path:
    """Raw docs klasorunu olustur ve path'i dondur."""
    raw_docs_dir = Path(__file__).parent.parent / "data" / "raw_docs"
    raw_docs_dir.mkdir(parents=True, exist_ok=True)
    return raw_docs_dir


def find_source_files(raw_docs_dir: Path) -> List[Path]:
    """Klasordeki .txt ve .pdf kaynak dosyalarini bul."""
    txt_files = list(raw_docs_dir.rglob("*.txt"))
    pdf_files = list(raw_docs_dir.rglob("*.pdf"))

    files = sorted(txt_files + pdf_files)
    return files


def load_txt_file(file_path: Path) -> List[Document]:
    """TXT dosyasini Document listesi olarak yukle."""
    try:
        content = file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        # Farkli kaynaklardan gelen dosyalarda fallback decode.
        content = file_path.read_text(encoding="latin-1")

    return [
        Document(
            page_content=content,
            metadata={
                "source": str(file_path),
                "source_file": file_path.name,
                "file_type": "txt",
            },
        )
    ]


def load_pdf_file(file_path: Path) -> List[Document]:
    """PDF dosyasini LangChain loader ile yukle."""
    loader = PyPDFLoader(str(file_path))
    pages = loader.load()

    for page in pages:
        page.metadata["source"] = str(file_path)
        page.metadata["source_file"] = file_path.name
        page.metadata["file_type"] = "pdf"

    return pages


def load_documents(files: List[Path]) -> List[Document]:
    """Tum kaynak dosyalari okuyup Document listesi dondur."""
    all_docs: List[Document] = []

    for file_path in files:
        logger.info("%s dosyasi okunuyor...", file_path.name)

        try:
            if file_path.suffix.lower() == ".txt":
                docs = load_txt_file(file_path)
            elif file_path.suffix.lower() == ".pdf":
                docs = load_pdf_file(file_path)
            else:
                logger.warning("Desteklenmeyen uzanti atlandi: %s", file_path)
                continue

            all_docs.extend(docs)
            logger.info("%s basariyla yuklendi (%s bolum/sayfa)", file_path.name, len(docs))
        except Exception as exc:
            logger.exception("%s okunurken hata olustu: %s", file_path.name, exc)

    return all_docs


def split_documents(docs: List[Document]) -> Tuple[List[str], List[Dict]]:
    """Document listesini ayarlardaki chunk parametreleriyle parcalar."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.pdf_chunk_size,
        chunk_overlap=settings.pdf_chunk_overlap,
    )

    split_docs = splitter.split_documents(docs)

    chunk_texts: List[str] = []
    chunk_metadata: List[Dict] = []

    for split_doc in split_docs:
        # Legacy metadata anahtarlarini source_file altinda normalize et.
        source_file = (
            split_doc.metadata.get("source_file")
            or split_doc.metadata.get("file_name")
            or Path(str(split_doc.metadata.get("source", "unknown"))).name
        )

        enriched_text = (
            f"{split_doc.page_content}\n\n"
            f"[METADATA] source_file={source_file}"
        )

        chunk_texts.append(enriched_text)
        chunk_metadata.append(
            {
                "source": split_doc.metadata.get("source", ""),
                "source_file": source_file,
                "file_type": split_doc.metadata.get("file_type", "unknown"),
                "page": split_doc.metadata.get("page"),
            }
        )

    return chunk_texts, chunk_metadata


async def ingest() -> None:
    """Ingest akisini calistir."""
    raw_docs_dir = ensure_raw_docs_dir()
    logger.info("Kaynak klasor hazir: %s", raw_docs_dir)

    files = find_source_files(raw_docs_dir)
    if not files:
        logger.warning("Ingest icin dosya bulunamadi. Klasore .txt veya .pdf ekleyin: %s", raw_docs_dir)
        return

    logger.info("Toplam %s kaynak dosya bulundu.", len(files))

    documents = load_documents(files)
    if not documents:
        logger.warning("Okunabilen dokuman bulunamadi. Islem sonlandiriliyor.")
        return

    logger.info("Toplam %s dokuman bolumu yuklendi. Chunk islemi basliyor...", len(documents))
    texts, metadata = split_documents(documents)

    if not texts:
        logger.warning("Chunk olusturulamadi. Islem sonlandiriliyor.")
        return

    logger.info(
        "Chunking tamamlandi: %s adet parca uretildi (chunk_size=%s, overlap=%s)",
        len(texts),
        settings.pdf_chunk_size,
        settings.pdf_chunk_overlap,
    )

    vector_service = VectorStoreService()

    logger.info("Embedding ve FAISS yazimi basliyor...")
    assigned_ids = await vector_service.add_to_official(texts=texts, metadata=metadata)

    # add_to_official icinde kayit olsa da surecin sonunda acikca tekrar kaydediyoruz.
    vector_service.save_indexes()

    logger.info("%s adet parca vektorlere cevrildi ve kaydedildi.", len(assigned_ids))
    logger.info("Ingest tamamlandi. Official index toplam vektor: %s", vector_service.vdb_official.ntotal)


if __name__ == "__main__":
    configure_logging()

    try:
        asyncio.run(ingest())
    except KeyboardInterrupt:
        logger.warning("Islem kullanici tarafindan durduruldu.")
    except Exception as exc:
        logger.exception("Ingest sirasinda beklenmeyen hata: %s", exc)
        raise
