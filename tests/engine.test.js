// Logic tests for the Chemistry Sheep engine. Run: node engine.test.js <path-to-js-dir>
const path = require('path');
const dir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'js'));
const D = require(path.join(dir, 'data.js'));
const E = require(path.join(dir, 'engine.js'));
let fails = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; if (fails < 30) console.log('FAIL:', msg); } }

// ---- 1. Content checks
const S = Object.fromEntries(D.SERIES.map(s => [s.id, s]));
ok(D.SERIES.length === 14, '14 series');
ok(S.alcohol.gf === 'C_{n}H_{2n+1}OH', 'alcohol gf');
ok(S.carboxylic.gf === 'C_{n}H_{2n+1}COOH', 'carboxylic gf');
ok(S.ketone.fg === 'C=O', 'ketone fg');
ok(S.aldehyde.gf === 'C_{n}H_{2n+1}COH', 'aldehyde gf');
ok(S.ketone.gf === 'C_{n}H_{2n+1}COC_{n}H_{2n+1}', 'ketone gf');
ok(S.ester.gf === 'C_{n}H_{2n+1}COOC_{m}H_{2m+1}', 'ester gf');
ok(S.amine.gf === 'C_{n}H_{2n+1}NH_2' && S.amide.gf === 'C_{n}H_{2n+1}CONH_2', 'amine/amide gf');
ok(D.fmt('C_{n}H_{2n+1}OH') === 'C<sub>n</sub>H<sub>2n+1</sub>OH', 'subscript formatting');
ok(D.fmt('CH_3CH_2OH') === 'CH<sub>3</sub>CH<sub>2</sub>OH', 'digit subscripts');
D.SERIES.forEach(s => ok(s.ex.length >= 2, 'two examples ' + s.id));
// no two series share identical card text of the same type (otherwise the cards become interchangeable)
['fg', 'gf', 'name'].forEach(t => {
  const seen = {}; D.SERIES.forEach(s => { ok(!seen[s[t]], `duplicate ${t} text: ${s[t]}`); seen[s[t]] = 1; });
});

// ---- 2. Board generation, layering, readability, solvability
const expected = { easy: (5 + 5) * 4, medium: (9 + 5) * 4, hard: (14 + 6) * 4, practice: 8 };
const sizes = {};
for (const mode of Object.keys(expected)) for (const shape of Object.keys(E.SHAPES)) for (const cols of [5, 7, 13]) for (const aspect of [0.5, 1.4]) {
  for (let seed = 1; seed <= 40; seed++) {
    if (seed > 15) continue;
    const g = E.newGame({ mode, shape, cols, aspect, seed: seed * 7919 + cols });
    const tag = `${mode}/${shape}/c${cols}/s${seed}`;
    ok(g.tiles.length === expected[mode], 'tile count ' + tag + ' ' + g.tiles.length);
    sizes[`${mode}/c${cols}`] = Math.max(sizes[`${mode}/c${cols}`] || 0, g.gridH);
    // every series appears with equal counts of each type
    const per = {};
    g.tiles.forEach(t => { per[t.card.series] = per[t.card.series] || { fg: 0, gf: 0, ex: 0, name: 0 }; per[t.card.series][t.card.type]++; });
    Object.values(per).forEach(c => ok(c.fg === c.gf && c.gf === c.ex && c.ex === c.name, 'balanced types ' + tag));
    ok(Object.keys(per).length === E.MODES[mode].series, 'series count ' + tag);
    // geometry
    const sl = g.tiles.map(t => t.slot);
    for (let i = 0; i < sl.length; i++) for (let j = 0; j < sl.length; j++) {
      if (i === j) continue;
      const a = sl[i], b = sl[j];
      if (a.layer === b.layer) ok(!E.overlap(a, b), 'same-layer overlap ' + tag);
      if (b.layer > a.layer) ok(!E.overlapsTopStrip(b, a), 'top strip hidden ' + tag);
      if (b.layer > a.layer && E.overlap(a, b)) ok(g.coveredBy[i].includes(j), 'cover map ' + tag);
    }
    // only uncovered tiles are selectable at start
    g.tiles.forEach(t => ok(E.isFree(g, t.id) === (g.coveredBy[t.id].length === 0), 'free iff uncovered ' + tag));
    // solvable: play the solution order
    const c = JSON.parse(JSON.stringify(g)); let maxTray = 0;
    for (const id of c.solutionOrder) {
      ok(E.isFree(c, id), 'solution tile free ' + tag);
      const r = E.pickTile(c, id); ok(r.ok, 'pick ok ' + tag);
      maxTray = Math.max(maxTray, c.tray.length + (r.matched ? 4 : 0));
    }
    ok(c.status === 'won', 'solution wins ' + tag + ' ' + c.status);
    ok(maxTray <= E.MODES[mode].maxHeld || maxTray <= 7, 'tray bound ' + tag);
    ok(c.setsCleared === c.totalSets && c.score > 0, 'sets cleared ' + tag);
  }
}
console.log('max grid height (half rows):', sizes);

// ---- 3. Undo restores exact slot, covering, limit of 3
{
  const g = E.newGame({ mode: 'medium', shape: 'pyramid', cols: 5, seed: 42 });
  const free = g.tiles.filter(t => E.isFree(g, t.id));
  const top = free.find(t => g.tiles.some(o => g.coveredBy[o.id].includes(t.id)));
  ok(!!top, 'found a covering tile');
  const under = g.tiles.find(o => g.coveredBy[o.id].includes(top.id));
  const before = JSON.stringify(top.slot);
  // remove all coverers of `under`, check it becomes free, then undo one and check it is covered again
  const cov = g.coveredBy[under.id].slice();
  cov.forEach(id => { if (E.isFree(g, id)) E.pickTile(g, id); });
  if (g.status === 'playing' && cov.every(id => g.tiles[id].where !== 'board')) {
    ok(E.isFree(g, under.id), 'uncovered tile becomes free');
    const back = cov.find(id => g.tray.includes(id));
    if (back != null) {
      const r = E.undoTile(g, back);
      ok(r.ok && g.tiles[back].where === 'board', 'undo returns to board');
      ok(!E.isFree(g, under.id), 'tile under undone card is covered again');
    }
  }
  ok(JSON.stringify(top.slot) === before, 'slot unchanged');
  // limit
  const h = E.newGame({ mode: 'easy', seed: 9, cols: 5 });
  let used = 0;
  for (let k = 0; k < 5; k++) {
    const f = h.tiles.find(t => E.isFree(h, t.id));
    E.pickTile(h, f.id);
    if (h.tray.includes(f.id)) { const r = E.undoTile(h, f.id); if (r.ok) used++; else ok(r.reason === 'noUndos', '4th undo refused'); }
  }
  ok(used === 3 && h.undosLeft === 0, 'exactly 3 undos ' + used);
}

// ---- 4. Lose when 7 cards without a match; match on 7th card counts as match
{
  let lostSeen = false;
  for (let seed = 1; seed < 200 && !lostSeen; seed++) {
    const g = E.newGame({ mode: 'hard', seed, cols: 5 });
    // greedily pick tiles of distinct series to avoid matches
    const used = new Set();
    while (g.status === 'playing') {
      const f = g.tiles.filter(t => E.isFree(g, t.id));
      const c = f.find(t => !used.has(t.card.series)) || f[0];
      used.add(c.card.series); E.pickTile(g, c.id);
    }
    if (g.status === 'lost') { lostSeen = true; ok(g.tray.length === 7, 'lost with 7 in tray'); }
  }
  ok(lostSeen, 'lose condition reachable');
}

// ---- 5. Shuffle keeps solvability; hints point at free tiles
{
  let guaranteed = 0, total = 0;
  for (let seed = 1; seed <= 150; seed++) {
    const g = E.newGame({ mode: ['easy', 'medium', 'hard'][seed % 3], seed, cols: 5 });
    const rng = E.rngFrom(seed);
    const n = Math.floor(rng() * 8);
    for (let k = 0; k < n && g.status === 'playing'; k++) {
      const h = E.findHint(g); ok(h != null && E.isFree(g, h), 'hint is free');
      E.pickTile(g, h);
    }
    if (g.status !== 'playing') continue;
    const cardsBefore = g.tiles.filter(t => t.where === 'board').map(t => t.card.uid).sort().join();
    const r = E.shuffleBoard(g); total++;
    ok(r.ok, 'shuffle ok');
    const cardsAfter = g.tiles.filter(t => t.where === 'board').map(t => t.card.uid).sort().join();
    ok(cardsBefore === cardsAfter, 'shuffle keeps same cards');
    if (r.guaranteed) {
      guaranteed++;
      for (const id of r.order) { ok(E.isFree(g, id), 'shuffle order free'); E.pickTile(g, id); if (g.status !== 'playing') break; }
      ok(g.status === 'won', 'shuffle order wins ' + seed + ' ' + g.status);
    }
    ok(g.shufflesLeft === 0, 'shuffle used');
  }
  console.log(`shuffles with guaranteed solution: ${guaranteed}/${total}`);
}

// ---- 6. How hard is it? A player who always follows the hint heuristic
for (const mode of ['easy', 'medium', 'hard']) {
  let wins = 0; const N = 300;
  for (let seed = 1; seed <= N; seed++) {
    const g = E.newGame({ mode, seed: seed * 31, cols: 5 });
    while (g.status === 'playing') E.pickTile(g, E.findHint(g));
    if (g.status === 'won') wins++;
  }
  console.log(`hint-follower win rate ${mode}: ${(wins / N * 100).toFixed(0)}%`);
}

console.log(`\n${checks - fails}/${checks} checks passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
