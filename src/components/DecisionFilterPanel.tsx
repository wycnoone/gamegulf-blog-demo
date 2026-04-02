import type { QuickFilterKey } from '@/lib/blog';
import type { BlogLocale } from '@/lib/i18n';
import { t } from '@/lib/translations';

type FilterGroup = {
  title: string;
  filters: Array<{ key: QuickFilterKey; label: string }>;
};

type DecisionFilterPanelProps = {
  locale: BlogLocale;
  groups: FilterGroup[];
  activeFilters: QuickFilterKey[];
  onToggleFilter: (key: QuickFilterKey) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onReset?: () => void;
};

export function DecisionFilterPanel({
  locale,
  groups,
  activeFilters,
  onToggleFilter,
  searchValue,
  onSearchChange,
  onReset,
}: DecisionFilterPanelProps) {
  const hasSearch = typeof searchValue === 'string' && typeof onSearchChange === 'function';
  const hasGroups = groups.length > 0;

  return (
    <section className="decision-filter-panel">
      {hasSearch ? (
        <div className="decision-search-wrap">
          <label className="decision-search-label" htmlFor={`decision-search-${locale}`}>
            {t(locale, 'filter.searchLabel')}
          </label>
          <div className="decision-search-row">
            <input
              id={`decision-search-${locale}`}
              className="decision-search-input"
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t(locale, 'filter.searchPlaceholder')}
            />
            {onReset ? (
              <button type="button" className="button-link secondary" onClick={onReset}>
                {t(locale, 'filter.reset')}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {hasGroups ? (
        <div className="decision-chip-groups">
          {groups.map((group) => (
            <div key={group.title} className="decision-chip-group">
              <strong>{group.title}</strong>
              <div className="decision-chip-row">
                {group.filters.map((filter) => {
                  const isActive = activeFilters.includes(filter.key);
                  return (
                    <button
                      key={filter.key}
                      type="button"
                      className={`filter-chip ${isActive ? 'active' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => onToggleFilter(filter.key)}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
