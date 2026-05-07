@echo off
setlocal

IF "%1"=="clean" (
    echo [CLEAN MODE] Eski veriler, volume'ler ve FAISS indeksleri siliniyor...
    docker compose down -v
    IF EXIST backend\data\vectors rmdir /s /q backend\data\vectors
    IF EXIST backend\uploads rmdir /s /q backend\uploads
    IF EXIST backend\data\kampus_plus.db del /f /q backend\data\kampus_plus.db
    echo [CLEAN MODE] Temizlik tamamlandi.
) ELSE (
    echo [SETUP] Normal baslatma. Temiz kurulum icin "setup.bat clean" komutunu kullanabilirsiniz.
)

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

echo [SETUP] PostgreSQL servisinin saglikli sekilde ayaga kalkmasi bekleniyor...
timeout /t 5 /nobreak >nul

docker compose logs -f backend

pause