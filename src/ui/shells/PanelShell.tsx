import type { ReactNode } from 'react';
import { useNavigation } from '~/compontents/navigation/PanelNavigator';
import { useI18n } from '~contents/hooks/i18n';
import {
  BellIcon,
  LogoIcon,
  OverviewIcon,
  PortraitIcon,
  SidebarIcon,
  SlidersIcon,
  StarIcon,
  UsersIcon,
} from '../icons';
import { Button, IconButton, TabList, TabPanel, Tabs } from '../primitives';
import { cx } from '../primitives/cx';
import { useUiSkin } from '../skin/useUiSkin';
import { GuideBubble } from './GuideBubble';
import { destinationOf, type PanelDestination } from './panelNav';
import { usePanelControls } from './usePanelControls';
import { usePanelHomeView } from './usePanelHomeView';

export interface PanelShellProps {
  collapsed: boolean;
  onRestore: () => void;
  onClose?: () => void;
  notice?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function PanelShell(props: PanelShellProps) {
  const { skin } = useUiSkin();
  return skin === 'obsidian' ? <RailShell {...props} /> : <CardShell {...props} />;
}

function CardShell({ notice, footer, children }: PanelShellProps) {
  return (
    <div
      className={cx(
        'flex max-h-[calc(90vh-32px)] flex-col overflow-hidden bg-xh-canvas font-xh-ui text-xh-fg',
        'soft:gap-2 soft:rounded-[24px] soft:p-2 soft:text-[13px] soft:leading-[1.45] soft:shadow-xh-panel',
        'native:rounded-2xl native:text-[15px] native:leading-[1.35] native:shadow-xh-pop',
      )}
    >
      {notice}
      <div className='flex min-h-0 flex-1 flex-col'>{children}</div>
      {footer}
    </div>
  );
}

function RailShell({ collapsed, onRestore, onClose, notice, footer, children }: PanelShellProps) {
  const { t } = useI18n();
  const { currentRoute, navigateTo } = useNavigation();
  const { view, setView } = usePanelHomeView();
  const controls = usePanelControls(onClose);
  const destination = destinationOf(currentRoute, view);

  const go = (next: PanelDestination) => {
    if (collapsed) onRestore();
    if (next === 'messages') return controls.openMessages();
    if (next === 'settings') return controls.openSettings();
    setView(next);
    navigateTo('/home');
  };

  const items = [
    { value: 'overview', label: t('homeViewOverview'), icon: <OverviewIcon size={18} /> },
    { value: 'followers', label: t('homeViewFollowers'), icon: <UsersIcon size={18} /> },
    { value: 'portrait', label: t('homeViewPortrait'), icon: <PortraitIcon size={18} /> },
    { value: 'reviews', label: t('homeViewReviews'), icon: <StarIcon size={18} /> },
    {
      value: 'messages',
      label: controls.hasUnread ? t('messagesUnread') : t('messages'),
      icon: <BellIcon size={18} />,
      dot: controls.hasUnread,
      testId: 'panel-messages-button',
    },
    {
      value: 'settings',
      label: t('settings'),
      icon: <SlidersIcon size={18} />,
      spaceBefore: true,
      testId: 'panel-settings-button',
    },
  ] as const;

  return (
    <Tabs
      value={destination}
      onValueChange={go}
      variant='rail'
      className='flex max-h-[calc(90vh-32px)] overflow-hidden rounded-[18px] bg-xh-canvas font-xh-ui text-[13px] leading-[1.45] text-xh-fg shadow-xh-panel'
    >
      <div
        className={cx(
          'flex w-12 shrink-0 flex-col items-center gap-1 border-r bg-[var(--xh-rail)] py-2.5',
          collapsed ? 'border-transparent' : 'border-xh-line',
        )}
      >
        <span className='tw-hunt-drag-handle mb-2.5 grid size-[30px] cursor-grab place-items-center rounded-[9px] bg-xh-fg text-xh-canvas'>
          <LogoIcon size={14} />
        </span>
        <TabList aria-label={t('panelNavLabel')} items={items} className='min-h-0 flex-1' />
        {controls.persistent ? (
          <IconButton
            label={collapsed ? t('panelExpand') : t('panelCollapse')}
            onClick={collapsed ? onRestore : controls.hide}
            data-xhunt-testid='panel-minimize-button'
          >
            <SidebarIcon size={18} />
          </IconButton>
        ) : null}
      </div>
      <TabPanel value={destination} className={cx('flex min-w-0 flex-1 flex-col', collapsed && 'hidden')}>
        {notice}
        {controls.activeGuide ? (
          <div className='px-3 pt-2'>
            <GuideBubble
              placement='inline'
              text={controls.guideText[controls.activeGuide]}
              onDismiss={() => controls.dismissGuide(controls.activeGuide!)}
            />
          </div>
        ) : null}
        <div className='flex min-h-0 flex-1 flex-col'>{children}</div>
        {footer}
      </TabPanel>
    </Tabs>
  );
}

export function PanelTile({ onRestore }: { onRestore: () => void }) {
  const { t } = useI18n();
  return (
    <Button
      aria-label={t('panelRestore')}
      title='XHunt'
      onClick={onRestore}
      data-xhunt-testid='panel-restore-button'
      className={cx(
        'tw-hunt-drag-handle-minimized !size-12 !p-0 shadow-xh-panel',
        'soft:!rounded-2xl soft:!border-0 soft:!bg-xh-fg soft:!text-xh-canvas',
        'native:!rounded-full native:!bg-xh-surface native:!text-xh-fg native:shadow-xh-pop',
        'obsidian:!rounded-[14px] obsidian:!bg-xh-fg obsidian:!text-xh-canvas',
      )}
    >
      <LogoIcon size={20} />
    </Button>
  );
}
