import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { listFiles, summarize } from "./claude-code.mjs";

const CACHE = process.env.BRAIN_CACHE || join(homedir(), ".brain", "index.json");

export function loadIndex({ limit = Infinity } = {}) {
  let cache = {};
  try { cache = JSON.parse(readFileSync(CACHE, "utf8")); } catch {}
  const files = listFiles();
  const next = {}; const out = [];
  for (const f of files.slice(0, limit)) {
    const key = `${f.mtime}:${f.size}`;
    const hit = cache[f.id];
    const row = hit && hit.key === key ? hit.row : (() => { try { return summarize(f); } catch { return null; } })();
    if (!row) continue;
    next[f.id] = { key, row }; out.push({ ...row, path: f.path });
  }
  try { mkdirSync(dirname(CACHE), { recursive: true }); writeFileSync(CACHE, JSON.stringify({ ...cache, ...next })); } catch {}
  return out.filter((r) => r.messages > 0).sort((a, b) => (b.end || "").localeCompare(a.end || ""));
}
