import { useTranslation } from 'react-i18next';

export function PagePlaceholder({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {t('common.comingSoon')}
        </span>
      </div>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      <div className="rounded-lg border border-dashed border-border bg-card p-8 text-sm text-muted-foreground">
        {t('common.comingSoon')}
      </div>
    </section>
  );
}
