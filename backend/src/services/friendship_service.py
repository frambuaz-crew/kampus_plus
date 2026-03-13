"""Arkadaşlık (Friendship) servis katmanı.

İş mantığı: istek gönderme, yanıtlama, arkadaş listesi, bekleyen istekler.
"""

from datetime import datetime
from typing import List

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.friendship import Friendship
from src.models.user import User


class FriendshipService:
    async def send_request(
        self,
        db: AsyncSession,
        requester_id: str,
        addressee_id: str,
    ) -> Friendship:
        """Arkadaşlık isteği gönderir.

        Raises:
            ValueError: Kendine istek, kullanıcı bulunamadı veya zaten ilişki var.
        """
        if requester_id == addressee_id:
            raise ValueError("Kendinize arkadaşlık isteği gönderemezsiniz.")

        # Addressee'nin varlığını kontrol et
        user_stmt = select(User).where(User.id == addressee_id, User.is_active.is_(True))
        user_result = await db.execute(user_stmt)
        if not user_result.scalar_one_or_none():
            raise ValueError("Kullanıcı bulunamadı.")

        # Her iki yönde de mevcut ilişki kontrolü
        existing_stmt = select(Friendship).where(
            or_(
                and_(
                    Friendship.requester_id == requester_id,
                    Friendship.addressee_id == addressee_id,
                ),
                and_(
                    Friendship.requester_id == addressee_id,
                    Friendship.addressee_id == requester_id,
                ),
            )
        )
        existing_result = await db.execute(existing_stmt)
        existing = existing_result.scalar_one_or_none()

        if existing:
            if existing.status == "pending":
                raise ValueError("Bu kullanıcıya zaten bekleyen bir istek mevcut.")
            if existing.status == "accepted":
                raise ValueError("Bu kullanıcı zaten arkadaşınız.")
            # 'rejected' ise yeniden istek atılabilsin — eski kaydı güncelle
            existing.status = "pending"
            existing.requester_id = requester_id
            existing.addressee_id = addressee_id
            existing.updated_at = datetime.utcnow()
            await db.commit()
            await db.refresh(existing)
            return existing

        friendship = Friendship(
            requester_id=requester_id,
            addressee_id=addressee_id,
            status="pending",
        )
        db.add(friendship)
        await db.commit()
        await db.refresh(friendship)
        return friendship

    async def respond_to_request(
        self,
        db: AsyncSession,
        friendship_id: str,
        user_id: str,
        status: str,
    ) -> Friendship:
        """Arkadaşlık isteğini kabul eder veya reddeder.

        Raises:
            ValueError: İstek bulunamadı, yetkisiz veya zaten yanıtlanmış.
        """
        stmt = select(Friendship).where(Friendship.id == friendship_id)
        result = await db.execute(stmt)
        friendship = result.scalar_one_or_none()

        if not friendship:
            raise ValueError("Arkadaşlık isteği bulunamadı.")

        if friendship.addressee_id != user_id:
            raise ValueError("Bu isteği yanıtlama yetkiniz yok.")

        if friendship.status != "pending":
            raise ValueError("Bu istek zaten yanıtlanmış.")

        friendship.status = status
        friendship.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(friendship)
        return friendship

    async def get_friends(
        self, db: AsyncSession, user_id: str
    ) -> List[Friendship]:
        """Durumu 'accepted' olan tüm arkadaşlıkları döndürür (her iki yön)."""
        stmt = (
            select(Friendship)
            .where(
                Friendship.status == "accepted",
                or_(
                    Friendship.requester_id == user_id,
                    Friendship.addressee_id == user_id,
                ),
            )
            .options(
                selectinload(Friendship.requester),
                selectinload(Friendship.addressee),
            )
            .order_by(Friendship.updated_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_pending_requests(
        self, db: AsyncSession, user_id: str
    ) -> List[Friendship]:
        """Kullanıcıya gelen ve henüz yanıtlanmamış istekleri döndürür."""
        stmt = (
            select(Friendship)
            .where(
                Friendship.addressee_id == user_id,
                Friendship.status == "pending",
            )
            .options(selectinload(Friendship.requester))
            .order_by(Friendship.created_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())


friendship_service = FriendshipService()
