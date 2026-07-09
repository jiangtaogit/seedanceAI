/**
 * Task Management Service
 * Handles task CRUD and polling operations
 */
import { v4 as uuidv4 } from 'uuid';
import { getDatabase, getOne, getAll, runQuery, persistDatabase } from '../database.js';
import {
  submitGenerationTask,
  buildContent,
  queryTaskResult,
  fileToBase64DataUrl,
  type SeedanceParams,
} from './seedance.js';

// ============ Types ============

export interface Task {
  id: string;
  prompt: string;
  status: string;
  progress: number;
  stage: string | null;
  video_url: string | null;
  duration: number | null;
  resolution: string | null;
  aspect_ratio: string | null;
  style: string | null;
  seed: number | null;
  cfg_scale: number | null;
  error_message: string | null;
  engine_task_id: string | null;
  reference_files: string;
  model: string | null;
  mode: string | null;
  last_frame_file: string | null;
  reference_files_json: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface CreateTaskParams {
  prompt: string;
  referenceFiles?: string[];
  duration?: number;
  resolution?: string;
  aspect_ratio?: string;
  style?: string;
  seed?: number;
  cfg_scale?: number;
  model?: string;
  mode?: string;
  lastFrameFile?: string;
  referenceImages?: string[];
  referenceVideos?: string[];
  referenceAudios?: string[];
}

export interface TaskListResult {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
}

// ============ Task Operations ============

/**
 * Create a new task and submit to Seedance API
 */
export async function createTask(params: CreateTaskParams): Promise<Task> {
  const taskId = uuidv4();
  const now = new Date().toISOString().replace('T', ' ').split('.')[0];

  const mode = params.mode || 'text-to-video';
  const model = params.model || 'doubao-seedance-2-0-260128';

  const seedanceParams: SeedanceParams = {
    duration: params.duration,
    resolution: params.resolution,
    aspect_ratio: params.aspect_ratio,
    style: params.style,
    seed: params.seed,
    cfg_scale: params.cfg_scale,
    model,
    mode,
  };

  const referenceFiles = params.referenceFiles || [];
  const referenceFilesJson = JSON.stringify({
    referenceImages: params.referenceImages || [],
    referenceVideos: params.referenceVideos || [],
    referenceAudios: params.referenceAudios || [],
  });

  // Insert initial task record
  runQuery(
    `INSERT INTO tasks (id, prompt, status, progress, stage, duration, resolution, aspect_ratio, style, seed, cfg_scale, reference_files, model, mode, last_frame_file, reference_files_json, created_at, updated_at)
     VALUES (?, ?, 'pending', 0, 'submitting', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      taskId,
      params.prompt,
      params.duration || null,
      params.resolution || null,
      params.aspect_ratio || null,
      params.style || null,
      params.seed || null,
      params.cfg_scale || null,
      JSON.stringify(referenceFiles),
      model,
      mode,
      params.lastFrameFile || null,
      referenceFilesJson,
      now,
      now,
    ]
  );

  // Submit to Seedance API
  try {
    // Build file data for content
    console.log(`[Task] Building content: firstFrame=${referenceFiles[0] || 'none'}, lastFrame=${params.lastFrameFile || 'none'}, refImages=${params.referenceImages?.length || 0}, refVideos=${params.referenceVideos?.length || 0}, refAudios=${params.referenceAudios?.length || 0}`);
    const firstFrame = referenceFiles.length > 0 ? fileToBase64DataUrl(referenceFiles[0]) : undefined;
    const lastFrame = params.lastFrameFile ? fileToBase64DataUrl(params.lastFrameFile) : undefined;
    const refImages = (params.referenceImages || []).map((f: string) => fileToBase64DataUrl(f));
    const refVideos = (params.referenceVideos || []).map((f: string) => fileToBase64DataUrl(f));
    const refAudios = (params.referenceAudios || []).map((f: string) => fileToBase64DataUrl(f));

    const content = buildContent(mode, params.prompt, {
      firstFrame,
      lastFrame,
      referenceImages: refImages,
      referenceVideos: refVideos,
      referenceAudios: refAudios,
    }, model);

    const result = await submitGenerationTask(content, seedanceParams);

    if (result.success && result.engineTaskId) {
      runQuery(
        `UPDATE tasks SET engine_task_id = ?, status = 'processing', stage = 'queued', updated_at = ? WHERE id = ?`,
        [result.engineTaskId, now, taskId]
      );
    } else {
      runQuery(
        `UPDATE tasks SET status = 'failed', error_message = ?, stage = 'submit_failed', updated_at = ? WHERE id = ?`,
        [result.error || 'Failed to submit task', now, taskId]
      );
    }
  } catch (error: any) {
    runQuery(
      `UPDATE tasks SET status = 'failed', error_message = ?, stage = 'submit_error', updated_at = ? WHERE id = ?`,
      [error?.message || 'Unknown error', now, taskId]
    );
  }

  return getTask(taskId)!;
}

/**
 * Get a single task by ID
 */
export function getTask(taskId: string): Task | null {
  return getOne<Task>('SELECT * FROM tasks WHERE id = ?', [taskId]);
}

/**
 * List tasks with pagination and optional status filter
 */
export function listTasks(
  page: number = 1,
  limit: number = 20,
  status?: string
): TaskListResult {
  const offset = (page - 1) * limit;
  let whereClause = '';
  const params: unknown[] = [];

  if (status) {
    whereClause = 'WHERE status = ?';
    params.push(status);
  }

  const countResult = getOne<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM tasks ${whereClause}`,
    params
  );
  const total = countResult?.cnt || 0;

  const tasks = getAll<Task>(
    `SELECT * FROM tasks ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { tasks, total, page, limit };
}

/**
 * Delete a task
 */
export function deleteTask(taskId: string): boolean {
  const task = getTask(taskId);
  if (!task) return false;

  runQuery('DELETE FROM tasks WHERE id = ?', [taskId]);
  return true;
}

/**
 * Delete all failed tasks
 */
export function deleteFailedTasks(): number {
  const result = getOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM tasks WHERE status = 'failed'"
  );
  const count = result?.count || 0;
  if (count > 0) {
    runQuery("DELETE FROM tasks WHERE status = 'failed'");
  }
  return count;
}

/**
 * Poll task status from Volcengine and update local database
 */
export async function pollTaskStatus(taskId: string): Promise<Task | null> {
  const task = getTask(taskId);
  if (!task) return null;

  if (!['pending', 'processing'].includes(task.status)) {
    return task;
  }

  if (!task.engine_task_id) {
    return task;
  }

  try {
    const result = await queryTaskResult(task.engine_task_id, task.created_at);
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];

    if (result.success) {
      if (result.status === 'completed') {
        runQuery(
          `UPDATE tasks SET status = 'completed', progress = 100, stage = ?, video_url = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
          [result.stage || 'completed', result.videoUrl || '', now, now, taskId]
        );
      } else if (result.status === 'failed') {
        runQuery(
          `UPDATE tasks SET status = 'failed', error_message = ?, stage = 'failed', updated_at = ? WHERE id = ?`,
          [result.errorMessage || 'Task failed', now, taskId]
        );
      } else if (result.status === 'processing') {
        runQuery(
          `UPDATE tasks SET status = 'processing', progress = ?, stage = ?, updated_at = ? WHERE id = ?`,
          [result.progress || 0, result.stage || 'processing', now, taskId]
        );
      }
    } else {
      console.warn(`Poll failed for task ${taskId}: ${result.errorMessage}`);
    }
  } catch (error: any) {
    console.error(`Error polling task ${taskId}:`, error?.message || error);
  }

  return getTask(taskId);
}

/**
 * Poll all active tasks
 */
export async function pollAllActiveTasks(): Promise<number> {
  const activeTasks = getAll<Task>(
    `SELECT * FROM tasks WHERE status IN ('pending', 'processing') AND engine_task_id IS NOT NULL`
  );

  for (const task of activeTasks) {
    try {
      await pollTaskStatus(task.id);
    } catch (error) {
      console.error(`Failed to poll task ${task.id}:`, error);
    }
  }

  return activeTasks.length;
}
