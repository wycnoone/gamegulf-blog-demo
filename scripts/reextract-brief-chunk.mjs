#!/usr/bin/env node
/**
 * Re-run extract-game-brief.mjs for 3 URLs at a time (manual QA between chunks).
 *
 * Default list: scripts/.cache/reextract-seq31-plus-urls.txt (序号>=31 from docs JSON).
 *
 * Usage:
 *   node scripts/reextract-brief-chunk.mjs --chunk 0
 *   node scripts/reextract-brief-chunk.mjs --chunk 1 --list path/to/urls.txt
 *   node scripts/reextract-brief-chunk.mjs --chunk 0 --no-enrich   # faster smoke test
 *
 * Printed blog links default to local dev (Astro default port). Override if needed:
 *   BLOG_ORIGIN=https://www.gamegulf.com node scripts/reextract-brief-chunk.mjs --chunk 0
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_LIST = join(__dirname, '.cache', 'reextract-seq31-plus-urls.txt');
const EXTRACT = join(__dirname, 'extract-game-brief.mjs');
const CHUNK = 3;

/** Same order as src/lib/i18n.ts `locales` */
const LOCALES = ['en', 'zh-hans', 'fr', 'es', 'de', 'ja', 'pt'];

function normalizeGameHref(href) {
  const s = String(href).trim().split('#')[0].replace(/\/$/, '');
  return s;
}

/** Map GameGulf detail URL → English post slug (basename without .md) */
function buildGameHrefToSlugIndex() {
  const dir = join(__dirname, '..', 'src', 'content', 'posts', 'en');
  const map = new Map();
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.md')) continue;
    const raw = readFileSync(join(dir, name), 'utf8');
    const m = raw.match(/^gameHref:\s*(.+)$/m);
    if (!m) continue;
    const key = normalizeGameHref(m[1].trim().replace(/^["']|["']$/g, ''));
    if (key) map.set(key, name.replace(/\.md$/, ''));
  }
  return map;
}

let _hrefToSlug;
function slugForGameHref(gameHref) {
  if (!_hrefToSlug) _hrefToSlug = buildGameHrefToSlugIndex();
  return _hrefToSlug.get(normalizeGameHref(gameHref)) ?? null;
}

function blogOrigin() {
  // Default: local `astro dev` — copy-paste to browser with zero env setup.
  const o = (process.env.BLOG_ORIGIN || 'http://127.0.0.1:4321').replace(/\/$/, '');
  return o;
}

function printBlogArticleLinks(urls) {
  const origin = blogOrigin();
  const base = '/blog';
  console.log(`\n── Blog 文章链接（${origin}${base}/…）──`);
  for (const u of urls) {
    const slug = slugForGameHref(u);
    if (!slug) {
      console.log(`\n  ⚠ 未找到 gameHref 匹配的英文稿: ${u}`);
      console.log(`    （请在 src/content/posts/en 下确认 gameHref 与详情页一致）`);
      continue;
    }
    console.log(`\n  ${slug}`);
    for (const loc of LOCALES) {
      console.log(`    ${origin}${base}/${loc}/${slug}`);
    }
  }
  console.log('');
}

function parseArgs() {
  const a = process.argv.slice(2);
  let chunk = 0;
  let listPath = DEFAULT_LIST;
  let enrich = true;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--chunk' && a[i + 1]) chunk = Math.max(0, parseInt(a[++i], 10) || 0);
    else if (a[i] === '--list' && a[i + 1]) listPath = a[++i];
    else if (a[i] === '--no-enrich') enrich = false;
    else if (a[i] === '--help') {
      console.log(`Usage: node scripts/reextract-brief-chunk.mjs --chunk <n> [--list <urls.txt>] [--no-enrich]
After a successful extract, prints blog article URLs (7 locales) from en post gameHref.
Printed URLs default to http://127.0.0.1:4321 ; set BLOG_ORIGIN for production links.`);
      process.exit(0);
    }
  }
  return { chunk, listPath, enrich };
}

function loadUrls(path) {
  if (!existsSync(path)) {
    console.error(`Missing URL list: ${path}`);
    process.exit(1);
  }
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

const { chunk, listPath, enrich } = parseArgs();
const all = loadUrls(listPath);
const totalChunks = Math.ceil(all.length / CHUNK);
if (chunk >= totalChunks) {
  console.error(`--chunk ${chunk} is out of range (0..${totalChunks - 1}, ${all.length} URLs).`);
  process.exit(1);
}

const start = chunk * CHUNK;
const urls = all.slice(start, start + CHUNK);

console.log(`\nChunk ${chunk + 1}/${totalChunks} (URLs ${start + 1}-${start + urls.length} of ${all.length})\n`);
for (const u of urls) console.log(`  ${u}`);
console.log('');

const args = [EXTRACT, ...urls];
if (!enrich) args.push('--no-enrich');

const r = spawnSync(process.execPath, args, {
  stdio: 'inherit',
  cwd: join(__dirname, '..'),
  env: process.env,
});

if ((r.status ?? 0) === 0) {
  printBlogArticleLinks(urls);
} else {
  console.error('\n（提取失败，未打印博客链接。）\n');
}

process.exit(r.status ?? 1);
