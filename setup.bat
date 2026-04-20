@echo off
setlocal

docker compose up --build -d
if errorlevel 1 exit /b %errorlevel%

docker compose logs -f backend
