/* =====================================================================
   CHEMISTRY SHEEP – BACKGROUND ART & BOARD PLATE
   • paintBackground(theme, seed): scatters themed doodles behind the game
   • plateSvg(tiles, lay, layers): draws the board's shape (pyramid, flask…)
     as a solid outlined plate underneath the cards
   Add art for a new theme by adding an entry to ART below.
   ===================================================================== */
(function (root) {
  'use strict';

  /* Small SVG drawings (viewBox 0 0 100 100). */
  var SVG = {
    tuft: '<path d="M20 90 Q28 50 34 90 M32 90 Q44 30 52 90 M50 90 Q60 45 68 90 M66 90 Q74 60 80 90" fill="none" stroke="#5f9e2f" stroke-width="7" stroke-linecap="round"/>',
    flower: '<g stroke="#3f6212" stroke-width="4"><line x1="50" y1="55" x2="50" y2="95"/></g>' +
            '<g fill="#fff" stroke="#3f6212" stroke-width="3"><circle cx="50" cy="30" r="12"/><circle cx="34" cy="42" r="12"/><circle cx="66" cy="42" r="12"/><circle cx="40" cy="60" r="12"/><circle cx="60" cy="60" r="12"/></g>' +
            '<circle cx="50" cy="46" r="10" fill="#facc15" stroke="#3f6212" stroke-width="3"/>',
    cloud: '<path d="M20 70 Q8 70 10 56 Q12 44 26 46 Q28 28 46 30 Q58 18 70 32 Q88 30 88 50 Q96 56 90 68 Q86 72 78 70 Z" fill="#fff" opacity=".75"/>',
    stone: '<ellipse cx="50" cy="62" rx="30" ry="18" fill="#c3b48a" stroke="#6b5b32" stroke-width="4"/>',
    flask: '<path d="M40 12 H60 M44 12 V40 L22 84 Q20 90 28 90 H72 Q80 90 78 84 L56 40 V12" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/>' +
           '<path d="M30 72 H70" stroke="currentColor" stroke-width="4"/><circle cx="46" cy="80" r="4" fill="currentColor"/><circle cx="58" cy="76" r="3" fill="currentColor"/>',
    beaker: '<path d="M26 14 H74 M30 14 V84 Q30 90 36 90 H64 Q70 90 70 84 V14" fill="none" stroke="currentColor" stroke-width="5"/>' +
            '<path d="M30 40 H44 M30 56 H40 M30 72 H44" stroke="currentColor" stroke-width="4"/>',
    atom: '<g fill="none" stroke="currentColor" stroke-width="4"><ellipse cx="50" cy="50" rx="40" ry="14"/><ellipse cx="50" cy="50" rx="40" ry="14" transform="rotate(60 50 50)"/>' +
          '<ellipse cx="50" cy="50" rx="40" ry="14" transform="rotate(-60 50 50)"/></g><circle cx="50" cy="50" r="7" fill="currentColor"/>',
    benzene: '<polygon points="50,10 85,30 85,70 50,90 15,70 15,30" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" stroke-width="4"/>',
    tube: '<path d="M38 8 H62 M42 8 V80 Q42 92 50 92 Q58 92 58 80 V8" fill="none" stroke="currentColor" stroke-width="5"/><path d="M42 56 H58" stroke="currentColor" stroke-width="4"/>',
    arrow: '<path d="M10 50 H80 M64 34 L82 50 L64 66" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
    star: '<polygon points="50,8 61,38 92,38 67,57 76,88 50,70 24,88 33,57 8,38 39,38" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/>',
    text: function (t) { return '<text x="50" y="62" text-anchor="middle" font-size="34" font-family="Segoe Print, Comic Sans MS, cursive" fill="currentColor">' + t + '</text>'; },
    hex: '<polygon points="50,6 88,28 88,72 50,94 12,72 12,28" fill="currentColor"/>',
    dot: '<circle cx="50" cy="50" r="46" fill="currentColor"/>'
  };

  /* Which doodles each theme uses: [drawing, colour, min size, max size, rotate?] */
  var ART = {
    garden:   { count: 22, items: [['tuft', '', 30, 46, 0], ['tuft', '', 26, 40, 0], ['flower', '', 26, 38, 0], ['cloud', '', 70, 110, 0], ['stone', '', 24, 34, 0]] },
    lab:      { count: 18, items: [['flask', '#5eead4', 50, 80, 1], ['beaker', '#7dd3fc', 44, 70, 1], ['atom', '#a5b4fc', 50, 90, 1], ['benzene', '#5eead4', 40, 70, 1], ['tube', '#7dd3fc', 40, 66, 1]] },
    notebook: { count: 16, items: [['benzene', '#3b5bdb', 40, 64, 1], ['arrow', '#3b5bdb', 40, 60, 1], ['star', '#e8590c', 28, 40, 1], ['flask', '#3b5bdb', 40, 60, 1],
                                   [SVG.text('CH₃'), '#3b5bdb', 50, 70, 1], [SVG.text('C=O'), '#c92a2a', 50, 70, 1], [SVG.text('–OH'), '#3b5bdb', 50, 70, 1]] },
    minimal:  { count: 14, items: [['hex', '#c7d2fe', 40, 90, 1], ['dot', '#fbcfe8', 40, 110, 0], ['dot', '#bae6fd', 50, 130, 0], ['hex', '#bbf7d0', 30, 70, 1]] }
  };
  var OPACITY = { garden: 1, lab: 0.32, notebook: 0.45, minimal: 0.55 };

  function rngFrom(seed) {
    var s = (seed >>> 0) || 7;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  function paintBackground(el, theme, seed) {
    var art = ART[theme]; el.innerHTML = '';
    if (!art) return;
    var rng = rngFrom(seed), html = '';
    // spread doodles over a jittered grid so they don't clump
    var cols = 4, rows = Math.ceil(art.count / cols);
    for (var i = 0; i < art.count; i++) {
      var it = art.items[i % art.items.length];
      var body = SVG[it[0]] || it[0];
      var size = it[2] + rng() * (it[3] - it[2]);
      var x = ((i % cols) + 0.15 + rng() * 0.7) / cols * 100;
      var y = (Math.floor(i / cols) + 0.15 + rng() * 0.7) / rows * 100;
      var rot = it[4] ? (rng() * 50 - 25) : 0;
      html += '<svg viewBox="0 0 100 100" style="left:' + x.toFixed(1) + '%;top:' + y.toFixed(1) + '%;width:' + size.toFixed(0) + 'px;height:' + size.toFixed(0) +
        'px;transform:translate(-50%,-50%) rotate(' + rot.toFixed(0) + 'deg);color:' + it[1] + ';opacity:' + OPACITY[theme] + '">' + body + '</svg>';
    }
    el.innerHTML = html;
  }

  /* Board plate: union of padded rectangles around every slot, drawn
     outline-first so only the outer edge of the shape gets a border. */
  function plateSvg(slots, lay, layers) {
    var pad = Math.max(6, lay.halfW * 0.22), bandFill = (layers - 1) * lay.halfH; // fill the gap below each bottom-layer row
    var rects = slots.map(function (sl) {
      var x = sl.x * lay.halfW - pad, y = sl.y * lay.halfH - pad;
      var w = lay.halfW * 2 + pad * 2, h = lay.halfH * 2 + pad * 2 + (sl.layer === 0 ? bandFill : 0);
      return [x, y, w, h];
    });
    var r = Math.min(18, pad * 1.6);
    function draw(extra) {
      return rects.map(function (q) {
        return '<rect x="' + (q[0] - extra).toFixed(1) + '" y="' + (q[1] - extra).toFixed(1) + '" width="' + (q[2] + extra * 2).toFixed(1) + '" height="' + (q[3] + extra * 2).toFixed(1) + '" rx="' + r + '"/>';
      }).join('');
    }
    var W = lay.gridW * lay.halfW, H = lay.gridH * lay.halfH;
    var m = pad + 14;
    return '<svg class="plate" viewBox="' + (-m) + ' ' + (-m) + ' ' + (W + m * 2) + ' ' + (H + m * 2 + bandFill) + '" style="left:' + (-m) + 'px;top:' + (-m) + 'px;width:' + (W + m * 2) + 'px;height:' + (H + m * 2 + bandFill) + 'px">' +
      '<g class="plate-shadow" transform="translate(0,8)">' + draw(4) + '</g>' +
      '<g class="plate-edge">' + draw(4) + '</g>' +
      '<g class="plate-fill">' + draw(0) + '</g></svg>';
  }

  root.ChemDeco = { paintBackground: paintBackground, plateSvg: plateSvg };
})(window);
