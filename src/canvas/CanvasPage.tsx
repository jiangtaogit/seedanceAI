import { useCallback, useRef, useEffect, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play } from 'lucide-react';

import { nodeTypes } from '@/canvas/nodes';
import { edgeTypes } from '@/canvas/edges';
import { useFlowStore } from '@/store/useFlowStore';
import { useStore } from '@/store/useStore';
import { useGraphToParams } from '@/canvas/hooks/useGraphToParams';
import { useNodeActions } from '@/canvas/hooks/useNodeActions';
import { createTask, pollTask, getTask, getTasks, getConfig } from '@/services/api';
import { showAlert } from '@/components/AlertModal';
import CanvasToolbar from '@/canvas/CanvasToolbar';
import type { Task, CreateTaskParams } from '@/types';
import type { VideoGenNodeData } from '@/canvas/types';

// Module-level — persists across component mount/unmount (tab switches)
let _lastShownVideoUrl: string | null = null;

export default function CanvasPage() {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);
  const onNodesChange = useFlowStore((s) => s.onNodesChange);
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange);
  const onConnect = useFlowStore((s) => s.onConnect);
  const updateNodeData = useFlowStore((s) => s.updateNodeData);

  const isCreating = useStore((s) => s.isCreating);
  const setCreating = useStore((s) => s.setCreating);
  const config = useStore((s) => s.config);
  const setConfig = useStore((s) => s.setConfig);

  // Load config from server on mount (so modelEndpoints are available)
  useEffect(() => {
    getConfig().then(setConfig).catch(() => {});
  }, [setConfig]);

  const resolved = useGraphToParams();
  const pollRef = useRef<(() => void) | null>(null);

  // Video completion popup — only show ONCE per new videoUrl
  const [completedVideo, setCompletedVideo] = useState<{ url: string; prompt: string } | null>(null);

  // Watch for task completion — only on FIRST transition to completed with new URL
  useEffect(() => {
    const videoGenNode = nodes.find((n) => n.type === 'videoGenNode');
    if (!videoGenNode) return;
    const data = videoGenNode.data as VideoGenNodeData;
    const videoUrl = data.task?.videoUrl;
    if (
      data.status === 'completed' &&
      data.task?.status === 'completed' &&
      videoUrl &&
      videoUrl !== _lastShownVideoUrl
    ) {
      _lastShownVideoUrl = videoUrl;
      setCompletedVideo({
        url: videoUrl,
        prompt: data.task.prompt || '',
      });
    }
  }, [nodes]);

  // ============ Generate Logic ============

  const handleGenerate = useCallback(async () => {
    if (isCreating) return;
    if (!resolved) {
      showAlert('画布中没有视频生成节点');
      return;
    }
    if (resolved.validationErrors.length > 0) {
      showAlert(resolved.validationErrors.join('\n'), '参数校验失败', 'error');
      return;
    }

    // Validate Endpoint ID
    const { params } = resolved;
    const epEndpoints = config.modelEndpoints || {};
    const modelId = params.model || '';
    if (!epEndpoints[modelId]) {
      showAlert(
        `模型 "${modelId}" 未配置 Endpoint ID。\n请前往 设置 → 模型接入点 填入该模型的 Endpoint ID（ep-xxx），或选择已配置的模型。`,
        '配置缺失',
        'error'
      );
      return;
    }
    const epId = epEndpoints[modelId];
    if (!/^ep-\d+-[a-z0-9]+$/i.test(epId)) {
      const hint = /^ep-m-/i.test(epId)
        ? '这是模型ID而非推理接入点ID'
        : /^doubao-/i.test(epId)
          ? '这是模型名称而非Endpoint ID'
          : '格式应为 ep-YYYYMMDDHHMMSS-xxxxx';
      showAlert(
        `模型 "${modelId}" 的 Endpoint ID 格式不正确：${epId}\n\n${hint}`,
        '格式错误',
        'error'
      );
      return;
    }

    setCreating(true);
    // Update node status
    updateNodeData(resolved.nodeId, { status: 'creating' });

    try {
      const result = await createTask(params);
      const task: Task = await getTask(result.taskId);

      // Update node with task data
      updateNodeData(resolved.nodeId, {
        task,
        status: 'polling',
      });

      // Poll for updates
      if (task.status !== 'completed' && task.status !== 'failed') {
        pollRef.current = pollTask(task.id, (t) => {
          updateNodeData(resolved.nodeId, {
            task: t,
            status:
              t.status === 'completed'
                ? 'completed'
                : t.status === 'failed'
                  ? 'failed'
                  : 'polling',
          });
        }, 2000);
      }
    } catch (err) {
      showAlert(err instanceof Error ? err.message : '创建失败', '创建失败', 'error');
      updateNodeData(resolved.nodeId, { status: 'failed' });
    } finally {
      setCreating(false);
    }
  }, [isCreating, resolved, config, setCreating, updateNodeData]);

  // ============ Load Previous Task ============

  const handleLoadPrevious = useCallback(async () => {
    try {
      const res = await getTasks({ page: 1, pageSize: 1 });
      const latestTask = res.items[0];
      if (!latestTask) {
        showAlert('暂无历史任务可载入');
        return;
      }

      // Find the VideoGenNode and update it
      const videoGenNode = nodes.find((n) => n.type === 'videoGenNode');
      if (videoGenNode) {
        const patch: Partial<VideoGenNodeData> = {};
        if (latestTask.duration) patch.duration = latestTask.duration;
        if (latestTask.resolution) patch.resolution = latestTask.resolution;
        if (latestTask.aspectRatio) patch.aspectRatio = latestTask.aspectRatio;
        if (latestTask.style) patch.style = latestTask.style;
        else patch.style = 'default';
        if (latestTask.cfgScale) patch.cfgScale = latestTask.cfgScale;
        if (latestTask.seed !== undefined && latestTask.seed !== null) patch.seed = String(latestTask.seed);
        else patch.seed = '';
        if (latestTask.model) patch.model = latestTask.model;
        if (latestTask.mode) patch.mode = latestTask.mode;
        updateNodeData(videoGenNode.id, patch as Record<string, unknown>);
      }

      // Update the TextNode with prompt
      if (latestTask.prompt) {
        const textNode = nodes.find((n) => n.type === 'textNode');
        if (textNode) {
          updateNodeData(textNode.id, { prompt: latestTask.prompt });
        }
      }
    } catch (err) {
      showAlert(err instanceof Error ? err.message : '载入失败');
    }
  }, [nodes, updateNodeData]);

  // ============ Can Generate ============

  const canGenerate = (() => {
    if (isCreating) return false;
    if (!resolved) return true;
    return resolved.validationErrors.length > 0;
  })();

  // ============ Fit View ============

  const reactFlowInstance = useReactFlow();
  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.2 });
  }, [reactFlowInstance]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{ type: 'animated', animated: true }}
        connectionLineStyle={{ stroke: 'var(--accent)', strokeWidth: 2 }}
        snapToGrid
        snapGrid={[16, 16]}
        deleteKeyCode="Delete"
        className="bg-transparent"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(0, 212, 255, 0.06)"
        />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'videoGenNode') return '#00d4ff';
            if (n.type === 'imageNode') return '#a855f7';
            return '#00ff88';
          }}
          maskColor="rgba(10, 15, 28, 0.7)"
          className="!glass !rounded-xl !border-white/[0.06]"
        />
        <Controls
          showInteractive={false}
          className="!glass !rounded-xl !border-white/[0.06]"
        />
      </ReactFlow>

      {/* Toolbar */}
      <CanvasToolbar
        onGenerate={handleGenerate}
        isCreating={isCreating}
        canGenerate={canGenerate}
        onLoadPrevious={handleLoadPrevious}
        onFitView={handleFitView}
      />

      {/* Video completion popup — frosted glass with player */}
      <AnimatePresence>
        {completedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
            onClick={() => setCompletedVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl glass-nav rounded-2xl overflow-hidden border border-white/[0.06]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <Play size={16} className="text-success" />
                  <h3 className="font-heading font-semibold text-base text-success">
                    视频生成完成
                  </h3>
                </div>
                <button
                  onClick={() => setCompletedVideo(null)}
                  className="p-1.5 hover:bg-white/[0.06] rounded-md transition-colors"
                >
                  <X size={16} className="text-text-secondary" />
                </button>
              </div>

              {/* Video player */}
              <div className="px-5 pb-2">
                <video
                  src={completedVideo.url}
                  controls
                  autoPlay
                  className="w-full rounded-xl bg-black"
                  style={{ maxHeight: '60vh' }}
                >
                  您的浏览器不支持视频播放
                </video>
              </div>

              {/* Prompt preview */}
              {completedVideo.prompt && (
                <div className="px-5 pb-2">
                  <p className="text-[10px] text-text-secondary mb-1">提示词</p>
                  <p className="text-xs text-text-primary bg-bg-primary/40 rounded-lg p-2 line-clamp-2">
                    {completedVideo.prompt}
                  </p>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex items-center justify-between px-5 pb-4 pt-2">
                <a
                  href={completedVideo.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.06] text-xs text-text-secondary hover:text-accent hover:border-accent/40 transition-colors"
                >
                  下载视频
                </a>
                <button
                  onClick={() => setCompletedVideo(null)}
                  className="px-4 py-1.5 rounded-lg bg-accent text-bg-primary text-sm font-medium hover:bg-accent/90 transition-colors"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
