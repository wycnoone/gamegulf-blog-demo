/**
 * NS2 + Today's Deals search: paginated HTML fetch and /detail/ id collection.
 * Page param: &page=2 (page 1 omits param or can use page=1 — GameGulf accepts both).
 */

const FILTER_OBJECT = {
  SubPlatform: ['Nintendo Switch 2'],
  Sale: ["Today's Deals"],
};

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export function detailUrl(id) {
  return `https://www.gamegulf.com/detail/${id}`;
}

export function buildNs2SearchUrl(page = 1) {
  const u = new URL('https://www.gamegulf.com/search');
  u.searchParams.set('filter', JSON.stringify(FILTER_OBJECT));
  if (page > 1) u.searchParams.set('page', String(page));
  return u.href;
}

export function extractDetailIds(html) {
  const ids = [];
  const re = /\/detail\/([A-Za-z0-9_-]+)/g;
  let m;
  while ((m = re.exec(html)) !== null) ids.push(m[1]);
  return ids;
}

export function extractDetailIdsDeep(value, into) {
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

export function extractNuxtPayloadJson(html) {
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch pages 1..N until a page adds zero new detail ids (or empty page), or maxPages.
 * @returns {{ urls: string[], pagesFetched: number, idsPerPage: number[] }}
 */
export async function fetchAllNs2TodaysDealsUrls(options = {}) {
  const { maxPages = 35, delayBetweenPagesMs = 550, signal } = options;

  const seen = new Set();
  const orderedUrls = [];
  const idsPerPage = [];
  let firstPageHtml = null;

  for (let page = 1; page <= maxPages; page++) {
    if (signal?.aborted) throw new Error('aborted');
    if (page > 1) await sleep(delayBetweenPagesMs);

    const fetchUrl = buildNs2SearchUrl(page);

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
    if (page === 1) firstPageHtml = html;
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

    if (page > 1 && added === 0) break;
    if (page > 1 && pageSet.size === 0) break;
  }

  return {
    urls: orderedUrls,
    pagesFetched: idsPerPage.length,
    idsPerPage,
    firstPageHtml,
  };
}
