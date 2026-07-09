import { useCallback, useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Film, Music, Pencil, ZoomIn } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { UploadFile, FileRole } from '@/types';

// ============ Upload file to server and return server path ============

async function uploadFileToServer(file: File): Promise<{ serverPath: string; fileId: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const resp = await fetch('/api/upload', { method: 'POST', body: formData });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed (${resp.status})`);
  }
  const data = await resp.json();
  return { serverPath: data.data.filename, fileId: data.data.id };
}

// ============ Role-based File Upload Component ============

interface RoleFileUploadProps {
  role: FileRole;
  label: string;
  acceptTypes: string[];
  maxFiles: number;
  maxSize?: number;
  files: UploadFile[];
  onAdd: (file: UploadFile) => void;
  onRemove: (id: string) => void;
  onRename?: (id: string, refName: string) => void;
}

/** Generate refName from filename (strip extension) */
function toRefName(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.substring(0, dot) : filename;
}

export function RoleFileUpload({
  role,
  label,
  acceptTypes,
  maxFiles,
  maxSize = 20 * 1024 * 1024,
  files,
  onAdd,
  onRemove,
  onRename,
}: RoleFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const typeLabel = acceptTypes.join(',').includes('audio') ? 'MP3/WAV/M4A/AAC/OGG'
    : acceptTypes.join(',').includes('video') ? 'MP4/MOV'
    : 'JPG/PNG/WebP';

  // Validate image/video dimensions meet ARK API requirements
  const validateMediaDimensions = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          const { width, height } = img;
          // ARK API: width and height must be in [300, 6000]
          if (width < 300 || height < 300) {
            reject(new Error(`图片尺寸 ${width}×${height}px 不满足要求，宽高均需 ≥ 300px`));
          } else if (width > 6000 || height > 6000) {
            reject(new Error(`图片尺寸 ${width}×${height}px 过大，宽高均需 ≤ 6000px`));
          } else if (width * height < 409600) {
            reject(new Error(`图片总像素 ${width}×${height} 过小，需 ≥ 640×640 (409600px²)`));
          } else if (width / height > 2.5 || width / height < 0.4) {
            reject(new Error(`图片宽高比 ${width}/${height} ≈ ${(width / height).toFixed(2)} 超出范围，需在 0.4~2.5 之间`));
          } else {
            resolve();
          }
          URL.revokeObjectURL(img.src);
        };
        img.onerror = () => {
          URL.revokeObjectURL(img.src);
          reject(new Error('无法读取图片尺寸'));
        };
        img.src = URL.createObjectURL(file);
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.onloadedmetadata = () => {
          const { videoWidth: width, videoHeight: height } = video;
          if (width < 300 || height < 300) {
            reject(new Error(`视频尺寸 ${width}×${height}px 不满足要求，宽高均需 ≥ 300px`));
          } else {
            resolve();
          }
          URL.revokeObjectURL(video.src);
        };
        video.onerror = () => {
          URL.revokeObjectURL(video.src);
          reject(new Error('无法读取视频尺寸'));
        };
        video.src = URL.createObjectURL(file);
      } else {
        resolve(); // Audio files don't have dimension requirements
      }
    });
  };

  const handleFiles = useCallback(async (fileList: FileList) => {
    setError('');
    const newFiles = Array.from(fileList);
    if (files.length + newFiles.length > maxFiles) {
      setError(`最多上传 ${maxFiles} 个文件`);
      return;
    }
    for (const file of newFiles) {
      if (!acceptTypes.includes(file.type)) {
        setError(`仅支持 ${typeLabel} 格式`);
        return;
      }
      if (file.size > maxSize) {
        setError('单文件最大 20MB');
        return;
      }
      try {
        // Validate media dimensions before uploading
        await validateMediaDimensions(file);
        // Upload to server first, get server path
        const { serverPath } = await uploadFileToServer(file);
        const thumb = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
        onAdd({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          url: serverPath,  // Use server path, NOT blob URL
          thumbnailUrl: thumb,
          file,
          role,
          refName: toRefName(file.name), // auto-set refName
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : '上传失败');
      }
    }
  }, [files.length, onAdd, acceptTypes, maxFiles, maxSize, typeLabel, role]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const formatSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(1)}KB` : `${(b / 1024 / 1024).toFixed(1)}MB`;

  const roleColors: Record<string, string> = {
    first_frame: 'text-blue-400',
    last_frame: 'text-purple-400',
    reference_image: 'text-green-400',
    reference_video: 'text-orange-400',
    reference_audio: 'text-pink-400',
  };

  // Rename handlers
  const startEditing = (f: UploadFile) => {
    setEditingId(f.id);
    setEditValue(f.refName || toRefName(f.name));
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const confirmEdit = () => {
    if (editingId && editValue.trim() && onRename) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-primary">{label}</span>
        {maxFiles > 1 && <span className="text-[10px] text-text-secondary">{files.length}/{maxFiles}</span>}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors',
          dragActive ? 'border-accent bg-accent/5' : 'border-border-custom hover:border-accent/50'
        )}
      >
        <Upload className="mx-auto mb-1 text-text-secondary" size={18} />
        <p className="text-xs text-text-secondary">拖拽或点击上传</p>
        <p className="text-[10px] text-text-secondary/60 mt-0.5">{typeLabel} | 最大20MB{maxFiles > 1 ? ` | 最多${maxFiles}个` : ''}</p>
        <input
          ref={inputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={acceptTypes.join(',')}
          onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ''; }}
          className="hidden"
        />
      </div>

      {error && <p className="text-xs text-error">{error}</p>}

      <AnimatePresence>
        {files.map((f) => {
          const displayName = f.refName || toRefName(f.name);
          const isEditing = editingId === f.id;
          const isImage = f.type.startsWith('image/');
          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-bg-card rounded-lg overflow-hidden"
            >
              {/* Top row: refName + actions */}
              <div className="flex items-center justify-between px-2 pt-2 pb-1">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      ref={editInputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={confirmEdit}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') confirmEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="w-full bg-bg-primary border border-accent rounded px-1.5 py-0.5 text-xs text-text-primary focus:outline-none"
                    />
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-accent truncate">@{displayName}</span>
                      {onRename && (
                        <button
                          onClick={() => startEditing(f)}
                          className="p-0.5 hover:bg-accent/10 rounded transition-colors flex-shrink-0"
                          title="重命名引用名"
                        >
                          <Pencil size={10} className="text-text-secondary hover:text-accent" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button onClick={() => onRemove(f.id)} className="p-1 hover:bg-error/20 rounded transition-colors flex-shrink-0">
                  <X size={12} className="text-text-secondary hover:text-error" />
                </button>
              </div>

              {/* Image/Video preview — larger, clickable */}
              {isImage && f.thumbnailUrl ? (
                <div
                  className="relative mx-2 mb-2 rounded-md overflow-hidden cursor-zoom-in group"
                  onClick={() => setPreviewUrl(f.thumbnailUrl!)}
                >
                  <img
                    src={f.thumbnailUrl}
                    alt={displayName}
                    className="w-full h-24 object-cover rounded-md"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                  </div>
                  <span className="absolute bottom-1 right-1 text-[9px] text-white/70 bg-black/50 px-1 rounded">
                    {formatSize(f.size)}
                  </span>
                </div>
              ) : (
                <div className="mx-2 mb-2 h-12 rounded-md bg-border-custom/20 flex items-center justify-center gap-2">
                  {f.type.startsWith('video/') ? (
                    <Film size={16} className={roleColors[role] || 'text-accent'} />
                  ) : f.type.startsWith('audio/') ? (
                    <Music size={16} className={roleColors[role] || 'text-accent'} />
                  ) : (
                    <ImageIcon size={16} className={roleColors[role] || 'text-accent'} />
                  )}
                  <span className="text-[10px] text-text-secondary">{formatSize(f.size)}</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Image preview modal */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[999] bg-black/80 flex items-center justify-center p-8"
            onClick={() => setPreviewUrl(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              transition={{ duration: 0.15 }}
              src={previewUrl}
              alt="preview"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={20} className="text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ Legacy FileUpload (backward compat) ============

const LEGACY_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
const LEGACY_MAX_SIZE = 20 * 1024 * 1024;
const LEGACY_MAX_FILES = 5;

export default function FileUpload() {
  const { useStore } = require('@/store/useStore');
  const { uploadedFiles, addFile, removeFile } = useStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = useCallback((fileList: FileList) => {
    setError('');
    const newFiles = Array.from(fileList);
    if (uploadedFiles.length + newFiles.length > LEGACY_MAX_FILES) {
      setError(`最多上传 ${LEGACY_MAX_FILES} 个文件`);
      return;
    }
    for (const file of newFiles) {
      if (!LEGACY_ACCEPTED_TYPES.includes(file.type)) {
        setError('仅支持 JPG/PNG/WebP/MP4/MOV 格式');
        return;
      }
      if (file.size > LEGACY_MAX_SIZE) {
        setError('单文件最大 20MB');
        return;
      }
      const thumb = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
      addFile({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
        thumbnailUrl: thumb,
        file,
      });
    }
  }, [uploadedFiles.length, addFile]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const formatSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(1)}KB` : `${(b / 1024 / 1024).toFixed(1)}MB`;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors',
          dragActive ? 'border-accent bg-accent/5' : 'border-border-custom hover:border-accent/50'
        )}
      >
        <Upload className="mx-auto mb-2 text-text-secondary" size={24} />
        <p className="text-sm text-text-secondary">拖拽文件到此处或点击选择</p>
        <p className="text-xs text-text-secondary/60 mt-1">JPG/PNG/WebP/MP4/MOV | 最大20MB | 最多5个</p>
        <input ref={inputRef} type="file" multiple accept={LEGACY_ACCEPTED_TYPES.join(',')} onChange={(e) => e.target.files && handleFiles(e.target.files)} className="hidden" />
      </div>

      {error && <p className="text-xs text-error">{error}</p>}

      <AnimatePresence>
        {uploadedFiles.map((f: UploadFile) => (
          <motion.div key={f.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3 bg-bg-card rounded-lg p-2">
            <div className="w-10 h-10 rounded-md bg-border-custom/30 flex items-center justify-center overflow-hidden flex-shrink-0">
              {f.thumbnailUrl ? <img src={f.thumbnailUrl} alt="" className="w-full h-full object-cover" /> : f.type.startsWith('video/') ? <Film size={16} className="text-accent" /> : <ImageIcon size={16} className="text-accent" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate text-text-primary">{f.name}</p>
              <p className="text-xs text-text-secondary">{formatSize(f.size)}</p>
            </div>
            <button onClick={() => removeFile(f.id)} className="p-1 hover:bg-error/20 rounded-md transition-colors"><X size={14} className="text-text-secondary hover:text-error" /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
