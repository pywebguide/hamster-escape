// Фоновая музыка: маленький секвенсор на Web Audio, без звуковых файлов.
// Мелодия — строка ступеней лада: цифра (или A=10, B=11) — нота, «-» — тянуть, «.» — пауза.
// 8 шагов (восьмые) на такт, 8 тактов в петле.
(function () {
  const HE = window.HE;
  const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10];
  const VOL = 0.22;

  const SONGS = {
    menu: { bpm: 92, root: 60, scale: MAJOR, prog: [1, 4, 1, 5, 1, 4, 5, 1], style: "soft",
      mel: ["5---3-1-", "6---4---", "5-6-5-3-", "2-------", "5---3-1-", "6---8---", "7-5-6-7-", "8-------"] },
    0: { bpm: 108, root: 60, scale: MAJOR, prog: [1, 6, 4, 5, 1, 6, 4, 5], style: "bouncy",
      mel: ["5-3-5-8-", "6-5-3-1-", "4-6-8-6-", "5-4-3-2-", "5-3-5-8-", "9-8-6-5-", "4-6-5-4-", "3-2-1---"] },
    1: { bpm: 118, root: 65, scale: MAJOR, prog: [1, 4, 2, 5, 1, 4, 2, 5], style: "bouncy",
      mel: ["1.3.5.3.", "4.6.8.6.", "2.4.6.4.", "5.7.9-..", "8.7.6.5.", "6.5.4.3.", "2.3.4.2.", "1---...."] },
    2: { bpm: 84, root: 57, scale: MINOR, prog: [1, 6, 3, 7, 1, 6, 7, 1], style: "dark",
      mel: ["1---3---", "6---5---", "3---5-4-", "7---5---", "1---3-5-", "6---8---", "7-6-5-3-", "2---1---"] },
    3: { bpm: 112, root: 55, scale: MAJOR, prog: [1, 5, 6, 4, 1, 5, 6, 4], style: "bright",
      mel: ["3-5-8-7-", "5---2-3-", "6-5-3-5-", "4---6---", "3-5-8-9-", "A-9-8-5-", "6-5-4-3-", "2---1---"] },
    // теплица: тёплая и неспешная
    4: { bpm: 100, root: 62, scale: MAJOR, prog: [1, 4, 6, 5, 1, 4, 5, 1], style: "bright",
      mel: ["3-5-6-5-", "4-6-8---", "6-5-3-5-", "2---5---", "3-5-6-8-", "9-8-6-5-", "4-5-6-7-", "8-------"] },
    // мастерская: бодрая, «механическая», в миноре
    5: { bpm: 124, root: 57, scale: MINOR, prog: [1, 6, 7, 1, 1, 4, 7, 5], style: "bouncy",
      mel: ["1.1.5.1.", "6.5.3.2.", "1.1.5.8.", "7-5-....", "4.4.6.4.", "3.4.5.6.", "7.6.5.4.", "5---...."] },
    // ночной двор: на цыпочках
    6: { bpm: 96, root: 55, scale: MINOR, prog: [1, 4, 1, 5, 6, 4, 5, 1], style: "sneak",
      mel: ["1.3.5.3.", "4.....3.", "1.3.5.6.", "5.......", "6.5.4.3.", "4.3.2.1.", "2.3.4.2.", "1......."] },
    story: { bpm: 76, root: 60, scale: MAJOR, prog: [1, 6, 4, 5, 1, 6, 4, 1], style: "soft",
      mel: ["5---6---", "5---3---", "4---5---", "2-------", "3---5---", "6---8---", "7---5---", "8-------"] },
    finale: { bpm: 116, root: 62, scale: MAJOR, prog: [1, 4, 5, 1, 6, 4, 5, 1], style: "bright",
      mel: ["5-5-6-8-", "8-6-5---", "4-4-5-6-", "5-3-2---", "5-5-6-8-", "A-9-8-6-", "5-6-7-9-", "8-------"] },
  };

  // разбор мелодии в ноты: { step, deg, len }
  function parse(song) {
    const s = song.mel.join(""), notes = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "-" || s[i] === ".") continue;
      let len = 1; while (s[i + len] === "-") len++;
      notes[i] = { deg: parseInt(s[i], 36), len };
    }
    return Object.assign({}, song, { notes, steps: s.length });
  }
  const midi = (song, deg, oct) => {
    const d = deg - 1, o = Math.floor(d / 7);
    return song.root + song.scale[((d % 7) + 7) % 7] + 12 * (o + oct);
  };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);

  let ac = null, bus = null, cur = null, want = null, step = 0, nextT = 0, timer = null;
  let enabled = true, dimmed = false, switching = false;

  function level() { return enabled ? VOL * (dimmed ? 0.4 : 1) : 0; }
  function setGain(v, tc) { if (bus) { bus.gain.cancelScheduledValues(ac.currentTime); bus.gain.setTargetAtTime(v, ac.currentTime, tc || 0.25); } }

  function note(type, f, t, dur, vol, attack) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.012));
    g.gain.exponentialRampToValueAtTime(vol * 0.5, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.12);
  }
  let noiseBuf = null;
  function hit(t, freq, q, dur, vol, type) {
    if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.3, ac.sampleRate); const c = noiseBuf.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.random() * 2 - 1; }
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = type || "highpass"; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus); s.start(t); s.stop(t + dur + 0.02);
  }
  function kick(t, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.2);
  }

  function schedule(song, i, t, sp) {
    const bar = Math.floor(i / 8), pos = i % 8, chordDeg = song.prog[bar];
    const st = song.style;
    // мелодия
    const n = song.notes[i];
    if (n) {
      const f = hz(midi(song, n.deg, 1)), dur = n.len * sp;
      if (st === "sneak") { note("triangle", f, t, Math.min(dur, sp * 0.55), 0.15); note("sine", f / 2, t, Math.min(dur, sp * 0.5), 0.05); }
      else if (st === "dark") note("sine", f, t, dur * 1.1, 0.16, 0.04);
      else if (st === "soft") note("triangle", f, t, dur, 0.17, 0.02);
      else { note("triangle", f, t, dur, 0.15); note("square", f * 2, t, Math.min(dur, sp * 0.9), 0.018); }
    }
    // аккорд
    const tones = [0, 2, 4].map(k => hz(midi(song, chordDeg + k, 0)));
    if (st === "soft" || st === "dark" || st === "sneak") {
      if (pos === 0) tones.forEach(f => note("sine", f, t, sp * 7.5, st === "soft" ? 0.05 : 0.04, 0.25));
    } else if (pos === 2 || pos === 6) {
      tones.forEach(f => note("triangle", f, t, sp * 0.7, 0.035));
    }
    // бас
    const bassF = hz(midi(song, chordDeg, -1));
    if (st === "bouncy" || st === "bright") {
      if (pos === 0 || pos === 4) note("triangle", bassF, t, sp * 1.6, 0.2);
      if (pos === 7) note("triangle", bassF * 1.5, t, sp * 0.6, 0.12);
    } else if (st === "sneak") {   // крадущийся бас на каждую долю
      if (pos % 2 === 0) note("triangle", pos % 4 === 0 ? bassF : bassF * 1.5, t, sp * 0.7, 0.17);
    } else if (pos === 0) note("triangle", bassF, t, sp * 6, 0.18, 0.03);
    // ударные
    if (st === "bouncy" || st === "bright") {
      if (pos === 0 || pos === 4) kick(t, 0.32);
      if (pos === 2 || pos === 6) hit(t, 1800, 0.8, 0.12, 0.09, "bandpass");
      if (pos % 2 === 1) hit(t, 7000, 0.5, 0.04, 0.035);
    } else if (st === "sneak") {
      if (pos === 4) hit(t, 2600, 1.2, 0.07, 0.035, "bandpass");
      if (pos % 2 === 1) hit(t, 8000, 0.5, 0.025, 0.016);
    } else if (st === "dark") {
      if (pos === 0) kick(t, 0.18);
      if (pos === 3 || pos === 7) hit(t, 5000, 1, 0.07, 0.025);
    } else if (pos === 4) hit(t, 6000, 0.5, 0.05, 0.02);
  }

  function tick() {
    if (!cur || !ac || ac.state !== "running") return;
    const sp = 60 / cur.bpm / 2;
    if (nextT < ac.currentTime - 0.5) nextT = ac.currentTime + 0.05;  // после сна вкладки не играть пропущенное
    while (nextT < ac.currentTime + 0.3) {  // запас 0,3 с: подтормаживание страницы не рвёт музыку
      const swing = (cur.style === "bouncy" && step % 2 === 1) ? sp * 0.12 : 0;
      try { schedule(cur, step, nextT + swing, sp); } catch (e) { /* пропускаем ноту */ }
      step = (step + 1) % cur.steps; nextT += sp;
    }
  }

  function start(key) {
    const song = parse(SONGS[key] || SONGS.menu);
    song.key = key;
    if (!timer) timer = setInterval(tick, 25);
    if (!cur) { cur = song; step = 0; nextT = ac.currentTime + 0.08; setGain(level(), 0.5); return; }
    switching = true;
    setGain(0, 0.08);
    setTimeout(() => { cur = song; step = 0; nextT = ac.currentTime + 0.05; switching = false; setGain(level(), 0.4); }, 320);
  }

  HE.Music = {
    attach(audioCtx, dest) {
      if (ac) return;
      ac = audioCtx; bus = ac.createGain(); bus.gain.value = 0; bus.connect(dest);
      if (want != null) start(want);
    },
    play(key) {
      key = String(key);
      if (want === key && cur) return;
      want = key;
      if (ac && (!cur || cur.key !== key)) start(key);
    },
    setEnabled(on) { enabled = on; if (!switching) setGain(level(), 0.2); },
    dim(on) { dimmed = on; if (!switching) setGain(level(), 0.3); },
    duck(sec) {
      if (!bus || !enabled) return;
      setGain(level() * 0.2, 0.08);
      setTimeout(() => { if (!switching) setGain(level(), 0.6); }, sec * 1000);
    },
  };
})();
