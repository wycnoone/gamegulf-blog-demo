import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src/content/posts');

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function firstPriceRow(text) {
  const m = text.match(/priceRows:\s*\n[\t ]*-[\t ]*regionCode:[\t ]*([A-Z]{2})[^\n]*\n[\t ]*eurPrice:[\t ]*([^\n]+)\n[\t ]*nativePrice:[\t ]*([^\n]+)\n[\t ]*nativeCurrency:[\t ]*([A-Z]{3})/);
  if (!m) return null;
  const eur = Number.parseFloat(String(m[2]).replace(/[^\d.]/g, ''));
  if (!Number.isFinite(eur)) return null;
  return {
    regionCode: m[1],
    eurPrice: eur,
    nativePrice: m[3].trim().replace(/^['"]|['"]$/g, ''),
    nativeCurrency: m[4],
  };
}

function replaceField(text, key, value) {
  const line = `${key}: ${value}`;
  const re = new RegExp(`^${key}:.*$`, 'm');
  if (re.test(text)) return text.replace(re, line);
  const faqIdx = text.search(/^faq:\s*$/m);
  if (faqIdx >= 0) {
    return `${text.slice(0, faqIdx)}${line}\n${text.slice(faqIdx)}`;
  }
  return `${text}\n${line}\n`;
}

let updated = 0;
for (const file of walk(ROOT)) {
  let text = fs.readFileSync(file, 'utf8');
  const row = firstPriceRow(text);
  if (!row) continue;
  const before = text;
  text = replaceField(text, 'cardPriceNative', row.nativePrice);
  text = replaceField(text, 'cardPriceNativeCurrency', row.nativeCurrency);
  text = replaceField(text, 'cardPriceRegionCode', row.regionCode);
  text = replaceField(text, 'cardPriceEur', String(row.eurPrice));
  if (text !== before) {
    try {
      fs.writeFileSync(file, text, 'utf8');
      updated++;
    } catch {
      // ignore lock
    }
  }
}

console.log(`Raw-synced card native fields in ${updated} files.`);
