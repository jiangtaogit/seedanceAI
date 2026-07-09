import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/types';

interface ProgressBarProps {
  progress: number;
  status: TaskStatus;
  stage?: string;
  className?: string;
}

const barColor: Record<TaskStatus, string> = {
  queued: 'bg-yellow-400',
  processing: 'bg-accent',
  completed: 'bg-success',
  failed: 'bg-error',
};

export default function ProgressBar({ progress, status, stage, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-secondary">
          {stage || (status === 'queued' ? '等待处理' : status === 'processing' ? '生成中' : '')}
        </span>
        <span className="text-xs font-medium text-text-primary">{clamped}%</span>
      </div>
      <div className="w-full h-2 bg-border-custom/50 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', barColor[status])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
