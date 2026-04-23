import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { JwtPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

export async function hashPassword(password: string): Promise<string> {
  return bcryptjs.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export function generateToken(payload: JwtPayload): string {
  // 7 days — covers multi-day competition events. A silent session probe
  // on window-focus in the frontend proactively catches expired tokens.
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
}
