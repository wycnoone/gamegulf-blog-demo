import type { BlogLocale } from './i18n';
import type { QuickFilterKey } from './blog';

export interface TopicDefinition {
  slug: string;
  filter: QuickFilterKey;
  label: Record<BlogLocale, string>;
  title: Record<BlogLocale, string>;
  description: Record<BlogLocale, string>;
  intro: Record<BlogLocale, string>;
}

const year = new Date().getFullYear();

export const topics: TopicDefinition[] = [
  {
    slug: 'best-co-op-switch-games',
    filter: 'co_op',
    label: { en: 'Co-op', 'zh-hans': '合作游戏' },
    title: {
      en: `Best Co-op & Multiplayer Switch Games (${year})`,
      'zh-hans': `最佳 Switch 合作/多人游戏推荐（${year}）`,
    },
    description: {
      en: 'Curated co-op and multiplayer Switch games with buying advice, player fit, and price timing from GameGulf.',
      'zh-hans': '精选适合多人和合作游玩的 Switch 游戏，附带购买建议、适配度判断和价格时机分析。',
    },
    intro: {
      en: 'Looking for the best co-op and multiplayer games on Nintendo Switch? These guides help you judge which titles are worth buying for group play, local sessions, and party nights — and whether the current price is right.',
      'zh-hans': '在找适合和朋友、家人一起玩的 Switch 游戏？这些指南帮你判断哪些多人/合作游戏值得入手，以及现在的价格是否合适。',
    },
  },
  {
    slug: 'best-switch-rpgs',
    filter: 'long_rpg',
    label: { en: 'RPGs', 'zh-hans': 'RPG' },
    title: {
      en: `Best RPGs on Nintendo Switch (${year})`,
      'zh-hans': `最佳 Switch RPG 游戏推荐（${year}）`,
    },
    description: {
      en: 'Long-form RPGs on Switch ranked by player fit, time commitment, and buying value. GameGulf decision guides.',
      'zh-hans': '按玩家适配度、投入时间和购买价值排序的 Switch RPG 指南。',
    },
    intro: {
      en: 'These are the RPGs on Nintendo Switch that demand serious time but deliver strong long-term value. Each guide breaks down who the game is for, how much time it takes, and whether the price is right for you.',
      'zh-hans': '这些是投入时间较长但回报丰厚的 Switch RPG。每篇指南都会分析这款游戏适合谁、需要多少时间、以及现在的价格值不值。',
    },
  },
  {
    slug: 'best-family-switch-games',
    filter: 'family_friendly',
    label: { en: 'Family', 'zh-hans': '家庭游戏' },
    title: {
      en: `Best Family-Friendly Nintendo Switch Games (${year})`,
      'zh-hans': `最佳 Switch 家庭游戏推荐（${year}）`,
    },
    description: {
      en: 'Family-safe Switch games reviewed for player fit, age range, and value. GameGulf buying guides.',
      'zh-hans': '适合全家游玩的 Switch 游戏精选，包含适配度、年龄段和性价比分析。',
    },
    intro: {
      en: 'Finding games the whole family can enjoy on Nintendo Switch means balancing accessibility, fun for different ages, and price. These guides help you decide which family-friendly titles are worth the investment.',
      'zh-hans': '要找全家人都能一起享受的 Switch 游戏，需要兼顾上手难度、不同年龄段的乐趣和价格。这些指南帮你判断哪些家庭友好的游戏值得入手。',
    },
  },
  {
    slug: 'best-nintendo-first-party-games',
    filter: 'nintendo_first_party',
    label: { en: 'First-Party', 'zh-hans': '第一方' },
    title: {
      en: `Best Nintendo First-Party Switch Games (${year})`,
      'zh-hans': `最佳任天堂第一方 Switch 游戏推荐（${year}）`,
    },
    description: {
      en: "Nintendo's own Switch games ranked by value, fit, and deal timing. Know when to buy and when to wait.",
      'zh-hans': '任天堂自家 Switch 游戏按价值、适配度和折扣时机排序。帮你判断什么时候买最合适。',
    },
    intro: {
      en: "Nintendo first-party titles tend to hold their price longer than most Switch games. These guides help you decide which ones are worth paying near full price for and which deserve a patient wait.",
      'zh-hans': '任天堂第一方游戏通常比大多数 Switch 游戏更保值。这些指南帮你判断哪些值得接近原价入手，哪些更适合耐心等等。',
    },
  },
  {
    slug: 'best-switch-games-short-sessions',
    filter: 'short_sessions',
    label: { en: 'Short Sessions', 'zh-hans': '碎片时间' },
    title: {
      en: `Best Switch Games for Short Play Sessions (${year})`,
      'zh-hans': `最适合碎片时间的 Switch 游戏推荐（${year}）`,
    },
    description: {
      en: 'Switch games perfect for 15–30 minute sessions. Ideal for busy schedules and portable play.',
      'zh-hans': '适合 15–30 分钟碎片时间游玩的 Switch 游戏。通勤、午休、睡前的最佳选择。',
    },
    intro: {
      en: 'Not every game needs hours of uninterrupted time. These Switch titles work great in short bursts — perfect for commutes, lunch breaks, or winding down before bed.',
      'zh-hans': '不是每款游戏都需要连续几个小时来玩。这些 Switch 游戏非常适合碎片时间——通勤、午休或睡前都能轻松来一局。',
    },
  },
  {
    slug: 'best-switch-games-under-20',
    filter: 'under_20',
    label: { en: 'Under $20', 'zh-hans': '低于$20' },
    title: {
      en: `Best Switch Games Under $20 (${year})`,
      'zh-hans': `低于 $20 的最佳 Switch 游戏推荐（${year}）`,
    },
    description: {
      en: 'Quality Switch games under $20 that deliver real value. Sorted by deal quality and player fit.',
      'zh-hans': '低于 $20 却质量过硬的 Switch 游戏。按折扣力度和玩家适配度排序。',
    },
    intro: {
      en: 'Great games do not have to be expensive. These Switch titles are available under $20 and still deliver strong value for the price. Each guide covers player fit and whether the current deal is actually good.',
      'zh-hans': '好游戏不一定贵。这些 Switch 游戏售价不到 $20，性价比依然很高。每篇指南都会分析玩家适配度和当前折扣是否值得。',
    },
  },
  {
    slug: 'best-switch-deals',
    filter: 'great_on_sale',
    label: { en: 'On Sale', 'zh-hans': '好价推荐' },
    title: {
      en: `Best Nintendo Switch Game Deals (${year})`,
      'zh-hans': `Switch 打折好价推荐（${year}）`,
    },
    description: {
      en: 'Switch games with the strongest active deals. Buying advice on whether each sale is worth jumping on.',
      'zh-hans': '当前折扣力度最大的 Switch 游戏。每款都附带是否值得趁这波入手的购买建议。',
    },
    intro: {
      en: 'These Switch games are at strong discount levels right now. But a low price alone does not make a smart buy — these guides also check whether the game actually fits you before you spend.',
      'zh-hans': '这些 Switch 游戏目前正处于不错的折扣区间。但光价格低不代表值得买——这些指南还会帮你判断游戏是否真的适合你。',
    },
  },
  {
    slug: 'switch-games-rarely-on-sale',
    filter: 'rarely_discounted',
    label: { en: 'Rarely On Sale', 'zh-hans': '很少打折' },
    title: {
      en: 'Switch Games That Rarely Go on Sale',
      'zh-hans': '很少打折的 Switch 游戏',
    },
    description: {
      en: 'Nintendo Switch games that hold their price stubbornly. Know what to expect before waiting for a sale.',
      'zh-hans': '价格非常坚挺的 Switch 游戏。等折扣之前先了解实际折扣规律。',
    },
    intro: {
      en: 'Some Switch games almost never see meaningful discounts. If you are waiting for a deep sale on one of these, it helps to know the actual pricing history so you can set realistic expectations.',
      'zh-hans': '有些 Switch 游戏几乎不会有大幅折扣。如果你在等这些游戏降价，先了解它们的实际价格走势，才能设定合理的期望。',
    },
  },
];

export function getTopicBySlug(slug: string): TopicDefinition | undefined {
  return topics.find((t) => t.slug === slug);
}

export function getAllTopicSlugs(): string[] {
  return topics.map((t) => t.slug);
}
