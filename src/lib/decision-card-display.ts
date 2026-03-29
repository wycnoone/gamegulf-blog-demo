import type {
  BlogVerdict,
  DecisionEntryCardModel,
  PriceRecommendation,
  WorthItCardModel,
} from "@/lib/blog";
import type { BlogLocale } from "@/lib/i18n";

type CompactPriceCall = {
  label: string;
  reason: string;
};

type FeaturedSupportField = {
  label: string;
  value: string;
};

function shortenText(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  const truncated = normalized.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : maxLength)}...`;
}

function normalizeForComparison(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getKeywordOverlapRatio(left: string, right: string) {
  const leftWords = new Set(
    normalizeForComparison(left)
      .split(" ")
      .filter((word) => word.length > 2),
  );
  const rightWords = new Set(
    normalizeForComparison(right)
      .split(" ")
      .filter((word) => word.length > 2),
  );

  if (leftWords.size === 0 || rightWords.size === 0) {
    return 0;
  }

  let overlap = 0;
  leftWords.forEach((word) => {
    if (rightWords.has(word)) {
      overlap += 1;
    }
  });

  return overlap / Math.min(leftWords.size, rightWords.size);
}

export function getCompactTakeaway(text: string) {
  return shortenText(text, 78);
}

export function getCompactDecisionField(text: string, maxLength = 54) {
  return shortenText(text, maxLength);
}

function getWorthItTitlePhrase(
  verdict: WorthItCardModel["verdict"],
  locale: BlogLocale,
) {
  const labels = {
    buy_now: {
      en: "already at a smart buy price",
      "zh-hans": "已经到了合适的优惠价格",
    },
    wait_for_sale: {
      en: "better after a deeper sale",
      "zh-hans": "可以再等一等折扣价",
    },
    right_player: {
      en: "worth buying if the fit is right",
      "zh-hans": "如果适合你就值得买",
    },
    not_best_fit: {
      en: "not the best fit right now",
      "zh-hans": "现在不算最合适的选择",
    },
  };

  return labels[verdict][locale];
}

function getBuyTimingTitlePhrase(
  recommendation: PriceRecommendation,
  locale: BlogLocale,
) {
  const labels = {
    buy: {
      en: "already at a smart buy price",
      "zh-hans": "已经到了合适的优惠价格",
    },
    wait: {
      en: "better after another sale",
      "zh-hans": "可以再等一等折扣价",
    },
    watch: {
      en: "worth tracking before you buy",
      "zh-hans": "更适合先观察再买",
    },
  };

  return labels[recommendation][locale];
}

export function getDecisionDisplayTitle(card: DecisionEntryCardModel) {
  const phrase =
    card.kind === "worth-it"
      ? getWorthItTitlePhrase(card.verdict, card.locale)
      : getBuyTimingTitlePhrase(card.priceCall, card.locale);

  return card.locale === "en"
    ? `${card.gameTitle} in 2026: ${phrase}`
    : `${card.gameTitle} 在 2026 年：${phrase}`;
}

export function getDecisionScoreChip(card: DecisionEntryCardModel) {
  if (!card.reviewSignal) {
    return null;
  }

  const score = card.reviewSignal.match(/\b(\d{2,3})\b/)?.[1];
  const normalized = normalizeForComparison(card.reviewSignal);

  if (score && normalized.includes("metacritic")) {
    return card.locale === "en" ? `${score} MC` : `${score} MC`;
  }

  if (score) {
    return score;
  }

  return shortenText(card.reviewSignal, 18);
}

export function getWorthItVerdictBadge(card: WorthItCardModel) {
  const labels: Record<BlogVerdict, Record<BlogLocale, string>> = {
    buy_now: {
      en: "Strong fit",
      "zh-hans": "适配度强",
    },
    wait_for_sale: {
      en: "Fit-sensitive",
      "zh-hans": "适配度敏感",
    },
    right_player: {
      en: "Worth it for the right player",
      "zh-hans": "适合对的人就值得",
    },
    not_best_fit: {
      en: "Not the best fit",
      "zh-hans": "不算最合适",
    },
  };

  return labels[card.verdict][card.locale];
}

export function getCompactPriceCall(card: DecisionEntryCardModel): CompactPriceCall {
  const adviceLabel =
    card.locale === "en"
      ? {
          buy: "Historical low, buy now",
          wait: "Wait now, next sale ahead",
          watch: "Set alert, discount likely soon",
        }
      : {
          buy: "历史低价，立即购买",
          wait: "先观望，等待下次折扣",
          watch: "先设提醒，折扣信号将至",
        };

  const fallbackReason =
    card.locale === "en"
      ? {
          buy: "Strong entry price",
          wait: "Better upside later",
          watch: "Fit matters more",
        }
      : {
          buy: "当前入场点更强",
          wait: "继续等更划算",
          watch: "先看适配度",
        };

  const reasonSource =
    card.kind === "worth-it"
      ? card.whyNow
      : card.currentDeal || card.salePattern || card.reviewSignal || "";

  return {
    label: adviceLabel[card.priceCall],
    reason: getCompactDecisionField(reasonSource || fallbackReason[card.priceCall], 18),
  };
}

export function getFeaturedSupportField(
  card: DecisionEntryCardModel,
): FeaturedSupportField | null {
  if (card.kind !== "worth-it") {
    return null;
  }

  const primary = card.whatItIs;
  const fallback = card.mainFriction;
  const normalizedPrimary = normalizeForComparison(primary);
  const normalizedTakeaway = normalizeForComparison(card.whatItIs);
  const hasStrongRepeat =
    normalizedPrimary.includes(normalizedTakeaway) ||
    normalizedTakeaway.includes(normalizedPrimary) ||
    getKeywordOverlapRatio(primary, card.listingTakeaway) >= 0.45;

  if (!hasStrongRepeat && primary) {
    return {
      label: card.locale === "en" ? "What it is" : "这是什么体验",
      value: getCompactDecisionField(primary, 84),
    };
  }

  if (fallback) {
    return {
      label: card.locale === "en" ? "What holds it back" : "最容易后悔的点",
      value: getCompactDecisionField(fallback, 84),
    };
  }

  if (primary) {
    return {
      label: card.locale === "en" ? "What it is" : "这是什么体验",
      value: getCompactDecisionField(primary, 84),
    };
  }

  return null;
}
