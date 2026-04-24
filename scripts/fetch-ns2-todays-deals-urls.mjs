#!/usr/bin/env node
/**
 * Fetch GameGulf search (NS2 + Today's Deals) with pagination (&page=2, …).
 *
 * Usage:
 *   node scripts/fetch-ns2-todays-deals-urls.mjs [--write] [--json]
 *   node scripts/fetch-ns2-todays-deals-urls.mjs --max-pages 20
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchAllNs2TodaysDealsUrls } from './ns2-search-pages.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Best-effort titles from first page HTML only (optional). */
function extractTitlesByUrl(html, urls) {
  const byUrl = {};
  const urlSet = new Set(urls);
  const blockRe =
    /href="https?:\/\/www\.gamegulf\.com\/detail\/([^"]+)"[^>]{0,800}/gi;
  let bm;
  while ((bm = blockRe.exec(html)) !== null) {
    const id = bm[1];
    const u = `https://www.gamegulf.com/detail/${id}`;
    if (!urlSet.has(u)) continue;
    const block = bm[0];
    const titleMatch =
      block.match(/"name"\s*:\s*"([^"]{2,200})"/) ||
      block.match(/"title"\s*:\s*"([^"]{2,200})"/) ||
      block.match(/aria-label="([^"]{2,200})"/) ||
      block.match(/alt="([^"]{2,200})"/);
    if (titleMatch) {
      try {
        byUrl[u] = JSON.parse(`"${titleMatch[1].replace(/\\"/g, '\\"')}"`);
      } catch {
        byUrl[u] = titleMatch[1];
      }
    }
  }
  return byUrl;
}

function parseArgs() {
  const a = process.argv.slice(2);
  let maxPages = 35;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--max-pages' && a[i + 1]) maxPages = parseInt(a[++i], 10) || 35;
  }
  return { maxPages, doWrite: a.includes('--write'), asJson: a.includes('--json') };
}

async function main() {
  const { maxPages, doWrite, asJson } = parseArgs();
  const { urls, pagesFetched, idsPerPage, firstPageHtml } =
    await fetchAllNs2TodaysDealsUrls({
      maxPages,
      delayBetweenPagesMs: 600,
    });

  let titlesByUrl = {};
  if (asJson && firstPageHtml) {
    try {
      titlesByUrl = extractTitlesByUrl(firstPageHtml, urls);
    } catch {
      /* ignore */
    }
  }

  if (asJson) {
    console.log(
      JSON.stringify(
        { count: urls.length, pagesFetched, idsPerPage, urls, titlesByUrl },
        null,
        2,
      ),
    );
    return;
  }

  for (const u of urls) console.log(u);

  if (doWrite) {
    const date = new Date().toISOString().split('T')[0];
    const dir = join(__dirname, '..', 'content');
    mkdirSync(dir, { recursive: true });
    const path = join(dir, `ns2-todays-deals-urls-${date}.txt`);
    const body =
      `# NS2 Today's Deals detail URLs (${date}), pages 1–${pagesFetched}\n` +
      `# idsPerPage: ${idsPerPage.join(', ')}\n\n` +
      urls.join('\n') +
      '\n';
    writeFileSync(path, body, 'utf8');
    console.error(`Wrote ${urls.length} URLs (${pagesFetched} pages) to ${path}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
