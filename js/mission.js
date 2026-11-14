// Small, deterministic Mission Blueprint rules. Budgets and effects are game units.
(function (root) {
  'use strict';
  var SITES = {
    gale: { id: 'gale', battery: 0, wall: 0, source: 'https://science.nasa.gov/photojournal/topography-of-gale-crater/' },
    jezero: { id: 'jezero', battery: -1, wall: 0, source: 'https://science.nasa.gov/resource/a-possible-landing-site-for-the-2020-mission-jezero-crater/' },
    elysium: { id: 'elysium', battery: 1, wall: -4, source: 'https://science.nasa.gov/photojournal/elysium/' },
  };
  var INSTRUMENTS = {
    meda: { id: 'meda', mass: 2, power: 1, capability: 'weather', source: 'https://pds.nasa.gov/ds-view/pds/viewContext.jsp?identifier=urn:nasa:pds:context:instrument:mars2020.meda&version=1.2' },
    rad: { id: 'rad', mass: 2, power: 1, capability: 'radiation', source: 'https://science.nasa.gov/resource/radiation-measurements-on-mars/' },
    moxie: { id: 'moxie', mass: 4, power: 3, capability: 'oxygenDemo', source: 'https://www.nasa.gov/missions/mars-2020-perseverance/perseverance-rover/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/' },
  };
  var BUDGET = { mass: 7, power: 4, maxInstruments: 3 };
  function metrics(design) {
    var selected = (design && design.instruments || []).filter(function (id, i, a) { return INSTRUMENTS[id] && a.indexOf(id) === i; });
    return selected.reduce(function (out, id) { out.mass += INSTRUMENTS[id].mass; out.power += INSTRUMENTS[id].power; return out; }, { mass: 0, power: 0, selected: selected });
  }
  function validate(design) {
    var m = metrics(design);
    return { valid: m.selected.length > 0 && m.selected.length <= BUDGET.maxInstruments && m.mass <= BUDGET.mass && m.power <= BUDGET.power, mass: m.mass, power: m.power, selected: m.selected };
  }
  function normalize(design) {
    var v = validate(design), site = SITES[design && design.site] ? design.site : 'gale';
    if (!v.valid) return null;
    var siteRule = Object.assign({}, SITES[site]);
    return {
      objective: 'weather', site: site, instruments: v.selected.slice(),
      capabilities: v.selected.map(function (id) { return INSTRUMENTS[id].capability; }),
      mass: v.mass, payloadMass: v.mass, payloadPower: v.power,
      availablePower: Math.max(0, 4 + siteRule.battery - v.power),
      budget: { mass: BUDGET.mass, power: BUDGET.power }, resourceBudget: { mass: BUDGET.mass, power: BUDGET.power },
      siteRule: siteRule, operationalConstraints: { siteBattery: siteRule.battery, siteWall: siteRule.wall, payloadPower: v.power },
    };
  }
  root.MissionDNA = { SITES: SITES, INSTRUMENTS: INSTRUMENTS, BUDGET: BUDGET, metrics: metrics, validate: validate, normalize: normalize };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.MissionDNA;
})(typeof globalThis !== 'undefined' ? globalThis : this);
