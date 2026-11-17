// Orbital dot sphere: one dot per captured session; lit dots are shared ones. Decorative.
(() => {
  const cv = document.getElementById("sphere");
  if (!cv) return;
  const x = cv.getContext("2d"), N = 240, W = cv.width, R = W * 0.4;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ga = Math.PI * (3 - Math.sqrt(5)), pts = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), t = ga * i;
    pts.push([Math.cos(t) * r, y, Math.sin(t) * r, (i * 7919) % N < 38]);
  }
  let a = 0.6;
  function draw() {
    x.clearRect(0, 0, W, W);
    const ca = Math.cos(a), sa = Math.sin(a), tl = 0.35, ct = Math.cos(tl), st = Math.sin(tl);
    const pr = pts.map(([px, py, pz, h]) => {
      const X = px * ca - pz * sa, Z = px * sa + pz * ca;
      return [X, py * ct - Z * st, py * st + Z * ct, h];
    }).sort((p, q) => p[2] - q[2]);
    for (const [X, Y, Z, h] of pr) {
      const d = (Z + 1) / 2, sx = W / 2 + X * R, sy = W / 2 + Y * R;
      if (h) {
        x.shadowColor = "rgba(180,156,255,.9)"; x.shadowBlur = 18 * d;
        x.fillStyle = `rgba(${180 + 60 * d | 0},${150 + 40 * d | 0},255,${0.35 + 0.65 * d})`;
        x.beginPath(); x.arc(sx, sy, 3 + 5 * d, 0, 7); x.fill(); x.shadowBlur = 0;
      } else {
        x.fillStyle = `rgba(200,205,255,${0.08 + 0.4 * d})`;
        x.beginPath(); x.arc(sx, sy, 1.4 + 2.4 * d, 0, 7); x.fill();
      }
    }
    if (!still) { a += 0.0035; requestAnimationFrame(draw); }
  }
  draw();
})();
document.querySelectorAll("[data-copy]").forEach(b => b.onclick = async () => {
  try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Copied"; setTimeout(() => b.textContent = "Copy", 1500); } catch (e) {}
});
