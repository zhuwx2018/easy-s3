import { create } from 'zustand';

export interface UploadTask {
  id: string;
  fileName: string;
  key: string;
  bucket: string;
  totalBytes: number;
  uploadedBytes: number;
  status: 'uploading' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  error?: string;
}

interface UploadStore {
  tasks: UploadTask[];
  addTask: (task: UploadTask) => void;
  updateTask: (id: string, updates: Partial<UploadTask>) => void;
  removeTask: (id: string) => void;
  clearCompleted: () => void;
}

export const useUploadStore = create<UploadStore>((set) => ({
  tasks: [],
  addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
  updateTask: (id, updates) => set((state) => ({
    tasks: state.tasks.map((t) => t.id === id ? { ...t, ...updates } : t),
  })),
  removeTask: (id) => set((state) => ({
    tasks: state.tasks.filter((t) => t.id !== id),
  })),
  clearCompleted: () => set((state) => ({
    tasks: state.tasks.filter((t) => t.status === 'uploading'),
  })),
}));
