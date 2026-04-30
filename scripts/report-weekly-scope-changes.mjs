import fs from 'node:fs';
import { execSync } from 'node:child_process';

const scope = JSON.parse(fs.readFileSync('scripts/.cache/weekly-locale-scope.json', 'utf8'));
const diff = execSync('git diff --name-only', { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .map((s) => s.replace(/\\/g, '/'));
const changedSet = new Set(diff);

let total = 0;
for (const locale of ['en', 'ja', 'de', 'es', 'fr', 'pt']) {
  const files = scope.locales[locale].files;
  const changed = files.filter((f) => changedSet.has(f));
  total += changed.length;
  console.log(`${locale}: ${changed.length}/${files.length}`);
}
console.log(`total_changed_in_scope: ${total}`);
