export function normalizeFeedItem(item, source) {
  return {
    title: item.title ?? '',
    link: item.link ?? '',
    pubDate: item.pubDate ? new Date(item.pubDate) : null,
    source,
  };
}

export async function fetchFeed(url, source, parseFn) {
  const feed = await parseFn(url);
  return feed.items.map((item) => normalizeFeedItem(item, source));
}

export async function fetchAllFeeds(feeds, parseFn) {
  const results = await Promise.allSettled(
    feeds.map(({ url, source }) => fetchFeed(url, source, parseFn))
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
