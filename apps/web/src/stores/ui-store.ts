import { create } from 'zustand';

/**
 * 客户端 UI 状态（UI_TECH_STACK 7.2）。
 * 余额、订单、模型等服务端数据一律走 TanStack Query，不放入长期 Store。
 */
interface UiState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const uiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

export const useUiStore = uiStore;
