// Landing Ellipse Lab rules. No drawing, so tests can run it in Node.
// Real data: MOLA elevations (js/terrain) and published ellipse sizes (js/craters.js ERAS).
// Everything this file *judges* (checks, outcomes, thresholds) is a game simulation, not an
// official NASA landing-safety rating; the UI labels it that way.
(function (root) {
  'use strict';

  var R_KM = 3396.19; // Mars mean radius used by MOLA products
  var KM_PER_DEG = R_KM * Math.PI / 180;

  // ---- Elevation grids ------------------------------------------------------
  // grid: { w, h, north, west, ppdLat, ppdLon, data: Int16Array (metres) }
  function gridIndex(grid, lat, lon) {
    // Degrees east of the crop's west edge. Points beyond the east edge by more than half the
    // remaining longitude are treated as lying to the west (negative), so edges never wrap.
    var span = grid.w / grid.ppdLon, d = wrapLon(lon - grid.west);
    if (span < 360 && d > span + (360 - span) / 2) d -= 360;
    return { x: d * grid.ppdLon - 0.5, y: (grid.north - lat) * grid.ppdLat - 0.5 };
  }
  function wrapLon(lon) { return ((lon % 360) + 360) % 360; }
  function inside(grid, lat, lon) {
    var p = gridIndex(grid, lat, lon);
    return p.x >= -0.5 && p.y >= -0.5 && p.x <= grid.w - 0.5 && p.y <= grid.h - 0.5;
  }
  function cell(grid, x, y) {
    x = Math.max(0, Math.min(grid.w - 1, x)); y = Math.max(0, Math.min(grid.h - 1, y));
    return grid.data[y * grid.w + x];
  }
  // Bilinear elevation in metres, or null outside the crop.
  function elevation(grid, lat, lon) {
    if (!grid || !inside(grid, lat, lon)) return null;
    var p = gridIndex(grid, lat, lon), x0 = Math.floor(p.x), y0 = Math.floor(p.y), fx = p.x - x0, fy = p.y - y0;
    var a = cell(grid, x0, y0), b = cell(grid, x0 + 1, y0), c = cell(grid, x0, y0 + 1), d = cell(grid, x0 + 1, y0 + 1);
    return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + c * (1 - fx) * fy + d * fx * fy;
  }
  function pixelKm(grid, lat) {
    return { x: KM_PER_DEG * Math.cos(lat * Math.PI / 180) / grid.ppdLon, y: KM_PER_DEG / grid.ppdLat };
  }
  // Slope in degrees at a grid cell, from central differences over the MOLA pixel spacing.
  function slopeAt(grid, x, y) {
    var lat = grid.north - (y + 0.5) / grid.ppdLat, px = pixelKm(grid, lat);
    var dzdx = (cell(grid, x + 1, y) - cell(grid, x - 1, y)) / (2 * px.x * 1000);
    var dzdy = (cell(grid, x, y + 1) - cell(grid, x, y - 1)) / (2 * px.y * 1000);
    return Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * 180 / Math.PI;
  }
  function reliefAt(grid, x, y) {
    var lo = Infinity, hi = -Infinity;
    for (var j = -1; j <= 1; j++) for (var i = -1; i <= 1; i++) { var v = cell(grid, x + i, y + j); if (v < lo) lo = v; if (v > hi) hi = v; }
    return hi - lo;
  }

  // ---- Ellipses on the sphere (local flat approximation, fine at < ~300 km) --------
  // e: { lat, lon, a (major, km), b (minor, km), angle (degrees, 0 = major axis east-west, CCW) }
  function toLocalKm(e, lat, lon) {
    var dLon = wrapLon(lon - e.lon + 180) - 180;
    return { x: dLon * KM_PER_DEG * Math.cos(e.lat * Math.PI / 180), y: (lat - e.lat) * KM_PER_DEG };
  }
  function fromLocalKm(e, x, y) {
    return { lat: e.lat + y / KM_PER_DEG, lon: wrapLon(e.lon + x / (KM_PER_DEG * Math.cos(e.lat * Math.PI / 180))) };
  }
  function inEllipse(e, lat, lon) {
    var p = toLocalKm(e, lat, lon), t = -e.angle * Math.PI / 180;
    var u = p.x * Math.cos(t) - p.y * Math.sin(t), v = p.x * Math.sin(t) + p.y * Math.cos(t);
    return (u * u) / (e.a * e.a / 4) + (v * v) / (e.b * e.b / 4) <= 1;
  }
  function distanceKm(lat1, lon1, lat2, lon2) {
    var r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
  }
  // Grid cells whose centres fall inside the ellipse.
  function cellsIn(grid, e) {
    var out = [], halfA = e.a / 2;
    var dLat = halfA / KM_PER_DEG + 1 / grid.ppdLat, dLon = halfA / (KM_PER_DEG * Math.cos(e.lat * Math.PI / 180)) + 1 / grid.ppdLon;
    var a = gridIndex(grid, e.lat + dLat, e.lon - dLon), b = gridIndex(grid, e.lat - dLat, e.lon + dLon);
    var x0 = Math.max(0, Math.floor(a.x)), x1 = Math.min(grid.w - 1, Math.ceil(b.x)), y0 = Math.max(0, Math.floor(a.y)), y1 = Math.min(grid.h - 1, Math.ceil(b.y));
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var lat = grid.north - (y + 0.5) / grid.ppdLat, lon = grid.west + (x + 0.5) / grid.ppdLon;
      if (inEllipse(e, lat, lon)) out.push({ x: x, y: y });
    }
    return out;
  }
  // Share of the ellipse area that lies on the bundled map (0..1), by sampling.
  function coverage(grid, e) {
    var n = 0, on = 0;
    for (var i = 0; i < 24; i++) for (var j = 0; j < 12; j++) {
      var r = Math.sqrt((j + 0.5) / 12), th = (i / 24) * Math.PI * 2;
      var u = r * Math.cos(th) * e.a / 2, v = r * Math.sin(th) * e.b / 2, t = e.angle * Math.PI / 180;
      var p = fromLocalKm(e, u * Math.cos(t) - v * Math.sin(t), u * Math.sin(t) + v * Math.cos(t));
      n++; if (inside(grid, p.lat, p.lon)) on++;
    }
    return on / n;
  }

  // ---- Game-only engineers' check ---------------------------------------------
  // Thresholds are game rules for a children's simulation, calibrated on MOLA data so that the
  // real published ellipses of Curiosity, Perseverance, Spirit, Opportunity, InSight, Phoenix,
  // Pathfinder and the Vikings rate green or yellow, while crater rims and mountain flanks rate red.
  // (Real sites: <= 11% of cells steeper than 5°, ~0% with > 250 m local relief. Gale's rim: 89%
  // and 25%.) MOLA pixels are hundreds of metres wide; real teams use much finer images.
  var RULES = { lowElev: -1000, highElev: 1000, steepDeg: 5, steepOk: 0.12, steepBad: 0.3, reliefM: 250, reliefOk: 0.02, reliefBad: 0.1, reachOk: 10, reachFar: 50 };
  function grade(value, ok, bad) { return value <= ok ? 'green' : value <= bad ? 'yellow' : 'red'; }
  function check(grid, e, target) {
    var cells = cellsIn(grid, e), n = cells.length;
    var res = { cells: n, coverage: coverage(grid, e), factors: [] };
    if (!n) return res;
    var sum = 0, steep = 0, rough = 0;
    cells.forEach(function (c) { sum += cell(grid, c.x, c.y); if (slopeAt(grid, c.x, c.y) > RULES.steepDeg) steep++; if (reliefAt(grid, c.x, c.y) > RULES.reliefM) rough++; });
    var mean = sum / n;
    res.meanElevation = Math.round(mean);
    res.factors.push({ id: 'elevation', value: Math.round(mean), level: mean <= RULES.lowElev ? 'green' : mean <= RULES.highElev ? 'yellow' : 'red' });
    res.factors.push({ id: 'slopes', value: steep / n, level: grade(steep / n, RULES.steepOk, RULES.steepBad) });
    res.factors.push({ id: 'cliffs', value: rough / n, level: grade(rough / n, RULES.reliefOk, RULES.reliefBad) });
    if (target) {
      var d = distanceKm(e.lat, e.lon, target.lat, target.lon), inside2 = inEllipse(e, target.lat, target.lon);
      res.factors.push({ id: 'science', value: Math.round(d), inside: inside2, level: inside2 || d <= RULES.reachOk ? 'green' : d <= RULES.reachFar ? 'yellow' : 'red' });
    }
    if (res.coverage < 0.95) res.factors.push({ id: 'offmap', value: res.coverage, level: 'yellow' });
    res.reds = res.factors.filter(function (f) { return f.level === 'red'; }).length;
    return res;
  }

  // ---- Touchdown --------------------------------------------------------------
  function rng(seed) { // mulberry32: small, deterministic
    var s = seed >>> 0;
    return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function gauss(rand) { var u = 1 - rand(), v = rand(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  // A random point inside the ellipse, more likely near the centre (Gaussian, clipped by redraw).
  function touchdown(e, seed) {
    var rand = rng(seed || 1), t = e.angle * Math.PI / 180;
    for (var i = 0; i < 64; i++) {
      var u = gauss(rand) * e.a / 2 / 2.2, v = gauss(rand) * e.b / 2 / 2.2;
      if ((u * u) / (e.a * e.a / 4) + (v * v) / (e.b * e.b / 4) > 1) continue;
      return fromLocalKm(e, u * Math.cos(t) - v * Math.sin(t), u * Math.sin(t) + v * Math.cos(t));
    }
    return { lat: e.lat, lon: e.lon };
  }
  function localSurface(grid, lat, lon) {
    if (!grid || !inside(grid, lat, lon)) return null;
    var p = gridIndex(grid, lat, lon), x = Math.round(p.x), y = Math.round(p.y);
    return { elevation: Math.round(elevation(grid, lat, lon)), slope: +slopeAt(grid, x, y).toFixed(2), relief: reliefAt(grid, x, y), x: x, y: y };
  }
  // Terrain-Relative Navigation (Perseverance): the lander compares camera images with a map and
  // steers to the safest reachable spot. Game version: pick the gentlest cell within ~1 km.
  function divert(grid, lat, lon) {
    var here = localSurface(grid, lat, lon);
    if (!here) return { lat: lat, lon: lon, moved: false };
    var best = { lat: lat, lon: lon, s: here.slope + here.relief / 100 }, step = 1 / grid.ppdLat;
    for (var j = -2; j <= 2; j++) for (var i = -2; i <= 2; i++) {
      var la = lat + j * step, lo = lon + i * step * grid.ppdLat / grid.ppdLon;
      if (distanceKm(lat, lon, la, lo) > 1.0) continue;
      var s = localSurface(grid, la, lo); if (!s) continue;
      var score = s.slope + s.relief / 100;
      if (score < best.s - 1e-6) best = { lat: la, lon: lo, s: score };
    }
    return { lat: best.lat, lon: best.lon, moved: best.lat !== lat || best.lon !== lon };
  }
  // Game outcome from the ground under the lander and the landing technique's tolerance.
  var TOLERANCE = { airbags: { slope: 6, relief: 300 }, legs: { slope: 3, relief: 150 }, skycrane: { slope: 4, relief: 200 } };
  function outcome(surface, tech) {
    if (!surface) return 'unknown';
    var tol = TOLERANCE[tech] || TOLERANCE.legs;
    if (surface.slope <= tol.slope * 0.5 && surface.relief <= tol.relief * 0.5) return 'smooth';
    if (surface.slope <= tol.slope && surface.relief <= tol.relief) return 'bumpy';
    return 'tipped';
  }
  function land(grid, e, eraInfo, seed) {
    var p = touchdown(e, seed), diverted = false;
    if (eraInfo && eraInfo.trn) { var d = divert(grid, p.lat, p.lon); diverted = d.moved; p = { lat: d.lat, lon: d.lon }; }
    var s = localSurface(grid, p.lat, p.lon);
    return { lat: p.lat, lon: p.lon, surface: s, diverted: diverted, result: outcome(s, eraInfo && eraInfo.tech) };
  }

  // ---- Decoding terrain-RGB pixels (browser canvas or tests) ----------------------
  function decodeRGBA(rgba, w, h) {
    var out = new Int16Array(w * h);
    for (var i = 0; i < w * h; i++) out[i] = rgba[i * 4] * 256 + rgba[i * 4 + 1] - 32768;
    return out;
  }

  root.LandingLab = {
    R_KM: R_KM, KM_PER_DEG: KM_PER_DEG, RULES: RULES, TOLERANCE: TOLERANCE,
    elevation: elevation, inside: inside, slopeAt: slopeAt, reliefAt: reliefAt, pixelKm: pixelKm,
    toLocalKm: toLocalKm, fromLocalKm: fromLocalKm, inEllipse: inEllipse, distanceKm: distanceKm, cellsIn: cellsIn, coverage: coverage,
    check: check, rng: rng, touchdown: touchdown, divert: divert, localSurface: localSurface, outcome: outcome, land: land,
    decodeRGBA: decodeRGBA, wrapLon: wrapLon,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.LandingLab;
})(typeof window !== 'undefined' ? window : globalThis);
