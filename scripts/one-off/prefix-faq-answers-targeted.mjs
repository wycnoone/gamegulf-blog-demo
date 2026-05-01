import fs from 'node:fs';

const files = [
  'src/content/posts/ja/30xx-worth-it.md',
  'src/content/posts/ja/a-short-hike-worth-it.md',
  'src/content/posts/ja/bayonetta-2-worth-it.md',
  'src/content/posts/ja/citadelum-worth-it.md',
  'src/content/posts/ja/pikmin-4.md',
  'src/content/posts/ja/shadow-tactics-blades-of-the-shogun-worth-it.md',
  'src/content/posts/zh-hans/citadelum-worth-it.md',
  'src/content/posts/zh-hans/nba-2k26-worth-it.md',
  'src/content/posts/zh-hans/pikmin-4.md',
];

function gameTitle(text) {
  const m = text.match(/^gameTitle:\s*(.+)$/m);
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
}

let changed = 0;
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let t = fs.readFileSync(file, 'utf8');
  const g = gameTitle(t);
  if (!g) continue;
  const before = t;
  t = t.replace(/^(\s*answer:\s*>-\s*\n)([\s\S]*?)(?=\n\s*-\s+question:|\nheroTheme:)/gm, (all, head, body) => {
    const plain = body.replace(/\s+/g, ' ').trim();
    if (!plain || plain.startsWith(g)) return all;
    const indent = body.match(/^\s*/)?.[0] ?? '      ';
    return `${head}${indent}${g} ${plain}\n`;
  });
  t = t.replace(/^(\s*answer:\s*")(.*?)("\s*)$/gm, (all, p1, c, p3) => {
    const s = c.trim();
    if (!s || s.startsWith(g)) return all;
    return `${p1}${g} ${s}${p3}`;
  });
  t = t.replace(/^(\s*answer:\s*)([^"\n][^\n]*)$/gm, (all, p1, c) => {
    const s = c.trim();
    if (!s || s.startsWith('>-') || s.startsWith(g)) return all;
    return `${p1}${g} ${s}`;
  });
  if (t !== before) {
    fs.writeFileSync(file, t, 'utf8');
    changed++;
  }
}

console.log(`Prefixed FAQ answers in ${changed} files.`);
