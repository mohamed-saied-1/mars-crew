// Tiny hands-on experiments shown inside learn cards and the science lab.
// Each one has a canvas and usually a slider, so kids can try the idea themselves.
(function (root) {
  'use strict';

  var Art = root.Art, A = Art.px;
  var t = function (k, v) { return root.I18N.t(k, v); };
  var W = 460, H = 190;

  function sun(c, x, y, r, dim) {
    c.globalAlpha = dim;
    Art.glow(c, x, y, r * 3, '#ffb347', 0.7);
    c.fillStyle = '#ffb347'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    c.fillStyle = '#ffe28a'; c.beginPath(); c.arc(x, y, r * 0.7, 0, 7); c.fill();
    c.globalAlpha = 1;
  }

  function panel(c, x, y, w, h, dust) {
    A(c, '#22273a', x - 3, y - 3, w + 6, h + 6);
    var cw = w / 8, ch = h / 3;
    for (var i = 0; i < 8; i++) for (var j = 0; j < 3; j++) A(c, (i + j) % 2 ? '#1f3f8f' : '#2a53b3', x + i * cw + 1, y + j * ch + 1, cw - 2, ch - 2);
    c.globalAlpha = dust * 0.95;
    c.drawImage(Art.dustTexture(), 0, 0, w, h, x, y, w, h);
    c.globalAlpha = 1;
  }

  function bolts(c, n, x, y) {
    c.imageSmoothingEnabled = false;
    for (var i = 0; i < n; i++) c.drawImage(Art.icon('bolt'), x + (i % 12) * 19, y + Math.floor(i / 12) * 22, 20, 20);
  }

  function ground(c) { A(c, '#b05d30', 0, H - 30, W, 30); A(c, '#c26e3b', 0, H - 30, W, 3); }
  function sky(c, top, bottom) {
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, top); g.addColorStop(1, bottom);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }

  var LABS = {
    power: {
      slider: 'lab_power_s', value: 20,
      draw: function (c, s, v) {
        sky(c, '#2a1630', '#d98a58'); sun(c, 80, 46, 22, 1); ground(c);
        var rays = 6;
        c.strokeStyle = 'rgba(255,226,138,.7)'; c.lineWidth = 3;
        for (var i = 0; i < rays; i++) { var o = (s.t * 60 + i * 40) % 240; c.beginPath(); c.moveTo(90 + o * 0.9, 56 + o * 0.28); c.lineTo(104 + o * 0.9, 60 + o * 0.28); c.stroke(); }
        panel(c, 200, 96, 200, 62, v);
        var n = Math.round(12 * (1 - 0.7 * v));
        bolts(c, n, 190, 12);
        Art.text(c, t('lab_bolts', { n: n }), 300, 58, 18, '#ffd24a', 'center', 700);
      },
    },
    dust: {
      slider: 'lab_dust_s', value: 60,
      draw: function (c, s, v) {
        sky(c, '#3a1c30', '#d98a58');
        sun(c, 230, 50, 24, 1 - v * 0.85);
        c.save(); c.globalAlpha = v * 0.82; c.imageSmoothingEnabled = true;
        var off = (s.t * 40) % W;
        c.drawImage(Art.dustTexture(), -off, 0, W, H); c.drawImage(Art.dustTexture(), W - off, 0, W, H);
        c.restore();
        ground(c); panel(c, 130, 120, 200, 36, 0.1 + v * 0.4);
        var n = Math.round(12 * (1 - 0.75 * v));
        Art.text(c, t('lab_bolts', { n: n }), W / 2, 106, 20, '#ffd24a', 'center', 700);
      },
    },
    night: {
      slider: 'lab_night_s', value: 25,
      draw: function (c, s, v) {
        var day = v < 0.55, x = 40 + v * 380, y = 120 - Math.sin(v * Math.PI) * 100;
        if (day) sky(c, '#3a2040', '#d98a58'); else sky(c, '#06081a', '#1a2448');
        if (!day) for (var i = 0; i < 30; i++) A(c, '#c9d4ff', Art.hash(i, 1) * W, Art.hash(i, 2) * 110, 2, 2);
        if (day) sun(c, x, y, 18, 1);
        ground(c);
        panel(c, 40, 120, 140, 38, 0.1);
        A(c, '#2b3040', 230, 92, 74, 64); A(c, '#3c4358', 230, 92, 74, 3);
        var charge = day ? 0.3 + v : 1.4 - v * 1.2;
        for (var b = 0; b < 5; b++) A(c, b / 5 < charge ? '#ffd24a' : '#3a3626', 238 + b * 12, 104, 10, 40);
        A(c, day ? '#555a68' : '#ff7b54', 340, 120, 60, 36); A(c, day ? '#6a7184' : '#ffb27a', 346, 126, 48, 6);
        Art.text(c, t(day ? 'lab_day' : 'lab_nightt'), W / 2, 30, 17, '#fff', 'center', 700);
      },
    },
    radiation: {
      slider: 'lab_radiation_s', value: 15,
      start: function (s) { s.parts = []; s.hits = 0; s.next = 0; },
      draw: function (c, s, v, dt) {
        A(c, '#07081a', 0, 0, W, H);
        sun(c, 34, H / 2, 24, 1);
        var wx = 250, ww = 6 + v * 70;
        A(c, '#2f6fae', wx, 10, ww, H - 20); A(c, '#58b7f0', wx + 3, 13, ww - 6, H - 26); A(c, '#a6dcff', wx + 5, 16, Math.max(2, ww * 0.2), H - 34);
        c.imageSmoothingEnabled = false;
        Art.drawSmooth(c, Art.sprite('doctor', 'left', 0, false), W - 96, H / 2 - 44, 66, 88);
        s.next -= dt;
        if (s.next <= 0) { s.parts.push({ x: 60, y: 20 + Math.random() * (H - 40), luck: Math.random(), depth: Math.random() }); s.next = 0.12; }
        for (var i = s.parts.length - 1; i >= 0; i--) {
          var p = s.parts[i];
          p.x += dt * 240;
          // Each particle meets the wall as it is now, so a thicker wall works at once.
          if (!p.past && p.x >= wx + p.depth * ww) {
            if (p.luck < v * 1.15) { s.parts.splice(i, 1); continue; }
            p.past = true;
          }
          if (p.x > W - 70) { s.hits += 1; s.parts.splice(i, 1); continue; }
          A(c, '#ff5a5a', p.x, p.y, 7, 4); A(c, 'rgba(255,90,90,.4)', p.x - 12, p.y + 1, 12, 2);
        }
        Art.text(c, t('lab_hits', { n: s.hits }), W / 2, 26, 18, '#ff9b9b', 'center', 700);
      },
      reset: function (s) { s.hits = 0; },
    },
    plants: {
      slider: 'lab_plants_s', value: 40,
      start: function (s) { s.grow = 0.1; },
      draw: function (c, s, v, dt) {
        A(c, '#2c503b', 0, 0, W, H);
        A(c, '#3f2a1a', 100, H - 40, 260, 40); A(c, '#5a3d27', 100, H - 40, 260, 4);
        A(c, '#2b3040', 226, 0, 8, 22); A(c, v > 0.02 ? '#ffc6ee' : '#555a68', 190, 20, 80, 8);
        if (v > 0.02) { c.globalAlpha = v * 0.5; c.fillStyle = '#ffb3e6'; c.beginPath(); c.moveTo(190, 28); c.lineTo(270, 28); c.lineTo(330, H - 40); c.lineTo(130, H - 40); c.fill(); c.globalAlpha = 1; }
        s.grow = v > 0.02 ? Math.min(1, s.grow + dt * v * 0.3) : s.grow;
        if (s.grow >= 1) s.grow = 0.12;
        var h = s.grow * 100;
        A(c, '#2f8f4b', 226, H - 40 - h, 8, h);
        for (var i = 0; i < Math.floor(s.grow * 7); i++) {
          var y = H - 48 - i * 14, d = i % 2 ? 1 : -1;
          A(c, '#5fd068', 230 + d * 18 - 12, y, 24, 8); A(c, '#a7f39f', 230 + d * 18 - 8, y, 9, 3);
        }
        Art.text(c, t(v > 0.02 ? 'lab_grow' : 'lab_nogrow'), W / 2, H - 12, 17, '#fff', 'center', 700);
      },
    },
    delay: {
      button: 'lab_send',
      start: function (s) { s.pos = -1; s.min = root.NASA.lightMinutes(new Date().toISOString().slice(0, 10)); },
      click: function (s) { s.pos = 0; },
      draw: function (c, s, v, dt) {
        A(c, '#07081a', 0, 0, W, H);
        for (var i = 0; i < 50; i++) A(c, '#7f93c8', Art.hash(i, 1) * W, Art.hash(i, 2) * H, 2, 2);
        c.fillStyle = '#3f8fe0'; c.beginPath(); c.arc(50, H / 2, 30, 0, 7); c.fill();
        c.fillStyle = '#62d873'; c.fillRect(32, H / 2 - 14, 20, 12); c.fillRect(50, H / 2 + 4, 16, 10);
        c.fillStyle = '#c96a3a'; c.beginPath(); c.arc(W - 46, H / 2, 22, 0, 7); c.fill();
        c.fillStyle = '#e8a87c'; c.fillRect(W - 58, H / 2 - 8, 16, 5);
        var sec = s.min;
        if (s.pos >= 0 && s.pos < 1) {
          s.pos = Math.min(1, s.pos + dt / sec);
          var x = 80 + s.pos * (W - 150);
          A(c, '#ffe066', x, H / 2 - 3, 12, 6); Art.glow(c, x + 6, H / 2, 22, '#ffe066', 0.7);
          Art.text(c, t('lab_sent', { n: Math.round(s.pos * s.min) }), W / 2, 30, 19, '#fff', 'center', 700);
        } else if (s.pos >= 1) {
          Art.text(c, t('lab_arrived', { n: s.min.toFixed(1) }), W / 2, 30, 19, '#8fe388', 'center', 700);
        }
      },
    },
    health: {
      slider: 'lab_rad_s', value: 20,
      button: 'lab_heal',
      start: function (s) { s.hp = 40; },
      click: function (s) { s.hp = 100; },
      draw: function (c, s, v) {
        A(c, '#10142a', 0, 0, W, H);
        c.imageSmoothingEnabled = false;
        Art.drawSmooth(c, Art.sprite('doctor', 'down', 0, false), 30, 40, 84, 112);
        var top = 100 - v * 100;
        if (s.hp > top) s.hp = top;
        var x = 140, y = 80, w = 290, h = 34;
        A(c, '#21263e', x, y, w, h);
        A(c, '#6fe08a', x, y, w * s.hp / 100, h);
        A(c, '#a05ad8', x + w * top / 100, y, w * (1 - top / 100), h);
        c.strokeStyle = '#f5f1e6'; c.lineWidth = 2; c.strokeRect(x, y, w, h);
        Art.text(c, t('lab_can_heal', { n: Math.round(top) }), x + w / 2, y + h + 32, 18, '#d9b8ff', 'center', 700);
      },
    },
    meteor: {
      button: 'lab_drop',
      start: function (s) { s.fall = -1; s.shake = 0; s.craters = []; },
      click: function (s) { s.fall = 0; },
      draw: function (c, s, v, dt) {
        sky(c, '#2a1630', '#d98a58'); ground(c);
        s.craters.forEach(function (k) { c.fillStyle = '#7a3f22'; c.beginPath(); c.ellipse(k, H - 22, 26, 7, 0, 0, 7); c.fill(); });
        if (s.fall >= 0) {
          s.fall += dt * 1.4;
          var x = 60 + s.fall * 170, y = s.fall * (H - 30);
          c.strokeStyle = 'rgba(255,190,110,.8)'; c.lineWidth = 6; c.beginPath(); c.moveTo(x - 30, y - 60); c.lineTo(x, y); c.stroke();
          A(c, '#7a5a4a', x - 7, y - 7, 14, 14);
          if (s.fall >= 1) { s.fall = -1; s.shake = 2.2; s.craters.push(x); if (s.craters.length > 4) s.craters.shift(); }
        }
        // A simple seismograph line, like InSight's sensor.
        A(c, '#0a0c1a', 250, 14, 196, 66);
        s.shake = Math.max(0, s.shake - dt);
        c.strokeStyle = '#6fe08a'; c.lineWidth = 2; c.beginPath();
        for (var i = 0; i < 190; i++) {
          var amp = s.shake * 11 * Math.exp(-Math.abs(i - 95) / 60);
          var yy = 47 + Math.sin(i * 0.9 + s.t * 30) * amp;
          if (i) c.lineTo(253 + i, yy); else c.moveTo(253 + i, yy);
        }
        c.stroke();
        if (s.shake > 0) Art.text(c, t('lab_quake'), 150, 30, 15, '#fff', 'center', 700);
      },
    },
    leak: {
      draw: function (c, s) {
        A(c, '#454c60', 0, 0, W, H); A(c, '#8d96ac', 0, 0, W, 34);
        c.fillStyle = '#10121e'; c.beginPath(); c.ellipse(W / 2, 90, 26, 16, 0, 0, 7); c.fill();
        for (var i = 0; i < 12; i++) {
          var o = (s.t * 70 + i * 13) % 90;
          A(c, 'rgba(200,235,255,.85)', W / 2 + (i - 6) * 8, 90 - o, 5, 5);
        }
      },
    },
    help: {
      draw: function (c, s) {
        sky(c, '#3a2040', '#d98a58'); ground(c);
        c.imageSmoothingEnabled = false;
        c.save(); c.translate(150, H - 44); c.rotate(Math.PI / 2); Art.drawSmooth(c, Art.sprite('farmer', 'down', 0, true), -28, -38, 56, 76); c.restore();
        var x = 330 - (s.t * 40) % 120;
        Art.drawSmooth(c, Art.sprite('doctor', 'left', Math.floor(s.t * 6) % 2 ? 1 : 3, true), x, H - 118, 66, 88);
      },
    },
    ice: {
      slider: 'lab_ice_s', value: 15,
      draw: function (c, s, v) {
        sky(c, '#3a2040', '#d98a58');
        var top = 70;
        A(c, '#b05d30', 0, top, W, H - top); A(c, '#c26e3b', 0, top, W, 3);
        for (var i = 0; i < 40; i++) A(c, '#93502a', Art.hash(i, 3) * W, top + 8 + Art.hash(i, 4) * 40, 6, 3);
        var iceY = top + 62;
        A(c, '#cfe9ff', 0, iceY, W, 30); A(c, '#a6d4f5', 0, iceY + 22, W, 8);
        for (var k = 0; k < 18; k++) A(c, '#ffffff', Art.hash(k, 5) * W, iceY + 4 + Art.hash(k, 6) * 18, 5, 2);
        A(c, '#7a4428', 0, iceY + 30, W, H - iceY - 30);
        // The drill on the surface and its rod going down.
        A(c, '#5f6678', W / 2 - 20, top - 34, 40, 30); A(c, '#ffd24a', W / 2 - 20, top - 34, 40, 4);
        var depth = top + v * (H - top - 6);
        A(c, '#d8dce8', W / 2 - 3, top - 4, 6, depth - top + 4);
        A(c, '#ffd24a', W / 2 - 6, depth - 6, 12, 8);
        var hit = depth >= iceY;
        if (hit) {
          for (var d = 0; d < 6; d++) {
            var y = depth - ((s.t * 50 + d * 16) % Math.max(10, depth - top + 30));
            A(c, '#58b7f0', W / 2 + 10 + (d % 2) * 6, y, 4, 6);
          }
        }
        Art.text(c, t(hit ? 'lab_ice_yes' : 'lab_ice_no'), W / 2, 26, 17, hit ? '#a6dcff' : '#fff', 'center', 700);
      },
    },
    twin: {
      button: 'lab_twin_btn',
      start: function (s) { s.stage = 0; s.at = 0; },
      click: function (s) { if (s.stage === 0 || s.stage === 3) { s.stage = 1; s.at = 0; } },
      draw: function (c, s, v, dt) {
        A(c, '#1b2140', 0, 0, W / 2 - 4, H); A(c, '#07081a', W / 2 + 4, 0, W / 2 - 4, H);
        A(c, '#f5f1e6', W / 2 - 4, 0, 8, H);
        for (var i = 0; i < 20; i++) A(c, '#7f93c8', W / 2 + 8 + Art.hash(i, 1) * (W / 2 - 16), Art.hash(i, 2) * 60, 2, 2);
        A(c, '#2b3040', 0, H - 34, W / 2 - 4, 34);
        A(c, '#b05d30', W / 2 + 4, H - 34, W / 2 - 4, 34);
        function rover(x, y, col, ok) {
          A(c, '#3a3f52', x, y + 26, 70, 10);
          [x + 4, x + 28, x + 52].forEach(function (wx) { A(c, '#16182a', wx, y + 34, 14, 14); });
          A(c, col, x + 6, y, 58, 26); A(c, '#ffffff', x + 6, y, 58, 3);
          A(c, '#d8dce8', x + 44, y - 18, 4, 18); A(c, '#d8dce8', x + 38, y - 22, 16, 6);
          A(c, ok ? '#6fe08a' : '#ff6b6b', x + 14, y + 8, 10, 10);
        }
        s.at += dt;
        if (s.stage === 1 && s.at > 2) { s.stage = 2; s.at = 0; }
        if (s.stage === 2 && s.at > 2.5) { s.stage = 3; s.at = 0; }
        rover(70, H - 82, '#7a8396', s.stage >= 2);
        rover(W / 2 + 80, H - 82, '#c96a3a', s.stage === 3);
        if (s.stage === 1) for (var k = 0; k < 4; k++) A(c, '#ffd24a', 90 + Art.hash(k, Math.floor(s.at * 8)) * 50, H - 100 + Art.hash(k, 9) * 20, 4, 4);
        if (s.stage === 2) {
          var x = 140 + (s.at / 2.5) * (W - 260);
          A(c, '#ffe066', x, 50, 12, 6); Art.glow(c, x + 6, 53, 22, '#ffe066', 0.7);
        }
        Art.text(c, t('lab_twin_earth'), W / 4, 24, 16, '#fff', 'center', 700);
        Art.text(c, t('lab_twin_mars'), W * 3 / 4, 24, 16, '#fff', 'center', 700);
        var msg = ['lab_twin_0', 'lab_twin_1', 'lab_twin_2', 'lab_twin_3'][s.stage];
        Art.text(c, t(msg), W / 2, H - 10, 15, s.stage === 3 ? '#8fe388' : '#ffd24a', 'center', 700);
      },
    },
    suit: {
      draw: function (c, s) {
        sky(c, '#3a2040', '#d98a58'); ground(c);
        c.imageSmoothingEnabled = false;
        Art.drawSmooth(c, Art.sprite('engineer', 'down', 0, true), W / 2 - 42, 44, 84, 112);
        for (var i = 0; i < 8; i++) {
          var y = 120 - ((s.t * 26 + i * 18) % 110), x = W / 2 + 56 + Math.sin(i * 2 + s.t) * 14;
          c.fillStyle = 'rgba(200,235,255,.75)'; c.beginPath(); c.arc(x, y, 3 + (i % 3), 0, 7); c.fill();
        }
      },
    },
  };

  // Builds the lab in `host`. Returns a function that stops the animation.
  function mount(host, id) {
    var lab = LABS[id], state = { t: 0 }, running = true, last = 0;
    var cv = Art.canvas(W, H);
    cv.className = 'lab-canvas';
    host.appendChild(cv);
    var c = cv.getContext('2d');
    var value = (lab.value || 0) / 100;
    if (lab.start) lab.start(state);
    if (lab.slider) {
      var label = document.createElement('label');
      label.className = 'lab-slider';
      var span = document.createElement('span');
      span.textContent = t(lab.slider);
      var input = document.createElement('input');
      input.type = 'range'; input.min = 0; input.max = 100; input.value = lab.value || 0;
      input.addEventListener('input', function () { value = input.value / 100; if (lab.reset) lab.reset(state); });
      label.appendChild(span); label.appendChild(input);
      host.appendChild(label);
      setTimeout(function () { input.focus(); }, 30);
    }
    if (lab.button) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'primary lab-btn'; btn.textContent = t(lab.button);
      btn.addEventListener('click', function () { lab.click(state); });
      host.appendChild(btn);
    }
    function tick(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - last) / 1000 || 0);
      last = now; state.t += dt;
      lab.draw(c, state, value, dt);
      requestAnimationFrame(tick);
    }
    lab.draw(c, state, value, 0);
    requestAnimationFrame(tick);
    return function () { running = false; };
  }

  root.Labs = { mount: mount, LIST: ['power', 'night', 'radiation', 'health', 'plants', 'ice', 'delay', 'twin', 'meteor', 'dust', 'suit'] };
})(typeof window !== 'undefined' ? window : globalThis);
