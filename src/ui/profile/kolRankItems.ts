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

  if (isEnabled(ai ? 'showFqRankAi' : 'showFqRank')) {
    stats.push({
      key: 'rankGlobal',
      rankType: 'followers',
      label: t('rankStatGlobal'),
      value: rankValue(ai ? kf.kolRank20WAi : kf.kolRank20W, ai ? 50_000 : 200_000),
      change: dayOne(ai ? kf.kolRankChangeAi : kf.kolRankChange),
    });
  }
  if (lang === 'zh') {
    if (isEnabled(ai ? 'showCnRankAi' : 'showCnRank') && kf.isCn) {
      stats.push({
        key: 'rankCn',
        rankType: 'chinese',
        label: t('rankStatCn'),
        value: rankValue(ai ? kf.kolCnRankAi : kf.kolCnRank, ai ? 3000 : Number(t('kolCnRankTotal')) || 10_000),
        change: dayOne(ai ? kf.kolCnRankChangeAi : kf.kolCnRankChange),
      });
    }
  } else if (isEnabled(ai ? 'showEnInfluenceRankAi' : 'showEnInfluenceRank') && (ai ? kf.kolGlobalRankAi : kf.kolGlobalRank)) {
    stats.push({
      key: 'rankEn',
      rankType: 'english',
      label: t('rankStatEn'),
      value: rankValue(ai ? kf.kolGlobalRankAi : kf.kolGlobalRank, Number(t('kolEnRankTotal')) || 10_000),
      change: dayOne(ai ? kf.kolGlobalRankChangeAi : kf.kolGlobalRankChange),
    });
  }
  if (isEnabled(ai ? 'showProjectRankAi' : 'showProjectRank') && kf.isProject) {
    stats.push({
      key: 'rankProject',
      rankType: 'project',
      label: t('rankStatProject'),
      value: rankValue(ai ? kf.kolProjectRankAi : kf.kolProjectRank, Number(t('kolProjectRankTotal')) || 10_000),
      change: dayOne(ai ? kf.kolProjectRankChangeAi : kf.kolProjectRankChange),
    });
  }
  return stats;
}
