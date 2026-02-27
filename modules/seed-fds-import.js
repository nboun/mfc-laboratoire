// SESSION 23 — IMPORT FDS PARFUMS + COMPOSANTS DANS LA BASE
// 10 parfums Robertet/Charabot avec tous les composants CAS, pourcentages, flash point
// Sources: FDS REACH Robertet (9) + Charabot (1) via OCR Tesseract

async function seedSession23(db) {
    const check = await db.get("SELECT COUNT(*) as c FROM fragrances WHERE reference IS NOT NULL AND reference != ''");
    if (check.c >= 10) { console.log('  ✓ Session 23 : 10 parfums FDS déjà présents'); return; }
    console.log('  → Session 23 : import 10 parfums FDS + composants...');

    let robertetId, charabotId;
    const rob = await db.get("SELECT id FROM suppliers WHERE UPPER(name) LIKE '%ROBERTET%'");
    if (rob) { robertetId = rob.id; } else {
        const r = await db.run("INSERT INTO suppliers (name, country, specialty) VALUES ('ROBERTET', 'France', 'Parfums')");
        robertetId = r.lastInsertRowid;
    }
    const cha = await db.get("SELECT id FROM suppliers WHERE UPPER(name) LIKE '%CHARABOT%'");
    if (cha) { charabotId = cha.id; } else {
        const r = await db.run("INSERT INTO suppliers (name, country, specialty) VALUES ('CHARABOT', 'France', 'Parfums')");
        charabotId = r.lastInsertRowid;
    }

    // --- ARMAGNAC (18 composants) ---
    {
        const ex = await db.get(`SELECT id FROM fragrances WHERE UPPER(name) = 'ARMAGNAC'`);
        if (!ex) {
            const fr = await db.run(`INSERT INTO fragrances (supplier_id, reference, name, flash_point) VALUES (?, ?, ?, ?)`, [robertetId, `G 117 11061`, `ARMAGNAC`, 35.0]);
            const fid = fr.lastInsertRowid;
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `78-70-6`, `Linalool`, 40.0, 50.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `94333-88-7`, `Bulnesia sarmienti, ext., acetate`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `121-33-5`, `Vanillin`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `5989-27-5`, `d-Limonene ((R)-p-mentha-1,8-diène)`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `5392-40-5`, `Citral`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `97-53-0`, `Eugenol`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `469-61-4`, `alpha-Cedrene (super R50)`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `77-53-2`, `Cedrol`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `104-55-2`, `Cinnamaldehyde`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `23696-85-7`, `DAMASCENONE (1-(2,6,6-Trimethylcyclohexa-1,`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `80-56-8`, `alpha-Pinene`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `87-44-5`, `beta-Caryophyllene`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `127-91-3`, `beta-Pinene`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `3338-55-4`, `cis-Ocimene (Z-3,7-Dimethyl-1,3,6-`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `546-28-1`, `beta cedrene (super R50)`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `102-20-5`, `Phenethyl phenylacetate`, 0.01, 0.1]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `104-67-6`, `gamma-Undecalactone`, 0.01, 0.1]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `11028-42-5`, `Cedrene`, 0.01, 0.1]);
            console.log('    + ARMAGNAC : 18 composants');
        }
    }

    // --- ARMAGNAC CASSIS 5 MOD (18 composants) ---
    {
        const ex = await db.get(`SELECT id FROM fragrances WHERE UPPER(name) = 'ARMAGNAC CASSIS 5 MOD'`);
        if (!ex) {
            const fr = await db.run(`INSERT INTO fragrances (supplier_id, reference, name, flash_point) VALUES (?, ?, ?, ?)`, [robertetId, `G 118 20556`, `ARMAGNAC CASSIS 5 MOD`, 82.0]);
            const fid = fr.lastInsertRowid;
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `1222-05-5`, `GALAXOLIDE (1,3,4,6,7,8-Hexahydro-4,6,6,7,8,`, 10.0, 20.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `78-70-6`, `Linalool`, 5.0, 10.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `18172-67-3`, `l-beta-Pinene`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `106-22-9`, `dl-Citronellol`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `121-33-5`, `Vanillin`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `5989-27-5`, `d-Limonene ((R)-p-mentha-1,8-diène)`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `3658-77-3`, `2,5-Dimethyl-4-hydroxy-3-furanone (Furaneol)`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `68039-49-6`, `Reaction mass of (1R,2R)-2,4-`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `65443-14-3`, `2,2,5-Trimethyl-5-pentylcyclopentanone`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `469-61-4`, `alpha-Cedrene (super R50)`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `77-53-2`, `Cedrol`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `5392-40-5`, `Citral`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `104-55-2`, `Cinnamaldehyde`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `104-67-6`, `gamma-Undecalactone`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `97-53-0`, `Eugenol`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `23696-85-7`, `DAMASCENONE (1-(2,6,6-Trimethylcyclohexa-1,`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `546-28-1`, `beta cedrene (super R50)`, 0.01, 0.1]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `11028-42-5`, `Cedrene`, 0.01, 0.1]);
            console.log('    + ARMAGNAC CASSIS 5 MOD : 18 composants');
        }
    }

    // --- ARMAGNAC ENCHANTE (24 composants) ---
    {
        const ex = await db.get(`SELECT id FROM fragrances WHERE UPPER(name) = 'ARMAGNAC ENCHANTE'`);
        if (!ex) {
            const fr = await db.run(`INSERT INTO fragrances (supplier_id, reference, name, flash_point) VALUES (?, ?, ?, ?)`, [robertetId, `G 118 14416`, `ARMAGNAC ENCHANTE`, 89.0]);
            const fid = fr.lastInsertRowid;
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `78-70-6`, `Linalool`, 20.0, 30.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `94333-88-7`, `Bulnesia sarmienti, ext., acetate`, 10.0, 20.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `81782-77-6`, `4-Methyl-3-decen-5-ol`, 5.0, 10.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `1222-05-5`, `GALAXOLIDE (1,3,4,6,7,8-Hexahydro-4,6,6,7,8,`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `118-71-8`, `Maltol`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `121-33-5`, `Vanillin`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `104-55-2`, `Cinnamaldehyde`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `97-53-0`, `Eugenol`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `18172-67-3`, `l-beta-Pinene`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `68039-49-6`, `Reaction mass of (1R,2R)-2,4-`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `469-61-4`, `alpha-Cedrene (super R50)`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `77-53-2`, `Cedrol`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `110-41-8`, `2-Methylundecanal`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `112-45-8`, `10-Undecenal`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `87-44-5`, `beta-Caryophyllene`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `104-67-6`, `gamma-Undecalactone`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `23696-85-7`, `DAMASCENONE (1-(2,6,6-Trimethylcyclohexa-1,`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `106-22-9`, `dl-Citronellol`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `3391-86-4`, `1-Octen-3-ol (Amyl vinyl carbinol)`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `5989-27-5`, `d-Limonene ((R)-p-mentha-1,8-diène)`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `3338-55-4`, `cis-Ocimene (Z-3,7-Dimethyl-1,3,6-`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `546-28-1`, `beta cedrene (super R50)`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `80-56-8`, `alpha-Pinene`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `11028-42-5`, `Cedrene`, 0.01, 0.1]);
            console.log('    + ARMAGNAC ENCHANTE : 24 composants');
        }
    }

    // --- BASILICUM (27 composants) ---
    {
        const ex = await db.get(`SELECT id FROM fragrances WHERE UPPER(name) = 'BASILICUM'`);
        if (!ex) {
            const fr = await db.run(`INSERT INTO fragrances (supplier_id, reference, name, flash_point) VALUES (?, ?, ?, ?)`, [robertetId, `G 116 33377`, `BASILICUM`, 65.0]);
            const fid = fr.lastInsertRowid;
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `78-70-6`, `Linalool`, 30.0, 40.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `5989-27-5`, `d-Limonene ((R)-p-mentha-1,8-diène)`, 5.0, 10.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `18479-58-8`, `Dihydromyrcenol (2,6-Dimethyloct-7-en-2-ol)`, 5.0, 10.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `1222-05-5`, `GALAXOLIDE (1,3,4,6,7,8-Hexahydro-4,6,6,7,8,`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `4180-23-8`, `trans-Anethole [(E)-Anethole]`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `6485-40-1`, `l-Carvone`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `89-80-5`, `tr-Menthone`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `5392-40-5`, `Citral`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `97-53-0`, `Eugenol`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `5989-54-8`, `(S)-p-mentha-1,8-diène (l-Limonene)`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `126-91-0`, `(R)-3,7-dimethyl-1,6-octadien-3-ol`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `470-82-6`, `Eucalyptol`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `106-22-9`, `dl-Citronellol`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `67674-46-8`, `6,6-Dimethoxy-2,5,5-trimethylhex-2-ene`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `16510-27-3`, `1-CYCLOPROPYLMETHYL-4-METHOXYBENZENE`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `491-07-6`, `d,l-Isomenthone`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `112-31-2`, `Decanal`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `20407-84-5`, `2-trans-Dodecenal`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `68039-49-6`, `Reaction mass of (1R,2R)-2,4-`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `124-13-0`, `Octanal`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `10458-14-7`, `Menthone`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `124-19-6`, `Nonanal (Aldehyde C9)`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `123-35-3`, `Myrcene`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `127-91-3`, `beta-Pinene`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `80-56-8`, `alpha-Pinene`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `105-87-3`, `Geranyl acetate`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `13877-91-3`, `tr-Ocimene (E-3,7-Dimethyl-1,3,6-octatriene)`, 0.1, 1.0]);
            console.log('    + BASILICUM : 27 composants');
        }
    }

    // --- FELICITAS (17 composants) ---
    {
        const ex = await db.get(`SELECT id FROM fragrances WHERE UPPER(name) = 'FELICITAS'`);
        if (!ex) {
            const fr = await db.run(`INSERT INTO fragrances (supplier_id, reference, name, flash_point) VALUES (?, ?, ?, ?)`, [robertetId, `G 116 26065`, `FELICITAS`, 77.0]);
            const fid = fr.lastInsertRowid;
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `78-70-6`, `Linalool`, 20.0, 30.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `115-95-7`, `Linalyl acetate`, 20.0, 30.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `5989-27-5`, `d-Limonene ((R)-p-mentha-1,8-diène)`, 5.0, 10.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `1222-05-5`, `GALAXOLIDE (1,3,4,6,7,8-Hexahydro-4,6,6,7,8,`, 5.0, 10.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `107-75-5`, `Hydroxycitronellal`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `63500-71-0`, `Florol (Tetrahydro-2-isobutyl-4-methyl-`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `106-25-2`, `Nerol`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `106185-75-5`, `2-éthyl-4-(2,2,3-triméthyl-3-cyclopentène-1-`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `106-24-1`, `Geraniol`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `123-35-3`, `Myrcene`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `105-87-3`, `Geranyl acetate`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `7212-44-4`, `Nerolidol (isomer unspecified)`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `5392-40-5`, `Citral`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `112-31-2`, `Decanal`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `127-91-3`, `beta-Pinene`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `13877-91-3`, `tr-Ocimene (E-3,7-Dimethyl-1,3,6-octatriene)`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `141-12-8`, `Neryl acetate`, 0.1, 1.0]);
            console.log('    + FELICITAS : 17 composants');
        }
    }

    // --- MEMORIA (15 composants) ---
    {
        const ex = await db.get(`SELECT id FROM fragrances WHERE UPPER(name) = 'MEMORIA'`);
        if (!ex) {
            const fr = await db.run(`INSERT INTO fragrances (supplier_id, reference, name, flash_point) VALUES (?, ?, ?, ?)`, [robertetId, `G 116 26315`, `MEMORIA`, 95.0]);
            const fid = fr.lastInsertRowid;
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `78-70-6`, `Linalool`, 20.0, 30.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `66068-84-6`, `Isocamphenyl cyclohexanol (mixed isomers)`, 10.0, 20.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `115-95-7`, `Linalyl acetate`, 10.0, 20.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `4940-11-8`, `Ethyl maltol`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `106-22-9`, `dl-Citronellol`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `127-51-5`, `alpha-iso-Methylionone`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `106-24-1`, `Geraniol`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `121-33-5`, `Vanillin`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `121-32-4`, `Ethyl vanillin`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `106185-75-5`, `2-éthyl-4-(2,2,3-triméthyl-3-cyclopentène-1-`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `65113-99-7`, `Reaction products of (2,2,3-`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `1335-46-2`, `Methyl ionone (mixture of isomers)`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `104-55-2`, `Cinnamaldehyde`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `87-44-5`, `beta-Caryophyllene`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `431-03-8`, `Diacetyl (2,3-Butanedione)`, 0.01, 0.1]);
            console.log('    + MEMORIA : 15 composants');
        }
    }

    // --- VASCONIA (14 composants) ---
    {
        const ex = await db.get(`SELECT id FROM fragrances WHERE UPPER(name) = 'VASCONIA'`);
        if (!ex) {
            const fr = await db.run(`INSERT INTO fragrances (supplier_id, reference, name, flash_point) VALUES (?, ?, ?, ?)`, [robertetId, `G 116 30628`, `VASCONIA`, 9.0]);
            const fid = fr.lastInsertRowid;
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `32210-23-4`, `VERTENEX (4-tert-Butylcyclohexyl acetate)`, 10.0, 20.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `66068-84-6`, `Isocamphenyl cyclohexanol (mixed isomers)`, 10.0, 20.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `78-70-6`, `Linalool`, 5.0, 10.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `63500-71-0`, `Florol (Tetrahydro-2-isobutyl-4-methyl-`, 5.0, 10.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `80-54-6`, `LILIAL (p-tert-Butyl-alpha-`, 5.0, 10.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `1222-05-5`, `GALAXOLIDE (1,3,4,6,7,8-Hexahydro-4,6,6,7,8,`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `18871-14-2`, `4-Acetoxy-3-pentyltetrahydropyran`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `103-95-7`, `CYCLAMEN ALDEHYDE (2-Methyl-3-(p-`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `91-64-5`, `Coumarin`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `106185-75-5`, `2-éthyl-4-(2,2,3-triméthyl-3-cyclopentène-1-`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `5392-40-5`, `Citral`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `23696-85-7`, `DAMASCENONE (1-(2,6,6-Trimethylcyclohexa-1,`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `68259-31-4`, `5(or 6)-Methyl-7(or 8)-(1-methylethyl)`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `68039-49-6`, `Reaction mass of (1R,2R)-2,4-`, 0.1, 1.0]);
            console.log('    + VASCONIA : 14 composants');
        }
    }

    // --- VERBENA ROSA (41 composants) ---
    {
        const ex = await db.get(`SELECT id FROM fragrances WHERE UPPER(name) = 'VERBENA ROSA'`);
        if (!ex) {
            const fr = await db.run(`INSERT INTO fragrances (supplier_id, reference, name, flash_point) VALUES (?, ?, ?, ?)`, [robertetId, `G 116 26062`, `VERBENA ROSA`, 65.0]);
            const fid = fr.lastInsertRowid;
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `470-82-6`, `Eucalyptol`, 20.0, 30.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `78-70-6`, `Linalool`, 10.0, 20.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `115-95-7`, `Linalyl acetate`, 10.0, 20.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `80-56-8`, `alpha-Pinene`, 5.0, 10.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `5989-27-5`, `d-Limonene ((R)-p-mentha-1,8-diène)`, 5.0, 10.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `1222-05-5`, `GALAXOLIDE (1,3,4,6,7,8-Hexahydro-4,6,6,7,8,`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `21368-68-3`, `dl-Camphor`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `106-22-9`, `dl-Citronellol`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `65405-77-8`, `cis-3-Hexenyl salicylate`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `98-52-2`, `4-tert-Butylcyclohexanol`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `79-92-5`, `Camphene`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `99-87-6`, `p-Cymene`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `5392-40-5`, `Citral`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `97-53-0`, `Eugenol`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `127-91-3`, `beta-Pinene`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `123-35-3`, `Myrcene`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `99-85-4`, `gamma-Terpinene`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `87-44-5`, `beta-Caryophyllene`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `2050-08-0`, `Amyl salicylate`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `106-24-1`, `Geraniol`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `142-92-7`, `Hexyl acetate`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `106-25-2`, `Nerol`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `99-86-5`, `alpha-Terpinene`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `87-20-7`, `Isoamyl salicylate`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `105-87-3`, `Geranyl acetate`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `3338-55-4`, `cis-Ocimene (Z-3,7-Dimethyl-1,3,6-`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `112-45-8`, `10-Undecenal`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `112-31-2`, `Decanal`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `110-41-8`, `2-Methylundecanal`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `13877-91-3`, `tr-Ocimene (E-3,7-Dimethyl-1,3,6-octatriene)`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `141-12-8`, `Neryl acetate`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `13466-78-9`, `delta-3-Carene`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `105-85-1`, `Citronellyl formate`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `586-62-9`, `Terpinolene`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `2442-10-6`, `1-Octen-3-yl acetate (Amyl vinyl carbinyl`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `16409-43-1`, `ROSE OXIDE (Tetrahydro-4-methyl-2-(2-`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `491-07-6`, `d,l-Isomenthone`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `3391-86-4`, `1-Octen-3-ol (Amyl vinyl carbinol)`, 0.01, 0.1]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `5655-61-8`, `l-Bornyl acetate`, 0.01, 0.1]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `80-56-8`, `alpha-Pinene`, 5.0, 10.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `127-91-3`, `beta-Pinene`, 1.0, 5.0]);
            console.log('    + VERBENA ROSA : 41 composants');
        }
    }

    // --- AMETHYSTE BIGARADE VERTE (24 composants) ---
    {
        const ex = await db.get(`SELECT id FROM fragrances WHERE UPPER(name) = 'AMETHYSTE BIGARADE VERTE'`);
        if (!ex) {
            const fr = await db.run(`INSERT INTO fragrances (supplier_id, reference, name, flash_point) VALUES (?, ?, ?, ?)`, [robertetId, `R 210855/2`, `AMETHYSTE BIGARADE VERTE`, null]);
            const fid = fr.lastInsertRowid;
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `115-95-7`, `Linalyl acetate`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `78-70-6`, `Linalool`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `5392-40-5`, `Citral`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `80-56-8`, `alpha-Pinene`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `5182-36-5`, `Neral`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `77-54-3`, `Cedrenol`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `586-62-9`, `Terpinolene`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `127-91-3`, `beta-Pinene`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `106-02-5`, `Pentadecanolide`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `99-85-4`, `gamma-Terpinene`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `123-35-3`, `Myrcene`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `10408-16-9`, `Longifolene`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `127-51-5`, `alpha-iso-Methylionone`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `99-49-0`, `Carvone`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `67634-00-8`, `Methyl octynol carbonate`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `141-12-8`, `Neryl acetate`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `20407-84-5`, `2-trans-Dodecenal`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `105-87-3`, `Geranyl acetate`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `112-54-9`, `Dodecanal`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `87-44-5`, `beta-Caryophyllene`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `106-25-2`, `Nerol`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `65405-77-8`, `cis-3-Hexenyl salicylate`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `99-86-5`, `alpha-Terpinene`, null, null]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `13466-78-9`, `delta-3-Carene`, null, null]);
            console.log('    + AMETHYSTE BIGARADE VERTE : 24 composants');
        }
    }

    // --- COUR DES EPICES (10 composants) ---
    {
        const ex = await db.get(`SELECT id FROM fragrances WHERE UPPER(name) = 'COUR DES EPICES'`);
        if (!ex) {
            const fr = await db.run(`INSERT INTO fragrances (supplier_id, reference, name, flash_point) VALUES (?, ?, ?, ?)`, [charabotId, `8572751`, `COUR DES EPICES`, 100.0]);
            const fid = fr.lastInsertRowid;
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `3407-42-9`, `Indisan (Sandela)`, 10.0, 20.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `67801-20-1`, `3-Methyl-5-(2,2,3-trimethyl-3-cyclopenten-1-yl)pent-4-en-2-ol`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `125-12-2`, `Isobornyl acetate`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `58567-11-6`, `Boisambrene Forte`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `546-80-5`, `Thujone`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `99-87-6`, `p-Cymene`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `4940-11-8`, `Ethyl maltol`, 1.0, 5.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `470-82-6`, `Eucalyptol`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `80-26-2`, `alpha-Terpineol acetate`, 0.1, 1.0]);
            await db.run(`INSERT INTO fragrance_components (fragrance_id, cas_number, name, percentage_min, percentage_max) VALUES (?, ?, ?, ?, ?)`, [fid, `80-56-8`, `alpha-Pinene`, 0.1, 1.0]);
            console.log('    + COUR DES EPICES : 10 composants');
        }
    }

    console.log('  ✓ Session 23 : 10 parfums FDS importés');
}

module.exports = { seedSession23 };