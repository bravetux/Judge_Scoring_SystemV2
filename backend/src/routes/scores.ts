import { Router } from 'express';
import {
  submitScore,
  getJudgeCategories,
  getEntriesForJudge,
  getScoresByCategory,
} from '../controllers/scoreController';
import { authenticate, authorizeJudge, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.post('/submit', authenticate, authorizeJudge, submitScore);
router.get('/judge/categories', authenticate, authorizeJudge, getJudgeCategories);
router.get('/judge/category/:categoryCode', authenticate, authorizeJudge, getEntriesForJudge);
router.get('/category/:categoryCode', authenticate, authorizeAdmin, getScoresByCategory);

export default router;
