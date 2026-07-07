import { create } from 'zustand';

export type StockApi = 'sina' | 'tencent';

interface SettingsStore {
  stockApi: StockApi;
  setStockApi: (api: StockApi) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  stockApi: 'sina',
  setStockApi: (api) => set({ stockApi: api }),
}));
