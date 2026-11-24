// Камера, фоны миров и отрисовка кадра.
(function () {
  const HE = window.HE;
  const S = HE.Sprites;
  const TAU = Math.PI * 2;
  const R = (HE.Render = {});

  HE.THEMES = [
    { top: "#fff1d6", bot: "#f3d3a0", deco: "#e2b679", wall: "#c98b52", dark: "#a2662f", cap: "#f6e0ad", speck: "#b57840", dim: 0 },
    { top: "#e9f8f3", bot: "#c3e5dc", deco: "#a9d6ca", wall: "#9fb3c8", dark: "#73899f", cap: "#f4f7fb", speck: "#8ba1b7", dim: 0 },
    { top: "#3b2e48", bot: "#211a2a", deco: "#4c3c5b", wall: "#6e5a78", dark: "#4a3a55", cap: "#a08aac", speck: "#5d4a69", dim: 0.55 },
    { top: "#9ed9ff", bot: "#fff3cc", deco: "#a9dc8c", wall: "#8b5a3c", dark: "#62391f", cap: "#69c24a", speck: "#774a2e", dim: 0 },
  ];

  let cv, ctx, W = 0, H = 0, dpr = 1;
  let staticCv = null, staticFor = null;
  const TEX = 96;
  const cam = { x: 12, y: 6.5, s: 30, intro: 0 };

  R.init = function (canvas) { cv = canvas; ctx = cv.getContext("2d"); R.resize(); };
  R.resize = function () {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  };
  R.size = () => ({ W, H });

  // ───────── камера ─────────
  function camTarget(g, focus, overview) {
    const fit = Math.min(W / g.cols, H / g.rows);
    const portrait = H > W;
    const play = Math.min(W / (portrait ? 10 : 15), H / 8.5);
    if (overview || fit >= play * 0.85) return { x: g.cols / 2, y: g.rows / 2, s: Math.min(fit, play * 1.6) };
    const s = play, hw = W / 2 / s, hh = H / 2 / s, m = 2.2;
    const clamp = (v, half, size) => (half * 2 >= size + m * 2 ? size / 2 : Math.max(half - m, Math.min(size - half + m, v)));
    return { x: clamp(focus.x, hw, g.cols), y: clamp(focus.y, hh, g.rows), s };
  }
  R.snapCamera = function (g) {
    const t = camTarget(g, { x: g.cols / 2, y: g.rows / 2 }, true);
    cam.x = t.x; cam.y = t.y; cam.s = t.s; cam.intro = 1.4;
  };

  // ───────── статичный слой: стены, полки, кнопки-колючки ─────────
  function buildStatic(g) {
    const th = HE.THEMES[g.def.world];
    staticCv = document.createElement("canvas");
    staticCv.width = g.cols * TEX; staticCv.height = g.rows * TEX;
    const c = staticCv.getContext("2d");
    c.scale(TEX, TEX);
    const solid = (x, y) => x < 0 || y < 0 || x >= g.cols || y >= g.rows || g.tiles[y][x] === "#";
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) {
      if (g.tiles[y][x] !== "#") continue;
      const up = !solid(x, y - 1), dn = !solid(x, y + 1), lf = !solid(x - 1, y), rt = !solid(x + 1, y);
      const r = 0.2;
      c.beginPath();
      c.moveTo(x + (up && lf ? r : 0), y);
      c.lineTo(x + 1 - (up && rt ? r : 0), y); if (up && rt) c.quadraticCurveTo(x + 1, y, x + 1, y + r);
      c.lineTo(x + 1, y + 1 - (dn && rt ? r : 0)); if (dn && rt) c.quadraticCurveTo(x + 1, y + 1, x + 1 - r, y + 1);
      c.lineTo(x + (dn && lf ? r : 0), y + 1); if (dn && lf) c.quadraticCurveTo(x, y + 1, x, y + 1 - r);
      c.lineTo(x, y + (up && lf ? r : 0)); if (up && lf) c.quadraticCurveTo(x, y, x + r, y);
      c.closePath();
      const gr = c.createLinearGradient(0, y, 0, y + 1);
      gr.addColorStop(0, th.wall); gr.addColorStop(1, th.dark);
      c.fillStyle = up ? gr : th.wall; c.fill();
      if (!up) { c.fillStyle = th.wall; c.fill(); }
      // крапинки-текстура
      c.fillStyle = th.speck;
      for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + 0.15 + rnd() * 0.7, y + 0.2 + rnd() * 0.65, 0.03 + rnd() * 0.04, 0, TAU); c.fill(); }
      if (lf) { c.fillStyle = "rgba(255,255,255,0.12)"; c.fillRect(x, y + (up ? r : 0), 0.06, 1 - (up ? r : 0)); }
      if (rt) { c.fillStyle = "rgba(0,0,0,0.12)"; c.fillRect(x + 0.94, y + (up ? r : 0), 0.06, 1 - (up ? r : 0)); }
      if (dn) { c.fillStyle = "rgba(0,0,0,0.18)"; c.fillRect(x + (lf ? r : 0), y + 0.92, 1 - (lf ? r : 0) - (rt ? r : 0), 0.08); }
      if (up) { // «шапка»: опилки, плитка, мох или трава
        c.fillStyle = th.cap;
        c.beginPath(); c.moveTo(x + (lf ? r * 0.6 : 0), y + 0.2);
        for (let k = 0; k <= 6; k++) c.lineTo(x + k / 6, y + (k % 2 ? 0.26 : 0.17) + (g.def.world === 3 ? 0.03 : 0));
        c.lineTo(x + 1 - (rt ? r * 0.6 : 0), y + 0.2); c.lineTo(x + 1 - (rt ? r : 0), y);
        c.lineTo(x + (lf ? r : 0), y); c.closePath(); c.fill();
        if (g.def.world === 3 && rnd() < 0.3) { // цветочки
          const fx = x + 0.2 + rnd() * 0.6;
          c.fillStyle = ["#ff7eb6", "#fff", "#ffd84d"][Math.floor(rnd() * 3)];
          c.beginPath(); c.arc(fx, y - 0.06, 0.07, 0, TAU); c.fill();
        }
      }
    }
    for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) if (g.tiles[y][x] === "-") S.shelf(c, x, y);
    g.tacks.forEach((t, k) => S.tacks(c, t.x, t.y, k));
    staticFor = g;
  }

  // ───────── фон ─────────
  function drawBackground(g, t) {
    const th = HE.THEMES[g.def.world];
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, th.top); gr.addColorStop(1, th.bot);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    // параллакс: декор движется медленнее камеры
    ctx.save();
    const ps = cam.s * 0.6;
    ctx.translate(W / 2 - cam.x * ps, H / 2 - cam.y * ps);
    ctx.scale(ps, ps);
    ctx.fillStyle = th.deco; ctx.strokeStyle = th.deco;
    const w = g.def.world;
    if (w === 0) { // прутья клетки и колесо
      ctx.lineWidth = 0.12;
      for (let x = -12; x < g.cols + 12; x += 1.2) { ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x, g.rows + 10); ctx.stroke(); }
      ctx.lineWidth = 0.35; ctx.beginPath(); ctx.arc(g.cols * 0.75, g.rows * 0.35, 4, 0, TAU); ctx.stroke();
      ctx.save(); ctx.translate(g.cols * 0.75, g.rows * 0.35); ctx.rotate(t * 0.3);
      ctx.lineWidth = 0.12; for (let k = 0; k < 8; k++) { ctx.rotate(TAU / 8); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(4, 0); ctx.stroke(); }
      ctx.restore();
    } else if (w === 1) { // кафель и окно
      ctx.lineWidth = 0.05;
      for (let x = -12; x < g.cols + 12; x += 1.5) { ctx.beginPath(); ctx.moveTo(x, -10); ctx.lineTo(x, g.rows + 10); ctx.stroke(); }
      for (let y = -10; y < g.rows + 10; y += 1.5) { ctx.beginPath(); ctx.moveTo(-12, y); ctx.lineTo(g.cols + 12, y); ctx.stroke(); }
      ctx.fillStyle = "rgba(255,255,255,0.55)"; S.rrect(ctx, g.cols * 0.2, 1, 5, 4, 0.3); ctx.fill();
      ctx.fillStyle = th.deco; ctx.fillRect(g.cols * 0.2 + 2.45, 1, 0.1, 4); ctx.fillRect(g.cols * 0.2, 2.95, 5, 0.1);
    } else if (w === 2) { // полки с банками
      for (let k = 0; k < 4; k++) {
        const sx = -4 + k * 9, sy = 2 + (k % 2) * 4;
        ctx.fillRect(sx, sy + 2, 7, 0.25);
        for (let j = 0; j < 4; j++) { S.rrect(ctx, sx + 0.4 + j * 1.7, sy + 0.4, 1.2, 1.6, 0.25); ctx.fill(); }
      }
    } else { // холмы и облака
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (let k = 0; k < 5; k++) {
        const cx = ((k * 9 + t * 0.4) % (g.cols + 24)) - 12, cy = 1 + (k % 3) * 1.3;
        for (const [dx, r] of [[0, 1], [1, 1.3], [2.2, 0.9]]) { ctx.beginPath(); ctx.arc(cx + dx, cy, r, 0, TAU); ctx.fill(); }
      }
      ctx.fillStyle = th.deco;
      for (let k = -2; k < 6; k++) { ctx.beginPath(); ctx.ellipse(k * 7, g.rows + 3, 6, 7, 0, 0, TAU); ctx.fill(); }
    }
    ctx.restore();
  }

  const lerp = (a, b, k) => a + (b - a) * k;
  const ip = (e, al) => ({ x: e.px === undefined ? e.x : lerp(e.px, e.x, al), y: e.py === undefined ? e.y : lerp(e.py, e.y, al) });

  // ───────── кадр ─────────
  // opts: { alpha, dt, t, active, overview, hats }
  R.draw = function (g, o) {
    if (staticFor !== g) buildStatic(g);
    const th = HE.THEMES[g.def.world];
    const act = g.hams[o.active];
    const ap = ip(act, o.alpha);
    cam.intro = Math.max(0, cam.intro - o.dt);
    const tg = camTarget(g, { x: ap.x + act.w / 2, y: ap.y + act.h / 2 - 0.6 }, o.overview || cam.intro > 0);
    const k = 1 - Math.exp(-o.dt * (cam.intro > 0 ? 3 : 5.5));
    cam.x = lerp(cam.x, tg.x, k); cam.y = lerp(cam.y, tg.y, k); cam.s = lerp(cam.s, tg.s, 1 - Math.exp(-o.dt * 3.5));

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawBackground(g, o.t);
    ctx.save();
    ctx.translate(W / 2 - cam.x * cam.s, H / 2 - cam.y * cam.s);
    ctx.scale(cam.s, cam.s);

    // мягкая тень уровня
    ctx.fillStyle = "rgba(0,0,0,0.06)"; ctx.fillRect(0.15, 0.2, g.cols, g.rows);
    for (const L of g.lifts) S.liftTrack(ctx, L);
    const atExit = g.hams.filter(h => h.atExit && !h.dead).length;
    S.exit(ctx, g.exit, atExit / 3, o.t, atExit);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(staticCv, 0, 0, g.cols, g.rows);

    for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) {
      if (g.tiles[y][x] === "~") S.plank(ctx, x, y, Math.min(1, (g.plankT[y * 1000 + x] || 0) / 0.22), o.t);
    }
    for (const ch in g.doors) {
      const list = g.doors[ch];
      for (const d of list) {
        const top = !list.some(q => q.x === d.x && q.y === d.y - 1), bottom = !list.some(q => q.x === d.x && q.y === d.y + 1);
        S.doorTile(ctx, d.x, d.y, ch, g.doorAnim[ch], top, bottom);
      }
    }
    for (const s of g.springs) S.spring(ctx, s.x, s.y, s.anim);
    for (const p of g.plates) S.plate(ctx, p, o.t);
    for (const s of g.seeds) if (!s.taken) S.seed(ctx, s.x + 0.5, s.y + 0.5, o.t);
    for (const L of g.lifts) { const p = ip(L, o.alpha); S.lift(ctx, { x: p.x, y: p.y, w: L.w, ch: L.ch }); }
    for (const c of g.crates) { const p = ip(c, o.alpha); S.crate(ctx, p.x, p.y); }

    // хомяки: активный рисуется последним
    const order = [0, 1, 2].filter(i => i !== o.active).concat([o.active]);
    for (const i of order) {
      const h = g.hams[i];
      if (h.dead) continue;
      const p = ip(h, o.alpha);
      if (h.onGround) { ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.beginPath(); ctx.ellipse(p.x + h.w / 2, p.y + h.h, h.w * 0.5, 0.07, 0, 0, TAU); ctx.fill(); }
      S.hamster(ctx, { i, x: p.x + h.w / 2, y: p.y + h.h, face: h.face, squash: h.squash, vy: h.vy, vx: h.vx, onGround: h.onGround,
        climbing: h.climbing, walk: h.walk, blink: h.blink, t: o.t, hat: o.hats[i] });
      if (h.atExit) { ctx.fillStyle = "#ffe27a"; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(o.t * 6 + i); ctx.beginPath(); ctx.arc(p.x + h.w / 2 + 0.3, p.y - 0.15, 0.06, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    }
    // указатель активного хомяка
    if (g.state === "play" && !act.dead) {
      const bx = ap.x + act.w / 2, by = ap.y - 0.42 + Math.sin(o.t * 5) * 0.08;
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "rgba(60,40,20,0.35)"; ctx.lineWidth = 0.04;
      ctx.beginPath(); ctx.moveTo(bx - 0.17, by - 0.18); ctx.lineTo(bx + 0.17, by - 0.18); ctx.lineTo(bx, by); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    for (const p of g.particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life); ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // кладовка: темнота и тёплый свет вокруг хомяков
    if (th.dim > 0) {
      ctx.save();
      const dark = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.75);
      dark.addColorStop(0, "rgba(20,12,28,0)"); dark.addColorStop(1, `rgba(20,12,28,${th.dim})`);
      ctx.fillStyle = dark; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (const h of g.hams) {
        if (h.dead) continue;
        const p = ip(h, o.alpha);
        const sx = W / 2 + (p.x + h.w / 2 - cam.x) * cam.s, sy = H / 2 + (p.y + h.h / 2 - cam.y) * cam.s;
        const lg = ctx.createRadialGradient(sx, sy, 0, sx, sy, cam.s * 3);
        lg.addColorStop(0, "rgba(255,190,110,0.16)"); lg.addColorStop(1, "rgba(255,190,110,0)");
        ctx.fillStyle = lg; ctx.fillRect(sx - cam.s * 3, sy - cam.s * 3, cam.s * 6, cam.s * 6);
      }
      ctx.restore();
    }
  };

  // портрет хомяка для кнопок и меню
  R.portrait = function (canvas, i, hat, t) {
    const c = canvas.getContext("2d");
    const d = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth || 48, h = canvas.clientHeight || 48;
    if (canvas.width !== Math.round(w * d)) { canvas.width = Math.round(w * d); canvas.height = Math.round(h * d); }
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, canvas.width, canvas.height);
    const s = Math.min(w, h) / 2.1;
    c.setTransform(d * s, 0, 0, d * s, (d * w) / 2, d * (h * 0.86));
    const H0 = HE.HAMSTERS[i];
    const k = 1.25 / Math.max(H0.w, H0.h);
    c.scale(k, k);
    S.hamster(c, { i, x: 0, y: 0, face: 1, squash: 0, vy: 0, vx: 0, onGround: true, walk: 0, blink: 1, t: t || 0, hat });
  };
})();
