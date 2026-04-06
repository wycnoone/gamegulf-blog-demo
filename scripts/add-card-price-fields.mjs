#!/usr/bin/env node
/**
 * Add cardPrice fields to Tetris Effect: Connected files
 */

import { readFileSync, writeFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { getEurExchangeRates, normalizePriceRows, buildCardPricePayload, formatConvertedPriceFromEur, getLocalizedRegionLabel } from './article-pricing-utils.mjs';

const FILES = [
  { path: 'src/content/posts/zh-hans/tetris-effect-connected-worth-it.md', locale: 'zh-hans' },
  { path: 'src/content/posts/en/tetris-effect-connected-worth-it.md', locale: 'en' },
  { path: 'src/content/posts/ja/tetris-effect-connected-worth-it.md', locale: 'ja' },
  { path: 'src/content/posts/de/tetris-effect-connected-worth-it.md', locale: 'de' },
  { path: 'src/content/posts/fr/tetris-effect-connected-worth-it.md', locale: 'fr' },
  { path: 'src/content/posts/es/tetris-effect-connected-worth-it.md', locale: 'es' },
  { path: 'src/content/posts/pt/tetris-effect-connected-worth-it.md', locale: 'pt' },
];

async function fixFile(fileInfo) {
  const { path: filePath, locale } = fileInfo;
  console.log(`Processing ${filePath}...`);
  
  const content = readFileSync(filePath, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  
  if (!match) {
    console.error(`  ✗ No frontmatter found`);
    return false;
  }
  
  let fm = yaml.load(match[1]);
  const body = content.slice(match[0].length);
  
  if (!fm.priceRows || !Array.isArray(fm.priceRows)) {
    console.error(`  ✗ No priceRows found`);
    return false;
  }
  
  const rates = await getEurExchangeRates();
  const priceRows = normalizePriceRows(fm.priceRows);
  const cardPayload = buildCardPricePayload(priceRows, locale);
  
  if (!cardPayload) {
    console.error(`  ✗ Could not build card price payload`);
    return false;
  }
  
  const expectedCardPrice = await formatConvertedPriceFromEur(cardPayload.cardPriceEur, locale, rates);
  const expectedCardNativePrice = priceRows[0].displayNativePrice || priceRows[0].nativePrice;
  const firstRow = priceRows[0];
  
  // Add card price fields
  fm.cardPrice = expectedCardPrice;
  fm.cardPriceEur = cardPayload.cardPriceEur;
  fm.cardPriceRegionCode = cardPayload.cardPriceRegionCode;
  fm.cardPriceRegion = cardPayload.cardPriceRegion;
  fm.cardPriceNative = expectedCardNativePrice;
  fm.cardPriceNativeCurrency = firstRow.nativeCurrency;
  
  // Rebuild the file
  const newYaml = yaml.dump(fm, {
    lineWidth: -1,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
  
  const newContent = `---\n${newYaml}---\n${body}`;
  
  writeFileSync(filePath, newContent, 'utf8');
  
  console.log(`  ✓ Added cardPrice fields (lowest: ${cardPayload.cardPriceRegion} at EUR ${cardPayload.cardPriceEur})`);
  return true;
}

async function main() {
  console.log('Adding cardPrice fields to Tetris Effect: Connected files...\n');
  
  let success = 0;
  let errors = 0;
  
  for (const fileInfo of FILES) {
    try {
      const result = await fixFile(fileInfo);
      if (result) success++;
      else errors++;
    } catch (err) {
      errors++;
      console.error(`  ✗ Error: ${err.message}`);
    }
  }
  
  console.log(`\nDone. Fixed ${success} files, ${errors} errors.`);
}

main().catch(console.error);
