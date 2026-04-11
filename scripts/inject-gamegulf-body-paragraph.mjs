#!/usr/bin/env node
/**
 * One-off / maintenance: ensure markdown body has ≥3 case-insensitive "gamegulf"
 * substrings (brand text + gamegulf.com links). Inserts a short paragraph before
 * the second H2 if count < 3. Idempotent when re-run after success.
 *
 * Usage: node scripts/inject-gamegulf-body-paragraph.mjs [path.md ...]
 *        (pass paths from your shell glob, e.g. all files under src/content/posts)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import yaml from 'js-yaml';
import { inferLocaleFromFilePath } from './article-pricing-utils.mjs';

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { fm: null, body: content, fmEnd: 0 };
  return {
    fm: yaml.load(match[1]),
    body: content.slice(match.index + match[0].length),
    fmEnd: match.index + match[0].length,
  };
}

function countGameGulf(body) {
  const m = body.match(/gamegulf/gi);
  return m ? m.length : 0;
}

function paragraphForLocale(locale, gameHref) {
  const href = String(gameHref || '').replace(/\/?$/, '');
  const grid = `${href}#currency-price`;
  const templates = {
    en: `**GameGulf:** Cross-check your region on the [live multi-region grid](${grid}) before checkout — **GameGulf** tracks this SKU so you can compare against the historical lows below.`,
    de: `**GameGulf:** Vergleiche deine Region im [Live-Preisraster](${grid}) vor dem Kauf — **GameGulf** trackt dieses SKU, damit du es mit den historischen Tiefpreisen unten abgleichen kannst.`,
    es: `**GameGulf:** Cruza tu región en la [rejilla multirregión](${grid}) antes de pagar — **GameGulf** sigue este SKU para compararlo con los mínimos históricos de abajo.`,
    fr: `**GameGulf :** compare ta région sur la [grille multi-régions](${grid}) avant de payer — **GameGulf** suit ce SKU pour le comparer aux points bas historiques ci-dessous.`,
    ja: `**GameGulf：** 決済前に[マルチリージョンの価格表](${grid})で自分のニンテンドーアカウントのストア表示を確認する。**GameGulf** はこのSKUを追跡し、下の過去最安帯との比較に使える。`,
    pt: `**GameGulf:** Confere a tua região na [grelha multirregional](${grid}) antes de pagar — **GameGulf** acompanha este SKU para comparares com os mínimos históricos abaixo.`,
    'zh-hans': `**GameGulf：** 付款前请用 [多区价格表](${grid}) 对照你的账号区服——**GameGulf** 会追踪该 SKU，方便与下方历史低价对比。`,
  };
  return templates[locale] || templates.en;
}

function insertBeforeSecondH2(body, paragraph) {
  const re = /^## .+$/gm;
  let first = true;
  let insertIndex = -1;
  for (const m of body.matchAll(re)) {
    if (first) {
      first = false;
      continue;
    }
    insertIndex = m.index;
    break;
  }
  if (insertIndex < 0) return null;
  return `${body.slice(0, insertIndex).replace(/\s+$/, '')}\n\n${paragraph}\n\n${body.slice(insertIndex)}`;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node scripts/inject-gamegulf-body-paragraph.mjs <file.md> [...]');
  process.exit(2);
}

let updated = 0;
let skipped = 0;
for (const filePath of files) {
  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    console.error(`skip (read error): ${filePath}`);
    skipped++;
    continue;
  }
  const { fm, body, fmEnd } = parseFrontmatter(content);
  if (!fm?.gameHref) {
    console.error(`skip (no gameHref): ${filePath}`);
    skipped++;
    continue;
  }
  const n = countGameGulf(body);
  if (n >= 3) {
    skipped++;
    continue;
  }
  const locale = inferLocaleFromFilePath(filePath) || 'en';
  const para = paragraphForLocale(locale, fm.gameHref);
  const newBody = insertBeforeSecondH2(body, para);
  if (!newBody) {
    console.error(`skip (no second H2): ${filePath}`);
    skipped++;
    continue;
  }
  const newCount = countGameGulf(newBody);
  if (newCount < 3) {
    console.error(`skip (still <3 after insert): ${filePath} (${newCount})`);
    skipped++;
    continue;
  }
  const out = content.slice(0, fmEnd) + newBody;
  writeFileSync(filePath, out, 'utf8');
  updated++;
}

console.log(JSON.stringify({ updated, skipped, total: files.length }, null, 2));
