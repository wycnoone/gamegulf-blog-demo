You are running as a fresh, one-game GameGulf article production worker. This is an authorized local production task. Work only inside this repository.

Goal:
Generate, review, and if needed revise the 7-locale GameGulf worth-it article set for one game, using existing project scripts and validators. Do not rely on conversation memory. Read the files you need.

Game queue entry:
{
  "url": "https://www.gamegulf.com/detail/1nZVjVdHDZ1",
  "status": "in_progress",
  "priority": "normal",
  "added": "2026-05-01",
  "completed": null,
  "notes": "Auto article queue from content/ns2-batch-active-urls.txt",
  "automation": {
    "source": "content/ns2-batch-active-urls.txt",
    "seededAt": "2026-05-01T19:36:53.340Z",
    "runId": "2026-05-01T19-37-07-441Z",
    "startedAt": "2026-05-01T19:37:07.448Z",
    "updatedAt": "2026-05-01T19:37:07.448Z"
  }
}

Inputs:
- Brief: content/briefs/lego-ninjago-movie-video-game.json
- Expected article slug: lego-ninjago-movie-video-game-worth-it
- Expected article paths:
  - src/content/posts/en/lego-ninjago-movie-video-game-worth-it.md
  - src/content/posts/zh-hans/lego-ninjago-movie-video-game-worth-it.md
  - src/content/posts/ja/lego-ninjago-movie-video-game-worth-it.md
  - src/content/posts/fr/lego-ninjago-movie-video-game-worth-it.md
  - src/content/posts/es/lego-ninjago-movie-video-game-worth-it.md
  - src/content/posts/de/lego-ninjago-movie-video-game-worth-it.md
  - src/content/posts/pt/lego-ninjago-movie-video-game-worth-it.md

Required workflow:
1. Run the existing generation pipeline for this brief:
   - node scripts/synthesize-worth-it-from-brief.mjs content/briefs/lego-ninjago-movie-video-game.json
   - node scripts/sync-article-pricing.mjs src/content/posts/en/lego-ninjago-movie-video-game-worth-it.md src/content/posts/zh-hans/lego-ninjago-movie-video-game-worth-it.md src/content/posts/ja/lego-ninjago-movie-video-game-worth-it.md src/content/posts/fr/lego-ninjago-movie-video-game-worth-it.md src/content/posts/es/lego-ninjago-movie-video-game-worth-it.md src/content/posts/de/lego-ninjago-movie-video-game-worth-it.md src/content/posts/pt/lego-ninjago-movie-video-game-worth-it.md
   - node scripts/validate-article.mjs src/content/posts/en/lego-ninjago-movie-video-game-worth-it.md src/content/posts/zh-hans/lego-ninjago-movie-video-game-worth-it.md src/content/posts/ja/lego-ninjago-movie-video-game-worth-it.md src/content/posts/fr/lego-ninjago-movie-video-game-worth-it.md src/content/posts/es/lego-ninjago-movie-video-game-worth-it.md src/content/posts/de/lego-ninjago-movie-video-game-worth-it.md src/content/posts/pt/lego-ninjago-movie-video-game-worth-it.md
2. Read the generated articles enough to judge quality, especially en, zh-hans, and ja.
3. Score the article set from 0-100 using these weights:
   - local display names and FAQ answer prefixes are correct, especially zh-hans/ja: 15
   - buy/wait decision is explicit and useful: 15
   - price logic uses concrete GameGulf indexed rows/history where available: 15
   - best-for / avoid-if / time fit are clear: 10
   - body is a compact buying research memo, not generic SEO filler: 15
   - GameGulf links/CTA are natural and present: 10
   - FAQ and tldr are useful and localized: 10
   - validator passes with zero errors: 10
4. If score is below 85, revise the markdown files directly and re-run validation. Maximum revision attempts: 2.
5. Do not delete files. Do not run git commit/push. Do not run npm run build. Do not use rm.
6. If a hard blocker appears, stop and report it in JSON.

Output only a JSON object matching this shape:
{
  "status": "passed" | "blocked",
  "slug": "lego-ninjago-movie-video-game-worth-it",
  "score": 0,
  "revisionAttempts": 0,
  "validated": false,
  "articlePaths": ["src/content/posts/en/lego-ninjago-movie-video-game-worth-it.md","src/content/posts/zh-hans/lego-ninjago-movie-video-game-worth-it.md","src/content/posts/ja/lego-ninjago-movie-video-game-worth-it.md","src/content/posts/fr/lego-ninjago-movie-video-game-worth-it.md","src/content/posts/es/lego-ninjago-movie-video-game-worth-it.md","src/content/posts/de/lego-ninjago-movie-video-game-worth-it.md","src/content/posts/pt/lego-ninjago-movie-video-game-worth-it.md"],
  "issues": ["..."],
  "commandsRun": ["..."],
  "notes": "short summary"
}
