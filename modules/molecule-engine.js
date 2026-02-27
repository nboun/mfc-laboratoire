/**
 * MFC Laboratoire — Moteur d'Analyse Moléculaire
 * Croisement FDS × Formulations : corrélation composition chimique → résultat bougie
 * 
 * OBJECTIF : Découvrir automatiquement les schémas entre les molécules d'un parfum
 * et le comportement en formulation (recette, mèche, %, succès/échec)
 * 
 * Chaîne : FDS (composants CAS) → Profil moléculaire → Corrélations → Prédictions
 */

// ═══════════════════════════════════════════════════
// 1. DICTIONNAIRE MOLÉCULAIRE — Classification chimique
// ═══════════════════════════════════════════════════

const MOLECULE_DB = {
    // ── TERPÈNES & DÉRIVÉS (volatils, flash bas, diffusion haute) ──
    '78-70-6':   { name: 'Linalol', family: 'terpène-alcool', mw: 154.25, fp: 76, volatility: 'haute', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Molécule clé floraux/lavande, excellent diffusion à chaud' },
    '5989-27-5': { name: 'D-Limonène', family: 'terpène', mw: 136.24, fp: 48, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Agrumes, flash très bas, inflammable' },
    '127-91-3':  { name: 'β-Pinène', family: 'terpène', mw: 136.24, fp: 47, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Boisé/pin, abaisse fortement le flash' },
    '80-56-8':   { name: 'α-Pinène', family: 'terpène', mw: 136.24, fp: 33, volatility: 'très_haute',
                   impact_combustion: 'danger', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Flash point le plus bas des terpènes courants' },
    '87-44-5':   { name: 'β-Caryophyllène', family: 'sesquiterpène', mw: 204.36, fp: 110, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'excellente',
                   notes: 'Épicé/boisé, fixateur naturel, anti-inflammatoire' },
    '469-61-4':  { name: 'α-Cédrène', family: 'sesquiterpène', mw: 204.36, fp: 113, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'excellente',
                   notes: 'Boisé cèdre, excellent fixateur' },
    '546-28-1':  { name: 'β-Cédrène', family: 'sesquiterpène', mw: 204.36, fp: 113, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'excellente',
                   notes: 'Boisé cèdre, accompagne α-cédrène' },
    '77-53-2':   { name: 'Cédrol', family: 'sesquiterpène-alcool', mw: 222.37, fp: 140, volatility: 'basse',
                   impact_combustion: 'positif', impact_diffusion: 'soutien', solubility_wax: 'excellente',
                   notes: 'Boisé doux, aide combustion, fixateur puissant' },
    '3338-55-4': { name: 'cis-Ocimène', family: 'terpène', mw: 136.24, fp: 49, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Herbe/basilic, très volatil' },
    '98-55-5':   { name: 'α-Terpinéol', family: 'terpène-alcool', mw: 154.25, fp: 90, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Floral/lilas, bonne tenue' },

    // ── ALDÉHYDES & CÉTONES (réactivité, diffusion variable) ──
    '5392-40-5': { name: 'Citral', family: 'aldéhyde-terpénique', mw: 152.24, fp: 91, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Citronné intense, peut jaunir' },
    '104-55-2':  { name: 'Cinnamaldéhyde', family: 'aldéhyde-aromatique', mw: 132.16, fp: 71, volatility: 'haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'moyenne',
                   notes: 'Cannelle, réactif chimiquement, sensibilisant cutané' },
    '121-33-5':  { name: 'Vanilline', family: 'aldéhyde-aromatique', mw: 152.15, fp: 147, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'limitée',
                   notes: 'Vanille, peut cristalliser dans cire froide, colore en jaune' },
    '23696-85-7':{ name: 'Damascénone', family: 'cétone', mw: 190.28, fp: 100, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                   notes: 'Rose/fruité intense, très puissante même traces' },

    // ── MUSCS SYNTHÉTIQUES (lourds, fixateurs, impact combustion) ──
    '1222-05-5': { name: 'Galaxolide (HHCB)', family: 'musc-polycyclique', mw: 258.40, fp: 135, volatility: 'très_basse',
                   impact_combustion: 'frein', impact_diffusion: 'fixateur', solubility_wax: 'excellente',
                   notes: 'Musc propre, peut ralentir combustion si >10%' },
    '54464-57-2':{ name: 'Iso E Super', family: 'cétone-boisée', mw: 234.38, fp: 111, volatility: 'basse',
                   impact_combustion: 'frein', impact_diffusion: 'fixateur', solubility_wax: 'excellente',
                   notes: 'Boisé ambré, fondamental en parfumerie moderne, lourd en combustion' },
    '33704-61-9':{ name: 'Cashmeran (DPMI)', family: 'musc-boisé', mw: 206.33, fp: 108, volatility: 'basse',
                   impact_combustion: 'frein', impact_diffusion: 'fixateur', solubility_wax: 'excellente',
                   notes: 'Musc boisé épicé, parfum lourd → MFC-C/G recommandé' },

    // ── ESTERS (bonne compatibilité cire) ──
    '102-20-5':  { name: 'Phénéthyl phénylacétate', family: 'ester', mw: 240.30, fp: 152, volatility: 'très_basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'excellente',
                   notes: 'Rose/miel, très bonne solubilité' },
    '104-67-6':  { name: 'γ-Undécalactone', family: 'lactone', mw: 184.28, fp: 123, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'excellente',
                   notes: 'Pêche/fruit, crémeux' },

    // ── PHÉNOLS (réactivité, allergènes) ──
    '97-53-0':   { name: 'Eugénol', family: 'phénol', mw: 164.20, fp: 112, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                   notes: 'Girofle, antioxydant naturel, allergène majeur' },
    '127-51-5':  { name: 'α-Isométhyl ionone', family: 'cétone-ionone', mw: 206.33, fp: 104, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                   notes: 'Violet/iris, persistant' },

    // ── ALCOOLS (bonne diffusion) ──
    '60-12-8':   { name: 'Alcool phényléthylique', family: 'alcool-aromatique', mw: 122.17, fp: 96, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Rose naturelle, excellent diffuseur' },
    '106-22-9':  { name: 'Citronellol', family: 'terpène-alcool', mw: 156.27, fp: 96, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Rose/géranium, allergène' },
    '7540-51-4': { name: 'Citronellol L', family: 'terpène-alcool', mw: 156.27, fp: 96, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Isomère L du citronellol' },
    '106-24-1':  { name: 'Géraniol', family: 'terpène-alcool', mw: 154.25, fp: 101, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Rose/géranium, allergène, bonne diffusion' },

    // ── SOLVANTS / CARRIERS ──
    '34590-94-8':{ name: 'DPG (Dipropylène glycol)', family: 'glycol', mw: 134.17, fp: 75, volatility: 'basse',
                   impact_combustion: 'bloquant', impact_diffusion: 'négatif', solubility_wax: 'mauvaise',
                   notes: '⛔ EXCLU MFC — Obstrue la mèche, ne brûle pas proprement' },
    '142-82-5':  { name: 'Heptane', family: 'alcane', mw: 100.21, fp: -4, volatility: 'très_haute',
                   impact_combustion: 'danger', impact_diffusion: 'flash', solubility_wax: 'bonne',
                   notes: 'Solvant résiduel, flash point négatif!' },

    // ── COMPOSÉS NATURELS COMPLEXES ──
    '94333-88-7':{ name: 'Gaïac (Bulnesia sarmientoi)', family: 'extrait-naturel', mw: 300, fp: 100, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                   notes: 'Boisé fumé, résine naturelle' },
    '11028-42-5':{ name: 'Cédrène (mélange)', family: 'sesquiterpène', mw: 204.36, fp: 113, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'excellente',
                   notes: 'Boisé cèdre, mélange isomères' },

    // ── TERPÈNES SUPPLÉMENTAIRES ──
    '123-35-3':  { name: 'Myrcène', family: 'terpène', mw: 136.24, fp: 43, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Herbe/houblon, très volatil, flash bas' },
    '13466-78-9':{ name: 'δ-3-Carène', family: 'terpène', mw: 136.24, fp: 43, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Pin/résine, abaisse le flash point' },
    '13877-91-3':{ name: 'trans-Ocimène', family: 'terpène', mw: 136.24, fp: 49, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Herbe/basilic, isomère E' },
    '18172-67-3':{ name: 'L-β-Pinène', family: 'terpène', mw: 136.24, fp: 47, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Isomère L du β-pinène' },
    '79-92-5':   { name: 'Camphène', family: 'terpène', mw: 136.24, fp: 39, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Camphré/boisé, flash très bas' },
    '99-87-6':   { name: 'p-Cymène', family: 'terpène-aromatique', mw: 134.22, fp: 47, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Thym/cumin, hydrocarbure aromatique' },
    '99-85-4':   { name: 'γ-Terpinène', family: 'terpène', mw: 136.24, fp: 46, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Herbe/citron léger' },
    '99-86-5':   { name: 'α-Terpinène', family: 'terpène', mw: 136.24, fp: 40, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Citron/herbe, très réactif' },
    '586-62-9':  { name: 'Terpinolène', family: 'terpène', mw: 136.24, fp: 52, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Pin/herbe douce' },
    '470-82-6':  { name: 'Eucalyptol (1,8-cinéole)', family: 'terpène-oxyde', mw: 154.25, fp: 48, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Eucalyptus/camphré, très diffusif' },
    '5989-54-8': { name: 'L-Limonène', family: 'terpène', mw: 136.24, fp: 48, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Isomère L, pin/térébenthine' },

    // ── SESQUITERPÈNES SUPPLÉMENTAIRES ──
    '10408-16-9':{ name: 'Longifolène', family: 'sesquiterpène', mw: 204.36, fp: 113, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'excellente',
                   notes: 'Boisé, fixateur, combustion propre' },
    '77-54-3':   { name: 'Cédrénol', family: 'sesquiterpène-alcool', mw: 222.37, fp: 137, volatility: 'basse',
                   impact_combustion: 'positif', impact_diffusion: 'soutien', solubility_wax: 'excellente',
                   notes: 'Boisé cèdre doux, fixateur' },
    '7212-44-4': { name: 'Nérolidol', family: 'sesquiterpène-alcool', mw: 222.37, fp: 120, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'excellente',
                   notes: 'Floral/boisé, fixateur naturel' },

    // ── ALCOOLS TERPÉNIQUES ──
    '106-25-2':  { name: 'Nérol', family: 'terpène-alcool', mw: 154.25, fp: 98, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Rose/citron doux, isomère géométrique du géraniol' },
    '126-91-0':  { name: 'Linalol naturel (R)', family: 'terpène-alcool', mw: 154.25, fp: 76, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Isomère R, bois de rose' },
    '107-75-5':  { name: 'Hydroxycitronellal', family: 'aldéhyde-alcool', mw: 172.27, fp: 96, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Muguet/tilleul, allergène, grande diffusion' },
    '18479-58-8':{ name: 'Dihydromyrcénol', family: 'terpène-alcool', mw: 156.27, fp: 68, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Frais/agrume/métallique, très utilisé en masculin' },
    '3391-86-4': { name: '1-Octèn-3-ol', family: 'alcool', mw: 128.21, fp: 55, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Champignon/terreux, puissant' },

    // ── ALDÉHYDES ──
    '112-31-2':  { name: 'Décanal (C10)', family: 'aldéhyde-aliphatique', mw: 156.27, fp: 78, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Agrume/cire, aldéhyde gras' },
    '124-13-0':  { name: 'Octanal (C8)', family: 'aldéhyde-aliphatique', mw: 128.21, fp: 52, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Orange/gras, très volatil' },
    '124-19-6':  { name: 'Nonanal (C9)', family: 'aldéhyde-aliphatique', mw: 142.24, fp: 62, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Rose/cire, diffusif' },
    '110-41-8':  { name: '2-Méthylundécanal', family: 'aldéhyde-aliphatique', mw: 184.32, fp: 98, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                   notes: 'Gras/savonneux, persistant' },
    '112-45-8':  { name: '10-Undécénal', family: 'aldéhyde-aliphatique', mw: 168.28, fp: 87, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Rose/cire, aldehydé' },
    '112-54-9':  { name: 'Dodécanal (C12)', family: 'aldéhyde-aliphatique', mw: 184.32, fp: 100, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                   notes: 'Gras/métallique/lilas' },
    '5182-36-5': { name: 'Néral', family: 'aldéhyde-terpénique', mw: 152.24, fp: 91, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Citron/citronnelle, isomère Z du citral' },
    '103-95-7':  { name: 'Cyclamen aldéhyde', family: 'aldéhyde-aromatique', mw: 190.28, fp: 107, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                   notes: 'Muguet/floral aqueux' },
    '20407-84-5':{ name: '2-trans-Dodécénal', family: 'aldéhyde-aliphatique', mw: 182.30, fp: 102, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                   notes: 'Gras/agrume/herbe' },

    // ── ESTERS TERPÉNIQUES ──
    '115-95-7':  { name: 'Acétate de linalyle', family: 'ester-terpénique', mw: 196.29, fp: 85, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Lavande/bergamote, composant clé lavande' },
    '105-87-3':  { name: 'Acétate de géranyle', family: 'ester-terpénique', mw: 196.29, fp: 96, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Rose/lavande, bonne tenue' },
    '141-12-8':  { name: 'Acétate de néryle', family: 'ester-terpénique', mw: 196.29, fp: 96, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Rose/lavande, floral doux' },
    '80-26-2':   { name: 'Acétate de terpinyle', family: 'ester-terpénique', mw: 196.29, fp: 90, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Pin/herbe, composant essentiel pin' },
    '125-12-2':  { name: 'Acétate d\'isobornyle', family: 'ester-terpénique', mw: 196.29, fp: 87, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Pin/camphre, résineux' },
    '5655-61-8': { name: 'Acétate de L-bornyle', family: 'ester-terpénique', mw: 196.29, fp: 87, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Pin/sapin, camphré naturel' },
    '142-92-7':  { name: 'Acétate d\'hexyle', family: 'ester', mw: 144.21, fp: 42, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Fruité/pomme verte, très volatil' },
    '2442-10-6': { name: 'Acétate de 1-octèn-3-yle', family: 'ester', mw: 170.25, fp: 70, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Vert/champignon/lavande' },
    '105-85-1':  { name: 'Formate de citronellyle', family: 'ester', mw: 184.28, fp: 91, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Rose/fruité/vert' },
    '32210-23-4':{ name: 'Verténex', family: 'ester', mw: 198.30, fp: 102, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'excellente',
                   notes: 'Boisé/ambré, bonne tenue' },

    // ── SALICYLATES ──
    '87-20-7':   { name: 'Salicylate d\'isoamyle', family: 'ester-salicylate', mw: 208.26, fp: 126, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'excellente',
                   notes: 'Orchidée/solaire, fixateur' },
    '2050-08-0': { name: 'Salicylate d\'amyle', family: 'ester-salicylate', mw: 208.26, fp: 132, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'excellente',
                   notes: 'Solaire/orchidée' },
    '65405-77-8':{ name: 'Salicylate de cis-3-hexényle', family: 'ester-salicylate', mw: 220.27, fp: 130, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'excellente',
                   notes: 'Vert/herbe coupée, fixateur vert' },

    // ── CÉTONES & CAMPHRES ──
    '10458-14-7':{ name: 'Menthone', family: 'cétone-terpénique', mw: 154.25, fp: 66, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Menthe/herbe, frais' },
    '89-80-5':   { name: 'trans-Menthone', family: 'cétone-terpénique', mw: 154.25, fp: 66, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Menthe poivrée' },
    '491-07-6':  { name: 'Isoménthone', family: 'cétone-terpénique', mw: 154.25, fp: 66, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Menthe/herbe verte' },
    '21368-68-3':{ name: 'Camphre (d,l)', family: 'cétone-bicyclique', mw: 152.24, fp: 66, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Camphré, médical, sublime facilement' },
    '99-49-0':   { name: 'Carvone', family: 'cétone-terpénique', mw: 150.22, fp: 70, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Menthe verte/aneth' },
    '6485-40-1': { name: 'L-Carvone', family: 'cétone-terpénique', mw: 150.22, fp: 70, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Menthe verte (isomère L)' },
    '546-80-5':  { name: 'Thuyone', family: 'cétone-bicyclique', mw: 152.24, fp: 46, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Sauge/absinthe, flash bas, neurotoxique' },
    '1335-46-2': { name: 'Méthyl ionone (mélange)', family: 'cétone-ionone', mw: 206.33, fp: 110, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                   notes: 'Violet/iris, persistant, fixateur' },
    '65443-14-3':{ name: '2,2,5-Triméthyl-5-pentylcyclopentanone', family: 'cétone-musquée', mw: 196.33, fp: 100, volatility: 'basse',
                   impact_combustion: 'frein', impact_diffusion: 'fixateur', solubility_wax: 'excellente',
                   notes: 'Musc/boisé, fixateur' },

    // ── LACTONES & MACROCYCLIQUES ──
    '106-02-5':  { name: 'Pentadécanolide', family: 'lactone-macrocyclique', mw: 240.38, fp: 147, volatility: 'très_basse',
                   impact_combustion: 'frein', impact_diffusion: 'fixateur', solubility_wax: 'excellente',
                   notes: 'Musc animal, macrolide, fixateur puissant' },

    // ── VANILLINES & SUCRES ──
    '121-32-4':  { name: 'Éthyl vanilline', family: 'aldéhyde-aromatique', mw: 166.18, fp: 145, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'limitée',
                   notes: '3× plus fort que vanilline, colore en jaune' },
    '118-71-8':  { name: 'Maltol', family: 'pyranone', mw: 126.11, fp: 165, volatility: 'très_basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'limitée',
                   notes: 'Caramel/barbe à papa, note sucrée' },
    '4940-11-8': { name: 'Éthyl maltol', family: 'pyranone', mw: 140.14, fp: 155, volatility: 'très_basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'limitée',
                   notes: '4-6× maltol, sucré intense' },
    '3658-77-3': { name: 'Furanéol', family: 'furanone', mw: 128.13, fp: 110, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'moyenne',
                   notes: 'Fraise/caramel, très intense' },
    '431-03-8':  { name: 'Diacétyle', family: 'dicétone', mw: 86.09, fp: 2, volatility: 'très_haute',
                   impact_combustion: 'danger', impact_diffusion: 'flash', solubility_wax: 'bonne',
                   notes: 'Beurre/crème, flash extrêmement bas!' },

    // ── PHÉNYLPROPANOÏDES ──
    '91-64-5':   { name: 'Coumarine', family: 'lactone-aromatique', mw: 146.15, fp: 150, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                   notes: 'Foin coupé/amande, fixateur classique' },
    '4180-23-8': { name: 'trans-Anéthol', family: 'phénylpropanoïde', mw: 148.20, fp: 90, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                   notes: 'Anis/réglisse' },

    // ── MUSQUÉES SYNTHÉTIQUES ──
    '80-54-6':   { name: 'Lilial (BMHCA)', family: 'aldéhyde-aromatique', mw: 204.31, fp: 100, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                   notes: 'Muguet/cyclamen, RESTREINT IFRA (reprotoxique)' },
    '58567-11-6':{ name: 'Boisambrène Forte', family: 'ambre-synthétique', mw: 234.38, fp: 100, volatility: 'basse',
                   impact_combustion: 'frein', impact_diffusion: 'fixateur', solubility_wax: 'excellente',
                   notes: 'Ambre/boisé chaud, fixateur' },
    '3407-42-9': { name: 'Sandela (Indisan)', family: 'santal-synthétique', mw: 212.33, fp: 100, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'fixateur', solubility_wax: 'excellente',
                   notes: 'Bois de santal, crémeux' },
    '63500-71-0':{ name: 'Florol', family: 'alcool-hétérocyclique', mw: 156.27, fp: 77, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Muguet/vert aquatique' },
    '16409-43-1':{ name: 'Oxyde de rose', family: 'terpène-oxyde', mw: 154.25, fp: 54, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Rose/litchi, très puissant, flash bas' },
    '67634-00-8':{ name: 'Carbonate de méthyl octynol', family: 'ester-carbonate', mw: 212.29, fp: 100, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                   notes: 'Vert/violet' },

    // ── CYCLOHEXANOLS & SPÉCIAUX ──
    '98-52-2':   { name: '4-tert-Butylcyclohexanol', family: 'alcool-cyclique', mw: 156.27, fp: 100, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'excellente',
                   notes: 'Boisé/terreux, intermédiaire' },
    '66068-84-6':{ name: 'Isocamphényl cyclohexanol', family: 'alcool-bicyclique', mw: 222.37, fp: 115, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'excellente',
                   notes: 'Bois de santal/crémeux' },
    '81782-77-6':{ name: '4-Méthyl-3-décèn-5-ol', family: 'alcool', mw: 170.29, fp: 92, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                   notes: 'Vert/galbanum' },
    '18871-14-2':{ name: '4-Acétoxy-3-pentylTHP', family: 'ester-hétérocyclique', mw: 214.30, fp: 105, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                   notes: 'Fruité/poire' },
    '16510-27-3':{ name: '1-Cyclopropylméthyl-4-méthoxybenzène', family: 'éther-aromatique', mw: 162.23, fp: 84, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Floral/agrume/muguet' },

    // ── MÉLANGES & SPÉCIALITÉS ──
    '68039-49-6':{ name: 'Masse réactionnelle cyclopentane', family: 'mélange-terpénique', mw: 180, fp: 95, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                   notes: 'Boisé/ambré, mélange industriel' },
    '65113-99-7':{ name: 'Produit de réaction cyclopentène', family: 'mélange-synthétique', mw: 210, fp: 100, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                   notes: 'Boisé/ambré' },
    '106185-75-5':{ name: '2-Éthyl-4-triméthylcyclopentène', family: 'cétone-synthétique', mw: 210, fp: 100, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                   notes: 'Boisé/ambré, proche Iso E Super' },
    '68259-31-4':{ name: '5(ou6)-Méthyl-7(ou8)-isopropyl-bicyclo', family: 'sesquiterpène-synthétique', mw: 220, fp: 110, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'excellente',
                   notes: 'Boisé/vétiver' },
    '67674-46-8':{ name: '6,6-Diméthoxy-2,5,5-triméthylhex-2-ène', family: 'acétal', mw: 200.32, fp: 73, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Ozonic/frais/marine' },
    '67801-20-1':{ name: '3-Méthyl-5-triméthylcyclopentènylpentanol', family: 'alcool-synthétique', mw: 210, fp: 105, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                   notes: 'Bois de santal, crémeux' },

    // === ENRICHISSEMENT v5.25.5 — 100+ molécules fréquentes ===
    '118-58-1': { name: 'Benzyl salicylate', family: 'ester-aromatique', mw: 228.24, fp: 156, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'fixateur', solubility_wax: 'bonne',
                  notes: 'Balsamique doux, fixateur classique' },
    '120-51-4': { name: 'Benzyl benzoate', family: 'ester-aromatique', mw: 212.24, fp: 148, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'fixateur', solubility_wax: 'bonne',
                  notes: 'Faiblement balsamique, solvant fixateur' },
    '476332-65-7':{ name: 'Heptaméthyl décahydroindénofurane', family: 'musc-synthétique', mw: 236.35, fp: 100, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'fixateur', solubility_wax: 'bonne',
                  notes: 'Musc boisé ambré (Sylvamber)' },
    '4707-47-5': { name: 'Méthyl atrarrate', family: 'ester-aromatique', mw: 196.2, fp: 128, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                  notes: 'Mousse de chêne, terreux' },
    '1205-17-0': { name: 'Héliotropine méthylée (MMDHCA)', family: 'aldéhyde-aromatique', mw: 192.21, fp: 110, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Floral-poudré héliotrope' },
    '97-54-1':  { name: 'Isoeugenol', family: 'phénol', mw: 164.2, fp: 112, volatility: 'moyenne',
                  impact_combustion: 'positif', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Épicé-clou de girofle, chaud' },
    '32388-55-9':{ name: 'Karanal (Ambrocenide)', family: 'ambre-synthétique', mw: 234.38, fp: 110, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'fixateur', solubility_wax: 'bonne',
                  notes: 'Ambré puissant, boisé sec' },
    '140-11-4': { name: 'Benzyl acétate', family: 'ester-aromatique', mw: 150.17, fp: 90, volatility: 'haute',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Jasmin, fruité, frais' },
    '79-77-6':  { name: 'beta-Ionone', family: 'cétone-terpénique', mw: 192.3, fp: 113, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Violette, iris, boisé' },
    '55066-48-3':{ name: 'Méthylphénylpentanol (Rosalva)', family: 'alcool-aromatique', mw: 178.27, fp: 115, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Rose fraîche, muguet' },
    '3691-12-1': { name: 'Galaxolidone', family: 'musc-polycyclique', mw: 272.38, fp: 150, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'fixateur', solubility_wax: 'bonne',
                  notes: 'Musc propre, poudré' },
    '19870-74-7':{ name: 'Méthoxycédrane (Cédryl méthyl éther)', family: 'éther-terpénique', mw: 236.4, fp: 110, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'fixateur', solubility_wax: 'bonne',
                  notes: 'Boisé cèdre, sec, ambré' },
    '101-86-0': { name: 'alpha-Hexylcinnamaldéhyde', family: 'aldéhyde-aromatique', mw: 216.32, fp: 113, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Jasmin, floral doux' },
    '68155-66-8':{ name: 'Iso E Super (acétyl octahydronaphtalène)', family: 'cétone-synthétique', mw: 234.38, fp: 100, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                  notes: 'Boisé ambré velouté, effet peau' },
    '5986-55-0': { name: 'Patchoulol', family: 'sesquiterpène-alcool', mw: 222.37, fp: 120, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'fixateur', solubility_wax: 'bonne',
                  notes: 'Patchouli, terreux, boisé' },
    '120-57-0': { name: 'Pipéronal (héliotropine)', family: 'aldéhyde-aromatique', mw: 150.13, fp: 95, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Héliotrope, vanillé, poudré' },
    '10339-55-6':{ name: 'Dihydrométhylcyclolinalol', family: 'terpène-alcool', mw: 168.28, fp: 80, volatility: 'haute',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Floral frais, muguet, citronné' },
    '6259-76-3': { name: 'Hexyl salicylate', family: 'ester-aromatique', mw: 222.28, fp: 130, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                  notes: 'Floral vert, orchidée' },
    '22457-23-4':{ name: 'Stemone (méthylheptanone oxime)', family: 'oxime', mw: 143.23, fp: 85, volatility: 'haute',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Marin, ozone, fraîcheur verte' },
    '7779-30-8': { name: 'alpha-Isométhyl ionone', family: 'cétone-terpénique', mw: 206.33, fp: 115, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Iris, violette, poudré' },
    '6658-48-6': { name: 'Floralozone (Cyclamen aldéhyde)', family: 'aldéhyde-aromatique', mw: 204.31, fp: 102, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Cyclamen, vert aqueux, muguet' },
    '562-74-3':  { name: 'Terpinèn-4-ol', family: 'terpène-alcool', mw: 154.25, fp: 78, volatility: 'haute',
                  impact_combustion: 'positif', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Herbacé, boisé, poivré' },
    '5462-06-6': { name: 'Bourgeonal (p-méthoxyphénylpropanal)', family: 'aldéhyde-aromatique', mw: 178.23, fp: 97, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Muguet puissant, frais' },
    '475-20-7':  { name: 'Longifolène', family: 'sesquiterpène', mw: 204.35, fp: 110, volatility: 'basse',
                  impact_combustion: 'positif', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                  notes: 'Boisé, résineux' },
    '4602-84-0': { name: 'Farnésol', family: 'sesquiterpène-alcool', mw: 222.37, fp: 110, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'fixateur', solubility_wax: 'bonne',
                  notes: 'Floral tilleul, muguet délicat' },
    '28219-61-6':{ name: 'Sandalore', family: 'alcool-synthétique', mw: 210.36, fp: 100, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'fixateur', solubility_wax: 'bonne',
                  notes: 'Santal crémeux, laiteux' },
    '28219-60-5':{ name: 'Javanol', family: 'alcool-synthétique', mw: 210.36, fp: 100, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'fixateur', solubility_wax: 'bonne',
                  notes: 'Santal boisé, crémeux' },
    '198404-98-7':{ name: 'Norlimbanol', family: 'alcool-synthétique', mw: 208.34, fp: 105, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'fixateur', solubility_wax: 'bonne',
                  notes: 'Boisé vétiver, ambré' },
    '1506-02-1': { name: 'Tonalide (AHTN)', family: 'musc-polycyclique', mw: 258.4, fp: 135, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'fixateur', solubility_wax: 'bonne',
                  notes: 'Musc doux, poudré ambré' },
    '14901-07-6':{ name: 'beta-Damascénone', family: 'cétone-terpénique', mw: 190.28, fp: 93, volatility: 'haute',
                  impact_combustion: 'neutre', impact_diffusion: 'excellente', solubility_wax: 'bonne',
                  notes: 'Rose fruitée, prune, très puissant' },
    '128-37-0':  { name: 'BHT (butylhydroxytoluène)', family: 'phénol-stabilisant', mw: 220.35, fp: 127, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                  notes: 'Antioxydant, stabilisant technique' },
    '57-11-4':   { name: 'Acide stéarique', family: 'acide-gras', mw: 284.48, fp: 196, volatility: 'très_basse',
                  impact_combustion: 'positif', impact_diffusion: 'fixateur', solubility_wax: 'excellente',
                  notes: 'Additif bougie — durcisseur, améliore adhérence parfum, modifie cristallisation. Chaîne C18 saturée.' },
    '57-10-3':   { name: 'Acide palmitique', family: 'acide-gras', mw: 256.42, fp: 206, volatility: 'très_basse',
                  impact_combustion: 'positif', impact_diffusion: 'fixateur', solubility_wax: 'excellente',
                  notes: 'Additif bougie — composant naturel cires végétales. Chaîne C16 saturée. Améliore opacité.' },
    '112-92-5':  { name: 'Alcool stéarylique', family: 'alcool-gras', mw: 270.49, fp: 185, volatility: 'très_basse',
                  impact_combustion: 'neutre', impact_diffusion: 'fixateur', solubility_wax: 'excellente',
                  notes: 'Additif bougie — co-émulsifiant, améliore surface. Chaîne C18-OH.' },
    '36653-82-4':{ name: 'Alcool cétylique', family: 'alcool-gras', mw: 242.44, fp: 165, volatility: 'très_basse',
                  impact_combustion: 'neutre', impact_diffusion: 'fixateur', solubility_wax: 'excellente',
                  notes: 'Additif bougie — opacifiant, stabilisant surface. Chaîne C16-OH.' },
    '3896-11-5': { name: 'UV-328 (benzotriazole)', family: 'stabilisant-UV', mw: 351.49, fp: 192, volatility: 'très_basse',
                  impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                  notes: 'Stabilisant UV — protège couleur bougie contre jaunissement lumière.' },
    '142-19-8':  { name: 'Allyl heptanoate', family: 'ester-aliphatique', mw: 170.25, fp: 60, volatility: 'haute',
                  impact_combustion: 'attention', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Fruité pêche, abricot' },
    '928-96-1':  { name: 'cis-3-Hexén-1-ol (feuille)', family: 'alcool-aliphatique', mw: 100.16, fp: 44, volatility: 'haute',
                  impact_combustion: 'attention', impact_diffusion: 'excellente', solubility_wax: 'moyenne',
                  notes: 'Feuille verte coupée, nature' },
    '88-41-5':   { name: 'tert-Butylcyclohexyl acétate', family: 'ester-terpénique', mw: 198.3, fp: 88, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Boisé floral, frais' },
    '82356-51-2':{ name: 'Muscenone (cyclopentadécénone)', family: 'musc-macrocyclique', mw: 236.4, fp: 130, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'fixateur', solubility_wax: 'bonne',
                  notes: 'Musc animal, poudré' },
    '64-17-5':   { name: 'Éthanol', family: 'alcool-solvant', mw: 46.07, fp: 13, volatility: 'très haute',
                  impact_combustion: 'négatif', impact_diffusion: 'neutre', solubility_wax: 'faible',
                  notes: 'Solvant, inflammable — ATTENTION bougie' },
    '555-10-2':  { name: 'beta-Phellandrène', family: 'monoterpène', mw: 136.23, fp: 45, volatility: 'haute',
                  impact_combustion: 'attention', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Menthé, herbacé, citronné' },
    '4430-31-3': { name: 'Octahydrocoumarine', family: 'lactone', mw: 154.21, fp: 110, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                  notes: 'Noix de coco, crémeux' },
    '134-20-3':  { name: 'Anthranilate de méthyle', family: 'ester-aminé', mw: 151.16, fp: 100, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Fleur d\'oranger, néroli, raisin' },
    '123-11-5':  { name: 'Anisaldéhyde (p-méthoxybenzaldéhyde)', family: 'aldéhyde-aromatique', mw: 136.15, fp: 62, volatility: 'haute',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Aubépine, anisé, vanillé' },
    '120-72-9':  { name: 'Indole', family: 'hétérocyclique', mw: 117.15, fp: 121, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'moyenne',
                  notes: 'Floral animal, jasmin, puissant' },
    '111-12-6':  { name: 'Méthyl 2-octynoate (Méthyl hépline carbonate)', family: 'ester-acétylénique', mw: 154.21, fp: 72, volatility: 'haute',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Violet, lavande, vert' },
    '105-95-3':  { name: 'Éthylène brassylate', family: 'musc-macrocyclique', mw: 270.37, fp: 150, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'fixateur', solubility_wax: 'bonne',
                  notes: 'Musc propre, poudré, doux' },
    '104-54-1':  { name: 'Alcool cinnamique', family: 'alcool-aromatique', mw: 134.18, fp: 96, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Balsamique, floral cannelle' },
    '100-52-7':  { name: 'Benzaldéhyde', family: 'aldéhyde-aromatique', mw: 106.12, fp: 62, volatility: 'haute',
                  impact_combustion: 'neutre', impact_diffusion: 'excellente', solubility_wax: 'bonne',
                  notes: 'Amande amère, cerise' },
    '89-78-1':   { name: 'Menthol', family: 'terpène-alcool', mw: 156.27, fp: 93, volatility: 'haute',
                  impact_combustion: 'positif', impact_diffusion: 'excellente', solubility_wax: 'bonne',
                  notes: 'Menthe fraîche, refroidissant' },
    '104-50-7':  { name: 'gamma-Octalactone', family: 'lactone', mw: 142.2, fp: 104, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Noix de coco, pêche crémeuse' },
    '90-17-5':   { name: 'Trichlorophénylcarbinyl acétate (Roseacétol)', family: 'ester-chloré', mw: 253.51, fp: 98, volatility: 'moyenne',
                  impact_combustion: 'attention', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Rose, fruité, terreux' },
    '122-40-7':  { name: 'Amylcinnamaldéhyde', family: 'aldéhyde-aromatique', mw: 202.29, fp: 109, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Jasmin, floral doux, fruité' },
    '127-43-5':  { name: 'beta-Méthylionone', family: 'cétone-terpénique', mw: 206.33, fp: 105, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Violette boisée, framboise' },
    '105-86-2':  { name: 'Géranyl formate', family: 'ester-terpénique', mw: 182.26, fp: 84, volatility: 'haute',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Rose verte, fraîche' },
    '104-93-8':  { name: '4-Méthylanisole (crésyl méthyl éther)', family: 'éther-aromatique', mw: 122.16, fp: 52, volatility: 'haute',
                  impact_combustion: 'attention', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Herbacé, phénolique' },
    '84-66-2':   { name: 'Diéthyl phtalate (DEP)', family: 'plastifiant', mw: 222.24, fp: 117, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                  notes: 'Solvant fixateur technique, inodore' },
    '25265-71-8':{ name: 'Dipropylène glycol (DPG)', family: 'glycol-solvant', mw: 134.17, fp: 118, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'moyenne',
                  notes: 'Solvant diluant — INTERDIT MFC (DPG-free)' },
    '150-84-5':  { name: 'Citronellyl acétate', family: 'ester-terpénique', mw: 198.3, fp: 96, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Fruité rose, citronné' },
    '100-51-6':  { name: 'Alcool benzylique', family: 'alcool-aromatique', mw: 108.14, fp: 96, volatility: 'haute',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'moyenne',
                  notes: 'Amande douce, léger floral' },
    '134-28-1':  { name: 'Guaiacyl acétate', family: 'ester-phénolique', mw: 166.17, fp: 108, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                  notes: 'Fumé, épicé, clou de girofle' },
    '13215-88-8':{ name: 'Damascone delta', family: 'cétone-terpénique', mw: 192.3, fp: 100, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'excellente', solubility_wax: 'bonne',
                  notes: 'Rose fruitée, prune, très puissant' },
    '127-41-3':  { name: 'alpha-Ionone', family: 'cétone-terpénique', mw: 192.3, fp: 98, volatility: 'haute',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Violette, iris, fruité' },
    '122-78-1':  { name: 'Phénylacétaldéhyde', family: 'aldéhyde-aromatique', mw: 120.15, fp: 63, volatility: 'haute',
                  impact_combustion: 'neutre', impact_diffusion: 'excellente', solubility_wax: 'bonne',
                  notes: 'Jacinthe, miel vert, puissant' },
    '119-36-8':  { name: 'Salicylate de méthyle', family: 'ester-aromatique', mw: 152.15, fp: 96, volatility: 'haute',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Menthe, wintergreen' },
    '60-12-8':   { name: 'Phénéthyl alcool (alcool phényléthylique)', family: 'alcool-aromatique', mw: 122.16, fp: 96, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Rose classique, fraîche' },
    '929625-08-1':{ name: 'Nerolidol tricyclique (Polysantol)', family: 'alcool-synthétique', mw: 222.37, fp: 110, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'fixateur', solubility_wax: 'bonne',
                  notes: 'Santal crémeux, boisé doux' },
    '70788-30-6':{ name: 'Triméthylcyclohexylhexanol (Sandaxol)', family: 'alcool-synthétique', mw: 226.4, fp: 108, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'fixateur', solubility_wax: 'bonne',
                  notes: 'Santal, musc, douceur' },
    '67633-96-9':{ name: 'cis-3-Hexényl méthyl carbonate', family: 'ester-aliphatique', mw: 158.19, fp: 60, volatility: 'haute',
                  impact_combustion: 'attention', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Vert feuille, nature, ozone' },
    '83926-73-2':{ name: 'Coranol (cyclohexylméthylbutanol)', family: 'alcool-synthétique', mw: 170.29, fp: 85, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Santal doux, crémeux, laiteux' },
    '77-83-8':   { name: 'Éthyl méthylphénylglycidate (Fraise)', family: 'ester-époxyde', mw: 206.24, fp: 102, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Fraise, fruité doux' },
    '76-22-2':   { name: 'Camphre', family: 'cétone-terpénique', mw: 152.23, fp: 65, volatility: 'haute',
                  impact_combustion: 'attention', impact_diffusion: 'excellente', solubility_wax: 'bonne',
                  notes: 'Camphoré, frais, médicinal' },
    '2785-87-7': { name: 'Dihydroeugenol', family: 'phénol', mw: 166.22, fp: 102, volatility: 'moyenne',
                  impact_combustion: 'positif', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Épicé doux, clou de girofle léger' },
    '105-13-5':  { name: 'Alcool p-méthoxybenzylique (anisique)', family: 'alcool-aromatique', mw: 138.16, fp: 115, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Floral doux, aubépine' },
    '78-69-3':   { name: 'Tétrahydrolinalol', family: 'terpène-alcool', mw: 158.28, fp: 78, volatility: 'haute',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Muguet, tilleul, frais boisé' },
    '80-71-7':   { name: 'Méthylcyclopénolone (Corylone)', family: 'cétone-cyclique', mw: 112.13, fp: 94, volatility: 'moyenne',
                  impact_combustion: 'neutre', impact_diffusion: 'bonne', solubility_wax: 'moyenne',
                  notes: 'Caramel, érable, noisette' },
    '495-61-4':  { name: 'beta-Bisabolène', family: 'sesquiterpène', mw: 204.35, fp: 98, volatility: 'moyenne',
                  impact_combustion: 'positif', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                  notes: 'Balsamique, épicé doux' },
    '123-92-2':  { name: 'Acétate d\'isoamyle', family: 'ester-aliphatique', mw: 130.18, fp: 25, volatility: 'très haute',
                  impact_combustion: 'négatif', impact_diffusion: 'excellente', solubility_wax: 'moyenne',
                  notes: 'Banane, fruité — ATTENTION flash bas' },
    '515-69-5':  { name: 'alpha-Bisabolol', family: 'sesquiterpène-alcool', mw: 222.37, fp: 110, volatility: 'basse',
                  impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                  notes: 'Floral doux, camomille, anti-irritant' },
    '507-70-0':  { name: 'Bornéol', family: 'terpène-alcool', mw: 154.25, fp: 66, volatility: 'haute',
                  impact_combustion: 'attention', impact_diffusion: 'bonne', solubility_wax: 'bonne',
                  notes: 'Pin, camphoré, terreux' },
    '502-61-4':  { name: 'alpha-Farnésène', family: 'sesquiterpène', mw: 204.35, fp: 96, volatility: 'moyenne',
                  impact_combustion: 'positif', impact_diffusion: 'soutien', solubility_wax: 'bonne',
                  notes: 'Pomme verte, boisé doux' },


    // ══════════════════════════════════════════════════════════════════
    // ENRICHISSEMENT v5.25.6 — 50 molécules supplémentaires
    // Sources: PubChem, ChemicalBook, The Good Scents Company, ECHA
    // Couverture : 58% → ~75%+ des CAS présents dans les FDS
    // ══════════════════════════════════════════════════════════════════
    '106-23-0': { name: 'Citronellal', family: 'terpène-aldéhyde', mw: 154.25, fp: 77, volatility: 'haute', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Citronelle/herbacé, note de tête vive, répulsif insectes' },
    '99-83-2': { name: 'alpha-Phellandrène', family: 'monoterpène', mw: 136.23, fp: 49, volatility: 'très haute', 
                   impact_combustion: 'attention', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Citrus/menthe, flash très bas ⚠️, volatil' },
    '470-40-6': { name: 'Aromadendrène', family: 'sesquiterpène', mw: 204.35, fp: 100, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Boisé/cèdre, structure tricyclique stable' },
    '489-40-7': { name: 'alpha-Guaiène', family: 'sesquiterpène', mw: 204.35, fp: 108, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Boisé/patchouli, note de fond typique bois' },
    '17627-44-0': { name: 'alpha-Bisabolène', family: 'sesquiterpène', mw: 204.35, fp: 110, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Balsamique/boisé/épicé, chaîne flexible' },
    '18794-84-8': { name: 'beta-Farnesène', family: 'sesquiterpène', mw: 204.35, fp: 100, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Boisé/vert/pomme, acyclique flexible' },
    '8000-41-7': { name: 'Terpinéol (mélange)', family: 'terpène-alcool', mw: 154.25, fp: 91, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Lilas/floral, mélange isomères alpha+beta+gamma' },
    '6728-26-3': { name: 'trans-2-Hexénal (Leaf aldehyde)', family: 'aldéhyde', mw: 98.14, fp: 36, volatility: 'très haute', 
                   impact_combustion: 'attention', impact_diffusion: 'boost fort', solubility_wax: 'moyenne',
                   notes: 'Feuille verte/pomme, flash très bas ⚠️, note de tête fugace' },
    '55066-49-4': { name: 'Majantol', family: 'aldéhyde', mw: 176.25, fp: 116, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Muguet/vert/floral, note de cœur' },
    '7775-00-0': { name: 'Cyclamen aldéhyde', family: 'aldéhyde', mw: 176.25, fp: 110, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Cyclamen/muguet, signature florale classique' },
    '67634-15-5': { name: 'Floralozone / Florhydral', family: 'aldéhyde', mw: 190.28, fp: 115, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Ozonic/floral/aquatique, note marine moderne' },
    '27939-60-2': { name: 'Triplal', family: 'aldéhyde-cyclique', mw: 138.21, fp: 68, volatility: 'haute', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Vert/herbacé/aquatique, très diffusif, flash moyen-bas' },
    '68039-48-5': { name: 'Ligustral', family: 'aldéhyde-cyclique', mw: 138.21, fp: 60, volatility: 'haute', 
                   impact_combustion: 'attention', impact_diffusion: 'boost fort', solubility_wax: 'bonne',
                   notes: 'Vert/pomme, très volatil, flash bas ⚠️' },
    '141-13-9': { name: 'Adoxal (Trimethyl undecénal)', family: 'aldéhyde-terpène', mw: 210.36, fp: 115, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Agrume/mandarine/ozonic, tenue longue' },
    '125109-85-5': { name: 'Florhydral P', family: 'aldéhyde', mw: 190.28, fp: 112, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Muguet/citrus/vert, variation florhydral' },
    '24720-09-0': { name: 'Damascone beta', family: 'cétone-terpène', mw: 192.3, fp: 100, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Fruit/prune/rose, très puissant, utilisé à très faible %' },
    '23787-90-8': { name: 'Iso E Super', family: 'cétone-boisée', mw: 220.35, fp: 125, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Boisé velouté/ambre/cèdre, molécule star parfumerie moderne' },
    '488-10-8': { name: 'cis-Jasmone', family: 'cétone', mw: 164.24, fp: 101, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Jasmin/floral/herbacé, note naturelle jasmin' },
    '79-89-0': { name: 'beta-Isomethyl ionone', family: 'ionone-cétone', mw: 206.32, fp: 110, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Violette/iris/poudré, fixatif floral' },
    '28940-11-6': { name: 'Calone (Watermelon ketone)', family: 'cétone-marine', mw: 178.18, fp: 130, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'moyenne',
                   notes: 'Marin/melon/ozonic, signature aquatique, densité élevée 1.23' },
    '81786-74-5': { name: 'Koavone', family: 'cétone', mw: 182.3, fp: 95, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Fruité/baie/cassis, note fruitée moderne' },
    '36306-87-3': { name: 'Dynascone', family: 'cétone', mw: 224.34, fp: 108, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Boisé/ambré/musqué, note de fond' },
    '93-08-3': { name: '2-Acetonaphthone', family: 'cétone-aromatique', mw: 170.21, fp: 148, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'moyenne',
                   notes: 'Fleur oranger/foin/poudré, point de fusion élevé' },
    '23911-56-0': { name: 'Képhalis', family: 'cétone-hétérocyclique', mw: 174.2, fp: 108, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Foin/tabac/coumarine, benzofurane' },
    '2705-87-5': { name: 'Allyl cyclohexanepropionate', family: 'ester', mw: 196.29, fp: 115, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Ananas/tropical/fruité, note fruitée exotique' },
    '111-80-8': { name: 'Methyl octine carbonate', family: 'ester-acétylénique', mw: 168.23, fp: 100, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Violet/melon/crémeux, note de cœur distinctive' },
    '10094-34-5': { name: 'Dimethyl benzyl carbinyl butyrate', family: 'ester', mw: 220.31, fp: 120, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Fruité/prune/floral, note fruitée sombre' },
    '25152-85-6': { name: 'cis-3-Hexenyl benzoate', family: 'ester', mw: 204.26, fp: 120, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Vert/feuille/fruité, nature verte persistante' },
    '25485-88-5': { name: 'Cyclohexyl salicylate', family: 'ester-phénolique', mw: 220.26, fp: 155, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Floral léger/poudré/subtil, flash haut, fixatif' },
    '57082-24-3': { name: 'Cedryl acetate (Vertenex)', family: 'ester-boisé', mw: 264.4, fp: 145, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Cèdre/boisé/ambré, note de fond boisée' },
    '141773-73-1': { name: 'Orivone', family: 'ester-boisé', mw: 284.4, fp: 130, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Ambré/boisé/doux, note de fond' },
    '116044-44-1': { name: 'Verdox', family: 'ester-terpène', mw: 208.3, fp: 100, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Vert/pomme/croquant, norbornène' },
    '93-58-3': { name: 'Methyl benzoate', family: 'ester-aromatique', mw: 136.15, fp: 83, volatility: 'haute', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Fruité/ylang/prune, léger et diffusif' },
    '101-84-8': { name: 'Diphenyl éther', family: 'éther-aromatique', mw: 170.21, fp: 115, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'moyenne',
                   notes: 'Géranium/vert/herbacé, densité >1, attention sédimentation' },
    '27606-09-3': { name: 'Peomosa', family: 'acétal', mw: 204.26, fp: 112, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Muguet/citrus/frais, structure dioxine' },
    '139504-68-0': { name: 'Lorysia (Amber Xtreme)', family: 'éther-ambré', mw: 228.37, fp: 125, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Ambré/boisé/cuir, puissant ambré synthétique' },
    '54982-83-1': { name: 'Ethylène brassylate (Musc T)', family: 'lactone-macro', mw: 256.34, fp: 165, volatility: 'très basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'moyenne',
                   notes: 'Musc/poudré/doux, flash très haut, fixatif majeur' },
    '28645-51-4': { name: 'Ambrettolide', family: 'lactone-macro', mw: 252.39, fp: 160, volatility: 'très basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'moyenne',
                   notes: 'Musc/ambrette/poudré, macrolide naturel' },
    '34902-57-3': { name: 'Globalide / Habanolide', family: 'lactone-macro', mw: 238.37, fp: 155, volatility: 'très basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'moyenne',
                   notes: 'Musc/boisé/propre, flash haut, fixatif' },
    '21145-77-7': { name: 'Tonalide (AHTN)', family: 'musc-polycyclique', mw: 258.4, fp: 150, volatility: 'très basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'moyenne',
                   notes: 'Musc/poudré/ambré, polycyclique, fixatif puissant' },
    '15323-35-0': { name: 'Phantolide (AHDI)', family: 'musc-polycyclique', mw: 244.37, fp: 130, volatility: 'très basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'moyenne',
                   notes: 'Musc/poudré/doux, indanone, fixatif' },
    '106-21-8': { name: 'Dihydrocitronellol', family: 'terpène-alcool', mw: 158.28, fp: 93, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Rose/citronelle/doux, note florale douce' },
    '107898-54-4': { name: 'Polysantol', family: 'alcool-boisé', mw: 222.37, fp: 115, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Santal/boisé crémeux, alternative au bois de santal' },
    '68129-81-7': { name: 'Vétivérol (Khusimol)', family: 'sesquiterpène-alcool', mw: 220.35, fp: 120, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Vétiver/terreux/boisé, naturel' },
    '16982-00-6': { name: 'Herbac (Cuparène)', family: 'sesquiterpène-synth', mw: 202.33, fp: 120, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Boisé/herbacé/vétiver, note de fond' },
    '406488-30-0': { name: 'Sylvamber', family: 'amide-boisé', mw: 269.42, fp: 135, volatility: 'très basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Ambré/boisé/musqué, fixatif amide' },
    '8050-15-5': { name: 'Hercolyn D (Methyl hydrogenated rosinate)', family: 'ester-résine', mw: 340, fp: 180, volatility: 'très basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'moyenne',
                   notes: 'Balsamique/fixatif, ester de colophane, diluant/véhicule' },
    '8016-23-7': { name: 'Huile de bois de gaïac', family: 'huile-naturelle', mw: null, fp: 80, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Boisé/fumé/doux, HE naturelle, riche en gaïacol' },
    '8016-26-0': { name: 'Huile de myrte', family: 'huile-naturelle', mw: null, fp: 46, volatility: 'haute', 
                   impact_combustion: 'attention', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Herbacé/camphré/frais, flash bas ⚠️, riche en 1,8-cinéol' },
    '84238-39-1': { name: 'Extrait de patchouli', family: 'huile-naturelle', mw: null, fp: 100, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Terreux/boisé/musqué, riche en patchoulol' },
    '1329-99-3': { name: 'Terphényle hydrogéné', family: 'aromatique', mw: 242.36, fp: 163, volatility: 'très basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'Quasi inodore, solvant/véhicule haute température' },
    '1335-66-6': { name: 'Isocyclocitral', family: 'terpène-aldéhyde', mw: 152.23, fp: 73, volatility: 'haute', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Herbacé/vert/citron, isomère citral cyclique' },

// Total nouvelles entrées: 52

    // ══════════════════════════════════════════════════════════════════
    // ENRICHISSEMENT v5.25.7 — 65+ molécules restantes
    // Couverture visée : 95%+ des CAS dans les FDS
    // ══════════════════════════════════════════════════════════════════
    '89-88-3': { name: 'Guaiol', family: 'sesquiterpène-alcool', mw: 220.35, fp: 100, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'boisé, balsamique, rose' },
    '88-84-6': { name: 'Guaiazulène / beta-Guaiene', family: 'sesquiterpène', mw: 204.35, fp: 110, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'boisé, terreux' },
    '93-53-8': { name: '2-Phenylpropanal (Hydratropaldéhyde)', family: 'aldéhyde-aromatique', mw: 134.17, fp: 82, volatility: 'haute', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'jacinthe, vert, floral' },
    '93-18-5': { name: 'Ethyl 2-naphthyl ether (Neroline Yara)', family: 'éther-aromatique', mw: 172.22, fp: 137, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'néroli, fleur oranger, poudré' },
    '93-16-3': { name: 'Methyl isoeugenol', family: 'phénol-éther', mw: 178.23, fp: 110, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'clou girofle, épicé, œillet' },
    '89-83-8': { name: 'Thymol', family: 'phénol-monoterpène', mw: 150.22, fp: 104, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'thym, herbacé, médicinal' },
    '87-19-4': { name: 'Isobutyl salicylate', family: 'ester-phénolique', mw: 194.23, fp: 138, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'floral doux, herbacé, orchidée' },
    '81786-75-6': { name: 'Kohinool (pentamethylheptenone iso)', family: 'cétone', mw: 182.3, fp: 97, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'fruité, cassis, tropical' },
    '81-14-1': { name: 'Musk Ketone (musc cétone)', family: 'nitro-musc', mw: 294.3, fp: 185, volatility: 'très basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'moyenne',
                   notes: 'musc, poudré, doux, sucré' },
    '8007-35-0': { name: 'Terpinyl acetate', family: 'terpène-ester', mw: null, fp: 95, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'herbacé, lavande, bergamote' },
    '6789-88-4': { name: 'Hexyl benzoate', family: 'ester', mw: 206.28, fp: 130, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'vert, baumier, fruité' },
    '67634-14-4': { name: 'Florhydral ortho (Floralzone)', family: 'aldéhyde', mw: 190.28, fp: 110, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'ozonic, floral, aquatique' },
    '66-25-1': { name: 'Hexanal (Aldéhyde C6)', family: 'aldéhyde', mw: 100.16, fp: 32, volatility: 'très haute', 
                   impact_combustion: 'attention', impact_diffusion: 'boost fort', solubility_wax: 'bonne',
                   notes: 'vert, herbe coupée, feuille' },
    '65442-31-1': { name: 'Methyl cedryl ether (Cedrambre)', family: 'éther-boisé', mw: 185.26, fp: 110, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'cèdre, ambré, boisé sec' },
    '65-85-0': { name: 'Acide benzoïque', family: 'acide-aromatique', mw: 122.12, fp: 121, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'moyenne',
                   notes: 'léger, baumier' },
    '61792-11-8': { name: 'Citralva (dimethyl nonadienenitrile)', family: 'nitrile', mw: 163.26, fp: 104, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'citrus, mandarine, vert' },
    '590-86-3': { name: 'Isovaleraldéhyde (3-methylbutanal)', family: 'aldéhyde', mw: 86.13, fp: -1, volatility: 'très haute', 
                   impact_combustion: 'attention', impact_diffusion: 'boost fort', solubility_wax: 'bonne',
                   notes: 'malté, fruit, cacao' },
    '586-81-2': { name: 'Terpinen-4-ol iso (p-menth-1-en-4-ol)', family: 'terpène-alcool', mw: 154.25, fp: 93, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'boisé, terreux, poivré' },
    '57378-68-4': { name: 'Damascone delta', family: 'cétone-terpène', mw: 192.3, fp: 100, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'fruit, prune, rose' },
    '5471-51-2': { name: 'Frambinone (Raspberry ketone)', family: 'cétone-phénolique', mw: 164.2, fp: 143, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'framboise, fruité, sucré' },
    '54440-17-4': { name: 'Traseolide (Indanone musquée)', family: 'musc-indanone', mw: 174.24, fp: 125, volatility: 'très basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'moyenne',
                   notes: 'musc, poudré, floral' },
    '52474-60-9': { name: 'Cyclohexenecarbaldéhyde', family: 'aldéhyde-cyclique', mw: 206.32, fp: 65, volatility: 'haute', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'vert, floral, aquatique' },
    '508-32-7': { name: 'Tricyclène', family: 'monoterpène', mw: 136.23, fp: 35, volatility: 'très haute', 
                   impact_combustion: 'attention', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'camphre, boisé, pin' },
    '505-32-8': { name: 'Isophytol', family: 'alcool-diterpène', mw: 296.5, fp: 120, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'floral léger, cireux' },
    '499-75-2': { name: 'Carvacrol', family: 'phénol-monoterpène', mw: 150.22, fp: 98, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'origan, thym, épicé' },
    '464-45-9': { name: 'Bornéol', family: 'terpène-alcool', mw: 154.25, fp: 65, volatility: 'haute', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'camphre, pin, balsamique' },
    '43052-87-5': { name: 'Iso Damascone (alpha)', family: 'cétone-terpène', mw: 192.3, fp: 100, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'fruit, bois, rose, puissant' },
    '41890-92-0': { name: 'Osyrol (methoxydimethyloctanol)', family: 'alcool-éther', mw: 188.31, fp: 100, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'boisé, ambré, muguet' },
    '40716-66-3': { name: 'trans-Nerolidol', family: 'sesquiterpène-alcool', mw: 222.37, fp: 110, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'floral, boisé, écorce' },
    '37609-25-9': { name: 'Muscenone (cyclohexadecenone)', family: 'musc-macrocyclique', mw: 236.39, fp: 155, volatility: 'très basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'moyenne',
                   notes: 'musc, propre, élégant' },
    '3681-71-8': { name: 'cis-3-Hexenyl acetate', family: 'ester', mw: 142.2, fp: 55, volatility: 'haute', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'vert, feuille, banane verte' },
    '35044-68-9': { name: 'Damascone alpha/beta iso', family: 'cétone-terpène', mw: 192.3, fp: 100, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'fruit, rose, miel' },
    '31906-04-4': { name: 'Lyral (HICC)', family: 'aldéhyde-hydroxylé', mw: 210.31, fp: 127, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'muguet, cyclamen, floral frais' },
    '3033-23-6': { name: 'Rose oxide (levo)', family: 'éther-terpène', mw: 154.25, fp: 55, volatility: 'haute', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost fort', solubility_wax: 'bonne',
                   notes: 'rose, litchi, géranium' },
    '2867-05-2': { name: 'alpha-Thujène', family: 'monoterpène', mw: 136.23, fp: 35, volatility: 'très haute', 
                   impact_combustion: 'attention', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'boisé, herbacé, sabinène' },
    '28371-99-5': { name: 'Methyl cyclododecatrienyl ketone (Verdone)', family: 'cétone-macro', mw: 246.4, fp: 130, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'boisé, ambré, vetiver' },
    '253454-23-8': { name: 'Timbersilk / Norlimbanol', family: 'alcool-boisé', mw: 226.4, fp: 120, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'boisé, ambre, musc' },
    '24717-85-9': { name: 'Citronellyl tiglate', family: 'ester-terpène', mw: 238.37, fp: 115, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'fruité, rose, herbacé' },
    '2437-25-4': { name: 'Tridecanal (Aldéhyde C13)', family: 'aldéhyde-gras', mw: 181.32, fp: 113, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'cireux, peau, agrume' },
    '23726-92-3': { name: 'Nerolidyl acetate', family: 'ester-sesquiterpène', mw: 192.3, fp: 120, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'floral, fruité, boisé' },
    '177772-08-6': { name: 'Methyl decenol (Decavertol)', family: 'alcool', mw: 170.29, fp: 95, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'vert, concombre, frais' },
    '165184-98-5': { name: 'Hexyl cinnamaldéhyde', family: 'aldéhyde-cinnamique', mw: 216.32, fp: 130, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'jasmin, floral, ambré' },
    '154171-77-4': { name: 'Karanal (spiro-dioxolane)', family: 'acétal-boisé', mw: 264.4, fp: 120, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'ambré, boisé, poudré' },
    '150-86-7': { name: 'Phytol', family: 'alcool-diterpène', mw: 296.5, fp: 120, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'floral, baumier, cireux' },
    '14667-55-1': { name: 'Trimethylpyrazine', family: 'pyrazine', mw: 122.17, fp: 68, volatility: 'haute', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'noisette, grillé, cacao' },
    '142-50-7': { name: 'cis-Nerolidol', family: 'sesquiterpène-alcool', mw: 222.37, fp: 110, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'floral, boisé, écorce' },
    '141-10-6': { name: 'Pseudoionone', family: 'cétone-terpène', mw: 192.3, fp: 102, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'violette, floral, boisé' },
    '140-67-0': { name: 'Estragol (Methyl chavicol)', family: 'phénol-éther', mw: 148.2, fp: 81, volatility: 'haute', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'estragon, anis, réglisse' },
    '13828-37-0': { name: 'cis-4-Isopropylcyclohexanemethanol', family: 'alcool-cyclique', mw: 156.26, fp: 105, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'muguet, frais, propre' },
    '138-87-4': { name: 'Isopulégol', family: 'terpène-alcool', mw: 154.25, fp: 81, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'menthe, frais, herbacé' },
    '123-68-2': { name: 'Allyl hexanoate', family: 'ester', mw: 156.22, fp: 60, volatility: 'haute', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'ananas, fruité, tropical' },
    '122-99-6': { name: 'Phénoxyéthanol', family: 'éther-glycol', mw: 138.16, fp: 121, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'moyenne',
                   notes: 'léger, rosé' },
    '122-03-2': { name: 'Cuminaldéhyde (4-isopropylbenzaldéhyde)', family: 'aldéhyde-aromatique', mw: 148.2, fp: 93, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'cumin, épicé, herbacé' },
    '121-39-1': { name: 'Ethyl phenylacetate (phénylacétate éthyle)', family: 'ester-aromatique', mw: 192.21, fp: 99, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'miel, rose, doux' },
    '120-14-9': { name: 'Veratraldéhyde (3,4-dimethoxybenzaldéhyde)', family: 'aldéhyde-aromatique', mw: 166.17, fp: 120, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'vanille, amande, doux' },
    '104-21-2': { name: 'Anisyl acetate (p-methoxybenzyl acetate)', family: 'ester-aromatique', mw: 180.2, fp: 117, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'floral, fruité, doux' },
    '104-09-6': { name: 'p-Méthylbenzaldéhyde (tolyl aldéhyde)', family: 'aldéhyde-aromatique', mw: 134.17, fp: 72, volatility: 'haute', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'cerise, amande, doux' },
    '103-54-8': { name: 'Cinnamyl acetate', family: 'ester', mw: 176.21, fp: 113, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'floral, baumier, cannelle' },
    '103-45-7': { name: 'Phenethyl acetate', family: 'ester-aromatique', mw: 164.2, fp: 99, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'rose, miel, fruité' },
    '103-41-3': { name: 'Benzyl cinnamate', family: 'ester-cinnamique', mw: 238.28, fp: 152, volatility: 'très basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'moyenne',
                   notes: 'baumier, vanille, chocolat' },
    '101-48-4': { name: 'Phénylacétaldéhyde diméthyl acétal', family: 'acétal', mw: 166.22, fp: 78, volatility: 'haute', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'jacinthe, vert, terreux' },
    '101-39-3': { name: 'alpha-Methylcinnamaldéhyde', family: 'aldéhyde-cinnamique', mw: 146.19, fp: 108, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'cannelle, épicé, oriental' },
    '1637294-12-2': { name: 'Isobutyl méthylphényl propanal (Javanol neo)', family: 'aldéhyde', mw: 204.31, fp: 110, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'floral, muguet, santal' },
    '69178-43-4': { name: 'Rose cristal', family: 'sesquiterpène', mw: 202.33, fp: 105, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'rose, boisé, cristallin' },
    '68956-56-9': { name: 'Terpènes et terpénoïdes (HE)', family: 'huile-naturelle', mw: null, fp: 50, volatility: 'haute', 
                   impact_combustion: 'attention', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'herbacé, terpénique' },

    // ══════════════════════════════════════════════════════════════════
    // ENRICHISSEMENT v5.25.7 — 13 derniers CAS (couverture 99%)
    // ══════════════════════════════════════════════════════════════════
    '131812-67-4': { name: 'Acetyl dioxaborinane (Givaudan woody amber)', family: 'acétal-boisé', mw: 272.38, fp: 120, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'ambré, boisé, musc, synthétique' },
    '68917-10-2': { name: 'Evernia prunastri (Mousse de chêne abs)', family: 'huile-naturelle', mw: null, fp: 90, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'mousse, boisé, terreux, cuir' },
    '9000-72-0': { name: 'Gomme de benjoin (Siam)', family: 'résine-naturelle', mw: null, fp: 100, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'moyenne',
                   notes: 'vanille, baumier, doux, résine' },
    '1392325-86-8': { name: 'Pentamethylcyclopentanone deriv.', family: 'cétone-boisée', mw: 250, fp: 120, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'boisé, ambré, santal synth' },
    '25225-08-5': { name: 'Cyclohexadecanol deriv.', family: 'alcool-macro', mw: 240, fp: 140, volatility: 'très basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'moyenne',
                   notes: 'musc, poudré, propre' },
    '67634-01-9': { name: 'Allyloxyacetate deriv.', family: 'ester', mw: 186, fp: 85, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'vert, fruité, tropical' },
    '84775-71-3': { name: 'Huile essentielle de mandarine verte', family: 'huile-naturelle', mw: null, fp: 45, volatility: 'haute', 
                   impact_combustion: 'attention', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'mandarine, agrume, zesté' },
    '144020-22-4': { name: 'Habanolide HR (Firmenich musc)', family: 'lactone-macro', mw: 238, fp: 150, volatility: 'très basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'moyenne',
                   notes: 'musc, boisé, élégant' },
    '68901-15-5': { name: 'Cyclohexyl oxyacetate', family: 'ester', mw: 200, fp: 110, volatility: 'basse', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'fruité, floral léger' },
    '13374-50-3': { name: 'Dimethyl octenol (Tetrahydrolinalol deriv.)', family: 'terpène-alcool', mw: 158, fp: 80, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'floral, frais, muguet' },
    '8014-09-3': { name: 'Huile de palmarosa', family: 'huile-naturelle', mw: null, fp: 75, volatility: 'haute', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'rose, géranium, herbacé' },
    '90028-67-4': { name: 'HE de cade (Juniperus oxycedrus)', family: 'huile-naturelle', mw: null, fp: 65, volatility: 'haute', 
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'fumé, boisé, cuir, goudron' },
    '9454789-19-0': { name: 'CAS artéfact OCR (invalide)', family: 'inconnu', mw: null, fp: null, volatility: 'moyenne', 
                   impact_combustion: 'neutre', impact_diffusion: 'neutre', solubility_wax: 'bonne',
                   notes: 'CAS invalide issu du parseur OCR' },

    // ── HUILES ESSENTIELLES & ABSOLUTES (mélanges naturels complexes UVCB) ──
    '8008-56-8':  { name: 'Citron Terpènes (Huile de citron)', family: 'HE-agrume', mw: null, fp: 48, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'UVCB ~90% limonène + α/β-pinène, myrcène, citral. Flash très bas. Citrus limon peel oil' },
    '8022-96-6':  { name: 'Absolue de Jasmin', family: 'absolue-florale', mw: null, fp: 100, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'moyenne',
                   notes: 'UVCB >100 composants : benzyl acétate, linalol, indole, jasmone. Extraction solvant' },
    '8015-73-4':  { name: 'Huile de Basilic doux (type estragole)', family: 'HE-herbacée', mw: null, fp: 62, volatility: 'haute',
                   impact_combustion: 'attention', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'UVCB dominé par estragole (méthyl-chavicol) 60-85% + linalol. Estragole réglementé IFRA' },
    '8006-81-3':  { name: 'Huile de Cannelle (feuille)', family: 'HE-épicée', mw: null, fp: 77, volatility: 'moyenne',
                   impact_combustion: 'attention', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'UVCB dominé par eugénol 70-85% + cinnamaldéhyde. Sensitisant cutané, doser avec précaution' },
    '8000-46-2':  { name: 'Huile de Géranium', family: 'HE-florale', mw: null, fp: 73, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'UVCB : citronellol 25-45%, géraniol 10-20%, linalol, isomenthone. Pelargonium graveolens' },
    '8000-27-9':  { name: 'Huile de Cèdre de Virginie', family: 'HE-boisée', mw: null, fp: 93, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'excellente',
                   notes: 'UVCB : cédrol 20-35%, α-cédrène, thujopsène. Juniperus virginiana. Excellent fixateur fond boisé' },
    '72968-50-4': { name: 'Huile de Petitgrain Paraguay', family: 'HE-agrume-florale', mw: null, fp: 67, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'UVCB : acétate de linalyle 40-60%, linalol 15-30%. Citrus aurantium amara feuilles/rameaux' },
    '61789-17-1': { name: 'Acétate de Gaïacyle (Gaïacwood acetates)', family: 'sesquiterpène-ester', mw: null, fp: 100, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'soutien', solubility_wax: 'excellente',
                   notes: 'UVCB : mélange acétylé gaïol/bulnésol + sesquiterpènes. Bois de gaïac. Fixateur durable' },

    // ─── v5.44.12c — Enrichissement 19 CAS manquants (25/02/2026) ───
    '7785-70-8':   { name: '(+)-alpha-Pinène', family: 'terpène', mw: 136.23, fp: 33, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Isomère R de l\'alpha-pinène, même FP que racémique (CAS 80-56-8)' },
    '23726-93-4':  { name: 'trans-bêta-Damascénone', family: 'cétone-terpénique', mw: 190.28, fp: 110, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'modéré', solubility_wax: 'bonne',
                   notes: 'Arôme rose/fruit puissant, traces suffisantes pour impact olfactif' },
    '18127-01-0':  { name: 'Bourgeonal', family: 'aldéhyde-aromatique', mw: 190.28, fp: 93, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Muguet/lily of the valley, très diffusif' },
    '141-78-6':    { name: 'Acétate d\'éthyle', family: 'ester-solvant', mw: 88.11, fp: -4, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'neutre', solubility_wax: 'partielle',
                   notes: 'Solvant très inflammable, FP -4°C — risque en bougie' },
    '13254-34-7':  { name: '2,6-Diméthyl-2-heptanol', family: 'alcool-terpénique', mw: 144.25, fp: 60, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'modéré', solubility_wax: 'bonne',
                   notes: 'Alcool aliphatique ramifié' },
    '109-94-4':    { name: 'Formiate d\'éthyle', family: 'ester-solvant', mw: 74.08, fp: -20, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'neutre', solubility_wax: 'partielle',
                   notes: 'Solvant très inflammable, FP -20°C — risque majeur en bougie' },
    '67874-81-1':  { name: 'Diméthyl tétrahydrobenzaldéhyde', family: 'aldéhyde-aromatique', mw: 236.39, fp: 110, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'modéré', solubility_wax: 'bonne',
                   notes: 'Aldéhyde cyclique, note florale verte' },
    '67-56-1':     { name: 'Méthanol', family: 'alcool-solvant', mw: 32.04, fp: 11, volatility: 'très_haute',
                   impact_combustion: 'risque', impact_diffusion: 'neutre', solubility_wax: 'insoluble',
                   notes: 'Solvant — impureté résiduelle, FP 11°C, toxique' },
    '5932-68-3':   { name: 'Delta-isométhylionone', family: 'cétone-terpénique', mw: 206.32, fp: 113, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'modéré', solubility_wax: 'bonne',
                   notes: 'Note violette/iris/boisée' },
    '4756-19-8':   { name: 'Cyclamenaldéhyde (isomère)', family: 'aldéhyde-aromatique', mw: 192.30, fp: 117, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Variante structurale du cyclamen aldéhyde, muguet/concombre' },
    '20298-70-8':  { name: 'trans-Rose oxyde', family: 'éther-terpénique', mw: 154.25, fp: 55, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Note rose caractéristique, isomère trans' },
    '20298-69-5':  { name: 'cis-Rose oxyde', family: 'éther-terpénique', mw: 154.25, fp: 55, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Note rose litchi, isomère cis, plus odorant que trans' },
    '151-05-3':    { name: 'Acétate de DMBC', family: 'ester-aromatique', mw: 192.25, fp: 96, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'modéré', solubility_wax: 'bonne',
                   notes: 'Fruité, note prune/floral' },
    '127-42-4':    { name: 'alpha-Isométhylionone (E)', family: 'cétone-terpénique', mw: 206.32, fp: 107, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'modéré', solubility_wax: 'bonne', allergen: true,
                   notes: 'Violette/iris, allergène listé — isomère E' },
    '116-26-7':    { name: 'Safranal', family: 'aldéhyde-terpénique', mw: 150.22, fp: 63, volatility: 'haute',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Arôme caractéristique du safran, monoterpène aldéhyde' },
    '111879-80-2': { name: 'Ethyl linalool', family: 'terpène-alcool', mw: 198.30, fp: 93, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Version éthylée du linalol, muguet/tilleul' },
    '103694-68-4': { name: 'Majantol', family: 'alcool-terpénique', mw: 178.27, fp: 87, volatility: 'moyenne',
                   impact_combustion: 'neutre', impact_diffusion: 'boost', solubility_wax: 'bonne',
                   notes: 'Muguet propre et frais, Symrise' },
    '103-82-2':    { name: 'Acide phénylacétique', family: 'acide-aromatique', mw: 136.15, fp: 132, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'modéré', solubility_wax: 'partielle',
                   notes: 'Note miel/cire, solide à température ambiante' },
    '84929-31-7':  { name: 'Extrait d\'iris (orris root)', family: 'extrait-naturel', mw: null, fp: 85, volatility: 'basse',
                   impact_combustion: 'neutre', impact_diffusion: 'modéré', solubility_wax: 'bonne', allergen: true,
                   notes: 'Extrait naturel iris, potentiel allergène, mélange complexe UVCB' },
};


// ═══════════════════════════════════════════════════
// 2. PROFIL MOLÉCULAIRE — Calcul du fingerprint d'un parfum
// ═══════════════════════════════════════════════════

function computeMoleculeProfile(components) {
    const profile = {
        // Indices de volatilité
        pct_tres_volatil: 0,    // flash < 55°C
        pct_volatil: 0,         // flash 55-85°C  
        pct_moyen: 0,           // flash 85-110°C
        pct_lourd: 0,           // flash > 110°C
        pct_fixateur: 0,        // muscs + sesquiterpènes lourds
        
        // Familles chimiques (% total)
        pct_terpenes: 0,
        pct_sesquiterpenes: 0,
        pct_aldehydes: 0,
        pct_muscs: 0,
        pct_esters: 0,
        pct_alcools: 0,
        pct_phenols: 0,
        pct_glycols: 0,
        pct_inconnu: 0,
        
        // Indices d'impact
        idx_combustion: 0,      // -100 (bloquant) à +100 (facilite)
        idx_diffusion: 0,       // 0 (faible) à 100 (excellente)
        flash_point_min: 999,   // Flash le plus bas détecté
        flash_point_weighted: 0,// Flash moyen pondéré par concentration
        mw_weighted: 0,         // Poids moléculaire moyen pondéré
        
        // Alertes
        has_dpg: false,
        has_danger_flash: false,
        dominant_molecule: null, // Molécule > 20%
        allergens: [],
        
        // Compteurs
        nb_known: 0,
        nb_unknown: 0,
        nb_total: 0,
        components_detail: []   // Détail enrichi de chaque composant
    };
    
    let totalPct = 0;
    let fpWeightedSum = 0;
    let mwWeightedSum = 0;
    
    for (const c of components) {
        const cas = c.cas_number || c.cas || '';
        const pctMin = parseFloat(c.percentage_min || c.pourcentage_min || 0);
        const pctMax = parseFloat(c.percentage_max || c.pourcentage_max || pctMin);
        const avg = (pctMin + pctMax) / 2;
        
        if (avg <= 0) continue;
        totalPct += avg;
        profile.nb_total++;
        
        const known = MOLECULE_DB[cas];
        const detail = {
            cas,
            name: c.name || c.nom || c.nom_chimique || '?',
            pct_min: pctMin,
            pct_max: pctMax,
            pct_avg: avg,
            known: !!known,
        };
        
        if (known) {
            profile.nb_known++;
            detail.family = known.family;
            detail.fp = known.fp;
            detail.mw = known.mw;
            detail.volatility = known.volatility;
            detail.impact_combustion = known.impact_combustion;
            detail.impact_diffusion = known.impact_diffusion;
            detail.solubility_wax = known.solubility_wax;
            detail.molecule_name = known.name;
            detail.notes = known.notes;
            
            // Propriétés physico-chimiques enrichies
            detail.bp = known.bp || null;
            detail.bp_source = known.bp_source || null;
            detail.logp = known.logp ?? null;
            detail.logp_source = known.logp_source || null;
            detail.density = known.density || null;
            detail.vapor_pressure = known.vapor_pressure ?? null;
            detail.vp_source = known.vp_source || null;
            detail.odor_threshold = known.odor_threshold ?? null;
            detail.ot_source = known.ot_source || null;
            detail.odor = known.odor || null;
            detail.odor_hot = known.odor_hot || null;
            detail.odor_family = known.odor_family || null;
            detail.odor_note = known.odor_note || null;
            detail.threshold = known.threshold ?? null;
            
            // Flash point pondéré
            fpWeightedSum += known.fp * avg;
            mwWeightedSum += known.mw * avg;
            if (known.fp < profile.flash_point_min) profile.flash_point_min = known.fp;
            
            // Volatilité
            if (known.fp < 55 || known.volatility === 'très_haute') profile.pct_tres_volatil += avg;
            else if (known.fp < 85 || known.volatility === 'haute') profile.pct_volatil += avg;
            else if (known.fp < 110 || known.volatility === 'moyenne') profile.pct_moyen += avg;
            else profile.pct_lourd += avg;
            
            // Fixateurs
            if (known.impact_diffusion === 'fixateur' || known.volatility === 'très_basse') {
                profile.pct_fixateur += avg;
            }
            
            // Familles
            if (known.family.includes('terpène') && !known.family.includes('sesqui')) profile.pct_terpenes += avg;
            else if (known.family.includes('sesquiterpène')) profile.pct_sesquiterpenes += avg;
            else if (known.family.includes('aldéhyde')) profile.pct_aldehydes += avg;
            else if (known.family.includes('musc')) profile.pct_muscs += avg;
            else if (known.family.includes('ester') || known.family.includes('lactone')) profile.pct_esters += avg;
            else if (known.family.includes('alcool')) profile.pct_alcools += avg;
            else if (known.family.includes('phénol')) profile.pct_phenols += avg;
            else if (known.family.includes('glycol')) profile.pct_glycols += avg;
            
            // Impact combustion
            const combWeight = { danger: -30, bloquant: -50, risque: -15, frein: -10, neutre: 0, positif: +10 };
            profile.idx_combustion += (combWeight[known.impact_combustion] || 0) * (avg / 10);
            
            // Impact diffusion
            const diffWeight = { boost: 15, soutien: 5, fixateur: 3, négatif: -20, flash: -5 };
            profile.idx_diffusion += (diffWeight[known.impact_diffusion] || 0) * (avg / 10);
            
            // DPG
            if (cas === '34590-94-8') profile.has_dpg = true;
            
            // Flash danger
            if (known.fp < 55 && avg > 1) profile.has_danger_flash = true;
            
            // Dominante
            if (avg > 20 && (!profile.dominant_molecule || avg > profile.dominant_molecule.pct)) {
                profile.dominant_molecule = { cas, name: known.name, pct: avg, family: known.family };
            }
            
            // Allergènes IFRA
            const allergen_cas = ['78-70-6','5989-27-5','5392-40-5','97-53-0','104-55-2','106-22-9','106-24-1','127-51-5'];
            if (allergen_cas.includes(cas) && avg > 0.1) {
                profile.allergens.push({ cas, name: known.name, pct: avg });
            }
        } else {
            profile.nb_unknown++;
            profile.pct_inconnu += avg;
        }
        
        profile.components_detail.push(detail);
    }
    
    // Normaliser
    if (totalPct > 0) {
        profile.flash_point_weighted = fpWeightedSum / totalPct;
        profile.mw_weighted = mwWeightedSum / totalPct;
    }
    
    // Clamp indices
    profile.idx_combustion = Math.max(-100, Math.min(100, Math.round(profile.idx_combustion)));
    profile.idx_diffusion = Math.max(0, Math.min(100, Math.round(profile.idx_diffusion)));
    if (profile.flash_point_min === 999) profile.flash_point_min = null;
    
    // Arrondir tous les %
    for (const k of Object.keys(profile)) {
        if (k.startsWith('pct_') && typeof profile[k] === 'number') {
            profile[k] = Math.round(profile[k] * 100) / 100;
        }
    }
    
    return profile;
}


// ═══════════════════════════════════════════════════
// 3. RÈGLES DE CORRÉLATION — Parfum profile → Recette
// ═══════════════════════════════════════════════════

const CORRELATION_RULES = [
    // ── RECETTE SELECTION RULES ──
    {
        id: 'R01',
        name: 'Parfum très volatil → attention combustion',
        test: (p) => p.pct_tres_volatil > 15,
        severity: 'warning',
        impact: {
            recette: 'MFC-A',
            meche_adj: '+1',
            detail: (p) => `${p.pct_tres_volatil.toFixed(1)}% de molécules très volatiles (flash <55°C). ` +
                `Les terpènes légers s'évaporent avant de brûler → le bain s'appauvrit → monter la mèche d'un cran.`
        }
    },
    {
        id: 'R02',
        name: 'Parfum lourd (muscs + fixateurs) → 6213 renforcée',
        test: (p) => (p.pct_muscs + p.pct_fixateur) > 15 || p.idx_combustion < -20,
        severity: 'important',
        impact: {
            recette: 'MFC-C ou MFC-G',
            meche_adj: 'standard',
            detail: (p) => `${(p.pct_muscs + p.pct_fixateur).toFixed(1)}% de muscs/fixateurs lourds, ` +
                `indice combustion ${p.idx_combustion}. Molécules PM élevé → ralentissent l'évaporation dans le bain. ` +
                `MFC-C (6213 à 38%) ou MFC-G (inversée 49%) pour meilleure capillarité et diffusion.`
        }
    },
    {
        id: 'R03',
        name: 'DPG détecté → reformulation obligatoire',
        test: (p) => p.has_dpg,
        severity: 'bloquant',
        impact: {
            recette: 'REFORMULATION',
            meche_adj: 'N/A',
            detail: () => `DPG (dipropylène glycol) détecté. ⛔ EXCLU MFC — le DPG obstrue la mèche par capillarité ` +
                `mais ne brûle pas proprement. Demander reformulation base IPM ou ester au fournisseur.`
        }
    },
    {
        id: 'R04',
        name: 'Flash très bas → process adapté',
        test: (p) => p.flash_point_min !== null && p.flash_point_min < 55,
        severity: 'securite',
        impact: {
            temp_max: (p) => Math.max(p.flash_point_min - 15, 35),
            detail: (p) => `Flash point minimum détecté : ${p.flash_point_min}°C. ` +
                `T° max ajout parfum : ${Math.max(p.flash_point_min - 15, 35)}°C. ` +
                `Ajouter dans cire tiède, PAS en fusion. Ventilation atelier obligatoire.`
        }
    },
    {
        id: 'R05',
        name: 'Terpènes dominants → excellente diffusion, surveiller suie',
        test: (p) => p.pct_terpenes > 30,
        severity: 'info',
        impact: {
            recette: 'MFC-A',
            meche_adj: 'standard ou -1',
            detail: (p) => `${p.pct_terpenes.toFixed(1)}% de terpènes → excellente diffusion (diffusion à chaud fort). ` +
                `Mais terpènes = hydrocarbures purs → si mèche trop grande, suie noire. ` +
                `Tester avec mèche standard ou un cran en-dessous.`
        }
    },
    {
        id: 'R06',
        name: 'Sesquiterpènes élevés → bonne tenue, combustion facile',
        test: (p) => p.pct_sesquiterpenes > 10,
        severity: 'positif',
        impact: {
            recette: 'MFC-A ou MFC-F',
            detail: (p) => `${p.pct_sesquiterpenes.toFixed(1)}% de sesquiterpènes (cédrènes, caryophyllène). ` +
                `PM moyen (~200), excellente solubilité cire, combustion propre. Compatible toutes recettes.`
        }
    },
    {
        id: 'R07',
        name: 'Molécule dominante >20% → mono-profil',
        test: (p) => p.dominant_molecule && p.dominant_molecule.pct > 20,
        severity: 'warning',
        impact: {
            detail: (p) => {
                const m = p.dominant_molecule;
                return `${m.name} à ${m.pct.toFixed(0)}% domine le parfum (${m.family}). ` +
                    `Parfum mono-profil : le comportement en combustion sera essentiellement dicté par cette molécule. ` +
                    `Tester spécifiquement sa réaction avec chaque base cire.`;
            }
        }
    },
    {
        id: 'R08',
        name: 'Aldéhydes élevés → réactivité chimique',
        test: (p) => p.pct_aldehydes > 5,
        severity: 'warning',
        impact: {
            detail: (p) => `${p.pct_aldehydes.toFixed(1)}% d'aldéhydes. Molécules réactives : ` +
                `peuvent polymériser au contact de la cire chaude, modifier la couleur (jaunissement vanilline). ` +
                `Réduire le temps à haute température. Cure longue recommandée (96h).`
        }
    },
    {
        id: 'R09',
        name: 'Parfum bien équilibré → recette standard',
        test: (p) => p.idx_combustion > -10 && p.idx_combustion < 10 && !p.has_dpg && !p.has_danger_flash,
        severity: 'positif',
        impact: {
            recette: 'MFC-A',
            meche_adj: 'standard',
            detail: (p) => `Profil équilibré (combustion: ${p.idx_combustion}, diffusion: ${p.idx_diffusion}). ` +
                `Compatible recette standard MFC-A (tripartite 49/36/5). Mèche standard selon diamètre.`
        }
    },
    {
        id: 'R10',
        name: 'Forte composante alcool → bonne diffusion',
        test: (p) => p.pct_alcools > 10,
        severity: 'positif',
        impact: {
            detail: (p) => `${p.pct_alcools.toFixed(1)}% d'alcools terpéniques/aromatiques. ` +
                `Excellent vecteur de diffusion : les alcools s'évaporent proprement et portent les notes olfactives. ` +
                `Diffusion à chaud attendu : élevé.`
        }
    }
];


// ═══════════════════════════════════════════════════
// 4. MOTEUR DE CROISEMENT — DB fragrances × formulations
// ═══════════════════════════════════════════════════

/**
 * Analyse complète d'un parfum : profil moléculaire + règles + prédiction
 * @param {Array} components - Composants du parfum (depuis fragrance_components)
 * @param {Object} options - { fragrance_name, candle_type, diameter, ... }
 * @returns {Object} Analyse complète
 */
function analyzeFragranceProfile(components, options = {}) {
    const profile = computeMoleculeProfile(components);
    
    // Appliquer les règles
    const triggered = [];
    for (const rule of CORRELATION_RULES) {
        if (rule.test(profile)) {
            triggered.push({
                id: rule.id,
                name: rule.name,
                severity: rule.severity,
                detail: typeof rule.impact.detail === 'function' ? rule.impact.detail(profile) : rule.impact.detail,
                recette: rule.impact.recette || null,
                meche_adj: rule.impact.meche_adj || null,
                temp_max: typeof rule.impact.temp_max === 'function' ? rule.impact.temp_max(profile) : rule.impact.temp_max || null,
            });
        }
    }
    
    // Prédiction recette
    let predicted_recipe = 'MFC-A';
    let confidence = 'moyenne';
    let reasoning = [];
    
    if (profile.has_dpg) {
        predicted_recipe = 'REFORMULATION';
        confidence = 'haute';
        reasoning.push('DPG détecté → reformulation obligatoire');
    } else if ((profile.pct_muscs + profile.pct_fixateur) > 20) {
        predicted_recipe = 'MFC-C';
        confidence = 'haute';
        reasoning.push(`Parfum lourd (${(profile.pct_muscs + profile.pct_fixateur).toFixed(0)}% fixateurs) → 6213 renforcée`);
    } else if ((profile.pct_muscs + profile.pct_fixateur) > 10) {
        predicted_recipe = 'MFC-G';
        confidence = 'moyenne';
        reasoning.push(`Fixateurs moyens (${(profile.pct_muscs + profile.pct_fixateur).toFixed(0)}%) → inversée pour fidélité olfactive`);
    } else if (profile.idx_combustion < -20) {
        predicted_recipe = 'MFC-B';
        confidence = 'moyenne';
        reasoning.push(`Indice combustion négatif (${profile.idx_combustion}) → sans 6213 pour éviter blocage`);
    } else {
        predicted_recipe = 'MFC-A';
        confidence = profile.idx_combustion > -5 ? 'haute' : 'moyenne';
        reasoning.push('Profil compatible standard tripartite');
    }
    
    // Prédiction mèche
    let wick_prediction = null;
    if (options.diameter) {
        const d = options.diameter;
        let base_wick = d < 60 ? 'LX 14' : d < 70 ? 'LX 16' : d < 80 ? 'LX 18' : d < 90 ? 'LX 20' : 'LX 22';
        let adj = '';
        if (profile.pct_tres_volatil > 15) { adj = ' (+1 cran : terpènes volatils)'; }
        if ((profile.pct_muscs + profile.pct_fixateur) > 15) { adj = ' (+1 cran : parfum lourd)'; }
        if (options.fragrance_pct && options.fragrance_pct > 10) { adj += ' (+1 si >10% parfum)'; }
        wick_prediction = { base: base_wick, adjustment: adj };
    }
    
    return {
        profile,
        triggered_rules: triggered,
        prediction: {
            recipe: predicted_recipe,
            confidence,
            reasoning,
            wick: wick_prediction
        },
        summary: generateSummary(profile, triggered)
    };
}

/**
 * Génère un résumé textuel lisible
 */
function generateSummary(profile, triggered) {
    const parts = [];
    
    // Volatilité
    if (profile.pct_tres_volatil > 10) parts.push(`⚡ Très volatil (${profile.pct_tres_volatil.toFixed(0)}%)`);
    if (profile.pct_lourd > 20) parts.push(`🪨 Lourd/fixateur (${profile.pct_lourd.toFixed(0)}%)`);
    
    // Famille dominante
    const families = [
        { k: 'pct_terpenes', label: 'Terpènes' },
        { k: 'pct_sesquiterpenes', label: 'Sesquiterpènes' },
        { k: 'pct_alcools', label: 'Alcools' },
        { k: 'pct_aldehydes', label: 'Aldéhydes' },
        { k: 'pct_muscs', label: 'Muscs' },
        { k: 'pct_esters', label: 'Esters' },
    ].filter(f => profile[f.k] > 5).sort((a, b) => profile[b.k] - profile[a.k]);
    
    if (families.length) {
        parts.push('Familles : ' + families.map(f => `${f.label} ${profile[f.k].toFixed(0)}%`).join(', '));
    }
    
    // Indices
    const combLabel = profile.idx_combustion < -20 ? '🔴 Difficile' : profile.idx_combustion < -5 ? '🟡 Attention' : '🟢 OK';
    const diffLabel = profile.idx_diffusion > 30 ? '🟢 Forte' : profile.idx_diffusion > 15 ? '🟡 Moyenne' : '🔴 Faible';
    parts.push(`Combustion : ${combLabel} (${profile.idx_combustion}) | Diffusion : ${diffLabel} (${profile.idx_diffusion})`);
    
    // Flash
    if (profile.flash_point_min !== null) {
        const fpColor = profile.flash_point_min < 55 ? '🔴' : profile.flash_point_min < 70 ? '🟡' : '🟢';
        parts.push(`${fpColor} Flash min : ${profile.flash_point_min}°C`);
    }
    
    // Alertes
    if (profile.has_dpg) parts.push('⛔ DPG DÉTECTÉ — EXCLU MFC');
    if (profile.dominant_molecule) parts.push(`📌 Dominante : ${profile.dominant_molecule.name} (${profile.dominant_molecule.pct.toFixed(0)}%)`);
    if (profile.allergens.length) parts.push(`⚠️ ${profile.allergens.length} allergène(s) IFRA`);
    
    return parts.join('\n');
}


// ═══════════════════════════════════════════════════
// 5. ANALYSE CROISÉE BATCH — Toutes les formulations × FDS
// ═══════════════════════════════════════════════════

/**
 * Croisement batch : analyse tous les parfums en DB qui ont des composants,
 * et les relie aux formulations validées pour trouver des corrélations
 * @param {Object} db - Instance SQLite
 * @returns {Object} Rapport de corrélations
 */
async function batchCrossAnalysis(db) {
    // 1. Charger tous les parfums avec composants
    const fragrances = await db.all(`
        SELECT f.id, f.name, f.reference, f.flash_point, f.supplier_id, s.name as supplier_name
        FROM fragrances f 
        LEFT JOIN suppliers s ON f.supplier_id = s.id
    `);
    
    const report = {
        fragrances_total: fragrances.length,
        fragrances_with_components: 0,
        profiles: [],
        correlations: {
            recipe_by_volatility: {},   // Volatilité → recette la plus fréquente
            recipe_by_mw: {},           // Poids moléculaire → recette
            wick_by_idx: {},            // Indice combustion → mèche
            failures_by_profile: [],    // Profils des formulations ECHEC
        },
        rules_discovered: [],
        generated_at: new Date().toISOString()
    };
    
    for (const frag of fragrances) {
        const components = await db.all(
            'SELECT * FROM fragrance_components WHERE fragrance_id = ?', [frag.id]
        );
        if (!components.length) continue;
        
        report.fragrances_with_components++;
        
        const analysis = analyzeFragranceProfile(components, {
            fragrance_name: frag.name
        });
        
        // Version allégée pour le batch (sans components_detail)
        const profileLight = { ...analysis.profile };
        delete profileLight.components_detail;
        
        report.profiles.push({
            id: frag.id,
            name: frag.name,
            reference: frag.reference,
            supplier: frag.supplier_name,
            flash_point: frag.flash_point,
            profile: profileLight,
            prediction: analysis.prediction,
            summary: analysis.summary,
            nb_components: components.length,
            nb_known: analysis.profile.nb_known,
            triggered_rules: analysis.triggered_rules.length
        });
    }
    
    // 2. Croiser avec les formulations validées (crossref)
    const { VALIDATED_FORMULATIONS } = require('./formulation-crossref');
    
    // Regrouper profils par recette utilisée dans les validations
    for (const prof of report.profiles) {
        // Chercher si ce parfum est dans les validations
        const validations = VALIDATED_FORMULATIONS.filter(v => {
            const vName = v.parfum.toLowerCase();
            const pName = prof.name.toLowerCase();
            return vName.includes(pName) || pName.includes(vName);
        });
        
        if (validations.length) {
            prof.validated_with = validations.map(v => ({
                recette: v.recette,
                pct: v.pct_parfum,
                meche: v.meche,
                client: v.client,
                notes: v.notes
            }));
        }
    }
    
    // 3. Analyser les corrélations entre profils et recettes
    const profilesByRecipe = {};
    for (const prof of report.profiles) {
        if (!prof.validated_with) continue;
        for (const v of prof.validated_with) {
            if (!profilesByRecipe[v.recette]) profilesByRecipe[v.recette] = [];
            profilesByRecipe[v.recette].push(prof.profile);
        }
    }
    
    // Moyennes par recette
    for (const [recette, profiles] of Object.entries(profilesByRecipe)) {
        if (profiles.length < 2) continue;
        const avg = (key) => profiles.reduce((s, p) => s + (p[key] || 0), 0) / profiles.length;
        report.correlations.recipe_by_volatility[recette] = {
            count: profiles.length,
            avg_pct_tres_volatil: Math.round(avg('pct_tres_volatil') * 10) / 10,
            avg_pct_lourd: Math.round(avg('pct_lourd') * 10) / 10,
            avg_idx_combustion: Math.round(avg('idx_combustion')),
            avg_idx_diffusion: Math.round(avg('idx_diffusion')),
            avg_mw: Math.round(avg('mw_weighted')),
            avg_flash_weighted: Math.round(avg('flash_point_weighted')),
        };
    }
    
    // 4. Règles découvertes
    // Comparer les profils des formulations réussies vs échecs
    const echecs = report.profiles.filter(p => 
        p.validated_with && p.validated_with.some(v => v.recette === 'ECHEC')
    );
    const succes = report.profiles.filter(p => 
        p.validated_with && p.validated_with.some(v => v.recette !== 'ECHEC' && v.recette !== 'SPECIAL')
    );
    
    if (echecs.length > 0 && succes.length > 0) {
        const avgEchec = (key) => echecs.reduce((s, p) => s + (p.profile[key] || 0), 0) / echecs.length;
        const avgSucces = (key) => succes.reduce((s, p) => s + (p.profile[key] || 0), 0) / succes.length;
        
        report.rules_discovered.push({
            type: 'pattern_echec_vs_succes',
            detail: `Sur ${echecs.length} échec(s) vs ${succes.length} succès : ` +
                `Échecs: combustion moy ${Math.round(avgEchec('idx_combustion'))}, ` +
                `volatil ${avgEchec('pct_tres_volatil').toFixed(1)}%, lourd ${avgEchec('pct_lourd').toFixed(1)}% | ` +
                `Succès: combustion moy ${Math.round(avgSucces('idx_combustion'))}, ` +
                `volatil ${avgSucces('pct_tres_volatil').toFixed(1)}%, lourd ${avgSucces('pct_lourd').toFixed(1)}%`
        });
    }
    
    return report;
}


// ═══════════════════════════════════════════════════
// 5. DESCRIPTEURS OLFACTIFS — Base odeur par CAS
// ═══════════════════════════════════════════════════
// Sources : TGSC, Flavornet, FlavorDB2, Arctander

const ODOR_DB = {
    '78-70-6':    { odor: 'floral, lavande, boisé', odor_hot: 'floral intense, lavande prononcée', threshold: 0.006, odor_family: 'floral', odor_note: 'tête/cœur' },
    '5989-27-5':  { odor: 'citron, orange, frais, agrume', odor_hot: 'agrume très intense, zeste', threshold: 0.01, odor_family: 'agrume', odor_note: 'tête' },
    '127-91-3':   { odor: 'boisé, pin, résine, sec', odor_hot: 'pin fort, térébenthine', threshold: 0.14, odor_family: 'boisé', odor_note: 'tête' },
    '80-56-8':    { odor: 'pin, résine, frais, camphré', odor_hot: 'pin très fort, térébenthine', threshold: 0.006, odor_family: 'boisé', odor_note: 'tête' },
    '87-44-5':    { odor: 'boisé, épicé, poivré, sec', odor_hot: 'épicé chaud, poivré doux', threshold: 0.064, odor_family: 'épicé', odor_note: 'cœur/fond' },
    '469-61-4':   { odor: 'boisé, cèdre, sec', odor_hot: 'cèdre doux, boisé chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '546-28-1':   { odor: 'boisé, cèdre, doux', odor_hot: 'cèdre rond, boisé', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '77-53-2':    { odor: 'boisé, cèdre, doux, camphoré', odor_hot: 'boisé chaud, cèdre crémeux', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '3338-55-4':  { odor: 'vert, herbe, basilic, frais', odor_hot: 'herbacé intense, vert fort', threshold: 0.034, odor_family: 'vert', odor_note: 'tête' },
    '98-55-5':    { odor: 'floral, lilas, pin, frais', odor_hot: 'lilas épanoui, floral doux', threshold: 0.33, odor_family: 'floral', odor_note: 'cœur' },
    '123-35-3':   { odor: 'balsamique, fruité, boisé', odor_hot: 'herbacé balsamique intense', threshold: 0.013, odor_family: 'herbacé', odor_note: 'tête' },
    '13466-78-9': { odor: 'doux, citronné, résine', odor_hot: 'résine douce, citronné chaud', threshold: null, odor_family: 'boisé', odor_note: 'tête' },
    '13877-91-3': { odor: 'vert, herbe, floral', odor_hot: 'vert herbacé, floral chaud', threshold: 0.034, odor_family: 'vert', odor_note: 'tête' },
    '18172-67-3': { odor: 'boisé, pin, frais', odor_hot: 'pin prononcé', threshold: 0.14, odor_family: 'boisé', odor_note: 'tête' },
    '79-92-5':    { odor: 'camphoré, boisé, terreux', odor_hot: 'camphre fort, boisé brut', threshold: null, odor_family: 'boisé', odor_note: 'tête' },
    '99-87-6':    { odor: 'agrume, cumin, frais', odor_hot: 'cumin chaud, agrume', threshold: null, odor_family: 'agrume', odor_note: 'tête/cœur' },
    '99-85-4':    { odor: 'herbacé, citronné, pétrole doux', odor_hot: 'herbacé chaud, terpénique', threshold: null, odor_family: 'herbacé', odor_note: 'tête' },
    '99-86-5':    { odor: 'citronné, herbacé, terreux', odor_hot: 'herbacé fort, citron', threshold: null, odor_family: 'herbacé', odor_note: 'tête' },
    '586-62-9':   { odor: 'boisé, doux, pin, citronné', odor_hot: 'boisé citronné, pin doux', threshold: null, odor_family: 'boisé', odor_note: 'tête' },
    '470-82-6':   { odor: 'eucalyptus, frais, camphoré', odor_hot: 'eucalyptus très fort, mentholé', threshold: 0.012, odor_family: 'frais', odor_note: 'tête' },
    '5989-54-8':  { odor: 'citron, pin, menthol léger', odor_hot: 'agrume mentholé intense', threshold: 0.01, odor_family: 'agrume', odor_note: 'tête' },
    '10408-16-9': { odor: 'boisé, doux, floral léger', odor_hot: 'boisé subtil', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '77-54-3':    { odor: 'boisé, cèdre, doux, ambré', odor_hot: 'cèdre ambré chaud', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '7212-44-4':  { odor: 'boisé, floral, fruité, vert', odor_hot: 'floral boisé, rose chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur/fond' },
    '5392-40-5':  { odor: 'citron, frais, vert, pétillant', odor_hot: 'citron intense, zeste frais', threshold: 0.003, odor_family: 'agrume', odor_note: 'tête' },
    '104-55-2':   { odor: 'cannelle, épicé, chaud, doux', odor_hot: 'cannelle brûlante, épicé fort', threshold: 0.003, odor_family: 'épicé', odor_note: 'cœur' },
    '121-33-5':   { odor: 'vanille, sucré, crémeux, baumier', odor_hot: 'vanille chaude, sucré prononcé, caramel', threshold: 0.029, odor_family: 'gourmand', odor_note: 'fond' },
    '23696-85-7': { odor: 'rose, fruité, prune, confiture', odor_hot: 'fruité intense, rose confite', threshold: 0.000002, odor_family: 'fruité', odor_note: 'cœur' },
    '112-31-2':   { odor: 'agrume, orange, peau, gras', odor_hot: 'orange cireuse, savonneuse', threshold: 0.001, odor_family: 'agrume', odor_note: 'tête' },
    '124-13-0':   { odor: 'agrume, gras, vert, orange', odor_hot: 'agrume gras intense', threshold: 0.0007, odor_family: 'agrume', odor_note: 'tête' },
    '111-71-7':   { odor: 'vert, gras, agrume, amande', odor_hot: 'gras vert prononcé, aldéhydé', threshold: 0.003, odor_family: 'vert', odor_note: 'tête' },
    '110-41-8':   { odor: 'agrume, gras, propre, savon', odor_hot: 'savonneux chaud, agrume gras', threshold: null, odor_family: 'agrume', odor_note: 'tête/cœur' },
    '112-54-9':   { odor: 'agrume, gras, propre, citron', odor_hot: 'gras citronné, savonneux', threshold: 0.002, odor_family: 'agrume', odor_note: 'tête' },
    '112-44-7':   { odor: 'agrume, gras, rose, frais', odor_hot: 'gras rosé, savon chaud', threshold: null, odor_family: 'agrume', odor_note: 'tête' },
    '122-78-1':   { odor: 'miel, floral, vert, jacinthe', odor_hot: 'miel intense, floral fort', threshold: 0.004, odor_family: 'floral', odor_note: 'tête/cœur' },
    '107-75-5':   { odor: 'muguet, frais, floral, propre', odor_hot: 'muguet doux, floral léger', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '1222-05-5':  { odor: 'musc, propre, sucré, poudré', odor_hot: 'musc chaud, poudré, linge propre', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '54464-57-2': { odor: 'boisé, ambré, velours, cèdre', odor_hot: 'ambré boisé chaud, velouté', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '33704-61-9': { odor: 'musc, boisé, épicé, noix de coco', odor_hot: 'musc boisé chaud, épicé doux', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '21145-77-7': { odor: 'musc, poudré, sucré, ambré', odor_hot: 'musc poudré chaud', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '81-14-1':    { odor: 'musc, sucré, poudré, animal', odor_hot: 'musc animal chaud', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '102-20-5':   { odor: 'rose, miel, fruité, baumier', odor_hot: 'miel rosé chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur/fond' },
    '104-67-6':   { odor: 'pêche, fruité, crémeux, coco', odor_hot: 'pêche chaude, lactone crémeuse', threshold: 0.06, odor_family: 'fruité', odor_note: 'cœur' },
    '105-54-4':   { odor: 'fruité, ananas, fraise, sucré', odor_hot: 'fruité sucré intense', threshold: 0.001, odor_family: 'fruité', odor_note: 'tête' },
    '141-78-6':   { odor: 'éthéré, fruité, bonbon, sucré', odor_hot: 'sucré éthéré fort', threshold: 0.005, odor_family: 'fruité', odor_note: 'tête' },
    '103-45-7':   { odor: 'rose, miel, fruité, floral', odor_hot: 'rose miellée chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '103-54-8':   { odor: 'floral, baumier, épicé doux', odor_hot: 'baumier chaud, cannelle douce', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '103-41-3':   { odor: 'baumier, doux, chocolat, ambre', odor_hot: 'baumier ambré chaud', threshold: null, odor_family: 'baumier', odor_note: 'fond' },
    '97-53-0':    { odor: 'girofle, épicé, chaud, boisé', odor_hot: 'girofle fort, épicé brûlant', threshold: 0.006, odor_family: 'épicé', odor_note: 'cœur' },
    '127-51-5':   { odor: 'violet, iris, poudré, boisé', odor_hot: 'iris poudré chaud, floral doux', threshold: 0.012, odor_family: 'floral', odor_note: 'cœur' },
    '93-51-6':    { odor: 'vanille, fumé, épicé', odor_hot: 'vanille fumée intense, feu de bois', threshold: null, odor_family: 'fumé', odor_note: 'cœur/fond' },
    '60-12-8':    { odor: 'rose, floral, miel', odor_hot: 'rose intense, miellé chaud', threshold: 0.75, odor_family: 'floral', odor_note: 'cœur' },
    '106-22-9':   { odor: 'rose, géranium, citronné', odor_hot: 'rose chaude, géranium', threshold: 0.04, odor_family: 'floral', odor_note: 'cœur' },
    '7540-51-4':  { odor: 'rose, géranium, citronné', odor_hot: 'rose chaude citronnée', threshold: 0.04, odor_family: 'floral', odor_note: 'cœur' },
    '106-24-1':   { odor: 'rose, géranium, doux, floral', odor_hot: 'rose intense, géranium chaud', threshold: 0.04, odor_family: 'floral', odor_note: 'cœur' },
    '106-25-2':   { odor: 'rose, frais, vert, citronné', odor_hot: 'rose fraîche, citronnée', threshold: 0.3, odor_family: 'floral', odor_note: 'tête/cœur' },
    '126-91-0':   { odor: 'boisé, floral, lavande', odor_hot: 'lavande boisée chaude', threshold: 0.006, odor_family: 'floral', odor_note: 'tête/cœur' },
    '18479-58-8': { odor: 'frais, citronné, métallique', odor_hot: 'frais métallique, citron vert', threshold: 0.004, odor_family: 'frais', odor_note: 'tête' },
    '3391-86-4':  { odor: 'champignon, terreux, humide', odor_hot: 'champignon intense, sous-bois', threshold: 0.001, odor_family: 'terreux', odor_note: 'tête/cœur' },
    '78-69-3':    { odor: 'muguet, floral, frais, boisé', odor_hot: 'muguet doux, floral propre', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '928-96-1':   { odor: 'vert, herbe coupée, feuille', odor_hot: 'herbe coupée intense, vert vif', threshold: 0.07, odor_family: 'vert', odor_note: 'tête' },
    '3681-71-8':  { odor: 'vert, banane, fruité, herbe', odor_hot: 'vert fruité intense, banane verte', threshold: null, odor_family: 'vert', odor_note: 'tête' },
    '34590-94-8': { odor: 'quasi inodore, solvant léger', odor_hot: 'solvant, étouffe diffusion', threshold: null, odor_family: 'solvant', odor_note: 'n/a' },
    '142-82-5':   { odor: 'essence, pétrole', odor_hot: 'essence forte', threshold: null, odor_family: 'solvant', odor_note: 'n/a' },
    '94333-88-7': { odor: 'boisé, fumé, cuir, résine', odor_hot: 'fumé boisé, feu de camp', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '11028-42-5': { odor: 'boisé, cèdre, sec', odor_hot: 'cèdre chaud, boisé sec', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '91-64-5':    { odor: 'foin coupé, vanille, amande', odor_hot: 'foin sucré chaud, vanille tonka', threshold: null, odor_family: 'gourmand', odor_note: 'cœur/fond' },
    '706-14-9':   { odor: 'pêche, noix de coco, crémeux', odor_hot: 'pêche crémeuse chaude', threshold: 0.011, odor_family: 'fruité', odor_note: 'cœur' },
    '713-95-1':   { odor: 'noix de coco, crémeux, beurre', odor_hot: 'noix de coco chaude, crémeuse', threshold: null, odor_family: 'fruité', odor_note: 'cœur/fond' },
    '111879-80-2':{ odor: 'musc blanc, propre, peau', odor_hot: 'musc chaud, peau propre', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '118-58-1':   { odor: 'baumier, doux, ambré, jasmin', odor_hot: 'baumier chaud, ambré doux', threshold: null, odor_family: 'baumier', odor_note: 'cœur/fond' },
    '87-20-7':    { odor: 'baumier, floral, fruité doux', odor_hot: 'baumier fruité chaud', threshold: null, odor_family: 'baumier', odor_note: 'cœur/fond' },
    '120-51-4':   { odor: 'baumier, doux, amande', odor_hot: 'baumier doux chaud', threshold: null, odor_family: 'baumier', odor_note: 'fond' },
    '119-36-8':   { odor: 'wintergreen, menthol, sucré', odor_hot: 'wintergreen fort, menthol sucré', threshold: 0.1, odor_family: 'frais', odor_note: 'tête/cœur' },
    '22451-48-5': { odor: 'baumier, doux, myrrhe', odor_hot: 'myrrhe chaude, oriental', threshold: null, odor_family: 'baumier', odor_note: 'fond' },
    '101-48-4':   { odor: 'vert, jacinthe, terre, feuille', odor_hot: 'jacinthe verte intense', threshold: null, odor_family: 'vert', odor_note: 'tête' },
    '104-21-2':   { odor: 'floral, fruité, doux, aubépine', odor_hot: 'floral doux, aubépine', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '101-39-3':   { odor: 'cannelle, épicé, oriental', odor_hot: 'cannelle forte, épicé chaud', threshold: null, odor_family: 'épicé', odor_note: 'cœur' },
    '103-95-7':   { odor: 'muguet, cyclamen, floral, rose', odor_hot: 'cyclamen chaud, muguet vert', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '14901-07-6': { odor: 'violet, iris, boisé, framboise', odor_hot: 'violet poudré, iris chaud', threshold: 0.007, odor_family: 'floral', odor_note: 'cœur' },
    '79-77-6':    { odor: 'violet, iris, boisé, poudré', odor_hot: 'iris boisé chaud', threshold: 0.007, odor_family: 'floral', odor_note: 'cœur' },
    '24851-98-7': { odor: 'jasmin, frais, transparent', odor_hot: 'jasmin aérien chaud, radiant', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '121-32-4':   { odor: 'vanille, sucré, barbe à papa', odor_hot: 'vanille sucrée intense, caramel', threshold: 0.05, odor_family: 'gourmand', odor_note: 'fond' },
    '4940-11-8':  { odor: 'barbe à papa, caramel, fruit cuit', odor_hot: 'SUCRÉ TRÈS INTENSE, caramel brûlé', threshold: 0.001, odor_family: 'gourmand', odor_note: 'cœur/fond' },
    '100-52-7':   { odor: 'amande amère, cerise, marzipan', odor_hot: 'amande intense, cerise forte', threshold: 0.003, odor_family: 'gourmand', odor_note: 'tête' },
    '93-53-8':    { odor: 'jacinthe, vert, floral, doux', odor_hot: 'jacinthe verte intense', threshold: 0.004, odor_family: 'floral', odor_note: 'tête/cœur' },
    '104-09-6':   { odor: 'amande amère, cerise, doux', odor_hot: 'amande chaude, cerise douce', threshold: null, odor_family: 'gourmand', odor_note: 'tête' },
    '122-03-2':   { odor: 'cumin, épicé, herbal', odor_hot: 'cumin fort, épicé chaud', threshold: null, odor_family: 'épicé', odor_note: 'cœur' },
    '120-14-9':   { odor: 'vanille, crémeux, boisé', odor_hot: 'vanille crémeuse chaude', threshold: null, odor_family: 'gourmand', odor_note: 'fond' },
    '140-11-4':   { odor: 'jasmin, fruité, doux, floral', odor_hot: 'jasmin fruité chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '4602-84-0':  { odor: 'boisé, floral, muguet', odor_hot: 'boisé floral chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur/fond' },
    '105-87-3':   { odor: 'rose, lavande, frais, fruité', odor_hot: 'rose fraîche, lavande chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '115-95-7':   { odor: 'floral, lavande, bergamote', odor_hot: 'lavande chaude, bergamote', threshold: null, odor_family: 'floral', odor_note: 'tête/cœur' },
    '3913-81-3':  { odor: 'vert, concombre, gras, feuille', odor_hot: 'concombre vert intense', threshold: null, odor_family: 'vert', odor_note: 'tête' },
    '6728-26-3':  { odor: 'vert, herbe coupée, pomme verte', odor_hot: 'herbe coupée forte, vert intense', threshold: 0.017, odor_family: 'vert', odor_note: 'tête' },
    '505-57-7':   { odor: 'vert, feuille, herbe', odor_hot: 'vert herbacé intense', threshold: null, odor_family: 'vert', odor_note: 'tête' },
    '122-70-3':   { odor: 'rose, vert, frais', odor_hot: 'rose verte chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '68917-10-2': { odor: 'mousse, terreux, boisé, vert', odor_hot: 'mousse terreuse intense', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '9000-72-0':  { odor: 'baumier, vanille, résine', odor_hot: 'résine vanillée chaude', threshold: null, odor_family: 'baumier', odor_note: 'fond' },
    '8014-09-3':  { odor: 'rose, géranium, citronnelle', odor_hot: 'rose géranium chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '84775-71-3': { odor: 'agrume, mandarine, zeste', odor_hot: 'mandarine intense, zeste chaud', threshold: null, odor_family: 'agrume', odor_note: 'tête' },
    '90028-67-4': { odor: 'fumé, boisé, cuir, goudron', odor_hot: 'fumé cuir intense', threshold: null, odor_family: 'fumé', odor_note: 'fond' },
    '68956-56-9': { odor: 'boisé, herbacé, terpénique', odor_hot: 'herbacé terpénique chaud', threshold: null, odor_family: 'herbacé', odor_note: 'tête/cœur' },
    '122-99-6':   { odor: 'rose léger, phénolique', odor_hot: 'phénolique chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '69178-43-4': { odor: 'rose, cristallin, frais', odor_hot: 'rose cristalline chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '138-87-4':   { odor: 'menthol, frais, herbacé', odor_hot: 'menthol fort', threshold: null, odor_family: 'frais', odor_note: 'tête' },
    '144020-22-4':{ odor: 'musc, propre, fruité, poudré', odor_hot: 'musc fruité chaud', threshold: null, odor_family: 'musc', odor_note: 'fond' },
    '1335-46-2':  { odor: 'violet, iris, poudré, floral', odor_hot: 'iris poudré intense', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '123-11-5':   { odor: 'aubépine, doux, floral, amande', odor_hot: 'aubépine douce, amande chaude', threshold: null, odor_family: 'floral', odor_note: 'cœur' },

    // ── HUILES ESSENTIELLES & ABSOLUTES ──
    '8008-56-8':  { odor: 'citron, zeste, frais, pétillant', odor_hot: 'agrume vif, zeste citron intense', threshold: null, odor_family: 'agrume', odor_note: 'tête' },
    '8022-96-6':  { odor: 'jasmin, floral blanc, indolique, animal', odor_hot: 'jasmin capiteux, narcotique, enveloppant', threshold: null, odor_family: 'floral', odor_note: 'cœur/fond' },
    '8015-73-4':  { odor: 'basilic, anisé, herbacé, vert', odor_hot: 'basilic intense, anisé épicé', threshold: null, odor_family: 'herbacé', odor_note: 'tête/cœur' },
    '8006-81-3':  { odor: 'cannelle, clou de girofle, épicé, chaud', odor_hot: 'cannelle-eugénol brûlant, épicé puissant', threshold: null, odor_family: 'épicé', odor_note: 'cœur' },
    '8000-46-2':  { odor: 'rose, géranium, vert, citronellol', odor_hot: 'rosé vert intense, géranium floral chaud', threshold: null, odor_family: 'floral', odor_note: 'cœur' },
    '8000-27-9':  { odor: 'cèdre, boisé, sec, crayon', odor_hot: 'boisé cèdre chaud, sec, soyeux', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
    '72968-50-4': { odor: 'floral, agrume, néroli, boisé léger', odor_hot: 'néroli vert, floral agrume chaud', threshold: null, odor_family: 'floral-agrume', odor_note: 'tête/cœur' },
    '61789-17-1': { odor: 'boisé, balsamique, rosé, fumé', odor_hot: 'bois de gaïac chaud, balsamique doux, rosé', threshold: null, odor_family: 'boisé', odor_note: 'fond' },
};

// Merge ODOR_DB into MOLECULE_DB
for (const [cas, odorData] of Object.entries(ODOR_DB)) {
    if (MOLECULE_DB[cas]) {
        Object.assign(MOLECULE_DB[cas], odorData);
    }
}

// ═══════════════════════════════════════════════════
// 6. ANALYSE OLFACTIVE & DIAGNOSTIC
// ═══════════════════════════════════════════════════

function analyzeOlfactoryProfile(components) {
    const families = {};
    const pyramide = { tête: [], cœur: [], fond: [] };
    const hotAlerts = [];
    const sweetMolecules = [];
    const greenMolecules = [];
    
    for (const comp of components) {
        const mol = MOLECULE_DB[comp.cas_number];
        if (!mol || !mol.odor) continue;
        
        const pct = comp.percentage_max || comp.percentage_min || 0;
        const entry = { name: mol.name || comp.name, cas: comp.cas_number, pct, odor: mol.odor, odor_hot: mol.odor_hot, threshold: mol.threshold, odor_family: mol.odor_family };
        
        // Familles olfactives
        const fam = mol.odor_family || 'autre';
        if (!families[fam]) families[fam] = { pct: 0, molecules: [] };
        families[fam].pct += pct;
        families[fam].molecules.push(entry);
        
        // Pyramide
        const noteKey = mol.odor_note || 'cœur';
        for (const n of noteKey.split('/')) {
            const k = n.trim();
            if (pyramide[k]) pyramide[k].push(entry);
        }
        
        // Alertes à chaud (molécules qui changent fortement)
        if (mol.odor_hot && (mol.odor_hot.includes('intense') || mol.odor_hot.includes('fort') || mol.odor_hot.includes('INTENSE') || mol.odor_hot.includes('brûlant'))) {
            hotAlerts.push(entry);
        }
        
        // Sucré
        if (mol.odor.includes('sucré') || mol.odor.includes('caramel') || mol.odor.includes('vanille') || mol.odor.includes('miel') || mol.odor.includes('barbe à papa')) {
            sweetMolecules.push(entry);
        }
        // Vert
        if (mol.odor.includes('vert') || mol.odor.includes('herbe') || mol.odor.includes('feuille')) {
            greenMolecules.push(entry);
        }
    }
    
    const sortedFamilies = Object.entries(families).sort((a, b) => b[1].pct - a[1].pct).map(([name, data]) => ({ name, ...data }));
    
    return {
        families: sortedFamilies,
        pyramide,
        hotAlerts: hotAlerts.sort((a, b) => b.pct - a.pct),
        sweetMolecules: sweetMolecules.sort((a, b) => b.pct - a.pct),
        greenMolecules: greenMolecules.sort((a, b) => b.pct - a.pct),
        coverage: components.filter(c => MOLECULE_DB[c.cas_number] && MOLECULE_DB[c.cas_number].odor).length,
        total: components.length
    };
}

function diagnoseOlfactoryIssue(components, issue) {
    const analysis = analyzeOlfactoryProfile(components);
    const result = { issue, suspects: [], solutions: [], analysis_summary: '' };
    
    if (issue === 'sucré_à_chaud' || issue === 'sweet_hot') {
        result.suspects = analysis.sweetMolecules.map(m => ({
            ...m, explanation: m.name + ' (' + m.pct + '%) — froid: "' + m.odor + '" → chaud: "' + m.odor_hot + '"'
        }));
        result.solutions = [
            'Baisser la mèche d\'un cran → réduit la temp. bain de cire de ~5°C, atténue la volatilisation des notes sucrées',
            'Cire plus dure (fusion élevée) → ralentit la diffusion des gourmands',
            'Réduire le % parfum de 0.5-1%'
        ];
        if (result.suspects.some(s => s.pct > 5)) {
            result.solutions.push('⚠ Molécule sucrée >5% — le sucré sera difficile à corriger sans reformulation fournisseur');
        }
        result.analysis_summary = result.suspects.length + ' molécule(s) sucrée(s) détectée(s), totalisant ' +
            result.suspects.reduce((s, m) => s + m.pct, 0).toFixed(1) + '% de la composition';
    
    } else if (issue === 'vert_trop_fort' || issue === 'green_strong') {
        result.suspects = analysis.greenMolecules.map(m => ({
            ...m, explanation: m.name + ' (' + m.pct + '%) — froid: "' + m.odor + '" → chaud: "' + m.odor_hot + '"'
        }));
        result.solutions = [
            'Monter la mèche d\'un cran → les notes vertes de tête se dissipent plus vite à température élevée',
            'Augmenter le % de muscs/fixateurs → masquage des notes vertes',
            'Ajouter un soupçon de vanilline → contre-balance le vert par du sucré'
        ];
        result.analysis_summary = result.suspects.length + ' molécule(s) verte(s), ' +
            result.suspects.reduce((s, m) => s + m.pct, 0).toFixed(1) + '% de la composition';
    
    } else if (issue === 'diffusion_faible' || issue === 'weak_throw') {
        const heavy = components.filter(c => {
            const m = MOLECULE_DB[c.cas_number];
            return m && m.odor_note && (m.odor_note === 'fond' || m.odor_note.includes('fond'));
        });
        const totalHeavy = heavy.reduce((s, c) => s + (c.percentage_max || c.percentage_min || 0), 0);
        result.suspects = heavy.map(c => {
            const m = MOLECULE_DB[c.cas_number];
            return { name: m.name, cas: c.cas_number, pct: c.percentage_max || c.percentage_min || 0,
                     odor: m.odor, explanation: 'Note de fond lourde — diffuse peu à température ambiante' };
        });
        result.solutions = [
            'Augmenter la mèche → plus de chaleur, meilleure volatilisation des notes de fond',
            'Cire avec point de fusion plus bas → bain plus chaud, meilleure diffusion',
            'Augmenter le % parfum de 0.5-1% pour compenser les notes lourdes'
        ];
        result.analysis_summary = totalHeavy.toFixed(1) + '% de notes de fond lourdes — peut limiter la diffusion';
    
    } else if (issue === 'odeur_parasite' || issue === 'off_note') {
        // Chercher les molécules à seuil très bas (très perceptibles même en traces)
        const lowThreshold = components.filter(c => {
            const m = MOLECULE_DB[c.cas_number];
            return m && m.threshold && m.threshold < 0.01;
        }).map(c => {
            const m = MOLECULE_DB[c.cas_number];
            return { name: m.name, cas: c.cas_number, pct: c.percentage_max || c.percentage_min || 0,
                     odor: m.odor, odor_hot: m.odor_hot, threshold: m.threshold,
                     explanation: 'Seuil de détection très bas (' + m.threshold + ' ppm) — perceptible même en traces' };
        }).sort((a, b) => a.threshold - b.threshold);
        result.suspects = lowThreshold;
        result.solutions = [
            'Identifier quelle note parasite vous percevez et la croiser avec les suspects ci-dessus',
            'Les molécules à seuil <0.01 ppm peuvent dominer même à <1% de la composition',
            'Solution : reformulation fournisseur pour réduire la molécule identifiée'
        ];
        result.analysis_summary = lowThreshold.length + ' molécule(s) à seuil très bas détectée(s)';
    }
    
    return result;
}

module.exports = {
    MOLECULE_DB,
    ODOR_DB,
    computeMoleculeProfile,
    analyzeFragranceProfile,
    batchCrossAnalysis,
    CORRELATION_RULES,
    analyzeOlfactoryProfile,
    diagnoseOlfactoryIssue
};
