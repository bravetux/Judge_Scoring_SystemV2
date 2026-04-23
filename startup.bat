@echo off
echo ========================================
echo   Dance Judge Scoring System Startup
echo ========================================
echo.

:: Check if node_modules exist, if not install
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

:: Seed database if needed (first run only)
if not exist "backend\data\dance_judge.db" (
    echo Seeding database...
    cd backend
    call npm run seed
    cd ..
)

echo.
echo Starting servers...
echo.

:: Start backend — runs TypeScript source directly via ts-node so any
:: source change is picked up on the next restart (no stale dist/ builds).
start "Dance Judge Backend" cmd /k "cd backend && npm run dev"

:: Wait for backend to boot before starting frontend
timeout /t 4 /nobreak > nul

:: Start frontend (Create React App dev server)
start "Dance Judge Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   Servers Starting...
echo ========================================
echo.
echo   Backend:  http://localhost:5000
echo   Frontend: http://localhost:3000
echo.
echo   Default Credentials:
echo     Admin:   admin    / admin123
echo     Judges:  judge1   / judge1
echo              judge2   / judge2
echo              ...      / ... (username = password)
echo.
echo   Tip: close each server window to stop it.
echo.
echo   Press any key to open the app in browser...
pause > nul

start http://localhost:3000
