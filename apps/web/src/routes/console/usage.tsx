import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const Route = createFileRoute('/console/usage')({
  component: ConsoleUsagePage,
});

// TODO: 逐请求用量明细（USAGE-001/002，TanStack Table + 服务端分页）
function ConsoleUsagePage() {
  const { t } = useTranslation();
  return <PagePlaceholder title={t('console.usageTitle')} />;
}
