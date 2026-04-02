import type { BlogLocale } from './i18n';
import type { QuickFilterKey } from './blog';

export interface TopicDefinition {
  slug: string;
  filter: QuickFilterKey;
  label: Record<BlogLocale, string>;
  title: Record<BlogLocale, string>;
  description: Record<BlogLocale, string>;
  intro: Record<BlogLocale, string>;
}

const year = new Date().getFullYear();

export const topics: TopicDefinition[] = [
  {
    slug: 'best-co-op-switch-games',
    filter: 'co_op',
    label: { en: 'Co-op', 'zh-hans': '合作游戏', fr: 'Coop', es: 'Cooperativo', de: 'Koop', ja: '協力プレイ' },
    title: {
      en: `Best Co-op & Multiplayer Switch Games (${year})`,
      'zh-hans': `最佳 Switch 合作/多人游戏推荐（${year}）`,
      fr: `Meilleurs jeux Switch coop et multijoueur (${year})`,
      es: `Mejores juegos Switch cooperativos y multijugador (${year})`,
      de: `Beste Koop- & Mehrspieler-Switch-Spiele (${year})`,
      ja: `おすすめSwitch協力・マルチプレイゲーム（${year}）`,
    },
    description: {
      en: 'Curated co-op and multiplayer Switch games with buying advice, player fit, and price timing from GameGulf.',
      'zh-hans': '精选适合多人和合作游玩的 Switch 游戏，附带购买建议、适配度判断和价格时机分析。',
      fr: 'Sélection de jeux Switch coop et multijoueur avec conseils d\'achat, adéquation joueur et timing des prix.',
      es: 'Selección de juegos Switch cooperativos con consejos de compra, ajuste de jugador y momento del precio.',
      de: 'Kuratierte Koop- und Mehrspieler-Switch-Spiele mit Kaufberatung, Spieler-Passung und Preis-Timing.',
      ja: '購入アドバイス・プレイヤー適合度・価格タイミング付きの厳選Switch協力・マルチゲーム。',
    },
    intro: {
      en: 'Looking for the best co-op and multiplayer games on Nintendo Switch? These guides help you judge which titles are worth buying for group play, local sessions, and party nights — and whether the current price is right.',
      'zh-hans': '在找适合和朋友、家人一起玩的 Switch 游戏？这些指南帮你判断哪些多人/合作游戏值得入手，以及现在的价格是否合适。',
      fr: 'Vous cherchez les meilleurs jeux coop sur Nintendo Switch ? Ces guides vous aident à choisir les titres pour jouer en groupe et à savoir si le prix est bon.',
      es: '¿Buscas los mejores juegos cooperativos en Nintendo Switch? Estas guías te ayudan a elegir los títulos para jugar en grupo y saber si el precio es adecuado.',
      de: 'Auf der Suche nach den besten Koop-Spielen für Nintendo Switch? Diese Ratgeber helfen Ihnen bei der Auswahl für Gruppenabende und bewerten den aktuellen Preis.',
      ja: 'Nintendo Switchのおすすめ協力・マルチプレイゲームをお探しですか？グループプレイやパーティーに最適なタイトルと、今の価格が適正かを判断できます。',
    },
  },
  {
    slug: 'best-switch-rpgs',
    filter: 'long_rpg',
    label: { en: 'RPGs', 'zh-hans': 'RPG', fr: 'RPG', es: 'RPG', de: 'RPGs', ja: 'RPG' },
    title: {
      en: `Best RPGs on Nintendo Switch (${year})`,
      'zh-hans': `最佳 Switch RPG 游戏推荐（${year}）`,
      fr: `Meilleurs RPG sur Nintendo Switch (${year})`,
      es: `Mejores RPG en Nintendo Switch (${year})`,
      de: `Beste RPGs auf Nintendo Switch (${year})`,
      ja: `おすすめNintendo Switch RPG（${year}）`,
    },
    description: {
      en: 'Long-form RPGs on Switch ranked by player fit, time commitment, and buying value. GameGulf decision guides.',
      'zh-hans': '按玩家适配度、投入时间和购买价值排序的 Switch RPG 指南。',
      fr: 'RPG longs sur Switch classés par adéquation, temps d\'investissement et rapport qualité-prix.',
      es: 'RPG largos en Switch clasificados por ajuste, tiempo de inversión y valor de compra.',
      de: 'Langzeit-RPGs auf Switch, sortiert nach Passung, Zeitaufwand und Kaufwert.',
      ja: 'プレイヤー適合度・時間投入・購入価値で評価したSwitch RPGガイド。',
    },
    intro: {
      en: 'These are the RPGs on Nintendo Switch that demand serious time but deliver strong long-term value. Each guide breaks down who the game is for, how much time it takes, and whether the price is right for you.',
      'zh-hans': '这些是投入时间较长但回报丰厚的 Switch RPG。每篇指南都会分析这款游戏适合谁、需要多少时间、以及现在的价格值不值。',
      fr: 'Ces RPG sur Switch demandent du temps mais offrent une valeur durable. Chaque guide analyse pour qui le jeu est fait et si le prix est juste.',
      es: 'Estos RPG en Switch requieren tiempo pero ofrecen gran valor. Cada guía analiza para quién es el juego y si el precio es justo.',
      de: 'Diese RPGs auf Switch brauchen Zeit, bieten aber starken Langzeitwert. Jeder Ratgeber analysiert, für wen das Spiel passt und ob der Preis stimmt.',
      ja: 'これらのSwitch RPGは時間がかかるが、長期的な価値は高い。各ガイドで誰向けか、プレイ時間、価格の妥当性を分析。',
    },
  },
  {
    slug: 'best-family-switch-games',
    filter: 'family_friendly',
    label: { en: 'Family', 'zh-hans': '家庭游戏', fr: 'Famille', es: 'Familia', de: 'Familie', ja: 'ファミリー' },
    title: {
      en: `Best Family-Friendly Nintendo Switch Games (${year})`,
      'zh-hans': `最佳 Switch 家庭游戏推荐（${year}）`,
      fr: `Meilleurs jeux Switch pour la famille (${year})`,
      es: `Mejores juegos Switch para toda la familia (${year})`,
      de: `Beste familienfreundliche Nintendo-Switch-Spiele (${year})`,
      ja: `おすすめファミリー向けSwitch ゲーム（${year}）`,
    },
    description: {
      en: 'Family-safe Switch games reviewed for player fit, age range, and value. GameGulf buying guides.',
      'zh-hans': '适合全家游玩的 Switch 游戏精选，包含适配度、年龄段和性价比分析。',
      fr: 'Jeux Switch familiaux évalués selon l\'adéquation, l\'âge et le rapport qualité-prix.',
      es: 'Juegos Switch familiares evaluados por ajuste, rango de edad y valor.',
      de: 'Familienfreundliche Switch-Spiele bewertet nach Passung, Altersgruppe und Preis-Leistung.',
      ja: 'プレイヤー適合度・対象年齢・コスパで評価したファミリー向けSwitchゲーム。',
    },
    intro: {
      en: 'Finding games the whole family can enjoy on Nintendo Switch means balancing accessibility, fun for different ages, and price. These guides help you decide which family-friendly titles are worth the investment.',
      'zh-hans': '要找全家人都能一起享受的 Switch 游戏，需要兼顾上手难度、不同年龄段的乐趣和价格。这些指南帮你判断哪些家庭友好的游戏值得入手。',
      fr: 'Trouver des jeux pour toute la famille sur Switch, c\'est équilibrer accessibilité, plaisir pour tous les âges et prix. Ces guides vous aident à choisir.',
      es: 'Encontrar juegos para toda la familia en Switch significa equilibrar accesibilidad, diversión para todas las edades y precio.',
      de: 'Familienspiele auf Switch finden bedeutet, Zugänglichkeit, Spaß für alle Altersgruppen und Preis abzuwägen.',
      ja: 'Switch で家族全員が楽しめるゲームを見つけるには、手軽さ・年齢層・価格のバランスが大切。',
    },
  },
  {
    slug: 'best-nintendo-first-party-games',
    filter: 'nintendo_first_party',
    label: { en: 'First-Party', 'zh-hans': '第一方', fr: 'First-Party', es: 'First-Party', de: 'First-Party', ja: 'ファーストパーティ' },
    title: {
      en: `Best Nintendo First-Party Switch Games (${year})`,
      'zh-hans': `最佳任天堂第一方 Switch 游戏推荐（${year}）`,
      fr: `Meilleurs jeux Nintendo first-party sur Switch (${year})`,
      es: `Mejores juegos first-party de Nintendo Switch (${year})`,
      de: `Beste Nintendo-First-Party-Switch-Spiele (${year})`,
      ja: `おすすめ任天堂ファーストパーティSwitch ゲーム（${year}）`,
    },
    description: {
      en: "Nintendo's own Switch games ranked by value, fit, and deal timing. Know when to buy and when to wait.",
      'zh-hans': '任天堂自家 Switch 游戏按价值、适配度和折扣时机排序。帮你判断什么时候买最合适。',
      fr: 'Les jeux Nintendo classés par valeur, adéquation et moment d\'achat.',
      es: 'Juegos de Nintendo clasificados por valor, ajuste y momento de compra.',
      de: 'Nintendos eigene Spiele, sortiert nach Wert, Passung und Deal-Timing.',
      ja: '任天堂自社タイトルを価値・適合度・セールタイミングで評価。',
    },
    intro: {
      en: "Nintendo first-party titles tend to hold their price longer than most Switch games. These guides help you decide which ones are worth paying near full price for and which deserve a patient wait.",
      'zh-hans': '任天堂第一方游戏通常比大多数 Switch 游戏更保值。这些指南帮你判断哪些值得接近原价入手，哪些更适合耐心等等。',
      fr: 'Les jeux Nintendo gardent leur prix plus longtemps. Ces guides vous aident à décider lesquels valent le plein tarif.',
      es: 'Los juegos de Nintendo mantienen su precio más tiempo. Estas guías te ayudan a decidir cuáles valen el precio completo.',
      de: 'Nintendo-Spiele halten ihren Preis länger. Diese Ratgeber helfen Ihnen zu entscheiden, welche den vollen Preis wert sind.',
      ja: '任天堂タイトルは値下がりしにくい。定価で買う価値があるものと、待つべきものを見極めよう。',
    },
  },
  {
    slug: 'best-switch-games-short-sessions',
    filter: 'short_sessions',
    label: { en: 'Short Sessions', 'zh-hans': '碎片时间', fr: 'Sessions courtes', es: 'Sesiones cortas', de: 'Kurze Sessions', ja: '短時間プレイ' },
    title: {
      en: `Best Switch Games for Short Play Sessions (${year})`,
      'zh-hans': `最适合碎片时间的 Switch 游戏推荐（${year}）`,
      fr: `Meilleurs jeux Switch pour sessions courtes (${year})`,
      es: `Mejores juegos Switch para sesiones cortas (${year})`,
      de: `Beste Switch-Spiele für kurze Spielsessions (${year})`,
      ja: `短時間プレイにおすすめのSwitch ゲーム（${year}）`,
    },
    description: {
      en: 'Switch games perfect for 15–30 minute sessions. Ideal for busy schedules and portable play.',
      'zh-hans': '适合 15–30 分钟碎片时间游玩的 Switch 游戏。通勤、午休、睡前的最佳选择。',
      fr: 'Jeux Switch parfaits pour des sessions de 15 à 30 minutes. Idéal en déplacement.',
      es: 'Juegos Switch perfectos para sesiones de 15 a 30 minutos. Ideal para horarios ocupados.',
      de: 'Switch-Spiele perfekt für 15–30-Minuten-Sessions. Ideal für unterwegs.',
      ja: '15〜30分のプレイに最適なSwitchゲーム。通勤・昼休み・就寝前に。',
    },
    intro: {
      en: 'Not every game needs hours of uninterrupted time. These Switch titles work great in short bursts — perfect for commutes, lunch breaks, or winding down before bed.',
      'zh-hans': '不是每款游戏都需要连续几个小时来玩。这些 Switch 游戏非常适合碎片时间——通勤、午休或睡前都能轻松来一局。',
      fr: 'Pas besoin de jouer des heures. Ces jeux Switch fonctionnent très bien en sessions courtes — parfaits pour les trajets ou les pauses.',
      es: 'No todos los juegos necesitan horas seguidas. Estos títulos Switch funcionan genial en sesiones cortas.',
      de: 'Nicht jedes Spiel braucht Stunden. Diese Switch-Titel funktionieren super in kurzen Sessions.',
      ja: '何時間も連続プレイする必要はない。通勤や休憩時間にサクッと遊べるSwitchタイトル。',
    },
  },
  {
    slug: 'best-switch-games-under-20',
    filter: 'under_20',
    label: { en: 'Under $20', 'zh-hans': '低于$20', fr: 'Moins de 20 €', es: 'Menos de $20', de: 'Unter 20 €', ja: '2000円以下' },
    title: {
      en: `Best Switch Games Under $20 (${year})`,
      'zh-hans': `低于 $20 的最佳 Switch 游戏推荐（${year}）`,
      fr: `Meilleurs jeux Switch à moins de 20 € (${year})`,
      es: `Mejores juegos Switch por menos de $20 (${year})`,
      de: `Beste Switch-Spiele unter 20 € (${year})`,
      ja: `2000円以下のおすすめSwitchゲーム（${year}）`,
    },
    description: {
      en: 'Quality Switch games under $20 that deliver real value. Sorted by deal quality and player fit.',
      'zh-hans': '低于 $20 却质量过硬的 Switch 游戏。按折扣力度和玩家适配度排序。',
      fr: 'Jeux Switch de qualité à moins de 20 €, triés par rapport qualité-prix et adéquation.',
      es: 'Juegos Switch de calidad por menos de $20, ordenados por valor y ajuste.',
      de: 'Qualitäts-Switch-Spiele unter 20 €, sortiert nach Deal-Qualität und Passung.',
      ja: '2000円以下でも質の高いSwitchゲーム。お得度とプレイヤー適合度で評価。',
    },
    intro: {
      en: 'Great games do not have to be expensive. These Switch titles are available under $20 and still deliver strong value for the price. Each guide covers player fit and whether the current deal is actually good.',
      'zh-hans': '好游戏不一定贵。这些 Switch 游戏售价不到 $20，性价比依然很高。每篇指南都会分析玩家适配度和当前折扣是否值得。',
      fr: 'Les bons jeux ne sont pas forcément chers. Ces titres Switch à moins de 20 € offrent un excellent rapport qualité-prix.',
      es: 'Los buenos juegos no tienen que ser caros. Estos títulos Switch cuestan menos de $20 y ofrecen gran valor.',
      de: 'Gute Spiele müssen nicht teuer sein. Diese Switch-Titel unter 20 € bieten starken Gegenwert.',
      ja: '良いゲームは高くなくてもいい。2000円以下でもコスパ抜群のSwitchタイトルを紹介。',
    },
  },
  {
    slug: 'best-switch-deals',
    filter: 'great_on_sale',
    label: { en: 'On Sale', 'zh-hans': '好价推荐', fr: 'En promo', es: 'En oferta', de: 'Im Angebot', ja: 'セール中' },
    title: {
      en: `Best Nintendo Switch Game Deals (${year})`,
      'zh-hans': `Switch 打折好价推荐（${year}）`,
      fr: `Meilleures promotions Switch (${year})`,
      es: `Mejores ofertas Switch (${year})`,
      de: `Beste Nintendo-Switch-Angebote (${year})`,
      ja: `お得なNintendo Switchセール情報（${year}）`,
    },
    description: {
      en: 'Switch games with the strongest active deals. Buying advice on whether each sale is worth jumping on.',
      'zh-hans': '当前折扣力度最大的 Switch 游戏。每款都附带是否值得趁这波入手的购买建议。',
      fr: 'Jeux Switch avec les meilleures promos en cours. Conseils sur chaque offre.',
      es: 'Juegos Switch con las mejores ofertas activas. Consejos sobre cada oferta.',
      de: 'Switch-Spiele mit den besten aktuellen Deals. Kaufberatung für jedes Angebot.',
      ja: '今最もお得なSwitchゲームのセール情報。各セールが買い時かアドバイス付き。',
    },
    intro: {
      en: 'These Switch games are at strong discount levels right now. But a low price alone does not make a smart buy — these guides also check whether the game actually fits you before you spend.',
      'zh-hans': '这些 Switch 游戏目前正处于不错的折扣区间。但光价格低不代表值得买——这些指南还会帮你判断游戏是否真的适合你。',
      fr: 'Ces jeux Switch sont actuellement bien remisés. Mais un prix bas ne suffit pas — ces guides vérifient aussi si le jeu vous correspond.',
      es: 'Estos juegos Switch tienen grandes descuentos ahora. Pero un precio bajo no es todo — estas guías también verifican si el juego es para ti.',
      de: 'Diese Switch-Spiele haben aktuell starke Rabatte. Aber ein niedriger Preis allein reicht nicht — diese Ratgeber prüfen auch die Passung.',
      ja: 'これらのSwitchゲームは現在大幅値引き中。ただし安いだけでは不十分——自分に合うかもチェック。',
    },
  },
  {
    slug: 'switch-games-rarely-on-sale',
    filter: 'rarely_discounted',
    label: { en: 'Rarely On Sale', 'zh-hans': '很少打折', fr: 'Rarement en promo', es: 'Raramente rebajado', de: 'Selten im Sale', ja: 'セール稀' },
    title: {
      en: 'Switch Games That Rarely Go on Sale',
      'zh-hans': '很少打折的 Switch 游戏',
      fr: 'Jeux Switch rarement en promotion',
      es: 'Juegos Switch que raramente están en oferta',
      de: 'Switch-Spiele, die selten im Sale sind',
      ja: 'めったにセールしないSwitchゲーム',
    },
    description: {
      en: 'Nintendo Switch games that hold their price stubbornly. Know what to expect before waiting for a sale.',
      'zh-hans': '价格非常坚挺的 Switch 游戏。等折扣之前先了解实际折扣规律。',
      fr: 'Jeux Switch qui gardent obstinément leur prix. À savoir avant d\'attendre une promo.',
      es: 'Juegos Switch que mantienen su precio. Lo que debes saber antes de esperar una oferta.',
      de: 'Switch-Spiele, die ihren Preis hartnäckig halten. Was Sie wissen sollten, bevor Sie auf einen Sale warten.',
      ja: '頑固に値段が下がらないSwitchゲーム。セールを待つ前に知っておくべきこと。',
    },
    intro: {
      en: 'Some Switch games almost never see meaningful discounts. If you are waiting for a deep sale on one of these, it helps to know the actual pricing history so you can set realistic expectations.',
      'zh-hans': '有些 Switch 游戏几乎不会有大幅折扣。如果你在等这些游戏降价，先了解它们的实际价格走势，才能设定合理的期望。',
      fr: 'Certains jeux Switch ne sont presque jamais en promotion. Connaître leur historique de prix aide à ajuster vos attentes.',
      es: 'Algunos juegos Switch casi nunca tienen descuentos significativos. Conocer su historial de precios ayuda a ajustar expectativas.',
      de: 'Manche Switch-Spiele werden fast nie rabattiert. Die Preishistorie zu kennen hilft, realistische Erwartungen zu setzen.',
      ja: '一部のSwitchゲームは大幅値引きがほぼない。価格履歴を知って、現実的な期待値を持とう。',
    },
  },
];

export function getTopicBySlug(slug: string): TopicDefinition | undefined {
  return topics.find((t) => t.slug === slug);
}

export function getAllTopicSlugs(): string[] {
  return topics.map((t) => t.slug);
}
