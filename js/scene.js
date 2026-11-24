/* =====================================================================
   ORGO-GO! – LAB SCENE
   Draws the lab wall, the window (sky follows the real clock, or the real
   weather if the player switches it on in Settings) and the bench items
   (books, flask, graduated cylinder, Bunsen burner boiling a beaker).
   Exposes window.ChemScene.
   ===================================================================== */
(function (root) {
  'use strict';

  var TEAL = '#0f7a7a', WALL = '#cfe6e1', LINE = '#b7d4cd', WOOD = '#b8925c';
  var uid = 0;

  /* ---------------- Sky state ---------------- */
  // Time of day from the device clock
  function timeState(d) {
    var h = d.getHours() + d.getMinutes() / 60;
    if (h >= 5 && h < 8) return 'morning';
    if (h >= 8 && h < 17) return 'day';
    if (h >= 17 && h < 19.5) return 'sunset';
    return 'night';
  }
  function timeLabel(d) {
    var h = d.getHours();
    return h >= 5 && h < 12 ? 'Morning' : h >= 12 && h < 17 ? 'Afternoon' : h >= 17 && h < 20 ? 'Evening' : 'Night';
  }
  // Open-Meteo weather codes -> what the window shows
  function weatherKind(code) {
    if (code == null) return null;
    if (code >= 51 && code <= 67) return 'rain';
    if (code >= 80 && code <= 82) return 'rain';
    if (code >= 95) return 'rain';
    if (code >= 2) return 'cloudy';
    return 'clear';
  }
  var KIND_LABEL = { rain: 'Rain', cloudy: 'Cloudy', clear: 'Clear' };

  /* Returns { sky, label } for the window. wx = cached weather or null. */
  function skyFor(now, wx) {
    var t = timeState(now), k = wx ? weatherKind(wx.code) : null;
    var sky = t;
    if (k === 'rain') sky = t === 'night' ? 'rainnight' : 'rain';
    else if (k === 'cloudy' && t !== 'night') sky = 'cloudy';
    var label = wx ? (k === 'clear' ? (t === 'night' ? 'Clear night' : t === 'day' ? 'Sunny' : 'Clear') : KIND_LABEL[k]) + ' · ' + Math.round(wx.temp) + '°C'
                   : timeLabel(now);
    return { sky: sky, label: label };
  }

  /* ---------------- Drawing helpers ---------------- */
  function cloud(cy, s, dur, delay, col, op) {
    return '<g transform="translate(0,' + cy.toFixed(0) + ')"><g class="sc-drift" style="--d:' + dur + 's;--l:' + delay + 's">' +
      '<g fill="' + (col || '#fff') + '" opacity="' + (op || 0.9) + '"><circle r="' + 8 * s + '"/><circle cx="' + 10 * s + '" cy="' + (-5 * s) + '" r="' + 10 * s + '"/>' +
      '<circle cx="' + 22 * s + '" r="' + 7 * s + '"/><rect x="' + (-8 * s) + '" width="' + 38 * s + '" height="' + 7 * s + '" rx="' + 3.5 * s + '"/></g></g></g>';
  }
  function bird(y, dur, delay) {
    return '<g transform="translate(0,' + y.toFixed(0) + ')"><g class="sc-fly" style="--d:' + dur + 's;--l:' + delay + 's"><g class="sc-wing">' +
      '<path d="M0 0q4-5 8 0q4-5 8 0" stroke="#3b4a4c" stroke-width="1.6" fill="none" stroke-linecap="round"/></g></g></g>';
  }
  var GRAD = { morning: ['#ffd7a1', '#aee0f0'], day: ['#6fc0ee', '#d4eef9'], cloudy: ['#a9c3d3', '#dfe9ee'], sunset: ['#f08f6a', '#f9d6a0'],
               night: ['#1b2b57', '#3c5088'], rain: ['#8fa5b3', '#c3d0d7'], rainnight: ['#2a3747', '#4a5a6c'] };

  function skySvg(state, w, h) {
    var id = 'sky' + (++uid), g = GRAD[state] || GRAD.day;
    var s = '<svg class="sc-sky" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" style="--sw:' + w + 'px" aria-hidden="true">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + g[0] + '"/><stop offset="1" stop-color="' + g[1] + '"/></linearGradient></defs>' +
      '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + ')"/>';
    if (state === 'morning') s += '<circle cx="' + w * .22 + '" cy="' + h * .82 + '" r="11" fill="#ffb64d"/>' + cloud(h * .32, .9, 46, -10, '#fff', .85) + bird(h * .42, 16, -4);
    else if (state === 'day') s += '<circle cx="' + w * .78 + '" cy="' + h * .27 + '" r="12" fill="#ffe27a"/>' + cloud(h * .6, .9, 52, -30) + cloud(h * .36, 1.1, 40, -8) + bird(h * .3, 15, -2) + bird(h * .48, 19, -9);
    else if (state === 'cloudy') s += cloud(h * .3, 1.3, 50, -6, '#f4f7f9', .95) + cloud(h * .55, 1.1, 42, -24, '#e6edf1', .95) + cloud(h * .2, 1, 58, -40, '#fff', .9) + bird(h * .62, 18, -6);
    else if (state === 'sunset') s += '<circle cx="' + w * .5 + '" cy="' + h * .92 + '" r="17" fill="#ffb347"/>' + cloud(h * .4, .9, 50, -20, '#fbc3a8') + cloud(h * .24, 1, 44, -6, '#fbc3a8') + bird(h * .52, 17, -5);
    else if (state === 'night') {
      [[.1, .2], [.28, .45], [.45, .15], [.6, .55], [.88, .18], [.92, .66], [.2, .78], [.52, .84]].forEach(function (p, n) {
        s += '<circle class="sc-tw" style="--l:' + (-n * .4).toFixed(1) + 's" cx="' + (w * p[0]).toFixed(1) + '" cy="' + (h * p[1]).toFixed(1) + '" r="1.4" fill="#fff"/>';
      });
      s += '<circle cx="' + w * .7 + '" cy="' + h * .32 + '" r="11" fill="#f4f1d0"/><circle cx="' + (w * .7 + 6) + '" cy="' + (h * .32 - 3) + '" r="10" fill="#22356a"/>';
    } else if (state === 'rain' || state === 'rainnight') {
      var c = state === 'rain' ? '#6f8492' : '#56677a';
      s += cloud(h * .22, 1.4, 60, -14, c, .95) + cloud(h * .16, 1.5, 48, -34, c, .95);
      for (var i = 0; i < 16; i++) {
        var x = 8 + (i * 37) % Math.max(20, Math.floor(w - 12)), y = 28 + (i * 23) % Math.max(20, Math.floor(h - 40));
        s += '<path class="sc-rain" style="--l:' + (-i * .13).toFixed(2) + 's" d="M' + x + ' ' + y + 'l-3 8" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>';
      }
    }
    return s + '</svg>';
  }

  var GL = 'fill="#fff" fill-opacity=".6" stroke="' + TEAL + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"';
  // Each item: width and an SVG <g> drawn with its base at y=0 (things grow upwards)
  var ITEMS = {
    books: { w: 54, svg: function () {
      var s = '', x = 0;
      [[11, 44, '#0f7a7a'], [13, 52, '#e0a62e'], [10, 38, '#3d5fb0'], [12, 46, '#a8581a']].forEach(function (b) {
        s += '<rect x="' + x + '" y="' + (-b[1]) + '" width="' + b[0] + '" height="' + b[1] + '" rx="2" fill="' + b[2] + '"/><rect x="' + x + '" y="' + (-b[1] + 6) + '" width="' + b[0] + '" height="3" fill="#fff" opacity=".55"/>';
        x += b[0] + 2;
      });
      return s;
    } },
    flask: { w: 38, svg: function () {
      return '<g transform="translate(1,-47)"><path d="M13 0h10v16l12 26a4 4 0 0 1-3.6 5.4H4.6A4 4 0 0 1 1 42l12-26z" ' + GL + '/>' +
        '<path d="M7 32h22l6 10a3 3 0 0 1-2.7 4.4H3.7A3 3 0 0 1 1 42z" fill="' + TEAL + '" opacity=".55"/></g>';
    } },
    cylinder: { w: 20, svg: function () {
      return '<g transform="translate(1,-54)"><path d="M3 0h12v46a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" ' + GL + '/><path d="M4 24h10v22a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill="#e0a62e" opacity=".8"/>' +
        '<path d="M3 8h5M3 14h3M3 20h5M3 26h3M3 32h5M3 38h3" stroke="' + TEAL + '" stroke-width="1.4"/><rect y="49" width="18" height="5" rx="2.5" fill="' + TEAL + '"/></g>';
    } },
    rack: { w: 38, svg: function () {
      var s = '<g transform="translate(2,-32)"><rect x="-2" y="20" width="36" height="5" rx="2" fill="' + WOOD + '"/><rect x="0" y="25" width="4" height="7" fill="' + WOOD + '"/><rect x="28" y="25" width="4" height="7" fill="' + WOOD + '"/>';
      ['#0f7a7a', '#e0a62e', '#3d5fb0'].forEach(function (c, i) {
        var x0 = i * 11;
        s += '<path d="M' + (x0 + 1) + ' 0v22a4 4 0 0 0 8 0V0" fill="#fff" fill-opacity=".6" stroke="' + TEAL + '" stroke-width="1.8" stroke-linecap="round"/><path d="M' + (x0 + 2) + ' 12h6v10a3 3 0 0 1-6 0z" fill="' + c + '" opacity=".85"/>';
      });
      return s + '</g>';
    } },
    burner: { w: 58, svg: function () {
      return '<g transform="translate(1,0)">' +
        '<path d="M8 -34L4 0M48 -34L52 0" stroke="#3b4a4c" stroke-width="2.4" stroke-linecap="round"/><rect x="6" y="-36" width="44" height="3" rx="1.5" fill="#3b4a4c"/>' +
        '<rect x="16" y="-5" width="24" height="5" rx="2.5" fill="#3b4a4c"/><rect x="24" y="-24" width="8" height="20" rx="2" fill="#5f7a80"/><rect x="22" y="-14" width="12" height="4" fill="#e0a62e"/>' +
        '<g transform="translate(28,-24)"><g class="sc-flame"><path d="M0 -12C-5 -6 -4 -1 0 0C4 -1 5 -6 0 -12z" fill="#f2a23b"/></g>' +
        '<g class="sc-flame sc-flame2"><path d="M0 -7C-2.5 -4 -2 -1 0 0C2 -1 2.5 -4 0 -7z" fill="#ffe27a"/></g><path d="M0 -3C-1.5 -2 -1.2 0 0 0C1.2 0 1.5 -2 0 -3z" fill="#4aa3df"/></g>' +
        '<g transform="translate(13,-64)"><path d="M3 9h24v15a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" fill="#3d5fb0" opacity=".55"/>' +
        '<circle class="sc-bub" style="--l:0s" cx="9" cy="22" r="2" fill="#fff"/><circle class="sc-bub" style="--l:-.6s" cx="15" cy="22" r="2.4" fill="#fff"/><circle class="sc-bub" style="--l:-1.1s" cx="21" cy="22" r="1.8" fill="#fff"/>' +
        '<path d="M2 0v24a4 4 0 0 0 4 4h18a4 4 0 0 0 4-4V0" fill="none" stroke="' + TEAL + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M0 0h30" stroke="' + TEAL + '" stroke-width="2" stroke-linecap="round"/>' +
        '<path class="sc-steam" style="--l:0s" d="M9 -3q-3-4 0-8" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>' +
        '<path class="sc-steam" style="--l:-.9s" d="M15 -3q3-4 0-8" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>' +
        '<path class="sc-steam" style="--l:-1.7s" d="M21 -3q-3-4 0-8" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></g></g>';
    } }
  };
  var ORDER = ['burner', 'flask', 'cylinder', 'books', 'rack'];  // placed from the window leftwards

  /* Paint a scene into el.
     opts: { width, height, winW, winH, minX (leftmost x items may use), sky, label, showLabel } */
  function paint(el, opts) {
    var W = Math.max(280, Math.round(opts.width)), H = opts.height, bench = 14, benchY = H - bench;
    var ww = Math.round(opts.winW), wh = Math.round(opts.winH);
    var wx = W - ww - 14, wy = Math.max(6, benchY - wh - 14);
    var px = wx + 6, py = wy + 6, pw = ww - 12, ph = wh - 12;
    var pid = 'tile' + (++uid);
    var back = '<svg class="sc-layer" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
      '<defs><pattern id="' + pid + '" width="36" height="24" patternUnits="userSpaceOnUse"><path d="M0 12h36M0 0v12M18 12v12" stroke="' + LINE + '" stroke-width="1.2" fill="none"/></pattern></defs>' +
      '<rect width="' + W + '" height="' + benchY + '" fill="' + WALL + '"/><rect width="' + W + '" height="' + benchY + '" fill="url(#' + pid + ')"/>' +
      '<rect x="' + wx + '" y="' + wy + '" width="' + ww + '" height="' + wh + '" rx="6" fill="#fff" stroke="' + LINE + '"/>' +
      '<rect y="' + benchY + '" width="' + W + '" height="' + bench + '" fill="' + WOOD + '"/><rect y="' + benchY + '" width="' + W + '" height="3" fill="#cfa86e"/></svg>';
    var sky = '<div class="sc-win" style="left:' + px + 'px;top:' + py + 'px;width:' + pw + 'px;height:' + ph + 'px">' + skySvg(opts.sky, pw, ph) + '</div>';
    var items = '', x = wx - 14;
    for (var i = 0; i < ORDER.length; i++) {
      var it = ITEMS[ORDER[i]];
      if (x - it.w < (opts.minX || 12)) break;
      x -= it.w;
      items += '<g transform="translate(' + x + ',' + (benchY + 1) + ')">' + it.svg() + '</g>';
      x -= 10;
    }
    var front = '<svg class="sc-layer" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true">' +
      '<path d="M' + (px + pw / 2) + ' ' + py + 'v' + ph + 'M' + px + ' ' + (py + ph / 2) + 'h' + pw + '" stroke="#fff" stroke-width="4"/>' +
      '<rect x="' + (wx - 6) + '" y="' + (wy + wh) + '" width="' + (ww + 12) + '" height="7" rx="3" fill="#fff" stroke="' + LINE + '"/>' + items + '</svg>';
    var label = opts.showLabel ? '<div class="sc-pill" style="left:' + (px + 5) + 'px;top:' + (py + 5) + 'px">' + opts.label + '</div>' : '';
    el.innerHTML = back + sky + front + label;
  }

  /* ---------------- Real weather (optional, off by default) ---------------- */
  var WX_TTL = 30 * 60 * 1000;
  function fetchJson(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  function getWeather(lat, lon) {
    return fetchJson('https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current=temperature_2m,weather_code,is_day&timezone=auto')
      .then(function (j) { return { code: j.current.weather_code, temp: j.current.temperature_2m, t: Date.now() }; });
  }
  function findCity(name) {
    return fetchJson('https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=' + encodeURIComponent(name))
      .then(function (j) {
        if (!j.results || !j.results.length) throw new Error('notfound');
        var r = j.results[0];
        return { lat: +r.latitude.toFixed(2), lon: +r.longitude.toFixed(2), city: r.name + (r.country_code ? ', ' + r.country_code : '') };
      });
  }
  function getPosition() {
    return new Promise(function (res, rej) {
      if (!navigator.geolocation) { rej(new Error('unsupported')); return; }
      navigator.geolocation.getCurrentPosition(function (p) {
        res({ lat: +p.coords.latitude.toFixed(2), lon: +p.coords.longitude.toFixed(2), city: null }); // rounded to about 1 km
      }, function (e) { rej(e); }, { maximumAge: 3600000, timeout: 15000, enableHighAccuracy: false });
    });
  }

  root.ChemScene = { paint: paint, skyFor: skyFor, timeState: timeState, weatherKind: weatherKind,
                     getWeather: getWeather, findCity: findCity, getPosition: getPosition, WX_TTL: WX_TTL };
})(window);
