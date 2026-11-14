// Dusty's welcome entrance. On a fresh page load, while the main menu is showing, the companion
// Dusty (the same canvas and the same shared character from js/dusty-avatar.js) leaves his
// bottom-right corner and travels on a curve to the middle of the screen, growing on the way.
// The moment he arrives full size he says the recorded "dusty_welcome" line (his mouth follows
// the recording), then he laughs, winks, and travels back to his exact place.
//
// Nothing here draws Dusty: the entrance only moves and scales the companion canvas with CSS
// transforms (Web Animations API), and cues expressions on the shared avatar. PC only.
(function (root) {
  'use strict';

  // Durations in ms. The voice decides how long Dusty stays in the middle; it is never cut.
  var TIMING = { travel: 1300, laugh: 1100, wink: 700, back: 900, reducedIn: 450, reducedBack: 450, lockedHold: 20000, silentTalk: 4800, maxTalk: 30000 };
  // Expression cues while he talks, in ms from the first word.
  var CUES = [
    { at: 0, perform: 'excited' },
    { at: 700, blink: true },
    { at: 1600, perform: 'happy' },
    { at: 3200, blink: true },
    { at: 4200, perform: 'welcome' },
  ];
  var VOICE_ID = 'dusty_welcome';
  var SCALE = 3.3; // against the normal companion size (112 x 128)

  // Where the enlarged Dusty stops: the middle of the screen, with his speech bubble above him.
  // Pure: takes the measured geometry, returns the target. g = { vw, vh, face: {left, top, width,
  // height}, bubble: {left, top, bottom, width, height} | null, reduced }
  function layout(g) {
    var margin = 16;
    var bubbleH = g.bubble ? g.bubble.height + 12 : 0;
    var ratio = g.face.height / g.face.width;
    var bigH = Math.min(128 * (g.reduced ? 2.4 : SCALE), g.vh - 2 * margin - bubbleH, (g.vw - 2 * margin) * ratio);
    bigH = Math.max(bigH, 128);
    var scale = bigH / g.face.height, bigW = g.face.width * scale;
    // The bubble and Dusty together are centred on the screen.
    var blockTop = Math.max(margin, (g.vh - (bubbleH + bigH)) / 2);
    var x = (g.vw - bigW) / 2, y = blockTop + bubbleH;
    var out = { scale: scale, x: x, y: y, width: bigW, height: bigH, dx: x - g.face.left, dy: y - g.face.top, bubbleDx: 0, bubbleDy: 0 };
    if (g.bubble) {
      out.bubbleDx = (g.vw - g.bubble.width) / 2 - g.bubble.left;
      out.bubbleDy = (y - 10) - g.bubble.bottom;
    }
    // The curve from his corner to the middle: it rises up and to the left first, then glides in
    // sideways, like an arrow drawn from the bottom-right corner to the centre.
    var sx = g.face.left + g.face.width / 2, sy = g.face.top + g.face.height / 2;
    var ex = x + bigW / 2, ey = y + bigH / 2;
    out.path = { start: [sx, sy], control: [ex + (sx - ex) * 0.55, ey + (sy - ey) * 0.08], end: [ex, ey] };
    return out;
  }
  function bezier(p, u) {
    var a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
    return [a * p.start[0] + b * p.control[0] + c * p.end[0], a * p.start[1] + b * p.control[1] + c * p.end[1]];
  }
  function easeInOut(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  // A transform that puts the canvas centre at (cx, cy) with scale s (transform-origin 0 0).
  function placeAt(g, l, cx, cy, s) {
    var left = cx - g.face.width * s / 2, top = cy - g.face.height * s / 2;
    return 'translate(' + (left - g.face.left).toFixed(1) + 'px,' + (top - g.face.top).toFixed(1) + 'px) scale(' + s.toFixed(4) + ')';
  }
  // Keyframes for the trip to the middle (or back, reversed): position eased along the curve, size
  // growing as he gets closer, and a small landing bounce at the end.
  function travelFrames(g, l, back) {
    var frames = [], N = 18;
    for (var i = 0; i <= N; i++) {
      var u = i / N, e = easeInOut(u), pt = bezier(l.path, back ? 1 - e : e);
      var grow = Math.pow(back ? 1 - e : e, 1.2);
      var s = 1 + (l.scale * (back ? 1 : 1.05) - 1) * grow;
      frames.push({ transform: placeAt(g, l, pt[0], pt[1], s), offset: back ? 0.12 + u * 0.88 : u * 0.86 });
    }
    if (back) frames.unshift({ transform: placeAt(g, l, l.path.end[0], l.path.end[1], l.scale * 1.04), offset: 0 });
    else frames.push({ transform: placeAt(g, l, l.path.end[0], l.path.end[1], l.scale), offset: 1 });
    frames[frames.length - 1].transform = back ? 'none' : frames[frames.length - 1].transform;
    return frames;
  }

  var started = false, current = null;

  // env = { doc, win, avatar, voice, app, speak (plays dusty_welcome, returns true when queued), reduced, onDone }
  function start(env) {
    if (started) return null; // once per page load, even if the boot code runs twice
    started = true;
    var doc = env.doc || root.document, win = env.win || root;
    var widget = doc && doc.getElementById('dusty-companion');
    var canvas = widget && widget.querySelector('[data-dusty-rover]');
    var bubble = widget && widget.querySelector('[data-dusty-bubble]');
    var app = env.app || {}, avatar = env.avatar, voice = env.voice;
    if (!widget || !canvas || !canvas.animate || widget.hidden || app.state !== 'title') { if (env.onDone) env.onDone('skipped'); return null; }

    var reduced = !!env.reduced;
    var phase = 'enter', timers = [], cueTimers = [], anims = [], bubbleAnims = [], unsub = [], voiceStarted = false, finished = false;
    var geo = null, lay = null;
    var intro = { phase: function () { return phase; }, layout: function () { return lay; }, finish: function () { leave(); } };
    current = intro;

    function later(fn, ms, list) { var id = win.setTimeout(fn, ms); (list || timers).push(id); return id; }
    function clear(list) { while (list.length) win.clearTimeout(list.pop()); }
    function perform(name) { if (avatar && avatar.perform) avatar.perform(name); }
    function cancel(list) { list.forEach(function (a) { try { a.cancel(); } catch (e) { /* gone */ } }); list.length = 0; }
    function talking() { return phase === 'show'; }

    function runCues() {
      clear(cueTimers);
      CUES.forEach(function (cue) {
        later(function () {
          if (!talking()) return;
          if (cue.perform) perform(cue.perform);
          if (cue.blink && avatar && avatar.blink) avatar.blink();
        }, cue.at, cueTimers);
      });
    }
    function measure() {
      var r = canvas.getBoundingClientRect(), b = bubble && bubble.offsetParent !== null ? bubble.getBoundingClientRect() : null;
      return {
        vw: win.innerWidth, vh: win.innerHeight, face: { left: r.left, top: r.top, width: r.width, height: r.height },
        bubble: b ? { left: b.left, top: b.top, bottom: b.bottom, width: b.width, height: b.height } : null, reduced: reduced,
      };
    }
    function bigTransform() { return placeAt(geo, lay, lay.path.end[0], lay.path.end[1], lay.scale); }
    function bubbleAt() { return 'translate(' + lay.bubbleDx.toFixed(1) + 'px,' + lay.bubbleDy.toFixed(1) + 'px)'; }
    function hold(el, transform, list, opacity) {
      var f = { transform: transform }; if (opacity != null) f.opacity = opacity;
      list.push(el.animate([f, f], { duration: 1, fill: 'forwards' }));
    }

    // ---- 1. The trip to the middle ------------------------------------------------
    function enter() {
      widget.classList.add('dusty-intro');
      canvas.style.transformOrigin = '0 0';
      geo = measure(); lay = layout(geo);
      canvas.setAttribute('data-dusty-scale', String(Math.min(4, lay.scale).toFixed(2)));
      perform('excited');
      if (avatar && avatar.lookAt) avatar.lookAt(-0.6, -0.2, TIMING.travel); // looks where he is going
      if (bubble) bubbleAnims.push(bubble.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }));
      var ms = reduced ? TIMING.reducedIn : TIMING.travel;
      var frames = reduced ? [{ transform: bigTransform(), opacity: 0 }, { transform: bigTransform(), opacity: 1 }] : travelFrames(geo, lay, false);
      anims.push(canvas.animate(frames, { duration: ms, easing: 'linear', fill: 'forwards' }));
      win.setTimeout(arrive, ms);
      if (doc.fonts && doc.fonts.ready && doc.fonts.ready.then) doc.fonts.ready.then(function () { relayout(); });
    }

    // ---- 2. Full size in the middle: he talks right away ----------------------------
    function arrive() {
      if (finished || phase !== 'enter') return;
      phase = 'show';
      relayout();
      if (avatar && avatar.lookAt) avatar.lookAt(0, 0.1, 1500); // looks at the player
      if (bubble) {
        cancel(bubbleAnims);
        bubbleAnims.push(bubble.animate([{ transform: bubbleAt() + ' scale(.9)', opacity: 0 }, { transform: bubbleAt(), opacity: 1 }], { duration: 220, easing: 'ease-out', fill: 'forwards' }));
      }
      runCues();
      var playing = env.speak ? !!env.speak() : false;
      if (voice && voice.isSpeaking && voice.isSpeaking() && isWelcome(voice.current && voice.current())) onVoiceStart();
      else if (!playing) silent(TIMING.silentTalk); // voice off or no recording: the visual greeting only
      else if (voice && voice.availability && voice.availability() === 'locked') locked();
      else silent(TIMING.lockedHold); // safety net: the clip never started and never said why
    }
    function onVoiceStart() {
      // A click that arrives after Dusty already went home just plays the line in the corner.
      if (finished || voiceStarted || !talking()) return;
      voiceStarted = true;
      clear(timers);
      runCues(); // the cues follow the voice from its first word
      later(ending, TIMING.maxTalk); // only if the clip never reports its end
    }
    function locked() {
      // The browser blocked sound before the first click (a browser rule for every website):
      // Dusty waits in the middle, and the first click or key press anywhere (on him too) starts
      // the line from the beginning. voice.js does that; there is no extra button.
      clear(timers); silent(TIMING.lockedHold);
    }
    function silent(ms) { later(function () { if (!voiceStarted) ending(); }, ms); }

    // ---- 3. After the last word: a laugh, then a wink ------------------------------
    function ending() {
      if (finished || !talking()) return;
      phase = 'laugh';
      clear(cueTimers); clear(timers);
      perform('laughing');
      later(function () {
        phase = 'wink';
        perform('happy');
        if (avatar && avatar.wink) avatar.wink(1, TIMING.wink - 60);
        later(leave, TIMING.wink);
      }, TIMING.laugh);
    }

    // ---- 4. Back to his corner, along the same curve --------------------------------
    function leave() {
      if (finished || phase === 'leave') return;
      var from = phase;
      phase = 'leave';
      clear(cueTimers); clear(timers);
      var ms = reduced ? TIMING.reducedBack : TIMING.back;
      var frames;
      if (reduced) frames = [{ transform: bigTransform(), opacity: 1 }, { transform: 'none', opacity: 1 }];
      else if (from === 'enter') {
        // Left the menu while he was still on his way: shrink straight back from where he is.
        var cur = win.getComputedStyle ? win.getComputedStyle(canvas).transform : null;
        frames = [{ transform: cur && cur !== 'none' ? cur : 'none' }, { transform: 'none' }];
      } else frames = travelFrames(geo, lay, true);
      var back = canvas.animate(frames, { duration: ms, easing: 'linear', fill: 'forwards' });
      cancel(anims); anims.push(back);
      if (bubble) {
        var bt = win.getComputedStyle ? win.getComputedStyle(bubble).transform : null;
        var fade = bubble.animate([{ transform: bt && bt !== 'none' ? bt : 'none', opacity: 1 }, { transform: bt && bt !== 'none' ? bt : 'none', opacity: 0 }], { duration: 160, fill: 'forwards' });
        cancel(bubbleAnims); bubbleAnims.push(fade);
      }
      perform('happy');
      if (avatar && avatar.lookAt) avatar.lookAt(0.6, 0.3, ms);
      later(done, ms + 20);
    }

    function done() {
      if (finished) return;
      finished = true; phase = 'done';
      clear(cueTimers); clear(timers);
      cancel(anims); cancel(bubbleAnims);
      canvas.style.transformOrigin = '';
      canvas.removeAttribute('data-dusty-scale');
      widget.classList.remove('dusty-intro');
      perform(null);
      // The normal bubble comes back softly in its usual place.
      if (bubble) bubble.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200 });
      unsub.forEach(function (fn) { try { fn(); } catch (e) { /* listener already removed */ } });
      unsub = [];
      win.removeEventListener('resize', onResize);
      if (env.onDone) env.onDone('done');
    }

    function onResize() { relayout(); }
    function relayout() {
      if (phase !== 'show' || finished) return;
      // Measure the companion without the transform, then place Dusty again. The target is an
      // absolute spot, so nothing moves unless the window really changed.
      cancel(anims); cancel(bubbleAnims);
      geo = measure(); lay = layout(geo);
      canvas.setAttribute('data-dusty-scale', String(Math.min(4, lay.scale).toFixed(2)));
      hold(canvas, bigTransform(), anims);
      if (bubble) hold(bubble, bubbleAt(), bubbleAnims, 1);
    }

    // ---- Voice --------------------------------------------------------------
    var isWelcome = function (item) { return !!item && item.id === VOICE_ID; };
    if (voice && voice.onSpeaking) {
      unsub.push(voice.onSpeaking(function (on, reason, item) {
        if (reason === 'initial') return;
        if (on && isWelcome(item)) onVoiceStart();
        else if (!on && isWelcome(item) && voiceStarted) ending(); // ended, stopped, paused or failed
      }));
    }
    if (voice && voice.onChange) {
      unsub.push(voice.onChange(function (status) {
        if (finished || voiceStarted || !talking()) return;
        if (status === 'locked') locked();
        else if (status === 'missing' || status === 'error' || status === 'unsupported' || status === 'off' || status === 'english-missing') {
          clear(timers); silent(TIMING.silentTalk);
        }
      }));
    }
    win.addEventListener('resize', onResize);

    enter();
    // The entrance never blocks the game: leaving the menu sends Dusty straight back.
    intro.check = function (state) { if (!finished && state !== 'title' && phase !== 'leave') leave(); };
    return intro;
  }

  root.DustyIntro = {
    TIMING: TIMING, CUES: CUES, VOICE_ID: VOICE_ID, layout: layout, start: start, travelFrames: travelFrames,
    hasRun: function () { return started; },
    active: function () { return current && current.phase() !== 'done' ? current : null; },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.DustyIntro;
})(typeof window !== 'undefined' ? window : globalThis);
