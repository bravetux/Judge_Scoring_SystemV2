// One-off utility — inserts the view-only user into the existing SQLite DB
// without wiping any other data (unlike `npm run seed`).
// Run with: node create-view-user.js
const sqlite3 = require('sqlite3');
const bcryptjs = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'dance_judge.db');
const db = new sqlite3.Database(dbPath);
const hash = bcryptjs.hashSync(process.env.VIEW_PASSWORD || 'view123', 10);
const id = uuidv4();

db.run(
  "INSERT OR REPLACE INTO users (id, username, email, password, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
  [id, 'view', 'view@dancejudge.com', hash, 'view', new Date().toISOString()],
  function (err) {
    if (err) { console.error('Error:', err); process.exit(1); }
    console.log('View user ready. Username: view   Password: view123');
    db.close();
  }
);
