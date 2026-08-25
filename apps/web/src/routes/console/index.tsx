import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { PagePlaceholder } from '@/components/layout/page-placeholder';
import { formatMicroCNY } from '@/lib/utils';

export const Route = createFileRoute('/console/')({
  component: ConsoleOverviewPage,
});

function ConsoleOverviewPage() {
  const { t } = useTranslation();

  // TODO: TanStack Query 拉取钱包余额与今日用量（Control API /v1/*）
  return (
    <PagePlaceholder
      title={t('console.overviewTitle')}
      description={`余额示例展示：${formatMicroCNY('12500000')}（金额格式化走整数微元，禁止浮点）`}
    />
  );
}
