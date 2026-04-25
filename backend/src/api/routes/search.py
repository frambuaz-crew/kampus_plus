"""Platform geneli arama — forum, pazar, kariyer, kullanıcı, hızlı sayfalar."""

from __future__ import annotations

from typing import Any, Sequence

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.career import CareerListing
from src.models.forum import ForumTopic
from src.models.marketplace import MarketplaceListing
from src.models.user import User, UserRole

router = APIRouter(prefix="/search", tags=["Search"])

# Kenar çubuğundaki sayfalara hızlı git — başlık / anahtar kelimeler
_QUICK: tuple[dict[str, Any], ...] = (
    {
        "id": "nav-career",
        "title": "Kariyer — İş, staj ve proje ilanları",
        "href": "/dashboard/career",
        "keywords": ("kariyer", "iş", "staj", "ilan", "başvuru", "mülakat", "kariy", "career", "proje", "startup"),
    },
    {
        "id": "nav-pazar",
        "title": "Pazar — İkinci el ve ilanlar",
        "href": "/dashboard/marketplace",
        "keywords": ("pazar", "satılık", "market", "alışveriş", "sat", "paz"),
    },
    {
        "id": "nav-forum",
        "title": "Forum — Konular ve tartışmalar",
        "href": "/dashboard/forum",
        "keywords": ("forum", "konu", "tartışma", "soru", "soru-cevap", "for", "düşünce"),
    },
    {
        "id": "nav-mesaj",
        "title": "Mesajlar",
        "href": "/dashboard/messages",
        "keywords": ("mesaj", "sohbet", "chat", "dm", "mes", "yaz"),
    },
    {
        "id": "nav-ai",
        "title": "AI Asistan",
        "href": "/dashboard/ai-assistant",
        "keywords": ("ai", "asistan", "yardım", "kampus", "soru", "asist"),
    },
    {
        "id": "nav-ana",
        "title": "Ana sayfa",
        "href": "/dashboard",
        "keywords": ("ana", "gösterge", "home", "dashboard", "göster", "an"),
    },
    {
        "id": "nav-ayar",
        "title": "Ayarlar",
        "href": "/dashboard/settings",
        "keywords": ("ayar", "şifre", "hesap", "tema", "bildirim ayar", "aya", "gizlilik"),
    },
    {
        "id": "nav-bildirim",
        "title": "Bildirimler",
        "href": "/dashboard/notifications",
        "keywords": ("bildirim", "duyuru", "bildir", "bildirimler"),
    },
    {
        "id": "nav-not",
        "title": "Ders notları",
        "href": "/dashboard/course-notes",
        "keywords": ("not", "ders", "pdf", "özet", "döküman", "note"),
    },
    {
        "id": "nav-takvim",
        "title": "Akademik takvim",
        "href": "/dashboard/academic-calendar",
        "keywords": ("takvim", "akademik", "güz", "bahar", "yarıyıl", "takv", "mazeret", "vize", "final"),
    },
    {
        "id": "nav-dersprg",
        "title": "Ders programı",
        "href": "/dashboard/course-schedule",
        "keywords": ("program", "hafta", "ders saat", "dprg", "programı"),
    },
)


def _snippet(text: str | None, max_len: int = 120) -> str:
    if not text:
        return ""
    t = text.replace("\n", " ").strip()
    if len(t) <= max_len:
        return t
    return t[: max_len - 1] + "…"


def _term_matches_text(term: str, *candidates: str) -> bool:
    """'ka' → 'kariyer' ön eki; 'kariyer' → alt kelime eşleşmesi."""
    t = (term or "").strip().lower()
    if not t:
        return False
    for raw in candidates:
        c = raw.strip().lower()
        if not c:
            continue
        if t in c or c.startswith(t):
            return True
        if len(t) >= 2 and t in c:
            return True
    return False


def _quick_hits_for_query(q: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    t = (q or "").strip()
    if not t:
        return out
    for it in _QUICK:
        title = it["title"]
        kws: Sequence[str] = it.get("keywords", ())
        if _term_matches_text(t, title, *kws):
            out.append(
                {
                    "id": it["id"],
                    "title": title,
                    "snippet": "Uygulama sayfası",
                    "type": "page",
                    "href": it["href"],
                }
            )
    return out


async def _search_core_async(
    term: str,
    limit: int,
    session: AsyncSession,
    current_user: User,
) -> dict[str, Any]:
    pattern = f"%{term}%"

    ft_q = select(ForumTopic).where(ForumTopic.is_deleted.is_(False))
    if UserRole(current_user.role) != UserRole.ADMIN:
        ft_q = ft_q.where(
            or_(
                ForumTopic.university_id == current_user.university_id,
                ForumTopic.university_id.is_(None),
            )
        )
    ft_q = (
        ft_q.where(
            or_(
                ForumTopic.title.ilike(pattern),
                ForumTopic.content.ilike(pattern),
            )
        )
        .order_by(ForumTopic.created_at.desc())
        .limit(limit)
    )
    ft_res = await session.execute(ft_q)
    forum_results = [
        {
            "id": t.id,
            "title": t.title,
            "snippet": _snippet(t.content),
            "type": "forum",
            "href": f"/dashboard/forum/{t.id}",
        }
        for t in ft_res.scalars().all()
    ]

    mp_res = await session.execute(
        select(MarketplaceListing)
        .where(MarketplaceListing.status == "active")
        .where(
            or_(
                MarketplaceListing.title.ilike(pattern),
                MarketplaceListing.description.ilike(pattern),
                MarketplaceListing.category.ilike(pattern),
            )
        )
        .order_by(MarketplaceListing.created_at.desc())
        .limit(limit)
    )
    marketplace_results = [
        {
            "id": l.id,
            "title": l.title,
            "snippet": _snippet(l.description),
            "type": "marketplace",
            "href": f"/dashboard/marketplace/{l.id}",
        }
        for l in mp_res.scalars().all()
    ]

    cr_res = await session.execute(
        select(CareerListing)
        .where(CareerListing.status == "active")
        .where(
            or_(
                CareerListing.title.ilike(pattern),
                CareerListing.description.ilike(pattern),
                CareerListing.company_name.ilike(pattern),
                CareerListing.required_position.ilike(pattern),
                CareerListing.sector.ilike(pattern),
                CareerListing.type.ilike(pattern),
            )
        )
        .order_by(CareerListing.created_at.desc())
        .limit(limit)
    )
    career_results = [
        {
            "id": l.id,
            "title": l.title,
            "snippet": _snippet(l.description),
            "type": "career",
            "href": f"/dashboard/career/{l.id}",
        }
        for l in cr_res.scalars().all()
    ]

    u_q = select(User).where(User.id != current_user.id, User.is_deleted.is_(False))
    if current_user.university_id:
        u_q = u_q.where(
            or_(
                User.university_id == current_user.university_id,
                User.university_id.is_(None),
            )
        )
    u_res = await session.execute(
        u_q.where(
            or_(
                User.username.ilike(pattern),
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                User.university.ilike(pattern),
            )
        )
        .order_by(User.username.asc())
        .limit(limit)
    )
    user_results = [
        {
            "id": u.id,
            "title": f"{u.first_name} {u.last_name}".strip() or u.username,
            "snippet": f"@{u.username}" + (f" · {u.university}" if u.university else ""),
            "type": "user",
            "href": f"/dashboard/profile/{u.username}",
        }
        for u in u_res.scalars().all()
    ]

    pages = _quick_hits_for_query(term)
    content_total = len(forum_results) + len(marketplace_results) + len(career_results) + len(user_results)
    return {
        "query": term,
        "total": content_total + len(pages),
        "pages": pages,
        "forum": forum_results,
        "marketplace": marketplace_results,
        "career": career_results,
        "users": user_results,
    }


@router.get("", response_model=dict)
async def global_search(
    q: str = Query(..., min_length=2, description="Arama metni"),
    limit: int = Query(8, ge=1, le=30, description="Her kategori için max sonuç"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    return await _search_core_async(q.strip(), limit, session, current_user)


@router.get("/suggest", response_model=dict)
async def search_suggest(
    q: str = Query(..., min_length=1, description="Öneri (1+ karakter)"),
    limit: int = Query(5, ge=1, le=10),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Header / otomatik tamamlama: sayfa önerileri + az içerik sonucu."""
    term = q.strip()
    if len(term) < 1:
        return {"query": term, "pages": [], "forum": [], "marketplace": [], "career": [], "users": []}
    if len(term) < 2:
        pages_only = _quick_hits_for_query(term)
        return {
            "query": term,
            "total": len(pages_only),
            "pages": pages_only,
            "forum": [],
            "marketplace": [],
            "career": [],
            "users": [],
        }
    return await _search_core_async(term, limit, session, current_user)
