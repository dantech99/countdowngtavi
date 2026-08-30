import { describe, it, expect } from 'vitest';
import { getTimeRemaining } from './countdown.js';

describe('getTimeRemaining', () => {
  it('computes days/hours/minutes/seconds for a future date', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const target = new Date('2026-01-03T01:02:03Z');
    expect(getTimeRemaining(target, now)).toEqual({
      days: 2,
      hours: 1,
      minutes: 2,
      seconds: 3,
    });
  });

  it('returns all zeros once the target date has passed', () => {
    const now = new Date('2026-12-01T00:00:00Z');
    const target = new Date('2026-11-19T00:00:00Z');
    expect(getTimeRemaining(target, now)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it('returns all zeros exactly at the target date', () => {
    const now = new Date('2026-11-19T00:00:00Z');
    const target = new Date('2026-11-19T00:00:00Z');
    expect(getTimeRemaining(target, now)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });

  it('accepts a date string for targetDate', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    expect(getTimeRemaining('2026-01-02T00:00:00Z', now)).toEqual({
      days: 1,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });
});
