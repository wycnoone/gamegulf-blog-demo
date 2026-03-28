import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import { BlogLocale, locales } from "@/lib/i18n";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.gamegulf.com";

export const categories = ["worth-it", "buy-now-or-wait"] as const;
export const defaultOgImage =
  "https://cdn.gamegulf.com/images/home/home-banner.png";
export const blogVerdicts = [
  "buy_now",
  "wait_for_sale",
  "right_player",
  "not_best_fit",
] as const;
export const playerNeedKeys = [
  "buy_now",
  "wait_for_sale",
  "long_games",
  "party_games",
  "cozy",
  "beginner_friendly",
  "casual",
  "local_multiplayer",
  "value_for_money",
] as const;
export const quickFilterKeys = [
  "co_op",
  "long_rpg",
  "family_friendly",
  "nintendo_first_party",
  "short_sessions",
  "under_20",
  "great_on_sale",
  "rarely_discounted",
] as const;
export const actionBuckets = ["buy_now", "wait", "set_alert"] as const;
export const priceRecommendations = ["buy", "wait", "watch"] as const;

export type BlogCategory = (typeof categories)[number];
export type BlogVerdict = (typeof blogVerdicts)[number];
export type PlayerNeedKey = (typeof playerNeedKeys)[number];
export type QuickFilterKey = (typeof quickFilterKeys)[number];
export type ActionBucket = (typeof actionBuckets)[number];
export type PriceRecommendation = (typeof priceRecommendations)[number];

export type FaqItem = {
  question: string;
  answer: string;
};

export type BlogPost = {
  locale: BlogLocale;
  slug: string;
  category: BlogCategory;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  gameTitle: string;
  platform: string;
  author: string;
  readingTime: string;
  decision: string;
  priceSignal: string;
  wishlistHref: string;
  priceTrackHref: string;
  gameHref: string;
  membershipHref: string;
  heroStat: string;
  heroNote: string;
  coverImage?: string;
  badge?: string;
  heroTheme?: string;
  ctaLabelOverride?: string;
  verdict?: BlogVerdict;
  takeaway?: string;
  bestFor?: string;
  timingNote?: string;
  playerNeeds?: PlayerNeedKey[];
  featuredPriority?: number;
  actionBucket?: ActionBucket;
  quickFilters?: QuickFilterKey[];
  listingTakeaway?: string;
  reviewSignal?: string;
  whatItIs?: string;
  avoidIf?: string;
  consensusPraise?: string;
  mainFriction?: string;
  timeFit?: string;
  priceCall?: PriceRecommendation;
  fitLabel?: string;
  playStyle?: string;
  timeCommitment?: string;
  playMode?: string;
  whyNow?: string;
  currentDeal?: string;
  nearHistoricalLow?: string;
  salePattern?: string;
  confidence?: "high" | "medium" | "low";
  priceRecommendation?: PriceRecommendation;
  tags: string[];
  faq: FaqItem[];
  body: string;
};

type RawFrontmatter = Omit<BlogPost, "slug" | "locale" | "body">;

export type DecisionSearchIndex = {
  gameTitle: string;
  title: string;
  tags: string[];
  quickFilters: string[];
  listingTakeaway: string;
};

type DecisionCardBase = {
  id: string;
  locale: BlogLocale;
  slug: string;
  category: BlogCategory;
  href: string;
  gameTitle: string;
  title: string;
  coverImage?: string;
  listingTakeaway: string;
  reviewSignal?: string;
  whatItIs: string;
  bestFor: string;
  avoidIf: string;
  consensusPraise: string;
  mainFriction: string;
  timeFit: string;
  priceCall: PriceRecommendation;
  priceCallLabel: string;
  confidence: "high" | "medium" | "low";
  confidenceLabel: string;
  tags: string[];
  quickFilters: QuickFilterKey[];
  actionBucket: ActionBucket;
  featuredPriority: number;
  publishedAt: string;
  readingTime: string;
  priceTrackHref: string;
  gameHref: string;
  wishlistHref: string;
  searchIndex: DecisionSearchIndex;
};

export type WorthItCardModel = DecisionCardBase & {
  kind: "worth-it";
  verdict: BlogVerdict;
  verdictBadge: string;
  whyNow: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
};

export type BuyTimingCardModel = DecisionCardBase & {
  kind: "buy-now-or-wait";
  priceRecommendation: PriceRecommendation;
  recommendationBadge: string;
  currentDeal: string;
  nearHistoricalLow: string;
  salePattern: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
};

export type DecisionEntryCardModel = WorthItCardModel | BuyTimingCardModel;

export type CompactPriceCall = {
  label: string;
  reason: string;
};

export type FeaturedSupportField = {
  label: string;
  value: string;
};

const contentRoot = path.join(process.cwd(), "content", "posts");

const categoryMeta: Record<
  BlogCategory,
  { en: string; "zh-hans": string; descriptionEn: string; descriptionZh: string }
> = {
  "worth-it": {
    en: "Worth It",
    "zh-hans": "值不值得买",
    descriptionEn:
      "Decision-focused guides for whether a Nintendo Switch game is worth buying right now.",
    descriptionZh: "围绕 Switch 游戏是否值得购买的决策型文章。",
  },
  "buy-now-or-wait": {
    en: "Buy Now or Wait",
    "zh-hans": "现在买还是等打折",
    descriptionEn:
      "Price-timing content that helps players decide whether to buy now or set an alert.",
    descriptionZh: "帮助玩家判断是立刻下单还是先观望折扣的价格时机内容。",
  },
};

const quickFilterLabelMap: Record<QuickFilterKey, Record<BlogLocale, string>> = {
  co_op: { en: "Co-op", "zh-hans": "合作/多人" },
  long_rpg: { en: "Long RPG", "zh-hans": "长流程 RPG" },
  family_friendly: { en: "Family-friendly", "zh-hans": "家庭友好" },
  nintendo_first_party: { en: "Nintendo first-party", "zh-hans": "任天堂第一方" },
  short_sessions: { en: "Best for short sessions", "zh-hans": "适合碎片时间" },
  under_20: { en: "Under $20", "zh-hans": "低于 $20" },
  great_on_sale: { en: "Great on sale", "zh-hans": "打折时很值得" },
  rarely_discounted: { en: "Rarely discounted", "zh-hans": "很少深折" },
};

function assertCategory(value: string): BlogCategory {
  if (!categories.includes(value as BlogCategory)) {
    throw new Error(`Unsupported category: ${value}`);
  }

  return value as BlogCategory;
}

function getLocaleDir(locale: BlogLocale) {
  return path.join(contentRoot, locale);
}

function assertVerdict(value?: string): BlogVerdict | undefined {
  if (!value) {
    return undefined;
  }

  if (!blogVerdicts.includes(value as BlogVerdict)) {
    throw new Error(`Unsupported verdict: ${value}`);
  }

  return value as BlogVerdict;
}

function assertPlayerNeeds(values?: string[]): PlayerNeedKey[] | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }

  values.forEach((value) => {
    if (!playerNeedKeys.includes(value as PlayerNeedKey)) {
      throw new Error(`Unsupported player need: ${value}`);
    }
  });

  return values as PlayerNeedKey[];
}

function assertQuickFilters(values?: string[]): QuickFilterKey[] | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }

  values.forEach((value) => {
    if (!quickFilterKeys.includes(value as QuickFilterKey)) {
      throw new Error(`Unsupported quick filter: ${value}`);
    }
  });

  return values as QuickFilterKey[];
}

function assertActionBucket(value?: string): ActionBucket | undefined {
  if (!value) {
    return undefined;
  }

  if (!actionBuckets.includes(value as ActionBucket)) {
    throw new Error(`Unsupported action bucket: ${value}`);
  }

  return value as ActionBucket;
}

function assertPriceRecommendation(value?: string): PriceRecommendation | undefined {
  if (!value) {
    return undefined;
  }

  if (!priceRecommendations.includes(value as PriceRecommendation)) {
    throw new Error(`Unsupported price recommendation: ${value}`);
  }

  return value as PriceRecommendation;
}

function parsePost(filePath: string, locale: BlogLocale): BlogPost {
  const source = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(source);
  const frontmatter = data as RawFrontmatter;
  const slug = path.basename(filePath, ".md");

  return {
    locale,
    slug,
    category: assertCategory(frontmatter.category),
    title: frontmatter.title,
    description: frontmatter.description,
    publishedAt: frontmatter.publishedAt,
    updatedAt: frontmatter.updatedAt,
    gameTitle: frontmatter.gameTitle,
    platform: frontmatter.platform,
    author: frontmatter.author,
    readingTime: frontmatter.readingTime,
    decision: frontmatter.decision,
    priceSignal: frontmatter.priceSignal,
    wishlistHref: frontmatter.wishlistHref,
    priceTrackHref: frontmatter.priceTrackHref,
    gameHref: frontmatter.gameHref,
    membershipHref: frontmatter.membershipHref,
    heroStat: frontmatter.heroStat,
    heroNote: frontmatter.heroNote,
    coverImage: frontmatter.coverImage,
    badge: frontmatter.badge,
    heroTheme: frontmatter.heroTheme,
    ctaLabelOverride: frontmatter.ctaLabelOverride,
    verdict: assertVerdict(frontmatter.verdict),
    takeaway: frontmatter.takeaway,
    bestFor: frontmatter.bestFor,
    timingNote: frontmatter.timingNote,
    playerNeeds: assertPlayerNeeds(frontmatter.playerNeeds),
    featuredPriority: frontmatter.featuredPriority,
    actionBucket: assertActionBucket(frontmatter.actionBucket),
    quickFilters: assertQuickFilters(frontmatter.quickFilters),
    listingTakeaway: frontmatter.listingTakeaway,
    reviewSignal: frontmatter.reviewSignal,
    whatItIs: frontmatter.whatItIs,
    avoidIf: frontmatter.avoidIf,
    consensusPraise: frontmatter.consensusPraise,
    mainFriction: frontmatter.mainFriction,
    timeFit: frontmatter.timeFit,
    priceCall: assertPriceRecommendation(frontmatter.priceCall),
    fitLabel: frontmatter.fitLabel,
    playStyle: frontmatter.playStyle,
    timeCommitment: frontmatter.timeCommitment,
    playMode: frontmatter.playMode,
    whyNow: frontmatter.whyNow,
    currentDeal: frontmatter.currentDeal,
    nearHistoricalLow: frontmatter.nearHistoricalLow,
    salePattern: frontmatter.salePattern,
    confidence: frontmatter.confidence,
    priceRecommendation: assertPriceRecommendation(frontmatter.priceRecommendation),
    tags: frontmatter.tags,
    faq: frontmatter.faq,
    body: content,
  };
}

export function getAllPosts(locale: BlogLocale): BlogPost[] {
  const localeDir = getLocaleDir(locale);

  if (!fs.existsSync(localeDir)) {
    return [];
  }

  return fs
    .readdirSync(localeDir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => parsePost(path.join(localeDir, file), locale))
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
}

export function getPostsByCategory(locale: BlogLocale, category: BlogCategory) {
  return getAllPosts(locale).filter((post) => post.category === category);
}

export function getPost(locale: BlogLocale, category: string, slug: string) {
  const posts = getAllPosts(locale);
  return posts.find((post) => post.category === category && post.slug === slug);
}

export async function renderMarkdown(markdown: string) {
  const file = await remark().use(html).process(markdown);
  return file.toString();
}

export function getRelatedPosts(post: BlogPost, limit = 3) {
  return getAllPosts(post.locale)
    .filter((candidate) => candidate.slug !== post.slug)
    .filter((candidate) => candidate.category === post.category)
    .slice(0, limit);
}

export function getAlternatePostPath(post: BlogPost) {
  const otherLocale = locales.find((locale) => locale !== post.locale);

  if (!otherLocale) {
    return undefined;
  }

  const translated = getPost(otherLocale, post.category, post.slug);

  if (!translated) {
    return undefined;
  }

  return `/blog/${otherLocale}/${translated.category}/${translated.slug}`;
}

export function getCategoryMeta(locale: BlogLocale, category: BlogCategory) {
  const meta = categoryMeta[category];

  return {
    title: meta[locale],
    description: locale === "en" ? meta.descriptionEn : meta.descriptionZh,
  };
}

export function getLocaleAlternates(
  pathnameByLocale: Partial<Record<BlogLocale, string>>,
) {
  const alternates = Object.fromEntries(
    locales
      .filter((locale) => pathnameByLocale[locale])
      .map((locale) => [locale, `${siteUrl}${pathnameByLocale[locale]}`]),
  );

  const defaultPath =
    pathnameByLocale.en || Object.values(pathnameByLocale).find(Boolean);

  return {
    ...alternates,
    ...(defaultPath ? { "x-default": `${siteUrl}${defaultPath}` } : {}),
  };
}

export function getOgImage(post?: Pick<BlogPost, "coverImage">) {
  return post?.coverImage || defaultOgImage;
}

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

function sentenceCaseLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function containsAny(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function sortByPriorityAndDate<T extends { featuredPriority: number; publishedAt: string }>(
  left: T,
  right: T,
) {
  if (left.featuredPriority !== right.featuredPriority) {
    return left.featuredPriority - right.featuredPriority;
  }

  return +new Date(right.publishedAt) - +new Date(left.publishedAt);
}

export function getVerdictLabel(verdict: BlogVerdict, locale: BlogLocale) {
  const labels: Record<BlogVerdict, Record<BlogLocale, string>> = {
    buy_now: {
      en: "Buy now",
      "zh-hans": "现在买",
    },
    wait_for_sale: {
      en: "Wait for sale",
      "zh-hans": "等打折",
    },
    right_player: {
      en: "Worth it for the right player",
      "zh-hans": "适合对的人就值得买",
    },
    not_best_fit: {
      en: "Not the best fit right now",
      "zh-hans": "现在不一定最适合你",
    },
  };

  return labels[verdict][locale];
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

export function getPlayerNeedLabel(need: PlayerNeedKey, locale: BlogLocale) {
  const labels: Record<PlayerNeedKey, Record<BlogLocale, string>> = {
    buy_now: { en: "Buy now", "zh-hans": "现在买" },
    wait_for_sale: { en: "Wait for sale", "zh-hans": "等打折" },
    long_games: { en: "Long games", "zh-hans": "长流程" },
    party_games: { en: "Party games", "zh-hans": "派对多人" },
    cozy: { en: "Cozy", "zh-hans": "轻松治愈" },
    beginner_friendly: { en: "Beginner-friendly", "zh-hans": "新手友好" },
    casual: { en: "Casual", "zh-hans": "轻量休闲" },
    local_multiplayer: { en: "Local multiplayer", "zh-hans": "本地多人" },
    value_for_money: { en: "Value for money", "zh-hans": "性价比" },
  };

  return labels[need][locale];
}

export function getQuickFilterLabel(filter: QuickFilterKey, locale: BlogLocale) {
  return quickFilterLabelMap[filter][locale];
}

function getFallbackVerdict(post: BlogPost): BlogVerdict {
  if (post.category === "buy-now-or-wait") {
    return /wait|track/i.test(post.decision) ? "wait_for_sale" : "buy_now";
  }

  if (/not suit|not the best fit|wait/i.test(post.decision)) {
    return "right_player";
  }

  return "right_player";
}

function inferQuickFilters(post: BlogPost): QuickFilterKey[] {
  if (post.quickFilters && post.quickFilters.length > 0) {
    return post.quickFilters;
  }

  const filters = new Set<QuickFilterKey>();
  const titleText = `${post.title} ${post.gameTitle} ${post.description} ${post.priceSignal} ${post.heroNote}`.toLowerCase();
  const tagsText = post.tags.join(" ").toLowerCase();

  if (
    post.playerNeeds?.includes("party_games") ||
    post.playerNeeds?.includes("local_multiplayer") ||
    containsAny(tagsText, ["co-op", "multiplayer"])
  ) {
    filters.add("co_op");
  }

  if (
    post.playerNeeds?.includes("long_games") ||
    containsAny(titleText, ["jrpg", "long", "100-hour", "80-hour"])
  ) {
    filters.add("long_rpg");
  }

  if (
    post.playerNeeds?.includes("beginner_friendly") ||
    containsAny(titleText, ["family", "kids", "household", "beginner"])
  ) {
    filters.add("family_friendly");
  }

  if (
    containsAny(post.gameTitle.toLowerCase(), [
      "mario",
      "zelda",
      "metroid",
      "pikmin",
      "animal crossing",
    ])
  ) {
    filters.add("nintendo_first_party");
  }

  if (
    post.playerNeeds?.includes("casual") ||
    post.playerNeeds?.includes("cozy") ||
    containsAny(titleText, ["short sessions", "short session", "routine", "dip into"])
  ) {
    filters.add("short_sessions");
  }

  if (
    containsAny(titleText, [
      "eur 10",
      "eur 12",
      "eur 1",
      "eur 2",
      "$20",
      "under $20",
      "under 20",
    ])
  ) {
    filters.add("under_20");
  }

  if (containsAny(titleText, ["deep sale", "great sale", "favorable sale", "strong value"])) {
    filters.add("great_on_sale");
  }

  if (containsAny(titleText, ["hold value", "rarely drop", "rarely discounted", "do not always drop"])) {
    filters.add("rarely_discounted");
  }

  return Array.from(filters);
}

function inferActionBucket(post: BlogPost, verdict: BlogVerdict): ActionBucket {
  if (post.actionBucket) {
    return post.actionBucket;
  }

  if (post.priceCall) {
    if (post.priceCall === "buy") {
      return "buy_now";
    }

    if (post.priceCall === "wait") {
      return "wait";
    }

    return "set_alert";
  }

  if (post.category === "buy-now-or-wait") {
    if (post.priceRecommendation === "buy") {
      return "buy_now";
    }

    if (post.priceRecommendation === "wait") {
      return "wait";
    }

    if (post.priceRecommendation === "watch") {
      return "set_alert";
    }
  }

  if (verdict === "buy_now") {
    return "buy_now";
  }

  if (verdict === "wait_for_sale") {
    return "wait";
  }

  if (verdict === "right_player") {
    return "set_alert";
  }

  return "wait";
}

function getDisplayListingTakeaway(post: BlogPost) {
  return shortenText(post.listingTakeaway || post.description, 96);
}

function getDisplayReviewSignal(post: BlogPost) {
  return shortenText(post.reviewSignal || post.heroStat, 56);
}

function getDisplayWhatItIs(post: BlogPost) {
  const fallback =
    post.whatItIs ||
    post.playStyle ||
    post.description ||
    (post.locale === "en"
      ? "A Switch game best judged by fit, payoff, and price timing."
      : "一款更适合按玩家适配、投入回报和价格时机来判断的 Switch 游戏。");

  return shortenText(fallback, 96);
}

function getDisplayQuickFilterTags(post: BlogPost) {
  const filters = inferQuickFilters(post);

  if (filters.length > 0) {
    return filters.slice(0, 2).map((filter) => quickFilterLabelMap[filter][post.locale]);
  }

  return post.tags.slice(0, 2).map((tag) => sentenceCaseLabel(tag));
}

function getDisplayFitLabel(post: BlogPost) {
  return shortenText(post.bestFor || post.fitLabel || post.decision, 72);
}

function getDisplayAvoidIf(post: BlogPost) {
  if (post.avoidIf) {
    return shortenText(post.avoidIf, 72);
  }

  if (post.mainFriction) {
    return shortenText(post.mainFriction, 72);
  }

  const fallback =
    post.playerNeeds?.includes("long_games")
      ? post.locale === "en"
        ? "Avoid if you want a short, fast-payoff game."
        : "如果你想要短平快、回报更快的游戏，就不太适合。"
      : post.playerNeeds?.includes("local_multiplayer") ||
          post.playerNeeds?.includes("party_games")
        ? post.locale === "en"
          ? "Avoid if you mostly play solo and rarely host others."
          : "如果你大多单人游玩、很少和别人一起玩，就不太适合。"
        : post.playerNeeds?.includes("cozy")
          ? post.locale === "en"
            ? "Avoid if you want tension, challenge, or rapid progression."
            : "如果你更想要紧张挑战或高速推进，这类游戏就不太适合。"
          : post.locale === "en"
            ? "Avoid if the fit still feels unclear."
            : "如果你还拿不准自己是否会喜欢，先不要急着买。";

  return shortenText(fallback, 72);
}

function getDisplayConsensusPraise(post: BlogPost) {
  const fallback =
    post.consensusPraise ||
    post.reviewSignal ||
    post.heroNote ||
    (post.locale === "en"
      ? "Players usually rate the fit and quality highly when the genre already clicks."
      : "当玩法类型本身对味时，这款游戏通常能得到很高的认可。");

  return shortenText(fallback, 82);
}

function getDisplayMainFriction(post: BlogPost) {
  const fallback =
    post.mainFriction ||
    post.avoidIf ||
    (post.playerNeeds?.includes("long_games")
      ? post.locale === "en"
        ? "Big time commitment and a slower payoff can turn into regret for the wrong player."
        : "投入时间较大、回报偏慢，容易让不对胃口的玩家后悔。"
      : post.playerNeeds?.includes("local_multiplayer") ||
          post.playerNeeds?.includes("party_games")
        ? post.locale === "en"
          ? "The value drops if you mostly play alone or rarely bring others in."
          : "如果你主要单人玩、很少和别人一起玩，它的价值会明显下降。"
        : post.locale === "en"
          ? "Fit matters more than reputation here, so the main risk is buying into the wrong play pattern."
          : "这类游戏更看适配度，最大的风险是买到了不适合自己的体验。");

  return shortenText(fallback, 84);
}

function getDisplayTimeFit(post: BlogPost) {
  const fallback =
    post.playerNeeds?.includes("long_games")
      ? post.locale === "en"
        ? "Long commitment, strong payoff if you want one big game."
        : "投入周期偏长，但如果你想要一款能玩很久的大作，回报很强。"
      : post.playerNeeds?.includes("casual") || post.playerNeeds?.includes("cozy")
        ? post.locale === "en"
          ? "Works best in short repeat sessions rather than long marathons."
          : "更适合碎片时间反复游玩，而不是长时间马拉松。"
        : post.locale === "en"
          ? "Moderate commitment with a fairly clear payoff curve."
          : "整体投入强度中等，回报节奏也比较清楚。";

  return shortenText(post.timeFit || post.timeCommitment || fallback, 82);
}

function getDisplayWhyNow(post: BlogPost) {
  return shortenText(post.whyNow || post.priceSignal, 76);
}

export function getCompactTakeaway(text: string) {
  return shortenText(text, 78);
}

export function getCompactDecisionField(text: string, maxLength = 54) {
  return shortenText(text, maxLength);
}

export function getCompactPriceCall(card: DecisionEntryCardModel): CompactPriceCall {
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
    label: card.priceCallLabel,
    reason: getCompactDecisionField(reasonSource || fallbackReason[card.priceCall], 32),
  };
}

function getDisplayCurrentDeal(post: BlogPost) {
  return shortenText(post.currentDeal || post.priceSignal, 72);
}

function getDisplayNearHistoricalLow(post: BlogPost) {
  const fallback =
    containsAny(post.priceSignal.toLowerCase(), ["global low", "deep discount", "near low"])
      ? post.locale === "en"
        ? "Current pricing is close to a strong low signal."
        : "当前价格已经接近较强低点信号。"
      : post.locale === "en"
        ? "Not a proven low, so compare before buying."
        : "还不能直接判断为低点，建议先比较价格。";

  return shortenText(post.nearHistoricalLow || fallback, 72);
}

function getDisplaySalePattern(post: BlogPost) {
  return shortenText(post.salePattern || post.priceSignal, 72);
}

function getDisplayConfidence(post: BlogPost, verdict: BlogVerdict): "high" | "medium" | "low" {
  if (post.confidence) {
    return post.confidence;
  }

  if (verdict === "buy_now" && containsAny(post.priceSignal.toLowerCase(), ["deep", "global low", "strong"])) {
    return "high";
  }

  if (verdict === "wait_for_sale") {
    return "medium";
  }

  return "medium";
}

function getConfidenceLabel(confidence: "high" | "medium" | "low", locale: BlogLocale) {
  const labels = {
    high: { en: "High", "zh-hans": "高" },
    medium: { en: "Medium", "zh-hans": "中" },
    low: { en: "Low", "zh-hans": "低" },
  };

  return labels[confidence][locale];
}

function inferPriceCall(post: BlogPost, verdict: BlogVerdict): PriceRecommendation {
  if (post.priceCall) {
    return post.priceCall;
  }

  if (post.priceRecommendation) {
    return post.priceRecommendation;
  }

  if (verdict === "buy_now") {
    return "buy";
  }

  if (containsAny(post.priceSignal.toLowerCase(), ["alert", "track", "watch"])) {
    return "watch";
  }

  return "wait";
}

function getPriceRecommendationLabel(
  recommendation: PriceRecommendation,
  locale: BlogLocale,
) {
  const labels = {
    buy: { en: "Buy now", "zh-hans": "现在买" },
    wait: { en: "Wait", "zh-hans": "先等等" },
    watch: { en: "Set alert", "zh-hans": "先设提醒" },
  };

  return labels[recommendation][locale];
}

function getSearchIndex(post: BlogPost): DecisionSearchIndex {
  const quickFilters = inferQuickFilters(post).map((filter) =>
    quickFilterLabelMap[filter][post.locale].toLowerCase(),
  );

  return {
    gameTitle: post.gameTitle.toLowerCase(),
    title: post.title.toLowerCase(),
    tags: post.tags.map((tag) => tag.toLowerCase()),
    quickFilters,
    listingTakeaway: getDisplayListingTakeaway(post).toLowerCase(),
  };
}

export function prepareDecisionEntryCard(post: BlogPost): DecisionEntryCardModel {
  const verdict = post.verdict || getFallbackVerdict(post);
  const actionBucket = inferActionBucket(post, verdict);
  const priceCall = inferPriceCall(post, verdict);
  const confidence = getDisplayConfidence(post, verdict);
  const base = {
    id: `${post.locale}-${post.slug}`,
    locale: post.locale,
    slug: post.slug,
    category: post.category,
    href: `/blog/${post.locale}/${post.category}/${post.slug}`,
    gameTitle: post.gameTitle,
    title: post.title,
    coverImage: post.coverImage,
    listingTakeaway: getDisplayListingTakeaway(post),
    reviewSignal: getDisplayReviewSignal(post),
    whatItIs: getDisplayWhatItIs(post),
    bestFor: getDisplayFitLabel(post),
    avoidIf: getDisplayAvoidIf(post),
    consensusPraise: getDisplayConsensusPraise(post),
    mainFriction: getDisplayMainFriction(post),
    timeFit: getDisplayTimeFit(post),
    priceCall,
    priceCallLabel: getPriceRecommendationLabel(priceCall, post.locale),
    confidence,
    confidenceLabel: getConfidenceLabel(confidence, post.locale),
    tags: getDisplayQuickFilterTags(post),
    quickFilters: inferQuickFilters(post),
    actionBucket,
    featuredPriority: post.featuredPriority ?? 999,
    publishedAt: post.publishedAt,
    readingTime: post.readingTime,
    priceTrackHref: post.priceTrackHref,
    gameHref: post.gameHref,
    wishlistHref: post.wishlistHref,
    searchIndex: getSearchIndex(post),
  } satisfies DecisionCardBase;

  if (post.category === "worth-it") {
    return {
      ...base,
      kind: "worth-it",
      verdict,
      verdictBadge: getVerdictLabel(verdict, post.locale),
      whyNow: getDisplayWhyNow(post),
      primaryCtaLabel: post.locale === "en" ? "Read decision" : "查看判断",
      secondaryCtaLabel: post.locale === "en" ? "Set alert" : "开启提醒",
    };
  }

  return {
    ...base,
    kind: "buy-now-or-wait",
    priceRecommendation: priceCall,
    recommendationBadge: getPriceRecommendationLabel(priceCall, post.locale),
    currentDeal: getDisplayCurrentDeal(post),
    nearHistoricalLow: getDisplayNearHistoricalLow(post),
    salePattern: getDisplaySalePattern(post),
    primaryCtaLabel:
      priceCall === "buy"
        ? post.locale === "en"
          ? "View pricing"
          : "查看价格"
        : post.locale === "en"
          ? "See price signal"
          : "查看价格信号",
    primaryCtaHref: priceCall === "buy" ? post.gameHref : post.priceTrackHref,
    secondaryCtaLabel: post.locale === "en" ? "Set alert" : "开启提醒",
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
  const normalizedTakeaway = normalizeForComparison(card.listingTakeaway);
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

export function getDecisionEntryCards(locale: BlogLocale) {
  return getAllPosts(locale)
    .map((post) => prepareDecisionEntryCard(post))
    .sort(sortByPriorityAndDate);
}

export function getDecisionEntryCardsByCategory(
  locale: BlogLocale,
  category: BlogCategory,
) {
  return getPostsByCategory(locale, category)
    .map((post) => prepareDecisionEntryCard(post))
    .sort(sortByPriorityAndDate);
}

export function getAllBlogPaths() {
  return locales.flatMap((locale) =>
    getAllPosts(locale).map((post) => ({
      locale,
      category: post.category,
      slug: post.slug,
      updatedAt: post.updatedAt || post.publishedAt,
    })),
  );
}

export function formatDate(date: string, locale: BlogLocale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}
