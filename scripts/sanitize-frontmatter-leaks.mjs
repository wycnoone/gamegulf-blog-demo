import fs from 'node:fs';
import path from 'node:path';

const locales = ['de', 'es', 'fr', 'pt', 'zh-hans'];

const localeText = {
  de: {
    runtime: 'Die Spielzeit richtet sich nach dem Store-Umfang; bei Versionsfragen bitte aktuelle Patch-Notes pruefen.',
    grid: 'Nutze die GameGulf-Detailseite zum Regionsvergleich, statt Umrechnungen zu raten.',
  },
  es: {
    runtime: 'La duracion debe tomarse segun la ficha de tienda; si buscas paridad exacta, revisa los ultimos parches.',
    grid: 'Usa la cuadricula de precios de GameGulf para comparar regiones sin estimar conversiones a mano.',
  },
  fr: {
    runtime: 'La duree depend surtout de la fiche boutique ; en cas de doute, verifie les derniers patch notes.',
    grid: 'Utilise la grille de prix GameGulf pour comparer les regions sans supposer les conversions.',
  },
  pt: {
    runtime: 'A duracao deve seguir o escopo da loja; para paridade exata, confira os patch notes mais recentes.',
    grid: 'Use a grade de precos da GameGulf para comparar regioes sem adivinhar conversoes.',
  },
  'zh-hans': {
    runtime: '时长建议以商店标注为准；若你在意版本一致性，请同步核对补丁记录。',
    grid: '建议直接用 GameGulf 详情页的多区价格表对照，不要靠手动汇率估算。',
  },
};

function walk(dir) {
  const out = [];
  for (const n of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, n.name);
    if (n.isDirectory()) out.push(...walk(full));
    else if (n.name.endsWith('.md')) out.push(full);
  }
  return out;
}

let changed = 0;
for (const locale of locales) {
  const base = path.resolve('src/content/posts', locale);
  if (!fs.existsSync(base)) continue;
  const t = localeText[locale];
  for (const file of walk(base)) {
    let s = fs.readFileSync(file, 'utf8');
    const b = s;
    s = s.replace(/playStyle:\s*Core loop matches standard controller play\./g, 'playStyle: Action, Adventure');
    s = s.replace(/—\s*treat runtime as[\s\S]*?exact parity\./g, t.runtime);
    s = s.replace(/treat runtime as[\s\S]*?exact parity\./g, t.runtime);
    s = s.replace(/—\s*use the GameGulf detail grid at[\s\S]*?without guessing conversions\./g, t.grid);
    s = s.replace(/use the GameGulf detail grid at[\s\S]*?without guessing conversions\./g, t.grid);
    if (s !== b) {
      try {
        fs.writeFileSync(file, s, 'utf8');
        changed++;
      } catch {
        // skip locked
      }
    }
  }
}

console.log(`Sanitized frontmatter/body leaks in ${changed} files.`);
