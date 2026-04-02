import { blogBasePath, type BlogLocale } from '@/lib/i18n';
import { t } from '@/lib/translations';

type DecisionEmptyStateProps = {
  locale: BlogLocale;
  onReset: () => void;
};

export function DecisionEmptyState({ locale, onReset }: DecisionEmptyStateProps) {
  return (
    <div className="decision-empty-state">
      <h3>{t(locale, 'empty.title')}</h3>
      <p>{t(locale, 'empty.description')}</p>
      <div className="decision-empty-actions">
        <button type="button" className="button-link" onClick={onReset}>
          {t(locale, 'empty.reset')}
        </button>
        <a href={`${blogBasePath}/${locale}/worth-it`} className="button-link secondary">
          {t(locale, 'empty.openWorthIt')}
        </a>
        <a href={`${blogBasePath}/${locale}/buy-now-or-wait`} className="button-link secondary">
          {t(locale, 'empty.openBuyOrWait')}
        </a>
      </div>
    </div>
  );
}
