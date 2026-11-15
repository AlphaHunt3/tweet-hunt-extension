import { useI18n } from '~contents/hooks/i18n';
import { TrophyIcon } from '~/ui/icons';
import { rankSource, type RankType } from '../kolRankItems';
import { DetailCard } from './DetailCard';
import { formatRank, formatTotal, toNumber } from './format';

const TITLE: Record<RankType, string> = {
  followers: 'rankStatGlobal',
  chinese: 'rankTitleCn',
  english: 'rankTitleEn',
  project: 'rankTitleProject',
};
const NOTE: Record<RankType, string> = {
  followers: 'globalInfluenceRankTooltip',
  chinese: 'chineseInfluenceRankTooltip',
  english: 'englishInfluenceRankTooltip',
  project: 'projectInfluenceRankTooltip',
};
const PERIODS = [
  { key: 'day1', label: 'rankChange1d' },
  { key: 'day7', label: 'rankChange7d' },
  { key: 'day30', label: 'rankChange30d' },
] as const;

export interface RankChange {
  key: (typeof PERIODS)[number]['key'];
  label: string;
  text: string;
  tone?: 'up' | 'down';
}

export interface RankDetail {
  title: string;
  value: string;
  ranked: boolean;
  sample: string;
  changes: RankChange[];
  note: string;
}

export function buildRankDetail({
  t,
  lang,
  kolFollow,
  rankType,
  ai,
}: {
  t: (key: string) => string;
  lang: string;
  kolFollow: any;
  rankType: RankType;
  ai: boolean;
}): RankDetail {
  const source = rankSource(kolFollow, rankType, ai, t);
  const rank = toNumber(source.rank);
  const ranked = rank != null && rank > 0;
  const value = !ranked
    ? t('rankUnranked')
    : rank > source.total
      ? `>${formatTotal(source.total, lang)}`
      : formatRank(rank);
  return {
    title: t(TITLE[rankType]),
    value,
    ranked,
    sample: t('rankSampleOf').replace('{total}', formatTotal(source.total, lang)),
    changes: PERIODS.map(({ key, label }) => {
      const change = toNumber(source.change?.[key]);
      if (change == null) return { key, label: t(label), text: '—' };
      if (change === 0) return { key, label: t(label), text: '0' };
      return { key, label: t(label), text: `${change > 0 ? '↑' : '↓'}${Math.abs(change).toLocaleString('en-US')}`, tone: change > 0 ? 'up' : 'down' };
    }),
    note: t(NOTE[rankType]),
  };
}

export function RankCard({ kolFollow, rankType, ai }: { kolFollow: any; rankType: RankType; ai: boolean }) {
  const { t, lang } = useI18n();
  const detail = buildRankDetail({ t, lang, kolFollow, rankType, ai });
  return (
    <DetailCard
      className='xh-rank'
      icon={<TrophyIcon />}
      title={detail.title}
      subtitle={detail.sample}
      aside={
        <span className='xh-dscore' data-unranked={detail.ranked ? undefined : ''}>
          {detail.value}
        </span>
      }
      footer={detail.note}
    >
      <div>
        {detail.changes.map((change) => (
          <div key={change.key} className='xh-kv'>
            <span className='xh-kv-label'>{change.label}</span>
            <span className='xh-kv-value' data-tone={change.tone}>
              {change.text}
            </span>
          </div>
        ))}
      </div>
    </DetailCard>
  );
}
