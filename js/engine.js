/* =====================================================================
   CHEMISTRY SHEEP – GAME ENGINE (pure logic, no DOM)
   ---------------------------------------------------------------------
   Board geometry uses a half-tile grid: a tile covers 2 x 2 cells.
   Inside each horizontal "band", layer k sits k half-rows lower than
   layer k-1, so an upper tile only ever covers the BOTTOM half of the
   tiles beneath it. The top half (where the card text is printed) of
   every tile therefore stays visible, while selectability is decided
   separately: a tile is free only when no board tile covers it.
   ===================================================================== */
(function (root) {
  'use strict';

  var DATA = root.CHEM_DATA || (typeof require !== 'undefined' ? require('./data.js') : null);
  var TYPES = ['fg', 'gf', 'ex', 'name'];
  var TRAY_SIZE = 7;

  /* ---------- Mode settings (edit here to rebalance) ---------- */
  /* Every series appears only once per board (no repeats). undos: -1 = unlimited. */
  var MODES = {
    easy:     { id: 'easy',     label: 'Easy',     series: 5,  repeats: 0, layers: 3, maxHeld: 4, undos: -1, hints: 3, shuffles: 1 },
    medium:   { id: 'medium',   label: 'Medium',   series: 9,  repeats: 0, layers: 4, maxHeld: 5, undos: -1, hints: 3, shuffles: 1 },
    hard:     { id: 'hard',     label: 'Hard',     series: 14, repeats: 0, layers: 4, maxHeld: 6, undos: -1, hints: 3, shuffles: 1 },
    practice: { id: 'practice', label: 'Practice', series: 2,  repeats: 0, layers: 2, maxHeld: 4, undos: -1, hints: 3, shuffles: 1 }
  };
  var UNDO_TIME_PENALTY_MS = 20000, UNDO_SCORE_PENALTY = 10;
  var UNLOCK_WINS = 3;
  var SCORE_PER_SET = 100, STREAK_STEP = 25, STREAK_MAX = 100;

  /* ---------- Board shapes: return true if a tile centred at (u,v) on layer k is allowed.
     u = horizontal position 0..1, v = vertical position 0..1. Add new shapes here. ---------- */
  /* Every shape is one solid block (no gaps). u,v run 0..1 across the board. */
  var SHAPES = {
    square:  { label: 'Square',  fn: function () { return true; } },
    diamond: { label: 'Diamond', fn: function (u, v) { return Math.abs(u - 0.5) + Math.abs(v - 0.5) * 0.9 <= 0.62; } },
    pyramid: { label: 'Pyramid', fn: function (u, v, k) { return Math.abs(u - 0.5) <= 0.16 + 0.4 * v - 0.05 * k; } },
    circle:  { label: 'Circle',  fn: function (u, v) { var dx = (u - 0.5) / 0.55, dy = (v - 0.5) / 0.62; return dx * dx + dy * dy <= 1; } },
    hexagon: { label: 'Hexagon', fn: function (u, v) { return Math.abs(u - 0.5) <= 0.56 - Math.max(0, Math.abs(v - 0.5) - 0.2) * 0.9; } },
    flask:   { label: 'Flask',   fn: function (u, v) { return Math.abs(u - 0.5) <= (v < 0.3 ? 0.2 : 0.2 + (v - 0.3) / 0.7 * 0.36); } }
  };
  var THEMES = ['lab', 'minimal', 'garden', 'notebook'];

  /* ---------- Random helpers (seeded, so a board can be reproduced) ---------- */
  function rngFrom(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffled(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }
  function weightedPick(opts, rng) {
    var total = 0, i;
    for (i = 0; i < opts.length; i++) total += opts[i].w;
    var r = rng() * total;
    for (i = 0; i < opts.length; i++) { r -= opts[i].w; if (r <= 0) return opts[i]; }
    return opts[opts.length - 1];
  }

  /* ---------- Geometry ---------- */
  function overlap(a, b) { return a.x < b.x + 2 && b.x < a.x + 2 && a.y < b.y + 2 && b.y < a.y + 2; }
  function overlapsTopStrip(upper, lower) { // lower's top half: [x,x+2) x [y,y+1)
    return upper.x < lower.x + 2 && lower.x < upper.x + 2 && upper.y < lower.y + 1 && lower.y < upper.y + 2;
  }

  function genSlots(cols, B, layers, mask) {
    var gridW = cols * 2, s = layers + 1, slots = [];
    for (var b = 0; b < B; b++) {
      var v = (b + 0.5) / B, prevLayer = [];
      for (var k = 0; k < layers; k++) {
        var cur = [], xs = [];
        for (var x = k % 2; x + 2 <= gridW; x += 2) xs.push(x);
        var ok = xs.filter(function (x) { return mask((x + 1) / gridW, v, k); });
        if (k === 0 && ok.length < 2) {                 // keep every row at least 2 wide so the shape stays solid
          ok = xs.slice().sort(function (p, q) { return Math.abs(p + 1 - gridW / 2) - Math.abs(q + 1 - gridW / 2); }).slice(0, 2);
        }
        ok.forEach(function (x) {
          if (k > 0 && !prevLayer.some(function (p) { return Math.abs(p.x - x) < 2; })) return;
          var sl = { x: x, y: b * s + k, layer: k, band: b };
          cur.push(sl); slots.push(sl);
        });
        prevLayer = cur;
      }
    }
    return slots;
  }

  function buildLayout(count, layers, maxCols, shapeName, rng, aspect) {
    var mask = (SHAPES[shapeName] || SHAPES.square).fn, s = layers + 1;
    aspect = aspect || 1.2;                             // wanted board height / width
    var best = null;
    for (var cols = 4; cols <= Math.max(4, maxCols); cols++) {
      var found = 0;
      for (var B = 1; B <= 40 && found < 2; B++) {
        var cap = genSlots(cols, B, layers, mask).length;
        if (cap < count) continue;
        found++;
        var ratio = (B * s * 0.78) / (2 * cols);
        var score = Math.abs(Math.log(ratio / aspect)) + 2 * (cap - count) / count;
        if (!best || score < best.score) best = { cols: cols, B: B, score: score };
      }
    }
    var slots = genSlots(best.cols, best.B, layers, mask);
    // prune down to the exact count: take from the top layers first so the outline keeps its shape
    while (slots.length > count) {
      var cands = slots.filter(function (a) {
        return !slots.some(function (o) { return o.layer > a.layer && overlap(a, o); });
      });
      var opts = cands.map(function (c) { return { w: Math.pow(c.layer + 1, 3), c: c }; });
      var victim = weightedPick(opts, rng).c;
      slots.splice(slots.indexOf(victim), 1);
    }
    var minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    slots.forEach(function (a) { minX = Math.min(minX, a.x); minY = Math.min(minY, a.y); maxX = Math.max(maxX, a.x + 2); maxY = Math.max(maxY, a.y + 2); });
    slots.forEach(function (a, i) { a.x -= minX; a.y -= minY; a.id = i; });
    return { gridW: maxX - minX, gridH: maxY - minY, slots: slots };
  }

  function computeCoveredBy(slots) {
    return slots.map(function (a) {
      var list = [];
      slots.forEach(function (b, j) { if (b.layer > a.layer && overlap(a, b)) list.push(j); });
      return list;
    });
  }

  /* A random order in which tiles can legally be removed (tops first). */
  function removalOrder(ids, coveredBy, rng) {
    var remaining = {}, order = [];
    ids.forEach(function (i) { remaining[i] = true; });
    var left = ids.length;
    while (left > 0) {
      var free = ids.filter(function (i) {
        return remaining[i] && coveredBy[i].every(function (j) { return !remaining[j]; });
      });
      var c = pick(free, rng);
      order.push(c); remaining[c] = false; left--;
    }
    return order;
  }

  /* ---------- Card sets ---------- */
  function makeInstance(series, exIndex, instId) {
    var cards = {};
    TYPES.forEach(function (t) {
      var text = t === 'name' ? series.name : t === 'fg' ? series.fg : t === 'gf' ? series.gf : series.ex[exIndex][0];
      cards[t] = { series: series.id, type: t, text: text, inst: instId,
                   exName: t === 'ex' ? series.ex[exIndex][1] : null };
    });
    return { id: instId, series: series.id, cards: cards };
  }

  /* Cards with identical text for the same card type are interchangeable between series. */
  var KEY_CACHE = null;
  function cardKeys(card) {
    if (!KEY_CACHE) {
      KEY_CACHE = {};
      DATA.SERIES.forEach(function (s) {
        var add = function (t, txt) { var k = t + '|' + txt; (KEY_CACHE[k] = KEY_CACHE[k] || []); if (KEY_CACHE[k].indexOf(s.id) < 0) KEY_CACHE[k].push(s.id); };
        add('fg', s.fg); add('gf', s.gf); add('name', s.name);
        s.ex.forEach(function (e) { add('ex', e[0]); });
      });
    }
    return KEY_CACHE[card.type + '|' + card.text] || [card.series];
  }

  /* Assign cards to a removal order so that following that order never
     holds more than `maxHeld` cards in the tray -> board is solvable.  */
  function assignCards(order, openInit, unopenedInit, heldInit, maxHeld, rng, tries) {
    tries = tries || 400;
    for (var attempt = 0; attempt < tries; attempt++) {
      var sets = openInit.map(function (o) { return { cards: o.cards, missing: o.missing.slice() }; });
      var un = shuffled(unopenedInit, rng);
      var held = heldInit, map = {}, failed = false;
      for (var p = 0; p < order.length; p++) {
        var opts = [];
        var anyOne = sets.some(function (st) { return st.missing.length === 1; });
        sets.forEach(function (st) {
          st.missing.forEach(function (t) {
            var completes = st.missing.length === 1, nh = held + 1;
            if (completes) { if (nh <= TRAY_SIZE) opts.push({ w: 4, st: st, t: t }); return; }
            if (nh > maxHeld) return;
            if (nh === maxHeld && !(anyOne || st.missing.length === 2)) return;
            opts.push({ w: 1.6, st: st, t: t });
          });
        });
        if (un.length && held + 1 <= maxHeld && (held + 1 < maxHeld || anyOne)) {
          opts.push({ w: 1.2 + (maxHeld - held) * 0.15, isNew: true });
        }
        if (!opts.length) { failed = true; break; }
        var o = weightedPick(opts, rng), pos = order[p];
        if (o.isNew) {
          var inst = un.pop(), t0 = pick(TYPES, rng);
          map[pos] = inst.cards[t0];
          sets.push({ cards: inst.cards, missing: TYPES.filter(function (t) { return t !== t0; }) });
          held++;
        } else {
          map[pos] = o.st.cards[o.t];
          o.st.missing.splice(o.st.missing.indexOf(o.t), 1);
          held++;
          if (o.st.missing.length === 0) { held -= 4; sets.splice(sets.indexOf(o.st), 1); }
        }
      }
      if (!failed && !un.length && !sets.length) return map;
    }
    return null;
  }

  function sequentialAssign(order, instances) {
    var map = {}, i = 0;
    instances.forEach(function (inst) { TYPES.forEach(function (t) { map[order[i++]] = inst.cards[t]; }); });
    return map;
  }

  /* ---------- Game state ---------- */
  function newGame(opts) {
    opts = opts || {};
    var mode = MODES[opts.mode] || MODES.easy;
    var seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 1e9);
    var rng = rngFrom(seed);
    var cols = opts.cols || 5;

    var chosen = opts.seriesIds
      ? DATA.SERIES.filter(function (s) { return opts.seriesIds.indexOf(s.id) >= 0; })
      : shuffled(DATA.SERIES, rng).slice(0, mode.series);
    var repeatIds = shuffled(chosen, rng).slice(0, mode.repeats).map(function (s) { return s.id; });
    var instances = [], instId = 0;
    chosen.forEach(function (s) {
      var first = Math.floor(rng() * s.ex.length);
      instances.push(makeInstance(s, first, instId++));
      if (repeatIds.indexOf(s.id) >= 0) instances.push(makeInstance(s, (first + 1) % s.ex.length, instId++));
    });

    var count = instances.length * 4;
    var shape = opts.shape || pick(Object.keys(SHAPES), rng);
    var theme = opts.theme || pick(THEMES, rng);
    var layout = buildLayout(count, mode.layers, cols, shape, rng, opts.aspect);
    var coveredBy = computeCoveredBy(layout.slots);
    var allIds = layout.slots.map(function (s) { return s.id; });
    var order = removalOrder(allIds, coveredBy, rng);
    var map = assignCards(order, [], instances, 0, mode.maxHeld, rng) || sequentialAssign(order, instances);

    var uid = 0;
    var tiles = layout.slots.map(function (sl) {
      var c = map[sl.id];
      return { id: sl.id, slot: sl, card: { uid: uid++, series: c.series, type: c.type, text: c.text, exName: c.exName }, where: 'board' };
    });

    return {
      mode: mode.id, cfg: mode, seed: seed, theme: theme, shape: shape, cols: cols,
      gridW: layout.gridW, gridH: layout.gridH,
      tiles: tiles, coveredBy: coveredBy, tray: [], solutionOrder: order,
      seriesIds: chosen.map(function (s) { return s.id; }),
      undosLeft: mode.undos, timePenaltyMs: 0, hintsLeft: mode.hints, shufflesLeft: mode.shuffles,
      undosUsed: 0, hintsUsed: 0, shufflesUsed: 0,
      score: 0, streak: 0, bestStreak: 0, setsCleared: 0, totalSets: instances.length, picks: 0,
      status: 'playing', rngState: Math.floor(rng() * 1e9)
    };
  }

  function isFree(state, id) {
    return state.tiles[id].where === 'board' &&
      state.coveredBy[id].every(function (j) { return state.tiles[j].where !== 'board'; });
  }
  function boardCount(state) { return state.tiles.filter(function (t) { return t.where === 'board'; }).length; }

  /* Look for 4 tray cards (one of each type) from the same series. */
  function findMatch(state, preferId) {
    var trayTiles = state.tray.map(function (id) { return state.tiles[id]; });
    var candidates = [];
    if (preferId != null) cardKeys(state.tiles[preferId].card).forEach(function (s) { candidates.push(s); });
    trayTiles.forEach(function (t) { cardKeys(t.card).forEach(function (s) { if (candidates.indexOf(s) < 0) candidates.push(s); }); });
    for (var c = 0; c < candidates.length; c++) {
      var s = candidates[c], chosen = [];
      for (var k = 0; k < TYPES.length; k++) {
        var t = TYPES[k], found = null;
        if (preferId != null && state.tiles[preferId].card.type === t && cardKeys(state.tiles[preferId].card).indexOf(s) >= 0 && state.tray.indexOf(preferId) >= 0) found = preferId;
        for (var i = 0; found == null && i < trayTiles.length; i++) {
          if (trayTiles[i].card.type === t && cardKeys(trayTiles[i].card).indexOf(s) >= 0) found = trayTiles[i].id;
        }
        if (found == null) break;
        chosen.push(found);
      }
      if (chosen.length === 4) return { series: s, ids: chosen };
    }
    return null;
  }

  function pickTile(state, id) {
    if (state.status !== 'playing') return { ok: false, reason: 'over' };
    if (!state.tiles[id] || state.tiles[id].where !== 'board') return { ok: false, reason: 'gone' };
    if (!isFree(state, id)) return { ok: false, reason: 'covered' };
    if (state.tray.length >= TRAY_SIZE) return { ok: false, reason: 'full' };
    state.tiles[id].where = 'tray';
    state.tray.push(id);
    state.picks++;
    var res = { ok: true, matched: null, gained: 0 };
    var m = findMatch(state, id);
    if (m) {
      m.ids.forEach(function (mid) { state.tiles[mid].where = 'gone'; state.tray.splice(state.tray.indexOf(mid), 1); });
      state.setsCleared++;
      state.streak++;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      var bonus = Math.min(STREAK_STEP * (state.streak - 1), STREAK_MAX);
      res.gained = SCORE_PER_SET + bonus;
      res.bonus = bonus;
      state.score += res.gained;
      res.matched = m;
    }
    if (boardCount(state) === 0 && state.tray.length === 0) state.status = 'won';
    else if (state.tray.length >= TRAY_SIZE) state.status = 'lost';
    res.status = state.status;
    return res;
  }

  /* Undo: send a tray card back to its exact original slot.
     Unlimited, but each undo adds 20 s to the time and takes 10 points (score never drops below 0). */
  function undoTile(state, id) {
    if (state.status !== 'playing') return { ok: false, reason: 'over' };
    if (state.cfg.undos >= 0 && state.undosLeft <= 0) return { ok: false, reason: 'noUndos' };
    var idx = state.tray.indexOf(id);
    if (idx < 0) return { ok: false, reason: 'notInTray' };
    state.tray.splice(idx, 1);
    state.tiles[id].where = 'board';
    if (state.cfg.undos >= 0) state.undosLeft--;
    state.undosUsed++; state.streak = 0;
    var lost = Math.min(UNDO_SCORE_PENALTY, state.score);
    state.score -= lost;
    state.timePenaltyMs += UNDO_TIME_PENALTY_MS;
    return { ok: true, scoreLost: lost, timeAdded: UNDO_TIME_PENALTY_MS };
  }

  /* Hint: best free tile to pick next (heuristic). */
  function findHint(state) {
    var trayTypes = {};
    state.tray.forEach(function (id) {
      var c = state.tiles[id].card;
      cardKeys(c).forEach(function (s) { (trayTypes[s] = trayTypes[s] || {})[c.type] = true; });
    });
    var free = state.tiles.filter(function (t) { return isFree(state, t.id); });
    var best = null, bestScore = -1;
    free.forEach(function (t) {
      var sc = 0;
      cardKeys(t.card).forEach(function (s) {
        var have = trayTypes[s] ? Object.keys(trayTypes[s]).length : 0;
        var v;
        if (have && !trayTypes[s][t.card.type]) v = have === 3 ? 1000 : 50 + have * 10;
        else if (!have) {
          var sameFree = {};
          free.forEach(function (o) { if (o.id !== t.id && cardKeys(o.card).indexOf(s) >= 0 && o.card.type !== t.card.type) sameFree[o.card.type] = true; });
          v = 5 + Object.keys(sameFree).length * 6;
        } else v = 1;
        sc = Math.max(sc, v);
      });
      if (sc > bestScore || (sc === bestScore && Math.random() < 0.5)) { bestScore = sc; best = t; }
    });
    return best ? best.id : null;
  }
  function useHint(state) {
    if (state.status !== 'playing' || state.hintsLeft <= 0) return null;
    var id = findHint(state);
    if (id != null) { state.hintsLeft--; state.hintsUsed++; }
    return id;
  }

  /* Shuffle: re-deal the cards still on the board (positions stay), keeping it solvable. */
  function shuffleBoard(state) {
    if (state.status !== 'playing' || state.shufflesLeft <= 0) return { ok: false };
    var rng = rngFrom(state.rngState + state.picks * 7919 + state.shufflesUsed * 104729);
    var boardIds = state.tiles.filter(function (t) { return t.where === 'board'; }).map(function (t) { return t.id; });
    if (boardIds.length < 2) return { ok: false };
    // rebuild groups per series (tray cards first so they join open groups)
    var bySeries = {};
    state.tiles.forEach(function (t) {
      if (t.where === 'gone') return;
      var g = (bySeries[t.card.series] = bySeries[t.card.series] || { fg: [], gf: [], ex: [], name: [] });
      if (t.where === 'tray') g[t.card.type].unshift({ card: t.card, inTray: true });
      else g[t.card.type].push({ card: t.card, inTray: false });
    });
    var open = [], unopened = [];
    Object.keys(bySeries).forEach(function (s) {
      var g = bySeries[s], n = g.fg.length;
      for (var i = 0; i < n; i++) {
        var cards = {}, missing = [], anyTray = false;
        TYPES.forEach(function (t) { var e = g[t][i]; cards[t] = e.card; if (e.inTray) anyTray = true; else missing.push(t); });
        if (anyTray) open.push({ cards: cards, missing: missing }); else unopened.push({ cards: cards });
      }
    });
    var cov = state.coveredBy.map(function (list) { return list.filter(function (j) { return state.tiles[j].where === 'board'; }); });
    var order = removalOrder(boardIds, cov, rng);
    var map = assignCards(order, open, unopened, state.tray.length, 6, rng, 600);
    var guaranteed = !!map;
    if (!map) { // no solvable deal exists from here: plain random shuffle
      var cards = shuffled(boardIds.map(function (id) { return state.tiles[id].card; }), rng);
      map = {}; boardIds.forEach(function (id, i) { map[id] = cards[i]; });
    }
    boardIds.forEach(function (id) { state.tiles[id].card = map[id]; });
    state.shufflesLeft--; state.shufflesUsed++;
    return { ok: true, guaranteed: guaranteed, order: guaranteed ? order : null };
  }

  var api = {
    MODES: MODES, UNDO_TIME_PENALTY_MS: UNDO_TIME_PENALTY_MS, UNDO_SCORE_PENALTY: UNDO_SCORE_PENALTY, SHAPES: SHAPES, THEMES: THEMES, TYPES: TYPES, TRAY_SIZE: TRAY_SIZE, UNLOCK_WINS: UNLOCK_WINS,
    rngFrom: rngFrom, buildLayout: buildLayout, computeCoveredBy: computeCoveredBy, removalOrder: removalOrder,
    assignCards: assignCards, overlap: overlap, overlapsTopStrip: overlapsTopStrip, cardKeys: cardKeys,
    newGame: newGame, isFree: isFree, pickTile: pickTile, undoTile: undoTile, findMatch: findMatch,
    findHint: findHint, useHint: useHint, shuffleBoard: shuffleBoard, boardCount: boardCount
  };
  root.ChemEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
