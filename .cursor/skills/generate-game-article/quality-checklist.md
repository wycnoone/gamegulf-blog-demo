# Quality Checklist — GameGulf Article Generation

Use this after generating articles. Every item must pass.

## Data Accuracy (hard fail)

- [ ] `heroStat` (detail cover strip) and `reviewSignal` (list cards): **Metacritic critic score only** (e.g. `92 Metacritic` / `Metacritic 约 92 分`) — never HLTB, Steam user %, or OpenCritic in those fields; HLTB stays in `playtime` and body copy
- [ ] ALL prices match `platforms.switch.digital` from the brief
- [ ] cardPrice = global low from `digital[0].calculate_value`
- [ ] cardPriceRegion = localized name of `digital[0].country`
- [ ] No Argentina (AR) prices anywhere in the article
- [ ] Metacritic score matches `game.metacritic`
- [ ] Playtime matches HLTB data (if present in brief)
- [ ] Platform availability matches `platforms` keys
- [ ] Product links (gameHref, priceTrackHref, wishlistHref) are correct
- [ ] price_verdict used for verdict/priceCall/confidence (not guessed)
- [ ] Discount history paragraph cites real numbers from price_analytics

## Frontmatter Structure (hard fail)

- [ ] Valid YAML (passes js-yaml.load())
- [ ] No duplicate keys
- [ ] All required fields present (see game-guide-template.md)
- [ ] playerVoices is array of {quote, sentiment} objects
- [ ] faq is array of {question, answer} objects
- [ ] quickFilters values from allowed set only
- [ ] playerNeeds values from allowed set only
- [ ] tags are 4-6 items in the target language

## Character Limits (hard fail — truncation breaks cards)

| Field | Max | Check method |
|---|---|---|
| whatItIs | 90 | count chars |
| bestFor | 60 | count chars |
| communityVibe | 64 | count chars |
| listingTakeaway | 96 | count chars |
| avoidIf | 72 | count chars |
| consensusPraise | 82 | count chars |
| mainFriction | 84 | count chars |
| timeFit | 82 | count chars |
| fitLabel | 72 | count chars |
| tldr | 160 | count chars |

## Article Body Quality

- [ ] Quick verdict section: ≤80 words, opens with game name + clear answer
- [ ] Quick verdict includes **≥1 concrete anchor** from brief/analytics (price logic, Metacritic, HLTB if present, sale pattern, co-op format)
- [ ] Price section: regional table with 5-8 rows, sorted cheapest first
- [ ] Price section: discount history paragraph with concrete data
- [ ] Each section opens with a definitive, quotable statement
- [ ] **“What kind of game”** and **“How does it run”** each include **≥2 named anchors** after the opener (mechanics/modes/performance/comparison) — not adjective-only filler
- [ ] **Buy / Wait** bullets: **situation + trigger**; **≥50%** mention a concrete purchase cue (region price, MSRP, runtime, sale signal)
- [ ] No fake first-person playtests; brief/index/community framing is honest in the target language
- [ ] Game name appears in key statements (for AI citation)
- [ ] Section headings are real user questions
- [ ] Paragraphs are short and self-contained; first 1–2 lines under each H2 are excerpt-friendly (searchable nouns)

## GEO Optimization

- [ ] tldr starts with game name
- [ ] tldr includes verdict + one concrete detail
- [ ] Every FAQ answer starts with game name
- [ ] FAQ answers are self-contained (make sense without question)
- [ ] One FAQ answer mentions GameGulf naturally
- [ ] Temporal claims are date-anchored ("as of April 2026")

## Brand Rules

- [ ] GameGulf mentioned exactly 2 times total
- [ ] 1× in a FAQ answer (referencing a tool)
- [ ] 1× in article body (usually pricing section)
- [ ] No "GameGulf recommends" or "GameGulf thinks"

## Multilingual Consistency

- [ ] Same slug across all locales
- [ ] URLs, dates, category, platform unchanged
- [ ] All text fields in target language
- [ ] Idiomatic target language — not literal translation / translationese from another locale
- [ ] Titles match search patterns in that language
- [ ] readingTime localized ("8 min read" / "8 分钟阅读" / "8分で読める")
- [ ] cardPriceRegion localized (Japan/日本/Japon/Japón/Japan/Japão)
- [ ] Currency display follows locale rules (JPY first for zh-hans/ja)

## Content Style

- [ ] Sounds like a buying advisor, not a content marketer
- [ ] No "This guide explains..." / "Everything you need to know..."
- [ ] No mention of SEO, GEO, AI, templates, or prompts
- [ ] No empty praise or filler
- [ ] Decision-first language throughout
- [ ] "Buy now if" / "Wait or skip if" sections are player-type focused

## Build Verification

- [ ] `npm run build` exits 0
- [ ] All locale pages generated in dist/
- [ ] Card displays specific price (not "Live pricing")

## Common Mistakes to Avoid

1. **Fabricating prices**: If a region's native currency isn't in
   schema_offers, omit the native column — never guess.
2. **Wrong currency order**: zh-hans/ja cards lead with JPY, not EUR.
3. **Exceeding character limits**: Count carefully. CJK characters
   count as 1 char each. Truncation breaks the card layout.
4. **Forgetting Argentina exclusion**: AR data may still appear in
   old briefs. Always filter it out.
5. **Generic priceSignal**: Must reference specific analytics numbers,
   not "prices vary by region."
6. **Duplicate YAML keys**: Two `tags:` fields will break the parser.
7. **Unescaped colons in YAML strings**: Wrap values containing `:` in quotes.
8. **Missing game name in FAQ answers**: Every answer must start with
   the full game title for AI citation to work.
