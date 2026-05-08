#!/usr/bin/env node
/**
 * Report post locale coverage by slug.
 *
 * Usage:
 *   node scripts/report-locale-coverage.mjs
 *   node scripts/report-locale-coverage.mjs --json
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const POSTS_ROOT = join(process.cwd(), 'src', 'content', 'posts');

function usage() {
  console.error('Usage: node scripts/report-locale-coverage.mjs [--json]');
  process.exit(2);
}

function listLocales() {
  if (!existsSync(POSTS_ROOT)) return [];
  return readdirSync(POSTS_ROOT)
    .filter((name) => statSync(join(POSTS_ROOT, name)).isDirectory())
    .sort();
}

function collectCoverage(locales) {
  const bySlug = new Map();

  for (const locale of locales) {
    const localeDir = join(POSTS_ROOT, locale);
    for (const name of readdirSync(localeDir)) {
      if (!name.endsWith('.md')) continue;
      const slug = name.replace(/\.md$/u, '');
      if (!bySlug.has(slug)) bySlug.set(slug, new Set());
      bySlug.get(slug).add(locale);
    }
  }

  const rows = [...bySlug.entries()]
    .map(([slug, present]) => ({
      slug,
      count: present.size,
      locales: [...present].sort(),
      missing: locales.filter((locale) => !present.has(locale)),
    }))
    .sort((a, b) => a.count - b.count || a.slug.localeCompare(b.slug));

  return {
    locales,
    totalSlugs: rows.length,
    complete: rows.filter((row) => row.count === locales.length).length,
    partial: rows.filter((row) => row.count !== locales.length),
  };
}

function printMarkdown(report) {
  console.log(`# Locale Coverage\n`);
  console.log(`Locales: ${report.locales.join(', ')}`);
  console.log(`Total slugs: ${report.totalSlugs}`);
  console.log(`Complete 7-locale slugs: ${report.complete}`);
  console.log(`Partial slugs: ${report.partial.length}\n`);

  if (report.partial.length === 0) {
    console.log('All slugs have full locale coverage.');
    return;
  }

  console.log('| Slug | Present | Missing |');
  console.log('| --- | ---: | --- |');
  for (const row of report.partial) {
    console.log(`| ${row.slug} | ${row.count}/${report.locales.length} | ${row.missing.join(', ')} |`);
  }
}

const args = process.argv.slice(2);
if (args.some((arg) => arg !== '--json' && arg !== '-h' && arg !== '--help')) usage();
if (args.includes('-h') || args.includes('--help')) usage();

const report = collectCoverage(listLocales());
if (args.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  printMarkdown(report);
}
