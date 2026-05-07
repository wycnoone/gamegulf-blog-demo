#!/usr/bin/env node
/**
 * Normalize YAML folded `timeCommitment: >-` blocks so every continuation line
 * uses the same indent (fixes js-yaml "bad indentation" after partial edits).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../src/content/posts');

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function normalizeTimeCommitment(raw) {
  return raw.replace(
    /(^timeCommitment: >-\n)([\s\S]*?)(?=^\n?[a-zA-Z][a-zA-Z0-9_]*:)/gm,
    (_, head, body) => {
      const lines = body.split('\n');
      const out = [];
      for (const line of lines) {
        const t = line.trim();
        if (t === '') continue;
        out.push(`  ${t}`);
      }
      return `${head}${out.join('\n')}\n`;
    },
  );
}

let n = 0;
for (const file of walk(ROOT)) {
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) continue;
  const raw = m[1];
  const next = normalizeTimeCommitment(raw);
  if (next === raw) continue;
  const rebuilt = `---\n${next}\n---${text.slice(m[0].length)}`;
  fs.writeFileSync(file, rebuilt, 'utf8');
  n++;
}
console.log(`normalize-timecommitment-blocks: touched ${n} files`);
