from src.core.config import get_settings

s = get_settings()
print(f"OpenAI key exists: {bool(s.openai_api_key)}")
print(f"Key length: {len(s.openai_api_key) if s.openai_api_key else 0}")
print(f"Key prefix: {s.openai_api_key[:10] if s.openai_api_key else 'NONE'}")
