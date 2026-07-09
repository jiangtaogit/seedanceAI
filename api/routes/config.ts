/**
 * Config Routes
 * GET /api/config - Get current config (API key masked)
 * POST /api/config - Save API config
 * POST /api/config/test - Test API connection
 */
import { Router, type Request, type Response } from 'express';
import { getOne, runQuery } from '../database.js';
import { testConnection } from '../services/seedance.js';

const router = Router();

// ============ Endpoint ID Validation ============

/**
 * Validate ARK Endpoint ID format.
 * Correct format: ep-YYYYMMDDHHMMSS-xxxxx (e.g., ep-20260708174947-4xznj)
 * Common mistakes: ep-m-xxx (model ID), doubao-xxx (model name)
 */
const ENDPOINT_ID_REGEX = /^ep-\d+-[a-z0-9]+$/i;

function validateEndpointIds(modelEndpoints: Record<string, string>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const [modelId, epId] of Object.entries(modelEndpoints)) {
    if (!epId || !epId.trim()) continue; // empty is ok
    if (!ENDPOINT_ID_REGEX.test(epId.trim())) {
      let hint = '格式应为 ep-YYYYMMDDHHMMSS-xxxxx';
      if (/^ep-m-/i.test(epId.trim())) hint = '这是模型ID，不是推理接入点ID！请在方舟控制台→推理接入点获取';
      else if (/^doubao-/i.test(epId.trim())) hint = '这是模型名称，不是Endpoint ID';
      errors.push(`${modelId}: "${epId}" — ${hint}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

// ============ Types ============

interface ApiConfig {
  id: string;
  api_key: string | null;
  access_key_id: string | null;
  secret_access_key: string | null;
  endpoint: string;
  model_endpoints_json: string;
  updated_at: string;
}

interface MaskedConfig {
  api_key: string | null;
  access_key_id: string | null;
  secret_access_key: string | null;
  endpoint: string;
  modelEndpoints: Record<string, string>;
  hasApiKey: boolean;
  hasAccessKey: boolean;
  hasSecretKey: boolean;
  updated_at: string;
}

function maskSecret(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 8) return '****';
  return value.substring(0, 4) + '****' + value.substring(value.length - 4);
}

function parseModelEndpoints(json: string | null | undefined): Record<string, string> {
  if (!json) return {};
  try { return JSON.parse(json); } catch { return {}; }
}

/**
 * GET /api/config
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const config = getOne<ApiConfig>("SELECT * FROM api_config WHERE id = 'default'");
    if (!config) { res.status(404).json({ success: false, error: 'Configuration not found' }); return; }

    const masked: MaskedConfig = {
      api_key: maskSecret(config.api_key),
      access_key_id: maskSecret(config.access_key_id),
      secret_access_key: maskSecret(config.secret_access_key),
      endpoint: config.endpoint,
      modelEndpoints: parseModelEndpoints(config.model_endpoints_json),
      hasApiKey: !!config.api_key,
      hasAccessKey: !!config.access_key_id,
      hasSecretKey: !!config.secret_access_key,
      updated_at: config.updated_at,
    };
    res.json({ success: true, data: masked });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to get config' });
  }
});

/**
 * POST /api/config
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { api_key, access_key_id, secret_access_key, endpoint, modelEndpoints } = req.body;
    const now = new Date().toISOString().replace('T', ' ').split('.')[0];
    const existing = getOne<ApiConfig>("SELECT * FROM api_config WHERE id = 'default'");

    if (existing) {
      const updates: string[] = [];
      const params: unknown[] = [];

      if (api_key !== undefined && api_key !== null && !api_key.includes('****')) {
        updates.push('api_key = ?'); params.push(api_key || null);
      }
      if (access_key_id !== undefined && access_key_id !== null && !access_key_id.includes('****')) {
        updates.push('access_key_id = ?'); params.push(access_key_id || null);
      }
      if (secret_access_key !== undefined && secret_access_key !== null && !secret_access_key.includes('****')) {
        updates.push('secret_access_key = ?'); params.push(secret_access_key || null);
      }
      if (endpoint !== undefined) {
        updates.push('endpoint = ?'); params.push(endpoint || 'https://ark.cn-beijing.volces.com');
      }
      if (modelEndpoints !== undefined) {
        // Validate Endpoint ID format
        const validation = validateEndpointIds(modelEndpoints);
        if (!validation.valid) {
          res.status(400).json({
            success: false,
            error: `Endpoint ID 格式不正确：\n${validation.errors.join('\n')}\n正确格式：ep-YYYYMMDDHHMMSS-xxxxx（如 ep-20260708174947-4xznj）`,
          });
          return;
        }
        updates.push('model_endpoints_json = ?'); params.push(JSON.stringify(modelEndpoints));
      }

      updates.push('updated_at = ?'); params.push(now);

      if (updates.length > 1) {
        runQuery(`UPDATE api_config SET ${updates.join(', ')} WHERE id = 'default'`, params);
      }
    } else {
      runQuery(
        `INSERT INTO api_config (id, api_key, access_key_id, secret_access_key, endpoint, model_endpoints_json, updated_at)
         VALUES ('default', ?, ?, ?, ?, ?, ?)`,
        [api_key || null, access_key_id || null, secret_access_key || null,
         endpoint || 'https://ark.cn-beijing.volces.com',
         JSON.stringify(modelEndpoints || {}), now]
      );
    }

    const updated = getOne<ApiConfig>("SELECT * FROM api_config WHERE id = 'default'");
    const masked: MaskedConfig = {
      api_key: maskSecret(updated?.api_key || null),
      access_key_id: maskSecret(updated?.access_key_id || null),
      secret_access_key: maskSecret(updated?.secret_access_key || null),
      endpoint: updated?.endpoint || 'https://ark.cn-beijing.volces.com',
      modelEndpoints: parseModelEndpoints(updated?.model_endpoints_json),
      hasApiKey: !!updated?.api_key,
      hasAccessKey: !!updated?.access_key_id,
      hasSecretKey: !!updated?.secret_access_key,
      updated_at: updated?.updated_at || now,
    };
    res.json({ success: true, data: masked });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to save config' });
  }
});

/**
 * POST /api/config/test
 */
router.post('/test', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await testConnection();
    res.json({ success: result.success, data: { connected: result.success }, error: result.error });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Connection test failed' });
  }
});

export default router;
