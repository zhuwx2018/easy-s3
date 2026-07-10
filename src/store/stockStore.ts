import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

interface StockStore {
  stocks: Stock[];
  loading: boolean;
  error: string | null;
  addStock: (stock: Stock) => void;
  removeStock: (symbol: string) => void;
  updateStock: (symbol: string, updates: Partial<Stock>) => void;
  reorderStocks: (fromIndex: number, toIndex: number) => void;
  setStocks: (stocks: Stock[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useStockStore = create<StockStore>()(
  persist(
    (set) => ({
      stocks: [],
      loading: false,
      error: null,
      addStock: (stock) => set((state) => {
        if (state.stocks.some(s => s.symbol === stock.symbol)) {
          return state;
        }
        return { stocks: [...state.stocks, stock] };
      }),
      removeStock: (symbol) => set((state) => ({
        stocks: state.stocks.filter(s => s.symbol !== symbol),
      })),
      updateStock: (symbol, updates) => set((state) => ({
        stocks: state.stocks.map(s => s.symbol === symbol ? { ...s, ...updates } : s),
      })),
      reorderStocks: (fromIndex, toIndex) => set((state) => {
        const newStocks = [...state.stocks];
        const [removed] = newStocks.splice(fromIndex, 1);
        newStocks.splice(toIndex, 0, removed);
        return { stocks: newStocks };
      }),
      setStocks: (stocks) => set({ stocks }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'stock-storage', // localStorage key
    }
  )
);
