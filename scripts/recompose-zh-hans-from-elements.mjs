import fs from 'node:fs';
import path from 'node:path';

const POSTS_DIR = path.resolve('src/content/posts/zh-hans');

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

function shortGenres(playStyle) {
  const s = cleanText(playStyle, '该类型');
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 3)
    .join('、') || '该类型';
}

function readField(frontmatter, key) {
  const re = new RegExp(`^${key}:\\s*(.+)$`, 'm');
  const m = frontmatter.match(re);
  if (!m) return '';
  return m[1].trim().replace(/^['"]|['"]$/g, '');
}

function normalizeField(value) {
  const text = cleanText(value);
  if (!text) return '';
  if (text === 'Session-friendly.') return '偏短局可玩，碎片时间也能推进。';
  if (text.includes('且接受掌…')) return '';
  return text
    .replace(/Nintendo Switch/g, 'Switch')
    .replace(/MSRP 行/g, 'MSRP 档位')
    .replace(/区服不同步/g, '区服价格不同步');
}

function extractUrl(raw) {
  const v = cleanText(raw);
  const md = v.match(/\((https?:\/\/[^)]+)\)/);
  if (md) return md[1];
  const plain = v.match(/https?:\/\/\S+/);
  if (plain) return plain[0];
  return '';
}

function parsePriceRows(frontmatter) {
  const lines = frontmatter.split(/\r?\n/);
  const start = lines.findIndex((line) => /^priceRows:\s*$/.test(line.trim()));
  if (start < 0) return [];
  const rows = [];
  let current = null;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (!line.startsWith('  ') && !line.startsWith('- ') && !line.startsWith('    ')) break;
    if (trimmed.startsWith('- ')) {
      if (current) rows.push(current);
      current = {};
      const m = trimmed.match(/- regionCode:\s*(.+)$/);
      if (m) current.regionCode = m[1].trim();
      continue;
    }
    if (!current) continue;
    const kv = trimmed.match(/^([a-zA-Z]+):\s*(.+)$/);
    if (!kv) continue;
    const key = kv[1];
    const val = kv[2].trim().replace(/^['"]|['"]$/g, '');
    current[key] = val;
  }
  if (current) rows.push(current);
  return rows.filter((r) => r.regionCode || r.nativePrice || r.eurPrice);
}

function regionLabel(code) {
  const map = {
    JP: '日本',
    US: '美国',
    BR: '巴西',
    DE: '德国',
    ES: '西班牙',
    FR: '法国',
    IT: '意大利',
    PT: '葡萄牙',
    HK: '中国香港',
    GB: '英国',
    AU: '澳大利亚',
    CA: '加拿大',
    MX: '墨西哥',
    KR: '韩国',
    TW: '中国台湾',
  };
  return map[code] || code || '未知';
}

function makePriceTable(rows = []) {
  const lines = ['| 地区 | 欧元折算 | 原生价格 |', '| --- | ---: | ---: |'];
  for (const row of rows.slice(0, 8)) {
    const code = cleanText(row.regionCode);
    const region = regionLabel(code);
    const eurNum = Number.parseFloat(String(row.eurPrice ?? '').replace(/[^\d.]/g, ''));
    const eur = Number.isFinite(eurNum) ? `€${eurNum.toFixed(2)}` : '-';
    const native = cleanText(row.nativePrice, '-');
    lines.push(`| ${region} | ${eur} | ${native} |`);
  }
  return lines.join('\n');
}

function firstEurPrice(rows = []) {
  for (const row of rows) {
    const num = Number.parseFloat(String(row.eurPrice ?? '').replace(/[^\d.]/g, ''));
    if (Number.isFinite(num)) return `€${num.toFixed(2)}`;
  }
  return '€0.00';
}

function parseLooseFrontmatter(frontmatter) {
  return {
    gameTitle: readField(frontmatter, 'gameTitle'),
    primaryPlatformLabel: readField(frontmatter, 'primaryPlatformLabel'),
    heroStat: readField(frontmatter, 'heroStat'),
    reviewSignal: readField(frontmatter, 'reviewSignal'),
    priceTrackHref: extractUrl(readField(frontmatter, 'priceTrackHref')),
    gameHref: extractUrl(readField(frontmatter, 'gameHref')),
    playStyle: normalizeField(readField(frontmatter, 'playStyle')),
    decision: normalizeField(readField(frontmatter, 'decision')),
    priceSignal: normalizeField(readField(frontmatter, 'priceSignal')),
    salePattern: normalizeField(readField(frontmatter, 'salePattern')),
    timingNote: normalizeField(readField(frontmatter, 'timingNote')),
    bestFor: normalizeField(readField(frontmatter, 'bestFor')),
    avoidIf: normalizeField(readField(frontmatter, 'avoidIf')),
    timeCommitment: normalizeField(readField(frontmatter, 'timeCommitment')),
    playMode: normalizeField(readField(frontmatter, 'playMode')),
    priceRows: parsePriceRows(frontmatter),
  };
}

function buildBody(data) {
  const game = cleanText(data.gameTitle, '这款游戏');
  const platform = cleanText(data.primaryPlatformLabel, 'Switch');
  const score = cleanText(data.heroStat || data.reviewSignal, '口碑中位');
  const priceUrl = cleanText(data.priceTrackHref || data.gameHref, 'https://www.gamegulf.com');
  const genres = shortGenres(data.playStyle);
  const decision = cleanText(data.decision, '建议先看区服价格再决定是否下单。');
  const priceSignal = cleanText(data.priceSignal, '各区差价明显，适合先做区服对照。');
  const salePattern = cleanText(data.salePattern, '过去一年有一定促销波动，可结合历史窗口判断时机。');
  const timingNote = cleanText(data.timingNote, '若你区价格已进可接受区间，可按口味决定；否则建议继续观望。');
  const bestFor = cleanText(data.bestFor, `喜欢${genres}，并接受掌机节奏的玩家。`);
  const avoidIf = cleanText(data.avoidIf, `如果你本身不吃${genres}，即便打折也不一定适合。`);
  const timeCommitment = cleanText(data.timeCommitment, '偏短局可玩，适合碎片化时间。');
  const playMode = cleanText(data.playMode, '以商店页实际标注为准。');
  const rows = Array.isArray(data.priceRows) ? data.priceRows : [];
  const table = rows.length
    ? makePriceTable(data.priceRows)
    : '| 地区 | 欧元折算 | 原生价格 |\n| --- | ---: | ---: |\n| 以 GameGulf 实时页为准 | - | - |';
  const low = firstEurPrice(rows);
  const year = new Date().getFullYear();

  return `## 一句话结论

**${game}** 在 **${platform}** 上是否值得买，核心看两件事：你是否吃这类玩法，以及你区服价格是否进入可接受区间。当前可参考口碑锚点：**${score}**。

结合现有信息看，${decision}

你可以先在 [GameGulf 实时价格页](${priceUrl}) 对照区服后再下单；这比只看单一区服或手动汇率更稳。

折扣历史提示：以 ${year} 年窗口看，historical low / sale / discount 线索仍有效，当前可对照到约 ${low} 的参考区间。

## 《${game}》在 ${platform} 上现在大概多少钱？

价格判断先看区服差：${priceSignal}

${table}

建议下单前再打开 [gamegulf.com](${priceUrl}) 做一次实时复核，避免“表格快照”和你账号显示不同步。

## 《${game}》到底是什么类型的游戏？

这作主要是 **${genres}** 向体验。是否适合你，重点不在宣传文案，而在于玩法循环和你平时偏好的匹配度。

- **玩法重心**：更偏向该类型的常规核心循环，上手门槛整体可控。
- **内容体量**：${timeCommitment}
- **适配人群**：${bestFor}

## 《${game}》在 ${platform} 上跑得怎么样？

按当前可见信息，${game} 在 **${platform}** 属于可正常游玩的版本，购买前仍建议核对你关心的更新与版本说明。

- **表现预期**：以稳定可玩为主，细节表现受模式与版本影响。
- **操作与读屏**：通常为标准键位思路，掌机可读性以实时版本为准。
- **模式信息**：${playMode}

## 适合现在就买，如果

- 你本身就喜欢 **${genres}** 这类节奏，且对 **${score}** 的口碑区间认可
- 你在 [GameGulf](${priceUrl}) 看到的区服价格已经进入你的目标带
- 你希望近期就开玩，不想继续等待下一轮促销窗口
- 时机提醒：${timingNote}
- 你能接受这作的体量与节奏：${timeCommitment}

## 更适合等等，如果

- 你当前区服仍接近原价，而其他区服已经出现明显价差
- 你对 **${genres}** 并不稳定偏好，更多是“打折才考虑”
- 你本月预算要留给更长线或优先级更高的游戏
- ${avoidIf}

## 《${game}》在 ${platform} — 收尾建议

把这篇当作“先看口味、再看区服价格”的决策卡更合适。${salePattern}

最后一步：打开 **[GameGulf 价格页](${priceUrl})** 看你账号的实时价格；到位就买，不到位就挂愿望单等下一窗。`;
}

const files = walk(POSTS_DIR);
let changed = 0;

for (const file of files) {
  const raw = fs.readFileSync(file, 'utf8');
  const meta = extractFrontmatter(raw);
  if (!meta) continue;

  const data = parseLooseFrontmatter(meta.frontmatter);
  const newBody = buildBody(data).trim() + '\n';
  const oldBody = raw.slice(meta.bodyStart).trim() + '\n';
  if (newBody === oldBody) continue;

  const updated = `${raw.slice(0, meta.bodyStart)}${newBody}`;
  fs.writeFileSync(file, updated, 'utf8');
  changed++;
}

console.log(`Recomposed ${changed} zh-hans posts.`);
