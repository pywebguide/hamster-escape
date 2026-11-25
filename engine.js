// Движок «Хомячьего побега»: физика, предметы, кнопки, двери, лифты,
// вентиляторы, трубы, конвейеры, кнопки с таймером и кот Граф.
// Все размеры — в клетках (1 = одна клетка карты), время — в секундах.
(function () {
  const HE = window.HE;
  const EPS = 1e-4;
  const G = 60;                 // гравитация
  const MAXFALL = 24;
  const CLIMB = 4.5;            // скорость лазанья Коготка
  const SPRING_V = Math.sqrt(2 * G * 6);   // пружина подбрасывает на ~6 клеток
  const LIFT_SPEED = 3;
  const FAN_V = 7;              // скорость подъёма в потоке вентилятора
  const FAN_RANGE = 8;          // высота потока, клеток
  const BELT_V = 2.6;           // скорость конвейера
  const CAT_FOV = 0.4;          // половина угла зрения кота, радианы
  const CAT_TILT = 0.12;        // кот смотрит чуть вниз
  const jumpV = h => Math.sqrt(2 * G * h);

  HE.HAMSTERS = [
    { name: "Пончик", w: 1.4, h: 1.3, speed: 4.5, jump: jumpV(1.35), heavy: true, push: true,
      fur: "#e9a23b", belly: "#fde6b8", dark: "#a8641a",
      desc: "Тяжёлый и сильный: двигает коробки, давит тяжёлые кнопки, ломает доски." },
    { name: "Коготок", w: 0.9, h: 1.15, speed: 5.8, jump: jumpV(2.3), climb: true,
      fur: "#8d5a36", belly: "#ecc89d", dark: "#55331d",
      desc: "Лазает по любым стенам." },
    { name: "Шустрик", w: 0.7, h: 0.7, speed: 6.5, jump: jumpV(3.4),
      fur: "#f1ece4", belly: "#ffffff", dark: "#a99c8e",
      desc: "Прыгает выше всех и пролезает в узкие трубы." },
  ];
  HE.CAT_FOV = CAT_FOV; HE.CAT_TILT = CAT_TILT;

  // ───────── загрузка уровня ─────────
  HE.newGame = function (index) {
    const L = HE.LEVELS[index];
    const rows = L.map.length, cols = L.map[0].length;
    const g = {
      index, def: L, rows, cols, tiles: [], doorCh: [], plates: [], doors: {}, springs: [],
      tacks: [], seeds: [], crates: [], hams: [], lifts: [], particles: [], floaters: [], events: [],
      fans: [], tubes: [], belts: [], beltAt: {}, cats: [],
      plankT: {}, open: {}, doorAnim: {}, active: {}, exit: null,
      time: 0, state: "play", stateT: 0, seedsTaken: [false, false, false], caught: null,
    };
    const ex = { x0: 1e9, y0: 1e9, x1: -1, y1: -1 };
    let seedN = 0;
    for (let y = 0; y < rows; y++) {
      g.tiles.push([]); g.doorCh.push([]);
      for (let x = 0; x < cols; x++) {
        const c = L.map[y][x];
        let t = ".";
        if ("#~-%<>".includes(c)) t = c;
        else if (c === "^") g.tacks.push({ x, y });
        else if (c === "T") g.springs.push({ x, y, anim: 0 });
        else if (c === "k") g.crates.push(makeCrate(x, y));
        else if (c === "*") g.seeds.push({ x, y, i: seedN++, taken: false });
        else if (c === "1" || c === "2" || c === "3") g.hams[+c - 1] = makeHam(+c - 1, x, y);
        else if (c === "E") { ex.x0 = Math.min(ex.x0, x); ex.y0 = Math.min(ex.y0, y); ex.x1 = Math.max(ex.x1, x + 1); ex.y1 = Math.max(ex.y1, y + 1); }
        else if (c === "F") {
          t = "F";
          const cfg = (L.fans || [])[g.fans.length] || {};
          g.fans.push({ x, y, ch: cfg.ch || null, inv: !!cfg.inv, range: cfg.range || FAN_RANGE, on: true, top: y, spin: x * 1.7 });
        }
        else if (c === "o" || c === "p" || c === "q") g.tubes.push({ x, y, key: c, anim: 0, to: null, pair: "opq".indexOf(c) });
        else if (c === "@") g.cats.push(makeCat(x, y, (L.cats || [])[g.cats.length] || {}));
        else if (c >= "a" && c <= "d") {
          g.plates.push({ x, y, ch: c, heavy: (L.heavy || "").includes(c), latch: (L.latch || "").includes(c),
            timer: (L.timer || {})[c] || 0, left: 0, pressed: false, down: false, latched: false });
        }
        else if (c >= "A" && c <= "D") {
          const ch = c.toLowerCase(); t = "D"; g.doorCh[y][x] = ch;
          (g.doors[ch] = g.doors[ch] || []).push({ x, y }); g.open[ch] = false; g.doorAnim[ch] = 0;
        }
        g.tiles[y].push(t);
      }
    }
    g.exit = ex;
    // трубы соединяются парами: две «o» друг с другом, две «p», две «q»
    for (const key of "opq") {
      const two = g.tubes.filter(t => t.key === key);
      if (two.length === 2) { two[0].to = two[1]; two[1].to = two[0]; }
    }
    // лифты: отрезки из «=» по порядку (сверху вниз, слева направо)
    let li = 0, bi = 0;
    L.map.forEach((row, y) => {
      for (let x = 0; x < cols; x++) {
        const c = row[x];
        if (c === "=" && !(x > 0 && row[x - 1] === "=")) {
          let w = 0; while (row[x + w] === "=") w++;
          const cfg = (L.lifts || [])[li++] || { ch: "a", dx: 0, dy: -3 };
          g.lifts.push({ kind: "lift", x0: x, y0: y, x, y, w, h: 0.5, t: 0, ch: cfg.ch, dx: cfg.dx || 0, dy: cfg.dy || 0, mdx: 0, mdy: 0 });
        }
        // конвейеры: отрезки из «<» или «>»; belts задаёт канал, который их разворачивает (или включает, если run)
        if ((c === "<" || c === ">") && !(x > 0 && row[x - 1] === c)) {
          let w = 0; while (row[x + w] === c) w++;
          const cfg = (L.belts || [])[bi++] || {};
          const b = { x0: x, y, w, dir: c === ">" ? 1 : -1, ch: cfg.ch || null, run: !!cfg.run, cur: 0, phase: 0 };
          g.belts.push(b);
          for (let k = 0; k < w; k++) g.beltAt[y * 1000 + x + k] = b;
        }
      }
    });
    return g;
  };

  function makeHam(i, tx, ty) {
    const d = HE.HAMSTERS[i];
    return { kind: "ham", i, def: d, w: d.w, h: d.h, x: tx + 0.5 - d.w / 2, y: ty + 1 - d.h, vx: 0, vy: 0,
      onGround: true, standOn: null, face: 1, coyote: 0, jumpBuf: 0, jumping: false, climbing: false,
      pushing: false, dead: false, atExit: false, squash: 0, walk: 0, blink: 1 + Math.random() * 3, mdx: 0, mdy: 0,
      idle: 0, cheek: 0, inWind: false, tubeLock: null, tubeWarn: -9 };
  }
  function makeCrate(tx, ty) {
    return { kind: "crate", x: tx, y: ty, w: 1, h: 1, vx: 0, vy: 0, onGround: true, standOn: null, mdx: 0, mdy: 0 };
  }
  // кот Граф: спит, ворочается (предупреждение), просыпается и смотрит в свою сторону
  function makeCat(tx, ty, cfg) {
    const face = cfg.face || -1;
    return { x: tx + 0.5, y: ty + 1, w: 2.4, h: 1.5, face, look: face,
      sleep: cfg.sleep ?? 3.2, warn: cfg.warn ?? 1, awake: cfg.awake ?? 2.4, off: cfg.off || 0,
      range: cfg.range || 11, turn: !!cfg.turn, phase: "sleep", pt: 0, pounce: 0 };
  }

  // ───────── геометрия ─────────
  const hOverlap = (a, b) => a.x < b.x + b.w - EPS && a.x + a.w > b.x + EPS;
  const vOverlap = (a, b, m) => a.y < b.y + b.h - m && a.y + a.h > b.y + m;
  const rectHit = (e, x0, y0, x1, y1) => e.x < x1 && e.x + e.w > x0 && e.y < y1 && e.y + e.h > y0;
  const approach = (v, t, s) => (v < t ? Math.min(v + s, t) : Math.max(v - s, t));

  function tileSolid(g, tx, ty) {
    if (tx < 0 || tx >= g.cols || ty < 0) return true;
    if (ty >= g.rows) return false;
    const t = g.tiles[ty][tx];
    if (t === "#" || t === "~" || t === "F" || t === "<" || t === ">") return true;
    if (t === "D") return !g.open[g.doorCh[ty][tx]];
    return false;
  }
  const tileOneWay = (g, tx, ty) => ty >= 0 && ty < g.rows && tx >= 0 && tx < g.cols && g.tiles[ty][tx] === "-";
  HE.tileSolid = tileSolid;

  // ───────── движение по горизонтали ─────────
  // opts.pusher — кто толкает (только он может двигать коробки), opts.carry — перенос на лифте/носителе
  function moveX(g, e, dx, opts) {
    if (!dx) return 0;
    const start = e.x;
    e.x += dx;
    const r0 = Math.floor(e.y + EPS), r1 = Math.floor(e.y + e.h - EPS);
    const col = dx > 0 ? Math.floor(e.x + e.w - EPS) : Math.floor(e.x + EPS);
    for (let r = r0; r <= r1; r++) {
      if (tileSolid(g, col, r)) { e.x = dx > 0 ? col - e.w : col + 1; break; }
    }
    for (const c of g.crates) {
      if (c === e || !vOverlap(e, c, 0.05) || !hOverlap(e, c)) continue;
      const canPush = opts.depth < 4 && (e.kind === "crate" || (opts.pusher === e && e.def.push && e.onGround));
      if (canPush) moveX(g, c, dx > 0 ? e.x + e.w - c.x : e.x - (c.x + c.w), { pusher: opts.pusher, depth: (opts.depth || 0) + 1 });
      if (opts.pusher === e) e.pushing = true;
      if (dx > 0) e.x = Math.min(e.x, c.x - e.w); else e.x = Math.max(e.x, c.x + c.w);
    }
    if (e.kind === "crate" && !opts.carry) {   // коробка упирается в других хомяков
      for (const h of g.hams) {
        if (h.dead || h === opts.pusher || !vOverlap(e, h, 0.05) || !hOverlap(e, h)) continue;
        if (dx > 0) e.x = Math.min(e.x, h.x - e.w); else e.x = Math.max(e.x, h.x + h.w);
      }
    }
    if (dx > 0 ? e.x < start : e.x > start) e.x = start;
    return e.x - start;
  }

  // ───────── движение по вертикали ─────────
  function moveY(g, e, dy) {
    if (!dy) return { landed: false };
    const prevTop = e.y, prevBot = e.y + e.h;
    e.y += dy;
    const c0 = Math.floor(e.x + EPS), c1 = Math.floor(e.x + e.w - EPS);
    if (dy > 0) {
      const bot = e.y + e.h;
      let best = Infinity, on = null;
      for (let r = Math.floor(prevBot - EPS); r <= Math.floor(bot - EPS) && best === Infinity; r++) {
        for (let c = c0; c <= c1; c++) {
          if (tileSolid(g, c, r) || (tileOneWay(g, c, r) && prevBot <= r + 0.02)) best = Math.min(best, r);
        }
      }
      const tops = [];
      for (const o of g.hams) if (!o.dead && o !== e) tops.push(o);
      for (const o of g.crates) if (o !== e) tops.push(o);
      for (const o of g.lifts) tops.push(o);
      for (const o of tops) {
        if (!hOverlap(e, o) || o.standOn === e) continue;
        if (prevBot <= o.y + 0.02 && bot >= o.y && o.y < best) { best = o.y; on = o; }
      }
      if (best < Infinity) { e.y = best - e.h; return { landed: true, on }; }
      return { landed: false };
    }
    let hit = false;
    const r = Math.floor(e.y + EPS);
    // задели потолок самым краешком — хомяка чуть сдвигает, и он проскальзывает мимо угла
    if (e.kind === "ham" && c1 > c0) {
      const lb = tileSolid(g, c0, r), rb = tileSolid(g, c1, r);
      let mid = false;
      for (let c = c0 + 1; c < c1; c++) if (tileSolid(g, c, r)) mid = true;
      if (!mid && lb !== rb) {
        const over = lb ? c0 + 1 - e.x : e.x + e.w - c1;
        const nx = lb ? c0 + 1 + EPS : c1 - e.w - EPS;
        if (over < 0.35 && !rectSolid(g, nx, e.y, e.w, e.h)) e.x = nx;
      }
    }
    for (let c = Math.floor(e.x + EPS); c <= Math.floor(e.x + e.w - EPS); c++) if (tileSolid(g, c, r)) { e.y = r + 1; hit = true; }
    for (const o of g.crates) {
      if (o !== e && hOverlap(e, o) && prevTop >= o.y + o.h - 0.02 && e.y < o.y + o.h) { e.y = o.y + o.h; hit = true; }
    }
    return { landed: false, hitHead: hit };
  }

  function rectSolid(g, x, y, w, h) {
    for (let r = Math.floor(y + EPS); r <= Math.floor(y + h - EPS); r++)
      for (let c = Math.floor(x + EPS); c <= Math.floor(x + w - EPS); c++) if (tileSolid(g, c, r)) return true;
    return false;
  }

  function touchingWall(g, e, dir) {
    const px = dir > 0 ? e.x + e.w + 0.03 : e.x - 0.03;
    const col = Math.floor(px);
    for (let r = Math.floor(e.y + EPS); r <= Math.floor(e.y + e.h - EPS); r++) if (tileSolid(g, col, r)) return true;
    for (const c of g.crates) if (px > c.x && px < c.x + c.w && vOverlap(e, c, 0.05)) return true;
    return false;
  }

  // поток вентилятора над предметом: верхняя граница потока или null
  function windTop(g, e) {
    for (const f of g.fans) {
      if (!f.on || e.x + e.w <= f.x + 0.12 || e.x >= f.x + 0.88) continue;
      if (e.y + e.h <= f.top || e.y >= f.y) continue;
      return f.top;
    }
    return null;
  }

  // конвейер под ногами
  function beltUnder(g, e) {
    const r = Math.round(e.y + e.h);
    if (Math.abs(e.y + e.h - r) > 0.03) return null;
    const at = c => g.beltAt[r * 1000 + c];
    return at(Math.floor(e.x + e.w / 2)) || at(Math.floor(e.x + EPS)) || at(Math.floor(e.x + e.w - EPS)) || null;
  }

  // ───────── хомяк ─────────
  function updateHam(g, e, inp, dt) {
    const d = e.def;
    const target = inp.dir * d.speed * (e.pushing ? 0.55 : 1);
    e.vx = approach(e.vx, target, (e.onGround ? 70 : 42) * dt);
    if (inp.dir) e.face = inp.dir;

    e.climbing = !!d.climb && inp.dir !== 0 && touchingWall(g, e, inp.dir);
    e.jumpBuf = inp.jumpPressed ? 0.13 : e.jumpBuf - dt;
    e.coyote = e.onGround ? 0.09 : e.coyote - dt;
    e.inWind = false;

    if (e.jumpBuf > 0 && (e.coyote > 0 || e.climbing)) {
      e.vy = -d.jump; e.jumping = true; e.jumpBuf = 0; e.coyote = 0;
      e.onGround = false; e.standOn = null; e.squash = -0.22;
      g.events.push("jump" + e.i);
      dust(g, e.x + e.w / 2, e.y + e.h, 3);
    } else if (e.climbing) {
      e.vy = -CLIMB;
    } else {
      const top = windTop(g, e);
      if (top == null) e.vy = Math.min(e.vy + G * dt, MAXFALL);
      else if (d.heavy) e.vy = e.vy < 0 ? e.vy + G * dt : Math.min(e.vy + G * 0.3 * dt, 3);  // Пончика не поднять: он лишь плавно опускается
      else {   // лёгких поднимает к верхнему краю потока, там они покачиваются
        const depth = e.y + e.h - top;
        e.vy = approach(e.vy, -FAN_V * Math.max(-0.5, Math.min(1, (depth - 0.6) / 1.4)), 48 * dt);
        e.inWind = true;
      }
    }
    if (e.jumping && !inp.jumpHeld && e.vy < -d.jump * 0.45) e.vy = -d.jump * 0.45;
    if (e.vy >= 0) e.jumping = false;

    e.pushing = false;
    const want = e.vx * dt;
    const got = moveX(g, e, want, { pusher: e, depth: 0 });
    if (Math.abs(got) < Math.abs(want) - 1e-6 && !e.pushing) e.vx = 0;

    const wasGround = e.onGround, fallV = e.vy;
    const res = moveY(g, e, e.vy * dt);
    if (res.landed) {
      if (!wasGround && fallV > 7) {
        e.squash = Math.min(0.35, fallV / 45); g.events.push("land");
        dust(g, e.x + e.w / 2, e.y + e.h, 3 + Math.min(6, fallV / 4));
      }
      e.vy = 0; e.onGround = true; e.standOn = res.on;
    } else {
      e.onGround = false; e.standOn = null;
      if (res.hitHead && e.vy < 0) e.vy = 0;
    }
    e.walk += Math.abs(e.vx) * dt * (e.climbing ? 0 : 1);
    e.squash = approach(e.squash, 0, dt * 2.2);
    e.blink -= dt; if (e.blink < -0.12) e.blink = 2 + Math.random() * 3;
    // стоит без дела — сначала оглядывается, потом засыпает
    const still = !inp.dir && !inp.jumpHeld && e.onGround && Math.abs(e.vx) < 0.2;
    e.idle = still ? e.idle + dt : 0;
    if (e.cheek > 0) e.cheek = Math.max(0, e.cheek - dt);
  }

  // коробка почти целиком над ямой в одну клетку съезжает в неё, а не висит на краешке
  function slipIntoHole(g, c) {
    if (!c.onGround || c.standOn) return;
    const r = Math.round(c.y + c.h), k = Math.floor(c.x), f = c.x - k;
    const open = col => !tileSolid(g, col, r) && !tileOneWay(g, col, r);
    if (f > 0 && f < 0.06 && open(k) && !open(k + 1)) c.x = k;
    else if (f > 0.94 && open(k + 1) && !open(k)) c.x = k + 1;
  }

  function updateCrate(g, c, dt) {
    slipIntoHole(g, c);
    const top = windTop(g, c);
    c.vy = top == null || c.vy < 0 ? Math.min(c.vy + G * dt, MAXFALL) : Math.min(c.vy + G * 0.3 * dt, 3);
    const fallV = c.vy;
    const res = moveY(g, c, c.vy * dt);
    if (res.landed) {
      if (!c.onGround && fallV > 8) { g.events.push("thud"); dust(g, c.x + 0.5, c.y + 1, 5); }
      c.vy = 0; c.onGround = true; c.standOn = res.on;
    }
    else { c.onGround = false; c.standOn = null; if (res.hitHead) c.vy = Math.max(0, c.vy); }
  }

  // ───────── частицы и всплывающие надписи ─────────
  function burst(g, x, y, color, n, spd) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, s = (0.4 + Math.random()) * spd;
      g.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - spd * 0.5, life: 0.5 + Math.random() * 0.5, t: 0, color, size: 0.06 + Math.random() * 0.08, grav: 20, drag: 0 });
    }
  }
  // пыль из-под лапок: лёгкая, медленно всплывает и тает
  function dust(g, x, y, n) {
    for (let k = 0; k < n; k++) {
      const s = (Math.random() - 0.5) * 3;
      g.particles.push({ x: x + s * 0.12, y: y - 0.05, vx: s, vy: -0.4 - Math.random() * 0.8, life: 0.35 + Math.random() * 0.3, t: 0,
        color: "#fff4dc", size: 0.07 + Math.random() * 0.08, grav: -1, drag: 4, puff: true });
    }
  }
  function floater(g, x, y, text, color, size) {
    g.floaters.push({ x, y, text, color: color || "#ffffff", size: size || 0.42, t: 0, life: 1.2 });
  }
  HE.burst = burst; HE.dust = dust; HE.floater = floater;

  function kill(g, e) {
    if (e.dead || g.state !== "play") return;
    e.dead = true; g.state = "dead"; g.stateT = 0;
    burst(g, e.x + e.w / 2, e.y + e.h / 2, e.def.fur, 26, 7);
    g.events.push("die");
  }

  // ───────── кот ─────────
  const catEye = c => ({ x: c.x + c.look * 0.85, y: c.y - c.h + 0.45 });
  HE.catEye = catEye;
  function blockedAt(g, px, py) {
    if (tileSolid(g, Math.floor(px), Math.floor(py))) return true;
    for (const c of g.crates) if (px > c.x && px < c.x + c.w && py > c.y && py < c.y + c.h) return true;
    return false;
  }
  // луч взгляда: на каком расстоянии упирается в стену или коробку
  HE.castRay = function (g, x0, y0, ang, max) {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    for (let d = 0.15; d < max; d += 0.15) if (blockedAt(g, x0 + dx * d, y0 + dy * d)) return d;
    return max;
  };
  function catSees(g, c, h) {
    const E = catEye(c);
    const hx = h.x + h.w / 2, hy = h.y + h.h / 2;
    const dx = (hx - E.x) * c.look, dy = hy - E.y;
    if (dx <= 0 || Math.hypot(dx, dy) > c.range || Math.abs(Math.atan2(dy, dx) - CAT_TILT) > CAT_FOV) return false;
    const row = g.tiles[Math.floor(hy)];
    if (row && row[Math.floor(hx)] === "%") return false;      // в кустах не видно
    const n = Math.ceil(Math.hypot(hx - E.x, hy - E.y) / 0.15);
    for (let k = 1; k < n; k++) if (blockedAt(g, E.x + (hx - E.x) * k / n, E.y + (hy - E.y) * k / n)) return false;
    return true;
  }
  HE.catSees = catSees;
  function caught(g, h, c) {
    if (g.state !== "play") return;
    g.state = "dead"; g.stateT = 0; g.caught = { i: h.i, cat: c };
    c.phase = "awake"; c.pounce = 0.001;
    c.look = h.x + h.w / 2 > c.x ? 1 : -1;
    floater(g, h.x + h.w / 2, h.y - 0.35, "!", "#ff5a4a", 0.9);
    g.events.push("caught");
  }

  // ───────── один шаг мира ─────────
  // inp: { active, dir, jumpPressed, jumpHeld }
  HE.step = function (g, inp, dt) {
    g.stateT += dt;
    for (const p of g.particles) {
      p.t += dt; p.vy += p.grav * dt;
      if (p.drag) { const k = Math.exp(-p.drag * dt); p.vx *= k; p.vy *= k; }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    g.particles = g.particles.filter(p => p.t < p.life);
    for (const f of g.floaters) f.t += dt;
    g.floaters = g.floaters.filter(f => f.t < f.life);
    for (const s of g.springs) s.anim = Math.max(0, s.anim - dt * 3);
    for (const T of g.tubes) T.anim = Math.max(0, T.anim - dt * 2.5);
    for (const c of g.cats) if (c.pounce) c.pounce = Math.min(1, c.pounce + dt * 4);
    for (const f of g.fans) f.spin += dt * (f.on ? 16 : 0);
    if (g.state !== "play") return;
    g.time += dt;

    // кнопки и каналы
    const movers = g.hams.filter(h => !h.dead).concat(g.crates);
    for (const p of g.plates) {
      let down = false;
      for (const e of movers) {
        if (p.heavy && !(e.kind === "crate" || e.def.heavy)) continue;
        if (rectHit(e, p.x + 0.08, p.y + 0.7, p.x + 0.92, p.y + 1.02)) { down = true; break; }
      }
      p.pressed = down;
      if (p.latch) {
        if (down && !p.latched) { p.latched = true; g.events.push("latch"); }
        p.down = p.latched;
      } else if (p.timer) {   // кнопка с часиками: держится ещё timer секунд после того, как с неё сошли
        if (down) { if (!p.down) g.events.push("press"); p.down = true; p.left = p.timer; }
        else if (p.down) {
          const before = Math.ceil(p.left);
          p.left -= dt;
          if (p.left <= 0) { p.left = 0; p.down = false; g.events.push("release"); }
          else if (Math.ceil(p.left) < before) g.events.push("tick");
        }
      } else {
        if (down !== p.down) g.events.push(down ? "press" : "release");
        p.down = down;
      }
    }
    const chans = new Set(g.plates.map(p => p.ch));
    for (const ch of chans) g.active[ch] = g.plates.some(p => p.ch === ch && p.down);

    // двери: не закрываются, пока в проёме кто-то есть
    for (const ch in g.doors) {
      let want = !!g.active[ch];
      if (!want && g.open[ch]) {
        for (const t of g.doors[ch]) for (const e of movers) if (rectHit(e, t.x, t.y, t.x + 1, t.y + 1)) want = true;
      }
      if (want !== g.open[ch]) { g.open[ch] = want; g.events.push(want ? "dooropen" : "doorclose"); }
      g.doorAnim[ch] = approach(g.doorAnim[ch], g.open[ch] ? 1 : 0, dt * 6);
    }

    // лифты
    for (const L of g.lifts) {
      const dist = Math.hypot(L.dx, L.dy) || 1;
      const nt = approach(L.t, g.active[L.ch] ? 1 : 0, (LIFT_SPEED * dt) / dist);
      const nx = L.x0 + L.dx * nt, ny = L.y0 + L.dy * nt;
      L.mdx = nx - L.x; L.mdy = ny - L.y; L.x = nx; L.y = ny; L.t = nt;
    }

    // вентиляторы: работают всегда или от своей кнопки; поток упирается в стены и закрытые двери
    for (const f of g.fans) {
      const was = f.on;
      f.on = f.ch ? !!g.active[f.ch] !== f.inv : true;
      if (f.on !== was) g.events.push(f.on ? "fanon" : "fanoff");
      let top = f.y;
      while (f.y - top < f.range && !tileSolid(g, f.x, top - 1)) top--;
      f.top = top;
    }
    // конвейеры
    for (const b of g.belts) {
      const on = b.ch ? !!g.active[b.ch] : false;
      b.cur = b.ch && b.run ? (on ? b.dir : 0) : (on ? -b.dir : b.dir);
      b.phase += b.cur * BELT_V * dt;
    }

    // хомяки и коробки: снизу вверх, чтобы пассажиры ехали за носителем
    const ents = movers.slice().sort((a, b) => (b.y + b.h) - (a.y + a.h));
    for (const e of ents) {
      const sx = e.x, sy = e.y;
      const o = e.standOn;
      if (o && (o.mdx || o.mdy)) {
        moveX(g, e, o.mdx, { carry: true, depth: 0 });
        const r = moveY(g, e, o.mdy);
        if (o.mdy > 0 && !r.landed) e.y = o.y - e.h;
      }
      if (e.onGround && !e.standOn) {
        const b = beltUnder(g, e);
        if (b && b.cur) moveX(g, e, b.cur * BELT_V * dt, { depth: 0 });
      }
      if (e.kind === "ham") {
        const me = e.i === inp.active;
        updateHam(g, e, me ? inp : { dir: 0, jumpPressed: false, jumpHeld: false }, dt);
      } else updateCrate(g, e, dt);
      e.mdx = e.x - sx; e.mdy = e.y - sy;
    }

    // пружины
    for (const s of g.springs) {
      for (const e of movers) {
        if (e.vy < 0) continue;
        const bot = e.y + e.h;
        if (e.x < s.x + 0.85 && e.x + e.w > s.x + 0.15 && bot > s.y + 0.35 && bot < s.y + 1.05) {
          e.vy = -SPRING_V; e.onGround = false; e.standOn = null; e.jumping = false;
          s.anim = 1; g.events.push("spring");
        }
      }
    }

    // доски ломаются под Пончиком и коробками
    for (const e of movers) {
      if (!(e.kind === "crate" || e.def.heavy) || !e.onGround || e.standOn) continue;
      const r = Math.round(e.y + e.h);
      if (r < 0 || r >= g.rows) continue;
      for (let c = Math.floor(e.x + EPS); c <= Math.floor(e.x + e.w - EPS); c++) {
        if (g.tiles[r][c] !== "~") continue;
        const k = r * 1000 + c;
        g.plankT[k] = (g.plankT[k] || 0) + dt;
        if (g.plankT[k] > 0.22) {
          g.tiles[r][c] = ".";
          burst(g, c + 0.5, r + 0.3, "#b98a55", 14, 4);
          g.events.push("crack");
        }
      }
    }

    // хомячьи трубы: Коготок и Шустрик пролезают, Пончик — нет
    for (const h of g.hams) {
      if (h.dead) continue;
      const lk = h.tubeLock;
      if (lk && !rectHit(h, lk.x, lk.y, lk.x + 1, lk.y + 1)) h.tubeLock = null;
      const cx = h.x + h.w / 2, by = h.y + h.h;
      for (const T of g.tubes) {
        if (!T.to || T === h.tubeLock) continue;
        if (cx < T.x + 0.15 || cx > T.x + 0.85 || by < T.y + 0.35 || by > T.y + 1.05) continue;
        if (h.def.heavy) {
          if (g.time - h.tubeWarn > 2.5) { h.tubeWarn = g.time; floater(g, T.x + 0.5, T.y - 0.5, "Не пролезу!", "#ffffff", 0.36); g.events.push("bonk"); }
          continue;
        }
        const D = T.to;
        burst(g, cx, by - h.h / 2, "#bfe9ff", 10, 4);
        h.x = D.x + 0.5 - h.w / 2; h.y = D.y + 1 - h.h; h.px = h.x; h.py = h.y;
        h.vy = 0; h.onGround = false; h.standOn = null; h.squash = 0.3; h.tubeLock = D; h.idle = 0;
        T.anim = D.anim = 1;
        burst(g, D.x + 0.5, D.y + 0.6, "#bfe9ff", 12, 5);
        g.events.push("tube");
        break;
      }
    }

    // опасности, семечки, норка
    let atExit = 0;
    for (const h of g.hams) {
      if (h.dead) continue;
      for (const t of g.tacks) if (rectHit(h, t.x + 0.12, t.y + 0.58, t.x + 0.88, t.y + 1)) kill(g, h);
      if (h.y > g.rows + 1) kill(g, h);
      for (const s of g.seeds) {
        if (!s.taken && rectHit(h, s.x + 0.15, s.y + 0.15, s.x + 0.85, s.y + 0.85)) {
          s.taken = true; g.seedsTaken[s.i] = true; h.cheek = 2.4;
          burst(g, s.x + 0.5, s.y + 0.5, "#f3c847", 12, 4);
          floater(g, s.x + 0.5, s.y + 0.1, "+1", "#ffd34d", 0.5);
          g.events.push("seed");
        }
      }
      const cx = h.x + h.w / 2, cy = h.y + h.h / 2, E = g.exit;
      h.atExit = cx > E.x0 && cx < E.x1 && cy > E.y0 - 1.8 && cy < E.y1;   // с запасом сверху: хомяки у норки встают друг на друга
      if (h.atExit) atExit++;
    }

    // кот: задел спящего — разбудил; проснулся и увидел — поймал
    for (const c of g.cats) {
      const cyc = c.sleep + c.warn + c.awake, tt = g.time + c.off, k = Math.floor(tt / cyc), ph = tt - k * cyc;
      const phase = ph < c.sleep ? "sleep" : ph < c.sleep + c.warn ? "warn" : "awake";
      c.look = c.turn && k % 2 ? -c.face : c.face;
      if (phase !== c.phase) { c.phase = phase; c.pt = 0; g.events.push(phase === "warn" ? "catstir" : phase === "awake" ? "catwake" : "catsleep"); }
      c.pt += dt;
      for (const h of g.hams) {
        if (h.dead || g.state !== "play") continue;
        if (rectHit(h, c.x - c.w / 2 + 0.25, c.y - c.h + 0.35, c.x + c.w / 2 - 0.25, c.y)) caught(g, h, c);
        else if (phase === "awake" && catSees(g, c, h)) caught(g, h, c);
      }
    }

    if (g.state === "play" && atExit === 3) { g.state = "win"; g.stateT = 0; g.events.push("win"); }
  };
})();
