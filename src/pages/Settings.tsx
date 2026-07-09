import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Save, Wifi, WifiOff, Loader2, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import { showAlert } from '@/components/AlertModal';
import { useStore } from '@/store/useStore';
import { saveConfig, testConnection, getConfig } from '@/services/api';
import type { ApiConfig, ModelEndpoints } from '@/types';
import { MODELS } from '@/types';

/**
 * Validate Endpoint ID format.
 * Standard ARK format: ep-YYYYMMDDHHMMSS-xxxxx (e.g., ep-20260708174947-4xznj)
 * Invalid: ep-m-xxx (model ID, not endpoint ID), raw model names, etc.
 */
function isValidEndpointId(value: string): boolean {
  if (!value.trim()) return true; // empty is ok (not configured)
  // ARK Endpoint ID format: ep-YYYYMMDDHHMMSS-xxxxx (e.g., ep-20260708174947-4xznj)
  return /^ep-\d+-[a-z0-9]+$/i.test(value.trim());
}

function getEndpointIdHint(value: string): { ok: boolean; msg: string } | null {
  if (!value.trim()) return null;
  if (isValidEndpointId(value)) return { ok: true, msg: '格式正确' };
  if (/^ep-m-/i.test(value.trim())) return { ok: false, msg: '这是模型ID，不是推理接入点ID！请在方舟控制台→推理接入点中获取' };
  if (/^doubao-/i.test(value.trim())) return { ok: false, msg: '这是模型名称，不是Endpoint ID！需要填 ep-xxxx 格式的推理接入点ID' };
  return { ok: false, msg: '格式不对，应为 ep-YYYYMMDDHHMMSS-xxxxx（如 ep-20260708174947-4xznj）' };
}

export default function Settings() {
  const { config, setConfig } = useStore();
  const [form, setForm] = useState<ApiConfig>(config);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Track which fields the user has actually edited (vs loaded masked values)
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());

  // Load config from server on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const serverConfig = await getConfig();
        setConfig(serverConfig);
        setForm(serverConfig);
      } catch {
        // Use store config as fallback
      }
    };
    loadConfig();
  }, []);

  const handleFieldChange = (field: keyof ApiConfig, value: string) => {
    setForm({ ...form, [field]: value });
    setDirtyFields((prev) => new Set(prev).add(field));
  };

  /**
   * Build save payload: only include fields that were actually edited.
   * Masked values (containing ****) are never sent back to the server.
   */
  const buildSavePayload = (): Partial<ApiConfig> & { isConfigured: boolean } => {
    const payload: Record<string, unknown> = { isConfigured: true };

    // Always send endpoint
    payload.endpoint = form.endpoint;

    // Only send secret fields if the user actually edited them
    // (i.e., the value doesn't contain **** mask marker)
    if (dirtyFields.has('apiKey') && !form.apiKey.includes('****')) {
      payload.apiKey = form.apiKey;
    }
    if (dirtyFields.has('accessKeyId') && !form.accessKeyId.includes('****')) {
      payload.accessKeyId = form.accessKeyId;
    }
    if (dirtyFields.has('secretAccessKey') && !form.secretAccessKey.includes('****')) {
      payload.secretAccessKey = form.secretAccessKey;
    }

    // Always send modelEndpoints if present
    if (form.modelEndpoints && Object.keys(form.modelEndpoints).length > 0) {
      payload.modelEndpoints = form.modelEndpoints;
    }

    return payload as any;
  };

  const reloadConfig = async () => {
    try {
      const serverConfig = await getConfig();
      setConfig(serverConfig);
      setForm(serverConfig);
      setDirtyFields(new Set());
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    // Validate Endpoint IDs before saving
    const invalidEndpoints: string[] = [];
    if (form.modelEndpoints) {
      for (const [modelId, epId] of Object.entries(form.modelEndpoints)) {
        if (epId && !isValidEndpointId(epId)) {
          const model = MODELS.find((m) => m.id === modelId);
          invalidEndpoints.push(`${model?.label || modelId}: ${epId}`);
        }
      }
    }
    if (invalidEndpoints.length > 0) {
      showAlert(`以下 Endpoint ID 格式不正确，请修正后再保存：\n\n${invalidEndpoints.join('\n')}\n\n正确格式：ep-YYYYMMDDHHMMSS-xxxxx（如 ep-20260708174947-4xznj）\n请在方舟控制台 → 推理接入点 中获取。`, '格式错误', 'error');
      return;
    }

    setSaving(true);
    try {
      await saveConfig(buildSavePayload() as ApiConfig);
      await reloadConfig();
      setTestResult(null);
    } catch (err) {
      showAlert(err instanceof Error ? err.message : '保存失败', '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Save config first before testing
      await saveConfig(buildSavePayload() as ApiConfig);
      await reloadConfig();
      // Then test connection using saved config
      const res = await testConnection();
      setTestResult({ ok: res.success, msg: res.message });
    } catch (err) {
      setTestResult({ ok: false, msg: err instanceof Error ? err.message : '连接失败' });
    } finally {
      setTesting(false);
    }
  };

  const inputClass = 'w-full bg-bg-primary border border-border-custom rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none transition-colors';

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="font-heading text-2xl font-bold">API 配置</h1>

      <GlassCard className="space-y-5">
        {/* API Key */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">API Key <span className="text-text-secondary text-xs">(火山方舟平台)</span></label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={form.apiKey}
              onChange={(e) => handleFieldChange('apiKey', e.target.value)}
              placeholder="在方舟控制台获取的长效 API Key"
              className={`${inputClass} pr-10`}
            />
            <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
              {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-text-secondary">前往 <a href="https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey" target="_blank" rel="noreferrer" className="text-accent hover:underline">方舟控制台 → API Key</a> 获取</p>
        </div>

        {/* Access Key ID */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">Access Key ID <span className="text-text-secondary text-xs">(可选，旧版CV接口)</span></label>
          <input
            value={form.accessKeyId}
            onChange={(e) => handleFieldChange('accessKeyId', e.target.value)}
            placeholder="输入 Access Key ID"
            className={inputClass}
          />
        </div>

        {/* Secret Access Key */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">Secret Access Key <span className="text-text-secondary text-xs">(可选，旧版CV接口)</span></label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={form.secretAccessKey}
              onChange={(e) => handleFieldChange('secretAccessKey', e.target.value)}
              placeholder="输入 Secret Access Key"
              className={`${inputClass} pr-10`}
            />
            <button onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
              {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Endpoint */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-text-primary">API 端点</label>
          <input
            value={form.endpoint}
            onChange={(e) => handleFieldChange('endpoint', e.target.value)}
            placeholder="https://ark.cn-beijing.volces.com"
            className={inputClass}
          />
          <p className="text-xs text-text-secondary">默认: https://ark.cn-beijing.volces.com</p>
        </div>

        {/* Model Endpoint IDs */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-text-primary">模型接入点 (Endpoint ID)</label>
            <a href="https://console.volcengine.com/ark/region:ark+cn-beijing/endpoint" target="_blank" rel="noreferrer" className="text-accent hover:underline text-xs flex items-center gap-1">
              <ExternalLink size={12} />方舟控制台
            </a>
          </div>
          <p className="text-xs text-text-secondary mb-2">
            在方舟控制台为每个模型创建推理接入点，将获取的 Endpoint ID（格式: ep-2025****-***）填入对应模型
          </p>
          <div className="space-y-2">
            {MODELS.map((m) => {
              const epValue = form.modelEndpoints?.[m.id] || '';
              const hint = getEndpointIdHint(epValue);
              return (
                <div key={m.id}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary w-36 shrink-0 truncate" title={m.label}>{m.label}</span>
                    <input
                      value={epValue}
                      onChange={(e) => {
                        const newEndpoints = { ...(form.modelEndpoints || {}) };
                        if (e.target.value) {
                          newEndpoints[m.id] = e.target.value;
                        } else {
                          delete newEndpoints[m.id];
                        }
                        handleFieldChange('modelEndpoints', newEndpoints as any);
                      }}
                      placeholder="ep-2025****-***"
                      className={`flex-1 bg-bg-primary border rounded-lg px-3 py-1.5 text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-none transition-colors font-mono ${
                        hint === null ? 'border-border-custom focus:border-accent' :
                        hint.ok ? 'border-success/50 focus:border-success' :
                        'border-error/50 focus:border-error'
                      }`}
                    />
                  </div>
                  {hint && (
                    <div className={`flex items-center gap-1 ml-38 mt-0.5 text-[10px] ${hint.ok ? 'text-success' : 'text-error'}`}>
                      {hint.ok ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                      {hint.msg}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`flex items-center gap-2 p-3 rounded-lg text-sm ${testResult.ok ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
            {testResult.ok ? <Wifi size={16} /> : <WifiOff size={16} />}
            {testResult.msg}
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-bg-primary font-semibold hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            保存配置
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleTest}
            disabled={testing}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-border-custom text-text-secondary hover:bg-border-custom/30 disabled:opacity-50 transition-all"
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : <Wifi size={16} />}
            测试连接
          </motion.button>
        </div>
      </GlassCard>
    </div>
  );
}
