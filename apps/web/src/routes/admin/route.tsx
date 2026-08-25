import { createFileRoute, Outlet } from '@tanstack/react-router';

import { AppLayout } from '@/components/layout/app-layout';

/**
 * 管理员布局。
 * TODO: beforeLoad 校验管理员角色（服务端 RBAC 为准，前端仅路由隔离）。
 */
export const Route = createFileRoute('/admin')({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <AppLayout items={[{ to: '/admin', labelKey: 'nav.admin' }]}>
      <Outlet />
    </AppLayout>
  );
}
