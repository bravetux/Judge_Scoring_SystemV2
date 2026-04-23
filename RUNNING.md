# Dance Judge Scoring System - Setup & Running Instructions

## Project Status
✅ **Both Frontend and Backend are running successfully!**

### Running Servers
- **Backend**: http://localhost:5000 (Node.js + Express + SQLite)
- **Frontend**: http://localhost:3000 (React)

## Quick Start

### Open the Application
Visit **http://localhost:3000** in your browser

### Default Test Credentials

#### Admin Account
- **Username**: admin
- **Password**: admin123

#### Judge Accounts
- **Judge 1 - Username**: judge1 | **Password**: judge123
- **Judge 2 - Username**: judge2 | **Password**: judge123
- **Judge 3 - Username**: judge3 | **Password**: judge123

## To Create Test Data (Optional)

Run these commands in your terminal to seed test users:

```bash
# Navigate to backend
cd backend

# Create admin user (already set up for demo)
# Create judge users (already set up for demo)
```

## Features Overview

### Admin Features
1. **Manage Entries**: Upload dance entries for categories (SA-SKG for Solo, DA-DKG for Duet)
2. **Manage Judges**: View and assign judges to scoring categories
3. **View Results**: See ranked results with scores once all 3 judges have submitted

### Judge Features
1. **View Assigned Categories**: See only the categories assigned to you
2. **Score Entries**: Rate each dance on 3 criteria (1-10 scale):
   - Costume & Overall Impression
   - Movements & Rhythm
   - Posture & Perfection of Mudra
3. **Submit Scores**: Auto-calculated totals for each entry

## Dance Categories
- **Solo**: SA, SB, SC, SD, SE, SKG (1 participant name)
- **Duet**: DA, DB, DC, DD, DE, DKG (2 participant names)

## Auto-Ranking
Once all 3 judges submit scores for an entry:
- Average score is calculated automatically
- Entries are ranked by score
- Admin can view the ranking in "View Results" tab

## Database
- SQLite database at: `backend/data/dance_judge.db`
- Auto-initialized with 12 dance categories on first run

## Next Steps

1. Log in with admin/admin123
2. Upload entries for a category (e.g., SA with participant names)
3. Assign judges to that category
4. Judges log in and submit scores
5. Admin views auto-calculated results and rankings

---

**Project Structure**:
- `backend/` - Node.js/TypeScript API server
- `frontend/` - React/TypeScript web application
