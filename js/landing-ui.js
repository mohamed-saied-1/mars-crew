// Mars Explorer screen (it opens from the "Landing Lab" menu entry): the real Mars globe, real
// places where spacecraft landed, and craters. Exploring only: there is no landing game here.
// Facts: js/craters.js. Map maths: js/landing-lab.js. Drawing: js/mars-map.js.
(function (root) {
  'use strict';
  var t = function (k, v) { return root.I18N.t(k, v); };
  var C = root.Craters, LL = root.LandingLab, MM = root.MarsMap;
  var S = null;

  function h() { return root.UI.h.apply(null, arguments); }
  function lang() { return root.I18N.lang === 'ar' ? 'ar' : 'en'; }
  function L(o) { return o ? (o[lang()] || o.en) : ''; }
  function fmtLat(v) { return Math.abs(v).toFixed(2) + '°' + (v >= 0 ? 'N' : 'S'); }
  function fmtLon(v) { return LL.wrapLon(v).toFixed(2) + '°E'; }
  function fmtKm(v) { return v >= 100 ? Math.round(v).toLocaleString('en-US') : v >= 10 ? v.toFixed(1) : v.toFixed(2); }
  function terrainCredit(grid) { return t('ll_terrain_credit', { res: grid.metresPerPixel }) + (grid.coarse ? ' · ' + t('ll_terrain_coarse') : ''); }

  // Which place a crater belongs to, so a crater page can lead to its place.
  var CRATER_REGION = { gale: 'gale', jezero: 'jezero', belva: 'jezero', gusev: 'gusev', endeavour: 'meridiani', victoria: 'meridiani', heimdal: 'phoenix' };
  // A picture for each place, so a child can choose without reading much.
  var SITE_ICON = { gale: '⛰️', jezero: '🌊', gusev: '🪨', meridiani: '🫐', elysium: '🎧', chryse: '🛬', utopia: '❄️', phoenix: '🧊' };
  var SITE_IMAGE = { gale: 'PIA14291', jezero: 'PIA24483', gusev: 'PIA04260', meridiani: 'PIA15036', elysium: 'PIA22878', phoenix: 'PIA10705' };
  var PIN = '#ff6b5a', CRATER = '#ffd166';

  // ---- Screen ----------------------------------------------------------------
  function open(app) {
    var canvas = h('canvas', { class: 'lab-map', 'aria-label': t('ll_globe') });
    var status = h('div', { class: 'lab-status', 'aria-live': 'polite' });
    var panel = h('aside', { class: 'lab-panel' });
    // The big button the child presses at each landing moment.
    var landBtn = h('button', { type: 'button', class: 'lab-land-btn', hidden: true, onclick: function () { pressLanding(); } });
    var shell = h('div', { class: 'lab-shell' }, [
      h('div', { class: 'lab-top' }, [
        h('div', {}, [h('h1', { text: t('ll_title') }), h('p', { class: 'muted', text: t('ll_sub') })]),
        h('div', { class: 'row' }, [
          h('button', { type: 'button', text: t('langName'), onclick: function () { app.toggleLang(); } }),
          h('button', { type: 'button', text: t('ll_home'), onclick: function () { app.go('title'); } }),
        ]),
      ]),
      h('div', { class: 'lab-body' }, [panel, h('div', { class: 'lab-stage' }, [canvas, status, landBtn])]),
    ]);
    var keep = S && S.app === app ? S : null;
    S = {
      app: app, shell: shell, canvas: canvas, panel: panel, status: status, landBtn: landBtn, mode: 'globe', globe: keep ? keep.globe : MM.createGlobe(),
      region: null, view: null, feature: keep ? keep.feature : null, place: null, dirty: true, hover: null, drag: null, land: null,
    };
    root.UI.show('lab-mode', shell);
    bindInput();
    renderPanel();
    setStatus(t('ll_loading'));
    MM.loadTexture().then(function () { setStatus(''); S && (S.dirty = true); }).catch(function () { setStatus(t('ll_load_fail')); });
    if (keep && keep.mode !== 'globe' && (keep.view || keep.land)) {
      // Language toggle redraws the screen: keep the current place (and a landing in progress).
      S.mode = keep.mode; S.view = keep.view; S.region = keep.region; S.place = keep.place; S.land = keep.land;
      renderPanel();
    }
  }
  function setStatus(text) { if (S) { S.status.textContent = text || ''; S.status.hidden = !text; } }

  // ---- Panel content ------------------------------------------------------------
  function renderPanel() {
    if (!S) return;
    var p = S.panel;
    p.textContent = '';
    var nodes = S.mode === 'landing' ? landingPanel() : S.mode === 'place' ? placePanel() : S.mode === 'region' ? craterPanel() : globePanel();
    nodes.forEach(function (n) { if (n) p.appendChild(n); });
    p.scrollTop = 0;
  }
  // Kid view first. Numbers, sources and credits wait in one closed box for grown-ups.
  function grownUps(nodes) {
    return h('details', { class: 'teach lab-grownups' }, [h('summary', { text: t('ll_kids_more') })].concat(nodes));
  }
  function landerName(l) { return l.label ? L(l.label) : L(C.era(l.era).mission); }
  function landerNames(r) { return r.landers.map(landerName).join(lang() === 'ar' ? ' و ' : ' & '); }
  function cratersOf(regionId) { return C.FEATURES.filter(function (f) { return CRATER_REGION[f.id] === regionId; }); }
  function crateChip(f) { return h('button', { type: 'button', class: 'lab-chip' + (S.feature === f.id ? ' on' : ''), onclick: function () { selectFeature(f.id); } }, ['◯ ' + L(f.name)]); }
  // What the markers on the map mean.
  function legend() {
    return h('div', { class: 'lab-legend' }, [
      h('span', {}, [h('i', { class: 'lab-legend-pin', 'aria-hidden': 'true' }), t('ll_legend_place')]),
      h('span', {}, [h('i', { class: 'lab-legend-ring', 'aria-hidden': 'true' }), t('ll_legend_crater')]),
    ]);
  }
  function globePanel() {
    var places = C.REGIONS.map(function (r) {
      return h('button', { type: 'button', class: 'lab-site', onclick: function () { openPlace(r.id); } }, [
        h('span', { class: 'lab-site-icon', 'aria-hidden': 'true', text: SITE_ICON[r.id] || '📍' }),
        h('span', { class: 'lab-site-text' }, [h('strong', { text: L(r.name) }), h('small', { text: t('ll_site_' + r.id) }), h('em', { text: t('ll_k_landed', { rover: landerNames(r) }) })]),
      ]);
    });
    return [
      h('p', { class: 'lab-hint', text: t('ll_hint_globe') }),
      legend(),
      h('h2', { text: t('ll_k_pick') }), h('div', { class: 'lab-sites' }, places),
      h('h2', { text: t('ll_k_more_craters') }), h('div', { class: 'lab-chips' }, C.FEATURES.map(crateChip)),
      grownUps([h('p', { class: 'lab-credit', text: t('ll_globe_credit') })]),
    ];
  }
  function sourceLinks(keys) {
    return h('ul', { class: 'clean lab-sources' }, keys.map(function (k) { var url = C.src(k); return url ? h('li', {}, [h('a', { href: url, target: '_blank', rel: 'noopener', text: url.replace(/^https?:\/\//, '').slice(0, 64) })]) : null; }));
  }
  function imageBlock(id) {
    var img = C.IMAGES[id]; if (!img) return null;
    return h('figure', { class: 'lab-figure' }, [
      h('img', { src: img.file, alt: img.title, loading: 'lazy' }),
      h('figcaption', {}, [h('strong', { text: (img.kind === 'illustration' ? t('ll_illustration') : t('ll_picture')) + ': ' }), img.title + ' (' + id + '). ', h('span', { text: 'Credit: ' + img.credit + '. ' }), h('a', { href: img.url, target: '_blank', rel: 'noopener', text: 'NASA' })]),
    ]);
  }
  function voiceBlock(f) {
    // A recording counts only if a confirmed clip exists in the current language.
    var app = S.app, recorded = !!(root.Voice && root.Voice.has && root.Voice.has(f.voice));
    var note = recorded ? t('ll_rec_ready') : t('ll_rec_missing');
    return h('div', { class: 'lab-voice' }, [
      recorded ? h('button', { type: 'button', text: t('ll_listen'), onclick: function () { app.labCrater(f.id, true); } }) : null,
      h('button', { type: 'button', text: t('ll_stop'), onclick: function () { app.stopVoice(); } }),
      h('small', { class: 'muted', text: note }),
    ]);
  }
  function craterPanel() {
    var f = C.get(S.feature);
    if (!f) return globePanel();
    var region = C.region(CRATER_REGION[f.id]);
    var facts = f.facts.map(function (x) { return h('li', {}, [L(x), ' ', h('span', { class: 'lab-cite' }, x.src.map(function (k, i) { return h('a', { href: C.src(k), target: '_blank', rel: 'noopener', text: '[' + (i + 1) + ']' }); }))]); });
    return [
      h('button', { type: 'button', class: 'link', text: '← ' + t('ll_back_globe'), onclick: backToGlobe }),
      h('h2', { class: 'lab-name', text: '◯ ' + L(f.name) }),
      h('div', { class: 'lab-kids' }, [root.UI.portrait('dusty', 52), h('p', { text: L(f.kids) })]),
      voiceBlock(f),
      imageBlock(f.image),
      region ? h('button', { type: 'button', class: 'primary big', text: (SITE_ICON[region.id] || '📍') + ' ' + t('ll_k_explore_place', { place: L(region.name) }), onclick: function () { openPlace(region.id); } }) : null,
      grownUps([
        h('p', { class: 'muted', text: (f.kind === 'basin' ? t('ll_type_basin') : t('ll_type_crater')) + ' · ' + t('ll_official', { year: f.adopted }) + ' · ' + t('ll_named', { who: L(f.namesake) }) }),
        h('dl', { class: 'lab-dl' }, [
          h('dt', { text: t('ll_location') }), h('dd', { text: t('ll_coords', { lat: fmtLat(f.lat), lon: fmtLon(f.lon) }) }),
          h('dt', { text: t('ll_diameter') }), h('dd', {}, [t('ll_diameter_v', { km: fmtKm(f.diameterKm) }), f.nasaSize ? h('small', { class: 'muted', text: ' · ' + f.nasaSize.en }) : null]),
        ]),
        h('h3', { text: t('ll_facts') }), h('ul', { class: 'lab-facts' }, facts),
        h('p', { text: L(f.more) }),
        h('h3', { text: t('ll_sources') }), sourceLinks(['gz_' + f.id].concat(f.sources.filter(function (k) { return k !== 'gz_' + f.id; }))),
        S.region ? h('p', { class: 'lab-credit', text: terrainCredit(S.region) }) : null,
      ]),
    ];
  }
  // A place where a spacecraft landed: what it is, who visited, what they found.
  function placePanel() {
    var r = C.region(S.place);
    if (!r) return globePanel();
    var visitors = r.landers.map(function (l) { return h('span', { class: 'lab-visitor' }, ['🚀 ' + landerName(l) + ' · ' + C.era(l.era).year]); });
    var craters = cratersOf(r.id);
    var landers = r.landers.map(function (l) { return h('li', {}, [landerName(l) + ' · ' + t('ll_landed_on', { date: l.date }) + ' · ' + fmtLat(l.lat) + ', ' + fmtLon(l.lon) + (l.approx ? ' (' + t('ll_approx') + ')' : ''), l.note ? h('small', { class: 'muted', text: ' ' + L(l.note) }) : null, ' ', h('a', { href: C.src(l.src), target: '_blank', rel: 'noopener', text: '[source]' })]); });
    return [
      h('button', { type: 'button', class: 'link', text: '← ' + t('ll_back_globe'), onclick: backToGlobe }),
      h('h2', { class: 'lab-name', text: (SITE_ICON[r.id] || '📍') + ' ' + L(r.name) }),
      h('p', { class: 'lab-place-what', text: t('ll_site_' + r.id) }),
      h('div', { class: 'lab-kids' }, [root.UI.portrait('dusty', 52), h('p', { text: t('ll_find_' + r.id) })]),
      h('h3', { text: t('ll_k_visitors') }), h('div', { class: 'lab-visitors' }, visitors),
      h('div', { class: 'lab-land-picks' }, r.landers.map(function (l, i) {
        return h('button', { type: 'button', class: 'primary big', text: '🚀 ' + t('ll_land_btn', { rover: landerName(l) }), onclick: function () { startLanding(r.id, i); } });
      })),
      craters.length ? h('h3', { text: t('ll_k_craters_here') }) : null,
      craters.length ? h('div', { class: 'lab-chips' }, craters.map(crateChip)) : null,
      SITE_IMAGE[r.id] ? imageBlock(SITE_IMAGE[r.id]) : null,
      h('p', { class: 'lab-hint', text: t('ll_k_map_hint') }),
      grownUps([
        h('h3', { text: t('ll_real_landers') }), h('ul', { class: 'clean lab-sources' }, landers),
        S.region ? h('p', { class: 'lab-credit', text: terrainCredit(S.region) }) : null,
      ]),
    ];
  }

  // A landing the child helps with: the panel says who is landing, how, and the stars so far.
  function landingPanel() {
    var L0 = S.land, r = C.region(L0.region), l = r.landers[L0.lander], e = C.era(l.era), name = landerName(l);
    var stars = h('p', { class: 'lab-stars', text: '⭐'.repeat(L0.stars) + '☆'.repeat(Math.max(0, L0.need - L0.stars)) });
    return [
      h('button', { type: 'button', class: 'link', text: '← ' + t('ll_back_place', { place: L(r.name) }), onclick: function () { stopLanding(); openPlace(r.id); } }),
      h('h2', { class: 'lab-name', text: '🚀 ' + (L0.done ? t('ll_land_done', { rover: name }) : t('ll_land_title', { rover: name })) }),
      h('p', { class: 'lab-place-what', text: t('ll_tech_' + (e.tech || 'legs')) }),
      L0.done ? null : h('p', { class: 'lab-hint', text: t('ll_land_press') }),
      h('p', { class: 'muted', text: t('ll_land_stars', { n: L0.stars, of: L0.need }) }), stars,
      L0.done ? h('p', { text: t('ll_land_real', { min: C.STATS.edlMinutes }) }) : null,
      L0.done ? h('button', { type: 'button', class: 'primary big', text: '🚀 ' + t('ll_land_again'), onclick: function () { startLanding(L0.region, L0.lander); } }) : null,
      grownUps([h('p', { class: 'muted', text: t('ll_edl_note', { min: C.STATS.edlMinutes, kph: C.STATS.entryKph.toLocaleString('en-US') }) }), h('a', { href: C.src(C.STATS.src), target: '_blank', rel: 'noopener', text: '[source]' })]),
    ];
  }

  // ---- Landing a real rover -----------------------------------------------------
  // The animation stops at each big moment until the child presses the button (or Space).
  // A quick press earns a star. Each lander lands the way it really did: legs, airbags or sky crane.
  var ACTION = { edl_chute: 'chute', edl_retro: 'retro', edl_airbags: 'airbags', edl_powered: 'powered', edl_crane: 'crane' };
  function startLanding(regionId, i) {
    var r = C.region(regionId), l = r && r.landers[i || 0];
    if (!l) return;
    var era = C.era(l.era), stages = root.EDL.stagesFor(era);
    S.mode = 'landing'; S.view = null; S.region = null; S.place = regionId; S.feature = null; S.dirty = true;
    S.land = { region: regionId, lander: i || 0, era: era, t: 0, wait: null, waited: 0, pressed: {}, stars: 0, done: false, speed: S.landSpeed || 1,
      need: stages.filter(function (s) { return ACTION[s.key]; }).length, spoke: {} };
    S.app.stopVoice();
    renderPanel();
  }
  function stopLanding() { S.land = null; S.landBtn.hidden = true; }
  function pressLanding() {
    var L0 = S.land;
    if (!L0 || !L0.wait) return;
    L0.pressed[L0.wait.key] = true;
    if (L0.waited < 2) { L0.stars++; S.app.labSay('⭐ ' + t('ll_land_perfect'), 'happy', 'land-star:' + L0.wait.key + ':' + L0.stars, 40, null); }
    L0.wait = null; S.landBtn.hidden = true;
    renderPanel();
  }
  function stepLanding(dt) {
    var L0 = S.land, era = L0.era;
    if (L0.done) { L0.party = (L0.party || 0) + dt; return; }
    if (L0.wait) { L0.waited += dt; return; }
    var next = L0.t + dt * L0.speed, stages = root.EDL.stagesFor(era);
    // Stop at the start of a stage that needs the child's help.
    for (var i = 0; i < stages.length; i++) {
      var s = stages[i];
      if (ACTION[s.key] && !L0.pressed[s.key] && L0.t <= s.start && next >= s.start) {
        L0.t = s.start; L0.wait = s; L0.waited = 0;
        S.landBtn.textContent = t('ll_btn_' + ACTION[s.key]); S.landBtn.hidden = false;
        return;
      }
    }
    L0.t = next;
    var key = root.EDL.stageAt(era, L0.t).stage.key;
    if (key === 'edl_entry' && !L0.spoke.entry) { L0.spoke.entry = true; S.app.labSay(t('ll_dusty_entry'), 'alert', 'lab-entry:' + L0.region + ':' + Date.now(), 55, 'dusty_lab_entry'); }
    if (L0.t >= root.EDL.totalTime(era)) {
      L0.done = true; L0.party = 0; renderPanel();
      S.app.labSay(t('ll_dusty_landed'), 'celebrating', 'lab-landed:' + L0.region + ':' + Date.now(), 55, 'dusty_lab_landed');
    }
  }

  // ---- Actions ------------------------------------------------------------------
  function selectFeature(id) {
    var f = C.get(id); if (!f) return;
    stopLanding();
    S.feature = id; S.place = null; S.mode = 'region'; S.region = null; S.view = null; S.dirty = true;
    renderPanel();
    S.app.labCrater(id, false);
    S.globe.flyTo(f.lat, f.lon, 3.2, function () {
      if (!f.terrain || !S || S.feature !== id) return;
      enterTerrain(f.terrain, f.lat, f.lon, Math.max(f.diameterKm, 8) * 1.6);
    });
  }
  function openPlace(regionId) {
    var r = C.region(regionId); if (!r) return;
    var first = r.landers[0];
    stopLanding();
    S.place = regionId; S.feature = null; S.mode = 'place'; S.region = null; S.view = null; S.dirty = true;
    renderPanel();
    S.app.stopVoice();
    S.globe.flyTo(first.lat, first.lon, 3.2, function () {
      if (!S || S.place !== regionId) return;
      enterTerrain(r.terrain, first.lat, first.lon, 90);
    });
  }
  function enterTerrain(id, lat, lon, spanKm) {
    setStatus(t('ll_loading'));
    MM.loadTerrain(id).then(function (grid) {
      if (!S) return;
      setStatus('');
      var r = S.canvas.getBoundingClientRect();
      S.region = grid; S.view = MM.createRegion(grid, r.width, r.height, { palette: 'mars' });
      S.view.centreOn(lat, lon);
      if (spanKm) { var k = S.view.kmToPx(lat); var want = Math.min(r.width, r.height) * 0.8 / (spanKm * k.y); S.view.zoomAt(r.width / 2, r.height / 2, Math.max(1, want)); S.view.centreOn(lat, lon); }
      S.dirty = true;
      renderPanel();
    }).catch(function () { setStatus(t('ll_load_fail')); });
  }
  function backToGlobe() {
    stopLanding();
    S.mode = 'globe'; S.region = null; S.view = null; S.place = null; S.dirty = true;
    S.app.stopVoice();
    S.globe.flyTo(S.globe.view.lat, S.globe.view.lon, 1);
    renderPanel();
  }

  // ---- Input ---------------------------------------------------------------------
  function localXY(ev) { var r = S.canvas.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top, w: r.width, h: r.height }; }
  function bindInput() {
    var cv = S.canvas;
    cv.addEventListener('pointerdown', function (ev) {
      if (!S) return;
      var p = localXY(ev); cv.setPointerCapture(ev.pointerId);
      S.drag = { x: p.x, y: p.y, moved: 0 };
      if (!S.view) S.globe.setDragging(true);
    });
    cv.addEventListener('pointermove', function (ev) {
      if (!S) return;
      var p = localXY(ev);
      S.hover = p; S.dirty = true;
      if (!S.drag || S.mode === 'landing') return;
      var dx = p.x - S.drag.x, dy = p.y - S.drag.y; S.drag.moved += Math.abs(dx) + Math.abs(dy); S.drag.x = p.x; S.drag.y = p.y;
      if (!S.view) { var r = S.globe.radius(p.w, p.h); S.globe.rotate(dy / r * 57.3, -dx / r * 57.3); }
      else S.view.pan(dx, dy);
    });
    function end(ev) {
      if (!S || !S.drag) return;
      var click = S.drag.moved < 6; S.drag = null; S.globe.setDragging(false); S.dirty = true;
      // During a landing a tap anywhere on the scene is the same as the big button.
      if (S.mode === 'landing') { if (click) pressLanding(); return; }
      if (click) pick(localXY(ev));
    }
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', function () { if (S) { S.drag = null; S.globe.setDragging(false); } });
    cv.addEventListener('pointerleave', function () { if (S) { S.hover = null; S.dirty = true; } });
    cv.addEventListener('wheel', function (ev) {
      if (!S) return; ev.preventDefault();
      var p = localXY(ev), f = Math.pow(1.0015, -ev.deltaY);
      if (S.view) S.view.zoomAt(p.x, p.y, f); else S.globe.setZoom(S.globe.view.zoom * f);
      S.dirty = true;
    }, { passive: false });
    S.onKey = function (ev) {
      if (!S || !S.shell.isConnected || /INPUT|TEXTAREA/.test((ev.target || {}).tagName || '')) return;
      var k = ev.key;
      if (S.mode === 'landing') {
        if ((k === ' ' || k === 'Enter') && S.land && S.land.wait) { ev.preventDefault(); pressLanding(); }
        return;
      }
      if (/^Arrow/.test(k)) {
        ev.preventDefault();
        if (S.view) S.view.pan(k === 'ArrowLeft' ? 40 : k === 'ArrowRight' ? -40 : 0, k === 'ArrowUp' ? 40 : k === 'ArrowDown' ? -40 : 0);
        else S.globe.rotate(k === 'ArrowUp' ? 5 : k === 'ArrowDown' ? -5 : 0, k === 'ArrowLeft' ? -8 : k === 'ArrowRight' ? 8 : 0);
        S.dirty = true; return;
      }
      if (k === '+' || k === '=') { if (S.view) { var r = S.canvas.getBoundingClientRect(); S.view.zoomAt(r.width / 2, r.height / 2, 1.25); } else S.globe.setZoom(S.globe.view.zoom * 1.25); S.dirty = true; }
      if (k === '-') { if (S.view) { var r2 = S.canvas.getBoundingClientRect(); S.view.zoomAt(r2.width / 2, r2.height / 2, 0.8); } else S.globe.setZoom(S.globe.view.zoom * 0.8); S.dirty = true; }
    };
    root.addEventListener('keydown', S.onKey);
  }
  // Where things are on screen right now, for clicks and hover.
  function placeSpots(w, hgt) {
    return C.REGIONS.map(function (r) {
      var l = r.landers[0];
      var q = S.view ? S.view.toScreen(l.lat, l.lon) : S.globe.project(l.lat, l.lon, w, hgt);
      if (S.view && r.terrain !== S.region.id) return null;
      return (S.view || q.visible) ? { region: r, x: q.x, y: q.y } : null;
    }).filter(Boolean);
  }
  function crateSpots(w, hgt) {
    return C.FEATURES.map(function (f) {
      if (S.view && f.terrain !== S.region.id) return null;
      var q = S.view ? S.view.toScreen(f.lat, f.lon) : S.globe.project(f.lat, f.lon, w, hgt);
      return (S.view || q.visible) ? { feature: f, x: q.x, y: q.y } : null;
    }).filter(Boolean);
  }
  function pick(p) {
    var best = null, bd = 20;
    // Pins stand above their spot, so their head is the place to click.
    placeSpots(p.w, p.h).forEach(function (s) { var d = Math.min(Math.hypot(s.x - p.x, s.y - 22 - p.y), Math.hypot(s.x - p.x, s.y - p.y)); if (d < bd) { bd = d; best = { region: s.region.id }; } });
    crateSpots(p.w, p.h).forEach(function (s) { var d = Math.hypot(s.x - p.x, s.y - p.y); if (d < bd - 4) { bd = d; best = { feature: s.feature.id }; } });
    if (best && best.feature && best.feature !== S.feature) selectFeature(best.feature);
    else if (best && best.region && best.region !== S.place) openPlace(best.region);
  }

  // ---- Drawing -----------------------------------------------------------------
  function frame(dt) {
    if (!S) return;
    if (!S.shell.isConnected) { root.removeEventListener('keydown', S.onKey); S = null; return; }
    var cv = S.canvas, dpr = Math.min(2, root.devicePixelRatio || 1), w = cv.clientWidth, hgt = cv.clientHeight;
    if (!w || !hgt) return;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(hgt * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(hgt * dpr); S.dirty = true; if (S.view) S.view.resize(w, hgt); }
    if (S.globe.ease(dt)) S.dirty = true;
    if (S.mode === 'landing' && S.land) {
      stepLanding(dt);
      var c0 = cv.getContext('2d'); c0.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawLanding(c0, w, hgt);
      return;
    }
    if (!S.dirty) return;
    S.dirty = false;
    var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (S.view) drawRegion(c, w, hgt); else drawGlobe(c, w, hgt);
  }
  // The landing scene: NASA-style stages drawn by js/edl.js, a short caption a child can read,
  // and confetti when the rover is down.
  var CONFETTI = ['#ffd166', '#ff6b6b', '#62d873', '#58b7f0', '#c792ea', '#ff9a2e'];
  function drawLanding(c, w, hgt) {
    var L0 = S.land, at = root.EDL.stageAt(L0.era, L0.t);
    root.EDL.draw(c, w, hgt, { era: L0.era, t: L0.t, diverted: false });
    var text = L0.done ? '🎉 ' + t('ll_land_done', { rover: landerName(C.region(L0.region).landers[L0.lander]) }) : t('ll_kid_' + at.stage.key);
    c.save();
    c.font = '800 ' + Math.round(Math.max(20, Math.min(34, w / 26))) + 'px ' + (root.Art ? root.Art.FONT : 'sans-serif');
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.direction = lang() === 'ar' ? 'rtl' : 'ltr';
    var tw = c.measureText(text).width + 44, y = 46;
    c.fillStyle = 'rgba(14,10,32,0.82)'; c.beginPath(); if (c.roundRect) c.roundRect(w / 2 - tw / 2, y - 28, tw, 56, 16); else c.rect(w / 2 - tw / 2, y - 28, tw, 56); c.fill();
    c.fillStyle = L0.done ? '#ffe066' : '#ffffff'; c.fillText(text, w / 2, y + 2);
    if (L0.done) {
      var p = L0.party;
      for (var i = 0; i < 80; i++) {
        var x = ((i * 137.5) % w) + Math.sin(p * 2 + i) * 14, yy = ((i * 53) % 120) - 40 + p * (90 + (i % 7) * 25);
        if (yy > hgt) continue;
        c.fillStyle = CONFETTI[i % CONFETTI.length]; c.fillRect(x, yy, 7, 11);
      }
      c.font = '800 ' + Math.round(Math.min(64, w / 12)) + 'px ' + (root.Art ? root.Art.FONT : 'sans-serif'); c.direction = 'ltr';
      c.fillText('⭐'.repeat(L0.stars) + '☆'.repeat(Math.max(0, L0.need - L0.stars)), w / 2, hgt * 0.3);
    }
    c.restore();
  }
  function label(c, text, x, y, color, size) {
    var fs = size || 12;
    c.save(); c.font = 'bold ' + fs + 'px ' + (root.Art ? root.Art.FONT : 'sans-serif'); c.textAlign = 'center';
    var tw = c.measureText(text).width + 12; c.fillStyle = 'rgba(10,12,26,0.8)';
    c.beginPath(); if (c.roundRect) c.roundRect(x - tw / 2, y - fs - 3, tw, fs + 8, 6); else c.rect(x - tw / 2, y - fs - 3, tw, fs + 8); c.fill();
    c.fillStyle = color || '#fff'; c.fillText(text, x, y); c.restore();
  }
  // A map pin: a round head with the place's picture, and a point at the exact spot.
  function pin(c, x, y, icon, big) {
    var r = big ? 15 : 12, hy = y - r - 10;
    c.save();
    c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(x, y + 1, 6, 2.5, 0, 0, 7); c.fill();
    c.fillStyle = PIN; c.strokeStyle = '#2a0c08'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - r * 0.62, hy + r * 0.55); c.arc(x, hy, r, Math.PI * 0.8, Math.PI * 0.2); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(x, hy, r - 3.5, 0, 7); c.fill();
    c.font = Math.round(r * 1.05) + 'px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(icon, x, hy + 1);
    c.restore();
    return hy - r;
  }
  function near(s, dist) { return S.hover && Math.hypot(S.hover.x - s.x, S.hover.y - s.y) < dist; }
  function drawGlobe(c, w, hgt) {
    c.fillStyle = '#07080f'; c.fillRect(0, 0, w, hgt);
    for (var i = 0; i < 120; i++) { c.fillStyle = 'rgba(220,230,255,' + (0.25 + (i % 5) * 0.12) + ')'; c.fillRect((i * 173.3) % w, (i * 97.7) % hgt, i % 7 ? 1 : 2, i % 7 ? 1 : 2); }
    S.globe.draw(c, w, hgt);
    var r = S.globe.radius(w, hgt), zoomed = S.globe.view.zoom > 1.6, hoverName = null;
    // Craters: a clear yellow ring at their real size.
    crateSpots(w, hgt).forEach(function (s) {
      var f = s.feature, rad = Math.max(6, r * (f.diameterKm / 2) / LL.R_KM), on = S.feature === f.id || near(s, Math.max(14, rad));
      c.lineWidth = on ? 4 : 2.5; c.strokeStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.arc(s.x, s.y, rad, 0, 7); c.stroke();
      c.lineWidth = on ? 3 : 1.8; c.strokeStyle = CRATER; c.beginPath(); c.arc(s.x, s.y, rad, 0, 7); c.stroke();
      if (zoomed || on) label(c, L(f.name), s.x, s.y + rad + 16, CRATER);
      if (near(s, Math.max(14, rad))) hoverName = hoverName || L(f.name);
    });
    // Places where spacecraft landed: big pins with their name, always shown. Pins first, then
    // names, so a name never hides under another pin; a name moves below its pin when crowded.
    var spots = placeSpots(w, hgt), taken = [];
    spots.forEach(function (s) { s.on = near({ x: s.x, y: s.y - 22 }, 18); s.top = pin(c, s.x, s.y, SITE_ICON[s.region.id] || '📍', s.on); if (s.on) hoverName = landerNames(s.region); });
    spots.forEach(function (s) {
      c.font = 'bold 13px ' + (root.Art ? root.Art.FONT : 'sans-serif');
      var half = c.measureText(L(s.region.name)).width / 2 + 8;
      var clash = function (y) {
        return taken.some(function (b) { return Math.abs(b.x - s.x) < b.half + half && Math.abs(b.y - y) < 20; }) ||
          spots.some(function (o) { return o !== s && Math.abs(o.x - s.x) < 18 + half && y > o.top - 12 && y - 16 < o.y; });
      };
      var y = s.top - 4;
      if (clash(y)) y = s.y + 20;
      taken.push({ x: s.x, y: y, half: half });
      label(c, L(s.region.name), s.x, y, '#fff', s.on ? 14 : 12);
    });
    if (hoverName && S.hover) label(c, hoverName, S.hover.x, S.hover.y + 30, CRATER, 13);
  }
  // Draws names after all the marks, nudging each one up or down until it overlaps no other name.
  function placeLabels(c, list, keepClear) {
    var boxes = (keepClear || []).slice();
    list.forEach(function (lb) {
      c.font = 'bold ' + lb.size + 'px ' + (root.Art ? root.Art.FONT : 'sans-serif');
      var half = c.measureText(lb.text).width / 2 + 8, steps = [0, 24, -24, 48, -48, 72], y = lb.y;
      for (var i = 0; i < steps.length; i++) {
        var ty = lb.y + steps[i];
        if (!boxes.some(function (b) { return Math.abs(b.x - lb.x) < b.half + half && Math.abs(b.y - ty) < (b.size + lb.size) / 2 + 8; })) { y = ty; break; }
      }
      boxes.push({ x: lb.x, y: y, half: half, size: lb.size });
      label(c, lb.text, lb.x, y, lb.color, lb.size);
    });
  }
  function drawRegion(c, w, hgt) {
    // A simple picture of the ground for kids: Mars colours with light and shadow, and names.
    var v = S.view, g = S.region, names = [], heads = [];
    v.draw(c);
    crateSpots(w, hgt).forEach(function (s) {
      var f = s.feature, k = v.kmToPx(f.lat), rx = Math.max(6, f.diameterKm / 2 * k.x), ry = Math.max(6, f.diameterKm / 2 * k.y), on = S.feature === f.id;
      c.lineWidth = on ? 5 : 3.5; c.strokeStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.ellipse(s.x, s.y, rx, ry, 0, 0, 7); c.stroke();
      c.lineWidth = on ? 3 : 2; c.strokeStyle = CRATER; c.beginPath(); c.ellipse(s.x, s.y, rx, ry, 0, 0, 7); c.stroke();
      names.push({ text: '◯ ' + L(f.name), x: s.x, y: s.y - ry - 6, color: CRATER, size: on ? 14 : 12, order: on ? 1 : 3 });
    });
    C.LANDMARKS.forEach(function (m) { var r = C.region(m.region); if (!r || r.terrain !== g.id) return; var q = v.toScreen(m.lat, m.lon); c.fillStyle = '#ff9a6b'; c.beginPath(); c.arc(q.x, q.y, 3, 0, 7); c.fill(); names.push({ text: L(m.name), x: q.x, y: q.y + 18, color: '#ffc9a8', size: 12, order: 4 }); });
    C.REGIONS.forEach(function (r) {
      if (r.terrain !== g.id) return;
      if (r.target) { var tq = v.toScreen(r.target.lat, r.target.lon); star(c, tq.x, tq.y, 10); names.push({ text: '🔬 ' + L(r.target.name), x: tq.x, y: tq.y - 16, color: '#c9ffc7', size: 12, order: 2 }); }
      r.landers.forEach(function (l) {
        var q = v.toScreen(l.lat, l.lon), top = pin(c, q.x, q.y, SITE_ICON[r.id] || '📍', S.place === r.id);
        heads.push({ x: q.x, y: top + (q.y - top - 10) / 2, half: 14, size: 2 }); // the round head
        names.push({ text: '🚀 ' + landerName(l) + ' · ' + C.era(l.era).year, x: q.x, y: top - 4, color: '#fff', size: 13, order: 0 });
      });
    });
    placeLabels(c, names.sort(function (a, b) { return a.order - b.order; }), heads);
    // A friendly word on the ground under the mouse: low, middle or high.
    if (S.hover && !S.drag) {
      var ll = v.toLatLon(S.hover.x, S.hover.y), m = LL.elevation(g, ll.lat, ll.lon);
      if (m != null) { var k3 = (m - g.min) / Math.max(1, g.max - g.min); label(c, t(k3 < 0.33 ? 'll_k_low' : k3 > 0.66 ? 'll_k_high' : 'll_k_middle'), S.hover.x, S.hover.y + 28, '#ffd166'); }
    }
  }
  function star(c, x, y, r) {
    c.save(); c.fillStyle = '#ffe066'; c.strokeStyle = '#3b2a00'; c.lineWidth = 2; c.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fill(); c.stroke(); c.restore();
  }

  // Language toggle re-renders the screen with the same state.
  root.UI = root.UI || {};
  root.UI.landingLab = open;
  root.UI.landingTick = frame;
  root.LandingUI = {
    state: function () { return S; }, selectFeature: function (id) { if (S) selectFeature(id); }, openPlace: function (id) { if (S) openPlace(id); }, backToGlobe: function () { if (S) backToGlobe(); },
    startLanding: function (region, i) { if (S) startLanding(region, i); }, press: function () { if (S) pressLanding(); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
