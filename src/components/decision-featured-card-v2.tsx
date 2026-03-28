"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DecisionEntryCardModel } from "@/lib/blog";
import {
  getDecisionDisplayTitle,
  getDecisionScoreChip,
  getCompactDecisionField,
  getCompactPriceCall,
  getFeaturedSupportField,
  getWorthItVerdictBadge,
} from "@/lib/decision-card-display";

type DecisionFeaturedCardV2Props = {
  card: DecisionEntryCardModel;
  layout?: "default" | "worth-it-panel";
};

function formatCardDate(date: string, locale: DecisionEntryCardModel["locale"]) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function DecisionFeaturedCardV2({
  card,
  layout = "default",
}: DecisionFeaturedCardV2Props) {
  const router = useRouter();
  const compactPriceCall = getCompactPriceCall(card);
  const supportField = getFeaturedSupportField(card);
  const verdictLabel =
    card.kind === "worth-it" ? getWorthItVerdictBadge(card) : card.recommendationBadge;
  const scoreChip = getDecisionScoreChip(card);
  const displayTitle = getDecisionDisplayTitle(card);
  const compactBestFor = getCompactDecisionField(card.bestFor, 40);
  const compactWhatItIs = getCompactDecisionField(card.whatItIs, 92);
  const compactTimeFit = getCompactDecisionField(card.timeFit, 38);
  const primaryHref = card.kind === "worth-it" ? card.href : card.primaryCtaHref;

  return (
    <article
      className={`decision-featured-card-v2 decision-featured-card-stream ${layout === "worth-it-panel" ? "decision-featured-card-worth-it" : ""}`}
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
      <div
        className="decision-featured-cover"
        style={
          card.coverImage
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(12, 18, 36, 0.1), rgba(12, 18, 36, 0.66)), url(${card.coverImage})`,
              }
            : undefined
        }
      >
        <div className="decision-card-cover-top">
          <span className="verdict-badge">{verdictLabel}</span>
          {scoreChip ? <span className="decision-score-chip">{scoreChip}</span> : null}
        </div>
      </div>

      <div className="decision-featured-body decision-featured-body-stream">
        <div className="decision-card-title-block">
          <h3>
            <Link href={card.href} onClick={(event) => event.stopPropagation()}>
              {displayTitle}
            </Link>
          </h3>
          <p className="decision-takeaway decision-takeaway-featured">
            {compactWhatItIs}
          </p>
        </div>

        <div className="decision-card-signal-grid decision-card-signal-grid-featured">
          <div className="decision-signal-pill">
            <span>{card.locale === "en" ? "Best for" : "适合谁"}</span>
            <strong>{compactBestFor}</strong>
          </div>
          <div className="decision-signal-pill">
            <span>{card.locale === "en" ? "Time fit" : "时间适配"}</span>
            <strong>{compactTimeFit}</strong>
          </div>
          <div className="decision-signal-pill decision-signal-pill-emphasis">
            <span>{card.locale === "en" ? "Price call" : "价格动作"}</span>
            <strong>
              {compactPriceCall.label}
              <em>{compactPriceCall.reason}</em>
            </strong>
          </div>
        </div>

        {supportField ? (
          <div className="decision-featured-support">
            <span className="decision-card-cell-label">{supportField.label}</span>
            <p>{supportField.value}</p>
          </div>
        ) : null}

        <div className="decision-support-row">
          <span className="decision-support-chip">
            {card.locale === "en" ? "Main risk" : "最大风险"}:{" "}
            {getCompactDecisionField(card.avoidIf, 48)}
          </span>
        </div>

        <div className="decision-cta-row">
          <Link
            href={primaryHref}
            className="button-link"
            onClick={(event) => event.stopPropagation()}
          >
            {card.primaryCtaLabel}
          </Link>
          <Link
            href={card.priceTrackHref}
            className="button-link accent"
            onClick={(event) => event.stopPropagation()}
          >
            {card.secondaryCtaLabel}
          </Link>
        </div>

        <div className="decision-card-footer-meta">
          <span>{formatCardDate(card.publishedAt, card.locale)}</span>
          <span>{card.readingTime}</span>
        </div>
      </div>
    </article>
  );
}
