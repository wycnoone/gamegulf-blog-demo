#!/usr/bin/env node
/**
 * List .md files for a human-read sub-batch (slug first-char buckets per ARTICLE_REVIEW_PROGRESS.md).
 *
 * Buckets: AF (0-9, a-f), GM (g-m), NS (n-s), TZ (t-z) — case-insensitive on first char.
 *
 * Usage:
 *   node scripts/list-human-read-batch.mjs <locale> <AF|GM|NS|TZ> [--json]
 *   node scripts/list-human-read-batch.mjs --validate <locale> <AF|GM|NS|TZ>
 */
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = join(__dirname, "..", "src", "content", "posts");

const BUCKETS = {
  AF: (c) => (c >= "0" && c <= "9") || (c >= "a" && c <= "f"),
  GM: (c) => c >= "g" && c <= "m",
  NS: (c) => c >= "n" && c <= "s",
  TZ: (c) => c >= "t" && c <= "z",
};

function whichBucketName(firstLower) {
  for (const [name, test] of Object.entries(BUCKETS)) {
    if (test(firstLower)) return name;
  }
  return null;
}

function help() {
  console.log(`list-human-read-batch.mjs

Usage:
  node scripts/list-human-read-batch.mjs <locale> <AF|GM|NS|TZ> [--json]
  node scripts/list-human-read-batch.mjs --validate <locale> <AF|GM|NS|TZ> [--json]

Locales: en, de, es, fr, ja, pt, zh-hans
`);
  process.exit(0);
}

const args = process.argv.slice(2);
if (args.length < 2 || args.includes("-h") || args.includes("--help")) help();

let doValidate = false;
const filtered = args.filter((a) => {
  if (a === "--validate") {
    doValidate = true;
    return false;
  }
  return true;
});
const asJson = filtered.includes("--json");
const noFlags = filtered.filter((a) => a !== "--json");
if (noFlags.length < 2) help();

const locale = noFlags[0];
const bucket = noFlags[1].toUpperCase();

if (!BUCKETS[bucket]) {
  console.error("Invalid bucket. Use AF, GM, NS, or TZ.");
  process.exit(1);
}

const dir = join(ROOT, locale);
let files;
try {
  files = await readdir(dir);
} catch (e) {
  console.error("Cannot read", dir, e.message);
  process.exit(1);
}

const md = files.filter((f) => f.endsWith(".md"));
const inBucket = [];
for (const f of md) {
  const slug = f.replace(/\.md$/, "");
  const c = slug[0]?.toLowerCase() ?? "";
  if (whichBucketName(c) === bucket) inBucket.push(f);
}
inBucket.sort();
const relPaths = inBucket.map((f) => join("src", "content", "posts", locale, f).replace(/\\/g, "/"));
const projectRoot = join(__dirname, "..");
const absPaths = relPaths.map((p) => join(projectRoot, p));

if (asJson) {
  console.log(JSON.stringify({ locale, bucket, count: relPaths.length, files: relPaths }, null, 2));
} else {
  for (const p of relPaths) console.log(p);
  console.error(`# ${relPaths.length} file(s) in ${locale} bucket ${bucket}`);
}

if (!doValidate) process.exit(0);

if (absPaths.length === 0) {
  console.error("No files; nothing to validate.");
  process.exit(0);
}

const script = join(__dirname, "validate-article.mjs");
const r = spawnSync(process.execPath, [script, ...absPaths], { stdio: "inherit" });
process.exit(r.status ?? 1);
