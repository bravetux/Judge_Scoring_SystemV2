# Dance Judge Scoring System - Setup Guide

This guide will help you set up the Dance Judge Scoring System on your local machine for the first time.

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required
- **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
- **npm** (v6 or higher) - Comes bundled with Node.js

### Optional but Recommended
- **Git** - For version control and updates

### Verify Installation

Check if the prerequisites are installed:

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check Git version (optional)
git --version
```

If Node.js or npm is not installed, please download and install from [nodejs.org](https://nodejs.org/) before proceeding.

---

## 🚀 Automated Setup (Recommended)

The easiest way to set up the project is using the automated setup scripts.

### Windows

1. **Open Command Prompt or PowerShell** in the project directory

2. **Run the setup script:**
   ```bash
   setup.bat
   ```

3. **Wait for completion** - The script will:
   - Validate your environment
   - Create configuration files
   - Install all dependencies
   - Build the backend
   - Seed the database
   - Configure directories

4. **Follow the on-screen instructions**

### Linux / macOS

1. **Open Terminal** in the project directory

2. **Make the script executable** (first time only):
   ```bash
   chmod +x setup.sh
   ```

3. **Run the setup script:**
   ```bash
   ./setup.sh
   ```

4. **Wait for completion** - The script will:
   - Validate your environment
   - Create configuration files
   - Install all dependencies
   - Build the backend
   - Seed the database
   - Configure directories

5. **Follow the on-screen instructions**

---

## 🛠️ What the Setup Script Does

### 1. Environment Validation
- ✅ Checks if Node.js is installed (minimum v14)
- ✅ Verifies npm installation
- ✅ Checks for Git (optional)
- ✅ Validates version compatibility

### 2. Backend Setup
- ✅ Creates `.env` file from template or with defaults:
  ```env
  PORT=5000
  JWT_SECRET=dance-judge-secret-key-change-in-production
  DATABASE_PATH=./data/dance_judge.db
  ```
- ✅ Installs all backend dependencies (`npm install`)
- ✅ Compiles TypeScript code (`npm run build`)
- ✅ Creates `data` directory for SQLite database
- ✅ Seeds database with initial data

### 3. Frontend Setup
- ✅ Creates `.env` file:
  ```env
  REACT_APP_API_URL=http://localhost:5000/api
  ```
- ✅ Installs all frontend dependencies (`npm install`)

### 4. Directory Configuration
- ✅ Creates `backend/data/` for database storage
- ✅ Creates `backend/uploads/` for file uploads
- ✅ Sets proper permissions on Linux/Mac

### 5. Database Seeding
The setup automatically creates:
- **1 Admin Account**
  - Username: `admin`
  - Password: `admin123`

- **15 Judge Accounts**
  - Usernames: `judge1` to `judge15`
  - Passwords: Same as username (e.g., `judge1` / `judge1`)

- **12 Dance Categories**
  - Solo: SA, SB, SC, SD, SE, SKG
  - Duet: DA, DB, DC, DD, DE, DKG

---

## 📝 Manual Setup (Alternative)

If you prefer to set up manually or need to troubleshoot, follow these steps:

### Step 1: Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create environment file:**
   ```bash
   # Windows
   copy .env.example .env
   
   # Linux/Mac
   cp .env.example .env
   ```

3. **Edit `.env` file** with your preferred text editor:
   ```env
   PORT=5000
   JWT_SECRET=your-secret-key-here-change-in-production
   DATABASE_PATH=./data/dance_judge.db
   ```

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Build TypeScript:**
   ```bash
   npm run build
   ```

6. **Create data directory:**
   ```bash
   # Windows
   mkdir data
   
   # Linux/Mac
   mkdir -p data
   ```

7. **Seed the database:**
   ```bash
   npm run seed
   ```

8. **Verify backend is ready:**
   ```bash
   # Start in development mode
   npm run dev
   
   # Should see: "Server running on port 5000"
   ```

### Step 2: Frontend Setup

1. **Open a new terminal** and navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. **Create environment file:**
   ```bash
   # Create .env file
   echo REACT_APP_API_URL=http://localhost:5000/api > .env
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Verify frontend is ready:**
   ```bash
   # Start development server
   npm run dev
   
   # Should see: "webpack compiled successfully"
   ```

### Step 3: Additional Setup

1. **Create uploads directory:**
   ```bash
   # Windows (from project root)
   mkdir backend\uploads
   
   # Linux/Mac (from project root)
   mkdir -p backend/uploads
   ```

2. **Make startup scripts executable** (Linux/Mac only):
   ```bash
   chmod +x startup.sh stop.sh
   ```

---

## ✅ Post-Setup Verification

After setup is complete, verify everything is working:

### 1. Check File Structure

Ensure these files exist:
- ✅ `backend/.env`
- ✅ `frontend/.env`
- ✅ `backend/data/dance_judge.db`
- ✅ `backend/dist/` (compiled JavaScript)
- ✅ `backend/node_modules/`
- ✅ `frontend/node_modules/`

### 2. Test Backend

```bash
cd backend
npm run dev
```

You should see:
```
Server running on port 5000
```

Open browser and visit: `http://localhost:5000/api/health`  
Expected response: `{"status":"ok"}`

### 3. Test Frontend

```bash
cd frontend
npm run dev
```

You should see:
```
webpack compiled successfully
```

Open browser and visit: `http://localhost:3000`  
You should see the login page.

---

## 🎯 Starting the Application

Once setup is complete, start the application using:

### Windows
```bash
startup.bat
```

### Linux / macOS
```bash
./startup.sh
```

This will:
- Start the backend server on `http://localhost:5000`
- Start the frontend server on `http://localhost:3000`
- Automatically open your browser

---

## 🔑 Default Login Credentials

### Administrator Account
- **Username:** `admin`
- **Password:** `admin123`
- **Access:** Full system access (manage entries, judges, users, view results)

### Judge Accounts
- **Usernames:** `judge1`, `judge2`, `judge3`, ... up to `judge15`
- **Passwords:** Same as username (e.g., `judge1` password is `judge1`)
- **Access:** Score entries in assigned categories only

⚠️ **Important:** Change the admin password after first login for security!

---

## 🐛 Troubleshooting

### Node.js Not Found
**Error:** `'node' is not recognized as an internal or external command`

**Solution:**
1. Install Node.js from [nodejs.org](https://nodejs.org/)
2. Restart your terminal/command prompt
3. Verify installation: `node --version`

### Port Already in Use
**Error:** `Port 5000 is already in use` or `Port 3000 is already in use`

**Solution:**
1. Stop any other applications using these ports
2. Or change ports in configuration files:
   - Backend: Edit `backend/.env` → Change `PORT=5000`
   - Frontend: Edit `frontend/.env` → Update `REACT_APP_API_URL`

### Database Already Exists
**Warning:** `Database already exists. Skipping seed.`

**Solution:**
- If you want to reset the database, delete `backend/data/dance_judge.db`
- Then run `npm run seed` again from the backend directory
- **Note:** This will delete all existing data!

### Permission Denied (Linux/Mac)
**Error:** `Permission denied` when running scripts

**Solution:**
```bash
chmod +x setup.sh startup.sh stop.sh
```

### npm Install Fails
**Error:** Various npm installation errors

**Solution:**
1. Clear npm cache: `npm cache clean --force`
2. Delete `node_modules` folder
3. Delete `package-lock.json`
4. Run `npm install` again

### TypeScript Build Fails
**Error:** TypeScript compilation errors

**Solution:**
1. Ensure you're using Node.js v14 or higher
2. Delete `backend/dist` folder
3. Run `npm run build` again
4. Check for syntax errors in TypeScript files

---

## 🔄 Re-running Setup

If you need to re-run the setup:

1. **Clean existing installation:**
   ```bash
   # Delete node_modules
   rm -rf backend/node_modules frontend/node_modules
   
   # Delete build artifacts
   rm -rf backend/dist frontend/build
   
   # Optional: Delete database (will lose all data!)
   rm -f backend/data/dance_judge.db
   ```

2. **Run setup script again:**
   ```bash
   # Windows
   setup.bat
   
   # Linux/Mac
   ./setup.sh
   ```

---

## 📚 Next Steps

After successful setup:

1. **Review Configuration**
   - Check `backend/.env` for backend settings
   - Check `frontend/.env` for API endpoint
   - Update `JWT_SECRET` for production use

2. **Start the Application**
   - Windows: `startup.bat`
   - Linux/Mac: `./startup.sh`

3. **Login and Explore**
   - Navigate to `http://localhost:3000`
   - Login as admin: `admin` / `admin123`
   - Explore the admin dashboard

4. **Configure Judges**
   - Go to "Manage Judges" tab
   - Assign categories to judges
   - Create additional judge accounts if needed

5. **Add Participants**
   - Go to "Manage Dance Entries" tab
   - Add entries manually or via CSV upload

6. **Review Documentation**
   - Read [README.md](README.md) for full documentation
   - Check [RUNNING.md](RUNNING.md) for operational guide

---

## 🆘 Getting Help

If you encounter issues:

1. **Check the README:** [README.md](README.md)
2. **Review logs:** Check terminal output for error messages
3. **Common issues:** See Troubleshooting section above
4. **GitHub Issues:** Visit the repository for known issues
5. **Community:** Check discussions on GitHub

---

## ⚙️ Configuration Files

### Backend `.env`
```env
PORT=5000                              # Backend server port
JWT_SECRET=your-secret-key             # JWT signing secret (change in production!)
DATABASE_PATH=./data/dance_judge.db    # SQLite database location
```

### Frontend `.env`
```env
REACT_APP_API_URL=http://localhost:5000/api    # Backend API endpoint
```

---

## 🎉 Setup Complete!

Congratulations! Your Dance Judge Scoring System is now set up and ready to use.

**Quick Commands:**
- **Start:** `startup.bat` (Windows) or `./startup.sh` (Linux/Mac)
- **Stop:** Press Ctrl+C or run `./stop.sh` (Linux/Mac)
- **Access:** Open browser to `http://localhost:3000`

Happy judging! 🎭✨
