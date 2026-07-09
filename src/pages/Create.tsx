import { ReactFlowProvider } from '@xyflow/react';
import CanvasPage from '@/canvas/CanvasPage';

export default function Create() {
  return (
    <div className="h-[calc(100vh-4rem)]">
      <ReactFlowProvider>
        <CanvasPage />
      </ReactFlowProvider>
    </div>
  );
}
