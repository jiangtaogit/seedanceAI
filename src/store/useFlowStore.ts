import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type {
  OnNodesChange, OnEdgesChange, OnConnect,
  NodeChange, EdgeChange, Connection,
} from '@xyflow/react';
import type { FlowNode, FlowEdge, TextNodeData, ImageNodeData, VideoGenNodeData } from '@/canvas/types';
import { getDefaultLayout } from '@/canvas/defaults';

// ============ Connection validation ============
function isValidConnection(connection: Connection, nodes: FlowNode[], edges: FlowEdge[]): boolean {
  const sourceNode = nodes.find(n => n.id === connection.source);
  const targetNode = nodes.find(n => n.id === connection.target);
  if (!sourceNode || !targetNode) return false;

  // Only connect to videoGenNode inputs
  if (targetNode.type !== 'videoGenNode') return false;
  if (!connection.targetHandle) return false;

  // Type matching
  if (sourceNode.type === 'textNode') {
    return connection.targetHandle === 'prompt';
  }
  if (sourceNode.type === 'imageNode') {
    const imageRole = (sourceNode.data as ImageNodeData).role;
    if (connection.targetHandle === 'first_frame' && imageRole === 'first_frame') return true;
    if (connection.targetHandle === 'last_frame' && imageRole === 'last_frame') return true;
    if (connection.targetHandle === 'reference_image' && imageRole === 'reference_image') return true;
    if (connection.targetHandle === 'reference_video' && imageRole === 'reference_video') return true;
    if (connection.targetHandle === 'reference_audio' && imageRole === 'reference_audio') return true;
    return false;
  }
  return false;
}

// ============ Store ============
interface FlowState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  onNodesChange: OnNodesChange<FlowNode>;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  addNode: (node: FlowNode) => void;
  removeNode: (nodeId: string) => void;
  addFlowEdge: (edge: FlowEdge) => void;
  setNodes: (nodes: FlowNode[]) => void;
  setEdges: (edges: FlowEdge[]) => void;
  resetCanvas: () => void;
}

const defaultLayout = getDefaultLayout();

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: defaultLayout.nodes,
  edges: defaultLayout.edges,

  onNodesChange: (changes: NodeChange<FlowNode>[]) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes: EdgeChange<FlowEdge>[]) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection: Connection) => {
    const { nodes, edges } = get();
    if (!isValidConnection(connection, nodes, edges)) return;

    // Remove existing edge to same target handle (one source per input)
    const filteredEdges = edges.filter(
      e => !(e.target === connection.target && e.targetHandle === connection.targetHandle)
    );

    set({
      edges: addEdge(
        { ...connection, type: 'animated', animated: true },
        filteredEdges
      ),
    });
  },

  updateNodeData: (nodeId, data) => {
    set({
      nodes: get().nodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } as FlowNode : n
      ),
    });
  },

  addNode: (node) => set({ nodes: [...get().nodes, node] }),

  removeNode: (nodeId) => set({
    nodes: get().nodes.filter(n => n.id !== nodeId),
    edges: get().edges.filter(e => e.source !== nodeId && e.target !== nodeId),
  }),

  addFlowEdge: (edge) => set({ edges: [...get().edges, edge] }),

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  resetCanvas: () => {
    const layout = getDefaultLayout();
    set({ nodes: layout.nodes, edges: layout.edges });
  },
}));
