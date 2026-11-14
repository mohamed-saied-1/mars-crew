// The four human crew characters, drawn as layered vector art (outline + flat colour + one
// cel-shadow tone + highlights), one shared skeleton so proportions match in every view and pose.
// Views: front, threeq, side, back. Poses: idle, walk, run, work, interact, celebrate, danger, fail.
// Expressions: neutral, happy, smiling, laughing, surprised, worried, sad, angry, focused, excited.
// Design box: 120 x 200 units, feet on y = 198. See artifacts/crew-redesign/STYLE_GUIDE.md.
(function (root) {
  'use strict';

  var OUT = '#2a2130', LW = 2.2, THIN = 1.2;

  var ROLES = {
    engineer: {
      suit: '#ea7a2c', suit2: '#f4efe6', trim: '#464b57', accent: '#ffc94d', glove: '#4a4f5a', boot: '#3b3f48', bootSole: '#ffc94d',
      skin: '#b8794f', hair: '#1f1612', hairStyle: 'curly', iris: '#4a2a17', brow: '#1a110d', lips: '#8a4a38',
      patch: 'gear', pack: '#d9d3c7', extras: { goggles: true, toolbelt: true, wrist: 'diag', wrench: true, kneepads: true },
    },
    farmer: {
      suit: '#f1f3ef', suit2: '#3faa5a', trim: '#2f7d45', accent: '#f0a040', glove: '#3a8f52', boot: '#5b6a5f', bootSole: '#f0a040',
      skin: '#f0c9a4', hair: '#15100f', hairStyle: 'ponytail', iris: '#3b2618', brow: '#15100f', lips: '#c46a5e',
      patch: 'leaf', pack: '#e6ece5', extras: { seeds: true, scanner: 'plant', trowel: true },
    },
    doctor: {
      suit: '#f5f8fa', suit2: '#25bfd3', trim: '#1b8fa0', accent: '#f0a040', glove: '#d9eef2', boot: '#6c7c86', bootSole: '#25bfd3',
      skin: '#5b3a26', hair: '#110b09', hairStyle: 'twists', iris: '#2a1810', brow: '#0f0907', lips: '#4a2a1d',
      patch: 'medic', pack: '#f5f8fa', extras: { glasses: true, medpack: true, wrist: 'health', scanner: 'med' },
    },
    earth: {
      suit: '#22325a', suit2: '#f08a24', trim: '#f4f1ea', accent: '#f08a24', glove: '#1b2440', boot: '#1d2233', bootSole: '#f08a24',
      skin: '#a8714a', hair: '#2b4a78', hairStyle: 'hijab', iris: '#3a2416', brow: '#1d130e', lips: '#8e4f3e',
      patch: 'orbit', pack: null, extras: { headset: true, tablet: true, flightSuit: true },
    },
  };

  // ---- Colour helpers ---------------------------------------------------------
  function hex(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mix(a, b, k) { var x = hex(a), y = hex(b); return 'rgb(' + Math.round(x[0] + (y[0] - x[0]) * k) + ',' + Math.round(x[1] + (y[1] - x[1]) * k) + ',' + Math.round(x[2] + (y[2] - x[2]) * k) + ')'; }
  function shade(h) { return mix(h, '#2a1f3a', 0.26); }
  function light(h) { return mix(h, '#ffffff', 0.38); }

  // ---- Drawing helpers ----------------------------------------------------------
  function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, Math.PI * 2); }
  function fillOut(c, fill, lw) { c.fillStyle = fill; c.fill(); c.lineWidth = lw || LW; c.strokeStyle = OUT; c.lineJoin = 'round'; c.stroke(); }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  // A limb segment as a rounded capsule with outline, base colour and a cel-shadow stripe.
  function capsule(c, x1, y1, x2, y2, w, col, shadowSide) {
    c.lineCap = 'round';
    c.strokeStyle = OUT; c.lineWidth = w + LW * 2; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1, nx = -dy / len, ny = dx / len, o = w * 0.28 * (shadowSide || 1);
    c.strokeStyle = shade(col); c.lineWidth = w * 0.34; c.beginPath(); c.moveTo(x1 + nx * o, y1 + ny * o); c.lineTo(x2 + nx * o, y2 + ny * o); c.stroke();
  }
  function joint(x0, y0, len, a) { return { x: x0 + Math.sin(a) * len, y: y0 + Math.cos(a) * len }; }

  // ---- Expressions ------------------------------------------------------------
  // brow: raise; tilt: + inner ends up (worried), - inner ends down (angry); eye: openness;
  // squint: lower lid; happyEyes: closed upward arcs; mouth: shape id; w: width; open: 0..1.
  var EXPR = {
    neutral: { brow: 0, tilt: 0, eye: 1, squint: 0, mouth: 'flat', w: 7, open: 0 },
    happy: { brow: -1, tilt: 0.1, eye: 1, squint: 0.25, mouth: 'smile', w: 9, open: 0 },
    smiling: { brow: -0.5, tilt: 0, eye: 1, squint: 0.15, mouth: 'smile', w: 7.5, open: 0 },
    laughing: { brow: -2, tilt: 0.2, eye: 1, happyEyes: true, mouth: 'laugh', w: 11, open: 1 },
    surprised: { brow: -4, tilt: 0.15, eye: 1.3, squint: 0, mouth: 'o', w: 5, open: 0.8 },
    worried: { brow: -1.5, tilt: 0.9, eye: 1.05, squint: 0.05, mouth: 'wavy', w: 7, open: 0 },
    sad: { brow: 0, tilt: 1, eye: 0.8, squint: 0.2, mouth: 'frown', w: 7, open: 0 },
    angry: { brow: 1.6, tilt: -1, eye: 0.85, squint: 0.15, mouth: 'frown', w: 8, open: 0.25 },
    focused: { brow: 0.8, tilt: -0.35, eye: 0.7, squint: 0.3, mouth: 'flat', w: 6, open: 0 },
    excited: { brow: -3, tilt: 0.25, eye: 1.2, sparkle: true, mouth: 'grin', w: 11, open: 0.75 },
  };
  var EXPRESSIONS = Object.keys(EXPR);
  var POSES = ['idle', 'walk', 'run', 'work', 'interact', 'celebrate', 'danger', 'fail'];

  // ---- Skeleton by pose ---------------------------------------------------------
  // Angles in radians from straight down. Front view: + = away from the body (sideways).
  // Side view: + = forward (towards the facing direction). Elbow/knee bends are relative.
  function skeleton(pose, t, view) {
    var s = { bob: 0, lean: 0, headDrop: 0, headTilt: 0, armR: [0.12, -0.08], armL: [0.12, -0.08], legR: [0.02, 0], legL: [0.02, 0], liftR: 0, liftL: 0, crouch: 0, hold: null };
    var side = view === 'side';
    var ph = t * Math.PI * 2;
    if (pose === 'idle') { s.bob = Math.sin(ph * 0.35) * 0.7; }
    else if (pose === 'walk' || pose === 'run') {
      var run = pose === 'run', f = run ? 1.45 : 1, amp = run ? 0.75 : 0.42, sw = Math.sin(ph * f);
      s.bob = -Math.abs(Math.cos(ph * f)) * (run ? 4 : 1.8);
      if (side) {
        s.lean = run ? 0.16 : 0.04;
        s.legR = [sw * amp, Math.max(0, -sw) * (run ? 1.3 : 0.6)]; s.legL = [-sw * amp, Math.max(0, sw) * (run ? 1.3 : 0.6)];
        s.armR = [-sw * amp * 0.9, run ? -1.5 : -0.3]; s.armL = [sw * amp * 0.9, run ? -1.5 : -0.3];
      } else {
        s.liftR = Math.max(0, sw) * (run ? 9 : 5); s.liftL = Math.max(0, -sw) * (run ? 9 : 5);
        s.armR = [0.14 + sw * 0.12, run ? -1.2 : -0.2]; s.armL = [0.14 - sw * 0.12, run ? -1.2 : -0.2];
      }
    } else if (pose === 'work') {
      var w = Math.sin(ph * 2) * 0.12;
      s.armR = side ? [0.9 + w, -0.9] : [-0.25 + w, -1.9]; s.armL = side ? [0.7 - w, -1.1] : [-0.25 - w, -1.9]; s.hold = 'tool'; s.headDrop = 1.5; s.crouch = 3;
    } else if (pose === 'interact') {
      s.armR = side ? [1.45, -0.15] : [1.75 + Math.sin(ph) * 0.06, -0.2]; s.armL = [0.12, -0.1]; s.hold = 'touch';
    } else if (pose === 'celebrate') {
      var j = Math.abs(Math.sin(ph * 1.4)); s.bob = -j * 8; s.armR = [2.75, 0.15]; s.armL = [2.75, 0.15]; s.liftR = j * 4; s.liftL = j * 4;
    } else if (pose === 'danger') {
      s.armR = side ? [1.9, -1.6] : [0.55, -2.3]; s.armL = side ? [1.6, -1.3] : [0.55, -2.3]; s.crouch = 6; s.headDrop = 3; s.lean = side ? -0.08 : 0;
    } else if (pose === 'fail') {
      s.armR = [0.02, 0]; s.armL = [0.02, 0]; s.headDrop = 4; s.headTilt = side ? 0.25 : 0.12; s.crouch = 2;
    }
    return s;
  }

  // ---- Faces ------------------------------------------------------------------
  function face(c, R, e, hx, hy, k, look) {
    // k: horizontal squash for three-quarter view (1 = front). look: -1..1 gaze.
    var ex = 7.6 * k, ey = hy + 1.5, iris = R.iris;
    // Brows.
    c.lineCap = 'round'; c.strokeStyle = R.brow; c.lineWidth = 2.4;
    [-1, 1].forEach(function (s) {
      var bx = hx + s * ex, by = ey - 8.5 + e.brow;
      c.save(); c.translate(bx, by); c.rotate(-s * e.tilt * 0.32);
      c.beginPath(); c.moveTo(-4.5 * k, 0.6); c.quadraticCurveTo(0, -1.6, 4.5 * k, 0.6); c.stroke(); c.restore();
    });
    // Eyes.
    [-1, 1].forEach(function (s) {
      var x = hx + s * ex;
      if (e.happyEyes) { c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 3.6 * k, ey + 1); c.quadraticCurveTo(x, ey - 3.5, x + 3.6 * k, ey + 1); c.stroke(); return; }
      var ry = 4.2 * e.eye;
      ell(c, x, ey, 3.5 * k, ry); c.fillStyle = '#fff'; c.fill(); c.lineWidth = THIN; c.strokeStyle = OUT; c.stroke();
      c.save(); ell(c, x, ey, 3.5 * k, ry); c.clip();
      ell(c, x + look * 1.2 * k, ey + 0.4, 2.5 * k, 2.8); c.fillStyle = iris; c.fill();
      ell(c, x + look * 1.2 * k, ey + 0.4, 1.3 * k, 1.5); c.fillStyle = '#120b0a'; c.fill();
      ell(c, x + look * 1.2 * k + 0.9, ey - 0.8, 0.8, 0.8); c.fillStyle = '#fff'; c.fill();
      if (e.sparkle) { ell(c, x - 1 * k, ey + 1.5, 0.5, 0.5); c.fill(); }
      // Upper lid line and lower squint.
      c.fillStyle = R.skin;
      if (e.squint > 0) { c.beginPath(); c.ellipse(x, ey + ry * 1.9 - ry * 2 * e.squint * 0.6, 4.2 * k, ry, 0, Math.PI, 0); c.fill(); }
      c.restore();
      c.strokeStyle = OUT; c.lineWidth = 1.8; c.beginPath(); c.ellipse(x, ey, 3.5 * k, ry, 0, Math.PI * 1.08, Math.PI * 1.92); c.stroke();
    });
    // Nose.
    c.strokeStyle = shade(R.skin); c.lineWidth = 1.5; c.beginPath(); c.moveTo(hx + 0.6 * k, ey + 3.5); c.quadraticCurveTo(hx + 2 * k, ey + 7.5, hx - 0.4 * k, ey + 8); c.stroke();
    // Cheeks.
    c.fillStyle = 'rgba(230,110,110,0.18)'; ell(c, hx - 9 * k, ey + 6.5, 3 * k, 1.8); c.fill(); ell(c, hx + 9 * k, ey + 6.5, 3 * k, 1.8); c.fill();
    // Mouth.
    var mx = hx + look * 0.8, my = ey + 12.5, w = e.w * k;
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = OUT; c.lineWidth = 1.8;
    if (e.mouth === 'flat') { c.beginPath(); c.moveTo(mx - w / 2, my); c.quadraticCurveTo(mx, my + 0.8, mx + w / 2, my); c.stroke(); }
    else if (e.mouth === 'smile') { c.beginPath(); c.moveTo(mx - w / 2, my - 1.2); c.quadraticCurveTo(mx, my + 3.4, mx + w / 2, my - 1.2); c.stroke(); }
    else if (e.mouth === 'frown') { c.beginPath(); c.moveTo(mx - w / 2, my + 1.6); c.quadraticCurveTo(mx, my - 2.2 - e.open * 2, mx + w / 2, my + 1.6); c.stroke(); }
    else if (e.mouth === 'wavy') { c.beginPath(); c.moveTo(mx - w / 2, my + 0.6); c.quadraticCurveTo(mx - w / 4, my - 1.4, mx, my + 0.4); c.quadraticCurveTo(mx + w / 4, my + 2, mx + w / 2, my); c.stroke(); }
    else {
      // Open mouths: o, grin, laugh.
      c.beginPath();
      if (e.mouth === 'o') ell(c, mx, my + 1, w / 2, 3.2 * e.open + 1);
      else { c.moveTo(mx - w / 2, my - 1.5); c.quadraticCurveTo(mx, my - 0.2, mx + w / 2, my - 1.5); c.quadraticCurveTo(mx + w * 0.38, my + 5.5 * e.open + 1.5, mx, my + 5.8 * e.open + 1.5); c.quadraticCurveTo(mx - w * 0.38, my + 5.5 * e.open + 1.5, mx - w / 2, my - 1.5); c.closePath(); }
      c.fillStyle = '#5b1f24'; c.fill(); c.save(); c.clip();
      if (e.mouth !== 'o') { c.fillStyle = '#fff'; c.fillRect(mx - w, my - 4, w * 2, 3.6); }
      c.fillStyle = '#e07a7f'; ell(c, mx, my + 5.5 * e.open + 1.2, w * 0.26, 2.2); c.fill();
      c.restore(); c.lineWidth = 1.6; c.strokeStyle = OUT; c.stroke();
    }
  }

  // ---- Hair -------------------------------------------------------------------
  function hairBack(c, R, hx, hy, view, facing) {
    var col = R.hair;
    if (R.hairStyle === 'ponytail') {
      var px = view === 'side' ? hx - facing * 17 : view === 'back' ? hx : hx + 15, py = hy - 14;
      c.beginPath(); c.moveTo(px - 4, py); c.quadraticCurveTo(px + (view === 'side' ? -facing * 12 : 9), py + 10, px + (view === 'side' ? -facing * 6 : 6), py + 30);
      c.quadraticCurveTo(px + (view === 'side' ? -facing * 1 : -2), py + 18, px + 4, py + 2); c.closePath(); fillOut(c, col);
    }
    if (R.hairStyle === 'hijab') {
      // Drape behind the head down to the shoulders.
      c.beginPath(); c.moveTo(hx - 24, hy - 4); c.quadraticCurveTo(hx - 26, hy + 26, hx - 18, hy + 34); c.lineTo(hx + 18, hy + 34); c.quadraticCurveTo(hx + 26, hy + 26, hx + 24, hy - 4); c.closePath(); fillOut(c, col);
    }
  }
  function hairFront(c, R, hx, hy, view, facing, k) {
    var col = R.hair, hl = light(col);
    if (R.hairStyle === 'curly') {
      // Short dark curls: a bumpy cap.
      c.beginPath(); c.moveTo(hx - 20, hy - 2);
      for (var i = 0; i <= 8; i++) { var a = Math.PI + i / 8 * Math.PI, x = hx + Math.cos(a) * 20, y = hy - 6 + Math.sin(a) * 19; c.quadraticCurveTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5, x, y); }
      c.quadraticCurveTo(hx + 16, hy - 4, hx + 14, hy - 10); c.quadraticCurveTo(hx, hy - 15, hx - 14, hy - 10); c.quadraticCurveTo(hx - 17, hy - 5, hx - 20, hy - 2);
      fillOut(c, col);
      c.fillStyle = hl; [[-8, -20], [2, -22], [10, -18]].forEach(function (p) { ell(c, hx + p[0] * k, hy + p[1], 2.4, 1.5); c.fill(); });
    } else if (R.hairStyle === 'ponytail') {
      c.beginPath(); c.moveTo(hx - 19, hy + 2); c.quadraticCurveTo(hx - 22, hy - 24, hx, hy - 25); c.quadraticCurveTo(hx + 22, hy - 24, hx + 19, hy + 2);
      c.quadraticCurveTo(hx + 14, hy - 10, hx + 2, hy - 12); c.quadraticCurveTo(hx - 8, hy - 6, hx - 15, hy - 4); c.closePath(); fillOut(c, col);
      c.strokeStyle = hl; c.lineWidth = 2; c.beginPath(); c.moveTo(hx - 8, hy - 20); c.quadraticCurveTo(hx + 2, hy - 23, hx + 10, hy - 19); c.stroke();
      c.fillStyle = R.suit2; ell(c, hx + 15, hy - 15, 3.2, 3.2); c.fill(); c.lineWidth = THIN; c.strokeStyle = OUT; c.stroke(); // hair tie
    } else if (R.hairStyle === 'twists') {
      c.beginPath(); c.moveTo(hx - 19, hy - 1); c.quadraticCurveTo(hx - 21, hy - 22, hx, hy - 23); c.quadraticCurveTo(hx + 21, hy - 22, hx + 19, hy - 1); c.quadraticCurveTo(hx + 15, hy - 11, hx, hy - 12); c.quadraticCurveTo(hx - 15, hy - 11, hx - 19, hy - 1); c.closePath(); fillOut(c, col);
      c.fillStyle = hl; for (var tx = -14; tx <= 14; tx += 5) { ell(c, hx + tx * k, hy - 17 + Math.abs(tx) * 0.25, 1.6, 2.6, tx * 0.03); c.fill(); }
    } else if (R.hairStyle === 'hijab') {
      // Hijab framing the face (the face stays open), folds at the chin.
      c.beginPath(); c.moveTo(hx - 21, hy + 12); c.quadraticCurveTo(hx - 25, hy - 26, hx, hy - 26); c.quadraticCurveTo(hx + 25, hy - 26, hx + 21, hy + 12);
      c.quadraticCurveTo(hx + 18, hy + 26, hx, hy + 27); c.quadraticCurveTo(hx - 18, hy + 26, hx - 21, hy + 12); c.closePath();
      // moveTo first: otherwise the canvas joins the ellipse to the previous point with a line.
      c.moveTo(hx + (1 - k) * 3 + 15 * k, hy + 2); c.ellipse(hx + (1 - k) * 3, hy + 2, 15 * k, 18.5, 0, 0, Math.PI * 2);
      c.fillStyle = col; c.fill('evenodd'); c.lineWidth = LW; c.strokeStyle = OUT; c.stroke();
      c.strokeStyle = shade(col); c.lineWidth = 1.5; c.beginPath(); c.moveTo(hx - 15, hy + 20); c.quadraticCurveTo(hx, hy + 24, hx + 15, hy + 20); c.stroke();
      c.strokeStyle = light(col); c.lineWidth = 2; c.beginPath(); c.moveTo(hx - 14, hy - 20); c.quadraticCurveTo(hx - 4, hy - 24, hx + 6, hy - 23); c.stroke();
    }
  }

  // ---- Head (front / three-quarter / back / side) -------------------------------
  function head(c, R, hx, hy, view, facing, e, k, helmetOn) {
    hairBack(c, R, hx, hy, view, facing);
    if (view === 'back') {
      // Back of the head: hair or hijab only.
      if (R.hairStyle === 'hijab') { ell(c, hx, hy - 2, 22, 24); fillOut(c, R.hair); c.strokeStyle = shade(R.hair); c.lineWidth = 1.5; c.beginPath(); c.moveTo(hx, hy - 20); c.lineTo(hx, hy + 18); c.stroke(); }
      else {
        ell(c, hx - 17, hy + 2, 3, 5); fillOut(c, R.skin, THIN); ell(c, hx + 17, hy + 2, 3, 5); fillOut(c, R.skin, THIN);
        ell(c, hx, hy - 2, 19.5, 21.5); fillOut(c, R.hair);
        c.strokeStyle = light(R.hair); c.lineWidth = 2; c.beginPath(); c.moveTo(hx - 10, hy - 14); c.quadraticCurveTo(hx, hy - 19, hx + 10, hy - 14); c.stroke();
      }
      if (R.extras.headset) headset(c, R, hx, hy, 'back', facing, 1);
      return;
    }
    var side = view === 'side';
    // Ears.
    if (R.hairStyle !== 'hijab') {
      if (side) { ell(c, hx - facing * 3, hy + 1, 3.4, 5); fillOut(c, R.skin, THIN); }
      else { ell(c, hx - 18.5 * k, hy + 2, 3.2, 5); fillOut(c, R.skin, THIN); ell(c, hx + 18.5 * k + (k < 1 ? 3 : 0), hy + 2, k < 1 ? 1.8 : 3.2, 5); fillOut(c, R.skin, THIN); }
    }
    // Face shape.
    if (side) {
      c.beginPath(); c.moveTo(hx - facing * 14, hy - 14); c.quadraticCurveTo(hx + facing * 4, hy - 26, hx + facing * 15, hy - 8);
      c.lineTo(hx + facing * 17, hy + 4); c.lineTo(hx + facing * 15.5, hy + 6); c.quadraticCurveTo(hx + facing * 15, hy + 16, hx + facing * 6, hy + 20);
      c.quadraticCurveTo(hx - facing * 8, hy + 20, hx - facing * 15, hy + 6); c.closePath(); fillOut(c, R.skin);
    } else { ell(c, hx, hy, 18.5 * k + (1 - k) * 2, 21); fillOut(c, R.skin); }
    c.save(); if (side) { c.beginPath(); c.rect(hx - facing * 40, hy - 40, facing * 30, 80); } else { ell(c, hx, hy, 18.5 * k, 21); }
    c.clip(); c.fillStyle = shade(R.skin); c.globalAlpha = 0.22; ell(c, hx + 17 * k, hy + 7, 7, 19); c.fill(); c.restore(); c.globalAlpha = 1;
    // Features.
    if (side) sideFace(c, R, e, hx, hy, facing);
    else face(c, R, e, hx + (1 - k) * 4, hy, k, 0);
    hairFront(c, R, hx, hy, view, facing, k);
    if (side && R.hairStyle !== 'hijab') {
      // Side hair: cover the back of the skull.
      c.beginPath(); c.moveTo(hx + facing * 12, hy - 14); c.quadraticCurveTo(hx, hy - 27, hx - facing * 16, hy - 12); c.quadraticCurveTo(hx - facing * 18, hy + 6, hx - facing * 12, hy + 12); c.quadraticCurveTo(hx - facing * 6, hy - 6, hx + facing * 12, hy - 14); c.closePath(); fillOut(c, R.hair);
    }
    if (R.extras.glasses && !side) { c.strokeStyle = OUT; c.lineWidth = 1.6; var gx = hx + (1 - k) * 4; ell(c, gx - 7.6 * k, hy + 1.5, 5.2 * k, 4.8); c.stroke(); ell(c, gx + 7.6 * k, hy + 1.5, 5.2 * k, 4.8); c.stroke(); c.beginPath(); c.moveTo(gx - 2.4 * k, hy + 1); c.lineTo(gx + 2.4 * k, hy + 1); c.stroke(); }
    if (R.extras.glasses && side) { c.strokeStyle = OUT; c.lineWidth = 1.6; ell(c, hx + facing * 10, hy + 1.5, 3, 4.5); c.stroke(); c.beginPath(); c.moveTo(hx + facing * 7, hy + 1); c.lineTo(hx - facing * 4, hy); c.stroke(); }
    if (R.extras.goggles && !helmetOn) goggles(c, R, hx, hy, view, facing, k);
    if (R.extras.headset) headset(c, R, hx, hy, view, facing, k);
  }
  function sideFace(c, R, e, hx, hy, f) {
    var ex = hx + f * 9, ey = hy + 1.5;
    c.lineCap = 'round'; c.strokeStyle = R.brow; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(ex - f * 3.5, ey - 8 + e.brow + e.tilt * 1.2); c.lineTo(ex + f * 3, ey - 8.5 + e.brow - e.tilt * 0.6); c.stroke();
    if (e.happyEyes) { c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(ex - f * 2.5, ey + 1); c.quadraticCurveTo(ex, ey - 3, ex + f * 2.5, ey + 1); c.stroke(); }
    else {
      var ry = 4 * e.eye; ell(c, ex, ey, 2.4, ry); c.fillStyle = '#fff'; c.fill(); c.lineWidth = THIN; c.strokeStyle = OUT; c.stroke();
      ell(c, ex + f * 0.8, ey + 0.4, 1.6, 2.6); c.fillStyle = R.iris; c.fill(); ell(c, ex + f * 1.2, ey - 0.8, 0.6, 0.6); c.fillStyle = '#fff'; c.fill();
    }
    var mx = hx + f * 12, my = ey + 12.5;
    c.strokeStyle = OUT; c.lineWidth = 1.8; c.beginPath();
    if (e.open > 0.3) { ell(c, mx, my + 1, 2.4, 1.5 + e.open * 2.2); c.fillStyle = '#5b1f24'; c.fill(); c.stroke(); }
    else { var curve = e.mouth === 'smile' || e.mouth === 'grin' ? -1.6 : e.mouth === 'frown' ? 1.6 : 0; c.moveTo(mx - f * 4, my + curve); c.lineTo(mx + f * 0.5, my); c.stroke(); }
  }
  function goggles(c, R, hx, hy, view, f, k) {
    if (view === 'side') { c.fillStyle = R.trim; c.fillRect(hx - f * 16 - (f < 0 ? 32 : 0), hy - 15, 32, 4); rr(c, hx + f * 6 - 5, hy - 19, 10, 8, 3); fillOut(c, '#7fd8ff', THIN); return; }
    c.strokeStyle = OUT; c.lineWidth = 5.6; c.beginPath(); c.moveTo(hx - 21, hy - 12); c.quadraticCurveTo(hx, hy - 18, hx + 21, hy - 12); c.stroke();
    c.strokeStyle = R.trim; c.lineWidth = 3.4; c.stroke();
    [-1, 1].forEach(function (s) { rr(c, hx + s * 7.5 * k - 6, hy - 21, 12, 9, 4); fillOut(c, R.trim, THIN); rr(c, hx + s * 7.5 * k - 4.3, hy - 19.4, 8.6, 6, 3); c.fillStyle = '#7fd8ff'; c.fill(); c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillRect(hx + s * 7.5 * k - 3, hy - 18.6, 2.4, 1.6); });
  }
  function headset(c, R, hx, hy, view, f, k) {
    if (view === 'side') {
      c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.arc(hx - f * 2, hy - 2, 24, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); c.strokeStyle = '#3a3f4c'; c.lineWidth = 3; c.stroke();
      ell(c, hx - f * 3, hy + 2, 6, 7.5); fillOut(c, '#3a3f4c'); ell(c, hx - f * 3, hy + 2, 3, 4); c.fillStyle = R.accent; c.fill();
      c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(hx - f * 1, hy + 8); c.quadraticCurveTo(hx + f * 6, hy + 16, hx + f * 13, hy + 14); c.stroke(); c.strokeStyle = '#3a3f4c'; c.lineWidth = 1.6; c.stroke();
      return;
    }
    c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.arc(hx, hy - 2, 25, Math.PI * 1.08, Math.PI * 1.92); c.stroke(); c.strokeStyle = '#3a3f4c'; c.lineWidth = 3; c.stroke();
    [-1, 1].forEach(function (s) { ell(c, hx + s * 22 * k, hy + 2, 5.5, 8); fillOut(c, '#3a3f4c'); ell(c, hx + s * 22 * k, hy + 2, 2.6, 4.4); c.fillStyle = R.accent; c.fill(); });
    if (view !== 'back') { c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(hx + 22 * k, hy + 9); c.quadraticCurveTo(hx + 21 * k, hy + 19, hx + 12 * k, hy + 16.5); c.stroke(); c.strokeStyle = '#3a3f4c'; c.lineWidth = 1.6; c.stroke(); ell(c, hx + 11 * k, hy + 16.3, 2.6, 2.1); fillOut(c, '#3a3f4c', THIN); }
  }

  // ---- Small props --------------------------------------------------------------
  function patch(c, R, x, y, r) {
    ell(c, x, y, r, r); fillOut(c, R.patch === 'orbit' ? '#f4f1ea' : R.suit2 === R.suit ? '#fff' : light(R.suit2), THIN);
    c.lineWidth = 1.4; c.strokeStyle = OUT; c.fillStyle = R.trim;
    if (R.patch === 'gear') { for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4; c.fillRect(x + Math.cos(a) * r * 0.55 - 0.9, y + Math.sin(a) * r * 0.55 - 0.9, 1.8, 1.8); } ell(c, x, y, r * 0.42, r * 0.42); c.fillStyle = R.suit; c.fill(); c.stroke(); }
    else if (R.patch === 'leaf') { c.beginPath(); c.moveTo(x - r * 0.5, y + r * 0.5); c.quadraticCurveTo(x - r * 0.6, y - r * 0.6, x + r * 0.55, y - r * 0.55); c.quadraticCurveTo(x + r * 0.5, y + r * 0.5, x - r * 0.5, y + r * 0.5); c.fillStyle = R.suit2; c.fill(); c.stroke(); }
    else if (R.patch === 'medic') { c.fillStyle = R.suit2; c.fillRect(x - r * 0.18, y - r * 0.6, r * 0.36, r * 1.2); c.fillRect(x - r * 0.6, y - r * 0.18, r * 1.2, r * 0.36); }
    else if (R.patch === 'orbit') { ell(c, x, y, r * 0.3, r * 0.3); c.fillStyle = R.accent; c.fill(); c.beginPath(); c.ellipse(x, y, r * 0.75, r * 0.32, -0.4, 0, Math.PI * 2); c.strokeStyle = R.suit; c.stroke(); }
  }
  function tool(c, R, x, y, kind) {
    if (kind === 'wrench') { c.save(); c.translate(x, y); c.rotate(0.5); rr(c, -1.6, -2, 3.2, 14, 1.2); fillOut(c, '#b8bec8', THIN); ell(c, 0, -3, 3.4, 3.4); fillOut(c, '#b8bec8', THIN); c.fillStyle = R.suit; c.fillRect(-1, -6.6, 2, 3.4); c.restore(); }
    if (kind === 'scanner') { rr(c, x - 5, y - 7, 10, 14, 2.5); fillOut(c, R.trim, THIN); rr(c, x - 3.2, y - 5, 6.4, 6, 1.5); c.fillStyle = R.extras.scanner === 'plant' ? '#9dff9a' : '#8af3ff'; c.fill(); }
    if (kind === 'tablet') { c.save(); c.translate(x, y); c.rotate(-0.15); rr(c, -11, -8, 22, 16, 2.5); fillOut(c, '#2d3242', THIN); rr(c, -9, -6, 18, 12, 1.5); c.fillStyle = '#4fd6c8'; c.fill(); c.strokeStyle = '#1b4a52'; c.lineWidth = 0.8; c.beginPath(); c.arc(0, 0, 4, 0, 6.3); c.moveTo(-7, 3); c.lineTo(-2, -1); c.lineTo(2, 2); c.lineTo(7, -3); c.stroke(); c.restore(); }
    if (kind === 'trowel') { c.save(); c.translate(x, y); c.rotate(-0.3); rr(c, -1.4, -9, 2.8, 7, 1); fillOut(c, '#7a5a3a', THIN); c.beginPath(); c.moveTo(-3.4, -2); c.lineTo(3.4, -2); c.lineTo(0, 7); c.closePath(); fillOut(c, '#c7ccd4', THIN); c.restore(); }
  }

  // ---- Body ---------------------------------------------------------------------
  // Front / three-quarter / back share this function; `back` hides the face and shows packs.
  function bodyFront(c, R, s, view, opts) {
    var back = view === 'back', k = view === 'threeq' ? 0.86 : 1, cx = 60 + (view === 'threeq' ? 3 : 0);
    var bob = s.bob + s.crouch, suit = opts.tint || R.suit, eva = opts.helmet && !R.extras.flightSuit;
    var shY = 74 + bob, hipY = 124 + bob, sw = 21.5 * k, hw = 14 * k;
    // Legs (behind torso).
    function leg(side, lift, ang) {
      var hx = cx + side * hw * 0.62, top = hipY - 2;
      var knee = { x: hx + side * Math.sin(ang[0]) * 30, y: top + 30 - lift * 0.6 }, foot = { x: knee.x, y: 186 - lift + (s.crouch * 0.2) };
      capsule(c, hx, top, knee.x, knee.y, 16.5, suit, side);
      if (R.extras.kneepads) { ell(c, knee.x, knee.y, 6.6, 6); fillOut(c, R.trim, THIN); }
      capsule(c, knee.x, knee.y, foot.x, foot.y, 15, suit, side);
      if (R.suit2 && R.extras.seeds) { c.strokeStyle = R.suit2; c.lineWidth = 3; c.beginPath(); c.moveTo(hx + side * 5.5, top + 6); c.lineTo(foot.x + side * 5.2, foot.y - 10); c.stroke(); }
      if (R.extras.flightSuit) { c.strokeStyle = R.accent; c.lineWidth = 2.2; c.beginPath(); c.moveTo(hx + side * 6, top + 4); c.lineTo(foot.x + side * 5.6, foot.y - 12); c.stroke(); }
      // Boot.
      rr(c, foot.x - 9.5, foot.y - 10, 19, 14, 5); fillOut(c, R.boot);
      c.fillStyle = R.bootSole; c.fillRect(foot.x - 8.5, foot.y + 1.5, 17, 2.4);
      if (!back && opts.scanner && side > 0 && R.extras.scanner === 'plant') tool(c, R, knee.x + 7, knee.y - 10, 'scanner');
    }
    leg(-1, s.liftL, s.legL); leg(1, s.liftR, s.legR);
    // EVA life-support pack behind the shoulders (visible as edges from the front).
    if (eva || R.extras.medpack) {
      var packCol = R.extras.medpack ? R.pack : '#d8dbe2';
      if (back) { rr(c, cx - 20 * k, shY - 4, 40 * k, 44, 7); fillOut(c, packCol); c.fillStyle = shade(packCol); c.fillRect(cx - 18 * k, shY + 30, 36 * k, 6);
        if (R.extras.medpack) { ell(c, cx, shY + 14, 8, 8); c.fillStyle = '#fff'; c.fill(); c.fillStyle = R.suit2; c.fillRect(cx - 1.6, shY + 8.5, 3.2, 11); c.fillRect(cx - 5.5, shY + 12.4, 11, 3.2); }
        else { c.fillStyle = R.trim; c.fillRect(cx - 12 * k, shY + 6, 24 * k, 4); ell(c, cx + 9, shY + 22, 3, 3); c.fillStyle = '#6ee07a'; c.fill(); } }
      else { rr(c, cx - 24 * k, shY - 4, 48 * k, 36, 7); fillOut(c, packCol); }
    }
    // Torso.
    c.beginPath();
    c.moveTo(cx - sw, shY - 1); c.quadraticCurveTo(cx, shY - 6, cx + sw, shY - 1);
    c.quadraticCurveTo(cx + sw + 2, shY + 22, cx + hw + 1, hipY - 6); c.lineTo(cx + hw, hipY + 2); c.lineTo(cx - hw, hipY + 2); c.lineTo(cx - hw - 1, hipY - 6);
    c.quadraticCurveTo(cx - sw - 2, shY + 22, cx - sw, shY - 1); c.closePath(); fillOut(c, suit);
    c.save(); c.clip();
    c.fillStyle = shade(suit); c.beginPath(); c.moveTo(cx + sw * 0.35, shY - 8); c.lineTo(cx + sw + 4, shY - 8); c.lineTo(cx + sw + 4, hipY + 4); c.lineTo(cx + hw * 0.2, hipY + 4); c.closePath(); c.globalAlpha = 0.5; c.fill(); c.globalAlpha = 1;
    if (!back) {
      if (R.extras.flightSuit) { c.strokeStyle = R.trim; c.lineWidth = 3; c.beginPath(); c.moveTo(cx - 6, shY - 2); c.lineTo(cx, shY + 8); c.lineTo(cx + 6, shY - 2); c.stroke(); c.strokeStyle = OUT; c.lineWidth = THIN; c.beginPath(); c.moveTo(cx, shY + 8); c.lineTo(cx, hipY - 4); c.stroke(); c.fillStyle = R.accent; c.fillRect(cx - sw - 2, shY + 12, sw * 2 + 4, 3); }
      else if (R.extras.goggles) { rr(c, cx - 11 * k, shY + 6, 22 * k, 22, 4); fillOut(c, R.suit2, THIN); c.fillStyle = '#58e0ff'; c.fillRect(cx - 7 * k, shY + 11, 6, 3); c.fillStyle = R.accent; c.fillRect(cx + 1, shY + 11, 6 * k, 3); c.fillStyle = R.trim; c.fillRect(cx - 7 * k, shY + 18, 14 * k, 2); }
      else if (R.extras.seeds) { c.fillStyle = R.suit2; c.fillRect(cx - sw - 2, shY - 4, 7, hipY - shY + 6); c.fillRect(cx + sw - 5, shY - 4, 7, hipY - shY + 6); c.strokeStyle = R.accent; c.lineWidth = 1.4; c.beginPath(); c.moveTo(cx - sw + 5, shY); c.lineTo(cx - hw + 3, hipY); c.moveTo(cx + sw - 5, shY); c.lineTo(cx + hw - 3, hipY); c.stroke(); }
      else if (R.extras.medpack) { c.fillStyle = R.suit2; c.beginPath(); c.moveTo(cx - sw - 2, shY - 4); c.lineTo(cx + sw + 2, shY - 4); c.lineTo(cx + sw + 2, shY + 8); c.quadraticCurveTo(cx, shY + 14, cx - sw - 2, shY + 8); c.fill(); c.strokeStyle = R.accent; c.lineWidth = 1.3; c.beginPath(); c.moveTo(cx - sw, shY + 10); c.quadraticCurveTo(cx, shY + 16, cx + sw, shY + 10); c.stroke(); c.strokeStyle = shade(R.pack); c.lineWidth = 3.5; c.beginPath(); c.moveTo(cx - 12 * k, shY + 2); c.lineTo(cx - 10 * k, hipY - 8); c.moveTo(cx + 12 * k, shY + 2); c.lineTo(cx + 10 * k, hipY - 8); c.stroke(); }
    } else {
      c.strokeStyle = shade(suit); c.lineWidth = 1.4; c.beginPath(); c.moveTo(cx, shY + 2); c.lineTo(cx, hipY - 4); c.stroke();
    }
    c.restore();
    // Belt.
    rr(c, cx - hw - 2, hipY - 12, (hw + 2) * 2, 7, 2); fillOut(c, R.extras.toolbelt ? '#3d342c' : R.trim, THIN);
    if (!back) {
      rr(c, cx - 3.5, hipY - 12.5, 7, 8, 1.5); fillOut(c, R.accent, THIN);
      if (R.extras.toolbelt) { rr(c, cx - hw - 4, hipY - 10, 7, 10, 2); fillOut(c, '#6b5844', THIN); rr(c, cx + hw - 3, hipY - 10, 7, 10, 2); fillOut(c, '#6b5844', THIN); if (opts.props) tool(c, R, cx + hw + 5, hipY - 2, 'wrench'); }
      if (R.extras.seeds) { for (var q = 0; q < 3; q++) { var sx = cx - hw + 1 + q * 5.2; rr(c, sx - 2, hipY - 8, 4.2, 9, 1.5); fillOut(c, '#dfe8de', THIN); c.fillStyle = R.suit2; c.fillRect(sx - 2, hipY - 8, 4.2, 2.4); } if (opts.props) tool(c, R, cx + hw + 6, hipY - 1, 'trowel'); }
    }
    // Arms.
    function arm(side, a) {
      var sx = cx + side * (sw - 2), sy = shY + 4;
      var el = joint(sx, sy, 25, side * a[0]), wr = joint(el.x, el.y, 23, side * (a[0] + a[1]));
      capsule(c, sx, sy, el.x, el.y, 15, suit, -side);
      if (!R.extras.flightSuit) { c.strokeStyle = R.extras.goggles ? R.suit2 : R.suit2; c.lineWidth = 4; c.lineCap = 'butt'; var m = { x: (sx + el.x) / 2, y: (sy + el.y) / 2 }; c.beginPath(); c.moveTo(m.x - 6, m.y + (el.x - sx) * 0.05); c.lineTo(m.x + 6, m.y - (el.x - sx) * 0.05); c.globalAlpha = R.extras.medpack || R.extras.goggles ? 1 : 0; c.stroke(); c.globalAlpha = 1; }
      capsule(c, el.x, el.y, wr.x, wr.y, 13.5, suit, -side);
      if (R.extras.flightSuit) { c.strokeStyle = R.accent; c.lineWidth = 2; c.beginPath(); c.moveTo(sx + side * 3, sy + 2); c.lineTo(wr.x + side * 3, wr.y - 4); c.stroke(); }
      // Cuff + wrist device + glove.
      ell(c, wr.x, wr.y, 6.6, 4.4, Math.atan2(wr.y - el.y, wr.x - el.x) + Math.PI / 2); fillOut(c, R.trim, THIN);
      if (side < 0 && R.extras.wrist && !back) { rr(c, wr.x - 5, wr.y - 9, 10, 6.5, 1.8); fillOut(c, '#2d3242', THIN); c.fillStyle = R.extras.wrist === 'health' ? '#ff7a8a' : '#58e0ff'; c.fillRect(wr.x - 3.6, wr.y - 7.6, 7.2, 3.6); if (R.extras.wrist === 'health') { c.strokeStyle = '#fff'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(wr.x - 3.4, wr.y - 5.8); c.lineTo(wr.x - 1, wr.y - 5.8); c.lineTo(wr.x, wr.y - 7.4); c.lineTo(wr.x + 1, wr.y - 4.4); c.lineTo(wr.x + 3.4, wr.y - 5.8); c.stroke(); } }
      var hand = joint(wr.x, wr.y, 5, side * (a[0] + a[1]));
      ell(c, hand.x, hand.y, 7, 7.4); fillOut(c, R.glove);
      c.fillStyle = light(R.glove); ell(c, hand.x - 1.6, hand.y - 1.8, 2, 1.4); c.fill();
      return hand;
    }
    var hl = arm(-1, s.armL), hr = arm(1, s.armR);
    // Shoulder patch.
    if (!back) patch(c, R, cx + (sw - 3), shY + 8, 5.2);
    else if (R.extras.flightSuit) { rr(c, cx - 12, shY + 8, 24, 12, 3); fillOut(c, R.trim, THIN); c.fillStyle = R.suit; c.font = 'bold 7px sans-serif'; c.textAlign = 'center'; c.fillText('MCC', cx, shY + 17); }
    // Held items.
    if (!back) {
      if (R.extras.tablet && (opts.pose === 'idle' || opts.pose === 'work' || opts.pose === 'walk')) tool(c, R, hl.x + 6, hl.y - 4, 'tablet');
      if (s.hold === 'tool') tool(c, R, (hl.x + hr.x) / 2, (hl.y + hr.y) / 2 - 2, R.extras.goggles ? 'wrench' : R.extras.tablet ? 'tablet' : 'scanner');
    }
    return { neck: { x: cx, y: shY - 4 }, hl: hl, hr: hr };
  }

  // Side view: far limbs first (darker), torso, near limbs.
  function bodySide(c, R, s, f, opts) {
    var bob = s.bob + s.crouch, suit = opts.tint || R.suit, eva = opts.helmet && !R.extras.flightSuit;
    var cx = 60, shY = 74 + bob, hipY = 124 + bob;
    c.save(); c.translate(cx, hipY); c.rotate(f * s.lean); c.translate(-cx, -hipY);
    function leg(a, near) {
      var hx = cx, top = hipY - 4, col = near ? suit : shade(suit);
      var knee = joint(hx, top, 30, f * a[0]), foot = joint(knee.x, knee.y, 30, f * (a[0] - a[1]));
      capsule(c, hx, top, knee.x, knee.y, 16.5, col, f);
      if (R.extras.kneepads && near) { ell(c, knee.x + f * 3, knee.y, 5, 6); fillOut(c, R.trim, THIN); }
      capsule(c, knee.x, knee.y, foot.x, foot.y, 15, col, f);
      if (R.extras.flightSuit) { c.strokeStyle = R.accent; c.lineWidth = 2; c.beginPath(); c.moveTo(hx, top + 4); c.lineTo(foot.x, foot.y - 10); c.stroke(); }
      c.save(); c.translate(foot.x, foot.y); rr(c, f > 0 ? -7 : -11, -6, 18, 12, 4); fillOut(c, near ? R.boot : shade(R.boot)); c.fillStyle = R.bootSole; c.fillRect(f > 0 ? -6 : -10, 3.5, 16, 2); c.restore();
    }
    function arm(a, near) {
      var sx = cx + f * 2, sy = shY + 5, col = near ? suit : shade(suit);
      var el = joint(sx, sy, 25, f * a[0]), wr = joint(el.x, el.y, 23, f * (a[0] + a[1] * -1));
      capsule(c, sx, sy, el.x, el.y, 14.5, col, -f); capsule(c, el.x, el.y, wr.x, wr.y, 13, col, -f);
      ell(c, wr.x, wr.y, 5.6, 4.2); fillOut(c, R.trim, THIN);
      var hand = joint(wr.x, wr.y, 5, f * (a[0] - a[1])); ell(c, hand.x, hand.y, 5.8, 6); fillOut(c, near ? R.glove : shade(R.glove));
      if (near && R.extras.wrist) { rr(c, wr.x - 4, wr.y - 8, 8, 5.5, 1.5); fillOut(c, '#2d3242', THIN); c.fillStyle = R.extras.wrist === 'health' ? '#ff7a8a' : '#58e0ff'; c.fillRect(wr.x - 2.8, wr.y - 6.8, 5.6, 3); }
      return hand;
    }
    arm(s.armL, false); leg(s.legL, false);
    if (eva || R.extras.medpack) { rr(c, cx - f * 22 - (f > 0 ? 0 : -12) - 6, shY - 2, 18, 42, 6); fillOut(c, R.extras.medpack ? R.pack : '#d8dbe2'); if (R.extras.medpack) { c.fillStyle = R.suit2; c.fillRect(cx - f * 15 - 1.5, shY + 12, 3, 10); c.fillRect(cx - f * 15 - 5, shY + 15.5, 10, 3); } }
    // Torso (profile).
    c.beginPath(); c.moveTo(cx - f * 13, shY - 2); c.quadraticCurveTo(cx + f * 10, shY - 7, cx + f * 15, shY + 8); c.quadraticCurveTo(cx + f * 16, shY + 30, cx + f * 11, hipY + 2); c.lineTo(cx - f * 12, hipY + 2); c.quadraticCurveTo(cx - f * 16, shY + 24, cx - f * 13, shY - 2); c.closePath(); fillOut(c, suit);
    c.save(); c.clip(); c.fillStyle = shade(suit); c.globalAlpha = 0.45; c.fillRect(f > 0 ? cx - 16 : cx + 4, shY - 8, 12, 70); c.globalAlpha = 1;
    if (R.extras.flightSuit) { c.fillStyle = R.accent; c.fillRect(cx - 16, shY + 12, 32, 3); }
    else if (R.extras.seeds || R.extras.medpack) { c.fillStyle = R.suit2; c.fillRect(cx - 16, shY - 6, 32, 9); }
    c.restore();
    rr(c, cx - 11, hipY - 12, 23, 7, 2); fillOut(c, R.extras.toolbelt ? '#3d342c' : R.trim, THIN);
    if (R.extras.toolbelt) { rr(c, cx + f * 6 - 3.5, hipY - 10, 7, 10, 2); fillOut(c, '#6b5844', THIN); }
    if (R.extras.seeds) { rr(c, cx + f * 5 - 2, hipY - 9, 4.2, 9, 1.5); fillOut(c, '#dfe8de', THIN); c.fillStyle = R.suit2; c.fillRect(cx + f * 5 - 2, hipY - 9, 4.2, 2.4); }
    leg(s.legR, true);
    var hand = arm(s.armR, true);
    if (s.hold === 'tool') tool(c, R, hand.x + f * 3, hand.y - 3, R.extras.goggles ? 'wrench' : R.extras.tablet ? 'tablet' : 'scanner');
    else if (R.extras.tablet && opts.pose === 'idle') tool(c, R, hand.x + f * 4, hand.y - 6, 'tablet');
    c.restore();
    return { neck: { x: cx + f * 1, y: shY - 4 } };
  }

  // ---- EVA helmet ------------------------------------------------------------------
  function helmet(c, R, hx, hy, view, f) {
    var rim = R.trim;
    ell(c, hx + (view === 'side' ? f * 2 : 0), hy - 1, 29, 30);
    c.fillStyle = 'rgba(190,225,255,0.22)'; c.fill(); c.lineWidth = LW; c.strokeStyle = OUT; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.arc(hx + (view === 'side' ? f * 2 : 0), hy - 1, 24, Math.PI * 1.15, Math.PI * 1.42); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.6; c.beginPath(); c.arc(hx, hy - 1, 24, Math.PI * 1.5, Math.PI * 1.58); c.stroke();
    // Neck ring.
    rr(c, hx - 22, hy + 22, 44, 9, 4); fillOut(c, rim); c.fillStyle = light(rim); c.fillRect(hx - 18, hy + 24, 36, 2);
    if (view !== 'back') { ell(c, hx + 22, hy + 6, 3, 3); c.fillStyle = '#6ee07a'; c.fill(); }
  }

  // ---- Public draw ---------------------------------------------------------------
  // opts: view (front|threeq|side|back), facing (1 right, -1 left; side view), pose, t (seconds),
  // expression, helmet (EVA helmet + pack; ignored for Mission Control), tint (suit colour),
  // props (show belt tools), scanner (show holstered scanner).
  function draw(c, role, x, y, w, h, opts) {
    opts = opts || {};
    var R = ROLES[role] || ROLES.engineer, view = opts.view || 'front', f = opts.facing || 1;
    var pose = opts.pose || 'idle', t = opts.t || 0, e = EXPR[opts.expression || 'neutral'] || EXPR.neutral;
    var s = skeleton(pose, t, view);
    var helmetOn = !!opts.helmet && !R.extras.flightSuit;
    var k = Math.min(w / 120, h / 210);
    c.save();
    c.translate(x + (w - 120 * k) / 2, y + (h - 210 * k)); c.scale(k, k); c.translate(0, 8);
    var hy = 40 + s.bob + s.crouch + s.headDrop, hx = 60 + (view === 'threeq' ? 4 : 0);
    var o = { tint: opts.tint, helmet: helmetOn, pose: pose, props: opts.props !== false, scanner: opts.props !== false };
    if (view === 'side') {
      if (R.extras.headset || R.hairStyle === 'ponytail' || R.hairStyle === 'hijab') hairBack(c, R, hx + f * 1, hy, 'side', f);
      bodySide(c, R, s, f, o);
      c.save(); c.translate(hx, hy + 18); c.rotate(f * (s.headTilt + s.lean * 0.5)); c.translate(-hx, -hy - 18);
      head(c, R, hx + f * 1, hy, 'side', f, e, 1, helmetOn);
      if (helmetOn) helmet(c, R, hx + f * 1, hy, 'side', f);
      c.restore();
    } else {
      var kk = view === 'threeq' ? 0.86 : 1;
      if (view !== 'back') hairBack(c, R, hx, hy, view, f);
      bodyFront(c, R, s, view, o);
      c.save(); c.translate(hx, hy + 18); c.rotate(s.headTilt); c.translate(-hx, -hy - 18);
      // Neck.
      if (R.hairStyle !== 'hijab') { rr(c, hx - 6, hy + 14, 12, 14, 4); fillOut(c, R.skin, THIN); }
      head(c, R, hx, hy, view, f, e, kk, helmetOn);
      if (helmetOn) helmet(c, R, hx, hy, view, f);
      c.restore();
    }
    c.restore();
  }
  // A head-and-shoulders portrait with a soft backdrop (for HUD, dialogue boxes, menus).
  function portrait(c, role, x, y, size, opts) {
    opts = opts || {};
    var R = ROLES[role] || ROLES.engineer;
    c.save();
    if (opts.background !== false) {
      var g = c.createLinearGradient(x, y, x, y + size); g.addColorStop(0, light(R.suit === '#f1f3ef' || R.suit === '#f5f8fa' ? R.suit2 : R.suit)); g.addColorStop(1, R.suit === '#f1f3ef' || R.suit === '#f5f8fa' ? R.suit2 : R.suit);
      c.fillStyle = g; c.fillRect(x, y, size, size);
    }
    c.beginPath(); c.rect(x, y, size, size); c.clip();
    // Head and shoulders: the head (about 44 units tall) fills ~58% of the frame, centred at 46%.
    var k = size * 0.58 / 44;
    draw(c, role, x + size / 2 - 60 * k, y + size * 0.46 - 48 * k, 120 * k, 210 * k, { view: 'front', expression: opts.expression || 'smiling', pose: 'idle', helmet: false, props: false, tint: opts.tint, t: opts.t });
    c.restore();
  }

  var api = { ROLES: ROLES, EXPRESSIONS: EXPRESSIONS, POSES: POSES, VIEWS: ['front', 'threeq', 'side', 'back'], draw: draw, portrait: portrait, skeleton: skeleton };
  root.CrewAvatar = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
