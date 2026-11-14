// Local, lazy-loaded Dusty recordings. Text remains visible when audio is unavailable.
(function (root) {
  'use strict';

  function create(env, manifest) {
    env = env || root;
    // One private manifest per language. Arabic starts with the bundled pack; other entries (English
    // clips, crater clips) are added only through register(), and only for confirmed recordings.
    manifest = Object.assign({}, manifest || env.DUSTY_VOICE_MANIFEST || {});
    var manifests = { ar: manifest, en: {} };
    function hasLang() { return !!manifests[lang] && Object.keys(manifests[lang]).length > 0; }
    // Status when the current language has no recordings at all.
    function emptyStatus() { return lang === 'en' ? 'english-missing' : 'missing'; }
    function entryFor(id) { var e = manifests[lang] && manifests[lang][id]; return e && e.language === lang && typeof e.src === 'string' ? e : null; }
    var AudioCtor = env.Audio || null;
    var queue = [], active = null, pendingUnlock = null, enabled = true, lang = 'en', volume = 1;
    var recent = Object.create(null), listeners = [], speakingListeners = [];
    var speaking = false, status = AudioCtor ? 'english-missing' : 'unsupported', serial = 0, last = null, maxQueue = 4;

    function notify() { listeners.slice().forEach(function (fn) { try { fn(status); } catch (e) {} }); }
    function setSpeaking(value, reason, item) {
      if (speaking === value) return;
      speaking = value;
      speakingListeners.slice().forEach(function (fn) { try { fn(value, reason || (value ? 'start' : 'end'), item || null); } catch (e) {} });
    }
    function setStatus(value) { if (status !== value) { status = value; notify(); } }

    // ---- Loudness for Dusty's mouth --------------------------------------------
    // The recording is routed through an AnalyserNode only when that cannot silence it:
    // the page is served over http(s) (file:// media would be CORS-muted inside Web Audio)
    // and the game's AudioContext is already running. Otherwise level() returns null and
    // the avatar falls back to a gentle talking rhythm while the clip is playing.
    function analysisContext() {
      var loc = env.location, sound = env.Sound;
      if (!loc || !/^https?:$/.test(loc.protocol || '')) return null;
      var ctx = sound && sound.context ? sound.context() : null;
      if (!ctx || ctx.state !== 'running' || !ctx.createMediaElementSource || !ctx.createAnalyser) return null;
      return ctx;
    }
    function attachAnalysis(audio) {
      var ctx = analysisContext();
      if (!ctx) return null;
      var source;
      try { source = ctx.createMediaElementSource(audio); } catch (e) { return null; }
      try {
        var analyser = ctx.createAnalyser();
        analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.2;
        source.connect(analyser); analyser.connect(ctx.destination);
        return { source: source, analyser: analyser, data: new Uint8Array(analyser.fftSize) };
      } catch (e) {
        try { source.connect(ctx.destination); } catch (err) { /* keep playback audible */ }
        return { source: source, analyser: null, data: null };
      }
    }
    // ---- Loudness curve of a recording (lip-sync) -------------------------------
    // The clip file is decoded once (offline, no sound, no user gesture needed) into its loudness
    // every 20 ms. While the clip plays, level() reads the curve at the audio's current time, so
    // Dusty's mouth opens on the real syllables and closes in the pauses, in Arabic and English.
    var envelopes = Object.create(null), STEP = 0.02;
    function loadEnvelope(src) {
      if (!src || envelopes[src]) return;
      var Offline = env.OfflineAudioContext || env.webkitOfflineAudioContext;
      if (!env.fetch || !Offline) { envelopes[src] = { failed: true }; return; }
      envelopes[src] = { pending: true };
      env.fetch(src).then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.arrayBuffer(); }).then(function (bytes) {
        var ctx = new Offline(1, 1, 44100);
        return new Promise(function (ok, no) { var p = ctx.decodeAudioData(bytes, ok, no); if (p && p.then) p.then(ok, no); });
      }).then(function (buf) {
        var per = Math.max(1, Math.round(buf.sampleRate * STEP)), n = Math.ceil(buf.length / per), out = new Float32Array(n);
        var chans = []; for (var ch = 0; ch < buf.numberOfChannels; ch++) chans.push(buf.getChannelData(ch));
        for (var i = 0; i < n; i++) {
          var sum = 0, from = i * per, to = Math.min(buf.length, from + per);
          for (var j = from; j < to; j++) { var v = 0; for (var c = 0; c < chans.length; c++) v += chans[c][j]; v /= chans.length; sum += v * v; }
          out[i] = Math.sqrt(sum / Math.max(1, to - from));
        }
        // Loud speech (the 95th percentile) maps to a wide-open mouth; silence stays closed.
        var sorted = Array.prototype.slice.call(out).sort(function (a, b) { return a - b; });
        var loud = sorted[Math.floor(sorted.length * 0.95)] || 1;
        for (var k = 0; k < n; k++) out[k] = Math.min(0.2, out[k] / loud * 0.16);
        envelopes[src] = { data: out };
      }).catch(function () { envelopes[src] = { failed: true }; });
    }
    function envelopeLevel() {
      var e = active && envelopes[active.src];
      if (!e || !e.data) return null;
      var at = Number(active.audio.currentTime) || 0;
      var i = Math.min(e.data.length - 1, Math.max(0, Math.floor(at / STEP)));
      return e.data[i];
    }
    function detachAnalysis(entry) {
      if (!entry || !entry.analysis) return;
      var a = entry.analysis; entry.analysis = null;
      try { a.source.disconnect(); } catch (e) { /* already disconnected */ }
      try { if (a.analyser) a.analyser.disconnect(); } catch (e) { /* already disconnected */ }
    }
    // 0..1 loudness of the clip that is playing, or null when it cannot be measured.
    function level() {
      if (!active || !speaking) return null;
      if (!active.analysis || !active.analysis.analyser) return envelopeLevel();
      var a = active.analysis, sum = 0;
      a.analyser.getByteTimeDomainData(a.data);
      for (var i = 0; i < a.data.length; i++) { var v = (a.data[i] - 128) / 128; sum += v * v; }
      return Math.min(1, Math.sqrt(sum / a.data.length) / Math.max(0.05, volume));
    }

    function cancelActive(reason) {
      if (!active) return;
      var old = active; active = null; serial++;
      old.audio.onended = old.audio.onerror = old.audio.onplay = old.audio.onpause = null;
      try { old.audio.pause(); old.audio.currentTime = 0; } catch (e) { /* not loaded yet */ }
      detachAnalysis(old);
      setSpeaking(false, reason || 'cancel', old.item);
    }
    function removeUnlockListeners() {
      if (!env.removeEventListener) return;
      env.removeEventListener('pointerdown', unlock);
      env.removeEventListener('keydown', unlock);
    }
    function installUnlockListeners() {
      if (!env.addEventListener) return;
      env.addEventListener('pointerdown', unlock);
      env.addEventListener('keydown', unlock);
    }
    function expireQueue() {
      var now = Date.now();
      queue = queue.filter(function (item) { return item.expiresAt > now; });
    }
    function finish(item, token) {
      if (!active || active.token !== token) return;
      var old = active; active = null;
      detachAnalysis(old);
      setSpeaking(false, 'end', item);
      setStatus('ready');
      drain();
    }
    function startItem(item) {
      if (!enabled || !hasLang() || !AudioCtor || item.expiresAt <= Date.now()) return false;
      var entry = entryFor(item.id);
      if (!entry) { setStatus('missing'); return false; }
      var audio, token = ++serial;
      try {
        audio = new AudioCtor();
        audio.preload = 'none';
        audio.src = entry.src;
        audio.volume = volume;
      } catch (e) { setStatus('error'); return false; }
      active = { audio: audio, item: item, token: token, src: entry.src, analysis: attachAnalysis(audio) };
      loadEnvelope(entry.src);
      audio.onplay = function () {
        if (active && active.token === token) { last = item; setStatus('playing'); setSpeaking(true, 'start', item); }
      };
      audio.onended = function () { finish(item, token); };
      audio.onerror = function () {
        if (!active || active.token !== token) return;
        var old = active; active = null; detachAnalysis(old);
        setSpeaking(false, 'error', item); setStatus('error'); drain();
      };
      // Paused from outside the game (media keys, system controls): end this clip so the
      // mouth stops and later lines are not stuck behind it.
      audio.onpause = function () {
        if (!active || active.token !== token || audio.ended) return;
        var old = active; active = null; detachAnalysis(old);
        setSpeaking(false, 'pause', item); setStatus('ready');
      };
      try {
        var result = audio.play();
        if (result && typeof result.then === 'function') result.then(function () {
          if (active && active.token === token) { last = item; setStatus('playing'); setSpeaking(true, 'start', item); }
        }).catch(function (error) {
          if (!active || active.token !== token) return;
          var old = active; active = null; detachAnalysis(old);
          try { audio.pause(); } catch (e) { /* optional */ }
          if (error && (error.name === 'NotAllowedError' || error.name === 'AbortError')) {
            pendingUnlock = item; setStatus('locked'); installUnlockListeners();
          } else { setStatus('error'); drain(); }
        });
        else { last = item; setStatus('playing'); setSpeaking(true, 'start', item); }
      } catch (error) {
        if (active) detachAnalysis(active);
        active = null;
        if (error && error.name === 'NotAllowedError') { pendingUnlock = item; setStatus('locked'); installUnlockListeners(); }
        else { setStatus('error'); drain(); }
      }
      return true;
    }
    function drain() {
      if (active || pendingUnlock || !enabled || !hasLang()) return;
      expireQueue();
      queue.sort(function (a, b) { return b.priority - a.priority || a.order - b.order; });
      while (queue.length) {
        var item = queue.shift();
        if (startItem(item)) return;
      }
      if (hasLang() && status !== 'error' && status !== 'missing') setStatus('ready');
    }
    function unlock() {
      if (!pendingUnlock || !enabled || !hasLang()) return false;
      var item = pendingUnlock; pendingUnlock = null;
      removeUnlockListeners();
      if (startItem(item)) return true;
      // The waiting line expired: leave the "locked" state and play whatever is still queued.
      if (status === 'locked') setStatus('ready');
      drain();
      return false;
    }
    // maxPriority (optional): only lines at or below this priority are replaced, so a routine
    // line can never cut off a more urgent warning in the same group.
    function cancelGroup(group, suppressDrain, maxPriority) {
      var limit = maxPriority == null ? Infinity : maxPriority;
      queue = queue.filter(function (item) { return item.group !== group || item.priority > limit; });
      if (pendingUnlock && pendingUnlock.group === group && pendingUnlock.priority <= limit) pendingUnlock = null;
      if (active && active.item.group === group && active.item.priority <= limit) cancelActive('context');
      if (!suppressDrain) drain();
    }
    function play(id, options) {
      options = options || {};
      if (!enabled || !hasLang() || !AudioCtor) {
        setStatus(!enabled ? 'off' : !AudioCtor ? 'unsupported' : emptyStatus());
        return false;
      }
      var entry = entryFor(id);
      if (!entry) { setStatus('missing'); return false; }
      var now = Date.now(), dedupeKey = String(options.dedupeKey || options.key || id);
      Object.keys(recent).forEach(function (key) { if (now - recent[key] > 20000) delete recent[key]; });
      if (!options.force && recent[dedupeKey] && now - recent[dedupeKey] < (options.cooldown || 7000)) return false;
      recent[dedupeKey] = now;
      var item = {
        id: id, text: String(options.text || ''), priority: Number(options.priority == null ? entry.priority : options.priority),
        emotion: options.emotion || entry.emotion, group: options.group || '', context: options.context || '',
        expiresAt: now + Math.max(1000, Number(options.ttl) || 9000), order: serial++, dedupeKey: dedupeKey,
      };
      if (options.replaceGroup && item.group) cancelGroup(item.group, true, item.priority);
      if (pendingUnlock) {
        if (item.priority > pendingUnlock.priority) pendingUnlock = item;
        return item.priority > pendingUnlock.priority || pendingUnlock === item;
      }
      if (active && active.item.dedupeKey === item.dedupeKey) return false;
      if (active && item.priority > active.item.priority) {
        cancelActive('preempt');
        queue = queue.filter(function (queued) { return queued.priority >= item.priority; });
      }
      if (item.priority >= 90) queue = queue.filter(function (queued) { return queued.priority >= item.priority; });
      queue.push(item);
      if (queue.length > maxQueue) {
        var lowest = queue.reduce(function (at, candidate, i, list) { return candidate.priority < list[at].priority ? i : at; }, 0);
        queue.splice(lowest, 1);
      }
      setStatus('ready');
      drain();
      return true;
    }
    function stop() {
      queue = []; pendingUnlock = null; removeUnlockListeners(); cancelActive('cancel');
      setStatus(!enabled ? 'off' : !AudioCtor ? 'unsupported' : hasLang() ? 'ready' : emptyStatus());
    }
    function replay() {
      if (!last) return false;
      var old = last;
      return play(old.id, { text: old.text, priority: old.priority, emotion: old.emotion, group: old.group, context: old.context, dedupeKey: old.dedupeKey, force: true });
    }
    function setEnabled(value) {
      enabled = !!value;
      if (!enabled) stop();
      else { setStatus(!AudioCtor ? 'unsupported' : hasLang() ? 'ready' : emptyStatus()); drain(); }
      notify();
    }
    function setLanguage(value) {
      var next = value === 'ar' ? 'ar' : 'en';
      if (next === lang) return;
      stop(); lang = next; setStatus(!AudioCtor ? 'unsupported' : hasLang() ? 'ready' : emptyStatus());
    }
    function setVolume(value) {
      volume = Math.max(0, Math.min(1, Number(value) || 0));
      if (active) active.audio.volume = volume;
      return volume;
    }
    function onChange(fn) { if (typeof fn === 'function') { listeners.push(fn); fn(status); } return function () { listeners = listeners.filter(function (x) { return x !== fn; }); }; }
    function onSpeaking(fn) { if (typeof fn === 'function') { speakingListeners.push(fn); fn(speaking, 'initial'); } return function () { speakingListeners = speakingListeners.filter(function (x) { return x !== fn; }); }; }

    if (env.document && env.document.addEventListener) env.document.addEventListener('visibilitychange', function () { if (env.document.hidden) stop(); });
    return {
      play: play, stop: stop, cancel: stop, replay: replay,
      setEnabled: setEnabled, isEnabled: function () { return enabled; }, setLanguage: setLanguage,
      setVolume: setVolume, getVolume: function () { return volume; },
      isSupported: function () { return !!AudioCtor; }, availability: function () { return status; },
      onChange: onChange, onSpeaking: onSpeaking, isSpeaking: function () { return speaking; },
      queueLength: function () { return queue.length + (pendingUnlock ? 1 : 0); }, hasReplay: function () { return !!last; },
      // Adds explicit entries ({ id: { src, language, ... } }) from another manifest. Only entries
      // that are confirmed recordings should be passed in; ids already present are not replaced.
      register: function (entries) { var n = 0; Object.keys(entries || {}).forEach(function (id) { var e = entries[id], l = e && (e.language || 'ar'); if (e && typeof e.src === 'string' && manifests[l] && !manifests[l][id]) { manifests[l][id] = e; n++; if (l === lang && status === 'english-missing') setStatus('ready'); } }); return n; },
      // Whether a clip exists for this id in the current language, and whether a language has any clips.
      has: function (id) { return !!entryFor(id); }, hasLanguage: function (l) { var m = manifests[l || lang]; return !!m && Object.keys(m).length > 0; },
      current: function () { return active ? active.item : null; }, level: level,
      // Reads a clip's loudness curve ahead of time, so the mouth is in sync from the first word.
      prepare: function (id) { var e = entryFor(id); if (e) loadEnvelope(e.src); return !!e; },
      hasLipSync: function (id) { var e = entryFor(id), c = e && envelopes[e.src]; return !!(c && c.data); }, isAnalysing: function () { return !!(active && active.analysis && active.analysis.analyser); },
      cancelGroup: function (group, suppressDrain) { cancelGroup(group, suppressDrain); }, unlock: unlock, manifest: manifest,
    };
  }

  var api = create(root, root.DUSTY_VOICE_MANIFEST);
  api.create = create;
  root.Voice = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
