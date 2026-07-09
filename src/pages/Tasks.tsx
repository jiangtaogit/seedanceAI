import { useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Trash2, Eye, XCircle, AlertTriangle } from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import StatusBadge from '@/components/StatusBadge';
import Empty from '@/components/Empty';
import { showAlert } from '@/components/AlertModal';
import { useStore } from '@/store/useStore';
import { getTasks, deleteTask, deleteFailedTasks, cancelTask } from '@/services/api';

export default function Tasks() {
  const {
    tasks, tasksTotal, tasksPage, tasksPageSize,
    taskFilter, taskSearch, isLoading, setLoading,
    setTasks, setTasksTotal, setTasksPage, setTaskFilter, setTaskSearch,
    updateTaskInList, removeTask,
  } = useStore();

  const isAdmin = useStore((s) => s.user?.role === 'admin');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTasks({
        page: tasksPage,
        pageSize: tasksPageSize,
        status: (taskFilter !== 'all' ? taskFilter : undefined) as any,
        search: taskSearch || undefined,
      });
      setTasks(res.items);
      setTasksTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [tasksPage, tasksPageSize, taskFilter, taskSearch]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleCancel = async (id: string) => {
    try {
      const t = await cancelTask(id);
      updateTaskInList(t);
    } catch (err) { showAlert(err instanceof Error ? err.message : '操作失败', '操作失败', 'error'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask(id);
      removeTask(id);
      // If we deleted the last item on the current page (and not page 1), go back to previous page
      const remainingOnPage = tasks.length - 1;
      if (remainingOnPage === 0 && tasksPage > 1) {
        setTasksPage(tasksPage - 1);
      } else {
        // Re-fetch to keep data in sync (total count, etc.)
        fetchTasks();
      }
    } catch (err) { showAlert(err instanceof Error ? err.message : '删除失败', '删除失败', 'error'); }
  };

  const [deletingFailed, setDeletingFailed] = useState(false);
  const handleDeleteFailed = async () => {
    if (deletingFailed) return;
    setDeletingFailed(true);
    try {
      const result = await deleteFailedTasks();
      showAlert(`已删除 ${result.deletedCount} 个失败任务`, '清理完成', 'success');
      fetchTasks();
    } catch (err) {
      showAlert(err instanceof Error ? err.message : '删除失败', '删除失败', 'error');
    } finally {
      setDeletingFailed(false);
    }
  };

  // Count failed tasks on current page for button visibility
  const failedCount = tasks.filter((t) => t.status === 'failed').length;

  const totalPages = Math.ceil(tasksTotal / tasksPageSize);

  if (!tasks.length && !isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold mb-4">任务管理</h1>
          <div className="flex gap-3">
            <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" /><input value={taskSearch} onChange={(e) => setTaskSearch(e.target.value)} placeholder="搜索提示词..." className="w-full bg-bg-card border border-border-custom rounded-lg pl-9 pr-3 py-2 text-sm focus:border-accent focus:outline-none" /></div>
            <select value={taskFilter} onChange={(e) => setTaskFilter(e.target.value as typeof taskFilter)} className="bg-bg-card border border-border-custom rounded-lg px-3 py-2 text-sm">
              <option value="all">全部状态</option>
              <option value="queued">排队中</option>
              <option value="processing">处理中</option>
              <option value="completed">已完成</option>
              <option value="failed">失败</option>
            </select>
          </div>
        </div>
        <Empty description="暂无任务，前往创建视频吧！" actionLabel="去创建" onAction={() => {} } />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div>
        <h1 className="font-heading text-2xl font-bold mb-4">任务管理</h1>
        <GlassCard>
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
              <input
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                placeholder="搜索提示词..."
                className="w-full bg-bg-primary border border-border-custom rounded-lg pl-9 pr-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>
            <select
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value as typeof taskFilter)}
              className="bg-bg-primary border border-border-custom rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">全部状态</option>
              <option value="queued">排队中</option>
              <option value="processing">处理中</option>
              <option value="completed">已完成</option>
              <option value="failed">失败</option>
            </select>
            {failedCount > 0 && (
              <button
                onClick={handleDeleteFailed}
                disabled={deletingFailed}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-error/30 bg-error/10 text-error text-xs font-medium hover:bg-error/20 transition-colors disabled:opacity-50"
              >
                <AlertTriangle size={14} />
                {deletingFailed ? '删除中...' : `清除失败任务 (${failedCount})`}
              </button>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border-custom">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-custom bg-bg-card/50">
              <th className="text-left p-3 font-medium text-text-secondary">ID</th>
              <th className="text-left p-3 font-medium text-text-secondary">提示词</th>
              {isAdmin && <th className="text-left p-3 font-medium text-text-secondary">创建者</th>}
              <th className="text-left p-3 font-medium text-text-secondary">状态</th>
              <th className="text-left p-3 font-medium text-text-secondary">进度</th>
              <th className="text-left p-3 font-medium text-text-secondary">创建时间</th>
              <th className="text-right p-3 font-medium text-text-secondary">操作</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-border-custom/50 hover:bg-bg-card/30 transition-colors">
                <td className="p-3 font-mono text-xs text-text-primary">{t.id.slice(0, 8)}...</td>
                <td className="p-3 text-text-primary max-w-[200px] truncate">{t.prompt}</td>
                {isAdmin && <td className="p-3 text-text-secondary text-xs">{t.username || '-'}</td>}
                <td className="p-3"><StatusBadge status={t.status} /></td>
                <td className="p-3 w-32">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-border-custom rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${t.status === 'completed' ? 'bg-success' : t.status === 'failed' ? 'bg-error' : 'bg-accent'}`} style={{ width: `${t.progress}%` }} />
                    </div>
                    <span className="text-xs text-text-secondary">{t.progress}%</span>
                  </div>
                </td>
                <td className="p-3 text-text-secondary whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</td>
                <td className="p-3 text-right space-x-2">
                  <button className="p-1.5 hover:bg-accent/10 rounded-md transition-colors text-accent"><Eye size={14} /></button>
                  {(t.status === 'queued' || t.status === 'processing') && (
                    <button onClick={() => handleCancel(t.id)} className="p-1.5 hover:bg-warning/10 rounded-md transition-colors text-warning"><XCircle size={14} /></button>
                  )}
                  {(t.status === 'completed' || t.status === 'failed') && (
                    <button onClick={() => handleDelete(t.id)} className="p-1.5 hover:bg-error/10 rounded-md transition-colors text-error"><Trash2 size={14} /></button>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setTasksPage(Math.max(1, tasksPage - 1))} disabled={tasksPage <= 1} className="px-3 py-1.5 rounded-lg border border-border-custom text-sm disabled:opacity-40 hover:bg-bg-card transition-colors">上一页</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setTasksPage(p)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${tasksPage === p ? 'bg-accent text-bg-primary' : 'border border-border-custom hover:bg-bg-card'}`}>{p}</button>
          ))}
          <button onClick={() => setTasksPage(Math.min(totalPages, tasksPage + 1))} disabled={tasksPage >= totalPages} className="px-3 py-1.5 rounded-lg border border-border-custom text-sm disabled:opacity-40 hover:bg-bg-card transition-colors">下一页</button>
        </div>
      )}
    </div>
  );
}
