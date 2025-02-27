import zh from '../../locales/zh.json';
import en from '../../locales/en.json'
import { useStorage } from '@plasmohq/storage/dist/hook';
import { useCallback, useMemo } from 'react';

export const useI18n = () => {
  const [lang] = useStorage('@settings/lan', 'en');
  const _t = useMemo(() => {
    if (lang === 'zh') {
      return zh;
    }
    return en;
  }, [lang]);
  const t = useCallback((str: string) => {
    try {
      return _t[str] || str;
    } catch (err) {
      return str;
    }
  }, [_t])
  return {
    lang,
    t
  }
}
