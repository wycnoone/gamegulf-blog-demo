#!/usr/bin/env node
/**
 * Collect N unique detail URLs from GameGulf ?topic=popular (paginated).
 *
 * Usage:
 *   node scripts/fetch-popular-batch-urls.mjs [--target 100] [--max-pages 80] [--write path]
 */

import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPopularDetailUrlsUntilCount } from './popular-search-pages.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function parseArgs() {
  const a = process.argv.slice(2);
  let target = 100;
  let maxPages = 80;
  let writePath = '';
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--target' && a[i + 1]) target = parseInt(a[++i], 10) || 100;
    if (a[i] === '--max-pages' && a[i + 1]) maxPages = parseInt(a[++i], 10) || 80;
    if (a[i] === '--write' && a[i + 1]) writePath = a[++i];
  }
  return { target, maxPages, writePath };
}

async function main() {
  const { target, maxPages, writePath } = parseArgs();
  const out = await fetchPopularDetailUrlsUntilCount({
    targetCount: target,
    maxPages,
  });

  const meta = {
    topic: 'popular',
    targetCount: target,
    urlsCollected: out.urls.length,
    pagesScanned: out.pagesScanned,
    /** Highest page number that contributed at least one new id (answers "写到第几页") */
    lastPageWithNewIds: out.lastPageWithNewIds,
    idsPerPage: out.idsPerPage,
  };
  console.log(JSON.stringify(meta, null, 2));

  if (writePath) {
    const abs = writePath.startsWith('/') || /^[A-Za-z]:/.test(writePath)
      ? writePath
      : join(ROOT, writePath);
    const lines = [
      `# popular topic batch — ${new Date().toISOString().slice(0, 10)}`,
      `# lastPageWithNewIds=${out.lastPageWithNewIds} pagesScanned=${out.pagesScanned} urls=${out.urls.length}`,
      ...out.urls,
    ];
    writeFileSync(abs, `${lines.join('\n')}\n`, 'utf8');
    console.error('Wrote', abs);
  }

  if (out.urls.length < target) {
    console.error(
      `Warning: only ${out.urls.length} URLs (wanted ${target}); try raising --max-pages`,
    );
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
