import { useI18n } from '~contents/hooks/i18n';
import { SparkleIcon, TrendIcon } from '~/ui/icons';
import { DetailCard, DetailEmpty } from './DetailCard';
import { toNumber } from './format';

const MAX_CHIPS = 30;
const EMPHASIS = 3;

export function formatRatio(value: unknown, signed = false): string {
  const n = toNumber(value);
  if (n == null) return '—';
  const text = `${(Math.abs(n) * 100).toFixed(1)}%`;
  if (n < 0) return `-${text}`;
  return signed && n > 0 ? `+${text}` : text;
}

const toneOf = (value: unknown) => {
  const n = toNumber(value);
  if (n == null || n === 0) return undefined;
  return n > 0 ? 'up' : 'down';
};

export interface TokenPeriod {
  tokenMentions?: unknown[] | null;
  winRate?: number | null;
  winRatePct?: number | null;
  maxProfitAvg?: number | null;
  maxProfitAvgPct?: number | null;
  nowProfitAvg?: number | null;
  nowProfitAvgPct?: number | null;
}

export function TokenReturnCard({ period }: { period: TokenPeriod | null | undefined }) {
  const { t } = useI18n();
  const top = (value: unknown) => (toNumber(value) == null ? null : t('tokenTopPct').replace('{pct}', formatRatio(value)));
  const rows = [
    { key: 'win', label: t('tokenWinRate'), value: formatRatio(period?.winRate), tone: undefined, top: top(period?.winRatePct) },
    {
      key: 'max',
      label: t('tokenAvgMaxProfit'),
      value: formatRatio(period?.maxProfitAvg, true),
      tone: toneOf(period?.maxProfitAvg),
      top: top(period?.maxProfitAvgPct),
    },
    {
      key: 'now',
      label: t('tokenAvgNowProfit'),
      value: formatRatio(period?.nowProfitAvg, true),
      tone: toneOf(period?.nowProfitAvg),
      top: top(period?.nowProfitAvgPct),
    },
  ];
  return (
    <DetailCard
      className='xh-token-return'
      icon={<TrendIcon />}
      title={t('insightReturn90')}
      subtitle={t('tokenAvgMaxProfit')}
      aside={
        <span className='xh-dscore' data-tone={toneOf(period?.maxProfitAvg)}>
          {formatRatio(period?.maxProfitAvg, true)}
        </span>
      }
      footer={t('tokenReturnBasis')}
    >
      <div>
        {rows.map((row) => (
          <div key={row.key} className='xh-kv'>
            <span className='xh-kv-label'>{row.label}</span>
            <span>
              <span className='xh-kv-value' data-tone={row.tone}>
                {row.value}
              </span>
              {row.top ? <span className='xh-kv-hint'>{row.top}</span> : null}
            </span>
          </div>
        ))}
      </div>
    </DetailCard>
  );
}

export interface TokenChip {
  symbol: string;
  count: number;
}

export function tokenChips(mentions: unknown[] | null | undefined): TokenChip[] {
  if (!Array.isArray(mentions)) return [];
  return mentions
    .map((item: any) => ({
      symbol: String(item?.symbol || item?.token || item?.text || '').trim(),
      count: toNumber(item?.mentionCount ?? item?.value) ?? 1,
    }))
    .filter((chip) => chip.symbol)
    .sort((a, b) => b.count - a.count);
}

export function TokenMentionsCard({ period }: { period: TokenPeriod | null | undefined }) {
  const { t } = useI18n();
  const chips = tokenChips(period?.tokenMentions);
  const shown = chips.slice(0, MAX_CHIPS);
  return (
    <DetailCard
      className='xh-token-mentions'
      icon={<SparkleIcon />}
      title={t('insightMentionsLong')}
      subtitle={chips.length ? t('tokenCount').replace('{count}', String(chips.length)) : undefined}
    >
      {shown.length ? (
        <ul className='xh-dchips'>
          {shown.map((chip, index) => (
            <li key={chip.symbol} className='xh-dchip' data-emphasis={index < EMPHASIS ? '' : undefined}>
              {chip.symbol}
              <span className='xh-dchip-count'>{chip.count}</span>
            </li>
          ))}
          {chips.length > MAX_CHIPS ? <li className='xh-dchip'>+{chips.length - MAX_CHIPS}</li> : null}
        </ul>
      ) : (
        <DetailEmpty>{t('noData')}</DetailEmpty>
      )}
    </DetailCard>
  );
}
