from __future__ import annotations

from pydantic import BaseModel


class SearchHit(BaseModel):
    id: str
    title: str
    snippet: str | None = None
    href: str
    type: str
    image_url: str | None = None


class SearchSection(BaseModel):
    title: str
    hits: list[SearchHit]
    total: int


class GlobalSearchResponse(BaseModel):
    query: str
    results: dict[str, SearchSection]
