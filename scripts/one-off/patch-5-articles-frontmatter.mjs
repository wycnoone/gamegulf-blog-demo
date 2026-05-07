#!/usr/bin/env node
/**
 * One-off: patch frontmatter for 5 newly generated articles to match
 * No Man's Sky / Hades editorial quality.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POSTS = join(__dirname, '..', '..', 'src', 'content', 'posts', 'en');

// Validation limits: whatItIs≤90, bestFor≤60, avoidIf≤72, consensusPraise≤82, mainFriction≤84, tldr≤160, communityVibe≤64
// Valid quickFilters: co_op, long_rpg, family_friendly, nintendo_first_party, short_sessions, under_20, great_on_sale, rarely_discounted
// faq answer must start with gameTitle

const PATCHES = {
  'cuphead-worth-it.md': {
    heroNote: "Studio MDHR's 1930s cartoon run-and-gun — hand-drawn animation, jazz soundtrack, tight boss patterns, and 2-player co-op.",
    whatItIs: "Run-and-gun with 1930s cartoon animation, boss-rush structure, and 2-player co-op.",
    bestFor: "Players who love challenging boss fights and hand-drawn art.",
    avoidIf: "You rage-quit easily — Cuphead's difficulty is the point.",
    consensusPraise: "Animation quality, boss design, and soundtrack are still unmatched in the genre.",
    mainFriction: "Difficulty wall on later bosses; some players bounce before finishing Isle 3.",
    playStyle: "Run-and-gun levels and boss rushes: dodge, dash, parry, switch weapons, use supers. Each boss has unique multi-phase patterns.",
    playtime: "10h main · 15h+ with DLC · replay-driven for S-ranks",
    timeCommitment: "10h for a first clear, 15h+ with The Delicious Last Course DLC, and much more if you chase S-ranks.",
    timeFit: "Time fit: ~10h main, replay-driven for S-ranks",
    quickFilters: ["short_sessions", "great_on_sale"],
    tldr: "Cuphead — 87 Metacritic; hand-drawn run-and-gun with brutal boss fights and 2-player co-op. At €8.37 in Brazil it is an easy buy.",
    faq: [
      { question: "Is Cuphead worth buying on Nintendo Switch in 2026?", answer: "Cuphead is worth buying on Nintendo Switch in 2026 if you enjoy challenging boss fights and hand-drawn 1930s animation. At GameGulf's tracked price of €8.37 on the Brazilian eShop, it is one of the best value action games on the platform." },
      { question: "How long is Cuphead?", answer: "Cuphead takes about 10 hours for a first playthrough, longer with The Delicious Last Course DLC. S-rank attempts and co-op replays add much more." },
      { question: "Does Cuphead have co-op on Switch?", answer: "Cuphead supports 2-player local co-op on Nintendo Switch. No online co-op." },
      { question: "Where should I check Nintendo Switch pricing?", answer: "Cuphead pricing is best checked on the GameGulf detail grid at https://www.gamegulf.com/detail/50pq42JLkJ3#currency-price so you can compare regions without guessing conversions." },
    ],
  },

  'hollow-knight-worth-it.md': {
    heroNote: "Team Cherry's Metroidvania benchmark — deep exploration, tight nail combat, 40+ bosses, and three free DLC packs.",
    whatItIs: "Metroidvania: interconnected world, nail combat, charms, 40+ bosses, and three free DLCs.",
    bestFor: "Explorers who love hidden paths and tough bosses.",
    avoidIf: "You need clear waypoints — it drops you in and says figure it out.",
    consensusPraise: "World design, boss roster, and free content make it one of gaming's best values.",
    mainFriction: "Getting lost is by design; some players lose momentum when the next goal is unclear",
    playStyle: "Side-scrolling Metroidvania: explore Hallownest, unlock movement abilities, equip charms, fight 40+ bosses. The map rewards backtracking.",
    playtime: "27h main · 42h+ extras · ~65h completionist",
    timeCommitment: "27 hours for the main story, 42+ with extras, and around 65 for full completion including all DLC.",
    timeFit: "Time fit: 27h main · 42h+ extras · ~65h completionist",
    quickFilters: ["long_rpg", "great_on_sale"],
    tldr: "Hollow Knight — 90 Metacritic; Metroidvania with 27h of content, 40+ bosses, and three free DLCs. At €4.69 in Brazil it is absurd value.",
    faq: [
      { question: "Is Hollow Knight worth buying on Nintendo Switch in 2026?", answer: "Hollow Knight is worth buying on Nintendo Switch in 2026 — 90 Metacritic, 27h+ of content, three free DLCs, and GameGulf shows €4.69 on the Brazilian eShop." },
      { question: "How long is Hollow Knight?", answer: "Hollow Knight takes about 27 hours for the main story, 42+ hours with side content, and around 65 hours for full completion including all DLC." },
      { question: "Is Hollow Knight still getting updates?", answer: "Hollow Knight's final DLC (Godmaster) shipped in 2018. Silksong is a separate sequel, not an update to the original." },
      { question: "Where should I check Nintendo Switch pricing?", answer: "Hollow Knight pricing is best checked on the GameGulf detail grid at https://www.gamegulf.com/detail/6mHaDw6g1U5#currency-price so you can compare regions without guessing conversions." },
    ],
  },

  'dead-cells-worth-it.md': {
    heroNote: "Motion Twin's roguelite Metroidvania — procedural runs, 200+ weapons, fast melee combat, and years of updates.",
    whatItIs: "Roguelite Metroidvania: procedural levels, 200+ weapons, fast melee, permanent upgrades.",
    bestFor: "Action fans who want a roguelite with 200+ weapons.",
    avoidIf: "You dislike restarting after death — the roguelite loop is the design.",
    consensusPraise: "Combat feel, build variety, and free updates make it a top roguelite on Switch.",
    mainFriction: "RNG can make or break a run; some burn out before unlocking the full weapon pool.",
    playStyle: "Side-scrolling roguelite: pick routes through procedural biomes, find weapons and skills, fight bosses. Permanent runes unlock new paths.",
    playtime: "20h to see credits · 60h+ for full biome clear · replay-driven",
    timeCommitment: "About 20 hours to reach the first ending, 60+ to see all biomes and bosses.",
    timeFit: "Time fit: ~20h to credits, replay-driven",
    quickFilters: ["short_sessions", "great_on_sale"],
    tldr: "Dead Cells — 89 Metacritic; roguelite Metroidvania with 200+ weapons. At €8.38 in Brazil it is a strong buy for action fans.",
    faq: [
      { question: "Is Dead Cells worth buying on Nintendo Switch in 2026?", answer: "Dead Cells is worth buying on Nintendo Switch in 2026 if you enjoy roguelite action. 89 Metacritic, 200+ weapons, and years of free updates. GameGulf shows €8.38 on the Brazilian eShop." },
      { question: "How long is Dead Cells?", answer: "Dead Cells takes about 20 hours to reach the first ending, but the roguelite structure means you can keep playing for 60+ hours across higher difficulty tiers." },
      { question: "Does Dead Cells have a story?", answer: "Dead Cells has light environmental storytelling — the focus is on combat and build variety, not narrative." },
      { question: "Where should I check Nintendo Switch pricing?", answer: "Dead Cells pricing is best checked on the GameGulf detail grid at https://www.gamegulf.com/detail/2LVqzRzPbY4#currency-price so you can compare regions without guessing conversions." },
    ],
  },

  'dave-the-diver-worth-it.md': {
    heroNote: "MINTROCKET's genre mashup — daytime diving for sushi ingredients, nighttime restaurant management, and constant surprises.",
    whatItIs: "Diving + restaurant sim: catch fish by day, serve sushi by night, with side quests.",
    bestFor: "Players who want a chill loop with surprising depth.",
    avoidIf: "You want pure action or pure management — it bounces between both.",
    consensusPraise: "The mashup works better than it should; humor and art keep it fresh for 30h+.",
    mainFriction: "Some management sections feel grindy; new systems arrive faster than players absorb.",
    playStyle: "Day-night cycle: dive for fish and loot by day, run a sushi restaurant by night. Farming, combat, and story quests layer on top.",
    playtime: "25h main · 40h+ extras · ~60h completionist",
    timeCommitment: "About 25 hours for the main story, 40+ with side content, and around 60 for full completion.",
    timeFit: "Time fit: 25h main · 40h+ extras · ~60h completionist",
    quickFilters: ["long_rpg", "great_on_sale"],
    tldr: "DAVE THE DIVER — 88 Metacritic; diving + sushi restaurant mashup with 25h+ of content. At €12.96 in Japan it is a solid pick.",
    faq: [
      { question: "Is DAVE THE DIVER worth buying on Nintendo Switch in 2026?", answer: "DAVE THE DIVER is worth buying on Nintendo Switch in 2026 if you enjoy genre mashups. 88 Metacritic, 25h+ of content, and GameGulf shows €12.96 on the Japanese eShop." },
      { question: "How long is DAVE THE DIVER?", answer: "DAVE THE DIVER takes about 25 hours for the main story, 40+ hours with side content, and around 60 hours for completionists." },
      { question: "Is DAVE THE DIVER a roguelite?", answer: "DAVE THE DIVER is more of a genre mashup than a pure roguelite — dives are procedurally modified and the restaurant side is unique management gameplay." },
      { question: "Where should I check Nintendo Switch pricing?", answer: "DAVE THE DIVER pricing is best checked on the GameGulf detail grid at https://www.gamegulf.com/detail/2G7jYyj3ED2#currency-price so you can compare regions without guessing conversions." },
    ],
  },

  'xenoblade-chronicles-3-worth-it.md': {
    heroNote: "Monolith Soft's massive JRPG — open worlds, real-time combat with class switching, and a 60+ hour story tying the trilogy together.",
    whatItIs: "Open-world JRPG: real-time combat, class-switching, and a 60+ hour story.",
    bestFor: "JRPG fans who want a massive world and deep combat.",
    avoidIf: "You want short sessions — it is a 60+ hour commitment with a slow start.",
    consensusPraise: "World scale, combat depth, and flexible classes carry the 60+ hour runtime.",
    mainFriction: "Slow opening, menu complexity, and handheld resolution drops test patience.",
    playStyle: "Real-time JRPG: auto-attacks build into arts, chain attacks, and Ouroboros fusions. Class switching lets every character fill any role. Vast open zones to explore.",
    playtime: "60h main · 100h+ extras · ~150h completionist",
    timeCommitment: "About 60 hours for the main story, 100+ with side quests, and around 150 for full completion.",
    timeFit: "Time fit: 60h main · 100h+ extras · ~150h completionist",
    quickFilters: ["long_rpg", "great_on_sale"],
    tldr: "Xenoblade Chronicles 3 — 89 Metacritic; 60h+ JRPG with deep combat and massive open zones. At HK$329 in Hong Kong it is a strong buy.",
    faq: [
      { question: "Is Xenoblade Chronicles 3 worth buying on Nintendo Switch in 2026?", answer: "Xenoblade Chronicles 3 is worth buying on Nintendo Switch in 2026 if you enjoy JRPGs and can commit 60+ hours. 89 Metacritic, massive open world, and GameGulf shows HK$329 (€35.94) on the Hong Kong eShop." },
      { question: "How long is Xenoblade Chronicles 3?", answer: "Xenoblade Chronicles 3 takes about 60 hours for the main story, 100+ hours with side content, and around 150 hours for full completion." },
      { question: "Do I need to play Xenoblade 1 and 2 first?", answer: "Xenoblade Chronicles 3 stands on its own, but playing the first two games adds context to the late-game connections and the Future Redeemed DLC." },
      { question: "Where should I check Nintendo Switch pricing?", answer: "Xenoblade Chronicles 3 pricing is best checked on the GameGulf detail grid at https://www.gamegulf.com/detail/4mIisPNpCWM#currency-price so you can compare regions without guessing conversions." },
    ],
  },
};

function patchFile(filename, patches) {
  const filepath = join(POSTS, filename);
  const raw = readFileSync(filepath, 'utf8');

  // Parse frontmatter
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    console.error(`  ✘ No frontmatter found in ${filename}`);
    return;
  }

  const fm = yaml.load(fmMatch[1]);
  const body = fmMatch[2];

  // Apply patches
  for (const [key, value] of Object.entries(patches)) {
    fm[key] = value;
  }

  // Rebuild
  const newYaml = yaml.dump(fm, {
    lineWidth: 0,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
    sortKeys: false,
  }).trimEnd();

  const out = `---\n${newYaml}\n---\n${body}`;
  writeFileSync(filepath, out, 'utf8');
  console.log(`  ✔ ${filename}`);
}

console.log('Patching 5 English articles…\n');
for (const [filename, patches] of Object.entries(PATCHES)) {
  patchFile(filename, patches);
}
console.log('\nDone.');
