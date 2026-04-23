@echo off
echo ========================================
echo Cleaning up temporary files...
echo ========================================

REM Clean backend uploads
if exist "backend\uploads\*" (
    echo Cleaning backend uploads...
    del /q "backend\uploads\*" 2>nul
    echo Backend uploads cleaned.
) else (
    echo No backend uploads to clean.
)

REM Clean frontend build
if exist "frontend\build" (
    echo Cleaning frontend build...
    rmdir /s /q "frontend\build"
    echo Frontend build cleaned.
) else (
    echo No frontend build to clean.
)

REM Clean node_modules (optional, uncomment if needed)
REM if exist "backend\node_modules" (
REM     echo Cleaning backend node_modules...
REM     rmdir /s /q "backend\node_modules"
REM     echo Backend node_modules cleaned.
REM )
REM if exist "frontend\node_modules" (
REM     echo Cleaning frontend node_modules...
REM     rmdir /s /q "frontend\node_modules"
REM     echo Frontend node_modules cleaned.
REM )

REM Clean package-lock files
if exist "backend\package-lock.json" (
    echo Cleaning backend package-lock.json...
    del /q "backend\package-lock.json"
)
if exist "frontend\package-lock.json" (
    echo Cleaning frontend package-lock.json...
    del /q "frontend\package-lock.json"
)

REM Clean log files
if exist "*.log" (
    echo Cleaning log files...
    del /q "*.log" 2>nul
)
if exist "backend\*.log" (
    del /q "backend\*.log" 2>nul
)
if exist "frontend\*.log" (
    del /q "frontend\*.log" 2>nul
)

REM Clean temp database files (backup before removing)
if exist "backend\data\*.db-journal" (
    echo Cleaning database journal files...
    del /q "backend\data\*.db-journal" 2>nul
)

echo ========================================
echo Cleanup complete!
echo ========================================
pause
