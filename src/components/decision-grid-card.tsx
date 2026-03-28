"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DecisionEntryCardModel } from "@/lib/blog";
import {
  getDecisionDisplayTitle,
  getDecisionScoreChip,
  getCompactDecisionField,
  getCompactPriceCall,
  getWorthItVerdictBadge,
} from "@/lib/decision-card-display";

type DecisionGridCardProps = {
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

export function DecisionGridCard({
  card,
  layout = "default",
}: DecisionGridCardProps) {
  const router = useRouter();
  const compactPriceCall = getCompactPriceCall(card);
  const verdictLabel =
    card.kind === "worth-it" ? getWorthItVerdictBadge(card) : card.recommendationBadge;
  const primaryHref = card.kind === "worth-it" ? card.href : card.primaryCtaHref;
  const scoreChip = getDecisionScoreChip(card);
  const displayTitle = getDecisionDisplayTitle(card);
  const compactWhatItIs = getCompactDecisionField(card.whatItIs, 88);
  const compactBestFor = getCompactDecisionField(card.bestFor, 36);
  const compactTimeFit = getCompactDecisionField(card.timeFit, 34);
  const compactMainRisk = getCompactDecisionField(card.avoidIf, 40);

  return (
    <article
      className={`decision-grid-card decision-grid-card-stream ${layout === "worth-it-panel" ? "decision-grid-card-worth-it" : ""}`}
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
        className="decision-card-cover"
        style={
          card.coverImage
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(12, 18, 36, 0.1), rgba(12, 18, 36, 0.68)), url(${card.coverImage})`,
              }
            : undefined
        }
      >
        <div className="decision-card-cover-top">
          <span className="verdict-badge">{verdictLabel}</span>
          {scoreChip ? <span className="decision-score-chip">{scoreChip}</span> : null}
        </div>
      </div>

      <div className="decision-card-body">
        <div className="decision-card-title-block">
          <h3>
            <Link href={card.href} onClick={(event) => event.stopPropagation()}>
              {displayTitle}
            </Link>
          </h3>
          <p className="decision-takeaway decision-takeaway-stream">
            {compactWhatItIs}
          </p>
        </div>

        <div className="decision-card-signal-grid">
          <div className="decision-signal-pill">
            <span>{card.locale === "en" ? "Best for" : "适合谁"}</span>
            <strong>{compactBestFor}</strong>
          </div>
          <div className="decision-signal-pill">
            <span>{card.locale === "en" ? "Main risk" : "最大风险"}</span>
            <strong>{compactMainRisk}</strong>
          </div>
          <div className="decision-signal-pill decision-signal-pill-emphasis">
            <span>{card.locale === "en" ? "Price call" : "价格动作"}</span>
            <strong>
              {compactPriceCall.label}
              <em>{compactPriceCall.reason}</em>
            </strong>
          </div>
        </div>

        <div className="decision-support-row">
          <span className="decision-support-chip">
            {card.locale === "en" ? "Time fit" : "时间适配"}: {compactTimeFit}
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
