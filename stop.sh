#!/bin/bash

echo "========================================"
echo "  Stopping Dance Judge Scoring System"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to kill process and check if successful
kill_process() {
    local pid=$1
    local name=$2
    
    if [ -n "$pid" ] && ps -p $pid > /dev/null 2>&1; then
        echo -e "${YELLOW}Stopping $name (PID: $pid)...${NC}"
        kill $pid 2>/dev/null
        sleep 1
        
        # Force kill if still running
        if ps -p $pid > /dev/null 2>&1; then
            echo -e "${YELLOW}Force stopping $name...${NC}"
            kill -9 $pid 2>/dev/null
        fi
        
        if ! ps -p $pid > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $name stopped${NC}"
        else
            echo -e "${RED}✗ Failed to stop $name${NC}"
        fi
    else
        echo -e "${YELLOW}$name is not running${NC}"
    fi
}

# Read PIDs from files
if [ -f ".backend.pid" ]; then
    BACKEND_PID=$(cat .backend.pid)
    kill_process "$BACKEND_PID" "Backend server"
    rm .backend.pid
else
    echo -e "${YELLOW}No backend PID file found${NC}"
fi

if [ -f ".frontend.pid" ]; then
    FRONTEND_PID=$(cat .frontend.pid)
    kill_process "$FRONTEND_PID" "Frontend server"
    rm .frontend.pid
else
    echo -e "${YELLOW}No frontend PID file found${NC}"
fi

# Also try to kill by port (fallback)
echo ""
echo -e "${YELLOW}Checking for processes on ports 5000 and 3000...${NC}"

# Kill process on port 5000 (backend)
BACKEND_PORT_PID=$(lsof -ti:5000 2>/dev/null)
if [ -n "$BACKEND_PORT_PID" ]; then
    echo -e "${YELLOW}Found process on port 5000 (PID: $BACKEND_PORT_PID)${NC}"
    kill -9 $BACKEND_PORT_PID 2>/dev/null
    echo -e "${GREEN}✓ Killed process on port 5000${NC}"
fi

# Kill process on port 3000 (frontend)
FRONTEND_PORT_PID=$(lsof -ti:3000 2>/dev/null)
if [ -n "$FRONTEND_PORT_PID" ]; then
    echo -e "${YELLOW}Found process on port 3000 (PID: $FRONTEND_PORT_PID)${NC}"
    kill -9 $FRONTEND_PORT_PID 2>/dev/null
    echo -e "${GREEN}✓ Killed process on port 3000${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}  All servers stopped${NC}"
echo "========================================"
