import requests
import json

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjk5YWJkNDItNDQwNC00YjExLTk3OWYtZGQ1NzUyNGIxNDQyIiwicm9sZSI6InZlcmlmaWNhdGlvbiIsInR5cGUiOiJhY2Nlc3MiLCJleHAiOjE3NjM1ODAyMTMsImlhdCI6MTc2MzQ5MzgxM30.zdq_inYex4LYMo8eNdzOn9dCKisJjG-JH38rfyitzyg"

response = requests.post(
    'http://localhost:8000/v1/auth/verify-email',
    json={'token': token}
)

print(f'Status Code: {response.status_code}')
print(f'Response: {json.dumps(response.json(), indent=2)}')

if response.status_code == 200:
    print('\n✅ Email başarıyla doğrulandı!')
else:
    print('\n❌ Doğrulama başarısız!')
