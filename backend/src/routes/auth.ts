import { Router } from 'express';
import { register, login, getJudges, updateJudgeAssignments, updateJudgeName, deleteJudge, addJudge, getAllUsers, updateUserCredentials, createUser, updateJudgeUsername, getJudgeProfile } from '../controllers/authController';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.post('/register', authenticate, authorizeAdmin, register);
router.post('/login', login);
router.get('/judges', authenticate, authorizeAdmin, getJudges);
router.get('/judge/profile', authenticate, getJudgeProfile);
router.put('/judges/:judgeId/assignments', authenticate, authorizeAdmin, updateJudgeAssignments);
router.put('/judges/:judgeId/name', authenticate, authorizeAdmin, updateJudgeName);
router.put('/judges/:judgeId/username', authenticate, authorizeAdmin, updateJudgeUsername);
router.delete('/judges/:judgeId', authenticate, authorizeAdmin, deleteJudge);
router.post('/judges', authenticate, authorizeAdmin, addJudge);
router.get('/users', authenticate, authorizeAdmin, getAllUsers);
router.post('/users', authenticate, authorizeAdmin, createUser);
router.put('/users/:userId/credentials', authenticate, authorizeAdmin, updateUserCredentials);

export default router;
