#!/usr/bin/env node
/**
 * Batch Game Brief Extractor
 *
 * Reads a list of GameGulf URLs (one per line) and extracts briefs for all of them.
 *
 * Usage:
 *   node scripts/batch-extract.mjs <urls-file> [--out <dir>] [--delay <ms>]
 *
 * Example:
 *   echo https://www.gamegulf.com/detail/h14iXKeQ0PR > urls.txt
 *   echo https://www.gamegulf.com/detail/3GVaaSqOXnv >> urls.txt
 *   node scripts/batch-extract.mjs urls.txt
 *
 * Or pipe URLs directly:
 *   node scripts/batch-extract.mjs --stdin
 */

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXTRACTOR = join(__dirname, 'extract-game-brief.mjs');

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { urls: [], outDir: null, delay: 2000, fromStdin: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && args[i + 1]) {
      opts.outDir = args[++i];
    } else if (args[i] === '--delay' && args[i + 1]) {
      opts.delay = parseInt(args[++i], 10) || 2000;
    } else if (args[i] === '--stdin') {
      opts.fromStdin = true;
    } else if (args[i] === '--help') {
      console.log(`
Batch Game Brief Extractor

Usage:
  node scripts/batch-extract.mjs <urls-file> [options]

Options:
  --out <dir>     Output directory (default: content/briefs)
  --delay <ms>    Delay between requests in ms (default: 2000)
  --stdin         Read URLs from stdin instead of file

File format:
  One URL per line. Empty lines and lines starting with # are skipped.
`);
      process.exit(0);
    } else if (!args[i].startsWith('-')) {
      const content = readFileSync(args[i], 'utf8');
      const lines = content
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'));
      opts.urls.push(...lines);
    }
  }

  return opts;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const opts = parseArgs();

  if (opts.fromStdin) {
    const input = readFileSync(0, 'utf8');
    const lines = input
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));
    opts.urls.push(...lines);
  }

  if (opts.urls.length === 0) {
    console.error('No URLs provided. Use --help for usage.');
    process.exit(1);
  }

  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  GameGulf Batch Extractor                ║`);
  console.log(`║  ${opts.urls.length} URL(s) to process${' '.repeat(Math.max(0, 24 - String(opts.urls.length).length))}║`);
  console.log(`╚══════════════════════════════════════════╝\n`);

  const results = { success: [], failed: [] };

  for (let i = 0; i < opts.urls.length; i++) {
    const url = opts.urls[i];
    const progress = `[${i + 1}/${opts.urls.length}]`;

    console.log(`${progress} Processing: ${url}`);

    try {
      const cmdArgs = [EXTRACTOR, url];
      if (opts.outDir) cmdArgs.push('--out', opts.outDir);

      execFileSync('node', cmdArgs, {
        stdio: 'inherit',
        timeout: 30_000,
      });

      results.success.push(url);
    } catch (err) {
      console.error(`${progress} FAILED: ${err.message}`);
      results.failed.push({ url, error: err.message });
    }

    if (i < opts.urls.length - 1) {
      console.log(`  ⏳ Waiting ${opts.delay}ms…\n`);
      await sleep(opts.delay);
    }
  }

  console.log(`\n════════════════════════════════════════════`);
  console.log(`  Results: ${results.success.length} succeeded, ${results.failed.length} failed`);
  if (results.failed.length > 0) {
    console.log(`\n  Failed URLs:`);
    for (const f of results.failed) {
      console.log(`    ✘ ${f.url}`);
      console.log(`      ${f.error}`);
    }
  }
  console.log(`════════════════════════════════════════════\n`);

  process.exit(results.failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
