import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { PagePlaceholder } from '@/components/layout/page-placeholder';

export const Route = createFileRoute('/console/wallet')({
  component: ConsoleWalletPage,
});

// TODO: 余额、充值（微信/支付宝二维码）、订单与退款进度（PRD 7.2）
function ConsoleWalletPage() {
  const { t } = useTranslation();
  return <PagePlaceholder title={t('console.walletTitle')} />;
}
