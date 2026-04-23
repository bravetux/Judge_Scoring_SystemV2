import { Router } from 'express';
import { uploadEntries, getEntriesByCategory, updateEntry, deleteEntry } from '../controllers/entryController';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.post('/upload', authenticate, authorizeAdmin, uploadEntries);
router.get('/category/:categoryCode', authenticate, getEntriesByCategory);
router.put('/:entryId', authenticate, authorizeAdmin, updateEntry);
router.delete('/:entryId', authenticate, authorizeAdmin, deleteEntry);

export default router;
