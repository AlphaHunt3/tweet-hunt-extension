import { formatUpperCase } from '../kolRankItems';

const DATE_ONLY = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/;
const pad = (n: number) => String(n).padStart(2, '0');

export function parseDay(value: unknown): Date | null {
  if (value == null || value === '') return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value.trim()))) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    // 接口里既有秒也有毫秒
    const date = new Date(n < 1e12 ? n * 1000 : n);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const match = DATE_ONLY.exec(text);
  if (match) {
    // 纯日期按本地日期解析，new Date('2026-11-01') 会按 UTC 解析，西半球会差一天
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDay(value: unknown, lang: string): string | null {
  const date = parseDay(value);
  if (!date) return null;
  if (lang === 'zh') return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

export function formatShortDay(value: unknown, lang: string, now: Date = new Date()): string | null {
  const date = parseDay(value);
  if (!date) return null;
  if (date.getFullYear() !== now.getFullYear()) return formatDay(date, lang);
  if (lang === 'zh') return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

const oneDecimal = (n: number) => String(Math.round(n * 10) / 10);

export function formatTotal(total: number, lang: string): string {
  if (lang === 'zh') {
    if (total >= 10_000) return `${oneDecimal(total / 10_000)} 万`;
    if (total >= 1000) return `${oneDecimal(total / 1000)} 千`;
    return String(total);
  }
  return formatUpperCase(total);
}

export function formatRank(rank: number): string {
  return `#${rank.toLocaleString('en-US')}`;
}

export function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
