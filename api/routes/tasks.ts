/**
 * Task Routes
 * POST /api/tasks/create - Create video generation task
 * GET /api/tasks - List tasks
 * GET /api/tasks/:taskId - Get task detail
 * DELETE /api/tasks/:taskId - Delete task
 * DELETE /api/tasks/failed - Delete failed tasks
 * POST /api/tasks/:taskId/poll - Manual poll task status
 */
import { Router, type Request, type Response } from 'express';
import {
  createTask,
  getTask,
  listTasks,
  deleteTask,
  deleteFailedTasks,
  pollTaskStatus,
  type CreateTaskParams,
} from '../services/task.js';
import { authMiddleware } from '../middleware/auth.js';
import { getOne } from '../database.js';

const router = Router();

// All task routes require authentication
router.use(authMiddleware);

// ============ Types ============

interface UserInfo {
  username: string;
}

/**
 * Helper: get username from user_id
 */
function getUsername(userId: string | null | undefined): string | null {
  if (!userId) return null;
  const user = getOne<UserInfo>('SELECT username FROM users WHERE id = ?', [userId]);
  return user?.username || null;
}

/**
 * Create a new video generation task
 * POST /api/tasks/create
 */
router.post('/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, referenceFiles, duration, resolution, aspect_ratio, style, seed, cfg_scale, model, mode, lastFrameFile, referenceImages, referenceVideos, referenceAudios } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Prompt is required' });
      return;
    }

    const params: CreateTaskParams = {
      prompt: prompt.trim(),
      referenceFiles: referenceFiles || [],
      duration: duration ? Number(duration) : undefined,
      resolution,
      aspect_ratio,
      style,
      seed: seed ? Number(seed) : undefined,
      cfg_scale: cfg_scale ? Number(cfg_scale) : undefined,
      model,
      mode,
      lastFrameFile,
      referenceImages: referenceImages || [],
      referenceVideos: referenceVideos || [],
      referenceAudios: referenceAudios || [],
    };

    // Pass userId from JWT token
    const userId = req.user?.userId;
    const task = await createTask(params, userId);
    res.status(201).json({ success: true, data: task });
  } catch (error: any) {
    console.error('Create task error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to create task' });
  }
});

/**
 * List tasks with pagination
 * GET /api/tasks
 * Admin sees all tasks; regular users see only their own
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = req.query.status as string | undefined;

    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin';

    const result = listTasks(page, limit, status, userId, isAdmin);

    // Add username to each task for admin view
    const tasksWithUser = result.tasks.map(task => ({
      ...task,
      username: getUsername(task.user_id),
    }));

    res.json({ success: true, data: { ...result, tasks: tasksWithUser } });
  } catch (error: any) {
    console.error('List tasks error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to list tasks' });
  }
});

/**
 * Get task detail — auto-polls ARK if task is still in progress
 * GET /api/tasks/:taskId
 * Admin can view any task; regular users can only view their own
 */
router.get('/:taskId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const task = getTask(taskId);

    if (!task) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    // Permission check: non-admin can only view their own tasks
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && task.user_id && task.user_id !== userId) {
      res.status(403).json({ success: false, error: '无权查看此任务' });
      return;
    }

    // Auto-poll ARK if task is still in progress
    if (task.status === 'queued' || task.status === 'processing') {
      try {
        const updatedTask = await pollTaskStatus(taskId);
        res.json({
          success: true,
          data: {
            ...updatedTask,
            username: getUsername(updatedTask?.user_id),
          },
        });
        return;
      } catch (pollError) {
        console.error('Auto-poll failed, returning cached task:', pollError);
        // Fall through to return cached task
      }
    }

    res.json({
      success: true,
      data: {
        ...task,
        username: getUsername(task.user_id),
      },
    });
  } catch (error: any) {
    console.error('Get task error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to get task' });
  }
});

/**
 * Delete all failed tasks
 * DELETE /api/tasks/failed
 * Admin deletes all; regular users delete only their own
 */
router.delete('/failed', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin';
    const count = deleteFailedTasks(userId, isAdmin);
    res.json({ success: true, message: `已删除 ${count} 个失败任务`, deletedCount: count });
  } catch (error: any) {
    console.error('Delete failed tasks error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to delete failed tasks' });
  }
});

/**
 * Delete a task
 * DELETE /api/tasks/:taskId
 * Admin can delete any; regular users can only delete their own
 */
router.delete('/:taskId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin';
    const deleted = deleteTask(taskId, userId, isAdmin);

    if (!deleted) {
      res.status(404).json({ success: false, error: 'Task not found or no permission' });
      return;
    }

    res.json({ success: true, message: 'Task deleted' });
  } catch (error: any) {
    console.error('Delete task error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to delete task' });
  }
});

/**
 * Manual poll task status
 * POST /api/tasks/:taskId/poll
 */
router.post('/:taskId/poll', async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const task = getTask(taskId);

    if (!task) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    // Permission check
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin';
    if (!isAdmin && task.user_id && task.user_id !== userId) {
      res.status(403).json({ success: false, error: '无权操作此任务' });
      return;
    }

    const updatedTask = await pollTaskStatus(taskId);
    res.json({ success: true, data: updatedTask });
  } catch (error: any) {
    console.error('Poll task error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to poll task status' });
  }
});

export default router;
