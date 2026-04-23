#!/bin/bash

# Dance Judge Scoring System - Environment Setup Script (Linux/Mac)
# This script sets up the complete development environment

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Main setup script
main() {
    print_header "Dance Judge Scoring System Setup"
    
    # Check Node.js
    print_info "Checking Node.js installation..."
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed: $NODE_VERSION"
        
        # Check if version is sufficient (v14+)
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$MAJOR_VERSION" -lt 14 ]; then
            print_error "Node.js version 14 or higher is required. Current: $NODE_VERSION"
            print_info "Please upgrade Node.js: https://nodejs.org/"
            exit 1
        fi
    else
        print_error "Node.js is not installed!"
        print_info "Please install Node.js (v14+): https://nodejs.org/"
        exit 1
    fi
    
    # Check npm
    print_info "Checking npm installation..."
    if command_exists npm; then
        NPM_VERSION=$(npm --version)
        print_success "npm is installed: v$NPM_VERSION"
    else
        print_error "npm is not installed!"
        exit 1
    fi
    
    # Check if Git is installed (optional but recommended)
    if command_exists git; then
        GIT_VERSION=$(git --version)
        print_success "Git is installed: $GIT_VERSION"
    else
        print_warning "Git is not installed (optional but recommended)"
    fi
    
    print_header "Setting Up Backend"
    
    # Navigate to backend
    if [ ! -d "backend" ]; then
        print_error "Backend directory not found!"
        exit 1
    fi
    
    cd backend
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        print_info "Creating .env file from .env.example..."
        if [ -f ".env.example" ]; then
            cp .env.example .env
            print_success ".env file created"
            print_warning "Please review and update .env file with your settings"
        else
            print_info "Creating default .env file..."
            cat > .env << 'EOF'
PORT=5000
JWT_SECRET=dance-judge-secret-key-change-in-production
DATABASE_PATH=./data/dance_judge.db
EOF
            print_success "Default .env file created"
            print_warning "IMPORTANT: Change JWT_SECRET in production!"
        fi
    else
        print_info ".env file already exists"
    fi
    
    # Create data directory
    if [ ! -d "data" ]; then
        print_info "Creating data directory..."
        mkdir -p data
        print_success "Data directory created"
    fi
    
    # Install backend dependencies
    print_info "Installing backend dependencies..."
    npm install
    print_success "Backend dependencies installed"
    
    # Build backend
    print_info "Building backend TypeScript..."
    npm run build
    print_success "Backend built successfully"
    
    # Seed database
    if [ ! -f "data/dance_judge.db" ]; then
        print_info "Seeding database with initial data..."
        npm run seed
        print_success "Database seeded with default users and categories"
    else
        print_warning "Database already exists. Skipping seed."
        echo -n "Do you want to re-seed the database? This will DELETE all existing data! (y/N): "
        read -r response
        if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
            rm -f data/dance_judge.db
            npm run seed
            print_success "Database re-seeded"
        fi
    fi
    
    cd ..
    
    print_header "Setting Up Frontend"
    
    # Navigate to frontend
    if [ ! -d "frontend" ]; then
        print_error "Frontend directory not found!"
        exit 1
    fi
    
    cd frontend
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        print_info "Creating frontend .env file..."
        cat > .env << 'EOF'
REACT_APP_API_URL=http://localhost:5000/api
EOF
        print_success "Frontend .env file created"
    else
        print_info "Frontend .env file already exists"
    fi
    
    # Install frontend dependencies
    print_info "Installing frontend dependencies..."
    npm install
    print_success "Frontend dependencies installed"
    
    cd ..
    
    # Make startup scripts executable
    print_header "Configuring Startup Scripts"
    
    if [ -f "startup.sh" ] && [ -f "stop.sh" ]; then
        print_info "Making scripts executable..."
        chmod +x startup.sh stop.sh
        print_success "Startup scripts are now executable"
    fi
    
    # Create uploads directory
    if [ ! -d "backend/uploads" ]; then
        print_info "Creating uploads directory..."
        mkdir -p backend/uploads
        touch backend/uploads/.gitkeep
        print_success "Uploads directory created"
    fi
    
    # Setup complete
    print_header "Setup Complete!"
    
    echo -e "${GREEN}Environment setup completed successfully!${NC}"
    echo ""
    echo -e "${CYAN}Default Credentials:${NC}"
    echo "  Admin:  admin / admin123"
    echo "  Judges: judge1, judge2, judge3 / judge123"
    echo ""
    echo -e "${CYAN}Next Steps:${NC}"
    echo "  1. Review backend/.env and frontend/.env files"
    echo "  2. Start the application:"
    echo "     ${YELLOW}./startup.sh${NC}"
    echo ""
    echo "  3. Access the application:"
    echo "     Frontend: ${BLUE}http://localhost:3000${NC}"
    echo "     Backend:  ${BLUE}http://localhost:5000${NC}"
    echo ""
    echo -e "${CYAN}Useful Commands:${NC}"
    echo "  Start servers:  ./startup.sh"
    echo "  Stop servers:   ./stop.sh"
    echo ""
    print_success "Happy coding! 🎉"
}

# Run main function
main
