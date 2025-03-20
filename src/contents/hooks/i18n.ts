import zh from '../../locales/zh.json';
import en from '../../locales/en.json'
import { useStorage } from '@plasmohq/storage/dist/hook';
import { useCallback, useEffect, useMemo } from 'react';
import { isUserUsingChinese } from '~contents/utils';

export const useI18n = () => {
  const [lang, setLang, {
    isLoading: isLoadingLang
  }] = useStorage('@settings/language1', '');
  useEffect(() => {
    if(!isLoadingLang && !lang) {
      setLang(isUserUsingChinese() ? 'zh' : 'en');
    }
  }, [isLoadingLang, lang]);
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
    setLang,
    t
  }
}
