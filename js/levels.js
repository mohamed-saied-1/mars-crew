// Mars Academy: short solo levels. Each one teaches one idea with one job.
// A level is a normal game day with a few changed rules, a goal list and a quiz.
(function (root) {
  'use strict';

  var SolCrew = root.SolCrew || (typeof require !== 'undefined' && require('./game.js'));
  var RULES = SolCrew.RULES;

  // Calm, short days with no surprises unless the level adds them.
  function rules(extra) {
    return Object.assign({ sols: 1, dayLen: 110, meteors: 0, leak: 0, devil: 0, failChance: 0, science: 0, hints: true, suit: 75 }, extra || {});
  }
  function did(g, action) { return Object.keys(g.lv.did[action] || {}).length; }
  function count(g, action) { return g.lv.count[action] || 0; }
  function firstTime(g, action) {
    var d = g.lv.did[action] || {}, best = Infinity;
    Object.keys(d).forEach(function (k) { best = Math.min(best, d[k]); });
    return best;
  }
  function fast(sec) { return { key: 'ls_fast', vars: { s: sec }, ok: function (g) { return g.time <= sec; } }; }

  // The real NASA DONKI flare used by the storm levels (X1.5 on 3 Feb 2026).
  var STORM_DAY = { season: 'feb2026', day: '2026-02-03' };

  var LIST = [
    // ---- Engineer: power -----------------------------------------------------
    {
      id: 'eng1', card: 'cleaning', role: 'engineer', lab: 'power', track: ['clean'],
      diff: rules({ dayLen: 110 }),
      setup: function (g) { g.panels[0].dust = 0.55; g.panels[1].dust = 0.7; g.panels[2].dust = 0.85; },
      goals: [{ key: 'lg_clean', of: 3, n: function (g) { return g.panels.filter(function (p) { return p.dust < 0.08; }).length; } }],
      star2: fast(70),
    },
    {
      id: 'eng2', card: 'cold', role: 'engineer', lab: 'night', track: ['repair'], plan: true, early: false,
      diff: rules({ dayLen: 50 }),
      setup: function (g) {
        g.power.battery = 0;
        g.panels.forEach(function (p) { p.dust = 0.3; });
        g.devices.lights = false;
      },
      goals: [
        { key: 'lg_fix_lights', n: function (g) { return g.devices.lights ? 1 : 0; } },
        { key: 'lg_night', n: function (g) { return g.nightDone ? (g.stats.coldNights === 0 ? 1 : 0) : (g.leftover() >= RULES.nightNeed ? 1 : 0); } },
      ],
      star2: { key: 'ls_air3', ok: function (g) { return g.alloc.life >= 3; } },
    },
    {
      id: 'eng3', card: 'meteorite', role: 'engineer', lab: 'meteor', track: ['clean'],
      diff: rules({ dayLen: 130 }),
      hazards: [12, 24, 36, 48, 60, 72, 84].map(function (t) { return { type: 'meteor', t: t }; }),
      setup: function (g) { g.panels.forEach(function (p) { p.dust = 0.6; }); },
      goals: [{ key: 'lg_clean_any', of: 3, n: function (g) { return did(g, 'clean'); } }],
      star2: { key: 'ls_no_hit', ok: function (g) { return g.stats.meteorHits === 0; } },
    },

    // ---- Farmer: food and air --------------------------------------------------
    {
      id: 'far1', card: 'lettuce', role: 'farmer', lab: 'plants', track: ['plant'],
      diff: rules(),
      setup: function (g) {
        g.water = 40;
        g.plots.forEach(function (p) { p.state = 'empty'; p.grow = 0; p.dry = 0; });
      },
      goals: [{ key: 'lg_plant', of: 4, n: function (g) { return g.plots.filter(function (p) { return p.state !== 'empty'; }).length; } }],
      star2: fast(60),
    },
    {
      id: 'far2', card: 'thinAir', role: 'farmer', lab: 'ice', track: ['drill', 'water'],
      diff: rules({ dayLen: 170 }),
      setup: function (g) {
        g.water = 2;
        g.plots.forEach(function (p) { p.state = 'growing'; p.grow = 0.3; p.dry = 0.6; });
        g.lv.minSuit = 100;
      },
      tick: function (g) { g.lv.minSuit = Math.min(g.lv.minSuit, g.me().suit); },
      goals: [
        { key: 'lg_drill', n: function (g) { return did(g, 'drill'); } },
        { key: 'lg_water', of: 4, n: function (g) { return did(g, 'water'); } },
      ],
      star2: { key: 'ls_suit', ok: function (g) { return g.lv.minSuit >= 25; } },
    },
    {
      id: 'far3', card: 'leak', role: 'farmer', lab: 'leak', track: ['patch', 'harvest'],
      diff: rules({ dayLen: 120 }),
      hazards: [{ type: 'leak', t: 14, spot: 0 }],
      setup: function (g) {
        g.alloc.green = 3;
        g.plots.forEach(function (p, i) { p.state = i < 2 ? 'ripe' : 'growing'; p.grow = i < 2 ? 1 : 0.8; p.dry = 0; p.crop = 'lettuce'; });
        g.lv.leakTime = 0;
      },
      tick: function (g, dt) { if (g.dyn.leak) g.lv.leakTime += dt; },
      goals: [
        { key: 'lg_patch', n: function (g) { return did(g, 'patch'); } },
        { key: 'lg_harvest', of: 3, n: function (g) { return count(g, 'harvest'); } },
      ],
      star2: { key: 'ls_leak_fast', ok: function (g) { return g.lv.leakTime < 20; } },
    },

    // ---- Doctor: radiation and health -------------------------------------------
    {
      id: 'doc1', card: 'shelter', role: 'doctor', lab: 'radiation', track: ['fillwall'],
      diff: rules(),
      setup: function (g) { g.wall = 10; g.water = 60; },
      goals: [{ key: 'lg_wall', of: 45, n: function (g) { return Math.floor(g.wall); } }],
      star2: fast(75),
    },
    {
      id: 'doc2', card: 'storm2024', role: 'doctor', lab: 'health', season: STORM_DAY.season, day: STORM_DAY.day,
      flare: { hit: true, at: 6 }, track: [],
      diff: rules({ dayLen: 100, protonDelay: 30, doseScale: 0.8 }),
      setup: function (g) {
        var c = g.me();
        c.x = 31.5; c.y = 9.5; c.zone = 'outside';
        g.lv.exposed = 0; g.lv.dose0 = c.dose;
      },
      tick: function (g, dt) { if (g.storm && g.storm.stage === 'active' && g.me().zone !== 'shelter') g.lv.exposed += dt; },
      fail: function (g) { return g.lv.exposed >= 6 ? 'lf_exposed' : null; },
      goals: [{ key: 'lg_shelter', n: function (g) { return g.storm && g.storm.stage === 'done' && g.lv.exposed < 6 ? 1 : 0; } }],
      star2: { key: 'ls_dose', ok: function (g) { return g.me().dose - g.lv.dose0 < 8; } },
    },
    {
      id: 'doc3', card: 'mars520', role: 'doctor', lab: 'help', track: ['revive'],
      diff: rules({ dayLen: 100 }),
      hazards: [{ type: 'devil', t: 8 }],
      setup: function (g) {
        var e = g.crew.engineer;
        e.x = 25.5; e.y = 9.5; e.zone = 'outside';
        g.hurt(e, 500, 'meteor');
      },
      fail: function (g) { return g.crew.engineer.resting && !did(g, 'revive') ? 'lf_rescue' : null; },
      goals: [
        { key: 'lg_revive', n: function (g) { return did(g, 'revive'); } },
        { key: 'lg_inside', n: function (g) { return did(g, 'revive') && g.me().zone !== 'outside' ? 1 : 0; } },
      ],
      star2: { key: 'ls_save_fast', ok: function (g) { return firstTime(g, 'revive') <= 18; } },
    },

    // ---- Mission Control: the Sun and the radio ----------------------------------
    {
      id: 'ctl1', card: 'delay', role: 'earth', lab: 'delay', season: STORM_DAY.season, day: STORM_DAY.day,
      flare: { hit: true, at: 8 }, track: ['warn'],
      diff: rules({ dayLen: 110, protonDelay: 40 }),
      fail: function (g) { return g.storm && g.storm.stage === 'active' && g.storm.warnedAtBase == null ? 'lf_late' : null; },
      goals: [
        { key: 'lg_warn', n: function (g) { return g.storm && g.storm.warned ? 1 : 0; } },
        { key: 'lg_arrive', n: function (g) { return g.storm && g.storm.warnedAtBase != null ? 1 : 0; } },
      ],
      star2: { key: 'ls_warn_fast', ok: function (g) { return firstTime(g, 'warn') - g.storm.tFlare <= 12; } },
    },
    {
      id: 'ctl2', card: 'opportunity', role: 'earth', lab: 'dust', track: ['forecast', 'study'],
      diff: rules({ dayLen: 120 }),
      setup: function (g) {
        // Two packets of rock data are already flying from Mars to Earth.
        [4, 16].forEach(function (s) { g.inFlight.push({ to: 'earth', kind: 'data', payload: { value: 1 }, sentAt: 0, arrive: g.delay + s }); });
      },
      goals: [
        { key: 'lg_forecast', n: function (g) { return did(g, 'forecast'); } },
        { key: 'lg_study', of: 2, n: function (g) { return count(g, 'study'); } },
      ],
      star2: fast(70),
    },
    {
      id: 'ctl3', card: 'marsTime', role: 'earth', lab: 'twin', track: ['twintest'],
      diff: rules({ dayLen: 120 }),
      setup: function (g) { g.devices.recycler = false; g.parts = 0; },
      goals: [
        { key: 'lg_twin', n: function (g) { return did(g, 'twintest'); } },
        { key: 'lg_fixed', n: function (g) { return g.devices.recycler ? 1 : 0; } },
      ],
      star2: { key: 'ls_air', vars: { n: 60 }, ok: function (g) { return g.life >= 60; } },
    },
  ];

  var ROLE_ORDER = ['engineer', 'farmer', 'doctor', 'earth'];
  var byId = {};
  LIST.forEach(function (L) { byId[L.id] = L; L.season = L.season || 'aug2026'; });

  var Levels = {
    LIST: LIST,
    ROLES: ROLE_ORDER,
    get: function (id) { return byId[id] || null; },
    forRole: function (role) { return LIST.filter(function (L) { return L.role === role; }); },
    next: function (id) {
      var L = byId[id], list = Levels.forRole(L.role), i = list.indexOf(L);
      return list[i + 1] || null;
    },
    // A level opens when the one before it in the same job has at least one star.
    open: function (id, stars) {
      var L = byId[id], list = Levels.forRole(L.role), i = list.indexOf(L);
      return i === 0 || (stars[list[i - 1].id] || 0) > 0;
    },
    // Finishing every level of a job makes you its expert in crew missions.
    expert: function (role, stars) {
      return Levels.forRole(role).every(function (L) { return (stars[L.id] || 0) > 0; });
    },
  };

  root.Levels = Levels;
  if (typeof module !== 'undefined') module.exports = Levels;
})(typeof window !== 'undefined' ? window : globalThis);
