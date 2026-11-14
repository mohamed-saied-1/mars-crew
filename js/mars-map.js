// Mars globe and regional terrain maps for the Landing Lab. Canvas 2D, no libraries.
// Globe colour: USGS Viking MDIM 2.1 colorized mosaic (js/globe-texture.js).
// Terrain: NASA MOLA MEGDR elevation crops (js/terrain/*.js). Markers are drawn in code
// at verified coordinates from js/craters.js.
(function (root) {
  'use strict';

  var LL = root.LandingLab, D2R = Math.PI / 180;

  // ---- Lazy data loading (script tags work offline and from file://) ----------------------
  var scriptPromises = {};
  function loadScript(src) {
    if (scriptPromises[src]) return scriptPromises[src];
    scriptPromises[src] = new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { ok(); };
      s.onerror = function () { delete scriptPromises[src]; no(new Error('could not load ' + src)); };
      document.head.appendChild(s);
    });
    return scriptPromises[src];
  }
  function decodeImage(url) {
    return new Promise(function (ok, no) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
        var g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
        ok({ w: c.width, h: c.height, rgba: g.getImageData(0, 0, c.width, c.height).data });
      };
      img.onerror = function () { no(new Error('image decode failed')); };
      img.src = url;
    });
  }
  var texture = null, texturePromise = null;
  function loadTexture() {
    if (texturePromise) return texturePromise;
    texturePromise = loadScript('js/globe-texture.js?v=landing-2').then(function () { return decodeImage(root.MarsGlobeTexture.jpg); })
      .then(function (img) { texture = { w: img.w, h: img.h, px: new Uint32Array(img.rgba.buffer) }; return texture; });
    texturePromise.catch(function () { texturePromise = null; });
    return texturePromise;
  }
  var grids = {}, gridPromises = {};
  function loadTerrain(id) {
    if (grids[id]) return Promise.resolve(grids[id]);
    if (gridPromises[id]) return gridPromises[id];
    gridPromises[id] = loadScript('js/terrain/' + id + '.js?v=terrain-3').then(function () {
      var meta = root.MarsTerrain[id];
      return decodeImage(meta.png).then(function (img) {
        var g = { id: id, w: meta.w, h: meta.h, north: meta.north, west: meta.west, ppdLat: meta.ppdLat, ppdLon: meta.ppdLon, min: meta.min, max: meta.max, coarse: meta.coarse, metresPerPixel: meta.metresPerPixel, credit: meta.credit, product: meta.product, source: meta.source, data: LL.decodeRGBA(img.rgba, img.w, img.h) };
        grids[id] = g; return g;
      });
    });
    gridPromises[id].catch(function () { delete gridPromises[id]; });
    return gridPromises[id];
  }

  // ---- Colour ramp for elevation (low blue → green → yellow → brown → white high) --------
  var RAMP = [[0, [32, 52, 140]], [0.18, [40, 120, 200]], [0.36, [70, 170, 120]], [0.52, [200, 200, 90]], [0.7, [205, 130, 60]], [0.86, [150, 80, 50]], [1, [245, 240, 235]]];
  function ramp(t) {
    t = Math.max(0, Math.min(1, t));
    for (var i = 1; i < RAMP.length; i++) if (t <= RAMP[i][0]) {
      var a = RAMP[i - 1], b = RAMP[i], k = (t - a[0]) / (b[0] - a[0]);
      return [a[1][0] + (b[1][0] - a[1][0]) * k, a[1][1] + (b[1][1] - a[1][1]) * k, a[1][2] + (b[1][2] - a[1][2]) * k];
    }
    return RAMP[RAMP.length - 1][1];
  }
  // A gentler ramp in Mars colours for the kids' map: deep rust low ground, sandy high ground.
  // The heights are the same real data; only the colours are simpler than a science map.
  var MARS_RAMP = [[0, [96, 38, 26]], [0.35, [160, 72, 40]], [0.65, [205, 122, 70]], [1, [238, 200, 150]]];
  function marsRamp(t) {
    t = Math.max(0, Math.min(1, t));
    for (var i = 1; i < MARS_RAMP.length; i++) if (t <= MARS_RAMP[i][0]) {
      var a = MARS_RAMP[i - 1], b = MARS_RAMP[i], k = (t - a[0]) / (b[0] - a[0]);
      return [a[1][0] + (b[1][0] - a[1][0]) * k, a[1][1] + (b[1][1] - a[1][1]) * k, a[1][2] + (b[1][2] - a[1][2]) * k];
    }
    return MARS_RAMP[MARS_RAMP.length - 1][1];
  }
  // Coloured, hillshaded image of a terrain grid (cached per grid and palette).
  var shadedCache = {};
  function shaded(grid, palette) {
    var key = grid.id + ':' + (palette || 'science');
    if (shadedCache[key]) return shadedCache[key];
    var colour = palette === 'mars' ? marsRamp : ramp;
    var c = document.createElement('canvas'); c.width = grid.w; c.height = grid.h;
    var g = c.getContext('2d'), img = g.createImageData(grid.w, grid.h), d = img.data;
    var lo = grid.min, hi = grid.max, span = Math.max(1, hi - lo);
    var midLat = grid.north - grid.h / 2 / grid.ppdLat, px = LL.pixelKm(grid, midLat);
    var ex = px.x * 1000, ey = px.y * 1000, exaggerate = grid.coarse ? 18 : 6;
    var sx = -0.6, sy = -0.6, sz = 0.53; // light from the north-west
    for (var y = 0; y < grid.h; y++) for (var x = 0; x < grid.w; x++) {
      var i = y * grid.w + x, z = grid.data[i];
      var zl = grid.data[y * grid.w + Math.max(0, x - 1)], zr = grid.data[y * grid.w + Math.min(grid.w - 1, x + 1)];
      var zu = grid.data[Math.max(0, y - 1) * grid.w + x], zd = grid.data[Math.min(grid.h - 1, y + 1) * grid.w + x];
      var nx = -(zr - zl) / (2 * ex) * exaggerate, ny = -(zd - zu) / (2 * ey) * exaggerate, nz = 1, len = Math.sqrt(nx * nx + ny * ny + 1);
      var light = Math.max(0, (nx * sx + ny * sy + nz * sz) / len), shade = 0.45 + 0.75 * light;
      var col = colour((z - lo) / span);
      d[i * 4] = Math.min(255, col[0] * shade); d[i * 4 + 1] = Math.min(255, col[1] * shade); d[i * 4 + 2] = Math.min(255, col[2] * shade); d[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    shadedCache[key] = c;
    return c;
  }

  // ---- Globe -----------------------------------------------------------------------
  // view: { lat, lon (centre), zoom }. The globe image is re-rendered only when the view changes.
  function createGlobe() {
    var view = { lat: 10, lon: 120, zoom: 1 }, goal = null, buf = null, bufKey = '', dragging = false;
    function radius(w, h) { return Math.min(w, h) * 0.44 * view.zoom; }
    function project(lat, lon, w, h) {
      var r = radius(w, h), p = lat * D2R, l = (lon - view.lon) * D2R, p0 = view.lat * D2R;
      var cosc = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l);
      return { x: w / 2 + r * Math.cos(p) * Math.sin(l), y: h / 2 - r * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l)), visible: cosc > 0.02, depth: cosc };
    }
    function unproject(px, py, w, h) {
      var r = radius(w, h), x = (px - w / 2) / r, y = (h / 2 - py) / r, rho2 = x * x + y * y;
      if (rho2 > 1) return null;
      var z = Math.sqrt(1 - rho2), p0 = view.lat * D2R;
      var lat = Math.asin(z * Math.sin(p0) + y * Math.cos(p0)) / D2R;
      var lon = view.lon + Math.atan2(x, z * Math.cos(p0) - y * Math.sin(p0)) / D2R;
      return { lat: lat, lon: LL.wrapLon(lon) };
    }
    function renderBody(w, h, scale) {
      var bw = Math.max(1, Math.round(w * scale)), bh = Math.max(1, Math.round(h * scale));
      var key = [bw, bh, view.lat.toFixed(3), view.lon.toFixed(3), view.zoom.toFixed(3), !!texture].join('|');
      if (buf && bufKey === key) return buf;
      if (!buf || buf.width !== bw || buf.height !== bh) { buf = document.createElement('canvas'); buf.width = bw; buf.height = bh; }
      var g = buf.getContext('2d'), img = g.createImageData(bw, bh), out = new Uint32Array(img.data.buffer);
      var r = radius(bw, bh), cx = bw / 2, cy = bh / 2, p0 = view.lat * D2R, sp0 = Math.sin(p0), cp0 = Math.cos(p0);
      var tw = texture ? texture.w : 0, th = texture ? texture.h : 0, tpx = texture ? texture.px : null;
      var y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(bh - 1, Math.ceil(cy + r));
      for (var py = y0; py <= y1; py++) {
        var y = (cy - py - 0.5) / r, span = Math.sqrt(Math.max(0, 1 - y * y)) * r;
        var x0 = Math.max(0, Math.floor(cx - span)), x1 = Math.min(bw - 1, Math.ceil(cx + span));
        for (var px = x0; px <= x1; px++) {
          var x = (px + 0.5 - cx) / r, rho2 = x * x + y * y;
          if (rho2 > 1) continue;
          var z = Math.sqrt(1 - rho2);
          var lat = Math.asin(z * sp0 + y * cp0), lon = view.lon * D2R + Math.atan2(x, z * cp0 - y * sp0);
          // Texture is equirectangular with longitude -180..180 (east positive), north up.
          var u = ((lon / D2R + 180) % 360 + 360) % 360 / 360, v = 0.5 - lat / Math.PI;
          var col = tpx ? tpx[Math.min(th - 1, (v * th) | 0) * tw + Math.min(tw - 1, (u * tw) | 0)] : 0xff4060a0;
          // Gentle lighting: limb darkening plus light from the upper left.
          var light = 0.42 + 0.58 * Math.max(0, z * 0.82 - x * 0.34 + y * 0.46);
          var rr = (col & 255) * light, gg = ((col >> 8) & 255) * light, bb = ((col >> 16) & 255) * light;
          out[py * bw + px] = 0xff000000 | (Math.min(255, bb) << 16) | (Math.min(255, gg) << 8) | Math.min(255, rr);
        }
      }
      g.putImageData(img, 0, 0);
      bufKey = key;
      return buf;
    }
    function draw(c, w, h) {
      var r = radius(w, h);
      // Thin atmosphere glow behind the planet.
      var glow = c.createRadialGradient(w / 2, h / 2, r * 0.96, w / 2, h / 2, r * 1.12);
      glow.addColorStop(0, 'rgba(255,170,120,0.35)'); glow.addColorStop(1, 'rgba(255,170,120,0)');
      c.fillStyle = glow; c.beginPath(); c.arc(w / 2, h / 2, r * 1.12, 0, Math.PI * 2); c.fill();
      var body = renderBody(w, h, dragging ? 0.5 : 1);
      c.save(); c.imageSmoothingEnabled = true; c.drawImage(body, 0, 0, w, h); c.restore();
    }
    function ease(dt) {
      if (!goal) return false;
      var k = 1 - Math.exp(-dt / 0.18);
      var dLon = LL.wrapLon(goal.lon - view.lon + 180) - 180;
      view.lat += (goal.lat - view.lat) * k; view.lon = LL.wrapLon(view.lon + dLon * k); view.zoom += (goal.zoom - view.zoom) * k;
      if (Math.abs(goal.lat - view.lat) < 0.05 && Math.abs(dLon) < 0.05 && Math.abs(goal.zoom - view.zoom) < 0.005) { view.lat = goal.lat; view.lon = goal.lon; view.zoom = goal.zoom; var done = goal.done; goal = null; if (done) done(); }
      return true;
    }
    return {
      view: view, draw: draw, project: project, unproject: unproject, ease: ease, radius: radius,
      flyTo: function (lat, lon, zoom, done) { goal = { lat: Math.max(-80, Math.min(80, lat)), lon: LL.wrapLon(lon), zoom: zoom || view.zoom, done: done }; },
      rotate: function (dLat, dLon) { goal = null; view.lat = Math.max(-85, Math.min(85, view.lat + dLat)); view.lon = LL.wrapLon(view.lon + dLon); },
      setZoom: function (z) { goal = null; view.zoom = Math.max(0.8, Math.min(6, z)); },
      setDragging: function (v) { dragging = !!v; },
      busy: function () { return !!goal; },
    };
  }

  // ---- Region map ----------------------------------------------------------------
  // Shows one terrain grid; view.scale = screen px per grid px; view.cx/cy = grid px at screen centre.
  function createRegion(grid, w, h, opts) {
    var palette = opts && opts.palette;
    var fit = Math.min(w / grid.w, h / grid.h);
    var view = { cx: grid.w / 2, cy: grid.h / 2, scale: fit, min: fit * 0.9, max: fit * 8 };
    function toScreen(lat, lon) {
      var gx = (LL.wrapLon(lon) - grid.west) * grid.ppdLon, gy = (grid.north - lat) * grid.ppdLat;
      return { x: w / 2 + (gx - view.cx) * view.scale, y: h / 2 + (gy - view.cy) * view.scale };
    }
    function toLatLon(sx, sy) {
      var gx = view.cx + (sx - w / 2) / view.scale, gy = view.cy + (sy - h / 2) / view.scale;
      return { lat: grid.north - gy / grid.ppdLat, lon: LL.wrapLon(grid.west + gx / grid.ppdLon) };
    }
    // Pixels per km on screen, in x and y, at a latitude.
    function kmToPx(lat) { var p = LL.pixelKm(grid, lat); return { x: view.scale / p.x, y: view.scale / p.y }; }
    function clamp() { view.cx = Math.max(0, Math.min(grid.w, view.cx)); view.cy = Math.max(0, Math.min(grid.h, view.cy)); }
    return {
      grid: grid, view: view,
      resize: function (nw, nh) { w = nw; h = nh; view.min = Math.min(w / grid.w, h / grid.h) * 0.9; view.scale = Math.max(view.min, view.scale); },
      toScreen: toScreen, toLatLon: toLatLon, kmToPx: kmToPx,
      centreOn: function (lat, lon) { var s = toScreen(lat, lon); view.cx += (s.x - w / 2) / view.scale; view.cy += (s.y - h / 2) / view.scale; clamp(); },
      pan: function (dx, dy) { view.cx -= dx / view.scale; view.cy -= dy / view.scale; clamp(); },
      zoomAt: function (sx, sy, factor) {
        var before = toLatLon(sx, sy);
        view.scale = Math.max(view.min, Math.min(view.max, view.scale * factor));
        var after = toScreen(before.lat, before.lon);
        view.cx += (after.x - sx) / view.scale; view.cy += (after.y - sy) / view.scale; clamp();
      },
      draw: function (c) {
        var img = shaded(grid, palette);
        c.save(); c.fillStyle = '#0d1020'; c.fillRect(0, 0, w, h);
        // Bilinear smoothing: MOLA pixels are 463 m wide, so hard pixel blocks would look like detail
        // the data does not have.
        c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
        c.drawImage(img, w / 2 - view.cx * view.scale, h / 2 - view.cy * view.scale, grid.w * view.scale, grid.h * view.scale);
        c.restore();
      },
      drawGrid: function (c, labels) {
        // Latitude/longitude lines every 1°, 2° or 5°, depending on zoom.
        var a = toLatLon(0, 0), b = toLatLon(w, h);
        // Separate steps for latitude and longitude, so labels stay at least ~70 px apart even near
        // the poles where degrees of longitude are narrow.
        function stepFor(pxPerDeg) { var steps = [0.25, 0.5, 1, 2, 5, 10, 20, 30]; for (var i = 0; i < steps.length; i++) if (steps[i] * pxPerDeg >= 70) return steps[i]; return 45; }
        var step = stepFor(view.scale * grid.ppdLat), lonStep = stepFor(view.scale * grid.ppdLon);
        c.save(); c.strokeStyle = 'rgba(255,255,255,0.18)'; c.fillStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1; c.font = '11px sans-serif';
        for (var lat = Math.ceil(b.lat / step) * step; lat <= a.lat; lat += step) { var s = toScreen(lat, a.lon); c.beginPath(); c.moveTo(0, s.y); c.lineTo(w, s.y); c.stroke(); if (labels) c.fillText(Math.abs(+lat.toFixed(1)) + '°' + (lat >= 0 ? 'N' : 'S'), 4, s.y - 3); }
        var lon0 = a.lon, lon1 = b.lon < a.lon ? b.lon + 360 : b.lon;
        for (var lon = Math.ceil(lon0 / lonStep) * lonStep; lon <= lon1; lon += lonStep) { var t = toScreen(a.lat, lon); c.beginPath(); c.moveTo(t.x, 0); c.lineTo(t.x, h); c.stroke(); if (labels) c.fillText(+LL.wrapLon(lon).toFixed(1) + '°E', t.x + 3, h - 6); }
        c.restore();
      },
      drawScale: function (c, rtl, unitKm) {
        var mid = toLatLon(w / 2, h / 2), k = kmToPx(mid.lat).x, nice = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
        var km = nice[0]; for (var i = 0; i < nice.length; i++) if (nice[i] * k <= 160) km = nice[i];
        var len = km * k, x = rtl ? w - 20 - len : 20, y = h - 26;
        c.save(); c.fillStyle = 'rgba(8,10,20,0.75)'; c.fillRect(x - 8, y - 18, len + 16, 30);
        c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x + len, y); c.moveTo(x, y - 5); c.lineTo(x, y + 5); c.moveTo(x + len, y - 5); c.lineTo(x + len, y + 5); c.stroke();
        c.fillStyle = '#fff'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center'; c.fillText(km + ' ' + unitKm, x + len / 2, y - 6);
        // North arrow.
        var nx = rtl ? 28 : w - 28; c.beginPath(); c.moveTo(nx, 14); c.lineTo(nx - 8, 34); c.lineTo(nx + 8, 34); c.closePath(); c.fill(); c.fillText('N', nx, 48);
        c.restore();
      },
    };
  }

  // Elevation legend: a vertical colour bar with the crop's min/max in metres.
  function drawLegend(c, x, y, h, grid, title) {
    c.save(); c.fillStyle = 'rgba(8,10,20,0.78)'; c.fillRect(x - 6, y - 22, 74, h + 44);
    for (var i = 0; i < h; i++) { var col = ramp(1 - i / h); c.fillStyle = 'rgb(' + (col[0] | 0) + ',' + (col[1] | 0) + ',' + (col[2] | 0) + ')'; c.fillRect(x, y + i, 14, 1); }
    c.fillStyle = '#fff'; c.font = '11px sans-serif'; c.textAlign = 'left';
    c.fillText(title, x - 2, y - 8);
    c.fillText(fmtM(grid.max), x + 18, y + 9); c.fillText(fmtM(grid.min), x + 18, y + h);
    c.restore();
  }
  function fmtM(m) { return (m > 0 ? '+' : m < 0 ? '−' : '') + Math.abs(Math.round(m)).toLocaleString('en-US') + ' m'; }

  root.MarsMap = { loadTexture: loadTexture, loadTerrain: loadTerrain, loadScript: loadScript, createGlobe: createGlobe, createRegion: createRegion, drawLegend: drawLegend, ramp: ramp, fmtM: fmtM, textureReady: function () { return !!texture; }, grid: function (id) { return grids[id] || null; } };
})(typeof window !== 'undefined' ? window : globalThis);
