/**
 * List posts with publishedAt >= YYYY-MM-DD and print gameHref / priceTrackHref.
 * Usage: node scripts/list-posts-by-published-since.mjs 2026-04-22
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const cutoffStr = process.argv[2] ?? "2026-04-22";
const cutoff = new Date(`${cutoffStr}T00:00:00.000Z`);

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

function pickScalar(fm, key) {
  const re = new RegExp(`^${key}:\\s*(.+)$`, "m");
  const m = fm.match(re);
  if (!m) return null;
  let v = m[1].trim();
  if (v.startsWith(">-") || v.startsWith("|")) return null;
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
}

function pickDate(fm) {
  const s = pickScalar(fm, "publishedAt");
  if (!s) return null;
  const m = String(s).match(/^"?(\d{4}-\d{2}-\d{2})/);
  return m ? new Date(`${m[1]}T00:00:00.000Z`) : null;
}

function firstUrlInLine(line) {
  const m = String(line).match(/https:\/\/[^\s\])"'<>]+/);
  return m ? m[0].replace(/\)+$/, "") : null;
}

function pickUrl(fm, key) {
  const re = new RegExp(`^${key}:\\s*(.*)$`, "m");
  const m = fm.match(re);
  if (!m) return null;
  let rest = m[1];
  if (rest.trim().startsWith(">-")) {
    const block = fm.slice(m.index);
    const lines = block.split(/\r?\n/);
    const acc = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^[a-zA-Z_][a-zA-Z0-9_]*:/.test(line.trim())) break;
      acc.push(line.replace(/^\s+/, ""));
    }
    rest = acc.join(" ");
  }
  return firstUrlInLine(rest);
}

const files = await walk(ROOT);
const rows = [];
for (const fp of files) {
  const raw = await readFile(fp, "utf8");
  const fm = fmBlock(raw);
  const d = pickDate(fm);
  if (!d || d < cutoff) continue;
  rows.push({
    file: fp.replace(/\\/g, "/"),
    publishedAt: pickScalar(fm, "publishedAt"),
    gameTitle: pickScalar(fm, "gameTitle"),
    gameHref: pickUrl(fm, "gameHref"),
    priceTrackHref: pickUrl(fm, "priceTrackHref"),
  });
}
rows.sort((a, b) => a.file.localeCompare(b.file));

const out = { cutoff: cutoffStr, count: rows.length, rows };
const jsonPath = process.argv[3];
if (jsonPath) {
  const { writeFile } = await import("node:fs/promises");
  await writeFile(jsonPath, JSON.stringify(out, null, 2), "utf8");
  const uniq = [...new Set(rows.map((r) => r.gameHref).filter(Boolean))].sort();
  const txtPath = jsonPath.replace(/\.json$/i, "-unique-gamehrefs.txt");
  await writeFile(txtPath, uniq.join("\n") + "\n", "utf8");
  console.error("wrote", jsonPath, "and", txtPath, "unique", uniq.length);
} else {
  console.log(JSON.stringify(out, null, 2));
}
