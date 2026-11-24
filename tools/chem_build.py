"""Builds js/chem.js: boss molecules + question compounds, all checked with RDKit."""
import json, sys
from rdkit import Chem
from rdkit.Chem import rdDepictor, rdMolDescriptors
rdDepictor.SetPreferCoordGen(True)

SMARTS = {
 'alkene': '[C;!a]=[C;!a]', 'alkyne': 'C#C',
 'alcohol': '[OX2H][#6;!$(C=O)]', 'carboxylic': '[CX3](=O)[OX2H1]',
 'ester': '[#6,#1;!$([#6]=O)]~[CX3](=O)[OX2H0][#6]', 'haloalkane': '[#6;!$(C=O)][F,Cl,Br,I]',
 'aldehyde': '[CX3;H1,H2;!$(C[O,N,Cl,Br,F;!$(*=*)])]=O', 'ketone': '[#6][CX3](=O)[#6]',
 'ether': '[OD2;!$(O[#6]=O)]([#6])[#6]', 'acylchloride': '[CX3](=O)Cl',
 'amide': '[CX3](=O)[NX3]', 'amine': '[NX3;!$(N[#6]=O);!$(N#*)]', 'nitrile': 'C#N'}
PAT = {k: Chem.MolFromSmarts(v) for k, v in SMARTS.items()}
ORDER = ['alkene','alkyne','alcohol','carboxylic','ester','haloalkane','aldehyde','ketone','ether','acylchloride','amide','amine','nitrile']

def groups(m):
    mh = Chem.AddHs(m)
    g = [k for k in ORDER if mh.HasSubstructMatch(PAT[k])]
    # formate esters: H-C(=O)-O-C
    if 'ester' not in g and m.HasSubstructMatch(Chem.MolFromSmarts('[CX3H1](=O)[OX2][#6]')): g.append('ester')
    return g

def coords(m, explicitH=False):
    m = Chem.Mol(m)
    if explicitH: m = Chem.AddHs(m)
    rdDepictor.Compute2DCoords(m)
    c = m.GetConformer()
    pts = [c.GetAtomPosition(i) for i in range(m.GetNumAtoms())]
    bl = sum(((pts[b.GetBeginAtomIdx()].x-pts[b.GetEndAtomIdx()].x)**2+(pts[b.GetBeginAtomIdx()].y-pts[b.GetEndAtomIdx()].y)**2)**.5 for b in m.GetBonds())/max(1,m.GetNumBonds())
    minx = min(p.x for p in pts); maxy = max(p.y for p in pts)
    atoms = []
    for a, p in zip(m.GetAtoms(), pts):
        atoms.append([round((p.x-minx)/bl, 2), round((maxy-p.y)/bl, 2), a.GetSymbol(), a.GetTotalNumHs() if not explicitH else 0])
    bonds = []
    ri = m.GetRingInfo()
    for b in m.GetBonds():
        o = {Chem.BondType.SINGLE:1, Chem.BondType.DOUBLE:2, Chem.BondType.TRIPLE:3}.get(b.GetBondType(), 1)
        # ring centre side for ring double bonds
        side = None
        if o == 2 and b.IsInRing():
            for ring in ri.BondRings():
                if b.GetIdx() in ring:
                    ats = set()
                    for bi in ring: bb = m.GetBondWithIdx(bi); ats.update([bb.GetBeginAtomIdx(), bb.GetEndAtomIdx()])
                    cx = sum(atoms[i][0] for i in ats)/len(ats); cy = sum(atoms[i][1] for i in ats)/len(ats)
                    side = [round(cx,2), round(cy,2)]; break
        bonds.append([b.GetBeginAtomIdx(), b.GetEndAtomIdx(), o] + ([side] if side else []))
    return {'a': atoms, 'b': bonds}

def check(smi, formula=None, want=None, label=''):
    m = Chem.MolFromSmiles(smi)
    assert m is not None, (label, smi)
    f = rdMolDescriptors.CalcMolFormula(m)
    if formula: assert f == formula, (label, f, formula)
    g = groups(m)
    if want is not None: assert sorted(g) == sorted(want), (label, g, want)
    return m, f, g

# ---------------- Boss molecules (real compounds) ----------------
BOSS = [
 # name, smiles, formula, groups, tier
 ('Vitamin C (ascorbic acid)', 'OC[C@H](O)[C@H]1OC(=O)C(O)=C1O', 'C6H8O6', ['alcohol','ester','alkene'], 'medium'),
 ('Serine (an amino acid)', 'OC[C@H](N)C(=O)O', 'C3H7NO3', ['alcohol','amine','carboxylic'], 'medium'),
 ('Asparagine (an amino acid)', 'NC(=O)C[C@H](N)C(=O)O', 'C4H8N2O3', ['amide','amine','carboxylic'], 'medium'),
 ('Vigabatrin (epilepsy medicine)', 'C=CC(N)CCC(=O)O', 'C6H11NO2', ['alkene','amine','carboxylic'], 'medium'),
 ('Testosterone (a hormone)', 'C[C@]12CC[C@H]3[C@@H](CCC4=CC(=O)CC[C@]34C)[C@@H]1CC[C@@H]2O', 'C19H28O2', ['ketone','alkene','alcohol'], 'medium'),
 ('Prednisolone (anti-inflammatory)', 'C[C@]12C[C@H](O)[C@H]3[C@@H](CCC4=CC(=O)C=C[C@]34C)[C@@H]1CC[C@]2(O)C(=O)CO', 'C21H28O5', ['ketone','alkene','alcohol'], 'medium'),
 ('Methyl jasmonate (jasmine scent)', 'CC/C=C\\C[C@@H]1[C@H](CCC1=O)CC(=O)OC', 'C13H20O3', ['ketone','alkene','ester'], 'medium'),
 ('Pantothenic acid (vitamin B5)', 'CC(C)(CO)[C@@H](O)C(=O)NCCC(=O)O', 'C9H17NO5', ['alcohol','amide','carboxylic'], 'medium'),
 ('Methyl 2-cyanoacrylate (superglue)', 'C=C(C#N)C(=O)OC', 'C5H5NO2', ['alkene','nitrile','ester'], 'medium'),
 ('Kainic acid (from seaweed)', 'CC(=C)[C@H]1CN[C@@H]([C@H]1CC(=O)O)C(=O)O', 'C10H15NO4', ['alkene','amine','carboxylic'], 'medium'),
 ('Oseltamivir (Tamiflu, flu medicine)', 'CCOC(=O)C1=C[C@@H](OC(CC)CC)[C@H](NC(C)=O)[C@@H](N)C1', 'C16H28N2O4', ['ester','alkene','ether','amide','amine'], 'hard'),
 ('Clavulanic acid (antibiotic helper)', 'OC/C=C1/O[C@@H]2CC(=O)N2[C@H]1C(=O)O', 'C8H9NO5', ['alcohol','alkene','ether','amide','carboxylic'], 'hard'),
 ('Triamcinolone acetonide (steroid cream)', 'CC1(C)O[C@@H]2C[C@H]3[C@@H]4CCC5=CC(=O)C=C[C@]5(C)[C@@]4(F)[C@@H](O)C[C@]3(C)[C@@]2(O1)C(=O)CO', 'C24H31FO6', ['ketone','alkene','haloalkane','alcohol','ether'], 'hard'),
 ('Betamethasone valerate (steroid cream)', 'CCCCC(=O)O[C@]1([C@@H](C)C[C@H]2[C@@H]3CCC4=CC(=O)C=C[C@]4(C)[C@@]3(F)[C@@H](O)C[C@@]21C)C(=O)CO', 'C27H37FO6', ['ketone','alkene','haloalkane','alcohol','ester'], 'hard'),
 ('Clobetasol propionate (steroid cream)', 'CCC(=O)O[C@]1([C@@H](C)C[C@H]2[C@@H]3CCC4=CC(=O)C=C[C@]4(C)[C@@]3(F)[C@@H](O)C[C@@]21C)C(=O)CCl', 'C25H32ClFO5', ['ketone','alkene','haloalkane','alcohol','ester'], 'hard'),
 ('Beclomethasone dipropionate (asthma inhaler)', 'CCC(=O)OCC(=O)[C@@]1(OC(=O)CC)[C@@H](C)C[C@H]2[C@@H]3CCC4=CC(=O)C=C[C@]4(C)[C@@]3(Cl)[C@@H](O)C[C@@]21C', 'C28H37ClO7', ['ketone','alkene','haloalkane','alcohol','ester'], 'hard'),
 ('Fluocinolone acetonide (steroid cream)', 'CC1(C)O[C@@H]2C[C@H]3[C@@H]4C[C@H](F)C5=CC(=O)C=C[C@]5(C)[C@@]4(F)[C@@H](O)C[C@]3(C)[C@@]2(O1)C(=O)CO', 'C24H30F2O6', ['ketone','alkene','haloalkane','alcohol','ether'], 'hard'),
]
boss_out = []
for name, smi, f, want, tier in BOSS:
    m, _, g = check(smi, f, want, name)
    boss_out.append({'name': name, 'formula': f, 'groups': [x for x in ORDER if x in g], 'tier': tier, 'mol': coords(m)})

# ---------------- Question compounds (IUPAC names as used in SK025) ----------------
# name, smiles, condensed (notation as data.js: _ for subscript), series, alcohol class
COMP = [
 ('butane','CCCC','CH_3CH_2CH_2CH_3','alkane'), ('2-methylpropane','CC(C)C','CH_3CH(CH_3)CH_3','alkane'),
 ('2-methylbutane','CCC(C)C','CH_3CH(CH_3)CH_2CH_3','alkane'), ('2,2-dimethylpropane','CC(C)(C)C','C(CH_3)_4','alkane'),
 ('3-methylpentane','CCC(C)CC','CH_3CH_2CH(CH_3)CH_2CH_3','alkane'), ('2,3-dimethylbutane','CC(C)C(C)C','CH_3CH(CH_3)CH(CH_3)CH_3','alkane'),
 ('but-1-ene','C=CCC','CH_2=CHCH_2CH_3','alkene'), ('but-2-ene','CC=CC','CH_3CH=CHCH_3','alkene'),
 ('2-methylpropene','C=C(C)C','CH_2=C(CH_3)_2','alkene'), ('pent-2-ene','CCC=CC','CH_3CH=CHCH_2CH_3','alkene'),
 ('2-methylbut-2-ene','CC=C(C)C','(CH_3)_2C=CHCH_3','alkene'),
 ('but-1-yne','C#CCC','HC≡CCH_2CH_3','alkyne'), ('but-2-yne','CC#CC','CH_3C≡CCH_3','alkyne'),
 ('3-methylbut-1-yne','C#CC(C)C','HC≡CCH(CH_3)_2','alkyne'), ('pent-2-yne','CC#CCC','CH_3C≡CCH_2CH_3','alkyne'),
 ('propan-1-ol','CCCO','CH_3CH_2CH_2OH','alcohol','primary'), ('propan-2-ol','CC(C)O','CH_3CH(OH)CH_3','alcohol','secondary'),
 ('butan-1-ol','CCCCO','CH_3CH_2CH_2CH_2OH','alcohol','primary'), ('butan-2-ol','CCC(C)O','CH_3CH(OH)CH_2CH_3','alcohol','secondary'),
 ('2-methylpropan-1-ol','CC(C)CO','(CH_3)_2CHCH_2OH','alcohol','primary'), ('2-methylpropan-2-ol','CC(C)(C)O','(CH_3)_3COH','alcohol','tertiary'),
 ('pentan-3-ol','CCC(O)CC','CH_3CH_2CH(OH)CH_2CH_3','alcohol','secondary'), ('2-methylbutan-2-ol','CCC(C)(C)O','CH_3CH_2C(OH)(CH_3)_2','alcohol','tertiary'),
 ('1-chloropropane','CCCCl','CH_3CH_2CH_2Cl','haloalkane'), ('2-chloropropane','CC(C)Cl','CH_3CHClCH_3','haloalkane'),
 ('1-bromobutane','CCCCBr','CH_3CH_2CH_2CH_2Br','haloalkane'), ('2-bromo-2-methylpropane','CC(C)(C)Br','(CH_3)_3CBr','haloalkane'),
 ('1,2-dichloroethane','ClCCCl','ClCH_2CH_2Cl','haloalkane'), ('2-chlorobutane','CCC(C)Cl','CH_3CHClCH_2CH_3','haloalkane'),
 ('propanal','CCC=O','CH_3CH_2CHO','aldehyde'), ('butanal','CCCC=O','CH_3CH_2CH_2CHO','aldehyde'),
 ('2-methylpropanal','CC(C)C=O','(CH_3)_2CHCHO','aldehyde'), ('pentanal','CCCCC=O','CH_3(CH_2)_3CHO','aldehyde'),
 ('butanone','CCC(C)=O','CH_3COCH_2CH_3','ketone'), ('pentan-2-one','CCCC(C)=O','CH_3COCH_2CH_2CH_3','ketone'),
 ('pentan-3-one','CCC(=O)CC','CH_3CH_2COCH_2CH_3','ketone'), ('3-methylbutan-2-one','CC(C)C(C)=O','CH_3COCH(CH_3)_2','ketone'),
 ('propanoic acid','CCC(=O)O','CH_3CH_2COOH','carboxylic'), ('butanoic acid','CCCC(=O)O','CH_3CH_2CH_2COOH','carboxylic'),
 ('2-methylpropanoic acid','CC(C)C(=O)O','(CH_3)_2CHCOOH','carboxylic'), ('methanoic acid','OC=O','HCOOH','carboxylic'),
 ('methyl ethanoate','COC(C)=O','CH_3COOCH_3','ester'), ('ethyl ethanoate','CCOC(C)=O','CH_3COOCH_2CH_3','ester'),
 ('methyl propanoate','CCC(=O)OC','CH_3CH_2COOCH_3','ester'), ('propyl methanoate','CCCOC=O','HCOOCH_2CH_2CH_3','ester'),
 ('ethyl propanoate','CCOC(=O)CC','CH_3CH_2COOCH_2CH_3','ester'),
 ('methoxyethane','CCOC','CH_3OCH_2CH_3','ether'), ('ethoxyethane','CCOCC','CH_3CH_2OCH_2CH_3','ether'),
 ('methoxypropane','CCCOC','CH_3OCH_2CH_2CH_3','ether'), ('2-methoxypropane','COC(C)C','CH_3OCH(CH_3)_2','ether'),
 ('propanoyl chloride','CCC(=O)Cl','CH_3CH_2COCl','acylchloride'), ('butanoyl chloride','CCCC(=O)Cl','CH_3CH_2CH_2COCl','acylchloride'),
 ('ethanoyl chloride','CC(=O)Cl','CH_3COCl','acylchloride'),
 ('propanamide','CCC(N)=O','CH_3CH_2CONH_2','amide'), ('butanamide','CCCC(N)=O','CH_3CH_2CH_2CONH_2','amide'),
 ('N-methylethanamide','CNC(C)=O','CH_3CONHCH_3','amide'),
 ('propylamine','CCCN','CH_3CH_2CH_2NH_2','amine'), ('dimethylamine','CNC','(CH_3)_2NH','amine'), ('trimethylamine','CN(C)C','(CH_3)_3N','amine'),
 ('ethylmethylamine','CCNC','CH_3CH_2NHCH_3','amine'),
 ('butanenitrile','CCCC#N','CH_3CH_2CH_2CN','nitrile'), ('2-methylpropanenitrile','CC(C)C#N','(CH_3)_2CHCN','nitrile'),
 ('pentanenitrile','CCCCC#N','CH_3(CH_2)_3CN','nitrile'),
]
SERIES_GROUP = {'alkane': [], 'alkene':['alkene'],'alkyne':['alkyne'],'alcohol':['alcohol'],'haloalkane':['haloalkane'],'aldehyde':['aldehyde'],
 'ketone':['ketone'],'carboxylic':['carboxylic'],'ester':['ester'],'ether':['ether'],'acylchloride':['acylchloride'],'amide':['amide'],'amine':['amine'],'nitrile':['nitrile']}
comp_out = []
for row in COMP:
    name, smi, cond, series = row[:4]
    m, f, g = check(smi, None, SERIES_GROUP[series], name)
    # condensed text must have the same molecular formula
    ct = cond.replace('_', '')
    d = {'name': name, 'cond': cond, 'series': series, 'formula': f, 'mol': coords(m)}
    if len(row) > 4: d['cls'] = row[4]
    if m.GetNumAtoms() <= 5: d['exp'] = coords(m, True)
    # amine class
    if series == 'amine':
        n = [a for a in m.GetAtoms() if a.GetSymbol() == 'N'][0]
        d['cls'] = {1:'primary',2:'secondary',3:'tertiary'}[n.GetDegree()]
    comp_out.append(d)

# verify condensed formula atom counts with a tiny parser
import re
def count(cond):
    s = cond.replace('≡','').replace('=','')
    def parse(s, i=0):
        tot = {}
        while i < len(s):
            ch = s[i]
            if ch == '(':
                sub, i = parse(s, i+1); mult = 1
                mm = re.match(r'_(\d+)', s[i:])
                if mm: mult = int(mm.group(1)); i += len(mm.group(0))
                for k,v in sub.items(): tot[k] = tot.get(k,0)+v*mult
                continue
            if ch == ')': return tot, i+1
            mm = re.match(r'(Cl|Br|[A-Z])(_\d+|\d*)', s[i:])
            el = mm.group(1); n = mm.group(2).replace('_','')
            tot[el] = tot.get(el,0)+(int(n) if n else 1); i += len(mm.group(0))
        return tot, i
    return parse(s)[0]
for d in comp_out:
    c = count(d['cond'])
    m = Chem.AddHs(Chem.MolFromSmiles([r for r in COMP if r[0]==d['name']][0][1]))
    real = {}
    for a in m.GetAtoms(): real[a.GetSymbol()] = real.get(a.GetSymbol(),0)+1
    assert c == real, (d['name'], d['cond'], c, real)

open(sys.argv[1], 'w').write('/* Generated by tools/chem_build.py – every structure, formula and functional group checked with RDKit. */\n'
  '(function (root) {\n  root.CHEM_EXTRA = ' + json.dumps({'boss': boss_out, 'compounds': comp_out}, ensure_ascii=False, separators=(',',':')) + ';\n})(typeof window !== "undefined" ? window : globalThis);\n')
print('boss', len(boss_out), 'compounds', len(comp_out))
for b in boss_out: print(' ', b['tier'], b['name'], b['formula'], b['groups'])
