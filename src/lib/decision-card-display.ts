import type {
  BlogVerdict,
  DecisionEntryCardModel,
  PriceRecommendation,
  WorthItCardModel,
} from '@/lib/blog';
import type { BlogLocale } from '@/lib/i18n';
import { shortenText, normalizeForComparison } from '@/lib/text-utils';

type CompactPriceCall = {
  label: string;
  reason: string;
  detail: string;
};

function getCompactPlatformName(platform: string) {
  if (/nintendo\s+switch/i.test(platform)) return 'Switch';
  if (/playstation\s*5|ps5/i.test(platform)) return 'PS5';
  if (/playstation\s*4|ps4/i.test(platform)) return 'PS4';
  if (/xbox\s+series/i.test(platform)) return 'Xbox Series';
  return platform.replace(/^Nintendo\s+/i, '').trim() || platform;
}

const priceRegionLabels: Record<string, Record<BlogLocale, string>> = {
  argentina: { en: 'Argentina', 'zh-hans': '阿根廷区', fr: 'Argentine', es: 'Argentina', de: 'Argentinien', ja: 'アルゼンチン', pt: 'Argentina' },
  hongkong: { en: 'Hong Kong', 'zh-hans': '香港区', fr: 'Hong Kong', es: 'Hong Kong', de: 'Hongkong', ja: '香港', pt: 'Hong Kong' },
  japan: { en: 'Japan', 'zh-hans': '日本区', fr: 'Japon', es: 'Japón', de: 'Japan', ja: '日本', pt: 'Japão' },
  us: { en: 'United States', 'zh-hans': '美国区', fr: 'États-Unis', es: 'Estados Unidos', de: 'USA', ja: 'アメリカ', pt: 'Estados Unidos' },
  europe: { en: 'Europe', 'zh-hans': '欧洲区', fr: 'Europe', es: 'Europa', de: 'Europa', ja: 'ヨーロッパ', pt: 'Europa' },
  uk: { en: 'United Kingdom', 'zh-hans': '英国区', fr: 'Royaume-Uni', es: 'Reino Unido', de: 'Vereinigtes Königreich', ja: 'イギリス', pt: 'Reino Unido' },
  global: { en: 'Global', 'zh-hans': '全球区', fr: 'Monde', es: 'Global', de: 'Weltweit', ja: 'グローバル', pt: 'Global' },
};

function getPriceRegion(text: string, locale: BlogLocale) {
  const regionPatterns = [
    { pattern: /阿根廷区|Argentina/iu, key: 'argentina' },
    { pattern: /香港区|Hong Kong/iu, key: 'hongkong' },
    { pattern: /日本区|Japan/iu, key: 'japan' },
    { pattern: /美国区|United States|USA|\bUS\b/iu, key: 'us' },
    { pattern: /欧洲区|European regions?|Europe/iu, key: 'europe' },
    { pattern: /英国区|United Kingdom|UK/iu, key: 'uk' },
  ] as const;
  const match = regionPatterns.find((entry) => entry.pattern.test(text));
  return match ? priceRegionLabels[match.key][locale] : priceRegionLabels.global[locale];
}

function getPriceAmount(text: string, locale: BlogLocale) {
  const match = text.match(
    /(?:EUR|USD|GBP|JPY|HKD)\s?\d+(?:\.\d+)?|€\s?\d+(?:\.\d+)?|\$\s?\d+(?:\.\d+)?/iu,
  );
  if (match) return match[0].replace(/\s+/gu, ' ').trim();
  const livePricing: Record<BlogLocale, string> = {
    en: 'Live pricing', 'zh-hans': '实时价格', fr: 'Prix en direct', es: 'Precio en vivo', de: 'Live-Preis', ja: 'リアルタイム価格', pt: 'Preço ao vivo',
  };
  return livePricing[locale];
}

function getPriceDetail(card: DecisionEntryCardModel) {
  const platform = getCompactPlatformName(card.platform);
  if (card.cardPrice) {
    const region = card.cardPriceRegion || platform;
    return `${card.cardPrice} · ${platform} · ${region}`;
  }
  const detailSource =
    card.kind === 'worth-it'
      ? card.priceSignalText || card.whyNow
      : card.currentDeal || card.priceSignalText || card.salePattern;
  const amount = getPriceAmount(detailSource, card.locale);
  const region = getPriceRegion(detailSource, card.locale);
  return `${amount} · ${platform} · ${region}`;
}

function getKeywordOverlapRatio(left: string, right: string) {
  const leftWords = new Set(
    normalizeForComparison(left).split(' ').filter((w) => w.length > 2),
  );
  const rightWords = new Set(
    normalizeForComparison(right).split(' ').filter((w) => w.length > 2),
  );
  if (leftWords.size === 0 || rightWords.size === 0) return 0;
  let overlap = 0;
  leftWords.forEach((word) => { if (rightWords.has(word)) overlap += 1; });
  return overlap / Math.min(leftWords.size, rightWords.size);
}

export function getCompactTakeaway(text: string) {
  return shortenText(text, 78);
}

export function getCompactDecisionField(text: string, maxLength = 54) {
  return shortenText(text, maxLength);
}

const worthItTitlePhrases: Record<BlogVerdict, Record<BlogLocale, string>> = {
  buy_now: {
    en: 'already at a smart buy price', 'zh-hans': '已经到了合适的优惠价格',
    fr: 'déjà à un bon prix d\'achat', es: 'ya a un buen precio de compra',
    de: 'bereits zu einem guten Kaufpreis', ja: 'お得な購入価格に到達',
    pt: 'já está num bom preço de compra',
  },
  wait_for_sale: {
    en: 'better after a deeper sale', 'zh-hans': '可以再等一等折扣价',
    fr: 'mieux après une meilleure promo', es: 'mejor tras una oferta más profunda',
    de: 'besser nach einem tieferen Sale', ja: 'もっと安くなってからがベスト',
    pt: 'melhor esperar uma promoção maior',
  },
  right_player: {
    en: 'worth buying if the fit is right', 'zh-hans': '如果适合你就值得买',
    fr: 'à acheter si le jeu vous correspond', es: 'vale la pena si es tu tipo de juego',
    de: 'lohnenswert, wenn die Passung stimmt', ja: '自分に合えば買い',
    pt: 'vale a pena se combinar com você',
  },
  not_best_fit: {
    en: 'not the best fit right now', 'zh-hans': '现在不算最合适的选择',
    fr: 'pas idéal pour le moment', es: 'no es la mejor opción ahora',
    de: 'aktuell nicht die beste Wahl', ja: '今はベストではない',
    pt: 'não é a melhor escolha agora',
  },
};

const buyTimingTitlePhrases: Record<PriceRecommendation, Record<BlogLocale, string>> = {
  buy: {
    en: 'already at a smart buy price', 'zh-hans': '已经到了合适的优惠价格',
    fr: 'déjà à un bon prix d\'achat', es: 'ya a un buen precio de compra',
    de: 'bereits zu einem guten Kaufpreis', ja: 'お得な購入価格に到達',
    pt: 'já está num bom preço de compra',
  },
  wait: {
    en: 'better after another sale', 'zh-hans': '可以再等一等折扣价',
    fr: 'mieux après une prochaine promo', es: 'mejor tras otra oferta',
    de: 'besser nach dem nächsten Sale', ja: '次のセールまで待つのがベスト',
    pt: 'melhor esperar a próxima promoção',
  },
  watch: {
    en: 'worth tracking before you buy', 'zh-hans': '更适合先观察再买',
    fr: 'à suivre avant d\'acheter', es: 'vale la pena seguir antes de comprar',
    de: 'vor dem Kauf beobachten', ja: '購入前に追跡する価値あり',
    pt: 'vale acompanhar antes de comprar',
  },
};

export function getDecisionDisplayTitle(card: DecisionEntryCardModel) {
  const phrase =
    card.kind === 'worth-it'
      ? worthItTitlePhrases[card.verdict][card.locale]
      : buyTimingTitlePhrases[card.priceCall][card.locale];
  const year = new Date().getFullYear();
  const formatTitleByLocale: Record<BlogLocale, string> = {
    en: `${card.gameTitle} in ${year}: ${phrase}`,
    'zh-hans': `${card.gameTitle} 在 ${year} 年：${phrase}`,
    fr: `${card.gameTitle} en ${year} : ${phrase}`,
    es: `${card.gameTitle} en ${year}: ${phrase}`,
    de: `${card.gameTitle} ${year}: ${phrase}`,
    ja: `${card.gameTitle}（${year}年）：${phrase}`,
    pt: `${card.gameTitle} em ${year}: ${phrase}`,
  };
  return formatTitleByLocale[card.locale];
}

export function getDecisionScoreChip(card: DecisionEntryCardModel) {
  if (!card.reviewSignal) return null;
  const score = card.reviewSignal.match(/\b(\d{2,3})\b/)?.[1];
  const normalized = normalizeForComparison(card.reviewSignal);
  if (score && normalized.includes('metacritic')) return `${score} MC`;
  if (score) return score;
  return shortenText(card.reviewSignal, 18);
}

const worthItVerdictBadges: Record<BlogVerdict, Record<BlogLocale, string>> = {
  buy_now: { en: 'Strong fit', 'zh-hans': '适配度强', fr: 'Très adapté', es: 'Muy adecuado', de: 'Starke Passung', ja: '適合度：高', pt: 'Ótima escolha' },
  wait_for_sale: { en: 'Fit-sensitive', 'zh-hans': '适配度敏感', fr: 'Selon profil', es: 'Depende del perfil', de: 'Passungsabhängig', ja: '適合度：条件付き', pt: 'Depende do perfil' },
  right_player: { en: 'Worth it for the right player', 'zh-hans': '适合对的人就值得', fr: 'Recommandé au bon joueur', es: 'Vale para el jugador indicado', de: 'Für den richtigen Spieler', ja: '合う人には価値あり', pt: 'Vale para o jogador certo' },
  not_best_fit: { en: 'Not the best fit', 'zh-hans': '不算最合适', fr: 'Pas idéal', es: 'No es ideal', de: 'Nicht die beste Wahl', ja: 'ベストではない', pt: 'Não é a melhor opção' },
};

export function getWorthItVerdictBadge(card: WorthItCardModel) {
  return worthItVerdictBadges[card.verdict][card.locale];
}

const compactPriceCallLabels: Record<PriceRecommendation, Record<BlogLocale, string>> = {
  buy: {
    en: 'Historical low, buy now', 'zh-hans': '历史低价，立即购买',
    fr: 'Plus bas historique, achetez', es: 'Mínimo histórico, comprar',
    de: 'Historischer Tiefpreis, jetzt kaufen', ja: '過去最安値、今すぐ購入',
    pt: 'Menor preço histórico, compre agora',
  },
  wait: {
    en: 'Wait now, next sale ahead', 'zh-hans': '先观望，等待下次折扣',
    fr: 'Attendez, prochaine promo bientôt', es: 'Espera, próxima oferta pronto',
    de: 'Warten, nächster Sale kommt', ja: '今は待ち、次のセールに期待',
    pt: 'Espere, próxima promoção à vista',
  },
  watch: {
    en: 'Set alert, discount likely soon', 'zh-hans': '先设提醒，折扣信号将至',
    fr: 'Créez une alerte, promo probable', es: 'Crea alerta, descuento probable',
    de: 'Alarm setzen, Rabatt wahrscheinlich', ja: 'アラート設定、値下げの可能性あり',
    pt: 'Crie alerta, desconto provável em breve',
  },
};

const compactPriceCallReasons: Record<PriceRecommendation, Record<BlogLocale, string>> = {
  buy: { en: 'Strong entry price', 'zh-hans': '当前入场点更强', fr: 'Bon prix d\'entrée', es: 'Buen precio de entrada', de: 'Starker Einstiegspreis', ja: '良い買い時', pt: 'Bom preço de entrada' },
  wait: { en: 'Better upside later', 'zh-hans': '继续等更划算', fr: 'Mieux d\'attendre', es: 'Mejor esperar', de: 'Später günstiger', ja: '待った方がお得', pt: 'Melhor esperar' },
  watch: { en: 'Fit matters more', 'zh-hans': '先看适配度', fr: 'L\'adéquation prime', es: 'El ajuste importa más', de: 'Passung zählt mehr', ja: '適合度が優先', pt: 'Compatibilidade importa mais' },
};

const supportFieldLabels: Record<string, Record<BlogLocale, string>> = {
  whatItIs: { en: 'What it is', 'zh-hans': '这是什么体验', fr: 'De quoi il s\'agit', es: 'Qué es', de: 'Worum es geht', ja: 'どんなゲーム？', pt: 'O que é' },
  whatHoldsBack: { en: 'What holds it back', 'zh-hans': '最容易后悔的点', fr: 'Ce qui freine', es: 'Lo que frena', de: 'Was bremst', ja: '弱点', pt: 'O que pesa contra' },
};

export function getCompactPriceCall(card: DecisionEntryCardModel): CompactPriceCall {
  const reasonSource =
    card.kind === 'worth-it'
      ? card.whyNow
      : card.currentDeal || card.salePattern || card.reviewSignal || '';
  return {
    label: compactPriceCallLabels[card.priceCall][card.locale],
    reason: getCompactDecisionField(reasonSource || compactPriceCallReasons[card.priceCall][card.locale], 18),
    detail: getPriceDetail(card),
  };
}

export function getFeaturedSupportField(card: DecisionEntryCardModel): { label: string; value: string } | null {
  if (card.kind !== 'worth-it') return null;
  const primary = card.whatItIs;
  const fallback = card.mainFriction;
  const normalizedPrimary = normalizeForComparison(primary);
  const normalizedTakeaway = normalizeForComparison(card.listingTakeaway);
  const hasStrongRepeat =
    normalizedPrimary.includes(normalizedTakeaway) ||
    normalizedTakeaway.includes(normalizedPrimary) ||
    getKeywordOverlapRatio(primary, card.listingTakeaway) >= 0.45;
  if (!hasStrongRepeat && primary) {
    return { label: supportFieldLabels.whatItIs[card.locale], value: getCompactDecisionField(primary, 84) };
  }
  if (fallback) {
    return { label: supportFieldLabels.whatHoldsBack[card.locale], value: getCompactDecisionField(fallback, 84) };
  }
  if (primary) {
    return { label: supportFieldLabels.whatItIs[card.locale], value: getCompactDecisionField(primary, 84) };
  }
  return null;
}
