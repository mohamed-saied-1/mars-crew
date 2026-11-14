// Original entry, descent and landing animation for the Landing Lab (Canvas 2D, drawn in code).
// NASA's EDL and sky-crane illustrations (PIA24265, PIA24319) were used only as visual references;
// nothing is traced or embedded. Timing is compressed: real landings take about 7 minutes.
(function (root) {
  'use strict';

  var OUT = '#1d1726';
  // Stage tables per landing technique: [caption key, duration in seconds].
  var COMMON = [['edl_cruise', 2], ['edl_entry', 4], ['edl_chute', 3.5], ['edl_shield', 2]];
  var TECH = {
    legs: [['edl_retro', 3.5], ['edl_legs', 2.5]],
    airbags: [['edl_airbags', 2.5], ['edl_bounce', 4.5]],
    skycrane: [['edl_powered', 2.5], ['edl_crane', 3], ['edl_flyaway', 2.5]],
  };
  function stagesFor(era) {
    var list = COMMON.slice().concat(TECH[era.tech] || TECH.legs);
    if (era.trn) list.splice(COMMON.length + 1, 0, ['edl_trn', 2.5]);
    var at = 0;
    return list.map(function (s) { var o = { key: s[0], start: at, dur: s[1] }; at += s[1]; return o; });
  }
  function totalTime(era) { var s = stagesFor(era), l = s[s.length - 1]; return l.start + l.dur + 1.5; }
  function stageAt(era, t) { var s = stagesFor(era); for (var i = s.length - 1; i >= 0; i--) if (t >= s[i].start) return { stage: s[i], k: Math.min(1, (t - s[i].start) / s[i].dur), index: i }; return { stage: s[0], k: 0, index: 0 }; }

  function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function easeOut(k) { return 1 - Math.pow(1 - k, 3); }

  // Altitude 0..1 (1 = top of atmosphere) over the whole sequence, for sky and ground.
  function altitude(era, t) {
    var total = totalTime(era) - 1.5;
    return Math.max(0, 1 - Math.pow(Math.min(1, t / total), 0.8));
  }

  function sky(c, w, h, alt) {
    var g = c.createLinearGradient(0, 0, 0, h);
    var space = alt > 0.6 ? (alt - 0.6) / 0.4 : 0;
    g.addColorStop(0, 'rgb(' + Math.round(lerp(196, 12, space)) + ',' + Math.round(lerp(150, 14, space)) + ',' + Math.round(lerp(122, 32, space)) + ')');
    g.addColorStop(1, 'rgb(' + Math.round(lerp(228, 40, space)) + ',' + Math.round(lerp(170, 30, space)) + ',' + Math.round(lerp(128, 50, space)) + ')');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    if (space > 0) { c.fillStyle = 'rgba(255,255,255,' + (0.8 * space) + ')'; for (var i = 0; i < 60; i++) c.fillRect((i * 97) % w, (i * 53) % (h * 0.7), 2, 2); }
  }
  function ground(c, w, h, alt, shake) {
    var gy = h * lerp(0.82, 1.6, Math.min(1, alt * 1.6));
    if (gy > h + 40) return h + 40;
    c.save(); c.translate(shake, 0);
    c.fillStyle = '#b8714a'; c.beginPath(); c.moveTo(0, gy - h * 0.06); c.quadraticCurveTo(w * 0.25, gy - h * 0.14, w * 0.45, gy - h * 0.05); c.quadraticCurveTo(w * 0.7, gy - h * 0.12, w, gy - h * 0.04); c.lineTo(w, h); c.lineTo(0, h); c.fill();
    c.fillStyle = '#c8835a'; c.fillRect(0, gy, w, h - gy);
    c.fillStyle = 'rgba(80,40,30,0.35)'; for (var i = 0; i < 14; i++) { ell(c, (i * 131) % w, gy + 10 + (i * 37) % Math.max(10, h - gy), 6 + (i % 4) * 3, 2.5); c.fill(); }
    c.restore();
    return gy;
  }
  // Aeroshell: heat shield (bottom) + backshell (top cone).
  function capsule(c, x, y, s, glow, shield, back) {
    if (glow > 0) { var g = c.createRadialGradient(x, y + s * 0.4, 1, x, y + s * 0.4, s * 2.2); g.addColorStop(0, 'rgba(255,220,140,' + 0.9 * glow + ')'); g.addColorStop(0.4, 'rgba(255,120,60,' + 0.6 * glow + ')'); g.addColorStop(1, 'rgba(255,90,40,0)'); c.fillStyle = g; ell(c, x, y + s * 0.6, s * 2.2, s * 2.6); c.fill(); }
    c.lineWidth = 2; c.strokeStyle = OUT;
    if (back) { c.beginPath(); c.moveTo(x - s, y + s * 0.2); c.lineTo(x - s * 0.45, y - s * 0.9); c.lineTo(x + s * 0.45, y - s * 0.9); c.lineTo(x + s, y + s * 0.2); c.closePath(); c.fillStyle = '#e9e6df'; c.fill(); c.stroke(); c.fillStyle = '#c9c4ba'; c.fillRect(x - s * 0.3, y - s * 0.6, s * 0.6, s * 0.12); }
    if (shield) { c.beginPath(); c.moveTo(x - s * 1.08, y + s * 0.2); c.quadraticCurveTo(x, y + s * 0.85, x + s * 1.08, y + s * 0.2); c.closePath(); c.fillStyle = glow > 0.2 ? '#f0a35a' : '#c9893f'; c.fill(); c.stroke(); }
  }
  function parachute(c, x, y, s, open) {
    var r = s * 2.4 * open, top = y - s * 4.2 * open - s;
    c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1;
    for (var i = -4; i <= 4; i++) { c.beginPath(); c.moveTo(x + i * r / 4.5, top + r * 0.35); c.lineTo(x, y - s * 0.9); c.stroke(); }
    c.save(); c.beginPath(); c.moveTo(x - r, top + r * 0.35); c.quadraticCurveTo(x - r, top - r * 0.75, x, top - r * 0.75); c.quadraticCurveTo(x + r, top - r * 0.75, x + r, top + r * 0.35); c.closePath(); c.clip();
    for (var k = 0; k < 10; k++) { c.fillStyle = k % 2 ? '#f7f3ea' : '#ea7a3c'; c.fillRect(x - r + k * r / 5, top - r, r / 5 + 1, r * 1.5); }
    c.restore(); c.beginPath(); c.moveTo(x - r, top + r * 0.35); c.quadraticCurveTo(x - r, top - r * 0.75, x, top - r * 0.75); c.quadraticCurveTo(x + r, top - r * 0.75, x + r, top + r * 0.35); c.closePath(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = OUT; ell(c, x, top - r * 0.62, r * 0.1, r * 0.06); c.fill();
  }
  function flame(c, x, y, len) { var g = c.createLinearGradient(x, y, x, y + len); g.addColorStop(0, 'rgba(255,240,200,0.95)'); g.addColorStop(1, 'rgba(255,140,60,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x + 3, y); c.lineTo(x, y + len); c.closePath(); c.fill(); }
  function rover(c, x, y, s) {
    c.lineWidth = 2; c.strokeStyle = OUT;
    [-0.8, 0, 0.8].forEach(function (k) { c.fillStyle = '#3a3e48'; ell(c, x + k * s, y + s * 0.35, s * 0.26, s * 0.26); c.fill(); c.stroke(); });
    c.fillStyle = '#f2efe8'; c.fillRect(x - s, y - s * 0.3, s * 2, s * 0.5); c.strokeRect(x - s, y - s * 0.3, s * 2, s * 0.5);
    c.fillStyle = '#d9d4ca'; c.fillRect(x + s * 0.5, y - s * 0.9, s * 0.15, s * 0.6); c.fillStyle = '#5c6474'; c.fillRect(x + s * 0.35, y - s * 1.05, s * 0.45, s * 0.2);
  }
  function legLander(c, x, y, s) {
    c.lineWidth = 2; c.strokeStyle = OUT;
    c.beginPath(); c.moveTo(x - s * 0.7, y); c.lineTo(x - s * 1.1, y + s * 0.7); c.moveTo(x + s * 0.7, y); c.lineTo(x + s * 1.1, y + s * 0.7); c.moveTo(x, y + s * 0.2); c.lineTo(x, y + s * 0.75); c.stroke();
    c.fillStyle = '#e8e2d6'; c.beginPath(); c.moveTo(x - s, y); c.lineTo(x + s, y); c.lineTo(x + s * 0.7, y - s * 0.55); c.lineTo(x - s * 0.7, y - s * 0.55); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#5a7fbf'; c.fillRect(x - s * 1.9, y - s * 0.5, s * 0.8, s * 0.3); c.fillRect(x + s * 1.1, y - s * 0.5, s * 0.8, s * 0.3);
  }
  function airbagBall(c, x, y, s) {
    c.lineWidth = 2; c.strokeStyle = OUT;
    [[-0.5, -0.3], [0.5, -0.3], [0, 0.35], [-0.6, 0.35], [0.6, 0.35], [0, -0.75]].forEach(function (p) { c.fillStyle = '#efe7d4'; ell(c, x + p[0] * s, y + p[1] * s, s * 0.55, s * 0.55); c.fill(); c.stroke(); });
    c.strokeStyle = 'rgba(80,60,40,0.4)'; c.lineWidth = 1; ell(c, x, y, s * 0.5, s * 0.5); c.stroke();
  }
  function descentStage(c, x, y, s, thrust) {
    c.lineWidth = 2; c.strokeStyle = OUT;
    c.fillStyle = '#c9ccd3'; c.fillRect(x - s * 1.2, y - s * 0.3, s * 2.4, s * 0.45); c.strokeRect(x - s * 1.2, y - s * 0.3, s * 2.4, s * 0.45);
    c.fillStyle = '#8c929e'; [-1, -0.4, 0.4, 1].forEach(function (k) { c.fillRect(x + k * s - s * 0.12, y + s * 0.15, s * 0.24, s * 0.3); if (thrust) flame(c, x + k * s, y + s * 0.45, s * (0.9 + Math.random() * 0.2) * thrust); });
  }

  // Draws the animation at time t (seconds). opts: { era, rtl, t, outcome, diverted }.
  function draw(c, w, h, opts) {
    var era = opts.era, t = opts.t, at = stageAt(era, t), key = at.stage.key, k = at.k;
    var alt = altitude(era, t), shake = key === 'edl_entry' ? Math.sin(t * 60) * 2 * k : 0;
    sky(c, w, h, alt);
    var gy = ground(c, w, h, alt, shake);
    // The capsule sits low enough that the open parachute above it stays fully in view.
    var s = Math.min(w, h) * 0.055, x = w / 2 + shake, y = lerp(h * 0.42, h * 0.5, 1 - alt);
    if (key === 'edl_cruise') {
      capsule(c, x, y, s, 0, true, true);
      c.fillStyle = '#9aa3b4'; c.strokeStyle = OUT; c.lineWidth = 2; var cy = y - s * 1.2 - k * s * 3; c.fillRect(x - s * 1.3, cy - s * 0.3, s * 2.6, s * 0.35); c.strokeRect(x - s * 1.3, cy - s * 0.3, s * 2.6, s * 0.35);
      c.fillStyle = '#3e5a9a'; c.fillRect(x - s * 2.4, cy - s * 0.25, s * 1, s * 0.25); c.fillRect(x + s * 1.4, cy - s * 0.25, s * 1, s * 0.25);
    } else if (key === 'edl_entry') {
      c.strokeStyle = 'rgba(255,200,150,0.35)'; c.lineWidth = 2; for (var i = 0; i < 10; i++) { var lx = x - s * 2 + i * s * 0.45; c.beginPath(); c.moveTo(lx, y - s * 3 - (t * 300 + i * 40) % (s * 4)); c.lineTo(lx, y - s * 1.5 - (t * 300 + i * 40) % (s * 4)); c.stroke(); }
      capsule(c, x, y, s, Math.sin(k * Math.PI) * 0.9 + 0.1, true, true);
    } else if (key === 'edl_chute') { parachute(c, x, y, s, easeOut(k)); capsule(c, x, y, s, 0, true, true); }
    else if (key === 'edl_shield') { parachute(c, x, y, s, 1); capsule(c, x, y, s, 0, false, true); capsule(c, x, y + s * 0.4 + k * h * 0.4, s, 0, true, false); }
    else {
      // Lower stages: lander near the ground, landing at the centre of the screen.
      var landY = gy - s * 0.7, prog = (era.tech === 'airbags' && key === 'edl_bounce') ? 1 : k;
      var firstLow = key === 'edl_retro' || key === 'edl_airbags' || key === 'edl_powered';
      var yy = firstLow ? lerp(h * 0.42, landY - s * 3, easeOut(k)) : lerp(landY - s * 3, landY, easeOut(prog));
      if (key === 'edl_trn') {
        // Camera scan frame on the ground and a short sideways divert.
        var sx = x + (opts.diverted ? Math.sin(k * Math.PI) * s * 1.5 : 0);
        c.strokeStyle = 'rgba(120,255,200,0.9)'; c.lineWidth = 2; c.setLineDash([6, 4]); c.strokeRect(w / 2 - s * 3, gy - s * 0.4, s * 6, s * 0.8); c.setLineDash([]);
        c.beginPath(); c.moveTo(sx, yy + s * 0.5); c.lineTo(w / 2 - s * 3, gy - s * 0.4); c.moveTo(sx, yy + s * 0.5); c.lineTo(w / 2 + s * 3, gy - s * 0.4); c.stroke();
        descentStage(c, sx, yy, s, 1); rover(c, sx, yy + s * 0.75, s * 0.75);
      } else if (era.tech === 'legs') {
        if (key === 'edl_retro') { [-0.6, 0, 0.6].forEach(function (q) { flame(c, x + q * s, yy + s * 0.75, s * 1.4 * (1 - k * 0.4)); }); legLander(c, x, yy, s); }
        else { legLander(c, x, landY - s * 0.15, s); if (k < 0.3) [-0.6, 0.6].forEach(function (q) { flame(c, x + q * s, landY + s * 0.6, s * 0.6); }); }
      } else if (era.tech === 'airbags') {
        if (key === 'edl_airbags') { airbagBall(c, x, yy, s * (0.6 + 0.4 * k)); }
        else { var b = Math.abs(Math.sin(k * Math.PI * 3.5)) * (1 - k) * s * 6; airbagBall(c, x + k * s * 4, landY - b, s); }
      } else {
        if (key === 'edl_powered') { descentStage(c, x, yy, s, 1); rover(c, x, yy + s * 0.75, s * 0.75); }
        else if (key === 'edl_crane') {
          var dsY = landY - s * 3.2, cable = lerp(s * 0.8, landY - dsY - s * 0.2, easeOut(k));
          c.strokeStyle = OUT; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x - s * 0.5, dsY + s * 0.2); c.lineTo(x - s * 0.5, dsY + cable); c.moveTo(x + s * 0.5, dsY + s * 0.2); c.lineTo(x + s * 0.5, dsY + cable); c.stroke();
          descentStage(c, x, dsY, s, 0.8); rover(c, x, dsY + cable + s * 0.1, s * 0.75);
        } else { var fy = landY - s * 3.2 - k * h * 0.5, fx = x + k * w * 0.4; descentStage(c, fx, fy, s, 1.2); rover(c, x, landY + s * 0.1, s * 0.75); }
      }
    }
    return { key: key, index: at.index, done: t >= totalTime(era) };
  }

  root.EDL = { draw: draw, stagesFor: stagesFor, totalTime: totalTime, stageAt: stageAt };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.EDL;
})(typeof window !== 'undefined' ? window : globalThis);
