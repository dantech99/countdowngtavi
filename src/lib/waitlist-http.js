import { getCount, isValidMemberId, joinWaitlist } from './waitlist.js';

// Enough room for the JSON envelope around a UUID and nothing else. The real
// payload cap is Vercel's; this only keeps an obviously bogus body from
// reaching JSON.parse.
const MAX_BODY_CHARS = 1024;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

async function handleGet(store) {
  try {
    const count = await getCount(store);
    return json({ count }, 200, { 'cache-control': 'public, s-maxage=30' });
  } catch {
    return json({ error: 'upstream' }, 502);
  }
}

async function handlePost(request, store) {
  const raw = await request.text();
  if (raw.length > MAX_BODY_CHARS) {
    return json({ error: 'invalid_id' }, 400);
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'invalid_id' }, 400);
  }

  if (!isValidMemberId(body?.id)) {
    return json({ error: 'invalid_id' }, 400);
  }

  try {
    return json(await joinWaitlist(store, body.id));
  } catch {
    return json({ error: 'upstream' }, 502);
  }
}

export async function handleWaitlistRequest(request, store) {
  if (!store) {
    return json({ error: 'unavailable' }, 503);
  }

  if (request.method === 'GET') {
    return await handleGet(store);
  }

  if (request.method === 'POST') {
    return await handlePost(request, store);
  }

  return json({ error: 'method_not_allowed' }, 405);
}
