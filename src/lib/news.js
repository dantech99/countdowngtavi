// src/lib/news.js
import Parser from 'rss-parser';
import { fetchAllFeeds } from './rss.js';

// `lang` decides which locale's news page shows the feed's items. The five
// Spanish portals and the new English ones were added without being reachable
// from the dev container: run `pnpm feeds:check` to confirm each URL still
// answers. A dead feed is skipped at build time, never fatal.
export const FEEDS = [
  { url: 'https://www.gamespot.com/feeds/news', source: 'GameSpot', lang: 'en' },
  { url: 'https://www.eurogamer.net/feed', source: 'Eurogamer', lang: 'en' },
  { url: 'https://www.vg247.com/feed', source: 'VG247', lang: 'en' },
  { url: 'https://www.pcgamer.com/rss/', source: 'PC Gamer', lang: 'en' },
  { url: 'https://www.gamesradar.com/rss/', source: 'GamesRadar', lang: 'en' },
  { url: 'https://insider-gaming.com/feed/', source: 'Insider Gaming', lang: 'en' },
  { url: 'https://www.vidaextra.com/feed', source: 'Vida Extra', lang: 'es' },
  { url: 'https://www.areajugones.es/feed/', source: 'Areajugones', lang: 'es' },
  { url: 'https://www.3djuegos.com/feed/', source: '3DJuegos', lang: 'es' },
  { url: 'https://vandal.elespanol.com/xml.cgi', source: 'Vandal', lang: 'es' },
  { url: 'https://www.hobbyconsolas.com/feed', source: 'HobbyConsolas', lang: 'es' },
];

// The franchise name is a strong signal anywhere (title, lead paragraph, tag).
// The setting names are only trusted in the title: in a body they show up in
// reviews of unrelated games ("a Vice City vibe").
const STRONG_PATTERN = /\b(gta|grand\s+theft\s+auto)\b/i;
const TITLE_ONLY_PATTERN = /\b(leonida|vice\s+city|jason\s+(?:and|y)\s+lucia)\b/i;

export function isGtaNews(item) {
  const title = item.title ?? '';
  if (STRONG_PATTERN.test(title) || TITLE_ONLY_PATTERN.test(title)) return true;
  if (STRONG_PATTERN.test(item.description ?? '')) return true;
  return (item.categories ?? []).some((category) => STRONG_PATTERN.test(category));
}

export function forLang(items, lang) {
  return items.filter((item) => item.lang === lang);
}

// media:* namespaces are where most gaming feeds publish their article
// thumbnails, and rss-parser only surfaces them when asked explicitly.
const PARSER_OPTIONS = {
  // Eleven feeds are fetched per build; one hanging portal must not stall it.
  timeout: 10_000,
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
