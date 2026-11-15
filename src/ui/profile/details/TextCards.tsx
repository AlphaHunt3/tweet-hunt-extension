import { useI18n } from '~contents/hooks/i18n';
import { PencilIcon, PortraitIcon, SparkleIcon } from '~/ui/icons';
import { DetailCard, DetailEmpty, DetailNote, DetailSection } from './DetailCard';
import { formatDay, parseDay, toNumber } from './format';

export interface MbtiData {
  mbti?: string | null;
  keyword?: string[] | null;
  explanation?: string | null;
}

export function MbtiCard({ data }: { data: MbtiData | null | undefined }) {
  const { t } = useI18n();
  const type = data?.mbti?.trim();
  const keywords = Array.isArray(data?.keyword) ? data.keyword.filter((word) => typeof word === 'string' && word.trim()) : [];
  const explanation = data?.explanation?.trim();
  const empty = !type && !keywords.length && !explanation;
  return (
    <DetailCard
      className='xh-mbti'
      icon={<PortraitIcon />}
      title={t('personalityType')}
      aside={type ? <span className='xh-dscore xh-mbti-type'>{type}</span> : null}
      footer={empty ? null : t('mbtiFooter')}
    >
      {empty ? (
        <DetailEmpty>{t('noData')}</DetailEmpty>
      ) : (
        <>
          {keywords.length ? (
            <ul className='xh-dchips'>
              {keywords.map((word, index) => (
                <li key={`${index}-${word}`} className='xh-dchip'>
                  {word}
                </li>
              ))}
            </ul>
          ) : null}
          {explanation ? <DetailNote>{explanation}</DetailNote> : null}
        </>
      )}
    </DetailCard>
  );
}

export interface NameHistory {
  screen_names?: Record<string, (string | number | null | undefined)[] | null> | null;
}

export interface RenameRow {
  handle: string;
  range: string;
  current: boolean;
}

export function renameRows(data: NameHistory | null | undefined, handle: string, lang: string): RenameRow[] {
  const rows = Object.entries(data?.screen_names ?? {}).map(([name, dates]) => ({
    name,
    start: parseDay(dates?.[0]),
    end: parseDay(dates?.[1]),
  }));
  rows.sort((a, b) => (b.start?.getTime() ?? -Infinity) - (a.start?.getTime() ?? -Infinity));
  return rows.map((row) => ({
    handle: row.name,
    range: `${formatDay(row.start, lang) ?? '—'} – ${formatDay(row.end, lang) ?? '—'}`,
    current: row.name.toLowerCase() === handle.toLowerCase(),
  }));
}

export function RenameCard({ data, handle }: { data: NameHistory | null | undefined; handle: string }) {
  const { t, lang } = useI18n();
  const rows = renameRows(data, handle, lang);
  return (
    <DetailCard
      className='xh-renames-card'
      icon={<PencilIcon />}
      title={t('nameHistory')}
      subtitle={rows.length > 1 ? t('renameTimes').replace('{count}', String(rows.length - 1)) : undefined}
    >
      {rows.length ? (
        <ol className='xh-renames'>
          {rows.map((row) => (
            <li key={row.handle} className='xh-rename'>
              <span className='xh-rename-handle'>
                @{row.handle}
                {row.current ? <span className='xh-dpill'>{t('currentName')}</span> : null}
              </span>
              <span className='xh-rename-range'>{row.range}</span>
            </li>
          ))}
        </ol>
      ) : (
        <DetailEmpty>{t('noData')}</DetailEmpty>
      )}
    </DetailCard>
  );
}

export interface DiscussionPeriod {
  positivePercentage?: number | string | null;
  negativePercentage?: number | string | null;
  positiveBulletPoints?: string[] | null;
  negativeBulletPoints?: string[] | null;
}

export interface DiscussionInput {
  symbol?: string | null;
  discussion1dCn?: DiscussionPeriod | null;
  discussion1dEn?: DiscussionPeriod | null;
  discussion7dCn?: DiscussionPeriod | null;
  discussion7dEn?: DiscussionPeriod | null;
}

export function pickDiscussion(data: DiscussionInput | null | undefined, period: '1d' | '7d', lang: string) {
  if (!data) return null;
  const zh = lang === 'zh';
  if (period === '1d') return (zh ? data.discussion1dCn : data.discussion1dEn) ?? null;
  return (zh ? data.discussion7dCn : data.discussion7dEn) ?? null;
}

export function share(value: unknown): number | null {
  const n = toNumber(value);
  return n == null ? null : Math.min(Math.max(n, 0), 100);
}

const percentText = (n: number | null) => (n == null ? '—' : `${Math.round(n * 10) / 10}%`);
const points = (list: unknown) => (Array.isArray(list) ? list.filter((p): p is string => typeof p === 'string' && !!p.trim()) : []);

export function DiscussionCard({
  data,
  period,
  loading,
}: {
  data: DiscussionInput | null | undefined;
  period: '1d' | '7d';
  loading?: boolean;
}) {
  const { t, lang } = useI18n();
  const current = pickDiscussion(data, period, lang);
  const positive = share(current?.positivePercentage);
  const negative = share(current?.negativePercentage);
  const good = points(current?.positiveBulletPoints);
  const bad = points(current?.negativeBulletPoints);
  const symbol = data?.symbol?.trim();

  let body;
  if (loading) body = <DetailEmpty>{t('loading')}</DetailEmpty>;
  else if (!current) body = <DetailEmpty>{t('noData')}</DetailEmpty>;
  else
    body = (
      <>
        <DetailSection>
          <span className='xh-senti-bar' aria-hidden='true'>
            <b data-tone='up' style={{ width: `${positive ?? 0}%` }} />
            <b data-tone='down' style={{ width: `${negative ?? 0}%` }} />
          </span>
          <span className='xh-senti-legend'>
            <span data-tone='up'>
              {percentText(positive)} {t('positive')}
            </span>
            <span data-tone='down'>
              {percentText(negative)} {t('negative')}
            </span>
          </span>
        </DetailSection>
        {good.length ? (
          <DetailSection title={t('positivePoints')}>
            <ul className='xh-dlist' data-tone='up'>
              {good.map((point, index) => (
                <li key={`${index}-${point}`}>{point}</li>
              ))}
            </ul>
          </DetailSection>
        ) : null}
        {bad.length ? (
          <DetailSection title={t('negativePoints')}>
            <ul className='xh-dlist' data-tone='down'>
              {bad.map((point, index) => (
                <li key={`${index}-${point}`}>{point}</li>
              ))}
            </ul>
          </DetailSection>
        ) : null}
      </>
    );

  return (
    <DetailCard
      className='xh-discussion'
      icon={<SparkleIcon />}
      title={t(period === '1d' ? 'discussion1d' : 'discussion7d')}
      subtitle={symbol ? `$${symbol}` : undefined}
    >
      {body}
    </DetailCard>
  );
}
