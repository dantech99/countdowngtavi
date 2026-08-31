import { describe, it, expect } from 'vitest';
import { handleWaitlistRequest } from './waitlist-http.js';
import { MEMBERS_KEY } from './waitlist.js';

function createFakeStore() {
  const sets = new Map();
  return {
    async sadd(key, member) {
      const set = sets.get(key) ?? new Set();
      sets.set(key, set);
      const before = set.size;
      set.add(member);
      return set.size - before;
    },
    async scard(key) {
      return sets.get(key)?.size ?? 0;
    },
  };
}

const URL = 'https://example.com/api/waitlist';
const VALID_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

function postRequest(body) {
  return new Request(URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });
}

describe('handleWaitlistRequest — GET', () => {
  it('returns the current count', async () => {
    const store = createFakeStore();
    await store.sadd(MEMBERS_KEY, VALID_ID);

    const res = await handleWaitlistRequest(new Request(URL), store);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ count: 1 });
  });

  // Lets Vercel's edge serve the number instead of waking a function on every
  // single page view.
  it('allows the edge to cache the number briefly', async () => {
    const res = await handleWaitlistRequest(new Request(URL), createFakeStore());
    expect(res.headers.get('cache-control')).toBe('public, s-maxage=30');
  });

  it('reports 502 when the store fails', async () => {
    const broken = {
      async sadd() { throw new Error('upstash down'); },
      async scard() { throw new Error('upstash down'); },
    };

    const res = await handleWaitlistRequest(new Request(URL), broken);

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({ error: 'upstream' });
  });
});

describe('handleWaitlistRequest — HEAD', () => {
  it('treats HEAD like GET', async () => {
    const store = createFakeStore();
    await store.sadd(MEMBERS_KEY, VALID_ID);

    const res = await handleWaitlistRequest(new Request(URL, { method: 'HEAD' }), store);

    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('public, s-maxage=30');
  });
});

describe('handleWaitlistRequest — POST', () => {
  it('joins a new member', async () => {
    const res = await handleWaitlistRequest(
      postRequest(JSON.stringify({ id: VALID_ID })),
      createFakeStore(),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ count: 1, joined: true });
  });

  it('reports joined: false when the id is already in the set', async () => {
    const store = createFakeStore();
    await handleWaitlistRequest(postRequest(JSON.stringify({ id: VALID_ID })), store);

    const res = await handleWaitlistRequest(postRequest(JSON.stringify({ id: VALID_ID })), store);

    await expect(res.json()).resolves.toEqual({ count: 1, joined: false });
  });

  it('rejects malformed JSON', async () => {
    const res = await handleWaitlistRequest(postRequest('{ not json'), createFakeStore());

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'invalid_id' });
  });

  it('rejects a body without an id', async () => {
    const res = await handleWaitlistRequest(postRequest(JSON.stringify({})), createFakeStore());
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'invalid_id' });
  });

  it('rejects an id that is not a v4 UUID', async () => {
    const res = await handleWaitlistRequest(
      postRequest(JSON.stringify({ id: 'not-a-uuid' })),
      createFakeStore(),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'invalid_id' });
  });

  it('rejects a body that parses to a non-object', async () => {
    for (const raw of ['null', '[]']) {
      const res = await handleWaitlistRequest(postRequest(raw), createFakeStore());
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({ error: 'invalid_id' });
    }
  });

  it('rejects an oversized body', async () => {
    const res = await handleWaitlistRequest(
      postRequest(JSON.stringify({ id: VALID_ID, padding: 'x'.repeat(2000) })),
      createFakeStore(),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'invalid_id' });
  });

  // Checked before the body is read at all, so an obviously oversized upload
  // never gets buffered into memory first.
  it('rejects an oversized body based on Content-Length alone', async () => {
    const res = await handleWaitlistRequest(
      new Request(URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': '999999' },
        body: JSON.stringify({ id: VALID_ID }),
      }),
      createFakeStore(),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'invalid_id' });
  });

  // A truncated or aborted body stream must surface as the documented 400,
  // not as an unhandled rejection that Astro turns into an opaque 500.
  it('rejects a request whose body read fails', async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.error(new Error('client aborted the upload'));
      },
    });

    const res = await handleWaitlistRequest(
      new Request(URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        duplex: 'half',
      }),
      createFakeStore(),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'invalid_id' });
  });
});

describe('handleWaitlistRequest — other cases', () => {
  it('rejects unsupported methods', async () => {
    const res = await handleWaitlistRequest(new Request(URL, { method: 'DELETE' }), createFakeStore());

    expect(res.status).toBe(405);
    await expect(res.json()).resolves.toEqual({ error: 'method_not_allowed' });
  });

  // A clone without credentials must answer honestly instead of crashing.
  it('reports 503 when no store is configured', async () => {
    const res = await handleWaitlistRequest(new Request(URL), null);

    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toEqual({ error: 'unavailable' });
  });
});
