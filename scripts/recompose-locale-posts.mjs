import fs from 'node:fs';
import path from 'node:path';

const LOCALES = ['de', 'es', 'fr', 'pt', 'en'];
const ROOT = path.resolve('src/content/posts');

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.md')) out.push(full);
  }
  return out;
}

function extractFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return null;
  return { frontmatter: m[1], bodyStart: m[0].length };
}

function cleanText(v, fallback = '') {
  if (!v) return fallback;
  return String(v).replace(/\s+/g, ' ').trim();
}

function readField(frontmatter, key) {
  const re = new RegExp(`^${key}:\\s*(.+)$`, 'm');
  const m = frontmatter.match(re);
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : '';
}

function extractUrl(raw) {
  const text = cleanText(raw);
  const md = text.match(/\((https?:\/\/[^)]+)\)/);
  if (md) return md[1];
  const plain = text.match(/https?:\/\/\S+/);
  return plain ? plain[0] : '';
}

function parsePriceRows(frontmatter) {
  const lines = frontmatter.split(/\r?\n/);
  const start = lines.findIndex((l) => /^priceRows:\s*$/.test(l.trim()));
  if (start < 0) return [];
  const rows = [];
  let current = null;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!t) continue;
    if (!line.startsWith('  ') && !line.startsWith('- ') && !line.startsWith('    ')) break;
    if (t.startsWith('- ')) {
      if (current) rows.push(current);
      current = {};
      const m = t.match(/- regionCode:\s*(.+)$/);
      if (m) current.regionCode = m[1].trim();
      continue;
    }
    if (!current) continue;
    const kv = t.match(/^([a-zA-Z]+):\s*(.+)$/);
    if (!kv) continue;
    current[kv[1]] = kv[2].trim().replace(/^['"]|['"]$/g, '');
  }
  if (current) rows.push(current);
  return rows.filter((r) => r.regionCode || r.nativePrice || r.eurPrice);
}

function parseLoose(frontmatter) {
  return {
    gameTitle: readField(frontmatter, 'gameTitle'),
    platformLabel: readField(frontmatter, 'primaryPlatformLabel') || readField(frontmatter, 'platform'),
    heroStat: readField(frontmatter, 'heroStat') || readField(frontmatter, 'reviewSignal'),
    playStyle: readField(frontmatter, 'playStyle'),
    decision: readField(frontmatter, 'decision'),
    priceSignal: readField(frontmatter, 'priceSignal'),
    salePattern: readField(frontmatter, 'salePattern'),
    timeCommitment: readField(frontmatter, 'timeCommitment'),
    avoidIf: readField(frontmatter, 'avoidIf'),
    playMode: readField(frontmatter, 'playMode'),
    priceUrl: extractUrl(readField(frontmatter, 'priceTrackHref') || readField(frontmatter, 'gameHref')),
    priceRows: parsePriceRows(frontmatter),
  };
}

function table(rows, h1, h2, h3, regionMap) {
  const out = [`| ${h1} | ${h2} | ${h3} |`, '| --- | ---: | ---: |'];
  for (const row of rows.slice(0, 8)) {
    const code = cleanText(row.regionCode);
    const region = regionMap[code] || code || '-';
    const eurNum = Number.parseFloat(String(row.eurPrice ?? '').replace(/[^\d.]/g, ''));
    const eur = Number.isFinite(eurNum) ? `€${eurNum.toFixed(2)}` : '-';
    out.push(`| ${region} | ${eur} | ${cleanText(row.nativePrice, '-')} |`);
  }
  if (rows.length === 0) out.push('| - | - | - |');
  return out.join('\n');
}

function firstEur(rows = []) {
  for (const row of rows) {
    const eurNum = Number.parseFloat(String(row.eurPrice ?? '').replace(/[^\d.]/g, ''));
    if (Number.isFinite(eurNum)) return `€${eurNum.toFixed(2)}`;
  }
  return '€0.00';
}

function build(locale, d) {
  const game = cleanText(d.gameTitle, 'This game');
  const platform = cleanText(d.platformLabel, 'Nintendo Switch');
  const score = cleanText(d.heroStat, 'review band');
  const genre = cleanText(d.playStyle, 'genre mix');
  const decision = cleanText(d.decision, 'Use your regional price plus fit to decide buy vs wait.');
  const priceSignal = cleanText(d.priceSignal, 'Regional spread is meaningful; check your account region first.');
  const salePattern = cleanText(d.salePattern, 'Watch for recurring discount windows and compare with live pricing.');
  const timeCommitment = cleanText(d.timeCommitment, 'Session-friendly pacing.');
  const avoidIf = cleanText(d.avoidIf, 'Skip if the genre fit is weak for you.');
  const playMode = cleanText(d.playMode, 'Verify mode details on the store page.');
  const url = cleanText(d.priceUrl, 'https://www.gamegulf.com');

  const maps = {
    de: { JP: 'Japan', US: 'USA', BR: 'Brasilien', DE: 'Deutschland', ES: 'Spanien', FR: 'Frankreich', IT: 'Italien', PT: 'Portugal', HK: 'Hongkong', GB: 'Vereinigtes Koenigreich' },
    es: { JP: 'Japon', US: 'Estados Unidos', BR: 'Brasil', DE: 'Alemania', ES: 'Espana', FR: 'Francia', IT: 'Italia', PT: 'Portugal', HK: 'Hong Kong', GB: 'Reino Unido' },
    fr: { JP: 'Japon', US: 'Etats-Unis', BR: 'Bresil', DE: 'Allemagne', ES: 'Espagne', FR: 'France', IT: 'Italie', PT: 'Portugal', HK: 'Hong Kong', GB: 'Royaume-Uni' },
    pt: { JP: 'Japao', US: 'Estados Unidos', BR: 'Brasil', DE: 'Alemanha', ES: 'Espanha', FR: 'Franca', IT: 'Italia', PT: 'Portugal', HK: 'Hong Kong', GB: 'Reino Unido' },
    en: { JP: 'Japan', US: 'United States', BR: 'Brazil', DE: 'Germany', ES: 'Spain', FR: 'France', IT: 'Italy', PT: 'Portugal', HK: 'Hong Kong', GB: 'United Kingdom' },
  };
  const headers = {
    de: ['Region', 'EUR-Preis', 'Lokaler Preis'],
    es: ['Region', 'Precio EUR', 'Precio local'],
    fr: ['Region', 'Prix EUR', 'Prix local'],
    pt: ['Regiao', 'Preco EUR', 'Preco local'],
    en: ['Region', 'EUR price', 'Native price'],
  }[locale];
  const tbl = table(d.priceRows, headers[0], headers[1], headers[2], maps[locale]);
  const low = firstEur(d.priceRows);
  const year = new Date().getFullYear();

  const body = {
    de: `## Kurzfazit
\n**${game}** auf **${platform}** ist vor allem eine Fit-und-Preis-Entscheidung. Kritiker-Anker: **${score}**.\n\n${decision}\n\nDiscount/Sale-Hinweis: ${year} zeigt weiter ein nutzbares historical low Fenster um ${low}.\n\nVor dem Checkout einmal [GameGulf-Livepreise](${url}) gegen deine Region halten.\n\n## Was kostet ${game} auf ${platform} aktuell?\n\n${priceSignal}\n\n${tbl}\n\n## Was ist ${game} fuer ein Spiel?\n\nGenre-Kern: **${genre}**. Entscheidend ist weniger Marketingtext, sondern ob diese Struktur zu deinem Geschmack passt.\n\n## Wie laeuft ${game} auf ${platform}?\n\nIn der Regel stabil spielbar; final immer mit aktuellem Build und Store-Hinweisen abgleichen.\n\n- Laufverhalten: solide Basis, je nach Version leichte Unterschiede.\n- Steuerung/Lesbarkeit: standardnah, Handheld-Lesbarkeit projektabhaengig.\n- Modus-Hinweis: ${playMode}\n\n## Jetzt kaufen, wenn\n\n- du mit **${genre}** grundsaetzlich gut klarkommst\n- dein Regionspreis auf GameGulf im Zielkorridor liegt\n- du zeitnah starten willst statt auf den naechsten Sale zu warten\n- dir der Umfang passt: ${timeCommitment}\n\n## Warten, wenn\n\n- dein Store noch nahe MSRP liegt, andere Regionen aber deutlich guenstiger sind\n- dein Genre-Fit unsicher ist\n- Budget derzeit fuer andere Titel reserviert ist\n- ${avoidIf}\n\n## Abschluss\n\nPreis zuerst, dann Geschmack: Das ist hier die robusteste Reihenfolge. ${salePattern}\n\nChecke zum Schluss **[GameGulf](${url})** und entscheide dann Buy-now vs Wait.`,
    es: `## Veredicto rapido\n\n**${game}** en **${platform}** se decide por encaje + precio. Referencia de calidad: **${score}**.\n\n${decision}\n\nNota de discount/sale: en ${year} sigue vigente un historical low util alrededor de ${low}.\n\nAntes de comprar, compara tu region en [GameGulf](${url}).\n\n## Cuanto cuesta ${game} en ${platform} ahora?\n\n${priceSignal}\n\n${tbl}\n\n## Que tipo de juego es ${game}?\n\nNucleo de genero: **${genre}**. Lo importante es si ese bucle te encaja, no el texto de marketing.\n\n## Como rinde ${game} en ${platform}?\n\nSuele ser jugable con estabilidad razonable; confirma siempre con la version actual.\n\n- Rendimiento: base estable con variaciones segun build.\n- Control/lectura: esquema estandar, legibilidad portatil segun contenido.\n- Modo de juego: ${playMode}\n\n## Comprar ahora si\n\n- te gusta **${genre}**\n- tu precio regional en GameGulf ya esta en rango objetivo\n- prefieres jugar ya en vez de esperar otra ventana de oferta\n- te cuadra el ritmo: ${timeCommitment}\n\n## Esperar si\n\n- tu tienda sigue cerca de MSRP y otras regiones ya bajaron fuerte\n- no tienes claro el encaje de genero\n- este mes priorizas otros juegos\n- ${avoidIf}\n\n## Cierre\n\nPrimero precio, luego gusto: aqui funciona mejor ese orden. ${salePattern}\n\nHaz el ultimo chequeo en **[GameGulf](${url})** y decide comprar o esperar.`,
    fr: `## Verdict rapide\n\n**${game}** sur **${platform}** est surtout une decision d'adaptation + prix. Ancre qualitative: **${score}**.\n\n${decision}\n\nSignal discount/sale: en ${year}, la zone historical low reste exploitable autour de ${low}.\n\nAvant achat, verifie ta region sur [GameGulf](${url}).\n\n## Combien coute ${game} sur ${platform} maintenant?\n\n${priceSignal}\n\n${tbl}\n\n## Quel type de jeu est ${game}?\n\nNoyau de genre: **${genre}**. Le point cle reste l'adaptation a tes preferences, pas le texte marketing.\n\n## Comment tourne ${game} sur ${platform}?\n\nGlobalement jouable de facon stable; valide toujours avec la version la plus recente.\n\n- Performance: base stable, ecarts possibles selon build.\n- Controle/lisibilite: schema standard, lisibilite portable selon contenu.\n- Mode: ${playMode}\n\n## Acheter maintenant si\n\n- tu apprecies **${genre}**\n- ton prix regional sur GameGulf est deja dans ta zone cible\n- tu veux jouer tout de suite plutot qu'attendre une nouvelle promo\n- le format te convient: ${timeCommitment}\n\n## Attendre si\n\n- ta boutique reste proche du MSRP alors que d'autres regions ont baisse\n- ton fit de genre est incertain\n- ton budget du mois est reserve a d'autres titres\n- ${avoidIf}\n\n## Conclusion\n\nPrix d'abord, puis affinite: c'est l'ordre le plus fiable ici. ${salePattern}\n\nFais un dernier passage sur **[GameGulf](${url})** puis tranche achat vs attente.`,
    pt: `## Veredito rapido\n\n**${game}** no **${platform}** e sobretudo uma decisao de encaixe + preco. Referencia de qualidade: **${score}**.\n\n${decision}\n\nSinal de discount/sale: em ${year} ainda ha faixa historical low util perto de ${low}.\n\nAntes de fechar, compara tua regiao em [GameGulf](${url}).\n\n## Quanto custa ${game} no ${platform} agora?\n\n${priceSignal}\n\n${tbl}\n\n## Que tipo de jogo e ${game}?\n\nNucleo de genero: **${genre}**. O ponto principal e se esse loop combina contigo.\n\n## Como ${game} roda no ${platform}?\n\nNo geral, jogavel com estabilidade aceitavel; confirma sempre na versao atual.\n\n- Desempenho: base estavel, com variacoes por build.\n- Controles/leitura: esquema padrao, legibilidade portatil depende do conteudo.\n- Modo: ${playMode}\n\n## Comprar agora se\n\n- voce curte **${genre}**\n- teu preco regional no GameGulf ja entrou na faixa-alvo\n- voce quer jogar ja, sem esperar outra janela de desconto\n- o ritmo te atende: ${timeCommitment}\n\n## Esperar se\n\n- tua loja ainda esta perto de MSRP e outras regioes ja cairam\n- teu encaixe com o genero esta incerto\n- teu orcamento do mes esta reservado para outros jogos\n- ${avoidIf}\n\n## Fechamento\n\nPrimeiro preco, depois gosto: aqui essa ordem e a mais segura. ${salePattern}\n\nFaz a ultima checagem em **[GameGulf](${url})** e decide compra vs espera.`,
    en: `## Quick verdict\n\n**${game}** on **${platform}** is primarily a fit-and-price decision. Quality anchor: **${score}**.\n\n${decision}\n\nDiscount history signal: in ${year}, the sale posture still points to a historical low band around ${low}.\n\nBefore checkout, compare your actual account region on [GameGulf](${url}).\n\n## How much does ${game} cost on ${platform} right now?\n\n${priceSignal}\n\n${tbl}\n\n## What kind of game is ${game}?\n\nCore genre mix: **${genre}**. The key question is whether this loop fits your taste, not whether store copy sounds good.\n\n## How does ${game} run on ${platform}?\n\nGenerally stable enough to play; always verify with the current patch/build context.\n\n- Performance: stable baseline, with build-to-build variance.\n- Controls/readability: mostly standard mappings; handheld readability depends on content density.\n- Mode info: ${playMode}\n\n## Buy now if\n\n- you already like **${genre}**\n- your regional price on GameGulf is in your target band\n- you want to start now instead of waiting for another sale window\n- the time profile fits: ${timeCommitment}\n\n## Wait if\n\n- your storefront is still near MSRP while other regions are lower\n- your genre fit is uncertain\n- your monthly budget is reserved for other games\n- ${avoidIf}\n\n## Closing take\n\nPrice first, taste second is the most reliable order here. ${salePattern}\n\nDo one final check on **[GameGulf](${url})** and decide buy-now vs wait.`,
  }[locale];

  return body.trim() + '\n';
}

let changed = 0;
for (const locale of LOCALES) {
  const dir = path.join(ROOT, locale);
  if (!fs.existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const raw = fs.readFileSync(file, 'utf8');
    const meta = extractFrontmatter(raw);
    if (!meta) continue;
    const data = parseLoose(meta.frontmatter);
    const newBody = build(locale, data);
    const oldBody = raw.slice(meta.bodyStart).trim() + '\n';
    if (newBody === oldBody) continue;
    try {
      fs.writeFileSync(file, `${raw.slice(0, meta.bodyStart)}${newBody}`, 'utf8');
      changed++;
    } catch (error) {
      console.warn(`Skip locked/unwritable file: ${file}`);
    }
  }
}

console.log(`Recomposed ${changed} posts across locales.`);
