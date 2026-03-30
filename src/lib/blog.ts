import { getCollection, render, type CollectionEntry } from 'astro:content';
import { type BlogLocale, locales } from '@/lib/i18n';

export const siteUrl = 'https://www.gamegulf.com';
export const blogBasePath = '/blog';

export const categories = ['worth-it', 'buy-now-or-wait'] as const;
export const defaultOgImage = 'https://cdn.gamegulf.com/images/home/home-banner.png';
export const blogVerdicts = ['buy_now', 'wait_for_sale', 'right_player', 'not_best_fit'] as const;
export const playerNeedKeys = [
  'buy_now', 'wait_for_sale', 'long_games', 'party_games',
  'cozy', 'beginner_friendly', 'casual', 'local_multiplayer', 'value_for_money',
] as const;
export const quickFilterKeys = [
  'co_op', 'long_rpg', 'family_friendly', 'nintendo_first_party',
  'short_sessions', 'under_20', 'great_on_sale', 'rarely_discounted',
] as const;
export const actionBuckets = ['buy_now', 'wait', 'set_alert'] as const;
export const priceRecommendations = ['buy', 'wait', 'watch'] as const;

export type BlogCategory = (typeof categories)[number];
export type BlogVerdict = (typeof blogVerdicts)[number];
export type PlayerNeedKey = (typeof playerNeedKeys)[number];
export type QuickFilterKey = (typeof quickFilterKeys)[number];
export type ActionBucket = (typeof actionBuckets)[number];
export type PriceRecommendation = (typeof priceRecommendations)[number];

export type FaqItem = { question: string; answer: string };

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
  tags: string[];
  faq: FaqItem[];
  body: string;
  _entry: CollectionEntry<'posts'>;
};

export type DecisionSearchIndex = {
  gameTitle: string;
  title: string;
  tags: string[];
  quickFilters: string[];
  listingTakeaway: string;
  communityVibe?: string;
  playtime?: string;
};

type DecisionCardBase = {
  id: string;
  locale: BlogLocale;
  slug: string;
  category: BlogCategory;
  href: string;
  gameTitle: string;
  title: string;
  platform: string;
  coverImage?: string;
  listingTakeaway: string;
  reviewSignal?: string;
  priceSignalText: string;
  whatItIs: string;
  bestFor: string;
  avoidIf: string;
  consensusPraise: string;
  mainFriction: string;
  timeFit: string;
  communityVibe?: string;
  playtime?: string;
  priceCall: PriceRecommendation;
  priceCallLabel: string;
  confidence: 'high' | 'medium' | 'low';
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
  kind: 'worth-it';
  verdict: BlogVerdict;
  verdictBadge: string;
  whyNow: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
};

export type BuyTimingCardModel = DecisionCardBase & {
  kind: 'buy-now-or-wait';
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

const categoryMeta: Record<
  BlogCategory,
  { en: string; 'zh-hans': string; descriptionEn: string; descriptionZh: string }
> = {
  'worth-it': {
    en: 'Worth It',
    'zh-hans': '值不值得买',
    descriptionEn: 'Decision-focused guides for whether a Nintendo Switch game is worth buying right now.',
    descriptionZh: '围绕 Switch 游戏是否值得购买的决策型文章。',
  },
  'buy-now-or-wait': {
    en: 'Buy Now or Wait',
    'zh-hans': '现在买还是等打折',
    descriptionEn: 'Price-timing content that helps players decide whether to buy now or set an alert.',
    descriptionZh: '帮助玩家判断是立刻下单还是先观望折扣的价格时机内容。',
  },
};

const quickFilterLabelMap: Record<QuickFilterKey, Record<BlogLocale, string>> = {
  co_op: { en: 'Co-op', 'zh-hans': '合作/多人' },
  long_rpg: { en: 'Long RPG', 'zh-hans': '长流程 RPG' },
  family_friendly: { en: 'Family-friendly', 'zh-hans': '家庭友好' },
  nintendo_first_party: { en: 'Nintendo first-party', 'zh-hans': '任天堂第一方' },
  short_sessions: { en: 'Best for short sessions', 'zh-hans': '适合碎片时间' },
  under_20: { en: 'Under $20', 'zh-hans': '低于 $20' },
  great_on_sale: { en: 'Great on sale', 'zh-hans': '打折时很值得' },
  rarely_discounted: { en: 'Rarely discounted', 'zh-hans': '很少深折' },
};

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

export async function getAlternatePostPath(post: BlogPost) {
  const otherLocale = locales.find((l) => l !== post.locale);
  if (!otherLocale) return undefined;
  const translated = await getPost(otherLocale, post.slug);
  if (!translated) return undefined;
  return `${blogBasePath}/${otherLocale}/${translated.slug}`;
}

export function getCategoryMeta(locale: BlogLocale, category: BlogCategory) {
  const meta = categoryMeta[category];
  return {
    title: meta[locale],
    description: locale === 'en' ? meta.descriptionEn : meta.descriptionZh,
  };
}

export function getLocaleAlternates(pathnameByLocale: Partial<Record<BlogLocale, string>>) {
  const alternates = Object.fromEntries(
    locales
      .filter((l) => pathnameByLocale[l])
      .map((l) => [l, `${siteUrl}${pathnameByLocale[l]}`]),
  );
  const defaultPath = pathnameByLocale.en || Object.values(pathnameByLocale).find(Boolean);
  return { ...alternates, ...(defaultPath ? { 'x-default': `${siteUrl}${defaultPath}` } : {}) };
}

export function getOgImage(post?: Pick<BlogPost, 'coverImage'>) {
  return post?.coverImage || defaultOgImage;
}

function shortenText(text: string, maxLength: number) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  const truncated = normalized.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : maxLength)}...`;
}

function normalizeForComparison(text: string) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function containsAny(text: string, keywords: string[]) {
  const n = text.toLowerCase();
  return keywords.some((k) => n.includes(k));
}

function sentenceCaseLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function sortByPriorityAndDate<T extends { featuredPriority: number; publishedAt: string }>(a: T, b: T) {
  if (a.featuredPriority !== b.featuredPriority) return a.featuredPriority - b.featuredPriority;
  return +new Date(b.publishedAt) - +new Date(a.publishedAt);
}

function getFallbackVerdict(post: BlogPost): BlogVerdict {
  if (post.category === 'buy-now-or-wait') return /wait|track/i.test(post.decision) ? 'wait_for_sale' : 'buy_now';
  if (/not suit|not the best fit|wait/i.test(post.decision)) return 'right_player';
  return 'right_player';
}

function inferQuickFilters(post: BlogPost): QuickFilterKey[] {
  if (post.quickFilters && post.quickFilters.length > 0) return post.quickFilters;
  const filters = new Set<QuickFilterKey>();
  const titleText = `${post.title} ${post.gameTitle} ${post.description} ${post.priceSignal} ${post.heroNote}`.toLowerCase();
  const tagsText = post.tags.join(' ').toLowerCase();
  if (post.playerNeeds?.includes('party_games') || post.playerNeeds?.includes('local_multiplayer') || containsAny(tagsText, ['co-op', 'multiplayer'])) filters.add('co_op');
  if (post.playerNeeds?.includes('long_games') || containsAny(titleText, ['jrpg', 'long', '100-hour', '80-hour'])) filters.add('long_rpg');
  if (post.playerNeeds?.includes('beginner_friendly') || containsAny(titleText, ['family', 'kids', 'household', 'beginner'])) filters.add('family_friendly');
  if (containsAny(post.gameTitle.toLowerCase(), ['mario', 'zelda', 'metroid', 'pikmin', 'animal crossing'])) filters.add('nintendo_first_party');
  if (post.playerNeeds?.includes('casual') || post.playerNeeds?.includes('cozy') || containsAny(titleText, ['short sessions', 'short session', 'routine', 'dip into'])) filters.add('short_sessions');
  if (containsAny(titleText, ['eur 10', 'eur 12', 'eur 1', 'eur 2', '$20', 'under $20', 'under 20'])) filters.add('under_20');
  if (containsAny(titleText, ['deep sale', 'great sale', 'favorable sale', 'strong value'])) filters.add('great_on_sale');
  if (containsAny(titleText, ['hold value', 'rarely drop', 'rarely discounted', 'do not always drop'])) filters.add('rarely_discounted');
  return Array.from(filters);
}

function inferActionBucket(post: BlogPost, verdict: BlogVerdict): ActionBucket {
  if (post.actionBucket) return post.actionBucket;
  if (post.priceCall) {
    if (post.priceCall === 'buy') return 'buy_now';
    if (post.priceCall === 'wait') return 'wait';
    return 'set_alert';
  }
  if (post.category === 'buy-now-or-wait') {
    if (post.priceRecommendation === 'buy') return 'buy_now';
    if (post.priceRecommendation === 'wait') return 'wait';
    if (post.priceRecommendation === 'watch') return 'set_alert';
  }
  if (verdict === 'buy_now') return 'buy_now';
  if (verdict === 'wait_for_sale') return 'wait';
  if (verdict === 'right_player') return 'set_alert';
  return 'wait';
}

function inferPriceCall(post: BlogPost, verdict: BlogVerdict): PriceRecommendation {
  if (post.priceCall) return post.priceCall;
  if (post.priceRecommendation) return post.priceRecommendation;
  if (verdict === 'buy_now') return 'buy';
  if (containsAny(post.priceSignal.toLowerCase(), ['alert', 'track', 'watch'])) return 'watch';
  return 'wait';
}

function getDisplayListingTakeaway(post: BlogPost) { return shortenText(post.listingTakeaway || post.description, 96); }
function getDisplayReviewSignal(post: BlogPost) { return shortenText(post.reviewSignal || post.heroStat, 56); }
function getDisplayWhatItIs(post: BlogPost) {
  const fallback = post.whatItIs || post.playStyle || post.description ||
    (post.locale === 'en' ? 'A Switch game best judged by fit, payoff, and price timing.' : '一款更适合按玩家适配、投入回报和价格时机来判断的 Switch 游戏。');
  return shortenText(fallback, 96);
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
  const fallback = post.playerNeeds?.includes('long_games')
    ? (post.locale === 'en' ? 'Avoid if you want a short, fast-payoff game.' : '如果你想要短平快、回报更快的游戏，就不太适合。')
    : post.playerNeeds?.includes('local_multiplayer') || post.playerNeeds?.includes('party_games')
      ? (post.locale === 'en' ? 'Avoid if you mostly play solo and rarely host others.' : '如果你大多单人游玩、很少和别人一起玩，就不太适合。')
      : post.playerNeeds?.includes('cozy')
        ? (post.locale === 'en' ? 'Avoid if you want tension, challenge, or rapid progression.' : '如果你更想要紧张挑战或高速推进，这类游戏就不太适合。')
        : (post.locale === 'en' ? 'Avoid if the fit still feels unclear.' : '如果你还拿不准自己是否会喜欢，先不要急着买。');
  return shortenText(fallback, 72);
}
function getDisplayConsensusPraise(post: BlogPost) {
  const fallback = post.consensusPraise || post.reviewSignal || post.heroNote ||
    (post.locale === 'en' ? 'Players usually rate the fit and quality highly when the genre already clicks.' : '当玩法类型本身对味时，这款游戏通常能得到很高的认可。');
  return shortenText(fallback, 82);
}
function getDisplayMainFriction(post: BlogPost) {
  const fallback = post.mainFriction || post.avoidIf ||
    (post.playerNeeds?.includes('long_games')
      ? (post.locale === 'en' ? 'Big time commitment and a slower payoff can turn into regret for the wrong player.' : '投入时间较大、回报偏慢，容易让不对胃口的玩家后悔。')
      : post.playerNeeds?.includes('local_multiplayer') || post.playerNeeds?.includes('party_games')
        ? (post.locale === 'en' ? 'The value drops if you mostly play alone or rarely bring others in.' : '如果你主要单人玩、很少和别人一起玩，它的价值会明显下降。')
        : (post.locale === 'en' ? 'Fit matters more than reputation here, so the main risk is buying into the wrong play pattern.' : '这类游戏更看适配度，最大的风险是买到了不适合自己的体验。'));
  return shortenText(fallback, 84);
}
function getDisplayTimeFit(post: BlogPost) {
  const fallback = post.playerNeeds?.includes('long_games')
    ? (post.locale === 'en' ? 'Long commitment, strong payoff if you want one big game.' : '投入周期偏长，但如果你想要一款能玩很久的大作，回报很强。')
    : post.playerNeeds?.includes('casual') || post.playerNeeds?.includes('cozy')
      ? (post.locale === 'en' ? 'Works best in short repeat sessions rather than long marathons.' : '更适合碎片时间反复游玩，而不是长时间马拉松。')
      : (post.locale === 'en' ? 'Moderate commitment with a fairly clear payoff curve.' : '整体投入强度中等，回报节奏也比较清楚。');
  return shortenText(post.timeFit || post.timeCommitment || fallback, 82);
}
function getDisplayWhyNow(post: BlogPost) { return shortenText(post.whyNow || post.priceSignal, 76); }
function getDisplayCurrentDeal(post: BlogPost) { return shortenText(post.currentDeal || post.priceSignal, 72); }
function getDisplayNearHistoricalLow(post: BlogPost) {
  const fallback = containsAny(post.priceSignal.toLowerCase(), ['global low', 'deep discount', 'near low'])
    ? (post.locale === 'en' ? 'Current pricing is close to a strong low signal.' : '当前价格已经接近较强低点信号。')
    : (post.locale === 'en' ? 'Not a proven low, so compare before buying.' : '还不能直接判断为低点，建议先比较价格。');
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
  const labels = { high: { en: 'High', 'zh-hans': '高' }, medium: { en: 'Medium', 'zh-hans': '中' }, low: { en: 'Low', 'zh-hans': '低' } };
  return labels[confidence][locale];
}
function getPriceRecommendationLabel(rec: PriceRecommendation, locale: BlogLocale) {
  const labels = { buy: { en: 'Buy now', 'zh-hans': '现在买' }, wait: { en: 'Wait', 'zh-hans': '先等等' }, watch: { en: 'Set alert', 'zh-hans': '先设提醒' } };
  return labels[rec][locale];
}
export function getVerdictLabel(verdict: BlogVerdict, locale: BlogLocale) {
  const labels: Record<BlogVerdict, Record<BlogLocale, string>> = {
    buy_now: { en: 'Buy now', 'zh-hans': '现在买' },
    wait_for_sale: { en: 'Wait for sale', 'zh-hans': '等打折' },
    right_player: { en: 'Worth it for the right player', 'zh-hans': '适合对的人就值得买' },
    not_best_fit: { en: 'Not the best fit right now', 'zh-hans': '现在不一定最适合你' },
  };
  return labels[verdict][locale];
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
    playtime: post.playtime?.toLowerCase(),
  };
}

export function prepareDecisionEntryCard(post: BlogPost): DecisionEntryCardModel {
  const verdict = post.verdict || getFallbackVerdict(post);
  const actionBucket = inferActionBucket(post, verdict);
  const priceCall = inferPriceCall(post, verdict);
  const confidence = getDisplayConfidence(post, verdict);
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
    playtime: post.playtime ? shortenText(post.playtime, 32) : undefined,
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
  };
  if (post.category === 'worth-it') {
    return {
      ...base,
      kind: 'worth-it',
      verdict,
      verdictBadge: getVerdictLabel(verdict, post.locale),
      whyNow: getDisplayWhyNow(post),
      primaryCtaLabel: post.locale === 'en' ? 'Read decision' : '查看判断',
      secondaryCtaLabel: post.locale === 'en' ? 'Set alert' : '开启提醒',
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
    primaryCtaLabel: priceCall === 'buy' ? (post.locale === 'en' ? 'View pricing' : '查看价格') : (post.locale === 'en' ? 'See price signal' : '查看价格信号'),
    primaryCtaHref: priceCall === 'buy' ? post.gameHref : post.priceTrackHref,
    secondaryCtaLabel: post.locale === 'en' ? 'Set alert' : '开启提醒',
  };
}

export async function getDecisionEntryCards(locale: BlogLocale) {
  const posts = await getAllPosts(locale);
  return posts.map(prepareDecisionEntryCard).sort(sortByPriorityAndDate);
}

export async function getDecisionEntryCardsByCategory(locale: BlogLocale, category: BlogCategory) {
  const posts = await getPostsByCategory(locale, category);
  return posts.map(prepareDecisionEntryCard).sort(sortByPriorityAndDate);
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
  return matching.map(prepareDecisionEntryCard).sort(sortByPriorityAndDate);
}

export function formatDate(date: string, locale: BlogLocale) {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date));
}
