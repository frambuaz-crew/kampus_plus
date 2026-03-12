"""AI Assistant Chat API routes for KAMPÜS+ Platform.

Bu dosya spec'e göre yeniden yazılacak.
Spec: specs/009-ai-assistant/spec.md

Endpoint'ler:
- POST /api/v1/ai/chat
- GET /api/v1/ai/conversation
- GET /api/v1/ai/remaining-messages
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.ai import AIConversation, AIMessage
from src.models.user import User
from src.services.ai_service import AIService
from src.services.vector_service import VectorStoreService, get_vector_service

router = APIRouter(prefix="/ai", tags=["AI Assistant"])


class ReferenceResponse(BaseModel):
	type: str
	label: str
	url: str
	source_file: str


class AIMessageResponse(BaseModel):
	id: str
	session_id: Optional[str]
	role: str
	content: str
	references: Optional[List[ReferenceResponse]] = None
	created_at: datetime


class SendMessageRequest(BaseModel):
	message: str = Field(..., min_length=1, max_length=500)


class SendMessageResponse(BaseModel):
	conversation_id: str
	user_message: AIMessageResponse
	assistant_message: AIMessageResponse
	remaining_messages: int


class ConversationResponse(BaseModel):
	conversation_id: Optional[str]
	messages: List[AIMessageResponse]
	remaining_messages: int


class RemainingMessagesResponse(BaseModel):
	remaining: int
	limit: int
	resets_at: datetime


class ConversationDeleteResponse(BaseModel):
	cleared: bool


_ai_service_instance: Optional[AIService] = None


def _utc_naive() -> datetime:
	return datetime.now(timezone.utc).replace(tzinfo=None)


def _next_reset_at() -> datetime:
	now_utc = datetime.now(timezone.utc)
	midnight_utc = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
	return midnight_utc + timedelta(days=1)


def _source_url(source_type: str) -> str:
	source_to_url = {
		"official": "/dashboard",
		"forum": "/forum",
		"marketplace": "/marketplace",
		"career": "/career",
	}
	return source_to_url.get(source_type, "/dashboard")


def _to_references(sources: List[Dict[str, Any]]) -> List[ReferenceResponse]:
	references: List[ReferenceResponse] = []
	for source in sources:
		source_type = source.get("source_type", "official")
		title = source.get("title") or "Kaynak"
		source_file = (
			source.get("source_file")
			or (source.get("metadata") or {}).get("source_file")
		)

		if not source_file:
			continue

		references.append(
			ReferenceResponse(
				type=source_type,
				label=title,
				url=_source_url(source_type),
				source_file=source_file,
			)
		)
	return references


def _build_history_pairs(messages: List[AIMessage]) -> List[Dict[str, str]]:
	history_pairs: List[Dict[str, str]] = []
	pending_question: Optional[str] = None

	for message in messages:
		if message.role == "user":
			pending_question = message.content
			continue

		if message.role == "assistant" and pending_question:
			history_pairs.append({"question": pending_question, "answer": message.content})
			pending_question = None

	return history_pairs


def _is_new_utc_day(last_reset: Optional[datetime]) -> bool:
	if last_reset is None:
		return True
	today_utc = datetime.now(timezone.utc).date()
	return last_reset.date() != today_utc


async def _get_user_daily_usage_state(
	session: AsyncSession,
	user_id: str,
	with_lock: bool = False,
) -> User:
	stmt = select(User).where(User.id == user_id)
	if with_lock:
		stmt = stmt.with_for_update()

	result = await session.execute(stmt)
	user = result.scalar_one_or_none()

	if user is None:
		raise HTTPException(
			status_code=status.HTTP_404_NOT_FOUND,
			detail={"error": {"code": "USER_NOT_FOUND", "message": "Kullanıcı bulunamadı."}},
		)

	if settings.ENABLE_USAGE_LIMIT and _is_new_utc_day(user.last_message_reset):
		user.daily_message_count = 0
		user.last_message_reset = _utc_naive()

	return user


async def _get_remaining_messages_for_user(session: AsyncSession, user_id: str) -> int:
	if not settings.ENABLE_USAGE_LIMIT:
		return settings.DAILY_MESSAGE_LIMIT

	user = await _get_user_daily_usage_state(session=session, user_id=user_id)
	return max(settings.DAILY_MESSAGE_LIMIT - user.daily_message_count, 0)


def get_vector_service_dependency() -> VectorStoreService:
	return get_vector_service()


def get_ai_service_dependency(
	vector_service: VectorStoreService = Depends(get_vector_service_dependency),
) -> AIService:
	global _ai_service_instance

	if _ai_service_instance is None:
		_ai_service_instance = AIService(vector_service=vector_service)

	return _ai_service_instance


@router.get("/remaining-messages", response_model=RemainingMessagesResponse)
async def get_remaining_messages(
	current_user: User = Depends(get_current_user),
	session: AsyncSession = Depends(get_db),
) -> RemainingMessagesResponse:
	remaining = await _get_remaining_messages_for_user(session=session, user_id=current_user.id)

	return RemainingMessagesResponse(
		remaining=remaining,
		limit=settings.DAILY_MESSAGE_LIMIT,
		resets_at=_next_reset_at(),
	)


@router.get("/conversation", response_model=ConversationResponse)
async def get_conversation(
	current_user: User = Depends(get_current_user),
	session: AsyncSession = Depends(get_db),
) -> ConversationResponse:
	convo_stmt = (
		select(AIConversation)
		.where(AIConversation.user_id == current_user.id)
		.order_by(AIConversation.updated_at.desc())
		.limit(1)
	)
	convo_result = await session.execute(convo_stmt)
	conversation = convo_result.scalar_one_or_none()

	remaining = await _get_remaining_messages_for_user(session=session, user_id=current_user.id)

	if not conversation:
		return ConversationResponse(conversation_id=None, messages=[], remaining_messages=remaining)

	messages_stmt = (
		select(AIMessage)
		.where(AIMessage.conversation_id == conversation.id)
		.order_by(AIMessage.created_at.asc())
	)
	messages_result = await session.execute(messages_stmt)
	records = messages_result.scalars().all()

	messages = [
		AIMessageResponse(
			id=record.id,
			session_id=record.conversation_id,
			role=record.role,
			content=record.content,
			references=None,
			created_at=record.created_at,
		)
		for record in records
	]

	return ConversationResponse(
		conversation_id=conversation.id,
		messages=messages,
		remaining_messages=remaining,
	)


@router.delete("/conversation", response_model=ConversationDeleteResponse)
async def delete_conversation(
	current_user: User = Depends(get_current_user),
	session: AsyncSession = Depends(get_db),
	ai_service: AIService = Depends(get_ai_service_dependency),
) -> ConversationDeleteResponse:
	conversations_stmt = select(AIConversation).where(AIConversation.user_id == current_user.id)
	conversations_result = await session.execute(conversations_stmt)
	conversations = conversations_result.scalars().all()

	if conversations:
		for conversation in conversations:
			await session.delete(conversation)
		await session.commit()

	ai_service.reset_conversation(user_id=current_user.id)

	return ConversationDeleteResponse(cleared=True)


@router.post(
	"/chat",
	response_model=SendMessageResponse,
	responses={
		400: {"description": "Invalid message"},
		429: {"description": "Daily message limit exceeded"},
	},
)
async def send_chat_message(
	request: SendMessageRequest,
	current_user: User = Depends(get_current_user),
	session: AsyncSession = Depends(get_db),
	ai_service: AIService = Depends(get_ai_service_dependency),
) -> SendMessageResponse:
	message_text = request.message.strip()
	if not message_text:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail={"error": {"code": "INVALID_MESSAGE", "message": "Mesaj boş olamaz."}},
		)

	usage_user: Optional[User] = None
	used_messages = 0

	if settings.ENABLE_USAGE_LIMIT:
		usage_user = await _get_user_daily_usage_state(
			session=session,
			user_id=current_user.id,
			with_lock=True,
		)
		used_messages = usage_user.daily_message_count

		if used_messages >= settings.DAILY_MESSAGE_LIMIT:
			raise HTTPException(
				status_code=status.HTTP_429_TOO_MANY_REQUESTS,
				detail={
					"error": {
						"code": "DAILY_LIMIT_EXCEEDED",
						"message": "Günlük mesaj limitine ulaşıldı.",
						"remaining": 0,
						"limit": settings.DAILY_MESSAGE_LIMIT,
					}
				},
			)

	convo_stmt = (
		select(AIConversation)
		.where(AIConversation.user_id == current_user.id)
		.order_by(AIConversation.updated_at.desc())
		.limit(1)
	)
	convo_result = await session.execute(convo_stmt)
	conversation = convo_result.scalar_one_or_none()

	if not conversation:
		conversation = AIConversation(
			user_id=current_user.id,
			created_at=_utc_naive(),
			updated_at=_utc_naive(),
		)
		session.add(conversation)
		await session.flush()

	history_stmt = (
		select(AIMessage)
		.where(AIMessage.conversation_id == conversation.id)
		.order_by(AIMessage.created_at.asc())
	)
	history_result = await session.execute(history_stmt)
	history_messages = history_result.scalars().all()
	history_pairs = _build_history_pairs(history_messages)

	user_message = AIMessage(
		conversation_id=conversation.id,
		role="user",
		content=message_text,
		created_at=_utc_naive(),
	)
	session.add(user_message)
	await session.flush()

	ai_result = await ai_service.query(
		question=message_text,
		user_id=current_user.id,
		session_id=conversation.id,
		session_history=history_pairs,
	)

	assistant_text = ai_result.get("answer") or "Üzgünüm, şu anda yanıt üretemedim."
	references = _to_references(ai_result.get("sources", []))

	assistant_message = AIMessage(
		conversation_id=conversation.id,
		role="assistant",
		content=assistant_text,
		created_at=_utc_naive(),
	)
	session.add(assistant_message)

	if settings.ENABLE_USAGE_LIMIT and usage_user is not None:
		usage_user.daily_message_count = used_messages + 1
		if usage_user.last_message_reset is None:
			usage_user.last_message_reset = _utc_naive()

	conversation.updated_at = _utc_naive()
	await session.commit()
	await session.refresh(user_message)
	await session.refresh(assistant_message)

	if settings.ENABLE_USAGE_LIMIT:
		remaining_messages = max(settings.DAILY_MESSAGE_LIMIT - (used_messages + 1), 0)
	else:
		remaining_messages = settings.DAILY_MESSAGE_LIMIT

	return SendMessageResponse(
		conversation_id=conversation.id,
		user_message=AIMessageResponse(
			id=user_message.id,
			session_id=conversation.id,
			role="user",
			content=user_message.content,
			references=None,
			created_at=user_message.created_at,
		),
		assistant_message=AIMessageResponse(
			id=assistant_message.id,
			session_id=conversation.id,
			role="assistant",
			content=assistant_message.content,
			references=references,
			created_at=assistant_message.created_at,
		),
		remaining_messages=remaining_messages,
	)
