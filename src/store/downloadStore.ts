import { create } from 'zustand';

export interface DownloadTask {
  id: string;
  fileName: string;
  key: string;
  bucket: string;
  totalBytes: number;
  downloadedBytes: number;
  status: 'downloading' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  localPath?: string;
  error?: string;
}

interface DownloadStore {
  tasks: DownloadTask[];
  addTask: (task: DownloadTask) => void;
  updateTask: (id: string, updates: Partial<DownloadTask>) => void;
  removeTask: (id: string) => void;
  clearCompleted: () => void;
}

export const useDownloadStore = create<DownloadStore>((set) => ({
  tasks: [],
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((t) => t.id === id ? { ...t, ...updates } : t),
  })),
  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id),
  })),
  clearCompleted: () => set((state) => ({
    tasks: state.tasks.filter((t) => t.status === 'downloading'),
  })),
}));
