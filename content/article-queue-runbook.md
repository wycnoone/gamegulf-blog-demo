# GameGulf unattended article queue

This workflow is designed for multi-hour article production without relying on a long Claude chat context.

## Core idea

- `content/game-queue.json` is the durable source of truth.
- `scripts/run-article-queue.mjs` owns queue status, run logs, scoring files, and stop conditions.
- Each game can be processed with a fresh `claude -p` worker session via `--claude`.
- The runner never deletes files, never commits, never pushes, and does not run `npm run build`.

## Safe commands

Dry-run from the Metacritic link list:

```bash
node scripts/run-article-queue.mjs --seed-mc --limit 3 --dry-run
```

Run one real game with a fresh Claude worker:

```bash
node scripts/run-article-queue.mjs --seed-mc --limit 1 --claude --max-budget-usd 2
```

Run a longer unattended batch, continuing past blocked entries:

```bash
node scripts/run-article-queue.mjs --seed-mc --limit 10 --claude --continue-on-blocked --max-budget-usd 2
```

Use a URL text list instead:

```bash
node scripts/run-article-queue.mjs --seed-file content/popular-batch-urls.txt --limit 5 --claude --max-budget-usd 2
```

## Stop conditions

A queue item becomes `blocked` if:

- brief extraction fails,
- article synthesis fails,
- pricing sync fails,
- validator fails,
- Claude worker returns invalid JSON,
- AI score is below the threshold after the worker revision budget.

By default, the runner stops on the first blocked item. Add `--continue-on-blocked` to keep processing later games.

## Logs

- Run summaries: `content/article-runs/<run-id>-summary.json`
- JSONL event log: `content/article-runs/<date>-queue-run.jsonl`
- Worker prompts: `content/article-worker-prompts/`
- AI/raw worker outputs: `content/article-runs/*-claude.json`
- Score snapshots: `content/article-scores/`

## After a batch

Run:

```bash
node scripts/validate-article.mjs --all --summary
npm run test
```

Avoid `npm run build` during unattended production because `prebuild` runs price sync and char-limit auto-fix, which can modify many files.
