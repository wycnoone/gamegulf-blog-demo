You are running as a fresh, one-game GameGulf article production worker. This is an authorized local production task. Work only inside this repository.

Goal:
Review and repair the 7-locale GameGulf worth-it article set for one game, using existing validators. The runner has already attempted deterministic generation/sync first when possible. Do not rely on conversation memory. Read only the listed article files, the brief, and validator output you need.

Game queue entry:
{
  "url": "https://www.gamegulf.com/detail/kMgcgLEaoEh",
  "status": "in_progress",
  "priority": "normal",
  "added": "2026-05-01",
  "completed": null,
  "notes": "Auto article queue from content/popular-batch-urls.txt",
  "automation": {
    "source": "content/popular-batch-urls.txt",
    "seededAt": "2026-05-01T19:36:48.005Z",
    "runId": "2026-05-07T06-15-21-802Z",
    "startedAt": "2026-05-07T06:51:44.997Z",
    "updatedAt": "2026-05-07T06:51:44.997Z"
  }
}

Inputs:
- Brief: content/briefs/the-great-ace-attorney-chronicles.json
- Expected article slug: the-great-ace-attorney-chronicles-worth-it
- Expected article paths:
  - src/content/posts/en/the-great-ace-attorney-chronicles-worth-it.md
  - src/content/posts/zh-hans/the-great-ace-attorney-chronicles-worth-it.md
  - src/content/posts/ja/the-great-ace-attorney-chronicles-worth-it.md
  - src/content/posts/fr/the-great-ace-attorney-chronicles-worth-it.md
  - src/content/posts/es/the-great-ace-attorney-chronicles-worth-it.md
  - src/content/posts/de/the-great-ace-attorney-chronicles-worth-it.md
  - src/content/posts/pt/the-great-ace-attorney-chronicles-worth-it.md

Required workflow:
1. Run node scripts/validate-article.mjs src/content/posts/en/the-great-ace-attorney-chronicles-worth-it.md src/content/posts/zh-hans/the-great-ace-attorney-chronicles-worth-it.md src/content/posts/ja/the-great-ace-attorney-chronicles-worth-it.md src/content/posts/fr/the-great-ace-attorney-chronicles-worth-it.md src/content/posts/es/the-great-ace-attorney-chronicles-worth-it.md src/content/posts/de/the-great-ace-attorney-chronicles-worth-it.md src/content/posts/pt/the-great-ace-attorney-chronicles-worth-it.md to see current hard errors.
2. If article files are missing, run node scripts/synthesize-worth-it-from-brief.mjs content/briefs/the-great-ace-attorney-chronicles.json and node scripts/sync-article-pricing.mjs src/content/posts/en/the-great-ace-attorney-chronicles-worth-it.md src/content/posts/zh-hans/the-great-ace-attorney-chronicles-worth-it.md src/content/posts/ja/the-great-ace-attorney-chronicles-worth-it.md src/content/posts/fr/the-great-ace-attorney-chronicles-worth-it.md src/content/posts/es/the-great-ace-attorney-chronicles-worth-it.md src/content/posts/de/the-great-ace-attorney-chronicles-worth-it.md src/content/posts/pt/the-great-ace-attorney-chronicles-worth-it.md.
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
  "slug": "the-great-ace-attorney-chronicles-worth-it",
  "score": 0,
  "revisionAttempts": 0,
  "validated": false,
  "articlePaths": ["src/content/posts/en/the-great-ace-attorney-chronicles-worth-it.md","src/content/posts/zh-hans/the-great-ace-attorney-chronicles-worth-it.md","src/content/posts/ja/the-great-ace-attorney-chronicles-worth-it.md","src/content/posts/fr/the-great-ace-attorney-chronicles-worth-it.md","src/content/posts/es/the-great-ace-attorney-chronicles-worth-it.md","src/content/posts/de/the-great-ace-attorney-chronicles-worth-it.md","src/content/posts/pt/the-great-ace-attorney-chronicles-worth-it.md"],
  "issues": ["..."],
  "commandsRun": ["..."],
  "notes": "short summary"
}
