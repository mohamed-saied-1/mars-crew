// Dusty the robot teaches the game as you play: short tips, and a lesson the
// first time a player starts a job. Nothing here changes the rules.
//
// Lessons follow the player's own job. A lesson is skipped when that player
// has already seen it on this visit, or learned it in the Mars Academy.
// Solo play pauses for the full lesson. In a crew mission a lesson appears only
// in that player's own view, so the others keep playing.
(function (root) {
  'use strict';

  var t = function (k, v) { return root.I18N.t(k, v); };
  // Per player slot, for this visit to the page. A new child on a shared
  // classroom computer sees the lessons again after a reload.
  var seen = {};
  var tips = {};        // per mission
  var banners = {};     // player id -> {lab, kind, age}
  var BANNER_LIFE = 11;

  // The lesson that explains each job.
  var TASK_LESSON = {
    clean: 'power', drill: 'ice', plant: 'plants', water: 'plants', harvest: 'plants',
    fillwall: 'radiation', checkup: 'health', rest: 'health', patch: 'leak', revive: 'help',
    warn: 'delay', upload: 'delay', study: 'delay', forecast: 'dust', twintest: 'twin', sample: 'suit',
  };

  function reset() { tips = {}; banners = {}; }
  function snapshot() { return { tips: JSON.parse(JSON.stringify(tips)), banners: JSON.parse(JSON.stringify(banners)) }; }
  function restore(value) { tips = value && value.tips ? JSON.parse(JSON.stringify(value.tips)) : {}; banners = value && value.banners ? JSON.parse(JSON.stringify(value.banners)) : {}; }

  function tip(app, key, vars) {
    if (tips[key]) return;
    tips[key] = true;
    app.say('base', t(key, vars), 'info', 'dusty');
    app.say('earth', t(key, vars), 'info', 'dusty');
    var voiceId = key === 'dusty_walk' ? 'dusty_follow_arrow' : key === 'dusty_press' ? 'dusty_interact' : null;
    if (voiceId && app.playVoice) app.playVoice(voiceId, t(key, vars), { priority: 45, emotion: 'guiding', dedupeKey: 'tutorial:' + key, group: 'guidance', ttl: 12000, replaceGroup: true });
  }

  function roleOf(g, p) { return p.roles[p.active]; }

  // True when this job's Academy level that teaches `lab` has a star on this device.
  function learned(app, role, lab) {
    return root.Levels.LIST.some(function (L) { return L.lab === lab && L.role === role && (app.stars[L.id] || 0) > 0; });
  }

  function mark(p, lab) {
    var s = seen[p.id] = seen[p.id] || {};
    if (s[lab]) return false;
    s[lab] = true;
    return true;
  }

  // Teach one player, at the moment the lesson matters to them.
  function teach(app, g, p, lab) {
    if (!p || g.level || !g.diff.hints) return;
    if (!mark(p, lab)) return;
    if (learned(app, roleOf(g, p), lab)) {
      // They already know it. In a group they can explain it instead.
      if (g.players.length > 1 || app.settings.classroom) banners[p.id] = { lab: lab, kind: 'teach', age: 0 };
      return;
    }
    if (g.players.length === 1) app.openLearn(lab);
    else banners[p.id] = { lab: lab, kind: 'learn', age: 0 };
  }

  // Something that hits the whole crew at once: one pause for everyone who still needs it.
  function teachCrew(app, g, lab, who) {
    if (g.level || !g.diff.hints) return;
    var need = g.players.filter(function (p) { return who(roleOf(g, p)) && !(seen[p.id] || {})[lab]; });
    if (!need.length) return;
    need.forEach(function (p) { mark(p, lab); });
    var fresh = need.filter(function (p) { return !learned(app, roleOf(g, p), lab); });
    if (fresh.length) app.openLearn(lab);
    else need.forEach(function (p) { if (g.players.length > 1) banners[p.id] = { lab: lab, kind: 'teach', age: 0 }; });
  }

  function playerOf(g, role) {
    return g.players.filter(function (p) { return roleOf(g, p) === role; })[0] || null;
  }

  // Called when the game reaches each morning plan. The plan is shared, so it may pause.
  function onPlan(app, g) {
    var all = function () { return true; };
    teachCrew(app, g, 'power', all);
    if (app.modal) return;
    if (g.dustStorm > 0) teachCrew(app, g, 'dust', all);
    if (app.modal) return;
    if (g.sol >= 2) teachCrew(app, g, 'night', all);
  }

  function onMars(role) { return role !== 'earth'; }

  function onEvent(app, g, e) {
    if (!g.diff.hints || g.level) return;
    if (e.type === 'miniDone' && !tips.first) { tips.first = true; tip(app, 'dusty_good'); }
    if (e.type === 'miniStart' && TASK_LESSON[e.action]) teach(app, g, playerOf(g, e.role), TASK_LESSON[e.action]);
    if (e.type === 'hurt' && e.why !== 'test') teach(app, g, playerOf(g, e.role), 'health');
    if (e.type === 'stormHit') teachCrew(app, g, 'radiation', onMars);
    if (e.type === 'radioIn') teachCrew(app, g, 'delay', onMars);
    if (e.type === 'meteorWarn') {
      g.players.forEach(function (p) { if (g.crew[roleOf(g, p)].zone === 'outside') teach(app, g, p, 'meteor'); });
    }
  }

  // Called every frame during the day.
  function update(app, g, dt) {
    // A banner waits while its player is busy with a mini-game, so it is not missed.
    g.players.forEach(function (p) {
      var b = banners[p.id];
      if (!b || g.crew[roleOf(g, p)].mini) return;
      b.age += dt || 0;
      if (b.age > BANNER_LIFE) delete banners[p.id];
    });
    if (!g.diff.hints) return;
    if (!tips.walk) {
      tips.walk = true;
      tip(app, 'dusty_walk', { move: root.Input.label(0).move.split(' / ')[0] });
    }
    g.players.forEach(function (p) {
      var c = g.crew[roleOf(g, p)];
      if (c.zone === 'outside') teach(app, g, p, 'suit');
      var availableAction = c.near && g.stationAction(c.near, c);
      if (availableAction && !availableAction.blocked && !tips.press) { tip(app, 'dusty_press', { key: root.Input.actKey(p.id) }); }
    });
    if (g.life < 30) tip(app, 'dusty_low_air');
    if (g.t / g.dayLen > 0.8) tip(app, 'dusty_night');
  }

  // The lesson text without its "try the slider" part, for a banner with no experiment.
  function shortLesson(lab) {
    var parts = t('learn_' + lab).split(/(?<=[.!?؟])\s+/);
    var keep = parts.filter(function (s) { return !/\b(try|move the slider|press the button)\b|جرّب|حرّك|اضغط/i.test(s); });
    return (keep.length ? keep : parts).join(' ');
  }

  function bannerFor(id) {
    var b = banners[id];
    if (!b) return null;
    return {
      title: t('learn_' + b.lab + '_t'),
      text: b.kind === 'teach' ? t('lesson_teach') : shortLesson(b.lab) + ' ' + t('lesson_more'),
      kind: b.kind, age: b.age, life: BANNER_LIFE,
    };
  }

  root.Guide = { reset: reset, snapshot: snapshot, restore: restore, onPlan: onPlan, onEvent: onEvent, update: update, bannerFor: bannerFor, learned: learned, TASK_LESSON: TASK_LESSON, shortLesson: shortLesson };
})(typeof window !== 'undefined' ? window : globalThis);
