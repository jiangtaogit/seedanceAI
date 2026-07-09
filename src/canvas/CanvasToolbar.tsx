import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, RotateCcw, History, Maximize2,
  Type, Image, Film, Music, ChevronDown, Loader2,
} from 'lucide-react';
import { useNodeActions } from '@/canvas/hooks/useNodeActions';
import type { ImageNodeData } from '@/canvas/types';

interface CanvasToolbarProps {
  onGenerate: () => void;
  isCreating: boolean;
  canGenerate: boolean;
  onLoadPrevious: () => void;
  onFitView: () => void;
}

const ADD_MENU_ITEMS: {
  label: string;
  icon: React.ReactNode;
  action: 'text' | 'first_frame' | 'last_frame' | 'reference_image' | 'reference_video' | 'reference_audio';
}[] = [
  { label: '文本节点', icon: <Type size={14} />, action: 'text' },
  { label: '首帧图片', icon: <Image size={14} />, action: 'first_frame' },
  { label: '尾帧图片', icon: <Image size={14} />, action: 'last_frame' },
  { label: '参考图片', icon: <Image size={14} />, action: 'reference_image' },
  { label: '参考视频', icon: <Film size={14} />, action: 'reference_video' },
  { label: '参考音频', icon: <Music size={14} />, action: 'reference_audio' },
];

export default function CanvasToolbar({
  onGenerate,
  isCreating,
  canGenerate,
  onLoadPrevious,
  onFitView,
}: CanvasToolbarProps) {
  const { addTextNode, addImageNode, resetCanvas } = useNodeActions();
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAddItem = (action: typeof ADD_MENU_ITEMS[number]['action']) => {
    if (action === 'text') {
      addTextNode();
    } else {
      addImageNode(action as ImageNodeData['role']);
    }
    setAddMenuOpen(false);
  };

  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
      {/* Glass toolbar container */}
      <div className="glass-nav rounded-xl px-3 py-2 flex items-center gap-2 border border-white/[0.06]">
        {/* Add node dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setAddMenuOpen(!addMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-colors"
          >
            <Plus size={14} />
            添加节点
            <ChevronDown size={12} className={`transition-transform ${addMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {addMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 mt-1 glass-nav rounded-xl py-1.5 min-w-[160px] overflow-hidden border border-white/[0.06]"
              >
                {ADD_MENU_ITEMS.map((item) => (
                  <button
                    key={item.action}
                    onClick={() => handleAddItem(item.action)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-accent/10 transition-colors"
                  >
                    <span className="text-text-secondary">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border-custom" />

        {/* Generate button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onGenerate}
          disabled={canGenerate || isCreating}
          className={`px-5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isCreating
              ? 'bg-accent/50 text-bg-primary btn-generate-active'
              : 'bg-accent text-bg-primary hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
        >
          {isCreating ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" />
              生成中...
            </span>
          ) : (
            '一键生成'
          )}
        </motion.button>

        {/* Divider */}
        <div className="w-px h-5 bg-border-custom" />

        {/* Load previous */}
        <button
          onClick={onLoadPrevious}
          className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors"
          title="载入上次任务"
        >
          <History size={14} />
        </button>

        {/* Fit view */}
        <button
          onClick={onFitView}
          className="p-1.5 rounded-lg text-text-secondary hover:text-accent hover:bg-accent/10 transition-colors"
          title="适应画布"
        >
          <Maximize2 size={14} />
        </button>

        {/* Reset */}
        <button
          onClick={resetCanvas}
          className="p-1.5 rounded-lg text-text-secondary hover:text-warning hover:bg-warning/10 transition-colors"
          title="重置画布"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}
