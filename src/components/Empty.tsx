import { Inbox } from 'lucide-react';

interface EmptyProps {
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function Empty({ description = '暂无数据', actionLabel, onAction }: EmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Inbox size={48} className="text-text-secondary/30 mb-4" />
      <p className="text-text-secondary mb-4">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="px-4 py-2 rounded-lg bg-accent/10 text-accent text-sm hover:bg-accent/20 transition-colors">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
