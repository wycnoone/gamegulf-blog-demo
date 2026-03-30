import { DecisionFeaturedCardV2 } from './DecisionFeaturedCardV2';
import { DecisionGridCard } from './DecisionGridCard';
import type { DecisionEntryCardModel } from '@/lib/blog';
import type { BlogLocale } from '@/lib/i18n';

type TopicCardGridProps = {
  cards: DecisionEntryCardModel[];
  locale: BlogLocale;
};

export function TopicCardGrid({ cards, locale }: TopicCardGridProps) {
  const featured = cards.slice(0, Math.min(2, cards.length));
  const grid = cards.slice(featured.length);

  if (cards.length === 0) {
    return (
      <div className="decision-empty-state section-block">
        <p>
          {locale === 'en'
            ? 'No guides match this topic yet. More are on the way.'
            : '暂时没有匹配这个话题的指南，更多内容即将推出。'}
        </p>
      </div>
    );
  }

  return (
    <>
      <section className="decision-featured-section section-block">
        <div className="section-head">
          <div>
            <h2>{locale === 'en' ? 'Top picks' : '精选推荐'}</h2>
            <p>
              {locale === 'en'
                ? 'Start with the strongest fit and clearest buying signals.'
                : '从适配度最高、购买信号最明确的几篇开始。'}
            </p>
          </div>
        </div>
        <div className="decision-featured-grid-v2">
          {featured.map((card) => (
            <DecisionFeaturedCardV2 key={card.id} card={card} />
          ))}
        </div>
      </section>

      {grid.length > 0 && (
        <section className="decision-grid-section section-block">
          <div className="section-head">
            <div>
              <h2>{locale === 'en' ? 'More guides' : '更多指南'}</h2>
              <p>
                {locale === 'en'
                  ? 'Keep browsing by fit, value, and price timing.'
                  : '继续按适配度、价值和价格时机浏览。'}
              </p>
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
