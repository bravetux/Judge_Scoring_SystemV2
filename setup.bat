@echo off
REM Dance Judge Scoring System - Environment Setup Script (Windows)
REM This script sets up the complete development environment

setlocal EnableDelayedExpansion

echo ========================================
echo   Dance Judge Scoring System Setup
echo ========================================
echo.

REM Check Node.js
echo [*] Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] Node.js is not installed!
    echo [!] Please install Node.js v14 or higher from: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [√] Node.js is installed: %NODE_VERSION%

REM Check npm
echo [*] Checking npm installation...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [X] npm is not installed!
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [√] npm is installed: v%NPM_VERSION%

REM Check Git (optional)
where git >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=*" %%i in ('git --version') do echo [√] %%i
) else (
    echo [!] Git is not installed (optional but recommended)
)

echo.
echo ========================================
echo   Setting Up Backend
echo ========================================
echo.

REM Check backend directory
if not exist "backend" (
    echo [X] Backend directory not found!
    pause
    exit /b 1
)

cd backend

REM Create .env file
if not exist ".env" (
    echo [*] Creating .env file...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo [√] .env file created from .env.example
        echo [!] Please review and update .env file with your settings
    ) else (
        (
            echo PORT=5000
            echo JWT_SECRET=dance-judge-secret-key-change-in-production
            echo DATABASE_PATH=./data/dance_judge.db
        ) > .env
        echo [√] Default .env file created
        echo [!] IMPORTANT: Change JWT_SECRET in production!
    )
) else (
    echo [*] .env file already exists
)

REM Create data directory
if not exist "data" (
    echo [*] Creating data directory...
    mkdir data
    echo [√] Data directory created
)

REM Install backend dependencies
echo [*] Installing backend dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [X] Failed to install backend dependencies
    cd ..
    pause
    exit /b 1
)
echo [√] Backend dependencies installed

REM Build backend
echo [*] Building backend TypeScript...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo [X] Failed to build backend
    cd ..
    pause
    exit /b 1
)
echo [√] Backend built successfully

REM Seed database
if not exist "data\dance_judge.db" (
    echo [*] Seeding database with initial data...
    call npm run seed
    if %ERRORLEVEL% NEQ 0 (
        echo [X] Failed to seed database
        cd ..
        pause
        exit /b 1
    )
    echo [√] Database seeded with default users and categories
) else (
    echo [!] Database already exists. Skipping seed.
    echo.
    set /p RESEED="Do you want to re-seed the database? This will DELETE all existing data! (y/N): "
    if /i "!RESEED!"=="y" (
        del /f "data\dance_judge.db" 2>nul
        call npm run seed
        echo [√] Database re-seeded
    )
)

cd ..

echo.
echo ========================================
echo   Setting Up Frontend
echo ========================================
echo.

REM Check frontend directory
if not exist "frontend" (
    echo [X] Frontend directory not found!
    pause
    exit /b 1
)

cd frontend

REM Create .env file
if not exist ".env" (
    echo [*] Creating frontend .env file...
    (
        echo REACT_APP_API_URL=http://localhost:5000/api
    ) > .env
    echo [√] Frontend .env file created
) else (
    echo [*] Frontend .env file already exists
)

REM Install frontend dependencies
echo [*] Installing frontend dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [X] Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
)
echo [√] Frontend dependencies installed

cd ..

REM Create uploads directory
if not exist "backend\uploads" (
    echo [*] Creating uploads directory...
    mkdir backend\uploads
    type nul > backend\uploads\.gitkeep
    echo [√] Uploads directory created
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo [√] Environment setup completed successfully!
echo.
echo Default Credentials:
echo   Admin:  admin / admin123
echo   Judges: judge1, judge2, judge3 / judge123
echo.
echo Next Steps:
echo   1. Review backend\.env and frontend\.env files
echo   2. Start the application:
echo      startup.bat
echo.
echo   3. Access the application:
echo      Frontend: http://localhost:3000
echo      Backend:  http://localhost:5000
echo.
echo Useful Commands:
echo   Start servers:  startup.bat
echo.
echo [√] Happy coding! 🎉
echo.
pause
