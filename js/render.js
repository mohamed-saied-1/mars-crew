// Draws everything that moves: stations, crew, weather, light and each player's view.
(function (root) {
  'use strict';

  var Art = root.Art, World = root.World, TS = Art.TS, A = Art.px;
  var ROLE_COLOR = { engineer: '#ec8f2f', farmer: '#4fb65a', doctor: '#3fa3ea', earth: '#b07ae0' };
  var mapCanvas = null, clock = 0;
  var doorOpen = World.DOORS.map(function () { return 0; });
  var footprints = [], footTimer = 0, feed = [], feedTimer = 0, booms = [];
  var dusty = { x: 30, y: 17, dir: 1, step: 0 };
  var motes = [];
  for (var m = 0; m < 46; m++) motes.push({ x: Art.hash(m, 1), y: Art.hash(m, 2), s: 0.4 + Art.hash(m, 3), z: Art.hash(m, 4) });

  var glowCache = {};
  function glowSprite(color) {
    if (glowCache[color]) return glowCache[color];
    var cv = Art.canvas(64, 64), c = cv.getContext('2d');
    var g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
    glowCache[color] = cv;
    return cv;
  }

  function light(c, x, y, r, color, alpha) {
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = alpha;
    c.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
    c.restore();
  }

  // ---- Stations -----------------------------------------------------------
  function drawPanel(c, g, st) {
    var X = st.x * TS, Y = st.y * TS, W = st.w * TS, H = st.h * TS, dust = g.panels[st.index].dust;
    c.fillStyle = 'rgba(30,10,4,.38)'; c.fillRect(X + 10, Y + H + 2, W, 10);
    A(c, '#565d70', X + W / 2 - 6, Y + H - 2, 12, 14);
    A(c, '#22273a', X - 4, Y - 4, W + 8, H + 8); A(c, '#7a8298', X - 4, Y - 4, W + 8, 2);
    for (var i = 0; i < 10; i++) {
      for (var j = 0; j < 4; j++) {
        A(c, ['#1f3f8f', '#24489f', '#2a53b3'][(i + j) % 3], X + i * 16 + 1, Y + j * 16 + 1, 14, 14);
        A(c, '#3a6ad0', X + i * 16 + 1, Y + j * 16 + 1, 14, 1);
      }
    }
    var sheen = (clock * 50 + st.index * 60) % (W + 80) - 40;
    c.save(); c.beginPath(); c.rect(X, Y, W, H); c.clip();
    c.fillStyle = 'rgba(190,225,255,.2)';
    c.beginPath(); c.moveTo(X + sheen, Y); c.lineTo(X + sheen + 18, Y); c.lineTo(X + sheen - 10, Y + H); c.lineTo(X + sheen - 28, Y + H); c.fill();
    c.globalAlpha = Math.min(0.96, dust * 1.15);
    c.drawImage(Art.dustTexture(), st.index * 40, 0, W, H, X, Y, W, H);
    c.restore();
  }

  function drawDevice(c, g, st, blink) {
    var X = st.x * TS, Y = st.y * TS, W = st.w * TS, H = st.h * TS, ok = g.devices[st.device];
    if (st.device === 'antenna') {
      c.fillStyle = 'rgba(30,10,4,.38)'; c.beginPath(); c.ellipse(X + W / 2 + 6, Y + H - 2, 28, 8, 0, 0, 7); c.fill();
      A(c, '#6c7488', X + W / 2 - 3, Y + 24, 6, H - 24); A(c, '#8d96ac', X + W / 2 - 14, Y + H - 8, 28, 6);
      var sway = Math.sin(clock * 0.5) * 3;
      c.fillStyle = '#e8ebf2'; c.beginPath(); c.ellipse(X + W / 2 + sway, Y + 16, 30, 16, -0.2, 0, 7); c.fill();
      c.fillStyle = '#b8bfd0'; c.beginPath(); c.ellipse(X + W / 2 + sway, Y + 18, 22, 10, -0.2, 0, 7); c.fill();
      A(c, '#6c7488', X + W / 2 + sway - 1, Y + 2, 2, 16);
      var on = ok && g.alloc.science > 0;
      A(c, on ? (blink ? '#7dffa0' : '#2f8f4c') : '#ff5a5a', X + W / 2 + sway - 2, Y, 4, 4);
      if (on) light(c, X + W / 2 + sway, Y + 2, 26, '#7dffa0', 0.45);
    } else if (st.device === 'battery') {
      A(c, '#262b3b', X, Y - 20, W, H + 20); A(c, '#3c4358', X, Y - 20, W, 3);
      var fill = Math.min(1, Math.max(0, g.leftover()) / 8);
      for (var i = 0; i < 6; i++) {
        A(c, '#101422', X + 4 + i * 10, Y - 14, 8, 26);
        var lit = (i + 1) / 6 <= fill + 0.01;
        A(c, ok ? (lit ? '#ffd24a' : '#3a3626') : '#7a2a2a', X + 5 + i * 10, Y - 13, 6, 24);
      }
      A(c, '#454c60', X + 4, Y + 16, W - 8, 8);
      light(c, X + W / 2, Y - 2, 46, '#ffd24a', 0.14 + fill * 0.15);
    } else if (st.device === 'recycler') {
      A(c, '#2f5a50', X, Y - 20, W, H + 20); A(c, '#46806f', X, Y - 20, W, 3);
      c.fillStyle = '#13251f'; c.beginPath(); c.arc(X + W / 2, Y + 2, 18, 0, 7); c.fill();
      c.save(); c.translate(X + W / 2, Y + 2);
      if (ok && g.alloc.life > 0) c.rotate(clock * 7);
      c.fillStyle = '#9ff0d6';
      for (var b = 0; b < 4; b++) { c.rotate(Math.PI / 2); c.fillRect(-3, -16, 6, 14); }
      c.restore();
      A(c, ok ? '#7dffa0' : '#ff5a5a', X + W - 8, Y - 16, 4, 4);
    } else {
      A(c, '#2b3040', X + 13, Y - 18, 6, H + 18);
      var lightsOn = ok && g.alloc.green > 0;
      A(c, lightsOn ? '#ffc6ee' : '#555a68', X - 8, Y - 24, 48, 8);
      if (lightsOn) light(c, X + 16, Y - 12, 90, '#ff8ad8', 0.3);
    }
    if (!ok) {
      light(c, X + W / 2, Y, 40, '#ff5a3a', blink ? 0.55 : 0.2);
      if (blink) {
        A(c, '#ffd166', X + W / 2 - 2, Y - 34, 4, 12); A(c, '#ffd166', X + W / 2 - 2, Y - 20, 4, 4);
        A(c, '#ff7b54', X + 3, Y - 2, 5, 3); A(c, '#ffd166', X + W - 8, Y + 4, 3, 3);
      }
    }
  }

  function drawPlant(c, x, y, stage, crop, dry) {
    var leaf = dry ? '#a6995a' : '#5fd068', dark = dry ? '#7f7344' : '#2f8f4b', hi = dry ? '#c3b56f' : '#a7f39f';
    if (stage < 1) return;
    if (stage === 1) { A(c, dark, x + 3, y - 2, 2, 5); A(c, leaf, x, y - 4, 4, 3); A(c, leaf, x + 4, y - 5, 4, 3); return; }
    if (stage === 2) {
      A(c, dark, x + 3, y - 6, 2, 8); A(c, leaf, x - 3, y - 8, 7, 4); A(c, leaf, x + 3, y - 10, 7, 4); A(c, hi, x, y - 8, 3, 1);
      return;
    }
    if (crop === 'potato') {
      A(c, dark, x - 4, y - 12, 16, 14); A(c, leaf, x - 6, y - 15, 20, 10); A(c, hi, x - 3, y - 14, 6, 3);
      if (stage === 4) { A(c, '#d9b070', x - 3, y, 6, 4); A(c, '#c49654', x + 4, y - 1, 6, 5); A(c, '#f4e3a6', x + 1, y - 18, 3, 3); }
      return;
    }
    A(c, dark, x - 6, y - 8, 20, 10); A(c, leaf, x - 7, y - 12, 22, 10); A(c, hi, x - 4, y - 11, 6, 3); A(c, leaf, x - 3, y - 15, 13, 5);
    if (stage === 4) { A(c, '#d14a7a', x - 7, y - 11, 4, 3); A(c, '#d14a7a', x + 10, y - 8, 4, 3); A(c, '#ff9bbf', x + 3, y - 14, 3, 2); }
  }

  function drawPlot(c, g, st) {
    var X = st.x * TS, Y = st.y * TS, W = st.w * TS, H = st.h * TS, p = g.plots[st.index], dry = p.state === 'growing' && p.dry >= 0.75;
    A(c, 'rgba(0,0,0,.3)', X + 3, Y + H, W, 6);
    A(c, '#7a5433', X - 3, Y - 3, W + 6, H + 8); A(c, '#a0764c', X - 3, Y - 3, W + 6, 3); A(c, '#5b3e25', X - 3, Y + H + 2, W + 6, 3);
    A(c, dry ? '#8a6e4c' : '#3f2a1a', X, Y, W, H);
    for (var i = 0; i < 24; i++) A(c, dry ? '#a2845e' : '#5a3d27', X + Art.hash(i, st.index) * (W - 3), Y + Art.hash(i + 40, st.index) * (H - 2), 3, 2);
    var need = p.crop === 'potato' ? 1.6 : 1;
    var stage = p.state === 'empty' ? 0 : p.state === 'ripe' ? 4 : 1 + Math.min(2, Math.floor((p.grow / need) * 3));
    [[12, 24], [40, 24], [12, 54], [40, 54]].forEach(function (q) { drawPlant(c, X + q[0], Y + q[1], stage, p.crop, dry); });
    if (p.state === 'ripe') light(c, X + W / 2, Y + H / 2, 44, '#ffe066', 0.16 + Math.sin(clock * 4) * 0.06);
  }

  function screen(c, X, Y, W, H) {
    A(c, '#0a1022', X, Y, W, H); A(c, '#3a4a78', X - 3, Y - 3, W + 6, 3); A(c, '#3a4a78', X - 3, Y + H, W + 6, 3); A(c, '#3a4a78', X - 3, Y, 3, H); A(c, '#3a4a78', X + W, Y, 3, H);
    A(c, '#2c3650', X + W / 2 - 8, Y + H + 3, 16, 7);
  }

  function drawStation(c, g, st, blink) {
    var X = st.x * TS, Y = st.y * TS, W = st.w * TS, H = st.h * TS;
    switch (st.kind) {
      case 'panel': drawPanel(c, g, st); break;
      case 'device': drawDevice(c, g, st, blink); break;
      case 'plot': drawPlot(c, g, st); break;
      case 'drill': {
        c.fillStyle = 'rgba(30,10,4,.38)'; c.fillRect(X + 6, Y + H - 4, W, 10);
        A(c, '#565d70', X, Y + H - 12, W, 12);
        A(c, '#d97f3f', X + 10, Y - 36, 5, H + 26); A(c, '#d97f3f', X + W - 15, Y - 36, 5, H + 26);
        for (var i = 0; i < 6; i++) A(c, '#a85f2d', X + 12, Y - 30 + i * 14, W - 24, 2);
        A(c, '#ffc15a', X + 4, Y - 42, W - 8, 7);
        var off = Math.floor(clock * 10) % 6;
        A(c, '#d8dde8', X + W / 2 - 3, Y - 20 + off, 6, 44);
        A(c, '#8fd4ff', X + 2, Y + H - 12, 14, 9);
        break;
      }
      case 'valve': {
        A(c, '#264c74', X, Y - 18, W, H + 18); A(c, '#3e78b0', X, Y - 18, W, 3);
        var lvl = g.wall / 70;
        A(c, '#13233a', X + 6, Y - 12, W - 28, 34); A(c, '#58b7f0', X + 6, Y - 12 + 34 * (1 - lvl), W - 28, 34 * lvl); A(c, '#a6dcff', X + 8, Y - 12 + 34 * (1 - lvl), 5, 34 * lvl);
        c.strokeStyle = '#ff6b5a'; c.lineWidth = 3; c.beginPath(); c.arc(X + W - 13, Y + 4, 8, 0, 7); c.stroke();
        A(c, '#ff6b5a', X + W - 14, Y - 4, 2, 16); A(c, '#ff6b5a', X + W - 21, Y + 3, 16, 2);
        break;
      }
      case 'medbay': {
        A(c, '#d9dfe9', X, Y - 8, W, H + 8); A(c, '#f7f9fc', X, Y - 8, W, 3); A(c, '#a4aec0', X, Y + H - 4, W, 4);
        A(c, '#3f9fe8', X + 4, Y - 3, 30, 22); A(c, '#ffffff', X + 4, Y - 3, 12, 22);
        A(c, '#10182c', X + W - 26, Y - 22, 22, 18);
        for (var e = 0; e < 18; e++) A(c, '#6fe08a', X + W - 24 + e, Y - 14 + (((e + Math.floor(clock * 14)) % 9 === 0) ? -5 : 0), 1, 2);
        A(c, '#e0504a', X + W - 16, Y + 8, 8, 3); A(c, '#e0504a', X + W - 13, Y + 5, 3, 9);
        break;
      }
      case 'bench': {
        A(c, 'rgba(0,0,0,.28)', X + 2, Y + H, W, 5);
        A(c, '#dfe3ec', X, Y - 2, W, H); A(c, '#ffffff', X, Y - 2, W, 3); A(c, '#9aa2b4', X, Y + H - 4, W, 6);
        A(c, '#5a6275', X + 12, Y - 18, 6, 22); A(c, '#2e3347', X + 8, Y + 4, 14, 4); A(c, '#2e3347', X + 8, Y - 20, 12, 5); A(c, '#58e0ff', X + 8, Y - 15, 4, 2);
        A(c, '#11182c', X + 34, Y - 16, 24, 18); A(c, g.alloc.science > 0 ? '#6fe08a' : '#333', X + 36, Y - 14, 20, 14);
        if (g.alloc.science > 0) light(c, X + 46, Y - 7, 26, '#6fe08a', 0.3);
        break;
      }
      case 'uplink': {
        A(c, '#242a3f', X, Y - 22, W, H + 22); A(c, '#3c4562', X, Y - 22, W, 3);
        A(c, '#0a1022', X + 5, Y - 16, W - 10, 22);
        var on = g.radioOn();
        for (var b = 0; b < 8; b++) A(c, on ? '#58b7f0' : '#333', X + 8 + b * 6, Y + 3 - (on ? 4 + 12 * Art.vnoise(b, clock * 3) : 3), 4, on ? 4 + 12 * Art.vnoise(b, clock * 3) : 3);
        if (g.dataHeld > 0 && blink) { A(c, '#ffd166', X + W - 12, Y + 12, 7, 7); light(c, X + W - 9, Y + 15, 22, '#ffd166', 0.5); }
        break;
      }
      case 'rock': {
        var rk = g.rocks[st.index];
        if (!rk.active) { A(c, '#8a4a2c', X + 7, Y + 18, 16, 8); break; }
        var col = ['#7fd6ff', '#7fd6ff', '#ffd166', '#ffd166', '#ff8ad0'][st.index];
        c.fillStyle = 'rgba(30,10,4,.4)'; c.beginPath(); c.ellipse(X + 17, Y + 27, 14, 5, 0, 0, 7); c.fill();
        A(c, '#8d7a68', X + 4, Y + 10, 24, 17); A(c, '#b9a48c', X + 6, Y + 8, 18, 12); A(c, '#d9c8b2', X + 8, Y + 8, 8, 3);
        A(c, col, X + 11, Y + 12, 10, 3); A(c, col, X + 8, Y + 17, 13, 2);
        var tw = Math.sin(clock * 5 + st.index) > 0.3;
        if (tw) { A(c, '#fff', X + 24, Y + 4, 2, 6); A(c, '#fff', X + 22, Y + 6, 6, 2); }
        light(c, X + 16, Y + 16, 30, col, 0.22);
        break;
      }
      case 'sun': {
        screen(c, X + 4, Y - 44, W - 8, 62);
        var hot = g.storm && (g.storm.stage === 'flare' || g.storm.stage === 'active');
        var cx = X + W / 2, cy = Y - 13, r = 22 + (hot && blink ? 3 : 0);
        c.fillStyle = '#ff9a2e'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
        c.fillStyle = '#ffd166'; c.beginPath(); c.arc(cx, cy, r - 6, 0, 7); c.fill();
        c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(cx - 5, cy - 6, 8, 0, 7); c.fill();
        if (hot) { c.fillStyle = '#ff5a3a'; c.fillRect(cx + r - 2, cy - 5, 16, 5); light(c, cx, cy, 70, '#ff9a2e', 0.6); }
        else light(c, cx, cy, 44, '#ffb347', 0.28);
        break;
      }
      case 'dustwatch': {
        screen(c, X + 4, Y - 44, W - 8, 62);
        var mx = X + W / 2, my = Y - 13;
        c.fillStyle = '#c96a3a'; c.beginPath(); c.arc(mx, my, 22, 0, 7); c.fill();
        c.save(); c.beginPath(); c.arc(mx, my, 22, 0, 7); c.clip();
        A(c, '#e8a87c', mx - 22 + (clock * 8) % 30, my - 12, 18, 6); A(c, '#8a4a2c', mx - 30 + (clock * 8) % 44, my + 4, 26, 7);
        A(c, '#f4f0ea', mx - 10, my - 22, 20, 4);
        c.restore();
        break;
      }
      case 'analysis': {
        screen(c, X + 4, Y - 44, W - 8, 62);
        for (var q = 0; q < 10; q++) {
          var hh = 8 + 34 * Art.vnoise(q * 0.7, Math.floor(clock * 2) * 0.2);
          A(c, q % 2 ? '#6fe08a' : '#58b7f0', X + 12 + q * 7, Y + 12 - hh, 5, hh);
        }
        if (g.dataAtEarth > 0 && blink) { A(c, '#ffd166', X + 10, Y - 40, 8, 8); light(c, X + 14, Y - 36, 26, '#ffd166', 0.5); }
        break;
      }
      case 'nap': {
        A(c, 'rgba(0,0,0,.3)', X + 3, Y + H - 2, W, 6);
        A(c, '#6d4a9e', X, Y - 10, W, H + 8); A(c, '#8a64c0', X, Y - 10, W, 4); A(c, '#a584d8', X + 8, Y + 2, W - 16, 14);
        A(c, '#e8e9f0', X + 10, Y + 2, 18, 11);
        A(c, '#f4f0ea', X + W + 3, Y + 4, 9, 9); A(c, '#5a3a1e', X + W + 4, Y + 5, 7, 3);
        break;
      }
      case 'filter': {
        // Air filter box: a white mesh that turns orange with Mars dust until it is cleaned.
        var dirty = !g.filteredToday;
        A(c, 'rgba(0,0,0,.28)', X + 2, Y + H, W, 5);
        A(c, '#3c4562', X, Y - 22, W, H + 22); A(c, '#56608a', X, Y - 22, W, 3);
        A(c, dirty ? '#c08a5e' : '#e4e7f0', X + 6, Y - 16, W - 12, 26);
        for (var fl = 0; fl < 6; fl++) A(c, dirty ? '#9a6440' : '#b8bfd0', X + 8 + fl * 9, Y - 16, 2, 26);
        c.save(); c.translate(X + W / 2, Y + 18); c.rotate(clock * 4); c.fillStyle = '#9ff0d6';
        for (var fb = 0; fb < 3; fb++) { c.rotate(Math.PI * 2 / 3); c.fillRect(-2, -8, 4, 8); }
        c.restore();
        break;
      }
      case 'compost': {
        // Compost bin: food scraps become plant food.
        A(c, 'rgba(0,0,0,.28)', X + 2, Y + H, W, 5);
        A(c, '#2f6b3a', X + 4, Y - 14, W - 8, H + 12); A(c, '#4f9a59', X + 2, Y - 18, W - 4, 6);
        A(c, '#5a3d27', X + 10, Y - 8, W - 20, 10); A(c, '#7a5433', X + 14, Y - 6, 8, 4); A(c, '#e0b04a', X + 30, Y - 7, 6, 3); A(c, '#c94a3a', X + 40, Y - 5, 5, 3);
        A(c, '#a7f39f', X + W / 2 - 6, Y + 6, 12, 8); A(c, '#2f8f4b', X + W / 2 - 1, Y + 10, 2, 8);
        break;
      }
      case 'gym': {
        // Treadmill with a bungee harness, like the one astronauts use in space.
        A(c, 'rgba(0,0,0,.3)', X + 2, Y + H, W, 6);
        A(c, '#262b3b', X, Y + 6, W, H - 6); A(c, '#3a4058', X + 4, Y + 8, W - 8, H - 14);
        var belt = Math.floor(clock * 30) % 8;
        for (var gb = 0; gb < 8; gb++) A(c, '#4c5370', X + 6 + ((gb * 8 + belt) % (W - 12)), Y + 10, 2, H - 18);
        A(c, '#6c7488', X + W - 10, Y - 26, 5, 34); A(c, '#3fa3ea', X + W - 22, Y - 28, 18, 6);
        A(c, '#10182c', X + 6, Y - 22, 22, 14); A(c, '#6fe08a', X + 9, Y - 18, 4 + (Math.floor(clock * 3) % 3) * 5, 4);
        break;
      }
      case 'suits': {
        // A space suit on its rack, with a little checklist light.
        var ok2 = g.suitsToday;
        A(c, 'rgba(0,0,0,.28)', X + 2, Y + H, W, 5);
        A(c, '#4c5370', X + 2, Y - 30, W - 4, 4); A(c, '#4c5370', X + W / 2 - 2, Y - 30, 4, 8);
        A(c, '#eef0f6', X + 18, Y - 22, 28, 30); A(c, '#ffffff', X + 18, Y - 22, 28, 4);
        A(c, '#cfd4e0', X + 12, Y - 18, 6, 22); A(c, '#cfd4e0', X + 46, Y - 18, 6, 22);
        A(c, '#cfd4e0', X + 20, Y + 8, 10, 14); A(c, '#cfd4e0', X + 34, Y + 8, 10, 14);
        A(c, '#58b7f0', X + 26, Y - 14, 12, 7); A(c, '#ec8f2f', X + 22, Y - 4, 20, 3);
        A(c, ok2 ? '#6fe08a' : '#ffd166', X + W - 10, Y - 26, 6, 6);
        if (!ok2) A(c, '#c94a3a', X + 36, Y + 2, 3, 3);
        break;
      }
      case 'waterloop': {
        // Water recycler: a tank of clean water, a pipe and dripping drops.
        A(c, 'rgba(0,0,0,.28)', X + 2, Y + H, W, 5);
        A(c, '#2c3650', X + 2, Y - 24, W - 4, H + 24); A(c, '#3e4a6c', X + 2, Y - 24, W - 4, 3);
        A(c, '#13233a', X + 8, Y - 18, 22, 32); A(c, '#58b7f0', X + 8, Y - 18 + 32 * (1 - Math.min(1, g.water / 80)), 22, 32 * Math.min(1, g.water / 80));
        A(c, '#8a96b8', X + 30, Y - 10, 18, 4); A(c, '#8a96b8', X + 46, Y - 10, 4, 18);
        var drip = Math.floor(clock * 12) % 10;
        A(c, '#a6dcff', X + 46, Y + 10 + drip, 4, 4);
        A(c, '#6fe08a', X + 12, Y - 22, 4, 3);
        break;
      }
      case 'drive': {
        // Rover driver's screen: a little rover and the path it will follow.
        screen(c, X + 4, Y - 44, W - 8, 62);
        A(c, '#6a3220', X + 6, Y - 42, W - 12, 58);
        for (var dp = 0; dp < 6; dp++) A(c, '#ffe066', X + 16 + dp * 12, Y - 4 - dp * 4, 4, 4);
        var rx = X + 14 + (clock * 10) % 50;
        A(c, '#e4e7f0', rx, Y - 22, 18, 9); A(c, '#2a2d38', rx, Y - 13, 5, 5); A(c, '#2a2d38', rx + 13, Y - 13, 5, 5); A(c, '#58b7f0', rx + 7, Y - 28, 4, 6);
        break;
      }
      case 'twin': {
        A(c, 'rgba(0,0,0,.35)', X + 4, Y + H, W, 6);
        A(c, '#c9a06e', X, Y + 8, W, H - 8); A(c, '#e0bb8a', X, Y + 8, W, 3); A(c, '#8a6a42', X, Y + H - 5, W, 5);
        A(c, '#2a2d38', X + 22, Y + 34, 12, 12); A(c, '#2a2d38', X + 62, Y + 34, 12, 12); A(c, '#2a2d38', X + 42, Y + 36, 12, 10);
        A(c, '#e4e7f0', X + 24, Y + 18, 48, 18); A(c, '#ffffff', X + 24, Y + 18, 48, 3); A(c, '#2c4a8a', X + 28, Y + 12, 40, 6);
        A(c, '#c9cede', X + 46, Y, 4, 14); A(c, '#58b7f0', X + 40, Y - 4, 16, 6);
        break;
      }
    }
  }

  // ---- Doors --------------------------------------------------------------
  function drawDoors(c, g) {
    World.DOORS.forEach(function (d, i) {
      var cx = d.vertical ? d.x + 0.5 : d.x + d.n / 2, cy = d.vertical ? d.y + d.n / 2 : d.y + 0.5, near = false;
      ['engineer', 'farmer', 'doctor'].forEach(function (r) {
        var cr = g.crew[r];
        if (Math.abs(cr.x - cx) < 2.6 && Math.abs(cr.y - cy) < 2.6) near = true;
      });
      doorOpen[i] += ((near ? 1 : 0) - doorOpen[i]) * 0.2;
      var X = d.x * TS, Y = d.y * TS, len = d.n * TS, half = (len / 2) * (1 - doorOpen[i]);
      if (half < 1) return;
      if (d.vertical) {
        A(c, '#7c869c', X + 8, Y, 16, half); A(c, '#7c869c', X + 8, Y + len - half, 16, half);
        A(c, '#a6afc4', X + 8, Y, 4, half); A(c, '#a6afc4', X + 8, Y + len - half, 4, half);
      } else {
        A(c, '#7c869c', X, Y + 6, half, 22); A(c, '#7c869c', X + len - half, Y + 6, half, 22);
        A(c, '#a6afc4', X, Y + 6, half, 4); A(c, '#a6afc4', X + len - half, Y + 6, half, 4);
      }
    });
  }

  // ---- Crew ---------------------------------------------------------------
  function nameTag(c, x, y, look) {
    c.font = '700 13px ' + Art.FONT;
    var w = Math.ceil(c.measureText(look.name).width) + 10;
    A(c, '#16121f', x - w / 2 - 1, y - 1, w + 2, 18);
    A(c, look.color || '#2a2f4a', x - w / 2, y, w, 16);
    Art.text(c, look.name, x, y + 13, 13, look.color && look.color !== '#f3f4f8' ? '#16121f' : '#ffffff', 'center', 700);
  }

  // Pose and expression from the crew member's real state (rendering only; no game rules).
  function crewLook(g, crew) {
    var danger = g && g.alert === 'active' && crew.role !== 'earth' && crew.zone !== 'shelter';
    var pose = crew.mini ? 'work' : crew.moving ? 'walk' : danger ? 'danger' : 'idle';
    var expression = crew.hurtFlash > 0 ? 'surprised' : crew.mini ? 'focused' : danger || (g && g.alert) || crew.health < 30 ? 'worried' : 'smiling';
    return { pose: pose, expression: expression };
  }

  function drawCrew(c, crew, look, g) {
    var frame = crew.moving ? [1, 0, 3, 0][Math.floor(crew.step) % 4] : 0;
    var tint = look && look.color, outside = crew.zone === 'outside';
    var CA = root.CrewAvatar;
    if (CA) {
      // The new crew are vector characters drawn live, so they stay sharp at any zoom.
      // Same footprint as before: feet on (x, y), about 48 world units tall.
      var vis = { view: crew.dir === 'up' ? 'back' : crew.dir === 'down' ? 'front' : 'side', facing: crew.dir === 'left' ? -1 : 1, helmet: outside, tint: outside && tint ? tint : null };
      if (crew.down || crew.resting) {
        c.save(); c.translate(crew.x * TS, crew.y * TS - 6); c.rotate(Math.PI / 2);
        CA.draw(c, crew.role, -24, -30, 48, 60, Object.assign(vis, { view: 'front', pose: 'fail', expression: crew.down ? 'sad' : 'neutral' }));
        c.restore();
        if (crew.down && Math.sin(clock * 6) > -0.3) {
          A(c, '#16121f', crew.x * TS - 9, crew.y * TS - 46, 18, 22);
          A(c, '#ff5a5a', crew.x * TS - 7, crew.y * TS - 44, 14, 18);
          A(c, '#fff', crew.x * TS - 1, crew.y * TS - 42, 3, 9); A(c, '#fff', crew.x * TS - 1, crew.y * TS - 31, 3, 3);
        }
        return;
      }
      var lk = crewLook(g, crew);
      // Overlays (health bar, name) sit just above the head, which is a little taller than the old sprite.
      var X0 = Math.round(crew.x * TS - 18), Y0 = Math.round(crew.y * TS - 51);
      c.fillStyle = 'rgba(0,0,0,.32)';
      c.beginPath(); c.ellipse(crew.x * TS, crew.y * TS + 3, 13, 5, 0, 0, 7); c.fill();
      CA.draw(c, crew.role, crew.x * TS - 24, crew.y * TS - 56, 48, 60, Object.assign(vis, { pose: lk.pose, t: crew.moving ? crew.step / 4 : clock, expression: lk.expression }));
      crewOverlays(c, crew, look, X0, Y0);
      return;
    }
    var sp = Art.sprite(crew.role, crew.dir, frame, outside, tint);
    if (crew.down || crew.resting) {
      // Lying down, with a call for help above.
      c.save();
      c.translate(crew.x * TS, crew.y * TS - 6);
      c.rotate(Math.PI / 2);
      Art.drawSmooth(c, Art.sprite(crew.role, 'down', 0, crew.zone === 'outside', tint), -18, -24, 36, 48);
      c.restore();
      if (crew.down && Math.sin(clock * 6) > -0.3) {
        A(c, '#16121f', crew.x * TS - 9, crew.y * TS - 46, 18, 22);
        A(c, '#ff5a5a', crew.x * TS - 7, crew.y * TS - 44, 14, 18);
        A(c, '#fff', crew.x * TS - 1, crew.y * TS - 42, 3, 9); A(c, '#fff', crew.x * TS - 1, crew.y * TS - 31, 3, 3);
      }
      return;
    }
    var X = Math.round(crew.x * TS - 18), Y = Math.round(crew.y * TS - 44);
    c.fillStyle = 'rgba(0,0,0,.32)';
    c.beginPath(); c.ellipse(crew.x * TS, crew.y * TS + 3, 13, 5, 0, 0, 7); c.fill();
    c.drawImage(sp, X, Y, 36, 48);
    crewOverlays(c, crew, look, X, Y);
  }

  // Things drawn over a crew member: carried sample, hurt flash, health bar, name, robot progress.
  function crewOverlays(c, crew, look, X, Y) {
    if (crew.carrying) { A(c, '#16121f', X + 9, Y - 13, 18, 13); A(c, '#9a8672', X + 10, Y - 12, 16, 11); A(c, '#d9c8b2', X + 12, Y - 12, 7, 3); A(c, '#7fd6ff', X + 15, Y - 8, 7, 2); }
    if (crew.hurtFlash > 0 && Math.sin(clock * 30) > 0) {
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.5; c.fillStyle = '#ff3a3a'; c.fillRect(X + 4, Y + 2, 28, 44); c.restore();
    }
    // A small health bar over every Mars crew member.
    if (crew.role !== 'earth') {
      A(c, '#16121f', X + 3, Y - 7, 30, 6);
      A(c, crew.health < 30 ? '#ff5a5a' : '#6fe08a', X + 4, Y - 6, 28 * crew.health / 100, 4);
      A(c, '#a05ad8', X + 4 + 28 * (1 - Math.min(100, crew.dose) / 100), Y - 6, 28 * Math.min(100, crew.dose) / 100, 4);
    }
    if (look && look.name) nameTag(c, crew.x * TS, Y - 26, look);
    if (crew.work > 0 && crew.workMax && crew.player == null) {
      A(c, '#101426', X + 3, Y - 14, 30, 5); A(c, ROLE_COLOR[crew.role], X + 4, Y - 13, 28 * Math.min(1, crew.work / crew.workMax), 3);
    }
  }

  function updateCosmetics(g, dt) {
    footTimer += dt;
    if (footTimer > 0.22) {
      footTimer = 0;
      ['engineer', 'farmer', 'doctor'].forEach(function (r) {
        var cr = g.crew[r];
        if (cr.moving && cr.zone === 'outside') {
          footprints.push({ x: cr.x * TS + (Math.floor(cr.step) % 2 ? 4 : -4), y: cr.y * TS + 2, age: 0 });
          if (footprints.length > 220) footprints.shift();
        }
      });
    }
    for (var i = footprints.length - 1; i >= 0; i--) {
      footprints[i].age += dt;
      if (footprints[i].age > 16) footprints.splice(i, 1);
    }
    // Dusty rolls along behind the first crew member on Mars.
    var lead = g.crew.engineer;
    g.players.forEach(function (p) { var cr = g.crew[p.roles[0]]; if (cr.role !== 'earth' && lead === g.crew.engineer) lead = cr; });
    // Old positions for the camera mission control sees, because light takes time.
    feedTimer += dt;
    if (feedTimer > 0.4) {
      feedTimer = 0;
      feed.push({ t: g.time, crew: ['engineer', 'farmer', 'doctor'].map(function (r) { var cr = g.crew[r]; return [cr.x, cr.y, r, cr.down]; }) });
      if (feed.length > 120) feed.shift();
    }
    var dx = lead.x - 1.4 - dusty.x, dy = lead.y + 0.7 - dusty.y, dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 5) { dusty.x = lead.x - 1.4; dusty.y = lead.y + 0.7; }
    dusty.moving = dist > 0.5;
    if (dist > 5) dusty.moving = false;
    else if (dist > 0.5) {
      var nx = dusty.x + dx / dist * 3.8 * dt, ny = dusty.y + dy / dist * 3.8 * dt;
      if (World.free(nx, dusty.y, 0.2)) dusty.x = nx;
      if (World.free(dusty.x, ny, 0.2)) dusty.y = ny;
      dusty.step += dt * 8;
      dusty.dir = dx >= 0 ? 1 : -1;
    }
  }

  // ---- Things the crew built (game.js: build) ----------------------------------
  function drawBuilt(c, g) {
    if (!g.built || !g.built.length) return;
    if (g.has('solar')) {
      var X = 44 * TS, Y = 6 * TS;
      c.fillStyle = 'rgba(30,10,4,.38)'; c.fillRect(X + 10, Y + 66, 160, 10);
      A(c, '#565d70', X + 74, Y + 62, 12, 14);
      A(c, '#22273a', X - 4, Y - 4, 168, 72); A(c, '#ffd166', X - 4, Y - 4, 168, 2);
      for (var i = 0; i < 10; i++) for (var j = 0; j < 4; j++) A(c, ['#1f3f8f', '#24489f', '#2a53b3'][(i + j) % 3], X + i * 16 + 1, Y + j * 16 + 1, 14, 14);
      var sheen = (clock * 50) % 240 - 40;
      c.save(); c.beginPath(); c.rect(X, Y, 160, 64); c.clip();
      c.fillStyle = 'rgba(190,225,255,.25)';
      c.beginPath(); c.moveTo(X + sheen, Y); c.lineTo(X + sheen + 18, Y); c.lineTo(X + sheen - 10, Y + 64); c.lineTo(X + sheen - 28, Y + 64); c.fill();
      c.restore();
    }
    if (g.has('garden')) {
      [[26, 22, '#ff6b9a'], [26, 23, '#ffd166'], [26, 24, '#c792ea']].forEach(function (p) {
        var X = p[0] * TS, Y = p[1] * TS, sway = Math.sin(clock * 2 + p[1]) * 1.5;
        A(c, 'rgba(0,0,0,.3)', X + 6, Y + 26, 22, 5); A(c, '#b5764a', X + 8, Y + 16, 16, 12); A(c, '#d29465', X + 7, Y + 14, 18, 4);
        A(c, '#3ea155', X + 15, Y + 2, 2, 13); A(c, '#58c868', X + 10 + sway, Y + 6, 6, 4);
        A(c, p[2], X + 11 + sway, Y - 4, 10, 8); A(c, '#fff3b0', X + 14 + sway, Y - 1, 4, 3);
      });
    }
    if (g.has('tank')) {
      var tx = 45 * TS + 4, ty = 21 * TS;
      c.fillStyle = 'rgba(30,10,4,.4)'; c.fillRect(tx + 6, ty + 58, 52, 8);
      A(c, '#2f5f8e', tx, ty - 6, 56, 64); A(c, '#58a7e0', tx + 4, ty - 2, 48, 56); A(c, '#a6dcff', tx + 8, ty, 8, 50); A(c, '#20456a', tx, ty + 54, 56, 6);
      A(c, '#20456a', tx + 22, ty - 12, 12, 8);
    }
    if (g.has('flag')) {
      var fx = 34 * TS + 10, fy = 10 * TS + 28;
      A(c, 'rgba(30,10,4,.4)', fx - 4, fy - 2, 14, 5);
      A(c, '#c7cad6', fx, fy - 70, 4, 70);
      for (var k = 0; k < 8; k++) {
        var wave = Math.sin(clock * 5 + k * 0.7) * 3;
        A(c, k % 4 < 2 ? '#ffd166' : '#62d873', fx + 4 + k * 5, fy - 68 + wave, 5, 26);
      }
      A(c, '#ffffff', fx + 16, fy - 60 + Math.sin(clock * 5 + 2) * 3, 10, 10);
    }
    if (g.has('lamps')) {
      [[26, 10], [26, 28], [34, 28]].forEach(function (p) {
        var lx = p[0] * TS + 16, ly = p[1] * TS + 24;
        A(c, '#4a4f60', lx - 2, ly - 40, 4, 40); A(c, '#2a2d38', lx - 6, ly - 4, 12, 4);
        A(c, '#ffe28a', lx - 5, ly - 46, 10, 8);
        light(c, lx, ly - 42, 46, '#ffd166', 0.35 + Math.sin(clock * 3 + p[0]) * 0.05);
      });
    }
    if (g.has('rover')) {
      var rx = 47 * TS, ry = 27 * TS, sp = Art.rover(0);
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(rx + 26, ry + 46, 26, 7, 0, 0, 7); c.fill();
      c.drawImage(sp, rx - 1, ry - 1, 54, 49);
      if (Math.sin(clock * 4) > 0) A(c, '#ff6b6b', rx + 36, ry + 6, 4, 4);
    }
  }

  // Dusty in the world: the same layered character as every other screen, drawn as vectors so it
  // stays sharp at any zoom. About the height of a crew member.
  function drawDusty(c) {
    var X = Math.round(dusty.x * TS), Y = Math.round(dusty.y * TS);
    c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(X, Y + 3, 13, 4, 0, 0, 7); c.fill();
    if (!root.DustyAvatar) return;
    c.save();
    c.imageSmoothingEnabled = true;
    root.DustyAvatar.draw(c, X - 21, Y - 46, 42, 49, { mode: 'full', flip: dusty.dir < 0, moving: dusty.moving });
    c.restore();
  }

  // ---- One player's view ---------------------------------------------------
  function drawView(c, g, view, ui, player) {
    var t = root.I18N.t.bind(root.I18N);
    var crew = g.crew[player.roles[player.active]];
    var s = view.scale, onEarth = crew.role === 'earth';
    var rx0 = onEarth ? 62 * TS : 0, rx1 = onEarth ? 87 * TS : 60 * TS;
    var ry0 = onEarth ? 6 * TS : 0, ry1 = onEarth ? 29 * TS : World.H * TS;
    var vw = view.w / s, vh = view.h / s;
    var camX = crew.x * TS, camY = crew.y * TS;
    camX = (rx1 - rx0) <= vw ? (rx0 + rx1) / 2 : Math.max(rx0 + vw / 2, Math.min(rx1 - vw / 2, camX));
    camY = (ry1 - ry0) <= vh ? (ry0 + ry1) / 2 : Math.max(ry0 + vh / 2, Math.min(ry1 - vh / 2, camY));
    var blink = Math.sin(clock * 5) > 0;

    c.save();
    c.beginPath(); c.rect(view.x, view.y, view.w, view.h); c.clip();
    A(c, '#05060c', view.x, view.y, view.w, view.h);
    c.save();
    c.translate(Math.round(view.x + view.w / 2 - camX * s), Math.round(view.y + view.h / 2 - camY * s));
    c.scale(s, s);
    c.imageSmoothingEnabled = false;
    c.drawImage(mapCanvas, 0, 0);

    if (!onEarth) {
      for (var f = 0; f < footprints.length; f++) {
        var fp = footprints[f];
        c.fillStyle = 'rgba(55,22,10,' + (0.42 * (1 - fp.age / 16)) + ')';
        c.fillRect(fp.x - 3, fp.y - 2, 7, 4);
      }
      drawDoors(c, g);
    }

    var ids = Object.keys(World.STATIONS);
    var goalId = crew.mini || crew.down || crew.resting ? null : g.goalFor(crew);
    for (var i = 0; i < ids.length; i++) {
      var st = World.STATIONS[ids[i]];
      if (!!st.earth !== onEarth) continue;
      drawStation(c, g, st, blink);
    }
    if (!onEarth) { drawBuilt(c, g); drawHazardsBelow(c, g, blink); }
    // Crew are sorted so nearer people stand in front.
    var list = ['engineer', 'farmer', 'doctor', 'earth'].map(function (r) { return g.crew[r]; })
      .filter(function (cr) { return (cr.role === 'earth') === onEarth; })
      .sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (cr) { drawCrew(c, cr, cr.player != null && g.looks ? g.looks[cr.player] : null, g); });
    if (!onEarth) { drawDusty(c); drawHazardsAbove(c, g); }

    // Marker over the next job.
    if (goalId) {
      var gs = g.st(goalId);
      var gx = (gs.x + gs.w / 2) * TS, gy = gs.y * TS - (gs.kind === 'sun' || gs.kind === 'dustwatch' || gs.kind === 'analysis' || gs.kind === 'drive' ? 60 : 34) + Math.sin(clock * 6) * 4;
      light(c, gx, gy + 10, 34, '#ffe066', 0.4);
      c.fillStyle = '#16121f';
      c.beginPath(); c.moveTo(gx - 13, gy - 3); c.lineTo(gx + 13, gy - 3); c.lineTo(gx, gy + 15); c.fill();
      c.fillStyle = '#ffe066';
      c.beginPath(); c.moveTo(gx - 9, gy - 1); c.lineTo(gx + 9, gy - 1); c.lineTo(gx, gy + 11); c.fill();
    }
    // Small tag dot above the player, unless their name is already there.
    var myLook = g.looks && g.looks[player.id];
    if (!(myLook && myLook.name)) {
      A(c, '#16121f', crew.x * TS - 5, crew.y * TS - 58, 10, 8);
      A(c, ROLE_COLOR[crew.role], crew.x * TS - 4, crew.y * TS - 57, 8, 6);
    }
    c.restore();

    if (!onEarth) drawWeather(c, g, view, crew);

    // Vignette gives the picture some depth.
    var vg = c.createRadialGradient(view.x + view.w / 2, view.y + view.h / 2, Math.min(view.w, view.h) * 0.45, view.x + view.w / 2, view.y + view.h / 2, Math.max(view.w, view.h) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.42)');
    c.fillStyle = vg; c.fillRect(view.x, view.y, view.w, view.h);

    // Arrow towards the next job when it is off to the side.
    if (goalId) {
      var st2 = g.st(goalId);
      var dx = (st2.x + st2.w / 2) - crew.x, dy = (st2.y + st2.h / 2) - crew.y;
      if (Math.sqrt(dx * dx + dy * dy) > 2.6) {
        var ang = Math.atan2(dy, dx), sx = view.x + view.w / 2 + (crew.x * TS - camX) * s, sy = view.y + view.h / 2 + (crew.y * TS - camY) * s - 14 * s;
        var rr = 42 * s + Math.sin(clock * 5) * 3 * s;
        c.save();
        c.translate(sx + Math.cos(ang) * rr, sy + Math.sin(ang) * rr);
        c.rotate(ang);
        c.fillStyle = '#ffe066'; c.strokeStyle = '#16121f'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(13, 0); c.lineTo(-9, -10); c.lineTo(-4, 0); c.lineTo(-9, 10); c.closePath();
        c.stroke(); c.fill();
        c.restore();
      }
    }

    drawHud(c, g, view, ui, player, crew, t, goalId);
    if (crew.mini) root.Mini.draw(c, crew.mini, view, crew, player);
    c.restore();
  }

  function drawWeather(c, g, view, crew) {
    var frac = g.t / g.dayLen, tint = null;
    if (g.phase !== 'day') frac = 0.3;
    if (frac < 0.1) tint = 'rgba(255,170,120,' + (0.14 * (1 - frac / 0.1)) + ')';
    else if (frac > 0.68) tint = 'rgba(24,46,120,' + (Math.min(1, (frac - 0.68) / 0.32) * 0.44) + ')'; // Mars sunsets look blue.
    if (tint) { c.fillStyle = tint; c.fillRect(view.x, view.y, view.w, view.h); }

    if (crew.zone === 'outside' || g.dustStorm > 0) {
      c.fillStyle = 'rgba(255,214,170,.5)';
      for (var i = 0; i < motes.length; i++) {
        var mo = motes[i];
        var x = ((mo.x + clock * 0.03 * mo.s) % 1) * view.w, y = ((mo.y + Math.sin(clock * 0.4 + mo.z * 6) * 0.02 + 1) % 1) * view.h;
        c.fillRect(view.x + x, view.y + y, 2, 2);
      }
    }
    if (g.dustStorm > 0) {
      c.save();
      c.globalAlpha = 0.2 + 0.25 * (g.eventDustStage == null ? 0.56 : [0.25, 0.55, 1, 0.72, 0.38][g.eventDustStage]);
      var tex = Art.dustTexture(), off = (clock * 70) % view.w;
      c.imageSmoothingEnabled = true;
      c.drawImage(tex, view.x - off, view.y, view.w, view.h);
      c.drawImage(tex, view.x + view.w - off, view.y, view.w, view.h);
      c.restore();
    }
    if (g.storm && g.storm.stage === 'active') {
      var zone = crew.zone, strength = zone === 'outside' ? 1 : zone === 'shelter' ? 0.18 : 0.5;
      var rg = c.createRadialGradient(view.x + view.w / 2, view.y + view.h / 2, view.h * 0.2, view.x + view.w / 2, view.y + view.h / 2, view.w * 0.7);
      rg.addColorStop(0, 'rgba(255,40,60,' + 0.05 * strength + ')');
      rg.addColorStop(1, 'rgba(255,30,50,' + (0.38 + 0.12 * Math.sin(clock * 6)) * strength + ')');
      c.fillStyle = rg; c.fillRect(view.x, view.y, view.w, view.h);
      var n = Math.floor(46 * strength * g.storm.level);
      c.lineWidth = 2;
      for (var q = 0; q < n; q++) {
        var px0 = Art.hash(q, 3), py0 = (Art.hash(q, 9) + clock * (0.8 + Art.hash(q, 5))) % 1;
        var X = view.x + px0 * view.w, Y = view.y + py0 * view.h;
        c.strokeStyle = 'rgba(255,190,190,.85)';
        c.beginPath(); c.moveTo(X, Y); c.lineTo(X - 5, Y - 20); c.stroke();
      }
    }
    if (g.eventRadiation && g.eventRadiation.active) {
      c.fillStyle = 'rgba(55,170,220,.055)'; c.fillRect(view.x, view.y, view.w, view.h);
      c.strokeStyle = 'rgba(117,224,255,.58)'; c.lineWidth = 1;
      for (var ep = 0; ep < 10; ep++) {
        var ex = (Art.hash(ep, 61) + clock * (0.035 + Art.hash(ep, 62) * 0.025)) % 1;
        var ey = (Art.hash(ep, 63) + clock * (0.06 + Art.hash(ep, 64) * 0.025)) % 1;
        c.beginPath(); c.moveTo(view.x + ex * view.w, view.y + ey * view.h); c.lineTo(view.x + ex * view.w - 5, view.y + ey * view.h - 9); c.stroke();
      }
    }
  }

  function drawHud(c, g, view, ui, player, crew, t, goalId) {
    var small = view.w < 620, fs = small ? 14 : 17, rtl = Art.isRtl();
    var pad = 8, side = rtl ? view.x + view.w - pad : view.x + pad, align = rtl ? 'right' : 'left';

    // Who you are and what to do next.
    var ps = small ? 36 : 44, name = t('role_' + crew.role);
    var look = g.looks && g.looks[player.id];
    var label = (look && look.name ? look.name + ' · ' : g.players.length > 1 ? 'P' + (player.id + 1) + ' · ' : '') + name;
    var next = null;
    if (crew.down) next = t('you_down');
    else if (crew.resting) next = t('you_rest');
    else if (crew.mini) next = t('act_' + crew.mini.action);
    else if (g.alert && crew.role !== 'earth' && crew.zone !== 'shelter') next = t('go_shelter');
    else if (g.alert && crew.role !== 'earth' && !goalId) next = t('note_stay');
    else if (crew.role !== 'earth' && g.atBedtime && g.atBedtime()) next = !g.inBed(crew) ? t(g.t >= g.dayLen ? 'bed_late_hud' : 'go_sleep') : t(g.bedReady ? 'bed_ready' : 'bed_wait');
    else if (goalId === 'doorN' || goalId === 'doorS') next = t(crew.suit < 35 ? 'go_inside' : 'go_dusk');
    else if (goalId === 'medbay' && crew.health < 35) next = t('go_rest');
    else if (crew.carrying) next = t('carrying');
    else if (goalId) {
      var act = g.stationAction(goalId, crew);
      if (act) next = t('act_' + act.action);
    }
    if (!next) next = crew.role === 'earth' ? t('todo_earth') : g.tooLateOutside() ? t('todo_dusk') : t('todo_none');
    var nextLine = (g.diff.hints ? t('next') + ': ' : '') + next;
    c.font = '700 ' + fs + 'px ' + Art.FONT;
    var bw = Math.min(view.w - 16, Math.max(c.measureText(label).width, c.measureText(nextLine).width) + ps + 30);
    var bx = rtl ? view.x + view.w - pad - bw : view.x + pad, by = view.y + pad;
    c.fillStyle = 'rgba(8,10,20,.78)'; c.fillRect(bx, by, bw, ps + 8);
    A(c, ROLE_COLOR[crew.role], rtl ? bx + bw - 3 : bx, by, 3, ps + 8);
    c.imageSmoothingEnabled = false;
    var pxp = rtl ? bx + bw - ps - 7 : bx + 7;
    c.drawImage(Art.portrait(crew.role), pxp, by + 4, ps, ps);
    var tx = rtl ? pxp - 8 : pxp + ps + 8;
    Art.text(c, label, tx, by + fs + 3, fs, ROLE_COLOR[crew.role], align, 700);
    Art.text(c, nextLine, tx, by + fs * 2 + 7, fs - 1, '#ffe066', align, 600);

    // Your own health, and your suit air when outside.
    var by2 = by + ps + 12, barW = Math.min(bw, 190), bx2 = rtl ? view.x + view.w - pad - barW : view.x + pad;
    var isEarth = crew.role === 'earth';
    c.fillStyle = 'rgba(8,10,20,.78)'; c.fillRect(bx2, by2, barW, crew.zone === 'outside' ? 44 : 24);
    Art.text(c, t(isEarth ? 'hud_energy' : 'hud_health'), rtl ? bx2 + barW - 6 : bx2 + 6, by2 + 16, fs - 3, crew.health < 30 ? '#ff9b9b' : '#fff', align, 700);
    var hb0 = rtl ? bx2 + 6 : bx2 + barW * 0.42, hbw = barW * 0.56 - 6;
    A(c, '#21263e', hb0, by2 + 6, hbw, 12);
    A(c, crew.health < 30 ? '#ff5a5a' : '#6fe08a', hb0, by2 + 6, hbw * crew.health / 100, 12);
    if (!isEarth) A(c, '#a05ad8', hb0 + hbw * (1 - Math.min(100, crew.dose) / 100), by2 + 6, hbw * Math.min(100, crew.dose) / 100, 12);
    if (crew.zone === 'outside') {
      Art.text(c, t('hud_suit'), rtl ? bx2 + barW - 6 : bx2 + 6, by2 + 37, fs - 3, crew.suit < 30 ? '#ff9b9b' : '#a6dcff', align, 700);
      A(c, '#21263e', hb0, by2 + 27, hbw, 12);
      A(c, crew.suit < 30 && Math.sin(clock * 9) > 0 ? '#ff5a5a' : '#58b7f0', hb0, by2 + 27, hbw * crew.suit / 100, 12);
    }

    // Stock this role cares about.
    var chips = [];
    if (crew.role === 'farmer' || crew.role === 'doctor') chips.push(['drop', Math.round(g.water)]);
    if (crew.role === 'engineer') chips.push(['gear', g.parts]);
    var cy = by2 + (crew.zone === 'outside' ? 50 : 30);
    chips.forEach(function (ch) {
      var ix = rtl ? side - 22 : side;
      c.fillStyle = 'rgba(8,10,20,.78)'; c.fillRect(rtl ? side - 66 : side, cy, 66, 26);
      c.drawImage(Art.icon(ch[0]), ix + (rtl ? -4 : 4), cy + 3, 20, 20);
      Art.text(c, String(ch[1]), rtl ? side - 30 : side + 30, cy + 19, fs - 1, '#fff', align, 700);
    });

    var noteTop = cy + (chips.length ? 34 : 4);
    if (crew.role === 'earth') {
      var y = cy + 2;
      Art.text(c, t('radio_delay', { min: g.lightMinutes.toFixed(1) }), side, y + 14, fs - 1, '#dcbcf9', align);
      y += 22;
      g.inFlight.forEach(function (m) {
        var total = m.arrive - m.sentAt, done = 1 - (m.arrive - g.time) / total;
        var w = small ? 150 : 220, xx = rtl ? side - w : side;
        A(c, '#101426', xx, y, w, 10);
        A(c, '#58b7f0', rtl ? xx + w * (1 - done) : xx, y, w * done, 10);
        y += 14;
      });
      noteTop = y + 6;
      if (g.storm && g.storm.stage === 'flare' && !g.storm.warned) {
        var w2 = Math.min(view.w * 0.8, 520), hb = fs * 2.6;
        Art.box(c, view.x + (view.w - w2) / 2, view.y + view.h * 0.5, w2, hb, '#6e1420', '#ffd166');
        Art.text(c, t('act_warn') + '  ' + g.storm.flare.cls, view.x + view.w / 2, view.y + view.h * 0.5 + hb * 0.66, fs + 3, '#fff', 'center', 700);
      }
    }

    if (!crew.down && !crew.resting && !crew.mini) drawJobNote(c, g, crew, view, side, noteTop, small, rtl, t, goalId, next);

    // The whole crew is in the sleep room: the lights go down while the evening passes.
    if (g.bedReady && crew.role !== 'earth') {
      c.fillStyle = 'rgba(12,8,40,.38)'; c.fillRect(view.x, view.y, view.w, view.h);
      var bw3 = Math.min(view.w - 24, 420), bh3 = fs * 3.2, bx3 = view.x + (view.w - bw3) / 2, by3 = view.y + view.h * 0.3;
      Art.box(c, bx3, by3, bw3, bh3, '#1d1640', '#b9a4ff');
      var zz = ['Z', 'Zz', 'Zzz'][Math.floor(clock * 2) % 3];
      Art.text(c, '🌙 ' + t('bed_ready') + ' ' + zz, view.x + view.w / 2, by3 + bh3 * 0.62, fs + 3, '#fff', 'center', 700);
    }

    if (crew.role === 'earth') drawMarsCamera(c, g, view, t, small);

    if (crew.down) {
      var left = Math.max(0, Math.ceil(28 - crew.downT));
      var dw = Math.min(view.w - 24, 420), dh = fs * 4.4;
      c.fillStyle = 'rgba(40,6,10,.55)'; c.fillRect(view.x, view.y, view.w, view.h);
      Art.box(c, view.x + (view.w - dw) / 2, view.y + view.h * 0.36, dw, dh, '#2a0c12', '#ff7b7b');
      Art.text(c, t('you_down'), view.x + view.w / 2, view.y + view.h * 0.36 + fs * 1.8, fs + 3, '#fff', 'center', 700);
      Art.text(c, t('down_time', { n: left }), view.x + view.w / 2, view.y + view.h * 0.36 + fs * 3.3, fs, '#ffc58a', 'center', 600);
    }

    if (crew.role !== 'earth' && g.alert && Math.sin(clock * 8) > -0.5) {
      var active = g.alert === 'active';
      var w3 = Math.min(view.w - 20, small ? 340 : 540), yy = view.y + ps + 22, hh = fs * 2.4;
      Art.box(c, view.x + (view.w - w3) / 2, yy, w3, hh, active ? '#8a1420' : '#8a5a10', '#ffd166');
      Art.text(c, t(active ? 'alert_active' : 'alert_warned'), view.x + view.w / 2, yy + hh * 0.66, fs + 1, '#fff', 'center', 700);
    }

    // Bottom: talking box and the prompt for the nearest job.
    var bottom = view.y + view.h - 10;
    var toast = ui.toastFor(crew.role === 'earth' ? 'earth' : 'base');
    if (toast && !crew.mini) {
      var boxW = Math.min(view.w - 16, 640), port = small ? 44 : 56;
      var textW = boxW - port - 34;
      var lines = Art.wrap(c, toast.text, textW, fs, 600);
      var shown = Art.wrap(c, toast.text.slice(0, Math.floor(toast.age * 70)), textW, fs, 600);
      var boxH = Math.max(port + 16, lines.length * (fs + 7) + 18);
      var bx0 = view.x + (view.w - boxW) / 2, by0 = bottom - boxH;
      Art.box(c, bx0, by0, boxW, boxH, '#0a0c1a', toast.tone === 'bad' ? '#ff7b7b' : toast.tone === 'good' ? '#8fe388' : '#f5f1e6');
      var px1 = rtl ? bx0 + boxW - port - 9 : bx0 + 9;
      if ((toast.who || 'dusty') === 'dusty' && root.DustyAvatar) {
        c.save(); c.imageSmoothingEnabled = true;
        root.DustyAvatar.draw(c, px1, by0 + 8, port, port, { mode: 'portrait', background: true });
        c.restore();
      } else c.drawImage(Art.portrait(toast.who), px1, by0 + 8, port, port);
      var tx2 = rtl ? px1 - 12 : px1 + port + 12;
      shown.forEach(function (ln, i) { Art.text(c, ln, tx2, by0 + 8 + (i + 1) * (fs + 6), fs, '#fff', align, 600, true); });
      bottom = by0 - 6;
    }
    // A short lesson for this player only, so a crew mission does not stop for everyone.
    var lesson = ui.lessonFor ? ui.lessonFor(player.id) : null;
    if (lesson && !crew.mini) {
      var lw0 = Math.min(view.w - 16, 600), ip = small ? 26 : 32;
      var ltw = lw0 - ip - 30, lfs = fs - 1;
      var llines = Art.wrap(c, lesson.text, ltw, lfs, 600);
      var lh0 = (lfs + 8) + llines.length * (lfs + 6) + 16;
      var lx0 = view.x + (view.w - lw0) / 2, ly0 = bottom - lh0;
      c.save();
      c.globalAlpha = Math.min(1, lesson.age * 4, (lesson.life - lesson.age) * 1.5);
      Art.box(c, lx0, ly0, lw0, lh0, '#10243a', lesson.kind === 'teach' ? '#8fe388' : '#58b7f0');
      c.drawImage(Art.icon('book'), rtl ? lx0 + lw0 - ip - 10 : lx0 + 10, ly0 + 9, ip, ip);
      var ltx = rtl ? lx0 + lw0 - ip - 20 : lx0 + ip + 20;
      Art.text(c, (lesson.kind === 'teach' ? '★ ' : '') + lesson.title, ltx, ly0 + lfs + 10, lfs + 1, lesson.kind === 'teach' ? '#8fe388' : '#a6dcff', align, 700);
      llines.forEach(function (ln, i) { Art.text(c, ln, ltx, ly0 + lfs + 10 + (i + 1) * (lfs + 6), lfs, '#fff', align, 600); });
      c.restore();
      bottom = ly0 - 6;
    }
    var near = crew.mini ? null : crew.near;
    if (near) {
      var a2 = g.stationAction(near, crew);
      if (a2) {
        var key = root.Input.actKey(player.id);
        var line = a2.blocked ? t('act_' + a2.action) : t('press', { key: key }) + ': ' + t('act_' + a2.action);
        var costLine = a2.cost && !a2.blocked ? t(a2.cost) : '';
        c.font = '700 ' + (fs + 2) + 'px ' + Art.FONT;
        var lw = Math.max(c.measureText(line).width, costLine ? c.measureText(costLine).width : 0) + 28;
        var lh = costLine ? fs * 2 + 18 : fs + 18;
        c.fillStyle = 'rgba(8,10,20,.82)';
        c.fillRect(view.x + (view.w - lw) / 2, bottom - lh, lw, lh);
        Art.text(c, line, view.x + view.w / 2, bottom - lh + fs + 6, fs + 2, a2.blocked ? '#ff9b9b' : '#fff', 'center', 700);
        if (costLine) Art.text(c, costLine, view.x + view.w / 2, bottom - 7, fs - 1, '#ffc58a', 'center');
      }
    }
  }

  // The job list, drawn like a sticky note a child wrote. The top line is where
  // the yellow arrow points. Jobs wait in the order they came; emergencies jump
  // to the top in red.
  function drawJobNote(c, g, crew, view, side, top, small, rtl, t, goalId, next) {
    // At bedtime the note has one line only: get to the sleep room (or wait there).
    var bed = crew.role !== 'earth' && g.atBedtime && g.atBedtime();
    var queue = bed ? [] : g.jobList ? g.jobList(crew) : [];
    var rows = [];
    var firstUrgent = queue.length && queue[0].id === goalId && queue[0].urgent;
    var special = goalId === 'doorN' || goalId === 'doorS' || (goalId === 'valve' && g.alert) || (goalId === 'medbay' && crew.health < 35);
    if (bed) rows.push({ text: '🌙 ' + next, arrow: !!goalId, urgent: !!goalId && g.t >= g.dayLen, happy: !goalId && g.bedReady });
    else if (goalId) rows.push({ text: next, arrow: true, urgent: firstUrgent || special });
    else if (g.alert && crew.role !== 'earth') rows.push({ text: next, urgent: true });
    // The rest, with the same job on several machines written once ("x3").
    var groups = [], byKey = {}, head = queue.filter(function (q) { return q.id === goalId; })[0], same = 1;
    queue.forEach(function (q) {
      if (q.id === goalId) return;
      if (head && rows.length && q.action === head.action && q.urgent === head.urgent) { same += 1; return; }
      var key = q.action + (q.urgent ? '!' : '');
      if (!byKey[key]) { byKey[key] = { text: t('act_' + q.action), urgent: q.urgent, n: 0 }; groups.push(byKey[key]); }
      byKey[key].n += 1;
    });
    if (same > 1) rows[0].text += ' ×' + same;
    var maxRows = small ? 3 : 4;
    var shown = groups.slice(0, Math.max(0, maxRows - rows.length)), hidden = groups.length - shown.length;
    shown.forEach(function (gr) { rows.push({ text: gr.text + (gr.n > 1 ? ' ×' + gr.n : ''), urgent: gr.urgent }); });
    var done = crew.lastDone && g.time - crew.lastDone.at < 2.5 ? crew.lastDone : null;
    if (done) rows.unshift({ text: t('act_' + done.action), done: true, fade: 1 - (g.time - done.at) / 2.5 });
    if (!rows.length) rows.push({ text: t('note_empty'), happy: true });

    var fs = small ? 13 : 15, rowH = fs + 11, title = t('note_title');
    c.font = '700 ' + fs + 'px ' + Art.FONT;
    var textW = c.measureText(title).width + 10;
    rows.forEach(function (r) { textW = Math.max(textW, c.measureText(r.text).width); });
    var w = Math.min(small ? 210 : 270, Math.max(150, textW + 52));
    var h = 30 + rows.length * rowH + (hidden > 0 ? fs + 4 : 0) + 8;
    if (top + h > view.y + view.h - 120) return; // never cover the talk box
    var x = rtl ? side - w - 2 : side + 2, y = top + 6;

    c.save();
    c.translate(x + w / 2, y + h / 2);
    c.rotate(rtl ? 0.025 : -0.025);
    c.translate(-w / 2, -h / 2);
    // Paper, shadow, a folded corner and a strip of tape.
    c.fillStyle = 'rgba(0,0,0,.32)'; c.fillRect(4, 5, w, h);
    c.fillStyle = '#fff3a3'; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0); c.lineTo(w, h - 14); c.lineTo(w - 14, h); c.lineTo(0, h); c.closePath(); c.fill();
    c.fillStyle = '#e6d571'; c.beginPath(); c.moveTo(w, h - 14); c.lineTo(w - 14, h - 14); c.lineTo(w - 14, h); c.closePath(); c.fill();
    c.save(); c.translate(w / 2, 0); c.rotate(0.06); c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(-26, -8, 52, 15); c.restore();
    // Lines like a school notebook, and the red margin.
    c.strokeStyle = 'rgba(110,170,220,.55)'; c.lineWidth = 1;
    for (var ln = 0; ln < rows.length + (hidden > 0 ? 1 : 0); ln++) {
      var ly = 30 + (ln + 1) * rowH - 3;
      c.beginPath(); c.moveTo(6, ly); c.lineTo(w - 6, ly); c.stroke();
    }
    var mx = rtl ? w - 30 : 30;
    c.strokeStyle = 'rgba(230,90,100,.6)'; c.beginPath(); c.moveTo(mx, 4); c.lineTo(mx, h - 4); c.stroke();
    // Title with a wobbly crayon underline.
    var ink = '#3b2a6b', tx = rtl ? w - 10 : 10, align = rtl ? 'right' : 'left';
    Art.text(c, title, tx, 21, fs + 1, ink, align, 700, true);
    c.font = '700 ' + (fs + 1) + 'px ' + Art.FONT;
    var tw = c.measureText(title).width;
    c.strokeStyle = '#ff8a3d'; c.lineWidth = 2.5; c.lineCap = 'round'; c.beginPath();
    for (var u = 0; u <= tw; u += 4) { var ux = rtl ? tx - u : tx + u, uy = 26 + Math.sin(u * 0.5) * 1.3; if (u === 0) c.moveTo(ux, uy); else c.lineTo(ux, uy); }
    c.stroke();

    var bx = rtl ? w - 22 : 8, px = rtl ? w - 38 : 38;
    rows.forEach(function (r, i) {
      var ry = 30 + i * rowH, cyy = ry + rowH / 2 + 1;
      c.save();
      if (r.done) c.globalAlpha = Math.max(0, r.fade);
      var col = r.done ? '#2f8a3e' : r.urgent ? '#d2283c' : r.happy ? '#2f8a3e' : ink;
      if (r.arrow && !r.urgent) {
        // The same yellow arrow as in the world, so the note and the arrow match.
        c.save(); c.translate(bx + 7, cyy); if (rtl) c.scale(-1, 1);
        c.fillStyle = '#ffd23a'; c.strokeStyle = '#16121f'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(8, 0); c.lineTo(-6, -7); c.lineTo(-3, 0); c.lineTo(-6, 7); c.closePath(); c.stroke(); c.fill();
        c.restore();
      } else if (r.urgent) {
        var pulse = 7 + Math.sin(clock * 8) * 1.2;
        c.fillStyle = '#e8364a'; c.beginPath(); c.arc(bx + 7, cyy, pulse, 0, 7); c.fill();
        Art.text(c, '!', bx + 7, cyy + 5, 13, '#fff', 'center', 800, true);
      } else {
        // A box drawn by hand: slightly crooked.
        c.strokeStyle = ink; c.lineWidth = 1.8; c.beginPath();
        c.moveTo(bx + 1, cyy - 6); c.lineTo(bx + 13, cyy - 7); c.lineTo(bx + 14, cyy + 6); c.lineTo(bx, cyy + 7); c.closePath(); c.stroke();
        if (r.done || r.happy) {
          c.strokeStyle = '#2f8a3e'; c.lineWidth = 3; c.beginPath();
          c.moveTo(bx + 2, cyy - 1); c.lineTo(bx + 6, cyy + 5); c.lineTo(bx + 16, cyy - 9); c.stroke();
        }
      }
      Art.text(c, r.text, px, cyy + fs * 0.36, fs, col, align, 700, true);
      if (r.done) {
        c.font = '700 ' + fs + 'px ' + Art.FONT;
        var rw = c.measureText(r.text).width;
        c.strokeStyle = '#2f8a3e'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(rtl ? px : px - 2, cyy - 1); c.lineTo(rtl ? px - rw - 2 : px + rw + 2, cyy + 1); c.stroke();
      }
      c.restore();
    });
    if (hidden > 0) Art.text(c, t('note_more', { n: hidden }), px, 30 + rows.length * rowH + fs, fs - 2, '#6b5a9a', align, 700, true);
    c.restore();
  }

  function drawHazardsBelow(c, g, blink) {
    g.craters.forEach(function (k) {
      var X = k.x * TS, Y = k.y * TS;
      c.fillStyle = 'rgba(60,24,10,.55)'; c.beginPath(); c.ellipse(X, Y, 30, 20, 0, 0, 7); c.fill();
      c.fillStyle = 'rgba(214,150,100,.4)'; c.beginPath(); c.ellipse(X + 3, Y + 3, 22, 13, 0, 0, 7); c.fill();
    });
    g.meteors.forEach(function (m) {
      var X = m.x * TS, Y = m.y * TS, R = 2.4 * TS, p = 1 - m.t / m.total;
      c.strokeStyle = 'rgba(255,70,70,.95)'; c.lineWidth = 4;
      c.beginPath(); c.ellipse(X, Y, R, R * 0.72, 0, 0, 7); c.stroke();
      c.fillStyle = 'rgba(255,70,70,' + (0.14 + p * 0.3) + ')';
      c.beginPath(); c.ellipse(X, Y, R * p, R * 0.72 * p, 0, 0, 7); c.fill();
    });
    var leak = g.dyn.leak;
    if (leak) {
      var LX = (leak.x + 0.5) * TS, LY = (leak.y + 0.5) * TS;
      c.fillStyle = '#10121e'; c.beginPath(); c.ellipse(LX, LY, 12, 8, 0, 0, 7); c.fill();
      for (var i = 0; i < 6; i++) {
        var o = (clock * 60 + i * 10) % 46;
        A(c, 'rgba(200,235,255,.85)', LX + (i - 2.5) * 6, LY - o, 4, 4);
      }
      light(c, LX, LY, 40, '#ff5a3a', blink ? 0.5 : 0.2);
    }
  }

  function drawHazardsAbove(c, g) {
    g.meteors.forEach(function (m) {
      var p = 1 - m.t / m.total, X = m.x * TS - (1 - p) * 170, Y = m.y * TS - (1 - p) * 420;
      c.strokeStyle = 'rgba(255,190,110,.75)'; c.lineWidth = 7;
      c.beginPath(); c.moveTo(X - 26, Y - 62); c.lineTo(X, Y); c.stroke();
      A(c, '#16121f', X - 8, Y - 8, 16, 16); A(c, '#7a5a4a', X - 7, Y - 7, 14, 14); A(c, '#ffc15a', X - 5, Y + 2, 10, 5);
    });
    g.devils.forEach(function (v) {
      var X = v.x * TS, Y = v.y * TS;
      c.fillStyle = 'rgba(40,14,6,.3)'; c.beginPath(); c.ellipse(X, Y + 2, 26, 9, 0, 0, 7); c.fill();
      for (var i = 0; i < 9; i++) {
        var w = 8 + i * 4.4, yy = Y - i * 11, wob = Math.sin(v.spin * 7 + i * 0.9) * (4 + i);
        c.fillStyle = 'rgba(214,150,100,' + (0.62 - i * 0.05) + ')';
        c.beginPath(); c.ellipse(X + wob, yy, w, 6, 0, 0, 7); c.fill();
      }
    });
    for (var b = booms.length - 1; b >= 0; b--) {
      var k = booms[b], a = 1 - k.age / 0.7;
      if (a <= 0) { booms.splice(b, 1); continue; }
      c.fillStyle = 'rgba(255,200,120,' + a * 0.8 + ')';
      c.beginPath(); c.arc(k.x * TS, k.y * TS, 30 + (1 - a) * 80, 0, 7); c.fill();
      for (var q = 0; q < 12; q++) {
        var an = q / 12 * 6.28, d = (1 - a) * 120;
        A(c, '#8a4a2c', k.x * TS + Math.cos(an) * d, k.y * TS + Math.sin(an) * d * 0.7, 6, 6);
      }
    }
  }

  // Mission control sees Mars as it was minutes ago, not as it is now.
  function drawMarsCamera(c, g, view, t, small) {
    var w = small ? 170 : 240, h = w * 0.6, rtl = Art.isRtl();
    var x = rtl ? view.x + 8 : view.x + view.w - w - 8, y = view.y + 8;
    Art.box(c, x, y, w, h + 22, '#0a0c1a', '#dcbcf9');
    var s = (w - 10) / (60 * TS);
    c.imageSmoothingEnabled = true;
    c.drawImage(mapCanvas, 0, 0, 60 * TS, World.H * TS, x + 5, y + 5, 60 * TS * s, World.H * TS * s);
    var want = g.time - g.delay, shot = null;
    for (var i = feed.length - 1; i >= 0; i--) if (feed[i].t <= want) { shot = feed[i]; break; }
    if (shot) {
      shot.crew.forEach(function (p) {
        A(c, '#16121f', x + 5 + p[0] * TS * s - 4, y + 5 + p[1] * TS * s - 4, 8, 8);
        A(c, p[3] ? '#ff5a5a' : ROLE_COLOR[p[2]], x + 5 + p[0] * TS * s - 3, y + 5 + p[1] * TS * s - 3, 6, 6);
      });
    }
    Art.text(c, t('radio_camera', { min: g.lightMinutes.toFixed(0) }), x + w / 2, y + h + 15, small ? 11 : 13, '#dcbcf9', 'center', 600);
  }

  function drawOverview(c, g, view) {
    A(c, '#0b0e18', view.x, view.y, view.w, view.h);
    var s = Math.min(view.w / (60 * TS), view.h / (World.H * TS));
    c.save();
    c.beginPath(); c.rect(view.x, view.y, view.w, view.h); c.clip();
    var ox = view.x + (view.w - 60 * TS * s) / 2, oy = view.y + (view.h - World.H * TS * s) / 2;
    c.imageSmoothingEnabled = true;
    c.drawImage(mapCanvas, 0, 0, 60 * TS, World.H * TS, ox, oy, 60 * TS * s, World.H * TS * s);
    ['engineer', 'farmer', 'doctor'].forEach(function (r) {
      var cr = g.crew[r];
      A(c, '#16121f', ox + cr.x * TS * s - 6, oy + cr.y * TS * s - 6, 12, 12);
      A(c, ROLE_COLOR[r], ox + cr.x * TS * s - 5, oy + cr.y * TS * s - 5, 10, 10);
    });
    c.restore();
  }

  function layout(count, w, h) {
    var gap = 4;
    if (count <= 1) return [{ x: 0, y: 0, w: w, h: h }];
    if (count === 2) {
      var hw = Math.floor((w - gap) / 2);
      return [{ x: 0, y: 0, w: hw, h: h }, { x: hw + gap, y: 0, w: w - hw - gap, h: h }];
    }
    var cw = Math.floor((w - gap) / 2), ch = Math.floor((h - gap) / 2);
    return [
      { x: 0, y: 0, w: cw, h: ch }, { x: cw + gap, y: 0, w: w - cw - gap, h: ch },
      { x: 0, y: ch + gap, w: cw, h: h - ch - gap }, { x: cw + gap, y: ch + gap, w: w - cw - gap, h: h - ch - gap },
    ];
  }

  function draw(c, g, ui, w, h, dt) {
    clock += dt;
    if (!mapCanvas) mapCanvas = Art.buildMap();
    updateCosmetics(g, dt);
    booms.forEach(function (b) { b.age += dt; });
    var views = layout(g.players.length, w, h);
    A(c, '#000', 0, 0, w, h);
    g.players.forEach(function (p, i) {
      var v = views[i];
      v.scale = Math.max(0.75, Math.round((v.w / (TS * 20)) * 2) / 2);
      drawView(c, g, v, ui, p);
    });
    if (g.players.length === 3) drawOverview(c, g, views[3]);
  }

  // ---- Title screen scene ---------------------------------------------------
  var titleBg = null, titleW = 0, titleH = 0;
  function buildTitle(w, h) {
    var s = 3, W = Math.ceil(w / s), H = Math.ceil(h / s);
    var cv = Art.canvas(W, H), c = cv.getContext('2d');
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a0b1e'); g.addColorStop(0.42, '#2a1630'); g.addColorStop(0.62, '#8a4530'); g.addColorStop(0.72, '#d98a58');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    for (var i = 0; i < 120; i++) {
      var b = Art.hash(i, 8);
      A(c, b > 0.85 ? '#ffffff' : '#6f80b8', Art.hash(i, 1) * W, Art.hash(i, 2) * H * 0.42, 1, 1);
    }
    // Earth as a tiny blue dot, and the small far Sun.
    A(c, '#6fb6ff', W * 0.8, H * 0.14, 2, 2);
    var sx = W * 0.2, sy = H * 0.54;
    Art.glow(c, sx, sy, 70, '#a9c8ff', 0.5);
    A(c, '#e8f2ff', sx - 3, sy - 3, 6, 6);
    function hills(base, amp, freq, color, seed) {
      c.fillStyle = color;
      c.beginPath(); c.moveTo(0, H);
      for (var x = 0; x <= W; x += 2) c.lineTo(x, H * base - Art.fbm(x * freq + seed, seed) * H * amp);
      c.lineTo(W, H); c.fill();
    }
    hills(0.78, 0.28, 0.012, '#7a3f2c', 3);
    hills(0.86, 0.2, 0.02, '#94492a', 9);
    hills(0.96, 0.16, 0.012, '#b05d30', 17);
    // Habitat domes.
    var by = H * 0.8, bx = W * 0.66;
    [[0, 26], [34, 18], [-30, 15]].forEach(function (d) {
      c.fillStyle = '#d9dee8'; c.beginPath(); c.arc(bx + d[0], by, d[1], Math.PI, 0); c.fill();
      c.fillStyle = '#9aa4b8'; c.beginPath(); c.arc(bx + d[0], by, d[1], Math.PI * 1.5, 0); c.lineTo(bx + d[0], by); c.fill();
      A(c, '#6fd3ea', bx + d[0] - d[1] / 2.5, by - d[1] / 1.8, d[1] / 2.5, 3);
    });
    A(c, '#8a93a8', bx - 46, by - 2, 96, 4);
    for (var p = 0; p < 4; p++) { A(c, '#223a7e', W * 0.3 + p * 18, H * 0.84, 15, 7); A(c, '#4f76d0', W * 0.3 + p * 18, H * 0.84, 15, 1); A(c, '#565d70', W * 0.3 + p * 18 + 7, H * 0.84 + 7, 2, 5); }
    hills(1.04, 0.14, 0.008, '#c26e3b', 29);
    return { cv: cv, s: s };
  }

  function drawTitle(c, w, h, dt) {
    clock += dt;
    if (!titleBg || titleW !== w || titleH !== h) { titleBg = buildTitle(w, h); titleW = w; titleH = h; }
    c.imageSmoothingEnabled = false;
    c.drawImage(titleBg.cv, 0, 0, titleBg.cv.width * titleBg.s, titleBg.cv.height * titleBg.s);
    // A quiet, layered starfield gives the title sky depth without competing with the menu.
    for (var st = 0; st < motes.length; st++) {
      var star = motes[st];
      if (star.y > 0.62) continue;
      var twinkle = 0.48 + 0.22 * Math.sin(clock * 1.4 + star.z * 9);
      c.fillStyle = 'rgba(205,225,255,' + twinkle.toFixed(2) + ')';
      var starX = ((star.x + clock * 0.0015 * star.s) % 1) * w;
      c.fillRect(starX, star.y * h * 0.66, star.z > 0.72 ? 2 : 1, star.z > 0.72 ? 2 : 1);
    }
    // Drifting dust.
    c.fillStyle = 'rgba(255,214,170,.45)';
    for (var i = 0; i < motes.length; i++) {
      var mo = motes[i];
      c.fillRect(((mo.x + clock * 0.02 * mo.s) % 1) * w, h * 0.55 + mo.y * h * 0.45, 3, 3);
    }
    // Dusty is rendered once by the persistent companion widget on the title screen.
    if (w > 1000) {
      ['engineer', 'farmer', 'doctor'].forEach(function (r, i) {
        Art.drawSmooth(c, Art.sprite(r, 'down', 0, true), w * 0.76 + i * 74, h - 130 + (i % 2) * 8, 72, 96);
      });
    }
  }

  root.Render = { draw: draw, drawTitle: drawTitle, ROLE_COLOR: ROLE_COLOR, boom: function (x, y) { booms.push({ x: x, y: y, age: 0 }); } };
})(typeof window !== 'undefined' ? window : globalThis);
