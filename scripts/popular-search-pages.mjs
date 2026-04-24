/**
 * GameGulf search ?topic=popular — paginated fetch and /detail/ id collection.
 * Reuses deep JSON scan from ns2-search-pages.
 */

import {
  detailUrl,
  extractDetailIds,
  extractDetailIdsDeep,
  extractNuxtPayloadJson,
} from './ns2-search-pages.mjs';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export function buildPopularSearchUrl(page = 1) {
  const u = new URL('https://www.gamegulf.com/search');
  u.searchParams.set('topic', 'popular');
  if (page > 1) u.searchParams.set('page', String(page));
  return u.href;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch popular topic pages until `targetCount` unique detail URLs collected,
 * or a page adds zero new ids, or maxPages reached.
 * @returns {{ urls: string[], pagesScanned: number, lastPageWithNewIds: number, idsPerPage: number[] }}
 */
export async function fetchPopularDetailUrlsUntilCount(options = {}) {
  const {
    targetCount = 100,
    maxPages = 80,
    delayBetweenPagesMs = 550,
    signal,
  } = options;

  const seen = new Set();
  const orderedUrls = [];
  const idsPerPage = [];
  let lastPageWithNewIds = 0;

  for (let page = 1; page <= maxPages; page++) {
    if (signal?.aborted) throw new Error('aborted');
    if (page > 1) await sleep(delayBetweenPagesMs);

    const fetchUrl = buildPopularSearchUrl(page);
    const res = await fetch(fetchUrl, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        signal,
      },
    });
    if (!res.ok) throw new Error(`Search HTTP ${res.status} for ${fetchUrl}`);

    const html = await res.text();
    const pageSet = new Set(extractDetailIds(html));
    const nuxt = extractNuxtPayloadJson(html);
    if (nuxt) extractDetailIdsDeep(nuxt, pageSet);

    let added = 0;
    for (const id of pageSet) {
      if (!seen.has(id)) {
        seen.add(id);
        orderedUrls.push(detailUrl(id));
        added += 1;
      }
    }
    idsPerPage.push(pageSet.size);
    if (added > 0) lastPageWithNewIds = page;

    if (orderedUrls.length >= targetCount) break;
    if (page > 1 && added === 0) break;
    if (page > 1 && pageSet.size === 0) break;
  }

  return {
    urls: orderedUrls.slice(0, targetCount),
    pagesScanned: idsPerPage.length,
    lastPageWithNewIds,
    idsPerPage,
  };
}
