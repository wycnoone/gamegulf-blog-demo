#!/usr/bin/env node
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import yaml from 'js-yaml';
import { stripUtf8Bom } from '../article-pricing-utils.mjs';

const POSTS_ROOT = join(process.cwd(), 'src', 'content', 'posts');
const WRITE = process.argv.includes('--write');
const SAMPLE_LIMIT = Number(process.argv.find((arg) => arg.startsWith('--sample='))?.split('=')[1] || 50);

const GENERIC_BEST_FOR_PATTERNS = [
  /players who want .+ honest handheld scope/i,
  /想要.+且接受掌机体量的人/u,
  /.+のテンポを携帯機で遊びたい人/u,
  /joueurs qui veulent du .+ au format portable/i,
  /jugadores que quieren .+ en formato portátil/i,
  /spieler, die .+ im mobilformat wollen/i,
  /jogadores que querem .+ em modo portátil/i,
  /^best if you want\b/i,
  /^best if you like\b/i,
  /^für spieler mit lust auf\b/i,
  /^für spieler, die .+ reizt/i,
];

const AUDIENCE_LINES = {
  en: {
    rogue: [
      'Players who enjoy replayable runs and build tinkering.',
      'Best for reset-friendly players who like experiments.',
      'For players who enjoy risk, rerolls, and build paths.',
    ],
    strategy: [
      'Players who prefer planning over reflex execution.',
      'Best for players who enjoy turn-by-turn tradeoffs.',
      'For players who like careful choices under pressure.',
    ],
    puzzle: [
      'Players who enjoy clear rules and clever solutions.',
      'Best for players who like reading clues patiently.',
      'For players who prefer logic over spectacle.',
    ],
    platformer: [
      'Players who enjoy precise movement challenges.',
      'Best for players who like retries and clean controls.',
      'For players who value input feel over story sprawl.',
    ],
    shooter: [
      'Players who enjoy reflex loops and score pressure.',
      'Best for players who like short, skill-based stages.',
      'For players who want aim checks over long campaigns.',
    ],
    simulation: [
      'Players who enjoy routine goals and steady upgrades.',
      'Best for players who like low-pressure optimization.',
      'For players who prefer systems to spectacle.',
    ],
    rpg: [
      'Players who enjoy builds, parties, and quest decisions.',
      'Best for players who like long-form character growth.',
      'For players who prefer progression planning.',
    ],
    adventure: [
      'Players who enjoy exploration-led progression.',
      'Best for players who like discovery over min-maxing.',
      'For players who want atmosphere and light navigation.',
    ],
    action: [
      'Players who enjoy responsive combat challenges.',
      'Best for players who like reflex tests with clear stakes.',
      'For players who want active play over menu planning.',
    ],
    default: [
      'Players who know their genre taste before checkout.',
      'Best for players with a clear fit, not impulse buyers.',
      'For players who compare fit before following hype.',
    ],
  },
  'zh-hans': {
    rogue: ['适合喜欢反复跑局和研究构筑的玩家。', '适合能接受失败重开、愿意试套路的玩家。', '适合把随机性当成乐趣的玩家。'],
    strategy: ['适合喜欢先规划再行动的玩家。', '适合愿意慢慢权衡每一步的玩家。', '适合偏爱脑内推演而非拼反应的玩家。'],
    puzzle: ['适合喜欢读线索、自己解开的玩家。', '适合偏爱规则清楚、答案聪明的玩家。', '适合不急着通关、愿意想一想的玩家。'],
    platformer: ['适合喜欢精准操作和反复练手的玩家。', '适合看重手感、能接受重试的玩家。', '适合偏爱关卡挑战而非长剧情的玩家。'],
    shooter: ['适合喜欢反应考验和短局循环的玩家。', '适合想要技能压力而非长线养成的玩家。', '适合看重操作反馈和得分感的玩家。'],
    simulation: ['适合喜欢日常目标和稳步升级的玩家。', '适合愿意慢慢经营、优化流程的玩家。', '适合偏爱系统循环而非强剧情的玩家。'],
    rpg: ['适合喜欢角色成长和配队取舍的玩家。', '适合愿意研究成长路线、推进任务的玩家。', '适合偏爱长线养成和菜单决策的玩家。'],
    adventure: ['适合喜欢探索推进和轻度解谜的玩家。', '适合愿意自己找方向、不急着刷效率的玩家。', '适合偏爱发现感而非数值优化的玩家。'],
    action: ['适合喜欢主动操作和明确挑战的玩家。', '适合想要反应压力、但不想只看剧情的玩家。', '适合偏爱战斗手感而非纯收集的玩家。'],
    default: ['适合先看口味匹配、再决定下单的玩家。', '适合明确知道自己想要哪类体验的玩家。', '适合不靠热度冲动入手的玩家。'],
  },
  ja: {
    rogue: ['リトライとビルド研究が好きな人。', '失敗込みで試行錯誤したい人向け。', 'ランダム性を楽しみに変えられる人。'],
    strategy: ['動く前に考える遊びが好きな人。', '一手ずつ重みを読める人向け。', '反射神経より読み合いを重視する人。'],
    puzzle: ['手がかりを読み解くのが好きな人。', '明快なルールと納得感を求める人。', '派手さより論理の気持ちよさを選ぶ人。'],
    platformer: ['精密操作とリトライが苦にならない人。', '入力感とステージ挑戦を重視する人。', '長い物語より操作課題を求める人。'],
    shooter: ['反射神経と短い挑戦を楽しめる人。', 'スコアや腕前更新に燃える人向け。', '長編より技能チェックを求める人。'],
    simulation: ['日課とアップグレードが好きな人。', 'ゆっくり最適化する遊びが合う人。', '派手さよりシステム循環を好む人。'],
    rpg: ['育成とパーティー選択を楽しみたい人。', '成長計画をじっくり考えたい人。', 'メニュー判断も遊びに含めたい人。'],
    adventure: ['探索で進む遊びが好きな人。', '発見重視で寄り道できる人向け。', '効率より雰囲気と道探しを選ぶ人。'],
    action: ['手触りのあるアクション挑戦が好きな人。', '明確なリスク付きの反射テストが合う人。', '見るだけより自分で動きたい人。'],
    default: ['買う前に相性を見極めたい人。', '流行より自分の好みを優先する人。', 'ジャンル適性を先に確認する人。'],
  },
  fr: {
    rogue: ['Joueurs qui aiment relancer et tester des builds.', 'Pour qui accepte l’échec comme outil d’essai.', 'Joueurs qui aiment risque, hasard et progression.'],
    strategy: ['Joueurs qui préfèrent planifier avant d’agir.', 'Pour qui aime peser chaque décision.', 'Joueurs qui veulent réfléchir plus que réagir.'],
    puzzle: ['Joueurs qui aiment lire les indices.', 'Pour qui préfère logique claire et solutions nettes.', 'Joueurs qui choisissent la réflexion au spectacle.'],
    platformer: ['Joueurs qui aiment précision et reprises.', 'Pour qui juge surtout la sensation de contrôle.', 'Joueurs qui veulent du défi de niveau.'],
    shooter: ['Joueurs qui aiment réflexes et pression de score.', 'Pour qui préfère les défis courts et techniques.', 'Joueurs qui veulent tester leur adresse.'],
    simulation: ['Joueurs qui aiment routines et améliorations.', 'Pour qui aime optimiser sans forte pression.', 'Joueurs qui préfèrent les systèmes au spectacle.'],
    rpg: ['Joueurs qui aiment progression et choix de builds.', 'Pour qui aime penser équipe et quêtes.', 'Joueurs qui veulent planifier leur montée en puissance.'],
    adventure: ['Joueurs qui aiment progresser par l’exploration.', 'Pour qui aime découvrir sans tout optimiser.', 'Joueurs qui veulent ambiance et orientation légère.'],
    action: ['Joueurs qui aiment les défis d’action réactifs.', 'Pour qui veut des réflexes avec enjeux clairs.', 'Joueurs qui préfèrent agir plutôt que gérer des menus.'],
    default: ['Joueurs qui vérifient l’affinité avant l’achat.', 'Pour qui connaît déjà ses goûts de genre.', 'Joueurs qui suivent leur goût plutôt que la hype.'],
  },
  es: {
    rogue: ['Jugadores que disfrutan runs y builds cambiantes.', 'Para quien acepta fallar y probar otra ruta.', 'Jugadores que convierten el azar en diversión.'],
    strategy: ['Jugadores que prefieren planear antes de actuar.', 'Para quien disfruta sopesar cada decisión.', 'Jugadores que valoran pensar más que reaccionar.'],
    puzzle: ['Jugadores que disfrutan leer pistas.', 'Para quien prefiere reglas claras y soluciones limpias.', 'Jugadores que eligen lógica antes que espectáculo.'],
    platformer: ['Jugadores que disfrutan precisión y reintentos.', 'Para quien valora controles limpios.', 'Jugadores que buscan reto de niveles.'],
    shooter: ['Jugadores que disfrutan reflejos y presión de puntos.', 'Para quien prefiere retos cortos y técnicos.', 'Jugadores que quieren poner a prueba la puntería.'],
    simulation: ['Jugadores que disfrutan rutinas y mejoras constantes.', 'Para quien optimiza sin demasiada presión.', 'Jugadores que prefieren sistemas al espectáculo.'],
    rpg: ['Jugadores que disfrutan progresión y builds.', 'Para quien piensa en equipo, rutas y misiones.', 'Jugadores que quieren planificar su avance.'],
    adventure: ['Jugadores que disfrutan progresar explorando.', 'Para quien descubre sin obsesionarse con optimizar.', 'Jugadores que buscan ambiente y orientación ligera.'],
    action: ['Jugadores que disfrutan acción con respuesta clara.', 'Para quien quiere reflejos con riesgos claros.', 'Jugadores que prefieren actuar antes que gestionar menús.'],
    default: ['Jugadores que revisan el encaje antes de comprar.', 'Para quien conoce bien sus gustos de género.', 'Jugadores que siguen su gusto, no la moda.'],
  },
  de: {
    rogue: ['Spieler, die Runs und Build-Experimente mögen.', 'Für alle, die Scheitern als Versuch sehen.', 'Spieler, die Zufall als Reiz akzeptieren.'],
    strategy: ['Spieler, die lieber planen als reagieren.', 'Für alle, die jede Entscheidung abwägen.', 'Spieler, die Denkspiele mehr schätzen als Reflexe.'],
    puzzle: ['Spieler, die Hinweise gern selbst lesen.', 'Für klare Regeln und saubere Lösungen.', 'Spieler, die Logik vor Spektakel stellen.'],
    platformer: ['Spieler, die Präzision und Retries mögen.', 'Für alle, die saubere Steuerung schätzen.', 'Spieler, die Level-Herausforderungen suchen.'],
    shooter: ['Spieler, die Reflexe und Score-Druck mögen.', 'Für kurze, technische Herausforderungen.', 'Spieler, die Zielgefühl statt Langkampagne wollen.'],
    simulation: ['Spieler, die Routinen und Upgrades mögen.', 'Für alle, die gern ohne Druck optimieren.', 'Spieler, die Systeme mehr mögen als Spektakel.'],
    rpg: ['Spieler, die Fortschritt und Builds mögen.', 'Für alle, die Team- und Questplanung mögen.', 'Spieler, die Wachstum gern vorausplanen.'],
    adventure: ['Spieler, die Fortschritt durch Erkunden mögen.', 'Für Entdecker ohne Optimierungszwang.', 'Spieler, die Stimmung und Orientierung suchen.'],
    action: ['Spieler, die reaktive Action-Herausforderung mögen.', 'Für Reflexdruck mit klaren Einsätzen.', 'Spieler, die lieber handeln als Menüs pflegen.'],
    default: ['Spieler, die vor dem Kauf die Passung prüfen.', 'Für alle, die ihren Genre-Geschmack kennen.', 'Spieler, die Geschmack über Hype stellen.'],
  },
  pt: {
    rogue: ['Jogadores que curtem runs e testes de builds.', 'Para quem aceita falhar e tentar outra rota.', 'Jogadores que transformam acaso em diversão.'],
    strategy: ['Jogadores que preferem planejar antes de agir.', 'Para quem gosta de pesar cada decisão.', 'Jogadores que valorizam pensar mais que reagir.'],
    puzzle: ['Jogadores que gostam de ler pistas.', 'Para quem prefere regras claras e soluções limpas.', 'Jogadores que escolhem lógica em vez de espetáculo.'],
    platformer: ['Jogadores que curtem precisão e repetição.', 'Para quem valoriza controles limpos.', 'Jogadores que buscam desafio de fases.'],
    shooter: ['Jogadores que curtem reflexos e pressão de score.', 'Para quem prefere desafios curtos e técnicos.', 'Jogadores que querem testar mira e execução.'],
    simulation: ['Jogadores que curtem rotinas e upgrades constantes.', 'Para quem otimiza sem tanta pressão.', 'Jogadores que preferem sistemas ao espetáculo.'],
    rpg: ['Jogadores que curtem progressão e builds.', 'Para quem pensa em equipe, rotas e missões.', 'Jogadores que querem planejar o avanço.'],
    adventure: ['Jogadores que curtem avançar explorando.', 'Para quem descobre sem otimizar tudo.', 'Jogadores que buscam clima e orientação leve.'],
    action: ['Jogadores que curtem ação com resposta clara.', 'Para quem quer reflexos com riscos claros.', 'Jogadores que preferem agir a gerenciar menus.'],
    default: ['Jogadores que checam encaixe antes da compra.', 'Para quem conhece bem o próprio gosto.', 'Jogadores que seguem gosto, não hype.'],
  },
};

const DYNAMIC_AUDIENCE = {
  en: {
    personas: {
      rogue: ['Run-focused players', 'Build tinkerers', 'Reset-friendly players', 'Risk-tolerant players'],
      strategy: ['Tactical players', 'Planning-first players', 'Careful decision-makers', 'Board-state readers'],
      puzzle: ['Puzzle-minded players', 'Patient clue readers', 'Logic-first players', 'Slow-burn solvers'],
      platformer: ['Precision players', 'Retry-friendly players', 'Control-feel players', 'Stage-challenge fans'],
      shooter: ['Score chasers', 'Reflex players', 'Aim-focused players', 'Arcade-minded players'],
      simulation: ['Systems players', 'Routine builders', 'Optimization-minded players', 'Low-pressure planners'],
      rpg: ['Progression planners', 'Build-minded RPG fans', 'Party planners', 'Long-tail character builders'],
      adventure: ['Exploration-first players', 'Discovery-minded players', 'Atmosphere seekers', 'Route-curious players'],
      action: ['Combat-first players', 'Reflex-focused players', 'Hands-on challenge fans', 'Action-minded players'],
      default: ['Fit-conscious buyers', 'Genre-aware players', 'Taste-first players', 'Careful impulse-checkers'],
    },
    prefs: {
      rogue: ['build experiments', 'fresh runs', 'riskier choices', 'learning through failure', 'compact resets', 'changing routes'],
      strategy: ['planning windows', 'clear tradeoffs', 'pressure without twitch inputs', 'resource choices', 'deliberate turns', 'patient problem-solving'],
      puzzle: ['clean rules', 'quiet deduction', 'clue chains', 'earned solutions', 'low-noise challenges', 'thinking time'],
      platformer: ['tight inputs', 'fair retries', 'movement mastery', 'clean level goals', 'skill gates', 'practice loops'],
      shooter: ['short skill checks', 'score pressure', 'direct feedback', 'fast retries', 'execution tests', 'arcade pacing'],
      simulation: ['steady routines', 'small upgrades', 'long-tail goals', 'light optimization', 'repeatable chores', 'gentle planning'],
      rpg: ['growth choices', 'party planning', 'menu decisions', 'quest pacing', 'build identity', 'stat tradeoffs'],
      adventure: ['guided wandering', 'light navigation', 'environmental discovery', 'story texture', 'route curiosity', 'atmosphere over grind'],
      action: ['responsive combat', 'readable threats', 'active inputs', 'clear skill checks', 'fight rhythm', 'less menu downtime'],
      default: ['genre fit', 'clear expectations', 'taste over hype', 'price discipline', 'low-regret buying', 'fit before FOMO'],
    },
    make: (persona, pref, variant) => variant % 2 === 0 ? `${persona} who value ${pref}.` : `${persona} who prefer ${pref}.`,
  },
  'zh-hans': {
    personas: {
      rogue: ['爱跑局的玩家', '喜欢试构筑的玩家', '能接受重开的玩家', '愿意冒险的玩家'],
      strategy: ['偏策略的玩家', '先规划再行动的玩家', '重视取舍的玩家', '爱读局势的玩家'],
      puzzle: ['爱解谜的玩家', '愿意读线索的玩家', '偏逻辑的玩家', '喜欢慢慢想的玩家'],
      platformer: ['重视手感的玩家', '能接受重试的玩家', '喜欢精准操作的玩家', '爱关卡挑战的玩家'],
      shooter: ['喜欢得分压力的玩家', '反应型玩家', '重视瞄准反馈的玩家', '街机取向玩家'],
      simulation: ['系统型玩家', '喜欢日常循环的玩家', '愿意慢慢优化的玩家', '低压力规划型玩家'],
      rpg: ['喜欢成长规划的玩家', '爱研究配队的玩家', '菜单决策型玩家', '长线养成玩家'],
      adventure: ['探索优先的玩家', '喜欢自己发现的玩家', '重视氛围的玩家', '愿意找路的玩家'],
      action: ['战斗优先的玩家', '反应型动作玩家', '喜欢亲手操作的玩家', '动作挑战型玩家'],
      default: ['先看适配度的玩家', '清楚自己口味的玩家', '重视口味判断的玩家', '会克制冲动的玩家'],
    },
    prefs: {
      rogue: ['构筑实验', '每局新鲜感', '风险选择', '从失败里学习', '短循环重开', '路线变化'],
      strategy: ['规划窗口', '清楚取舍', '非拼反应的压力', '资源选择', '慢慢推演', '耐心解题'],
      puzzle: ['清楚规则', '安静推理', '线索串联', '解开后的反馈', '低噪音挑战', '思考时间'],
      platformer: ['精准输入', '公平重试', '移动熟练度', '明确关卡目标', '技术门槛', '练习循环'],
      shooter: ['短局技能考验', '得分压力', '直接反馈', '快速重试', '执行力测试', '街机节奏'],
      simulation: ['稳定日常', '小幅升级', '长期目标', '轻度优化', '重复劳动', '温和规划'],
      rpg: ['成长取舍', '队伍规划', '菜单决策', '任务节奏', '构筑身份', '数值权衡'],
      adventure: ['带方向的闲逛', '轻度找路', '环境发现', '故事氛围', '路线好奇心', '少刷多逛'],
      action: ['战斗手感', '可读威胁', '主动输入', '明确技术考验', '交战节奏', '少菜单停顿'],
      default: ['类型适配', '预期清楚', '口味大于热度', '价格克制', '低后悔下单', '先适配后种草'],
    },
    make: (persona, pref, variant) => variant % 2 === 0 ? `${persona}，看重${pref}。` : `${persona}，偏爱${pref}。`,
  },
  ja: {
    personas: {
      rogue: ['周回好き', 'ビルド研究派', 'リトライ耐性のある人', 'リスクを楽しめる人'],
      strategy: ['戦術派', '計画重視の人', '判断を急がない人', '盤面を読む人'],
      puzzle: ['謎解き好き', '手がかりを読む人', '論理重視の人', 'じっくり解く人'],
      platformer: ['精密操作派', 'リトライ好き', '操作感重視の人', 'ステージ挑戦派'],
      shooter: ['スコア派', '反射神経派', 'エイム重視の人', 'アーケード派'],
      simulation: ['システム派', '日課好き', '最適化好き', '低圧プランナー'],
      rpg: ['育成計画派', 'ビルド重視のRPG好き', 'パーティーを考える人', '長期育成派'],
      adventure: ['探索重視の人', '発見好き', '雰囲気重視の人', '道探しが好きな人'],
      action: ['戦闘重視の人', '反射神経派', '手を動かしたい人', 'アクション挑戦派'],
      default: ['相性重視の人', 'ジャンル嗜好が明確な人', '好み優先の人', '衝動買いを避けたい人'],
    },
    prefs: {
      rogue: ['ビルド実験', '新鮮な周回', 'リスク選択', '失敗からの学習', '短い再挑戦', 'ルート変化'],
      strategy: ['計画の余地', '明確な取捨選択', '反射に頼らない圧', 'リソース判断', 'じっくり推理', '辛抱強い問題解決'],
      puzzle: ['明快なルール', '静かな推理', '手がかりの連鎖', '納得できる解法', '低刺激の挑戦', '考える時間'],
      platformer: ['正確な入力', '納得できるリトライ', '移動の習熟', '明確なステージ目標', '技術の壁', '練習ループ'],
      shooter: ['短い技能チェック', 'スコア圧', '直接的な反応', '素早い再挑戦', '実行力テスト', 'アーケード感'],
      simulation: ['安定した日課', '小さなアップグレード', '長期目標', '軽い最適化', '反復作業', '穏やかな計画'],
      rpg: ['成長選択', 'パーティー計画', 'メニュー判断', 'クエストの歩幅', 'ビルドの個性', '数値の取捨選択'],
      adventure: ['導線ある寄り道', '軽い道探し', '環境発見', '物語の手触り', 'ルートへの好奇心', '雰囲気重視'],
      action: ['反応の良い戦闘', '読みやすい脅威', '能動的な入力', '明確な腕試し', '戦闘リズム', 'メニュー待ちの少なさ'],
      default: ['ジャンル相性', '明確な期待値', '流行より好み', '価格への慎重さ', '後悔しにくい買い方', '相性確認'],
    },
    make: (persona, pref, variant) => variant % 2 === 0 ? `${pref}を重視する${persona}。` : `${pref}を好む${persona}。`,
  },
  fr: {
    personas: {
      rogue: ['Joueurs de runs', 'Bidouilleurs de builds', 'Joueurs patients avec l’échec', 'Amateurs de risque'],
      strategy: ['Joueurs tactiques', 'Planificateurs', 'Décideurs prudents', 'Lecteurs de situation'],
      puzzle: ['Esprits puzzle', 'Lecteurs d’indices', 'Joueurs logiques', 'Solveurs patients'],
      platformer: ['Joueurs de précision', 'Amateurs de reprises', 'Fans de contrôle net', 'Fans de défis de niveau'],
      shooter: ['Chasseurs de score', 'Joueurs réflexes', 'Joueurs d’adresse', 'Profils arcade'],
      simulation: ['Joueurs systèmes', 'Bâtisseurs de routines', 'Optimiseurs tranquilles', 'Planificateurs posés'],
      rpg: ['Planificateurs de progression', 'Fans de builds RPG', 'Penseurs d’équipe', 'Fans de progression longue'],
      adventure: ['Explorateurs', 'Joueurs curieux', 'Chercheurs d’ambiance', 'Amateurs de routes'],
      action: ['Joueurs combatifs', 'Profils réflexes', 'Fans de défi actif', 'Amateurs d’action'],
      default: ['Acheteurs prudents', 'Joueurs sûrs de leurs goûts', 'Profils affinité d’abord', 'Acheteurs anti-FOMO'],
    },
    prefs: {
      rogue: ['les essais de builds', 'les runs variés', 'les choix risqués', 'apprendre par l’échec', 'les relances courtes', 'les routes changeantes'],
      strategy: ['la planification', 'les compromis nets', 'la pression sans réflexes', 'les choix de ressources', 'la réflexion posée', 'les problèmes patients'],
      puzzle: ['les règles claires', 'la déduction calme', 'les chaînes d’indices', 'les solutions méritées', 'les défis lisibles', 'le temps de réflexion'],
      platformer: ['les inputs précis', 'les reprises justes', 'la maîtrise du mouvement', 'les objectifs nets', 'les paliers techniques', 'les boucles d’entraînement'],
      shooter: ['les tests courts', 'la pression du score', 'le feedback direct', 'les reprises rapides', 'l’exécution', 'le rythme arcade'],
      simulation: ['les routines stables', 'les petites améliorations', 'les objectifs longs', 'l’optimisation légère', 'les tâches répétées', 'la planification douce'],
      rpg: ['les choix de progression', 'la planification d’équipe', 'les décisions de menus', 'le rythme des quêtes', 'l’identité de build', 'les compromis de stats'],
      adventure: ['l’exploration guidée', 'l’orientation légère', 'la découverte', 'la texture narrative', 'la curiosité de route', 'l’ambiance sans grind'],
      action: ['le combat réactif', 'les menaces lisibles', 'les inputs actifs', 'les tests clairs', 'le rythme de combat', 'moins de menus'],
      default: ['l’affinité de genre', 'les attentes claires', 'le goût avant la hype', 'la prudence prix', 'l’achat sans regret', 'l’affinité avant le FOMO'],
    },
    make: (persona, pref, variant) => variant % 2 === 0 ? `${persona} qui valorisent ${pref}.` : `${persona} qui préfèrent ${pref}.`,
  },
  es: {
    personas: {
      rogue: ['Jugadores de runs', 'Jugadores de builds', 'Jugadores pacientes con el fallo', 'Amantes del riesgo'],
      strategy: ['Jugadores tácticos', 'Planificadores', 'Decisores pacientes', 'Lectores del tablero'],
      puzzle: ['Jugadores de puzle', 'Lectores de pistas', 'Jugadores lógicos', 'Solucionadores pacientes'],
      platformer: ['Jugadores de precisión', 'Fans del reintento', 'Jugadores de control fino', 'Fans del reto de niveles'],
      shooter: ['Cazadores de puntuación', 'Jugadores de reflejos', 'Jugadores de puntería', 'Perfiles arcade'],
      simulation: ['Jugadores de sistemas', 'Constructores de rutinas', 'Optimizadores tranquilos', 'Planificadores sin presión'],
      rpg: ['Planificadores de progreso', 'Fans de builds RPG', 'Pensadores de equipo', 'Fans de progresión larga'],
      adventure: ['Exploradores', 'Jugadores curiosos', 'Buscadores de ambiente', 'Jugadores de rutas'],
      action: ['Jugadores de combate', 'Perfiles de reflejos', 'Fans del reto activo', 'Jugadores de acción'],
      default: ['Compradores prudentes', 'Jugadores con gustos claros', 'Perfiles de encaje primero', 'Compradores anti-FOMO'],
    },
    prefs: {
      rogue: ['experimentos de builds', 'runs variados', 'decisiones arriesgadas', 'aprender fallando', 'reinicios cortos', 'rutas cambiantes'],
      strategy: ['ventanas de planificación', 'compromisos claros', 'presión sin reflejos', 'decisiones de recursos', 'pensar con calma', 'problemas pacientes'],
      puzzle: ['reglas claras', 'deducción tranquila', 'cadenas de pistas', 'soluciones ganadas', 'retos limpios', 'tiempo para pensar'],
      platformer: ['inputs precisos', 'reintentos justos', 'dominio del movimiento', 'metas claras de nivel', 'barreras técnicas', 'bucles de práctica'],
      shooter: ['pruebas cortas de habilidad', 'presión de puntuación', 'respuesta directa', 'reintentos rápidos', 'ejecución', 'ritmo arcade'],
      simulation: ['rutinas estables', 'mejoras pequeñas', 'metas largas', 'optimización ligera', 'tareas repetibles', 'planificación suave'],
      rpg: ['decisiones de progreso', 'planificación de equipo', 'menús con peso', 'ritmo de misiones', 'identidad de build', 'compromisos de stats'],
      adventure: ['exploración guiada', 'orientación ligera', 'descubrimiento ambiental', 'textura narrativa', 'curiosidad de rutas', 'ambiente sin farmeo'],
      action: ['combate con respuesta', 'amenazas legibles', 'inputs activos', 'pruebas claras', 'ritmo de combate', 'menos pausa de menús'],
      default: ['encaje de género', 'expectativas claras', 'gusto antes que hype', 'prudencia con el precio', 'compra sin arrepentirse', 'encaje antes que FOMO'],
    },
    make: (persona, pref, variant) => variant % 2 === 0 ? `${persona} que valoran ${pref}.` : `${persona} que prefieren ${pref}.`,
  },
  de: {
    personas: {
      rogue: ['Run-Spieler', 'Build-Tüftler', 'Retry-feste Spieler', 'Risikofreudige Spieler'],
      strategy: ['Taktiker', 'Planer', 'Geduldige Entscheider', 'Lage-Leser'],
      puzzle: ['Puzzle-Köpfe', 'Hinweis-Leser', 'Logikspieler', 'Geduldige Knobler'],
      platformer: ['Präzisionsspieler', 'Retry-Fans', 'Steuerungsfans', 'Level-Challenge-Fans'],
      shooter: ['Score-Jäger', 'Reflexspieler', 'Zielgefühl-Spieler', 'Arcade-Spieler'],
      simulation: ['Systemspieler', 'Routinebauer', 'Ruhige Optimierer', 'Entspannte Planer'],
      rpg: ['Fortschrittsplaner', 'Build-RPG-Fans', 'Teamplaner', 'Langzeit-Aufbauer'],
      adventure: ['Erkundungsspieler', 'Entdecker', 'Stimmungsfans', 'Routen-Neugierige'],
      action: ['Kampfspieler', 'Reflexspieler', 'Aktive Herausforderungsfans', 'Action-Spieler'],
      default: ['Passungsbewusste Käufer', 'Genre-sichere Spieler', 'Geschmacksorientierte Spieler', 'Anti-FOMO-Käufer'],
    },
    prefs: {
      rogue: ['Build-Experimente', 'frische Runs', 'riskante Entscheidungen', 'Lernen durch Scheitern', 'kurze Neustarts', 'wechselnde Routen'],
      strategy: ['Planungsfenster', 'klare Kompromisse', 'Druck ohne Twitch', 'Ressourcenwahl', 'ruhiges Denken', 'geduldige Probleme'],
      puzzle: ['klare Regeln', 'ruhige Deduktion', 'Hinweisketten', 'verdiente Lösungen', 'lesbare Rätsel', 'Denkzeit'],
      platformer: ['präzise Eingaben', 'faire Retries', 'Bewegungsmeisterung', 'klare Levelziele', 'Skill-Gates', 'Übungsschleifen'],
      shooter: ['kurze Skillchecks', 'Score-Druck', 'direktes Feedback', 'schnelle Retries', 'Ausführungstests', 'Arcade-Tempo'],
      simulation: ['stabile Routinen', 'kleine Upgrades', 'Langzeitziele', 'leichte Optimierung', 'wiederholbare Aufgaben', 'sanfte Planung'],
      rpg: ['Fortschrittswahl', 'Teamplanung', 'Menüentscheidungen', 'Quest-Tempo', 'Build-Identität', 'Stat-Kompromisse'],
      adventure: ['geführtes Streunen', 'leichte Orientierung', 'Umgebungsentdeckung', 'Story-Textur', 'Routen-Neugier', 'Stimmung ohne Grind'],
      action: ['reaktive Kämpfe', 'lesbare Gefahren', 'aktive Eingaben', 'klare Skillchecks', 'Kampfrhythmus', 'weniger Menüpausen'],
      default: ['Genre-Passung', 'klare Erwartungen', 'Geschmack vor Hype', 'Preisdisziplin', 'Käufe ohne Reue', 'Passung vor FOMO'],
    },
    make: (persona, pref, variant) => variant % 2 === 0 ? `${persona}, die ${pref} schätzen.` : `${persona}, die ${pref} bevorzugen.`,
  },
  pt: {
    personas: {
      rogue: ['Jogadores de runs', 'Testadores de builds', 'Jogadores pacientes com falha', 'Fãs de risco'],
      strategy: ['Jogadores táticos', 'Planejadores', 'Decisores pacientes', 'Leitores de cenário'],
      puzzle: ['Jogadores de puzzle', 'Leitores de pistas', 'Jogadores lógicos', 'Solucionadores pacientes'],
      platformer: ['Jogadores de precisão', 'Fãs de repetição', 'Jogadores de controle fino', 'Fãs de desafio de fases'],
      shooter: ['Caçadores de score', 'Jogadores de reflexo', 'Jogadores de mira', 'Perfis arcade'],
      simulation: ['Jogadores de sistemas', 'Construtores de rotina', 'Otimizadores tranquilos', 'Planejadores sem pressão'],
      rpg: ['Planejadores de progresso', 'Fãs de builds RPG', 'Pensadores de equipe', 'Fãs de progressão longa'],
      adventure: ['Exploradores', 'Jogadores curiosos', 'Buscadores de clima', 'Jogadores de rotas'],
      action: ['Jogadores de combate', 'Perfis de reflexo', 'Fãs de desafio ativo', 'Jogadores de ação'],
      default: ['Compradores prudentes', 'Jogadores com gosto claro', 'Perfis de encaixe primeiro', 'Compradores anti-FOMO'],
    },
    prefs: {
      rogue: ['experimentos de builds', 'runs variados', 'escolhas arriscadas', 'aprender falhando', 'reinícios curtos', 'rotas mutáveis'],
      strategy: ['janelas de planejamento', 'trocas claras', 'pressão sem reflexo', 'decisões de recursos', 'pensar com calma', 'problemas pacientes'],
      puzzle: ['regras claras', 'dedução tranquila', 'cadeias de pistas', 'soluções merecidas', 'desafios limpos', 'tempo para pensar'],
      platformer: ['inputs precisos', 'repetições justas', 'domínio do movimento', 'metas claras de fase', 'barreiras técnicas', 'ciclos de prática'],
      shooter: ['testes curtos de habilidade', 'pressão de score', 'resposta direta', 'repetições rápidas', 'execução', 'ritmo arcade'],
      simulation: ['rotinas estáveis', 'pequenos upgrades', 'metas longas', 'otimização leve', 'tarefas repetíveis', 'planejamento suave'],
      rpg: ['decisões de progresso', 'planejamento de equipe', 'menus com peso', 'ritmo de missões', 'identidade de build', 'trocas de atributos'],
      adventure: ['exploração guiada', 'orientação leve', 'descoberta ambiental', 'textura narrativa', 'curiosidade de rotas', 'clima sem grind'],
      action: ['combate responsivo', 'ameaças legíveis', 'inputs ativos', 'testes claros', 'ritmo de combate', 'menos pausa em menus'],
      default: ['encaixe de gênero', 'expectativas claras', 'gosto antes de hype', 'cuidado com preço', 'compra sem arrependimento', 'encaixe antes do FOMO'],
    },
    make: (persona, pref, variant) => variant % 2 === 0 ? `${persona} que valorizam ${pref}.` : `${persona} que preferem ${pref}.`,
  },
};

function dynamicAudienceCandidates(locale, category, seed) {
  const language = DYNAMIC_AUDIENCE[locale] ? locale : 'en';
  const data = DYNAMIC_AUDIENCE[language];
  const personas = data.personas[category] || data.personas.default;
  const prefs = data.prefs[category] || data.prefs.default;
  const candidates = [];
  const start = stableHash(seed);
  for (let i = 0; i < personas.length * prefs.length * 2; i += 1) {
    const persona = personas[(start + i) % personas.length];
    const pref = prefs[(Math.floor((start + i) / personas.length) + i) % prefs.length];
    const value = data.make(persona, pref, i);
    candidates.push(value);
  }
  return [...new Set(candidates)];
}

function tooSimilarToExistingBestFor(value, current) {
  const text = normalizeComparable(value);
  const old = normalizeComparable(current || '');
  if (!text || !old) return false;
  return text === old || text.includes(old) || old.includes(text);
}
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/u);
  if (!match) return null;
  return {
    fm: yaml.load(match[1]) || {},
    raw: match[1],
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

function normalizeComparable(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/[《》『』「」“”"'’‘（）()]/g, '')
    .replace(/[：:—–\-_,，、.。!！?？;；]/g, '')
    .replace(/\s+/g, '');
}

function keywordSet(value) {
  return new Set(String(value || '')
    .toLowerCase()
    .replace(/[™®©《》『』「」“”"'’‘（）()：:—–\-_,，.。!！?？;；]/g, ' ')
    .split(/\s+|、|，|\/|\bet\b|\by\b|\bund\b|\be\b|\band\b|と/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3));
}

function keywordOverlapStats(a, b) {
  const left = keywordSet(a);
  const right = keywordSet(b);
  if (!left.size || !right.size) return { shared: 0, ratio: 0 };
  let shared = 0;
  for (const key of left) if (right.has(key)) shared += 1;
  return { shared, ratio: shared / Math.min(left.size, right.size) };
}

function overlapsCommunityVibe(fm, value = fm.bestFor) {
  const best = normalizeComparable(value || '');
  const vibe = normalizeComparable(fm.communityVibe || '');
  if (!best || !vibe) return false;
  if (best === vibe || best.includes(vibe) || vibe.includes(best)) return true;
  const stats = keywordOverlapStats(value, fm.communityVibe);
  return stats.shared >= 2 && stats.ratio >= 0.45;
}

function isGenericBestFor(value) {
  const text = String(value || '').trim();
  return text !== '' && GENERIC_BEST_FOR_PATTERNS.some((pattern) => pattern.test(text));
}

function inferCategory(fm) {
  const text = [fm.playStyle, ...(Array.isArray(fm.tags) ? fm.tags : [])]
    .join(' ')
    .toLowerCase();
  const has = (...needles) => needles.some((needle) => text.includes(needle));
  if (has('rogue', 'ローグ', 'roguelite')) return 'rogue';
  if (has('strategy', 'tactical', '策略', '戦略', 'stratégie', 'estrategia', 'strategie')) return 'strategy';
  if (has('puzzle', 'puzle', 'quebra-cabeça', 'rätsel', '謎', '解谜', '谜题')) return 'puzzle';
  if (has('platform', 'platformer', '平台', 'プラット', 'plattformer')) return 'platformer';
  if (has('shooter', 'arcade', '射击', 'シューティング')) return 'shooter';
  if (has('simulation', 'simulación', 'simulação', '模拟', 'シミュ')) return 'simulation';
  if (has('racing', 'race', '竞速', 'レース', 'rennspiel', 'carreras', 'corrida')) return 'shooter';
  if (has('rpg', 'role-playing', 'rol', 'rollenspiel', '角色', 'ロール')) return 'rpg';
  if (has('adventure', '冒险', 'アドベンチャー', 'aventure', 'aventura', 'abenteuer')) return 'adventure';
  if (has('action', '动作', 'アクション', 'acción', 'ação')) return 'action';
  return 'default';
}

function stableHash(value) {
  let hash = 0;
  for (const char of String(value || '')) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

function replacementFor(fm, locale, file) {
  const category = inferCategory(fm);
  for (const value of dynamicAudienceCandidates(locale, category, `${fm.gameTitle || ''}:${file}`)) {
    if (value.length <= 60 && !overlapsCommunityVibe(fm, value) && !tooSimilarToExistingBestFor(value, fm.bestFor)) {
      return { value, source: `${category}-audience` };
    }
  }
  for (const value of dynamicAudienceCandidates(locale, 'default', `${fm.gameTitle || ''}:${file}:default`)) {
    if (value.length <= 60 && !overlapsCommunityVibe(fm, value) && !tooSimilarToExistingBestFor(value, fm.bestFor)) {
      return { value, source: 'default-audience' };
    }
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

let scanned = 0;
let needingRepair = 0;
let proposed = 0;
let changed = 0;
let unresolved = 0;
const byLocale = new Map();
const samples = [];
const unresolvedSamples = [];

for (const file of listMarkdownFiles()) {
  const content = stripUtf8Bom(readFileSync(file, 'utf8'));
  const parsed = parseFrontmatter(content);
  if (!parsed) continue;
  scanned += 1;
  const locale = relative(POSTS_ROOT, file).split('/')[0];
  const current = parsed.fm.bestFor;
  const needsRepair = overlapsCommunityVibe(parsed.fm) || isGenericBestFor(current);
  if (!needsRepair) continue;

  needingRepair += 1;
  byLocale.set(locale, (byLocale.get(locale) || 0) + 1);
  const replacement = replacementFor(parsed.fm, locale, relative(process.cwd(), file));
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
    const newRaw = replaceFrontmatterField(parsed.raw, 'bestFor', replacement.value);
    const newContent = content.replace(parsed.fullMatch, `---\n${newRaw}\n---`);
    writeFileSync(file, newContent, 'utf8');
    changed += 1;
  }
}

console.log(`scanned articles: ${scanned}`);
console.log(`bestFor needing repair: ${needingRepair}`);
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
