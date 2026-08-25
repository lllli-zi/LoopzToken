import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const Route = createFileRoute('/admin/')({
  component: AdminIndexPage,
});

// TODO: 用户、模型、价格版本、Provider、订单、退款、对账、风控、审计模块（PRD 7.3）
function AdminIndexPage() {
  const { t } = useTranslation();
  return <PagePlaceholder title={t('admin.title')} />;
}
