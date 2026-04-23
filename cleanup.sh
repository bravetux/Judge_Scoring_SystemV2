#!/bin/bash

echo "========================================"
echo "Cleaning up temporary files..."
echo "========================================"

# Clean backend uploads
if [ -d "backend/uploads" ] && [ "$(ls -A backend/uploads 2>/dev/null)" ]; then
    echo "Cleaning backend uploads..."
    rm -rf backend/uploads/*
    echo "Backend uploads cleaned."
else
    echo "No backend uploads to clean."
fi

# Clean frontend build
if [ -d "frontend/build" ]; then
    echo "Cleaning frontend build..."
    rm -rf frontend/build
    echo "Frontend build cleaned."
else
    echo "No frontend build to clean."
fi

# Clean node_modules (optional, uncomment if needed)
# if [ -d "backend/node_modules" ]; then
#     echo "Cleaning backend node_modules..."
#     rm -rf backend/node_modules
#     echo "Backend node_modules cleaned."
# fi
# if [ -d "frontend/node_modules" ]; then
#     echo "Cleaning frontend node_modules..."
#     rm -rf frontend/node_modules
#     echo "Frontend node_modules cleaned."
# fi

# Clean package-lock files
if [ -f "backend/package-lock.json" ]; then
    echo "Cleaning backend package-lock.json..."
    rm -f backend/package-lock.json
fi
if [ -f "frontend/package-lock.json" ]; then
    echo "Cleaning frontend package-lock.json..."
    rm -f frontend/package-lock.json
fi

# Clean log files
echo "Cleaning log files..."
find . -maxdepth 1 -name "*.log" -type f -delete 2>/dev/null
find backend -maxdepth 1 -name "*.log" -type f -delete 2>/dev/null
find frontend -maxdepth 1 -name "*.log" -type f -delete 2>/dev/null

# Clean temp database files
if [ -d "backend/data" ]; then
    echo "Cleaning database journal files..."
    find backend/data -name "*.db-journal" -type f -delete 2>/dev/null
fi

# Clean OS-specific files
echo "Cleaning OS-specific temporary files..."
find . -name ".DS_Store" -type f -delete 2>/dev/null
find . -name "Thumbs.db" -type f -delete 2>/dev/null
find . -name "desktop.ini" -type f -delete 2>/dev/null

echo "========================================"
echo "Cleanup complete!"
echo "========================================"
