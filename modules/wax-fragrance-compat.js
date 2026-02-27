/**
 * MFC Laboratoire — Module Compatibilité Cire × Parfum
 * 
 * Analyse l'interaction entre une cire (type, composition) et un parfum
 * (profil moléculaire) pour prédire :
 *   - Solubilité du parfum dans la cire
 *   - Diffusion olfactive (diffusion à froid / diffusion à chaud)
 *   - Impact sur la combustion
 *   - Charge parfum optimale
 *   - Risques et recommandations
 * 
 * Fondé sur la chimie physique des mélanges :
 *   - Principe "like dissolves like" (polarité)
 *   - LogP / MW comme proxy de solubilité dans les hydrocarbures
 *   - Viscosité de la cire fondue → migration des molécules
 *   - Pression de vapeur → libération olfactive
 * 
 * Usage :
 *   const compat = require('./modules/wax-fragrance-compat');
 *   const analysis = compat.analyzeCompatibility(waxData, fragranceComponents);
 *   const reco = await compat.analyzeFormulaCompatibility(db, fragranceId, waxType);
 */

const { WAX_TYPES, classifyWax, getWaxTypeData } = require('./wax-enrichment');

// ══════════════════════════════════════════════════════
// 1. SCIENCE : RÈGLES D'INTERACTION CIRE × MOLÉCULE
// ══════════════════════════════════════════════════════

/**
 * Matrice de compatibilité famille chimique × type de cire.
 * 
 * Score de 1 (mauvais) à 5 (excellent).
 * 
 * Logique chimique :
 *   - Paraffine (apolaire, hydrocarbures) → dissolve bien les apolaires (terpènes, muscs)
 *   - Soja/Colza (esters de glycérol, polaire) → meilleure affinité avec les polaires
 *   - Micro (ramifié, visqueux) → piège les molécules, peu de libération
 *   - Coco (chaînes courtes) → faible rétention, libération rapide
 */
const COMPATIBILITY_MATRIX = {
    //                          paraffine  paraf_ft  micro  soja  colza  coco  beeswax
    'terpène':              {   paraffine: 5, paraffine_ft: 5, microcristalline: 2, soja: 4, colza: 4, coco: 4, beeswax: 3 },
    'terpène-alcool':       {   paraffine: 5, paraffine_ft: 4, microcristalline: 2, soja: 5, colza: 5, coco: 4, beeswax: 3 },
    'sesquiterpène':        {   paraffine: 5, paraffine_ft: 5, microcristalline: 3, soja: 4, colza: 4, coco: 3, beeswax: 4 },
    'sesquiterpène-alcool': {   paraffine: 5, paraffine_ft: 5, microcristalline: 3, soja: 4, colza: 4, coco: 3, beeswax: 4 },
    'aldéhyde':             {   paraffine: 4, paraffine_ft: 4, microcristalline: 2, soja: 4, colza: 4, coco: 4, beeswax: 3 },
    'aldéhyde-terpénique':  {   paraffine: 5, paraffine_ft: 4, microcristalline: 2, soja: 4, colza: 4, coco: 4, beeswax: 3 },
    'aldéhyde-aromatique':  {   paraffine: 4, paraffine_ft: 3, microcristalline: 2, soja: 4, colza: 4, coco: 3, beeswax: 3 },
    'cétone':               {   paraffine: 4, paraffine_ft: 4, microcristalline: 3, soja: 4, colza: 4, coco: 3, beeswax: 3 },
    'cétone-boisée':        {   paraffine: 5, paraffine_ft: 5, microcristalline: 3, soja: 3, colza: 3, coco: 2, beeswax: 3 },
    'ester':                {   paraffine: 4, paraffine_ft: 4, microcristalline: 3, soja: 5, colza: 5, coco: 4, beeswax: 4 },
    'lactone':              {   paraffine: 4, paraffine_ft: 4, microcristalline: 3, soja: 5, colza: 5, coco: 4, beeswax: 3 },
    'musc-polycyclique':    {   paraffine: 4, paraffine_ft: 4, microcristalline: 4, soja: 3, colza: 3, coco: 2, beeswax: 3 },
    'musc-synthétique':     {   paraffine: 4, paraffine_ft: 4, microcristalline: 4, soja: 3, colza: 3, coco: 2, beeswax: 3 },
    'musc-boisé':           {   paraffine: 4, paraffine_ft: 4, microcristalline: 3, soja: 3, colza: 3, coco: 2, beeswax: 3 },
    'musc-nitro':           {   paraffine: 3, paraffine_ft: 3, microcristalline: 3, soja: 3, colza: 3, coco: 2, beeswax: 2 },
    'phénol':               {   paraffine: 3, paraffine_ft: 3, microcristalline: 2, soja: 4, colza: 4, coco: 3, beeswax: 3 },
    'coumarine':            {   paraffine: 4, paraffine_ft: 4, microcristalline: 3, soja: 4, colza: 4, coco: 3, beeswax: 3 },
    'aromatique':           {   paraffine: 4, paraffine_ft: 4, microcristalline: 3, soja: 4, colza: 4, coco: 3, beeswax: 3 },
    'azoté':                {   paraffine: 3, paraffine_ft: 3, microcristalline: 2, soja: 3, colza: 3, coco: 2, beeswax: 2 },
    'nitrile':              {   paraffine: 3, paraffine_ft: 3, microcristalline: 2, soja: 3, colza: 3, coco: 2, beeswax: 2 },
    'autre':                {   paraffine: 4, paraffine_ft: 4, microcristalline: 3, soja: 4, colza: 4, coco: 3, beeswax: 3 },
    'inconnu':              {   paraffine: 3, paraffine_ft: 3, microcristalline: 3, soja: 3, colza: 3, coco: 3, beeswax: 3 }
};

/**
 * Impact de la volatilité sur le throw selon le type de cire.
 * Logique : 
 *   - Cires à faible viscosité (paraffine) → libèrent facilement les volatils = bon diffusion à chaud
 *   - Cires visqueuses (soja, micro) → retiennent les volatils = throw retardé, cure time nécessaire
 *   - Coco (chaînes courtes) → libération rapide, volatils s'échappent vite = bon diffusion à froid mais durée limitée
 */
const VOLATILITY_THROW_IMPACT = {
    // volatilité → { waxType: { cold_throw, hot_throw } } (1-5)
    'très_haute': {
        paraffine:       { cold: 4, hot: 5, note: 'Diffusion immédiate, risque d\'évaporation au coulage' },
        paraffine_ft:    { cold: 4, hot: 5, note: 'Idem paraffine' },
        microcristalline:{ cold: 2, hot: 3, note: 'Piégé dans la matrice visqueuse, libération lente' },
        soja:            { cold: 3, hot: 4, note: 'Bon après cure — terpènes bien libérés' },
        colza:           { cold: 3, hot: 4, note: 'Similaire soja' },
        coco:            { cold: 5, hot: 4, note: 'Libération très rapide — diffusion à froid fort mais courte durée' },
        beeswax:         { cold: 2, hot: 3, note: 'Forte rétention, libération limitée' }
    },
    'haute': {
        paraffine:       { cold: 4, hot: 5, note: 'Excellent équilibre cold/hot' },
        paraffine_ft:    { cold: 3, hot: 5, note: 'Bon diffusion à chaud grâce à la cristallinité pure' },
        microcristalline:{ cold: 2, hot: 3, note: 'Rétention forte' },
        soja:            { cold: 3, hot: 5, note: 'Excellent diffusion à chaud après cure 2 semaines' },
        colza:           { cold: 3, hot: 4, note: 'Bon après cure' },
        coco:            { cold: 4, hot: 4, note: 'Très bonne diffusion' },
        beeswax:         { cold: 2, hot: 3, note: 'Rétention' }
    },
    'moyenne': {
        paraffine:       { cold: 3, hot: 4, note: 'Bon soutien olfactif' },
        paraffine_ft:    { cold: 3, hot: 4, note: 'Soutien stable' },
        microcristalline:{ cold: 2, hot: 3, note: 'Libération graduelle' },
        soja:            { cold: 3, hot: 4, note: 'Bonne tenue dans la durée' },
        colza:           { cold: 3, hot: 4, note: 'Bonne tenue' },
        coco:            { cold: 3, hot: 3, note: 'Tenue moyenne' },
        beeswax:         { cold: 2, hot: 3, note: 'Tenue longue mais faible intensité' }
    },
    'basse': {
        paraffine:       { cold: 2, hot: 3, note: 'Fixateur — soutien de fond' },
        paraffine_ft:    { cold: 2, hot: 3, note: 'Fixateur' },
        microcristalline:{ cold: 2, hot: 2, note: 'Double rétention — presque pas de libération' },
        soja:            { cold: 2, hot: 3, note: 'Fixateur, bon en fond' },
        colza:           { cold: 2, hot: 3, note: 'Fixateur' },
        coco:            { cold: 2, hot: 2, note: 'Peu de libération' },
        beeswax:         { cold: 1, hot: 2, note: 'Piégé' }
    },
    'très_basse': {
        paraffine:       { cold: 1, hot: 2, note: 'Quasi fixateur pur — peu de throw, ancrage' },
        paraffine_ft:    { cold: 1, hot: 2, note: 'Fixateur' },
        microcristalline:{ cold: 1, hot: 1, note: 'Aucune libération perceptible' },
        soja:            { cold: 1, hot: 2, note: 'Ancrage uniquement' },
        colza:           { cold: 1, hot: 2, note: 'Ancrage' },
        coco:            { cold: 1, hot: 1, note: 'Aucun throw' },
        beeswax:         { cold: 1, hot: 1, note: 'Aucun throw' }
    }
};


// ══════════════════════════════════════════════════════
// 2. ANALYSE D'UNE MOLÉCULE × CIRE
// ══════════════════════════════════════════════════════

/**
 * Analyser la compatibilité d'une molécule avec un type de cire
 */
function analyzeMoleculeWaxCompat(molecule, waxType) {
    const family = molecule.family || molecule.derived?.family_estimate || 'inconnu';
    const volatility = molecule.volatility || molecule.derived?.volatility || 'moyenne';
    const mw = molecule.mw || molecule.molecular_weight || null;
    const fp = molecule.fp || molecule.flash_point_c || null;
    const solubility = molecule.solubility_wax || molecule.derived?.solubility_wax || null;

    // Score de solubilité depuis la matrice
    const familyRow = COMPATIBILITY_MATRIX[family] || COMPATIBILITY_MATRIX['inconnu'];
    const solubilityScore = familyRow[waxType] || 3;

    // Score de throw depuis la volatilité
    const volRow = VOLATILITY_THROW_IMPACT[volatility] || VOLATILITY_THROW_IMPACT['moyenne'];
    const throwData = volRow[waxType] || { cold: 3, hot: 3, note: '' };

    // Risques
    const risks = [];
    
    // Flash point vs température de travail
    if (fp !== null) {
        const waxData = WAX_TYPES[waxType];
        const workTemp = waxData?.properties_range?.mp?.max ? waxData.properties_range.mp.max + 15 : 80;
        if (fp < workTemp) {
            risks.push({
                level: 'danger',
                message: `Flash point molécule (${fp}°C) < température de travail (~${workTemp}°C) — risque inflammabilité`
            });
        } else if (fp < workTemp + 20) {
            risks.push({
                level: 'attention',
                message: `Flash point molécule (${fp}°C) proche de la température de travail — ventilation recommandée`
            });
        }
    }

    // Molécules lourdes dans cires fluides
    if (mw && mw > 300 && (waxType === 'coco' || waxType === 'paraffine')) {
        risks.push({
            level: 'info',
            message: 'Molécule lourde (MW ' + mw + ') — risque de migration/séparation dans cire fluide'
        });
    }

    // Vanilline / aldéhydes dans cires claires
    if ((family.includes('aldéhyde') || molecule.name?.toLowerCase().includes('vanill')) && 
        (waxType === 'paraffine' || waxType === 'paraffine_ft')) {
        risks.push({
            level: 'attention',
            message: 'Aldéhyde/vanilline — peut jaunir la cire claire au stockage'
        });
    }

    // Solubilité limitée
    if (solubilityScore <= 2) {
        risks.push({
            level: 'attention',
            message: `Solubilité limitée dans ${waxType} — réduire la charge ou ajouter co-solvant (Vybar)`
        });
    }

    return {
        molecule: molecule.name || molecule.cas || '?',
        family,
        wax_type: waxType,
        solubility_score: solubilityScore,
        solubility_label: ['', 'très faible', 'faible', 'moyenne', 'bonne', 'excellente'][solubilityScore],
        cold_throw: throwData.cold,
        hot_throw: throwData.hot,
        throw_note: throwData.note,
        volatility,
        mw: mw || null,
        fp: fp || null,
        risks
    };
}


// ══════════════════════════════════════════════════════
// 3. ANALYSE COMPLÈTE PARFUM × CIRE
// ══════════════════════════════════════════════════════

/**
 * Analyser la compatibilité globale d'un parfum (ensemble de composants) avec un type de cire.
 * Pondère chaque molécule par sa concentration dans le parfum.
 * 
 * @param {string} waxType - Type de cire
 * @param {Array} components - Composants du parfum [{cas, name, family, mw, fp, volatility, solubility_wax, percentage_min, percentage_max}]
 * @param {object} options - { fragrance_load: 8 } pourcentage de parfum dans la formule
 */
function analyzeCompatibility(waxType, components, options = {}) {
    const { fragrance_load = 8 } = options;
    const waxData = WAX_TYPES[waxType];
    if (!waxData) return { error: 'Type de cire inconnu: ' + waxType };

    const analyses = [];
    let totalWeight = 0;
    let weightedSolubility = 0;
    let weightedColdThrow = 0;
    let weightedHotThrow = 0;
    const allRisks = [];
    const familyDistribution = {};
    const volatilityDistribution = {};

    for (const comp of components) {
        // Poids = moyenne des concentrations (% du parfum)
        const pctMin = comp.percentage_min || 0;
        const pctMax = comp.percentage_max || pctMin;
        const weight = (pctMin + pctMax) / 2 || 1;

        const analysis = analyzeMoleculeWaxCompat(comp, waxType);
        analyses.push({ ...analysis, weight });

        totalWeight += weight;
        weightedSolubility += analysis.solubility_score * weight;
        weightedColdThrow += analysis.cold_throw * weight;
        weightedHotThrow += analysis.hot_throw * weight;

        // Collect risks (deduplicate by message)
        for (const risk of analysis.risks) {
            if (!allRisks.find(r => r.message === risk.message)) {
                allRisks.push({ ...risk, molecule: analysis.molecule });
            }
        }

        // Distributions
        const fam = analysis.family;
        familyDistribution[fam] = (familyDistribution[fam] || 0) + weight;
        const vol = analysis.volatility;
        volatilityDistribution[vol] = (volatilityDistribution[vol] || 0) + weight;
    }

    // Scores pondérés
    const avgSolubility = totalWeight > 0 ? Math.round(weightedSolubility / totalWeight * 10) / 10 : 3;
    const avgColdThrow = totalWeight > 0 ? Math.round(weightedColdThrow / totalWeight * 10) / 10 : 3;
    const avgHotThrow = totalWeight > 0 ? Math.round(weightedHotThrow / totalWeight * 10) / 10 : 3;

    // Score global (0-100)
    const globalScore = Math.round(
        (avgSolubility / 5 * 40) +  // 40% solubilité
        (avgHotThrow / 5 * 35) +     // 35% diffusion à chaud
        (avgColdThrow / 5 * 15) +    // 15% diffusion à froid
        ((5 - allRisks.filter(r => r.level === 'danger').length) / 5 * 10) // 10% absence de risques
    );

    // Charge parfum recommandée
    const maxLoad = waxData.properties_range?.fragrance_max?.max || 8;
    const minLoad = waxData.properties_range?.fragrance_max?.min || 4;
    let recommendedLoad;
    if (avgSolubility >= 4) recommendedLoad = maxLoad;
    else if (avgSolubility >= 3) recommendedLoad = Math.round((minLoad + maxLoad) / 2);
    else recommendedLoad = minLoad;

    // Profil olfactif prédit
    const volDist = Object.entries(volatilityDistribution).sort((a, b) => b[1] - a[1]);
    const topVol = volDist[0]?.[0] || 'moyenne';
    let olfactiveProfile;
    if (topVol === 'très_haute' || topVol === 'haute') {
        olfactiveProfile = 'Tête dominante — diffusion rapide, risque de perte au coulage si T° trop haute';
    } else if (topVol === 'moyenne') {
        olfactiveProfile = 'Cœur dominant — bonne tenue, développement progressif';
    } else {
        olfactiveProfile = 'Fond dominant — diffusion lente, nécessite cure long pour développer le throw';
    }

    // Recommandations spécifiques
    const recommendations = generateRecommendations(waxType, avgSolubility, avgHotThrow, avgColdThrow, allRisks, fragrance_load, recommendedLoad, topVol, familyDistribution);

    // Température d'incorporation recommandée
    const incorporationTemp = estimateIncorporationTemp(waxType, components);

    return {
        wax_type: waxType,
        wax_name: waxData.full_name,
        fragrance_load_tested: fragrance_load,
        components_analyzed: components.length,
        
        scores: {
            global: Math.min(100, Math.max(0, globalScore)),
            solubility: avgSolubility,
            cold_throw: avgColdThrow,
            hot_throw: avgHotThrow
        },
        
        labels: {
            global: globalScore >= 80 ? 'Excellent' : globalScore >= 60 ? 'Bon' : globalScore >= 40 ? 'Moyen' : 'Difficile',
            solubility: scoreLabel(avgSolubility),
            cold_throw: scoreLabel(avgColdThrow),
            hot_throw: scoreLabel(avgHotThrow)
        },

        recommended_load: recommendedLoad,
        max_load: maxLoad,
        incorporation_temp: incorporationTemp,
        olfactive_profile: olfactiveProfile,
        
        family_distribution: familyDistribution,
        volatility_distribution: volatilityDistribution,
        
        risks: allRisks.sort((a, b) => {
            const order = { danger: 0, attention: 1, info: 2 };
            return (order[a.level] || 3) - (order[b.level] || 3);
        }),
        
        recommendations,

        // Détail par molécule (top 10 par poids)
        top_molecules: analyses.sort((a, b) => b.weight - a.weight).slice(0, 10).map(a => ({
            molecule: a.molecule,
            family: a.family,
            weight_pct: Math.round(a.weight * 10) / 10,
            solubility: a.solubility_score,
            hot_throw: a.hot_throw,
            cold_throw: a.cold_throw,
            risks: a.risks.length
        }))
    };
}


function scoreLabel(score) {
    if (score >= 4.5) return 'excellent';
    if (score >= 3.5) return 'bon';
    if (score >= 2.5) return 'moyen';
    if (score >= 1.5) return 'faible';
    return 'très faible';
}


function estimateIncorporationTemp(waxType, components) {
    const waxData = WAX_TYPES[waxType];
    if (!waxData?.properties_range?.mp) return null;

    const mpMax = waxData.properties_range.mp.max || 60;
    
    // Température de base = mp + 5°C (juste au-dessus de la fusion complète)
    let baseTemp = mpMax + 5;

    // Vérifier le flash point le plus bas des composants
    let lowestFP = Infinity;
    for (const c of components) {
        const fp = c.fp || null;
        if (fp !== null && fp < lowestFP) lowestFP = fp;
    }

    // Si flash point bas, ne pas dépasser fp - 10°C
    if (lowestFP < Infinity && lowestFP < baseTemp + 20) {
        baseTemp = Math.min(baseTemp, lowestFP - 10);
    }

    // Cires végétales : ne pas dépasser 75°C (dégradation des triglycérides)
    if (['soja', 'colza', 'coco'].includes(waxType)) {
        baseTemp = Math.min(baseTemp, 75);
    }

    return {
        optimal: Math.round(baseTemp),
        max: Math.round(baseTemp + 10),
        note: lowestFP < 100 
            ? `Attention flash point bas (${lowestFP}°C) — ne pas dépasser ${Math.round(lowestFP - 10)}°C`
            : `Incorporer dès que la cire est fluide et homogène`
    };
}


function generateRecommendations(waxType, solub, hotThrow, coldThrow, risks, currentLoad, recommendedLoad, topVol, familyDist) {
    const recs = [];

    // Charge parfum
    if (currentLoad > recommendedLoad) {
        recs.push({
            type: 'charge',
            priority: 'haute',
            message: `Réduire la charge de ${currentLoad}% à ${recommendedLoad}% — risque de suintement/séparation`
        });
    } else if (currentLoad < recommendedLoad - 2) {
        recs.push({
            type: 'charge',
            priority: 'info',
            message: `Charge de ${currentLoad}% conservatrice — possibilité d'augmenter à ${recommendedLoad}% pour plus de throw`
        });
    }

    // Solubilité faible
    if (solub < 3) {
        recs.push({
            type: 'formulation',
            priority: 'haute',
            message: `Solubilité limitée dans ${waxType} — ajouter 1-2% Vybar 260 ou augmenter la température d'incorporation`
        });
    }

    // Diffusion à chaud faible
    if (hotThrow < 3) {
        if (['soja', 'colza'].includes(waxType)) {
            recs.push({
                type: 'process',
                priority: 'moyenne',
                message: 'Diffusion à chaud faible — augmenter le cure time à 14 jours minimum'
            });
        }
        if (topVol === 'basse' || topVol === 'très_basse') {
            recs.push({
                type: 'formulation',
                priority: 'moyenne',
                message: 'Parfum dominé par les notes de fond — considérer un mélange avec des notes de tête pour booster le throw'
            });
        }
    }

    // Diffusion à froid faible
    if (coldThrow < 2.5) {
        recs.push({
            type: 'formulation',
            priority: 'info',
            message: 'Diffusion à froid faible — normal pour les parfums lourds. Le diffusion à chaud compensera à l\'allumage'
        });
    }

    // Micro dans le blend
    if (waxType === 'microcristalline') {
        recs.push({
            type: 'formulation',
            priority: 'haute',
            message: 'Microcristalline retient fortement le parfum — utiliser en blend 3-10% max, pas seule'
        });
    }

    // Cires végétales + terpènes
    const terpeneWeight = (familyDist['terpène'] || 0) + (familyDist['terpène-alcool'] || 0);
    if (terpeneWeight > 30 && ['soja', 'colza'].includes(waxType)) {
        recs.push({
            type: 'process',
            priority: 'moyenne',
            message: 'Fort % de terpènes — incorporer à basse température (60-65°C max) pour limiter l\'évaporation'
        });
    }

    // Muscs lourds
    const muscWeight = (familyDist['musc-polycyclique'] || 0) + (familyDist['musc-synthétique'] || 0) + (familyDist['musc-boisé'] || 0);
    if (muscWeight > 20) {
        recs.push({
            type: 'mèche',
            priority: 'moyenne',
            message: 'Fort % de muscs lourds — calibrer la mèche vers le haut pour compenser le frein à la combustion'
        });
    }

    // Dangers flash
    const dangers = risks.filter(r => r.level === 'danger');
    if (dangers.length > 0) {
        recs.push({
            type: 'sécurité',
            priority: 'critique',
            message: `${dangers.length} composant(s) avec flash point < température de travail — ventilation obligatoire, pas de flamme nue`
        });
    }

    return recs.sort((a, b) => {
        const order = { critique: 0, haute: 1, moyenne: 2, info: 3 };
        return (order[a.priority] || 4) - (order[b.priority] || 4);
    });
}


// ══════════════════════════════════════════════════════
// 4. ANALYSE DEPUIS LA DB (parfum × cire)
// ══════════════════════════════════════════════════════

/**
 * Analyser la compatibilité d'un parfum (par ID) avec un type de cire,
 * en croisant les composants FDS avec le moteur moléculaire.
 */
async function analyzeFormulaCompatibility(db, fragranceId, waxType, options = {}) {
    const { MOLECULE_DB } = require('./molecule-engine');

    // Charger les composants du parfum
    const components = await db.all(
        'SELECT * FROM fragrance_components WHERE fragrance_id = ? ORDER BY percentage_max DESC',
        [fragranceId]
    );

    if (!components.length) {
        return { error: 'Aucun composant trouvé pour ce parfum' };
    }

    // Enrichir chaque composant avec les données du moteur moléculaire
    const enriched = components.map(c => {
        const mol = MOLECULE_DB[c.cas_number];
        return {
            cas: c.cas_number,
            name: mol?.name || c.name || c.cas_number,
            family: mol?.family || 'inconnu',
            mw: mol?.mw || null,
            fp: mol?.fp || c.flash_point || null,
            volatility: mol?.volatility || 'moyenne',
            solubility_wax: mol?.solubility_wax || null,
            impact_combustion: mol?.impact_combustion || 'neutre',
            impact_diffusion: mol?.impact_diffusion || 'soutien',
            percentage_min: c.percentage_min,
            percentage_max: c.percentage_max
        };
    });

    // Infos parfum
    const fragrance = await db.get('SELECT * FROM fragrances WHERE id = ?', [fragranceId]);

    const analysis = analyzeCompatibility(waxType, enriched, options);
    analysis.fragrance = {
        id: fragranceId,
        name: fragrance?.name || '?',
        supplier: fragrance?.supplier || '?',
        flash_point: fragrance?.flash_point_c || null,
        total_components: components.length,
        known_components: enriched.filter(c => c.family !== 'inconnu').length
    };

    return analysis;
}


/**
 * Comparer un parfum avec TOUS les types de cires
 */
async function compareAllWaxTypes(db, fragranceId, options = {}) {
    const results = {};
    const waxTypes = ['paraffine', 'paraffine_ft', 'soja', 'colza', 'coco', 'microcristalline', 'beeswax'];

    for (const wt of waxTypes) {
        results[wt] = await analyzeFormulaCompatibility(db, fragranceId, wt, options);
    }

    // Classement
    const ranking = Object.entries(results)
        .filter(([_, r]) => !r.error)
        .map(([type, r]) => ({
            wax_type: type,
            wax_name: r.wax_name,
            global_score: r.scores.global,
            solubility: r.scores.solubility,
            hot_throw: r.scores.hot_throw,
            cold_throw: r.scores.cold_throw,
            recommended_load: r.recommended_load,
            risks_count: r.risks.length,
            dangers_count: r.risks.filter(x => x.level === 'danger').length
        }))
        .sort((a, b) => b.global_score - a.global_score);

    return { ranking, details: results };
}


// ══════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════

module.exports = {
    COMPATIBILITY_MATRIX,
    VOLATILITY_THROW_IMPACT,
    analyzeMoleculeWaxCompat,
    analyzeCompatibility,
    analyzeFormulaCompatibility,
    compareAllWaxTypes
};
