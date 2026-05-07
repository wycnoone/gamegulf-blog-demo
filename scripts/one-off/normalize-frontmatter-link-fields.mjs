import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src/content/posts');

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

let changed = 0;
for (const file of walk(ROOT)) {
  const raw = fs.readFileSync(file, 'utf8');
  const next = raw.replace(
    /^(wishlistHref|priceTrackHref|gameHref|membershipHref):\s*\[(https?:\/\/[^\]]+)\]\([^)]+\)\s*$/gm,
    '$1: $2',
  );
  if (next !== raw) {
    fs.writeFileSync(file, next, 'utf8');
    changed++;
  }
}

console.log(`Normalized link fields in ${changed} files.`);
