#!/usr/bin/env node
/**
 * Fetch NS2 + Today's Deals search, filter non–full-game SKUs, enqueue new URLs.
 *
 * Usage:
 *   node scripts/ns2-deals-enqueue.mjs [--max-add 15] [--write-batch path]
 *
 * Reads/writes: content/game-queue.json, content/ns2-deals-filter-exceptions.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const QUEUE_PATH = join(ROOT, 'content', 'game-queue.json');
const EXCEPTIONS_PATH = join(ROOT, 'content', 'ns2-deals-filter-exceptions.json');

const DEFAULT_SEARCH_URL =
  'https://www.gamegulf.com/search?filter=' +
  encodeURIComponent(
    JSON.stringify({
      SubPlatform: ['Nintendo Switch 2'],
      Sale: ["Today's Deals"],
    }),
  );

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const SKIP_TITLE_RES = [
  /\bdlc\b/i,
  /\bupgrade\s*pack\b/i,
  /\bseason\s*pass\b/i,
  /\bexpansion\s*pass\b/i,
  /\bexpansion\b/i,
  /\badd-?on\b/i,
  /\bcharacter\s*pass\b/i,
  /\bfighter\s*pass\b/i,
  /\bcontent\s*pack\b/i,
  /\bweapon\s*pack\b/i,
  /\barmor\s*pack\b/i,
  /\bultimate\s*edition\s*upgrade\b/i,
  /\bupgrade\s+to\b/i,
  /\bsoundtrack\b/i,
  /\bost\b/i,
  /\bcosmetic\s*pack\b/i,
  /\bavatar\s*pack\b/i,
  /\bstarter\s*pack\b/i,
];

function extractDetailIds(html) {
  const ids = [];
  const re = /\/detail\/([A-Za-z0-9_-]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) ids.push(m[1]);
  return ids;
}

function dedupeOrdered(ids) {
  const seen = new Set();
  const out = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function extractDetailIdsDeep(value, into) {
  if (value == null) return;
  if (typeof value === 'string') {
    const re = /\/detail\/([A-Za-z0-9_-]+)/g;
    let m;
    while ((m = re.exec(value)) !== null) into.add(m[1]);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) extractDetailIdsDeep(v, into);
    return;
  }
  if (typeof value === 'object') {
    for (const v of Object.values(value)) extractDetailIdsDeep(v, into);
  }
}

function extractNuxtPayloadJson(html) {
  const marker = 'id="__NUXT_DATA__"';
  const tagPos = html.indexOf(marker);
  if (tagPos === -1) return null;
  const jsonStart = html.indexOf('>', tagPos) + 1;
  const jsonEnd = html.indexOf('</script>', jsonStart);
  const raw = html.substring(jsonStart, jsonEnd).replace(/^\uFEFF/, '');
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function fetchSearchHtml() {
  const url = process.env.GAMEGULF_SEARCH_URL || DEFAULT_SEARCH_URL;
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`Search HTTP ${res.status}`);
  return res.text();
}

function detailUrl(id) {
  return `https://www.gamegulf.com/detail/${id}`;
}

async function fetchOgTitle(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
  });
  if (!res.ok) return '';
  const html = await res.text();
  const m =
    html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i) ||
    html.match(/<meta\s+content="([^"]*)"\s+property="og:title"/i);
  return m ? m[1].replace(/&amp;/g, '&').trim() : '';
}

function loadExceptions() {
  try {
    return JSON.parse(readFileSync(EXCEPTIONS_PATH, 'utf8'));
  } catch {
    return { whitelist: [], blacklist: [] };
  }
}

function shouldSkipTitle(title, exceptions, url) {
  if (exceptions.blacklist?.includes(url)) return true;
  if (exceptions.whitelist?.includes(url)) return false;
  if (!title) return false;
  return SKIP_TITLE_RES.some((re) => re.test(title));
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function parseArgs() {
  const a = process.argv.slice(2);
  let maxAdd = 15;
  let writeBatch = join(ROOT, 'content', 'ns2-batch-active-urls.txt');
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--max-add' && a[i + 1]) maxAdd = parseInt(a[++i], 10) || 15;
    if (a[i] === '--write-batch' && a[i + 1]) writeBatch = a[++i];
  }
  return { maxAdd, writeBatch };
}

async function main() {
  const { maxAdd, writeBatch } = parseArgs();
  const exceptions = loadExceptions();
  const html = await fetchSearchHtml();
  const idSet = new Set(extractDetailIds(html));
  const nuxt = extractNuxtPayloadJson(html);
  if (nuxt) extractDetailIdsDeep(nuxt, idSet);
  const urls = dedupeOrdered([...idSet]).map(detailUrl);

  const filtered = [];
  for (const url of urls) {
    const title = await fetchOgTitle(url);
    await new Promise((r) => setTimeout(r, 400));
    const skip = shouldSkipTitle(title, exceptions, url);
    filtered.push({ url, title, skip });
  }

  const keep = filtered.filter((x) => !x.skip).map((x) => x.url);
  const q = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'));
  const existing = new Set(q.games.map((g) => g.url));
  const toAdd = [];
  for (const url of keep) {
    if (existing.has(url)) continue;
    toAdd.push(url);
    if (toAdd.length >= maxAdd) break;
  }

  for (const url of toAdd) {
    q.games.push({
      url,
      status: 'pending',
      priority: 'normal',
      added: today(),
      completed: null,
      notes: 'NS2 TodaysDeals batch',
    });
    existing.add(url);
  }

  writeFileSync(QUEUE_PATH, JSON.stringify(q, null, 2) + '\n', 'utf8');

  mkdirSync(dirname(writeBatch), { recursive: true });
  writeFileSync(
    writeBatch,
    `# NS2 batch URLs (${today()})\n${toAdd.join('\n')}\n`,
    'utf8',
  );

  console.log(
    JSON.stringify(
      {
        searchUrls: urls.length,
        afterTitleFilter: keep.length,
        added: toAdd.length,
        batchFile: writeBatch,
        skippedSamples: filtered.filter((x) => x.skip).slice(0, 8),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
