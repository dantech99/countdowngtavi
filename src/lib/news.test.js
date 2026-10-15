// src/lib/news.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { parseURL } = vi.hoisted(() => ({ parseURL: vi.fn() }));

vi.mock('rss-parser', () => ({
  default: vi.fn().mockImplementation(function FakeParser() {
    this.parseURL = parseURL;
  }),
}));

const { mergeNews, isGtaNews, forLang, FEEDS, fetchAggregated } = await import('./news.js');

const articulo = (title, pubDate) => ({ id: title, data: { title, pubDate: new Date(pubDate) } });
const agregado = (title, pubDate) => ({ title, link: `https://x/${title}`, pubDate: pubDate ? new Date(pubDate) : null, source: 'GameSpot' });

describe('FEEDS', () => {
  it('lists feeds as url/source pairs', () => {
    expect(FEEDS.length).toBeGreaterThan(0);
    for (const feed of FEEDS) {
      expect(typeof feed.url).toBe('string');
      expect(typeof feed.source).toBe('string');
      expect(['es', 'en']).toContain(feed.lang);
    }
  });

  it('covers both locales, each with several portals', () => {
    expect(FEEDS.filter((f) => f.lang === 'es').length).toBeGreaterThanOrEqual(3);
    expect(FEEDS.filter((f) => f.lang === 'en').length).toBeGreaterThanOrEqual(3);
  });

  it('has no duplicate urls or source names', () => {
    expect(new Set(FEEDS.map((f) => f.url)).size).toBe(FEEDS.length);
    expect(new Set(FEEDS.map((f) => f.source)).size).toBe(FEEDS.length);
  });
});

describe('forLang', () => {
  it('keeps only the items of the requested language', () => {
    const items = [{ lang: 'es', title: 'a' }, { lang: 'en', title: 'b' }, { lang: 'es', title: 'c' }];
    expect(forLang(items, 'es').map((i) => i.title)).toEqual(['a', 'c']);
    expect(forLang(items, 'en').map((i) => i.title)).toEqual(['b']);
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

  it('trusts the setting names only in the title', () => {
    expect(isGtaNews({ title: 'Leonida tendrá su propio mapa de calor' })).toBe(true);
    expect(isGtaNews({ title: 'Back to Vice City: what we saw' })).toBe(true);
    expect(isGtaNews({ title: 'Jason y Lucia protagonizan el nuevo tráiler' })).toBe(true);
    expect(isGtaNews({ title: 'Reseña de Mafia', description: 'Con aire a Vice City' })).toBe(false);
  });

  it('matches the franchise in the description', () => {
    expect(isGtaNews({ title: 'Rockstar confirma fecha', description: 'El lanzamiento de GTA VI llega en noviembre' })).toBe(true);
  });

  it('matches the franchise in the categories', () => {
    expect(isGtaNews({ title: 'Rockstar confirma fecha', categories: ['Noticias', 'GTA 6'] })).toBe(true);
    expect(isGtaNews({ title: 'Rockstar confirma fecha', categories: ['Noticias'] })).toBe(false);
  });

  it('does not match words that merely contain the letters', () => {
    expect(isGtaNews({ title: 'Vegeta regresa en el nuevo juego', description: 'Dragon Ball' })).toBe(false);
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
