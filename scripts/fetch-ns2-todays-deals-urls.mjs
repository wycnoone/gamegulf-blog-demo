#!/usr/bin/env node
/**
 * Fetch GameGulf search results (Nintendo Switch 2 + Today's Deals),
 * extract unique detail URLs from HTML / embedded JSON.
 *
 * Usage:
 *   node scripts/fetch-ns2-todays-deals-urls.mjs [--write]
 *   node scripts/fetch-ns2-todays-deals-urls.mjs --json
 *
 * --write  Append dated list to content/ns2-todays-deals-urls-YYYY-MM-DD.txt
 * --json   Print { urls: [...], titlesByUrl: {...} } when titles found
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

function detailUrl(id) {
  return `https://www.gamegulf.com/detail/${id}`;
}

function extractDetailIds(html) {
  const ids = [];
  const re = /\/detail\/([A-Za-z0-9_-]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    ids.push(m[1]);
  }
  return ids;
}

/** Walk parsed __NUXT_DATA__ JSON (devalue flat) for any embedded /detail/ ids. */
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

/** Try to pair titles near href="/detail/id" in HTML (best-effort). */
function extractTitlesByUrl(html, urls) {
  const byUrl = {};
  const urlSet = new Set(urls);
  // e.g. href="/detail/abc" ... title or aria-label or >Title<
  const blockRe =
    /href="https?:\/\/www\.gamegulf\.com\/detail\/([^"]+)"[^>]{0,800}/gi;
  let bm;
  while ((bm = blockRe.exec(html)) !== null) {
    const id = bm[1];
    if (!urlSet.has(detailUrl(id))) continue;
    const block = bm[0];
    const titleMatch =
      block.match(/"name"\s*:\s*"([^"]{2,200})"/) ||
      block.match(/"title"\s*:\s*"([^"]{2,200})"/) ||
      block.match(/aria-label="([^"]{2,200})"/) ||
      block.match(/alt="([^"]{2,200})"/);
    if (titleMatch) {
      try {
        byUrl[detailUrl(id)] = JSON.parse(`"${titleMatch[1].replace(/\\"/g, '\\"')}"`);
      } catch {
        byUrl[detailUrl(id)] = titleMatch[1];
      }
    }
  }
  return byUrl;
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
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

const args = process.argv.slice(2);
const doWrite = args.includes('--write');
const asJson = args.includes('--json');

async function main() {
  const searchUrl = process.env.GAMEGULF_SEARCH_URL || DEFAULT_SEARCH_URL;
  const html = await fetchHtml(searchUrl);
  const idSet = new Set(extractDetailIds(html));
  const nuxt = extractNuxtPayloadJson(html);
  if (nuxt) extractDetailIdsDeep(nuxt, idSet);
  const ids = dedupeOrdered([...idSet]);
  const urls = ids.map(detailUrl);
  const titlesByUrl = extractTitlesByUrl(html, urls);

  if (asJson) {
    console.log(JSON.stringify({ count: urls.length, urls, titlesByUrl }, null, 2));
    return;
  }

  for (const u of urls) console.log(u);

  if (doWrite) {
    const date = new Date().toISOString().split('T')[0];
    const dir = join(__dirname, '..', 'content');
    mkdirSync(dir, { recursive: true });
    const path = join(dir, `ns2-todays-deals-urls-${date}.txt`);
    const body =
      `# NS2 Today's Deals detail URLs (${date})\n# source: ${searchUrl}\n\n` +
      urls.join('\n') +
      '\n';
    writeFileSync(path, body, 'utf8');
    console.error(`Wrote ${urls.length} URLs to ${path}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
