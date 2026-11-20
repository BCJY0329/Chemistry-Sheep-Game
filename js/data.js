/* =====================================================================
   CHEMISTRY SHEEP – CONTENT DATA (SK025 Chapter 4)
   ---------------------------------------------------------------------
   Notation:  _{...} = subscript   e.g. C_{n}H_{2n+1}OH  ->  CₙH₂ₙ₊₁OH
              _3     = single-character subscript
   LOCKED CORRECTIONS – DO NOT REVERT:
     • Alcohol general formula         C_{n}H_{2n+1}OH
     • Carboxylic acid general formula C_{n}H_{2n+1}COOH
     • Ketone functional group         R–C(=O)–R
     • Aldehyde general formula        C_{n}H_{2n+1}CHO
     • Ketone general formula          C_{n}H_{2n+1}COC_{m}H_{2m+1}
   `extra: true` marks the 3 series added to reach 14 (awaiting approval).
   Each series needs at least 2 examples (used for repeated sets).
   ===================================================================== */
(function (root) {
  'use strict';

  var CARD_TYPES = [
    { id: 'fg',   label: 'Functional group', short: 'FG' },
    { id: 'gf',   label: 'General formula',  short: 'GF' },
    { id: 'ex',   label: 'Example',          short: 'EX' },
    { id: 'name', label: 'Name',             short: 'NAME' }
  ];

  var SERIES = [
    { id: 'alkane',     name: 'Alkane',          fg: 'C–C',        gf: 'C_{n}H_{2n+2}',
      ex: [['CH_3CH_3', 'ethane'], ['CH_3CH_2CH_3', 'propane']] },
    { id: 'alkene',     name: 'Alkene',          fg: 'C=C',        gf: 'C_{n}H_{2n}',
      ex: [['CH_2=CH_2', 'ethene'], ['CH_3CH=CH_2', 'propene']] },
    { id: 'alkyne',     name: 'Alkyne',          fg: 'C≡C',        gf: 'C_{n}H_{2n−2}',
      ex: [['HC≡CH', 'ethyne'], ['CH_3C≡CH', 'propyne']] },
    { id: 'haloalkane', name: 'Haloalkane',      fg: 'C–X',        gf: 'C_{n}H_{2n+1}X',
      ex: [['CH_3CH_2Cl', 'chloroethane'], ['CH_3CH_2Br', 'bromoethane']] },
    { id: 'alcohol',    name: 'Alcohol',         fg: '–OH',        gf: 'C_{n}H_{2n+1}OH',
      ex: [['CH_3CH_2OH', 'ethanol'], ['CH_3OH', 'methanol']] },
    { id: 'aldehyde',   name: 'Aldehyde',        fg: '–CHO',       gf: 'C_{n}H_{2n+1}CHO',
      ex: [['CH_3CHO', 'ethanal'], ['HCHO', 'methanal']] },
    { id: 'ketone',     name: 'Ketone',          fg: 'R–C(=O)–R',  gf: 'C_{n}H_{2n+1}COC_{m}H_{2m+1}',
      ex: [['CH_3COCH_3', 'propanone'], ['CH_3COCH_2CH_3', 'butanone']] },
    { id: 'carboxylic', name: 'Carboxylic acid', fg: '–COOH',      gf: 'C_{n}H_{2n+1}COOH',
      ex: [['CH_3COOH', 'ethanoic acid'], ['HCOOH', 'methanoic acid']] },
    { id: 'ester',      name: 'Ester',           fg: '–COO–',      gf: 'C_{n}H_{2n}O_2',
      ex: [['CH_3COOCH_2CH_3', 'ethyl ethanoate'], ['HCOOCH_3', 'methyl methanoate']] },
    { id: 'amine',      name: 'Primary amine',   fg: '–NH_2',      gf: 'C_{n}H_{2n+3}N',
      ex: [['CH_3CH_2NH_2', 'ethylamine'], ['CH_3NH_2', 'methylamine']] },
    { id: 'amide',      name: 'Primary amide',   fg: '–CONH_2',    gf: 'C_{n}H_{2n+1}NO',
      ex: [['CH_3CONH_2', 'ethanamide'], ['HCONH_2', 'methanamide']] },

    /* ---- 3 extra series (placeholders – confirm against SK025 syllabus) ---- */
    { id: 'ether',      name: 'Ether',           fg: 'R–O–R',      gf: 'C_{n}H_{2n+2}O', extra: true,
      ex: [['CH_3OCH_3', 'methoxymethane'], ['CH_3OCH_2CH_3', 'methoxyethane']] },
    { id: 'nitrile',    name: 'Nitrile',         fg: '–C≡N',       gf: 'C_{n}H_{2n+1}CN', extra: true,
      ex: [['CH_3CN', 'ethanenitrile'], ['CH_3CH_2CN', 'propanenitrile']] },
    { id: 'acylchloride', name: 'Acyl chloride', fg: '–COCl',      gf: 'C_{n}H_{2n+1}COCl', extra: true,
      ex: [['CH_3COCl', 'ethanoyl chloride'], ['CH_3CH_2COCl', 'propanoyl chloride']] }
  ];

  /* Convert notation to HTML with <sub>. */
  function fmt(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/_\{([^}]*)\}/g, '<sub>$1</sub>')
      .replace(/_([0-9A-Za-z])/g, '<sub>$1</sub>');
  }
  /* Approximate visual length (subscripts count ~0.6). */
  function visualLength(s) {
    var subs = 0, main = 0;
    String(s).replace(/_\{([^}]*)\}/g, function (m, g) { subs += g.length; return ''; })
      .replace(/_([0-9A-Za-z])/g, function () { subs += 1; return ''; })
      .split('').forEach(function () { main += 1; });
    return main + subs * 0.62;
  }

  var api = { CARD_TYPES: CARD_TYPES, SERIES: SERIES, fmt: fmt, visualLength: visualLength };
  root.CHEM_DATA = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
