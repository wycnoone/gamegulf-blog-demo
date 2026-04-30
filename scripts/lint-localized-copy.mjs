#!/usr/bin/env node
/**
 * Lightweight localized-copy lint for generated article markdown.
 *
 * This script intentionally emits warnings only. It catches obvious localization
 * issues that schema validation cannot judge, such as zh-hans translationese,
 * leftover English storefront titles, and missing local game names near the
 * first body mention.
 *
 * Usage:
 *   node scripts/lint-localized-copy.mjs <path-to-md-file>
 *   node scripts/lint-localized-copy.mjs --all
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const postsRoot = join(repoRoot, 'src/content/posts');

const ZH_TRANSLATIONESE_PATTERNS = [
  { pattern: /价值区间/u, message: 'Use “划算价位 / 好价区间 / 值得优先看的价位” instead of “价值区间”.' },
  { pattern: /价格姿态/u, message: 'Use “当前价位 / 当前价格位置” instead of “价格姿态”.' },
  { pattern: /内容体量配置/u, message: 'Avoid “内容体量配置”; describe session length or completion scope directly.' },
  { pattern: /叙事体验/u, message: 'Avoid abstract “叙事体验” when simpler “剧情 / 讲故事方式” works.' },
  { pattern: /索引到/u, message: 'Use reader-facing wording like “显示 / 记录 / 追踪到” instead of “索引到”.' },
  { pattern: /安全选择|安全的一方/u, message: 'Use “稳妥选择 / 稳妥的任天堂第一方代表作” instead of literal “安全选择”.' },
  { pattern: /历史低价带/u, message: 'Use “近期低价区间 / 接近历史低价” unless analytics prove an actual all-time low.' },
];

function collectAllPostMdFiles() {
  const out = [];
  if (!existsSync(postsRoot)) return out;
  for (const locale of readdirSync(postsRoot)) {
    const localeDir = join(postsRoot, locale);
    if (!statSync(localeDir).isDirectory()) continue;
    for (const name of readdirSync(localeDir)) {
      if (name.endsWith('.md')) out.push(join(localeDir, name));
    }
  }
  return out;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { fm: null, body: content };
  return {
    fm: yaml.load(match[1]),
    body: content.slice(match[0].length).trimStart(),
  };
}

function inferLocale(filePath) {
  const parts = filePath.replace(/\\/g, '/').split('/');
  const postsIndex = parts.lastIndexOf('posts');
  return postsIndex >= 0 ? parts[postsIndex + 1] : null;
}

function normalizeForCompare(value = '') {
  return String(value)
    .replace(/[《》『』「」“”"'’‘:：™®©]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function firstBodyText(body) {
  return body
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.trim().startsWith('|'))
    .slice(0, 8)
    .join('\n')
    .replace(/[#*_`\[\]()]/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function faqAnswerOpenings(faq) {
  if (!Array.isArray(faq)) return [];
  return faq
    .map((item) => String(item?.answer ?? '').replace(/\s+/g, ' ').trim().slice(0, 80))
    .filter(Boolean);
}

function lintFile(filePath) {
  const absPath = filePath.startsWith(repoRoot) ? filePath : join(repoRoot, filePath);
  const relPath = relative(repoRoot, absPath).replace(/\\/g, '/');
  const content = readFileSync(absPath, 'utf8');
  const { fm, body } = parseFrontmatter(content);
  const warnings = [];

  if (!fm || typeof fm !== 'object') {
    return { file: relPath, status: 'WARN', warnings: ['Missing or invalid frontmatter; localized copy checks skipped.'] };
  }

  const locale = inferLocale(absPath);
  const gameTitle = String(fm.gameTitle ?? '').trim();
  const title = String(fm.title ?? '').trim();
  const firstText = firstBodyText(body);
  const normalizedGameTitle = normalizeForCompare(gameTitle);
  const normalizedFirstText = normalizeForCompare(firstText);

  if (locale && locale !== 'en') {
    if (gameTitle && firstText && !normalizedFirstText.includes(normalizedGameTitle)) {
      warnings.push(`First body paragraph should mention localized gameTitle “${gameTitle}” near the opening.`);
    }

    const openings = faqAnswerOpenings(fm.faq);
    openings.forEach((opening, index) => {
      if (gameTitle && !normalizeForCompare(opening).startsWith(normalizedGameTitle)) {
        warnings.push(`FAQ answer ${index + 1} should start with localized gameTitle “${gameTitle}”.`);
      }
    });
  }

  if (locale === 'zh-hans') {
    for (const { pattern, message } of ZH_TRANSLATIONESE_PATTERNS) {
      if (pattern.test(body) || pattern.test(title) || pattern.test(String(fm.description ?? ''))) {
        warnings.push(`zh-hans translationese: ${message}`);
      }
    }

    const englishTitleLike = title.match(/[A-Z][A-Za-z0-9®™:'’\-]+(?:\s+[A-Z][A-Za-z0-9®™:'’\-]+)+/u)?.[0];
    if (englishTitleLike && /[\u4e00-\u9fff]/u.test(gameTitle)) {
      warnings.push(`zh-hans title may contain leftover English title “${englishTitleLike}”; prefer the common Chinese game name unless English is the local name.`);
    }
  }

  return {
    file: relPath,
    status: warnings.length ? 'WARN' : 'PASS',
    warnings,
  };
}

const args = process.argv.slice(2);
let files;

if (args.includes('--all')) {
  files = collectAllPostMdFiles();
} else if (args.length) {
  files = args;
} else {
  console.error('Usage: node scripts/lint-localized-copy.mjs <path-to-md-file> | --all');
  process.exit(2);
}

const results = files.map(lintFile);
console.log(JSON.stringify(results, null, 2));

const warningCount = results.reduce((sum, item) => sum + item.warnings.length, 0);
if (warningCount > 0) {
  console.error(`Localized copy lint completed with ${warningCount} warning(s).`);
}
