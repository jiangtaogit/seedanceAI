/**
 * JWT Authentication Middleware
 * Validates Bearer token and attaches user info to req.user
 */
import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        role: 'admin' | 'user';
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'seedance-ai-secret-key-change-in-production';

/**
 * Verify JWT token and attach user to req.user
 * Returns 401 if no token or invalid token
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '未登录，请先登录' });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      username: string;
      role: 'admin' | 'user';
    };
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: 'Token无效或已过期，请重新登录' });
  }
}

/**
 * Require admin role — combines authMiddleware + role check
 * Returns 401 if not authenticated, 403 if not admin
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  // First authenticate
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: '未登录，请先登录' });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      username: string;
      role: 'admin' | 'user';
    };
    req.user = decoded;
  } catch (err) {
    res.status(401).json({ success: false, error: 'Token无效或已过期，请重新登录' });
    return;
  }

  // Then check role
  if (req.user.role !== 'admin') {
    res.status(403).json({ success: false, error: '权限不足，仅管理员可执行此操作' });
    return;
  }
  next();
}

/**
 * Generate JWT token
 */
export function generateToken(payload: {
  userId: string;
  username: string;
  role: 'admin' | 'user';
}): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Optional auth — attach user if token present, but don't reject if missing
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        username: string;
        role: 'admin' | 'user';
      };
      req.user = decoded;
    } catch {
      // Invalid token, but that's ok for optional auth
    }
  }
  next();
}

export { JWT_SECRET };
