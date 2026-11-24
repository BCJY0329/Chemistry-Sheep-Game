/* =====================================================================
   ORGO-GO! – QUESTIONS ("?" blocks) and BOSS molecules
   Multiple-choice questions for SK025 Chapter 4 are made from the checked
   compound list in js/chem.js plus a few fixed concept questions.
   Exposes window.ChemQuiz.
   ===================================================================== */
(function (root) {
  'use strict';
  var D = root.CHEM_DATA, X = root.CHEM_EXTRA;
  var SERIES = {}; D.SERIES.forEach(function (s) { SERIES[s.id] = s; });
  var C = X.compounds;
  // series that students often mix up – used as tempting wrong answers
  var LOOKALIKE = { aldehyde: ['ketone', 'carboxylic'], ketone: ['aldehyde', 'ester'], alcohol: ['ether', 'carboxylic'], ether: ['alcohol', 'ester'],
    carboxylic: ['ester', 'aldehyde'], ester: ['carboxylic', 'ether'], amine: ['amide', 'nitrile'], amide: ['amine', 'acylchloride'],
    alkene: ['alkyne', 'alkane'], alkyne: ['alkene', 'nitrile'], alkane: ['alkene', 'haloalkane'], haloalkane: ['acylchloride', 'alkane'],
    acylchloride: ['haloalkane', 'carboxylic'], nitrile: ['amine', 'alkyne'] };
  var SUFFIX = { alcohol: '-ol', aldehyde: '-al', ketone: '-one', carboxylic: '-oic acid', nitrile: '-nitrile', amide: '-amide',
    acylchloride: '-oyl chloride', alkene: '-ene', alkyne: '-yne', alkane: '-ane' };

  function rnd(rng, n) { return Math.floor(rng() * n); }
  function shuffle(a, rng) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd(rng, i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function carbons(c) { var m = c.formula.match(/^C(\d*)/); return m ? (m[1] ? +m[1] : 1) : 0; }
  function uniq(list) { var o = []; list.forEach(function (x) { if (o.indexOf(x) < 0) o.push(x); }); return o; }

  /* Build a question with its options shuffled. options[0] passed in is the right answer. */
  function make(q, right, wrong, rng, extra) {
    var opts = uniq([right].concat(wrong.filter(function (w) { return w !== right; }))).slice(0, 4);
    var sh = shuffle(opts, rng);
    var out = { q: q, options: sh, answer: sh.indexOf(right) };
    Object.keys(extra || {}).forEach(function (k) { out[k] = extra[k]; });
    return out;
  }
  function otherNames(c, rng) {
    // same series first, then same number of carbons
    var same = shuffle(C.filter(function (o) { return o !== c && o.series === c.series; }), rng);
    var near = shuffle(C.filter(function (o) { return o !== c && o.series !== c.series && Math.abs(carbons(o) - carbons(c)) <= 1; }), rng);
    return same.concat(near).map(function (o) { return o.name; });
  }
  function otherSeries(sid, rng) {
    var la = LOOKALIKE[sid] || [], rest = shuffle(Object.keys(SERIES).filter(function (k) { return k !== sid && la.indexOf(k) < 0; }), rng);
    return la.concat(rest).map(function (k) { return SERIES[k].name; });
  }

  var TEMPLATES = [
    // IUPAC name from condensed formula
    function (rng) { var c = C[rnd(rng, C.length)]; return make('What is the IUPAC name of this compound?', c.name, otherNames(c, rng), rng, { cond: c.cond }); },
    // IUPAC name from skeletal structure
    function (rng) { var c = C[rnd(rng, C.length)]; return make('Name this compound from its skeletal structure.', c.name, otherNames(c, rng), rng, { mol: c.mol, molNote: 'Skeletal structure' }); },
    // IUPAC name from expanded structure (small molecules)
    function (rng) {
      var list = C.filter(function (c) { return c.exp; }), c = list[rnd(rng, list.length)];
      return make('Name this compound from its expanded structure.', c.name, otherNames(c, rng), rng, { mol: c.exp, expanded: true, molNote: 'Expanded structure' });
    },
    // homologous series from skeletal or condensed structure
    function (rng) {
      var c = C[rnd(rng, C.length)], skel = rng() < 0.6;
      return make('Which homologous series does this compound belong to?', SERIES[c.series].name, otherSeries(c.series, rng), rng,
        skel ? { mol: c.mol, molNote: 'Skeletal structure' } : { cond: c.cond });
    },
    // condensed formula from name
    function (rng) {
      var c = C[rnd(rng, C.length)];
      var wrong = shuffle(C.filter(function (o) { return o !== c && (o.series === c.series || o.formula === c.formula); }), rng).map(function (o) { return o.cond; });
      return make('Which is the condensed structural formula of ' + c.name + '?', c.cond, wrong, rng, { fmtOptions: true });
    },
    // isomers
    function (rng) {
      var withIso = C.filter(function (c) { return C.some(function (o) { return o !== c && o.formula === c.formula; }); });
      var c = withIso[rnd(rng, withIso.length)];
      var iso = shuffle(C.filter(function (o) { return o !== c && o.formula === c.formula; }), rng)[0];
      var wrong = shuffle(C.filter(function (o) { return o.formula !== c.formula && Math.abs(carbons(o) - carbons(c)) <= 1; }), rng).map(function (o) { return o.name; });
      return make('Which compound is an isomer of ' + c.name + ' (same molecular formula, different structure)?', iso.name, wrong, rng);
    },
    // primary / secondary / tertiary alcohols and amines
    function (rng) {
      var list = C.filter(function (c) { return c.cls; }), c = list[rnd(rng, list.length)];
      var kind = c.series === 'alcohol' ? 'alcohol' : 'amine';
      return make('Is ' + c.name + ' a primary, secondary or tertiary ' + kind + '?', c.cls.charAt(0).toUpperCase() + c.cls.slice(1),
        ['Primary', 'Secondary', 'Tertiary'], rng, { cond: c.cond, keepOrder: true });
    },
    // general formula
    function (rng) {
      var ids = Object.keys(SERIES), sid = ids[rnd(rng, ids.length)];
      // alcohols and ethers share CnH2n+2O, so never offer one as a wrong answer for the other
      var clash = { alcohol: 'ether', ether: 'alcohol' };
      var wrong = shuffle(ids.filter(function (k) { return k !== sid && k !== clash[sid] && SERIES[k].gf !== SERIES[sid].gf; }), rng).map(function (k) { return SERIES[k].gf; });
      return make('Which is the general formula of ' + SERIES[sid].name.toLowerCase() + 's?', SERIES[sid].gf, wrong, rng, { fmtOptions: true });
    },
    // functional group
    function (rng) {
      var ids = Object.keys(SERIES).filter(function (k) { return k !== 'alkane'; }), sid = ids[rnd(rng, ids.length)];
      var wrong = (LOOKALIKE[sid] || []).concat(shuffle(ids, rng)).filter(function (k) { return k !== sid && k !== 'alkane'; }).map(function (k) { return SERIES[k].fg; });
      return make('Which functional group is found in ' + SERIES[sid].name.toLowerCase() + 's?', SERIES[sid].fg, wrong, rng, { fmtOptions: true });
    },
    // name suffix
    function (rng) {
      var ids = Object.keys(SUFFIX), sid = ids[rnd(rng, ids.length)];
      var wrong = shuffle(ids.filter(function (k) { return k !== sid; }), rng).map(function (k) { return SUFFIX[k]; });
      return make('Which ending is used in the IUPAC names of ' + SERIES[sid].name.toLowerCase() + 's?', SUFFIX[sid], wrong, rng);
    },
    // which compound belongs to a series
    function (rng) {
      var ids = Object.keys(SERIES), sid = ids[rnd(rng, ids.length)];
      var right = shuffle(C.filter(function (c) { return c.series === sid; }), rng)[0];
      var wrong = shuffle(C.filter(function (c) { return (LOOKALIKE[sid] || []).indexOf(c.series) >= 0; }), rng)
        .concat(shuffle(C.filter(function (c) { return c.series !== sid; }), rng)).map(function (c) { return c.cond; });
      return make('Which of these is ' + (/^[aeiou]/i.test(SERIES[sid].name) ? 'an ' : 'a ') + SERIES[sid].name.toLowerCase() + '?', right.cond, wrong, rng, { fmtOptions: true });
    }
  ];
  var FACTS = [
    ['Members of the same homologous series differ from the next member by:', 'CH_2', ['CH_3', 'CH', 'C_2H_4']],
    ['Members of the same homologous series have the same:', 'general formula and functional group', ['molecular formula', 'boiling point', 'molar mass']],
    ['Going up a homologous series (longer carbon chain), the boiling point generally:', 'increases', ['decreases', 'stays the same', 'drops to zero']],
    ['Members of the same homologous series have similar:', 'chemical properties', ['boiling points', 'molar masses', 'molecular formulae']],
    ['The –OH group is called the:', 'hydroxyl group', ['carbonyl group', 'carboxyl group', 'amino group']],
    ['The C=O group in aldehydes and ketones is called the:', 'carbonyl group', ['carboxyl group', 'hydroxyl group', 'ester group']],
    ['The –COOH group is called the:', 'carboxyl group', ['carbonyl group', 'hydroxyl group', 'ester group']],
    ['The –NH_2 group in amines is called the:', 'amino group', ['amide group', 'nitrile group', 'hydroxyl group']],
    ['In a skeletal structure, every corner and line end stands for:', 'a carbon atom', ['a hydrogen atom', 'an oxygen atom', 'a double bond']],
    ['Which type of formula shows every atom and every bond?', 'Expanded structural formula', ['Condensed structural formula', 'Skeletal structure', 'Molecular formula']],
    ['Which type of formula only shows the number of each atom, e.g. C_4H_{10}?', 'Molecular formula', ['Skeletal structure', 'Expanded structural formula', 'Condensed structural formula']],
    ['Compounds with the same molecular formula but different structures are called:', 'isomers', ['homologues', 'isotopes', 'allotropes']],
    ['Alkanes are described as saturated because they:', 'have only C–C single bonds', ['contain a C=C bond', 'dissolve fully in water', 'contain oxygen']],
    ['Which homologous series is unsaturated?', 'Alkene', ['Alkane', 'Alcohol', 'Haloalkane']]
  ];
  function factQuestion(rng) {
    var f = FACTS[rnd(rng, FACTS.length)];
    return make(f[0], f[1], f[2], rng, { fmtOptions: true });
  }

  /* A random question. `avoid` = list of recent question texts to skip. */
  function question(rng, avoid) {
    avoid = avoid || [];
    for (var tries = 0; tries < 12; tries++) {
      var q = rng() < 0.18 ? factQuestion(rng) : TEMPLATES[rnd(rng, TEMPLATES.length)](rng);
      if (q.keepOrder) { var right = q.options[q.answer]; q.options = ['Primary', 'Secondary', 'Tertiary']; q.answer = q.options.indexOf(right); }
      var key = q.q + '|' + q.options[q.answer];
      if (q.options.length >= 3 && avoid.indexOf(key) < 0) { q.key = key; return q; }
    }
    q.key = q.q + '|' + q.options[q.answer];
    return q;
  }

  /* ---------- Boss ---------- */
  var BOSS_GROUPS = ['alkene', 'alkyne', 'alcohol', 'ether', 'aldehyde', 'ketone', 'carboxylic', 'ester', 'acylchloride', 'haloalkane', 'amine', 'amide', 'nitrile'];
  function boss(tier, rng, recent) {
    recent = recent || [];
    var pool = X.boss.filter(function (b) { return b.tier === tier; });
    var fresh = pool.filter(function (b) { return recent.indexOf(b.name) < 0; });
    var list = fresh.length ? fresh : pool;
    return list[rnd(rng, list.length)];
  }

  root.ChemQuiz = { question: question, boss: boss, BOSS_GROUPS: BOSS_GROUPS, SERIES: SERIES };
})(window);
