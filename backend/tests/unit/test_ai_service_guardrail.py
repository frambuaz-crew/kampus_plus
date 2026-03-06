"""AIService guardrail unit tests."""

import importlib.util
import sys
import types
from pathlib import Path
from typing import Optional
from uuid import uuid4

import pytest


def _load_ai_service_class():
    """Load AIService directly from file to avoid package-level heavy imports in tests."""
    config_module = types.ModuleType("src.core.config")
    config_module.settings = types.SimpleNamespace(
        gemini_model="gemini-1.5-flash",
        gemini_temperature=0.7,
        gemini_max_tokens=8192,
        google_api_key="test-key",
        vector_search_k=5,
    )
    sys.modules["src.core.config"] = config_module

    vector_module = types.ModuleType("src.services.vector_service")

    class VectorStoreService:  # pragma: no cover - test double
        pass

    vector_module.VectorStoreService = VectorStoreService
    sys.modules["src.services.vector_service"] = vector_module

    module_path = Path(__file__).resolve().parents[2] / "src" / "services" / "ai_service.py"
    spec = importlib.util.spec_from_file_location("_ai_service_for_tests", module_path)
    assert spec is not None and spec.loader is not None

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.AIService


AIService = _load_ai_service_class()


@pytest.mark.unit
@pytest.mark.asyncio
@pytest.mark.parametrize(
    "question, expected_block, early_return_session",
    [
        ("Bunu çöz: 2x + 5 = 9", True, "session-early-return"),
        ("Ödevimi yap lütfen", True, None),
        ("Bu integral hesapla", True, None),
        ("Türev sorusunun kodunu yaz", True, None),
        ("Matematik sınavı ne zaman?", False, None),
        ("Matematik sınavı nerede yapılacak?", False, None),
        ("Integral dersi ne zaman?", False, None),
        ("Kampüste yemekhane nerede?", False, None),
    ],
)
async def test_guardrail_scenarios_parameterized(
    question: str,
    expected_block: bool,
    early_return_session: Optional[str],
) -> None:
    assert AIService._should_block_academic_request(question) is expected_block

    if early_return_session:
        service = AIService.__new__(AIService)

        def _fail_if_called(*args, **kwargs):
            raise AssertionError("RAG pipeline should not run when guardrail blocks the request")

        service._format_chat_history = _fail_if_called
        service._create_rag_chain = _fail_if_called
        service._create_retriever = _fail_if_called

        result = await service.query(
            question=question,
            user_id=uuid4(),
            session_id=early_return_session,
            session_history=[],
        )

        assert result["answer"] == AIService.ACADEMIC_GUARDRAIL_RESPONSE
        assert result["sources"] == []
        assert result["session_id"] == early_return_session
        assert "error" not in result
