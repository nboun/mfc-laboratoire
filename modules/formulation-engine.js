/**
 * MFC Laboratoire — Moteur de Formulation v1
 * Croisement FDS × Recettes × Règles pour proposer des formulations
 */

// ── Règles de sécurité molécules ──────────────────────

const ALLERGENS_IFRA = [
    '78-70-6',    // Linalool
    '5989-27-5',  // D-Limonene
    '106-22-9',   // Citronellol
    '106-24-1',   // Geraniol
    '5392-40-5',  // Citral
    '97-53-0',    // Eugenol
    '97-54-1',    // Isoeugenol
    '101-86-0',   // Alpha-hexylcinnamaldehyde
    '104-55-2',   // Cinnamaldehyde
    '80-54-6',    // Lilial (BMHCA)
    '122-40-7',   // Amyl cinnamal
    '100-51-6',   // Benzyl alcohol
    '120-51-4',   // Benzyl benzoate
    '105-87-3',   // Geranyl acetate
    '91-64-5',    // Coumarin
    '4602-84-0',  // Farnesol
];

const CMR_SUBSTANCES = {
    '99-85-4':  { name: 'p-Mentha-1,4-diene (Terpinolene)', category: 'Repr. 2', alert: 'Reprotoxique catégorie 2' },
    '99-87-6':  { name: 'p-Cymene', category: 'Repr. 2', alert: 'Reprotoxique catégorie 2' },
    '80-54-6':  { name: 'Lilial (BMHCA)', category: 'Repr. 1B', alert: 'INTERDIT IFRA — Reprotoxique 1B' },
    '123-35-3': { name: 'Myrcene', category: 'CIRC 2B', alert: 'Cancérogène possible (CIRC 2B)' },
};

const WICK_BLOCKERS = [
    // Molécules connues pour obstruer les mèches (piégeage capillaire)
    // Pigments, résines lourdes
];

const DPG_CAS = '34590-94-8'; // DPG — exclu chez MFC

// ── Analyse FDS → Alertes & Recommandations ──────────

function analyzeFDS(fdsData) {
    const alerts = [];
    const recommendations = [];
    const composition = fdsData.composition || [];
    const props = fdsData.proprietes_physiques || {};
    const classif = fdsData.classification_globale || {};
    
    // 1. Flash point
    const fp = parseFloat(props.flash_point_c);
    if (!isNaN(fp)) {
        if (fp < 55) {
            alerts.push({ level: 'danger', type: 'flash_point', 
                message: `Point éclair très bas : ${fp}°C — Risque inflammabilité élevé`,
                detail: `Température d'ajout du parfum max recommandée : ${Math.max(fp - 15, 40)}°C` });
            recommendations.push({ type: 'temp_ajout_parfum', value: Math.max(fp - 15, 40),
                reason: `Flash point ${fp}°C → ajout à froid` });
        } else if (fp < 70) {
            alerts.push({ level: 'warning', type: 'flash_point',
                message: `Point éclair modéré : ${fp}°C — Ajout parfum sous ${fp - 10}°C`,
                detail: `Ne pas dépasser ${fp - 10}°C pour l'ajout du parfum` });
            recommendations.push({ type: 'temp_ajout_parfum', value: fp - 10,
                reason: `Flash point ${fp}°C` });
        } else {
            recommendations.push({ type: 'temp_ajout_parfum', value: Math.min(fp - 5, 75),
                reason: `Flash point confortable ${fp}°C` });
        }
    }
    
    // 2. Allergènes IFRA
    const allergenesPresents = [];
    for (const mol of composition) {
        if (ALLERGENS_IFRA.includes(mol.cas)) {
            allergenesPresents.push({ cas: mol.cas, nom: mol.nom_chimique, concentration: mol.concentration });
        }
    }
    if (allergenesPresents.length > 0) {
        alerts.push({ level: 'info', type: 'allergenes',
            message: `${allergenesPresents.length} allergène(s) IFRA déclaré(s)`,
            detail: allergenesPresents.map(a => `${a.nom || a.cas} (${a.concentration}%)`).join(', '),
            data: allergenesPresents });
    }
    
    // 3. CMR
    for (const mol of composition) {
        if (CMR_SUBSTANCES[mol.cas]) {
            const cmr = CMR_SUBSTANCES[mol.cas];
            alerts.push({ level: 'warning', type: 'cmr',
                message: `${cmr.name} — ${cmr.alert}`,
                detail: `CAS ${mol.cas}, concentration ${mol.concentration}%` });
        }
    }
    
    // 4. DPG check
    for (const mol of composition) {
        if (mol.cas === DPG_CAS) {
            alerts.push({ level: 'danger', type: 'dpg',
                message: `DPG détecté (CAS ${DPG_CAS}) — Exclu chez MFC`,
                detail: `Concentration ${mol.concentration}%. Demander reformulation sans DPG au fournisseur.` });
        }
    }
    
    // 5. Danger aspiration (H304)
    const hasH304 = composition.some(m => m.classification && m.classification.includes('H304'));
    if (hasH304 || (classif.phrases_H || []).some(h => h.code === 'H304')) {
        alerts.push({ level: 'info', type: 'aspiration',
            message: 'Danger par aspiration (H304) — Manipulation avec précaution' });
    }
    
    // 6. Molécules à haute concentration (> 10%)
    for (const mol of composition) {
        const parts = mol.concentration.split('-');
        const hi = parseFloat(parts[parts.length - 1]);
        if (hi > 10 && mol.nom_chimique) {
            recommendations.push({ type: 'molecule_dominante',
                value: `${mol.nom_chimique} (${mol.concentration}%)`,
                reason: 'Composant majeur — influence forte sur la diffusion et combustion' });
        }
    }
    
    // 7. Densité → indicateur viscosité
    const densite = parseFloat(props.densite);
    if (!isNaN(densite)) {
        if (densite > 1000) {
            recommendations.push({ type: 'densite', value: densite,
                reason: 'Densité élevée — parfum lourd, considérer recette MFC-C ou MFC-D' });
        } else if (densite < 850) {
            recommendations.push({ type: 'densite', value: densite,
                reason: 'Densité faible — parfum léger/volatile, recette MFC-A adaptée' });
        }
    }
    
    return { alerts, recommendations, allergenesPresents, flashPoint: fp };
}

// ── Sélection de recette ──────────────────────────────

function selectRecipe(recipes, params, fdsAnalysis) {
    // params: { candle_type, diameter, height, fragrance_pct }
    // fdsAnalysis: résultat de analyzeFDS (optionnel)
    
    const scored = [];
    
    for (const recipe of recipes) {
        let score = 0;
        const reasons = [];
        
        // Type bougie
        if (recipe.candle_type === params.candle_type || !params.candle_type) {
            score += 10;
        }
        
        // Diamètre dans la plage
        if (params.diameter && recipe.diameter_min && recipe.diameter_max) {
            if (params.diameter >= recipe.diameter_min && params.diameter <= recipe.diameter_max) {
                score += 15;
                reasons.push('Diamètre compatible');
            }
        }
        
        // % parfum dans la plage
        const fpct = params.fragrance_pct || 12;
        if (recipe.fragrance_pct_min && recipe.fragrance_pct_max) {
            if (fpct >= recipe.fragrance_pct_min && fpct <= recipe.fragrance_pct_max) {
                score += 15;
                reasons.push(`${fpct}% parfum dans la plage`);
            }
        }
        
        // Bonus pour recettes les plus utilisées
        score += (recipe.success_count || 0) * 2;
        
        // Analyse FDS → ajustements
        if (fdsAnalysis) {
            const fp = fdsAnalysis.flashPoint;
            
            // Flash point bas → préférer recettes basse température
            if (fp && fp < 65 && recipe.pour_temp_max && recipe.pour_temp_max <= 72) {
                score += 5;
                reasons.push('Compatible flash point bas');
            }
            
            // Densité élevée → MFC-C ou MFC-D
            const densiteReco = (fdsAnalysis.recommendations || []).find(r => r.type === 'densite');
            if (densiteReco && densiteReco.value > 1000) {
                if (recipe.code === 'MFC-C' || recipe.code === 'MFC-D') {
                    score += 20;
                    reasons.push('Parfum lourd → recette renforcée');
                }
            }
            
            // DPG détecté → warning mais ne change pas la recette
            const hasDPG = (fdsAnalysis.alerts || []).some(a => a.type === 'dpg');
            if (hasDPG) {
                reasons.push('⚠️ DPG détecté — demander reformulation');
            }
        }
        
        scored.push({ recipe, score, reasons });
    }
    
    // Trier par score décroissant
    scored.sort((a, b) => b.score - a.score);
    return scored;
}

// ── Génération de formulation ─────────────────────────

function generateFormulation(recipe, params) {
    // Calculer les masses
    const totalMass = params.total_mass || 200; // g
    const fragrancePct = params.fragrance_pct || recipe.fragrance_pct_default || 12;
    const colorantPct = params.colorant_pct || recipe.colorant_pct || 0.2;
    
    const fragranceMass = totalMass * fragrancePct / 100;
    const colorantMass = totalMass * colorantPct / 100;
    const waxMass = totalMass - fragranceMass - colorantMass;
    
    // Répartition des cires selon la recette
    const waxes = (recipe.waxes || []).map(w => ({
        name: w.wax_name,
        percentage: w.percentage,
        role: w.role,
        mass: Math.round(waxMass * w.percentage / 100 * 100) / 100
    }));
    
    // Températures
    const tempAjoutParfum = params.temp_ajout_parfum || recipe.pour_temp_max || 75;
    const tempCoulage = params.temp_coulage || recipe.pour_temp_min || 70;
    
    return {
        recipe_code: recipe.code,
        recipe_name: recipe.name,
        total_mass: totalMass,
        fragrance_pct: fragrancePct,
        fragrance_mass: Math.round(fragranceMass * 100) / 100,
        colorant_pct: colorantPct,
        colorant_mass: Math.round(colorantMass * 100) / 100,
        wax_total_mass: Math.round(waxMass * 100) / 100,
        waxes,
        wick_series: recipe.wick_series,
        wick_guide: recipe.wick_size_guide,
        temp_ajout_parfum: tempAjoutParfum,
        temp_coulage: tempCoulage,
        cure_hours: recipe.cure_hours || 72,
        notes: recipe.empirical_notes,
        pitfalls: recipe.pitfalls
    };
}

module.exports = { analyzeFDS, selectRecipe, generateFormulation, ALLERGENS_IFRA, CMR_SUBSTANCES };
