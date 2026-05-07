import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(__dirname, 'write-cozy-es-de-pt.mjs'), 'utf8');
const i = src.indexOf('  de: {');
const j = src.indexOf('\nfor (const [loc');
if (i === -1 || j === -1) throw new Error('anchors not found');

const head = `import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const locales = {
`;
const mid = src.slice(i, j);
const chunk = `${head}${mid}${src.slice(j)}`;
writeFileSync(join(__dirname, 'write-cozy-de-pt-only.mjs'), chunk, 'utf8');
console.error('write-cozy-de-pt-only.mjs regenerated');
