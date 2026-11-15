import { describe, expect, test } from 'vitest';
import { buildKolStats, buildRankStats, formatUpperCase } from './kolRankItems';

const totals: Record<string, string> = { kolCnRankTotal: '10000', kolEnRankTotal: '10000', kolProjectRankTotal: '10000' };
const t = (key: string) => totals[key] ?? key;
const on = () => true;
const KF = {
  globalKolFollowersCount: 1200,
  topKolFollowersCount: 86,
  cnKolFollowersCount: 312,
  globalKolFollowersCountAi: 450,
  topKolFollowersCountAi: 0,
  cnKolFollowersCountAi: 40,
  kolRank20W: 1234,
  kolRankChange: { day1: 12, day7: 30 },
  kolRank20WAi: 0,
  kolRankChangeAi: { day1: -3 },
  kolCnRank: 56,
  kolCnRankChange: { day1: 3 },
  kolCnRankAi: 4200,
  kolGlobalRank: 812,
  kolGlobalRankChange: { day1: 0 },
  kolProjectRank: 25000,
  isCn: true,
  isProject: false,
};

describe('buildKolStats', () => {
  test('lists the web3 follower counts in order with their tabs', () => {
    expect(buildKolStats({ t, isEnabled: on, domain: 'web3', kolFollow: KF })).toEqual([
      { key: 'kolGlobal', tab: 'global', value: '1.2K', label: 'kolStatFollowers' },
      { key: 'kolTop100', tab: 'top100', value: '86', label: 'kolStatTop100' },
      { key: 'kolCn', tab: 'cn', value: '312', label: 'kolStatCn' },
    ]);
  });

  test('uses the AI fields and settings, and drops zero counts or disabled items', () => {
    const stats = buildKolStats({ t, isEnabled: (key) => key !== 'showCnKolsAi', domain: 'ai', kolFollow: KF });
    expect(stats.map((stat) => [stat.key, stat.value])).toEqual([['kolGlobal', '450']]);
  });
});

describe('buildRankStats', () => {
  test('a zh profile shows global and Chinese ranks with day-1 changes', () => {
    expect(buildRankStats({ t, lang: 'zh', isEnabled: on, domain: 'web3', kolFollow: KF })).toEqual([
      { key: 'rankGlobal', rankType: 'followers', label: 'rankStatGlobal', value: '#1,234', change: 12 },
      { key: 'rankCn', rankType: 'chinese', label: 'rankStatCn', value: '#56', change: 3 },
    ]);
  });

  test('an English interface shows the English rank instead of the Chinese one', () => {
    const keys = buildRankStats({ t, lang: 'en', isEnabled: on, domain: 'web3', kolFollow: KF }).map((stat) => stat.key);
    expect(keys).toEqual(['rankGlobal', 'rankEn']);
  });

  test('unranked or over-total ranks show the population, per domain', () => {
    const ai = buildRankStats({ t, lang: 'zh', isEnabled: on, domain: 'ai', kolFollow: KF });
    expect(ai.find((stat) => stat.key === 'rankGlobal')).toMatchObject({ value: '>50K', change: -3 });
    expect(ai.find((stat) => stat.key === 'rankCn')?.value).toBe('>3K');
    const project = buildRankStats({ t, lang: 'zh', isEnabled: on, domain: 'web3', kolFollow: { ...KF, isProject: true } });
    expect(project.find((stat) => stat.key === 'rankProject')?.value).toBe('>10K');
    const unranked = buildRankStats({ t, lang: 'zh', isEnabled: on, domain: 'web3', kolFollow: { kolRank20W: 0 } });
    expect(unranked).toEqual([{ key: 'rankGlobal', rankType: 'followers', label: 'rankStatGlobal', value: '>200K', change: 0 }]);
  });

  test('settings and account flags gate each rank', () => {
    const off = new Set(['showFqRank', 'showProjectRank']);
    const stats = buildRankStats({
      t,
      lang: 'zh',
      isEnabled: (key) => !off.has(key),
      domain: 'web3',
      kolFollow: { ...KF, isCn: false, isProject: true },
    });
    expect(stats).toEqual([]);
  });
});

test('formatUpperCase writes thousands with a capital K', () => {
  expect(formatUpperCase(10000)).toBe('10K');
  expect(formatUpperCase(200000)).toBe('200K');
});
