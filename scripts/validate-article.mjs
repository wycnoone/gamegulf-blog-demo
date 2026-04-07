#!/usr/bin/env node
/**
 * Validate generated Markdown articles against the content schema
 * and quality checklist rules.
 *
 * Usage:
 *   node scripts/validate-article.mjs <path-to-md-file>
 *   node scripts/validate-article.mjs src/content/posts/en/hades-worth-it.md
 *   node scripts/validate-article.mjs src/content/posts/en/*.md   (shell expansion)
 *
 * Output: JSON array of { file, status, errors[], warnings[] }
 * Exit codes:
 *   0 = all files valid
 *   1 = one or more validation errors
 *   2 = usage error
 *
 * Field ↔ UI (do not confuse):
 * - communityVibe → decision/list cards, label from translations `card.playerConsensus` (e.g. zh-hans 玩家热评). ≤64 chars.
 * - playerVoices → article detail structured block only; not used for that card line.
 */

import { readFileSync, existsSync } from 'node:fs';
import yaml from 'js-yaml';
import {
  buildCardPricePayload,
  buildMarkdownPriceTable,
  formatConvertedPriceFromEur,
  getEurExchangeRates,
  inferLocaleFromFilePath,
  normalizePriceRows,
  stripUtf8Bom,
} from './article-pricing-utils.mjs';

const REQUIRED_FIELDS = [
  'title', 'description', 'publishedAt', 'category', 'gameTitle', 'platform',
  'author', 'readingTime', 'decision', 'priceSignal', 'wishlistHref',
  'priceTrackHref', 'gameHref', 'membershipHref', 'heroStat', 'heroNote',
  'tags', 'faq',
];

const RECOMMENDED_FIELDS = [
  'verdict', 'takeaway', 'bestFor', 'timingNote', 'tldr', 'cardPrice',
  'cardPriceRegion', 'whatItIs', 'avoidIf', 'consensusPraise',
  'mainFriction', 'timeFit', 'fitLabel', 'priceCall', 'confidence',
  'priceSignal', 'currentDeal', 'salePattern', 'playerVoices',
];

/** Limits for card/detail surfaces; communityVibe = list card Player Consensus (`card.playerConsensus`), not playerVoices. */
const CHAR_LIMITS = {
  whatItIs: 90,
  bestFor: 60,
  communityVibe: 64,
  listingTakeaway: 96,
  avoidIf: 72,
  consensusPraise: 82,
  mainFriction: 84,
  timeFit: 82,
  fitLabel: 72,
  tldr: 160,
};

const VALID_CATEGORIES = ['worth-it', 'buy-now-or-wait'];
const VALID_VERDICTS = ['buy_now', 'wait_for_sale', 'right_player', 'not_best_fit'];
const VALID_PRICE_CALLS = ['buy', 'wait', 'watch'];
const VALID_CONFIDENCE = ['high', 'medium', 'low'];
const VALID_QUICK_FILTERS = [
  'co_op', 'long_rpg', 'family_friendly', 'nintendo_first_party',
  'short_sessions', 'under_20', 'great_on_sale', 'rarely_discounted',
];
const VALID_PLAYER_NEEDS = [
  'buy_now', 'wait_for_sale', 'long_games', 'party_games',
  'cozy', 'beginner_friendly', 'casual', 'local_multiplayer', 'value_for_money',
];
const VALID_SENTIMENTS = ['positive', 'negative', 'mixed'];

const PRICE_TABLE_REGION_HEADERS = [
  'region', 'country', 'eshop', 'store',
  '地区', '区域', '区服', '国家',
  'region', 'région', 'país', 'land', 'região', '地域',
];

const PRICE_TABLE_PRICE_HEADERS = [
  'price', 'deal', 'current', 'discount',
  '价格', '售价', '现价', '折扣',
  'prix', 'precio', 'preis', 'preco', 'preço', '値段', '価格',
];

const DISCOUNT_HISTORY_TERMS = [
  'all-time low', 'historical low', 'discount', 'sale',
  '历史低价', '历史最低', '折扣', '打折',
  '最安値', 'セール',
  'plus bas historique', 'promo',
  'mínimo histórico', 'oferta',
  'historischer tiefstpreis', 'rabatt',
  'menor preço histórico', 'promoção',
];

const ARGENTINA_PATTERNS = [
  /argentina/iu,
  /\bars\b/u,
  /阿根廷/u,
  /アルゼンチン/u,
  /argentine/iu,
  /argentinien/iu,
];

/** Cover strip + list cards must show Metacritic critic score, not HLTB. */
const HERO_REVIEW_FORBIDDEN = [
  /\bhltb\b/i,
  /howlongtobeat/i,
  /how\s*long\s*to\s*beat/i,
];

const HERO_REVIEW_NON_METACRITIC_ALLOWLIST = [
  /^long-tail cozy sim$/iu,
  /^长线治愈模拟$/,
];

function validateMetacriticHeroFields(fm, errors) {
  for (const field of ['heroStat', 'reviewSignal']) {
    const value = fm[field];
    if (!value || typeof value !== 'string') continue;
    const t = value.trim();
    if (HERO_REVIEW_FORBIDDEN.some((re) => re.test(t))) {
      errors.push(
        `${field} must not reference HLTB/HowLongToBeat — use Metacritic critic score (or approved non-score label); HLTB belongs in playtime/body only`,
      );
      continue;
    }
    if (/\bmetacritic\b/i.test(t)) continue;
    if (HERO_REVIEW_NON_METACRITIC_ALLOWLIST.some((re) => re.test(t))) continue;
    errors.push(
      `${field} must include "Metacritic" and a 2–3 digit critic score (cover + cards), or match allowlist: Long-tail cozy sim / 长线治愈模拟`,
    );
  }
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { fm: null, body: content, raw: '' };
  return {
    fm: yaml.load(match[1]),
    body: content.slice(match[0].length),
    raw: match[1],
  };
}

function normalizeEntityName(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/\s+/g, ' ');
}

function startsWithGameName(text, gameTitle) {
  const normalizedText = normalizeEntityName(text);
  const normalizedTitle = normalizeEntityName(gameTitle);
  return normalizedText.startsWith(normalizedTitle);
}

function extractMarkdownTables(body) {
  const lines = body.split(/\r?\n/);
  const tables = [];

  for (let i = 0; i < lines.length; i++) {
    const header = lines[i];
    const separator = lines[i + 1];
    if (!header?.includes('|')) continue;
    if (!separator || !/^[\s|:-]+$/.test(separator)) continue;

    const tableLines = [header, separator];
    let j = i + 2;
    while (j < lines.length && lines[j].includes('|')) {
      tableLines.push(lines[j]);
      j += 1;
    }

    tables.push(tableLines);
    i = j - 1;
  }

  return tables.map((tableLines) => {
    const headerCells = tableLines[0].split('|').map((c) => c.trim().toLowerCase()).filter(Boolean);
    const rows = tableLines.slice(2).filter((line) => line.split('|').some((c) => c.trim()));
    return { headerCells, rows, rawLines: tableLines };
  });
}

function hasExpectedPriceTable(body) {
  const tables = extractMarkdownTables(body);
  return tables.some(({ headerCells, rows }) => {
    const hasRegionHeader = headerCells.some((cell) =>
      PRICE_TABLE_REGION_HEADERS.some((term) => cell.includes(term)));
    const hasPriceHeader = headerCells.some((cell) =>
      PRICE_TABLE_PRICE_HEADERS.some((term) => cell.includes(term)));
    return hasRegionHeader && hasPriceHeader && rows.length >= 4 && rows.length <= 8;
  });
}

function hasStructuredPriceRows(fm) {
  return Array.isArray(fm.priceRows) && fm.priceRows.length >= 4 && fm.priceRows.length <= 8;
}

function normalizeTableString(table) {
  return table
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .join('\n');
}

async function validateStructuredPricing(filePath, fm, body, errors, warnings, rates) {
  if (!hasStructuredPriceRows(fm)) {
    if (hasExpectedPriceTable(body)) {
      warnings.push('priceRows missing; validator cannot numerically verify locale-adaptive pricing');
    }
    return;
  }

  const locale = inferLocaleFromFilePath(filePath);
  if (!locale) {
    errors.push('Could not infer locale from file path for pricing validation');
    return;
  }

  const priceRows = normalizePriceRows(fm.priceRows);
  if (priceRows.length < 4 || priceRows.length > 8) {
    errors.push(`priceRows must contain 4-8 entries (actual: ${priceRows.length})`);
    return;
  }

  const expectedTable = normalizeTableString(await buildMarkdownPriceTable(priceRows, locale, rates));
  const actualTables = extractMarkdownTables(body).map(({ rawLines }) =>
    normalizeTableString(rawLines.join('\n')));
  if (!actualTables.includes(expectedTable)) {
    errors.push('Regional price table does not match priceRows for this locale; run pricing sync');
  }

  const cardPayload = buildCardPricePayload(priceRows, locale);
  if (!cardPayload) {
    errors.push('priceRows could not produce card pricing metadata');
    return;
  }

  const expectedCardPrice = await formatConvertedPriceFromEur(cardPayload.cardPriceEur, locale, rates);
  if (fm.cardPrice !== expectedCardPrice) {
    errors.push(`cardPrice mismatch: expected "${expectedCardPrice}"`);
  }
  if (fm.cardPriceEur !== cardPayload.cardPriceEur) {
    errors.push(`cardPriceEur mismatch: expected ${cardPayload.cardPriceEur}`);
  }
  if (fm.cardPriceRegionCode !== cardPayload.cardPriceRegionCode) {
    errors.push(`cardPriceRegionCode mismatch: expected "${cardPayload.cardPriceRegionCode}"`);
  }
  if (fm.cardPriceRegion !== cardPayload.cardPriceRegion) {
    errors.push(`cardPriceRegion mismatch: expected "${cardPayload.cardPriceRegion}"`);
  }
  if (fm.cardPriceNative !== priceRows[0].nativePrice) {
    errors.push(`cardPriceNative mismatch: expected "${priceRows[0].nativePrice}"`);
  }
  if (fm.cardPriceNativeCurrency !== priceRows[0].nativeCurrency) {
    errors.push(`cardPriceNativeCurrency mismatch: expected "${priceRows[0].nativeCurrency}"`);
  }
}

function hasDiscountHistoryAnalysis(body) {
  const normalizedBody = body.toLowerCase();
  const hasTerms = DISCOUNT_HISTORY_TERMS.filter((term) => normalizedBody.includes(term.toLowerCase())).length >= 2;
  const hasConcreteData = /\b20\d{2}\b/.test(body) && /(?:€|\$|¥|£)\s?\d/.test(body);
  return hasTerms && hasConcreteData;
}

async function validate(filePath, rates) {
  const errors = [];
  const warnings = [];

  if (!existsSync(filePath)) {
    return { file: filePath, status: 'ERROR', errors: ['File not found'], warnings: [] };
  }

  const content = stripUtf8Bom(readFileSync(filePath, 'utf8'));

  // 1. YAML parsing
  let fm, body, raw;
  try {
    ({ fm, body, raw } = parseFrontmatter(content));
  } catch (e) {
    return { file: filePath, status: 'FAIL', errors: [`YAML parse error: ${e.message}`], warnings: [] };
  }

  if (!fm) {
    return { file: filePath, status: 'FAIL', errors: ['No frontmatter found'], warnings: [] };
  }

  // 2. Duplicate key check (basic — scan raw for repeated top-level keys)
  const keyLines = raw.split('\n').filter((l) => /^[a-zA-Z]/.test(l));
  const keyCounts = {};
  for (const line of keyLines) {
    const k = line.split(':')[0].trim();
    keyCounts[k] = (keyCounts[k] || 0) + 1;
  }
  for (const [k, c] of Object.entries(keyCounts)) {
    if (c > 1) errors.push(`Duplicate YAML key: "${k}" appears ${c} times`);
  }

  // 3. Required fields
  for (const f of REQUIRED_FIELDS) {
    if (fm[f] === undefined || fm[f] === null || fm[f] === '') {
      errors.push(`Missing required field: ${f}`);
    }
  }

  validateMetacriticHeroFields(fm, errors);

  // 4. Recommended fields
  for (const f of RECOMMENDED_FIELDS) {
    if (fm[f] === undefined) {
      warnings.push(`Missing recommended field: ${f}`);
    }
  }

  // 5. Enum validation
  if (fm.category && !VALID_CATEGORIES.includes(fm.category)) {
    errors.push(`Invalid category: "${fm.category}" (expected: ${VALID_CATEGORIES.join(', ')})`);
  }
  if (fm.verdict && !VALID_VERDICTS.includes(fm.verdict)) {
    errors.push(`Invalid verdict: "${fm.verdict}"`);
  }
  if (fm.priceCall && !VALID_PRICE_CALLS.includes(fm.priceCall)) {
    errors.push(`Invalid priceCall: "${fm.priceCall}"`);
  }
  if (fm.confidence && !VALID_CONFIDENCE.includes(fm.confidence)) {
    errors.push(`Invalid confidence: "${fm.confidence}"`);
  }
  if (fm.quickFilters) {
    for (const qf of fm.quickFilters) {
      if (!VALID_QUICK_FILTERS.includes(qf)) {
        errors.push(`Invalid quickFilter: "${qf}"`);
      }
    }
  }
  if (fm.playerNeeds) {
    for (const pn of fm.playerNeeds) {
      if (!VALID_PLAYER_NEEDS.includes(pn)) {
        errors.push(`Invalid playerNeed: "${pn}"`);
      }
    }
  }

  // 6. Character limits
  for (const [field, limit] of Object.entries(CHAR_LIMITS)) {
    if (fm[field] && typeof fm[field] === 'string' && fm[field].length > limit) {
      const hint =
        field === 'communityVibe'
          ? ' (list card Player Consensus / card.playerConsensus; not playerVoices)'
          : '';
      errors.push(`${field} exceeds ${limit} chars (actual: ${fm[field].length})${hint}`);
    }
  }

  if (
    Array.isArray(fm.playerVoices) &&
    fm.playerVoices.length > 0 &&
    (!fm.communityVibe || String(fm.communityVibe).trim() === '')
  ) {
    warnings.push(
      'playerVoices is set but communityVibe is empty: list/decision cards use communityVibe under the Player Consensus label (translations: card.playerConsensus); playerVoices does not appear on that card.',
    );
  }

  // 7. Structured array validation
  if (fm.tags) {
    if (!Array.isArray(fm.tags)) {
      errors.push('tags must be an array');
    } else if (fm.tags.length < 3 || fm.tags.length > 8) {
      warnings.push(`tags count ${fm.tags.length} (recommended: 4-6)`);
    }
  }

  if (fm.faq) {
    if (!Array.isArray(fm.faq)) {
      errors.push('faq must be an array');
    } else {
      for (let i = 0; i < fm.faq.length; i++) {
        const item = fm.faq[i];
        if (!item.question) errors.push(`faq[${i}] missing question`);
        if (!item.answer) errors.push(`faq[${i}] missing answer`);
        if (item.answer && fm.gameTitle && !startsWithGameName(item.answer, fm.gameTitle)) {
          errors.push(`faq[${i}] answer must start with gameTitle`);
        }
      }
    }
  }

  if (fm.playerVoices) {
    if (!Array.isArray(fm.playerVoices)) {
      errors.push('playerVoices must be an array');
    } else {
      for (let i = 0; i < fm.playerVoices.length; i++) {
        const v = fm.playerVoices[i];
        if (!v.quote) errors.push(`playerVoices[${i}] missing quote`);
        if (v.sentiment && !VALID_SENTIMENTS.includes(v.sentiment)) {
          errors.push(`playerVoices[${i}] invalid sentiment: "${v.sentiment}"`);
        }
      }
    }
  }

  if (fm.tldr && fm.gameTitle && !startsWithGameName(fm.tldr, fm.gameTitle)) {
    errors.push('tldr must start with gameTitle');
  }

  // 8. Argentina exclusion check
  if (ARGENTINA_PATTERNS.some((pattern) => pattern.test(content))) {
    errors.push('Argentina reference found — this pipeline excludes AR pricing');
  }

  // 9. Link validity (format check, not HTTP)
  for (const linkField of ['gameHref', 'priceTrackHref', 'wishlistHref', 'membershipHref']) {
    if (fm[linkField] && !fm[linkField].startsWith('https://')) {
      errors.push(`${linkField} should be an HTTPS URL`);
    }
  }

  // 10. Body quality checks
  if (body) {
    const bodyClean = body.trim();
    if (bodyClean.length < 500) {
      warnings.push(`Article body is very short (${bodyClean.length} chars)`);
    }

    const headings = bodyClean.match(/^##\s+.+/gm) || [];
    if (headings.length < 3) {
      warnings.push(`Only ${headings.length} H2 headings found (recommend ≥3)`);
    }

    if (fm.category === 'worth-it' || fm.category === 'buy-now-or-wait') {
      if (!hasStructuredPriceRows(fm) && !hasExpectedPriceTable(bodyClean)) {
        errors.push('Regional price comparison table missing (priceRows or markdown table with 4-8 rows required)');
      }
      await validateStructuredPricing(filePath, fm, bodyClean, errors, warnings, rates);
      if (!hasDiscountHistoryAnalysis(bodyClean)) {
        errors.push('Discount history analysis paragraph missing concrete historical data');
      }
    }
  }

  const status = errors.length > 0 ? 'FAIL' : 'PASS';
  return { file: filePath, status, errors, warnings };
}

// --- main ---
const files = process.argv.slice(2);
if (files.length === 0) {
  console.error(JSON.stringify({
    status: 'ERROR',
    message: 'Usage: node scripts/validate-article.mjs <file1.md> [file2.md ...]',
  }));
  process.exit(2);
}

const rates = await getEurExchangeRates();
const results = await Promise.all(files.map((file) => validate(file, rates)));
const hasErrors = results.some((r) => r.status === 'FAIL');

console.log(JSON.stringify(results, null, 2));
process.exit(hasErrors ? 1 : 0);
