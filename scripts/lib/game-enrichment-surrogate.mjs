/**
 * Post-enrichment fallbacks when GameGulf / Steam / mapped HLTB leave gaps.
 * - Metacritic: OpenCritic search (no API key), optional RAWG (RAWG_API_KEY).
 * - Playtime: optional RAWG rough hours, then content/enrichment-fallback.json by slug.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STEAM_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0 Safari/537.36';

const FALLBACK_PATH = join(__dirname, '..', '..', 'content', 'enrichment-fallback.json');

function slugifyTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[™®©:]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function loadFallbackBySlug(slug) {
  if (!existsSync(FALLBACK_PATH)) return null;
  try {
    const raw = JSON.parse(readFileSync(FALLBACK_PATH, 'utf8'));
    if (!raw || typeof raw !== 'object') return null;
    return raw[slug] ?? null;
  } catch {
    return null;
  }
}

function buildHltbShape(name, hours) {
  return {
    hltb_id: hours.hltb_id ?? null,
    name,
    main_story_hours: hours.main_story_hours ?? null,
    main_extra_hours: hours.main_extra_hours ?? null,
    completionist_hours: hours.completionist_hours ?? null,
    all_styles_hours: hours.all_styles_hours ?? null,
    review_score: null,
    total_submissions: null,
    _surrogate: true,
    _surrogate_source: hours._source || 'manual_fallback',
  };
}

function hasAnyHours(h) {
  return (
    h &&
    (typeof h.main_story_hours === 'number' ||
      typeof h.main_extra_hours === 'number' ||
      typeof h.completionist_hours === 'number')
  );
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: {
      'User-Agent': STEAM_UA,
      Accept: 'application/json',
      ...opts.headers,
    },
    signal: opts.signal ?? AbortSignal.timeout(15000),
  });
  if (!res.ok) return { ok: false, status: res.status, data: null };
  const data = await res.json().catch(() => null);
  return { ok: true, status: res.status, data };
}

/** OpenCritic search — fills critic-style score when Metacritic field is empty. */
export async function tryOpenCriticScore(gameTitle) {
  const q = String(gameTitle || '')
    .replace(/[™®©]/g, '')
    .trim();
  if (!q) return null;

  const url = `https://api.opencritic.com/api/game/search?criteria=${encodeURIComponent(q)}`;
  const { ok, data } = await fetchJson(url).catch(() => ({ ok: false, data: null }));
  if (!ok || !Array.isArray(data) || data.length === 0) return null;

  const qLower = q.toLowerCase();
  const scored = data.filter((g) => g && (g.topCriticScore != null || g.medianScore != null));
  if (!scored.length) return null;

  let pick = scored[0];
  for (const g of scored) {
    const n = String(g.name || '').toLowerCase();
    if (n === qLower || n.includes(qLower) || qLower.includes(n.slice(0, Math.min(12, n.length)))) {
      pick = g;
      break;
    }
  }

  const score = pick.topCriticScore ?? pick.medianScore;
  if (score == null || !Number.isFinite(Number(score))) return null;

  return {
    score: Number(score),
    id: pick.id,
    name: pick.name,
    url: pick.id != null ? `https://opencritic.com/game/${pick.id}` : null,
  };
}

/** RAWG — optional key; can supply metacritic and a very rough hour hint. */
export async function tryRawgEnrichment(gameTitle, apiKey) {
  const q = String(gameTitle || '')
    .replace(/[™®©]/g, '')
    .trim();
  if (!q || !apiKey) return null;

  const searchUrl = `https://api.rawg.io/api/games?search=${encodeURIComponent(q)}&page_size=5&key=${encodeURIComponent(apiKey)}`;
  const s = await fetchJson(searchUrl).catch(() => ({ ok: false, data: null }));
  if (!s.ok || !s.data?.results?.length) return null;

  const qLower = q.toLowerCase();
  let hit = s.data.results[0];
  for (const r of s.data.results) {
    const n = String(r.name || '').toLowerCase();
    if (n === qLower) {
      hit = r;
      break;
    }
  }

  const slug = hit.slug;
  if (!slug) return null;

  const dUrl = `https://api.rawg.io/api/games/${slug}?key=${encodeURIComponent(apiKey)}`;
  const d = await fetchJson(dUrl).catch(() => ({ ok: false, data: null }));
  if (!d.ok || !d.data) return null;
  const g = d.data;

  const metacritic = g.metacritic != null && Number.isFinite(Number(g.metacritic)) ? Number(g.metacritic) : null;
  let mainGuess = null;
  if (typeof g.playtime === 'number' && g.playtime > 0) mainGuess = Math.round(g.playtime);
  else if (typeof g.playtime === 'string' && /^\d+$/.test(g.playtime.trim())) {
    mainGuess = Math.round(Number(g.playtime.trim()));
  }

  return { metacritic, mainGuessHours: mainGuess, rawgSlug: slug, name: g.name };
}

function pushSource(meta, tag) {
  if (!Array.isArray(meta.sources)) meta.sources = ['gamegulf'];
  if (!meta.sources.includes(tag)) meta.sources.push(tag);
}

/**
 * Mutates brief: game.metacritic, enrichment.hltb, meta.sources, meta.surrogate.
 * Caller is responsible for base meta.sources (gamegulf, steam, hltb).
 */
export async function applySurrogateEnrichment(brief) {
  if (!brief?.game) return;

  const slug = slugifyTitle(brief.game.title);
  const meta = brief.meta || (brief.meta = {});
  const surrogate = { metacritic: [], playtime: [] };

  if (!brief.enrichment) brief.enrichment = { steam: null, hltb: null };

  const fb = loadFallbackBySlug(slug);
  if (fb && typeof fb === 'object') {
    if (brief.game.metacritic == null && fb.metacritic != null) {
      const n = Math.round(Number(fb.metacritic));
      if (Number.isFinite(n)) {
        brief.game.metacritic = n;
        surrogate.metacritic.push('enrichment-fallback.json');
        pushSource(meta, 'enrichment_fallback');
        console.log(`  ✔ Metacritic: manual fallback → ${n}`);
      }
    }
    if (!brief.enrichment.hltb && hasAnyHours(fb)) {
      brief.enrichment.hltb = buildHltbShape(brief.game.title, {
        ...fb,
        _source: 'enrichment-fallback.json',
      });
      surrogate.playtime.push('enrichment-fallback.json');
      pushSource(meta, 'enrichment_fallback');
      console.log(
        `  ✔ Playtime surrogate: manual fallback (${fb.main_story_hours ?? '?'}h main band)`,
      );
    }
  }

  if (brief.game.metacritic == null) {
    const oc = await tryOpenCriticScore(brief.game.title).catch(() => null);
    if (oc?.score != null) {
      brief.game.metacritic = Math.round(oc.score);
      meta.metacriticSurrogate = { source: 'opencritic', ...oc };
      surrogate.metacritic.push('opencritic');
      pushSource(meta, 'opencritic_surrogate');
      console.log(`  ✔ Metacritic surrogate: OpenCritic → ${brief.game.metacritic} (${oc.name})`);
    }
  }

  const rawgKey = process.env.RAWG_API_KEY;
  if (rawgKey) {
    const rg = await tryRawgEnrichment(brief.game.title, rawgKey).catch(() => null);
    if (rg?.metacritic != null && brief.game.metacritic == null) {
      brief.game.metacritic = Math.round(rg.metacritic);
      surrogate.metacritic.push('rawg');
      pushSource(meta, 'rawg');
      console.log(`  ✔ Metacritic: RAWG → ${brief.game.metacritic}`);
    }
    if (!brief.enrichment.hltb && rg?.mainGuessHours != null && rg.mainGuessHours > 0) {
      brief.enrichment.hltb = buildHltbShape(brief.game.title, {
        main_story_hours: rg.mainGuessHours,
        main_extra_hours: null,
        completionist_hours: null,
        _source: 'rawg_playtime_hint',
      });
      surrogate.playtime.push('rawg');
      pushSource(meta, 'rawg_playtime_surrogate');
      console.log(`  ✔ Playtime surrogate: RAWG hint → ~${rg.mainGuessHours}h main band`);
    }
  }

  if (surrogate.metacritic.length || surrogate.playtime.length) {
    meta.surrogate = surrogate;
  }
}
