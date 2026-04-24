#!/usr/bin/env node
/**
 * Process popular-topic detail URLs one-by-one (no game-queue writes):
 * check-existing → extract → synthesize-worth-it-from-brief → sync-article-pricing → validate.
 *
 * Usage:
 *   node scripts/popular-process-batch.mjs [content/popular-batch-urls.txt]
 *   node scripts/popular-process-batch.mjs --limit 5   # first N URLs from default file
 *
 * Env: POPULAR_BATCH_DELAY_MS (default 2200) between games.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DEFAULT_LIST = join(ROOT, 'content', 'popular-batch-urls.txt');
const LOCALES = ['en', 'zh-hans', 'ja', 'fr', 'es', 'de', 'pt'];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: opts.pipe ? 'pipe' : 'inherit',
    ...opts,
  });
}

/** extract-game-brief prints `✔ <absoluteOrRelativePath.json>` and `slug → path` summary. */
function parseBriefPathFromExtractLog(output) {
  if (!output) return null;
  const check = output.match(/[✔✓]\s+([^\r\n]+\.json)/);
  if (check) {
    const p = check[1].trim();
    if (existsSync(p)) return p;
  }
  const arrow = output.match(/→\s+([^\r\n]+\.json)/);
  if (arrow) {
    const p = arrow[1].trim();
    if (existsSync(p)) return p;
  }
  const rel = output.match(/content[\\/]briefs[\\/][^\s\r\n]+\.json/);
  if (rel) {
    const parts = rel[0].split(/[/\\]/);
    const file = parts[parts.length - 1];
    const p = join(ROOT, 'content', 'briefs', file);
    if (existsSync(p)) return p;
  }
  return null;
}

function readUrls(path) {
  const text = readFileSync(path, 'utf8');
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('http'));
}

function parseArgs(argv) {
  let file = DEFAULT_LIST;
  let limit = Infinity;
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--limit' && argv[i + 1]) {
      limit = parseInt(argv[++i], 10) || Infinity;
      continue;
    }
    if (!argv[i].startsWith('-')) file = argv[i];
    else rest.push(argv[i]);
  }
  return { file, limit };
}

async function processOne(url) {
  console.log('\n==========', url, '==========\n');
  const chkRes = spawnSync('node', ['scripts/check-existing.mjs', url], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  const chk = (chkRes.stdout || '').trim();
  if (chkRes.status === 1) {
    try {
      const j = JSON.parse(chk);
      if (j.status === 'EXISTS') {
        console.log('Skip (already exists):', chk);
        return { url, status: 'skipped_exists' };
      }
    } catch {
      /* fallthrough */
    }
    console.error('check-existing unexpected exit 1', chk);
    return { url, status: 'error_check' };
  }
  if (chkRes.status !== 0) {
    console.error('check-existing error', chkRes.stderr);
    return { url, status: 'error_check' };
  }

  const j = JSON.parse(chk);
  if (j.status !== 'NEW') {
    console.error('Unexpected check status', j);
    return { url, status: 'error_check' };
  }

  const ex = spawnSync('node', ['scripts/extract-game-brief.mjs', url], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const extractOut = `${ex.stdout || ''}\n${ex.stderr || ''}`;
  if (ex.status !== 0) {
    console.error('Extract failed:', extractOut);
    return { url, status: 'error_extract' };
  }

  const briefPath = parseBriefPathFromExtractLog(extractOut);
  if (!briefPath || !existsSync(briefPath)) {
    console.error('Could not find brief path in extract output');
    return { url, status: 'error_brief_path' };
  }

  try {
    run('node', ['scripts/synthesize-worth-it-from-brief.mjs', briefPath]);
  } catch (e) {
    console.error('Synthesize failed:', e.message || e);
    return { url, status: 'error_synthesize', briefPath };
  }

  const brief = JSON.parse(readFileSync(briefPath, 'utf8'));
  const slug =
    brief.game.title
      .toLowerCase()
      .replace(/[™®©:]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-worth-it';

  const mdPaths = LOCALES.map((loc) =>
    join(ROOT, 'src', 'content', 'posts', loc, `${slug}.md`),
  );

  try {
    run('node', ['scripts/sync-article-pricing.mjs', ...mdPaths]);
  } catch (e) {
    console.error('Pricing sync failed:', e.message || e);
    return { url, status: 'error_sync', slug };
  }

  const val = spawnSync('node', ['scripts/validate-article.mjs', ...mdPaths], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (val.status !== 0) {
    console.error('Validate failed for', slug, val.stdout || val.stderr);
    return { url, status: 'error_validate', slug };
  }

  return { url, status: 'ok', slug };
}

async function main() {
  const argv = process.argv.slice(2);
  const { file, limit } = parseArgs(argv);
  if (!existsSync(file)) {
    console.error('Missing URL list:', file, '(run fetch-popular-batch-urls.mjs --write first)');
    process.exit(2);
  }
  let urls = readUrls(file);
  if (Number.isFinite(limit)) urls = urls.slice(0, limit);

  const delayMs = parseInt(process.env.POPULAR_BATCH_DELAY_MS || '2200', 10) || 2200;
  console.log(
    JSON.stringify(
      { file, games: urls.length, delayMs },
      null,
      2,
    ),
  );

  const results = [];
  for (const url of urls) {
    results.push(await processOne(url));
    await sleep(delayMs);
  }
  console.log(JSON.stringify(results, null, 2));
  const failed = results.filter((r) => r.status !== 'ok' && r.status !== 'skipped_exists');
  if (failed.length) {
    console.warn('Batch finished with non-ok:', failed.map((r) => `${r.url} → ${r.status}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
