"""Test script to verify new fields in database schema."""

import asyncio
from sqlalchemy import inspect
from src.core.database import get_engine


async def test_schema():
    """Test that all new fields exist in the database."""
    engine = get_engine()
    
    async with engine.connect() as conn:
        inspector = inspect(conn.sync_connection)
        
        # Test courses table
        print("\n✅ COURSES table columns:")
        courses_cols = {col['name'] for col in inspector.get_columns('courses')}
        required_courses = {'department', 'credits', 'schedule', 'syllabus_url'}
        for col in required_courses:
            status = "✅" if col in courses_cols else "❌"
            print(f"  {status} {col}")
        
        # Test official_documents table
        print("\n✅ OFFICIAL_DOCUMENTS table columns:")
        docs_cols = {col['name'] for col in inspector.get_columns('official_documents')}
        required_docs = {'source_id', 'document_type', 'sync_job_id', 'is_active'}
        for col in required_docs:
            status = "✅" if col in docs_cols else "❌"
            print(f"  {status} {col}")
        
        # Test user_documents table
        print("\n✅ USER_DOCUMENTS table columns:")
        user_docs_cols = {col['name'] for col in inspector.get_columns('user_documents')}
        required_user_docs = {'s3_bucket', 'error_message', 'page_count', 'uploaded_at'}
        for col in required_user_docs:
            status = "✅" if col in user_docs_cols else "❌"
            print(f"  {status} {col}")
        
        # Check that upload_at was renamed
        if 'upload_at' in user_docs_cols:
            print(f"  ⚠️  OLD COLUMN STILL EXISTS: upload_at (should be renamed to uploaded_at)")
        
    await engine.dispose()
    print("\n✅ Schema validation complete!")


if __name__ == "__main__":
    asyncio.run(test_schema())
