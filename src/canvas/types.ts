import type { Node, Edge } from '@xyflow/react';
import type { UploadFile, Task } from '@/types';

// ============ Node Type Enum ============
export type FlowNodeType = 'textNode' | 'imageNode' | 'videoGenNode';

// ============ Text Node Data ============
export interface TextNodeData {
  label: string;
  prompt: string;
  [key: string]: unknown;
}

// ============ Image Node Data ============
export interface ImageNodeData {
  label: string;
  role: 'first_frame' | 'last_frame' | 'reference_image' | 'reference_video' | 'reference_audio';
  acceptTypes: string[];
  maxFiles: number;
  files: UploadFile[];
  [key: string]: unknown;
}

// ============ Video Gen Node Data ============
export interface VideoGenNodeData {
  label: string;
  model: string;
  mode: string;
  duration: number;
  resolution: string;
  aspectRatio: string;
  style: string;
  cfgScale: number;
  seed: string;
  task: Task | null;
  status: 'idle' | 'validating' | 'creating' | 'polling' | 'completed' | 'failed';
  [key: string]: unknown;
}

// ============ Typed Nodes ============
export type TextNode = Node<TextNodeData, 'textNode'>;
export type ImageNode = Node<ImageNodeData, 'imageNode'>;
export type VideoGenNode = Node<VideoGenNodeData, 'videoGenNode'>;
export type FlowNode = TextNode | ImageNode | VideoGenNode;

export type FlowEdge = Edge<{
  animated?: boolean;
}>;

// ============ Resolved params for generate ============
export interface ResolvedVideoGenNode {
  nodeId: string;
  params: import('@/types').CreateTaskParams;
  validationErrors: string[];
}
