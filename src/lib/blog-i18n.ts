/**
 * Locale-specific labels, fallback strings, and region lookups for blog.
 * Extracted from blog.ts to keep that file focused on content access and card building.
 */
import type { BlogLocale } from '@/lib/i18n';
import type { BlogCategory, BlogVerdict, PriceRecommendation } from '@/lib/blog-shared';

// ── Category metadata ──

export const categoryMeta: Record<BlogCategory, { title: Record<BlogLocale, string>; description: Record<BlogLocale, string> }> = {
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

// ── Locale-aware label helpers ──

export const confidenceLabels: Record<'high' | 'medium' | 'low', Record<BlogLocale, string>> = {
  high: { en: 'High', 'zh-hans': '高', fr: 'Élevée', es: 'Alta', de: 'Hoch', ja: '高', pt: 'Alta' },
  medium: { en: 'Medium', 'zh-hans': '中', fr: 'Moyenne', es: 'Media', de: 'Mittel', ja: '中', pt: 'Média' },
  low: { en: 'Low', 'zh-hans': '低', fr: 'Faible', es: 'Baja', de: 'Niedrig', ja: '低', pt: 'Baixa' },
};

export const priceRecommendationLabels: Record<PriceRecommendation, Record<BlogLocale, string>> = {
  buy: { en: 'Buy now', 'zh-hans': '现在买', fr: 'Acheter', es: 'Comprar', de: 'Jetzt kaufen', ja: '今すぐ購入', pt: 'Comprar agora' },
  wait: { en: 'Wait', 'zh-hans': '先等等', fr: 'Attendre', es: 'Esperar', de: 'Warten', ja: '待つ', pt: 'Esperar' },
  watch: { en: 'Set alert', 'zh-hans': '先设提醒', fr: 'Créer alerte', es: 'Crear alerta', de: 'Alarm setzen', ja: 'アラート設定', pt: 'Criar alerta' },
};

export const verdictLabels: Record<BlogVerdict, Record<BlogLocale, string>> = {
  buy_now: { en: 'Buy now', 'zh-hans': '现在买', fr: 'Acheter maintenant', es: 'Comprar ahora', de: 'Jetzt kaufen', ja: '今すぐ購入', pt: 'Comprar agora' },
  wait_for_sale: { en: 'Wait for sale', 'zh-hans': '等打折', fr: 'Attendre les soldes', es: 'Esperar oferta', de: 'Auf Sale warten', ja: 'セールを待つ', pt: 'Esperar promoção' },
  right_player: { en: 'Worth it for the right player', 'zh-hans': '适合对的人就值得买', fr: 'À recommander au bon joueur', es: 'Vale para el jugador adecuado', de: 'Für den richtigen Spieler lohnenswert', ja: '合う人には買い', pt: 'Vale a pena pro jogador certo' },
  not_best_fit: { en: 'Not the best fit right now', 'zh-hans': '现在不一定最适合你', fr: 'Pas idéal pour le moment', es: 'No es la mejor opción ahora', de: 'Aktuell nicht die beste Wahl', ja: '今はベストではない', pt: 'Não é a melhor escolha agora' },
};

export const ctaReadGuide: Record<BlogLocale, string> = {
  en: 'Read decision guide', 'zh-hans': '查看判断', fr: 'Lire le guide', es: 'Leer la guía', de: 'Ratgeber lesen', ja: 'ガイドを読む', pt: 'Ler guia de decisão',
};

export const ctaSetAlert: Record<BlogLocale, string> = {
  en: 'Set alert', 'zh-hans': '开启提醒', fr: 'Créer une alerte', es: 'Crear alerta', de: 'Alarm setzen', ja: 'アラートを設定', pt: 'Criar alerta',
};

// ── Fallback strings (used when frontmatter data is missing) ──

export const fallbackWhatItIs: Record<BlogLocale, string> = {
  en: 'A Switch game best judged by fit, payoff, and price timing.',
  'zh-hans': '一款更适合按玩家适配、投入回报和价格时机来判断的 Switch 游戏。',
  fr: 'Un jeu Switch à évaluer selon l\'adéquation, le rendement et le prix.',
  es: 'Un juego de Switch que conviene evaluar por ajuste, rendimiento y precio.',
  de: 'Ein Switch-Spiel, das nach Passung, Ertrag und Preis-Timing beurteilt wird.',
  ja: '適合度・投資対効果・価格タイミングで判断すべきSwitchゲーム。',
  pt: 'Um jogo de Switch que vale avaliar pelo perfil do jogador, retorno e timing de preço.',
};

export const fallbackAvoidIf: Record<string, Record<BlogLocale, string>> = {
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

export const fallbackConsensusPraise: Record<BlogLocale, string> = {
  en: 'Players usually rate the fit and quality highly when the genre already clicks.',
  'zh-hans': '当玩法类型本身对味时，这款游戏通常能得到很高的认可。',
  fr: 'Les joueurs apprécient généralement la qualité quand le genre leur convient.',
  es: 'Los jugadores suelen valorar bien cuando el género les gusta.',
  de: 'Spieler bewerten Qualität und Passung hoch, wenn das Genre bereits gefällt.',
  ja: 'ジャンルが合えば、適合度と品質の評価は高い傾向。',
  pt: 'Jogadores geralmente avaliam bem quando o gênero já combina com eles.',
};

export const fallbackMainFriction: Record<string, Record<BlogLocale, string>> = {
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

export const fallbackTimeFit: Record<string, Record<BlogLocale, string>> = {
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

export const fallbackNearHistoricalLow: Record<string, Record<BlogLocale, string>> = {
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

// ── Region code lookup ──

export const REGION_CODE_LOOKUP: Array<{ pattern: RegExp; regionCode: string }> = [
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

export function inferRegionCode(region = '') {
  return REGION_CODE_LOOKUP.find((entry) => entry.pattern.test(region))?.regionCode;
}
