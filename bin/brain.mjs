#!/usr/bin/env node
import { loadIndex } from "../lib/index.mjs";
import { listFiles, search, parseSession } from "../lib/claude-code.mjs";
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
} else if (cmd === "share") {
  const want = rest.find((a) => !a.startsWith("--")) || "latest";
  const rows = loadIndex();
  const row = want === "latest" ? rows[0] : rows.find((r) => r.id.startsWith(want));
  if (!row) { console.error("No session matches " + want); process.exit(1); }
  const s = parseSession(listFiles().find((f) => f.id === row.id).path);
  // Share the project name, not the full folder path.
  s.cwd = (s.cwd || "").split("/").filter(Boolean).slice(-1)[0] || "";
  s.files = s.files.map((f) => f.split("/").slice(-2).join("/"));
  console.log(`Session: ${s.title}\n${s.messages.length} messages, ${s.files.length} files edited, project ${s.cwd}`);
  if (!rest.includes("--yes")) {
    console.log("\nThis uploads the whole conversation (keys and tokens are hidden) to a link anyone with it can open.\nRun again with --yes to upload.");
    process.exit(0);
  }
  const base = process.env.BRAIN_URL || "https://brain.flisk.si";
  const res = await fetch(base + "/api/sessions", { method: "POST", body: JSON.stringify(s) });
  const out = await res.json();
  if (!res.ok) { console.error(out.error || res.status); process.exit(1); }
  console.log(`\nShared: ${out.url}\nTo delete it: curl -X DELETE "${base}/api/s/${out.id}?key=${out.deleteKey}"`);
} else {
  console.log("brain list [n] | brain search <words> | brain serve [port] | brain share [id|latest] [--yes]");
}
