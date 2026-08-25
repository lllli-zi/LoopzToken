import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const Route = createFileRoute('/console/keys')({
  component: ConsoleKeysPage,
});

// TODO: API Key 列表与创建（完整 Key 只展示一次，KEY-001/002）
function ConsoleKeysPage() {
  const { t } = useTranslation();
  return <PagePlaceholder title={t('console.keysTitle')} />;
}
