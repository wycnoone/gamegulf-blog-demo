import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import {
  buildMarkdownPriceTable,
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

function extractFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return null;
  return { frontmatterRaw: m[1], prefix: m[0], body: raw.slice(m[0].length) };
}

function parsePriceRowsLoose(frontmatterRaw) {
  const lines = frontmatterRaw.split(/\r?\n/);
  const start = lines.findIndex((l) => /^priceRows:\s*$/.test(l.trim()));
  if (start < 0) return [];
  const rows = [];
  let current = null;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!t) continue;
    if (!line.startsWith('  ') && !line.startsWith('- ') && !line.startsWith('    ')) break;
    if (t.startsWith('- ')) {
      if (current) rows.push(current);
      current = {};
      const m = t.match(/- regionCode:\s*(.+)$/);
      if (m) current.regionCode = m[1].trim();
      continue;
    }
    if (!current) continue;
    const kv = t.match(/^([a-zA-Z]+):\s*(.+)$/);
    if (!kv) continue;
    current[kv[1]] = kv[2].trim().replace(/^['"]|['"]$/g, '');
  }
  if (current) rows.push(current);
  return rows;
}

async function main() {
  const rates = await getEurExchangeRates();
  let updated = 0;
  for (const file of walk(ROOT)) {
    const raw = fs.readFileSync(file, 'utf8');
    const meta = extractFrontmatter(raw);
    if (!meta) continue;

    let fm = null;
    try {
      fm = yaml.load(meta.frontmatterRaw);
    } catch {
      fm = null;
    }
    const parsedRows = Array.isArray(fm?.priceRows) ? fm.priceRows : parsePriceRowsLoose(meta.frontmatterRaw);
    if (!parsedRows.length) continue;

    const locale = inferLocaleFromFilePath(file);
    if (!locale) continue;
    const table = await buildMarkdownPriceTable(normalizePriceRows(parsedRows), locale, rates);

    const body = meta.body;
    const tableRe = /\| .+\|\r?\n\| ---.*\|\r?\n(?:\|.*\|\r?\n)+/;
    let newBody;
    if (tableRe.test(body)) {
      newBody = body.replace(tableRe, `${table}\n`);
    } else {
      const firstHeading = body.search(/^##\s+/m);
      if (firstHeading >= 0) {
        const afterHeading = body.indexOf('\n', firstHeading);
        newBody = `${body.slice(0, afterHeading + 1)}\n${table}\n${body.slice(afterHeading + 1)}`;
      } else {
        newBody = `${table}\n\n${body}`;
      }
    }

    if (newBody !== body) {
      try {
        fs.writeFileSync(file, `${meta.prefix}${newBody}`, 'utf8');
        updated++;
      } catch {
        // skip locked files
      }
    }
  }
  console.log(`Force-synced tables in ${updated} files.`);
}

await main();
