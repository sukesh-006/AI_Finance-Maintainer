@echo off
echo ================================
echo  FinanceAI - Local Dev Setup
echo ================================

echo.
echo [1/3] Starting Docker containers...
docker compose up --build -d

echo.
echo [2/3] Waiting for DB to be ready (15s)...
timeout /t 15 /nobreak >nul

echo.
echo [3/3] Seeding demo data...
docker compose run --rm seed

echo.
echo ================================
echo  Done! Open http://localhost:3000
echo  Admin: admin@financeai.com / admin123
echo  Demo:  demo@financeai.com  / demo123
echo ================================
pause
