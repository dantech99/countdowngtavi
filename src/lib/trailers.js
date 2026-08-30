// src/lib/trailers.js
//
// Curated on purpose: YouTube's channel feed only exposes Rockstar's 15 most
// recent uploads, so the older trailers fall out of it within weeks. Every id
// here was verified against https://www.youtube.com/oembed.
/**
 * @typedef {{ id: string, label: string, title: string, publishedAt: string, poster: 'sunset' | 'neon' }} Trailer
 * @type {readonly Trailer[]}
 */
export const TRAILERS = [
  {
    id: 'tJbzMqJGH4k',
    label: 'An Extended Look',
    title: 'Grand Theft Auto VI: An Extended Look',
    publishedAt: '2026-08-28',
    poster: 'sunset',
  },
  {
    id: 'VQRLujxTm3c',
    label: 'Trailer 2',
    title: 'Grand Theft Auto VI Trailer 2',
    publishedAt: '2025-05-06',
    poster: 'neon',
  },
  {
    id: 'QdBZY2fkU-0',
    label: 'Trailer 1',
    title: 'Grand Theft Auto VI Trailer 1',
    publishedAt: '2023-12-04',
    poster: 'sunset',
  },
];

export function watchUrl(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function getLatestTrailers(count = 2, trailers = TRAILERS) {
  return [...trailers]
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, count);
}
