// Меню, сохранение, звук, управление и игровой цикл.
(function () {
  const HE = window.HE, R = HE.Render;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const STEP = 1 / 120;
  const SAVE_KEY = "hamster-escape-v1";

  // ───────── сохранение ─────────
  const defaultSave = () => ({ v: 1, unlocked: 1, last: 0, levels: {}, owned: ["none"], hats: ["none", "none", "none"], sound: true, music: true });
  let save = (() => {
    try { const raw = localStorage.getItem(SAVE_KEY); if (raw) return Object.assign(defaultSave(), JSON.parse(raw)); } catch (e) { /* нет доступа к хранилищу */ }
    return defaultSave();
  })();
  const writeSave = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* игра работает и без сохранения */ } };
  const seedsTotal = () => Object.values(save.levels).reduce((n, l) => n + l.seeds.filter(Boolean).length, 0);
  const seedsSpent = () => save.owned.reduce((n, id) => n + (HE.HATS.find(h => h.id === id) || { price: 0 }).price, 0);
  const seedsFree = () => seedsTotal() - seedsSpent();
  const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  // ───────── звук (синтез, без файлов) ─────────
  const Snd = (() => {
    let ac = null, master = null, noiseBuf = null;
    // Браузер разрешает звук только после касания. Вызывается из любого касания и клавиши.
    function ensure() {
      if (!ac) {
        try {
          ac = new (window.AudioContext || window.webkitAudioContext)();
          master = ac.createGain(); master.gain.value = 0.55; master.connect(ac.destination);
          ac.onstatechange = () => updateAudioHint();
          HE.Music.attach(ac, master); HE.Music.setEnabled(save.music);
        } catch (e) { ac = null; }
      }
      // «suspended» после сворачивания и «interrupted» на iPhone после звонка или блокировки
      if (ac && ac.state !== "running" && ac.state !== "closed" && !document.hidden) ac.resume().catch(() => {});
    }
    // свернули вкладку — звук спит и не тратит батарею; вернулись — просыпается
    document.addEventListener("visibilitychange", () => {
      if (!ac) return;
      if (document.hidden) ac.suspend().catch(() => {}); else ac.resume().catch(() => {});
      updateAudioHint();
    });
    function tone(f, d, type, v, f2, delay) {
      if (!ac || !save.sound) return;
      const t0 = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
      o.type = type || "sine"; o.frequency.setValueAtTime(f, t0);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(v || 0.15, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + d + 0.03);
    }
    function noise(d, v, freq, delay) {
      if (!ac || !save.sound) return;
      if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate); const c = noiseBuf.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; }
      const t0 = ac.currentTime + (delay || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noiseBuf; f.type = "lowpass"; f.frequency.value = freq || 1200;
      g.gain.setValueAtTime(v || 0.2, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      s.connect(f); f.connect(g); g.connect(master); s.start(t0); s.stop(t0 + d + 0.02);
    }
    const fx = {
      jump0: () => tone(200, 0.17, "triangle", 0.2, 360), jump1: () => tone(320, 0.15, "triangle", 0.17, 560), jump2: () => tone(520, 0.13, "triangle", 0.14, 980),
      land: () => noise(0.07, 0.1, 500), thud: () => { noise(0.12, 0.25, 300); tone(90, 0.14, "sine", 0.22, 55); },
      press: () => tone(720, 0.06, "square", 0.05), release: () => tone(430, 0.06, "square", 0.04),
      latch: () => { tone(600, 0.08, "square", 0.06); tone(900, 0.14, "square", 0.06, null, 0.08); },
      dooropen: () => { noise(0.25, 0.1, 2200); tone(300, 0.25, "sine", 0.08, 620); }, doorclose: () => { noise(0.15, 0.1, 900); tone(260, 0.15, "sine", 0.08, 140); },
      seed: () => { tone(1046, 0.1, "triangle", 0.13); tone(1318, 0.1, "triangle", 0.13, null, 0.07); tone(1568, 0.18, "triangle", 0.13, null, 0.14); },
      spring: () => tone(170, 0.38, "sine", 0.24, 760),
      crack: () => { noise(0.2, 0.3, 1600); noise(0.12, 0.2, 700, 0.08); },
      die: () => { tone(620, 0.4, "square", 0.07, 110); noise(0.15, 0.2, 3000); },
      win: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.26, "triangle", 0.15, null, i * 0.12)); tone(1318, 0.55, "triangle", 0.13, null, 0.5); },
      switch: () => tone(880, 0.06, "sine", 0.09, 1250), click: () => tone(660, 0.05, "sine", 0.07),
      buy: () => { tone(784, 0.1, "triangle", 0.13); tone(1175, 0.22, "triangle", 0.13, null, 0.1); },
    };
    return { ensure, running: () => !!ac && ac.state === "running", play: n => { try { fx[n] && fx[n](); } catch (e) { /* звук не критичен */ } } };
  })();

  // плашка «коснись, чтобы включить музыку»: видна, только пока браузер держит звук на паузе
  let audioHintOn = null;
  function updateAudioHint() {
    const el = document.getElementById("audio-hint");
    if (!el) return;
    const want = save.music && !Snd.running() && screen !== "game";
    if (want !== audioHintOn) { audioHintOn = want; el.classList.toggle("on", want); }
  }
  // любое касание или клавиша будит звук (раньше — только кнопки)
  ["pointerdown", "touchend", "keydown"].forEach(tp =>
    addEventListener(tp, () => { Snd.ensure(); setTimeout(updateAudioHint, 60); }, { capture: true, passive: true }));
  const buzz = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* вибрация может быть запрещена */ } };

  // ───────── экраны ─────────
  let screen = "menu";
  function show(id) {
    screen = id;
    $$(".screen").forEach(s => s.classList.toggle("on", s.id === id));
    document.body.dataset.screen = id;
    if (id !== "game") HE.Music.play("menu");
    updateAudioHint();
    if (id === "menu") buildMenu();
    if (id === "levels") buildLevels();
    if (id === "wardrobe") buildWardrobe();
  }
  function overlay(id) {
    $$(".overlay").forEach(s => s.classList.toggle("on", s.id === id));
    paused = !!id;
    HE.Music.dim(id === "pause");
  }

  // ───────── игра ─────────
  let g = null, active = 0, overview = false, paused = false, t = 0, acc = 0;
  let hintTimer = 0, finished = false;

  function startLevel(i, keepCam) {
    g = HE.newGame(i); active = 0; overview = false; finished = false; acc = 0;
    save.last = i; writeSave();
    if (!keepCam) R.snapCamera(g);
    show("game"); overlay(null);
    HE.Music.play(g.def.world);
    buildHud();
    if (!keepCam) showHint();
  }
  function showHint() { $("#hint-text").textContent = g.def.hint; $("#hint").classList.add("on"); hintTimer = 8; }
  function hideHint() { $("#hint").classList.remove("on"); hintTimer = 0; }
  function selectHam(i) {
    if (!g || i === active || g.hams[i].dead) return;
    active = i; Snd.play("switch"); updateHud();
  }

  function buildHud() {
    $("#lvl-name").textContent = `${g.index + 1}. ${g.def.name}`;
    $$(".ham-btn").forEach((b, i) => { R.portrait(b.querySelector("canvas"), i, save.hats[i], 0); b.title = HE.HAMSTERS[i].name; });
    updateHud();
  }
  let hudKey = "";
  function updateHud() {
    const k = active + "|" + g.hams.map(h => (h.atExit ? 1 : 0) + (h.dead ? 2 : 0)).join("") + "|" + g.seedsTaken.join("");
    if (k === hudKey) return; hudKey = k;
    $$(".ham-btn").forEach((b, i) => { b.classList.toggle("active", i === active); b.classList.toggle("home", g.hams[i].atExit); });
    $("#lvl-seeds").innerHTML = g.seedsTaken.map(s => `<i class="seed-dot${s ? " got" : ""}"></i>`).join("");
  }

  function finishLevel() {
    finished = true;
    const i = g.index, prev = save.levels[i] || { seeds: [false, false, false], best: null };
    const newSeeds = g.seedsTaken.filter((s, k) => s && !prev.seeds[k]).length;
    save.levels[i] = { seeds: prev.seeds.map((s, k) => s || g.seedsTaken[k]), best: prev.best == null ? g.time : Math.min(prev.best, g.time), done: true };
    save.unlocked = Math.min(HE.LEVELS.length, Math.max(save.unlocked, i + 2));
    save.last = Math.min(i + 1, HE.LEVELS.length - 1);
    writeSave();
    const last = i === HE.LEVELS.length - 1;
    $("#win-title").textContent = last ? "Свобода!" : "Норка найдена!";
    $("#win-sub").textContent = last ? "Все трое на воле. Пончик, Коготок и Шустрик благодарят тебя!" : g.def.name;
    $("#win-seeds").innerHTML = g.seedsTaken.map((s, k) => `<i class="big-seed${s ? " got" : ""}" style="animation-delay:${0.15 + k * 0.18}s"></i>`).join("");
    $("#win-time").textContent = `Время ${fmtTime(g.time)} · рекорд ${fmtTime(save.levels[i].best)}` + (newSeeds ? ` · +${newSeeds} в копилку` : "");
    $("#win-next").hidden = last;
    overlay("win");
  }

  // ───────── управление ─────────
  const keys = {};
  let touch = { left: false, right: false, jump: false }, jumpEdge = false;
  const isJumpKey = c => c === "Space" || c === "ArrowUp" || c === "KeyW";
  addEventListener("keydown", e => {
    Snd.ensure();
    if (screen !== "game") return;
    // после клика мышью по кнопке пробел не должен «нажимать» её снова
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.code)) e.preventDefault();
    if (e.code === "Escape" || e.code === "KeyP") { paused ? resume() : pause(); return; }
    if (paused) return;
    if (!e.repeat && isJumpKey(e.code)) jumpEdge = true;
    keys[e.code] = true;
    if (e.code === "Digit1" || e.code === "Digit2" || e.code === "Digit3") selectHam(+e.code.slice(5) - 1);
    if (e.code === "Tab" || e.code === "KeyQ") cycleHam();
    if (e.code === "KeyR") startLevel(g.index, true);
    if (e.code === "KeyZ") toggleOverview();
    hideHint();
  });
  addEventListener("keyup", e => { keys[e.code] = false; });
  addEventListener("blur", () => { for (const k in keys) keys[k] = false; });

  function cycleHam() {
    for (let k = 1; k <= 3; k++) { const i = (active + k) % 3; if (!g.hams[i].dead) { selectHam(i); return; } }
  }
  function toggleOverview() { overview = !overview; $("#btn-view").classList.toggle("on", overview); }

  // сенсорные кнопки: палец можно вести с ◀ на ▶ не отрывая
  const pointers = new Map();
  const padBtns = $$("[data-pad]");
  padBtns.forEach(b => b.addEventListener("pointerdown", e => {
    e.preventDefault(); Snd.ensure(); hideHint();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); updatePad();
  }));
  addEventListener("pointermove", e => { if (pointers.has(e.pointerId)) { pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); updatePad(); } }, { passive: true });
  ["pointerup", "pointercancel"].forEach(tp => addEventListener(tp, e => { if (pointers.delete(e.pointerId)) updatePad(); }));
  function updatePad() {
    const st = { left: false, right: false, jump: false };
    for (const p of pointers.values()) for (const b of padBtns) {
      const r = b.getBoundingClientRect(), m = 12;
      if (p.x > r.left - m && p.x < r.right + m && p.y > r.top - m && p.y < r.bottom + m) st[b.dataset.pad] = true;
    }
    if (st.jump && !touch.jump) jumpEdge = true;
    touch = st;
    padBtns.forEach(b => b.classList.toggle("down", st[b.dataset.pad]));
  }
  function readInput() {
    const L = touch.left || keys.ArrowLeft || keys.KeyA, Rr = touch.right || keys.ArrowRight || keys.KeyD;
    return { active, dir: (Rr ? 1 : 0) - (L ? 1 : 0), jumpHeld: !!(touch.jump || keys.Space || keys.ArrowUp || keys.KeyW) };
  }

  // ───────── цикл ─────────
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (screen === "game" && g) {
      if (!paused) {
        acc += dt;
        const inp = readInput();
        let first = true;
        while (acc >= STEP) {
          for (const e of g.hams.concat(g.crates, g.lifts)) { e.px = e.x; e.py = e.y; }
          HE.step(g, { active: inp.active, dir: inp.dir, jumpHeld: inp.jumpHeld, jumpPressed: first && jumpEdge }, STEP);
          if (first) jumpEdge = false;
          first = false; acc -= STEP;
        }
        for (const ev of g.events) {
          Snd.play(ev);
          if (ev === "die") buzz(80);
          if (ev === "crack") buzz(25);
          if (ev === "win") HE.Music.duck(2.6);
          if (ev === "win") { const E = g.exit; for (const c of ["#ff7a59", "#ffd34d", "#3fa2ff", "#7ed957", "#ff5fa2"]) HE.burst(g, (E.x0 + E.x1) / 2, E.y0, c, 10, 9); }
        }
        g.events.length = 0;
        if (g.hams[active].dead) cycleHam();
        if (g.state === "dead" && g.stateT > 0.9) startLevel(g.index, true);
        else if (g.state === "win" && g.stateT > 1.0 && !finished) finishLevel();
        updateHud();
        if (hintTimer > 0 && (hintTimer -= dt) <= 0) hideHint();
      }
      R.draw(g, { alpha: paused ? 1 : acc / STEP, dt: paused ? 0 : dt, t, active, overview, hats: save.hats });
    } else if (screen === "menu") {
      $$("#menu-hams canvas").forEach((c, i) => R.portrait(c, i, save.hats[i], t));
    }
    requestAnimationFrame(frame);
  }

  function pause() { if (screen !== "game" || finished) return; overlay("pause"); syncSound(); }
  function resume() { overlay(null); last = performance.now(); }

  // ───────── меню ─────────
  function buildMenu() {
    const started = Object.keys(save.levels).length > 0;
    $("#btn-play").textContent = started ? `Продолжить · уровень ${save.last + 1}` : "Играть";
    $("#menu-seeds").textContent = `${seedsTotal()} из ${HE.LEVELS.length * 3}`;
    syncSound();
  }
  function syncSound() {
    $$(".snd-label").forEach(el => (el.textContent = save.sound ? "Звуки: вкл" : "Звуки: выкл"));
    $$(".mus-label").forEach(el => (el.textContent = save.music ? "Музыка: вкл" : "Музыка: выкл"));
  }

  function buildLevels() {
    const box = $("#levels-list"); box.innerHTML = "";
    HE.WORLDS.forEach((w, wi) => {
      const sec = document.createElement("section"); sec.className = "world w" + wi;
      sec.innerHTML = `<h3>${w.name}</h3><p>${w.sub}</p><div class="lv-grid"></div>`;
      const grid = sec.querySelector(".lv-grid");
      HE.LEVELS.forEach((L, i) => {
        if (L.world !== wi) return;
        const st = save.levels[i], locked = i >= save.unlocked;
        const b = document.createElement("button");
        b.className = "lv" + (locked ? " locked" : "") + (st && st.done ? " done" : "");
        b.disabled = locked;
        b.innerHTML = locked ? `<span class="lv-n">${i + 1}</span><span class="lock" aria-label="закрыт"></span>`
          : `<span class="lv-n">${i + 1}</span><span class="lv-name">${L.name}</span><span class="lv-seeds">${[0, 1, 2].map(k => `<i class="seed-dot${st && st.seeds[k] ? " got" : ""}"></i>`).join("")}</span>`;
        if (!locked) b.addEventListener("click", () => { Snd.ensure(); Snd.play("click"); startLevel(i); });
        grid.appendChild(b);
      });
      box.appendChild(sec);
    });
  }

  let wardHam = 0;
  function buildWardrobe() {
    $("#ward-balance").textContent = seedsFree();
    const tabs = $("#ward-tabs"); tabs.innerHTML = "";
    HE.HAMSTERS.forEach((H, i) => {
      const b = document.createElement("button");
      b.className = "ward-tab" + (i === wardHam ? " on" : "");
      b.innerHTML = `<canvas></canvas><span><b>${H.name}</b><small>${H.desc}</small></span>`;
      b.addEventListener("click", () => { wardHam = i; Snd.play("click"); buildWardrobe(); });
      tabs.appendChild(b);
      requestAnimationFrame(() => R.portrait(b.querySelector("canvas"), i, save.hats[i], 0));
    });
    const grid = $("#ward-grid"); grid.innerHTML = "";
    HE.HATS.forEach(h => {
      const owned = save.owned.includes(h.id), worn = save.hats[wardHam] === h.id, afford = seedsFree() >= h.price;
      const b = document.createElement("button");
      b.className = "hat" + (worn ? " worn" : "") + (!owned && !afford ? " poor" : "");
      const label = worn ? "Надета" : owned ? "Надеть" : `<i class="seed-dot got"></i>${h.price}`;
      b.innerHTML = `<canvas></canvas><b>${h.name}</b><span class="hat-act">${label}</span>`;
      b.addEventListener("click", () => {
        if (worn) return;
        if (!owned) {
          if (!afford) { $("#ward-note").textContent = `Нужно ещё ${h.price - seedsFree()} семечек. Собирай их на уровнях!`; return; }
          save.owned.push(h.id); Snd.play("buy");
        } else Snd.play("click");
        save.hats[wardHam] = h.id; writeSave(); $("#ward-note").textContent = ""; buildWardrobe();
      });
      grid.appendChild(b);
      requestAnimationFrame(() => R.portrait(b.querySelector("canvas"), wardHam, h.id, 0));
    });
  }

  // ───────── кнопки интерфейса ─────────
  const on = (sel, fn) => $(sel).addEventListener("click", e => { Snd.ensure(); Snd.play("click"); fn(e); });
  on("#btn-play", () => startLevel(Math.min(save.last, save.unlocked - 1)));
  on("#btn-levels", () => show("levels"));
  on("#btn-wardrobe", () => show("wardrobe"));
  $$(".btn-sound").forEach(b => b.addEventListener("click", () => { save.sound = !save.sound; writeSave(); Snd.ensure(); Snd.play("click"); syncSound(); }));
  $$(".btn-music").forEach(b => b.addEventListener("click", () => { save.music = !save.music; writeSave(); Snd.ensure(); HE.Music.setEnabled(save.music); Snd.play("click"); syncSound(); updateAudioHint(); }));
  $$(".btn-back").forEach(b => b.addEventListener("click", () => { Snd.play("click"); show("menu"); }));
  on("#btn-pause", pause);
  on("#btn-restart", () => startLevel(g.index, true));
  on("#btn-view", toggleOverview);
  on("#btn-hint", () => ($("#hint").classList.contains("on") ? hideHint() : showHint()));
  $("#hint").addEventListener("click", hideHint);
  on("#p-resume", resume);
  on("#p-restart", () => startLevel(g.index, true));
  on("#p-levels", () => { overlay(null); show("levels"); });
  on("#p-menu", () => { overlay(null); show("menu"); });
  on("#win-next", () => startLevel(g.index + 1));
  on("#win-again", () => startLevel(g.index));
  on("#win-levels", () => { overlay(null); show("levels"); });
  $$(".ham-btn").forEach((b, i) => b.addEventListener("pointerdown", e => { e.preventDefault(); Snd.ensure(); selectHam(i); }));
  $("#btn-switch").addEventListener("pointerdown", e => { e.preventDefault(); Snd.ensure(); cycleHam(); });
  $("#rotate-close").addEventListener("click", () => $("#rotate").classList.add("gone"));
  addEventListener("contextmenu", e => e.preventDefault());
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });

  // ───────── полный экран ─────────
  // Android, компьютеры и iPad умеют requestFullscreen. iPhone — нет: там помогает только «На экран Домой».
  const root = document.documentElement;
  const fsSupported = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  const isFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  function toggleFullscreen() {
    try {
      if (isFs()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      const req = root.requestFullscreen || root.webkitRequestFullscreen;
      const p = req && req.call(root, { navigationUI: "hide" });
      const lock = () => { try { window.screen.orientation.lock("landscape").catch(() => {}); } catch (e) { /* поворот не заблокировать — не страшно */ } };
      if (p && p.then) p.then(lock).catch(() => {}); else lock();
    } catch (e) { /* браузер отказал — играем в окне */ }
  }
  function syncFs() { $$(".fs-label").forEach(el => (el.textContent = isFs() ? "Выйти из полного экрана" : "На весь экран")); }
  $$(".btn-fs").forEach(b => { b.hidden = !fsSupported; b.addEventListener("click", () => { Snd.play("click"); toggleFullscreen(); }); });
  ["fullscreenchange", "webkitfullscreenchange"].forEach(ev => document.addEventListener(ev, () => { syncFs(); R.resize(); }));

  // подсказка для iPhone в Safari: как добавить игру на экран «Домой»
  const isIPhone = /iPhone|iPod/.test(navigator.userAgent);
  const installed = navigator.standalone === true || matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches;
  const inFrame = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
  if (isIPhone && !installed && !inFrame && !save.iosTipClosed) $("#ios-tip").hidden = false;
  $("#ios-tip-close").addEventListener("click", () => { $("#ios-tip").hidden = true; save.iosTipClosed = true; writeSave(); });

  addEventListener("resize", () => R.resize());
  // в Safari размер окна меняется и при повороте, и когда прячутся панели
  if (window.visualViewport) window.visualViewport.addEventListener("resize", () => R.resize());
  addEventListener("orientationchange", () => setTimeout(() => R.resize(), 250));
  R.init($("#game-canvas"));

  // если страницу обновили, пока она открыта, — вернуться на тот же уровень
  window.claude?.hot?.snapshot?.(() => ({ screen, level: g ? g.index : null }));
  const boot = data => {
    if (data && data.screen === "game" && data.level != null && HE.LEVELS[data.level]) startLevel(data.level);
    else show("menu");
    requestAnimationFrame(frame);
  };
  window.claude?.hot?.ready ? window.claude.hot.ready(boot) : boot(window.claude?.hot?.data ?? {});
})();
