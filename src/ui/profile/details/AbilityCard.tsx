import { useI18n } from '~contents/hooks/i18n';
import type { AbilityModelData } from '~/utils/abilityModel';
import { Avatar } from '~/ui/primitives/Avatar';
import { SegmentedControl, type SegmentedOption } from '~/ui/primitives/SegmentedControl';
import { useUiSkin } from '~/ui/skin/useUiSkin';
import { useProfileIdentity } from '../profileIdentity';
import { DetailCard, DetailNote, DetailSection, XHuntCredit } from './DetailCard';
import { formatShortDay } from './format';
import { MeterRow, MeterRows } from './MeterRow';
import { RadarChart } from './RadarChart';

export type AbilityDomain = 'web3' | 'ai';

const RADAR_MIN = 3;
const RADAR_MAX = 8;

export function abilityEntries(data: AbilityModelData) {
  return data.abilities.map((item, index) => {
    const name = Object.keys(item ?? {})[0] || `#${index + 1}`;
    const score = Number((item as Record<string, unknown>)?.[name]);
    return {
      key: `${index}-${name}`,
      name,
      score: Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0,
    };
  });
}

export interface AbilityCardProps {
  handle: string;
  web3: AbilityModelData;
  ai: AbilityModelData;
  domain: AbilityDomain;
  onDomainChange: (domain: AbilityDomain) => void;
}

export function AbilityCard({ handle, web3, ai, domain, onDomainChange }: AbilityCardProps) {
  const { t, lang } = useI18n();
  const { skin } = useUiSkin();
  const identity = useProfileIdentity(handle);
  const available = { web3: web3.abilities.length > 0, ai: ai.abilities.length > 0 };
  const current: AbilityDomain = available[domain] ? domain : domain === 'ai' ? 'web3' : 'ai';
  const data = current === 'ai' ? ai : web3;
  const entries = abilityEntries(data);
  const canSwitch = available.web3 && available.ai;
  const domainLabel = t(current === 'ai' ? 'domainAi' : 'domainWeb3');
  const updated = formatShortDay(data.updateTime, lang);
  const basis = updated
    ? `${t('abilityCardBasis')} · ${t('detailUpdated').replace('{date}', updated)}`
    : t('abilityCardBasis');
  const summary = data.summary?.trim();
  const showRadar = skin !== 'native' && entries.length >= RADAR_MIN;
  const options: readonly SegmentedOption<AbilityDomain>[] = [
    { value: 'web3', label: t('domainWeb3') },
    { value: 'ai', label: t('domainAi') },
  ];

  const switcher = canSwitch ? (
    <SegmentedControl
      size='sm'
      aria-label={t('abilityDomainLabel')}
      value={current}
      onValueChange={onDomainChange}
      options={options}
    />
  ) : null;

  const body = (
    <>
      <DetailSection className={showRadar ? 'xh-dsplit' : undefined}>
        {showRadar ? (
          <RadarChart
            lang={lang}
            label={t('abilityRadarLabel')}
            axes={entries.slice(0, RADAR_MAX).map((entry) => ({ key: entry.key, label: entry.name, value: entry.score }))}
          />
        ) : null}
        <MeterRows>
          {entries.map((entry) => (
            <MeterRow key={entry.key} label={entry.name} value={entry.score} hint={entry.name} />
          ))}
        </MeterRows>
      </DetailSection>
      {summary ? (
        <DetailSection>
          <DetailNote label={skin === 'native' ? undefined : t('abilityAnalysis')}>{summary}</DetailNote>
        </DetailSection>
      ) : null}
    </>
  );

  if (skin === 'native') {
    return (
      <DetailCard
        className='xh-ability'
        title={t('kolAbilityModel')}
        subtitle={canSwitch ? undefined : domainLabel}
        aside={switcher}
        footer={basis}
        footerEnd={<XHuntCredit />}
      >
        {body}
      </DetailCard>
    );
  }

  return (
    <DetailCard
      className='xh-ability'
      avatar={<Avatar name={identity.displayName} src={identity.avatar} size='md' />}
      title={identity.displayName}
      subtitle={`@${handle}`}
      aside={
        <>
          <span className='xh-dscore-label'>{t('kolAbilityModel')}</span>
          {switcher ?? <span className='xh-dpill'>{domainLabel}</span>}
        </>
      }
      footer={basis}
      footerEnd={<XHuntCredit />}
    >
      {body}
    </DetailCard>
  );
}
