import sqlite3
import sys
sys.path.insert(0, '.')

from src.services.auth_service import AuthService
from uuid import UUID
import asyncio

# Database'den kullanıcıyı bul
conn = sqlite3.connect('kampus_plus_dev.db')
email = 'test.student.e2e@university.edu.tr'
cursor = conn.execute('SELECT id, email, is_verified FROM users WHERE email = ?', (email,))
result = cursor.fetchone()

if result:
    user_id = result[0]
    print(f'\n✓ User ID: {user_id}')
    print(f'✓ Email: {result[1]}')
    print(f'✓ Verified: {result[2]}\n')
    
    # Token oluştur
    auth_service = AuthService()
    token = asyncio.run(auth_service.generate_verification_token(UUID(user_id)))
    
    print(f'📧 Verification Token:')
    print(f'{token}\n')
    print(f'🚀 Verify Email Command:')
    print(f'curl -X POST http://localhost:8000/v1/auth/verify-email -H "Content-Type: application/json" -d "{{\\"token\\":\\"{token}\\"}}"')
    print()
else:
    print('❌ Kullanıcı bulunamadı! Önce kayıt ol.')

conn.close()
