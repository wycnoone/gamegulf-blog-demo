"use client";

import type { BlogLocale } from "@/lib/i18n";

type TrustModuleProps = {
  locale: BlogLocale;
  compact?: boolean;
};

const trustItems = [
  "price history",
  "sale timing patterns",
  "critic / player sentiment",
  "genre and player fit",
  "value vs time commitment",
];

const trustItemsZh = [
  "价格历史",
  "折扣时机规律",
  "媒体 / 玩家口碑",
  "类型与玩家适配",
  "内容价值与投入时间",
];

export function TrustModule({ locale, compact = false }: TrustModuleProps) {
  const items = locale === "en" ? trustItems : trustItemsZh;

  return (
    <section className={`trust-module ${compact ? "compact" : ""}`}>
      <div className="section-head">
        <div>
          <h2>{locale === "en" ? "How these guides work" : "这些指南如何得出判断"}</h2>
          <p>
            {locale === "en"
              ? "These recommendations are built from price behavior, player fit, and the practical tradeoff between value and time."
              : "这些判断不是泛泛而谈的导语，而是围绕价格行为、玩家适配与时间价值做出的结论。"}
          </p>
        </div>
      </div>
      <div className="trust-grid">
        {items.map((item) => (
          <div key={item} className="trust-item">
            <span className="trust-dot" aria-hidden="true" />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
