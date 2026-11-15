import { useI18n } from '~contents/hooks/i18n';

export interface Narrative {
  cn?: string | null;
  en?: string | null;
}

export function pickNarrative(narrative: Narrative | null | undefined, lang: string) {
  return (lang === 'zh' ? narrative?.cn : narrative?.en)?.trim() || '';
}

export function NarrativeLine({ narrative }: { narrative?: Narrative | null }) {
  const { t, lang } = useI18n();
  const text = pickNarrative(narrative, lang);
  if (!text) return null;
  return (
    <p className='xh-narr'>
      <span className='xh-narr-label'>{t('aiNarrative')}</span>
      {text}
    </p>
  );
}
