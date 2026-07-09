import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import { cn } from '@/lib/utils';
import type { StepStatus } from '@/components/FlowConnector';

interface FlowNodeProps {
  step: 1 | 2 | 3;
  title: string;
  subtitle?: string;
  status: StepStatus;
  children: React.ReactNode;
  className?: string;
}

const FlowNode = forwardRef<HTMLDivElement, FlowNodeProps>(
  ({ step, title, subtitle, status, children, className }, ref) => {
    const badgeClasses = cn(
      'w-10 h-10 rounded-full flex items-center justify-center font-heading text-lg font-bold transition-all duration-300',
      status === 'active' && 'bg-accent text-bg-primary glow-accent',
      status === 'completed' && 'bg-success/80 text-bg-primary glow-success',
      status === 'inactive' && 'bg-border-custom text-text-secondary',
    );

    const contentBorderClasses = cn(
      status === 'active' && 'border-l-2 border-l-accent',
      status === 'completed' && 'border-l-2 border-l-success',
      status === 'inactive' && 'border-l-2 border-l-border-custom',
    );

    const subtitleColorClasses = cn(
      status === 'active' && 'text-text-secondary',
      status === 'completed' && 'text-success',
      status === 'inactive' && 'text-text-secondary/50',
    );

    return (
      <div ref={ref} className={cn('relative flow-node-enter', className)}>
        {/* Badge */}
        <div className="absolute left-0 top-0 z-10">
          <motion.div
            className={badgeClasses}
            initial={false}
            animate={status === 'completed' ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.4 }}
          >
            {status === 'completed' ? <Check size={20} strokeWidth={3} /> : step}
          </motion.div>
        </div>

        {/* Title + Subtitle */}
        <div className="ml-14 mb-3">
          <h3 className="font-heading font-semibold text-base text-text-primary">{title}</h3>
          {subtitle && (
            <p className={cn('text-xs mt-0.5', subtitleColorClasses)}>{subtitle}</p>
          )}
        </div>

        {/* Content */}
        <div className={cn('ml-14', status === 'inactive' && 'opacity-50 pointer-events-none')}>
          <GlassCard className={contentBorderClasses}>
            {children}
          </GlassCard>
        </div>
      </div>
    );
  }
);

FlowNode.displayName = 'FlowNode';
export default FlowNode;
