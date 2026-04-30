#!/usr/bin/env node
/**
 * Locale-aware playtime helpers for article generation and backfills.
 *
 * Fallback hierarchy:
 * 1. brief.enrichment.hltb / surrogate HLTB-shaped data
 * 2. content/enrichment-fallback.json manual hour bands
 * 3. conservative genre/store-description estimate from the brief itself
 *
 * Reader-facing output intentionally does not cite internal sources such as HLTB,
 * RAWG, mappings, or pipelines. If the value is heuristic, it is labelled as an
 * estimate rather than presented as measured completion data.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const FALLBACK_PATH = join(ROOT, 'content', 'enrichment-fallback.json');

let cachedFallback = null;

export function slugifyTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[™®©:]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function readFallbackFile() {
  if (cachedFallback) return cachedFallback;
  if (!existsSync(FALLBACK_PATH)) {
    cachedFallback = {};
    return cachedFallback;
  }
  try {
    const raw = JSON.parse(readFileSync(FALLBACK_PATH, 'utf8'));
    cachedFallback = raw && typeof raw === 'object' ? raw : {};
  } catch {
    cachedFallback = {};
  }
  return cachedFallback;
}

function finiteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeHoursShape(raw, source = 'brief') {
  if (!raw || typeof raw !== 'object') return null;
  const main = finiteNumber(raw.main_story_hours ?? raw.main ?? raw.story_hours);
  const extra = finiteNumber(raw.main_extra_hours ?? raw.extra ?? raw.extras_hours);
  const comp = finiteNumber(raw.completionist_hours ?? raw.comp ?? raw.completion_hours);
  if (main == null && extra == null && comp == null) return null;
  return {
    kind: 'hours',
    estimated: false,
    source,
    main: main != null ? Math.round(main) : null,
    extra: extra != null ? Math.round(extra) : null,
    comp: comp != null ? Math.round(comp) : null,
  };
}

function collectBriefText(brief) {
  const game = brief?.game || {};
  const enrichment = brief?.enrichment || {};
  const steam = enrichment.steam || brief?.steam || {};
  const genres = Array.isArray(game.genres) ? game.genres : [];
  const categories = Array.isArray(steam.categories) ? steam.categories : [];
  const bits = [
    game.title,
    game.description,
    steam.short_description,
    ...genres,
    ...categories,
  ];
  return bits.filter(Boolean).join(' ').toLowerCase();
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

export function estimatePlaytimeFromBrief(brief) {
  const text = collectBriefText(brief);

  if (hasAny(text, [/life[-\s]?sim/i, /lifestyle/i, /real world time/i, /daily/i, /season/i, /sports?/i, /billiards?/i, /pinball/i])) {
    return { kind: 'ongoing', estimated: true, source: 'genre_estimate', sessionMin: 15, sessionMax: 45 };
  }

  if (hasAny(text, [/simulation/i]) && !hasAny(text, [/role[-\s]?playing/i, /\brpg\b/i, /jrpg/i, /strategy/i, /adventure/i])) {
    return { kind: 'ongoing', estimated: true, source: 'genre_estimate', sessionMin: 15, sessionMax: 45 };
  }

  if (hasAny(text, [/rogueli[kt]e/i, /deck[-\s]?build/i, /run-based/i, /endless/i])) {
    return { kind: 'session', estimated: true, source: 'genre_estimate', sessionMin: 20, sessionMax: 60, loop: 'runs' };
  }

  if (hasAny(text, [/fighting/i, /fighter/i, /party/i, /multiplayer/i, /online/i, /co-?op/i, /versus/i, /racing/i])) {
    return { kind: 'session', estimated: true, source: 'genre_estimate', sessionMin: 5, sessionMax: 15, loop: 'matches' };
  }

  if (hasAny(text, [/role[-\s]?playing/i, /\brpg\b/i, /jrpg/i, /open world/i, /massive/i, /vast world/i])) {
    return { kind: 'range', estimated: true, source: 'genre_estimate', mainMin: 30, mainMax: 60, extraMin: 60, extraMax: 100 };
  }

  if (hasAny(text, [/visual novel/i, /novel/i, /mystery/i, /detective/i, /story[-\s]?driven/i])) {
    return { kind: 'range', estimated: true, source: 'genre_estimate', mainMin: 10, mainMax: 25, extraMin: 20, extraMax: 35 };
  }

  if (hasAny(text, [/puzzle/i, /hidden object/i, /narrative/i, /walking/i])) {
    return { kind: 'range', estimated: true, source: 'genre_estimate', mainMin: 3, mainMax: 8, extraMin: 8, extraMax: 15 };
  }

  if (hasAny(text, [/platform/i, /metroidvania/i, /action/i, /adventure/i, /arcade/i, /shooter/i])) {
    return { kind: 'range', estimated: true, source: 'genre_estimate', mainMin: 8, mainMax: 15, extraMin: 20, extraMax: 35 };
  }

  return { kind: 'range', estimated: true, source: 'genre_estimate', mainMin: 6, mainMax: 12, extraMin: 15, extraMax: 25 };
}

export function getPlaytimeEstimate(brief, options = {}) {
  const fromBrief = normalizeHoursShape(brief?.enrichment?.hltb, 'brief_enrichment');
  if (fromBrief) return fromBrief;

  const slug = options.slug || slugifyTitle(brief?.game?.title);
  const manual = readFallbackFile()[slug];
  const fromManual = normalizeHoursShape(manual, 'enrichment-fallback.json');
  if (fromManual) return fromManual;

  return estimatePlaytimeFromBrief(brief);
}

function formatKnownHours(locale, estimate) {
  const main = estimate.main;
  const extra = estimate.extra;
  const comp = estimate.comp;
  const first = main ?? extra ?? comp;
  if (locale === 'zh-hans') {
    return `${main != null ? `约${main}小时主线` : `约${first}小时体量`}${extra != null ? `、${extra}小时附加` : ''}${comp != null ? `、约${comp}小时完美` : ''}`;
  }
  if (locale === 'ja') {
    return `${main != null ? `メイン約${main}時間` : `目安約${first}時間`}${extra != null ? `／追加約${extra}時間` : ''}${comp != null ? `／コンプ約${comp}時間` : ''}`;
  }
  if (locale === 'fr') {
    return `${main != null ? `~${main} h histoire` : `~${first} h`}${extra != null ? `, ${extra} h extras` : ''}${comp != null ? `, ~${comp} h complétion` : ''}`;
  }
  if (locale === 'es') {
    return `${main != null ? `~${main} h historia` : `~${first} h`}${extra != null ? `, ${extra} h extras` : ''}${comp != null ? `, ~${comp} h al 100%` : ''}`;
  }
  if (locale === 'de') {
    return `${main != null ? `~${main} Std. Story` : `~${first} Std.`}${extra != null ? `, ${extra} Std. Extras` : ''}${comp != null ? `, ~${comp} Std. 100 %` : ''}`;
  }
  if (locale === 'pt') {
    return `${main != null ? `~${main} h campanha` : `~${first} h`}${extra != null ? `, ${extra} h extras` : ''}${comp != null ? `, ~${comp} h 100%` : ''}`;
  }
  return `${main != null ? `${main}h main` : `${first}h scope`}${extra != null ? ` · ${extra}h+ extras` : ''}${comp != null ? ` · ~${comp}h completionist` : ''}`;
}

function formatRange(locale, estimate) {
  const main = `${estimate.mainMin}–${estimate.mainMax}`;
  const extra = estimate.extraMin != null && estimate.extraMax != null ? `${estimate.extraMin}–${estimate.extraMax}` : null;
  if (locale === 'zh-hans') return `预估体量：主线约${main}小时${extra ? `，附加约${extra}小时` : ''}`;
  if (locale === 'ja') return `目安: メイン約${main}時間${extra ? `、追加約${extra}時間` : ''}`;
  if (locale === 'fr') return `Estimation : ~${main} h histoire${extra ? `, ${extra} h extras` : ''}`;
  if (locale === 'es') return `Estimación: ~${main} h historia${extra ? `, ${extra} h extras` : ''}`;
  if (locale === 'de') return `Schätzung: ~${main} Std. Story${extra ? `, ${extra} Std. Extras` : ''}`;
  if (locale === 'pt') return `Estimativa: ~${main} h campanha${extra ? `, ${extra} h extras` : ''}`;
  return `Estimated scope: ${main}h main${extra ? ` · ${extra}h extras` : ''}`;
}

function formatSession(locale, estimate) {
  const session = `${estimate.sessionMin}–${estimate.sessionMax}`;
  const ongoing = estimate.kind === 'ongoing';
  if (locale === 'zh-hans') return ongoing ? `无固定通关线；单次约${session}分钟` : `预估：单局约${session}分钟，靠反复游玩延长`;
  if (locale === 'ja') return ongoing ? `固定クリアなし。1回約${session}分` : `目安: 1ラン約${session}分、反復で伸びる`;
  if (locale === 'fr') return ongoing ? `Pas de fin fixe; sessions de ~${session} min` : `Estimation : runs de ~${session} min, rejouabilité élevée`;
  if (locale === 'es') return ongoing ? `Sin final fijo; sesiones de ~${session} min` : `Estimación: partidas de ~${session} min, rejugable`;
  if (locale === 'de') return ongoing ? `Kein fester Abschluss; ~${session} Min. pro Session` : `Schätzung: ~${session} Min. pro Run, hoher Wiederholwert`;
  if (locale === 'pt') return ongoing ? `Sem final fixo; sessões de ~${session} min` : `Estimativa: partidas de ~${session} min, rejogável`;
  return ongoing ? `No fixed ending; ~${session} min sessions` : `Estimated: ~${session} min runs; replay-driven`;
}

export function formatPlaytime(locale, estimate) {
  if (!estimate) return formatRange(locale, estimatePlaytimeFromBrief(null));
  if (estimate.kind === 'hours') return formatKnownHours(locale, estimate);
  if (estimate.kind === 'session' || estimate.kind === 'ongoing') return formatSession(locale, estimate);
  return formatRange(locale, estimate);
}
