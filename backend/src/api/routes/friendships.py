"""Arkadaşlık (Friendship) API rotaları.

Endpoints:
  POST   /api/v1/friendships/request          - İstek gönder
  PUT    /api/v1/friendships/respond/{id}     - İsteği yanıtla
  GET    /api/v1/friendships/friends          - Arkadaş listesi
  GET    /api/v1/friendships/pending          - Bekleyen istekler
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.user import User
from src.schemas.friendship import FriendshipCreate, FriendshipResponse, FriendshipUpdate
from src.services.friendship_service import friendship_service

router = APIRouter(prefix="/friendships", tags=["Friendships"])


def _friendship_to_dict(f, current_user_id: str) -> dict:
    """Friendship ORM nesnesini yanıt dict'ine dönüştürür.
    
    Karşı tarafın bilgilerini 'other_user' alanında döndürür.
    """
    base = {
        "id": f.id,
        "requester_id": f.requester_id,
        "addressee_id": f.addressee_id,
        "status": f.status,
        "created_at": f.created_at,
        "updated_at": f.updated_at,
        "requester": None,
        "addressee": None,
    }

    if hasattr(f, "requester") and f.requester:
        r = f.requester
        base["requester"] = {
            "id": r.id,
            "username": r.username,
            "first_name": r.first_name,
            "last_name": r.last_name,
            "profile_picture_url": r.profile_picture_url,
        }

    if hasattr(f, "addressee") and f.addressee:
        a = f.addressee
        base["addressee"] = {
            "id": a.id,
            "username": a.username,
            "first_name": a.first_name,
            "last_name": a.last_name,
            "profile_picture_url": a.profile_picture_url,
        }

    return base


@router.post("/request", status_code=status.HTTP_201_CREATED)
async def send_friend_request(
    body: FriendshipCreate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Başka bir kullanıcıya arkadaşlık isteği gönderir."""
    try:
        friendship = await friendship_service.send_request(
            db=session,
            requester_id=current_user.id,
            addressee_id=body.addressee_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "FRIENDSHIP_ERROR", "message": str(exc)}},
        )

    return {
        "id": friendship.id,
        "requester_id": friendship.requester_id,
        "addressee_id": friendship.addressee_id,
        "status": friendship.status,
        "created_at": friendship.created_at,
        "updated_at": friendship.updated_at,
    }


@router.put("/respond/{friendship_id}")
async def respond_to_friend_request(
    friendship_id: str,
    body: FriendshipUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gelen arkadaşlık isteğini kabul eder veya reddeder."""
    try:
        friendship = await friendship_service.respond_to_request(
            db=session,
            friendship_id=friendship_id,
            user_id=current_user.id,
            status=body.status,
        )
    except ValueError as exc:
        code = "NOT_FOUND" if "bulunamadı" in str(exc) else "FRIENDSHIP_ERROR"
        http_status = (
            status.HTTP_404_NOT_FOUND
            if code == "NOT_FOUND"
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(
            status_code=http_status,
            detail={"error": {"code": code, "message": str(exc)}},
        )

    return {
        "id": friendship.id,
        "requester_id": friendship.requester_id,
        "addressee_id": friendship.addressee_id,
        "status": friendship.status,
        "created_at": friendship.created_at,
        "updated_at": friendship.updated_at,
    }


@router.get("/friends")
async def list_friends(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Kullanıcının kabul edilmiş arkadaşlarını döndürür."""
    friendships = await friendship_service.get_friends(db=session, user_id=current_user.id)
    return {
        "total": len(friendships),
        "friends": [_friendship_to_dict(f, current_user.id) for f in friendships],
    }


@router.get("/pending")
async def list_pending_requests(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Kullanıcıya gelen bekleyen arkadaşlık isteklerini döndürür."""
    pending = await friendship_service.get_pending_requests(db=session, user_id=current_user.id)
    return {
        "total": len(pending),
        "requests": [_friendship_to_dict(f, current_user.id) for f in pending],
    }
