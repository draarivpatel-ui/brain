const root = document.getElementById("root");
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const when = (t) => (t || "").slice(0, 16).replace("T", " ");
const proj = (c) => (c || "").split("/").filter(Boolean).slice(-1)[0] || "";
const get = (u) => fetch(u).then((r) => r.json());

function row(s, snippet) {
  const a = el("a", "r"); a.href = "#/s/" + s.id;
  a.append(el("span", "t", s.title), el("span", "m", proj(s.cwd)), el("span", "m", when(s.end)), el("span", "m", s.messages + " msgs"));
  if (snippet) a.append(el("span", "snip", "..." + snippet + "..."));
  return a;
}
function table(list, withSnip) {
  const t = el("div", "tbl");
  const h = el("div", "r h"); h.append(el("span", "", "Session"), el("span", "", "Project"), el("span", "", "Updated"), el("span", "", "Size")); t.append(h);
  if (!list.length) t.append(el("div", "empty", "Nothing found."));
  for (const s of list.slice(0, 200)) t.append(row(s, withSnip && s.snippet));
  return t;
}
async function home() {
  root.replaceChildren(el("div", "kicker", "Your sessions"), el("h1", "", "Everything your agents did."));
  const bar = el("div", "bar"), q = el("input"); q.type = "search"; q.placeholder = "Search every session, prompt and answer..."; bar.append(q);
  const out = el("div"); root.append(bar, out);
  const all = await get("/api/sessions");
  document.getElementById("count").textContent = all.length + " sessions, read from this computer";
  out.append(table(all));
  let timer;
  q.oninput = () => { clearTimeout(timer); timer = setTimeout(async () => {
    out.replaceChildren(q.value.trim() ? el("div", "empty", "Searching...") : table(all));
    if (q.value.trim()) { const hits = await get("/api/search?q=" + encodeURIComponent(q.value)); out.replaceChildren(table(hits, true)); }
  }, 300); };
}
async function session(id) {
  const s = await get("/api/session?id=" + encodeURIComponent(id));
  if (s.error) return root.replaceChildren(el("div", "empty", "Session not found."));
  const back = el("a", "kicker", "< All sessions"); back.href = "#/";
  const meta = el("div", "meta");
  for (const x of [s.agent, s.model, proj(s.cwd), s.branch, when(s.start), s.messages.length + " messages", s.files.length + " files edited"]) if (x) meta.append(el("span", "", x));
  root.replaceChildren(back, el("h1", "", s.title), meta);
  for (const m of s.messages) {
    const d = el("div", "msg " + m.role); d.append(el("div", "who", m.role === "user" ? "You" : "Agent"));
    if (m.text) d.append(el("div", "body", m.text));
    for (const t of m.tools) { const l = el("div", "tool"); l.append(el("b", "", t.name + " "), document.createTextNode(t.summary)); d.append(l); }
    root.append(d);
  }
}
function route() { const m = location.hash.match(/^#\/s\/(.+)$/); m ? session(m[1]) : home(); window.scrollTo(0, 0); }
addEventListener("hashchange", route); route();
