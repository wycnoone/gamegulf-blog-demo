import { DecisionFeaturedCardV2 } from './DecisionFeaturedCardV2';
import { DecisionGridCard } from './DecisionGridCard';
import type { DecisionEntryCardModel } from '@/lib/blog-shared';
import type { BlogLocale } from '@/lib/i18n';
import { t } from '@/lib/translations';

type TopicCardGridProps = {
  cards: DecisionEntryCardModel[];
  locale: BlogLocale;
};

export function TopicCardGrid({ cards, locale }: TopicCardGridProps) {
  const featured = cards.filter((card) => card.featuredPriority < 999).slice(0, 2);
  const featuredIds = new Set(featured.map((card) => card.id));
  const grid = cards.filter((card) => !featuredIds.has(card.id));

  if (cards.length === 0) {
    return (
      <div className="decision-empty-state section-block">
        <p>{t(locale, 'topic.noGuides')}</p>
      </div>
    );
  }

  return (
    <>
      {featured.length > 0 && (
        <section className="decision-featured-section section-block">
          <div className="section-head">
            <div>
              <h2>{t(locale, 'topic.topPicks')}</h2>
              <p>{t(locale, 'topic.topPicksDesc')}</p>
            </div>
          </div>
          <div className="decision-featured-grid-v2">
            {featured.map((card) => (
              <DecisionFeaturedCardV2 key={card.id} card={card} />
            ))}
          </div>
        </section>
      )}

      {grid.length > 0 && (
        <section className="decision-grid-section section-block">
          <div className="section-head">
            <div>
              <h2>{t(locale, 'topic.moreGuides')}</h2>
              <p>{t(locale, 'topic.moreGuidesDesc')}</p>
            </div>
          </div>
          <div className="decision-grid-v2">
            {grid.map((card) => (
              <DecisionGridCard key={card.id} card={card} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
