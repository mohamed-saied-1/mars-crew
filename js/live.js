// Tries to reach real, current space weather. Everything here is optional:
// if the network or the feeds are down, the game plays on saved NASA records
// and says so. Saved data is never shown as live.
(function (root) {
  'use strict';

  // api.nasa.gov's public demo key. Replace with your own for heavier use.
  var NASA_KEY = 'DEMO_KEY';

  function fetchJson(url, ms) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, ms);
    return fetch(url, { signal: ctrl.signal }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).catch(function (e) { clearTimeout(timer); throw e; });
  }

  function isoDay(ms) { return new Date(ms).toISOString().slice(0, 10); }

  function fromDonki() {
    var now = Date.now();
    var url = 'https://api.nasa.gov/DONKI/FLR?startDate=' + isoDay(now - 30 * 864e5) + '&endDate=' + isoDay(now) + '&api_key=' + NASA_KEY;
    return fetchJson(url, 7000).then(function (list) {
      if (!Array.isArray(list) || !list.length) throw new Error('empty');
      return {
        source: 'NASA DONKI',
        records: list.map(function (r) {
          return { id: r.flrID, cls: r.classType, begin: r.beginTime, loc: r.sourceLocation || '', region: r.activeRegionNum || null, instrument: ((r.instruments || [])[0] || {}).displayName || '' };
        }),
      };
    });
  }

  function fromNoaa() {
    return fetchJson('https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json', 7000).then(function (list) {
      if (!Array.isArray(list) || !list.length) throw new Error('empty');
      return {
        source: 'NOAA SWPC (GOES)',
        records: list.map(function (r) {
          return { id: 'NOAA-' + r.begin_time, cls: r.max_class, begin: r.begin_time, loc: '', region: null, instrument: 'GOES-' + (r.satellite || '') };
        }),
      };
    });
  }

  var CACHE_KEY = 'marscrew.live', CACHE_MS = 30 * 60 * 1000;

  function readCache() {
    try {
      var c = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (c && Date.now() - Date.parse(c.fetchedAt) < CACHE_MS) return c;
    } catch (e) { /* no cache is fine */ }
    return null;
  }

  function writeCache(res) {
    res.fetchedAt = new Date().toISOString();
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(res)); } catch (e) { /* no cache is fine */ }
    return res;
  }

  // Resolves to a season object for live play, or null.
  function load() {
    var saved = typeof localStorage !== 'undefined' ? readCache() : null;
    var get = saved ? Promise.resolve(saved) : fromDonki().catch(fromNoaa).then(writeCache);
    return get.then(function (res) {
      var season = root.NASA.seasonFromLive(res.records, { source: res.source, fetchedAt: res.fetchedAt });
      var latest = res.records.slice().sort(function (a, b) { return a.begin < b.begin ? 1 : -1; })[0];
      season.latest = latest;
      return season;
    }).catch(function () { return null; });
  }

  root.LiveData = { load: load };
})(typeof window !== 'undefined' ? window : globalThis);
