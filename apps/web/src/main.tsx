import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

import { queryClient } from '@/lib/query-client';
import { router } from '@/router';
import { uiStore } from '@/stores/ui-store';

import '@/i18n';
import '@/styles/index.css';

// 启动时读取持久化的侧边栏偏好（Zustand persist 由后续需要时接入）
void uiStore.getState();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <RouterProvider router={router} />
        <Toaster richColors position="top-center" />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
