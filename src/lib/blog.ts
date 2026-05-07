import { getCollection, render, type CollectionEntry } from 'astro:content';
import { type BlogLocale, locales, intlLocales, langTags } from '@/lib/i18n';
import { formatAdaptivePriceSummary, type CardPriceData, type StructuredPriceRow } from '@/lib/pricing';
import { shortenText, normalizeForComparison } from '@/lib/text-utils';

export * from './blog-shared';
import {
  siteUrl,
  blogBasePath,
  defaultOgImage,
  quickFilterLabelMap,
  type BlogCategory,
  type BlogVerdict,
  type PlayerNeedKey,
  type QuickFilterKey,
  type ActionBucket,
  type PriceRecommendation,
  type FaqItem,
  type DecisionSearchIndex,
  type DecisionCardBase,
  type WorthItCardModel,
  type BuyTimingCardModel,
  type DecisionEntryCardModel,
} from './blog-shared';

// ── Imports from extracted modules ──
export {
  categoryMeta,
  confidenceLabels,
  priceRecommendationLabels,
  verdictLabels,
  ctaReadGuide,
  ctaSetAlert,
  fallbackWhatItIs,
  fallbackAvoidIf,
  fallbackConsensusPraise,
  fallbackMainFriction,
  fallbackTimeFit,
  fallbackNearHistoricalLow,
  REGION_CODE_LOOKUP,
  inferRegionCode,
} from './blog-i18n';

export {
  containsAny,
  sentenceCaseLabel,
  extractMetacriticScore,
  sortByPriorityAndDate,
  getFallbackVerdict,
  inferQuickFilters,
  inferActionBucket,
  inferPriceCall,
} from './blog-inference';

import {
  categoryMeta,
  confidenceLabels,
  priceRecommendationLabels,
  verdictLabels,
  ctaReadGuide,
  ctaSetAlert,
  fallbackWhatItIs,
  fallbackAvoidIf,
  fallbackConsensusPraise,
  fallbackMainFriction,
  fallbackTimeFit,
  fallbackNearHistoricalLow,
  inferRegionCode,
} from './blog-i18n';

import {
  containsAny,
  sentenceCaseLabel,
  extractMetacriticScore,
  sortByPriorityAndDate,
  getFallbackVerdict,
  inferQuickFilters,
  inferActionBucket,
  inferPriceCall,
} from './blog-inference';

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
  primaryPlatformKey?: string;
  primaryPlatformLabel?: string;
  hasOtherPlatforms?: boolean;
  otherPlatformLabels?: string[];
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
  communityVibe?: string;
  playtime?: string;
  whyNow?: string;
  currentDeal?: string;
  nearHistoricalLow?: string;
  salePattern?: string;
  confidence?: 'high' | 'medium' | 'low';
  priceRecommendation?: PriceRecommendation;
  playerVoices?: { quote: string; sentiment: 'positive' | 'negative' | 'mixed' }[];
  communityMemes?: string[];
  tldr?: string;
  cardPrice?: string;
  cardPriceRegion?: string;
  cardPriceData?: CardPriceData;
  priceRows?: StructuredPriceRow[];
  tags: string[];
  faq: FaqItem[];
  body: string;
  _entry: CollectionEntry<'posts'>;
};

// ── Entry/post helpers ──

function inferCardPriceDataFromLegacy(cardPrice?: string, cardPriceRegion?: string): CardPriceData | undefined {
  if (!cardPrice || !cardPriceRegion) return undefined;
  const eurMatch = cardPrice.match(/€\s?(\d+(?:\.\d+)?)/u);
  const eurPrice = eurMatch ? Number.parseFloat(eurMatch[1]) : NaN;
  const regionCode = inferRegionCode(cardPriceRegion);
  if (!Number.isFinite(eurPrice) || !regionCode) return undefined;
  return {
    eurPrice,
    regionCode,
  };
}

/**
 * Remainder of article H1 after removing the game name (second line in split title layout).
 * Handles 《》/『』 wrapping, optional ™/® vs plain title, and accidental outer "…" from bad YAML.
 */
export function getArticleTitleQuestion(locale: BlogLocale, title: string, gameTitle: string): string {
  let t = title.trim();
  while (t.length >= 2 && t.startsWith('"') && t.endsWith('"')) {
    t = t.slice(1, -1).trim();
  }
  const gt = gameTitle.trim();

  if (locale === 'zh-hans' || locale === 'ja') {
    let q = t;
    q = q.replace(`《${gt}》`, '');
    q = q.replace(`『${gt}』`, '');
    q = q.replace(`「${gt}」`, '');
    q = q.replace(gt, '');
    return q.replace(/^[\s：:—–\-《》「」『』]+/u, '').trim();
  }

  let q = t.replace(/\s+/g, ' ').trim();
  const variants = [gt];
  if (gt.includes('\u2122')) variants.push(gt.replace(/\u2122/g, '').replace(/\s+/g, ' ').trim());
  if (gt.includes('\u00ae')) variants.push(gt.replace(/\u00ae/g, '').replace(/\s+/g, ' ').trim());
  variants.sort((a, b) => b.length - a.length);
  let replaced = false;
  for (const v of variants) {
    if (v && q.includes(v)) {
      q = q.replace(v, '');
      replaced = true;
      break;
    }
  }
  if (!replaced) q = q.replace(gt, '');
  q = q.replace(/\s+/g, ' ').trim();
  return q.replace(/^Is\s+/i, '').replace(/^[\s:—–-]+/, '');
}

function entryToPost(entry: CollectionEntry<'posts'>): BlogPost {
  const parts = entry.id.split('/');
  const locale = parts[0] as BlogLocale;
  const slug = parts.slice(1).join('/').replace(/\.md$/, '');
  const d = entry.data;
  return {
    locale,
    slug,
    category: d.category,
    title: d.title,
    description: d.description,
    publishedAt: d.publishedAt,
    updatedAt: d.updatedAt,
    gameTitle: d.gameTitle,
    platform: d.platform,
    primaryPlatformKey: d.primaryPlatformKey,
    primaryPlatformLabel: d.primaryPlatformLabel,
    hasOtherPlatforms: d.hasOtherPlatforms,
    otherPlatformLabels: d.otherPlatformLabels,
    author: d.author,
    readingTime: d.readingTime,
    decision: d.decision,
    priceSignal: d.priceSignal,
    wishlistHref: d.wishlistHref,
    priceTrackHref: d.priceTrackHref,
    gameHref: d.gameHref,
    membershipHref: d.membershipHref,
    heroStat: d.heroStat,
    heroNote: d.heroNote,
    coverImage: d.coverImage,
    badge: d.badge,
    heroTheme: d.heroTheme,
    ctaLabelOverride: d.ctaLabelOverride,
    verdict: d.verdict,
    takeaway: d.takeaway,
    bestFor: d.bestFor,
    timingNote: d.timingNote,
    playerNeeds: d.playerNeeds,
    featuredPriority: d.featuredPriority,
    actionBucket: d.actionBucket,
    quickFilters: d.quickFilters,
    listingTakeaway: d.listingTakeaway,
    reviewSignal: d.reviewSignal,
    whatItIs: d.whatItIs,
    avoidIf: d.avoidIf,
    consensusPraise: d.consensusPraise,
    mainFriction: d.mainFriction,
    timeFit: d.timeFit,
    priceCall: d.priceCall,
    fitLabel: d.fitLabel,
    playStyle: d.playStyle,
    timeCommitment: d.timeCommitment,
    playMode: d.playMode,
    communityVibe: d.communityVibe || d.performance,
    playtime: d.playtime,
    whyNow: d.whyNow,
    currentDeal: d.currentDeal,
    nearHistoricalLow: d.nearHistoricalLow,
    salePattern: d.salePattern,
    confidence: d.confidence,
    priceRecommendation: d.priceRecommendation,
    playerVoices: d.playerVoices,
    communityMemes: d.communityMemes,
    tldr: d.tldr,
    cardPrice: d.cardPrice,
    cardPriceRegion: d.cardPriceRegion,
    cardPriceData: d.cardPriceEur !== undefined
      && d.cardPriceRegionCode
      ? {
        eurPrice: d.cardPriceEur,
        regionCode: d.cardPriceRegionCode,
      }
      : inferCardPriceDataFromLegacy(d.cardPrice, d.cardPriceRegion),
    priceRows: d.priceRows,
    tags: d.tags,
    faq: d.faq,
    body: '',
    _entry: entry,
  };
}

export async function getAllPosts(locale: BlogLocale): Promise<BlogPost[]> {
  const entries = await getCollection('posts', ({ id }) => id.startsWith(`${locale}/`));
  return entries
    .map(entryToPost)
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
}

export async function getPostsByCategory(locale: BlogLocale, category: BlogCategory) {
  const posts = await getAllPosts(locale);
  return posts.filter((p) => p.category === category);
}

export async function getPost(locale: BlogLocale, slug: string) {
  const posts = await getAllPosts(locale);
  return posts.find((p) => p.slug === slug);
}

export async function renderPost(post: BlogPost) {
  const { Content } = await render(post._entry);
  return Content;
}

export async function renderPostHtml(post: BlogPost) {
  const result = await render(post._entry);
  return result;
}

export async function getRelatedPosts(post: BlogPost, limit = 3) {
  const posts = await getAllPosts(post.locale);
  const postTags = new Set(post.tags.map((t) => t.toLowerCase()));
  return posts
    .filter((p) => p.slug !== post.slug)
    .map((p) => {
      let score = 0;
      if (p.category === post.category) score += 3;
      for (const t of p.tags) {
        if (postTags.has(t.toLowerCase())) score += 1;
      }
      return { post: p, score };
    })
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((e) => e.post);
}

export async function getAlternatePostPaths(post: BlogPost): Promise<Partial<Record<BlogLocale, string>>> {
  const result: Partial<Record<BlogLocale, string>> = {};
  for (const l of locales) {
    if (l === post.locale) continue;
    const translated = await getPost(l, post.slug);
    if (translated) {
      result[l] = `${blogBasePath}/${l}/${translated.slug}`;
    }
  }
  return result;
}

export function getCategoryMeta(locale: BlogLocale, category: BlogCategory) {
  const meta = categoryMeta[category];
  return {
    title: meta.title[locale],
    description: meta.description[locale],
  };
}

export function getLocaleAlternates(pathnameByLocale: Partial<Record<BlogLocale, string>>) {
  const alternates = Object.fromEntries(
    locales
      .filter((l) => pathnameByLocale[l])
      .map((l) => [langTags[l], `${siteUrl}${pathnameByLocale[l]}`]),
  );
  const defaultPath = pathnameByLocale.en || Object.values(pathnameByLocale).find(Boolean);
  return { ...alternates, ...(defaultPath ? { 'x-default': `${siteUrl}${defaultPath}` } : {}) };
}

export function getOgImage(post?: Pick<BlogPost, 'coverImage'>) {
  return post?.coverImage || defaultOgImage;
}

export { shortenText, normalizeForComparison } from '@/lib/text-utils';

function getDisplayListingTakeaway(post: BlogPost) { return shortenText(post.listingTakeaway || post.description, 96); }
function getDisplayReviewSignal(post: BlogPost) { return shortenText(post.reviewSignal || post.heroStat, 56); }
function getDisplayWhatItIs(post: BlogPost) {
  return shortenText(post.whatItIs || post.playStyle || post.description || fallbackWhatItIs[post.locale], 96);
}
function getDisplayQuickFilterTags(post: BlogPost) {
  const filters = inferQuickFilters(post);
  if (filters.length > 0) return filters.slice(0, 2).map((f) => quickFilterLabelMap[f][post.locale]);
  return post.tags.slice(0, 2).map((t) => sentenceCaseLabel(t));
}
function getDisplayFitLabel(post: BlogPost) { return shortenText(post.bestFor || post.fitLabel || post.decision, 72); }
function getDisplayAvoidIf(post: BlogPost) {
  if (post.avoidIf) return shortenText(post.avoidIf, 72);
  if (post.mainFriction) return shortenText(post.mainFriction, 72);
  const l = post.locale;
  const fallback = post.playerNeeds?.includes('long_games')
    ? fallbackAvoidIf.long_games[l]
    : post.playerNeeds?.includes('local_multiplayer') || post.playerNeeds?.includes('party_games')
      ? fallbackAvoidIf.multiplayer[l]
      : post.playerNeeds?.includes('cozy')
        ? fallbackAvoidIf.cozy[l]
        : fallbackAvoidIf.default[l];
  return shortenText(fallback, 72);
}
function getDisplayConsensusPraise(post: BlogPost) {
  return shortenText(post.consensusPraise || post.reviewSignal || post.heroNote || fallbackConsensusPraise[post.locale], 82);
}
function getDisplayMainFriction(post: BlogPost) {
  const l = post.locale;
  const fallback = post.mainFriction || post.avoidIf ||
    (post.playerNeeds?.includes('long_games')
      ? fallbackMainFriction.long_games[l]
      : post.playerNeeds?.includes('local_multiplayer') || post.playerNeeds?.includes('party_games')
        ? fallbackMainFriction.multiplayer[l]
        : fallbackMainFriction.default[l]);
  return shortenText(fallback, 84);
}
function getDisplayTimeFit(post: BlogPost) {
  const l = post.locale;
  const fallback = post.playerNeeds?.includes('long_games')
    ? fallbackTimeFit.long_games[l]
    : post.playerNeeds?.includes('casual') || post.playerNeeds?.includes('cozy')
      ? fallbackTimeFit.casual[l]
      : fallbackTimeFit.default[l];
  return shortenText(post.timeFit || post.timeCommitment || post.playtime || fallback, 82);
}

function getCardPlaytimeText(post: BlogPost) {
  const raw = (post.playtime || post.timeCommitment || post.timeFit || getDisplayTimeFit(post)).replace(/\s+/g, ' ').trim();
  const locale = post.locale;

  const localePatterns: Partial<Record<BlogLocale, Array<{ pattern: RegExp; format: (match: RegExpMatchArray) => string }>>> = {
    en: [
      { pattern: /^(\d+)h main\b/iu, format: (m) => `~${m[1]}h main` },
      { pattern: /^Estimated scope:\s*(\d+–\d+)h main\b/iu, format: (m) => `${m[1]}h main` },
      { pattern: /^Estimated:\s*~?(\d+–\d+) min runs\b/iu, format: (m) => `${m[1]} min runs` },
      { pattern: /^No fixed ending;\s*~?(\d+–\d+) min sessions\b/iu, format: (m) => `${m[1]} min sessions` },
    ],
    'zh-hans': [
      { pattern: /^约(\d+)小时主线/u, format: (m) => `主线约${m[1]}小时` },
      { pattern: /^预估体量：主线约(\d+–\d+)小时/u, format: (m) => `主线约${m[1]}小时` },
      { pattern: /^预估：单局约(\d+–\d+)分钟/u, format: (m) => `单局约${m[1]}分钟` },
      { pattern: /^无固定通关线；单次约(\d+–\d+)分钟/u, format: (m) => `单次约${m[1]}分钟` },
    ],
    ja: [
      { pattern: /^メイン約(\d+)時間/u, format: (m) => `メイン約${m[1]}時間` },
      { pattern: /^目安:\s*メイン約(\d+–\d+)時間/u, format: (m) => `メイン約${m[1]}時間` },
      { pattern: /^目安:\s*1ラン約(\d+–\d+)分/u, format: (m) => `1ラン約${m[1]}分` },
      { pattern: /^固定クリアなし。1回約(\d+–\d+)分/u, format: (m) => `1回約${m[1]}分` },
    ],
    fr: [
      { pattern: /^~(\d+) h histoire/iu, format: (m) => `~${m[1]} h histoire` },
      { pattern: /^Estimation\s*:\s*~(\d+–\d+) h histoire/iu, format: (m) => `~${m[1]} h histoire` },
      { pattern: /^Estimation\s*:\s*runs de ~(\d+–\d+) min/iu, format: (m) => `runs ~${m[1]} min` },
    ],
    es: [
      { pattern: /^~(\d+) h historia/iu, format: (m) => `~${m[1]} h historia` },
      { pattern: /^Estimación:\s*~(\d+–\d+) h historia/iu, format: (m) => `~${m[1]} h historia` },
      { pattern: /^Estimación:\s*partidas de ~(\d+–\d+) min/iu, format: (m) => `partidas ~${m[1]} min` },
    ],
    de: [
      { pattern: /^~(\d+) Std\. Story/iu, format: (m) => `~${m[1]} Std. Story` },
      { pattern: /^Schätzung:\s*~(\d+–\d+) Std\. Story/iu, format: (m) => `~${m[1]} Std. Story` },
      { pattern: /^Schätzung:\s*~(\d+–\d+) Min\. pro Run/iu, format: (m) => `~${m[1]} Min./Run` },
    ],
    pt: [
      { pattern: /^~(\d+) h campanha/iu, format: (m) => `~${m[1]} h campanha` },
      { pattern: /^Estimativa:\s*~(\d+–\d+) h campanha/iu, format: (m) => `~${m[1]} h campanha` },
      { pattern: /^Estimativa:\s*partidas de ~(\d+–\d+) min/iu, format: (m) => `partidas ~${m[1]} min` },
    ],
  };

  for (const { pattern, format } of localePatterns[locale] || localePatterns.en || []) {
    const match = raw.match(pattern);
    if (match) return format(match);
  }

  return raw.split(/[、,，;；·]/u)[0] || raw;
}

function getDisplayPlaytime(post: BlogPost) {
  return shortenText(getCardPlaytimeText(post), 24);
}
function getDisplayWhyNow(post: BlogPost) { return shortenText(post.whyNow || post.priceSignal, 76); }
function getDisplayCurrentDeal(post: BlogPost) { return shortenText(post.currentDeal || post.priceSignal, 72); }
function getDisplayNearHistoricalLow(post: BlogPost) {
  const l = post.locale;
  const fallback = containsAny(post.priceSignal.toLowerCase(), ['global low', 'deep discount', 'near low'])
    ? fallbackNearHistoricalLow.near_low[l]
    : fallbackNearHistoricalLow.default[l];
  return shortenText(post.nearHistoricalLow || fallback, 72);
}
function getDisplaySalePattern(post: BlogPost) { return shortenText(post.salePattern || post.priceSignal, 72); }
function getDisplayConfidence(post: BlogPost, verdict: BlogVerdict): 'high' | 'medium' | 'low' {
  if (post.confidence) return post.confidence;
  if (verdict === 'buy_now' && containsAny(post.priceSignal.toLowerCase(), ['deep', 'global low', 'strong'])) return 'high';
  if (verdict === 'wait_for_sale') return 'medium';
  return 'medium';
}
function getConfidenceLabel(confidence: 'high' | 'medium' | 'low', locale: BlogLocale) {
  return confidenceLabels[confidence][locale];
}
function getPriceRecommendationLabel(rec: PriceRecommendation, locale: BlogLocale) {
  return priceRecommendationLabels[rec][locale];
}
export function getVerdictLabel(verdict: BlogVerdict, locale: BlogLocale) {
  return verdictLabels[verdict][locale];
}

function getSearchIndex(post: BlogPost): DecisionSearchIndex {
  const qf = inferQuickFilters(post).map((f) => quickFilterLabelMap[f][post.locale].toLowerCase());
  return {
    gameTitle: post.gameTitle.toLowerCase(),
    title: post.title.toLowerCase(),
    tags: post.tags.map((t) => t.toLowerCase()),
    quickFilters: qf,
    listingTakeaway: getDisplayListingTakeaway(post).toLowerCase(),
    communityVibe: post.communityVibe?.toLowerCase(),
    playtime: getDisplayPlaytime(post).toLowerCase(),
  };
}

function getPrimaryCtaLabel(post: BlogPost): string {
  const o = post.ctaLabelOverride?.trim();
  if (o) return o;
  return ctaReadGuide[post.locale];
}

export async function prepareDecisionEntryCard(post: BlogPost): Promise<DecisionEntryCardModel> {
  const verdict = post.verdict || getFallbackVerdict(post);
  const actionBucket = inferActionBucket(post, verdict);
  const priceCall = inferPriceCall(post, verdict);
  const confidence = getDisplayConfidence(post, verdict);
  const metacriticScore = extractMetacriticScore(post);
  const featuredPriority = (metacriticScore != null && metacriticScore >= 88)
    ? (post.featuredPriority ?? 999)
    : 999;
  const priceDetailDisplay = post.cardPriceData
    ? await formatAdaptivePriceSummary(post.cardPriceData, post.locale, post.platform)
    : undefined;
  const base: DecisionCardBase = {
    id: `${post.locale}-${post.slug}`,
    locale: post.locale,
    slug: post.slug,
    category: post.category,
    href: `${blogBasePath}/${post.locale}/${post.slug}`,
    gameTitle: post.gameTitle,
    title: post.title,
    platform: post.platform,
    coverImage: post.coverImage,
    listingTakeaway: getDisplayListingTakeaway(post),
    reviewSignal: getDisplayReviewSignal(post),
    priceSignalText: getDisplayCurrentDeal(post),
    whatItIs: getDisplayWhatItIs(post),
    bestFor: getDisplayFitLabel(post),
    avoidIf: getDisplayAvoidIf(post),
    consensusPraise: getDisplayConsensusPraise(post),
    mainFriction: getDisplayMainFriction(post),
    timeFit: getDisplayTimeFit(post),
    communityVibe: post.communityVibe ? shortenText(post.communityVibe, 64) : undefined,
    playtime: getDisplayPlaytime(post),
    priceCall,
    priceCallLabel: getPriceRecommendationLabel(priceCall, post.locale),
    confidence,
    confidenceLabel: getConfidenceLabel(confidence, post.locale),
    tags: getDisplayQuickFilterTags(post),
    quickFilters: inferQuickFilters(post),
    actionBucket,
    featuredPriority,
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    readingTime: post.readingTime,
    priceTrackHref: post.priceTrackHref,
    gameHref: post.gameHref,
    wishlistHref: post.wishlistHref,
    cardPrice: post.cardPrice,
    cardPriceRegion: post.cardPriceRegion,
    cardPriceData: post.cardPriceData,
    priceDetailDisplay,
    searchIndex: getSearchIndex(post),
  };
  if (post.category === 'worth-it') {
    return {
      ...base,
      kind: 'worth-it',
      verdict,
      verdictBadge: getVerdictLabel(verdict, post.locale),
      whyNow: getDisplayWhyNow(post),
      primaryCtaLabel: getPrimaryCtaLabel(post),
      secondaryCtaLabel: ctaSetAlert[post.locale],
    };
  }
  return {
    ...base,
    kind: 'buy-now-or-wait',
    priceRecommendation: priceCall,
    recommendationBadge: getPriceRecommendationLabel(priceCall, post.locale),
    currentDeal: getDisplayCurrentDeal(post),
    nearHistoricalLow: getDisplayNearHistoricalLow(post),
    salePattern: getDisplaySalePattern(post),
    primaryCtaLabel: getPrimaryCtaLabel(post),
    primaryCtaHref: base.href,
    secondaryCtaLabel: ctaSetAlert[post.locale],
  };
}

export async function getDecisionEntryCards(locale: BlogLocale) {
  const posts = await getAllPosts(locale);
  return (await Promise.all(posts.map(prepareDecisionEntryCard))).sort(sortByPriorityAndDate);
}

export async function getDecisionEntryCardsByCategory(locale: BlogLocale, category: BlogCategory) {
  const posts = await getPostsByCategory(locale, category);
  return (await Promise.all(posts.map(prepareDecisionEntryCard))).sort(sortByPriorityAndDate);
}

export async function getAllBlogPaths() {
  const paths: { locale: BlogLocale; slug: string; updatedAt: string }[] = [];
  for (const locale of locales) {
    const posts = await getAllPosts(locale);
    for (const post of posts) {
      paths.push({ locale, slug: post.slug, updatedAt: post.updatedAt || post.publishedAt });
    }
  }
  return paths;
}

export async function getDecisionEntryCardsByTopic(locale: BlogLocale, filter: import('./topics').TopicDefinition['filter']) {
  const posts = await getAllPosts(locale);
  const matching = posts.filter((p) => inferQuickFilters(p).includes(filter));
  return (await Promise.all(matching.map(prepareDecisionEntryCard))).sort(sortByPriorityAndDate);
}

export function formatDate(date: string, locale?: BlogLocale) {
  const intlLocale = locale ? intlLocales[locale] : 'en-US';
  return new Intl.DateTimeFormat(intlLocale, {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date));
}
