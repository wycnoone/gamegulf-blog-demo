#!/usr/bin/env node
/**
 * Auto-sync game-queue.json with generated articles
 * 
 * This script:
 * 1. Scans all generated articles in src/content/posts
 * 2. Extracts gameHref from frontmatter
 * 3. Checks if game exists in game-queue.json
 * 4. Auto-adds missing games with status "done"
 * 
 * Usage:
 *   node scripts/sync-queue-auto.mjs
 *   node scripts/sync-queue-auto.mjs --dry-run
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUEUE_FILE = join(__dirname, '..', 'content', 'game-queue.json');

function loadQueue() {
  if (!existsSync(QUEUE_FILE)) {
    return { games: [] };
  }
  return JSON.parse(readFileSync(QUEUE_FILE, 'utf8'));
}

function saveQueue(data) {
  writeFileSync(QUEUE_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function extractGameHref(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  
  const fm = yaml.load(match[1]);
  return fm?.gameHref || null;
}

function syncQueue(dryRun = false) {
  // Scan all articles (both -worth-it.md and other types like -sale-guide.md)
  const output = execSync('find src/content/posts -name "*.md" -type f | grep -v node_modules', { encoding: 'utf8' });
  const files = output.trim().split('\n').filter(f => f.length > 0);
  const queue = loadQueue();
  
  let added = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const file of files) {
    const gameHref = extractGameHref(file);
    if (!gameHref) continue;
    
    // Check if game already in queue
    const existing = queue.games.find(g => g.url === gameHref);
    
    if (existing) {
      // Update status if needed
      if (existing.status !== 'done') {
        existing.status = 'done';
        existing.completed = today();
        updated++;
        if (!dryRun) {
          console.log(`✓ Updated: ${gameHref.split('/').pop()} → done`);
        }
      } else {
        skipped++;
      }
    } else {
      // Auto-add new game
      const gameId = gameHref.split('/').pop();
      const entry = {
        url: gameHref,
        status: 'done',
        priority: 'normal',
        added: today(),
        completed: today(),
        notes: `Auto-added from generated article (${file.split('/').pop().replace('.md', '')})`,
      };
      queue.games.push(entry);
      added++;
      if (!dryRun) {
        console.log(`✓ Added: ${gameId} (${entry.notes})`);
      }
    }
  }
  
  // Deduplicate: remove entries with URLs not found in articles
  const articleUrls = new Set(
    Array.from({ length: files.length }, (_, i) => files[i])
      .map(extractGameHref)
      .filter(Boolean)
  );
  
  const beforeDedup = queue.games.length;
  queue.games = queue.games.filter(g => articleUrls.has(g.url));
  const removed = beforeDedup - queue.games.length;
  
  if (dryRun) {
    console.log(`\n[DRY RUN] Would add ${added} games, update ${updated} games, skip ${skipped} games`);
    if (removed > 0) {
      console.log(`[DRY RUN] Would remove ${removed} orphaned entries (URLs not in articles)`);
    }
  } else {
    saveQueue(queue);
    console.log(`\n✓ Done. Added ${added} games, updated ${updated} games, skipped ${skipped} games`);
    if (removed > 0) {
      console.log(`✓ Removed ${removed} orphaned entries (URLs not in articles)`);
    }
    console.log(`Total games in queue: ${queue.games.length}`);
  }
  
  return { added, updated, skipped, removed };
}

// CLI
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-n');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node scripts/sync-queue-auto.mjs [options]

Auto-syncs game-queue.json with generated articles.

Options:
  --dry-run, -n    Show what would be done without making changes
  --help, -h       Show this help message

Examples:
  node scripts/sync-queue-auto.mjs           # Sync queue
  node scripts/sync-queue-auto.mjs --dry-run # Preview changes
`);
  process.exit(0);
}

syncQueue(dryRun);
