import { readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __pricingUtilsDir = dirname(fileURLToPath(import.meta.url));

/** Strip UTF-8 BOM so /^---/ frontmatter regexes match (Windows-saved UTF-8 files). */
export function stripUtf8Bom(text) {
  return typeof text === 'string' ? text.replace(/^\uFEFF/, '') : text;
}

export const DISPLAY_CURRENCY_BY_LOCALE = {
  en: 'USD',
  'zh-hans': 'CNY',
  fr: 'EUR',
  es: 'EUR',
  de: 'EUR',
  ja: 'JPY',
  pt: 'EUR',
};

export const FALLBACK_EUR_RATES = {
  EUR: 1,
  USD: 1.1525,
  CNY: 7.9495,
  JPY: 183.94,
};

const INTL_LOCALE_BY_BLOG_LOCALE = {
  en: 'en-US',
  'zh-hans': 'zh-CN',
  fr: 'fr-FR',
  es: 'es-ES',
  de: 'de-DE',
  ja: 'ja-JP',
  pt: 'pt-PT',
};

// Region name overrides for Intl.DisplayNames API gaps
// Used by both validator and model prompts for consistency
const REGION_OVERRIDES = {
  en: { HK: 'Hong Kong', EU: 'European Union' },
  'zh-hans': { 
    HK: '香港', 
    GB: '英国', 
    US: '美国', 
    JP: '日本', 
    BR: '巴西', 
    DE: '德国',
    EU: '欧盟区' 
  },
  ja: { 
    HK: '香港',
    GB: 'イギリス',
    US: 'アメリカ合衆国',
    JP: '日本',
    BR: 'ブラジル',
    DE: 'ドイツ'
  },
  fr: { 
    HK: 'Hong Kong',
    GB: 'Royaume-Uni',
    US: 'États-Unis',
    JP: 'Japon',
    BR: 'Brésil',
    DE: 'Allemagne'
  },
  es: { 
    HK: 'Hong Kong',
    GB: 'Reino Unido',
    US: 'Estados Unidos',
    JP: 'Japón',
    BR: 'Brasil',
    DE: 'Alemania'
  },
  de: { 
    HK: 'Hongkong',
    GB: 'Vereinigtes Königreich',
    US: 'Vereinigte Staaten',
    JP: 'Japan',
    BR: 'Brasilien',
    DE: 'Deutschland'
  },
  pt: { 
    HK: 'Hong Kong',
    GB: 'Reino Unido',
    US: 'Estados Unidos',
    JP: 'Japão',
    BR: 'Brasil',
    DE: 'Alemanha'
  },
};

// Master region mapping table for model prompts
// Exported for use in documentation/prompt generation
export const REGION_NAME_MAPPING = {
  HK: {
    en: 'Hong Kong',
    'zh-hans': '香港',
    ja: '香港',
    fr: 'Hong Kong',
    es: 'Hong Kong',
    de: 'Hongkong',
    pt: 'Hong Kong'
  },
  JP: {
    en: 'Japan',
    'zh-hans': '日本',
    ja: '日本',
    fr: 'Japon',
    es: 'Japón',
    de: 'Japan',
    pt: 'Japão'
  },
  BR: {
    en: 'Brazil',
    'zh-hans': '巴西',
    ja: 'ブラジル',
    fr: 'Brésil',
    es: 'Brasil',
    de: 'Brasilien',
    pt: 'Brasil'
  },
  US: {
    en: 'United States',
    'zh-hans': '美国',
    ja: 'アメリカ合衆国',
    fr: 'États-Unis',
    es: 'Estados Unidos',
    de: 'Vereinigte Staaten',
    pt: 'Estados Unidos'
  },
  GB: {
    en: 'United Kingdom',
    'zh-hans': '英国',
    ja: 'イギリス',
    fr: 'Royaume-Uni',
    es: 'Reino Unido',
    de: 'Vereinigtes Königreich',
    pt: 'Reino Unido'
  },
  DE: {
    en: 'Germany',
    'zh-hans': '德国',
    ja: 'ドイツ',
    fr: 'Allemagne',
    es: 'Alemania',
    de: 'Deutschland',
    pt: 'Alemanha'
  },
};

const REGION_NATIVE_CURRENCY = {
  AR: 'ARS',
  AU: 'AUD',
  BR: 'BRL',
  CA: 'CAD',
  CH: 'CHF',
  CL: 'CLP',
  CN: 'CNY',
  CO: 'COP',
  CZ: 'CZK',
  DE: 'EUR',
  DK: 'DKK',
  EU: 'EUR',
  ES: 'EUR',
  FR: 'EUR',
  GB: 'GBP',
  HK: 'HKD',
  HU: 'HUF',
  IT: 'EUR',
  JP: 'JPY',
  KR: 'KRW',
  MX: 'MXN',
  NO: 'NOK',
  NZ: 'NZD',
  PL: 'PLN',
  PT: 'EUR',
  RU: 'RUB',
  SE: 'SEK',
  US: 'USD',
  ZA: 'ZAR',
};

const CURRENCY_SYMBOL_BY_CODE = {
  ARS: '$',
  AUD: 'A$',
  BRL: 'R$',
  CAD: 'CA$',
  CHF: 'CHF ',
  CLP: 'CLP$',
  CNY: '¥',
  COP: 'COP$',
  CZK: 'Kc',
  DKK: 'kr',
  EUR: '€',
  GBP: '£',
  HKD: 'HK$',
  HUF: 'Ft',
  JPY: '¥',
  KRW: '₩',
  MXN: 'MX$',
  NOK: 'kr',
  NZD: 'NZ$',
  PLN: 'zl',
  RUB: '₽',
  SEK: 'kr',
  USD: '$',
  ZAR: 'R',
};

const PRICE_TABLE_HEADERS = {
  en: ['Region', 'Price (USD equivalent)', 'Native price'],
  'zh-hans': ['地区', '价格（人民币折算）', '原生价格'],
  fr: ['Région', 'Prix (équivalent EUR)', 'Prix natif'],
  es: ['Región', 'Precio (equivalente en EUR)', 'Precio nativo'],
  de: ['Region', 'Preis (in EUR umgerechnet)', 'Originalpreis'],
  ja: ['地域', '価格（円換算）', '現地価格'],
  pt: ['Região', 'Preço (equivalente em EUR)', 'Preço nativo'],
};

const PRICE_HEADING_KEYWORDS = {
  en: ['how much', 'price', 'discount'],
  'zh-hans': ['多少钱', '价格', '折扣'],
  fr: ['combien', 'prix', 'promo'],
  es: ['cuánto', 'precio', 'oferta'],
  de: ['wie viel', 'preis', 'rabatt'],
  ja: ['いくら', '価格', 'セール'],
  pt: ['quanto custa', 'preço', 'promoção'],
};

let eurRatesPromise = null;

export function inferLocaleFromFilePath(filePath) {
  const normalized = String(filePath).replace(/\\/g, '/');
  const match = normalized.match(/\/posts\/([^/]+)\//);
  return match?.[1] || null;
}

export function getDisplayCurrency(locale) {
  return DISPLAY_CURRENCY_BY_LOCALE[locale] || 'EUR';
}

export function getIntlLocale(locale) {
  return INTL_LOCALE_BY_BLOG_LOCALE[locale] || 'en-US';
}

export function getPriceTableHeaders(locale) {
  return PRICE_TABLE_HEADERS[locale] || PRICE_TABLE_HEADERS.en;
}

export function getPriceHeadingKeywords(locale) {
  return PRICE_HEADING_KEYWORDS[locale] || PRICE_HEADING_KEYWORDS.en;
}

export function getLocalizedRegionLabel(regionCode, locale) {
  const override = REGION_OVERRIDES[locale]?.[regionCode];
  if (override) return override;

  try {
    const displayNames = new Intl.DisplayNames(getIntlLocale(locale), { type: 'region' });
    return displayNames.of(regionCode) || regionCode;
  } catch {
    return regionCode;
  }
}

export function formatCurrencyCodeAmount(amount, currency) {
  const digits = currency === 'JPY' ? 0 : 2;
  return `${currency} ${amount.toFixed(digits)}`;
}

export function formatNativePrice(amount, currency, decimals = currency === 'JPY' ? 0 : 2) {
  const symbol = CURRENCY_SYMBOL_BY_CODE[currency] || `${currency} `;
  const number = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  return `${symbol}${number}`;
}

export async function getEurExchangeRates() {
  if (!eurRatesPromise) {
    eurRatesPromise = fetch('https://api.frankfurter.dev/v2/rates?base=EUR&quotes=USD,CNY,JPY&providers=ECB')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch exchange rates: ${res.status}`);
        }
        const payload = await res.json();
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
      })
      .catch(() => ({ ...FALLBACK_EUR_RATES }));
  }

  return eurRatesPromise;
}

export async function formatConvertedPriceFromEur(eurAmount, locale, rates) {
  const displayCurrency = getDisplayCurrency(locale);
  if (displayCurrency === 'EUR') {
    return formatCurrencyCodeAmount(eurAmount, 'EUR');
  }

  const resolvedRates = rates || await getEurExchangeRates();
  const converted = eurAmount * (resolvedRates[displayCurrency] || 1);
  return formatCurrencyCodeAmount(converted, displayCurrency);
}

export function normalizePriceRows(rows) {
  return [...rows]
    .filter((row) => row && row.regionCode && typeof row.eurPrice === 'number')
    .sort((a, b) => a.eurPrice - b.eurPrice);
}

export async function buildLocalizedPriceRows(priceRows, locale, rates) {
  const resolvedRates = rates || await getEurExchangeRates();
  return Promise.all(
    normalizePriceRows(priceRows).map(async (row) => ({
      regionCode: row.regionCode,
      regionLabel: getLocalizedRegionLabel(row.regionCode, locale),
      convertedLabel: await formatConvertedPriceFromEur(row.eurPrice, locale, resolvedRates),
      nativePrice: row.nativePrice,
      nativeCurrency: row.nativeCurrency,
      eurPrice: row.eurPrice,
    })),
  );
}

export async function buildMarkdownPriceTable(priceRows, locale, rates) {
  const [regionHeader, convertedHeader, nativeHeader] = getPriceTableHeaders(locale);
  const rows = await buildLocalizedPriceRows(priceRows, locale, rates);
  const lines = [
    `| ${regionHeader} | ${convertedHeader} | ${nativeHeader} |`,
    '| --- | ---: | ---: |',
    ...rows.map((row) => `| ${row.regionLabel} | ${row.convertedLabel} | ${row.nativePrice} |`),
  ];
  return lines.join('\n');
}

export function buildCardPricePayload(priceRowsOrEntry, locale) {
  const first = Array.isArray(priceRowsOrEntry) ? normalizePriceRows(priceRowsOrEntry)[0] : priceRowsOrEntry;
  if (!first || typeof first.eurPrice !== 'number' || !first.regionCode) return null;

  return {
    cardPriceEur: first.eurPrice,
    cardPriceRegionCode: first.regionCode,
    cardPriceRegion: getLocalizedRegionLabel(first.regionCode, locale),
  };
}

export function extractSlugFromFilePath(filePath) {
  return basename(filePath, '.md');
}

export function getPriceSectionHeadingPattern(locale) {
  const keywords = getPriceHeadingKeywords(locale).map((keyword) =>
    keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`^##\\s+.*(?:${keywords.join('|')}).*$`, 'iu');
}

export function buildPriceRowsFromBrief(brief, locale) {
  const digital = brief?.platforms?.switch?.digital;
  const offers = Array.isArray(brief?.schema_offers) ? brief.schema_offers : [];
  if (!Array.isArray(digital)) return [];

  const offerQueues = offers.reduce((acc, offer) => {
    const currency = offer?.priceCurrency;
    const price = typeof offer?.price === 'string' ? offer.price : null;
    if (!currency || price == null) return acc;

    if (!acc[currency]) acc[currency] = [];
    acc[currency].push(price);
    return acc;
  }, {});

  const deduped = [];
  const seen = new Set();

  for (const entry of digital) {
    if (!entry?.country_code || entry.country_code === 'AR') continue;
    if (seen.has(entry.country_code)) continue;
    if (typeof entry.calculate_value !== 'number') continue;

    seen.add(entry.country_code);
    const nativeCurrency = REGION_NATIVE_CURRENCY[entry.country_code] || entry.currency || 'EUR';
    const offerPrice = offerQueues[nativeCurrency]?.shift();
    const fallbackRawPrice = String(entry.price ?? entry.calculate_value);
    const sourcePrice = offerPrice ?? fallbackRawPrice;
    const numericPrice = Number.parseFloat(sourcePrice);
    const decimals = sourcePrice.includes('.') ? sourcePrice.split('.')[1].replace(/0+$/, '').length : 0;

    deduped.push({
      regionCode: entry.country_code,
      eurPrice: entry.calculate_value,
      nativePrice: formatNativePrice(
        Number.isFinite(numericPrice) ? numericPrice : entry.calculate_value,
        nativeCurrency,
        nativeCurrency === 'JPY' ? 0 : decimals,
      ),
      nativeCurrency,
    });
  }

  return deduped.slice(0, 8);
}

/** Every `*.md` under `src/content/posts/{locale}/` (cross-platform). */
export function listAllBlogPostMarkdownPaths() {
  const root = join(__pricingUtilsDir, '..', 'src', 'content', 'posts');
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const locDir = join(root, entry.name);
    let names;
    try {
      names = readdirSync(locDir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.endsWith('.md') || name.startsWith('.')) continue;
      out.push(join(locDir, name));
    }
  }
  return out.sort();
}
