/**
 * User Authentication Routes
 * POST /api/auth/register - Register new user
 * POST /api/auth/login - User login
 * POST /api/auth/logout - User logout (client-side only)
 * GET /api/auth/me - Get current user info
 * PATCH /api/auth/change-password - Change password
 */
import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getOne, runQuery } from '../database.js';
import { authMiddleware, generateToken } from '../middleware/auth.js';

const router = Router();

// ============ Types ============

interface User {
  id: string;
  username: string;
  password_hash: string;
  role: string;
  created_at: string;
  updated_at: string;
}

// ============ Routes ============

/**
 * User Registration
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || typeof username !== 'string') {
      res.status(400).json({ success: false, error: '用户名不能为空' });
      return;
    }
    if (!password || typeof password !== 'string') {
      res.status(400).json({ success: false, error: '密码不能为空' });
      return;
    }
    if (username.trim().length < 3 || username.trim().length > 20) {
      res.status(400).json({ success: false, error: '用户名长度需在3-20个字符之间' });
      return;
    }
    if (password.length < 6 || password.length > 32) {
      res.status(400).json({ success: false, error: '密码长度需在6-32个字符之间' });
      return;
    }

    // Check if username already exists
    const existing = getOne<User>('SELECT id FROM users WHERE username = ?', [username.trim()]);
    if (existing) {
      res.status(409).json({ success: false, error: '用户名已存在' });
      return;
    }

    // Create user
    const userId = uuidv4();
    const hash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];

    runQuery(
      `INSERT INTO users (id, username, password_hash, role, created_at, updated_at)
       VALUES (?, ?, ?, 'user', ?, ?)`,
      [userId, username.trim(), hash, now, now]
    );

    // Generate JWT token
    const token = generateToken({
      userId,
      username: username.trim(),
      role: 'user',
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: userId,
          username: username.trim(),
          role: 'user',
        },
      },
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: error?.message || '注册失败' });
  }
});

/**
 * User Login
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, error: '用户名和密码不能为空' });
      return;
    }

    // Find user
    const user = getOne<User>('SELECT * FROM users WHERE username = ?', [username.trim()]);
    if (!user) {
      res.status(401).json({ success: false, error: '用户名或密码错误' });
      return;
    }

    // Verify password
    const valid = bcrypt.compareSync(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ success: false, error: '用户名或密码错误' });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role as 'admin' | 'user',
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
        },
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error?.message || '登录失败' });
  }
});

/**
 * User Logout
 * POST /api/auth/logout
 * (JWT is stateless — client just discards the token)
 */
router.post('/logout', async (_req: Request, res: Response): Promise<void> => {
  res.json({ success: true, message: '已登出' });
});

/**
 * Get Current User Info
 * GET /api/auth/me
 */
router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未登录' });
      return;
    }

    const user = getOne<User>('SELECT id, username, role, created_at FROM users WHERE id = ?', [req.user.userId]);
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.created_at,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || '获取用户信息失败' });
  }
});

/**
 * Change Password
 * PATCH /api/auth/change-password
 */
router.patch('/change-password', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未登录' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || typeof currentPassword !== 'string') {
      res.status(400).json({ success: false, error: '当前密码不能为空' });
      return;
    }
    if (!newPassword || typeof newPassword !== 'string') {
      res.status(400).json({ success: false, error: '新密码不能为空' });
      return;
    }
    if (newPassword.length < 6 || newPassword.length > 32) {
      res.status(400).json({ success: false, error: '新密码长度需在6-32个字符之间' });
      return;
    }
    if (currentPassword === newPassword) {
      res.status(400).json({ success: false, error: '新密码不能与当前密码相同' });
      return;
    }

    // Find user
    const user = getOne<User>('SELECT * FROM users WHERE id = ?', [req.user.userId]);
    if (!user) {
      res.status(404).json({ success: false, error: '用户不存在' });
      return;
    }

    // Verify current password
    const valid = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!valid) {
      res.status(401).json({ success: false, error: '当前密码错误' });
      return;
    }

    // Update password
    const newHash = bcrypt.hashSync(newPassword, 10);
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];
    runQuery(
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      [newHash, now, user.id]
    );

    res.json({ success: true, message: '密码修改成功' });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: error?.message || '密码修改失败' });
  }
});

export default router;
