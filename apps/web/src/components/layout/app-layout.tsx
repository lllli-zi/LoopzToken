import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { ThemeToggle } from '@/components/layout/theme-toggle';
import { useUiStore } from '@/stores/ui-store';

export interface AppLayoutNavItem {
  to: string;
  labelKey: string;
}

/**
 * 控制台 / 运营后台共用布局：顶栏 + 侧边导航 + 内容区。
 */
export function AppLayout({
  items,
  children,
}: {
  items: AppLayoutNavItem[];
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="rounded-md border border-border px-2 py-1 text-sm md:hidden"
              aria-label="切换侧边栏"
              onClick={toggleSidebar}
            >
              ☰
            </button>
            <Link to="/" className="text-base font-semibold tracking-tight">
              {t('common.appName')}
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1">
        <aside
          className={`${sidebarOpen ? 'block' : 'hidden'} w-56 shrink-0 border-r border-border bg-card p-3 md:block`}
        >
          <nav className="flex flex-col gap-1" aria-label="功能导航">
            {items.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeOptions={{ exact: item.to.split('/').filter(Boolean).length === 1 }}
                activeProps={{
                  className:
                    'rounded-md px-3 py-2 text-sm bg-muted text-foreground font-medium',
                }}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
