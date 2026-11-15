import { Fragment, useState, type ReactNode } from 'react';
import { useI18n } from '~contents/hooks/i18n';
import { SwapIcon, UsersIcon } from '../icons';
import { createPopoverController, Popover, PopoverContent, PopoverTrigger } from '../primitives/Popover';
import { SegmentedControl } from '../primitives/SegmentedControl';
import { useUiSkin } from '../skin/useUiSkin';
import type { KolStat, KolStatKey, RankDomain, RankStat, RankStatKey } from './kolRankItems';

export type KolRowKey = KolStatKey | RankStatKey;

export interface ProfileKolRowProps {
  kolStats: KolStat[];
  rankStats: RankStat[];
  domain: RankDomain;
  canSwitch: boolean;
  onDomainChange: (domain: RankDomain) => void;
  renderDetail: (key: KolRowKey) => ReactNode;
}

function Delta({ change, className }: { change: number; className: string }) {
  if (!change) return null;
  return (
    <>
      {' '}
      <span className={className} data-tone={change > 0 ? 'up' : 'down'}>
        {change > 0 ? '↑' : '↓'}
        {Math.abs(change)}
      </span>
    </>
  );
}

export function ProfileKolRow({ kolStats, rankStats, domain, canSwitch, onDomainChange, renderDetail }: ProfileKolRowProps) {
  const { t } = useI18n();
  const { skin } = useUiSkin();
  const [controller] = useState(() => createPopoverController<KolRowKey>());
  const [activeLabel, setActiveLabel] = useState<string>();

  if (kolStats.length === 0 && rankStats.length === 0 && !canSwitch) return null;

  const labelOf = (key: KolRowKey) =>
    kolStats.find((stat) => stat.key === key)?.label ?? rankStats.find((stat) => stat.key === key)?.label;
  const domainName = (value: RankDomain) => (value === 'web3' ? t('domainWeb3') : t('domainAi'));
  const other: RankDomain = domain === 'web3' ? 'ai' : 'web3';

  const segmented = canSwitch && (
    <SegmentedControl
      size='sm'
      value={domain}
      onValueChange={onDomainChange}
      aria-label={t('rankDomainLabel')}
      options={[
        { value: 'web3', label: t('domainWeb3') },
        { value: 'ai', label: t('domainAi') },
      ]}
      className='xh-stats-seg'
    />
  );

  const popover = (
    <Popover
      controller={controller}
      openOnHover
      delay={300}
      closeDelay={150}
      onPayloadChange={(payload) => setActiveLabel(payload ? labelOf(payload as KolRowKey) : undefined)}
    >
      <PopoverContent align='start' className='xh-detail-pop' data-size='md' aria-label={activeLabel}>
        {(state: { payload?: unknown }) => (state.payload ? renderDetail(state.payload as KolRowKey) : null)}
      </PopoverContent>
    </Popover>
  );

  if (skin === 'native') {
    return (
      <div className='xh-kol-inline'>
        {kolStats.map((stat) => (
          <PopoverTrigger
            key={stat.key}
            controller={controller}
            payload={stat.key}
            className='xh-inline-item'
            data-xhunt-testid={`profile-stat-${stat.key}`}
          >
            <b>{stat.value}</b> {stat.label}
          </PopoverTrigger>
        ))}
        {rankStats.map((stat) => (
          <PopoverTrigger
            key={stat.key}
            controller={controller}
            payload={stat.key}
            className='xh-inline-item'
            data-xhunt-testid={`profile-stat-${stat.key}`}
          >
            <b>{stat.value}</b> {stat.label}
            <Delta change={stat.change} className='xh-delta-text' />
          </PopoverTrigger>
        ))}
        {canSwitch && (
          <button
            type='button'
            className='xh-domain-toggle'
            aria-label={t('switchToDomainRank').replace('{domain}', domainName(other))}
            onClick={() => onDomainChange(other)}
          >
            {domainName(domain)}
            <SwapIcon size={14} />
          </button>
        )}
        {popover}
      </div>
    );
  }

  const soft = skin === 'soft';
  return (
    <div className={soft ? 'xh-stats' : 'xh-stats xh-chips'}>
      {kolStats.length > 0 && (
        <PopoverTrigger
          controller={controller}
          payload={kolStats[0].key}
          className={soft ? 'xh-statpill' : 'xh-chip'}
          data-xhunt-testid='profile-stat-kol'
        >
          {soft && <UsersIcon size={14} />}
          {kolStats.map((stat, index) => (
            <Fragment key={stat.key}>
              {index > 0 &&
                (soft ? (
                  <i className='xh-statpill-sep' aria-hidden='true' />
                ) : (
                  <span className='xh-chip-sep' aria-hidden='true'>
                    /
                  </span>
                ))}
              {soft ? (
                <>
                  <b>{stat.value}</b> {stat.label}
                </>
              ) : (
                <>
                  {stat.label} <b>{stat.value}</b>
                </>
              )}
            </Fragment>
          ))}
        </PopoverTrigger>
      )}
      {rankStats.map((stat) => (
        <PopoverTrigger
          key={stat.key}
          controller={controller}
          payload={stat.key}
          className={soft ? 'xh-statpill' : 'xh-chip'}
          data-xhunt-testid={`profile-stat-${stat.key}`}
        >
          {stat.label} <b>{stat.value}</b>
          <Delta change={stat.change} className={soft ? 'xh-delta-text' : 'xh-delta'} />
        </PopoverTrigger>
      ))}
      {segmented}
      {popover}
    </div>
  );
}
