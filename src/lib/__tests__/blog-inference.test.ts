import { describe, it, expect } from 'vitest';
import {
  inferQuickFilters,
  inferActionBucket,
  inferPriceCall,
  getFallbackVerdict,
  extractMetacriticScore,
  containsAny,
  sentenceCaseLabel,
} from '../blog-inference';

function mockPost(overrides: Record<string, unknown> = {}) {
  return {
    locale: 'en' as const,
    category: 'worth-it' as const,
    title: 'Test Game Worth It',
    gameTitle: 'Test Game',
    description: 'A fun game',
    priceSignal: 'Currently full price',
    heroNote: 'Great game',
    heroStat: 'Metacritic 88',
    decision: 'Worth buying if you like the genre',
    tags: ['action', 'rpg'],
    playtime: '~30h main',
    ...overrides,
  };
}

describe('containsAny', () => {
  it('returns true when text contains a keyword', () => {
    expect(containsAny('This is a co-op game', ['co-op'])).toBe(true);
  });

  it('returns false when text contains no keywords', () => {
    expect(containsAny('This is a single player game', ['co-op', 'multiplayer'])).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(containsAny('CO-OP mode', ['co-op'])).toBe(true);
  });
});

describe('sentenceCaseLabel', () => {
  it('converts snake_case to Sentence Case', () => {
    expect(sentenceCaseLabel('long_rpg')).toBe('Long Rpg');
    expect(sentenceCaseLabel('co_op')).toBe('Co Op');
  });
});

describe('extractMetacriticScore', () => {
  it('extracts score from reviewSignal mentioning Metacritic', () => {
    const post = mockPost({ reviewSignal: 'Metacritic 92' });
    expect(extractMetacriticScore(post)).toBe(92);
  });

  it('extracts score from heroStat', () => {
    const post = mockPost({ reviewSignal: undefined, heroStat: 'Metacritic 85' });
    expect(extractMetacriticScore(post)).toBe(85);
  });

  it('returns null when no Metacritic mention', () => {
    const post = mockPost({ reviewSignal: 'Very Positive on Steam', heroStat: '92% positive' });
    expect(extractMetacriticScore(post)).toBe(null);
  });

  it('returns null when Metacritic mentioned but no score', () => {
    const post = mockPost({ reviewSignal: 'Metacritic score pending', heroStat: '' });
    expect(extractMetacriticScore(post)).toBe(null);
  });

  it('picks the first valid score', () => {
    const post = mockPost({ reviewSignal: 'Metacritic 88', heroStat: 'Metacritic 90' });
    expect(extractMetacriticScore(post)).toBe(88);
  });
});

describe('getFallbackVerdict', () => {
  it('returns wait_for_sale for buy-now-or-wait with wait in decision', () => {
    const post = mockPost({ category: 'buy-now-or-wait', decision: 'Wait for a better sale' });
    expect(getFallbackVerdict(post)).toBe('wait_for_sale');
  });

  it('returns buy_now for buy-now-or-wait with non-wait decision', () => {
    const post = mockPost({ category: 'buy-now-or-wait', decision: 'Good price right now' });
    expect(getFallbackVerdict(post)).toBe('buy_now');
  });

  it('returns right_player for worth-it with "not the best fit" in decision', () => {
    const post = mockPost({ category: 'worth-it', decision: 'Not the best fit for everyone' });
    expect(getFallbackVerdict(post)).toBe('right_player');
  });

  it('defaults to right_player for worth-it', () => {
    const post = mockPost({ category: 'worth-it', decision: 'Great game for fans' });
    expect(getFallbackVerdict(post)).toBe('right_player');
  });
});

describe('inferQuickFilters', () => {
  it('returns explicit quickFilters if set', () => {
    const post = mockPost({ quickFilters: ['co_op', 'long_rpg'] });
    expect(inferQuickFilters(post)).toEqual(['co_op', 'long_rpg']);
  });

  it('infers co_op from tags containing co-op', () => {
    const post = mockPost({ tags: ['co-op', 'action'] });
    expect(inferQuickFilters(post)).toContain('co_op');
  });

  it('infers long_rpg from playerNeeds', () => {
    const post = mockPost({ playerNeeds: ['long_games'] });
    expect(inferQuickFilters(post)).toContain('long_rpg');
  });

  it('infers family_friendly from title keywords', () => {
    const post = mockPost({ title: 'Best family games for kids' });
    expect(inferQuickFilters(post)).toContain('family_friendly');
  });

  it('infers nintendo_first_party from gameTitle', () => {
    const post = mockPost({ gameTitle: 'Super Mario Odyssey' });
    expect(inferQuickFilters(post)).toContain('nintendo_first_party');
  });

  it('infers short_sessions from playerNeeds casual', () => {
    const post = mockPost({ playerNeeds: ['casual'] });
    expect(inferQuickFilters(post)).toContain('short_sessions');
  });

  it('infers under_20 from title', () => {
    const post = mockPost({ title: 'Great game under $20' });
    expect(inferQuickFilters(post)).toContain('under_20');
  });

  it('infers great_on_sale from title', () => {
    const post = mockPost({ title: 'Deep sale value game' });
    expect(inferQuickFilters(post)).toContain('great_on_sale');
  });

  it('infers rarely_discounted from title', () => {
    const post = mockPost({ title: 'Nintendo game rarely discounted' });
    expect(inferQuickFilters(post)).toContain('rarely_discounted');
  });

  it('returns empty array when no signals match', () => {
    const post = mockPost({
      title: 'Some Game',
      gameTitle: 'Some Game',
      description: 'A game',
      tags: ['puzzle'],
      playerNeeds: [],
    });
    expect(inferQuickFilters(post)).toEqual([]);
  });
});

describe('inferActionBucket', () => {
  it('returns explicit actionBucket if set', () => {
    const post = mockPost({ actionBucket: 'set_alert' });
    expect(inferActionBucket(post, 'buy_now')).toBe('set_alert');
  });

  it('returns buy_now from priceCall buy', () => {
    const post = mockPost({ priceCall: 'buy' });
    expect(inferActionBucket(post, 'wait_for_sale')).toBe('buy_now');
  });

  it('returns wait from priceCall wait', () => {
    const post = mockPost({ priceCall: 'wait' });
    expect(inferActionBucket(post, 'buy_now')).toBe('wait');
  });

  it('returns set_alert from priceCall watch', () => {
    const post = mockPost({ priceCall: 'watch' });
    expect(inferActionBucket(post, 'buy_now')).toBe('set_alert');
  });

  it('infers from verdict when no priceCall', () => {
    const post = mockPost({});
    expect(inferActionBucket(post, 'buy_now')).toBe('buy_now');
    expect(inferActionBucket(post, 'wait_for_sale')).toBe('wait');
    expect(inferActionBucket(post, 'right_player')).toBe('set_alert');
  });

  it('defaults to wait', () => {
    const post = mockPost({});
    expect(inferActionBucket(post, 'not_best_fit')).toBe('wait');
  });
});

describe('inferPriceCall', () => {
  it('returns explicit priceCall if set', () => {
    const post = mockPost({ priceCall: 'watch' });
    expect(inferPriceCall(post, 'buy_now')).toBe('watch');
  });

  it('returns buy for buy_now verdict', () => {
    const post = mockPost({});
    expect(inferPriceCall(post, 'buy_now')).toBe('buy');
  });

  it('returns watch when priceSignal mentions alert', () => {
    const post = mockPost({ priceSignal: 'Set an alert for price drops' });
    expect(inferPriceCall(post, 'right_player')).toBe('watch');
  });

  it('defaults to wait', () => {
    const post = mockPost({ priceSignal: 'Full price currently' });
    expect(inferPriceCall(post, 'wait_for_sale')).toBe('wait');
  });
});
