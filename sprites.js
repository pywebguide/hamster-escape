// Рисование хомяков, шляпок и предметов. Координаты — в клетках, масштаб задаёт камера.
(function () {
  const HE = window.HE;
  const TAU = Math.PI * 2;
  const S = (HE.Sprites = {});

  HE.CHANNEL_COLORS = { a: "#ff7a59", b: "#3fa2ff", c: "#a46bff", d: "#25c2a0" };

  HE.HATS = [
    { id: "none",   name: "Без шляпки",     price: 0 },
    { id: "bow",    name: "Бантик",         price: 3 },
    { id: "cap",    name: "Кепка",          price: 8 },
    { id: "flower", name: "Ромашка",        price: 12 },
    { id: "chef",   name: "Колпак повара",  price: 18 },
    { id: "party",  name: "Праздничный колпак", price: 24 },
    { id: "top",    name: "Цилиндр",        price: 32 },
    { id: "phones", name: "Наушники",       price: 40 },
    { id: "crown",  name: "Корона",         price: 52 },
  ];

  function ellipse(ctx, x, y, rx, ry, fill) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(rx, 0.001), Math.max(ry, 0.001), 0, 0, TAU); ctx.fillStyle = fill; ctx.fill();
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  S.rrect = rrect; S.ellipse = ellipse;

  // Текст в клетках. Safari плохо рисует шрифт меньше 1px, поэтому рисуем 32px и уменьшаем масштабом.
  S.text = function (ctx, str, x, y, size, weight, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale(size / 32, size / 32);
    ctx.fillStyle = color; ctx.font = `${weight} 32px Nunito, "Segoe UI", sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(str, 0, 0); ctx.restore();
  };

  // ───────── хомяк ─────────
  // pose: { x, y (низ-центр), face, squash, vy, onGround, climbing, walk, blink, t, hat, i }
  S.hamster = function (ctx, p) {
    const d = HE.HAMSTERS[p.i];
    const w = d.w, h = d.h;
    let s = p.squash || 0;
    let air = p.onGround ? 0 : Math.min(Math.abs(p.vy || 0) / 90, 0.12);
    const breathe = Math.sin(p.t * 3 + p.i) * 0.018;
    const sx = (1 + s * 0.8) * (1 - air * 0.7), sy = (1 - s) * (1 + air) * (1 + breathe);
    const moving = p.onGround && Math.abs(p.vx || 0) > 0.3;
    const bob = moving ? -Math.abs(Math.sin(p.walk * 2.4)) * 0.06 : 0;
    const f = p.face || 1;

    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.scale(sx, sy);

    // лапки
    const step = moving ? Math.sin(p.walk * 2.4) * w * 0.12 : 0;
    const footY = -0.02;
    ellipse(ctx, -w * 0.22 + step, footY, w * 0.13, h * 0.06, d.dark);
    ellipse(ctx, w * 0.22 - step, footY, w * 0.13, h * 0.06, d.dark);
    if (p.i === 1) { // коготки
      ctx.strokeStyle = "#fff6e6"; ctx.lineWidth = 0.025;
      for (const fx of [-w * 0.22 + step, w * 0.22 - step]) for (let k = -1; k <= 1; k++) {
        ctx.beginPath(); ctx.moveTo(fx + k * 0.04 + f * 0.08, footY); ctx.lineTo(fx + k * 0.04 + f * 0.13, footY + 0.03); ctx.stroke();
      }
    }

    // хвостик
    ellipse(ctx, -f * w * 0.5, -h * 0.28, w * 0.08, h * 0.06, d.dark);

    // тело
    const cy = -h * 0.47, rx = w * 0.53, ry = h * 0.49;
    const grad = ctx.createRadialGradient(-rx * 0.3, cy - ry * 0.4, ry * 0.1, 0, cy, ry * 1.15);
    grad.addColorStop(0, lighten(d.fur, 0.25)); grad.addColorStop(1, d.fur);
    ellipse(ctx, 0, cy, rx, ry, grad);
    // пятна у Шустрика
    if (p.i === 2) { ellipse(ctx, -f * w * 0.18, cy - ry * 0.45, w * 0.24, h * 0.17, "#cdbfae"); }
    if (p.i === 0) { ellipse(ctx, -f * w * 0.12, cy - ry * 0.55, w * 0.3, h * 0.13, lighten(d.fur, -0.08)); }
    // животик
    ellipse(ctx, f * w * 0.12, cy + ry * 0.25, rx * 0.62, ry * 0.58, d.belly);

    // ушки
    const earY = cy - ry * 0.86;
    for (const ex of [-0.3, 0.26]) {
      ellipse(ctx, (ex + f * 0.06) * w, earY, w * 0.13, w * 0.12, d.fur);
      ellipse(ctx, (ex + f * 0.06) * w, earY + w * 0.01, w * 0.075, w * 0.07, "#f4a6a6");
    }

    // ручки
    const handUp = p.climbing ? -h * 0.25 : 0;
    ellipse(ctx, f * w * 0.32, cy + ry * 0.15 + handUp, w * 0.09, w * 0.075, d.belly);
    ellipse(ctx, f * w * 0.06, cy + ry * 0.2 + handUp * 0.6, w * 0.08, w * 0.07, lighten(d.belly, -0.06));

    // мордочка
    const ey = cy - ry * 0.18;
    const e1 = f * w * 0.36, e2 = f * w * 0.02;
    const er = Math.max(0.045, w * 0.075);
    if (p.blink < 0) {
      ctx.strokeStyle = "#2a1a12"; ctx.lineWidth = 0.035; ctx.lineCap = "round";
      for (const ex of [e1, e2]) { ctx.beginPath(); ctx.moveTo(ex - er, ey); ctx.lineTo(ex + er, ey); ctx.stroke(); }
    } else {
      for (const ex of [e1, e2]) {
        ellipse(ctx, ex, ey, er, er * 1.12, "#2a1a12");
        ellipse(ctx, ex + er * 0.35, ey - er * 0.4, er * 0.38, er * 0.38, "#ffffff");
      }
    }
    // щёчки
    ellipse(ctx, f * w * 0.42, ey + er * 2.2, w * 0.1, w * 0.06, "rgba(255,130,130,0.45)");
    ellipse(ctx, -f * w * 0.06, ey + er * 2.2, w * 0.08, w * 0.05, "rgba(255,130,130,0.35)");
    // носик и рот
    const nx = f * w * 0.21, ny = ey + er * 1.4;
    ellipse(ctx, nx, ny, w * 0.045, w * 0.035, "#e86f7c");
    ctx.strokeStyle = "#5a3a2a"; ctx.lineWidth = 0.022; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(nx - w * 0.035, ny + w * 0.05, w * 0.035, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(nx + w * 0.035, ny + w * 0.05, w * 0.035, 0.2, Math.PI - 0.2); ctx.stroke();
    // усики
    ctx.strokeStyle = "rgba(60,40,30,0.55)"; ctx.lineWidth = 0.015;
    for (const k of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(nx + f * w * 0.08, ny + k * 0.02); ctx.lineTo(nx + f * w * 0.32, ny + k * 0.07 - 0.02); ctx.stroke();
    }

    // шляпка
    if (p.hat && p.hat !== "none") {
      ctx.save(); ctx.translate(f * w * 0.04, cy - ry * 0.92); S.hat(ctx, p.hat, w, f, p.t); ctx.restore();
    }
    ctx.restore();
  };

  function lighten(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = k > 0 ? 255 : 0, a = Math.abs(k);
    r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
    return `rgb(${r},${g},${b})`;
  }
  S.lighten = lighten;

  // ───────── шляпки (центр — макушка, w — ширина хомяка) ─────────
  S.hat = function (ctx, id, w, f, t) {
    const u = Math.max(w, 0.8);
    ctx.lineJoin = "round";
    if (id === "bow") {
      ctx.fillStyle = "#ff5fa2";
      for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(0, -0.02); ctx.lineTo(k * u * 0.26, -u * 0.14); ctx.lineTo(k * u * 0.26, u * 0.08); ctx.closePath(); ctx.fill(); }
      ellipse(ctx, 0, -0.02, u * 0.07, u * 0.07, "#e03b84");
    } else if (id === "cap") {
      ctx.fillStyle = "#e84a4a";
      ctx.beginPath(); ctx.arc(0, 0.02, u * 0.26, Math.PI, 0); ctx.fill();
      ctx.fillStyle = "#c22f2f"; rrect(ctx, f > 0 ? 0 : -u * 0.42, -0.01, u * 0.42, u * 0.06, 0.02); ctx.fill();
      ellipse(ctx, 0, -u * 0.25, u * 0.04, u * 0.03, "#ffd34d");
    } else if (id === "flower") {
      const sway = Math.sin(t * 2) * 0.15;
      ctx.save(); ctx.rotate(sway);
      ctx.strokeStyle = "#4caf50"; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -u * 0.25); ctx.stroke();
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; ellipse(ctx, Math.cos(a) * u * 0.1, -u * 0.3 + Math.sin(a) * u * 0.1, u * 0.07, u * 0.07, "#ffffff"); }
      ellipse(ctx, 0, -u * 0.3, u * 0.07, u * 0.07, "#ffc928");
      ctx.restore();
    } else if (id === "chef") {
      ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#d9d4cc"; ctx.lineWidth = 0.025;
      rrect(ctx, -u * 0.2, -u * 0.18, u * 0.4, u * 0.2, 0.03); ctx.fill(); ctx.stroke();
      for (const k of [-0.13, 0, 0.13]) { ctx.beginPath(); ctx.arc(k * u, -u * 0.27, u * 0.13, 0, TAU); ctx.fill(); ctx.stroke(); }
      ctx.fillRect(-u * 0.19, -u * 0.26, u * 0.38, u * 0.1);
    } else if (id === "party") {
      ctx.fillStyle = "#6c63ff";
      ctx.beginPath(); ctx.moveTo(-u * 0.18, 0.02); ctx.lineTo(u * 0.18, 0.02); ctx.lineTo(0, -u * 0.5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffd34d"; for (const [x, y] of [[-0.06, -0.08], [0.06, -0.2], [-0.02, -0.32]]) ellipse(ctx, x * u, y * u, u * 0.035, u * 0.035, "#ffd34d");
      ellipse(ctx, 0, -u * 0.52, u * 0.06, u * 0.06, "#ff5fa2");
    } else if (id === "top") {
      ctx.fillStyle = "#26222e"; rrect(ctx, -u * 0.3, -0.02, u * 0.6, u * 0.07, 0.02); ctx.fill();
      rrect(ctx, -u * 0.19, -u * 0.42, u * 0.38, u * 0.42, 0.03); ctx.fill();
      ctx.fillStyle = "#d94b4b"; ctx.fillRect(-u * 0.19, -u * 0.13, u * 0.38, u * 0.07);
    } else if (id === "phones") {
      ctx.strokeStyle = "#2f3a4a"; ctx.lineWidth = 0.05;
      ctx.beginPath(); ctx.arc(0, u * 0.12, u * 0.36, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      for (const k of [-1, 1]) { ctx.fillStyle = "#38c3ff"; rrect(ctx, k * u * 0.36 - u * 0.07, u * 0.02, u * 0.14, u * 0.2, 0.04); ctx.fill(); }
    } else if (id === "crown") {
      ctx.fillStyle = "#ffcf33"; ctx.strokeStyle = "#d99a00"; ctx.lineWidth = 0.025;
      ctx.beginPath(); ctx.moveTo(-u * 0.24, 0.02); ctx.lineTo(-u * 0.24, -u * 0.18); ctx.lineTo(-u * 0.12, -u * 0.08);
      ctx.lineTo(0, -u * 0.24); ctx.lineTo(u * 0.12, -u * 0.08); ctx.lineTo(u * 0.24, -u * 0.18); ctx.lineTo(u * 0.24, 0.02); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ellipse(ctx, 0, -u * 0.05, u * 0.04, u * 0.04, "#ff4d6d");
      const tw = (Math.sin(t * 4) + 1) / 2;
      ellipse(ctx, u * 0.12, -u * 0.2, u * 0.03 * tw, u * 0.03 * tw, "#ffffff");
    }
  };

  // ───────── предметы ─────────
  S.crate = function (ctx, x, y) {
    ctx.fillStyle = "#c98f4e"; rrect(ctx, x + 0.03, y + 0.03, 0.94, 0.97, 0.08); ctx.fill();
    ctx.fillStyle = "#dca468"; rrect(ctx, x + 0.08, y + 0.08, 0.84, 0.86, 0.05); ctx.fill();
    ctx.fillStyle = "#e9c48d"; ctx.fillRect(x + 0.4, y + 0.03, 0.2, 0.97);
    ctx.strokeStyle = "#a86f35"; ctx.lineWidth = 0.035; ctx.lineCap = "round";
    for (const ax of [0.2, 0.8]) { ctx.beginPath(); ctx.moveTo(x + ax, y + 0.38); ctx.lineTo(x + ax, y + 0.18); ctx.moveTo(x + ax - 0.06, y + 0.24); ctx.lineTo(x + ax, y + 0.18); ctx.lineTo(x + ax + 0.06, y + 0.24); ctx.stroke(); }
  };

  S.seed = function (ctx, x, y, t) {
    const by = Math.sin(t * 3 + x) * 0.06;
    const glow = ctx.createRadialGradient(x, y + by, 0.02, x, y + by, 0.42);
    glow.addColorStop(0, "rgba(255,220,110,0.55)"); glow.addColorStop(1, "rgba(255,220,110,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y + by, 0.42, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(x, y + by); ctx.rotate(Math.sin(t * 2 + x) * 0.25); ctx.scale(1.35, 1.35);
    ctx.beginPath(); ctx.moveTo(0, -0.26); ctx.quadraticCurveTo(0.17, -0.05, 0, 0.2); ctx.quadraticCurveTo(-0.17, -0.05, 0, -0.26);
    ctx.fillStyle = "#2c2a2e"; ctx.fill();
    ctx.strokeStyle = "#e9e3d6"; ctx.lineWidth = 0.025;
    for (const k of [-0.05, 0.05]) { ctx.beginPath(); ctx.moveTo(k, -0.17); ctx.lineTo(k * 1.2, 0.12); ctx.stroke(); }
    ctx.restore();
  };

  S.tacks = function (ctx, x, y, seed) {
    const cols = ["#ff5d5d", "#ffc83d", "#4fb0ff"];
    for (let k = 0; k < 2; k++) {
      const cx = x + 0.28 + k * 0.44, c = cols[(seed + k) % 3];
      ctx.fillStyle = "#cfd6de"; ctx.beginPath(); ctx.moveTo(cx - 0.04, y + 0.82); ctx.lineTo(cx, y + 0.5); ctx.lineTo(cx + 0.04, y + 0.82); ctx.fill();
      ellipse(ctx, cx, y + 0.88, 0.17, 0.08, c);
      ellipse(ctx, cx - 0.05, y + 0.86, 0.06, 0.025, "rgba(255,255,255,0.6)");
    }
  };

  S.spring = function (ctx, x, y, anim) {
    const comp = Math.sin(anim * Math.PI) * 0.18;
    const top = y + 0.55 + comp * 0.5 - anim * 0.15;
    ctx.strokeStyle = "#8e98a6"; ctx.lineWidth = 0.06; ctx.lineCap = "round";
    ctx.beginPath();
    const n = 4, h = y + 1 - top;
    for (let k = 0; k <= n; k++) { const yy = y + 1 - (h * k) / n; ctx.lineTo(x + (k % 2 ? 0.72 : 0.28), yy); }
    ctx.stroke();
    ctx.fillStyle = "#ff6b6b"; rrect(ctx, x + 0.12, top - 0.1, 0.76, 0.14, 0.06); ctx.fill();
    ctx.fillStyle = "#ff9b9b"; ctx.fillRect(x + 0.2, top - 0.08, 0.5, 0.03);
    ctx.fillStyle = "#6b7480"; rrect(ctx, x + 0.18, y + 0.92, 0.64, 0.08, 0.03); ctx.fill();
  };

  S.plate = function (ctx, p, t) {
    const col = HE.CHANNEL_COLORS[p.ch];
    const dy = p.down ? 0.08 : 0;
    ctx.fillStyle = "rgba(0,0,0,0.25)"; rrect(ctx, p.x + 0.06, p.y + 0.9, 0.88, 0.1, 0.03); ctx.fill();
    if (p.latch) {
      ctx.fillStyle = p.down ? "#8a2b2b" : "#e23b3b";
      ctx.beginPath(); ctx.ellipse(p.x + 0.5, p.y + 0.88 + dy * 0.5, 0.32, 0.2 - dy, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = col; ctx.fillRect(p.x + 0.12, p.y + 0.86, 0.76, 0.06);
      if (p.down) S.text(ctx, "✓", p.x + 0.5, p.y + 0.77, 0.22, 900, "#ffffff");
    } else {
      ctx.fillStyle = p.down ? S.lighten(col, -0.25) : col;
      rrect(ctx, p.x + 0.12, p.y + 0.78 + dy, 0.76, 0.14, 0.05); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillRect(p.x + 0.2, p.y + 0.8 + dy, 0.5, 0.03);
      if (p.heavy) { // гирька
        ellipse(ctx, p.x + 0.5, p.y + 0.66 + dy, 0.13, 0.11, "#4a4f58");
        ctx.strokeStyle = "#4a4f58"; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.arc(p.x + 0.5, p.y + 0.55 + dy, 0.06, Math.PI, 0); ctx.stroke();
      }
    }
    if (!p.down) { // мягкое мерцание, чтобы кнопку было видно
      const a = 0.15 + 0.1 * Math.sin(t * 3 + p.x);
      ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.beginPath(); ctx.ellipse(p.x + 0.5, p.y + 0.84, 0.5, 0.12, 0, 0, TAU); ctx.fill();
    }
  };

  // дверь-решётка: прутья уезжают вверх
  S.doorTile = function (ctx, x, y, ch, open, isTop, isBottom) {
    const col = HE.CHANNEL_COLORS[ch];
    ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(x, y, 1, 1);
    if (open > 0.98) { ctx.fillStyle = col; ctx.globalAlpha = 0.35; ctx.fillRect(x, y, 0.08, 1); ctx.fillRect(x + 0.92, y, 0.08, 1); ctx.globalAlpha = 1; return; }
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, 1, 1); ctx.clip();
    const off = -open;
    ctx.fillStyle = col;
    for (let k = 0; k < 4; k++) { rrect(ctx, x + 0.1 + k * 0.23, y + off, 0.11, 1.02, 0.04); ctx.fill(); }
    ctx.fillStyle = S.lighten(col, -0.2);
    ctx.fillRect(x, y + off + 0.42, 1, 0.12);
    if (isBottom) { ctx.fillStyle = S.lighten(col, -0.3); ctx.fillRect(x, y + off + 0.9, 1, 0.1); }
    ctx.restore();
    ctx.fillStyle = S.lighten(col, -0.35); ctx.fillRect(x, y, 0.07, 1); ctx.fillRect(x + 0.93, y, 0.07, 1);
  };

  S.plank = function (ctx, x, y, damage, t) {
    const shake = damage > 0 ? Math.sin(t * 60) * 0.03 * damage : 0;
    ctx.save(); ctx.translate(shake, 0);
    ctx.fillStyle = "#b07a45"; rrect(ctx, x + 0.02, y, 0.96, 0.42, 0.06); ctx.fill();
    ctx.fillStyle = "#c99560"; ctx.fillRect(x + 0.06, y + 0.06, 0.88, 0.08);
    ctx.strokeStyle = "#6f4523"; ctx.lineWidth = 0.035; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x + 0.35, y); ctx.lineTo(x + 0.45, y + 0.18); ctx.lineTo(x + 0.38, y + 0.28); ctx.lineTo(x + 0.5, y + 0.42); ctx.stroke();
    ctx.fillStyle = "#7d5230"; ellipse(ctx, x + 0.12, y + 0.24, 0.035, 0.035, "#7d5230"); ellipse(ctx, x + 0.88, y + 0.24, 0.035, 0.035, "#7d5230");
    ctx.restore();
  };

  S.shelf = function (ctx, x, y) {
    ctx.fillStyle = "#a4703f"; rrect(ctx, x, y, 1, 0.2, 0.04); ctx.fill();
    ctx.fillStyle = "#c58c55"; ctx.fillRect(x, y, 1, 0.06);
    ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(x, y + 0.2, 1, 0.06);
  };

  S.lift = function (ctx, L) {
    const col = HE.CHANNEL_COLORS[L.ch];
    ctx.save();
    ctx.fillStyle = "#5c6470"; rrect(ctx, L.x, L.y, L.w, 0.42, 0.08); ctx.fill();
    ctx.beginPath(); rrect(ctx, L.x, L.y, L.w, 0.42, 0.08); ctx.clip();
    ctx.fillStyle = col;
    for (let k = -1; k < L.w * 3 + 1; k++) { ctx.beginPath(); ctx.moveTo(L.x + k / 3, L.y + 0.42); ctx.lineTo(L.x + k / 3 + 0.17, L.y + 0.42); ctx.lineTo(L.x + k / 3 + 0.3, L.y + 0.1); ctx.lineTo(L.x + k / 3 + 0.13, L.y + 0.1); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = "#e7ecf2"; rrect(ctx, L.x, L.y, L.w, 0.1, 0.05); ctx.fill();
  };

  S.liftTrack = function (ctx, L) {
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 0.08; ctx.setLineDash([0.12, 0.16]); ctx.lineCap = "round";
    const cx = L.x0 + L.w / 2, cy = L.y0 + 0.2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + L.dx, cy + L.dy); ctx.stroke();
    ctx.restore();
  };

  // норка: тёмная арка, вокруг солома, табличка
  S.exit = function (ctx, E, glow, t, count) {
    const cx = (E.x0 + E.x1) / 2, bot = E.y1, w = E.x1 - E.x0, h = E.y1 - E.y0;
    const g2 = ctx.createRadialGradient(cx, bot - h * 0.4, 0.1, cx, bot - h * 0.4, w * 1.1);
    g2.addColorStop(0, `rgba(255,230,140,${0.25 + glow * 0.35})`); g2.addColorStop(1, "rgba(255,230,140,0)");
    ctx.fillStyle = g2; ctx.fillRect(cx - w * 1.2, bot - h * 1.4, w * 2.4, h * 1.4);
    ctx.fillStyle = "#c7a46a";
    ctx.beginPath(); ctx.ellipse(cx, bot, w * 0.56, h * 0.82, 0, Math.PI, 0); ctx.fill();
    const g = ctx.createLinearGradient(0, bot - h * 0.7, 0, bot);
    g.addColorStop(0, "#2a1a10"); g.addColorStop(1, "#4a2e1a");
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, bot, w * 0.42, h * 0.68, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = "#e6cc8f"; ctx.lineWidth = 0.04; ctx.lineCap = "round";
    for (let k = 0; k < 9; k++) {
      const a = Math.PI + (k / 8) * Math.PI, r1 = w * 0.5, r2 = w * 0.62 + Math.sin(k * 7) * 0.06;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, bot + Math.sin(a) * h * 0.78); ctx.lineTo(cx + Math.cos(a + 0.05) * r2, bot + Math.sin(a + 0.05) * h * 0.92); ctx.stroke();
    }
    // табличка над норкой: сколько хомяков уже дома
    const sx = cx, sy = bot - h * 0.82 - 0.42 + Math.sin(t * 2) * 0.03;
    ctx.fillStyle = "#8a5a33"; ctx.fillRect(sx - 0.03, sy, 0.06, 0.3);
    ctx.fillStyle = count === 3 ? "#7ed957" : "#e7c38a"; rrect(ctx, sx - 0.4, sy - 0.34, 0.8, 0.36, 0.08); ctx.fill();
    S.text(ctx, `${count}/3`, sx, sy - 0.15, 0.24, 800, "#5a3a22");
  };
})();
