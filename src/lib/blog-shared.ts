/**
 * Blog enums, labels, and card models — safe to import from client islands.
 * (No `astro:content`; keep `blog.ts` server-only for collection access.)
 */
import type { BlogLocale } from '@/lib/i18n';
import type { CardPriceData } from '@/lib/pricing';

export const siteUrl = 'https://www.gamegulf.com';
export const blogBasePath = import.meta.env.BASE_URL.replace(/\/$/, '');

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

export type DecisionSearchIndex = {
  gameTitle: string;
  title: string;
  tags: string[];
  quickFilters: string[];
  listingTakeaway: string;
  communityVibe?: string;
  playtime?: string;
};

export type DecisionCardBase = {
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
  updatedAt?: string;
  readingTime: string;
  priceTrackHref: string;
  gameHref: string;
  wishlistHref: string;
  cardPrice?: string;
  cardPriceRegion?: string;
  cardPriceData?: CardPriceData;
  priceDetailDisplay?: string;
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

/** Labels for home / filter chips */
export const quickFilterLabelMap: Record<QuickFilterKey, Record<BlogLocale, string>> = {
  co_op: { en: 'Co-op', 'zh-hans': '合作/多人', fr: 'Coop', es: 'Cooperativo', de: 'Koop', ja: '協力プレイ', pt: 'Cooperativo' },
  long_rpg: { en: 'Long RPG', 'zh-hans': '长流程 RPG', fr: 'RPG long', es: 'RPG largo', de: 'Langes RPG', ja: '長編RPG', pt: 'RPG longo' },
  family_friendly: { en: 'Family-friendly', 'zh-hans': '家庭友好', fr: 'Familial', es: 'Para toda la familia', de: 'Familienfreundlich', ja: 'ファミリー向け', pt: 'Para toda a família' },
  nintendo_first_party: { en: 'Nintendo first-party', 'zh-hans': '任天堂第一方', fr: 'Nintendo first-party', es: 'Nintendo first-party', de: 'Nintendo First-Party', ja: '任天堂ファーストパーティ', pt: 'Nintendo first-party' },
  short_sessions: { en: 'Best for short sessions', 'zh-hans': '适合碎片时间', fr: 'Sessions courtes', es: 'Sesiones cortas', de: 'Kurze Sessions', ja: '短時間プレイ向け', pt: 'Ideal pra sessões curtas' },
  under_20: { en: 'Under $20', 'zh-hans': '低于 $20', fr: 'Moins de 20 €', es: 'Menos de $20', de: 'Unter 20 €', ja: '2000円以下', pt: 'Abaixo de R$100' },
  great_on_sale: { en: 'Great on sale', 'zh-hans': '打折时很值得', fr: 'Super en promo', es: 'Genial en oferta', de: 'Tolles Sale-Angebot', ja: 'セールがお得', pt: 'Ótimo em promoção' },
  rarely_discounted: { en: 'Rarely discounted', 'zh-hans': '很少深折', fr: 'Rarement en promo', es: 'Raramente rebajado', de: 'Selten reduziert', ja: 'めったにセールしない', pt: 'Raramente tem desconto' },
};
