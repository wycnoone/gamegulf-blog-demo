export const locales = ['en', 'zh-hans'] as const;

export type BlogLocale = (typeof locales)[number];

export const defaultLocale: BlogLocale = 'en';

export function isLocale(value: string): value is BlogLocale {
  return locales.includes(value as BlogLocale);
}

export const localeLabels: Record<BlogLocale, string> = {
  en: 'English',
  'zh-hans': '简体中文',
};

// Reads from astro.config.mjs `base` — works for both /blog (prod) and /gamegulf-blog-demo (dev preview)
export const blogBasePath = import.meta.env.BASE_URL.replace(/\/$/, '');
