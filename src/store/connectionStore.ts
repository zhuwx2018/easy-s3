import { create } from 'zustand';

export interface Connection {
  name: string;
  endpoint: string;
  accessKey: string;
  secretKey: string;
  useTLS: boolean;
}

interface ConnectionStore {
  connections: Connection[];
  currentConnection: Connection | null;
  setConnections: (connections: Connection[]) => void;
  addConnection: (connection: Connection) => void;
  removeConnection: (name: string) => void;
  setCurrentConnection: (connection: Connection | null) => void;
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  connections: [],
  currentConnection: null,
  setConnections: (connections) => set({ connections }),
  addConnection: (connection) =>
    set((state) => ({ connections: [...state.connections, connection] })),
  removeConnection: (name) =>
    set((state) => ({
      connections: state.connections.filter((c) => c.name !== name),
    })),
  setCurrentConnection: (connection) => set({ currentConnection: connection }),
}));