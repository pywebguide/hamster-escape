// Рисование хомяков, шляпок, окрасок, кота Графа и предметов. Координаты — в клетках, масштаб задаёт камера.
(function () {
  const HE = window.HE;
  const TAU = Math.PI * 2;
  const S = (HE.Sprites = {});

  HE.CHANNEL_COLORS = { a: "#ff7a59", b: "#3fa2ff", c: "#a46bff", d: "#25c2a0" };
  HE.TUBE_COLORS = ["#2ec4b6", "#ff6fb5", "#ffb020"];

  HE.HATS = [
    { id: "none",    name: "Без шляпки",     price: 0 },
    { id: "bow",     name: "Бантик",         price: 3 },
    { id: "cap",     name: "Кепка",          price: 8 },
    { id: "flower",  name: "Ромашка",        price: 12 },
    { id: "chef",    name: "Колпак повара",  price: 18 },
    { id: "party",   name: "Праздничный колпак", price: 24 },
    { id: "ushanka", name: "Ушанка",         price: 28 },
    { id: "top",     name: "Цилиндр",        price: 32 },
    { id: "goggles", name: "Очки пилота",    price: 36 },
    { id: "phones",  name: "Наушники",       price: 40 },
    { id: "pirate",  name: "Треуголка",      price: 46 },
    { id: "crown",   name: "Корона",         price: 52 },
  ];

  // Окраски шёрстки. unlock: "end" — за прохождение игры, число — за столько семечек всего.
  HE.SKINS = [
    { id: "classic", name: "Своя шёрстка",   price: 0 },
    { id: "choco",   name: "Шоколадка",      price: 6,  fur: "#7a4a2c", belly: "#e2b98f", dark: "#462816" },
    { id: "snow",    name: "Снежок",         price: 8,  fur: "#fbf8f4", belly: "#ffffff", dark: "#d6c7ba", eye: "#9b2f45" },
    { id: "ginger",  name: "Мандаринка",     price: 10, fur: "#ff9838", belly: "#ffe3bd", dark: "#c85d10" },
    { id: "mint",    name: "Мятный",         price: 14, fur: "#94dcc4", belly: "#ecfff7", dark: "#4d9f86" },
    { id: "cow",     name: "Бурёнка",        price: 16, fur: "#fffdf8", belly: "#ffeef2", dark: "#3a3230", pattern: "spots" },
    { id: "panda",   name: "Панда",          price: 18, fur: "#fbfbf6", belly: "#ffffff", dark: "#2d2b30", pattern: "panda" },
    { id: "tiger",   name: "Тигрёнок",       price: 22, fur: "#ff9f30", belly: "#fff0d4", dark: "#3d2615", pattern: "stripes" },
    { id: "night",   name: "Звёздная ночь",  price: 30, fur: "#2f3c80", belly: "#8a99e0", dark: "#1a2152", pattern: "stars" },
    { id: "gold",    name: "Золотой",        price: 40, fur: "#ffcd38", belly: "#fff1ad", dark: "#c68b00", pattern: "shine" },
    { id: "rainbow", name: "Радуга",         price: 50, pattern: "rainbow" },
    { id: "ninja",   name: "Ниндзя",         price: 0, unlock: "end", fur: "#3b3a46", belly: "#77768a", dark: "#22212b", pattern: "ninja" },
    { id: "sunny",   name: "Подсолнух",      price: 0, unlock: 100, fur: "#ffc928", belly: "#8a5426", dark: "#b07a12", pattern: "sunflower" },
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
  S.text = function (ctx, str, x, y, size, weight, color, outline) {
    ctx.save(); ctx.translate(x, y); ctx.scale(size / 32, size / 32);
    ctx.font = `${weight} 32px Nunito, "Segoe UI", sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (outline) { ctx.lineJoin = "round"; ctx.lineWidth = 7; ctx.strokeStyle = outline; ctx.strokeText(str, 0, 0); }
    ctx.fillStyle = color; ctx.fillText(str, 0, 0); ctx.restore();
  };

  function lighten(hex, k) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = k > 0 ? 255 : 0, a = Math.abs(k);
    r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
    return `rgb(${r},${g},${b})`;
  }
  S.lighten = lighten;

  // цвета хомяка с учётом окраски
  S.skinColors = function (i, skinId, t) {
    const d = HE.HAMSTERS[i] || HE.HAMSTERS[0];
    const sk = HE.SKINS.find(s => s.id === skinId);
    if (!sk || sk.id === "classic") return { fur: d.fur, furL: lighten(d.fur, 0.25), belly: d.belly, dark: d.dark, eye: "#2a1a12", classic: true };
    if (sk.pattern === "rainbow") {
      const hue = ((t || 0) * 70 + i * 50) % 360;
      return { fur: `hsl(${hue},85%,64%)`, furL: `hsl(${hue},90%,80%)`, belly: `hsl(${(hue + 40) % 360},95%,91%)`, dark: `hsl(${hue},55%,40%)`, eye: "#2a1a12", pattern: "rainbow" };
    }
    return { fur: sk.fur, furL: lighten(sk.fur, 0.25), belly: sk.belly, dark: sk.dark, eye: sk.eye || "#2a1a12", pattern: sk.pattern };
  };

  // узор поверх тела (рисуется внутри контура тела)
  function bodyPattern(ctx, col, w, h, cy, rx, ry, f, t, i) {
    const P = col.pattern;
    if (P === "spots") {
      for (const [sx, sy, a, b] of [[-0.5, -0.35, 0.3, 0.24], [0.15, -0.72, 0.22, 0.16], [-0.15, 0.35, 0.24, 0.2], [0.62, 0.1, 0.16, 0.14]])
        ellipse(ctx, -f * sx * rx, cy + sy * ry, a * rx, b * ry, col.dark);
    } else if (P === "stripes") {
      ctx.strokeStyle = col.dark; ctx.lineWidth = Math.max(0.05, w * 0.07); ctx.lineCap = "round";
      for (let k = 0; k < 3; k++) {
        const x0 = -f * (0.1 + k * 0.24) * rx;
        ctx.beginPath(); ctx.moveTo(x0, cy - ry * 1.02); ctx.quadraticCurveTo(x0 - f * 0.22 * rx, cy - ry * 0.45, x0 - f * 0.05 * rx, cy - ry * 0.05); ctx.stroke();
      }
    } else if (P === "stars") {
      for (let k = 0; k < 7; k++) {
        const sx = Math.sin(k * 12.9898) * 0.75, sy = Math.cos(k * 78.233) * 0.7;
        const tw = 0.6 + 0.4 * Math.sin(t * 3 + k * 1.7);
        ellipse(ctx, -f * sx * rx, cy + sy * ry - ry * 0.1, w * 0.035 * tw, w * 0.035 * tw, "#fff8d6");
      }
    } else if (P === "shine") {
      const ph = ((t * 0.55 + i * 0.37) % 1.8) - 0.4;
      ctx.save(); ctx.translate((-1 + ph * 2) * rx, cy); ctx.rotate(0.45);
      const gr = ctx.createLinearGradient(-rx * 0.25, 0, rx * 0.25, 0);
      gr.addColorStop(0, "rgba(255,255,255,0)"); gr.addColorStop(0.5, "rgba(255,255,255,0.65)"); gr.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gr; ctx.fillRect(-rx * 0.25, -ry * 2, rx * 0.5, ry * 4); ctx.restore();
    }
  }

  // ───────── хомяк ─────────
  // pose: { i, x, y (низ-центр), face, squash, vy, vx, onGround, climbing, walk, blink, t, hat, skin,
  //         idle, cheek, dead, scared, def (свой хомяк), colors (свои цвета) }
  S.hamster = function (ctx, p) {
    const d = p.def || HE.HAMSTERS[p.i];
    const col = p.colors || S.skinColors(p.i, p.skin, p.t);
    const w = d.w, h = d.h;
    const idle = p.idle || 0, asleep = idle > 9 && !p.dead && !p.scared;
    let s = p.squash || 0;
    const air = p.onGround ? 0 : Math.min(Math.abs(p.vy || 0) / 90, 0.12);
    const breathe = asleep ? Math.sin(p.t * 1.7 + p.i) * 0.04 : Math.sin(p.t * 3 + p.i) * 0.018;
    let sx = (1 + s * 0.8) * (1 - air * 0.7), sy = (1 - s) * (1 + air) * (1 + breathe);
    if (asleep) { sx *= 1.05; sy *= 0.92; }
    const moving = p.onGround && Math.abs(p.vx || 0) > 0.3;
    const bob = moving ? -Math.abs(Math.sin(p.walk * 2.4)) * 0.06 : 0;
    let f = p.face || 1, gx = 0, gy = 0;
    // стоит без дела: оглядывается по сторонам
    if (!asleep && !p.dead && idle > 3.5) {
      const ph = Math.floor((idle - 3.5) / 1.3) % 4;
      if (ph === 1) f = -f; else if (ph === 2) gy = -1; else if (ph === 3) gx = 1;
    }

    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.scale(sx, sy);

    // лапки
    const step = moving ? Math.sin(p.walk * 2.4) * w * 0.12 : 0;
    const footY = -0.02;
    ellipse(ctx, -w * 0.22 + step, footY, w * 0.13, h * 0.06, col.dark);
    ellipse(ctx, w * 0.22 - step, footY, w * 0.13, h * 0.06, col.dark);
    if (p.i === 1) { // коготки
      ctx.strokeStyle = "#fff6e6"; ctx.lineWidth = 0.025;
      for (const fx of [-w * 0.22 + step, w * 0.22 - step]) for (let k = -1; k <= 1; k++) {
        ctx.beginPath(); ctx.moveTo(fx + k * 0.04 + f * 0.08, footY); ctx.lineTo(fx + k * 0.04 + f * 0.13, footY + 0.03); ctx.stroke();
      }
    }

    // хвостик
    ellipse(ctx, -f * w * 0.5, -h * 0.28, w * 0.08, h * 0.06, col.dark);

    // тело
    const cy = -h * 0.47, rx = w * 0.53, ry = h * 0.49;
    const grad = ctx.createRadialGradient(-rx * 0.3, cy - ry * 0.4, ry * 0.1, 0, cy, ry * 1.15);
    grad.addColorStop(0, col.furL); grad.addColorStop(1, col.fur);
    ellipse(ctx, 0, cy, rx, ry, grad);
    if (col.classic) {   // родные пятнышки
      if (p.i === 2) ellipse(ctx, -f * w * 0.18, cy - ry * 0.45, w * 0.24, h * 0.17, "#cdbfae");
      if (p.i === 0) ellipse(ctx, -f * w * 0.12, cy - ry * 0.55, w * 0.3, h * 0.13, lighten(d.fur, -0.08));
    } else if (col.pattern && col.pattern !== "panda" && col.pattern !== "rainbow") {
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, cy, rx, ry, 0, 0, TAU); ctx.clip();
      bodyPattern(ctx, col, w, h, cy, rx, ry, f, p.t, p.i);
      ctx.restore();
    }
    // животик
    const bx = f * w * 0.12, by = cy + ry * 0.25, brx = rx * 0.62, bry = ry * 0.58;
    ellipse(ctx, bx, by, brx, bry, col.belly);
    if (col.pattern === "sunflower") {   // семечки на животике
      ctx.save(); ctx.beginPath(); ctx.ellipse(bx, by, brx, bry, 0, 0, TAU); ctx.clip();
      for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) ellipse(ctx, bx + a * brx * 0.3 + (b % 2) * brx * 0.15, by + b * bry * 0.28, w * 0.025, w * 0.035, "#c48a4a");
      ctx.restore();
    }

    // ушки
    const earY = cy - ry * 0.86;
    const earFur = col.pattern === "panda" ? col.dark : col.fur;
    const earDroop = asleep ? 0.03 : 0;
    for (const ex of [-0.3, 0.26]) {
      ellipse(ctx, (ex + f * 0.06) * w, earY + earDroop, w * 0.13, w * 0.12, earFur);
      ellipse(ctx, (ex + f * 0.06) * w, earY + earDroop + w * 0.01, w * 0.075, w * 0.07, col.pattern === "panda" ? "#55525c" : "#f4a6a6");
    }

    // ручки
    const handUp = p.climbing ? -h * 0.25 : 0;
    const handCol = col.pattern === "panda" ? col.dark : col.belly;
    ellipse(ctx, f * w * 0.32, cy + ry * 0.15 + handUp, w * 0.09, w * 0.075, handCol);
    ellipse(ctx, f * w * 0.06, cy + ry * 0.2 + handUp * 0.6, w * 0.08, w * 0.07, col.pattern === "panda" ? col.dark : (col.classic || col.pattern !== "rainbow" ? lighten(col.belly.startsWith("#") ? col.belly : "#ffffff", -0.06) : col.belly));

    // мордочка
    const ey = cy - ry * 0.18;
    const e1 = f * w * 0.36, e2 = f * w * 0.02;
    const er = Math.max(0.045, w * 0.075);
    if (col.pattern === "panda") for (const ex of [e1, e2]) ellipse(ctx, ex - f * er * 0.2, ey + er * 0.2, er * 1.9, er * 1.6, col.dark);
    if (col.pattern === "ninja") {   // повязка на лбу и хвостики узла
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, cy, rx * 1.01, ry * 1.01, 0, 0, TAU); ctx.clip();
      ctx.fillStyle = "#d8343a"; ctx.fillRect(-rx * 1.1, ey - er * 3.1, rx * 2.2, er * 1.6);
      ctx.restore();
      const kx = -f * rx * 0.92, ky = ey - er * 2.3, fl = Math.sin(p.t * 9) * 0.05 + Math.min(0.12, Math.abs(p.vx || 0) * 0.02);
      ctx.strokeStyle = "#d8343a"; ctx.lineWidth = er * 0.9; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(kx - f * 0.15, ky - 0.05 + fl, kx - f * 0.3, ky + 0.06 + fl); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(kx, ky); ctx.quadraticCurveTo(kx - f * 0.12, ky + 0.08 - fl, kx - f * 0.24, ky + 0.18 - fl); ctx.stroke();
    }
    ctx.lineCap = "round";
    if (p.dead) {
      ctx.strokeStyle = col.eye; ctx.lineWidth = 0.035;
      for (const ex of [e1, e2]) {
        ctx.beginPath(); ctx.moveTo(ex - er, ey - er); ctx.lineTo(ex + er, ey + er); ctx.moveTo(ex + er, ey - er); ctx.lineTo(ex - er, ey + er); ctx.stroke();
      }
    } else if (asleep) {
      ctx.strokeStyle = col.eye; ctx.lineWidth = 0.032;
      for (const ex of [e1, e2]) { ctx.beginPath(); ctx.arc(ex, ey - er * 0.3, er * 0.9, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke(); }
    } else if (p.scared) {
      for (const ex of [e1, e2]) {
        ellipse(ctx, ex, ey, er * 1.35, er * 1.45, "#ffffff");
        ellipse(ctx, ex + f * er * 0.15, ey + er * 0.1, er * 0.55, er * 0.6, col.eye);
      }
    } else if (p.blink < 0) {
      ctx.strokeStyle = col.eye; ctx.lineWidth = 0.035;
      for (const ex of [e1, e2]) { ctx.beginPath(); ctx.moveTo(ex - er, ey); ctx.lineTo(ex + er, ey); ctx.stroke(); }
    } else {
      for (const ex of [e1, e2]) {
        const ox = gx * f * er * 0.3, oy = gy * er * 0.35;
        ellipse(ctx, ex + ox, ey + oy, er, er * 1.12, col.eye);
        ellipse(ctx, ex + ox + er * 0.35, ey + oy - er * 0.4, er * 0.38, er * 0.38, "#ffffff");
      }
    }
    // щёчки (с семечкой за щекой — надутые)
    const puff = p.cheek > 0 ? Math.min(1, p.cheek / 0.5) * Math.min(1, (2.4 - p.cheek) / 0.12 + 0.2) : 0;
    if (puff > 0.02) {
      const cr = w * (0.1 + 0.11 * puff);
      ellipse(ctx, f * w * 0.42, ey + er * 2.1, cr * 1.1, cr, col.fur);
      ellipse(ctx, f * w * 0.42 - f * cr * 0.2, ey + er * 1.9, cr * 0.55, cr * 0.45, col.furL);
      ellipse(ctx, -f * w * 0.07, ey + er * 2.1, cr * 0.85, cr * 0.8, col.fur);
    }
    ellipse(ctx, f * w * 0.42, ey + er * 2.2, w * 0.1, w * 0.06, "rgba(255,130,130,0.45)");
    ellipse(ctx, -f * w * 0.06, ey + er * 2.2, w * 0.08, w * 0.05, "rgba(255,130,130,0.35)");
    // носик и рот
    const nx = f * w * 0.21, ny = ey + er * 1.4;
    ellipse(ctx, nx, ny, w * 0.045, w * 0.035, "#e86f7c");
    ctx.strokeStyle = "#5a3a2a"; ctx.lineWidth = 0.022; ctx.lineCap = "round";
    if (p.scared || p.dead) { ctx.beginPath(); ctx.arc(nx, ny + w * 0.09, w * 0.035, 0, TAU); ctx.stroke(); }
    else {
      ctx.beginPath(); ctx.arc(nx - w * 0.035, ny + w * 0.05, w * 0.035, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.beginPath(); ctx.arc(nx + w * 0.035, ny + w * 0.05, w * 0.035, 0.2, Math.PI - 0.2); ctx.stroke();
    }
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
      for (const [x, y] of [[-0.06, -0.08], [0.06, -0.2], [-0.02, -0.32]]) ellipse(ctx, x * u, y * u, u * 0.035, u * 0.035, "#ffd34d");
      ellipse(ctx, 0, -u * 0.52, u * 0.06, u * 0.06, "#ff5fa2");
    } else if (id === "ushanka") {
      for (const k of [-1, 1]) { ctx.fillStyle = "#7b5236"; rrect(ctx, k * u * 0.3 - u * 0.09, -u * 0.02, u * 0.18, u * 0.3, u * 0.08); ctx.fill(); }
      ellipse(ctx, 0, -u * 0.08, u * 0.3, u * 0.2, "#8a5d3d");
      ctx.fillStyle = "#5e3c25"; rrect(ctx, -u * 0.32, -u * 0.06, u * 0.64, u * 0.13, u * 0.06); ctx.fill();
      ellipse(ctx, f * u * 0.05, -u * 0.12, u * 0.05, u * 0.05, "#e8c547");
    } else if (id === "goggles") {
      ctx.fillStyle = "#4a3a2c"; ctx.fillRect(-u * 0.36, -u * 0.02, u * 0.72, u * 0.07);
      for (const k of [-1, 1]) {
        ellipse(ctx, f * u * 0.06 + k * u * 0.14, -u * 0.06, u * 0.12, u * 0.11, "#c98a2e");
        ellipse(ctx, f * u * 0.06 + k * u * 0.14, -u * 0.06, u * 0.085, u * 0.08, "#8fd6ff");
        ellipse(ctx, f * u * 0.06 + k * u * 0.14 - u * 0.03, -u * 0.09, u * 0.03, u * 0.025, "rgba(255,255,255,0.85)");
      }
    } else if (id === "top") {
      ctx.fillStyle = "#26222e"; rrect(ctx, -u * 0.3, -0.02, u * 0.6, u * 0.07, 0.02); ctx.fill();
      rrect(ctx, -u * 0.19, -u * 0.42, u * 0.38, u * 0.42, 0.03); ctx.fill();
      ctx.fillStyle = "#d94b4b"; ctx.fillRect(-u * 0.19, -u * 0.13, u * 0.38, u * 0.07);
    } else if (id === "phones") {
      ctx.strokeStyle = "#2f3a4a"; ctx.lineWidth = 0.05;
      ctx.beginPath(); ctx.arc(0, u * 0.12, u * 0.36, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
      for (const k of [-1, 1]) { ctx.fillStyle = "#38c3ff"; rrect(ctx, k * u * 0.36 - u * 0.07, u * 0.02, u * 0.14, u * 0.2, 0.04); ctx.fill(); }
    } else if (id === "pirate") {
      ctx.fillStyle = "#2a2430";
      ctx.beginPath(); ctx.moveTo(-u * 0.42, 0.01); ctx.quadraticCurveTo(-u * 0.3, -u * 0.36, 0, -u * 0.3);
      ctx.quadraticCurveTo(u * 0.3, -u * 0.36, u * 0.42, 0.01); ctx.quadraticCurveTo(0, -u * 0.1, -u * 0.42, 0.01); ctx.fill();
      ctx.strokeStyle = "#e8b931"; ctx.lineWidth = 0.025;
      ctx.beginPath(); ctx.moveTo(-u * 0.36, -0.02); ctx.quadraticCurveTo(0, -u * 0.13, u * 0.36, -0.02); ctx.stroke();
      ellipse(ctx, 0, -u * 0.2, u * 0.045, u * 0.045, "#f4efe6");
    } else if (id === "crown") {
      ctx.fillStyle = "#ffcf33"; ctx.strokeStyle = "#d99a00"; ctx.lineWidth = 0.025;
      ctx.beginPath(); ctx.moveTo(-u * 0.24, 0.02); ctx.lineTo(-u * 0.24, -u * 0.18); ctx.lineTo(-u * 0.12, -u * 0.08);
      ctx.lineTo(0, -u * 0.24); ctx.lineTo(u * 0.12, -u * 0.08); ctx.lineTo(u * 0.24, -u * 0.18); ctx.lineTo(u * 0.24, 0.02); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ellipse(ctx, 0, -u * 0.05, u * 0.04, u * 0.04, "#ff4d6d");
      const tw = (Math.sin(t * 4) + 1) / 2;
      ellipse(ctx, u * 0.12, -u * 0.2, u * 0.03 * tw, u * 0.03 * tw, "#ffffff");
    } else if (id === "specs") {   // очки Деда Сухарика (только в истории)
      ctx.strokeStyle = "#3b2a20"; ctx.lineWidth = 0.03;
      for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(f * u * 0.1 + k * u * 0.13, u * 0.3, u * 0.09, 0, TAU); ctx.stroke(); }
    }
  };

  // ───────── кот Граф ─────────
  // c: { x, y (низ, центр), look, phase: sleep|warn|awake, pounce }
  S.cat = function (ctx, c, t) {
    const sleeping = c.phase === "sleep", warn = c.phase === "warn", awake = c.phase === "awake";
    const lift = awake ? 1 : warn ? 0.3 + 0.08 * Math.sin(t * 18) : 0;
    const pounce = c.pounce || 0;
    const fur = "#8f91a0", furD = "#696b78", furL = "#b9bbc8", chest = "#f2eee7";
    const breathe = sleeping ? Math.sin(t * 1.6) * 0.03 : 0;
    ctx.save();
    ctx.translate(c.x + c.look * pounce * 0.35, c.y);
    ctx.scale(c.look, 1);
    // хвост
    const sw = Math.sin(t * (awake ? 4.5 : 1.3)) * (awake ? 0.28 : 0.06);
    ctx.strokeStyle = furD; ctx.lineWidth = 0.22; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-0.85, -0.3);
    if (sleeping) ctx.quadraticCurveTo(-1.35, -0.1, -0.6, -0.05);
    else ctx.quadraticCurveTo(-1.55, -0.25 + sw, -1.3, -0.95 - lift * 0.25 + sw);
    ctx.stroke();
    // тело-«батон»
    const bh = 0.95 + lift * 0.18 + breathe;
    const gr = ctx.createLinearGradient(0, -bh, 0, 0);
    gr.addColorStop(0, furL); gr.addColorStop(1, fur);
    ellipse(ctx, -0.12, -bh * 0.5, 1.08, bh * 0.52, gr);
    ctx.strokeStyle = furD; ctx.lineWidth = 0.09; ctx.lineCap = "round";
    for (const k of [-0.65, -0.35, -0.05]) { ctx.beginPath(); ctx.moveTo(k, -bh * 0.97); ctx.quadraticCurveTo(k + 0.1, -bh * 0.72, k - 0.02, -bh * 0.5); ctx.stroke(); }
    ellipse(ctx, 0.5, -0.07, 0.27, 0.1, furL); ellipse(ctx, 0.05, -0.06, 0.25, 0.09, furL);
    // голова
    const hx = 0.74 + pounce * 0.15, hy = -bh * 0.6 - lift * 0.45 - pounce * 0.08;
    const earTw = warn ? Math.sin(t * 26) * 0.07 : 0;
    ctx.fillStyle = fur;
    for (const [ex, tw] of [[-0.24, 0], [0.22, earTw]]) {
      ctx.beginPath(); ctx.moveTo(hx + ex - 0.17, hy - 0.22); ctx.lineTo(hx + ex + tw + 0.02, hy - 0.66); ctx.lineTo(hx + ex + 0.17, hy - 0.2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#e9a1ad";
      ctx.beginPath(); ctx.moveTo(hx + ex - 0.08, hy - 0.26); ctx.lineTo(hx + ex + tw + 0.02, hy - 0.52); ctx.lineTo(hx + ex + 0.09, hy - 0.25); ctx.closePath(); ctx.fill();
      ctx.fillStyle = fur;
    }
    ellipse(ctx, hx, hy, 0.5, 0.4, fur);
    ellipse(ctx, hx + 0.1, hy + 0.17, 0.27, 0.17, chest);
    // глаза
    const ex1 = hx - 0.08, ex2 = hx + 0.26, ey = hy - 0.04;
    ctx.lineCap = "round";
    if (sleeping) {
      ctx.strokeStyle = "#3a3240"; ctx.lineWidth = 0.04;
      for (const ex of [ex1, ex2]) { ctx.beginPath(); ctx.arc(ex, ey - 0.04, 0.08, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke(); }
    } else {
      const open = awake ? 1 : 0.35;
      for (const [k, ex] of [[0, ex1], [1, ex2]]) {
        const o = warn && k === 0 ? 0.08 : open;
        ellipse(ctx, ex, ey, 0.1, 0.1 * o + 0.01, "#ffd84a");
        ellipse(ctx, ex + 0.02, ey, 0.025, 0.08 * o + 0.005, "#231c22");
      }
    }
    // нос и усы
    ctx.fillStyle = "#e88a9a"; ctx.beginPath(); ctx.moveTo(hx + 0.26, hy + 0.1); ctx.lineTo(hx + 0.36, hy + 0.1); ctx.lineTo(hx + 0.31, hy + 0.16); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = 0.018;
    for (const k of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(hx + 0.35, hy + 0.17 + k * 0.03); ctx.lineTo(hx + 0.78, hy + 0.12 + k * 0.08); ctx.stroke(); }
    ctx.restore();
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
    const sunk = p.latch || p.timer ? p.down || p.pressed : p.down;
    const dy = sunk ? 0.08 : 0;
    ctx.fillStyle = "rgba(0,0,0,0.25)"; rrect(ctx, p.x + 0.06, p.y + 0.9, 0.88, 0.1, 0.03); ctx.fill();
    if (p.latch) {
      ctx.fillStyle = p.down ? "#8a2b2b" : "#e23b3b";
      ctx.beginPath(); ctx.ellipse(p.x + 0.5, p.y + 0.88 + dy * 0.5, 0.32, 0.2 - dy, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = col; ctx.fillRect(p.x + 0.12, p.y + 0.86, 0.76, 0.06);
      if (p.down) S.text(ctx, "✓", p.x + 0.5, p.y + 0.77, 0.22, 900, "#ffffff");
    } else {
      ctx.fillStyle = sunk ? S.lighten(col, -0.25) : col;
      rrect(ctx, p.x + 0.12, p.y + 0.78 + dy, 0.76, 0.14, 0.05); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.45)"; ctx.fillRect(p.x + 0.2, p.y + 0.8 + dy, 0.5, 0.03);
      if (p.heavy) { // гирька
        ellipse(ctx, p.x + 0.5, p.y + 0.66 + dy, 0.13, 0.11, "#4a4f58");
        ctx.strokeStyle = "#4a4f58"; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.arc(p.x + 0.5, p.y + 0.55 + dy, 0.06, Math.PI, 0); ctx.stroke();
      }
      if (p.timer) { // часики: стрелка бежит, пока время идёт
        const cx = p.x + 0.5, cy = p.y + 0.55 + dy;
        ellipse(ctx, cx, cy, 0.2, 0.2, "#fffaf0");
        ctx.strokeStyle = S.lighten(col, -0.3); ctx.lineWidth = 0.035; ctx.beginPath(); ctx.arc(cx, cy, 0.2, 0, TAU); ctx.stroke();
        const left = p.down && !p.pressed ? p.left / p.timer : p.down ? 1 : 0;
        if (left > 0) {
          ctx.fillStyle = col; ctx.globalAlpha = 0.8;
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 0.17, -Math.PI / 2, -Math.PI / 2 + TAU * left); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1;
        }
        const a = -Math.PI / 2 + (p.down && !p.pressed ? TAU * (1 - left) * p.timer : 0);
        ctx.strokeStyle = "#3a2a20"; ctx.lineWidth = 0.03; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * 0.14, cy + Math.sin(a) * 0.14); ctx.stroke();
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

  // люк в полу: створки откидываются вниз
  S.trapTile = function (ctx, x, y, ch, open, isLeft, isRight) {
    const col = HE.CHANNEL_COLORS[ch];
    ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(x, y, 1, 0.25);
    const len = 1 - open * 0.92;
    ctx.fillStyle = col;
    rrect(ctx, x + (isLeft ? 0.04 : 0), y, len, 0.2, 0.04); ctx.fill();
    ctx.fillStyle = S.lighten(col, -0.25);
    for (let k = 0; k < 3; k++) ctx.fillRect(x + 0.12 + k * 0.3, y + 0.04, 0.05 * len, 0.12);
    if (isLeft) { ctx.fillStyle = "#5c6470"; ctx.fillRect(x, y - 0.04, 0.08, 0.28); }
    if (isRight) { ctx.fillStyle = "#5c6470"; ctx.fillRect(x + 0.92, y - 0.04, 0.08, 0.28); }
  };

  S.plank = function (ctx, x, y, damage, t) {
    const shake = damage > 0 ? Math.sin(t * 60) * 0.03 * damage : 0;
    ctx.save(); ctx.translate(shake, 0);
    ctx.fillStyle = "#b07a45"; rrect(ctx, x + 0.02, y, 0.96, 0.42, 0.06); ctx.fill();
    ctx.fillStyle = "#c99560"; ctx.fillRect(x + 0.06, y + 0.06, 0.88, 0.08);
    ctx.strokeStyle = "#6f4523"; ctx.lineWidth = 0.035; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x + 0.35, y); ctx.lineTo(x + 0.45, y + 0.18); ctx.lineTo(x + 0.38, y + 0.28); ctx.lineTo(x + 0.5, y + 0.42); ctx.stroke();
    ellipse(ctx, x + 0.12, y + 0.24, 0.035, 0.035, "#7d5230"); ellipse(ctx, x + 0.88, y + 0.24, 0.035, 0.035, "#7d5230");
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

  // вентилятор: корпус с решёткой (статичный слой) и крутящиеся лопасти (каждый кадр)
  S.fanBox = function (ctx, x, y) {
    ctx.fillStyle = "#6f7784"; rrect(ctx, x + 0.02, y + 0.12, 0.96, 0.88, 0.1); ctx.fill();
    ctx.fillStyle = "#8f98a6"; rrect(ctx, x + 0.08, y + 0.18, 0.84, 0.74, 0.07); ctx.fill();
    ctx.strokeStyle = "#5a616c"; ctx.lineWidth = 0.05;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + 0.2 + k * 0.2, y + 0.24); ctx.lineTo(x + 0.2 + k * 0.2, y + 0.86); ctx.stroke(); }
  };
  S.fanBlades = function (ctx, f) {
    const x = f.x + 0.5, y = f.y + 0.1;
    for (let k = 0; k < 3; k++) {
      const a = f.spin + (k * TAU) / 3, wdt = Math.cos(a) * 0.42;
      ctx.fillStyle = Math.sin(a) > 0 ? "#dfe6ee" : "#b8c2ce";
      ctx.beginPath(); ctx.ellipse(x + wdt / 2, y, Math.abs(wdt) / 2 + 0.02, 0.06, 0, 0, TAU); ctx.fill();
    }
    ellipse(ctx, x, y, 0.08, 0.07, f.on ? (f.ch ? HE.CHANNEL_COLORS[f.ch] : "#ff8a3d") : "#555b66");
  };

  // конвейер: лента с ползущими шевронами и лампочка своего канала
  S.belt = function (ctx, b, t) {
    const x = b.x0, y = b.y, w = b.w;
    ctx.fillStyle = "#3d424c"; rrect(ctx, x, y, w, 1, 0.22); ctx.fill();
    ctx.fillStyle = "#555c68"; rrect(ctx, x + 0.04, y + 0.04, w - 0.08, 0.3, 0.12); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.rect(x + 0.1, y + 0.04, w - 0.2, 0.3); ctx.clip();
    const dir = b.cur || b.dir, ph = ((b.phase % 0.5) + 0.5) % 0.5;
    ctx.strokeStyle = b.cur ? "#ffd34d" : "#8a8f99"; ctx.lineWidth = 0.06; ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let k = -1; k < w * 2 + 1; k++) {
      const cx = x + k * 0.5 + ph;
      ctx.beginPath(); ctx.moveTo(cx - dir * 0.08, y + 0.1); ctx.lineTo(cx + dir * 0.06, y + 0.19); ctx.lineTo(cx - dir * 0.08, y + 0.28); ctx.stroke();
    }
    ctx.restore();
    // ролики
    for (let k = 0; k <= w; k++) {
      const rx = x + Math.min(w - 0.25, Math.max(0.25, k));
      ellipse(ctx, rx, y + 0.62, 0.17, 0.17, "#2a2e36");
      ctx.save(); ctx.translate(rx, y + 0.62); ctx.rotate(b.phase * 4);
      ctx.strokeStyle = "#7b828f"; ctx.lineWidth = 0.04; ctx.beginPath(); ctx.moveTo(-0.12, 0); ctx.lineTo(0.12, 0); ctx.stroke();
      ctx.restore();
    }
    if (b.ch) ellipse(ctx, x + 0.16, y + 0.86, 0.07, 0.07, b.cur !== b.dir || (b.run && b.cur) ? HE.CHANNEL_COLORS[b.ch] : S.lighten(HE.CHANNEL_COLORS[b.ch], -0.5));
  };

  // конец хомячьей трубы: цветное кольцо-вход, торчащее из пола
  S.tube = function (ctx, T, t, blocked) {
    const col = HE.TUBE_COLORS[T.pair] || HE.TUBE_COLORS[0];
    const x = T.x + 0.5, by = T.y + 1, pulse = 1 + T.anim * 0.18;
    ctx.save(); ctx.translate(x, by - 0.5); ctx.scale(pulse, pulse);
    ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(-0.22, -1.6, 0.44, 1.2);   // труба уходит вверх, за сцену
    ctx.fillStyle = col; ctx.globalAlpha = 0.45; ctx.fillRect(-0.24, -1.6, 0.06, 1.2); ctx.fillRect(0.18, -1.6, 0.06, 1.2); ctx.globalAlpha = 1;
    ellipse(ctx, 0, 0, 0.46, 0.5, col);
    ellipse(ctx, 0, 0.02, 0.33, 0.38, "#1d1820");
    ellipse(ctx, -0.12, -0.2, 0.1, 0.06, "rgba(255,255,255,0.55)");
    ctx.restore();
    if (T.anim > 0) { ctx.globalAlpha = T.anim; ellipse(ctx, x, by - 0.5, 0.7 * (1 + (1 - T.anim)), 0.7 * (1 + (1 - T.anim)), "rgba(255,255,255,0.25)"); ctx.globalAlpha = 1; }
  };

  // куст: кто внутри — того коту не видно
  S.bush = function (ctx, x, y, t, night) {
    const sw = Math.sin(t * 1.4 + x) * 0.04;
    const c1 = night ? "#2f6b3a" : "#4e9f45", c2 = night ? "#3d8248" : "#64b85a", c3 = night ? "#4f9a57" : "#7fcf6b";
    for (const [dx, dy, r, c] of [[0.15, 0.75, 0.38, c1], [0.85, 0.75, 0.38, c1], [0.5, 0.45, 0.44, c2], [0.2, 0.35, 0.3, c2], [0.8, 0.38, 0.32, c2], [0.5, 0.15, 0.28, c3], [0.35, 0.6, 0.26, c3]])
      ellipse(ctx, x + dx + sw * (1 - dy), y + dy, r, r, c);
    if (!night) for (const [dx, dy] of [[0.3, 0.3], [0.7, 0.55]]) ellipse(ctx, x + dx + sw, y + dy, 0.05, 0.05, "#ff9bc2");
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
