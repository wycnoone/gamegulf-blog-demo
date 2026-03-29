"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DecisionEntryCardModel } from "@/lib/blog";
import {
  getDecisionDisplayTitle,
  getCompactDecisionField,
  getCompactPriceCall,
  getWorthItVerdictBadge,
} from "@/lib/decision-card-display";

type DecisionFeaturedCardV2Props = {
  card: DecisionEntryCardModel;
  layout?: "default" | "worth-it-panel";
};

export function DecisionFeaturedCardV2({
  card,
  layout = "default",
}: DecisionFeaturedCardV2Props) {
  const router = useRouter();
  const compactPriceCall = getCompactPriceCall(card);
  const verdictLabel =
    card.kind === "worth-it" ? getWorthItVerdictBadge(card) : card.recommendationBadge;
  const displayTitle = getDecisionDisplayTitle(card);
  const compactBestFor = getCompactDecisionField(card.bestFor, 52);
  const compactWhatItIs = getCompactDecisionField(card.whatItIs, 92);
  const compactCommunityVibe = card.communityVibe
    ? getCompactDecisionField(card.communityVibe, 84)
    : null;
  const priceAdviceText = compactPriceCall.label;
  const primaryHref = card.kind === "worth-it" ? card.href : card.primaryCtaHref;
  const verdictBadgeLabel =
    card.locale === "en" ? verdictLabel.toUpperCase() : verdictLabel;
  const trackLabel = "TRACK";
  const primaryCtaLabel =
    card.locale === "en" ? card.primaryCtaLabel.toUpperCase() : card.primaryCtaLabel;
  const editorialLabel =
    card.locale === "en" ? "By GameGulf Editorial AI" : "GameGulf Editorial AI";

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
        <div className="decision-cover-badge-wrap-pro">
          <span className="decision-cover-verdict-pro">{verdictBadgeLabel}</span>
        </div>
      </div>

      <div className="decision-featured-body decision-featured-body-stream decision-card-body-pro">
        <div className="decision-tag-row decision-tag-row-pro">
          {card.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="decision-tag decision-tag-pro">
              {tag}
            </span>
          ))}
        </div>

        <div className="decision-card-title-block decision-card-title-block-pro">
          <h3>
            <Link href={card.href} onClick={(event) => event.stopPropagation()}>
              {displayTitle}
            </Link>
          </h3>
          <p className="decision-summary-pro">{compactWhatItIs}</p>
        </div>

        {compactCommunityVibe ? (
          <div className="decision-vibe-pro">
            <span className="decision-vibe-label-pro">
              {card.locale === "en" ? "Player Consensus" : "玩家热评"}
            </span>
            <p className="decision-vibe-text-pro">&ldquo;{compactCommunityVibe}&rdquo;</p>
          </div>
        ) : null}

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
          </div>
        </div>

        <div className="decision-specs-footer-pro">
          <span className="decision-specs-length-pro">
            <span className="decision-specs-prefix-pro">Est. Length:</span>{" "}
            <strong>{card.playtime || "N/A"}</strong>
          </span>
          <span className="decision-specs-divider-pro" aria-hidden="true">
            •
          </span>
          <span>{editorialLabel}</span>
        </div>

        <div className="decision-cta-row decision-cta-row-pro">
          <Link
            href={primaryHref}
            className="decision-cta-primary-pro"
            onClick={(event) => event.stopPropagation()}
          >
            {primaryCtaLabel}
          </Link>
          <Link
            href={card.priceTrackHref}
            className="decision-cta-track-pro"
            onClick={(event) => event.stopPropagation()}
          >
            {trackLabel}
          </Link>
        </div>
      </div>
    </article>
  );
}
