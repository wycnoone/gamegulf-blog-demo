export const locales = ['en', 'zh-hans', 'fr', 'es', 'de', 'ja', 'pt'] as const;

export type BlogLocale = (typeof locales)[number];

export const defaultLocale: BlogLocale = 'en';

export function isLocale(value: string): value is BlogLocale {
  return locales.includes(value as BlogLocale);
}

export const localeLabels: Record<BlogLocale, string> = {
  en: 'English',
  'zh-hans': '简体中文',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  ja: '日本語',
  pt: 'Português',
};

export const langTags: Record<BlogLocale, string> = {
  en: 'en',
  'zh-hans': 'zh-Hans',
  fr: 'fr',
  es: 'es',
  de: 'de',
  ja: 'ja',
  pt: 'pt',
};

export const intlLocales: Record<BlogLocale, string> = {
  en: 'en-US',
  'zh-hans': 'zh-CN',
  fr: 'fr-FR',
  es: 'es-ES',
  de: 'de-DE',
  ja: 'ja-JP',
  pt: 'pt-BR',
};

// Reads from astro.config.mjs `base` — works for both /blog (prod) and /gamegulf-blog-demo (dev preview)
export const blogBasePath = import.meta.env.BASE_URL.replace(/\/$/, '');
