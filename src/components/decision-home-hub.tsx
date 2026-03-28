"use client";

import { useMemo, useState } from "react";
import { DecisionEmptyState } from "@/components/decision-empty-state";
import { DecisionFeaturedCardV2 } from "@/components/decision-featured-card-v2";
import { DecisionFilterPanel } from "@/components/decision-filter-panel";
import { DecisionGridCard } from "@/components/decision-grid-card";
import { TrustModule } from "@/components/trust-module";
import type { DecisionEntryCardModel, QuickFilterKey } from "@/lib/blog";
import type { BlogLocale } from "@/lib/i18n";

type DecisionHomeHubProps = {
  locale: BlogLocale;
  cards: DecisionEntryCardModel[];
};

type HomeMode = "all" | "recommended_now" | "wait_for_sale" | "set_alert";

function getFilterGroups() {
  return [];
}

function getCopy(locale: BlogLocale) {
  if (locale === "zh-hans") {
    return {
      heroTitle: "Switch 购买指南",
      heroText: "搜索游戏名，快速判断它适不适合你、现在买值不值。",
      modeTitle: "先按当前倾向筛一轮",
      modeText: "如果你已经知道自己更偏现在买、等等，还是先开提醒，就先从这里缩小范围。",
      featuredTitle: "先看这些值得点开的判断",
      featuredText: "这几篇最适合当作起点，先感受 GameGulf 的判断方式，再决定要不要继续看价格。",
      latestTitle: "更多购买判断",
      latestText: "先看最值得点开的几张卡，再继续往下筛更适合自己的游戏。",
    };
  }

  return {
    heroTitle: "Switch Buying Guides",
    heroText:
      "Search a game first, then use GameGulf's decision signals to judge fit, value, and timing.",
    modeTitle: "Start with your buying stance",
    modeText:
      "If you already lean toward buying now, waiting, or tracking, filter the feed first and keep the scan simple.",
    featuredTitle: "Best places to start",
    featuredText:
      "These are the clearest examples of how GameGulf turns game info into a buying judgment you can actually use.",
    latestTitle: "Latest articles",
    latestText:
      "Once the first few cards feel clear, use the rest of the feed to keep narrowing what deserves your money or your alert list.",
  };
}

function getModeOptions(locale: BlogLocale) {
  if (locale === "zh-hans") {
    return [
      { key: "all" as const, label: "全部判断" },
      { key: "recommended_now" as const, label: "推荐立即买" },
      { key: "wait_for_sale" as const, label: "更适合等等" },
      { key: "set_alert" as const, label: "先设提醒" },
    ];
  }

  return [
    { key: "all" as const, label: "All decisions" },
    { key: "recommended_now" as const, label: "Recommended now" },
    { key: "wait_for_sale" as const, label: "Wait for sale" },
    { key: "set_alert" as const, label: "Set alert first" },
  ];
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function getSearchScore(card: DecisionEntryCardModel, query: string) {
  const tokens = normalizeText(query)
    .split(/\s+/)
    .filter(Boolean);

  if (tokens.length === 0) {
    return 1;
  }

  let total = 0;

  for (const token of tokens) {
    const fields = [
      { value: card.searchIndex.gameTitle, score: 100 },
      { value: card.searchIndex.title, score: 80 },
      { value: card.searchIndex.tags.join(" "), score: 60 },
      { value: card.whatItIs.toLowerCase(), score: 50 },
      { value: card.bestFor.toLowerCase(), score: 40 },
      { value: card.priceCallLabel.toLowerCase(), score: 20 },
    ];

    const match = fields.find((field) => field.value.includes(token));

    if (!match) {
      return 0;
    }

    total += match.score;
  }

  return total;
}

function matchesAllFilters(card: DecisionEntryCardModel, activeFilters: QuickFilterKey[]) {
  return activeFilters.every((filter) => card.quickFilters.includes(filter));
}

export function DecisionHomeHub({ locale, cards }: DecisionHomeHubProps) {
  const copy = useMemo(() => getCopy(locale), [locale]);
  const filterGroups = useMemo(() => getFilterGroups(), []);
  const modeOptions = useMemo(() => getModeOptions(locale), [locale]);
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<QuickFilterKey[]>([]);
  const [activeMode, setActiveMode] = useState<HomeMode>("all");

  const rankedCards = useMemo(() => {
    return cards
      .filter((card) => {
        if (activeMode === "all") {
          return true;
        }

        if (activeMode === "recommended_now") {
          return card.actionBucket === "buy_now";
        }

        if (activeMode === "wait_for_sale") {
          return card.actionBucket === "wait";
        }

        return card.actionBucket === "set_alert";
      })
      .filter((card) => matchesAllFilters(card, activeFilters))
      .map((card) => ({
        card,
        searchScore: getSearchScore(card, query),
      }))
      .filter((entry) => entry.searchScore > 0)
      .sort((left, right) => {
        if (normalizeText(query)) {
          if (left.searchScore !== right.searchScore) {
            return right.searchScore - left.searchScore;
          }
        }

        if (left.card.featuredPriority !== right.card.featuredPriority) {
          return left.card.featuredPriority - right.card.featuredPriority;
        }

        return +new Date(right.card.publishedAt) - +new Date(left.card.publishedAt);
      });
  }, [activeFilters, activeMode, cards, query]);

  const filteredCards = rankedCards.map((entry) => entry.card);

  const featuredCards = useMemo(() => filteredCards.slice(0, Math.min(2, filteredCards.length)), [filteredCards]);

  const latestCards = useMemo(
    () =>
      filteredCards.slice(featuredCards.length).slice(0, 6),
    [featuredCards.length, filteredCards],
  );

  function toggleFilter(filter: QuickFilterKey) {
    setActiveFilters((current) =>
      current.includes(filter)
        ? current.filter((item) => item !== filter)
        : [...current, filter],
    );
  }

  function resetFilters() {
    setQuery("");
    setActiveFilters([]);
    setActiveMode("all");
  }

  return (
    <div className="decision-home-hub">
      <section className="decision-home-hero section-block">
        <p className="eyebrow">GameGulf Blog</p>
        <h1>{copy.heroTitle}</h1>
        <p className="hero-copy">{copy.heroText}</p>

        <DecisionFilterPanel
          locale={locale}
          groups={filterGroups}
          activeFilters={activeFilters}
          onToggleFilter={toggleFilter}
          searchValue={query}
          onSearchChange={setQuery}
          onReset={resetFilters}
        />
      </section>

      <TrustModule locale={locale} />

      {filteredCards.length === 0 ? (
        <DecisionEmptyState locale={locale} onReset={resetFilters} />
      ) : (
        <>
          <section className="decision-mode-block section-block">
          <div className="decision-mode-copy">
            <h2>{copy.modeTitle}</h2>
            <p>{copy.modeText}</p>
          </div>
          <div className="decision-mode-row">
            {modeOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`decision-mode-chip ${activeMode === option.key ? "active" : ""}`}
                onClick={() => setActiveMode(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
          </section>

          <section className="decision-featured-section section-block">
            <div className="section-head">
              <div>
                <h2>{copy.featuredTitle}</h2>
                <p>{copy.featuredText}</p>
              </div>
            </div>
            <div className="decision-featured-grid-v2">
              {featuredCards.map((card) => (
                <DecisionFeaturedCardV2 key={`featured-${card.id}`} card={card} />
              ))}
            </div>
          </section>

          <section className="decision-latest-section section-block">
            <div className="section-head">
              <div>
                <h2>{copy.latestTitle}</h2>
                <p>{copy.latestText}</p>
              </div>
            </div>
            <div className="decision-grid-v2">
              {latestCards.map((card) => (
                <DecisionGridCard key={`latest-${card.id}`} card={card} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
