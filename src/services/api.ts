import axios from 'axios';
import type { Task, CreateTaskParams, ApiConfig, PaginatedResult, PaginationParams, TaskStatus, User, AuthResponse } from '@/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ============ Token Interceptors ============

// Request interceptor: attach JWT token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: unwrap { success, data, error } + handle 401
api.interceptors.response.use(
  (res) => {
    const body = res.data;
    if (body && body.success === false) {
      return Promise.reject(new Error(body.error || '请求失败'));
    }
    return body;
  },
  (err) => {
    // Handle 401 — token expired or invalid
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }
    const msg = err.response?.data?.error || err.response?.data?.message || err.message || '请求失败';
    return Promise.reject(new Error(msg));
  }
);

// ============ Auth APIs ============

export async function login(username: string, password: string): Promise<AuthResponse> {
  const res: any = await api.post('/auth/login', { username, password });
  const data = res.data || res;
  return {
    token: data.token,
    user: data.user,
  };
}

export async function register(username: string, password: string): Promise<AuthResponse> {
  const res: any = await api.post('/auth/register', { username, password });
  const data = res.data || res;
  return {
    token: data.token,
    user: data.user,
  };
}

export async function getCurrentUser(): Promise<User> {
  const res: any = await api.get('/auth/me');
  const data = res.data || res;
  return {
    id: data.id,
    username: data.username,
    role: data.role,
  };
}

export function logout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.patch('/auth/change-password', { currentPassword, newPassword });
}

// ============ Task APIs ============

export async function createTask(params: CreateTaskParams): Promise<{ taskId: string; status: string }> {
  // Convert camelCase to snake_case for backend
  const body: Record<string, unknown> = {
    prompt: params.prompt,
    duration: params.duration,
    resolution: params.resolution,
    aspect_ratio: params.aspectRatio,
    style: params.style,
    cfg_scale: params.cfgScale,
    seed: params.seed,
    model: params.model,
    mode: params.mode,
    lastFrameFile: params.lastFrameFile?.url,
    referenceImages: (params.referenceImages || []).map((f) => f.url),
    referenceVideos: (params.referenceVideos || []).map((f) => f.url),
    referenceAudios: (params.referenceAudios || []).map((f) => f.url),
  };
  // Include referenceFiles from files array for backward compat
  if (params.files && params.files.length > 0) {
    body.referenceFiles = params.files.map((f) => f.url);
  }
  const res: any = await api.post('/tasks/create', body);
  const taskData = res.data || res;
  return { taskId: taskData.id, status: taskData.status };
}

export async function getTasks(params: PaginationParams): Promise<PaginatedResult<Task>> {
  const query: Record<string, string> = {
    page: String(params.page || 1),
    limit: String(params.pageSize || 20),
  };
  if (params.status && (params.status as string) !== 'all') query.status = params.status;
  if (params.search) query.search = params.search;
  return api.get('/tasks', { params: query }).then((res: any) => {
    const data = res.data || res;
    return {
      items: (data.tasks || []).map(mapTaskFromBackend),
      total: data.total || 0,
      page: data.page || 1,
      pageSize: data.limit || 20,
    };
  });
}

export async function getTask(id: string): Promise<Task> {
  return api.get(`/tasks/${id}`).then((res: any) => mapTaskFromBackend(res.data || res));
}

export async function deleteTask(id: string): Promise<void> {
  return api.delete(`/tasks/${id}`);
}

export async function deleteFailedTasks(): Promise<{ deletedCount: number }> {
  return api.delete('/tasks/failed');
}

export async function cancelTask(id: string): Promise<Task> {
  const res: any = await api.post(`/tasks/${id}/poll`);
  return mapTaskFromBackend(res.data || res);
}

// ============ Config APIs ============

export async function getConfig(): Promise<ApiConfig> {
  return api.get('/config').then((res: any) => {
    const data = res.data || res;
    return {
      apiKey: data.api_key || '',
      accessKeyId: data.access_key_id || '',
      secretAccessKey: data.secret_access_key || '',
      endpoint: data.endpoint || 'https://ark.cn-beijing.volces.com',
      isConfigured: !!(data.hasApiKey || (data.hasAccessKey && data.hasSecretKey)),
      modelEndpoints: data.modelEndpoints || {},
    };
  });
}

export async function saveConfig(config: ApiConfig): Promise<ApiConfig> {
  // Convert camelCase to snake_case for backend
  // Only include fields that are explicitly provided (skip undefined to avoid overwriting secrets)
  const body: Record<string, unknown> = {};
  if ('apiKey' in config && config.apiKey !== undefined && !String(config.apiKey).includes('****')) {
    body.api_key = config.apiKey;
  }
  if ('accessKeyId' in config && config.accessKeyId !== undefined && !String(config.accessKeyId).includes('****')) {
    body.access_key_id = config.accessKeyId;
  }
  if ('secretAccessKey' in config && config.secretAccessKey !== undefined && !String(config.secretAccessKey).includes('****')) {
    body.secret_access_key = config.secretAccessKey;
  }
  if (config.endpoint) {
    body.endpoint = config.endpoint;
  }
  if (config.modelEndpoints && Object.keys(config.modelEndpoints).length > 0) {
    body.modelEndpoints = config.modelEndpoints;
  }

  return api.post('/config', body).then((res: any) => {
    const data = res.data || res;
    return {
      apiKey: data.api_key || '',
      accessKeyId: data.access_key_id || '',
      secretAccessKey: data.secret_access_key || '',
      endpoint: data.endpoint || 'https://ark.cn-beijing.volces.com',
      isConfigured: !!(data.hasApiKey || (data.hasAccessKey && data.hasSecretKey)),
      modelEndpoints: data.modelEndpoints || {},
    };
  });
}

export async function testConnection(_config?: ApiConfig): Promise<{ success: boolean; message: string }> {
  try {
    const res = await api.post('/config/test');
    const data = (res as any).data || res;
    return {
      success: !!data.connected,
      message: data.connected ? '连接成功！火山引擎 API 可访问' : '连接失败',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || '连接失败',
    };
  }
}

// ============ Upload APIs ============

export async function uploadFile(file: File): Promise<{ fileId: string; fileName: string; fileSize: number; fileType: string; previewUrl: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res: any = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  // Interceptor returns { success, data }, unwrap to get actual file data
  const data = res.data || res;
  return data;
}

// ============ Polling ============

export function pollTask(id: string, onUpdate: (task: Task) => void, interval = 3000): () => void {
  let active = true;
  const poll = async () => {
    if (!active) return;
    try {
      const task = await getTask(id);
      onUpdate(task);
      if (task.status === 'completed' || task.status === 'failed') {
        active = false;
        return;
      }
    } catch {
      // ignore polling errors
    }
    if (active) setTimeout(poll, interval);
  };
  poll();
  return () => { active = false; };
}

// ============ Mappers ============

function mapTaskFromBackend(data: Record<string, unknown>): Task {
  return {
    id: String(data.id || ''),
    prompt: String(data.prompt || ''),
    status: (data.status as TaskStatus) || 'queued',
    progress: Number(data.progress || 0),
    stage: data.stage ? String(data.stage) : undefined,
    duration: data.duration ? Number(data.duration) : undefined,
    resolution: data.resolution ? String(data.resolution) : undefined,
    aspectRatio: data.aspect_ratio ? String(data.aspect_ratio) : (data.aspectRatio ? String(data.aspectRatio) : undefined),
    style: data.style ? String(data.style) : undefined,
    cfgScale: data.cfg_scale ? Number(data.cfg_scale) : (data.cfgScale ? Number(data.cfgScale) : undefined),
    seed: data.seed ? Number(data.seed) : undefined,
    videoUrl: data.video_url ? String(data.video_url) : (data.videoUrl ? String(data.videoUrl) : undefined),
    thumbnailUrl: undefined,
    createdAt: String(data.created_at || data.createdAt || ''),
    updatedAt: String(data.updated_at || data.updatedAt || ''),
    errorMsg: data.error_message ? String(data.error_message) : (data.errorMsg ? String(data.errorMsg) : undefined),
    model: data.model ? String(data.model) : undefined,
    mode: data.mode ? String(data.mode) : undefined,
    userId: data.user_id ? String(data.user_id) : (data.userId ? String(data.userId) : undefined),
    username: data.username ? String(data.username) : undefined,
  };
}
