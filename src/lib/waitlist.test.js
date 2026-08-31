import { describe, it, expect } from 'vitest';
import { isValidMemberId, getCount, joinWaitlist, formatCount, MEMBERS_KEY } from './waitlist.js';

// Mirrors the two Redis commands the real store provides, including SADD's
// return value: the number of members actually added, which is what makes
// deduplication a single atomic call instead of a read followed by a write.
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

const VALID_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('isValidMemberId', () => {
  it('accepts a v4 UUID', () => {
    expect(isValidMemberId(VALID_ID)).toBe(true);
  });

  it('rejects a UUID of a different version', () => {
    expect(isValidMemberId('3f2504e0-4f89-11d3-9a0c-0305e82c3301')).toBe(false);
  });

  it('rejects arbitrary strings', () => {
    expect(isValidMemberId('not-a-uuid')).toBe(false);
    expect(isValidMemberId('')).toBe(false);
  });

  it('rejects values that are not strings', () => {
    expect(isValidMemberId(undefined)).toBe(false);
    expect(isValidMemberId(null)).toBe(false);
    expect(isValidMemberId(42)).toBe(false);
  });
});

describe('getCount', () => {
  it('returns zero for an empty store', async () => {
    await expect(getCount(createFakeStore())).resolves.toBe(0);
  });

  it('reads the members key', async () => {
    const store = createFakeStore();
    await store.sadd(MEMBERS_KEY, VALID_ID);
    await expect(getCount(store)).resolves.toBe(1);
  });
});

describe('joinWaitlist', () => {
  it('adds a new member and reports the join', async () => {
    const store = createFakeStore();
    await expect(joinWaitlist(store, VALID_ID)).resolves.toEqual({ count: 1, joined: true });
  });

  // The whole design rests on this: a visitor who clicks twice, reloads, or
  // retries a failed request must never inflate the public number.
  it('does not count the same id twice', async () => {
    const store = createFakeStore();
    await joinWaitlist(store, VALID_ID);
    await expect(joinWaitlist(store, VALID_ID)).resolves.toEqual({ count: 1, joined: false });
  });

  it('counts distinct ids separately', async () => {
    const store = createFakeStore();
    await joinWaitlist(store, VALID_ID);
    await joinWaitlist(store, '9c858901-8a57-4791-81fe-4c455b099bc9');
    await expect(getCount(store)).resolves.toBe(2);
  });

  it('rejects an invalid id without touching the store', async () => {
    const store = createFakeStore();
    await expect(joinWaitlist(store, 'not-a-uuid')).rejects.toThrow('invalid_id');
    await expect(getCount(store)).resolves.toBe(0);
  });
});

describe('formatCount', () => {
  it('uses the singular for one member', () => {
    expect(formatCount(1)).toEqual({ value: '1', label: 'persona ya se sumó' });
  });

  it('uses the plural for zero and for many', () => {
    expect(formatCount(0)).toEqual({ value: '0', label: 'personas ya se sumaron' });
    expect(formatCount(2)).toEqual({ value: '2', label: 'personas ya se sumaron' });
  });

  // es-CO groups thousands with a period, not a comma.
  it('groups thousands the Colombian way', () => {
    expect(formatCount(1247).value).toBe('1.247');
  });
});
