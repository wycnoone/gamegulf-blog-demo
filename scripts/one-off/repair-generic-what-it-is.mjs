#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import yaml from 'js-yaml';
import { stripUtf8Bom } from '../article-pricing-utils.mjs';

const POSTS_ROOT = join(process.cwd(), 'src', 'content', 'posts');
const REPAIR_OVERLAP = process.argv.includes('--repair-overlap');
const REPAIR_PLAYTIME = process.argv.includes('--repair-playtime');
const REPAIR_REPEATED = process.argv.includes('--repair-repeated');
const WRITE = process.argv.includes('--write');
const SAMPLE_LIMIT = Number(process.argv.find((arg) => arg.startsWith('--sample='))?.split('=')[1] || 40);

const GENERIC_PATTERNS = [
  /\s[—-]\s.+\bon\s+(Nintendo\s+Switch|NS2)\.?$/iu,
  /\s[—-]\s*(Nintendo\s+Switch|Switch|NS2)\s*版/u,
  /\s[—-]\s*.+版.+。?$/u,
  /\s[—-]\s.+\b(sur|en|auf|no)\s+(Nintendo\s+Switch|NS2)\.?$/iu,
];

const PLAYTIME_PATTERNS = [
  /[~～]?\s*\d+\s*[–—\-~+·]?\s*\d*\s*(h|hr|hrs|hour|hours|min|minutes|std\.?|heures?|horas?)\b/iu,
  /[~～]?\s*\d+\s*[–—\-~+·]?\s*\d*\s*(小时|小時|分钟|分鐘|時間|分)/u,
  /(主线|本編|campagne|historia|story|extras?|コンプ|全收集|complete|completion|100\s*%)/iu,
];

const BAD_CANDIDATE_PATTERNS = [
  /\b(metacritic|gamegulf|nintendo\s+switch|ns2|historical low|sale|discount|price|pricing|eur|usd|cny|jpy)\b/iu,
  /\b(guide|worth buying|buy now|wait|skip)\b/iu,
  /价格|折扣|低价|买|等|区服|日区|美区|史低|促销|セール|価格|買い|割引|promo|prix|oferta|precio|rabatt|preis|preço|desconto/iu,
  ...PLAYTIME_PATTERNS,
];

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/u);
  if (!match) return null;
  return {
    fm: yaml.load(match[1]) || {},
    raw: match[1],
    body: content.slice(match[0].length),
    fullMatch: match[0],
  };
}

function listMarkdownFiles() {
  const files = [];
  for (const locale of readdirSync(POSTS_ROOT).sort()) {
    const localeDir = join(POSTS_ROOT, locale);
    for (const name of readdirSync(localeDir).sort()) {
      if (name.endsWith('.md')) files.push(join(localeDir, name));
    }
  }
  return files;
}

function normalizedComparable(value) {
  return normalizeEntityName(value).replace(/^(whatitis|玩家热评|playerconsensus)/u, '');
}

function keywordSet(value) {
  return new Set(String(value || '')
    .toLowerCase()
    .replace(/[™®©《》『』「」“”"'’‘（）()：:—–\-_,，.。!！?？;]/g, ' ')
    .split(/\s+|、/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4));
}

function keywordOverlapStats(a, b) {
  const left = keywordSet(a);
  const right = keywordSet(b);
  if (!left.size || !right.size) return { shared: 0, ratio: 0 };
  let shared = 0;
  for (const key of left) if (right.has(key)) shared += 1;
  return { shared, ratio: shared / Math.min(left.size, right.size) };
}

function keywordOverlapRatio(a, b) {
  return keywordOverlapStats(a, b).ratio;
}

function overlapsCommunityVibe(fm) {
  const what = normalizedComparable(fm.whatItIs || '');
  const vibe = normalizedComparable(fm.communityVibe || '');
  if (!what || !vibe) return false;
  return what === vibe || what.includes(vibe) || vibe.includes(what);
}

function compactPlaytimeCue(value) {
  return cleanCandidate(value)
    .replace(/^\s*(Estimated scope|Estimated|Estimation|Estimación|Schätzung|Estimativa|目安|時間適性|时间适配|Tempo estimado|Tiempo estimado|Temps requis)\s*[:：]\s*/iu, '')
    .replace(/^\s*预估(?:体量)?\s*[:：]\s*/u, '')
    .replace(/^\s*本編/u, '本編')
    .replace(/\s+/gu, ' ')
    .replace(/[。.!！?？]+$/u, '')
    .trim();
}

function hasPlaytimeCopy(value) {
  const text = String(value || '').trim();
  return text !== '' && PLAYTIME_PATTERNS.some((pattern) => pattern.test(text));
}

function compactGenreLabel(value) {
  const text = cleanCandidate(value).replace(/[。.!！?？]+$/u, '');
  if (!text) return '';
  const firstClause = text.split(/[：:;；。.!]/u)[0]?.trim() || text;
  const parts = firstClause
    .split(/\s*,\s*|\s*\/\s*|、|，|\s+and\s+|\s+et\s+|\s+y\s+|\s+und\s+|\s+e\s+/iu)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 3);
  const joined = parts.join(firstClause.includes('、') ? '、' : ', ');
  if (joined && joined.length <= 40) return joined;
  const genre = primaryGenre(firstClause);
  return genre.length <= 40 ? genre : '';
}

function hasStructuralTerm(value) {
  return /(route|routen|encounter|boss|team|load|mode|coop|co-op|local|online|stage|level|deck|card|build|craft|explor|combat|movement|quest|map|room|chapter|mission|loop|system|règle|indice|ruta|misión|fase|capítulo|modo|regras|ルート|ボス|協力|ステージ|モード|構成|探索|戦闘|关卡|路线|模式|合作|构筑|战斗|探索|Boss)/iu.test(String(value || ''));
}

function richPlayStyleCandidate(fm, locale) {
  const source = cleanCandidate(fm.playStyle || '').replace(/[。.!！?？]+$/u, '');
  if (!source || source.length < 18 || !hasStructuralTerm(source)) return null;
  if (!/[,，、:：;；+]|\smit\s|\sohne\s|\swith\s|\swithout\s|\savec\s|\scon\s|\scom\s|と/u.test(source)) return null;
  if (hasPlaytimeCopy(source) || isGenericWhatItIs(source)) return null;
  const candidate = source.length > 90 ? clipText(source, 88) : source;
  const value = sentenceForLocale(candidate, locale);
  return !hasPlaytimeCopy(value) && !overlapsCommunityVibe({ ...fm, whatItIs: value })
    ? { value, source: 'play-style-structure' }
    : null;
}

function localizedStructureCue(fm, locale) {
  const playStyle = String(fm.playStyle || '').toLowerCase();
  const has = (...needles) => needles.some((needle) => playStyle.includes(needle));
  const cue = (() => {
    if (has('rogue')) return {
      en: 'run rules, build choices, and restart pressure',
      'zh-hans': '每局规则、构筑选择和重开压力',
      ja: '周回ルール、ビルド選択、リスタート圧',
      fr: 'règles de run, builds et pression de relance',
      es: 'reglas de run, builds y presión de reinicio',
      de: 'Run-Regeln, Builds und Neustartdruck',
      pt: 'regras de run, builds e pressão de recomeço',
    };
    if (has('platform', 'platformer', '平台', 'プラット', 'plattformer')) return {
      en: 'stage flow, movement timing, and retry rhythm',
      'zh-hans': '关卡推进、移动节奏和重试手感',
      ja: 'ステージ進行、移動タイミング、リトライ感',
      fr: 'enchaînement des niveaux, timing et reprises',
      es: 'flujo de niveles, timing y ritmo de reintento',
      de: 'Level-Fluss, Bewegungstiming und Retry-Rhythmus',
      pt: 'fluxo de fases, timing e ritmo de repetição',
    };
    if (has('shooter', 'arcade', '射击', 'シューティング')) return {
      en: 'aiming pressure, scoring routes, and short-stage loops',
      'zh-hans': '瞄准压力、得分路线和短关循环',
      ja: 'エイム圧、スコアルート、短い面の反復',
      fr: 'pression de visée, scoring et boucles courtes',
      es: 'presión de apuntado, rutas de puntuación y fases cortas',
      de: 'Zieldruck, Score-Routen und kurze Level-Loops',
      pt: 'pressão de mira, rotas de pontuação e fases curtas',
    };
    if (has('action', '动作', 'アクション', 'accion', 'acción', 'ação')) return {
      en: 'combat timing, movement feel, and encounter rhythm',
      'zh-hans': '战斗节奏、移动手感和遭遇设计',
      ja: '戦闘テンポ、移動感、遭遇設計',
      fr: 'timing de combat, mobilité et rythme des rencontres',
      es: 'ritmo de combate, movimiento y encuentros',
      de: 'Kampftiming, Bewegungsgefühl und Begegnungsrhythmus',
      pt: 'ritmo de combate, movimento e encontros',
    };
    if (has('adventure', '冒险', 'アドベンチャー', 'aventure', 'aventura', 'abenteuer')) return {
      en: 'exploration flow, interaction rules, and route choices',
      'zh-hans': '探索推进、互动规则和路线选择',
      ja: '探索の流れ、インタラクション、ルート選択',
      fr: 'exploration, interactions et choix de route',
      es: 'exploración, interacción y rutas',
      de: 'Erkundung, Interaktionen und Routenwahl',
      pt: 'exploração, interação e escolhas de rota',
    };
    if (has('puzzle', 'quebra-cabeça', 'puzle', 'puzzle', 'rätsel', '謎', '解谜', '谜题')) return {
      en: 'puzzle rules, clue flow, and solution feedback',
      'zh-hans': '谜题规则、线索递进和解法反馈',
      ja: '謎解きルール、手がかりの流れ、解法の手応え',
      fr: 'règles d’énigme, indices et retour de solution',
      es: 'reglas de puzle, pistas y respuesta de solución',
      de: 'Rätselregeln, Hinweisfluss und Lösungsfeedback',
      pt: 'regras de puzzle, pistas e retorno da solução',
    };
    if (has('simulation', 'sim', '模拟', 'シミュ', 'simulation', 'simulación')) return {
      en: 'daily routines, upgrade loops, and long-tail goals',
      'zh-hans': '日常循环、升级路线和长期目标',
      ja: '日課、アップグレード循環、長期目標',
      fr: 'routine, améliorations et objectifs au long cours',
      es: 'rutina diaria, mejoras y objetivos largos',
      de: 'Alltagsroutine, Upgrade-Schleifen und Langzeitziele',
      pt: 'rotina diária, upgrades e metas longas',
    };
    if (has('rpg', 'role-playing', 'rol', 'rollenspiel', '角色', 'ロール')) return {
      en: 'party growth, build choices, and quest routing',
      'zh-hans': '角色成长、构筑选择和任务推进',
      ja: '育成、ビルド選択、クエスト進行',
      fr: 'progression, builds et routes de quêtes',
      es: 'progresión, builds y rutas de misiones',
      de: 'Fortschritt, Builds und Quest-Routen',
      pt: 'progressão, builds e rotas de missões',
    };
    if (has('strategy', 'tactical', '策略', '戦略', 'stratégie', 'estrategia', 'strategie')) return {
      en: 'resource pressure, route choices, and planning windows',
      'zh-hans': '资源压力、路线选择和规划窗口',
      ja: 'リソース圧、ルート選択、計画の余地',
      fr: 'ressources, choix de route et fenêtres de planification',
      es: 'recursos, rutas y ventanas de planificación',
      de: 'Ressourcendruck, Routenwahl und Planungsfenster',
      pt: 'recursos, rotas e janelas de planejamento',
    };
    return {
      en: 'core systems, mode structure, and input feel decide the fit',
      'zh-hans': '核心系统、模式结构和操作手感决定适配度',
      ja: '中核システム、モード構成、操作感で相性を見る',
      fr: 'systèmes, modes et sensations de contrôle font le tri',
      es: 'sistemas, modos y sensación de control marcan el encaje',
      de: 'Systeme, Modi und Eingabegefühl entscheiden die Passung',
      pt: 'sistemas, modos e sensação de controle definem o encaixe',
    };
  })();
  return cue[locale] || cue.en;
}

function buildStructureWhatItIs(fm, locale) {
  const rich = richPlayStyleCandidate(fm, locale);
  if (rich) return rich;

  const genre = compactGenreLabel(fm.playStyle || '');
  const cue = localizedStructureCue(fm, locale);
  if (!genre || !cue) return null;
  const templates = {
    en: (g, c) => `${g}: ${c}.`,
    'zh-hans': (g, c) => `${g}：${c}。`,
    ja: (g, c) => `${g}：${c}。`,
    fr: (g, c) => `${g} : ${c}.`,
    es: (g, c) => `${g}: ${c}.`,
    de: (g, c) => `${g}: ${c}.`,
    pt: (g, c) => `${g}: ${c}.`,
  };
  const format = templates[locale] || templates.en;
  let value = format(genre, cue);
  if (value.length > 90) value = format(primaryGenre(genre), cue);
  if (value.length > 90) value = format(primaryGenre(genre), clipText(cue, 90 - primaryGenre(genre).length - 3));
  return value.length <= 90 && !isGenericWhatItIs(value) && !hasPlaytimeCopy(value) && !overlapsCommunityVibe({ ...fm, whatItIs: value })
    ? { value, source: 'system-structure' }
    : null;
}

function compactGameplayAnchor(value, locale) {
  let text = cleanCandidate(value);
  const replacements = locale === 'zh-hans'
    ? [/永远.*$/u, /才是.*$/u, /最.*$/u, /让人.*$/u, /撑起.*$/u, /卖的就是.*$/u]
    : locale === 'ja'
      ? [/が.+$/u, /で.+$/u, /まで.+$/u]
      : [/\b(carry|carries|define|defines|make|makes|fuel|fuels|grab|grabs|sell|sells|win|wins|wake|wakes|are|is|ne restent|ne reste|ne finissent|no terminan|vuelven|machen|trägt|tragen|precisa|puxam|nunca acabam)\b.*$/iu];
  for (const pattern of replacements) {
    const next = text.replace(pattern, '').trim();
    if (next.length >= 10) text = next;
  }
  return text.replace(/\s*[。.!！?？]+$/u, '').trim();
}

function primaryGenre(value) {
  return cleanCandidate(value).split(/\s*,\s*|\s*\/\s*|、|，|\s+and\s+|\s+et\s+|\s+y\s+|\s+und\s+|\s+e\s+/iu).find(Boolean) || cleanCandidate(value);
}

function clipText(value, max) {
  const text = cleanCandidate(value);
  if (text.length <= max) return text;
  const sliced = text.slice(0, max - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > max * 0.65 ? sliced.slice(0, lastSpace) : sliced).replace(/[\s,，;；:：]+$/u, '')}…`;
}

function buildMechanicWhatItIs(fm, locale) {
  const genre = cleanCandidate(fm.playStyle || '').replace(/[。.!！?？]+$/u, '');
  const source = fm.takeaway || '';
  const anchor = compactGameplayAnchor(source, locale);
  if (!genre || !anchor || anchor.length < 6) return null;
  const templates = {
    en: (g, a) => `${g}: ${a}.`,
    'zh-hans': (g, a) => `${g}：${a}。`,
    ja: (g, a) => `${g}：${a}。`,
    fr: (g, a) => `${g} : ${a}.`,
    es: (g, a) => `${g}: ${a}.`,
    de: (g, a) => `${g}: ${a}.`,
    pt: (g, a) => `${g}: ${a}.`,
  };
  const format = templates[locale] || templates.en;
  let value = format(genre, anchor);
  if (value.length > 90) value = format(primaryGenre(genre), anchor);
  if (value.length > 90) value = format(primaryGenre(genre), clipText(anchor, 90 - primaryGenre(genre).length - 3));
  return value.length <= 90 && !isGenericWhatItIs(value) && !overlapsCommunityVibe({ ...fm, whatItIs: value })
    ? { value, source: 'mechanic-summary' }
    : null;
}

function isGenericWhatItIs(value) {
  const text = String(value || '').trim();
  return text !== '' && GENERIC_PATTERNS.some((pattern) => pattern.test(text));
}

function normalizeEntityName(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/[《》『』「」“”"'’‘]/g, '')
    .replace(/[（(].*?[）)]/g, '')
    .replace(/[：:—–\-_,，、.。!！?？]/g, '')
    .replace(/\s+/g, '');
}

function isMostlyGenreList(value, fm) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return true;
  const tags = Array.isArray(fm.tags) ? fm.tags.map((tag) => String(tag).toLowerCase()) : [];
  const playStyle = String(fm.playStyle || '').toLowerCase();
  const normalized = normalizeEntityName(text);
  if (normalizeEntityName(fm.gameTitle) === normalized) return true;
  if (normalizeEntityName(fm.title) === normalized) return true;
  if (playStyle && normalizeEntityName(playStyle) === normalized) return true;
  if (tags.some((tag) => normalizeEntityName(tag) === normalized)) return true;
  const separators = text.split(/\s*,\s*|\s*\/\s*|、|，|\s+and\s+|\s+et\s+|\s+y\s+|\s+und\s+|\s+e\s+/iu).filter(Boolean);
  return separators.length > 1 && separators.every((part) => tags.includes(part.trim()) || playStyle.includes(part.trim()));
}

function cleanCandidate(value) {
  return String(value || '')
    .replace(/^["“”'‘’]+|["“”'‘’]+$/gu, '')
    .replace(/\s+/gu, ' ')
    .replace(/\s+([。.!！?？,，;；:：])/gu, '$1')
    .trim();
}

function hasEnoughSubstance(value) {
  const text = String(value || '').trim();
  if (text.length < 12 || text.length > 90) return false;
  const chunks = text.split(/,|，|、| and | et | y | und | e |と|、/iu).filter((part) => part.trim().length > 1);
  return chunks.length >= 2 || text.length >= 18;
}

function isGoodCandidate(value, fm) {
  const text = cleanCandidate(value);
  if (!hasEnoughSubstance(text)) return false;
  if (isGenericWhatItIs(text)) return false;
  if (isMostlyGenreList(text, fm)) return false;
  if (BAD_CANDIDATE_PATTERNS.some((pattern) => pattern.test(text))) return false;
  const normalized = normalizeEntityName(text);
  const title = normalizeEntityName(fm.gameTitle);
  if (title && normalized === title) return false;
  return true;
}

function sentenceForLocale(value, locale) {
  let text = cleanCandidate(value);
  if (/[。.!！?？]$/u.test(text)) return text;
  if (locale === 'ja') return `${text}。`;
  if (locale === 'zh-hans') return `${text}。`;
  return `${text}.`;
}

function extractBoldCandidates(body) {
  const candidates = [];
  const quick = body.match(/^(?:\s|.){0,1800}/u)?.[0] || body;
  for (const source of [quick, body]) {
    for (const match of source.matchAll(/\*\*([^*\n]{6,120})\*\*/gu)) {
      candidates.push(match[1]);
    }
  }
  return [...new Set(candidates.map(cleanCandidate).filter(Boolean))];
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isClippedValue(value) {
  return /(?:…|\.\.\.)\s*[。.!！?？]?\s*$/u.test(String(value || '').trim());
}

function fieldCandidate(value, source, fm, locale) {
  const text = cleanCandidate(value);
  if (!isGoodCandidate(text, fm)) return null;
  return { value: sentenceForLocale(text, locale), source };
}

function stripEvaluationTail(value) {
  return cleanCandidate(value)
    .replace(/\b(keep|keeps|carry|carries|define|defines|sell|sells|drive|drives|anchor|anchors|make|makes|hit|hits|hook|hooks|shine|shines|justify|justifies|split|splits|divide|divides|are|is|still|enganchan|marca|marcan|activan|venden|dan|da|hacen|hace|vuelven|vuelve|sostienen|sostiene|dividen|divide|es|son|lucen|lleva|llevan|empujan|donne|donnent|font|reste|restent|portent|tiennent|charment|fonctionnent|tragen|trägt|macht|machen|prägen|glänzen|beißen|hallen|hypnotisieren|spalten|ist|sind|wirken|lassen|definieren|sustentam|sustenta|definem|define|puxam|puxa|hipnotizam|encantam|nunca acabam)\b.*$/iu, '')
    .replace(/(是核心|撑起.*|定义.*|让.*|很抓人|卖点.*|分裂.*|才是.*|が.*|を支える.*|で決まる.*)$/u, '')
    .replace(/\b(le|lo|la|los|las|el|the|der|die|das|den|dem|des|du|de|le|la|les|il|lo|o|a|os|as|o|を|が|は|に|で)\s*$/iu, '')
    .replace(/[;；:：—–\-]+$/u, '')
    .trim();
}

function candidateFromCommunityVibe(fm, locale) {
  const source = cleanCandidate(fm.communityVibe || '').replace(/[。.!！?？]+$/u, '');
  if (!source || hasPlaytimeCopy(source)) return null;

  const title = cleanCandidate(fm.gameTitle || '');
  let text = stripEvaluationTail(source.replace(new RegExp(`\\b${escapeRegExp(title)}\\b`, 'giu'), ''));

  if (text.length < 8) text = stripEvaluationTail(source);
  const chunks = text.split(/,|，|、| et | y | und | e | and |と/iu).map((part) => part.trim()).filter(Boolean).slice(0, 4);
  if (chunks.length < 2) return null;
  text = chunks.join(locale === 'zh-hans' || locale === 'ja' ? '、' : ', ');
  if (text.length > 72) text = chunks.slice(0, 3).join(locale === 'zh-hans' || locale === 'ja' ? '、' : ', ');
  text = stripEvaluationTail(text);
  if (text.length < 8) return null;
  const value = sentenceForLocale(text, locale);
  return !hasPlaytimeCopy(value) && !isClippedValue(value) && !overlapsCommunityVibe({ ...fm, whatItIs: value })
    ? { value, source: 'community-specific-anchor' }
    : null;
}

function isRepeatedTemplateValue(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  if (isGenericWhatItIs(text) || hasPlaytimeCopy(text) || isClippedValue(text)) return true;
  return /(?:combat timing|movement feel|encounter rhythm|timing de combat|mobilité|rythme des rencontres|ritmo de combate|movimiento y encuentros|Kampftiming|Bewegungsgefühl|Begegnungsrhythmus|战斗节奏|移动手感|遭遇设计|戦闘テンポ|移動感|遭遇設計|exploration flow|interaction rules|route choices|exploration, interactions|exploración, interacción|Erkundung, Interaktionen|puzzle rules|clue flow|solution feedback|règles d[’']énigme|reglas de puzle|Rätselregeln|run rules|build choices|restart pressure|reglas de run|règles de run|Run-Regeln|resource pressure|planning windows|资源压力|规划窗口)/iu.test(text);
}
function findReplacement(fm, body, locale) {
  const community = fieldCandidate(fm.communityVibe, 'communityVibe', fm, locale);
  if (community) return community;

  const takeaway = fieldCandidate(String(fm.takeaway || '').split(/[。.!！?？]/u)[0], 'takeaway', fm, locale);
  if (takeaway) return takeaway;

  for (const candidate of extractBoldCandidates(body)) {
    const result = fieldCandidate(candidate, 'body-bold-hook', fm, locale);
    if (result) return result;
  }

  return null;
}

function replaceFrontmatterField(raw, key, value) {
  const lines = raw.split(/\r?\n/u);
  const index = lines.findIndex((line) => line.startsWith(`${key}:`));
  const dumped = yaml.dump({ [key]: value }, { lineWidth: 0, noRefs: true }).trimEnd();
  const replacement = dumped.split(/\r?\n/u);
  if (index === -1) return `${raw}\n${dumped}`;

  let end = index + 1;
  while (end < lines.length && /^\s/.test(lines[end])) end += 1;
  lines.splice(index, end - index, ...replacement);
  return lines.join('\n');
}

let generic = 0;
let proposed = 0;
let changed = 0;
let unresolved = 0;
const samples = [];
const unresolvedSamples = [];
const byLocale = new Map();

const allFiles = listMarkdownFiles();
const repeatedValues = new Set();
if (REPAIR_REPEATED) {
  const counts = new Map();
  for (const file of allFiles) {
    const content = stripUtf8Bom(readFileSync(file, 'utf8'));
    const parsed = parseFrontmatter(content);
    const value = String(parsed?.fm?.whatItIs || '').trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  for (const [value, count] of counts.entries()) {
    if (count > 1 && isRepeatedTemplateValue(value)) repeatedValues.add(value);
  }
}

for (const file of allFiles) {
  const content = stripUtf8Bom(readFileSync(file, 'utf8'));
  const parsed = parseFrontmatter(content);
  if (!parsed) continue;
  const locale = relative(POSTS_ROOT, file).split('/')[0];
  const current = parsed.fm.whatItIs;
  const needsRepair =
    isGenericWhatItIs(current) ||
    (REPAIR_OVERLAP && overlapsCommunityVibe(parsed.fm)) ||
    (REPAIR_PLAYTIME && hasPlaytimeCopy(current)) ||
    (REPAIR_REPEATED && repeatedValues.has(String(current || '').trim()));
  if (!needsRepair) continue;

  generic += 1;
  byLocale.set(locale, (byLocale.get(locale) || 0) + 1);
  const specific = REPAIR_REPEATED ? candidateFromCommunityVibe(parsed.fm, locale) : null;
  const structure = specific || (!REPAIR_REPEATED ? buildStructureWhatItIs(parsed.fm, locale) : null);
  const mechanic = structure || (!REPAIR_REPEATED ? buildMechanicWhatItIs(parsed.fm, locale) : null);
  const replacement = mechanic || (isGenericWhatItIs(current) && !REPAIR_REPEATED ? findReplacement(parsed.fm, parsed.body, locale) : null);
  if (!replacement) {
    unresolved += 1;
    if (unresolvedSamples.length < SAMPLE_LIMIT) unresolvedSamples.push(relative(process.cwd(), file));
    continue;
  }

  proposed += 1;
  if (samples.length < SAMPLE_LIMIT) {
    samples.push({ file: relative(process.cwd(), file), from: current, to: replacement.value, source: replacement.source });
  }

  if (WRITE) {
    const newRaw = replaceFrontmatterField(parsed.raw, 'whatItIs', replacement.value);
    const newContent = content.replace(parsed.fullMatch, `---\n${newRaw}\n---`);
    writeFileSync(file, newContent, 'utf8');
    changed += 1;
  }
}

console.log(`generic whatItIs: ${generic}`);
console.log(`proposed high-confidence replacements: ${proposed}`);
console.log(`unresolved: ${unresolved}`);
console.log(`mode: ${WRITE ? 'write' : 'dry-run'}`);
console.log(`by locale: ${JSON.stringify(Object.fromEntries([...byLocale.entries()].sort()), null, 2)}`);

if (samples.length) {
  console.log('\nSamples:');
  for (const sample of samples) {
    console.log(`- ${sample.file}`);
    console.log(`  from: ${sample.from}`);
    console.log(`  to:   ${sample.to}`);
    console.log(`  src:  ${sample.source}`);
  }
}

if (unresolvedSamples.length) {
  console.log('\nUnresolved samples:');
  for (const file of unresolvedSamples) console.log(`- ${file}`);
}

if (WRITE) console.log(`\nChanged files: ${changed}`);
else console.log('\nRun with --write to apply high-confidence replacements.');
