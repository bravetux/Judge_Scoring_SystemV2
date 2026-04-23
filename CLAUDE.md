# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Judge Scoring System — a full-stack TypeScript app for managing multi-judge dance competitions. Judges score entries across 12 predefined dance categories; an admin manages entries, judges, and results.

## Commands

### Backend (run from `backend/`)
```bash
npm run dev        # ts-node + nodemon for development (port 5000)
npm run build      # Compile TypeScript → dist/
npm start          # Run compiled output
npm run seed       # Reset DB and seed default data (12 categories, judges 1–15, admin)
```

### Frontend (run from `frontend/`)
```bash
npm run dev        # Create React App dev server (port 3000)
npm run build      # Production build → build/
npm test           # Run test suite
```

### Setup scripts (run from repo root)
```bash
./setup.sh         # Install deps + seed (Linux/Mac)
setup.bat          # Install deps + seed (Windows)
./startup.sh       # Start both servers (Linux/Mac)
startup.bat        # Start both servers (Windows)
```

## Architecture

### Two-server model
- **Backend**: Express on port 5000, serves `/api/*`
- **Frontend**: CRA dev server on port 3000, proxies API via `REACT_APP_API_URL`

### Backend (`backend/src/`)
- `index.ts` — Express entry point, wires CORS, auth middleware, and route mounts
- `database/db.ts` — SQLite3 wrapper exposing promise-based `run`, `get`, `all` helpers; initializes schema on startup
- `middleware/auth.ts` — JWT verification; exports `authenticate`, `authorizeAdmin`, `authorizeJudge`
- `utils/auth.ts` — bcryptjs hashing and JWT sign/verify
- `controllers/` — Business logic split into `authController`, `entryController`, `scoreController`
- `routes/` — Thin Express routers that apply middleware then delegate to controllers
- `types/index.ts` — Shared TypeScript interfaces (User, Judge, Entry, Score, etc.)
- `seed.ts` — Standalone script; creates 12 dance categories and 15 judge users

### Frontend (`frontend/src/`)
- `App.tsx` — React Router v6 root; role-based route protection
- `pages/` — Three page components: `LoginPage`, `AdminDashboard` (5-tab UI), `JudgeDashboard`
- `services/api.ts` — Axios instance with JWT interceptor; all API calls go through here
- `styles/` — Per-page CSS files (no CSS-in-JS)
- `types/index.ts` — Mirrors backend types

### Database (SQLite, `backend/data/dance_judge.db`)
Five tables: `users`, `judges` (assignedCategories stored as JSON string), `danceCategories`, `danceEntries`, `scores`. Unique constraint on `(entryId, judgeId)` enforces one score per judge per entry. Rankings are computed only when all 3 judges have scored an entry.

### Auth flow
JWT stored in `localStorage`. Token carries `{ userId, role }`. Backend middleware checks role for admin-only routes. Judge routes further check `assignedCategories` against requested category.

## Key Domain Rules

- **Dance token format**: `{CategoryCode}{SerialNumber}` — e.g., `SA01`, `DA05`
- **Category codes**: `SA`, `DA`, `SKG`, `DKG`, etc. (12 total, seeded at startup)
- **Scoring**: 3 criteria × 1–10 each per judge. Final score = average of 3 judges' totals (max 30).
- **Bulk upload**: CSV/XLSX must have columns `Category`, `S.No`, `Participant1`, `Participant2`

## Environment Variables

**Backend** (`backend/.env`, copy from `.env.example`):
```
PORT=5000
JWT_SECRET=your-secret-key-here
DATABASE_PATH=./data/dance_judge.db
NODE_ENV=development
```

**Frontend** (`frontend/.env`):
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Default Credentials (after seeding)
| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Judges | `judge1`–`judge15` | `judge123` |
