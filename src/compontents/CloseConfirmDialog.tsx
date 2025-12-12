import React from 'react';
import { useI18n } from '~contents/hooks/i18n.ts';
import { navigationService } from '~/compontents/navigation/NavigationService';

export interface CloseConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  prefixKey?: string;
  suffixKey?: string;
}

export function CloseConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  prefixKey = 'confirmCloseTrendingPrefix',
  suffixKey = 'confirmCloseTrendingSuffix',
}: CloseConfirmDialogProps) {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div className='absolute inset-0 z-[999000] flex items-start justify-center'>
      <div
        className='absolute inset-0 z-[999001] theme-bg-secondary'
        style={{ opacity: 0.8 }}
        onClick={onClose}
      />
      <div className='relative z-[999002] theme-bg-secondary theme-text-primary rounded-lg border theme-border p-4 w-[300px] shadow-xl mt-4'>
        <div className='text-sm leading-5'>
          {t(prefixKey)}{' '}
          <button
            type='button'
            className='underline text-blue-400 hover:text-blue-300'
            onClick={() => {
              try {
                const openEvt = new CustomEvent('xhunt:open-panel');
                window.dispatchEvent(openEvt);
              } catch {}
              try {
                setTimeout(() => {
                  navigationService.navigateTo('main-panel', '/settings');
                }, 100);
              } catch {}
            }}
          >
            {t('settingsTitle')}
          </button>{' '}
          {t(suffixKey)}
        </div>
        <div className='mt-3 flex justify-end gap-2'>
          <button
            type='button'
            className='px-3 py-1.5 text-xs rounded-md theme-hover border theme-border theme-text-primary'
            onClick={onClose}
          >
            {t('cancel')}
          </button>
          <button
            type='button'
            className='px-3 py-1.5 text-xs rounded-md bg-blue-500 text-white hover:bg-blue-600'
            onClick={onConfirm}
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
