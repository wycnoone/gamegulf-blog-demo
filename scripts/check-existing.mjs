#!/usr/bin/env node
/**
 * Check if articles already exist for a GameGulf game URL.
 *
 * Usage:
 *   node scripts/check-existing.mjs <gamegulf-url>
 *   node scripts/check-existing.mjs https://www.gamegulf.com/detail/3GVaaSqOXnv
 *
 * Output (JSON to stdout):
 *   { "status": "NEW", "gameId": "3GVaaSqOXnv" }
 *   or
 *   { "status": "EXISTS", "gameId": "3GVaaSqOXnv", "slug": "hades-worth-it", "locales": ["en","zh-hans",...], "count": 7 }
 *
 * Exit codes:
 *   0 = NEW (no articles found)
 *   1 = EXISTS (articles already present)
 *   2 = ERROR (invalid input)
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = join(__dirname, '..', 'src', 'content', 'posts');
const LOCALES = ['en', 'zh-hans', 'ja', 'fr', 'es', 'de', 'pt'];

function extractGameId(url) {
  const m = url.match(/\/detail\/([^/?#]+)/);
  return m ? m[1] : null;
}

function scanExistingArticles() {
  const index = new Map();

  for (const locale of LOCALES) {
    const dir = join(POSTS_DIR, locale);
    let files;
    try {
      files = readdirSync(dir).filter((f) => f.endsWith('.md'));
    } catch {
      continue;
    }

    for (const file of files) {
      const content = readFileSync(join(dir, file), 'utf8');
      const hrefMatch = content.match(/^gameHref:\s*(?:"([^"]+)"|(\S+))/m);
      if (!hrefMatch) continue;

      const href = hrefMatch[1] || hrefMatch[2];
      const gid = extractGameId(href);
      if (!gid) continue;

      if (!index.has(gid)) {
        index.set(gid, { slug: file.replace(/\.md$/, ''), locales: [] });
      }
      index.get(gid).locales.push(locale);
    }
  }

  return index;
}

const url = process.argv[2];
if (!url || !url.includes('gamegulf.com/detail/')) {
  console.error(JSON.stringify({ status: 'ERROR', message: 'Usage: node scripts/check-existing.mjs <gamegulf-detail-url>' }));
  process.exit(2);
}

const gameId = extractGameId(url);
if (!gameId) {
  console.error(JSON.stringify({ status: 'ERROR', message: `Cannot extract game ID from: ${url}` }));
  process.exit(2);
}

const index = scanExistingArticles();
const entry = index.get(gameId);

if (entry) {
  const result = {
    status: 'EXISTS',
    gameId,
    slug: entry.slug,
    locales: entry.locales.sort(),
    count: entry.locales.length,
  };
  console.log(JSON.stringify(result));
  process.exit(1);
} else {
  console.log(JSON.stringify({ status: 'NEW', gameId }));
  process.exit(0);
}
