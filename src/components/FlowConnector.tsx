import { cn } from '@/lib/utils';

export type StepStatus = 'active' | 'completed' | 'inactive';

interface FlowConnectorProps {
  status: StepStatus;
}

export default function FlowConnector({ status }: FlowConnectorProps) {
  return (
    <div className="relative h-10 ml-[19px]">
      {/* Vertical line */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-0.5',
          status === 'active' && 'bg-accent',
          status === 'completed' && 'bg-success',
          status === 'inactive' && 'bg-border-custom',
        )}
        style={status === 'inactive' ? {
          background: 'repeating-linear-gradient(to bottom, var(--border) 0px, var(--border) 4px, transparent 4px, transparent 8px)',
          width: '2px',
        } : undefined}
      />
      {/* Arrow */}
      <div
        className={cn(
          'absolute bottom-0 left-1/2 -translate-x-1/2',
          'flow-connector-arrow',
          status === 'completed' && 'flow-connector-completed',
          status === 'inactive' && 'flow-connector-inactive',
          status === 'active' && 'animate-pulse',
        )}
      />
    </div>
  );
}
