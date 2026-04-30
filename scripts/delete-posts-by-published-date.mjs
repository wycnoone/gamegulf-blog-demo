/**
 * Delete markdown posts whose frontmatter publishedAt matches a given YYYY-MM-DD.
 * Usage: node scripts/delete-posts-by-published-date.mjs 2026-04-22
 * Default dry-run: pass --execute to actually delete.
 */
import { readdir, readFile, unlink } from "node:fs/promises";
import { join } from "node:path";

const args = process.argv.slice(2).filter((a) => a !== "--execute");
const execute = process.argv.includes("--execute");
const TARGET = args[0] ?? "2026-04-22";
const ROOT = "src/content/posts";

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function fmBlock(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : "";
}

function publishedAt(fm) {
  const m = fm.match(/^publishedAt:\s*(.+)$/m);
  if (!m) return null;
  let v = m[1].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
}

const files = await walk(ROOT);
const toDelete = [];
for (const fp of files) {
  const raw = await readFile(fp, "utf8");
  const pa = publishedAt(fmBlock(raw));
  if (pa === TARGET) toDelete.push(fp);
}

console.log(JSON.stringify({ target: TARGET, count: toDelete.length, execute }, null, 2));
for (const fp of toDelete) {
  const rel = fp.replace(/\\/g, "/");
  if (execute) {
    await unlink(fp);
    console.error("deleted", rel);
  } else {
    console.error("dry-run", rel);
  }
}
if (!execute) {
  console.error("\nPass --execute to delete these files.");
  process.exit(0);
}
