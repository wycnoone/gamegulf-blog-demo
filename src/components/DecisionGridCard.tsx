import type { DecisionEntryCardModel } from '@/lib/blog';
import {
  getDecisionDisplayTitle,
  getCompactDecisionField,
  getCompactPriceCall,
  getDecisionScoreChip,
} from '@/lib/decision-card-display';

type DecisionGridCardProps = {
  card: DecisionEntryCardModel;
  layout?: 'default' | 'worth-it-panel';
};

function formatCardDate(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

function getReadingMeta(readingTime: string) {
  const minutes = readingTime.match(/\d+/u)?.[0];
  return minutes ? `${minutes} min read` : readingTime;
}

function getReviewMeta(card: DecisionEntryCardModel) {
  const scoreChip = getDecisionScoreChip(card);
  if (!scoreChip) return null;
  const normalizedScore = scoreChip.replace(/\s*MC$/u, '');
  return card.locale === 'en'
    ? `Metacritic: ${normalizedScore}`
    : `Metacritic 评价: ${normalizedScore}`;
}

export function DecisionGridCard({
  card,
  layout = 'default',
}: DecisionGridCardProps) {
  const compactPriceCall = getCompactPriceCall(card);
  const primaryHref = card.href;
  const displayTitle = getDecisionDisplayTitle(card);
  const compactWhatItIs = getCompactDecisionField(card.whatItIs, 92);
  const compactBestFor = getCompactDecisionField(card.bestFor, 62);
  const compactCommunityVibe = card.communityVibe
    ? getCompactDecisionField(card.communityVibe, 76)
    : null;
  const priceAdviceText = compactPriceCall.label;
  const priceAdviceDetail = compactPriceCall.detail;
  const reviewMeta = getReviewMeta(card);
  const trackLabel = card.locale === 'en' ? 'Track' : '追踪';
  const primaryCtaLabel = card.primaryCtaLabel;

  return (
    <article
      className={`decision-grid-card decision-grid-card-pro ${layout === 'worth-it-panel' ? 'decision-grid-card-worth-it' : ''}`}
      role="link"
      tabIndex={0}
      onClick={() => { window.location.href = card.href; }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.location.href = card.href;
        }
      }}
    >
      <div className="decision-cover-pro">
        {card.coverImage ? (
          <img src={card.coverImage} alt={card.gameTitle} className="decision-cover-image-pro" />
        ) : (
          <div className="decision-cover-fallback-pro" aria-hidden="true" />
        )}
        <div className="decision-cover-accent-pro" aria-hidden="true" />
      </div>

      <div className="decision-card-body-pro">
        <div className="decision-card-title-block-pro">
          <h3>
            <a href={card.href} onClick={(e) => e.stopPropagation()}>
              {displayTitle}
            </a>
          </h3>
        </div>

        <div className="decision-tag-row decision-tag-row-pro">
          {card.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="decision-tag decision-tag-pro">{tag}</span>
          ))}
        </div>

        <p className="decision-summary-pro decision-summary-block-pro">{compactWhatItIs}</p>

        {compactCommunityVibe ? (
          <div className="decision-vibe-pro">
            <span className="decision-vibe-label-pro">
              {card.locale === 'en' ? 'Player Consensus' : '玩家热评'}
            </span>
            <p className="decision-vibe-text-pro">&ldquo;{compactCommunityVibe}&rdquo;</p>
          </div>
        ) : null}

        <div className="decision-stats-row-pro">
          <span className="decision-stat-item-pro">
            <svg className="decision-stat-svg-pro" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth="2.2" />
              <path d="M12 7.5V12.4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M12 12.4L15.2 14.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <span>
              {card.locale === 'en' ? 'Est. Length:' : '预计时长:'}{' '}
              <strong>{card.playtime || 'N/A'}</strong>
            </span>
          </span>
          {reviewMeta ? (
            <span className="decision-stat-item-pro">
              <span className="decision-meta-icon-pro" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M4 16V8L12 13L20 8V16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>{reviewMeta}</span>
            </span>
          ) : null}
        </div>

        <div className="decision-core-grid-pro">
          <div className="decision-core-item-pro">
            <span className="decision-core-label-pro">
              {card.locale === 'en' ? 'Best For' : '核心受众'}
            </span>
            <span className="decision-core-value-pro">{compactBestFor}</span>
          </div>
          <div className="decision-core-item-pro">
            <span className="decision-core-label-pro">
              {card.locale === 'en' ? 'Advice' : '购买建议'}
            </span>
            <span className="decision-core-value-pro decision-core-value-signal-pro">
              {priceAdviceText}
            </span>
            <span className="decision-core-support-pro">{priceAdviceDetail}</span>
          </div>
        </div>

        <div className="decision-cta-row decision-cta-row-pro">
          <a href={primaryHref} className="decision-cta-primary-pro" onClick={(e) => e.stopPropagation()}>
            <svg className="decision-cta-plus-pro" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 4.5V15.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M4.5 10H15.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
            <span>{primaryCtaLabel}</span>
            <svg className="decision-cta-plus-pro" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 4.5V15.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M4.5 10H15.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </a>
          <a href={card.priceTrackHref} className="decision-cta-track-pro" onClick={(e) => e.stopPropagation()}>
            {trackLabel}
          </a>
        </div>

        <div className="decision-card-footer-meta-pro">
          <span>{formatCardDate(card.updatedAt || card.publishedAt)}</span>
          <span>{getReadingMeta(card.readingTime)}</span>
        </div>
      </div>
    </article>
  );
}
