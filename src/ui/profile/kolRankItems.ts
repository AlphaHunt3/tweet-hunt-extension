import numeral from 'numeral';
import { formatNumber } from '~contents/utils';

export type RankDomain = 'web3' | 'ai';
export type KolTab = 'global' | 'top100' | 'cn';
export type RankType = 'followers' | 'chinese' | 'english' | 'project';
export type KolStatKey = 'kolGlobal' | 'kolTop100' | 'kolCn';
export type RankStatKey = 'rankGlobal' | 'rankCn' | 'rankEn' | 'rankProject';

export interface KolStat {
  key: KolStatKey;
  tab: KolTab;
  value: string;
  label: string;
}

export interface RankStat {
  key: RankStatKey;
  rankType: RankType;
  label: string;
  value: string;
  change: number;
}

interface StatsInput {
  t: (key: string) => string;
  isEnabled: (key: string) => boolean;
  domain: RankDomain;
  // 资料数据的类型在公开仓库里是 any
  kolFollow: any;
}

export function formatUpperCase(num: number) {
  return numeral(Number(num))
    .format('0,0a')
    .replace(/([kmt])/i, (_, c: string) => c.toUpperCase());
}

function rankValue(rank: unknown, total: number) {
  const n = Number(rank || 0);
  return !n || n <= 0 || n > total ? `>${formatUpperCase(total)}` : `#${numeral(n).format('0,0')}`;
}

export interface RankSource {
  rank: unknown;
  change: Partial<Record<'day1' | 'day7' | 'day30', number>> | null | undefined;
  total: number;
}

export function rankSource(kolFollow: any, rankType: RankType, ai: boolean, t: (key: string) => string): RankSource {
  const kf = kolFollow || {};
  switch (rankType) {
    case 'followers':
      return { rank: ai ? kf.kolRank20WAi : kf.kolRank20W, change: ai ? kf.kolRankChangeAi : kf.kolRankChange, total: ai ? 50_000 : 200_000 };
    case 'chinese':
      return {
        rank: ai ? kf.kolCnRankAi : kf.kolCnRank,
        change: ai ? kf.kolCnRankChangeAi : kf.kolCnRankChange,
        total: ai ? 3000 : Number(t('kolCnRankTotal')) || 10_000,
      };
    case 'english':
      return {
        rank: ai ? kf.kolGlobalRankAi : kf.kolGlobalRank,
        change: ai ? kf.kolGlobalRankChangeAi : kf.kolGlobalRankChange,
        total: Number(t('kolEnRankTotal')) || 10_000,
      };
    case 'project':
      return {
        rank: ai ? kf.kolProjectRankAi : kf.kolProjectRank,
        change: ai ? kf.kolProjectRankChangeAi : kf.kolProjectRankChange,
        total: Number(t('kolProjectRankTotal')) || 10_000,
      };
  }
}

const dayOne = (change: { day1?: number } | undefined | null) => Number(change?.day1 || 0);

export function buildKolStats({ t, isEnabled, domain, kolFollow }: StatsInput): KolStat[] {
  const ai = domain === 'ai';
  const suffix = ai ? 'Ai' : '';
  const defs: Array<{ key: KolStatKey; tab: KolTab; setting: string; field: string; label: string }> = [
    {
      key: 'kolGlobal',
      tab: 'global',
      setting: ai ? 'showAiKolFollowers' : 'showWeb3KolFollowers',
      field: `globalKolFollowersCount${suffix}`,
      label: 'kolStatFollowers',
    },
    {
      key: 'kolTop100',
      tab: 'top100',
      setting: ai ? 'showTop100KolsAi' : 'showTop100KolsWeb3',
      field: `topKolFollowersCount${suffix}`,
      label: 'kolStatTop100',
    },
    {
      key: 'kolCn',
      tab: 'cn',
      setting: ai ? 'showCnKolsAi' : 'showCnKolsWeb3',
      field: `cnKolFollowersCount${suffix}`,
      label: 'kolStatCn',
    },
  ];
  return defs
    .filter((def) => isEnabled(def.setting) && Number(kolFollow?.[def.field] || 0) > 0)
    .map((def) => ({
      key: def.key,
      tab: def.tab,
      value: formatNumber(Number(kolFollow[def.field])),
      label: t(def.label),
    }));
}

export function buildRankStats({ t, lang, isEnabled, domain, kolFollow }: StatsInput & { lang: string }): RankStat[] {
  const kf = kolFollow || {};
  const ai = domain === 'ai';
  const stats: RankStat[] = [];
  const push = (key: RankStatKey, rankType: RankType, label: string) => {
    const source = rankSource(kf, rankType, ai, t);
    stats.push({ key, rankType, label, value: rankValue(source.rank, source.total), change: dayOne(source.change) });
  };

  if (isEnabled(ai ? 'showFqRankAi' : 'showFqRank')) push('rankGlobal', 'followers', t('rankStatGlobal'));
  if (lang === 'zh') {
    if (isEnabled(ai ? 'showCnRankAi' : 'showCnRank') && kf.isCn) push('rankCn', 'chinese', t('rankStatCn'));
  } else if (isEnabled(ai ? 'showEnInfluenceRankAi' : 'showEnInfluenceRank') && (ai ? kf.kolGlobalRankAi : kf.kolGlobalRank)) {
    push('rankEn', 'english', t('rankStatEn'));
  }
  if (isEnabled(ai ? 'showProjectRankAi' : 'showProjectRank') && kf.isProject) push('rankProject', 'project', t('rankStatProject'));
  return stats;
}
