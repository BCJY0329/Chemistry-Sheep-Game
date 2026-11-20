/* =====================================================================
   CHEMISTRY SHEEP – USER INTERFACE
   Screens: menu, modes, game, notes, tutorial, records (+ overlay, toast)
   ===================================================================== */
(function () {
  'use strict';
  var D = window.CHEM_DATA, E = window.ChemEngine;
  var TYPE_LABEL = {}; D.CARD_TYPES.forEach(function (t) { TYPE_LABEL[t.id] = t.label; });
  var SHORT_LABEL = { fg: 'Func. group', gf: 'Gen. formula', ex: 'Example', name: 'Name' };
  var THEME_LABEL = { lab: 'Science Lab', minimal: 'Minimal', garden: 'Garden', notebook: 'Exam Notebook' };
  var MODE_ICON = { easy: '🌱', medium: '🔥', hard: '💀', practice: '🎓' };

  function $(s, r) { return (r || document).querySelector(s); }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function fmtTime(ms) {
    var t = Math.max(0, Math.floor(ms / 100)), d = t % 10, s = Math.floor(t / 10) % 60, m = Math.floor(t / 600);
    return m + ':' + (s < 10 ? '0' : '') + s + '.' + d;
  }

  /* ---------------- Storage (this device only) ---------------- */
  var KEY = 'chemsheep.v1', store = null;
  function load() {
    if (store) return store;
    try { store = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { store = {}; }
    store.wins = store.wins || { easy: 0, medium: 0, hard: 0 };
    store.best = store.best || {};
    store.history = store.history || [];
    if (store.muted == null) store.muted = false;
    return store;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* storage unavailable */ } }
  function isUnlocked(mode) {
    var s = load();
    if (mode === 'medium') return s.wins.easy >= E.UNLOCK_WINS;
    if (mode === 'hard') return s.wins.medium >= E.UNLOCK_WINS;
    return true;
  }

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

  /* ---------------- Screens ---------------- */
  var current = 'menu';
  function show(name) {
    if (current === 'game' && name !== 'game') stopTimer();
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    $('#screen-' + name).classList.add('active');
    current = name;
    window.scrollTo(0, 0);
    if (name === 'modes') renderModes();
    if (name === 'notes') renderNotes();
    if (name === 'tutorial') renderTutorial();
    if (name === 'records') renderRecords();
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
    var m = $('#modal'); m.innerHTML = html + '<div class="btns"></div>';
    var box = $('.btns', m);
    (buttons || []).forEach(function (b) {
      var btn = el('<button class="btn ' + (b.cls || '') + '">' + b.label + '</button>');
      btn.addEventListener('click', function () { closeModal(); if (b.onClick) b.onClick(); });
      box.appendChild(btn);
    });
    $('#overlay').classList.remove('hidden');
  }
  function closeModal() { $('#overlay').classList.add('hidden'); }
  function modalOpen() { return !$('#overlay').classList.contains('hidden'); }

  /* ---------------- Menu ---------------- */
  function refreshMute() { $('#btn-mute').textContent = load().muted ? '🔇 Sound off' : '🔊 Sound on'; }
  $('#btn-mute').addEventListener('click', function () { load().muted = !load().muted; save(); refreshMute(); sfx.pick(); });
  $('#btn-battle').addEventListener('click', function () {
    openModal('<div class="big-icon">⚔️</div><h2>Battle mode</h2><p>1 vs 1 battles against other students need online play. ' +
      'This is planned for the next update, together with the online ranking.</p>', [{ label: 'OK' }]);
  });

  function renderModes() {
    var s = load(), list = $('#mode-list'); list.innerHTML = '';
    ['easy', 'medium', 'hard'].forEach(function (m) {
      var cfg = E.MODES[m], unlocked = isUnlocked(m), tiles = (cfg.series + cfg.repeats) * 4;
      var prog;
      if (!unlocked) {
        var prev = m === 'medium' ? 'easy' : 'medium';
        prog = '🔒 Win ' + E.UNLOCK_WINS + ' rounds in ' + E.MODES[prev].label + ' (' + Math.min(s.wins[prev], E.UNLOCK_WINS) + '/' + E.UNLOCK_WINS + ')';
      } else {
        var b = s.best[m];
        prog = '✅ Wins: ' + s.wins[m] + (b ? ' · Best time ' + fmtTime(b.time) + ' · Best score ' + b.score : '');
      }
      var card = el('<button class="mode-card ' + (unlocked ? '' : 'locked') + '"><div class="m-icon">' + MODE_ICON[m] + '</div><div>' +
        '<h3>' + cfg.label + '</h3><p>' + cfg.series + ' of 14 homologous series · ' + tiles + ' cards · ' + cfg.layers + ' layers</p>' +
        '<div class="m-progress">' + prog + '</div></div></button>');
      card.addEventListener('click', function () {
        if (!unlocked) { sfx.bad(); toast('Locked – ' + prog.replace('🔒 ', '')); return; }
        startGame(m);
      });
      list.appendChild(card);
    });
  }

  /* ---------------- Notes ---------------- */
  var notesDone = false;
  function renderNotes() {
    if (notesDone) return; notesDone = true;
    var list = $('#notes-list');
    D.SERIES.forEach(function (s) {
      var ex = s.ex.map(function (e) { return '<b>' + D.fmt(e[0]) + '</b> <span class="exname">(' + e[1] + ')</span>'; }).join('<br>');
      list.appendChild(el('<div class="note"><h3>' + s.name + '</h3>' +
        '<div class="note-row t-fg"><span>Functional group</span><b>' + D.fmt(s.fg) + '</b></div>' +
        '<div class="note-row t-gf"><span>General formula</span><b>' + D.fmt(s.gf) + '</b></div>' +
        '<div class="note-row t-ex"><span>Examples</span><div>' + ex + '</div></div></div>'));
    });
  }

  /* ---------------- Tutorial ---------------- */
  function miniCard(type, text) {
    return '<div class="tcard t-' + type + '"><div class="tc-txt">' + D.fmt(text) + '</div><div class="tc-lbl">' + TYPE_LABEL[type] + '</div></div>';
  }
  var alc = D.SERIES.filter(function (s) { return s.id === 'alcohol'; })[0];
  var TUT = [
    { t: '🎯 The goal', h: '<p>Clear the board by collecting <b>4 matching cards</b> from the same homologous series – one of each type:</p>' +
      '<div class="tut-row">' + miniCard('name', alc.name) + miniCard('fg', alc.fg) + miniCard('gf', alc.gf) + miniCard('ex', alc.ex[0][0]) + '</div>' +
      '<p>When all 4 are in your tray, they disappear and you score points.</p>' },
    { t: '🎨 Card colours', h: '<p>Each card type has its own colour, so you always know what you still need:</p>' +
      '<div class="tut-row">' + miniCard('fg', 'Functional group') + miniCard('gf', 'General formula') + miniCard('ex', 'Example') + miniCard('name', 'Name') + '</div>' +
      '<p>The colour never tells you the series – you need your chemistry for that!</p>' },
    { t: '🧱 Layers', h: '<div id="tut-layers" class="tut-demo"></div><p>Cards are stacked in layers. You can always <b>read</b> covered cards, but they are dimmed with a 🔒 ' +
      'and <b>cannot be picked</b> until every card on top of them is gone. Plan ahead!</p>' },
    { t: '🧺 The tray', h: '<p>Tapping a free card moves it to the tray at the bottom. The tray holds <b>7 cards</b>.</p>' +
      '<ul><li>A complete set of 4 clears automatically.</li><li>If the tray fills up with 7 cards and no set – <b>you lose</b>.</li></ul>' },
    { t: '↩ Undo, 💡 Hint, 🔀 Shuffle', h: '<ul><li><b>Undo (3 per round):</b> tap a tray card twice, or press Undo, to send it back to its exact spot on the board.</li>' +
      '<li><b>Hint (3 per round):</b> highlights a good card to pick next.</li><li><b>Shuffle (1 per round):</b> re-deals the cards still on the board.</li></ul>' },
    { t: '🏆 Modes & time', h: '<ul><li><b>Easy:</b> 5 of the 14 series.</li><li><b>Medium:</b> 9 series – unlock by winning 3 Easy rounds.</li>' +
      '<li><b>Hard:</b> all 14 series – unlock by winning 3 Medium rounds.</li></ul><p>Your clear time and score are saved in Ranking. ' +
      'Some rounds repeat a series with a different example – collect both sets!</p>' +
      '<div class="btns" style="margin-top:14px"><button class="btn btn-play" id="tut-practice">Try a practice round</button></div>' }
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
    if (pr) pr.addEventListener('click', function () { startGame('practice', { theme: 'garden', shape: 'pyramid' }); });
  }
  $('#tut-prev').addEventListener('click', function () { if (tutIdx > 0) { tutIdx--; renderTutorial(); } });
  $('#tut-next').addEventListener('click', function () { if (tutIdx < TUT.length - 1) { tutIdx++; renderTutorial(); } else { tutIdx = 0; show('menu'); } });

  /* ---------------- Records ---------------- */
  function renderRecords() {
    var s = load(), box = $('#records'); box.innerHTML = '';
    ['easy', 'medium', 'hard'].forEach(function (m) {
      var b = s.best[m];
      box.appendChild(el('<div class="rec-card"><h3>' + MODE_ICON[m] + ' ' + E.MODES[m].label + (isUnlocked(m) ? '' : ' 🔒') + '</h3><div class="rec-stats">' +
        '<div><small>Wins</small><b>' + s.wins[m] + '</b></div>' +
        '<div><small>Best time</small><b>' + (b && b.time != null ? fmtTime(b.time) : '–') + '</b></div>' +
        '<div><small>Best score</small><b>' + (b && b.score != null ? b.score : '–') + '</b></div></div></div>'));
    });
    var rows = s.history.slice(-10).reverse().map(function (h) {
      return '<tr><td>' + E.MODES[h.mode].label + '</td><td>' + (h.won ? '✅ Win' : '❌ Lost') + '</td><td>' + fmtTime(h.time) + '</td><td>' + h.score + '</td></tr>';
    }).join('');
    box.appendChild(el('<div class="rec-card"><h3>Recent rounds</h3>' + (rows ? '<table class="rec-table"><tr><th>Mode</th><th>Result</th><th>Time</th><th>Score</th></tr>' + rows + '</table>'
      : '<p>No rounds played yet.</p>') + '</div>'));
    box.appendChild(el('<div class="rec-soon">🌐 Online ranking against other players (Individual, PK and Team) is coming in a later update. ' +
      'For now, your records are saved on this device.</div>'));
  }

  /* =====================================================================
     GAME
     ===================================================================== */
  var G = null;                 // engine state
  var ui = { elapsed: 0, startTs: 0, running: false, timer: null, pendingTray: null, pendingIds: null,
             armed: null, armTimer: null, hintId: null, hintTimer: null, lay: null, lastCoverToast: 0, lastOpts: null };

  function startGame(mode, opts) {
    opts = opts || {};
    // the board area is roughly the screen minus the top bar and the tray
    var w = window.innerWidth, h = window.innerHeight;
    var cols = w < 700 ? 5 : Math.max(6, Math.min(13, Math.floor(w / 115)));
    var areaH = Math.max(200, h - (w < 560 ? 330 : 260)), areaW = Math.max(200, w - 40);
    G = E.newGame({ mode: mode, cols: cols, aspect: areaH / areaW, seed: opts.seed, theme: opts.theme, shape: opts.shape });
    ui.lastOpts = { mode: mode, theme: opts.theme, shape: opts.shape };
    var scr = $('#screen-game');
    scr.className = 'screen theme-' + G.theme;
    $('#hud-mode').textContent = MODE_ICON[mode] + ' ' + G.cfg.label;
    $('#hud-theme').textContent = THEME_LABEL[G.theme] + ' · ' + E.SHAPES[G.shape].label;
    window.ChemDeco.paintBackground($('#deco'), G.theme, G.seed);
    ui.elapsed = 0; ui.pendingTray = null; ui.pendingIds = null; ui.armed = null; ui.hintId = null;
    closeModal();
    show('game');
    $('#board-wrap').scrollTop = 0;
    render();
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
  function elapsed() { return ui.elapsed + (ui.running ? performance.now() - ui.startTs : 0); }
  function updateTime() { $('#hud-time').textContent = fmtTime(elapsed()); }
  document.addEventListener('visibilitychange', function () {
    if (current !== 'game') return;
    if (document.hidden) stopTimer(); else if (!modalOpen()) startTimer();
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
    var len = D.visualLength(t.card.text);
    var fs = Math.min(lay.halfH * 0.58, (w - 14) / (Math.max(len, 3) * 0.6));
    var lbl = Math.max(7, Math.min(lay.halfH * 0.34, (w - 12) / (SHORT_LABEL[t.card.type].length * 0.62)));
    var cls = 'tile t-' + t.card.type + (free ? ' free' : ' covered') + (ui.hintId === t.id ? ' hinted' : '');
    return '<div class="' + cls + '" data-id="' + t.id + '" style="left:' + (sl.x * lay.halfW) + 'px;top:' + (sl.y * lay.halfH) + 'px;width:' + w +
      'px;height:' + h + 'px;z-index:' + (sl.layer * 1000 + sl.y) + '">' +
      '<div class="tile-top" style="font-size:' + fs.toFixed(1) + 'px">' + D.fmt(t.card.text) + '</div>' +
      '<div class="tile-bottom" style="font-size:' + lbl.toFixed(1) + 'px">' + SHORT_LABEL[t.card.type] + '</div>' +
      (free ? '' : '<span class="lock">🔒</span>') + '</div>';
  }

  function render() { renderHud(); renderBoard(); renderTray(); }

  function renderHud() {
    $('#hud-score').textContent = G.score;
    $('#hud-sets').textContent = G.setsCleared + '/' + G.totalSets;
    $('#hud-streak').textContent = G.streak;
    $('#hud-tray').textContent = G.tray.length + '/' + E.TRAY_SIZE;
    $('#cnt-undo').textContent = G.undosLeft;
    $('#cnt-hint').textContent = G.hintsLeft;
    $('#cnt-shuffle').textContent = G.shufflesLeft;
    var playing = G.status === 'playing';
    $('#btn-undo').disabled = !playing || G.undosLeft <= 0 || !G.tray.length;
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
  function fitText(nodes) {
    var jobs = [];
    nodes.forEach(function (n) { if (n.scrollWidth > n.clientWidth + 0.5 || n.scrollHeight > n.clientHeight + 1) jobs.push([n, n.clientWidth / n.scrollWidth, n.clientHeight / n.scrollHeight]); });
    jobs.forEach(function (j) {
      var cur = parseFloat(getComputedStyle(j[0]).fontSize);
      j[0].style.fontSize = Math.max(6.5, cur * Math.min(j[1], j[2], 1) * 0.94).toFixed(1) + 'px';
    });
  }

  function renderTray() {
    var list = ui.pendingTray || G.tray, tray = $('#tray'), html = '';
    for (var i = 0; i < E.TRAY_SIZE; i++) {
      var id = list[i];
      if (id == null) { html += '<div class="slot">' + (i + 1) + '</div>'; continue; }
      var c = G.tiles[id].card;
      var cls = 'tcard t-' + c.type + (ui.pendingIds && ui.pendingIds.indexOf(id) >= 0 ? ' matching' : '') + (ui.armed === id ? ' armed' : '');
      html += '<div class="' + cls + '" data-id="' + id + '"><div class="tc-txt">' + D.fmt(c.text) + '</div><div class="tc-lbl">' + SHORT_LABEL[c.type] + '</div></div>';
    }
    tray.innerHTML = html;
    fitText(tray.querySelectorAll('.tc-txt'));
    tray.classList.toggle('danger', G.tray.length >= 5 && G.status === 'playing');
  }

  function bump(sel) { var e = $(sel); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }

  /* ---------- Fly animation from one rect to another ---------- */
  function fly(fromRect, toEl, type, text) {
    if (!fromRect || !toEl) return;
    var to = toEl.getBoundingClientRect();
    var f = el('<div class="tcard t-' + type + ' fly" style="animation:none"><div class="tc-txt">' + D.fmt(text) + '</div></div>');
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
  function floatScore(text, anchor) {
    var r = anchor.getBoundingClientRect();
    var f = el('<div class="float-score">' + text + '</div>');
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
      setTimeout(function () { floatScore('+' + res.gained + (res.bonus ? ' 🔥' : ''), $('#tray')); }, 150);
      ui.pendingTimer = setTimeout(function () { ui.pendingTray = null; ui.pendingIds = null; renderTray(); }, 480);
    }
    if (G.status !== 'playing') { stopTimer(); setTimeout(showResult, res.matched ? 700 : 450); }
  });

  /* ---------- Undo (max 3 per round) ---------- */
  function disarm() { ui.armed = null; clearTimeout(ui.armTimer); }
  $('#tray').addEventListener('click', function (e) {
    var c = e.target.closest('.tcard'); if (!c || !G || G.status !== 'playing') return;
    var id = +c.getAttribute('data-id');
    if (ui.pendingIds && ui.pendingIds.indexOf(id) >= 0) return;
    if (G.tray.indexOf(id) < 0) return;
    if (G.undosLeft <= 0) { sfx.bad(); toast('No undos left this round'); return; }
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
    toast('↩ Card returned · ' + G.undosLeft + ' undo' + (G.undosLeft === 1 ? '' : 's') + ' left');
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
    openModal('<div class="big-icon">🔀</div><h2>Shuffle the board?</h2><p>The cards still on the board are re-dealt into the same positions. ' +
      'Your tray stays as it is. You have 1 shuffle per round.</p>', [
      { label: 'Shuffle', onClick: function () {
        flushPending(); disarm(); clearHint();
        var r = E.shuffleBoard(G);
        if (!r.ok) { toast('Nothing to shuffle'); return; }
        var b = $('#board'); b.classList.remove('shuffling'); void b.offsetWidth; b.classList.add('shuffling');
        setTimeout(function () { render(); }, 200);
        toast(r.guaranteed ? '🔀 Board shuffled – still solvable!' : '🔀 Board shuffled');
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
    openModal('<div class="big-icon">⏸️</div><h2>Paused</h2><p>' + MODE_ICON[G.mode] + ' ' + G.cfg.label + ' · ' + fmtTime(elapsed()) + '</p>', [
      { label: '▶ Resume', cls: 'btn-play', onClick: startTimer },
      { label: '🔄 Restart round', onClick: function () { startGame(G.mode, { seed: G.seed, theme: G.theme, shape: G.shape }); } },
      { label: '🆕 New board', onClick: function () { startGame(G.mode, ui.lastOpts); } },
      { label: '🏠 Main menu', cls: 'alt', onClick: function () { show('menu'); } }
    ]);
  });

  /* ---------- Result ---------- */
  function showResult() {
    var won = G.status === 'won', time = elapsed(), mode = G.mode, s = load();
    var extra = '';
    if (mode !== 'practice') {
      s.history.push({ mode: mode, won: won, time: Math.round(time), score: G.score, date: Date.now() });
      if (s.history.length > 50) s.history = s.history.slice(-50);
      if (won) {
        var wasMed = isUnlocked('medium'), wasHard = isUnlocked('hard');
        s.wins[mode]++;
        var b = s.best[mode] || {};
        var newTime = b.time == null || time < b.time, newScore = b.score == null || G.score > b.score;
        if (newTime) b.time = Math.round(time);
        if (newScore) b.score = G.score;
        s.best[mode] = b;
        if (newTime) extra += '<div class="badge-new">⏱ New best time!</div> ';
        if (newScore && !newTime) extra += '<div class="badge-new">⭐ New best score!</div>';
        if (!wasMed && isUnlocked('medium')) extra += '<div class="badge-unlock">🔓 Medium mode unlocked!</div>';
        if (!wasHard && isUnlocked('hard')) extra += '<div class="badge-unlock">🔓 Hard mode unlocked!</div>';
        if (mode === 'easy' && !isUnlocked('medium')) extra += '<p>Easy wins: ' + s.wins.easy + '/' + E.UNLOCK_WINS + ' to unlock Medium</p>';
        if (mode === 'medium' && !isUnlocked('hard')) extra += '<p>Medium wins: ' + s.wins.medium + '/' + E.UNLOCK_WINS + ' to unlock Hard</p>';
      }
      save();
    }
    var grid = '<div class="result-grid"><div><small>Time</small><b>' + fmtTime(time) + '</b></div><div><small>Score</small><b>' + G.score + '</b></div>' +
      '<div><small>Sets</small><b>' + G.setsCleared + '/' + G.totalSets + '</b></div><div><small>Best streak</small><b>' + G.bestStreak + '</b></div>' +
      '<div><small>Undos used</small><b>' + G.undosUsed + '/' + G.cfg.undos + '</b></div><div><small>Hints used</small><b>' + G.hintsUsed + '/' + G.cfg.hints + '</b></div></div>';
    if (won) {
      sfx.win();
      openModal('<div class="big-icon">🎉</div><h2>Board cleared!</h2>' + grid + extra, [
        { label: mode === 'practice' ? '▶ Play Easy' : '▶ Next round', cls: 'btn-play', onClick: function () { startGame(mode === 'practice' ? 'easy' : mode); } },
        { label: 'Choose mode', onClick: function () { show('modes'); } },
        { label: '🏠 Main menu', cls: 'alt', onClick: function () { show('menu'); } }
      ]);
    } else {
      sfx.lose();
      openModal('<div class="big-icon">🧺</div><h2>Tray full!</h2><p>7 cards in the tray without a complete set.</p>' + grid, [
        { label: '🔄 Retry same board', cls: 'btn-play', onClick: function () { startGame(mode, { seed: G.seed, theme: G.theme, shape: G.shape }); } },
        { label: '🆕 New board', onClick: function () { startGame(mode, ui.lastOpts); } },
        { label: '🏠 Main menu', cls: 'alt', onClick: function () { show('menu'); } }
      ]);
    }
  }

  /* ---------- Keep the board sized to the screen ---------- */
  var rz = null;
  window.addEventListener('resize', function () {
    clearTimeout(rz); rz = setTimeout(function () { if (current === 'game' && G) renderBoard(); }, 120);
  });

  refreshMute();
  // expose for debugging / automated tests
  window.ChemSheep = { start: startGame, state: function () { return G; }, show: show, elapsed: elapsed };
})();
