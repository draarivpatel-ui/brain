const root = document.getElementById("root");
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const when = (t) => (t || "").slice(0, 16).replace("T", " ");
function renderMessages(list, into) {
  // Merge runs of assistant steps that only call tools into one block.
  const rows = [];
  for (const m of list) {
    const prev = rows[rows.length - 1];
    if (m.role === "assistant" && !m.text && prev && prev.role === "assistant" && !prev.text) prev.tools = prev.tools.concat(m.tools);
    else rows.push({ role: m.role, text: m.text, tools: [...m.tools] });
  }
  for (const m of rows) {
    const d = el("div", "msg " + m.role); d.append(el("div", "who", m.role === "user" ? "You" : "Agent"));
    if (m.text) {
      const long = m.text.length > 600, b = el("div", "body", long ? m.text.slice(0, 600) + "..." : m.text); d.append(b);
      if (long) { const more = el("button", "more", "Show all " + m.text.length.toLocaleString() + " characters"); more.onclick = () => { b.textContent = m.text; more.remove(); }; d.append(more); }
    }
    for (const t of m.tools) { if (!t.summary && !t.name) continue; const l = el("div", "tool"); l.append(el("b", "", t.name + " "), document.createTextNode(t.summary)); d.append(l); }
    into.append(d);
  }
}
(async () => {
  const id = location.pathname.split("/").pop();
  const sample = /^sample(\.html)?$/.test(id);
  const r = await fetch(sample ? "/demo/sample.json" : "/api/s/" + id);
  if (!r.ok) return root.replaceChildren(el("div", "empty", "This session was not found. It may have been deleted."));
  const s = await r.json();
  document.title = s.title + " - Brain";
  const meta = el("div", "meta");
  for (const x of [s.agent, s.model, s.cwd, s.branch, when(s.start), s.messages.length + " messages", s.files.length + " files edited"]) if (x) meta.append(el("span", "", x));
  root.replaceChildren(el("div", "kicker", (sample ? "Sample session (invented), " : "Shared with Brain, ") + when(s.shared)), el("h1", "", s.title), meta);
  renderMessages(s.messages, root);
})();
