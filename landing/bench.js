(async () => {
  let d; try { d = await (await fetch("/bench.json")).json(); } catch { document.getElementById("bench-meta").textContent = "The measurements could not load."; return; }
  const $ = (id) => document.getElementById(id);
  const N = (n) => n.toLocaleString();
  const ms = (n) => (n >= 1000 ? (n / 1000).toFixed(2) + " s" : n + " ms");
  // Background: every measured number, as a wall of text behind the whole page (like code behind ponytail).
  const words = []; const walk = (o, path) => { if (o == null) return; if (typeof o === "number") words.push(path.replace(/([a-z])([A-Z])/g,"$1 $2").toLowerCase().replace(/(\d+)s\b/,"$1 sessions").replace(/(\d+)m\b/,"$1 messages").replace(/ ms$| kb$| mb$| mbps$/,(x)=>x.toUpperCase()===" MBPS"?" MB/s":x).replace(/Ms$/, " ms").replace(/MB$/, " MB").replace(/KB$/, " KB") + " " + o); else if (Array.isArray(o)) o.forEach((x, i) => walk(x, (x && (x.sessions ? x.sessions + "s" : x.messages ? x.messages + "m" : "")) || path + i)); else if (typeof o === "object") for (const k in o) if (k !== "meta" && k !== "detail") walk(o[k], path ? path + "." + k : k); };
  walk(d.corpus, "corpus"); walk(d.session, "session"); walk(d.redaction, "redact"); walk(d.share, "share");
  const bg = document.createElement("div"); bg.id = "numbg"; bg.setAttribute("aria-hidden", "true");
  const lines = []; for (let i = 0; i < 90; i++) { let l = ""; for (let j = 0; j < 14; j++) l += words[(i * 7 + j * 3) % words.length].replace(/\./g, " ") + "   "; lines.push(l); }
  bg.textContent = lines.join("\n"); document.body.prepend(bg);
  const m = d.meta, c = d.corpus, big = c[c.length - 1], s = d.session, r = d.redaction;
  $("bench-meta").textContent = `Measured ${m.date} on ${m.cpu}, ${m.cores} cores, ${m.ramGB} GB, ${m.os}, ${m.runtime}. ${m.note}`;
  const vsRows = c.map((x) => ({ n: x.sessions, items: [["Brain", x.searchCommonMs, 1], ["grep", x.grepCommonMs]] }));
  const vs2 = c.map((x) => ({ n: x.sessions, items: [["Brain", x.searchRareMs, 1], ["grep", x.grepRareMs], ["ripgrep", x.rgRareMs]] }));
  const card = (title, note, data) => { const mx = Math.max(...data.flatMap((g) => g.items.map((i) => i[1] || 0))); return `<div class="vc"><h4>${title}</h4><p>${note}</p>${data.map((g) => `<div class="vg"><em>${N(g.n)} sessions</em>${g.items.filter((i) => i[1] != null).map(([k, v, me]) => `<div class="vr${me ? " me" : ""}"><span>${k}</span><i style="width:${Math.max(2, (v / mx) * 100)}%"></i><b>${ms(v)}</b></div>`).join("")}</div>`).join("")}</div>`; };
  $("bench-vs").innerHTML = card("Search a common word", "Brain stops after 120 matches and shows the best ones. grep lists every file.", vsRows) + card("Search a word that is in one session", "Honest row: grep is faster here, because Brain also reads titles, tools and times for each session.", vs2);
  const tiles = [
    [ms(big.warmIndexMs), `open the list of ${big.sessions.toLocaleString()} sessions`], [ms(big.coldIndexMs), `first index of ${big.sessions.toLocaleString()} sessions (${big.totalMB} MB)`],
    [ms(big.searchCommonMs), "search a common word"], [ms(big.searchRareMs), "search one rare word across all"], [big.rssMB + " MB", "memory with 5,000 sessions"],
    [big.indexCacheKB + " KB", "index file for 5,000 sessions"], [s[s.length - 1].parseMBps + " MB/s", "read a session file"], [r.hidden + " of " + r.planted, "planted secrets hidden"], [r.redactMBps + " MB/s", "secret hiding speed"],
  ];
  $("bench-top").innerHTML = tiles.map(([v, l]) => `<div class="bc"><b>${v}</b><span>${l}</span></div>`).join("");
  const rows = (head, body) => `<thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((x, i) => `<${i ? "td" : "th scope=row"}>${x}</${i ? "td" : "th"}>`).join("")}</tr>`).join("")}</tbody>`;
  $("bench-corpus").innerHTML = rows(["", ...c.map((x) => N(x.sessions) + " sessions")], [
    ["Total size", ...c.map((x) => x.totalMB + " MB")], ["First index (cold)", ...c.map((x) => ms(x.coldIndexMs))], ["Per session, cold", ...c.map((x) => x.perSessionColdMs + " ms")],
    ["Open the list (warm)", ...c.map((x) => ms(x.warmIndexMs))], ["Find the files", ...c.map((x) => ms(x.listFilesMs))], ["Index file", ...c.map((x) => x.indexCacheKB + " KB")],
    ["Search: a rare word", ...c.map((x) => ms(x.searchRareMs))], ["Search: a common word", ...c.map((x) => ms(x.searchCommonMs))], ["Search: two words", ...c.map((x) => ms(x.searchTwoTermsMs))],
    ["Search: no match", ...c.map((x) => ms(x.searchNoMatchMs))], ["Memory", ...c.map((x) => x.rssMB + " MB")],
  ]);
  $("bench-session").innerHTML = rows(["", ...s.map((x) => N(x.messages) + " messages")], [
    ["File size", ...s.map((x) => x.fileKB + " KB")], ["Read and parse", ...s.map((x) => ms(x.parseMs))], ["Read speed", ...s.map((x) => x.parseMBps + " MB/s")],
    ["Shared link size", ...s.map((x) => x.sharePayloadKB + " KB")], ["Compressed", ...s.map((x) => x.shareGzipKB + " KB")], ["Under the 5 MB limit", ...s.map((x) => (x.underShareLimit ? "yes" : "no"))],
  ]);
  $("bench-redact").innerHTML = rows(["Planted (fake)", "Result"], [...r.detail.map((x) => [x.name, x.hidden ? "hidden" : "<b>leaked</b>"]), ["Speed", r.redactMBps + " MB/s on " + r.textKB + " KB"], ["Time for that text", ms(r.redactMs)]]);
})();
