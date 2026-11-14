// The outpost map: tiles, collision, path finding and station positions.
// No drawing here, so the whole game can also run headless in tests.
(function (root) {
  'use strict';

  var W = 90, H = 36;
  var T = { SAND: 0, FLOOR: 1, WALL: 2, DOOR: 3, BOULDER: 4, EFLOOR: 5, EWALL: 6, GREEN: 7, SHELTER: 8, VOID: 9, LAB: 10, QUARTERS: 11 };

  var tiles = new Uint8Array(W * H);
  function set(x, y, t) { if (x >= 0 && y >= 0 && x < W && y < H) tiles[y * W + x] = t; }
  function get(x, y) { return (x < 0 || y < 0 || x >= W || y >= H) ? T.VOID : tiles[y * W + x]; }

  function room(x0, y0, x1, y1, floor, wall) {
    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        var edge = x === x0 || x === x1 || y === y0 || y === y1;
        set(x, y, edge ? wall : floor);
      }
    }
  }

  // Mars side: habitat with four rooms.
  room(16, 12, 25, 26, T.GREEN, T.WALL);    // greenhouse
  room(25, 12, 35, 26, T.FLOOR, T.WALL);    // hub
  room(35, 12, 44, 19, T.LAB, T.WALL);      // lab
  room(35, 19, 44, 26, T.SHELTER, T.WALL);  // storm shelter
  room(9, 14, 16, 24, T.QUARTERS, T.WALL);  // sleep room: the whole crew meets here at night
  [[25, 18], [25, 19], [25, 20], [35, 15], [35, 16], [35, 22], [35, 23],
    [29, 12], [30, 12], [31, 12], [29, 26], [30, 26], [31, 26], [16, 18], [16, 19], [16, 20]].forEach(function (d) { set(d[0], d[1], T.DOOR); });

  // Boulders scattered outside.
  [[4, 6], [12, 3], [47, 4], [55, 13], [8, 15], [3, 24], [14, 31], [24, 33], [41, 32], [56, 26], [49, 11], [36, 30]]
    .forEach(function (b) { set(b[0], b[1], T.BOULDER); });

  // Earth side: mission control, a closed room nobody on Mars can walk to.
  for (var vy = 0; vy < H; vy++) for (var vx = 60; vx < W; vx++) set(vx, vy, T.VOID);
  room(64, 9, 84, 26, T.EFLOOR, T.EWALL);

  function isSolid(t) { return t === T.WALL || t === T.BOULDER || t === T.EWALL || t === T.VOID; }

  // Stations occupy these tiles, so crew walk around them.
  var STATIONS = {
    panel0: { x: 20, y: 6, w: 5, h: 2, kind: 'panel', index: 0, outside: true },
    panel1: { x: 28, y: 6, w: 5, h: 2, kind: 'panel', index: 1, outside: true },
    panel2: { x: 36, y: 6, w: 5, h: 2, kind: 'panel', index: 2, outside: true },
    battery: { x: 27, y: 14, w: 2, h: 1, kind: 'device', device: 'battery' },
    recycler: { x: 32, y: 14, w: 2, h: 1, kind: 'device', device: 'recycler' },
    lights: { x: 23, y: 14, w: 1, h: 1, kind: 'device', device: 'lights' },
    antenna: { x: 8, y: 9, w: 2, h: 2, kind: 'device', device: 'antenna', outside: true },
    drill: { x: 52, y: 19, w: 2, h: 2, kind: 'drill', outside: true },
    plot0: { x: 18, y: 15, w: 2, h: 2, kind: 'plot', index: 0 },
    plot1: { x: 21, y: 15, w: 2, h: 2, kind: 'plot', index: 1 },
    plot2: { x: 18, y: 22, w: 2, h: 2, kind: 'plot', index: 2 },
    plot3: { x: 21, y: 22, w: 2, h: 2, kind: 'plot', index: 3 },
    valve: { x: 37, y: 24, w: 2, h: 1, kind: 'valve' },
    medbay: { x: 41, y: 24, w: 2, h: 1, kind: 'medbay' },
    bench: { x: 37, y: 14, w: 2, h: 1, kind: 'bench' },
    uplink: { x: 41, y: 14, w: 2, h: 1, kind: 'uplink' },
    rock0: { x: 6, y: 19, w: 1, h: 1, kind: 'rock', index: 0, outside: true, value: 1 },
    rock1: { x: 12, y: 29, w: 1, h: 1, kind: 'rock', index: 1, outside: true, value: 1 },
    rock2: { x: 31, y: 31, w: 1, h: 1, kind: 'rock', index: 2, outside: true, value: 2 },
    rock3: { x: 50, y: 30, w: 1, h: 1, kind: 'rock', index: 3, outside: true, value: 2 },
    rock4: { x: 55, y: 6, w: 1, h: 1, kind: 'rock', index: 4, outside: true, value: 3 },
    sun: { x: 67, y: 11, w: 3, h: 1, kind: 'sun', earth: true },
    dustwatch: { x: 73, y: 11, w: 3, h: 1, kind: 'dustwatch', earth: true },
    analysis: { x: 79, y: 11, w: 3, h: 1, kind: 'analysis', earth: true },
    twin: { x: 73, y: 22, w: 3, h: 2, kind: 'twin', earth: true },
    nap: { x: 80, y: 24, w: 3, h: 1, kind: 'nap', earth: true },
    // One more daily job for each role.
    filter: { x: 33, y: 17, w: 2, h: 1, kind: 'filter' },            // engineer: dust out of the air filter
    compost: { x: 18, y: 19, w: 2, h: 1, kind: 'compost' },          // farmer: food scraps become plant food
    gym: { x: 26, y: 16, w: 2, h: 1, kind: 'gym' },                  // doctor: exercise keeps bones strong
    drive: { x: 66, y: 23, w: 3, h: 1, kind: 'drive', earth: true }, // mission control: plan the rover's drive
    suits: { x: 27, y: 13, w: 2, h: 1, kind: 'suits' },              // engineer: check the space suits for holes
    waterloop: { x: 21, y: 25, w: 2, h: 1, kind: 'waterloop' },      // farmer: recycle used water for the plants
    // Invisible spots the arrow can point at, just inside each airlock.
    doorN: { x: 30, y: 13, w: 1, h: 1, kind: 'mark' },
    doorS: { x: 30, y: 25, w: 1, h: 1, kind: 'mark' },
    sleep: { x: 12, y: 19, w: 2, h: 2, kind: 'mark' },  // the middle of the sleep room
  };

  // Furniture and scenery. Drawn in art.js, listed here so crew walk around it.
  var PROPS = [
    { kind: 'table', x: 27, y: 23, w: 2, h: 2 },
    { kind: 'crates', x: 33, y: 24, w: 2, h: 2 },
    { kind: 'lockers', x: 26, y: 13, w: 1, h: 1 },
    { kind: 'lockers', x: 34, y: 13, w: 1, h: 1 },
    { kind: 'shelf', x: 17, y: 13, w: 6, h: 1 },
    { kind: 'sampletable', x: 37, y: 17, w: 3, h: 1 },
    { kind: 'tanks', x: 38, y: 20, w: 6, h: 1 },
    { kind: 'bunk', x: 36, y: 20, w: 2, h: 1 },
    { kind: 'desk', x: 67, y: 16, w: 4, h: 1 },
    { kind: 'desk', x: 78, y: 16, w: 4, h: 1 },
    { kind: 'desk', x: 67, y: 20, w: 4, h: 1 },
    { kind: 'desk', x: 78, y: 20, w: 4, h: 1 },
    { kind: 'pot', x: 65, y: 25, w: 1, h: 1 },
    { kind: 'pot', x: 65, y: 10, w: 1, h: 1 },
    { kind: 'lander', x: 3, y: 28, w: 5, h: 5 },
    { kind: 'oldrover', x: 51, y: 8, w: 3, h: 2 },
    // Sleep room: one sleep pod per Mars crew member, and the night screen with the day's numbers.
    { kind: 'sleeppod', x: 10, y: 15, w: 2, h: 1 },
    { kind: 'sleeppod', x: 10, y: 18, w: 2, h: 1 },
    { kind: 'sleeppod', x: 10, y: 21, w: 2, h: 1 },
    { kind: 'nightboard', x: 13, y: 15, w: 3, h: 1 },
  ];

  var DOORS = [
    { x: 16, y: 18, n: 3, vertical: true },
    { x: 25, y: 18, n: 3, vertical: true },
    { x: 35, y: 15, n: 2, vertical: true },
    { x: 35, y: 22, n: 2, vertical: true },
    { x: 29, y: 12, n: 3, vertical: false },
    { x: 29, y: 26, n: 3, vertical: false },
  ];

  var blocked = new Uint8Array(W * H);
  function rebuildBlocked() {
    for (var i = 0; i < W * H; i++) blocked[i] = isSolid(tiles[i]) ? 1 : 0;
    PROPS.forEach(function (s) {
      for (var y = s.y; y < s.y + s.h; y++) for (var x = s.x; x < s.x + s.w; x++) blocked[y * W + x] = 1;
    });
    Object.keys(STATIONS).forEach(function (id) {
      var s = STATIONS[id];
      if (s.kind === 'rock' || s.kind === 'mark') return; // you can stand over these
      for (var y = s.y; y < s.y + s.h; y++) for (var x = s.x; x < s.x + s.w; x++) blocked[y * W + x] = 1;
    });
  }
  rebuildBlocked();

  function solidAt(px, py) {
    var x = Math.floor(px), y = Math.floor(py);
    if (x < 0 || y < 0 || x >= W || y >= H) return true;
    return blocked[y * W + x] === 1;
  }

  // Can a crew member of radius r stand at (px, py)?
  function free(px, py, r) {
    return !solidAt(px - r, py - r) && !solidAt(px + r, py - r) &&
      !solidAt(px - r, py + r) && !solidAt(px + r, py + r);
  }

  function tileAt(px, py) { return get(Math.floor(px), Math.floor(py)); }

  function zoneAt(px, py) {
    var t = tileAt(px, py);
    if (t === T.SAND || t === T.BOULDER) return 'outside';
    if (t === T.SHELTER) return 'shelter';
    if (t === T.EFLOOR) return 'earth';
    return 'inside';
  }

  function center(st) { return { x: st.x + st.w / 2, y: st.y + st.h / 2 }; }

  // Distance from a point to the nearest edge of a station.
  function stationDistance(st, px, py) {
    var dx = Math.max(st.x - px, 0, px - (st.x + st.w));
    var dy = Math.max(st.y - py, 0, py - (st.y + st.h));
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Breadth-first search on the tile grid. Returns tile centers to walk through,
  // ending next to `goal` (a station) or on the tile (a point).
  function findPath(fromX, fromY, goal) {
    var sx = Math.floor(fromX), sy = Math.floor(fromY);
    var prev = new Int32Array(W * H).fill(-1);
    var start = sy * W + sx;
    prev[start] = start;
    var queue = [start], head = 0, found = -1;
    while (head < queue.length) {
      var cur = queue[head++];
      var cx = cur % W, cy = (cur / W) | 0;
      var close = goal.w ? stationDistance(goal, cx + 0.5, cy + 0.5) < 1.1 : (cx === Math.floor(goal.x) && cy === Math.floor(goal.y));
      if (close) { found = cur; break; }
      for (var k = 0; k < 4; k++) {
        var nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0);
        var ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        var ni = ny * W + nx;
        if (blocked[ni] || prev[ni] !== -1) continue;
        prev[ni] = cur;
        queue.push(ni);
      }
    }
    if (found < 0) return null;
    var path = [];
    for (var p = found; p !== start; p = prev[p]) path.push({ x: (p % W) + 0.5, y: ((p / W) | 0) + 0.5 });
    return path.reverse();
  }

  var SPAWN = {
    engineer: { x: 28.5, y: 18.5 },
    farmer: { x: 27.5, y: 21.5 },
    doctor: { x: 32.5, y: 20.5 },
    earth: { x: 74.5, y: 17.5 },
  };

  var SHELTER_SPOTS = [{ x: 38.5, y: 22.5 }, { x: 40.5, y: 22.5 }, { x: 42.5, y: 22.5 }];
  // Where each Mars crew member waits in the sleep room (engineer, farmer, doctor).
  var SLEEP_SPOTS = [{ x: 13.5, y: 17.5 }, { x: 13.5, y: 20.5 }, { x: 13.5, y: 22.5 }];
  function inQuarters(px, py) { return tileAt(px, py) === T.QUARTERS; }

  var api = {
    W: W, H: H, T: T, get: get, STATIONS: STATIONS, PROPS: PROPS, DOORS: DOORS, SPAWN: SPAWN, SHELTER_SPOTS: SHELTER_SPOTS, SLEEP_SPOTS: SLEEP_SPOTS,
    free: free, tileAt: tileAt, zoneAt: zoneAt, center: center, stationDistance: stationDistance, findPath: findPath, inQuarters: inQuarters,
  };
  root.World = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
