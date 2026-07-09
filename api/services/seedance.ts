/**
 * Volcengine Ark (方舟) Platform - Seedance API Service
 *
 * ARK REST API:
 * - Endpoint: POST https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
 * - Auth: Bearer <API_KEY>
 * - Doc: https://www.volcengine.com/docs/82379/1520757
 */
import axios, { type AxiosResponse } from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getOne } from '../database.js';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============ Types ============

interface ApiConfig {
  id: string;
  api_key: string | null;
  access_key_id: string | null;
  secret_access_key: string | null;
  endpoint: string;
  model_endpoints_json: string;
}

export interface SeedanceParams {
  duration?: number;
  resolution?: string;
  aspect_ratio?: string;
  style?: string;
  seed?: number;
  cfg_scale?: number;
  model?: string;
  mode?: string;
}

export interface SubmitTaskResult {
  success: boolean;
  engineTaskId?: string;
  error?: string;
}

export interface TaskQueryResult {
  success: boolean;
  status?: string;
  progress?: number;
  stage?: string;
  videoUrl?: string;
  errorMessage?: string;
}

export interface ContentItem {
  type: 'text' | 'image_url' | 'video_url' | 'audio_url';
  text?: string;
  image_url?: { url: string; role: string };
  video_url?: { url: string; role: string };
  audio_url?: { url: string; role: string };
}

// ============ Constants ============

const DEFAULT_ARK_ENDPOINT = 'https://ark.cn-beijing.volces.com';

// ============ Config Helpers ============

function getApiConfig(): ApiConfig {
  const config = getOne<ApiConfig>("SELECT * FROM api_config WHERE id = 'default'");
  if (!config) {
    throw new Error('API config not found. Please configure API settings first.');
  }
  return config;
}

function getArkBaseUrl(config: ApiConfig): string {
  if (config.endpoint && !config.endpoint.includes('volcengineapi.com')) {
    return config.endpoint.replace(/\/+$/, '');
  }
  return DEFAULT_ARK_ENDPOINT;
}

function getAuthHeader(config: ApiConfig): Record<string, string> {
  const apiKey = config.api_key || '';
  if (apiKey) {
    return { Authorization: `Bearer ${apiKey}` };
  }
  throw new Error('API Key is required. Please configure your ARK API Key in settings.');
}

// ============ Helper: convert local file to base64 data URL ============

const IMAGE_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'];
const VIDEO_EXTS = ['mp4', 'mov', 'avi', 'mkv', 'webm'];
const AUDIO_EXTS = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'];

function resolveFilePath(fileRef: string): string {
  // If it's already an absolute path that exists, use as-is
  if (path.isAbsolute(fileRef) && fs.existsSync(fileRef)) {
    return fileRef;
  }
  // If it's a server-uploaded filename (e.g., "uuid.jpg"), resolve from uploads dir
  const uploadsDir = path.resolve(__dirname, '..', '..', 'uploads');
  const fullPath = path.join(uploadsDir, fileRef);
  if (fs.existsSync(fullPath)) {
    return fullPath;
  }
  // If it's a relative path from project root
  const projectPath = path.resolve(__dirname, '..', '..', fileRef);
  if (fs.existsSync(projectPath)) {
    return projectPath;
  }
  // Return as-is (will cause ENOENT error with clear message)
  return fileRef;
}

function fileToBase64DataUrl(fileRef: string): string {
  const filePath = resolveFilePath(fileRef);
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: "${fileRef}". If this is a blob URL (blob:http://...), the file was not uploaded to the server. Please re-upload the file.`);
  }
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase().slice(1);
  const base64 = buffer.toString('base64');

  if (IMAGE_EXTS.includes(ext)) {
    const mimeMap: Record<string, string> = { jpg: 'jpeg', jpeg: 'jpeg', png: 'png', webp: 'webp', gif: 'gif', bmp: 'bmp', tiff: 'tiff' };
    return `data:image/${mimeMap[ext] || ext};base64,${base64}`;
  }
  if (VIDEO_EXTS.includes(ext)) {
    const mimeMap: Record<string, string> = { mp4: 'mp4', mov: 'quicktime', avi: 'x-msvideo', mkv: 'x-matroska', webm: 'webm' };
    return `data:video/${mimeMap[ext] || ext};base64,${base64}`;
  }
  if (AUDIO_EXTS.includes(ext)) {
    const mimeMap: Record<string, string> = { mp3: 'mpeg', wav: 'wav', m4a: 'mp4', aac: 'aac', ogg: 'ogg', flac: 'flac' };
    return `data:audio/${mimeMap[ext] || ext};base64,${base64}`;
  }
  return `data/application/octet-stream;base64,${base64}`;
}

// ============ Build Content by Mode ============

export function buildContent(
  mode: string,
  prompt: string,
  files: {
    firstFrame?: string;
    lastFrame?: string;
    referenceImages?: string[];
    referenceVideos?: string[];
    referenceAudios?: string[];
  },
  model?: string
): ContentItem[] {
  const content: ContentItem[] = [];

  // Models that support multimodal-reference mode
  const MULTIMODAL_MODELS = [
    'doubao-seedance-2-0-260128',
    'doubao-seedance-2-0-fast-260128',
  ];

  // If mode is multimodal-reference but model doesn't support it, downgrade
  let effectiveMode = mode;
  if (mode === 'multimodal-reference' && model && !MULTIMODAL_MODELS.includes(model)) {
    console.log(`[Seedance] Model "${model}" does not support multimodal-reference, downgrading to image-to-video`);
    effectiveMode = 'image-to-video';
  }

  switch (effectiveMode) {
    case 'text-to-video':
      content.push({ type: 'text', text: prompt });
      break;

    case 'image-to-video':
      // In image-to-video mode, treat reference_images as first_frame if no explicit firstFrame
      if (files.firstFrame) {
        content.push({ type: 'image_url', image_url: { url: files.firstFrame, role: 'first_frame' } });
      } else if ((files.referenceImages || []).length > 0) {
        // Downgrade: first reference image becomes first_frame
        content.push({ type: 'image_url', image_url: { url: files.referenceImages![0], role: 'first_frame' } });
      }
      if (prompt) content.push({ type: 'text', text: prompt });
      break;

    case 'image-to-video-both':
      if (files.firstFrame) {
        content.push({ type: 'image_url', image_url: { url: files.firstFrame, role: 'first_frame' } });
      }
      if (files.lastFrame) {
        content.push({ type: 'image_url', image_url: { url: files.lastFrame, role: 'last_frame' } });
      }
      if (prompt) content.push({ type: 'text', text: prompt });
      break;

    case 'multimodal-reference':
      for (const img of (files.referenceImages || []).slice(0, 9)) {
        content.push({ type: 'image_url', image_url: { url: img, role: 'reference_image' } });
      }
      for (const vid of (files.referenceVideos || []).slice(0, 3)) {
        content.push({ type: 'video_url', video_url: { url: vid, role: 'reference_video' } });
      }
      for (const aud of (files.referenceAudios || []).slice(0, 3)) {
        content.push({ type: 'audio_url', audio_url: { url: aud, role: 'reference_audio' } });
      }
      if (prompt) content.push({ type: 'text', text: prompt });
      break;

    default:
      content.push({ type: 'text', text: prompt });
  }

  return content;
}

// ============ Unified Submit Function ============

export async function submitGenerationTask(
  content: ContentItem[],
  params: SeedanceParams = {}
): Promise<SubmitTaskResult> {
  try {
    const config = getApiConfig();
    const baseUrl = getArkBaseUrl(config);

    // Resolve model: prefer Endpoint ID from modelEndpoints config, fallback to raw model ID
    const rawModelId = params.model || 'doubao-seedance-2-0-260128';
    let modelId = rawModelId;
    try {
      const endpointsJson = config.model_endpoints_json || '{}';
      const endpoints = JSON.parse(endpointsJson);
      if (endpoints[rawModelId]) {
        modelId = endpoints[rawModelId];
        // Validate Endpoint ID format before using it
        if (!/^ep-\d+-[a-z0-9]+$/i.test(modelId.trim())) {
          let hint = '格式应为 ep-YYYYMMDDHHMMSS-xxxxx（如 ep-20260708174947-4xznj）';
          if (/^ep-m-/i.test(modelId.trim())) hint = '这是模型ID，不是推理接入点ID！请在方舟控制台→推理接入点中获取正确的Endpoint ID';
          else if (/^doubao-/i.test(modelId.trim())) hint = '这是模型名称，不是Endpoint ID！';
          console.error(`[Seedance] Invalid Endpoint ID format: ${modelId} — ${hint}`);
          return { success: false, error: `Endpoint ID 格式不正确："${modelId}"\n${hint}\n请在 设置 → 模型接入点 中修正。` };
        }
        console.log(`[Seedance] Model resolved: ${rawModelId} → ${modelId}`);
      } else {
        console.log(`[Seedance] No Endpoint ID for model "${rawModelId}", using raw model ID. Available endpoints: ${Object.keys(endpoints).join(', ')}`);
      }
    } catch (e) { console.log(`[Seedance] Failed to parse model_endpoints_json:`, e); }

    // ARK API: duration, resolution, ratio, seed etc. are TOP-LEVEL params (not nested in "parameters")
    // See: https://www.volcengine.com/docs/82379/1520757
    const requestBody: Record<string, unknown> = {
      model: modelId,
      content,
      duration: params.duration || 5,
      resolution: params.resolution || '720p',
      ratio: params.aspect_ratio || '16:9',
      seed: params.seed !== undefined ? params.seed : -1,
      generate_audio: true,
      watermark: false,
    };

    console.log(`[Seedance] Request body (excluding content):`, JSON.stringify({ model: modelId, duration: requestBody.duration, resolution: requestBody.resolution, ratio: requestBody.ratio, seed: requestBody.seed, generate_audio: requestBody.generate_audio, watermark: requestBody.watermark }));

    const url = `${baseUrl}/api/v3/contents/generations/tasks`;
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeader(config),
    };

    console.log(`[Seedance] Submitting task (model=${modelId}, contentItems=${content.length}, duration=${params.duration}, resolution=${params.resolution}, aspect_ratio=${params.aspect_ratio})`);

    const response: AxiosResponse = await axios.post(url, requestBody, { headers, timeout: 60000 });
    const data = response.data;

    // ARK API returns: { id: "task_id", model: "...", status: "...", ... }
    if (data?.id) {
      return { success: true, engineTaskId: String(data.id) };
    }
    // Error response: { code: 4xx, message: "..." }
    if (data?.code && data.code >= 400) {
      return { success: false, error: data?.message || `API error code ${data.code}` };
    }
    return { success: false, error: data?.message || data?.msg || 'Unexpected ARK response' };
  } catch (error: any) {
    console.error('submitGenerationTask error:', error?.response?.data || error?.message || error);
    return {
      success: false,
      error: error?.response?.data?.message || error?.response?.data?.error?.message || error?.message || 'Failed to submit task',
    };
  }
}

// ============ Backward-compatible wrappers ============

/** @deprecated Use submitGenerationTask + buildContent instead */
export async function submitTextToVideo(
  prompt: string,
  params: SeedanceParams = {}
): Promise<SubmitTaskResult> {
  const content = buildContent('text-to-video', prompt, {});
  return submitGenerationTask(content, params);
}

/** @deprecated Use submitGenerationTask + buildContent instead */
export async function submitImageToVideo(
  imageBase64: string,
  prompt: string,
  params: SeedanceParams = {},
  referenceFiles: string[] = []
): Promise<SubmitTaskResult> {
  const refImages: string[] = [];
  for (const filePath of referenceFiles) {
    if (fs.existsSync(filePath)) {
      refImages.push(fileToBase64DataUrl(filePath));
    }
  }
  const content = buildContent('image-to-video', prompt, {
    firstFrame: imageBase64 || undefined,
    referenceImages: refImages,
  });
  return submitGenerationTask(content, params);
}

// ============ Query Task Result ============

/**
 * Estimate progress based on elapsed time since task creation.
 * ARK API does not return a progress field, so we simulate it.
 *
 * Typical Seedance generation times:
 * - 5s video: ~30-60s total
 * - 10s video: ~60-120s total
 *
 * We use a conservative 90s estimate and a smooth curve that
 * approaches but never reaches 95% (reserved for completion).
 */
function estimateProgress(createdAt: string | undefined): number {
  if (!createdAt) return 30; // fallback if no timestamp

  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const elapsedSec = Math.max(0, (now - created) / 1000);

  // Estimated total time: 90 seconds (conservative average)
  const estimatedTotalSec = 90;

  // Use a smooth curve: progress = 95 * (1 - e^(-3t/T))
  // This gives: ~10% at 3s, ~30% at 10s, ~55% at 20s, ~78% at 40s, ~90% at 60s, ~94% at 90s
  const ratio = elapsedSec / estimatedTotalSec;
  const estimatedProgress = 95 * (1 - Math.exp(-3 * ratio));

  return Math.min(Math.round(estimatedProgress), 95);
}

export async function queryTaskResult(
  engineTaskId: string,
  createdAt?: string
): Promise<TaskQueryResult> {
  try {
    const config = getApiConfig();
    const baseUrl = getArkBaseUrl(config);

    const url = `${baseUrl}/api/v3/contents/generations/tasks/${engineTaskId}`;
    const headers = getAuthHeader(config);

    const response: AxiosResponse = await axios.get(url, { headers, timeout: 15000 });
    const data = response.data;

    console.log(`[Seedance] queryTaskResult raw response:`, JSON.stringify(data, null, 2).substring(0, 2000));

    const arkStatus = data?.status || '';
    let status = 'pending';
    let progress = 0;
    let stage = '';
    let videoUrl = '';
    let errorMessage = '';

    if (arkStatus === 'queued') {
      status = 'queued'; progress = 10; stage = 'queued';
    } else if (arkStatus === 'running' || arkStatus === 'processing') {
      status = 'processing';
      progress = data?.progress || estimateProgress(createdAt);
      stage = data?.stage || 'processing';
    } else if (arkStatus === 'succeeded' || arkStatus === 'success') {
      status = 'completed'; progress = 100; stage = 'completed';
      // ARK query response format: { content: { video_url: "https://..." } }
      videoUrl = data?.content?.video_url || '';
      // Fallback: also check output.content[] for older API versions
      if (!videoUrl) {
        const output = data?.output || {};
        const contentItems = output?.content || [];
        const videoItem = contentItems.find((c: any) => c.type === 'video_url' || c.video_url);
        videoUrl = videoItem?.video_url || output?.video_url || '';
      }
      console.log(`[Seedance] Video URL extracted: ${videoUrl || '(empty)'}`);
    } else if (arkStatus === 'failed' || arkStatus === 'error') {
      status = 'failed';
      errorMessage = data?.error_message || data?.error?.message || data?.message || data?.reason || 'Task failed';
    } else if (arkStatus === 'cancelled') {
      status = 'failed'; errorMessage = '任务已取消';
    }

    return { success: true, status, progress, stage, videoUrl, errorMessage };
  } catch (error: any) {
    console.error('queryTaskResult error:', error?.response?.data || error?.message || error);
    return {
      success: false,
      errorMessage: error?.response?.data?.message || error?.response?.data?.error?.message || error?.message || 'Failed to query task result',
    };
  }
}

// ============ Test Connection ============

export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getApiConfig();
    if (!config.api_key && !config.access_key_id) {
      return { success: false, error: 'API Key 未配置。请在设置页面填入火山方舟 API Key。' };
    }

    const baseUrl = getArkBaseUrl(config);
    const url = `${baseUrl}/api/v3/contents/generations/tasks?limit=1`;
    const headers = { ...getAuthHeader(config) };

    const response = await axios.get(url, { headers, timeout: 10000 });
    return { success: true };
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      return { success: false, error: `认证失败(${status}): API Key 无效或已过期，请检查设置` };
    }
    if (status >= 400 && status < 500) {
      return { success: true };
    }
    return { success: false, error: error.message || '连接失败' };
  }
}

// ============ Helpers ============

function mapAspectRatio(ratio: string): string {
  const map: Record<string, string> = {
    '16:9': '16:9', '9:16': '9:16', '1:1': '1:1',
    '4:3': '4:3', '3:4': '3:4', '21:9': '21:9', 'adaptive': 'adaptive',
  };
  return map[ratio] || 'adaptive';
}

export { fileToBase64DataUrl };
 
 
