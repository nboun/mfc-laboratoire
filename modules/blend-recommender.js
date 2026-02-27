/**
 * MFC Laboratoire — Moteur de Recommandation de Blend
 * 
 * À partir d'une FDS (composants moléculaires d'un parfum), déduit :
 * 1. Le profil moléculaire du parfum (familles, volatilité, polarité)
 * 2. Les blends de cires optimaux (avec pourcentages)
 * 3. Pourquoi ça fonctionne (mécanismes chimiques)
 * 4. Pourquoi certaines combinaisons NE fonctionnent PAS
 * 5. Paramètres process (température, maturation, charge max)
 */

const waxEnrich = require('./wax-enrichment');
const { WAX_TYPES, WAX_MOLECULE_INTERACTIONS } = waxEnrich;

// ══════════════════════════════════════════════════════
// 1. MATRICE D'INTERACTIONS ENTRE CIRES
// ══════════════════════════════════════════════════════

/**
 * Comment les cires interagissent entre elles en mélange.
 * Chaque entrée décrit l'effet d'ajouter la cire "additive" à la cire "base".
 * 
 * effect_on: quels paramètres sont affectés
 * synergy: score 1-10 de la synergie
 * range: pourcentage recommandé de l'additive dans le blend
 * mechanism: explication chimique
 * warning: risques du mélange
 */
const WAX_BLEND_MATRIX = {
    // ── PARAFFINE comme base ─────────────────────────
    'paraffine + microcristalline': {
        synergy: 9,
        range: { min: 3, max: 10, sweet_spot: 5 },
        effect_on: {
            retrait: 'réduit fortement (amorphe comble les espaces intercristallins)',
            adhesion_verre: 'améliore +++ (flexible, épouse le verre)',
            surface: 'lisse les défauts, réduit sinkholes',
            throw: 'réduit légèrement (piège une fraction du parfum)',
            dureté: 'augmente légèrement',
            opacité: 'augmente'
        },
        mechanism: 'La micro (amorphe, ramifiée) remplit les espaces entre les cristaux linéaires de la paraffine. Elle agit comme un mortier entre les briques. Réduit le retrait de 8-15% à 3-6%.',
        why_works: 'Structures cristallines complémentaires : paraffine = macro-cristaux ordonnés, micro = nano-cristaux désordonnés. Le mélange crée une matrice dense et flexible.',
        warning: 'Au-delà de 10%, le throw chute significativement. La micro fond à 70-90°C → ne pas surchauffer le blend.',
        incompatible: false
    },

    'paraffine + soja': {
        synergy: 4,
        range: { min: 10, max: 30, sweet_spot: 20 },
        effect_on: {
            retrait: 'réduit modérément',
            adhesion_verre: 'améliore (triglycérides plus adhésifs)',
            surface: 'risque de frosting en surface',
            throw: 'modifie le profil : diffusion à froid réduit, diffusion à chaud maintenu',
            opacité: 'augmente (aspect crémeux)',
            combustion: 'modifie la vitesse de combustion'
        },
        mechanism: 'Les triglycérides du soja (polaires) et les hydrocarbures de la paraffine (apolaires) sont partiellement miscibles à chaud mais cristallisent séparément → création de micro-domaines hétérogènes.',
        why_works: 'La paraffine apporte la structure et le throw, le soja apporte l\'adhésion et l\'aspect crémeux. Compromis acceptable pour un marketing "blend naturel".',
        why_not_works: 'Immiscibilité partielle au refroidissement : les deux phases cristallisent indépendamment → surface irrégulière, wet spots possibles, variabilité entre lots accrue. Le parfum se distribue inégalement entre les deux phases (préférentiellement dans la paraffine apolaire).',
        warning: 'Mélange instable si >30% soja. Température de coulée critique (trop chaud = séparation, trop froid = grumeaux).',
        incompatible: false
    },

    'paraffine + colza': {
        synergy: 5,
        range: { min: 10, max: 30, sweet_spot: 20 },
        effect_on: {
            retrait: 'réduit modérément',
            adhesion_verre: 'améliore',
            surface: 'moins de frosting que soja',
            throw: 'profil similaire au blend paraffine+soja',
            dureté: 'augmente légèrement (chaînes C22 plus longues)'
        },
        mechanism: 'Similaire au blend paraffine+soja mais les chaînes C22 du colza (acide béhénique) sont plus proches en longueur des C20-C40 de la paraffine → meilleure co-cristallisation.',
        why_works: 'Chaînes longues du colza (C22) plus compatibles avec la paraffine (C20-C40) que le soja (C18). Cristallisation plus ordonnée → moins de frosting.',
        why_not_works: 'Même problème fondamental que le soja : triglycérides ≠ hydrocarbures. La miscibilité reste partielle.',
        warning: 'Variabilité lots colza plus faible que soja.',
        incompatible: false
    },

    'paraffine + stearique': {
        synergy: 7,
        range: { min: 1, max: 5, sweet_spot: 3 },
        effect_on: {
            dureté: 'augmente significativement',
            opacité: 'blanchit la cire',
            surface: 'améliore le démoulage (piliers)',
            throw: 'réduit légèrement (cristallin dense)',
            shrinkage: 'augmente (cristallisation plus nette)'
        },
        mechanism: 'L\'acide stéarique (C18:0) co-cristallise avec les n-alcanes C18-C22 de la paraffine. Les groupes -COOH créent des liaisons H → réseau plus rigide.',
        why_works: 'Longueur de chaîne similaire (C18 vs C20-C40). Excellente co-cristallisation dans la plage C18-C22. Le groupe acide -COOH apporte rigidité et opacité.',
        why_not_works: 'À >5%, l\'excès de stéarique crée une phase séparée visible (exsudation blanche) et piège le parfum dans les zones acides → throw réduit.',
        warning: 'Maximum 5%. Au-delà = exsudation et perte de throw.',
        incompatible: false
    },

    'paraffine + cetyl_stearyl_alcohol': {
        synergy: 6,
        range: { min: 1, max: 5, sweet_spot: 2 },
        effect_on: {
            surface: 'lisse, anti-sinkholes',
            throw: 'léger boost diffusion à froid (alcools gras migrent en surface)',
            dureté: 'augmente modérément',
            adhesion_verre: 'améliore légèrement'
        },
        mechanism: 'Les alcools gras C16-C18 s\'intercalent entre les cristaux de paraffine grâce au groupe -OH qui crée des micro-liaisons avec les imperfections cristallines.',
        why_works: 'Longueur de chaîne idéale (C16-C18) pour s\'insérer dans la matrice paraffine. Le -OH est un pont entre la cire apolaire et le parfum polaire.',
        warning: 'À >5%, peut créer un voile gras en surface.',
        incompatible: false
    },

    'paraffine + vybar': {
        synergy: 8,
        range: { min: 0.5, max: 2, sweet_spot: 1 },
        effect_on: {
            throw: 'booste le throw significativement',
            opacité: 'augmente fortement',
            surface: 'lisse, réduit mottling',
            color: 'améliore la tenue des colorants',
            adhesion_verre: 'améliore'
        },
        mechanism: 'Le Vybar (copolymère cristallin) forme un réseau tridimensionnel microscopique qui piège les micro-gouttelettes de parfum dans la cire. Lors de la chauffe, ces gouttelettes se libèrent progressivement.',
        why_works: 'Le polymère crée une "éponge" invisible à l\'échelle nanométrique qui retient le parfum dans la matrice solide (diffusion à froid) et le libère de façon contrôlée à la fonte (diffusion à chaud).',
        why_not_works: 'À >2%, effet inverse : le réseau polymère devient trop dense et emprisonne le parfum définitivement → throw effondré.',
        warning: 'Maximum 2%. Très sensible au dosage. Incompatible avec les cires végétales (ne cristallise pas correctement dans les triglycérides).',
        incompatible: false
    },

    'paraffine + coco': {
        synergy: 6,
        range: { min: 3, max: 10, sweet_spot: 5 },
        effect_on: {
            throw: 'booste les notes de tête (chaînes C12 volatiles)',
            melt_pool: 'élargit et abaisse la température du melt pool',
            surface: 'brillance accrue',
            dureté: 'réduit (coco fond à 24°C)',
            adhesion_verre: 'excellente'
        },
        mechanism: 'La cire de coco (triglycérides C12) fond à 24°C. En blend, elle reste liquide dans les interstices de la paraffine solide → crée un réservoir de parfum facilement accessible à température ambiante.',
        why_works: 'Les chaînes courtes C8-C14 de la coco libèrent les notes de tête du parfum à température ambiante → diffusion à froid boosté. L\'aspect crémeux améliore l\'adhésion au verre.',
        why_not_works: 'À >10%, la bougie devient trop molle (maturation impossible, verre gras). Le fond de coco instable peut provoquer du suintement en été (>25°C).',
        warning: 'Ne jamais dépasser 10%. Stocker en dessous de 25°C.',
        incompatible: false
    },

    'paraffine + beeswax': {
        synergy: 5,
        range: { min: 5, max: 20, sweet_spot: 10 },
        effect_on: {
            combustion: 'améliore — flamme chaude, stable',
            throw: 'réduit (cire d\'abeille retient le parfum)',
            surface: 'patine naturelle, aspect artisanal',
            durée: 'augmente la durée de combustion'
        },
        mechanism: 'Les esters myricyle (C46) de la cire d\'abeille forment un réseau de longues chaînes qui ralentit la combustion. Les hydrocarbures C25-C35 co-cristallisent avec la paraffine.',
        why_works: 'Co-cristallisation des hydrocarbures C25-C35 avec la paraffine. Le réseau d\'esters ralentit la combustion → flamme plus régulière, durée accrue.',
        why_not_works: 'La cire d\'abeille a une odeur propre qui modifie le parfum. À >20%, le throw est très réduit (rétention excessive). Le prix élevé rend le blend non viable pour la production.',
        warning: 'L\'odeur naturelle de la cire d\'abeille interfère avec les parfums délicats.',
        incompatible: false
    },

    // ── SOJA comme base ──────────────────────────────
    'soja + stearique': {
        synergy: 7,
        range: { min: 2, max: 5, sweet_spot: 3 },
        effect_on: {
            dureté: 'augmente (compense la mollesse du soja)',
            surface: 'réduit le frosting',
            throw: 'maintenu — l\'acide stéarique est déjà le constituant principal du soja',
            démoulage: 'facilité (piliers végétaux)'
        },
        mechanism: 'Le soja EST principalement de l\'acide stéarique (80-88%) sous forme de triglycéride. L\'ajout d\'acide stéarique libre renforce la cristallinité β en augmentant la concentration de C18:0 libre.',
        why_works: 'Affinité chimique maximale — l\'acide stéarique est le constituant naturel du soja. L\'ajout de forme libre accélère la nucléation cristalline → surface plus lisse.',
        why_not_works: 'À >5%, le soja perd sa texture crémeuse et devient cassant. La phase acide libre peut provoquer des réactions avec certains aldéhydes du parfum (formation de demi-acétals).',
        warning: 'Maximum 5%. Surveiller les parfums riches en aldéhydes.',
        incompatible: false
    },

    'soja + cetyl_stearyl_alcohol': {
        synergy: 8,
        range: { min: 2, max: 5, sweet_spot: 3 },
        effect_on: {
            surface: 'anti-frosting puissant',
            throw: 'maintenu ou légèrement amélioré',
            adhesion_verre: 'améliore',
            wet_spots: 'réduit significativement'
        },
        mechanism: 'Les alcools gras C16-C18 s\'insèrent dans la matrice triglycéride du soja. Le groupe -OH crée des ponts hydrogène avec les oxygènes des esters → réseau plus cohérent, cristallisation plus régulière.',
        why_works: 'Les alcools gras sont le meilleur anti-défaut pour le soja. Ils comblent les irrégularités cristallines responsables du frosting et des wet spots.',
        why_not_works: 'À >5%, voile gras en surface possible. La combinaison alcool gras + parfum très volatil (agrumes) peut créer un effet de "bouchon" en surface.',
        incompatible: false
    },

    'soja + coco': {
        synergy: 7,
        range: { min: 5, max: 15, sweet_spot: 10 },
        effect_on: {
            throw: 'booste notes de tête +++',
            melt_pool: 'plus fluide, meilleure diffusion',
            surface: 'brillance crémeuse',
            dureté: 'réduit'
        },
        mechanism: 'Les triglycérides courts (C12 coco) fluidifient les triglycérides longs (C18 soja). Excellente miscibilité (même famille chimique). La fraction liquide de coco à température ambiante crée des micro-canaux de diffusion.',
        why_works: 'Compatibilité chimique parfaite (triglycéride + triglycéride). La coco liquéfie partiellement la matrice → le parfum migre plus facilement en surface → meilleur diffusion à froid.',
        why_not_works: 'À >15%, le blend devient trop mou pour les containers (flaque en été). Le suintement est inévitable au-dessus de 25°C ambiants.',
        incompatible: false
    },

    'soja + colza': {
        synergy: 9,
        range: { min: 20, max: 50, sweet_spot: 30 },
        effect_on: {
            dureté: 'augmente (chaînes C22 colza)',
            frosting: 'réduit (cristallisation plus régulière)',
            throw: 'maintenu',
            variabilité: 'réduit la variabilité inter-lots'
        },
        mechanism: 'Triglycéride C18 (soja) + triglycéride C22 (colza) = co-cristallisation idéale. Les chaînes C22 apportent la rigidité manquante au soja sans changer la chimie du système.',
        why_works: 'Même famille chimique (triglycérides), longueurs de chaîne complémentaires. C\'est le blend végétal le plus stable et le plus performant.',
        incompatible: false
    },

    'soja + vybar': {
        synergy: 2,
        range: { min: 0, max: 1, sweet_spot: 0 },
        effect_on: {
            throw: 'effet imprévisible',
            surface: 'peut empirer le frosting'
        },
        mechanism: 'Le Vybar est conçu pour cristalliser dans les n-alcanes (paraffine). Dans les triglycérides (soja), il ne forme pas son réseau tridimensionnel correctement → effet aléatoire ou nul.',
        why_not_works: 'Incompatibilité structurelle : le Vybar a besoin de la matrice cristalline ordonnée de la paraffine pour fonctionner. Dans le soja (cristaux polymorphes), il est distribué de façon chaotique → aucun bénéfice, parfois aggravation du frosting.',
        warning: 'Ne PAS utiliser le Vybar avec les cires végétales. Utiliser plutôt des alcools gras.',
        incompatible: true
    },

    'soja + microcristalline': {
        synergy: 3,
        range: { min: 1, max: 5, sweet_spot: 3 },
        effect_on: {
            adhesion_verre: 'améliore modérément',
            retrait: 'réduit',
            throw: 'réduit'
        },
        mechanism: 'La microcristalline (hydrocarbures ramifiés) est partiellement immiscible avec le soja (triglycérides). Le mélange crée des micro-domaines hétérogènes.',
        why_not_works: 'Polarités trop différentes. Les hydrocarbures amorphes de la micro ne s\'intègrent pas bien dans la matrice triglycéride. Résultat : surface irrégulière, parfum mal distribué.',
        warning: 'Utiliser uniquement si problèmes de retrait sévères. Préférer les alcools gras.',
        incompatible: false
    },

    // ── MICROCRISTALLINE comme base → JAMAIS seule ───
    // (déjà couvert dans les blends ci-dessus)

    // ── COLZA comme base ─────────────────────────────
    'colza + cetyl_stearyl_alcohol': {
        synergy: 7,
        range: { min: 2, max: 5, sweet_spot: 3 },
        effect_on: {
            surface: 'anti-défaut, anti-frosting',
            adhesion_verre: 'améliore',
            throw: 'maintenu'
        },
        mechanism: 'Même mécanisme que soja+alcool gras. Les C16-C18 -OH s\'intègrent dans les triglycérides C22 du colza.',
        why_works: 'Compatibilité chimique similaire au soja. Le colza ayant déjà moins de frosting, l\'effet est surtout cosmétique et préventif.',
        incompatible: false
    }
};


// ══════════════════════════════════════════════════════
// 2. PROFIL MOLÉCULAIRE D'UN PARFUM
// ══════════════════════════════════════════════════════

/**
 * Analyser le profil moléculaire d'un parfum depuis ses composants FDS
 * @param {Array} components - Composants de la FDS
 * @param {Object} moleculeDB - MOLECULE_DB du molecule-engine
 * @returns {Object} Profil complet
 */
function buildFragranceProfile(components, moleculeDB) {
    const profile = {
        total_components: components.length,
        identified: 0,
        unidentified: 0,
        
        // Distribution par volatilité (pondérée par %)
        volatility: {
            très_haute: { pct: 0, count: 0, molecules: [] },
            haute: { pct: 0, count: 0, molecules: [] },
            moyenne: { pct: 0, count: 0, molecules: [] },
            basse: { pct: 0, count: 0, molecules: [] },
            très_basse: { pct: 0, count: 0, molecules: [] }
        },
        
        // Distribution par famille moléculaire
        families: {},
        
        // Indicateurs calculés
        avg_mw: 0,
        avg_logp: 0,
        min_flash_point: 999,
        pct_apolaire: 0,  // terpènes + muscs
        pct_polaire: 0,   // alcools + phénols + acides
        pct_esters: 0,
        pct_terpenes_total: 0,
        pct_muscs: 0,
        pct_aldehydes: 0,
        
        // Profil olfactif simplifié
        character: '',
        
        // Risques
        risks: [],
        low_flash_components: []
    };

    let mwSum = 0, mwCount = 0;
    let totalPctIdentified = 0;

    for (const comp of components) {
        const cas = comp.cas_number || comp.cas;
        const mol = cas && moleculeDB ? moleculeDB[cas] : null;
        const pctAvg = ((comp.percentage_min || 0) + (comp.percentage_max || 0)) / 2;

        if (mol) {
            profile.identified++;

            // Volatilité
            const vol = mol.volatility || 'moyenne';
            if (profile.volatility[vol]) {
                profile.volatility[vol].pct += pctAvg;
                profile.volatility[vol].count++;
                profile.volatility[vol].molecules.push({ cas, name: mol.name || comp.name, pct: pctAvg });
            }

            // Famille
            const family = mol.family || 'inconnue';
            const normalizedFamily = normalizeToBaseFamily(family);
            if (!profile.families[normalizedFamily]) {
                profile.families[normalizedFamily] = { pct: 0, count: 0, subfamilies: {} };
            }
            profile.families[normalizedFamily].pct += pctAvg;
            profile.families[normalizedFamily].count++;
            if (!profile.families[normalizedFamily].subfamilies[family]) {
                profile.families[normalizedFamily].subfamilies[family] = 0;
            }
            profile.families[normalizedFamily].subfamilies[family] += pctAvg;

            // MW
            if (mol.mw) { mwSum += mol.mw * pctAvg; mwCount += pctAvg; }

            // Flash point
            if (mol.fp && mol.fp < profile.min_flash_point) {
                profile.min_flash_point = mol.fp;
            }
            if (mol.fp && mol.fp < 65) {
                profile.low_flash_components.push({ cas, name: mol.name || comp.name, fp: mol.fp, pct: pctAvg });
            }

            totalPctIdentified += pctAvg;
        } else {
            profile.unidentified++;
        }
    }

    // Calcul MW moyen pondéré
    profile.avg_mw = mwCount > 0 ? Math.round(mwSum / mwCount * 10) / 10 : 0;

    // Calcul des ratios de polarité
    for (const [fam, data] of Object.entries(profile.families)) {
        if (['terpène', 'sesquiterpène'].includes(fam)) {
            profile.pct_apolaire += data.pct;
            profile.pct_terpenes_total += data.pct;
        }
        if (fam === 'musc') {
            profile.pct_apolaire += data.pct;
            profile.pct_muscs += data.pct;
        }
        if (['alcool', 'phénol', 'terpène-alcool'].includes(fam)) {
            profile.pct_polaire += data.pct;
        }
        if (['ester', 'lactone'].includes(fam)) {
            profile.pct_esters += data.pct;
        }
        if (fam === 'aldéhyde') {
            profile.pct_aldehydes += data.pct;
        }
    }

    // Arrondir
    profile.pct_apolaire = Math.round(profile.pct_apolaire * 10) / 10;
    profile.pct_polaire = Math.round(profile.pct_polaire * 10) / 10;
    profile.pct_esters = Math.round(profile.pct_esters * 10) / 10;
    profile.pct_terpenes_total = Math.round(profile.pct_terpenes_total * 10) / 10;
    profile.pct_muscs = Math.round(profile.pct_muscs * 10) / 10;
    profile.pct_aldehydes = Math.round(profile.pct_aldehydes * 10) / 10;

    if (profile.min_flash_point === 999) profile.min_flash_point = null;

    // Caractère olfactif
    profile.character = deduceCharacter(profile);

    // Risques
    if (profile.low_flash_components.length > 0) {
        profile.risks.push({
            type: 'flash_point',
            severity: profile.min_flash_point < 50 ? 'haute' : 'moyenne',
            message: `${profile.low_flash_components.length} composant(s) avec flash point < 65°C. Min: ${profile.min_flash_point}°C (${profile.low_flash_components[0].name}).`
        });
    }
    if (profile.volatility.très_haute.pct > 30) {
        profile.risks.push({
            type: 'volatilité',
            severity: 'haute',
            message: `${Math.round(profile.volatility.très_haute.pct)}% de composants très volatils. Diffusion à froid fort mais diffusion à chaud éphémère.`
        });
    }
    if (profile.pct_aldehydes > 10) {
        profile.risks.push({
            type: 'réactivité',
            severity: 'moyenne',
            message: `${profile.pct_aldehydes}% d'aldéhydes. Risque de jaunissement et de réaction avec les cires acides (stéarique, soja acide).`
        });
    }

    return profile;
}


/**
 * Normaliser les sous-familles vers les familles de base de WAX_MOLECULE_INTERACTIONS
 */
function normalizeToBaseFamily(family) {
    const f = family.toLowerCase();
    if (f.includes('musc')) return 'musc';
    if (f.includes('sesquiterpène') || f.includes('sesquiterp')) return 'sesquiterpène';
    if (f.includes('terpène-oxyde') || f.includes('terpene-oxyde') || f.includes('oxide')) return 'terpène';
    if (f.includes('terpène-alcool') || f.includes('terpene-alcool') || f.includes('terpénol')) return 'terpène-alcool';
    if (f.includes('terpène-aromatique') || f.includes('monoterpène')) return 'terpène';
    if (f.includes('ester-terpénique') || f.includes('ester-terpen')) return 'ester';
    if (f.includes('ester-salicylate') || f.includes('salicylate')) return 'ester';
    if (f.includes('terpène') || f.includes('terpene')) return 'terpène';
    if (f.includes('aldéhyde') || f.includes('aldehyde')) return 'aldéhyde';
    if (f.includes('ester') || f.includes('acétate') || f.includes('benzoate') || f.includes('lactone')) return 'ester';
    if (f.includes('phénol') || f.includes('phenol') || f.includes('eugén')) return 'phénol';
    if (f.includes('cétone') || f.includes('ketone') || f.includes('ionone')) return 'cétone';
    if (f.includes('alcool') || f.includes('alcohol')) return 'alcool';
    return 'ester'; // fallback sûr
}


/**
 * Déduire le caractère olfactif depuis le profil
 */
function deduceCharacter(profile) {
    const parts = [];
    const families = Object.entries(profile.families).sort((a, b) => b[1].pct - a[1].pct);
    
    if (profile.pct_terpenes_total > 30) parts.push('agrume/frais');
    if (profile.pct_esters > 20) parts.push('fruité');
    if (profile.pct_muscs > 5) parts.push('musqué');
    if (profile.pct_aldehydes > 5) parts.push('aldéhydé');
    if (profile.families['phénol']?.pct > 3) parts.push('épicé');
    if (profile.families['sesquiterpène']?.pct > 5) parts.push('boisé');
    if (profile.families['terpène-alcool']?.pct > 15) parts.push('floral');
    if (profile.families['cétone']?.pct > 5) parts.push('poudreux');
    
    return parts.length > 0 ? parts.join(', ') : 'composite';
}


// ══════════════════════════════════════════════════════
// 3. MOTEUR DE RECOMMANDATION DE BLEND
// ══════════════════════════════════════════════════════

/**
 * Recommander les meilleurs blends pour un parfum
 * @param {Object} fragranceProfile - Résultat de buildFragranceProfile
 * @param {string} containerType - 'container', 'pilier', 'melt', 'bougie_coulée'
 * @returns {Array} Blends recommandés, classés du meilleur au pire
 */
function recommendBlends(fragranceProfile, containerType = 'container') {
    const fp = fragranceProfile;
    const recommendations = [];

    // ── BLEND 1 : Paraffine optimale ─────────────────
    {
        const blend = {
            name: 'Paraffine optimale',
            type: 'minérale',
            score: 0,
            components: [],
            total_pct: 0,
            why_works: [],
            why_not_works: [],
            process: {},
            best_for: 'Throw maximum, combustion propre, production fiable'
        };

        // Choisir le grade de paraffine selon le type de contenant
        let parafGrade, parafPct;
        if (containerType === 'pilier') {
            parafGrade = 'hard (cp 58-65°C)';
            parafPct = 90;
        } else if (containerType === 'melt') {
            parafGrade = 'soft (cp 46-52°C)';
            parafPct = 85;
        } else {
            parafGrade = 'medium (cp 52-58°C)';
            parafPct = 85;
        }

        blend.components.push({ wax: 'Paraffine ' + parafGrade, pct: parafPct, role: 'base' });

        // Ajouter micro pour l'adhésion verre (container uniquement)
        if (containerType === 'container') {
            blend.components.push({ wax: 'Microcristalline (3-5%)', pct: 5, role: 'anti-retrait' });
            blend.why_works.push('La micro comble les espaces intercristallins → zéro sinkholes, adhésion verre parfaite.');
            parafPct -= 5;
            blend.components[0].pct = parafPct;
        }

        // Vybar si parfum pas trop volatil
        if (fp.volatility.très_haute.pct < 40) {
            blend.components.push({ wax: 'Vybar 260 (1%)', pct: 1, role: 'fixateur parfum' });
            blend.why_works.push('Le Vybar crée un réseau nano-structuré qui piège et libère le parfum de façon contrôlée.');
            blend.components[0].pct -= 1;
        } else {
            blend.why_not_works.push('Vybar omis : parfum trop volatil (' + Math.round(fp.volatility.très_haute.pct) + '% très haute), le Vybar bloquerait les terpènes sans bénéfice.');
        }

        // Coco boost si beaucoup de notes de tête
        if (fp.volatility.très_haute.pct > 20) {
            blend.components.push({ wax: 'Cire de coco (5%)', pct: 5, role: 'boost notes de tête' });
            blend.why_works.push('La coco (liquide à 24°C) crée des micro-réservoirs qui libèrent les terpènes à froid → diffusion à froid boosté.');
            blend.components[0].pct -= 5;
        }

        // Score
        let score = 8; // Base paraffine = toujours bon
        if (fp.pct_apolaire > 30) { score += 1; blend.why_works.push('Parfum riche en terpènes apolaires → excellente solubilité dans la paraffine apolaire (hydrocarbures).'); }
        if (fp.pct_esters > 20) { score += 0.5; blend.why_works.push('Les esters se dissolvent bien dans la paraffine et diffusent efficacement.'); }
        if (fp.pct_muscs > 10) { score -= 0.5; blend.why_not_works.push('Les muscs lourds (MW>250) ont une diffusion lente en paraffine. Diffusion à chaud correct mais diffusion à froid limité pour cette fraction.'); }
        if (fp.pct_aldehydes > 10) { score -= 0.5; blend.why_not_works.push('Les aldéhydes sont sensibles à l\'oxydation en surface de la paraffine (contact air). Possible jaunissement avec le temps.'); }
        
        blend.score = Math.min(10, Math.max(1, Math.round(score * 10) / 10));
        
        // Process
        blend.process = {
            temp_fusion: '75-80°C',
            temp_incorporation_parfum: fp.pct_terpenes_total > 30 ? '58-62°C (terpènes sensibles)' : '62-65°C',
            charge_parfum_max: fp.min_flash_point && fp.min_flash_point < 65 ? '6%' : '8-10%',
            temp_coulée: containerType === 'pilier' ? '70-75°C' : '55-60°C',
            maturation: '3-5 jours',
            notes: 'Mélanger parfum 2 min minimum. Ne pas dépasser 70°C avec le parfum incorporé.'
        };

        recommendations.push(blend);
    }

    // ── BLEND 2 : Végétale soja ──────────────────────
    {
        const blend = {
            name: 'Végétale soja',
            type: 'végétale',
            score: 0,
            components: [],
            why_works: [],
            why_not_works: [],
            process: {},
            best_for: 'Marketing naturel/végan, rétention parfum, flamme douce'
        };

        let sojaPct = 90;
        blend.components.push({ wax: 'Soja 100% hydrogénée', pct: sojaPct, role: 'base' });

        // Anti-frosting obligatoire
        blend.components.push({ wax: 'Alcool céto-stéarylique (3%)', pct: 3, role: 'anti-frosting/wet spots' });
        blend.why_works.push('Les alcools gras C16-C18 s\'intègrent dans la matrice triglycéride et régularisent la cristallisation → surface lisse.');
        sojaPct -= 3;

        // Coco si notes de tête
        if (fp.volatility.très_haute.pct > 15) {
            blend.components.push({ wax: 'Cire de coco (7%)', pct: 7, role: 'boost diffusion' });
            blend.why_works.push('Coco + soja = 100% triglycérides, miscibilité parfaite. La coco fluidifie le melt pool → throw amélioré.');
            sojaPct -= 7;
        }

        blend.components[0].pct = sojaPct;

        // Score
        let score = 6;
        if (fp.pct_esters > 20) { score += 2; blend.why_works.push('AFFINITÉ CHIMIQUE MAXIMALE : le soja est un ester (triglycéride) → il dissout naturellement les esters du parfum. C\'est le meilleur match possible pour les parfums fruités/floraux.'); }
        if (fp.pct_apolaire > 30) { score -= 2; blend.why_not_works.push('INCOMPATIBILITÉ : les terpènes apolaires se dissolvent mal dans le soja polaire. Le melt pool visqueux (30-45 cSt) freine leur diffusion → throw médiocre pour les notes de tête. C\'est un problème fondamental de polarité.'); }
        if (fp.volatility.très_haute.pct > 30) { score -= 1; blend.why_not_works.push('Trop de volatils : le soja cristallise lentement, piégeant les molécules volatiles. Sans maturation de 14 jours, le throw sera décevant.'); }
        if (fp.pct_aldehydes > 5) { score -= 1; blend.why_not_works.push('RISQUE CHIMIQUE : les aldéhydes peuvent réagir avec les traces d\'acides gras libres du soja (indice d\'acide 0.1-0.5). Formation de demi-acétals → modification de l\'odeur avec le temps. Le citral et la vanilline sont particulièrement sensibles.'); }
        if (fp.pct_muscs > 5) { score += 0.5; blend.why_works.push('Les muscs lourds sont bien retenus dans la matrice soja dense → libération progressive au diffusion à chaud.'); }
        if (fp.families['terpène-alcool']?.pct > 10) { score += 1; blend.why_works.push('Les terpène-alcools (linalol, citronellol, géraniol) ont un -OH qui interagit avec les oxygènes du triglycéride → bonne rétention ET bonne libération.'); }

        blend.score = Math.min(10, Math.max(1, Math.round(score * 10) / 10));

        blend.process = {
            temp_fusion: '65-70°C (ne pas dépasser — dégradation)',
            temp_incorporation_parfum: '55-58°C',
            charge_parfum_max: '10-12%',
            temp_coulée: '50-55°C (critique pour wet spots)',
            maturation: '14-21 jours obligatoire',
            notes: 'Préchauffer les verres à 35-40°C. Verser lentement. Ne JAMAIS remuer après coulée.'
        };

        recommendations.push(blend);
    }

    // ── BLEND 3 : Végétale colza-soja ────────────────
    {
        const blend = {
            name: 'Végétale colza-soja',
            type: 'végétale',
            score: 0,
            components: [],
            why_works: [],
            why_not_works: [],
            process: {},
            best_for: 'Végétal premium, stabilité supérieure au soja pur'
        };

        blend.components.push({ wax: 'Colza hydrogénée (60%)', pct: 60, role: 'base structurelle' });
        blend.components.push({ wax: 'Soja hydrogénée (35%)', pct: 35, role: 'texture crémeuse' });
        blend.components.push({ wax: 'Alcool céto-stéarylique (3%)', pct: 3, role: 'anti-frosting' });

        if (fp.volatility.très_haute.pct > 15) {
            blend.components.push({ wax: 'Cire de coco (5%)', pct: 5, role: 'boost notes de tête' });
            blend.components[1].pct -= 5;
            blend.why_works.push('L\'ajout de coco (triglycéride court) compense la viscosité élevée du colza → meilleure diffusion des terpènes.');
        }

        blend.why_works.push('Le colza (C22) apporte la rigidité que le soja (C18) n\'a pas. Co-cristallisation triglycéride parfaite → surface plus lisse, moins de frosting.');
        blend.why_works.push('Variabilité entre lots réduite (le colza est plus stable que le soja d\'un lot à l\'autre).');

        let score = 7;
        if (fp.pct_esters > 15) { score += 1; blend.why_works.push('Esters du parfum en affinité avec la matrice ester (triglycéride). Double bonus colza+soja.'); }
        if (fp.pct_apolaire > 30) { score -= 1.5; blend.why_not_works.push('Même limitation que le soja pur : la matrice triglycéride polaire ne dissout pas idéalement les terpènes apolaires.'); }
        if (fp.pct_aldehydes > 5) { score -= 0.5; blend.why_not_works.push('Risque de réaction aldéhyde-acide modéré (inférieur au soja pur grâce à l\'indice d\'acide plus bas du colza).'); }

        blend.score = Math.min(10, Math.max(1, Math.round(score * 10) / 10));
        blend.process = {
            temp_fusion: '68-72°C',
            temp_incorporation_parfum: '57-60°C',
            charge_parfum_max: '10-12%',
            temp_coulée: '52-57°C',
            maturation: '10-14 jours',
            notes: 'Le colza solidifie plus vite que le soja → agir rapidement après incorporation parfum.'
        };

        recommendations.push(blend);
    }

    // ── BLEND 4 : Hybride paraffine-végétale ─────────
    {
        const blend = {
            name: 'Hybride paraffine-végétale',
            type: 'hybride',
            score: 0,
            components: [
                { wax: 'Paraffine medium (cp 54-58°C)', pct: 60, role: 'base, throw, structure' },
                { wax: 'Soja hydrogénée (30%)', pct: 30, role: 'adhésion, aspect crémeux' },
                { wax: 'Microcristalline (5%)', pct: 5, role: 'anti-retrait' },
                { wax: 'Alcool céto-stéarylique (2%)', pct: 2, role: 'anti-défaut surface' }
            ],
            why_works: [],
            why_not_works: [],
            process: {},
            best_for: 'Compromis throw/adhésion, aspect premium, argument "blend naturel"'
        };

        if (fp.volatility.très_haute.pct > 20) {
            blend.components.push({ wax: 'Cire de coco (3%)', pct: 3, role: 'boost notes de tête' });
            blend.components[1].pct -= 3;
        }

        blend.why_works.push('La paraffine à 60% assure le throw et la structure cristalline. Le soja à 30% apporte l\'adhésion au verre et l\'aspect crémeux.');
        blend.why_works.push('La micro comble les interstices entre les deux phases → surface homogène malgré la différence de polarité.');

        blend.why_not_works.push('PROBLÈME FONDAMENTAL : paraffine (apolaire) et soja (polaire) sont partiellement immiscibles. Elles cristallisent séparément au refroidissement → micro-domaines hétérogènes. Le parfum se distribue préférentiellement dans la phase paraffine.');
        blend.why_not_works.push('La température de coulée est critique : trop chaud (>60°C) = séparation des phases visible, trop froid (<50°C) = grumeaux.');
        blend.why_not_works.push('Résultat moins reproductible que paraffine pure ou végétal pur.');

        let score = 6.5;
        if (fp.pct_apolaire > 20 && fp.pct_esters > 10) { score += 1; blend.why_works.push('Ce parfum a un profil mixte (apolaire + ester) qui correspond bien au blend hybride : les terpènes vont dans la paraffine, les esters dans le soja.'); }
        
        blend.score = Math.min(10, Math.max(1, Math.round(score * 10) / 10));
        blend.process = {
            temp_fusion: '75-80°C (fondre séparément, mélanger à 70°C)',
            temp_incorporation_parfum: '60-62°C',
            charge_parfum_max: '8-10%',
            temp_coulée: '52-58°C (fenêtre étroite !)',
            maturation: '5-7 jours',
            notes: 'Fondre paraffine+micro ensemble, ajouter le soja fondu à 70°C, homogénéiser 3 min PUIS descendre à 60°C pour le parfum.'
        };

        recommendations.push(blend);
    }

    // Trier par score décroissant
    recommendations.sort((a, b) => b.score - a.score);

    // Ajouter le rang
    recommendations.forEach((r, i) => r.rank = i + 1);

    return recommendations;
}


// ══════════════════════════════════════════════════════
// 4. ANALYSE DÉTAILLÉE : POURQUOI / POURQUOI PAS
// ══════════════════════════════════════════════════════

/**
 * Générer un rapport complet d'analyse pour un parfum
 */
function generateFullReport(components, moleculeDB, containerType = 'container') {
    const profile = buildFragranceProfile(components, moleculeDB);
    const blends = recommendBlends(profile, containerType);

    // Interactions cire×cire pertinentes
    const relevantBlendInteractions = [];
    for (const blend of blends) {
        const baseWax = blend.components[0]?.wax?.toLowerCase() || '';
        for (let i = 1; i < blend.components.length; i++) {
            const addWax = blend.components[i]?.wax?.toLowerCase() || '';
            // Chercher dans la matrice
            for (const [key, inter] of Object.entries(WAX_BLEND_MATRIX)) {
                if ((baseWax.includes(key.split(' + ')[0]) && addWax.includes(key.split(' + ')[1])) ||
                    (addWax.includes(key.split(' + ')[0]) && baseWax.includes(key.split(' + ')[1]))) {
                    relevantBlendInteractions.push({
                        blend: blend.name,
                        interaction: key,
                        synergy: inter.synergy,
                        mechanism: inter.mechanism,
                        incompatible: inter.incompatible || false
                    });
                }
            }
        }
    }

    return {
        fragrance_profile: profile,
        recommended_blends: blends,
        wax_interactions: relevantBlendInteractions,
        blend_matrix: WAX_BLEND_MATRIX,
        summary: generateSummary(profile, blends)
    };
}


/**
 * Générer un résumé textuel
 */
function generateSummary(profile, blends) {
    const lines = [];
    
    lines.push(`PROFIL DU PARFUM : ${profile.character || 'composite'}`);
    lines.push(`${profile.total_components} composants identifiés, Masse mol. moyenne ${profile.avg_mw}`);
    
    // Volatilité dominante
    const volDom = Object.entries(profile.volatility)
        .filter(([k, v]) => v.pct > 0)
        .sort((a, b) => b[1].pct - a[1].pct);
    if (volDom.length > 0) {
        lines.push(`Volatilité dominante : ${volDom[0][0]} (${Math.round(volDom[0][1].pct)}%)`);
    }

    // Familles dominantes
    const famDom = Object.entries(profile.families)
        .sort((a, b) => b[1].pct - a[1].pct)
        .slice(0, 3);
    lines.push(`Familles principales : ${famDom.map(([f, d]) => f + ' (' + Math.round(d.pct) + '%)').join(', ')}`);

    // Recommandation #1
    if (blends[0]) {
        lines.push(`\nMEILLEUR BLEND : ${blends[0].name} (score ${blends[0].score}/10)`);
        lines.push(`Composition : ${blends[0].components.map(c => c.wax + ' ' + c.pct + '%').join(' + ')}`);
        if (blends[0].why_works[0]) lines.push(`→ ${blends[0].why_works[0]}`);
    }

    // Pire choix
    const worst = blends[blends.length - 1];
    if (worst && worst.score < 5) {
        lines.push(`\nÀ ÉVITER : ${worst.name} (score ${worst.score}/10)`);
        if (worst.why_not_works[0]) lines.push(`→ ${worst.why_not_works[0]}`);
    }

    return lines.join('\n');
}


// ══════════════════════════════════════════════════════
// 5. GÉNÉRATION KB SEED
// ══════════════════════════════════════════════════════

/**
 * Convertir les données de WAX_BLEND_MATRIX en entrées KB
 */
function generateBlendKBEntries() {
    const entries = [];
    
    for (const [key, inter] of Object.entries(WAX_BLEND_MATRIX)) {
        const [base, additive] = key.split(' + ');
        const baseName = WAX_TYPES[base]?.full_name || base;
        const addName = WAX_TYPES[additive]?.full_name || additive;
        
        let content = `Interaction : ${baseName} + ${addName}\n`;
        content += `Synergie : ${inter.synergy}/10\n`;
        content += `Dosage recommandé : ${inter.range.min}-${inter.range.max}% (optimal: ${inter.range.sweet_spot}%)\n`;
        content += `Compatible : ${inter.incompatible ? 'NON ⚠️' : 'OUI'}\n\n`;
        
        content += `── Mécanisme ──\n${inter.mechanism}\n\n`;
        
        if (inter.why_works) content += `── Pourquoi ça fonctionne ──\n${inter.why_works}\n\n`;
        if (inter.why_not_works) content += `── Pourquoi ça ne fonctionne pas ──\n${inter.why_not_works}\n\n`;
        
        content += `── Effets ──\n`;
        for (const [effect, desc] of Object.entries(inter.effect_on || {})) {
            content += `${effect.replace(/_/g, ' ')} : ${desc}\n`;
        }
        
        if (inter.warning) content += `\n⚠️ ${inter.warning}`;
        
        entries.push({
            category: 'Science — Cires',
            subcategory: 'blend ' + base + '+' + additive,
            title: `Interaction blend — ${baseName} + ${addName}`,
            content,
            source: 'blend-recommender module — matrice interactions cires',
            priority: 4,
            tags: `blend,interaction,${base},${additive},synergie,mélange`
        });
    }
    
    return entries;
}


// ══════════════════════════════════════════════════════
// 5. RAPPORT SCIENTIFIQUE — DIAGNOSTIC COMPLET
// ══════════════════════════════════════════════════════

/**
 * Dictionnaire des mécanismes scientifiques.
 * Chaque entrée décrit un phénomène physico-chimique lié à l'interaction
 * parfum/cire et ses conséquences concrètes en bougie.
 */
const SCIENCE_MECHANISMS = {

    // ── SOLUBILITÉ ────────────────────────────────────
    solubility_apolar_in_paraffin: {
        title: 'Solubilité des molécules apolaires en paraffine',
        zone: 'froid + chaud',
        principle: 'Règle de Hildebrand : les substances de paramètres de solubilité (δ) proches sont miscibles. La paraffine (δ ≈ 16 MPa^½) est compatible avec les terpènes (δ ≈ 15-17 MPa^½) et les muscs (δ ≈ 17-19 MPa^½).',
        mechanism: 'Les n-alcanes C20-C40 de la paraffine et les hydrocarbures terpéniques interagissent par forces de van der Waals (London). Pas de composante polaire → dissolution homogène, pas de micro-domaines.',
        consequence_positive: 'Dissolution complète à la température d\'incorporation (60°C). Distribution uniforme du parfum dans la matrice solide. Throw régulier et prévisible.',
        applies_when: (profile) => profile.pct_apolaire > 25
    },

    solubility_apolar_in_soy: {
        title: 'Incompatibilité des terpènes en cire de soja',
        zone: 'froid + chaud',
        principle: 'Le soja est un triglycéride (δ ≈ 18-20 MPa^½). Les terpènes purs (δ ≈ 15-17 MPa^½) présentent un écart de paramètre de solubilité Δδ > 2, seuil au-delà duquel la miscibilité devient partielle.',
        mechanism: 'À la fonte (55°C), les terpènes se dissolvent par agitation. Au refroidissement, les triglycérides cristallisent (forme β\') en excluant les molécules apolaires des plans cristallins. Les terpènes migrent vers les zones amorphes intercristallines → distribution hétérogène.',
        consequence_negative: 'Diffusion à froid irrégulier (zones riches et pauvres en parfum). Diffusion à chaud réduit car la viscosité élevée du soja fondu (30-45 cSt vs 4-6 cSt paraffine) freine la migration des terpènes vers la surface du melt pool.',
        applies_when: (profile) => profile.pct_terpenes_total > 25
    },

    solubility_ester_in_soy: {
        title: 'Affinité chimique esters/soja (ester-ester)',
        zone: 'chaud',
        principle: 'Le soja hydrogéné EST un ester (triglycéride = triple ester de glycérol + acides gras). Les esters du parfum (acétates, salicylates) ont la même fonction chimique → solubilité par affinité de groupe fonctionnel.',
        mechanism: 'Les interactions dipôle-dipôle entre les groupes C=O des esters du parfum et les C=O du triglycéride créent des forces d\'attraction supérieures aux seules forces de London. La dissolution est thermodynamiquement favorisée (ΔG_mix < 0).',
        consequence_positive: 'Dissolution quasi-parfaite. Le parfum s\'intègre dans la structure cristalline du soja plutôt que d\'en être exclu → rétention excellente, libération progressive lors de la fonte.',
        applies_when: (profile) => profile.pct_esters > 15
    },

    // ── VOLATILITÉ ET DIFFUSION ───────────────────────
    volatility_high_terpenes: {
        title: 'Volatilité excessive des terpènes — perte des notes de tête',
        zone: 'froid + chaud',
        principle: 'La tension de vapeur d\'une molécule décroît exponentiellement avec sa masse molaire (loi de Clausius-Clapeyron). Les terpènes (masse mol. ≈ 136, Teb ≈ 170°C) ont une pression de vapeur 10-100× supérieure aux muscs (masse mol. ≈ 258, Teb > 300°C) à la température du melt pool.',
        mechanism: 'Dans le melt pool (55-65°C), les terpènes atteignent une fraction significative de leur pression de vapeur saturante. Leur taux d\'évaporation suit la loi de Hertz-Knudsen : J ∝ (Psat - Pamb) / √(MW·T). Plus la molécule est légère, plus elle s\'évapore vite.',
        consequence_negative: 'Les notes de tête (agrumes, herbes) disparaissent dans les 30-60 premières minutes de combustion. Le parfum "tourne" vers les notes de fond. Si le parfum est >50% terpènes, le diffusion à chaud sera décevant après 1h.',
        consequence_positive: 'Diffusion à froid excellent (forte pression de vapeur même à 20°C). Les premières minutes de combustion sont spectaculaires.',
        mitigation: 'Utiliser des fixateurs (muscs macrocycliques, éthylène brassylate) pour ralentir l\'évaporation. Ajouter 5% cire de coco pour créer des micro-réservoirs de libération prolongée.',
        applies_when: (profile) => profile.volatility.très_haute.pct > 30
    },

    volatility_heavy_musks: {
        title: 'Muscs lourds — diffusion limitée par la masse molaire',
        zone: 'chaud',
        principle: 'Le coefficient de diffusion D d\'une molécule dans un liquide est inversement proportionnel à sa taille (loi de Stokes-Einstein : D = kT / 6πηr). Les muscs (masse mol. 250-300, rayon ~5Å) diffusent 3-5× plus lentement que les terpènes (masse mol. 136, rayon ~3Å).',
        mechanism: 'Dans le melt pool, les muscs se déplacent lentement vers la surface. La couche limite de diffusion (interface cire fondue / air) est le goulot d\'étranglement. En paraffine fluide (η ≈ 4 cSt), la diffusion est acceptable. En soja visqueux (η ≈ 35 cSt), elle est quasi-nulle.',
        consequence_negative: 'Diffusion à chaud dominé par les notes de fond = parfum plat, sans éclat. Si le parfum est >15% muscs lourds en soja, la diffusion sera insuffisante.',
        consequence_positive: 'Excellente tenue dans le temps. Les muscs sont les dernières notes à disparaître → le parfum dure des heures.',
        mitigation: 'Choisir des muscs macrocycliques (ambrettolide, éthylène brassylate) plutôt que polycycliques (galaxolide) : même masse mol. mais pression de vapeur légèrement supérieure.',
        applies_when: (profile) => profile.pct_muscs > 8
    },

    viscosity_melt_pool: {
        title: 'Viscosité du melt pool — facteur limitant du throw',
        zone: 'chaud',
        principle: 'Le throw (diffusion du parfum dans l\'air) est proportionnel au flux de masse à l\'interface liquide/air. Ce flux dépend de : (1) la pression de vapeur des molécules, (2) le coefficient de diffusion dans la cire fondue (∝ 1/η), (3) la surface du melt pool.',
        mechanism: 'La viscosité η du melt pool contrôle la vitesse à laquelle les molécules de parfum migrent du bulk vers la surface. Paraffine à 60°C : η ≈ 4 cSt (rapide). Soja à 50°C : η ≈ 35 cSt (9× plus lent). Cet écart d\'un ordre de grandeur explique la différence fondamentale de throw.',
        consequence_negative: 'En cire végétale, le throw est intrinsèquement limité par la viscosité, quelle que soit la qualité du parfum ou la charge.',
        mitigation: 'Augmenter la température du melt pool (mèche plus grosse) ou ajouter de la cire de coco (viscosant négatif).',
        applies_when: () => true // Toujours pertinent
    },

    // ── FLASH POINT ───────────────────────────────────
    flash_point_risk: {
        title: 'Flash point bas — risque sécurité',
        zone: 'sécurité',
        principle: 'Le flash point d\'un mélange est approximé par celui de son composant le plus volatil (loi de Le Chatelier pour les mélanges de vapeurs inflammables). Un composant à FP 33°C (α-pinène) dans un parfum à 8% dans une cire signifie que la concentration effective en phase vapeur atteint ~0.3% du parfum au-dessus du melt pool.',
        mechanism: 'La limite inférieure d\'inflammabilité (LII) des terpènes en air est ~0.7-1.0% vol. À 8% de charge dans la cire, avec un melt pool à 60°C, la concentration en vapeur de terpènes au-dessus du melt pool peut atteindre 0.3-0.5% — en dessous de la LII mais avec marge réduite. Si la mèche est surdimensionnée (flamme haute, melt pool >65°C), la marge de sécurité disparaît.',
        consequence_negative: 'Flamme haute, instable. Risque d\'allumage des vapeurs si flamme haute + courant d\'air. Scintillation visible (micro-combustion des vapeurs).',
        mitigation: 'Réduire la charge parfum à 6% max. Dimensionner la mèche correctement (melt pool ≤ 60°C). Ne jamais utiliser en bougie non-conteneur (pas de pilier avec >3% terpènes).',
        applies_when: (profile) => profile.min_flash_point && profile.min_flash_point < 65
    },

    // ── RÉACTIVITÉ CHIMIQUE ───────────────────────────
    aldehyde_acid_reaction: {
        title: 'Réaction aldéhyde-acide — jaunissement et modification olfactive',
        zone: 'stabilité',
        principle: 'Les aldéhydes (R-CHO) réagissent avec les acides carboxyliques libres (R\'-COOH) pour former des demi-acétals (R-CH(OH)-O-CO-R\'). Cette réaction est catalysée par les traces d\'acidité résiduelle dans les cires végétales (indice d\'acide 0.1-0.5 mg KOH/g).',
        mechanism: 'Le citral, la vanilline et les aldéhydes cinnamiques sont particulièrement réactifs. En milieu acide (soja, stéarique), la réaction est lente mais progressive. Les demi-acétals formés sont inodores → perte de l\'odeur originale. La réaction génère aussi des sous-produits colorés (polymérisation de Tischenko) → jaunissement.',
        consequence_negative: 'Le parfum "tourne" après 2-4 semaines en cire de soja. La vanilline jaunit la cire. Le citral perd son odeur citronnée. Effet irréversible.',
        mitigation: 'En paraffine pure (neutre, pas d\'acide libre), le problème n\'existe pas. En soja : utiliser du soja à indice d\'acide < 0.1. Éviter le mélange soja + acide stéarique avec des parfums aldéhydés.',
        applies_when: (profile) => profile.pct_aldehydes > 3
    },

    phenol_oxidation: {
        title: 'Oxydation des phénols — brunissement progressif',
        zone: 'stabilité',
        principle: 'Les phénols (eugénol, isoeugénol) s\'oxydent au contact de l\'air en quinones colorées. La réaction est autocatalytique : les quinones catalysent l\'oxydation des phénols restants.',
        mechanism: 'En surface de la bougie (contact air), les phénols s\'oxydent lentement. La réaction est accélérée par la lumière UV et la chaleur. Les quinones formées sont brunes et aromatiques (odeur "vanille vieille").',
        consequence_negative: 'Brunissement de la surface de la bougie. Modification de l\'odeur vers des notes "âgées". Effet visible surtout en cire blanche (paraffine).',
        mitigation: 'Stocker les bougies à l\'abri de la lumière. Limiter les phénols à 3-5% du parfum total. En production, utiliser un antioxydant (BHT 0.01%) ou couvrir immédiatement.',
        applies_when: (profile) => (profile.families['phénol']?.pct || 0) > 2
    },

    // ── CRISTALLISATION ET STRUCTURE ──────────────────
    crystallization_polymorphism: {
        title: 'Polymorphisme cristallin du soja — impact sur la maturation',
        zone: 'froid',
        principle: 'Le soja hydrogéné cristallise en 2 formes polymorphes : β\' (métastable, rapide) et β (stable, lente). La transformation β\' → β prend 7-21 jours et s\'accompagne d\'un réarrangement moléculaire qui redistribue le parfum.',
        mechanism: 'Lors du refroidissement rapide : cristallisation en forme β\' (petits cristaux, réseau lâche → parfum piégé uniformément). Pendant la maturation : transformation β\' → β (cristaux plus gros, plus ordonnés → parfum expulsé vers les zones intercristallines → disponible pour le throw).',
        consequence_negative: 'Sans maturation de 14 jours, le throw est très inférieur au potentiel réel. Le client qui teste la bougie le jour de la réception sera déçu.',
        consequence_positive: 'Après maturation complète, le throw peut rivaliser avec la paraffine pour les parfums à haute affinité ester.',
        applies_when: () => true // Pertinent dès que soja est considéré
    },

    paraffin_crystal_channels: {
        title: 'Canaux intercristallins de la paraffine — autoroute du parfum',
        zone: 'froid',
        principle: 'La paraffine cristallise en lamelles orthorhombiques empilées. Entre les lamelles, des canaux de 1-10 nm contiennent les impuretés et le parfum. Ces canaux forment un réseau continu de la bulk vers la surface.',
        mechanism: 'À température ambiante, le parfum dans les canaux est immobile (solide piégé). Lors de la combustion, le front de fusion avance et libère progressivement le parfum des canaux → diffusion contrôlée et régulière.',
        consequence_positive: 'Le throw est progressif et constant dans le temps (pas de "burst and fade"). La paraffine medium (cp 54°C, canaux optimaux) offre le meilleur équilibre rétention/libération.',
        applies_when: () => true
    },

    micro_wax_trapping: {
        title: 'Piégeage dans la microcristalline — le trou noir du parfum',
        zone: 'froid + chaud',
        principle: 'La microcristalline a une structure amorphe (cristaux < 1 μm, pas de canaux continus). Le parfum est encapsulé dans des poches isolées sans chemin de diffusion vers la surface.',
        mechanism: 'Les hydrocarbures ramifiés C30-C70 créent un enchevêtrement tridimensionnel dense. Le parfum s\'insère lors du mélange à chaud mais est définitivement piégé au refroidissement. Même lors de la fonte, la viscosité élevée (15-25 cSt) empêche la migration.',
        consequence_negative: 'En micro pure : throw quasi nul. Le parfum est "gaspillé". En blend (5-10%), seule la fraction piégée dans la micro est perdue (perte nette 5-10% du parfum → acceptable).',
        consequence_positive: 'Le piégeage partiel agit comme tampon : libération lissée dans le temps, pas de pic suivi d\'un creux.',
        applies_when: () => true
    },

    // ── INTERACTIONS THERMIQUES ───────────────────────
    thermal_degradation: {
        title: 'Dégradation thermique à l\'incorporation',
        zone: 'fabrication',
        principle: 'Les molécules de parfum ont des températures de début de décomposition variables. Les aldéhydes se dégradent dès 80°C (réaction de Cannizzaro). Les esters se transestérifient au-dessus de 100°C. Les terpènes s\'isomérisent dès 70°C.',
        mechanism: 'Si la température d\'incorporation est trop élevée, les molécules fragiles se transforment en sous-produits inodores ou malodorants. Le citral (aldéhyde) est particulièrement sensible : à 80°C, il cyclise en p-cymène (odeur de thym, inodore en bougie). Le linalol (terpène-alcool) s\'isomérise en géraniol et nérol (odeur différente).',
        consequence_negative: 'Le parfum "ne sent plus pareil" en bougie qu\'en smelling strip. Le client est déçu. L\'effet est irréversible.',
        mitigation: 'Incorporer le parfum à la température la plus basse possible : 58-62°C pour les parfums riches en terpènes/aldéhydes, 62-65°C pour les autres. Ne jamais dépasser 70°C avec le parfum incorporé.',
        applies_when: (profile) => profile.pct_terpenes_total > 20 || profile.pct_aldehydes > 5
    },

    melt_pool_temperature: {
        title: 'Température du melt pool — le moteur du diffusion à chaud',
        zone: 'chaud',
        principle: 'La pression de vapeur P des composants du parfum suit la loi d\'Antoine : log(P) = A - B/(T+C). Une augmentation de 10°C du melt pool double approximativement la pression de vapeur → double le throw.',
        mechanism: 'La paraffine a un melt pool à 55-65°C (selon la mèche et le cp). Le soja a un melt pool à 45-50°C (point de fusion plus bas → fond plus vite mais moins chaud). Cet écart de 10-15°C se traduit par un throw 2-3× supérieur en paraffine.',
        consequence_positive: 'En paraffine, même un parfum "faible" aura un throw acceptable grâce à la température élevée du melt pool.',
        consequence_negative: 'En soja, même un bon parfum peut sembler faible car le melt pool n\'est pas assez chaud pour vaporiser efficacement les molécules lourdes (masse mol. > 200).',
        applies_when: () => true
    }
};


/**
 * Générer un rapport scientifique complet pour un parfum.
 * Analyse POURQUOI le parfum fonctionne ou ne fonctionne pas
 * dans chaque type de cire, uniquement sur base scientifique.
 * 
 * @param {Array} components - Composants FDS
 * @param {Object} moleculeDB - MOLECULE_DB complet
 * @param {string} containerType - Type de contenant
 * @returns {Object} Rapport scientifique structuré
 */
function generateScientificReport(components, moleculeDB, containerType = 'container') {
    const profile = buildFragranceProfile(components, moleculeDB);
    
    const report = {
        fragrance_profile: profile,
        diagnostic: {
            overall_viability: '',  // 'excellent', 'bon', 'problématique', 'inadapté'
            critical_issues: [],     // Problèmes rédhibitoires
            warnings: [],            // Avertissements
            strengths: []            // Points forts
        },
        by_wax_type: {},
        mechanisms_triggered: [],
        process_constraints: {},
        summary_fr: ''
    };

    // ── A. Mécanismes déclenchés ──────────────────────
    for (const [key, mech] of Object.entries(SCIENCE_MECHANISMS)) {
        if (mech.applies_when(profile)) {
            const entry = {
                key,
                title: mech.title,
                zone: mech.zone || '',
                principle: mech.principle,
                mechanism: mech.mechanism
            };
            if (mech.consequence_positive) entry.consequence_positive = mech.consequence_positive;
            if (mech.consequence_negative) entry.consequence_negative = mech.consequence_negative;
            if (mech.mitigation) entry.mitigation = mech.mitigation;
            report.mechanisms_triggered.push(entry);
        }
    }

    // ── B. Analyse par type de cire ───────────────────
    const waxAnalysis = {
        paraffine: analyzeForWaxType(profile, 'paraffine'),
        soja: analyzeForWaxType(profile, 'soja'),
        colza: analyzeForWaxType(profile, 'colza'),
        microcristalline: analyzeForWaxType(profile, 'microcristalline'),
        coco: analyzeForWaxType(profile, 'coco')
    };
    report.by_wax_type = waxAnalysis;

    // ── C. Diagnostic global ──────────────────────────
    const allScores = Object.values(waxAnalysis).map(a => a.score);
    const bestScore = Math.max(...allScores);
    
    if (bestScore >= 8) report.diagnostic.overall_viability = 'excellent';
    else if (bestScore >= 6) report.diagnostic.overall_viability = 'bon';
    else if (bestScore >= 4) report.diagnostic.overall_viability = 'problématique';
    else report.diagnostic.overall_viability = 'inadapté';

    // Issues critiques
    const fpNote = profile.fragrance_flash_point 
        ? `Point éclair du parfum (FDS) : ${profile.fragrance_flash_point}°C.`
        : profile.min_flash_point 
            ? `Point éclair estimé depuis le composant le plus bas : ${profile.min_flash_point}°C (le FP réel du mélange est probablement plus élevé).`
            : '';
    const effectiveFP = profile.fragrance_flash_point || profile.min_flash_point;
    
    if (effectiveFP && effectiveFP < 40) {
        report.diagnostic.critical_issues.push({
            type: 'SÉCURITÉ',
            message: `${fpNote} Composants inflammables : ${profile.low_flash_components.map(c => c.name + ' FP=' + c.fp + '°C').join(', ')}. Charge parfum LIMITÉE à 6% max. Mèche surdimensionnée interdite.`,
            science: SCIENCE_MECHANISMS.flash_point_risk.principle
        });
    }

    if (profile.volatility.très_haute.pct > 50) {
        report.diagnostic.critical_issues.push({
            type: 'VOLATILITÉ',
            message: `${Math.round(profile.volatility.très_haute.pct)}% de composants à volatilité très haute (masse mol. < 150). Le diffusion à chaud sera éphémère : intense les 30 premières minutes puis chute rapide. Le diffusion à froid sera excellent.`,
            science: SCIENCE_MECHANISMS.volatility_high_terpenes.principle
        });
    }

    if (profile.pct_aldehydes > 10) {
        report.diagnostic.warnings.push({
            type: 'RÉACTIVITÉ',
            message: `${profile.pct_aldehydes}% d'aldéhydes. Risque de dégradation en cires acides (soja, stéarique). Jaunissement probable. Incompatible avec stéarine comme additif.`,
            science: SCIENCE_MECHANISMS.aldehyde_acid_reaction.mechanism
        });
    }

    if ((profile.families['phénol']?.pct || 0) > 5) {
        report.diagnostic.warnings.push({
            type: 'OXYDATION',
            message: `${Math.round(profile.families['phénol'].pct)}% de phénols (eugénol, etc.). Brunissement en surface au contact de l'air. Stockage à l'abri de la lumière obligatoire.`,
            science: SCIENCE_MECHANISMS.phenol_oxidation.mechanism
        });
    }

    // Points forts
    if (profile.pct_esters > 20) {
        report.diagnostic.strengths.push({
            type: 'VERSATILITÉ',
            message: `Profil riche en esters (${profile.pct_esters}%) : compatible avec TOUS les types de cires. Affinité particulière avec le soja (ester-ester).`
        });
    }

    if (profile.avg_mw > 170 && profile.avg_mw < 220) {
        report.diagnostic.strengths.push({
            type: 'MASSE MOL. OPTIMALE',
            message: `Masse mol. moyenne de ${profile.avg_mw} : plage idéale (170-220). Assez volatil pour diffuser, assez lourd pour persister. Bon équilibre head/heart/base.`
        });
    }

    const volBalance = profile.volatility.très_haute.pct + profile.volatility.haute.pct;
    const fixBalance = profile.volatility.basse.pct + profile.volatility.très_basse.pct;
    if (volBalance > 20 && fixBalance > 10 && volBalance < 60) {
        report.diagnostic.strengths.push({
            type: 'PYRAMIDE OLFACTIVE',
            message: `Pyramide olfactive bien équilibrée (${Math.round(volBalance)}% volatils, ${Math.round(fixBalance)}% fixateurs). Le throw sera soutenu dans le temps.`
        });
    }

    // ── D. Contraintes process ────────────────────────
    report.process_constraints = {
        temp_max_incorporation: profile.pct_terpenes_total > 20 || profile.pct_aldehydes > 5 
            ? { value: '58-62°C', reason: 'Terpènes et/ou aldéhydes sensibles à la dégradation thermique. Au-delà de 70°C : isomérisation des terpènes, cyclisation des aldéhydes.' }
            : { value: '62-65°C', reason: 'Pas de composants thermosensibles critiques.' },
        charge_max: profile.min_flash_point && profile.min_flash_point < 65
            ? { value: '6%', reason: `Flash point bas (${profile.min_flash_point}°C). Concentration réduite pour maintenir la marge de sécurité au-dessus de la LII.`, scientific: false }
            : { value: '8-10% (paraffine) / 10-12% (soja)', reason: 'Flash point acceptable. Charges standard selon le type de cire. Voir le diagnostic de diffusion pour un calcul scientifique personnalisé (Hildebrand × Flory-Huggins).', scientific: false },
        cure_minimum: profile.pct_terpenes_total > 40
            ? { paraffine: '5-7 jours', soja: '21 jours', reason: 'Forte proportion de terpènes : migration intercristalline lente, nécessite une maturation prolongée en végétal.' }
            : { paraffine: '3-5 jours', soja: '14 jours', reason: 'Profil standard.' }
    };

    // ── E. Résumé ─────────────────────────────────────
    report.summary_fr = generateScientificSummary(profile, report);

    return report;
}


/**
 * Analyse détaillée pour un type de cire spécifique
 */
function analyzeForWaxType(profile, waxType) {
    const analysis = {
        wax_type: waxType,
        wax_name: WAX_TYPES[waxType]?.full_name || waxType,
        score: 5,
        verdict: '',
        works: [],     // Raisons scientifiques positives
        fails: [],     // Raisons scientifiques négatives
        neutral: []    // Observations neutres
    };

    // ── PARAFFINE ─────────────────────────────────────
    if (waxType === 'paraffine') {
        analysis.score = 7; // Base

        // Terpènes → excellent
        if (profile.pct_terpenes_total > 20) {
            analysis.score += 1.5;
            analysis.works.push({
                factor: 'Solubilité apolaire-apolaire',
                detail: `Les ${Math.round(profile.pct_terpenes_total)}% de terpènes (δ ≈ 16 MPa^½) sont parfaitement solubles dans la paraffine (δ ≈ 16 MPa^½). Forces de van der Waals suffisantes pour la dissolution. Pas de micro-domaines, distribution homogène.`,
                impact: 'Diffusion à froid et diffusion à chaud optimaux pour les notes de tête.'
            });
        }

        // Esters → bon
        if (profile.pct_esters > 15) {
            analysis.score += 0.5;
            analysis.works.push({
                factor: 'Compatibilité esters',
                detail: `Les esters (${Math.round(profile.pct_esters)}%) ont un δ ≈ 18 MPa^½, légèrement au-dessus de la paraffine. La dissolution est bonne mais non parfaite — quelques % restent dans les défauts cristallins → libération prolongée.`,
                impact: 'Soutient le throw dans la durée.'
            });
        }

        // Muscs lourds → modéré
        if (profile.pct_muscs > 10) {
            analysis.score -= 0.5;
            analysis.fails.push({
                factor: 'Diffusion limitée des muscs',
                detail: `Les ${Math.round(profile.pct_muscs)}% de muscs (masse mol. > 250) diffusent lentement dans le melt pool. Coefficient de diffusion D ∝ 1/(η·r) : avec r_musc ≈ 5Å vs r_terpène ≈ 3Å, la diffusion est 1.7× plus lente même en paraffine fluide.`,
                impact: 'Diffusion à chaud dominé par les notes lourdes. Manque d\'éclat si pas assez de notes de tête.'
            });
        }

        // Volatilité extrême → attention
        if (profile.volatility.très_haute.pct > 50) {
            analysis.score -= 1;
            analysis.fails.push({
                factor: 'Évaporation trop rapide',
                detail: `${Math.round(profile.volatility.très_haute.pct)}% de composants à très haute volatilité. En paraffine à 60°C, la pression de vapeur des terpènes atteint 5-15% de Psat → évaporation rapide du melt pool. Diffusion à chaud intense mais bref (< 45 min).`,
                impact: 'Le client perçoit un throw déclinant. Ajouter des fixateurs ou accepter l\'effet "burst".'
            });
        }

        // Aldéhydes → ok en paraffine (neutre)
        if (profile.pct_aldehydes > 3) {
            analysis.neutral.push({
                factor: 'Aldéhydes en milieu neutre',
                detail: `Les ${profile.pct_aldehydes}% d'aldéhydes sont stables en paraffine (pH neutre, pas d'acide libre). Pas de risque de réaction chimique. Attention uniquement à la température d'incorporation (< 70°C pour éviter la cyclisation du citral).`
            });
        }

        analysis.score = Math.min(10, Math.max(1, Math.round(analysis.score * 10) / 10));
        analysis.verdict = analysis.score >= 8 ? 'EXCELLENT — Recommandé' :
                          analysis.score >= 6 ? 'BON — Viable avec ajustements' :
                          analysis.score >= 4 ? 'MÉDIOCRE — Sous-optimal' : 'INADAPTÉ';
    }

    // ── SOJA ──────────────────────────────────────────
    if (waxType === 'soja') {
        analysis.score = 5; // Base inférieure (viscosité haute = handicap structurel)

        // Esters → excellent
        if (profile.pct_esters > 15) {
            analysis.score += 2;
            analysis.works.push({
                factor: 'Affinité ester-triglycéride',
                detail: `Interaction dipôle-dipôle entre les groupes C=O des ${Math.round(profile.pct_esters)}% d'esters et les C=O du triglycéride de soja. ΔG_mix < 0 → dissolution thermodynamiquement favorisée. Le parfum s'intègre dans le réseau cristallin.`,
                impact: 'Rétention excellente. Le throw se développe progressivement pendant la maturation et se maintient.'
            });
        }

        // Terpène-alcools → bon (le -OH interagit avec le triglycéride)
        if ((profile.families['terpène-alcool']?.pct || 0) > 10) {
            analysis.score += 1;
            analysis.works.push({
                factor: 'Interaction terpène-alcool / triglycéride',
                detail: `Les terpène-alcools (linalol, géraniol, citronellol = ${Math.round(profile.families['terpène-alcool'].pct)}%) ont un groupe -OH qui forme des liaisons H avec les oxygènes du triglycéride. Ce pont moléculaire compense partiellement leur caractère apolaire.`,
                impact: 'Meilleure rétention que les terpènes purs. Libération progressive lors de la fonte.'
            });
        }

        // Terpènes purs → mauvais
        if (profile.pct_terpenes_total > 25) {
            analysis.score -= 2;
            analysis.fails.push({
                factor: 'Incompatibilité terpènes/triglycérides',
                detail: `Δδ > 2 MPa^½ entre les ${Math.round(profile.pct_terpenes_total)}% de terpènes apolaires et le soja polaire. Au refroidissement, les terpènes sont exclus des plans cristallins β' → migration vers les zones amorphes → distribution hétérogène.`,
                impact: 'Diffusion à froid irrégulier. Diffusion à chaud limité par la viscosité (35 cSt) qui freine la diffusion des terpènes vers la surface.'
            });
        }

        // Aldéhydes → dangereux en soja
        if (profile.pct_aldehydes > 3) {
            analysis.score -= 1;
            analysis.fails.push({
                factor: 'Réactivité aldéhyde-acide gras',
                detail: `Les ${profile.pct_aldehydes}% d'aldéhydes réagissent avec les traces d'acides gras libres du soja (indice d'acide 0.1-0.5). Formation de demi-acétals inodores → perte progressive de l'odeur aldéhydée. Sous-produits colorés → jaunissement irréversible.`,
                impact: 'Dégradation olfactive et visuelle en 2-4 semaines. Inacceptable pour du luxe.'
            });
        }

        // Viscosité → handicap structurel
        analysis.fails.push({
            factor: 'Viscosité du melt pool',
            detail: `Le soja fondu a une viscosité de 30-45 cSt vs 4-6 cSt pour la paraffine (facteur 8×). Le coefficient de diffusion des molécules de parfum est inversement proportionnel (Stokes-Einstein) → le throw est structurellement inférieur d'un facteur 3-5×.`,
            impact: 'Même parfum, même charge : le throw en soja sera toujours inférieur à celui en paraffine. C\'est une limite physique, pas un défaut de formulation.'
        });

        // Muscs → rétention bonne en soja
        if (profile.pct_muscs > 5) {
            analysis.works.push({
                factor: 'Rétention des muscs',
                detail: `Les muscs lourds (masse mol. > 250) sont bien retenus dans la matrice dense du soja. La haute viscosité qui est un défaut pour le throw devient un avantage pour la longévité : libération très lente → tenue 8-12h.`,
                impact: 'Avantage pour les parfums orientaux/ambrés où la persistence est prioritaire.'
            });
        }

        analysis.score = Math.min(10, Math.max(1, Math.round(analysis.score * 10) / 10));
        analysis.verdict = analysis.score >= 8 ? 'EXCELLENT — Recommandé (maturation 14j obligatoire)' :
                          analysis.score >= 6 ? 'BON — Viable avec maturation longue' :
                          analysis.score >= 4 ? 'MÉDIOCRE — Throw décevant probable' : 'INADAPTÉ — Incompatibilité chimique';
    }

    // ── COLZA ─────────────────────────────────────────
    if (waxType === 'colza') {
        analysis.score = 5.5; // Légèrement supérieur au soja

        if (profile.pct_esters > 15) {
            analysis.score += 1.5;
            analysis.works.push({
                factor: 'Affinité ester + chaînes C22',
                detail: `Même affinité ester-triglycéride que le soja, mais les chaînes C22 (acide béhénique) du colza cristallisent plus régulièrement → moins de frosting, meilleure distribution du parfum.`,
                impact: 'Throw similaire au soja avec meilleure reproductibilité.'
            });
        }

        if (profile.pct_terpenes_total > 25) {
            analysis.score -= 1.5;
            analysis.fails.push({
                factor: 'Même limitation polaire que le soja',
                detail: `Le colza reste un triglycéride polaire (δ ≈ 19 MPa^½). L'incompatibilité avec les terpènes est identique au soja. Les chaînes C22 plus longues retiennent légèrement mieux les terpènes mais ne résolvent pas le problème fondamental.`,
                impact: 'Throw limité pour les notes agrumes/fraîches.'
            });
        }

        if (profile.pct_aldehydes > 3) {
            analysis.score -= 0.5;
            analysis.fails.push({
                factor: 'Réactivité aldéhyde modérée',
                detail: `Le colza a un indice d'acide plus bas que le soja (0.05-0.2 vs 0.1-0.5). La réaction aldéhyde-acide est plus lente mais pas éliminée.`,
                impact: 'Jaunissement retardé mais possible sur 4-8 semaines.'
            });
        }

        analysis.score = Math.min(10, Math.max(1, Math.round(analysis.score * 10) / 10));
        analysis.verdict = analysis.score >= 7 ? 'BON — Alternative végétale solide' :
                          analysis.score >= 5 ? 'CORRECT — Compromis acceptable' : 'MÉDIOCRE';
    }

    // ── MICROCRISTALLINE ──────────────────────────────
    if (waxType === 'microcristalline') {
        analysis.score = 2; // Jamais seule

        analysis.fails.push({
            factor: 'Structure amorphe = piège à parfum',
            detail: 'La microcristalline n\'a pas de canaux intercristallins. Le parfum est encapsulé dans des poches isolées sans chemin de diffusion. Le coefficient de diffusion effectif est quasi-nul (tortuosité infinie).',
            impact: 'Throw inexistant en cire pure. JAMAIS utiliser seule avec du parfum.'
        });

        analysis.neutral.push({
            factor: 'Valeur en blend uniquement',
            detail: 'En blend (3-10%), la micro remplit les espaces entre les cristaux de paraffine sans bloquer les canaux de diffusion. Elle réduit le retrait et les sinkholes en sacrifiant 5-10% du throw.'
        });

        analysis.score = 2;
        analysis.verdict = 'INADAPTÉ seule. Valeur uniquement en blend 3-10%.';
    }

    // ── COCO ──────────────────────────────────────────
    if (waxType === 'coco') {
        analysis.score = 3; // En blend uniquement

        analysis.works.push({
            factor: 'Chaînes C12 = véhicule de diffusion',
            detail: `Les triglycérides d'acide laurique (C12) de la coco fondent à 24°C → liquides à température ambiante. Ils créent des micro-réservoirs mobiles qui transportent le parfum jusqu'à la surface.`,
            impact: 'Boost du diffusion à froid. Les notes de tête sont amplifiées.'
        });

        if (profile.volatility.très_haute.pct > 20) {
            analysis.score += 1;
            analysis.works.push({
                factor: 'Synergie avec les terpènes volatils',
                detail: `Les ${Math.round(profile.volatility.très_haute.pct)}% de volatils sont solubilisés dans la fraction liquide de coco à température ambiante → diffusion passive permanente sans combustion.`,
                impact: 'Diffusion à froid spectaculaire.'
            });
        }

        analysis.fails.push({
            factor: 'Instabilité structurelle',
            detail: 'La coco fond à 24°C → la bougie "sue" au-dessus de 25°C. Impossible de maintenir une structure solide stable. Le parfum migre vers la surface et s\'évapore prématurément.',
            impact: 'Perte de parfum au stockage. Durée de vie réduite. JAMAIS utiliser seule.'
        });

        analysis.score = Math.min(5, Math.max(1, analysis.score));
        analysis.verdict = 'INADAPTÉ seule. Excellent boost en blend 5-10%.';
    }

    return analysis;
}


/**
 * Générer le résumé textuel du rapport scientifique
 */
function generateScientificSummary(profile, report) {
    const lines = [];
    
    lines.push('══════════════════════════════════════════════════════════════');
    lines.push('RAPPORT SCIENTIFIQUE — COMPATIBILITÉ PARFUM × CIRES');
    lines.push('══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`Parfum : ${profile.character || 'composite'}`);
    lines.push(`${profile.total_components} composants | Masse mol. moyenne ${profile.avg_mw} | FP min ${profile.min_flash_point || 'n/a'}°C`);
    lines.push(`Apolaire ${profile.pct_apolaire}% | Polaire ${profile.pct_polaire}% | Esters ${profile.pct_esters}%`);
    lines.push('');
    
    lines.push('── DIAGNOSTIC ──');
    lines.push(`Viabilité globale : ${report.diagnostic.overall_viability.toUpperCase()}`);
    
    if (report.diagnostic.critical_issues.length) {
        lines.push('');
        lines.push('⛔ PROBLÈMES CRITIQUES :');
        report.diagnostic.critical_issues.forEach(issue => {
            lines.push(`  [${issue.type}] ${issue.message}`);
        });
    }
    
    if (report.diagnostic.warnings.length) {
        lines.push('');
        lines.push('⚠️ AVERTISSEMENTS :');
        report.diagnostic.warnings.forEach(w => {
            lines.push(`  [${w.type}] ${w.message}`);
        });
    }
    
    if (report.diagnostic.strengths.length) {
        lines.push('');
        lines.push('✅ POINTS FORTS :');
        report.diagnostic.strengths.forEach(s => {
            lines.push(`  [${s.type}] ${s.message}`);
        });
    }
    
    lines.push('');
    lines.push('── COMPATIBILITÉ PAR TYPE DE CIRE ──');
    const sorted = Object.values(report.by_wax_type).sort((a, b) => b.score - a.score);
    for (const wax of sorted) {
        lines.push(`  ${wax.score}/10  ${wax.wax_name} — ${wax.verdict}`);
    }
    
    lines.push('');
    lines.push(`── CONTRAINTES PROCESS ──`);
    lines.push(`  T° max incorporation : ${report.process_constraints.temp_max_incorporation.value} (${report.process_constraints.temp_max_incorporation.reason})`);
    lines.push(`  Charge max : ${report.process_constraints.charge_max.value} (${report.process_constraints.charge_max.reason})`);
    
    lines.push('');
    lines.push(`${report.mechanisms_triggered.length} mécanismes scientifiques activés.`);
    
    return lines.join('\n');
}


// ══════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════

module.exports = {
    WAX_BLEND_MATRIX,
    SCIENCE_MECHANISMS,
    buildFragranceProfile,
    recommendBlends,
    generateFullReport,
    generateScientificReport,
    generateBlendKBEntries
};
