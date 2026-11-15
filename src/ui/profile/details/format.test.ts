import { describe, expect, it } from 'vitest';
import { formatDay, formatRank, formatShortDay, formatTotal, formatTweetTime, parseDay, toNumber } from './format';

describe('parseDay', () => {
  it('reads date-only strings as local dates', () => {
    const date = parseDay('2026-11-01');
    expect([date?.getFullYear(), date?.getMonth(), date?.getDate()]).toEqual([2026, 10, 1]);
    expect(parseDay('2026/1/5')?.getDate()).toBe(5);
  });

  it('treats small numbers as seconds and large ones as milliseconds', () => {
    const ms = new Date(2026, 10, 1, 12).getTime();
    expect(parseDay(ms / 1000)?.getTime()).toBe(ms);
    expect(parseDay(ms)?.getTime()).toBe(ms);
    expect(parseDay(String(ms))?.getTime()).toBe(ms);
  });

  it('returns null for missing or invalid values', () => {
    expect(parseDay(undefined)).toBeNull();
    expect(parseDay('')).toBeNull();
    expect(parseDay('not a date')).toBeNull();
    expect(parseDay(0)).toBeNull();
  });
});

describe('formatDay', () => {
  it('formats by interface language', () => {
    expect(formatDay('2026-11-01', 'zh')).toBe('2026/11/01');
    expect(formatDay('2026-11-01', 'en')).toBe('Nov 1, 2026');
    expect(formatDay('garbage', 'zh')).toBeNull();
  });

  it('drops the year for dates in the current year', () => {
    const now = new Date(2026, 11, 31);
    expect(formatShortDay('2026-11-12', 'zh', now)).toBe('11/12');
    expect(formatShortDay('2026-11-12', 'en', now)).toBe('Nov 12');
    expect(formatShortDay('2025-11-12', 'zh', now)).toBe('2025/11/12');
  });
});

describe('formatTotal and formatRank', () => {
  it('uses 万 and 千 in Chinese and K in English', () => {
    expect(formatTotal(200_000, 'zh')).toBe('20 万');
    expect(formatTotal(15_000, 'zh')).toBe('1.5 万');
    expect(formatTotal(3000, 'zh')).toBe('3 千');
    expect(formatTotal(200_000, 'en')).toBe('200K');
  });

  it('adds thousands separators to ranks', () => {
    expect(formatRank(1234)).toBe('#1,234');
    expect(formatRank(56)).toBe('#56');
  });

  it('converts only finite numbers', () => {
    expect(toNumber('12.5')).toBe(12.5);
    expect(toNumber(0)).toBe(0);
    expect(toNumber(null)).toBeNull();
    expect(toNumber('abc')).toBeNull();
  });
});

describe('formatTweetTime', () => {
  const now = new Date(2026, 10, 15, 18, 0);

  it('shows the time for posts from the last 24 hours', () => {
    expect(formatTweetTime(new Date(2026, 10, 15, 14, 5).getTime(), 'zh', now)).toBe('14:05');
    expect(formatTweetTime(new Date(2026, 10, 15, 14, 5).getTime() / 1000, 'en', now)).toBe('2:05 PM');
  });

  it('falls back to the short date for older posts', () => {
    expect(formatTweetTime('2026-11-03', 'zh', now)).toBe('11/03');
    expect(formatTweetTime('2025-11-03', 'en', now)).toBe('Nov 3, 2025');
    expect(formatTweetTime(undefined, 'en', now)).toBeNull();
  });
});
