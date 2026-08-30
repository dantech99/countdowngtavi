// src/lib/news.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { parseURL } = vi.hoisted(() => ({ parseURL: vi.fn() }));

vi.mock('rss-parser', () => ({
  default: vi.fn().mockImplementation(function FakeParser() {
    this.parseURL = parseURL;
  }),
}));

const { mergeNews, isGtaNews, FEEDS, fetchAggregated } = await import('./news.js');

const articulo = (title, pubDate) => ({ id: title, data: { title, pubDate: new Date(pubDate) } });
const agregado = (title, pubDate) => ({ title, link: `https://x/${title}`, pubDate: pubDate ? new Date(pubDate) : null, source: 'GameSpot' });

describe('FEEDS', () => {
  it('lists feeds as url/source pairs', () => {
    expect(FEEDS.length).toBeGreaterThan(0);
    for (const feed of FEEDS) {
      expect(typeof feed.url).toBe('string');
      expect(typeof feed.source).toBe('string');
    }
  });
});

describe('isGtaNews', () => {
  it('keeps titles mentioning GTA or Grand Theft Auto, in any casing', () => {
    expect(isGtaNews({ title: 'GTA 6 delayed again' })).toBe(true);
    expect(isGtaNews({ title: 'Everything we know about Grand Theft Auto 6' })).toBe(true);
    expect(isGtaNews({ title: 'rockstar confirms gta release window' })).toBe(true);
  });

  it('rejects unrelated gaming news', () => {
    expect(isGtaNews({ title: 'Fable delayed to 2027' })).toBe(false);
    expect(isGtaNews({ title: 'The best Steam Deck games' })).toBe(false);
  });

  it('rejects an item with no title instead of throwing', () => {
    expect(isGtaNews({})).toBe(false);
  });
});

describe('mergeNews', () => {
  it('merges both sources sorted newest first, tagging each entry', () => {
    const result = mergeNews(
      [articulo('propio-viejo', '2026-01-01'), articulo('propio-nuevo', '2026-03-01')],
      [agregado('agregado-medio', '2026-02-01')]
    );

    expect(result.map((r) => r.kind)).toEqual(['propio', 'agregado', 'propio']);
    expect(result[0].entry.data.title).toBe('propio-nuevo');
    expect(result[1].item.title).toBe('agregado-medio');
    expect(result[2].entry.data.title).toBe('propio-viejo');
  });

  it('drops aggregated items that have no date', () => {
    const result = mergeNews([], [agregado('sin-fecha', null), agregado('con-fecha', '2026-02-01')]);
    expect(result).toHaveLength(1);
    expect(result[0].item.title).toBe('con-fecha');
  });

  it('returns an empty array when there is nothing to show', () => {
    expect(mergeNews([], [])).toEqual([]);
  });
});

describe('fetchAggregated memoization', () => {
  beforeEach(() => {
    parseURL.mockReset();
    parseURL.mockResolvedValue({ items: [] });
  });

  it('performs only one fetch round across multiple calls with the default feeds', async () => {
    await fetchAggregated();
    await fetchAggregated();

    expect(parseURL).toHaveBeenCalledTimes(FEEDS.length);
  });
});
