import { Radio, RadioGroup, RadioIndicator } from '@ui-sdk/react/radio';
import { useI18n } from '~contents/hooks/i18n';
import { UI_SKINS, UI_SKIN_META, isUiSkin, type UiSkin } from './skins';
import { useUiSkin } from './useUiSkin';

const PREVIEW: Record<UiSkin, { bg: string; card: string; bar: string; accent: string; radius: number }> = {
  soft: { bg: '#f5f5f5', card: '#ffffff', bar: '#e6e6e6', accent: '#5a5cf0', radius: 6 },
  obsidian: { bg: '#0b0b0c', card: 'rgba(255,255,255,0.07)', bar: 'rgba(255,255,255,0.12)', accent: '#8b9cff', radius: 4 },
  native: { bg: '#15202b', card: '#1e2732', bar: '#38444d', accent: '#1d9bf0', radius: 8 },
};

function SkinPreview({ skin }: { skin: UiSkin }) {
  const p = PREVIEW[skin];
  return (
    <span
      aria-hidden='true'
      className='flex h-12 flex-col gap-1 p-1.5'
      style={{ background: p.bg, borderRadius: p.radius + 2 }}
    >
      <span className='h-1.5 w-1/2 rounded-full' style={{ background: p.accent }} />
      <span className='flex flex-1 gap-1'>
        <span className='flex-1' style={{ background: p.card, borderRadius: p.radius }} />
        <span className='flex-1' style={{ background: p.card, borderRadius: p.radius }} />
      </span>
      <span className='h-1 w-3/4 rounded-full' style={{ background: p.bar }} />
    </span>
  );
}

export function SkinPicker() {
  const { t } = useI18n();
  const { skin, setSkin } = useUiSkin();

  return (
    <RadioGroup
      value={skin}
      onValueChange={(next) => {
        if (isUiSkin(next)) setSkin(next);
      }}
      aria-label={t('uiSkinLabel')}
      className='grid grid-cols-3 gap-2'
    >
      {UI_SKINS.map((id) => (
        <label
          key={id}
          data-xhunt-testid={`skin-option-${id}`}
          className='flex cursor-pointer flex-col gap-1.5 rounded-xl border border-xh-line bg-xh-raised p-1.5 transition-shadow has-[[data-checked]]:border-xh-accent has-[[data-checked]]:ring-2 has-[[data-checked]]:ring-xh-accent-soft'
        >
          <SkinPreview skin={id} />
          <span className='flex items-center justify-between gap-1 px-0.5'>
            <span className='text-[12px] font-semibold text-xh-fg'>{t(UI_SKIN_META[id].nameKey)}</span>
            <Radio
              value={id}
              className='flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-xh-fg-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-xh-accent data-[checked]:border-xh-accent'
            >
              <RadioIndicator className='h-1.5 w-1.5 rounded-full bg-xh-accent' />
            </Radio>
          </span>
          <span className='px-0.5 text-[11px] leading-4 text-xh-fg-2'>{t(UI_SKIN_META[id].descKey)}</span>
        </label>
      ))}
    </RadioGroup>
  );
}
