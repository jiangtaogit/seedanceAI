/**
 * Seedance Token 估算 & 费用计算
 *
 * 基于: https://www.volcengine.com/docs/82379/1544106
 * 公式:
 *   Seedance 2.0 / 2.0-fast: tokens = (输入视频时长 + 输出视频时长) × 宽 × 高 × 帧率 / 1024
 *   Seedance 1.x:             tokens = 宽 × 高 × 帧率 × 时长 / 1024
 *   费用 = tokens × 单价(元/百万token)
 */

// ============ 分辨率 → 像素尺寸映射 ============
const RESOLUTION_MAP: Record<string, Record<string, { w: number; h: number }>> = {
  '480p': {
    '16:9': { w: 854, h: 480 },
    '9:16': { w: 480, h: 854 },
    '1:1':  { w: 480, h: 480 },
  },
  '720p': {
    '16:9': { w: 1280, h: 720 },
    '9:16': { w: 720, h: 1280 },
    '1:1':  { w: 720, h: 720 },
  },
  '1080p': {
    '16:9': { w: 1920, h: 1080 },
    '9:16': { w: 1080, h: 1920 },
    '1:1':  { w: 1080, h: 1080 },
  },
};

const FRAME_RATE = 24; // Seedance 默认 24fps

// ============ 模型单价 (元/百万token) ============
interface PricingInfo {
  pricePerMillion: number;  // 在线推理单价
  label: string;            // 计费描述
}

const MODEL_PRICING: Record<string, (hasVideoInput: boolean) => PricingInfo> = {
  'doubao-seedance-2-0-260128': (hasVideo) => ({
    pricePerMillion: hasVideo ? 28.00 : 46.00,
    label: hasVideo ? '含视频输入 ¥28/百万token' : '纯生成 ¥46/百万token',
  }),
  'doubao-seedance-2-0-fast-260128': (hasVideo) => ({
    pricePerMillion: hasVideo ? 22.00 : 37.00,
    label: hasVideo ? '含视频输入 ¥22/百万token' : '纯生成 ¥37/百万token',
  }),
  'doubao-seedance-2-0-mini-260128': () => ({
    pricePerMillion: 0, // 暂不支持API
    label: '暂不支持API',
  }),
  'doubao-seedance-1-5-pro-250528': () => ({
    pricePerMillion: 16.00, // 有声(默认)
    label: '有声 ¥16/百万token',
  }),
  'doubao-seedance-1-0-pro-250328': () => ({
    pricePerMillion: 15.00,
    label: '¥15/百万token',
  }),
  'doubao-seedance-1-0-pro-fast-250328': () => ({
    pricePerMillion: 4.20,
    label: '¥4.2/百万token',
  }),
};

// ============ 导出接口 ============

export interface CostEstimate {
  tokens: number;          // 预估 token 数量
  costYuan: number;        // 预估费用 (元)
  priceLabel: string;      // 单价描述
  isAvailable: boolean;    // 是否可计算
}

/**
 * 计算预估 Token 数量和费用
 */
export function estimateCost(
  model: string,
  resolution: string,
  aspectRatio: string,
  durationSeconds: number,
  hasVideoInput: boolean = false,
  inputVideoDuration: number = 0,
): CostEstimate {
  // 获取像素尺寸
  const dims = RESOLUTION_MAP[resolution]?.[aspectRatio];
  if (!dims) {
    return { tokens: 0, costYuan: 0, priceLabel: '未知配置', isAvailable: false };
  }

  // 获取定价
  const pricingFn = MODEL_PRICING[model];
  if (!pricingFn) {
    return { tokens: 0, costYuan: 0, priceLabel: '未知模型', isAvailable: false };
  }

  const pricing = pricingFn(hasVideoInput);
  if (pricing.pricePerMillion === 0) {
    return { tokens: 0, costYuan: 0, priceLabel: pricing.label, isAvailable: false };
  }

  // 计算 tokens
  let tokens: number;
  const isV2 = model.includes('2-0');

  if (isV2) {
    // Seedance 2.0: tokens = (输入视频时长 + 输出视频时长) × 宽 × 高 × 帧率 / 1024
    tokens = ((inputVideoDuration + durationSeconds) * dims.w * dims.h * FRAME_RATE) / 1024;

    // 最低 token 限制 (含视频输入时)
    if (hasVideoInput) {
      const minTokens = getMinTokensV2(resolution, durationSeconds);
      if (tokens < minTokens) tokens = minTokens;
    }
  } else {
    // Seedance 1.x: tokens = 宽 × 高 × 帧率 × 时长 / 1024
    tokens = (dims.w * dims.h * FRAME_RATE * durationSeconds) / 1024;
  }

  // 计算费用
  const costYuan = (tokens / 1_000_000) * pricing.pricePerMillion;

  return {
    tokens: Math.round(tokens),
    costYuan: Math.round(costYuan * 100) / 100, // 保留2位小数
    priceLabel: pricing.label,
    isAvailable: true,
  };
}

/**
 * Seedance 2.0 含视频输入时的最低 token 用量限制
 */
function getMinTokensV2(resolution: string, duration: number): number {
  // 简化查表 — 使用线性插值
  const minTokenTable: Record<string, Record<number, number>> = {
    '480p': {
      4: 70308, 5: 90396, 6: 100440, 7: 120528, 8: 140616,
      9: 150660, 10: 170748, 11: 190836, 12: 200880,
      13: 220968, 14: 241056, 15: 251100,
    },
    '720p': {
      4: 151200, 5: 194400, 6: 216000, 7: 259200, 8: 302400,
      9: 324000, 10: 367200, 11: 410400, 12: 432000,
      13: 475200, 14: 518400, 15: 540000,
    },
  };

  const table = minTokenTable[resolution];
  if (!table) return 0;

  // 直接查找
  if (table[duration]) return table[duration];

  // 线性插值
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  const lower = keys.filter((k) => k <= duration).pop();
  const upper = keys.filter((k) => k >= duration).shift();
  if (lower !== undefined && upper !== undefined && lower !== upper) {
    const ratio = (duration - lower) / (upper - lower);
    return Math.round(table[lower] + ratio * (table[upper] - table[lower]));
  }
  if (lower !== undefined) return table[lower];

  return 0;
}

/**
 * 格式化 token 数量为可读字符串
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}
