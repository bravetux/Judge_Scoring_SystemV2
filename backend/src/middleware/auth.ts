import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: 'admin' | 'judge' | 'view';
  };
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = payload;
  next();
}

export function authorizeAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export function authorizeJudge(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (req.user?.role !== 'judge') {
    return res.status(403).json({ error: 'Judge access required' });
  }
  next();
}
