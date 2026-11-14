// Keyboard and gamepad, merged into one simple state per player. (PC only: no touch controls.)
(function (root) {
  'use strict';

  // In a solo game player 1 can also use the arrow keys.
  var KEYSETS = [
    { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], act: ['KeyE', 'Space'], swap: ['KeyQ', 'Tab'], label: { move: 'W A S D', act: 'E', swap: 'Q' } },
    { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], act: ['Enter', 'Slash'], swap: ['ShiftRight', 'Period'], label: { move: '↑ ← ↓ →', act: 'Enter', swap: 'Shift' } },
    { up: ['KeyI'], down: ['KeyK'], left: ['KeyJ'], right: ['KeyL'], act: ['KeyU'], swap: ['KeyO'], label: { move: 'I J K L', act: 'U', swap: 'O' } },
    { up: ['Numpad8'], down: ['Numpad5'], left: ['Numpad4'], right: ['Numpad6'], act: ['Numpad7'], swap: ['Numpad9'], label: { move: '8 4 5 6', act: '7', swap: '9' } },
  ];

  var down = {};
  var prev = [{}, {}, {}, {}];
  var soloMode = true;

  function any(codes) {
    for (var i = 0; i < codes.length; i++) if (down[codes[i]]) return true;
    return false;
  }

  function pad(i) {
    if (!navigator.getGamepads) return null;
    var pads = navigator.getGamepads();
    var live = [];
    for (var k = 0; k < pads.length; k++) if (pads[k] && pads[k].connected) live.push(pads[k]);
    return live[i] || null;
  }

  function read(i) {
    var keys = KEYSETS[i];
    var s = {
      up: any(keys.up), down: any(keys.down), left: any(keys.left), right: any(keys.right),
      act: any(keys.act), swap: any(keys.swap), x: 0, y: 0,
    };
    if (i === 0 && soloMode) {
      var k2 = KEYSETS[1];
      s.up = s.up || any(k2.up); s.down = s.down || any(k2.down);
      s.left = s.left || any(k2.left); s.right = s.right || any(k2.right);
      s.act = s.act || down.Enter;
    }
    s.x = (s.right ? 1 : 0) - (s.left ? 1 : 0);
    s.y = (s.down ? 1 : 0) - (s.up ? 1 : 0);

    var gp = typeof navigator !== 'undefined' ? pad(i) : null;
    if (gp) {
      var ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (Math.abs(ax) > 0.25) s.x = ax;
      if (Math.abs(ay) > 0.25) s.y = ay;
      var b = gp.buttons;
      function pressed(n) { return b[n] && b[n].pressed; }
      if (pressed(12) || ay < -0.5) s.up = true;
      if (pressed(13) || ay > 0.5) s.down = true;
      if (pressed(14) || ax < -0.5) s.left = true;
      if (pressed(15) || ax > 0.5) s.right = true;
      if (pressed(12)) s.y = -1;
      if (pressed(13)) s.y = 1;
      if (pressed(14)) s.x = -1;
      if (pressed(15)) s.x = 1;
      s.act = s.act || pressed(0);
      s.swap = s.swap || pressed(3) || pressed(1);
    }

    // One-frame "just pressed" flags for menus and switching.
    var p = prev[i];
    var out = {
      x: s.x, y: s.y, act: s.act,
      actPressed: s.act && !p.act,
      swap: s.swap && !p.swap,
      upPressed: s.up && !p.up, downPressed: s.down && !p.down,
      leftPressed: s.left && !p.left, rightPressed: s.right && !p.right,
    };
    prev[i] = s;
    return out;
  }

  function init() {
    window.addEventListener('keydown', function (e) {
      var inField = e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
      if (inField) return;
      down[e.code] = true;
      if (/^(Arrow|Tab|Space)/.test(e.code) && document.body.classList.contains('in-game')) e.preventDefault();
    });
    window.addEventListener('keyup', function (e) { down[e.code] = false; });
    window.addEventListener('blur', function () { down = {}; });
  }


  root.Input = {
    KEYSETS: KEYSETS, init: init, read: read,
    setSolo: function (v) { soloMode = v; },
    isSolo: function () { return soloMode; },
    label: function (i) {
      if (i === 0 && soloMode) return { move: 'W A S D / ↑ ← ↓ →', act: 'E / Space', swap: 'Q' };
      return KEYSETS[i].label;
    },
    actKey: function (i) { return i === 0 && soloMode ? 'E' : KEYSETS[i].label.act; },
    keysFor: function (i) { return { act: i === 0 && soloMode ? 'E' : KEYSETS[i].label.act, swap: KEYSETS[i].label.swap }; },
    gamepads: function () { var n = 0; if (navigator.getGamepads) { var p = navigator.getGamepads(); for (var i = 0; i < p.length; i++) if (p[i]) n++; } return n; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
