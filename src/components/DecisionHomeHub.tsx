import { useMemo, useState } from 'react';
import { DecisionEmptyState } from './DecisionEmptyState';
import { DecisionFeaturedCardV2 } from './DecisionFeaturedCardV2';
import { DecisionFilterPanel } from './DecisionFilterPanel';
import { DecisionGridCard } from './DecisionGridCard';
import type { DecisionEntryCardModel, QuickFilterKey } from '@/lib/blog';
import type { BlogLocale } from '@/lib/i18n';

const GRID_PAGE_SIZE = 8;

type DecisionHomeHubProps = {
  locale: BlogLocale;
  cards: DecisionEntryCardModel[];
};

type HomeMode = 'all' | 'recommended_now' | 'wait_for_sale' | 'set_alert';

function getFilterGroups() { return []; }

function getCopy(locale: BlogLocale) {
  const zh = locale === 'zh-hans';
  return {
    heroTitle: zh ? '这游戏，买不买？' : 'Should you buy it?',
    trendingLabel: zh ? '热门：' : 'Popular:',
    showMore: zh ? '加载更多' : 'Show more',
    guidesUnit: zh ? '篇' : '',
  };
}

function getIntentOptions(locale: BlogLocale) {
  const zh = locale === 'zh-hans';
  return [
    {
      key: 'recommended_now' as const,
      label: zh ? '想现在买' : 'Ready to buy',
      desc: zh ? '看看当前价格值不值得立刻入手。' : 'Is today\u2019s price good enough to commit?',
    },
    {
      key: 'wait_for_sale' as const,
      label: zh ? '等好价' : 'Waiting for a deal',
      desc: zh ? '哪些游戏值得等？折扣规律是什么？' : 'Which games are worth waiting on?',
    },
    {
      key: 'set_alert' as const,
      label: zh ? '还没想好' : 'Still deciding',
      desc: zh ? '不确定就先关注，等价格和心态都到位再说。' : 'Not sure yet? Track the price and decide later.',
    },
    {
      key: 'all' as const,
      label: zh ? '看全部' : 'Browse all',
      desc: zh ? '所有指南，按最新排列。' : 'Every guide, newest first.',
    },
  ];
}

function getSectionCopy(locale: BlogLocale, mode: HomeMode) {
  const zh = locale === 'zh-hans';
  switch (mode) {
    case 'recommended_now':
      return {
        featured: zh ? '现在买最值的' : 'Best to buy now',
        featuredDesc: zh ? '当前价格信号最强的几款。' : 'Strongest buy signals right now.',
        latest: zh ? '更多适合现在入手的' : 'More games worth buying today',
      };
    case 'wait_for_sale':
      return {
        featured: zh ? '最值得等的' : 'Worth waiting for',
        featuredDesc: zh ? '折扣规律最清楚的几款。' : 'Clearest sale patterns and timing.',
        latest: zh ? '更多值得等好价的' : 'More games to wait on',
      };
    case 'set_alert':
      return {
        featured: zh ? '值得先关注的' : 'Worth tracking',
        featuredDesc: zh ? '还不确定，但值得跟踪价格。' : 'Not ready to buy, but worth watching.',
        latest: zh ? '更多可以先关注的' : 'More games to track',
      };
    default:
      return {
        featured: zh ? '编辑精选' : 'Editor\u2019s picks',
        featuredDesc: zh ? '最值得作为起点的几篇。' : 'The best places to start.',
        latest: zh ? '全部指南' : 'All guides',
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

export function DecisionHomeHub({ locale, cards }: DecisionHomeHubProps) {
  const copy = useMemo(() => getCopy(locale), [locale]);
  const intentOptions = useMemo(() => getIntentOptions(locale), [locale]);
  const filterGroups = useMemo(() => getFilterGroups(), []);
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
      {/* ── Hero: search-first ── */}
      <section className="decision-home-hero decision-home-hero-compact section-block">
        <h1>{copy.heroTitle}</h1>
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
            <span className="hero-trending-label">{copy.trendingLabel}</span>
            {trending.map((g, i) => (
              <span key={g.href}>
                {i > 0 && <span className="hero-trending-sep" aria-hidden="true">&middot;</span>}
                <a href={g.href} className="hero-trending-link">{g.title}</a>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* ── Intent selector (replaces Trust Module + Mode Filter) ── */}
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
                <span className="decision-intent-count">
                  {count}{copy.guidesUnit}{' '}
                  {locale === 'en' ? (count === 1 ? 'guide' : 'guides') : '篇指南'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Content ── */}
      {filteredCards.length === 0 ? (
        <DecisionEmptyState locale={locale} onReset={resetFilters} />
      ) : (
        <>
          {/* Featured (only when enough cards for a meaningful split) */}
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

          {/* Grid */}
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
                    {copy.showMore}
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
