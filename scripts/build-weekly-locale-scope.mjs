import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src/content/posts');
const OUT = path.resolve('scripts/.cache/weekly-locale-scope.json');
const LOCALES = ['en', 'ja', 'de', 'es', 'fr', 'pt'];
const START = '2026-04-19';
const END = '2026-04-26';

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

function readPublishedAt(content) {
  const m = content.match(/^publishedAt:\s*"?(\d{4}-\d{2}-\d{2})"?\s*$/m);
  return m ? m[1] : null;
}

const scope = {
  start: START,
  end: END,
  generatedAt: new Date().toISOString(),
  locales: {},
};

for (const locale of LOCALES) {
  const dir = path.join(ROOT, locale);
  const files = fs.existsSync(dir) ? walk(dir) : [];
  const hit = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const publishedAt = readPublishedAt(content);
    if (!publishedAt) continue;
    if (publishedAt >= START && publishedAt <= END) {
      hit.push(path.relative(path.resolve('.'), file).replace(/\\/g, '/'));
    }
  }
  hit.sort();
  scope.locales[locale] = {
    count: hit.length,
    files: hit,
  };
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(scope, null, 2)}\n`, 'utf8');
console.log(`Scope saved: ${OUT}`);
for (const locale of LOCALES) {
  console.log(`${locale}: ${scope.locales[locale].count}`);
}
