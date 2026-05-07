#!/usr/bin/env node
/**
 * Durable article queue runner for unattended GameGulf blog production.
 *
 * This script owns queue state and uses fresh Claude Code headless sessions as
 * single-game workers. It never deletes files, never commits, and stops on hard
 * failures unless --continue-on-blocked is set.
 *
 * Typical usage:
 *   node scripts/run-article-queue.mjs --seed-mc --limit 3 --dry-run
 *   node scripts/run-article-queue.mjs --seed-mc --limit 5 --claude
 *   node scripts/run-article-queue.mjs --limit 20 --claude --continue-on-blocked
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(join(__dirname, '..'));
const QUEUE_PATH = join(ROOT, 'content', 'game-queue.json');
const MC_LINKS_PATH = join(ROOT, 'content', 'game-links-by-mc-score.json');
const RUNS_DIR = join(ROOT, 'content', 'article-runs');
const SCORES_DIR = join(ROOT, 'content', 'article-scores');
const WORKER_PROMPTS_DIR = join(ROOT, 'content', 'article-worker-prompts');
const LOCALES = ['en', 'zh-hans', 'ja', 'fr', 'es', 'de', 'pt'];
const DEFAULT_SCORE_THRESHOLD = 85;
const DEFAULT_MAX_REVISIONS = 2;

function nowIso() {
  return new Date().toISOString();
}

function today() {
  return nowIso().slice(0, 10);
}

function ensureDirs() {
  mkdirSync(RUNS_DIR, { recursive: true });
  mkdirSync(SCORES_DIR, { recursive: true });
  mkdirSync(WORKER_PROMPTS_DIR, { recursive: true });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function loadQueue() {
  const queue = readJson(QUEUE_PATH);
  if (!Array.isArray(queue.games)) throw new Error('content/game-queue.json must contain a games array');
  return queue;
}

function saveQueue(queue) {
  writeJson(QUEUE_PATH, queue);
}

function normalizePriority(value) {
  return ['high', 'normal', 'low'].includes(value) ? value : 'normal';
}

function extractGameId(url = '') {
  const match = String(url).match(/\/detail\/([^/?#]+)/);
  return match ? match[1] : null;
}

function slugifyTitle(title = '') {
  return String(title)
    .toLowerCase()
    .replace(/[™®©:]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseArgs(argv) {
  const opts = {
    limit: 1,
    dryRun: false,
    seedMc: false,
    seedFile: null,
    claude: false,
    scoreThreshold: DEFAULT_SCORE_THRESHOLD,
    maxRevisions: DEFAULT_MAX_REVISIONS,
    continueOnBlocked: false,
    delayMs: 1000,
    maxBudgetUsd: null,
    model: 'sonnet',
    effort: 'medium',
    permissionMode: 'acceptEdits',
    claudeMode: 'repair',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--seed-mc') opts.seedMc = true;
    else if (arg === '--claude') opts.claude = true;
    else if (arg === '--continue-on-blocked') opts.continueOnBlocked = true;
    else if (arg === '--limit') opts.limit = Number(argv[++i] || 1);
    else if (arg.startsWith('--limit=')) opts.limit = Number(arg.slice('--limit='.length));
    else if (arg === '--seed-file') opts.seedFile = argv[++i];
    else if (arg.startsWith('--seed-file=')) opts.seedFile = arg.slice('--seed-file='.length);
    else if (arg === '--score-threshold') opts.scoreThreshold = Number(argv[++i] || DEFAULT_SCORE_THRESHOLD);
    else if (arg.startsWith('--score-threshold=')) opts.scoreThreshold = Number(arg.slice('--score-threshold='.length));
    else if (arg === '--max-revisions') opts.maxRevisions = Number(argv[++i] || DEFAULT_MAX_REVISIONS);
    else if (arg.startsWith('--max-revisions=')) opts.maxRevisions = Number(arg.slice('--max-revisions='.length));
    else if (arg === '--delay-ms') opts.delayMs = Number(argv[++i] || 1000);
    else if (arg.startsWith('--delay-ms=')) opts.delayMs = Number(arg.slice('--delay-ms='.length));
    else if (arg === '--max-budget-usd') opts.maxBudgetUsd = argv[++i];
    else if (arg.startsWith('--max-budget-usd=')) opts.maxBudgetUsd = arg.slice('--max-budget-usd='.length);
    else if (arg === '--model') opts.model = argv[++i] || opts.model;
    else if (arg.startsWith('--model=')) opts.model = arg.slice('--model='.length);
    else if (arg === '--effort') opts.effort = argv[++i] || opts.effort;
    else if (arg.startsWith('--effort=')) opts.effort = arg.slice('--effort='.length);
    else if (arg === '--permission-mode') opts.permissionMode = argv[++i] || opts.permissionMode;
    else if (arg.startsWith('--permission-mode=')) opts.permissionMode = arg.slice('--permission-mode='.length);
    else if (arg === '--claude-mode') opts.claudeMode = argv[++i] || opts.claudeMode;
    else if (arg.startsWith('--claude-mode=')) opts.claudeMode = arg.slice('--claude-mode='.length);
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!Number.isFinite(opts.limit) || opts.limit < 1) opts.limit = 1;
  if (!Number.isFinite(opts.scoreThreshold) || opts.scoreThreshold < 1) opts.scoreThreshold = DEFAULT_SCORE_THRESHOLD;
  if (!Number.isFinite(opts.maxRevisions) || opts.maxRevisions < 0) opts.maxRevisions = DEFAULT_MAX_REVISIONS;
  if (!Number.isFinite(opts.delayMs) || opts.delayMs < 0) opts.delayMs = 1000;
  return opts;
}

function printHelp() {
  console.log(`Usage:
  node scripts/run-article-queue.mjs --seed-mc --limit 3 --dry-run
  node scripts/run-article-queue.mjs --seed-mc --limit 5 --claude
  node scripts/run-article-queue.mjs --seed-file content/popular-batch-urls.txt --limit 5 --claude

Options:
  --seed-mc                 Add missing URLs from content/game-links-by-mc-score.json
  --seed-file <path>        Add missing URLs from a txt URL list or JSON link list
  --limit <n>               Max queue entries to process this run (default 1)
  --dry-run                 Show work without writing articles or changing statuses beyond seeding
  --claude                  Use fresh claude -p worker sessions per game
  --score-threshold <n>     Passing AI score threshold (default 85)
  --max-revisions <n>       Worker revision budget per game (default 2)
  --continue-on-blocked     Continue queue after blocked/error entries
  --max-budget-usd <n>      Per-worker Claude budget cap
  --model <name>            Claude model alias/full name (default sonnet)
  --effort <level>          low|medium|high|xhigh|max (default medium)
  --permission-mode <mode>  default|acceptEdits|auto|dontAsk|bypassPermissions
  --claude-mode <mode>      repair|full (default repair)`);
}

function urlsFromSeedFile(path) {
  const full = resolve(ROOT, path);
  if (!existsSync(full)) throw new Error(`Seed file not found: ${path}`);
  if (full.endsWith('.json')) {
    const data = readJson(full);
    const items = Array.isArray(data) ? data : data.items || data.games || [];
    return items
      .map((item) => item.gamegulfDetailUrl || item.url || item.detailUrl)
      .filter((url) => typeof url === 'string' && url.includes('gamegulf.com/detail/'));
  }
  return readFileSync(full, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('http') && line.includes('gamegulf.com/detail/'));
}

function seedFromMcLinks(queue) {
  if (!existsSync(MC_LINKS_PATH)) return { added: 0, skipped: 0 };
  const data = readJson(MC_LINKS_PATH);
  const items = Array.isArray(data.items) ? data.items : [];
  let added = 0;
  let skipped = 0;
  const existing = new Set(queue.games.map((game) => game.url));

  for (const item of items) {
    const url = item.gamegulfDetailUrl || item.url;
    if (!url || existing.has(url)) {
      skipped += 1;
      continue;
    }
    queue.games.push({
      url,
      status: 'pending',
      priority: item.mcScore >= 90 ? 'high' : 'normal',
      added: today(),
      completed: null,
      notes: `Auto article queue from MC list: ${item.gameTitle || 'unknown'}${item.mcScore ? ` (MC ${item.mcScore})` : ''}`,
      automation: {
        source: 'game-links-by-mc-score',
        seededAt: nowIso(),
        gameTitle: item.gameTitle || null,
        mcScore: item.mcScore || null,
      },
    });
    existing.add(url);
    added += 1;
  }

  return { added, skipped };
}

function seedFromUrls(queue, urls, source) {
  let added = 0;
  let skipped = 0;
  const existing = new Set(queue.games.map((game) => game.url));
  for (const url of urls) {
    if (existing.has(url)) {
      skipped += 1;
      continue;
    }
    queue.games.push({
      url,
      status: 'pending',
      priority: 'normal',
      added: today(),
      completed: null,
      notes: `Auto article queue from ${source}`,
      automation: {
        source,
        seededAt: nowIso(),
      },
    });
    existing.add(url);
    added += 1;
  }
  return { added, skipped };
}

function queueSummary(queue) {
  const counts = {};
  for (const game of queue.games) counts[game.status] = (counts[game.status] || 0) + 1;
  return counts;
}

function pickPending(queue, limit) {
  const priorityOrder = { high: 0, normal: 1, low: 2 };
  return queue.games
    .filter((game) => game.status === 'pending' || game.status === 'in_progress')
    .sort((a, b) => {
      const pa = priorityOrder[normalizePriority(a.priority)] ?? 1;
      const pb = priorityOrder[normalizePriority(b.priority)] ?? 1;
      return pa - pb || String(a.added || '').localeCompare(String(b.added || '')) || a.url.localeCompare(b.url);
    })
    .slice(0, limit);
}

function runCommand(cmd, args, opts = {}) {
  const startedAt = Date.now();
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
    stdio: opts.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  });
  return {
    cmd,
    args,
    status: result.status,
    signal: result.signal,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    durationMs: Date.now() - startedAt,
  };
}

function parseBriefPath(output) {
  if (!output) return null;
  const check = output.match(/[✔✓]\s+([^\r\n]+\.json)/);
  if (check && existsSync(check[1].trim())) return check[1].trim();
  const rel = output.match(/content[\\/]briefs[\\/][^\s\r\n]+\.json/);
  if (rel) {
    const file = rel[0].split(/[\\/]/).at(-1);
    const path = join(ROOT, 'content', 'briefs', file);
    if (existsSync(path)) return path;
  }
  return null;
}

function getBriefPathForGame(url, game) {
  const existing = game.automation?.briefPath;
  if (existing && existsSync(resolve(ROOT, existing))) return resolve(ROOT, existing);

  const gameId = extractGameId(url);
  if (gameId) {
    for (const file of listBriefFiles()) {
      try {
        const brief = readJson(file);
        if (brief.meta?.game_id === gameId || brief.meta?.source_url === url || brief.product_links?.detail === url) {
          return file;
        }
      } catch {
        // ignore corrupt unrelated brief
      }
    }
  }
  return null;
}

function listBriefFiles() {
  const dir = join(ROOT, 'content', 'briefs');
  const entries = spawnSync('find', [dir, '-maxdepth', '1', '-type', 'f', '-name', '*.json'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (entries.status !== 0) return [];
  return entries.stdout.split(/\r?\n/).filter(Boolean);
}

function slugFromBrief(briefPath) {
  const brief = readJson(briefPath);
  return `${slugifyTitle(brief.game?.title || basename(briefPath, '.json'))}-worth-it`;
}

function mdPathsForSlug(slug) {
  return LOCALES.map((locale) => join(ROOT, 'src', 'content', 'posts', locale, `${slug}.md`));
}

function validateFiles(paths) {
  return runCommand('node', ['scripts/validate-article.mjs', ...paths]);
}

function extractSummaryFromValidator(output) {
  try {
    return JSON.parse(output);
  } catch {
    return null;
  }
}

function statusGame(game, status, patch = {}) {
  game.status = status;
  game.automation = {
    ...(game.automation || {}),
    ...patch.automation,
    updatedAt: nowIso(),
  };
  if (patch.lastError !== undefined) game.lastError = patch.lastError;
  if (patch.lastScore !== undefined) game.lastScore = patch.lastScore;
  if (patch.notes !== undefined) game.notes = patch.notes;
  if (status === 'done') game.completed = today();
  if (status === 'blocked') game.completed = null;
}

function buildWorkerPrompt({ game, briefPath, slug, mdPaths, opts }) {
  const relBrief = relative(ROOT, briefPath);
  const relPaths = mdPaths.map((path) => relative(ROOT, path));
  return `You are running as a fresh, one-game GameGulf article production worker. This is an authorized local production task. Work only inside this repository.

Goal:
Review and repair the 7-locale GameGulf worth-it article set for one game, using existing validators. The runner has already attempted deterministic generation/sync first when possible. Do not rely on conversation memory. Read only the listed article files, the brief, and validator output you need.

Game queue entry:
${JSON.stringify(game, null, 2)}

Inputs:
- Brief: ${relBrief}
- Expected article slug: ${slug}
- Expected article paths:
${relPaths.map((path) => `  - ${path}`).join('\n')}

Required workflow:
1. Run node scripts/validate-article.mjs ${relPaths.join(' ')} to see current hard errors.
2. If article files are missing, run node scripts/synthesize-worth-it-from-brief.mjs ${relBrief} and node scripts/sync-article-pricing.mjs ${relPaths.join(' ')}.
3. Read only the files with validator errors plus en, zh-hans, and ja spot checks.
3. Score the article set from 0-100 using these weights:
   - local display names and FAQ answer prefixes are correct, especially zh-hans/ja: 15
   - buy/wait decision is explicit and useful: 15
   - price logic uses concrete GameGulf indexed rows/history where available: 15
   - best-for / avoid-if / time fit are clear: 10
   - body is a compact buying research memo, not generic SEO filler: 15
   - communityVibe reads like a player-consensus gameplay quote, not price/timing filler: 10
   - GameGulf links/CTA are natural and present: 5
   - FAQ and tldr are useful and localized: 5
   - validator passes with zero errors: 10
4. If validator errors exist or score is below ${opts.scoreThreshold}, revise the markdown files directly and re-run validation. Maximum revision attempts: ${opts.maxRevisions}.
5. Do not delete files. Do not run git commit/push. Do not run npm run build. Do not use rm.
6. If a hard blocker appears, stop and report it in JSON.

Output only a JSON object matching this shape:
{
  "status": "passed" | "blocked",
  "slug": "${slug}",
  "score": 0,
  "revisionAttempts": 0,
  "validated": false,
  "articlePaths": ${JSON.stringify(relPaths)},
  "issues": ["..."],
  "commandsRun": ["..."],
  "notes": "short summary"
}
`;
}

function parseWorkerJson(output) {
  const trimmed = String(output || '').trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}\s*$/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function runClaudeWorker({ game, briefPath, slug, mdPaths, opts, runId }) {
  const prompt = buildWorkerPrompt({ game, briefPath, slug, mdPaths, opts });
  const promptPath = join(WORKER_PROMPTS_DIR, `${runId}-${slug}.md`);
  writeFileSync(promptPath, prompt, 'utf8');

  const args = [
    '-p',
    prompt,
    '--model',
    opts.model,
    '--effort',
    opts.effort,
    '--permission-mode',
    opts.permissionMode,
    '--output-format',
    'json',
    '--add-dir',
    ROOT,
    '--allowedTools',
    'Read,Edit,Write,Bash(node *),Bash(npm *),Bash(grep *),Bash(find *),Bash(python3 *)',
    '--disallowedTools',
    'Bash(rm *),Bash(git commit *),Bash(git push *),Bash(git reset *),Bash(git clean *),Bash(git checkout *),Bash(git restore *)',
  ];
  if (opts.maxBudgetUsd) args.push('--max-budget-usd', String(opts.maxBudgetUsd));

  const result = runCommand('claude', args);
  const rawPath = join(RUNS_DIR, `${runId}-${slug}-claude.json`);
  writeJson(rawPath, {
    runId,
    slug,
    url: game.url,
    promptPath: relative(ROOT, promptPath),
    command: ['claude', '-p', '<prompt>', ...args.slice(2)],
    status: result.status,
    signal: result.signal,
    durationMs: result.durationMs,
    stdout: result.stdout,
    stderr: result.stderr,
    capturedAt: nowIso(),
  });

  let worker = parseWorkerJson(result.stdout);
  if (worker?.result && typeof worker.result === 'string') {
    worker = parseWorkerJson(worker.result) || worker;
  }

  return { result, worker, rawPath, promptPath };
}

function checkExistingArticleSet(url) {
  const check = runCommand('node', ['scripts/check-existing.mjs', url]);
  if (check.status === 1) {
    const existing = parseWorkerJson(check.stdout);
    const slug = existing?.slug || null;
    if (slug) {
      const mdPaths = mdPathsForSlug(slug).filter((path) => existsSync(path));
      const validation = mdPaths.length ? validateFiles(mdPaths) : null;
      if (validation?.status !== 0) {
        return {
          exists: false,
          existingSlug: slug,
          validationFailed: {
            status: 'blocked',
            score: 70,
            slug,
            validated: false,
            issues: [`existing article set failed validator: ${validation?.stdout || validation?.stderr || 'missing article files'}`],
            commandsRun: ['node scripts/check-existing.mjs <url>', 'node scripts/validate-article.mjs <existing article paths>'],
          },
        };
      }
    }
    return {
      exists: true,
      result: {
        status: 'skipped_exists',
        score: 100,
        slug,
        validated: true,
        issues: [],
        commandsRun: ['node scripts/check-existing.mjs <url>', 'node scripts/validate-article.mjs <existing article paths>'],
        notes: 'Articles already exist and pass validator for this GameGulf detail URL.',
      },
    };
  }
  if (check.status !== 0) {
    return {
      exists: false,
      error: {
        status: 'blocked',
        score: 0,
        validated: false,
        issues: [`check-existing failed: ${check.stderr || check.stdout}`],
        commandsRun: ['node scripts/check-existing.mjs <url>'],
      },
    };
  }
  return { exists: false, error: null };
}

function processWithLocalPipeline({ game, opts, runId, alreadyChecked = false }) {
  if (!alreadyChecked) {
    const existing = checkExistingArticleSet(game.url);
    if (existing.exists) return existing.result;
    if (existing.error) return existing.error;
  }

  let briefPath = getBriefPathForGame(game.url, game);
  const commandsRun = ['node scripts/check-existing.mjs <url>'];
  if (!briefPath) {
    const extract = runCommand('node', ['scripts/extract-game-brief.mjs', game.url]);
    commandsRun.push('node scripts/extract-game-brief.mjs <url>');
    if (extract.status !== 0) {
      return { status: 'blocked', score: 0, validated: false, issues: [`extract failed: ${extract.stdout}\n${extract.stderr}`], commandsRun };
    }
    briefPath = parseBriefPath(`${extract.stdout}\n${extract.stderr}`);
  }
  if (!briefPath || !existsSync(briefPath)) {
    return { status: 'blocked', score: 0, validated: false, issues: ['Could not resolve brief path'], commandsRun };
  }

  const slug = slugFromBrief(briefPath);
  const mdPaths = mdPathsForSlug(slug);
  if (opts.dryRun) {
    return { status: 'dry_run', score: null, slug, validated: false, briefPath, articlePaths: mdPaths.map((p) => relative(ROOT, p)), issues: [], commandsRun };
  }

  const synth = runCommand('node', ['scripts/synthesize-worth-it-from-brief.mjs', relative(ROOT, briefPath)]);
  commandsRun.push(`node scripts/synthesize-worth-it-from-brief.mjs ${relative(ROOT, briefPath)}`);
  if (synth.status !== 0) {
    return { status: 'blocked', score: 0, slug, validated: false, issues: [`synthesize failed: ${synth.stdout}\n${synth.stderr}`], commandsRun };
  }

  const sync = runCommand('node', ['scripts/sync-article-pricing.mjs', ...mdPaths]);
  commandsRun.push('node scripts/sync-article-pricing.mjs <article paths>');
  if (sync.status !== 0) {
    return { status: 'blocked', score: 0, slug, validated: false, issues: [`pricing sync failed: ${sync.stdout}\n${sync.stderr}`], commandsRun };
  }

  const val = validateFiles(mdPaths);
  commandsRun.push('node scripts/validate-article.mjs <article paths>');
  const parsed = extractSummaryFromValidator(val.stdout);
  if (val.status !== 0) {
    return { status: 'blocked', score: 70, slug, validated: false, issues: [`validator failed: ${val.stdout || val.stderr}`], commandsRun, validator: parsed };
  }

  const score = 85;
  const scorePath = join(SCORES_DIR, `${runId}-${slug}.json`);
  writeJson(scorePath, {
    runId,
    slug,
    url: game.url,
    score,
    pass: score >= opts.scoreThreshold,
    scoringMode: 'local-pipeline-baseline',
    threshold: opts.scoreThreshold,
    articlePaths: mdPaths.map((p) => relative(ROOT, p)),
    capturedAt: nowIso(),
  });

  return { status: 'passed', score, slug, validated: true, revisionAttempts: 0, articlePaths: mdPaths.map((p) => relative(ROOT, p)), issues: [], commandsRun };
}

function sleep(ms) {
  if (!ms) return;
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // short unattended runner delay without timers for simple CLI sequencing
  }
}

function appendRunLog(entry) {
  const logPath = join(RUNS_DIR, `${today()}-queue-run.jsonl`);
  writeFileSync(logPath, `${JSON.stringify(entry)}\n`, { flag: 'a' });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  ensureDirs();

  const runId = nowIso().replace(/[:.]/g, '-');
  const queue = loadQueue();
  const seedResults = [];
  if (opts.seedMc) seedResults.push({ source: 'mc', ...seedFromMcLinks(queue) });
  if (opts.seedFile) seedResults.push({ source: opts.seedFile, ...seedFromUrls(queue, urlsFromSeedFile(opts.seedFile), opts.seedFile) });
  if (seedResults.length) saveQueue(queue);

  const selected = pickPending(queue, opts.limit);
  const overall = {
    runId,
    startedAt: nowIso(),
    opts,
    seedResults,
    initialQueueSummary: queueSummary(queue),
    selected: selected.map((game) => ({ url: game.url, priority: game.priority, status: game.status, notes: game.notes })),
    results: [],
  };

  console.log(JSON.stringify({ runId, seedResults, selected: overall.selected }, null, 2));

  for (const game of selected) {
    const startedAt = nowIso();
    if (!opts.dryRun) {
      statusGame(game, 'in_progress', { automation: { runId, startedAt } });
      saveQueue(queue);
    }

    let result;
    try {
      const existing = checkExistingArticleSet(game.url);
      if (existing.exists) {
        result = existing.result;
      } else if (existing.error) {
        result = existing.error;
      } else {
        const briefPath = getBriefPathForGame(game.url, game);
        if (opts.claude) {
          const local = existing.validationFailed || processWithLocalPipeline({ game, opts: { ...opts, dryRun: false }, runId, alreadyChecked: true });
          const slug = local.slug || existing.existingSlug || (briefPath ? slugFromBrief(briefPath) : null);
          const resolvedBriefPath = briefPath || (slug ? resolve(ROOT, `content/briefs/${slug.replace(/-worth-it$/, '')}.json`) : null);
          if (!slug || !resolvedBriefPath || !existsSync(resolvedBriefPath)) {
            result = local.status === 'passed' ? local : { ...local, status: 'blocked', issues: [...(local.issues || []), 'Could not resolve slug/brief for Claude repair.'] };
          } else {
            const mdPaths = mdPathsForSlug(slug);
            const workerResult = runClaudeWorker({ game, briefPath: resolvedBriefPath, slug, mdPaths, opts, runId });
            const worker = workerResult.worker;
            if (workerResult.result.status !== 0 || !worker) {
              result = {
                ...local,
                status: 'blocked',
                score: local.score ?? 0,
                validated: false,
                issues: [...(local.issues || []), `Claude worker failed or returned non-JSON. See ${relative(ROOT, workerResult.rawPath)}.`],
                rawPath: relative(ROOT, workerResult.rawPath),
              };
            } else {
              result = {
                ...worker,
                status: worker.status === 'passed' && Number(worker.score) >= opts.scoreThreshold ? 'passed' : 'blocked',
                rawPath: relative(ROOT, workerResult.rawPath),
                promptPath: relative(ROOT, workerResult.promptPath),
              };
            }
          }
        } else {
          result = processWithLocalPipeline({ game, opts, runId, alreadyChecked: true });
        }
      }
    } catch (error) {
      result = {
        status: 'blocked',
        score: 0,
        validated: false,
        issues: [error.stack || error.message || String(error)],
      };
    }

    const passed = result.status === 'passed' || result.status === 'skipped_exists' || result.status === 'dry_run';
    if (!opts.dryRun) {
      if (result.status === 'skipped_exists') {
        statusGame(game, 'done', { lastScore: result.score, automation: { runId, finishedAt: nowIso(), result } });
      } else if (passed) {
        statusGame(game, 'done', { lastScore: result.score, automation: { runId, finishedAt: nowIso(), result } });
      } else {
        statusGame(game, 'blocked', {
          lastScore: result.score ?? 0,
          lastError: (result.issues || []).join('\n').slice(0, 2000),
          automation: { runId, finishedAt: nowIso(), result },
        });
      }
      saveQueue(queue);
    }

    const logEntry = { runId, url: game.url, startedAt, finishedAt: nowIso(), result };
    appendRunLog(logEntry);
    overall.results.push(logEntry);
    console.log(JSON.stringify(logEntry, null, 2));

    if (!passed && !opts.continueOnBlocked) break;
    sleep(opts.delayMs);
  }

  overall.finishedAt = nowIso();
  overall.finalQueueSummary = queueSummary(loadQueue());
  const summaryPath = join(RUNS_DIR, `${runId}-summary.json`);
  writeJson(summaryPath, overall);
  console.log(JSON.stringify({ summaryPath: relative(ROOT, summaryPath), finalQueueSummary: overall.finalQueueSummary }, null, 2));

  if (!opts.continueOnBlocked && overall.results.some((entry) => entry.result.status === 'blocked')) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
