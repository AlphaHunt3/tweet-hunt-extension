import { navigationService } from '~/compontents/navigation/NavigationService';
import { useI18n } from '~contents/hooks/i18n';
import { useLocalStorage } from '~storage/useLocalStorage';
import { UI_SKIN_INTRO_SEEN_KEY } from './skins';

export function SkinIntroNotice() {
  const { t } = useI18n();
  const [seen, setSeen, { isLoading }] = useLocalStorage<boolean>(UI_SKIN_INTRO_SEEN_KEY, false);

  if (isLoading || seen) return null;

  return (
    <div
      role='status'
      data-xhunt-testid='skin-intro-notice'
      className='mx-2 mt-2 rounded-xh-card border border-xh-line bg-xh-raised p-3'
    >
      <p className='text-[13px] font-semibold text-xh-fg'>{t('uiSkinIntroTitle')}</p>
      <p className='mt-0.5 text-[12px] leading-4 text-xh-fg-2'>{t('uiSkinIntroBody')}</p>
      <div className='mt-2 flex gap-2'>
        <button
          type='button'
          className='h-7 rounded-xh-control bg-xh-accent px-3 text-[12px] font-semibold text-xh-on-accent'
          onClick={() => {
            setSeen(true);
            navigationService.navigateTo('main-panel', '/settings');
          }}
        >
          {t('uiSkinIntroAction')}
        </button>
        <button
          type='button'
          className='h-7 rounded-xh-control px-3 text-[12px] text-xh-fg-2 hover:text-xh-fg'
          onClick={() => setSeen(true)}
        >
          {t('uiSkinIntroDismiss')}
        </button>
      </div>
    </div>
  );
}
