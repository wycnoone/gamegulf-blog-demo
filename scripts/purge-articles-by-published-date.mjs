/**
 * Remove all posts with a given publishedAt, matching briefs, and clear Astro + dist caches.
 * Usage: node scripts/purge-articles-by-published-date.mjs [YYYY-MM-DD]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const postsRoot = path.join(root, "src", "content", "posts");
const briefsDir = path.join(root, "content", "briefs");

const TARGET = process.argv[2] ?? "2026-04-22";

function briefIdFromSlug(slug) {
  return slug.replace(/-(worth-it|buy-now-or-wait)$/, "");
}

function rm(p) {
  if (!fs.existsSync(p)) return false;
  fs.rmSync(p, { recursive: true, force: true });
  return true;
}

const localeDirs = fs
  .readdirSync(postsRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => path.join(postsRoot, d.name));

const deletedPosts = [];
const slugs = new Set();

for (const dir of localeDirs) {
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md"))) {
    const full = path.join(dir, f);
    const raw = fs.readFileSync(full, "utf8");
    if (!raw.includes(`publishedAt: "${TARGET}"`) && !raw.includes(`publishedAt: '${TARGET}'`)) {
      continue;
    }
    const slug = f.replace(/\.md$/, "");
    slugs.add(slug);
    fs.unlinkSync(full);
    deletedPosts.push(full);
  }
}

const briefIds = [...slugs].map(briefIdFromSlug);
const deletedBriefs = [];

for (const id of briefIds) {
  const bp = path.join(briefsDir, `${id}.json`);
  if (fs.existsSync(bp)) {
    fs.unlinkSync(bp);
    deletedBriefs.push(bp);
  }
}

const gameLinksPath = path.join(root, "content", `game-links-${TARGET}.json`);
let removedGameLinks = false;
if (fs.existsSync(gameLinksPath)) {
  fs.unlinkSync(gameLinksPath);
  removedGameLinks = true;
}

const hltbPath = path.join(root, "content", "hltb-mapping.json");
let removedFromHltb = 0;
if (fs.existsSync(hltbPath) && briefIds.length > 0) {
  const h = JSON.parse(fs.readFileSync(hltbPath, "utf8"));
  for (const id of briefIds) {
    if (Object.prototype.hasOwnProperty.call(h, id)) {
      delete h[id];
      removedFromHltb += 1;
    }
  }
  if (removedFromHltb > 0) {
    fs.writeFileSync(hltbPath, JSON.stringify(h, null, 2) + "\n", "utf8");
  }
}

const astroDir = path.join(root, ".astro");
if (fs.existsSync(astroDir)) {
  rm(astroDir);
}

const distDir = path.join(root, "dist");
if (fs.existsSync(distDir)) {
  rm(distDir);
}

console.log(
  JSON.stringify(
    {
      target: TARGET,
      deletedPostCount: deletedPosts.length,
      uniqueSlugs: slugs.size,
      deletedBriefCount: deletedBriefs.length,
      removedFromHltbMapping: removedFromHltb,
      removedGameLinksJson: removedGameLinks,
    },
    null,
    2
  )
);
console.log("Removed .astro and dist (if present).");
