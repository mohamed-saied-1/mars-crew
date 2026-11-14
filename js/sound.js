// All sound is made in code with the Web Audio API, so there are no audio files.
// Effects: short tones and noise bursts. Loops: wind outside and a storm siren.
// Music: a soft, slow tune that changes between menus, day and night.
(function (root) {
  'use strict';

  var ctx = null, master, sfxBus, musicBus, windGain, habGain, noiseBuf;
  var on = { sfx: true, music: true };
  var musicState = { mode: 'menu', next: 0, step: 0 };
  var musicDucked = false;
  function musicLevel() { return on.music ? (musicDucked ? 0.34 : 0.5) : 0; }
  var sirenNext = 0, heartNext = 0;

  function start() {
    var hidden = typeof document !== 'undefined' && document.hidden;
    if (ctx) { if (ctx.state === 'suspended' && !hidden) ctx.resume(); return !hidden; }
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
    } catch (e) { return false; }
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = on.sfx ? 1 : 0; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = musicLevel(); musicBus.connect(master);
    // One second of white noise, reused for wind, steps and bursts.
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // Wind: looping noise through a low filter. Its volume follows the player outside.
    var src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
    windGain = ctx.createGain(); windGain.gain.value = 0;
    src.connect(lp); lp.connect(windGain); windGain.connect(sfxBus);
    src.start();
    // A very quiet two-note habitat hum gives indoor work a different acoustic space.
    habGain = ctx.createGain(); habGain.gain.value = 0; habGain.connect(sfxBus);
    [73.4, 110].forEach(function (freq, i) {
      var hum = ctx.createOscillator(), level = ctx.createGain();
      hum.type = i ? 'sine' : 'triangle'; hum.frequency.value = freq;
      level.gain.value = i ? 0.28 : 0.42;
      hum.connect(level); level.connect(habGain); hum.start();
    });
    // Music has its own timer, so a slow frame never makes it stutter.
    setInterval(tickMusic, 100);
    return true;
  }

  function now() { return ctx.currentTime; }

  // A single note. slide: end frequency. at: delay in seconds.
  function tone(freq, len, type, vol, slide, at, bus) {
    var t0 = now() + (at || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + len);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.05, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t0); o.stop(t0 + len + 0.02);
  }

  // A burst of filtered noise: steps, doors, wind gusts, explosions.
  function noise(len, vol, freq, type, sweep, at) {
    var t0 = now() + (at || 0);
    var s = ctx.createBufferSource(); s.buffer = noiseBuf;
    var f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq, t0); f.Q.value = 0.8;
    if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t0 + len);
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    s.connect(f); f.connect(g); g.connect(sfxBus);
    s.start(t0, Math.random() * 0.5); s.stop(t0 + len + 0.02);
  }

  function notes(list, type, vol, gap, len) {
    list.forEach(function (f, i) { tone(f, len || 0.18, type || 'square', vol || 0.045, null, i * (gap || 0.09)); });
  }

  var SFX = {
    click: function () { tone(880, 0.05, 'square', 0.025); },
    step: function () { noise(0.06, 0.05, 900, 'lowpass'); },
    stepOut: function () { noise(0.08, 0.06, 500, 'lowpass'); },
    door: function () { noise(0.45, 0.12, 300, 'bandpass', 2600); tone(180, 0.3, 'sine', 0.04, 120); },
    good: function () { tone(660, 0.07, 'square', 0.04); },
    bad: function () { tone(180, 0.12, 'sawtooth', 0.04, 140); },
    done: function () { notes([523, 784], 'square', 0.04, 0.07, 0.12); },
    science: function () { notes([784, 988, 1319], 'triangle', 0.06, 0.07, 0.2); },
    harvest: function () { notes([392, 523, 659], 'triangle', 0.06, 0.06, 0.16); noise(0.1, 0.05, 2000); },
    radio: function () { tone(1200, 0.06, 'square', 0.035); tone(1600, 0.06, 'square', 0.035, null, 0.08); noise(0.2, 0.025, 3000, 'highpass', null, 0.02); },
    flare: function () { tone(300, 0.7, 'sawtooth', 0.05, 1200); noise(0.6, 0.05, 800, 'bandpass', 4000); },
    storm: function () { tone(220, 0.8, 'sawtooth', 0.06, 110); noise(0.9, 0.06, 400, 'lowpass'); },
    clear: function () { notes([523, 659, 784], 'sine', 0.06, 0.1, 0.3); },
    broken: function () { tone(400, 0.12, 'square', 0.05, 200); tone(160, 0.35, 'sawtooth', 0.05, 90, 0.1); noise(0.2, 0.08, 1500, 'highpass'); },
    down: function () { notes([392, 330, 262, 196], 'triangle', 0.06, 0.16, 0.3); },
    saved: function () { notes([392, 523, 659, 784], 'triangle', 0.06, 0.08, 0.2); },
    meteor: function () { tone(1800, 1.2, 'sine', 0.05, 300); },
    boom: function () { noise(0.9, 0.3, 140, 'lowpass', 40); tone(70, 0.6, 'sine', 0.12, 35); },
    leak: function () { noise(1.2, 0.07, 5000, 'highpass'); tone(300, 0.3, 'sawtooth', 0.04, 240); },
    devil: function () { noise(1.6, 0.1, 600, 'bandpass', 2400); },
    hurt: function () { tone(150, 0.14, 'sawtooth', 0.05, 90); },
    dusk: function () { notes([659, 523, 392], 'sine', 0.05, 0.25, 0.6); },
    lost: function () { tone(500, 0.4, 'square', 0.03, 120); noise(0.4, 0.04, 2000, 'bandpass'); },
    win: function () { notes([523, 659, 784, 1047, 784, 1047], 'square', 0.05, 0.11, 0.22); },
    lose: function () { notes([392, 370, 349, 262], 'triangle', 0.06, 0.22, 0.4); },
    star: function () { tone(1319, 0.25, 'triangle', 0.07); tone(1976, 0.3, 'sine', 0.04, null, 0.05); },
    right: function () { notes([659, 988], 'square', 0.05, 0.1, 0.18); },
    wrong: function () { tone(220, 0.35, 'sawtooth', 0.045, 160); },
    page: function () { noise(0.12, 0.05, 3500, 'bandpass', 1500); },
  };

  function play(name) {
    if (!on.sfx || !SFX[name] || !start()) return;
    try { SFX[name](); } catch (e) { /* sound is optional */ }
  }

  // ---- Music -----------------------------------------------------------------
  // One tune at a time. Each mode is a short loop of chords. The bass plays the
  // chord's root and the melody only uses notes from the same chord, so the two
  // always fit together. When the mode changes, the old tune fades out first.
  var SONGS = {
    menu: { root: 220, beat: 0.5, chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [5, 9, 12]] },
    day: { root: 196, beat: 0.42, chords: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]] },
    night: { root: 174.6, beat: 0.6, chords: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [7, 10, 14]] },
    storm: { root: 146.8, beat: 0.32, chords: [[0, 3, 7], [0, 3, 7], [8, 12, 15], [7, 10, 14]] },
  };
  // Which beats of the 8-beat bar get a melody note, and which chord note (0-2, 3 = high root).
  var RHYTHM = [[0, 2], [2, 1], [3, 0], [4, 3], [6, 1], [7, 2]];
  var section = null; // the gain node of the tune that is playing now
  function semi(rootF, n) { return rootF * Math.pow(2, n / 12); }

  function music(mode) {
    if (mode === musicState.mode) return;
    musicState.mode = mode;
    if (!ctx) return;
    // Fade the old tune out and start the new one from its first bar.
    if (section) {
      var old = section;
      old.gain.setTargetAtTime(0, now(), 0.15);
      setTimeout(function () { try { old.disconnect(); } catch (e) { /* already gone */ } }, 1500);
    }
    section = null;
    musicState.step = 0;
    musicState.next = now() + 0.3;
  }

  function tickMusic() {
    if (!on.music || !ctx || ctx.state !== 'running' || musicState.mode === 'off') return;
    var sc = SONGS[musicState.mode] || SONGS.menu;
    if (!section) { section = ctx.createGain(); section.gain.value = 1; section.connect(musicBus); }
    if (musicState.next < now()) { musicState.next = now() + 0.05; musicState.step = 0; }
    // Plan a little ahead so notes never stutter.
    while (musicState.next < now() + 0.6) {
      var at = musicState.next - now(), s = musicState.step;
      var bar = Math.floor(s / 8), beat = s % 8;
      var chord = sc.chords[bar % sc.chords.length];
      // Bass: one long note per bar, ending before the next one starts.
      if (beat === 0) tone(semi(sc.root / 2, chord[0]), sc.beat * 7.6, 'sine', 0.05, null, at, section);
      // Melody: notes from the same chord, one at a time.
      for (var i = 0; i < RHYTHM.length; i++) {
        if (RHYTHM[i][0] !== beat) continue;
        var pick = (RHYTHM[i][1] + bar) % 4;
        var n = pick === 3 ? chord[0] + 12 : chord[pick];
        tone(semi(sc.root, n), sc.beat * 0.9, 'triangle', 0.028, null, at, section);
      }
      musicState.step = (s + 1) % (8 * sc.chords.length);
      musicState.next += sc.beat;
    }
  }

  // A hidden tab stays silent, so two open copies of the game never play together.
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function () {
      if (!ctx) return;
      if (document.hidden) ctx.suspend();
      else { ctx.resume(); musicState.next = 0; }
    });
  }

  // Called every frame. st: {outside, alert, low, mode}
  function update(st) {
    if (!ctx) return;
    var target = on.sfx && st.outside ? 0.05 + (st.dust ? 0.06 : 0) : 0;
    windGain.gain.setTargetAtTime(target, now(), 0.4);
    habGain.gain.setTargetAtTime(on.sfx && !st.outside && st.mode === 'day' ? 0.026 : 0, now(), 0.7);
    if (on.sfx && st.alert === 'active' && now() > sirenNext) {
      tone(660, 0.35, 'square', 0.03, 520); tone(520, 0.35, 'square', 0.03, 660, 0.38);
      sirenNext = now() + 1.6;
    }
    if (on.sfx && st.low && now() > heartNext) {
      tone(60, 0.12, 'sine', 0.12); tone(55, 0.12, 'sine', 0.1, null, 0.18);
      heartNext = now() + 1.1;
    }
    music(st.mode || 'menu');
  }

  function set(kind, value) {
    on[kind] = value;
    if (!ctx) return;
    if (kind === 'sfx') sfxBus.gain.setTargetAtTime(value ? 1 : 0, now(), 0.05);
    if (kind === 'music') musicBus.gain.setTargetAtTime(musicLevel(), now(), 0.2);
  }

  // Native speech uses the browser/OS audio path; this only gently lowers our music bus.
  function duckMusic(value) {
    musicDucked = !!value;
    if (ctx && musicBus) musicBus.gain.setTargetAtTime(musicLevel(), now(), 0.28);
  }

  // Browsers only allow sound after the player touches the page.
  function unlockOnce() {
    var go = function () { start(); root.removeEventListener('pointerdown', go); root.removeEventListener('keydown', go); };
    root.addEventListener('pointerdown', go);
    root.addEventListener('keydown', go);
  }

  // For checks: whether audio is running, and how far the music has been planned.
  function state() { return { audio: ctx ? ctx.state : 'none', music: musicState.mode, ahead: ctx ? +(musicState.next - ctx.currentTime).toFixed(2) : 0 }; }

  // The shared AudioContext (or null before the first sound), used by voice.js to measure
  // Dusty's voice loudness for mouth movement without creating a second context.
  function context() { return ctx; }
  root.Sound = { play: play, update: update, set: set, duckMusic: duckMusic, start: start, unlockOnce: unlockOnce, state: state, context: context, NAMES: Object.keys(SFX) };
})(typeof window !== 'undefined' ? window : globalThis);
