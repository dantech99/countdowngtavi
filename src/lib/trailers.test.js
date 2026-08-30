import { describe, it, expect } from 'vitest';
import { TRAILERS, getLatestTrailers, watchUrl } from './trailers.js';

describe('watchUrl', () => {
  it('builds a canonical YouTube watch link', () => {
    expect(watchUrl('QdBZY2fkU-0')).toBe('https://www.youtube.com/watch?v=QdBZY2fkU-0');
  });
});

describe('getLatestTrailers', () => {
  it('returns the newest trailers first', () => {
    const trailers = [
      { id: 'old', publishedAt: '2023-12-04' },
      { id: 'new', publishedAt: '2026-08-28' },
      { id: 'mid', publishedAt: '2025-05-06' },
    ];
    expect(getLatestTrailers(2, trailers).map((t) => t.id)).toEqual(['new', 'mid']);
  });

  it('does not mutate the source list', () => {
    const trailers = [
      { id: 'a', publishedAt: '2023-01-01' },
      { id: 'b', publishedAt: '2026-01-01' },
    ];
    getLatestTrailers(2, trailers);
    expect(trailers.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('defaults to the two newest curated trailers', () => {
    expect(getLatestTrailers()).toHaveLength(2);
  });

  it('caps at the list length when asked for more than it has', () => {
    expect(getLatestTrailers(99)).toHaveLength(TRAILERS.length);
  });
});
