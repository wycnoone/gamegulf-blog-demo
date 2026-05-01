#!/usr/bin/env node
/**
 * Mechanical cleanup for reader-facing copy leaks caught by validate-article:
 * empty parentheses, source/tool names, generic takeaways, and stale
 * hasOtherPlatforms flags without display labels.
 *
 * Usage:
 *   node scripts/one-off/fix-reader-facing-copy-issues.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const REPO_ROOT = path.resolve('.');
const POSTS_ROOT = path.join(REPO_ROOT, 'src/content/posts');

const GENERIC_TAKEAWAY_PATTERNS = [
  /gameplay-fit call first/i,
  /先看玩法是否对味/u,
  /まず遊びの相性/u,
  /se juge d’abord sur l’envie de jouer/iu,
  /se decide primero por encaje de juego/iu,
  /zuerst eine Frage des Spielgeschmacks/iu,
  /é antes uma decisão de gosto/iu,
];

const MSRP_BY_LOCALE = {
  'zh-hans': '标价',
  ja: '定価',
  fr: 'prix catalogue',
  es: 'precio de lista',
  de: 'Listenpreis',
  pt: 'preço cheio',
};

const PRICEROWS_BY_LOCALE = {
  'zh-hans': '价格快照',
  ja: '価格スナップショット',
  fr: 'instantané de prix',
  es: 'captura de precios',
  de: 'Preissnapshot',
  pt: 'recorte de preços',
  en: 'price snapshot',
};

const HLTB_REPLACEMENT_BY_LOCALE = {
  'zh-hans': '时长参考：',
  ja: 'プレイ時間の目安：',
  fr: 'Durée indicative : ',
  es: 'Duración orientativa: ',
  de: 'Spielzeit-Richtwert: ',
  pt: 'Duração estimada: ',
  en: 'Runtime guide: ',
};

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.md')) out.push(full);
  }
  return out;
}

function inferLocale(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const match = normalized.match(/\/posts\/([^/]+)\//);
  return match?.[1] || 'en';
}

function splitFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return null;
  return {
    full: match[0],
    frontmatter: match[1],
    body: raw.slice(match[0].length),
  };
}

function parseFrontmatter(raw) {
  const split = splitFrontmatter(raw);
  if (!split) return null;
  return yaml.load(split.frontmatter) || {};
}

function dumpField(field, value) {
  return yaml.dump(
    { [field]: value },
    {
      lineWidth: 0,
      noRefs: true,
      quotingType: '"',
      forceQuotes: false,
      sortKeys: false,
    },
  ).trimEnd();
}

function replaceTopLevelField(raw, field, value) {
  const split = splitFrontmatter(raw);
  if (!split) return raw;
  const lines = split.frontmatter.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^${field}:`).test(line));
  if (start < 0) return raw;

  let end = start + 1;
  while (end < lines.length && !/^[A-Za-z][A-Za-z0-9_-]*:/.test(lines[end])) {
    end += 1;
  }

  const replacement = dumpField(field, value).split(/\r?\n/);
  const nextFrontmatter = [
    ...lines.slice(0, start),
    ...replacement,
    ...lines.slice(end),
  ].join('\n');
  const closing = split.full.endsWith('\n') ? '---\n' : '---';
  return `---\n${nextFrontmatter}\n${closing}${split.body}`;
}

function cleanCue(value, fallback) {
  const text = String(value || '')
    .replace(/[`*_#>[\\\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return fallback;
  return text
    .split(/[。.!?；;]\s*/u)[0]
    .replace(/^[-—:：\s]+/u, '')
    .slice(0, 54)
    .trim() || fallback;
}

function buildTakeaway(locale, fm) {
  const game = String(fm.gameTitle || 'This game').trim();
  const feature = cleanCue(fm.whatItIs || fm.playStyle, locale === 'zh-hans' ? '清晰玩法循环' : 'a clear core loop');
  const priceCue = cleanCue(fm.currentDeal || fm.priceSignal || fm.salePattern, locale === 'zh-hans' ? '先核对当前区服价' : 'check the current regional price');

  const templates = {
    en: `${game} works best if you want ${feature}; ${priceCue}, then choose buy-now or wait.`,
    'zh-hans': `${game} 适合想要${feature}的玩家；${priceCue}，再决定现在买还是继续等。`,
    ja: `${game}は${feature}を求める人向けです。${priceCue}を見て、今買うか待つか決めましょう。`,
    fr: `${game} convient surtout si vous cherchez ${feature}; ${priceCue}, puis tranchez achat ou attente.`,
    es: `${game} encaja si buscas ${feature}; ${priceCue} y decide comprar ahora o esperar.`,
    de: `${game} passt, wenn du ${feature} suchst; ${priceCue}, dann Kaufen oder Warten wählen.`,
    pt: `${game} combina com quem quer ${feature}; ${priceCue} e então decida comprar agora ou esperar.`,
  };
  return (templates[locale] || templates.en).slice(0, 200);
}

function replaceReaderFacingText(raw, locale) {
  let next = raw;
  next = next.replace(/[（(]\s*[）)]/g, '');
  next = next.replace(/`priceRows`/g, PRICEROWS_BY_LOCALE[locale] || PRICEROWS_BY_LOCALE.en);
  next = next.replace(/\bpriceRows\b(?!\s*:)/g, PRICEROWS_BY_LOCALE[locale] || PRICEROWS_BY_LOCALE.en);
  next = next.replace(/\bfrontmatter\b/gi, PRICEROWS_BY_LOCALE[locale] || PRICEROWS_BY_LOCALE.en);
  next = next.replace(/\b(?:HLTB|HowLongToBeat)\b\s*(?:汇总|まとめ|annonce|nennt|indique)?\s*[:：]?\s*/gi, HLTB_REPLACEMENT_BY_LOCALE[locale] || HLTB_REPLACEMENT_BY_LOCALE.en);
  next = next.replace(/historical low\s*\/\s*sale\s*\/\s*discount/gi, {
    'zh-hans': '历史低价 / 促销 / 折扣',
    ja: '最安値 / セール / 割引',
    fr: 'plus bas historique / promo / remise',
    es: 'mínimo histórico / oferta / descuento',
    de: 'Tiefpreis / Rabatt / Angebot',
    pt: 'menor preço / promoção / desconto',
    en: 'historical low / sale / discount',
  }[locale] || 'historical low / sale / discount');

  next = next
    .replace(/Discount\/Sale-Hinweis:/g, 'Rabatt-Hinweis:')
    .replace(/historical low Fenster/g, 'Tiefpreisfenster')
    .replace(/Nota de discount\/sale:/g, 'Nota de oferta:')
    .replace(/un historical low util/g, 'una zona de mínimo histórico')
    .replace(/Signal discount\/sale:/g, 'Signal promo:')
    .replace(/la zone historical low/g, 'la zone de plus bas historique')
    .replace(/Sinal de discount\/sale:/g, 'Sinal de promoção:')
    .replace(/faixa historical low util/g, 'faixa de menor preço');

  if (locale !== 'en' && MSRP_BY_LOCALE[locale]) {
    next = next.replace(/\bMSRP\b/g, MSRP_BY_LOCALE[locale]);
  }

  return next;
}

function fixFile(file) {
  const locale = inferLocale(file);
  let raw = fs.readFileSync(file, 'utf8');
  let next = replaceReaderFacingText(raw, locale);
  let fm = parseFrontmatter(next);

  if (fm?.hasOtherPlatforms === true && (!Array.isArray(fm.otherPlatformLabels) || fm.otherPlatformLabels.length === 0)) {
    next = replaceTopLevelField(next, 'hasOtherPlatforms', false);
    fm = parseFrontmatter(next);
  }

  if (typeof fm?.takeaway === 'string' && GENERIC_TAKEAWAY_PATTERNS.some((pattern) => pattern.test(fm.takeaway))) {
    next = replaceTopLevelField(next, 'takeaway', buildTakeaway(locale, fm));
  }

  if (next !== raw) {
    fs.writeFileSync(file, next, 'utf8');
    return true;
  }
  return false;
}

let changed = 0;
for (const file of walk(POSTS_ROOT)) {
  if (fixFile(file)) changed += 1;
}

console.log(`Fixed reader-facing copy issues in ${changed} file(s).`);
