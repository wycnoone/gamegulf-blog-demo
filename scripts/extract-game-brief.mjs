#!/usr/bin/env node
/**
 * GameGulf Game Brief Extractor (v2 — multi-source)
 *
 * Fetches a GameGulf detail page, enriches with Steam + HLTB data,
 * and outputs a structured JSON brief for AI article synthesis.
 *
 * Usage:
 *   node scripts/extract-game-brief.mjs <gamegulf-url> [--out <dir>] [--no-enrich]
 *
 * Example:
 *   node scripts/extract-game-brief.mjs https://www.gamegulf.com/detail/h14iXKeQ0PR
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';

const EXCLUDED_REGIONS = new Set(['AR']);
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUT_DIR = join(__dirname, '..', 'content', 'briefs');

// ─── Nuxt 3 Devalue Payload Parser ──────────────────────────────

const WRAPPER_TYPES = new Set([
  'ShallowReactive', 'Reactive', 'ShallowRef', 'Ref',
  'NuxtError', 'EmptyRef',
]);

function unflattenNuxtPayload(flat) {
  const cache = new Map();

  function resolve(idx) {
    if (typeof idx !== 'number') return idx;
    if (cache.has(idx)) return cache.get(idx);

    const val = flat[idx];

    if (val === null || val === undefined) {
      cache.set(idx, val);
      return val;
    }

    if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
      cache.set(idx, val);
      return val;
    }

    if (Array.isArray(val)) {
      if (
        val.length === 2 &&
        typeof val[0] === 'string' &&
        WRAPPER_TYPES.has(val[0])
      ) {
        if (val[0] === 'EmptyRef') {
          cache.set(idx, undefined);
          return undefined;
        }
        const inner = resolve(val[1]);
        cache.set(idx, inner);
        return inner;
      }

      if (val.length >= 1 && typeof val[0] === 'string' && val[0] === 'Set') {
        cache.set(idx, new Set());
        return new Set();
      }

      const result = [];
      cache.set(idx, result);
      for (const item of val) {
        result.push(typeof item === 'number' ? resolve(item) : item);
      }
      return result;
    }

    if (typeof val === 'object') {
      const result = {};
      cache.set(idx, result);
      for (const [key, ref] of Object.entries(val)) {
        result[key] = resolve(ref);
      }
      return result;
    }

    cache.set(idx, val);
    return val;
  }

  return resolve(0);
}

// ─── HTML Helpers ────────────────────────────────────────────────

function extractOgTags(html) {
  const tags = {};
  const re = /<meta\s+(?:property|name)="(og:[^"]+)"\s+content="([^"]*)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) tags[m[1]] = m[2];
  return tags;
}

function extractNuxtPayloadJson(html) {
  const marker = 'id="__NUXT_DATA__"';
  const tagPos = html.indexOf(marker);
  if (tagPos === -1) throw new Error('__NUXT_DATA__ script tag not found in HTML');

  const jsonStart = html.indexOf('>', tagPos) + 1;
  const jsonEnd = html.indexOf('</script>', jsonStart);
  const raw = html.substring(jsonStart, jsonEnd).replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

// ─── Steam Enrichment ────────────────────────────────────────────

const STEAM_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0';

async function searchSteamAppId(gameTitle) {
  const cleanTitle = gameTitle.replace(/[™®©]/g, '').trim();
  const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleanTitle)}&l=english&cc=US`;
  const res = await fetch(url, { headers: { 'User-Agent': STEAM_UA } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.items?.length) return null;

  const exact = data.items.find(
    (i) => i.name.toLowerCase() === cleanTitle.toLowerCase(),
  );
  return exact?.id || data.items[0]?.id || null;
}

async function fetchSteamData(appId) {
  const [detailsRes, reviewsRes] = await Promise.all([
    fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=english`, {
      headers: { 'User-Agent': STEAM_UA },
    }),
    fetch(
      `https://store.steampowered.com/appreviews/${appId}?json=1&language=all&purchase_type=all&num_per_page=0`,
      { headers: { 'User-Agent': STEAM_UA } },
    ),
  ]);

  const details = detailsRes.ok ? await detailsRes.json() : {};
  const reviews = reviewsRes.ok ? await reviewsRes.json() : {};

  const d = details[String(appId)]?.data;
  const r = reviews?.query_summary;

  if (!d) return null;

  return {
    steam_app_id: appId,
    name: d.name,
    developer: d.developers || [],
    publisher: d.publishers || [],
    metacritic_score: d.metacritic?.score || null,
    metacritic_url: d.metacritic?.url || null,
    categories: (d.categories || []).map((c) => c.description),
    genres: (d.genres || []).map((g) => g.description),
    steam_price: d.price_overview?.final_formatted || null,
    total_recommendations: d.recommendations?.total || 0,
    short_description: d.short_description || '',
    supported_languages: d.supported_languages || '',
    platforms: d.platforms || {},
    reviews: r
      ? {
          total_positive: r.total_positive,
          total_negative: r.total_negative,
          total_reviews: r.total_reviews,
          score_description: r.review_score_desc,
          positive_percent: r.total_reviews
            ? Math.round((r.total_positive / r.total_reviews) * 100)
            : null,
        }
      : null,
  };
}

async function enrichWithSteam(brief) {
  try {
    const title = brief.game.title;
    console.log(`  ▸ Steam: searching "${title}"…`);
    const appId = await searchSteamAppId(title);
    if (!appId) {
      console.log('  ▸ Steam: not found');
      return null;
    }

    console.log(`  ▸ Steam: found app ${appId}, fetching details…`);
    const data = await fetchSteamData(appId);
    if (data) {
      if (!brief.game.developer && data.developer.length) {
        brief.game.developer = data.developer.join(', ');
      }
      if (!brief.game.metacritic && data.metacritic_score) {
        brief.game.metacritic = data.metacritic_score;
      }
      console.log(
        `  ✔ Steam: ${data.reviews?.score_description || 'no reviews'} (${data.reviews?.total_reviews || 0} reviews)`,
      );
    }
    return data;
  } catch (err) {
    console.log(`  ▸ Steam: error — ${err.message}`);
    return null;
  }
}

// ─── HLTB Enrichment ─────────────────────────────────────────────

const HLTB_MAPPING_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'content',
  'hltb-mapping.json',
);

function loadHltbMapping() {
  if (existsSync(HLTB_MAPPING_PATH)) {
    try {
      return JSON.parse(readFileSync(HLTB_MAPPING_PATH, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

async function fetchHltbData(hltbId) {
  const url = `https://howlongtobeat.com/game/${hltbId}`;
  const res = await fetch(url, { headers: { 'User-Agent': STEAM_UA } });
  if (!res.ok) return null;
  const html = await res.text();

  const idx = html.indexOf('"__NEXT_DATA__"');
  if (idx === -1) return null;

  const jsonStart = html.indexOf('>', idx) + 1;
  const jsonEnd = html.indexOf('</script', jsonStart);
  const data = JSON.parse(html.substring(jsonStart, jsonEnd));
  const g = data?.props?.pageProps?.game?.data?.game?.[0];
  if (!g) return null;

  return {
    hltb_id: hltbId,
    name: g.game_name,
    main_story_hours: g.comp_main ? Math.round(g.comp_main / 3600) : null,
    main_extra_hours: g.comp_plus ? Math.round(g.comp_plus / 3600) : null,
    completionist_hours: g.comp_100 ? Math.round(g.comp_100 / 3600) : null,
    all_styles_hours: g.comp_all ? Math.round(g.comp_all / 3600) : null,
    review_score: g.review_score || null,
    total_submissions: (g.comp_main_count || 0) + (g.comp_plus_count || 0) + (g.comp_100_count || 0),
  };
}

async function enrichWithHltb(brief) {
  try {
    const mapping = loadHltbMapping();
    const slug = slugify(brief.game.title);
    const hltbId = mapping[slug] || mapping[brief.game.title];
    if (!hltbId) {
      console.log('  ▸ HLTB: no mapping found (add to content/hltb-mapping.json)');
      return null;
    }

    console.log(`  ▸ HLTB: fetching game ${hltbId}…`);
    const data = await fetchHltbData(hltbId);
    if (data) {
      console.log(
        `  ✔ HLTB: ${data.main_story_hours}h main / ${data.main_extra_hours}h extra / ${data.completionist_hours}h complete`,
      );
    }
    return data;
  } catch (err) {
    console.log(`  ▸ HLTB: error — ${err.message}`);
    return null;
  }
}

// ─── Price Analytics ─────────────────────────────────────────────

function computePriceAnalytics(platforms, lows) {
  const result = {};

  for (const [pKey, p] of Object.entries(platforms)) {
    const trendAll = [];
    for (const t of p.trend || []) {
      for (const e of t.entries || []) {
        if (e.date && e.value != null) trendAll.push(e);
      }
    }

    const uniqueTrend = [];
    const seenDates = new Set();
    for (const e of trendAll) {
      const k = `${e.date}_${e.country_code}_${e.value}`;
      if (!seenDates.has(k)) {
        seenDates.add(k);
        uniqueTrend.push(e);
      }
    }
    uniqueTrend.sort((a, b) => a.date.localeCompare(b.date));

    const currentPrice = p.digital[0]?.calculate_value ?? null;
    const currentRegion = p.digital[0]?.country || '';
    const currentCode = p.digital[0]?.country_code || '';

    const globalLow = lows.find((l) => l.type === 'Global Low');
    const localLow = lows.find((l) => l.type === 'Local Low');
    const glEntry = globalLow?.entries?.find((e) => e.platform?.toLowerCase().includes(pKey));
    const llEntry = localLow?.entries?.find((e) => e.platform?.toLowerCase().includes(pKey));

    const allTimeLowest = uniqueTrend.length > 0
      ? uniqueTrend.reduce((min, e) => (e.value < min.value ? e : min), uniqueTrend[0])
      : null;

    const priceDips = [];
    for (let i = 1; i < uniqueTrend.length; i++) {
      const prev = uniqueTrend[i - 1];
      const curr = uniqueTrend[i];
      if (curr.value < prev.value) {
        priceDips.push({
          date: curr.date,
          price: curr.value,
          country_code: curr.country_code,
          country: curr.country,
          drop_pct: Math.round(((prev.value - curr.value) / prev.value) * 100),
        });
      }
    }

    const salePeriods = [];
    let inSale = false;
    let saleStart = null;
    for (let i = 0; i < uniqueTrend.length; i++) {
      const e = uniqueTrend[i];
      const isLow = e.value < (currentPrice || Infinity) * 0.85;
      if (isLow && !inSale) {
        inSale = true;
        saleStart = e.date;
      } else if (!isLow && inSale) {
        inSale = false;
        salePeriods.push({ start: saleStart, end: uniqueTrend[i - 1]?.date || e.date });
      }
    }
    if (inSale && saleStart) {
      salePeriods.push({ start: saleStart, end: uniqueTrend[uniqueTrend.length - 1]?.date });
    }

    const todayDate = new Date();
    const oneYearAgo = new Date(todayDate);
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    const priceDips1y = priceDips.filter((d) => {
      const dipDate = new Date(d.date);
      return !Number.isNaN(dipDate.getTime()) && dipDate >= oneYearAgo;
    });

    const discountValues = priceDips.map((d) => d.price);
    const avgDiscount = discountValues.length > 0
      ? Math.round((discountValues.reduce((s, v) => s + v, 0) / discountValues.length) * 100) / 100
      : null;

    const lastDip = priceDips.length > 0 ? priceDips[priceDips.length - 1] : null;
    const daysSinceLastDip = lastDip
      ? Math.floor((todayDate - new Date(lastDip.date)) / 86400000)
      : null;

    const atOrNearHistoricalLow = currentPrice != null && allTimeLowest != null
      ? currentPrice <= allTimeLowest.value * 1.05
      : false;

    result[pKey] = {
      current_cheapest: currentPrice != null ? {
        price_eur: currentPrice,
        region: currentRegion,
        country_code: currentCode,
      } : null,
      global_low: glEntry ? {
        price_eur: glEntry.value,
        region: glEntry.country_code,
        type: glEntry.price_type,
      } : (allTimeLowest ? {
        price_eur: allTimeLowest.value,
        region: allTimeLowest.country_code,
        date: allTimeLowest.date,
      } : null),
      local_low: llEntry ? {
        price_eur: llEntry.value,
        region: llEntry.country_code,
        type: llEntry.price_type,
      } : null,
      trend_from_lowest: allTimeLowest ? {
        price_eur: allTimeLowest.value,
        region: allTimeLowest.country_code,
        country: allTimeLowest.country,
        date: allTimeLowest.date,
      } : null,
      at_or_near_historical_low: atOrNearHistoricalLow,
      discount_events_1y: priceDips1y.length,
      avg_discount_price_eur: avgDiscount,
      sale_periods: salePeriods,
      days_since_last_discount: daysSinceLastDip,
      last_discount: lastDip ? {
        date: lastDip.date,
        price_eur: lastDip.price,
        region: lastDip.country,
        drop_pct: lastDip.drop_pct,
      } : null,
      trend_entries_count: uniqueTrend.length,
      price_verdict: generatePriceVerdict(currentPrice, allTimeLowest, priceDips1y, daysSinceLastDip),
    };
  }

  return result;
}

function generatePriceVerdict(currentPrice, allTimeLow, dips, daysSinceLast) {
  if (currentPrice == null) return 'unknown';
  if (allTimeLow && currentPrice <= allTimeLow.value * 1.05) return 'at_historical_low';
  if (allTimeLow && currentPrice <= allTimeLow.value * 1.2) return 'near_historical_low';
  if (dips.length >= 4) {
    if (daysSinceLast != null && daysSinceLast > 60) return 'sale_likely_soon';
    return 'regular_discounter';
  }
  if (dips.length >= 1 && dips.length < 4) return 'occasional_discounter';
  return 'rarely_discounted';
}

// ─── Data Structuring ────────────────────────────────────────────

function firstNonEmptyString(...values) {
  return values.find((value) => typeof value === 'string' && value.trim()) || '';
}

function getPlatformDescriptor(platformEntry) {
  const rawPlatform = platformEntry?.platform;
  const legacyInfo = rawPlatform && typeof rawPlatform === 'object' && !Array.isArray(rawPlatform)
    ? rawPlatform
    : {};
  const platformMeta = platformEntry?.platformMeta && typeof platformEntry.platformMeta === 'object'
    ? platformEntry.platformMeta
    : {};

  const keySource = firstNonEmptyString(
    platformMeta.title,
    legacyInfo.title,
    typeof rawPlatform === 'string' ? rawPlatform : '',
    platformMeta.value,
    legacyInfo.value,
  );
  const key = keySource.trim().toLowerCase();
  const name = firstNonEmptyString(
    platformMeta.value,
    legacyInfo.value,
    typeof rawPlatform === 'string' ? rawPlatform : '',
    platformMeta.title,
    legacyInfo.title,
  );
  const enabled = (platformMeta.enabled ?? legacyInfo.enabled) !== false;

  return { key, name: name || keySource, enabled };
}

function parseLowEntry(entry) {
  const rawValue = entry?.value;
  const valueObj = rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)
    ? rawValue
    : {};
  const value = valueObj.value ?? (typeof rawValue === 'number' ? rawValue : null);
  if (!Number.isFinite(value)) return null;

  return {
    platform: entry?.platform || '',
    country_code: valueObj.country_code || entry?.country_code || '',
    value,
    currency: valueObj.currency || entry?.currency || 'EUR',
    price_type: valueObj.type || entry?.type || '',
  };
}

function filterSchemaOffers(offers) {
  if (!Array.isArray(offers)) return [];

  return offers.filter((offer) => (
    offer &&
    !Array.isArray(offer) &&
    typeof offer === 'object' &&
    firstNonEmptyString(offer['@type'], offer.url)
  ));
}

function buildBrief(nuxt, ogTags, url) {
  const gameId = url.match(/\/detail\/([^/?#]+)/)?.[1] || 'unknown';

  const dataRoot = nuxt?.data;
  if (!dataRoot || typeof dataRoot !== 'object') {
    throw new Error('Nuxt payload has no "data" root');
  }

  const detailKey = Object.keys(dataRoot).find((k) => k.startsWith('detailInfo'));
  if (!detailKey) throw new Error('No detailInfo key found in Nuxt payload');
  const d = dataRoot[detailKey];

  // ── Basic info ──
  const title = d.name || ogTags['og:title']?.replace(/ - GameGulf.*$/, '') || '';
  const descHtml = d.descriptions?.en || '';
  const descriptionPlain = descHtml
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .trim();

  const genres = Array.isArray(d.category) ? d.category : [];
  const images = Array.isArray(d.images) ? d.images : [];
  const coverImage = ogTags['og:image'] || images[0] || '';

  // ── Platforms + Pricing ──
  const platformsArr = Array.isArray(d.platforms) ? d.platforms : [];
  const platformsOut = {};

  for (const p of platformsArr) {
    const descriptor = getPlatformDescriptor(p);
    const pKey = descriptor.key;
    if (!pKey) continue;

    const entry = {
      name: descriptor.name || pKey,
      enabled: descriptor.enabled,
      languages: Array.isArray(p.languages) ? p.languages : [],
      digital: [],
      physical: Array.isArray(p.physical) ? p.physical : [],
      trend: [],
    };

    if (Array.isArray(p.digital)) {
      for (const r of p.digital) {
        if (EXCLUDED_REGIONS.has(r.country_code)) continue;
        entry.digital.push({
          country_code: r.country_code || '',
          country: r.country || '',
          price: r.price ?? null,
          discount_price: r.discount_price || null,
          discount_rate: r.discount_rate || null,
          discount_end: r.discount_end || null,
          discount_end_timestamp: r.discount_end_timestamp || null,
          currency: r.currency || 'EUR',
          currency_symbol: r.currency_symbol || '€',
          calculate_value: r.calculate_value ?? r.price ?? null,
        });
      }
      entry.digital.sort(
        (a, b) => (a.calculate_value ?? Infinity) - (b.calculate_value ?? Infinity),
      );
    }

    if (Array.isArray(p.trend)) {
      for (const t of p.trend) {
        const items = Array.isArray(t.value) ? t.value : [];
        entry.trend.push({
          period: t.key || '',
          entries: items
            .filter((e) => !EXCLUDED_REGIONS.has(e.country_code))
            .map((e) => ({
              date: e.date || '',
              country_code: e.country_code || '',
              value: e.value ?? null,
              currency: e.currency || 'EUR',
              country: e.country || '',
            })),
        });
      }
    }

    platformsOut[pKey] = entry;
  }

  // ── Low prices ──
  const lowsRaw = Array.isArray(d.low) ? d.low : [];
  const lows = lowsRaw.map((l) => {
    const entries = Array.isArray(l.value) ? l.value : [];
    return {
      type: l.type || '',
      entries: entries
        .map(parseLowEntry)
        .filter((e) => {
          if (!e) return false;
          const cc = e.country_code || '';
          return !EXCLUDED_REGIONS.has(cc);
        }),
    };
  });

  // ── Similar games ──
  const simRaw = d.similar_game || {};
  const simList = Array.isArray(simRaw.list) ? simRaw.list : [];
  const similarGames = simList.map((sg) => ({
    id: sg.id || '',
    title: sg.name || '',
    image: sg.image || '',
    metacritic: sg.meta_score || null,
    price: sg.price ?? null,
    discount_price: sg.discount_price || null,
    discount_rate: sg.discount_rate || null,
    discount_tag: sg.discount_tag || '',
    discount_end: sg.discount_end || '',
    release_date: sg.released_at || '',
    categories: Array.isArray(sg.category) ? sg.category : [],
    url: `https://www.gamegulf.com/detail/${sg.id}`,
  }));

  // ── Schema.org from page (enrichment) ──
  const schema = d.schema_script || {};
  const schemaOffers = filterSchemaOffers(schema.offers);

  // ── Price Analytics (computed from trend + lows + digital) ──
  const priceAnalytics = computePriceAnalytics(platformsOut, lows);

  return {
    meta: {
      source_url: url,
      game_id: gameId,
      extracted_at: new Date().toISOString().split('T')[0],
      extractor_version: '1.0.0',
    },
    game: {
      title,
      description: descriptionPlain,
      cover_image: coverImage,
      all_images: images,
      genres,
      release_date: d.released_at || null,
      developer: null,
      publisher: d.publisher || null,
      metacritic: d.meta_score || null,
    },
    platforms: platformsOut,
    lows,
    similar_games: similarGames,
    schema_offers: schemaOffers,
    price_analytics: priceAnalytics,
    product_links: {
      detail: url,
      price_track: `${url}#currency-price`,
      wishlist: 'https://www.gamegulf.com/wishlist',
      membership: 'https://www.gamegulf.com/pricing',
    },
  };
}

// ─── CLI ─────────────────────────────────────────────────────────

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[™®©:]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function extractOne(url, outDir, enrich = true) {
  console.log(`  ▸ Fetching ${url}`);
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0 Safari/537.36',
      Accept: 'text/html',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();

  console.log('  ▸ Parsing Nuxt payload…');
  const ogTags = extractOgTags(html);
  const flat = extractNuxtPayloadJson(html);
  const nuxt = unflattenNuxtPayload(flat);
  const brief = buildBrief(nuxt, ogTags, url);

  if (enrich) {
    const [steamData, hltbData] = await Promise.all([
      enrichWithSteam(brief),
      enrichWithHltb(brief),
    ]);

    brief.enrichment = {
      steam: steamData,
      hltb: hltbData,
    };

    brief.meta.extractor_version = '2.0.0';
    brief.meta.sources = ['gamegulf'];
    if (steamData) brief.meta.sources.push('steam');
    if (hltbData) brief.meta.sources.push('hltb');
  }

  const slug = slugify(brief.game.title);
  const outPath = join(outDir, `${slug}.json`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(brief, null, 2), 'utf8');

  console.log(`  ✔ ${outPath}`);
  return { slug, path: outPath, brief };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
GameGulf Game Brief Extractor (v2 — multi-source)

Usage:
  node scripts/extract-game-brief.mjs <url> [url2 ...] [options]

Options:
  --out <dir>      Output directory (default: content/briefs)
  --no-enrich      Skip Steam/HLTB enrichment (faster)

Data sources:
  GameGulf     Always — pricing, metadata, platform availability
  Steam        Auto — developer, reviews, categories (searched by title)
  HLTB         Manual — playtime data (requires content/hltb-mapping.json)

Examples:
  node scripts/extract-game-brief.mjs https://www.gamegulf.com/detail/h14iXKeQ0PR
  node scripts/extract-game-brief.mjs https://www.gamegulf.com/detail/h14iXKeQ0PR --no-enrich
`);
    process.exit(0);
  }

  let outDir = DEFAULT_OUT_DIR;
  let enrich = true;
  const urls = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && args[i + 1]) {
      outDir = args[++i];
    } else if (args[i] === '--no-enrich') {
      enrich = false;
    } else if (args[i].startsWith('http')) {
      urls.push(args[i]);
    }
  }

  if (urls.length === 0) {
    console.error('Error: no URLs provided');
    process.exit(1);
  }

  console.log(`Extracting ${urls.length} game(s)…${enrich ? '' : ' (no enrichment)'}\n`);

  const results = [];
  for (const url of urls) {
    try {
      const r = await extractOne(url, outDir, enrich);
      results.push(r);
    } catch (err) {
      console.error(`  ✘ Failed: ${url} — ${err.message}`);
    }
    console.log();
  }

  console.log(`Done. ${results.length}/${urls.length} briefs extracted.`);
  if (results.length > 0) {
    console.log('\nExtracted briefs:');
    for (const r of results) {
      console.log(`  ${r.slug} → ${r.path}`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
