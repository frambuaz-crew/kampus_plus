"""Universite verilerini FAISS official hafizasina seed eder."""

import asyncio
import json
import sys
from pathlib import Path

# scripts/ altindan calistirilinca backend root path'ini import yoluna ekle
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.services.vector_service import get_vector_service


BATCH_SIZE = 50
SLEEP_SECONDS = 2


def build_university_texts(universities: list[dict]) -> list[str]:
    """Universite kayitlarini embedding icin metin formatina cevir."""
    texts: list[str] = []

    for uni in universities:
        name = str(uni.get("name", "")).strip()
        city = str(uni.get("city", "")).strip()
        university_type = str(uni.get("university_type", uni.get("type", ""))).strip()

        if not name:
            continue

        texts.append(f"{name} - {city} - {university_type}")

    return texts


async def seed_vectors() -> None:
    """universities.json verilerini Gemini embedding ile FAISS'e yaz."""
    json_path = Path(__file__).parent.parent / "data" / "universities.json"

    if not json_path.exists():
        raise FileNotFoundError(f"JSON dosyasi bulunamadi: {json_path}")

    with json_path.open("r", encoding="utf-8") as file:
        universities = json.load(file)

    if not isinstance(universities, list):
        raise ValueError("universities.json liste formatinda olmali")

    texts = build_university_texts(universities)
    if not texts:
        print("Eklenecek universite metni bulunamadi.")
        return

    vs = get_vector_service()

    total = len(texts)
    total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE

    print(f"Toplam {total} universite metni {total_batches} grup halinde gonderilecek.")

    for batch_index in range(total_batches):
        start = batch_index * BATCH_SIZE
        end = min(start + BATCH_SIZE, total)
        batch_texts = texts[start:end]

        print(
            f"Grup {batch_index + 1}/{total_batches} gonderiliyor "
            f"({len(batch_texts)} kayit, indeks {start}-{end - 1})..."
        )
        await vs.add_to_official(batch_texts)
        print(f"Grup {batch_index + 1} tamamlandi.")

        if batch_index < total_batches - 1:
            print(
                f"Grup {batch_index + 2} icin {SLEEP_SECONDS} saniye bekleniyor..."
            )
            await asyncio.sleep(SLEEP_SECONDS)

    print(f"Toplam vektor sayisi: {vs.vdb_official.ntotal}")


if __name__ == "__main__":
    if sys.platform == "win32":
        import selectors

        asyncio.run(
            seed_vectors(),
            loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
        )
    else:
        asyncio.run(seed_vectors())
