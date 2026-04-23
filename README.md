# Judge Scoring System

A full-stack TypeScript web application for managing multi-judge dance competitions end-to-end — from participant entry and category assignment through live judging, instant rankings, and optional backup to a local MySQL mirror via XAMPP.

## Overview

The system supports twelve predefined dance categories — six Solo (`SA` – `SE`, `SKG`) and six Duet (`DA` – `DE`, `DKG`). Each entry is scored by up to three judges across three criteria on a 1–10 scale. Totals and rankings are calculated automatically and surfaced through sortable tables, top-rank panels, criterion-star breakdowns and a live score-distribution histogram for judges.

It ships with two dedicated dashboards, each with a **distinctive visual identity**:

- **Admin** — an editorial "Programme" aesthetic: warm cream paper, deep ink, vermilion curtain-red accents, italic Fraunces serifs and Roman-numeraled section indices.
- **Judge** — a "dark theatre" aesthetic: deep warm-black stage, brass/gold accents, ivory typography, a cinematic scoring modal.
- **Login** — a split-screen threshold bridging the two: dark stage on the left, cream ticket on the right.

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                       Frontend (React + TypeScript)                 │
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐            │
│  │    Login     │   │    Admin     │   │    Judge     │            │
│  │  (split)     │   │  Dashboard   │   │  Dashboard   │            │
│  └──────────────┘   │   6 tabs     │   └──────────────┘            │
│                     └──────────────┘                                │
│                             │                                       │
│                   ┌─────────▼─────────┐                             │
│                   │   api.ts (Axios)  │  JWT attached per request   │
│                   │   401 → /login    │  50s request timeout        │
│                   └─────────┬─────────┘                             │
└─────────────────────────────┼───────────────────────────────────────┘
                              │ (HTTPS/JSON)
                     ┌────────▼────────┐
                     │  REST API /api  │   Cache-Control: no-store
                     │   (JWT auth)    │
                     └────────┬────────┘
┌─────────────────────────────┼───────────────────────────────────────┐
│                  Backend (Node.js + Express + TypeScript)            │
│                                                                      │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                │
│   │  auth   │  │ entries │  │ scores  │  │  admin  │ (export/import)│
│   └─────────┘  └─────────┘  └─────────┘  └─────────┘                │
│                             │                                        │
│                   ┌─────────▼─────────┐                              │
│                   │    db wrapper     │  promise-based sqlite3       │
│                   └─────────┬─────────┘                              │
│                             │                                        │
│                ┌────────────▼────────────┐                           │
│                │   SQLite file on disk   │   PRIMARY store           │
│                │  backend/data/*.db      │   single file, no server  │
│                └─────────────────────────┘                           │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              │  Optional one-click mirror/restore
                              │
             ┌────────────────▼────────────────┐
             │   proxy.php on XAMPP / Apache   │
             │   (localhost/dancejudge-proxy)  │
             └────────────────┬────────────────┘
                              │
                     ┌────────▼────────┐
                     │     MySQL       │   BACKUP mirror
                     │ dj_users, dj_…  │   phpMyAdmin-queryable
                     └─────────────────┘
```

### Tech Stack

**Frontend**
- React 18 + TypeScript
- React Router v6 (role-based protected routes)
- Axios with request/response interceptors
- Custom editorial CSS (no UI framework)
- Fonts: **Fraunces** (display), **Instrument Sans** (body), **JetBrains Mono** (numerics/codes)
- `xlsx`, `jspdf`, `jspdf-autotable`, `file-saver` for exports

**Backend**
- Node.js + Express.js + TypeScript
- SQLite3 (single embedded file, no separate DB server)
- JSON Web Tokens for auth (24 h expiry, HS256)
- `bcryptjs` password hashing (async, 10 rounds — doesn't block the event loop)
- 50 MB JSON body limit (for large database snapshots)

**Backup layer (optional)**
- XAMPP (Apache + MySQL) running locally
- A single `proxy.php` placed in `C:\xampp\htdocs\dancejudge-proxy\`
- Three actions: `?action=health`, `?action=sync`, `?action=load`
- Structured MySQL tables — `dj_users`, `dj_judges`, `dj_categories`, `dj_entries`, `dj_scores`, `dj_snapshot_meta` — queryable directly in phpMyAdmin

## Features

### Admin Dashboard (6 tabs)

**I · Entries** — manual entry or CSV/XLSX bulk upload
- Manual form: pick category, add solo/duet entries one at a time
- Bulk upload: CSV/XLSX with columns `Category, S.No, Participant1, Participant2`
- Automatic dance-token composition (e.g. `SA01`, `DA05`)
- In-line preview before committing

**II · Judges** — full judge lifecycle
- Add, rename, delete judges
- Update a judge's login username or password
- Assign/unassign categories per judge via checkboxes
- **Category Overview** grid showing every category with assigned judges, ≤ 3 judges/category is the recommended pool; over-limit categories turn rust red with a warning bar
- Natural numeric sort — judges display in the order `Judge 1, 2, 3, …, 10, 11, …` instead of lexical `1, 10, 11, 2, 3, …`
- Manual **"Refresh Data"** button with a rotating circular icon

**III · Participants** — live participant management
- Filter by category (or view all)
- In-line edit of any entry (category, number, participant names)
- Bulk-select rows and delete many at once
- Export to Excel
- Edit and delete buttons are thin-stroke SVG icons (pencil / trashcan); save/cancel in edit mode are checkmark / X icons
- Silent refresh on delete — no redundant "Entry deleted" alerts

**IV · Users** — credential management for admins *and* judges
- View all system users with role badges
- Update any user's username or password
- Create new users (judge or admin) from a single form

**V · Results** — now three sub-tabs
- **① Participants & Scores** — the original per-category sortable table. Export to PDF / CSV / XLSX.
- **② Top Rank Holders** — across every category, show the top N (dropdown: 3 – 8, default 3). Rank I (brass), II (ink), III (vermilion) styled distinctly.
- **③ Criterion Stars** — for each category, show the top 3 entries in **Costume**, **Movements**, and **Posture** separately. Scores are summed across all three judges (max 30).

**VI · Settings** — snapshot & mirror
- **Export Database** — downloads a complete JSON snapshot named `dance-judge-backup_DDMMYY_HHMMSS.json`, covering every user, judge, category, entry and score.
- **Import Database** — select a previously exported JSON, preview its record counts and exported timestamp, then atomically replace the SQLite database (transactional — rolls back on any failure).
- **Remote Backup to XAMPP** — on/off toggle. When enabled:
  - Configure host / port / database / user / proxy URL (persisted in `localStorage`)
  - **Test Connection** — verifies Apache + MySQL + proxy.php are reachable
  - **Sync Now** — pushes a fresh SQLite snapshot into MySQL
  - **Restore from XAMPP** — pulls the stored snapshot back and restores SQLite (destructive — asks for confirmation)
  - **Last synced** timestamp displayed
  - Collapsible setup guide generates a ready-to-paste `proxy.php` reflecting your current config with a one-click **Copy PHP** button

### Judge Dashboard

**Live Session masthead** with a pulsing crimson "live" dot, italic serif title `The Adjudicator.`, the judge's name in brass italic, and today's date.

**Now Adjudicating** — the assigned-category dropdown rendered as a massive italic serif statement, not a tiny form control. Announcements, not selects.

**Scoring Progress panel** — big italic numerals `N/Total`, a thin gold progress bar (turns sage green at 100 %), and a circular conic-gradient ring with a rotating light sweep.

**Score Distribution Histogram** — appears once any entry has been scored. 28 bars covering the full 3 – 30 range; each bar's height shows **how many entries landed at that exact total**. Hover any bar to see the list of entries at that score. Mean / min / max stats at the top. Lets judges spot clustering or inadvertent spikes in their own scoring patterns.

**Entry cards** — dance token as the prominent italic serif heading (e.g. `SA01`), with a small secondary `01` label. Ember-orange left bar if unscored, sage-green if scored. A "✓ Scored" badge top-right. Score values are deliberately **hidden** on the card itself — only an **Edit Score** button is shown, preventing shoulder-surfing parents from reading the numbers.

**Scoring modal** — dramatic entrance. Each criterion shows:
- Italic serif label + descriptive hint
- A large boxed current-value in brass on dark
- A slider with a glowing gold thumb
- A 1–10 tick-strip below with the active tick highlighted in brass
- A bold gold-bordered **Composite Score NN/30** panel at the bottom

### Login Page

Split-screen: a dark **Stage** (left) with massive italic `Dance / Judge.` wordmark, ornamental corner brackets and a vertical gold rule; a cream **Ticket** (right) with an underline-animated form, editorial labels, and a submit button whose hover wipes a vermilion panel across from left to right.

## Database Schema (SQLite)

Five tables created on startup via `CREATE TABLE IF NOT EXISTS`.

```sql
users              (id, username, email, password [bcrypt], role, createdAt)
judges             (id, userId → users.id, name, assignedCategories [JSON string])
danceCategories    (id, code, name, type [solo|duet], createdAt)   -- seeded at startup
danceEntries       (id, categoryId, categoryCode, entryNumber,
                    participant1Name, participant2Name, createdAt)
                    UNIQUE(categoryCode, entryNumber)
scores             (id, entryId, judgeId,
                    costumAndImpression, movementsAndRhythm, postureAndMudra,
                    totalScore, submittedAt)
                    UNIQUE(entryId, judgeId)
```

**Where the file lives:** `backend/data/dance_judge.db` (override with `DATABASE_PATH` in `backend/.env`).

## Storage & Backup Model

| Layer | Role | Notes |
|---|---|---|
| SQLite (`backend/data/*.db`) | **Primary** — source of truth | All reads and writes. Single-file, embedded, no DB server. |
| JSON Export (Settings) | Portable cold backup | Manual download — filename `dance-judge-backup_DDMMYY_HHMMSS.json`. Can be re-imported. |
| XAMPP / MySQL | Optional warm backup mirror | One-click push. Restorable. Queryable via phpMyAdmin. |

- Passwords are stored as **bcrypt hashes (10 rounds)** — the raw string is never written to disk.
- All SQLite imports (JSON or XAMPP restore) run inside a transaction, so a partial failure rolls back cleanly.

## Setup & Installation

### Prerequisites
- Node.js ≥ 14
- npm ≥ 6
- (Optional) XAMPP 7+ if you want the MySQL backup mirror

### Quick start — Windows

```bash
setup.bat     # first time only: installs deps, seeds DB
startup.bat   # starts backend (ts-node) + frontend in two new windows
```

### Quick start — Linux / Mac

```bash
chmod +x setup.sh startup.sh stop.sh
./setup.sh
./startup.sh
```

### Manual backend setup

```bash
cd backend
npm install
cp .env.example .env      # then edit if needed
npm run seed              # creates admin + 15 judges + 12 categories
npm run dev               # ts-node src/index.ts   → http://localhost:5000
```

### Manual frontend setup

```bash
cd frontend
npm install
npm run dev               # CRA dev server          → http://localhost:3000
```

The frontend proxies API calls to `http://localhost:5000/api` by default; override with `REACT_APP_API_URL` in `frontend/.env`.

## Default Credentials

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Judge 1 | `judge1` | `judge1` |
| Judge 2 | `judge2` | `judge2` |
| … | … | username == password |
| Judge 15 | `judge15` | `judge15` |

Categories start **unassigned** — assign them in the Admin Dashboard → Judges tab.

## API Endpoints

### Authentication
- `POST /api/auth/login` — returns `{ token, userId, role }`

### Users & Judges (admin only)
- `GET /api/auth/judges` — list all judges with their assignments
- `POST /api/auth/judges` — create judge
- `PUT /api/auth/judges/:judgeId/assignments` — update category list
- `PUT /api/auth/judges/:judgeId/name` — rename judge
- `PUT /api/auth/judges/:judgeId/username` — update login username
- `DELETE /api/auth/judges/:judgeId` — remove judge (cascade)
- `GET /api/auth/judge/profile` — judge's own profile
- `GET /api/auth/users` — list all users
- `POST /api/auth/users` — create any user
- `PUT /api/auth/users/:userId/credentials` — change username/password

### Entries
- `POST /api/entries/upload` — bulk upload into a category
- `GET /api/entries/category/:code` — list entries for a category
- `PUT /api/entries/:entryId` — update a single entry
- `DELETE /api/entries/:entryId` — delete (cascades scores)

### Scores
- `POST /api/scores/submit` — judge submits or updates a score
- `GET /api/scores/judge/categories` — judge's assigned categories
- `GET /api/scores/judge/category/:code` — entries with your own score (if any)
- `GET /api/scores/category/:code` — admin view: all scores + rankings

### Admin — snapshot & restore
- `GET /api/admin/export` — full JSON snapshot of every table
- `POST /api/admin/import` — replace every table atomically from a snapshot

## Scoring

Each judge scores three criteria on a 1–10 scale:

1. **Costume & Overall Impression** — attire, stage presence, visual
2. **Movements & Rhythm** — musicality, footwork, timing
3. **Posture & Mudra** — stance, hand gestures, technical execution

- Judge total = sum of the three (max 30)
- Entry total = sum of three judges' totals when all three have submitted
- Ranks are assigned only when all three judges have scored that entry

## Security Notes

- JWT tokens expire after 24 h
- `Cache-Control: no-store, no-cache, must-revalidate` applied to all `/api/*` responses — prevents stale cached data after server-side changes
- A global 401 response interceptor clears local storage and redirects to `/login`, except for the `/auth/login` endpoint itself (so failed-login errors stay visible on the form)
- Axios 50 s timeout per request
- bcrypt runs **asynchronously**, so a slow password check never blocks the server
- Parameterised SQL everywhere — no string concatenation

## Project Structure

```
Judge_Scoring_SystemV2/
├── backend/
│   ├── src/
│   │   ├── controllers/  authController · entryController · scoreController · adminController
│   │   ├── database/     db.ts  (sqlite3 wrapper, schema bootstrap)
│   │   ├── middleware/   auth.ts (authenticate, authorizeAdmin, authorizeJudge)
│   │   ├── routes/       auth · entries · scores · admin
│   │   ├── utils/        auth.ts (bcryptjs + jsonwebtoken wrappers, async)
│   │   ├── types/        shared TypeScript interfaces
│   │   ├── index.ts      app entry point
│   │   └── seed.ts       standalone seed script
│   ├── data/             SQLite file lives here
│   ├── tsconfig.json
│   └── package.json
│
├── frontend/
│   ├── public/index.html          Google Fonts links (Fraunces / Instrument Sans / JetBrains Mono)
│   ├── src/
│   │   ├── pages/                 LoginPage · AdminDashboard · JudgeDashboard
│   │   ├── services/api.ts        Axios instance + interceptors
│   │   ├── styles/                App.css · Auth.css · Admin.css · Judge.css
│   │   ├── types/index.ts
│   │   ├── App.tsx                React Router
│   │   └── index.tsx
│   ├── tsconfig.json
│   └── package.json
│
├── .gitignore
├── README.md
├── SETUP.md
├── setup.bat  setup.sh
├── startup.bat  startup.sh  stop.sh
```

## Remote Backup — XAMPP Setup

One-time deployment steps (reproduced inside the app's Settings tab with live config):

1. Start XAMPP → Apache + MySQL
2. Open phpMyAdmin → create database `dancejudge`
3. Create folder `C:\xampp\htdocs\dancejudge-proxy\`
4. Paste the auto-generated PHP script into `proxy.php` inside that folder (one-click copy button in the Settings tab)
5. In the admin panel → Settings → toggle **Remote Backup** ON
6. Click **Test Connection** — a green banner confirms you're wired up
7. Click **Sync Now** — data flows from SQLite → MySQL

From then on, one click = fresh mirror. phpMyAdmin lets you query, inspect and export the MySQL copy at any time. SQLite keeps handling live reads and writes for the app. Use **Restore from XAMPP** in the same panel to pull the mirror back into SQLite when needed.

## Troubleshooting

**Backend won't start** — check port 5000, verify `backend/.env` exists, run `npm install` in `backend/`.

**Frontend can't reach backend** — confirm backend is on :5000, check `REACT_APP_API_URL`, check browser Network tab.

**"Export failed — HTTP 404"** — the backend is running stale compiled JS from `backend/dist/`. Stop it and restart with `npm run dev` (ts-node) instead of `node dist/index.js`.

**Admin can log in but is immediately bounced to login** — token likely expired. The 401 interceptor clears local storage and redirects. Just log in again.

**Database wedged or corrupt** — delete `backend/data/dance_judge.db` and run `npm run seed` again. Or restore from a JSON export / XAMPP mirror.

**Categories not reflected after admin assigns them** — fixed in v2.0 via `Cache-Control: no-store` on all API responses. Previously the browser was serving stale GET responses.

## Version History

- **v1.0.0** — Initial release with core features
- **v1.1.0** — Export functionality (PDF, CSV, XLSX)
- **v1.2.0** — Enhanced participant management and bulk operations
- **v2.0.0** — Editorial redesign across all three pages (Login · Admin · Judge); new Results sub-tabs (Top Rank Holders · Criterion Stars); Settings tab with JSON export/import and XAMPP MySQL mirror (two-way); judge-side score distribution histogram; privacy: scores hidden on judge entry cards; natural-sort for judges; global `Cache-Control: no-store`; async bcrypt; 401 redirect interceptor; axios 50s timeout; numerous bug fixes.

## License

MIT.

## Support

<https://github.com/bravetux/Judge_Scoring_SystemV2>
