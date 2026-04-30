import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import {
  buildCardPricePayload,
  formatConvertedPriceFromEur,
  getEurExchangeRates,
  inferLocaleFromFilePath,
  normalizePriceRows,
} from './article-pricing-utils.mjs';

const ROOT = path.resolve('src/content/posts');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function splitFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return null;
  return { raw: m[1], prefix: m[0], body: content.slice(m[0].length) };
}

function dumpFrontmatter(frontmatter) {
  return yaml.dump(frontmatter, {
    lineWidth: 0,
    noRefs: true,
    sortKeys: false,
    quotingType: '"',
    forceQuotes: false,
  }).trimEnd();
}

let updated = 0;
let skipped = 0;
const rates = await getEurExchangeRates();
for (const file of walk(ROOT)) {
  const raw = fs.readFileSync(file, 'utf8');
  const seg = splitFrontmatter(raw);
  if (!seg) continue;
  let fm;
  try {
    fm = yaml.load(seg.raw) || {};
  } catch {
    skipped++;
    continue;
  }
  if (!Array.isArray(fm.priceRows) || fm.priceRows.length === 0) continue;
  const locale = inferLocaleFromFilePath(file);
  if (!locale) continue;
  const rows = normalizePriceRows(fm.priceRows);
  const first = rows[0];
  if (!first) continue;
  const payload = buildCardPricePayload(rows, locale);
  if (!payload) continue;

  fm.cardPriceEur = payload.cardPriceEur;
  fm.cardPriceRegionCode = payload.cardPriceRegionCode;
  fm.cardPriceRegion = payload.cardPriceRegion;
  fm.cardPrice = await formatConvertedPriceFromEur(payload.cardPriceEur, locale, rates);
  fm.cardPriceNative = first.nativePrice;
  fm.cardPriceNativeCurrency = first.nativeCurrency;

  const next = `---\n${dumpFrontmatter(fm)}\n---\n${seg.body}`;
  if (next !== raw) {
    try {
      fs.writeFileSync(file, next, 'utf8');
      updated++;
    } catch {
      skipped++;
    }
  }
}

console.log(`Synced card price fields in ${updated} files; skipped ${skipped}.`);
