// Adapter: Claude Code (~/.claude/projects/*/*.jsonl) -> Brain's common session format.
import { readdirSync, statSync, readFileSync, createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { homedir } from "node:os";
import { join, basename } from "node:path";
import { redact } from "./redact.mjs";

export const ROOT = process.env.BRAIN_CLAUDE_DIR || join(homedir(), ".claude", "projects");

export function listFiles(root = ROOT) {
  const out = [];
  let dirs = [];
  try { dirs = readdirSync(root); } catch { return out; }
  for (const d of dirs) {
    const dir = join(root, d);
    let files = [];
    try { files = readdirSync(dir).filter((f) => f.endsWith(".jsonl")); } catch { continue; }
    for (const f of files) {
      const path = join(dir, f);
      const st = statSync(path);
      out.push({ id: basename(f, ".jsonl"), path, size: st.size, mtime: st.mtimeMs });
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

function blocks(content) {
  if (typeof content === "string") return [{ type: "text", text: content }];
  return Array.isArray(content) ? content : [];
}

// Drop harness noise so a session reads like a conversation.
function cleanUserText(t) {
  return t
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "")
    .replace(/<pasted_content[^>]*>([\s\S]*?)<\/pasted_content[^>]*>/g, "$1")
    .trim();
}

export function parseSession(path) {
  const lines = readFileSync(path, "utf8").split("\n");
  const s = { id: basename(path, ".jsonl"), agent: "claude-code", model: null, cwd: null, branch: null, start: null, end: null, title: null, messages: [], files: [] };
  const files = new Set();
  for (const line of lines) {
    if (!line) continue;
    let d; try { d = JSON.parse(line); } catch { continue; }
    if (d.type === "custom-title" && d.customTitle) s.title = d.customTitle;
    if (d.type !== "user" && d.type !== "assistant") continue;
    if (d.isSidechain) continue;
    if (d.timestamp) { s.start ??= d.timestamp; s.end = d.timestamp; }
    s.cwd ??= d.cwd; s.branch = d.gitBranch || s.branch;
    const m = d.message || {};
    if (m.model && m.model !== "<synthetic>") s.model = m.model;
    const msg = { role: d.type, time: d.timestamp, text: "", tools: [] };
    for (const b of blocks(m.content)) {
      if (b.type === "text") msg.text += (msg.text ? "\n" : "") + (d.type === "user" ? cleanUserText(b.text) : b.text);
      else if (b.type === "tool_use") {
        const inp = b.input || {};
        const f = inp.file_path || inp.path || inp.notebook_path;
        if (f && /^(Edit|Write|NotebookEdit|MultiEdit)$/.test(b.name)) files.add(f);
        msg.tools.push({ name: b.name, summary: redact(String(inp.command || inp.file_path || inp.pattern || inp.description || inp.url || "").slice(0, 300)) });
      }
    }
    msg.text = redact(msg.text);
    if (msg.text || msg.tools.length) s.messages.push(msg);
  }
  s.files = [...files];
  const firstUser = s.messages.find((m) => m.role === "user" && m.text);
  s.title ||= (firstUser?.text || "(empty session)").replace(/\s+/g, " ").slice(0, 90);
  return s;
}

export function summarize(f) {
  // Light pass for the list: the first prompt, project, times. Full parse only on open.
  const s = parseSession(f.path);
  return { id: s.id, agent: s.agent, model: s.model, cwd: s.cwd, branch: s.branch, start: s.start, end: s.end, title: s.title,
    messages: s.messages.length, tools: s.messages.reduce((n, m) => n + m.tools.length, 0), files: s.files.length };
}

export async function search(query, files, limit = 30) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hits = [];
  if (!terms.length) return hits;
  for (const f of files) {
    if (hits.length >= limit * 4) break;
    const rl = createInterface({ input: createReadStream(f.path), crlfDelay: Infinity });
    let score = 0, snippet = null;
    for await (const line of rl) {
      const low = line.toLowerCase();
      if (!terms.every((t) => low.includes(t))) continue;
      let d; try { d = JSON.parse(line); } catch { continue; }
      if (d.type !== "user" && d.type !== "assistant") continue;
      const text = blocks(d.message?.content).map((b) => b.text || "").join(" ");
      const lt = text.toLowerCase();
      if (!terms.every((t) => lt.includes(t))) continue;
      score++;
      if (!snippet) {
        const i = lt.indexOf(terms[0]);
        snippet = redact(text.slice(Math.max(0, i - 80), i + 160).replace(/\s+/g, " "));
      }
    }
    if (score) hits.push({ id: f.id, path: f.path, score, snippet });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
