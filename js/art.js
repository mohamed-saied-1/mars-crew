// All artwork, generated in code: the map, people, icons and the Dusty robot.
// There are no image files, and nothing is taken from any other game.
(function (root) {
  'use strict';

  var World = root.World, T = World.T;
  var TS = 32; // art pixels per map tile

  var ROLE = {
    engineer: { main: '#ec8f2f', dark: '#b4601a', light: '#ffc072', skin: '#c98d5e', skinD: '#a56c43', hair: '#2b1a12' },
    farmer: { main: '#4fb65a', dark: '#2a7d3e', light: '#97e88f', skin: '#8a5a3b', skinD: '#6b432b', hair: '#1c1210' },
    doctor: { main: '#3fa3ea', dark: '#2169b0', light: '#a3dcff', skin: '#efc39b', skinD: '#cc9a72', hair: '#7a4522' },
    earth: { main: '#b07ae0', dark: '#7445ab', light: '#dcbcf9', skin: '#a8703f', skinD: '#84532c', hair: '#20130d' },
  };
  var INK = '#16121f';

  // ---- Small helpers ------------------------------------------------------
  function hash(x, y) {
    var h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function vnoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function fbm(x, y) {
    return vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.27 + vnoise(x * 4.3, y * 4.3) * 0.13 + vnoise(x * 8.7, y * 8.7) * 0.05;
  }

  function canvas(w, h) {
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    return cv;
  }

  function px(c, color, x, y, w, h) { c.fillStyle = color; c.fillRect(x, y, w, h); }

  function rgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255];
  }

  // Adds a one pixel dark line around whatever is drawn on a canvas.
  function outline(cv, color) {
    var c = cv.getContext('2d'), w = cv.width, h = cv.height;
    var img = c.getImageData(0, 0, w, h), d = img.data, out = new Uint8ClampedArray(d);
    var col = rgb(color || INK);
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        if (d[i + 3] > 40) continue;
        var near = (x > 0 && d[i - 1] > 40) || (x < w - 1 && d[i + 7] > 40) ||
          (y > 0 && d[i - w * 4 + 3] > 40) || (y < h - 1 && d[i + w * 4 + 3] > 40);
        if (near) { out[i] = col[0]; out[i + 1] = col[1]; out[i + 2] = col[2]; out[i + 3] = 255; }
      }
    }
    img.data.set(out);
    c.putImageData(img, 0, 0);
    return cv;
  }

  function flip(cv) {
    var o = canvas(cv.width, cv.height), c = o.getContext('2d');
    c.translate(cv.width, 0); c.scale(-1, 1); c.drawImage(cv, 0, 0);
    return o;
  }

  // Pixel patterns: one character per pixel, looked up in a palette.
  function pattern(rows, palette) {
    var cv = canvas(rows[0].length, rows.length), c = cv.getContext('2d');
    rows.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        var col = palette[row[x]];
        if (col) px(c, col, x, y, 1, 1);
      }
    });
    return cv;
  }

  // ---- People -------------------------------------------------------------
  var spriteCache = {};

  function drawFront(c, r, role, f, suit) {
    var legA = [0, 2, 0, -1][f], legB = [0, -1, 0, 2][f];
    var bob = f === 1 || f === 3 ? 1 : 0;
    var y0 = bob;
    if (suit) {
      px(c, '#c7cad6', 8, 22 + y0, 3, 6 - Math.max(0, legA)); px(c, '#c7cad6', 13, 22 + y0, 3, 6 - Math.max(0, legB));
      px(c, '#f3f4f8', 8, 22 + y0, 2, 6 - Math.max(0, legA)); px(c, '#f3f4f8', 13, 22 + y0, 2, 6 - Math.max(0, legB));
      px(c, '#5a5f70', 7, 27 + y0 - Math.max(0, legA), 4, 3); px(c, '#5a5f70', 13, 27 + y0 - Math.max(0, legB), 4, 3);
      px(c, '#dfe1ea', 6, 13 + y0, 12, 10); px(c, '#f6f7fb', 7, 13 + y0, 9, 9);
      px(c, r.main, 9, 15 + y0, 6, 3); px(c, r.light, 9, 15 + y0, 6, 1); px(c, '#6ee07a', 15, 19 + y0, 2, 1); px(c, '#ff6b6b', 12, 19 + y0, 2, 1);
      px(c, '#dfe1ea', 4, 14 + y0 + (f === 1 ? 1 : 0), 3, 8); px(c, '#dfe1ea', 17, 14 + y0 + (f === 3 ? 1 : 0), 3, 8);
      px(c, r.main, 4, 17 + y0, 3, 1); px(c, r.main, 17, 17 + y0, 3, 1);
      px(c, '#f6f7fb', 5, 2 + y0, 14, 12); px(c, '#f6f7fb', 7, 1 + y0, 10, 1); px(c, '#c7cad6', 5, 12 + y0, 14, 2);
      px(c, '#21305e', 7, 4 + y0, 10, 7); px(c, '#31488c', 7, 4 + y0, 10, 3); px(c, '#e8b84e', 8, 5 + y0, 3, 2); px(c, '#ffe9a8', 8, 5 + y0, 1, 1);
      return;
    }
    px(c, r.dark, 8, 22 + y0, 3, 6 - Math.max(0, legA)); px(c, r.dark, 13, 22 + y0, 3, 6 - Math.max(0, legB));
    px(c, '#2e3040', 7, 27 + y0 - Math.max(0, legA), 4, 3); px(c, '#2e3040', 13, 27 + y0 - Math.max(0, legB), 4, 3);
    px(c, r.main, 7, 14 + y0, 10, 9); px(c, r.light, 8, 14 + y0, 8, 1); px(c, r.dark, 7, 21 + y0, 10, 2);
    px(c, r.main, 5, 15 + y0 + (f === 1 ? 1 : 0), 2, 7); px(c, r.main, 17, 15 + y0 + (f === 3 ? 1 : 0), 2, 7);
    px(c, r.skin, 5, 21 + y0 + (f === 1 ? 1 : 0), 2, 2); px(c, r.skin, 17, 21 + y0 + (f === 3 ? 1 : 0), 2, 2);
    // Head.
    px(c, r.skin, 6, 3 + y0, 12, 11); px(c, r.skinD, 6, 12 + y0, 12, 2);
    px(c, r.hair, 6, 2 + y0, 12, 4); px(c, r.hair, 5, 3 + y0, 1, 5); px(c, r.hair, 18, 3 + y0, 1, 5);
    px(c, '#ffffff', 8, 8 + y0, 3, 3); px(c, '#ffffff', 13, 8 + y0, 3, 3);
    px(c, '#1d1a26', 9, 8 + y0, 2, 3); px(c, '#1d1a26', 14, 8 + y0, 2, 3);
    px(c, r.skinD, 11, 12 + y0, 2, 1);
    if (role === 'engineer') {
      px(c, '#f2c14e', 6, 1 + y0, 12, 3); px(c, '#ffe08a', 7, 1 + y0, 8, 1); px(c, '#c99a2e', 4, 4 + y0, 16, 1);
      px(c, '#5a3a1e', 7, 21 + y0, 10, 1); px(c, '#f2c14e', 11, 21 + y0, 2, 1);
    } else if (role === 'farmer') {
      px(c, '#dcb765', 3, 3 + y0, 18, 2); px(c, '#e9cc85', 7, 0 + y0, 10, 3); px(c, '#a05a3a', 7, 2 + y0, 10, 1);
      px(c, '#7c5a34', 9, 15 + y0, 6, 7);
    } else if (role === 'doctor') {
      px(c, '#f4f6fb', 7, 14 + y0, 10, 9); px(c, r.main, 11, 14 + y0, 2, 9); px(c, '#3a3f52', 9, 15 + y0, 1, 4); px(c, '#3a3f52', 14, 15 + y0, 1, 4);
      px(c, '#e0504a', 14, 19 + y0, 2, 2);
    } else if (role === 'earth') {
      px(c, '#2a2d38', 4, 5 + y0, 2, 6); px(c, '#2a2d38', 18, 5 + y0, 2, 6); px(c, '#2a2d38', 6, 1 + y0, 12, 1);
      px(c, '#2a2d38', 18, 11 + y0, 1, 2); px(c, '#ffffff', 10, 16 + y0, 4, 3);
    }
  }

  function drawBack(c, r, role, f, suit) {
    var legA = [0, 2, 0, -1][f], legB = [0, -1, 0, 2][f], y0 = f === 1 || f === 3 ? 1 : 0;
    var body = suit ? '#e6e8f0' : r.main, leg = suit ? '#d4d7e2' : r.dark;
    px(c, leg, 8, 22 + y0, 3, 6 - Math.max(0, legA)); px(c, leg, 13, 22 + y0, 3, 6 - Math.max(0, legB));
    px(c, '#2e3040', 7, 27 + y0 - Math.max(0, legA), 4, 3); px(c, '#2e3040', 13, 27 + y0 - Math.max(0, legB), 4, 3);
    px(c, body, 6, 14 + y0, 12, 9);
    px(c, body, 4, 15 + y0, 2, 7); px(c, body, 18, 15 + y0, 2, 7);
    if (suit) {
      px(c, '#8a8fa2', 7, 13 + y0, 10, 9); px(c, '#a6aabb', 8, 14 + y0, 8, 2); px(c, r.main, 9, 17 + y0, 6, 2); px(c, '#6ee07a', 15, 20 + y0, 1, 1);
      px(c, '#f6f7fb', 5, 2 + y0, 14, 12); px(c, '#d4d7e2', 5, 11 + y0, 14, 3); px(c, '#ffffff', 7, 3 + y0, 4, 2);
      return;
    }
    px(c, r.skin, 6, 3 + y0, 12, 10); px(c, r.hair, 6, 2 + y0, 12, 9); px(c, r.hair, 5, 3 + y0, 14, 6);
    if (role === 'engineer') { px(c, '#f2c14e', 6, 1 + y0, 12, 4); }
    if (role === 'farmer') { px(c, '#dcb765', 3, 3 + y0, 18, 2); px(c, '#e9cc85', 7, 0 + y0, 10, 3); }
    if (role === 'doctor') { px(c, '#f4f6fb', 6, 14 + y0, 12, 9); }
    if (role === 'earth') { px(c, '#2a2d38', 6, 1 + y0, 12, 1); }
  }

  function drawSide(c, r, role, f, suit) {
    var y0 = f === 1 || f === 3 ? 1 : 0, s = [0, 3, 0, -3][f];
    var leg = suit ? '#e6e8f0' : r.dark;
    px(c, leg, 10 + s, 22 + y0, 4, 5); px(c, leg, 10 - s, 22 + y0, 4, 5);
    px(c, '#2e3040', 10 + s, 27 + y0, 6, 3); px(c, '#2e3040', 10 - s, 27 + y0, 6, 3);
    px(c, suit ? '#f3f4f8' : r.main, 8, 14 + y0, 8, 9);
    if (suit) { px(c, '#8a8fa2', 4, 13 + y0, 5, 9); px(c, r.main, 12, 15 + y0, 3, 2); }
    if (role === 'doctor' && !suit) px(c, '#f4f6fb', 8, 14 + y0, 8, 9);
    px(c, suit ? '#dfe1ea' : r.dark, 10 + (s > 0 ? 1 : -1), 15 + y0, 3, 7);
    if (suit) {
      px(c, '#f6f7fb', 6, 2 + y0, 13, 12); px(c, '#c7cad6', 6, 12 + y0, 13, 2);
      px(c, '#21305e', 12, 4 + y0, 7, 7); px(c, '#e8b84e', 14, 5 + y0, 3, 2);
      return;
    }
    px(c, r.skin, 7, 3 + y0, 11, 11); px(c, r.skinD, 7, 12 + y0, 11, 2);
    px(c, r.hair, 6, 2 + y0, 12, 4); px(c, r.hair, 6, 3 + y0, 4, 7);
    px(c, '#ffffff', 13, 8 + y0, 3, 3); px(c, '#1d1a26', 14, 8 + y0, 2, 3);
    if (role === 'engineer') { px(c, '#f2c14e', 6, 1 + y0, 12, 3); px(c, '#c99a2e', 12, 4 + y0, 9, 1); }
    if (role === 'farmer') { px(c, '#dcb765', 3, 3 + y0, 18, 2); px(c, '#e9cc85', 7, 0 + y0, 10, 3); }
    if (role === 'earth') { px(c, '#2a2d38', 6, 1 + y0, 10, 1); px(c, '#2a2d38', 10, 5 + y0, 2, 5); }
  }

  // The white parts of the space suit, from light to dark, for players who pick a colour.
  var SUIT_WHITE = { f6f7fb: 0, f3f4f8: 0, e6e8f0: 1, dfe1ea: 1, c7cad6: 2 };
  function tintSuit(cv, tint) {
    var c = cv.getContext('2d'), img = c.getImageData(0, 0, cv.width, cv.height), d = img.data;
    var base = [1, 3, 5].map(function (i) { return parseInt(tint.substr(i, 2), 16); });
    var shade = [1, 0.86, 0.68];
    for (var i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      var hex = ((1 << 24) | (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).slice(1);
      var k = SUIT_WHITE[hex];
      if (k == null) continue;
      d[i] = base[0] * shade[k]; d[i + 1] = base[1] * shade[k]; d[i + 2] = base[2] * shade[k];
    }
    c.putImageData(img, 0, 0);
  }

  // dir: down, up, left, right. frame: 0-3. suit: true when outdoors. tint: suit colour (optional).
  // The crew are drawn by js/crew-avatar.js (vector characters); this returns a 96x128 bitmap of
  // them in the old 3:4 sprite box, so every existing caller keeps working unchanged.
  // The old pixel-art drawing stays only as a fallback when crew-avatar.js is not loaded (tests).
  var CREW_W = 96, CREW_H = 128;
  function crewSprite(role, dir, frame, suit, tint, pose, expression) {
    var key = 'v|' + role + '|' + dir + '|' + frame + '|' + (suit ? 1 : 0) + '|' + (suit && tint ? tint : '') + '|' + (pose || '') + '|' + (expression || '');
    if (spriteCache[key]) return spriteCache[key];
    var cv = canvas(CREW_W, CREW_H), c = cv.getContext('2d');
    root.CrewAvatar.draw(c, role, 0, 0, CREW_W, CREW_H, {
      view: dir === 'up' ? 'back' : dir === 'down' ? 'front' : 'side', facing: dir === 'left' ? -1 : 1,
      pose: pose || (frame ? 'walk' : 'idle'), t: (frame || 0) / 4, expression: expression || 'smiling', helmet: !!suit, tint: suit && tint ? tint : null,
    });
    spriteCache[key] = cv;
    return cv;
  }
  // Draws an image with smoothing on, for crew bitmaps placed in pixel-art scenes.
  function drawSmooth(c) {
    var args = Array.prototype.slice.call(arguments, 1);
    c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
    c.drawImage.apply(c, args);
    c.restore();
  }
  function sprite(role, dir, frame, suit, tint) {
    if (root.CrewAvatar && root.CrewAvatar.ROLES[role]) return crewSprite(role, dir, frame, suit, tint);
    var key = role + dir + frame + (suit ? 1 : 0) + (suit && tint ? tint : '');
    if (spriteCache[key]) return spriteCache[key];
    var cv = canvas(24, 32), c = cv.getContext('2d'), r = ROLE[role];
    if (dir === 'down') drawFront(c, r, role, frame, suit);
    else if (dir === 'up') drawBack(c, r, role, frame, suit);
    else drawSide(c, r, role, frame, suit);
    if (suit && tint) tintSuit(cv, tint);
    outline(cv);
    if (dir === 'left') cv = flip(cv);
    spriteCache[key] = cv;
    return cv;
  }

  // Dusty is drawn by js/dusty-avatar.js (vector layers based on the reference image), so every
  // screen shows the same character. These wrappers keep the older Art API working.
  var dustyEmotion = 'idle', dustySpeaking = false;
  var DUSTY_EMOTIONS = ['idle', 'blinking', 'welcome', 'waving', 'speaking', 'happy', 'curious', 'worried', 'thinking', 'celebrating', 'encouraging', 'guiding', 'alert', 'sad', 'listening'];
  function avatar() { return root.DustyAvatar || null; }
  function setDustyEmotion(value) {
    dustyEmotion = DUSTY_EMOTIONS.indexOf(value) >= 0 ? value : 'idle';
    var token = avatar() ? avatar().setEmotion(dustyEmotion) : 0;
    var doc = root.document;
    if (doc && doc.body) {
      DUSTY_EMOTIONS.forEach(function (m) { doc.body.classList.remove('dusty-' + m); });
      doc.body.classList.add('dusty-' + dustyEmotion);
    }
    return token;
  }
  function setDustySpeaking(value) {
    dustySpeaking = !!value;
    if (avatar()) avatar().setSpeaking(dustySpeaking);
    var doc = root.document;
    if (doc && doc.body) doc.body.classList.toggle('dusty-speaking', dustySpeaking);
  }
  // A full-body bitmap of the current Dusty, for code that needs an image.
  function dusty() {
    return avatar() ? avatar().canvas(84, 96, { mode: 'full' }) : canvas(84, 96);
  }

  // The "rover friend" the crew can build is a separate little rover, not Dusty.
  var roverCache = {};
  function rover(frame) {
    var w = frame % 2;
    if (roverCache[w]) return roverCache[w];
    var cv = canvas(40, 36), c = cv.getContext('2d');
    px(c, '#191f2c', 3, 26, 10, 9); px(c, '#191f2c', 27, 26, 10, 9);
    px(c, '#68758c', 5 + w, 29, 6, 4); px(c, '#68758c', 29 + w, 29, 6, 4);
    px(c, '#aab5c8', 6, 30, 3, 2); px(c, '#aab5c8', 30, 30, 3, 2);
    px(c, '#d18a24', 7, 23, 26, 8); px(c, '#f2b43c', 5, 21, 30, 8);
    px(c, '#ffd77a', 8, 21, 24, 2); px(c, '#bd7620', 7, 28, 26, 3);
    px(c, '#2c4a8a', 10, 24, 20, 3); px(c, '#4a78d0', 12, 24, 6, 2);
    px(c, '#d6dce8', 9, 9, 22, 13); px(c, '#f6f7fb', 11, 8, 18, 13);
    px(c, '#c7cad6', 18, 2, 4, 7); px(c, '#ff6b6b', 17, 0, 6, 3);
    px(c, '#101625', 12, 11, 16, 7); px(c, '#58e0ff', 14, 13, 4, 3); px(c, '#58e0ff', 22, 13, 4, 3);
    outline(cv);
    roverCache[w] = cv;
    return cv;
  }

  var portraitCache = {};
  // A large face for the talking box.
  function portrait(who) {
    if (who === 'dusty') return avatar() ? avatar().canvas(96, 96, { mode: 'portrait', background: true }) : canvas(96, 96);
    if (portraitCache[who]) return portraitCache[who];
    if (root.CrewAvatar && root.CrewAvatar.ROLES[who]) {
      var pc = canvas(96, 96);
      root.CrewAvatar.portrait(pc.getContext('2d'), who, 0, 0, 96, { expression: 'smiling' });
      portraitCache[who] = pc;
      return pc;
    }
    var cv = canvas(48, 48), c = cv.getContext('2d');
    px(c, '#23284a', 0, 0, 48, 48);
    px(c, '#2e3560', 0, 34, 48, 14);
    c.imageSmoothingEnabled = false;
    drawSmooth(c, sprite(who, 'down', 0, false), 3, 0, 18, 16, 3, 2, 42, 37);
    px(c, ROLE[who].main, 0, 40, 48, 8);
    portraitCache[who] = cv;
    return cv;
  }

  // ---- Icons --------------------------------------------------------------
  var ICONS = {
    bolt: [['....YYYY....', '...YYYY.....', '...YYY......', '..YYYY......', '..YYYYYYY...', '.....YYY....', '....YYY.....', '...YYY......', '...YY.......', '..YY........', '..Y.........', '............'], { Y: '#ffd24a' }],
    air: [['....GGGG....', '..GGGGGGGG..', '.GGgGGGgGGG.', '.GGGGgGGGGG.', '.GGGGGgGGGG.', '..GGGGGGGG..', '....GGGG....', '.....BB.....', '.....BB.....', '...LLBBLL...', '..LLL..LLL..', '............'], { G: '#62d873', g: '#b8f5ae', B: '#8a5a3b', L: '#3fae56' }],
    rad: [['....RRRR....', '...RRRRRR...', '..RRRRRRRR..', '.OOOO..OOOO.', 'OOOOO..OOOOO', 'OOOOOWWOOOOO', 'OOOO.WW.OOOO', '.OO..OO..OO.', '.....OO.....', '....OOOO....', '...OOOOOO...', '............'], { R: '#ff6b6b', O: '#ff6b6b', W: '#ffd24a' }],
    fan: [['....CCCC....', '..CC.CC.CC..', '.C...CC...C.', '.C.CC..CC.C.', 'C..CCCCCC..C', 'CCCCC..CCCCC', 'CCCCC..CCCCC', 'C..CCCCCC..C', '.C.CC..CC.C.', '.C...CC...C.', '..CC.CC.CC..', '....CCCC....'], { C: '#7fe0d0' }],
    plant: [['.....GG.....', '....GGGG....', '..HH.GG.....', '.GGGGGG.GGG.', '.GGGGGGGGGG.', '..GGGGGGGG..', '.....BB.....', '.....BB.....', '...PPPPPP...', '...PPPPPP...', '....PPPP....', '............'], { G: '#62d873', H: '#b8f5ae', B: '#3f8f4f', P: '#c47a52' }],
    star: [['.....YY.....', '.....YY.....', '....YYYY....', 'YYYYYYYYYYYY', '.YYYYYYYYYY.', '..YYYYYYYY..', '...YYYYYY...', '...YYYYYY...', '..YYY..YYY..', '..YY....YY..', '.Y........Y.', '............'], { Y: '#ffd24a' }],
    drop: [['.....BB.....', '.....BB.....', '....BBBB....', '....BBBB....', '...BBBBBB...', '..BBWBBBBB..', '..BWBBBBBB..', '..BWBBBBBB..', '..BBBBBBBB..', '...BBBBBB...', '....BBBB....', '............'], { B: '#58b7f0', W: '#d8f1ff' }],
    gear: [['....G..G....', '...GGGGGG...', '.GGGGGGGGGG.', '..GGG..GGG..', '.GGG....GGG.', '.GGG....GGG.', '..GGG..GGG..', '.GGGGGGGGGG.', '...GGGGGG...', '....G..G....', '............', '............'], { G: '#c7cad6' }],
    wall: [['BBBBBBBBBBBB', 'BWWBBBBBBBBB', 'BWBBBBBBBBBB', 'BBBBBBBBBBBB', 'SSSSSSSSSSSS', 'SSSSSSSSSSSS', 'BBBBBBBBBBBB', 'BBBBBBWBBBBB', 'BBBBBBBBBBBB', 'SSSSSSSSSSSS', 'SSSSSSSSSSSS', '............'], { B: '#58b7f0', W: '#d8f1ff', S: '#8a93a8' }],
    radio: [['..W......W..', '.W..W..W..W.', 'W..W.BB.W..W', 'W..W.BB.W..W', '.W..W..W..W.', '..W.BBBB.W..', '.....BB.....', '.....BB.....', '....BBBB....', '...BBBBBB...', '............', '............'], { W: '#c792ea', B: '#e4e7f0' }],
    moon: [['.....MMMM...', '...MMMM.....', '..MMMM......', '.MMMM.......', '.MMMM.......', '.MMMM.......', '.MMMMM.....M', '..MMMMM..MM.', '...MMMMMMMM.', '.....MMMM...', '............', '............'], { M: '#b9c7ff' }],
    book: [['............', '.RRRRRRRRRR.', '.RWWWRRWWWR.', '.RWWWRRWWWR.', '.RWWWRRWWWR.', '.RWWWRRWWWR.', '.RWWWRRWWWR.', '.RRRRRRRRRR.', '............', '............', '............', '............'], { R: '#e08a4a', W: '#fff3d8' }],
  };
  var iconCache = {};
  function radIcon() {
    var cv = canvas(24, 24), c = cv.getContext('2d');
    c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(12, 12, 12, 0, 7); c.fill();
    c.fillStyle = '#20182a';
    [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6].forEach(function (a) {
      c.beginPath(); c.moveTo(12, 12); c.arc(12, 12, 10, a - 0.52, a + 0.52); c.closePath(); c.fill();
    });
    c.fillStyle = '#ffd24a'; c.beginPath(); c.arc(12, 12, 3.6, 0, 7); c.fill();
    c.fillStyle = '#20182a'; c.beginPath(); c.arc(12, 12, 2.2, 0, 7); c.fill();
    return cv;
  }

  function icon(name) {
    if (!iconCache[name]) iconCache[name] = name === 'rad' ? radIcon() : pattern(ICONS[name][0], ICONS[name][1]);
    return iconCache[name];
  }

  // ---- Ground -------------------------------------------------------------
  var RAMP = ['#6f3319', '#86401f', '#9c4e27', '#b05d30', '#c26e3b', '#d38450', '#e19c6b'].map(rgb);
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  var CRATERS = [
    { x: 6, y: 13, r: 3 }, { x: 47, y: 10, r: 2.4 }, { x: 21, y: 32, r: 3.4 }, { x: 57, y: 23, r: 2 }, { x: 40, y: 3, r: 1.8 }, { x: 13, y: 5, r: 1.6 },
  ];

  function ground(c) {
    var w = 60 * 16, h = World.H * 16;
    var cv = canvas(w, h), g = cv.getContext('2d');
    var img = g.createImageData(w, h), d = img.data;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var n = fbm(x * 0.012, y * 0.012);
        var slope = (n - fbm((x + 4) * 0.012, (y + 4) * 0.012)) * 11;
        var ripple = Math.sin(x * 0.33 + y * 0.13 + fbm(x * 0.03, y * 0.03) * 10) * 0.035;
        var v = 0.42 + slope + ripple + (n - 0.5) * 0.45 + (vnoise(x * 0.5, y * 0.5) - 0.5) * 0.06;
        for (var k = 0; k < CRATERS.length; k++) {
          var cr = CRATERS[k];
          var dx = x / 16 - cr.x, dy = y / 16 - cr.y, dist = Math.sqrt(dx * dx + dy * dy) / cr.r;
          if (dist < 1.25) {
            var lit = (dx + dy) / (cr.r * 1.5);
            if (dist < 1) v += -0.2 * (1 - dist) + lit * 0.32 * dist;
            else v -= lit * 0.2 * (1.25 - dist) * 4;
          }
        }
        v += (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.09;
        var idx = Math.max(0, Math.min(RAMP.length - 1, Math.floor(v * RAMP.length)));
        var col = RAMP[idx], i = (y * w + x) * 4;
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    c.imageSmoothingEnabled = false;
    c.drawImage(cv, 0, 0, w * 2, h * 2);
    // Pebbles.
    for (var p = 0; p < 900; p++) {
      var rx = hash(p, 11) * 60 * TS, ry = hash(p, 23) * World.H * TS, s = 2 + ((hash(p, 5) * 3) | 0) * 2;
      px(c, 'rgba(40,16,8,.35)', rx + 1, ry + s - 1, s + 1, 2);
      px(c, hash(p, 7) > 0.5 ? '#7c4426' : '#b98560', rx, ry, s, s - 1);
      px(c, '#e0b08c', rx, ry, Math.max(1, s / 2), 1);
    }
  }

  function boulder(c, x, y, seed) {
    var X = x * TS, Y = y * TS;
    c.fillStyle = 'rgba(30,10,4,.4)';
    c.beginPath(); c.ellipse(X + 18, Y + 26, 15, 6, 0, 0, 7); c.fill();
    var pts = [[3, 22], [6, 10], [13, 4], [22, 5], [29, 13], [29, 24], [18, 28], [7, 27]];
    c.fillStyle = '#6e3a22';
    c.beginPath();
    pts.forEach(function (p, i) { var a = X + p[0] + (hash(seed, i) - 0.5) * 3, b = Y + p[1]; if (i) c.lineTo(a, b); else c.moveTo(a, b); });
    c.closePath(); c.fill();
    c.fillStyle = '#8f5333';
    c.beginPath(); c.moveTo(X + 6, Y + 10); c.lineTo(X + 13, Y + 4); c.lineTo(X + 22, Y + 5); c.lineTo(X + 18, Y + 16); c.lineTo(X + 8, Y + 17); c.closePath(); c.fill();
    c.fillStyle = '#b87748';
    c.beginPath(); c.moveTo(X + 12, Y + 6); c.lineTo(X + 18, Y + 6); c.lineTo(X + 15, Y + 11); c.closePath(); c.fill();
  }

  // ---- Inside the base ----------------------------------------------------
  var FLOORS = {};
  FLOORS[T.FLOOR] = ['#4a5163', '#3f4556', '#596178'];
  FLOORS[T.LAB] = ['#3d5a78', '#334c66', '#4d6f92'];
  FLOORS[T.GREEN] = ['#355f46', '#2c503b', '#43755a'];
  FLOORS[T.SHELTER] = ['#5c4a33', '#4d3e2a', '#705b40'];
  FLOORS[T.EFLOOR] = ['#1f2d4f', '#1a2644', '#293a63'];
  FLOORS[T.QUARTERS] = ['#4a3f6e', '#3e345e', '#5a4e84']; // soft purple carpet in the sleep room

  function floorTile(c, tile, x, y) {
    var X = x * TS, Y = y * TS, f = FLOORS[tile];
    px(c, f[0], X, Y, TS, TS);
    px(c, f[1], X, Y + 31, TS, 1); px(c, f[1], X + 31, Y, 1, TS);
    px(c, f[2], X, Y, TS, 1); px(c, f[2], X, Y, 1, TS);
    if (tile === T.FLOOR) { px(c, f[1], X + 3, Y + 3, 2, 2); px(c, f[1], X + 27, Y + 27, 2, 2); }
    if (tile === T.GREEN) { for (var i = 4; i < 30; i += 6) px(c, f[1], X + 3, Y + i, 26, 1); }
    if (tile === T.SHELTER && (x + y) % 2 === 0) px(c, f[2], X + 6, Y + 6, 20, 20);
    if (tile === T.LAB && hash(x, y) > 0.7) px(c, f[2], X + 8, Y + 8, 16, 16);
    if (tile === T.EFLOOR) { if ((x + y) % 2) px(c, f[2], X + 2, Y + 2, 28, 28); }
    if (tile === T.QUARTERS && hash(x, y) > 0.82) { px(c, '#f4e9a8', X + 8 + hash(y, x) * 14, Y + 8 + hash(x, y + 3) * 14, 2, 2); }
  }

  function wallTile(c, tile, x, y) {
    var X = x * TS, Y = y * TS;
    var below = World.get(x, y + 1), earth = tile === T.EWALL;
    var solidBelow = below === T.WALL || below === T.EWALL;
    var cap = earth ? '#2a3a63' : '#e2e6ee', seam = earth ? '#1d2a4a' : '#bcc3d0';
    if (solidBelow) {
      px(c, cap, X, Y, TS, TS);
      px(c, seam, X + 14, Y, 4, TS);
      if (World.get(x - 1, y) !== tile) px(c, seam, X, Y, 3, TS);
      if (World.get(x + 1, y) !== tile) px(c, seam, X + 29, Y, 3, TS);
      return;
    }
    var face = earth ? ['#1b2748', '#151f3a', '#0f172c'] : ['#a2abbd', '#858ea2', '#646c80'];
    px(c, cap, X, Y, TS, 9); px(c, seam, X, Y + 8, TS, 1);
    px(c, face[0], X, Y + 9, TS, 12); px(c, face[1], X, Y + 21, TS, 7); px(c, face[2], X, Y + 28, TS, 4);
    if (x % 3 === 0) { px(c, face[2], X + 15, Y + 9, 2, 19); }
    if (!earth && x % 5 === 1) {
      px(c, '#2d3b58', X + 6, Y + 11, 20, 10); px(c, '#6fd3ea', X + 7, Y + 12, 18, 8); px(c, '#b8f0ff', X + 8, Y + 13, 6, 2);
    }
    if (earth && x % 4 === 0) { px(c, '#4d7bd0', X + 4, Y + 12, 24, 2); }
  }

  function doorFrame(c, x, y) {
    floorTile(c, T.FLOOR, x, y);
    var X = x * TS, Y = y * TS;
    for (var i = 0; i < TS; i += 8) { px(c, i % 16 ? '#f2c14e' : '#23252f', X + i, Y, 8, 3); px(c, i % 16 ? '#23252f' : '#f2c14e', X + i, Y + 29, 8, 3); }
  }

  // Soft shadow on floors that sit right under a wall.
  function ambient(c) {
    for (var y = 1; y < World.H; y++) {
      for (var x = 1; x < World.W; x++) {
        var t = World.get(x, y);
        if (!FLOORS[t]) continue;
        var up = World.get(x, y - 1), left = World.get(x - 1, y), right = World.get(x + 1, y);
        var X = x * TS, Y = y * TS;
        if (up === T.WALL || up === T.EWALL) { px(c, 'rgba(8,8,20,.34)', X, Y, TS, 6); px(c, 'rgba(8,8,20,.18)', X, Y + 6, TS, 7); }
        if (left === T.WALL || left === T.EWALL) px(c, 'rgba(8,8,20,.2)', X, Y, 6, TS);
        if (right === T.WALL || right === T.EWALL) px(c, 'rgba(8,8,20,.12)', X + TS - 4, Y, 4, TS);
      }
    }
  }

  function glow(c, x, y, r, color, alpha) {
    var g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = alpha;
    c.fillStyle = g;
    c.fillRect(x - r, y - r, r * 2, r * 2);
    c.restore();
  }

  function shadow(c, X, Y, w, h) { c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(X + 3, Y + h - 3, w, 6); }

  var PROP = {
    table: function (c, X, Y, w, h) {
      shadow(c, X, Y, w, h);
      px(c, '#6c7488', X + 4, Y + 8, w - 8, h - 14); px(c, '#8d96ac', X + 4, Y + 6, w - 8, 6);
      px(c, '#3b3f4f', X + 6, Y + h - 8, 5, 8); px(c, '#3b3f4f', X + w - 11, Y + h - 8, 5, 8);
      px(c, '#e8e9f0', X + 14, Y + 16, 9, 6); px(c, '#d36b52', X + 16, Y + 17, 5, 3); px(c, '#e8e9f0', X + 38, Y + 26, 9, 6); px(c, '#8fe388', X + 40, Y + 27, 5, 3);
    },
    crates: function (c, X, Y) {
      [[4, 26, 26], [32, 30, 24], [12, 6, 24]].forEach(function (b) {
        var s = b[2], x = X + b[0], y = Y + b[1];
        px(c, 'rgba(0,0,0,.3)', x + 2, y + s - 2, s, 4);
        px(c, '#8a6a42', x, y, s, s); px(c, '#a98655', x, y, s, 4); px(c, '#6d5233', x, y + s - 3, s, 3);
        px(c, '#6d5233', x + s / 2 - 1, y, 2, s); px(c, '#6d5233', x, y + s / 2, s, 2);
      });
    },
    lockers: function (c, X, Y) {
      px(c, '#5f7ba0', X + 2, Y - 8, 28, 38); px(c, '#7a97bd', X + 2, Y - 8, 28, 4); px(c, '#3f5674', X + 15, Y - 8, 2, 38);
      px(c, '#d7dce6', X + 10, Y + 8, 2, 6); px(c, '#d7dce6', X + 20, Y + 8, 2, 6);
    },
    shelf: function (c, X, Y, w) {
      px(c, '#6b4d30', X, Y + 2, w, 22); px(c, '#8c6a44', X, Y, w, 4); px(c, '#4f381f', X, Y + 22, w, 4);
      for (var i = 8; i < w - 10; i += 18) {
        var h = 6 + hash(i, 3) * 8;
        px(c, '#a55c3a', X + i, Y + 12, 12, 10); px(c, '#c47a52', X + i, Y + 12, 12, 2);
        px(c, '#58c868', X + i + 1, Y + 11 - h, 10, h); px(c, '#92eb96', X + i + 3, Y + 11 - h, 4, 3); px(c, '#3ea155', X + i + 7, Y + 12 - h / 2, 3, h / 2);
      }
    },
    sampletable: function (c, X, Y, w, h) {
      shadow(c, X, Y, w, h);
      px(c, '#dfe3ec', X, Y + 2, w, 18); px(c, '#ffffff', X, Y + 2, w, 3); px(c, '#9aa2b4', X, Y + 20, w, 8);
      [10, 34, 58, 78].forEach(function (a, i) {
        px(c, ['#b5764a', '#7f8ea8', '#c9a96a', '#a9503a'][i], X + a, Y + 8, 10, 7);
        px(c, 'rgba(255,255,255,.4)', X + a + 1, Y + 8, 4, 2);
      });
    },
    tanks: function (c, X, Y, w) {
      for (var i = 0; i < w; i += 32) {
        px(c, '#2f5f8e', X + i + 1, Y - 10, 30, 38); px(c, '#58a7e0', X + i + 4, Y - 6, 24, 30); px(c, '#a6dcff', X + i + 7, Y - 4, 5, 26); px(c, '#20456a', X + i + 1, Y + 24, 30, 4);
      }
    },
    // A sleep pod: a padded bunk with a sleeping bag, a pillow and a little reading lamp.
    sleeppod: function (c, X, Y, w) {
      px(c, 'rgba(0,0,0,.3)', X + 3, Y + 26, w, 6);
      px(c, '#8b93ad', X, Y - 10, w, 38); px(c, '#a6aec6', X, Y - 10, w, 4); px(c, '#5d6480', X, Y + 24, w, 4);
      px(c, '#2b2f45', X + 4, Y - 4, w - 8, 26);
      px(c, '#7a5cc4', X + 18, Y - 1, w - 26, 20); px(c, '#9a7ee0', X + 18, Y - 1, w - 26, 4);
      for (var z = 26; z < w - 10; z += 8) px(c, '#5d43a0', X + z, Y + 3, 2, 14);
      px(c, '#f2f2f7', X + 6, Y + 1, 12, 14); px(c, '#d7d9e6', X + 6, Y + 12, 12, 3);
      px(c, '#ffd166', X + w - 9, Y - 7, 4, 4);
    },
    // The night screen: a moon and stars, where the crew looks at the day's numbers.
    nightboard: function (c, X, Y, w) {
      px(c, '#1a1d2e', X, Y - 22, w, 40); px(c, '#3a4060', X - 3, Y - 25, w + 6, 3); px(c, '#3a4060', X - 3, Y + 18, w + 6, 4);
      px(c, '#0b1030', X + 4, Y - 18, w - 8, 32);
      c.fillStyle = '#f4e9a8'; c.beginPath(); c.arc(X + 20, Y - 4, 9, 0, 7); c.fill();
      c.fillStyle = '#0b1030'; c.beginPath(); c.arc(X + 25, Y - 7, 8, 0, 7); c.fill();
      for (var s = 0; s < 9; s++) px(c, '#ffffff', X + 34 + hash(s, 7) * (w - 44), Y - 15 + hash(s, 9) * 24, 2, 2);
      [0.5, 0.8, 0.35].forEach(function (v, i) { px(c, ['#62d873', '#58b7f0', '#ffd166'][i], X + w - 34 + i * 9, Y + 10 - 20 * v, 6, 20 * v); });
    },
    bunk: function (c, X, Y, w) {
      px(c, '#6c7488', X, Y - 8, w, 36); px(c, '#3f6fb4', X + 3, Y - 4, w - 6, 13); px(c, '#3f6fb4', X + 3, Y + 12, w - 6, 13); px(c, '#ffffff', X + 3, Y - 4, 13, 7); px(c, '#ffffff', X + 3, Y + 12, 13, 7);
    },
    desk: function (c, X, Y, w, h) {
      shadow(c, X, Y, w, h);
      px(c, '#42506f', X, Y + 6, w, 18); px(c, '#5a6b8f', X, Y + 6, w, 4); px(c, '#2c3650', X, Y + 24, w, 6);
      for (var i = 8; i < w - 16; i += 32) {
        px(c, '#10182c', X + i, Y - 8, 22, 16); px(c, ['#5ee0a0', '#58b7f0', '#ffd166'][(i / 32) % 3 | 0], X + i + 2, Y - 6, 18, 12); px(c, '#0d1322', X + i + 9, Y + 8, 4, 3);
        px(c, 'rgba(0,0,0,.35)', X + i + 3, Y - 4, 12, 1); px(c, 'rgba(0,0,0,.35)', X + i + 3, Y, 8, 1);
      }
    },
    pot: function (c, X, Y) {
      px(c, 'rgba(0,0,0,.3)', X + 6, Y + 26, 22, 5); px(c, '#b5764a', X + 8, Y + 16, 16, 12); px(c, '#d29465', X + 7, Y + 14, 18, 4);
      px(c, '#3ea155', X + 6, Y - 4, 20, 20); px(c, '#58c868', X + 9, Y - 8, 14, 18); px(c, '#92eb96', X + 12, Y - 6, 5, 6);
    },
    lander: function (c, X, Y, w, h) {
      c.fillStyle = 'rgba(30,10,4,.4)'; c.beginPath(); c.ellipse(X + w / 2 + 6, Y + h - 16, w / 2, 18, 0, 0, 7); c.fill();
      px(c, '#6c7488', X + 12, Y + h - 44, 6, 34); px(c, '#6c7488', X + w - 18, Y + h - 44, 6, 34); px(c, '#8d96ac', X + 4, Y + h - 12, 22, 5); px(c, '#8d96ac', X + w - 26, Y + h - 12, 22, 5);
      px(c, '#cfd4e0', X + 26, Y + 24, w - 52, h - 58); px(c, '#eef0f6', X + 30, Y + 24, 26, h - 58); px(c, '#9aa2b4', X + w - 44, Y + 24, 18, h - 58);
      px(c, '#e0e4ec', X + 44, Y + 2, w - 88, 24); px(c, '#ff7b54', X + 26, Y + 80, w - 52, 8);
      px(c, '#21305e', X + 64, Y + 44, 30, 22); px(c, '#58b7f0', X + 68, Y + 47, 12, 6);
    },
    oldrover: function (c, X, Y, w, h) {
      c.fillStyle = 'rgba(30,10,4,.4)'; c.fillRect(X + 8, Y + h - 12, w - 8, 10);
      px(c, '#3a3d4a', X + 6, Y + h - 22, 18, 18); px(c, '#3a3d4a', X + w - 26, Y + h - 22, 18, 18); px(c, '#3a3d4a', X + w / 2 - 9, Y + h - 22, 18, 18);
      px(c, '#b9a48c', X + 8, Y + 18, w - 16, 26); px(c, '#d0bba2', X + 8, Y + 18, w - 16, 5); px(c, '#27386a', X + 12, Y + 8, w - 26, 12); px(c, '#3e5aa8', X + 14, Y + 9, w - 34, 3);
      px(c, '#8a7662', X + w - 26, Y - 4, 5, 22); px(c, '#b9a48c', X + w - 34, Y - 12, 20, 10); px(c, '#2a2d38', X + w - 30, Y - 9, 12, 5);
      px(c, 'rgba(176,93,48,.45)', X + 8, Y + 8, w - 16, 36);
    },
  };

  function buildMap() {
    var cv = canvas(World.W * TS, World.H * TS), c = cv.getContext('2d');
    px(c, '#05060c', 0, 0, cv.width, cv.height);
    // Stars around mission control.
    for (var s = 0; s < 900; s++) {
      var sx = 60 * TS + hash(s, 1) * 30 * TS, sy = hash(s, 2) * World.H * TS, b = hash(s, 3);
      px(c, b > 0.85 ? '#ffffff' : b > 0.5 ? '#9fb2ff' : '#4d5a8a', sx, sy, b > 0.9 ? 2 : 1, b > 0.9 ? 2 : 1);
    }
    ground(c);
    c.fillStyle = 'rgba(30,8,2,.38)';
    c.fillRect(16 * TS + 16, 12 * TS + 22, 29 * TS, 15 * TS);
    c.fillRect(9 * TS + 16, 14 * TS + 22, 8 * TS, 11 * TS);
    // Rover tracks from the south door.
    for (var i = 0; i < 90; i++) {
      var ty = 27 * TS + i * 6, tx = 30 * TS + Math.sin(i * 0.12) * 26;
      px(c, 'rgba(50,20,8,.3)', tx - 16, ty, 6, 3); px(c, 'rgba(50,20,8,.3)', tx + 14, ty, 6, 3);
    }
    for (var y = 0; y < World.H; y++) {
      for (var x = 0; x < World.W; x++) {
        var t = World.get(x, y);
        if (FLOORS[t]) floorTile(c, t, x, y);
        else if (t === T.DOOR) doorFrame(c, x, y);
        else if (t === T.WALL || t === T.EWALL) wallTile(c, t, x, y);
        else if (t === T.BOULDER) boulder(c, x, y, x * 13 + y);
      }
    }
    ambient(c);
    // Ceiling lamps.
    [[21, 19], [30, 16], [30, 22], [40, 16], [40, 23]].forEach(function (l) { glow(c, l[0] * TS, l[1] * TS, 190, '#ffe9c0', 0.13); });
    [[20, 16], [20, 23]].forEach(function (l) { glow(c, l[0] * TS, l[1] * TS, 170, '#ff9bd8', 0.1); });
    [[13, 19]].forEach(function (l) { glow(c, l[0] * TS, l[1] * TS, 170, '#b9a4ff', 0.13); }); // soft night light
    [[70, 14], [80, 14], [74, 20]].forEach(function (l) { glow(c, l[0] * TS, l[1] * TS, 230, '#7fb2ff', 0.12); });
    // A big label on the floor of mission control.
    World.PROPS.forEach(function (p) { PROP[p.kind](c, p.x * TS, p.y * TS, p.w * TS, p.h * TS); });
    return cv;
  }

  // Sheet of dust for panels and dust storms.
  var dustCache = null;
  function dustTexture() {
    if (dustCache) return dustCache;
    var cv = canvas(256, 128), c = cv.getContext('2d');
    var img = c.createImageData(256, 128), d = img.data;
    for (var y = 0; y < 128; y++) {
      for (var x = 0; x < 256; x++) {
        var v = fbm(x * 0.05, y * 0.05), i = (y * 256 + x) * 4;
        d[i] = 196; d[i + 1] = 124; d[i + 2] = 74;
        d[i + 3] = 150 + v * 105;
      }
    }
    c.putImageData(img, 0, 0);
    dustCache = cv;
    return cv;
  }

  // ---- Text and boxes for drawing on the game canvas -----------------------
  var FONT = '"Baloo Bhaijaan 2","Segoe UI",Tahoma,sans-serif';
  function isRtl() { return root.I18N.lang === 'ar'; }

  function text(c, str, x, y, size, color, align, weight, noStroke) {
    c.font = (weight || 600) + ' ' + size + 'px ' + FONT;
    c.direction = isRtl() ? 'rtl' : 'ltr';
    c.textAlign = align || 'left';
    c.textBaseline = 'alphabetic';
    if (!noStroke) {
      c.lineWidth = Math.max(2, size / 5);
      c.lineJoin = 'round';
      c.strokeStyle = 'rgba(8,10,18,.92)';
      c.strokeText(str, x, y);
    }
    c.fillStyle = color || '#fff';
    c.fillText(str, x, y);
  }

  function wrap(c, str, maxW, size, weight) {
    c.font = (weight || 600) + ' ' + size + 'px ' + FONT;
    var words = String(str).split(' '), lines = [], line = '';
    for (var i = 0; i < words.length; i++) {
      var test = line ? line + ' ' + words[i] : words[i];
      if (c.measureText(test).width > maxW && line) { lines.push(line); line = words[i]; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function box(c, x, y, w, h, fill, border) {
    c.fillStyle = 'rgba(0,0,0,.45)';
    c.fillRect(x + 4, y + 5, w, h);
    c.fillStyle = fill || '#12162a';
    c.fillRect(x, y, w, h);
    c.strokeStyle = '#05060c'; c.lineWidth = 4; c.strokeRect(x + 2, y + 2, w - 4, h - 4);
    c.strokeStyle = border || '#f5f1e6'; c.lineWidth = 2; c.strokeRect(x + 3, y + 3, w - 6, h - 6);
  }

  // ---- Pictures for the How to play screen ---------------------------------
  function howSky(c, W, H) {
    var g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1a1230'); g.addColorStop(0.6, '#8a4530'); g.addColorStop(1, '#d98a58');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
  }

  function howSun(c, x, y, r) {
    glow(c, x, y, r * 3, '#ffb347', 0.75);
    c.fillStyle = '#ffb347'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    c.fillStyle = '#ffe28a'; c.beginPath(); c.arc(x, y, r * 0.68, 0, 7); c.fill();
  }

  function howPower(c, W, H) {
    howSky(c, W, 92);
    px(c, '#b05d30', 0, 72, W, 20); px(c, '#c26e3b', 0, 72, W, 2);
    howSun(c, 40, 28, 15);
    px(c, '#22273a', 92, 34, 92, 36);
    for (var i = 0; i < 8; i++) for (var j = 0; j < 3; j++) px(c, (i + j) % 2 ? '#1f3f8f' : '#2a53b3', 94 + i * 11, 36 + j * 11, 10, 10);
    px(c, '#565d70', 134, 70, 8, 8);
    c.strokeStyle = '#ffe28a'; c.lineWidth = 2; c.setLineDash([6, 5]);
    c.beginPath(); c.moveTo(58, 34); c.lineTo(90, 46); c.stroke(); c.setLineDash([]);
    c.imageSmoothingEnabled = false;
    for (var b = 0; b < 5; b++) c.drawImage(icon('bolt'), 200 + b * 22, 36, 22, 22);
    px(c, '#10142a', 0, 92, W, H - 92);
    [['fan', 3], ['plant', 2], ['wall', 1], ['radio', 1], ['moon', 3]].forEach(function (m, k) {
      var w = W / 5, x = k * w;
      px(c, k === 4 ? '#25315e' : '#1b2140', x + 3, 96, w - 6, H - 100);
      c.drawImage(icon(m[0]), x + w / 2 - 15, 100, 30, 30);
      for (var n = 0; n < m[1]; n++) c.drawImage(icon('bolt'), x + w / 2 - m[1] * 7 + n * 14, 133, 14, 14);
    });
  }

  function howJob(c, W, H) {
    var f = FLOORS[T.FLOOR];
    px(c, f[0], 0, 0, W, H);
    for (var x = 0; x < W; x += 32) for (var y = 34; y < H; y += 32) { px(c, f[1], x, y + 31, 32, 1); px(c, f[1], x + 31, y, 1, 32); px(c, f[2], x, y, 32, 1); }
    px(c, '#e2e6ee', 0, 0, W, 10); px(c, '#a2abbd', 0, 10, W, 16); px(c, '#646c80', 0, 26, W, 8);
    px(c, 'rgba(8,8,20,.3)', 0, 34, W, 8);
    px(c, '#6fd3ea', 26, 12, 34, 10); px(c, '#b8f0ff', 28, 13, 10, 2);
    // A machine with the marker over it.
    px(c, '#2f5a50', 214, 36, 76, 72); px(c, '#46806f', 214, 36, 76, 4);
    c.fillStyle = '#13251f'; c.beginPath(); c.arc(252, 74, 26, 0, 7); c.fill();
    c.fillStyle = '#9ff0d6';
    for (var b = 0; b < 4; b++) { var a = b * Math.PI / 2 + 0.5; c.save(); c.translate(252, 74); c.rotate(a); c.fillRect(-4, -23, 8, 20); c.restore(); }
    glow(c, 252, 22, 34, '#ffe066', 0.55);
    c.fillStyle = '#16121f'; c.beginPath(); c.moveTo(236, 8); c.lineTo(268, 8); c.lineTo(252, 30); c.fill();
    c.fillStyle = '#ffe066'; c.beginPath(); c.moveTo(241, 11); c.lineTo(263, 11); c.lineTo(252, 25); c.fill();
    // The player follows the arrow.
    c.imageSmoothingEnabled = false;
    c.fillStyle = 'rgba(0,0,0,.32)'; c.beginPath(); c.ellipse(72, 139, 24, 7, 0, 0, 7); c.fill();
    drawSmooth(c, sprite('engineer', 'right', 1, false), 36, 46, 72, 96);
    c.fillStyle = '#ffe066'; c.strokeStyle = '#16121f'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(126, 80); c.lineTo(170, 80); c.lineTo(170, 66); c.lineTo(202, 92); c.lineTo(170, 118); c.lineTo(170, 104); c.lineTo(126, 104); c.closePath();
    c.stroke(); c.fill();
    // The key to press.
    px(c, '#16121f', 240, 116, 36, 36); px(c, '#f5f1e6', 242, 118, 32, 30); px(c, '#b9bfce', 242, 144, 32, 4);
    c.font = '700 22px ' + FONT; c.fillStyle = '#16121f'; c.textAlign = 'center'; c.direction = 'ltr'; c.fillText('E', 258, 141);
  }

  function howStorm(c, W, H) {
    px(c, '#07081a', 0, 0, W, H);
    for (var i = 0; i < 40; i++) px(c, '#7f93c8', hash(i, 1) * 150, hash(i, 2) * H, 2, 2);
    howSun(c, 8, H / 2, 46);
    // The shelter, with water walls that stop the particles.
    px(c, '#57472f', 176, 16, W - 176, H - 16);
    for (var x = 200; x < W; x += 32) for (var y = 16; y < H; y += 32) if (((x + y) / 32 | 0) % 2) px(c, '#705b40', x + 4, y + 4, 24, 24);
    px(c, '#c6ccd8', 160, 0, W - 160, 16); px(c, '#858ea2', 160, 12, W - 160, 4);
    px(c, '#2f6fae', 160, 16, 26, H - 16); px(c, '#58b7f0', 164, 18, 18, H - 20); px(c, '#a6dcff', 167, 22, 5, H - 30);
    [[28, 0], [62, 3], [92, 5], [118, 1], [46, 7], [104, 2], [136, 6]].forEach(function (p, k) {
      var x = 76 + (k * 13) % 76, y = 18 + p[1] * 18;
      px(c, 'rgba(255,90,90,.4)', x - 16, y + 1, 16, 2); px(c, '#ff5a5a', x, y, 9, 5);
    });
    c.imageSmoothingEnabled = false;
    drawSmooth(c, sprite('farmer', 'down', 0, false), 200, 46, 60, 80);
    drawSmooth(c, sprite('doctor', 'down', 0, false), 250, 52, 60, 80);
    // Alarm light.
    glow(c, 296, 24, 34, '#ff3a3a', 0.8);
    px(c, '#16121f', 286, 6, 20, 20); px(c, '#ff5a5a', 288, 8, 16, 16); px(c, '#ffb0b0', 291, 10, 5, 4);
  }

  function howLearn(c, W, H) {
    px(c, '#1b2140', 0, 0, W, H);
    for (var i = 0; i < 26; i++) px(c, '#2e3560', hash(i, 3) * W, hash(i, 4) * H, 3, 3);
    // A day report with stars.
    px(c, 'rgba(0,0,0,.35)', 26, 18, 142, 130);
    px(c, '#f5f1e6', 20, 12, 142, 130); px(c, '#ffd166', 20, 12, 142, 22);
    c.imageSmoothingEnabled = false;
    [0, 1, 2].forEach(function (k) {
      if (k === 2) c.globalAlpha = 0.28;
      c.drawImage(icon('star'), 30 + k * 42, 42, 36, 36);
      c.globalAlpha = 1;
    });
    [['#62d873', 96], ['#62d873', 74], ['#ff8a8a', 52]].forEach(function (b, k) {
      px(c, '#c9ccd8', 32, 90 + k * 15, 118, 8); px(c, b[0], 32, 90 + k * 15, b[1], 8);
    });
    // A new science card.
    px(c, 'rgba(0,0,0,.35)', 186, 26, 104, 76);
    px(c, '#10243a', 180, 20, 104, 76); px(c, '#58b7f0', 180, 20, 104, 3); px(c, '#58b7f0', 180, 93, 104, 3); px(c, '#58b7f0', 180, 20, 3, 76); px(c, '#58b7f0', 281, 20, 3, 76);
    c.drawImage(icon('book'), 194, 28, 40, 40);
    for (var l = 0; l < 3; l++) px(c, '#8fb7dc', 192, 68 + l * 8, l === 2 ? 48 : 80, 3);
    // Try again.
    c.strokeStyle = '#ffe066'; c.lineWidth = 6;
    c.beginPath(); c.arc(208, 126, 16, 0.6, 5.6); c.stroke();
    c.fillStyle = '#ffe066'; c.beginPath(); c.moveTo(218, 108); c.lineTo(236, 116); c.lineTo(220, 128); c.fill();
    if (avatar()) { c.imageSmoothingEnabled = true; avatar().draw(c, 244, 100, 52, 58, { mode: 'full' }); }
  }

  var HOW_PICTURES = [howPower, howJob, howStorm, howLearn];
  function howPicture(step) {
    var W = 320, H = 160, cv = canvas(W, H);
    HOW_PICTURES[step - 1](cv.getContext('2d'), W, H);
    cv.className = 'how-pic';
    return cv;
  }

  root.Art = {
    howPicture: howPicture,
    TS: TS, ROLE: ROLE, hash: hash, vnoise: vnoise, fbm: fbm, canvas: canvas, px: px, sprite: sprite, crewSprite: crewSprite, drawSmooth: drawSmooth, dusty: dusty, rover: rover, portrait: portrait, icon: icon,
    setDustyEmotion: setDustyEmotion, setDustySpeaking: setDustySpeaking, dustyEmotion: function () { return dustyEmotion; }, dustyIsSpeaking: function () { return dustySpeaking; },
    buildMap: buildMap, glow: glow, dustTexture: dustTexture, text: text, wrap: wrap, box: box, FONT: FONT, isRtl: isRtl,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Art;
})(typeof window !== 'undefined' ? window : globalThis);
