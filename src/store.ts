import { create } from 'zustand';
import type { TokenRecord } from './types';

type State = {
  token: string | null;
  expiresAt?: number;
  set: (rec: TokenRecord) => void;
  clear: () => void;
  isExpired: () => boolean;
};

function createStore() {
  return create<State>((set, get) => ({
    token: null,
    expiresAt: undefined,
    set: (rec) => set({ token: rec.token, expiresAt: rec.expiresAt }),
    clear: () => set({ token: null, expiresAt: undefined }),
    isExpired: () => {
      const { expiresAt } = get();
      return typeof expiresAt === 'number' && Date.now() >= expiresAt;
    },
  }));
}

// global singleton (เผื่อมีหลุด share config)
const g = globalThis as any;
if (!g.__mf_token_bridge_store__) {
  g.__mf_token_bridge_store__ = createStore();
}
export const useStore = g.__mf_token_bridge_store__ as ReturnType<typeof createStore>;
