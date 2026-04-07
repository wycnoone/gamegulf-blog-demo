#!/usr/bin/env node
/**
 * Auto-fix character limit violations in article frontmatter
 * 
 * This script:
 * 1. Reads all article files
 * 2. Checks character limits for critical fields
 * 3. Auto-truncates fields that exceed limits
 * 4. Preserves semantic meaning while cutting length
 * 
 * Character limits (HARD limits for SEO/card display):
 * - whatItIs: 90 chars
 * - bestFor: 60 chars
 * - avoidIf: 72 chars
 * - consensusPraise: 82 chars
 * - mainFriction: 84 chars
 * - timeFit: 82 chars
 * - fitLabel: 72 chars
 * - tldr: 160 chars
 * - listingTakeaway: 96 chars (soft, CSS allows overflow)
 * - communityVibe: 64 chars (soft, CSS allows overflow)
 * 
 * Usage:
 *   node scripts/auto-fix-char-limits.mjs
 *   node scripts/auto-fix-char-limits.mjs src/content/posts/en/*.md
 */

import { readFileSync, writeFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { listAllBlogPostMarkdownPaths, stripUtf8Bom } from './article-pricing-utils.mjs';

const CHAR_LIMITS = {
  // HARD limits - will be auto-truncated
  whatItIs: 90,
  bestFor: 60,
  avoidIf: 72,
  consensusPraise: 82,
  mainFriction: 84,
  timeFit: 82,
  fitLabel: 72,
  tldr: 160,
  // SOFT limits - warn but don't truncate (CSS handles overflow)
  listingTakeaway: 96,
  communityVibe: 64,
};

const HARD_LIMIT_FIELDS = [
  'whatItIs', 'bestFor', 'avoidIf', 'consensusPraise',
  'mainFriction', 'timeFit', 'fitLabel', 'tldr'
];

function truncateIntelligently(text, limit) {
  if (!text || text.length <= limit) return text;
  
  // Try to cut at word boundary first
  let truncated = text.slice(0, limit);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > limit * 0.7) {
    // Cut at last space if it's within reasonable range
    truncated = truncated.slice(0, lastSpace);
  }
  
  // Remove trailing punctuation that might look awkward
  truncated = truncated.replace(/[,\s]+$/, '');
  
  return truncated;
}

function fixCharLimits(filePatterns) {
  let files = filePatterns;
  if (filePatterns.length === 0) {
    files = listAllBlogPostMarkdownPaths();
  }
  
  let fixed = 0;
  let warnings = 0;
  
  for (const file of files) {
    try {
      const result = processFile(file);
      if (result?.fixed) {
        fixed++;
        console.log(`✓ ${file} (${result.changes.join(', ')})`);
      }
      if (result?.warnings?.length > 0) {
        warnings += result.warnings.length;
      }
    } catch (err) {
      console.error(`✗ ${file}: ${err.message}`);
    }
  }
  
  console.log(`\nDone. Fixed ${fixed} files, ${warnings} soft limit warnings.`);
}

function processFile(filePath) {
  const content = stripUtf8Bom(readFileSync(filePath, 'utf8'));
  
  // Parse frontmatter
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  
  const fm = yaml.load(match[1]);
  const changes = [];
  const warnings = [];
  let modified = false;
  
  // Check and fix HARD limits
  for (const field of HARD_LIMIT_FIELDS) {
    if (!fm[field]) continue;
    
    const limit = CHAR_LIMITS[field];
    const actual = fm[field].length;
    
    if (actual > limit) {
      const original = fm[field];
      fm[field] = truncateIntelligently(fm[field], limit);
      changes.push(`${field}: ${actual}→${fm[field].length}`);
      modified = true;
    }
  }
  
  // Check SOFT limits (warn only, don't truncate)
  const softFields = ['listingTakeaway', 'communityVibe'];
  for (const field of softFields) {
    if (!fm[field]) continue;
    
    const limit = CHAR_LIMITS[field];
    const actual = fm[field].length;
    
    if (actual > limit) {
      warnings.push(`${field}: ${actual} chars (limit: ${limit}, CSS allows overflow)`);
    }
  }
  
  // Write back if modified
  if (modified) {
    const newYaml = yaml.dump(fm, {
      lineWidth: -1,  // Don't wrap lines
      quotingType: '"',
      forceQuotes: false,
    });
    
    const newContent = `---\n${newYaml}---\n${content.slice(match[0].length)}`;
    writeFileSync(filePath, newContent, 'utf8');
  }
  
  return { fixed: modified, changes, warnings };
}

// CLI
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node scripts/auto-fix-char-limits.mjs [files...]

Auto-fixes character limit violations in article frontmatter.

HARD limits (auto-truncated):
  whatItIs ≤90, bestFor ≤60, avoidIf ≤72, consensusPraise ≤82,
  mainFriction ≤84, timeFit ≤82, fitLabel ≤72, tldr ≤160

SOFT limits (CSS handles overflow):
  listingTakeaway ≤96, communityVibe ≤64

Examples:
  node scripts/auto-fix-char-limits.mjs
  node scripts/auto-fix-char-limits.mjs src/content/posts/ja/*.md
`);
  process.exit(0);
}

fixCharLimits(args);
