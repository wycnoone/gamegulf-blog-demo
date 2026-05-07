/**
 * Sample slugs that exist in all 7 post locales; compare `verdict` in frontmatter.
 * For ARTICLE_REVIEW_CROSS_LOCALE_E.md logging. Not a hard gate.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const LOCALES = ["en", "zh-hans", "ja", "de", "es", "fr", "pt"];
const ROOT = "src/content/posts";

const bySlug = new Map();
for (const loc of LOCALES) {
  const names = (await readdir(join(ROOT, loc))).filter((f) => f.endsWith(".md"));
  for (const f of names) {
    const slug = f.replace(/\.md$/, "");
    if (!bySlug.has(slug)) bySlug.set(slug, new Set());
    bySlug.get(slug).add(loc);
  }
}

const all7 = [...bySlug.entries()]
  .filter(([, s]) => LOCALES.every((l) => s.has(l)))
  .map(([slug]) => slug)
  .sort();

function getVerdict(fm) {
  const m = fm.match(/^verdict:\s*(.+)$/m);
  return m ? m[1].trim() : null;
}

async function fmOnly(path) {
  const t = await readFile(path, "utf8");
  const parts = t.split(/^---\s*$/m);
  return parts[1] ?? "";
}

// ~20 evenly spaced
const n = Math.min(20, all7.length);
const step = n > 1 ? Math.floor((all7.length - 1) / (n - 1)) : 0;
const sample = [];
for (let i = 0; i < n; i++) sample.push(all7[Math.min(i * step, all7.length - 1)]);

const rows = [];
let mismatches = 0;
for (const slug of sample) {
  const v = {};
  for (const loc of LOCALES) {
    const p = join(ROOT, loc, `${slug}.md`);
    v[loc] = getVerdict(await fmOnly(p));
  }
  const set = new Set(LOCALES.map((l) => v[l] ?? "null"));
  const ok = set.size === 1;
  if (!ok) mismatches++;
  rows.push({ slug, v, ok });
}

console.log(JSON.stringify({ all7Count: all7.length, sampleCount: sample.length, mismatchCount: mismatches, rows }, null, 2));
