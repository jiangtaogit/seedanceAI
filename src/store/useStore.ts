import { create } from 'zustand';
import type { Task, ApiConfig, UploadFile, TaskStatus } from '@/types';

interface AppState {
  // Tasks
  tasks: Task[];
  currentTask: Task | null;
  tasksTotal: number;
  tasksPage: number;
  tasksPageSize: number;
  taskFilter: TaskStatus | 'all';
  taskSearch: string;
  setTasks: (tasks: Task[]) => void;
  setCurrentTask: (task: Task | null) => void;
  setTasksTotal: (n: number) => void;
  setTasksPage: (p: number) => void;
  setTaskFilter: (f: TaskStatus | 'all') => void;
  setTaskSearch: (s: string) => void;
  updateTaskInList: (task: Task) => void;
  removeTask: (id: string) => void;

  // Config
  config: ApiConfig;
  setConfig: (c: ApiConfig) => void;

  // Model & Mode selection
  selectedModel: string;
  selectedMode: string;
  setSelectedModel: (m: string) => void;
  setSelectedMode: (m: string) => void;

  // Create form (persisted across tab switches)
  promptText: string;
  setPromptText: (v: string) => void;
  duration: number;
  setDuration: (v: number) => void;
  resolution: string;
  setResolution: (v: string) => void;
  aspectRatio: string;
  setAspectRatio: (v: string) => void;
  styleValue: string;
  setStyleValue: (v: string) => void;
  cfgScale: number;
  setCfgScale: (v: number) => void;
  seedValue: string;
  setSeedValue: (v: string) => void;

  // Upload - first frame (primary)
  uploadedFiles: UploadFile[];
  addFile: (f: UploadFile) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;

  // Upload - last frame
  lastFrameFile: UploadFile | null;
  setLastFrameFile: (f: UploadFile | null) => void;

  // Upload - reference images (multi-modal)
  referenceImageFiles: UploadFile[];
  addReferenceImage: (f: UploadFile) => void;
  removeReferenceImage: (id: string) => void;

  // Upload - reference videos (multi-modal)
  referenceVideoFiles: UploadFile[];
  addReferenceVideo: (f: UploadFile) => void;
  removeReferenceVideo: (id: string) => void;

  // Upload - reference audios (multi-modal)
  referenceAudioFiles: UploadFile[];
  addReferenceAudio: (f: UploadFile) => void;
  removeReferenceAudio: (id: string) => void;

  // Clear all reference files
  clearAllReferenceFiles: () => void;

  // UI
  isLoading: boolean;
  isCreating: boolean;
  sidebarCollapsed: boolean;
  setLoading: (v: boolean) => void;
  setCreating: (v: boolean) => void;
  toggleSidebar: () => void;

  // Flow steps
  activeStep: 1 | 2 | 3;
  setActiveStep: (step: 1 | 2 | 3) => void;
  expandedParams: boolean;
  toggleParams: () => void;
}

const defaultConfig: ApiConfig = {
  apiKey: '',
  accessKeyId: '',
  secretAccessKey: '',
  endpoint: 'https://ark.cn-beijing.volces.com',
  isConfigured: false,
  modelEndpoints: {},
};

export const useStore = create<AppState>((set) => ({
  // Tasks
  tasks: [],
  currentTask: null,
  tasksTotal: 0,
  tasksPage: 1,
  tasksPageSize: 10,
  taskFilter: 'all',
  taskSearch: '',
  setTasks: (tasks) => set({ tasks }),
  setCurrentTask: (currentTask) => set({ currentTask }),
  setTasksTotal: (tasksTotal) => set({ tasksTotal }),
  setTasksPage: (tasksPage) => set({ tasksPage }),
  setTaskFilter: (taskFilter) => set({ taskFilter, tasksPage: 1 }),
  setTaskSearch: (taskSearch) => set({ taskSearch, tasksPage: 1 }),
  updateTaskInList: (task) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === task.id ? task : t)),
      currentTask: s.currentTask?.id === task.id ? task : s.currentTask,
    })),
  removeTask: (id) =>
    set((s) => ({
      tasks: s.tasks.filter((t) => t.id !== id),
      tasksTotal: s.tasksTotal - 1,
    })),

  // Config
  config: defaultConfig,
  setConfig: (config) => set({ config }),

  // Model & Mode
  selectedModel: 'doubao-seedance-1-0-pro-250328',
  selectedMode: 'text-to-video',
  setSelectedModel: (selectedModel) => set({ selectedModel }),
  setSelectedMode: (selectedMode) => set({ selectedMode }),

  // Create form (persisted)
  promptText: '',
  setPromptText: (promptText) => set({ promptText }),
  duration: 5,
  setDuration: (duration) => set({ duration }),
  resolution: '720p',
  setResolution: (resolution) => set({ resolution }),
  aspectRatio: '16:9',
  setAspectRatio: (aspectRatio) => set({ aspectRatio }),
  styleValue: 'default',
  setStyleValue: (styleValue) => set({ styleValue }),
  cfgScale: 7,
  setCfgScale: (cfgScale) => set({ cfgScale }),
  seedValue: '',
  setSeedValue: (seedValue) => set({ seedValue }),

  // Upload - first frame
  uploadedFiles: [],
  addFile: (f) => set((s) => ({ uploadedFiles: [...s.uploadedFiles, f] })),
  removeFile: (id) => set((s) => ({ uploadedFiles: s.uploadedFiles.filter((f) => f.id !== id) })),
  clearFiles: () => set({ uploadedFiles: [] }),

  // Upload - last frame
  lastFrameFile: null,
  setLastFrameFile: (lastFrameFile) => set({ lastFrameFile }),

  // Upload - reference images
  referenceImageFiles: [],
  addReferenceImage: (f) => set((s) => ({ referenceImageFiles: [...s.referenceImageFiles, f] })),
  removeReferenceImage: (id) => set((s) => ({ referenceImageFiles: s.referenceImageFiles.filter((f) => f.id !== id) })),

  // Upload - reference videos
  referenceVideoFiles: [],
  addReferenceVideo: (f) => set((s) => ({ referenceVideoFiles: [...s.referenceVideoFiles, f] })),
  removeReferenceVideo: (id) => set((s) => ({ referenceVideoFiles: s.referenceVideoFiles.filter((f) => f.id !== id) })),

  // Upload - reference audios
  referenceAudioFiles: [],
  addReferenceAudio: (f) => set((s) => ({ referenceAudioFiles: [...s.referenceAudioFiles, f] })),
  removeReferenceAudio: (id) => set((s) => ({ referenceAudioFiles: s.referenceAudioFiles.filter((f) => f.id !== id) })),

  // Clear all reference files
  clearAllReferenceFiles: () => set({
    uploadedFiles: [],
    lastFrameFile: null,
    referenceImageFiles: [],
    referenceVideoFiles: [],
    referenceAudioFiles: [],
  }),

  // UI
  isLoading: false,
  isCreating: false,
  sidebarCollapsed: false,
  setLoading: (isLoading) => set({ isLoading }),
  setCreating: (isCreating) => set({ isCreating }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // Flow steps
  activeStep: 1,
  setActiveStep: (activeStep) => set({ activeStep }),
  expandedParams: true,
  toggleParams: () => set((s) => ({ expandedParams: !s.expandedParams })),
}));
