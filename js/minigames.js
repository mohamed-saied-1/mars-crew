// Every task is a short game. Each one teaches something about the real job.
// update() is pure logic so tests can play them. draw() is only used in a browser.
(function (root) {
  'use strict';

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(n) { return Math.floor(Math.random() * n); }

  var ACTION_GAME = {
    clean: 'wipe', repair: 'sequence', twintest: 'sequence', drill: 'timing', plant: 'seed', water: 'pour', harvest: 'pick',
    fillwall: 'catch', checkup: 'quiz', study: 'quiz', sample: 'scan', analyse: 'focus', upload: 'aim', warn: 'spot', forecast: 'spot',
    rest: 'breathe', nap: 'breathe', revive: 'breathe', recover: 'breathe', patch: 'patch',
    filter: 'wipe', compost: 'seed', exercise: 'breathe', drive: 'sequence', suitcheck: 'patch', recycle: 'pour',
  };
  // Jobs that share a game type but explain themselves with their own hint (mg_<action>).
  var OWN_HINT = { revive: 1, recover: 1, filter: 1, compost: 1, exercise: 1, drive: 1, suitcheck: 1, recycle: 1 };

  // Quiz answers: option 0 is always right. Options are shuffled when shown.
  var QUIZ = {
    health: ['q_stop', 'q_see', 'q_career', 'q_gym', 'q_safe'],
    science: ['q_day', 'q_gravity', 'q_moxie', 'q_delay', 'q_flare', 'q_opp', 'q_plants', 'q_air'],
  };
  var lastQuiz = {};

  var TYPES = {
    wipe: {
      start: function (m, o) {
        m.cols = 10; m.rows = 4; m.cells = [];
        for (var i = 0; i < m.cols * m.rows; i++) m.cells.push(1);
        m.x = 0; m.y = 0; m.limit = 8; m.dust = o.dust;
      },
      update: function (m, dt, inp) {
        m.x = clamp(m.x + (inp.x || 0) * dt * 11, 0, m.cols - 1);
        m.y = clamp(m.y + (inp.y || 0) * dt * 7, 0, m.rows - 1);
        var cx = Math.round(m.x), cy = Math.round(m.y);
        for (var dy = 0; dy < 2; dy++) for (var dx = 0; dx < 2; dx++) {
          var X = cx + dx, Y = cy + dy;
          if (X < m.cols && Y < m.rows) m.cells[Y * m.cols + X] = 0;
        }
        var left = m.cells.reduce(function (a, b) { return a + b; }, 0);
        m.score = 1 - left / m.cells.length;
        if (left === 0 || m.t >= m.limit) m.finish(m.score);
      },
    },
    sequence: {
      start: function (m) {
        m.steps = []; m.at = 0; m.shake = 0; m.misses = 0;
        var n = m.action === 'twintest' ? 4 : 5;
        for (var i = 0; i < n; i++) m.steps.push(rand(4));
      },
      update: function (m, dt, inp) {
        m.shake = Math.max(0, m.shake - dt);
        var keys = [inp.upPressed, inp.rightPressed, inp.downPressed, inp.leftPressed];
        for (var k = 0; k < 4; k++) {
          if (!keys[k]) continue;
          if (k === m.steps[m.at]) { m.at += 1; m.sound = 'good'; }
          else { m.shake = 0.3; m.misses += 1; m.sound = 'bad'; if (m.action === 'repair') m.hurt = (m.hurt || 0) + 4; }
        }
        if (m.at >= m.steps.length) m.finish(1 - Math.min(0.5, m.misses * 0.1));
      },
    },
    timing: {
      start: function (m) { m.round = 0; m.hits = 0; m.pos = 0; m.dir = 1; m.zone = 0.55; m.width = 0.24; m.flash = 0; m.result = null; },
      update: function (m, dt, inp) {
        m.flash = Math.max(0, m.flash - dt);
        if (m.flash > 0) return;
        m.pos += m.dir * dt * (1.05 + m.round * 0.3);
        if (m.pos > 1) { m.pos = 1; m.dir = -1; }
        if (m.pos < 0) { m.pos = 0; m.dir = 1; }
        if (inp.actPressed) {
          var hit = Math.abs(m.pos - m.zone) < m.width / 2;
          if (hit) m.hits += 1; else m.hurt = (m.hurt || 0) + 3;
          m.result = hit; m.sound = hit ? 'good' : 'bad';
          m.round += 1; m.flash = 0.5;
          m.zone = 0.2 + Math.random() * 0.6; m.width = Math.max(0.14, m.width - 0.04);
          if (m.round >= 3) m.finish(m.hits / 3);
        }
      },
    },
    pour: {
      start: function (m) { m.level = 0; m.target = 0.55 + Math.random() * 0.2; m.band = 0.12; m.started = false; },
      update: function (m, dt, inp) {
        if (inp.act) { m.started = true; m.level = Math.min(1.05, m.level + dt * 0.62); }
        // Letting go before any real pouring (e.g. the tap that opened this job) is not a pour:
        // keep waiting instead of ending with a spill.
        else if (m.started && m.level < 0.1) m.started = false;
        else if (m.started) {
          var off = Math.abs(m.level - m.target);
          m.over = m.level > m.target + m.band / 2;
          m.finish(off < m.band / 2 ? 1 : clamp(1 - off * 2.5, 0.3, 0.9));
        }
        if (m.level >= 1.05) { m.over = true; m.finish(0.3); }
      },
    },
    seed: {
      start: function (m) { m.holes = [0, 0, 0, 0]; m.hand = 0; m.moved = 0; },
      update: function (m, dt, inp) {
        if (inp.leftPressed) m.hand = Math.max(0, m.hand - 1);
        if (inp.rightPressed) m.hand = Math.min(3, m.hand + 1);
        if (inp.actPressed && !m.holes[m.hand]) { m.holes[m.hand] = 1; m.sound = 'good'; }
        if (m.holes.every(Boolean)) m.finish(1);
      },
    },
    pick: {
      start: function (m) {
        m.items = []; m.cx = 0; m.cy = 0; m.limit = 9; m.wrong = 0;
        for (var i = 0; i < 8; i++) m.items.push({ ripe: false, gone: false });
        for (var n = 0; n < 5;) { var k = rand(8); if (!m.items[k].ripe) { m.items[k].ripe = true; n++; } }
        m.total = 5; m.got = 0;
      },
      update: function (m, dt, inp) {
        if (inp.leftPressed) m.cx = Math.max(0, m.cx - 1);
        if (inp.rightPressed) m.cx = Math.min(3, m.cx + 1);
        if (inp.upPressed) m.cy = 0;
        if (inp.downPressed) m.cy = 1;
        if (inp.actPressed) {
          var it = m.items[m.cy * 4 + m.cx];
          if (!it.gone) {
            it.gone = true;
            if (it.ripe) { m.got += 1; m.sound = 'good'; } else { m.wrong += 1; m.sound = 'bad'; }
          }
        }
        if (m.got >= m.total || m.t >= m.limit) m.finish(clamp((m.got - m.wrong * 0.5) / m.total, 0.3, 1));
      },
    },
    'catch': {
      start: function (m) { m.x = 0.5; m.parts = []; m.next = 0; m.caught = 0; m.missed = 0; m.limit = 7; },
      update: function (m, dt, inp) {
        m.x = clamp(m.x + (inp.x || 0) * dt * 1.5, 0.08, 0.92);
        m.next -= dt;
        if (m.next <= 0 && m.t < m.limit - 1) { m.parts.push({ x: 0.06 + Math.random() * 0.88, y: 0, v: 0.62 + Math.random() * 0.4 }); m.next = 0.42; }
        for (var i = m.parts.length - 1; i >= 0; i--) {
          var p = m.parts[i];
          p.y += p.v * dt;
          if (p.y > 0.78 && p.y < 0.9 && Math.abs(p.x - m.x) < 0.13) { m.parts.splice(i, 1); m.caught += 1; m.sound = 'good'; }
          else if (p.y >= 1) { m.parts.splice(i, 1); m.missed += 1; m.rad = (m.rad || 0) + 0.3; }
        }
        if (m.t >= m.limit) m.finish(clamp(m.caught / Math.max(1, m.caught + m.missed), 0.3, 1));
      },
    },
    quiz: {
      start: function (m) {
        var set = m.action === 'checkup' ? 'health' : 'science';
        var list = QUIZ[set], pick = list[rand(list.length)];
        if (pick === lastQuiz[set]) pick = list[(list.indexOf(pick) + 1) % list.length];
        lastQuiz[set] = pick;
        m.q = pick; m.order = [0, 1, 2];
        for (var i = 2; i > 0; i--) { var j = rand(i + 1), s = m.order[i]; m.order[i] = m.order[j]; m.order[j] = s; }
        m.sel = 0; m.answered = false; m.wait = 0;
      },
      update: function (m, dt, inp) {
        if (m.answered) {
          m.wait += dt;
          if (m.wait > 0.5 && inp.actPressed) m.finish(m.right ? 1 : 0.5);
          return;
        }
        if (inp.upPressed) m.sel = (m.sel + 2) % 3;
        if (inp.downPressed) m.sel = (m.sel + 1) % 3;
        if (inp.actPressed) { m.answered = true; m.right = m.order[m.sel] === 0; m.sound = m.right ? 'good' : 'bad'; }
      },
    },
    scan: {
      start: function (m) { m.x = 0.5; m.y = 0.5; m.tx = 0.15 + Math.random() * 0.7; m.ty = 0.2 + Math.random() * 0.6; m.limit = 12; m.miss = 0; m.flash = 0; },
      update: function (m, dt, inp) {
        m.flash = Math.max(0, m.flash - dt);
        m.x = clamp(m.x + (inp.x || 0) * dt * 0.75, 0, 1);
        m.y = clamp(m.y + (inp.y || 0) * dt * 0.75, 0, 1);
        var d = Math.sqrt(Math.pow(m.x - m.tx, 2) + Math.pow(m.y - m.ty, 2));
        m.heat = clamp(1 - d * 1.9, 0, 1);
        if (inp.actPressed) {
          if (d < 0.1) { m.sound = 'good'; m.finish(1); }
          else { m.flash = 0.3; m.miss += 1; m.sound = 'bad'; }
        }
        if (m.t >= m.limit) m.finish(0.6);
      },
    },
    focus: {
      start: function (m) { m.f = Math.random() < 0.5 ? 0.05 : 0.95; m.target = 0.3 + Math.random() * 0.4; m.limit = 10; },
      update: function (m, dt, inp) {
        m.f = clamp(m.f + (inp.x || 0) * dt * 0.55, 0, 1);
        m.err = Math.abs(m.f - m.target);
        if (inp.actPressed) m.finish(clamp(1 - m.err * 2.2, 0.4, 1));
        if (m.t >= m.limit) m.finish(0.5);
      },
    },
    aim: {
      start: function (m) { m.dish = 0.5; m.target = 0.25; m.fill = 0; m.limit = 12; m.phase = Math.random() * 6; },
      update: function (m, dt, inp) {
        m.dish = clamp(m.dish + (inp.x || 0) * dt * 0.8, 0, 1);
        m.target = 0.5 + Math.sin(m.t * 0.9 + m.phase) * 0.36;
        m.locked = Math.abs(m.dish - m.target) < 0.09;
        m.fill = clamp(m.fill + (m.locked ? dt / 2.4 : -dt / 8), 0, 1);
        if (m.fill >= 1) m.finish(1);
        if (m.t >= m.limit) m.finish(0.6);
      },
    },
    breathe: {
      start: function (m) { m.hits = 0; m.need = 3; m.size = 0; m.flash = 0; m.result = null; m.cool = 0; },
      update: function (m, dt, inp) {
        m.flash = Math.max(0, m.flash - dt); m.cool = Math.max(0, m.cool - dt);
        m.size = 0.5 + 0.5 * Math.sin(m.t * 2.4 - 1.5);
        if (inp.actPressed && m.cool <= 0) {
          var ok = m.size > 0.72;
          m.result = ok; m.flash = 0.45; m.cool = 0.35; m.sound = ok ? 'good' : 'bad';
          if (ok) m.hits += 1;
        }
        if (m.hits >= m.need) m.finish(1);
      },
    },
    patch: {
      start: function (m) {
        m.spots = []; m.left = 4; m.cx = 1; m.cy = 1; m.limit = 12;
        for (var i = 0; i < 12; i++) m.spots.push(0);
        for (var n = 0; n < 4;) { var k = rand(12); if (!m.spots[k]) { m.spots[k] = 1; n++; } }
      },
      update: function (m, dt, inp) {
        if (inp.leftPressed) m.cx = Math.max(0, m.cx - 1);
        if (inp.rightPressed) m.cx = Math.min(3, m.cx + 1);
        if (inp.upPressed) m.cy = Math.max(0, m.cy - 1);
        if (inp.downPressed) m.cy = Math.min(2, m.cy + 1);
        if (inp.actPressed) {
          var i = m.cy * 4 + m.cx;
          if (m.spots[i] === 1) { m.spots[i] = 2; m.left -= 1; m.sound = 'good'; } else m.sound = 'bad';
        }
        if (m.left <= 0) m.finish(1);
        if (m.t >= m.limit) m.finish(0.6);
      },
    },
    spot: {
      start: function (m, o) {
        m.n = 5; m.sel = 0; m.target = rand(m.n); m.spots = [];
        for (var i = 0; i < m.n; i++) { var a = i / m.n * 6.28 + 0.4; m.spots.push({ x: 0.5 + Math.cos(a) * 0.3, y: 0.5 + Math.sin(a) * 0.3 }); }
        m.mars = m.action === 'forecast'; m.cls = o.cls || ''; m.shake = 0; m.misses = 0; m.done2 = 0;
      },
      update: function (m, dt, inp) {
        m.shake = Math.max(0, m.shake - dt);
        if (m.found) { m.done2 += dt; if (m.done2 > (m.mars ? 0.5 : 1.3)) m.finish(1 - Math.min(0.5, m.misses * 0.2)); return; }
        if (inp.leftPressed || inp.upPressed) m.sel = (m.sel + m.n - 1) % m.n;
        if (inp.rightPressed || inp.downPressed) m.sel = (m.sel + 1) % m.n;
        if (inp.actPressed) {
          if (m.sel === m.target) { m.found = true; m.sound = 'good'; }
          else { m.shake = 0.3; m.misses += 1; m.sound = 'bad'; }
        }
      },
    },
  };

  function start(action, opts) {
    var type = ACTION_GAME[action];
    var m = {
      type: type, action: action, t: 0, done: false, quality: 0, opts: opts || {},
      finish: function (q) { if (!this.done) { this.done = true; this.quality = clamp(q, 0, 1); } },
    };
    TYPES[type].start(m, opts || {});
    return m;
  }

  function update(m, dt, inp) {
    if (m.done) return;
    m.t += dt;
    TYPES[m.type].update(m, dt, inp || {});
  }

  // ---- Drawing -------------------------------------------------------------
  function frame(c, view, m, crew, player, color) {
    var Art = root.Art, t = root.I18N.t.bind(root.I18N);
    var w = Math.min(view.w - 16, 640), h = Math.min(view.h - 16, 400);
    var x = view.x + (view.w - w) / 2, y = view.y + (view.h - h) / 2;
    Art.box(c, x, y, w, h, '#10142a', color);
    var fs = w < 420 ? 15 : 19;
    c.fillStyle = color; c.fillRect(x + 4, y + 4, w - 8, fs + 14);
    Art.text(c, t('act_' + m.action), x + w / 2, y + fs + 8, fs, '#10142a', 'center', 700, true);
    var hint = OWN_HINT[m.action] ? t('mg_' + m.action) : t('mg_' + m.type + (m.type === 'spot' && m.mars ? '_mars' : ''));
    var lines = Art.wrap(c, hint, w - 30, fs - 3, 600);
    lines.slice(0, 2).forEach(function (ln, i) { Art.text(c, ln, x + w / 2, y + fs * 2 + 18 + i * (fs + 1), fs - 3, '#ffe066', 'center', 600, true); });
    var top = y + fs * 2 + 22 + Math.min(2, lines.length) * (fs + 1);
    var key = root.Input.keysFor(player.id);
    Art.text(c, t('mg_keys', { act: key.act, swap: key.swap }), x + w / 2, y + h - 10, fs - 6, '#b7bccb', 'center', 500, true);
    return { x: x + 14, y: top, w: w - 28, h: y + h - 26 - top, fs: fs };
  }

  function timer(c, r, m) {
    if (!m.limit) return;
    var left = 1 - m.t / m.limit;
    root.Art.px(c, '#2a304c', r.x, r.y + r.h - 5, r.w, 5);
    root.Art.px(c, left < 0.3 ? '#ff7b7b' : '#ffe066', r.x, r.y + r.h - 5, r.w * Math.max(0, left), 5);
  }

  function arrow(c, x, y, s, dir, color) {
    c.save(); c.translate(x, y); c.rotate(dir * Math.PI / 2);
    c.fillStyle = color;
    c.beginPath(); c.moveTo(0, -s); c.lineTo(s * 0.9, s * 0.1); c.lineTo(s * 0.35, s * 0.1); c.lineTo(s * 0.35, s); c.lineTo(-s * 0.35, s); c.lineTo(-s * 0.35, s * 0.1); c.lineTo(-s * 0.9, s * 0.1); c.closePath();
    c.fill(); c.restore();
  }

  var DRAW = {
    wipe: function (c, m, r) {
      var A = root.Art.px, cw = Math.min(r.w / m.cols, (r.h - 44) / m.rows), W = cw * m.cols, H = cw * m.rows;
      var X = r.x + (r.w - W) / 2, Y = r.y + 34;
      var clean = m.score || 0, filter = m.action === 'filter';
      root.Art.text(c, root.I18N.t(filter ? 'mg_filter_clean' : 'mg_wipe_power', { n: Math.round(clean * 100) }), r.x + r.w / 2, r.y + 20, r.fs - 2, '#ffd24a', 'center', 700);
      A(c, '#22273a', X - 4, Y - 4, W + 8, H + 8);
      for (var i = 0; i < m.cells.length; i++) {
        var cx = X + (i % m.cols) * cw, cy = Y + Math.floor(i / m.cols) * cw;
        // An air filter is a white mesh; a solar panel is blue glass.
        A(c, filter ? ['#e4e7f0', '#c9cede'][(i + Math.floor(i / m.cols)) % 2] : ['#1f3f8f', '#2a53b3'][(i + Math.floor(i / m.cols)) % 2], cx + 1, cy + 1, cw - 2, cw - 2);
        A(c, filter ? '#9aa2b8' : '#5f8ae0', cx + 1, cy + 1, cw - 2, 2);
        if (m.cells[i]) {
          A(c, '#b86f42', cx, cy, cw, cw);
          A(c, '#d69664', cx + cw * root.Art.hash(i, 1) * 0.6, cy + cw * root.Art.hash(i, 2) * 0.6, cw * 0.3, cw * 0.2);
          A(c, '#8f5230', cx + cw * root.Art.hash(i, 3) * 0.6, cy + cw * root.Art.hash(i, 4) * 0.7, cw * 0.25, cw * 0.15);
        }
      }
      var bx = X + Math.round(m.x) * cw, by = Y + Math.round(m.y) * cw;
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(bx - 1, by - 1, cw * 2 + 2, cw * 2 + 2);
      A(c, '#ffe066', bx + cw * 0.3, by + cw * 0.7, cw * 1.4, cw * 0.6); A(c, '#5a3a1e', bx + cw * 0.8, by + cw * 0.1, cw * 0.4, cw * 0.7);
      timer(c, r, m);
    },
    sequence: function (c, m, r) {
      var A = root.Art.px, n = m.steps.length, s = Math.min(r.w / (n + 0.5), r.h * 0.5), shake = m.shake > 0 ? Math.sin(m.t * 70) * 5 : 0;
      var X = r.x + (r.w - s * n) / 2 + shake, Y = r.y + r.h * 0.25;
      // Circuit board behind the arrows, or Mars ground for a rover drive.
      var drive = m.action === 'drive';
      A(c, drive ? '#6a3220' : '#123d2c', r.x, r.y + 4, r.w, r.h - 8);
      for (var i = 0; i < 9; i++) A(c, drive ? '#8a4a2c' : '#1f6a4a', r.x + root.Art.hash(i, 1) * r.w * 0.9, r.y + 8 + root.Art.hash(i, 2) * (r.h - 20), drive ? 10 + root.Art.hash(i, 3) * 16 : 40 + root.Art.hash(i, 3) * 70, drive ? 6 : 2);
      m.steps.forEach(function (d, i) {
        var x = X + i * s + s / 2, y = Y + s / 2, done = i < m.at, now = i === m.at;
        A(c, done ? '#2f8f4c' : now ? '#ffe066' : '#39405e', x - s * 0.44, y - s * 0.44, s * 0.88, s * 0.88);
        arrow(c, x, y, s * 0.3, d, done ? '#c9ffd0' : now ? '#23202a' : '#9aa2b8');
      });
    },
    timing: function (c, m, r) {
      var A = root.Art.px, t = root.I18N.t.bind(root.I18N);
      var layers = [['#b86f42', t('mg_layer_0')], ['#8a4a2c', t('mg_layer_1')], ['#6fb6e0', t('mg_layer_2')]];
      var h = (r.h - 40) / 3;
      layers.forEach(function (l, i) {
        A(c, l[0], r.x, r.y + i * h, r.w * 0.3, h);
        root.Art.text(c, l[1], r.x + r.w * 0.15, r.y + i * h + h / 2 + 6, r.fs - 4, '#fff', 'center', 700);
        if (i < m.hits) A(c, 'rgba(255,255,255,.2)', r.x, r.y + i * h, r.w * 0.3, h);
      });
      var dx = r.x + r.w * 0.15;
      A(c, '#e4e7f0', dx - 3, r.y, 6, Math.min(3, m.round + 0.4) * h);
      var bx = r.x + r.w * 0.36, bw = r.w * 0.64, by = r.y + (r.h - 40) / 2 - 16;
      A(c, '#2a304c', bx, by, bw, 32);
      A(c, '#5fd068', bx + bw * (m.zone - m.width / 2), by, bw * m.width, 32);
      A(c, '#fff', bx + bw * m.pos - 3, by - 7, 6, 46);
      if (m.result != null && m.flash > 0) root.Art.text(c, t(m.result ? 'mg_hit' : 'mg_miss'), bx + bw / 2, by - 14, r.fs, m.result ? '#8fe388' : '#ff9b9b', 'center', 700);
      root.Art.text(c, m.hits + ' / 3', bx + bw / 2, by + 64, r.fs + 2, '#fff', 'center', 700);
    },
    pour: function (c, m, r) {
      var A = root.Art.px, W = Math.min(150, r.w * 0.34), H = r.h - 14, X = r.x + (r.w - W) / 2, Y = r.y + 4;
      A(c, '#1b2140', X, Y, W, H);
      var lvl = Math.min(1, m.level);
      A(c, '#3f2a1a', X, Y + H - 16, W, 16);
      A(c, '#58b7f0', X, Y + H * (1 - lvl), W, H * lvl);
      A(c, '#a6dcff', X, Y + H * (1 - lvl), W, 3);
      var by = Y + H * (1 - m.target) - H * m.band / 2;
      A(c, 'rgba(95,208,104,.45)', X - 18, by, W + 36, H * m.band);
      c.strokeStyle = '#8fe388'; c.lineWidth = 2; c.strokeRect(X - 18, by, W + 36, H * m.band);
      c.strokeStyle = '#f5f1e6'; c.strokeRect(X, Y, W, H);
      if (m.level > 0 && m.level < 1) A(c, '#58b7f0', X + W / 2 - 3, Y - 4, 6, H * (1 - lvl) + 4);
    },
    seed: function (c, m, r) {
      var A = root.Art.px, s = r.w / 4, gy = r.y + r.h * 0.6;
      A(c, '#3f2a1a', r.x, gy, r.w, r.h * 0.34); A(c, '#5a3d27', r.x, gy, r.w, 4);
      m.holes.forEach(function (full, i) {
        var x = r.x + i * s + s / 2;
        A(c, '#1e140c', x - 18, gy + 6, 36, 14);
        if (full) { A(c, '#5fd068', x - 2, gy - 12, 4, 18); A(c, '#a7f39f', x - 10, gy - 16, 10, 6); A(c, '#a7f39f', x, gy - 20, 10, 6); }
      });
      var hx = r.x + m.hand * s + s / 2;
      A(c, '#f2c69a', hx - 12, r.y + 8, 24, 26); A(c, '#c98d5e', hx - 12, r.y + 30, 24, 4);
      A(c, '#d9b070', hx - 3, r.y + 42 + (m.t * 20 % 12), 6, 8);
      arrow(c, hx, gy - 26, 9, 2, '#ffe066');
    },
    pick: function (c, m, r) {
      var A = root.Art.px, s = Math.min(r.w / 4, (r.h - 8) / 2), X = r.x + (r.w - s * 4) / 2, Y = r.y + 2;
      m.items.forEach(function (it, i) {
        var col = i % 4, row = Math.floor(i / 4), x = X + col * s, y = Y + row * s;
        A(c, '#3f2a1a', x + 4, y + 4, s - 8, s - 8);
        if (!it.gone) {
          A(c, it.ripe ? '#3ea155' : '#6d8c3a', x + s * 0.3, y + s * 0.2, s * 0.4, s * 0.6);
          A(c, it.ripe ? '#7be07f' : '#a3b85a', x + s * 0.2, y + s * 0.28, s * 0.6, s * 0.3);
          if (it.ripe) { A(c, '#e0507f', x + s * 0.24, y + s * 0.3, s * 0.14, s * 0.12); A(c, '#e0507f', x + s * 0.6, y + s * 0.44, s * 0.14, s * 0.12); A(c, '#ffb3cc', x + s * 0.44, y + s * 0.26, s * 0.1, s * 0.1); }
        }
        if (m.cx === col && m.cy === row) { c.strokeStyle = '#ffe066'; c.lineWidth = 4; c.strokeRect(x + 3, y + 3, s - 6, s - 6); }
      });
      timer(c, r, m);
    },
    'catch': function (c, m, r) {
      var A = root.Art.px, H = r.h - 8;
      A(c, '#000', r.x, r.y, r.w, H); c.strokeStyle = '#f5f1e6'; c.lineWidth = 3; c.strokeRect(r.x, r.y, r.w, H);
      m.parts.forEach(function (p) {
        var x = r.x + p.x * r.w, y = r.y + p.y * H;
        A(c, '#ff5a5a', x - 5, y - 5, 10, 10); A(c, '#ffd0d0', x - 2, y - 3, 4, 3); A(c, 'rgba(255,90,90,.35)', x - 2, y - 18, 4, 13);
      });
      var w = r.w * 0.26, bx = r.x + m.x * r.w - w / 2, by = r.y + H * 0.8;
      A(c, '#2f6fae', bx, by, w, 18); A(c, '#58b7f0', bx + 3, by + 3, w - 6, 12); A(c, '#a6dcff', bx + 6, by + 4, w * 0.3, 3);
      var sp = root.Art.sprite('doctor', 'up', 0, false);
      c.imageSmoothingEnabled = false;
      root.Art.drawSmooth(c, sp, r.x + r.w / 2 - 14, r.y + H - 32, 24, 32);
      root.Art.text(c, root.I18N.t('mg_catch_score', { n: m.caught }), r.x + 12, r.y + 24, r.fs - 3, '#a6dcff', 'left', 700);
      timer(c, r, m);
    },
    quiz: function (c, m, r) {
      var t = root.I18N.t.bind(root.I18N), Art = root.Art, fs = r.fs - 2;
      var rtl = Art.isRtl(), edge = rtl ? r.x + r.w : r.x, align = rtl ? 'right' : 'left';
      var q = Art.wrap(c, t(m.q), r.w, fs + 1, 700), y = r.y + fs + 2;
      q.forEach(function (ln) { Art.text(c, ln, edge, y, fs + 1, '#fff', align, 700, true); y += fs + 7; });
      if (m.answered) {
        y += 4;
        Art.text(c, t(m.right ? 'mg_right' : 'mg_wrong'), edge, y, fs + 4, m.right ? '#8fe388' : '#ffb27a', align, 700, true);
        y += fs + 10;
        if (!m.right) { Art.text(c, t('mg_answer') + ' ' + t(m.q + '_0'), edge, y, fs, '#8fe388', align, 700, true); y += fs + 8; }
        Art.wrap(c, t(m.q + '_why'), r.w, fs, 600).forEach(function (ln) { Art.text(c, ln, edge, y, fs, '#d7dbe6', align, 600, true); y += fs + 6; });
        return;
      }
      m.order.forEach(function (o, i) {
        var h = fs + 16, on = i === m.sel;
        Art.px(c, on ? '#c96a3a' : '#242a4e', r.x, y, r.w, h);
        if (on) { c.strokeStyle = '#ffe066'; c.lineWidth = 2; c.strokeRect(r.x, y, r.w, h); }
        Art.text(c, t(m.q + '_' + o), rtl ? r.x + r.w - 12 : r.x + 12, y + fs + 5, fs, '#fff', align, 600, true);
        y += h + 6;
      });
    },
    scan: function (c, m, r) {
      var Art = root.Art, A = Art.px, H = r.h - 12;
      for (var i = 0; i < 16; i++) for (var j = 0; j < 8; j++) {
        var v = Art.fbm(i * 0.5, j * 0.5);
        A(c, v > 0.6 ? '#b58a68' : v > 0.45 ? '#9c7558' : '#826148', r.x + i * r.w / 16, r.y + j * H / 8, r.w / 16 + 1, H / 8 + 1);
      }
      var x = r.x + m.x * r.w, y = r.y + m.y * H, heat = m.heat || 0;
      var col = heat > 0.8 ? '#ff5a5a' : heat > 0.5 ? '#ffd166' : '#58b7f0';
      c.strokeStyle = col; c.lineWidth = 3;
      c.beginPath(); c.arc(x, y, 16 + Math.sin(m.t * (4 + heat * 14)) * 3, 0, 7); c.stroke();
      A(c, col, x - 24, y - 1, 48, 2); A(c, col, x - 1, y - 24, 2, 48);
      A(c, '#10142a', r.x + 8, r.y + 8, 130, 14); A(c, col, r.x + 10, r.y + 10, 126 * heat, 10);
      if (m.flash > 0) A(c, 'rgba(255,90,90,.25)', r.x, r.y, r.w, H);
      timer(c, r, m);
    },
    focus: function (c, m, r) {
      var Art = root.Art, A = Art.px, s = Math.min(r.w, r.h - 44), cx = r.x + r.w / 2, cy = r.y + s / 2 + 4, err = m.err == null ? 1 : m.err;
      var block = Math.max(2, Math.round(err * 34) * 2 + 2), R = s / 2;
      c.save(); c.beginPath(); c.arc(cx, cy, R, 0, 7); c.clip();
      for (var y = -R; y < R; y += block) for (var x = -R; x < R; x += block) {
        var v = Art.fbm((x + 200) * 0.03, (y + 200) * 0.03), crystal = Math.abs(((x + y) % 46)) < 7 && Art.vnoise(x * 0.04, y * 0.04) > 0.5;
        A(c, crystal ? '#7fd6ff' : v > 0.55 ? '#d9b07a' : v > 0.42 ? '#a97a4e' : '#7a5234', cx + x, cy + y, block + 1, block + 1);
      }
      c.restore();
      c.strokeStyle = '#2a304c'; c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
      var bx = r.x + r.w * 0.15, bw = r.w * 0.7, by = r.y + r.h - 30;
      A(c, '#2a304c', bx, by, bw, 8); A(c, '#ffe066', bx + bw * m.f - 5, by - 6, 10, 20);
      timer(c, r, m);
    },
    aim: function (c, m, r) {
      var Art = root.Art, A = Art.px, H = r.h - 30;
      A(c, '#070a1c', r.x, r.y, r.w, H);
      for (var i = 0; i < 30; i++) A(c, '#7f93c8', r.x + Art.hash(i, 1) * r.w, r.y + Art.hash(i, 2) * H, 2, 2);
      var ex = r.x + m.target * r.w, ey = r.y + 26;
      c.fillStyle = '#3f8fe0'; c.beginPath(); c.arc(ex, ey, 14, 0, 7); c.fill();
      c.fillStyle = '#62d873'; c.fillRect(ex - 8, ey - 5, 9, 7); c.fillRect(ex + 2, ey + 3, 6, 5);
      var dx = r.x + m.dish * r.w, dy = r.y + H - 10;
      c.strokeStyle = m.locked ? '#7dffa0' : 'rgba(255,255,255,.35)'; c.lineWidth = m.locked ? 4 : 2; c.setLineDash([8, 7]);
      c.beginPath(); c.moveTo(dx, dy); c.lineTo(dx, r.y + 40); c.stroke(); c.setLineDash([]);
      A(c, '#b05d30', r.x, dy, r.w, 10);
      c.fillStyle = '#e8ebf2'; c.beginPath(); c.ellipse(dx, dy - 12, 26, 12, 0, 0, 7); c.fill();
      A(c, '#6c7488', dx - 3, dy - 10, 6, 12);
      A(c, '#2a304c', r.x, r.y + H + 8, r.w, 14); A(c, m.locked ? '#7dffa0' : '#58b7f0', r.x + 2, r.y + H + 10, (r.w - 4) * m.fill, 10);
      timer(c, { x: r.x, y: r.y + 2, w: r.w, h: r.h + 4 }, m);
    },
    breathe: function (c, m, r) {
      var Art = root.Art, A = Art.px, t = root.I18N.t.bind(root.I18N), cx = r.x + r.w / 2, cy = r.y + r.h / 2 - 8;
      var R = Math.min(r.w, r.h) * 0.42, s = R * (0.35 + 0.65 * m.size), big = m.size > 0.72;
      c.strokeStyle = '#8fe388'; c.lineWidth = 3; c.setLineDash([8, 6]);
      c.beginPath(); c.arc(cx, cy, R * 0.82, 0, 7); c.stroke(); c.setLineDash([]);
      c.fillStyle = big ? 'rgba(143,227,136,.8)' : 'rgba(88,183,240,.65)';
      c.beginPath(); c.arc(cx, cy, s, 0, 7); c.fill();
      Art.text(c, m.hits + ' / ' + m.need, cx, cy + 8, r.fs + 6, '#fff', 'center', 700);
      if (m.flash > 0 && m.result != null) Art.text(c, t(m.result ? 'mg_hit' : 'mg_miss'), cx, r.y + 22, r.fs, m.result ? '#8fe388' : '#ff9b9b', 'center', 700);
    },
    patch: function (c, m, r) {
      var Art = root.Art, A = Art.px, s = Math.min(r.w / 4, (r.h - 10) / 3), X = r.x + (r.w - s * 4) / 2, Y = r.y;
      for (var i = 0; i < 12; i++) {
        var x = X + (i % 4) * s, y = Y + Math.floor(i / 4) * s, st = m.spots[i];
        A(c, '#8d96ac', x + 2, y + 2, s - 4, s - 4); A(c, '#a6afc4', x + 2, y + 2, s - 4, 3);
        if (st === 1) {
          c.fillStyle = '#10121e'; c.beginPath(); c.ellipse(x + s / 2, y + s / 2, s * 0.22, s * 0.16, 0, 0, 7); c.fill();
          for (var k = 0; k < 4; k++) {
            var o = (m.t * 40 + k * 9) % 26;
            A(c, 'rgba(200,235,255,.8)', x + s / 2 + (k - 1.5) * 7, y + s / 2 - o, 3, 3);
          }
        }
        if (st === 2) { A(c, '#f2c14e', x + s * 0.24, y + s * 0.3, s * 0.52, s * 0.4); A(c, '#c99a2e', x + s * 0.24, y + s * 0.62, s * 0.52, 3); }
        if (m.cx === i % 4 && m.cy === Math.floor(i / 4)) { c.strokeStyle = '#ffe066'; c.lineWidth = 4; c.strokeRect(x + 3, y + 3, s - 6, s - 6); }
      }
      timer(c, r, m);
    },
    spot: function (c, m, r) {
      var Art = root.Art, A = Art.px, t = root.I18N.t.bind(root.I18N);
      var s = r.h - 8, cx = r.x + (m.found && !m.mars ? r.w * 0.3 : r.w / 2) + (m.shake > 0 ? Math.sin(m.t * 70) * 5 : 0), cy = r.y + s / 2, R = s * 0.46;
      c.fillStyle = m.mars ? '#c96a3a' : '#ff9a2e'; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();
      c.fillStyle = m.mars ? '#d98a58' : '#ffc14d'; c.beginPath(); c.arc(cx, cy, R * 0.82, 0, 7); c.fill();
      var pulse = Math.sin(m.t * 12) > 0;
      m.spots.forEach(function (p, i) {
        var x = cx + (p.x - 0.5) * 2 * R * 0.95, y = cy + (p.y - 0.5) * 2 * R * 0.95, tgt = i === m.target;
        if (m.mars) {
          c.fillStyle = tgt ? '#f4e0c0' : '#a85a33';
          c.beginPath(); c.ellipse(x, y, tgt ? 24 : 12, tgt ? 15 : 8, 0, 0, 7); c.fill();
        } else {
          A(c, '#6a3010', x - 8, y - 8, 16, 16);
          if (tgt) { A(c, pulse ? '#fff' : '#ffe9a8', x - 13, y - 3, 26, 6); A(c, pulse ? '#fff' : '#ffe9a8', x - 3, y - 13, 6, 26); }
        }
        if (i === m.sel) { c.strokeStyle = '#49e0ff'; c.lineWidth = 4; c.strokeRect(x - 20, y - 20, 40, 40); }
      });
      if (m.found && !m.mars) {
        var x0 = r.x + r.w * 0.6, w = r.w * 0.38, letters = ['A', 'B', 'C', 'M', 'X'], letter = (m.cls || 'M').charAt(0), y0 = r.y + 36;
        Art.text(c, t('mg_flare_class'), x0 + w / 2, r.y + 18, r.fs - 3, '#fff', 'center', 700);
        letters.forEach(function (l, i) {
          var bw = w / 5, h = 12 + i * 22;
          A(c, l === letter ? '#ff5a5a' : '#39405e', x0 + i * bw + 2, y0 + 110 - h, bw - 4, h);
          Art.text(c, l, x0 + i * bw + bw / 2, y0 + 130, r.fs - 2, l === letter ? '#ff9b9b' : '#b7bccb', 'center', 700);
        });
        Art.text(c, m.cls, x0 + w / 2, y0 + 158, r.fs + 6, '#ffe066', 'center', 700);
      }
    },
  };

  function draw(c, m, view, crew, player) {
    var color = root.Render.ROLE_COLOR[crew.role];
    var r = frame(c, view, m, crew, player, color);
    c.save();
    c.beginPath(); c.rect(r.x - 2, r.y - 2, r.w + 4, r.h + 4); c.clip();
    DRAW[m.type](c, m, r);
    c.restore();
  }

  var api = { start: start, update: update, draw: draw, ACTION_GAME: ACTION_GAME, QUIZ: QUIZ, TYPES: TYPES };
  root.Mini = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
