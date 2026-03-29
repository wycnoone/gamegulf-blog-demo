"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DecisionEntryCardModel } from "@/lib/blog";
import {
  getDecisionDisplayTitle,
  getCompactDecisionField,
  getCompactPriceCall,
  getDecisionScoreChip,
} from "@/lib/decision-card-display";

type DecisionFeaturedCardV2Props = {
  card: DecisionEntryCardModel;
  layout?: "default" | "worth-it-panel";
};

function formatCardDate(date: string, locale: DecisionEntryCardModel["locale"]) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(new Date(date));
}

function getReadingMeta(readingTime: string, locale: DecisionEntryCardModel["locale"]) {
  return locale === "en" ? readingTime : `${readingTime}阅读`;
}

function getReviewMeta(card: DecisionEntryCardModel) {
  const scoreChip = getDecisionScoreChip(card);

  if (!scoreChip) {
    return null;
  }

  const normalizedScore = scoreChip.replace(/\s*MC$/u, "");

  return card.locale === "en"
    ? `Metacritic: ${normalizedScore}`
    : `Metacritic 评价: ${normalizedScore}`;
}

export function DecisionFeaturedCardV2({
  card,
  layout = "default",
}: DecisionFeaturedCardV2Props) {
  const router = useRouter();
  const compactPriceCall = getCompactPriceCall(card);
  const displayTitle = getDecisionDisplayTitle(card);
  const compactBestFor = getCompactDecisionField(card.bestFor, 62);
  const compactWhatItIs = getCompactDecisionField(card.whatItIs, 92);
  const compactCommunityVibe = card.communityVibe
    ? getCompactDecisionField(card.communityVibe, 84)
    : null;
  const priceAdviceText = compactPriceCall.label;
  const priceAdviceReason = getCompactDecisionField(compactPriceCall.reason, 42);
  const primaryHref = card.kind === "worth-it" ? card.href : card.primaryCtaHref;
  const reviewMeta = getReviewMeta(card);
  const trackLabel = card.locale === "en" ? "Track" : "追踪";
  const primaryCtaLabel = card.primaryCtaLabel;

  return (
    <article
      className={`decision-featured-card-v2 decision-featured-card-stream decision-featured-card-pro ${layout === "worth-it-panel" ? "decision-featured-card-worth-it" : ""}`}
      role="link"
      tabIndex={0}
      onClick={() => router.push(card.href)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(card.href);
        }
      }}
    >
      <div className="decision-cover-pro decision-cover-pro-featured">
        {card.coverImage ? (
          <img
            src={card.coverImage}
            alt={card.gameTitle}
            className="decision-cover-image-pro"
          />
        ) : (
          <div className="decision-cover-fallback-pro" aria-hidden="true" />
        )}
        <div className="decision-cover-overlay-pro" aria-hidden="true" />
        <div className="decision-platform-badge-pro" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.5 2H6C3.79086 2 2 3.79086 2 6V18C2 20.2091 3.79086 22 6 22H10.5V2Z" fill="white" />
            <path d="M13.5 2H18C20.2091 2 22 3.79086 22 6V18C22 20.2091 20.2091 22 18 22H13.5V2Z" fill="white" />
            <circle cx="6.5" cy="7.5" r="2" fill="#111111" />
            <circle cx="17.5" cy="12.5" r="2" fill="#111111" />
          </svg>
        </div>
        <div className="decision-cover-accent-pro" aria-hidden="true" />
      </div>

      <div className="decision-featured-body decision-featured-body-stream decision-card-body-pro">
        <div className="decision-card-title-block decision-card-title-block-pro">
          <h3>
            <Link href={card.href} onClick={(event) => event.stopPropagation()}>
              {displayTitle}
            </Link>
          </h3>
        </div>

        <div className="decision-tag-row decision-tag-row-pro">
          {card.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="decision-tag decision-tag-pro">
              {tag}
            </span>
          ))}
        </div>

        <p className="decision-summary-pro decision-summary-block-pro">{compactWhatItIs}</p>

        {compactCommunityVibe ? (
          <div className="decision-vibe-pro">
            <span className="decision-vibe-label-pro">
              {card.locale === "en" ? "Player Consensus" : "玩家热评"}
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
              {card.locale === "en" ? "Est. Length:" : "预计时长:"}{" "}
              <strong>{card.playtime || "N/A"}</strong>
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
              {card.locale === "en" ? "Best For" : "核心受众"}
            </span>
            <span className="decision-core-value-pro">{compactBestFor}</span>
          </div>
          <div className="decision-core-item-pro">
            <span className="decision-core-label-pro">
              {card.locale === "en" ? "Advice" : "购买建议"}
            </span>
            <span className="decision-core-value-pro decision-core-value-signal-pro">
              {priceAdviceText}
            </span>
            <span className="decision-core-support-pro">{priceAdviceReason}</span>
          </div>
        </div>

        <div className="decision-cta-row decision-cta-row-pro">
          <Link
            href={primaryHref}
            className="decision-cta-primary-pro"
            onClick={(event) => event.stopPropagation()}
          >
            <svg className="decision-cta-plus-pro" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 4.5V15.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M4.5 10H15.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
            <span>{primaryCtaLabel}</span>
            <svg className="decision-cta-plus-pro" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M10 4.5V15.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              <path d="M4.5 10H15.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </Link>
          <Link
            href={card.priceTrackHref}
            className="decision-cta-track-pro"
            onClick={(event) => event.stopPropagation()}
          >
            {trackLabel}
          </Link>
        </div>

        <div className="decision-card-footer-meta decision-card-footer-meta-pro">
          <span>{formatCardDate(card.publishedAt, card.locale)}</span>
          <span>{getReadingMeta(card.readingTime, card.locale)}</span>
        </div>
      </div>
    </article>
  );
}
