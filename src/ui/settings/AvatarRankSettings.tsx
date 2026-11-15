import { Radio, RadioGroup } from '@ui-sdk/react/radio';
import type { CSSProperties } from 'react';
import { avatarSkins } from '~contents/constants/avatarSkins';
import { useAvatarSkinState } from '~contents/hooks/useAvatarSkin';
import { useI18n } from '~contents/hooks/i18n';
import { useUserDomain } from '~contents/hooks/useUserDomain';
import { useLocalStorage } from '~storage/useLocalStorage';
import { SegmentedControl } from '../primitives';
import { cx } from '../primitives/cx';
import type { SettingItem } from './groupSettings';
import { reloadPage } from './reloadPage';
import { ROW_PAD, SettingRow, SwitchSetting } from './SettingRow';
import { useSettingsContext } from './SettingsContext';

export const AVATAR_RANK_MODE_KEY = '@settings/avatarRankMode';

type RankMode = 'web3' | 'ai';

export function AvatarRankSettings({ items }: { items: SettingItem[] }) {
  const { t } = useI18n();
  const { settingStates } = useSettingsContext();
  const { domains } = useUserDomain();
  const [mode, setMode] = useLocalStorage<RankMode>(AVATAR_RANK_MODE_KEY, 'web3');
  const { skin, setSkinCustomized } = useAvatarSkinState();
  const modes = (['web3', 'ai'] as const).filter((domain) => domains.includes(domain));

  return (
    <>
      {items.map((item) => (
        <SwitchSetting key={item.key} setting={item} />
      ))}
      {settingStates.showAvatarRank?.get ? (
        <>
          <SettingRow
            label={t('avatarRankModeSelectorTitle')}
            description={t('settingsReloadOnChange')}
            control={
              <SegmentedControl
                aria-label={t('avatarRankModeSelectorTitle')}
                size='sm'
                disabled={domains.length === 1}
                value={mode}
                onValueChange={(next) => {
                  if (next === mode) return;
                  setMode(next);
                  reloadPage(next === 'ai' ? 100 : 200);
                }}
                options={modes.map((domain) => ({
                  value: domain,
                  label: domain === 'web3' ? 'Web3' : 'AI',
                  testId: `settings-avatar-rank-mode-${domain}`,
                }))}
              />
            }
          />
          <BadgeSkinPicker value={skin} onValueChange={setSkinCustomized} />
        </>
      ) : null}
    </>
  );
}

function BadgeSkinPicker({ value, onValueChange }: { value: string; onValueChange: (id: string) => void }) {
  const { t } = useI18n();
  const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const current = avatarSkins[value];

  return (
    <div className={cx('flex flex-col gap-2.5', ROW_PAD)}>
      <span className='text-[12.5px] native:text-[15px]'>
        {t('avatarSkinSelectorTitle')}
        {current ? <span className='text-xh-fg-2'> · {t(current.nameKey)}</span> : null}
      </span>
      <RadioGroup
        value={value}
        onValueChange={(next) => {
          if (typeof next === 'string') onValueChange(next);
        }}
        aria-label={t('avatarSkinSelectorTitle')}
        className='flex flex-wrap gap-1.5'
      >
        {Object.entries(avatarSkins).map(([id, config]) => (
          <Radio
            key={id}
            value={id}
            title={t(config.nameKey)}
            data-xhunt-testid={`settings-avatar-skin-${id}`}
            className='xh-swatch'
            style={{ '--xh-sw': (theme === 'light' ? config.light : config.dark).background } as CSSProperties}
          >
            <span className='sr-only'>{t(config.nameKey)}</span>
          </Radio>
        ))}
      </RadioGroup>
    </div>
  );
}
