#!/bin/bash

echo "========================================"
echo "  Dance Judge Scoring System Startup"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if node_modules exist, if not install
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd backend
    npm install
    cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    cd frontend
    npm install
    cd ..
fi

# Build backend if dist doesn't exist
if [ ! -d "backend/dist" ]; then
    echo -e "${YELLOW}Building backend...${NC}"
    cd backend
    npm run build
    cd ..
fi

# Seed database if needed
if [ ! -f "backend/data/dance_judge.db" ]; then
    echo -e "${YELLOW}Seeding database...${NC}"
    cd backend
    npm run seed
    cd ..
fi

echo ""
echo -e "${GREEN}Starting servers...${NC}"
echo ""

# Start backend in background
echo -e "${BLUE}Starting backend server...${NC}"
cd backend
node dist/index.js > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "Waiting for backend to initialize..."
sleep 3

# Start frontend in background
echo -e "${BLUE}Starting frontend server...${NC}"
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Save PIDs to file for easy cleanup
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

echo ""
echo "========================================"
echo "  Servers Started Successfully!"
echo "========================================"
echo ""
echo -e "  ${GREEN}Backend:${NC}  http://localhost:5000"
echo -e "  ${GREEN}Frontend:${NC} http://localhost:3000"
echo ""
echo "  Credentials:"
echo "    Admin:  admin / admin123"
echo "    Judges: judge1, judge2, judge3 / judge123"
echo ""
echo "  Process IDs:"
echo "    Backend:  $BACKEND_PID"
echo "    Frontend: $FRONTEND_PID"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo "    Backend:  backend.log"
echo "    Frontend: frontend.log"
echo ""
echo "To stop servers, run: ./stop.sh"
echo "Or manually kill processes:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Try to open browser (works on most Linux distros with GUI)
if command -v xdg-open > /dev/null; then
    echo "Opening browser in 3 seconds..."
    sleep 3
    xdg-open http://localhost:3000 &
elif command -v gnome-open > /dev/null; then
    echo "Opening browser in 3 seconds..."
    sleep 3
    gnome-open http://localhost:3000 &
else
    echo "Please open http://localhost:3000 in your browser"
fi

echo ""
echo "Press Ctrl+C to stop monitoring (servers will continue running)"
echo "Or wait to see live logs..."
echo ""

# Follow logs (optional - user can Ctrl+C to exit)
sleep 2
tail -f backend.log frontend.log
