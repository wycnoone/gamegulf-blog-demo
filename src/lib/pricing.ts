import { intlLocales, type BlogLocale } from '@/lib/i18n';

export type StructuredPriceRow = {
  regionCode: string;
  eurPrice: number;
  nativePrice: string;
  nativeCurrency: string;
};

export type CardPriceData = {
  eurPrice: number;
  regionCode: string;
};

export type LocalizedPriceRow = {
  regionCode: string;
  regionLabel: string;
  convertedLabel: string;
  nativePrice: string;
};

type DisplayCurrency = 'USD' | 'CNY' | 'EUR' | 'JPY';

const DISPLAY_CURRENCY_BY_LOCALE: Record<BlogLocale, DisplayCurrency> = {
  en: 'USD',
  'zh-hans': 'CNY',
  fr: 'EUR',
  es: 'EUR',
  de: 'EUR',
  ja: 'JPY',
  pt: 'EUR',
};

const EXCHANGE_RATE_QUOTES = ['USD', 'CNY', 'JPY'] as const;

const FALLBACK_EUR_RATES: Record<string, number> = {
  EUR: 1,
  USD: 1.1525,
  CNY: 7.9495,
  JPY: 183.94,
};

const CURRENCY_LOCALE_OVERRIDES: Record<string, string> = {
  USD: 'en-US',
  CNY: 'zh-CN',
  EUR: 'de-DE',
  JPY: 'ja-JP',
  GBP: 'en-GB',
  HKD: 'zh-HK',
  BRL: 'pt-BR',
};

const REGION_OVERRIDES: Partial<Record<BlogLocale, Record<string, string>>> = {
  en: {
    HK: 'Hong Kong',
    EU: 'European Union',
  },
  'zh-hans': {
    HK: '香港',
    GB: '英国',
    EU: '欧盟区',
  },
};

const CONVERTED_PRICE_LABELS: Record<BlogLocale, string> = {
  en: 'Price (USD equivalent)',
  'zh-hans': '价格（人民币折算）',
  fr: 'Prix (équivalent EUR)',
  es: 'Precio (equivalente en EUR)',
  de: 'Preis (in EUR umgerechnet)',
  ja: '価格（円換算）',
  pt: 'Preço (equivalente em EUR)',
};

const PRICE_REGION_HEADERS: Record<BlogLocale, string> = {
  en: 'Region',
  'zh-hans': '地区',
  fr: 'Région',
  es: 'Región',
  de: 'Region',
  ja: '地域',
  pt: 'Região',
};

const NATIVE_PRICE_HEADERS: Record<BlogLocale, string> = {
  en: 'Native price',
  'zh-hans': '原生价格',
  fr: 'Prix natif',
  es: 'Precio nativo',
  de: 'Originalpreis',
  ja: '現地価格',
  pt: 'Preço nativo',
};

let eurRatesPromise: Promise<Record<string, number>> | null = null;

async function fetchEurRates() {
  const response = await fetch(
    'https://api.frankfurter.dev/v2/rates?base=EUR&quotes=USD,CNY,JPY&providers=ECB',
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch exchange rates: ${response.status}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    throw new Error('Unexpected exchange-rate payload');
  }

  const rates = { ...FALLBACK_EUR_RATES };
  for (const entry of payload) {
    if (entry?.quote && typeof entry?.rate === 'number') {
      rates[entry.quote] = entry.rate;
    }
  }
  return rates;
}

export async function getEurExchangeRates() {
  if (!eurRatesPromise) {
    eurRatesPromise = fetchEurRates().catch(() => FALLBACK_EUR_RATES);
  }
  return eurRatesPromise;
}

export function getDisplayCurrency(locale: BlogLocale) {
  return DISPLAY_CURRENCY_BY_LOCALE[locale];
}

function getCurrencyLocale(currency: string, locale: BlogLocale) {
  return CURRENCY_LOCALE_OVERRIDES[currency] || intlLocales[locale];
}

export function formatMoney(amount: number, currency: string, locale: BlogLocale) {
  return new Intl.NumberFormat(getCurrencyLocale(currency, locale), {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
  }).format(amount);
}

export function formatCurrencyCodeAmount(amount: number, currency: string) {
  const digits = currency === 'JPY' ? 0 : 2;
  return `${currency} ${amount.toFixed(digits)}`;
}

export async function convertEuroAmount(
  eurAmount: number,
  locale: BlogLocale,
  rates?: Record<string, number>,
) {
  const displayCurrency = getDisplayCurrency(locale);
  if (displayCurrency === 'EUR') return eurAmount;
  const resolvedRates = rates || await getEurExchangeRates();
  return eurAmount * (resolvedRates[displayCurrency] || 1);
}

export async function formatConvertedPrice(
  eurAmount: number,
  locale: BlogLocale,
  rates?: Record<string, number>,
) {
  const displayCurrency = getDisplayCurrency(locale);
  const converted = await convertEuroAmount(eurAmount, locale, rates);
  return formatCurrencyCodeAmount(converted, displayCurrency);
}

export function formatNativeCurrency(amount: number, currency: string, locale: BlogLocale) {
  return formatMoney(amount, currency, locale);
}

export function getLocalizedRegionLabel(regionCode: string, locale: BlogLocale) {
  const override = REGION_OVERRIDES[locale]?.[regionCode];
  if (override) return override;
  try {
    const display = new Intl.DisplayNames(intlLocales[locale], { type: 'region' });
    return display.of(regionCode) || regionCode;
  } catch {
    return regionCode;
  }
}

export function getConvertedPriceColumnLabel(locale: BlogLocale) {
  return CONVERTED_PRICE_LABELS[locale];
}

export function getPriceRegionHeader(locale: BlogLocale) {
  return PRICE_REGION_HEADERS[locale];
}

export function getNativePriceHeader(locale: BlogLocale) {
  return NATIVE_PRICE_HEADERS[locale];
}

export async function formatAdaptivePriceSummary(
  price: CardPriceData,
  locale: BlogLocale,
  platform: string,
  rates?: Record<string, number>,
) {
  const convertedLabel = await formatConvertedPrice(price.eurPrice, locale, rates);
  const regionLabel = getLocalizedRegionLabel(price.regionCode, locale);
  const compactPlatform = /nintendo\s+switch/i.test(platform)
    ? 'Switch'
    : platform.replace(/^Nintendo\s+/i, '').trim() || platform;
  return `${convertedLabel} · ${compactPlatform} · ${regionLabel}`;
}

export async function localizePriceRows(
  rows: StructuredPriceRow[],
  locale: BlogLocale,
  rates?: Record<string, number>,
): Promise<LocalizedPriceRow[]> {
  const resolvedRates = rates || await getEurExchangeRates();
  return Promise.all(rows.map(async (row) => ({
    regionCode: row.regionCode,
    regionLabel: getLocalizedRegionLabel(row.regionCode, locale),
    convertedLabel: await formatConvertedPrice(row.eurPrice, locale, resolvedRates),
    nativePrice: row.nativePrice,
  })));
}
