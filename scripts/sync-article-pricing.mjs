#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import yaml from 'js-yaml';
import {
  briefQualifiesForZeroPricePlaceholderGrid,
  buildCardPricePayload,
  buildMarkdownPriceTable,
  buildPriceRowsFromBrief,
  buildZeroPricePlaceholderRows,
  extractSlugFromFilePath,
  formatConvertedPriceFromEur,
  getEurExchangeRates,
  getLocalizedRegionLabel,
  getPriceSectionHeadingPattern,
  inferLocaleFromFilePath,
  normalizePriceRows,
  stripUtf8Bom,
} from './article-pricing-utils.mjs';
import { formatFrontmatterSchemaErrors } from './article-post-frontmatter-schema.mjs';

function splitFrontmatter(content) {
  const text = stripUtf8Bom(content);
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    throw new Error('No frontmatter found');
  }

  return {
    rawFrontmatter: match[1],
    frontmatter: yaml.load(match[1]) || {},
    body: text.slice(match[0].length),
  };
}

function stringifyFrontmatter(frontmatter) {
  return yaml.dump(frontmatter, {
    lineWidth: 0,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
    sortKeys: false,
  }).trimEnd();
}

function removeMarkdownTables(lines) {
  const next = [];

  for (let i = 0; i < lines.length; i += 1) {
    const header = lines[i];
    const separator = lines[i + 1];
    if (header?.includes('|') && separator && /^[\s|:-]+$/.test(separator)) {
      i += 1;
      while (i + 1 < lines.length && lines[i + 1].includes('|')) {
        i += 1;
      }
      continue;
    }
    next.push(header);
  }

  return next;
}

function injectTableIntoPriceSection(body, locale, markdownTable) {
  const lines = body.split(/\r?\n/);
  const headingPattern = getPriceSectionHeadingPattern(locale);
  const startIndex = lines.findIndex((line) => headingPattern.test(line.trim()));

  if (startIndex === -1) {
    throw new Error(`Could not find price section heading for locale "${locale}"`);
  }

  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i].trim())) {
      endIndex = i;
      break;
    }
  }

  const section = lines.slice(startIndex, endIndex);
  const cleanedSection = removeMarkdownTables(section);

  let insertAt = 1;
  while (insertAt < cleanedSection.length && cleanedSection[insertAt].trim() === '') {
    insertAt += 1;
  }

  let paragraphEnd = insertAt;
  while (paragraphEnd < cleanedSection.length && cleanedSection[paragraphEnd].trim() !== '') {
    paragraphEnd += 1;
  }
  insertAt = paragraphEnd;

  const tableLines = markdownTable.split('\n');
  const rebuiltSection = [
    ...cleanedSection.slice(0, insertAt),
    '',
    ...tableLines,
    '',
    ...cleanedSection.slice(insertAt).filter((line, index, arr) => !(index === 0 && line.trim() === '' && arr[1]?.trim() === '')),
  ];

  const nextLines = [
    ...lines.slice(0, startIndex),
    ...rebuiltSection,
    ...lines.slice(endIndex),
  ];

  return nextLines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

function loadBrief(filePath, slug) {
  const briefDir = join(resolve(dirname(filePath), '..', '..', '..', '..', 'content', 'briefs'));
  const stripped = slug
    .replace(/-worth-it$/, '')
    .replace(/-buy-now-or-wait$/, '');
  const candidates = [...new Set([slug, stripped])];
  for (const base of candidates) {
    const briefPath = join(briefDir, `${base}.json`);
    if (!existsSync(briefPath)) continue;
    try {
      return JSON.parse(readFileSync(briefPath, 'utf8'));
    } catch {
      // Corrupt brief for this candidate: try the next slug variant instead of aborting the whole lookup.
      continue;
    }
  }
  return null;
}

async function syncFile(filePath, rates, opts = {}) {
  const { forcePriceRowsFromBrief = false } = opts;
  const absolutePath = resolve(filePath);
  const locale = inferLocaleFromFilePath(absolutePath);
  if (!locale) {
    throw new Error(`Could not infer locale from path: ${filePath}`);
  }

  const content = readFileSync(absolutePath, 'utf8');
  const { frontmatter, body } = splitFrontmatter(content);

  const preSyncSchemaError = formatFrontmatterSchemaErrors(absolutePath, frontmatter);
  if (preSyncSchemaError) {
    throw new Error(`${preSyncSchemaError}\n(Refusing to run pricing sync on invalid frontmatter.)`);
  }

  const slug = extractSlugFromFilePath(absolutePath);
  const brief = loadBrief(absolutePath, slug);

  let priceRows = normalizePriceRows(frontmatter.priceRows || []);
  if (brief && (forcePriceRowsFromBrief || priceRows.length === 0)) {
    priceRows = normalizePriceRows(buildPriceRowsFromBrief(brief, locale));
    if (priceRows.length < 4 && briefQualifiesForZeroPricePlaceholderGrid(brief)) {
      priceRows = normalizePriceRows(buildZeroPricePlaceholderRows());
    }
  }

  if (priceRows.length < 4 || priceRows.length > 8) {
    throw new Error(`priceRows missing or invalid for ${filePath}; expected 4-8 rows, got ${priceRows.length}`);
  }

  frontmatter.priceRows = priceRows;

  const cardPayload = buildCardPricePayload(priceRows, locale);
  if (!cardPayload) {
    throw new Error(
      `Could not derive card price from priceRows for ${filePath} (check cheapest row has numeric eurPrice and regionCode).`,
    );
  }
  frontmatter.cardPriceEur = cardPayload.cardPriceEur;
  frontmatter.cardPriceRegionCode = cardPayload.cardPriceRegionCode;
  frontmatter.cardPriceRegion = cardPayload.cardPriceRegion;
  frontmatter.cardPrice = await formatConvertedPriceFromEur(cardPayload.cardPriceEur, locale, rates);
  frontmatter.cardPriceNative = priceRows[0].nativePrice;
  frontmatter.cardPriceNativeCurrency = priceRows[0].nativeCurrency;

  const markdownTable = await buildMarkdownPriceTable(priceRows, locale, rates);
  const nextBody = injectTableIntoPriceSection(body, locale, markdownTable);

  const postSyncSchemaError = formatFrontmatterSchemaErrors(absolutePath, frontmatter);
  if (postSyncSchemaError) {
    throw new Error(postSyncSchemaError);
  }

  const nextContent = `---\n${stringifyFrontmatter(frontmatter)}\n---\n${nextBody}`;
  writeFileSync(absolutePath, nextContent, 'utf8');

  return {
    file: filePath,
    locale,
    rows: priceRows.length,
    cardPrice: frontmatter.cardPrice,
    cheapestRegion: getLocalizedRegionLabel(priceRows[0].regionCode, locale),
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const forceFromBrief = argv.includes('--from-brief');
  const files = argv.filter((a) => a !== '--from-brief');
  if (files.length === 0) {
    console.error(
      'Usage: node scripts/sync-article-pricing.mjs [--from-brief] <file1.md> [file2.md ...]\n  --from-brief  Rebuild priceRows from content/briefs/{slug}.json when a brief exists.',
    );
    process.exit(2);
  }

  const rates = await getEurExchangeRates();
  const results = [];

  for (const file of files) {
    results.push(await syncFile(file, rates, { forcePriceRowsFromBrief: forceFromBrief }));
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
