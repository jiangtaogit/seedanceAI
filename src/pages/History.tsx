import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Download, Play, Clock, Monitor, Maximize, Palette, Cpu, Layers, Sliders, Dice5, ChevronLeft, ChevronRight, User } from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import Empty from '@/components/Empty';
import StatusBadge from '@/components/StatusBadge';
import { getTasks } from '@/services/api';
import type { Task } from '@/types';
import { MODELS, GENERATION_MODES } from '@/types';
import { useStore } from '@/store/useStore';

const PAGE_SIZE = 10;

export default function History() {
  const isAdmin = useStore((s) => s.user?.role === 'admin');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Task | null>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTasks({ page, pageSize: PAGE_SIZE, status: 'completed', search: search || undefined });
      setTasks(res.items);
      setTotal(res.total);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Reset page when search changes
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  // Delete handler with page fallback
  const handleDeleteFromPage = () => {
    if (tasks.length === 1 && page > 1) {
      setPage(page - 1);
    } else {
      fetchHistory();
    }
  };

  // Info item helper
  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number | undefined }) => (
    <div className="flex items-center gap-2 text-sm">
      <Icon size={14} className="text-text-secondary shrink-0" />
      <span className="text-text-secondary">{label}</span>
      <span className="text-text-primary font-medium">{value ?? '-'}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold mb-4">历史记录</h1>
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="搜索视频..."
            className="w-full bg-bg-card border border-border-custom rounded-lg pl-9 pr-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {/* List */}
      {tasks.length === 0 && !loading ? (
        <Empty description="暂无生成记录" actionLabel="去创建" onAction={() => {}} />
      ) : (
        <div className="space-y-3">
          {tasks.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ x: 4 }}
              onClick={() => setSelected(t)}
              className="cursor-pointer group"
            >
              <GlassCard className="!p-0 overflow-hidden">
                <div className="flex">
                  {/* Left: Video Cover */}
                  <div className="w-48 shrink-0 aspect-video bg-bg-primary relative overflow-hidden border-r border-border-custom">
                    {t.videoUrl ? (
                      <video
                        src={t.videoUrl}
                        className="w-full h-full object-cover"
                        preload="metadata"
                        muted
                        onMouseEnter={(e) => { (e.target as HTMLVideoElement).currentTime = 0.5; }}
                      />
                    ) : t.thumbnailUrl ? (
                      <img src={t.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play size={32} className="text-text-secondary/30" />
                      </div>
                    )}
                    {/* Duration badge */}
                    <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {t.duration}s
                    </div>
                  </div>

                  {/* Right: Video Info */}
                  <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                    <div>
                      <p className="text-sm font-medium text-text-primary line-clamp-2 mb-2">{t.prompt}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        <InfoRow icon={Cpu} label="模型" value={MODELS.find((m) => m.id === t.model)?.label || t.model} />
                        <InfoRow icon={Layers} label="模式" value={GENERATION_MODES.find((g) => g.value === t.mode)?.label || t.mode} />
                        <InfoRow icon={Clock} label="时长" value={`${t.duration}s`} />
                        <InfoRow icon={Monitor} label="分辨率" value={t.resolution} />
                        <InfoRow icon={Maximize} label="宽高比" value={t.aspectRatio} />
                        <InfoRow icon={Palette} label="风格" value={t.style || '默认'} />
                        {isAdmin && t.username && <InfoRow icon={User} label="创建者" value={t.username} />}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3">
                        <StatusBadge status={t.status} />
                        <span className="text-xs text-text-secondary">{new Date(t.createdAt).toLocaleString()}</span>
                      </div>
                      {t.videoUrl && (
                        <a
                          href={t.videoUrl}
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-success/10 text-success rounded-md hover:bg-success/20 transition-colors text-xs opacity-0 group-hover:opacity-100"
                        >
                          <Download size={12} />下载
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-2 rounded-lg border border-border-custom text-sm disabled:opacity-40 hover:bg-bg-card transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | string)[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                typeof item === 'string' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-text-secondary text-sm">...</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className={`min-w-[32px] h-8 rounded-lg text-sm transition-colors ${
                      page === item ? 'bg-accent text-bg-primary' : 'border border-border-custom hover:bg-bg-card'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
          </div>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-lg border border-border-custom text-sm disabled:opacity-40 hover:bg-bg-card transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          <span className="text-xs text-text-secondary ml-2">
            共 {total} 条
          </span>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl glass-strong rounded-2xl overflow-hidden"
            >
              {/* Video */}
              {selected.videoUrl && (
                <video src={selected.videoUrl} controls autoPlay className="w-full max-h-[60vh] bg-black" />
              )}

              {/* Info */}
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="font-heading font-semibold text-lg line-clamp-2">{selected.prompt}</h3>
                  <button onClick={() => setSelected(null)} className="p-1 hover:bg-border-custom/30 rounded-md"><X size={18} className="text-text-secondary" /></button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <InfoRow icon={Cpu} label="模型" value={MODELS.find((m) => m.id === selected.model)?.label || selected.model} />
                  <InfoRow icon={Layers} label="模式" value={GENERATION_MODES.find((g) => g.value === selected.mode)?.label || selected.mode} />
                  <InfoRow icon={Clock} label="时长" value={`${selected.duration}s`} />
                  <InfoRow icon={Monitor} label="分辨率" value={selected.resolution} />
                  <InfoRow icon={Maximize} label="宽高比" value={selected.aspectRatio} />
                  <InfoRow icon={Palette} label="风格" value={selected.style || '默认'} />
                  <InfoRow icon={Sliders} label="CFG" value={selected.cfgScale} />
                  <InfoRow icon={Dice5} label="种子" value={selected.seed} />
                </div>
                {selected.videoUrl && (
                  <a
                    href={selected.videoUrl}
                    download
                    className="inline-flex items-center gap-2 px-4 py-2 bg-success/20 text-success rounded-lg hover:bg-success/30 transition-colors text-sm"
                  >
                    <Download size={16} />下载视频
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
