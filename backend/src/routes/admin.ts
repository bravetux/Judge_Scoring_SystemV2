import { Router } from 'express';
import { exportDatabase, importDatabase } from '../controllers/adminController';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

router.get('/export', authenticate, authorizeAdmin, exportDatabase);
router.post('/import', authenticate, authorizeAdmin, importDatabase);

export default router;
