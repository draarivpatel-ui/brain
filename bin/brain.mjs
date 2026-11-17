#!/usr/bin/env node
import { loadIndex } from "../lib/index.mjs";
import { listFiles, search } from "../lib/claude-code.mjs";
import { serve } from "../lib/server.mjs";

const [cmd = "help", ...rest] = process.argv.slice(2);
const when = (t) => (t || "").slice(0, 16).replace("T", " ");

if (cmd === "list") {
  const n = Number(rest[0]) || 20;
  for (const r of loadIndex().slice(0, n)) console.log(`${r.id.slice(0, 8)}  ${when(r.end)}  ${String(r.messages).padStart(4)} msgs  ${(r.cwd || "").split("/").slice(-1)[0].padEnd(18)} ${r.title}`);
} else if (cmd === "search") {
  const q = rest.join(" ");
  if (!q) { console.error("usage: brain search <words>"); process.exit(1); }
  const byId = new Map(loadIndex().map((r) => [r.id, r]));
  for (const h of await search(q, listFiles())) {
    const r = byId.get(h.id) || {};
    console.log(`${h.id.slice(0, 8)}  ${when(r.end)}  ${r.cwd || ""}\n  ${r.title}\n  ...${h.snippet}...\n`);
  }
} else if (cmd === "serve") {
  const port = Number(rest[0]) || 4711;
  await serve(port);
  console.log(`Brain is running at http://localhost:${port} (local only, reads ~/.claude/projects)`);
} else {
  console.log("brain list [n] | brain search <words> | brain serve [port]");
}
