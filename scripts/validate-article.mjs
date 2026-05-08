#!/usr/bin/env node
/**
 * Validate generated Markdown articles against the content schema
 * and quality checklist rules.
 *
 * Usage:
 *   node scripts/validate-article.mjs <path-to-md-file>
 *   node scripts/validate-article.mjs --all
 *   node scripts/validate-article.mjs src/content/posts/en/hades-worth-it.md
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

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

function collectAllPostMdFiles() {
  const root = join(__dirname, '../src/content/posts');
  const out = [];
  if (!existsSync(root)) return out;
  for (const loc of readdirSync(root)) {
    const locDir = join(root, loc);
    if (!statSync(locDir).isDirectory()) continue;
    for (const name of readdirSync(locDir)) {
      if (name.endsWith('.md')) out.push(join(locDir, name));
    }
  }
  return out;
}
import {
  buildCardPricePayload,
  buildMarkdownPriceTable,
  formatConvertedPriceFromEur,
  getEurExchangeRates,
  inferLocaleFromFilePath,
  normalizePriceRows,
  stripUtf8Bom,
} from './article-pricing-utils.mjs';
import { formatFrontmatterSchemaErrors } from './article-post-frontmatter-schema.mjs';

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

const READER_FACING_FIELDS = [
  'title',
  'description',
  'gameTitle',
  'heroNote',
  'decision',
  'priceSignal',
  'listingTakeaway',
  'whatItIs',
  'bestFor',
  'avoidIf',
  'consensusPraise',
  'mainFriction',
  'timeFit',
  'fitLabel',
  'timingNote',
  'communityVibe',
  'playtime',
  'reviewSignal',
  'takeaway',
  'playStyle',
  'timeCommitment',
  'playMode',
  'whyNow',
  'currentDeal',
  'nearHistoricalLow',
  'salePattern',
  'tldr',
  'faq',
  'playerVoices',
  'communityMemes',
];

const EMPTY_PARENTHESES = /[（(]\s*[）)]/u;

const READER_SOURCE_LEAKS = [
  {
    pattern: /\b(?:HLTB|HowLongToBeat)\b/i,
    message: 'Reader-facing copy must not name HLTB/HowLongToBeat; use plain hour bands only.',
  },
];

const BODY_INTERNAL_LEAKS = [
  {
    pattern: /\bpriceRows\b/i,
    message: 'Article body must not expose internal field name `priceRows`.',
  },
  {
    pattern: /\bfrontmatter\b/i,
    message: 'Article body must not expose internal field name `frontmatter`.',
  },
];

const LOCALIZED_TEMPLATE_LEAKS = [
  /historical low\s*\/\s*sale\s*\/\s*discount/i,
  /discount\s*\/\s*sale[-\s]?hinweis/i,
  /nota de discount\s*\/\s*sale/i,
  /signal discount\s*\/\s*sale/i,
  /sinal de discount\s*\/\s*sale/i,
];

const GENERIC_COMMUNITY_VIBE_PATTERNS = [
  /评价不错；价格与节奏影响取舍/u,
  /price and pacing divide players/iu,
  /価格とテンポで判断/u,
  /prix et rythme divisent/iu,
  /precio y ritmo dividen/iu,
  /Preis und Tempo teilen/iu,
  /preço e ritmo dividem/iu,
];

const GENERIC_TAKEAWAY_PATTERNS = [
  /gameplay-fit call first/i,
  /先看玩法是否对味/u,
  /まず遊びの相性/u,
  /se juge d’abord sur l’envie de jouer/iu,
  /se decide primero por encaje de juego/iu,
  /zuerst eine Frage des Spielgeschmacks/iu,
  /é antes uma decisão de gosto/iu,
];

const GENERIC_WHAT_IT_IS_PATTERNS = [
  /\s[—-]\s.+\bon\s+(Nintendo\s+Switch|NS2)\.?$/iu,
  /\s[—-]\s*(Nintendo\s+Switch|Switch|NS2)\s*版/u,
  /\s[—-]\s*.+版.+。?$/u,
  /\s[—-]\s.+\b(sur|en|auf|no)\s+(Nintendo\s+Switch|NS2)\.?$/iu,
];

const PLAYTIME_WHAT_IT_IS_PATTERNS = [
  /[~～]?\s*\d+\s*[–—\-~+·]?\s*\d*\s*(h|hr|hrs|hour|hours|min|minutes|std\.?|heures?|horas?)\b/iu,
  /[~～]?\s*\d+\s*[–—\-~+·]?\s*\d*\s*(小时|小時|分钟|分鐘|時間|分)/u,
  /(主线|本編|campagne|historia|story|extras?|コンプ|全收集|complete|completion|100\s*%)/iu,
];

function isPlaytimeWhatItIs(value) {
  const text = String(value || '').trim();
  return text !== '' && PLAYTIME_WHAT_IT_IS_PATTERNS.some((pattern) => pattern.test(text));
}

function isClippedWhatItIs(value) {
  return /(?:…|\.\.\.)\s*[。.!！?？]?\s*$/u.test(String(value || '').trim());
}

function isGenericWhatItIs(value) {
  const text = String(value || '').trim();
  return text !== '' && GENERIC_WHAT_IT_IS_PATTERNS.some((pattern) => pattern.test(text));
}

function validateWhatItIs(fm, errors) {
  if (typeof fm.whatItIs !== 'string') return;
  if (isGenericWhatItIs(fm.whatItIs)) {
    errors.push('whatItIs still uses generic genre/platform/title wording; rewrite it as a game-specific gameplay/system anchor.');
  }
  if (isPlaytimeWhatItIs(fm.whatItIs)) {
    errors.push('whatItIs must not repeat playtime/completion copy; use gameplay systems, mode structure, or core loop instead.');
  }
  if (isClippedWhatItIs(fm.whatItIs)) {
    errors.push('whatItIs must not end with a clipped ellipsis; shorten it into a complete gameplay/system phrase.');
  }
}

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

function collectStringLeaves(value) {
  if (value == null) return [];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStringLeaves(item));
  }
  if (typeof value === 'object') {
    return Object.values(value).flatMap((item) => collectStringLeaves(item));
  }
  return [];
}

function collectReaderFacingFrontmatterText(fm) {
  return READER_FACING_FIELDS
    .flatMap((field) => collectStringLeaves(fm[field]))
    .join('\n');
}

function validateReaderFacingCopy(filePath, fm, body, errors) {
  const locale = inferLocaleFromFilePath(filePath);
  const frontmatterText = collectReaderFacingFrontmatterText(fm);
  const readerText = `${frontmatterText}\n${body || ''}`;

  if (EMPTY_PARENTHESES.test(readerText)) {
    errors.push('Reader-facing copy contains empty parentheses: remove the placeholder instead of rendering “()” / “（）”.');
  }

  for (const { pattern, message } of READER_SOURCE_LEAKS) {
    if (pattern.test(readerText)) errors.push(message);
  }

  if (body) {
    for (const { pattern, message } of BODY_INTERNAL_LEAKS) {
      if (pattern.test(body)) errors.push(message);
    }
  }

  if (locale && locale !== 'en' && LOCALIZED_TEMPLATE_LEAKS.some((pattern) => pattern.test(readerText))) {
    errors.push('Localized copy contains untranslated discount-template wording such as “historical low / sale / discount”.');
  }

  if (
    fm.hasOtherPlatforms === true &&
    (!Array.isArray(fm.otherPlatformLabels) || fm.otherPlatformLabels.filter(Boolean).length === 0)
  ) {
    errors.push('hasOtherPlatforms=true requires non-empty otherPlatformLabels; otherwise the platform guide should stay generic.');
  }

  validateWhatItIs(fm, errors);
  validateBestFor(fm, errors);

  if (typeof fm.takeaway === 'string' && GENERIC_TAKEAWAY_PATTERNS.some((pattern) => pattern.test(fm.takeaway))) {
    errors.push('takeaway still uses the generic generated template; rewrite it with a game-specific feature + current price/timing cue.');
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
    .replace(/[《》『』「」“”"'’‘]/g, '')
    .replace(/[（(].*?[）)]/g, '')
    .replace(/[：:—–\-_,，、.。!！?？]/g, '')
    .replace(/\s+/g, '');
}

function getEntityNameCandidates(value = '') {
  const raw = String(value).trim();
  const candidates = [raw];
  const beforeParen = raw.split(/[（(]/)[0]?.trim();
  if (beforeParen) candidates.push(beforeParen);
  return [...new Set(candidates.map(normalizeEntityName).filter(Boolean))];
}

function includesGameName(text, gameTitle) {
  const normalizedText = normalizeEntityName(text);
  return getEntityNameCandidates(gameTitle).some((candidate) => normalizedText.includes(candidate));
}

function keywordSet(value) {
  return new Set(String(value || '')
    .toLowerCase()
    .replace(/[™®©《》『』「」“”"'’‘（）()：:—–\-_,，.。!！?？;；]/g, ' ')
    .split(/\s+|、|，|\/|\bet\b|\by\b|\bund\b|\be\b|\band\b|と/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3));
}

function keywordOverlapStats(a, b) {
  const left = keywordSet(a);
  const right = keywordSet(b);
  if (!left.size || !right.size) return { shared: 0, ratio: 0 };
  let shared = 0;
  for (const key of left) if (right.has(key)) shared += 1;
  return { shared, ratio: shared / Math.min(left.size, right.size) };
}

function overlapsCommunityVibe(value, communityVibe) {
  const left = normalizeEntityName(value || '');
  const right = normalizeEntityName(communityVibe || '');
  if (!left || !right) return false;
  if (left === right || left.includes(right) || right.includes(left)) return true;
  const stats = keywordOverlapStats(value, communityVibe);
  return stats.shared >= 2 && stats.ratio >= 0.45;
}

function validateBestFor(fm, errors) {
  if (typeof fm.bestFor !== 'string' || typeof fm.communityVibe !== 'string') return;
  if (overlapsCommunityVibe(fm.bestFor, fm.communityVibe)) {
    errors.push('bestFor/core audience overlaps communityVibe/player consensus; rewrite bestFor as an audience-fit statement, not a gameplay hot-take repeat.');
  }
}

function validateTitleContainsGameTitle(fm, warnings) {
  if (!fm.title || !fm.gameTitle) return;
  if (!includesGameName(fm.title, fm.gameTitle)) {
    warnings.push('title does not include gameTitle after normalizing quote wrappers and trademark symbols; verify this is intentional.');
  }
}

function validateCommunityVibe(fm, errors, warnings) {
  if (!fm.communityVibe || String(fm.communityVibe).trim() === '') {
    warnings.push('communityVibe is missing: list/decision cards use it under the Player Consensus label (translations: card.playerConsensus).');
    return;
  }
  const value = String(fm.communityVibe);
  if (GENERIC_COMMUNITY_VIBE_PATTERNS.some((pattern) => pattern.test(value))) {
    warnings.push('communityVibe uses generic price/pacing filler; rewrite it as a gameplay/player-consensus quote.');
  }
}

function validatePriceRowsShape(fm, errors) {
  if (!Array.isArray(fm.priceRows)) return;
  const seen = new Set();
  for (let i = 0; i < fm.priceRows.length; i++) {
    const row = fm.priceRows[i];
    if (!row || typeof row !== 'object') {
      errors.push(`priceRows[${i}] must be an object`);
      continue;
    }
    const regionCode = String(row.regionCode || '').trim();
    if (!regionCode) {
      errors.push(`priceRows[${i}] missing regionCode`);
    } else {
      if (seen.has(regionCode)) errors.push(`priceRows contains duplicate regionCode: ${regionCode}`);
      seen.add(regionCode);
      if (regionCode === 'AR') errors.push('priceRows must not include AR; Argentina pricing is excluded from this pipeline');
    }
    if (typeof row.eurPrice !== 'number' || !Number.isFinite(row.eurPrice) || row.eurPrice < 0) {
      errors.push(`priceRows[${i}].eurPrice must be a finite non-negative number`);
    }
    if (!row.nativePrice || typeof row.nativePrice !== 'string') {
      errors.push(`priceRows[${i}].nativePrice must be a non-empty string`);
    }
    if (!row.nativeCurrency || typeof row.nativeCurrency !== 'string') {
      errors.push(`priceRows[${i}].nativeCurrency must be a non-empty string`);
    }
  }
}

function loadEnglishSibling(filePath) {
  const locale = inferLocaleFromFilePath(filePath);
  if (!locale || locale === 'en') return null;
  const slug = basename(filePath);
  const englishPath = join(__dirname, '../src/content/posts/en', slug);
  if (!existsSync(englishPath)) return null;
  const { fm } = parseFrontmatter(stripUtf8Bom(readFileSync(englishPath, 'utf8')));
  return fm || null;
}

function validateLocalizedSiblingSignals(filePath, fm, warnings) {
  const locale = inferLocaleFromFilePath(filePath);
  if (!locale || locale === 'en') return;
  const english = loadEnglishSibling(filePath);
  if (!english) return;
  if (fm.title && english.title && normalizeEntityName(fm.title) === normalizeEntityName(english.title)) {
    warnings.push('localized title exactly matches English sibling; verify the localized article title was not left untranslated.');
  }
}

function validatePriceCopySignals(fm, warnings) {
  if ((Array.isArray(fm.priceRows) || fm.cardPrice) && (!fm.currentDeal || String(fm.currentDeal).trim() === '')) {
    warnings.push('currentDeal is missing even though priceRows/cardPrice exists; list cards may lose the concrete deal signal.');
  }
  if (fm.cardPriceRegionCode && (!fm.cardPriceRegion || String(fm.cardPriceRegion).trim() === '')) {
    warnings.push('cardPriceRegionCode is set but cardPriceRegion is missing; run pricing sync to restore localized card metadata.');
  }
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

/** Detail page body (markdown after frontmatter): brand + gamegulf.com links count together. */
function countGameGulfInBody(body) {
  if (!body || typeof body !== 'string') return 0;
  const matches = body.match(/gamegulf/gi);
  return matches ? matches.length : 0;
}

function incrementCount(map, key) {
  map[key] = (map[key] || 0) + 1;
}

function topCounts(map, limit = 10) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([message, count]) => ({ message, count }));
}

function summarizeResults(results) {
  const byLocale = {};
  const errorCounts = {};
  const warningCounts = {};
  const filesWithMostIssues = results
    .map((result) => ({
      file: result.file,
      status: result.status,
      errors: result.errors.length,
      warnings: result.warnings.length,
      totalIssues: result.errors.length + result.warnings.length,
    }))
    .filter((item) => item.totalIssues > 0)
    .sort((a, b) => b.totalIssues - a.totalIssues || b.errors - a.errors || a.file.localeCompare(b.file))
    .slice(0, 20);

  for (const result of results) {
    const locale = inferLocaleFromFilePath(result.file) || 'unknown';
    if (!byLocale[locale]) byLocale[locale] = { total: 0, pass: 0, fail: 0, warnings: 0 };
    byLocale[locale].total += 1;
    if (result.status === 'FAIL') byLocale[locale].fail += 1;
    else if (result.status === 'PASS') byLocale[locale].pass += 1;
    byLocale[locale].warnings += result.warnings.length;

    for (const error of result.errors) incrementCount(errorCounts, error);
    for (const warning of result.warnings) incrementCount(warningCounts, warning);
  }

  return {
    totalFiles: results.length,
    pass: results.filter((r) => r.status === 'PASS').length,
    fail: results.filter((r) => r.status === 'FAIL').length,
    error: results.filter((r) => r.status === 'ERROR').length,
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
    totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
    byLocale,
    topErrors: topCounts(errorCounts),
    topWarnings: topCounts(warningCounts),
    filesWithMostIssues,
  };
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

  const schemaError = formatFrontmatterSchemaErrors(filePath, fm);
  if (schemaError) {
    errors.push(schemaError);
  }

  validateTitleContainsGameTitle(fm, warnings);
  validateCommunityVibe(fm, errors, warnings);
  validatePriceRowsShape(fm, errors);
  validateLocalizedSiblingSignals(filePath, fm, warnings);
  validatePriceCopySignals(fm, warnings);

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
  validateReaderFacingCopy(filePath, fm, body, errors);

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

    const gg = countGameGulfInBody(bodyClean);
    if (gg < 3) {
      errors.push(
        `Article body must mention GameGulf at least 3 times (case-insensitive "gamegulf" count in markdown body: ${gg}; run node scripts/one-off/inject-gamegulf-body-paragraph.mjs on this file if appropriate)`,
      );
    }
  }

  const status = errors.length > 0 ? 'FAIL' : 'PASS';
  return { file: filePath, status, errors, warnings };
}

// --- main ---
let args = process.argv.slice(2);
const summaryMode = args.includes('--summary');
args = args.filter((arg) => arg !== '--summary');
let files = args;
if (files.length === 1 && files[0] === '--all') {
  files = collectAllPostMdFiles();
}
if (files.length === 0) {
  console.error(JSON.stringify({
    status: 'ERROR',
    message: 'Usage: node scripts/validate-article.mjs <file1.md> [file2.md ...] | --all [--summary]',
  }));
  process.exit(2);
}

const rates = await getEurExchangeRates();
const results = await Promise.all(files.map((file) => validate(file, rates)));
const hasErrors = results.some((r) => r.status === 'FAIL');

process.stdout.write(`${JSON.stringify(summaryMode ? summarizeResults(results) : results, null, 2)}\n`);
process.exitCode = hasErrors ? 1 : 0;
