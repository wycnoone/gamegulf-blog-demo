#!/usr/bin/env node
/**
 * Fill empty `playtime` frontmatter on posts from content/briefs/*.json
 * enrichment.hltb hour bands (including surrogate HLTB shapes).
 * Does not cite HLTB in the string (AGENTS.md).
 *
 * Usage:
 *   node scripts/backfill-playtime-from-briefs.mjs
 *   node scripts/backfill-playtime-from-briefs.mjs the-seven-chambers cozy-grove
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const BRIEFS = join(root, 'content', 'briefs');
const POSTS = join(root, 'src', 'content', 'posts');
const LOCALES = ['en', 'zh-hans', 'ja', 'fr', 'es', 'de', 'pt'];
const SPECIAL_WEB_HOURS = {
  'astral-chain': { main: 21, extra: 35, comp: 82 },
  'bayonetta-2': { main: 9, extra: 13, comp: 49 },
  'atari-50-the-anniversary-celebration': { main: 7, extra: 14, comp: 11 },
  bustafellows: { main: 15, extra: null, comp: 34 },
  cuphead: { main: 11, extra: null, comp: 31 },
  'dead-cells': { main: 14, extra: null, comp: 91 },
  'dosa-divas': { main: 10, extra: null, comp: null },
  'dragon-ball-fighterz': { main: 12, extra: 24, comp: 57 },
  'dragon-ball-sparking-zero': { main: 11, extra: 27, comp: 44 },
  dusk: { main: 8, extra: 10, comp: 17 },
  'hollow-knight': { main: 26, extra: 42, comp: 65 },
  'kentucky-route-zero-tv-edition': { main: 9, extra: null, comp: 13 },
  minecraft: { main: 86, extra: 174, comp: 375 },
  'nba-2k26': { main: 41, extra: 60, comp: null },
  'only-up': { main: 6, extra: null, comp: 8 },
  'overcooked-all-you-can-eat': { main: 12, extra: null, comp: 33 },
  'sonic-mania': { main: 6, extra: 10, comp: 19 },
  'star-wars-pinball': { main: 10, extra: null, comp: null },
  sumire: { main: 3, extra: 4, comp: 6 },
  'teenage-mutant-ninja-turtles-shredders-revenge': { main: 3, extra: 4, comp: 20 },
  warframe: { main: 128, extra: 779, comp: 1651 },
  'xenoblade-chronicles-3': { main: 63, extra: 102, comp: 174 },
};
const SPECIAL_PLAYTIME_TEXT = {
  'pool-room-billiard': {
    en: 'No fixed campaign end; session-based 8/9-ball matches.',
    'zh-hans': '无固定通关时长；以 8/9 球对局为主的单局体验。',
    ja: '固定のクリア時間なし。8/9ボールを1試合単位で遊ぶタイプ。',
    fr: 'Pas de campagne à duree fixe : sessions courtes en matchs 8/9-ball.',
    es: 'Sin campana de duracion fija; se juega por partidas de 8/9 bolas.',
    de: 'Keine feste Kampagnenlaufzeit; gespielt wird in einzelnen 8/9-Ball-Matches.',
    pt: 'Sem campanha com duracao fixa; a experiencia e por partidas de 8/9-ball.',
  },
};

function stripUtf8Bom(text) {
  return typeof text === 'string' ? text.replace(/^\uFEFF/, '') : '';
}

function parseMd(content) {
  const text = stripUtf8Bom(content);
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;
  let fm;
  try {
    fm = yaml.load(m[1]);
  } catch {
    return null;
  }
  return { fm, body: m[2], rawYaml: m[1] };
}

function stringifyFm(fm) {
  return yaml.dump(fm, {
    lineWidth: 0,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
    sortKeys: false,
  }).trimEnd();
}

function hoursFromBrief(brief) {
  const h = brief?.enrichment?.hltb;
  if (!h || typeof h.main_story_hours !== 'number' || !Number.isFinite(h.main_story_hours)) return null;
  return {
    main: Math.round(h.main_story_hours),
    extra:
      typeof h.main_extra_hours === 'number' && Number.isFinite(h.main_extra_hours)
        ? Math.round(h.main_extra_hours)
        : null,
    comp:
      typeof h.completionist_hours === 'number' && Number.isFinite(h.completionist_hours)
        ? Math.round(h.completionist_hours)
        : null,
  };
}

function hoursFromSpecialWeb(slug) {
  const v = SPECIAL_WEB_HOURS[slug];
  if (!v || typeof v.main !== 'number' || !Number.isFinite(v.main)) return null;
  return {
    main: Math.round(v.main),
    extra: typeof v.extra === 'number' && Number.isFinite(v.extra) ? Math.round(v.extra) : null,
    comp: typeof v.comp === 'number' && Number.isFinite(v.comp) ? Math.round(v.comp) : null,
  };
}

function formatPlaytime(locale, { main, extra, comp }) {
  if (locale === 'zh-hans') {
    return `约${main}小时主线${extra != null ? `、${extra}小时附加` : ''}${comp != null ? `、约${comp}小时完美` : ''}`;
  }
  if (locale === 'ja') {
    return `メイン約${main}時間${extra != null ? `／追加約${extra}時間` : ''}${comp != null ? `／コンプ約${comp}時間` : ''}`;
  }
  if (locale === 'fr') {
    return `~${main} h principale${extra != null ? `, ${extra} h extras` : ''}${comp != null ? `, ~${comp} h complétion` : ''}`;
  }
  if (locale === 'es') {
    return `~${main} h historia${extra != null ? `, ${extra} h extras` : ''}${comp != null ? `, ~${comp} h al 100%` : ''}`;
  }
  if (locale === 'de') {
    return `~${main} h Story${extra != null ? `, ${extra} h Extras` : ''}${comp != null ? `, ~${comp} h 100 %` : ''}`;
  }
  if (locale === 'pt') {
    return `~${main} h principal${extra != null ? `, ${extra} h extras` : ''}${comp != null ? `, ~${comp} h 100%` : ''}`;
  }
  return `${main}h main${extra != null ? ` · ${extra}h+ extras` : ''}${comp != null ? ` · ~${comp}h completionist` : ''}`;
}

function shouldFill(fm) {
  const p = fm?.playtime;
  if (p == null || String(p).trim() === '') return true;
  if (String(p).includes('暂无') || String(p).toLowerCase() === 'n/a') return true;
  return false;
}

function processSlug(slug) {
  const briefPath = join(BRIEFS, `${slug}.json`);
  if (!existsSync(briefPath)) {
    console.warn('Skip (no brief):', slug);
    return 0;
  }
  const brief = JSON.parse(readFileSync(briefPath, 'utf8'));
  const bands = hoursFromBrief(brief) || hoursFromSpecialWeb(slug);
  const hasSpecialText = !!SPECIAL_PLAYTIME_TEXT[slug];
  if (!bands && !hasSpecialText) {
    console.warn('Skip (no hltb hours in brief):', slug);
    return 0;
  }

  let updated = 0;
  for (const loc of LOCALES) {
    const candidatePaths = [
      join(POSTS, loc, `${slug}.md`),
      join(POSTS, loc, `${slug}-worth-it.md`),
    ];
    for (const mdPath of candidatePaths) {
      if (!existsSync(mdPath)) continue;
      const raw = readFileSync(mdPath, 'utf8');
      const parsed = parseMd(raw);
      if (!parsed) continue;
      const { fm, body } = parsed;
      if (!shouldFill(fm)) continue;
      const pt =
        SPECIAL_PLAYTIME_TEXT[slug]?.[loc] ??
        (bands ? formatPlaytime(loc, bands) : null);
      if (!pt) continue;
      if (pt.length > 200) continue;
      fm.playtime = pt;
      writeFileSync(mdPath, `---\n${stringifyFm(fm)}\n---\n${body}`, 'utf8');
      updated += 1;
      console.log('Updated', mdPath);
    }
  }
  return updated;
}

function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  let slugs = args;
  if (slugs.length === 0) {
    slugs = readdirSync(BRIEFS)
      .filter((f) => f.endsWith('.json'))
      .map((f) => basename(f, '.json'));
  }
  let total = 0;
  for (const slug of slugs) {
    total += processSlug(slug);
  }
  console.log(`Done. Updated ${total} markdown file(s).`);
}

main();
