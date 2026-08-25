import { createFileRoute, Outlet } from '@tanstack/react-router';

import { AppLayout } from '@/components/layout/app-layout';

/**
 * 认证布局（UI_TECH_STACK 4）。
 * TODO: beforeLoad 调用 Control API 校验登录会话并跳转登录页；
 * 服务端仍必须再次鉴权，前端路由保护仅为体验优化。
 */
export const Route = createFileRoute('/console')({
  component: ConsoleLayout,
});

function ConsoleLayout() {
  return (
    <AppLayout
      items={[
        { to: '/console', labelKey: 'nav.overview' },
        { to: '/console/keys', labelKey: 'nav.apiKeys' },
        { to: '/console/usage', labelKey: 'nav.usage' },
        { to: '/console/wallet', labelKey: 'nav.wallet' },
      ]}
    >
      <Outlet />
    </AppLayout>
  );
}
