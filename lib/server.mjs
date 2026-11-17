import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadIndex } from "./index.mjs";
import { listFiles, parseSession, search } from "./claude-code.mjs";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..", "app");
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };

export function serve(port = 4711) {
  let idx = null;
  const index = () => (idx ??= loadIndex());
  const server = createServer(async (req, res) => {
    const u = new URL(req.url, "http://x");
    const json = (o, c = 200) => { res.writeHead(c, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
    try {
      if (u.pathname === "/api/sessions") return json(index().map(({ path, ...r }) => r));
      if (u.pathname === "/api/refresh") { idx = null; return json({ count: index().length }); }
      if (u.pathname === "/api/session") {
        const f = listFiles().find((x) => x.id === u.searchParams.get("id"));
        return f ? json(parseSession(f.path)) : json({ error: "not found" }, 404);
      }
      if (u.pathname === "/api/search") {
        const hits = await search(u.searchParams.get("q") || "", listFiles());
        const byId = new Map(index().map((r) => [r.id, r]));
        return json(hits.map((h) => ({ ...byId.get(h.id), path: undefined, score: h.score, snippet: h.snippet })));
      }
      const file = u.pathname === "/" ? "index.html" : u.pathname.slice(1);
      if (!/^[\w.-]+$/.test(file)) { res.writeHead(404); return res.end(); }
      const ext = file.slice(file.lastIndexOf("."));
      let body;
      try { body = readFileSync(join(APP, file)); } catch { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "content-type": TYPES[ext] || "text/plain" });
      res.end(body);
    } catch (e) { if (!res.headersSent) json({ error: String(e.message) }, 500); else res.end(); }
  });
  // Local only: never bind beyond loopback.
  // If the port is taken (often another Brain), use the next free one instead of crashing.
  return new Promise((resolve, reject) => {
    let tries = 0;
    const tryListen = (p) => {
      server.once("error", (e) => {
        if (e.code === "EADDRINUSE" && tries++ < 20) return tryListen(p + 1);
        reject(e);
      });
      server.listen(p, "127.0.0.1", () => { server.removeAllListeners("error"); resolve(server); });
    };
    tryListen(port);
  });
}
