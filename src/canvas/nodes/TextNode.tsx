import { memo, useState, useRef, useCallback, useEffect } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { X } from 'lucide-react';
import type { TextNodeData, ImageNodeData } from '@/canvas/types';
import type { UploadFile } from '@/types';
import { useFlowStore } from '@/store/useFlowStore';

type TextNodeType = Node<TextNodeData, 'textNode'>;

interface MentionItem {
  refName: string;
  fileId: string;
  fileName: string;
  thumbnailUrl?: string;
  nodeName: string;
}

function TextNode({ id, data }: NodeProps<TextNodeType>) {
  const updateNodeData = useFlowStore((s) => s.updateNodeData);
  const removeNode = useFlowStore((s) => s.removeNode);
  const nodes = useFlowStore((s) => s.nodes);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStart, setMentionStart] = useState(-1); // cursor position where @ was typed

  // Collect all mentionable files from ImageNode nodes
  const mentionItems: MentionItem[] = nodes
    .filter((n) => n.type === 'imageNode')
    .flatMap((n) => {
      const imgData = n.data as ImageNodeData;
      return imgData.files.map((f: UploadFile) => ({
        refName: f.refName || (f.name.includes('.') ? f.name.substring(0, f.name.lastIndexOf('.')) : f.name),
        fileId: f.id,
        fileName: f.name,
        thumbnailUrl: f.thumbnailUrl,
        nodeName: imgData.label,
      }));
    });

  // Filtered items based on what user typed after @
  const filteredItems = mentionItems.filter((item) =>
    item.refName.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  // Handle textarea change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;

    updateNodeData(id, { prompt: value });

    // Check if user just typed @ or is continuing to type after @
    // Find the @ that precedes the cursor
    const textBeforeCursor = value.substring(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\S*)$/);

    if (atMatch) {
      setMentionOpen(true);
      setMentionFilter(atMatch[1]);
      setMentionStart(cursorPos - atMatch[0].length);
      setMentionIndex(0);
    } else {
      setMentionOpen(false);
      setMentionStart(-1);
    }
  }, [id, updateNodeData]);

  // Insert mention into prompt
  const insertMention = useCallback((item: MentionItem) => {
    const textarea = textareaRef.current;
    if (!textarea || mentionStart < 0) return;

    const before = data.prompt.substring(0, mentionStart);
    const after = data.prompt.substring(textarea.selectionStart);
    const newText = `${before}@${item.refName} ${after}`;

    updateNodeData(id, { prompt: newText });
    setMentionOpen(false);
    setMentionStart(-1);

    // Restore cursor position after React re-render
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const newCursorPos = before.length + item.refName.length + 2; // @refName + space
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
        textareaRef.current.focus();
      }
    });
  }, [data.prompt, id, mentionStart, updateNodeData]);

  // Handle keydown for mention list navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionOpen || filteredItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIndex((i) => Math.min(i + 1, filteredItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(filteredItems[mentionIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setMentionOpen(false);
    }
  }, [mentionOpen, filteredItems, mentionIndex, insertMention]);

  // Close mention popup on click outside
  useEffect(() => {
    if (!mentionOpen) return;
    const handler = () => setMentionOpen(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [mentionOpen]);

  return (
    <div className="flow-node-enter glass rounded-xl w-[280px]">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-xs font-medium text-text-primary flex items-center gap-1.5">
          <span className="text-sm">📝</span> 提示词
        </span>
        <button
          onClick={() => removeNode(id)}
          className="p-0.5 rounded hover:bg-error/20 text-text-secondary hover:text-error transition-colors"
        >
          <X size={12} />
        </button>
      </div>

      {/* 内容区 */}
      <div className="px-3 pb-3 relative">
        <textarea
          ref={textareaRef}
          value={data.prompt}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="描述视频内容... 输入 @ 引用素材"
          rows={4}
          maxLength={1000}
          className="w-full bg-bg-primary border border-border-custom rounded-lg p-2.5 text-xs text-text-primary placeholder:text-text-secondary/50 resize-none focus:border-accent focus:outline-none transition-colors"
          onPointerDownCapture={(e) => e.stopPropagation()}
        />
        <div className="text-[10px] text-right text-text-secondary mt-1">
          {data.prompt.length}/1000
        </div>

        {/* @ Mention Popup */}
        {mentionOpen && filteredItems.length > 0 && (
          <div
            className="absolute left-3 bottom-12 z-50 glass-strong rounded-lg py-1 w-[252px] max-h-[160px] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[10px] text-text-secondary px-2 py-1 border-b border-white/[0.06]">
              引用素材 — 输入筛选，↑↓选择，回车插入
            </div>
            {filteredItems.map((item, idx) => (
              <button
                key={`${item.fileId}-${item.refName}`}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs transition-colors ${
                  idx === mentionIndex
                    ? 'bg-accent/15 text-accent'
                    : 'text-text-primary hover:bg-white/[0.04]'
                }`}
                onClick={() => insertMention(item)}
                onMouseEnter={() => setMentionIndex(idx)}
              >
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt="" className="w-6 h-6 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded bg-border-custom/30 flex items-center justify-center flex-shrink-0 text-[10px] text-text-secondary">
                    📷
                  </div>
                )}
                <span className="flex-1 truncate">
                  <span className="text-accent">@{item.refName}</span>
                </span>
                <span className="text-[9px] text-text-secondary/60 truncate max-w-[60px]">
                  {item.nodeName}
                </span>
              </button>
            ))}
          </div>
        )}

        {mentionOpen && filteredItems.length === 0 && mentionItems.length > 0 && (
          <div
            className="absolute left-3 bottom-12 z-50 glass-strong rounded-lg px-2 py-2 w-[252px] text-[10px] text-text-secondary"
            onClick={(e) => e.stopPropagation()}
          >
            未找到匹配 "{mentionFilter}" 的素材
          </div>
        )}
      </div>

      {/* 输出 Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{ top: '50%' }}
      />
      <div
        className="absolute right-[-32px] top-1/2 -translate-y-1/2 text-[10px] text-accent pointer-events-none select-none"
        style={{ top: '50%' }}
      >
        提示词
      </div>
    </div>
  );
}

export default memo(TextNode);
