/**
 * Writes unique gameHref per slug for posts matching publishedAt.
 * Usage: node scripts/export-game-links-by-published-date.mjs [YYYY-MM-DD] [outPath]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const postsRoot = path.join(root, "src", "content", "posts");

const TARGET = process.argv[2] ?? "2026-04-22";
const outArg = process.argv[3];
const defaultOut = path.join(root, "content", `game-links-${TARGET}.json`);
const OUT =
  outArg === undefined ? defaultOut : path.isAbsolute(outArg) ? outArg : path.join(root, outArg);

const dirs = fs
  .readdirSync(postsRoot, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => path.join(postsRoot, d.name));

const seen = new Map();

for (const dir of dirs) {
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".md"))) {
    const full = path.join(dir, f);
    const raw = fs.readFileSync(full, "utf8");
    if (!raw.includes(`publishedAt: "${TARGET}"`) && !raw.includes(`publishedAt: '${TARGET}'`)) {
      continue;
    }
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) continue;
    const block = fm[1];
    const gh = block.match(/^gameHref:\s*["']?([^\s"']+)/m);
    const slug = f.replace(/\.md$/, "");
    if (!gh) continue;
    const url = gh[1].trim();
    if (!seen.has(slug)) seen.set(slug, { slug, gameHref: url });
  }
}

const games = [...seen.values()].sort((a, b) => a.slug.localeCompare(b.slug));
const out = { date: TARGET, count: games.length, games };

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`Wrote ${out.count} entries to ${OUT}`);
