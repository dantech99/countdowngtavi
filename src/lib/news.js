// src/lib/news.js
import Parser from 'rss-parser';
import { fetchAllFeeds } from './rss.js';

export const FEEDS = [
  { url: 'https://www.gamespot.com/feeds/news', source: 'GameSpot' },
  { url: 'https://www.eurogamer.net/feed', source: 'Eurogamer' },
  { url: 'https://www.vg247.com/feed', source: 'VG247' },
];

const GTA_PATTERN = /\b(gta|grand\s+theft\s+auto)\b/i;

export function isGtaNews(item) {
  return GTA_PATTERN.test(item.title ?? '');
}

export async function fetchAggregated(feeds = FEEDS) {
  const parser = new Parser();
  const items = await fetchAllFeeds(feeds, parser.parseURL.bind(parser));
  return items.filter(isGtaNews);
}

export function mergeNews(articulos, aggregated) {
  return [
    ...articulos.map((entry) => ({ kind: 'propio', date: entry.data.pubDate, entry })),
    ...aggregated
      .filter((item) => item.pubDate !== null)
      .map((item) => ({ kind: 'agregado', date: item.pubDate, item })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());
}
