"""Sadece Konya universitelerini FAISS official hafizasina seed eder."""

import asyncio
import json
import sys
from pathlib import Path

# scripts/ altindan calistirilinca backend root path'ini import yoluna ekle
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.services.vector_service import get_vector_service


def is_konya_city(city_value: object) -> bool:
    """city alani Konya ise True dondur."""
    if city_value is None:
        return False
    return str(city_value).strip().lower() == "konya"


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


async def seed_konya_vectors() -> None:
    """universities.json icinden Konya universitelerini vektorlere yazar."""
    json_path = Path(__file__).parent.parent / "data" / "universities.json"

    if not json_path.exists():
        raise FileNotFoundError(f"JSON dosyasi bulunamadi: {json_path}")

    with json_path.open("r", encoding="utf-8") as file:
        universities = json.load(file)

    if not isinstance(universities, list):
        raise ValueError("universities.json liste formatinda olmali")

    konya_universities = [uni for uni in universities if is_konya_city(uni.get("city"))]
    texts = build_university_texts(konya_universities)

    if not texts:
        print("Konya universitesi bulunamadi, yukleme yapilmadi.")
        return

    vs = get_vector_service()
    await vs.add_to_official(texts)

    print(f"Konya universiteleri ({len(texts)} adet) basariyla yuklendi")


if __name__ == "__main__":
    if sys.platform == "win32":
        import selectors

        asyncio.run(
            seed_konya_vectors(),
            loop_factory=lambda: asyncio.SelectorEventLoop(selectors.SelectSelector()),
        )
    else:
        asyncio.run(seed_konya_vectors())
