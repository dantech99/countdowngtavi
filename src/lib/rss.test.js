import { describe, it, expect, vi } from 'vitest';
import { normalizeFeedItem, fetchFeed, fetchAllFeeds } from './rss.js';

describe('normalizeFeedItem', () => {
  it('normalizes a well-formed item', () => {
    const item = { title: 'GTA 6 delayed again', link: 'https://example.com/a', pubDate: '2026-08-01T12:00:00Z' };
    expect(normalizeFeedItem(item, 'IGN')).toEqual({
      title: 'GTA 6 delayed again',
      link: 'https://example.com/a',
      pubDate: new Date('2026-08-01T12:00:00Z'),
      source: 'IGN',
    });
  });

  it('falls back to empty strings and null date for missing fields', () => {
    expect(normalizeFeedItem({}, 'IGN')).toEqual({
      title: '',
      link: '',
      pubDate: null,
      source: 'IGN',
    });
  });
});

describe('fetchFeed', () => {
  it('parses a feed and normalizes each item', async () => {
    const parseFn = vi.fn().mockResolvedValue({
      items: [{ title: 'A', link: 'https://a', pubDate: '2026-08-01T00:00:00Z' }],
    });

    const result = await fetchFeed('https://feed.example.com/rss', 'Rockstar Newswire', parseFn);

    expect(parseFn).toHaveBeenCalledWith('https://feed.example.com/rss');
    expect(result).toEqual([
      { title: 'A', link: 'https://a', pubDate: new Date('2026-08-01T00:00:00Z'), source: 'Rockstar Newswire' },
    ]);
  });
});

describe('fetchAllFeeds', () => {
  it('merges items from every feed that succeeds', async () => {
    const parseFn = vi.fn(async (url) => {
      if (url === 'https://good.example.com') {
        return { items: [{ title: 'Good item', link: 'https://good', pubDate: '2026-08-01T00:00:00Z' }] };
      }
      throw new Error('network error');
    });

    const result = await fetchAllFeeds(
      [
        { url: 'https://good.example.com', source: 'Good Source' },
        { url: 'https://bad.example.com', source: 'Bad Source' },
      ],
      parseFn
    );

    expect(result).toEqual([
      { title: 'Good item', link: 'https://good', pubDate: new Date('2026-08-01T00:00:00Z'), source: 'Good Source' },
    ]);
  });

  it('never rejects even if every feed fails', async () => {
    const parseFn = vi.fn().mockRejectedValue(new Error('down'));
    const result = await fetchAllFeeds([{ url: 'https://x.example.com', source: 'X' }], parseFn);
    expect(result).toEqual([]);
  });
});
