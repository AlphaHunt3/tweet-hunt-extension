import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack } from '@ui-sdk/react/slider';
import { useDebounceFn } from 'ahooks';
import { useEffect, useState } from 'react';
import { useI18n } from '~contents/hooks/i18n';
import { useLocalStorage } from '~storage/useLocalStorage';
import { SegmentedControl } from '../primitives';
import { cx } from '../primitives/cx';
import { ROW_PAD, SettingRow } from './SettingRow';

export function clampWidth(value: unknown) {
  return Math.min(400, Math.max(300, Math.round((Number(value) || 340) / 10) * 10));
}

export function FloatingPanelSettings() {
  const { t } = useI18n();
  const [mode, setMode] = useLocalStorage<'default' | 'persistent'>('@xhunt/floatingPanelMode', 'default');
  const [width, setWidth] = useLocalStorage<number>('@xhunt/panelWidth', 340);
  const [draft, setDraft] = useState(() => clampWidth(width));
  useEffect(() => setDraft(clampWidth(width)), [width]);

  const { run: resetPosition } = useDebounceFn(
    () => {
      try {
        window.dispatchEvent(
          new CustomEvent('xhunt:reset-panel-position', {
            detail: { storageKey: 'fixed-twitter-panel', rightOffset: 30, y: 50 },
          }),
        );
      } catch {}
    },
    { wait: 200 },
  );

  return (
    <>
      <SettingRow
        label={t('floatingPanelMode')}
        control={
          <SegmentedControl
            aria-label={t('floatingPanelMode')}
            size='sm'
            value={mode}
            onValueChange={setMode}
            options={[
              { value: 'default', label: t('floatingPanelModeDefault'), testId: 'settings-floating-mode-default' },
              { value: 'persistent', label: t('floatingPanelModePersistent'), testId: 'settings-floating-mode-persistent' },
            ]}
          />
        }
      />
      <div className={cx('flex flex-col gap-2', ROW_PAD)}>
        <div className='flex items-center justify-between gap-3 text-[12.5px] native:text-[15px]'>
          <span>{t('panelWidth')}</span>
          <span className='font-xh-num tabular-nums text-xh-fg-2'>{draft}px</span>
        </div>
        <Slider
          value={draft}
          min={300}
          max={400}
          step={10}
          onValueChange={(next) => setDraft(clampWidth(next))}
          onValueCommit={async (next) => {
            await setWidth(clampWidth(next));
            resetPosition();
          }}
          className='xh-slider'
        >
          <SliderControl className='xh-slider-control'>
            <SliderTrack className='xh-slider-track'>
              <SliderIndicator className='xh-slider-indicator' />
              <SliderThumb
                aria-label={t('panelWidth')}
                className='xh-slider-thumb'
                data-xhunt-testid='settings-panel-width-range'
              />
            </SliderTrack>
          </SliderControl>
        </Slider>
      </div>
    </>
  );
}
