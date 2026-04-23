import { Response } from 'express';
import { all, run } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Export every table as a single JSON payload so an admin can take a full
 * snapshot of the database.
 */
export async function exportDatabase(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const users = await all<any>('SELECT * FROM users');
    const judges = await all<any>('SELECT * FROM judges');
    const danceCategories = await all<any>('SELECT * FROM danceCategories');
    const danceEntries = await all<any>('SELECT * FROM danceEntries');
    const scores = await all<any>('SELECT * FROM scores');

    res.json({
      version: 1,
      application: 'dance-judge-scoring',
      exportedAt: new Date().toISOString(),
      counts: {
        users: users.length,
        judges: judges.length,
        danceCategories: danceCategories.length,
        danceEntries: danceEntries.length,
        scores: scores.length,
      },
      data: {
        users,
        judges,
        danceCategories,
        danceEntries,
        scores,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
}

/**
 * Restore the database from a previously-exported JSON payload.
 * Runs inside a transaction so a partial failure rolls back cleanly.
 * ALL EXISTING DATA IS DELETED — this is destructive by design.
 */
export async function importDatabase(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const payload = req.body;
    if (!payload || typeof payload !== 'object' || !payload.data) {
      return res
        .status(400)
        .json({ error: 'Invalid payload: missing "data" field' });
    }

    const { users, judges, danceCategories, danceEntries, scores } =
      payload.data;

    if (
      !Array.isArray(users) ||
      !Array.isArray(judges) ||
      !Array.isArray(danceCategories) ||
      !Array.isArray(danceEntries) ||
      !Array.isArray(scores)
    ) {
      return res
        .status(400)
        .json({ error: 'Invalid payload: one or more tables are missing or not arrays' });
    }

    let committed = false;
    try {
      await run('BEGIN TRANSACTION');

      // Clear tables in reverse-dependency order
      await run('DELETE FROM scores');
      await run('DELETE FROM danceEntries');
      await run('DELETE FROM judges');
      await run('DELETE FROM danceCategories');
      await run('DELETE FROM users');

      // Restore in dependency order
      for (const u of users) {
        await run(
          `INSERT INTO users (id, username, email, password, role, createdAt)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [u.id, u.username, u.email, u.password, u.role, u.createdAt]
        );
      }

      for (const c of danceCategories) {
        await run(
          `INSERT INTO danceCategories (id, code, name, type, createdAt)
           VALUES (?, ?, ?, ?, ?)`,
          [c.id, c.code, c.name, c.type, c.createdAt]
        );
      }

      for (const j of judges) {
        // Accept either a JSON-string or an array for assignedCategories
        const assigned =
          typeof j.assignedCategories === 'string'
            ? j.assignedCategories
            : JSON.stringify(j.assignedCategories || []);
        await run(
          `INSERT INTO judges (id, userId, name, assignedCategories)
           VALUES (?, ?, ?, ?)`,
          [j.id, j.userId, j.name, assigned]
        );
      }

      for (const e of danceEntries) {
        await run(
          `INSERT INTO danceEntries (id, categoryId, categoryCode, entryNumber, participant1Name, participant2Name, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            e.id,
            e.categoryId,
            e.categoryCode,
            e.entryNumber,
            e.participant1Name,
            e.participant2Name || null,
            e.createdAt,
          ]
        );
      }

      for (const s of scores) {
        await run(
          `INSERT INTO scores (id, entryId, judgeId, costumAndImpression, movementsAndRhythm, postureAndMudra, totalScore, submittedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            s.id,
            s.entryId,
            s.judgeId,
            s.costumAndImpression,
            s.movementsAndRhythm,
            s.postureAndMudra,
            s.totalScore,
            s.submittedAt,
          ]
        );
      }

      await run('COMMIT');
      committed = true;

      res.json({
        message: 'Database restored successfully',
        counts: {
          users: users.length,
          judges: judges.length,
          danceCategories: danceCategories.length,
          danceEntries: danceEntries.length,
          scores: scores.length,
        },
      });
    } catch (innerErr) {
      if (!committed) {
        try {
          await run('ROLLBACK');
        } catch (_) {
          /* ignore rollback errors */
        }
      }
      throw innerErr;
    }
  } catch (error: any) {
    console.error('Import error:', error);
    res.status(500).json({
      error:
        'Import failed: ' +
        (error?.message || 'unknown error') +
        '. Existing data was rolled back.',
    });
  }
}
