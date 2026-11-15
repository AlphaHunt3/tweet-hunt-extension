import { useState, type ReactNode } from 'react';
import { useI18n } from '~contents/hooks/i18n';
import { useUserDomain } from '~contents/hooks/useUserDomain';
import { BellIcon, CloseIcon, GripIcon, LogoIcon, MinimizeIcon, SlidersIcon } from '../icons';
import { Avatar, Badge, IconButton, SearchField, TabList, TabPanel, Tabs } from '../primitives';
import { cx } from '../primitives/cx';
import { GuideBubble } from './GuideBubble';
import { HOME_VIEWS, type HomeView } from './panelNav';
import { usePanelControls, type GuideKey, type PanelControls } from './usePanelControls';
import { usePanelHomeView } from './usePanelHomeView';

type RankChange = Partial<Record<'day1' | 'day7' | 'day30', number>> | undefined;

export function formatRank(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? `#${n.toLocaleString('en-US')}` : '—';
}

export function formatCount(value: unknown) {
  const n = Number(value);
  if (value == null || !Number.isFinite(n)) return '—';
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n);
}

export function rankDelta(change: RankChange) {
  const n = Number(change?.day7);
  if (!Number.isFinite(n) || n === 0) return null;
  return n > 0 ? { text: `↑${n}`, tone: 'up' as const } : { text: `↓${Math.abs(n)}`, tone: 'down' as const };
}

const VIEW_LABEL: Record<HomeView, string> = {
  overview: 'homeViewOverview',
  followers: 'homeViewFollowers',
  portrait: 'homeViewPortrait',
  reviews: 'homeViewReviews',
};

interface HomeChromeProps {
  userId: string;
  twInfo: any;
  onClose?: () => void;
  children: (view: HomeView) => ReactNode;
}

export function HomeChrome({ userId, twInfo, onClose, children }: HomeChromeProps) {
  const { t } = useI18n();
  const { skin, view, setView } = usePanelHomeView();
  const controls = usePanelControls(onClose);
  const items = HOME_VIEWS[skin].map((value) => ({ value, label: t(VIEW_LABEL[value]) }));
  const body = (
    <div className='custom-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden obsidian:px-3 obsidian:pb-3'>
      {children(view)}
    </div>
  );

  if (skin === 'obsidian') {
    return (
      <>
        <ObsidianTopBar controls={controls} />
        <div className='px-3 pb-2.5'>
          <Identity userId={userId} twInfo={twInfo} showRanks={false} />
        </div>
        {body}
      </>
    );
  }

  return (
    <Tabs
      value={view}
      onValueChange={setView}
      variant={skin === 'native' ? 'underline' : 'segmented'}
      className='flex min-h-0 flex-1 flex-col soft:gap-2'
    >
      {skin === 'native' ? (
        <NativeModuleHeader userId={userId} controls={controls} />
      ) : (
        <>
          <SoftTopBar controls={controls} />
          <div className='rounded-xh-card bg-xh-raised p-3 shadow-xh-card'>
            <Identity userId={userId} twInfo={twInfo} showRanks />
          </div>
        </>
      )}
      <TabList aria-label={t('panelSectionsLabel')} items={items} />
      <TabPanel value={view} className='flex min-h-0 flex-1 flex-col'>
        {body}
      </TabPanel>
    </Tabs>
  );
}

function Guided({ controls, guide, children }: { controls: PanelControls; guide: GuideKey; children: ReactNode }) {
  return (
    <span className='relative inline-flex'>
      {children}
      {controls.activeGuide === guide ? (
        <GuideBubble text={controls.guideText[guide]} onDismiss={() => controls.dismissGuide(guide)} />
      ) : null}
    </span>
  );
}

function ControlButtons({ controls, iconSize }: { controls: PanelControls; iconSize: number }) {
  const { t } = useI18n();
  return (
    <>
      <Guided controls={controls} guide='messages'>
        <IconButton
          label={controls.hasUnread ? t('messagesUnread') : t('messages')}
          dot={controls.hasUnread}
          onClick={controls.openMessages}
          data-xhunt-testid='panel-messages-button'
        >
          <BellIcon size={iconSize} />
        </IconButton>
      </Guided>
      <Guided controls={controls} guide='settings'>
        <IconButton label={t('settings')} onClick={controls.openSettings} data-xhunt-testid='panel-settings-button'>
          <SlidersIcon size={iconSize} />
        </IconButton>
      </Guided>
      <Guided controls={controls} guide='drag'>
        <IconButton
          label={t('panelDrag')}
          className='tw-hunt-drag-handle cursor-grab'
          onClick={() => controls.dismissGuide('drag')}
        >
          <GripIcon size={iconSize} />
        </IconButton>
      </Guided>
      {controls.hide ? (
        <Guided controls={controls} guide='panel'>
          <IconButton
            label={controls.hideLabel}
            onClick={() => {
              controls.dismissGuide('panel');
              controls.hide?.();
            }}
            data-xhunt-testid={controls.persistent ? 'panel-minimize-button' : 'panel-close-button'}
          >
            {controls.persistent ? <MinimizeIcon size={iconSize} /> : <CloseIcon size={iconSize} />}
          </IconButton>
        </Guided>
      ) : null}
    </>
  );
}

function SoftTopBar({ controls }: { controls: PanelControls }) {
  return (
    <div className='flex h-9 items-center justify-between pl-1.5 pr-0.5'>
      <span className='tw-hunt-drag-handle flex cursor-grab items-center gap-2 text-[13px] font-semibold tracking-[-0.01em]'>
        <span className='grid size-[22px] place-items-center rounded-[7px] bg-xh-fg text-xh-canvas'>
          <LogoIcon size={14} />
        </span>
        XHunt
      </span>
      <span className='flex items-center gap-0.5'>
        <ControlButtons controls={controls} iconSize={16} />
      </span>
    </div>
  );
}

function ObsidianTopBar({ controls }: { controls: PanelControls }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  return (
    <div className='flex items-center gap-1 px-3 pb-2 pt-2.5'>
      <SearchField
        aria-label={t('panelSearchLabel')}
        placeholder={t('panelSearchPlaceholder')}
        value={query}
        onValueChange={setQuery}
        onSubmit={(value) => {
          if (value.trim()) {
            window.location.assign(`https://x.com/search?q=${encodeURIComponent(value.trim())}&src=typed_query`);
          }
        }}
        className='flex-1'
      />
      <IconButton
        label={t('panelDrag')}
        className='tw-hunt-drag-handle cursor-grab'
        onClick={() => controls.dismissGuide('drag')}
      >
        <GripIcon />
      </IconButton>
      {!controls.persistent && controls.hide ? (
        <IconButton label={controls.hideLabel} onClick={controls.hide} data-xhunt-testid='panel-close-button'>
          <CloseIcon />
        </IconButton>
      ) : null}
    </div>
  );
}

function NativeModuleHeader({ userId, controls }: { userId: string; controls: PanelControls }) {
  const { primaryDomain } = useUserDomain();
  return (
    <div className='flex items-start justify-between gap-2 pb-1.5 pl-4 pr-3 pt-3'>
      <div className='tw-hunt-drag-handle min-w-0 cursor-grab'>
        <h2 className='flex items-center gap-2 text-[20px] font-extrabold leading-[1.2] tracking-[-0.01em]'>
          XHunt
          <Badge>{primaryDomain === 'ai' ? 'AI' : 'Web3'}</Badge>
        </h2>
        <p className='mt-px truncate text-[13px] text-xh-fg-2'>{userId ? `@${userId}` : 'XHunt'}</p>
      </div>
      <span className='flex items-center gap-0.5'>
        <ControlButtons controls={controls} iconSize={18} />
      </span>
    </div>
  );
}

function Identity({ userId, twInfo, showRanks }: { userId: string; twInfo: any; showRanks: boolean }) {
  const { t } = useI18n();
  const { primaryDomain } = useUserDomain();
  const kol = twInfo?.kolFollow ?? {};
  const ai = primaryDomain === 'ai';
  const ranks = [
    {
      label: t('panelGlobalInfluence'),
      value: formatRank(kol[ai ? 'kolGlobalRankAi' : 'kolGlobalRank']),
      delta: rankDelta(kol[ai ? 'kolGlobalRankChangeAi' : 'kolGlobalRankChange']),
    },
    {
      label: t('panelCnInfluence'),
      value: formatRank(kol[ai ? 'kolCnRankAi' : 'kolCnRank']),
      delta: rankDelta(kol[ai ? 'kolCnRankChangeAi' : 'kolCnRankChange']),
    },
    {
      label: t('panelKolFollowers'),
      value: formatCount(kol[ai ? 'globalKolFollowersCountAi' : 'globalKolFollowersCount']),
      delta: null,
    },
  ];
  return (
    <>
      <div className='flex items-center gap-2.5'>
        <Avatar name={userId || 'XHunt'} />
        <div className='flex min-w-0 items-center gap-1.5 text-[15px] font-semibold leading-[1.2] tracking-[-0.015em]'>
          <span className='truncate'>@{userId}</span>
          {twInfo?.basicInfo?.isKol ? <Badge>KOL</Badge> : null}
        </div>
      </div>
      {showRanks ? (
        <dl className='mt-3 grid grid-cols-3 gap-1.5'>
          {ranks.map((rank) => (
            <div key={rank.label} className='flex flex-col gap-px rounded-xl bg-xh-canvas px-[9px] py-[7px]'>
              <dt className='truncate text-[11px] text-xh-fg-2'>{rank.label}</dt>
              <dd className='flex items-baseline gap-1 text-[15px] font-semibold tabular-nums tracking-[-0.02em]'>
                {rank.value}
                {rank.delta ? (
                  <em
                    className={cx(
                      'text-[10.5px] font-semibold not-italic',
                      rank.delta.tone === 'up' ? 'text-xh-up' : 'text-xh-down',
                    )}
                  >
                    {rank.delta.text}
                  </em>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </>
  );
}
