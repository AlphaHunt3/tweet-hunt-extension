import { useI18n } from '~contents/hooks/i18n';
import { CloseIcon } from '../icons';
import { Button, IconButton } from '../primitives';
import { cx } from '../primitives/cx';

export function GuideBubble({
  text,
  onDismiss,
  placement = 'below',
}: {
  text: string;
  onDismiss: () => void;
  placement?: 'below' | 'inline';
}) {
  const { t } = useI18n();
  return (
    <div
      role='status'
      className={cx(
        'z-[80] rounded-xh-card bg-xh-surface p-3 pr-8 text-[12px] leading-[18px] text-xh-fg-2 shadow-xh-pop xh-rise',
        placement === 'below' ? 'absolute right-0 top-[38px] w-[218px]' : 'relative',
      )}
    >
      <IconButton
        label={t('fanTipPanelCloseButtonLabel') || 'Close'}
        size='sm'
        onClick={onDismiss}
        className='!absolute right-1 top-1'
      >
        <CloseIcon size={12} />
      </IconButton>
      <p>{text}</p>
      <div className='mt-1.5 flex justify-end'>
        <Button size='sm' variant='soft' onClick={onDismiss}>
          {t('headerControlsGuideGotIt') || 'Got it'}
        </Button>
      </div>
    </div>
  );
}
