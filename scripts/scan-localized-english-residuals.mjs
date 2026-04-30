#!/usr/bin/env node
/**
 * Scan non-English localized article markdown for obvious untranslated English
 * template fragments. It scans frontmatter values (not YAML keys) plus Markdown
 * body text, with allowlists for product names, URLs, platform names, and game
 * titles that are legitimately shared across locales.
 *
 * Usage:
 *   node scripts/scan-localized-english-residuals.mjs <path-to-md-file> [...]
 *   node scripts/scan-localized-english-residuals.mjs --all
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const postsRoot = join(repoRoot, 'src/content/posts');

const LOCALE_ALLOWLIST = new Set(['zh-hans', 'ja', 'fr', 'es', 'de', 'pt']);

const PHRASE_PATTERNS = [
  /\bToday[’']s Deals\b/i,
  /\bYour storefront\b/i,
  /\bexpected time commitment\b/i,
  /\bHow long is\b/i,
  /\bWhere should I check\b/i,
  /\buse the GameGulf detail grid\b/i,
  /\bwithout guessing conversions\b/i,
  /\bCore loop\b/i,
  /\bScope\b/i,
  /\bTone\b/i,
  /\bControls\b/i,
  /\bController-first\b/i,
  /\bSale-Timing\b/i,
  /\bpatch notes copium\b/i,
  /\bwishlist graveyard\b/i,
  /\bregion hopper\b/i,
  /\bsale bingo\b/i,
  /\bhandheld pixel/i,
  /\bhandheld impressions\b/i,
  /\bMSRP(?:-only| tiers?| sticker shock)?\b/i,
  /\bDocked\b/i,
  /\bHandheld\b/i,
  /\bSingle-player unless store lists multiplayer\b/i,
  /\bWorth it on a deep sale only\b/i,
  /\bRuns fine for me in handheld\b/i,
  /\bCheck your own region first\b/i,
  /\bBuy now if the pitch fits\b/i,
  /\bwait if MSRP-only regions\b/i,
  /\bIndexed pricing highlights\b/i,
  /\bstore pitch vs\. critic band\b/i,
  /\bPlayers who want\b/i,
  /\bYou want a different genre mix\b/i,
  /\bGenre fatigue or sale FOMO\b/i,
  /\bbefore checkout\b/i,
  /\bToday's Deals stack\b/i,
  /\bcheapest tracked territories\b/i,
  /\btracked discount moves\b/i,
  /\bsales are part of the product lifecycle\b/i,
];

const ENGLISH_CONNECTOR = /\b(?:a|an|and|are|as|at|be|before|buy|checkout|compare|cost|deal|deals|discount|does|for|from|game|genre|grid|if|in|is|it|near|now|of|on|only|or|price|pricing|region|regions|sale|should|store|the|this|to|use|wait|when|where|while|with|without|worth|you|your)\b/i;

const ALWAYS_ALLOWED_TERMS = [
  'GameGulf',
  'gamegulf.com',
  'Nintendo Switch',
  'Nintendo',
  'Switch',
  'Metacritic',
  'eShop',
  'Steam',
  'DLC',
  'FPS',
  'fps',
  'URL',
  'EUR',
  'USD',
  'GBP',
  'JPY',
  'BRL',
  'MXN',
  'ARS',
  'CLP',
  'PEN',
  'COP',
  'ZAR',
  'HKD',
  'KRW',
  'TWD',
  'AUD',
  'CAD',
  'NZD',
  'NOK',
  'SEK',
  'DKK',
  'PLN',
  'CHF',
  'CZK',
  'HUF',
  'RON',
  'BGN',
  'HRK',
  'TRY',
  'Persona 5 Royal',
  'Persona',
  'Tetris Effect: Connected',
  'Tetris Effect Connected',
  'Tetris',
  'Hades',
  'Atlus',
  'P-Studio',
  'Resonair',
  'Monstars',
  'Enhance',
  'Supergiant Games',
];

function collectAllPostMdFiles() {
  const out = [];
  if (!existsSync(postsRoot)) return out;
  for (const locale of readdirSync(postsRoot)) {
    const localeDir = join(postsRoot, locale);
    if (!statSync(localeDir).isDirectory()) continue;
    for (const name of readdirSync(localeDir)) {
      if (name.endsWith('.md')) out.push(join(localeDir, name));
    }
  }
  return out;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { fm: null, body: content };
  return {
    fm: yaml.load(match[1]),
    body: content.slice(match[0].length).trimStart(),
  };
}

function inferLocale(filePath) {
  const parts = filePath.replace(/\\/g, '/').split('/');
  const postsIndex = parts.lastIndexOf('posts');
  return postsIndex >= 0 ? parts[postsIndex + 1] : null;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addSplitTerms(set, value) {
  const raw = String(value || '').trim();
  if (!raw) return;
  set.add(raw);
  const withoutMarks = raw.replace(/[™®©]/g, '').trim();
  if (withoutMarks) set.add(withoutMarks);
  for (const part of withoutMarks.split(/[\s:：—–\-・]+/u)) {
    if (/^[A-Za-z][A-Za-z0-9'’]+$/u.test(part) && part.length >= 4) set.add(part);
  }
}

function collectAllowTerms(fm = {}) {
  const terms = new Set(ALWAYS_ALLOWED_TERMS);
  addSplitTerms(terms, fm.gameTitle);
  addSplitTerms(terms, fm.title);
  addSplitTerms(terms, fm.primaryPlatformLabel);
  addSplitTerms(terms, fm.platform);
  return [...terms].filter(Boolean).sort((a, b) => b.length - a.length);
}

function collectFrontmatterStrings(value, path = 'frontmatter') {
  if (value == null) return [];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [{ path, text: String(value) }];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectFrontmatterStrings(item, `${path}[${index}]`));
  }
  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) => collectFrontmatterStrings(child, `${path}.${key}`));
  }
  return [];
}

function maskAllowedText(text, allowTerms) {
  let masked = String(text || '');
  masked = masked.replace(/https?:\/\/\S+/gi, ' ');
  masked = masked.replace(/www\.\S+/gi, ' ');
  masked = masked.replace(/[A-Z]{2,4}\s*[$€£¥]?\s*\d+(?:[.,]\d+)?/g, ' ');
  masked = masked.replace(/[$€£¥]\s*\d+(?:[.,]\d+)?/g, ' ');
  for (const term of allowTerms) {
    const pattern = new RegExp(escapeRegExp(term), 'gi');
    masked = masked.replace(pattern, ' ');
  }
  return masked
    .replace(/[`*_#[\](){}|>~]/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findPhraseIssues(text) {
  const issues = [];
  for (const pattern of PHRASE_PATTERNS) {
    const match = String(text || '').match(pattern);
    if (match) issues.push(`blocked phrase “${match[0]}”`);
  }
  return issues;
}

function findHeuristicIssue(text, allowTerms) {
  const masked = maskAllowedText(text, allowTerms);
  const asciiRuns = masked.match(/[A-Za-z][A-Za-z0-9'’/-]*(?:\s+[A-Za-z][A-Za-z0-9'’/-]*){3,}/g) || [];
  const suspicious = asciiRuns
    .map((run) => run.trim())
    .find((run) => ENGLISH_CONNECTOR.test(run) && run.split(/\s+/).length >= 4);
  return suspicious ? `possible untranslated English run “${suspicious.slice(0, 120)}”` : null;
}

function lineNumberFor(content, needle) {
  if (!needle) return null;
  const index = content.indexOf(needle);
  if (index < 0) return null;
  return content.slice(0, index).split(/\r?\n/).length;
}

function scanEntry({ path, text }, allowTerms, content, locale) {
  const issues = [];
  for (const reason of findPhraseIssues(text)) {
    issues.push({ path, line: lineNumberFor(content, text), reason, excerpt: String(text).slice(0, 180) });
  }

  // French, Spanish, German, and Portuguese are Latin-script languages, so a
  // generic ASCII-run detector produces many false positives. Keep the broad
  // heuristic for zh-hans / ja only, where long English runs are high signal.
  if (locale === 'zh-hans' || locale === 'ja') {
    const heuristic = findHeuristicIssue(text, allowTerms);
    if (heuristic) {
      issues.push({ path, line: lineNumberFor(content, text), reason: heuristic, excerpt: String(text).slice(0, 180) });
    }
  }
  return issues;
}

function scanFile(filePath) {
  const absPath = filePath.startsWith(repoRoot) ? filePath : join(repoRoot, filePath);
  const relPath = relative(repoRoot, absPath).replace(/\\/g, '/');
  const locale = inferLocale(absPath);
  const content = readFileSync(absPath, 'utf8');

  if (!LOCALE_ALLOWLIST.has(locale)) {
    return { file: relPath, locale, status: 'SKIP', issues: [] };
  }

  const { fm, body } = parseFrontmatter(content);
  const allowTerms = collectAllowTerms(fm || {});
  const entries = [];
  if (fm && typeof fm === 'object') {
    entries.push(...collectFrontmatterStrings(fm));
  }
  const bodyLines = String(body || '').split(/\r?\n/);
  bodyLines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || /^\|?\s*:?-{3,}/.test(trimmed)) return;
    entries.push({ path: `body:${index + 1}`, text: trimmed });
  });

  const issues = entries.flatMap((entry) => scanEntry(entry, allowTerms, content, locale));
  return {
    file: relPath,
    locale,
    status: issues.length ? 'FAIL' : 'PASS',
    issues,
  };
}

const args = process.argv.slice(2);
let files;

if (args.includes('--all')) {
  files = collectAllPostMdFiles();
} else if (args.length) {
  files = args;
} else {
  console.error('Usage: node scripts/scan-localized-english-residuals.mjs <path-to-md-file> [...] | --all');
  process.exit(2);
}

const results = files.map(scanFile);
console.log(JSON.stringify(results, null, 2));

const failureCount = results.reduce((sum, item) => sum + item.issues.length, 0);
if (failureCount > 0) {
  console.error(`English residual scan failed with ${failureCount} issue(s).`);
  process.exit(1);
}
