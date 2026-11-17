const root = document.getElementById("root");
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const when = (t) => (t || "").slice(0, 16).replace("T", " ");
(async () => {
  const id = location.pathname.split("/").pop();
  const r = await fetch("/api/s/" + id);
  if (!r.ok) return root.replaceChildren(el("div", "empty", "This session was not found. It may have been deleted."));
  const s = await r.json();
  document.title = s.title + " - Brain";
  const meta = el("div", "meta");
  for (const x of [s.agent, s.model, s.cwd, s.branch, when(s.start), s.messages.length + " messages", s.files.length + " files edited"]) if (x) meta.append(el("span", "", x));
  root.replaceChildren(el("div", "kicker", "Shared with Brain, " + when(s.shared)), el("h1", "", s.title), meta);
  for (const m of s.messages) {
    const d = el("div", "msg " + m.role); d.append(el("div", "who", m.role === "user" ? "User" : "Agent"));
    if (m.text) d.append(el("div", "body", m.text));
    for (const t of m.tools) { const l = el("div", "tool"); l.append(el("b", "", t.name + " "), document.createTextNode(t.summary)); d.append(l); }
    root.append(d);
  }
})();
