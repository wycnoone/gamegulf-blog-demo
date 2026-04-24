import { readFileSync } from 'node:fs';

const t = readFileSync('content/popular-batch-run.log', 'utf8');
const needle = '\n  {\n    "url":';
let last = -1;
for (;;) {
  const j = t.indexOf(needle, last + 1);
  if (j === -1) break;
  last = j;
}
if (last < 0) {
  console.error('No result objects found');
  process.exit(1);
}
let open = t.lastIndexOf('[', last);
if (open < 0) {
  console.error('No array open');
  process.exit(1);
}
let depth = 0;
let close = -1;
for (let i = open; i < t.length; i++) {
  const c = t[i];
  if (c === '[') depth += 1;
  else if (c === ']') {
    depth -= 1;
    if (depth === 0) {
      close = i;
      break;
    }
  }
}
if (close < 0) {
  console.error('Unclosed array');
  process.exit(1);
}
const best = t.slice(open, close + 1);
const arr = JSON.parse(best);
const by = {};
for (const r of arr) by[r.status] = (by[r.status] || 0) + 1;
const failed = arr.filter((r) => r.status !== 'ok' && r.status !== 'skipped_exists');
console.log(JSON.stringify({ total: arr.length, counts: by, failed }, null, 2));
