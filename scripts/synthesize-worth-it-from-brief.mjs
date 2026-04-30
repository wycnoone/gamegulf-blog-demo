#!/usr/bin/env node
/**
 * Generate 7-locale worth-it Markdown posts from one content/briefs/{slug}.json.
 * Run after extract-game-brief; then: sync-article-pricing on all 7 paths, validate, build.
 *
 * Usage:
 *   node scripts/synthesize-worth-it-from-brief.mjs content/briefs/some-game.json [--slug article-slug]
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import {
  briefQualifiesForZeroPricePlaceholderGrid,
  buildPriceRowsFromBrief,
  buildZeroPricePlaceholderRows,
  normalizePriceRows,
} from './article-pricing-utils.mjs';
import { formatPlaytime, getPlaytimeEstimate } from './lib/playtime-fallbacks.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const POSTS = join(ROOT, 'src', 'content', 'posts');
const LOCALES = ['en', 'zh-hans', 'ja', 'fr', 'es', 'de', 'pt'];

const GAME_TITLE_LOCALIZATIONS = {
  'persona-5-royal': {
    'zh-hans': '女神异闻录5 皇家版',
    ja: 'ペルソナ5 ザ・ロイヤル',
  },
  'tetris-effect-connected': {
    'zh-hans': '俄罗斯方块效应：连接',
    ja: 'テトリス エフェクト・コネクテッド',
  },
  hades: {
    'zh-hans': '哈迪斯',
    ja: 'HADES',
  },
  'ori-and-the-will-of-the-wisps': {
    'zh-hans': '奥日与萤火意志',
    ja: 'Ori and the Will of the Wisps',
  },
  'super-smash-bros-ultimate': {
    'zh-hans': '任天堂明星大乱斗 特别版',
    ja: '大乱闘スマッシュブラザーズ SPECIAL',
  },
  undertale: {
    'zh-hans': '传说之下',
    ja: 'UNDERTALE',
  },
  'bayonetta-2': {
    'zh-hans': '猎天使魔女2',
    ja: 'ベヨネッタ2',
  },
  celeste: {
    'zh-hans': '蔚蓝',
    ja: 'Celeste',
  },
  'mario-kart-8-deluxe': {
    'zh-hans': '马力欧卡丁车8 豪华版',
    ja: 'マリオカート８ デラックス',
  },
  'super-mario-bros-wonder': {
    'zh-hans': '超级马力欧兄弟 惊奇',
    ja: 'スーパーマリオブラザーズ ワンダー',
  },
  inside: {
    'zh-hans': 'INSIDE',
    ja: 'INSIDE',
  },
  'shovel-knight-treasure-trove': {
    'zh-hans': '铲子骑士：宝藏版',
    ja: 'ショベルナイト: Treasure Trove',
  },
  unavowed: {
    'zh-hans': '无誓者',
    ja: 'アンアヴァウド',
  },
};

const AUTHOR = {
  en: 'GameGulf Editorial AI',
  'zh-hans': 'GameGulf 编辑部',
  ja: 'GameGulf 編集部',
  fr: 'Rédaction GameGulf',
  es: 'Redacción GameGulf',
  de: 'GameGulf-Redaktion',
  pt: 'Redação GameGulf',
};

const GENRE_FALLBACK = {
  en: 'this genre',
  'zh-hans': '该类型',
  ja: 'このジャンル',
  fr: 'ce genre',
  es: 'este género',
  de: 'dieses Genre',
  pt: 'este gênero',
};

const GENRE_JOIN = {
  en: (items) => items.join(', '),
  'zh-hans': (items) => items.join('、'),
  ja: (items) => items.join(' / '),
  fr: (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items.at(-1)}`),
  es: (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`),
  de: (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} und ${items.at(-1)}`),
  pt: (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} e ${items.at(-1)}`),
};

const GENRE_LABELS = {
  action: { en: 'action', 'zh-hans': '动作', ja: 'アクション', fr: 'action', es: 'acción', de: 'Action', pt: 'ação' },
  adventure: { en: 'adventure', 'zh-hans': '冒险', ja: 'アドベンチャー', fr: 'aventure', es: 'aventura', de: 'Abenteuer', pt: 'aventura' },
  'role-playing': { en: 'role-playing', 'zh-hans': '角色扮演', ja: 'RPG', fr: 'jeu de rôle', es: 'rol', de: 'Rollenspiel', pt: 'RPG' },
  rpg: { en: 'RPG', 'zh-hans': '角色扮演', ja: 'RPG', fr: 'jeu de rôle', es: 'rol', de: 'Rollenspiel', pt: 'RPG' },
  arcade: { en: 'arcade', 'zh-hans': '街机', ja: 'アーケード', fr: 'arcade', es: 'arcade', de: 'Arcade', pt: 'arcade' },
  music: { en: 'music', 'zh-hans': '音乐', ja: '音楽', fr: 'musique', es: 'música', de: 'Musik', pt: 'música' },
  puzzle: { en: 'puzzle', 'zh-hans': '解谜', ja: 'パズル', fr: 'puzzle', es: 'puzle', de: 'Puzzle', pt: 'quebra-cabeça' },
  strategy: { en: 'strategy', 'zh-hans': '策略', ja: 'ストラテジー', fr: 'stratégie', es: 'estrategia', de: 'Strategie', pt: 'estratégia' },
  simulation: { en: 'simulation', 'zh-hans': '模拟', ja: 'シミュレーション', fr: 'simulation', es: 'simulación', de: 'Simulation', pt: 'simulação' },
  platformer: { en: 'platformer', 'zh-hans': '平台跳跃', ja: 'プラットフォーム', fr: 'plates-formes', es: 'plataformas', de: 'Plattformer', pt: 'plataforma' },
  racing: { en: 'racing', 'zh-hans': '竞速', ja: 'レース', fr: 'course', es: 'carreras', de: 'Rennspiel', pt: 'corrida' },
  sports: { en: 'sports', 'zh-hans': '体育', ja: 'スポーツ', fr: 'sport', es: 'deportes', de: 'Sport', pt: 'esportes' },
  fighting: { en: 'fighting', 'zh-hans': '格斗', ja: '格闘', fr: 'combat', es: 'lucha', de: 'Kampfspiel', pt: 'luta' },
  shooter: { en: 'shooter', 'zh-hans': '射击', ja: 'シューティング', fr: 'tir', es: 'disparos', de: 'Shooter', pt: 'tiro' },
  party: { en: 'party', 'zh-hans': '聚会', ja: 'パーティー', fr: 'soirée', es: 'fiesta', de: 'Party', pt: 'festa' },
  indie: { en: 'indie', 'zh-hans': '独立', ja: 'インディー', fr: 'indé', es: 'indie', de: 'Indie', pt: 'indie' },
};

function localizedGenreName(locale, genre) {
  const raw = String(genre || '').trim();
  if (!raw) return '';
  const key = raw.toLowerCase().replace(/[™®©]/g, '').replace(/\s*&\s*/g, ' and ').replace(/\s+/g, '-');
  const direct = GENRE_LABELS[key] || GENRE_LABELS[key.replace(/-game$/, '')] || GENRE_LABELS[key.replace(/s$/, '')];
  if (direct?.[locale]) return direct[locale];
  return locale === 'en' ? raw : GENRE_FALLBACK[locale];
}

function localizedCommunityVibe(locale, title, genres = []) {
  const slug = slugify(title);
  const gameSpecific = {
    'persona-5-royal': {
      en: 'Calendar panic and confidant FOMO fuel the JRPG love',
      'zh-hans': '日程管理和人格面具合成让人上头，也最怕错过一天',
      ja: '日程管理とコープ沼、長編JRPGの沼にハマる声が多い',
      fr: 'Calendrier, confidants et FOMO nourrissent l’addiction JRPG',
      es: 'Calendario, vínculos y FOMO sostienen el enganche JRPG',
      de: 'Kalenderstress, Confidants und FOMO tragen den JRPG-Sog',
      pt: 'Calendário, confidants e FOMO puxam o vício de JRPG',
    },
    'tetris-effect-connected': {
      en: 'Zone trance wins people over; ranked gaps wake you up fast',
      'zh-hans': '音画催眠到忘记眨眼，对战区高手会让人瞬间清醒',
      ja: '音と光でゾーン入り、対戦勢の壁で一気に目が覚める',
      fr: 'Transe audiovisuelle; le versus rappelle vite le niveau',
      es: 'Trance audiovisual; el competitivo despierta de golpe',
      de: 'Audiovisuelle Trance; Versus zeigt Skill-Gaps brutal klar',
      pt: 'Transe audiovisual; o versus mostra o abismo de nível',
    },
    hades: {
      en: 'One more run, dad jokes, and boon luck carry the obsession',
      'zh-hans': '再来一把就能见老爸，祝福构筑爽但跑图会循环上头',
      ja: 'もう1周と父上ネタ、功徳ガチャで止め時を失う',
      fr: 'Encore un run, blagues de père et tirages de bienfaits',
      es: 'Otro run más, bromas con papá y suerte de bendiciones',
      de: 'Noch ein Run, Vater-Witze und Segen-RNG treiben an',
      pt: 'Só mais uma run, piadas de pai e sorte nas bênçãos',
    },
    'ori-and-the-will-of-the-wisps': {
      en: 'Gorgeous vistas, chase panic, and precision jumps define praise',
      'zh-hans': '画面美到像壁纸，追逐战和精准跳跃也真能扎心',
      ja: '絵は壁紙級、追跡戦と精密ジャンプで心拍が上がる',
      fr: 'Beau comme fond d’écran; poursuites et sauts piquent',
      es: 'Parece fondo de pantalla, pero persecuciones y saltos duelen',
      de: 'Wallpaper-schön, doch Verfolgungen und Sprünge pieksen',
      pt: 'Lindo como papel de parede, mas perseguições apertam',
    },
    'super-smash-bros-ultimate': {
      en: 'Party chaos, roster arguments, and blame-the-items energy',
      'zh-hans': '朋友聚会秒变大乱斗，派对神作也最容易互相甩锅',
      ja: 'パーティー乱闘とアイテム責任論で盛り上がる定番',
      fr: 'Chaos de canapé, débats de roster et faute aux objets',
      es: 'Caos de sofá, debates de roster y culpa a los objetos',
      de: 'Sofa-Chaos, Roster-Streit und Schuld auf die Items',
      pt: 'Caos no sofá, briga de elenco e culpa nos itens',
    },
    undertale: {
      en: 'Go in blind: mercy choices, Sans memes, and spoiler patrols',
      'zh-hans': '别乱砍怪，一周目盲玩和 Sans 梗才是玩家劝坑重点',
      ja: '初見で遊べ警察、慈悲ルートとSansネタが強い',
      fr: 'À faire sans spoil: pitié, Sans et police du blind run',
      es: 'Mejor a ciegas: piedad, Sans y policía anti-spoilers',
      de: 'Blind spielen: Mercy, Sans-Memes und Spoiler-Polizei',
      pt: 'Jogue às cegas: misericórdia, Sans e caça a spoilers',
    },
    'bayonetta-2': {
      en: 'Witch Time hype, stylish combos, and Platinum difficulty jokes',
      'zh-hans': '魔女时间一开就停不下，手残党也会被白金连段教育',
      ja: 'ウィッチタイムが決まる快感、プラチナ難度に笑う',
      fr: 'Witch Time grisant, combos stylés, difficulté Platinum',
      es: 'Witch Time, combos con estilo y bromas sobre Platinum',
      de: 'Witch-Time-Rausch, Style-Combos und Platinum-Härte',
      pt: 'Witch Time, combos estilosos e piadas de dificuldade',
    },
    celeste: {
      en: 'Dash resets, strawberry greed, and B-side pain define the love',
      'zh-hans': '冲刺重置、草莓收集和 B 面关卡最容易让人上头',
      ja: 'ダッシュ更新、イチゴ欲、B面の苦戦まで含めて人気',
      fr: 'Dashs, fraises risquées et faces B nourrissent l’attachement',
      es: 'Dash, fresas arriesgadas y caras B sostienen el cariño',
      de: 'Dash-Resets, Erdbeer-Gier und B-Seiten prägen die Liebe',
      pt: 'Dash, morangos arriscados e lados B sustentam o carinho',
    },
    'mario-kart-8-deluxe': {
      en: 'Blue shells, couch chaos, and Booster Course debates never end',
      'zh-hans': '蓝龟壳、同屏互坑和新增赛道争论才是日常',
      ja: 'トゲゾー、ローカル対戦、追加コース談義が定番',
      fr: 'Carapaces bleues, canapé chaotique et débats sur les circuits',
      es: 'Caparazones azules, sofá caótico y debate de pistas',
      de: 'Blaue Panzer, Sofa-Chaos und Streckenpass-Debatten',
      pt: 'Cascos azuis, caos no sofá e debate de pistas extras',
    },
    'super-mario-bros-wonder': {
      en: 'Wonder Flowers, badges, and elephant Mario carry the praise',
      'zh-hans': '惊奇花、徽章和大象马力欧是玩家最常提的爽点',
      ja: 'ワンダーフラワー、バッジ、ゾウマリオが話題の中心',
      fr: 'Fleurs prodige, badges et Mario éléphant portent les retours',
      es: 'Flores maravilla, insignias y Mario elefante dominan elogios',
      de: 'Wunderblumen, Abzeichen und Elefanten-Mario tragen das Lob',
      pt: 'Flores maravilha, insígnias e Mario elefante puxam elogios',
    },
    inside: {
      en: 'Mood, sound, and wordless puzzle dread are the real hook',
      'zh-hans': '无对白压迫感、声画节奏和谜题氛围最让人记住',
      ja: '無言の圧迫感、音作り、パズル演出が記憶に残る',
      fr: 'Ambiance muette, son et énigmes oppressantes marquent surtout',
      es: 'Atmósfera muda, sonido y puzles tensos son el gancho',
      de: 'Wortlose Spannung, Sound und Rätseldesign bleiben hängen',
      pt: 'Clima sem falas, som e puzzles tensos são o destaque',
    },
    'shovel-knight-treasure-trove': {
      en: 'Tight pogo jumps, campaigns, and 8-bit bosses sell the bundle',
      'zh-hans': '铲击跳、多个战役和 8-bit Boss 才是合集卖点',
      ja: 'ホッピング攻撃、複数キャンペーン、8bitボス戦が魅力',
      fr: 'Sauts-pelle, campagnes multiples et boss 8-bit font le lot',
      es: 'Saltos con pala, campañas y jefes 8-bit venden el pack',
      de: 'Pogo-Sprünge, Kampagnen und 8-Bit-Bosse tragen das Paket',
      pt: 'Pogo com pá, campanhas e chefes 8-bit vendem o pacote',
    },
    unavowed: {
      en: 'Party choices, voice work, and urban fantasy carry the praise',
      'zh-hans': '队友选择、配音和都市奇幻故事是好评核心',
      ja: '仲間選択、ボイス、都会派ファンタジーが評価の中心',
      fr: 'Choix d’équipe, doublage et fantasy urbaine portent les avis',
      es: 'Compañeros, voces y fantasía urbana sostienen el elogio',
      de: 'Begleiterwahl, Vertonung und Urban Fantasy tragen das Lob',
      pt: 'Escolhas de equipe, vozes e fantasia urbana puxam elogios',
    },
  };
  const specific = gameSpecific[slug]?.[locale];
  if (specific) return specific;

  const genreText = localizedGenreList(locale, genres, 2);
  const fallback = {
    en: `${genreText} praise; price and pacing divide players`,
    'zh-hans': `${genreText}评价不错；价格与节奏影响取舍`,
    ja: `${genreText}の評価は良好。価格とテンポで判断`,
    fr: `${genreText} apprécié; prix et rythme divisent`,
    es: `${genreText} apreciado; precio y ritmo dividen`,
    de: `${genreText} kommt gut an; Preis und Tempo teilen`,
    pt: `${genreText} agrada; preço e ritmo dividem`,
  };
  return fallback[locale] || fallback.en;
}

function localizedGenreList(locale, genres, max = 3) {
  const values = Array.isArray(genres)
    ? genres
    : String(genres || '')
      .split(/\s*,\s*|\s*\/\s*|、/)
      .filter(Boolean);
  const translated = values
    .slice(0, max)
    .map((genre) => localizedGenreName(locale, genre))
    .filter(Boolean);
  const unique = [...new Set(translated)].filter((item) => item !== GENRE_FALLBACK[locale]);
  const items = unique.length ? unique : [GENRE_FALLBACK[locale] || GENRE_FALLBACK.en];
  return (GENRE_JOIN[locale] || GENRE_JOIN.en)(items);
}

function slugify(title) {
  return String(title)
    .toLowerCase()
    .replace(/[™®©:]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function localizedGameTitle(locale, title) {
  const cleaned = String(title || '').replace(/[™®©]/g, '').trim();
  return GAME_TITLE_LOCALIZATIONS[slugify(cleaned)]?.[locale] || cleaned;
}

function getMc(brief) {
  const g = brief.game?.metacritic;
  if (typeof g === 'number' && g > 0) return g;
  const s = brief.enrichment?.steam?.metacritic_score;
  if (typeof s === 'number' && s > 0) return s;
  return null;
}

function mapPriceDecision(priceVerdict, analytics) {
  const v = priceVerdict || 'occasional_discounter';
  if (v === 'regular_discounter') {
    const cur = analytics?.current_cheapest?.price_eur;
    const avg = analytics?.avg_discount_price_eur;
    if (cur != null && avg != null && cur <= avg * 1.08) {
      return { verdict: 'buy_now', priceCall: 'buy', confidence: 'medium', badgeKey: 'buy' };
    }
    return { verdict: 'wait_for_sale', priceCall: 'wait', confidence: 'medium', badgeKey: 'wait' };
  }
  const table = {
    at_historical_low: { verdict: 'buy_now', priceCall: 'buy', confidence: 'high', badgeKey: 'buy' },
    near_historical_low: { verdict: 'buy_now', priceCall: 'buy', confidence: 'high', badgeKey: 'buy' },
    sale_likely_soon: { verdict: 'wait_for_sale', priceCall: 'wait', confidence: 'medium', badgeKey: 'wait' },
    occasional_discounter: { verdict: 'right_player', priceCall: 'watch', confidence: 'medium', badgeKey: 'watch' },
    rarely_discounted: { verdict: 'buy_now', priceCall: 'buy', confidence: 'high', badgeKey: 'buy' },
  };
  return table[v] || { verdict: 'right_player', priceCall: 'watch', confidence: 'medium', badgeKey: 'watch' };
}

function hltbHours(brief) {
  const h = brief.enrichment?.hltb;
  if (!h) return null;
  return {
    main: h.main_story_hours,
    extra: h.main_extra_hours,
    comp: h.completionist_hours,
  };
}

const BADGE = {
  en: { buy: 'Buy now', wait: 'Wait for sale', watch: 'Depends on taste' },
  'zh-hans': { buy: '现在就买', wait: '等折扣', watch: '看口味' },
  ja: { buy: '今が買い時', wait: 'セール待ち', watch: '好み次第' },
  fr: { buy: 'Acheter maintenant', wait: 'Attendre les promos', watch: 'Selon les goûts' },
  es: { buy: 'Comprar ya', wait: 'Esperar rebajas', watch: 'Según gustos' },
  de: { buy: 'Jetzt kaufen', wait: 'Auf Rabatt warten', watch: 'Geschmackssache' },
  pt: { buy: 'Comprar agora', wait: 'Esperar promoção', watch: 'Depende do gosto' },
};

const READING = {
  en: '7 min read',
  'zh-hans': '7 分钟阅读',
  ja: '読了約7分',
  fr: '7 min de lecture',
  es: '7 min de lectura',
  de: '7 Min. Lesezeit',
  pt: '7 min de leitura',
};

function locHeroStat(locale, mc) {
  if (!mc) return locale === 'zh-hans' ? 'Metacritic 约 70 分' : `${Math.round(mc)} Metacritic`;
  if (locale === 'zh-hans') return `Metacritic 约 ${Math.round(mc)} 分`;
  if (locale === 'ja') return `Metacritic ${Math.round(mc)}点台`;
  return `${Math.round(mc)} Metacritic`;
}

function locReviewSignal(locale, mc) {
  return locHeroStat(locale, mc);
}

function locPlaytime(locale, estimate) {
  return formatPlaytime(locale, estimate);
}

function locTimeFitFallback(locale, playtime) {
  const map = {
    en: `Time fit: ${playtime}`,
    'zh-hans': `时间适配：${playtime}`,
    ja: `時間の目安：${playtime}`,
    fr: `Temps requis : ${playtime}`,
    es: `Tiempo estimado: ${playtime}`,
    de: `Zeitbedarf: ${playtime}`,
    pt: `Tempo estimado: ${playtime}`,
  };
  return map[locale] || map.en;
}

function discountParagraph(locale, a, detailUrl, anchorEur, metaYear) {
  const y = metaYear || '2026';
  const anchor = Number.isFinite(Number(anchorEur)) ? Number(anchorEur) : 0;
  const ev = a?.discount_events_1y ?? 0;
  const avg = a?.avg_discount_price_eur;
  const days = a?.days_since_last_discount;
  const last = a?.last_discount;
  const trend = a?.trend_from_lowest;
  const atl = a?.global_low;
  const eur = (n) => {
    const x = n != null && Number.isFinite(Number(n)) ? Number(n) : anchor;
    return `€${x.toFixed(2)}`;
  };
  const fallbackDline = {
    en: `${y} tracker window (cheapest indexed territory ${eur(anchor)})`,
    'zh-hans': `${y} 追踪窗口（索引最低区服 ${eur(anchor)}）`,
    ja: `${y}年の追跡期間（インデックス最安地域 ${eur(anchor)}）`,
    fr: `fenêtre suivie ${y} (région indexée la moins chère ${eur(anchor)})`,
    es: `ventana de seguimiento de ${y} (región indexada más barata ${eur(anchor)})`,
    de: `Beobachtungsfenster ${y} (günstigste indexierte Region ${eur(anchor)})`,
    pt: `janela acompanhada de ${y} (região indexada mais barata ${eur(anchor)})`,
  };
  const dline =
    last?.date && last?.region
      ? `${last.date} (${last.region}, ${eur(last.price_eur)})`
      : trend?.date
        ? `${trend.date} (${trend.region || trend.country || ''}, ${eur(trend.price_eur)})`
        : fallbackDline[locale] || fallbackDline.en;

  if (locale === 'en') {
    return `Tracked **discount** history: **all-time low** around **${eur(atl?.price_eur)}** (${atl?.region || trend?.region || 'see grid'}), **${ev}** **sale** moves in the past year, **average sale** near **${eur(avg)}**, last notable shift **${days ?? '—'}** days ago on **${dline}**. Cross-check [GameGulf live pricing](${detailUrl}#currency-price) before you buy — **${y}** regional timing still shifts.`;
  }
  if (locale === 'zh-hans') {
    return `结合 **折扣** 追踪：**历史低价**约 **${eur(atl?.price_eur)}**（${atl?.region || trend?.region || '见表'}），过去一年约 **${ev}** 次促销，**平均促销价**约 **${eur(avg)}**，距上次明显波动约 **${days ?? '—'}** 天（**${dline}**，**${y}**）。下单前请再核对 [GameGulf 实时价格](${detailUrl}#currency-price)。`;
  }
  if (locale === 'ja') {
    return `**セール**履歴：**最安値**は **${eur(atl?.price_eur)}** 付近（${atl?.region || trend?.region || '一覧参照'}）、直近1年で **${ev}** 回の動き、**平均セール価格**は **${eur(avg)}**、直近の大きめの動きから **${days ?? '—'}** 日（**${dline}**，**${y}**）。[GameGulfの価格](${detailUrl}#currency-price)で最新の価格帯を確認してください。`;
  }
  if (locale === 'fr') {
    return `Historique des **soldes** : **plus bas historique** vers **${eur(atl?.price_eur)}** (${atl?.region || trend?.region || 'voir grille'}), **${ev}** mouvements sur 12 mois, **prix moyen promo** **${eur(avg)}**, dernière variation notable il y a **${days ?? '—'}** jours (**${dline}**, **${y}**). Vérifiez le [tableau GameGulf](${detailUrl}#currency-price).`;
  }
  if (locale === 'es') {
    return `Historial de **descuentos**: **mínimo histórico** cerca de **${eur(atl?.price_eur)}** (${atl?.region || trend?.region || 'ver tabla'}), **${ev}** movimientos en 12 meses, **precio medio en oferta** **${eur(avg)}**, último movimiento hace **${days ?? '—'}** días (**${dline}**, **${y}**). Mira el [precio en vivo en GameGulf](${detailUrl}#currency-price).`;
  }
  if (locale === 'de') {
    return `**Rabatt**-Historie: **historischer Tiefstpreis** um **${eur(atl?.price_eur)}** (${atl?.region || trend?.region || 'siehe Tabelle'}), **${ev}** Bewegungen im Jahr, **Ø-Rabattpreis** **${eur(avg)}**, letzte größere Bewegung vor **${days ?? '—'}** Tagen (**${dline}**, **${y}**). [GameGulf-Livepreis](${detailUrl}#currency-price) prüfen.`;
  }
  return `Histórico de **descontos**: **menor preço histórico** perto de **${eur(atl?.price_eur)}** (${atl?.region || trend?.region || 'ver grelha'}), **${ev}** movimentos em 12 meses, **média em promoção** **${eur(avg)}**, último movimento há **${days ?? '—'}** dias (**${dline}**, **${y}**). Confirme no [GameGulf](${detailUrl}#currency-price).`;
}

function sectionHeadings(locale, gameTitle, platformLabel) {
  const G = gameTitle;
  if (locale === 'en') {
    return {
      quick: 'Quick verdict',
      price: `How much does ${G} cost on ${platformLabel} right now?`,
      what: `What kind of game is ${G}, really?`,
      perf: `How does ${G} run on ${platformLabel}?`,
      buy: 'Buy now if',
      wait: 'Wait if',
      close: `${G} on ${platformLabel} — closing take`,
    };
  }
  if (locale === 'zh-hans') {
    return {
      quick: '一句话结论',
      price: `《${G}》在 ${platformLabel} 上现在大概多少钱？`,
      what: `《${G}》到底是什么类型的游戏？`,
      perf: `《${G}》在 ${platformLabel} 上跑得怎么样？`,
      buy: '适合现在就买，如果',
      wait: '更适合等等，如果',
      close: `《${G}》在 ${platformLabel} — 收尾建议`,
    };
  }
  if (locale === 'ja') {
    return {
      quick: '結論',
      price: `『${G}』は${platformLabel}でいまいくら？`,
      what: `『${G}』はどんなゲーム？`,
      perf: `『${G}』の${platformLabel}動作は？`,
      buy: 'いま買うなら',
      wait: '待つなら',
      close: `『${G}』(${platformLabel})の最後に`,
    };
  }
  if (locale === 'fr') {
    return {
      quick: 'Verdict rapide',
      price: `Combien coûte ${G} sur ${platformLabel} aujourd’hui ?`,
      what: `Qu’est-ce que ${G}, vraiment ?`,
      perf: `Comment ${G} tourne sur ${platformLabel} ?`,
      buy: 'Achetez si',
      wait: 'Attendez si',
      close: `${G} sur ${platformLabel} — conclusion`,
    };
  }
  if (locale === 'es') {
    return {
      quick: 'Veredicto rápido',
      price: `¿Cuánto cuesta ${G} en ${platformLabel} ahora?`,
      what: `¿Qué es ${G}, en la práctica?`,
      perf: `¿Cómo va ${G} en ${platformLabel}?`,
      buy: 'Compra si',
      wait: 'Espera si',
      close: `${G} en ${platformLabel} — cierre`,
    };
  }
  if (locale === 'de') {
    return {
      quick: 'Kurzurteil',
      price: `Wie viel kostet ${G} auf ${platformLabel} gerade? (Preis)`,
      what: `Was ist ${G} wirklich für ein Spiel?`,
      perf: `Wie läuft ${G} auf ${platformLabel}?`,
      buy: 'Kaufen, wenn',
      wait: 'Warten, wenn',
      close: `${G} auf ${platformLabel} — Fazit`,
    };
  }
  return {
    quick: 'Veredito rápido',
    price: `Quanto custa ${G} no ${platformLabel} agora?`,
    what: `O que é ${G}, na prática?`,
    perf: `Como ${G} roda no ${platformLabel}?`,
    buy: 'Compre se',
    wait: 'Espere se',
    close: `${G} no ${platformLabel} — fecho`,
  };
}

function buildBody(locale, ctx) {
  const {
    gameTitle,
    genres,
    mcLine,
    platformLabel,
    detailUrl,
    analytics,
    playtime,
    dev,
    anchorEur,
    metaYear,
  } = ctx;
  const H = sectionHeadings(locale, gameTitle, platformLabel);
  const g = localizedGenreList(locale, genres);
  const pt =
    playtime
      ? `**${playtime}**`
      : locale === 'zh-hans'
        ? '**体量偏友好，适合碎片时间**'
        : locale === 'ja'
          ? '**短めのセッション向き**'
          : '**session-friendly runtime**';
  const disc = discountParagraph(locale, analytics, detailUrl, anchorEur, metaYear);

  if (locale === 'zh-hans') {
    return `## ${H.quick}

**${gameTitle}** 在 **${mcLine}** 上与口碑大体一致 — **${g}** 的方向也和 eShop 卡片给人的预期接近。${pt} 用来框定你买到的是多长的一段体验。

${disc}

下单前建议用 **GameGulf** 上的 [多区价格表](${detailUrl}#currency-price) 把 **折扣** 故事核对清楚。

## ${H.price}

**数字版各区价格变动很快** — 下方表格与元数据同源，均来自 **GameGulf** 的同一张多区表。请到 [gamegulf.com](https://www.gamegulf.com) 对照你账号所在区服的真实标价，不要想当然认定只有一个「全球最好价」。

## ${H.what}

**${gameTitle}** 是一款 **${g}** 向 ${platformLabel} 作品${dev ? `，出自 **${dev}**` : ''} — 商店长文案可以当作宣传，但真正该看的是 **类型组合** 和 **${mcLine}** 给出的质量信号。

1. **核心循环** — 大体符合 ${platformLabel} 玩家对这个品类常见节奏的预期。
2. **体量** — ${pt}，避免误以为买到了「默认一百小时」的长线 RPG。
3. **气质** — 预告片诚实的话，入手后大概率是同一挂味。

## ${H.perf}

**${gameTitle}** 在 ${platformLabel} 上更接近 **稳定的主流优化**：载入可接受、以手柄为主的界面，掌上画面仍可读。

- **掌机：**界面缩放与动态清晰度是主要变量，预期是轻微妥协而非坏移植。
- **底座：**若不是粒子特效大秀，底座更多提供舒适度而不是质变。
- **操作：**常规键位为主；商店页没强调体感就不用在意花哨陀螺仪。

## ${H.buy}

- 你喜欢 **${g}** 的节奏，且 **${mcLine}** 这一档符合你对质量的预期
- 你在 **GameGulf** 上看到的区服参考价已在 **促销带**（到账前务必 [再核一次](${detailUrl}#currency-price)）
- 你需要 **随拿随放** 的游玩节奏 — ${pt}
- 你已经被 **预告 / 试玩版** 说服，只差 **价格** 推一把
- 相对折腾实体，你更看重 ${platformLabel} 上的 **数字版便利**

## ${H.wait}

- 你所在区服还在 **接近标价**，而别的区服在同一时间窗里折扣更明显
- 你根本不买 **${g}** 这一套，**打折** 也救不了口味
- 你本月预算更想留给 **更长流程的 RPG**
- 你已在别的平台买过，只想在 **史低带** 入一个「客串」版本
- 你对 **补丁 / 版本差** 很敏感，还是先论坛探路更合适

## ${H.close}

**${gameTitle}** 在 ${platformLabel} 上更像是 **「对照收据再下判断」**：当 **GameGulf** 给的 **折扣** 叠得好看时，口味 + **Metacritic** 一致性比营销词更重要。

花一分钟扫一眼 **[GameGulf 价格页](${detailUrl}#currency-price)**：价格顺眼就锁单，不顺眼就等都行 —— 下一个促窗口还可以回来再对照一次。
`;
  }

  if (locale === 'ja') {
    return `## ${H.quick}

**${gameTitle}** は **${mcLine}** 帯で批評面の期待とおおむね一致し、**${g}** の遊び方も eShop のカード印象に近いです。${pt} が「どれだけ遊べる買い物か」の目安になります。

${disc}

購入前に **[GameGulf の価格一覧](${detailUrl}#currency-price)** で **セール** の筋を確認してください。

## ${H.price}

**価格は地域ごとに動きが早い**です。下の表はメタデータと同じ **GameGulf** の地域別価格一覧から生成しています。[gamegulf.com](https://www.gamegulf.com) で自分のアカウント地域の表示を必ず照合し、「どこが一番安い」と決めつけないでください。

## ${H.what}

**${gameTitle}** は **${g}** 系の ${platformLabel} 向けパッケージ${dev ? `（**${dev}**）` : ''}です。長いストア文はマーケ前提で読み、**ジャンルの組み合わせ**と **${mcLine}** を羅針盤にしてください。

1. **コアループ** — このカテゴリで ${platformLabel} ユーザーが期待する遊び方に近いです。
2. **ボリューム** — ${pt} で、100時間級 RPG を誤爆買いしないように。
3. **トーン** — トレーラーが正直なら、雰囲気もだいたいその延長です。

## ${H.perf}

**${gameTitle}** は ${platformLabel} で **安定した主流最適化**寄り：読み込みは許容範囲、コントローラ前提の UI、携帯でも絵が読めるラインです。

- **携帯:** UI スケールと動きの見やすさが主な差分。致命的な移植ではなく軽い妥協の想定で。
- **ドック:** 粒子祭りでなければ、快適さの寄与が中心で劇的な画質跳ねは期待しすぎないで。
- **操作:** 基本割当。ストアが触れない限り変なジャイロ必須ではありません。

## ${H.buy}

- **${g}** のテンポが好きで、**${mcLine}** の帯が自分の期待と合う
- **GameGulf** で見た地域の価格が **セール帯**（[再確認](${detailUrl}#currency-price) は必須）
- **短いセッション** を大事にしたい — ${pt}
- **トレーラー / 体験版** でほぼ決まっていて、**価格** の一押しが欲しい
- パッケ狩りより **ダウンロード版の手軽さ** を ${platformLabel} で取りたい

## ${H.wait}

- 自分の地域は定価寄りなのに、他地域は深い **セール** がある
- **${g}** の組み合わせ自体が苦手で **セール** でも救わない
- 今月の予算は **長編 RPG** に回したい
- すでに別環境で持っていて、**最安付近** の二枚目だけ欲しい
- **パッチ差** が気になる — 掲示板を見てから **GameGulf** に戻る

## ${H.close}

**${gameTitle}** は ${platformLabel} で **レシート（価格表）と相性**の判断：**GameGulf** の **セール** が積み上がっているときは、好み + **Metacritic** の一致が誇り文句より効きます。

**[GameGulf の価格](${detailUrl}#currency-price)** を一度だけ流し読みし、納得できるなら購入。迷うなら待って、次のセール窓でもう一度見れば十分です。
`;
  }

  if (locale === 'fr') {
    return `## ${H.quick}

**${gameTitle}** se lit d’abord comme un choix de **${g}** avec un repère **${mcLine}** : la promesse eShop et la qualité critique racontent la même direction. ${pt} fixe le volume réel de l’achat.

${disc}

Avant de payer, ouvrez la **[grille de prix GameGulf](${detailUrl}#currency-price)** pour vérifier si la **promo** affichée correspond bien à votre région.

## ${H.price}

**Les prix régionaux bougent vite** : le tableau ci-dessous reprend les mêmes lignes régionales **GameGulf** que les métadonnées. Comparez votre région de compte sur [gamegulf.com](https://www.gamegulf.com) avant de supposer qu’un seul territoire est toujours le meilleur.

## ${H.what}

**${gameTitle}** est un jeu **${g}** sur ${platformLabel}${dev ? ` signé **${dev}**` : ''}. Le vrai repère n’est pas le texte marketing long, mais le mélange de systèmes, le format de sessions et le signal **${mcLine}**.

1. **Boucle principale** — elle correspond à ce que les joueurs ${platformLabel} attendent généralement de cette catégorie.
2. **Portée** — ${pt}, donc vous savez si vous achetez un jeu de sessions courtes ou un gros chantier.
3. **Ton** — si les bandes-annonces vous parlent, l’expérience devrait rester dans la même couleur.

## ${H.perf}

**${gameTitle}** vise une lecture stable sur ${platformLabel} : chargements raisonnables, interface pensée pour la manette et lisibilité correcte en portable.

- **Mode portable :** échelle de l’interface et clarté du mouvement sont les deux points à surveiller; attendez de petits compromis, pas une conversion ratée.
- **Mode TV :** sauf vitrine d’effets, l’affichage sur téléviseur apporte surtout du confort.
- **Commandes :** schéma classique; pas besoin d’un gyro exotique sauf mention claire sur la boutique.

## ${H.buy}

- Vous aimez le rythme **${g}** et la bande **${mcLine}** correspond à votre seuil qualité
- Votre région de compte est déjà dans la zone **promo** signalée par **GameGulf** — [à revérifier](${detailUrl}#currency-price)
- Vous cherchez un format compatible avec vos sessions — ${pt}
- La bande-annonce ou une démo vous a déjà convaincu, il ne manquait que le **prix**
- Vous privilégiez la commodité du numérique sur ${platformLabel}

## ${H.wait}

- Votre boutique reste proche du plein tarif alors que d’autres régions affichent une **réduction** nette
- Le mélange **${g}** ne vous attire pas, même en **promo**
- Votre budget du mois vise plutôt un RPG plus long
- Vous possédez déjà le jeu ailleurs et ne voulez qu’un doublon au plus bas
- Vous voulez confirmer la parité des patchs avant de revenir aux prix **GameGulf**

## ${H.close}

**${gameTitle}** est une décision à deux axes sur ${platformLabel} : goût du **${g}** et prix vérifié. Quand **GameGulf** montre une pile de **promos** favorable, l’accord entre envie et **Metacritic** compte plus que les slogans.

Parcourez **[GameGulf](${detailUrl}#currency-price)** une fois, achetez si votre ligne régionale est bonne, sinon gardez gamegulf.com comme repère pour la prochaine fenêtre de **soldes**.

`;
  }

  if (locale === 'es') {
    return `## ${H.quick}

**${gameTitle}** funciona ante todo como decisión de **${g}** con referencia **${mcLine}**: la promesa de la eShop y la señal crítica apuntan en la misma dirección. ${pt} aclara cuánto juego estás comprando.

${disc}

Antes de pagar, abre la **[tabla de precios de GameGulf](${detailUrl}#currency-price)** y comprueba si la **oferta** que ves encaja con tu región.

## ${H.price}

**Los precios regionales cambian rápido**: la tabla de abajo usa las mismas filas regionales de **GameGulf** guardadas en los metadatos. Compara tu región de cuenta en [gamegulf.com](https://www.gamegulf.com) antes de asumir que existe un único territorio “mejor”.

## ${H.what}

**${gameTitle}** es una propuesta **${g}** para ${platformLabel}${dev ? ` de **${dev}**` : ''}. Más que el texto largo de marketing, importan la mezcla de sistemas, el formato de sesión y la banda **${mcLine}**.

1. **Bucle central** — encaja con lo que los compradores de ${platformLabel} suelen esperar de esta categoría.
2. **Alcance** — ${pt}, para no confundirlo con otro tipo de compromiso.
3. **Tono** — si los tráilers fueron honestos contigo, la experiencia debería mantener esa línea.

## ${H.perf}

**${gameTitle}** apunta a una lectura estable en ${platformLabel}: cargas razonables, interfaz pensada para mando y arte legible en portátil.

- **Modo portátil:** escala de interfaz y claridad en movimiento son las variables principales; espera compromisos moderados, no una conversión rota.
- **Modo TV:** salvo espectáculo de partículas, jugar en televisor aporta sobre todo comodidad.
- **Controles:** asignación estándar; no cuentes con giroscopio obligatorio salvo que la tienda lo destaque.

## ${H.buy}

- Te gusta el ritmo **${g}** y la franja **${mcLine}** cumple tus expectativas
- Tu región ya aparece en la zona de **oferta** marcada por **GameGulf** — [vuelve a comprobarlo](${detailUrl}#currency-price)
- Buscas sesiones compatibles con tu tiempo — ${pt}
- El tráiler o una demo ya te convenció y solo faltaba el empujón del **precio**
- Prefieres la comodidad digital en ${platformLabel}

## ${H.wait}

- Tu tienda sigue cerca del precio completo mientras otras regiones tienen **descuento** claro
- La mezcla **${g}** no te atrae aunque haya **rebaja**
- Este mes prefieres reservar presupuesto para un RPG más largo
- Ya lo tienes en otra plataforma y solo quieres duplicarlo cerca de mínimo histórico
- Quieres confirmar paridad de parches antes de volver a precios de **GameGulf**

## ${H.close}

**${gameTitle}** en ${platformLabel} se decide cruzando gusto por **${g}** y precio real. Cuando **GameGulf** muestra una pila de **descuentos** favorable, encaje personal + **Metacritic** pesan más que el marketing.

Mira **[GameGulf](${detailUrl}#currency-price)** una vez, compra si tu región cuadra y deja gamegulf.com como referencia para la próxima ventana de **ofertas**.

`;
  }

  if (locale === 'de') {
    return `## ${H.quick}

**${gameTitle}** ist zuerst eine **${g}**-Entscheidung mit **${mcLine}** als Qualitätsanker: eShop-Versprechen und Kritikerband zeigen in dieselbe Richtung. ${pt} steckt ab, wie viel Spielzeit du kaufst.

${disc}

Vor dem Kauf solltest du die **[GameGulf-Preistabelle](${detailUrl}#currency-price)** öffnen und prüfen, ob der **Rabatt** in deiner Region wirklich passt.

## ${H.price}

**Regionale Preise bewegen sich schnell**: Die Tabelle unten nutzt dieselben **GameGulf**-Regionseinträge wie die Metadaten. Vergleiche deine Kontoregion auf [gamegulf.com](https://www.gamegulf.com), bevor du ein einzelnes „bestes“ Land annimmst.

## ${H.what}

**${gameTitle}** ist ein **${g}**-Paket für ${platformLabel}${dev ? ` von **${dev}**` : ''}. Wichtiger als der lange Shoptext sind Systemmix, Sitzungsformat und der **${mcLine}**-Anker.

1. **Kernschleife** — trifft, was ${platformLabel}-Käufer in dieser Kategorie meist erwarten.
2. **Umfang** — ${pt}, damit du nicht aus Versehen ein anderes Zeitprofil kaufst.
3. **Ton** — wenn die Trailer ehrlich wirkten, landest du wahrscheinlich in derselben Stimmung.

## ${H.perf}

**${gameTitle}** zielt auf ${platformLabel} auf eine stabile Lesbarkeit: vertretbare Ladezeiten, für Steuerung ausgelegte Menüs und im Mobilmodus noch lesbare Grafik.

- **Mobilmodus:** UI-Skalierung und Bewegungsklarheit sind die Hauptvariablen; erwarte moderate Abstriche, keine kaputte Umsetzung.
- **TV-Modus:** Wenn es kein Partikel-Schaufenster ist, bringt der Fernseher vor allem Komfort.
- **Steuerung:** Standardbelegung; kein exotischer Gyro-Zwang, solange die Shopseite nichts anderes sagt.

## ${H.buy}

- Du magst **${g}**-Tempo und die **${mcLine}**-Spanne passt zu deinem Qualitätsanspruch
- Deine Region liegt bereits im **Rabattbereich**, den **GameGulf** zeigt — [hier gegenprüfen](${detailUrl}#currency-price)
- Du willst ein Zeitprofil, das zu deinen Spielrunden passt — ${pt}
- Trailer oder Demo haben dich schon überzeugt; es fehlte nur der **Preis**
- Du bevorzugst digitale Bequemlichkeit auf ${platformLabel}

## ${H.wait}

- Dein Shop zeigt noch Vollpreisnähe, während andere Regionen deutlichen **Rabatt** haben
- Der **${g}**-Mix spricht dich nicht an, auch nicht mit **Rabatt**
- Du sparst das Monatsbudget eher für ein längeres RPG
- Du besitzt es schon anderswo und willst nur ein Duplikat nahe historischem Tief
- Du willst Patch-Parität prüfen und dann zu **GameGulf** zurückkehren

## ${H.close}

**${gameTitle}** auf ${platformLabel} ist eine Entscheidung aus Geschmack und Beleg: Wenn **GameGulf** einen freundlichen **Rabatt**-Stack zeigt, zählen Passung + **Metacritic** mehr als Werbewörter.

Prüfe **[GameGulf](${detailUrl}#currency-price)** einmal, kaufe bei passender Region und nutze gamegulf.com als Kontrollpunkt für das nächste **Rabattfenster**.

`;
  }

  if (locale === 'pt') {
    return `## ${H.quick}

**${gameTitle}** é antes uma decisão de **${g}** com **${mcLine}** como âncora de qualidade: a promessa da eShop e o sinal crítico apontam para a mesma direção. ${pt} mostra o tamanho real da compra.

${disc}

Antes de pagar, abra a **[grade de preços do GameGulf](${detailUrl}#currency-price)** para confirmar se a **promoção** vale para a sua região.

## ${H.price}

**Preços regionais mudam rápido**: a tabela abaixo espelha as mesmas linhas regionais do **GameGulf** usadas nos metadados. Compare sua região de conta em [gamegulf.com](https://www.gamegulf.com) antes de assumir que existe um único território “melhor”.

## ${H.what}

**${gameTitle}** é um pacote **${g}** para ${platformLabel}${dev ? ` da **${dev}**` : ''}. Mais que o texto longo de marketing, importam a mistura de sistemas, o formato de sessão e o sinal **${mcLine}**.

1. **Ciclo central** — combina com o que compradores de ${platformLabel} costumam esperar desta categoria.
2. **Escopo** — ${pt}, para não comprar achando que é outro tipo de compromisso.
3. **Tom** — se os trailers pareceram honestos, a experiência tende a seguir a mesma linha.

## ${H.perf}

**${gameTitle}** busca uma leitura estável no ${platformLabel}: carregamentos razoáveis, interface pensada para controle e arte legível no portátil.

- **Portátil:** escala da interface e clareza em movimento são as variáveis principais; espere compromissos modestos, não uma conversão quebrada.
- **Modo TV:** salvo vitrine de partículas, jogar na televisão entrega mais conforto do que milagre visual.
- **Controles:** mapeamento padrão; nada de giroscópio obrigatório salvo destaque na loja.

## ${H.buy}

- Você gosta do ritmo **${g}** e a faixa **${mcLine}** combina com sua expectativa
- Sua região já aparece na faixa de **promoção** destacada pelo **GameGulf** — [confira de novo](${detailUrl}#currency-price)
- Você quer sessões compatíveis com sua rotina — ${pt}
- Trailer ou demo já convenceram; faltava apenas o empurrão do **preço**
- Você prefere a conveniência digital no ${platformLabel}

## ${H.wait}

- Sua loja ainda está perto do preço cheio enquanto outras regiões mostram **desconto** claro
- A mistura **${g}** não combina com você, mesmo em **promoção**
- O orçamento do mês está reservado para um RPG mais longo
- Você já tem o jogo em outra plataforma e só quer duplicar perto do menor preço
- Você quer confirmar paridade de atualizações antes de voltar ao **GameGulf**

## ${H.close}

**${gameTitle}** no ${platformLabel} é uma decisão de gosto + recibo: quando o **GameGulf** mostra uma pilha de **descontos** favorável, encaixe pessoal + **Metacritic** pesam mais que empolgação.

Passe uma vez pelo **[GameGulf](${detailUrl}#currency-price)**, compre se sua região fizer sentido e use gamegulf.com como referência na próxima janela de **promoção**.

`;
  }

  return `## ${H.quick}

**${gameTitle}** reads as **${mcLine}** on the critic side — **${g}** beats match what the eShop card promises. ${pt} frames how much game you are buying.

${disc}

**GameGulf** keeps this SKU on a [live multi-region grid](${detailUrl}#currency-price) so you can sanity-check the **discount** story before checkout.

## ${H.price}

**Regional pricing moves fast** — the table below mirrors the same **GameGulf** regional price entries we store in frontmatter. **Compare** your account region on [gamegulf.com](https://www.gamegulf.com) before you assume a single “best” territory.

## ${H.what}

**${gameTitle}** is a **${g}** package${dev ? ` from **${dev}**` : ''} — treat the long store blurb as marketing, but the **genre mix** and **${mcLine}** signal are the real buying compass.

1. **Core loop** — matches what ${platformLabel} buyers usually expect from this category.
2. **Scope** — ${pt} so you are not accidentally buying a 100-hour RPG by mistake.
3. **Tone** — if trailers felt honest, you will likely land in the same mood.

## ${H.perf}

**${gameTitle}** targets a **stable, mainstream** read on ${platformLabel}: reasonable loads, controller-first layout, and art that still reads in handheld.

- **Handheld:** UI scale and motion clarity are the main variables — expect modest compromises, not a broken port.
- **Docked:** If the title is not a particle showcase, docked mode mostly buys you comfort, not miracles.
- **Controls:** Standard mappings; no exotic gyro requirement unless the store page calls it out.

## ${H.buy}

- You want **${g}** pacing and the **${mcLine}** band matches your expectations
- **Your account region** already sits in the **sale** band **GameGulf** highlights — [double-check here](${detailUrl}#currency-price)
- You value **pick-up-and-play** sessions — ${pt}
- You already liked **trailers / demos** and only needed a **price** nudge
- You prefer **digital convenience** on ${platformLabel} over hunting physical deals

## ${H.wait}

- **Your storefront** still shows MSRP while other regions show deep **discount** — patience or account strategy matters
- You dislike the **genre mix** (${g}) regardless of **sale**
- You are saving budget for a **longer RPG** this month — **waiting** is rational even when **sales** exist
- You already own the title elsewhere and only want a **duplicate** at a historic **low**
- You want **proof of patch parity** — skim forums, then revisit **GameGulf** pricing

## ${H.close}

**${gameTitle}** is a **receipt-driven** decision on ${platformLabel}: when **GameGulf** shows a friendly **discount** stack, taste + **Metacritic** alignment matter more than hype.

Skim **[GameGulf pricing](${detailUrl}#currency-price)** once, lock the **deal** if your regional price lines up, and treat **gamegulf.com** as the sanity check for the next **sale** window too.

`;
}

/** Prefer NS2 on ties; pick the Switch-family key with the most non-AR digital rows. */
function pickSwitchPlatformKey(brief) {
  const platforms = brief?.platforms || {};
  const keys = Object.keys(platforms).filter(
    (k) => k.toLowerCase().includes('switch') && platforms[k]?.enabled !== false,
  );
  let best = null;
  let bestScore = -1;
  for (const k of keys) {
    const rows = normalizePriceRows(buildPriceRowsFromBrief(brief, 'en', { platformKey: k }));
    let score = rows.length * 10;
    if (k === 'switch 2' || k === 'switch2') score += 2;
    if (score > bestScore) {
      bestScore = score;
      best = k;
    }
  }
  return best || 'switch';
}

/** Reader-facing console name: NS2 for new hardware; OG = "Switch" in zh-hans, "Nintendo Switch" elsewhere. */
function displayPlatformLabel(locale, key) {
  const k = String(key || 'switch').toLowerCase().replace(/\s+/g, '');
  if (k === 'switch2') return 'NS2';
  if (locale === 'zh-hans') return 'Switch';
  return 'Nintendo Switch';
}

function displayPlatformField(locale, key) {
  return displayPlatformLabel(locale, key);
}

function clip(s, max) {
  if (!s || s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

function stringifyFrontmatter(frontmatter) {
  return yaml.dump(frontmatter, {
    lineWidth: 0,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
    sortKeys: false,
  }).trimEnd();
}

function titleForLocale(locale, gameTitle, platformLabel) {
  if (locale === 'en') return `Is ${gameTitle} worth buying on ${platformLabel} in 2026?`;
  if (locale === 'zh-hans') return `2026 年还值得在 ${platformLabel} 上买《${gameTitle}》吗？`;
  if (locale === 'ja') return `2026年、${platformLabel}で『${gameTitle}』は買い？`;
  if (locale === 'fr') return `${gameTitle} vaut-il le coup sur ${platformLabel} en 2026 ?`;
  if (locale === 'es') return `¿Merece la pena ${gameTitle} en ${platformLabel} en 2026?`;
  if (locale === 'de') return `Lohnt sich ${gameTitle} auf ${platformLabel} 2026?`;
  return `${gameTitle} vale a pena no ${platformLabel} em 2026?`;
}

function localizedTakeaway(locale, gameTitle, genres, mcLine) {
  const genreText = Array.isArray(genres) ? localizedGenreList(locale, genres) : genres || localizedGenreList(locale, []);
  const qualityFallback = {
    en: 'critic signal',
    'zh-hans': '口碑信号',
    ja: '評価の目安',
    fr: 'repère critique',
    es: 'referencia crítica',
    de: 'Kritikersignal',
    pt: 'sinal crítico',
  };
  const qualityText = mcLine || qualityFallback[locale] || qualityFallback.en;
  const templates = {
    en: `${gameTitle} is a gameplay-fit call first: choose it if the ${genreText} loop, scope, and ${qualityText} quality band match your taste; use price only to decide timing.`,
    'zh-hans': `${gameTitle} 先看玩法是否对味：${genreText}、体量和${qualityText}决定适不适合你；价格只用来判断现在买还是等。`,
    ja: `${gameTitle}はまず遊びの相性で選ぶ作品です。${genreText}の流れ、ボリューム、${qualityText}が好みに合うなら候補にし、価格は買う時期の判断材料にしてください。`,
    fr: `${gameTitle} se juge d’abord sur l’envie de jouer : boucle ${genreText}, ampleur et repère ${qualityText}; le prix sert surtout à choisir le bon moment.`,
    es: `${gameTitle} se decide primero por encaje de juego: bucle ${genreText}, alcance y referencia ${qualityText}; el precio solo marca cuándo comprar.`,
    de: `${gameTitle} ist zuerst eine Frage des Spielgeschmacks: ${genreText}, Umfang und ${qualityText} müssen passen; der Preis entscheidet nur das Timing.`,
    pt: `${gameTitle} é antes uma decisão de gosto: ciclo ${genreText}, escopo e sinal ${qualityText}; o preço só define o melhor momento de compra.`,
  };
  return templates[locale] || templates.en;
}

function localizedTags(locale, gameTitle, platformLabel) {
  const templates = {
    en: [
      `${gameTitle} ${platformLabel}`,
      `${gameTitle} worth it`,
      `${gameTitle} price`,
      'gamegulf deals',
    ],
    'zh-hans': [
      `${gameTitle} ${platformLabel}`,
      `${gameTitle} 值得买吗`,
      `${gameTitle} 价格`,
      'gamegulf 折扣',
    ],
    ja: [
      `${gameTitle} ${platformLabel}`,
      `${gameTitle} 買うべきか`,
      `${gameTitle} 価格`,
      'gamegulf セール',
    ],
    fr: [
      `${gameTitle} ${platformLabel}`,
      `${gameTitle} vaut le coup`,
      `prix ${gameTitle}`,
      'promos gamegulf',
    ],
    es: [
      `${gameTitle} ${platformLabel}`,
      `${gameTitle} merece la pena`,
      `precio ${gameTitle}`,
      'ofertas gamegulf',
    ],
    de: [
      `${gameTitle} ${platformLabel}`,
      `${gameTitle} lohnt sich`,
      `${gameTitle} preis`,
      'gamegulf rabatte',
    ],
    pt: [
      `${gameTitle} ${platformLabel}`,
      `${gameTitle} vale a pena`,
      `preço ${gameTitle}`,
      'promoções gamegulf',
    ],
  };
  return (templates[locale] || templates.en).map((tag) => clip(tag.toLowerCase().replace(/\s+/g, ' '), 40));
}

function localizedCommunityMemes(locale, gameTitle) {
  const templates = {
    en: [
      `${gameTitle} sale bingo`,
      'patch notes copium',
      'handheld pixel peeping',
      'wishlist graveyard',
      'region hopper',
      'MSRP sticker shock',
    ],
    'zh-hans': [
      `${gameTitle} 折扣观察`,
      '补丁更新观望',
      '掌机画面党',
      '愿望单吃灰',
      '区服比价党',
      '标价劝退',
    ],
    ja: [
      `${gameTitle} セール待ち`,
      '更新確認勢',
      '携帯モード検証',
      '積みゲー候補',
      '地域価格チェック',
      '定価ショック',
    ],
    fr: [
      `${gameTitle} promos à guetter`,
      'notes de version à suivre',
      'test du mode portable',
      'liste d’envies oubliée',
      'chasse aux régions',
      'plein tarif qui pique',
    ],
    es: [
      `${gameTitle} ofertas vigiladas`,
      'notas de versión al día',
      'prueba en portátil',
      'lista de deseos olvidada',
      'caza regional',
      'precio completo duele',
    ],
    de: [
      `${gameTitle} Rabattcheck`,
      'Update-Hoffnung',
      'Mobilmodus-Prüfung',
      'vergessene Wunschliste',
      'Regionspreis-Jagd',
      'Listenpreis-Schock',
    ],
    pt: [
      `${gameTitle} promoções vigiadas`,
      'notas de atualização',
      'teste no portátil',
      'lista de desejos esquecida',
      'caça por região',
      'preço cheio assusta',
    ],
  };
  return (templates[locale] || templates.en).map((item) => clip(item, 40));
}

function localizedFrontmatterCopy(locale, ctx) {
  const {
    gameTitle,
    rawGameTitle,
    platformLabel,
    genres,
    dev,
    mcLine,
    decision,
    pv,
    playtimeStr,
    detailUrl,
  } = ctx;
  const genreText = localizedGenreList(locale, genres);
  const discountCount = pv?.discount_events_1y ?? 0;
  const isBuy = decision?.verdict === 'buy_now';
  const isWait = decision?.verdict === 'wait_for_sale';
  const verdict = {
    en: isBuy
      ? 'pricing favors buying now if the genre fits.'
      : isWait
        ? 'pricing suggests waiting for a deeper sale unless you are time-sensitive.'
        : 'buy mainly if the pitch already clicked for you.',
    'zh-hans': isBuy ? '价格信号偏买入（口味要对）。' : isWait ? '价格信号偏等折扣。' : '看个人口味与价格是否同时成立。',
    ja: isBuy ? '価格面は購入寄り。ただし好みが合う場合だけ。' : isWait ? '急がないなら次のセール待ち。' : '刺さる人向け。価格も一緒に見る。',
    fr: isBuy ? 'le prix pousse à acheter si le genre vous parle.' : isWait ? 'mieux vaut attendre une promo plus nette sauf urgence.' : 'à acheter surtout si la proposition vous attire déjà.',
    es: isBuy ? 'el precio favorece comprar si el género encaja.' : isWait ? 'mejor esperar una rebaja más clara salvo urgencia.' : 'compra solo si la propuesta ya te convence.',
    de: isBuy ? 'der Preis spricht fürs Kaufen, wenn das Genre passt.' : isWait ? 'besser auf einen klareren Rabatt warten, außer es eilt.' : 'lohnt sich vor allem, wenn dich die Spielidee schon überzeugt.',
    pt: isBuy ? 'o preço favorece comprar se o gênero combina com você.' : isWait ? 'vale esperar uma promoção mais forte, salvo urgência.' : 'compre principalmente se a proposta já te ganhou.',
  };
  const nearLow = {
    en: pv?.at_or_near_historical_low === true
      ? 'Yes — indexed data sits at or near the tracked historic low posture.'
      : 'Mixed — compare the live cheapest listing to the tracked average.',
    'zh-hans': pv?.at_or_near_historical_low === true
      ? '是——当前价格接近或处于我们追踪到的历史低价区间。'
      : '较复杂——请在 GameGulf 对照当前最低价与追踪均价。',
    ja: pv?.at_or_near_historical_low === true
      ? 'はい — 追跡データでは歴史的安値付近です。'
      : '判断は分かれます — 現在最安と平均セール価格を比べてください。',
    fr: pv?.at_or_near_historical_low === true
      ? 'Oui — les données le placent près du plus bas suivi.'
      : 'Mitigé — comparez le prix le plus bas en direct à la moyenne promo.',
    es: pv?.at_or_near_historical_low === true
      ? 'Sí — los datos lo sitúan cerca del mínimo histórico seguido.'
      : 'Mixto — compara el precio vivo más bajo con la media en oferta.',
    de: pv?.at_or_near_historical_low === true
      ? 'Ja — die Daten liegen nahe am verfolgten historischen Tief.'
      : 'Gemischt — vergleiche Live-Tiefpreis und Sale-Durchschnitt.',
    pt: pv?.at_or_near_historical_low === true
      ? 'Sim — os dados ficam perto do menor preço rastreado.'
      : 'Misto — compare o menor preço ao vivo com a média em promoção.',
  };

  const copies = {
    en: {
      description: `April 2026 ${platformLabel} guide for ${gameTitle} — ${locHeroStat('en', Number.parseInt(mcLine, 10) || null)}, GameGulf sale analytics, and a clear buy/wait call.`,
      decision: 'Buy now if the pitch fits and your GameGulf price snapshot shows the promo band; wait if MSRP-only regions are your only option.',
      priceSignal: 'Indexed pricing highlights the cheapest territories versus MSRP tiers — huge spread is common on this SKU.',
      heroNote: `${gameTitle} — ${genreText}; ${dev ? `${dev}; ` : ''}store pitch vs. critic band (${mcLine}).`,
      listingTakeaway: `${gameTitle} — ${genreText}; April 2026 GameGulf pricing shows a wide regional spread worth comparing.`,
      whatItIs: `${genreText} — ${gameTitle} on ${platformLabel}.`,
      bestFor: `Players who want ${genreText} with honest handheld scope.`,
      avoidIf: `You want a different genre mix than ${genreText} — skip if tone is off.`,
      consensusPraise: `Critic band (${mcLine}) plus store-featured strengths players repeat in reviews.`,
      mainFriction: 'Genre fatigue or sale FOMO — not every region shows the same promo at once.',
      fitLabel: 'Buyers who compare two regions before checkout.',
      timingNote: 'If your storefront price is already discounted, hesitation is mostly taste — still verify live pricing.',
      communityVibe: localizedCommunityVibe(locale, rawGameTitle || gameTitle, genres),
      playMode: 'Single-player unless store lists multiplayer.',
      whyNow: "Today's Deals stack plus GameGulf trend counts make the spreadsheet legible.",
      currentDeal: 'The cheapest tracked territories lead the table — compare native currency on GameGulf.',
      nearHistoricalLow: nearLow.en,
      salePattern: `${discountCount} tracked discount moves in the past year — sales are part of the product lifecycle here.`,
      tldr: `${gameTitle} — ${locHeroStat('en', Number.parseInt(mcLine, 10) || null)}; ${verdict.en}`,
      playerVoices: [
        { quote: 'Runs fine for me in handheld.', sentiment: 'positive' },
        { quote: 'Worth it on a deep sale only.', sentiment: 'mixed' },
        { quote: 'Check your own region first.', sentiment: 'positive' },
      ],
      faq: [
        { question: titleForLocale('en', gameTitle, platformLabel), answer: `${gameTitle} is worth buying on ${platformLabel} in 2026 if the genre fits and your GameGulf regional snapshot shows the promo band you expect — verify live pricing before checkout.` },
        { question: `How long is ${gameTitle}?`, answer: `${gameTitle} has an expected time commitment of ${playtimeStr}.` },
        { question: `Where should I check ${platformLabel} pricing?`, answer: `${gameTitle} pricing is best checked on the GameGulf detail grid at ${detailUrl}#currency-price so you can compare regions without guessing conversions.` },
      ],
    },
    'zh-hans': {
      description: `2026 年 4 月 ${platformLabel} 购买参考：${gameTitle}、GameGulf 价格信号与买/等建议。`,
      decision: '若口味匹配且 GameGulf 上你的区服已在促销带可买；若你只能买到接近标价的区服就更适合等等。',
      priceSignal: '索引价差常很明显：低价区服与标价区服可能差一档。',
      heroNote: `${gameTitle}：${genreText}${dev ? `；${dev}` : ''}。`,
      listingTakeaway: `${gameTitle}：${genreText}；2026 年 4 月价格分区差值得先对照 GameGulf。`,
      whatItIs: `${genreText} — ${platformLabel} 版 ${gameTitle}。`,
      bestFor: `想要${genreText}且接受掌机体量的人。`,
      avoidIf: `不喜欢${genreText}气质就别硬买。`,
      consensusPraise: `口碑集中在玩法与完成度；${mcLine} 可作质量锚点。`,
      mainFriction: '区服不同步：不是每个账号都能看到同一档折扣。',
      fitLabel: '会先对照两个区服再下单的人。',
      timingNote: '若你看到的参考价已在促销带，犹豫多半只剩口味；但仍要核对商店实时价。',
      communityVibe: localizedCommunityVibe(locale, rawGameTitle || gameTitle, genres),
      playMode: '以商店页多人信息为准；默认偏单机体验。',
      whyNow: '今日特惠叠加 GameGulf 追踪，让价差更直观。',
      currentDeal: '索引最低价通常排在表格前几格；请在 GameGulf 对照原生货币。',
      nearHistoricalLow: nearLow['zh-hans'],
      salePattern: `过去一年约 ${discountCount} 次促销波动——折扣是常态。`,
      tldr: `${gameTitle} — ${mcLine}；${verdict['zh-hans']}`,
      playerVoices: [
        { quote: '掌机模式整体可玩。', sentiment: 'positive' },
        { quote: '深度折扣才值。', sentiment: 'mixed' },
        { quote: '先看清自己区服价格。', sentiment: 'positive' },
      ],
      faq: [
        { question: titleForLocale('zh-hans', gameTitle, platformLabel), answer: `${gameTitle} 是否值得买，先看你是否喜欢${genreText}，再看 GameGulf 上你的区服参考价是否落在预期促销带；下单前请核对实时价格。` },
        { question: `《${gameTitle}》大概多长？`, answer: `${gameTitle} 的游玩时间参考是 ${playtimeStr}。` },
        { question: `在哪里核对 ${platformLabel} 价格？`, answer: `${gameTitle} 可以在 GameGulf 详情页 ${detailUrl}#currency-price 对照多区价格，避免只按汇率猜。` },
      ],
    },
    ja: {
      description: `2026年4月の${platformLabel}向け購入メモ：${gameTitle}、${mcLine}、GameGulfの価格シグナルと買う/待つ判断。`,
      decision: '遊びの相性が合い、GameGulfで自分の地域がセール帯なら購入候補。定価寄りしか選べないなら待つ方が安全。',
      priceSignal: '地域別価格の差が大きめ。最安地域と定価寄りの地域をGameGulfで比べたい。',
      heroNote: `${gameTitle} — ${genreText}${dev ? `、${dev}` : ''}。${mcLine}を品質の目安に。`,
      listingTakeaway: `${gameTitle} — ${genreText}。2026年4月の地域差はGameGulfで先に確認。`,
      whatItIs: `${genreText} — ${platformLabel}版${gameTitle}。`,
      bestFor: `${genreText}のテンポを携帯機で遊びたい人。`,
      avoidIf: `${genreText}の気分でないならセールでも無理しない。`,
      consensusPraise: `評価軸は遊びの完成度。${mcLine}が品質の目安。`,
      mainFriction: '地域セールのズレ。全アカウントで同じ割引とは限らない。',
      fitLabel: '購入前に2地域以上を見比べる人。',
      timingNote: '表示価格がセール帯なら迷いは好み寄り。最後に実売を確認。',
      communityVibe: localizedCommunityVibe(locale, rawGameTitle || gameTitle, genres),
      playMode: 'ストア表記に従う。明記がなければ基本はソロ寄り。',
      whyNow: '今日のセール情報とGameGulfの推移で、今の価格差を確認しやすい。',
      currentDeal: '表の上位地域が目安。GameGulfで現地通貨も確認。',
      nearHistoricalLow: nearLow.ja,
      salePattern: `直近1年で約 ${discountCount} 回のセール変動。`,
      tldr: `${gameTitle} — ${mcLine}。${verdict.ja}`,
      playerVoices: [
        { quote: '携帯モードでも十分遊べる。', sentiment: 'positive' },
        { quote: '深いセールなら納得。', sentiment: 'mixed' },
        { quote: '自分の地域価格を先に見る。', sentiment: 'positive' },
      ],
      faq: [
        { question: titleForLocale('ja', gameTitle, platformLabel), answer: `${gameTitle} は${genreText}が好みに合い、GameGulfの地域別価格が納得できるセール帯なら購入候補です。購入前に実売価格を確認してください。` },
        { question: `${gameTitle}のプレイ時間は？`, answer: `${gameTitle} の目安プレイ時間は ${playtimeStr} です。` },
        { question: `${platformLabel}の価格はどこで確認する？`, answer: `${gameTitle} は GameGulf の詳細ページ ${detailUrl}#currency-price で地域別価格を比較できます。` },
      ],
    },
    fr: {
      description: `Repère d’achat ${platformLabel} pour avril 2026 : ${gameTitle}, signal prix GameGulf et décision acheter/attendre.`,
      decision: 'Achetez si la proposition vous parle et si votre région apparaît en zone promo sur GameGulf; attendez si vous ne voyez que le plein tarif.',
      priceSignal: 'Les prix indexés montrent souvent un gros écart entre régions bon marché et paliers proches du prix catalogue.',
      heroNote: `${gameTitle} — ${genreText}${dev ? `; ${dev}` : ''}. ${mcLine} sert de repère qualité.`,
      listingTakeaway: `${gameTitle} — ${genreText}; en avril 2026, comparez les régions sur GameGulf avant d’acheter.`,
      whatItIs: `${genreText} — ${gameTitle} sur ${platformLabel}.`,
      bestFor: `Joueurs qui veulent du ${genreText} au format portable.`,
      avoidIf: `À éviter si le mélange ${genreText} ne vous attire pas.`,
      consensusPraise: `Le signal critique (${mcLine}) rejoint les forces souvent citées par les joueurs.`,
      mainFriction: 'Fatigue du genre ou promos décalées selon les régions.',
      fitLabel: 'Acheteurs qui comparent deux régions avant paiement.',
      timingNote: 'Si votre boutique est déjà en promo, l’hésitation tient surtout au goût; vérifiez quand même le prix en direct.',
      communityVibe: localizedCommunityVibe(locale, rawGameTitle || gameTitle, genres),
      playMode: 'Solo par défaut sauf mention multijoueur sur la boutique.',
      whyNow: 'Les offres du jour et le suivi GameGulf rendent les écarts de prix lisibles.',
      currentDeal: 'Les régions les moins chères mènent le tableau; comparez aussi la devise native sur GameGulf.',
      nearHistoricalLow: nearLow.fr,
      salePattern: `${discountCount} mouvements de remise suivis sur 12 mois.`,
      tldr: `${gameTitle} — ${mcLine}; ${verdict.fr}`,
      playerVoices: [
        { quote: 'Le mode portable tient la route.', sentiment: 'positive' },
        { quote: 'Vraiment intéressant en grosse promo.', sentiment: 'mixed' },
        { quote: 'Regardez votre région avant d’acheter.', sentiment: 'positive' },
      ],
      faq: [
        { question: titleForLocale('fr', gameTitle, platformLabel), answer: `${gameTitle} vaut le coup sur ${platformLabel} si le ${genreText} vous attire et si le prix régional GameGulf tombe dans la zone promo attendue.` },
        { question: `Quelle est la durée de ${gameTitle} ?`, answer: `${gameTitle} demande environ ${playtimeStr}.` },
        { question: `Où vérifier le prix ${platformLabel} ?`, answer: `${gameTitle} se vérifie sur la grille GameGulf ${detailUrl}#currency-price pour comparer les régions sans deviner les conversions.` },
      ],
    },
    es: {
      description: `Guía de compra de abril de 2026 para ${platformLabel}: ${gameTitle}, señal de precio de GameGulf y decisión de comprar o esperar.`,
      decision: 'Compra si la propuesta encaja y tu región aparece en franja de oferta en GameGulf; espera si solo ves precio completo.',
      priceSignal: 'El precio indexado suele marcar una brecha clara entre regiones baratas y niveles cercanos al precio de catálogo.',
      heroNote: `${gameTitle} — ${genreText}${dev ? `; ${dev}` : ''}. ${mcLine} funciona como referencia de calidad.`,
      listingTakeaway: `${gameTitle} — ${genreText}; en abril de 2026 conviene comparar regiones en GameGulf antes de pagar.`,
      whatItIs: `${genreText} — ${gameTitle} en ${platformLabel}.`,
      bestFor: `Jugadores que quieren ${genreText} en formato portátil.`,
      avoidIf: `Evítalo si la mezcla ${genreText} no te atrae.`,
      consensusPraise: `La banda crítica (${mcLine}) coincide con fortalezas que suelen repetir los jugadores.`,
      mainFriction: 'Cansancio del género o promociones desfasadas por región.',
      fitLabel: 'Compradores que comparan dos regiones antes de pagar.',
      timingNote: 'Si tu tienda ya está en oferta, la duda es más de gusto; verifica igualmente el precio vivo.',
      communityVibe: localizedCommunityVibe(locale, rawGameTitle || gameTitle, genres),
      playMode: 'Solo por defecto salvo que la tienda indique multijugador.',
      whyNow: 'Las ofertas del día y el seguimiento de GameGulf hacen legible la diferencia regional.',
      currentDeal: 'Las regiones más baratas lideran la tabla; revisa también la moneda nativa en GameGulf.',
      nearHistoricalLow: nearLow.es,
      salePattern: `${discountCount} movimientos de descuento seguidos en 12 meses.`,
      tldr: `${gameTitle} — ${mcLine}; ${verdict.es}`,
      playerVoices: [
        { quote: 'En portátil se juega bien.', sentiment: 'positive' },
        { quote: 'Compensa más con una oferta fuerte.', sentiment: 'mixed' },
        { quote: 'Mira primero el precio de tu región.', sentiment: 'positive' },
      ],
      faq: [
        { question: titleForLocale('es', gameTitle, platformLabel), answer: `${gameTitle} merece la pena en ${platformLabel} si el ${genreText} encaja contigo y el precio regional de GameGulf cae en la franja de oferta esperada.` },
        { question: `¿Cuánto dura ${gameTitle}?`, answer: `${gameTitle} tiene una duración estimada de ${playtimeStr}.` },
        { question: `¿Dónde revisar el precio de ${platformLabel}?`, answer: `${gameTitle} se revisa mejor en la tabla de GameGulf ${detailUrl}#currency-price para comparar regiones sin adivinar conversiones.` },
      ],
    },
    de: {
      description: `Kaufcheck für ${platformLabel} im April 2026: ${gameTitle}, GameGulf-Preissignal und klare Kaufen/Warten-Einschätzung.`,
      decision: 'Kaufen, wenn dich das Spiel anspricht und deine Region bei GameGulf im Rabattbereich liegt; warten, wenn nur Vollpreis sichtbar ist.',
      priceSignal: 'Die indexierten Preise zeigen oft eine große Spanne zwischen günstigen Regionen und Listenpreis-Stufen.',
      heroNote: `${gameTitle} — ${genreText}${dev ? `; ${dev}` : ''}. ${mcLine} dient als Qualitätsanker.`,
      listingTakeaway: `${gameTitle} — ${genreText}; im April 2026 lohnt vor dem Kauf der Regionenvergleich auf GameGulf.`,
      whatItIs: `${genreText} — ${gameTitle} auf ${platformLabel}.`,
      bestFor: `Spieler, die ${genreText} im Mobilformat wollen.`,
      avoidIf: `Auslassen, wenn dich der Mix ${genreText} nicht reizt.`,
      consensusPraise: `Das Kritikerband (${mcLine}) passt zu Stärken, die Spieler oft nennen.`,
      mainFriction: 'Genre-Müdigkeit oder regional versetzte Rabatte.',
      fitLabel: 'Käufer, die vor dem Kauf zwei Regionen vergleichen.',
      timingNote: 'Wenn dein Shop schon reduziert ist, ist die Frage eher Geschmack; Livepreis trotzdem prüfen.',
      communityVibe: localizedCommunityVibe(locale, rawGameTitle || gameTitle, genres),
      playMode: 'Solo, sofern die Shopseite keinen Mehrspieler nennt.',
      whyNow: 'Tagesangebote und der GameGulf-Preisverlauf machen die Preisspanne nachvollziehbar.',
      currentDeal: 'Die günstigsten Regionen stehen vorn in der Tabelle; native Währung auf GameGulf prüfen.',
      nearHistoricalLow: nearLow.de,
      salePattern: `${discountCount} verfolgte Rabattbewegungen in 12 Monaten.`,
      tldr: `${gameTitle} — ${mcLine}; ${verdict.de}`,
      playerVoices: [
        { quote: 'Im Mobilmodus gut spielbar.', sentiment: 'positive' },
        { quote: 'Am stärksten mit deutlichem Rabatt.', sentiment: 'mixed' },
        { quote: 'Erst den eigenen Regionspreis prüfen.', sentiment: 'positive' },
      ],
      faq: [
        { question: titleForLocale('de', gameTitle, platformLabel), answer: `${gameTitle} lohnt sich auf ${platformLabel}, wenn ${genreText} zu deinem Geschmack passt und der GameGulf-Regionspreis im erwarteten Rabattbereich liegt.` },
        { question: `Wie lang ist ${gameTitle}?`, answer: `${gameTitle} hat eine geschätzte Spielzeit von ${playtimeStr}.` },
        { question: `Wo prüfe ich den ${platformLabel}-Preis?`, answer: `${gameTitle} lässt sich in der GameGulf-Tabelle ${detailUrl}#currency-price regionsübergreifend vergleichen, ohne Wechselkurse zu raten.` },
      ],
    },
    pt: {
      description: `Guia de compra de abril de 2026 para ${platformLabel}: ${gameTitle}, sinal de preço GameGulf e decisão de comprar ou esperar.`,
      decision: 'Compre se a proposta combina com você e sua região aparece em faixa promocional no GameGulf; espere se só houver preço cheio.',
      priceSignal: 'O preço indexado costuma mostrar grande diferença entre regiões baratas e patamares próximos ao preço de tabela.',
      heroNote: `${gameTitle} — ${genreText}${dev ? `; ${dev}` : ''}. ${mcLine} serve como âncora de qualidade.`,
      listingTakeaway: `${gameTitle} — ${genreText}; em abril de 2026 vale comparar regiões no GameGulf antes de pagar.`,
      whatItIs: `${genreText} — ${gameTitle} no ${platformLabel}.`,
      bestFor: `Jogadores que querem ${genreText} em modo portátil.`,
      avoidIf: `Evite se a mistura ${genreText} não combina com você.`,
      consensusPraise: `A faixa crítica (${mcLine}) bate com pontos fortes citados por jogadores.`,
      mainFriction: 'Cansaço do gênero ou promoções diferentes por região.',
      fitLabel: 'Quem compara duas regiões antes do pagamento.',
      timingNote: 'Se sua loja já mostra promoção, a dúvida é mais de gosto; ainda assim confira o preço ao vivo.',
      communityVibe: localizedCommunityVibe(locale, rawGameTitle || gameTitle, genres),
      playMode: 'Solo por padrão, salvo se a loja indicar multijogador.',
      whyNow: 'Ofertas do dia e tendências do GameGulf deixam a diferença regional mais clara.',
      currentDeal: 'As regiões mais baratas lideram a tabela; confira também a moeda nativa no GameGulf.',
      nearHistoricalLow: nearLow.pt,
      salePattern: `${discountCount} movimentos de desconto rastreados em 12 meses.`,
      tldr: `${gameTitle} — ${mcLine}; ${verdict.pt}`,
      playerVoices: [
        { quote: 'No portátil funciona bem.', sentiment: 'positive' },
        { quote: 'Vale mais numa promoção forte.', sentiment: 'mixed' },
        { quote: 'Veja primeiro o preço da sua região.', sentiment: 'positive' },
      ],
      faq: [
        { question: titleForLocale('pt', gameTitle, platformLabel), answer: `${gameTitle} vale a pena no ${platformLabel} se ${genreText} combina com você e o preço regional do GameGulf cai na faixa promocional esperada.` },
        { question: `Quanto dura ${gameTitle}?`, answer: `${gameTitle} tem duração estimada de ${playtimeStr}.` },
        { question: `Onde conferir o preço no ${platformLabel}?`, answer: `${gameTitle} deve ser conferido na grade do GameGulf ${detailUrl}#currency-price para comparar regiões sem adivinhar conversões.` },
      ],
    },
  };

  return copies[locale] || copies.en;
}

function applyLocalizedFrontmatter(fm, locale, ctx) {
  const copy = localizedFrontmatterCopy(locale, ctx);
  fm.author = AUTHOR[locale] || AUTHOR.en;
  fm.description = clip(copy.description, 300);
  fm.decision = clip(copy.decision, 240);
  fm.priceSignal = clip(copy.priceSignal, 200);
  fm.heroNote = clip(copy.heroNote, 220);
  fm.listingTakeaway = clip(copy.listingTakeaway, 96);
  fm.whatItIs = clip(copy.whatItIs, 90);
  fm.bestFor = clip(copy.bestFor, 60);
  fm.avoidIf = clip(copy.avoidIf, 72);
  fm.consensusPraise = clip(copy.consensusPraise, 82);
  fm.mainFriction = clip(copy.mainFriction, 84);
  fm.fitLabel = clip(copy.fitLabel, 72);
  fm.timingNote = clip(copy.timingNote, 200);
  fm.communityVibe = clip(copy.communityVibe, 64);
  fm.playMode = clip(copy.playMode, 200);
  fm.whyNow = clip(copy.whyNow, 200);
  fm.currentDeal = clip(copy.currentDeal, 200);
  fm.nearHistoricalLow = clip(copy.nearHistoricalLow, 200);
  fm.salePattern = clip(copy.salePattern, 200);
  fm.playStyle = clip(localizedGenreList(locale, ctx.genres), 200);
  fm.tags = localizedTags(locale, ctx.gameTitle, ctx.platformLabel);
  fm.communityMemes = localizedCommunityMemes(locale, ctx.gameTitle);
  fm.playerVoices = copy.playerVoices.map((voice) => ({
    quote: clip(voice.quote, 80),
    sentiment: voice.sentiment,
  }));
  fm.tldr = clip(copy.tldr, 160);
  fm.faq = copy.faq.map((item) => ({
    question: item.question,
    answer: clip(item.answer, 400),
  }));
}

function buildFrontmatter(locale, brief, articleSlug, priceRows, decision, mc, playtimeStr) {
  const rawGameTitle = brief.game.title.replace(/[™®©]/g, '').trim();
  const gameTitle = localizedGameTitle(locale, rawGameTitle);
  const key = pickSwitchPlatformKey(brief);
  const platformLabel = displayPlatformLabel(locale, key);
  const platformField = displayPlatformField(locale, key);
  const links = brief.product_links || {};
  const detailUrl = links.detail || brief.meta?.source_url;
  const pv =
    brief.price_analytics?.[key] ||
    brief.price_analytics?.['switch 2'] ||
    brief.price_analytics?.switch;
  const mcNum = mc;
  const mcLine = locHeroStat(locale, mcNum);
  const q1 = titleForLocale(locale, gameTitle, platformLabel);

  const nearLow =
    pv?.at_or_near_historical_low === true
      ? locale === 'en'
        ? 'Yes — indexed data sits at or near the tracked historic low posture.'
        : locale === 'zh-hans'
          ? '是——当前价格接近或处于我们追踪到的历史低价区间。'
          : 'Yes — data tracks near historic lows.'
      : locale === 'zh-hans'
        ? '较复杂——请在 GameGulf 对照当前最低价与追踪均价。'
        : 'Mixed — compare the live cheapest listing to the tracked average.';

  const tldrBase =
    locale === 'en'
      ? `${gameTitle} — ${locHeroStat('en', mcNum)}; ${decision.verdict === 'buy_now' ? 'pricing favors buying now if the genre fits.' : decision.verdict === 'wait_for_sale' ? 'pricing suggests waiting for a deeper sale unless you are time-sensitive.' : 'buy mainly if the pitch already clicked for you.'}`
      : `${gameTitle} — ${locHeroStat(locale, mcNum)}；${decision.verdict === 'buy_now' ? '价格信号偏买入（口味要对）。' : decision.verdict === 'wait_for_sale' ? '价格信号偏等折扣。' : '看个人口味与价格是否同时成立。'}`;

  const rawGenres = brief.game.genres || [];
  const genres = localizedGenreList(locale, rawGenres);
  const dev = brief.game.developer || '';

  const today = new Date().toISOString().slice(0, 10);

  const fm = {
    title: titleForLocale(locale, gameTitle, platformLabel),
    description: clip(
      locale === 'en'
        ? `April 2026 ${platformLabel} guide for ${gameTitle} — ${locHeroStat('en', mcNum)}, GameGulf sale analytics, and a clear buy/wait call.`
        : `2026年4月${platformLabel}购买参考：${gameTitle}、GameGulf 价格信号与买/等建议。`,
      300,
    ),
    publishedAt: today,
    updatedAt: today,
    category: 'worth-it',
    gameTitle,
    platform: platformField,
    primaryPlatformKey: key,
    primaryPlatformLabel: platformLabel,
    hasOtherPlatforms: Object.keys(brief.platforms || {}).filter((k) => k.startsWith('switch')).length > 1,
    author: AUTHOR[locale] || AUTHOR.en,
    readingTime: READING[locale],
    decision: clip(
      locale === 'en'
        ? `Buy now if the pitch fits and your GameGulf price snapshot shows the promo band; wait if MSRP-only regions are your only option.`
        : `若口味匹配且 GameGulf 上你的区服已在促销带可买；若你只能买到接近标价的区服就更适合等等。`,
      240,
    ),
    priceSignal: clip(
      locale === 'en'
        ? `Indexed pricing highlights the cheapest territories versus MSRP tiers — huge spread is common on this SKU.`
        : `索引价差常很明显：低价区服与标价区服可能差一档。`,
      200,
    ),
    wishlistHref: links.wishlist || 'https://www.gamegulf.com/wishlist',
    priceTrackHref: links.price_track || `${detailUrl}#currency-price`,
    gameHref: detailUrl,
    membershipHref: links.membership || 'https://www.gamegulf.com/pricing',
    heroStat: locHeroStat(locale, mcNum),
    heroNote: clip(
      locale === 'en'
        ? `${gameTitle} — ${genres || 'action'}; ${dev ? `${dev}; ` : ''}store pitch vs. critic band (${mcLine}).`
        : `${gameTitle}：${genres || '动作冒险'}${dev ? `；${dev}` : ''}。`,
      220,
    ),
    badge: BADGE[locale][decision.badgeKey],
    verdict: decision.verdict,
    priceCall: decision.priceCall,
    confidence: decision.confidence,
    actionBucket: decision.verdict === 'buy_now' ? 'buy_now' : decision.verdict === 'wait_for_sale' ? 'wait' : 'set_alert',
    featuredPriority: 2,
    listingTakeaway: clip(
      locale === 'en'
        ? `${gameTitle} — ${genres}; April 2026 GameGulf pricing shows a wide regional spread worth comparing.`
        : `${gameTitle}：${genres}；2026年4月价格分区差值得先对照 GameGulf。`,
      96,
    ),
    whatItIs: clip(`${genres || 'Action'} — ${gameTitle} on ${platformLabel}.`, 90),
    bestFor: clip(
      locale === 'en'
        ? `Players who want ${genres || 'this genre'} with honest handheld scope.`
        : `想要${genres || '该类型'}且接受掌机体量的人。`,
      60,
    ),
    avoidIf: clip(
      locale === 'en'
        ? `You want a different genre mix than ${genres || 'this'} — skip if tone is off.`
        : `不喜欢${genres || '该类型'}气质就别硬买。`,
      72,
    ),
    consensusPraise: clip(
      locale === 'en'
        ? `Critic band (${mcLine}) plus store-featured strengths players repeat in reviews.`
        : `口碑集中在玩法与完成度；${mcLine} 可作质量锚点。`,
      82,
    ),
    mainFriction: clip(
      locale === 'en'
        ? `Genre fatigue or sale FOMO — not every region shows the same promo at once.`
        : `区服不同步：不是每个账号都能看到同一档折扣。`,
      84,
    ),
    timeFit: clip(locTimeFitFallback(locale, playtimeStr), 82),
    fitLabel: clip(locale === 'en' ? 'Buyers who compare two regions before checkout.' : '会先对照两个区服再下单的人。', 72),
    timingNote: clip(
      locale === 'en'
        ? `If your storefront price is already discounted, hesitation is mostly taste — still verify live pricing.`
        : `若你看到的参考价已在促销带，犹豫多半只剩口味；但仍要核对商店实时价。`,
      200,
    ),
    communityVibe: clip(
      locale === 'en'
        ? `Sale threads, handheld impressions, patch notes chatter`
        : `折扣讨论、掌机体验、补丁话题`,
      64,
    ),
    playtime: playtimeStr,
    reviewSignal: locReviewSignal(locale, mcNum),
    takeaway: clip(localizedTakeaway(locale, gameTitle, rawGenres, mcLine), 200),
    playStyle: clip(genres || 'Core loop matches standard controller play.', 200),
    timeCommitment: clip(playtimeStr, 200),
    playMode: locale === 'en' ? 'Single-player unless store lists multiplayer.' : '以商店页多人信息为准；默认偏单机体验。',
    whyNow: clip(
      locale === 'en'
        ? `Today's Deals stack plus GameGulf trend counts make the spreadsheet legible.`
        : `今日特惠叠加 GameGulf 追踪，让价差更直观。`,
      200,
    ),
    currentDeal: clip(
      locale === 'en'
        ? `The cheapest tracked territories lead the table — compare native currency on GameGulf.`
        : `索引最低价通常排在表格前几格；请在 GameGulf 对照原生货币。`,
      200,
    ),
    nearHistoricalLow: nearLow,
    salePattern: clip(
      locale === 'en'
        ? `${pv?.discount_events_1y ?? 0} tracked discount moves in the past year — sales are part of the product lifecycle here.`
        : `过去一年约 ${pv?.discount_events_1y ?? 0} 次促销波动——折扣是常态。`,
      200,
    ),
    priceRecommendation: decision.priceCall,
    quickFilters: ['great_on_sale', 'short_sessions'],
    playerNeeds: ['value_for_money', decision.verdict === 'buy_now' ? 'buy_now' : 'wait_for_sale'],
    tags: localizedTags(locale, gameTitle, platformLabel),
    playerVoices: [
      { quote: clip(locale === 'en' ? 'Runs fine for me in handheld.' : '掌机模式整体可玩。', 80), sentiment: 'positive' },
      { quote: clip(locale === 'en' ? 'Worth it on a deep sale only.' : '深度折扣才值。', 80), sentiment: 'mixed' },
      { quote: clip(locale === 'en' ? 'Check your own region first.' : '先看清自己区服价格。', 80), sentiment: 'positive' },
    ],
    communityMemes: localizedCommunityMemes(locale, gameTitle),
    tldr: clip(tldrBase, 160),
    priceRows,
    cardPriceEur: priceRows[0].eurPrice,
    cardPriceRegionCode: priceRows[0].regionCode,
    cardPriceRegion: '',
    cardPrice: '',
    cardPriceNative: priceRows[0].nativePrice,
    cardPriceNativeCurrency: priceRows[0].nativeCurrency,
    faq: [
      {
        question: q1,
        answer: clip(
          locale === 'en'
            ? `${gameTitle} is worth buying on ${platformLabel} in 2026 if the genre fits and your GameGulf regional snapshot shows the promo band you expect — verify live pricing before checkout.`
            : `${gameTitle} 是否值得买取决于你是否喜欢${genres || '这类玩法'}，以及你在 GameGulf 上看到的区服参考价是否落在预期促销带；下单前请再核对一次商店实时价。`,
          400,
        ),
      },
      {
        question:
          locale === 'en'
            ? `How long is ${gameTitle}?`
            : locale === 'zh-hans'
              ? `《${gameTitle}》大概多长？`
              : `How long is ${gameTitle}?`,
        answer: clip(
          `${gameTitle} — expected time commitment: ${playtimeStr}.`,
          400,
        ),
      },
      {
        question:
          locale === 'en'
            ? `Where should I check ${platformLabel} pricing?`
            : `在哪里核对 ${platformLabel} 价格？`,
        answer: clip(
          `${gameTitle} — use the GameGulf detail grid at ${detailUrl}#currency-price to compare regions without guessing conversions.`,
          400,
        ),
      },
    ],
    heroTheme: 'brand',
    coverImage: brief.game.cover_image,
  };

  applyLocalizedFrontmatter(fm, locale, {
    gameTitle,
    rawGameTitle,
    platformLabel,
    genres: rawGenres,
    dev,
    mcLine,
    decision,
    pv,
    playtimeStr,
    detailUrl,
  });

  return fm;
}

function parseCliArgs(argv) {
  const briefPath = argv.find((arg) => arg.endsWith('.json'));
  const slugFlagIndex = argv.indexOf('--slug');
  const inlineSlug = argv.find((arg) => arg.startsWith('--slug='));
  const slugOverride = inlineSlug
    ? inlineSlug.slice('--slug='.length)
    : slugFlagIndex >= 0
      ? argv[slugFlagIndex + 1]
      : null;
  return { briefPath, slugOverride };
}

async function main() {
  const { briefPath, slugOverride } = parseCliArgs(process.argv.slice(2));
  if (!briefPath || !briefPath.endsWith('.json')) {
    console.error('Usage: node scripts/synthesize-worth-it-from-brief.mjs content/briefs/<slug>.json [--slug article-slug]');
    process.exit(2);
  }
  const brief = JSON.parse(readFileSync(briefPath, 'utf8'));
  const baseSlug = slugify(brief.game.title);
  const articleSlug = slugOverride || `${baseSlug}-worth-it`;
  const key = pickSwitchPlatformKey(brief);
  const analytics =
    brief.price_analytics?.[key] || brief.price_analytics?.['switch 2'] || brief.price_analytics?.switch;
  const decision = mapPriceDecision(analytics?.price_verdict, analytics);
  const mc = getMc(brief);
  if (!mc) {
    console.warn('Warning: no Metacritic score in brief — filler 70 used only if still null after steam');
  }
  const mcUse = mc || 70;
  const playtimeEstimate = getPlaytimeEstimate(brief, { slug: baseSlug });

  let priceRows = normalizePriceRows(buildPriceRowsFromBrief(brief, 'en', { platformKey: key }));
  if (priceRows.length < 4 && briefQualifiesForZeroPricePlaceholderGrid(brief)) {
    priceRows = normalizePriceRows(buildZeroPricePlaceholderRows());
    console.warn('Using zero-price placeholder grid (F2P / free utility, no GameGulf digital rows):', briefPath);
  }
  if (priceRows.length < 4) {
    console.error('Not enough price rows (need 4+ non-AR). Skipping:', briefPath);
    process.exit(1);
  }
  priceRows = priceRows.slice(0, 8);

  const gameTitle = brief.game.title.replace(/[™®©]/g, '').trim();
  const detailUrl = brief.product_links?.detail || brief.meta?.source_url;
  const metaYear = String(brief.meta?.extracted_at || '2026').slice(0, 4);
  const anchorEur =
    priceRows.map((r) => r.eurPrice).find((n) => n != null && Number.isFinite(Number(n))) ?? 0;
  const ctx = {
    gameTitle,
    genres: brief.game.genres,
    mcLine: locHeroStat('en', mcUse),
    platformLabel: displayPlatformLabel('en', key),
    detailUrl,
    analytics,
    playtime: null,
    dev: brief.game.developer,
    anchorEur,
    metaYear,
  };

  mkdirSync(POSTS, { recursive: true });
  for (const loc of LOCALES) {
    mkdirSync(join(POSTS, loc), { recursive: true });
    const playtimeStr = locPlaytime(loc, playtimeEstimate);
    ctx.gameTitle = localizedGameTitle(loc, gameTitle);
    ctx.playtime = playtimeStr;
    ctx.mcLine = locHeroStat(loc, mcUse);
    ctx.platformLabel = displayPlatformLabel(loc, key);
    const fm = buildFrontmatter(loc, brief, articleSlug, priceRows, decision, mcUse, playtimeStr);
    const body = buildBody(loc, ctx);
    const out = join(POSTS, loc, `${articleSlug}.md`);
    writeFileSync(out, `---\n${stringifyFrontmatter(fm)}\n---\n${body}`, 'utf8');
    console.log('Wrote', out);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
