import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';

import { ThemeToggle } from '@/components/layout/theme-toggle';

export function SiteHeader() {
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <nav className="flex items-center gap-6" aria-label="主导航">
          <Link to="/" className="text-base font-semibold tracking-tight">
            {t('common.appName')}
          </Link>
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t('nav.home')}
          </Link>
          <Link
            to="/console"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t('nav.console')}
          </Link>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
