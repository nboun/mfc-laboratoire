/**
 * MFC Laboratoire — Import Excel Formulations
 * Scanne mfc-data/excel/ et importe les fiches de production dans la base
 * Auto-apprentissage : croise parfums × cires × mèches × colorants
 */

const path = require('path');
const fs = require('fs');

async function importExcelFormulations(db, dataDir) {
    let XLSX;
    try {
        XLSX = require('xlsx');
    } catch (e) {
        console.log('  ⚠ Module xlsx non installé — npm install xlsx');
        return { imported: 0, skipped: 0, errors: [{ file: 'module', error: 'xlsx non installé' }] };
    }
    const excelDir = path.join(dataDir, 'excel');
    console.log('  → Scan Excel : ' + excelDir);
    
    if (!fs.existsSync(excelDir)) {
        fs.mkdirSync(excelDir, { recursive: true });
        console.log('  → Dossier mfc-data/excel/ créé — déposez vos fiches Excel dedans');
        return { imported: 0, skipped: 0, errors: [] };
    }

    const files = fs.readdirSync(excelDir).filter(f => 
        f.toLowerCase().endsWith('.xlsx') || f.toLowerCase().endsWith('.xls')
    );
    
    if (files.length === 0) {
        console.log('  ℹ Aucun fichier Excel dans mfc-data/excel/ (chemin: ' + excelDir + ')');
        return { imported: 0, skipped: 0, errors: [] };
    }

    console.log(`  → Import Excel : ${files.length} fichier(s) trouvé(s) dans ${excelDir}`);
    
    let imported = 0, skipped = 0;
    const errors = [];
    const allFormulas = [];

    for (const file of files) {
        try {
            const filePath = path.join(excelDir, file);
            const formula = parseProductionSheet(XLSX, filePath, file);
            if (!formula) { 
                console.log(`    ⊘ ${file} — format non reconnu (ignoré)`);
                skipped++; continue; 
            }
            
            console.log(`    → Parse OK: ${file} — ${formula.designation || '?'} — ${formula.client || '?'} — ${(formula.cires || []).length} cires`);
            
            // Générer un code unique : code_article > lot > fichier
            const baseCode = formula.code_article || formula.lot || null;
            const fileCode = 'XL-' + file.replace(/\.[^.]+$/, '').toUpperCase().replace(/[^A-Z0-9]/g, '-').substring(0, 40);
            
            // Vérifier doublon par code_article OU par nom+parfum OU par fileCode
            const existing = await db.get(
                'SELECT id FROM formulations WHERE code = ? OR code = ? OR (name = ? AND fragrance_ref = ? AND name != "")',
                [baseCode || '___NONE___', fileCode, formula.designation || '', formula.parfum_ref || '']
            );
            if (existing) { 
                console.log(`    ⊘ ${file} — doublon (déjà en base)`);
                skipped++; continue; 
            }
            
            // Utiliser code_article si disponible, sinon fileCode (toujours unique)
            const code = baseCode || fileCode;

            // Résoudre le client
            let clientId = null;
            if (formula.client) {
                const client = await db.get('SELECT id FROM clients WHERE UPPER(name) = ?', [formula.client.toUpperCase()]);
                if (client) { clientId = client.id; }
                else {
                    const r = await db.run('INSERT INTO clients (name) VALUES (?)', [formula.client.toUpperCase()]);
                    clientId = r.lastInsertRowid;
                }
            }

            // Résoudre le parfum
            let fragranceId = null;
            if (formula.parfum_ref) {
                const frag = await db.get('SELECT id FROM fragrances WHERE UPPER(reference) LIKE ? OR UPPER(name) LIKE ?',
                    ['%' + formula.parfum_ref.toUpperCase() + '%', '%' + formula.parfum_ref.toUpperCase() + '%']);
                if (frag) fragranceId = frag.id;
            }

            // Résoudre la mèche
            let wickId = null, wickRef = formula.meche;
            if (wickRef) {
                // Parser "LX18 110 MM" → série LX, ref LX 18
                const wickMatch = wickRef.match(/([A-Z]+)\s*(\d+)/i);
                if (wickMatch) {
                    const series = wickMatch[1].toUpperCase();
                    const num = wickMatch[2];
                    const wick = await db.get('SELECT id, reference FROM wicks WHERE UPPER(series) = ? AND reference LIKE ?',
                        [series, series + ' ' + num + '%']);
                    if (wick) wickId = wick.id;
                }
            }

            // Créer la formulation — données pertinentes uniquement
            const formResult = await db.run(
                `INSERT INTO formulations (code, client_id, name, container_type, total_mass,
                 fragrance_name, fragrance_ref, fragrance_percentage, fragrance_id,
                 wick_reference, wick_id, status, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'importé', ?)`,
                [code, clientId, formula.designation || file, formula.ref_verre || null,
                 formula.masse_verre || null,
                 formula.parfum_designation || null, formula.parfum_ref || null,
                 formula.parfum_pct || null, fragranceId,
                 wickRef || null, wickId,
                 `Import Excel: ${file}`]
            );
            const formId = formResult.lastInsertRowid;

            // Insérer les cires avec pourcentages
            for (const cire of (formula.cires || [])) {
                let waxId = null;
                if (cire.reference) {
                    const wax = await db.get('SELECT id FROM waxes WHERE UPPER(reference) LIKE ? OR UPPER(name) LIKE ?',
                        ['%' + cire.reference.toUpperCase() + '%', '%' + cire.reference.toUpperCase() + '%']);
                    if (wax) waxId = wax.id;
                }
                // Stocker même si waxId null (pour garder la trace de la ref)
                await db.run('INSERT INTO formulation_waxes (formulation_id, wax_id, percentage, mass, raw_type, raw_reference) VALUES (?, ?, ?, ?, ?, ?)',
                    [formId, waxId || 0, cire.pourcentage, cire.masse || null, cire.type || null, cire.reference || null]);
            }

            // Auto-apprentissage KB : créer une entrée avec le croisement
            const kbContent = buildKBEntry(formula, fragranceId);
            await db.run(
                `INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags)
                 VALUES ('Savoir-faire formulation', 'production', ?, ?, ?, 2, ?)`,
                [`Production : ${formula.designation || file}`,
                 kbContent,
                 `Excel import: ${file}`,
                 ['excel', 'formulation', 'production', formula.client || '', formula.designation || '', formula.parfum_ref || ''].filter(Boolean).join(',')]
            );

            allFormulas.push(formula);
            imported++;
            console.log(`    ✓ ${formula.designation || file} — ${formula.client || '?'} — ${(formula.cires || []).length} cires`);
        } catch (e) {
            errors.push({ file, error: e.message });
            console.error(`    ✗ ${file}: ${e.message}`);
        }
    }

    // Croisement global parfums × formulations
    if (imported > 0) {
        await crossReferenceParfumsFormulations(db, allFormulas);
    }

    console.log(`  ✓ Import Excel : ${imported} importé(s), ${skipped} ignoré(s)` + 
        (errors.length ? `, ${errors.length} erreur(s)` : ''));
    
    return { imported, skipped, errors };
}

/**
 * Parse une fiche de production Excel MFC
 */
function parseProductionSheet(XLSX, filePath, fileName) {
    const wb = XLSX.readFile(filePath);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    
    if (rows.length < 30) return null;

    // Helper: convert Excel time serial (0.1875 = 04:30) to HH:MM string
    function fixTimeSerial(val) {
        if (typeof val === 'string') {
            const num = parseFloat(val);
            if (!isNaN(num) && num > 0 && num < 1 && val.includes('.') && val.length > 4) {
                const totalMinutes = Math.round(num * 24 * 60);
                const h = Math.floor(totalMinutes / 60);
                const m = totalMinutes % 60;
                return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
            }
        }
        return val;
    }

    const formula = {
        fichier: fileName,
        cires: [],
        colorants: []
    };

    // Scanner les lignes d'en-tête (positions variables selon le template)
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const row = rows[i].map(c => String(c).trim());
        const joined = row.join(' ').toUpperCase();

        // Client
        if (row[0] && row[0].toUpperCase() === 'CLIENT' && row[1]) {
            formula.client = row[1].trim();
        }
        // Réf verre
        if (joined.includes('RÉFÉRENCE DU VERRE') || joined.includes('REFERENCE DU VERRE')) {
            formula.ref_verre = row[2] || row[3] || '';
        }
        // Masse verre
        if (joined.includes('MASSE DU VERRE')) {
            formula.masse_verre = parseFloat(row[2]) || parseFloat(row[3]) || null;
        }
        // % parfum
        if (joined.includes('PARFUM EN %') || joined.includes('PARFUM EN%')) {
            formula.parfum_pct = parseFloat(row[2]) || parseFloat(row[3]) || null;
        }
        // Désignation bougie
        if (joined.includes('DÉSIGNATION BOUGIE') || joined.includes('DESIGNATION BOUGIE')) {
            formula.designation = fixTimeSerial(row[2] || row[3] || '');
        }
        // Désignation parfum
        if (joined.includes('DÉSIGNATION PARFUM') || joined.includes('DESIGNATION PARFUM')) {
            formula.parfum_designation = row[2] || row[3] || '';
            // Souvent la ref est ici
            formula.parfum_ref = formula.parfum_designation;
        }
        // "Nom du parfum" — variante courante
        if (joined.includes('NOM DU PARFUM')) {
            formula.parfum_designation = row[2] || row[3] || '';
            // Utiliser aussi comme désignation bougie si pas encore définie
            if (!formula.designation) formula.designation = formula.parfum_designation;
        }
        // "Référence" seule (ligne après "Nom du parfum")
        if (row[0] && row[0].toUpperCase() === 'RÉFÉRENCE' || row[0] && row[0].toUpperCase() === 'REFERENCE') {
            const refVal = row[2] || row[3] || '';
            if (refVal && !formula.parfum_ref) {
                formula.parfum_ref = String(refVal).trim();
            }
        }
        // Nombre à produire
        if (joined.includes('NOMBRE') && joined.includes('PRODUIRE')) {
            formula.quantite = parseInt(row[2]) || parseInt(row[3]) || null;
        }
        // Code article
        if (joined.includes('CODE ARTICLE')) {
            formula.code_article = row[3] || row[2] || '';
        }
        // Lot MFC
        if (joined.includes('LOT MFC')) {
            formula.lot = row[3] || row[2] || '';
        }
        // Date
        if (row[0] && row[0].toUpperCase().startsWith('DATE')) {
            const dateVal = row[2] || row[3];
            if (dateVal) {
                // Excel date serial number (values are strings after map)
                const numVal = parseFloat(dateVal);
                if (!isNaN(numVal) && numVal > 30000) {
                    const d = new Date((numVal - 25569) * 86400000);
                    formula.date = d.toISOString().split('T')[0];
                } else if (dateVal instanceof Date) {
                    formula.date = dateVal.toISOString().split('T')[0];
                } else {
                    formula.date = String(dateVal);
                }
            }
        }
    }

    // Scanner la section matières (cires)
    let inMatieres = false, inColorants = false, masse_totale = 0;
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i].map(c => String(c).trim());
        const joined = row.join(' ').toUpperCase();

        // Détecter sections
        if (row[0] && row[0].toUpperCase() === 'MATIERES') { inMatieres = true; inColorants = false; continue; }
        if (row[0] && row[0].toUpperCase() === 'COLORANT') { inColorants = true; inMatieres = false; continue; }
        if (joined.includes('MÈCHE') || joined.includes('MECHE')) {
            inMatieres = false; inColorants = false;
            // Parser la mèche
            const mecheText = row.filter(c => c).join(' ');
            const mecheMatch = mecheText.match(/([A-Z]+\s*\d+(?:\s*\d+\s*MM)?)/i);
            if (mecheMatch) formula.meche = mecheMatch[1].trim();
            continue;
        }

        // Parser les cires
        if (inMatieres && row[0]) {
            const type = row[0].toUpperCase();
            const ref = row[2] || '';
            const pct = parseFloat(row[4]);
            const masse = parseFloat(row[5]);
            
            if (ref && !isNaN(pct) && pct > 0) {
                // C'est le parfum si : même nom que désignation, ou même ref, ou même % que parfum déclaré
                const isParfum = (formula.designation && type === formula.designation.toUpperCase())
                    || (formula.parfum_designation && type === formula.parfum_designation.toUpperCase())
                    || (formula.parfum_ref && String(ref) === String(formula.parfum_ref))
                    || type.includes('PARFUM');
                if (isParfum) {
                    formula.parfum_ref = formula.parfum_ref || ref;
                    formula.parfum_pct = pct;
                    formula.parfum_masse = masse;
                    formula.parfum_designation = formula.parfum_designation || row[0];
                } else {
                    formula.cires.push({
                        type: type,
                        reference: ref,
                        pourcentage: pct,
                        masse: masse || 0
                    });
                }
                masse_totale += masse || 0;
            }
            // Ligne total (100%)
            if (!isNaN(pct) && pct === 100) {
                formula.masse_totale = masse;
            }
        }

        // Parser les colorants
        if (inColorants && row[0]) {
            const type = row[0];
            const ref = row[2] || '';
            const pct = parseFloat(row[4]);
            const masse = parseFloat(row[5]);
            
            if (ref && !isNaN(pct) && pct > 0) {
                formula.colorants.push({ type, reference: ref, pourcentage: pct, masse: masse || 0 });
                formula.colorant_masse = (formula.colorant_masse || 0) + (masse || 0);
            }
        }
    }

    if (!formula.masse_totale) formula.masse_totale = masse_totale;
    
    return formula;
}

/**
 * Construire une entrée KB pour auto-apprentissage
 */
function buildKBEntry(formula, fragranceId) {
    let content = `FORMULATION : ${formula.designation || '?'}\n`;
    content += `Client : ${formula.client || '?'}\n`;
    content += `Masse verre : ${formula.masse_verre || '?'}g\n\n`;
    
    content += `PARFUM : ${formula.parfum_designation || formula.parfum_ref || '?'} — ${formula.parfum_pct || '?'}%\n`;
    if (fragranceId) content += `→ FDS disponible en base (#${fragranceId})\n`;
    
    content += `\nMATIÈRES :\n`;
    for (const c of (formula.cires || [])) {
        content += `  ${c.type} — Réf ${c.reference} — ${c.pourcentage}%\n`;
    }
    
    if (formula.colorants && formula.colorants.length > 0) {
        content += `COLORANT(S) :\n`;
        for (const c of formula.colorants) {
            content += `  ${c.type} — Réf ${c.reference} — ${c.pourcentage}%\n`;
        }
    }
    
    content += `MÈCHE : ${formula.meche || '?'}\n`;
    
    return content;
}

/**
 * Croisement parfums × formulations pour auto-apprentissage
 */
async function crossReferenceParfumsFormulations(db, formulas) {
    // Pour chaque parfum utilisé, chercher ses composants et créer des recommandations
    const parfumUsages = {};
    for (const f of formulas) {
        const ref = f.parfum_ref || f.parfum_designation;
        if (!ref) continue;
        if (!parfumUsages[ref]) parfumUsages[ref] = [];
        parfumUsages[ref].push(f);
    }

    for (const [parfumRef, usages] of Object.entries(parfumUsages)) {
        // Chercher le parfum en base avec ses composants
        const frag = await db.get('SELECT id, name, flash_point FROM fragrances WHERE UPPER(reference) LIKE ? OR UPPER(name) LIKE ?',
            ['%' + parfumRef.toUpperCase() + '%', '%' + parfumRef.toUpperCase() + '%']);
        
        if (!frag) continue;

        const components = await db.all('SELECT * FROM fragrance_components WHERE fragrance_id = ? ORDER BY percentage_max DESC', [frag.id]);
        if (components.length === 0) continue;

        // Construire le croisement
        let content = `CROISEMENT PARFUM × FORMULATIONS\n`;
        content += `Parfum : ${frag.name} (Flash point: ${frag.flash_point || '?'}°C)\n`;
        content += `Utilisé dans ${usages.length} formulation(s) :\n`;
        for (const u of usages) {
            content += `  → ${u.designation} (${u.client}) — ${u.parfum_pct}% — cires: ${(u.cires || []).map(c => c.reference + ' ' + c.pourcentage + '%').join(', ')}\n`;
        }
        
        // Top molécules
        const topMols = components.slice(0, 5);
        if (topMols.length > 0) {
            content += `\nTop molécules :\n`;
            for (const m of topMols) {
                content += `  ${m.name} (CAS ${m.cas_number}) — ${m.percentage_min || '?'}-${m.percentage_max || '?'}%\n`;
            }
        }

        // Alertes
        if (frag.flash_point && frag.flash_point < 65) {
            content += `\n⚠️ Flash point bas (${frag.flash_point}°C) — température d'ajout recommandée : ${Math.max(frag.flash_point - 15, 40)}°C\n`;
        }

        const existing = await db.get("SELECT id FROM knowledge_base WHERE title = ?", [`Croisement : ${frag.name}`]);
        if (!existing) {
            await db.run(
                `INSERT INTO knowledge_base (category, subcategory, title, content, source, priority, tags)
                 VALUES ('Savoir-faire formulation', 'croisement', ?, ?, 'Auto-croisement Excel×FDS', 1, ?)`,
                [`Croisement : ${frag.name}`, content,
                 ['croisement', 'parfum', 'formulation', parfumRef, frag.name].join(',')]
            );
        }
    }
}

module.exports = { importExcelFormulations, parseProductionSheet };
