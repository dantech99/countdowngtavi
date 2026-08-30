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

// media:* namespaces are where most gaming feeds publish their article
// thumbnails, and rss-parser only surfaces them when asked explicitly.
const PARSER_OPTIONS = {
  customFields: {
    item: [
      ['media:content', 'media:content', { keepArray: true }],
      ['media:thumbnail', 'media:thumbnail', { keepArray: true }],
    ],
  },
};

async function fetchAndFilter(feeds) {
  const parser = new Parser(PARSER_OPTIONS);
  const items = await fetchAllFeeds(feeds, parser.parseURL.bind(parser));
  return items.filter(isGtaNews).filter((item) => item.link !== '');
}

// Memoizes the default-feeds fetch at module scope so a single build only
// performs one fetch round, no matter how many pages call fetchAggregated().
// Calls with explicit feeds (used by tests) always bypass the cache.
let cachedAggregated;

export async function fetchAggregated(feeds = FEEDS) {
  if (feeds !== FEEDS) {
    return fetchAndFilter(feeds);
  }
  if (!cachedAggregated) {
    cachedAggregated = fetchAndFilter(feeds);
  }
  return cachedAggregated;
}

export function mergeNews(articulos, aggregated) {
  return [
    ...articulos.map((entry) => ({ kind: 'propio', date: entry.data.pubDate, entry })),
    ...aggregated
      .filter((item) => item.pubDate !== null)
      .map((item) => ({ kind: 'agregado', date: item.pubDate, item })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());
}
