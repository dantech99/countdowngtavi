const IMG_TAG_PATTERN = /<img[^>]+src=["']([^"']+)["']/i;
const THUMB_WIDTH = 800;

function isImageMedia(attrs) {
  if (attrs.medium && attrs.medium !== 'image') return false;
  if (attrs.type && !String(attrs.type).startsWith('image/')) return false;
  return true;
}

function firstMediaUrl(media) {
  const entries = Array.isArray(media) ? media : [media];
  for (const entry of entries) {
    const attrs = entry?.$ ?? entry ?? {};
    if (!isImageMedia(attrs)) continue;
    const url = attrs.url;
    if (typeof url === 'string' && url !== '') return url;
  }
  return null;
}

// Feeds hand out thumbnails sized for a list view (GameSpot ships 300px wide),
// which is too small for a masonry card, but their CDNs take the width straight
// from the query string — so ask for a bigger render of the same asset.
export function upsizeThumbnail(url) {
  return url.replace(/([?&](?:w|width)=)(\d+)/gi, (match, prefix, value) =>
    Number(value) < THUMB_WIDTH ? `${prefix}${THUMB_WIDTH}` : match
  );
}

// Feeds advertise thumbnails in several incompatible ways, so probe every
// shape we have seen in the wild and fall back to scraping the HTML body.
export function extractImage(item) {
  const enclosure = item?.enclosure;
  if (enclosure?.url && (enclosure.type ?? 'image/').startsWith('image/')) {
    return upsizeThumbnail(enclosure.url);
  }

  const media =
    firstMediaUrl(item?.['media:content'] ?? item?.mediaContent) ??
    firstMediaUrl(item?.['media:thumbnail'] ?? item?.mediaThumbnail);
  if (media) return upsizeThumbnail(media);

  const html = item?.['content:encoded'] ?? item?.contentEncoded ?? item?.content ?? '';
  const match = typeof html === 'string' ? html.match(IMG_TAG_PATTERN) : null;
  return match ? upsizeThumbnail(match[1]) : null;
}

// rss-parser hands categories back as strings, but some feeds ship objects
// (`{ _: 'GTA 6', $: {...} }`), so coerce defensively.
function normalizeCategories(categories) {
  if (!Array.isArray(categories)) return [];
  return categories
    .map((category) => (typeof category === 'string' ? category : category?._ ?? ''))
    .filter((category) => category !== '');
}

export function normalizeFeedItem(item, source, lang) {
  return {
    title: item.title ?? '',
    link: item.link ?? '',
    pubDate: item.pubDate ? new Date(item.pubDate) : null,
    source,
    lang,
    image: extractImage(item),
    description: item.contentSnippet ?? '',
    categories: normalizeCategories(item.categories),
  };
}

export async function fetchFeed(url, source, parseFn, lang) {
  const feed = await parseFn(url);
  return feed.items.map((item) => normalizeFeedItem(item, source, lang));
}

export async function fetchAllFeeds(feeds, parseFn) {
  const results = await Promise.allSettled(
    feeds.map(({ url, source, lang }) => fetchFeed(url, source, parseFn, lang))
  );

  const items = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      items.push(...result.value);
    } else {
      const { url } = feeds[index];
      console.warn(`[rss] skipping feed "${url}": ${result.reason?.message ?? result.reason}`);
    }
  });
  return items;
}
