import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModelOption } from '@/types';

interface ModelCardProps {
  model: ModelOption;
  isSelected: boolean;
  isConfigured: boolean;    // endpoint ID is set
  onClick: () => void;
}

const tierBadge: Record<string, string> = {
  flagship: 'bg-amber-500/20 text-amber-400',
  standard: 'bg-blue-500/20 text-blue-400',
  lightweight: 'bg-green-500/20 text-green-400',
};

const tierLabel: Record<string, string> = {
  flagship: '旗舰',
  standard: '标准',
  lightweight: '轻量',
};

export default function ModelCard({ model, isSelected, isConfigured, onClick }: ModelCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full text-left rounded-xl p-3 border transition-all duration-200',
        'hover:border-accent/50 hover:-translate-y-0.5',
        isSelected
          ? 'border-accent bg-accent/5'
          : 'border-border-custom bg-bg-card/50',
      )}
    >
      {/* Selected indicator bar */}
      {isSelected && (
        <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-accent" />
      )}

      <div className="pl-1">
        {/* Row 1: Model name + tier badge + endpoint dot */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text-primary">{model.label}</span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', tierBadge[model.tier])}>
            {tierLabel[model.tier]}
          </span>
          <span className={isConfigured ? 'endpoint-dot-configured' : 'endpoint-dot-unconfigured'} />
        </div>

        {/* Row 2: Description */}
        <span className="text-[10px] text-text-secondary block mt-1">{model.description}</span>

        {/* Row 3: Resolutions */}
        <span className="text-[10px] text-text-secondary/60 block mt-0.5">{model.supportedResolutions.join('/')}</span>
      </div>

      {/* Unconfigured warning badge */}
      {!isConfigured && (
        <div className="absolute top-2 right-2">
          <AlertTriangle size={12} className="text-warning" />
        </div>
      )}
    </button>
  );
}
