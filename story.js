// История «Хомячьего побега»: тексты глав и рисованные сцены к ним.
// Сцена рисуется в квадрате 16×9 условных клеток; земля — на высоте 7,2.
(function () {
  const HE = window.HE;
  const S = HE.Sprites, R = HE.Render;
  const TAU = Math.PI * 2;

  HE.STORY_NAMES = { 0: "Пончик", 1: "Коготок", 2: "Шустрик", gramps: "Дед Сухарик" };
  HE.MAP_PLACES = ["Клетка", "Кухня", "Кладовка", "Сад", "Теплица", "Мастерская", "Двор", "Поле"];

  // who — кто говорит (0, 1, 2 или "gramps"); без who — рассказчик
  HE.STORY = {
    ch0: [
      { scene: "cage", text: "Ночь. На подоконнике стоит клетка, а в ней живут трое: силач Пончик, цепкий Коготок и малыш Шустрик." },
      { scene: "cage", who: 2, text: "Эй, проснитесь! Смотрите, что я выкопал под опилками!" },
      { scene: "map", map: 0, text: "Это карта, нацарапанная на фантике от конфеты. Внизу подпись: «Кто дойдёт до Подсолнухового поля, тот больше никогда не будет голодать. Дед Сухарик»." },
      { scene: "cage", who: 0, text: "Никогда-никогда не будет голодать? Я в деле." },
      { scene: "cage", who: 1, text: "Защёлка на дверце совсем разболталась. Если бежать, то прямо сейчас, пока все спят." },
      { scene: "map", map: 0, text: "Так начался Хомячий побег. Норка засчитывается, только когда в ней вся команда." },
    ],
    ch1: [
      { scene: "map", map: 1, title: "Глава 2. Кухня", text: "Клетка позади! Впереди огромная кухня: коробки, полки и крошки." },
      { scene: "kitchen", who: 0, text: "Пахнет сыром… Может, задержимся? Чуть-чуть?" },
      { scene: "kitchen", who: 1, text: "Не отвлекайся. По карте дальше кладовка, а в ней дыра в стене." },
    ],
    ch2: [
      { scene: "map", map: 2, title: "Глава 3. Кладовка", text: "Темно, пыльно и пахнет старой картошкой." },
      { scene: "pantry", who: 1, text: "Гляньте на стену: царапины-стрелки. Это знаки Деда Сухарика, он тут проходил!" },
      { scene: "pantry", who: 2, text: "Мне совсем не страшно. Ну, почти. Можно я пойду посерединке?" },
    ],
    ch3: [
      { scene: "map", map: 3, title: "Глава 4. Сад", text: "Через дыру в стене хомяки выбрались на улицу." },
      { scene: "garden", who: 2, text: "Мы сбежали! Трава! Небо! Ура-а-а!" },
      { scene: "garden", who: 1, text: "Рано радуешься. Поле ещё далеко, а дальше по карте нарисована теплица." },
    ],
    ch4: [
      { scene: "map", map: 4, title: "Глава 5. Теплица", text: "Здесь жарко, гудят вентиляторы и пахнет помидорами." },
      { scene: "greenhouse", who: 1, text: "Ветер подхватит нас с Шустриком. А Пончика не сдвинет." },
      { scene: "greenhouse", who: 0, text: "Потому что я солидный. И в трубы ваши не полезу, даже не просите." },
      { scene: "greenhouse", who: 2, text: "Это хомячьи трубы! Говорят, их проложил сам Дед Сухарик. Залез в одну, вылез из другой." },
    ],
    ch5: [
      { scene: "map", map: 5, title: "Глава 6. Мастерская", text: "Здесь всё жужжит, щёлкает и само куда-то едет." },
      { scene: "workshop", who: 0, text: "Эта лента везёт меня не туда! Кто-нибудь, разверните её!" },
      { scene: "workshop", who: 1, text: "Видишь кнопку с часиками? Она держит дверь, пока тикает. Нажал — и бегом." },
    ],
    ch6: [
      { scene: "map", map: 6, title: "Глава 7. Ночной двор", text: "До поля рукой подать. Но посреди двора спит кот Граф." },
      { scene: "yard", who: 2, text: "Он почти всегда спит. Почти." },
      { scene: "yard", who: 1, text: "Заворочался — прячьтесь в кусты или за коробку. Сквозь них он не видит." },
      { scene: "yard", who: 0, text: "И никто не трогает его хвост. Никто. Никогда." },
    ],
    end: [
      { scene: "map", map: 7, title: "Финал", text: "Утро. За забором качаются подсолнухи — целое море подсолнухов." },
      { scene: "field", who: "gramps", text: "Ну наконец-то! Я уж думал, мою карту никто никогда не найдёт." },
      { scene: "field", who: 2, text: "Вы Дед Сухарик? Самый настоящий?" },
      { scene: "field", who: "gramps", text: "Самый настоящий. Добро пожаловать на Подсолнуховое поле. Семечек тут хватит на всех." },
      { scene: "field", who: 0, text: "А можно прямо сейчас?" },
      { scene: "field", text: "Конец. Спасибо, что довёл хомяков до поля! В гардеробе тебя ждёт окраска «Ниндзя»." },
    ],
  };

  const SCENE_WORLD = { cage: 0, map: 0, kitchen: 1, pantry: 2, garden: 3, greenhouse: 4, workshop: 5, yard: 6, field: 3 };
  const GRAMPS = { w: 1.1, h: 1.15 };
  const GRAMPS_COL = { fur: "#bdb6ab", furL: "#ddd8cf", belly: "#f1ece3", dark: "#857c72", eye: "#2a1a12" };

  // ───────── карта на фантике ─────────
  const MAP_PTS = [[2.4, 5.6], [4.0, 3.6], [5.7, 5.3], [7.3, 3.4], [8.9, 5.2], [10.5, 3.5], [12.0, 5.4], [13.6, 3.6]];
  function mapIcon(c, k, x, y, t) {
    c.save(); c.translate(x, y);
    c.fillStyle = "#6b4a2e"; c.strokeStyle = "#6b4a2e"; c.lineWidth = 0.07; c.lineCap = "round";
    if (k === 0) { S.rrect(c, -0.35, -0.35, 0.7, 0.6, 0.12); c.stroke(); for (const dx of [-0.17, 0, 0.17]) { c.beginPath(); c.moveTo(dx, -0.35); c.lineTo(dx, 0.25); c.stroke(); } }
    else if (k === 1) { c.beginPath(); c.ellipse(0, 0, 0.35, 0.22, 0, 0, Math.PI); c.fill(); c.fillRect(-0.38, -0.06, 0.76, 0.08); c.beginPath(); c.moveTo(0.35, -0.02); c.lineTo(0.55, -0.12); c.stroke(); }
    else if (k === 2) { S.rrect(c, -0.22, -0.32, 0.44, 0.58, 0.1); c.stroke(); c.fillRect(-0.25, -0.38, 0.5, 0.1); }
    else if (k === 3) { for (let j = 0; j < 5; j++) { const a = (j / 5) * TAU; S.ellipse(c, Math.cos(a) * 0.17, Math.sin(a) * 0.17 - 0.08, 0.11, 0.11, "#e0708a"); } S.ellipse(c, 0, -0.08, 0.09, 0.09, "#f1c232"); c.beginPath(); c.moveTo(0, 0.1); c.lineTo(0, 0.35); c.stroke(); }
    else if (k === 4) { c.beginPath(); c.moveTo(-0.4, 0.25); c.lineTo(-0.4, -0.1); c.lineTo(0, -0.4); c.lineTo(0.4, -0.1); c.lineTo(0.4, 0.25); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(0, -0.4); c.lineTo(0, 0.25); c.stroke(); }
    else if (k === 5) { c.save(); c.rotate(t * 0.8); for (let j = 0; j < 8; j++) { c.rotate(TAU / 8); c.fillRect(-0.06, -0.38, 0.12, 0.16); } c.restore(); c.beginPath(); c.arc(0, 0, 0.24, 0, TAU); c.fill(); S.ellipse(c, 0, 0, 0.09, 0.09, "#f3dfb3"); }
    else if (k === 6) { c.beginPath(); c.arc(0, 0, 0.28, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-0.28, -0.05); c.lineTo(-0.22, -0.42); c.lineTo(-0.05, -0.25); c.moveTo(0.28, -0.05); c.lineTo(0.22, -0.42); c.lineTo(0.05, -0.25); c.fill(); S.ellipse(c, -0.1, -0.02, 0.05, 0.03, "#ffd84a"); S.ellipse(c, 0.1, -0.02, 0.05, 0.03, "#ffd84a"); }
    else { for (let j = 0; j < 10; j++) { const a = (j / 10) * TAU + t * 0.3; S.ellipse(c, Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0.1, 0.1, "#ffc928"); } S.ellipse(c, 0, 0, 0.17, 0.17, "#7a4a1e"); }
    c.restore();
  }
  function drawMap(c, upto, t, look) {
    // бумажка-фантик с зубчатыми краями
    c.save(); c.translate(8, 4.5); c.rotate(-0.025); c.translate(-8, -4.5);
    c.fillStyle = "rgba(60,30,10,0.25)"; c.fillRect(1.25, 1.55, 13.8, 6.2);
    c.beginPath(); c.moveTo(1.1, 1.3);
    for (let x = 1.1; x <= 14.9; x += 0.35) c.lineTo(x, 1.3 + ((x * 3) % 2 < 1 ? -0.12 : 0));
    c.lineTo(14.9, 7.5);
    for (let x = 14.9; x >= 1.1; x -= 0.35) c.lineTo(x, 7.5 + ((x * 3) % 2 < 1 ? 0.12 : 0));
    c.closePath();
    const pg = c.createLinearGradient(0, 1.3, 0, 7.5);
    pg.addColorStop(0, "#fff3d6"); pg.addColorStop(1, "#f6dfb0");
    c.fillStyle = pg; c.fill();
    c.save(); c.clip();
    c.fillStyle = "rgba(255,120,150,0.12)"; for (let x = 0; x < 16; x += 1.4) { c.beginPath(); c.moveTo(x, 1); c.lineTo(x + 0.6, 1); c.lineTo(x - 1.4, 8); c.lineTo(x - 2, 8); c.fill(); }
    c.restore();
    // путь: пройденная часть — сплошным пунктиром, новый кусок дорисовывается
    const grow = Math.min(1, t / 1.4);
    c.lineCap = "round"; c.lineWidth = 0.09;
    for (let k = 0; k < MAP_PTS.length - 1; k++) {
      const [x0, y0] = MAP_PTS[k], [x1, y1] = MAP_PTS[k + 1];
      const done = k < upto - 1 ? 1 : k === upto - 1 ? grow : 0;
      c.setLineDash([0.18, 0.2]);
      c.strokeStyle = "rgba(107,74,46,0.25)"; c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 - 1, x1, y1); c.stroke();
      if (done > 0) {
        c.strokeStyle = "#d9611a"; c.beginPath(); c.moveTo(x0, y0);
        for (let s = 1; s <= 20 * done; s++) {
          const u = s / 20, mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - 1;
          c.lineTo((1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * mx + u * u * x1, (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * my + u * u * y1);
        }
        c.stroke();
      }
    }
    c.setLineDash([]);
    MAP_PTS.forEach(([x, y], k) => {
      c.globalAlpha = k <= upto ? 1 : 0.45;
      mapIcon(c, k, x, y - 0.1, t);
      S.text(c, HE.MAP_PLACES[k], x, y + 0.55, 0.32, 800, "#6b4a2e");
      c.globalAlpha = 1;
    });
    // крестик-цель и подпись Деда Сухарика
    c.strokeStyle = "#c0392b"; c.lineWidth = 0.08;
    const [fx, fy] = MAP_PTS[7];
    c.beginPath(); c.moveTo(fx - 0.5, fy - 0.85); c.lineTo(fx + 0.5, fy + 0.15); c.moveTo(fx + 0.5, fy - 0.85); c.lineTo(fx - 0.5, fy + 0.15); c.stroke();
    S.text(c, "Дед Сухарик", 12.9, 7.05, 0.34, 800, "#8a6446");
    c.restore();
    // хомячок-метка там, где команда сейчас
    const k = Math.min(upto, 7), [mx, my] = MAP_PTS[k];
    const hop = Math.abs(Math.sin(t * 4)) * 0.25;
    c.save(); c.translate(mx, my - 0.6 - hop); c.scale(0.55, 0.55);
    S.hamster(c, { i: 0, x: 0, y: 0, face: 1, squash: 0, vy: 0, vx: 0, onGround: true, walk: 0, blink: 1, t, hat: look.hats[0], skin: look.skins[0] });
    c.restore();
  }

  // ───────── декорации сцен ─────────
  function ground(c, w) {
    const th = HE.THEMES[w];
    c.fillStyle = th.wall; c.fillRect(-10, 7.2, 36, 6);
    c.fillStyle = th.cap; c.fillRect(-10, 7.2, 36, 0.22);
  }
  function props(c, scene, t) {
    if (scene === "cage") {
      // окно с луной, прутья клетки, колесо
      c.fillStyle = "#1e2550"; S.rrect(c, 5, 0.6, 6, 4.4, 0.25); c.fill();
      for (let k = 0; k < 14; k++) { const tw = 0.5 + 0.5 * Math.sin(t * 2 + k); c.fillStyle = `rgba(255,255,220,${0.4 + tw * 0.5})`; c.beginPath(); c.arc(5.4 + ((k * 2.7) % 5.2), 1 + ((k * 1.3) % 3.6), 0.04 + tw * 0.03, 0, TAU); c.fill(); }
      c.fillStyle = "#fff6d0"; c.beginPath(); c.arc(9.6, 1.7, 0.6, 0, TAU); c.fill();
      c.fillStyle = "#1e2550"; c.beginPath(); c.arc(9.85, 1.55, 0.5, 0, TAU); c.fill();
      c.fillStyle = "#c98b52"; c.fillRect(4.8, 4.9, 6.4, 0.25); c.fillRect(7.9, 0.6, 0.2, 4.4);
      c.strokeStyle = "rgba(120,80,40,0.55)"; c.lineWidth = 0.08;
      for (let x = 0.5; x < 16; x += 0.8) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 7.2); c.stroke(); }
      c.lineWidth = 0.16; c.strokeStyle = "rgba(120,80,40,0.7)"; c.beginPath(); c.arc(13.4, 5.6, 1.5, 0, TAU); c.stroke();
      c.save(); c.translate(13.4, 5.6); c.rotate(t * 0.2); c.lineWidth = 0.06; for (let k = 0; k < 6; k++) { c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(1.5, 0); c.stroke(); } c.restore();
      S.ellipse(c, 2.2, 7.15, 0.9, 0.22, "#d9611a"); S.ellipse(c, 2.2, 7.05, 0.7, 0.12, "#f6d58e");
    } else if (scene === "kitchen") {
      c.fillStyle = "#e8eef2"; c.fillRect(-1, 5.6, 18, 0.25);
      c.fillStyle = "#ffd54a"; c.beginPath(); c.moveTo(11.5, 7.2); c.lineTo(13.6, 7.2); c.lineTo(13.6, 6.1); c.closePath(); c.fill();
      for (const [x, y] of [[12.9, 6.8], [13.3, 6.5], [12.5, 7.0]]) S.ellipse(c, x, y, 0.1, 0.08, "#e0b22c");
      S.crate(c, 1.5, 6.2); S.crate(c, 2.6, 6.2); S.crate(c, 2.05, 5.2);
    } else if (scene === "pantry") {
      c.strokeStyle = "rgba(255,214,150,0.65)"; c.lineWidth = 0.08; c.lineCap = "round";
      for (const [x, y] of [[3, 2.5], [8, 2], [12.5, 2.6]]) {
        const glow = 0.5 + 0.5 * Math.sin(t * 2 + x);
        c.globalAlpha = 0.5 + glow * 0.5;
        for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(x - 0.6 + k * 0.14, y - 0.3 + k * 0.12); c.lineTo(x + 0.5 + k * 0.14, y - 0.3 + k * 0.12); c.stroke(); }
        c.beginPath(); c.moveTo(x + 0.3, y - 0.6); c.lineTo(x + 0.75, y - 0.05); c.lineTo(x + 0.3, y + 0.45); c.stroke();
      }
      c.globalAlpha = 1;
    } else if (scene === "garden" || scene === "field") {
      const n = scene === "field" ? 9 : 4;
      for (let k = 0; k < n; k++) {
        const x = scene === "field" ? 0.6 + k * 1.9 : [1.2, 3, 12.8, 14.6][k], sw = Math.sin(t * 1.2 + k) * 0.12;
        const top = scene === "field" ? 3.2 + (k % 3) * 0.5 : 5.6;
        c.strokeStyle = "#4d8f3a"; c.lineWidth = 0.12; c.beginPath(); c.moveTo(x, 7.3); c.quadraticCurveTo(x + sw, (top + 7.3) / 2, x + sw * 2, top); c.stroke();
        if (scene === "field") {
          c.save(); c.translate(x + sw * 2, top); c.rotate(sw);
          for (let j = 0; j < 14; j++) { const a = (j / 14) * TAU; S.ellipse(c, Math.cos(a) * 0.55, Math.sin(a) * 0.55, 0.26, 0.26, "#ffc928"); }
          S.ellipse(c, 0, 0, 0.45, 0.45, "#6b3f1c"); S.ellipse(c, -0.1, -0.1, 0.2, 0.2, "#7f4d22");
          c.restore();
        } else {
          for (let j = 0; j < 6; j++) { const a = (j / 6) * TAU; S.ellipse(c, x + sw * 2 + Math.cos(a) * 0.22, top + Math.sin(a) * 0.22, 0.16, 0.16, ["#ff7eb6", "#ffffff", "#ffd84d", "#ff9e5e"][k % 4]); }
          S.ellipse(c, x + sw * 2, top, 0.12, 0.12, "#f1a222");
        }
      }
    } else if (scene === "greenhouse") {
      for (const x of [1.6, 14.2]) {
        c.strokeStyle = "#4f8f3d"; c.lineWidth = 0.12; c.beginPath(); c.moveTo(x, 7.2); c.lineTo(x, 3.2); c.stroke();
        for (let k = 0; k < 4; k++) { const sw = Math.sin(t * 1.5 + k) * 0.05; S.ellipse(c, x + (k % 2 ? 0.45 : -0.45) + sw, 3.8 + k * 0.8, 0.28, 0.28, "#e8413a"); S.ellipse(c, x + (k % 2 ? 0.4 : -0.5) + sw, 3.7 + k * 0.8, 0.08, 0.05, "rgba(255,255,255,0.6)"); }
      }
      S.fanBox(c, 11.4, 6.2); S.fanBlades(c, { x: 11.4, y: 6.2, spin: t * 16, on: true });
    } else if (scene === "workshop") {
      S.belt(c, { x0: 10, y: 6.2, w: 5, dir: 1, cur: 1, phase: t * 2.6, ch: null }, t);
      S.crate(c, 10.5 + ((t * 0.8) % 3.5), 5.2);
    } else if (scene === "yard") {
      c.save(); c.translate(12.2, 7.2); c.scale(1.5, 1.5);
      S.cat(c, { x: 0, y: 0, look: -1, phase: "sleep", pounce: 0 }, t);
      c.restore();
      for (let k = 0; k < 3; k++) { const ph = (t * 0.5 + k / 3) % 1; c.globalAlpha = Math.sin(ph * Math.PI); S.text(c, "z", 11.2 - ph * 0.7, 4.4 - ph * 1.2, 0.4 + ph * 0.25, 900, "#ffffff"); }
      c.globalAlpha = 1;
      S.bush(c, 0.6, 6.0, t, true); S.bush(c, 1.6, 6.1, t, true);
    }
  }

  HE.Story = {
    // ctx: контекст холста размером W×H (в CSS-пикселях), panel — кадр истории, t — секунд с начала кадра
    draw(ctx, W, H, panel, t, look) {
      const scene = panel.scene, w = SCENE_WORLD[scene];
      const s = Math.min(W / 16, H / 9);
      if (scene === "map") {
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, "#c98b52"); bg.addColorStop(1, "#8f5a2e");
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.translate(W / 2 - 8 * s, H / 2 - 4.5 * s); ctx.scale(s, s);
        drawMap(ctx, panel.map || 0, t, look);
        ctx.restore();
        return;
      }
      if (scene === "field") {   // рассвет над полем
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, "#ffb36b"); bg.addColorStop(0.55, "#ffe1a1"); bg.addColorStop(1, "#cfe8a0");
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.translate(W / 2 - 8 * s, H / 2 - 4.5 * s); ctx.scale(s, s);
        const sg = ctx.createRadialGradient(8, 4.2, 0.3, 8, 4.2, 5);
        sg.addColorStop(0, "rgba(255,250,210,0.9)"); sg.addColorStop(1, "rgba(255,250,210,0)");
        ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(8, 4.2, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = "#fff4c4"; ctx.beginPath(); ctx.arc(8, 4.4, 1.1 + Math.sin(t) * 0.03, 0, TAU); ctx.fill();
        ctx.restore();
      } else R.backdrop(ctx, w, W, H, 16, 9, 8, 4.5, s * 0.8, t);
      ctx.save();
      ctx.translate(W / 2 - 8 * s, H / 2 - 4.5 * s); ctx.scale(s, s);
      ground(ctx, scene === "field" ? 3 : w);
      props(ctx, scene, t);
      // герои
      const cast = [[5.2, 0], [7.3, 1], [9.0, 2]];
      const shy = scene === "pantry";   // в кладовке Шустрик прячется посерединке
      if (shy) { cast[1][0] = 9.1; cast[2][0] = 7.2; }
      const enter = Math.min(1, t / 0.5);
      for (const [x, i] of cast) {
        const talk = panel.who === i && t < 3;
        const hop = talk ? Math.abs(Math.sin(t * 9)) * 0.18 : 0;
        const asleep = scene === "cage" && panel.who == null && !panel.text.includes("Так");
        ctx.save(); ctx.translate(x, 7.2 - hop); ctx.scale(1.6, 1.6);
        S.hamster(ctx, { i, x: 0, y: 0, face: x < 8 ? 1 : -1, squash: talk ? Math.sin(t * 18) * 0.04 : 0, vy: 0, vx: 0, onGround: true, walk: 0,
          blink: Math.sin(t * 1.3 + i * 2) > 0.97 ? -1 : 1, t: t + i, hat: look.hats[i], skin: look.skins[i], idle: asleep ? 12 : 0, scared: scene === "yard" && i === 2 && panel.who === 2 });
        ctx.restore();
        if (talk) { ctx.fillStyle = "#ffffff"; ctx.globalAlpha = 0.9 * enter; ctx.beginPath(); ctx.moveTo(x - 0.2, 7.2 - 2.4); ctx.lineTo(x + 0.2, 7.2 - 2.4); ctx.lineTo(x, 7.2 - 2.1); ctx.fill(); ctx.globalAlpha = 1; }
      }
      if (scene === "field") {   // Дед Сухарик с палочкой
        const talk = panel.who === "gramps" && t < 3, hop = talk ? Math.abs(Math.sin(t * 7)) * 0.12 : 0;
        ctx.strokeStyle = "#7a5230"; ctx.lineWidth = 0.1; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(11.0, 7.2); ctx.lineTo(10.85, 5.7); ctx.stroke();
        ctx.save(); ctx.translate(11.8, 7.2 - hop); ctx.scale(1.6, 1.6);
        S.hamster(ctx, { i: 0, def: GRAMPS, colors: GRAMPS_COL, x: 0, y: 0, face: -1, squash: 0, vy: 0, vx: 0, onGround: true, walk: 0, blink: Math.sin(t * 1.1) > 0.97 ? -1 : 1, t, hat: "specs" });
        ctx.restore();
      }
      ctx.restore();
      // мягкое появление кадра
      if (enter < 1) { ctx.fillStyle = `rgba(40,25,10,${(1 - enter) * 0.5})`; ctx.fillRect(0, 0, W, H); }
    },
  };
})();
