import { useI18n } from '~contents/hooks/i18n';
import { Avatar } from '~/ui/primitives/Avatar';
import { useUiSkin } from '~/ui/skin/useUiSkin';
import { useProfileIdentity } from '../profileIdentity';
import { DetailCard, DetailNote, DetailSection, XHuntCredit } from './DetailCard';
import { formatShortDay, toNumber } from './format';
import { MeterRow, MeterRows } from './MeterRow';
import { RadarChart } from './RadarChart';

export interface SoulData {
  score?: number | string | null;
  profile_analysis?: number | null;
  content_analysis?: number | null;
  engagement_analysis?: number | null;
  xhunt_analysis?: number | null;
  kol_interaction?: number | null;
  reason?: string | null;
  reason_en?: string | null;
  last_updated?: string | number | null;
}

export type SoulTone = 'up' | 'warn' | 'down';

export function soulLevel(score: number): { tone: SoulTone; key: string } {
  if (score >= 80) return { tone: 'up', key: 'soulLevelExcellent' };
  if (score >= 60) return { tone: 'warn', key: 'soulLevelGood' };
  return { tone: 'down', key: 'soulLevelLow' };
}

export function pickReason(data: SoulData, lang: string) {
  const zh = data.reason?.trim();
  const en = data.reason_en?.trim();
  return (lang === 'en' ? en || zh : zh || en) || '';
}

const AXES = [
  { key: 'profile_analysis', meter: 'soulAxisAccount', radar: 'soulRadarAccount', hint: 'accountAnalysisInfo' },
  { key: 'content_analysis', meter: 'soulAxisContent', radar: 'soulRadarContent', hint: 'contentAnalysisInfo' },
  { key: 'engagement_analysis', meter: 'soulAxisEngagement', radar: 'soulRadarEngagement', hint: 'engagementAnalysisInfo' },
  { key: 'xhunt_analysis', meter: 'soulAxisRank', radar: 'soulRadarRank', hint: 'xhuntAnalysisInfo' },
  { key: 'kol_interaction', meter: 'soulAxisKol', radar: 'soulRadarKol', hint: 'kolInteractionInfo' },
] as const;

export function SoulCard({ data, handle }: { data: SoulData; handle: string }) {
  const { t, lang } = useI18n();
  const { skin } = useUiSkin();
  const identity = useProfileIdentity(handle);
  const score = toNumber(data.score);
  const level = score == null ? null : soulLevel(score);
  const values = AXES.map((axis) => toNumber(data[axis.key]));
  const reason = pickReason(data, lang);
  const updated = formatShortDay(data.last_updated, lang);
  const basis = updated ? `${t('soulCardBasis')} · ${t('detailUpdated').replace('{date}', updated)}` : t('soulCardBasis');
  const shownScore = score == null ? '—' : Math.round(score);
  const avatar = <Avatar name={identity.displayName} src={identity.avatar} size='md' />;
  const levelText = level ? (
    <span className='xh-dscore-level' data-tone={level.tone}>
      {t(level.key)}
    </span>
  ) : null;

  const meters = (
    <MeterRows>
      {AXES.map((axis, index) => (
        <MeterRow key={axis.key} label={t(axis.meter)} value={values[index]} hint={t(axis.hint)} />
      ))}
    </MeterRows>
  );
  const analysis = reason ? (
    <DetailSection>
      <DetailNote label={skin === 'native' ? undefined : t('analysisReason')}>{reason}</DetailNote>
    </DetailSection>
  ) : null;

  if (skin === 'native') {
    return (
      <DetailCard
        className='xh-soul'
        header={
          <>
            <div className='xh-dcard-titles'>
              <p className='xh-dscore-label'>{t('soulIndex')}</p>
              <p className='xh-dscore'>
                {shownScore} {levelText}
              </p>
            </div>
            {avatar}
          </>
        }
        footer={basis}
        footerEnd={<XHuntCredit />}
      >
        <DetailSection>{meters}</DetailSection>
        {analysis}
      </DetailCard>
    );
  }

  return (
    <DetailCard
      className='xh-soul'
      avatar={avatar}
      title={identity.displayName}
      subtitle={`@${handle}`}
      aside={
        skin === 'obsidian' ? (
          <>
            <span className='xh-dscore-label'>{t('soulIndex')}</span>
            <span className='xh-dscore-row'>
              {level ? (
                <span className='xh-dpill' data-tone={level.tone}>
                  {t(level.key)}
                </span>
              ) : null}
              <span className='xh-dscore'>{shownScore}</span>
            </span>
          </>
        ) : (
          <>
            <span className='xh-dscore-label'>
              {t('soulIndex')}
              {levelText ? ' · ' : null}
              {levelText}
            </span>
            <span className='xh-dscore'>
              {shownScore}
              <small>{t('points')}</small>
            </span>
          </>
        )
      }
      footer={basis}
      footerEnd={<XHuntCredit />}
    >
      <DetailSection className='xh-dsplit'>
        <RadarChart
          lang={lang}
          label={t('soulRadarLabel')}
          axes={AXES.map((axis, index) => ({ key: axis.key, label: t(axis.radar), value: values[index] ?? 0 }))}
        />
        {meters}
      </DetailSection>
      {analysis}
    </DetailCard>
  );
}
