import { getCollection, render, type CollectionEntry } from 'astro:content';
import { type BlogLocale, locales, intlLocales, langTags } from '@/lib/i18n';
import { formatAdaptivePriceSummary, type StructuredPriceRow } from '@/lib/pricing';
import { shortenText, normalizeForComparison } from '@/lib/text-utils';

export const siteUrl = 'https://www.gamegulf.com';
// Reads from astro.config.mjs `base` — works for both /blog (prod) and /gamegulf-blog-demo (dev preview)
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

export type CardPriceData = {
  eurPrice: number;
  regionCode: string;
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

const categoryMeta: Record<BlogCategory, { title: Record<BlogLocale, string>; description: Record<BlogLocale, string> }> = {
  'worth-it': {
    title: {
      en: 'Worth It', 'zh-hans': '值不值得买', fr: 'Ça vaut le coup ?', es: '¿Vale la pena?', de: 'Lohnt es sich?', ja: '買う価値あり？', pt: 'Vale a pena?',
    },
    description: {
      en: 'Decision-focused guides for whether a Nintendo Switch game is worth buying right now.',
      'zh-hans': '围绕 Switch 游戏是否值得购买的决策型文章。',
      fr: 'Guides pour savoir si un jeu Switch vaut l\'achat maintenant.',
      es: 'Guías para decidir si un juego de Switch vale la pena ahora.',
      de: 'Entscheidungshilfen, ob ein Switch-Spiel den Kauf wert ist.',
      ja: 'Switchゲームが今買う価値があるかを判断するガイド。',
      pt: 'Guias focados em decidir se vale a pena comprar um jogo de Switch agora.',
    },
  },
  'buy-now-or-wait': {
    title: {
      en: 'Buy Now or Wait', 'zh-hans': '现在买还是等打折', fr: 'Acheter ou attendre ?', es: '¿Comprar o esperar?', de: 'Jetzt kaufen oder warten?', ja: '今買う？待つ？', pt: 'Comprar agora ou esperar?',
    },
    description: {
      en: 'Price-timing content that helps players decide whether to buy now or set an alert.',
      'zh-hans': '帮助玩家判断是立刻下单还是先观望折扣的价格时机内容。',
      fr: 'Contenu sur le timing des prix pour acheter ou attendre une promo.',
      es: 'Contenido sobre el momento del precio para comprar o esperar una oferta.',
      de: 'Preis-Timing-Inhalte, ob jetzt kaufen oder auf einen Sale warten.',
      ja: '今買うかアラートを設定するか判断するための価格タイミングガイド。',
      pt: 'Conteúdo sobre timing de preço para decidir se compra agora ou cria um alerta.',
    },
  },
};

const quickFilterLabelMap: Record<QuickFilterKey, Record<BlogLocale, string>> = {
  co_op: { en: 'Co-op', 'zh-hans': '合作/多人', fr: 'Coop', es: 'Cooperativo', de: 'Koop', ja: '協力プレイ', pt: 'Cooperativo' },
  long_rpg: { en: 'Long RPG', 'zh-hans': '长流程 RPG', fr: 'RPG long', es: 'RPG largo', de: 'Langes RPG', ja: '長編RPG', pt: 'RPG longo' },
  family_friendly: { en: 'Family-friendly', 'zh-hans': '家庭友好', fr: 'Familial', es: 'Para toda la familia', de: 'Familienfreundlich', ja: 'ファミリー向け', pt: 'Para toda a família' },
  nintendo_first_party: { en: 'Nintendo first-party', 'zh-hans': '任天堂第一方', fr: 'Nintendo first-party', es: 'Nintendo first-party', de: 'Nintendo First-Party', ja: '任天堂ファーストパーティ', pt: 'Nintendo first-party' },
  short_sessions: { en: 'Best for short sessions', 'zh-hans': '适合碎片时间', fr: 'Sessions courtes', es: 'Sesiones cortas', de: 'Kurze Sessions', ja: '短時間プレイ向け', pt: 'Ideal pra sessões curtas' },
  under_20: { en: 'Under $20', 'zh-hans': '低于 $20', fr: 'Moins de 20 €', es: 'Menos de $20', de: 'Unter 20 €', ja: '2000円以下', pt: 'Abaixo de R$100' },
  great_on_sale: { en: 'Great on sale', 'zh-hans': '打折时很值得', fr: 'Super en promo', es: 'Genial en oferta', de: 'Tolles Sale-Angebot', ja: 'セールがお得', pt: 'Ótimo em promoção' },
  rarely_discounted: { en: 'Rarely discounted', 'zh-hans': '很少深折', fr: 'Rarement en promo', es: 'Raramente rebajado', de: 'Selten reduziert', ja: 'めったにセールしない', pt: 'Raramente tem desconto' },
};

// ── Locale-aware label helpers ──

const confidenceLabels: Record<'high' | 'medium' | 'low', Record<BlogLocale, string>> = {
  high: { en: 'High', 'zh-hans': '高', fr: 'Élevée', es: 'Alta', de: 'Hoch', ja: '高', pt: 'Alta' },
  medium: { en: 'Medium', 'zh-hans': '中', fr: 'Moyenne', es: 'Media', de: 'Mittel', ja: '中', pt: 'Média' },
  low: { en: 'Low', 'zh-hans': '低', fr: 'Faible', es: 'Baja', de: 'Niedrig', ja: '低', pt: 'Baixa' },
};

const priceRecommendationLabels: Record<PriceRecommendation, Record<BlogLocale, string>> = {
  buy: { en: 'Buy now', 'zh-hans': '现在买', fr: 'Acheter', es: 'Comprar', de: 'Jetzt kaufen', ja: '今すぐ購入', pt: 'Comprar agora' },
  wait: { en: 'Wait', 'zh-hans': '先等等', fr: 'Attendre', es: 'Esperar', de: 'Warten', ja: '待つ', pt: 'Esperar' },
  watch: { en: 'Set alert', 'zh-hans': '先设提醒', fr: 'Créer alerte', es: 'Crear alerta', de: 'Alarm setzen', ja: 'アラート設定', pt: 'Criar alerta' },
};

const verdictLabels: Record<BlogVerdict, Record<BlogLocale, string>> = {
  buy_now: { en: 'Buy now', 'zh-hans': '现在买', fr: 'Acheter maintenant', es: 'Comprar ahora', de: 'Jetzt kaufen', ja: '今すぐ購入', pt: 'Comprar agora' },
  wait_for_sale: { en: 'Wait for sale', 'zh-hans': '等打折', fr: 'Attendre les soldes', es: 'Esperar oferta', de: 'Auf Sale warten', ja: 'セールを待つ', pt: 'Esperar promoção' },
  right_player: { en: 'Worth it for the right player', 'zh-hans': '适合对的人就值得买', fr: 'À recommander au bon joueur', es: 'Vale para el jugador adecuado', de: 'Für den richtigen Spieler lohnenswert', ja: '合う人には買い', pt: 'Vale a pena pro jogador certo' },
  not_best_fit: { en: 'Not the best fit right now', 'zh-hans': '现在不一定最适合你', fr: 'Pas idéal pour le moment', es: 'No es la mejor opción ahora', de: 'Aktuell nicht die beste Wahl', ja: '今はベストではない', pt: 'Não é a melhor escolha agora' },
};

const ctaReadGuide: Record<BlogLocale, string> = {
  en: 'Read decision guide', 'zh-hans': '查看判断', fr: 'Lire le guide', es: 'Leer la guía', de: 'Ratgeber lesen', ja: 'ガイドを読む', pt: 'Ler guia de decisão',
};

const ctaSetAlert: Record<BlogLocale, string> = {
  en: 'Set alert', 'zh-hans': '开启提醒', fr: 'Créer une alerte', es: 'Crear alerta', de: 'Alarm setzen', ja: 'アラートを設定', pt: 'Criar alerta',
};

// ── Fallback strings (used when frontmatter data is missing) ──

const fallbackWhatItIs: Record<BlogLocale, string> = {
  en: 'A Switch game best judged by fit, payoff, and price timing.',
  'zh-hans': '一款更适合按玩家适配、投入回报和价格时机来判断的 Switch 游戏。',
  fr: 'Un jeu Switch à évaluer selon l\'adéquation, le rendement et le prix.',
  es: 'Un juego de Switch que conviene evaluar por ajuste, rendimiento y precio.',
  de: 'Ein Switch-Spiel, das nach Passung, Ertrag und Preis-Timing beurteilt wird.',
  ja: '適合度・投資対効果・価格タイミングで判断すべきSwitchゲーム。',
  pt: 'Um jogo de Switch que vale avaliar pelo perfil do jogador, retorno e timing de preço.',
};

const fallbackAvoidIf: Record<string, Record<BlogLocale, string>> = {
  long_games: {
    en: 'Avoid if you want a short, fast-payoff game.',
    'zh-hans': '如果你想要短平快、回报更快的游戏，就不太适合。',
    fr: 'À éviter si vous cherchez un jeu court et rapide.',
    es: 'Evitar si buscas un juego corto y rápido.',
    de: 'Nicht geeignet, wenn Sie ein kurzes, schnelles Spiel suchen.',
    ja: '短時間でサクッと遊べるゲームを求めるなら不向き。',
    pt: 'Evite se você quer um jogo curto e com retorno rápido.',
  },
  multiplayer: {
    en: 'Avoid if you mostly play solo and rarely host others.',
    'zh-hans': '如果你大多单人游玩、很少和别人一起玩，就不太适合。',
    fr: 'À éviter si vous jouez surtout seul.',
    es: 'Evitar si juegas mayormente solo.',
    de: 'Nicht ideal, wenn Sie meist alleine spielen.',
    ja: 'ほぼソロプレイで人と遊ばないなら不向き。',
    pt: 'Evite se você joga quase sempre sozinho.',
  },
  cozy: {
    en: 'Avoid if you want tension, challenge, or rapid progression.',
    'zh-hans': '如果你更想要紧张挑战或高速推进，这类游戏就不太适合。',
    fr: 'À éviter si vous cherchez du challenge ou de la tension.',
    es: 'Evitar si buscas tensión, desafío o progresión rápida.',
    de: 'Nicht geeignet, wenn Sie Spannung und Herausforderung suchen.',
    ja: '緊張感やチャレンジを求めるなら不向き。',
    pt: 'Evite se você quer tensão, desafio ou progressão rápida.',
  },
  default: {
    en: 'Avoid if the fit still feels unclear.',
    'zh-hans': '如果你还拿不准自己是否会喜欢，先不要急着买。',
    fr: 'À éviter si vous n\'êtes pas sûr que le jeu vous convienne.',
    es: 'Evitar si no tienes claro si el juego es para ti.',
    de: 'Nicht kaufen, wenn die Passung noch unklar ist.',
    ja: '自分に合うか不確かなら、まだ買わない方がいい。',
    pt: 'Evite se ainda não tem certeza se o jogo combina com você.',
  },
};

const fallbackConsensusPraise: Record<BlogLocale, string> = {
  en: 'Players usually rate the fit and quality highly when the genre already clicks.',
  'zh-hans': '当玩法类型本身对味时，这款游戏通常能得到很高的认可。',
  fr: 'Les joueurs apprécient généralement la qualité quand le genre leur convient.',
  es: 'Los jugadores suelen valorar bien cuando el género les gusta.',
  de: 'Spieler bewerten Qualität und Passung hoch, wenn das Genre bereits gefällt.',
  ja: 'ジャンルが合えば、適合度と品質の評価は高い傾向。',
  pt: 'Jogadores geralmente avaliam bem quando o gênero já combina com eles.',
};

const fallbackMainFriction: Record<string, Record<BlogLocale, string>> = {
  long_games: {
    en: 'Big time commitment and a slower payoff can turn into regret for the wrong player.',
    'zh-hans': '投入时间较大、回报偏慢，容易让不对胃口的玩家后悔。',
    fr: 'Un gros investissement en temps avec un retour lent peut causer des regrets.',
    es: 'Gran inversión de tiempo con un retorno lento puede causar arrepentimiento.',
    de: 'Hoher Zeitaufwand und langsamer Ertrag können für den falschen Spieler frustrierend sein.',
    ja: '時間の投入が大きく、合わないプレイヤーは後悔する可能性あり。',
    pt: 'Investimento de tempo alto e retorno lento podem virar arrependimento pro jogador errado.',
  },
  multiplayer: {
    en: 'The value drops if you mostly play alone or rarely bring others in.',
    'zh-hans': '如果你主要单人玩、很少和别人一起玩，它的价值会明显下降。',
    fr: 'La valeur baisse si vous jouez surtout seul.',
    es: 'El valor baja si juegas mayormente solo.',
    de: 'Der Wert sinkt, wenn Sie meist alleine spielen.',
    ja: 'ほぼソロプレイだと、その価値は大きく下がる。',
    pt: 'O valor cai bastante se você joga quase sempre sozinho.',
  },
  default: {
    en: 'Fit matters more than reputation here, so the main risk is buying into the wrong play pattern.',
    'zh-hans': '这类游戏更看适配度，最大的风险是买到了不适合自己的体验。',
    fr: 'L\'adéquation prime ici, le risque est d\'acheter un jeu qui ne correspond pas à votre style.',
    es: 'La adecuación importa más que la reputación, el riesgo es comprar algo que no encaja.',
    de: 'Passung zählt mehr als Ruf — das Risiko ist, das falsche Spielmuster zu kaufen.',
    ja: '評判より適合度が重要。合わないプレイスタイルを買うのが最大のリスク。',
    pt: 'Aqui o perfil importa mais que a fama — o maior risco é comprar um jogo que não combina com seu estilo.',
  },
};

const fallbackTimeFit: Record<string, Record<BlogLocale, string>> = {
  long_games: {
    en: 'Long commitment, strong payoff if you want one big game.',
    'zh-hans': '投入周期偏长，但如果你想要一款能玩很久的大作，回报很强。',
    fr: 'Engagement long, mais excellent retour si vous voulez un gros jeu.',
    es: 'Compromiso largo, pero gran retorno si buscas un juego grande.',
    de: 'Langer Zeitaufwand, aber starker Ertrag, wenn Sie ein großes Spiel suchen.',
    ja: '長期的な投入が必要だが、大作を求めるならリターンは大きい。',
    pt: 'Investimento longo, mas o retorno é forte se você quer um jogão.',
  },
  casual: {
    en: 'Works best in short repeat sessions rather than long marathons.',
    'zh-hans': '更适合碎片时间反复游玩，而不是长时间马拉松。',
    fr: 'Idéal en sessions courtes et répétées plutôt qu\'en longues sessions.',
    es: 'Mejor en sesiones cortas y repetidas que en maratones largos.',
    de: 'Am besten in kurzen, wiederholten Sessions statt langen Marathons.',
    ja: '長時間プレイよりも、短時間の繰り返しプレイに最適。',
    pt: 'Funciona melhor em sessões curtas e repetidas do que em maratonas.',
  },
  default: {
    en: 'Moderate commitment with a fairly clear payoff curve.',
    'zh-hans': '整体投入强度中等，回报节奏也比较清楚。',
    fr: 'Engagement modéré avec une courbe de retour assez claire.',
    es: 'Compromiso moderado con una curva de retorno bastante clara.',
    de: 'Moderater Aufwand mit einer recht klaren Ertragskurve.',
    ja: '適度な投入で、リターンの見通しも比較的はっきりしている。',
    pt: 'Investimento moderado com uma curva de retorno bem clara.',
  },
};

const fallbackNearHistoricalLow: Record<string, Record<BlogLocale, string>> = {
  near_low: {
    en: 'Current pricing is close to a strong low signal.',
    'zh-hans': '当前价格已经接近较强低点信号。',
    fr: 'Le prix actuel est proche d\'un signal de prix bas.',
    es: 'El precio actual está cerca de una señal de precio bajo.',
    de: 'Der aktuelle Preis liegt nahe an einem starken Tiefpreis-Signal.',
    ja: '現在の価格は過去の安値シグナルに近い。',
    pt: 'O preço atual está perto de um sinal forte de mínima histórica.',
  },
  default: {
    en: 'Not a proven low, so compare before buying.',
    'zh-hans': '还不能直接判断为低点，建议先比较价格。',
    fr: 'Ce n\'est pas un prix bas avéré, comparez avant d\'acheter.',
    es: 'No es un precio bajo comprobado, compara antes de comprar.',
    de: 'Kein bewiesener Tiefpreis — vor dem Kauf vergleichen.',
    ja: '確実な安値とは言えないため、購入前に比較を。',
    pt: 'Não é uma mínima comprovada — compare antes de comprar.',
  },
};

// ── Entry/post helpers ──

const REGION_CODE_LOOKUP: Array<{ pattern: RegExp; regionCode: string }> = [
  { pattern: /japan|日本/iu, regionCode: 'JP' },
  { pattern: /hong\s*kong|香港/iu, regionCode: 'HK' },
  { pattern: /united\s*states|usa|\bus\b|美国/iu, regionCode: 'US' },
  { pattern: /brazil|brasil|巴西/iu, regionCode: 'BR' },
  { pattern: /united\s*kingdom|\buk\b|英国/iu, regionCode: 'GB' },
  { pattern: /germany|deutschland|德国/iu, regionCode: 'DE' },
  { pattern: /france|法国/iu, regionCode: 'FR' },
  { pattern: /spain|españa|西班牙/iu, regionCode: 'ES' },
  { pattern: /europe|eu|欧洲/iu, regionCode: 'EU' },
];

function inferRegionCode(region = '') {
  return REGION_CODE_LOOKUP.find((entry) => entry.pattern.test(region))?.regionCode;
}

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
  return shortenText(post.timeFit || post.timeCommitment || fallback, 82);
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
    playtime: post.playtime?.toLowerCase(),
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
