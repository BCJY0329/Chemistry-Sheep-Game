/* =====================================================================
   ORGO-GO! – USER INTERFACE
   Screens: home, game, notes, tutorial, records (+ tab bar, settings, overlay, toast)
   Progress saved on this device: wins, best times, XP/rank, daily streak,
   Today's Experiment, specimen shelf (series collected), weather setting.
   ===================================================================== */
(function () {
  'use strict';
  var D = window.CHEM_DATA, E = window.ChemEngine, S = window.ChemScene, Q = window.ChemQuiz, MV = window.MolView;
  var TYPE_LABEL = {}; D.CARD_TYPES.forEach(function (t) { TYPE_LABEL[t.id] = t.label; });
  var SHORT_LABEL = { fg: 'Group', gf: 'Formula', ex: 'Example', name: 'Name', q: 'Question' };
  var MODE_ORDER = ['easy', 'medium', 'hard', 'extreme'];
  var BOSS_MODES = { medium: 'medium', hard: 'hard', extreme: 'hard' };      // modes that end with a boss, and its tier
  var BOSS_BASE = { medium: 200, hard: 350, extreme: 500 };
  var BOSS_FULL_S = { medium: 20, hard: 30, extreme: 20 }, BOSS_LOW_S = { medium: 90, hard: 120, extreme: 80 };
  var SERIES_BY_ID = {}; D.SERIES.forEach(function (s) { SERIES_BY_ID[s.id] = s; });
  var SYMBOL = { alkane: 'Ak', alkene: 'Ae', alkyne: 'Ay', alcohol: 'Ol', carboxylic: 'Ca', ester: 'Es', haloalkane: 'Hx', aldehyde: 'Al',
                 ketone: 'Ke', ether: 'Et', acylchloride: 'Ac', amide: 'Am', amine: 'An', nitrile: 'Ni' };
  var RANKS = [[0, 'Lab Visitor'], [100, 'Lab Assistant'], [250, 'Lab Technician'], [450, 'Senior Technician'], [700, 'Research Assistant'],
               [1000, 'Chemist'], [1400, 'Senior Chemist'], [1900, 'Lab Manager'], [2500, 'Professor of Chemistry']];
  var WIN_XP = { easy: 30, medium: 50, hard: 80, extreme: 120, practice: 10 };
  /* Today's Experiment rotates through these, one per day. L = the player's level (easy/medium/hard). */
  var CLOCK_MS = { easy: 150000, medium: 270000, hard: 420000 };
  var DAILY_TYPES = [
    { name: 'Carbonyl Day', desc: 'Only the six series with a C=O group', opts: function () { return { mode: 'medium', seriesIds: ['aldehyde', 'ketone', 'carboxylic', 'ester', 'acylchloride', 'amide'] }; } },
    { name: 'Tight Tray', desc: 'Only 6 tray slots instead of 7', opts: function (L) { return { mode: L, traySize: 6 }; } },
    { name: 'Name-it Day', desc: 'Example cards show IUPAC names instead of formulas', opts: function (L) { return { mode: L, nameIt: true }; } },
    { name: 'Quiz Gauntlet', desc: '5 ? question blocks on the board, then a boss', boss: true, opts: function (L) { return { mode: L === 'easy' ? 'easy' : 'medium', questions: 5 }; } },
    { name: 'Look-alike Day', desc: 'Ten series that are easy to mix up', opts: function () { return { mode: 'medium', seriesIds: ['aldehyde', 'ketone', 'alcohol', 'ether', 'carboxylic', 'ester', 'amine', 'amide', 'alkene', 'alkyne'] }; } },
    { name: 'No Safety Net', desc: 'No undo, no hints, no shuffle', opts: function (L) { return { mode: L, noHelp: true }; } },
    { name: 'Double Trouble', desc: 'Every series appears twice, with different examples', opts: function () { return { mode: 'easy', repeats: 5 }; } },
    { name: 'Beat the Clock', desc: 'Clear the board before the countdown runs out', clock: true, opts: function (L) { return { mode: L, timeLimitMs: CLOCK_MS[L] }; } },
    { name: 'Nitrogen Day', desc: 'Amines, amides, nitriles and the acids they come from', opts: function () { return { mode: 'easy', seriesIds: ['amine', 'amide', 'nitrile', 'carboxylic', 'acylchloride'] }; } },
    { name: 'Hydrocarbons & Halogens', desc: 'Alkanes, alkenes, alkynes and haloalkanes – with a 6-slot tray', opts: function () { return { mode: 'easy', seriesIds: ['alkane', 'alkene', 'alkyne', 'haloalkane'], traySize: 6 }; } }
  ];
  var DAILY_BONUS = 50;

  /* Line icons (stroke follows the text colour) */
  function svgI(d, sw) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2.2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>'; }
  var ICON = {
    back: svgI('<path d="M15 5l-7 7 7 7"/>'), pause: svgI('<path d="M9 5v14M15 5v14"/>'),
    undo: svgI('<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>'),
    hint: svgI('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'),
    shuffle: svgI('<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>'),
    lock: svgI('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    check: svgI('<path d="M5 12l5 5 9-10"/>', 3), play: svgI('<path d="M7 4l13 8-13 8z" fill="currentColor"/>'),
    flask: svgI('<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3"/>'),
    notes: svgI('<path d="M6 3h9l4 4v14H6zM9 12h7M9 16h7"/>'),
    trophy: svgI('<path d="M8 4h8v6a4 4 0 0 1-8 0zM8 6H4c0 3 1 5 4 5M16 6h4c0 3-1 5-4 5M12 14v4M8 21h8"/>'),
    learn: svgI('<path d="M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5"/>'),
    gear: svgI('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>', 1.8),
    clock: svgI('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>'),
    star: svgI('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
    tubes: svgI('<path d="M7 3v13a3 3 0 0 0 6 0V3M5 3h10M17 8v8a3 3 0 0 0 4 2.8"/>'),
    tray: svgI('<path d="M3 13h5l2 3h4l2-3h5M5 5h14l2 8v6H3v-6z"/>'),
    swords: svgI('<path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M9.5 6.5L13 3h3v3l-3.5 3.5M5 14l4 4M7 17l-3 3M3 19l2 2"/>'),
    sun: svgI('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    sound: svgI('<path d="M11 5L6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>'),
    phone: svgI('<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>'),
    pin: svgI('<path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>'),
    flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="flame" d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-6 1-10z" fill="#F2A23B"/></svg>'
  };
  function ico(name) { return '<i class="ico">' + ICON[name] + '</i>'; }
  function fillIcons(root) { (root || document).querySelectorAll('i.ico[data-ico]').forEach(function (n) { n.innerHTML = ICON[n.getAttribute('data-ico')] || ''; }); }

  function $(s, r) { return (r || document).querySelector(s); }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function fmtTime(ms) {
    var t = Math.max(0, Math.floor(ms / 100)), d = t % 10, s = Math.floor(t / 10) % 60, m = Math.floor(t / 600);
    return m + ':' + (s < 10 ? '0' : '') + s + '.' + d;
  }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function yesterdayKey() { var d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); }

  /* ---------------- Storage (this device only) ---------------- */
  var KEY = 'chemsheep.v1', store = null;
  function load() {
    if (store) return store;
    try { store = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { store = {}; }
    store.wins = store.wins || { easy: 0, medium: 0, hard: 0 };
    if (store.wins.extreme == null) store.wins.extreme = 0;
    store.recentBoss = store.recentBoss || [];
    store.best = store.best || {};
    store.history = store.history || [];
    if (store.muted == null) store.muted = false;
    store.xp = store.xp || 0;
    store.streak = store.streak || { days: 0, last: null };
    store.daily = store.daily || { done: null };
    store.mastery = store.mastery || {};
    store.weather = store.weather || { on: false };
    store.lastMode = store.lastMode || 'easy';
    return store;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* storage unavailable */ } }
  function isUnlocked(mode) {
    var s = load();
    if (mode === 'medium') return s.wins.easy >= E.UNLOCK_WINS;
    if (mode === 'hard') return s.wins.medium >= E.UNLOCK_WINS;
    if (mode === 'extreme') return s.wins.hard >= E.UNLOCK_WINS;
    return true;
  }
  function rankInfo(xp) {
    var i = 0; while (i + 1 < RANKS.length && xp >= RANKS[i + 1][0]) i++;
    var next = RANKS[i + 1];
    return { level: i + 1, name: RANKS[i][1], from: RANKS[i][0], next: next ? next[0] : null, nextName: next ? next[1] : null };
  }
  function streakNow() {
    var st = load().streak;
    return st.last === dayKey() || st.last === yesterdayKey() ? st.days : 0;
  }
  function bumpStreak() {
    var st = load().streak, today = dayKey();
    if (st.last === today) return;
    st.days = st.last === yesterdayKey() ? st.days + 1 : 1; st.last = today;
  }
  function dailyInfo() {
    var k = dayKey(), seed = +k.replace(/-/g, ''), d = new Date();
    var dayNo = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
    var L = isUnlocked('hard') ? 'hard' : isUnlocked('medium') ? 'medium' : 'easy';
    var type = DAILY_TYPES[dayNo % DAILY_TYPES.length], opts = type.opts(L);
    opts.seed = seed; opts.daily = true; opts.dailyType = type;
    return { seed: seed, type: type, opts: opts, done: load().daily.done === k };
  }
  function level(count) { return count >= 3 ? 3 : count >= 2 ? 2 : count >= 1 ? 1 : 0; }

  /* ---------------- Sound ---------------- */
  var actx = null;
  function tone(freq, dur, type, vol, when) {
    if (load().muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      var t = actx.currentTime + (when || 0), o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol || 0.07, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* audio unavailable */ }
  }
  var sfx = {
    pick: function () { tone(540, 0.07, 'triangle', 0.07); },
    bad: function () { tone(170, 0.14, 'square', 0.035); },
    undo: function () { tone(440, 0.08, 'triangle'); tone(330, 0.1, 'triangle', 0.06, 0.07); },
    match: function () { tone(660, 0.1); tone(880, 0.11, 'sine', 0.07, 0.08); tone(1175, 0.16, 'sine', 0.06, 0.16); },
    hint: function () { tone(988, 0.08, 'sine', 0.05); tone(1319, 0.1, 'sine', 0.05, 0.08); },
    win: function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.18, 'triangle', 0.08, i * 0.12); }); },
    lose: function () { [392, 330, 262].forEach(function (f, i) { tone(f, 0.22, 'sawtooth', 0.04, i * 0.16); }); }
  };

  /* ---------------- Scenes: wall, window (live sky) and bench ---------------- */
  function weatherCache() {
    var w = load().weather;
    return w.on && w.cache && Date.now() - w.cache.t < 3 * 3600 * 1000 ? w.cache : null;
  }
  var lastSkyKey = '';
  function paintScenes() {
    var sky = S.skyFor(new Date(), weatherCache());
    lastSkyKey = sky.sky + '|' + sky.label;
    var scr = $('#screen-' + current); if (!scr) return;
    scr.querySelectorAll('.scene').forEach(function (sc) {
      var W = sc.clientWidth, H = sc.clientHeight; if (!W || !H) return;
      var game = sc.id === 'game-scene', home = sc.id === 'home-scene';
      var minX = 12;
      if (game) { var t = $('.g-title'); minX = Math.max(140, t.getBoundingClientRect().right - sc.getBoundingClientRect().left + 14); }
      else if (!home) minX = Math.min(W * 0.55, 230);
      S.paint(sc, { width: W, height: H, sky: sky.sky, label: sky.label, showLabel: !game, minX: minX,
        winW: home ? Math.min(176, W * 0.4) : game ? Math.min(132, W * 0.32) : Math.min(150, W * 0.36),
        winH: home ? 104 : game ? 54 : 70 });
    });
  }
  setInterval(function () {
    var sky = S.skyFor(new Date(), weatherCache());
    if (sky.sky + '|' + sky.label !== lastSkyKey) paintScenes();
  }, 60000);

  /* Real weather: only when switched on in Settings, refreshed at most every 30 minutes */
  function refreshWeather(force) {
    var w = load().weather;
    if (!w.on || w.lat == null || !navigator.onLine) return Promise.resolve(false);
    if (!force && w.cache && Date.now() - w.cache.t < S.WX_TTL) return Promise.resolve(false);
    return S.getWeather(w.lat, w.lon).then(function (c) { w.cache = c; save(); paintScenes(); return true; })
      .catch(function () { return false; });
  }
  setInterval(refreshWeather, 10 * 60 * 1000);

  /* ---------------- Screens & tab bar ---------------- */
  var current = 'home';
  function show(name) {
    if (name === 'menu' || name === 'modes') name = 'home';
    if (name !== current) closeModal();
    if (current === 'game' && name !== 'game') stopTimer();
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    $('#screen-' + name).classList.add('active');
    current = name;
    document.body.classList.toggle('in-game', name === 'game');
    document.querySelectorAll('#tabbar [data-go]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-go') === name); });
    var sc = $('#screen-' + name + ' .scroll'); if (sc) sc.scrollTop = 0;
    window.scrollTo(0, 0);
    if (name === 'home') renderHome();
    if (name === 'notes') renderNotes();
    if (name === 'tutorial') renderTutorial();
    if (name === 'records') renderRecords();
    if (name !== 'game') paintScenes();
  }
  document.addEventListener('click', function (e) {
    var go = e.target.closest('[data-go]');
    if (go) show(go.getAttribute('data-go'));
  });

  /* ---------------- Toast & overlay ---------------- */
  var toastTimer = null;
  function toast(msg, ms) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms || 1700);
  }
  function openModal(html, buttons) {
    var m = $('#modal'); m.className = 'modal'; m.innerHTML = html + '<div class="btns"></div>';
    var box = $('.btns', m);
    (buttons || []).forEach(function (b) {
      var btn = el('<button class="btn ' + (b.cls || '') + '">' + b.label + '</button>');
      btn.addEventListener('click', function () { if (!b.keepOpen) closeModal(); if (b.onClick) b.onClick(); });
      box.appendChild(btn);
    });
    $('#overlay').classList.remove('hidden');
    return m;
  }
  function closeModal() { $('#overlay').classList.add('hidden'); }
  function modalOpen() { return !$('#overlay').classList.contains('hidden'); }
  function bigIcon(name, warm) { return '<div class="big-icon' + (warm ? ' warm' : '') + '">' + ico(name) + '</div>'; }

  /* ---------------- Home ---------------- */
  function renderHome() {
    var s = load(), r = rankInfo(s.xp), days = streakNow();
    var pct = r.next ? Math.round((s.xp - r.from) / (r.next - r.from) * 100) : 100;
    $('#labid').innerHTML = '<div class="badge-ico">' + ico('flask') + '</div><div class="mid"><div class="eyebrow">Lab ID · Level ' + r.level + '</div>' +
      '<h3>' + r.name + '</h3><div class="xpbar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="xp-txt">' + (r.next ? s.xp + ' / ' + r.next + ' XP to ' + r.nextName : s.xp + ' XP · top rank!') + '</div></div>' +
      '<div class="streak' + (days ? '' : ' off') + '" title="Days in a row you have played">' + ico('flame') + '<b>' + days + '</b><small>DAY' + (days === 1 ? '' : 'S') + '</small></div>';

    var d = dailyInfo();
    $('#daily').innerHTML = '<div class="hazard"></div><div class="in"><div><div class="eyebrow">Today\'s Experiment</div><h3>' + d.type.name + '</h3>' +
      '<p>' + (d.done ? 'Done! A new experiment arrives tomorrow.' : d.type.desc + ' · bonus +' + DAILY_BONUS + ' pts') + '</p></div>' +
      '<button class="go' + (d.done ? ' done' : '') + '" id="btn-daily">' + (d.done ? 'Replay' : 'Start') + '</button></div>';
    $('#btn-daily').addEventListener('click', function () { startGame(d.opts.mode, d.opts); });

    renderModeSeg();
    var shelf = $('#shelf'), got = 0;
    shelf.innerHTML = D.SERIES.map(function (sr) {
      var c = s.mastery[sr.id] || 0, l = level(c); if (c) got++;
      return '<button class="tube l' + l + '" data-series="' + sr.id + '" aria-label="' + sr.name + (c ? ', cleared ' + c + ' times' : ', not collected yet') + '">' +
        '<span class="glass"><span class="liq"></span></span><span class="sym">' + (c ? SYMBOL[sr.id] : '?') + '</span></button>';
    }).join('');
    $('#shelf-count').textContent = got + ' / 14 collected';
  }
  function renderModeSeg() {
    var s = load(), sel = isUnlocked(s.lastMode) ? s.lastMode : 'easy';
    $('#mode-seg').innerHTML = MODE_ORDER.map(function (m) {
      var un = isUnlocked(m);
      return '<button role="tab" data-mode="' + m + '" class="' + (m === sel ? 'on' : '') + (un ? '' : ' locked') + '">' + (un ? '' : ico('lock')) + E.MODES[m].label + '</button>';
    }).join('');
    $('#mode-note').innerHTML = modeNote(sel);
    $('#btn-play').innerHTML = ico('play') + 'Play ' + E.MODES[sel].label;
  }
  function unlockText(m) {
    var prev = MODE_ORDER[MODE_ORDER.indexOf(m) - 1], left = E.UNLOCK_WINS - load().wins[prev];
    return 'Win ' + left + ' more ' + E.MODES[prev].label + ' round' + (left === 1 ? '' : 's') + ' to unlock ' + E.MODES[m].label;
  }
  function modeNote(m) {
    var s = load(), cfg = E.MODES[m], next = MODE_ORDER[MODE_ORDER.indexOf(m) + 1];
    if (next && !isUnlocked(next)) return unlockText(next);
    var b = s.best[m];
    return cfg.series + ' series' + (cfg.questions ? ' + ? blocks' : '') + (BOSS_MODES[m] ? ' + boss' : '') + ' · Wins ' + s.wins[m] + (b && b.time != null ? ' · Best ' + fmtTime(b.time) : '');
  }
  $('#mode-seg').addEventListener('click', function (e) {
    var b = e.target.closest('[data-mode]'); if (!b) return;
    var m = b.getAttribute('data-mode');
    if (!isUnlocked(m)) { sfx.bad(); toast(unlockText(m)); return; }
    load().lastMode = m; save(); renderModeSeg(); sfx.pick();
  });
  $('#btn-play').addEventListener('click', function () { var m = load().lastMode; startGame(isUnlocked(m) ? m : 'easy'); });
  $('#shelf').addEventListener('click', function (e) {
    var b = e.target.closest('[data-series]'); if (!b) return;
    var sr = SERIES_BY_ID[b.getAttribute('data-series')], c = load().mastery[sr.id] || 0;
    if (!c) {
      openModal(bigIcon('tubes') + '<h2>Not collected yet</h2><p>Clear a full set of this series (Name, Group, Formula and Example) in any round to collect it.</p>', [{ label: 'OK' }]);
      return;
    }
    openModal(bigIcon('tubes') + '<h2>' + sr.name + '</h2><p>Cleared ' + c + ' time' + (c === 1 ? '' : 's') + (c < 3 ? ' · ' + (3 - c) + ' more to fill the tube' : ' · tube full!') + '</p>' +
      '<div class="result-grid"><div><small>Functional group</small><b>' + D.fmt(sr.fg) + '</b></div><div><small>General formula</small><b>' + D.fmt(sr.gf) + '</b></div></div>' +
      '<p>Examples: ' + sr.ex.map(function (x) { return '<b>' + D.fmt(x[0]) + '</b> (' + x[1] + ')'; }).join(', ') + '</p>', [{ label: 'OK' }]);
  });

  /* ---------------- Settings (sound, real weather, install) ---------------- */
  function weatherDesc() {
    var w = load().weather;
    if (!w.on) return 'Off · the window follows the clock';
    return 'On · ' + (w.city || 'your location') + (w.cache ? ' · ' + S.skyFor(new Date(), w.cache).label : '');
  }
  function openSettings() {
    var s = load(), inst = window.OrgoInstall && window.OrgoInstall.available();
    var m = openModal(bigIcon('gear') + '<h2>Settings</h2><div class="set-list">' +
      '<div class="set-row">' + ico('sound') + '<div><b>Sound</b><small>Game sound effects</small></div><button class="switch' + (s.muted ? '' : ' on') + '" id="sw-sound" aria-label="Sound"></button></div>' +
      '<div class="set-row">' + ico('sun') + '<div><b>Real weather in the window</b><small id="wx-desc">' + weatherDesc() + '</small></div><button class="switch' + (s.weather.on ? ' on' : '') + '" id="sw-wx" aria-label="Real weather"></button></div>' +
      (s.weather.on ? '<button class="btn small alt" id="wx-city">' + ico('pin') + ' Change location</button>' : '') +
      (inst ? '<button class="btn small" id="btn-install">Install app on this phone</button>' : '') +
      '</div>', [{ label: 'Done' }]);
    $('#sw-sound', m).addEventListener('click', function () { s.muted = !s.muted; save(); this.classList.toggle('on', !s.muted); sfx.pick(); });
    $('#sw-wx', m).addEventListener('click', function () {
      if (s.weather.on) { s.weather.on = false; save(); paintScenes(); openSettings(); toast('Window follows the clock again'); }
      else askWeather();
    });
    var c = $('#wx-city', m); if (c) c.addEventListener('click', askCity);
    var ib = $('#btn-install', m); if (ib) ib.addEventListener('click', function () { closeModal(); window.OrgoInstall.prompt(); });
  }
  $('#btn-settings').addEventListener('click', openSettings);

  function weatherOn(pos) {
    var w = load().weather;
    w.on = true; w.lat = pos.lat; w.lon = pos.lon; w.city = pos.city; w.cache = null; save();
    toast('Fetching the weather…');
    refreshWeather(true).then(function (ok) {
      toast(ok ? 'Real weather on: ' + S.skyFor(new Date(), load().weather.cache).label : 'Weather is on. It will show when you are online.', 2400);
      if (current !== 'game' && modalOpen()) openSettings();
    });
  }
  function askWeather() {
    openModal(bigIcon('sun') + '<h2>Show real weather?</h2><p>Orgo-Go! uses your location <b>only</b> to look up the weather for the window. ' +
      'It is rounded to about 1 km, kept on this phone, and sent only to Open-Meteo, a free weather service. You can switch it off any time.</p>', [
      { label: 'Use my location', onClick: function () {
        toast('Waiting for permission…', 3000);
        S.getPosition().then(weatherOn).catch(function () { askCity('Location was not allowed or not available. You can type your city instead.'); });
      } },
      { label: 'Type a city instead', cls: 'alt', onClick: function () { askCity(); } },
      { label: 'Not now', cls: 'alt', onClick: openSettings }
    ]);
  }
  function askCity(msg) {
    var m = openModal(bigIcon('pin') + '<h2>Your city</h2><p>' + (typeof msg === 'string' ? msg : 'No location permission needed.') + '</p>' +
      '<div class="city-row"><input id="city-in" type="text" placeholder="e.g. Puchong" autocomplete="off" enterkeyhint="search"></div>', [
      { label: 'Use this city', keepOpen: true, onClick: go },
      { label: 'Cancel', cls: 'alt', onClick: openSettings }
    ]);
    var inp = $('#city-in', m); inp.focus();
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
    function go() {
      var v = inp.value.trim(); if (!v) { inp.focus(); return; }
      toast('Looking up ' + v + '…');
      S.findCity(v).then(function (p) { closeModal(); weatherOn(p); })
        .catch(function (e) { toast(e && e.message === 'notfound' ? 'City not found – try another spelling' : 'Could not reach the weather service', 2400); });
    }
  }

  /* ---------------- Notes ---------------- */
  var notesDone = false;
  function renderNotes() {
    if (notesDone) return; notesDone = true;
    var list = $('#notes-list');
    D.SERIES.forEach(function (s, i) {
      var ex = s.ex.map(function (e) { return '<b>' + D.fmt(e[0]) + '</b> <span class="exname">(' + e[1] + ')</span>'; }).join('<br>');
      list.appendChild(el('<div class="note" id="note-' + s.id + '"><h3>' + (i + 1) + '. ' + s.name + (s.aka ? ' <small>/ ' + s.aka.charAt(0).toUpperCase() + s.aka.slice(1) + '</small>' : '') + '</h3>' +
        '<div class="note-row t-fg"><span>Functional group</span><b>' + D.fmt(s.fg) + '</b></div>' +
        '<div class="note-row t-gf"><span>General formula</span><b>' + D.fmt(s.gf) + '</b></div>' +
        '<div class="note-row t-ex"><span>Examples</span><div>' + ex + '</div></div></div>'));
    });
  }

  /* ---------------- Tutorial ---------------- */
  function miniCard(type, text) {
    return '<div class="tcard static t-' + type + '"><div class="tc-lbl">' + SHORT_LABEL[type] + '</div><div class="tc-txt">' + D.fmt(text) + '</div></div>';
  }
  var alc = SERIES_BY_ID.alcohol;
  var TUT = [
    { t: 'The goal', h: '<p>Clear the board by collecting <b>4 matching cards</b> from the same homologous series – one of each type:</p>' +
      '<div class="tut-row">' + miniCard('name', alc.name) + miniCard('fg', alc.fg) + miniCard('gf', alc.gf) + miniCard('ex', alc.ex[0][0]) + '</div>' +
      '<p>When all 4 are in your tray, they disappear and you score points.</p>' },
    { t: 'Card colours', h: '<p>Each card type has its own colour and label, so you always know what you still need:</p>' +
      '<div class="tut-row">' + miniCard('name', 'Name') + miniCard('fg', 'Group') + miniCard('gf', 'Formula') + miniCard('ex', 'Example') + '</div>' +
      '<p>The colour never tells you the series – you need your chemistry for that!</p>' },
    { t: 'Layers', h: '<div id="tut-layers" class="tut-demo"></div><p>Cards are stacked in layers. You can always <b>read</b> covered cards, but they are dimmed with a small lock ' +
      'and <b>cannot be picked</b> until every card on top of them is gone. Plan ahead!</p>' },
    { t: 'The tray', h: '<p>Tapping a free card moves it into the tray at the bottom. The tray holds <b>7 cards</b>.</p>' +
      '<ul><li>A complete set of 4 clears automatically.</li><li>If the tray fills up with 7 cards and no set – <b>you lose</b>.</li></ul>' },
    { t: 'Undo, Hint, Shuffle', h: '<ul><li><b>Undo (unlimited):</b> tap a tray card twice, or press Undo, to send it back to its exact spot on the board. ' +
      'Each undo adds <b>+20 seconds</b> to your time and takes away <b>10 points</b>.</li>' +
      '<li><b>Hint (3 per round):</b> highlights a good card to pick next.</li><li><b>Shuffle (1 per round):</b> re-deals the cards still on the board.</li></ul>' },
    { t: 'Boss and ? blocks', h: '<p><b>Boss (Medium, Hard, Extreme):</b> after you clear the board, a real molecule appears. Tick <b>every</b> functional group in it and press Submit. ' +
      'You must beat the boss to pass the round. The faster you answer, the bigger the bonus; wrong tries cost bonus points.</p>' +
      '<p><b>? blocks (Extreme):</b> tap a free ? block to answer an SK025 question. Right = the block disappears and frees the cards under it. ' +
      'Wrong or too slow (2 minutes) = +30 s, and the block asks a new question next time. 4 wrong answers end the round.</p>' },
    { t: 'Modes, rank and streak', h: '<ul><li><b>Easy:</b> 5 of the 14 series.</li><li><b>Medium:</b> 9 series – unlock by winning 3 Easy rounds.</li>' +
      '<li><b>Hard:</b> all 14 series – unlock by winning 3 Medium rounds.</li><li><b>Extreme:</b> Hard plus ? question blocks – unlock by winning 3 Hard rounds.</li></ul><p>Every round earns XP for your Lab ID rank. Play every day to grow your streak, ' +
      'try <b>Today\'s Experiment</b> (a different twist every day) for bonus points, and fill the <b>Specimen shelf</b> by clearing each series.</p>' +
      '<div class="btns" style="margin-top:14px"><button class="btn" id="tut-practice">Try a practice round</button></div>' }
  ];
  var tutIdx = 0;
  function renderTutorial() {
    var s = TUT[tutIdx];
    $('#tut-card').innerHTML = '<h3>' + s.t + '</h3>' + s.h;
    $('#tut-dots').innerHTML = TUT.map(function (_, i) { return '<i class="' + (i === tutIdx ? 'on' : '') + '"></i>'; }).join('');
    $('#tut-prev').disabled = tutIdx === 0;
    $('#tut-next').textContent = tutIdx === TUT.length - 1 ? 'Done ✓' : 'Next ›';
    var demo = $('#tut-layers');
    if (demo) { // static two-layer demo
      var lay = { gridW: 6, gridH: 3, halfW: 46, halfH: 37 };
      demo.style.width = lay.gridW * lay.halfW + 'px'; demo.style.height = lay.gridH * lay.halfH + 6 + 'px';
      var demoTiles = [
        { x: 0, y: 0, layer: 0, type: 'gf', text: alc.gf, covered: true },
        { x: 2, y: 0, layer: 0, type: 'name', text: 'Ketone', covered: true },
        { x: 4, y: 0, layer: 0, type: 'ex', text: 'CH_3CHO', covered: false },
        { x: 1, y: 1, layer: 1, type: 'fg', text: '–OH', covered: false }
      ];
      demo.innerHTML = demoTiles.map(function (t, i) { return tileHtml({ id: 'd' + i, card: { type: t.type, text: t.text }, slot: t }, !t.covered, lay); }).join('');
      fitText(demo.querySelectorAll('.tile-top, .tile-bottom'));
    }
    var pr = $('#tut-practice');
    if (pr) pr.addEventListener('click', function () { startGame('practice', { shape: 'pyramid' }); });
  }
  $('#tut-prev').addEventListener('click', function () { if (tutIdx > 0) { tutIdx--; renderTutorial(); } });
  $('#tut-next').addEventListener('click', function () { if (tutIdx < TUT.length - 1) { tutIdx++; renderTutorial(); } else { tutIdx = 0; show('home'); } });

  /* ---------------- Records ---------------- */
  function renderRecords() {
    var s = load(), box = $('#records'), r = rankInfo(s.xp); box.innerHTML = '';
    box.appendChild(el('<div class="rec-card"><h3>' + ico('flask') + 'Lab ID</h3><div class="rec-stats">' +
      '<div><small>Rank</small><b>Lv ' + r.level + '</b></div><div><small>XP</small><b>' + s.xp + '</b></div><div><small>Streak</small><b>' + streakNow() + ' d</b></div></div></div>'));
    MODE_ORDER.forEach(function (m) {
      var b = s.best[m];
      box.appendChild(el('<div class="rec-card"><h3>' + (isUnlocked(m) ? ico('trophy') : ico('lock')) + E.MODES[m].label + '</h3><div class="rec-stats">' +
        '<div><small>Wins</small><b>' + s.wins[m] + '</b></div>' +
        '<div><small>Best time</small><b>' + (b && b.time != null ? fmtTime(b.time) : '–') + '</b></div>' +
        '<div><small>Best score</small><b>' + (b && b.score != null ? b.score : '–') + '</b></div></div></div>'));
    });
    var rows = s.history.slice(-10).reverse().map(function (h) {
      return '<tr><td>' + E.MODES[h.mode].label + (h.daily ? ' ★' : '') + '</td><td>' + (h.won ? 'Win' : 'Lost') + '</td><td>' + fmtTime(h.time) + '</td><td>' + h.score + '</td></tr>';
    }).join('');
    box.appendChild(el('<div class="rec-card"><h3>' + ico('clock') + 'Recent rounds</h3>' + (rows ? '<table class="rec-table"><tr><th>Mode</th><th>Result</th><th>Time</th><th>Score</th></tr>' + rows + '</table>'
      : '<p>No rounds played yet.</p>') + '</div>'));
    box.appendChild(el('<div class="rec-soon"><b>Battle &amp; online ranking – coming soon</b>1 vs 1 Battle, PK and Team modes and a ranking against other players are planned for a later update. ' +
      'For now, your records are saved on this device.</div>'));
  }

  /* =====================================================================
     GAME
     ===================================================================== */
  var G = null;                 // engine state
  var ui = { elapsed: 0, startTs: 0, running: false, timer: null, pendingTray: null, pendingIds: null,
             armed: null, armTimer: null, hintId: null, hintTimer: null, lay: null, lastCoverToast: 0, lastOpts: null, daily: false };

  function startGame(mode, opts) {
    opts = opts || {};
    // the board area is roughly the screen minus the top bar and the tray
    var w = window.innerWidth, h = window.innerHeight;
    var cols = w < 700 ? 5 : Math.max(6, Math.min(13, Math.floor(w / 115)));
    var areaH = Math.max(200, h - (w < 560 ? 330 : 260)), areaW = Math.max(200, w - 40);
    var eo = {}; Object.keys(opts).forEach(function (k) { eo[k] = opts[k]; });
    eo.mode = mode; eo.cols = cols; eo.aspect = areaH / areaW;
    G = E.newGame(eo);
    ui.daily = !!opts.daily; ui.dailyType = opts.dailyType || null; ui.newSpecimens = []; ui.boss = null; ui.qRecent = ui.qRecent || [];
    ui.opts = opts;
    ui.lastOpts = ui.daily ? opts : { mode: mode, shape: opts.shape };
    $('#screen-game').className = 'screen' + (G.timeLimitMs ? ' countdown' : '');
    $('#hud-mode').textContent = ui.daily ? ui.dailyType.name : G.cfg.label + (mode === 'practice' ? '' : ' round');
    $('#hud-theme').textContent = ui.daily ? "Today's Experiment · " + G.cfg.label : E.SHAPES[G.shape].label + ' board';
    $('#time-label').textContent = G.timeLimitMs ? 'Left' : 'Time';
    ui.elapsed = 0; ui.pendingTray = null; ui.pendingIds = null; ui.armed = null; ui.hintId = null;
    closeModal();
    show('game');
    $('#board-wrap').scrollTop = 0;
    render();
    paintScenes();
    startTimer();
  }

  /* ---------- Timer (count-up, pauses with menus or when the app is hidden) ---------- */
  function startTimer() {
    if (ui.running || !G || G.status !== 'playing') return;
    ui.running = true; ui.startTs = performance.now();
    ui.timer = setInterval(updateTime, 100);
  }
  function stopTimer() {
    if (!ui.running) return;
    ui.elapsed += performance.now() - ui.startTs; ui.running = false; clearInterval(ui.timer);
    updateTime();
  }
  function elapsed() { return ui.elapsed + (ui.running ? performance.now() - ui.startTs : 0) + (G ? G.timePenaltyMs : 0); }
  function updateTime() {
    var t = elapsed();
    if (G && G.timeLimitMs) {
      $('#hud-time').textContent = fmtTime(Math.max(0, G.timeLimitMs - t));
      $('#hud-time').classList.toggle('low', G.timeLimitMs - t < 30000);
      if (G.status === 'playing' && E.checkTimeLimit(G, t)) { stopTimer(); closeModal(); clearInterval(ui.qTimer); sfx.bad(); setTimeout(showResult, 300); }
    } else $('#hud-time').textContent = fmtTime(t);
  }
  document.addEventListener('visibilitychange', function () {
    if (current !== 'game') return;
    if (document.hidden) stopTimer(); else if (!modalOpen() || ui.qOpen) startTimer();
  });

  /* ---------- Layout ---------- */
  function computeLayout() {
    var wrap = $('#board-wrap');
    var availW = wrap.clientWidth - 40, availH = wrap.clientHeight - 56;
    var halfW = Math.min(availW / G.gridW, 64);
    var halfH = halfW * 0.78;
    if (G.gridH * halfH > availH) {               // try to fit the whole board on screen
      var fitHalfW = (availH / G.gridH) / 0.78;
      halfW = Math.max(Math.min(halfW, fitHalfW), Math.min(halfW, window.innerWidth >= 700 ? 36 : 34)); // never shrink below a readable size
      halfH = halfW * 0.78;
    }
    return { halfW: halfW, halfH: halfH, gridW: G.gridW, gridH: G.gridH };
  }

  function tileHtml(t, free, lay) {
    var sl = t.slot, gap = Math.max(2, lay.halfW * 0.06);
    var w = lay.halfW * 2 - gap, h = lay.halfH * 2 - gap;
    // standard sizes for every card on the board; only text that does not fit is shrunk (fitText)
    var fs = Math.min(lay.halfH * 0.5, 22);
    var lbl = Math.max(7.5, Math.min(lay.halfH * 0.3, 12));
    var cls = 'tile t-' + t.card.type + (free ? ' free' : ' covered') + (ui.hintId === t.id ? ' hinted' : '');
    if (t.card.type === 'q') fs = Math.min(lay.halfH * 0.85, 34);
    return '<div class="' + cls + '" data-id="' + t.id + '" style="left:' + (sl.x * lay.halfW) + 'px;top:' + (sl.y * lay.halfH) + 'px;width:' + w +
      'px;height:' + h + 'px;z-index:' + (sl.layer * 1000 + sl.y) + '">' +
      '<div class="tile-top" style="font-size:' + fs.toFixed(1) + 'px"><span class="ct">' + D.fmt(t.card.text) + '</span></div>' +
      '<div class="tile-bottom" style="font-size:' + lbl.toFixed(1) + 'px">' + SHORT_LABEL[t.card.type] + '</div>' +
      (free ? '' : '<span class="lock">' + ICON.lock + '</span>') + '</div>';
  }

  function render() { renderHud(); renderBoard(); renderTray(); }

  function renderHud() {
    $('#hud-score').textContent = G.score;
    $('#hud-sets').textContent = G.setsCleared + '/' + G.totalSets;
    $('#cnt-undo').textContent = G.cfg.undos < 0 ? '∞' : G.undosLeft;
    $('#cnt-hint').textContent = G.hintsLeft;
    $('#cnt-shuffle').textContent = G.shufflesLeft;
    var qs = $('#hud-q');
    if (G.qTotal) { qs.classList.remove('hidden'); qs.innerHTML = '? blocks ' + (G.qTotal - G.qRight) + ' left · wrong <b>' + G.qWrong + '/' + G.qMaxWrong + '</b>'; }
    else qs.classList.add('hidden');
    var playing = G.status === 'playing';
    $('#btn-undo').disabled = !playing || !G.tray.length || (G.cfg.undos >= 0 && G.undosLeft <= 0);
    $('#btn-hint').disabled = !playing || G.hintsLeft <= 0;
    $('#btn-shuffle').disabled = !playing || G.shufflesLeft <= 0;
  }

  function renderBoard() {
    var lay = ui.lay = computeLayout(), board = $('#board');
    board.style.width = lay.gridW * lay.halfW + 'px';
    board.style.height = (lay.gridH * lay.halfH + 10) + 'px';
    var html = window.ChemDeco.plateSvg(G.tiles.map(function (t) { return t.slot; }), lay, G.cfg.layers);
    G.tiles.forEach(function (t) { if (t.where === 'board') html += tileHtml(t, E.isFree(G, t.id), lay); });
    board.innerHTML = html;
    fitText(board.querySelectorAll('.tile-top, .tile-bottom'));
  }

  /* Shrink any text that would overflow its box, so long formulas are never cut off. */
  /* Long formulas may wrap onto a second line before a carbon group (CH₃CH₂CO | CH₂CH₃) instead of shrinking */
  function breakable(html) { return html.replace(/([^\s(–=])C/g, '$1<wbr>C'); }
  /* Tray: lower the size in small steps so long formulas keep the largest size that fits on two lines */
  function fitStep(nodes, minPx) {
    nodes.forEach(function (n) {
      var fs = parseFloat(getComputedStyle(n).fontSize);
      while (fs > minPx && (n.scrollWidth > n.clientWidth + 0.5 || n.scrollHeight > n.clientHeight + 1)) { fs -= 0.5; n.style.fontSize = fs + 'px'; }
    });
  }
  function fitText(nodes, minPx) {
    for (var pass = 0; pass < 4; pass++) {
      var jobs = [];
      nodes.forEach(function (n) { if (n.scrollWidth > n.clientWidth + 0.5 || n.scrollHeight > n.clientHeight + 1) jobs.push([n, n.clientWidth / n.scrollWidth, n.clientHeight / n.scrollHeight]); });
      if (!jobs.length) return;
      jobs.forEach(function (j) {
        var cur = parseFloat(getComputedStyle(j[0]).fontSize);
        j[0].style.fontSize = Math.max(minPx || 6.5, cur * Math.min(j[1], j[2], 1) * 0.94).toFixed(1) + 'px';
      });
    }
  }

  function renderTray() {
    var list = ui.pendingTray || G.tray, tray = $('#tray'), html = '';
    for (var i = 0; i < G.traySize; i++) {
      var id = list[i];
      html += '<div class="slot"><span class="num">' + (i + 1) + '</span>';
      if (id != null) {
        var c = G.tiles[id].card;
        var cls = 'tcard t-' + c.type + (ui.pendingIds && ui.pendingIds.indexOf(id) >= 0 ? ' matching' : '') + (ui.armed === id ? ' armed' : '');
        html += '<div class="' + cls + '" data-id="' + id + '"><div class="tc-lbl">' + SHORT_LABEL[c.type] + '</div><div class="tc-txt"><span class="tw">' + breakable(D.fmt(c.text)) + '</span></div></div>';
      }
      html += '</div>';
    }
    html += '<div class="tray-count"><b id="hud-tray">' + G.tray.length + '/' + G.traySize + '</b><small>IN TRAY</small></div>';
    tray.innerHTML = html;
    fitStep(tray.querySelectorAll('.tc-txt'), 11);
    tray.classList.toggle('danger', G.tray.length >= G.traySize - 2 && G.status === 'playing');
  }

  function bump(sel) { var e = $(sel); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }

  /* ---------- Fly animation from one rect to another ---------- */
  function fly(fromRect, toEl, type, text) {
    if (!fromRect || !toEl) return;
    var to = toEl.getBoundingClientRect();
    var f = el('<div class="tcard t-' + type + ' fly" style="animation:none"><div class="tc-lbl">' + SHORT_LABEL[type] + '</div><div class="tc-txt">' + D.fmt(text) + '</div></div>');
    f.style.left = fromRect.left + 'px'; f.style.top = fromRect.top + 'px'; f.style.width = fromRect.width + 'px'; f.style.height = fromRect.height + 'px';
    document.body.appendChild(f);
    toEl.style.visibility = 'hidden';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        f.style.left = to.left + 'px'; f.style.top = to.top + 'px'; f.style.width = to.width + 'px'; f.style.height = to.height + 'px';
      });
    });
    setTimeout(function () { f.remove(); toEl.style.visibility = ''; }, 280);
  }
  function floatScore(text, anchor, good) {
    var r = anchor.getBoundingClientRect();
    var f = el('<div class="float-score' + (good ? ' good' : '') + '">' + text + '</div>');
    f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = (r.top - 10) + 'px';
    document.body.appendChild(f); setTimeout(function () { f.remove(); }, 1000);
  }

  function flushPending() {
    if (!ui.pendingTray) return;
    clearTimeout(ui.pendingTimer); ui.pendingTray = null; ui.pendingIds = null; renderTray();
  }

  /* ---------- Picking a board card ---------- */
  $('#board').addEventListener('click', function (e) {
    var tEl = e.target.closest('.tile'); if (!tEl || !G || G.status !== 'playing') return;
    var id = +tEl.getAttribute('data-id');
    if (!E.isFree(G, id)) {
      sfx.bad(); tEl.classList.remove('shake'); void tEl.offsetWidth; tEl.classList.add('shake');
      if (Date.now() - ui.lastCoverToast > 2500) { toast('🔒 Covered – clear the cards on top first'); ui.lastCoverToast = Date.now(); }
      return;
    }
    flushPending();
    if (G.tiles[id].card.type === 'q') { openQuestion(id); return; }
    var rect = tEl.getBoundingClientRect();
    var trayBefore = G.tray.slice();
    var res = E.pickTile(G, id);
    if (!res.ok) return;
    disarm(); clearHint();
    sfx.pick();
    if (res.matched) {
      ui.pendingTray = trayBefore.concat([id]);
      ui.pendingIds = res.matched.ids;
    }
    renderHud(); renderBoard(); renderTray();
    var target = $('#tray .tcard[data-id="' + id + '"]');
    fly(rect, target, G.tiles[id].card.type, G.tiles[id].card.text);
    if (res.matched) {
      setTimeout(sfx.match, 180);
      bump('#hud-score'); bump('#hud-sets');
      setTimeout(function () { floatScore('+' + res.gained + (res.bonus ? ' combo!' : ''), $('#tray'), true); }, 150);
      collectSpecimen(res.matched.series);
      ui.pendingTimer = setTimeout(function () { ui.pendingTray = null; ui.pendingIds = null; renderTray(); }, 480);
    }
    if (G.status !== 'playing') { stopTimer(); setTimeout(roundOver, res.matched ? 700 : 450); }
  });

  /* Round finished: a cleared board still has to beat the boss (Medium and up) */
  function needsBoss() { return G.status === 'won' && (ui.dailyType ? (ui.dailyType.boss || !!BOSS_MODES[G.mode]) : !!BOSS_MODES[G.mode]); }
  function roundOver() { if (needsBoss()) openBoss(); else showResult(); }

  /* ---------- ? question blocks ---------- */
  function openQuestion(id) {
    var q = Q.question(Math.random, ui.qRecent);
    ui.qRecent.push(q.key); if (ui.qRecent.length > 25) ui.qRecent.shift();
    ui.qOpen = true; sfx.hint();
    var deadline = Date.now() + E.Q_TIME_LIMIT_MS, done = false;
    var vis = '';
    if (q.mol) vis = '<div class="mol-box">' + MV.svg(q.mol, { expanded: q.expanded, width: 300, height: q.expanded ? 190 : 150, maxBond: q.expanded ? 40 : 44 }) + '<small>' + q.molNote + '</small></div>';
    else if (q.cond) vis = '<div class="cond-box">' + D.fmt(q.cond) + '<small>Condensed structural formula</small></div>';
    var m = openModal('<div class="eyebrow">? block · wrong answers ' + G.qWrong + '/' + G.qMaxWrong + '</div>' +
      '<div class="qbar"><i id="q-bar"></i></div><div class="q-time" id="q-time">2:00</div>' +
      '<h2 class="q-text">' + D.fmt(q.q) + '</h2>' + vis +
      '<div class="q-opts">' + q.options.map(function (o, i) { return '<button class="q-opt" data-i="' + i + '">' + (q.fmtOptions || /_/.test(o) ? D.fmt(o) : o) + '</button>'; }).join('') + '</div>', []);
    m.classList.add('wide');
    function tick() {
      var left = deadline - Date.now();
      var bar = $('#q-bar'); if (!bar) return;
      bar.style.width = Math.max(0, left / E.Q_TIME_LIMIT_MS * 100) + '%';
      $('#q-time').textContent = Math.max(0, Math.ceil(left / 1000)) + ' s left';
      if (left <= 0 && !done) answer(-1);
    }
    clearInterval(ui.qTimer); ui.qTimer = setInterval(tick, 250); tick();
    m.querySelectorAll('.q-opt').forEach(function (b) { b.addEventListener('click', function () { answer(+b.getAttribute('data-i')); }); });
    function answer(i) {
      if (done || G.status !== 'playing') return; done = true; clearInterval(ui.qTimer);
      var right = i === q.answer;
      m.querySelectorAll('.q-opt').forEach(function (b, j) { b.disabled = true; if (j === q.answer) b.classList.add('right'); else if (j === i) b.classList.add('wrong'); });
      var r = E.answerQuestion(G, id, right);
      if (right) {
        sfx.match();
        setTimeout(function () {
          ui.qOpen = false; closeModal(); render(); bump('#hud-score');
          toast('Correct! The ? block is cleared');
          if (G.status !== 'playing') { stopTimer(); setTimeout(roundOver, 400); }
        }, 700);
        return;
      }
      sfx.bad(); updateTime(); bump('#hud-time');
      var note = el('<p class="q-feedback">' + (i < 0 ? 'Time is up! ' : 'Not quite. ') + 'The right answer is highlighted. <b>+30 s</b> · wrong answers <b>' + G.qWrong + '/' + G.qMaxWrong + '</b>' +
        (G.status === 'lost' ? '<br>That was the 4th wrong answer – the round is over.' : '') + '</p>');
      $('.q-opts', m).after(note);
      var btn = el('<div class="btns"><button class="btn">' + (G.status === 'lost' ? 'See result' : 'Back to the board') + '</button></div>');
      note.after(btn);
      btn.querySelector('button').addEventListener('click', function () {
        ui.qOpen = false; closeModal(); render();
        if (G.status !== 'playing') { stopTimer(); showResult(); }
      });
    }
  }

  /* ---------- Boss: name every functional group in a real molecule ---------- */
  function openBoss() {
    var tier = ui.dailyType && !BOSS_MODES[G.mode] ? 'medium' : BOSS_MODES[G.mode];
    var key = BOSS_MODES[G.mode] ? G.mode : 'medium';
    var s = load(), b = Q.boss(tier, Math.random, s.recentBoss);
    s.recentBoss.push(b.name); if (s.recentBoss.length > 5) s.recentBoss.shift(); save();
    var base = BOSS_BASE[key], t0 = Date.now(), wrongs = 0, picked = {}, finished = false;
    function bonusNow() {
      var sec = (Date.now() - t0) / 1000, f = sec <= BOSS_FULL_S[key] ? 1 : Math.max(0.25, 1 - 0.75 * (sec - BOSS_FULL_S[key]) / (BOSS_LOW_S[key] - BOSS_FULL_S[key]));
      return Math.max(0, Math.round(base * f - wrongs * base * 0.2));
    }
    sfx.win(); $('#toast').classList.remove('show');
    var big = b.mol.a.length > 16;
    var m = openModal('<div class="eyebrow">Boss · ' + G.cfg.label + '</div><h2>Name its functional groups</h2>' +
      '<p class="boss-sub">Tick <b>every</b> functional group in this molecule (' + D.fmt(b.formula.replace(/(\d+)/g, '_{$1}')) + '), then Submit.</p>' +
      '<div class="mol-box boss-mol">' + MV.svg(b.mol, { width: 340, height: big ? 196 : 170, maxBond: big ? 28 : 42, title: 'Boss molecule' }) + '</div>' +
      '<div class="boss-stat"><span id="boss-time">0:00</span><span>Bonus now <b id="boss-bonus">+' + base + '</b></span></div>' +
      '<div class="chips" id="boss-chips">' + Q.BOSS_GROUPS.map(function (g) {
        var sr = Q.SERIES[g]; return '<button class="chip" data-g="' + g + '"><b>' + sr.name + '</b><small>' + D.fmt(sr.fg) + '</small></button>'; }).join('') + '</div>' +
      '<p class="q-feedback hidden" id="boss-msg"></p>', [
      { label: 'Submit', keepOpen: true, onClick: submit },
      { label: 'Give up (round lost)', cls: 'alt', keepOpen: true, onClick: giveUp }
    ]);
    m.classList.add('wide');
    var tmr = setInterval(function () {
      if (!$('#boss-time')) { clearInterval(tmr); return; }
      $('#boss-time').textContent = fmtTime(Date.now() - t0).replace(/\.\d$/, '');
      $('#boss-bonus').textContent = '+' + bonusNow();
    }, 250);
    $('#boss-chips', m).addEventListener('click', function (e) {
      var c = e.target.closest('.chip'); if (!c || finished) return;
      var g = c.getAttribute('data-g'); picked[g] = !picked[g];
      c.classList.toggle('on', picked[g]); c.classList.remove('bad'); sfx.pick();
    });
    function submit() {
      if (finished) return;
      var sel = Object.keys(picked).filter(function (g) { return picked[g]; });
      var wrong = sel.filter(function (g) { return b.groups.indexOf(g) < 0; }), missing = b.groups.filter(function (g) { return sel.indexOf(g) < 0; });
      var msg = $('#boss-msg');
      if (!sel.length) { toast('Tick at least one functional group'); return; }
      if (!wrong.length && !missing.length) { win(); return; }
      wrongs++; sfx.bad();
      wrong.forEach(function (g) { $('.chip[data-g="' + g + '"]', m).classList.add('bad'); });
      msg.classList.remove('hidden');
      msg.innerHTML = (wrong.length ? '<b>' + wrong.length + '</b> ticked group' + (wrong.length > 1 ? 's are' : ' is') + ' not in the molecule (red). ' : '') +
        (missing.length ? '<b>' + missing.length + '</b> group' + (missing.length > 1 ? 's are' : ' is') + ' still missing. ' : '') + 'Try again (−20% bonus).';
      var mb = $('.boss-mol', m); mb.classList.remove('shake'); void mb.offsetWidth; mb.classList.add('shake');
    }
    function win() {
      finished = true; clearInterval(tmr);
      var bonus = bonusNow(), sec = Math.round((Date.now() - t0) / 1000);
      G.score += bonus; ui.boss = { name: b.name, bonus: bonus, sec: sec, wrongs: wrongs };
      sfx.match();
      m.querySelectorAll('.chip').forEach(function (c) { if (b.groups.indexOf(c.getAttribute('data-g')) >= 0) c.classList.add('right'); c.disabled = true; });
      var msg = $('#boss-msg'); msg.classList.remove('hidden'); msg.classList.add('good');
      msg.innerHTML = 'Boss beaten! This is <b>' + b.name + '</b>. +' + bonus + ' bonus points (' + sec + ' s' + (wrongs ? ', ' + wrongs + ' wrong tr' + (wrongs > 1 ? 'ies' : 'y') : '') + ').';
      var box = $('.btns', m); box.innerHTML = '';
      var c = el('<button class="btn">Continue</button>'); c.addEventListener('click', function () { closeModal(); showResult(); }); box.appendChild(c);
    }
    function giveUp() {
      openConfirm();
      function openConfirm() {
        finished = true; clearInterval(tmr);
        G.status = 'lost'; G.lossReason = 'boss';
        ui.boss = { name: b.name, gaveUp: true, groups: b.groups };
        closeModal(); showResult();
      }
    }
  }

  /* Specimen shelf: count each series cleared (first time = newly collected) */
  function collectSpecimen(seriesId) {
    var s = load(); if (!SERIES_BY_ID[seriesId]) return;
    s.mastery[seriesId] = (s.mastery[seriesId] || 0) + 1; save();
    var n = s.mastery[seriesId];
    if (n === 1) ui.newSpecimens.push(SERIES_BY_ID[seriesId].name);
    if (G.status !== 'playing') return;
    if (n === 1) setTimeout(function () { toast('New specimen collected: ' + SERIES_BY_ID[seriesId].name + '!', 2000); }, 300);
    else if (n === 3) setTimeout(function () { toast(SERIES_BY_ID[seriesId].name + ' tube is full!', 2000); }, 300);
  }

  /* ---------- Undo (unlimited, +20 s and −10 points each) ---------- */
  function disarm() { ui.armed = null; clearTimeout(ui.armTimer); }
  $('#tray').addEventListener('click', function (e) {
    var c = e.target.closest('.tcard'); if (!c || !G || G.status !== 'playing') return;
    var id = +c.getAttribute('data-id');
    if (ui.pendingIds && ui.pendingIds.indexOf(id) >= 0) return;
    if (G.tray.indexOf(id) < 0) return;
    if (G.cfg.undos >= 0 && G.undosLeft <= 0) { sfx.bad(); toast('No undos left this round'); return; }
    if (ui.armed === id) { doUndo(id); return; }
    flushPending();
    ui.armed = id; renderTray();
    clearTimeout(ui.armTimer);
    ui.armTimer = setTimeout(function () { ui.armed = null; renderTray(); }, 3000);
  });
  $('#btn-undo').addEventListener('click', function () {
    if (!G || !G.tray.length) return;
    flushPending();
    doUndo(G.tray[G.tray.length - 1]);
  });
  function doUndo(id) {
    var from = $('#tray .tcard[data-id="' + id + '"]'), rect = from ? from.getBoundingClientRect() : null;
    var res = E.undoTile(G, id);
    if (!res.ok) { sfx.bad(); toast(res.reason === 'noUndos' ? 'No undos left this round' : 'Cannot undo that card'); return; }
    disarm(); clearHint(); sfx.undo();
    render();
    var back = $('#board .tile[data-id="' + id + '"]');
    if (back) {
      back.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      fly(rect, back, G.tiles[id].card.type, G.tiles[id].card.text);
      back.classList.add('returning');
    }
    updateTime(); bump('#hud-time');
    floatScore('+20s  −' + res.scoreLost, $('#hud-time'));
    toast('Card returned · +20 s time' + (res.scoreLost ? ' · −' + res.scoreLost + ' points' : ''));
  }

  /* ---------- Hint & shuffle ---------- */
  function clearHint() { ui.hintId = null; clearTimeout(ui.hintTimer); var h = $('#board .tile.hinted'); if (h) h.classList.remove('hinted'); }
  $('#btn-hint').addEventListener('click', function () {
    if (!G || G.status !== 'playing') return;
    clearHint();
    var id = E.useHint(G);
    if (id == null) { toast('No hint available'); return; }
    sfx.hint(); ui.hintId = id; renderHud();
    var t = $('#board .tile[data-id="' + id + '"]');
    if (t) { t.classList.add('hinted'); t.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    ui.hintTimer = setTimeout(clearHint, 3500);
  });
  $('#btn-shuffle').addEventListener('click', function () {
    if (!G || G.status !== 'playing' || G.shufflesLeft <= 0) return;
    openModal(bigIcon('shuffle') + '<h2>Shuffle the board?</h2><p>The cards still on the board are re-dealt into the same positions. ' +
      'Your tray stays as it is. You have 1 shuffle per round.</p>', [
      { label: 'Shuffle', onClick: function () {
        flushPending(); disarm(); clearHint();
        var r = E.shuffleBoard(G);
        if (!r.ok) { toast('Nothing to shuffle'); return; }
        var b = $('#board'); b.classList.remove('shuffling'); void b.offsetWidth; b.classList.add('shuffling'); setTimeout(function () { b.classList.remove('shuffling'); }, 520);
        setTimeout(function () { render(); }, 200);
        toast(r.guaranteed ? 'Board shuffled – still solvable!' : 'Board shuffled');
        startTimer();
      } },
      { label: 'Cancel', cls: 'alt', onClick: startTimer }
    ]);
    stopTimer();
  });

  /* ---------- Pause ---------- */
  $('#btn-pause').addEventListener('click', function () {
    if (!G) return;
    stopTimer();
    openModal(bigIcon('pause') + '<h2>Paused</h2><p>' + G.cfg.label + ' · ' + fmtTime(elapsed()) + '</p>', [
      { label: 'Resume', onClick: startTimer },
      { label: 'Restart round', cls: 'alt', onClick: function () { var o = {}; Object.keys(ui.opts).forEach(function (k) { o[k] = ui.opts[k]; }); o.seed = G.seed; o.shape = G.shape; startGame(G.mode, o); } },
      { label: ui.daily ? 'Normal round' : 'New board', cls: 'alt', onClick: function () { startGame(ui.daily ? (isUnlocked(load().lastMode) ? load().lastMode : 'easy') : G.mode, ui.daily ? {} : ui.lastOpts); } },
      { label: 'Home', cls: 'alt', onClick: function () { show('home'); } }
    ]);
  });

  /* ---------- Result ---------- */
  function showResult() {
    clearInterval(ui.qTimer); ui.qOpen = false;
    var won = G.status === 'won', time = elapsed(), mode = G.mode, s = load();
    if (G.timeLimitMs) time = Math.min(time, G.timeLimitMs);
    var extra = '', before = rankInfo(s.xp), xp = 0;
    if (won && ui.daily && s.daily.done !== dayKey()) {
      G.score += DAILY_BONUS; s.daily.done = dayKey();
      extra += '<div class="badge-new">Today\'s Experiment done · +' + DAILY_BONUS + ' bonus</div>';
    }
    xp = G.setsCleared * 10 + (won ? WIN_XP[mode] : 0) + (won && ui.daily ? 25 : 0) + G.qRight * 5 + (ui.boss && ui.boss.bonus != null ? 20 : 0);
    if (ui.boss && ui.boss.bonus != null) extra = '<div class="badge-new">Boss beaten: ' + ui.boss.name + ' · +' + ui.boss.bonus + '</div>' + extra;
    s.xp += xp;
    if (mode !== 'practice') {
      var hadStreak = streakNow(); bumpStreak();
      if (streakNow() > hadStreak) extra += '<div class="badge-new">Streak: ' + streakNow() + ' day' + (streakNow() === 1 ? '' : 's') + '</div>';
      s.history.push({ mode: mode, won: won, time: Math.round(time), score: G.score, date: Date.now(), daily: ui.daily || undefined });
      if (s.wins[mode] == null) s.wins[mode] = 0;
      if (s.history.length > 50) s.history = s.history.slice(-50);
      if (won) {
        var wasMed = isUnlocked('medium'), wasHard = isUnlocked('hard'), wasExt = isUnlocked('extreme');
        s.wins[mode]++;
        var b = s.best[mode] || {};
        var newTime = !ui.daily && (b.time == null || time < b.time), newScore = !ui.daily && (b.score == null || G.score > b.score);
        if (newTime) b.time = Math.round(time);
        if (newScore) b.score = G.score;
        s.best[mode] = b;
        if (newTime) extra += '<div class="badge-new">New best time!</div> ';
        if (newScore && !newTime) extra += '<div class="badge-new">New best score!</div>';
        if (!wasMed && isUnlocked('medium')) { extra += '<div class="badge-unlock">Medium mode unlocked!</div>'; s.lastMode = 'medium'; }
        if (!wasHard && isUnlocked('hard')) { extra += '<div class="badge-unlock">Hard mode unlocked!</div>'; s.lastMode = 'hard'; }
        if (mode === 'easy' && !isUnlocked('medium')) extra += '<p>Easy wins: ' + s.wins.easy + '/' + E.UNLOCK_WINS + ' to unlock Medium</p>';
        if (mode === 'medium' && !isUnlocked('hard')) extra += '<p>Medium wins: ' + s.wins.medium + '/' + E.UNLOCK_WINS + ' to unlock Hard</p>';
        if (mode === 'hard' && !isUnlocked('extreme')) extra += '<p>Hard wins: ' + s.wins.hard + '/' + E.UNLOCK_WINS + ' to unlock Extreme</p>';
        if (!wasExt && isUnlocked('extreme')) { extra += '<div class="badge-unlock">Extreme mode unlocked!</div>'; s.lastMode = 'extreme'; }
      }
    }
    if (ui.newSpecimens.length) extra += '<div class="badge-unlock">New on your specimen shelf: ' + ui.newSpecimens.join(', ') + '</div>';
    var after = rankInfo(s.xp);
    if (after.level > before.level) extra += '<div class="badge-unlock">Promoted to ' + after.name + '!</div>';
    save();
    var grid = '<div class="result-grid"><div><small>Time</small><b>' + fmtTime(time) + '</b></div><div><small>Score</small><b>' + G.score + '</b></div>' +
      '<div><small>Sets</small><b>' + G.setsCleared + '/' + G.totalSets + '</b></div><div><small>XP earned</small><b>+' + xp + '</b></div>' +
      '<div><small>Undos used</small><b>' + G.undosUsed + (G.undosUsed ? ' (+' + G.undosUsed * 20 + 's)' : '') + '</b></div>' +
      (G.qTotal ? '<div><small>? answered</small><b>' + G.qRight + ' right · ' + G.qWrong + ' wrong</b></div>' : '<div><small>Hints used</small><b>' + G.hintsUsed + '/' + G.cfg.hints + '</b></div>') + '</div>';
    if (won) {
      sfx.win();
      openModal(bigIcon('trophy') + '<h2>Board cleared!</h2>' + grid + extra, [
        { label: mode === 'practice' ? 'Play Easy' : ui.daily ? 'Play a normal round' : 'Next round', onClick: function () { startGame(mode === 'practice' ? 'easy' : ui.daily ? (isUnlocked(load().lastMode) ? load().lastMode : 'easy') : mode); } },
        { label: 'Home', cls: 'alt', onClick: function () { show('home'); } }
      ]);
    } else {
      sfx.lose();
      var why = { tray: ['Tray full!', G.traySize + ' cards in the tray without a complete set.'], questions: ['Too many wrong answers', '4 wrong answers on ? blocks end the round.'],
        time: ['Time\'s up!', 'The countdown ran out before the board was cleared.'],
        boss: ['Boss not beaten', ui.boss ? 'It was <b>' + ui.boss.name + '</b>. Its groups: ' + (ui.boss.groups || []).map(function (g) { return Q.SERIES[g].name; }).join(', ') + '.' : ''] }[G.lossReason || 'tray'];
      openModal(bigIcon('tray', true) + '<h2>' + why[0] + '</h2><p>' + why[1] + '</p>' + grid + extra, [
        { label: 'Retry same board', onClick: function () { var o = {}; Object.keys(ui.opts).forEach(function (k) { o[k] = ui.opts[k]; }); o.seed = G.seed; o.shape = G.shape; startGame(mode, o); } },
        { label: ui.daily ? 'Normal round' : 'New board', cls: 'alt', onClick: function () { startGame(ui.daily ? (isUnlocked(load().lastMode) ? load().lastMode : 'easy') : mode, ui.daily ? {} : ui.lastOpts); } },
        { label: 'Home', cls: 'alt', onClick: function () { show('home'); } }
      ]);
    }
  }

  /* ---------- Keep the board sized to the screen ---------- */
  var rz = null;
  window.addEventListener('resize', function () {
    clearTimeout(rz); rz = setTimeout(function () { if (current === 'game' && G) renderBoard(); paintScenes(); }, 120);
  });

  fillIcons();
  $('#btn-pause').innerHTML = ICON.pause;
  show('home');
  refreshWeather();
  window.addEventListener('online', function () { refreshWeather(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { refreshWeather(); paintScenes(); } });
  // re-measure card text once the bundled font has loaded (sizes change slightly)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { if (current === 'game' && G) { renderBoard(); renderTray(); } });
    document.fonts.addEventListener && document.fonts.addEventListener('loadingdone', function () { if (current === 'game' && G) { renderBoard(); renderTray(); } });
  }
  // expose for debugging / automated tests
  window.ChemSheep = { start: startGame, state: function () { return G; }, show: show, elapsed: elapsed, store: load, daily: dailyInfo, ui: ui,
                       reload: function () { store = null; return load(); } };
})();
