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
    { top: "#eafbe6", bot: "#c4e8bf", deco: "#a3d69c", wall: "#7c9b6e", dark: "#56744a", cap: "#9fdc7c", speck: "#668a5a", dim: 0 },
    { top: "#f3e6d2", bot: "#d9c3a2", deco: "#c4ab88", wall: "#8a909c", dark: "#5f6470", cap: "#c9ced8", speck: "#727885", dim: 0 },
    { top: "#1b2247", bot: "#0d1226", deco: "#28325f", wall: "#5b4a3c", dark: "#3b2e25", cap: "#3f7a45", speck: "#4a3b30", dim: 0.5 },
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

  // ───────── статичный слой: стены, полки, кнопки-колючки, корпуса вентиляторов ─────────
  function buildStatic(g) {
    const w = g.def.world, th = HE.THEMES[w];
    staticCv = document.createElement("canvas");
    staticCv.width = g.cols * TEX; staticCv.height = g.rows * TEX;
    const c = staticCv.getContext("2d");
    c.scale(TEX, TEX);
    const solid = (x, y) => x < 0 || y < 0 || x >= g.cols || y >= g.rows || "#F<>".includes(g.tiles[y][x]);
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
      // крапинки-текстура (в мастерской — заклёпки)
      c.fillStyle = th.speck;
      if (w === 5) { for (const [px, py] of [[0.15, 0.2], [0.85, 0.2], [0.15, 0.8], [0.85, 0.8]]) { c.beginPath(); c.arc(x + px, y + py, 0.045, 0, TAU); c.fill(); } }
      else for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(x + 0.15 + rnd() * 0.7, y + 0.2 + rnd() * 0.65, 0.03 + rnd() * 0.04, 0, TAU); c.fill(); }
      if (lf) { c.fillStyle = "rgba(255,255,255,0.12)"; c.fillRect(x, y + (up ? r : 0), 0.06, 1 - (up ? r : 0)); }
      if (rt) { c.fillStyle = "rgba(0,0,0,0.12)"; c.fillRect(x + 0.94, y + (up ? r : 0), 0.06, 1 - (up ? r : 0)); }
      if (dn) { c.fillStyle = "rgba(0,0,0,0.18)"; c.fillRect(x + (lf ? r : 0), y + 0.92, 1 - (lf ? r : 0) - (rt ? r : 0), 0.08); }
      if (up) { // «шапка»: опилки, плитка, мох, трава или стальная полоса
        c.fillStyle = th.cap;
        const grassy = w === 3 || w === 6 || w === 4;
        c.beginPath(); c.moveTo(x + (lf ? r * 0.6 : 0), y + 0.2);
        for (let k = 0; k <= 6; k++) c.lineTo(x + k / 6, y + (w === 5 ? 0.15 : (k % 2 ? 0.26 : 0.17) + (grassy ? 0.03 : 0)));
        c.lineTo(x + 1 - (rt ? r * 0.6 : 0), y + 0.2); c.lineTo(x + 1 - (rt ? r : 0), y);
        c.lineTo(x + (lf ? r : 0), y); c.closePath(); c.fill();
        if (w === 3 && rnd() < 0.3) { // цветочки
          const fx = x + 0.2 + rnd() * 0.6;
          c.fillStyle = ["#ff7eb6", "#fff", "#ffd84d"][Math.floor(rnd() * 3)];
          c.beginPath(); c.arc(fx, y - 0.06, 0.07, 0, TAU); c.fill();
        } else if (w === 4 && rnd() < 0.35) { // ростки
          const fx = x + 0.2 + rnd() * 0.6;
          c.strokeStyle = "#5aa83c"; c.lineWidth = 0.04; c.beginPath(); c.moveTo(fx, y); c.lineTo(fx, y - 0.18); c.stroke();
          c.fillStyle = "#7fd05a"; c.beginPath(); c.ellipse(fx - 0.06, y - 0.17, 0.07, 0.035, -0.5, 0, TAU); c.fill();
          c.beginPath(); c.ellipse(fx + 0.06, y - 0.2, 0.07, 0.035, 0.5, 0, TAU); c.fill();
        } else if (w === 6 && rnd() < 0.5) { // травинки
          const fx = x + 0.1 + rnd() * 0.8;
          c.strokeStyle = "#4d9a52"; c.lineWidth = 0.035;
          c.beginPath(); c.moveTo(fx, y + 0.05); c.lineTo(fx - 0.05, y - 0.14); c.moveTo(fx + 0.04, y + 0.05); c.lineTo(fx + 0.08, y - 0.1); c.stroke();
        }
      }
    }
    for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) if (g.tiles[y][x] === "-") S.shelf(c, x, y);
    g.tacks.forEach((t, k) => S.tacks(c, t.x, t.y, k));
    g.fans.forEach(f => S.fanBox(c, f.x, f.y));
    staticFor = g;
  }

  // ───────── фон: декор мира в клетках (им же рисуются сцены истории) ─────────
  function gear(c, x, y, r, teeth, rot) {
    c.save(); c.translate(x, y); c.rotate(rot);
    c.beginPath();
    for (let k = 0; k < teeth * 2; k++) {
      const a = (k / (teeth * 2)) * TAU, rr = k % 2 ? r : r * 1.18;
      c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath(); c.fill();
    c.fillStyle = "rgba(255,255,255,0.3)"; c.beginPath(); c.arc(0, 0, r * 0.35, 0, TAU); c.fill();
    c.restore();
  }
  R.deco = function (c, w, cols, rows, t) {
    const th = HE.THEMES[w];
    c.fillStyle = th.deco; c.strokeStyle = th.deco;
    if (w === 0) { // прутья клетки и колесо
      c.lineWidth = 0.12;
      for (let x = -12; x < cols + 12; x += 1.2) { c.beginPath(); c.moveTo(x, -10); c.lineTo(x, rows + 10); c.stroke(); }
      c.lineWidth = 0.35; c.beginPath(); c.arc(cols * 0.75, rows * 0.35, 4, 0, TAU); c.stroke();
      c.save(); c.translate(cols * 0.75, rows * 0.35); c.rotate(t * 0.3);
      c.lineWidth = 0.12; for (let k = 0; k < 8; k++) { c.rotate(TAU / 8); c.beginPath(); c.moveTo(0, 0); c.lineTo(4, 0); c.stroke(); }
      c.restore();
    } else if (w === 1) { // кафель и окно
      c.lineWidth = 0.05;
      for (let x = -12; x < cols + 12; x += 1.5) { c.beginPath(); c.moveTo(x, -10); c.lineTo(x, rows + 10); c.stroke(); }
      for (let y = -10; y < rows + 10; y += 1.5) { c.beginPath(); c.moveTo(-12, y); c.lineTo(cols + 12, y); c.stroke(); }
      c.fillStyle = "rgba(255,255,255,0.55)"; S.rrect(c, cols * 0.2, 1, 5, 4, 0.3); c.fill();
      c.fillStyle = th.deco; c.fillRect(cols * 0.2 + 2.45, 1, 0.1, 4); c.fillRect(cols * 0.2, 2.95, 5, 0.1);
    } else if (w === 2) { // полки с банками
      for (let k = 0; k < 4; k++) {
        const sx = -4 + k * 9, sy = 2 + (k % 2) * 4;
        c.fillRect(sx, sy + 2, 7, 0.25);
        for (let j = 0; j < 4; j++) { S.rrect(c, sx + 0.4 + j * 1.7, sy + 0.4, 1.2, 1.6, 0.25); c.fill(); }
      }
    } else if (w === 3) { // холмы и облака
      c.fillStyle = "rgba(255,255,255,0.85)";
      for (let k = 0; k < 5; k++) {
        const cx = ((k * 9 + t * 0.4) % (cols + 24)) - 12, cy = 1 + (k % 3) * 1.3;
        for (const [dx, r] of [[0, 1], [1, 1.3], [2.2, 0.9]]) { c.beginPath(); c.arc(cx + dx, cy, r, 0, TAU); c.fill(); }
      }
      c.fillStyle = th.deco;
      for (let k = -2; k < 6; k++) { c.beginPath(); c.ellipse(k * 7, rows + 3, 6, 7, 0, 0, TAU); c.fill(); }
    } else if (w === 4) { // теплица: рамы стекла, солнечные лучи, большие листья и капли
      c.fillStyle = "rgba(255,255,230,0.35)";
      for (let k = 0; k < 4; k++) {
        const x0 = -4 + k * 9 + Math.sin(t * 0.3 + k) * 0.5;
        c.beginPath(); c.moveTo(x0, -10); c.lineTo(x0 + 3, -10); c.lineTo(x0 + 9, rows + 10); c.lineTo(x0 + 5, rows + 10); c.closePath(); c.fill();
      }
      c.strokeStyle = "rgba(255,255,255,0.7)"; c.lineWidth = 0.14;
      for (let x = -12; x < cols + 12; x += 4) { c.beginPath(); c.moveTo(x, -10); c.lineTo(x, rows + 10); c.stroke(); }
      for (let y = -2; y < rows + 10; y += 5) { c.beginPath(); c.moveTo(-12, y); c.lineTo(cols + 12, y); c.stroke(); }
      c.fillStyle = "rgba(255,255,255,0.6)";
      for (let k = 0; k < 9; k++) { const dx = (k * 5.3) % (cols + 8) - 4, dy = ((t * 0.25 + k * 0.37) % 1) * (rows + 4) - 2; c.beginPath(); c.ellipse(dx, dy, 0.08, 0.12, 0, 0, TAU); c.fill(); }
      c.fillStyle = th.deco;
      for (let k = -1; k < cols / 4 + 2; k++) {
        const lx = k * 4.5, sw = Math.sin(t * 0.8 + k) * 0.08;
        for (const [a, len] of [[-0.9, 3], [-0.3, 3.8], [0.4, 3.2]]) {
          c.save(); c.translate(lx, rows + 1); c.rotate(a + sw - Math.PI / 2);
          c.beginPath(); c.ellipse(len / 2, 0, len / 2, 0.55, 0, 0, TAU); c.fill(); c.restore();
        }
      }
    } else if (w === 5) { // мастерская: перфорированная доска, инструменты, шестерёнки
      c.fillStyle = "rgba(90,60,30,0.16)";
      for (let x = -12; x < cols + 12; x += 1) for (let y = -6; y < rows + 6; y += 1) { c.beginPath(); c.arc(x, y, 0.06, 0, TAU); c.fill(); }
      c.fillStyle = th.deco;
      gear(c, cols * 0.18, rows * 0.3, 2.2, 10, t * 0.4);
      gear(c, cols * 0.18 + 3.6, rows * 0.3 + 1.6, 1.4, 8, -t * 0.63 + 0.2);
      gear(c, cols * 0.78, rows * 0.55, 2.8, 12, -t * 0.25);
      // гаечный ключ и молоток
      c.save(); c.translate(cols * 0.5, 2); c.rotate(0.15 + Math.sin(t * 0.7) * 0.03);
      c.fillRect(-0.18, 0, 0.36, 4); c.beginPath(); c.arc(0, 4.2, 0.55, 0, TAU); c.fill(); c.restore();
      c.save(); c.translate(cols * 0.62, 1.6); c.rotate(-0.1 + Math.sin(t * 0.6 + 1) * 0.03);
      c.fillRect(-0.12, 0, 0.24, 3.4); S.rrect(c, -0.8, 3.2, 1.6, 0.6, 0.15); c.fill(); c.restore();
    } else if (w === 6) { // ночь: луна, звёзды, забор, светлячки
      for (let k = 0; k < 40; k++) {
        const sx = (k * 7.37) % (cols + 20) - 10, sy = (k * 3.91) % (rows * 0.8) - 2;
        const tw = 0.5 + 0.5 * Math.sin(t * 2 + k * 1.3);
        c.fillStyle = `rgba(255,255,230,${0.3 + tw * 0.6})`; c.beginPath(); c.arc(sx, sy, 0.05 + tw * 0.04, 0, TAU); c.fill();
      }
      const mx = cols * 0.82, my = 0.5;
      const mg = c.createRadialGradient(mx, my, 0.5, mx, my, 5);
      mg.addColorStop(0, "rgba(255,248,210,0.35)"); mg.addColorStop(1, "rgba(255,248,210,0)");
      c.fillStyle = mg; c.beginPath(); c.arc(mx, my, 5, 0, TAU); c.fill();
      c.fillStyle = "#fff6d0"; c.beginPath(); c.arc(mx, my, 1.4, 0, TAU); c.fill();
      c.fillStyle = "rgba(220,210,170,0.5)"; for (const [dx, dy, r] of [[-0.4, -0.3, 0.3], [0.5, 0.3, 0.22], [0.1, 0.6, 0.15]]) { c.beginPath(); c.arc(mx + dx, my + dy, r, 0, TAU); c.fill(); }
      c.fillStyle = th.deco;
      for (let x = -12; x < cols + 12; x += 1.3) {
        c.beginPath(); c.moveTo(x, rows + 6); c.lineTo(x, rows * 0.45); c.lineTo(x + 0.5, rows * 0.45 - 0.6); c.lineTo(x + 1, rows * 0.45); c.lineTo(x + 1, rows + 6); c.fill();
      }
      c.fillRect(-12, rows * 0.55, cols + 24, 0.35);
      for (let k = 0; k < 10; k++) {
        const fx = (k * 4.7 + Math.sin(t * 0.5 + k) * 2) % (cols + 4) - 2, fy = rows * 0.3 + Math.sin(t * 0.8 + k * 2.1) * 2 + (k % 3);
        const a = 0.4 + 0.6 * Math.max(0, Math.sin(t * 2.3 + k * 1.9));
        const fg = c.createRadialGradient(fx, fy, 0, fx, fy, 0.5);
        fg.addColorStop(0, `rgba(230,255,120,${a})`); fg.addColorStop(1, "rgba(230,255,120,0)");
        c.fillStyle = fg; c.beginPath(); c.arc(fx, fy, 0.5, 0, TAU); c.fill();
      }
    }
  };
  // фон мира целиком: градиент неба и декор с параллаксом. x, y — точка, на которую смотрим; s — масштаб клетки
  R.backdrop = function (c, w, cw, ch, cols, rows, x, y, s, t) {
    const th = HE.THEMES[w];
    const gr = c.createLinearGradient(0, 0, 0, ch);
    gr.addColorStop(0, th.top); gr.addColorStop(1, th.bot);
    c.fillStyle = gr; c.fillRect(0, 0, cw, ch);
    c.save();
    c.translate(cw / 2 - x * s, ch / 2 - y * s);
    c.scale(s, s);
    R.deco(c, w, cols, rows, t);
    c.restore();
  };

  const lerp = (a, b, k) => a + (b - a) * k;
  const ip = (e, al) => ({ x: e.px === undefined ? e.x : lerp(e.px, e.x, al), y: e.py === undefined ? e.y : lerp(e.py, e.y, al) });

  function zzz(c, x, y, t, big) {
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.55 + k / 3) % 1;
      c.globalAlpha = Math.sin(ph * Math.PI) * 0.9;
      S.text(c, "z", x + ph * 0.45 + Math.sin(ph * 6) * 0.06, y - ph * (big ? 1.1 : 0.75), (big ? 0.34 : 0.22) + ph * 0.14, 900, "#ffffff", "rgba(60,40,80,0.5)");
    }
    c.globalAlpha = 1;
  }

  // конус взгляда кота: лучи упираются в стены и коробки
  function drawCone(g, c, t) {
    if (c.phase === "sleep" && !c.pounce) return;
    const E = HE.catEye(c), n = 28;
    const a0 = HE.CAT_TILT - HE.CAT_FOV, a1 = HE.CAT_TILT + HE.CAT_FOV;
    ctx.beginPath(); ctx.moveTo(E.x, E.y);
    for (let k = 0; k <= n; k++) {
      const a = a0 + ((a1 - a0) * k) / n, ang = c.look > 0 ? a : Math.PI - a;
      const d = HE.castRay(g, E.x, E.y, ang, c.range);
      ctx.lineTo(E.x + Math.cos(ang) * d, E.y + Math.sin(ang) * d);
    }
    ctx.closePath();
    const alpha = c.phase === "awake" || c.pounce ? 0.3 : 0.06 + 0.06 * Math.max(0, Math.sin(t * 22));
    const gr = ctx.createRadialGradient(E.x, E.y, 0.2, E.x, E.y, c.range);
    gr.addColorStop(0, `rgba(255,232,120,${alpha})`); gr.addColorStop(1, "rgba(255,232,120,0)");
    ctx.fillStyle = gr; ctx.fill();
  }

  // ───────── кадр ─────────
  // opts: { alpha, dt, t, active, overview, hats, skins }
  R.draw = function (g, o) {
    if (staticFor !== g) buildStatic(g);
    const w = g.def.world, th = HE.THEMES[w];
    const act = g.hams[o.active];
    const ap = ip(act, o.alpha);
    cam.intro = Math.max(0, cam.intro - o.dt);
    const tg = camTarget(g, { x: ap.x + act.w / 2, y: ap.y + act.h / 2 - 0.6 }, o.overview || cam.intro > 0);
    const k = 1 - Math.exp(-o.dt * (cam.intro > 0 ? 3 : 5.5));
    cam.x = lerp(cam.x, tg.x, k); cam.y = lerp(cam.y, tg.y, k); cam.s = lerp(cam.s, tg.s, 1 - Math.exp(-o.dt * 3.5));
    // пойманный котом — камера чуть дрожит
    const shake = g.caught && g.stateT < 0.4 ? (0.4 - g.stateT) * 0.25 : 0;
    const shx = shake ? Math.sin(o.t * 70) * shake : 0;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R.backdrop(ctx, w, W, H, g.cols, g.rows, cam.x, cam.y, cam.s * 0.6, o.t);
    ctx.save();
    ctx.translate(W / 2 - (cam.x + shx) * cam.s, H / 2 - cam.y * cam.s);
    ctx.scale(cam.s, cam.s);

    // мягкая тень уровня
    ctx.fillStyle = "rgba(0,0,0,0.06)"; ctx.fillRect(0.15, 0.2, g.cols, g.rows);
    for (const L of g.lifts) S.liftTrack(ctx, L);
    const home = g.hams.filter(h => h.atExit && !h.dead).length;
    S.exit(ctx, g.exit, home / 3, o.t, home);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(staticCv, 0, 0, g.cols, g.rows);

    for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) {
      if (g.tiles[y][x] === "~") S.plank(ctx, x, y, Math.min(1, (g.plankT[y * 1000 + x] || 0) / 0.22), o.t);
    }
    for (const ch in g.doors) {
      const list = g.doors[ch], has = (x, y) => list.some(q => q.x === x && q.y === y);
      for (const d of list) {
        const horiz = (has(d.x - 1, d.y) || has(d.x + 1, d.y)) && !has(d.x, d.y - 1) && !has(d.x, d.y + 1);
        if (horiz) S.trapTile(ctx, d.x, d.y, ch, g.doorAnim[ch], !has(d.x - 1, d.y), !has(d.x + 1, d.y));
        else S.doorTile(ctx, d.x, d.y, ch, g.doorAnim[ch], !has(d.x, d.y - 1), !has(d.x, d.y + 1));
      }
    }
    for (const b of g.belts) S.belt(ctx, b, o.t);
    // вентиляторы: потоки воздуха и лопасти
    for (const f of g.fans) {
      if (f.on) {
        const len = f.y - f.top;
        ctx.strokeStyle = "rgba(255,255,255,0.45)"; ctx.lineWidth = 0.05; ctx.lineCap = "round";
        for (let k = 0; k < 6; k++) {
          const ph = (o.t * 1.6 + k / 6 + f.x * 0.13) % 1, yy = f.y - ph * len, xx = f.x + 0.2 + ((k * 0.37) % 0.6);
          ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.8;
          ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + Math.sin(o.t * 6 + k) * 0.05, yy - 0.45); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      S.fanBlades(ctx, f);
    }
    for (const s of g.springs) S.spring(ctx, s.x, s.y, s.anim);
    for (const p of g.plates) S.plate(ctx, p, o.t);
    for (const T of g.tubes) S.tube(ctx, T, o.t);
    for (const s of g.seeds) if (!s.taken) S.seed(ctx, s.x + 0.5, s.y + 0.5, o.t);
    for (const L of g.lifts) { const p = ip(L, o.alpha); S.lift(ctx, { x: p.x, y: p.y, w: L.w, ch: L.ch }); }
    for (const c of g.crates) { const p = ip(c, o.alpha); S.crate(ctx, p.x, p.y); }
    for (const c of g.cats) {
      S.cat(ctx, c, o.t);
      if (c.phase === "sleep" && !c.pounce) zzz(ctx, c.x + c.look * 0.9, c.y - 1.5, o.t, true);
      if (c.phase === "warn") S.text(ctx, "?", c.x + c.look * 0.6, c.y - 2.2 + Math.sin(o.t * 10) * 0.05, 0.5, 900, "#ffe27a", "rgba(40,30,60,0.6)");
    }

    // хомяки: активный рисуется последним
    const E = g.exit, ex = (E.x0 + E.x1) / 2, ey = E.y1;
    const order = [0, 1, 2].filter(i => i !== o.active).concat([o.active]);
    for (const i of order) {
      const h = g.hams[i];
      const p = ip(h, o.alpha);
      let x = p.x + h.w / 2, y = p.y + h.h, sc = 1, alpha = 1, rot = 0;
      if (h.dead) {          // призрачек улетает вверх
        const k2 = Math.min(1, g.stateT / 0.9);
        y -= k2 * 1.6; alpha = 1 - k2; rot = Math.sin(g.stateT * 9) * 0.25;
      } else if (g.state === "win") {   // все трое ныряют в норку
        const k2 = Math.min(1, Math.max(0, (g.stateT - i * 0.08) / 0.6)), e2 = k2 * k2;
        x = lerp(x, ex, e2); y = lerp(y, ey, e2) - Math.sin(k2 * Math.PI) * 0.6; sc = 1 - e2 * 0.85; alpha = 1 - e2 * 0.7;
      }
      if (alpha <= 0.01) continue;
      if (h.onGround && !h.dead && g.state !== "win") { ctx.fillStyle = "rgba(0,0,0,0.16)"; ctx.beginPath(); ctx.ellipse(x, y, h.w * 0.5, 0.07, 0, 0, TAU); ctx.fill(); }
      ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
      S.hamster(ctx, { i, x: 0, y: 0, face: h.face, squash: h.squash, vy: h.vy, vx: h.vx, onGround: h.onGround,
        climbing: h.climbing, walk: h.walk, blink: h.blink, t: o.t, hat: o.hats[i], skin: o.skins[i],
        idle: g.state === "play" ? h.idle : 0, cheek: h.cheek, dead: h.dead, scared: g.caught && g.caught.i === i });
      ctx.restore();
      if (h.idle > 9 && !h.dead && g.state === "play") zzz(ctx, x + h.face * h.w * 0.3, y - h.h - 0.1, o.t + i);
      if (h.atExit && !h.dead && g.state === "play") { ctx.fillStyle = "#ffe27a"; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(o.t * 6 + i); ctx.beginPath(); ctx.arc(x + 0.3, y - h.h - 0.15, 0.06, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    }
    // кусты — перед хомяками: кто внутри, того почти не видно
    ctx.globalAlpha = 0.86;
    for (let y = 0; y < g.rows; y++) for (let x = 0; x < g.cols; x++) if (g.tiles[y][x] === "%") S.bush(ctx, x - 0.1, y + 0.05, o.t, w === 6);
    ctx.globalAlpha = 1;
    // указатель активного хомяка
    if (g.state === "play" && !act.dead) {
      const bx = ap.x + act.w / 2, by = ap.y - 0.42 + Math.sin(o.t * 5) * 0.08;
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "rgba(60,40,20,0.35)"; ctx.lineWidth = 0.04;
      ctx.beginPath(); ctx.moveTo(bx - 0.17, by - 0.18); ctx.lineTo(bx + 0.17, by - 0.18); ctx.lineTo(bx, by); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    for (const p of g.particles) {
      const a = Math.max(0, 1 - p.t / p.life);
      ctx.globalAlpha = p.puff ? a * 0.75 : a; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.puff ? p.size * (1 + p.t * 2.5) : p.size, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const drawFloaters = () => {
      for (const f of g.floaters) {
        const k2 = f.t / f.life, pop = Math.min(1, f.t * 8);
        ctx.globalAlpha = k2 < 0.7 ? 1 : 1 - (k2 - 0.7) / 0.3;
        S.text(ctx, f.text, f.x, f.y - k2 * 0.9, f.size * (0.6 + 0.4 * pop), 900, f.color, "rgba(60,35,15,0.65)");
      }
      ctx.globalAlpha = 1;
    };
    if (!th.dim) { for (const c of g.cats) drawCone(g, c, o.t); drawFloaters(); }
    ctx.restore();

    // кладовка и ночной двор: темнота, тёплый свет вокруг хомяков, глаза и взгляд кота
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
      ctx.save();
      ctx.translate(W / 2 - (cam.x + shx) * cam.s, H / 2 - cam.y * cam.s);
      ctx.scale(cam.s, cam.s);
      for (const c of g.cats) {
        drawCone(g, c, o.t);
        if (c.phase !== "sleep" || c.pounce) {
          const gx = c.x + c.look * 0.83, gy = c.y - 1.15 - (c.phase === "awake" ? 0 : -0.3);
          const eg = ctx.createRadialGradient(gx, gy, 0, gx, gy, 0.6);
          eg.addColorStop(0, "rgba(255,226,90,0.55)"); eg.addColorStop(1, "rgba(255,226,90,0)");
          ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(gx, gy, 0.6, 0, TAU); ctx.fill();
        }
      }
      drawFloaters();
      ctx.restore();
    }
  };

  // портрет хомяка для кнопок и меню
  R.portrait = function (canvas, i, hat, t, skin) {
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
    S.hamster(c, { i, x: 0, y: 0, face: 1, squash: 0, vy: 0, vx: 0, onGround: true, walk: 0, blink: 1, t: t || 0, hat, skin });
  };
})();
