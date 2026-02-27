/**
 * MFC Laboratoire — Module d'Enrichissement Cires
 * Base de connaissances physico-chimiques pour cires de bougies.
 * 
 * Sources : littérature technique cirier, FDS fabricants, PubChem (composants),
 *           données terrain MFC.
 * 
 * Enrichit les champs manquants : melting_point, density, viscosity,
 * flash_point, fragrance_load_max, composition chimique, CAS.
 * 
 * Usage :
 *   const waxEnrich = require('./modules/wax-enrichment');
 *   const props = waxEnrich.getWaxProperties('paraffine', 56);
 *   await waxEnrich.enrichAllWaxes(db);
 */

// ══════════════════════════════════════════════════════
// 1. BASE DE DONNÉES DES TYPES DE CIRES
// ══════════════════════════════════════════════════════

/**
 * Propriétés génériques par type/famille de cire.
 * Utilisées comme fallback quand les données fabricant manquent.
 * 
 * Nomenclature :
 *   mp = melting point (°C), cp = congealing point (°C)
 *   fp = flash point (°C), density = g/cm³ à 80°C
 *   visc = viscosité cinématique à 100°C (mm²/s)
 *   fragrance_max = charge parfum max recommandée (%)
 *   heat_of_fusion = chaleur de fusion (J/g)
 */
const WAX_TYPES = {
    // ── PARAFFINES MINÉRALES ──────────────────────────
    'paraffine': {
        full_name: 'Paraffine',
        origin: 'minérale (pétrochimie)',
        cas: '8002-74-2',
        description: 'Mélange d\'hydrocarbures saturés linéaires C20-C40 issus du raffinage pétrolier',
        composition: {
            main: 'n-alcanes C20-C40',
            iso_alcanes: '10-25%',
            cyclo_alcanes: '0-15%',
            detail: 'Chaînes linéaires prédominantes, longueur moyenne selon grade'
        },
        properties_range: {
            mp: { min: 46, max: 68, note: 'Proportionnel à la longueur de chaîne' },
            cp: { min: 44, max: 66, note: 'Typiquement mp - 2°C' },
            fp: { min: 200, max: 260, note: 'Bien au-dessus de la température de travail' },
            density_solid: { min: 0.88, max: 0.92, unit: 'g/cm³' },
            density_liquid_80C: { min: 0.76, max: 0.79, unit: 'g/cm³' },
            viscosity_100C: { min: 3.0, max: 6.0, unit: 'mm²/s (cSt)' },
            heat_of_fusion: { min: 150, max: 210, unit: 'J/g' },
            oil_content: { min: 0, max: 2, note: 'Fully refined' },
            fragrance_max: { min: 6, max: 10, unit: '%' },
            shrinkage: { min: 8, max: 15, unit: '%', note: 'Retrait au refroidissement' }
        },
        candle_properties: {
            throw: 'excellent',
            burn_quality: 'bonne — flamme stable, combustion régulière',
            melt_pool: 'rapide, bonne propagation',
            surface_finish: 'lisse si bon refroidissement, sinon frosting possible',
            compatibility_fragrance: 'excellente — dissolve bien les parfums',
            container_adhesion: 'bonne — faible retrait vs végétal',
            color_rendering: 'excellent — base blanche neutre'
        },
        grades: {
            soft: { cp_range: '46-52°C', penetration: '25-60', use: 'Container, melt pool doux' },
            medium: { cp_range: '52-58°C', penetration: '14-24', use: 'Container/pilier versatile' },
            hard: { cp_range: '58-65°C', penetration: '10-18', use: 'Pilier, moulé, haute tenue' },
            extra_hard: { cp_range: '65-70°C', penetration: '8-14', use: 'Pilier haute température, taper' }
        },
        // Formule empirique pour estimer mp depuis cp
        cp_to_mp_offset: 2.0, // mp ≈ cp + 2°C
        // Formule pour estimer flash point depuis cp
        cp_to_fp_formula: 'fp ≈ 200 + (cp - 50) * 1.5'
    },

    'cire_minerale': {
        full_name: 'Cire minérale',
        origin: 'minérale (pétrochimie)',
        cas: '8002-74-2',
        description: 'Mélange d\'hydrocarbures (n-alcanes, iso-alcanes, cyclo-alcanes) avec additifs végétaux ou synthétiques. Type 6213/6214/6220.',
        composition: {
            main: 'n-alcanes + iso-alcanes + cyclo-alcanes C22-C55',
            detail: 'Blend paraffine + triglycérides ou stéarine selon grade'
        },
        properties_range: {
            mp: { min: 45, max: 65 },
            viscosity_100C: { min: 5.0, max: 12.0, unit: 'mm²/s (cSt)' },
            fragrance_max: { min: 7, max: 10, unit: '%' }
        },
        candle_properties: {
            throw: 'bon',
            burn_quality: 'bonne — bonne tenue mécanique',
            container_adhesion: 'excellente',
            compatibility_fragrance: 'bonne'
        }
    },

    'paraffine_ft': {
        full_name: 'Paraffine Fischer-Tropsch',
        origin: 'synthétique (gas-to-liquid)',
        cas: '8002-74-2', // Même CAS que paraffine standard
        description: 'Paraffine synthétique GTL, très haute pureté, iso-alcanes réduits',
        composition: {
            main: 'n-alcanes C20-C50 haute pureté',
            iso_alcanes: '< 5%',
            cyclo_alcanes: '< 2%',
            detail: 'Chaînes linéaires ultra-pures, point de congélation très net'
        },
        properties_range: {
            mp: { min: 52, max: 65 },
            cp: { min: 50, max: 63 },
            fp: { min: 220, max: 270 },
            density_solid: { min: 0.90, max: 0.93 },
            density_liquid_80C: { min: 0.77, max: 0.80 },
            viscosity_100C: { min: 3.5, max: 7.0 },
            heat_of_fusion: { min: 170, max: 230 },
            oil_content: { min: 0, max: 0.5 },
            fragrance_max: { min: 6, max: 8 },
            shrinkage: { min: 10, max: 18, note: 'Retrait supérieur à paraffine classique' }
        },
        candle_properties: {
            throw: 'bon — légèrement inférieur à paraffine classique',
            burn_quality: 'excellente — flamme très stable, peu de suie',
            melt_pool: 'plus lent à cause de la haute cristallinité',
            surface_finish: 'très lisse, aspect premium',
            compatibility_fragrance: 'bonne mais charge max légèrement réduite',
            container_adhesion: 'moyenne — retrait fort',
            color_rendering: 'excellent — blanc pur'
        },
        cp_to_mp_offset: 2.5
    },

    'microcristalline': {
        full_name: 'Cire microcristalline',
        origin: 'minérale (résidu de raffinage)',
        cas: '63231-60-7',
        description: 'Cire à cristaux fins, hydrocarbures ramifiés et naphténiques C30-C70',
        composition: {
            main: 'iso-alcanes et cyclo-alcanes C30-C70',
            iso_alcanes: '40-60%',
            cyclo_alcanes: '20-40%',
            n_alcanes: '10-20%',
            detail: 'Structure ramifiée → cristaux fins → flexibilité'
        },
        properties_range: {
            mp: { min: 60, max: 95 },
            cp: { min: 58, max: 90 },
            fp: { min: 240, max: 300 },
            density_solid: { min: 0.91, max: 0.94 },
            density_liquid_80C: { min: 0.79, max: 0.83 },
            viscosity_100C: { min: 10, max: 25 },
            heat_of_fusion: { min: 100, max: 170 },
            oil_content: { min: 0, max: 5 },
            fragrance_max: { min: 3, max: 6 },
            shrinkage: { min: 2, max: 6, note: 'Très faible retrait — anti-sinkholes' }
        },
        candle_properties: {
            throw: 'faible à moyen — retient le parfum',
            burn_quality: 'variable — dépend du blend',
            melt_pool: 'lent, visqueux',
            surface_finish: 'opaque, mate',
            compatibility_fragrance: 'faible — utiliser en blend 3-10%',
            container_adhesion: 'excellente — réduit le retrait',
            color_rendering: 'bon opacifiant'
        },
        cp_to_mp_offset: 3.0
    },

    // ── CIRES VÉGÉTALES ──────────────────────────────
    'soja': {
        full_name: 'Cire de soja hydrogénée',
        origin: 'végétale (huile de soja)',
        cas: '68956-68-3',
        description: 'Huile de soja totalement ou partiellement hydrogénée, triglycérides saturés',
        composition: {
            main: 'triglycérides d\'acides gras saturés',
            palmitic: '10-12% (C16:0)',
            stearic: '80-88% (C18:0)',
            oleic: '0-5% (C18:1)',
            linoleic: '0-2% (C18:2)',
            detail: 'Hydrogénation convertit les insaturés en stéarique (C18:0)'
        },
        components_cas: {
            'stearic_acid': { cas: '57-11-4', name: 'Acide stéarique', pct: '80-88%' },
            'palmitic_acid': { cas: '57-10-3', name: 'Acide palmitique', pct: '10-12%' },
            'glycerol': { cas: '56-81-5', name: 'Glycérol', pct: 'backbone' }
        },
        properties_range: {
            mp: { min: 46, max: 52 },
            cp: { min: 44, max: 50 },
            fp: { min: 220, max: 280 },
            density_solid: { min: 0.90, max: 0.93 },
            density_liquid_80C: { min: 0.84, max: 0.87 },
            viscosity_100C: { min: 30, max: 45 },
            heat_of_fusion: { min: 130, max: 170 },
            oil_content: { min: 0, max: 1 },
            fragrance_max: { min: 8, max: 12, note: 'Bonne capacité d\'absorption' },
            shrinkage: { min: 3, max: 8 },
            iodine_value: { min: 0, max: 5, note: 'Fully hydrogenated' },
            saponification_value: { min: 185, max: 200 }
        },
        candle_properties: {
            throw: 'bon — chaud excellent si maturation 2 semaines',
            burn_quality: 'bonne — flamme douce, combustion propre',
            melt_pool: 'crémeux, large, température basse',
            surface_finish: 'frosting fréquent (polymorphisme), surface mate',
            compatibility_fragrance: 'excellente — haute rétention',
            container_adhesion: 'variable — wet/dry spots possibles',
            color_rendering: 'crème naturel — couleurs pastels favorisées'
        },
        issues: [
            'Frosting (cristallisation en surface) — inévitable, pas un défaut',
            'Wet spots (décollement verre) — température de coulée critique',
            'Variabilité entre lots — origine agricole',
            'Maturation longue (10-14 jours) pour développement olfactif',
            'Polymorphisme cristallin — β\' et β formes'
        ],
        cp_to_mp_offset: 2.0
    },

    'colza': {
        full_name: 'Cire de colza hydrogénée',
        origin: 'végétale (huile de colza)',
        cas: '84681-71-0',
        description: 'Huile de colza hydrogénée, riche en acide béhénique post-hydrogénation',
        composition: {
            main: 'triglycérides d\'acides gras saturés',
            stearic: '2-5% (C18:0)',
            arachidic: '5-10% (C20:0)',
            behenic: '40-50% (C22:0)',
            erucic: '0-5% (C22:1 résiduel)',
            palmitic: '3-5% (C16:0)',
            detail: 'Chaînes plus longues que soja → point de fusion plus élevé'
        },
        components_cas: {
            'behenic_acid': { cas: '112-85-6', name: 'Acide béhénique', pct: '40-50%' },
            'arachidic_acid': { cas: '506-30-9', name: 'Acide arachidique', pct: '5-10%' },
            'stearic_acid': { cas: '57-11-4', name: 'Acide stéarique', pct: '2-5%' }
        },
        properties_range: {
            mp: { min: 50, max: 58 },
            cp: { min: 48, max: 56 },
            fp: { min: 230, max: 290 },
            density_solid: { min: 0.91, max: 0.94 },
            density_liquid_80C: { min: 0.85, max: 0.88 },
            viscosity_100C: { min: 25, max: 40 },
            heat_of_fusion: { min: 140, max: 180 },
            fragrance_max: { min: 8, max: 12 },
            shrinkage: { min: 3, max: 7 },
            iodine_value: { min: 0, max: 3 },
            saponification_value: { min: 170, max: 190 }
        },
        candle_properties: {
            throw: 'bon — similaire au soja',
            burn_quality: 'bonne — légèrement plus rigide que soja',
            melt_pool: 'plus ferme que soja, bonne structure',
            surface_finish: 'moins de frosting que soja',
            compatibility_fragrance: 'bonne — charge similaire au soja',
            container_adhesion: 'meilleure que soja',
            color_rendering: 'crème à blanc cassé'
        },
        cp_to_mp_offset: 2.5
    },

    'coco': {
        full_name: 'Cire de coco hydrogénée',
        origin: 'végétale (huile de coco)',
        cas: '84836-98-6',
        description: 'Huile de coco hydrogénée, riche en acide laurique (C12)',
        composition: {
            main: 'triglycérides d\'acides gras saturés à chaîne moyenne',
            lauric: '45-52% (C12:0)',
            myristic: '16-21% (C14:0)',
            palmitic: '7-10% (C16:0)',
            caprylic: '5-10% (C8:0)',
            capric: '4-8% (C10:0)',
            detail: 'Chaînes courtes → point de fusion bas, action émolliente'
        },
        components_cas: {
            'lauric_acid': { cas: '143-07-7', name: 'Acide laurique', pct: '45-52%' },
            'myristic_acid': { cas: '544-63-8', name: 'Acide myristique', pct: '16-21%' },
            'palmitic_acid': { cas: '57-10-3', name: 'Acide palmitique', pct: '7-10%' }
        },
        properties_range: {
            mp: { min: 24, max: 28 },
            cp: { min: 22, max: 26 },
            fp: { min: 230, max: 270 },
            density_solid: { min: 0.91, max: 0.93 },
            density_liquid_80C: { min: 0.86, max: 0.88 },
            viscosity_100C: { min: 20, max: 30 },
            heat_of_fusion: { min: 100, max: 140 },
            fragrance_max: { min: 6, max: 10 },
            shrinkage: { min: 2, max: 5 },
            iodine_value: { min: 0, max: 2 },
            saponification_value: { min: 250, max: 265 }
        },
        candle_properties: {
            throw: 'excellent — boost diffusion grâce aux chaînes courtes',
            burn_quality: 'ne pas utiliser seule — trop molle',
            melt_pool: 'très fluide, abaisse viscosité du blend',
            surface_finish: 'brillant crémeux',
            compatibility_fragrance: 'bonne — chaînes courtes favorisent la libération',
            container_adhesion: 'excellente',
            color_rendering: 'blanc brillant'
        },
        cp_to_mp_offset: 2.0
    },

    // ── ADDITIFS & SPÉCIALITÉS ───────────────────────
    'stearique': {
        full_name: 'Acide stéarique (triple pressed)',
        origin: 'végétale ou animale',
        cas: '57-11-4',
        description: 'Acide gras saturé C18, durcisseur et opacifiant',
        composition: {
            main: 'Acide octadécanoïque (C18H36O2)',
            stearic: '> 90% (triple pressed)',
            palmitic: '< 10%'
        },
        properties_range: {
            mp: { min: 67, max: 72 },
            cp: { min: 65, max: 69 },
            fp: { min: 196, max: 220 },
            density_solid: { min: 0.94, max: 0.96 },
            fragrance_max: { min: 0, max: 3, note: 'Pas utilisée seule pour les bougies' }
        },
        candle_properties: {
            throw: 'n/a — utilisée comme additif uniquement',
            burn_quality: 'durcit la cire, réduit smoking',
            melt_pool: 'ralentit la propagation',
            surface_finish: 'opacifie, blanchit',
            compatibility_fragrance: 'réduit — cristallin, piège les parfums'
        },
        cp_to_mp_offset: 3.0
    },

    'cetyl_stearyl_alcohol': {
        full_name: 'Alcool céto-stéarylique',
        origin: 'végétale (palme/coco)',
        cas: '67762-27-0',
        description: 'Mélange alcool cétylique (C16) + alcool stéarylique (C18)',
        composition: {
            main: 'Alcools gras C16-C18',
            cetyl: '30-50% (hexadécan-1-ol)',
            stearyl: '50-70% (octadécan-1-ol)'
        },
        components_cas: {
            'cetyl_alcohol': { cas: '36653-82-4', name: 'Alcool cétylique', pct: '30-50%' },
            'stearyl_alcohol': { cas: '112-92-5', name: 'Alcool stéarylique', pct: '50-70%' }
        },
        properties_range: {
            mp: { min: 49, max: 56 },
            cp: { min: 47, max: 54 },
            fp: { min: 180, max: 210 },
            density_solid: { min: 0.81, max: 0.84 }
        },
        candle_properties: {
            throw: 'n/a — additif',
            burn_quality: 'anti-défaut : réduit sinkholes et frosting en végétal',
            surface_finish: 'lisse les surfaces irrégulières'
        },
        cp_to_mp_offset: 2.5
    },

    'vybar': {
        full_name: 'Vybar (copolymère éthylène-acétate de vinyle)',
        origin: 'synthétique',
        cas: '9003-18-3',
        description: 'Polymère cristallin micro-additionnel, fixateur de parfum et anti-suintement',
        properties_range: {
            mp: { min: 53, max: 58 },
            cp: { min: 50, max: 56 },
            density_solid: { min: 0.90, max: 0.92 },
            fragrance_max: { min: 0, max: 0, note: 'Additif à 0.5-2% dans le blend' }
        },
        candle_properties: {
            throw: 'booste le throw en piégeant le parfum dans la matrice cristalline',
            burn_quality: 'améliore opacité et combustion',
            surface_finish: 'lisse, réduit mottling'
        }
    },

    'beeswax': {
        full_name: 'Cire d\'abeille',
        origin: 'animale (apis mellifera)',
        cas: '8012-89-3',
        description: 'Cire naturelle d\'abeille, esters d\'acides gras + hydrocarbures',
        composition: {
            main: 'Esters myricyle (C46) + hydrocarbures C25-C35',
            esters: '67-80%',
            hydrocarbons: '12-16%',
            fatty_acids: '10-15%',
            detail: 'Palmitate de myricyle (C46H92O2) composant principal'
        },
        properties_range: {
            mp: { min: 62, max: 65 },
            cp: { min: 60, max: 63 },
            fp: { min: 204, max: 242 },
            density_solid: { min: 0.95, max: 0.97 },
            density_liquid_80C: { min: 0.82, max: 0.85 },
            heat_of_fusion: { min: 140, max: 180 },
            fragrance_max: { min: 4, max: 6 },
            saponification_value: { min: 85, max: 105 },
            acid_value: { min: 17, max: 24 }
        },
        candle_properties: {
            throw: 'faible — retient fortement le parfum',
            burn_quality: 'excellente — flamme chaude, longue durée',
            surface_finish: 'patine naturelle jaune/ambrée',
            compatibility_fragrance: 'limitée — 4-6% max'
        },
        cp_to_mp_offset: 2.0
    }
};


// ══════════════════════════════════════════════════════
// 2. CLASSIFICATION AUTOMATIQUE DES CIRES
// ══════════════════════════════════════════════════════

/**
 * Détecter le type fondamental d'une cire depuis son nom/type/référence
 */
function classifyWax(wax) {
    const name = (wax.name || '').toLowerCase();
    const type = (wax.type || '').toLowerCase();
    const ref = (wax.reference || '').toLowerCase();
    const cat = (wax.category || '').toLowerCase();
    const comments = (wax.comments || '').toLowerCase();
    const all = `${name} ${type} ${ref} ${cat} ${comments}`;

    // Fischer-Tropsch
    if (type.includes('ft') || all.includes('fischer') || all.includes('tropsch') ||
        ref.match(/5480|4110|5706|5880/)) {
        return 'paraffine_ft';
    }

    // Microcristalline
    if (type.includes('micro') || all.includes('microcristalline') || all.includes('microcrystalline')) {
        return 'microcristalline';
    }

    // Cire d'abeille
    if (all.includes('abeille') || all.includes('beeswax') || ref.includes('0215')) {
        return 'beeswax';
    }

    // Soja
    if (all.includes('soja') || all.includes('soy')) {
        return 'soja';
    }

    // Colza
    if (all.includes('colza') || all.includes('rapeseed')) {
        return 'colza';
    }

    // Coco
    if (all.includes('coco') || all.includes('coconut')) {
        return 'coco';
    }

    // Végétale mix
    if (type.includes('végétal') || type.includes('vegetal') || cat.includes('végétal')) {
        // Try to determine which vegetable wax
        if (all.includes('soja') || all.includes('soy')) return 'soja';
        if (all.includes('colza') || all.includes('rapeseed')) return 'colza';
        if (all.includes('coco')) return 'coco';
        return 'soja'; // Default vegetal = soja
    }

    // Stéarique
    if (all.includes('stéar') || all.includes('stear') || type.includes('stéarique')) {
        return 'stearique';
    }

    // Alcool gras
    if (all.includes('alcool') || all.includes('cétyl') || all.includes('cetyl') ||
        ref.includes('al 1618') || ref.includes('nafol')) {
        return 'cetyl_stearyl_alcohol';
    }

    // Vybar
    if (all.includes('vybar') || all.includes('varaplus') || type.includes('additif')) {
        return 'vybar';
    }

    // Paraffine blend
    if (type.includes('blend')) {
        return 'paraffine';
    }

    // Paraffine par défaut
    if (type.includes('paraffin') || all.includes('paraffin') || all.includes('hywax')) {
        return 'paraffine';
    }

    return 'paraffine'; // Fallback
}


// ══════════════════════════════════════════════════════
// 3. CALCULS DÉRIVÉS
// ══════════════════════════════════════════════════════

/**
 * Estimer le melting point depuis le congealing point
 */
function estimateMeltingPoint(cp_min, cp_max, waxType) {
    const typeData = WAX_TYPES[waxType];
    const offset = typeData?.cp_to_mp_offset || 2.0;
    const cp_avg = (cp_min + cp_max) / 2;
    return Math.round((cp_avg + offset) * 10) / 10;
}

/**
 * Estimer le flash point depuis le congealing point et le type
 */
function estimateFlashPoint(cp_avg, waxType) {
    const typeData = WAX_TYPES[waxType];
    if (!typeData?.properties_range?.fp) return null;
    const fpRange = typeData.properties_range.fp;
    const cpRange = typeData.properties_range.cp;
    if (!cpRange) return (fpRange.min + fpRange.max) / 2;

    // Interpolation linéaire dans la plage
    const cpRatio = (cp_avg - cpRange.min) / (cpRange.max - cpRange.min);
    const fp = fpRange.min + cpRatio * (fpRange.max - fpRange.min);
    return Math.round(Math.max(fpRange.min, Math.min(fpRange.max, fp)));
}

/**
 * Estimer la densité depuis le type et le cp
 */
function estimateDensity(cp_avg, waxType) {
    const typeData = WAX_TYPES[waxType];
    if (!typeData?.properties_range?.density_solid) return null;
    const dRange = typeData.properties_range.density_solid;
    return Math.round(((dRange.min + dRange.max) / 2) * 1000) / 1000;
}

/**
 * Estimer la viscosité depuis le type
 */
function estimateViscosity(waxType) {
    const typeData = WAX_TYPES[waxType];
    if (!typeData?.properties_range?.viscosity_100C) return null;
    const vRange = typeData.properties_range.viscosity_100C;
    return Math.round(((vRange.min + vRange.max) / 2) * 10) / 10;
}

/**
 * Estimer la charge parfum max
 */
function estimateFragranceMax(waxType) {
    const typeData = WAX_TYPES[waxType];
    if (!typeData?.properties_range?.fragrance_max) return null;
    return typeData.properties_range.fragrance_max.max;
}


// ══════════════════════════════════════════════════════
// 4. ENRICHISSEMENT D'UNE CIRE
// ══════════════════════════════════════════════════════

/**
 * Enrichir les propriétés manquantes d'une cire
 * @param {object} wax - Objet cire de la DB
 * @returns {object} Propriétés estimées + métadonnées
 */
function enrichWax(wax) {
    const waxType = classifyWax(wax);
    const typeData = WAX_TYPES[waxType];
    if (!typeData) return { wax_type: 'inconnu', enriched: false };

    const cp_min = wax.congealing_point_min;
    const cp_max = wax.congealing_point_max;
    const cp_avg = cp_min && cp_max ? (cp_min + cp_max) / 2 : null;

    const enriched = {
        wax_id: wax.id,
        wax_name: wax.name,
        wax_type: waxType,
        wax_type_full: typeData.full_name,
        origin: typeData.origin,
        cas: typeData.cas || null,
        source: 'wax-enrichment — estimations basées sur le type et le point de congélation',
        enriched: true,

        // Propriétés estimées (seulement si manquantes)
        estimated: {}
    };

    // Melting point
    if (!wax.melting_point && cp_min && cp_max) {
        enriched.estimated.melting_point = estimateMeltingPoint(cp_min, cp_max, waxType);
    }

    // Flash point
    if (cp_avg) {
        enriched.estimated.flash_point = estimateFlashPoint(cp_avg, waxType);
    }

    // Densité
    if (!wax.density) {
        enriched.estimated.density = estimateDensity(cp_avg, waxType);
    }

    // Viscosité
    if (!wax.viscosity) {
        enriched.estimated.viscosity = estimateViscosity(waxType);
    }

    // Charge parfum
    if (!wax.fragrance_load_max) {
        enriched.estimated.fragrance_load_max = estimateFragranceMax(waxType);
    }

    // Propriétés bougie
    enriched.candle_properties = typeData.candle_properties || {};

    // Composition chimique
    enriched.composition = typeData.composition || {};
    enriched.components_cas = typeData.components_cas || {};

    // Description
    enriched.description = typeData.description;

    // Problèmes connus
    enriched.known_issues = typeData.issues || [];

    // Grade (pour paraffines)
    if (waxType === 'paraffine' && typeData.grades && cp_avg) {
        if (cp_avg < 52) enriched.grade = 'soft';
        else if (cp_avg < 58) enriched.grade = 'medium';
        else if (cp_avg < 65) enriched.grade = 'hard';
        else enriched.grade = 'extra_hard';
        enriched.grade_info = typeData.grades[enriched.grade];
    }

    return enriched;
}


// ══════════════════════════════════════════════════════
// 5. ENRICHISSEMENT BATCH (toutes les cires de la DB)
// ══════════════════════════════════════════════════════

/**
 * Enrichir toutes les cires de la base et mettre à jour les champs manquants
 * @param {object} db - Instance SQLite
 * @returns {object} Rapport
 */
async function enrichAllWaxes(db) {
    const waxes = await db.all('SELECT * FROM waxes');
    const report = {
        total: waxes.length,
        enriched: 0,
        updated_fields: 0,
        by_type: {},
        details: [],
        knowledge_entries: 0
    };

    for (const wax of waxes) {
        const data = enrichWax(wax);
        if (!data.enriched) continue;

        // Stats par type
        report.by_type[data.wax_type] = (report.by_type[data.wax_type] || 0) + 1;

        // Mettre à jour les champs NULL en DB
        const updates = [];
        const params = [];

        if (data.estimated.melting_point && !wax.melting_point) {
            updates.push('melting_point = ?');
            params.push(data.estimated.melting_point);
        }
        if (data.estimated.density && !wax.density) {
            updates.push('density = ?');
            params.push(data.estimated.density);
        }
        if (data.estimated.viscosity && !wax.viscosity) {
            updates.push('viscosity = ?');
            params.push(data.estimated.viscosity);
        }
        if (data.estimated.fragrance_load_max && !wax.fragrance_load_max) {
            updates.push('fragrance_load_max = ?');
            params.push(data.estimated.fragrance_load_max);
        }

        // Ajouter notes si vide
        if (!wax.notes && data.description) {
            const noteLines = [
                `Type: ${data.wax_type_full} (${data.origin})`,
                data.cas ? `CAS: ${data.cas}` : null,
                data.estimated.flash_point ? `Flash point estimé: ~${data.estimated.flash_point}°C` : null,
                data.grade ? `Grade: ${data.grade} — ${data.grade_info?.use || ''}` : null
            ].filter(Boolean);
            updates.push('notes = ?');
            params.push(noteLines.join(' | '));
        }

        if (updates.length > 0) {
            params.push(wax.id);
            await db.run(`UPDATE waxes SET ${updates.join(', ')} WHERE id = ?`, params);
            report.updated_fields += updates.length;
            report.enriched++;
        }

        // Insérer dans knowledge_base
        const kbContent = formatWaxForKB(wax, data);
        await db.run(
            `INSERT OR REPLACE INTO knowledge_base (category, subcategory, title, content, source, priority, tags) VALUES (?,?,?,?,?,?,?)`,
            ['wax_db', data.wax_type, `${wax.name} — Profil physico-chimique`,
             kbContent, 'wax-enrichment module', 2,
             `cire,${data.wax_type},${wax.supplier_name || ''},${data.cas || ''}`]
        );
        report.knowledge_entries++;

        report.details.push({
            id: wax.id,
            name: wax.name,
            type: data.wax_type,
            estimated: data.estimated,
            updated: updates.length > 0
        });
    }

    return report;
}


/**
 * Formater les données d'une cire pour la knowledge_base
 */
function formatWaxForKB(wax, data) {
    const lines = [
        `Cire : ${wax.name} (${wax.reference || '-'})`,
        `Fournisseur : ${wax.supplier_name || '?'}`,
        `Type : ${data.wax_type_full} | Origine : ${data.origin}`,
        data.cas ? `CAS : ${data.cas}` : null,
        `Point de congélation : ${wax.congealing_point_min || '?'}-${wax.congealing_point_max || '?'}°C`,
        data.estimated.melting_point ? `Point de fusion estimé : ~${data.estimated.melting_point}°C` : null,
        data.estimated.flash_point ? `Flash point estimé : ~${data.estimated.flash_point}°C` : null,
        `Pénétration : ${wax.penetration_min || '?'}-${wax.penetration_max || '?'} (1/10mm)`,
        data.estimated.density ? `Densité estimée : ~${data.estimated.density} g/cm³` : null,
        data.estimated.viscosity ? `Viscosité estimée : ~${data.estimated.viscosity} mm²/s (100°C)` : null,
        data.estimated.fragrance_load_max ? `Charge parfum max : ${data.estimated.fragrance_load_max}%` : null,
        data.grade ? `Grade : ${data.grade} — ${data.grade_info?.use || ''}` : null,
    ].filter(Boolean);

    if (data.candle_properties) {
        lines.push('─── Comportement bougie ───');
        if (data.candle_properties.throw) lines.push(`Diffusion : ${data.candle_properties.throw}`);
        if (data.candle_properties.burn_quality) lines.push(`Combustion : ${data.candle_properties.burn_quality}`);
        if (data.candle_properties.surface_finish) lines.push(`Surface : ${data.candle_properties.surface_finish}`);
        if (data.candle_properties.compatibility_fragrance) lines.push(`Compatibilité parfum : ${data.candle_properties.compatibility_fragrance}`);
    }

    return lines.join('\n');
}


// ══════════════════════════════════════════════════════
// 6. ACCÈS DIRECT AUX DONNÉES TYPE
// ══════════════════════════════════════════════════════

function getWaxTypeData(waxType) {
    return WAX_TYPES[waxType] || null;
}

function getAllWaxTypes() {
    return Object.entries(WAX_TYPES).map(([key, data]) => ({
        key,
        name: data.full_name,
        origin: data.origin,
        cas: data.cas,
        mp_range: data.properties_range?.mp,
        fp_range: data.properties_range?.fp,
        fragrance_max: data.properties_range?.fragrance_max
    }));
}


// ══════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════

// (exports at end of file)


// ══════════════════════════════════════════════════════
// 7. INTERACTIONS CIRE × MOLÉCULES DE PARFUM
// ══════════════════════════════════════════════════════

/**
 * Principes physico-chimiques fondamentaux :
 * 
 * 1. SOLUBILITÉ — "like dissolves like"
 *    - Cires = apolaires (hydrocarbures) → dissolvent bien les molécules apolaires
 *    - LogP élevé (>3) = bonne affinité avec la cire
 *    - LogP bas (<1) = molécule trop polaire, risque de migration/exsudation
 *    
 * 2. CRISTALLINITÉ vs RÉTENTION
 *    - Paraffine = haute cristallinité → emprisonne les molécules dans la matrice
 *    - Cire cristalline = libère le parfum PENDANT la combustion (diffusion à chaud)
 *    - Cire amorphe (micro) = retient le parfum → diffusion lente
 *    
 * 3. MASSE MOLÉCULAIRE
 *    - MW < 150 : volatile, diffuse facilement → bon diffusion à froid, se perd à la fonte
 *    - MW 150-250 : équilibre throw/rétention
 *    - MW > 250 : fixateur, reste dans la cire, libéré lentement
 *    
 * 4. VISCOSITÉ DU MELT POOL
 *    - Faible viscosité (paraffine) → molécules migrent facilement → bon throw
 *    - Haute viscosité (soja, micro) → molécules piégées → throw réduit
 *    
 * 5. TEMPÉRATURE DE FUSION vs FLASH POINT PARFUM
 *    - Si melt pool T° > flash point molécule → combustion directe (flamme haute)
 *    - Si melt pool T° < flash point → évaporation progressive (diffusion)
 */

const WAX_MOLECULE_INTERACTIONS = {

    // ── Comportement par famille moléculaire dans chaque type de cire ──
    
    'terpène': {
        description: 'Hydrocarbures cycliques volatils (limonène, pinène, ocimène)',
        general: 'Très volatils (MW ~136), flash point bas (33-55°C). Se perdent vite à la fonte.',
        by_wax: {
            paraffine: {
                solubility: 'excellente',
                retention: 'faible',
                cold_throw: 'excellent — diffusion rapide depuis la surface',
                hot_throw: 'moyen — s\'évaporent vite du melt pool',
                risk: 'Flash bas → flamme haute si concentration élevée (>3% du total)',
                tip: 'Limiter à 20-30% du parfum total. Excellent en tête, mais disparaît vite.',
                score: 7
            },
            soja: {
                solubility: 'bonne',
                retention: 'moyenne',
                cold_throw: 'bon — maturation 14j nécessaire pour développement',
                hot_throw: 'moyen — viscosité haute ralentit la diffusion',
                risk: 'Moins critique car melt pool plus froid (45-50°C)',
                tip: 'Maturation longue indispensable. Les terpènes migrent en surface.',
                score: 6
            },
            colza: {
                solubility: 'bonne',
                retention: 'moyenne-bonne',
                cold_throw: 'moyen',
                hot_throw: 'moyen',
                risk: 'Similaire soja',
                tip: 'Mieux retenu qu\'en soja grâce aux chaînes C22.',
                score: 6
            },
            microcristalline: {
                solubility: 'bonne',
                retention: 'excellente — piégés dans la structure amorphe',
                cold_throw: 'faible — retenus dans la matrice',
                hot_throw: 'faible — libération très lente',
                risk: 'Faible — haute rétention = moins de volatilité',
                tip: 'Terpènes gaspillés en micro. Réserver pour blend 5-10% anti-sinkholes.',
                score: 3
            }
        }
    },

    'terpène-alcool': {
        description: 'Alcools terpéniques (linalol, géraniol, citronellol, nérol)',
        general: 'Cœur de la plupart des floraux. MW ~154, bon équilibre vol/rétention.',
        by_wax: {
            paraffine: {
                solubility: 'bonne',
                retention: 'bonne',
                cold_throw: 'bon',
                hot_throw: 'excellent — libération progressive optimale',
                risk: 'Faible. Allergènes déclarables (géraniol, linalol, citronellol).',
                tip: 'La combinaison idéale. La paraffine cristalline libère ces molécules de façon régulière.',
                score: 9
            },
            soja: {
                solubility: 'bonne',
                retention: 'bonne',
                cold_throw: 'bon après maturation',
                hot_throw: 'bon — le -OH interagit avec les triglycérides',
                risk: 'Faible',
                tip: 'Bon en soja. Le groupement hydroxyle améliore l\'interaction avec les esters du soja.',
                score: 8
            },
            colza: {
                solubility: 'bonne',
                retention: 'bonne',
                cold_throw: 'bon',
                hot_throw: 'bon',
                risk: 'Faible',
                tip: 'Comportement similaire au soja, légèrement meilleure rétention.',
                score: 8
            },
            microcristalline: {
                solubility: 'moyenne',
                retention: 'excellente',
                cold_throw: 'faible',
                hot_throw: 'moyen — libération lente mais continue',
                risk: 'Faible',
                tip: 'En blend uniquement (5-10%). Retient bien mais libère peu.',
                score: 5
            }
        }
    },

    'aldéhyde': {
        description: 'Aldéhydes (citral, citronellal, aldéhydes C8-C12, hydroxycitronellal)',
        general: 'Diffusifs, réactifs chimiquement. Peuvent jaunir les cires blanches.',
        by_wax: {
            paraffine: {
                solubility: 'bonne',
                retention: 'moyenne',
                cold_throw: 'excellent — très diffusif',
                hot_throw: 'bon mais se dégrade à haute T°',
                risk: 'Jaunissement possible. Réactivité avec additifs basiques.',
                tip: 'Excellente diffusion mais risque de coloration jaune. Éviter UV + stockage long.',
                score: 7
            },
            soja: {
                solubility: 'moyenne',
                retention: 'moyenne',
                cold_throw: 'bon',
                hot_throw: 'moyen — les triglycérides peuvent réagir',
                risk: 'Interaction chimique : les aldéhydes peuvent réagir avec les acides gras libres du soja.',
                tip: 'Attention : risque de réaction acide-aldéhyde en maturation longue. Tester la stabilité.',
                score: 5
            },
            colza: {
                solubility: 'moyenne',
                retention: 'moyenne',
                cold_throw: 'moyen',
                hot_throw: 'moyen',
                risk: 'Même risque de réaction qu\'en soja.',
                tip: 'Préférer paraffine pour les parfums riches en aldéhydes.',
                score: 5
            },
            microcristalline: {
                solubility: 'moyenne',
                retention: 'bonne',
                cold_throw: 'faible',
                hot_throw: 'moyen',
                risk: 'Faible — structure amorphe plus inerte',
                tip: 'En blend. La micro stabilise les aldéhydes.',
                score: 5
            }
        }
    },

    'ester': {
        description: 'Esters (acétates, benzoates, salicylates, linalyl acetate)',
        general: 'Excellente compatibilité toutes cires. Stable, bonne solubilité.',
        by_wax: {
            paraffine: {
                solubility: 'excellente',
                retention: 'bonne',
                cold_throw: 'bon',
                hot_throw: 'excellent',
                risk: 'Très faible. Famille la plus sûre en bougie.',
                tip: 'Combinaison idéale. Les esters sont les plus stables et compatibles.',
                score: 9
            },
            soja: {
                solubility: 'excellente — affinité chimique (ester + ester)',
                retention: 'excellente',
                cold_throw: 'bon',
                hot_throw: 'excellent — interaction ester-triglycéride favorable',
                risk: 'Très faible',
                tip: 'Affinité naturelle : le soja est lui-même un ester (triglycéride). Excellente dissolution.',
                score: 10
            },
            colza: {
                solubility: 'excellente',
                retention: 'excellente',
                cold_throw: 'bon',
                hot_throw: 'excellent',
                risk: 'Très faible',
                tip: 'Même logique que soja. Affinité ester-ester.',
                score: 10
            },
            microcristalline: {
                solubility: 'bonne',
                retention: 'excellente',
                cold_throw: 'moyen',
                hot_throw: 'bon',
                risk: 'Faible',
                tip: 'Bien retenu, libération régulière.',
                score: 7
            }
        }
    },

    'musc': {
        description: 'Muscs synthétiques (Galaxolide, Iso E Super, Cashmeran, Ambrettolide)',
        general: 'MW élevé (>230), très peu volatils. Fixateurs. Peuvent freiner la combustion.',
        by_wax: {
            paraffine: {
                solubility: 'excellente',
                retention: 'très élevée — quasi-piégés',
                cold_throw: 'faible — pas assez volatils',
                hot_throw: 'moyen — libération lente du melt pool',
                risk: 'Si >10% du parfum : peut ralentir la combustion (MW élevé, résidu lourd).',
                tip: 'Limiter à 15-20% du parfum. Essentiel pour la tenue mais freine si excessif.',
                score: 6
            },
            soja: {
                solubility: 'bonne',
                retention: 'très élevée',
                cold_throw: 'très faible',
                hot_throw: 'faible à moyen — viscosité haute + MW élevé = diffusion minimale',
                risk: 'Double frein : viscosité soja + MW musc = parfum "étouffé"',
                tip: 'Réduire la proportion de muscs en soja (10-15% max). Le soja retient trop.',
                score: 4
            },
            colza: {
                solubility: 'bonne',
                retention: 'très élevée',
                cold_throw: 'très faible',
                hot_throw: 'faible',
                risk: 'Idem soja',
                tip: 'Même problème qu\'en soja. Préférer des muscs macrocycliques (plus volatils).',
                score: 4
            },
            microcristalline: {
                solubility: 'excellente',
                retention: 'bloqué — ne sort quasiment pas',
                cold_throw: 'nul',
                hot_throw: 'très faible',
                risk: 'Gaspillage — les muscs restent piégés',
                tip: 'Éviter les muscs lourds en micro. Totalement retenu.',
                score: 2
            }
        }
    },

    'sesquiterpène': {
        description: 'Sesquiterpènes (caryophyllène, cédrène, patchoulol, vétivérol)',
        general: 'MW ~204-222, volatilité moyenne-basse. Boisés et fixateurs naturels.',
        by_wax: {
            paraffine: {
                solubility: 'excellente',
                retention: 'bonne',
                cold_throw: 'moyen — pas assez volatils pour diffusion à froid fort',
                hot_throw: 'bon — se libèrent bien à la fonte',
                risk: 'Faible. Stabilisent la combustion.',
                tip: 'Excellents en paraffine. Donnent de la profondeur et de la tenue.',
                score: 8
            },
            soja: {
                solubility: 'bonne',
                retention: 'bonne',
                cold_throw: 'moyen',
                hot_throw: 'moyen-bon',
                risk: 'Faible',
                tip: 'Bonne combinaison. Le patchouli et le cèdre fonctionnent bien en soja.',
                score: 7
            },
            colza: {
                solubility: 'bonne',
                retention: 'bonne',
                cold_throw: 'moyen',
                hot_throw: 'bon',
                risk: 'Faible',
                tip: 'Bon en colza. Chaînes longues C22 du colza ont une affinité avec les sesquiterpènes.',
                score: 7
            },
            microcristalline: {
                solubility: 'excellente',
                retention: 'excellente',
                cold_throw: 'faible',
                hot_throw: 'moyen',
                risk: 'Faible',
                tip: 'Bien retenu. En blend, les sesquiterpènes sont les fixateurs naturels.',
                score: 6
            }
        }
    },

    'lactone': {
        description: 'Lactones et macrolides (coumarine, γ-undécalactone, ambrettolide)',
        general: 'Esters cycliques. Bonne solubilité. Certains sont des allergènes (coumarine).',
        by_wax: {
            paraffine: {
                solubility: 'excellente',
                retention: 'bonne',
                cold_throw: 'bon',
                hot_throw: 'excellent — libération progressive',
                risk: 'Faible. Coumarine = allergène déclarable.',
                tip: 'Excellente famille pour les bougies. Les lactones donnent les notes crémeuses/fruitées.',
                score: 9
            },
            soja: {
                solubility: 'excellente — affinité ester cyclique + triglycéride',
                retention: 'excellente',
                cold_throw: 'bon',
                hot_throw: 'bon',
                risk: 'Faible',
                tip: 'Très bonne affinité naturelle. Les notes lactées/fruitées excellent en soja.',
                score: 9
            },
            colza: { solubility: 'excellente', retention: 'excellente', cold_throw: 'bon', hot_throw: 'bon', risk: 'Faible', tip: 'Idem soja.', score: 8 },
            microcristalline: { solubility: 'bonne', retention: 'excellente', cold_throw: 'moyen', hot_throw: 'moyen', risk: 'Faible', tip: 'Bien retenu.', score: 6 }
        }
    },

    'phénol': {
        description: 'Phénols (eugénol, isoeugénol, thymol, carvacrol)',
        general: 'Polaires, réactifs. Eugénol = épicé (clou de girofle). Allergènes.',
        by_wax: {
            paraffine: {
                solubility: 'moyenne — polarité du -OH phénolique',
                retention: 'moyenne',
                cold_throw: 'bon — très diffusif',
                hot_throw: 'bon',
                risk: 'Jaunissement + sensibilisant cutané. Réactivité avec antioxydants.',
                tip: 'Utiliser avec parcimonie (max 2% du total). Jaunissement quasi certain au stockage.',
                score: 5
            },
            soja: {
                solubility: 'moyenne-bonne — le -OH interagit avec les esters',
                retention: 'bonne',
                cold_throw: 'bon',
                hot_throw: 'moyen',
                risk: 'Jaunissement + réaction possible avec acides gras libres',
                tip: 'Coloration plus rapide en soja. Antioxydant recommandé.',
                score: 5
            },
            colza: { solubility: 'moyenne', retention: 'bonne', cold_throw: 'moyen', hot_throw: 'moyen', risk: 'Jaunissement', tip: 'Idem soja.', score: 5 },
            microcristalline: { solubility: 'moyenne', retention: 'bonne', cold_throw: 'faible', hot_throw: 'moyen', risk: 'Moindre — moins de surface exposée', tip: 'Retenu.', score: 4 }
        }
    },

    'cétone': {
        description: 'Cétones (ionones, damascone, méthylcyclopentadécanone, calone)',
        general: 'Polaires, puissantes. Incluent les notes marines (calone) et violette (ionones).',
        by_wax: {
            paraffine: {
                solubility: 'bonne',
                retention: 'bonne',
                cold_throw: 'bon — les cétones sont diffusives',
                hot_throw: 'bon',
                risk: 'Faible. Les ionones sont très stables.',
                tip: 'Bonne famille pour paraffine. Les ionones (iris/violette) donnent un throw puissant.',
                score: 8
            },
            soja: {
                solubility: 'bonne — interaction dipôle C=O avec esters',
                retention: 'bonne',
                cold_throw: 'moyen',
                hot_throw: 'bon',
                risk: 'Faible',
                tip: 'Bon en soja. Les cétones se diffusent bien même en matrice visqueuse.',
                score: 7
            },
            colza: { solubility: 'bonne', retention: 'bonne', cold_throw: 'moyen', hot_throw: 'bon', risk: 'Faible', tip: 'Idem soja.', score: 7 },
            microcristalline: { solubility: 'bonne', retention: 'excellente', cold_throw: 'faible', hot_throw: 'moyen', risk: 'Faible', tip: 'Retenu. En blend.', score: 5 }
        }
    },

    'alcool': {
        description: 'Alcools (benzylique, phényléthylique, cis-3-hexénol)',
        general: 'Polaires, solvants naturels. Flash point parfois bas.',
        by_wax: {
            paraffine: {
                solubility: 'moyenne — polarité du -OH',
                retention: 'faible — migrent en surface',
                cold_throw: 'excellent — très diffusifs',
                hot_throw: 'moyen — s\'évaporent vite',
                risk: 'Migration en surface (suintement si excès). Flash variable.',
                tip: 'Attention au suintement si >3% alcools. Bonne diffusion mais pas de tenue.',
                score: 6
            },
            soja: {
                solubility: 'bonne — le -OH interagit avec les groupes ester du soja',
                retention: 'moyenne',
                cold_throw: 'bon',
                hot_throw: 'moyen-bon',
                risk: 'Moins de suintement qu\'en paraffine grâce à l\'interaction polaire',
                tip: 'Mieux retenu en soja qu\'en paraffine. Le phényléthanol (rose) excelle en soja.',
                score: 7
            },
            colza: { solubility: 'bonne', retention: 'moyenne', cold_throw: 'bon', hot_throw: 'moyen', risk: 'Faible', tip: 'Similaire soja.', score: 7 },
            microcristalline: { solubility: 'faible — trop polaire', retention: 'faible', cold_throw: 'faible', hot_throw: 'faible', risk: 'Exsudation', tip: 'Éviter les alcools purs en micro.', score: 3 }
        }
    }
};


// ══════════════════════════════════════════════════════
// 8. ANALYSE COMPATIBILITÉ CIRE × PARFUM
// ══════════════════════════════════════════════════════

/**
 * Analyser la compatibilité d'un parfum (ses composants) avec un type de cire
 * @param {string} waxType - Type de cire (paraffine, soja, colza, microcristalline)
 * @param {array} components - Composants du parfum [{cas, name, family, mw, fp, percentage_min, percentage_max, solubility_wax, volatility}]
 * @returns {object} Analyse détaillée
 */
function analyzeWaxFragranceCompatibility(waxType, components, moleculeDB) {
    const waxData = WAX_TYPES[waxType];
    const waxKey = waxType === 'paraffine_ft' ? 'paraffine' : waxType;
    
    if (!waxData) return { error: 'Type de cire inconnu' };

    // Enrichir les composants avec MOLECULE_DB si fourni
    if (moleculeDB) {
        components = components.map(c => {
            const cas = c.cas_number || c.cas;
            const mol = cas ? moleculeDB[cas] : null;
            if (mol) {
                return {
                    ...c,
                    cas: cas,
                    name: c.name || mol.name,
                    family: c.family || mol.family || '',
                    volatility: c.volatility || mol.volatility || '',
                    fp: c.fp ?? mol.fp ?? null,
                    mw: c.mw || mol.mw || null,
                    solubility_wax: c.solubility_wax || mol.solubility_wax || '',
                    impact_combustion: c.impact_combustion || mol.impact_combustion || '',
                    impact_diffusion: c.impact_diffusion || mol.impact_diffusion || ''
                };
            }
            return { ...c, cas: cas, family: c.family || '' };
        });
    }

    const analysis = {
        wax_type: waxType,
        wax_name: waxData.full_name,
        total_components: components.length,
        overall_score: 0,
        cold_throw_estimate: 'moyen',
        hot_throw_estimate: 'moyen',
        risks: [],
        tips: [],
        by_family: {},
        by_component: []
    };

    let scoreSum = 0, scoreCount = 0;
    let volatileWeight = 0, fixerWeight = 0;
    let lowFlashComponents = [];

    for (const comp of components) {
        const family = normalizeFamily(comp.family || '');
        const interaction = WAX_MOLECULE_INTERACTIONS[family];
        const waxInteraction = interaction?.by_wax?.[waxKey];
        
        const pctAvg = ((comp.percentage_min || 0) + (comp.percentage_max || 0)) / 2;
        const weight = pctAvg > 0 ? pctAvg : 1;

        // Track by family
        if (!analysis.by_family[family]) {
            analysis.by_family[family] = {
                count: 0, total_pct: 0,
                description: interaction?.description || family,
                score: waxInteraction?.score || 5,
                tip: waxInteraction?.tip || '',
                cold_throw: waxInteraction?.cold_throw || '?',
                hot_throw: waxInteraction?.hot_throw || '?',
                risk: waxInteraction?.risk || ''
            };
        }
        analysis.by_family[family].count++;
        analysis.by_family[family].total_pct += pctAvg;

        // Score pondéré par concentration
        const compScore = waxInteraction?.score || 5;
        scoreSum += compScore * weight;
        scoreCount += weight;

        // Volatilité
        const vol = comp.volatility || '';
        if (vol.includes('très_haute') || vol.includes('haute')) volatileWeight += weight;
        if (vol.includes('basse') || vol.includes('très_basse')) fixerWeight += weight;

        // Flash point bas
        if (comp.fp && comp.fp < 70) {
            lowFlashComponents.push({ name: comp.name || comp.cas, fp: comp.fp, pct: pctAvg });
        }

        analysis.by_component.push({
            cas: comp.cas,
            name: comp.name,
            family,
            pct: pctAvg,
            score: compScore,
            solubility: waxInteraction?.solubility || comp.solubility_wax || '?',
            retention: waxInteraction?.retention || '?'
        });
    }

    // Score global pondéré
    analysis.overall_score = scoreCount > 0 ? Math.round(scoreSum / scoreCount * 10) / 10 : 5;

    // Estimation throw
    const totalWeight = volatileWeight + fixerWeight;
    const volatileRatio = totalWeight > 0 ? volatileWeight / totalWeight : 0.5;
    
    if (waxKey === 'paraffine') {
        analysis.cold_throw_estimate = volatileRatio > 0.4 ? 'excellent' : volatileRatio > 0.2 ? 'bon' : 'moyen';
        analysis.hot_throw_estimate = analysis.overall_score >= 8 ? 'excellent' : analysis.overall_score >= 6 ? 'bon' : 'moyen';
    } else if (waxKey === 'soja' || waxKey === 'colza') {
        analysis.cold_throw_estimate = volatileRatio > 0.5 ? 'bon' : 'moyen';
        analysis.hot_throw_estimate = analysis.overall_score >= 8 ? 'bon' : analysis.overall_score >= 6 ? 'moyen' : 'faible';
    } else if (waxKey === 'microcristalline') {
        analysis.cold_throw_estimate = 'faible';
        analysis.hot_throw_estimate = 'faible à moyen';
    }

    // Risques
    if (lowFlashComponents.length > 0) {
        analysis.risks.push({
            type: 'flash_point',
            severity: 'attention',
            message: `${lowFlashComponents.length} composant(s) avec flash <70°C : ${lowFlashComponents.map(c => c.name + ' (' + c.fp + '°C)').join(', ')}`
        });
    }

    if (volatileRatio > 0.5 && (waxKey === 'soja' || waxKey === 'colza')) {
        analysis.risks.push({
            type: 'volatility',
            severity: 'info',
            message: 'Parfum riche en volatils — maturation longue recommandée (14j min) pour stabiliser en végétale'
        });
    }

    const muscFamily = analysis.by_family['musc'];
    if (muscFamily && muscFamily.total_pct > 15 && (waxKey === 'soja' || waxKey === 'colza')) {
        analysis.risks.push({
            type: 'musc_heavy',
            severity: 'attention',
            message: `Forte proportion de muscs (${Math.round(muscFamily.total_pct)}%) en végétale — risque de throw étouffé`
        });
    }

    // Tips
    analysis.tips = getWaxFragranceTips(waxKey, analysis);

    return analysis;
}


/**
 * Normaliser un nom de famille moléculaire vers les clés de WAX_MOLECULE_INTERACTIONS
 */
function normalizeFamily(family) {
    const f = family.toLowerCase();
    
    if (f.includes('musc') || f.includes('musk') || f.includes('indanone') || f.includes('galaxolide')) return 'musc';
    if (f.includes('sesquiterpène') || f.includes('sesquiterp')) return 'sesquiterpène';
    if (f.includes('terpène-alcool') || f.includes('terpene-alcool') || f === 'monoterpène-alcool') return 'terpène-alcool';
    if (f.includes('terpène') || f.includes('terpene') || f.includes('monoterpène')) return 'terpène';
    if (f.includes('aldéhyde') || f.includes('aldehyde')) return 'aldéhyde';
    if (f.includes('ester') || f.includes('acétate') || f.includes('acetate') || f.includes('salicylate') || f.includes('benzoate')) return 'ester';
    if (f.includes('lactone') || f.includes('coumarine') || f.includes('macrolide')) return 'lactone';
    if (f.includes('phénol') || f.includes('phenol') || f.includes('eugén')) return 'phénol';
    if (f.includes('cétone') || f.includes('ketone') || f.includes('ionone') || f.includes('marine')) return 'cétone';
    if (f.includes('alcool') || f.includes('alcohol')) return 'alcool';
    
    // Default — treat as ester (safest)
    return 'ester';
}


/**
 * Interaction détaillée pour une seule molécule dans une cire
 */
function analyzeWaxMoleculeInteraction(waxType, casOrMolecule, moleculeDB) {
    const waxKey = waxType === 'paraffine_ft' ? 'paraffine' : waxType;
    
    // Accept CAS string or molecule object
    let molecule;
    if (typeof casOrMolecule === 'string' && moleculeDB) {
        molecule = moleculeDB[casOrMolecule] ? { cas: casOrMolecule, ...moleculeDB[casOrMolecule] } : { cas: casOrMolecule };
    } else {
        molecule = casOrMolecule;
    }
    
    const family = normalizeFamily(molecule.family || '');
    const interaction = WAX_MOLECULE_INTERACTIONS[family];
    const waxInteraction = interaction?.by_wax?.[waxKey];

    return {
        molecule: molecule.name || molecule.cas,
        cas: molecule.cas,
        family,
        family_description: interaction?.description || '?',
        wax_type: waxType,
        solubility: waxInteraction?.solubility || '?',
        retention: waxInteraction?.retention || '?',
        cold_throw: waxInteraction?.cold_throw || '?',
        hot_throw: waxInteraction?.hot_throw || '?',
        risk: waxInteraction?.risk || '',
        tip: waxInteraction?.tip || '',
        score: waxInteraction?.score || 5,
        general_note: interaction?.general || '',
        volatility: molecule.volatility || '?',
        flash_point: molecule.fp ?? null,
        mw: molecule.mw || null,
        impact_combustion: molecule.impact_combustion || '?',
        impact_diffusion: molecule.impact_diffusion || '?'
    };
}


/**
 * Conseils pratiques cire × parfum
 */
function getWaxFragranceTips(waxKey, analysis) {
    const tips = [];

    if (waxKey === 'paraffine') {
        if (analysis.overall_score >= 8) tips.push('Excellente compatibilité globale. Ce parfum est fait pour la paraffine.');
        if (analysis.overall_score < 5) tips.push('Compatibilité moyenne. Tester un blend paraffine + 5% micro pour améliorer.');
        tips.push('Température d\'incorporation : 60-65°C (ne pas dépasser pour préserver les terpènes).');
    }

    if (waxKey === 'soja') {
        tips.push('Maturation 14 jours minimum avant évaluation du throw.');
        tips.push('Température d\'incorporation : 55-60°C (soja fond plus bas).');
        if (analysis.by_family['musc']?.total_pct > 10) {
            tips.push('Réduire la charge en muscs ou choisir des muscs macrocycliques (ambrettolide, exaltolide) qui diffusent mieux.');
        }
        if (analysis.by_family['ester']?.total_pct > 20) {
            tips.push('Bonne nouvelle : forte proportion d\'esters = affinité naturelle avec le soja (triglycéride = ester).');
        }
    }

    if (waxKey === 'colza') {
        tips.push('Maturation 10-14 jours. Colza retient mieux que soja grâce aux chaînes C22.');
        tips.push('Température d\'incorporation : 58-62°C.');
    }

    if (waxKey === 'microcristalline') {
        tips.push('Utiliser en blend (5-10% max). Jamais seule avec du parfum.');
        tips.push('Réduit les sinkholes mais étouffe le throw si trop présente.');
    }

    return tips;
}


// ══════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════

module.exports = {
    WAX_TYPES,
    WAX_MOLECULE_INTERACTIONS,
    classifyWax,
    enrichWax,
    enrichAllWaxes,
    getWaxTypeData,
    getAllWaxTypes,
    estimateMeltingPoint,
    estimateFlashPoint,
    estimateDensity,
    estimateViscosity,
    estimateFragranceMax,
    analyzeWaxFragranceCompatibility,
    analyzeWaxMoleculeInteraction,
    getWaxFragranceTips
};
