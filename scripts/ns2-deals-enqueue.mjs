#!/usr/bin/env node
/**
 * Fetch NS2 + Today's Deals search (all pages), filter non–full-game SKUs, enqueue new URLs.
 *
 * Usage:
 *   node scripts/ns2-deals-enqueue.mjs [--max-add 15] [--max-add 0] [--write-batch path] [--max-pages 35]
 *
 * --max-add 0  → enqueue every filtered URL not already in the queue (no cap).
 * Reads/writes: content/game-queue.json, content/ns2-deals-filter-exceptions.json
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchAllNs2TodaysDealsUrls } from './ns2-search-pages.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const QUEUE_PATH = join(ROOT, 'content', 'game-queue.json');
const EXCEPTIONS_PATH = join(ROOT, 'content', 'ns2-deals-filter-exceptions.json');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const SKIP_TITLE_RES = [
  /\bdlc\b/i,
  /\bupgrade\s*pack\b/i,
  /\bedition\s+upgrade\b/i,
  /\bnintendo\s+switch\s*2\s+edition\s+upgrade\b/i,
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
  let maxPages = 35;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--max-add' && a[i + 1]) maxAdd = parseInt(a[++i], 10);
    if (a[i] === '--max-pages' && a[i + 1]) maxPages = parseInt(a[++i], 10) || 35;
    if (a[i] === '--write-batch' && a[i + 1]) writeBatch = a[++i];
  }
  if (Number.isNaN(maxAdd)) maxAdd = 15;
  return { maxAdd, writeBatch, maxPages };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const { maxAdd, writeBatch, maxPages } = parseArgs();
  const cap = maxAdd === 0 ? Infinity : maxAdd;
  const exceptions = loadExceptions();

  const { urls, pagesFetched, idsPerPage } = await fetchAllNs2TodaysDealsUrls({
    maxPages,
    delayBetweenPagesMs: 600,
  });

  const filtered = [];
  for (const url of urls) {
    const title = await fetchOgTitle(url);
    await sleep(400);
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
    existing.add(url);
    if (toAdd.length >= cap) break;
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
  }

  writeFileSync(QUEUE_PATH, JSON.stringify(q, null, 2) + '\n', 'utf8');

  mkdirSync(dirname(writeBatch), { recursive: true });
  writeFileSync(
    writeBatch,
    `# NS2 batch URLs (${today()}) cap=${cap === Infinity ? 'all' : cap} pages=${pagesFetched}\n${toAdd.join('\n')}\n`,
    'utf8',
  );

  console.log(
    JSON.stringify(
      {
        pagesFetched,
        idsPerPage,
        totalDetailUrls: urls.length,
        afterTitleFilter: keep.length,
        added: toAdd.length,
        batchFile: writeBatch,
        skippedSamples: filtered.filter((x) => x.skip).slice(0, 12),
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
