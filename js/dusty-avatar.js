// Dusty, the crew's robot companion, drawn from the project reference image
// (references/dusty-avatar-reference.png.jpeg): a glossy white robot with a large rounded head,
// light-blue over-ear headphones with a headband and boom microphone, a black glass face display
// with glowing cyan eyes, brows and an open smile, a dark mechanical neck, and a white torso with
// dark joints and grey mechanical hands.
//
// The character is built from separate vector layers (body, arms, neck, head shell, headband,
// ear cups, microphone, visor, eyes, pupils, eyelids, brows, mouth) so it stays sharp at every size
// and every part can move. One shared controller animates the character; every screen draws that
// same state, so Dusty looks and feels identical everywhere.
(function (root) {
  'use strict';

  // ---- Palette sampled from the reference -----------------------------------
  var C = {
    shellHi: '#ffffff', shell: '#eef1f5', shellMid: '#dde2e9', shellShade: '#c3cad4', shellDeep: '#a7afbb',
    edge: 'rgba(52, 60, 78, 0.55)',
    joint: '#3a3e47', jointDark: '#23262c', jointHi: '#6c717c',
    phoneHi: '#dcf0fb', phone: '#a9d3ec', phoneMid: '#82b9dd', phoneDark: '#5b93bf', phoneDeep: '#41749e',
    visor: '#090b10', visorEdge: '#262c3a',
    glow: '#63f2ff', glowDeep: '#2fd3ec', iris: '#06141b', irisRing: '#0f4855', pupil: '#020407',
    mouthIn: '#1b0910', teeth: '#f4fbff', tongue: '#ff8ea3',
    hand: '#9aa1ad', handHi: '#d0d4db', handDark: '#4a4f58',
  };

  // Expression targets. Units are design units (the character is drawn in a 200 x 240 box).
  // brow: vertical offset (negative = raised); browTilt: + inner ends up (worried), - inner ends down;
  // browAsym: raises the right brow only; lidTop / lidBot: 0..1 eye coverage; lidTilt: + outer side
  // lower (sad); eye: eye scale; mW/mS/mO: mouth width, smile (-1 frown .. 1 smile), openness 0..1;
  // mX: mouth sideways offset; tilt: head tilt (radians); drop: head lowered; gx/gy: gaze bias;
  // arms: named pose; bounce: celebratory hop.
  // The idle face is the reference image's own expression: round open eyes and a friendly open grin.
  // laugh: 0..1 chuckle (fast body shake, "ha-ha" mouth and swaying microphone).
  var BASE = { brow: 0, browTilt: 0, browAsym: 0, lidTop: 0.02, lidBot: 0, lidTilt: 0, eye: 1, mW: 32, mS: 0.9, mO: 0.36, mX: 0, tilt: 0, drop: 0, gx: 0, gy: 0, arms: 'rest', bounce: 0, glow: 1, laugh: 0 };
  var EXPRESSIONS = {
    idle: {},
    blinking: {},
    speaking: {},
    welcome: { brow: -3, lidBot: 0.18, eye: 1.04, mW: 38, mS: 1, mO: 0.55, tilt: 0.06, arms: 'wave' },
    waving: { brow: -3, lidBot: 0.18, eye: 1.04, mW: 38, mS: 1, mO: 0.5, tilt: 0.06, arms: 'wave' },
    happy: { brow: -2.5, lidBot: 0.12, mW: 38, mS: 1, mO: 0.55, arms: 'open' },
    celebrating: { brow: -5, lidBot: 0.46, mW: 40, mS: 1, mO: 0.78, arms: 'cheer', bounce: 1, glow: 1.15 },
    curious: { brow: -3, browAsym: 4, lidTop: 0, eye: 1.12, mW: 15, mS: 0.15, mO: 0.32, tilt: 0.12, gx: 0.15, gy: -0.1 },
    thinking: { brow: 0.5, browTilt: -0.2, browAsym: 3, lidTop: 0.14, mW: 17, mS: -0.15, mO: 0.06, mX: 6, tilt: -0.08, gx: 0.6, gy: -0.7, arms: 'think' },
    guiding: { brow: -1.5, mW: 32, mS: 0.85, mO: 0.32, gx: 0.65, gy: 0.05, tilt: 0.04, arms: 'point' },
    encouraging: { brow: -2.5, browTilt: 0.25, lidBot: 0.22, mW: 36, mS: 1, mO: 0.42, tilt: -0.05, arms: 'fist' },
    worried: { brow: -1, browTilt: 1, lidTop: 0.12, eye: 0.96, mW: 22, mS: -0.55, mO: 0.1, gx: -0.15, gy: 0.1, arms: 'hold' },
    sad: { brow: 1.5, browTilt: 1.25, lidTop: 0.34, lidTilt: 0.5, eye: 0.94, mW: 20, mS: -0.95, mO: 0.04, tilt: -0.05, drop: 3, gy: 0.55, arms: 'droop', glow: 0.8 },
    alert: { brow: -6, browTilt: 0.2, lidTop: 0, eye: 1.16, mW: 17, mS: 0, mO: 0.6, arms: 'brace', glow: 1.15 },
    listening: { brow: -1.5, mW: 22, mS: 0.55, mO: 0.1, tilt: 0.09, gx: -0.2, gy: -0.1 },
    // Used by the welcome entrance: wide bright eyes and raised brows, then a real laugh with
    // crescent eyes, a wide open mouth and a small body bounce.
    excited: { brow: -6, lidTop: 0, eye: 1.14, mW: 40, mS: 1, mO: 0.62, tilt: 0.05, arms: 'wave', bounce: 0.45, glow: 1.2 },
    laughing: { brow: -5, browTilt: -0.15, lidTop: 0, lidBot: 0.62, eye: 1.02, mW: 42, mS: 1, mO: 0.72, tilt: -0.07, gy: -0.2, arms: 'open', bounce: 0.25, glow: 1.2, laugh: 1 },
  };
  var NAMES = Object.keys(EXPRESSIONS);
  // Arm poses: [upper-arm angle from straight down (+ outward), elbow bend], right then left arm.
  var POSES = {
    rest: [[0.16, -0.12], [0.16, -0.12]],
    open: [[0.42, 0.25], [0.42, 0.25]],
    wave: [[2.45, 0.35], [0.16, -0.12]],
    cheer: [[2.6, 0.15], [2.6, 0.15]],
    think: [[-0.25, -2.35], [0.16, -0.12]],
    point: [[1.5, 0.05], [0.16, -0.12]],
    fist: [[0.75, -2.05], [0.16, -0.12]],
    hold: [[-0.1, -1.75], [-0.1, -1.75]],
    droop: [[0.05, 0], [0.05, 0]],
    brace: [[0.62, 0.5], [0.62, 0.5]],
  };
  var NUMERIC = ['brow', 'browTilt', 'browAsym', 'lidTop', 'lidBot', 'lidTilt', 'eye', 'mW', 'mS', 'mO', 'mX', 'tilt', 'drop', 'gx', 'gy', 'bounce', 'glow', 'laugh'];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(cur, target, dt, tau) { return cur + (target - cur) * (1 - Math.exp(-dt / Math.max(0.001, tau))); }
  function nowMs() { return root.performance && root.performance.now ? root.performance.now() : Date.now(); }

  // ---- Animation controller (no drawing, so tests can run it) -----------------
  function createController(options) {
    options = options || {};
    var random = options.random || Math.random;
    var reduced = !!options.reducedMotion;
    var p = {}, arms = { r1: 0, r2: 0, l1: 0, l2: 0 };
    NUMERIC.forEach(function (k) { p[k] = BASE[k]; });
    arms.r1 = POSES.rest[0][0]; arms.r2 = POSES.rest[0][1]; arms.l1 = POSES.rest[1][0]; arms.l2 = POSES.rest[1][1];
    var s = {
      emotion: 'idle', token: 0, since: 0, speaking: false, mouth: 0, voiceLevel: null, voiceSource: null,
      blink: 0, blinkStart: -1, blinkLen: 150, nextBlink: 1800 + random() * 2200, doubleBlink: false,
      sx: 0, sy: 0, nextSaccade: 900, look: null, last: null, t: 0, speakT: 0, moving: 0,
      // A short "performance" (e.g. the welcome entrance) shows its own expression on top of the
      // mood the game asks for, without changing that mood.
      overlay: null,
      // Wink: one eye closes for a moment (side -1 = Dusty's right eye on screen left, +1 = other).
      winkSide: 1, winkStart: -1, winkLen: 0, winkL: 0, winkR: 0,
    };
    function shown() { return s.overlay || s.emotion; }

    function setEmotion(name) {
      var next = EXPRESSIONS[name] ? name : 'idle';
      s.token++;
      if (next !== s.emotion) {
        s.emotion = next; s.since = s.t * 1000;
        // A quick blink on a change of mood reads as a natural reaction.
        if (s.blinkStart < 0 && random() < 0.55) s.nextBlink = Math.min(s.nextBlink, s.t * 1000 + 70);
      }
      return s.token;
    }
    function setSpeaking(on) {
      on = !!on;
      if (on && !s.speaking) s.speakT = 0;
      s.speaking = on;
      if (!on) s.voiceLevel = null;
    }
    // A short glance, e.g. toward the speech bubble or an interface element. x/y are -1..1.
    function lookAt(x, y, ms) { s.look = { x: clamp(x, -1, 1), y: clamp(y, -1, 1), until: s.t * 1000 + (ms || 1000) }; }
    function setVoiceSource(fn) { s.voiceSource = typeof fn === 'function' ? fn : null; }
    function setReducedMotion(v) { reduced = !!v; }
    function setOverlay(name) {
      var next = name && EXPRESSIONS[name] ? name : null;
      if (next !== s.overlay && s.blinkStart < 0 && next) s.nextBlink = Math.min(s.nextBlink, s.t * 1000 + 60);
      s.overlay = next;
    }
    // A blink right now (on cue), instead of waiting for the next natural one.
    function blink() { if (s.blinkStart < 0) s.nextBlink = s.t * 1000; }
    function wink(side, ms) {
      s.winkSide = side < 0 ? -1 : 1; s.winkStart = s.t * 1000; s.winkLen = Math.max(240, ms || 520);
      s.nextBlink = Math.max(s.nextBlink, s.winkStart + s.winkLen + 400); // no blink on top of the wink
    }

    function update(ms) {
      if (s.last == null) s.last = ms;
      var dt = clamp((ms - s.last) / 1000, 0, 0.1);
      s.last = ms;
      s.t += dt;
      var now = s.t * 1000;
      var target = EXPRESSIONS[shown()], key;
      for (var i = 0; i < NUMERIC.length; i++) {
        key = NUMERIC[i];
        var goal = target[key] != null ? target[key] : BASE[key];
        p[key] = ease(p[key], goal, dt, key === 'gx' || key === 'gy' ? 0.09 : 0.14);
      }
      var pose = POSES[target.arms || 'rest'] || POSES.rest;
      arms.r1 = ease(arms.r1, pose[0][0], dt, 0.16); arms.r2 = ease(arms.r2, pose[0][1], dt, 0.16);
      arms.l1 = ease(arms.l1, pose[1][0], dt, 0.16); arms.l2 = ease(arms.l2, pose[1][1], dt, 0.16);

      // Blinking: variable intervals, an occasional double blink, slower blinks when sad.
      if (s.blinkStart < 0 && now >= s.nextBlink) { s.blinkStart = now; s.blinkLen = s.emotion === 'sad' ? 230 : s.emotion === 'alert' ? 110 : 150; }
      if (s.blinkStart >= 0) {
        var k = (now - s.blinkStart) / s.blinkLen;
        if (k >= 1) {
          s.blink = 0; s.blinkStart = -1;
          if (!s.doubleBlink && random() < 0.14) { s.doubleBlink = true; s.nextBlink = now + 90; }
          else { s.doubleBlink = false; s.nextBlink = now + (s.emotion === 'alert' ? 3800 : 2300) + random() * 3900; }
        } else s.blink = Math.sin(k * Math.PI);
      }
      // Wink: closes fast, holds, opens a little slower.
      var w = 0;
      if (s.winkStart >= 0) {
        var wt = now - s.winkStart;
        if (wt >= s.winkLen) s.winkStart = -1;
        else w = wt < 90 ? wt / 90 : wt > s.winkLen - 140 ? (s.winkLen - wt) / 140 : 1;
      }
      s.winkL = s.winkSide < 0 ? w : 0; s.winkR = s.winkSide > 0 ? w : 0;

      // Gaze: small idle saccades, an emotion bias, and timed glances at interface elements.
      if (now >= s.nextSaccade) {
        var calm = s.emotion === 'idle' || s.emotion === 'listening' || s.emotion === 'happy';
        s.sx = (random() * 2 - 1) * (calm ? 0.45 : 0.18);
        s.sy = (random() * 2 - 1) * (calm ? 0.25 : 0.1);
        s.nextSaccade = now + 1200 + random() * 2600;
      }
      var gx = p.gx + s.sx, gy = p.gy + s.sy;
      if (s.look && now < s.look.until) { gx = s.look.x; gy = s.look.y; } else s.look = null;
      if (s.emotion === 'thinking') { gx = p.gx + Math.sin(s.t * 1.7) * 0.15; gy = p.gy; }
      p.lookX = ease(p.lookX == null ? 0 : p.lookX, clamp(gx, -1, 1), dt, 0.07);
      p.lookY = ease(p.lookY == null ? 0 : p.lookY, clamp(gy, -1, 1), dt, 0.07);

      // Mouth: driven only by a voice recording that is actually playing.
      var open = 0;
      if (s.speaking) {
        s.speakT += dt;
        var level = null;
        if (s.voiceSource) { try { level = s.voiceSource(); } catch (e) { level = null; } }
        s.voiceLevel = level;
        if (level != null && isFinite(level)) open = clamp((level - 0.015) * 6, 0, 1);
        else {
          // No amplitude data (e.g. opened from file://): a smooth, deterministic talking rhythm
          // that runs only while the recording plays. It is not lip-sync.
          var a = Math.sin(s.speakT * Math.PI * 2 * 3.2), b = Math.sin(s.speakT * Math.PI * 2 * 0.85 + 1.1);
          open = clamp(0.18 + 0.62 * Math.max(0, a) * (0.62 + 0.38 * b), 0, 1);
        }
      }
      s.mouth = ease(s.mouth, open, dt, open > s.mouth ? 0.035 : 0.075);
      if (!s.speaking && s.mouth < 0.01) s.mouth = 0;
      return snapshot();
    }

    function snapshot() {
      var o = { emotion: s.emotion, shown: shown(), overlay: s.overlay, token: s.token, speaking: s.speaking, mouth: s.mouth, blink: s.blink, winkL: s.winkL, winkR: s.winkR, t: s.t, reduced: reduced, voiceLevel: s.voiceLevel };
      for (var i = 0; i < NUMERIC.length; i++) o[NUMERIC[i]] = p[NUMERIC[i]];
      o.lookX = p.lookX || 0; o.lookY = p.lookY || 0;
      o.armR1 = arms.r1; o.armR2 = arms.r2; o.armL1 = arms.l1; o.armL2 = arms.l2;
      o.pose = (EXPRESSIONS[shown()].arms || 'rest');
      return o;
    }

    return {
      update: update, snapshot: snapshot, setEmotion: setEmotion, setSpeaking: setSpeaking, lookAt: lookAt,
      setVoiceSource: setVoiceSource, setReducedMotion: setReducedMotion, setOverlay: setOverlay, blink: blink, wink: wink,
      overlay: function () { return s.overlay; },
      emotion: function () { return s.emotion; }, token: function () { return s.token; }, isSpeaking: function () { return s.speaking; },
    };
  }

  // ---- Drawing helpers ------------------------------------------------------
  function rr(c, x, y, w, h, r) {
    var tl, tr, br, bl;
    if (typeof r === 'number') tl = tr = br = bl = r; else { tl = r[0]; tr = r[1]; br = r[2]; bl = r[3]; }
    c.beginPath();
    c.moveTo(x + tl, y);
    c.lineTo(x + w - tr, y); c.quadraticCurveTo(x + w, y, x + w, y + tr);
    c.lineTo(x + w, y + h - br); c.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    c.lineTo(x + bl, y + h); c.quadraticCurveTo(x, y + h, x, y + h - bl);
    c.lineTo(x, y + tl); c.quadraticCurveTo(x, y, x + tl, y);
    c.closePath();
  }
  function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, Math.PI * 2); }
  function lin(c, x0, y0, x1, y1, stops) { var g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(function (st) { g.addColorStop(st[0], st[1]); }); return g; }
  function rad(c, x0, y0, r0, x1, y1, r1, stops) { var g = c.createRadialGradient(x0, y0, r0, x1, y1, r1); stops.forEach(function (st) { g.addColorStop(st[0], st[1]); }); return g; }
  function glowOn(c, d, blur, color) { if (d.hi) { c.shadowColor = color || C.glow; c.shadowBlur = blur * d.px; } }
  function glowOff(c) { c.shadowBlur = 0; c.shadowColor = 'transparent'; }

  // ---- Layers ---------------------------------------------------------------
  function drawTorso(c, d) {
    c.beginPath();
    c.moveTo(62, 149);
    c.quadraticCurveTo(100, 139, 138, 149);
    c.bezierCurveTo(155, 154, 157, 180, 149, 199);
    c.bezierCurveTo(141, 216, 122, 225, 100, 225);
    c.bezierCurveTo(78, 225, 59, 216, 51, 199);
    c.bezierCurveTo(43, 180, 45, 154, 62, 149);
    c.closePath();
    c.fillStyle = lin(c, 62, 146, 146, 226, [[0, C.shellHi], [0.45, C.shell], [1, C.shellShade]]);
    c.fill();
    c.save(); c.clip();
    c.fillStyle = rad(c, 82, 166, 2, 82, 166, 46, [[0, 'rgba(255,255,255,0.95)'], [1, 'rgba(255,255,255,0)']]);
    c.fillRect(40, 140, 120, 90);
    c.fillStyle = 'rgba(120,132,152,0.18)'; ell(c, 132, 214, 46, 28); c.fill();
    if (d.hi) {
      // Panel seams like the reference torso.
      c.strokeStyle = 'rgba(150,160,176,0.55)'; c.lineWidth = 1.3;
      c.beginPath(); c.moveTo(68, 192); c.quadraticCurveTo(100, 204, 132, 192); c.stroke();
      c.beginPath(); c.moveTo(100, 160); c.lineTo(100, 176); c.stroke();
    }
    c.restore();
    c.strokeStyle = C.edge; c.lineWidth = 1.6; c.stroke();
    // Collar socket under the neck.
    c.fillStyle = C.jointDark; ell(c, 100, 148, 26, 6.5); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.12)'; ell(c, 100, 146.5, 20, 3); c.fill();
  }

  function drawNeck(c) {
    rr(c, 85, 126, 30, 23, 5);
    c.fillStyle = lin(c, 85, 0, 115, 0, [[0, C.jointDark], [0.45, C.jointHi], [1, C.jointDark]]);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1.2;
    c.beginPath(); c.moveTo(86, 134); c.lineTo(114, 134); c.moveTo(86, 141); c.lineTo(114, 141); c.stroke();
  }

  function drawBand(c) {
    c.lineCap = 'round';
    c.strokeStyle = C.phoneDeep; c.lineWidth = 16;
    c.beginPath(); c.arc(100, 97, 86, Math.PI * 1.02, Math.PI * 1.98); c.stroke();
    c.strokeStyle = lin(c, 0, 8, 0, 30, [[0, C.phoneHi], [0.5, C.phone], [1, C.phoneMid]]); c.lineWidth = 12.5;
    c.beginPath(); c.arc(100, 97, 86, Math.PI * 1.02, Math.PI * 1.98); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3;
    c.beginPath(); c.arc(100, 97, 89.5, Math.PI * 1.2, Math.PI * 1.62); c.stroke();
  }

  function drawHead(c, d) {
    rr(c, 25, 17, 150, 122, [56, 56, 60, 60]);
    c.fillStyle = lin(c, 40, 18, 160, 140, [[0, C.shellHi], [0.42, C.shell], [1, C.shellShade]]);
    c.fill();
    c.save(); c.clip();
    c.fillStyle = rad(c, 62, 40, 2, 62, 40, 62, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
    c.fillRect(20, 10, 160, 140);
    c.fillStyle = 'rgba(110,122,142,0.2)'; ell(c, 110, 150, 86, 26); c.fill();
    c.restore();
    rr(c, 25, 17, 150, 122, [56, 56, 60, 60]);
    c.strokeStyle = C.edge; c.lineWidth = 1.8; c.stroke();
  }

  function drawCup(c, d, cx, cy, side) {
    // Cushion, cup shell, cap ring and highlight, as on the reference headphones.
    c.fillStyle = C.phoneDeep; ell(c, cx - side * 1, cy, 22.5, 31.5); c.fill();
    c.fillStyle = rad(c, cx + side * 2 - 7, cy - 12, 2, cx + side * 2, cy, 32, [[0, C.phoneHi], [0.45, C.phone], [1, C.phoneMid]]);
    ell(c, cx + side * 2.5, cy, 20, 29); c.fill();
    c.strokeStyle = C.phoneDark; c.lineWidth = 1.4; c.stroke();
    c.fillStyle = rad(c, cx + side * 3 - 4, cy - 7, 1, cx + side * 3, cy, 19, [[0, '#cfe9f8'], [1, C.phone]]);
    ell(c, cx + side * 3, cy, 12.5, 18.5); c.fill();
    c.strokeStyle = C.phoneMid; c.lineWidth = 2; c.stroke();
    if (d.hi) { c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2; c.beginPath(); c.ellipse(cx + side * 2.5, cy, 15, 23, 0, Math.PI * 1.1, Math.PI * 1.45); c.stroke(); }
    if (side < 0) { c.fillStyle = C.phoneMid; ell(c, cx + 2, cy - 30, 4.2, 3.4); c.fill(); }
  }

  function drawMic(c, s) {
    // The boom microphone sways a little when Dusty talks, bounces or laughs.
    var motion = s && !s.reduced ? 1 : 0;
    var sway = s ? motion * (Math.sin(s.t * 2.4) * 0.025 + s.mouth * 0.05 + (s.laugh || 0) * Math.sin(s.t * 15) * 0.07 + s.bounce * Math.sin(s.t * 6.5) * 0.04) : 0;
    c.save(); c.translate(182, 114); c.rotate(sway); c.translate(-182, -114);
    drawMicParts(c);
    c.restore();
  }
  function drawMicParts(c) {
    c.lineCap = 'round';
    c.strokeStyle = C.phoneDark; c.lineWidth = 5;
    c.beginPath(); c.moveTo(182, 114); c.quadraticCurveTo(187, 140, 162, 141); c.stroke();
    c.strokeStyle = C.phone; c.lineWidth = 3;
    c.beginPath(); c.moveTo(182, 114); c.quadraticCurveTo(187, 140, 162, 141); c.stroke();
    c.save(); c.translate(152, 141); c.rotate(-0.1);
    rr(c, -12, -6.5, 24, 13, 6.5);
    c.fillStyle = lin(c, 0, -6, 0, 7, [[0, C.phoneHi], [0.5, C.phoneMid], [1, C.phoneDark]]); c.fill();
    c.strokeStyle = C.phoneDeep; c.lineWidth = 1; c.stroke();
    c.strokeStyle = 'rgba(65,116,158,0.6)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(-5, -6); c.lineTo(-5, 6); c.moveTo(0, -6.5); c.lineTo(0, 6.5); c.moveTo(5, -6); c.lineTo(5, 6); c.stroke();
    c.restore();
  }

  function drawEye(c, d, s, cx, cy, side) {
    var R = 14.5 * s.eye, rx = R, ryFull = R * 1.07;
    var wink = (side < 0 ? s.winkL : s.winkR) || 0;
    var ry = Math.max(0.6, ryFull * (1 - 0.94 * Math.max(s.blink, wink)));
    var y = cy + (ryFull - ry) * 0.35;
    if (wink > 0.5 && ry < 6) {
      // Wink: a happy upward arc, so it reads as a wink and not as a blink.
      c.save(); glowOn(c, d, 6); c.strokeStyle = C.glow; c.lineWidth = 3.6; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx - rx, cy + 3); c.quadraticCurveTo(cx, cy - 9, cx + rx, cy + 3); c.stroke(); c.restore();
      return;
    }
    if (ry < 2.4) {
      // Closed: the glowing ring folds into a single soft line.
      c.save(); glowOn(c, d, 5); c.strokeStyle = C.glow; c.lineWidth = 3.2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(cx - rx, y); c.quadraticCurveTo(cx, y + 3, cx + rx, y); c.stroke(); c.restore();
      return;
    }
    c.save();
    glowOn(c, d, 8 * s.glow);
    c.fillStyle = rad(c, cx, y, 1, cx, y, R, [[0, '#0b2b35'], [1, C.iris]]);
    ell(c, cx, y, rx, ry); c.fill();
    c.strokeStyle = C.glow; c.lineWidth = 3.5; c.stroke();
    glowOff(c);
    // Pupil, iris ring and catch-lights follow the gaze inside the eye.
    ell(c, cx, y, rx - 1.6, ry - 1.6); c.clip();
    var squash = ry / ryFull;
    var px = cx + s.lookX * 5.2, py = y + s.lookY * 4.2 * squash;
    c.fillStyle = C.irisRing; ell(c, px, py, 9, 9 * Math.min(1, squash * 1.15)); c.fill();
    c.fillStyle = C.pupil; ell(c, px, py, 6.6, 6.6 * Math.min(1, squash * 1.15)); c.fill();
    c.fillStyle = '#ffffff'; ell(c, px + 3.6, py - 4.4 * squash, 3.1, 3.1 * Math.min(1, squash * 1.3)); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.75)'; ell(c, px - 3.6, py + 3.4 * squash, 1.5, 1.5 * squash); c.fill();
    c.restore();

    // Eyelids are cut from the display colour, with a glowing edge that continues the eye ring.
    var top = y - ry, bottom = y + ry;
    if (s.lidTop > 0.02) {
      var base = top + 2 * ry * s.lidTop, tilt = s.lidTilt * ry * 0.55;
      var outerX = cx + side * (rx + 4), innerX = cx - side * (rx + 4);
      c.save(); ell(c, cx, y, rx + 3.2, ry + 3.2); c.clip();
      c.fillStyle = C.visor;
      c.beginPath(); c.moveTo(innerX, top - 6); c.lineTo(outerX, top - 6); c.lineTo(outerX, base + tilt); c.lineTo(innerX, base - tilt); c.closePath(); c.fill();
      c.restore();
      c.save(); ell(c, cx, y, rx + 1.2, ry + 1.2); c.clip(); glowOn(c, d, 4);
      c.strokeStyle = C.glow; c.lineWidth = 2.8; c.beginPath(); c.moveTo(innerX, base - tilt); c.lineTo(outerX, base + tilt); c.stroke(); c.restore();
    }
    if (s.lidBot > 0.02) {
      var mid = bottom - 2 * ry * s.lidBot * 1.05, sideY = mid + ry * s.lidBot * 0.95;
      c.save(); ell(c, cx, y, rx + 3.2, ry + 3.2); c.clip();
      c.fillStyle = C.visor;
      c.beginPath(); c.moveTo(cx - rx - 5, bottom + 6); c.lineTo(cx - rx - 5, sideY); c.quadraticCurveTo(cx, mid - ry * s.lidBot * 0.9, cx + rx + 5, sideY); c.lineTo(cx + rx + 5, bottom + 6); c.closePath(); c.fill();
      c.restore();
      c.save(); ell(c, cx, y, rx + 1.2, ry + 1.2); c.clip(); glowOn(c, d, 4);
      c.strokeStyle = C.glow; c.lineWidth = 2.8; c.beginPath(); c.moveTo(cx - rx - 5, sideY); c.quadraticCurveTo(cx, mid - ry * s.lidBot * 0.9, cx + rx + 5, sideY); c.stroke(); c.restore();
    }
  }

  function drawBrow(c, d, s, cx, cy, side) {
    var wink = (side < 0 ? s.winkL : s.winkR) || 0, other = (side < 0 ? s.winkR : s.winkL) || 0;
    var bx = cx + side * 1.5, by = cy - 23.5 + s.brow + (side > 0 ? -s.browAsym : s.browAsym * 0.25) + wink * 3.5 - other * 2.5;
    c.save(); c.translate(bx, by); c.rotate(side * s.browTilt * 0.38);
    glowOn(c, d, 5);
    c.strokeStyle = C.glow; c.lineWidth = 3.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-8.5, 1.6); c.quadraticCurveTo(0, -3.4, 8.5, 1.6); c.stroke();
    c.restore();
  }

  function drawMouth(c, d, s) {
    var talk = s.mouth;
    var laugh = (s.laugh || 0) * (s.reduced ? 0.4 : Math.abs(Math.sin(s.t * 15)));
    var wink = Math.max(s.winkL || 0, s.winkR || 0);
    var W = s.mW + (26 - s.mW) * talk * 0.35;
    var smile = Math.min(1.15, s.mS * (1 - talk * 0.35) + wink * 0.2);
    // "Ha-ha": the laughing mouth pulses open and closed on its own, on top of the voice.
    var O = Math.max(s.mO * (1 - (s.laugh || 0) * 0.45) + laugh * 0.5, talk * 0.95);
    var cx = 100 + s.mX + s.lookX * 2 + ((s.winkR || 0) - (s.winkL || 0)) * 3, cy = 104;
    var cornerY = cy - smile * 4.5, topY = cy - smile * 1.4 - O * 1.6, botY = cy + 1.5 + O * 17 + Math.max(0, smile) * 2.5;
    c.save();
    c.lineCap = 'round'; c.lineJoin = 'round';
    if (O < 0.12) {
      glowOn(c, d, 5);
      c.strokeStyle = C.glow; c.lineWidth = 3.3;
      c.beginPath(); c.moveTo(cx - W / 2, cornerY); c.quadraticCurveTo(cx, cy + smile * 7, cx + W / 2, cornerY); c.stroke();
      c.restore();
      return;
    }
    function outline() {
      // A "D" shaped grin: nearly straight top edge, deep rounded bottom, like the reference.
      c.beginPath();
      c.moveTo(cx - W / 2, cornerY);
      c.quadraticCurveTo(cx, 2 * topY - cornerY, cx + W / 2, cornerY);
      c.bezierCurveTo(cx + W * 0.48, botY - 2, cx + W * 0.26, botY, cx, botY);
      c.bezierCurveTo(cx - W * 0.26, botY, cx - W * 0.48, botY - 2, cx - W / 2, cornerY);
      c.closePath();
    }
    outline();
    c.fillStyle = C.mouthIn; c.fill();
    c.save(); c.clip();
    var h = botY - topY;
    c.fillStyle = C.teeth; c.fillRect(cx - W, topY - 4, W * 2, 4 + Math.min(10, h * 0.6));
    if (O > 0.3) { c.fillStyle = C.tongue; c.globalAlpha = 0.85; ell(c, cx, botY - 0.5, W * 0.22, h * 0.26); c.fill(); c.globalAlpha = 1; }
    c.restore();
    outline();
    glowOn(c, d, 5);
    c.strokeStyle = C.glow; c.lineWidth = 2.5; c.stroke();
    c.restore();
  }

  function drawFace(c, d, s) {
    rr(c, 40, 34, 120, 90, 36);
    c.fillStyle = rad(c, 78, 52, 4, 92, 70, 112, [[0, '#1d2433'], [0.5, '#0c0f16'], [1, '#050609']]);
    c.fill();
    c.strokeStyle = C.visorEdge; c.lineWidth = 2.6; c.stroke();
    c.save();
    rr(c, 41.5, 35.5, 117, 87, 34.5); c.clip();
    var ey = 73;
    drawBrow(c, d, s, 73, ey, -1); drawBrow(c, d, s, 127, ey, 1);
    drawEye(c, d, s, 73, ey, -1); drawEye(c, d, s, 127, ey, 1);
    drawMouth(c, d, s);
    // Glass reflections on the display.
    c.fillStyle = 'rgba(255,255,255,0.06)'; ell(c, 100, 30, 66, 18); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 2.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(54, 58); c.quadraticCurveTo(60, 44, 78, 41); c.stroke();
    c.restore();
  }

  function drawArm(c, d, side, a1, a2, wave) {
    var sx = 100 + side * 49, sy = 158;
    var t1 = a1, t2 = a1 + a2 + wave;
    var ex = sx + side * Math.sin(t1) * 25, ey = sy + Math.cos(t1) * 25;
    var hx = ex + side * Math.sin(t2) * 21, hy = ey + Math.cos(t2) * 21;
    var gx = hx + side * Math.sin(t2) * 8.5, gy = hy + Math.cos(t2) * 8.5;
    c.lineCap = 'round';
    function limb(x0, y0, x1, y1, w) {
      c.strokeStyle = C.shellDeep; c.lineWidth = w + 2.4; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      c.strokeStyle = C.shell; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      if (d.hi) { c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = w * 0.32; c.beginPath(); c.moveTo(x0 - side * 2, y0 - 1); c.lineTo(x1 - side * 2, y1 - 1); c.stroke(); }
    }
    limb(sx, sy, ex, ey, 15);
    c.fillStyle = C.joint; ell(c, ex, ey, 7.5, 7.5); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.18)'; ell(c, ex - 1.5, ey - 2, 3, 2.4); c.fill();
    limb(ex, ey, hx, hy, 14);
    c.fillStyle = C.jointDark; ell(c, hx, hy, 6.2, 6.2); c.fill();
    // Grey mechanical hand with segmented fingers.
    c.fillStyle = rad(c, gx - 2.5, gy - 3, 1, gx, gy, 11, [[0, C.handHi], [1, C.hand]]);
    ell(c, gx, gy, 9.4, 9.4); c.fill();
    c.strokeStyle = C.handDark; c.lineWidth = 1.2; c.stroke();
    if (d.hi) {
      var nx = Math.cos(t2), ny = -Math.sin(t2) * side;
      c.strokeStyle = C.handDark; c.lineWidth = 1.1;
      for (var f = -1; f <= 1; f++) {
        var ox = gx + nx * f * 3.2 * side, oy = gy + ny * f * 3.2 * side;
        c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + side * Math.sin(t2) * 5, oy + Math.cos(t2) * 5); c.stroke();
      }
    }
  }

  function drawShoulder(c, side) {
    var x = 100 + side * 49, y = 158;
    c.fillStyle = rad(c, x - 3, y - 3, 1, x, y, 11, [[0, C.jointHi], [1, C.jointDark]]);
    ell(c, x, y, 10.5, 10.5); c.fill();
  }

  // ---- Public drawing ---------------------------------------------------------
  // Draws Dusty into the box (x, y, w, h) on any 2D context.
  // opts.mode: 'full' (whole robot) or 'portrait' (head and shoulders);
  // opts.background: paint a soft backdrop; opts.shadow: floor shadow; opts.flip: face left;
  // opts.state: a controller snapshot (defaults to the shared live state).
  var VIEW = { full: [-8, -6, 216, 246], portrait: [2, -4, 196, 196] };
  function draw(c, x, y, w, h, opts) {
    opts = opts || {};
    var s = opts.state || shared.snapshot();
    var vb = VIEW[opts.mode] || VIEW.full;
    var k = Math.min(w / vb[2], h / vb[3]);
    var ox = x + (w - vb[2] * k) / 2 - vb[0] * k;
    var oy = opts.mode === 'portrait' ? y + (h - vb[3] * k) / 2 - vb[1] * k : y + (h - vb[3] * k) - vb[1] * k;
    var base = 1;
    try { if (c.getTransform) { var m = c.getTransform(); base = Math.sqrt(m.a * m.a + m.b * m.b) || 1; } } catch (e) { base = 1; }
    var d = { px: k * base, hi: k * base * 200 >= 70 && opts.detail !== 'low' };
    c.save();
    if (opts.background) {
      c.fillStyle = rad(c, x + w * 0.5, y + h * 0.42, 1, x + w * 0.5, y + h * 0.5, Math.max(w, h) * 0.75, [[0, '#2d3a66'], [1, '#161b33']]);
      c.fillRect(x, y, w, h);
    }
    c.translate(ox, oy); c.scale(k, k);
    if (opts.flip) { c.translate(200, 0); c.scale(-1, 1); }
    var motion = s.reduced ? 0 : 1;
    var bob = motion * (Math.sin(s.t * 2.1) * 1.4 + (opts.moving ? Math.abs(Math.sin(s.t * 9)) * -1.6 : 0));
    var hop = motion * (s.bounce * -Math.abs(Math.sin(s.t * 6.5)) * 6 - (s.laugh || 0) * Math.abs(Math.sin(s.t * 15)) * 2.6);
    if (opts.shadow) {
      c.fillStyle = 'rgba(0,0,0,0.28)'; ell(c, 100, 234, 46 - hop * 0.8, 6.5); c.fill();
    }
    c.translate(0, bob + hop);
    var wave = s.pose === 'wave' ? motion * Math.sin(s.t * 8.5) * 0.45 : s.pose === 'cheer' ? motion * Math.sin(s.t * 13) * 0.18 : 0;
    var cheerL = s.pose === 'cheer' ? motion * Math.sin(s.t * 13 + 1.6) * 0.18 : 0;
    drawTorso(c, d);
    drawNeck(c);
    c.save();
    var tilt = s.tilt + motion * (Math.sin(s.t * 1.3) * 0.018 + (s.pose === 'cheer' ? Math.sin(s.t * 6.5) * 0.05 : 0));
    // Speaking adds a small nod that follows the recording's loudness.
    var nod = s.mouth * 1.6 * motion;
    c.translate(100, 138 + s.drop + nod); c.rotate(tilt); c.translate(-100, -138);
    drawBand(c);
    drawHead(c, d);
    drawCup(c, d, 22, 96, -1);
    drawCup(c, d, 178, 96, 1);
    drawMic(c, s);
    drawFace(c, d, s);
    c.restore();
    drawArm(c, d, -1, s.armL1, s.armL2, cheerL);
    drawArm(c, d, 1, s.armR1, s.armR2, wave);
    drawShoulder(c, -1); drawShoulder(c, 1);
    c.restore();
    glowOff(c);
  }

  // ---- Shared live character and DOM canvases --------------------------------
  var shared = createController();
  var mounted = [], lastPaint = -1e9, lastUpdate = -1;
  function reducedMotionQuery() {
    try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  shared.setReducedMotion(reducedMotionQuery());

  // Registers a DOM canvas that should always show the live Dusty.
  function mount(cv, opts) {
    if (!cv) return cv;
    for (var i = 0; i < mounted.length; i++) if (mounted[i].cv === cv) { mounted[i].opts = opts || {}; return cv; }
    cv.setAttribute('data-dusty-avatar', '');
    mounted.push({ cv: cv, opts: opts || {} });
    paintCanvas(mounted[mounted.length - 1]);
    return cv;
  }
  function paintCanvas(m) {
    var cv = m.cv;
    if (!cv.getContext) return;
    var dpr = Math.min(3, (root.devicePixelRatio || 1));
    // A canvas shown enlarged with a CSS transform (the welcome entrance) asks for more pixels
    // through data-dusty-scale, so the vector art stays sharp at the bigger size.
    var boost = parseFloat(cv.getAttribute && cv.getAttribute('data-dusty-scale')) || 1;
    dpr = Math.min(8, dpr * Math.max(1, Math.min(4, boost)));
    var cw = cv.clientWidth || parseFloat(cv.style.width) || cv.width, ch = cv.clientHeight || parseFloat(cv.style.height) || cv.height;
    var bw = Math.max(1, Math.round(cw * dpr)), bh = Math.max(1, Math.round(ch * dpr));
    if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
    var c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, bw, bh);
    c.imageSmoothingEnabled = true;
    draw(c, 0, 0, bw, bh, m.opts);
  }
  // Called once per animation frame: advances the shared state and repaints visible DOM canvases.
  function frame(ms) {
    ms = ms == null ? nowMs() : ms;
    if (ms !== lastUpdate) { shared.update(ms); lastUpdate = ms; }
    if (root.document && root.document.hidden) return;
    if (ms - lastPaint < 30) return; // about 30 repaints per second is plenty for DOM portraits
    lastPaint = ms;
    for (var i = mounted.length - 1; i >= 0; i--) {
      var m = mounted[i];
      if (!m.cv.isConnected) { mounted.splice(i, 1); continue; }
      if (m.cv.getClientRects && m.cv.getClientRects().length === 0) continue; // not displayed
      paintCanvas(m);
    }
  }
  // A one-off bitmap for code that needs an image (e.g. the video tools).
  function snapshotCanvas(w, h, opts) {
    var doc = root.document;
    if (!doc) return null;
    var cv = doc.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), 0, 0, w, h, opts);
    return cv;
  }

  var api = {
    EXPRESSIONS: NAMES, PALETTE: C, createController: createController, draw: draw,
    mount: mount, frame: frame, canvas: snapshotCanvas, mountedCount: function () { return mounted.length; },
    setEmotion: function (name) { return shared.setEmotion(name); }, emotion: function () { return shared.emotion(); },
    setSpeaking: function (on) { shared.setSpeaking(on); }, isSpeaking: function () { return shared.isSpeaking(); },
    lookAt: function (x, y, ms) { shared.lookAt(x, y, ms); }, setVoiceSource: function (fn) { shared.setVoiceSource(fn); },
    // Short performances (the welcome entrance): an expression shown over the game's mood, a cued blink and a wink.
    perform: function (name) { shared.setOverlay(name); }, performing: function () { return shared.overlay(); },
    blink: function () { shared.blink(); }, wink: function (side, ms) { shared.wink(side, ms); },
    state: function () { return shared.snapshot(); }, token: function () { return shared.token(); },
  };
  root.DustyAvatar = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
