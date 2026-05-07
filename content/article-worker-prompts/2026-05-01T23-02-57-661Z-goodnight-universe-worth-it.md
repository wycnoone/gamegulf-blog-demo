You are running as a fresh, one-game GameGulf article production worker. This is an authorized local production task. Work only inside this repository.

Goal:
Review and repair the 7-locale GameGulf worth-it article set for one game, using existing validators. The runner has already attempted deterministic generation/sync first when possible. Do not rely on conversation memory. Read only the listed article files, the brief, and validator output you need.

Game queue entry:
{
  "url": "https://www.gamegulf.com/detail/g0QkGPqLJFU",
  "status": "in_progress",
  "priority": "normal",
  "added": "2026-05-01",
  "completed": null,
  "notes": "Auto article queue from content/ns2-batch-active-urls.txt",
  "automation": {
    "source": "content/ns2-batch-active-urls.txt",
    "seededAt": "2026-05-01T19:36:53.340Z",
    "runId": "2026-05-01T23-02-57-661Z",
    "startedAt": "2026-05-01T23:07:11.075Z",
    "updatedAt": "2026-05-01T23:07:11.075Z"
  }
}

Inputs:
- Brief: content/briefs/goodnight-universe.json
- Expected article slug: goodnight-universe-worth-it
- Expected article paths:
  - src/content/posts/en/goodnight-universe-worth-it.md
  - src/content/posts/zh-hans/goodnight-universe-worth-it.md
  - src/content/posts/ja/goodnight-universe-worth-it.md
  - src/content/posts/fr/goodnight-universe-worth-it.md
  - src/content/posts/es/goodnight-universe-worth-it.md
  - src/content/posts/de/goodnight-universe-worth-it.md
  - src/content/posts/pt/goodnight-universe-worth-it.md

Required workflow:
1. Run node scripts/validate-article.mjs src/content/posts/en/goodnight-universe-worth-it.md src/content/posts/zh-hans/goodnight-universe-worth-it.md src/content/posts/ja/goodnight-universe-worth-it.md src/content/posts/fr/goodnight-universe-worth-it.md src/content/posts/es/goodnight-universe-worth-it.md src/content/posts/de/goodnight-universe-worth-it.md src/content/posts/pt/goodnight-universe-worth-it.md to see current hard errors.
2. If article files are missing, run node scripts/synthesize-worth-it-from-brief.mjs content/briefs/goodnight-universe.json and node scripts/sync-article-pricing.mjs src/content/posts/en/goodnight-universe-worth-it.md src/content/posts/zh-hans/goodnight-universe-worth-it.md src/content/posts/ja/goodnight-universe-worth-it.md src/content/posts/fr/goodnight-universe-worth-it.md src/content/posts/es/goodnight-universe-worth-it.md src/content/posts/de/goodnight-universe-worth-it.md src/content/posts/pt/goodnight-universe-worth-it.md.
3. Read only the files with validator errors plus en, zh-hans, and ja spot checks.
3. Score the article set from 0-100 using these weights:
   - local display names and FAQ answer prefixes are correct, especially zh-hans/ja: 15
   - buy/wait decision is explicit and useful: 15
   - price logic uses concrete GameGulf indexed rows/history where available: 15
   - best-for / avoid-if / time fit are clear: 10
   - body is a compact buying research memo, not generic SEO filler: 15
   - GameGulf links/CTA are natural and present: 10
   - FAQ and tldr are useful and localized: 10
   - validator passes with zero errors: 10
4. If validator errors exist or score is below 85, revise the markdown files directly and re-run validation. Maximum revision attempts: 2.
5. Do not delete files. Do not run git commit/push. Do not run npm run build. Do not use rm.
6. If a hard blocker appears, stop and report it in JSON.

Output only a JSON object matching this shape:
{
  "status": "passed" | "blocked",
  "slug": "goodnight-universe-worth-it",
  "score": 0,
  "revisionAttempts": 0,
  "validated": false,
  "articlePaths": ["src/content/posts/en/goodnight-universe-worth-it.md","src/content/posts/zh-hans/goodnight-universe-worth-it.md","src/content/posts/ja/goodnight-universe-worth-it.md","src/content/posts/fr/goodnight-universe-worth-it.md","src/content/posts/es/goodnight-universe-worth-it.md","src/content/posts/de/goodnight-universe-worth-it.md","src/content/posts/pt/goodnight-universe-worth-it.md"],
  "issues": ["..."],
  "commandsRun": ["..."],
  "notes": "short summary"
}
