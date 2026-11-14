import type { ReactNode } from 'react';
import { useNavigation } from '~/compontents/navigation/PanelNavigator';
import { useI18n } from '~contents/hooks/i18n';
import { ArrowLeftIcon, ChevronLeftIcon, CloseIcon, GripIcon, MinimizeIcon } from '../icons';
import { IconButton } from '../primitives';
import { useUiSkin } from '../skin/useUiSkin';
import { usePanelControls } from './usePanelControls';

export function PanelPageHeader({
  title,
  showBack = true,
  onClose,
  actions,
}: {
  title: ReactNode;
  showBack?: boolean;
  onClose?: () => void;
  actions?: ReactNode;
}) {
  const { t } = useI18n();
  const { skin } = useUiSkin();
  const { goBack, history } = useNavigation();
  const controls = usePanelControls(onClose);
  const canGoBack = skin !== 'obsidian' && showBack && history.length > 1;

  return (
    <div className='flex items-center gap-2 soft:h-9 soft:px-0.5 obsidian:px-3 obsidian:pb-2 obsidian:pt-2.5 native:gap-3 native:pb-1 native:pl-4 native:pr-3 native:pt-3'>
      {canGoBack ? (
        <IconButton label={t('panelBack')} size='sm' onClick={goBack} data-xhunt-testid='panel-back-button'>
          {skin === 'native' ? <ArrowLeftIcon size={20} /> : <ChevronLeftIcon />}
        </IconButton>
      ) : null}
      <h2 className='tw-hunt-drag-handle min-w-0 flex-1 cursor-grab truncate font-semibold soft:text-[13px] obsidian:text-[13px] native:text-[20px] native:font-extrabold'>
        {title}
      </h2>
      {actions}
      <IconButton label={t('panelDrag')} size='sm' className='tw-hunt-drag-handle cursor-grab'>
        <GripIcon />
      </IconButton>
      {controls.hide ? (
        <IconButton
          label={controls.hideLabel}
          size='sm'
          onClick={controls.hide}
          data-xhunt-testid={controls.persistent ? 'panel-minimize-button' : 'panel-close-button'}
        >
          {controls.persistent ? <MinimizeIcon /> : <CloseIcon />}
        </IconButton>
      ) : null}
    </div>
  );
}
