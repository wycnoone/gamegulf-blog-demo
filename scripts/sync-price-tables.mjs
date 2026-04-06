#!/usr/bin/env node
/**
 * Sync price tables in article bodies with frontmatter priceRows
 * 
 * This script:
 * 1. Reads all article files
 * 2. Extracts priceRows from frontmatter
 * 3. Generates locale-adaptive markdown tables
 * 4. Replaces existing tables or inserts new ones
 * 
 * Usage:
 *   node scripts/sync-price-tables.mjs
 *   node scripts/sync-price-tables.mjs src/content/posts/en/*.md
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import yaml from 'js-yaml';
import {
  buildMarkdownPriceTable,
  getEurExchangeRates,
  inferLocaleFromFilePath,
  normalizePriceRows,
} from './article-pricing-utils.mjs';

async function syncPriceTables(filePatterns) {
  let files = filePatterns;
  if (filePatterns.length === 0) {
    // Use shell glob expansion
    const output = execSync('find src/content/posts -name "*-worth-it.md" -o -name "*.md" | grep -v node_modules', { encoding: 'utf8' });
    files = output.trim().split('\n').filter(f => f.length > 0);
  }
  
  const rates = await getEurExchangeRates();
  let updated = 0;
  let errors = 0;
  
  for (const file of files) {
    try {
      const result = await processFile(file, rates);
      if (result) {
        updated++;
        console.log(`✓ ${file}`);
      }
    } catch (err) {
      errors++;
      console.error(`✗ ${file}: ${err.message}`);
    }
  }
  
  console.log(`\nDone. Updated ${updated} files, ${errors} errors.`);
}

async function processFile(filePath, rates) {
  const content = readFileSync(filePath, 'utf8');
  
  // Parse frontmatter
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  
  const fm = yaml.load(match[1]);
  if (!fm?.priceRows || !Array.isArray(fm.priceRows)) {
    return null; // No priceRows, skip
  }
  
  const locale = inferLocaleFromFilePath(filePath);
  if (!locale) {
    throw new Error('Could not infer locale');
  }
  
  // Generate expected table
  const expectedTable = await buildMarkdownPriceTable(
    normalizePriceRows(fm.priceRows), 
    locale, 
    rates
  );
  
  // Find price section in body
  const body = content.slice(match[0].length);
  const priceSectionPattern = getPriceSectionPattern(locale);
  const priceSectionMatch = body.match(priceSectionPattern);
  
  if (!priceSectionMatch) {
    throw new Error('Could not find price section');
  }
  
  // Find existing table after price section heading
  const sectionStart = priceSectionMatch.index + priceSectionMatch[0].length;
  
  // Find ALL tables in the price section (could be multiple from previous runs)
  const priceSectionEnd = body.slice(sectionStart).search(/\n## /);
  const priceSection = body.slice(sectionStart, priceSectionEnd > 0 ? sectionStart + priceSectionEnd : undefined);
  
  // Find first table pattern
  const firstTableMatch = priceSection.match(/^\s*\n?\| .+\|\s*\n\| ---+/m);
  
  let newContent;
  if (firstTableMatch) {
    // Find the start of first table
    const tableStartOffset = firstTableMatch.index || 0;
    const tableStart = sectionStart + tableStartOffset;
    
    // Find end of LAST table in price section (handle multiple tables)
    const allTableRows = priceSection.match(/(\s*\n\| .+\|)+/g);
    if (allTableRows) {
      // Find position after last table row
      let lastTableEnd = 0;
      for (const tableRows of allTableRows) {
        const searchStart = lastTableEnd;
        const match = priceSection.slice(searchStart).indexOf(tableRows);
        if (match >= 0) {
          lastTableEnd = searchStart + match + tableRows.length;
        }
      }
      
      // Remove everything from first table start to last table end
      const tableEnd = sectionStart + lastTableEnd;
      
      // Also remove any " | ---: | ---: |" fragments
      const sectionBeforeFirstTable = body.slice(sectionStart, tableStart);
      const cleanedSection = sectionBeforeFirstTable.replace(/\s*\| ---:?\s*\|\s*---:?\s*\|\s*/g, '');
      
      newContent = 
        body.slice(0, sectionStart) + 
        cleanedSection +
        '\n\n' + expectedTable + 
        '\n\n' +
        body.slice(tableEnd).replace(/^\s*\n+/, '');
    } else {
      // Fallback: simple replacement
      newContent = body.slice(0, tableStart) + '\n\n' + expectedTable + body.slice(tableStart);
    }
  } else {
    // Insert table after first paragraph of price section
    const firstParagraphEnd = body.slice(sectionStart).match(/\n\n+/);
    if (firstParagraphEnd) {
      const insertPos = sectionStart + firstParagraphEnd.index + firstParagraphEnd[0].length;
      newContent = 
        body.slice(0, insertPos) + 
        '\n\n' + expectedTable + 
        body.slice(insertPos);
    } else {
      newContent = body.slice(0, sectionStart) + '\n\n' + expectedTable + body.slice(sectionStart);
    }
  }
  
  // Write back
  const newFullContent = content.slice(0, match[0].length) + newContent;
  writeFileSync(filePath, newFullContent, 'utf8');
  
  return true;
}

function getPriceSectionPattern(locale) {
  const patterns = {
    en: /## How [Mm]uch [Dd]oes .+ [Cc]ost on Switch right now\?/iu,
    'zh-hans': /## .+Switch 版现在多少钱？/u,
    ja: /## .+は現在 Switch でいくら？/u,
    fr: /## Combien coûte .+ sur Switch actuellement \?/u,
    es: /## ¿Cuánto cuesta .+ en Switch actualmente\?/u,
    de: /## Wie viel kostet .+ aktuell auf Switch\?/u,
    pt: /## Quanto custa .+ no Switch atualmente\?/u,
  };
  
  return patterns[locale] || patterns.en;
}

// CLI
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node scripts/sync-price-tables.mjs [files...]

Syncs price tables in article bodies with frontmatter priceRows.

Examples:
  node scripts/sync-price-tables.mjs
  node scripts/sync-price-tables.mjs src/content/posts/en/*.md
`);
  process.exit(0);
}

syncPriceTables(args).catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
