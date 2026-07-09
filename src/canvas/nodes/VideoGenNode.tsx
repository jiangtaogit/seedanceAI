import { memo, useRef, useState, useMemo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { X, Loader2, Download, ChevronDown, ChevronRight, Coins, Info, Sparkles, AlertTriangle, Volume2, VolumeX, Clock, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VideoGenNodeData } from '@/canvas/types';
import { useFlowStore } from '@/store/useFlowStore';
import { useStore } from '@/store/useStore';
import { showAlert } from '@/components/AlertModal';
import ProgressBar from '@/components/ProgressBar';
import {
  MODELS, VIDEO_STYLES, ASPECT_RATIOS, RESOLUTIONS, DURATIONS,
} from '@/types';
import { estimateCost, formatTokens } from '@/canvas/estimateCost';

type VideoGenNodeType = Node<VideoGenNodeData, 'videoGenNode'>;

// Input handle definitions (left side of the node)
const INPUT_HANDLES = [
  { id: 'prompt', label: '提示词' },
  { id: 'first_frame', label: '首帧' },
  { id: 'last_frame', label: '尾帧' },
  { id: 'reference_image', label: '参考图' },
  { id: 'reference_video', label: '参考视频' },
  { id: 'reference_audio', label: '参考音频' },
];

function VideoGenNode({ id, data }: NodeProps<VideoGenNodeType>) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const removeNode = useFlowStore((s) => s.removeNode);
  const edges = useFlowStore((s) => s.edges);
  const config = useStore((s) => s.config);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [modelInfoOpen, setModelInfoOpen] = useState(false);

  // Determine which handles are connected
  const connectedHandles = useMemo(() => {
    const set = new Set<string>();
    edges.forEach((e) => {
      if (e.target === id && e.targetHandle) {
        set.add(e.targetHandle);
      }
    });
    return set;
  }, [edges, id]);

  // Current model option
  const currentModel = MODELS.find((m) => m.id === data.model) || MODELS[0];
  const endpoints = config.modelEndpoints || {};

  // Estimate token cost
  const hasVideoInput = connectedHandles.has('reference_video');
  const costEstimate = useMemo(() => {
    return estimateCost(data.model, data.resolution, data.aspectRatio, data.duration, hasVideoInput);
  }, [data.model, data.resolution, data.aspectRatio, data.duration, hasVideoInput]);

  // Helper to update this node's data
  const update = (patch: Partial<VideoGenNodeData>) => {
    updateNodeData(id, patch as Record<string, unknown>);
  };

  return (
    <div className="flow-node-enter glass rounded-xl w-[340px]">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-xs font-medium text-text-primary flex items-center gap-1.5">
          <span className="text-sm">🎬</span> 视频生成
        </span>
        <div className="flex items-center gap-1">
          {data.status === 'polling' && (
            <span className="text-[10px] text-accent animate-pulse">生成中</span>
          )}
          {data.status === 'completed' && (
            <span className="text-[10px] text-success">已完成</span>
          )}
          {data.status === 'failed' && (
            <span className="text-[10px] text-error">失败</span>
          )}
          <button
            onClick={() => removeNode(id)}
            className="p-0.5 rounded hover:bg-error/20 text-text-secondary hover:text-error transition-colors"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="px-3 pb-3 space-y-2.5" onPointerDownCapture={(e) => e.stopPropagation()}>
        {/* Model selection */}
        <div>
          <label className="block text-[10px] text-text-secondary mb-1">模型</label>
          <div className="flex gap-1.5">
            <select
              value={data.model}
              onChange={(e) => {
                update({ model: e.target.value });
                const newModel = MODELS.find((m) => m.id === e.target.value);
                if (newModel && !newModel.supportedResolutions.includes(data.resolution)) {
                  update({ resolution: newModel.supportedResolutions[newModel.supportedResolutions.length - 1] });
                }
                setModelInfoOpen(false);
              }}
              className="flex-1 bg-bg-primary border border-border-custom rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:border-accent focus:outline-none"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            <button
              onClick={() => setModelInfoOpen(!modelInfoOpen)}
              className={`p-1.5 rounded-lg border transition-colors ${
                modelInfoOpen
                  ? 'bg-accent/10 border-accent/40 text-accent'
                  : 'bg-bg-primary border-border-custom text-text-secondary hover:text-accent hover:border-accent/40'
              }`}
              title="模型详情"
            >
              <Info size={14} />
            </button>
          </div>
          {/* Endpoint status */}
          {!endpoints[data.model] && (
            <p className="text-[10px] text-warning mt-0.5">⚠ 未配置 Endpoint ID</p>
          )}

          {/* Model info panel */}
          <AnimatePresence>
            {modelInfoOpen && currentModel.details && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mt-2"
              >
                <div className="bg-bg-primary/60 border border-white/[0.06] rounded-lg p-2.5 space-y-2">
                  {/* Tier badge + summary */}
                  <div className="flex items-start gap-1.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 mt-0.5 ${
                      currentModel.tier === 'flagship' ? 'bg-accent/20 text-accent' :
                      currentModel.tier === 'standard' ? 'bg-accent-secondary/20 text-accent-secondary' :
                      'bg-text-secondary/20 text-text-secondary'
                    }`}>
                      {currentModel.tier === 'flagship' ? '旗舰' : currentModel.tier === 'standard' ? '标准' : '轻量'}
                    </span>
                    <p className="text-[10px] text-text-primary leading-relaxed">{currentModel.details.summary}</p>
                  </div>

                  {/* Quick specs */}
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 text-[9px] text-text-secondary">
                      <Monitor size={10} /> {currentModel.supportedResolutions.join('/')}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] text-text-secondary">
                      <Clock size={10} /> 最长{currentModel.details.maxDuration}秒
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] text-text-secondary">
                      {currentModel.details.audio ? <Volume2 size={10} className="text-success" /> : <VolumeX size={10} />}
                      {currentModel.details.audio ? '有声' : '无声'}
                    </span>
                  </div>

                  {/* Features */}
                  <div>
                    <p className="text-[9px] text-accent font-medium mb-1 flex items-center gap-1">
                      <Sparkles size={9} /> 核心能力
                    </p>
                    <ul className="space-y-0.5">
                      {currentModel.details.features.map((f, i) => (
                        <li key={i} className="text-[9px] text-text-secondary pl-2 relative before:content-['·'] before:absolute before:left-0 before:text-accent">
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Requirements */}
                  <div>
                    <p className="text-[9px] text-warning font-medium mb-1 flex items-center gap-1">
                      <AlertTriangle size={9} /> 使用要求
                    </p>
                    <ul className="space-y-0.5">
                      {currentModel.details.requirements.map((r, i) => (
                        <li key={i} className={`text-[9px] pl-2 relative before:content-['·'] before:absolute before:left-0 ${
                          r.startsWith('⚠') ? 'text-warning before:text-warning' : 'text-text-secondary before:text-text-secondary/50'
                        }`}>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Pricing */}
                  <div className="border-t border-white/[0.04] pt-1.5">
                    <p className="text-[9px] text-text-secondary">
                      💰 {currentModel.details.pricing}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-2">
          <label className="w-12 text-[10px] text-text-secondary flex-shrink-0">时长</label>
          <div className="flex gap-1.5 flex-1">
            {DURATIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => update({ duration: d.value })}
                className={`flex-1 py-1 rounded-lg text-[11px] transition-colors ${
                  data.duration === d.value
                    ? 'bg-accent text-bg-primary'
                    : 'bg-bg-primary border border-border-custom text-text-secondary hover:border-accent/40'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution */}
        <div className="flex items-center gap-2">
          <label className="w-12 text-[10px] text-text-secondary flex-shrink-0">分辨率</label>
          <div className="flex gap-1.5 flex-1">
            {RESOLUTIONS.map((r) => {
              const supported = currentModel.supportedResolutions.includes(r.value);
              return (
                <button
                  key={r.value}
                  disabled={!supported}
                  onClick={() => update({ resolution: r.value })}
                  className={`flex-1 py-1 rounded-lg text-[11px] transition-colors ${
                    data.resolution === r.value
                      ? 'bg-accent text-bg-primary'
                      : 'bg-bg-primary border border-border-custom text-text-secondary hover:border-accent/40'
                  } ${!supported ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  {r.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Aspect Ratio */}
        <div className="flex items-center gap-2">
          <label className="w-12 text-[10px] text-text-secondary flex-shrink-0">宽高比</label>
          <div className="flex gap-1.5 flex-1">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar.value}
                onClick={() => update({ aspectRatio: ar.value })}
                className={`flex-1 flex flex-col items-center p-1.5 rounded-lg text-[10px] transition-colors ${
                  data.aspectRatio === ar.value
                    ? 'bg-accent/10 border border-accent text-accent'
                    : 'bg-bg-primary border border-border-custom text-text-secondary'
                }`}
              >
                <div
                  className="w-5 h-5 border-current rounded-sm mb-0.5"
                  style={{ aspectRatio: `${ar.width}/${ar.height}` }}
                />
                {ar.label}
              </button>
            ))}
          </div>
        </div>

        {/* Style */}
        <div className="flex items-center gap-2">
          <label className="w-12 text-[10px] text-text-secondary flex-shrink-0">风格</label>
          <select
            value={data.style}
            onChange={(e) => update({ style: e.target.value })}
            className="flex-1 bg-bg-primary border border-border-custom rounded-lg px-2.5 py-1 text-xs text-text-primary focus:border-accent focus:outline-none"
          >
            {VIDEO_STYLES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Cost Estimate */}
        <div className="bg-accent/5 border border-accent/20 rounded-lg px-2.5 py-2 space-y-1">
          <div className="flex items-center gap-1.5">
            <Coins size={12} className="text-accent" />
            <span className="text-[10px] font-medium text-accent">预估消耗</span>
          </div>
          {costEstimate.isAvailable ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] text-text-secondary">Token</span>
                <span className="text-xs font-medium text-text-primary">{formatTokens(costEstimate.tokens)}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] text-text-secondary">费用</span>
                <span className="text-sm font-bold text-accent">≈ ¥{costEstimate.costYuan}</span>
              </div>
              <p className="text-[9px] text-text-secondary/60">{costEstimate.priceLabel}</p>
            </>
          ) : (
            <p className="text-[10px] text-text-secondary">{costEstimate.priceLabel}</p>
          )}
        </div>

        {/* Advanced: CFG + Seed */}
        <div className="border-t border-border-custom/50 pt-1.5">
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="flex items-center gap-1 text-[10px] text-text-secondary hover:text-accent transition-colors"
          >
            {advancedOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            高级选项
          </button>
          <AnimatePresence>
            {advancedOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden space-y-2 mt-1.5"
              >
                <div className="flex items-center gap-2">
                  <label className="w-12 text-[10px] text-text-secondary flex-shrink-0">CFG</label>
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={data.cfgScale}
                      onChange={(e) => update({ cfgScale: Number(e.target.value) })}
                      className="flex-1 accent-accent"
                    />
                    <span className="text-[10px] text-accent w-5 text-right">{data.cfgScale}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="w-12 text-[10px] text-text-secondary flex-shrink-0">种子</label>
                  <input
                    value={data.seed}
                    onChange={(e) => update({ seed: e.target.value.replace(/[^\d]/g, '') })}
                    placeholder="留空自动"
                    className="flex-1 bg-bg-primary border border-border-custom rounded-lg px-2 py-1 text-[11px] text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress & Preview */}
        {data.task && (
          <div className="pt-1">
            <ProgressBar
              progress={data.task.progress}
              status={data.task.status}
              stage={data.task.stage}
            />

            {data.task.status === 'completed' && data.task.videoUrl && (
              <div className="mt-2 space-y-2">
                <video
                  src={data.task.videoUrl}
                  controls
                  className="w-full rounded-lg bg-black max-h-[180px]"
                />
                <a
                  href={data.task.videoUrl}
                  download
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-success/20 text-success rounded-lg hover:bg-success/30 transition-colors text-[10px]"
                >
                  <Download size={12} /> 下载视频
                </a>
              </div>
            )}

            {data.task.status === 'failed' && data.task.errorMsg && (
              <p className="mt-1 text-error text-[10px]">{data.task.errorMsg}</p>
            )}
          </div>
        )}
      </div>

      {/* Input Handles (left side) */}
      {INPUT_HANDLES.map((h, idx) => {
        const isConnected = connectedHandles.has(h.id);
        return (
          <div key={h.id}>
            <Handle
              type="target"
              position={Position.Left}
              id={h.id}
              style={{ top: 28 + idx * 28 }}
            />
            {/* Handle label */}
            <div
              className="absolute left-[-44px] text-[9px] pointer-events-none select-none flex items-center gap-1"
              style={{ top: 28 + idx * 28, transform: 'translateY(-50%)' }}
            >
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-success' : 'bg-text-secondary/40'
                }`}
              />
              <span className={isConnected ? 'text-success' : 'text-text-secondary/60'}>
                {h.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(VideoGenNode);
