#!/usr/bin/env node
/**
 * Post-process: fix body + FAQ playtime to match frontmatter playtime.
 * Handles all locales — replaces both English "Estimated..." and localized
 * "预估..." / "目安..." / "Estimation..." patterns in body and FAQ.
 *
 * Usage:
 *   node scripts/one-off/patch-article-playtime.mjs <file>
 *   node scripts/one-off/patch-article-playtime.mjs --all
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const POSTS = join(ROOT, 'src', 'content', 'posts');
const LOCALES = ['en', 'zh-hans', 'ja', 'fr', 'es', 'de', 'pt'];

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  return { fm: yaml.load(m[1]), body: m[2] };
}

function buildFile(fm, body) {
  const newYaml = yaml.dump(fm, {
    lineWidth: 0,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
    sortKeys: false,
  }).trimEnd();
  return `---\n${newYaml}\n---\n${body}`;
}

// All locale-specific wrong playtime patterns in body text
const BODY_REPLACEMENTS = [
  // English
  [/Estimated: ~[\d–]+ min runs; replay-driven/g],
  [/Estimated scope: [\d–]+h main · [\d–]+h extras/g],
  // zh-hans: "预估：单局约X–Y分钟，靠反复游玩延长"
  [/预估：单局约[\d–]+分钟，靠反复游玩延长/g],
  // zh-hans: "预估体量：主线约X–Y小时，附加约X–Y小时"
  [/预估体量：主线约[\d–]+小时，附加约[\d–]+小时/g],
  // zh-hans: "无固定通关线；单次约X–Y分钟"
  [/无固定通关线；单次约[\d–]+分钟/g],
  // ja: "目安: 1ラン約X–Y分、反復で伸びる"
  [/目安: 1ラン約[\d–]+分、反復で伸びる/g],
  // ja: "目安: メイン約X–Y時間、追加約X–Y時間"
  [/目安: メイン約[\d–]+時間、追加約[\d–]+時間/g],
  // ja: "固定クリアなし。1回約X–Y分"
  [/固定クリアなし。1回約[\d–]+分/g],
  // fr: "Estimation : runs de ~X min, rejouabilité élevée"
  [/Estimation : runs de ~[\d]+ min, rejouabilité élevée/g],
  // fr: "Estimation : ~X–Y h histoire, X–Y h extras"
  [/Estimation : ~[\d–]+ h histoire, [\d–]+ h extras/g],
  // fr: "Pas de fin fixe; sessions de ~X min"
  [/Pas de fin fixe; sessions de ~[\d]+ min/g],
  // es: "Estimación: partidas de ~X min, rejugable"
  [/Estimación: partidas de ~[\d]+ min, rejugable/g],
  // es: "Estimación: ~X–Y h historia, X–Y h extras"
  [/Estimación: ~[\d–]+ h historia, [\d–]+ h extras/g],
  // es: "Sin final fijo; sesiones de ~X min"
  [/Sin final fijo; sesiones de ~[\d]+ min/g],
  // de: "Schätzung: ~X Min. pro Run, hoher Wiederholwert"
  [/Schätzung: ~[\d]+ Min\. pro Run, hoher Wiederholwert/g],
  // de: "Schätzung: ~X–Y Std. Story, X–Y Std. Extras"
  [/Schätzung: ~[\d–]+ Std\. Story, [\d–]+ Std\. Extras/g],
  // de: "Kein fester Abschluss; ~X Min. pro Session"
  [/Kein fester Abschluss; ~[\d]+ Min\. pro Session/g],
  // pt: "Estimativa: partidas de ~X min, rejogável"
  [/Estimativa: partidas de ~[\d]+ min, rejogável/g],
  // pt: "Estimativa: ~X–Y h campanha, X–Y h extras"
  [/Estimativa: ~[\d–]+ h campanha, [\d–]+ h extras/g],
  // pt: "Sem final fixo; sessões de ~X min"
  [/Sem final fixo; sessões de ~[\d]+ min/g],
];

// Locale-specific FAQ playtime patterns
const FAQ_PATTERNS = [
  // English
  [/expected time commitment of Estimated: ~[\d–]+ min runs; replay-driven\.?/g,
   (pt) => `expected time commitment of ${pt}.`],
  [/expected time commitment of Estimated scope: [\d–]+h main · [\d–]+h extras\.?/g,
   (pt) => `expected time commitment of ${pt}.`],
  // zh-hans
  [/游玩时间参考是 预估：单局约[\d–]+分钟，靠反复游玩延长。?/g,
   (pt) => `游玩时间参考是 ${pt}。`],
  [/游玩时间参考是 预估体量：主线约[\d–]+小时，附加约[\d–]+小时。?/g,
   (pt) => `游玩时间参考是 ${pt}。`],
  // ja
  [/目安プレイ時間は 目安: 1ラン約[\d–]+分、反復で伸びる。?/g,
   (pt) => `目安プレイ時間は ${pt}。`],
  [/目安プレイ時間は 目安: メイン約[\d–]+時間、追加約[\d–]+時間。?/g,
   (pt) => `目安プレイ時間は ${pt}。`],
  // fr
  [/demande environ Estimation[\s\S]*?extras\.?/g,
   (pt) => `demande environ ${pt}.`],
  // es
  [/tiene una duración estimada de Estimación[\s\S]*?extras\.?/g,
   (pt) => `tiene una duración estimada de ${pt}.`],
  // de
  [/hat eine geschätzte Spielzeit von Schätzung[\s\S]*?Extras\.?/g,
   (pt) => `hat eine geschätzte Spielzeit von ${pt}.`],
  // pt
  [/tem duração estimada de Estimativa[\s\S]*?extras\.?/g,
   (pt) => `tem duração estimada de ${pt}.`],
];

function fixBody(body, playtime) {
  let result = body;
  for (const [regex] of BODY_REPLACEMENTS) {
    result = result.replace(regex, playtime);
  }
  return result;
}

function fixFaq(faq, playtime) {
  if (!faq || !Array.isArray(faq)) return faq;
  return faq.map(item => {
    if (!item.answer) return item;
    let ans = item.answer;
    for (const [regex, replacer] of FAQ_PATTERNS) {
      ans = ans.replace(regex, replacer(playtime));
    }
    return { ...item, answer: ans };
  });
}

function patchFile(filepath) {
  const raw = readFileSync(filepath, 'utf8');
  const parsed = parseFrontmatter(raw);
  if (!parsed) return { file: filepath, status: 'SKIP', reason: 'no frontmatter' };

  const { fm, body } = parsed;
  const playtime = fm.playtime;
  if (!playtime) return { file: filepath, status: 'SKIP', reason: 'no playtime in FM' };

  let changed = false;

  const newBody = fixBody(body, playtime);
  if (newBody !== body) changed = true;

  const newFaq = fixFaq(fm.faq, playtime);
  if (JSON.stringify(newFaq) !== JSON.stringify(fm.faq)) {
    fm.faq = newFaq;
    changed = true;
  }

  if (!changed) return { file: filepath, status: 'OK', reason: 'no changes needed' };

  writeFileSync(filepath, buildFile(fm, newBody), 'utf8');
  return { file: filepath, status: 'PATCHED' };
}

// --- main ---
const args = process.argv.slice(2);
let files = [];

if (args.includes('--all')) {
  for (const loc of LOCALES) {
    const dir = join(POSTS, loc);
    try {
      for (const f of readdirSync(dir)) {
        if (f.endsWith('-worth-it.md')) files.push(join(dir, f));
      }
    } catch {}
  }
} else if (args.length > 0) {
  files = args.map(a => a.startsWith('/') ? a : join(ROOT, a));
} else {
  console.error('Usage: node scripts/one-off/patch-article-playtime.mjs <file> | --all');
  process.exit(1);
}

let patched = 0;
let skipped = 0;
let errors = 0;
const patchedFiles = [];

for (const f of files) {
  try {
    const r = patchFile(f);
    if (r.status === 'PATCHED') {
      patched++;
      patchedFiles.push(f.replace(ROOT + '/', ''));
    } else if (r.status === 'SKIP') {
      skipped++;
    }
  } catch (e) {
    errors++;
    console.error(`ERROR ${f}: ${e.message}`);
  }
}

if (patchedFiles.length > 0) {
  console.log('Patched files:');
  patchedFiles.forEach(f => console.log(`  ${f}`));
}
console.log(`\n${patched} patched, ${skipped} skipped, ${errors} errors out of ${files.length} files`);
