import { useMemo } from 'react';
import { useFlowStore } from '@/store/useFlowStore';
import type { FlowNode, FlowEdge, TextNodeData, ImageNodeData, VideoGenNodeData } from '@/canvas/types';
import type { CreateTaskParams, UploadFile } from '@/types';

export interface ResolvedParams {
  nodeId: string;
  params: CreateTaskParams;
  validationErrors: string[];
}

// ============ @ Mention Parsing ============

/**
 * Parse @mentions in the prompt and match them to files.
 * Returns only the files that are @mentioned.
 * If no @mentions found, returns all files (backward compat).
 */
export function parseMentions(
  prompt: string,
  allFiles: { role: string; files: UploadFile[] }[]
): {
  mentionedFiles: { role: string; files: UploadFile[] }[];
  hasMentions: boolean;
  unmatchedMentions: string[];
} {
  // Extract @refName from prompt
  const mentionRegex = /@(\S+)/g;
  const mentions: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = mentionRegex.exec(prompt)) !== null) {
    mentions.push(match[1]);
  }

  if (mentions.length === 0) {
    // No @mentions: return all files (backward compat)
    return { mentionedFiles: allFiles, hasMentions: false, unmatchedMentions: [] };
  }

  // Build a map of refName → file for quick lookup
  const refNameMap = new Map<string, { role: string; file: UploadFile }>();
  for (const group of allFiles) {
    for (const f of group.files) {
      const refName = f.refName || (f.name.includes('.') ? f.name.substring(0, f.name.lastIndexOf('.')) : f.name);
      refNameMap.set(refName.toLowerCase(), { role: group.role, file: f });
    }
  }

  // Match mentions to files
  const matchedByRole = new Map<string, UploadFile[]>();
  const unmatched: string[] = [];

  for (const m of mentions) {
    const entry = refNameMap.get(m.toLowerCase());
    if (entry) {
      const existing = matchedByRole.get(entry.role) || [];
      if (!existing.find((f) => f.id === entry.file.id)) {
        existing.push(entry.file);
      }
      matchedByRole.set(entry.role, existing);
    } else {
      if (!unmatched.includes(m)) {
        unmatched.push(m);
      }
    }
  }

  // Convert map to array
  const mentionedFiles: { role: string; files: UploadFile[] }[] = [];
  matchedByRole.forEach((files, role) => {
    mentionedFiles.push({ role, files });
  });

  return { mentionedFiles, hasMentions: true, unmatchedMentions: unmatched };
}

// ============ Main Hook ============

/**
 * 从画布图中派生出 CreateTaskParams，用于提交生成任务。
 * 找到第一个 VideoGenNode，根据连线汇聚所有输入源的数据。
 */
export function useGraphToParams(): ResolvedParams | null {
  const nodes = useFlowStore((s) => s.nodes);
  const edges = useFlowStore((s) => s.edges);

  return useMemo(() => {
    // 找到第一个 VideoGenNode
    const videoGenNode = nodes.find((n) => n.type === 'videoGenNode') as
      | FlowNode & { data: VideoGenNodeData }
      | undefined;

    if (!videoGenNode) {
      return null;
    }

    const vgData = videoGenNode.data;
    const errors: string[] = [];

    // 基础参数来自 VideoGenNode 自身
    const params: CreateTaskParams = {
      prompt: '',
      duration: vgData.duration,
      resolution: vgData.resolution,
      aspectRatio: vgData.aspectRatio,
      style: vgData.style === 'default' ? undefined : vgData.style,
      cfgScale: vgData.cfgScale,
      seed: vgData.seed ? Number(vgData.seed) : undefined,
      model: vgData.model,
      mode: vgData.mode,
    };

    // 遍历所有 target 为此 VideoGenNode 的边，汇聚输入
    const incomingEdges = edges.filter((e) => e.target === videoGenNode.id);

    // Collect prompt and all files by role
    let prompt = '';
    const allFilesByRole: { role: string; files: UploadFile[] }[] = [];

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;

      const targetHandle = edge.targetHandle;

      if (sourceNode.type === 'textNode' && targetHandle === 'prompt') {
        const textData = sourceNode.data as TextNodeData;
        if (textData.prompt.trim()) {
          prompt = textData.prompt.trim();
        }
      }

      if (sourceNode.type === 'imageNode') {
        const imageData = sourceNode.data as ImageNodeData;
        const files = imageData.files;

        if (targetHandle === 'first_frame') {
          allFilesByRole.push({ role: 'first_frame', files });
        } else if (targetHandle === 'last_frame') {
          allFilesByRole.push({ role: 'last_frame', files });
        } else if (targetHandle === 'reference_image') {
          allFilesByRole.push({ role: 'reference_image', files });
        } else if (targetHandle === 'reference_video') {
          allFilesByRole.push({ role: 'reference_video', files });
        } else if (targetHandle === 'reference_audio') {
          allFilesByRole.push({ role: 'reference_audio', files });
        }
      }
    }

    // Parse @mentions in prompt to filter files
    const { mentionedFiles, hasMentions, unmatchedMentions } = parseMentions(prompt, allFilesByRole);

    // Apply prompt
    params.prompt = prompt;

    // Apply files (from mention resolution or all files)
    for (const group of mentionedFiles) {
      if (group.role === 'first_frame' && group.files.length > 0) {
        params.files = group.files;
      } else if (group.role === 'last_frame' && group.files.length > 0) {
        params.lastFrameFile = group.files[0];
      } else if (group.role === 'reference_image') {
        params.referenceImages = [...(params.referenceImages || []), ...group.files];
      } else if (group.role === 'reference_video') {
        params.referenceVideos = [...(params.referenceVideos || []), ...group.files];
      } else if (group.role === 'reference_audio') {
        params.referenceAudios = [...(params.referenceAudios || []), ...group.files];
      }
    }

    // Warn about unmatched mentions
    if (unmatchedMentions.length > 0) {
      errors.push(`提示词中 @${unmatchedMentions.join(', @')} 未匹配到素材文件`);
    }

    // 根据模式推断 mode
    const hasFirstFrame = !!(params.files && params.files.length > 0);
    const hasLastFrame = !!params.lastFrameFile;
    const hasRefImages = !!(params.referenceImages && params.referenceImages.length > 0);
    const hasRefVideos = !!(params.referenceVideos && params.referenceVideos.length > 0);
    const hasRefAudios = !!(params.referenceAudios && params.referenceAudios.length > 0);
    const hasPrompt = !!params.prompt;

    // Auto-detect mode based on inputs
    // Models that support multimodal-reference
    const MULTIMODAL_MODELS = ['doubao-seedance-2-0-260128', 'doubao-seedance-2-0-fast-260128'];
    const modelSupportsMultimodal = MULTIMODAL_MODELS.includes(params.model || '');

    if (hasFirstFrame && hasLastFrame) {
      params.mode = 'image-to-video-both';
    } else if (hasFirstFrame) {
      params.mode = 'image-to-video';
    } else if (hasRefImages && !modelSupportsMultimodal) {
      // Model doesn't support multimodal-reference: treat first ref image as first_frame
      params.mode = 'image-to-video';
      params.files = [params.referenceImages![0]];
      params.referenceImages = params.referenceImages!.slice(1);
      if (params.referenceImages!.length === 0) delete params.referenceImages;
    } else if (hasRefImages || hasRefVideos || hasRefAudios) {
      params.mode = 'multimodal-reference';
    } else if (hasPrompt) {
      params.mode = 'text-to-video';
    }

    // Validation
    if (!hasPrompt && !hasFirstFrame && !hasRefImages && !hasRefVideos && !hasRefAudios) {
      errors.push('请输入提示词或上传素材文件');
    }

    if (params.mode === 'text-to-video' && !hasPrompt) {
      errors.push('文生视频模式需要输入提示词');
    }

    if (params.mode === 'image-to-video' && !hasFirstFrame) {
      errors.push('图生视频模式需要上传首帧图片');
    }

    if (params.mode === 'image-to-video-both' && !hasFirstFrame) {
      errors.push('首尾帧模式需要上传首帧图片');
    }

    if (params.mode === 'image-to-video-both' && !hasLastFrame) {
      errors.push('首尾帧模式需要上传尾帧图片');
    }

    return {
      nodeId: videoGenNode.id,
      params,
      validationErrors: errors,
    };
  }, [nodes, edges]);
}
