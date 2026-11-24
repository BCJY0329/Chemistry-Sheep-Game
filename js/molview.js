/* =====================================================================
   ORGO-GO! – STRUCTURE DRAWING
   Draws a molecule (atoms + bonds from js/chem.js) as an SVG string.
   skeletal: carbons are corners/line ends, only other atoms are written.
   expanded: every atom (including C and H) is written, every bond drawn.
   Exposes window.MolView.svg(mol, { expanded, width, height, maxBond }).
   ===================================================================== */
(function (root) {
  'use strict';
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  function svg(mol, o) {
    o = o || {};
    var W = o.width || 320, H = o.height || 200, pad = 22;
    var A = mol.a, B = mol.b, expanded = !!o.expanded;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    A.forEach(function (a) { minX = Math.min(minX, a[0]); maxX = Math.max(maxX, a[0]); minY = Math.min(minY, a[1]); maxY = Math.max(maxY, a[1]); });
    var bw = Math.max(maxX - minX, 0.01), bh = Math.max(maxY - minY, 0.01);
    var s = Math.min((W - 2 * pad) / bw, (H - 2 * pad) / bh, o.maxBond || 46);
    var ox = (W - bw * s) / 2 - minX * s, oy = (H - bh * s) / 2 - minY * s;
    var P = A.map(function (a) { return [a[0] * s + ox, a[1] * s + oy]; });
    var fs = Math.max(10, Math.min(18, s * 0.46));

    // which atoms carry a written label, and how far lines stop short of them
    var deg = A.map(function () { return 0; }), nb = A.map(function () { return []; });
    B.forEach(function (b) { deg[b[0]]++; deg[b[1]]++; nb[b[0]].push(b[1]); nb[b[1]].push(b[0]); });
    var label = A.map(function (a, i) {
      if (expanded) return a[2];
      if (a[2] === 'C' && deg[i] > 0) return null;
      var h = a[3];
      return a[2] + (h ? 'H' + (h > 1 ? h : '') : '');
    });
    var gap = fs * 0.62;

    var out = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(o.title || 'Chemical structure') + '">';
    out += '<g stroke="#17323a" stroke-width="' + Math.max(1.4, s * 0.045).toFixed(2) + '" stroke-linecap="round">';
    function line(x1, y1, x2, y2) { out += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '"/>'; }
    B.forEach(function (b) {
      var p = P[b[0]], q = P[b[1]], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
      var c1 = label[b[0]] ? gap : 0, c2 = label[b[1]] ? gap : 0;
      var x1 = p[0] + ux * c1, y1 = p[1] + uy * c1, x2 = q[0] - ux * c2, y2 = q[1] - uy * c2;
      var off = s * 0.13;
      if (b[2] === 1) line(x1, y1, x2, y2);
      else if (b[2] === 2 && b[3]) {        // ring double bond: second line inside the ring
        var cx = b[3][0] * s + ox, cy = b[3][1] * s + oy;
        var sgn = ((cx - p[0]) * nx + (cy - p[1]) * ny) > 0 ? 1 : -1;
        line(x1, y1, x2, y2);
        var sh = L * 0.14;
        line(x1 + ux * (c1 ? 0 : sh) + nx * off * sgn * 1.4, y1 + uy * (c1 ? 0 : sh) + ny * off * sgn * 1.4,
             x2 - ux * (c2 ? 0 : sh) + nx * off * sgn * 1.4, y2 - uy * (c2 ? 0 : sh) + ny * off * sgn * 1.4);
      } else if (b[2] === 2) {
        line(x1 + nx * off, y1 + ny * off, x2 + nx * off, y2 + ny * off);
        line(x1 - nx * off, y1 - ny * off, x2 - nx * off, y2 - ny * off);
      } else {
        line(x1, y1, x2, y2);
        line(x1 + nx * off * 1.3, y1 + ny * off * 1.3, x2 + nx * off * 1.3, y2 + ny * off * 1.3);
        line(x1 - nx * off * 1.3, y1 - ny * off * 1.3, x2 - nx * off * 1.3, y2 - ny * off * 1.3);
      }
    });
    out += '</g><g font-family="Nunito, sans-serif" font-weight="800" font-size="' + fs.toFixed(1) + '" text-anchor="middle">';
    A.forEach(function (a, i) {
      var lab = label[i]; if (!lab) return;
      var col = a[2] === 'O' ? '#c0392b' : a[2] === 'N' ? '#2a4fb0' : a[2] === 'Cl' ? '#2e8b3a' : a[2] === 'F' ? '#2e8b3a' : a[2] === 'Br' ? '#8a3b12' : '#17323a';
      // put H in front ("HO", "H2N") when the bond leaves to the right
      var leftSide = nb[i].length === 1 && P[nb[i][0]][0] > P[i][0] + 1 && !expanded && lab.length > 1 && lab.indexOf('H') > 0;
      var el = a[2], h = lab.slice(el.length);
      var parts = leftSide ? [[h, true], [el, false]] : [[el, false], [h, true]];
      var t = '';
      parts.forEach(function (pt) {
        if (!pt[0]) return;
        if (pt[1]) { var m = pt[0].match(/^H(\d*)$/); t += 'H' + (m && m[1] ? '<tspan font-size="' + (fs * 0.7).toFixed(1) + '" dy="' + (fs * 0.28).toFixed(1) + '">' + m[1] + '</tspan><tspan dy="' + (-fs * 0.28).toFixed(1) + '"></tspan>' : ''); }
        else t += esc(pt[0]);
      });
      // anchor the element letter on the atom position
      var anchor = leftSide ? 'end' : 'start', dxs = leftSide ? fs * 0.38 : -fs * 0.38;
      if (lab === el) { anchor = 'middle'; dxs = 0; }
      out += '<text x="' + (P[i][0] + dxs).toFixed(1) + '" y="' + (P[i][1] + fs * 0.36).toFixed(1) + '" fill="' + col + '" text-anchor="' + anchor + '">' + t + '</text>';
    });
    return out + '</g></svg>';
  }
  root.MolView = { svg: svg };
})(window);
