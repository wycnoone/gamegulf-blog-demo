import type { BlogLocale } from '@/lib/i18n';
import { t, type UIKey } from '@/lib/translations';

type TrustModuleProps = {
  locale: BlogLocale;
  compact?: boolean;
};

const trustItemKeys: UIKey[] = [
  'trust.item1', 'trust.item2', 'trust.item3', 'trust.item4', 'trust.item5',
];

export function TrustModule({ locale, compact = false }: TrustModuleProps) {
  return (
    <section className={`trust-module ${compact ? 'compact' : ''}`}>
      <div className="trust-header">
        <h2>{t(locale, 'trust.title')}</h2>
        <p>{t(locale, 'trust.subtitle')}</p>
      </div>
      <div className="trust-grid">
        {trustItemKeys.map((key, i) => (
          <div key={key} className="trust-item">
            <span className="trust-number" aria-hidden="true">{i + 1}</span>
            <span>{t(locale, key)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
