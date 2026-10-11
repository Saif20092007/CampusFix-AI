import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { loadDatabase, User } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'campusfix_jwt_super_secret_key_2026';
const JWT_EXPIRE_MINUTES = parseInt(process.env.JWT_EXPIRE_MINUTES || '480', 10);

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function generateToken(userId: number): string {
  return jwt.sign({ user_id: userId }, JWT_SECRET, {
    expiresIn: `${JWT_EXPIRE_MINUTES}m`,
  });
}

export function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized', detail: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7).trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { user_id: number };
    const db = loadDatabase();
    const user = db.users.find(u => u.id === decoded.user_id);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized', detail: 'User account not found' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized', detail: 'Token is expired or invalid' });
  }
}

export function requireRole(allowedRoles: ('STUDENT' | 'OFFICER' | 'GRIEVANCE_CELL' | 'ADMIN')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', detail: 'Authentication required' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden', detail: 'Insufficient operational permissions' });
      return;
    }
    next();
  };
}
