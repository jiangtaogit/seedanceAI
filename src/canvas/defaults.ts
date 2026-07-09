import type { FlowNode, FlowEdge } from './types';

export function getDefaultLayout(): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const textNodeId = 'default-text-1';
  const videoGenNodeId = 'default-videogen-1';

  const nodes: FlowNode[] = [
    {
      id: textNodeId,
      type: 'textNode',
      position: { x: 80, y: 150 },
      data: {
        label: '提示词',
        prompt: '',
      },
    },
    {
      id: videoGenNodeId,
      type: 'videoGenNode',
      position: { x: 480, y: 120 },
      data: {
        label: '视频生成',
        model: 'doubao-seedance-1-0-pro-250328',
        mode: 'text-to-video',
        duration: 5,
        resolution: '720p',
        aspectRatio: '16:9',
        style: 'default',
        cfgScale: 7,
        seed: '',
        task: null,
        status: 'idle',
      },
    },
  ];

  const edges: FlowEdge[] = [
    {
      id: 'default-edge-1',
      source: textNodeId,
      sourceHandle: 'out',
      target: videoGenNodeId,
      targetHandle: 'prompt',
      type: 'animated',
      animated: true,
    },
  ];

  return { nodes, edges };
}
