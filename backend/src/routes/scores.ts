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
// Admin + view both allowed; the controller enforces role check
router.get('/category/:categoryCode', authenticate, getScoresByCategory);

export default router;
