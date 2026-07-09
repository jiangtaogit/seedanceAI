export type TaskStatus = 'queued' | 'processing' | 'completed' | 'failed';

// ============ 用户认证 ============

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

export interface AuthResponse {
  token: string;
  user: User;
}

// ============ 模型定义 ============

export interface ModelOption {
  id: string;           // Default model ID (used as key, replaced by endpointId at runtime)
  label: string;        // 显示名称
  description: string;  // 简短描述
  tier: 'flagship' | 'standard' | 'lightweight';
  supportedModes: string[];
  supportedResolutions: string[];
  // 详细信息
  details: {
    summary: string;        // 一句话亮点
    features: string[];     // 核心能力列表
    requirements: string[]; // 使用要求/限制
    maxDuration: number;    // 最大时长(秒)
    audio: boolean;         // 是否支持有声
    pricing: string;        // 定价描述
  };
}

/**
 * Model presets - these define the capabilities of each model.
 * At runtime, the actual `model` value sent to ARK API is the user's
 * Endpoint ID (ep-xxxxx), NOT the raw model name.
 * Users must create inference endpoints in ARK console first.
 */
export const MODELS: ModelOption[] = [
  {
    id: 'doubao-seedance-2-0-260128',
    label: 'Seedance 2.0',
    description: '旗舰模型，全模式，最高1080p',
    tier: 'flagship',
    supportedModes: ['text-to-video', 'image-to-video', 'image-to-video-both', 'multimodal-reference'],
    supportedResolutions: ['480p', '720p', '1080p'],
    details: {
      summary: '最强多模态视频生成，支持图文视频音频混合输入',
      features: [
        '多模态参考：最多9张图+3个视频+3段音频',
        '原生音画同步，口型毫秒级对齐',
        '角色一致性保持，复刻镜头运动',
        '支持有声/无声视频输出',
        '最长15秒，最高1080p/2K',
      ],
      requirements: [
        '需先在方舟控制台开通模型并创建推理接入点',
        '账户余额需 > 200元 或有资源包',
        '不支持含真人人脸的直接上传（需用授权素材）',
        '不可单独输入音频，至少1个视频或图片',
      ],
      maxDuration: 15,
      audio: true,
      pricing: '纯生成 ¥46/百万token，含视频 ¥28/百万token',
    },
  },
  {
    id: 'doubao-seedance-2-0-fast-260128',
    label: 'Seedance 2.0 Fast',
    description: '快速版本，文生/图生首帧',
    tier: 'standard',
    supportedModes: ['text-to-video', 'image-to-video'],
    supportedResolutions: ['480p', '720p'],
    details: {
      summary: '2.0加速版，速度快价格低，适合批量生成',
      features: [
        '文生视频 / 图生首帧视频',
        '生成速度约为标准版2倍',
        '最高720p，最长10秒',
        '价格较标准版低约20%',
      ],
      requirements: [
        '需先开通模型并创建推理接入点',
        '仅支持文生视频和图生首帧',
        '不支持首尾帧和多模态参考',
      ],
      maxDuration: 10,
      audio: true,
      pricing: '纯生成 ¥37/百万token，含视频 ¥22/百万token',
    },
  },
  {
    id: 'doubao-seedance-2-0-mini-260128',
    label: 'Seedance 2.0 Mini',
    description: '轻量版（暂不支持API，仅控制台体验）',
    tier: 'lightweight',
    supportedModes: ['text-to-video', 'image-to-video'],
    supportedResolutions: ['480p', '720p'],
    details: {
      summary: '轻量版，720p约¥0.5/秒，适合高频批量',
      features: [
        '性价比最高，单秒成本约0.5元',
        '文生视频 / 图生首帧视频',
        '最高720p',
      ],
      requirements: [
        '⚠ 暂不支持API调用，仅控制台体验',
        '预计后续开放API',
      ],
      maxDuration: 10,
      audio: true,
      pricing: '图生视频 ¥23/百万token，视频生视频 ¥14/百万token',
    },
  },
  {
    id: 'doubao-seedance-1-5-pro-250528',
    label: 'Seedance 1.5 Pro',
    description: '上一代专业版，支持首尾帧',
    tier: 'standard',
    supportedModes: ['text-to-video', 'image-to-video', 'image-to-video-both'],
    supportedResolutions: ['480p', '720p', '1080p'],
    details: {
      summary: '1.5代专业版，首尾帧生成，性价比较好',
      features: [
        '文生视频 / 图生首帧 / 首尾帧生成',
        '支持Draft样片功能生成高质量正式视频',
        '有声/无声两种输出模式',
        '最高1080p，最长12秒',
      ],
      requirements: [
        '需先开通模型并创建推理接入点',
        '不支持多模态参考（图片+视频+音频混合）',
        '首尾帧模式需上传首帧和尾帧图片',
      ],
      maxDuration: 12,
      audio: true,
      pricing: '有声 ¥16/百万token，无声 ¥8/百万token',
    },
  },
  {
    id: 'doubao-seedance-1-0-pro-250328',
    label: 'Seedance 1.0 Pro',
    description: '初代专业版',
    tier: 'standard',
    supportedModes: ['text-to-video', 'image-to-video', 'image-to-video-both'],
    supportedResolutions: ['480p', '720p', '1080p'],
    details: {
      summary: '初代专业版，功能完整，价格适中',
      features: [
        '文生视频 / 图生首帧 / 首尾帧生成',
        '最高1080p',
        '最长12秒',
      ],
      requirements: [
        '需先开通模型并创建推理接入点',
        '不支持多模态参考和有声输出',
        '画质较2.0有明显差距',
      ],
      maxDuration: 12,
      audio: false,
      pricing: '¥15/百万token',
    },
  },
  {
    id: 'doubao-seedance-1-0-pro-fast-250328',
    label: 'Seedance 1.0 Pro Fast',
    description: '初代快速版',
    tier: 'lightweight',
    supportedModes: ['text-to-video', 'image-to-video'],
    supportedResolutions: ['480p', '720p'],
    details: {
      summary: '最快最便宜，适合快速预览和大量生成',
      features: [
        '文生视频 / 图生首帧视频',
        '生成速度最快',
        '最高720p',
      ],
      requirements: [
        '需先开通模型并创建推理接入点',
        '仅支持文生和图生首帧',
        '画质和细节不如专业版',
      ],
      maxDuration: 10,
      audio: false,
      pricing: '¥4.2/百万token（最便宜）',
    },
  },
];

/**
 * Endpoint ID configuration - maps model preset IDs to user's Endpoint IDs.
 * Stored in api_config table as JSON.
 */
export interface ModelEndpoints {
  [modelId: string]: string; // model preset id → endpoint id (ep-xxxxx)
}

// ============ 生成模式 ============

export interface GenerationMode {
  value: string;
  label: string;
  description: string;
}

export const GENERATION_MODES: GenerationMode[] = [
  { value: 'text-to-video', label: '文生视频', description: '文字描述生成视频' },
  { value: 'image-to-video', label: '图生视频(首帧)', description: '首帧图片生成视频' },
  { value: 'image-to-video-both', label: '图生视频(首尾帧)', description: '首尾帧图片生成过渡视频' },
  { value: 'multimodal-reference', label: '多模态参考', description: '图片+视频+音频参考生成' },
];

// ============ 核心类型 ============

export interface Task {
  id: string;
  prompt: string;
  status: TaskStatus;
  progress: number;
  stage?: string;
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
  style?: string;
  cfgScale?: number;
  seed?: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  errorMsg?: string;
  model?: string;
  mode?: string;
  userId?: string;
  username?: string;
}

export interface CreateTaskParams {
  prompt: string;
  files?: UploadFile[];
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
  style?: string;
  cfgScale?: number;
  seed?: number;
  model?: string;
  mode?: string;
  lastFrameFile?: UploadFile;
  referenceImages?: UploadFile[];
  referenceVideos?: UploadFile[];
  referenceAudios?: UploadFile[];
}

export type FileRole = 'first_frame' | 'last_frame' | 'reference_image' | 'reference_video' | 'reference_audio';

export interface UploadFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  thumbnailUrl?: string;
  file?: File;
  role?: FileRole;
  refName?: string; // 用户自定义引用别名，用于提示词 @引用
}

export interface ApiConfig {
  apiKey: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  isConfigured: boolean;
  modelEndpoints: ModelEndpoints;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  status?: TaskStatus;
  search?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ============ 常量 ============

export const VIDEO_STYLES = [
  { value: 'default', label: '默认' },
  { value: 'cinematic', label: '电影感' },
  { value: 'anime', label: '动漫' },
  { value: 'realistic', label: '写实' },
  { value: 'cyberpunk', label: '赛博朋克' },
] as const;

export const ASPECT_RATIOS = [
  { value: '16:9', label: '16:9', width: 16, height: 9 },
  { value: '9:16', label: '9:16', width: 9, height: 16 },
  { value: '1:1', label: '1:1', width: 1, height: 1 },
] as const;

export const RESOLUTIONS = [
  { value: '480p', label: '480p' },
  { value: '720p', label: '720p' },
  { value: '1080p', label: '1080p' },
] as const;

export const DURATIONS = [
  { value: 5, label: '5秒' },
  { value: 10, label: '10秒' },
] as const;
