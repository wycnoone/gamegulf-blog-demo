/**
 * Removes NS2 TodaysDeals queue entries (same batch whose articles were purged).
 * Usage: node scripts/prune-ns2-queue-batch.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const p = path.join(root, "content", "game-queue.json");

const j = JSON.parse(fs.readFileSync(p, "utf8"));
const before = j.games.length;
const NOTE = "NS2 TodaysDeals batch";

j.games = j.games.filter((g) => g.notes !== NOTE);
const after = j.games.length;

fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ before, after, removed: before - after }, null, 2));
