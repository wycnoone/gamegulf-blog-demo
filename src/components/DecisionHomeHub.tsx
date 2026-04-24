import { useMemo, useState } from 'react';
import { DecisionEmptyState } from './DecisionEmptyState';
import { DecisionFeaturedCardV2 } from './DecisionFeaturedCardV2';
import { DecisionFilterPanel } from './DecisionFilterPanel';
import { DecisionGridCard } from './DecisionGridCard';
import { quickFilterLabelMap, type DecisionEntryCardModel, type QuickFilterKey } from '@/lib/blog-shared';
import type { BlogLocale } from '@/lib/i18n';
import { t } from '@/lib/translations';

const GRID_PAGE_SIZE = 8;

type DecisionHomeHubProps = {
  locale: BlogLocale;
  cards: DecisionEntryCardModel[];
};

type HomeMode = 'all' | 'recommended_now' | 'wait_for_sale' | 'set_alert';

const PLAY_PROFILE_FILTERS: QuickFilterKey[] = [
  'co_op',
  'long_rpg',
  'family_friendly',
  'nintendo_first_party',
  'short_sessions',
];
const PRICE_FILTERS: QuickFilterKey[] = ['under_20', 'great_on_sale', 'rarely_discounted'];

function getFilterGroups(locale: BlogLocale) {
  return [
    {
      title: t(locale, 'filter.groupPlayProfile'),
      filters: PLAY_PROFILE_FILTERS.map((key) => ({ key, label: quickFilterLabelMap[key][locale] })),
    },
    {
      title: t(locale, 'filter.groupPrice'),
      filters: PRICE_FILTERS.map((key) => ({ key, label: quickFilterLabelMap[key][locale] })),
    },
  ];
}

function getIntentOptions(locale: BlogLocale) {
  return [
    {
      key: 'recommended_now' as const,
      label: t(locale, 'home.intent.readyToBuy'),
      desc: t(locale, 'home.intent.readyToBuyDesc'),
    },
    {
      key: 'wait_for_sale' as const,
      label: t(locale, 'home.intent.waitingForDeal'),
      desc: t(locale, 'home.intent.waitingForDealDesc'),
    },
    {
      key: 'set_alert' as const,
      label: t(locale, 'home.intent.stillDeciding'),
      desc: t(locale, 'home.intent.stillDecidingDesc'),
    },
    {
      key: 'all' as const,
      label: t(locale, 'home.intent.browseAll'),
      desc: t(locale, 'home.intent.browseAllDesc'),
    },
  ];
}

function getSectionCopy(locale: BlogLocale, mode: HomeMode) {
  switch (mode) {
    case 'recommended_now':
      return {
        featured: t(locale, 'home.section.buyNow.featured'),
        featuredDesc: t(locale, 'home.section.buyNow.featuredDesc'),
        latest: t(locale, 'home.section.buyNow.latest'),
      };
    case 'wait_for_sale':
      return {
        featured: t(locale, 'home.section.wait.featured'),
        featuredDesc: t(locale, 'home.section.wait.featuredDesc'),
        latest: t(locale, 'home.section.wait.latest'),
      };
    case 'set_alert':
      return {
        featured: t(locale, 'home.section.alert.featured'),
        featuredDesc: t(locale, 'home.section.alert.featuredDesc'),
        latest: t(locale, 'home.section.alert.latest'),
      };
    default:
      return {
        featured: t(locale, 'home.section.all.featured'),
        featuredDesc: t(locale, 'home.section.all.featuredDesc'),
        latest: t(locale, 'home.section.all.latest'),
      };
  }
}

function normalizeText(value: string) { return value.trim().toLowerCase(); }

function getSearchScore(card: DecisionEntryCardModel, query: string) {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 1;
  let total = 0;
  for (const token of tokens) {
    const fields = [
      { value: card.searchIndex.gameTitle, score: 100 },
      { value: card.searchIndex.title, score: 80 },
      { value: card.searchIndex.tags.join(' '), score: 60 },
      { value: card.searchIndex.quickFilters.join(' '), score: 56 },
      { value: card.searchIndex.communityVibe || '', score: 54 },
      { value: card.searchIndex.playtime || '', score: 52 },
      { value: card.whatItIs.toLowerCase(), score: 50 },
      { value: card.bestFor.toLowerCase(), score: 40 },
      { value: card.priceCallLabel.toLowerCase(), score: 20 },
    ];
    const match = fields.find((f) => f.value.includes(token));
    if (!match) return 0;
    total += match.score;
  }
  return total;
}

function matchesAllFilters(card: DecisionEntryCardModel, activeFilters: QuickFilterKey[]) {
  return activeFilters.every((f) => card.quickFilters.includes(f));
}

function formatGuidesCount(locale: BlogLocale, count: number) {
  return count === 1
    ? t(locale, 'home.guideCount', { count: String(count) })
    : t(locale, 'home.guidesCount', { count: String(count) });
}

export function DecisionHomeHub({ locale, cards }: DecisionHomeHubProps) {
  const intentOptions = useMemo(() => getIntentOptions(locale), [locale]);
  const filterGroups = useMemo(() => getFilterGroups(locale), [locale]);
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<QuickFilterKey[]>([]);
  const [activeMode, setActiveMode] = useState<HomeMode>('all');
  const [gridVisible, setGridVisible] = useState(GRID_PAGE_SIZE);

  const intentCounts = useMemo(() => ({
    all: cards.length,
    recommended_now: cards.filter((c) => c.actionBucket === 'buy_now').length,
    wait_for_sale: cards.filter((c) => c.actionBucket === 'wait').length,
    set_alert: cards.filter((c) => c.actionBucket === 'set_alert').length,
  }), [cards]);

  const trending = useMemo(() => {
    const seen = new Set<string>();
    return cards
      .filter((c) => { if (seen.has(c.gameTitle)) return false; seen.add(c.gameTitle); return true; })
      .slice(0, 4)
      .map((c) => ({ title: c.gameTitle, href: c.href }));
  }, [cards]);

  const rankedCards = useMemo(() => {
    return cards
      .filter((card) => {
        if (activeMode === 'all') return true;
        if (activeMode === 'recommended_now') return card.actionBucket === 'buy_now';
        if (activeMode === 'wait_for_sale') return card.actionBucket === 'wait';
        return card.actionBucket === 'set_alert';
      })
      .filter((card) => matchesAllFilters(card, activeFilters))
      .map((card) => ({ card, searchScore: getSearchScore(card, query) }))
      .filter((e) => e.searchScore > 0)
      .sort((a, b) => {
        if (normalizeText(query)) {
          if (a.searchScore !== b.searchScore) return b.searchScore - a.searchScore;
        }
        if (a.card.featuredPriority !== b.card.featuredPriority) return a.card.featuredPriority - b.card.featuredPriority;
        return +new Date(b.card.publishedAt) - +new Date(a.card.publishedAt);
      });
  }, [activeFilters, activeMode, cards, query]);

  const filteredCards = rankedCards.map((e) => e.card);
  const sectionCopy = useMemo(() => getSectionCopy(locale, activeMode), [locale, activeMode]);

  const featuredCount = filteredCards.length >= 6 ? Math.min(2, filteredCards.length) : 0;
  const featuredCards = useMemo(() => filteredCards.slice(0, featuredCount), [filteredCards, featuredCount]);
  const allLatestCards = useMemo(() => filteredCards.slice(featuredCount), [filteredCards, featuredCount]);
  const visibleLatestCards = allLatestCards.slice(0, gridVisible);
  const hasMoreCards = allLatestCards.length > gridVisible;

  function toggleFilter(filter: QuickFilterKey) {
    setActiveFilters((c) => c.includes(filter) ? c.filter((i) => i !== filter) : [...c, filter]);
  }
  function resetFilters() { setQuery(''); setActiveFilters([]); setActiveMode('all'); setGridVisible(GRID_PAGE_SIZE); }
  function selectMode(mode: HomeMode) { setActiveMode(mode); setGridVisible(GRID_PAGE_SIZE); }
  function showMore() { setGridVisible((v) => v + GRID_PAGE_SIZE); }

  return (
    <div className="decision-home-hub">
      <section className="decision-home-hero decision-home-hero-compact section-block">
        <h1>{t(locale, 'home.heroTitle')}</h1>
        <DecisionFilterPanel
          locale={locale}
          groups={filterGroups}
          activeFilters={activeFilters}
          onToggleFilter={toggleFilter}
          searchValue={query}
          onSearchChange={setQuery}
          onReset={resetFilters}
        />
        {trending.length > 0 && (
          <div className="hero-trending">
            <span className="hero-trending-label">{t(locale, 'home.trending')}</span>
            {trending.map((g, i) => (
              <span key={g.href}>
                {i > 0 && <span className="hero-trending-sep" aria-hidden="true">&middot;</span>}
                <a href={g.href} className="hero-trending-link">{g.title}</a>
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="decision-intent-section section-block">
        <div className="decision-intent-grid">
          {intentOptions.map((option) => {
            const count = intentCounts[option.key];
            const isActive = activeMode === option.key;
            return (
              <button
                key={option.key}
                type="button"
                className={`decision-intent-card${isActive ? ' active' : ''}`}
                onClick={() => selectMode(option.key)}
                aria-pressed={isActive}
              >
                <strong className="decision-intent-label">{option.label}</strong>
                <span className="decision-intent-desc">{option.desc}</span>
                <span className="decision-intent-count">{formatGuidesCount(locale, count)}</span>
              </button>
            );
          })}
        </div>
      </section>

      {filteredCards.length === 0 ? (
        <DecisionEmptyState locale={locale} onReset={resetFilters} />
      ) : (
        <>
          {featuredCards.length > 0 && (
            <section className="decision-featured-section section-block">
              <div className="section-head">
                <div>
                  <h2>{sectionCopy.featured}</h2>
                  <p>{sectionCopy.featuredDesc}</p>
                </div>
              </div>
              <div className="decision-featured-grid-v2">
                {featuredCards.map((card) => (
                  <DecisionFeaturedCardV2 key={`featured-${card.id}`} card={card} />
                ))}
              </div>
            </section>
          )}

          {allLatestCards.length > 0 && (
            <section className="decision-latest-section section-block">
              {featuredCards.length > 0 && (
                <div className="section-head">
                  <div>
                    <h2>{sectionCopy.latest}</h2>
                  </div>
                </div>
              )}
              <div className="decision-grid-v2">
                {visibleLatestCards.map((card) => (
                  <DecisionGridCard key={`latest-${card.id}`} card={card} />
                ))}
              </div>
              {hasMoreCards && (
                <div className="decision-show-more">
                  <button type="button" className="decision-show-more-btn" onClick={showMore}>
                    {t(locale, 'home.showMore')}
                  </button>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
