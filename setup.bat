@echo off
setlocal

if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo [SETUP] backend\.env dosyasi .env.example'dan olusturuldu.
    echo [SETUP] Lutfen backend\.env icindeki JWT_SECRET_KEY ve GOOGLE_API_KEY degerlerini guncelleyin.
)

if not exist frontend\.env (
    copy frontend\.env.example frontend\.env
    echo [SETUP] frontend\.env dosyasi .env.example'dan olusturuldu.
)

docker compose up --build -d
if errorlevel 1 exit /b %errorlevel%

docker compose logs -f backend

pause
