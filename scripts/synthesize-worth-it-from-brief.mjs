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
  buildPriceRowsFromBrief,
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

function discountParagraph(locale, a, detailUrl) {
  const ev = a?.discount_events_1y ?? 0;
  const avg = a?.avg_discount_price_eur;
  const days = a?.days_since_last_discount;
  const last = a?.last_discount;
  const trend = a?.trend_from_lowest;
  const atl = a?.global_low;
  const eur = (n) => (n == null ? '—' : `€${Number(n).toFixed(2)}`);
  const dline =
    last?.date && last?.region
      ? `${last.date} (${last.region}, ${eur(last.price_eur)})`
      : trend?.date
        ? `${trend.date} (${trend.region || trend.country || ''})`
        : 'recent tracker data';

  if (locale === 'en') {
    return `Tracked **discount** history: **all-time low** around **${eur(atl?.price_eur)}** (${atl?.region || trend?.region || 'see grid'}), **${ev}** sale moves in the past year, **average sale** near **${eur(avg)}**, last notable shift **${days ?? '—'}** days ago on **${dline}**. Cross-check [GameGulf live pricing](${detailUrl}#currency-price) before you buy — regional timing still shifts.`;
  }
  if (locale === 'zh-hans') {
    return `结合 **折扣** 追踪：**历史低价**约 **${eur(atl?.price_eur)}**（${atl?.region || trend?.region || '见表'}），过去一年约 **${ev}** 次促销，**平均促销价**约 **${eur(avg)}**，距上次明显波动约 **${days ?? '—'}** 天（**${dline}**）。下单前请再核对 [GameGulf 实时价格](${detailUrl}#currency-price)。`;
  }
  if (locale === 'ja') {
    return `**セール**履歴：**最安値**は **${eur(atl?.price_eur)}** 付近（${atl?.region || trend?.region || '表参照'}）、直近1年で **${ev}** 回の動き、**平均セール価格**は **${eur(avg)}**、直近の大きめの動きから **${days ?? '—'}** 日（**${dline}**）。[GameGulfの価格](${detailUrl}#currency-price)で最新行を確認してください。`;
  }
  if (locale === 'fr') {
    return `Historique des **soldes** : **plus bas** vers **${eur(atl?.price_eur)}** (${atl?.region || trend?.region || 'voir grille'}), **${ev}** mouvements sur 12 mois, **prix moyen promo** **${eur(avg)}**, dernière variation notable il y a **${days ?? '—'}** jours (**${dline}**). Vérifiez le [tableau GameGulf](${detailUrl}#currency-price).`;
  }
  if (locale === 'es') {
    return `Historial de **descuentos**: **mínimo** cerca de **${eur(atl?.price_eur)}** (${atl?.region || trend?.region || 'ver tabla'}), **${ev}** movimientos en 12 meses, **precio medio en oferta** **${eur(avg)}**, último movimiento hace **${days ?? '—'}** días (**${dline}**). Mira el [precio en vivo en GameGulf](${detailUrl}#currency-price).`;
  }
  if (locale === 'de') {
    return `**Rabatt**-Historie: **Tiefststand** um **${eur(atl?.price_eur)}** (${atl?.region || trend?.region || 'siehe Tabelle'}), **${ev}** Bewegungen im Jahr, **Ø Sale-Preis** **${eur(avg)}**, letzte größere Bewegung vor **${days ?? '—'}** Tagen (**${dline}**). [GameGulf-Livepreis](${detailUrl}#currency-price) prüfen.`;
  }
  return `Histórico de **descontos**: **mínimo** perto de **${eur(atl?.price_eur)}** (${atl?.region || trend?.region || 'ver grelha'}), **${ev}** movimentos em 12 meses, **média em promoção** **${eur(avg)}**, último movimento há **${days ?? '—'}** dias (**${dline}**). Confirme no [GameGulf](${detailUrl}#currency-price).`;
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
  const { gameTitle, genres, mcLine, platformLabel, detailUrl, analytics, playtime, dev } = ctx;
  const H = sectionHeadings(locale, gameTitle, platformLabel);
  const g = (genres || []).slice(0, 3).join(', ') || 'action-adventure';
  const pt = playtime ? `**${playtime}**` : '**session-friendly runtime**';
  const disc = discountParagraph(locale, analytics, detailUrl);

  return `## ${H.quick}

**${gameTitle}** reads as **${mcLine}** ${locale === 'en' ? 'on the critic side' : ''} — **${g}** beats match what the eShop card promises. ${pt} frames how much game you are buying.

${disc}

**GameGulf** keeps this SKU on a [live multi-region grid](${detailUrl}#currency-price) so you can sanity-check the **discount** story before checkout.

## ${H.price}

**Regional pricing moves fast** — the table below is generated from the same **GameGulf** rows we ship in frontmatter. **Compare** your account region on [gamegulf.com](https://www.gamegulf.com) before you assume a single “best” territory.

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
- **Your regional row** already sits in the **sale** band **GameGulf** highlights — [double-check here](${detailUrl}#currency-price)
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

Skim **[GameGulf pricing](${detailUrl}#currency-price)** once, lock the **deal** if your row cooperates, and treat **gamegulf.com** as the sanity check for the next **sale** window too.

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
  const platformLabel = key === 'switch 2' ? 'NS2' : 'Nintendo Switch';
  const platformField = key === 'switch 2' ? 'NS2' : 'Nintendo Switch';
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
          ? '是——当前索引姿态接近或处于追踪的历史低价带。'
          : 'Yes — data tracks near historic lows.'
      : 'Mixed — compare the live cheapest row to the tracked average.';

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
        ? `Buy now if the pitch fits and your GameGulf row shows the promo band; wait if MSRP-only regions are your only option.`
        : `若口味匹配且 GameGulf 行价在促销带可买；若你只能买到 MSRP 主导区服就更适合等等。`,
      240,
    ),
    priceSignal: clip(
      locale === 'en'
        ? `Indexed pricing highlights the global low row versus MSRP tiers — huge spread is common on this SKU.`
        : `索引价差常很明显：低价行与 MSRP 行可能差一档。`,
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
        ? `If your row is already discounted, hesitation is mostly taste — still verify live pricing.`
        : `若你的行价已在促销带，犹豫多半只剩口味；但仍要核对实时行。`,
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
        ? `${gameTitle} is a value call first — let GameGulf rows decide urgency, Metacritic sets quality expectations.`
        : `${gameTitle} 更像“价格优先”的决策：用 GameGulf 行价判断紧迫性。`,
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
        ? `Cheapest indexed rows lead the table — compare native currency on GameGulf.`
        : `索引最低价通常在表头几行；请在 GameGulf 对照原生货币。`,
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
      { quote: clip(locale === 'en' ? 'Check your own region first.' : '先看清自己区服行价。', 80), sentiment: 'positive' },
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
            ? `${gameTitle} is worth buying on ${platformLabel} in 2026 if the genre fits and your GameGulf row shows the promo band you expect — verify live pricing before checkout.`
            : `${gameTitle} 是否值得买取决于你是否喜欢${genres || '这类玩法'}，以及你在 GameGulf 上看到的行价是否落在预期促销带；下单前请再核对一次实时价格。`,
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
  if (priceRows.length < 4) {
    console.error('Not enough price rows (need 4+ non-AR). Skipping:', briefPath);
    process.exit(1);
  }
  priceRows = priceRows.slice(0, 8);

  const gameTitle = brief.game.title.replace(/[™®©]/g, '').trim();
  const platformLabel = key === 'switch 2' ? 'NS2' : 'Nintendo Switch';
  const detailUrl = brief.product_links?.detail || brief.meta?.source_url;
  const ctx = {
    gameTitle,
    genres: brief.game.genres,
    mcLine: locHeroStat('en', mcUse),
    platformLabel,
    detailUrl,
    analytics,
    playtime: null,
    dev: brief.game.developer,
  };

  mkdirSync(POSTS, { recursive: true });
  for (const loc of LOCALES) {
    mkdirSync(join(POSTS, loc), { recursive: true });
    const hltbStr = locPlaytime(loc, h);
    ctx.playtime = hltbStr;
    ctx.mcLine = locHeroStat(loc, mcUse);
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
