import { createFileRoute, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { SiteHeader } from '@/components/layout/site-header';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-2xl space-y-6 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            {t('home.heroTitle')}
          </h1>
          <p className="text-muted-foreground">{t('home.heroSubtitle')}</p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/console">
              <Button size="lg">{t('home.ctaConsole')}</Button>
            </Link>
            {/* TODO: /models 模型与价格页（PRD 7.1） */}
            <Button size="lg" variant="outline" disabled>
              {t('home.ctaModels')}
            </Button>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © LoopzToken
      </footer>
    </div>
  );
}
