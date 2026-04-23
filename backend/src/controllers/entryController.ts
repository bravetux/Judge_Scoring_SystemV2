import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { all, get, run } from '../database/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { DanceEntry, DanceEntryScore, Score } from '../types';

export async function uploadEntries(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can upload entries' });
    }

    const { categoryCode, entries } = req.body;

    if (!categoryCode || !entries || !Array.isArray(entries)) {
      return res.status(400).json({ error: 'Missing categoryCode or entries' });
    }

    const category = await get(
      'SELECT id FROM danceCategories WHERE code = ?',
      [categoryCode]
    );

    if (!category) {
      return res.status(400).json({ error: 'Invalid dance category' });
    }

    // Get the current max entry number for this category
    const maxEntry = await get(
      'SELECT MAX(entryNumber) as maxNum FROM danceEntries WHERE categoryCode = ?',
      [categoryCode]
    );

    let nextEntryNum = ((maxEntry as any)?.maxNum || 0) + 1;

    for (const entry of entries) {
      const entryId = uuidv4();

      await run(
        `INSERT INTO danceEntries (id, categoryId, categoryCode, entryNumber, participant1Name, participant2Name, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          entryId,
          (category as any).id,
          categoryCode,
          nextEntryNum,
          entry.participant1Name,
          entry.participant2Name || null,
          new Date().toISOString(),
        ]
      );

      nextEntryNum++;
    }

    res.json({ message: 'Entries uploaded successfully' });
  } catch (error) {
    console.error('Upload entries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getEntriesByCategory(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const { categoryCode } = req.params;

    const entries = await all<DanceEntry>(
      'SELECT * FROM danceEntries WHERE categoryCode = ? ORDER BY entryNumber',
      [categoryCode]
    );

    res.json(entries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateEntry(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update entries' });
    }

    const { entryId } = req.params;
    const { categoryCode, entryNumber, participant1Name, participant2Name } = req.body;

    if (!categoryCode || !entryNumber || !participant1Name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get the category ID
    const category = await get(
      'SELECT id FROM danceCategories WHERE code = ?',
      [categoryCode]
    );

    if (!category) {
      return res.status(400).json({ error: 'Invalid dance category' });
    }

    // Check if the new entry number conflicts with another entry
    const existingEntry = await get(
      'SELECT id FROM danceEntries WHERE categoryCode = ? AND entryNumber = ? AND id != ?',
      [categoryCode, entryNumber, entryId]
    );

    if (existingEntry) {
      return res.status(400).json({ error: 'Entry number already exists in this category' });
    }

    await run(
      `UPDATE danceEntries 
       SET categoryId = ?, categoryCode = ?, entryNumber = ?, 
           participant1Name = ?, participant2Name = ?
       WHERE id = ?`,
      [
        (category as any).id,
        categoryCode,
        entryNumber,
        participant1Name,
        participant2Name || null,
        entryId,
      ]
    );

    res.json({ message: 'Entry updated successfully' });
  } catch (error) {
    console.error('Update entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteEntry(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete entries' });
    }

    const { entryId } = req.params;

    await run('DELETE FROM danceEntries WHERE id = ?', [entryId]);
    await run('DELETE FROM scores WHERE entryId = ?', [entryId]);

    res.json({ message: 'Entry deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
