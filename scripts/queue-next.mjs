#!/usr/bin/env node
/**
 * Get the next pending game from the queue for processing.
 *
 * Usage:
 *   node scripts/queue-next.mjs                 # get next pending game
 *   node scripts/queue-next.mjs --mark-started <url>  # mark a game as in_progress
 *   node scripts/queue-next.mjs --mark-done <url>     # mark a game as done
 *   node scripts/queue-next.mjs --add <url> [priority] [notes]  # add a new game
 *   node scripts/queue-next.mjs --status              # show queue summary
 *
 * Output (JSON):
 *   { "action": "next", "game": { url, priority, notes } }
 *   { "action": "empty", "message": "No pending games in queue" }
 */

import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUEUE_FILE = join(__dirname, '..', 'content', 'game-queue.json');

function loadQueue() {
  return JSON.parse(readFileSync(QUEUE_FILE, 'utf8'));
}

function saveQueue(data) {
  const tmp = `${QUEUE_FILE}.${process.pid}.tmp`;
  const payload = JSON.stringify(data, null, 2) + '\n';
  writeFileSync(tmp, payload, 'utf8');
  try {
    if (existsSync(QUEUE_FILE)) unlinkSync(QUEUE_FILE);
  } catch {
    /* ignore */
  }
  renameSync(tmp, QUEUE_FILE);
}

function today() {
  return new Date().toISOString().split('T')[0];
}

const args = process.argv.slice(2);
const cmd = args[0] || '--next';

if (cmd === '--status') {
  const q = loadQueue();
  const counts = { pending: 0, in_progress: 0, done: 0, skipped: 0 };
  for (const g of q.games) counts[g.status] = (counts[g.status] || 0) + 1;
  console.log(JSON.stringify({ action: 'status', total: q.games.length, ...counts }));
  process.exit(0);
}

if (cmd === '--add') {
  const url = args[1];
  if (!url || !url.includes('gamegulf.com/detail/')) {
    console.error(JSON.stringify({ action: 'error', message: 'Usage: --add <gamegulf-url> [priority] [notes]' }));
    process.exit(2);
  }
  const q = loadQueue();
  const exists = q.games.find((g) => g.url === url);
  if (exists) {
    console.log(JSON.stringify({ action: 'exists', game: exists }));
    process.exit(1);
  }
  const entry = {
    url,
    status: 'pending',
    priority: args[2] || 'normal',
    added: today(),
    completed: null,
    notes: args.slice(3).join(' ') || null,
  };
  q.games.push(entry);
  saveQueue(q);
  console.log(JSON.stringify({ action: 'added', game: entry }));
  process.exit(0);
}

if (cmd === '--mark-started') {
  const url = args[1];
  const q = loadQueue();
  const g = q.games.find((x) => x.url === url);
  if (!g) {
    console.error(JSON.stringify({ action: 'error', message: 'Game not found in queue' }));
    process.exit(2);
  }
  g.status = 'in_progress';
  saveQueue(q);
  console.log(JSON.stringify({ action: 'started', game: g }));
  process.exit(0);
}

if (cmd === '--mark-done') {
  const url = args[1];
  const q = loadQueue();
  const g = q.games.find((x) => x.url === url);
  if (!g) {
    console.error(JSON.stringify({ action: 'error', message: 'Game not found in queue' }));
    process.exit(2);
  }
  g.status = 'done';
  g.completed = today();
  saveQueue(q);
  console.log(JSON.stringify({ action: 'done', game: g }));
  process.exit(0);
}

// Default: --next
const priorityOrder = { high: 0, normal: 1, low: 2 };
const q = loadQueue();
const pending = q.games
  .filter((g) => g.status === 'pending')
  .sort((a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1));

if (pending.length === 0) {
  console.log(JSON.stringify({ action: 'empty', message: 'No pending games in queue' }));
  process.exit(0);
} else {
  console.log(JSON.stringify({ action: 'next', game: pending[0], remaining: pending.length }));
  process.exit(0);
}
