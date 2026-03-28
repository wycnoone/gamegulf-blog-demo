# AGENTS.md

## Product Context
GameGulf is a decision-oriented game buying platform for players who want to compare prices, judge sale timing, and decide whether a game is worth buying.

The blog is not a generic SEO content archive. It should function as a decision-support layer for the main product.

Every blog page should feel useful to human readers first, while still preserving strong SEO foundations.

---

## Core Product Principles
- Help users decide faster
- Help users avoid bad purchases
- Help users understand whether to buy now or wait
- Connect content naturally to pricing and alert workflows
- Make pages feel editorial, practical, and product-driven

---

## UX Principles
- Human usefulness comes before SEO presentation
- Pages should be easy to scan in under 10 seconds
- Surface decision value early
- Reduce repetitive “AI-generated summary” feeling
- Prioritize clarity, usefulness, and hierarchy over content volume
- Make it obvious what the user should read next and do next

---

## Blog Page Goals
Every blog category page should help users answer:
1. Which article should I read first?
2. Is this game right for me?
3. Should I buy now or wait for a sale?
4. What should I do next after reading?

Every blog article page should help users answer:
1. Is this game a good fit for me?
2. Is the current price reasonable?
3. Should I buy now, wait, or skip?
4. Should I set a price alert?

---

## Content Style Rules
- Write like a practical buying advisor, not a generic content marketer
- Use concise, decision-first language
- Emphasize player fit, timing, value, and tradeoffs
- Avoid bloated intros and generic filler
- Avoid repetitive phrasing across cards and summaries
- Avoid empty SEO-style wording that does not help the user decide

### Avoid phrases like
- “This guide explains...”
- “In this article, we cover...”
- “Focused on what the game offers...”
- “Everything you need to know...”

### Prefer phrasing like
- “Worth buying if you want...”
- “Best for players who...”
- “Wait for a sale if...”
- “Easy to recommend at this price...”
- “Not the best fit if...”

---

## Decision-First Content Model
When presenting games, prioritize these questions:
1. Who is this for?
2. Who should skip it?
3. Is it worth the current price?
4. Does it go on sale often?
5. Should the user buy now or wait?
6. What kind of time commitment does it require?

---

## Blog Card Rules
Blog list cards should be decision cards, not generic article summary cards.

Each card should aim to include:
- Title
- Clear verdict badge
- One-line takeaway
- Best-for statement
- Timing/value note
- Optional review signal
- Relevant tags
- Clear CTA hierarchy

### Verdict System
Use a normalized verdict system:
- `buy_now` → **Buy now**
- `wait_for_sale` → **Wait for sale**
- `right_player` → **Worth it for the right player**
- `not_best_fit` → **Not the best fit right now**

### Card Copy Rules
- The first 1 to 2 lines must communicate decision value
- Do not make cards read like article abstracts
- Do not repeat nearly identical sentence structures across cards
- Metadata such as date and reading time must be visually secondary to verdict and takeaway

---

## Information Architecture Rules
For category/listing pages:
- Add a clear hero that explains user outcome, not just category definition
- Include quick filters near the top
- Include a featured section before the standard grid
- Include browsing paths by player need
- Maintain strong visual hierarchy between featured and non-featured content

Recommended sections for category pages:
1. Hero
2. Quick filters
3. Featured decisions
4. Standard article grid
5. Browse by player need
6. Footer CTA into pricing alerts or product flows

---

## CTA Rules
CTAs should reflect GameGulf’s product flow.

Preferred hierarchy:
1. Primary CTA: **Read guide**
2. Secondary CTA: **Set alert**
3. Tertiary CTA: **View pricing**

The user journey should feel like:
**Understand the decision → monitor the price if needed → check live pricing**

---

## SEO Rules
- Preserve existing article URLs unless there is an intentional migration plan
- Preserve internal linking wherever possible
- Keep semantic heading structure strong
- Do not sacrifice readability for keyword stuffing
- Avoid exposing implementation details, raw slugs, or backend taxonomy labels in the UI
- Keep structured, crawlable content intact even when improving layout and UX

SEO should support usefulness, not replace it.

---

## Visual Design Rules
- Clean, editorial, product-oriented
- Strong scanability
- Clear spacing and hierarchy
- Do not overcrowd grids
- Use badges, tags, and layout to improve scanning
- Dates and read times should be present but visually de-emphasized
- Verdicts and takeaways should be visually prominent

---

## Engineering Rules
- Reuse components whenever possible
- Avoid monolithic page components
- Prefer composable, reusable UI sections
- Keep list-page patterns extensible to other blog categories
- Keep data models structured so new categories can adopt the same system
- Preserve SEO-critical links and metadata unless explicitly changing them
- Add lightweight filtering/sorting in a way that can scale later
- Prefer maintainable code over quick one-off hacks

---

## Component Expectations
When redesigning a blog listing page, prefer reusable components such as:
- Hero section
- Filter chip bar
- Featured decision cards
- Standard decision cards
- Browse-by-need grid
- CTA footer block

Do not hardcode everything into one page file if reusable components are more appropriate.

---

## Implementation Workflow
For medium or large changes:
1. Diagnose the current page
2. Propose information architecture
3. Identify components to build or update
4. Define any content model changes
5. Implement UI changes
6. Validate UX goals
7. Summarize changed files and assumptions

For non-trivial work, produce a plan before coding.

---

## Validation Checklist
Before finishing any blog-page redesign, confirm:
1. The page clearly communicates what user outcome it provides
2. Quick filters are visible and useful
3. Featured content exists where appropriate
4. Cards surface verdicts clearly
5. Cards emphasize takeaways over generic summaries
6. Metadata is visually secondary
7. CTA hierarchy is preserved
8. Article, alert, and pricing links still work
9. UI patterns are reusable
10. SEO-critical structure is preserved or intentionally documented if changed

---

## Default Standard
When choosing between:
- SEO vs usability → choose usability without damaging SEO
- more content vs clearer content → choose clearer content
- clever wording vs direct decision help → choose direct decision help
- one-off implementation vs reusable pattern → choose reusable pattern

The blog should feel like a smart buying guide system, not a content farm.