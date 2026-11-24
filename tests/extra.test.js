/* Tests for Extreme mode ("?" blocks) and Today's Experiment rule options. Run: node tests/extra.test.js */
global.window = undefined;
var D = require('../js/data.js'), E = require('../js/engine.js');
var pass = 0, fail = 0;
function ok(c, msg) { if (c) pass++; else { fail++; if (fail < 20) console.log('FAIL', msg); } }
function play(g) {
  g.solutionOrder.forEach(function (id) {
    if (g.status !== 'playing') return;
    if (g.tiles[id].card.type === 'q') { var r = E.answerQuestion(g, id, true); ok(r.ok, 'answer ok ' + g.seed); }
    else { var p = E.pickTile(g, id); ok(p.ok, 'pick ok ' + g.seed + ' ' + p.reason); }
  });
  return g.status;
}
var opts = [
  { mode: 'extreme' },
  { mode: 'medium', traySize: 6 },
  { mode: 'easy', noHelp: true },
  { mode: 'medium', nameIt: true },
  { mode: 'medium', questions: 6 },
  { mode: 'easy', repeats: 4, seriesIds: ['alkane', 'alkene', 'alkyne', 'haloalkane'] },
  { mode: 'medium', seriesIds: ['aldehyde', 'ketone', 'carboxylic', 'ester', 'acylchloride', 'amide'] }
];
opts.forEach(function (o) {
  for (var seed = 1; seed <= 300; seed++) {
    var g = E.newGame(Object.assign({ seed: seed, cols: 4 + seed % 6, aspect: 0.8 + (seed % 5) * 0.3 }, o));
    var qs = g.tiles.filter(function (t) { return t.card.type === 'q'; });
    ok(qs.length === (g.cfg.questions || 0), 'q count ' + JSON.stringify(o));
    qs.forEach(function (t) { ok(t.slot.layer > 0 && g.coveredBy.some(function (l) { return l.indexOf(t.id) >= 0; }), 'q covers something'); });
    if (o.nameIt) ok(g.tiles.filter(function (t) { return t.card.type === 'ex'; }).every(function (t) { return /[a-z]/.test(t.card.text) && t.card.text === t.card.exName; }), 'nameIt text');
    if (o.noHelp) ok(g.hintsLeft === 0 && g.shufflesLeft === 0 && g.cfg.undos === 0, 'noHelp');
    if (o.repeats) ok(g.totalSets === 8, 'repeats');
    ok(g.traySize === (o.traySize || 7), 'tray size');
    // the planned order never overfills the tray
    var held = 0, maxH = 0, sim = E.newGame(Object.assign({ seed: seed, cols: 4 + seed % 6, aspect: 0.8 + (seed % 5) * 0.3 }, o));
    sim.solutionOrder.forEach(function (id) { if (sim.tiles[id].card.type === 'q') { E.answerQuestion(sim, id, true); return; } E.pickTile(sim, id); maxH = Math.max(maxH, sim.tray.length); });
    ok(maxH < sim.traySize, 'tray headroom ' + maxH);
    ok(play(g) === 'won', 'wins following plan ' + JSON.stringify(o) + ' seed ' + seed);
  }
});
// ? block rules
var g = E.newGame({ mode: 'extreme', seed: 42 });
var q = g.tiles.find(function (t) { return t.card.type === 'q' && E.isFree(g, t.id); });
ok(!!q, 'a ? block is free at start');
ok(E.pickTile(g, q.id).reason === 'question', 'cannot pick ? into tray');
var under = g.tiles.filter(function (t) { return g.coveredBy[t.id].indexOf(q.id) >= 0; });
ok(under.length > 0 && under.every(function (t) { return !E.isFree(g, t.id); }), 'cards under ? are blocked');
var r = E.answerQuestion(g, q.id, false);
ok(r.ok && !r.correct && g.timePenaltyMs === 30000 && g.tiles[q.id].where === 'board', 'wrong: +30 s, block stays');
E.answerQuestion(g, q.id, false); E.answerQuestion(g, q.id, false);
ok(g.status === 'playing', 'still playing after 3 wrong');
E.answerQuestion(g, q.id, false);
ok(g.status === 'lost' && g.lossReason === 'questions', '4 wrong = round lost');
g = E.newGame({ mode: 'extreme', seed: 43 });
q = g.tiles.find(function (t) { return t.card.type === 'q' && E.isFree(g, t.id); });
ok(E.answerQuestion(g, q.id, true).correct && g.tiles[q.id].where === 'gone', 'right answer removes block');
// shuffle with ? blocks still solvable
for (var sd = 1; sd <= 150; sd++) {
  g = E.newGame({ mode: 'extreme', seed: sd });
  for (var k = 0; k < 10; k++) { var id = g.solutionOrder[k]; if (g.tiles[id].card.type === 'q') E.answerQuestion(g, id, true); else E.pickTile(g, id); }
  var sh = E.shuffleBoard(g);
  ok(sh.ok, 'shuffle ok');
  ok(g.tiles.filter(function (t) { return t.card.type === 'q'; }).length === 8, 'shuffle keeps ? blocks');
  if (sh.guaranteed) {
    // answer all ? blocks first when needed, then follow new order
    var guard = 0;
    while (g.status === 'playing' && guard++ < 400) {
      var nxt = sh.order.find(function (i) { return g.tiles[i].where === 'board'; });
      if (nxt == null) break;
      if (!E.isFree(g, nxt)) {
        var qq = g.tiles.find(function (t) { return t.where === 'board' && t.card.type === 'q' && E.isFree(g, t.id); });
        ok(!!qq, 'blocked card is behind an answerable ? block, seed ' + sd); if (!qq) break;
        E.answerQuestion(g, qq.id, true); continue;
      }
      E.pickTile(g, nxt);
    }
    while (g.status === 'playing') { var q2 = g.tiles.find(function (t) { return t.where === 'board' && t.card.type === 'q' && E.isFree(g, t.id); }); if (!q2) break; E.answerQuestion(g, q2.id, true); }
    ok(g.status === 'won', 'shuffled extreme board still winnable seed ' + sd);
  }
}
// countdown
g = E.newGame({ mode: 'easy', seed: 5, timeLimitMs: 180000 });
ok(!E.checkTimeLimit(g, 179000) && E.checkTimeLimit(g, 180000) && g.lossReason === 'time', 'countdown');
// hint never suggests nothing while cards remain
g = E.newGame({ mode: 'extreme', seed: 9 }); ok(E.findHint(g) != null, 'hint exists');
console.log(pass + '/' + (pass + fail) + ' checks passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
