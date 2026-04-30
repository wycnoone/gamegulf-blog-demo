---
name: generate-game-article
description: >-
  Generate GameGulf blog articles from a game URL. Runs a multi-phase pipeline:
  dedup check → data extraction → AI synthesis → validation → build.
  Use when asked to create, generate, or write a new game article,
  buying guide, or blog post for GameGulf. Also supports batch/queue mode
  for automated daily publishing via OpenClaw.
---

# Generate GameGulf Game Article

End-to-end pipeline: GameGulf URL → structured brief → EN master draft → 6 localized rewrites.

## Overview

```
Phase 0 (script) ─→ Dedup check + queue management
Phase 1 (script) ─→ JSON brief with price_analytics
Phase 2 (you)    ─→ EN master article + idiomatic localized rewrites
Phase 3 (script) ─→ Validation (YAML + schema + limits)
Phase 4 (build)  ─→ Build check
```

## Workflow Modes

### Mode A: Manual Trigger (single URL)

```
input: GameGulf detail URL
→ Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4
```

### Mode B: Automated Queue (daily batch)

```
1. node scripts/queue-next.mjs             # get next pending game
2. if empty → stop, nothing to do
3. node scripts/queue-next.mjs --mark-started <url>
4. run Phase 0 → 1 → 2 → 3 → 4
5. node scripts/queue-next.mjs --mark-done <url>
6. git add + commit + push
7. repeat from step 1
```

To add games to the queue:

```bash
node scripts/queue-next.mjs --add <url> [priority] [notes]
# priority: high | normal | low
```

Queue status:

```bash
node scripts/queue-next.mjs --status
```

## Phase 0 — Dedup Check

Before any work, check if articles already exist:

```bash
node scripts/check-existing.mjs <GAMEGULF_URL>
```

- Exit 0 + `"status": "NEW"` → proceed to Phase 1
- Exit 1 + `"status": "EXISTS"` → articles exist, skip or confirm overwrite
- Exit 2 → invalid input

**IMPORTANT:** If the game already has articles in all 7 locales, do NOT
regenerate unless explicitly asked. Skip it and move to the next game.

## Phase 1 — Extract Game Brief

Run the extraction script. This fetches the GameGulf page, parses pricing
data, enriches from Steam/HLTB, and computes `price_analytics`.

```bash
node scripts/extract-game-brief.mjs <GAMEGULF_URL>
```

Output: `content/briefs/{slug}.json`

**When HLTB / Metacritic are missing:** `extract-game-brief.mjs` runs a surrogate
pass after Steam + mapped HLTB: (1) `content/enrichment-fallback.json` by slug,
(2) OpenCritic search for a critic score if Metacritic is still empty,
(3) optional `RAWG_API_KEY` for RAWG Metacritic + rough playtime hints.
Re-check `brief.enrichment.hltb` and `brief.meta.surrogate` in the JSON. To
fill `playtime` on existing posts from briefs, run
`npm run backfill:playtime -- <slug> [<slug>...]` (omit slugs to process all briefs).

If the game has a HowLongToBeat entry not yet mapped, add it to
`content/hltb-mapping.json` first:

```json
{ "game-slug": 12345 }
```

Find the HLTB ID by searching https://howlongtobeat.com for the game title.

**Verify the brief** before proceeding:

```bash
node -e "const b=require('./content/briefs/{slug}.json'); const s=b.price_analytics?.switch; const steam=b.enrichment?.steam || b.steam; const hltb=b.enrichment?.hltb || b.hltb; console.log('Title:', b.game.title); console.log('Regions:', b.platforms.switch?.digital?.length); console.log('Trend entries:', s?.trend_entries_count); console.log('Verdict:', s?.price_verdict); console.log('Steam:', !!steam); console.log('HLTB:', !!hltb);"
```

Expect: title present, 5+ regions, Steam/HLTB data present when available.
If the brief was generated without enrichment, re-run the extractor
without `--no-enrich`. If Steam or HLTB is still missing, the game
may genuinely lack that source and you should research the gap manually.

## Phase 2 — Synthesize Articles (EN master first)

Read the full synthesis prompt and templates **before** drafting:

1. **`content/templates/synthesis-prompt.md`** — complete Phase 2 prompt (pricing rules, body structure, self-review checklist).
2. **`content/templates/game-guide-template.md`** — quick **frontmatter + `faq`** reference: validator expectations (`gameTitle` lead-ins), and **FAQ must not duplicate** the article’s price section — use the worth-buying / length / gameplay-friction angles documented there.

Optional (browse-only / alternate GEO framing): `content/templates/article-generation-prompt.md`.

Then generate one **English master draft first**, and only then
rewrite it into each target locale with idiomatic local phrasing
(not literal translation).

### Input assembly

```
Game brief: <content of content/briefs/{slug}.json>
Master language: en
Target locales: zh-hans, ja, fr, es, de, pt
Category: worth-it (or buy-now-or-wait)
Existing articles: <list current src/content/posts/{locale}/*.md slugs>
```

### Phase 2 execution order (required)

1. **Write EN master draft**
   - Path: `src/content/posts/en/{slug}.md`
   - This is the canonical source for structure and decision logic.
2. **Rewrite into each locale**
   - Paths: `src/content/posts/{locale}/{slug}.md`
   - Preserve facts and decisions from EN master + brief.
   - Re-express copy in idiomatic local editorial voice.
   - Never do line-by-line literal translation.
3. **Cross-locale consistency check**
   - Same slug, same verdict intent, same pricing facts.
   - Locale-specific wording is allowed; factual drift is not.

### Critical constraints (non-negotiable)

**Pricing — ZERO tolerance for fabrication:**
- ALL prices come from the brief JSON. Never invent prices.
- Use `price_analytics.switch` for every price judgment.
- `price_verdict` determines verdict/priceCall/confidence.
- cardPrice uses the global low from `platforms.switch.digital[0]`.

**Price verdict → article verdict mapping:**

| price_verdict | → verdict | → priceCall | → confidence |
|---|---|---|---|
| at_historical_low | buy_now | buy | high |
| near_historical_low | buy_now | buy | high |
| sale_likely_soon | wait_for_sale | wait | medium |
| regular_discounter | depends on current vs avg | buy or wait | medium |
| occasional_discounter | right_player | watch | medium |
| rarely_discounted | buy_now (if quality high) | buy | high |

**Card price display rules (cardPrice field):**
- Always the global lowest price (first entry in digital array)
- Currency conversion by locale:
  - en → USD: `"USD 21.31"`
  - zh-hans → CNY: `"CNY 154.20"`
  - ja → JPY: `"JPY 3520"`
  - fr, es, de, pt → EUR: `"EUR 19.14"`
- Keep cardPrice simple: converted display only. Do NOT append native price in parentheses.
- cardPriceRegion: localized region name (e.g. "Japan"→"日本"→"Japon")
- Also include structured fields for runtime conversion:
  - `cardPriceEur`
  - `cardPriceRegionCode`
  - `cardPriceNative`
  - `cardPriceNativeCurrency`
- Also include `priceRows` in frontmatter as the pricing source of
  truth:
  - 5-8 rows, cheapest first
  - EXCLUDE Argentina (AR)
  - Each row must include `regionCode`, `eurPrice`, `nativePrice`,
    `nativeCurrency`
  - The locale-adaptive markdown table will be generated from these
    rows by `scripts/sync-article-pricing.mjs`

**Detail-page pricing section MUST include:**
1. A pricing intro paragraph in the article body
   - The actual markdown table is generated after synthesis from
     `priceRows`
   - It must end up with 5-8 regions, cheapest first
   - EXCLUDE Argentina (AR)
   - Keep original storefront price in the last column
   - Converted-price column should match the article locale
   - It is inserted directly under the price section's opening paragraph
2. Discount history analysis paragraph using price_analytics:
   - All-time low (price, region, date)
   - Discount frequency (X times in past year)
   - Average discount price
   - Days since last discount
   - Concrete buy/wait recommendation

**Argentina (AR) is excluded** — do not reference it anywhere.

**Metacritic vs HLTB (`heroStat` + `reviewSignal`):**
- Detail cover and decision cards treat these fields as **Metacritic** when a score is shown.
- Use critic score + the word `Metacritic` (e.g. `92 Metacritic`, zh-hans: `Metacritic 约 92 分`).
- Never put HLTB / HowLongToBeat user scores in `heroStat` or `reviewSignal` — keep HLTB in `playtime` and prose only.
- Rare exception: the same non-score editorial allowlist as the validator (e.g. Animal Crossing’s `Long-tail cozy sim` / `长线治愈模拟`).

**`playtime` (optional):**
- Do **not** write “HLTB not mapped / pipeline” disclaimers — omit `playtime` or give useful numbers.
- If the brief has no HLTB, you may take Main Story / Story + Sides / Everything-style bands from a public catalog (e.g. `https://www.ign.com/games/{slug}`) when present; output **hours only** — do not name the source in frontmatter or body.

**Character limits (truncation breaks cards):**

| Field | Max |
|---|---|
| whatItIs | 90 |
| bestFor | 60 |
| communityVibe | 64 |
| listingTakeaway | 96 |
| avoidIf | 72 |
| consensusPraise | 82 |
| mainFriction | 84 |
| timeFit | 82 |
| fitLabel | 72 |
| tldr | 160 |

**`communityVibe` vs `playerVoices` (do not mix):**
- **`communityVibe`** → the one-line **list/decision card** quote under the label from `card.playerConsensus` (e.g. zh-hans 玩家热评). ≤64 chars.
- **`playerVoices`** → **detail page** structured quotes only; **not** shown on that card line.
- The validator warns if `playerVoices` is populated but `communityVibe` is empty (likely field confusion).

**Writing style guardrails:**
- Sound like a sharp buying advisor, not a content marketer
- No "This guide explains..." or "Everything you need to know..."
- Prefer "Worth buying if..." / "Wait for a sale if..." / "Best for..."
- **Detail body = research memo inside fixed H2s:** substantive, inspection-like copy — named systems, performance facts, comparisons, purchase triggers. Quick verdict: **≥1** checkable fact from brief/analytics. Game + performance sections: **≥2** anchors each after the bold line. Buy/wait: situation+trigger; **≥50%** bullets with a concrete cue. No invented “we played 40 hours” unless true.
- Article **markdown body** (below frontmatter): **≥3** `gamegulf` substrings (case-insensitive) — **GameGulf** wording and/or `gamegulf.com` links; `validate-article.mjs` enforces this
- No mention of SEO, GEO, AI, templates, or prompts
- Every section opens with a definitive quotable statement
- Every FAQ answer starts with the game name

**FAQ (`faq`) — avoid redundant pricing copy:**
- The Markdown body already includes the **price section**, **discount-history paragraph**, and **GameGulf** links — do **not** duplicate that material in FAQ answers (no extra € tiers, MSRP vs JP comparisons, `#currency-price` URLs, or “where do I see Switch prices?” unless the rest of the article truly lacks pricing).
- Aim for **three distinct angles**: (1) **worth buying / not** framed by **game fit**, genre, and review signals — **not** re-stating buy timing from the price blocks; (2) **length / runtime**; (3) a **gameplay-friction** question tailored to the title (e.g. timed puzzle tolerance, hidden-object pacing, deck RNG/Ink grind) — **not** a third pricing FAQ.
- FAQ answers must still **lead with `gameTitle`** where `validate-article.mjs` requires it.

**Multilingual (EN-master workflow):**
- Same slug across all 7 locales
- All text fields in the target language; URLs/dates/category unchanged
- EN is the source draft for downstream localization.
- **Idiom over literal translation:** never line-by-line calque from EN. Convey the same decisions and data using **idiomatic** phrasing a native editor would use for that language.
- Titles match how users in that language actually search
- Card copy and body must read like **native editorial**, not machine translation or translationese
- **`title` + `gameTitle` + FAQ lead-ins:** Each locale must use that market’s **normal game name** (not the English product string) in `title`, `gameTitle`, and the start of every `faq[].answer` (validator expects answers to lead with `gameTitle`). After **pricing-only** automation, manually verify these three surfaces for zh-hans, ja, fr, es, de, pt — price sync does not localize names.

**“Game intro feels thin” — where depth lives:**
- List/card fields like `whatItIs` are **short by schema** (see character limits table — e.g. 90 chars). They are teasers, not the encyclopedia.
- The **buying memo** depth is mandatory in the **Markdown body** under the fixed H2s (especially “what kind of game” / performance): ≥2 **named anchors** per those sections per `AGENTS.md`. If the body still feels empty, the brief probably lacks systems/modes — **re-run** `node scripts/extract-game-brief.mjs <url>` (no `--no-enrich`), confirm Steam/HLTB/OpenCritic in JSON, and extend the brief or prose from **checkable** public facts (store page modes, patch notes, **widely repeated** player complaints phrased as “common player reports” — no fabricated forum browsing or private playtests).

### Output files

Write to: `src/content/posts/{locale}/{slug}.md`

One file per locale. Each file = YAML frontmatter + Markdown body.

## Phase 3 — Validate Articles

Before validation, sync the locale-adaptive pricing fields and markdown
table from `priceRows`:

```bash
node scripts/sync-article-pricing.mjs src/content/posts/en/{slug}.md src/content/posts/zh-hans/{slug}.md src/content/posts/ja/{slug}.md src/content/posts/fr/{slug}.md src/content/posts/es/{slug}.md src/content/posts/de/{slug}.md src/content/posts/pt/{slug}.md
```

Run the automated validator on all generated files:

```bash
node scripts/validate-article.mjs src/content/posts/en/{slug}.md src/content/posts/zh-hans/{slug}.md src/content/posts/ja/{slug}.md src/content/posts/fr/{slug}.md src/content/posts/es/{slug}.md src/content/posts/de/{slug}.md src/content/posts/pt/{slug}.md
```

- Exit 0 → all files PASS → proceed to Phase 4
- Exit 1 → one or more FAIL → read errors, fix, re-validate

The validator checks:
- YAML syntax (js-yaml parse)
- Duplicate keys
- All required fields present
- Enum values valid (verdict, priceCall, confidence, etc.)
- Character limits for card fields (see `communityVibe` vs `playerVoices` above)
- Warns when `playerVoices` is set but `communityVibe` is missing (list cards need `communityVibe`)
- Structured arrays (faq, playerVoices, tags)
- Argentina exclusion
- Link format
- Article body structure (headings, regional table)
- `priceRows` ↔ cardPrice ↔ markdown table consistency for files using
  structured pricing

**If validation fails:** fix the specific errors reported, then re-run.
Common fixes:
- Unescaped colons → wrap in quotes
- Duplicate keys → remove one
- Character limit exceeded → shorten the field
- Missing required field → add it
- List card quote wrong / empty but `playerVoices` filled → set **`communityVibe`** for the card; do not rely on `playerVoices` for that UI

## Phase 4 — Build Check

```bash
npm run build
```

Must exit 0. If it fails, read the error, fix the offending file, rebuild.

### Post-build spot-check

Verify for at least EN and one non-EN locale:
- [ ] cardPrice shows specific price, not "Live pricing"
- [ ] Price table has 5-8 rows, no Argentina
- [ ] Price table matches `priceRows` and locale currency
- [ ] Discount history paragraph references real data
- [ ] tldr starts with game name, ≤160 chars
- [ ] FAQ answers start with game name
- [ ] FAQ does not repeat pricing grids, promo tiers, or `#currency-price` links already covered in the body
- [ ] No fabricated prices or statistics

## Quality reference

For the complete quality checklist, see [quality-checklist.md](quality-checklist.md).

## Quick reference — common commands

```bash
# --- Queue Management ---
node scripts/queue-next.mjs                            # get next pending game
node scripts/queue-next.mjs --add <url> [priority]     # add game to queue
node scripts/queue-next.mjs --mark-started <url>       # mark in_progress
node scripts/queue-next.mjs --mark-done <url>          # mark done
node scripts/queue-next.mjs --status                   # queue summary

# --- Dedup Check ---
node scripts/check-existing.mjs <url>                  # check if articles exist

# --- Data Extraction ---
node scripts/extract-game-brief.mjs <url>              # extract single game
node scripts/batch-extract.mjs <url1> <url2> ...       # extract batch

# --- Validation ---
node scripts/sync-article-pricing.mjs src/content/posts/*/{slug}.md   # sync pricing table/card fields
node scripts/validate-article.mjs src/content/posts/en/{slug}.md   # validate one
node scripts/validate-article.mjs src/content/posts/*/{slug}.md    # validate all locales

# --- Build & Preview ---
npm run build                                          # full build
npx astro preview                                      # preview locally
```

## Full automated flow (copy-paste for OpenClaw)

```bash
# 1. Get next game from queue
NEXT=$(node scripts/queue-next.mjs)
URL=$(echo $NEXT | node -e "process.stdin.on('data',d=>{const j=JSON.parse(d);console.log(j.game?.url||'')})")
[ -z "$URL" ] && echo "Queue empty" && exit 0

# 2. Dedup check
node scripts/check-existing.mjs "$URL" || { echo "Already exists"; exit 0; }

# 3. Mark started
node scripts/queue-next.mjs --mark-started "$URL"

# 4. Extract brief
node scripts/extract-game-brief.mjs "$URL"

# 5. [AI STEP] Write EN master, then localize to 6 locales (follow Phase 2 instructions)

# 6. Validate
node scripts/validate-article.mjs src/content/posts/*/{slug}.md

# 7. Build
npm run build

# 8. Mark done
node scripts/queue-next.mjs --mark-done "$URL"

# 9. Commit & push
git add -A && git commit -m "feat(blog): add {game-title} articles" && git push
```
