import { useState, type ReactNode } from 'react';
import { useI18n } from '~contents/hooks/i18n';
import { ChevronDownIcon, LogoIcon } from '../icons';
import { cx } from '../primitives/cx';
import { createPopoverController, Popover, PopoverContent, PopoverTrigger } from '../primitives/Popover';
import { useUiSkin } from '../skin/useUiSkin';
import { insightSummary, WIDE_INSIGHTS, type InsightItem, type InsightKey } from './insightItems';

export interface ProfileInsightsProps {
  items: InsightItem[];
  loading: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  renderDetail: (key: InsightKey) => ReactNode;
  onOpenItem?: (key: InsightKey) => void;
  narrative?: ReactNode;
}

export function ProfileInsights({
  items,
  loading,
  expanded,
  onExpandedChange,
  renderDetail,
  onOpenItem,
  narrative,
}: ProfileInsightsProps) {
  const { t } = useI18n();
  const { skin } = useUiSkin();
  const [controller] = useState(() => createPopoverController<InsightKey>());
  const [activeKey, setActiveKey] = useState<InsightKey | null>(null);

  if (loading) {
    return (
      <div className='xh-insight-skeleton' aria-hidden='true'>
        <span className='xh-skeleton' />
        <span className='xh-skeleton' />
        <span className='xh-skeleton' />
      </div>
    );
  }
  if (items.length === 0) return <>{narrative}</>;

  const activeItem = items.find((item) => item.key === activeKey);
  const toggle = expanded ? (
    <button
      type='button'
      className='xh-insight-toggle'
      data-xhunt-testid='profile-insights-collapse-button'
      aria-expanded
      onClick={() => onExpandedChange(false)}
    >
      {t('collapse')}
      {skin === 'soft' && <ChevronDownIcon size={12} className='xh-insight-chevron' />}
    </button>
  ) : (
    <button
      type='button'
      className='xh-insight-toggle'
      data-xhunt-testid='profile-insights-expand-button'
      aria-expanded={false}
      onClick={() => onExpandedChange(true)}
    >
      {t('profileInsightsMore')}
      {skin === 'soft' && <ChevronDownIcon size={12} />}
    </button>
  );

  const trigger = (item: InsightItem) => (
    <PopoverTrigger
      key={item.key}
      controller={controller}
      payload={item.key}
      className={cx(
        skin === 'soft' && 'xh-itile',
        skin === 'obsidian' && 'xh-chip',
        skin === 'native' && 'xh-inline-item',
      )}
      data-key={item.key}
      data-xhunt-testid={`profile-insight-${item.key}`}
    >
      {skin === 'soft' && (
        <>
          <span className='xh-itile-label'>{item.longLabel}</span>
          <b className='xh-itile-value' data-tone={item.tone} data-long={item.long ? '' : undefined}>
            {item.value}
            {item.unit && <small className='xh-itile-unit'>{item.unit}</small>}
          </b>
        </>
      )}
      {skin === 'obsidian' && (
        <>
          {item.key === 'soul' && <span className='xh-chip-dot' aria-hidden='true' />}
          {item.label}
          <b data-tone={item.tone} data-long={item.long ? '' : undefined}>
            {item.value}
          </b>
        </>
      )}
      {skin === 'native' && (
        <>
          <b data-tone={item.key === 'return90' ? item.tone : undefined}>{item.value}</b>
          {item.label}
        </>
      )}
    </PopoverTrigger>
  );

  const popover = (
    <Popover
      controller={controller}
      openOnHover
      delay={300}
      closeDelay={150}
      onPayloadChange={(payload) => {
        const key = (payload as InsightKey | undefined) ?? null;
        setActiveKey(key);
        if (key) onOpenItem?.(key);
      }}
    >
      <PopoverContent
        align='start'
        className='xh-detail-pop'
        data-size={activeKey && WIDE_INSIGHTS.includes(activeKey) ? 'lg' : 'md'}
        aria-label={activeItem?.label}
      >
        {(state: { payload?: unknown }) => (state.payload ? renderDetail(state.payload as InsightKey) : null)}
      </PopoverContent>
    </Popover>
  );

  if (skin === 'soft') {
    return (
      <section className='xh-insight' aria-label={t('insightsTitle')}>
        <div className='xh-insight-head'>
          <span className='xh-insight-mark' aria-hidden='true'>
            <LogoIcon size={12} />
          </span>
          <b>{t('insightsTitle')}</b>
          {expanded ? (
            <span>· {t('insightsSubtitle')}</span>
          ) : (
            <span className='xh-insight-summary'>{insightSummary(items)}</span>
          )}
          {toggle}
        </div>
        {expanded && <div className='xh-itiles'>{items.map(trigger)}</div>}
        {narrative}
        {popover}
      </section>
    );
  }

  return (
    <>
      {expanded ? (
        <div className={skin === 'obsidian' ? 'xh-chips' : 'xh-inline'} role='group' aria-label={t('insightsTitle')}>
          {skin === 'native' && (
            <span className='xh-inline-mark' aria-hidden='true'>
              <LogoIcon size={14} strokeWidth={2} />
            </span>
          )}
          {items.map(trigger)}
          {toggle}
        </div>
      ) : (
        <div className='xh-insight-collapsed'>
          <span className='xh-insight-summary'>{insightSummary(items)}</span>
          {toggle}
        </div>
      )}
      {narrative}
      {popover}
    </>
  );
}
