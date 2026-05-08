/**
 * Pure inference functions for blog cards and decisions.
 * Extracted from blog.ts — these are side-effect-free and easy to test.
 */
import type { BlogLocale } from '@/lib/i18n';
import type {
  ActionBucket,
  BlogCategory,
  BlogVerdict,
  PlayerNeedKey,
  PriceRecommendation,
  QuickFilterKey,
} from '@/lib/blog-shared';
import { quickFilterLabelMap } from '@/lib/blog-shared';

// ── Minimal interface to avoid circular dependency with BlogPost ──

interface PostLike {
  locale: BlogLocale;
  category: BlogCategory;
  title: string;
  gameTitle: string;
  description: string;
  priceSignal: string;
  heroNote: string;
  heroStat: string;
  reviewSignal?: string;
  decision: string;
  priceCall?: PriceRecommendation;
  priceRecommendation?: PriceRecommendation;
  verdict?: BlogVerdict;
  actionBucket?: ActionBucket;
  quickFilters?: QuickFilterKey[];
  playerNeeds?: PlayerNeedKey[];
  tags: string[];
  whatItIs?: string;
  playStyle?: string;
  avoidIf?: string;
  mainFriction?: string;
  timeFit?: string;
  timeCommitment?: string;
  playtime?: string;
  listingTakeaway?: string;
  communityVibe?: string;
  performance?: string;
  bestFor?: string;
  fitLabel?: string;
  consensusPraise?: string;
  whyNow?: string;
  currentDeal?: string;
  nearHistoricalLow?: string;
  salePattern?: string;
  confidence?: 'high' | 'medium' | 'low';
  ctaLabelOverride?: string;
  tldr?: string;
  cardPrice?: string;
  cardPriceRegion?: string;
  cardPriceData?: { eurPrice: number; regionCode: string };
}

// ── Helper utilities ──

export function containsAny(text: string, keywords: string[]) {
  const n = text.toLowerCase();
  return keywords.some((k) => n.includes(k));
}

export function sentenceCaseLabel(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function extractMetacriticScore(post: PostLike): number | null {
  const sources = [post.reviewSignal, post.heroStat].filter(Boolean) as string[];
  for (const text of sources) {
    if (!/metacritic/i.test(text)) continue;
    const m = text.match(/\b(100|[1-9]\d)\b/);
    if (!m) continue;
    const score = Number(m[1]);
    if (Number.isFinite(score)) return score;
  }
  return null;
}

export function sortByPriorityAndDate<T extends { featuredPriority: number; publishedAt: string; metacriticScore?: number }>(a: T, b: T) {
  if (a.featuredPriority !== b.featuredPriority) return a.featuredPriority - b.featuredPriority;
  const dateDiff = +new Date(b.publishedAt) - +new Date(a.publishedAt);
  if (dateDiff !== 0) return dateDiff;
  return (b.metacriticScore ?? -1) - (a.metacriticScore ?? -1);
}

// ── Verdict / action / price inference ──

export function getFallbackVerdict(post: PostLike): BlogVerdict {
  if (post.category === 'buy-now-or-wait') return /wait|track/i.test(post.decision) ? 'wait_for_sale' : 'buy_now';
  if (/not suit|not the best fit|wait/i.test(post.decision)) return 'right_player';
  return 'right_player';
}

export function inferQuickFilters(post: PostLike): QuickFilterKey[] {
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

export function inferActionBucket(post: PostLike, verdict: BlogVerdict): ActionBucket {
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

export function inferPriceCall(post: PostLike, verdict: BlogVerdict): PriceRecommendation {
  if (post.priceCall) return post.priceCall;
  if (post.priceRecommendation) return post.priceRecommendation;
  if (verdict === 'buy_now') return 'buy';
  if (containsAny(post.priceSignal.toLowerCase(), ['alert', 'track', 'watch'])) return 'watch';
  return 'wait';
}
