// All game rules. No DOM and no drawing, so tests can play full missions headless.
(function (root) {
  'use strict';

  var NASA = root.NASA || (typeof require !== 'undefined' && require('./data.js'));
  var World = root.World || (typeof require !== 'undefined' && require('./world.js'));
  var Mini = root.Mini || (typeof require !== 'undefined' && require('./minigames.js'));

  var ROLES = ['engineer', 'farmer', 'doctor', 'earth'];
  var DIALS = ['life', 'green', 'shield', 'science'];
  var DIAL_OWNER = { life: 'engineer', green: 'farmer', shield: 'doctor', science: 'earth' };
  var DIAL_MAX = 5;

  // Game balance. Tuned with tests/balance.js.
  var DIFFICULTY = {
    cadet: { sols: 5, dayLen: 150, delayScale: 0.6, doseScale: 0.55, dustScale: 0.7, failChance: 0.25, science: 8, hints: true, season: 'aug2026', protonDelay: 55, lifeUse: 34, suit: 75, meteors: 1, leak: 0.35, devil: 0.4 },
    engineer: { sols: 6, dayLen: 140, delayScale: 0.8, doseScale: 0.8, dustScale: 1, failChance: 0.45, science: 10, hints: true, season: 'jan2025', protonDelay: 48, lifeUse: 33, suit: 60, meteors: 2, leak: 0.6, devil: 0.6 },
    commander: { sols: 7, dayLen: 130, delayScale: 1, doseScale: 0.8, dustScale: 1.15, failChance: 0.5, science: 8, hints: false, season: 'feb2026', protonDelay: 42, lifeUse: 31, suit: 50, meteors: 3, leak: 0.8, devil: 0.8 },
  };

  var RULES = {
    solarClean: 12,      // power blocks a day from perfectly clean panels
    dustLoss: 0.7,       // share of output lost when panels are fully dusty
    dustStormLoss: 0.5,  // output kept during a dust storm
    batteryCap: 8,
    nightNeed: 3,        // heaters must run all night
    recyclerPerBlock: 8, // life per sol per block
    plantAir: 1.5,       // life per sol per healthy growing plot
    suitAir: 0.06,       // life per second outside
    growPerBlock: 0.36,  // crop growth per sol per block
    dryAfter: 0.75,      // sols until a plot needs water again
    waterPerPlot: 2,
    drillWater: 18,
    drillPower: 0.5,
    valveWater: 8,
    valveWall: 12,
    wallMax: 70,
    shieldPerBlock: 10,
    shieldMax: 95,
    bgInside: 1.5,       // dose points per sol indoors
    bgOutside: 10,       // dose points per sol if outside all day
    stormDose: [0, 0.8, 1.5, 2.5], // dose points per second outside, by level
    stormLength: [0, 24, 32, 40],
    habFactor: 0.45,
    shelterFactor: 0.35,
    doseLimit: 100,
    coldPenalty: 14,
    walkInside: 4.4,
    walkOutside: 3.7,
    botEfficiency: 0.72,
    // Survival. Radiation lowers the most health you can have, and it never heals.
    suitRefill: 40,      // suit air per second when back inside
    noAirHurt: 7,        // health per second with an empty suit
    duskStart: 0.84,     // part of the day after which it is too cold outside
    duskHurt: 3,
    hungerLine: 20,      // Air + Food below this hurts everyone
    hungerHurt: 0.35,
    coldNightHurt: 12,
    nightHeal: 10,
    reviveTime: 28,      // seconds to reach someone who is down
    meteorHurt: 30,
    meteorRadius: 2.4,
    meteorWarn: 3.4,
    devilHurt: 1.6,
    leakAir: 0.12,
    leakHurt: 0.4,
    tiredPerJob: 6,      // mission control gets tired with each job
    dirtyFilter: 2,      // air lost at night when nobody cleaned the air filter
    checkedSuit: 0.85,   // suit air use on a day the engineer checked the suits
    recyclePower: 0.25,  // power the water recycler uses for one run
    // Bedtime: near the end of the day the whole Mars crew meets in the sleep room.
    bedtime: 0.88,       // part of the day when the bedtime call comes
    bedFast: 5,          // once everyone is in the sleep room, the evening goes this much faster
    bedWait: 30,         // seconds after the day ends before the night starts without the late ones
    missedBed: 10,       // health lost by someone who slept outside the sleep room
  };

  var CROPS = { lettuce: { grow: 1.0, life: 6 }, potato: { grow: 1.6, life: 12 } };

  var HOLD = { panel: 3, device: 4, drill: 4.5, plantSeed: 1.2, water: 1, harvest: 1.5, valve: 3, medbay: 3, rock: 2.5, bench: 3.5, uplink: 2, sun: 1.2, dustwatch: 3, analysis: 2.8, twin: 3, filter: 3, compost: 2.5, gym: 3, drive: 3, suits: 3, waterloop: 2.5 };
  // The extra daily jobs, once per sol each. Academy levels keep to their own lesson.
  var DAILY = {
    filter: { role: 'engineer', flag: 'filteredToday', action: 'filter' }, suits: { role: 'engineer', flag: 'suitsToday', action: 'suitcheck' },
    compost: { role: 'farmer', flag: 'compostToday', action: 'compost' }, waterloop: { role: 'farmer', flag: 'recycledToday', action: 'recycle' },
    gym: { role: 'doctor', flag: 'exercisedToday', action: 'exercise' }, drive: { role: 'earth', flag: 'droveToday', action: 'drive' },
  };

  // Decision cards. Both options always cost something.
  var CARDS = [
    {
      id: 'ice', fact: 'cold', options: [
        { key: 'ice_a', apply: function (g) { g.water += 22; g.power.battery = Math.max(0, g.power.battery - 2); g.addDoseAll(3); } },
        { key: 'ice_b', apply: function (g) { g.water = Math.max(0, g.water - 6); } },
      ],
    },
    {
      id: 'moxie', fact: 'moxie', options: [
        { key: 'moxie_a', apply: function (g) { g.life += 10; g.power.battery = Math.max(0, g.power.battery - 3); } },
        { key: 'moxie_b', apply: function (g) { g.life -= 3; } },
      ],
    },
    {
      id: 'crop', fact: 'lettuce', options: [
        { key: 'crop_a', apply: function (g) { g.crop = 'lettuce'; } },
        { key: 'crop_b', apply: function (g) { g.crop = 'potato'; } },
      ],
    },
    {
      id: 'gym', fact: 'exercise', options: [
        { key: 'gym_a', apply: function (g) { g.life -= 5; g.fitToday = true; } },
        { key: 'gym_b', apply: function (g) { g.weakToday = true; } },
      ],
    },
    {
      id: 'wall', fact: 'shelter', options: [
        { key: 'wall_a', apply: function (g) { g.water = Math.max(0, g.water - 15); g.wall = Math.min(RULES.wallMax, g.wall + 20); } },
        { key: 'wall_b', apply: function (g) { g.wall = Math.max(0, g.wall - 5); } },
      ],
    },
    {
      id: 'rover', fact: 'opportunity', options: [
        { key: 'rover_a', apply: function (g) { g.parts += 1; g.rocks[4].gone = true; } },
        { key: 'rover_b', apply: function (g) { g.power.battery = Math.max(0, g.power.battery - 1); } },
      ],
    },
    {
      id: 'relay', fact: 'delay', options: [
        { key: 'relay_a', apply: function (g) { g.power.battery = Math.max(0, g.power.battery - 2); g.science += 1; } },
        { key: 'relay_b', apply: function (g) { g.slowRadioToday = true; } },
      ],
    },
    {
      id: 'late', fact: 'gravity', options: [
        { key: 'late_a', apply: function (g) { g.life -= 7; g.extraDay = 25; } },
        { key: 'late_b', apply: function (g) { g.extraDay = -10; g.life += 2; } },
      ],
    },
  ];

  function rng(seed) {
    var a = seed >>> 0;
    var next = function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    // Saving and restoring the position lets a day be played again exactly.
    next.get = function () { return a; };
    next.set = function (v) { a = v >>> 0; };
    return next;
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function Game(opts) {
    this.opts = opts;
    this.seed = opts.seed != null ? opts.seed : (Math.random() * 1e9) | 0;
    this.rand = rng(this.seed);
    this.diffId = opts.difficulty || 'cadet';
    // A training level (see levels.js) changes a few rules and adds its own goals.
    this.level = opts.level || null;
    this.diff = this.level ? Object.assign({}, DIFFICULTY[this.diffId], this.level.diff) : DIFFICULTY[this.diffId];
    this.season = opts.season;
    this.totalSols = this.diff.sols;
    this.players = opts.players; // [{id, roles:[...], active:index}]

    // Real solar calendar for this run: a window of real days, one per sol.
    var days = this.season.days;
    var count = this.totalSols;
    var startMax = Math.max(0, days.length - count);
    var withFlares = [];
    for (var i = 0; i <= startMax; i++) {
      var hits = days.slice(i, i + count).filter(function (d) { return d.top; }).length;
      if (hits > 0) withFlares.push(i);
    }
    var start = withFlares.length ? withFlares[(this.rand() * withFlares.length) | 0] : 0;
    if (this.level) {
      var want = this.level.day;
      start = Math.max(0, days.findIndex(function (d) { return d.date === want; }));
    }
    this.calendar = [];
    for (var s = 0; s < count; s++) this.calendar.push(days[(start + s) % days.length]);

    var firstDate = this.calendar[0].date;
    this.lightMinutes = NASA.lightMinutes(firstDate);
    this.delay = Math.max(2, this.lightMinutes * this.diff.delayScale);

    this.phase = 'decision';
    this.sol = 1;
    this.t = 0;
    this.time = 0;
    this.dayLen = this.diff.dayLen;
    this.power = { battery: 4, cap: RULES.batteryCap, solar: 0 };
    this.life = 72;
    this.water = 60;
    this.parts = 2;
    this.wall = 20;
    this.alloc = { life: 3, green: 2, shield: 1, science: 2 };
    this.science = 0;
    this.scienceGoal = this.diff.science;
    this.panels = [{ dust: 0.1 }, { dust: 0.15 }, { dust: 0.12 }];
    this.plots = [0, 1, 2, 3].map(function (i) {
      return { state: i < 2 ? 'growing' : 'empty', grow: i < 2 ? 0.35 : 0, dry: 0, crop: 'lettuce' };
    });
    this.crop = 'lettuce';
    this.devices = { battery: true, recycler: true, lights: true, antenna: true };
    this.twinFix = {};
    this.rocks = [0, 1, 2, 3, 4].map(function () { return { active: false, gone: false }; });
    this.spawnRocks();
    this.dataHeld = 0;      // analysed at the lab, waiting for upload
    this.dataAtEarth = 0;   // arrived at Earth, waiting for analysis
    this.dataAtEarthValue = [];
    this.dustStorm = 0;     // sols of dust storm left
    this.dustForecast = null;
    this.dustTomorrow = false;
    this.storm = null;
    this.alert = null;      // null | 'warned' | 'active'
    this.inFlight = [];
    this.events = [];       // for the UI: toasts, sounds
    this.solLog = [];
    this.history = [];
    this.stats = { downs: 0, saves: 0, leaks: 0, meteorHits: 0, hurtBy: {}, warningsSent: 0, warningsLost: 0, falseAlarms: 0, stormsHit: 0, doseStorm: 0, evaSeconds: 0, spilled: 0, coldNights: 0, flaresSeen: [] };
    this.mission = opts.mission || null;
    this.missionDiscoveries = [];
    if (this.mission) {
      var payloadPower = this.mission.payloadPower || 0;
      this.power.battery = clamp(this.mission.availablePower != null ? this.mission.availablePower : this.power.battery + (this.mission.siteRule.battery || 0) - payloadPower, 0, this.power.cap);
      this.wall = clamp(this.wall + (this.mission.siteRule.wall || 0), 0, RULES.wallMax);
      if (this.mission.instruments.indexOf('moxie') >= 0) { this.life = clamp(this.life + 6, 0, 100); this.missionDiscoveries.push('oxygenDemo'); }
      if (this.mission.instruments.indexOf('rad') >= 0) this.wall = clamp(this.wall + 8, 0, RULES.wallMax);
      if (this.mission.instruments.indexOf('meda') >= 0) this.missionDiscoveries.push('weather');
    }
    this.result = null;
    this.usedCards = {};
    this.built = [];       // things the crew added to the base, one after each good day
    this.builtToday = false;

    this.dyn = {};       // things that come and go: leaks, people who need help
    this.meteors = [];
    this.devils = [];
    this.craters = [];
    this.hazards = [];
    this.crew = {};
    var self = this;
    ROLES.forEach(function (r) {
      var sp = World.SPAWN[r];
      self.crew[r] = {
        role: r, x: sp.x, y: sp.y, dir: 'down', moving: false, step: 0, dose: 0,
        health: 100, suit: 100, down: false, downT: 0, resting: false, recover: 0, hurtFlash: 0, sayAt: -99,
        work: 0, station: null, carrying: null, path: null, target: null, think: 0, zone: World.zoneAt(sp.x, sp.y),
        player: null, wait: 0,
      };
    });
    this.players.forEach(function (p) { p.active = p.active || 0; self.bindPlayer(p); });

    this.prepareSol();
    if (this.level) {
      this.lv = { did: {}, count: {} };
      if (this.level.setup) this.level.setup(this);
      this.power.solar = this.solarToday();
      DIALS.forEach(function (d) { self.setDial(d, self.alloc[d]); });
      if (!this.level.plan) this.startDay();
    }
  }

  var P = Game.prototype;

  P.bindPlayer = function (p) {
    var self = this;
    p.roles.forEach(function (r) { if (self.crew[r].player === p.id) self.crew[r].player = null; });
    this.crew[p.roles[p.active]].player = p.id;
  };

  P.st = function (id) { return World.STATIONS[id] || this.dyn[id] || null; };
  P.stationIds = function () { return Object.keys(World.STATIONS).concat(Object.keys(this.dyn)); };

  // ---- Health -------------------------------------------------------------
  // Radiation eats into the top of the health bar and never comes back.
  P.maxHealth = function (c) { return c.role === 'earth' ? 100 : clamp(100 - c.dose, 1, 100); };

  P.heal = function (c, n) { c.health = Math.min(this.maxHealth(c), c.health + n); };

  P.hurt = function (c, n, why) {
    if (c.down || c.resting || c.role === 'earth') return;
    c.health -= n;
    if (n >= 1) { c.hurtFlash = 0.5; this.emit('hurt', { role: c.role, why: why }); }
    this.stats.hurtBy[why] = (this.stats.hurtBy[why] || 0) + n;
    if (c.health <= 0) {
      c.health = 0;
      c.down = true;
      c.downT = 0;
      c.mini = null;
      c.path = null; c.target = null; c.moving = false;
      this.stats.downs += 1;
      this.emit('down', { role: c.role, why: why });
      this.log('rep_down', { who: 'role_' + c.role }, 'bad');
    }
  };

  P.wakeUp = function (c) {
    c.resting = false;
    c.recover = 0;
    c.mini = null;
    c.health = Math.max(c.health, Math.min(50, this.maxHealth(c)));
    c.suit = 100;
    this.emit('awake', { role: c.role });
  };

  P.marsCrew = function () { var k = this.crew; return [k.engineer, k.farmer, k.doctor]; };

  // Real requests from helpers, shown on the power plan.
  P.asks = function () {
    var growing = this.plots.some(function (p) { return p.state !== 'ripe'; });
    return {
      life: this.life < 45 ? 4 : 3,
      green: growing ? (this.life < 45 ? 3 : 2) : 1,
      shield: this.stats.stormsHit > 0 || this.maxDose() > 30 ? 2 : 1,
      science: 2,
    };
  };

  P.emit = function (type, data) { this.events.push(Object.assign({ type: type }, data || {})); };
  P.log = function (key, vars, tone) { this.solLog.push({ key: key, vars: vars || {}, tone: tone || 'info' }); };

  P.addDoseAll = function (n) {
    var self = this;
    ['engineer', 'farmer', 'doctor'].forEach(function (r) { self.crew[r].dose += n; });
  };

  P.maxDose = function () { return Math.max(this.crew.engineer.dose, this.crew.farmer.dose, this.crew.doctor.dose); };
  P.shieldPercent = function () { return clamp(this.wall + this.alloc.shield * RULES.shieldPerBlock, 0, RULES.shieldMax); };
  P.avgDust = function () { return (this.panels[0].dust + this.panels[1].dust + this.panels[2].dust) / 3; };
  P.radioOn = function () { return this.alloc.science > 0 && this.devices.antenna; };
  P.today = function () { return this.calendar[this.sol - 1]; };

  P.solarToday = function () {
    if (this.level && this.level.eventPowerMode === 'radioisotope') return this.level.eventPowerUnits || 8;
    var out = RULES.solarClean * (1 - RULES.dustLoss * this.avgDust());
    if (this.dustStorm > 0) out *= this.eventDustTransmission == null ? RULES.dustStormLoss : this.eventDustTransmission;
    return Math.max(1, Math.round(out)) + (this.has('solar') ? 1 : 0) + (this.missionDiscoveries.indexOf('weather') >= 0 ? 1 : 0);
  };

  // ---- The base grows -------------------------------------------------------------
  // After each day the crew may add one thing to the base. Some help a little,
  // some are just for fun. They show on the map (render.js).
  var UPGRADES = [
    { id: 'solar', icon: 'bolt' }, { id: 'garden', icon: 'plant' }, { id: 'tank', icon: 'drop' },
    { id: 'flag', icon: 'star' }, { id: 'lamps', icon: 'moon' }, { id: 'rover', icon: 'gear' },
  ];
  P.has = function (id) { return !!this.built && this.built.indexOf(id) >= 0; };
  P.upgradeChoices = function () {
    var self = this, left = UPGRADES.filter(function (u) { return !self.has(u.id); });
    // A different three each day, always one that helps.
    var start = (this.sol * 2) % Math.max(1, left.length);
    var pick = [];
    for (var i = 0; i < left.length && pick.length < 3; i++) pick.push(left[(start + i) % left.length]);
    var useful = function (u) { return u.id === 'solar' || u.id === 'garden' || u.id === 'tank'; };
    var helper = left.filter(useful)[0];
    if (helper && !pick.some(useful)) pick[pick.length - 1] = helper;
    return pick;
  };
  P.build = function (id) {
    if (this.builtToday || this.has(id) || !UPGRADES.some(function (u) { return u.id === id; })) return false;
    this.built.push(id);
    this.builtToday = true;
    if (id === 'tank') this.wall = Math.min(RULES.wallMax, this.wall + 8);
    if (id === 'solar') this.power.solar = this.solarToday();
    this.emit('built', { id: id });
    return true;
  };

  P.pool = function () { return Math.floor(this.power.battery) + this.power.solar; };
  P.allocated = function () { var a = this.alloc; return a.life + a.green + a.shield + a.science; };
  P.leftover = function () { return this.pool() - this.allocated() - (this.spentToday || 0); };

  P.setDial = function (dial, value) {
    value = clamp(value, 0, DIAL_MAX);
    var others = this.allocated() - this.alloc[dial];
    value = Math.min(value, this.pool() - others);
    this.alloc[dial] = Math.max(0, value);
  };

  P.spawnRocks = function () {
    var free = [];
    this.rocks.forEach(function (r, i) { r.active = false; if (!r.gone) free.push(i); });
    for (var n = 0; n < 3 && free.length; n++) {
      var pick = (this.rand() * free.length) | 0;
      this.rocks[free[pick]].active = true;
      free.splice(pick, 1);
    }
  };

  // Set up everything known at dawn: real flare for today, dust, failures.
  P.prepareSol = function () {
    var self = this;
    this.power.solar = this.solarToday();
    this.solLog = [];
    this.extraDay = 0;
    this.fitToday = false;
    this.weakToday = false;
    this.slowRadioToday = false;
    this.dayLen = this.diff.dayLen;
    this.storm = null;
    this.alert = null;

    var day = this.today();
    // A level has a flare only when its lesson needs one, and then it is scripted.
    var lvFlare = this.level ? this.level.flare : null;
    var top = this.level && !lvFlare ? null : day.top;
    var plan = top ? NASA.flareToStorm(top.cls) : { level: 0, chance: 0 };
    if (top) {
      var willHit = this.rand() < plan.chance;
      // Keep the whole storm inside the day.
      var earliest = this.dayLen * 0.12;
      var latest = this.dayLen - this.diff.protonDelay - RULES.stormLength[plan.level] - 12;
      var tFlare = earliest + this.rand() * Math.max(0, latest - earliest);
      if (lvFlare) { willHit = lvFlare.hit; tFlare = lvFlare.at; }
      this.storm = {
        flare: top, count: day.count, level: plan.level, willHit: willHit, tFlare: tFlare,
        tHit: tFlare + this.diff.protonDelay, tEnd: tFlare + this.diff.protonDelay + RULES.stormLength[plan.level],
        stage: 'waiting', seen: false, warned: false,
      };
    }

    // Possible equipment failure. Strong storms also hit electronics.
    this.failAt = null;
    if (this.sol > 1 && this.rand() < this.diff.failChance) {
      var devices = ['recycler', 'lights', 'antenna', 'battery'];
      this.failAt = { t: this.dayLen * (0.15 + this.rand() * 0.55), device: devices[(this.rand() * 4) | 0] };
    }

    // Survival challenges for today. The first easy day stays calm.
    this.hazards = [];
    this.dyn = {};
    this.meteors = [];
    this.devils = [];
    var calm = this.diffId === 'cadet' && this.sol === 1;
    if (this.level) {
      this.hazards = (this.level.hazards || []).map(function (h) { return Object.assign({}, h); });
    } else if (!calm) {
      for (var mi = 0; mi < this.diff.meteors; mi++) this.hazards.push({ type: 'meteor', t: this.dayLen * (0.15 + this.rand() * 0.6) });
      if (this.rand() < this.diff.leak) this.hazards.push({ type: 'leak', t: this.dayLen * (0.2 + this.rand() * 0.5) });
      if (this.rand() < this.diff.devil) this.hazards.push({ type: 'devil', t: this.dayLen * (0.1 + this.rand() * 0.55) });
    }

    // Dust storm starts.
    if (this.dustTomorrow) { this.dustStorm = 2; this.dustTomorrow = false; this.emit('dust'); }
    else if (this.dustStorm > 0) this.dustStorm -= 1;
    this.power.solar = this.solarToday();

    // Pick a decision card for dawn.
    var pool = CARDS.filter(function (c) { return !self.usedCards[c.id]; });
    if (pool.length === 0) { this.usedCards = {}; pool = CARDS.slice(); }
    this.card = pool[(this.rand() * pool.length) | 0];
    this.usedCards[this.card.id] = true;
    this.votes = {};
    var choiceDay = this.sol % 2 === 0;
    this.phase = choiceDay ? 'decision' : 'plan';
    if (!choiceDay) this.card = null;
    this.planReady = {};

    var a = this.alloc;
    DIALS.forEach(function (d) { self.setDial(d, a[d]); });
    // The flower garden freshens the air a little every morning.
    this.builtToday = false;
    if (this.sol > 1 && this.has('garden')) this.life = clamp(this.life + 2, 0, 100);
    if (!this.level) this.saveDay();
  };

  // ---- Try the day again ----------------------------------------------------------
  // Each morning the game keeps a copy of itself. After a loss the crew can go back
  // to that morning instead of starting the whole mission again.
  var NOT_SAVED = { opts: 1, season: 1, level: 1, players: 1, calendar: 1, card: 1, rand: 1, events: 1, diff: 1, snap: 1 };
  P.saveDay = function () {
    var copy = {}, self = this;
    Object.keys(this).forEach(function (k) { if (!NOT_SAVED[k] && typeof self[k] !== 'function') copy[k] = self[k]; });
    this.snap = {
      data: JSON.stringify(copy), rand: this.rand.get(), card: this.card ? this.card.id : null,
      active: this.players.map(function (p) { return p.active; }),
    };
  };

  P.retryDay = function () {
    var sn = this.snap, self = this;
    if (!sn || this.level) return false;
    var tries = (this.stats.retries || 0) + 1;
    var data = JSON.parse(sn.data);
    Object.keys(data).forEach(function (k) { self[k] = data[k]; });
    this.rand.set(sn.rand);
    this.card = sn.card ? CARDS.filter(function (c) { return c.id === sn.card; })[0] || null : null;
    this.players.forEach(function (p, i) { p.active = sn.active[i]; self.bindPlayer(p); });
    this.events = [];
    this.result = null;
    this.stats.retries = tries;
    return true;
  };

  P.chooseCard = function (i) {
    if (this.phase !== 'decision' || !this.card) return;
    var opt = this.card.options[i];
    opt.apply(this);
    this.life = clamp(this.life, 0, 100);
    this.log('rep_card', { choice: opt.key }, 'info');
    this.lastCard = { id: this.card.id, choice: i };
    if (this.extraDay) this.dayLen = this.diff.dayLen + this.extraDay;
    this.phase = 'plan';
    this.spentToday = 0;
    this.power.solar = this.solarToday();
    var self = this, a = this.alloc;
    DIALS.forEach(function (d) { self.setDial(d, a[d]); });
  };

  P.startDay = function () {
    if (this.phase !== 'plan') return;
    this.phase = 'day';
    this.t = 0;
    this.spentToday = 0;
    var self = this;
    ROLES.forEach(function (r) { var c = self.crew[r]; c.work = 0; c.path = null; c.target = null; c.mini = null; c.queue = null; c.queueN = 0; c.lastDone = null; });
    this.bedCalled = false; this.bedReady = false; this.bedLate = false;
    this.dayStart = { life: this.life, dose: this.maxDose(), science: this.science };
    this.grewToday = 0;
    this.spawnRocks();
    if (this.alloc.science === 0) this.log('rep_radio_off', {}, 'bad');
    if (this.alloc.green === 0) this.log('rep_no_lights', {}, 'bad');
    if (this.alloc.shield === 0) this.log('rep_no_shield', {}, 'warn');
  };

  P.speed = function (c) {
    var s = c.zone === 'outside' ? RULES.walkOutside : RULES.walkInside;
    if (c.health < 25) s *= 0.8;
    if (this.weakToday) s *= 0.9;
    if (this.fitToday) s *= 1.08;
    // Only robots are slower. Player 1 has id 0, so test for "no player", not falsy.
    if (c.player == null) s *= RULES.botEfficiency + 0.1;
    return s;
  };

  // ---- Stations -----------------------------------------------------------
  // Returns {action, hold, cost} when `c` may use station `id` now, otherwise null.
  P.stationAction = function (id, c) {
    var st = this.st(id);
    if (!st || c.down || c.resting) return null;
    var r = c.role;
    var onEarth = r === 'earth';
    if (!!st.earth !== onEarth) return null;
    if (onEarth && st.kind !== 'nap' && c.health <= 0) return { action: 'tired', hold: 0, blocked: true };
    switch (st.kind) {
      case 'revive':
        if (st.target === r) return null;
        return { action: 'revive', hold: 3 };
      case 'leak':
        return { action: 'patch', hold: 3.5 };
      case 'nap':
        if (c.health >= 85) return null;
        return { action: 'nap', hold: 4 };
      case 'panel':
        if (r !== 'engineer' || this.panels[st.index].dust < 0.08) return null;
        return { action: 'clean', hold: HOLD.panel, cost: 'cost_eva' };
      case 'device':
        if (this.devices[st.device]) return null;
        if (r !== 'engineer') return null;
        if (this.parts <= 0 && !this.twinFix[st.device]) return { action: 'noparts', hold: 0, blocked: true };
        return { action: 'repair', hold: this.twinFix[st.device] ? HOLD.device / 2 : HOLD.device, cost: this.twinFix[st.device] ? 'cost_none_twin' : 'cost_part' };
      case 'drill':
        if (r !== 'engineer' && r !== 'farmer') return null;
        if (this.leftover() < RULES.drillPower) return { action: 'nopower', hold: 0, blocked: true };
        return { action: 'drill', hold: HOLD.drill, cost: 'cost_drill' };
      case 'plot': {
        if (r !== 'farmer') return null;
        var p = this.plots[st.index];
        if (p.state === 'empty') return { action: 'plant', hold: HOLD.plantSeed, cost: 'cost_water' , needsWater: true };
        if (p.state === 'ripe') return { action: 'harvest', hold: HOLD.harvest };
        if (p.dry >= RULES.dryAfter * 0.7) {
          if (this.water < RULES.waterPerPlot) return { action: 'nowater', hold: 0, blocked: true };
          return { action: 'water', hold: HOLD.water, cost: 'cost_water' };
        }
        return null;
      }
      case 'valve':
        if (r !== 'doctor' || this.wall >= RULES.wallMax) return null;
        if (this.water < RULES.valveWater) return { action: 'nowater', hold: 0, blocked: true };
        return { action: 'fillwall', hold: HOLD.valve, cost: 'cost_wall' };
      case 'medbay':
        if (r === 'doctor' && !this.checkedToday) return { action: 'checkup', hold: HOLD.medbay };
        if (c.health < this.maxHealth(c) - 8) return { action: 'rest', hold: 4 };
        return null;
      case 'rock':
        if (!this.rocks[st.index].active || c.carrying) return null;
        return { action: 'sample', hold: HOLD.rock, cost: 'cost_eva' };
      case 'bench':
        if (c.carrying == null) return null;
        if (this.alloc.science === 0) return { action: 'nolab', hold: 0, blocked: true };
        return { action: 'analyse', hold: HOLD.bench / (0.6 + this.alloc.science * 0.4) };
      case 'uplink':
        if (this.dataHeld <= 0) return null;
        if (!this.radioOn()) return { action: 'noradio', hold: 0, blocked: true };
        return { action: 'upload', hold: this.slowRadioToday ? HOLD.uplink * 2 : HOLD.uplink };
      case 'sun':
        if (!this.storm || this.storm.stage === 'waiting' || this.storm.warned || this.storm.stage === 'done') return null;
        return { action: 'warn', hold: HOLD.sun };
      case 'dustwatch':
        if (this.dustForecast === this.sol) return null;
        return { action: 'forecast', hold: HOLD.dustwatch };
      case 'analysis':
        if (this.dataAtEarth <= 0) return null;
        return { action: 'study', hold: HOLD.analysis };
      case 'twin': {
        var broken = this.brokenDevice();
        if (!broken || this.twinFix[broken]) return null;
        return { action: 'twintest', hold: HOLD.twin };
      }
      case 'filter': case 'compost': case 'gym': case 'drive': case 'suits': case 'waterloop': {
        var daily = DAILY[st.kind];
        if (this.level || r !== daily.role || this[daily.flag]) return null;
        if (st.kind === 'compost' && !this.plots.some(function (pl) { return pl.state === 'growing'; })) return null;
        return { action: daily.action, hold: HOLD[st.kind], cost: daily.action === 'recycle' ? 'cost_drill' : undefined };
      }
    }
    return null;
  };

  P.brokenDevice = function () {
    var d = this.devices;
    return ['recycler', 'antenna', 'lights', 'battery'].filter(function (k) { return !d[k]; })[0] || null;
  };

  P.nearestStation = function (c) {
    var best = null, bestD = 1.35;
    var ids = this.stationIds();
    for (var i = 0; i < ids.length; i++) {
      var st = this.st(ids[i]);
      var d = World.stationDistance(st, c.x, c.y);
      if (d < bestD && this.stationAction(ids[i], c)) { best = ids[i]; bestD = d; }
    }
    return best;
  };

  // Everything this role could do right now, most urgent first. Drives both
  // the on-screen to-do list and the bots.
  P.tasksFor = function (role) {
    var c = this.crew[role];
    var list = [];
    var self = this;
    this.stationIds().forEach(function (id) {
      var act = self.stationAction(id, c);
      if (!act || act.blocked) return;
      list.push({ id: id, action: act.action, priority: self.taskPriority(id, act.action, c) });
    });
    list.sort(function (a, b) { return b.priority - a.priority; });
    return list;
  };

  P.taskPriority = function (id, action, c) {
    switch (action) {
      case 'revive': return c.role === 'doctor' ? 120 : 110;
      case 'warn': return 100;
      case 'patch': return c.role === 'engineer' ? 95 : 86;
      case 'rest': return c.health < 40 ? 92 : 8;
      case 'nap': return c.health < 35 ? 92 : 8;
      case 'repair': return 90;
      case 'harvest': return 80;
      case 'twintest': return 75;
      case 'upload': return 72;
      case 'analyse': return 71;
      case 'study': return 70;
      case 'plant': return 65;
      case 'water': return 60;
      case 'clean': return 40 + this.panels[World.STATIONS[id].index].dust * 40;
      case 'fillwall': return this.water < 30 ? 0 : this.wall < 40 ? 50 : 16;
      case 'checkup': return this.marsCrew().some(function (m) { return m.health < 70; }) ? 75 : 30;
      case 'forecast': return 30;
      case 'drill': return this.leftover() - RULES.drillPower < RULES.nightNeed ? 0 : this.water < 25 ? 64 : 12;
      case 'sample': return 20 + World.STATIONS[id].value * 2 - World.stationDistance(World.STATIONS[id], c.x, c.y) * 0.05;
      case 'filter': return 10; // a chore for a quiet moment
      case 'compost': return 45;
      case 'exercise': return this.marsCrew().some(function (m) { return m.health < 75; }) ? 48 : 26;
      case 'drive': return 28;
      case 'suitcheck': return this.t / this.dayLen < 0.3 ? 38 : 14; // best before going out
      case 'recycle': return this.leftover() - RULES.recyclePower < RULES.nightNeed ? 0 : this.water < 25 ? 40 : 12;
    }
    return 0;
  };

  P.finishAction = function (id, c, act, quality) {
    var st = this.st(id);
    var R = RULES;
    var q = quality == null ? 1 : quality;
    // The job list crosses this one off for a moment.
    if (c.player != null) c.lastDone = { action: act.action, at: this.time };
    if (this.lv) {
      // Remember what was done and where, for level goals.
      var did = this.lv.did[act.action] = this.lv.did[act.action] || {};
      if (did[id] == null) did[id] = this.time;
      this.lv.count[act.action] = (this.lv.count[act.action] || 0) + 1;
    }
    if (c.role === 'earth' && act.action !== 'nap') c.health = Math.max(0, c.health - R.tiredPerJob);
    switch (act.action) {
      case 'revive': {
        var who = this.crew[st.target];
        who.down = false;
        who.health = Math.min(this.maxHealth(who), 30 + 20 * q);
        who.suit = Math.max(who.suit, 60);
        delete this.dyn[id];
        this.stats.saves += 1;
        this.emit('saved', { role: c.role, who: st.target });
        this.log('rep_saved', { who: 'role_' + st.target, by: 'role_' + c.role }, 'good');
        break;
      }
      case 'patch':
        delete this.dyn.leak;
        this.emit('done', { role: c.role, key: 'done_patch' });
        this.log('rep_leak_fixed', {}, 'good');
        break;
      case 'rest':
        this.heal(c, 25 + 15 * q);
        this.emit('done', { role: c.role, key: 'done_rest' });
        break;
      case 'nap':
        c.health = Math.min(100, c.health + 45);
        this.emit('done', { role: c.role, key: 'done_nap' });
        break;
      case 'clean':
        this.panels[st.index].dust = q >= 0.95 ? 0 : this.panels[st.index].dust * (1 - q);
        this.emit('done', { role: c.role, key: 'done_clean' });
        break;
      case 'repair':
        if (this.twinFix[st.device]) delete this.twinFix[st.device];
        else this.parts -= 1;
        this.devices[st.device] = true;
        this.emit('done', { role: c.role, key: 'done_repair' });
        this.log('rep_repaired', { device: 'dev_' + st.device }, 'good');
        break;
      case 'drill':
        var ice = Math.round(R.drillWater * (0.4 + 0.6 * q));
        this.water += ice;
        this.spentToday += R.drillPower;
        this.emit('done', { role: c.role, key: 'done_drill', n: ice });
        break;
      case 'plant': {
        var p0 = this.plots[st.index];
        if (this.water < R.waterPerPlot) { this.emit('blocked', { role: c.role, key: 'act_nowater' }); break; }
        this.water -= R.waterPerPlot;
        p0.state = 'growing'; p0.grow = 0; p0.dry = 0; p0.crop = this.crop;
        break;
      }
      case 'water':
        this.plots[st.index].dry = 0;
        this.water = Math.max(0, this.water - R.waterPerPlot - (q < 0.6 ? 2 : 0));
        this.emit('done', { role: c.role, key: q < 0.6 ? 'done_water_bad' : 'done_water' });
        break;
      case 'harvest': {
        var p1 = this.plots[st.index];
        var gain = Math.round(CROPS[p1.crop].life * (0.6 + 0.4 * q));
        this.life = clamp(this.life + gain, 0, 100);
        this.marsCrew().forEach(function (m) { if (!m.down) m.health = Math.min(100 - m.dose, m.health + 3); });
        p1.state = 'empty'; p1.grow = 0; p1.dry = 0;
        this.harvests = (this.harvests || 0) + 1;
        this.emit('done', { role: c.role, key: 'done_harvest', n: gain });
        break;
      }
      case 'fillwall':
        this.water -= R.valveWater;
        this.wall = Math.min(R.wallMax, this.wall + R.valveWall * (0.5 + 0.5 * q));
        this.emit('done', { role: c.role, key: 'done_wall' });
        break;
      case 'checkup':
        this.checkedToday = true;
        var self = this;
        this.marsCrew().forEach(function (m) { if (!m.down && !m.resting) self.heal(m, 15 + 10 * q); });
        this.emit('done', { role: c.role, key: 'done_checkup' });
        if (quality === 1) { this.science += 1; this.emit('science', { n: 1 }); }
        break;
      case 'sample':
        this.rocks[st.index].active = false;
        c.carrying = st.value;
        this.emit('done', { role: c.role, key: 'done_sample' });
        break;
      case 'analyse':
        this.dataHeld += c.carrying;
        c.carrying = null;
        this.emit('done', { role: c.role, key: 'done_analyse' });
        break;
      case 'upload':
        this.send('earth', 'data', { value: this.dataHeld });
        this.dataHeld = 0;
        this.emit('done', { role: c.role, key: 'done_upload' });
        break;
      case 'warn':
        this.storm.warned = true;
        this.stats.warningsSent += 1;
        this.send('base', 'warning', {});
        this.emit('done', { role: c.role, key: 'done_warn' });
        break;
      case 'forecast':
        this.dustForecast = this.sol;
        this.nextDust = this.rollDust();
        this.send('base', 'dustreport', { storm: this.nextDust });
        break;
      case 'study': {
        var v = this.dataAtEarthValue.shift() || 1;
        this.dataAtEarth -= 1;
        var bonus = quality === 1 ? 1 : 0;
        this.science += v + bonus;
        this.emit('science', { n: v + bonus });
        break;
      }
      case 'twintest': {
        var dev = this.brokenDevice();
        this.send('base', 'twinfix', { device: dev });
        this.emit('done', { role: c.role, key: 'done_twin' });
        break;
      }
      case 'filter': {
        // Mars dust clogs the air machine. A dirty filter costs air at night (see endDay).
        this.filteredToday = true;
        this.emit('done', { role: c.role, key: 'done_filter' });
        break;
      }
      case 'compost':
        // Food scraps turned into plant food: growing plants grow a little faster.
        this.compostToday = true;
        this.plots.forEach(function (pl) { if (pl.state === 'growing') pl.grow += 0.015 + 0.015 * q; });
        this.emit('done', { role: c.role, key: 'done_compost' });
        break;
      case 'exercise': {
        // Low gravity makes bones and muscles weak, so real crews exercise every day.
        this.exercisedToday = true;
        var gym = this;
        this.marsCrew().forEach(function (m) { if (!m.down && !m.resting) gym.heal(m, 2 + 2 * q); });
        this.emit('done', { role: c.role, key: 'done_exercise' });
        break;
      }
      case 'suitcheck':
        // Little holes and loose seals let air out. Checked suits keep their air longer today.
        this.suitsToday = true;
        this.emit('done', { role: c.role, key: 'done_suitcheck' });
        break;
      case 'recycle': {
        // Real space stations turn used water back into clean water, almost all of it.
        // The machine needs electricity, so it costs a little of today's power.
        this.recycledToday = true;
        var clean = q >= 0.6 ? 2 : 1;
        this.water += clean;
        this.spentToday += RULES.recyclePower;
        this.emit('done', { role: c.role, key: 'done_recycle', n: clean });
        break;
      }
      case 'drive':
        // The drive plan goes to Mars by radio. Some drives find a new rock, some only get closer.
        this.droveToday = true;
        this.send('base', 'drive', { find: this.rand() < 0.25 + 0.15 * q });
        this.emit('done', { role: c.role, key: 'done_drive' });
        break;
    }
  };

  // ---- Radio --------------------------------------------------------------
  P.send = function (to, kind, payload) {
    this.inFlight.push({ to: to, kind: kind, payload: payload, sentAt: this.time, arrive: this.time + this.delay });
    this.emit('radioSent', { to: to, kind: kind, delay: this.delay });
  };

  P.deliver = function (m) {
    // A message to the base needs the base radio to be switched on.
    if (m.to === 'base' && !this.radioOn()) {
      this.stats.warningsLost += m.kind === 'warning' ? 1 : 0;
      this.emit('radioLost', { kind: m.kind });
      if (m.kind === 'warning') this.log('rep_warning_lost', {}, 'bad');
      return;
    }
    switch (m.kind) {
      case 'warning':
        if (this.alert !== 'active') this.alert = 'warned';
        if (this.storm) this.storm.warnedAtBase = this.t;
        this.emit('radioIn', { key: 'msg_warning', minutes: Math.round(this.lightMinutes) });
        break;
      case 'dustreport':
        this.emit('radioIn', { key: m.payload.storm ? 'msg_dust_yes' : 'msg_dust_no', minutes: Math.round(this.lightMinutes) });
        break;
      case 'drive':
        if (m.payload.find) { this.science += 1; this.emit('science', { n: 1 }); }
        this.emit('radioIn', { key: m.payload.find ? 'msg_drive_find' : 'msg_drive_none', minutes: Math.round(this.lightMinutes) });
        break;
      case 'twinfix':
        this.twinFix[m.payload.device] = true;
        this.emit('radioIn', { key: 'msg_twin', minutes: Math.round(this.lightMinutes) });
        break;
      case 'data':
        for (var i = 0; i < m.payload.value; i++) this.dataAtEarthValue.push(1);
        this.dataAtEarth += m.payload.value;
        this.emit('radioEarth', { key: 'msg_data' });
        break;
    }
  };

  // ---- Storms and events --------------------------------------------------
  P.updateStorm = function () {
    var s = this.storm;
    if (!s) return;
    if (s.stage === 'waiting' && this.t >= s.tFlare) {
      s.stage = 'flare';
      this.stats.flaresSeen.push({ cls: s.flare.cls, date: this.today().date, id: s.flare.id, hit: s.willHit, level: s.level });
      if (this.missionDiscoveries.indexOf('weather') >= 0 && !this.missionWeatherLogged) {
        this.missionWeatherLogged = true;
        this.missionDiscoveries.push('weatherObserved');
      }
      if (s.level === 0) {
        s.stage = 'done';
        this.emit('smallFlare', { cls: s.flare.cls });
        this.log('rep_small_flare', { cls: s.flare.cls, date: this.today().date }, 'info');
        return;
      }
      this.emit('flare', { cls: s.flare.cls, date: this.today().date });
    }
    if (s.stage === 'flare' && this.t >= s.tHit) {
      if (s.willHit) {
        s.stage = 'active';
        s.warnedInTime = s.warnedAtBase != null;
        this.alert = 'active';
        this.stats.stormsHit += 1;
        this.emit('stormHit', { level: s.level });
      } else if (this.t >= s.tHit + 8) {
        s.stage = 'done';
        this.alert = null;
        this.stats.falseAlarms += 1;
        this.emit('allClear', { falseAlarm: true });
        this.log('rep_false_alarm', { cls: s.flare.cls, date: this.today().date }, 'info');
      }
    }
    if (s.stage === 'active' && this.t >= s.tEnd) {
      s.stage = 'done';
      this.alert = null;
      this.emit('allClear', {});
      this.log(s.warnedInTime ? 'rep_storm_warned' : 'rep_storm_surprise',
        { cls: s.flare.cls, date: this.today().date }, s.warnedInTime ? 'good' : 'warn');
      if (s.level >= 2 && this.rand() < 0.4) this.breakDevice(this.rand() < 0.5 ? 'antenna' : 'lights', 'storm');
    }
  };

  P.rollDust = function () {
    return this.sol >= 2 && this.dustStorm === 0 && this.rand() < 0.3 * this.diff.dustScale;
  };

  P.breakDevice = function (device, why) {
    if (!this.devices[device]) return;
    this.devices[device] = false;
    this.emit('broken', { device: device, why: why });
    this.log('rep_broke', { device: 'dev_' + device }, 'bad');
  };

  P.doseRate = function (c) {
    if (c.role === 'earth') return 0;
    var R = RULES, rate;
    var sh = this.shieldPercent() / 100;
    var bg = (c.zone === 'outside' ? R.bgOutside : R.bgInside) / this.diff.dayLen;
    if (this.eventRadiation && this.eventRadiation.active) {
      var eventRate = this.eventRadiation.doseRate;
      if (c.zone === 'shelter') rate = eventRate * R.shelterFactor * (1 - sh);
      else if (c.zone === 'inside') rate = eventRate * R.habFactor * (1 - sh * 0.5);
      else rate = eventRate;
      return rate + bg;
    }
    if (!this.storm || this.storm.stage !== 'active') return bg;
    var base = R.stormDose[this.storm.level] * this.diff.doseScale;
    if (c.zone === 'outside') rate = base;
    else if (c.zone === 'shelter') rate = base * R.shelterFactor * (1 - sh);
    else rate = base * R.habFactor * (1 - sh * 0.5);
    return rate + bg;
  };

  // ---- Main update --------------------------------------------------------
  // inputs: {playerId: {x, y, act, swap}}
  P.update = function (dt, inputs) {
    if (this.phase !== 'day') return;
    // Everyone is in the sleep room: the evening passes quickly while they get ready for bed.
    if (this.bedReady) dt *= RULES.bedFast;
    this.t += dt;
    this.time += dt;
    var R = RULES, solFrac = dt / this.dayLen, self = this;

    // Radio messages in flight.
    for (var i = this.inFlight.length - 1; i >= 0; i--) {
      if (this.time >= this.inFlight[i].arrive) {
        this.deliver(this.inFlight[i]);
        this.inFlight.splice(i, 1);
      }
    }

    this.updateStorm();
    if (this.failAt && this.t >= this.failAt.t) { this.breakDevice(this.failAt.device, 'wear'); this.failAt = null; }

    // Life support.
    var recycler = this.devices.recycler ? this.alloc.life * R.recyclerPerBlock : 0;
    var plantsOk = 0;
    this.plots.forEach(function (p) { if (p.state === 'growing' && p.dry < R.dryAfter) plantsOk += 1; });
    var lifeRate = recycler + plantsOk * R.plantAir * (self.alloc.green > 0 ? 1 : 0.3) - this.diff.lifeUse;
    this.life = clamp(this.life + lifeRate * solFrac, 0, 100);

    // Plants.
    var lightsOn = this.devices.lights ? this.alloc.green : 0;
    this.plots.forEach(function (p) {
      if (p.state !== 'growing') return;
      p.dry += solFrac;
      if (p.dry < R.dryAfter) {
        p.grow += R.growPerBlock * lightsOn * solFrac;
        self.grewToday += lightsOn * solFrac;
      }
      if (p.grow >= CROPS[p.crop].grow) p.state = 'ripe';
    });

    // People.
    ROLES.forEach(function (r) {
      var c = self.crew[r];
      c.hurtFlash = Math.max(0, c.hurtFlash - dt);
      if (c.player != null) self.controlCrew(c, inputs[c.player] || {}, dt);
      else self.botCrew(c, dt);
      c.zone = World.zoneAt(c.x, c.y);
      if (r !== 'earth') {
        var rate = self.doseRate(c);
        c.dose += rate * dt;
        if (self.storm && self.storm.stage === 'active') self.stats.doseStorm += rate * dt;
        if (c.zone === 'outside') {
          self.life = clamp(self.life - R.suitAir * dt, 0, 100);
          self.stats.evaSeconds += dt;
        }
        self.survive(c, dt);
      }
    });

    this.updateHazards(dt);

    if (this.marsCrew().every(function (m) { return m.down || m.resting; })) return this.endMission('crew');
    if (this.life <= 0) return this.endMission('life');
    if (this.maxDose() >= R.doseLimit) return this.endMission('dose');
    if (this.level) {
      if (this.level.tick) this.level.tick(this, dt);
      var lost = this.level.fail && this.level.fail(this);
      if (lost) { this.failKey = lost; return this.endMission('level'); }
      if (this.level.early !== false && this.levelDone()) return this.endMission('goal');
    }
    this.updateBedtime();
    if (this.t >= this.dayLen) {
      // The night starts only when the whole crew is in the sleep room. Late ones get a short wait.
      if (this.level || this.gathered()) this.endDay();
      else if (this.t >= this.dayLen + R.bedWait) this.endDay();
      else if (!this.bedLate) { this.bedLate = true; this.emit('bedLate', {}); }
    }
  };

  // ---- Bedtime --------------------------------------------------------------
  // Academy levels and NASA event missions keep their own rules, so bedtime is for full missions.
  P.atBedtime = function () { return !this.level && this.phase === 'day' && this.t / this.dayLen >= RULES.bedtime; };
  P.inBed = function (c) { return World.inQuarters(c.x, c.y); };
  // Someone who is down or resting is carried in by the rover, so they never hold the crew up.
  P.gathered = function () {
    var self = this;
    return this.marsCrew().every(function (m) { return m.down || m.resting || self.inBed(m); });
  };
  P.updateBedtime = function () {
    if (!this.atBedtime()) return;
    if (!this.bedCalled) { this.bedCalled = true; this.emit('bedtime', {}); }
    var ready = this.gathered();
    if (ready && !this.bedReady) this.emit('bedReady', {});
    this.bedReady = ready;
  };

  // ---- Training levels -----------------------------------------------------
  // Each goal: {key, of, n(g)}. A goal is met when n reaches `of`.
  P.levelGoals = function () {
    var self = this;
    return (this.level ? this.level.goals : []).map(function (gl) {
      var of = gl.of || 1, n = Math.min(of, gl.n(self));
      return { key: gl.key, n: n, of: of, ok: n >= of };
    });
  };
  P.levelDone = function () { return this.levelGoals().every(function (gl) { return gl.ok; }); };
  // The crew member the player controls in a level.
  P.me = function () { return this.crew[this.level.role]; };
  // Helpers leave the level's own jobs to the player.
  P.botSkips = function (action) { return !!(this.level && this.level.track && this.level.track.indexOf(action) >= 0); };

  P.moveCrew = function (c, dx, dy, dt) {
    var len = Math.sqrt(dx * dx + dy * dy);
    c.moving = len > 0.05;
    if (!c.moving) return;
    if (len > 1) { dx /= len; dy /= len; }
    var sp = this.speed(c) * dt, r = 0.32;
    var nx = c.x + dx * sp, ny = c.y + dy * sp;
    if (World.free(nx, c.y, r)) c.x = nx;
    if (World.free(c.x, ny, r)) c.y = ny;
    c.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    c.step += dt * 8;
  };

  P.workAt = function (c, id, dt, efficiency) {
    var act = this.stationAction(id, c);
    if (!act || act.blocked) { c.work = 0; c.station = null; return; }
    if (c.station !== id) { c.station = id; c.work = 0; }
    c.work += dt * efficiency;
    c.workMax = act.hold;
    if (c.work >= act.hold) {
      this.finishAction(id, c, act);
      c.work = 0;
      c.station = null;
    }
  };

  P.controlCrew = function (c, inp, dt) {
    if (c.down) { c.moving = false; c.near = null; return; }
    if (c.resting) {
      c.moving = false; c.near = null;
      if (!c.mini) { c.mini = Mini.start('recover', {}); this.emit('miniStart', { action: 'recover', role: c.role, player: c.player }); }
      Mini.update(c.mini, dt, inp);
      if (c.mini.sound) { this.emit('mini', { sound: c.mini.sound, action: c.mini.action, role: c.role }); c.mini.sound = null; }
      if (c.mini.done) this.wakeUp(c);
      return;
    }
    // The whole crew is in the sleep room getting ready for bed: nobody walks off.
    if (this.bedReady && !c.mini) { c.moving = false; c.near = null; return; }
    if (c.mini) {
      c.moving = false;
      if (inp.swap) { c.mini = null; return; }
      Mini.update(c.mini, dt, inp);
      if (c.mini.sound) { this.emit('mini', { sound: c.mini.sound, action: c.mini.action, role: c.role }); c.mini.sound = null; }
      if (c.mini.done) {
        var m = c.mini;
        c.mini = null;
        var now = this.stationAction(m.station, c);
        // Apply the result only to the job that was played (a plot can ripen during a pour).
        if (now && !now.blocked && now.action === m.action) this.finishAction(m.station, c, now, m.quality);
        // Mistakes in the job can cause small accidents.
        if (m.hurt) this.hurt(c, m.hurt, 'accident');
        if (m.rad) c.dose += m.rad;
        this.emit('miniDone', { action: m.action, quality: m.quality, role: c.role, hurt: m.hurt });
      }
      return;
    }
    this.moveCrew(c, inp.x || 0, inp.y || 0, dt);
    c.near = this.nearestStation(c);
    if (inp.actPressed && c.near) {
      var act = this.stationAction(c.near, c);
      if (act && !act.blocked) {
        c.mini = Mini.start(act.action, this.miniOptions(c.near));
        c.mini.station = c.near;
        this.emit('miniStart', { action: act.action, role: c.role, player: c.player });
      }
    }
  };

  P.miniOptions = function (id) {
    var st = this.st(id);
    if (st.kind === 'panel') return { dust: this.panels[st.index].dust };
    if (st.kind === 'sun' && this.storm) return { cls: this.storm.flare.cls };
    return {};
  };

  // ---- The player's job list ------------------------------------------------
  // Jobs wait in the order they came up: the first job that appeared is the one
  // the arrow points at, so the arrow no longer jumps between jobs while the
  // player walks. Only an emergency goes to the top of the list.
  var EMERGENCY = 85;
  P.isEmergency = function (tk) { return tk.priority >= EMERGENCY; };

  // Jobs this crew member may be sent to right now.
  P.queueCandidates = function (c) {
    var self = this, late = this.tooLateOutside();
    var hide = c.role !== 'earth' && this.alert && c.zone === 'shelter';
    return this.tasksFor(c.role).filter(function (tk) {
      var st = self.st(tk.id);
      // Never send someone out when night is coming, or with a low suit.
      if (st.outside && (late || c.suit < 40)) return false;
      // While the Sun storm is on, stay in the shelter: only jobs inside it.
      if (hide && World.zoneAt(st.x + st.w / 2, st.y + st.h / 2) !== 'shelter') return false;
      // A job that would hurt the base right now, or a small rest, is not a to-do.
      if (tk.priority <= 0) return false;
      if ((tk.action === 'rest' || tk.action === 'nap') && !self.isEmergency(tk)) return false;
      return true;
    });
  };

  // Brings the list up to date. Safe to call many times a frame.
  P.jobList = function (c) {
    var self = this, now = {};
    this.queueCandidates(c).forEach(function (tk) { now[tk.id] = tk; });
    var old = (c.queue || []).filter(function (q) { return now[q.id]; });
    var known = {};
    old.forEach(function (q) { known[q.id] = true; });
    var stamp = c.queueN || 0;
    // Several jobs that appear together keep the game's own order among them.
    Object.keys(now).map(function (id) { return now[id]; })
      .filter(function (tk) { return !known[tk.id]; })
      .sort(function (a, b) { return b.priority - a.priority; })
      .forEach(function (tk) { old.push({ id: tk.id, n: ++stamp }); });
    c.queueN = stamp;
    c.queue = old.map(function (q) {
      var tk = now[q.id];
      return { id: q.id, n: q.n, action: tk.action, urgent: self.isEmergency(tk) };
    }).sort(function (a, b) { return (b.urgent - a.urgent) || (a.n - b.n); });
    return c.queue;
  };

  // Where the arrow should point for this crew member.
  P.goalFor = function (c) {
    if (c.role !== 'earth') {
      if (this.alert && c.zone !== 'shelter') return 'valve';
      if (this.atBedtime()) return this.inBed(c) ? null : 'sleep';
      if (c.zone === 'outside' && (c.suit < 35 || this.t / this.dayLen > 0.78)) return c.y < 19 ? 'doorN' : 'doorS';
      if (c.health < 35 && this.stationAction('medbay', c)) return 'medbay';
    } else if (c.health < 25 && this.stationAction('nap', c)) return 'nap';
    var list = this.jobList(c);
    if (list.length && list[0].urgent) return list[0].id;
    // A rock in your hands is a job already started: take it to the lab first.
    if (c.carrying && this.alloc.science > 0) return 'bench';
    return list.length ? list[0].id : null;
  };

  // After this part of the day, nobody should start a job outside. Robots follow the same rule.
  P.tooLateOutside = function () { return this.t / this.dayLen > 0.72; };

  // ---- Survival ------------------------------------------------------------
  P.survive = function (c, dt) {
    var R = RULES;
    if (c.down) {
      c.downT += dt;
      if (c.downT >= R.reviveTime) {
        // Nobody came. The rover carries them to the med bed.
        c.down = false;
        c.resting = true;
        c.recover = 0;
        c.carrying = null;
        c.x = 41.5; c.y = 23.2;
        delete this.dyn['revive_' + c.role];
        this.emit('carried', { role: c.role });
      } else this.dyn['revive_' + c.role] = { x: Math.floor(c.x), y: Math.floor(c.y), w: 1, h: 1, kind: 'revive', target: c.role };
      return;
    }
    if (c.resting) return;
    if (c.zone === 'outside') {
      c.suit = Math.max(0, c.suit - 100 / this.diff.suit * dt * (this.suitsToday ? RULES.checkedSuit : 1));
      if (c.suit < 30 && !c.suitWarned) { c.suitWarned = true; this.emit('lowSuit', { role: c.role }); this.botSay(c, 'bot_air'); }
      if (c.suit <= 0) this.hurt(c, R.noAirHurt * dt, 'air');
      if (this.t / this.dayLen > R.duskStart) this.hurt(c, R.duskHurt * dt, 'cold');
    } else {
      c.suit = Math.min(100, c.suit + R.suitRefill * dt);
      if (c.suit > 60) c.suitWarned = false;
    }
    if (this.life < R.hungerLine) this.hurt(c, R.hungerHurt * dt, 'hunger');
    var top = this.maxHealth(c);
    if (c.health > top) c.health = top;
    if (c.health < 30 && !c.hurtSaid) { c.hurtSaid = true; this.botSay(c, 'bot_hurt'); }
    if (c.health > 50) c.hurtSaid = false;
  };

  // Helpers talk now and then, so they feel like teammates.
  P.botSay = function (c, key) {
    if (c.player != null || !this.players.length || this.time - c.sayAt < 8) return;
    c.sayAt = this.time;
    this.emit('botSay', { role: c.role, key: key });
  };

  function roomOf(x, y) { return x < 25 ? 'green' : x < 35 ? 'hub' : y < 19 ? 'lab' : 'shelter'; }

  var LEAK_SPOTS = [{ x: 20, y: 20 }, { x: 30, y: 21 }, { x: 40, y: 16 }, { x: 40, y: 23 }];

  P.startHazard = function (h) {
    var self = this;
    if (h.type === 'meteor') {
      var out = this.marsCrew().filter(function (m) { return m.zone === 'outside' && !m.down; });
      var c = out.length ? out[(this.rand() * out.length) | 0] : null;
      var x = c ? c.x + (this.rand() - 0.5) * 3 : 8 + this.rand() * 44;
      var y = c ? c.y + (this.rand() - 0.5) * 3 : 2 + this.rand() * 8;
      this.meteors.push({ x: x, y: y, t: RULES.meteorWarn, total: RULES.meteorWarn });
      if (out.length) this.emit('meteorWarn', {});
    } else if (h.type === 'leak') {
      if (this.dyn.leak) return;
      var spot = LEAK_SPOTS[h.spot != null ? h.spot : (this.rand() * LEAK_SPOTS.length) | 0];
      this.dyn.leak = { x: spot.x, y: spot.y, w: 1, h: 1, kind: 'leak', room: roomOf(spot.x, spot.y) };
      this.stats.leaks += 1;
      this.emit('leak', {});
      this.log('rep_leak', {}, 'warn');
    } else if (h.type === 'devil') {
      var left = this.rand() < 0.5;
      this.devils.push({ x: left ? 1 : 58, y: 3 + this.rand() * 8, vx: left ? 3.2 : -3.2, vy: (self.rand() - 0.4) * 0.8, spin: 0 });
      this.emit('devil', {});
    }
  };

  P.updateHazards = function (dt) {
    var R = RULES, self = this;
    this.hazards = this.hazards.filter(function (h) {
      if (self.t < h.t) return true;
      self.startHazard(h);
      return false;
    });

    for (var i = this.meteors.length - 1; i >= 0; i--) {
      var m = this.meteors[i];
      m.t -= dt;
      if (m.t > 0) continue;
      this.meteors.splice(i, 1);
      this.craters.push({ x: m.x, y: m.y });
      if (this.craters.length > 24) this.craters.shift();
      this.emit('boom', { x: m.x, y: m.y });
      this.marsCrew().forEach(function (c) {
        var d = Math.hypot(c.x - m.x, c.y - m.y);
        if (c.zone === 'outside' && d < R.meteorRadius) { self.stats.meteorHits += 1; self.hurt(c, R.meteorHurt * (1 - d / R.meteorRadius * 0.4), 'meteor'); }
      });
      this.panels.forEach(function (p, k) {
        var st = World.STATIONS['panel' + k];
        if (World.stationDistance(st, m.x, m.y) < 3) p.dust = clamp(p.dust + 0.25, 0, 1);
      });
    }

    for (var d = this.devils.length - 1; d >= 0; d--) {
      var v = this.devils[d];
      v.x += v.vx * dt; v.y += v.vy * dt; v.spin += dt;
      if (v.x < -1 || v.x > 61) { this.devils.splice(d, 1); continue; }
      this.marsCrew().forEach(function (c) {
        if (c.zone === 'outside' && Math.hypot(c.x - v.x, c.y - v.y) < 1.8) {
          self.hurt(c, R.devilHurt * dt, 'devil');
          c.suit = Math.max(0, c.suit - 8 * dt);
        }
      });
      this.panels.forEach(function (p, k) {
        if (World.stationDistance(World.STATIONS['panel' + k], v.x, v.y) < 2 && p.dust > 0) {
          p.dust = Math.max(0, p.dust - 0.5 * dt);
          if (!self.devilCleaned) { self.devilCleaned = true; self.log('rep_devil', {}, 'good'); }
        }
      });
    }

    var leak = this.dyn.leak;
    if (leak) {
      this.life = clamp(this.life - R.leakAir * dt, 0, 100);
      this.marsCrew().forEach(function (c) {
        if (c.zone !== 'outside' && roomOf(c.x, c.y) === leak.room) self.hurt(c, R.leakHurt * dt, 'leak');
      });
    }
  };

  P.meteorOver = function (c) {
    for (var i = 0; i < this.meteors.length; i++) {
      var m = this.meteors[i];
      if (c.zone === 'outside' && Math.hypot(c.x - m.x, c.y - m.y) < RULES.meteorRadius + 0.5) return m;
    }
    return null;
  };

  // ---- Helpers on autopilot ----------------------------------------------
  P.botGoal = function (c, frac) {
    var self = this;
    if (c.role !== 'earth') {
      if (this.alert) {
        if (c.zone === 'shelter') return 'stay';
        return { point: World.SHELTER_SPOTS[['engineer', 'farmer', 'doctor'].indexOf(c.role)] };
      }
      var downed = Object.keys(this.dyn).filter(function (id) { return self.dyn[id].kind === 'revive' && self.dyn[id].target !== c.role; });
      var doctorFree = !this.crew.doctor.down && !this.crew.doctor.resting && this.crew.doctor.player == null;
      if (downed.length && !this.botSkips('revive') && (c.role === 'doctor' || !doctorFree)) { this.botSay(c, 'bot_help'); return { station: downed[0] }; }
      if (this.atBedtime()) {
        var spot = World.SLEEP_SPOTS[['engineer', 'farmer', 'doctor'].indexOf(c.role)];
        return this.inBed(c) && Math.hypot(c.x - spot.x, c.y - spot.y) < 0.6 ? 'stay' : { point: spot };
      }
      if (c.zone === 'outside' && (c.suit < 40 || frac > 0.78)) return { point: c.y < 19 ? { x: 30.5, y: 15.5 } : { x: 30.5, y: 23.5 } };
    }
    var tasks = this.tasksFor(c.role).filter(function (t) {
      if (t.priority <= 0 || self.takenBy(t.id, c) || self.botSkips(t.action)) return false;
      var st = self.st(t.id);
      if (st.outside && (self.tooLateOutside() || c.suit < 60)) return false;
      return true;
    });
    if (c.carrying && this.alloc.science > 0 && !(tasks.length && tasks[0].priority >= 85)) return { station: 'bench' };
    return tasks.length ? { station: tasks[0].id } : null;
  };

  P.botCrew = function (c, dt) {
    if (c.down) { c.moving = false; return; }
    if (c.resting) {
      c.moving = false;
      c.recover += dt / 18;
      if (c.recover >= 1) this.wakeUp(c);
      return;
    }
    c.think -= dt;
    var frac = this.t / this.dayLen;
    // A falling rock beats everything: run.
    var danger = this.meteorOver(c);
    if (danger) {
      var ax = c.x - danger.x, ay = c.y - danger.y;
      this.moveCrew(c, ax || 1, ay || 1, dt);
      c.path = null; c.target = null;
      return;
    }
    if (c.role === 'earth' && this.storm && this.storm.stage === 'flare' && !this.storm.warned) {
      if (c.wait === 0) c.wait = 3 + this.rand() * 3;
      c.wait -= dt;
      if (c.wait > 0.1) { c.moving = false; return; }
    } else if (c.role === 'earth') c.wait = 0; // the next flare gets its own reaction delay
    if (c.think <= 0 || !c.target) {
      c.think = 1;
      var goal = this.botGoal(c, frac);
      if (goal === 'stay') { c.moving = false; c.target = null; c.path = null; return; }
      if (goal) {
        var key = goal.station || 'point';
        if (key !== c.target || !c.path) {
          c.target = key;
          c.path = World.findPath(c.x, c.y, goal.station ? this.st(goal.station) : goal.point);
        }
      } else { c.target = null; c.path = null; }
    }
    if (c.path && c.path.length) {
      var n = c.path[0];
      var dx = n.x - c.x, dy = n.y - c.y;
      if (Math.abs(dx) < 0.14 && Math.abs(dy) < 0.14) { c.path.shift(); return; }
      this.moveCrew(c, dx, dy, dt);
      return;
    }
    c.moving = false;
    if (c.target && c.target !== 'point') {
      var st = this.st(c.target);
      var near = st && World.stationDistance(st, c.x, c.y) < 1.35;
      if (near && this.stationAction(c.target, c)) this.workAt(c, c.target, dt, RULES.botEfficiency);
      else { c.target = null; c.work = 0; }
    }
  };

  P.takenBy = function (id, c) {
    var self = this;
    return ROLES.some(function (r) { return r !== c.role && self.crew[r].target === id; });
  };

  // ---- End of the sol -----------------------------------------------------
  P.endDay = function () {
    var R = RULES, self = this;
    var a = this.alloc;
    // A shorter day can end while a storm is still out there.
    if (this.storm && this.storm.stage === 'active') {
      this.log(this.storm.warnedInTime ? 'rep_storm_warned' : 'rep_storm_surprise', { cls: this.storm.flare.cls, date: this.today().date }, 'warn');
      this.storm.stage = 'done';
    }
    var report = { sol: this.sol, date: this.today().date, flare: this.today().top, count: this.today().count };

    // Bedtime: anyone who did not reach the sleep room sleeps badly.
    report.lateToBed = [];
    if (!this.level) {
      report.lateToBed = this.marsCrew().filter(function (m) { return !m.down && !m.resting && !self.inBed(m); }).map(function (m) { return m.role; });
      report.lateToBed.forEach(function (r) { var m = self.crew[r]; m.health = Math.max(5, m.health - R.missedBed); });
      if (report.lateToBed.length) this.log('rep_missed_bed', { n: report.lateToBed.length }, 'bad');
    }

    // Unused blocks go to the battery. Extra is lost.
    var left = this.leftover();
    var capNow = this.devices.battery ? R.batteryCap : R.batteryCap / 2;
    var stored = Math.min(left, capNow);
    var spilled = left - stored;
    this.stats.spilled += spilled;
    if (spilled > 0) this.log('rep_spilled', { n: spilled }, 'warn');

    // Nobody cleaned the air filter: the air machine works a little worse tonight.
    if (!this.level && !this.filteredToday) {
      this.life = clamp(this.life - R.dirtyFilter, 0, 100);
      this.log('rep_filter_dirty', { n: R.dirtyFilter }, 'warn');
    }

    // Night.
    this.nightDone = true;
    var after = stored - R.nightNeed;
    if (after < 0) {
      this.life = clamp(this.life - R.coldPenalty, 0, 100);
      this.power.battery = 0;
      this.stats.coldNights += 1;
      this.log('rep_cold', { n: R.coldPenalty }, 'bad');
      this.marsCrew().forEach(function (m) { m.health = Math.max(5, m.health - R.coldNightHurt); });
      if (this.rand() < 0.5) this.breakDevice('recycler', 'cold');
    } else {
      this.power.battery = after;
      this.log('rep_night_ok', { n: R.nightNeed, left: after }, 'good');
      this.marsCrew().forEach(function (m) { self.heal(m, R.nightHeal); });
    }

    // Everyone sleeps inside, and the next day starts at the base.
    ROLES.forEach(function (r) {
      var m = self.crew[r], sp = World.SPAWN[r];
      if (m.down || m.resting) { m.down = false; m.resting = false; m.health = Math.max(m.health, Math.min(35, self.maxHealth(m))); }
      m.mini = null; m.path = null; m.target = null; m.moving = false; m.suit = 100; m.work = 0;
      m.x = sp.x; m.y = sp.y; m.zone = World.zoneAt(m.x, m.y);
      if (r === 'earth') m.health = Math.min(100, m.health + 35);
    });
    this.dyn = {};

    // Dust settles.
    var dusty = 0.06 + this.rand() * 0.1;
    this.panels.forEach(function (p) { p.dust = clamp(p.dust + dusty * self.diff.dustScale * (self.dustStorm > 0 ? 2 : 1), 0, 1); });
    this.devilCleaned = false;

    // Dust storm tomorrow?
    if (this.nextDust === undefined || this.dustForecast !== this.sol) {
      this.nextDust = this.rollDust();
    }
    if (this.nextDust) this.dustTomorrow = true;
    this.nextDust = undefined;

    if (a.green === 0) this.log('rep_hungry_soon', {}, 'warn');
    if (this.grewToday > 0) this.log('rep_grew', {}, 'good');

    report.life = this.life;
    report.lifeDelta = this.life - this.dayStart.life;
    report.dose = this.maxDose();
    report.doseDelta = this.maxDose() - this.dayStart.dose;
    report.scienceDelta = this.science - this.dayStart.science;
    report.battery = this.power.battery;
    report.dust = this.avgDust();
    report.team = ROLES.map(function (r) { return { role: r, health: self.crew[r].health, top: self.maxHealth(self.crew[r]) }; });
    report.lines = this.solLog.slice();
    report.tomorrowSolar = (function () { return self.solarToday(); })();
    report.fact = this.pickFact();
    this.history.push(report);
    this.lastReport = report;
    this.checkedToday = false;
    this.filteredToday = this.compostToday = this.exercisedToday = this.droveToday = this.suitsToday = this.recycledToday = false;

    if (this.life <= 0) return this.endMission('life');
    if (this.power.battery <= 0 && this.stats.coldNights >= 3) return this.endMission('cold');
    if (this.sol >= this.totalSols) return this.endMission('complete');
    this.phase = 'report';
  };

  P.pickFact = function () {
    var s = this.storm;
    if (s && s.stage === 'done' && s.willHit && s.level > 0) return this.rand() < 0.5 ? 'storm2024' : 'shelter';
    if (s && s.level === 0) return 'flareScale';
    var list = ['sol', 'dailyDose', 'plantLight', 'meteorite', 'thinAir', 'plantRadiation', 'astronautBlood', 'bones', 'cold', 'careerLimit', 'delay', 'moxie', 'dustGlobal', 'lettuce', 'leak', 'opportunity', 'gravity', 'marsTime', 'cleaning', 'mars520'];
    return list[(this.sol * 3 + (this.seed % 7)) % list.length];
  };

  P.nextSol = function () {
    if (this.phase !== 'report') return;
    this.sol += 1;
    this.prepareSol();
  };

  P.endMission = function (why) {
    if (this.phase === 'end') return;
    if (why !== 'complete' && !this.history.some(function (h) { return h.sol === this.sol; }, this)) {
      this.history.push({ sol: this.sol, date: this.today().date, flare: this.today().top, count: this.today().count, life: this.life, dose: this.maxDose(), lines: this.solLog.slice() });
    }
    if (this.level) {
      var won = (why === 'goal' || why === 'complete') && this.levelDone();
      if (why === 'complete' && !won) why = 'time';
      var star2 = won && this.level.star2.ok(this);
      this.result = { level: true, won: won, why: why, failKey: this.failKey || null, goals: this.levelGoals(), star2: star2, stars: won ? (star2 ? 2 : 1) : 0, time: this.time, survived: won, flares: this.stats.flaresSeen,
        event: this.level.eventId ? { id: this.level.eventId, role: this.players[0] && this.players[0].roles[0], stats: Object.assign({}, this.eventStats || {}), battery: this.power.battery, solar: this.power.solar, life: this.life, water: this.water, science: this.science, dose: this.maxDose(), wall: this.wall, allocation: Object.assign({}, this.alloc) } : null };
      this.phase = 'end';
      this.emit('end', { why: why });
      return;
    }
    var survived = why === 'complete';
    var stars = 0;
    if (survived) {
      stars = 1;
      if (this.science >= this.scienceGoal) stars += 1;
      if (this.maxDose() < 50) stars += 1;
    }
    this.result = { downs: this.stats.downs, saves: this.stats.saves, why: why, survived: survived, stars: stars, science: this.science, goal: this.scienceGoal, maxDose: this.maxDose(), sol: this.sol, total: this.totalSols, flares: this.stats.flaresSeen,
      mission: this.mission ? { design: this.mission, battery: this.power.battery, life: this.life, water: this.water, wall: this.wall, science: this.science, discoveries: this.missionDiscoveries.slice(), storms: this.stats.stormsHit, coldNights: this.stats.coldNights, survived: survived } : null };
    this.phase = 'end';
    this.emit('end', { why: why });
  };

  var api = { Game: Game, UPGRADES: UPGRADES, RULES: RULES, DIFFICULTY: DIFFICULTY, ROLES: ROLES, DIALS: DIALS, DIAL_OWNER: DIAL_OWNER, DIAL_MAX: DIAL_MAX, CROPS: CROPS, CARDS: CARDS };
  root.SolCrew = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
