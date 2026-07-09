import { useCallback } from 'react';
import { useFlowStore } from '@/store/useFlowStore';
import type { FlowNode, ImageNodeData } from '@/canvas/types';

/**
 * 提供添加节点和自动连线的动作。
 */
export function useNodeActions() {
  const nodes = useFlowStore((s) => s.nodes);
  const addNode = useFlowStore((s) => s.addNode);
  const removeNode = useFlowStore((s) => s.removeNode);
  const addFlowEdge = useFlowStore((s) => s.addFlowEdge);
  const setEdges = useFlowStore((s) => s.setEdges);
  const edges = useFlowStore((s) => s.edges);
  const resetCanvas = useFlowStore((s) => s.resetCanvas);

  /** Find the first (or default) VideoGenNode */
  const findVideoGenNode = useCallback((): FlowNode | undefined => {
    return nodes.find((n) => n.type === 'videoGenNode');
  }, [nodes]);

  /** Calculate next position avoiding overlaps */
  const getNextPosition = useCallback((): { x: number; y: number } => {
    // Place new nodes on the left side of the canvas, below existing nodes
    const leftNodes = nodes.filter((n) => n.position.x < 400);
    if (leftNodes.length === 0) {
      return { x: 80, y: 150 };
    }
    const maxY = Math.max(...leftNodes.map((n) => n.position.y));
    return { x: 80, y: maxY + 220 };
  }, [nodes]);

  /** Add a text node and auto-connect to VideoGenNode prompt handle */
  const addTextNode = useCallback(() => {
    const nodeId = `text-${Date.now()}`;
    const pos = getNextPosition();
    const node: FlowNode = {
      id: nodeId,
      type: 'textNode',
      position: pos,
      data: {
        label: '提示词',
        prompt: '',
      },
    };
    addNode(node);

    // Auto-connect to VideoGenNode
    const vgn = findVideoGenNode();
    if (vgn) {
      // Remove existing edge to prompt handle (replace)
      const filtered = edges.filter(
        (e) => !(e.target === vgn.id && e.targetHandle === 'prompt')
      );
      setEdges([
        ...filtered,
        {
          id: `edge-${nodeId}-prompt`,
          source: nodeId,
          sourceHandle: 'out',
          target: vgn.id,
          targetHandle: 'prompt',
          type: 'animated',
          animated: true,
        },
      ]);
    }
  }, [addNode, findVideoGenNode, getNextPosition, edges, setEdges]);

  /** Add an image node with the given role and auto-connect */
  const addImageNode = useCallback(
    (role: ImageNodeData['role']) => {
      const nodeId = `image-${role}-${Date.now()}`;
      const pos = getNextPosition();

      const roleLabels: Record<string, string> = {
        first_frame: '首帧图片',
        last_frame: '尾帧图片',
        reference_image: '参考图片',
        reference_video: '参考视频',
        reference_audio: '参考音频',
      };

      const roleAccepts: Record<string, string[]> = {
        first_frame: ['image/jpeg', 'image/png', 'image/webp'],
        last_frame: ['image/jpeg', 'image/png', 'image/webp'],
        reference_image: ['image/jpeg', 'image/png', 'image/webp'],
        reference_video: ['video/mp4', 'video/quicktime'],
        reference_audio: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac'],
      };

      const roleMaxFiles: Record<string, number> = {
        first_frame: 1,
        last_frame: 1,
        reference_image: 9,
        reference_video: 3,
        reference_audio: 3,
      };

      const node: FlowNode = {
        id: nodeId,
        type: 'imageNode',
        position: pos,
        data: {
          label: roleLabels[role] || role,
          role,
          acceptTypes: roleAccepts[role] || [],
          maxFiles: roleMaxFiles[role] || 1,
          files: [],
        },
      };
      addNode(node);

      // Auto-connect to VideoGenNode
      const vgn = findVideoGenNode();
      if (vgn) {
        const targetHandle = role; // handle id matches role name
        // Remove existing edge to this handle (replace)
        const filtered = edges.filter(
          (e) => !(e.target === vgn.id && e.targetHandle === targetHandle)
        );
        setEdges([
          ...filtered,
          {
            id: `edge-${nodeId}-${targetHandle}`,
            source: nodeId,
            sourceHandle: 'out',
            target: vgn.id,
            targetHandle,
            type: 'animated',
            animated: true,
          },
        ]);
      }
    },
    [addNode, findVideoGenNode, getNextPosition, edges, setEdges]
  );

  /** Add a new VideoGenNode */
  const addVideoGenNode = useCallback(() => {
    const nodeId = `videogen-${Date.now()}`;
    const pos = { x: 480, y: 120 + nodes.filter((n) => n.type === 'videoGenNode').length * 300 };
    const node: FlowNode = {
      id: nodeId,
      type: 'videoGenNode',
      position: pos,
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
    };
    addNode(node);
  }, [addNode, nodes]);

  return {
    addTextNode,
    addImageNode,
    addVideoGenNode,
    removeNodeById: removeNode,
    resetCanvas,
  };
}
