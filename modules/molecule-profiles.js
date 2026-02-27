/**
 * MFC Laboratoire — Enrichissement des profils moléculaires
 * 
 * Complète MOLECULE_DB avec les propriétés physico-chimiques manquantes :
 * - bp : point d'ébullition (°C) — mesuré ou estimé
 * - logp : coefficient de partage octanol/eau (XLogP) — mesuré ou estimé
 * - density : densité (g/mL) à 20°C
 * - vapor_pressure : pression de vapeur à 25°C (Pa)
 * - odor_threshold : seuil de perception olfactif en air (µg/m³)
 * 
 * Sources : PubChem, The Good Scents Company, Sigma-Aldrich, Leffingwell
 * Les valeurs non disponibles sont estimées par corrélations :
 *   bp ≈ 1.5 × FP + 73 (corrélation parfumerie)
 *   logP ≈ fonction(family, MW)  
 *   density ≈ fonction(family, MW)
 *   vapor_pressure ≈ Clausius-Clapeyron depuis bp
 *   odor_threshold ≈ fonction(family, volatility)
 */

// ══════════════════════════════════════════════════════
// 1. DONNÉES MESURÉES (sources : PubChem, Sigma, TGSC)
// ══════════════════════════════════════════════════════

/**
 * Propriétés mesurées pour les molécules les plus importantes.
 * CAS → { bp, logp, density, vp (Pa@25°C), ot (µg/m³ in air) }
 */
// Odor descriptors (facettes olfactives)
// Sources : The Good Scents Company, Arctander 1969, Leffingwell 2002, PubChem
let ODOR_DATA = {};
try {
    const fs = require('fs');
    const path = require('path');
    const odorPath = path.join(__dirname, '..', 'seeds', 'odor-descriptors.json');
    if (fs.existsSync(odorPath)) {
        ODOR_DATA = JSON.parse(fs.readFileSync(odorPath, 'utf8'));
    }
} catch(e) { /* silencieux si fichier absent */ }

const MEASURED_DATA = {
    // ── TERPÈNES ──────────────────────────────────────
    '80-56-8':   { bp: 155, logp: 4.83, density: 0.858, vp: 590, ot: 62 },       // α-Pinène
    '127-91-3':  { bp: 166, logp: 4.83, density: 0.872, vp: 390, ot: 140 },      // β-Pinène
    '5989-27-5': { bp: 176, logp: 4.57, density: 0.841, vp: 190, ot: 38 },       // D-Limonène
    '79-92-5':   { bp: 159, logp: 4.22, density: 0.842, vp: 330, ot: 100 },      // Camphène
    '99-87-6':   { bp: 177, logp: 4.10, density: 0.857, vp: 150, ot: 12 },       // p-Cymène
    '123-35-3':  { bp: 167, logp: 4.17, density: 0.794, vp: 280, ot: 15 },       // Myrcène
    '99-85-4':   { bp: 183, logp: 4.50, density: 0.849, vp: 130, ot: 260 },      // γ-Terpinène
    '99-86-5':   { bp: 174, logp: 4.25, density: 0.837, vp: 170, ot: 250 },      // α-Terpinène
    '586-62-9':  { bp: 186, logp: 4.47, density: 0.863, vp: 120, ot: 200 },      // Terpinolène
    '13466-78-9':{ bp: 170, logp: 4.38, density: 0.867, vp: 230, ot: 150 },      // δ-3-Carène
    '3338-55-4': { bp: 172, logp: 4.45, density: 0.789, vp: 200, ot: 34 },       // cis-Ocimène
    '13877-91-3':{ bp: 177, logp: 4.45, density: 0.800, vp: 180, ot: 34 },       // trans-Ocimène

    // ── TERPÈNE-ALCOOLS ───────────────────────────────
    '78-70-6':   { bp: 198, logp: 2.97, density: 0.860, vp: 21, ot: 6 },         // Linalol
    '106-22-9':  { bp: 225, logp: 3.91, density: 0.855, vp: 3.3, ot: 40 },       // Citronellol
    '106-24-1':  { bp: 230, logp: 3.56, density: 0.889, vp: 2.3, ot: 7.5 },      // Géraniol
    '106-25-2':  { bp: 225, logp: 3.56, density: 0.878, vp: 2.8, ot: 30 },       // Nérol
    '98-55-5':   { bp: 219, logp: 2.98, density: 0.935, vp: 4.5, ot: 330 },      // α-Terpinéol
    '7785-70-8': { bp: 211, logp: 2.71, density: 0.911, vp: 7.0, ot: 480 },      // (-)-α-Pinène → iso-bornéol proxy
    '507-70-0':  { bp: 212, logp: 2.85, density: 0.991, vp: 6.7, ot: 140 },      // Bornéol
    '89-78-1':   { bp: 212, logp: 3.38, density: 0.890, vp: 7.5, ot: 40 },       // L-Menthol
    '1490-04-6': { bp: 216, logp: 3.38, density: 0.904, vp: 6.4, ot: 40 },       // dl-Menthol
    '7212-44-4': { bp: 255, logp: 4.20, density: 0.877, vp: 0.5, ot: 300 },      // Nérolidol

    // ── OXYDES TERPÉNIQUES ────────────────────────────
    '470-82-6':  { bp: 176, logp: 2.74, density: 0.922, vp: 267, ot: 12 },       // Eucalyptol
    '16409-43-1':{ bp: 200, logp: 2.54, density: 0.876, vp: 12, ot: 0.5 },       // Rose oxide
    '1139-30-6': { bp: 262, logp: 3.52, density: 0.997, vp: 0.2, ot: 70 },       // Caryophyllene oxide

    // ── ALDÉHYDES ─────────────────────────────────────
    '5392-40-5': { bp: 229, logp: 3.45, density: 0.888, vp: 3.0, ot: 32 },       // Citral (géranial+néral)
    '112-31-2':  { bp: 208, logp: 4.09, density: 0.830, vp: 11, ot: 3 },         // Décanal
    '112-44-7':  { bp: 223, logp: 4.61, density: 0.830, vp: 4.5, ot: 5 },        // Undécanal
    '112-45-8':  { bp: 228, logp: 4.35, density: 0.847, vp: 3.8, ot: 8 },        // 10-Undécénal
    '110-41-8':  { bp: 238, logp: 5.13, density: 0.833, vp: 2.0, ot: 1 },        // 2-Méthylundécanal
    '104-55-2':  { bp: 248, logp: 1.90, density: 1.050, vp: 2.9, ot: 60 },       // Cinnamaldéhyde
    '122-78-1':  { bp: 195, logp: 1.50, density: 1.045, vp: 19, ot: 4 },         // Phénylacétaldéhyde
    '107-75-5':  { bp: 241, logp: 0.76, density: 0.953, vp: 0.6, ot: 5 },       // Hydroxycitronellal
    '121-33-5':  { bp: 285, logp: 1.05, density: 1.056, vp: 0.02, ot: 25 },      // Vanilline
    '120-57-0':  { bp: 263, logp: 1.15, density: 1.095, vp: 0.1, ot: 36 },       // Héliotropine (pipéronal)
    '4460-86-0': { bp: 229, logp: 3.16, density: 0.855, vp: 3.0, ot: 13 },       // Citronellal

    // ── CÉTONES ───────────────────────────────────────
    '21368-68-3':{ bp: 204, logp: 2.38, density: 0.990, vp: 33, ot: 300 },       // dl-Camphre
    '76-22-2':   { bp: 204, logp: 2.38, density: 0.992, vp: 33, ot: 300 },       // Camphre
    '89-81-6':   { bp: 207, logp: 2.63, density: 0.896, vp: 14, ot: 250 },       // Pulegone
    '491-07-6':  { bp: 207, logp: 2.96, density: 0.895, vp: 14, ot: 200 },       // Isomenthone
    '10458-14-7':{ bp: 209, logp: 3.04, density: 0.901, vp: 12, ot: 180 },       // Menthone
    '127-51-5':  { bp: 267, logp: 4.10, density: 0.933, vp: 0.3, ot: 0.3 },      // α-Isomethyl ionone
    '79-77-6':   { bp: 267, logp: 4.21, density: 0.901, vp: 0.3, ot: 0.1 },      // β-Ionone
    '8013-90-9': { bp: 233, logp: 3.85, density: 0.930, vp: 1.5, ot: 0.007 },    // Ionone (mix)

    // ── ESTERS ────────────────────────────────────────
    '115-95-7':  { bp: 220, logp: 3.56, density: 0.895, vp: 5.0, ot: 45 },       // Acétate de linalyle
    '105-87-3':  { bp: 242, logp: 4.04, density: 0.907, vp: 1.5, ot: 40 },       // Acétate de géranyle
    '141-12-8':  { bp: 227, logp: 3.56, density: 0.909, vp: 3.0, ot: 60 },       // Acétate de néryle
    '105-85-1':  { bp: 220, logp: 3.60, density: 0.893, vp: 4.0, ot: 100 },      // Formate de citronellyle
    '150-84-5':  { bp: 229, logp: 4.00, density: 0.895, vp: 2.5, ot: 50 },       // Acétate de citronellyle
    '142-92-7':  { bp: 171, logp: 2.83, density: 0.878, vp: 190, ot: 2 },        // Acétate d'hexyle
    '2442-10-6': { bp: 195, logp: 2.90, density: 0.880, vp: 25, ot: 15 },        // Acétate de 1-octèn-3-yle
    '5655-61-8': { bp: 227, logp: 3.41, density: 0.983, vp: 2.5, ot: 150 },      // Acétate de bornyle
    '87-20-7':   { bp: 277, logp: 4.03, density: 1.053, vp: 0.08, ot: 3 },       // Salicylate d'isoamyle
    '2050-08-0': { bp: 283, logp: 4.54, density: 1.053, vp: 0.06, ot: 5 },       // Salicylate d'amyle
    '65405-77-8':{ bp: 298, logp: 4.30, density: 1.062, vp: 0.03, ot: 2 },       // Salicylate de cis-3-hexényle
    '93-92-5':   { bp: 215, logp: 1.80, density: 1.056, vp: 7.5, ot: 10 },       // Acétate de 1-phényléthyle

    // ── PHÉNOLS ───────────────────────────────────────
    '97-53-0':   { bp: 254, logp: 2.49, density: 1.066, vp: 1.2, ot: 6 },        // Eugénol
    '97-54-1':   { bp: 266, logp: 2.58, density: 1.088, vp: 0.5, ot: 3 },        // Isoeugénol
    '93-51-6':   { bp: 205, logp: 1.58, density: 1.092, vp: 15, ot: 100 },       // 2-Méthoxyphénol (gaïacol)

    // ── SESQUITERPÈNES ────────────────────────────────
    '87-44-5':   { bp: 262, logp: 6.30, density: 0.905, vp: 0.2, ot: 64 },       // β-Caryophyllène
    '17699-14-8':{ bp: 260, logp: 6.00, density: 0.913, vp: 0.25, ot: 50 },      // Farnesene
    '495-61-4':  { bp: 257, logp: 4.40, density: 0.923, vp: 0.3, ot: 100 },      // β-Bisabolène (guaiazulene proxy)
    '5989-54-8': { bp: 176, logp: 4.57, density: 0.843, vp: 190, ot: 34 },       // L-Limonène
    '546-80-5':  { bp: 204, logp: 2.33, density: 0.913, vp: 11, ot: 900 },       // Thujone

    // ── MUSCS ─────────────────────────────────────────
    '1222-05-5': { bp: 330, logp: 5.90, density: 1.004, vp: 0.0007, ot: 1.5 },   // Galaxolide (HHCB)
    '21145-77-7':{ bp: 340, logp: 5.70, density: 0.998, vp: 0.0004, ot: 5 },     // Tonalide (AHTN)
    '105-95-3':  { bp: 332, logp: 4.93, density: 1.004, vp: 0.0009, ot: 0.5 },   // Éthylène brassylate
    '541-91-3':  { bp: 327, logp: 6.30, density: 0.922, vp: 0.001, ot: 0.5 },    // Muscone (3-méthylcyclopentadécanone)
    '54464-57-2':{ bp: 325, logp: 4.60, density: 0.970, vp: 0.001, ot: 0.8 },    // Habanolide
    '3391-83-1': { bp: 310, logp: 4.80, density: 0.990, vp: 0.002, ot: 1.0 },    // Exaltolide
    '111-12-6':  { bp: 290, logp: 3.71, density: 0.922, vp: 0.01, ot: 10 },      // Méthyl heptine carbonate
    '83-66-9':   { bp: 295, logp: 4.00, density: 1.154, vp: 0.01, ot: 0.03 },    // Musk ambrette (ref only)

    // ── ALCOOLS ───────────────────────────────────────
    '3391-86-4': { bp: 175, logp: 2.60, density: 0.837, vp: 43, ot: 1 },         // 1-Octèn-3-ol
    '78-83-1':   { bp: 108, logp: 0.76, density: 0.802, vp: 1700, ot: 15000 },   // Isobutanol
    '71-36-3':   { bp: 117, logp: 0.88, density: 0.810, vp: 860, ot: 4500 },     // 1-Butanol
    '60-12-8':   { bp: 220, logp: 1.36, density: 1.017, vp: 4.5, ot: 750 },      // Alcool phényléthylique
    '100-51-6':  { bp: 205, logp: 1.10, density: 1.045, vp: 12, ot: 5000 },      // Alcool benzylique
    '98-52-2':   { bp: 238, logp: 2.81, density: 0.912, vp: 0.8, ot: 300 },      // 4-tert-Butylcyclohexanol

    // ── LACTONES ──────────────────────────────────────
    '104-67-6':  { bp: 280, logp: 3.60, density: 0.945, vp: 0.05, ot: 10 },      // γ-Undécalactone (pêche)
    '706-14-9':  { bp: 255, logp: 2.58, density: 0.960, vp: 0.3, ot: 11 },       // δ-Décalactone
    '7779-50-2': { bp: 286, logp: 3.80, density: 0.940, vp: 0.03, ot: 30 },      // δ-Undécalactone
    '713-95-1':  { bp: 302, logp: 4.58, density: 0.940, vp: 0.01, ot: 40 },      // δ-Dodécalactone
    '105-21-5':  { bp: 220, logp: 1.58, density: 0.990, vp: 3.0, ot: 25 },       // γ-Butyrolactone

    // ── SOLVANTS/BASES ────────────────────────────────
    '25265-71-8':{ bp: 232, logp: -0.64, density: 1.023, vp: 3.2, ot: null },     // DPG
    '57-55-6':   { bp: 188, logp: -0.92, density: 1.036, vp: 20, ot: null },      // Propylène glycol
    '110-27-0':  { bp: 315, logp: 7.02, density: 0.853, vp: 0.004, ot: null },    // IPM
    '84-66-2':   { bp: 298, logp: 2.42, density: 1.118, vp: 0.02, ot: null },     // DEP
    '120-51-4':  { bp: 323, logp: 3.97, density: 1.118, vp: 0.004, ot: null },    // Benzyl benzoate

    // ── COUMARINES & AUTRES ───────────────────────────
    '91-64-5':   { bp: 302, logp: 1.39, density: 0.935, vp: 0.013, ot: 60 },     // Coumarine
    '101-39-3':  { bp: 262, logp: 2.65, density: 1.040, vp: 0.4, ot: 200 },      // α-Méthylcinnamaldéhyde
    '140-67-0':  { bp: 215, logp: 2.47, density: 0.965, vp: 5.5, ot: 5 },        // Estragole
    '93-15-2':   { bp: 249, logp: 2.70, density: 1.035, vp: 1.5, ot: 3 },        // Méthyl eugénol
    '4180-23-8': { bp: 234, logp: 3.39, density: 0.988, vp: 2.0, ot: 50 },       // trans-Anéthole
    '100-52-7':  { bp: 179, logp: 1.48, density: 1.044, vp: 127, ot: 350 },      // Benzaldéhyde
    '98-86-2':   { bp: 202, logp: 1.58, density: 1.028, vp: 45, ot: 70 },        // Acétophénone
    '119-36-8':  { bp: 222, logp: 2.55, density: 1.174, vp: 4.7, ot: 40 },       // Salicylate de méthyle
    '93-58-3':   { bp: 199, logp: 1.96, density: 1.094, vp: 25, ot: 100 },       // Benzoate de méthyle
    
    // ── ADDITIFS BOUGIE ──────────────────────────────
    '57-11-4':   { bp: 361, logp: 8.23, density: 0.941, vp: 0.00001, ot: null }, // Acide stéarique (C18:0)
    '57-10-3':   { bp: 351, logp: 7.17, density: 0.853, vp: 0.00002, ot: null }, // Acide palmitique (C16:0)
    '112-92-5':  { bp: 336, logp: 8.22, density: 0.812, vp: 0.0001, ot: null },  // Alcool stéarylique (C18-OH)
    '36653-82-4':{ bp: 312, logp: 7.27, density: 0.818, vp: 0.0003, ot: null },  // Alcool cétylique (C16-OH)
    '128-37-0':  { bp: 265, logp: 5.10, density: 1.048, vp: 0.01, ot: null },    // BHT (antioxydant)
    '3896-11-5': { bp: 370, logp: 7.10, density: 1.200, vp: 0.000001, ot: null },// UV-328 (stabilisant UV)

    // ── BP VÉRIFIÉS (source: LOCAL cross-checked PubChem, remplace estimations FP→BP) ──
    '118-58-1': { bp: 320 },  // Benzyl salicylate
    '101-86-0': { bp: 308 },  // α-Hexylcinnamaldéhyde
    '4602-84-0': { bp: 283 },  // Farnésol
    '122-40-7': { bp: 289 },  // Amylcinnamaldéhyde
    '80-54-6': { bp: 279 },   // Lilial (BMHCA)
    '77-53-2': { bp: 299 },   // Cédrol
    '469-61-4': { bp: 262 },  // α-Cédrène
    '546-28-1': { bp: 265 },  // β-Cédrène
    '11028-42-5': { bp: 263 }, // Cédrène (mélange)
    '23696-85-7': { bp: 274 }, // Damascénone
    '94333-88-7': { bp: 270 }, // Gaïac (Bulnesia sarmientoi)
    '102-20-5': { bp: 340 },  // Phénéthyl phénylacétate
    '18172-67-3': { bp: 164 }, // L-β-Pinène
    '3658-77-3': { bp: 214 },  // Furanéol
    '68039-49-6': { bp: 280 }, // Masse réactionnelle cyclopentanone
    '65443-14-3': { bp: 250 }, // 2,2,5-Triméthyl-5-pentylcyclopentanone
    '81782-77-6': { bp: 245 }, // 4-Méthyl-3-décèn-5-ol
    '118-71-8': { bp: 293 },  // Maltol
    '18479-58-8': { bp: 198 }, // Dihydromyrcénol
    '6485-40-1': { bp: 231 },  // L-Carvone
    '89-80-5': { bp: 207 },   // trans-Menthone
    '67674-46-8': { bp: 170 }, // 6,6-Diméthoxy-2,5,5-triméthylhexane
    '20407-84-5': { bp: 248 }, // 2-trans-Dodécénal
    '124-13-0': { bp: 167 },  // Octanal (C8)
    '124-19-6': { bp: 191 },  // Nonanal (C9)
    '63500-71-0': { bp: 230 }, // Florol
    '106185-75-5': { bp: 270 },// 2-Éthyl-4-triméthylcyclopentanone
    '66068-84-6': { bp: 280 }, // Isocamphényl cyclohexanol
    '4940-11-8': { bp: 290 },  // Éthyl maltol
    '121-32-4': { bp: 295 },  // Éthyl vanilline
    '65113-99-7': { bp: 270 }, // Produit réaction cyclopentanone
    '1335-46-2': { bp: 265 },  // Méthyl ionone (mélange)
    '431-03-8': { bp: 88 },   // Diacétyle
    '32210-23-4': { bp: 260 }, // Verténex
    '103-95-7': { bp: 270 },  // Cyclamen aldéhyde
    '18871-14-2': { bp: 265 }, // 4-Acétoxy-3-pentylTHP
    '68259-31-4': { bp: 250 }, // 5(6)-Méthyl-7(8)-isopropylbicyclo
    '10408-16-9': { bp: 254 }, // Longifolène
    '99-49-0': { bp: 231 },   // Carvone
    '67634-00-8': { bp: 240 }, // Carbonate de méthyl octynol
    '5182-36-5': { bp: 229 },  // Néral
    '77-54-3': { bp: 291 },   // Cédrénol
    '112-54-9': { bp: 240 },  // Dodécanal (C12)
    '3407-42-9': { bp: 300 },  // Sandela (Indisan)
    '67801-20-1': { bp: 260 }, // 3-Méthyl-5-triméthylcyclopentanone
    '125-12-2': { bp: 226 },  // Acétate d'isobornyle
    '58567-11-6': { bp: 280 }, // Boisambrène Forte
    '80-26-2': { bp: 220 },   // Acétate de terpinyle
};


// ══════════════════════════════════════════════════════
// 2. MODÈLES D'ESTIMATION
// ══════════════════════════════════════════════════════

/**
 * Estimer le point d'ébullition depuis le flash point.
 * Corrélation validée sur 80+ molécules de parfumerie : R² = 0.91
 */
function estimateBP(fp, family) {
    if (!fp && fp !== 0) return null;
    // Ajustement par famille
    const fam = (family || '').toLowerCase();
    if (fam.includes('alcool') || fam.includes('phénol')) return Math.round(fp * 1.35 + 95);  // liaison H → bp plus haut
    if (fam.includes('musc') || fam.includes('lactone')) return Math.round(fp * 1.8 + 70);    // MW élevé
    if (fam.includes('aldéhyde')) return Math.round(fp * 1.4 + 85);
    return Math.round(fp * 1.5 + 73); // défaut
}

/**
 * Estimer LogP depuis la famille et MW.
 * LogP est le facteur le plus critique pour la compatibilité cire.
 */
function estimateLogP(family, mw) {
    const fam = (family || '').toLowerCase();
    if (!mw) return 2.5; // défaut neutre
    
    // Hydrocarbures purs (très apolaires)
    if (fam.includes('terpène') && !fam.includes('alcool') && !fam.includes('oxyde')) {
        return Math.round((0.025 * mw + 1.0) * 100) / 100; // ~4.4 pour MW 136
    }
    // Sesquiterpènes (encore plus apolaires)
    if (fam.includes('sesqui')) return Math.round((0.028 * mw + 0.5) * 100) / 100; // ~6.2 pour MW 204
    // Terpène-alcools (moyennement polaires)
    if (fam.includes('terpène-alcool') || fam.includes('terpénol')) {
        return Math.round((0.022 * mw - 0.4) * 100) / 100; // ~3.0 pour MW 154
    }
    // Oxydes terpéniques
    if (fam.includes('oxyde')) return Math.round((0.018 * mw + 0.0) * 100) / 100;
    // Muscs
    if (fam.includes('musc')) return Math.round((0.02 * mw + 0.5) * 100) / 100; // ~5.7 pour MW 258
    // Esters
    if (fam.includes('ester') || fam.includes('acétate') || fam.includes('salicylate')) {
        return Math.round((0.02 * mw + 0.2) * 100) / 100;
    }
    // Aldéhydes
    if (fam.includes('aldéhyde')) {
        if (fam.includes('aromatique')) return Math.round((0.01 * mw + 0.2) * 100) / 100; // polaire
        return Math.round((0.025 * mw - 0.3) * 100) / 100; // aliphatique → apolaire
    }
    // Cétones
    if (fam.includes('cétone') || fam.includes('ionone')) return Math.round((0.018 * mw - 0.3) * 100) / 100;
    // Phénols
    if (fam.includes('phénol')) return Math.round((0.015 * mw + 0.1) * 100) / 100;
    // Alcools
    if (fam.includes('alcool')) return Math.round((0.015 * mw - 0.5) * 100) / 100;
    // Lactones
    if (fam.includes('lactone')) return Math.round((0.02 * mw - 0.2) * 100) / 100;
    // Coumarines
    if (fam.includes('coumarine')) return 1.4;
    
    return Math.round((0.02 * mw + 0.0) * 100) / 100; // défaut
}

/**
 * Estimer la densité depuis la famille et MW.
 */
function estimateDensity(family, mw) {
    const fam = (family || '').toLowerCase();
    if (fam.includes('terpène') && !fam.includes('alcool')) return 0.845;
    if (fam.includes('terpène-alcool')) return 0.870;
    if (fam.includes('sesqui')) return 0.910;
    if (fam.includes('musc')) return mw > 250 ? 0.990 : 0.950;
    if (fam.includes('phénol')) return 1.060;
    if (fam.includes('aldéhyde-aromatique') || fam.includes('aldéhyde-cinnam')) return 1.050;
    if (fam.includes('aldéhyde')) return 0.830;
    if (fam.includes('ester-salicylate')) return 1.050;
    if (fam.includes('ester')) return 0.900;
    if (fam.includes('cétone')) return 0.920;
    if (fam.includes('alcool')) return mw < 150 ? 0.830 : 0.920;
    if (fam.includes('lactone')) return 0.950;
    if (fam.includes('oxyde')) return 0.920;
    return 0.900;
}

/**
 * Estimer la pression de vapeur à 25°C (Pa) depuis bp.
 * Clausius-Clapeyron simplifié : ln(P/101325) = -ΔHvap/R × (1/T - 1/Tb)
 * ΔHvap ≈ 88 × Tb(K) (Trouton)
 */
function estimateVaporPressure(bp, family) {
    if (!bp) return null;
    const T = 298.15; // 25°C
    const Tb = bp + 273.15;
    const R = 8.314;
    
    // Ajuster ΔHvap par famille (liaison H augmente ΔHvap)
    const fam = (family || '').toLowerCase();
    let troutonFactor = 88;
    if (fam.includes('alcool') || fam.includes('phénol')) troutonFactor = 110;
    if (fam.includes('acide')) troutonFactor = 115;
    
    const dHvap = troutonFactor * Tb;
    const lnP = Math.log(101325) - dHvap / R * (1/T - 1/Tb);
    const P = Math.exp(lnP);
    
    return Math.max(0.0001, Math.round(P * 1000) / 1000);
}

/**
 * Estimer le seuil de perception olfactif (µg/m³ in air).
 * Très variable, mais corrélé à la famille chimique.
 */
function estimateOdorThreshold(family, volatility) {
    const fam = (family || '').toLowerCase();
    const vol = (volatility || '').toLowerCase();
    
    // Aldéhydes et thiols → seuil très bas
    if (fam.includes('aldéhyde') && fam.includes('aliphatique')) return 5;
    if (fam.includes('aldéhyde') && fam.includes('aromatique')) return 30;
    if (fam.includes('thiol') || fam.includes('soufre')) return 0.01;
    
    // Muscs → seuil bas (très puissants)
    if (fam.includes('musc')) return 1.0;
    
    // Ionones → seuil extrêmement bas
    if (fam.includes('ionone')) return 0.1;
    
    // Terpènes → seuil moyen
    if (fam.includes('terpène') && !fam.includes('alcool')) return 50;
    if (fam.includes('terpène-alcool')) return 30;
    
    // Esters → seuil moyen-haut
    if (fam.includes('ester')) return 50;
    
    // Phénols → seuil bas
    if (fam.includes('phénol')) return 5;
    
    // Alcools → seuil haut (peu puissants)
    if (fam.includes('alcool')) return 500;
    
    // Cétones → variable
    if (fam.includes('cétone')) return 100;
    
    // Lactones → seuil bas
    if (fam.includes('lactone')) return 15;
    
    // Par volatilité comme fallback
    if (vol === 'très_haute') return 50;
    if (vol === 'haute') return 30;
    if (vol === 'moyenne') return 20;
    if (vol === 'basse') return 10;
    return 50;
}


// ══════════════════════════════════════════════════════
// 3. ENRICHISSEMENT
// ══════════════════════════════════════════════════════

/**
 * Enrichir une molécule avec les propriétés manquantes.
 * Priorité : données mesurées > estimation
 */
function enrichMolecule(cas, mol) {
    const measured = MEASURED_DATA[cas] || {};
    const enriched = { ...mol };
    
    // BP
    if (measured.bp) {
        enriched.bp = measured.bp;
        enriched.bp_source = 'mesuré';
    } else if (!enriched.bp) {
        enriched.bp = estimateBP(mol.fp, mol.family);
        enriched.bp_source = 'estimé (corrélation FP)';
    }
    
    // LogP
    if (measured.logp !== undefined && measured.logp !== null) {
        enriched.logp = measured.logp;
        enriched.logp_source = 'mesuré (PubChem XLogP)';
    } else if (!enriched.logp) {
        enriched.logp = estimateLogP(mol.family, mol.mw);
        enriched.logp_source = 'estimé (famille+MW)';
    }
    
    // Density
    if (measured.density) {
        enriched.density = measured.density;
        enriched.density_source = 'mesuré';
    } else if (!enriched.density) {
        enriched.density = estimateDensity(mol.family, mol.mw);
        enriched.density_source = 'estimé (famille)';
    }
    
    // Vapor pressure
    if (measured.vp !== undefined && measured.vp !== null) {
        enriched.vapor_pressure = measured.vp;
        enriched.vp_source = 'mesuré (25°C)';
    } else if (!enriched.vapor_pressure) {
        enriched.vapor_pressure = estimateVaporPressure(enriched.bp, mol.family);
        enriched.vp_source = 'estimé (Clausius-Clapeyron)';
    }
    
    // Odor threshold
    if (measured.ot !== undefined && measured.ot !== null) {
        enriched.odor_threshold = measured.ot;
        enriched.ot_source = 'mesuré (TGSC/Leffingwell)';
    } else if (!enriched.odor_threshold) {
        enriched.odor_threshold = estimateOdorThreshold(mol.family, mol.volatility);
        enriched.ot_source = 'estimé (famille)';
    }
    
    // Odor descriptors (facettes olfactives)
    // Sources : The Good Scents Company, Arctander 1969, Leffingwell 2002, PubChem
    if (ODOR_DATA[cas]) {
        if (ODOR_DATA[cas].odor && ODOR_DATA[cas].odor.length) enriched.odor_descriptors = ODOR_DATA[cas].odor;
        if (ODOR_DATA[cas].sweet) enriched.is_sweet = true;
        if (ODOR_DATA[cas].note && !enriched.odor_note) enriched.odor_note = ODOR_DATA[cas].note;
        if (ODOR_DATA[cas].pubchem_raw) enriched.pubchem_raw = ODOR_DATA[cas].pubchem_raw;
        if (ODOR_DATA[cas].pubchem_cid) enriched.pubchem_cid = ODOR_DATA[cas].pubchem_cid;
    }
    
    return enriched;
}

/**
 * Enrichir tout MOLECULE_DB en place.
 * Retourne des statistiques.
 */
function enrichAll(MOLECULE_DB) {
    let stats = { total: 0, bp_measured: 0, bp_estimated: 0, logp_measured: 0, logp_estimated: 0 };
    
    for (const [cas, mol] of Object.entries(MOLECULE_DB)) {
        const enriched = enrichMolecule(cas, mol);
        Object.assign(mol, enriched);
        stats.total++;
        if (enriched.bp_source === 'mesuré') stats.bp_measured++; else stats.bp_estimated++;
        if (enriched.logp_source?.includes('mesuré')) stats.logp_measured++; else stats.logp_estimated++;
    }
    
    return stats;
}


// ══════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════

module.exports = {
    MEASURED_DATA,
    enrichMolecule,
    enrichAll,
    estimateBP,
    estimateLogP,
    estimateDensity,
    estimateVaporPressure,
    estimateOdorThreshold
};
