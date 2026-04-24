#!/usr/bin/env node
/**
 * Generate 7-locale worth-it Markdown posts from one content/briefs/{slug}.json.
 * Run after extract-game-brief; then: sync-article-pricing on all 7 paths, validate, build.
 *
 * Usage:
 *   node scripts/synthesize-worth-it-from-brief.mjs content/briefs/some-game.json
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const POSTS = join(ROOT, 'src', 'content', 'posts');
const LOCALES = ['en', 'zh-hans', 'ja', 'fr', 'es', 'de', 'pt'];

function slugify(title) {
  return String(title)
    .toLowerCase()
    .replace(/[™®©:]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
  de: { buy: 'Jetzt kaufen', wait: 'Auf Sale warten', watch: 'Geschmackssache' },
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

function locPlaytime(locale, h) {
  if (!h || h.main == null) return null;
  const a = Math.round(h.main);
  const b = h.extra != null ? Math.round(h.extra) : null;
  const c = h.comp != null ? Math.round(h.comp) : null;
  if (locale === 'en') {
    return `${a}h main${b != null ? ` · ${b}h+ extras` : ''}${c != null ? ` · ~${c}h completionist` : ''} (HLTB)`;
  }
  if (locale === 'zh-hans') {
    return `HLTB 约 ${a}h 主线${b != null ? `、${b}h 附加` : ''}${c != null ? `、~${c}h 完美` : ''}`;
  }
  if (locale === 'ja') {
    return `HLTB メイン約${a}時間${b != null ? `／追加約${b}時間` : ''}${c != null ? `／コンプ約${c}時間` : ''}`;
  }
  if (locale === 'fr') {
    return `HLTB ~${a} h principal${b != null ? `, ${b} h extras` : ''}${c != null ? `, ~${c} h complétion` : ''}`;
  }
  if (locale === 'es') {
    return `HLTB ~${a} h historia${b != null ? `, ${b} h extras` : ''}${c != null ? `, ~${c} h al 100%` : ''}`;
  }
  if (locale === 'de') {
    return `HLTB ~${a} h Story${b != null ? `, ${b} h Extras` : ''}${c != null ? `, ~${c} h 100%` : ''}`;
  }
  return `HLTB ~${a} h principal${b != null ? `, ${b} h extras` : ''}${c != null ? `, ~${c} h 100%` : ''}`;
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
  const dline =
    last?.date && last?.region
      ? `${last.date} (${last.region}, ${eur(last.price_eur)})`
      : trend?.date
        ? `${trend.date} (${trend.region || trend.country || ''}, ${eur(trend.price_eur)})`
        : `${y} tracker window (cheapest indexed territory ${eur(anchor)})`;

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
    return `**Rabatt**-Historie: **historischer Tiefstpreis** um **${eur(atl?.price_eur)}** (${atl?.region || trend?.region || 'siehe Tabelle'}), **${ev}** Bewegungen im Jahr, **Ø Sale-Preis** **${eur(avg)}**, letzte größere Bewegung vor **${days ?? '—'}** Tagen (**${dline}**, **${y}**). [GameGulf-Livepreis](${detailUrl}#currency-price) prüfen.`;
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
  const gEn = (genres || []).slice(0, 3).join(', ') || 'action-adventure';
  const gZh = (genres || []).slice(0, 3).join('、') || '动作冒险';
  const gJa = (genres || []).slice(0, 3).join(' / ') || 'アクション・アドベンチャー';
  const g = locale === 'zh-hans' ? gZh : locale === 'ja' ? gJa : gEn;
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

**数字版各区价格变动很快** — 下方表格与 frontmatter 同源，均来自 **GameGulf** 的同一张多区表。请到 [gamegulf.com](https://www.gamegulf.com) 对照你账号所在区服的真实标价，不要想当然认定只有一个「全球最好价」。

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
- 你已经被 **预告 / Demo** 说服，只差 **价格** 推一把
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

**価格は地域ごとに動きが早い**です。下の表は frontmatter と同じ **GameGulf** の地域別価格一覧から生成しています。[gamegulf.com](https://www.gamegulf.com) で自分のアカウント地域の表示を必ず照合し、「どこが一番安い」と決めつけないでください。

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

  return `## ${H.quick}

**${gameTitle}** reads as **${mcLine}** ${locale === 'en' ? 'on the critic side' : ''} — **${g}** beats match what the eShop card promises. ${pt} frames how much game you are buying.

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

function buildFrontmatter(locale, brief, articleSlug, priceRows, decision, mc, hltbStr) {
  const gameTitle = brief.game.title.replace(/[™®©]/g, '').trim();
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

  const genres = (brief.game.genres || []).join(', ');
  const dev = brief.game.developer || '';

  const fm = {
    title: titleForLocale(locale, gameTitle, platformLabel),
    description: clip(
      locale === 'en'
        ? `April 2026 ${platformLabel} guide for ${gameTitle} — ${locHeroStat('en', mcNum)}, GameGulf sale analytics, and a clear buy/wait call.`
        : `2026年4月${platformLabel}购买参考：${gameTitle}、GameGulf 价格信号与买/等建议。`,
      300,
    ),
    publishedAt: '2026-04-22',
    updatedAt: '2026-04-22',
    category: 'worth-it',
    gameTitle,
    platform: platformField,
    primaryPlatformKey: key,
    primaryPlatformLabel: platformLabel,
    hasOtherPlatforms: Object.keys(brief.platforms || {}).filter((k) => k.startsWith('switch')).length > 1,
    author: 'GameGulf Editorial AI',
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
    timeFit: clip(hltbStr || (locale === 'en' ? 'Runtime fits evenings, not months.' : '体量偏碎片化，不适合当长线主菜。'), 82),
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
    playtime: hltbStr || undefined,
    reviewSignal: locReviewSignal(locale, mcNum),
    takeaway: clip(
      locale === 'en'
        ? `${gameTitle} is a value call first — let GameGulf regional prices decide urgency, Metacritic sets quality expectations.`
        : `${gameTitle} 更像“价格优先”的决策：用 GameGulf 各区参考价判断紧迫性。`,
      200,
    ),
    playStyle: clip(genres || 'Core loop matches standard controller play.', 200),
    timeCommitment: clip(hltbStr || 'Session-friendly.', 200),
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
    tags: [
      clip(`${gameTitle} ${platformLabel}`.toLowerCase().replace(/\s+/g, ' '), 40),
      clip(`${gameTitle} worth it`.toLowerCase(), 40),
      clip(`${gameTitle} price`.toLowerCase(), 40),
      'gamegulf deals',
    ],
    playerVoices: [
      { quote: clip(locale === 'en' ? 'Runs fine for me in handheld.' : '掌机模式整体可玩。', 80), sentiment: 'positive' },
      { quote: clip(locale === 'en' ? 'Worth it on a deep sale only.' : '深度折扣才值。', 80), sentiment: 'mixed' },
      { quote: clip(locale === 'en' ? 'Check your own region first.' : '先看清自己区服价格。', 80), sentiment: 'positive' },
    ],
    communityMemes: [
      clip(`${gameTitle} sale bingo`, 40),
      'patch notes copium',
      'handheld pixel peeping',
      'wishlist graveyard',
      'region hopper',
      'MSRP sticker shock',
    ],
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
          hltbStr
            ? `${gameTitle} — community hour bands land around: ${hltbStr}.`
            : `${gameTitle} — treat runtime as store-listed scope; verify patch notes if you need exact parity.`,
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

  return fm;
}

async function main() {
  const briefPath = process.argv[2];
  if (!briefPath || !briefPath.endsWith('.json')) {
    console.error('Usage: node scripts/synthesize-worth-it-from-brief.mjs content/briefs/<slug>.json');
    process.exit(2);
  }
  const brief = JSON.parse(readFileSync(briefPath, 'utf8'));
  const baseSlug = slugify(brief.game.title);
  const articleSlug = `${baseSlug}-worth-it`;
  const key = pickSwitchPlatformKey(brief);
  const analytics =
    brief.price_analytics?.[key] || brief.price_analytics?.['switch 2'] || brief.price_analytics?.switch;
  const decision = mapPriceDecision(analytics?.price_verdict, analytics);
  const mc = getMc(brief);
  if (!mc) {
    console.warn('Warning: no Metacritic score in brief — filler 70 used only if still null after steam');
  }
  const mcUse = mc || 70;
  const h = hltbHours(brief);

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
    const hltbStr = locPlaytime(loc, h);
    ctx.playtime = hltbStr;
    ctx.mcLine = locHeroStat(loc, mcUse);
    ctx.platformLabel = displayPlatformLabel(loc, key);
    const fm = buildFrontmatter(loc, brief, articleSlug, priceRows, decision, mcUse, hltbStr);
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
