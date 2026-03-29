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

type DecisionGridCardProps = {
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

export function DecisionGridCard({
  card,
  layout = "default",
}: DecisionGridCardProps) {
  const router = useRouter();
  const compactPriceCall = getCompactPriceCall(card);
  const primaryHref = card.kind === "worth-it" ? card.href : card.primaryCtaHref;
  const displayTitle = getDecisionDisplayTitle(card);
  const compactWhatItIs = getCompactDecisionField(card.whatItIs, 92);
  const compactBestFor = getCompactDecisionField(card.bestFor, 62);
  const compactCommunityVibe = card.communityVibe
    ? getCompactDecisionField(card.communityVibe, 76)
    : null;
  const priceAdviceText = compactPriceCall.label;
  const priceAdviceReason = getCompactDecisionField(compactPriceCall.reason, 44);
  const reviewMeta = getReviewMeta(card);
  const trackLabel = card.locale === "en" ? "Track" : "追踪";
  const primaryCtaLabel = card.primaryCtaLabel;

  return (
    <article
      className={`decision-grid-card decision-grid-card-stream decision-grid-card-pro ${layout === "worth-it-panel" ? "decision-grid-card-worth-it" : ""}`}
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
      <div className="decision-cover-pro">
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
          <span className="decision-platform-icon-pro">
            <span className="decision-platform-side-pro decision-platform-side-left-pro" />
            <span className="decision-platform-side-pro decision-platform-side-right-pro" />
          </span>
        </div>
      </div>

      <div className="decision-card-body decision-card-body-pro">
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
            <span className="decision-stat-icon-pro decision-stat-icon-clock-pro" aria-hidden="true" />
            <span>
              {card.locale === "en" ? "Est. Length:" : "预计时长:"}{" "}
              <strong>{card.playtime || "N/A"}</strong>
            </span>
          </span>
          {reviewMeta ? (
            <span className="decision-stat-item-pro">
              <span className="decision-stat-icon-pro decision-stat-icon-score-pro" aria-hidden="true" />
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
            <span className="decision-cta-decor-pro" aria-hidden="true">
              +
            </span>
            <span>{primaryCtaLabel}</span>
            <span className="decision-cta-decor-pro" aria-hidden="true">
              +
            </span>
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
