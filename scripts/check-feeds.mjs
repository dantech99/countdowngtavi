// scripts/check-feeds.mjs — `pnpm feeds:check`
// Probes every feed in FEEDS the way the build does, so a dead or renamed
// URL shows up here instead of silently disappearing from the news page.
import Parser from 'rss-parser';
import { FEEDS, isGtaNews } from '../src/lib/news.js';
import { normalizeFeedItem } from '../src/lib/rss.js';

const parser = new Parser({ timeout: 10_000 });
let failed = 0;

for (const { url, source, lang } of FEEDS) {
  try {
    const feed = await parser.parseURL(url);
    const items = feed.items.map((item) => normalizeFeedItem(item, source, lang));
    const gta = items.filter(isGtaNews).length;
    const withImage = items.filter((i) => i.image).length;
    const newest = items.map((i) => i.pubDate).filter(Boolean).sort((a, b) => b - a)[0];
    console.log(
      `OK   ${source.padEnd(15)} [${lang}] ${items.length} items, ${gta} GTA, ${withImage} con imagen, última ${newest?.toISOString().slice(0, 10) ?? 'sin fecha'}`
    );
  } catch (error) {
    failed += 1;
    console.log(`FAIL ${source.padEnd(15)} [${lang}] ${url} -> ${error.message}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
