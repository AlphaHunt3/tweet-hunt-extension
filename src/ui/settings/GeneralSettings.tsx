import { useDebounceFn } from 'ahooks';
import { useEffect, useMemo, useState } from 'react';
import { defaultSound } from '~compontents/pages/constants.tsx';
import { useI18n } from '~contents/hooks/i18n';
import { useLocalStorage } from '~storage/useLocalStorage';
import { PlayIcon } from '../icons';
import { IconButton, SegmentedControl, Select } from '../primitives';
import { cx } from '../primitives/cx';
import { SkinPicker } from '../skin/SkinPicker';
import type { SettingItem } from './groupSettings';
import { ROW_PAD, SettingRow, SwitchSetting } from './SettingRow';

export const SOUND_FILES = [
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/y1009.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/y1478.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/y1561.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/y1873.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/y2181.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/y899.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/14428.mp3',
  'https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/15011.mp3',
];

interface StoredSound {
  url: string;
  data: string;
}

async function fetchAndCacheSound(url: string) {
  try {
    if (!url) return '';
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

function playSound(url: string) {
  try {
    window.dispatchEvent(new CustomEvent('xhunt:play-sound', { detail: { url } }));
  } catch {}
}

export function SkinSetting() {
  const { t } = useI18n();
  return (
    <div data-xhunt-testid='settings-ui-skin' className={cx('flex flex-col gap-2', ROW_PAD)}>
      <span className='text-[12.5px] native:text-[15px]'>{t('uiSkinLabel')}</span>
      <SkinPicker />
    </div>
  );
}

export function LanguageSetting() {
  const { t, lang, setLang } = useI18n();
  return (
    <SettingRow
      label={t('language')}
      control={
        <SegmentedControl
          aria-label={t('language')}
          size='sm'
          value={lang === 'en' ? 'en' : 'zh'}
          onValueChange={(next) => setLang(next)}
          options={[
            { value: 'en', label: 'EN', testId: 'settings-language-en' },
            { value: 'zh', label: '中', testId: 'settings-language-zh' },
          ]}
        />
      }
    />
  );
}

export function SoundSetting() {
  const { t } = useI18n();
  const [sound, setSound, { isLoading }] = useLocalStorage<StoredSound>('@xhunt/sound', { url: '', data: '' });
  const [fetching, setFetching] = useState(false);
  const { run: playLater } = useDebounceFn(
    (url: string) => {
      if (url) playSound(url);
    },
    { wait: 300 },
  );
  const options = useMemo(
    () => SOUND_FILES.map((url, index) => ({ value: url, label: `${t('sound')}${index + 1}` })),
    [t],
  );

  useEffect(() => {
    if (!isLoading && (!sound || (!sound.data && sound.url !== '__MUTE__')) && defaultSound?.data) {
      setSound({ url: defaultSound.url, data: defaultSound.data });
    }
  }, [isLoading, sound?.data, setSound]);

  const busy = fetching || isLoading;
  const canPlay = Boolean(sound?.data) && sound?.url !== '__MUTE__' && !busy;

  return (
    <SettingRow
      label={t('soundEffect')}
      control={
        <>
          <Select
            aria-label={t('soundEffect')}
            placeholder={t('select')}
            value={sound?.url || null}
            disabled={busy}
            options={options}
            onValueChange={async (url) => {
              setFetching(true);
              try {
                const data = await fetchAndCacheSound(url);
                if (data) {
                  setSound({ url, data });
                  playLater(data);
                }
              } finally {
                setFetching(false);
              }
            }}
          />
          <IconButton
            label={t('playSelectedSound')}
            size='sm'
            disabled={!canPlay}
            onClick={() => {
              if (sound?.data) playLater(sound.data);
            }}
          >
            <PlayIcon size={14} />
          </IconButton>
        </>
      }
    />
  );
}

export function GeneralSettings({ items }: { items: SettingItem[] }) {
  return (
    <>
      <SkinSetting />
      <LanguageSetting />
      <SoundSetting />
      {items.map((item) => (
        <SwitchSetting key={item.key} setting={item} />
      ))}
    </>
  );
}
