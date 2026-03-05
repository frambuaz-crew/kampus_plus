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
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.dependencies import get_current_user
from src.models.ai import AIConversation, AIMessage
from src.models.user import User
from src.services.ai_service import AIService
from src.services.vector_service import VectorStoreService, get_vector_service

router = APIRouter(prefix="/ai", tags=["AI Assistant"])

DAILY_MESSAGE_LIMIT = 50


class ReferenceResponse(BaseModel):
	type: str
	label: str
	url: str


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


def _utc_day_start_naive() -> datetime:
	now_utc = datetime.now(timezone.utc)
	return datetime(now_utc.year, now_utc.month, now_utc.day)


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
		references.append(
			ReferenceResponse(
				type=source_type,
				label=title,
				url=_source_url(source_type),
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


async def _count_today_user_messages(session: AsyncSession, user_id: str) -> int:
	day_start = _utc_day_start_naive()
	stmt = (
		select(func.count(AIMessage.id))
		.join(AIConversation, AIMessage.conversation_id == AIConversation.id)
		.where(
			AIConversation.user_id == user_id,
			AIMessage.role == "user",
			AIMessage.created_at >= day_start,
		)
	)
	result = await session.execute(stmt)
	return int(result.scalar() or 0)


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
	used_messages = await _count_today_user_messages(session=session, user_id=current_user.id)
	remaining = max(DAILY_MESSAGE_LIMIT - used_messages, 0)

	return RemainingMessagesResponse(
		remaining=remaining,
		limit=DAILY_MESSAGE_LIMIT,
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

	remaining = max(DAILY_MESSAGE_LIMIT - await _count_today_user_messages(session, current_user.id), 0)

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

	used_messages = await _count_today_user_messages(session=session, user_id=current_user.id)
	if used_messages >= DAILY_MESSAGE_LIMIT:
		raise HTTPException(
			status_code=status.HTTP_429_TOO_MANY_REQUESTS,
			detail={
				"error": {
					"code": "DAILY_LIMIT_EXCEEDED",
					"message": "Günlük mesaj limitine ulaşıldı.",
					"remaining": 0,
					"limit": DAILY_MESSAGE_LIMIT,
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

	conversation.updated_at = _utc_naive()
	await session.commit()
	await session.refresh(user_message)
	await session.refresh(assistant_message)

	remaining_messages = max(DAILY_MESSAGE_LIMIT - (used_messages + 1), 0)

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
