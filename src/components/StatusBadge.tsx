import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/types';

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  queued: { label: '排队中', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  processing: { label: '处理中', className: 'bg-accent/20 text-accent border-accent/30' },
  completed: { label: '已完成', className: 'bg-success/20 text-success border-success/30' },
  failed: { label: '失败', className: 'bg-error/20 text-error border-error/30' },
};

interface StatusBadgeProps {
  status: TaskStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
