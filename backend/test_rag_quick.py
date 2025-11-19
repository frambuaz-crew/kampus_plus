"""Test AI service with real RAG retrieval."""
import asyncio
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from uuid import UUID
from src.services.ai_service import AIService


async def test_rag():
    """Test AI service query with real vector retrieval."""
    print("🧪 Testing RAG Pipeline...")
    print("=" * 60)
    
    # Initialize AI service
    ai_service = AIService()
    
    # Test user ID
    user_id = UUID("2d5e4369-154e-4d59-bb2d-075729027ab4")
    
    # Test question
    question = "BİL101 dersi ne zaman?"
    print(f"\n❓ Soru: {question}")
    
    # Query AI
    result = await ai_service.query(
        question=question,
        user_id=user_id,
        session_id="test-session",
        anonymize=False  # Skip anonymization for testing
    )
    
    print(f"\n✅ Cevap:")
    print(f"   {result['answer']}")
    
    print(f"\n📚 Kaynaklar ({len(result['sources'])} adet):")
    for i, source in enumerate(result['sources'], 1):
        print(f"   [{i}] {source.get('title', 'N/A')}")
        print(f"       Type: {source.get('source_type', 'N/A')}")
        if 'content_preview' in source:
            preview = source['content_preview'][:100]
            print(f"       Preview: {preview}...")
    
    print("\n" + "=" * 60)
    
    # Second test
    question2 = "Matematik dersimin hocası kim?"
    print(f"\n❓ Soru 2: {question2}")
    
    result2 = await ai_service.query(
        question=question2,
        user_id=user_id,
        session_id="test-session",
        anonymize=False
    )
    
    print(f"\n✅ Cevap:")
    print(f"   {result2['answer']}")
    
    print(f"\n📚 Kaynaklar ({len(result2['sources'])} adet):")
    for i, source in enumerate(result2['sources'], 1):
        print(f"   [{i}] {source.get('title', 'N/A')}")


if __name__ == "__main__":
    asyncio.run(test_rag())
