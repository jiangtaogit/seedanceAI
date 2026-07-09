/**
 * Task Routes
 * POST /api/tasks/create - Create video generation task
 * GET /api/tasks - List tasks
 * GET /api/tasks/:taskId - Get task detail
 * DELETE /api/tasks/:taskId - Delete task
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

const router = Router();

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

    const task = await createTask(params);
    res.status(201).json({ success: true, data: task });
  } catch (error: any) {
    console.error('Create task error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to create task' });
  }
});

/**
 * List tasks with pagination
 * GET /api/tasks
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const status = req.query.status as string | undefined;

    const result = listTasks(page, limit, status);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('List tasks error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to list tasks' });
  }
});

/**
 * Get task detail — auto-polls ARK if task is still in progress
 * GET /api/tasks/:taskId
 */
router.get('/:taskId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const task = getTask(taskId);

    if (!task) {
      res.status(404).json({ success: false, error: 'Task not found' });
      return;
    }

    // Auto-poll ARK if task is still in progress
    if (task.status === 'queued' || task.status === 'processing') {
      try {
        const updatedTask = await pollTaskStatus(taskId);
        res.json({ success: true, data: updatedTask });
        return;
      } catch (pollError) {
        console.error('Auto-poll failed, returning cached task:', pollError);
        // Fall through to return cached task
      }
    }

    res.json({ success: true, data: task });
  } catch (error: any) {
    console.error('Get task error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to get task' });
  }
});

/**
 * Delete all failed tasks
 * DELETE /api/tasks/failed
 */
router.delete('/failed', async (_req: Request, res: Response): Promise<void> => {
  try {
    const count = deleteFailedTasks();
    res.json({ success: true, message: `已删除 ${count} 个失败任务`, deletedCount: count });
  } catch (error: any) {
    console.error('Delete failed tasks error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to delete failed tasks' });
  }
});

/**
 * Delete a task
 * DELETE /api/tasks/:taskId
 */
router.delete('/:taskId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { taskId } = req.params;
    const deleted = deleteTask(taskId);

    if (!deleted) {
      res.status(404).json({ success: false, error: 'Task not found' });
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

    const updatedTask = await pollTaskStatus(taskId);
    res.json({ success: true, data: updatedTask });
  } catch (error: any) {
    console.error('Poll task error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to poll task status' });
  }
});

export default router;
