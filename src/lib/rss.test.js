import { describe, it, expect, vi } from 'vitest';
import { normalizeFeedItem, extractImage, fetchFeed, fetchAllFeeds } from './rss.js';

describe('normalizeFeedItem', () => {
  it('normalizes a well-formed item', () => {
    const item = { title: 'GTA 6 delayed again', link: 'https://example.com/a', pubDate: '2026-08-01T12:00:00Z' };
    expect(normalizeFeedItem(item, 'IGN')).toEqual({
      title: 'GTA 6 delayed again',
      link: 'https://example.com/a',
      pubDate: new Date('2026-08-01T12:00:00Z'),
      source: 'IGN',
      image: null,
    });
  });

  it('falls back to empty strings and null date for missing fields', () => {
    expect(normalizeFeedItem({}, 'IGN')).toEqual({
      title: '',
      link: '',
      pubDate: null,
      source: 'IGN',
      image: null,
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
      { title: 'A', link: 'https://a', pubDate: new Date('2026-08-01T00:00:00Z'), source: 'Rockstar Newswire', image: null },
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
      { title: 'Good item', link: 'https://good', pubDate: new Date('2026-08-01T00:00:00Z'), source: 'Good Source', image: null },
    ]);
  });

  it('never rejects even if every feed fails', async () => {
    const parseFn = vi.fn().mockRejectedValue(new Error('down'));
    const result = await fetchAllFeeds([{ url: 'https://x.example.com', source: 'X' }], parseFn);
    expect(result).toEqual([]);
  });
});

describe('extractImage', () => {
  it('reads media:content and asks the CDN for a wider render', () => {
    const item = { 'media:content': [{ $: { url: 'https://cdn.example.com/a.webp?w=300', type: 'image/webp' } }] };
    expect(extractImage(item)).toBe('https://cdn.example.com/a.webp?w=800');
  });

  it('reads media:thumbnail when media:content is absent', () => {
    const item = { 'media:thumbnail': { $: { url: 'https://cdn.example.com/b.jpg' } } };
    expect(extractImage(item)).toBe('https://cdn.example.com/b.jpg');
  });

  it('prefers the enclosure when it is an image', () => {
    const item = { enclosure: { url: 'https://cdn.example.com/c.jpg', type: 'image/jpeg' } };
    expect(extractImage(item)).toBe('https://cdn.example.com/c.jpg');
  });

  it('skips non-image media and falls back to the first inline img', () => {
    const item = {
      'media:content': [{ $: { medium: 'video', url: 'https://cdn.example.com/clip.mp4' } }],
      content: '<p>Hola</p><img src="https://cdn.example.com/d.png" alt="">',
    };
    expect(extractImage(item)).toBe('https://cdn.example.com/d.png');
  });

  it('leaves widths that are already large enough untouched', () => {
    const item = { 'media:content': [{ $: { medium: 'image', url: 'https://cdn.example.com/e.jpg?width=1200&quality=85' } }] };
    expect(extractImage(item)).toBe('https://cdn.example.com/e.jpg?width=1200&quality=85');
  });

  it('returns null when the item carries no image', () => {
    expect(extractImage({ title: 'sin imagen' })).toBeNull();
  });
});
