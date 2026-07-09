import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';

export default function AnimatedEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: 'var(--accent)', strokeWidth: 2 }} />
      {/* Flowing dot along the edge */}
      <circle r="3" fill="var(--accent)" opacity={0.8}>
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>
    </>
  );
}
