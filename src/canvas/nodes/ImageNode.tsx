import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { X } from 'lucide-react';
import type { ImageNodeData } from '@/canvas/types';
import type { UploadFile } from '@/types';
import { useFlowStore } from '@/store/useFlowStore';
import { RoleFileUpload } from '@/components/FileUpload';

type ImageNodeType = Node<ImageNodeData, 'imageNode'>;

const ROLE_CONFIG: Record<
  ImageNodeData['role'],
  { icon: string; label: string; accept: string[]; max: number }
> = {
  first_frame: {
    icon: '🖼️',
    label: '首帧图片',
    accept: ['image/jpeg', 'image/png', 'image/webp'],
    max: 1,
  },
  last_frame: {
    icon: '🖼️',
    label: '尾帧图片',
    accept: ['image/jpeg', 'image/png', 'image/webp'],
    max: 1,
  },
  reference_image: {
    icon: '📷',
    label: '参考图片',
    accept: ['image/jpeg', 'image/png', 'image/webp'],
    max: 9,
  },
  reference_video: {
    icon: '🎬',
    label: '参考视频',
    accept: ['video/mp4', 'video/quicktime'],
    max: 3,
  },
  reference_audio: {
    icon: '🎵',
    label: '参考音频',
    accept: ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac'],
    max: 3,
  },
};

function ImageNode({ id, data }: NodeProps<ImageNodeType>) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const removeNode = useFlowStore((s) => s.removeNode);
  const cfg = ROLE_CONFIG[data.role];

  const handleAdd = (file: UploadFile) => {
    const newFiles = data.role === 'first_frame' || data.role === 'last_frame'
      ? [file] // single file roles: replace
      : [...data.files, file];
    updateNodeData(id, { files: newFiles });
  };

  const handleRemove = (fileId: string) => {
    updateNodeData(id, { files: data.files.filter((f) => f.id !== fileId) });
  };

  const handleRename = (fileId: string, refName: string) => {
    updateNodeData(id, {
      files: data.files.map((f) => f.id === fileId ? { ...f, refName } : f),
    });
  };

  return (
    <div className="flow-node-enter glass rounded-xl w-[280px]">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-xs font-medium text-text-primary flex items-center gap-1.5">
          <span className="text-sm">{cfg.icon}</span> {cfg.label}
        </span>
        <button
          onClick={() => removeNode(id)}
          className="p-0.5 rounded hover:bg-error/20 text-text-secondary hover:text-error transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* 内容区：文件上传 */}
      <div className="px-3 pb-3" onPointerDownCapture={(e) => e.stopPropagation()}>
        <RoleFileUpload
          role={data.role}
          label={cfg.label}
          acceptTypes={cfg.accept}
          maxFiles={cfg.max}
          files={data.files}
          onAdd={handleAdd}
          onRemove={handleRemove}
          onRename={handleRename}
        />
      </div>

      {/* 输出 Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{ top: '50%' }}
      />
      <div className="absolute right-[-32px] top-1/2 -translate-y-1/2 text-[10px] text-accent pointer-events-none select-none">
        {cfg.label}
      </div>
    </div>
  );
}

export default memo(ImageNode);
