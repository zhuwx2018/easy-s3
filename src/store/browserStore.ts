import { create } from 'zustand';

export interface S3Object {
  key: string;
  size: number;
  lastModified: string;
  isFolder: boolean;
}

interface BrowserStore {
  objects: S3Object[];
  currentBucket: string;
  currentPrefix: string;
  searchQuery: string;
  selectedObjects: string[];
  setObjects: (objects: S3Object[]) => void;
  setCurrentBucket: (bucket: string) => void;
  setCurrentPrefix: (prefix: string) => void;
  setSearchQuery: (query: string) => void;
  setSelectedObjects: (keys: string[]) => void;
  toggleSelected: (key: string) => void;
}

export const useBrowserStore = create<BrowserStore>((set) => ({
  objects: [],
  currentBucket: '',
  currentPrefix: '',
  searchQuery: '',
  selectedObjects: [],
  setObjects: (objects) => set({ objects }),
  setCurrentBucket: (bucket) => set({ currentBucket: bucket, currentPrefix: '' }),
  setCurrentPrefix: (prefix) => set({ currentPrefix: prefix }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedObjects: (keys) => set({ selectedObjects: keys }),
  toggleSelected: (key) =>
    set((state) => ({
      selectedObjects: state.selectedObjects.includes(key)
        ? state.selectedObjects.filter((k) => k !== key)
        : [...state.selectedObjects, key],
    })),
}));