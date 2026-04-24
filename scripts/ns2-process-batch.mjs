#!/usr/bin/env node
/**
 * Process NS2 batch URL list: check-existing → mark-started → extract →
 * synthesize-worth-it-from-brief → sync-article-pricing → validate → mark-done.
 *
 * Usage:
 *   node scripts/ns2-process-batch.mjs [content/ns2-batch-active-urls.txt]
 *   node scripts/ns2-process-batch.mjs --queue-pending
 *
 * --queue-pending  Process every game-queue.json entry with status pending
 *                  and notes "NS2 TodaysDeals batch" (ignores file argument).
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const QUEUE_PATH = join(ROOT, 'content', 'game-queue.json');
const NS2_QUEUE_NOTES = 'NS2 TodaysDeals batch';
const LOCALES = ['en', 'zh-hans', 'ja', 'fr', 'es', 'de', 'pt'];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function sleepSync(ms) {
  const t = Date.now() + ms;
  while (Date.now() < t) {
    /* spin */
  }
}

function runQueue(args) {
  let lastErr;
  for (let i = 0; i < 6; i++) {
    try {
      return run('node', ['scripts/queue-next.mjs', ...args]);
    } catch (e) {
      lastErr = e;
      sleepSync(400 * (i + 1));
    }
  }
  throw lastErr;
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: opts.pipe ? 'pipe' : 'inherit',
    ...opts,
  });
}

/** extract-game-brief prints `✔ <path.json>` — match absolute path or content/briefs/… */
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
        console.log('Already exists, marking done:', chk);
        try {
          runQueue(['--mark-done', url]);
        } catch {
          /* ignore */
        }
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

  runQueue(['--mark-started', url]);

  const ex = spawnSync('node', ['scripts/extract-game-brief.mjs', url], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const extractOut = `${ex.stdout || ''}\n${ex.stderr || ''}`;
  if (ex.status !== 0) {
    console.error('Extract failed:', extractOut);
    try {
      runQueue(['--mark-done', url]);
    } catch {
      /* ignore */
    }
    return { url, status: 'error_extract' };
  }

  const briefPath = parseBriefPathFromExtractLog(extractOut);
  if (!briefPath || !existsSync(briefPath)) {
    console.error('Could not find brief path in extract output');
    try {
      runQueue(['--mark-done', url]);
    } catch {
      /* ignore */
    }
    return { url, status: 'error_brief_path' };
  }

  const finish = (status, extra = {}) => {
    try {
      runQueue(['--mark-done', url]);
    } catch {
      /* ignore */
    }
    return { url, status, ...extra };
  };

  try {
    run('node', ['scripts/synthesize-worth-it-from-brief.mjs', briefPath]);
  } catch (e) {
    console.error('Synthesize failed:', e.message || e);
    return finish('error_synthesize');
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
    return finish('error_sync', { slug });
  }

  const val = spawnSync('node', ['scripts/validate-article.mjs', ...mdPaths], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (val.status !== 0) {
    console.error('Validate failed for', slug, val.stdout || val.stderr);
    return finish('error_validate', { slug });
  }

  return finish('ok', { slug });
}

async function main() {
  const argv = process.argv.slice(2);
  const queuePending = argv.includes('--queue-pending') || argv.includes('--pending');

  let urls;
  if (queuePending) {
    const q = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'));
    urls = q.games
      .filter((g) => g.status === 'pending' && g.notes === NS2_QUEUE_NOTES)
      .map((g) => g.url);
    console.log(
      JSON.stringify({ mode: 'queue-pending', pendingNs2Urls: urls.length }, null, 2),
    );
  } else {
    const batchFile =
      argv.find((a) => !a.startsWith('-')) ||
      join(ROOT, 'content', 'ns2-batch-active-urls.txt');
    if (!existsSync(batchFile)) {
      console.error('Missing batch file:', batchFile);
      process.exit(2);
    }
    urls = readUrls(batchFile);
  }
  const delayMs = parseInt(process.env.NS2_BATCH_DELAY_MS || '2200', 10) || 2200;
  const results = [];
  for (const url of urls) {
    results.push(await processOne(url));
    await sleep(delayMs);
  }
  console.log(JSON.stringify(results, null, 2));
  const failed = results.filter((r) => r.status !== 'ok' && r.status !== 'skipped_exists');
  if (failed.length) {
    console.warn('Batch finished with non-ok entries:', failed.map((r) => `${r.url} → ${r.status}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
