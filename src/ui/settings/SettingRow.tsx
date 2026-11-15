import { Field, FieldDescription, FieldLabel } from '@ui-sdk/react/field';
import { useState, type ReactNode } from 'react';
import { useI18n } from '~contents/hooks/i18n';
import { ChevronRightIcon } from '../icons';
import { Badge, CollapsibleSection, RowButton, Switch } from '../primitives';
import { cx } from '../primitives/cx';
import { useUiSkin } from '../skin/useUiSkin';
import type { SettingItem } from './groupSettings';
import { reloadPage } from './reloadPage';
import { useSettingsContext, type RealtimeMode, type SettingState } from './SettingsContext';

export const ROW_PAD = 'soft:px-3 soft:py-2.5 obsidian:px-2 obsidian:py-2 native:px-4 native:py-3';
const LABEL = 'block text-[12.5px] leading-snug native:text-[15px]';
const DESCRIPTION = 'mt-0.5 block text-[11px] leading-snug text-xh-fg-2 native:text-[13px]';

const FEEDS = ['enableBnbFeeds', 'enableGossip', 'enableListing'];
const RELOAD_WHEN_OFF = new Set(['showAvatarRank', 'showTokenAnalysis']);
const REALTIME_TONE: Record<RealtimeMode, 'up' | 'accent' | 'neutral'> = {
  SSE: 'up',
  Polling: 'accent',
  Inactive: 'neutral',
};

interface SettingRowProps {
  label: ReactNode;
  description?: ReactNode;
  control: ReactNode;
  testId?: string;
  disabled?: boolean;
  indent?: boolean;
  labelled?: boolean;
}

export function SettingRow({
  label,
  description,
  control,
  testId,
  disabled = false,
  indent = false,
  labelled = false,
}: SettingRowProps) {
  const className = cx(
    'flex items-center justify-between gap-3',
    ROW_PAD,
    indent && 'soft:pl-6 obsidian:pl-5 native:pl-8',
    disabled && 'opacity-50',
  );
  if (labelled) {
    return (
      <Field className={className} data-xhunt-testid={testId}>
        <div className='min-w-0 flex-1'>
          <FieldLabel className={cx(LABEL, !disabled && 'cursor-pointer')}>{label}</FieldLabel>
          {description ? <FieldDescription className={DESCRIPTION}>{description}</FieldDescription> : null}
        </div>
        {control}
      </Field>
    );
  }
  return (
    <div className={className} data-xhunt-testid={testId}>
      <div className='min-w-0 flex-1'>
        <span className={LABEL}>{label}</span>
        {description ? <span className={DESCRIPTION}>{description}</span> : null}
      </div>
      <div className='flex shrink-0 items-center gap-1.5'>{control}</div>
    </div>
  );
}

function isLastFeed(key: string, states: Record<string, SettingState>) {
  const bnb = states.enableBnbFeeds?.get;
  const gossip = states.enableGossip?.get;
  const listing = states.enableListing?.get;
  if (key === 'enableBnbFeeds') return Boolean(bnb && !gossip);
  if (key === 'enableGossip') return Boolean(gossip && !bnb);
  if (key === 'enableListing') return Boolean(listing && !bnb && !gossip);
  return false;
}

export function SwitchSetting({
  setting,
  disabled = false,
  description,
}: {
  setting: SettingItem;
  disabled?: boolean;
  description?: ReactNode;
}) {
  const { t } = useI18n();
  const { settingStates, realtimeMode } = useSettingsContext();
  const state = settingStates[setting.key];
  if (!state) return null;
  const feed = FEEDS.includes(setting.key);
  if (feed && !settingStates.showRealtimeSubscription?.get) return null;

  const change = (checked: boolean) => {
    if (feed && !checked && FEEDS.filter((key) => key !== setting.key).every((key) => !settingStates[key]?.get)) return;
    state.set(checked);
    if (RELOAD_WHEN_OFF.has(setting.key) && !checked) reloadPage();
  };

  return (
    <SettingRow
      labelled
      indent={feed}
      disabled={disabled}
      testId={`settings-item-${setting.key}`}
      label={
        <span className='inline-flex items-center gap-1.5'>
          {t(setting.label)}
          {setting.key === 'showRealtimeSubscription' && state.get ? (
            <Badge tone={REALTIME_TONE[realtimeMode]}>{realtimeMode}</Badge>
          ) : null}
        </span>
      }
      description={description ?? (RELOAD_WHEN_OFF.has(setting.key) ? t('settingsReloadOnOff') : undefined)}
      control={
        <Switch
          checked={state.get}
          disabled={disabled || (feed && isLastFeed(setting.key, settingStates))}
          onCheckedChange={change}
          data-xhunt-testid={`settings-toggle-${setting.key}`}
        />
      }
    />
  );
}

export function DrillRow({
  label,
  summary,
  onOpen,
  testId,
}: {
  label: string;
  summary?: ReactNode;
  onOpen: () => void;
  testId?: string;
}) {
  return (
    <RowButton
      onClick={onOpen}
      data-xhunt-testid={testId}
      className={cx('gap-3 soft:rounded-xl obsidian:rounded-[9px]', ROW_PAD)}
    >
      <span className='flex min-w-0 flex-1 items-center justify-between gap-3 native:flex-col native:items-start native:gap-0.5'>
        <span className='truncate text-[12.5px] native:text-[15px]'>{label}</span>
        {summary ? (
          <span className='min-w-0 truncate text-[11.5px] text-xh-fg-2 obsidian:font-xh-mono obsidian:text-[11px] native:text-[13px]'>
            {summary}
          </span>
        ) : null}
      </span>
      <ChevronRightIcon size={14} className='shrink-0 text-xh-fg-2' />
    </RowButton>
  );
}

export function SettingsGroup({
  id,
  title,
  children,
  collapsible = true,
}: {
  id: string;
  title: string;
  children: ReactNode;
  collapsible?: boolean;
}) {
  const { skin } = useUiSkin();
  const [open, setOpen] = useState(true);
  const body = (
    <div data-settings-body='' className='flex flex-col soft:divide-y soft:divide-xh-line'>
      {children}
    </div>
  );

  if (skin === 'soft' && collapsible) {
    return (
      <CollapsibleSection
        title={title}
        open={open}
        onOpenChange={setOpen}
        testId={`settings-group-${id}`}
        triggerTestId={`settings-group-header-${id}`}
        className='xh-rise rounded-xh-card bg-xh-raised shadow-xh-card [&>.xh-collapsible-trigger]:px-3 [&>.xh-collapsible-trigger]:pb-1.5 [&>.xh-collapsible-trigger]:pt-3'
      >
        {body}
      </CollapsibleSection>
    );
  }

  if (skin === 'soft') {
    return (
      <section data-xhunt-testid={`settings-group-${id}`} className='xh-rise rounded-xh-card bg-xh-raised p-1.5 shadow-xh-card'>
        <h3 className='sr-only' data-xhunt-testid={`settings-group-header-${id}`}>
          {title}
        </h3>
        {body}
      </section>
    );
  }

  return (
    <section data-xhunt-testid={`settings-group-${id}`} className='xh-rise'>
      <h3
        data-xhunt-testid={`settings-group-header-${id}`}
        className='obsidian:px-2 obsidian:pb-1 obsidian:pt-3 obsidian:text-[11px] obsidian:font-medium obsidian:uppercase obsidian:tracking-[0.06em] obsidian:text-xh-fg-2 native:px-4 native:pb-1 native:pt-4 native:text-[20px] native:font-extrabold native:leading-6'
      >
        {title}
      </h3>
      {body}
    </section>
  );
}
