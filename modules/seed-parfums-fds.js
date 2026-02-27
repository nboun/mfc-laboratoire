// SESSION 22 — FICHES DE DONNÉES DE SÉCURITÉ PARFUMS + MOLÉCULES
// Analyse moléculaire pour corrélation formulation bougies
// Sources : FDS REACH officielles fournisseurs + PubChem/ChemicalBook
// Workflow : FDS PDF → extraction Section 3 → enrichissement propriétés moléculaires

async function seedSession22(db) {
    const check = await db.get("SELECT COUNT(*) as c FROM knowledge_base WHERE tags LIKE '%session22%'");
    if (check.c > 0) { console.log('  ✓ Session 22 : fiches FDS parfums déjà présentes'); return; }

    const entries = [

        // ═══════════════════════════════════════════════════════════════
        // PARTIE 1 : FICHES MOLÉCULES INDIVIDUELLES
        // Chaque molécule = une fiche avec propriétés physico-chimiques
        // ═══════════════════════════════════════════════════════════════

        ['Science — Molécules', 'molécule parfum', 'Molécule — Linalol (CAS 78-70-6)',
         "LINALOL (Linalool) — FICHE MOLÉCULE PARFUMERIE\n" +
         "CAS : 78-70-6 | EINECS : 201-134-4 | Formule : C₁₀H₁₈O | PM : 154,25\n\n" +
         "FAMILLE CHIMIQUE : Terpène — alcool monoterpénique (acyclique, insaturé)\n" +
         "NOM INCI : Linalool\n" +
         "ODEUR : Florale fraîche, muguet, boisé léger, note de tête\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "Point éclair : 76–78°C (TCC) ⚠️ BAS\n" +
         "Point d'ébullition : 198–199°C\n" +
         "Densité (25°C) : 0,858–0,870 g/cm³\n" +
         "Viscosité (25°C) : 4,4 mPa·s\n" +
         "Pression vapeur (25°C) : 0,159 mmHg — VOLATILE\n" +
         "Solubilité eau : <1% (insoluble)\n\n" +
         "CLASSIFICATION CLP : H315 (irrit. peau), H317 (sensibilisant), H319 (irrit. yeux)\n" +
         "Allergène IFRA : Oui — déclaration obligatoire EU\n\n" +
         "IMPACT FORMULATION BOUGIE :\n" +
         "→ Flash bas (76°C) : abaisse le flash global du parfum, limite le % max\n" +
         "→ Très volatil : excellent diffusion à chaud, s'évapore vite = note de tête fugace\n" +
         "→ Densité basse (0,86) : se mélange facilement à la cire, pas de sédimentation\n" +
         "→ Viscosité basse : bonne capillarité dans la mèche\n" +
         "→ À forte concentration (>10%) : peut nécessiter de descendre la taille de mèche\n\n" +
         "PRÉSENCE TYPIQUE : 2–15% dans les parfums floraux, lavande, muguet, agrumes\n" +
         "OCCURRENCE NATURELLE : >200 huiles essentielles (lavande, bois de rose, bergamote)",
         'PubChem CID:6549 / ChemicalBook / FDS REACH', 1,
         'session22,molécule,linalol,linalool,CAS78-70-6,terpène,alcool,flash76,volatil,hotthrow,allergène,IFRA'],

        ['Science — Molécules', 'molécule parfum', 'Molécule — Alcool phényléthylique (CAS 60-12-8)',
         "ALCOOL PHÉNYLÉTHYLIQUE (2-Phenylethanol) — FICHE MOLÉCULE PARFUMERIE\n" +
         "CAS : 60-12-8 | EINECS : 200-456-2 | Formule : C₈H₁₀O | PM : 122,17\n\n" +
         "FAMILLE CHIMIQUE : Alcool aromatique primaire\n" +
         "NOM INCI : Phenethyl Alcohol\n" +
         "ODEUR : Rose, florale douce, miel, levure — note de cœur\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "Point éclair : 96°C ✅ MOYEN-HAUT\n" +
         "Point d'ébullition : 218–220°C\n" +
         "Densité (25°C) : 1,02 g/cm³ ⚠️ > 1 (plus dense que la cire)\n" +
         "Viscosité : moyenne\n" +
         "Pression vapeur : faible — PEU VOLATIL\n" +
         "Solubilité eau : légèrement soluble (2 mL/100 mL)\n\n" +
         "CLASSIFICATION CLP : H302 (nocif ingestion), H319 (irrit. yeux)\n" +
         "Allergène IFRA : Non\n\n" +
         "IMPACT FORMULATION BOUGIE :\n" +
         "→ Flash moyen (96°C) : impact modéré sur le flash global\n" +
         "→ Densité >1 : attention, peut sédimenter dans les cires légères\n" +
         "→ Peu volatil : diffusion à chaud modéré, bonne tenue dans le temps\n" +
         "→ À forte concentration (>8%) : risque de sédimentation, agiter avant coulée\n" +
         "→ Stabilise les accords floraux dans la durée de combustion\n\n" +
         "PRÉSENCE TYPIQUE : 2–10% dans les parfums rosés, floraux\n" +
         "OCCURRENCE NATURELLE : rose, néroli, géranium, ylang-ylang",
         'PubChem CID:6054 / Carl Roth / FDS REACH', 1,
         'session22,molécule,phényléthanol,phenylethanol,CAS60-12-8,alcool,aromatique,flash96,rose,densitéHaute'],

        ['Science — Molécules', 'molécule parfum', 'Molécule — Iso E Super (CAS 54464-57-2)',
         "ISO E SUPER (OTNE) — FICHE MOLÉCULE PARFUMERIE\n" +
         "CAS : 54464-57-2 | EINECS : 259-174-3 | Formule : C₁₆H₂₆O | PM : 234,38\n\n" +
         "FAMILLE CHIMIQUE : Cétone — sesquiterpénoïde synthétique\n" +
         "NOMS COMMERCIAUX : Iso E Super® (IFF), Boisvelone, Amberonne, Orbitone\n" +
         "ODEUR : Boisé sec, ambre gris, cèdre, musqué — note de fond\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "Point éclair : 111–134°C ✅ HAUT\n" +
         "Point d'ébullition : 290–312°C\n" +
         "Densité (25°C) : 0,96–0,97 g/cm³\n" +
         "Viscosité : moyenne-haute\n" +
         "Pression vapeur (25°C) : très faible — TRÈS PEU VOLATIL\n" +
         "Solubilité eau : insoluble\n\n" +
         "CLASSIFICATION CLP : H315 (irrit. peau), H317 (sensibilisant), H410 (aquatique)\n" +
         "Allergène IFRA : Oui — déclaration obligatoire EU\n\n" +
         "IMPACT FORMULATION BOUGIE :\n" +
         "→ Flash très haut (111°C+) : remonte le flash global, sécurise la formulation\n" +
         "→ Très peu volatil : diffusion à froid fort, diffusion à chaud progressif et durable\n" +
         "→ Densité proche cire : excellent mélange, pas de sédimentation\n" +
         "→ Molécule « fixateur » : prolonge la restitution olfactive\n" +
         "→ Compatible toutes cires, pas d'impact mèche significatif\n\n" +
         "PRÉSENCE TYPIQUE : 2–15% dans les parfums boisés, ambrés, masculins\n" +
         "⚠️ Souvent vendu dilué 50% dans DPG ou IPM — VÉRIFIER LE SOLVANT",
         'PubChem CID:108242 / WorldOfAromas / Biosynth / FDS REACH', 1,
         'session22,molécule,isoEsuper,OTNE,CAS54464-57-2,cétone,boisé,ambre,flash111,fixateur,fondamental'],

        ['Science — Molécules', 'molécule parfum', 'Molécule — Cashmeran / DPMI (CAS 33704-61-9)',
         "CASHMERAN® (DPMI) — FICHE MOLÉCULE PARFUMERIE\n" +
         "CAS : 33704-61-9 | EINECS : 251-649-3 | Formule : C₁₄H₂₂O | PM : 206,32\n\n" +
         "FAMILLE CHIMIQUE : Cétone — indanone polycyclique (musc synthétique)\n" +
         "NOMS COMMERCIAUX : Cashmeran® (IFF), Yinghaitone\n" +
         "ODEUR : Musqué boisé chaud, cachemire, ambré, épicé — note de fond\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "Point éclair : 127°C ✅ HAUT\n" +
         "Point d'ébullition : 256–286°C\n" +
         "Densité (20°C) : 0,954–0,966 g/cm³\n" +
         "Viscosité : moyenne\n" +
         "Pression vapeur (25°C) : 0,0027 mmHg — TRÈS PEU VOLATIL\n" +
         "Point de fusion : 27°C (solide→liquide à T° ambiante)\n\n" +
         "CLASSIFICATION CLP : H315 (irrit. peau), H317 (sensibilisant), H319 (irrit. yeux), H411 (aquatique)\n" +
         "Allergène IFRA : Oui — déclaration obligatoire EU\n\n" +
         "IMPACT FORMULATION BOUGIE :\n" +
         "→ Flash haut (127°C) : sécurise la formulation\n" +
         "→ Très peu volatil : excellent fixateur, tenue exceptionnelle\n" +
         "→ Densité ~0,96 : parfait mélange avec les cires\n" +
         "→ Pont de fusion 27°C : solide à T° ambiante, fond dans le melt pool\n" +
         "→ Diffusion forte malgré faible volatilité — « irradie » l'espace\n\n" +
         "PRÉSENCE TYPIQUE : 2–10% dans les parfums musqués, boisés, ambrés",
         'PubChem / ChemicalBull / Scentspiracy / FDS REACH', 1,
         'session22,molécule,cashmeran,DPMI,CAS33704-61-9,cétone,indanone,musc,flash127,fixateur'],

        ['Science — Molécules', 'molécule parfum', 'Molécule — Galaxolide / HHCB (CAS 1222-05-5)',
         "GALAXOLIDE® (HHCB) — FICHE MOLÉCULE PARFUMERIE\n" +
         "CAS : 1222-05-5 | EINECS : 214-946-9 | Formule : C₁₈H₂₆O | PM : 258,40\n\n" +
         "FAMILLE CHIMIQUE : Musc polycyclique (PCM) — benzopyrane\n" +
         "NOMS COMMERCIAUX : Galaxolide® (IFF), Abbalide, Pearlide, Musk 50\n" +
         "ODEUR : Musqué propre, doux, floral, boisé — note de fond\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "Point éclair : 146°C (>230°F) ✅ TRÈS HAUT\n" +
         "Point d'ébullition : 304–330°C\n" +
         "Densité (25°C) : 1,044 g/cm³ ⚠️ > 1 (dense)\n" +
         "Viscosité : haute (liquide visqueux)\n" +
         "Pression vapeur (25°C) : 0,073 Pa — EXTRÊMEMENT PEU VOLATIL\n" +
         "Point de fusion : -20°C\n\n" +
         "CLASSIFICATION CLP : H400 (aquatique aigu), H410 (aquatique chronique)\n" +
         "⚠️ Souvent vendu dilué 50% dans DPG, DEP, BB ou IPM — VÉRIFIER LE SOLVANT\n\n" +
         "IMPACT FORMULATION BOUGIE :\n" +
         "→ Flash très haut (146°C) : excellent pour remonter le flash global\n" +
         "→ Extrêmement peu volatil : diffusion à froid fort, diffusion à chaud faible seul\n" +
         "→ Densité >1 (1,044) : ⚠️ risque de sédimentation dans cires légères\n" +
         "→ Viscosité haute : ralentit la capillarité = mèche doit être plus puissante\n" +
         "→ Nécessite des molécules volatiles (linalol, limonène) pour le diffusion à chaud\n\n" +
         "PRÉSENCE TYPIQUE : 1–10% dans les parfums musqués, linge propre\n" +
         "⚠️ WGK 3 (très grave danger eau) — Stockage et élimination réglementés",
         'PubChem CID:91497 / Wikipedia / ChemicalBook / FDS REACH', 1,
         'session22,molécule,galaxolide,HHCB,CAS1222-05-5,musc,polycyclique,flash146,dense,visqueux,WGK3'],

        ['Science — Molécules', 'molécule parfum', 'Molécule — α-Isométhyl ionone (CAS 127-51-5)',
         "α-ISOMÉTHYL IONONE (Cétone Alpha) — FICHE MOLÉCULE PARFUMERIE\n" +
         "CAS : 127-51-5 | EINECS : 204-846-3 | Formule : C₁₄H₂₂O | PM : 206,32\n\n" +
         "FAMILLE CHIMIQUE : Cétone — norsesquiterpénoïde (ionone)\n" +
         "NOMS COMMERCIAUX : Cétone Alpha, Isoraldéine, Isonaline 70\n" +
         "ODEUR : Violette, iris, orris, boisé — note de cœur\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "Point éclair : 122°C ✅ HAUT\n" +
         "Point d'ébullition : 285°C\n" +
         "Densité (20°C) : 0,929–0,93 g/cm³\n" +
         "Viscosité : faible-moyenne\n" +
         "Pression vapeur (25°C) : 0,003 mmHg — PEU VOLATIL\n\n" +
         "CLASSIFICATION CLP : H315 (irrit. peau), H317 (sensibilisant), H411 (aquatique)\n" +
         "Allergène IFRA : Oui — déclaration obligatoire EU\n\n" +
         "IMPACT FORMULATION BOUGIE :\n" +
         "→ Flash haut (122°C) : sécurise la formulation\n" +
         "→ Peu volatil : bonne tenue, diffusion à chaud progressif\n" +
         "→ Densité modérée (0,93) : bon mélange avec les cires\n" +
         "→ Excellente stabilité chimique dans les cires\n" +
         "→ Note de cœur « violette » très stable à la combustion\n\n" +
         "PRÉSENCE TYPIQUE : 0,1–12% dans les parfums floraux, violette, iris, poudrés",
         'PubChem / Sigma-Aldrich / ChemicalBook / FDS REACH', 1,
         'session22,molécule,isomethylionone,cetoneAlpha,CAS127-51-5,cétone,ionone,violette,iris,flash122,allergène'],

        ['Science — Molécules', 'molécule parfum', 'Molécule — DPM (CAS 34590-94-8)',
         "DIPROPYLÈNE GLYCOL MÉTHYL ÉTHER (DPM) — FICHE MOLÉCULE SOLVANT\n" +
         "CAS : 34590-94-8 | EINECS : 252-104-2 | Formule : C₇H₁₆O₃ | PM : 148,20\n\n" +
         "FAMILLE CHIMIQUE : Éther de glycol — solvant porteur\n" +
         "NOM INCI : Dipropylene Glycol Methyl Ether\n" +
         "ODEUR : Quasi inodore, légèrement éthéré\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "Point éclair : 75°C ⚠️ MOYEN\n" +
         "Point d'ébullition : 188°C\n" +
         "Densité (25°C) : 0,951 g/cm³\n" +
         "Viscosité : 3,5 mPa·s\n" +
         "Pression vapeur (25°C) : 0,37 mmHg\n" +
         "Solubilité eau : totalement miscible ⚠️\n\n" +
         "CLASSIFICATION CLP : Aucune (non classé dangereux)\n\n" +
         "IMPACT FORMULATION BOUGIE :\n" +
         "→ SOLVANT PORTEUR fréquent dans les compositions parfumées\n" +
         "→ Flash moyen (75°C) : abaisse le flash global du parfum\n" +
         "→ Miscible eau : peut créer des problèmes de compatibilité cire\n" +
         "→ Note MFC : ni DPG ni DPM ne sont des solvants idéaux pour bougies\n" +
         "→ Préférer IPM ou esters comme solvant porteur\n\n" +
         "⚠️ Ne pas confondre avec DPG (Dipropylene Glycol, CAS 25265-71-8)\n" +
         "DPM est un éther de glycol, DPG est un diol — profils différents",
         'PubChem / ECHA / FDS REACH', 2,
         'session22,molécule,DPM,solvant,CAS34590-94-8,étherGlycol,porteur,flash75'],

        ['Science — Molécules', 'molécule parfum', 'Molécule — Floralol / Isobornyl cyclohexanol (CAS 63500-71-0)',
         "FLORALOL (2-Isobutyl-4-méthyltétrahydro-2H-pyran-4-ol) — FICHE MOLÉCULE\n" +
         "CAS : 63500-71-0 | EINECS : 405-040-6 | Formule : C₁₀H₂₀O₂ | PM : 172,27\n\n" +
         "FAMILLE CHIMIQUE : Alcool — tétrahydropyranyl\n" +
         "NOM COMMERCIAL : Floralol\n" +
         "ODEUR : Muguet frais, floral vert, propre — note de cœur\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "Point éclair : ~93°C ✅ MOYEN-HAUT\n" +
         "Point d'ébullition : ~235°C\n" +
         "Densité : ~0,92 g/cm³\n" +
         "Pression vapeur : faible\n\n" +
         "CLASSIFICATION CLP : H319 (irrit. yeux)\n\n" +
         "IMPACT FORMULATION BOUGIE :\n" +
         "→ Flash moyen (93°C) : impact modéré\n" +
         "→ Volatilité moyenne : bon équilibre diffusion à chaud / tenue\n" +
         "→ Densité <1 : bon mélange avec les cires\n" +
         "→ Note muguet stable pendant la combustion",
         'ECHA / FDS REACH', 2,
         'session22,molécule,floralol,CAS63500-71-0,alcool,muguet,flash93'],

        ['Science — Molécules', 'molécule parfum', 'Molécule — Verdox / Dimethyloctahydroindénodioxine (CAS 27606-09-3)',
         "VERDOX (2,4-Diméthyl-4,4a,5,9b-tétrahydroindéno[1,2-d][1,3]dioxine) — FICHE\n" +
         "CAS : 27606-09-3 | EINECS : 248-561-2 | Formule : C₁₃H₁₆O₂ | PM : 204,27\n\n" +
         "FAMILLE CHIMIQUE : Dioxine — acétal cyclique\n" +
         "ODEUR : Frais vert, ozone, melon, aquatique — note de tête\n\n" +
         "PROPRIÉTÉS PHYSIQUES :\n" +
         "Point éclair : ~100°C ✅ HAUT\n" +
         "Point d'ébullition : ~280°C\n" +
         "Densité : ~1,08 g/cm³ ⚠️ >1\n\n" +
         "CLASSIFICATION CLP : H302 (nocif ingestion), H412 (aquatique)\n\n" +
         "IMPACT FORMULATION BOUGIE :\n" +
         "→ Flash haut (100°C) : bon contributeur\n" +
         "→ Densité >1 : risque de sédimentation dans cires légères\n" +
         "→ Note fraîche qui s'atténue pendant la combustion",
         'ECHA / FDS REACH', 2,
         'session22,molécule,verdox,CAS27606-09-3,dioxine,frais,vert,aquatique,flash100'],

        // ═══════════════════════════════════════════════════════════════
        // PARTIE 2 : FICHE PARFUM COMPLÈTE
        // ═══════════════════════════════════════════════════════════════

        ['fournisseur', 'parfum', 'FDS Parfum — EGLANTINE (CPL Aromas, Réf AR729357)',
         "EGLANTINE — FICHE DE DONNÉES DE SÉCURITÉ PARFUM\n" +
         "Code : AR729357 | Fournisseur : CPL Aromas France SAS (Suresnes)\n" +
         "UFI : 9U78-73X9-7009-U56A | FDS du 06/02/2026\n\n" +
         "═══ IDENTIFICATION ═══\n" +
         "Aspect : Liquide clair | Couleur : Jaune très pâle | Odeur : Caractéristique\n" +
         "Type : Substance odoriférante concentrée, usage professionnel\n\n" +
         "═══ PROPRIÉTÉS PHYSIQUES GLOBALES (Section 9) ═══\n" +
         "Point éclair : >70°C ⚠️ RELATIVEMENT BAS\n" +
         "Densité : 0,96 g/cm³\n" +
         "Viscosité : Non déterminée\n" +
         "Point d'ébullition : Non applicable (mélange)\n" +
         "Hydrosolubilité : Non\n\n" +
         "═══ CLASSIFICATION CLP (Section 2) ═══\n" +
         "H315 — Irritation cutanée cat. 2\n" +
         "H317 — Sensibilisant cutané cat. 1\n" +
         "H319 — Irritation yeux cat. 2\n" +
         "H411 — Toxique aquatique chronique cat. 2\n" +
         "Mot signal : Attention\n\n" +
         "═══ TRANSPORT ═══\n" +
         "UN 3082 — Classe 9 — Groupe III — Polluant marin\n\n" +
         "═══ COMPOSITION MOLÉCULAIRE (Section 3) — 18 composants déclarés ═══\n\n" +
         "COMPOSANTS MAJEURS (2,5–10%) :\n" +
         "• Iso E Super (CAS 54464-57-2) — flash 111°C, densité 0,96 — H315,H317,H410\n" +
         "• Alcool phényléthylique (CAS 60-12-8) — flash 96°C, densité 1,02 — H302,H319\n" +
         "• DPM solvant (CAS 34590-94-8) — flash 75°C, densité 0,95 — Aucun\n" +
         "• Linalol (CAS 78-70-6) — flash 76°C, densité 0,86 — H315,H317,H319\n" +
         "• Floralol (CAS 63500-71-0) — flash 93°C, densité 0,92 — H319\n" +
         "• Cashmeran (CAS 33704-61-9) — flash 127°C, densité 0,96 — H315,H317,H319,H411\n" +
         "• Verdox (CAS 27606-09-3) — flash 100°C, densité 1,08 — H302,H412\n\n" +
         "COMPOSANTS MOYENS (1–2,5%) :\n" +
         "• Ext. acétate Gaïac (CAS 94333-88-7) — H315,H317,H400,H410\n" +
         "• Méthylphénylpentanol (CAS 55066-48-3) — H302\n" +
         "• α-Isométhyl ionone (CAS 127-51-5) — flash 122°C — H315,H317,H411\n" +
         "• Galaxolide HHCB (CAS 1222-05-5) — flash 146°C, densité 1,04 — H400,H410\n\n" +
         "COMPOSANTS MINEURS (<1%) :\n" +
         "• β-Ionone (CAS 127-41-3) — H411\n" +
         "• Cyclamal (CAS 103-95-7) — H315,H317,H361,H412\n" +
         "• Rose Oxide (CAS 3033-23-6) — H315,H319,H361\n" +
         "• BHT (CAS 128-37-0) — antioxydant — H400,H410\n" +
         "• Traseolide (CAS 54440-17-4) — H412\n" +
         "• α-Pinène (CAS 80-56-8) — flash 33°C ⚠️ — H226,H302,H304,H315,H317,H400,H410\n" +
         "• γ-Undécalactone (CAS 104-67-6) — H412\n" +
         "• β-Ionone (CAS 14901-07-6) — H411\n" +
         "• Hex-3-enyl acetate (CAS 3681-71-8) — H226\n" +
         "• 2-tert-Butylcyclohexyl acetate (CAS 88-41-5) — H411\n" +
         "• β-Pinène (CAS 127-91-3) — H226,H304,H315,H317,H400,H410\n\n" +
         "═══ ANALYSE MFC — PROFIL FORMULATION ═══\n\n" +
         "PROFIL VOLATILITÉ :\n" +
         "Flash global >70°C — cohérent avec la présence de DPM (75°C) et linalol (76°C)\n" +
         "~30% du parfum = molécules à flash <100°C (DPM, linalol, floralol, phényléthanol)\n" +
         "~40% du parfum = molécules à flash >100°C (Iso E Super, Cashmeran, ionones)\n" +
         "Profil MIXTE : bonnes notes de tête ET bonne tenue de fond\n\n" +
         "PROFIL DENSITÉ :\n" +
         "Densité globale 0,96 — compatible toutes cires sans risque sédimentation\n" +
         "Attention : Galaxolide (1,04) et Verdox (1,08) sont >1 mais en faible concentration\n\n" +
         "SOLVANT PORTEUR :\n" +
         "DPM (CAS 34590-94-8) détecté à 2,5–10% — éther de glycol\n" +
         "⚠️ Pas de DPG détecté — CONFORME politique MFC\n" +
         "DPM acceptable mais préférer IPM — demander reformulation si nouvelle commande\n\n" +
         "RECOMMANDATIONS MÈCHE :\n" +
         "Profil équilibré — pas d'ajustement mèche nécessaire a priori\n" +
         "Le linalol (volatil) compense les molécules lourdes (Galaxolide, Iso E Super)\n" +
         "Si melt pool insuffisant → vérifier que le linalol ne s'évapore pas avant combustion\n\n" +
         "STOCKAGE MFC :\n" +
         "Température ambiante, à l'abri de la chaleur et de la lumière\n" +
         "Contenant bien fermé — le linalol et les terpènes s'oxydent à l'air",
         'FDS CPL Aromas AR729357 du 06/02/2026 + analyse MFC Laboratoire', 1,
         'session22,parfum,FDS,CPL,Aromas,EGLANTINE,AR729357,flash70,linalol,isoEsuper,cashmeran,galaxolide,DPM,floral'],

        // ═══════════════════════════════════════════════════════════════
        // PARTIE 3 : RÈGLES DE CORRÉLATION MOLÉCULAIRE
        // ═══════════════════════════════════════════════════════════════

        ['technique', 'parfum', 'Corrélation — Familles moléculaires et impact formulation bougie',
         "CORRÉLATIONS MOLÉCULAIRES — IMPACT SUR FORMULATION BOUGIE\n" +
         "Base de données construite par analyse des FDS parfums — MFC Laboratoire\n\n" +
         "═══ PAR FAMILLE CHIMIQUE ═══\n\n" +
         "TERPÈNES (linalol, pinènes, limonène, géraniol) :\n" +
         "→ Flash BAS (33–78°C) | Densité BASSE (0,84–0,87) | TRÈS VOLATILS\n" +
         "→ Diffusion à chaud EXCELLENT mais fugace\n" +
         "→ À >10% cumulé : descendre la mèche d'un cran, baisser T° coulée\n" +
         "→ S'oxydent à l'air : stocker parfum fermé, utiliser rapidement\n\n" +
         "ALCOOLS AROMATIQUES (phényléthanol, benzyl alcool) :\n" +
         "→ Flash MOYEN (96–100°C) | Densité HAUTE (1,02–1,05) | PEU VOLATILS\n" +
         "→ Diffusion à chaud modéré, bonne tenue\n" +
         "→ À >8% cumulé : risque sédimentation dans cires soja/colza légères\n" +
         "→ Agiter le mélange cire+parfum juste avant coulée\n\n" +
         "MUSCS SYNTHÉTIQUES (Galaxolide, Cashmeran, Ambrettolide) :\n" +
         "→ Flash TRÈS HAUT (127–200°C) | Densité VARIABLE | TRÈS PEU VOLATILS\n" +
         "→ Diffusion à froid bon, diffusion à chaud faible seul — besoin de volatils en complément\n" +
         "→ Galaxolide : densité 1,04, viscosité haute → peut épaissir le mélange\n" +
         "→ À >8% de muscs lourds : augmenter la taille de mèche d'un cran\n" +
         "→ ⚠️ Souvent dilués dans DPG/DEP/IPM — vérifier solvant porteur\n\n" +
         "CÉTONES BOISÉES (Iso E Super, ionones, Traseolide) :\n" +
         "→ Flash HAUT (100–134°C) | Densité MOYENNE (0,93–0,97) | PEU VOLATILS\n" +
         "→ Excellent diffusion à froid, restitution progressive\n" +
         "→ Très stables chimiquement dans les cires\n" +
         "→ Pas d'impact mèche significatif, compatible toutes cires\n\n" +
         "ALDÉHYDES (citral, citronellal, hydroxycitronnellal) :\n" +
         "→ Flash BAS–MOYEN (55–95°C) | Densité BASSE | VOLATILS\n" +
         "→ Diffusion à chaud puissant, note de tête caractéristique\n" +
         "→ Réactifs chimiquement : peuvent jaunir les cires blanches\n" +
         "→ Oxydation possible → stocker à l'abri de l'air et de la lumière\n\n" +
         "ESTERS (acétate d'hexényle, acétate de linalyle) :\n" +
         "→ Flash BAS (50–80°C) | Densité BASSE | TRÈS VOLATILS\n" +
         "→ Diffusion à chaud fruité/frais, note de tête\n" +
         "→ Profil similaire aux terpènes pour l'impact formulation\n\n" +
         "SOLVANTS PORTEURS :\n" +
         "→ DPG (CAS 25265-71-8) : flash 124°C — ⛔ EXCLU MFC\n" +
         "→ DPM (CAS 34590-94-8) : flash 75°C — ⚠️ toléré mais préférer IPM\n" +
         "→ IPM (CAS 110-27-0) : flash 116°C — ✅ RECOMMANDÉ MFC\n" +
         "→ DEP (CAS 84-66-2) : flash 117°C — ⚠️ phtalate, à éviter\n" +
         "→ BB (CAS 120-51-4) : flash 148°C — ✅ acceptable",
         'Analyse MFC Laboratoire — corrélations moléculaires Février 2026', 1,
         'session22,corrélation,molécule,famille,terpène,musc,cétone,aldéhyde,ester,solvant,flash,densité,mèche,hotthrow'],

        ['technique', 'parfum', 'Règles — Seuils moléculaires et décisions formulation',
         "RÈGLES DE DÉCISION — SEUILS MOLÉCULAIRES → AJUSTEMENT FORMULATION\n" +
         "MFC Laboratoire — en construction (s'affine avec chaque nouvelle FDS)\n\n" +
         "═══ RÈGLES FLASH POINT ═══\n\n" +
         "RÈGLE F1 : Si >30% du parfum = molécules à flash <80°C\n" +
         "→ Limiter le % parfum total à 6–7% max dans la formulation\n" +
         "→ Baisser la température de coulée de 5°C\n\n" +
         "RÈGLE F2 : Si flash global parfum <65°C\n" +
         "→ ⛔ Attention réglementaire — vérifier conformité CLP/transport\n" +
         "→ Limiter à 5% max dans la formulation\n\n" +
         "RÈGLE F3 : Si >50% du parfum = molécules à flash >110°C\n" +
         "→ Formulation sécurisée, % parfum peut monter à 8–10%\n\n" +
         "═══ RÈGLES DENSITÉ ═══\n\n" +
         "RÈGLE D1 : Si composants à densité >1,0 dépassent 15% du parfum\n" +
         "→ Risque sédimentation — agiter avant coulée\n" +
         "→ Préférer cires plus denses (paraffine 56°C+) plutôt que soja pur\n\n" +
         "RÈGLE D2 : Si Galaxolide ou similaire >5% du parfum\n" +
         "→ Augmenter la mèche d'un cran (viscosité haute = capillarité réduite)\n\n" +
         "═══ RÈGLES VOLATILITÉ ═══\n\n" +
         "RÈGLE V1 : Si >40% terpènes + esters (flash <80°C, pression vapeur haute)\n" +
         "→ Diffusion à chaud puissant mais fugace\n" +
         "→ Problème de « fatigue olfactive » en 30 min de combustion\n" +
         "→ Ajouter fixateur (Iso E Super, Cashmeran) OU augmenter % parfum\n\n" +
         "RÈGLE V2 : Si >60% muscs + cétones lourdes (flash >120°C)\n" +
         "→ Diffusion à froid bon, diffusion à chaud faible\n" +
         "→ Augmenter la mèche d'un cran OU augmenter la température de coulée\n\n" +
         "═══ RÈGLES SOLVANT ═══\n\n" +
         "RÈGLE S1 : DPG détecté dans Section 3\n" +
         "→ ⛔ REJET — demander reformulation base IPM au fournisseur\n\n" +
         "RÈGLE S2 : DEP (phtalate) détecté\n" +
         "→ ⚠️ Demander alternative — IPM ou BB préférés\n\n" +
         "RÈGLE S3 : Solvant >20% du parfum total\n" +
         "→ Concentration effective en molécules odorantes réduite\n" +
         "→ Augmenter le % parfum pour compenser\n\n" +
         "═══ RÈGLE MÈCHE COMPOSITE ═══\n\n" +
         "RÈGLE M1 : Score mèche = Σ(% volatils × -1) + Σ(% muscs lourds × +1)\n" +
         "Si score < -20 : descendre mèche d'un cran\n" +
         "Si score > +20 : monter mèche d'un cran\n" +
         "Si score entre -20 et +20 : mèche standard\n\n" +
         "⚠️ Ces règles sont INDICATIVES et s'affineront avec l'analyse de nouvelles FDS.\n" +
         "Chaque nouveau parfum analysé enrichit la base de corrélation.",
         'Analyse MFC Laboratoire — règles empiriques Février 2026', 1,
         'session22,règle,seuil,flash,densité,volatilité,mèche,solvant,DPG,IPM,formulation,décision']
    ];

    for (const [cat, sub, title, content, source, prio, tags] of entries) {
        await db.run('INSERT OR IGNORE INTO knowledge_base (category,subcategory,title,content,source,priority,tags) VALUES (?,?,?,?,?,?,?)',
            [cat, sub, title, content, source, prio, tags]);
    }
    console.log('  ✓ Session 22 : ' + entries.length + ' fiches (FDS parfums — molécules + corrélations + 1 parfum analysé)');
}

module.exports.seedSession22 = seedSession22;
