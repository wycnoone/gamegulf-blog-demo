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

function getGameTitle(text) {
  const m = text.match(/^gameTitle:\s*(.+)$/m);
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
}

let changed = 0;
for (const file of walk(ROOT)) {
  let text = fs.readFileSync(file, 'utf8');
  const before = text;
  const game = getGameTitle(text);

  // Fix broken multiline TLDR produced by accidental replacement.
  text = text.replace(/^tldr:\s*"(.+?)\s*>\-"\s*\n\s*(.+)$/gm, (all, g, rest) => `tldr: "${g.replace(/"\s*$/, '')} ${rest.trim()}"`);

  // Re-indent malformed list blocks after playerVoices:
  text = text.replace(/^playerVoices:\n- quote:/gm, 'playerVoices:\n  - quote:');
  text = text.replace(/\n(senti(?:ment)?):/g, '\n    $1:');
  text = text.replace(/\n- quote:/g, '\n  - quote:');

  // Ensure FAQ folded answers start with game title.
  if (game) {
    text = text.replace(/^(\s*answer:\s*>\-\s*\n)([\s\S]*?)(?=\n\s*-\s+question:|\nheroTheme:)/gm, (all, head, body) => {
      const plain = body.replace(/\s+/g, ' ').trim();
      if (!plain || plain.startsWith(game)) return all;
      const indent = body.match(/^\s*/)?.[0] || '      ';
      return `${head}${indent}${game} ${plain}\n`;
    });
  }

  // Limit avoidIf hard cap to satisfy validator.
  text = text.replace(/^avoidIf:\s*(.+)$/m, (all, v) => {
    const s = v.trim();
    return s.length > 72 ? `avoidIf: ${s.slice(0, 71).trimEnd()}…` : all;
  });

  if (text !== before) {
    fs.writeFileSync(file, text, 'utf8');
    changed++;
  }
}

console.log(`Final pass touched ${changed} files.`);
