import { Type, Image, ArrowDownUp, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GenerationMode } from '@/types';

interface ModeCardProps {
  mode: GenerationMode;
  isSelected: boolean;
  isSupported: boolean;
  onClick: () => void;
}

const MODE_ICONS: Record<string, React.ReactNode> = {
  'text-to-video': <Type size={24} />,
  'image-to-video': <Image size={24} />,
  'image-to-video-both': <ArrowDownUp size={24} />,
  'multimodal-reference': <Layers size={24} />,
};

export default function ModeCard({ mode, isSelected, isSupported, onClick }: ModeCardProps) {
  return (
    <button
      onClick={isSupported ? onClick : undefined}
      disabled={!isSupported}
      className={cn(
        'rounded-xl p-3 border transition-all duration-200',
        'hover:border-accent/50 hover:bg-accent/5',
        isSelected
          ? 'bg-accent/10 border-accent text-accent'
          : 'border-border-custom bg-bg-card/50 text-text-secondary',
        !isSupported && 'opacity-30 cursor-not-allowed grayscale',
      )}
    >
      <div className="flex flex-col items-center gap-1.5">
        <div className={cn(isSelected && 'text-accent')}>
          {MODE_ICONS[mode.value]}
        </div>
        <span className="text-xs font-medium">{mode.label}</span>
        <span className="text-[9px] opacity-70">{mode.description}</span>
      </div>
    </button>
  );
}
