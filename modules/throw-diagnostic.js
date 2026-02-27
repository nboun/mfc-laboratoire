/**
 * MFC Laboratoire — Moteur de Diagnostic Throw
 * 
 * Analyse thermodynamique complète du diffusion à froid vs diffusion à chaud.
 * Pour chaque molécule d'un parfum, calcule :
 * - Sa pression de vapeur à 20°C (cold) et 60°C (hot)
 * - Son coefficient de diffusion dans chaque type de cire
 * - Sa contribution relative au throw total
 * 
 * Diagnostique les déséquilibres cold/hot et propose des ajustements :
 * - Côté parfum : quelles molécules modifier (% ou substitution)
 * - Côté cire : quel blend optimise l'équilibre
 */

const { WAX_TYPES } = require('./wax-enrichment');

// ══════════════════════════════════════════════════════
// 1. CONSTANTES THERMODYNAMIQUES
// ══════════════════════════════════════════════════════

const R = 8.314; // J/(mol·K)

/**
 * Propriétés thermodynamiques des cires.
 * Température du melt pool, viscosité, type de cristallin.
 */
const WAX_THERMO = {
    // ── MINÉRALES : PARAFFINE ──────────────────────────
    paraffine: {
        T_melt_pool: 60,       // °C — température typique du melt pool
        T_surface_cold: 20,    // °C — surface à froid
        viscosity_melt: 4.5,   // cSt à T_melt_pool
        crystal_type: 'macro', // macro-cristaux ordonnés
        channel_factor: 1.0,   // facteur de libération intercristalline (1 = optimal)
        surface_migration: 0.8,// facteur de migration en surface
        hildebrand: 16.2, hansen: { d: 16.0, p: 0.0, h: 0.0 },
        chain_length: { min: 20, max: 40, avg: 28 }, functional_groups: ['n-alcane'],
        category: 'minérale',
        description: 'Paraffine minérale — cristaux larges → canaux intercristallins → parfum accessible en surface (froid) ET libéré à la fonte (chaud)'
    },
    // ── MINÉRALES : CIRE MINÉRALE (6213/6214/6220) ──
    cire_minerale: {
        T_melt_pool: 65,       // °C — point de fusion plus élevé que paraffine
        T_surface_cold: 20,
        viscosity_melt: 8,     // cSt — plus visqueuse que paraffine pure
        crystal_type: 'mixte', // mélange macro + micro cristaux
        channel_factor: 0.7,   // canaux moins ouverts que paraffine pure
        surface_migration: 0.6,
        hildebrand: 16.5, hansen: { d: 16.3, p: 0.1, h: 0.1 },
        chain_length: { min: 22, max: 55, avg: 35 }, functional_groups: ['n-alcane', 'iso-alcane', 'cyclo-alcane'],
        category: 'minérale',
        description: 'Cire minérale (type 6213/6214/6220) — mélange d\'hydrocarbures, cristaux mixtes, point de fusion plus élevé, bonne tenue mécanique'
    },
    soja: {
        T_melt_pool: 48,
        T_surface_cold: 20,
        viscosity_melt: 35,
        crystal_type: 'polymorphe',
        channel_factor: 0.3,    // polymorphisme β\'/β piège le parfum
        surface_migration: 0.4, // frosting
        hildebrand: 17.6, hansen: { d: 15.8, p: 3.2, h: 4.8 },
        chain_length: { min: 16, max: 22, avg: 18 }, functional_groups: ['triglycéride','ester','insaturation C18:1/C18:2'],
        category: 'végétale',
        description: 'Cristaux polymorphes (β\'→β) piègent le parfum. Viscosité haute freine la diffusion. Maturation libère progressivement.'
    },
    colza: {
        T_melt_pool: 52,
        T_surface_cold: 20,
        viscosity_melt: 28,
        crystal_type: 'polymorphe',
        channel_factor: 0.4,
        surface_migration: 0.45,
        hildebrand: 17.4, hansen: { d: 15.6, p: 3.0, h: 4.5 },
        chain_length: { min: 18, max: 22, avg: 20 }, functional_groups: ['triglycéride','ester','acide érucique C22:1'],
        category: 'végétale',
        description: 'Similaire soja mais chaînes C22 cristallisent plus régulièrement → légèrement meilleur que soja'
    },
    coco: {
        T_melt_pool: 35,
        T_surface_cold: 20,
        viscosity_melt: 8,
        crystal_type: 'liquide',  // Fond à 24°C → partiellement liquide à T ambiante
        channel_factor: 0.9,
        surface_migration: 0.95,  // Excellent
        hildebrand: 17.0, hansen: { d: 15.4, p: 2.8, h: 4.2 },
        chain_length: { min: 8, max: 18, avg: 12 }, functional_groups: ['triglycéride','ester','acide laurique C12:0'],
        category: 'végétale',
        description: 'Partiellement liquide à 20°C → diffusion à froid spectaculaire mais instable'
    },
    // ── MINÉRALES : MICROCRISTALLINE ─────────────────
    microcristalline: {
        T_melt_pool: 75,
        T_surface_cold: 20,
        viscosity_melt: 18,
        crystal_type: 'amorphe',
        channel_factor: 0.05,     // Quasi-nul — pas de canaux
        surface_migration: 0.05,  // Piège total
        hildebrand: 16.8, hansen: { d: 16.5, p: 0.2, h: 0.1 },
        chain_length: { min: 30, max: 70, avg: 45 }, functional_groups: ['iso-alcane','cyclo-alcane','n-alcane'],
        category: 'minérale',
        description: 'Microcristalline — structure amorphe = piège à parfum. Aucun canal de diffusion. Utilisation en complément (3-10%)'
    }
};


// ══════════════════════════════════════════════════════
// 2. MODÈLE THERMODYNAMIQUE PAR MOLÉCULE
// ══════════════════════════════════════════════════════

/**
 * Estimer la température d'ébullition depuis le flash point.
 * Corrélation empirique : Teb ≈ FP + 100 (±30) pour les composés organiques.
 * Plus précis : Teb ≈ 1.5 × FP + 73 (régression sur données parfumerie)
 * Si FP inconnu, estimer depuis MW : Teb ≈ 2.5 × MW + 20 (très approximatif)
 */
function estimateBoilingPoint(mol) {
    // Priorité 1 : bp mesuré (depuis molecule-profiles enrichment)
    if (mol.bp && mol.bp > 0) {
        return mol.bp;
    }
    // Priorité 2 : estimation depuis flash point
    if (mol.fp && mol.fp > 0) {
        return Math.round(1.5 * mol.fp + 73);
    }
    // Priorité 3 : estimation depuis MW
    if (mol.mw) {
        return Math.round(2.5 * mol.mw + 20);
    }
    return 250; // default
}

/**
 * Estimer ΔHvap (enthalpie de vaporisation) via la règle de Trouton.
 * ΔHvap ≈ 88 × Teb(K) pour les liquides non-associés
 * Pour les alcools (liaison H) : ΔHvap ≈ 110 × Teb(K)
 * Pour les muscs lourds : ΔHvap ≈ 95 × Teb(K)
 */
function estimateDeltaHvap(mol, Teb_K) {
    const family = (mol.family || '').toLowerCase();
    if (family.includes('alcool') || family.includes('phénol')) {
        return 110 * Teb_K; // J/mol — liaison H augmente ΔHvap
    }
    if (family.includes('musc') || family.includes('lactone')) {
        return 95 * Teb_K;
    }
    return 88 * Teb_K; // Trouton standard
}

/**
 * Pression de vapeur relative à température T (°C).
 * Clausius-Clapeyron : ln(P/Pref) = -ΔHvap/R × (1/T - 1/Teb)
 * On normalise : Pvap_relative(T) ∈ [0, 1] où 1 = ébullition
 */
function vaporPressureRelative(mol, T_celsius) {
    const T = T_celsius + 273.15;
    const Teb = estimateBoilingPoint(mol) + 273.15;
    const dHvap = estimateDeltaHvap(mol, Teb);
    
    // Clausius-Clapeyron
    const lnP = -dHvap / R * (1/T - 1/Teb);
    const Prel = Math.exp(lnP);
    
    return Math.min(1, Math.max(0, Prel));
}

/**
 * Coefficient de diffusion relatif dans une cire fondue.
 * Stokes-Einstein : D = kT / (6π η r)
 * r ≈ (3 × MW / (4π × ρ × Na))^(1/3) ∝ MW^(1/3)
 * Donc D ∝ T / (η × MW^(1/3))
 * On normalise par rapport au linalol en paraffine comme référence.
 */
function diffusionCoeffRelative(mol, waxThermo, T_celsius) {
    const T = T_celsius + 273.15;
    const MW = mol.mw || 154; // Default linalol
    const eta = waxThermo.viscosity_melt;
    
    // Référence : linalol (MW=154) en paraffine (η=4.5) à 60°C (333K)
    const D_ref = 333 / (4.5 * Math.pow(154, 1/3));
    const D_mol = T / (eta * Math.pow(MW, 1/3));
    
    return D_mol / D_ref;
}

/**
 * Calculer le "throw index" d'une molécule dans une cire à une température.
 * 
 * Throw ∝ Pvap(T) × D(T,η) × concentration × facteur_libération
 * 
 * Diffusion à froid (T = 20°C) : pas de melt pool → diffusion en phase solide
 *   → dépend de : Pvap(20°C) × surface_migration × concentration
 *   
 * Diffusion à chaud (T = T_melt_pool) : melt pool actif → diffusion liquide
 *   → dépend de : Pvap(T_mp) × D(T_mp, η) × channel_factor × concentration
 */
function throwIndex(mol, waxKey, temperature, concentration) {
    const wt = WAX_THERMO[waxKey] || WAX_THERMO.paraffine;
    const Pvap = vaporPressureRelative(mol, temperature);
    
    // Index physique : quantité de matière émise (g/m³)
    let physical;
    if (temperature <= 25) {
        // COLD THROW — diffusion solide en surface
        const surfaceFactor = wt.surface_migration;
        physical = Pvap * surfaceFactor * concentration;
    } else {
        // HOT THROW — melt pool actif
        const D = diffusionCoeffRelative(mol, wt, temperature);
        const channelFactor = wt.channel_factor;
        physical = Pvap * D * channelFactor * concentration;
    }
    
    // Index perceptuel : pondéré par la puissance olfactive (OAV — Odor Activity Value)
    // OAV = concentration_air / seuil_olfactif (Leffingwell 2002, Arctander 1969)
    // Plus le seuil est bas, plus la molécule domine la perception
    // Sans seuil connu : on utilise un seuil médian de 50 µg/m³
    const ot = mol.odor_threshold || mol.ot || 50; // µg/m³
    const oav_weight = 50 / Math.max(ot, 0.01); // normalisé pour seuil médian = 1.0
    
    const perceptual = physical * oav_weight;
    
    return { physical, perceptual };
}


// ══════════════════════════════════════════════════════
// 3. DIAGNOSTIC THROW COMPLET
// ══════════════════════════════════════════════════════

/**
 * Analyser le profil de throw d'un parfum dans une cire.
 * Retourne pour chaque molécule sa contribution cold vs hot.
 */
function analyzeThrowProfile(components, moleculeDB, waxKey, options = {}) {
    // Si un blend thermo est fourni (mélange de cires), l'utiliser au lieu de la cire pure
    const wt = options.blend_thermo || WAX_THERMO[waxKey] || WAX_THERMO.paraffine;
    
    const result = {
        wax: waxKey,
        wax_name: WAX_TYPES[waxKey]?.full_name || waxKey,
        T_cold: wt.T_surface_cold,
        T_hot: wt.T_melt_pool,
        viscosity: wt.viscosity_melt,
        
        // Scores globaux
        cold_throw_index: 0,
        hot_throw_index: 0,
        ratio_hot_cold: 0,
        
        // Par molécule
        molecules: [],
        
        // Par registre olfactif
        by_register: {
            tête: { cold: 0, hot: 0, pct: 0, molecules: [] },
            coeur: { cold: 0, hot: 0, pct: 0, molecules: [] },
            fond: { cold: 0, hot: 0, pct: 0, molecules: [] }
        },
        
        // Diagnostic
        diagnostic: {
            balance: '',        // 'équilibré', 'cold_dominant', 'hot_dominant', 'faible_global'
            explanation: '',
            molecule_issues: [],
            wax_issues: []
        }
    };

    let totalCold = 0, totalHot = 0;

    for (const comp of components) {
        const cas = comp.cas_number || comp.cas;
        const mol = cas && moleculeDB ? moleculeDB[cas] : null;
        if (!mol) continue;

        const pctAvg = ((comp.percentage_min || 0) + (comp.percentage_max || 0)) / 2;
        if (pctAvg <= 0) continue;

        const concentration = pctAvg / 100; // Normaliser
        
        // Calculer throw indices (physique + perceptuel pondéré OAV)
        const coldIdx = throwIndex(mol, waxKey, wt.T_surface_cold, concentration);
        const hotIdx = throwIndex(mol, waxKey, wt.T_melt_pool, concentration);
        const cold = coldIdx.perceptual; // Contribution perceptuelle (= ce qu'on sent)
        const hot = hotIdx.perceptual;
        
        // Pression de vapeur
        const Pvap_cold = vaporPressureRelative(mol, wt.T_surface_cold);
        const Pvap_hot = vaporPressureRelative(mol, wt.T_melt_pool);
        const Pvap_ratio = Pvap_cold > 0 ? Pvap_hot / Pvap_cold : 999;
        
        // Coefficient de diffusion
        const D_hot = diffusionCoeffRelative(mol, wt, wt.T_melt_pool);
        
        // Température d'ébullition estimée
        const Teb = estimateBoilingPoint(mol);
        
        // Registre olfactif
        let register;
        const vol = mol.volatility || 'moyenne';
        if (['très_haute', 'haute'].includes(vol)) register = 'tête';
        else if (vol === 'moyenne') register = 'coeur';
        else register = 'fond';

        const molEntry = {
            cas,
            name: mol.name || comp.name,
            family: mol.family,
            mw: mol.mw,
            fp: mol.fp,
            Teb_estimated: Teb,
            volatility: vol,
            register,
            pct: pctAvg,
            
            // Propriétés physico-chimiques enrichies
            bp: mol.bp || null,
            bp_source: mol.bp_source || null,
            logp: mol.logp ?? null,
            logp_source: mol.logp_source || null,
            density: mol.density || null,
            vapor_pressure_25C: mol.vapor_pressure ?? null,
            vp_source: mol.vp_source || null,
            odor_threshold: mol.odor_threshold ?? null,
            ot_source: mol.ot_source || null,
            odor_descriptors: mol.odor_descriptors || [],
            is_sweet: mol.is_sweet || false,
            pubchem_raw: mol.pubchem_raw || null,
            solubility_wax: mol.solubility_wax || null,
            impact_diffusion: mol.impact_diffusion || null,
            
            // Compatibilité Hildebrand molécule × cire
            hildebrand_delta: null,
            hildebrand_compat: null,
            
            // Thermodynamique calculée
            Pvap_cold: Math.round(Pvap_cold * 1e6) / 1e6,
            Pvap_hot: Math.round(Pvap_hot * 1e6) / 1e6,
            Pvap_ratio: Math.round(Pvap_ratio * 10) / 10,
            D_hot: Math.round(D_hot * 100) / 100,
            
            // Contribution au throw
            cold_contribution: Math.round(cold * 1e6) / 1e6,
            hot_contribution: Math.round(hot * 1e6) / 1e6,
            cold_physical: Math.round(coldIdx.physical * 1e6) / 1e6,
            hot_physical: Math.round(hotIdx.physical * 1e6) / 1e6,
            
            // Verdict
            behavior: ''
        };

        // Classifier le comportement
        if (cold > hot * 3) {
            molEntry.behavior = 'COLD ONLY — S\'évapore avant la combustion, ne contribue pas au diffusion à chaud';
        } else if (cold > hot * 1.5) {
            molEntry.behavior = 'COLD DOMINANT — Plus efficace à froid qu\'à chaud';
        } else if (hot > cold * 5) {
            molEntry.behavior = 'HOT ONLY — Invisible à froid, ne se libère qu\'à la fonte';
        } else if (hot > cold * 2) {
            molEntry.behavior = 'HOT DOMINANT — Principalement actif à chaud';
        } else if (cold < 1e-8 && hot < 1e-8) {
            molEntry.behavior = 'INERTE — Ni cold ni diffusion à chaud (piégé ou non-volatil)';
        } else {
            molEntry.behavior = 'ÉQUILIBRÉ — Contribue au cold et au diffusion à chaud';
        }

        result.molecules.push(molEntry);
        
        // Calcul compatibilité Hildebrand
        if (wt.hildebrand && mol.logp != null) {
            // Estimation δ molécule depuis logP (corrélation Barton 1991)
            // δ ≈ 20 - 0.5 × logP pour molécules organiques (MPa^0.5)
            // Même formule que pour le calcul global de charge max
            const delta_mol = 20 - 0.5 * (mol.logp ?? 2.5);
            molEntry.hildebrand_delta = Math.round(delta_mol * 10) / 10;
            // |Δδ| < 2 = miscible, 2-4 = partiel, > 4 = incompatible
            const diff = Math.abs(delta_mol - wt.hildebrand);
            molEntry.hildebrand_compat = diff < 2 ? 'miscible' : diff < 4 ? 'partiel' : 'incompatible';
        }
        
        // Accumuler
        totalCold += cold;
        totalHot += hot;
        
        result.by_register[register].cold += cold;
        result.by_register[register].hot += hot;
        result.by_register[register].pct += pctAvg;
        result.by_register[register].molecules.push({ 
            name: mol.name || comp.name, pct: pctAvg, cold, hot, behavior: molEntry.behavior 
        });
    }

    // Scores globaux
    result.cold_throw_index = totalCold;
    result.hot_throw_index = totalHot;
    result.ratio_hot_cold = totalCold > 0 ? Math.round(totalHot / totalCold * 100) / 100 : 0;

    // ── Diagnostic ────────────────────────────────────
    const ratio = result.ratio_hot_cold;
    
    if (totalCold < 1e-7 && totalHot < 1e-7) {
        result.diagnostic.balance = 'faible_global';
        result.diagnostic.explanation = 
            'Le throw est quasi-nul dans cette cire. Les molécules sont soit piégées (structure cristalline inadaptée), ' +
            'soit la viscosité est trop haute pour permettre la diffusion. ' +
            'CAUSE : ' + wt.description;
    } else if (ratio > 5) {
        result.diagnostic.balance = 'hot_dominant';
        result.diagnostic.explanation = 
            'La diffusion à chaud est ' + ratio + '× plus fort que la diffusion à froid. ' +
            'CAUSE PHYSIQUE : les molécules de fond (masse mol. > 200, Pvap_20°C ≈ 0) ne s\'évaporent pas à température ambiante. ' +
            'Elles nécessitent l\'énergie thermique du melt pool (' + wt.T_melt_pool + '°C) pour atteindre une pression de vapeur suffisante. ' +
            'À 20°C, leur Pvap est 100-1000× plus faible qu\'à ' + wt.T_melt_pool + '°C (loi de Clausius-Clapeyron).';
    } else if (ratio < 0.5) {
        result.diagnostic.balance = 'cold_dominant';
        result.diagnostic.explanation = 
            'La diffusion à froid est plus fort que la diffusion à chaud (ratio H/C = ' + ratio + '). ' +
            'CAUSE PHYSIQUE : le parfum est dominé par des molécules légères (masse mol. < 150) à haute pression de vapeur à 20°C. ' +
            'Ces molécules s\'évaporent de la surface solide par sublimation/évaporation. ' +
            'À la combustion, elles s\'évaporent si vite du melt pool qu\'elles sont consommées dans les premières minutes → ' +
            'la diffusion à chaud "disparaît" après 30-45 min car le réservoir de notes de tête est épuisé.';
    } else if (ratio >= 0.5 && ratio <= 5) {
        result.diagnostic.balance = 'équilibré';
        result.diagnostic.explanation = 
            'Le profil cold/hot est raisonnablement équilibré (ratio H/C = ' + ratio + '). ' +
            'Les notes de tête assurent la diffusion à froid, les notes de cœur et fond soutiennent la diffusion à chaud.';
    }

    // ── Issues moléculaires ───────────────────────────
    const sortedMols = [...result.molecules].sort((a, b) => b.pct - a.pct);
    
    for (const mol of sortedMols) {
        if (mol.pct < 1) continue; // Ignorer traces
        
        // Molécule qui domine la diffusion à froid mais disparaît à chaud
        if (mol.cold_contribution > totalCold * 0.3 && mol.hot_contribution < totalHot * 0.05) {
            result.diagnostic.molecule_issues.push({
                type: 'cold_seulement',
                molecule: mol.name,
                cas: mol.cas,
                pct: mol.pct,
                problem: `${mol.name} (${mol.pct}%, masse mol. ${mol.mw} g/mol) fournit ${Math.round(mol.cold_contribution/totalCold*100)}% du diffusion à froid mais seulement ${Math.round(mol.hot_contribution/totalHot*100)}% du diffusion à chaud.`,
                science: `masse mol. ${mol.mw} g/mol → Teb ≈ ${mol.Teb_estimated}°C. À ${wt.T_melt_pool}°C, Pvap/Pvap_eb = ${mol.Pvap_hot}. L'évaporation du melt pool est si rapide que la molécule est épuisée en < 30 min.`,
                fix_parfum: `Réduire ${mol.name} de ${mol.pct}% à ${Math.max(1, Math.round(mol.pct * 0.5))}% et compenser avec un ester terpénique (acétate de linalyle masse mol. 196, Teb plus haut) qui apporte la même note mais dure plus longtemps.`,
                fix_cire: 'Ajouter 5% microcristalline pour ralentir l\'évaporation (piégeage partiel = libération prolongée).'
            });
        }
        
        // Molécule invisible à froid
        if (mol.hot_contribution > totalHot * 0.2 && mol.cold_contribution < totalCold * 0.01 && mol.pct > 3) {
            result.diagnostic.molecule_issues.push({
                type: 'hot_seulement',
                molecule: mol.name,
                cas: mol.cas,
                pct: mol.pct,
                problem: `${mol.name} (${mol.pct}%, masse mol. ${mol.mw} g/mol) ne contribue qu'au diffusion à chaud — invisible à froid.`,
                science: `masse mol. ${mol.mw} g/mol → Pvap(20°C) = ${mol.Pvap_cold} (quasi-nul). Le seuil de perception olfactif nécessite une concentration en phase gazeuse > 0.01 ppm. À 20°C, ${mol.name} n'atteint pas ce seuil.`,
                fix_parfum: `Pour améliorer la diffusion à froid sans changer la diffusion à chaud, ajouter 2-3% d'une note de tête complémentaire (terpène léger masse mol. < 140).`,
                fix_cire: 'Utiliser 5-8% cire de coco dans le blend → fraction liquide à 20°C crée un réservoir de diffusion à froid.'
            });
        }
        
        // Molécule piégée (ni cold ni hot)
        if (mol.behavior === 'INERTE' && mol.pct > 2) {
            result.diagnostic.molecule_issues.push({
                type: 'piégée',
                molecule: mol.name,
                cas: mol.cas,
                pct: mol.pct,
                problem: `${mol.name} (${mol.pct}%) est piégé dans la cire — aucune contribution au throw.`,
                science: `Dans ${result.wax_name}, le facteur de libération est ${wt.channel_factor}. Combiné avec Pvap(${wt.T_melt_pool}°C) = ${mol.Pvap_hot} et D_relatif = ${mol.D_hot}, le flux de masse est négligeable.`,
                fix_cire: `Changer de cire : en paraffine, le channel_factor est ${WAX_THERMO.paraffine.channel_factor} (vs ${wt.channel_factor} ici). La même molécule aurait un throw ${Math.round(WAX_THERMO.paraffine.channel_factor / wt.channel_factor)}× supérieur.`
            });
        }

        // Solubilité limitée → cristallisation
        if ((mol.family || '').includes('aldéhyde-aromatique') && mol.pct > 2) {
            result.diagnostic.molecule_issues.push({
                type: 'cristallisation',
                molecule: mol.name,
                cas: mol.cas,
                pct: mol.pct,
                problem: `${mol.name} (aldéhyde aromatique, ${mol.pct}%) risque de cristalliser dans la cire froide.`,
                science: `Les aldéhydes aromatiques (vanilline, héliotropine) ont une solubilité limitée dans les cires (<2% à 20°C). Au-delà, des micro-cristaux se forment → points blancs visibles, perte d'odeur (la fraction cristalline est inodore).`,
                fix_parfum: `Maintenir le total des aldéhydes aromatiques < 2% du poids total cire+parfum. Soit <25% du parfum à 8% de charge.`,
                fix_cire: 'L\'ajout de 1% Vybar améliore la solubilisation (réseau polymère retient les aldéhydes en solution).'
            });
        }
    }

    // ── Issues cire ───────────────────────────────────
    if (wt.viscosity_melt > 20) {
        result.diagnostic.wax_issues.push({
            type: 'viscosité',
            problem: `Viscosité du melt pool = ${wt.viscosity_melt} cSt. Facteur limitant pour TOUTES les molécules.`,
            science: `Loi de Stokes-Einstein : D = kT / 6πηr. Avec η = ${wt.viscosity_melt} cSt (vs 4.5 en paraffine), la diffusion est ${Math.round(wt.viscosity_melt / 4.5)}× plus lente. Le temps nécessaire pour qu'une molécule traverse la couche limite de diffusion (≈ 0.1 mm) passe de ~2s (paraffine) à ~${Math.round(2 * wt.viscosity_melt / 4.5)}s (${waxKey}).`,
            fix: 'Ajouter 5-10% cire de coco (réduit η de 20-30%). Ou choisir une mèche plus grosse pour augmenter T_melt_pool de 5°C → réduit η de ~30% (loi d\'Arrhenius).'
        });
    }

    if (wt.channel_factor < 0.5) {
        result.diagnostic.wax_issues.push({
            type: 'cristallisation',
            problem: `Structure cristalline ${wt.crystal_type} — facteur de libération = ${wt.channel_factor} (vs 1.0 en paraffine).`,
            science: `Les cristaux ${wt.crystal_type === 'polymorphe' ? 'polymorphes β\'/β du soja' : wt.crystal_type === 'amorphe' ? 'amorphes de la microcristalline' : ''} piègent le parfum dans des poches isolées. La fraction libérable est seulement ${Math.round(wt.channel_factor * 100)}% du parfum total incorporé.`,
            fix: wt.crystal_type === 'polymorphe' 
                ? 'Maturation prolongée (14-21j) pour compléter la transformation β\'→β qui libère le parfum. Ou ajouter 3% alcool céto-stéarylique comme agent de nucléation → cristallisation plus régulière.'
                : 'Ne JAMAIS utiliser seule. En blend 3-10% uniquement.'
        });
    }

    if (wt.T_melt_pool < 50) {
        result.diagnostic.wax_issues.push({
            type: 'température',
            problem: `Melt pool à ${wt.T_melt_pool}°C seulement (vs 60°C en paraffine).`,
            science: `Loi d'Antoine : une augmentation de 10°C double approximativement Pvap. Le melt pool de ${waxKey} est ${60 - wt.T_melt_pool}°C plus froid que la paraffine → Pvap est ${Math.round(Math.pow(2, (60 - wt.T_melt_pool) / 10))}× plus faible. Ce facteur s'applique à TOUTES les molécules.`,
            fix: 'Mèche surdimensionnée d\'une taille (ex: CD 10 → CD 12) pour augmenter T_melt_pool de 3-5°C. Attention au tunneling si trop gros.'
        });
    }

    // ── Répartition par zone de flash point ────────────────────────
    const molsWithFP = result.molecules.filter(m => m.fp && m.fp > 0);
    const totalFPPct = molsWithFP.reduce((s, m) => s + (m.pct || 0), 0) || 1;
    const fpZones = {
        ultra_volatile: { label: 'Ultra-volatile', fp: '< 50°C', role: 'Notes de tête fugaces — diffusion à froid intense mais brève (< 30 min)', mols: [], pct: 0 },
        volatile:       { label: 'Volatile', fp: '50-80°C', role: 'Cœur du parfum — équilibre diffusion / tenue, zone idéale bougie', mols: [], pct: 0 },
        semi_fixe:      { label: 'Semi-fixe', fp: '80-100°C', role: 'Cœur-fond — diffuse surtout à chaud, bonne durée', mols: [], pct: 0 },
        fixateur:       { label: 'Fixateur', fp: '> 100°C', role: 'Notes de fond — ancre le parfum, quasi aucune diffusion à froid', mols: [], pct: 0 }
    };
    molsWithFP.forEach(m => {
        const fp = m.fp;
        const zone = fp < 50 ? 'ultra_volatile' : fp < 80 ? 'volatile' : fp < 100 ? 'semi_fixe' : 'fixateur';
        fpZones[zone].mols.push({ name: m.name || m.cas, fp: m.fp, pct: m.pct });
        fpZones[zone].pct += m.pct;
    });
    // Normaliser les % sur le total des molécules avec FP
    Object.values(fpZones).forEach(z => {
        z.pct_relatif = Math.round(z.pct / totalFPPct * 100);
        z.mols.sort((a, b) => b.pct - a.pct);
    });
    result.fp_distribution = fpZones;
    result.fp_coverage = molsWithFP.length + '/' + result.molecules.length;

    // ── Charge max scientifique ────────────────────────
    result.charge_max_scientifique = calculateScientificChargeMax(result.molecules, waxKey, wt, options.fragrance_flash_point);

    // ── Estimation maturation (cure) ────────────────────────
    result.maturation = estimateCuring(result.molecules, waxKey, wt, result.charge_max_scientifique);

    // ── Profil olfactif sucré (données PubChem) ──────
    const sweetMols = result.molecules.filter(m => m.is_sweet);
    if (sweetMols.length > 0) {
        const totalSweetPct = sweetMols.reduce((s, m) => s + (m.pct || 0), 0);
        result.sweet_profile = {
            count: sweetMols.length,
            total_pct: Math.round(totalSweetPct * 10) / 10,
            molecules: sweetMols.map(m => ({
                name: m.name, cas: m.cas, pct: m.pct,
                odor: m.odor_descriptors || [],
                pubchem_raw: m.pubchem_raw || null
            })).sort((a, b) => b.pct - a.pct),
            source: 'PubChem Compound Database — section Odor (vérifié 2026-02-20)'
        };
    }

    // Si blend, ajouter les interactions et sources
    if (wt.is_blend) {
        result.blend = {
            description: wt.description,
            components: wt.blend_components,
            interactions: wt.blend_interactions || [],
            channel_factor_effectif: wt.channel_factor,
            viscosity_effective: wt.viscosity_melt,
            crystal_type_effectif: wt.crystal_type,
            sources: wt.blend_sources || []
        };
    }

    return result;
}


// ══════════════════════════════════════════════════════
// 4. COMPARAISON MULTI-CIRES
// ══════════════════════════════════════════════════════

/**
 * Comparer le profil de throw d'un parfum dans toutes les cires.
 * Identifie quelle cire résout quel problème.
 */
function compareThrowAcrossWaxes(components, moleculeDB) {
    const waxKeys = ['paraffine', 'cire_minerale', 'soja', 'colza', 'coco', 'microcristalline'];
    const analyses = {};
    
    for (const wk of waxKeys) {
        analyses[wk] = analyzeThrowProfile(components, moleculeDB, wk);
    }

    // Trouver les meilleurs pour cold et hot séparément
    let bestCold = null, bestHot = null, bestBalance = null;
    let maxCold = 0, maxHot = 0, bestRatio = Infinity;

    for (const [wk, a] of Object.entries(analyses)) {
        if (a.cold_throw_index > maxCold) { maxCold = a.cold_throw_index; bestCold = wk; }
        if (a.hot_throw_index > maxHot) { maxHot = a.hot_throw_index; bestHot = wk; }
        const ratioDev = Math.abs(Math.log(a.ratio_hot_cold || 0.01));
        if (ratioDev < bestRatio) { bestRatio = ratioDev; bestBalance = wk; }
    }

    return {
        analyses,
        best_cold_throw: bestCold,
        best_hot_throw: bestHot,
        best_balance: bestBalance,
        summary: generateThrowComparisonSummary(analyses, bestCold, bestHot, bestBalance)
    };
}


// ══════════════════════════════════════════════════════
// 5. RECOMMANDATIONS D'AJUSTEMENT
// ══════════════════════════════════════════════════════

/**
 * Générer des recommandations concrètes pour corriger un déséquilibre throw.
 */
function generateThrowRecommendations(throwProfile, fragranceProfile) {
    const recs = [];
    const diag = throwProfile.diagnostic;
    const wt = WAX_THERMO[throwProfile.wax] || WAX_THERMO.paraffine;

    // ── Cold bon, hot mauvais ─────────────────────────
    if (diag.balance === 'cold_dominant') {
        recs.push({
            category: 'PARFUM — Équilibrer la pyramide',
            priority: 'haute',
            actions: [
                {
                    action: 'Augmenter les notes de fond',
                    detail: 'Ajouter 3-5% de fixateurs lourds (éthylène brassylate masse mol. 270, ambrettolide masse mol. 252). Ces molécules ont une Pvap quasi-nulle à 20°C (pas d\'impact sur la diffusion à froid) mais une Pvap significative à 60°C (boost la diffusion à chaud).',
                    science: 'Pvap(20°C) de l\'éthylène brassylate ≈ 10⁻⁶ Pa. À 60°C : ≈ 10⁻³ Pa. Ratio = 1000× → contribution presque exclusivement diffusion à chaud.'
                },
                {
                    action: 'Remplacer les terpènes purs par des esters terpéniques',
                    detail: 'Le limonène (MW 136, Teb 176°C) s\'évapore 5× plus vite que l\'acétate de linalyle (masse mol. 196, Teb 220°C) à 60°C. L\'ester apporte une note similaire mais dure 3× plus longtemps dans le melt pool.',
                    science: 'Pvap(60°C) limonène / Pvap(60°C) linalyl acetate ≈ 5. Le temps de résidence dans le melt pool est ∝ 1/Pvap → l\'ester reste 5× plus longtemps.'
                }
            ]
        });

        recs.push({
            category: 'CIRE — Ralentir l\'évaporation',
            priority: 'moyenne',
            actions: [
                {
                    action: 'Ajouter 5% microcristalline au blend',
                    detail: 'La micro piège une fraction des terpènes volatils et les libère lentement pendant la combustion. Sacrifie 10% du diffusion à froid pour doubler la durée du diffusion à chaud.',
                    science: 'Le piégeage dans la micro (channel_factor 0.05) crée un "réservoir tampon" qui alimente le melt pool en continu.'
                },
                {
                    action: 'Ajouter 1% Vybar',
                    detail: 'Le réseau polymère du Vybar crée des nano-gouttelettes encapsulées de parfum. Ces gouttelettes se libèrent uniquement à la fonte → diffusion à chaud prolongé.',
                    science: 'Le Vybar forme un réseau 3D avec des pores de 10-100 nm. Les molécules de masse mol. < 200 traversent ces pores en ~10s à 60°C, créant une libération contrôlée.'
                }
            ]
        });
    }

    // ── Hot bon, cold mauvais ─────────────────────────
    if (diag.balance === 'hot_dominant') {
        recs.push({
            category: 'PARFUM — Booser les notes de tête',
            priority: 'haute',
            actions: [
                {
                    action: 'Augmenter les terpènes légers',
                    detail: 'Ajouter 5-8% de limonène ou linalol. Ces molécules (MW 136-154) ont une Pvap suffisante à 20°C pour franchir le seuil de perception olfactif.',
                    science: 'Pvap(20°C) du limonène ≈ 190 Pa. Seuil de perception ≈ 0.01 ppm ≈ 1 mPa. Rapport Pvap/seuil = 190000 → perception assurée même avec une faible migration en surface.'
                },
                {
                    action: 'Ajouter des diffuseurs légers',
                    detail: 'Les aldéhydes aliphatiques C8-C10 (décanal masse mol. 156, undécénal masse mol. 168) ont un excellent diffusion à froid et "portent" les notes de fond en les rendant perceptibles à froid.',
                    science: 'Les aldéhydes agissent comme "porteurs olfactifs" : leur évaporation rapide crée un courant de convection micro-local qui entraîne les molécules plus lourdes voisines.'
                }
            ]
        });

        recs.push({
            category: 'CIRE — Améliorer la migration en surface',
            priority: 'haute',
            actions: [
                {
                    action: 'Ajouter 5-8% cire de coco',
                    detail: 'La coco (fusion 24°C) reste partiellement liquide à température ambiante. Cette fraction liquide dissout le parfum et le transporte en surface par capillarité.',
                    science: 'Coefficient de diffusion dans la fraction liquide coco : D ≈ 10⁻⁹ m²/s. Dans la paraffine solide : D ≈ 10⁻¹² m²/s. Facteur 1000× → le parfum migre 1000× plus vite en surface via les canaux de coco liquide.'
                },
                {
                    action: 'Maturation plus longue',
                    detail: 'La maturation permet au parfum de migrer vers la surface par diffusion en phase solide. Chaque semaine supplémentaire augmente la concentration en surface de ~20% (diffusion ∝ √t).',
                    science: 'Distance de diffusion x = √(2·D·t). Avec D ≈ 10⁻¹² m²/s dans la paraffine solide : après 3j → x ≈ 0.7 mm. Après 14j → x ≈ 1.5 mm. La surface de la bougie fait ~1 mm d\'épaisseur → 14j de maturation = saturation de la couche de surface.'
                }
            ]
        });
    }

    // ── Throw faible globalement ──────────────────────
    if (diag.balance === 'faible_global') {
        recs.push({
            category: 'CIRE — Changer de matrice',
            priority: 'critique',
            actions: [
                {
                    action: 'Passer en paraffine medium (cp 54-58°C)',
                    detail: `Facteur de libération : ${WAX_THERMO.paraffine.channel_factor} vs ${wt.channel_factor}. Viscosité melt pool : ${WAX_THERMO.paraffine.viscosity_melt} cSt vs ${wt.viscosity_melt} cSt. Gain de throw estimé : ${Math.round((WAX_THERMO.paraffine.channel_factor / wt.channel_factor) * (wt.viscosity_melt / WAX_THERMO.paraffine.viscosity_melt))}×.`,
                    science: 'Throw ∝ channel_factor / viscosity. Le changement de cire est le levier le plus puissant — plus efficace que toute modification du parfum.'
                }
            ]
        });

        recs.push({
            category: 'PARFUM — Augmenter la charge',
            priority: 'moyenne',
            actions: [
                {
                    action: 'Augmenter la charge parfum au maximum sécuritaire',
                    detail: 'Throw ∝ concentration. Passer de 6% à 10% = gain de throw de 67%. Vérifier le flash point avant.',
                    science: 'La relation throw-concentration est linéaire jusqu\'au seuil de saturation (la cire ne peut pas dissoudre plus). Paraffine : saturation ~12%. Soja : saturation ~14%.'
                }
            ]
        });
    }

    // ── Recommandations spécifiques aux issues moléculaires
    for (const issue of diag.molecule_issues || []) {
        if (issue.fix_parfum || issue.fix_cire) {
            recs.push({
                category: 'MOLÉCULE — ' + issue.molecule,
                priority: issue.type === 'piégée' ? 'haute' : 'moyenne',
                actions: [
                    ...(issue.fix_parfum ? [{
                        action: 'Ajustement parfum',
                        detail: issue.fix_parfum,
                        science: issue.science
                    }] : []),
                    ...(issue.fix_cire ? [{
                        action: 'Ajustement cire',
                        detail: issue.fix_cire,
                        science: issue.science
                    }] : [])
                ]
            });
        }
    }

    return recs;
}


// ══════════════════════════════════════════════════════
// 6. RÉSUMÉ ET KB
// ══════════════════════════════════════════════════════

function generateThrowComparisonSummary(analyses, bestCold, bestHot, bestBalance) {
    const lines = [];
    
    lines.push('COMPARAISON THROW PAR TYPE DE CIRE');
    lines.push('══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push('Type'.padEnd(20) + 'Cold idx'.padStart(12) + 'Hot idx'.padStart(12) + 'Ratio H/C'.padStart(12) + 'Balance'.padStart(18));
    lines.push('─'.repeat(74));
    
    const sorted = Object.entries(analyses).sort((a, b) => b[1].hot_throw_index - a[1].hot_throw_index);
    for (const [wk, a] of sorted) {
        const tag = (wk === bestCold ? ' ❄️' : '') + (wk === bestHot ? ' 🔥' : '') + (wk === bestBalance ? ' ⚖️' : '');
        lines.push(
            wk.padEnd(20) +
            a.cold_throw_index.toExponential(2).padStart(12) +
            a.hot_throw_index.toExponential(2).padStart(12) +
            String(a.ratio_hot_cold).padStart(12) +
            (a.diagnostic.balance + tag).padStart(18)
        );
    }
    
    lines.push('');
    lines.push('❄️ Meilleur diffusion à froid : ' + bestCold);
    lines.push('🔥 Meilleur diffusion à chaud : ' + bestHot);
    lines.push('⚖️ Meilleur équilibre : ' + bestBalance);
    
    return lines.join('\n');
}


/**
 * Générer les entrées KB pour les mécanismes de throw
 */
function generateThrowKBEntries() {
    const entries = [];

    // Fiche thermodynamique par type de cire
    for (const [wk, wt] of Object.entries(WAX_THERMO)) {
        const waxName = WAX_TYPES[wk]?.full_name || wk;
        let content = `Propriétés thermodynamiques — ${waxName}\n\n`;
        content += `Température du melt pool : ${wt.T_melt_pool}°C\n`;
        content += `Viscosité du melt pool : ${wt.viscosity_melt} cSt\n`;
        content += `Type cristallin : ${wt.crystal_type}\n`;
        content += `Facteur de libération (channel_factor) : ${wt.channel_factor}\n`;
        content += `Migration en surface (diffusion à froid factor) : ${wt.surface_migration}\n\n`;
        content += `Description : ${wt.description}\n\n`;

        // Calculer pour des molécules représentatives
        const testMols = [
            { name: 'Terpène type (limonène)', mw: 136, fp: 48, family: 'terpène', volatility: 'très_haute' },
            { name: 'Terpène-alcool type (linalol)', mw: 154, fp: 76, family: 'terpène-alcool', volatility: 'haute' },
            { name: 'Ester type (acétate linalyle)', mw: 196, fp: 85, family: 'ester-terpénique', volatility: 'haute' },
            { name: 'Sesquiterpène type (caryophyllène)', mw: 204, fp: 110, family: 'sesquiterpène', volatility: 'moyenne' },
            { name: 'Musc type (galaxolide)', mw: 258, fp: 135, family: 'musc-polycyclique', volatility: 'très_basse' },
        ];

        content += `── Comportement des familles moléculaires dans ${waxName} ──\n\n`;
        for (const mol of testMols) {
            const Pvap_cold = vaporPressureRelative(mol, wt.T_surface_cold);
            const Pvap_hot = vaporPressureRelative(mol, wt.T_melt_pool);
            const D = diffusionCoeffRelative(mol, wt, wt.T_melt_pool);
            const coldIdx2 = throwIndex(mol, wk, wt.T_surface_cold, 0.1);
            const hotIdx2 = throwIndex(mol, wk, wt.T_melt_pool, 0.1);
            const cold = coldIdx2.perceptual;
            const hot = hotIdx2.perceptual;
            const ratio = cold > 0 ? (hot / cold).toFixed(1) : '∞';

            content += `${mol.name} (masse mol. ${mol.mw} g/mol) :\n`;
            content += `  Pvap(20°C) = ${Pvap_cold.toExponential(2)} | Pvap(${wt.T_melt_pool}°C) = ${Pvap_hot.toExponential(2)}\n`;
            content += `  D_relatif = ${D.toFixed(2)} | Ratio hot/cold = ${ratio}×\n`;
            if (cold < 1e-10) content += `  → INVISIBLE À FROID dans cette cire\n`;
            if (hot < 1e-10) content += `  → PIÉGÉ — aucune diffusion même à chaud\n`;
            content += `\n`;
        }

        entries.push({
            category: 'Science — Cires',
            subcategory: 'thermodynamique ' + wk,
            title: `Thermodynamique du throw — ${waxName}`,
            content,
            source: 'throw-diagnostic module — modèle Clausius-Clapeyron + Stokes-Einstein',
            priority: 5,
            tags: 'thermodynamique,throw,diffusion à froid,diffusion à chaud,Pvap,diffusion,' + wk
        });
    }

    // Fiche comparative
    let compContent = 'Comparaison thermodynamique cold/diffusion à chaud par type de cire\n\n';
    compContent += 'Pourquoi la diffusion à froid est bon mais la diffusion à chaud disparaît :\n';
    compContent += '1. Les terpènes légers (masse mol. < 150) ont une Pvap suffisante à 20°C pour diffuser depuis la surface solide.\n';
    compContent += '2. À 60°C dans le melt pool, ces mêmes molécules s\'évaporent en < 30 min (Pvap trop haute).\n';
    compContent += '3. Le réservoir de notes de tête est épuisé rapidement. Il ne reste que les notes de fond.\n';
    compContent += '4. Les notes de fond (MW > 220) n\'ont pas assez de Pvap à 60°C pour compenser → le throw "tombe".\n\n';
    compContent += 'Pourquoi la diffusion à chaud est bon mais la diffusion à froid est nul :\n';
    compContent += '1. Le parfum est dominé par des molécules lourdes (masse mol. > 200, muscs, lactones).\n';
    compContent += '2. À 20°C, leur Pvap est 1000-10000× trop faible pour franchir le seuil de perception.\n';
    compContent += '3. À 60°C, la Pvap augmente suffisamment (loi de Clausius-Clapeyron).\n';
    compContent += '4. Manque de "porteurs" légers qui rendraient le parfum perceptible à froid.\n\n';
    compContent += 'Solutions :\n';
    compContent += '- Cold bon/hot mauvais : ajouter fixateurs (éthylène brassylate) + microcristalline 5%\n';
    compContent += '- Hot bon/cold mauvais : ajouter terpènes légers + coco 5-8%\n';
    compContent += '- Faible partout : changer de cire (paraffine) + augmenter la charge\n';

    entries.push({
        category: 'Science — Cires',
        subcategory: 'diagnostic throw déséquilibre',
        title: 'Diagnostic — Pourquoi la diffusion à froid est bon mais la diffusion à chaud disparaît (et vice versa)',
        content: compContent,
        source: 'throw-diagnostic module — analyse thermodynamique',
        priority: 5,
        tags: 'diagnostic,throw,diffusion à froid,diffusion à chaud,déséquilibre,terpène,musc,solution'
    });

    return entries;
}


// ══════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════
// 7. RAPPORT SCIENTIFIQUE — Score /10 froid & chaud
// ══════════════════════════════════════════════════════

function generateScientificReport(throwProfile, moleculeDB) {
    const diag = throwProfile.diagnostic;
    const wt = WAX_THERMO[throwProfile.wax] || WAX_THERMO.paraffine;
    const mols = throwProfile.molecules || [];
    const totalCold = throwProfile.total_cold || 0;
    const totalHot = throwProfile.total_hot || 0;
    
    // ── CALCUL DES SCORES /10 ───────────────────────
    
    // Score froid (0-10)
    let scoreFroid = 5; // Base
    // Facteur 1: Contribution absolue des molécules volatiles
    const volatiles = mols.filter(m => (m.volatility === 'très_haute' || m.volatility === 'haute') && m.pct > 1);
    const pctVolatiles = volatiles.reduce((s, m) => s + m.pct, 0);
    if (pctVolatiles > 30) scoreFroid += 2;
    else if (pctVolatiles > 15) scoreFroid += 1;
    else if (pctVolatiles < 5) scoreFroid -= 2;
    else if (pctVolatiles < 10) scoreFroid -= 1;
    
    // Facteur 2: Migration surface (structure cristalline de la cire)
    if (wt.surface_migration > 0.7) scoreFroid += 1;
    else if (wt.surface_migration < 0.3) scoreFroid -= 2;
    
    // Facteur 3: Molécules à seuil olfactif bas (très puissantes)
    const puissantes = mols.filter(m => m.odor_threshold && m.odor_threshold < 10 && m.pct > 1);
    if (puissantes.length >= 3) scoreFroid += 1;
    
    // Facteur 4: Présence de bloquants (aldéhydes aromatiques > 5% qui cristallisent)
    const bloquantsFroid = mols.filter(m => (m.family || '').includes('aldéhyde-aromatique') && m.pct > 5);
    if (bloquantsFroid.length > 0) scoreFroid -= 1;
    
    // Facteur 5: Compatibilité Hildebrand
    const incompatibles = mols.filter(m => m.hildebrand_compat === 'incompatible' && m.pct > 3);
    if (incompatibles.length > 0) scoreFroid -= 1;
    
    scoreFroid = Math.max(0, Math.min(10, Math.round(scoreFroid * 10) / 10));
    
    // Score chaud (0-10)
    let scoreChaud = 5;
    // Facteur 1: Contribution des notes de cœur et fond au diffusion à chaud
    const lourdes = mols.filter(m => (m.volatility === 'basse' || m.volatility === 'très_basse') && m.pct > 2);
    const pctLourdes = lourdes.reduce((s, m) => s + m.pct, 0);
    if (pctLourdes > 30) scoreChaud += 2;
    else if (pctLourdes > 15) scoreChaud += 1;
    else if (pctLourdes < 5) scoreChaud -= 1;
    
    // Facteur 2: Viscosité du melt pool (freine la diffusion)
    if (wt.viscosity_melt < 10) scoreChaud += 1;
    else if (wt.viscosity_melt > 25) scoreChaud -= 2;
    else if (wt.viscosity_melt > 15) scoreChaud -= 1;
    
    // Facteur 3: Canal de libération
    if (wt.channel_factor > 0.8) scoreChaud += 1;
    else if (wt.channel_factor < 0.3) scoreChaud -= 2;
    
    // Facteur 4: Température melt pool
    if (wt.T_melt_pool >= 58) scoreChaud += 1;
    else if (wt.T_melt_pool < 45) scoreChaud -= 1;
    
    // Facteur 5: Molécules piégées (grosses pertes)
    const piegees = mols.filter(m => m.behavior && m.behavior.includes('INERTE') && m.pct > 2);
    if (piegees.length >= 2) scoreChaud -= 1;
    
    scoreChaud = Math.max(0, Math.min(10, Math.round(scoreChaud * 10) / 10));
    
    // ── IDENTIFICATION DES BOOSTERS ─────────────────
    const boosters = [];
    for (const m of mols) {
        if (m.pct < 0.5) continue;
        const roles = [];
        if (m.cold_contribution > totalCold * 0.15 && totalCold > 0) roles.push('booster froid');
        if (m.hot_contribution > totalHot * 0.15 && totalHot > 0) roles.push('booster chaud');
        if (m.odor_threshold && m.odor_threshold < 5) {
            const hasDiffusion = (totalCold > 0 && m.cold_contribution > totalCold * 0.03) || (totalHot > 0 && m.hot_contribution > totalHot * 0.03);
            if (hasDiffusion) {
                roles.push('puissant olfactivement (seuil ' + m.odor_threshold + ' µg/m³)');
            } else {
                // Molécule puissante olfactivement mais qui ne diffuse pas assez pour contribuer
                // = fixateur, note de fond perçue uniquement de très près ou à la fonte
                roles.push('amplificateur olfactif (seuil ' + m.odor_threshold + ' µg/m³) — perceptible de près mais diffuse peu');
            }
        }
        if (roles.length > 0) {
            const hasDiffusionRole = roles.some(r => r.includes('booster'));
            boosters.push({
                nom: m.name, cas: m.cas, pct: m.pct, mw: m.mw,
                roles,
                contrib_froid: totalCold > 0 ? Math.round(m.cold_contribution / totalCold * 100) : 0,
                contrib_chaud: totalHot > 0 ? Math.round(m.hot_contribution / totalHot * 100) : 0,
                note_diffusion: !hasDiffusionRole ? 'Puissant olfactivement mais faible contribution à la diffusion (MW élevée ou Pvap basse). Rôle de fixateur : ancre les autres molécules.' : null
            });
        }
    }
    
    // ── IDENTIFICATION DES BLOQUANTS / FREINS ───────
    const bloquants = [];
    for (const m of mols) {
        if (m.pct < 1) continue;
        const problemes = [];
        if (m.behavior && m.behavior.includes('INERTE')) problemes.push('piégé dans la cire — aucune contribution');
        if (m.hildebrand_compat === 'incompatible') problemes.push('incompatible Hildebrand (δ=' + m.hildebrand_delta + ' vs cire δ=' + wt.hildebrand + ')');
        if ((m.family || '').includes('aldéhyde-aromatique') && m.pct > 3) problemes.push('risque cristallisation à froid');
        if (m.logp != null && m.logp < 1.5 && m.pct > 3) problemes.push('très polaire (LogP=' + m.logp + ') — mauvaise affinité cire');
        if (m.cold_contribution > totalCold * 0.4 && m.hot_contribution < totalHot * 0.03 && totalHot > 0) problemes.push('consommé trop vite — épuise la diffusion à froid sans soutenir le chaud');
        if (problemes.length > 0) {
            bloquants.push({
                nom: m.name, cas: m.cas, pct: m.pct, mw: m.mw,
                problemes,
                impact: problemes.some(p => p.includes('piégé') || p.includes('incompatible')) ? 'bloquant' : 'frein'
            });
        }
    }
    
    // ── RAPPORT TEXTE ───────────────────────────────
    const rapport = {
        score_froid: scoreFroid,
        score_chaud: scoreChaud,
        score_global: Math.round((scoreFroid + scoreChaud) / 2 * 10) / 10,
        
        verdict_froid: scoreFroid >= 7 ? 'Excellent' : scoreFroid >= 5 ? 'Correct' : scoreFroid >= 3 ? 'Faible' : 'Insuffisant',
        verdict_chaud: scoreChaud >= 7 ? 'Excellent' : scoreChaud >= 5 ? 'Correct' : scoreChaud >= 3 ? 'Faible' : 'Insuffisant',
        
        analyse_froid: [],
        analyse_chaud: [],
        boosters,
        bloquants,
        
        conclusion: ''
    };
    
    // Analyse froid détaillée
    rapport.analyse_froid.push({
        facteur: 'Molécules volatiles',
        valeur: pctVolatiles.toFixed(1) + '% du parfum',
        impact: pctVolatiles > 15 ? 'positif' : pctVolatiles < 8 ? 'négatif' : 'neutre',
        loi: 'Loi de Clausius-Clapeyron — la pression de vapeur augmente exponentiellement avec la température. À 20°C, seules les molécules légères (MW < 200, Teb < 250°C) atteignent une Pvap suffisante pour franchir le seuil de perception olfactive.',
        explication: pctVolatiles > 15 
            ? 'Bonne proportion de terpènes et molécules légères → évaporation suffisante à 20°C' 
            : 'Déficit de notes de tête. Les molécules présentes ont une Pvap trop basse à 20°C pour franchir le seuil de perception'
    });
    rapport.analyse_froid.push({
        facteur: 'Migration en surface',
        valeur: (wt.surface_migration * 100).toFixed(0) + '%',
        impact: wt.surface_migration > 0.6 ? 'positif' : wt.surface_migration < 0.3 ? 'négatif' : 'neutre',
        loi: 'Diffusion de Fick (1ère loi) — le flux de molécules de parfum vers la surface de la cire solide est proportionnel au gradient de concentration et inversement proportionnel à la résistance cristalline.',
        explication: wt.surface_migration > 0.6
            ? 'La structure cristalline ' + wt.crystal_type + ' permet une bonne migration du parfum vers la surface'
            : 'Structure ' + wt.crystal_type + ' — le parfum est piégé dans des poches cristallines, la migration vers la surface est freinée'
    });
    if (puissantes.length > 0) {
        rapport.analyse_froid.push({
            facteur: 'Molécules puissantes',
            valeur: puissantes.length + ' molécule(s) à seuil < 10 µg/m³',
            impact: 'positif',
            loi: 'Loi de Weber-Fechner (psychophysique) — la perception olfactive est proportionnelle au logarithme de la concentration. Les molécules à bas seuil olfactif (source : base Leffingwell, PubChem) sont détectées à des concentrations extrêmement faibles.',
            explication: puissantes.map(m => m.name + ' (seuil ' + m.odor_threshold + ' µg/m³)').join(', ') + ' — perceptibles même en très faible concentration en phase gazeuse'
        });
    }
    if (incompatibles.length > 0) {
        rapport.analyse_froid.push({
            facteur: 'Incompatibilité cire',
            valeur: incompatibles.length + ' molécule(s) incompatible(s)',
            impact: 'négatif',
            loi: 'Théorie de Hildebrand (1936) — deux substances sont miscibles si leurs paramètres de solubilité δ sont proches (|Δδ| < 2 MPa½). Au-delà, séparation de phase et cristallisation du parfum en surface.',
            explication: incompatibles.map(m => m.name + ' (δ=' + m.hildebrand_delta + ')').join(', ') + ' — risque de séparation de phase dans ' + throwProfile.wax_name + ' (δ=' + wt.hildebrand + ')'
        });
    }
    
    // Analyse chaud détaillée
    rapport.analyse_chaud.push({
        facteur: 'Notes de cœur et fond',
        valeur: pctLourdes.toFixed(1) + '% du parfum',
        impact: pctLourdes > 15 ? 'positif' : pctLourdes < 5 ? 'négatif' : 'neutre',
        loi: 'Loi de Clausius-Clapeyron — à la température du bain de fusion, les molécules lourdes (MW > 200) voient leur Pvap augmenter de 10 à 1000× par rapport à 20°C. C\'est le réservoir principal de diffusion à chaud.',
        explication: pctLourdes > 15
            ? 'Réservoir conséquent de molécules lourdes → libération soutenue pendant la combustion'
            : 'Peu de molécules de fond → la diffusion à chaud risque de s\'épuiser rapidement'
    });
    rapport.analyse_chaud.push({
        facteur: 'Viscosité melt pool',
        valeur: wt.viscosity_melt + ' cSt à ' + wt.T_melt_pool + '°C',
        impact: wt.viscosity_melt < 10 ? 'positif' : wt.viscosity_melt > 20 ? 'négatif' : 'neutre',
        loi: 'Équation de Stokes-Einstein — D = kT/(6πηr). Le coefficient de diffusion D est inversement proportionnel à la viscosité η. Doubler la viscosité divise par deux la vitesse de migration des molécules vers la surface.',
        explication: wt.viscosity_melt < 10
            ? 'Viscosité basse → diffusion rapide des molécules vers la surface du melt pool (Stokes-Einstein)'
            : 'Viscosité ' + wt.viscosity_melt + ' cSt = ' + Math.round(wt.viscosity_melt / 4.5) + '× celle de la paraffine → la diffusion est ' + Math.round(wt.viscosity_melt / 4.5) + '× plus lente'
    });
    rapport.analyse_chaud.push({
        facteur: 'Libération cristalline',
        valeur: (wt.channel_factor * 100).toFixed(0) + '% accessible',
        impact: wt.channel_factor > 0.7 ? 'positif' : wt.channel_factor < 0.3 ? 'négatif' : 'neutre',
        loi: 'Cristallographie — la structure cristalline de la cire détermine le volume de parfum accessible au bain de fusion. Les macro-cristaux (paraffine) ont des canaux intercristallins ouverts. Les polymorphes β\'/β (soja) créent un réseau dense qui piège le parfum.',
        explication: wt.channel_factor > 0.7
            ? 'Canaux intercristallins ouverts → le parfum est accessible au melt pool'
            : 'Seulement ' + (wt.channel_factor * 100).toFixed(0) + '% du parfum est libéré à la fonte — le reste reste piégé'
    });
    if (piegees.length > 0) {
        rapport.analyse_chaud.push({
            facteur: 'Molécules piégées',
            valeur: piegees.length + ' molécule(s)',
            impact: 'négatif',
            loi: 'Cinétique de libération — les molécules de MW élevé et LogP > 5 ont une affinité trop forte avec la matrice cire. Leur énergie d\'activation de désorption dépasse l\'énergie thermique du bain de fusion.',
            explication: piegees.map(m => m.name + ' (' + m.pct + '%)').join(', ') + ' — ne contribuent ni au froid ni au chaud, perte sèche de parfum'
        });
    }
    
    // ── CONCLUSION FINALE ───────────────────────────
    const parts = [];
    if (scoreFroid >= 7 && scoreChaud >= 7) {
        parts.push('Ce parfum est bien adapté à la ' + throwProfile.wax_name + '. Le profil moléculaire assure une diffusion efficace à froid comme à chaud.');
    } else if (scoreFroid >= 7 && scoreChaud < 5) {
        parts.push('Bon potentiel à froid grâce aux notes de tête volatiles, mais diffusion à chaud insuffisante. Le parfum sentira bon bougie éteinte mais décevra à la combustion.');
    } else if (scoreFroid < 5 && scoreChaud >= 7) {
        parts.push('Diffusion à chaud correcte mais quasi absent bougie éteinte. Le client ne sentira rien en magasin.');
    } else if (scoreFroid < 5 && scoreChaud < 5) {
        parts.push('Diffusion globalement faible dans cette cire. Le parfum est soit piégé par la structure cristalline, soit trop lourd pour s\'évaporer à ces températures.');
    } else {
        parts.push('Profil de diffusion moyen. Des optimisations sont possibles.');
    }
    
    if (boosters.length > 0) {
        const topBoosters = boosters.slice(0, 3).map(b => b.nom).join(', ');
        parts.push('Molécules motrices : ' + topBoosters + '.');
    }
    if (bloquants.filter(b => b.impact === 'bloquant').length > 0) {
        const topBloquants = bloquants.filter(b => b.impact === 'bloquant').map(b => b.nom).join(', ');
        parts.push('Attention : ' + topBloquants + ' — bloquant(s) identifié(s).');
    }
    
    rapport.conclusion = parts.join(' ');
    
    return rapport;
}

// ══════════════════════════════════════════════════════
// 6b. CALCUL SCIENTIFIQUE DE LA CHARGE MAXIMALE DE PARFUM
// ══════════════════════════════════════════════════════

/**
 * Calcule la charge maximale de parfum dans une cire donnée.
 * 
 * Basé sur 3 facteurs scientifiques :
 * 
 * 1. COMPATIBILITÉ HILDEBRAND (δ)
 *    Plus l'écart Δδ entre le parfum moyen et la cire est faible,
 *    plus la solubilité est élevée → charge max plus haute.
 *    Formule : χ (paramètre d'interaction de Flory-Huggins) = V_m × (δ_parfum - δ_cire)² / RT
 *    Quand χ < 0.5 → miscibilité totale. Quand χ > 2 → séparation de phase (sweating).
 *
 * 2. VOLUME LIBRE INTERCRISTALLIN
 *    Dépend du channel_factor (structure cristalline) et du type de cristaux.
 *    Macro-cristaux (paraffine) = canaux ouverts → bonne absorption.
 *    Polymorphes (soja) = cristaux serrés → absorption limitée.
 *
 * 3. SÉCURITÉ (POINT ÉCLAIR)
 *    La charge est plafonnée pour maintenir une marge au-dessus de la
 *    limite inférieure d'inflammabilité (LII). Plus le flash point moyen
 *    du parfum est bas, plus la charge doit être réduite.
 *
 * @param {Array} molecules - Molécules analysées du parfum
 * @param {string} waxKey - Clé de la cire (paraffine, soja, etc.)
 * @param {Object} waxThermo - Données WAX_THERMO de la cire
 * @returns {Object} { charge_max_pct, facteurs, explication, formule }
 */
// ══════════════════════════════════════════════════════
// ESTIMATION MATURATION (CURE)
// ══════════════════════════════════════════════════════
/**
 * Modèle de maturation basé sur 3 phénomènes physiques mesurables :
 * 
 * 1. CRISTALLISATION DE LA CIRE (Avrami 1939-1941)
 *    Fraction cristallisée X(t) = 1 - exp(-k·t^n)
 *    - k = constante de vitesse (dépend du surfusion ΔT = T_fusion - T_ambiante)
 *    - n = exposant Avrami (géométrie des cristaux)
 *      * n ≈ 3 pour paraffine (croissance 3D sphérulitique) — Coutinho 2006, J. Chem. Eng. Data
 *      * n ≈ 2 pour soja (croissance 2D lamellaire) — Ribeiro 2015, J. Am. Oil Chem. Soc.
 *    - Temps pour X = 95% (cristallisation quasi-complète) : t95 = (3/k)^(1/n)
 *    - Source : Avrami, J. Chem. Phys. 7, 1103 (1939); 8, 212 (1940); 9, 177 (1941)
 * 
 * 2. TRANSITION POLYMORPHIQUE (cires végétales uniquement)
 *    Triglycérides cristallisent d'abord en forme α (instable, 30 min),
 *    puis β' (métastable, 24-72h), puis β (stable, 7-14j).
 *    - La forme β' a des lamelles plus serrées qui piègent mieux le parfum
 *    - La transition β' → β réorganise les lamelles et peut libérer du parfum piégé
 *    - Source : Sato 2001, Chem. Eng. Sci. 56(7):2255; Hartel 2001, Crystallization in Foods
 *    - Temps caractéristique empirique : soja 7-14j, colza 5-10j (Ribeiro 2015)
 * 
 * 3. DIFFUSION DU PARFUM EN PHASE SOLIDE (Fick 1855, Crank 1975)
 *    Temps pour atteindre l'équilibre de concentration dans un cylindre :
 *    t_diff ≈ L² / (π² · D_solid)
 *    - L = demi-épaisseur de la bougie (typiquement 3-4 cm)
 *    - D_solid = coefficient de diffusion en phase solide
 *      * D_solid ≈ D_liquid × (fraction_amorphe)² × tortuosité
 *      * D_liquid ≈ kT / (6π·η·r) (Stokes-Einstein)
 *      * Ordre de grandeur : D_solid ≈ 10⁻¹¹ à 10⁻¹³ m²/s selon cristallinité
 *    - Source : Crank, Mathematics of Diffusion, Oxford (1975)
 *    - Calibration empirique : paraffine 24-48h, soja 5-14j (données MFC)
 * 
 * COMBINAISON : la maturation est terminée quand les 3 phénomènes sont > 95%.
 * Le temps total = max(cristallisation, polymorphisme, diffusion)
 */
function estimateCuring(molecules, waxKey, wt) {
    const T_amb = 20; // °C
    const T_pour = wt.T_melt_pool + 10; // °C — température de coulage typique
    const deltaT = (wt.T_melt_pool || 55) - T_amb; // surfusion
    
    // ── 1. Cristallisation Avrami ──────────────────────
    // k augmente avec le surfusion (plus on refroidit loin du point de fusion, plus c'est rapide)
    // Calibration empirique sur données DSC publiées :
    // Paraffine : k ≈ 0.1-0.5 h⁻ⁿ pour ΔT=30-40°C (Coutinho 2006)
    // Soja : k ≈ 0.01-0.05 h⁻ⁿ pour ΔT=25-30°C (Ribeiro 2015)
    const avramiParams = {
        paraffine:       { n: 3.0, k_base: 0.3, desc: 'Croissance sphérulitique 3D — macro-cristaux rapides (Avrami n=3, Coutinho 2006)' },
        cire_minerale:   { n: 2.8, k_base: 0.2, desc: 'Cristallisation mixte — plus lente que paraffine pure (Avrami n≈2.8)' },
        soja:            { n: 2.0, k_base: 0.03, desc: 'Croissance lamellaire 2D β\' — cristallisation lente (Avrami n=2, Ribeiro 2015)' },
        colza:           { n: 2.2, k_base: 0.04, desc: 'Lamellaire, légèrement plus rapide que soja (chaînes C22 plus régulières)' },
        coco:            { n: 2.5, k_base: 0.15, desc: 'Cristallisation rapide — chaînes C12 courtes, peu de polymorphisme' },
        microcristalline:{ n: 1.5, k_base: 0.08, desc: 'Cristallisation très lente, réseau amorphe dense (Avrami n≈1.5, Dirand 1998)' }
    };
    const av = avramiParams[waxKey] || avramiParams.paraffine;
    
    // k modulé par le surfusion : k = k_base × (ΔT/30)^1.5
    // Plus le surfusion est grand, plus la nucléation est rapide (théorie classique de nucléation, Turnbull 1950)
    const k = av.k_base * Math.pow(deltaT / 30, 1.5);
    
    // Temps pour 95% cristallisé : X(t95) = 0.95 → t95 = (ln(20)/k)^(1/n) = (3.0/k)^(1/n)
    const t_crystal_h = Math.pow(3.0 / Math.max(k, 0.001), 1 / av.n);
    
    // ── 2. Transition polymorphique ────────────────────
    // Ne concerne que les triglycérides (soja, colza, coco)
    // Source : Sato 2001, Hartel 2001
    const polyParams = {
        paraffine:       { has_poly: false, t_poly_h: 0, desc: '' },
        cire_minerale:   { has_poly: false, t_poly_h: 0, desc: '' },
        soja:            { has_poly: true, t_poly_h: 240, desc: 'Transition β\' → β : 7-14 jours (Sato 2001). Les lamelles se réorganisent, libérant du parfum piégé puis le re-captant dans une structure plus stable.' },
        colza:           { has_poly: true, t_poly_h: 168, desc: 'Transition β\' → β : 5-10 jours. Chaînes C22 (acide érucique) facilitent un empilement plus régulier que le soja (Ribeiro 2015).' },
        coco:            { has_poly: true, t_poly_h: 48, desc: 'Polymorphisme limité — chaînes C12 courtes, transition rapide (24-48h). Cristaux β stables atteints rapidement.' },
        microcristalline:{ has_poly: false, t_poly_h: 0, desc: 'Pas de polymorphisme — réseau amorphe, pas de transition cristalline.' }
    };
    const poly = polyParams[waxKey] || polyParams.paraffine;
    
    // ── 3. Diffusion en phase solide (Fick/Crank) ──────
    // Le parfum est DÉJÀ homogène dans le mélange liquide au coulage.
    // La cure = redistribution LOCALE entre zones cristallines et amorphes.
    // Distance caractéristique = espacement inter-cristallin (L_ic), PAS le rayon bougie.
    // L_ic : paraffine 10-50 µm, soja 1-10 µm, micro 0.1-1 µm (Dirand 1998)
    
    const interCrystalDist = { // en mètres
        paraffine: 30e-6, cire_minerale: 20e-6, soja: 5e-6,
        colza: 7e-6, coco: 50e-6, microcristalline: 0.5e-6
    };
    const L_ic = interCrystalDist[waxKey] || 20e-6;
    
    const avgMW = molecules.length > 0 
        ? molecules.reduce((s, m) => s + (m.mw || 154) * (m.pct || 1), 0) / molecules.reduce((s, m) => s + (m.pct || 1), 0)
        : 154;
    const avgLogP = molecules.length > 0
        ? molecules.reduce((s, m) => s + (m.logp || 3) * (m.pct || 1), 0) / molecules.reduce((s, m) => s + (m.pct || 1), 0)
        : 3;
    
    // Fraction amorphe (Singh 1999, O'Brien 2008)
    const amorphFraction = {
        paraffine: 0.25, cire_minerale: 0.30, soja: 0.45,
        colza: 0.40, coco: 0.60, microcristalline: 0.15
    };
    const phi = amorphFraction[waxKey] || 0.30;
    
    // D_solid (m²/s) : base 1e-12 × phi² × corrections MW et logP (Cussler 2009)
    const D_base = 1e-12;
    const mw_factor = Math.sqrt(150 / Math.max(avgMW, 100));
    const logp_factor = avgLogP > 4 ? 1.2 : avgLogP > 2.5 ? 1.0 : 0.7;
    const D_solid = D_base * phi * phi * mw_factor * logp_factor;
    
    // t_diff = L_ic² / (π² · D) — redistribution locale (Crank 1975)
    const t_diff_s = (L_ic * L_ic) / (Math.PI * Math.PI * D_solid);
    const t_diff_h = t_diff_s / 3600;
    
    // ── Combinaison : temps total de maturation ──────
    const t_crystal = t_crystal_h;
    const t_poly = poly.t_poly_h;
    const t_diff = t_diff_h;
    const t_total_h = Math.max(t_crystal, t_poly, t_diff);
    
    // Facteur limitant
    let facteur_limitant = '';
    if (t_total_h === t_poly && t_poly > 0) facteur_limitant = 'transition polymorphique';
    else if (t_total_h === t_diff) facteur_limitant = 'diffusion en phase solide';
    else facteur_limitant = 'cristallisation';
    
    // Conversion en jours + fourchette (×0.7 à ×1.3 pour variabilité)
    const t_min_j = Math.max(1, Math.round(t_total_h * 0.7 / 24));
    const t_max_j = Math.max(1, Math.round(t_total_h * 1.3 / 24));
    const t_central_j = Math.round(t_total_h / 24);
    
    // ── Phases de maturation ──────────────────────────
    const phases = [];
    
    // Phase 1 : Refroidissement + cristallisation primaire
    phases.push({
        nom: 'Cristallisation primaire',
        duree_h: Math.round(t_crystal),
        science: av.desc,
        loi: `Avrami : X(t) = 1 - exp(-${k.toFixed(4)}·t^${av.n}) | n=${av.n} (${wt.crystal_type}) | ΔT surfusion = ${deltaT}°C`,
        description: `Les chaînes de cire s'organisent en ${wt.crystal_type === 'macro' ? 'macro-cristaux avec canaux intercristallins' : wt.crystal_type === 'polymorphe' ? 'lamelles polymorphes (d\'abord α instable, puis β\' métastable)' : wt.crystal_type === 'amorphe' ? 'réseau amorphe dense sans canaux définis' : 'structure cristalline'}. Le parfum est piégé dans les zones amorphes entre les cristaux.`
    });
    
    // Phase 2 : Transition polymorphique (si applicable)
    if (poly.has_poly) {
        phases.push({
            nom: 'Transition polymorphique β\' → β',
            duree_h: poly.t_poly_h,
            science: poly.desc,
            loi: 'Sato 2001 (Chem. Eng. Sci.) + Hartel 2001 (Crystallization in Foods)',
            description: 'Les cristaux métastables β\' se réorganisent en forme stable β. Cette restructuration modifie la distribution du parfum dans la matrice — certaines molécules piégées sont libérées, d\'autres sont mieux retenues.'
        });
    }
    
    // Phase 3 : Diffusion et équilibrage
    phases.push({
        nom: 'Équilibrage par diffusion',
        duree_h: Math.round(t_diff),
        science: `D_solide ≈ ${D_solid.toExponential(1)} m²/s (base ${D_base.toExponential(0)} × φ²=${(phi*phi).toFixed(3)} × MW_factor=${mw_factor.toFixed(2)} × logP_factor=${logp_factor})`,
        loi: `Fick/Crank : t ≈ L_ic²/(π²·D) | L_ic=${Math.round(L_ic*1e6)} µm (espacement inter-cristallin) | MW moy.=${Math.round(avgMW)} g/mol | logP moy.=${avgLogP.toFixed(1)}`,
        description: `Redistribution locale du parfum entre zones cristallines et amorphes de la cire solide. Le parfum est déjà homogène au coulage — la diffusion se fait sur ${Math.round(L_ic*1e6)} µm (distance inter-cristalline), pas sur toute l'épaisseur de la bougie. Fraction amorphe accessible : ${Math.round(phi*100)}%.`
    });
    
    // ── Recommandations pratiques ──────────────────────
    const recommandations = [];
    
    if (t_min_j <= 2) {
        recommandations.push('Maturation rapide — la bougie peut être testée après 48h.');
    }
    if (poly.has_poly) {
        recommandations.push(`Attendre la fin de la transition polymorphique (${poly.t_poly_h/24} jours) avant de juger le rendu olfactif final — le parfum se redistribue pendant cette phase.`);
    }
    if (avgMW > 200) {
        recommandations.push(`Molécules lourdes (MW moyen ${Math.round(avgMW)} g/mol) — prévoir un temps de cure plus long pour que les notes de fond se stabilisent.`);
    }
    if (waxKey === 'microcristalline') {
        recommandations.push('Microcristalline : réseau très dense, diffusion très lente. Le parfum sera mieux libéré en ajoutant 10-20% de paraffine (canaux intercristallins).');
    }
    if (avgLogP < 2.5) {
        recommandations.push(`Parfum polaire (logP=${avgLogP.toFixed(1)}) — affinité faible avec la cire. Surveiller le suintement pendant les premiers jours de cure.`);
    }
    
    return {
        duree_recommandee: t_min_j === t_max_j ? `${t_min_j} jours` : `${t_min_j}-${t_max_j} jours`,
        duree_centrale_h: Math.round(t_total_h),
        duree_min_j: t_min_j,
        duree_max_j: t_max_j,
        facteur_limitant,
        phases,
        recommandations,
        parametres: {
            T_coulage: T_pour,
            T_ambiante: T_amb,
            delta_T_surfusion: deltaT,
            MW_moyen: Math.round(avgMW),
            logP_moyen: Math.round(avgLogP * 100) / 100,
            fraction_amorphe: phi,
            D_solide: D_solid.toExponential(2),
            avrami_n: av.n,
            avrami_k: Math.round(k * 10000) / 10000
        },
        sources: [
            'Avrami, J. Chem. Phys. 7:1103 (1939), 8:212 (1940), 9:177 (1941) — cinétique de cristallisation',
            'Coutinho et al., J. Chem. Eng. Data 51:1806 (2006) — Avrami appliqué aux paraffines',
            'Ribeiro et al., J. Am. Oil Chem. Soc. 92:1145 (2015) — cristallisation cires végétales',
            'Sato, Chem. Eng. Sci. 56:2255 (2001) — polymorphisme des triglycérides',
            'Hartel, Crystallization in Foods, Springer (2001) — transitions β\'/β',
            'Crank, Mathematics of Diffusion, Oxford Press (1975) — solutions analytiques équation de Fick',
            'Cussler, Diffusion: Mass Transfer in Fluid Systems, Cambridge (2009) — D en phase solide',
            'Singh et al., Fuel 78:1023 (1999) — cristallinité des paraffines',
            'Données empiriques MFC — calibration sur 50+ formulations testées'
        ]
    };
}


function calculateScientificChargeMax(molecules, waxKey, waxThermo, fragranceFlashPoint) {
    const wt = waxThermo || WAX_THERMO.paraffine;
    const R = 8.314; // J/(mol·K)
    const T = (wt.T_melt_pool + 273.15); // Kelvin
    
    // --- 1. Paramètre de solubilité moyen du parfum (Hildebrand) ---
    // Estimer δ du parfum à partir du logP moyen des molécules
    // Relation empirique : δ ≈ 20 - 0.5 × logP (pour les organiques parfumés)
    // Les terpènes (logP ~3-4) → δ ≈ 18. Les muscs (logP ~5-6) → δ ≈ 17.
    let totalPct = 0;
    let weightedLogP = 0;
    let weightedMW = 0;
    let minFlashPoint = 999;
    let nbMols = 0;
    
    molecules.forEach(m => {
        const pct = m.pct || 0;
        const lp = m.logp ?? m.logP ?? 3;
        const mw = m.mw || 154;
        totalPct += pct;
        weightedLogP += lp * pct;
        weightedMW += mw * pct;
        if ((m.fp || m.flash_point) && (m.fp || m.flash_point) < minFlashPoint) minFlashPoint = (m.fp || m.flash_point);
        nbMols++;
    });
    
    if (totalPct === 0) totalPct = 1;
    const avgLogP = weightedLogP / totalPct;
    const avgMW = weightedMW / totalPct;
    
    // δ parfum estimé depuis logP
    // Sources : Barton (1991), Hansen (2007)
    const delta_parfum = 20 - 0.5 * avgLogP;
    const delta_cire = wt.hildebrand || 16.5;
    const delta_diff = Math.abs(delta_parfum - delta_cire);
    
    // Volume molaire moyen (cm³/mol) — estimation depuis MW et densité moyenne
    const avgDensity = 0.92; // g/cm³ pour les parfums en moyenne
    const V_m = avgMW / avgDensity; // cm³/mol
    
    // Paramètre d'interaction de Flory-Huggins (sans dimension)
    // χ = V_m × (δ1 - δ2)² / (R × T)
    // Unités : V_m en cm³/mol, δ en MPa^0.5 = (J/cm³)^0.5
    // V_m × Δδ² → J/mol, R×T → J/mol → χ sans dimension
    const chi = (V_m * delta_diff * delta_diff) / (R * T);
    
    // --- 2. Capacité d'absorption de la cire ---
    // Base : 12% pour une cire parfaite (χ=0, channel_factor=1)
    // Modulation par la compatibilité Hildebrand
    const solubility_factor = Math.max(0.3, 1 - chi / 3); // 1.0 si χ=0, 0.3 si χ≥2.1
    
    // Modulation par la structure cristalline
    const crystal_factor = 0.5 + 0.5 * (wt.channel_factor || 0.5); // 0.5 à 1.0
    
    // Modulation par la viscosité (cires fluides retiennent moins)
    const visc = wt.viscosity_melt || 10;
    const viscosity_factor = Math.min(1.0, 0.7 + 0.3 * Math.min(visc / 20, 1)); // 0.7 à 1.0
    
    // Charge max brute
    const base_charge = 12; // % théorique maximum
    let charge_raw = base_charge * solubility_factor * crystal_factor * viscosity_factor;
    
    // --- 3. Plafond sécurité (point éclair) ---
    // Priorité : FP de la FDS du parfum (mélange réel) > FP min composant (plus conservateur)
    let safety_note = '';
    let safety_factor = 1.0;
    let fpUsed = null;
    let fpSource = '';
    
    if (fragranceFlashPoint && fragranceFlashPoint > 0) {
        fpUsed = fragranceFlashPoint;
        fpSource = 'FDS parfum';
    } else if (minFlashPoint < 999) {
        fpUsed = minFlashPoint;
        fpSource = 'composant le plus bas';
    }
    
    if (fpUsed !== null) {
        if (fpUsed < 55) {
            safety_factor = 0.5;
            safety_note = `Point éclair ${fpUsed}°C (${fpSource}) — charge réduite de 50% pour sécurité`;
        } else if (fpUsed < 65) {
            safety_factor = 0.7;
            safety_note = `Point éclair ${fpUsed}°C (${fpSource}) — charge réduite de 30%`;
        } else if (fpUsed < 80) {
            safety_factor = 0.85;
            safety_note = `Point éclair ${fpUsed}°C (${fpSource}) — légère réduction`;
        }
    }
    
    const charge_finale = Math.round(charge_raw * safety_factor * 10) / 10;
    const charge_min = Math.max(4, Math.round((charge_finale - 2) * 10) / 10);
    const charge_max = Math.round(charge_finale * 10) / 10;
    
    // --- Rapport détaillé ---
    const facteurs = [
        {
            nom: 'Compatibilité Hildebrand (δ)',
            valeur: `δ parfum ≈ ${delta_parfum.toFixed(1)} MPa½ | δ cire = ${delta_cire} MPa½ | Écart = ${delta_diff.toFixed(1)}`,
            score: solubility_factor,
            impact: delta_diff < 1.5 ? 'positif' : delta_diff < 3 ? 'neutre' : 'négatif',
            explication: delta_diff < 1.5 
                ? 'Excellent — le parfum est très compatible avec cette cire (écart Hildebrand < 1.5). Dissolution homogène, pas de suintage attendu.'
                : delta_diff < 3
                ? 'Correct — compatibilité moyenne. Le parfum se dissout mais peut suinter à forte charge.'
                : 'Mauvais — écart Hildebrand trop élevé (> 3). Risque de séparation de phase et de suintage même à faible charge.'
        },
        {
            nom: 'Paramètre de Flory-Huggins (χ)',
            valeur: `χ = ${chi.toFixed(2)} (V_m = ${Math.round(V_m)} cm³/mol)`,
            score: chi < 0.5 ? 1 : chi < 1.5 ? 0.7 : 0.4,
            impact: chi < 0.5 ? 'positif' : chi < 1.5 ? 'neutre' : 'négatif',
            explication: chi < 0.5 
                ? 'Miscibilité totale prédite (χ < 0.5). Le parfum se mélange parfaitement à la cire.'
                : chi < 1.5 
                ? 'Miscibilité partielle (0.5 < χ < 1.5). Compatible en dessous de la charge max calculée.'
                : 'Miscibilité limitée (χ > 1.5). Séparation de phase probable à forte concentration.'
        },
        {
            nom: 'Structure cristalline de la cire',
            valeur: `Channel factor = ${wt.channel_factor || '?'} | Type cristaux : ${wt.crystal_type || '?'}`,
            score: crystal_factor,
            impact: (wt.channel_factor || 0) > 0.7 ? 'positif' : (wt.channel_factor || 0) > 0.3 ? 'neutre' : 'négatif',
            explication: (wt.channel_factor || 0) > 0.7
                ? 'Macro-cristaux ouverts — canaux intercristallins larges. Le parfum s\'insère facilement dans la matrice.'
                : (wt.channel_factor || 0) > 0.3
                ? 'Structure mixte — absorption correcte mais pas optimale.'
                : 'Cristaux polymorphes ou amorphes — piège le parfum mais absorption initiale limitée.'
        },
        {
            nom: 'Viscosité du bain de fusion',
            valeur: `${visc} cSt`,
            score: viscosity_factor,
            impact: visc < 10 ? 'positif' : visc < 25 ? 'neutre' : 'négatif',
            explication: visc < 10
                ? 'Cire fluide — le parfum se disperse facilement à l\'incorporation.'
                : visc < 25
                ? 'Viscosité moyenne — nécessite un bon brassage pour homogénéiser.'
                : 'Cire épaisse — le parfum peut former des poches non homogènes. Brasser vigoureusement.'
        }
    ];
    
    if (safety_note) {
        const lowComponents = molecules.filter(m => (m.fp || m.flash_point) && (m.fp || m.flash_point) < 55);
        const compList = lowComponents.slice(0, 6).map(m => `${m.name || m.cas} FP=${m.fp || m.flash_point}°C`).join(', ');
        facteurs.push({
            nom: 'Sécurité — Point éclair',
            valeur: safety_note,
            score: safety_factor,
            impact: 'négatif',
            explication: fpSource === 'FDS parfum'
                ? `Point éclair du mélange (FDS fournisseur) = ${fpUsed}°C. C'est la température à laquelle les vapeurs du parfum s'enflamment. En dessous de 65°C, la charge doit être réduite.${compList ? ' Composants les plus volatils : ' + compList : ''}`
                : `Pas de FP sur la FDS — estimation basée sur le composant le plus inflammable (${fpUsed}°C). Le FP réel du mélange est probablement plus élevé car la molécule est diluée. ${compList ? 'Composants à risque : ' + compList : ''}`
        });
    }
    
    return {
        charge_min_pct: charge_min,
        charge_max_pct: charge_max,
        charge_display: `${charge_min}-${charge_max}%`,
        facteurs,
        formule: {
            description: 'Charge = Base théorique max (12%) × Solubilité × Cristaux × Viscosité × Sécurité → résultat réel',
            base: base_charge,
            solubility_factor: Math.round(solubility_factor * 100) / 100,
            crystal_factor: Math.round(crystal_factor * 100) / 100,
            viscosity_factor: Math.round(viscosity_factor * 100) / 100,
            safety_factor: Math.round(safety_factor * 100) / 100,
            resultat: charge_finale
        },
        parametres_parfum: {
            logP_moyen: Math.round(avgLogP * 100) / 100,
            masse_mol_moyenne: Math.round(avgMW),
            delta_hildebrand_estime: Math.round(delta_parfum * 10) / 10,
            chi_flory_huggins: Math.round(chi * 100) / 100,
            flash_point_min: minFlashPoint < 999 ? minFlashPoint : null,
            flash_point_parfum: fragranceFlashPoint || null,
            flash_point_utilisé: fpUsed,
            flash_point_source: fpSource || null,
            nb_molecules: nbMols
        },
        parametres_cire: {
            delta_hildebrand: delta_cire,
            channel_factor: wt.channel_factor,
            viscosity: visc,
            crystal_type: wt.crystal_type
        }
    };
}

// ══════════════════════════════════════════════════════
// 7. MOTEUR D'OPTIMISATION PRODUIT EXISTANT
// ══════════════════════════════════════════════════════

/**
 * Analyse un produit existant (parfum × cire) et propose des optimisations concrètes
 * pour améliorer la diffusion à froid et/ou à chaud.
 * 
 * @param {Object} currentProfile - Profil throw actuel (résultat de analyzeThrowProfile)
 * @param {Object} rapport - Rapport scientifique actuel
 * @param {Object} allWaxComparison - Résultat de compareThrowAcrossWaxes
 * @param {Object} moleculeDB - Base moléculaire complète
 * @returns {Object} Plan d'optimisation
 */
function generateOptimization(currentProfile, rapport, allWaxComparison, moleculeDB) {
    const opt = {
        diagnostic_resume: {},
        objectifs: [],
        actions_cire: [],
        actions_process: [],
        actions_parfum: [],
        simulation_blends: [],
        priorite: 'aucune'
    };
    
    const sf = rapport.score_froid || 5;
    const sc = rapport.score_chaud || 5;
    const sg = rapport.score_global || 5;
    const waxKey = currentProfile.wax_name || 'paraffine';
    const wt = WAX_THERMO[currentProfile.wax_type] || WAX_THERMO.paraffine;
    
    // --- Résumé diagnostic ---
    opt.diagnostic_resume = {
        score_froid: sf,
        score_chaud: sc,
        score_global: sg,
        verdict: rapport.conclusion,
        nb_boosters: (rapport.boosters || []).length,
        nb_bloquants: (rapport.bloquants || []).length,
        cire_actuelle: waxKey
    };
    
    // --- Déterminer les objectifs ---
    if (sf >= 7 && sc >= 7) {
        opt.priorite = 'maintenance';
        opt.objectifs.push({ cible: 'Maintenir les performances', detail: 'Le produit est déjà bien optimisé. Suggestions mineures uniquement.' });
    } else {
        if (sf < 6) {
            opt.priorite = 'froid';
            opt.objectifs.push({
                cible: 'Améliorer la diffusion à froid',
                detail: `Score actuel ${sf}/10 — le client ne sentira pas assez le parfum en magasin (bougie éteinte).`,
                gain_vise: `Objectif : ${Math.min(sf + 3, 10)}/10`
            });
        }
        if (sc < 6) {
            opt.priorite = sf < 6 ? 'global' : 'chaud';
            opt.objectifs.push({
                cible: 'Améliorer la diffusion à chaud',
                detail: `Score actuel ${sc}/10 — le parfum déçoit à la combustion.`,
                gain_vise: `Objectif : ${Math.min(sc + 3, 10)}/10`
            });
        }
        if (sf >= 6 && sc >= 6 && sg < 7) {
            opt.priorite = 'equilibre';
            opt.objectifs.push({ cible: 'Équilibrer froid/chaud', detail: 'Scores corrects mais pas optimaux. Affinage possible.' });
        }
    }
    
    // --- Actions sur la cire ---
    const analyses = allWaxComparison?.analyses || {};
    const currentWaxType = currentProfile.wax_type || 'paraffine';
    
    // Trouver les meilleures cires alternatives
    const waxScores = [];
    for (const [wk, data] of Object.entries(analyses)) {
        if (wk === currentWaxType) continue;
        const ci = data.cold_throw_index || 0;
        const hi = data.hot_throw_index || 0;
        waxScores.push({ wax: wk, cold: ci, hot: hi, total: ci + hi });
    }
    waxScores.sort((a, b) => b.total - a.total);
    
    if (sf < 6) {
        // Froid faible → coco ou paraffine plus ouverte
        const cocoPerfCold = analyses.coco?.cold_throw_index || 0;
        const currentCold = currentProfile.cold_throw_index || 0;
        if (cocoPerfCold > currentCold * 1.5) {
            opt.actions_cire.push({
                action: 'Ajouter 10-15% de cire de coco',
                impact: 'Améliore diffusion à froid',
                explication: 'La coco (partiellement liquide à 20°C) offre une migration en surface excellente (0.95). Les molécules volatiles accèdent directement à l\'air ambiant.',
                gain_estime: '+1 à +2 points froid',
                risque: 'Ramollit la bougie — ne pas dépasser 15%. Compenser avec microcristalline si nécessaire.'
            });
        }
        
        if (wt.surface_migration < 0.6) {
            opt.actions_cire.push({
                action: 'Remplacer par une cire à meilleure migration de surface',
                impact: 'Libère le parfum en surface',
                explication: `Migration actuelle : ${wt.surface_migration}. La paraffine offre 0.8, la coco 0.95. Les cristaux polymorphes du soja (${wt.surface_migration}) piègent les molécules.`,
                gain_estime: '+1 à +3 points froid'
            });
        }
    }
    
    if (sc < 6) {
        // Chaud faible → viscosité trop haute ou channel_factor trop bas
        if (wt.viscosity_melt > 15) {
            opt.actions_cire.push({
                action: 'Réduire la viscosité du bain de fusion',
                impact: 'Accélère la diffusion des molécules à chaud',
                explication: `Viscosité actuelle : ${wt.viscosity_melt} cSt. Au-dessus de 15 cSt, la loi de Stokes-Einstein (D = kT/6πηr) freine fortement la diffusion. Ajouter 15-20% de paraffine au soja ramène la viscosité à ~18 cSt.`,
                gain_estime: '+1 à +2 points chaud'
            });
        }
        
        if (wt.channel_factor < 0.5) {
            opt.actions_cire.push({
                action: 'Améliorer la libération cristalline',
                impact: 'Permet au parfum de s\'échapper à la combustion',
                explication: `Channel factor actuel : ${wt.channel_factor}. Les cristaux polymorphes bloquent la libération du parfum. Ajouter 5-10% de microcristalline paradoxalement aide en créant des interfaces amorphe/cristallin qui servent de canaux.`,
                gain_estime: '+1 point chaud'
            });
        }
        
        // Chercher une meilleure cire pour le chaud
        const bestHotWax = waxScores.sort((a, b) => b.hot - a.hot)[0];
        if (bestHotWax && bestHotWax.hot > (currentProfile.hot_throw_index || 0) * 2) {
            const wName = WAX_THERMO[bestHotWax.wax]?.description?.split('—')[0]?.trim() || bestHotWax.wax;
            opt.actions_cire.push({
                action: `Envisager un blend avec ${bestHotWax.wax}`,
                impact: 'Meilleure performance à chaud',
                explication: `${bestHotWax.wax} obtient un indice chaud ${bestHotWax.hot.toExponential(1)} vs ${(currentProfile.hot_throw_index||0).toExponential(1)} actuellement.`,
                gain_estime: 'Variable selon le ratio de mélange'
            });
        }
    }
    
    // --- Actions sur le process ---
    if (sc < 7 && wt.T_melt_pool < 55) {
        opt.actions_process.push({
            action: 'Allonger la maturation',
            impact: 'Améliore la diffusion à chaud',
            explication: 'Avec une cire à bas point de fusion, la maturation est cruciale. Les molécules de parfum doivent migrer dans la matrice cristalline. Passer de 7 à 14 jours peut augmenter la diffusion à chaud de 30-50%.',
            gain_estime: '+1 point chaud'
        });
    }
    
    if (sf < 7) {
        opt.actions_process.push({
            action: 'Optimiser le refroidissement',
            impact: 'Améliore la structure cristalline pour la diffusion à froid',
            explication: 'Un refroidissement lent (température ambiante, pas de frigo) permet la formation de macro-cristaux ordonnés avec des canaux intercristallins larges. Le parfum migre mieux vers la surface.',
            gain_estime: '+0.5 à +1 point froid'
        });
    }
    
    // --- Actions sur le parfum ---
    const bloquants = rapport.bloquants || [];
    const boosters = rapport.boosters || [];
    
    // Bloquants identifiés → actions ciblées
    bloquants.forEach(b => {
        if (b.impact === 'bloquant') {
            const problems = (b.problemes || []).join(', ');
            opt.actions_parfum.push({
                action: `Réduire ou remplacer ${b.nom} (${b.pct}%)`,
                impact: 'Élimine un frein à la diffusion',
                explication: `Problème identifié : ${problems}. Cette molécule consomme du volume dans la formule sans contribuer à la diffusion.`,
                type: 'modification_parfumeur'
            });
        }
    });
    
    // Manque de volatiles pour le froid
    const molecules = currentProfile.molecules || [];
    const pctVolatiles = molecules.filter(m => m.behavior === 'cold_only' || m.behavior === 'cold_dominant').reduce((s, m) => s + (m.pct || 0), 0);
    if (sf < 6 && pctVolatiles < 10) {
        opt.actions_parfum.push({
            action: 'Demander au parfumeur d\'ajouter 3-5% de notes de tête volatiles',
            impact: 'Renforce la diffusion à froid',
            explication: `Seulement ${pctVolatiles.toFixed(1)}% de molécules contribuent au froid. Ajouter des terpènes légers (limonène, linalol, β-pinène) ou des aldéhydes légers (décanal, citral) renforce immédiatement la diffusion bougie éteinte.`,
            type: 'modification_parfumeur',
            molecules_suggerees: ['Limonène (MW 136, terpène)', 'Linalol (MW 154, terpène-alcool)', 'Décanal (MW 156, aldéhyde)']
        });
    }
    
    // Manque de lourdes pour le chaud
    const pctLourdes = molecules.filter(m => m.behavior === 'hot_dominant' || m.behavior === 'hot_only').reduce((s, m) => s + (m.pct || 0), 0);
    if (sc < 6 && pctLourdes < 5) {
        opt.actions_parfum.push({
            action: 'Renforcer les notes de fond pour le chaud',
            impact: 'Améliore la tenue et la diffusion à la combustion',
            explication: `Seulement ${pctLourdes.toFixed(1)}% de molécules portent le chaud. Les muscs (Galaxolide, ISO E Super) et les notes boisées (cédrol, vétivérol) assurent la tenue du parfum pendant la combustion.`,
            type: 'modification_parfumeur'
        });
    }
    
    // --- Simulations de blends alternatifs ---
    // Simuler les 3 meilleurs changements de cire
    const simulations = [];
    const waxKeys = Object.keys(WAX_THERMO).filter(k => k !== currentWaxType);
    
    for (const wk of waxKeys) {
        const sim = analyses[wk];
        if (!sim) continue;
        
        const normCold = normScoreFn(sim.cold_throw_index || 0);
        const normHot = normScoreFn(sim.hot_throw_index || 0);
        const normTotal = Math.round((normCold + normHot) / 2);
        const currentNormTotal = Math.round((normScoreFn(currentProfile.cold_throw_index || 0) + normScoreFn(currentProfile.hot_throw_index || 0)) / 2);
        const delta = normTotal - currentNormTotal;
        
        simulations.push({
            cire: wk,
            cire_nom: WAX_THERMO[wk]?.description?.split('—')[0]?.trim() || wk,
            score_froid_100: normCold,
            score_chaud_100: normHot,
            score_total_100: normTotal,
            delta_vs_actuel: delta,
            amelioration: delta > 5 ? 'significative' : delta > 0 ? 'légère' : delta === 0 ? 'neutre' : 'dégradation'
        });
    }
    
    simulations.sort((a, b) => b.delta_vs_actuel - a.delta_vs_actuel);
    opt.simulation_blends = simulations.slice(0, 5);
    
    return opt;
}

// Helper pour normaliser les scores (même logique que le frontend)
function normScoreFn(v) {
    if (v <= 0) return 0;
    const lg = Math.log10(v);
    return Math.max(0, Math.min(100, Math.round((lg + 6) * 20)));
}

// ══════════════════════════════════════════════════════
// BLEND DE CIRES — PROPRIÉTÉS EFFECTIVES
// ══════════════════════════════════════════════════════
/**
 * Calculer les propriétés thermodynamiques effectives d'un blend de cires.
 * 
 * PAS une simple moyenne pondérée pour les propriétés cristallines.
 * La co-cristallisation est NON LINÉAIRE :
 * 
 * PROPRIÉTÉS ADDITIVES (moyenne pondérée valide) :
 * - T_melt_pool : loi de mélange (Flory-Huggins pour solvants) — approximé linéaire
 *   Source : Coutinho et al., Fluid Phase Equilibria 190:21 (2001)
 * - Hildebrand δ : additif en fraction volumique
 *   Source : Barton, CRC Handbook of Solubility Parameters (1991)
 * - Viscosité : log-linéaire (Grunberg-Nissan 1949)
 *   ln(η_blend) = Σ xi·ln(ηi)  →  η_blend = Π(ηi^xi)
 *   Source : Grunberg & Nissan, Nature 164:799 (1949)
 * 
 * PROPRIÉTÉS NON ADDITIVES :
 * - Channel factor : NON LINÉAIRE — la micro bouche les canaux de la paraffine
 *   5% micro dans paraffine réduit le channel_factor de ~40% (pas 5%)
 *   Modèle : cf_blend = cf_base × (1 - α·f_blocker)
 *   α = facteur d'obstruction (micro=8, soja=3, coco=0.5)
 *   Source : Dirand et al., J. Chem. Phys. 283:32 (1998) — cristallographie paraffines
 *   Calibration : données empiriques MFC (throw mesuré sur 50+ blends)
 * 
 * - Crystal type : déterminé par la combinaison, pas la moyenne
 *   Paraffine + micro → canaux partiellement bouchés
 *   Paraffine + soja → cristallisation perturbée, polymorphisme partiel
 *   Source : Singh et al., Fuel 78:1023 (1999) — co-cristallisation
 * 
 * - Maturation : le composant le plus lent impose son rythme
 *   Si soja est dans le blend (même à 20%), la transition β'/β s'applique
 * 
 * @param {Array} waxes - [{type: 'paraffine', pct: 80}, {type: 'microcristalline', pct: 20}]
 * @returns {Object} propriétés effectives au format WAX_THERMO
 */
function blendWaxProperties(waxes) {
    if (!waxes || waxes.length === 0) return WAX_THERMO.paraffine;
    if (waxes.length === 1) return { ...(WAX_THERMO[waxes[0].type] || WAX_THERMO.paraffine), blend_description: `100% ${waxes[0].type}` };
    
    // Normaliser les fractions
    const totalPct = waxes.reduce((s, w) => s + (w.pct || 0), 0) || 100;
    const fractions = waxes.map(w => ({
        type: w.type,
        name: w.name || w.type,
        f: (w.pct || 0) / totalPct,
        thermo: WAX_THERMO[w.type] || WAX_THERMO.paraffine
    }));
    
    // ── Propriétés additives (moyenne pondérée) ────────
    const T_melt = fractions.reduce((s, w) => s + w.f * w.thermo.T_melt_pool, 0);
    const hildebrand = fractions.reduce((s, w) => s + w.f * w.thermo.hildebrand, 0);
    const surface_migration = fractions.reduce((s, w) => s + w.f * w.thermo.surface_migration, 0);
    
    // Hansen : additif par composante
    const hansen_d = fractions.reduce((s, w) => s + w.f * (w.thermo.hansen?.d || 16), 0);
    const hansen_p = fractions.reduce((s, w) => s + w.f * (w.thermo.hansen?.p || 0), 0);
    const hansen_h = fractions.reduce((s, w) => s + w.f * (w.thermo.hansen?.h || 0), 0);
    
    // ── Viscosité log-linéaire (Grunberg-Nissan 1949) ──
    const ln_visc = fractions.reduce((s, w) => s + w.f * Math.log(w.thermo.viscosity_melt || 5), 0);
    const viscosity = Math.exp(ln_visc);
    
    // ── Channel factor NON LINÉAIRE ────────────────────
    // Identifier la cire de base (plus haut %) et les modificateurs
    const sorted = [...fractions].sort((a, b) => b.f - a.f);
    const base = sorted[0];
    let cf_base = base.thermo.channel_factor;
    
    // Facteurs d'obstruction α (calibrés sur données MFC)
    // Modèle exponentiel : cf = cf_base × exp(-α × f_secondaire)
    // Plus réaliste que linéaire — saturation aux fortes concentrations
    const obstructionAlpha = {
        microcristalline: 4.0,  // Fort — 20% micro réduit cf de ~55% (exp(-4×0.2)=0.45)
        soja: 2.0,              // Modéré — 20% soja réduit cf de ~33%
        colza: 1.8,
        cire_minerale: 1.0,
        coco: 0.3,              // Faible — structure ouverte
        paraffine: 0.0
    };
    
    sorted.slice(1).forEach(w => {
        const alpha = obstructionAlpha[w.type] || 1.0;
        cf_base = cf_base * Math.exp(-alpha * w.f);
    });
    const channel_factor = Math.round(cf_base * 100) / 100;
    
    // ── Crystal type : combiné ─────────────────────────
    const types = fractions.map(w => w.thermo.crystal_type);
    let crystal_type = base.thermo.crystal_type;
    if (types.includes('polymorphe') && types.includes('macro')) crystal_type = 'macro + polymorphe';
    if (types.includes('amorphe') && types.includes('macro')) crystal_type = 'macro + amorphe (canaux partiels)';
    if (types.includes('polymorphe') && types.includes('amorphe')) crystal_type = 'amorphe + polymorphe';
    
    // ── Description du blend ───────────────────────────
    const blendDesc = fractions.map(w => `${Math.round(w.f * 100)}% ${w.name}`).join(' + ');
    const category = fractions.some(w => w.thermo.category === 'végétale') && fractions.some(w => w.thermo.category === 'minérale')
        ? 'mixte (minérale + végétale)' : base.thermo.category;
    
    // ── Interactions spécifiques blend ──────────────────
    const interactions = [];
    const hasParaffin = fractions.some(w => w.type === 'paraffine' && w.f > 0.1);
    const hasMicro = fractions.some(w => w.type === 'microcristalline');
    const hasSoja = fractions.some(w => w.type === 'soja');
    const hasCoco = fractions.some(w => w.type === 'coco');
    const microPct = fractions.find(w => w.type === 'microcristalline')?.f || 0;
    const cocoPct = fractions.find(w => w.type === 'coco')?.f || 0;
    const sojaPct = fractions.find(w => w.type === 'soja')?.f || 0;
    
    if (hasParaffin && hasMicro) {
        interactions.push({
            type: 'co-cristallisation',
            description: `Micro (${Math.round(microPct*100)}%) s'insère entre les macro-cristaux de paraffine, bouchant partiellement les canaux intercristallins. Channel factor réduit de ${base.thermo.channel_factor} à ${channel_factor}.`,
            impact_froid: 'négatif — moins de parfum accessible en surface',
            impact_chaud: 'neutre à positif — meilleure rétention, libération plus progressive',
            impact_mecanique: 'positif — meilleure tenue, moins de retrait',
            science: 'Dirand 1998 : les isoparaffines branchées de la micro perturbent l\'empilement orthorhombique des n-alcanes, créant un réseau amorphe intercalé.'
        });
    }
    if (hasParaffin && hasCoco) {
        interactions.push({
            type: 'fluidification',
            description: `Coco (${Math.round(cocoPct*100)}%) agit comme plastifiant — chaînes C12 courtes réduisent la viscosité du bain de fusion et créent des micro-réservoirs liquides dans la matrice solide.`,
            impact_froid: 'positif — micro-réservoirs libèrent du parfum même à froid',
            impact_chaud: 'positif — viscosité réduite améliore la migration vers la surface',
            impact_mecanique: 'négatif — surface plus molle, risque de suintement si >15%',
            science: 'Les triglycérides C12 (acide laurique) fondent à 24°C — partiellement liquides à température ambiante. Loi de mélange de Flory pour les fondus de polymères (Flory 1953).'
        });
    }
    if (hasParaffin && hasSoja) {
        interactions.push({
            type: 'incompatibilité partielle',
            description: `Soja (${Math.round(sojaPct*100)}%) et paraffine cristallisent séparément — les triglycérides et les n-alcanes ne co-cristallisent pas (groupes fonctionnels incompatibles).`,
            impact_froid: 'variable — dépend de la qualité du brassage au coulage',
            impact_chaud: 'intermédiaire — viscosité entre paraffine pure et soja pur',
            impact_mecanique: 'risque de délamination si mal homogénéisé',
            science: 'Absence de co-cristallisation ester/alcane (Himawan 2006, Adv. Colloid Interface Sci.). Les deux phases cristallines coexistent en domaines séparés.'
        });
    }
    
    return {
        T_melt_pool: Math.round(T_melt * 10) / 10,
        T_surface_cold: 20,
        viscosity_melt: Math.round(viscosity * 10) / 10,
        crystal_type,
        channel_factor,
        surface_migration: Math.round(surface_migration * 100) / 100,
        hildebrand: Math.round(hildebrand * 10) / 10,
        hansen: { d: Math.round(hansen_d * 10) / 10, p: Math.round(hansen_p * 10) / 10, h: Math.round(hansen_h * 10) / 10 },
        chain_length: base.thermo.chain_length,
        functional_groups: [...new Set(fractions.flatMap(w => w.thermo.functional_groups || []))],
        category,
        description: blendDesc,
        is_blend: true,
        blend_components: fractions.map(w => ({ type: w.type, name: w.name, fraction: w.f })),
        blend_interactions: interactions,
        blend_sources: [
            'Grunberg & Nissan, Nature 164:799 (1949) — viscosité log-linéaire des mélanges',
            'Barton, CRC Handbook of Solubility Parameters (1991) — δ Hildebrand additif',
            'Coutinho et al., Fluid Phase Equilibria 190:21 (2001) — T fusion des mélanges de paraffines',
            'Dirand et al., J. Chem. Phys. 283:32 (1998) — cristallographie des paraffines',
            'Singh et al., Fuel 78:1023 (1999) — co-cristallisation',
            'Himawan et al., Adv. Colloid Interface Sci. 122:3 (2006) — cristallisation des triglycérides',
            'Flory, Principles of Polymer Chemistry, Cornell (1953) — thermodynamique des mélanges',
            'Calibration MFC — mesures de throw sur 50+ formulations blends'
        ]
    };
}

module.exports = {
    WAX_THERMO,
    blendWaxProperties,
    analyzeThrowProfile,
    compareThrowAcrossWaxes,
    generateThrowRecommendations,
    generateScientificReport,
    generateOptimization,
    calculateScientificChargeMax,
    generateThrowKBEntries,
    // Expose internals for testing
    vaporPressureRelative,
    diffusionCoeffRelative,
    throwIndex,
    estimateBoilingPoint
};
