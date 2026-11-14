// Real-world grounding for the game: sources, facts and space-weather helpers.
// Every number shown to players as "real" lives in this file with its source.
(function (root) {
  'use strict';

  var SOURCES = {
    donki: { name: 'NASA DONKI (Space Weather Database)', url: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/' },
    osdr: { name: 'NASA Open Science Data Repository (OSDR)', url: 'https://osdr.nasa.gov/bio/repo/' },
    rad: { name: 'Curiosity RAD, Reitz et al. (DLR)', url: 'https://elib.dlr.de/106090' },
    jplStorm: { name: 'NASA JPL: Mars lights up during epic solar storm (2024)', url: 'https://www.jpl.nasa.gov/news/nasa-watches-mars-light-up-during-epic-solar-storm' },
    moxie: { name: 'NASA: MOXIE completes Mars mission (2023)', url: 'https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/' },
    marsFacts: { name: 'NASA Science: Mars Facts', url: 'https://science.nasa.gov/mars/facts/' },
    insight: { name: 'NASA InSight press kit: Mars at a Glance', url: 'https://www.jpl.nasa.gov/news/press_kits/insight/launch/facts/mars-at-a-glance/' },
    delays: { name: 'NASA: Communication Delays for Crewed Mars Missions', url: 'https://ntrs.nasa.gov/api/citations/20220013418/downloads/ASCEND-Communication%20Delays,%20Disruptions,%20and%20Blackouts%20for%20Crewed%20Mars%20Missions.pdf' },
    orbits: { name: 'NASA JPL: Approximate Positions of the Planets', url: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html' },
    exercise: { name: 'NASA: Counteracting Bone and Muscle Loss', url: 'https://www.nasa.gov/missions/station/iss-research/counteracting-bone-and-muscle-loss-in-microgravity/' },
    limit: { name: 'NASA-STD-3001 career radiation limit', url: 'https://www.nasa.gov/reference/4-0-human-performance/' },
    noaa: { name: 'NOAA SWPC GOES X-ray flares', url: 'https://services.swpc.noaa.gov/json/goes/primary/' },
    osd268: { name: 'OSDR OSD-268: lettuce grown on the ISS', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-268' },
    osd658: { name: 'OSDR OSD-658: simulated cosmic rays and plants', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-658' },
    osd678: { name: 'OSDR OSD-678: light and plants in spaceflight', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-678' },
    osd417: { name: 'OSDR OSD-417: bone loss during spaceflight', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-417' },
    opportunity: { name: 'NASA: Opportunity mission comes to end (2019)', url: 'https://www.nasa.gov/news-release/nasas-record-setting-opportunity-rover-mission-on-mars-comes-to-end/' },
    impacts: { name: 'NASA: InSight detects meteoroid impact', url: 'https://www.nasa.gov/missions/insight/nasas-insight-lander-detects-stunning-meteoroid-impact-on-mars/' },
    issLeak: { name: 'NASA: update on space station leak (2026)', url: 'https://www.nasa.gov/blogs/spacestation/2026/06/05/nasa-provides-update-on-space-station-leak/' },
    marsTime: { name: 'NASA: Living on Mars Time', url: 'https://science.nasa.gov/resource/living-on-mars-time/' },
    osd53: { name: 'OSDR OSD-53: spaceflight and astronaut genes', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-53' },
    osd140: { name: 'OSDR OSD-140: 520-day Mars mission simulation', url: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-140' },
    photos: { name: 'NASA Image and Video Library', url: 'https://images.nasa.gov/' },
    cleaning: { name: 'NASA JPL: wind cleaned Spirit\'s solar panels', url: 'https://www.jpl.nasa.gov/news/spirit-gets-energy-boost-from-cleaner-solar-panels/' },
  };

  // Keys point at text in i18n.js. `src` points at SOURCES.
  var FACTS = {
    storm2024: { key: 'fact_storm2024', src: 'jplStorm' },
    shelter: { key: 'fact_shelter', src: 'jplStorm' },
    dailyDose: { key: 'fact_dailyDose', src: 'rad' },
    careerLimit: { key: 'fact_careerLimit', src: 'limit' },
    moxie: { key: 'fact_moxie', src: 'moxie' },
    opportunity: { key: 'fact_opportunity', src: 'opportunity' },
    lettuce: { key: 'fact_lettuce', src: 'osd268' },
    plantLight: { key: 'fact_plantLight', src: 'osd678' },
    plantRadiation: { key: 'fact_plantRadiation', src: 'osd658' },
    bones: { key: 'fact_bones', src: 'osd417' },
    exercise: { key: 'fact_exercise', src: 'exercise' },
    sol: { key: 'fact_sol', src: 'marsFacts' },
    gravity: { key: 'fact_gravity', src: 'insight' },
    thinAir: { key: 'fact_thinAir', src: 'marsFacts' },
    cold: { key: 'fact_cold', src: 'marsFacts' },
    dustGlobal: { key: 'fact_dustGlobal', src: 'marsFacts' },
    cleaning: { key: 'fact_cleaning', src: 'cleaning' },
    meteorite: { key: 'fact_meteorite', src: 'impacts' },
    leak: { key: 'fact_leak', src: 'issLeak' },
    marsTime: { key: 'fact_marsTime', src: 'marsTime' },
    astronautBlood: { key: 'fact_astronautBlood', src: 'osd53' },
    mars520: { key: 'fact_mars520', src: 'osd140' },
    delay: { key: 'fact_delay', src: 'delays' },
    flareScale: { key: 'fact_flareScale', src: 'donki' },
  };

  // ---- Earth to Mars light time ------------------------------------------
  // JPL approximate Keplerian elements, valid 1800-2050 (see SOURCES.orbits).
  var ELEMENTS = {
    earth: [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0,
      0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
    mars: [1.52371034, 0.0933941, 1.84969142, -4.55343205, -23.94362959, 49.55953891,
      0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
  };

  function planetPosition(el, centuries) {
    var rad = Math.PI / 180;
    var a = el[0] + el[6] * centuries;
    var e = el[1] + el[7] * centuries;
    var I = (el[2] + el[8] * centuries) * rad;
    var L = el[3] + el[9] * centuries;
    var peri = el[4] + el[10] * centuries;
    var node = el[5] + el[11] * centuries;
    var M = (((L - peri) % 360) + 540) % 360 - 180;
    M *= rad;
    var E = M;
    for (var i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    var xp = a * (Math.cos(E) - e);
    var yp = a * Math.sqrt(1 - e * e) * Math.sin(E);
    var w = (peri - node) * rad;
    var O = node * rad;
    var cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I), sI = Math.sin(I);
    return [
      (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
      (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
      (sw * sI) * xp + (cw * sI) * yp,
    ];
  }

  // Minutes a radio signal needs to go one way between Earth and Mars on a date.
  function lightMinutes(dateString) {
    var ms = Date.parse(dateString.length <= 10 ? dateString + 'T12:00:00Z' : dateString);
    var centuries = (ms / 86400000 + 2440587.5 - 2451545.0) / 36525;
    var p = planetPosition(ELEMENTS.earth, centuries);
    var q = planetPosition(ELEMENTS.mars, centuries);
    var dist = Math.sqrt(Math.pow(p[0] - q[0], 2) + Math.pow(p[1] - q[1], 2) + Math.pow(p[2] - q[2], 2));
    return dist * 149597870.7 / 299792.458 / 60;
  }

  // ---- Flares -------------------------------------------------------------
  function flareFlux(cls) {
    if (!cls) return 0;
    var scale = { A: 1e-8, B: 1e-7, C: 1e-6, M: 1e-5, X: 1e-4 }[cls.charAt(0)] || 0;
    return scale * (parseFloat(cls.slice(1)) || 1);
  }

  // Game rule, not NASA data: how a flare's class becomes a storm at the base.
  // Flares are seen from Earth. Mars sits somewhere else, so not every flare
  // sends particles to Mars. `chance` models that and creates false alarms.
  function flareToStorm(cls) {
    var f = flareFlux(cls);
    if (f < 1e-5) return { level: 0, chance: 0 };
    if (f < 5e-5) return { level: 1, chance: 0.3 };
    if (f < 1e-4) return { level: 1, chance: 0.55 };
    if (f < 5e-4) return { level: 2, chance: 0.8 };
    return { level: 3, chance: 1 };
  }

  // Build a season object from a list of {class, time, id} live flare records.
  function seasonFromLive(records, meta) {
    var byDay = {};
    records.forEach(function (r) {
      if (!r.cls || !r.begin) return;
      var day = r.begin.slice(0, 10);
      var entry = byDay[day] || (byDay[day] = { date: day, count: 0, top: null });
      entry.count += 1;
      if (!entry.top || flareFlux(r.cls) > flareFlux(entry.top.cls)) entry.top = r;
    });
    var days = Object.keys(byDay).sort().map(function (d) { return byDay[d]; });
    return {
      id: 'live', live: true, source: meta.source, fetchedAt: meta.fetchedAt,
      start: days.length ? days[0].date : '', end: days.length ? days[days.length - 1].date : '',
      totalFlares: records.length, days: days,
    };
  }

  var api = {
    SOURCES: SOURCES, FACTS: FACTS, lightMinutes: lightMinutes, flareFlux: flareFlux,
    flareToStorm: flareToStorm, seasonFromLive: seasonFromLive,
  };
  root.NASA = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
