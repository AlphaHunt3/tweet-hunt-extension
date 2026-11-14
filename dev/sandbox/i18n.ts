import zh from '../../src/locales/zh.json';

export const useI18n = () => ({
  lang: 'zh',
  setLang: () => {},
  t: (key: string, fallback?: string) =>
    (zh as Record<string, string>)[key] ?? fallback ?? key,
});
