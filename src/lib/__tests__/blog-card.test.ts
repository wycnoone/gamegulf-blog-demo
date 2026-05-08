import { describe, expect, it, vi } from 'vitest';

vi.mock('astro:content', () => ({
  getCollection: vi.fn(),
  render: vi.fn(),
}));

function mockWorthItPost(overrides: Record<string, unknown> = {}): any {
  return {
    locale: 'zh-hans',
    slug: 'test-game-worth-it',
    category: 'worth-it',
    title: '2026 年还值得在 Switch 上买《测试游戏》吗？',
    description: '测试游戏购买参考。',
    publishedAt: '2026-05-07',
    updatedAt: '2026-05-07',
    gameTitle: '测试游戏',
    platform: 'Switch',
    author: 'GameGulf 编辑部',
    readingTime: '7 分钟阅读',
    decision: '适合就可以买。',
    priceSignal: '价格信号清楚。',
    wishlistHref: 'https://www.gamegulf.com/wishlist',
    priceTrackHref: 'https://www.gamegulf.com/detail/test#currency-price',
    gameHref: 'https://www.gamegulf.com/detail/test',
    membershipHref: 'https://www.gamegulf.com/pricing',
    heroStat: 'Metacritic 约 89 分',
    heroNote: '测试游戏：动作冒险。',
    featuredPriority: 2,
    tags: [],
    faq: [],
    body: '',
    _entry: {},
    ...overrides,
  };
}

describe('prepareDecisionEntryCard', () => {
  it('carries eligible frontmatter featuredPriority into the listing card model', async () => {
    const { prepareDecisionEntryCard } = await import('../blog');

    const card = await prepareDecisionEntryCard(mockWorthItPost());

    expect(card.featuredPriority).toBe(2);
  });
});
