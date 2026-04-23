# AI Development Guidelines - Dance Judge Scoring System

## Project Overview
A full-stack web application for multi-judge dance scoring competitions with automatic ranking.

## Tech Stack
- **Frontend**: React 18, TypeScript, React Router, Axios
- **Backend**: Node.js, Express, TypeScript, SQLite
- **Auth**: JWT-based authentication

## Project Structure
```
NaatiyaaAppDev/
├── backend/           # Node.js Express API
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── database/      # SQLite setup
│   │   ├── middleware/    # Auth middleware
│   │   ├── routes/        # API routes
│   │   ├── types/         # TypeScript interfaces
│   │   ├── utils/         # Helper functions
│   │   ├── index.ts       # Server entry point
│   │   └── seed.ts        # Database seeding
│   └── data/              # SQLite database files
├── frontend/          # React application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   ├── styles/        # CSS files
│   │   └── types/         # TypeScript interfaces
│   └── public/
└── startup.bat        # Windows startup script
```

## Dance Categories
| Code | Type | Participants |
|------|------|--------------|
| SA, SB, SC, SD, SE, SKG | Solo | 1 |
| DA, DB, DC, DD, DE, DKG | Duet | 2 |

## Dance Token Format
- **Format**: `{Category}{S.No}` (e.g., SA01, DA02)
- Category code + 2-digit serial number
- Used to uniquely identify each dance entry

## Scoring System
### Categories (1-10 scale each)
1. **Costume & Overall Impression**
2. **Movements & Rhythm**
3. **Posture & Perfection of Mudra**

### Total Score
- Per judge: Sum of 3 categories (max 30)
- Final: Average of 3 judges' totals
- Ranking: Automatic once all 3 judges submit

## User Roles
### Admin
- Upload dance entries (manual, CSV, or Excel XLSX)
- Manage judge assignments
- View all scores and rankings

### Judge
- View only assigned categories
- Submit/edit scores for entries
- Cannot see other judges' scores

## File Upload Format (CSV or XLSX)
Both CSV and Excel files are supported with the same column structure:

| Column | Description |
|--------|-------------|
| Category | Dance category code (SA, SB, etc.) |
| S.No | Serial number (e.g., 01, 02) |
| Participant1 | Primary participant name |
| Participant2 | Secondary participant (optional for Solo) |

**Example:**
```csv
Category,S.No,Participant1,Participant2
SA,01,John Doe,
DA,01,Mike Brown,Sarah Lee
```

The same format applies to Excel (.xlsx/.xls) files.

## API Endpoints
### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register (admin only)
- `GET /api/auth/judges` - List judges
- `PUT /api/auth/judges/:id/assignments` - Update assignments

### Entries
- `POST /api/entries/upload` - Upload entries
- `GET /api/entries/category/:code` - Get entries by category
- `DELETE /api/entries/:id` - Delete entry

### Scores
- `POST /api/scores/submit` - Submit score
- `GET /api/scores/judge/categories` - Get judge's categories
- `GET /api/scores/judge/category/:code` - Get entries for judge
- `GET /api/scores/category/:code` - Get all scores (admin)

## Development Rules
1. **TypeScript**: Always use strict typing
2. **API Responses**: Use consistent JSON format
3. **Error Handling**: Always return proper error messages
4. **Auth**: All routes except login require JWT token
5. **Database**: Use parameterized queries to prevent SQL injection

## Environment Variables
### Backend (.env)
```
PORT=5000
DATABASE_PATH=./data/dance_judge.db
JWT_SECRET=your_secret_key
NODE_ENV=development
ADMIN_PASSWORD=admin123
JUDGE_PASSWORD=judge123
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Default Credentials
| Role    | Username | Password |
|-------- |----------|----------|
| Admin   | admin    | admin123 |
| Judge 1 | judge1   | judge123 |
| Judge 2 | judge2   | judge123 |
| Judge 3 | judge3   | judge123 |

## Running the Project
```bash
# Option 1: Use startup script (Windows)
startup.bat

# Option 2: Manual
cd backend && npm install && npm run seed && npm start
cd frontend && npm install && npm run dev
```

## Code Style
- Use functional components with hooks in React
- Use async/await for asynchronous operations
- Keep components focused and single-purpose
- CSS files per page/component
- Descriptive variable and function names
 