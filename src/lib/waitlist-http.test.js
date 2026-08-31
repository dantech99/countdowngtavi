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
  });

  it('rejects an id that is not a v4 UUID', async () => {
    const res = await handleWaitlistRequest(
      postRequest(JSON.stringify({ id: 'not-a-uuid' })),
      createFakeStore(),
    );
    expect(res.status).toBe(400);
  });

  it('rejects an oversized body', async () => {
    const res = await handleWaitlistRequest(
      postRequest(JSON.stringify({ id: VALID_ID, padding: 'x'.repeat(2000) })),
      createFakeStore(),
    );
    expect(res.status).toBe(400);
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
