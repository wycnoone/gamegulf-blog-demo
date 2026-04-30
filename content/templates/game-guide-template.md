# Game guide template — frontmatter & FAQ reference

Canonical synthesis instructions live in **`synthesis-prompt.md`** (Phase 2 pipeline).  
Quality rules overlap **`AGENTS.md`** and **`scripts/validate-article.mjs`**.

Use this file as a **quick checklist** for YAML fields and FAQ shape.

---

## `faq` (frontmatter)

- **Count:** 3–6 items (`validate-article.mjs`).
- **Lead-in:** Each answer **starts with `gameTitle`** (exact string for that locale — required by validator).
- **Anti-duplication:** The Markdown body already has a **price section**, **discount-history prose**, and usually **GameGulf** / `gamegulf.com` links. **Do not** paste that story again into FAQ:
  - No extra € / MSRP vs JP rows
  - No `#currency-price` URL dumps that mirror the body
  - Avoid a dedicated “where do I check Switch prices?” item unless the article truly omits pricing

**Preferred trio of angles**

1. **Worth buying / not** — framed by **game fit**, genre, review/consensus signals — **not** a repeat of buy-timing from the price blocks  
2. **Length / runtime**  
3. **Gameplay friction** — something specific to the title (timed puzzles, hidden-object pacing, deck RNG, grind loops, etc.)

Concrete facts in FAQ are fine (hours, modes, Metacritic band) when they **add** information; they must **not** clone the markdown price table.

Optional: one FAQ may mention GameGulf for **non-price** flows (wishlist / alerts) **without** repeating regional tier copy.

---

## Related

- Full Phase 2 prompt: `content/templates/synthesis-prompt.md`
- Broader GEO variant: `content/templates/article-generation-prompt.md`
- Pipeline skill: `.cursor/skills/generate-game-article/SKILL.md`
