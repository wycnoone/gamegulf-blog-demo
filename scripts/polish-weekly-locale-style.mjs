import fs from 'node:fs';
import path from 'node:path';

const SCOPE_PATH = path.resolve('scripts/.cache/weekly-locale-scope.json');

function readScope() {
  return JSON.parse(fs.readFileSync(SCOPE_PATH, 'utf8'));
}

function frontmatterRange(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return null;
  return { start: 0, end: m[0].length, fm: m[1] };
}

function gameTitle(raw) {
  const m = raw.match(/^gameTitle:\s*(.+)$/m);
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
}

function normalizeAnswerPrefix(content, title) {
  if (!title) return content;
  const esc = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const dup = new RegExp(`(${esc})\\s+(${esc})\\s+`, 'g');
  return content.replace(dup, '$1 ');
}

function polishText(content, locale, title) {
  let out = content;

  // shared cleanups
  out = out.replace(/[ \t]{2,}/g, ' ');
  out = normalizeAnswerPrefix(out, title);

  const shared = [
    [/buy-now/g, 'buy now'],
    [/Buy-now/g, 'Buy now'],
    [/sale posture/g, 'sale pattern'],
    [/fit-and-price decision/g, 'fit-and-price call'],
  ];

  const localeRules = {
    en: [
      ...shared,
      [/The key question is whether this loop fits your taste, not whether store copy sounds good\./g, 'The key question is whether this gameplay loop fits your taste, not whether the store copy reads well.'],
      [/Generally stable enough to play; always verify with the current patch\/build context\./g, 'It is generally stable to play, but you should still verify against the latest patch/build context.'],
    ],
    ja: [
      [/GameGulfの詳細ページ（https?:\/\/[^\s)]+）で地域別価格を比較するのが確実です。換算を推測せず、表示通貨で確認してください。/g, 'GameGulfの詳細ページで地域別価格を比較するのが確実です。換算を推測せず、表示通貨で確認してください。'],
    ],
    de: [
      [/Buy-now/g, 'Buy now'],
      [/Buy-now vs Wait/g, 'Buy now vs Wait'],
    ],
    es: [
      [/GameGulf row/g, 'fila de GameGulf'],
      [/buy now/g, 'comprar ahora'],
    ],
    fr: [
      [/buy now/g, 'acheter maintenant'],
      [/wait/g, 'attendre'],
    ],
    pt: [
      [/buy now/g, 'comprar agora'],
      [/wait/g, 'esperar'],
    ],
  };

  for (const [re, rep] of localeRules[locale] || []) {
    out = out.replace(re, rep);
  }

  return out;
}

function run(locale) {
  const scope = readScope();
  const files = scope.locales?.[locale]?.files || [];
  let changed = 0;
  for (const rel of files) {
    const file = path.resolve(rel);
    const raw = fs.readFileSync(file, 'utf8');
    const fm = frontmatterRange(raw);
    if (!fm) continue;
    const title = gameTitle(fm.fm);
    const body = raw.slice(fm.end);
    const nextBody = polishText(body, locale, title);
    if (nextBody !== body) {
      fs.writeFileSync(file, `${raw.slice(0, fm.end)}${nextBody}`, 'utf8');
      changed++;
    }
  }
  console.log(`Polished ${changed}/${files.length} files for locale ${locale}.`);
}

const locale = process.argv[2];
if (!locale) {
  console.error('Usage: node scripts/polish-weekly-locale-style.mjs <locale>');
  process.exit(2);
}
run(locale);
