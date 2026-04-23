import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/dance_judge.db');

export const db = new sqlite3.Database(dbPath);

export function initializeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Enable Write-Ahead Logging — readers don't block on writers,
      // giving a much smoother experience when many users are online.
      // This is persistent on the DB file (set once, survives restarts).
      db.run('PRAGMA journal_mode = WAL', (err) => {
        if (err) reject(err);
        else console.log('✓ SQLite WAL mode enabled');
      });
      // Durable enough for a live event, measurably faster than FULL.
      db.run('PRAGMA synchronous = NORMAL', (err) => {
        if (err) reject(err);
      });
      // Give waiting operations up to 5s before throwing SQLITE_BUSY —
      // protects us if a long read and a write happen to collide.
      db.run('PRAGMA busy_timeout = 5000', (err) => {
        if (err) reject(err);
      });

      // Users table
      db.run(
        `CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL,
          createdAt TEXT NOT NULL
        )`,
        (err) => {
          if (err) reject(err);
        }
      );

      // Judges table
      db.run(
        `CREATE TABLE IF NOT EXISTS judges (
          id TEXT PRIMARY KEY,
          userId TEXT NOT NULL,
          name TEXT NOT NULL,
          assignedCategories TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES users(id)
        )`,
        (err) => {
          if (err) reject(err);
        }
      );

      // Dance Categories table
      db.run(
        `CREATE TABLE IF NOT EXISTS danceCategories (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL,
          createdAt TEXT NOT NULL
        )`,
        (err) => {
          if (err) reject(err);
        }
      );

      // Dance Entries table
      db.run(
        `CREATE TABLE IF NOT EXISTS danceEntries (
          id TEXT PRIMARY KEY,
          categoryId TEXT NOT NULL,
          categoryCode TEXT NOT NULL,
          entryNumber INTEGER NOT NULL,
          participant1Name TEXT NOT NULL,
          participant2Name TEXT,
          createdAt TEXT NOT NULL,
          FOREIGN KEY (categoryId) REFERENCES danceCategories(id),
          UNIQUE(categoryCode, entryNumber)
        )`,
        (err) => {
          if (err) reject(err);
        }
      );

      // Scores table
      db.run(
        `CREATE TABLE IF NOT EXISTS scores (
          id TEXT PRIMARY KEY,
          entryId TEXT NOT NULL,
          judgeId TEXT NOT NULL,
          costumAndImpression INTEGER NOT NULL,
          movementsAndRhythm INTEGER NOT NULL,
          postureAndMudra INTEGER NOT NULL,
          totalScore INTEGER NOT NULL,
          submittedAt TEXT NOT NULL,
          FOREIGN KEY (entryId) REFERENCES danceEntries(id),
          FOREIGN KEY (judgeId) REFERENCES judges(id),
          UNIQUE(entryId, judgeId)
        )`,
        (err) => {
          if (err) reject(err);
        }
      );

      // Insert default dance categories
      const categories = [
        { code: 'SA', name: 'Solo Category A', type: 'solo' },
        { code: 'SB', name: 'Solo Category B', type: 'solo' },
        { code: 'SC', name: 'Solo Category C', type: 'solo' },
        { code: 'SD', name: 'Solo Category D', type: 'solo' },
        { code: 'SE', name: 'Solo Category E', type: 'solo' },
        { code: 'SKG', name: 'Solo KG', type: 'solo' },
        { code: 'DA', name: 'Duet Category A', type: 'duet' },
        { code: 'DB', name: 'Duet Category B', type: 'duet' },
        { code: 'DC', name: 'Duet Category C', type: 'duet' },
        { code: 'DD', name: 'Duet Category D', type: 'duet' },
        { code: 'DE', name: 'Duet Category E', type: 'duet' },
        { code: 'DKG', name: 'Duet KG', type: 'duet' },
      ];

      categories.forEach((cat) => {
        db.run(
          `INSERT OR IGNORE INTO danceCategories (id, code, name, type, createdAt)
           VALUES (?, ?, ?, ?, ?)`,
          [
            `cat_${cat.code}`,
            cat.code,
            cat.name,
            cat.type,
            new Date().toISOString(),
          ],
          (err) => {
            if (err) reject(err);
          }
        );
      });

      resolve();
    });
  });
}

export function run(sql: string, params: any[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      resolve();
    });
  });
}

export function get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      resolve(row as T | undefined);
    });
  });
}

export function all<T>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      resolve(rows as T[]);
    });
  });
}
