"""Quick test script to debug auth registration."""
import asyncio
from httpx import AsyncClient
from src.main import app

async def test_register():
    async with AsyncClient(app=app, base_url="http://test") as client:
        payload = {
            "email": "test@university.edu.tr",
            "password": "Pass1234",
            "first_name": "Test",
            "last_name": "User",
            "role": "student"
        }
        
        resp = await client.post("/v1/auth/register", json=payload)
        print(f"Status: {resp.status_code}")
        print(f"Body: {resp.text}")
        print(f"Headers: {resp.headers}")

if __name__ == "__main__":
    asyncio.run(test_register())
