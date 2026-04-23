import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { all, get, run } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { Score, DanceEntryScore } from '../types';

export async function submitScore(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const { entryId, costumAndImpression, movementsAndRhythm, postureAndMudra } =
      req.body;

    if (
      !entryId ||
      costumAndImpression === undefined ||
      movementsAndRhythm === undefined ||
      postureAndMudra === undefined
    ) {
      return res.status(400).json({ error: 'Missing required score fields' });
    }

    // Validate scores are between 1-10
    const scores = [costumAndImpression, movementsAndRhythm, postureAndMudra];
    if (scores.some((score) => score < 1 || score > 10)) {
      return res.status(400).json({ error: 'Scores must be between 1 and 10' });
    }

    // Get judge id from user
    const judge = await get(
      'SELECT id FROM judges WHERE userId = ?',
      [req.user?.userId]
    );

    if (!judge) {
      return res.status(403).json({ error: 'User is not a judge' });
    }

    // Check if score already submitted
    const existingScore = await get(
      'SELECT id FROM scores WHERE entryId = ? AND judgeId = ?',
      [entryId, (judge as any).id]
    );

    const totalScore = costumAndImpression + movementsAndRhythm + postureAndMudra;
    const scoreId = existingScore ? (existingScore as any).id : uuidv4();

    if (existingScore) {
      // Update existing score
      await run(
        `UPDATE scores SET 
         costumAndImpression = ?, 
         movementsAndRhythm = ?, 
         postureAndMudra = ?, 
         totalScore = ?, 
         submittedAt = ?
         WHERE id = ?`,
        [
          costumAndImpression,
          movementsAndRhythm,
          postureAndMudra,
          totalScore,
          new Date().toISOString(),
          scoreId,
        ]
      );
    } else {
      // Create new score
      await run(
        `INSERT INTO scores (id, entryId, judgeId, costumAndImpression, movementsAndRhythm, postureAndMudra, totalScore, submittedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          scoreId,
          entryId,
          (judge as any).id,
          costumAndImpression,
          movementsAndRhythm,
          postureAndMudra,
          totalScore,
          new Date().toISOString(),
        ]
      );
    }

    res.json({ message: 'Score submitted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getJudgeCategories(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const judge = await get<any>(
      'SELECT assignedCategories FROM judges WHERE userId = ?',
      [req.user?.userId]
    );

    if (!judge) {
      return res.status(403).json({ error: 'User is not a judge' });
    }

    const categories = JSON.parse(judge.assignedCategories);
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getEntriesForJudge(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const { categoryCode } = req.params;

    // Verify judge is assigned to this category
    const judge = await get<any>(
      'SELECT assignedCategories FROM judges WHERE userId = ?',
      [req.user?.userId]
    );

    if (!judge) {
      return res.status(403).json({ error: 'User is not a judge' });
    }

    const assignedCategories = JSON.parse(judge.assignedCategories);
    if (!assignedCategories.includes(categoryCode)) {
      return res.status(403).json({ error: 'Not assigned to this category' });
    }

    // Get all entries for this category
    const entries = await all<any>(
      'SELECT * FROM danceEntries WHERE categoryCode = ? ORDER BY entryNumber',
      [categoryCode]
    );

    // Get judge's id for score lookup
    const judgeRecord = await get<any>(
      'SELECT id FROM judges WHERE userId = ?',
      [req.user?.userId]
    );

    // For each entry, get the judge's score if submitted
    const entriesWithScores = await Promise.all(
      entries.map(async (entry) => {
        const score = await get<any>(
          'SELECT * FROM scores WHERE entryId = ? AND judgeId = ?',
          [entry.id, (judgeRecord as any).id]
        );
        return {
          ...entry,
          score: score || null,
        };
      })
    );

    res.json(entriesWithScores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getScoresByCategory(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    // Admin (full access) and view (read-only) can both see results.
    if (req.user?.role !== 'admin' && req.user?.role !== 'view') {
      return res.status(403).json({ error: 'Admin or view access required' });
    }

    const { categoryCode } = req.params;

    // Get all entries for this category
    const entries = await all<any>(
      'SELECT * FROM danceEntries WHERE categoryCode = ? ORDER BY entryNumber',
      [categoryCode]
    );

    // For each entry, get all judges' scores
    const entriesWithScores: DanceEntryScore[] = await Promise.all(
      entries.map(async (entry) => {
        const scores = await all<any>(
          `SELECT s.*, j.id as judgeId, j.name as judgeName, u.username as judgeUsername
           FROM scores s
           JOIN judges j ON s.judgeId = j.id
           JOIN users u ON j.userId = u.id
           WHERE s.entryId = ?`,
          [entry.id]
        );

        // Natural-sort by username so judge1, judge2, judge3, …, judge10
        // map to the Judge1 / Judge2 / Judge3 slots predictably. Without
        // this, ORDER BY UUID puts them in effectively random order.
        scores.sort((a: any, b: any) =>
          String(a.judgeUsername || '').localeCompare(
            String(b.judgeUsername || ''),
            undefined,
            { numeric: true, sensitivity: 'base' }
          )
        );

        const result: DanceEntryScore = {
          entryId: entry.id,
          categoryCode: entry.categoryCode,
          entryNumber: entry.entryNumber,
          participant1Name: entry.participant1Name,
          participant2Name: entry.participant2Name,
        };

        const buildScore = (score: any) => ({
          costumAndImpression: score.costumAndImpression,
          movementsAndRhythm: score.movementsAndRhythm,
          postureAndMudra: score.postureAndMudra,
          totalScore: score.totalScore,
          judgeUsername: score.judgeUsername,
          judgeName: score.judgeName,
        });

        // Assign scores based on sorted-by-username order
        scores.forEach((score: any, index: number) => {
          if (index === 0) result.judge1Score = buildScore(score);
          else if (index === 1) result.judge2Score = buildScore(score);
          else if (index === 2) result.judge3Score = buildScore(score);
        });

        // Calculate total score if all 3 judges have submitted
        if (
          result.judge1Score &&
          result.judge2Score &&
          result.judge3Score
        ) {
          const totalScores =
            result.judge1Score.totalScore +
            result.judge2Score.totalScore +
            result.judge3Score.totalScore;
          result.totalScore = Math.round(totalScores * 100) / 100;
          // Keep average for backward compatibility
          result.averageScore = Math.round((totalScores / 3) * 100) / 100;
        }

        return result;
      })
    );

    // Calculate and add rankings based on total score
    const completedEntries = entriesWithScores.filter((e) => e.totalScore);
    completedEntries.sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

    const rankedEntries = entriesWithScores.map((entry) => {
      if (entry.totalScore) {
        const rank =
          completedEntries.findIndex((e) => e.entryId === entry.entryId) + 1;
        return { ...entry, rank };
      }
      return entry;
    });

    res.json(rankedEntries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
