"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DecisionEmptyState } from "@/components/decision-empty-state";
import { DecisionFeaturedCardV2 } from "@/components/decision-featured-card-v2";
import { DecisionFilterPanel } from "@/components/decision-filter-panel";
import { DecisionGridCard } from "@/components/decision-grid-card";
import { TrustModule } from "@/components/trust-module";
import type { BlogCategory, DecisionEntryCardModel, QuickFilterKey } from "@/lib/blog";
import type { BlogLocale } from "@/lib/i18n";

type DecisionCategoryHubProps = {
  locale: BlogLocale;
  category: BlogCategory;
  cards: DecisionEntryCardModel[];
};

type CategoryMode = "all" | "recommended_now" | "wait_for_sale" | "set_alert";

function getFilterGroups() {
  return [];
}

function matchesAllFilters(card: DecisionEntryCardModel, activeFilters: QuickFilterKey[]) {
  return activeFilters.every((filter) => card.quickFilters.includes(filter));
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
    { key: "set_alert" as const, label: "Set alert" },
  ];
}

function getCategoryCopy(locale: BlogLocale, category: BlogCategory) {
  if (locale === "zh-hans") {
    return category === "worth-it"
      ? {
          title: "值不值得买",
          description:
            "搜索具体游戏，快速判断它是不是你的菜，以及它值不值得进库。",
          featuredTitle: "先看这些判断",
          featuredText: "先从最能代表这个页面价值的几篇开始。",
          gridTitle: "更多值不值得买判断",
          gridText: "继续按适配度、玩法和价值感筛到更适合自己的游戏。",
          nextTitle: "下一步怎么做",
          nextText:
            "如果适配度已经比较清楚，就读完整判断；如果还不够确定，先设提醒，把价格和时间都留给自己。",
        }
      : {
          title: "现在买还是等打折",
          description:
            "搜索具体游戏，快速判断现在买值不值，还是更适合等等或先设提醒。",
          featuredTitle: "先看这些价格判断",
          featuredText: "从最有行动价值的价格时机文章开始。",
          gridTitle: "更多价格时机判断",
          gridText: "继续按低点、折扣规律和把握度筛选。",
          nextTitle: "下一步怎么做",
          nextText:
            "如果价格信号已经足够清楚，就直接去看价格；如果还在犹豫，提醒会比盲等更有效。",
        };
  }

  return category === "worth-it"
    ? {
        title: "Worth It",
        description:
          "Search a game and quickly judge whether it fits your taste, your time, and your library before you spend.",
        featuredTitle: "Start with these decisions",
        featuredText:
          "These are the clearest examples of how GameGulf helps players judge fit and long-term value.",
        gridTitle: "More worth-it decisions",
        gridText:
          "Keep browsing by fit, play style, and value until the next step feels obvious.",
        nextTitle: "What to do next",
        nextText:
          "If the fit already looks strong, read the full decision. If you are still uncertain, let price tracking reduce the risk before you commit.",
      }
    : {
        title: "Buy Now or Wait",
        description:
          "Search a game and quickly judge whether today's price is good enough, whether it is better to wait, or whether it belongs on an alert list first.",
        featuredTitle: "Start with these price calls",
        featuredText:
          "These guides make the clearest calls on whether to buy now, wait longer, or watch the price signal.",
        gridTitle: "More price timing decisions",
        gridText:
          "Browse the rest when you want more context on deal quality, low-point proximity, and confidence.",
        nextTitle: "What to do next",
        nextText:
          "When the current deal clears your threshold, jump to live pricing. If not, setting an alert is usually the smarter move than guessing.",
      };
}

export function DecisionCategoryHub({
  locale,
  category,
  cards,
}: DecisionCategoryHubProps) {
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<QuickFilterKey[]>([]);
  const [activeMode, setActiveMode] = useState<CategoryMode>("all");
  const copy = useMemo(() => getCategoryCopy(locale, category), [locale, category]);
  const filterGroups = useMemo(() => getFilterGroups(), []);
  const modeOptions = useMemo(() => getModeOptions(locale), [locale]);

  const filteredCards = useMemo(() => {
    const tokens = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

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
      .filter((card) => {
        if (tokens.length === 0) {
          return true;
        }

        const fields = [
          card.searchIndex.gameTitle,
          card.searchIndex.title,
          card.searchIndex.tags.join(" "),
          card.whatItIs.toLowerCase(),
          card.bestFor.toLowerCase(),
          card.priceCallLabel.toLowerCase(),
        ];

        return tokens.every((token) => fields.some((field) => field.includes(token)));
      });
  }, [activeFilters, activeMode, cards, query]);

  const featuredCount = filteredCards.length >= 5 ? 3 : Math.min(2, filteredCards.length);
  const featuredCards = filteredCards.slice(0, featuredCount);
  const gridCards = filteredCards.slice(featuredCount);
  const primaryNextStepCard = featuredCards[0] || filteredCards[0];

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
    <div className="decision-category-hub">
      <section className="decision-category-hero section-block">
        <p className="eyebrow">GameGulf Blog</p>
        <h1>{copy.title}</h1>
        <p className="worth-it-hero-copy">{copy.description}</p>
      </section>

      <DecisionFilterPanel
        locale={locale}
        groups={filterGroups}
        activeFilters={activeFilters}
        onToggleFilter={toggleFilter}
        searchValue={query}
        onSearchChange={setQuery}
        onReset={resetFilters}
      />

      <TrustModule locale={locale} compact />

      {filteredCards.length === 0 ? (
        <DecisionEmptyState locale={locale} onReset={resetFilters} />
      ) : (
        <>
          <section className="decision-mode-block section-block">
            <div className="decision-mode-copy">
              <h2>{locale === "en" ? "Start with your buying stance" : "先按当前倾向筛一轮"}</h2>
              <p>
                {locale === "en"
                  ? "Use a simple mode filter first, then scan the cards with the clearest fit and pricing signals."
                  : "先按现在买、等等还是先设提醒过滤一轮，再看最清楚的判断卡。"}
              </p>
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
                <DecisionFeaturedCardV2 key={card.id} card={card} />
              ))}
            </div>
          </section>

          <section id="decision-grid-section" className="decision-grid-section section-block">
            <div className="section-head">
              <div>
                <h2>{copy.gridTitle}</h2>
                <p>{copy.gridText}</p>
              </div>
            </div>
            {gridCards.length > 0 ? (
              <div className="decision-grid-v2">
                {gridCards.map((card) => (
                  <DecisionGridCard key={card.id} card={card} />
                ))}
              </div>
            ) : null}
          </section>

          <section className="decision-next-step section-block">
            <div className="section-head">
              <div>
                <h2>{copy.nextTitle}</h2>
                <p>{copy.nextText}</p>
              </div>
            </div>
            {primaryNextStepCard ? (
              <div className="decision-next-step-grid">
                <article className="decision-next-step-card">
                  <span className="eyebrow">
                    {locale === "en" ? "If the fit is already strong" : "如果适配度已经很强"}
                  </span>
                  <h3>
                    {locale === "en"
                      ? "Go deeper before you spend"
                      : "继续看完整判断，再决定要不要花钱"}
                  </h3>
                  <p>
                    {locale === "en"
                      ? "Read the full decision first, then jump to live pricing once the recommendation feels clear."
                      : "先把完整判断看清楚；如果已经接近想买，再直接去看实时价格。"}
                  </p>
                  <div className="decision-cta-row">
                    <Link href={primaryNextStepCard.href} className="button-link">
                      {locale === "en" ? "Read the full decision" : "查看完整判断"}
                    </Link>
                    <Link
                      href={
                        primaryNextStepCard.kind === "buy-now-or-wait"
                          ? primaryNextStepCard.primaryCtaHref
                          : primaryNextStepCard.gameHref
                      }
                      className="button-link secondary"
                    >
                      {locale === "en" ? "View pricing" : "查看价格"}
                    </Link>
                  </div>
                </article>

                <article className="decision-next-step-card decision-next-step-card-soft">
                  <span className="eyebrow">
                    {locale === "en" ? "If you are still unsure" : "如果你还不确定"}
                  </span>
                  <h3>
                    {locale === "en"
                      ? "Reduce regret instead of forcing the buy"
                      : "先降低后悔概率，不必急着下单"}
                  </h3>
                  <p>
                    {locale === "en"
                      ? "Set an alert so timing works for you, or keep browsing until the right fit becomes obvious."
                      : "先设提醒，把价格时机留给自己；或者继续浏览相近判断，直到更明确地知道自己适不适合。"}
                  </p>
                  <div className="decision-cta-row">
                    <Link href={primaryNextStepCard.priceTrackHref} className="button-link accent">
                      {locale === "en" ? "Set an alert" : "开启提醒"}
                    </Link>
                    <Link href="#decision-grid-section" className="decision-tertiary-link">
                      {locale === "en" ? "Keep browsing related fits" : "继续浏览相近判断"}
                    </Link>
                  </div>
                </article>
              </div>
            ) : null}
          </section>

        </>
      )}
    </div>
  );
}
