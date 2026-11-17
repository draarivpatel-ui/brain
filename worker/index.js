import { redact } from "../lib/redact.mjs";

const MAX = 5 * 1024 * 1024; // bytes per shared session
const ALPHA = "abcdefghjkmnpqrstuvwxyz23456789";
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const newId = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => ALPHA[b % ALPHA.length]).join("");
const sha = async (s) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, "0")).join("");
const str = (v, n) => (typeof v === "string" ? redact(v).slice(0, n) : "");

// Rebuild the session from known fields only, redacting every string again.
function clean(s) {
  if (!s || !Array.isArray(s.messages)) return null;
  return {
    agent: str(s.agent, 40), model: str(s.model, 80), cwd: str(s.cwd, 80), branch: str(s.branch, 120),
    start: str(s.start, 40), end: str(s.end, 40), title: str(s.title, 200) || "Untitled session",
    files: (Array.isArray(s.files) ? s.files : []).slice(0, 500).map((f) => str(f, 200)),
    messages: s.messages.slice(0, 20000).map((m) => ({
      role: m.role === "user" ? "user" : "assistant", time: str(m.time, 40), text: str(m.text, 60000),
      tools: (Array.isArray(m.tools) ? m.tools : []).slice(0, 200).map((t) => ({ name: str(t.name, 60), summary: str(t.summary, 400) })),
    })),
  };
}

export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    const p = u.pathname;
    if (req.method === "POST" && p === "/api/sessions") {
      const raw = await req.text();
      if (raw.length > MAX) return json({ error: "Session is too large to share (limit 5 MB)." }, 413);
      let body; try { body = JSON.parse(raw); } catch { return json({ error: "Not JSON." }, 400); }
      const session = clean(body);
      if (!session) return json({ error: "Not a session." }, 400);
      const id = newId(), key = newId() + newId();
      await env.SESSIONS.put("s:" + id, JSON.stringify({ session, deleteHash: await sha(key), created: new Date().toISOString() }));
      return json({ id, url: `${u.origin}/s/${id}`, deleteKey: key }, 201);
    }
    const m = p.match(/^\/api\/s\/([a-z0-9]{12})$/);
    if (m) {
      const rec = await env.SESSIONS.get("s:" + m[1], "json");
      if (!rec) return json({ error: "Not found." }, 404);
      if (req.method === "DELETE") {
        if ((await sha(u.searchParams.get("key") || "")) !== rec.deleteHash) return json({ error: "Wrong delete key." }, 403);
        await env.SESSIONS.delete("s:" + m[1]);
        return json({ deleted: true });
      }
      return json({ ...rec.session, shared: rec.created });
    }
    if (/^\/s\/[a-z0-9]{12}$/.test(p)) {
      const r = await env.ASSETS.fetch(new URL("/shared.html", u));
      return new Response(r.body, { headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex", "referrer-policy": "no-referrer" } });
    }
    return new Response("Not found", { status: 404 });
  },
};
